/* Atari-Verzicht (atariVerzicht; docs/atari-verschenkt.md).

     1. Default 0.
     2. Bei 0 urteilt vergeblicherZug bitgenau wie vor dem Schalter
        (Referenz unten) an allen freien Punkten echter Stellungen, für beide
        Farben.
     3. Bei 1 ist ein Atari vergeblich, wenn der Leser die eigene Kette danach
        fängt und das Ziel entkommt. Der Snapback-Einwurf bleibt erlaubt.
     4. Bei 1 ändert sich das Urteil an echten Stellungen nur für Züge, die
        Atari geben, und nur genau unter dieser Bedingung.

   Aufruf:  node tests/atari-verzicht.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, NEIGHBORS, vergeblicherZug, removeDeadGroups, floodFill, leseAngriff, leseVerteidigung} = KI;
const P = (x, y) => y * 19 + x;
function brett(steine) {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of steine) b[P(x, y)] = f;
  return b;
}
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
function mit(wert, fn) {
  const alt = PARAMS.atariVerzicht;
  PARAMS.atariVerzicht = wert;
  try { return fn(); } finally { PARAMS.atariVerzicht = alt; }
}
/* Nach dem Zug: geschlagen?, Ziele im Atari, eigene Kette. */
function nachZug(b, i, f) {
  const nb = new Uint8Array(b); nb[i] = f;
  const cap = removeDeadGroups(nb, 3 - f, i);
  const ziele = NEIGHBORS[i].filter(n => nb[n] === 3 - f && floodFill(nb, n).liberties.length === 1);
  return {nb, cap, ziele, lib: floodFill(nb, i).liberties.length};
}
/* vergeblicherZug vor dem Schalter. */
function referenz(b, i, f) {
  const {nb, cap, ziele, lib} = nachZug(b, i, f);
  if (cap > 0 || ziele.length || lib > 3) return false;
  return leseAngriff(nb, i).ja;
}

test('Default atariVerzicht 0', () => {
  pruefeGleich(PARAMS.atariVerzicht, 0, 'Default');
});

test('bei 0 bitgenau wie vorher (alle freien Punkte, beide Farben)', () => {
  let n = 0, abw = 0;
  for (const b of stellungen()) for (let i = 0; i < BOARD_SIZE; i++) {
    if (b[i]) continue;
    for (const f of [1, 2]) {
      n++;
      if (mit(0, () => vergeblicherZug(b, i, f)) !== referenz(b, i, f)) abw++;
    }
  }
  pruefe(n > 1000, `${n} Fälle`);
  pruefeGleich(abw, 0, 'Abweichungen');
});

test('bei 1: aussichtsloses Atari vergeblich, Snapback-Einwurf nicht', () => {
  /* Schwarz auf (10,9) setzt Weiß (9,9) ins Atari, steht selbst mit einer
     Freiheit zwischen weißen Steinen; Weiß schlägt und ist frei. */
  const b = brett([[9, 9, 2], [8, 9, 1], [9, 8, 1], [11, 9, 2], [10, 8, 2]]);
  const z = nachZug(b, P(10, 9), 1);
  pruefeGleich(z.ziele.length, 1, 'gibt Atari');
  pruefe(leseAngriff(z.nb, P(10, 9)).ja, 'eigene Kette fangbar');
  pruefe(leseVerteidigung(z.nb, P(9, 9)).ja, 'Ziel entkommt');
  pruefe(!mit(0, () => vergeblicherZug(b, P(10, 9), 1)), 'bei 0 erlaubt (gibt Atari)');
  pruefe(mit(1, () => vergeblicherZug(b, P(10, 9), 1)), 'bei 1 vergeblich');
  const snap = brett([[0, 0, 2], [0, 1, 2], [1, 1, 2], [2, 1, 2], [0, 2, 1], [1, 2, 1], [2, 2, 1], [3, 1, 1], [3, 0, 1]]);
  pruefe(!mit(1, () => vergeblicherZug(snap, P(1, 0), 1)), 'Snapback-Einwurf bei 1 erlaubt');
  const vorher = new Uint8Array(b);
  mit(1, () => vergeblicherZug(b, P(10, 9), 1));
  pruefe(b.every((v, k) => v === vorher[k]), 'Brett unverändert');
});

test('bei 1: anderes Urteil nur für Ataris mit fangbarer Kette und entkommendem Ziel', () => {
  let neu = 0, falsch = 0;
  for (const b of stellungen()) for (let i = 0; i < BOARD_SIZE; i++) {
    if (b[i]) continue;
    for (const f of [1, 2]) {
      const v0 = mit(0, () => vergeblicherZug(b, i, f)), v1 = mit(1, () => vergeblicherZug(b, i, f));
      if (v0 === v1) continue;
      const {nb, cap, ziele, lib} = nachZug(b, i, f);
      const erwartet = !v0 && v1 && cap === 0 && ziele.length > 0 && lib <= 3
        && leseAngriff(nb, i).ja && ziele.every(n => leseVerteidigung(nb, n).ja);
      if (erwartet) neu++; else falsch++;
    }
  }
  pruefeGleich(falsch, 0, 'unerwartete Änderungen');
  pruefe(neu >= 1, `neu vergeblich: ${neu}`);
});

laufeTests('Atari-Verzicht (atariVerzicht)').then(ok => process.exit(ok ? 0 : 1));
