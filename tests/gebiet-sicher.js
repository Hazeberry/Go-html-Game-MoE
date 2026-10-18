// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gebiet mit Sicherheit (gebietSicher, setzeLebensurteil; docs/gebiet-sicher.md).

     1. Default 0. Bitgenau wie vorher: mit Urteil bei 0, ohne Urteil bei 1
        und mit leerem Urteil bei 1 spielt getAIMove denselben Zug mit
        derselben Info.
     2. lsNach: tote Steine zählen für den Gegner (bei 2 nicht); die eigene kritische
        Gruppe bleibt nur am Verteidigungspunkt, die fremde fällt nur am
        Angriffspunkt; ein neuer Stein an weggefallenen Steinen fällt mit.
     3. Der Gebietsterm in evaluateMove ist genau gebietZug × Änderung der
        Bouzy-Bilanz ohne die weggefallenen Steine, gegen die Wurzel ohne
        tote Steine, als hätte der Ziehende gepasst (nachgerechnet mit der
        nicht inkrementellen bouzyBilanz).
     4. Mit einer eigenen kritischen Gruppe sackt kein Zug ab (daran
        scheiterte die Pass-Prüfung, docs/gebiet-sicher.md §7), der
        Verteidigungspunkt gewinnt.
     5. urteilAusGtp liest GNU Gos dragon_status und dragon_stones.

   Aufruf:  node tests/gebiet-sicher.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const {urteilAusGtp} = require(path.join(__dirname, '..', 'auswertung', 'lebensurteil.js'));

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {PARAMS, BOARD_SIZE, NEIGHBORS, getAIMove, removeDeadGroups, floodFill, evaluateMove, buildCrisisMap,
       primeAreaCache, primeEndTieBreak, bouzyBilanz, getCrisisWeight, setzeLebensurteil, lsNach} = KI;
const N = BOARD_SIZE;

function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  let seed = 7; const r = Math.random;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  try { return fn(); } finally { Object.assign(PARAMS, alt); Math.random = r; }
}
const zug = (b, farbe, mc, kv) => mit({mctsFixedSims: 60, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, ...kv},
  () => getAIMove(new Uint8Array(b), farbe, [], {1: 0, 2: 0}, mc, 'hard', 1, null, null));

function stellung(bis) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', 'laufkampf-211.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g; const b = new Uint8Array(N); let m, t = 0;
  while ((m = re.exec(txt)) && t++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; removeDeadGroups(b, 3 - f, i);
  }
  return b;
}

/* Ketten einer Farbe, größte zuerst */
function ketten(b, farbe) {
  const ges = new Uint8Array(N), aus = [];
  for (let i = 0; i < N; i++) if (b[i] === farbe && !ges[i]) {
    const ff = floodFill(b, i); for (const s of ff.group) ges[s] = 1; aus.push(ff);
  }
  return aus.sort((x, y) => y.group.length - x.group.length);
}

/* Ein Urteil zum Testen: zweitgrößte weiße Kette tot, größte schwarze und
   drittgrößte weiße Kette kritisch, Angriffs- und Verteidigungspunkt je an
   einer ihrer Freiheiten. */
function testUrteil(b) {
  const w = ketten(b, 2), s = ketten(b, 1);
  const tot = new Uint8Array(N), toteSteine = [];
  for (const q of w[1].group) { tot[q] = 2; toteSteine.push(q); }
  const krit = [
    {farbe: 1, steine: s[0].group.slice(), angriff: s[0].liberties[0], verteidigung: s[0].liberties[1]},
    {farbe: 2, steine: w[2].group.slice(), angriff: w[2].liberties[0], verteidigung: w[2].liberties[1]},
  ];
  return {tot, toteSteine, krit};
}

test('Default gebietSicher 0; bitgenau ohne Urteil, mit Urteil bei 0, mit leerem Urteil', () => {
  pruefeGleich(PARAMS.gebietSicher, 0, 'Default');
  for (const bis of [60, 120, 211]) {
    const b = stellung(bis), u = testUrteil(b);
    setzeLebensurteil(null);
    const ref = zug(b, 1, bis, {});
    const vgl = (z, was) => {
      pruefeGleich(`${z.type} ${z.x},${z.y}`, `${ref.type} ${ref.x},${ref.y}`, `${was}: Zug`);
      pruefeGleich(z.info, ref.info, `${was}: Info`);
    };
    vgl(zug(b, 1, bis, {gebietSicher: 1}), `Zug ${bis}, ohne Urteil, 1`);
    setzeLebensurteil(u);
    vgl(zug(b, 1, bis, {gebietSicher: 0}), `Zug ${bis}, mit Urteil, 0`);
    setzeLebensurteil({tot: new Uint8Array(N), toteSteine: [], krit: []});
    vgl(zug(b, 1, bis, {gebietSicher: 1}), `Zug ${bis}, leeres Urteil, 1`);
  }
  setzeLebensurteil(null);
});

test('lsNach: tote weg, kritische je nach Zug, angehängter Stein fällt mit', () => {
  const b = stellung(120), u = testUrteil(b);
  setzeLebensurteil(u);
  PARAMS.gebietSicher = 1;
  try {
    const nach = (i, c) => { const nb = new Uint8Array(b); nb[i] = c; removeDeadGroups(nb, 3 - c, i); return lsNach(nb, i, c); };
    const [ks, kw] = u.krit;
    const steht = (x, steine) => steine.every(q => x[q] !== 0);
    const weg = (x, steine) => steine.every(q => x[q] === 3 - b[q]);   /* umgefärbt */
    /* Schwarz verteidigt seine kritische Gruppe: bleibt; Weiß' kritische bleibt */
    let x = nach(ks.verteidigung, 1);
    pruefe(weg(x, u.toteSteine), 'tote Steine weg');
    pruefe(steht(x, ks.steine), 'schwarze kritische Gruppe bleibt am Verteidigungspunkt');
    pruefe(steht(x, kw.steine), 'weiße kritische Gruppe bleibt');
    /* Schwarz greift die weiße kritische Gruppe an: seine eigene fällt, die weiße auch */
    if (kw.angriff !== ks.verteidigung) {
      x = nach(kw.angriff, 1);
      pruefe(weg(x, ks.steine), 'schwarze kritische fällt ohne Verteidigung');
      pruefe(weg(x, kw.steine), 'weiße kritische fällt am Angriffspunkt');
    }
    /* Weiß zieht: seine kritische bleibt nur am Verteidigungspunkt */
    x = nach(kw.verteidigung, 2);
    pruefe(steht(x, kw.steine), 'weiße kritische bleibt, wenn Weiß verteidigt');
    pruefe(steht(x, ks.steine), 'schwarze kritische bleibt, wenn Weiß nicht angreift');
    /* Ein schwarzer Stein an der schwarzen kritischen Gruppe, nicht am
       Verteidigungspunkt: fällt mit */
    const anders = ketten(b, 1)[0].liberties.find(q => q !== ks.verteidigung && q !== kw.angriff);
    if (anders !== undefined) {
      x = nach(anders, 1);
      pruefeGleich(x[anders], 2, 'angehängter Stein fällt mit der Gruppe');
    }
    /* Ein Stein weit weg von allem Weggefallenen bleibt */
    let frei = -1;
    for (let i = 0; i < N && frei < 0; i++) {
      if (b[i]) continue;
      const nb = new Uint8Array(b); nb[i] = 1; removeDeadGroups(nb, 2, i);
      if (NEIGHBORS[i].every(q => !nb[q])) frei = i;
    }
    pruefe(frei >= 0, 'freier Punkt gefunden');
    pruefeGleich(nach(frei, 1)[frei], 1, 'freier Stein bleibt');
    /* Bei 2 bleiben die toten Steine, die kritischen wirken wie bei 1 */
    PARAMS.gebietSicher = 2;
    x = nach(ks.verteidigung, 1);
    pruefe(steht(x, u.toteSteine), 'bei 2: tote Steine bleiben');
    if (kw.angriff !== ks.verteidigung) pruefe(weg(nach(kw.angriff, 1), ks.steine), 'bei 2: kritische wie bei 1');
  } finally { PARAMS.gebietSicher = 0; setzeLebensurteil(null); }
});

test('evaluateMove: Gebietsterm = gebietZug × Bilanzänderung mit Urteil (nicht inkrementell nachgerechnet)', () => {
  const b = stellung(60), u = testUrteil(b), farbe = 1, mc = 60;
  const ohneTote = new Uint8Array(b);
  for (const s of u.toteSteine) ohneTote[s] = 3 - u.tot[s];
  const wert = (sicher, i) => {
    PARAMS.gebietSicher = sicher;
    setzeLebensurteil(sicher ? u : null);
    buildCrisisMap(b, farbe); primeAreaCache(b, farbe); primeEndTieBreak(b);
    const r = Math.random; Math.random = () => 0;
    try { return evaluateMove(b, i, farbe, mc, 200); } finally { Math.random = r; }
  };
  const kand = [u.krit[0].verteidigung, u.krit[0].angriff, u.krit[1].angriff, u.krit[1].verteidigung];
  for (let i = 0; i < N && kand.length < 30; i += 11) if (!b[i]) kand.push(i);
  let geprueft = 0;
  try {
    for (const i of kand) {
      if (i < 0 || b[i]) continue;
      const nb = new Uint8Array(b); nb[i] = farbe;
      removeDeadGroups(nb, 2, i);
      if (floodFill(nb, i).liberties.length === 0) continue;
      const w0 = wert(0, i), w1 = wert(1, i);
      if (getCrisisWeight(i) !== 0) continue;
      const mitU = bouzyBilanz(lsNach(nb, i, farbe)) - bouzyBilanz(lsNach(ohneTote, -1, farbe));
      const ohneU = bouzyBilanz(nb) - bouzyBilanz(b);
      pruefe(Math.abs((w1 - w0) - PARAMS.gebietZug * (mitU - ohneU)) < 1e-6,
        `Kandidat ${i}: Differenz ${w1 - w0}, erwartet ${PARAMS.gebietZug * (mitU - ohneU)}`);
      geprueft++;
    }
  } finally { PARAMS.gebietSicher = 0; setzeLebensurteil(null); }
  pruefe(geprueft >= 10, `genug Kandidaten geprüft (${geprueft})`);
});

test('nur eine eigene kritische Gruppe: kein Zug sackt ab, der Verteidigungspunkt gewinnt', () => {
  /* Vor §7 verlor jeder Zug außer dem Verteidigungspunkt den ganzen Wert
     der Gruppe, und die Pass-Prüfung passte. */
  const b = stellung(120), farbe = 1, s = ketten(b, 1)[0];
  const u = {tot: new Uint8Array(N), toteSteine: [], krit: [{farbe, steine: s.group.slice(), angriff: s.liberties[0], verteidigung: s.liberties[1]}]};
  const wert = (sicher, i) => {
    PARAMS.gebietSicher = sicher; setzeLebensurteil(sicher ? u : null);
    buildCrisisMap(b, farbe); primeAreaCache(b, farbe); primeEndTieBreak(b);
    const r = Math.random; Math.random = () => 0;
    try { return evaluateMove(b, i, farbe, 120, 200); } finally { Math.random = r; }
  };
  let n = 0;
  try {
    for (let i = 0; i < N; i += 3) {
      if (b[i] || i === u.krit[0].verteidigung) continue;
      const nb = new Uint8Array(b); nb[i] = farbe; removeDeadGroups(nb, 2, i);
      if (floodFill(nb, i).liberties.length === 0) continue;
      const d = wert(1, i) - wert(0, i);
      pruefe(d >= -5 * PARAMS.gebietZug, `Zug ${i} sackt ab um ${d}`);
      n++;
    }
    const v = wert(1, u.krit[0].verteidigung) - wert(0, u.krit[0].verteidigung);
    pruefe(v > 0, `Verteidigungspunkt gewinnt (${v})`);
  } finally { PARAMS.gebietSicher = 0; setzeLebensurteil(null); }
  pruefe(n > 50, `genug Züge (${n})`);
});

test('urteilAusGtp liest dragon_status und dragon_stones', () => {
  const L = 'ABCDEFGHJ';
  const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (9 - +s.slice(1)) * 9 + L.indexOf(s[0]); };
  const b = new Uint8Array(81);
  for (const v of ['A2', 'B2', 'C2', 'C1', 'D3']) b[vonGtp(v)] = 1;
  for (const v of ['A3', 'B3', 'C3', 'D2', 'D1', 'E5', 'A1']) b[vonGtp(v)] = 2;
  /* Antworten von GNU Go 3.8 auf diese Stellung (9×9) */
  const status = 'E5: alive\nA3: alive\nD3: critical D4 E3\nA2: dead\nA1: critical B1 B1';
  const steine = 'E5\nA3 B3 C3 D2 D1\nD3\nA2 B2 C2 C1\nA1';
  const u = urteilAusGtp(status, steine, b, vonGtp);
  pruefeGleich(u.toteSteine.slice().sort((x, y) => x - y).join(), ['A2', 'B2', 'C2', 'C1'].map(vonGtp).sort((x, y) => x - y).join(), 'tote Steine');
  pruefe(u.toteSteine.every(s => u.tot[s] === 1), 'Farbe der toten Steine');
  pruefeGleich(u.krit.length, 2, 'zwei kritische');
  pruefeGleich(JSON.stringify(u.krit[0]), JSON.stringify({farbe: 1, steine: [vonGtp('D3')], angriff: vonGtp('D4'), verteidigung: vonGtp('E3')}), 'D3 kritisch');
  pruefeGleich(u.krit[1].farbe, 2, 'A1 weiß');
  pruefeGleich(urteilAusGtp('', '', b, vonGtp).krit.length, 0, 'leere Antwort');
});

laufeTests('Gebiet mit Sicherheit (gebietSicher)').then(ok => process.exit(ok ? 0 : 1));
