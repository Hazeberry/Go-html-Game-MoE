// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Pass-Sonde für feste späte Stellungen (docs/endspiel-abraeumen.md §7):
   Warum passt die KI nach dem Pass des Gegners nicht?

   Aus archivierten Partien (gnugo-duell.js-Datensätze) wird die Stellung
   genommen, in der die KI nach dem ERSTEN Pass des Gegners in der Endphase am
   Zug ist (nach dem letzten Gegnerstein), und die Engine (getAIMove, Stufe
   hard, Default der Datei, 120 feste Simulationen, Aufgabe aus, ohne
   adaptives Zeitbudget, Zufall je Stellung geseedet) wird dort noch einmal
   gefragt. Protokolliert wird, was die Pass-Prüfung in getAIMove sieht:

     best             Wert des besten Kandidaten
     wantsToPass      best unter einer der Schwellen passMinMc40/80/120/150?
     ownInAtari       eigene Kette im Atari (Krisenkarte)?
     oppBest          bester Gegnerzug nach evaluateMove
     opponentGainsAlot  oppBest über passGainThreshold?
     unabwendbar      Gegnerzug nicht abwendbar (passUnabwendbar)?
     Entscheidung     pass | stone | resign, Dauer von getAIMove in ms

   Daraus ergibt sich je Stellung der Grund, warum die KI nicht passt:
   (a) best über allen Schwellen, (b) eigene Kette im Atari, (c) der Gegner
   hätte einen Zug über der Schwelle, (d) sonst (die Suche hat gezogen, obwohl
   die Pass-Prüfung ihn zugelassen hätte, nur bei Fehlern). Verglichen wird mit
   dem Zug, den die KI in der Partie gespielt hat.

   Die Sonde ist eine Kopie von index.html im Speicher mit zwei Protokollzeilen
   an der Pass-Prüfung; index.html im Repo bleibt unberührt.

   Aufruf:  node auswertung/endspiel/pass-stellungen.js [--max 100] [--seed 1] [--roh datei.jsonl]
              --gruppe name=datei[,datei...] ... */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const {ersetzeEinmal} = require('../sonde-lauf.js');

const ANKER1 = "  if (!wantsToPass) { _infValid = false; _tbValid = false; }";
const SONDE1 = "  globalThis.__PS_ROW = {mc, best, kandidaten: scored.length, wantsToPass: !!wantsToPass};\n" + ANKER1;
const ANKER2 = "    if ((!ownInAtari && !opponentGainsAlot) || unabwendbar) {";
const SONDE2 = "    if (globalThis.__PS_ROW) Object.assign(globalThis.__PS_ROW, {ownInAtari, oppBest, opponentGainsAlot, unabwendbar: !!unabwendbar});\n" + ANKER2;

function gepatcht(html) {
  let t = ersetzeEinmal(html, ANKER1, SONDE1, 'Pass-Prüfung (wantsToPass)');
  t = ersetzeEinmal(t, ANKER2, SONDE2, 'Pass-Prüfung (Atari/Gegnerzug)');
  return t;
}

function motor(htmlPfad) {
  const html = gepatcht(fs.readFileSync(htmlPfad, 'utf8'));
  const ex = id => {
    const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
    if (!m) throw new Error(`<script id="${id}"> fehlt in ${htmlPfad}`);
    return m[1];
  };
  globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  globalThis.document = {getElementById: () => null};
  (0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai')
    + ';globalThis.__PSK={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,BOARD_SIZE,'
    + 'neuePartie(){_mctsSavedRoot=null;_hopelessStreak=0;_allDeadStreak=0;_lastMsPerSim=null;'
    + 'if(typeof setzeKrisenDauer==="function")setzeKrisenDauer(null);if(typeof setzeLebensurteil==="function")setzeLebensurteil(null);}};');
  return globalThis.__PSK;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { const x = SPALTEN.indexOf(s[0]), r = +s.slice(1); return (19 - r) * 19 + x; };
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));

/* Zugfolge eines Datensatzes (Schwarz beginnt bei beginnt S) */
function folge(r) {
  const erste = r.beginnt === 'S' ? 1 : 2;
  return r.zuege.map((m, i) => ({farbe: i % 2 === 0 ? erste : 3 - erste, punkt: m === 'pass' ? -1 : vonGtp(m)}));
}

/* Index des ersten Gegnerpasses nach dem letzten Gegnerstein, oder -1 */
function stelle(zuege, kiFarbe) {
  const gegner = 3 - kiFarbe;
  let letzter = -1;
  zuege.forEach((z, i) => { if (z.farbe === gegner && z.punkt >= 0) letzter = i; });
  for (let i = letzter + 1; i < zuege.length; i++) if (zuege[i].farbe === gegner && zuege[i].punkt < 0) return {pass: i, letzter};
  return null;
}

/* Spielt bis einschließlich Zug `bis` nach und liefert die Argumente für getAIMove */
function aufbau(E, zuege, bis, vorgabe = []) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  for (const p of vorgabe) board[p] = 1;
  let hist = new Set([E.computeZobrist(board)]), ko = null, last = null, mc = 0;
  for (let i = 0; i <= bis; i++) {
    const z = zuege[i];
    if (z.punkt < 0) { ko = null; mc++; continue; }
    board[z.punkt] = z.farbe;
    const cap = E.removeDeadGroups(board, 3 - z.farbe, z.punkt);
    ko = null;
    if (cap === 1) { const ff = E.floodFill(board, z.punkt); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
    caps[z.farbe] += cap; last = z.punkt; mc++;
    hist.add(E.computeZobrist(board));
  }
  return {board, caps, hist, ko, last, mc};
}

/* Grund, warum die KI nicht passt (nur wenn sie nicht passt) */
function grund(z) {
  if (z.entscheidung === 'pass') return 'passt';
  if (z.wantsToPass === false) return 'best über den Schwellen';
  if (z.ownInAtari) return 'eigene Kette im Atari';
  if (z.opponentGainsAlot) return 'Gegnerzug über passGainThreshold';
  return 'anderes';
}

function frage(E, standard, aus, kiFarbe, seed, nr) {
  Object.assign(E.PARAMS, JSON.parse(JSON.stringify(standard)), {mctsFixedSims: 120, resignEnabled: 0, adaptiveBudgetEnabled: 0});
  E.neuePartie();
  Math.random = mulberry32(seed * 1000003 + nr);
  globalThis.__PS_ROW = null;
  const t0 = process.hrtime.bigint();
  const r = E.getAIMove(aus.board, kiFarbe, Array.from(aus.hist), {...aus.caps}, aus.mc, 'hard', 1, aus.ko, aus.last);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const row = globalThis.__PS_ROW || {};
  const z = {entscheidung: r.type, zug: r.type === 'stone' ? zuGtp(r.y * 19 + r.x) : r.type, info: r.info || '', ms,
             best: row.best, wantsToPass: row.wantsToPass, ownInAtari: row.ownInAtari, oppBest: row.oppBest,
             opponentGainsAlot: row.opponentGainsAlot, unabwendbar: row.unabwendbar};
  z.grund = grund(z);
  return z;
}

/* Auswahl (vorab festgelegt): alle Partien mit Endphase, getrennt nach „KI spielte in der
   Endphase weiter“ (W) und „KI passte“ (P); je Gruppe höchstens `max`, gezogen mit festem Seed */
function auswaehlen(partien, max, seed) {
  const zufall = mulberry32(seed);
  const gruppen = {W: [], P: []};
  for (const r of partien) {
    if (r.abgebrochen || !Array.isArray(r.zuege) || !r.wirFarbe) continue;
    const ki = r.wirFarbe === 'S' ? 1 : 2, zuege = folge(r), s = stelle(zuege, ki);
    if (!s || s.pass + 1 >= zuege.length) continue;       // kein Gegnerpass in der Endphase oder kein KI-Zug danach
    const naechster = zuege[s.pass + 1];
    if (naechster.farbe !== ki) continue;
    (naechster.punkt >= 0 ? gruppen.W : gruppen.P).push({r, zuege, ki, s, naechster});
  }
  const ziehen = l => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, max); };
  return {W: ziehen(gruppen.W), P: ziehen(gruppen.P), anzahl: {W: gruppen.W.length, P: gruppen.P.length}};
}

const quantil = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const f1 = v => Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '–';

function zusammenfassen(zeilen) {
  const grundZahl = {};
  for (const z of zeilen) grundZahl[z.grund] = (grundZahl[z.grund] || 0) + 1;
  const ms = zeilen.map(z => z.ms);
  return {n: zeilen.length, passt: zeilen.filter(z => z.entscheidung === 'pass').length,
          gleicherZug: zeilen.filter(z => z.gleich).length, grundZahl,
          msMedian: quantil(ms, 0.5), msP90: quantil(ms, 0.9), msMax: ms.length ? Math.max(...ms) : NaN,
          bestMedian: quantil(zeilen.map(z => z.best).filter(Number.isFinite), 0.5),
          oppBestMedian: quantil(zeilen.map(z => z.oppBest).filter(Number.isFinite), 0.5)};
}

/* Verteilung von `best` je Gruppe und Trennschärfe der Schwellen (§9): für jede Schwelle T
   der Anteil der Stellungen mit best < T in W (KI spielte weiter) und in P (KI passte).
   Eine Schwelle würde gut trennen, wenn der Anteil in P nahe 1 und in W nahe 0 läge. */
const SCHWELLEN_T = [20, 100, 200, 500, 1000];
function verteilung(zeilen) {
  const b = zeilen.map(z => z.best).filter(Number.isFinite).sort((x, y) => x - y);
  const q = p => quantil(b, p);
  return {n: b.length, ohneBest: zeilen.length - b.length, min: b[0], p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: b[b.length - 1],
          anteilUnter: SCHWELLEN_T.map(t => ({t, anteil: b.length ? b.filter(x => x < t).length / b.length : NaN}))};
}
/* Überlappung: Anteil der W-Stellungen, deren best unter dem Maximum von P liegt, und der P-Stellungen über dem Minimum von W */
function ueberlappung(w, p) {
  const bw = w.map(z => z.best).filter(Number.isFinite), bp = p.map(z => z.best).filter(Number.isFinite);
  if (!bw.length || !bp.length) return {wUnterPMax: NaN, pUeberWMin: NaN};
  const maxP = Math.max(...bp), minW = Math.min(...bw);
  return {wUnterPMax: bw.filter(x => x <= maxP).length / bw.length, pUeberWMin: bp.filter(x => x >= minW).length / bp.length, maxP, minW};
}

function textVerteilung(ergebnis) {
  const pz = v => Number.isFinite(v) ? (100 * v).toFixed(1).replace('.', ',') + ' %' : '–';
  const o = ['| Quelle | Gruppe | n | Min | 10 % | 25 % | Median | 75 % | 90 % | Max | ' + SCHWELLEN_T.map(t => `best < ${t}`).join(' | ') + ' |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|' + SCHWELLEN_T.map(() => '---:').join('|') + '|'];
  const ueb = ['| Quelle | größtes best in P | kleinstes best in W | Anteil W mit best ≤ größtes best in P | Anteil P mit best ≥ kleinstes best in W |', '|---|---:|---:|---:|---:|'];
  for (const [quelle, g] of Object.entries(ergebnis)) {
    for (const [gr, zeilen] of Object.entries({'W (KI spielte weiter)': g.W, 'P (KI passte)': g.P})) {
      const v = verteilung(zeilen);
      o.push(`| ${quelle} | ${gr} | ${v.n} | ${f1(v.min)} | ${f1(v.p10)} | ${f1(v.p25)} | ${f1(v.median)} | ${f1(v.p75)} | ${f1(v.p90)} | ${f1(v.max)} | ${v.anteilUnter.map(a => pz(a.anteil)).join(' | ')} |`);
    }
    const u = ueberlappung(g.W, g.P);
    ueb.push(`| ${quelle} | ${f1(u.maxP)} | ${f1(u.minW)} | ${pz(u.wUnterPMax)} | ${pz(u.pUeberWMin)} |`);
  }
  return o.join('\n') + '\n\n' + ueb.join('\n') + '\n';
}

function text(ergebnis) {
  const o = ['| Quelle | Gruppe (in der Partie) | Stellungen | Sonde passt | gleicher Zug wie in der Partie | best Median | oppBest Median | ms Median | ms 90 % | ms Max |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  const gruende = ['| Quelle | Gruppe | Grund, warum die Sonde nicht passt (Anzahl) |', '|---|---|---|'];
  for (const [quelle, g] of Object.entries(ergebnis)) for (const [gr, zeilen] of Object.entries({'KI spielte weiter': g.W, 'KI passte': g.P})) {
    const s = zusammenfassen(zeilen);
    o.push(`| ${quelle} | ${gr} | ${s.n} | ${s.passt} | ${s.gleicherZug} | ${f1(s.bestMedian)} | ${f1(s.oppBestMedian)} | ${f1(s.msMedian)} | ${f1(s.msP90)} | ${f1(s.msMax)} |`);
    gruende.push(`| ${quelle} | ${gr} | ${Object.entries(s.grundZahl).map(([k, v]) => `${k}: ${v}`).join('; ') || '–'} |`);
  }
  return o.join('\n') + '\n\n' + gruende.join('\n') + '\n';
}

module.exports = {verteilung, ueberlappung, textVerteilung, SCHWELLEN_T, gepatcht, motor, folge, stelle, aufbau, auswaehlen, frage, grund, zusammenfassen, text, ANKER1, ANKER2};

if (require.main === module) {
  const a = process.argv.slice(2);
  let max = 100, seed = 1, roh = null; const gruppen = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--max') max = +a[++i];
    else if (a[i] === '--seed') seed = +a[++i];
    else if (a[i] === '--roh') roh = a[++i];
    else if (a[i] === '--gruppe') {
      const m = /^([^=]+)=(.+)$/.exec(a[++i] || '');
      if (!m) { console.error('--gruppe name=datei[,datei...] erwartet'); process.exit(2); }
      gruppen.push([m[1], m[2].split(',')]);
    } else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!gruppen.length || !(max >= 1)) { console.error('Aufruf: node auswertung/endspiel/pass-stellungen.js [--max 100] [--seed 1] --gruppe name=datei,...'); process.exit(2); }
  const E = motor(path.join(__dirname, '..', '..', 'index.html'));
  const standard = JSON.parse(JSON.stringify(E.PARAMS));
  const ergebnis = {};
  for (const [name, dateien] of gruppen) {
    const partien = dateien.flatMap(d => { const r = fs.readFileSync(d); return (d.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)); });
    const wahl = auswaehlen(partien, max, seed);
    ergebnis[name] = {W: [], P: []};
    for (const gr of ['W', 'P']) for (const p of wahl[gr]) {
      const aus = aufbau(E, p.zuege, p.s.pass, (p.r.vorgabeSteine || []).map(vonGtp));
      const z = frage(E, standard, aus, p.ki, seed, p.r.nr);
      z.gleich = (p.naechster.punkt < 0 ? 'pass' : zuGtp(p.naechster.punkt)) === z.zug;
      ergebnis[name][gr].push(z);
    }
    console.error(`${name}: Stellungen W ${wahl.anzahl.W} (gezogen ${wahl.W.length}), P ${wahl.anzahl.P} (gezogen ${wahl.P.length})`);
  }
  process.stdout.write(text(ergebnis));
  process.stdout.write('\n## Verteilung von best (Gruppen W und P)\n\n' + textVerteilung(ergebnis));
  if (roh) {
    const zeilen = [];
    for (const [quelle, g] of Object.entries(ergebnis)) for (const gr of ['W', 'P']) for (const z of g[gr]) zeilen.push(JSON.stringify({quelle, gruppe: gr, ...z}));
    fs.writeFileSync(roh, zeilen.join('\n') + '\n');
  }
}
