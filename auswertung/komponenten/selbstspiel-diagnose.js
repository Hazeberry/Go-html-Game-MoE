// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Beschreibende Diagnose der Selbstspiel-Partien (M2) aus ab-harness.js
   (--roh, eine Partie je Zeile, auch .gz), nachträglich und ohne Anspruch
   (docs/muster-eroeffnung.md §9). Alles aus Sicht von B, gewertet wie im
   Harness (Fläche, Benson-tote Steine entfernt):

     1. Komi: Siege von B mit Komi 7,5 und mit Komi 0, in wie vielen Partien
        der Sieger kippt und wie oft zu Gunsten von B. Die Engine spielt
        komi-blind, Komi 0 ist also der exakte Kontrolltest.
     2. Niederlagen von B: Median des Endstands, wie viele knapp sind (Endstand
        über −7,5) und die Schranke: Siegrate, wenn alle knappen Niederlagen
        kippten.
     3. Farbe: Siege und Endstand Ø von B als Schwarz und als Weiß, dazu
        Schwarz − Weiß mit 95-%-Intervall (Welch, z). Bei gleichem Unterschied
        in beiden Armen liegt er an der Komi, nicht am Arm.
     4. Verlauf: Gebietsstand ohne Komi nach Zug 150, 200 und 250 und am Ende,
        wie oft B nach Zug 150 vorn liegt, und je Partie die Zahl der
        geschlagenen eigenen Steine von B und A (Feld verlust, summe).

   Aufruf:  node auswertung/komponenten/selbstspiel-diagnose.js NAME=datei.jsonl[.gz] ... */
'use strict';
const fs = require('fs'), zlib = require('zlib');

const zahl = (v, s = 1) => (v > 0 ? '+' : '') + v.toFixed(s).replace('.', ',').replace('-', '−');
const pz = v => (100 * v).toFixed(1).replace('.', ',') + ' %';
const mittel = a => a.reduce((s, v) => s + v, 0) / a.length;
const varianz = a => { const m = mittel(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
const median = a => { const s = [...a].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

/* 'B 188 : W 180.5' → Schwarz − Weiß */
function differenz(stand) {
  const m = /^B ([\d.]+) : W ([\d.]+)$/.exec(stand);
  if (!m) throw new Error('Stand nicht lesbar: ' + stand);
  return +m[1] - +m[2];
}

function lies(datei) {
  let t = fs.readFileSync(datei);
  if (datei.endsWith('.gz')) t = zlib.gunzipSync(t);
  return t.toString('utf8').split('\n').filter(z => z.trim()).map(z => JSON.parse(z));
}

function diagnose(partien) {
  const bSchwarz = p => p.aIst === 'Weiß';
  const sicht = (p, d) => bSchwarz(p) ? d : -d;
  const n = partien.length;
  const endstand = partien.map(p => sicht(p, differenz(p.stand)));
  const siege = partien.filter(p => p.sieger === 'B').length;
  const gekippt = partien.filter(p => p.sieger !== p.siegerKomi0);
  const niederlagen = endstand.filter((_, i) => partien[i].sieger !== 'B');
  const knapp = niederlagen.filter(v => v > -7.5).length;
  const farbe = {};
  for (const [name, f] of [['Schwarz', true], ['Weiß', false]]) {
    const idx = partien.map((p, i) => i).filter(i => bSchwarz(partien[i]) === f);
    farbe[name] = {n: idx.length, siege: idx.filter(i => partien[i].sieger === 'B').length, werte: idx.map(i => endstand[i])};
  }
  const s = farbe.Schwarz.werte, w = farbe.Weiß.werte;
  const sw = mittel(s) - mittel(w), swH = 1.959963984540054 * Math.sqrt(varianz(s) / s.length + varianz(w) / w.length);
  const verlauf = {};
  for (const k of ['M150', 'M200', 'M250']) {
    const v = partien.filter(p => p.gebietOhneKomi && p.gebietOhneKomi[k]).map(p => sicht(p, p.gebietOhneKomi[k].b - p.gebietOhneKomi[k].w));
    verlauf[k] = {n: v.length, mittel: mittel(v), vorn: v.filter(x => x > 0).length};
  }
  verlauf.Ende = {n, mittel: mittel(partien.map(p => sicht(p, differenz(p.standKomi0))))};
  return {
    n, siege, siegeKomi0: partien.filter(p => p.siegerKomi0 === 'B').length,
    gekippt: gekippt.length, gekipptFuerB: gekippt.filter(p => p.siegerKomi0 === 'B').length,
    niederlagen: niederlagen.length, medianNiederlage: median(niederlagen), knapp, schranke: (siege + knapp) / n,
    farbe: Object.fromEntries(Object.entries(farbe).map(([k, v]) => [k, {n: v.n, siege: v.siege, mittel: mittel(v.werte)}])),
    schwarzWeiss: {m: sw, lo: sw - swH, hi: sw + swH},
    verlauf,
    verlust: {B: mittel(partien.map(p => p.verlust.B.summe)), A: mittel(partien.map(p => p.verlust.A.summe))}
  };
}

function text(arme) {
  const z = [];
  z.push('| Arm | Siege, Komi 7,5 | Komi 0 | Sieger kippt | davon für B | Niederlagen | Median | knapp (über −7,5) | Schranke |');
  z.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [name, d] of arme) z.push(`| ${name} | ${d.siege} | ${d.siegeKomi0} | ${d.gekippt} | ${d.gekipptFuerB} | ${d.niederlagen} | ${zahl(d.medianNiederlage)} | ${d.knapp} | ${pz(d.schranke)} |`);
  z.push('', '| Arm | B als Schwarz: Siege, Endstand Ø | B als Weiß: Siege, Endstand Ø | Schwarz − Weiß (95 %) |', '|---|---|---|---|');
  for (const [name, d] of arme) {
    const f = d.farbe, sw = d.schwarzWeiss;
    z.push(`| ${name} | ${f.Schwarz.siege} von ${f.Schwarz.n}, ${zahl(f.Schwarz.mittel)} | ${f.Weiß.siege} von ${f.Weiß.n}, ${zahl(f.Weiß.mittel)} | ${zahl(sw.m)} [${zahl(sw.lo)}; ${zahl(sw.hi)}] |`);
  }
  z.push('', '| Arm | Zug 150 | Zug 200 | Zug 250 | Ende | B vorn nach Zug 150 | geschlagene Steine B / A |', '|---|---:|---:|---:|---:|---:|---|');
  for (const [name, d] of arme) {
    const v = d.verlauf;
    z.push(`| ${name} | ${zahl(v.M150.mittel)} | ${zahl(v.M200.mittel)} | ${zahl(v.M250.mittel)} | ${zahl(v.Ende.mittel)} | ${v.M150.vorn} von ${v.M150.n} | ${d.verlust.B.toFixed(1).replace('.', ',')} / ${d.verlust.A.toFixed(1).replace('.', ',')} |`);
  }
  return z.join('\n') + '\n';
}

module.exports = {diagnose, text, differenz};

if (require.main === module) {
  const arme = process.argv.slice(2).map(a => {
    const i = a.indexOf('=');
    if (i < 1) throw new Error('Angabe NAME=datei erwartet: ' + a);
    return [a.slice(0, i), diagnose(lies(a.slice(i + 1)))];
  });
  if (!arme.length) { console.error('Aufruf: node auswertung/komponenten/selbstspiel-diagnose.js NAME=datei.jsonl[.gz] ...'); process.exit(2); }
  process.stdout.write(text(arme));
}
