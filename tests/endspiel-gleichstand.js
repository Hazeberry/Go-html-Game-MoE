/* Gleichstandsbrecher im Endspiel-Experten (endTieBreak).

   Geprüft wird nicht, ob die KI dadurch STÄRKER spielt — das kann nur der
   A/B-Harness zeigen —, sondern was vorher gelten muss:

     1. Bei 0 ändert sich am Zugwert NICHTS (bitgenau), auch wenn die
        Wurzelbilanz berechnet wurde — 0 bleibt das alte Verhalten.
     2. Bei 1 wird die Gruppe der gleich bewerteten ruhigen Züge geordnet,
        jeder Wert bleibt aber im Band ±1 um den alten.
     3. Die Richtung stimmt: ein Zug, der in den Rahmen des Gegners geht,
        steht vor einem, der das eigene Gebiet auffüllt.
     4. Die inkrementelle Bilanz (tbBilanzNach) ist bitgenau die volle
        (bouzyBilanz) — sonst änderte die Beschleunigung Partien.

   Math.random wird für die bitgenauen Vergleiche festgehalten.

   Aufruf:  node tests/endspiel-gleichstand.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, evaluateMove, primeAreaCache, buildCrisisMap,
       primeEndTieBreak, phaseWeights, tbBilanzNach, bouzyBilanz, removeDeadGroups} = KI;

const MC = 200;   /* Endspiel-Experte allein */

/* Schwarz: Rahmen mit Lücken links oben; Weiß: Rahmen rechts unten. Beide
   offen, also für estimateArea kein Gebiet — genau der Fall des Anlasses. */
function stellung() {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y] of [[2, 2], [5, 2], [8, 2], [2, 5], [2, 8], [8, 5], [5, 8], [8, 8]]) b[idx(x, y)] = 1;
  for (const [x, y] of [[16, 16], [13, 16], [10, 16], [16, 13], [16, 10], [10, 13], [13, 10], [10, 10]]) b[idx(x, y)] = 2;
  return b;
}
function mitFestemZufall(fn) {
  const alt = Math.random;
  Math.random = () => 0.5;
  try { return fn(); } finally { Math.random = alt; }
}
/* gebietZug aus: der Gebietsterm (Default 80) nutzt dieselbe Wurzelbilanz
   und würde hier mitgemessen. Geprüft wird allein der Brecher. */
function mitGewicht(w, fn) {
  const alt = PARAMS.endTieBreak, altGz = PARAMS.gebietZug;
  PARAMS.endTieBreak = w; PARAMS.gebietZug = 0;
  try { return fn(); } finally { PARAMS.endTieBreak = alt; PARAMS.gebietZug = altGz; }
}
function werte(b, farbe) {
  buildCrisisMap(b, farbe);
  primeAreaCache(b, farbe);
  const leer = [];
  for (let i = 0; i < BOARD_SIZE; i++) if (!b[i]) leer.push(i);
  return mitFestemZufall(() => leer.map(i => ({i, s: evaluateMove(b, i, farbe, MC, leer.length)})));
}

test('Parameter existiert und steht standardmäßig auf 1 (gemessen, docs §10)', () => {
  pruefeGleich(PARAMS.endTieBreak, 1, 'endTieBreak-Default');
  pruefe(typeof primeEndTieBreak === 'function', 'primeEndTieBreak exportiert');
  pruefeGleich(phaseWeights(MC, 345).wEnd, 1, 'Vorbedingung: bei Zug 200 rechnet nur der Endspiel-Experte');
});

test('Gewicht 0: Zugwerte bitgenau gleich, mit und ohne berechnete Bilanz', () => {
  const b = stellung();
  const ohne = mitGewicht(0, () => werte(b, 2));
  primeEndTieBreak(b);
  const mit = mitGewicht(0, () => werte(b, 2));
  for (let k = 0; k < ohne.length; k++)
    pruefe(Object.is(ohne[k].s, mit[k].s), `Feld ${ohne[k].i}: ${ohne[k].s} gegen ${mit[k].s}`);
});

test('Gewicht 1: Gleichstand geordnet, jeder Wert im Band ±1', () => {
  const b = stellung();
  const alt = mitGewicht(0, () => werte(b, 2));
  primeEndTieBreak(b);
  const neu = mitGewicht(1, () => werte(b, 2));
  let maxAbw = 0;
  for (let k = 0; k < alt.length; k++) maxAbw = Math.max(maxAbw, Math.abs(neu[k].s - alt[k].s));
  pruefe(maxAbw <= 1, `größte Abweichung ${maxAbw}`);
  const v = Math.max(...alt.map(x => x.s));
  const gruppe = alt.filter(x => x.s === v).length;
  const verschieden = new Set(neu.filter((x, k) => alt[k].s === v).map(x => x.s)).size;
  pruefe(gruppe > 100, `Vorbedingung: große Gleichstandsgruppe (${gruppe} Züge mit ${v})`);
  pruefe(verschieden > 5, `nach dem Brecher ${verschieden} verschiedene Werte in der Gruppe`);
});

test('Richtung: in den Gegnerrahmen vor eigenes Gebiet', () => {
  const b = stellung();
  primeEndTieBreak(b);
  const neu = mitGewicht(1, () => werte(b, 2));
  const w = i => neu.find(x => x.i === i).s;
  const reduktion = idx(5, 5), auffuellen = idx(13, 13);
  pruefe(w(reduktion) > w(auffuellen),
    `Weiß: Mitte des schwarzen Rahmens ${w(reduktion)} gegen eigener Rahmen ${w(auffuellen)}`);
  const nb = mitGewicht(1, () => werte(b, 1));
  const s = i => nb.find(x => x.i === i).s;
  pruefe(s(idx(13, 13)) > s(idx(5, 5)), 'Schwarz: spiegelbildlich');
});

/* Fester Zufall für reproduzierbare Stellungen. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('inkrementelle Bilanz = volle Bilanz, jeder Kandidat, jede Dichte', () => {
  const r = mulberry32(20261003);
  let kandidaten = 0, mitSchlag = 0;
  for (let st = 0; st < 40; st++) {
    const dichte = 0.05 + 0.6 * st / 40;
    const b = new Uint8Array(BOARD_SIZE);
    for (let i = 0; i < BOARD_SIZE; i++) if (r() < dichte) b[i] = r() < 0.5 ? 1 : 2;
    primeEndTieBreak(b);
    pruefeGleich(tbBilanzNach(b), bouzyBilanz(b), `Stellung ${st}: Wurzel selbst`);
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (b[i]) continue;
      for (const f of [1, 2]) {
        const nb = new Uint8Array(b);
        nb[i] = f;
        if (removeDeadGroups(nb, f === 1 ? 2 : 1, i) > 0) mitSchlag++;
        kandidaten++;
        const inkr = tbBilanzNach(nb), voll = bouzyBilanz(nb);
        if (inkr !== voll) pruefeGleich(inkr, voll, `Stellung ${st}, Feld ${i}, Farbe ${f}`);
      }
    }
  }
  pruefe(kandidaten > 10000 && mitSchlag > 100, `Vorbedingung: ${kandidaten} Kandidaten, ${mitSchlag} mit Schlag`);
});

test('inkrementelle Bilanz auch gegen ein ganz anderes Brett', () => {
  const r = mulberry32(7);
  const zufall = () => { const b = new Uint8Array(BOARD_SIZE);
    for (let i = 0; i < BOARD_SIZE; i++) if (r() < 0.3) b[i] = r() < 0.5 ? 1 : 2; return b; };
  for (let k = 0; k < 50; k++) {
    primeEndTieBreak(zufall());
    const anderes = zufall();
    pruefeGleich(tbBilanzNach(anderes), bouzyBilanz(anderes), `Paar ${k}`);
  }
});

laufeTests('Endspiel-Gleichstand (endTieBreak)').then(ok => process.exit(ok ? 0 : 1));
