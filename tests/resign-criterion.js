/* Aufgabe-Kriterium: die Mechanik von gebietSagtVerloren — und dass sie im
   Auslieferungszustand ABGESCHALTET ist.

   Vorgeschichte, samt Widerruf: an vier Hard-Partien vom 29.08. gab die KI
   jedes Mal auf (RE[B+R]). Gemessen mit estimateArea sah das Gebiet
   ausgeglichen aus — Rückstand −6 (sie läge also VORN), +3, +11 und +13
   Punkte —, und daraufhin bekam die Aufgabe ein zweites Kriterium.

   Am 21.09. wurde das widerlegt. Der Maßstab war falsch: estimateArea zählt
   todgeweihte, aber noch stehende Gruppen als lebendiges Material, und die
   damalige "Gegenprobe gegen finalAreaScore" war eine Nachbildung OHNE
   resolveLifeAndDeath, also derselbe blinde Fleck. Mit der echten
   Schlussauswertung lag die KI in allen vier Partien zurück, um 14,5 bis
   56,5 Punkte; bei der 305-Züge-Partie Benson-beweisbar. Die vier Aufgaben
   waren also RICHTIG, und der Anlass für das Kriterium existiert nicht.

   Die Dosisreihe (160 Partien) zeigte danach: das Kriterium greift hart
   (bei Marge 30 fängt es 70–85 % der Aufgaben ab), kostet aber keine
   messbare Spielstärke — und es zu entfernen ebenfalls nicht. Entschieden
   hat deshalb der widerlegte Anlass, nicht die Messung.

   DAHER: resignAreaMargin steht auf -1, das Kriterium ist aus. Die Mechanik
   bleibt vollständig geprüft, damit sie beim Zurückholen funktioniert —
   jeder Verhaltenstest setzt die Marge dazu aber EXPLIZIT, statt sich auf
   den Default zu verlassen. Genau diese Kopplung an den Default hat beim
   Abschalten vier Tests umgeworfen, die gar keine Aussage über den Default
   treffen wollten.

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

test('Das Kriterium ist im Auslieferungszustand abgeschaltet', () => {
  /* Der eigentliche Vertrag seit dem 21.09.: ueber die Aufgabe entscheidet
     wieder Q allein. Ein Wert >= 0 waere eine Verhaltensaenderung und muss
     hier auffallen. */
  pruefe(PARAMS.resignAreaMargin < 0,
    `resignAreaMargin muss negativ (aus) sein, ist ${PARAMS.resignAreaMargin}`);
  /* Und zwar wirksam, nicht nur als Zahl: auch bei haushohem Vorsprung darf
     das Kriterium die Aufgabe nicht mehr blockieren. */
  pruefeGleich(gebietSagtVerloren(brett(12, 3), 2), true, 'aus → blockiert nie');
  pruefeGleich(gebietSagtVerloren(brett(8, 8), 2),  true, 'aus → blockiert nie');
});

test('Die vier Partien vom 29.08. haetten das Kriterium ausgeloest', () => {
  /* Reine Arithmetik, aber sie haelt den Grund der Abschaltung fest: mit
     der alten Marge 30 waeren ALLE VIER Aufgaben blockiert worden -- und
     nachgemessen waren sie richtig. Die Zahlen sind die rohen Rueckstaende
     [roh]; der wahre Rueckstand lag bei 22 bis 64 Punkten. */
  const MARGE_ALT = 30;
  for (const r of [-6, 3, 11, 13])
    pruefe(r < MARGE_ALT,
      `Rueckstand ${r} [roh] laege unter der alten Marge ${MARGE_ALT}`);
});

/* Ab hier wird das EINGESCHALTETE Kriterium geprueft. Die Marge wird dafuer
   explizit gesetzt und danach zurueckgestellt -- diese Tests treffen keine
   Aussage ueber den Default, und sie sollen auch nicht mitkippen, wenn er
   sich aendert. */
const MARGE = 30;
function mitMarge(fn) {
  const alt = PARAMS.resignAreaMargin;
  PARAMS.resignAreaMargin = MARGE;
  try { fn(); } finally { PARAMS.resignAreaMargin = alt; }
}

test('Eingeschaltet: ausgeglichenes Gebiet blockiert die Aufgabe', () => {
  mitMarge(() => {
    pruefeGleich(gebietSagtVerloren(brett(8, 8), 2), false, 'ausgeglichen → keine Aufgabe');
  });
});

test('Eingeschaltet: Rückstand unterhalb der Marge blockiert die Aufgabe', () => {
  mitMarge(() => {
    const b = brett(8, 9);
    pruefe(rueckstand(b) < MARGE, 'Testfall liegt unter der Marge');
    pruefeGleich(gebietSagtVerloren(b, 2), false, `Rückstand ${rueckstand(b)} → keine Aufgabe`);
  });
});

test('Eingeschaltet: klarer Rückstand erlaubt die Aufgabe weiterhin', () => {
  /* Das Kriterium soll die Aufgabe nicht abschaffen, nur eichen. */
  mitMarge(() => {
    for (const [w, sr] of [[7, 9], [6, 9], [3, 12]]) {
      const b = brett(w, sr);
      pruefe(rueckstand(b) > MARGE, `Testfall ${rueckstand(b)} liegt über der Marge`);
      pruefeGleich(gebietSagtVerloren(b, 2), true, `Rückstand ${rueckstand(b)} → Aufgabe erlaubt`);
    }
  });
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

test('Eingeschaltet: das Kriterium gilt für beide Farben', () => {
  mitMarge(() => {
    const b = brett(3, 12);            /* Weiß weit hinten */
    pruefeGleich(gebietSagtVerloren(b, 2), true,  'Weiß liegt zurück → Aufgabe erlaubt');
    pruefeGleich(gebietSagtVerloren(b, 1), false, 'Schwarz liegt vorn → keine Aufgabe');
  });
});

laufeTests('Aufgabe-Kriterium (Gebiet als zweite Instanz)')
  .then(ok => process.exit(ok ? 0 : 1));
