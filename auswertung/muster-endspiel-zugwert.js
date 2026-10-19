// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster: Wo die Tabelle anders zieht als die KI, wer hat recht?
   Gehört zu docs/muster-endspiel-spiel.md §8.

   Nimmt die Stellungen aus den Zwischenspeichern von muster-endspiel-daten.js
   (Partien der heutigen KI, KI am Zug) und fragt für jede, in der die
   Spitze der Kandidatenliste mit der Endspiel-Tabelle (Wert ohne Muster +
   Dosis × Tabelle) ein anderer Zug ist als der, den die KI gespielt hat:
   Welcher von beiden ist nach GNU Go (Stufe 10) der bessere? Gemessen wie in
   punktverlust.js: Zug spielen, GNU Gos Antwort abwarten, estimate_score aus
   Sicht der KI. Dazu GNU Gos eigener Zug als Obergrenze. Die Stellungen
   stammen aus den Partien der KI mit der alten Tabelle: Das ist ein
   Vergleich einzelner Züge auf denselben Stellungen, unabhängig davon, in
   welche Stellungen die neue Tabelle später führen würde.

   Aufruf:
     node auswertung/muster-endspiel-zugwert.js --cache zw/pruef --tabelle zw/tabelle.json
          --dumps a.jsonl[,b.jsonl...] [--ab 100] [--bis 240] [--partien 40]
          [--dosis 200] [--teil i/n] [--aus zugwert.jsonl] [--gnugo pfad]
     node auswertung/muster-endspiel-zugwert.js --bericht zugwert.jsonl[,...]
   --dumps  Rohdumps von gnugo-duell.js der Partien, aus denen der Zwischenspeicher
            stammt (für die gespielten Züge)
   --teil   i/n: nur die Partien mit Nummer ≡ i (mod n), zum Aufteilen auf Prozesse */
'use strict';
const fs = require('fs');
const path = require('path');
const ME = require('./muster-endspiel.js');
const {gtp, wert} = require('./endspiel-verlauf.js');

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const nachGtp = i => SPALTEN[i % 19] + (19 - ((i / 19) | 0));
const linieVon = i => { const x = i % 19, y = (i / 19) | 0; return Math.min(x, y, 18 - x, 18 - y) + 1; };
const normal = s => (s || '').toUpperCase();

function waehle(D, tab, sp, dosis, p) {
  /* Spitze der Liste: alte Tabelle (w0) und neue Tabelle, wie getAIMove an der Wurzel */
  let bestA = -Infinity, bestN = -Infinity, jA = -1, jN = -1;
  for (let j = 0; j < p.n; j++) {
    const o = (p.off + j) * D.K;
    let wn = 0; for (const g of sp) wn += tab[D.f[o + g]];
    const e = D.e[p.off + j], a = e + dosis * D.w0[p.off + j], n = e + dosis * wn;
    if (a > bestA) { bestA = a; jA = j; }
    if (n > bestN) { bestN = n; jN = j; }
  }
  return {alt: D.idx[p.off + jA], neu: D.idx[p.off + jN]};
}

async function lauf(opt) {
  const D = ME.lade([opt.cache]);
  const T = JSON.parse(fs.readFileSync(opt.tabelle, 'utf8')).tabelle;
  const tab = new Float64Array(D.namen.length);
  D.namen.forEach((n, i) => { tab[i] = T[n] || 0; });
  const sp = ME.gruppenSpalten('mlzduk'.split(''));
  const dumps = new Map();
  for (const d of opt.dumps) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) { const r = JSON.parse(z); dumps.set(r.nr, r); }
  /* Stellungen je Partie */
  const proSpiel = new Map();
  for (const p of D.pos) {
    if (p.c !== 1 || p.ziel < 0 || p.k < opt.ab || p.k >= opt.bis) continue;
    const nr = +p.seedNr.split('#')[1];
    if (!proSpiel.has(nr)) proSpiel.set(nr, []);
    proSpiel.get(nr).push(p);
  }
  const nummern = [...proSpiel.keys()].sort((a, b) => a - b).slice(0, opt.partien).filter((nr, i) => i % opt.teilN === opt.teilI);
  console.error(`${nummern.length} Partien in diesem Teil`);
  for (const nr of nummern) {
    const r = dumps.get(nr);
    if (!r) { console.error(`Partie ${nr}: kein Rohdump`); continue; }
    const wir = r.wirFarbe === 'S' ? 'B' : 'W', andere = f => f === 'B' ? 'W' : 'B';
    const zuerst = r.beginnt === 'S' ? 'B' : 'W';
    /* Stellungen mit anderem Zug an der Spitze */
    const ziele = new Map();
    for (const p of proSpiel.get(nr)) {
      const w = waehle(D, tab, sp, opt.dosis, p);
      const gespielt = r.zuege[p.k] ? normal(r.zuege[p.k]) : null;
      if (!gespielt || gespielt === 'PASS') continue;
      const neu = nachGtp(w.neu), best = nachGtp(D.idx[p.off + p.ziel]);
      if (neu !== gespielt) ziele.set(p.k, {k: p.k, gespielt, neu, best, alt: nachGtp(w.alt)});
    }
    if (!ziele.size) continue;
    /* Je Stellung ein frischer GNU-Go-Prozess mit allen bisherigen Zügen:
       nach vielen play/undo-Folgen lehnte GNU Go einen später legalen
       Ko-Schlag als „illegal move“ ab. */
    for (const z of [...ziele.values()].sort((x, y) => x.k - y.k)) {
      const g = gtp(opt.gnugo, 10, r.komi);
      try {
        await g.frage('boardsize 19'); await g.frage('clear_board');
        if (r.vorgabeSteine && r.vorgabeSteine.length) await g.frage('set_free_handicap ' + r.vorgabeSteine.join(' '));
        for (let k = 0; k < z.k; k++) await g.frage(`play ${k % 2 === 0 ? zuerst : andere(zuerst)} ${normal(r.zuege[k])}`);
        const mitAntwort = async (f, m) => {
          await g.frage(`play ${f} ${m}`);
          let antwort = normal(await g.frage('reg_genmove ' + andere(f)));
          if (antwort === 'RESIGN') antwort = 'PASS';
          if (antwort !== 'PASS') await g.frage(`play ${andere(f)} ${antwort}`);
          const s = wert(await g.frage('estimate_score'), f);
          if (antwort !== 'PASS') await g.frage('undo');
          await g.frage('undo');
          return s;
        };
        const vw = {};
        for (const m of [z.gespielt, z.neu, z.best]) if (!(m in vw)) vw[m] = await mitAntwort(wir, m);
        const punkt = m => SPALTEN.indexOf(m[0]) + 19 * (19 - +m.slice(1));
        const out = {nr, ...z, vGespielt: vw[z.gespielt], vNeu: vw[z.neu], vBest: vw[z.best],
                     linieGespielt: linieVon(punkt(z.gespielt)), linieNeu: linieVon(punkt(z.neu))};
        if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(out) + '\n');
      } catch (e) {
        console.error(`Partie ${nr}, Zug ${z.k}: ${e.message}`);
      } finally { g.ende(); }
    }
    console.error(`Partie ${nr}: ${ziele.size} Stellungen mit anderem Zug`);
  }
}

function bericht(dateien) {
  const R = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
  const mw = a => a.reduce((s, x) => s + x, 0) / a.length;
  const sd = a => { const m = mw(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  const zeile = (name, S) => {
    if (S.length < 2) return;
    const d = S.map(x => x.vNeu - x.vGespielt), m = mw(d), se = sd(d) / Math.sqrt(d.length);
    const dBest = S.map(x => x.vBest - x.vGespielt), dBestN = S.map(x => x.vBest - x.vNeu);
    console.log(`${name.padEnd(22)} ${String(S.length).padStart(5)} Stellungen · Tabelle − KI ${(m >= 0 ? '+' : '') + m.toFixed(2)} [${(m - 1.96 * se).toFixed(2)}; ${(m + 1.96 * se).toFixed(2)}]`
      + ` · besser ${(100 * d.filter(x => x > 0.5).length / d.length).toFixed(0)} %, schlechter ${(100 * d.filter(x => x < -0.5).length / d.length).toFixed(0)} %`
      + ` · GNU Go − KI ${mw(dBest).toFixed(2)}, GNU Go − Tabelle ${mw(dBestN).toFixed(2)}`);
  };
  console.log(`Wert = GNU Gos Schätzung (Stufe 10) nach dem Zug und seiner Antwort, aus Sicht der KI, in Punkten; ${new Set(R.map(x => x.nr)).size} Partien`);
  zeile('alle', R);
  zeile('Zug 101–160', R.filter(x => x.k <= 160)); zeile('Zug 161–200', R.filter(x => x.k > 160 && x.k <= 200)); zeile('ab Zug 201', R.filter(x => x.k > 200));
  zeile('Tabellenzug Linie 1–2', R.filter(x => x.linieNeu <= 2)); zeile('Tabellenzug Linie 3+', R.filter(x => x.linieNeu > 2));
  zeile('KI-Zug Linie 1–2', R.filter(x => x.linieGespielt <= 2)); zeile('KI-Zug Linie 3+', R.filter(x => x.linieGespielt > 2));
  zeile('Tabellenzug = GNU Go', R.filter(x => x.neu === x.best)); zeile('Tabellenzug ≠ GNU Go', R.filter(x => x.neu !== x.best));
  zeile('KI-Zug = GNU Go', R.filter(x => x.gespielt === x.best));
  const gross = R.filter(x => x.vNeu - x.vGespielt <= -15).length, grossBesser = R.filter(x => x.vNeu - x.vGespielt >= 15).length;
  console.log(`Unterschiede ab 15 Punkten: Tabellenzug schlechter ${gross}, besser ${grossBesser}`);
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {cache: null, tabelle: null, dumps: [], ab: 100, bis: 240, partien: 40, dosis: 200, teilI: 0, teilN: 1, aus: null, gnugo: '/usr/games/gnugo', bericht: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--cache') opt.cache = a[++i];
    else if (a[i] === '--tabelle') opt.tabelle = a[++i];
    else if (a[i] === '--dumps') opt.dumps = a[++i].split(',');
    else if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--bis') opt.bis = +a[++i];
    else if (a[i] === '--partien') opt.partien = +a[++i];
    else if (a[i] === '--dosis') opt.dosis = +a[++i];
    else if (a[i] === '--teil') { const [i0, n0] = a[++i].split('/').map(Number); opt.teilI = i0; opt.teilN = n0; }
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = a[++i].split(',');
  }
  if (opt.bericht) bericht(opt.bericht);
  else if (opt.cache && opt.tabelle && opt.dumps.length) lauf(opt).catch(e => { console.error(e); process.exit(1); });
  else { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }
}
module.exports = {lauf, bericht};
