/* Gleichstandsbrecher im Endspiel-Experten (endTieBreak).

   Geprüft wird nicht, ob die KI dadurch STÄRKER spielt — das kann nur der
   A/B-Harness zeigen —, sondern was vorher gelten muss:

     1. Bei 0 ändert sich am Zugwert NICHTS (bitgenau), auch wenn die
        Wurzelbilanz berechnet wurde.
     2. Bei 1 wird die Gruppe der gleich bewerteten ruhigen Züge geordnet,
        jeder Wert bleibt aber im Band ±1 um den alten.
     3. Die Richtung stimmt: ein Zug, der in den Rahmen des Gegners geht,
        steht vor einem, der das eigene Gebiet auffüllt.

   Math.random wird für die bitgenauen Vergleiche festgehalten.

   Aufruf:  node tests/endspiel-gleichstand.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, evaluateMove, primeAreaCache, buildCrisisMap,
       primeEndTieBreak, phaseWeights} = KI;

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
function mitGewicht(w, fn) {
  const alt = PARAMS.endTieBreak;
  PARAMS.endTieBreak = w;
  try { return fn(); } finally { PARAMS.endTieBreak = alt; }
}
function werte(b, farbe) {
  buildCrisisMap(b, farbe);
  primeAreaCache(b, farbe);
  const leer = [];
  for (let i = 0; i < BOARD_SIZE; i++) if (!b[i]) leer.push(i);
  return mitFestemZufall(() => leer.map(i => ({i, s: evaluateMove(b, i, farbe, MC, leer.length)})));
}

test('Parameter existiert und steht standardmäßig auf 0', () => {
  pruefeGleich(PARAMS.endTieBreak, 0, 'endTieBreak-Default');
  pruefe(typeof primeEndTieBreak === 'function', 'primeEndTieBreak exportiert');
  pruefeGleich(phaseWeights(MC, 345).wEnd, 1, 'Vorbedingung: bei Zug 200 rechnet nur der Endspiel-Experte');
});

test('Gewicht 0: Zugwerte bitgenau gleich, mit und ohne berechnete Bilanz', () => {
  const b = stellung();
  const ohne = werte(b, 2);
  primeEndTieBreak(b);
  const mit = mitGewicht(0, () => werte(b, 2));
  for (let k = 0; k < ohne.length; k++)
    pruefe(Object.is(ohne[k].s, mit[k].s), `Feld ${ohne[k].i}: ${ohne[k].s} gegen ${mit[k].s}`);
});

test('Gewicht 1: Gleichstand geordnet, jeder Wert im Band ±1', () => {
  const b = stellung();
  const alt = werte(b, 2);
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

laufeTests('Endspiel-Gleichstand (endTieBreak)').then(ok => process.exit(ok ? 0 : 1));
