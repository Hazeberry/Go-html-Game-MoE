// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Pilot gegen GNU Go: mehrere Arme gepaart vergleichen. Gehört zu
   docs/muster-endspiel-dagger.md.

   Liest Rohdumps von gnugo-duell.js (je Arm eine oder mehrere Dateien) und
   vergleicht je gewünschtem Paar X-Y den Endstand nach GNU Gos Zählung,
   gepaart nach Partienummer: Differenz X − Y, 95-%-Intervall, zweiseitiger
   t-Test, Siege, beide Hälften (kleinere und größere Nummern), dazu die
   Schätzung nach Zug 120. Abgebrochene Partien fallen samt Partner heraus.

   Mit --container prüft es, ob Partien eines Arms dieselben sind wie in einer
   früheren Datei (docs/daten/endmuster-pilot.json): gleicher Endstand und
   gleiche Zugzahl je Partienummer. Das zeigt, ob zwei Umgebungen (Container
   und GitHub Actions) Zug für Zug dasselbe spielen.

   Aufruf:
     node auswertung/endspiel-pilot-bericht.js --arm A=a1.jsonl,a2.jsonl --arm VOR=... --arm NEU=...
          --paare NEU-A,VOR-A,NEU-VOR [--markdown] [--container docs/daten/endmuster-pilot.json --zuordnung A=A,VOR=200] */
'use strict';
const fs = require('fs');

/* ── Zweiseitiges p der t-Verteilung (Kettenbruch, Numerical Recipes) ───── */
function betacf(x, a, b) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}
function lgamma(z) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = z, t = z + 5.5; t -= (z + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log(2.5066282746310005 * s / z);
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(x, a, b) / a : 1 - bt * betacf(1 - x, b, a) / b;
}
const pZweiseitig = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);
/* t-Wert, bei dem das zweiseitige p gleich 0,05 ist (Bisektion) */
function tKritisch(df) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (pZweiseitig(m, df) > 0.05) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
function paarStatistik(paare) {
  const n = paare.length;
  if (n < 3) return null;
  const d = paare.map(x => x.x - x.y), md = mittel(d), sd = Math.sqrt(d.reduce((s, v) => s + (v - md) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n), t = se > 0 ? md / se : 0, tk = tKritisch(n - 1);
  return {n, x: mittel(paare.map(q => q.x)), y: mittel(paare.map(q => q.y)), diff: md, sd, lo: md - tk * se, hi: md + tk * se, t, p: pZweiseitig(t, n - 1)};
}

function liesArm(dateien) {
  const m = new Map();
  for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) { const r = JSON.parse(z); m.set(r.nr, r); }
  return m;
}

function vergleiche(arme, x, y) {
  const X = arme[x], Y = arme[y];
  const nummern = [...X.keys()].filter(nr => Y.has(nr) && !X.get(nr).abgebrochen && !Y.get(nr).abgebrochen).sort((a, b) => a - b);
  const ende = nummern.map(nr => ({nr, x: X.get(nr).endstand, y: Y.get(nr).endstand}));
  const haelfte = Math.ceil(ende.length / 2);
  const z120 = nummern.filter(nr => X.get(nr).schaetzung && Y.get(nr).schaetzung && X.get(nr).schaetzung[120] !== undefined && Y.get(nr).schaetzung[120] !== undefined)
    .map(nr => ({x: X.get(nr).schaetzung[120], y: Y.get(nr).schaetzung[120]}));
  return {
    name: `${x} − ${y}`, gesamt: paarStatistik(ende), h1: paarStatistik(ende.slice(0, haelfte)), h2: paarStatistik(ende.slice(haelfte)), z120: paarStatistik(z120),
    siegeX: nummern.filter(nr => X.get(nr).gewonnen).length, siegeY: nummern.filter(nr => Y.get(nr).gewonnen).length,
    besser: ende.filter(q => q.x > q.y).length, schlechter: ende.filter(q => q.x < q.y).length,
  };
}

const f1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

function bericht(arme, paare, opt) {
  const aus = [];
  for (const [name, m] of Object.entries(arme)) aus.push(`Arm ${name}: ${m.size} Partien, Endstand Ø ${mittel([...m.values()].map(r => r.endstand)).toFixed(1)}, Siege ${[...m.values()].filter(r => r.gewonnen).length}`);
  const ergebnisse = paare.map(([x, y]) => vergleiche(arme, x, y));
  if (opt.markdown) {
    aus.length = 0;
    aus.push('| Arm | Partien | Endstand Ø | Siege |', '|---|---:|---:|---:|');
    for (const [name, m] of Object.entries(arme)) aus.push(`| ${name} | ${m.size} | ${mittel([...m.values()].map(r => r.endstand)).toFixed(1).replace('.', ',')} | ${[...m.values()].filter(r => r.gewonnen).length} |`);
    aus.push('', '| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |', '|---|---:|---:|---|---:|---|---|---:|');
    for (const r of ergebnisse) {
      const g = r.gesamt; if (!g) { aus.push(`| ${r.name} | zu wenige Paare |||||||`); continue; }
      aus.push(`| **${r.name}** | ${g.n} | **${f1(g.diff)}** | [${f1(g.lo)}; ${f1(g.hi)}] | ${fp(g.p)} | ${r.h1 ? f1(r.h1.diff) : '–'} / ${r.h2 ? f1(r.h2.diff) : '–'} | ${r.siegeX} gegen ${r.siegeY} | ${r.z120 ? f1(r.z120.diff) : '–'} |`);
    }
  } else {
    for (const r of ergebnisse) {
      const g = r.gesamt; if (!g) { aus.push(`${r.name}: zu wenige Paare`); continue; }
      aus.push(`${r.name}: ${g.n} Paare · Ø ${g.x.toFixed(1)} gegen ${g.y.toFixed(1)} · Differenz ${f1(g.diff)} (SD ${g.sd.toFixed(1)}), 95 %: [${f1(g.lo)}; ${f1(g.hi)}], t = ${g.t.toFixed(2)}, p = ${fp(g.p)}`
        + ` · Hälften ${r.h1 ? f1(r.h1.diff) : '–'} / ${r.h2 ? f1(r.h2.diff) : '–'} · Siege ${r.siegeX} gegen ${r.siegeY} · besser ${r.besser}, schlechter ${r.schlechter}`
        + (r.z120 ? ` · nach Zug 120: ${f1(r.z120.diff)} (p = ${fp(r.z120.p)})` : ''));
    }
  }
  return {zeilen: aus, ergebnisse};
}

/* Kontrolle gegen eine frühere Datei: gleicher Endstand und gleiche Zugzahl je Partie */
function containerKontrolle(arme, datei, zuordnung) {
  const alt = JSON.parse(fs.readFileSync(datei, 'utf8')).partien;
  return Object.entries(zuordnung).map(([name, altArm]) => {
    const m = arme[name], a = new Map(alt.filter(p => p.arm === altArm).map(p => [p.nr, p]));
    let gleich = 0, n = 0;
    for (const [nr, r] of m) { const p = a.get(nr); if (!p) continue; n++; if (p.endstand === r.endstand && p.zuege === r.zuegeAnzahl) gleich++; }
    return {name, altArm, n, gleich};
  });
}

function main() {
  const a = process.argv.slice(2), opt = {arme: {}, paare: [], markdown: false, container: null, zuordnung: {}};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--arm') { const [n, f] = a[++i].split('='); opt.arme[n] = liesArm(f.split(',')); }
    else if (a[i] === '--paare') opt.paare = a[++i].split(',').map(s => s.split('-'));
    else if (a[i] === '--markdown') opt.markdown = true;
    else if (a[i] === '--container') opt.container = a[++i];
    else if (a[i] === '--zuordnung') for (const z of a[++i].split(',')) { const [n, alt] = z.split('='); opt.zuordnung[n] = alt; }
  }
  if (!Object.keys(opt.arme).length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }
  const b = bericht(opt.arme, opt.paare, opt);
  console.log(b.zeilen.join('\n'));
  if (opt.container) {
    console.log('');
    for (const k of containerKontrolle(opt.arme, opt.container, opt.zuordnung)) console.log(`${opt.markdown ? '- ' : ''}Kontrolle gegen den Container-Pilot, Arm ${k.name} (dort ${k.altArm}): ${k.gleich} von ${k.n} Partien mit gleichem Endstand und gleicher Zugzahl`);
  }
}

if (require.main === module) main();
module.exports = {paarStatistik, tKritisch, pZweiseitig, vergleiche, bericht, containerKontrolle, liesArm};
