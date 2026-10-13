/* Ko in der Suche (Code-Review vom 13.10., Punkt 1).

   Vorher klappte mctsPUCT jede Stellung im Baum mit getLegalMoves(…, null)
   auf, also ohne Ko-Punkt: Der sofortige Ko-Rückschlag stand unter den
   Kindern. Und der Rollout am Blatt bekam den Ko-Punkt der Wurzel statt den
   der Blattstellung.

   Stellung (Mitte des Bretts, x = Spalte, y = Zeile):
          x: 7 8 9 10
         y8: . B W .
         y9: B W . W
        y10: . B W .
   Schwarz spielt (9,9) und schlägt den weißen Stein (8,9). Danach ist (8,9)
   für Weiß verboten (Ko).

     1. koNachZug liefert nach diesem Schlag den Punkt (8,9).
     2. In der Suche (einziger Wurzelkandidat: der Schlag) bekommt die
        Expansion der weißen Antwort und der Rollout dort den Ko-Punkt
        (8,9), und unter Weiß' Antworten steht der Rückschlag nicht.

   Aufruf:  node tests/ko-suche.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, removeDeadGroups} = KI;
const N = BOARD_SIZE, i = (x, y) => y * 19 + x;

function stellung() {
  const b = new Uint8Array(N);
  for (const [x, y] of [[8, 8], [7, 9], [8, 10]]) b[i(x, y)] = 1;
  for (const [x, y] of [[9, 8], [8, 9], [10, 9], [9, 10]]) b[i(x, y)] = 2;
  return b;
}

test('koNachZug: nach dem Schlag auf (9,9) ist (8,9) Ko', () => {
  const b = stellung();
  b[i(9, 9)] = 1;
  const cap = removeDeadGroups(b, 2, i(9, 9));
  pruefeGleich(cap, 1, 'ein Stein geschlagen');
  pruefeGleich(globalThis.koNachZug(b, i(9, 9), cap), i(8, 9), 'Ko-Punkt');
  pruefeGleich(globalThis.koNachZug(b, i(9, 9), 0), null, 'ohne Schlag kein Ko');
});

test('Suche: Expansion und Rollout nach dem Ko-Schlag kennen den Ko-Punkt', () => {
  const b = stellung(), schlag = i(9, 9), ko = i(8, 9);
  const nachSchlag = new Uint8Array(b); nachSchlag[schlag] = 1; removeDeadGroups(nachSchlag, 2, schlag);
  const gleich = (x, y) => x.length === y.length && x.every((v, k) => v === y[k]);
  const echtGL = globalThis.getLegalMoves, echtRO = globalThis.rollout;
  const expansionen = [], rollouts = [];
  globalThis.getLegalMoves = function (board, color, hist, koPoint, dl) {
    const r = echtGL(board, color, hist, koPoint, dl);
    if (color === 2 && gleich(board, nachSchlag)) expansionen.push({koPoint, rueckschlag: r.some(m => m.idx === ko)});
    return r;
  };
  globalThis.rollout = function (board, startColor, hist, caps, depth, rootColor, koPoint, dl) {
    if (startColor === 2 && gleich(board, nachSchlag)) rollouts.push(koPoint);
    return echtRO(board, startColor, hist, caps, depth, rootColor, koPoint, dl);
  };
  const alt = {};
  for (const [k, v] of Object.entries({mctsFixedSims: 40, mctsTreeReuse: 0, adaptiveBudgetEnabled: 0})) { alt[k] = PARAMS[k]; PARAMS[k] = v; }
  let seed = 3; const zr = Math.random;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  try {
    globalThis.mctsPUCT(b, 1, {1: 0, 2: 0}, [{m: {x: 9, y: 9, idx: schlag}, score: 1}], null);
  } finally {
    globalThis.getLegalMoves = echtGL; globalThis.rollout = echtRO; Math.random = zr;
    Object.assign(PARAMS, alt);
  }
  pruefe(rollouts.length > 0, 'Rollout nach dem Schlag aufgerufen');
  pruefe(rollouts.every(k => k === ko), `Rollout bekommt den Ko-Punkt (${rollouts})`);
  pruefe(expansionen.length > 0, 'Antworten von Weiß aufgeklappt');
  pruefe(expansionen.every(e => e.koPoint === ko && !e.rueckschlag), `Expansion mit Ko, ohne Rückschlag (${JSON.stringify(expansionen)})`);
});

laufeTests('Ko in der Suche').then(ok => process.exit(ok ? 0 : 1));
