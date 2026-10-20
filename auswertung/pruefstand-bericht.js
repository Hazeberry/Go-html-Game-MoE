// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Prüfstands (docs/teststaerke.md §8): je Vorgabe Siege, Endstand
   (Mittel, SD), Schätzung nach Zug 120 und die vorab festgelegte Wahl: die
   Vorgabe, deren Siegrate am nächsten an 50 % liegt (bei Gleichstand die mit
   mehr Steinen), sofern sie zwischen 25 und 75 % liegt; sonst bleiben 9.

   Aufruf: node auswertung/pruefstand-bericht.js 9=a.jsonl,b.jsonl 6=... [--markdown] */
'use strict';
const fs = require('fs');

const z1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
const pz = v => (100 * v).toFixed(0) + ' %';
const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mittel(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

function zeile(vorgabe, partien) {
  const ok = partien.filter(p => !p.abgebrochen);
  const e = ok.map(p => p.endstand), s120 = ok.filter(p => p.schaetzung && p.schaetzung[120] !== undefined).map(p => p.schaetzung[120]);
  return {vorgabe, n: ok.length, abgebrochen: partien.length - ok.length, siege: ok.filter(p => p.gewonnen).length,
          rate: ok.filter(p => p.gewonnen).length / ok.length, endstand: mittel(e), sd: sd(e), z120: s120.length ? mittel(s120) : NaN};
}

function wahl(zeilen) {
  const inFrage = zeilen.filter(z => z.rate >= 0.25 && z.rate <= 0.75);
  if (!inFrage.length) return 9;
  const abstand = z => Math.round(Math.abs(z.rate - 0.5) * 1e6);   // gerundet, damit 0,55 und 0,45 gleich weit liegen
  inFrage.sort((a, b) => abstand(a) - abstand(b) || b.vorgabe - a.vorgabe);
  return inFrage[0].vorgabe;
}

function text(zeilen, md) {
  const aus = [];
  if (md) aus.push('| Vorgabe | Partien | Siege der KI | Endstand Ø | SD | nach Zug 120 |', '|---:|---:|---:|---:|---:|---:|');
  for (const z of zeilen) aus.push(md
    ? `| ${z.vorgabe} | ${z.n} | ${z.siege} (${pz(z.rate)}) | ${z1(z.endstand)} | ${z.sd.toFixed(1).replace('.', ',')} | ${Number.isFinite(z.z120) ? z1(z.z120) : '–'} |`
    : `Vorgabe ${z.vorgabe}: ${z.n} Partien (${z.abgebrochen} abgebrochen) · Siege ${z.siege} (${pz(z.rate)}) · Endstand Ø ${z1(z.endstand)}, SD ${z.sd.toFixed(1)} · nach Zug 120 ${Number.isFinite(z.z120) ? z1(z.z120) : '–'}`);
  aus.push('', `${md ? '**Wahl nach §8:** ' : 'Wahl nach §8: '}${wahl(zeilen)} Vorgabesteine`);
  return aus.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2), md = a.includes('--markdown');
  const zeilen = a.filter(x => x !== '--markdown').map(arg => {
    const [v, dateien] = arg.split('=');
    const partien = dateien.split(',').flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)));
    return zeile(+v, partien);
  }).sort((x, y) => y.vorgabe - x.vorgabe);
  console.log(text(zeilen, md));
}

module.exports = {zeile, wahl, text};
