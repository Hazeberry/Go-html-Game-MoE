/* Rettungsbonus in quickEval (quickRettung; docs/quick-rettung.md).

     1. Default 0.
     2. Bei 0 rechnet quickEval bitgenau wie vor dem Schalter (Referenz unten,
        nachgerechnet mit floodFill) an allen freien Punkten echter Stellungen.
     3. Bei 1 fehlt der Bonus von 80 je schwachem Nachbarstein genau dann,
        wenn die eigene Kette nach dem Zug höchstens zwei Freiheiten hat.

   Aufruf:  node tests/quick-rettung.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, NEIGHBORS, quickEval, removeDeadGroups, floodFill} = KI;

function stellungen() {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', 'laufkampf-211.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g; const zs = []; let m;
  while ((m = re.exec(txt))) zs.push({f: m[1] === 'B' ? 1 : 2,
    i: m[2] ? (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97) : -1});
  return [60, 120, 180, 211].map(bis => {
    const b = new Uint8Array(BOARD_SIZE);
    for (let t = 0; t < bis && t < zs.length; t++) { const z = zs[t]; if (z.i < 0) continue;
      b[z.i] = z.f; removeDeadGroups(b, 3 - z.f, z.i); }
    return b;
  });
}
const freiheiten = (b, i) => floodFill(b, i).liberties.length;

/* quickEval vor dem Schalter, mit Zufall 0,5. */
function referenz(b, i, f) {
  const opp = 3 - f;
  let s = 0, free = 0, oppN = 0, ownN = 0;
  for (const n of NEIGHBORS[i]) {
    if (b[n] === 0) free++;
    else if (b[n] === opp) { oppN++; if (freiheiten(b, n) === 1) s += 200; }
    else { ownN++; if (freiheiten(b, n) <= 2) s += 80; }
  }
  const nb = new Uint8Array(b); nb[i] = f;
  const cap = removeDeadGroups(nb, opp, i);
  s += cap * 500;
  if (freiheiten(nb, i) === 1 && cap === 0) s -= 300;
  return s + free * 40 + oppN * 20 + ownN * 15 + 0.5 * 5;
}

function mit(werte, fn) {
  const alt = {}, r = Math.random;
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  Math.random = () => 0.5;
  try { return fn(); } finally { Object.assign(PARAMS, alt); Math.random = r; }
}

test('Default quickRettung 0', () => {
  pruefeGleich(PARAMS.quickRettung, 0, 'Default');
});

test('quickRettung 0: bitgenau wie vorher', () => {
  let n = 0;
  for (const b of stellungen()) for (const f of [1, 2]) for (let i = 0; i < BOARD_SIZE; i++) {
    if (b[i]) continue;
    const ist = mit({quickRettung: 0}, () => quickEval(b, i, f));
    if (!Object.is(ist, referenz(b, i, f))) pruefeGleich(ist, referenz(b, i, f), `Feld ${i}, Farbe ${f}`);
    n++;
  }
  pruefe(n > 500, `Vorbedingung: ${n} Punkte geprüft`);
});

test('quickRettung 1: Bonus nur, wenn die Kette danach mindestens drei Freiheiten hat', () => {
  let ohneBonus = 0, mitBonus = 0;
  for (const b of stellungen()) for (const f of [1, 2]) for (let i = 0; i < BOARD_SIZE; i++) {
    if (b[i]) continue;
    const q0 = mit({quickRettung: 0}, () => quickEval(b, i, f));
    const q1 = mit({quickRettung: 1}, () => quickEval(b, i, f));
    let schwach = 0;
    for (const n of NEIGHBORS[i]) if (b[n] === f && freiheiten(b, n) <= 2) schwach++;
    const nb = new Uint8Array(b); nb[i] = f; removeDeadGroups(nb, 3 - f, i);
    const soll = schwach && freiheiten(nb, i) < 3 ? 80 * schwach : 0;
    if (soll) ohneBonus++; else if (schwach) mitBonus++;
    pruefeGleich(q0 - q1, soll, `Feld ${i}, Farbe ${f}`);
  }
  pruefe(ohneBonus >= 1 && mitBonus >= 1, `Vorbedingung: ${ohneBonus} ohne, ${mitBonus} mit Bonus`);
});

laufeTests('Rettungsbonus in quickEval (quickRettung)').then(ok => process.exit(ok ? 0 : 1));
