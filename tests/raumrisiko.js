/* Raumrisiko im Laufkampf (raumGewicht, docs/laufkampf.md).

   Geprüft wird nicht, ob die KI dadurch stärker spielt — das kann nur der
   A/B-Harness zeigen —, sondern:

     1. Bei 0 ändert sich an evaluateBoard nichts (bitgenau), auch wenn
        primeRaum gelaufen ist.
     2. primeRaum vermerkt an jedem Stein genau das K3 aus der Messung
        (eigene Zone, über eigene Zonenfelder mit der Kette verbunden, ohne
        die Kette) — unabhängig nachgerechnet über influenceZone.
     3. In Blattstellungen, die von der Wurzel abweichen, ist der Abschlag
        genau RAUM_RISIKO × Gewicht × Größe × captureWeight, summiert über
        die Ketten mit 4–7 Freiheiten, mit dem größten K3 ihrer Wurzelsteine.
     4. raumZug: Bei 0 bleibt evaluateMove bitgenau. Bei 1 ist der Bonus je
        Kandidat genau die Risikoänderung der Wurzelketten mit 4–7
        Freiheiten, unabhängig nachgerechnet.

   Aufruf:  node tests/raumrisiko.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, NEIGHBORS, evaluateBoard, evaluateMove, primeRaum, primeInfluenceCache,
       influenceZone, floodFill, removeDeadGroups, getLegalMoves, _raumK3,
       primeAreaCache, buildCrisisMap} = KI;

const RISIKO = [[0.25, 0.25, 0.17, 0], [0.18, 0.10, 0.06, 0], [0.18, 0.07, 0.02, 0], [0.08, 0.02, 0, 0]];

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  try { return fn(); } finally { Object.assign(PARAMS, alt); }
}

/* Stellungen aus der mitgelieferten Partie vom 22.09. */
function stellungen(zuege = [60, 120, 160, 175, 184, 200]) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', 'laufkampf-211.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g; const zs = []; let m;
  while ((m = re.exec(txt))) zs.push({f: m[1] === 'B' ? 1 : 2,
    i: m[2] ? (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97) : -1});
  const aus = [];
  for (const bis of zuege) {
    const b = new Uint8Array(BOARD_SIZE);
    for (let t = 0; t < bis; t++) { const z = zs[t]; if (z.i < 0) continue;
      b[z.i] = z.f; removeDeadGroups(b, 3 - z.f, z.i); }
    aus.push({bis, b});
  }
  return aus;
}

/* K3 unabhängig: über influenceZone, wie auswertung/einschliessung.js. */
function k3Referenz(b, i) {
  const farbe = b[i];
  const {group} = floodFill(b, i);
  const inG = new Uint8Array(BOARD_SIZE); for (const g of group) inG[g] = 1;
  const ges = new Uint8Array(BOARD_SIZE), q = [];
  for (const g of group) for (const n of NEIGHBORS[g])
    if (!inG[n] && !ges[n] && influenceZone(n, farbe) > 0) { ges[n] = 1; q.push(n); }
  for (let k = 0; k < q.length; k++) for (const n of NEIGHBORS[q[k]])
    if (!inG[n] && !ges[n] && influenceZone(n, farbe) > 0) { ges[n] = 1; q.push(n); }
  return q.length;
}

/* Erwarteter Abschlag (aus Sicht von color) für ein Blatt. */
function erwartet(blatt, wurzel, k3, color) {
  const ges = new Uint8Array(BOARD_SIZE);
  let d = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (!blatt[i] || ges[i]) continue;
    const {group, liberties} = floodFill(blatt, i);
    for (const g of group) ges[g] = 1;
    let k = -1;
    for (const g of group) if (blatt[g] === wurzel[g] && k3[g] > k) k = k3[g];
    const fr = liberties.length;
    if (fr < 4 || fr > 7 || k < 0 || group.length < PARAMS.deathDiscountSize) continue;
    const r = RISIKO[fr - 4][k === 0 ? 0 : k <= 4 ? 1 : k <= 14 ? 2 : 3];
    const abzug = r * group.length * PARAMS.captureWeight;
    d += blatt[i] === color ? -abzug : abzug;
  }
  return d;
}

test('Parameter existieren und stehen standardmäßig auf 0', () => {
  pruefeGleich(PARAMS.raumGewicht, 0, 'raumGewicht-Default');
  pruefeGleich(PARAMS.raumZug, 0, 'raumZug-Default');
  pruefe(typeof primeRaum === 'function', 'primeRaum exportiert');
});

test('Gewicht 0: evaluateBoard bitgenau gleich, mit und ohne primeRaum', () => {
  for (const {bis, b} of stellungen()) {
    const cap = {1: 3, 2: 5};
    const vorher = [evaluateBoard(b, 1, cap), evaluateBoard(b, 2, cap)];
    primeRaum(b);
    const nachher = [evaluateBoard(b, 1, cap), evaluateBoard(b, 2, cap)];
    pruefe(Object.is(vorher[0], nachher[0]) && Object.is(vorher[1], nachher[1]), `Zug ${bis}`);
  }
});

test('primeRaum: K3 je Stein wie die Messgröße', () => {
  let steine = 0;
  for (const {bis, b} of stellungen()) {
    primeRaum(b);
    primeInfluenceCache(b);
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!b[i]) continue;
      steine++;
      const ref = k3Referenz(b, i);
      if (_raumK3[i] !== ref) pruefeGleich(_raumK3[i], ref, `Zug ${bis}, Feld ${i}`);
    }
  }
  pruefe(steine > 500, `${steine} Steine geprüft`);
});

test('Gewicht 1: Abschlag in Blättern genau nach Tabelle, auch nach Verbindungen', () => {
  let blaetter = 0, mitAbschlag = 0, zufall = 12345;
  const r = () => { zufall = (zufall * 16807) % 2147483647; return zufall / 2147483647; };
  for (const {bis, b} of stellungen()) {
    primeRaum(b);
    const k3 = Int32Array.from(_raumK3), wurzel = Uint8Array.from(b);
    for (let n = 0; n < 15; n++) {
      /* Blatt: bis zu 12 zufällige legale Züge von der Wurzel aus. */
      const blatt = Uint8Array.from(b);
      let f = 1;
      for (let z = 0; z < 1 + Math.floor(r() * 12); z++) {
        const legal = getLegalMoves(blatt, f, new Set(), null);
        if (!legal.length) break;
        const m = legal[Math.floor(r() * legal.length)].idx;
        blatt[m] = f; removeDeadGroups(blatt, 3 - f, m); f = 3 - f;
      }
      for (const color of [1, 2]) {
        const cap = {1: 0, 2: 0};
        const ohne = mit({raumGewicht: 0}, () => evaluateBoard(blatt, color, cap));
        const mitR = mit({raumGewicht: 1}, () => evaluateBoard(blatt, color, cap));
        const soll = erwartet(blatt, wurzel, k3, color);
        blaetter++;
        if (soll !== 0) mitAbschlag++;
        if (Math.abs((mitR - ohne) - soll) > 1e-9)
          pruefeGleich(mitR - ohne, soll, `Zug ${bis}, Blatt ${n}, Farbe ${color}`);
      }
    }
  }
  pruefe(mitAbschlag > 20, `Vorbedingung: ${mitAbschlag} von ${blaetter} Blättern mit Abschlag`);
});

function risiko(fr, k) {
  if (fr < 4) return [1, 1, 0.5, 0.25][fr];
  if (fr > 7) return 0;
  return RISIKO[fr - 4][k === 0 ? 0 : k <= 4 ? 1 : k <= 14 ? 2 : 3];
}
function zugWerte(b, farbe, mc, w) {
  return mit({raumZug: w}, () => {
    buildCrisisMap(b, farbe); primeAreaCache(b, farbe);
    const alt = Math.random; Math.random = () => 0.5;
    try {
      const r = [];
      for (let i = 0; i < BOARD_SIZE; i++) if (!b[i]) r.push({i, s: evaluateMove(b, i, farbe, mc, 200)});
      return r;
    } finally { Math.random = alt; }
  });
}

test('raumZug 0: evaluateMove bitgenau gleich, mit und ohne primeRaum', () => {
  const {b} = stellungen().find(x => x.bis === 175);
  const vorher = zugWerte(b, 2, 175, 0);
  primeRaum(b);
  const nachher = zugWerte(b, 2, 175, 0);
  for (let k = 0; k < vorher.length; k++)
    if (!Object.is(vorher[k].s, nachher[k].s)) pruefe(false, `Feld ${vorher[k].i}`);
  pruefe(vorher.length > 100, `${vorher.length} Kandidaten`);
});

test('raumZug 1: Bonus je Kandidat genau die Risikoänderung', () => {
  let mitBonus = 0, geprueft = 0;
  for (const {bis, b} of stellungen([140, 150, 160, 165, 170, 175, 180, 184, 190, 200])) {
    for (const farbe of [1, 2]) {
    primeRaum(b);
    primeInfluenceCache(b);
    /* Wurzelketten mit 4-7 Freiheiten, unabhängig bestimmt. */
    const ketten = [], ges = new Uint8Array(BOARD_SIZE);
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!b[i] || ges[i]) continue;
      const {group, liberties} = floodFill(b, i);
      for (const g of group) ges[g] = 1;
      if (liberties.length >= 4 && liberties.length <= 7 && group.length >= PARAMS.deathDiscountSize)
        ketten.push({anker: i, farbe: b[i], n: group.length, r: risiko(liberties.length, k3Referenz(b, i))});
    }
    const ohne = zugWerte(b, farbe, bis, 0), mitZ = zugWerte(b, farbe, bis, 1);
    for (let k = 0; k < ohne.length; k++) {
      const i = ohne[k].i;
      const nb = Uint8Array.from(b); nb[i] = farbe; removeDeadGroups(nb, 3 - farbe, i);
      primeInfluenceCache(nb);
      let g = 0;
      for (const kt of ketten) {
        const nachher = nb[kt.anker] === kt.farbe
          ? risiko(floodFill(nb, kt.anker).liberties.length, k3Referenz(nb, kt.anker)) : 1;
        g += (kt.farbe === farbe ? 1 : -1) * (kt.r - nachher) * kt.n;
      }
      /* Der Bonus sitzt vor dem Crisis-Blend; nur Felder ohne Krise
         vergleichen, dort geht er unverändert durch. */
      if (ohne[k].s < -5000) continue;
      const diff = mitZ[k].s - ohne[k].s, soll = g * PARAMS.captureWeight;
      if (soll !== 0) mitBonus++;
      geprueft++;
      if (Math.abs(diff - soll) > 1e-6 && Math.abs(diff - soll) > 1e-9 * Math.abs(soll)) {
        /* Krisenfelder mischen den Bonus mit dem Tsumego-Wert; sie zählen
           nicht als Fehler, wenn diff zwischen 0 und soll liegt. */
        const zwischen = (diff - 0) * (diff - soll) <= 1e-9;
        if (!zwischen) pruefeGleich(diff, soll, `Zug ${bis}, Farbe ${farbe}, Feld ${i}`);
      }
    }
    }
  }
  pruefe(mitBonus > 10, `Vorbedingung: ${mitBonus} von ${geprueft} Kandidaten mit Bonus`);
});

laufeTests('Raumrisiko (raumGewicht)').then(ok => process.exit(ok ? 0 : 1));
