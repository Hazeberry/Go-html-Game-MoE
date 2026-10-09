/* Gegnerwert in der Zugwahl (gegnerWert; docs/gegnerwert.md).

     1. Bei 0 bleibt getAIMove bitgenau: derselbe Zug, dieselbe Info.
     2. Der Punkt, an dem der Gegner eine eigene Gruppe schlagen könnte, wird
        mit Gegnerwert zum gewählten Zug, auch wenn die eigene Bewertung ihn
        nicht vorne sieht.
     3. Die Pass-Prüfung bleibt unberührt: Die GNU-Go-Stellung nach Zug 311
        endet mit und ohne Gegnerwert im Pass.
     4. krisenKandidaten: Im selben Beispiel rettet die KI ihre Kette, ohne
        den Schalter spielt sie woanders (die Rettung lag auf Rang 222).
     Die Flucht in 2 und 4 ist aussichtslos (Leiter an der Kante). Seit
     leseVerzicht Default 1 ist, filtert die KI sie heraus
     (docs/endspiel-verlust.md). Die beiden Tests prüfen die Mechanik der
     Schalter und setzen leseVerzicht deshalb auf 0.

   Aufruf:  node tests/gegnerwert.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, getAIMove, removeDeadGroups} = KI;
const P = (x, y) => y * 19 + x;

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  let seed = 7; const r = Math.random;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  try { return fn(); } finally { Object.assign(PARAMS, alt); Math.random = r; }
}
const zug = (b, farbe, mc, kv) => mit({mctsFixedSims: 60, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, ...kv},
  () => getAIMove(b, farbe, [], {1: 0, 2: 0}, mc, 'hard', 1, null, null));

function stellung(zuege) {
  const L = 'ABCDEFGHJKLMNOPQRST', ix = s => (19 - +s.slice(1)) * 19 + L.indexOf(s[0]);
  const b = new Uint8Array(BOARD_SIZE);
  zuege.split(' ').forEach((s, t) => { const f = t % 2 === 0 ? 1 : 2, i = ix(s); b[i] = f; removeDeadGroups(b, 3 - f, i); });
  return b;
}

test('Defaults 0 (gegnerWert, gegnerGebiet verworfen; krisenKandidaten vor der Messung)', () => {
  pruefeGleich(PARAMS.gegnerWert, 0, 'gegnerWert');
  pruefeGleich(PARAMS.gegnerGebiet, 0, 'gegnerGebiet');
  pruefeGleich(PARAMS.krisenKandidaten, 0, 'krisenKandidaten');
});

test('gegnerWert 0: getAIMove bitgenau wie ohne den Parameter', () => {
  const b = stellung('D16 Q4 Q16 D4 R10 C10 K16 K4 O10 F10 P14 E14');
  const ohne = zug(b, 1, 12, {});
  const null0 = zug(b, 1, 12, {gegnerWert: 0});
  pruefeGleich(null0.type, ohne.type, 'Typ');
  pruefeGleich(`${null0.x},${null0.y}`, `${ohne.x},${ohne.y}`, 'Zug');
  pruefeGleich(null0.info, ohne.info, 'Info');
});

test('Rettungspunkt der eigenen Gruppe wird mit Gegnerwert gewählt', () => {
  /* Weiße Kette aus drei Steinen am Rand, im Atari; die letzte Freiheit
     ist für Schwarz der Schlagpunkt, für Weiß die Flucht. */
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of [[3, 3, 1], [15, 15, 1], [3, 15, 2], [15, 3, 2],
                           [8, 18, 2], [9, 18, 2], [10, 18, 2], [7, 18, 1], [8, 17, 1], [9, 17, 1], [10, 17, 1]])
    b[P(x, y)] = f;
  /* Freiheit: (11,18). Schwarz am Zug würde dort 3 Steine schlagen. */
  const r = zug(b, 2, 40, {gegnerWert: 1, leseVerzicht: 0});
  pruefeGleich(r.type, 'stone', 'Weiß zieht');
  pruefeGleich(P(r.x, r.y), P(11, 18), 'Weiß flieht auf die letzte Freiheit');
});

test('krisenKandidaten: Rettung aus dem Atari kommt in die Suche', () => {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y, f] of [[3, 3, 1], [15, 15, 1], [3, 15, 2], [15, 3, 2],
                           [8, 18, 2], [9, 18, 2], [10, 18, 2], [7, 18, 1], [8, 17, 1], [9, 17, 1], [10, 17, 1]])
    b[P(x, y)] = f;
  const ohne = zug(b, 2, 40, {leseVerzicht: 0});
  pruefe(P(ohne.x, ohne.y) !== P(11, 18), 'ohne Schalter: keine Rettung (Gebietszug überstrahlt)');
  const mitK = zug(b, 2, 40, {krisenKandidaten: 1, leseVerzicht: 0});
  pruefeGleich(P(mitK.x, mitK.y), P(11, 18), 'mit Schalter: Flucht auf die letzte Freiheit');
  const verzicht = zug(b, 2, 40, {krisenKandidaten: 1});
  pruefe(P(verzicht.x, verzicht.y) !== P(11, 18), 'mit leseVerzicht (Default): die aussichtslose Flucht entfällt');
});

test('Pass-Prüfung unverändert: GNU-Go-Stellung nach Zug 311 endet im Pass', () => {
  const zeilen = fs.readFileSync(path.join(__dirname, 'stellungen', 'gnugo-pass-311.txt'), 'utf8')
    .split('\n').filter(z => z && !z.startsWith('#'));
  const L = 'ABCDEFGHJKLMNOPQRST', ix = s => (19 - +s.slice(1)) * 19 + L.indexOf(s[0]);
  const b = new Uint8Array(BOARD_SIZE), caps = {1: 0, 2: 0};
  for (const v of zeilen[0].split(' ')) b[ix(v)] = 1;
  zeilen[1].split(' ').forEach((z, t) => { const f = t % 2 === 0 ? 2 : 1;
    if (z !== 'pass') { const i = ix(z); b[i] = f; caps[f] += removeDeadGroups(b, 3 - f, i); } });
  for (const kv of [{}, {gegnerWert: 1}, {krisenKandidaten: 1}]) {
    const r = mit({mctsFixedSims: 40, adaptiveBudgetEnabled: 0, ...kv}, () =>
      getAIMove(b, 1, [], caps, 311, 'hard', 1, null, null));
    pruefeGleich(r.type, 'pass', JSON.stringify(kv));
  }
});

laufeTests('Gegnerwert (docs/gegnerwert.md)').then(ok => process.exit(ok ? 0 : 1));
