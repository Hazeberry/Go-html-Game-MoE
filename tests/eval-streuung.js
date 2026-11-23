// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Faktor auf den Rauschterm der vier Bewertungsexperten (evalStreuung).

   Die vier Experten enden auf `s + Math.random() * k` mit k = 3 (Eröffnung),
   4 (Mittelspiel), 0,5 (Endspiel) und 3 (Tsumego). Der Faktor multipliziert
   diesen Term, damit die Messung ihn abschalten (0) oder halbieren (0,5) kann.

   Geprüft wird NICHT, ob weniger Rauschen stärker spielt — das kann nur der
   Messlauf zeigen (docs/eval-streuung-vorabfestlegung.md §6) —, sondern was
   vorher gelten muss:

     1. Der Parameter existiert, steht auf 1 und ist in PARAMS_DEFAULT
        hinterlegt (sonst ließe das Dashboard ihn nicht zurücksetzen).
     2. Bei 1 ist das Ergebnis BITGENAU `basis + r*k`, also bitgleich zum
        Stand ohne Faktor. Das ist der konstruktive Teil der Festlegung §4:
        eine Multiplikation mit 1,0 ist in IEEE 754 exakt. Geprüft mit
        r-Werten, deren Produkt nicht darstellbar ist (0,1 · 3 ergibt
        0,30000000000000004) — ein Test mit runden Zahlen würde die Aussage
        nicht belasten.
     3. Bei 0,5 ist es bitgenau `basis + r*k*0,5`: der Faktor skaliert linear,
        und zwar genau den einen Term.
     4. Bei 0 hängt der Wert NICHT mehr von Math.random ab — das Rauschen ist
        wirklich weg, nicht nur klein.
     5. Der Zuschnitt ist nicht versehentlich größer geworden: quickEval
        (Ausspielungen) und der Gleichstandsbruch der Selbstschlag-Züge
        bleiben auch bei 0 zufällig. Festlegung §3 nennt beide als draußen.

   Math.random wird dafür auf einen festen Wert gelegt; der Rückbau steht in
   `finally`, damit ein Fehlschlag nicht die folgenden Tests vergiftet.

   Aufruf:  node tests/eval-streuung.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, PARAMS_DEFAULT, BOARD_SIZE, idx, evalOpening, evalMidgame, evalEndgame,
       evalTsumego, quickEval, evaluateMove, phaseWeights, buildCrisisMap, primeAreaCache,
       primeEndTieBreak, primeInfluenceCache} = KI;

/* Eine gewöhnliche Mittelspielstellung; der Punkt (9,15) ist in jeder Phase
   legal und schlägt nichts, damit kein Experte in einen Sonderpfad abbiegt. */
function brett() {
  const b = new Uint8Array(BOARD_SIZE);
  for (const [x, y] of [[3, 3], [15, 15], [9, 9], [3, 15], [6, 6], [12, 6]]) b[idx(x, y)] = 1;
  for (const [x, y] of [[15, 3], [9, 3], [3, 9], [15, 9], [6, 12], [12, 12]]) b[idx(x, y)] = 2;
  return b;
}
const B = brett();
const PKT = idx(9, 15);

/* Alle Caches der Experten frisch, damit die Basis zwischen zwei Aufrufen
   nicht aus einem Cache stammt, der vom vorigen Aufruf abhängt. */
function prime(b, farbe) {
  buildCrisisMap(b, farbe);
  primeAreaCache(b, farbe);
  primeInfluenceCache(b, farbe);
  primeEndTieBreak(b, farbe);
}
function mit(r, f, fn) {
  const altR = Math.random, altF = PARAMS.evalStreuung;
  Math.random = () => r;
  PARAMS.evalStreuung = f;
  try { return fn(); } finally { Math.random = altR; PARAMS.evalStreuung = altF; }
}

/* k und ein Zug, bei dem phaseWeights genau diesen Experten allein aufruft.
   Die Experten werden hier direkt aufgerufen; mc dient nur der Vollständigkeit
   und dem Aggregat-Test weiter unten. */
const EXPERTEN = [
  ['evalOpening', evalOpening, 3,   10],
  ['evalMidgame', evalMidgame, 4,   60],
  ['evalEndgame', evalEndgame, 0.5, 200],
  ['evalTsumego', evalTsumego, 3,   60],
];
/* Zwei der drei r-Werte sind absichtlich unrund: 0,1·3 und (1/3)·4 sind in
   IEEE 754 nicht darstellbar. */
const R_WERTE = [0.1, 1 / 3, 0.25];

test('Parameter existiert, steht auf 1 und ist in PARAMS_DEFAULT', () => {
  pruefeGleich(typeof PARAMS.evalStreuung, 'number', 'Typ von PARAMS.evalStreuung');
  pruefeGleich(PARAMS.evalStreuung, 1, 'Default von evalStreuung');
  pruefe(PARAMS_DEFAULT && 'evalStreuung' in PARAMS_DEFAULT, 'evalStreuung in PARAMS_DEFAULT');
  pruefeGleich(PARAMS_DEFAULT.evalStreuung, 1, 'PARAMS_DEFAULT.evalStreuung');
});

test('Vorbedingung: je mc rechnet genau ein Experte', () => {
  const leer = BOARD_SIZE - 12;
  pruefeGleich(phaseWeights(10, leer).wOpen, 1, 'Zug 10 = nur Eröffnung');
  pruefeGleich(phaseWeights(60, leer).wMid, 1, 'Zug 60 = nur Mittelspiel');
  pruefeGleich(phaseWeights(200, leer).wEnd, 1, 'Zug 200 = nur Endspiel');
});

test('Bei 1 bitgenau basis + r*k, bei 0,5 bitgenau die Hälfte davon', () => {
  for (const [name, fn, k, mc] of EXPERTEN) {
    for (const r of R_WERTE) {
      const basis = mit(r, 0, () => { prime(B, 1); return fn(B, PKT, 1, mc); });
      pruefe(Number.isFinite(basis), `${name}: Basis endlich (r=${r})`);
      const eins = mit(r, 1,   () => { prime(B, 1); return fn(B, PKT, 1, mc); });
      const halb = mit(r, 0.5, () => { prime(B, 1); return fn(B, PKT, 1, mc); });
      pruefeGleich(eins, basis + r * k,       `${name} bei 1 (r=${r}, k=${k})`);
      pruefeGleich(halb, basis + r * k * 0.5, `${name} bei 0,5 (r=${r}, k=${k})`);
      /* Der Term ist wirklich da: bei 1 unterscheidet sich der Wert von der
         Basis (sonst wäre die obige Gleichung auch mit k = 0 erfüllt). */
      pruefe(eins !== basis, `${name}: Term wirkt bei 1 (r=${r})`);
    }
  }
});

test('Bei 0 ist der Wert unabhängig von Math.random', () => {
  for (const [name, fn, , mc] of EXPERTEN) {
    const werte = R_WERTE.concat([0, 0.999999]).map(r =>
      mit(r, 0, () => { prime(B, 1); return fn(B, PKT, 1, mc); }));
    for (let j = 1; j < werte.length; j++)
      pruefeGleich(werte[j], werte[0], `${name} bei 0, Lauf ${j}`);
  }
});

test('Aggregat evaluateMove: bei 0 deterministisch, bei 1 nicht', () => {
  for (const mc of [10, 60, 200]) {
    const leer = [];
    for (let i = 0; i < BOARD_SIZE; i++) if (!B[i]) leer.push(i);
    const lauf = (r, f) => mit(r, f, () => { prime(B, 1); return evaluateMove(B, PKT, 1, mc, leer.length); });
    pruefeGleich(lauf(0.1, 0), lauf(0.9, 0), `evaluateMove mc=${mc} bei 0 deterministisch`);
    pruefe(lauf(0.1, 1) !== lauf(0.9, 1), `evaluateMove mc=${mc} bei 1 streut`);
  }
});

test('Zuschnitt: quickEval und der Selbstschlag-Bruch bleiben zufällig (Festlegung §3)', () => {
  /* quickEval endet auf Math.random()*5 und gehört zur Ausspielstrategie. */
  const q = r => mit(r, 0, () => quickEval(B, PKT, 1));
  pruefe(q(0.2) !== q(0.8), 'quickEval streut auch bei evalStreuung 0');

  /* Gleichstandsbruch der Züge, die sich selbst schlagen: -10000 + random.
     (0,0) ist von zwei weißen Steinen eingeschlossen, Schwarz schlägt dort
     nichts und hat null Freiheiten. */
  const b = new Uint8Array(BOARD_SIZE);
  b[idx(1, 0)] = 2; b[idx(0, 1)] = 2;
  const selbst = idx(0, 0);
  for (const [name, fn, , mc] of [['evalEndgame', evalEndgame, 0.5, 200], ['evalTsumego', evalTsumego, 3, 60]]) {
    const w = r => mit(r, 0, () => { prime(b, 1); return fn(b, selbst, 1, mc); });
    const a = w(0.2), c = w(0.8);
    pruefe(a < -9999 && a > -10001, `${name}: Selbstschlag-Pfad getroffen (${a})`);
    pruefe(a !== c, `${name}: Selbstschlag-Bruch streut auch bei evalStreuung 0`);
  }
});

laufeTests('Streuung der Bewertung (evalStreuung)').then(ok => process.exit(ok ? 0 : 1));
