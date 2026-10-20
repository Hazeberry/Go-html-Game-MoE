// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Was kostet das Endspiel-Netz im Spiel mit Zeitbudget? (docs/teststaerke.md §8)

   Stellt Stellungen aus Partien von Arm A der Messung des Endspiel-Netzes nach
   (Zug 100, 150 und 200) und misst:
     1. die Zeit für Ebenen und Vorwärtsrechnung des Netzes allein;
     2. getAIMove mit den Einstellungen des Spiels (Zeitbudget, keine festen
        Simulationen), einmal mit endspielNetz 0 und einmal mit 0,5:
        Zeit für den ganzen Zug und Simulationen der Suche.
   Die Suche setzt ihre Zeitgrenze erst beim Start von mctsPUCT; das Netz
   rechnet davor. Erwartet: gleich viele Simulationen, der Zug dauert um die
   Rechenzeit des Netzes länger.

   Aufruf: node auswertung/netz-zeit.js [partien.jsonl.gz] [--partien 8] */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const LD = require('./lerner-daten.js');

const a = process.argv.slice(2);
let datei = path.join(__dirname, '..', 'docs', 'daten', 'endspiel-netz', 'lauf1', 'A.jsonl.gz'), nPartien = 8;
for (let i = 0; i < a.length; i++) { if (a[i] === '--partien') nPartien = +a[++i]; else datei = a[i]; }
const E = ladeKI({mitNetz: false});
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
const partien = zlib.gunzipSync(fs.readFileSync(datei)).toString('utf8').trim().split('\n').slice(0, nPartien).map(z => JSON.parse(z));

/* Stellung vor Zug k mit Zustand */
function stellung(p, k) {
  const ziele = [{k, gnugo: 'PASS'}];
  return LD.stellungen(E, {...p, ziele}, 0, true)[0];
}
const stellungen = [];
for (const p of partien) for (const k of [100, 150, 200]) {
  if (k >= p.zuege.length) continue;
  const s = stellung(p, k % 2 === 1 ? k : k + 1);   /* KI zieht bei Vorgabe an ungeraden Zugzahlen */
  if (s) stellungen.push(s);
}

const ms = () => Number(process.hrtime.bigint()) / 1e6;
const median = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

/* 1. Netz allein */
const x = new Uint8Array(28 * 361), netzZeiten = [];
for (const s of stellungen) {
  const t0 = ms();
  globalThis._enEbenen(s.b, s.c, s.letzt, s.vorletzt, s.ko, s.k, x);
  globalThis.endspielNetzWahrscheinlichkeiten(x);
  netzZeiten.push(ms() - t0);
}

/* 2. Ganzer Zug mit Zeitbudget */
const zug = (s, netz) => {
  Object.assign(E.PARAMS, DEFAULT, {endspielNetz: netz, resignEnabled: 0});
  globalThis.endspielNetzMerke(s.c, s.vorletzt, s.k - 2);
  const t0 = ms();
  const r = E.getAIMove(new Uint8Array(s.b), s.c, s.hist, {...s.caps}, s.k, 'hard', 1, s.ko >= 0 ? s.ko : null, s.letzt >= 0 ? s.letzt : null);
  const m = /MCTS (\d+) Sims/.exec(r.info || '');
  return {zeit: ms() - t0, sims: m ? +m[1] : null};
};
const ohne = [], mit = [];
for (const s of stellungen) { ohne.push(zug(s, 0)); mit.push(zug(s, 0.5)); }
const z = l => median(l.map(r => r.zeit)), si = l => median(l.filter(r => r.sims !== null).map(r => r.sims));

console.log(`${stellungen.length} Stellungen (Zug 100, 150, 200 aus ${partien.length} Partien), Zeitbudget ${DEFAULT.aiTimeBudget} ms`);
console.log(`Netz allein (Ebenen + Vorwärtsrechnung): Median ${median(netzZeiten).toFixed(0)} ms, größter Wert ${Math.max(...netzZeiten).toFixed(0)} ms`);
console.log(`Ganzer Zug ohne Netz: Median ${z(ohne).toFixed(0)} ms, ${si(ohne)} Simulationen`);
console.log(`Ganzer Zug mit Netz:  Median ${z(mit).toFixed(0)} ms, ${si(mit)} Simulationen`);
console.log(`Unterschied: ${(z(mit) - z(ohne)).toFixed(0)} ms je Zug, Simulationen ${(100 * si(mit) / si(ohne)).toFixed(0)} % von ohne Netz`);
