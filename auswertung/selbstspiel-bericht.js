// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Selbstspiel-Wächters M2 (docs/teststaerke.md §2,
   docs/prior-nachmessung.md §4): die Teile eines Arms aus ab-harness.js
   (--json) zusammen, Siegrate von B gegen 50 %, exakter Binomialtest,
   zweiseitig, dazu das Wilson-Intervall und die Siege je Farbe.

     signifikant unter 50 %   p < 0,05 und Rate unter 50 %   (der Wächter schlägt an)
     signifikant über 50 %    p < 0,05 und Rate über 50 %
     sonst                    nicht signifikant

   Geprüft wird, dass jeder Teil abgeschlossen ist, alle Teile dieselben
   Konfigurationen A und B haben, kein Seed doppelt vorkommt und die Zahl der
   Partien stimmt.

   Aufruf:
     node auswertung/selbstspiel-bericht.js --name S9 --partien 360 teil1.json teil2.json ...
          [--markdown] [--roh aus.jsonl] */
'use strict';
const fs = require('fs');
const {vorzeichenP} = require('./messung-zusatz.js');

const pz = v => (100 * v).toFixed(1).replace('.', ',') + ' %';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

/* Wilson-Intervall (95 %) für k Erfolge in n */
function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const z = 1.959963984540054, p = k / n, d = 1 + z * z / n;
  const m = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [m - h, m + h];
}

/* Teile prüfen und zusammenzählen; wirft bei einem Fehler */
function auswertung(teile, erwartet) {
  if (!teile.length) throw new Error('keine Teile');
  const k0 = teile[0].daten.konfig || {};
  const seeds = new Set();
  let n = 0, b = 0, bS = 0, nBS = 0, bW = 0, nBW = 0, aufgaben = 0, zuege = 0, aufgabenB = 0, ausgezaehlt = 0, ausgezaehltB = 0;
  for (const {datei, daten} of teile) {
    const k = daten.konfig || {};
    if (k.abgeschlossen !== true) throw new Error(`${datei}: Lauf nicht abgeschlossen`);
    if (k.A !== k0.A || k.B !== k0.B) throw new Error(`${datei}: andere Konfiguration (A ${k.A}, B ${k.B})`);
    if (seeds.has(k.seed)) throw new Error(`${datei}: Seed ${k.seed} doppelt`);
    seeds.add(k.seed);
    for (const p of daten.partien || []) {
      n++; zuege += p.zuege; if (p.aufgabe) aufgaben++;
      const bGewinnt = p.sieger === 'B', bSchwarz = p.aIst === 'Weiß';
      if (p.aufgabe) { if (p.aufgabe === (bSchwarz ? 'S' : 'W')) aufgabenB++; }
      else { ausgezaehlt++; if (bGewinnt) ausgezaehltB++; }
      if (bGewinnt) b++;
      if (bSchwarz) { nBS++; if (bGewinnt) bS++; } else { nBW++; if (bGewinnt) bW++; }
    }
  }
  if (erwartet && n !== erwartet) throw new Error(`${n} Partien statt ${erwartet}`);
  const p = vorzeichenP(b, n - b), rate = n ? b / n : NaN;
  const urteil = p < 0.05 ? (rate < 0.5 ? 'signifikant unter 50 %' : 'signifikant über 50 %') : 'nicht signifikant';
  return {A: k0.A, B: k0.B, teile: teile.length, seeds: [...seeds].sort((x, y) => x - y), n, b, rate, ci: wilson(b, n), p, urteil,
          bSchwarz: {siege: bS, n: nBS}, bWeiss: {siege: bW, n: nBW}, aufgaben, aufgabenB, aufgabenA: aufgaben - aufgabenB,
          ausgezaehlt: {n: ausgezaehlt, siegeB: ausgezaehltB, p: vorzeichenP(ausgezaehltB, ausgezaehlt - ausgezaehltB)}, zuegeMittel: n ? zuege / n : NaN};
}

function text(name, r, opt) {
  const seeds = r.seeds.length ? `${r.seeds[0]} bis ${r.seeds[r.seeds.length - 1]}` : '–';
  if (opt.markdown) return [
    '| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |',
    '|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|',
    `| **${name}** | \`${r.A}\` | \`${r.B}\` | ${r.n} | ${r.b} | **${pz(r.rate)}** | [${pz(r.ci[0])}; ${pz(r.ci[1])}] | ${fp(r.p)} | ${r.bSchwarz.siege} von ${r.bSchwarz.n} | ${r.bWeiss.siege} von ${r.bWeiss.n} | ${r.aufgaben} | ${r.zuegeMittel.toFixed(1).replace('.', ',')} | ${r.urteil} |`,
    '', `- ${r.teile} Teile, Seeds ${seeds}`,
    `- Aufgaben: B ${r.aufgabenB}, A ${r.aufgabenA} · ausgezählt: B gewinnt ${r.ausgezaehlt.siegeB} von ${r.ausgezaehlt.n} (p = ${fp(r.ausgezaehlt.p)})`].join('\n');
  return `${name}: B (${r.B}) gegen A (${r.A}) · ${r.n} Partien in ${r.teile} Teilen (Seeds ${seeds}) · B gewinnt ${r.b}, ${pz(r.rate)}, 95 %: [${pz(r.ci[0])}; ${pz(r.ci[1])}], p = ${fp(r.p)} (exakt, zweiseitig)`
    + ` · B als Schwarz ${r.bSchwarz.siege} von ${r.bSchwarz.n}, als Weiß ${r.bWeiss.siege} von ${r.bWeiss.n} · Aufgaben ${r.aufgaben} (B ${r.aufgabenB}, A ${r.aufgabenA}), ausgezählt B ${r.ausgezaehlt.siegeB} von ${r.ausgezaehlt.n} · Züge Ø ${r.zuegeMittel.toFixed(1).replace('.', ',')} → ${r.urteil}`;
}

/* Eine Zeile je Partie, mit Seed und Konfiguration des Teils */
function rohZeilen(teile) {
  const z = [];
  for (const {daten} of teile) for (const p of daten.partien || [])
    z.push(JSON.stringify({seed: daten.konfig.seed, A: daten.konfig.A, B: daten.konfig.B, ...p}));
  return z.join('\n') + '\n';
}

function main() {
  const a = process.argv.slice(2), opt = {name: 'B', partien: 0, markdown: false, roh: null, dateien: []};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--name') opt.name = a[++i];
    else if (a[i] === '--partien') opt.partien = +a[++i];
    else if (a[i] === '--markdown') opt.markdown = true;
    else if (a[i] === '--roh') opt.roh = a[++i];
    else opt.dateien.push(a[i]);
  }
  if (!opt.dateien.length) { console.error('Aufruf: node auswertung/selbstspiel-bericht.js --name S9 --partien 360 teil1.json ...'); process.exit(1); }
  const teile = opt.dateien.map(datei => ({datei, daten: JSON.parse(fs.readFileSync(datei, 'utf8'))}));
  let r;
  try { r = auswertung(teile, opt.partien); } catch (e) { console.error(e.message); process.exit(1); }
  console.log(text(opt.name, r, opt));
  if (opt.roh) fs.writeFileSync(opt.roh, rohZeilen(teile));
}

if (require.main === module) main();
module.exports = {wilson, auswertung, text, rohZeilen};
