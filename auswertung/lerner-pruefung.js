// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Prüfung des Endspiel-Lerners an gespielten Zügen (docs/endspiel-lerner.md):
   Stellt jede beschriftete Stellung einer Partie mit vollem Zustand nach
   (Brett, Stellungsgeschichte, Gefangene, Ko, letzter Zug) und lässt
   getAIMove ziehen, mit 120 Simulationen, ohne Baumwiederverwendung, mit
   einem festen Zufallsstrom je Stellung. Gezählt wird, wie oft der gespielte
   Zug GNU Gos Zug (Stufe 10) trifft, ohne Lerner und mit, gepaart je Stellung.

   Der Lerner greift nur an der Wurzel ein, über eine Kopie von index.html mit
   zwei Haken:
     - vor mctsPUCT: die besten m Punkte des Netzes, die in der Kandidatenliste
       stehen, kommen unter die ersten mctsRootChildren (sie verdrängen die
       letzten);
     - in _mctsKids an der Wurzel: Prior = (1 − λ) · Prior der Heuristik
       + λ · Netz-Wahrscheinlichkeit (über die Wurzelkinder normiert).
   index.html im Repo bleibt unberührt.

   Aufruf:
     node auswertung/lerner-pruefung.js <lehr.jsonl[.gz]> [...] --netz netz.json
          [--lambda 0.5] [--top 4] (netz.json oder netz.json.gz) [--ab 80] [--jede 1] [--rest 0] [--aus ergebnis.jsonl]
          [--ohne-nr 1,2] [--ki k=v,...]
   --jede n --rest r: nur jede n-te Stellung (Index mod n = r), für Teilläufe. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const M = require('./lerner-merkmale.js');
const LN = require('./lerner-netz.js');
const LD = require('./lerner-daten.js');

const PASS = 361;
const liesText = d => d.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(d)).toString('utf8') : fs.readFileSync(d, 'utf8');

function ersetzeEinmal(text, alt, neu, wo) {
  const i = text.indexOf(alt);
  if (i < 0 || text.indexOf(alt, i + 1) >= 0) throw new Error(`Stelle nicht genau einmal gefunden: ${wo}`);
  return text.slice(0, i) + neu + text.slice(i + alt.length);
}

const ANKER_SUCHE = '      const r = mctsPUCT(board, aiColor, captures, scored, koPoint);';
const ANKER_PRIOR = '  for (let r = 0; r < n; r++)\n    kids[r] = {idx: list[r].m.idx, x: list[r].m.x, y: list[r].m.y,';

/* index.html mit den beiden Haken */
function gepatcht(html) {
  let h = ersetzeEinmal(html, ANKER_SUCHE,
    '      if (globalThis.__lernerHaken) globalThis.__lernerHaken(board, aiColor, mc, scored);\n' + ANKER_SUCHE, 'Aufruf von mctsPUCT in getAIMove');
  h = ersetzeEinmal(h, ANKER_PRIOR,
    '  if (list.__pNetz && list.__lambda > 0) {\n'
    + '    let z = 0; const q = new Array(n);\n'
    + '    for (let r = 0; r < n; r++) { q[r] = list.__pNetz[list[r].m.idx] || 0; z += q[r]; }\n'
    + '    if (z > 0) for (let r = 0; r < n; r++) P[r] = (1 - list.__lambda) * P[r] + list.__lambda * q[r] / z;\n'
    + '  }\n' + ANKER_PRIOR, 'Wurzelkinder in _mctsKids');
  return h;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Haken vor der Suche: Netz rechnen, Kandidaten aufnehmen, Prior-Mischung vorbereiten */
function haken(E, netz, opt, zustand) {
  const ebenen = new Uint8Array(M.EBENEN * 361);
  return (board, aiColor, mc, scored) => {
    if (!netz || mc < opt.ab) return;
    M.ebenen(E, board, aiColor, zustand.letzt, zustand.vorletzt, zustand.ko, mc, ebenen, 0);
    const p = LN.softmax(LN.vorwaerts(netz, ebenen));
    let best = -1; for (let i = 0; i < 361; i++) if (best < 0 || p[i] > p[best]) best = i;
    zustand.netzBest = best;
    const K = E.PARAMS.mctsRootChildren;
    if (opt.top > 0 && scored.length > K) {
      const kopf = scored.slice(0, K), drin = new Set(kopf.map(s => s.m.idx));
      const rest = scored.slice(K).sort((a, b) => p[b.m.idx] - p[a.m.idx]);
      const besteNetz = [...scored].sort((a, b) => p[b.m.idx] - p[a.m.idx]).slice(0, opt.top);
      const fehlt = besteNetz.filter(s => !drin.has(s.m.idx));
      if (fehlt.length) {
        const fehltSet = new Set(fehlt.map(s => s.m.idx));
        const neu = [...kopf.slice(0, K - fehlt.length), ...fehlt, ...kopf.slice(K - fehlt.length),
                     ...rest.filter(s => !fehltSet.has(s.m.idx))];
        scored.splice(0, scored.length, ...neu);
        zustand.aufgenommen += fehlt.length;
      }
    }
    scored.__pNetz = p; scored.__lambda = opt.lambda;
  };
}

function pruefe(dateien, opt) {
  const tmp = path.join(os.tmpdir(), `lerner-index-${process.pid}.html`);
  fs.writeFileSync(tmp, gepatcht(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')));
  const E = ladeKI({htmlPfad: tmp, mitNetz: false});
  fs.unlinkSync(tmp);
  const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
  const netz = opt.netz ? LN.netzAus(JSON.parse(liesText(opt.netz))) : null;
  const zustand = {letzt: -1, vorletzt: -1, ko: -1, aufgenommen: 0};
  const h = haken(E, netz, opt, zustand);
  const ergebnisse = [];
  let index = 0;
  for (const datei of dateien) for (const z of liesText(datei).split('\n')) {
    if (!z.trim()) continue;
    const p = JSON.parse(z);
    if (p.abgebrochen || !p.zuege || !p.ziele || opt.ohneNr.includes(p.nr)) continue;
    for (const s of LD.stellungen(E, p, opt.ab, true)) {
      if (index++ % opt.jede !== opt.rest) continue;
      const zug = mitNetz => {
        Object.assign(E.PARAMS, DEFAULT, {mctsFixedSims: 120, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0}, opt.ki);
        Object.assign(zustand, {letzt: s.letzt, vorletzt: s.vorletzt, ko: s.ko});
        globalThis.__lernerHaken = mitNetz ? h : null;
        Math.random = mulberry32((s.seed * 1000 + s.k) >>> 0);
        const r = E.getAIMove(new Uint8Array(s.b), s.c, s.hist, {...s.caps}, s.k, 'hard', 1, s.ko >= 0 ? s.ko : null, s.letzt >= 0 ? s.letzt : null);
        return r.type === 'stone' ? r.y * 19 + r.x : PASS;
      };
      zustand.netzBest = null;
      const ohne = zug(false), mit = netz ? zug(true) : null;
      ergebnisse.push({seed: s.seed, nr: s.nr, k: s.k, y: s.y, z: s.z, ohne, mit, netz: zustand.netzBest});
    }
    if (opt.fortschritt) process.stderr.write(`Partie ${p.nr}: ${ergebnisse.length} Stellungen\n`);
  }
  globalThis.__lernerHaken = null;
  return {ergebnisse, aufgenommen: zustand.aufgenommen};
}

/* Trefferquoten und gepaarter Vergleich (McNemar, exakt) */
function zusammenfassung(ergebnisse) {
  const {vorzeichenP} = require('./messung-zusatz.js');
  const n = ergebnisse.length;
  let ohne = 0, mit = 0, partie = 0, nurMit = 0, nurOhne = 0, geaendert = 0, netz = 0;
  for (const e of ergebnisse) {
    const a = e.ohne === e.y, b = e.mit === e.y;
    if (a) ohne++; if (b) mit++; if (e.z === e.y) partie++; if (e.netz === e.y) netz++;
    if (b && !a) nurMit++; if (a && !b) nurOhne++;
    if (e.mit !== e.ohne) geaendert++;
  }
  return {n, ohne: ohne / n, mit: mit / n, partie: partie / n, netz: netz / n, diff: (mit - ohne) / n, nurMit, nurOhne, geaendert: geaendert / n,
          p: vorzeichenP(nurMit, nurOhne)};
}

if (require.main === module) {
  const a = process.argv.slice(2), dateien = [];
  const opt = {netz: null, lambda: 0.5, top: 4, ab: 80, jede: 1, rest: 0, aus: null, ohneNr: [], ki: {}, fortschritt: true};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--netz') opt.netz = a[++i];
    else if (a[i] === '--lambda') opt.lambda = +a[++i];
    else if (a[i] === '--top') opt.top = +a[++i];
    else if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--jede') opt.jede = +a[++i];
    else if (a[i] === '--rest') opt.rest = +a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--ohne-nr') opt.ohneNr = a[++i].split(',').map(Number);
    else if (a[i] === '--ki') for (const kv of a[++i].split(',')) { const [k, w] = kv.split('='); opt.ki[k] = +w; }
    else dateien.push(a[i]);
  }
  if (!dateien.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }
  const {ergebnisse, aufgenommen} = pruefe(dateien, opt);
  if (opt.aus) fs.writeFileSync(opt.aus, ergebnisse.map(e => JSON.stringify(e)).join('\n') + '\n');
  console.log(JSON.stringify({...zusammenfassung(ergebnisse), aufgenommen, lambda: opt.lambda, top: opt.top}));
}

module.exports = {gepatcht, haken, pruefe, zusammenfassung, mulberry32, ANKER_SUCHE, ANKER_PRIOR};
