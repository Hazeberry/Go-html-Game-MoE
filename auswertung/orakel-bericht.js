// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zahlen zum Orakel-Test (docs/muster-endspiel-orakel.md §4): je Arm, in dem
   GNU Go einen Teil der Züge der KI gespielt hat (`--orakel-zug` in
   gnugo-duell.js), wie viele Züge das Orakel übernommen hat, wie oft der Zug
   der KI derselbe gewesen wäre und was ein geänderter Zug im Mittel wert war:
   Differenz des Endstands zu einem Referenzarm, gepaart nach Partienummer,
   geteilt durch die mittlere Zahl geänderter Züge je Partie. Geändert heißt:
   Das Orakel hat gezogen und sein Zug war nicht der der KI.

   Dazu die Steigung über die Dosis-Arme (`--dosis`: gleicher Beginn, kleine
   Anteile; Regression durch den Ursprung) und die Messlatte: Ein Lerner, der in
   einem Anteil q der Züge ab Zug AB den Zug der KI durch den Orakelzug ersetzt,
   wo beide verschieden sind, gewinnt rund s × n × q Punkte (s Punkte je
   geändertem Zug, n Züge der KI ab Zug AB in einer Partie des Referenzarms,
   also ohne Orakel). Für `--ziel` Punkte ist q = ziel / (s × n). q ist der
   Zuwachs der Trefferquote der gespielten Züge.

   Mit --kontrolle <datei> (jsonl, auch .gz) wird der Referenzarm gegen eine
   frühere Messung desselben Seeds verglichen: gleicher Endstand und gleiche
   Zugzahl je Partienummer. Er muss dort Zug für Zug dasselbe spielen.

   Aufruf:
     node auswertung/orakel-bericht.js --ref A --arm A=a.jsonl[,..] --arm D100=d.jsonl ...
          [--dosis D25,D50,D100] [--ziel 5] [--kontrolle frueher.jsonl.gz] [--markdown] */
'use strict';
const fs = require('fs'), zlib = require('zlib');
const B = require('./endspiel-pilot-bericht.js');

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;

/* Was das Orakel in einem Arm getan hat, über alle ausgespielten Partien */
function orakelArm(arm) {
  const r = [...arm.values()].filter(p => !p.abgebrochen && p.orakelZug);
  if (!r.length) return null;
  const sum = k => r.reduce((s, p) => s + p.orakelZug[k], 0);
  return {
    partien: r.length, ab: r[0].orakelZug.ab, anteil: r[0].orakelZug.anteil, stufe: r[0].orakelZug.stufe,
    gelegenheiten: sum('gelegenheiten') / r.length, ersetzt: sum('eingesetzt') / r.length,
    geaendert: (sum('eingesetzt') - sum('gleich')) / r.length,
    gleich: sum('eingesetzt') ? sum('gleich') / sum('eingesetzt') : NaN, paesse: sum('paesse') / r.length,
  };
}

/* Züge der KI ab der Zugzahl ab in einer Partie: die KI zieht an den Zugnummern k mit
   (k gerade) = (beginnt == wirFarbe) */
function kiZuegeAb(p, ab) {
  const gerade = p.beginnt === p.wirFarbe;
  let n = 0;
  for (let k = ab; k < p.zuegeAnzahl; k++) if ((k % 2 === 0) === gerade) n++;
  return n;
}

/* Steigung durch den Ursprung: Punkte je geändertem Zug aus mehreren Dosen */
function steigung(punkte) {
  const xx = punkte.reduce((s, p) => s + p.x * p.x, 0);
  return xx > 0 ? punkte.reduce((s, p) => s + p.x * p.y, 0) / xx : NaN;
}

function auswertung(arme, ref, dosis, ziel) {
  const zeilen = [];
  for (const [name, arm] of Object.entries(arme)) {
    if (name === ref) continue;
    const o = orakelArm(arm); if (!o) continue;
    const v = B.vergleiche(arme, name, ref), g = v.gesamt;
    if (!g) continue;
    const d = o.geaendert;
    zeilen.push({name, ...o, paare: g.n, diff: g.diff, lo: g.lo, hi: g.hi, p: g.p,
      jeZug: d > 0 ? g.diff / d : NaN, jeZugLo: d > 0 ? g.lo / d : NaN, jeZugHi: d > 0 ? g.hi / d : NaN});
  }
  const dz = zeilen.filter(z => dosis.includes(z.name));
  const s = dz.length ? steigung(dz.map(z => ({x: z.geaendert, y: z.diff}))) : NaN;
  /* n: Züge der KI ab Zug AB in den Partien des Referenzarms (ohne Orakel) */
  const refPartien = [...arme[ref].values()].filter(p => !p.abgebrochen);
  const n = dz.length && refPartien.length ? mittel(refPartien.map(p => kiZuegeAb(p, dz[0].ab))) : NaN;
  const q = s > 0 && n > 0 ? ziel / (s * n) : NaN;
  return {zeilen, steigung: s, gelegenheiten: n, ziel, q, dosis: dz.map(z => z.name)};
}

/* Der Referenzarm gegen eine frühere Datei: gleiche Partienummer, gleicher Endstand, gleiche Zugzahl */
function kontrolle(arm, datei) {
  const roh = fs.readFileSync(datei);
  const text = (datei.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8');
  const alt = new Map(text.trim().split('\n').filter(Boolean).map(z => JSON.parse(z)).map(r => [r.nr, r]));
  let n = 0, gleich = 0;
  for (const [nr, r] of arm) {
    const a = alt.get(nr); if (!a) continue;
    n++; if (a.endstand === r.endstand && a.zuegeAnzahl === r.zuegeAnzahl) gleich++;
  }
  return {n, gleich};
}

const f1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
const f2 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',');
const z1 = v => v.toFixed(1).replace('.', ',');
const pz = v => (100 * v).toFixed(1).replace('.', ',') + ' %';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

function text(a, ref, opt) {
  const aus = [];
  if (opt.markdown) {
    aus.push(`| Arm | Orakel | Partien | Gelegenheiten Ø | ersetzt Ø | davon geändert Ø | Zug der KI = Orakelzug | Differenz zu ${ref} | 95 % | p | je geändertem Zug |`,
             '|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|');
    for (const z of a.zeilen) aus.push(`| **${z.name}** | ab Zug ${z.ab + 1}, ${Math.round(z.anteil * 100)} % | ${z.paare} | ${z1(z.gelegenheiten)} | ${z1(z.ersetzt)} | ${z1(z.geaendert)} | ${pz(z.gleich)} | **${f1(z.diff)}** | [${f1(z.lo)}; ${f1(z.hi)}] | ${fp(z.p)} | ${f2(z.jeZug)} [${f2(z.jeZugLo)}; ${f2(z.jeZugHi)}] |`);
  } else {
    for (const z of a.zeilen) aus.push(`Arm ${z.name}: Orakel Stufe ${z.stufe} ab Zug ${z.ab + 1}, Anteil ${Math.round(z.anteil * 100)} % · ${z.paare} Paare · Gelegenheiten Ø ${z1(z.gelegenheiten)}, ersetzt Ø ${z1(z.ersetzt)}, davon geändert Ø ${z1(z.geaendert)}, Pässe Ø ${z1(z.paesse)}, Zug der KI = Orakelzug in ${pz(z.gleich)}`
      + ` · Differenz zu ${ref} ${f1(z.diff)} [${f1(z.lo)}; ${f1(z.hi)}], p = ${fp(z.p)} · je geändertem Zug ${f2(z.jeZug)} [${f2(z.jeZugLo)}; ${f2(z.jeZugHi)}] (Näherung: Nenner als fest behandelt)`);
  }
  if (Number.isFinite(a.steigung)) {
    aus.push('', `Steigung über ${a.dosis.join(', ')} (Regression durch den Ursprung): ${f2(a.steigung)} Punkte je geändertem Zug.`);
    if (Number.isFinite(a.q)) aus.push(`Messlatte: Mit n = ${z1(a.gelegenheiten)} Zügen der KI ab dem Beginn des Orakels in einer Partie von Arm ${ref} gewinnt ein Lerner, der in einem Anteil q dieser Züge den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind, rund ${f2(a.steigung)} × ${z1(a.gelegenheiten)} × q Punkte. Für ${a.ziel} Punkte ist q = ${pz(a.q)}.`);
    else aus.push('Messlatte: nicht berechenbar (Steigung nicht positiv).');
  }
  return aus.join('\n');
}

function main() {
  const a = process.argv.slice(2), opt = {arme: {}, ref: 'A', dosis: [], ziel: 5, markdown: false, kontrolle: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--arm') { const [n, f] = a[++i].split('='); opt.arme[n] = B.liesArm(f.split(',')); }
    else if (a[i] === '--ref') opt.ref = a[++i];
    else if (a[i] === '--dosis') opt.dosis = a[++i].split(',');
    else if (a[i] === '--ziel') opt.ziel = +a[++i];
    else if (a[i] === '--kontrolle') opt.kontrolle = a[++i];
    else if (a[i] === '--markdown') opt.markdown = true;
  }
  if (!opt.arme[opt.ref]) { console.error('Aufruf: node auswertung/orakel-bericht.js --ref A --arm A=a.jsonl --arm D100=d.jsonl ...'); process.exit(1); }
  console.log(text(auswertung(opt.arme, opt.ref, opt.dosis, opt.ziel), opt.ref, opt));
  if (opt.kontrolle) {
    const k = kontrolle(opt.arme[opt.ref], opt.kontrolle);
    console.log('', `${opt.markdown ? '- ' : ''}Kontrolle gegen ${opt.kontrolle}, Arm ${opt.ref}: ${k.gleich} von ${k.n} Partien mit gleichem Endstand und gleicher Zugzahl`);
  }
}

if (require.main === module) main();
module.exports = {orakelArm, kiZuegeAb, steigung, auswertung, kontrolle, text};
