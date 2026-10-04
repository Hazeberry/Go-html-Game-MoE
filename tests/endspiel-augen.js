/* Augenschutz und Pass trotz unabwendbarem Gegnerzug (augenSchutz,
   passUnabwendbar; docs/endspiel-augen.md).

     1. fuelltEigenesAuge erkennt echte Augen: alle Nachbarn eigen,
        Diagonalen wie _diagIsTrueEye, keine angrenzende Kette im Atari.
     2. augenSchutz >= 1: Sind nur noch eigene Augen frei, passt die KI;
        bei 0 füllt sie eines.
     3. gegnerzugUnabwendbar: Kann ein eigener Zug den Gegnerzug verhindern,
        ist er abwendbar; sonst nicht.
     4. Die Stellung aus einer GNU-Go-Partie, in der GNU Go gepasst hat und
        die KI ihre Augen zu füllen begann: mit passUnabwendbar passt sie.
     Defaults seit §6: augenSchutz 2, passUnabwendbar 1. Die Prüfungen, die
     das alte Verhalten zeigen, setzen beide ausdrücklich auf 0.

   Aufruf:  node tests/endspiel-augen.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, getAIMove, fuelltEigenesAuge, gegnerzugUnabwendbar,
       removeDeadGroups, evaluateMove, buildCrisisMap, primeAreaCache, primeEndTieBreak} = KI;
const P = (x, y) => y * 19 + x;

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  const r = Math.random; Math.random = () => 0.5;
  try { return fn(); } finally { Object.assign(PARAMS, alt); Math.random = r; }
}
function brett(steine) {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of steine) b[P(x, y)] = f;
  return b;
}
const kreuz = (x, y, f) => [[x - 1, y, f], [x + 1, y, f], [x, y - 1, f], [x, y + 1, f]]
  .filter(([a, c]) => a >= 0 && a < 19 && c >= 0 && c < 19);

test('Defaults: augenSchutz 2, passUnabwendbar 1 (gemessen, docs/endspiel-augen.md §6)', () => {
  pruefeGleich(PARAMS.augenSchutz, 2, 'augenSchutz');
  pruefeGleich(PARAMS.passUnabwendbar, 1, 'passUnabwendbar');
});

test('fuelltEigenesAuge: echte, falsche und Atari-Augen', () => {
  let b = brett(kreuz(9, 9, 1));
  pruefe(fuelltEigenesAuge(b, P(9, 9), 1), 'Zentrum, Diagonalen leer: Auge');
  pruefe(!fuelltEigenesAuge(b, P(9, 9), 2), 'für den Gegner kein eigenes Auge');
  b = brett([...kreuz(9, 9, 1), [8, 8, 2]]);
  pruefe(fuelltEigenesAuge(b, P(9, 9), 1), 'eine gegnerische Diagonale im Zentrum: noch Auge');
  b = brett([...kreuz(9, 9, 1), [8, 8, 2], [10, 10, 2]]);
  pruefe(!fuelltEigenesAuge(b, P(9, 9), 1), 'zwei gegnerische Diagonalen: falsches Auge');
  b = brett(kreuz(0, 9, 1));
  pruefe(fuelltEigenesAuge(b, P(0, 9), 1), 'Rand, keine gegnerische Diagonale: Auge');
  b = brett([...kreuz(0, 9, 1), [1, 10, 2]]);
  pruefe(!fuelltEigenesAuge(b, P(0, 9), 1), 'Rand mit gegnerischer Diagonale: falsches Auge');
  b = brett(kreuz(0, 0, 1));
  pruefe(fuelltEigenesAuge(b, P(0, 0), 1), 'Ecke: Auge');
  b = brett([[8, 9, 1], [10, 9, 1], [9, 8, 1]]);
  pruefe(!fuelltEigenesAuge(b, P(9, 9), 1), 'leerer Nachbar: kein Auge');
  /* (9,8) hat nur noch die Freiheit (9,9): Füllen verbindet, kein Auge. */
  b = brett([...kreuz(9, 9, 1), [8, 8, 2], [10, 8, 2], [9, 7, 2]]);
  pruefe(!fuelltEigenesAuge(b, P(9, 9), 1), 'Nachbarkette im Atari: Füllen erlaubt');
});

/* Schwarz überall, frei sind nur vier Einzelaugen. */
function augenBrett() {
  const b = new Uint8Array(BOARD_SIZE).fill(1);
  for (const [x, y] of [[2, 2], [16, 2], [2, 16], [16, 16]]) b[P(x, y)] = 0;
  return b;
}

test('augenSchutz: nur eigene Augen frei → Pass; ohne → Stein ins Auge', () => {
  const b = augenBrett();
  for (const stufe of [1, 2]) {
    const r = mit({augenSchutz: stufe, mctsFixedSims: 16}, () =>
      getAIMove(b, 1, [], {1: 0, 2: 0}, 10, 'hard', 1, null, null));
    pruefeGleich(r.type, 'pass', `augenSchutz ${stufe}`);
  }
  const r = mit({augenSchutz: 0, mctsFixedSims: 16}, () =>
    getAIMove(b, 1, [], {1: 0, 2: 0}, 10, 'hard', 1, null, null));
  pruefeGleich(r.type, 'stone', 'augenSchutz 0 füllt ein Auge');
  for (const diff of ['easy', 'medium']) {
    const s = mit({augenSchutz: 1}, () => getAIMove(b, 1, [], {1: 0, 2: 0}, 10, diff, 1, null, null));
    pruefeGleich(s.type, 'pass', `Stufe ${diff}`);
  }
});

function vorbereitet(b, farbe) {
  buildCrisisMap(b, farbe); primeAreaCache(b, farbe); primeEndTieBreak(b);
}

test('gegnerzugUnabwendbar: Ausbruch möglich → abwendbar, sonst nicht', () => {
  /* Sieben schwarze Steine am oberen Rand, letzte Freiheit (7,0). */
  const kette = [...Array(7)].map((_, x) => [x, 0, 1]);
  const unten = [...Array(7)].map((_, x) => [x, 1, 2]);
  mit({mctsFixedSims: 16}, () => {
    /* Weiß auf (8,0) und (7,1): Schwarz auf (7,0) wäre Selbstmord. */
    let b = brett([...kette, ...unten, [8, 0, 2], [7, 1, 2]]);
    vorbereitet(b, 2);
    let sc = evaluateMove(b, P(7, 0), 2, 200, 300);
    pruefe(sc > PARAMS.passGainThreshold, `Schlag ist groß (${sc.toFixed(0)})`);
    let r = gegnerzugUnabwendbar(b, 1, [{m: {idx: P(15, 15)}}], [{idx: P(7, 0), sc}], 200, PARAMS.passGainThreshold, 300);
    pruefe(r === true, 'kein Ausweg: unabwendbar');
    /* Ohne (7,1): Schwarz verlängert auf (7,0) und hat wieder zwei Freiheiten. */
    b = brett([...kette, ...unten, [8, 0, 2]]);
    vorbereitet(b, 2);
    sc = evaluateMove(b, P(7, 0), 2, 200, 300);
    r = gegnerzugUnabwendbar(b, 1, [{m: {idx: P(15, 15)}}, {m: {idx: P(7, 0)}}], [{idx: P(7, 0), sc}], 200, PARAMS.passGainThreshold, 300);
    pruefe(r === false, 'Verlängern rettet: abwendbar');
  });
});

test('GNU-Go-Partie nach Zug 311: mit passUnabwendbar Pass, ohne Stein', () => {
  const zeilen = fs.readFileSync(path.join(__dirname, 'stellungen', 'gnugo-pass-311.txt'), 'utf8')
    .split('\n').filter(z => z && !z.startsWith('#'));
  const L = 'ABCDEFGHJKLMNOPQRST', ix = s => (19 - +s.slice(1)) * 19 + L.indexOf(s[0]);
  const b = new Uint8Array(BOARD_SIZE), caps = {1: 0, 2: 0};
  for (const v of zeilen[0].split(' ')) b[ix(v)] = 1;
  const zuege = zeilen[1].split(' ');
  pruefeGleich(zuege.length, 311, 'Zugzahl');
  zuege.forEach((z, t) => { const f = t % 2 === 0 ? 2 : 1;
    if (z !== 'pass') { const i = ix(z); b[i] = f; caps[f] += removeDeadGroups(b, 3 - f, i); } });
  const zug = kv => mit({mctsFixedSims: 40, adaptiveBudgetEnabled: 0, ...kv}, () =>
    getAIMove(b, 1, [], caps, 311, 'hard', 1, null, null));
  pruefeGleich(zug({passUnabwendbar: 0, augenSchutz: 0}).type, 'stone', 'alt: kein Pass');
  const r = zug({passUnabwendbar: 1});
  pruefeGleich(r.type, 'pass', 'passUnabwendbar 1');
  pruefe(/nicht abwendbar/.test(r.info || ''), 'Begründung im info');
  pruefeGleich(zug({passUnabwendbar: 1, augenSchutz: 2}).type, 'pass', 'mit augenSchutz 2');
});

laufeTests('Augenschutz und Pass (docs/endspiel-augen.md)');
