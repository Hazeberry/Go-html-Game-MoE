/* Einflusskarte (Bouzy) und ihre zwei Parameter influenceInvade / influenceOwn.

   Geprüft wird nicht, ob die KI dadurch STÄRKER spielt — das kann nur der
   A/B-Harness zeigen —, sondern drei Dinge, die vorher gelten müssen:

     1. Die Karte sieht, was estimateArea nicht sieht: einen Rahmen mit Lücke.
     2. Bei beiden Gewichten 0 ändert sich am Zugwert NICHTS (bitgenau),
        auch wenn die Karte berechnet wurde.
     3. Bei Gewicht > 0 wirkt der Term in die richtige Richtung und nur dort,
        wo er soll.

   evaluateMove rauscht (Math.random() im Endstück der Experten); für die
   bitgenauen Vergleiche wird Math.random deshalb festgehalten.

   Aufruf:  node tests/influence.js [pfad/zur/index.html] */
'use strict';
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, estimateArea, evaluateMove,
       primeInfluenceCache, influenceZone} = KI;

const leer = () => new Uint8Array(BOARD_SIZE);

/* Quadratring von (3,3) bis (15,15) in Farbe `farbe`, optional mit Lücken. */
function ring(b, farbe, luecken = []) {
  for (let x = 3; x <= 15; x++) for (let y = 3; y <= 15; y++) {
    if (!(x === 3 || x === 15 || y === 3 || y === 15)) continue;
    if (luecken.some(([lx, ly]) => lx === x && ly === y)) continue;
    b[idx(x, y)] = farbe;
  }
}
function block(b, farbe, x0, y0) {
  for (let x = x0; x < x0 + 2; x++) for (let y = y0; y < y0 + 2; y++) b[idx(x, y)] = farbe;
}
const freie = b => { let n = 0; for (let i = 0; i < BOARD_SIZE; i++) if (!b[i]) n++; return n; };

/* Math.random festhalten, danach zurück. */
function mitFestemZufall(fn) {
  const alt = Math.random;
  Math.random = () => 0.5;
  try { return fn(); } finally { Math.random = alt; }
}
function mitGewichten(invade, own, fn) {
  const a = PARAMS.influenceInvade, o = PARAMS.influenceOwn;
  PARAMS.influenceInvade = invade; PARAMS.influenceOwn = own;
  try { return fn(); } finally { PARAMS.influenceInvade = a; PARAMS.influenceOwn = o; }
}

test('Parameter existieren und stehen standardmäßig auf 0', () => {
  pruefeGleich(PARAMS.influenceInvade, 0, 'influenceInvade-Default');
  pruefeGleich(PARAMS.influenceOwn, 0, 'influenceOwn-Default');
});

test('leeres Brett: keine Zone irgendwo', () => {
  primeInfluenceCache(leer());
  for (let i = 0; i < BOARD_SIZE; i++)
    pruefeGleich(influenceZone(i, 1), 0, `Zone an Feld ${i}`);
});

test('Ring mit EINER Lücke: Area sieht ihn nicht, die Einflusskarte schon', () => {
  const b = leer();
  ring(b, 1, [[9, 3]]);
  block(b, 2, 0, 0);
  const area = estimateArea(b, 1);
  /* Nur die 47 Ringsteine; jede leere Region hängt über die Lücke am Weiß. */
  pruefe(area <= 50, `estimateArea zählt trotz Lücke ${area} Felder (erwartet: nur die Steine)`);
  primeInfluenceCache(b);
  /* Zwei Felder hinter dem Ring, auf Höhe seiner Mitte. Die Ringmitte selbst
     (9,9) bleibt bewusst neutral: fünf Dilatationen reichen nicht bis dorthin,
     die Karte ist ein Band um die Steine, kein gefülltes Gebiet. */
  pruefeGleich(influenceZone(idx(5, 9), 1), 1, 'Feld hinter dem Ring gehört Schwarz');
  pruefeGleich(influenceZone(idx(5, 9), 2), -1, 'dasselbe Feld ist für Weiß Gegnerzone');
  pruefeGleich(influenceZone(idx(9, 9), 1) + 0, 0, 'Ringmitte bleibt neutral (Reichweite der Dilatation)');
});

test('Zone ist antisymmetrisch: für Schwarz +1 heißt für Weiß -1', () => {
  const b = leer();
  ring(b, 1, [[9, 3], [3, 9]]);
  block(b, 2, 0, 0);
  primeInfluenceCache(b);
  /* === statt Object.is: -0 und 0 sind hier dasselbe "keine Zone" */
  for (let i = 0; i < BOARD_SIZE; i++)
    pruefe(influenceZone(i, 1) === -influenceZone(i, 2), `Antisymmetrie an Feld ${i}`);
});

test('beide Gewichte 0: Zugwert bitgleich, ob Karte berechnet oder nicht', () => {
  const b = leer();
  ring(b, 2, [[9, 3]]);
  block(b, 1, 0, 0);
  const n = freie(b);
  const punkte = [idx(9, 9), idx(10, 10), idx(9, 17), idx(17, 17), idx(1, 9)];
  mitFestemZufall(() => mitGewichten(0, 0, () => {
    /* ohne Karte */
    KI.influenceZone(0, 1);   /* Aufruf schadet nicht */
    const ohne = punkte.map(p => evaluateMove(b, p, 1, 60, n));
    primeInfluenceCache(b);
    const mit = punkte.map(p => evaluateMove(b, p, 1, 60, n));
    for (let k = 0; k < punkte.length; k++)
      pruefeGleich(mit[k], ohne[k], `Zugwert an Punkt ${k} mit/ohne Karte`);
  }));
});

test('influenceInvade hebt Züge in der Gegnerzone, andere bleiben gleich', () => {
  const b = leer();
  ring(b, 2, [[9, 3]]);       /* Weiß-Rahmen mit Lücke */
  block(b, 1, 0, 0);          /* Schwarz in der Ecke, Schwarz ist am Zug */
  const n = freie(b);
  primeInfluenceCache(b);
  const innen = idx(5, 9), neutral = idx(9, 9);
  pruefeGleich(influenceZone(innen, 1), -1, 'Vorbedingung: Feld hinter dem Ring ist Gegnerzone für Schwarz');
  pruefeGleich(influenceZone(neutral, 1) + 0, 0, 'Vorbedingung: Ringmitte ist neutral');
  const wert = (p, inv, own) => mitFestemZufall(() => mitGewichten(inv, own, () => evaluateMove(b, p, 1, 60, n)));
  const basisInnen = wert(innen, 0, 0), basisNeutral = wert(neutral, 0, 0);
  pruefeGleich(wert(innen, 100, 0) - basisInnen, 100, 'Invasionsbonus in der Gegnerzone');
  pruefeGleich(wert(neutral, 100, 100), basisNeutral, 'neutrales Feld unverändert');
  /* influenceOwn darf in der GEGNERzone nichts tun */
  pruefeGleich(wert(innen, 0, 100), basisInnen, 'influenceOwn wirkt nicht in der Gegnerzone');
});

test('influenceOwn senkt Züge in der eigenen Zone', () => {
  const b = leer();
  ring(b, 1, [[9, 3]]);       /* Schwarz-Rahmen mit Lücke, Schwarz am Zug */
  block(b, 2, 0, 0);
  const n = freie(b);
  primeInfluenceCache(b);
  const innen = idx(5, 9);
  pruefeGleich(influenceZone(innen, 1), 1, 'Vorbedingung: Feld hinter dem Ring ist eigene Zone');
  const wert = (inv, own) => mitFestemZufall(() => mitGewichten(inv, own, () => evaluateMove(b, innen, 1, 60, n)));
  const basis = wert(0, 0);
  pruefeGleich(basis - wert(0, 100), 100, 'Abzug in der eigenen Zone');
  pruefeGleich(wert(100, 0), basis, 'influenceInvade wirkt nicht in der eigenen Zone');
});

laufeTests('Einflusskarte').then(ok => process.exit(ok ? 0 : 1));
