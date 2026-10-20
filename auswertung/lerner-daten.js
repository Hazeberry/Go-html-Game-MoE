// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Lehrdaten des Endspiel-Lerners (docs/endspiel-lerner.md): Stellungen aus
   beschrifteten Partien (muster-daten.js, je Stellung GNU Gos Zug auf Stufe
   10) als Eingabeebenen (lerner-merkmale.js), dazu GNU Gos Zug und der Zug,
   den die KI in der Partie gespielt hat.

   Ausgabe (Präfix P): P.x (Uint8, je Stellung EBENEN × 361), P.json (Kopf und
   je Stellung seed, nr, k, Farbe, y = GNU Gos Zug, z = Zug der KI; 361 = Pass).

   Aufruf:
     node auswertung/lerner-daten.js <lehr.jsonl[.gz]> [...] --aus P [--ab 80] */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const M = require('./lerner-merkmale.js');

const N = 361, G = 19, PASS = 361;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const liesText = d => d.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(d)).toString('utf8') : fs.readFileSync(d, 'utf8');

/* Einen Zug setzen; gibt den neuen Ko-Punkt zurück (oder −1) */
function setze(E, b, c, i) {
  const vorher = [];
  for (const n of M.NACHBARN[i]) if (b[n] === 3 - c) vorher.push(n);
  b[i] = c;
  const cap = E.removeDeadGroups(b, 3 - c, i);
  if (cap !== 1) return -1;
  const weg = vorher.find(n => !b[n]);
  if (weg === undefined) return -1;
  /* Ko nur, wenn der neue Stein allein steht und genau eine Freiheit hat */
  let frei = 0, allein = true;
  for (const n of M.NACHBARN[i]) { if (!b[n]) frei++; else if (b[n] === c) allein = false; }
  return allein && frei === 1 ? weg : -1;
}

/* Alle beschrifteten Stellungen einer Partie, je mit Zustand für die Suche */
function stellungen(E, p, ab, mitZustand = false) {
  const b = new Uint8Array(N), zuerst = p.beginnt === 'S' ? 1 : 2;
  for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
  const ziel = new Map(p.ziele.map(t => [t.k, t.gnugo]));
  const ende = Math.max(-1, ...p.ziele.map(t => t.k));
  const hist = [E.computeZobrist(b)], caps = {1: 0, 2: 0};
  let letzt = -1, vorletzt = -1, ko = -1;
  const aus = [];
  for (let k = 0; k < p.zuege.length && k <= ende; k++) {
    const c = k % 2 === 0 ? zuerst : 3 - zuerst;
    if (ziel.has(k) && k >= ab) {
      const gz = vonGtp(ziel.get(k)), gi = vonGtp(p.zuege[k]);
      const s = {seed: p.seed, nr: p.nr, k, c, y: gz < 0 ? PASS : gz, z: gi < 0 ? PASS : gi, letzt, vorletzt, ko, b: new Uint8Array(b)};
      if (mitZustand) { s.hist = hist.slice(); s.caps = {...caps}; }
      aus.push(s);
    }
    const i = vonGtp(p.zuege[k]);
    vorletzt = letzt;
    if (i < 0) { letzt = -1; ko = -1; continue; }
    const vor = b.reduce((x, v) => x + (v === 3 - c ? 1 : 0), 0);
    ko = setze(E, b, c, i);
    caps[c] += vor - b.reduce((x, v) => x + (v === 3 - c ? 1 : 0), 0);
    hist.push(E.computeZobrist(b));
    letzt = i;
  }
  return aus;
}

function extrahiere(dateien, opt) {
  const E = ladeKI({mitNetz: false});
  const kopf = {version: 1, ebenen: M.EBENEN, ab: opt.ab, quellen: dateien.map(d => path.basename(d)), stellungen: []};
  const fd = fs.openSync(opt.aus + '.x', 'w'), puffer = new Uint8Array(M.EBENEN * N);
  for (const datei of dateien) for (const z of liesText(datei).split('\n')) {
    if (!z.trim()) continue;
    const p = JSON.parse(z);
    if (p.abgebrochen || !p.zuege || !p.ziele) continue;
    for (const s of stellungen(E, p, opt.ab)) {
      M.ebenen(E, s.b, s.c, s.letzt, s.vorletzt, s.ko, s.k, puffer, 0);
      fs.writeSync(fd, puffer);
      kopf.stellungen.push([s.seed, s.nr, s.k, s.c, s.y, s.z]);
    }
  }
  fs.closeSync(fd);
  fs.writeFileSync(opt.aus + '.json', JSON.stringify(kopf));
  console.error(`${kopf.stellungen.length} Stellungen aus ${dateien.length} Dateien`);
}

if (require.main === module) {
  const a = process.argv.slice(2), dateien = [], opt = {ab: 80, aus: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--ab') opt.ab = +a[++i];
    else dateien.push(a[i]);
  }
  if (!opt.aus || !dateien.length) { console.error('Aufruf: node auswertung/lerner-daten.js <lehr.jsonl> [...] --aus P [--ab 80]'); process.exit(1); }
  extrahiere(dateien, opt);
}

module.exports = {setze, stellungen, vonGtp, PASS};
