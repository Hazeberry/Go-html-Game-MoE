/* Taktischer Leser (leseAngriff, leseVerteidigung; docs/laufkampf-lesen.md).

     1. Leiter ohne Brecher: gefangen. Schwarz am Zug rettet sich.
     2. Leiter mit Brechern auf beiden möglichen Wegen: nicht gefangen.
        Mit nur einem Brecher läuft die Leiter in die andere Richtung.
     3. Ketten mit vier und mehr Freiheiten gelten als nicht fangbar.
     4. Atari: im Freien rettbar, in der Ecke nicht.
     5. leseRettung: Default 0; mit 1 spielt die KI einen Zug, nach dem ihre
        fangbare Kette nicht mehr fangbar ist, ohne den Schalter nicht.
     6. vergeblicherZug (leseVerzicht, docs/endspiel-verlust.md): Selbstatari
        in der Ecke ist vergeblich; ein freier Zug, der rettende Ausbruch aus
        der Leiter und der Snapback-Einwurf (gibt Atari) sind es nicht.

   Aufruf:  node tests/lesen.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, PARAMS, getAIMove, removeDeadGroups, leseAngriff, leseVerteidigung, vergeblicherZug} = KI;
const P = (x, y) => y * 19 + x;
function brett(steine) {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of steine) b[P(x, y)] = f;
  return b;
}
/* Schwarz (5,5), Weiß links, oben und diagonal unten rechts. Weiß am Zug
   kann nach unten links (über 2,9) oder nach oben rechts (über 9,2) leitern. */
const LEITER = [[5, 5, 1], [4, 5, 2], [5, 4, 2], [6, 6, 2]];

test('Leiter ohne Brecher: gefangen; Schwarz am Zug rettet', () => {
  const b = brett(LEITER);
  const a = leseAngriff(b, P(5, 5));
  pruefe(a.ja && !a.offen, `gefangen, gesichert (${JSON.stringify(a)})`);
  pruefe(leseVerteidigung(b, P(5, 5)).ja, 'Verteidiger am Zug: rettbar');
});

test('Leiterbrecher: nur auf beiden Wegen zugleich wirksam', () => {
  pruefe(leseAngriff(brett([...LEITER, [2, 9, 1]]), P(5, 5)).ja, 'Brecher nur unten links: andere Richtung fängt');
  pruefe(leseAngriff(brett([...LEITER, [9, 2, 1]]), P(5, 5)).ja, 'Brecher nur oben rechts: andere Richtung fängt');
  pruefe(!leseAngriff(brett([...LEITER, [2, 9, 1], [9, 2, 1]]), P(5, 5)).ja, 'beide Wege gebrochen: nicht gefangen');
});

test('Vier und mehr Freiheiten: nicht fangbar', () => {
  const a = leseAngriff(brett([[9, 9, 1], [9, 10, 1]]), P(9, 9));
  pruefe(!a.ja && !a.offen, 'sechs Freiheiten, sofort entschieden');
});

test('Atari: im Freien rettbar, in der Ecke nicht', () => {
  pruefe(leseVerteidigung(brett([[9, 9, 1], [8, 9, 2], [10, 9, 2], [9, 8, 2]]), P(9, 9)).ja, 'im Freien');
  pruefe(!leseVerteidigung(brett([[0, 0, 1], [1, 0, 2], [0, 2, 2], [1, 1, 2]]), P(0, 0)).ja, 'Ecke');
  pruefeGleich(leseAngriff(brett([[0, 0, 1], [1, 0, 2], [0, 2, 2], [1, 1, 2]]), P(0, 0)).ja, true, 'Ecke: Angreifer fängt');
});

test('leseRettung: Default 0; mit 1 wird die fangbare Kette gerettet', () => {
  pruefeGleich(PARAMS.leseRettung, 0, 'Default');
  const b = brett([[5, 5, 1], [5, 6, 1], [4, 5, 2], [5, 4, 2], [6, 6, 2], [4, 6, 2],
                   [15, 15, 1], [3, 15, 2], [15, 3, 2], [3, 3, 1]]);
  pruefe(leseAngriff(b, P(5, 5)).ja, 'Ausgangslage: schwarze Kette fangbar');
  const ergebnis = stufe => {
    const alt = {}; for (const k of ['mctsFixedSims', 'adaptiveBudgetEnabled', 'mctsTreeReuse', 'leseRettung']) alt[k] = PARAMS[k];
    let seed = 7; const r0 = Math.random;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    Object.assign(PARAMS, {mctsFixedSims: 60, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, leseRettung: stufe});
    try {
      const r = getAIMove(b, 1, [], {1: 0, 2: 0}, 40, 'hard', 1, null, null);
      const nb = new Uint8Array(b), i = r.y * 19 + r.x;
      nb[i] = 1; removeDeadGroups(nb, 2, i);
      return leseAngriff(nb, P(5, 5)).ja;
    } finally { Object.assign(PARAMS, alt); Math.random = r0; }
  };
  pruefe(ergebnis(0), 'ohne Schalter: Kette bleibt fangbar');
  pruefe(!ergebnis(1), 'mit Schalter: Kette danach nicht mehr fangbar');
});

test('vergeblicherZug: Selbstatari ja; freier Zug, Ausbruch, Einwurf nein; leseVerzicht Default 1', () => {
  pruefeGleich(PARAMS.leseVerzicht, 1, 'Default (gemessen, docs/endspiel-verlust.md §6)');
  const ecke = brett([[1, 0, 2], [1, 1, 2], [0, 2, 2]]);
  pruefe(vergeblicherZug(ecke, P(0, 0), 1), 'Ecke (0,0): Selbstatari');
  pruefe(vergeblicherZug(ecke, P(0, 1), 1), 'Ecke (0,1): Selbstatari');
  pruefe(!vergeblicherZug(brett(LEITER), P(15, 15), 1), 'freier Zug');
  pruefe(!vergeblicherZug(brett(LEITER), P(6, 5), 1), 'Ausbruch aus der Leiterstellung (Schwarz am Zug rettet)');
  const snap = brett([[0, 0, 2], [0, 1, 2], [1, 1, 2], [2, 1, 2], [0, 2, 1], [1, 2, 1], [2, 2, 1], [3, 1, 1], [3, 0, 1]]);
  pruefe(!vergeblicherZug(snap, P(1, 0), 1), 'Snapback-Einwurf gibt Atari');
  const vorher = new Uint8Array(ecke);
  vergeblicherZug(ecke, P(0, 0), 1);
  pruefe(ecke.every((v, k) => v === vorher[k]), 'Brett unverändert');
});

laufeTests('Taktischer Leser (docs/laufkampf-lesen.md)').then(ok => process.exit(ok ? 0 : 1));
