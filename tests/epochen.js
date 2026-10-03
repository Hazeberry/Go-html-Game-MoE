/* Epochenzähler und ihr Überlauf.

   _nextFfEpoch läuft im Harness rund alle neun Partien über (der Zähler
   wächst über Partien hinweg) und nullt dann seine Markierungsfelder. Eine
   Funktion, die eine Epoche über Aufrufe hinweg hält, die selbst
   _nextFfEpoch rufen, verliert dabei ihre Marken. evaluateBoard tat genau
   das: _evalBoardSeen hing am selben Zähler, und ein Überlauf mitten in der
   Gruppenschleife ließ schon gezählte Gruppen ein zweites Mal zählen. So
   entstand die Abweichung ab Partie 151 (docs/endspielgrenze.md, §9).

   Geprüft: evaluateBoard liefert denselben Wert, egal bei welcher Gruppe
   der Zähler überläuft.

   Aufruf:  node tests/epochen.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, evaluateBoard, setzeFfEpoche} = KI;

/* Viele kleine Gruppen beider Farben, über das ganze Brett verteilt —
   damit jede Gruppe Steine hinter der Position der vorigen hat. */
function stellung(seed) {
  let a = seed >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const b = new Uint8Array(BOARD_SIZE);
  for (let i = 0; i < BOARD_SIZE; i++) if (r() < 0.45) b[i] = r() < 0.5 ? 1 : 2;
  return b;
}

test('Hook vorhanden', () => {
  pruefe(typeof setzeFfEpoche === 'function', 'setzeFfEpoche exportiert');
});

test('evaluateBoard: gleicher Wert, wo immer der Zähler überläuft', () => {
  let geprueft = 0;
  for (const seed of [1, 2, 3]) {
    const b = stellung(seed);
    const cap = {1: 0, 2: 0};
    setzeFfEpoche(1000);
    const soll = evaluateBoard(b, 1, cap);
    for (let m = 0; m < 120; m++) {
      /* Der (m+1)-te Aufruf von _nextFfEpoch in evaluateBoard läuft über. */
      setzeFfEpoche(0x7fffffff - 1 - m);
      const ist = evaluateBoard(b, 1, cap);
      geprueft++;
      if (!Object.is(ist, soll)) pruefeGleich(ist, soll, `Stellung ${seed}, Überlauf beim ${m + 1}. Aufruf`);
    }
    setzeFfEpoche(1000);
  }
  pruefe(geprueft === 360, `${geprueft} Überlaufstellen geprüft`);
});

laufeTests('Epochenzähler').then(ok => process.exit(ok ? 0 : 1));
