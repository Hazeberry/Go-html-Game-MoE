/* Regeln und Grundformen an festen Stellungen.

     1. Selbstmord: ein Stein oder eine Kette ohne Freiheit und ohne Schlag
        ist illegal; ein Zug ohne Freiheit, der schlägt, ist legal.
     2. Ko: der sofortige Rückschlag ist über den Ko-Punkt verboten.
     3. Superko: derselbe Rückschlag ist auch ohne Ko-Punkt verboten, wenn
        die entstehende Stellung im Verlauf steht. Nach einer Ko-Drohung
        woanders ist er wieder legal, weil die Stellung eine andere ist.
     4. Snapback: Der Einwurf wird geschlagen, danach schlägt Schwarz auf
        demselben Punkt fünf Steine. Kein Ko, die KI spielt den Schlag.
     5. Seki: Benson nennt keine der beiden inneren Ketten lebend oder tot,
        auch die äußere Mauer nicht. Zum Vergleich eine Gruppe mit zwei
        echten Augen: lebend, und ein Stein in ihr Auge wäre todgeboren.

   Aufruf:  node tests/regeln.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, PARAMS, getLegalMoves, getAIMove, removeDeadGroups, computeZobrist,
       bensonClassify, _bnAlive, _bnDead, _bnBornDead} = KI;
const P = (x, y) => y * 19 + x;
const S = 1, W = 2;

function brett(steine) {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of steine) b[P(x, y)] = f;
  return b;
}
/* Zug ausführen wie im Spiel: setzen, gegnerische Ketten ohne Freiheit
   entfernen. Gibt die Zahl der geschlagenen Steine zurück. */
function ziehe(b, x, y, f) {
  b[P(x, y)] = f;
  return removeDeadGroups(b, f === S ? W : S, P(x, y));
}
const legal = (b, f, verlauf, ko) => new Set(getLegalMoves(b, f, verlauf, ko).map(m => m.idx));

/* Hard-KI mit fester Simulationszahl und festem Zufall; Parameter danach
   zurück. */
function kiZug(b, f, verlauf, ko) {
  const alt = {};
  for (const k of ['mctsFixedSims', 'adaptiveBudgetEnabled', 'mctsTreeReuse']) alt[k] = PARAMS[k];
  let seed = 11; const r0 = Math.random;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  Object.assign(PARAMS, {mctsFixedSims: 60, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0});
  try { return getAIMove(b, f, verlauf, {1: 0, 2: 0}, 40, 'hard', 1, ko, null); }
  finally { Object.assign(PARAMS, alt); Math.random = r0; }
}

test('Selbstmord ist illegal, Schlagen ohne eigene Freiheit nicht', () => {
  const einzel = brett([[9, 8, W], [8, 9, W], [10, 9, W], [9, 10, W]]);
  pruefe(!legal(einzel, S, null, null).has(P(9, 9)), 'Einzelstein ohne Freiheit');
  const kette = brett([[1, 0, S], [2, 0, W], [1, 1, W], [0, 1, W]]);
  pruefe(!legal(kette, S, null, null).has(P(0, 0)), 'eigene Kette auf null Freiheiten');
  pruefe(legal(kette, W, null, null).has(P(0, 0)), 'Weiß darf dort schlagen');
  ziehe(kette, 0, 0, W);
  pruefeGleich(kette[P(1, 0)], 0, 'der schwarze Stein ist geschlagen');
});

/* Ko um (5,5): Weiß (4,5) hat nur die Freiheit (5,5). Schwarz schlägt dort,
   danach hat der schwarze Stein nur die Freiheit (4,5). */
const KO = [[4, 4, S], [3, 5, S], [4, 6, S], [5, 4, W], [4, 5, W], [6, 5, W], [5, 6, W]];
function koNachSchlag() {
  const vorher = brett(KO);
  const nachher = new Uint8Array(vorher);
  pruefeGleich(ziehe(nachher, 5, 5, S), 1, 'Schwarz schlägt einen Stein');
  return {vorher, nachher};
}

test('Ko: der sofortige Rückschlag ist verboten', () => {
  const {nachher} = koNachSchlag();
  pruefe(legal(nachher, W, null, null).has(P(4, 5)), 'ohne Ko-Punkt und Verlauf legal (Regel greift sonst nirgends)');
  pruefe(!legal(nachher, W, null, P(4, 5)).has(P(4, 5)), 'mit Ko-Punkt verboten');
});

test('Superko: Rückschlag verboten, nach einer Ko-Drohung wieder legal', () => {
  const {vorher, nachher} = koNachSchlag();
  const verlauf = new Set([computeZobrist(new Uint8Array(BOARD_SIZE)), computeZobrist(vorher), computeZobrist(nachher)]);
  pruefe(!legal(nachher, W, verlauf, null).has(P(4, 5)), 'Stellung stand schon im Verlauf');
  const r = kiZug(nachher, W, [...verlauf], null);
  pruefe(r.type !== 'stone' || P(r.x, r.y) !== P(4, 5), `die KI spielt den verbotenen Rückschlag nicht (${JSON.stringify(r)})`);

  /* Weiß droht woanders, Schwarz antwortet: das Brett ist ein anderes. */
  const danach = new Uint8Array(nachher);
  ziehe(danach, 15, 15, W); verlauf.add(computeZobrist(danach));
  ziehe(danach, 15, 14, S); verlauf.add(computeZobrist(danach));
  pruefe(legal(danach, W, verlauf, null).has(P(4, 5)), 'nach Drohung und Antwort legal');
});

/* Snapback am oberen Rand: Weiß (0,0),(0,1),(1,1),(2,1) hat die Freiheiten
   (1,0) und (2,0). Schwarz wirft bei (1,0) ein, Weiß schlägt bei (2,0) und
   steht danach selbst mit fünf Steinen im Atari auf (1,0). */
const SNAP = [[0, 0, W], [0, 1, W], [1, 1, W], [2, 1, W],
              [0, 2, S], [1, 2, S], [2, 2, S], [3, 1, S], [3, 0, S]];

test('Snapback: Einwurf, Schlag, Rückschlag von fünf Steinen', () => {
  const b = brett(SNAP);
  pruefe(legal(b, S, null, null).has(P(1, 0)), 'Einwurf legal (eine Freiheit)');
  pruefeGleich(ziehe(b, 1, 0, S), 0, 'Einwurf schlägt nichts');
  pruefeGleich(ziehe(b, 2, 0, W), 1, 'Weiß schlägt den Einwurf');
  const h = computeZobrist(b);
  pruefe(legal(b, S, new Set([h]), null).has(P(1, 0)), 'Rückschlag legal, kein Ko');
  const r = kiZug(b, S, [h], null);
  pruefe(r.type === 'stone' && P(r.x, r.y) === P(1, 0), `die KI schlägt zurück (${JSON.stringify(r)})`);
  pruefeGleich(ziehe(b, 1, 0, S), 5, 'fünf weiße Steine geschlagen');
});

/* Seki an der oberen Kante: Weiß innen (2,1),(3,1), Schwarz drumherum,
   Weiß außen als Mauer. Beide inneren Ketten haben genau die gemeinsamen
   Freiheiten (2,0) und (3,0); wer zuerst dort spielt, verliert seine Kette. */
const SEKI = [
  [2, 1, W], [3, 1, W],
  [1, 0, S], [1, 1, S], [1, 2, S], [2, 2, S], [3, 2, S], [4, 2, S], [4, 1, S], [4, 0, S],
  [0, 0, W], [0, 1, W], [0, 2, W], [0, 3, W], [1, 3, W], [2, 3, W], [3, 3, W], [4, 3, W],
  [5, 3, W], [5, 2, W], [5, 1, W], [5, 0, W]];

test('Seki: Benson nennt keine Kette lebend oder tot', () => {
  const b = brett(SEKI);
  const e = bensonClassify(b);
  for (const [x, y] of SEKI) {
    pruefe(_bnAlive[P(x, y)] !== e, `(${x},${y}) nicht bedingungslos lebend`);
    pruefe(_bnDead[P(x, y)] !== e, `(${x},${y}) nicht beweisbar tot`);
  }
  for (const f of [S, W]) {
    const l = legal(b, f, null, null);
    pruefe(l.has(P(2, 0)) && l.has(P(3, 0)), `${f === S ? 'Schwarz' : 'Weiß'}: gemeinsame Freiheiten legal (Selbstatari, kein Selbstmord)`);
  }
  /* Wer zuerst füllt, verliert: Schwarz füllt (2,0), Weiß schlägt bei (3,0). */
  ziehe(b, 2, 0, S);
  pruefeGleich(ziehe(b, 3, 0, W), 9, 'Weiß schlägt die neun schwarzen Steine');
});

test('Zwei echte Augen: lebend, ein Stein ins Auge wäre todgeboren', () => {
  const b = brett([[1, 0, S], [0, 1, S], [1, 1, S], [2, 1, S], [3, 1, S], [3, 0, S]]);
  const e = bensonClassify(b);
  pruefeGleich(_bnAlive[P(1, 0)] === e, true, 'schwarze Kette lebt bedingungslos');
  pruefeGleich(_bnBornDead[W][P(0, 0)] === e, true, 'Weiß in (0,0): todgeboren');
  pruefeGleich(_bnBornDead[W][P(2, 0)] === e, true, 'Weiß in (2,0): todgeboren');
  pruefe(!legal(b, W, null, null).has(P(0, 0)), 'und ohnehin Selbstmord');
});

laufeTests('Regeln und Grundformen (Selbstmord, Ko, Superko, Snapback, Seki)');
