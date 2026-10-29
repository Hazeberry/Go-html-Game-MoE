// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Vergleichs der aktuellen Engine mit der PWA
   (docs/pwa-vergleich.md §4). Die Partien kommen aus gnugo-duell.js mit
   --gegner ki: „wir“ ist die aktuelle Engine (N), der Gegner die KI aus
   --gegner-html. Je Teil:

     M1   N gegen die PWA, 120 Simulationen
     M2   N gegen die PWA, 1,8 s je Zug
     K1   N gegen N über den Adapter (Gleichstandsprobe), 120 Simulationen

   Endpunkt ist die Siegrate von N mit dem exakten Intervall (Clopper-Pearson,
   95 %) und dem exakten Binomialtest gegen 50 % (zweiseitig). Dazu
   beschreibend: Endstand aus Sicht von N (Mittel, 95 % t), Siege je Farbe,
   GNU Gos Schätzung nach Zug 40, 80, 120 und 200, Züge und Simulationen.
   Abgebrochene Partien und Partien am Zuglimit zählen nicht.

   Urteil, vorab festgelegt: K1 ist bestanden, wenn das Intervall 50 %
   enthält. M1 und M2 je für sich: „neu stärker“, wenn die Untergrenze über
   50 % liegt, „neu schwächer“, wenn die Obergrenze unter 50 % liegt, sonst
   „kein Unterschied belegt“. Ist K1 nicht bestanden, steht beim Urteil, dass
   der Adapter selbst einen Vorteil gibt.

   Aufruf:
     node auswertung/pwa-bericht.js --teil M1=a.jsonl,b.jsonl --teil M2=... --teil K1=...
          [--kontrolle neu.jsonl,alt.jsonl] */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const {intervall, kontrolle} = require('./fuego/pruefstand-bericht.js');
const {vorzeichenP} = require('./messung-zusatz.js');
const {stat} = require('./komponenten/bericht.js');

const TEILE = {
  M1: 'Hauptmessung: N gegen die PWA, 120 Simulationen',
  M2: 'Zweite Messung: N gegen die PWA, 1,8 s je Zug',
  K1: 'Gleichstandsprobe: N gegen N über den Adapter, 120 Simulationen'
};
const MARKEN = [40, 80, 120, 200];
const mittel = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;

function teil(partien) {
  const ok = partien.filter(r => !r.abgebrochen && r.gewonnen !== null && r.gewonnen !== undefined);
  const siege = ok.filter(r => r.gewonnen).length, n = ok.length;
  const [lo, hi] = intervall(siege, n);
  const farbe = f => { const t = ok.filter(r => r.wirFarbe === f); return {n: t.length, siege: t.filter(r => r.gewonnen).length}; };
  const schaetzung = {};
  for (const z of MARKEN) schaetzung[z] = mittel(ok.map(r => (r.schaetzung || {})[z]).filter(Number.isFinite));
  return {partien: partien.length, abgebrochen: partien.filter(r => r.abgebrochen).length,
          zuglimit: partien.filter(r => !r.abgebrochen && (r.gewonnen === null || r.gewonnen === undefined)).length,
          n, siege, rate: n ? siege / n : NaN, lo, hi, p: vorzeichenP(siege, n - siege),
          endstand: stat(ok.map(r => r.endstand), 0.05), schwarz: farbe('S'), weiss: farbe('W'), schaetzung,
          zuege: mittel(ok.map(r => r.zuegeAnzahl)), sims: mittel(ok.map(r => r.simsMittel).filter(Number.isFinite))};
}

function urteil(t) {
  if (!t || !t.n) return 'unvollständig';
  if (t.lo > 0.5) return 'neu stärker';
  if (t.hi < 0.5) return 'neu schwächer';
  return 'kein Unterschied belegt';
}

function auswertung(daten) {
  const aus = {};
  for (const [name, partien] of Object.entries(daten)) aus[name] = teil(partien);
  const k1 = aus.K1 ? {bestanden: aus.K1.n > 0 && aus.K1.lo <= 0.5 && aus.K1.hi >= 0.5} : null;
  return {teile: aus, k1, urteile: ['M1', 'M2'].filter(t => aus[t]).map(t => ({teil: t, urteil: urteil(aus[t])}))};
}

const pz = v => Number.isFinite(v) ? (100 * v).toFixed(1).replace('.', ',') + ' %' : '–';
const z1 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') : '–';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

function text(a, k) {
  const z = [];
  for (const [name, t] of Object.entries(a.teile)) {
    z.push(`## ${name}: ${TEILE[name] || name}`, '',
      '| Partien | abgebr. | Zuglimit | gewertet | Siege N | Rate | 95 % | p (gegen 50 %) | N als Schwarz | N als Weiß |',
      '|---:|---:|---:|---:|---:|---:|---|---:|---|---|',
      `| ${t.partien} | ${t.abgebrochen} | ${t.zuglimit} | ${t.n} | ${t.siege} | **${pz(t.rate)}** | [${pz(t.lo)}; ${pz(t.hi)}] | ${fp(t.p)} | ${t.schwarz.siege} von ${t.schwarz.n} | ${t.weiss.siege} von ${t.weiss.n} |`, '',
      `Endstand aus Sicht von N: ${z1(t.endstand && t.endstand.m)} [${z1(t.endstand && t.endstand.lo)}; ${z1(t.endstand && t.endstand.hi)}] (95 %, t). `
      + `GNU Gos Schätzung aus Sicht von N: ${MARKEN.map(m => `Zug ${m} ${z1(t.schaetzung[m])}`).join(', ')}. `
      + `Züge Ø ${Number.isFinite(t.zuege) ? Math.round(t.zuege) : '–'}, Simulationen von N je Zug Ø ${Number.isFinite(t.sims) ? Math.round(t.sims) : '–'}.`, '');
  }
  if (a.k1) z.push(`Gleichstandsprobe K1: ${a.k1.bestanden ? 'bestanden (das Intervall enthält 50 %)' : 'NICHT bestanden: Der Adapter gibt einer Seite selbst einen Vorteil.'}`, '');
  if (k) z.push(`Kontrolle: ${k.gleich} von ${k.erwartet} Partien Zug für Zug gleich wie in M1 (${k.ok ? 'bestanden' : 'NICHT bestanden'})`, '');
  if (a.urteile.length) {
    z.push('## Urteil (vorab festgelegt)', '');
    for (const u of a.urteile) z.push(`- ${u.teil}: **${u.urteil}**${a.k1 && !a.k1.bestanden ? ' (Vorsicht: K1 nicht bestanden)' : ''}`);
  }
  return z.join('\n');
}

const lies = d => {
  const roh = fs.readFileSync(d);
  return (d.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x));
};

function main() {
  const arg = process.argv.slice(2), daten = {};
  let k = null;
  for (let i = 0; i < arg.length; i++) {
    const m = arg[i] === '--teil' && /^(M1|M2|K1)=(.+)$/.exec(arg[i + 1] || '');
    const c = arg[i] === '--kontrolle' && /^([^,]+),([^,]+)$/.exec(arg[i + 1] || '');
    if (m) { daten[m[1]] = m[2].split(',').flatMap(lies); i++; }
    else if (c) { k = kontrolle(lies(c[1]), lies(c[2])); i++; }
    else { console.error('Aufruf: node auswertung/pwa-bericht.js --teil M1=a.jsonl,... [--teil M2=...] [--teil K1=...] [--kontrolle neu,alt]'); process.exit(2); }
  }
  if (!Object.keys(daten).length) { console.error('keine Partien'); process.exit(2); }
  console.log(text(auswertung(daten), k));
}

if (require.main === module) main();
module.exports = {auswertung, text, teil, urteil, TEILE};
