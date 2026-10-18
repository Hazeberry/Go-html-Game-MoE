// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Antwortet die KI auf Annäherung? Gehört zu docs/annaeherung.md.

   Ereignis: Eine Seite spielt nah (Abstand ≤ 2, Chebyshev) an eine lebende
   Gruppe des Gegners (Drache von GNU Go ab --min-steine Steinen, Status vor
   dem Zug alive), im Fenster Zug --ab bis --bis. Hauptfall: GNU Go nähert
   sich einer Gruppe der KI. Zum Vergleich: die KI nähert sich einer Gruppe
   von GNU Go.

   Festgehalten je Ereignis (Gruppe):

     statusNach   Status nach dem Zug (dragon_status des Steins der Gruppe,
                  der dem Zug am nächsten steht): alive, critical, dead;
                  bei critical GNU Gos Rettungspunkt (rettung)
     antwort      der Zug, den die angegriffene Seite in der Partie spielte,
                  und sein Abstand zum Annäherungszug (abstandAntwort)
     referenz     GNU Gos Zug für die angegriffene Seite in dieser Stellung
                  (reg_genmove auf --stufe, Standard 10) und sein Abstand
                  zum Annäherungszug (abstandReferenz)
     rang         nur bei Gruppen der KI: Platz von referenz (und rettung)
                  in der Kandidatenliste der nachgestellten Zugwahl (wie
                  kritisch-rang.js: getAIMove, 120 Simulationen, ohne
                  Baumwiederverwendung; 0 = nicht in der Liste); gewaehlt
                  ist der Zug der nachgestellten Zugwahl
     spaeter      Steine der Gruppe, die 20 Züge später tot oder geschlagen
                  sind (je Stein: Status des Drachen, zu dem er dann gehört)

   Aufruf:
     node auswertung/annaeherung.js <dump.jsonl> [...] [--ab 100] [--bis 200]
          [--min-steine 3] [--stufe 10] [--aus annaeherung.jsonl] [--gnugo pfad]
     node auswertung/annaeherung.js --bericht annaeherung.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {gtp} = require('./endspiel-verlauf.js');

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const zuGtp = i => L[i % 19] + (19 - Math.floor(i / 19));
const abstand = (a, b) => a < 0 || b < 0 ? 99 : Math.max(Math.abs(a % 19 - b % 19), Math.abs(Math.floor(a / 19) - Math.floor(b / 19)));
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));

let letzteListe = null;
const echteSuche = globalThis.mctsPUCT;
globalThis.mctsPUCT = function (board, color, caps, rootScored, ko) {
  letzteListe = rootScored.map(s => ({idx: s.m.idx, score: s.score}));
  return echteSuche(board, color, caps, rootScored, ko);
};
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

async function analysiere(p, opt) {
  const wir = p.wirFarbe === 'S' ? 1 : 2, zuerst = p.beginnt === 'S' ? 1 : 2;
  const gtpFarbe = f => f === 1 ? 'B' : 'W';
  const g = gtp(opt.gnugo, 1, p.komi), ref = gtp(opt.gnugo, opt.stufe, p.komi);
  try {
    for (const x of [g, ref]) {
      await x.frage('boardsize 19'); await x.frage('clear_board');
      if (p.vorgabeSteine && p.vorgabeSteine.length) await x.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    }
    const b = new Uint8Array(N), caps = {1: 0, 2: 0};
    for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
    const hist = new Set([E.computeZobrist(new Uint8Array(N)), E.computeZobrist(b)]);
    let ko = null, last = null;
    const spiele = async k => {
      const f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
      for (const x of [g, ref]) await x.frage(`play ${gtpFarbe(f)} ${p.zuege[k]}`);
      if (i < 0) { ko = null; return; }
      b[i] = f;
      const cap = E.removeDeadGroups(b, 3 - f, i);
      caps[f] += cap;
      ko = null;
      if (cap === 1) { const ff = E.floodFill(b, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
      last = i;
      hist.add(E.computeZobrist(b));
    };
    /* Drachen der Farbe f mit Status und Steinen */
    const drachen = async f => {
      const aus = [];
      for (const zeile of (await g.frage('dragon_status')).split('\n')) {
        const m = /^\s*([A-T]\d+):\s*(\w+)/i.exec(zeile);
        if (!m || b[vonGtp(m[1])] !== f) continue;
        aus.push({ursprung: m[1].toUpperCase(), status: m[2].toLowerCase(),
                  steine: (await g.frage('dragon_stones ' + m[1])).split(/\s+/).filter(Boolean).map(vonGtp)});
      }
      return aus;
    };
    /* Steine (Farbe f), die tot oder geschlagen sind */
    const verloren = async (steine, f) => {
      let n = 0;
      const status = new Map();
      for (const s of steine) {
        if (b[s] !== f) { n++; continue; }
        if (!status.has(s)) {
          const st = (await g.frage('dragon_status ' + zuGtp(s))).trim().split(/\s+/)[0].toLowerCase();
          for (const q of E.floodFill(b, s).group) status.set(q, st);
        }
        if (status.get(s) === 'dead') n++;
      }
      return n;
    };
    const aus = [], offen = [];
    const ende = Math.min(p.zuege.length, opt.bis + 21);
    for (let k = 0; k < ende; k++) {
      const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
      const imFenster = mc >= opt.ab && mc <= opt.bis && i >= 0 && k + 1 < p.zuege.length;
      let nahe = [];
      if (imFenster) nahe = (await drachen(3 - f)).filter(d => d.status === 'alive' && d.steine.length >= opt.minSteine && d.steine.some(s => abstand(s, i) <= 2));
      await spiele(k);
      for (const o of offen.filter(o => o.bis === mc)) o.e.spaeter = await verloren(o.steine, o.farbe);
      if (!nahe.length) continue;
      const opfer = 3 - f, seite = opfer === wir ? 'ki' : 'gegner';
      const antwort = vonGtp(p.zuege[k + 1]);
      const referenz = vonGtp(await ref.frage('reg_genmove ' + gtpFarbe(opfer)));
      let liste = null, gewaehlt = null;
      if (seite === 'ki') {
        Object.assign(E.PARAMS, DEFAULT, {mctsFixedSims: 120, resignEnabled: 0, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0});
        Math.random = mulberry32(p.seed * 1000 + mc + 1);
        letzteListe = null;
        const r = E.getAIMove(new Uint8Array(b), opfer, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last);
        liste = letzteListe || [];
        gewaehlt = r.type === 'stone' ? r.y * 19 + r.x : -1;
      }
      const rang = x => liste ? (x < 0 ? null : liste.findIndex(s => s.idx === x) + 1) : null;
      for (const d of nahe) {
        const stehend = d.steine.filter(s => b[s] === opfer);
        let statusNach = 'weg', rettung = -1;
        if (stehend.length) {
          const s = stehend.reduce((a, q) => abstand(q, i) < abstand(a, i) ? q : a);
          const t = (await g.frage('dragon_status ' + zuGtp(s))).trim().split(/\s+/);
          statusNach = t[0].toLowerCase();
          if (statusNach === 'critical') rettung = vonGtp(t[2]);
        }
        const e = {seed: p.seed, mc, seite, steine: d.steine.length, zug: p.zuege[k], statusNach,
                   rettung: rettung >= 0 ? zuGtp(rettung) : null,
                   antwort: p.zuege[k + 1], abstandAntwort: abstand(antwort, i),
                   referenz: referenz >= 0 ? zuGtp(referenz) : 'PASS', abstandReferenz: abstand(referenz, i),
                   antwortGleichReferenz: antwort === referenz, antwortGleichRettung: rettung >= 0 && antwort === rettung,
                   rangReferenz: rang(referenz), rangRettung: rettung >= 0 ? rang(rettung) : null,
                   rangAntwort: rang(antwort), kandidaten: liste ? liste.length : null,
                   gewaehlt: gewaehlt === null ? null : gewaehlt >= 0 ? zuGtp(gewaehlt) : 'PASS',
                   gewaehltGleichReferenz: gewaehlt === null ? null : gewaehlt === referenz,
                   abstandGewaehlt: gewaehlt === null ? null : abstand(gewaehlt, i),
                   spaeter: null};
        aus.push(e);
        offen.push({bis: mc + 20, steine: d.steine, farbe: opfer, e});
      }
    }
    return aus;
  } finally { g.ende(); ref.ende(); }
}

/* 95-%-Intervall durch Bootstrap über Partien: Die Ereignisse einer Partie
   hängen zusammen (dieselbe Gruppe wird mehrmals angegangen), deshalb
   werden ganze Partien gezogen. stat bekommt eine Liste von Ereignissen
   und liefert eine Zahl (oder null, wenn sie nicht bestimmt ist). */
function intervall(z, stat, n = 2000) {
  const proPartie = new Map();
  for (const x of z) { if (!proPartie.has(x.seed)) proPartie.set(x.seed, []); proPartie.get(x.seed).push(x); }
  const gruppen = [...proPartie.values()], zufall = mulberry32(12345), werte = [];
  for (let r = 0; r < n; r++) {
    const zug = [];
    for (let k = 0; k < gruppen.length; k++) zug.push(...gruppen[Math.floor(zufall() * gruppen.length)]);
    const w = stat(zug);
    if (w !== null && Number.isFinite(w)) werte.push(w);
  }
  werte.sort((a, b) => a - b);
  return [werte[Math.floor(0.025 * werte.length)], werte[Math.floor(0.975 * werte.length)]];
}

function bericht(z) {
  const partien = new Set(z.map(x => x.seed)).size;
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  const R = E.PARAMS.mctsRootChildren;
  const lokal = d => d <= 2;
  for (const [name, seite] of [['GNU Go nähert sich einer lebenden Gruppe der KI', 'ki'], ['Vergleich: die KI nähert sich einer lebenden Gruppe von GNU Go', 'gegner']]) {
    const a = z.filter(x => x.seite === seite);
    const wer = seite === 'ki' ? 'KI' : 'GNU Go';
    console.log(`\n${name}: ${a.length} Ereignisse (${(a.length / partien).toFixed(1)} je Partie), Steine im Median ${a.map(x => x.steine).sort((x, y) => x - y)[a.length >> 1]}`);
    for (const [t, b] of [['alle', a], ['danach lebend', a.filter(x => x.statusNach === 'alive')],
                          ['danach kritisch', a.filter(x => x.statusNach === 'critical')], ['danach tot oder geschlagen', a.filter(x => x.statusNach === 'dead' || x.statusNach === 'weg')]]) {
      if (!b.length) continue;
      const mitS = b.filter(x => x.spaeter !== null);
      const verlust = c => c.length ? `${(c.reduce((s, x) => s + x.spaeter, 0) / c.length).toFixed(1)} Steine, ≥ 3 in ${pz(c, x => x.spaeter >= 3)}` : '–';
      console.log(`  ${t} (${b.length}, ${(b.length / partien).toFixed(1)} je Partie):`);
      console.log(`    Referenz (GNU Go Stufe für ${wer}) antwortet lokal ${pz(b, x => lokal(x.abstandReferenz))}; ${wer} antwortet lokal ${pz(b, x => lokal(x.abstandAntwort))},`
        + ` spielt die Referenz ${pz(b, x => x.antwortGleichReferenz)}` + (t === 'danach kritisch' ? `, den Rettungspunkt ${pz(b, x => x.antwortGleichRettung)}` : ''));
      const rl = b.filter(x => lokal(x.abstandReferenz));
      console.log(`    wenn die Referenz lokal antwortet (${rl.length}): ${wer} lokal ${pz(rl, x => lokal(x.abstandAntwort))}, spielt die Referenz ${pz(rl, x => x.antwortGleichReferenz)}`);
      console.log(`    20 Züge später tot oder geschlagen je Ereignis: ${wer} lokal ${verlust(mitS.filter(x => lokal(x.abstandAntwort)))}; woanders ${verlust(mitS.filter(x => !lokal(x.abstandAntwort)))}`);
      const rs = rl.filter(x => x.spaeter !== null);
      console.log(`    … wenn die Referenz lokal antwortet: ${wer} spielt sie ${verlust(rs.filter(x => x.antwortGleichReferenz))};`
        + ` lokal anders ${verlust(rs.filter(x => !x.antwortGleichReferenz && lokal(x.abstandAntwort)))}; woanders ${verlust(rs.filter(x => !lokal(x.abstandAntwort)))}`);
      if (seite === 'ki') {
        const mr = rl.filter(x => x.rangReferenz !== null);
        console.log(`    Rang der lokalen Referenz in der Kandidatenliste: 1 ${pz(mr, x => x.rangReferenz === 1)}, 2–${R} ${pz(mr, x => x.rangReferenz >= 2 && x.rangReferenz <= R)},`
          + ` > ${R} ${pz(mr, x => x.rangReferenz > R)}, nicht in der Liste ${pz(mr, x => x.rangReferenz === 0)};`
          + ` nachgestellte Zugwahl spielt sie ${pz(mr, x => x.gewaehltGleichReferenz)}, lokal ${pz(mr, x => lokal(x.abstandGewaehlt))}`);
        if (t === 'danach kritisch') {
          const mk = b.filter(x => x.rangRettung !== null);
          console.log(`    Rang des Rettungspunkts: 1 ${pz(mk, x => x.rangRettung === 1)}, 2–${R} ${pz(mk, x => x.rangRettung >= 2 && x.rangRettung <= R)},`
            + ` > ${R} ${pz(mk, x => x.rangRettung > R)}, nicht in der Liste ${pz(mk, x => x.rangRettung === 0)}`);
        }
      }
    }
  }
  /* Rauschprüfung: Kernvergleiche mit 95-%-Intervall (Bootstrap über Partien) */
  const anteil = (a, f) => a.length ? 100 * a.filter(f).length / a.length : null;
  const mittel = a => a.length ? a.reduce((s, x) => s + x.spaeter, 0) / a.length : null;
  const zeig = (t, stat) => { const w = stat(z), [lo, hi] = intervall(z, stat);
    console.log(`  ${t.padEnd(70)} ${w === null ? '–' : w.toFixed(1).padStart(6)}   [${lo.toFixed(1)}, ${hi.toFixed(1)}]`); };
  const rl = (a, seite) => a.filter(x => x.seite === seite && lokal(x.abstandReferenz));
  const ki = a => rl(a, 'ki').filter(x => x.spaeter !== null);
  console.log('\nRauschprüfung (95-%-Intervall, Bootstrap über Partien):');
  zeig('KI antwortet lokal, wenn die Referenz lokal antwortet (%)', a => anteil(rl(a, 'ki'), x => lokal(x.abstandAntwort)));
  zeig('GNU Go antwortet lokal, wenn die Referenz lokal antwortet (%)', a => anteil(rl(a, 'gegner'), x => lokal(x.abstandAntwort)));
  zeig('Differenz KI − GNU Go (Prozentpunkte)', a => anteil(rl(a, 'ki'), x => lokal(x.abstandAntwort)) - anteil(rl(a, 'gegner'), x => lokal(x.abstandAntwort)));
  zeig('KI spielt die Referenz, wenn sie lokal ist (%)', a => anteil(rl(a, 'ki'), x => x.antwortGleichReferenz));
  zeig('GNU Go spielt die Referenz, wenn sie lokal ist (%)', a => anteil(rl(a, 'gegner'), x => x.antwortGleichReferenz));
  zeig(`lokale Referenz steht in der Kandidatenliste der KI über Rang ${R} (%)`, a => anteil(rl(a, 'ki').filter(x => x.rangReferenz !== null), x => x.rangReferenz > R || x.rangReferenz === 0));
  zeig('KI, Referenz lokal: Verlust (Steine) woanders − Referenz gespielt', a => mittel(ki(a).filter(x => !lokal(x.abstandAntwort))) - mittel(ki(a).filter(x => x.antwortGleichReferenz)));
  zeig('KI, Referenz lokal: Verlust (Steine) lokal anders − Referenz gespielt', a => mittel(ki(a).filter(x => !x.antwortGleichReferenz && lokal(x.abstandAntwort))) - mittel(ki(a).filter(x => x.antwortGleichReferenz)));
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {ab: 100, bis: 200, minSteine: 3, stufe: 10, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ab') opt.ab = +a[++k];
    else if (a[k] === '--bis') opt.bis = +a[++k];
    else if (a[k] === '--min-steine') opt.minSteine = +a[++k];
    else if (a[k] === '--stufe') opt.stufe = +a[++k];
    else if (a[k] === '--aus') opt.aus = a[++k];
    else if (a[k] === '--gnugo') opt.gnugo = a[++k];
    else if (a[k] === '--bericht') opt.bericht = true;
    else dateien.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies)); return; }
  (async () => {
    const alle = [];
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege) continue;
      const t0 = Date.now();
      const z = await analysiere(p, opt);
      alle.push(...z);
      if (opt.aus) fs.appendFileSync(opt.aus, z.map(x => JSON.stringify(x)).join('\n') + (z.length ? '\n' : ''));
      console.error(`Partie ${p.nr}: ${z.length} Ereignisse · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    if (!opt.aus) bericht(alle);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht};
