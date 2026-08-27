/* Stabilität des REINFORCE-Trainings im Policy-Netz (PR #49).

   Ursache des NaN-Bugs war nicht die Suche, sondern das Training: bei
   negativem Advantage maximiert der Schritt −log p(a), und das hat kein
   Optimum — p(a) → 0 erreicht man nur mit ‖W‖ → ∞. Daraus wurde eine
   Rückkopplung (W1 → Aktivierungen → W2-Updates → dH → W1), die die
   Gewichte über die Float32-Grenze trieb.

   Die ersten drei Tests prüfen den Mechanismus deterministisch und laufen in
   unter einer Sekunde. Der letzte fährt den ursprünglichen Repro und braucht
   rund eine halbe Minute — die Größe ist nicht beliebig gewählt: bei
   30 Partien × 400 Zügen fing er den Fehler im Stand vor dem Fix in 6 von
   6 Läufen, bei 25 × 200 in 0 von 3. Ein stochastischer Test, der nur
   manchmal anschlägt, ist schlimmer als keiner.

   Aufruf:  node tests/training-stability.js [partien] [zuege] [pfad/index.html]
   Schnelldurchlauf:  node tests/training-stability.js 12 200 */
'use strict';
const {ladeKI, test, pruefe, pruefeNah, pruefeFinit, laufeTests} = require('./rahmen');

const PARTIEN = Number(process.argv[2] || 30);
const ZUEGE   = Number(process.argv[3] || 400);
const SEED    = Number(process.env.SEED || 2026);
const KI      = ladeKI({htmlPfad: process.argv[4] || undefined});
const {PARAMS, netz} = KI;

const norm = (...felder) => {
  let n = 0;
  for (const f of felder) for (let i = 0; i < f.length; i++) n += f[i] * f[i];
  return Math.sqrt(n);
};
const stumm = fn => {
  const e = console.error, w = console.warn, l = console.log;
  console.error = console.warn = console.log = () => {};
  try { return fn(); } finally { console.error = e; console.warn = w; console.log = l; }
};
function zufallsBrett(steine, wuerfel = Math.random) {
  const b = new Uint8Array(361);
  for (let i = 0; i < steine; i++) {
    const p = (wuerfel() * 361) | 0;
    if (!b[p]) b[p] = 1 + (i & 1);
  }
  return b;
}

/* Fester Zufallsstrom für den Repro-Lauf. Ohne ihn hing es am Glück, ob der
   Lauf die Divergenz im alten Stand trifft: isoliert fing er sie in 10 von
   10 Läufen, im Dateikontext (nach den Tests darüber, die den Strom
   verschieben) nur in etwa jedem dritten. Ein Regressionstest, der mal
   anschlägt und mal nicht, taugt nichts — also wird gewürfelt, aber
   reproduzierbar. xorshift32, weil zwei Zeilen reichen. */
function festerWuerfel(seed) {
  let z = seed >>> 0 || 1;
  return () => {
    z ^= z << 13; z >>>= 0;
    z ^= z >>> 17;
    z ^= z << 5;  z >>>= 0;
    return z / 4294967296;
  };
}

test('Die Regularisierungs-Parameter sind überhaupt gesetzt', () => {
  /* Der Bug entstand in einer Version, die netGradClip noch nicht kannte.
     Wer die Werte auf 0 stellt, schaltet den Schutz wieder ab — dann soll
     wenigstens dieser Test daran erinnern, bevor die Tests darunter
     stillschweigend nichts mehr prüfen. */
  pruefe(PARAMS.netGradClip    >  0, 'netGradClip ist gesetzt');
  pruefe(PARAMS.netMaxNorm     >  0, 'netMaxNorm ist gesetzt');
  pruefe(PARAMS.netWeightDecay >= 0, 'netWeightDecay ist definiert');
});

test('Gradienten-Deckel begrenzt den Schritt auch bei riesigen Aktivierungen', () => {
  /* Das ist der Motor der Divergenz: das W2-Update ist dL·hidden. dL bleibt
     klein (≤ |lr|), hidden wuchs ungebremst mit W1 mit — also wuchs das
     Produkt. Der Deckel muss genau dieses Produkt fangen. */
  stumm(() => netz.reset());
  const inp    = netz.boardToInput(zufallsBrett(30), 1, null, null);
  const probs  = new Float32Array(netz.OUT).fill(1 / netz.OUT);
  const hidden = new Float32Array(netz.HID).fill(5000);   /* teildivergiertes Netz */

  const vorher = Float32Array.from(netz.W2);
  pruefe(netz._backward(inp, hidden, probs, 42, -1.8), 'Schritt wurde ausgeführt');

  let d = 0;
  for (let i = 0; i < netz.W2.length; i++) { const x = netz.W2[i] - vorher[i]; d += x * x; }
  d = Math.sqrt(d);
  pruefe(Number.isFinite(d), 'das Update ist finit');
  pruefe(d <= PARAMS.netGradClip * 1.001,
    `‖ΔW2‖ = ${d.toExponential(3)} überschreitet den Deckel ${PARAMS.netGradClip}`);
  pruefeFinit(netz.W2, 'W2 nach dem Schritt');
});

test('Max-Norm-Projektion deckelt den Zustand, nicht nur den Schritt', () => {
  stumm(() => netz.reset());
  const grenze1 = PARAMS.netMaxNorm * netz._normRef1;
  const grenze2 = PARAMS.netMaxNorm * netz._normRef2;

  /* Gewichte weit über die Grenze aufblasen und eine Partie abschließen */
  netz.W1.fill(1); netz.W2.fill(1);
  pruefe(norm(netz.W1, netz.b1) > grenze1, 'Startzustand liegt über der Grenze');

  const inp    = netz.boardToInput(zufallsBrett(30), 1, null, null);
  const probs  = new Float32Array(netz.OUT).fill(1 / netz.OUT);
  const hidden = new Float32Array(netz.HID).fill(0.5);
  netz._gameBuffer = [{inp, probs, hidden, moveIdx: 7}];
  stumm(() => netz.trainGame(1));

  pruefeNah(norm(netz.W1, netz.b1), grenze1, grenze1 * 1e-3, '‖W1,b1‖ auf die Grenze projiziert');
  pruefeNah(norm(netz.W2, netz.b2), grenze2, grenze2 * 1e-3, '‖W2,b2‖ auf die Grenze projiziert');
  pruefeFinit(netz.W1, 'W1 finit');
});

test('Negativer Advantage wird unterhalb 1/361 gedämpft statt weiterzudrücken', () => {
  /* Unterhalb der Gleichverteilung ist an einem Zug nichts mehr zu
     verlernen — dort trieb der ungedämpfte Schritt die Divergenz. */
  stumm(() => netz.reset());
  const inp    = netz.boardToInput(zufallsBrett(30), 1, null, null);
  const hidden = new Float32Array(netz.HID).fill(0.5);

  const schrittweite = (pZug, reward) => {
    const probs = new Float32Array(netz.OUT).fill((1 - pZug) / (netz.OUT - 1));
    probs[9] = pZug;
    const vorher = Float32Array.from(netz.b2);
    netz._backward(inp, hidden, probs, 9, reward);
    let d = 0;
    for (let i = 0; i < netz.b2.length; i++) { const x = netz.b2[i] - vorher[i]; d += x * x; }
    netz.b2.set(vorher);
    return Math.sqrt(d);
  };

  const boden = 1 / netz.OUT;
  const ueber = schrittweite(boden * 4, -1);
  const unter = schrittweite(boden / 100, -1);
  pruefe(unter < ueber, 'unterhalb des Bodens ist der Schritt kleiner');
  pruefeNah(unter / ueber, 0.01, 0.005, 'die Dämpfung ist proportional zu p/Boden');

  /* Positiver Advantage bleibt unangetastet — dort bremst (1−p) von selbst. */
  const posUeber = schrittweite(boden * 4, 1);
  const posUnter = schrittweite(boden / 100, 1);
  pruefeNah(posUnter / posUeber, 1, 0.05, 'positiver Advantage wird nicht gedämpft');
});

test(`Selbstspiel-Training bleibt stabil (${PARTIEN} Partien × ${ZUEGE} Züge, reines Rauschen)`, () => {
  /* Der ursprüngliche Repro. Das Ziel ist absichtlich zufällig, also für das
     Netz nicht lernbar — der Worst Case, in dem das Trainingssignal nie
     schwächer wird. Vor dem Fix erzeugte er in 5 von 6 Läufen nicht-finite
     Float32-Gewichte binnen 30 Partien — mit der Standardgröße dieses Tests
     in 6 von 6. */
  /* reset() zieht selbst 554 000 Zufallszahlen — deshalb erst den festen
     Strom setzen, dann zurücksetzen, damit auch die Startgewichte gleich
     sind. Nach dem Test wird Math.random wieder freigegeben. */
  const echterZufall = Math.random;
  Math.random = festerWuerfel(SEED);
  try {
  stumm(() => netz.reset());

  /* Zwei Grenzen, und die zweite ist die wichtigere.

     Die Max-Norm-Grenze gibt es erst seit dem Fix; fehlt sie, wäre der Test
     zahnlos. Genau das ist passiert: am Stand vor dem Fix lief ‖W1,b1‖ auf
     603 hoch — 65× Initialisierung, also offensichtlich divergiert — und der
     Test war trotzdem grün, weil kein einziger Wert NaN geworden war.
     Deshalb zusätzlich eine Grenze, die auf BEIDEN Ständen gilt und nichts
     vom Fix voraussetzt: das Zehnfache der gemessenen Startnorm. Ein
     Training, das die Gewichte um eine Größenordnung aufbläst, ist kaputt,
     egal wie es dazu kam. */
  const start1 = norm(netz.W1, netz.b1), start2 = norm(netz.W2, netz.b2);
  const fixGrenze1 = Number.isFinite(netz._normRef1) ? PARAMS.netMaxNorm * netz._normRef1 : Infinity;
  const fixGrenze2 = Number.isFinite(netz._normRef2) ? PARAMS.netMaxNorm * netz._normRef2 : Infinity;
  const grenze1 = Math.min(fixGrenze1, start1 * 10);
  const grenze2 = Math.min(fixGrenze2, start2 * 10);

  for (let g = 1; g <= PARTIEN; g++) {
    const brett = zufallsBrett(20);
    const buffer = [];
    for (let m = 0; m < ZUEGE; m++) {
      const p = (Math.random() * 361) | 0;
      if (!brett[p]) brett[p] = 1 + (m & 1);
      const inp = netz.boardToInput(brett, 1 + (m & 1), null, null);
      const r = netz.forward(inp);
      pruefeFinit(r.probs, `Partie ${g}, Zug ${m}: Wahrscheinlichkeiten`);
      buffer.push({inp, probs: r.probs, hidden: r.hidden,
                   moveIdx: (Math.random() * 361) | 0});
    }
    netz._gameBuffer = buffer;
    stumm(() => netz.trainGame(Math.random() < 0.5 ? 1 : -1));

    pruefeFinit(netz.W1, `Partie ${g}: W1`);
    pruefeFinit(netz.W2, `Partie ${g}: W2`);
    pruefe(norm(netz.W1, netz.b1) <= grenze1 * 1.001,
      `Partie ${g}: ‖W1,b1‖ = ${norm(netz.W1, netz.b1).toFixed(1)} über der Grenze ${grenze1.toFixed(1)}`);
    pruefe(norm(netz.W2, netz.b2) <= grenze2 * 1.001,
      `Partie ${g}: ‖W2,b2‖ = ${norm(netz.W2, netz.b2).toFixed(1)} über der Grenze ${grenze2.toFixed(1)}`);
    pruefe(netz._healthy !== false, `Partie ${g}: das Netz hat sich als divergiert abgemeldet`);
  }
  console.log(`     Seed ${SEED} · ‖W1,b1‖ ${norm(netz.W1, netz.b1).toFixed(2)} / ${grenze1.toFixed(1)}`
    + ` · ‖W2,b2‖ ${norm(netz.W2, netz.b2).toFixed(2)} / ${grenze2.toFixed(1)}`
    + ` (Start ${start1.toFixed(2)} / ${start2.toFixed(2)})`);
  } finally { Math.random = echterZufall; }
});

laufeTests('Trainings-Stabilität des Policy-Netzes')
  .then(ok => process.exit(ok ? 0 : 1));
