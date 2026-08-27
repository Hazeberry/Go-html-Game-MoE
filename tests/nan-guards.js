/* Regressionstest zum NaN-Bug in mctsPUCT (PR #49).

   Der Fehler: ein divergiertes Policy-Netz lieferte nicht-finite Priors,
   ein einzelnes NaN vergiftete über die Softmax in _mctsKids die Priors
   ALLER Kinder eines Knotens, und weil `NaN > -Infinity` false ist, blieb
   die PUCT-Auswahl auf `best === null` stehen — TypeError auf best.idx,
   im Worker wie im synchronen Fallback, also bei jedem KI-Zug.

   Geprüft wird beides: dass kein NaN mehr in den Baum gelangt (Ebene 1)
   und dass gar keins mehr entsteht (Ebene 2).

   Aufruf:  node tests/nan-guards.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, pruefeNah, pruefeFinit, laufeTests}
  = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined});
const {mctsKids, mctsPUCT, PARAMS, BOARD_SIZE, netz} = KI;

const summe = a => a.reduce((x, y) => x + y, 0);
function liste(scores) {
  return scores.map((s, r) => ({m: {idx: r, x: r % 19, y: (r / 19) | 0}, score: s}));
}

/* ══ Ebene 1: kein NaN gelangt in den Baum ══════════════════════════ */

test('_mctsKids: ein NaN unter finiten Scores vergiftet die anderen nicht', () => {
  PARAMS.mctsPriorSharp = 3;
  const scores = [100, 93, 86, NaN, 72, 65, 58, 51];
  const kids = mctsKids(liste(scores), 8);
  const P = kids.map(k => k.P);
  pruefeFinit(P, 'alle Priors finit');
  pruefeNah(summe(P), 1, 1e-9, 'Priors summieren zu 1');
  /* Der NaN-Kandidat wird auf den kleinsten finiten Score gezogen: er bleibt
     wählbar, bestimmt aber nichts. Der letzte Eintrag HAT diesen Score. */
  pruefeNah(P[3], P[7], 1e-12, 'NaN-Kandidat bekommt den Prior des schlechtesten finiten');
  pruefe(P[0] > P[3], 'der beste Kandidat führt weiterhin');
});

test('_mctsKids: auch Infinity und -Infinity werden abgefangen', () => {
  PARAMS.mctsPriorSharp = 3;
  const kids = mctsKids(liste([50, Infinity, 30, -Infinity, 10]), 5);
  const P = kids.map(k => k.P);
  pruefeFinit(P, 'alle Priors finit');
  pruefeNah(summe(P), 1, 1e-9, 'Priors summieren zu 1');
});

test('_mctsKids: sind ALLE Scores NaN, greift der Rang-Prior', () => {
  PARAMS.mctsPriorSharp = 3;
  const n = 6;
  const kids = mctsKids(liste(new Array(n).fill(NaN)), n);
  const P = kids.map(k => k.P);
  pruefeFinit(P, 'alle Priors finit');
  pruefeNah(summe(P), 1, 1e-9, 'Priors summieren zu 1');
  const sum = n * (n + 1) / 2;
  for (let r = 0; r < n; r++)
    pruefeNah(P[r], (n - r) / sum, 1e-12, `Rang-Prior an Stelle ${r}`);
});

test('_mctsKids: der Rang-Zweig (sharp = 0) blieb unverändert', () => {
  PARAMS.mctsPriorSharp = 0;
  const n = 7;
  const kids = mctsKids(liste([70, 60, 50, 40, 30, 20, 10]), n);
  const sum = n * (n + 1) / 2;
  for (let r = 0; r < n; r++)
    pruefeNah(kids[r].P, (n - r) / sum, 1e-12, `Rang-Prior an Stelle ${r}`);
  PARAMS.mctsPriorSharp = 3;
});

test('_mctsKids: gleiche Scores entarten die Softmax nicht', () => {
  PARAMS.mctsPriorSharp = 3;
  const kids = mctsKids(liste([42, 42, 42, 42]), 4);
  const P = kids.map(k => k.P);
  pruefeFinit(P, 'alle Priors finit');
  pruefeNah(summe(P), 1, 1e-9, 'Priors summieren zu 1');
});

test('mctsPUCT: eine Wurzelliste aus lauter NaN liefert einen Zug statt eines Crashs', () => {
  /* Genau der gemeldete Fall. Vor dem Fix:
     TypeError: Cannot read properties of null (reading 'idx') */
  PARAMS.useMCTS = 1;
  PARAMS.aiTimeBudget = 150;
  const brett = new Uint8Array(BOARD_SIZE);
  brett[180] = 1; brett[181] = 2;
  const legal = KI.getLegalMoves(brett, 1, new Set(), null).slice(0, 12);
  const wurzel = legal.map(m => ({m, score: NaN}));

  const r = mctsPUCT(brett, 1, {1: 0, 2: 0}, wurzel, null);
  pruefe(r !== null, 'mctsPUCT liefert ein Ergebnis');
  pruefe(r.m && Number.isInteger(r.m.idx), 'das Ergebnis nennt einen Zug');
  pruefe(brett[r.m.idx] === 0, 'der Zug liegt auf einem freien Punkt');
  pruefe(r.sims > 0, 'es wurde wirklich gesucht');
});

/* ══ Ebene 2: es entsteht gar kein NaN mehr ═════════════════════════ */

test('forward(): divergierte Gewichte legen das Netz still statt NaN zu liefern', () => {
  netz.W1.fill(1e20); netz.W2.fill(1e20);
  netz.gamesPlayed = 12; netz._healthy = true;
  PARAMS.netMaxBlend = 0.09;

  const brett = new Uint8Array(361);
  const stille = console.error; console.error = () => {};   /* die Diagnose ist beabsichtigt */
  const r = netz.forward(netz.boardToInput(brett, 1, null, null));
  console.error = stille;

  pruefeFinit(r.probs, 'Wahrscheinlichkeiten finit');
  pruefeGleich(r.hidden, null, 'hidden ist null (Stichprobe untrainierbar)');
  pruefeGleich(netz._healthy, false, 'das Netz meldet sich als krank');
  pruefeGleich(netz.blendWeight, 0, 'blendWeight fällt auf 0 — das Netz steuert nicht mehr');
});

test('save(): nicht-finite Gewichte werden nicht persistiert', () => {
  netz.reset();
  netz.ablage = KI.ablage;
  KI.ablage.delete('go_pnet');
  netz.W1[0] = NaN;
  const stille = console.error; console.error = () => {};
  const ok = netz.save();
  console.error = stille;
  pruefeGleich(ok, false, 'save() lehnt ab');
  pruefeGleich(KI.ablage.get('go_pnet'), undefined, 'nichts in localStorage geschrieben');
});

test('load(): ein vergifteter localStorage-Stand wird verworfen (Selbstheilung)', () => {
  netz.reset();                       /* schreibt einen gültigen Stand */
  const gut = KI.ablage.get('go_pnet');
  pruefe(typeof gut === 'string' && gut.length > 0, 'gültiger Stand liegt vor');

  /* Denselben Stand mit NaN-Gewichten nachbauen */
  const d = JSON.parse(gut);
  const kaputt = new Float32Array(netz.HID * netz.IN).fill(NaN);
  const enc = a => {
    const u = new Uint8Array(a.buffer); let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return Buffer.from(s, 'binary').toString('base64');
  };
  d.W1 = enc(kaputt); d.games = 12; d.wins = 6;
  KI.ablage.set('go_pnet', JSON.stringify(d));

  const stille = console.warn; console.warn = () => {};
  const geladen = netz.load();
  console.warn = stille;
  pruefeGleich(geladen, false, 'load() verwirft den Stand');
});

test('_backward(): kaputte Stichproben werden übersprungen, nicht eingerechnet', () => {
  netz.reset();
  const inp    = netz.boardToInput(new Uint8Array(361), 1, null, null);
  const hidden = new Float32Array(netz.HID).fill(0.5);
  const probs  = new Float32Array(netz.OUT).fill(1 / netz.OUT);

  pruefeGleich(netz._backward(inp, null,   probs, 5,  1), false, 'hidden = null → übersprungen');
  pruefeGleich(netz._backward(inp, hidden, probs, 5, NaN), false, 'Reward NaN → übersprungen');
  const kaputt = new Float32Array(netz.OUT).fill(1 / netz.OUT); kaputt[7] = NaN;
  pruefeGleich(netz._backward(inp, hidden, kaputt, 5, 1), false, 'probs mit NaN → übersprungen');
  const kaputtH = new Float32Array(netz.HID).fill(0.5); kaputtH[3] = Infinity;
  pruefeGleich(netz._backward(inp, kaputtH, probs, 5, 1), false, 'hidden mit Infinity → übersprungen');
  pruefeGleich(netz._backward(inp, hidden, probs, 5, 1),  true,  'gesunde Stichprobe wird gelernt');
  pruefeFinit(netz.W2, 'W2 nach dem Schritt finit');
});

test('trainGame(): ein divergierter Stand wird zurückgerollt statt gespeichert', () => {
  netz.reset();                       /* gültiger Stand liegt in localStorage */
  const vorher = KI.ablage.get('go_pnet');
  netz.gamesPlayed = 5; netz.wins = 3;

  const inp    = netz.boardToInput(new Uint8Array(361), 1, null, null);
  const hidden = new Float32Array(netz.HID).fill(0.5);
  const probs  = new Float32Array(netz.OUT).fill(1 / netz.OUT);
  netz._gameBuffer = [{inp, probs, hidden, moveIdx: 5}];
  netz.W1[0] = NaN;                   /* Divergenz simulieren */

  const sE = console.error, sW = console.warn, sL = console.log;
  console.error = console.warn = console.log = () => {};
  netz.trainGame(1);
  console.error = sE; console.warn = sW; console.log = sL;

  pruefeFinit(netz.W1, 'W1 nach dem Rollback finit');
  pruefeGleich(KI.ablage.get('go_pnet'), vorher, 'localStorage blieb auf dem letzten gültigen Stand');
  pruefeGleich(netz._gameBuffer.length, 0, 'der Buffer wurde geleert');
});

test('Gradienten-Deckel und Max-Norm stehen an', () => {
  /* Der Bug entstand mit netGradClip = 0 (gab es damals nicht). Wer die
     Werte auf 0 stellt, schaltet den Schutz ab — dann soll wenigstens
     dieser Test daran erinnern. */
  pruefe(PARAMS.netGradClip  > 0, 'netGradClip ist gesetzt');
  pruefe(PARAMS.netMaxNorm   > 0, 'netMaxNorm ist gesetzt');
  pruefe(PARAMS.netWeightDecay >= 0, 'netWeightDecay ist definiert');
});

laufeTests('NaN-Schutz in MCTS/PUCT und Policy-Netz')
  .then(ok => process.exit(ok ? 0 : 1));
