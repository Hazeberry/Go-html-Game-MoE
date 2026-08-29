/* Aufgabe-Kriterium: gibt die KI nur noch auf, wenn sie wirklich verliert?

   Vorgeschichte: an vier Hard-Partien vom 29.08. gab die KI jedes Mal auf
   (RE[B+R]), obwohl das Gebiet ausgeglichen war — Rückstand −6 (sie lag also
   VORN), +3, +11 und +13 Gebietspunkte. Die Aufgaben waren intern konsistent
   (Q ≤ −0,95), aber Q hängt an evaluateBoard, und das wird vom Gefangenen-Term
   beherrscht: er machte 92–105 % der gesamten Bewertung aus.

   Gemessen wurde auch die Alternative — captureWeight kleiner setzen. Über
   drei A/B-Läufe zu je 40 Partien senkt das die Aufgabequote stark und
   signifikant (bei Gewicht 0: 14 Aufgaben gegen 1, p ≈ 0,001), die Siegrate
   aber nicht (52,5 % / 60,0 % / 62,5 %, alle im Rauschen). Deshalb bleibt
   captureWeight bei 20 und stattdessen bekommt die AUFGABE ein zweites,
   unabhängiges Kriterium.

   Aufruf:  node tests/resign-criterion.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE} = KI;
const gebietSagtVerloren = KI.gebietSagtVerloren;
const estimateArea       = KI.estimateArea;

/* Brett mit exakt steuerbarer Fläche: Weiß bekommt die obersten Reihen,
   Schwarz die untersten, dazwischen bleibt eine Lücke. Die grenzt an beide
   Farben und zählt deshalb für niemanden — die Fläche ist also genau
   19 × Reihen je Seite, ohne Nebenwirkung durch eingeschlossene Regionen. */
function brett(weissReihen, schwarzReihen) {
  const b = new Uint8Array(BOARD_SIZE);
  for (let y = 0; y < weissReihen; y++)        for (let x = 0; x < 19; x++) b[y*19+x] = 2;
  for (let y = 19-schwarzReihen; y < 19; y++)  for (let x = 0; x < 19; x++) b[y*19+x] = 1;
  return b;
}
const rueckstand = b => estimateArea(b, 1) - estimateArea(b, 2);   /* > 0 = Weiß zurück */

test('Die Brett-Konstruktion liefert die erwarteten Flächen', () => {
  /* Ohne das ist alles darunter wertlos. */
  pruefeGleich(rueckstand(brett(8, 8)),  0, 'gleich viele Reihen → ausgeglichen');
  pruefeGleich(rueckstand(brett(8, 9)), 19, 'eine Reihe mehr → 19 Punkte');
  pruefeGleich(rueckstand(brett(7, 9)), 38, 'zwei Reihen mehr → 38 Punkte');
});

test('Die vier gemessenen Fehlaufgaben liegen unter der Marge', () => {
  /* Reine Arithmetik, aber genau die Zusicherung, um die es geht: wer
     resignAreaMargin unter 14 senkt, holt sich diese vier Fälle zurück. */
  for (const r of [-6, 3, 11, 13])
    pruefe(r < PARAMS.resignAreaMargin,
      `Rückstand ${r} muss unter der Marge ${PARAMS.resignAreaMargin} liegen`);
});

test('Ausgeglichenes Gebiet blockiert die Aufgabe', () => {
  pruefeGleich(gebietSagtVerloren(brett(8, 8), 2), false, 'ausgeglichen → keine Aufgabe');
});

test('Rückstand unterhalb der Marge blockiert die Aufgabe', () => {
  const b = brett(8, 9);
  pruefe(rueckstand(b) < PARAMS.resignAreaMargin, 'Testfall liegt unter der Marge');
  pruefeGleich(gebietSagtVerloren(b, 2), false, `Rückstand ${rueckstand(b)} → keine Aufgabe`);
});

test('Klarer Rückstand erlaubt die Aufgabe weiterhin', () => {
  /* Das Kriterium soll die Aufgabe nicht abschaffen, nur eichen. */
  for (const [w, s] of [[7, 9], [6, 9], [3, 12]]) {
    const b = brett(w, s);
    pruefe(rueckstand(b) > PARAMS.resignAreaMargin, `Testfall ${rueckstand(b)} liegt über der Marge`);
    pruefeGleich(gebietSagtVerloren(b, 2), true, `Rückstand ${rueckstand(b)} → Aufgabe erlaubt`);
  }
});

test('Die Marge trennt genau dort, wo sie soll', () => {
  /* Vertrag: verloren genau dann, wenn eigenes Gebiet < fremdes − Marge. */
  const alt = PARAMS.resignAreaMargin;
  try {
    for (const marge of [0, 10, 30, 60, 120]) {
      PARAMS.resignAreaMargin = marge;
      for (const [w, s] of [[8,8], [8,9], [7,9], [6,9], [5,10], [3,12]]) {
        const b = brett(w, s);
        const erwartet = estimateArea(b, 2) < estimateArea(b, 1) - marge;
        pruefeGleich(gebietSagtVerloren(b, 2), erwartet,
          `Marge ${marge}, Rückstand ${rueckstand(b)}`);
      }
    }
  } finally { PARAMS.resignAreaMargin = alt; }
});

test('Negative Marge stellt das alte Verhalten wieder her', () => {
  const alt = PARAMS.resignAreaMargin;
  try {
    PARAMS.resignAreaMargin = -1;
    /* Auch bei haushohem Vorsprung: das Kriterium ist dann abgeschaltet und
       darf die Aufgabe nicht mehr blockieren — Q entscheidet wieder allein. */
    pruefeGleich(gebietSagtVerloren(brett(12, 3), 2), true, 'abgeschaltet → immer true');
    pruefeGleich(gebietSagtVerloren(brett(8, 8), 2),  true, 'abgeschaltet → immer true');
  } finally { PARAMS.resignAreaMargin = alt; }
});

test('Das Kriterium gilt für beide Farben', () => {
  const b = brett(3, 12);            /* Weiß weit hinten */
  pruefeGleich(gebietSagtVerloren(b, 2), true,  'Weiß liegt zurück → Aufgabe erlaubt');
  pruefeGleich(gebietSagtVerloren(b, 1), false, 'Schwarz liegt vorn → keine Aufgabe');
});

laufeTests('Aufgabe-Kriterium (Gebiet als zweite Instanz)')
  .then(ok => process.exit(ok ? 0 : 1));
