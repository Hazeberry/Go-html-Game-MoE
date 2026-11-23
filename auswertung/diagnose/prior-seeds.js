// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Prior-Messung, zweiter Versuch, nach docs/prior-seeds-vorabfestlegung.md.

   Die 13 Stellungen aus §4, je mit 20 vorab festgelegten Suchseeds, je zwei
   Arme bei identischem blendWeight und identischer Simulationszahl:
     A  echtes policyNet mit W0            der "urspruengliche" Zug
     B  echtes policyNet mit W1            der Befund
     C  Worker-Stummel mit den Priors aus A -- NUR bei einem Zugwechsel (§3.3)

   ZWEI GETRENNTE SEEDS (§3.1). Das ist der Kern dieses Werkzeugs: Im ersten
   Versuch steuerte EIN Seed die Startgewichte, das Training UND die Suche.
   Haette man ihn variiert, waeren W0 und W1 mitvariiert, und der Lauf haette
   eine andere Frage beantwortet.
     netzseed  fest, vor ladeKI gesetzt -- bestimmt Startgewichte und Training
     suchseed  variiert 1..20 -- allein die Suche
   Die Gueltigkeitsregel prueft, dass W0 und W1 ueber alle Seeds byteidentisch
   bleiben (§6 Nr. 5).

   Aufruf:  node auswertung/diagnose/prior-seeds.js [--aus datei.json]
            [--netzseed 7] [--seeds 1-20] [--sims 120] [--blend 0.3]
            [--schritte 6] [--html index.html] */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const wurzel = path.join(__dirname, '..', '..');

const arg = (n, s) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : s; };
const NETZSEED = +arg('netzseed', 7), SIMS = +arg('sims', 120);
const BLEND = +arg('blend', 0.3), SCHRITTE = +arg('schritte', 6);
const AUS = arg('aus', null), HTML = arg('html', path.join(wurzel, 'index.html'));
const SEEDS = (() => {
  const s = String(arg('seeds', '1-20'));
  const m = /^(\d+)-(\d+)$/.exec(s);
  if (m) { const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(i); return a; }
  return s.split(',').map(Number);
})();

/* ── Messanker: die Kandidatenliste ist von aussen nicht abfragbar ──────── */
const ANKER = '  const best = scored[0].score;';
const html = fs.readFileSync(HTML, 'utf8');
if (html.split(ANKER).length !== 2) { console.error('Messanker nicht eindeutig in ' + HTML); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prior-seeds-'));
const htmlAnker = path.join(tmp, 'index-anker.html');
fs.writeFileSync(htmlAnker, html.replace(ANKER,
  '  globalThis.__WURZEL = scored.slice(0, 3).map(s => ({idx: s.m.idx, score: s.score}));\n' + ANKER));

const mulberry32 = seed => { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* netzseed VOR dem Laden: der PolicyNet-Konstruktor zieht die Startgewichte
   beim Auswerten des Blocks (§3.1 und prior-reproduktion §8.1 Nr. 3). */
Math.random = mulberry32(NETZSEED);
const {ladeKI} = require(path.join(wurzel, 'tests', 'rahmen.js'));
const KI = ladeKI({htmlPfad: htmlAnker, mitNetz: true});
const {BOARD_SIZE, removeDeadGroups, PARAMS, getAIMove, computeZobrist} = KI;
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => i < 0 ? 'pass' : SPALTEN[i % 19] + (19 - Math.floor(i / 19));

/* ── die 13 Stellungen aus §4 ──────────────────────────────────────────── */
const STELLUNGEN = [
  ['hand-117.sgf', 60], ['hand-117.sgf', 70],
  ['hand-364.sgf', 60], ['hand-364.sgf', 70],
  ['hand-392.sgf', 60], ['hand-392.sgf', 70], ['hand-392.sgf', 140],
  ['hand-427.sgf', 60], ['hand-427.sgf', 70],
  ['hand-455.sgf', 60], ['hand-455.sgf', 70],
  ['hand-478.sgf', 60], ['hand-478.sgf', 70]
];

function stellung(datei, bis) {
  const txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(BOARD_SIZE), caps = {1: 0, 2: 0};
  let m, k = 0, letzte = null, letzterIdx = -1;
  while ((m = re.exec(txt)) && k < bis) {
    k++;
    if (!m[2]) { letzte = m[1] === 'B' ? 1 : 2; letzterIdx = -1; continue; }
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; caps[f] += removeDeadGroups(b, 3 - f, i); letzte = f; letzterIdx = i;
  }
  return {b, caps, zuege: k, amZug: letzte === null ? 1 : 3 - letzte, letzterIdx};
}

/* ── Gewichtsstaende ───────────────────────────────────────────────────── */
const FELDER = ['W1', 'b1', 'W2', 'b2'];
const sichere = () => ({arr: FELDER.map(f => policyNet[f].slice()), gamesPlayed: policyNet.gamesPlayed,
                        wins: policyNet.wins, lastResult: policyNet.lastResult, healthy: policyNet._healthy});
const spieleZurueck = w => { FELDER.forEach((f, i) => policyNet[f].set(w.arr[i]));
  policyNet.gamesPlayed = w.gamesPlayed; policyNet.wins = w.wins;
  policyNet.lastResult = w.lastResult; policyNet._healthy = w.healthy; };
const fingerabdruck = w => { const h = crypto.createHash('sha256');
  for (const a of w.arr) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.digest('hex'); };

/* ── Training auf echten Merkmalen, mit netzseed ────────────────────────── */
const QUELLEN = [['hand-117.sgf', 60], ['hand-392.sgf', 80], ['hand-427.sgf', 100],
                 ['hand-455.sgf', 60], ['hand-478.sgf', 80], ['hand-364.sgf', 60]];
function trainiere(runden, offset) {
  let n = 0;
  for (let r = 0; r < runden; r++) {
    for (const [d, bis] of QUELLEN) {
      const s = stellung(d, bis);
      const l = s.letzterIdx >= 0 ? {x: s.letzterIdx % 19, y: Math.floor(s.letzterIdx / 19)} : null;
      Math.random = mulberry32(NETZSEED + offset + r);
      const inp = policyNet.boardToInput(s.b, s.amZug, l, null);
      const f = policyNet.forward(inp);
      let best = -1, bp = -Infinity;
      for (let i = 0; i < 361; i++) if (s.b[i] === 0 && f.probs[i] > bp) { bp = f.probs[i]; best = i; }
      policyNet._gameBuffer.push({inp, probs: f.probs, hidden: f.hidden, moveIdx: best});
      n++;
    }
    policyNet.trainGame(r % 2 === 0 ? 1 : -1);
  }
  return n;
}

function ruf(s, suchseed) {
  const lm = s.letzterIdx >= 0 ? {x: s.letzterIdx % 19, y: Math.floor(s.letzterIdx / 19)} : null;
  globalThis.__WURZEL = null;
  Math.random = mulberry32(suchseed);
  const r = getAIMove(new Uint8Array(s.b), s.amZug, [computeZobrist(s.b)], {...s.caps},
                      s.zuege, 'hard', 1, null, lm);
  const w = globalThis.__WURZEL || [];
  return {typ: r && r.type, punkt: r && r.type === 'stone' ? zuGtp(r.y * 19 + r.x) : null,
          kandidaten: w.map(x => ({punkt: zuGtp(x.idx), idx: x.idx, score: +x.score.toFixed(4)})),
          blendWeight: globalThis.policyNet ? globalThis.policyNet.blendWeight : null};
}
const zweimal = (s, seed) => { const a = ruf(s, seed), b = ruf(s, seed);
  return {erg: a, wiederholbar: JSON.stringify(a) === JSON.stringify(b)}; };

/* ── Hauptlauf ─────────────────────────────────────────────────────────── */
PARAMS.mctsFixedSims = SIMS; PARAMS.adaptiveBudgetEnabled = 0; PARAMS.resignEnabled = 0;
PARAMS.mctsTreeReuse = 0;                 /* sonst erbt Arm B den Baum von Arm A */
PARAMS.netWarmup = 2; PARAMS.netMaxBlend = 0;
const echtesNetz = globalThis.policyNet;
const nW0 = trainiere(2, 0);   const W0 = sichere(), fpW0 = fingerabdruck(W0);
const nW1 = trainiere(SCHRITTE, 100); const W1 = sichere(), fpW1 = fingerabdruck(W1);
PARAMS.netMaxBlend = BLEND;

const kopf = {netzseed: NETZSEED, seeds: SEEDS, sims: SIMS, blend: BLEND,
  netWarmup: PARAMS.netWarmup, mctsTreeReuse: PARAMS.mctsTreeReuse,
  htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
  W0: {gamesPlayed: W0.gamesPlayed, wins: W0.wins, beispiele: nW0, sha256: fpW0},
  W1: {gamesPlayed: W1.gamesPlayed, wins: W1.wins, beispiele: nW0 + nW1,
       trainGameAufrufe: 2 + SCHRITTE, sha256: fpW1},
  gewichteVerschieden: fpW0 !== fpW1, divergenzen: policyNet._divergences, gesund: policyNet._healthy};

const paare = [], gewichtsDrift = [];
for (const [datei, bis] of STELLUNGEN) {
  const s = stellung(datei, bis);
  if (s.zuege < bis) { console.error(`${datei} hat weniger als ${bis} Zuege`); process.exit(2); }
  for (const seed of SEEDS) {
    globalThis.policyNet = echtesNetz;
    spieleZurueck(W0);
    if (fingerabdruck(sichere()) !== fpW0) gewichtsDrift.push(`${datei}@${bis}/${seed}: W0`);
    const A = zweimal(s, seed);
    const lm = s.letzterIdx >= 0 ? {x: s.letzterIdx % 19, y: Math.floor(s.letzterIdx / 19)} : null;
    Math.random = mulberry32(seed);
    const priorsA = Array.from(policyNet.forward(policyNet.boardToInput(s.b, s.amZug, lm, null)).probs);

    spieleZurueck(W1);
    if (fingerabdruck(sichere()) !== fpW1) gewichtsDrift.push(`${datei}@${bis}/${seed}: W1`);
    const B = zweimal(s, seed);

    const zugWechsel = A.erg.punkt !== B.erg.punkt || A.erg.typ !== B.erg.typ;
    let C = null, priorsGleich = null;
    if (zugWechsel) {                      /* Arm C nur bei Zugwechsel (§3.3) */
      globalThis.policyNet = {blendWeight: B.erg.blendWeight, _netPriors: Float32Array.from(priorsA)};
      C = zweimal(s, seed);
      priorsGleich = Array.from(globalThis.policyNet._netPriors).every((x, i) => x === priorsA[i]);
      globalThis.policyNet = echtesNetz;
    }
    const kA = A.erg.kandidaten, kB = B.erg.kandidaten;
    paare.push({datei, bis, amZug: s.amZug === 1 ? 'S' : 'W', seed,
      A: A.erg, B: B.erg, C: C && C.erg,
      wiederholbar: {A: A.wiederholbar, B: B.wiederholbar, C: C ? C.wiederholbar : null},
      spitzeWechsel: !(kA.length && kB.length) ? null : kA[0].punkt !== kB[0].punkt,
      zugWechsel,
      zugIstSpitze: !!(kA.length && A.erg.punkt === kA[0].punkt),
      cStelltHer: C ? (C.erg.punkt === A.erg.punkt && C.erg.typ === A.erg.typ) : null,
      priorsGleichEingespeist: priorsGleich});
  }
}

/* ── Auszaehlung je Stellung (§6) ──────────────────────────────────────── */
const jeStellung = STELLUNGEN.map(([datei, bis]) => {
  const g = paare.filter(p => p.datei === datei && p.bis === bis);
  return {stellung: `${datei}@${bis}`, seeds: g.length,
          spitzeWechsel: g.filter(p => p.spitzeWechsel).length,
          zugWechsel: g.filter(p => p.zugWechsel).length,
          zugIstSpitze: g.filter(p => p.zugIstSpitze).length,
          cStelltHer: g.filter(p => p.zugWechsel && p.cStelltHer).length};
});
const summe = jeStellung.reduce((a, z) => ({seeds: a.seeds + z.seeds,
  spitzeWechsel: a.spitzeWechsel + z.spitzeWechsel, zugWechsel: a.zugWechsel + z.zugWechsel,
  zugIstSpitze: a.zugIstSpitze + z.zugIstSpitze, cStelltHer: a.cStelltHer + z.cStelltHer}),
  {seeds: 0, spitzeWechsel: 0, zugWechsel: 0, zugIstSpitze: 0, cStelltHer: 0});

/* ── Gueltigkeit (§6) ──────────────────────────────────────────────────── */
const gruende = [];
if (!kopf.gewichteVerschieden) gruende.push('W0 und W1 byteidentisch (§6 Nr. 6)');
if (kopf.divergenzen > 0) gruende.push(`Divergenzen: ${kopf.divergenzen} (§6 Nr. 2)`);
if (!kopf.gesund) gruende.push('Netz gilt als krank (§6 Nr. 2)');
for (const d of gewichtsDrift) gruende.push(`Gewichte nicht byteidentisch ueber die Seeds: ${d} (§6 Nr. 5)`);
for (const p of paare) {
  const o = `${p.datei}@${p.bis} seed ${p.seed}`;
  for (const arm of ['A', 'B', 'C'])
    if (p.wiederholbar[arm] === false) gruende.push(`${o}: Arm ${arm} nicht wiederholbar (§6 Nr. 4)`);
  const bws = [p.A.blendWeight, p.B.blendWeight].concat(p.C ? [p.C.blendWeight] : []);
  if (bws.some(x => !(x > 0))) gruende.push(`${o}: blendWeight 0 (§6 Nr. 1) [${bws}]`);
  if (new Set(bws).size !== 1) gruende.push(`${o}: blendWeight weicht ab (§6 Nr. 1) [${bws}]`);
  if (p.priorsGleichEingespeist === false) gruende.push(`${o}: eingespeiste Priors nicht gleich (§6 Nr. 3)`);
}
const gueltig = gruende.length === 0;
const urteil = !gueltig ? 'KEIN URTEIL'
  : summe.cStelltHer > 0 ? 'Nachstellung bricht'
  : summe.zugWechsel > 0 ? 'Zugwechsel, aber Arm C stellt nicht her'
  : summe.spitzeWechsel > 0 ? 'Nur Spitzenwechsel'
  : 'Kein Unterschied';

const bericht = {kopf, gueltig, gruende, jeStellung, summe, urteil, paare};
if (AUS) {
  const v = path.join(tmp, 'bericht.json');
  fs.writeFileSync(v, JSON.stringify(bericht, null, 1));
  fs.mkdirSync(path.dirname(path.resolve(AUS)), {recursive: true});
  fs.copyFileSync(v, AUS);
  console.log('geschrieben: ' + AUS);
}
console.log(JSON.stringify({kopf, gueltig, gruende: gruende.slice(0, 8), jeStellung, summe, urteil}, null, 1));
fs.rmSync(tmp, {recursive: true, force: true});
process.exit(gueltig ? 0 : 1);
