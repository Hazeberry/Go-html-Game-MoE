// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Sagen die Augen-Merkmale der Engine GNU Gos Urteil über eine Gruppe
   voraus? Gehört zu docs/augen-urteil.md.

   Spielt jede Partie eines Rohdumps von gnugo-duell.js nach und hält an
   den Marken (--marken, Standard 100,120,…,220) für jede Gruppe mit
   mindestens --min-steine Steinen fest. Gruppe heißt hier wie in
   kritisch.js ein Drache von GNU Go (dragon_stones): Ketten, die GNU Go
   als verbunden ansieht. Die Merkmale rechnet die Engine auf ihrem eigenen
   Brett:

     gnugo      GNU Gos Status der Gruppe (dragon_status: alive, critical,
                dead, unknown)
     steine, ketten
     minFrei    Freiheiten der schwächsten Kette
     freiheiten Freiheiten aller Ketten zusammen
     krise      die Krisenkarte der Engine markiert eine Kette
                (buildCrisisMap: 1 Freiheit; 2 ab crisisLargeSize Steinen;
                3 ab crisisDragonSize Steinen)
     leser      der taktische Leser fängt eine Kette mit dem Gegner am Zug
                (leseAngriff, Ketten ab zwei Steinen bis drei Freiheiten)
     augen      echte Augen aller Ketten (findEyes, wie die Anzeige)
     raeume     Augenräume: leere Gebiete aus höchstens --max-raum Punkten,
                an die kein gegnerischer Stein grenzt und an die eine Kette
                grenzt; raumPunkte ist ihre Größe zusammen
     benson     jede Kette ist bedingungslos lebendig (Benson)
     genus      GNU Gos Augenwert der Gruppe (dragon_data, vier Ziffern:
                Augen, wenn der Angreifer zweimal zuerst zieht, wenn er
                zuerst zieht, wenn der Verteidiger zuerst zieht, wenn der
                zweimal zuerst zieht); flucht ist escape_route
     spaeter    Status an der nächsten Marke, je Stein gezählt
                (spaeterSteine: alive, critical, dead oder weg, wenn der
                Stein nicht mehr steht); spaeter ist der Status der meisten
                Steine, spaeterTeile die Zahl der Drachen, auf die sich die
                stehenden Steine verteilen; fehlt an der letzten Marke

   Ausgewertet für die Gruppen der KI und, zum Vergleich, für die von GNU
   Go.

   Aufruf:
     node auswertung/augen-urteil.js <dump.jsonl> [...] [--marken 100,120,…]
          [--min-steine 3] [--max-raum 15] [--aus urteil.jsonl] [--gnugo pfad]
     node auswertung/augen-urteil.js --bericht urteil.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {gtp} = require('./endspiel-verlauf.js');

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const zuGtp = i => L[i % 19] + (19 - Math.floor(i / 19));

/* Augenräume für Farbe f: leere Gebiete ohne gegnerischen Nachbarn, höchstens
   maxRaum Punkte. Liefert je Punkt die Nummer des Raums (0 = keiner). */
function augenraeume(b, f, maxRaum) {
  const raum = new Int32Array(N), gesehen = new Uint8Array(N);
  let nr = 0;
  for (let i = 0; i < N; i++) {
    if (b[i] || gesehen[i]) continue;
    const q = [i]; gesehen[i] = 1; let fremd = false;
    for (let k = 0; k < q.length; k++) for (const n of E.NEIGHBORS[q[k]]) {
      if (!b[n]) { if (!gesehen[n]) { gesehen[n] = 1; q.push(n); } }
      else if (b[n] !== f) fremd = true;
    }
    if (!fremd && q.length <= maxRaum) { nr++; for (const p of q) raum[p] = nr; }
  }
  return raum;
}

async function analysiere(p, opt) {
  const ki = p.wirFarbe === 'S' ? 1 : 2;
  const g = gtp(opt.gnugo, 1, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    const b = new Uint8Array(N);
    if (p.vorgabeSteine && p.vorgabeSteine.length) {
      await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
      for (const s of p.vorgabeSteine) b[vonGtp(s)] = 1;
    }
    const zuerst = p.beginnt === 'S' ? 1 : 2;
    const P = E.PARAMS;
    const aus = [], vorige = [];
    for (let k = 0; k < p.zuege.length && k < Math.max(...opt.marken); k++) {
      const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
      await g.frage(`play ${f === 1 ? 'B' : 'W'} ${p.zuege[k]}`);
      if (i >= 0) { b[i] = f; E.removeDeadGroups(b, 3 - f, i); }
      if (!opt.marken.includes(mc)) continue;
      /* Alle Drachen der Stellung mit Status und Steinen. */
      const drachen = [], statusVon = new Map(), drachVon = new Map();
      for (const zeile of (await g.frage('dragon_status')).split('\n')) {
        const m = /^\s*([A-T]\d+):\s*(\w+)/i.exec(zeile);
        if (!m) continue;
        const d = {ursprung: m[1].toUpperCase(), status: m[2].toLowerCase(),
                   steine: (await g.frage('dragon_stones ' + m[1])).split(/\s+/).filter(Boolean).map(vonGtp)};
        for (const q of d.steine) { statusVon.set(q, d.status); drachVon.set(q, d.ursprung); }
        drachen.push(d);
      }
      /* Schicksal der Gruppen der letzten Marke, je Stein: Status des Drachen,
         zu dem er jetzt gehört, oder weg. spaeter ist der Status der meisten
         Steine (bei Gleichstand der schlechtere). */
      for (const v of vorige) {
        const z = {alive: 0, critical: 0, dead: 0, weg: 0}, teile = new Set();
        for (const q of v.steine) {
          if (b[q] !== v.farbe) { z.weg++; continue; }
          const st = statusVon.get(q);
          z[st in z ? st : 'critical']++;
          teile.add(drachVon.get(q));
        }
        v.r.spaeterSteine = z;
        v.r.spaeterTeile = teile.size;
        v.r.spaeter = ['weg', 'dead', 'critical', 'alive'].reduce((a, k) => z[k] > z[a] ? k : a, 'weg');
      }
      vorige.length = 0;
      const ep = E.bensonClassify(b);
      const raeume = {1: augenraeume(b, 1, opt.maxRaum), 2: augenraeume(b, 2, opt.maxRaum)};
      const raumGroesse = {1: {}, 2: {}};
      for (const c of [1, 2]) for (let q = 0; q < N; q++) if (raeume[c][q]) raumGroesse[c][raeume[c][q]] = (raumGroesse[c][raeume[c][q]] || 0) + 1;
      for (const d of drachen) {
        const steine = d.steine;
        if (steine.length < opt.minSteine) continue;
        const c = b[steine[0]];
        if (!c) continue;   /* Brett der Engine weicht ab (sollte nicht vorkommen) */
        const gesehen = new Set(), freiheiten = new Set(), augen = new Set(), r = new Set();
        let ketten = 0, minFrei = 99, krise = false, leser = false, benson = true;
        for (const s of steine) {
          if (gesehen.has(s)) continue;
          const {group, liberties} = E.floodFill(b, s);
          for (const q of group) gesehen.add(q);
          ketten++;
          minFrei = Math.min(minFrei, liberties.length);
          for (const l of liberties) { freiheiten.add(l); if (raeume[c][l]) r.add(raeume[c][l]); }
          for (const e of E.findEyes(b, group, c)) augen.add(e);
          if (E._bnAlive[s] !== ep) benson = false;
          const n = liberties.length;
          if (n === 1 || (n === 2 && group.length >= P.crisisLargeSize) || (n === 3 && group.length >= P.crisisDragonSize)) krise = true;
          if (!leser && group.length >= 2 && n <= 3 && E.leseAngriff(new Uint8Array(b), s).ja) leser = true;
        }
        const daten = {};
        for (const z of (await g.frage('dragon_data ' + d.ursprung)).split('\n')) { const t = z.trim().split(/\s+/); if (t.length >= 2) daten[t[0]] = t[1]; }
        const rec = {seed: p.seed, mc, seite: c === ki ? 'ki' : 'gegner', ursprung: d.ursprung, gnugo: d.status,
                     genus: daten.genus || null, flucht: daten.escape_route !== undefined ? +daten.escape_route : null,
                     steine: steine.length, ketten, minFrei, freiheiten: freiheiten.size, krise, leser,
                     augen: augen.size, raeume: r.size, raumPunkte: [...r].reduce((t, x) => t + raumGroesse[c][x], 0), benson};
        aus.push(rec);
        vorige.push({r: rec, steine, farbe: c});
      }
    }
    return aus;
  } finally { g.ende(); }
}

function bericht(z) {
  const partien = new Set(z.map(x => x.seed)).size;
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  const status = (name, a) => console.log(`  ${name.padEnd(34)} ${String(a.length).padStart(6)}   lebt ${pz(a, x => x.gnugo === 'alive').padStart(5)}`
    + `   kritisch ${pz(a, x => x.gnugo === 'critical').padStart(5)}   tot ${pz(a, x => x.gnugo === 'dead').padStart(5)}`);
  const ohneAuge = x => !x.benson && x.augen === 0 && x.raeume <= 1;
  const eyeKl = [['2+ echte Augen oder Benson', x => x.benson || x.augen >= 2], ['1 echtes Auge', x => !x.benson && x.augen === 1],
                 ['0 Augen, 1+ Augenraum', x => !x.benson && x.augen === 0 && x.raeume >= 1], ['0 Augen, kein Augenraum', x => !x.benson && x.augen === 0 && x.raeume === 0]];
  /* genus: zweite Ziffer Augen, wenn der Angreifer zuerst zieht; dritte, wenn der Verteidiger zuerst zieht */
  const genKl = [['genus: 2 sicher', x => +x.genus[1] >= 2], ['genus: 2, wenn sie zuerst zieht', x => +x.genus[1] < 2 && +x.genus[2] >= 2],
                 ['genus: 1', x => +x.genus[1] < 2 && +x.genus[2] === 1], ['genus: 0', x => +x.genus[1] < 2 && +x.genus[2] === 0]];
  for (const [name, seite] of [['KI', 'ki'], ['GNU Go', 'gegner']]) {
    const a = z.filter(x => x.seite === seite);
    console.log(`\n${name}: ${a.length} Gruppen (Drachen) ab ${Math.min(...a.map(x => x.steine))} Steinen an den Marken, ${partien} Partien`);
    console.log(' A. Status an der Marke');
    status('alle', a);
    for (const [t, f] of [['1', x => x.minFrei === 1], ['2', x => x.minFrei === 2], ['3', x => x.minFrei === 3],
                          ['4–5', x => x.minFrei >= 4 && x.minFrei <= 5], ['6+', x => x.minFrei >= 6]]) status(`schwächste Kette ${t} Freiheiten`, a.filter(f));
    for (const [t, f] of eyeKl) status(t, a.filter(f));
    for (const [t, f] of genKl) status(t, a.filter(x => x.genus && f(x)));
    console.log(' B. Augen der Engine (Zeilen) gegen GNU Gos genus (Spalten), Gruppen:');
    console.log('  ' + ''.padEnd(28) + ['2 sicher', '2 am Zug', '1', '0'].map(t => t.padStart(10)).join(''));
    for (const [t, f] of eyeKl) console.log('  ' + t.padEnd(28) + genKl.map(([, g]) => String(a.filter(x => x.genus && f(x) && g(x)).length).padStart(10)).join(''));
    const lebt = a.filter(x => x.gnugo === 'alive' && x.spaeterSteine);
    const tot = x => x.spaeterSteine.dead + x.spaeterSteine.weg;
    const schicksal = (t, b) => {
      const st = b.reduce((s, x) => s + x.steine, 0), tt = b.reduce((s, x) => s + tot(x), 0);
      console.log(`  ${t.padEnd(34)} Gruppen ${(b.length / partien).toFixed(1).padStart(5)}  Steine ${(st / partien).toFixed(1).padStart(6)}  davon tot oder geschlagen`
        + ` ${(tt / partien).toFixed(1).padStart(5)} (${st ? (100 * tt / st).toFixed(1) : '–'} %)  Gruppen mit ≥ 3 solchen Steinen ${(b.filter(x => tot(x) >= 3).length / partien).toFixed(2)}`);
    };
    console.log(` C. Lebt an der Marke: Schicksal der Steine an der nächsten Marke (je Partie, über alle Marken mit Nachfolger)`);
    schicksal('alle', lebt);
    for (const [t, f] of eyeKl) schicksal(t, lebt.filter(f));
    for (const [t, f] of genKl) schicksal(t, lebt.filter(x => x.genus && f(x)));
    for (const st of ['critical', 'dead']) {
      const b = a.filter(x => x.gnugo === st && x.spaeterSteine);
      console.log(`  ${((st === 'critical' ? 'kritisch' : 'tot') + ' an der Marke').padEnd(34)} Gruppen ${(b.length / partien).toFixed(1)}, Steine ${(b.reduce((s, x) => s + x.steine, 0) / partien).toFixed(1)},`
        + ` an der nächsten Marke tot oder geschlagen ${(b.reduce((s, x) => s + tot(x), 0) / partien).toFixed(1)}`);
    }
    const krit = a.filter(x => x.gnugo === 'critical');
    console.log(` D. Regeln: markierte Gruppen je Stellung · davon lebt / kritisch / tot · Anteil der ${krit.length} kritischen Gruppen, die markiert sind`);
    for (const [t, f] of [['Krisenkarte', x => x.krise], ['Leser', x => x.leser], ['Krisenkarte oder Leser', x => x.krise || x.leser],
                          ['kein Auge, höchstens 1 Raum', ohneAuge], ['… und schwächste Kette ≤ 3', x => ohneAuge(x) && x.minFrei <= 3],
                          ['höchstens 1 echtes Auge', x => !x.benson && x.augen <= 1], ['Krisenkarte, Leser oder kein Auge', x => x.krise || x.leser || ohneAuge(x)]]) {
      const m = a.filter(f);
      console.log(`  ${t.padEnd(34)} ${(m.length / partien / new Set(a.map(x => x.mc)).size).toFixed(2).padStart(6)}   ${pz(m, x => x.gnugo === 'alive').padStart(5)} / ${pz(m, x => x.gnugo === 'critical').padStart(4)} / ${pz(m, x => x.gnugo === 'dead').padStart(5)}   ${pz(krit, f).padStart(5)}`);
    }
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {marken: [100, 120, 140, 160, 180, 200, 220], minSteine: 3, maxRaum: 15, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--marken') opt.marken = a[++i].split(',').map(Number);
    else if (a[i] === '--min-steine') opt.minSteine = +a[++i];
    else if (a[i] === '--max-raum') opt.maxRaum = +a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else dateien.push(a[i]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies)); return; }
  (async () => {
    const alle = [];
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege) continue;
      const z = await analysiere(p, opt);
      alle.push(...z);
      if (opt.aus) fs.appendFileSync(opt.aus, z.map(x => JSON.stringify(x)).join('\n') + (z.length ? '\n' : ''));
    }
    if (!opt.aus) bericht(alle);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht, augenraeume};
