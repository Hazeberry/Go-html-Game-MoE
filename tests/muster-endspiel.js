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
  pruefe(MD.GRUPPEN.length === MD.K && MD.K === 11, 'elf Merkmalsgruppen');
});

laufeTests('Endspiel-Muster: Werkzeuge').then(ok => process.exit(ok ? 0 : 1));
