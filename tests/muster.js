// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Muster aus GNU-Go-Zügen (musterGewicht; docs/muster.md).

     1. Default 200 (seit docs/muster.md §8), Tabelle vorhanden.
     2. Der Term ist die einzige Änderung: mit leerer Tabelle spielt
        getAIMove bei 200 bitgenau wie bei 0 (derselbe Zug, dieselbe Info).
     3. Der Musterschlüssel in index.html ist derselbe wie in
        auswertung/muster.js, mit dem die Tabelle gelernt wurde (alle freien
        Punkte echter Stellungen, beide Farben).
     4. musterWert ändert sich nicht unter den acht Drehungen und
        Spiegelungen des Bretts.
     5. Bei > 0 ist jeder Kandidatenwert an der Wurzel genau evaluateMove +
        musterGewicht × musterWert.
     Die zweite Tabelle (musterTabelle, docs/muster-ausbau.md) ist gemessen,
     verworfen und wieder entfernt; ihre Tests stehen in Commit 6edae5d.

   Aufruf:  node tests/muster.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, getAIMove, removeDeadGroups, musterWert, musterSchluessel, MUSTER_TABELLE,
       evaluateMove, buildCrisisMap, primeAreaCache, primeEndTieBreak} = KI;
const auswertung = require(path.join(__dirname, '..', 'auswertung', 'muster.js'));
auswertung.nutzeKI(KI);   /* keine zweite Engine laden */

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  let seed = 7; const r = Math.random;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  try { return fn(); } finally { Object.assign(PARAMS, alt); Math.random = r; }
}
const zug = (b, farbe, mc, kv) => mit({mctsFixedSims: 60, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, ...kv},
  () => getAIMove(b, farbe, [], {1: 0, 2: 0}, mc, 'hard', 1, null, null));

function stellungen() {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', 'laufkampf-211.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g; const zs = []; let m;
  while ((m = re.exec(txt))) zs.push({f: m[1] === 'B' ? 1 : 2,
    i: m[2] ? (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97) : -1});
  return [40, 120, 211].map(bis => {
    const b = new Uint8Array(BOARD_SIZE);
    for (let t = 0; t < bis && t < zs.length; t++) { const z = zs[t]; if (z.i < 0) continue;
      b[z.i] = z.f; removeDeadGroups(b, 3 - z.f, z.i); }
    return b;
  });
}

test('Default musterGewicht 200, Tabelle mit Mustern, Abstand und Linie', () => {
  pruefeGleich(PARAMS.musterGewicht, 200, 'Default');
  const k = Object.keys(MUSTER_TABELLE);
  pruefe(k.filter(x => x.startsWith('m:')).length > 1000, 'Muster in der Tabelle');
  for (const x of ['l:1', 'l:2', 'l:keiner', 'z:1', 'z:3']) pruefe(x in MUSTER_TABELLE, `Merkmal ${x}`);
});

test('leere Tabelle: Gewicht 200 bitgenau wie Gewicht 0', () => {
  const kopie = Object.assign({}, MUSTER_TABELLE);
  for (const k of Object.keys(MUSTER_TABELLE)) delete MUSTER_TABELLE[k];
  try {
    for (const b of stellungen()) {
      const null0 = zug(b, 1, 120, {musterGewicht: 0});
      const leer = zug(b, 1, 120, {musterGewicht: 200});
      pruefeGleich(`${leer.type} ${leer.x},${leer.y}`, `${null0.type} ${null0.x},${null0.y}`, 'Zug');
      pruefeGleich(leer.info, null0.info, 'Info');
    }
  } finally { Object.assign(MUSTER_TABELLE, kopie); }
  pruefe(Object.keys(MUSTER_TABELLE).length > 1000, 'Tabelle wiederhergestellt');
});

test('Schlüssel wie in auswertung/muster.js (alle freien Punkte, beide Farben)', () => {
  let n = 0;
  for (const b of stellungen()) for (const farbe of [1, 2]) {
    const libs = i => { const s = new Set(), q = [i], f = b[i]; s.add(i); const l = new Set();
      for (let k = 0; k < q.length; k++) for (const nb of KI.NEIGHBORS[q[k]]) {
        if (!b[nb]) l.add(nb); else if (b[nb] === f && !s.has(nb)) { s.add(nb); q.push(nb); } }
      return l.size; };
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (b[i]) continue;
      pruefeGleich(musterSchluessel(b, i, farbe), auswertung.musterSchluessel(b, i, farbe, libs), `Punkt ${i}, Farbe ${farbe}`);
      n++;
    }
  }
  pruefe(n > 600, 'genug Punkte geprüft');
});

test('musterWert unter Drehung und Spiegelung gleich', () => {
  const abb = [(x, y) => [x, y], (x, y) => [18 - x, y], (x, y) => [x, 18 - y], (x, y) => [18 - x, 18 - y],
               (x, y) => [y, x], (x, y) => [18 - y, x], (x, y) => [y, 18 - x], (x, y) => [18 - y, 18 - x]];
  const b = stellungen()[1];
  for (const t of abb) {
    const tb = new Uint8Array(BOARD_SIZE);
    for (let i = 0; i < BOARD_SIZE; i++) { const [x, y] = t(i % 19, Math.floor(i / 19)); tb[y * 19 + x] = b[i]; }
    for (let i = 0; i < BOARD_SIZE; i += 7) {
      if (b[i]) continue;
      const [x, y] = t(i % 19, Math.floor(i / 19));
      pruefeGleich(musterWert(tb, y * 19 + x, 1), musterWert(b, i, 1), `Punkt ${i}`);
    }
  }
});

test('musterGewicht > 0: Wurzelwert = Wert bei 0 + Gewicht × musterWert', () => {
  const b = stellungen()[1];
  let liste = null;
  const echt = globalThis.mctsPUCT;
  globalThis.mctsPUCT = function (board, color, caps, rootScored, ko) {
    liste = new Map(rootScored.map(s => [s.m.idx, s.score]));
    return echt(board, color, caps, rootScored, ko);
  };
  const wurzel = w => mit({musterGewicht: w, mctsFixedSims: 30, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0}, () => {
    const zr = Math.random; Math.random = () => 0;
    try { getAIMove(new Uint8Array(b), 1, [], {1: 0, 2: 0}, 120, 'hard', 1, null, null); } finally { Math.random = zr; }
    return liste;
  });
  try {
    const ohne = wurzel(0), mit400 = wurzel(400);
    let gemeinsam = 0;
    for (const [idx, wert] of mit400) {
      if (!ohne.has(idx)) continue;
      gemeinsam++;
      pruefe(Math.abs(wert - ohne.get(idx) - 400 * musterWert(b, idx, 1)) < 1e-6, `Kandidat ${idx}`);
    }
    pruefe(gemeinsam > 0, 'gemeinsame Kandidaten');
  } finally { globalThis.mctsPUCT = echt; }
});

laufeTests('Muster aus GNU-Go-Zügen (musterGewicht)').then(ok => process.exit(ok ? 0 : 1));
