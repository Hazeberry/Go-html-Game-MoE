// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Werkzeuge für die Endspiel-Muster (docs/muster-endspiel.md).

     1. Rang bei gleichen Werten: Wahrscheinlichkeit bei zufälliger Wahl
        unter den Gleichen.
     2. Das gemeinsame Lernen (lerneMM) findet bekannte Stärken wieder.
     3. Die Merkmale m, l, z der Kandidatenliste sind dieselben wie die in
        index.html: Tabellenwerte der drei Schlüssel ergeben genau
        musterWert der Engine.
     4. Die Kandidatenliste ist die der KI: GNU Gos Zug steht dort, wo die
        Rangfolge von getAIMove ihn hinstellt (Bewertung ohne Muster +
        musterGewicht × Muster ergibt die sortierte Liste).

   Der Schalter musterEndspiel im Spiel (docs/muster-endspiel-spiel.md):
     5. Default 0; die Tabelle MUSTER_ENDSPIEL hat die sechs Gruppen
        m, l, z, d, u, k.
     6. Die Schlüssel im Spiel sind die der Auswertung: musterWertEndspiel
        ist die Summe der Tabellenwerte der sechs Schlüssel von
        muster-endspiel-daten.js.
     7. Der Wert ist unter Drehung und Spiegelung des Bretts gleich.
     8. An der Wurzel: ab Zug 80 und bei Gewicht > 0 gilt Wert ohne Muster +
        Gewicht × musterWertEndspiel (statt musterGewicht × musterWert);
        vor Zug 80 und bei 0 bleibt alles wie vorher.

   Aufruf:  node tests/muster-endspiel.js */
'use strict';
const path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const ME = require('../auswertung/muster-endspiel.js');
const MD = require('../auswertung/muster-endspiel-daten.js');

test('Rang bei gleichen Werten: Wahrscheinlichkeit bei zufälliger Wahl', () => {
  const r = ME.rangWahrscheinlichkeit(Float64Array.from([3, 3, 1, 0]), 4, 0);
  pruefeGleich(r.p1, 0.5, 'zwei Gleiche an der Spitze: Rang 1 mit 1/2');
  pruefeGleich(r.p16, 1, 'Rang ≤ 16 sicher');
  const r2 = ME.rangWahrscheinlichkeit(Float64Array.from([3, 3, 1, 0]), 4, 2);
  pruefeGleich(r2.p1, 0, 'zwei Werte davor: nie Rang 1');
  /* 15 Züge davor, ein Gleicher: Rang 16 oder 17 mit je 1/2 */
  const w = new Float64Array(20); for (let i = 0; i < 15; i++) w[i] = 10; w[15] = 5; w[16] = 5;
  pruefeNah(ME.rangWahrscheinlichkeit(w, 20, 15).p16, 0.5, 1e-12, 'Rang ≤ 16 mit 1/2');
});

test('gemeinsames Lernen findet bekannte Stärken wieder', () => {
  /* Zwei Gruppen: A (3 Werte), B (4 Werte); GNU Gos Zug wird mit
     Wahrscheinlichkeit ∝ exp(a + b) gezogen. */
  const wa = [0, 1, -1], wb = [0.5, -0.5, 0, 1.5];
  let seed = 7; const zufall = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const K = 2, nPos = 20000, nK = 20;
  const f = new Int32Array(nPos * nK * K), pos = [];
  for (let q = 0; q < nPos; q++) {
    const stark = new Float64Array(nK);
    for (let j = 0; j < nK; j++) {
      const a = (zufall() * 3) | 0, b = (zufall() * 4) | 0;
      f[(q * nK + j) * K] = a; f[(q * nK + j) * K + 1] = 3 + b;
      stark[j] = Math.exp(wa[a] + wb[b]);
    }
    let z = stark.reduce((s, x) => s + x, 0) * zufall(), ziel = 0;
    for (; ziel < nK - 1; ziel++) { z -= stark[ziel]; if (z <= 0) break; }
    pos.push({off: q * nK, n: nK, ziel});
  }
  const D = {K, namen: new Array(7).fill('x'), f};
  const tab = ME.lerneMM(D, pos, [0, 1], 40, 1);
  /* nur Unterschiede innerhalb einer Gruppe sind bestimmt */
  for (let i = 1; i < 3; i++) pruefeNah(tab[i] - tab[0], wa[i] - wa[0], 0.1, `Gruppe A, Wert ${i}`);
  for (let i = 1; i < 4; i++) pruefeNah(tab[3 + i] - tab[3], wb[i] - wb[0], 0.1, `Gruppe B, Wert ${i}`);
});

const KI = ladeKI({mitNetz: false});
MD.stelleEin(KI);
const N = 361, i = (x, y) => y * 19 + x;

function stellung() {
  /* Schwarz neun Vorgabesteine plus ein paar Züge, Weiß am Zug */
  const b = new Uint8Array(N);
  for (const [x, y] of [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]]) b[i(x, y)] = 1;
  for (const [x, y, c] of [[2, 4, 2], [3, 5, 1], [4, 4, 2], [15, 5, 2], [14, 4, 1], [16, 6, 1], [9, 11, 2], [10, 10, 1], [8, 12, 1], [10, 12, 2]]) b[i(x, y)] = c;
  return b;
}

test('Merkmale m, l, z: Tabellenwerte ergeben musterWert der Engine', () => {
  const b = stellung(), c = 2, letzt = i(10, 12), k = 90;
  const liste = MD.kandidatenListe(KI, b, c, k, letzt);
  pruefe(liste && liste.length > 100, 'Kandidatenliste vorhanden');
  const T = KI.MUSTER_TABELLE, kt = MD.karten(KI, b, c);
  for (const s of liste.slice(0, 60)) {
    const keys = MD.schluessel(KI, b, c, k, letzt, s.m.idx, kt);
    pruefeNah((T[keys[0]] || 0) + (T[keys[1]] || 0) + (T[keys[2]] || 0), KI.musterWert(b, s.m.idx, c), 1e-9, `Punkt ${s.m.idx}`);
  }
});

test('Kandidatenliste: Bewertung ohne Muster + musterGewicht × Muster ergibt die Liste', () => {
  const b = stellung(), c = 2, letzt = i(10, 12), k = 90;
  const mit = MD.kandidatenListe(KI, b, c, k, letzt);
  const mg = KI.PARAMS.musterGewicht;
  pruefeGleich(mg, 200, 'musterGewicht 200');
  for (let j = 1; j < mit.length; j++) pruefe(mit[j - 1].score >= mit[j].score, 'absteigend sortiert');
  KI.PARAMS.musterGewicht = 0;
  let ohne;
  try { ohne = MD.kandidatenListe(KI, b, c, k, letzt); } finally { KI.PARAMS.musterGewicht = mg; }
  const wert0 = new Map(ohne.map(s => [s.m.idx, s.score]));
  pruefeGleich(wert0.size, mit.length, 'gleiche Kandidaten ohne Muster');
  for (const s of mit) pruefeNah(s.score, wert0.get(s.m.idx) + mg * KI.musterWert(b, s.m.idx, c), 1e-9, `Punkt ${s.m.idx}`);
  pruefe(MD.GRUPPEN.length === MD.K && MD.K === 15, 'fünfzehn Merkmalsgruppen');
});

const SECHS = 'mlzduk';
function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = KI.PARAMS[k]; KI.PARAMS[k] = werte[k]; }
  try { return fn(); } finally { for (const k of Object.keys(alt)) KI.PARAMS[k] = alt[k]; }
}

test('Schalter musterEndspiel: Default 0, Tabelle mit den sechs Gruppen', () => {
  pruefeGleich(KI.PARAMS.musterEndspiel, 0, 'Default');
  const T = KI.MUSTER_ENDSPIEL, gruppen = new Map();
  for (const [k, v] of Object.entries(T)) {
    pruefe(/^[mlzduk]:/.test(k), `Schlüssel ${k}`);
    pruefe(Number.isFinite(v) && v !== 0 && Math.abs(v) < 20, `Wert ${k}: ${v}`);
    gruppen.set(k[0], (gruppen.get(k[0]) || 0) + 1);
  }
  for (const g of SECHS) pruefe(gruppen.get(g) > 0, `Gruppe ${g} hat Einträge`);
  pruefe(gruppen.get('m') > 1000 && gruppen.get('u') > 500 && gruppen.get('k') > 500, 'Muster, Ringe und Springerpunkte');
  pruefeGleich(gruppen.get('z'), 5, 'fünf Linien');
});

test('Schalter musterEndspiel: Schlüssel im Spiel = Schlüssel der Auswertung', () => {
  const b = stellung(), c = 2, letzt = i(10, 12), k = 90;
  const liste = MD.kandidatenListe(KI, b, c, k, letzt);
  KI.primeMusterEndspiel(b, c);
  const T = KI.MUSTER_ENDSPIEL, kt = MD.karten(KI, b, c);
  let n = 0;
  for (const s of liste) {
    const keys = MD.schluessel(KI, b, c, k, letzt, s.m.idx, kt).filter(x => SECHS.includes(x[0]));
    pruefeGleich(keys.length, 6, 'sechs Schlüssel');
    /* die Schlüsselzeichen selbst, nicht nur ihre Tabellenwerte */
    const sk = g => keys.find(x => x[0] === g).slice(2), x0 = s.m.idx % 19, y0 = Math.floor(s.m.idx / 19);
    pruefeGleich(KI.musterRing(b, x0, y0, c, KI._ME_U, KI._ME_LU), sk('u'), `Ring u, Punkt ${s.m.idx}`);
    pruefeGleich(KI.musterRing(b, x0, y0, c, KI._ME_K, KI._ME_LK), sk('k'), `Ring k, Punkt ${s.m.idx}`);
    pruefeGleich(KI._meEig[s.m.idx] + '-' + KI._meFr[s.m.idx], sk('d'), `Abstand d, Punkt ${s.m.idx}`);
    let soll = 0;
    for (const g of SECHS) soll += T[keys.find(x => x[0] === g)] || 0;
    pruefeNah(KI.musterWertEndspiel(b, s.m.idx, c), soll, 1e-9, `Punkt ${s.m.idx}`);
    n++;
  }
  pruefe(n > 100, 'genug Kandidaten geprüft');
});

test('Schalter musterEndspiel: Wert unter Drehung und Spiegelung gleich', () => {
  const abb = [(x, y) => [x, y], (x, y) => [18 - x, y], (x, y) => [x, 18 - y], (x, y) => [18 - x, 18 - y],
               (x, y) => [y, x], (x, y) => [18 - y, x], (x, y) => [y, 18 - x], (x, y) => [18 - y, 18 - x]];
  const b = stellung(), c = 2;
  MD.kandidatenListe(KI, b, c, 90, -1);   /* setzt den letzten Zug zurück: Abstand „keiner“ */
  KI.primeMusterEndspiel(b, c);
  const soll = new Map();
  for (let p = 0; p < N; p += 3) if (!b[p]) soll.set(p, KI.musterWertEndspiel(b, p, c));
  let n = 0;
  for (const t of abb) {
    const tb = new Uint8Array(N);
    for (let p = 0; p < N; p++) { const [x, y] = t(p % 19, Math.floor(p / 19)); tb[y * 19 + x] = b[p]; }
    KI.primeMusterEndspiel(tb, c);
    for (const [p, w] of soll) {
      const [x, y] = t(p % 19, Math.floor(p / 19));
      pruefeNah(KI.musterWertEndspiel(tb, y * 19 + x, c), w, 1e-9, `Punkt ${p}`);
      n++;
    }
  }
  pruefe(n > 800, 'genug Punkte geprüft');
});

test('Schalter musterEndspiel: Wurzelwert ab Zug 80, davor und bei 0 wie bisher', () => {
  const b = stellung(), c = 2, letzt = i(10, 12), mg = KI.PARAMS.musterGewicht;
  const liste = (k, params) => new Map(mit(params, () => MD.kandidatenListe(KI, b, c, k, letzt)).map(s => [s.m.idx, s.score]));
  const alt90 = liste(90, {}), ohne90 = liste(90, {musterGewicht: 0});
  /* Default: Score = Wert ohne Muster + musterGewicht × musterWert (bitgleich zum Test oben) */
  for (const [p, w] of alt90) pruefeNah(w, ohne90.get(p) + mg * KI.musterWert(b, p, c), 1e-9, `Default, Punkt ${p}`);
  /* musterEndspiel 200 ab Zug 90: Wert ohne Muster + 200 × musterWertEndspiel */
  const neu90 = liste(90, {musterEndspiel: 200}), neuOhne = liste(90, {musterEndspiel: 200, musterGewicht: 0});
  for (const [p, w] of neu90) pruefeNah(w, ohne90.get(p) + 200 * KI.musterWertEndspiel(b, p, c), 1e-9, `Zug 90, Punkt ${p}`);
  for (const [p, w] of neu90) pruefeGleich(neuOhne.get(p), w, `musterGewicht ist ab Zug 80 ohne Wirkung, Punkt ${p}`);
  /* Grenze: Zug 79 alt, Zug 80 neu */
  const alt79 = liste(79, {}), neu79 = liste(79, {musterEndspiel: 200});
  for (const [p, w] of alt79) pruefeGleich(neu79.get(p), w, `Zug 79 unverändert, Punkt ${p}`);
  const neu80 = liste(80, {musterEndspiel: 200}), ohne80 = liste(80, {musterGewicht: 0});
  for (const [p, w] of neu80) pruefeNah(w, ohne80.get(p) + 200 * KI.musterWertEndspiel(b, p, c), 1e-9, `Zug 80, Punkt ${p}`);
  /* die Rangfolge ändert sich tatsächlich */
  const rang = m => [...m].sort((x, y) => y[1] - x[1]).map(x => x[0]).slice(0, 10).join();
  pruefe(rang(neu90) !== rang(alt90), 'andere Spitze der Liste');
});

laufeTests('Endspiel-Muster: Werkzeuge und Schalter').then(ok => process.exit(ok ? 0 : 1));
