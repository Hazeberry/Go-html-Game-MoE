/* Frische Wurzel bei Tree-Reuse (wurzelFrisch; docs/wurzel-frisch.md).

     1. Default 1 (gemessen, docs/wurzel-frisch.md §6).
     2. Der Wächter zählt Suchen und übernommene Teilbäume: Nach einem
        eigenen Zug und einer gegnerischen Antwort, die die Suche schon
        untersucht hatte, übernimmt die nächste Suche den Teilbaum.
     3. Mit wurzelFrisch 1 wird die Wurzel neu gebildet: Höchstens so viele
        alte Kinder werden übernommen oder verworfen, wie der alte Knoten
        hatte (mctsChildren), und keines bei 0.

   Aufruf:  node tests/wurzel.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, getAIMove, removeDeadGroups, computeZobrist, leseWurzelWaechter} = KI;
const P = (x, y) => y * 19 + x;

function mitZufall(seed, fn) {
  const r = Math.random;
  let s = seed;
  Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  try { return fn(); } finally { Math.random = r; }
}
function setze(b, i, f) { b[i] = f; removeDeadGroups(b, 3 - f, i); }

/* Eigener Zug (Schwarz), dann eine weiße Antwort, dann wieder Schwarz.
   Liefert den Wächter der zweiten Suche, sobald eine Antwort den Teilbaum
   trifft; probiert dafür die Antworten der Reihe nach. Übernommen wird nur
   ein Antwortknoten, den die erste Suche mindestens zweimal besucht und
   damit expandiert hat. */
function zweiteSuche(werte) {
  const alt = {};
  const p = {mctsFixedSims: 300, adaptiveBudgetEnabled: 0, mctsTreeReuse: 1, ...werte};
  for (const k of Object.keys(p)) { alt[k] = PARAMS[k]; PARAMS[k] = p[k]; }
  try {
    const start = new Uint8Array(BOARD_SIZE);
    /* Weiße Kette aus vier Steinen im Atari: Der Schlag bündelt die Besuche,
       sodass die Antworten darauf in der Suche expandiert werden. */
    for (const [x, y, f] of [[3, 3, 1], [15, 15, 1], [3, 15, 2], [15, 3, 2],
                             [9, 9, 2], [10, 9, 2], [9, 10, 2], [10, 10, 2],
                             [8, 9, 1], [8, 10, 1], [9, 8, 1], [10, 8, 1], [11, 9, 1], [11, 10, 1], [9, 11, 1]]) setze(start, P(x, y), f);
    for (let antwort = 0; antwort < BOARD_SIZE; antwort++) {
      const b = new Uint8Array(start);
      const r1 = mitZufall(11, () => getAIMove(new Uint8Array(b), 1, [computeZobrist(b)], {1: 0, 2: 0}, 6, 'hard', 1, null, null));
      const i1 = r1.y * 19 + r1.x;
      setze(b, i1, 1);
      if (b[antwort]) continue;
      setze(b, antwort, 2);
      leseWurzelWaechter(true);
      mitZufall(12, () => getAIMove(new Uint8Array(b), 1, [computeZobrist(b)], {1: 0, 2: 0}, 8, 'hard', 1, null, antwort));
      const w = leseWurzelWaechter(true);
      if (w.wieder) return w;
    }
    return null;
  } finally { Object.assign(PARAMS, alt); }
}

test('Default wurzelFrisch 1', () => {
  pruefeGleich(PARAMS.wurzelFrisch, 1, 'Default');
});

test('Wächter: übernommener Teilbaum wird gezählt; bei 0 nichts übernommen oder verworfen', () => {
  const w = zweiteSuche({wurzelFrisch: 0});
  pruefe(w !== null, 'eine Antwort trifft den Teilbaum');
  pruefeGleich(w.suchen, 1, 'eine Suche');
  pruefeGleich(w.wieder, 1, 'mit übernommenem Teilbaum');
  pruefeGleich(w.uebernommen + w.verworfen, 0, 'ohne frische Wurzel keine Umbildung');
});

test('wurzelFrisch 1: Wurzel neu gebildet, alte Kinder übernommen oder verworfen', () => {
  const w = zweiteSuche({wurzelFrisch: 1});
  pruefe(w !== null, 'eine Antwort trifft den Teilbaum');
  pruefeGleich(w.wieder, 1, 'mit übernommenem Teilbaum');
  const alt = w.uebernommen + w.verworfen;
  pruefe(alt >= 1 && alt <= PARAMS.mctsChildren, `alte Kinder 1–${PARAMS.mctsChildren}: ${alt}`);
  pruefe(w.uebernommen <= PARAMS.mctsRootChildren, 'höchstens so viele übernommen wie Wurzelkinder');
});

laufeTests('Frische Wurzel (wurzelFrisch)').then(ok => process.exit(ok ? 0 : 1));
