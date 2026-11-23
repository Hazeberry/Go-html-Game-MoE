// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Prior-Messung nach docs/prior-reproduktion-vorabfestlegung.md §4.

   Drei Arme auf denselben Stellungen, mit identischem Seed, identischer
   Simulationszahl und identischem blendWeight:
     A  echtes policyNet mit W0 (gamesPlayed 2)            -> der "Originalzug"
     B  echtes policyNet mit W1 = W0 plus weitere Schritte -> der Befund
     C  Worker-Stummel mit den in A aufgezeichneten Priors -> rettet netPriors?

   Warum ein Messanker: Die Kandidatenliste der Wurzel ist von aussen nicht
   abfragbar. Der Anker ist eine Zeile, die sie herausreicht und nichts
   veraendert -- dasselbe Vorgehen wie in auswertung/diagnose/wurzel-replay.js.

   Warum der Seed Pflicht ist: Die Zugbewertung addiert Rauschen bis zu etwa
   4 Punkte je Kandidat (index.html Z. 2476 u.a.). Ohne gesetzten Generator
   vergleicht man Rauschen, nicht Bewertung -- §3.3 der Festlegung.

   Aufruf:  node auswertung/diagnose/prior-reproduktion.js [--aus datei.json]
            [--sims 120] [--seed 7] [--blend 0.1,0.3] [--schritte 6]
            [--stellungen 6] [--html index.html] */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const wurzel = path.join(__dirname, '..', '..');

const arg = (name, std) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : std; };
const SIMS = +arg('sims', 120), SEED = +arg('seed', 7), SCHRITTE = +arg('schritte', 6);
const BLENDS = String(arg('blend', '0.1,0.3')).split(',').map(Number);
const MAX_STELLUNGEN = +arg('stellungen', 0);
const AUS = arg('aus', null);
const HTML = arg('html', path.join(wurzel, 'index.html'));

/* ── Messanker ─────────────────────────────────────────────────────────── */
const ANKER = '  const best = scored[0].score;';
let html = fs.readFileSync(HTML, 'utf8');
if (html.split(ANKER).length !== 2) { console.error('Messanker nicht eindeutig in ' + HTML); process.exit(2); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prior-repro-'));
const htmlAnker = path.join(tmp, 'index-anker.html');
fs.writeFileSync(htmlAnker, html.replace(ANKER,
  '  globalThis.__WURZEL = scored.slice(0, 3).map(s => ({idx: s.m.idx, score: s.score}));\n' + ANKER));

const {ladeKI} = require(path.join(wurzel, 'tests', 'rahmen.js'));
const KI = ladeKI({htmlPfad: htmlAnker, mitNetz: true});
const {BOARD_SIZE, removeDeadGroups, PARAMS, getAIMove, computeZobrist} = KI;
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => i < 0 ? 'pass' : SPALTEN[i % 19] + (19 - Math.floor(i / 19));
const mulberry32 = seed => { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

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

/* ── Gewichtsstaende sichern und zurueckspielen ────────────────────────── */
const FELDER = ['W1', 'b1', 'W2', 'b2'];
const sichere = () => ({arr: FELDER.map(f => policyNet[f].slice()),
                        gamesPlayed: policyNet.gamesPlayed, wins: policyNet.wins,
                        lastResult: policyNet.lastResult, healthy: policyNet._healthy});
const spieleZurueck = w => { FELDER.forEach((f, i) => policyNet[f].set(w.arr[i]));
  policyNet.gamesPlayed = w.gamesPlayed; policyNet.wins = w.wins;
  policyNet.lastResult = w.lastResult; policyNet._healthy = w.healthy; };
const gleich = (a, b) => FELDER.every((f, i) => a.arr[i].length === b.arr[i].length
  && a.arr[i].every((x, k) => x === b.arr[i][k]));

/* ── Training auf echten Merkmalen (keine Attrappen, §3.4) ─────────────── */
const QUELLEN = [['hand-117.sgf', 60], ['hand-392.sgf', 80], ['hand-427.sgf', 100],
                 ['hand-455.sgf', 60], ['hand-478.sgf', 80], ['hand-364.sgf', 60]];
function trainiere(runden, saatOffset) {
  let beispiele = 0;
  for (let r = 0; r < runden; r++) {
    for (const [d, bis] of QUELLEN) {
      const s = stellung(d, bis);
      const l = s.letzterIdx >= 0 ? {x: s.letzterIdx % 19, y: Math.floor(s.letzterIdx / 19)} : null;
      Math.random = mulberry32(SEED + saatOffset + r);
      const inp = policyNet.boardToInput(s.b, s.amZug, l, null);
      const f = policyNet.forward(inp);
      let best = -1, bestP = -Infinity;
      for (let i = 0; i < 361; i++) if (s.b[i] === 0 && f.probs[i] > bestP) { bestP = f.probs[i]; best = i; }
      policyNet._gameBuffer.push({inp, probs: f.probs, hidden: f.hidden, moveIdx: best});
      beispiele++;
    }
    policyNet.trainGame(r % 2 === 0 ? 1 : -1);
  }
  return beispiele;
}

/* ── ein Aufruf eines Arms ─────────────────────────────────────────────── */
function ruf(s) {
  const lm = s.letzterIdx >= 0 ? {x: s.letzterIdx % 19, y: Math.floor(s.letzterIdx / 19)} : null;
  globalThis.__WURZEL = null;
  Math.random = mulberry32(SEED);
  const r = getAIMove(new Uint8Array(s.b), s.amZug, [computeZobrist(s.b)], {...s.caps},
                      s.zuege, 'hard', 1, null, lm);
  const w = globalThis.__WURZEL || [];
  return {typ: r && r.type, punkt: r && r.type === 'stone' ? zuGtp(r.y * 19 + r.x) : null,
          info: (r && r.info) || null,
          kandidaten: w.map(x => ({punkt: zuGtp(x.idx), idx: x.idx, score: +x.score.toFixed(4)})),
          blendWeight: globalThis.policyNet ? globalThis.policyNet.blendWeight : null};
}
const zweimal = s => { const a = ruf(s), b = ruf(s);
  return {erg: a, wiederholbar: JSON.stringify(a) === JSON.stringify(b)}; };

/* ── Hauptlauf ─────────────────────────────────────────────────────────── */
PARAMS.mctsFixedSims = SIMS; PARAMS.adaptiveBudgetEnabled = 0; PARAMS.resignEnabled = 0;
PARAMS.netWarmup = 2;                     /* §3.5: damit gamesPlayed 2 den vollen Blend gibt */
PARAMS.netMaxBlend = 0;                   /* waehrend des Trainings aus */

const echtesNetz = globalThis.policyNet;
const beispieleW0 = trainiere(2, 0);
const W0 = sichere();
const beispieleW1 = trainiere(SCHRITTE, 100);
const W1 = sichere();

const kopf = {
  seed: SEED, sims: SIMS, netWarmup: PARAMS.netWarmup, netScoreScale: PARAMS.netScoreScale,
  blends: BLENDS, htmlSha256: require('crypto').createHash('sha256').update(html).digest('hex'),
  W0: {gamesPlayed: W0.gamesPlayed, wins: W0.wins, beispiele: beispieleW0},
  W1: {gamesPlayed: W1.gamesPlayed, wins: W1.wins, beispiele: beispieleW0 + beispieleW1,
       trainGameAufrufe: 2 + SCHRITTE},
  gewichteVerschieden: !gleich(W0, W1), divergenzen: policyNet._divergences,
  gesund: policyNet._healthy
};

const DATEIEN = ['hand-117.sgf', 'hand-364.sgf', 'hand-392.sgf', 'hand-427.sgf', 'hand-455.sgf', 'hand-478.sgf'];
const ZUEGE = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const faelle = [];
for (const d of DATEIEN) for (const bis of ZUEGE) {
  const s = stellung(d, bis);
  if (s.zuege < bis) continue;
  faelle.push({datei: d, bis, s});
}
const liste = MAX_STELLUNGEN > 0 ? faelle.slice(0, MAX_STELLUNGEN) : faelle;

const ergebnisse = [];
for (const blend of BLENDS) {
  PARAMS.netMaxBlend = blend;
  for (const f of liste) {
    globalThis.policyNet = echtesNetz;
    spieleZurueck(W0);
    const A = zweimal(f.s);
    /* Priors aus A aufzeichnen -- genau die, die A benutzt hat */
    const lm = f.s.letzterIdx >= 0 ? {x: f.s.letzterIdx % 19, y: Math.floor(f.s.letzterIdx / 19)} : null;
    Math.random = mulberry32(SEED);
    const priorsA = Array.from(policyNet.forward(policyNet.boardToInput(f.s.b, f.s.amZug, lm, null)).probs);

    spieleZurueck(W1);
    const B = zweimal(f.s);
    const priorsB = Array.from(policyNet.forward(policyNet.boardToInput(f.s.b, f.s.amZug, lm, null)).probs);

    /* Arm C: Worker-Stummel ohne forward, mit den Priors aus A */
    const bwB = B.erg.blendWeight;
    globalThis.policyNet = {blendWeight: bwB, _netPriors: Float32Array.from(priorsA)};
    const C = zweimal(f.s);
    const priorsEingespeist = Array.from(globalThis.policyNet._netPriors);
    globalThis.policyNet = echtesNetz;

    const k = A.erg.kandidaten;
    ergebnisse.push({
      datei: f.datei, bis: f.bis, amZug: f.s.amZug === 1 ? 'S' : 'W', blend,
      A: A.erg, B: B.erg, C: C.erg,
      wiederholbar: {A: A.wiederholbar, B: B.wiederholbar, C: C.wiederholbar},
      zugWechsel: A.erg.punkt !== B.erg.punkt || A.erg.typ !== B.erg.typ,
      rangWechsel: JSON.stringify(A.erg.kandidaten.map(x => x.punkt))
                !== JSON.stringify(B.erg.kandidaten.map(x => x.punkt)),
      cStelltHer: C.erg.punkt === A.erg.punkt && C.erg.typ === A.erg.typ,
      priorsGleichEingespeist: priorsEingespeist.every((x, i) => x === priorsA[i]),
      priorsTop2: k.length >= 2 ? {A: [priorsA[k[0].idx], priorsA[k[1].idx]],
                                   B: [priorsB[k[0].idx], priorsB[k[1].idx]]} : null
    });
  }
}

/* ── Gueltigkeit nach §5 ───────────────────────────────────────────────── */
const gruende = [];
if (!kopf.gewichteVerschieden) gruende.push('W0 und W1 sind byteidentisch (§5 Nr. 5)');
if (kopf.divergenzen > 0) gruende.push(`Divergenzen: ${kopf.divergenzen} (§5 Nr. 2)`);
if (!kopf.gesund) gruende.push('Netz gilt als krank (§5 Nr. 2)');
for (const e of ergebnisse) {
  const o = `${e.datei}@${e.bis} blend ${e.blend}`;
  for (const arm of ['A', 'B', 'C'])
    if (!e.wiederholbar[arm]) gruende.push(`${o}: Arm ${arm} nicht wiederholbar (§5 Nr. 4)`);
  const bws = [e.A.blendWeight, e.B.blendWeight, e.C.blendWeight];
  if (bws.some(x => !(x > 0))) gruende.push(`${o}: blendWeight 0 in einem Arm (§5 Nr. 1) [${bws}]`);
  if (new Set(bws).size !== 1) gruende.push(`${o}: blendWeight weicht ab (§5 Nr. 1) [${bws}]`);
  if (!e.priorsGleichEingespeist) gruende.push(`${o}: eingespeiste Priors nicht gleich (§5 Nr. 3)`);
}
const gueltig = gruende.length === 0;

const zaehl = {};
for (const blend of BLENDS) {
  const g = ergebnisse.filter(e => e.blend === blend);
  zaehl[blend] = {stellungen: g.length, zugWechsel: g.filter(e => e.zugWechsel).length,
                  rangWechsel: g.filter(e => e.rangWechsel).length,
                  cStelltHer: g.filter(e => e.zugWechsel && e.cStelltHer).length};
}
const urteil = !gueltig ? 'KEIN URTEIL'
  : Object.values(zaehl).some(z => z.cStelltHer > 0) ? 'Nachstellung bricht'
  : Object.values(zaehl).some(z => z.zugWechsel > 0) ? 'Zugwechsel, aber Arm C stellt nicht her'
  : Object.values(zaehl).some(z => z.rangWechsel > 0) ? 'Nur Rangwechsel'
  : 'Kein Unterschied';

const bericht = {kopf, gueltig, gruende, zaehl, urteil, ergebnisse};
if (AUS) { fs.writeFileSync(AUS, JSON.stringify(bericht, null, 1)); console.log('geschrieben: ' + AUS); }
console.log(JSON.stringify({kopf, gueltig, gruende: gruende.slice(0, 8), zaehl, urteil}, null, 2));
fs.rmSync(tmp, {recursive: true, force: true});
process.exit(gueltig ? 0 : 1);
