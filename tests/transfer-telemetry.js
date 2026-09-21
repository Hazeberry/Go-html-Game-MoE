/* Transfer-Waechter: misst er, was deathTransfer in evaluateBoard anrichtet —
   und bleibt er dabei folgenlos?

   Hintergrund: die Uebertragung zieht einer sterbenden Gruppe anteilig ihren
   Wert ab und schreibt ihn dem Gegner als Gefangene gut. Bisher konnte
   niemand sehen, wie oft das greift und wie gross der Abzug ausfaellt. Der
   Waechter zaehlt das — aber nur, wenn PARAMS.transferTelemetrie > 0 ist.

   Der Schalter existiert nicht aus Zaghaftigkeit: evaluateBoard laeuft
   einmal je Simulation, bei ~500 Sims/Zug also hunderte Male pro Zug. Ein
   ungebremster Zaehler im Gruppenloop bezahlt jede Partie mit.

   Aufruf:  node tests/transfer-telemetry.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, evaluateBoard, leseTransferWaechter} = KI;

/* Eine Gruppe, die die Sterbe-Rampe sicher erreicht: gross genug fuer
   deathDiscountSize, und mit so wenig Freiheiten, dass STERBE_RAMPE greift.
   Ein Block am Rand, vom Gegner eingeschnuert. */
function sterbendeGruppe() {
  const b = new Uint8Array(BOARD_SIZE);
  for (let x = 0; x < 6; x++) b[x] = 2;            /* Weiss, oberste Reihe */
  for (let x = 0; x < 7; x++) b[19 + x] = 1;       /* Schwarz deckelt sie zu */
  b[6] = 1;
  return b;
}
const CAPS = {1: 0, 2: 0};

function mitTelemetrie(fn) {
  const alt = PARAMS.transferTelemetrie;
  PARAMS.transferTelemetrie = 1;
  leseTransferWaechter(true);
  try { return fn(); } finally {
    PARAMS.transferTelemetrie = alt;
    leseTransferWaechter(true);
  }
}

test('Der Schalter ist im Auslieferungszustand aus', () => {
  /* Der Vertrag: die heisseste Funktion der Engine zahlt nichts, solange
     niemand misst. */
  pruefeGleich(PARAMS.transferTelemetrie, 0, 'transferTelemetrie muss 0 sein');
});

test('Bei ausgeschaltetem Schalter zaehlt der Waechter nichts', () => {
  leseTransferWaechter(true);
  evaluateBoard(sterbendeGruppe(), 2, CAPS);
  const w = leseTransferWaechter(true);
  pruefeGleich(w.rufe, 0, 'keine Rufe gezaehlt');
  pruefeGleich(w.gruppen, 0, 'keine Gruppen gezaehlt');
});

test('Eingeschaltet zaehlt er Rufe und Gruppen', () => {
  const w = mitTelemetrie(() => {
    evaluateBoard(sterbendeGruppe(), 2, CAPS);
    return leseTransferWaechter(false);
  });
  pruefeGleich(w.rufe, 1, 'ein Aufruf von evaluateBoard');
  pruefe(w.gruppen > 0, `mindestens eine Gruppe mit Uebertragung, war ${w.gruppen}`);
  pruefe(w.summe > 0, `Abzugssumme muss positiv sein, war ${w.summe}`);
  pruefe(w.max > 0, `groesster Abzug muss positiv sein, war ${w.max}`);
});

test('Der Waechter aendert das Ergebnis nicht', () => {
  /* Der eigentliche Punkt. Bitgenau, nicht "ungefaehr": Object.is trennt
     auch -0 von 0 und NaN von NaN. */
  const b = sterbendeGruppe();
  const ohne = evaluateBoard(b, 2, CAPS);
  const mit  = mitTelemetrie(() => evaluateBoard(b, 2, CAPS));
  pruefe(Object.is(ohne, mit), `bitgenau gleich erwartet: ${ohne} gegen ${mit}`);
});

test('Ohne Uebertragung zaehlt er keine Gruppen', () => {
  /* Gegenprobe: der Waechter darf nicht irgendetwas zaehlen, sondern genau
     die Uebertragung. Bei deathTransfer 0 wird ihr Zweig nie betreten. */
  const alt = PARAMS.deathTransfer;
  PARAMS.deathTransfer = 0;
  try {
    const w = mitTelemetrie(() => {
      evaluateBoard(sterbendeGruppe(), 2, CAPS);
      return leseTransferWaechter(false);
    });
    pruefeGleich(w.rufe, 1, 'der Aufruf wird weiterhin gezaehlt');
    pruefeGleich(w.gruppen, 0, 'aber keine Gruppe mit Uebertragung');
  } finally { PARAMS.deathTransfer = alt; }
});

test('Ueberkompensation wird als solche erkannt', () => {
  /* Bei sehr grossem deathTransfer muss der Abzug den Gruppenwert
     uebersteigen -- die Gruppe zaehlt dann negativ, obwohl sie steht. Genau
     das soll der Zaehler sichtbar machen. */
  const alt = PARAMS.deathTransfer;
  PARAMS.deathTransfer = 50;
  try {
    const w = mitTelemetrie(() => {
      evaluateBoard(sterbendeGruppe(), 2, CAPS);
      return leseTransferWaechter(false);
    });
    pruefe(w.ueber > 0, `Ueberkompensation erwartet, gezaehlt: ${w.ueber}`);
  } finally { PARAMS.deathTransfer = alt; }
});

test('Zuruecksetzen leert wirklich alle Felder', () => {
  mitTelemetrie(() => { evaluateBoard(sterbendeGruppe(), 2, CAPS); });
  const w = leseTransferWaechter(true);
  for (const k of Object.keys(w))
    pruefeGleich(w[k], 0, `Feld ${k} muss nach dem Zuruecksetzen 0 sein`);
});

laufeTests('Transfer-Waechter (Telemetrie der Uebertragung)')
  .then(ok => process.exit(ok ? 0 : 1));
