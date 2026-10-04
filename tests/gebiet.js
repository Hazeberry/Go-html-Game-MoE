/* Gebiet in Stellungs- und Zugbewertung (gebietGewicht, gebietZug;
   docs/gebiet.md).

     1. Bei 0 bleiben evaluateBoard und evaluateMove bitgenau.
     2. gebietGewicht addiert genau Gewicht × Bouzy-Bilanz (aus Sicht von color).
     3. gebietZug addiert je Kandidat genau Gewicht × Bilanzänderung durch den
        Zug — nachgerechnet mit der vollen Karte (gebietBilanz), nicht mit der
        inkrementellen, die der Code benutzt.

   Aufruf:  node tests/gebiet.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, evaluateBoard, evaluateMove, gebietBilanz, primeEndTieBreak,
       removeDeadGroups, primeAreaCache, buildCrisisMap} = KI;

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  try { return fn(); } finally { Object.assign(PARAMS, alt); }
}
function stellungen() {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', 'laufkampf-211.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g; const zs = []; let m;
  while ((m = re.exec(txt))) zs.push({f: m[1] === 'B' ? 1 : 2,
    i: m[2] ? (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97) : -1});
  return [20, 60, 120, 180].map(bis => {
    const b = new Uint8Array(BOARD_SIZE);
    for (let t = 0; t < bis; t++) { const z = zs[t]; if (z.i < 0) continue;
      b[z.i] = z.f; removeDeadGroups(b, 3 - z.f, z.i); }
    return {bis, b};
  });
}
function zugWerte(b, farbe, mc, w) {
  /* endTieBreak aus: sonst wirkt der Brecher, sobald primeEndTieBreak lief. */
  return mit({gebietZug: w, endTieBreak: 0}, () => {
    buildCrisisMap(b, farbe); primeAreaCache(b, farbe);
    const alt = Math.random; Math.random = () => 0.5;
    try {
      const r = [];
      for (let i = 0; i < BOARD_SIZE; i++) if (!b[i]) r.push({i, s: evaluateMove(b, i, farbe, mc, 200)});
      return r;
    } finally { Math.random = alt; }
  });
}

test('Parameter existieren und stehen standardmäßig auf 0', () => {
  pruefeGleich(PARAMS.gebietGewicht, 0, 'gebietGewicht-Default');
  pruefeGleich(PARAMS.gebietZug, 0, 'gebietZug-Default');
});

test('gebietGewicht: 0 bitgenau, sonst genau Gewicht × Bilanz', () => {
  for (const {bis, b} of stellungen()) for (const color of [1, 2]) {
    const cap = {1: 2, 2: 3};
    const ohne = evaluateBoard(b, color, cap);
    pruefe(Object.is(ohne, mit({gebietGewicht: 0}, () => evaluateBoard(b, color, cap))), `Zug ${bis}: 0 bitgenau`);
    const mitG = mit({gebietGewicht: 3}, () => evaluateBoard(b, color, cap));
    const g = gebietBilanz(b) * (color === 1 ? 1 : -1);
    pruefe(Math.abs((mitG - ohne) - 3 * g) < 1e-9, `Zug ${bis}, Farbe ${color}: ${mitG - ohne} gegen ${3 * g}`);
  }
});

test('gebietZug: 0 bitgenau; sonst genau Gewicht × Bilanzänderung (volle Karte)', () => {
  let mitBonus = 0;
  for (const {bis, b} of stellungen()) for (const farbe of [1, 2]) {
    const ohne = zugWerte(b, farbe, bis, 0);
    primeEndTieBreak(b);
    const null2 = zugWerte(b, farbe, bis, 0);
    for (let k = 0; k < ohne.length; k++)
      if (!Object.is(ohne[k].s, null2[k].s)) pruefe(false, `Zug ${bis}: 0 nicht bitgenau an ${ohne[k].i}`);
    const mitZ = zugWerte(b, farbe, bis, 10);
    const vor = gebietBilanz(b);
    for (let k = 0; k < ohne.length; k++) {
      if (ohne[k].s < -5000) continue;
      const nb = Uint8Array.from(b); nb[ohne[k].i] = farbe; removeDeadGroups(nb, 3 - farbe, ohne[k].i);
      const soll = 10 * (gebietBilanz(nb) - vor) * (farbe === 1 ? 1 : -1);
      const diff = mitZ[k].s - ohne[k].s;
      if (soll !== 0) mitBonus++;
      /* Krisenfelder mischen den Term mit dem Tsumego-Wert (Faktor 1 - w). */
      if (Math.abs(diff - soll) > 1e-6 && (diff - 0) * (diff - soll) > 1e-9)
        pruefeGleich(diff, soll, `Zug ${bis}, Farbe ${farbe}, Feld ${ohne[k].i}`);
    }
  }
  pruefe(mitBonus > 200, `Vorbedingung: ${mitBonus} Kandidaten mit Bonus`);
});

laufeTests('Gebiet (gebietGewicht, gebietZug)').then(ok => process.exit(ok ? 0 : 1));
