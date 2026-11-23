// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Wurzelkandidaten einer archivierten Partie rekonstruieren (docs/diagnose-p1p2.md).

   Spielt eine Partie aus einem Duell-Datensatz (gnugo-duell.js, Zeile der
   `.jsonl.gz`) mit demselben Zufall nach, wie das Duell-Skript sie gespielt hat:
   Math.random = mulberry32(seed), neuePartie, je KI-Zug getAIMove mit den
   Standardwerten der Datei plus den `ki`-Werten des Datensatzes. Die Züge des
   Gegners und, nach einer Abweichung, auch die der KI kommen aus dem Datensatz.

   Je KI-Zug wird festgehalten (über drei Messanker im Quelltext, die nichts
   verändern):
     vor     Kandidatenliste vor dem Endspiel-Netz (Index je Brettpunkt)
     nach    Kandidatenliste nach dem Endspiel-Netz (die Liste, aus der die
             Wurzelkinder gebildet werden)
     kids    die Wurzelkinder, mit denen die Suche tatsächlich lief (nach
             Baum-Übernahme und frischer Wurzel)
     netz    ob das Netz eingegriffen hat
   Die Rekonstruktion gilt nur, solange jeder bisherige KI-Zug mit dem
   archivierten übereinstimmt (`erster Abweichung`): Ab dort lägen Zufall und
   Baum anders als im Original.

   Aufruf:  node auswertung/diagnose/wurzel-replay.js datei.jsonl[.gz] [--partien 1,2,3] [--bis 200] [--html index.html] */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));
const vonGtp = s => { const t = String(s).trim().toUpperCase(); if (t === 'PASS') return -1; return (19 - +t.slice(1)) * 19 + SPALTEN.indexOf(t[0]); };
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* Anker: jede Zeichenfolge muss genau einmal vorkommen, sonst bricht das Laden ab */
const ANKER = [
  ['      endspielNetzWurzel(board, aiColor, mc, scored, koPoint);',
   '      globalThis.__DIAG = {vor: scored.map(s => s.m.idx)};\n' +
   '      endspielNetzWurzel(board, aiColor, mc, scored, koPoint);\n' +
   '      globalThis.__DIAG.nach = scored.map(s => s.m.idx); globalThis.__DIAG.netz = !!scored.__pNetz;'],
  ['  if (!root.kids.length) return null;',
   '  if (!root.kids.length) return null;\n  if (globalThis.__DIAG) { globalThis.__DIAG.kids = root.kids.map(k => k.idx); globalThis.__DIAG.priors = root.kids.map(k => k.P); }'],
];

function ladeEngine(htmlPfad) {
  const html = fs.readFileSync(htmlPfad, 'utf8');
  const ex = id => new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html)[1];
  let w = ex('worker-ai');
  for (const [alt, neu] of ANKER) {
    const n = w.split(alt).length - 1;
    if (n !== 1) throw new Error(`Messanker ${n}× statt 1× gefunden: ${alt.trim().slice(0, 60)}`);
    w = w.replace(alt, () => neu);
  }
  globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  globalThis.document = {getElementById: () => null};
  (0, eval)(ex('shared-go-logic') + '\n' + w
    + ';globalThis.__D={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,BOARD_SIZE,setzeKrisenDauer,kandidatenProtokoll:typeof leseKandidatenOrakel==="function"?leseKandidatenOrakel:null,'
    + 'neuePartie(){_mctsSavedRoot=null;_hopelessStreak=0;_allDeadStreak=0;_lastMsPerSim=null;},'
    + 'wurzel:typeof leseWurzelWaechter==="function"?leseWurzelWaechter:null};');
  const E = globalThis.__D;
  E.STANDARD = JSON.parse(JSON.stringify(E.PARAMS));
  return E;
}

function setze(E, board, i, f) {
  board[i] = f;
  const cap = E.removeDeadGroups(board, 3 - f, i);
  let ko = null;
  if (cap === 1) { const ff = E.floodFill(board, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
  return {cap, ko};
}

/* Eine Partie nachspielen. opt.bis: letzter Zug (1-basiert), der noch geprüft wird. */
function replay(E, p, opt = {}) {
  const bis = Math.min(opt.bis || 200, p.zuege.length);
  if (p.vorgabe >= 2) throw new Error('Partien mit Vorgabe werden nicht nachgespielt');
  Math.random = mulberry32(p.seed);
  E.neuePartie(); E.setzeKrisenDauer(null); if (E.wurzel) E.wurzel(true);
  const board = new Uint8Array(361), caps = {1: 0, 2: 0}, hist = new Set([E.computeZobrist(board)]);
  const wir = p.wirFarbe === 'S' ? 1 : 2;
  let ko = null, last = null;
  const zuege = []; let abweichung = null;
  for (let mc = 0; mc < bis; mc++) {
    const f = mc % 2 === 0 ? 1 : 2, z = p.zuege[mc], archiv = z === 'pass' ? -1 : vonGtp(z);
    if (f === wir && !abweichung) {
      Object.assign(E.PARAMS, E.STANDARD, {adaptiveBudgetEnabled: 0, vorgabeSteine: 0}, p.ki);
      /* Kein extra: hier wird eine Einzelstellung bewertet, gegnerPasste hat
         keinen Wert, den die Daten tragen (docs/passregel-wege-vorabfestlegung.md §3). */
      if (E.PARAMS.passNachGegnerpass >= 1)
        throw new Error('passNachGegnerpass: dieses Werkzeug versorgt extra nicht, die Regel wuerde '
          + 'still ausfallen (docs/passregel-wege-vorabfestlegung.md)');
      globalThis.__DIAG = null;
      const extra = typeof opt.extra === 'function' ? opt.extra(mc, {board, f}) : undefined;   /* nur für Tests (Kandidaten-Orakel) */
      const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last, extra);
      const gewaehlt = r.type === 'stone' ? r.y * 19 + r.x : r.type === 'resign' ? -2 : -1;
      const d = globalThis.__DIAG || null;
      zuege.push({mc, gespielt: archiv, gewaehlt, gleich: gewaehlt === archiv, info: r.info || null, vor: d && d.vor, nach: d && d.nach, netz: d ? d.netz : null, kids: d && d.kids, priors: d && d.priors, prot: E.kandidatenProtokoll ? E.kandidatenProtokoll() : null});
      if (gewaehlt !== archiv) abweichung = {mc, gespielt: z, gewaehlt: gewaehlt < 0 ? 'pass' : zuGtp(gewaehlt)};
    }
    if (archiv < 0) ko = null;
    else { const s = setze(E, board, archiv, f); caps[f] += s.cap; ko = s.ko; last = archiv; hist.add(E.computeZobrist(board)); }
  }
  return {zuege, abweichung, wir, bis};
}

function lies(datei) {
  const roh = fs.readFileSync(datei);
  const txt = /\.gz$/.test(datei) ? zlib.gunzipSync(roh).toString('utf8') : roh.toString('utf8');
  return txt.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

module.exports = {ladeEngine, replay, lies, zuGtp, vonGtp, mulberry32, ANKER};

if (require.main === module) {
  const a = process.argv.slice(2), datei = a.find(x => !x.startsWith('--'));
  const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (!datei) { console.error('Aufruf: node wurzel-replay.js datei.jsonl[.gz] [--partien 1,2] [--bis 200] [--html index.html]'); process.exit(2); }
  const E = ladeEngine(opt('--html') || path.join(__dirname, '..', '..', 'index.html'));
  const alle = lies(datei), nrs = (opt('--partien') || '1').split(',').map(Number), bis = +(opt('--bis') || 200);
  for (const nr of nrs) {
    const p = alle.find(x => x.nr === nr); if (!p) { console.log(`Partie ${nr}: nicht im Datensatz`); continue; }
    const t0 = Date.now(), r = replay(E, p, {bis});
    const netz = r.zuege.filter(z => z.netz).length, ki = r.zuege.length;
    console.log(`Partie ${nr}: ${ki} KI-Züge geprüft bis Zug ${bis}, ${r.zuege.filter(z => z.gleich).length} gleich, Netz an ${netz}×, ` +
      (r.abweichung ? `ERSTE ABWEICHUNG bei Zug ${r.abweichung.mc + 1}: archiviert ${r.abweichung.gespielt}, jetzt ${r.abweichung.gewaehlt}` : 'keine Abweichung') + ` (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
}
