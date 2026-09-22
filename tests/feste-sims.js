/* mctsFixedSims — feste Simulationszahl statt Zeitbudget.

   Anlass: ab-harness.js verspricht in seiner eigenen Hilfe „identischer Seed
   erzeugt identische Züge". Das stimmte nicht. Zwei Läufe mit --seed 2026 und
   identischer Konfiguration endeten 2:0 und 1:1 — weil --budget eine ZEIT ist
   und die Zahl der Simulationen damit an der Maschinenlast hängt. Derselbe
   Seed verbraucht dann unterschiedlich viele Zufallszahlen, und die Partien
   laufen auseinander.

   Praktische Folge: eine Identitätskontrolle war unmöglich. Genau die aber
   braucht eine Dosisreihe, damit ein Arm belegen kann, dass er die
   unveränderte Engine spielt statt eine mitgeänderte.

   Geprüft wird hier beides: dass der Regler bei 0 den Zeitpfad unangetastet
   lässt, und dass er über 0 exakt zählt und reproduziert. */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen.js');

const api = ladeKI({mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, getLegalMoves, mctsPUCT} = api;

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  try { return fn(); } finally { for (const k of Object.keys(alt)) PARAMS[k] = alt[k]; }
}

/* mulberry32 wie in ab-harness.js — damit zwei Suchen denselben Zufallsstrom
   sehen und ein Unterschied nur aus dem Regler stammen kann. */
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mitSeed(seed, fn) {
  const echt = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = echt; }
}

/* Eine Stellung mit ein paar Steinen, damit die Suche etwas zu tun hat.
   Bewusst klein gehalten: dieser Test misst den Regler, nicht die Engine. */
function stellung() {
  const board = new Uint8Array(BOARD_SIZE);
  const zuege = [[3,3,1],[15,15,2],[3,15,1],[15,3,2],[9,9,1],[9,3,2],[3,9,1],[15,9,2]];
  for (const [x, y, c] of zuege) board[idx(x, y)] = c;
  return board;
}
function suche(board, aiColor) {
  const legal = getLegalMoves(board, aiColor, new Set(), null);
  const scored = legal.map(m => ({m, score: 1000 - m.idx}));   /* fester Prior */
  return mctsPUCT(board, aiColor, {1: 0, 2: 0}, scored, null);
}

test('Über 0 läuft die Suche genau so oft, wie der Regler sagt', () => {
  const board = stellung();
  for (const n of [40, 120, 300]) {
    const r = mit({mctsFixedSims: n}, () => suche(board, 2));
    pruefe(r !== null, `Suche mit ${n} Sims liefert einen Zug`);
    pruefeGleich(r.sims, n, `Simulationen bei mctsFixedSims = ${n}`);
  }
});

test('Über 0 entscheidet nicht mehr die Uhr', () => {
  /* Bei festen Sims darf das Zeitbudget die Zahl nicht mehr bewegen — sonst
     wäre der Regler wirkungslos und jede Reproduzierbarkeit Zufall. */
  const board = stellung();
  const klein = mit({mctsFixedSims: 150, aiTimeBudget: 1, adaptiveBudgetEnabled: 0},
                    () => suche(board, 2));
  const gross = mit({mctsFixedSims: 150, aiTimeBudget: 5000, adaptiveBudgetEnabled: 0},
                    () => suche(board, 2));
  pruefeGleich(klein.sims, 150, 'Sims bei aiTimeBudget = 1');
  pruefeGleich(gross.sims, 150, 'Sims bei aiTimeBudget = 5000');
});

test('Bei 0 entscheidet weiterhin die Uhr', () => {
  /* Die Gegenprobe. Ohne sie könnte der Regler versehentlich immer greifen
     und der Auslieferungszustand wäre still mitgeändert. */
  const board = stellung();
  const kurz = mit({mctsFixedSims: 0, aiTimeBudget: 15, adaptiveBudgetEnabled: 0},
                   () => suche(board, 2));
  const lang = mit({mctsFixedSims: 0, aiTimeBudget: 220, adaptiveBudgetEnabled: 0},
                   () => suche(board, 2));
  pruefe(lang.sims > kurz.sims * 2,
    `mehr Zeit muss mehr Simulationen geben: ${kurz.sims} gegen ${lang.sims}`);
});

test('Gleicher Seed, gleiche feste Sims — Zug für Zug dasselbe Ergebnis', () => {
  const board = stellung();
  const a = mitSeed(2026, () => mit({mctsFixedSims: 200}, () => suche(board, 2)));
  const b = mitSeed(2026, () => mit({mctsFixedSims: 200}, () => suche(board, 2)));
  pruefeGleich(a.m.idx, b.m.idx, 'gewählter Zug');
  pruefeGleich(a.sims, b.sims, 'Simulationen');
  pruefeGleich(a.share, b.share, 'Besuchsanteil');
  pruefe(Object.is(a.q, b.q), `Q: ${a.q} gegen ${b.q}`);
});

test('Ein anderer Seed liefert ein anderes Ergebnis — der Test misst wirklich', () => {
  /* Ohne diese Gegenprobe würde der Test oben auch dann bestehen, wenn die
     Suche gar nicht vom Zufall abhinge und jeder Vergleich trivial wäre. */
  const board = stellung();
  const a = mitSeed(2026, () => mit({mctsFixedSims: 200}, () => suche(board, 2)));
  const b = mitSeed(4711, () => mit({mctsFixedSims: 200}, () => suche(board, 2)));
  pruefe(a.m.idx !== b.m.idx || !Object.is(a.q, b.q),
    'zwei Seeds müssen sich unterscheiden, sonst ist der Zufall nicht im Spiel');
});

test('Bei der Obergrenze 20000 sind beide Pfade derselbe Pfad', () => {
  /* Die exakte Neutralitätsprüfung. Ohne Zeitdruck (riesiges Budget) endet
     der Zeitpfad bei der eingebauten Obergrenze 20000 — dieselbe Zahl, die
     mctsFixedSims = 20000 setzt. Bei gleichem Seed müssen beide Wege Zug,
     Besuche und Q bitgenau gleich herausgeben; täte der Regler irgendetwas
     anderes als die Schleifengrenze zu tauschen, bräche das hier.

     Gerechnet auf einem fast vollen Brett: eine einzige weiße Kette mit
     zwölf Freiheiten. Wenige Kandidaten, billige Rollouts — 20000
     Simulationen bleiben damit bezahlbar. Kein Schachbrett: lauter
     Einzelsteine hätten keine Freiheiten und würden sich schlagen. */
  const board = new Uint8Array(BOARD_SIZE);
  board.fill(2);
  for (let k = 0; k < 12; k++) board[idx((k * 5) % 19, (k * 7) % 19)] = 0;
  const legal = getLegalMoves(board, 2, new Set(), null);
  pruefeGleich(legal.length, 12, 'legale Züge auf dem Prüfbrett');

  const zeitpfad = mitSeed(99, () => mit(
    {mctsFixedSims: 0, aiTimeBudget: 3600000, adaptiveBudgetEnabled: 0},
    () => suche(board, 2)));
  const festpfad = mitSeed(99, () => mit(
    {mctsFixedSims: 20000},
    () => suche(board, 2)));
  pruefeGleich(zeitpfad.sims, 20000, 'Zeitpfad läuft bis zur Obergrenze');
  pruefeGleich(festpfad.sims, 20000, 'fester Pfad läuft bis zur selben Zahl');
  pruefeGleich(zeitpfad.m.idx, festpfad.m.idx, 'gewählter Zug beider Pfade');
  pruefeGleich(zeitpfad.share, festpfad.share, 'Besuchsanteil beider Pfade');
  pruefe(Object.is(zeitpfad.q, festpfad.q), `Q: ${zeitpfad.q} gegen ${festpfad.q}`);
});

if (require.main === module)
  laufeTests('Feste Simulationszahl (mctsFixedSims)').then(ok => process.exit(ok ? 0 : 1));
