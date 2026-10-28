// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des Prüfstands gegen Fuego (docs/fuego.md §11). Je Arm (Vorgabe ×
   Spiele je Zug) dieselben Angaben wie im kurzen Lauf (kurz-bericht.js), dazu
   die Siegquote mit exaktem 95-%-Intervall (Clopper-Pearson) und die vorab
   festgelegte Wahl:

     1. In Frage kommt ein Arm mit mindestens 27 fertigen Partien und einer
        Siegquote zwischen 25 und 75 %.
     2. Gewählt wird die Quote am nächsten an 50 %.
     3. Bei Gleichstand die höhere Spielzahl (Fuego möglichst stark), dann
        die kleinere Vorgabe (näher an den Messungen gegen GNU Go).
     4. Kommt kein Arm in Frage, gibt es keine Wahl.

   Die Kontrolle vergleicht Partien eines zweiten Laufs mit denen des kurzen
   Laufs (gleiche Nummer, gleiche Züge).

   Aufruf: node auswertung/fuego/pruefstand-bericht.js 9/100=a.jsonl,b.jsonl ... \
             [--zeit zeit.txt ...] [--kontrolle neu.jsonl alt.jsonl(.gz)] [--markdown]
   Zeitdateien: je Zeile „<vorgabe>/<spiele> <sekunden> <partien>“. */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const {auswertung} = require('./kurz-bericht.js');

const MINDESTENS = 27;
const komma = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n).replace('.', ',').replace(/^(\d)/, '+$1').replace(/^\+-/, '−').replace(/^-/, '−') : '–';
const pz = x => Number.isFinite(x) ? (100 * x).toFixed(0) + ' %' : '–';

/* P(X ≤ k) für X ~ Bin(n, p) */
function binomVerteilung(k, n, p) {
  let s = 0, t = Math.pow(1 - p, n);
  for (let i = 0; i <= k; i++) { s += t; t *= (n - i) / (i + 1) * p / (1 - p); }
  return s;
}
/* exaktes zweiseitiges 95-%-Intervall nach Clopper-Pearson */
function intervall(k, n) {
  if (!n) return [NaN, NaN];
  const suche = f => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m)) hi = m; else lo = m; } return (lo + hi) / 2; };
  const unten = k === 0 ? 0 : suche(p => 1 - binomVerteilung(k - 1, n, p) >= 0.025);
  const oben = k === n ? 1 : suche(p => binomVerteilung(k, n, p) <= 0.025);
  return [unten, oben];
}

function arm(vorgabe, spiele, partien, zeiten = []) {
  const a = auswertung(partien, zeiten);
  const rate = a.fertig ? a.siege / a.fertig : NaN;
  return {...a, vorgabe, spiele, rate, ki: intervall(a.siege, a.fertig), inFrage: a.fertig >= MINDESTENS && rate >= 0.25 && rate <= 0.75};
}

function wahl(arme) {
  const abstand = z => Math.round(Math.abs(z.rate - 0.5) * 1e6);   // gerundet, damit 0,55 und 0,45 gleich weit liegen
  const l = arme.filter(z => z.inFrage).sort((a, b) => abstand(a) - abstand(b) || b.spiele - a.spiele || a.vorgabe - b.vorgabe);
  return l.length ? {vorgabe: l[0].vorgabe, spiele: l[0].spiele} : null;
}

/* Kontrolle: Partien mit gleicher Nummer, gleich, wenn die Züge gleich sind */
function kontrolle(neu, alt) {
  const nachNr = new Map(alt.map(r => [r.nr, r]));
  const paare = neu.filter(r => nachNr.has(r.nr));
  const gleich = paare.filter(r => !r.abgebrochen && !nachNr.get(r.nr).abgebrochen && r.zuege.join(' ') === nachNr.get(r.nr).zuege.join(' ')).length;
  return {verglichen: paare.length, gleich, erwartet: neu.length, ok: paare.length === neu.length && gleich === neu.length && neu.length > 0};
}

function text(arme, md, k = null) {
  const aus = [];
  const g = wahl(arme);
  const wahlText = g ? `${g.vorgabe} Vorgabesteine, ${g.spiele} Spiele je Zug` : 'keine (kein Arm mit 27 fertigen Partien und 25 bis 75 % Siegen)';
  if (md) {
    aus.push('| Vorgabe | Spiele | Partien (abgebr.) | Siege der KI | 95-%-Intervall | Endstand Ø (SD) | nach Zug 60 / 120 / 200 | Pässe Fuego Ø | Min. je Partie |',
             '|---:|---:|---:|---:|---|---:|---|---:|---:|');
    for (const z of arme) aus.push(`| ${z.vorgabe} | ${z.spiele} | ${z.fertig} (${z.abgebrochen}) | ${z.siege} (${pz(z.rate)}) | ${pz(z.ki[0])} bis ${pz(z.ki[1])} | ${komma(z.endstand)} (${Number.isFinite(z.endstandSd) ? z.endstandSd.toFixed(1).replace('.', ',') : '–'}) | ${komma(z.nach60)} / ${komma(z.nach120)} / ${komma(z.nach200)} | ${Number.isFinite(z.fuegoPaesse) ? z.fuegoPaesse.toFixed(1).replace('.', ',') : '–'} | ${Number.isFinite(z.minutenJePartie) ? z.minutenJePartie.toFixed(1).replace('.', ',') : '–'} |`);
  } else {
    for (const z of arme) aus.push(`Vorgabe ${z.vorgabe}, ${z.spiele} Spiele: ${z.fertig} fertig (${z.abgebrochen} abgebrochen) · Siege ${z.siege} (${pz(z.rate)}, 95 % ${pz(z.ki[0])} bis ${pz(z.ki[1])}) · Endstand Ø ${komma(z.endstand)} · nach Zug 60/120/200 ${komma(z.nach60)} / ${komma(z.nach120)} / ${komma(z.nach200)} · ${Number.isFinite(z.minutenJePartie) ? z.minutenJePartie.toFixed(1) : '–'} min je Partie`);
  }
  const gruende = arme.flatMap(z => z.gruende.map(x => `Vorgabe ${z.vorgabe}/${z.spiele}, ${x}`));
  if (gruende.length) aus.push('', 'Abgebrochen:', ...gruende.map(x => (md ? '- ' : '  ') + x));
  aus.push('', `${md ? '**Wahl nach §11:** ' : 'Wahl nach §11: '}${wahlText}`);
  if (k) aus.push('', `${md ? '**Kontrolle:** ' : 'Kontrolle: '}${k.gleich} von ${k.erwartet} Partien gleich wie im kurzen Lauf (${k.ok ? 'bestanden' : 'NICHT bestanden'})`);
  return aus.join('\n');
}

const lies = d => {
  const roh = fs.readFileSync(d);
  return (d.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
};

function main() {
  const arg = process.argv.slice(2), armArgs = [], zeitDateien = []; let md = false, kDateien = null;
  for (let i = 0; i < arg.length; i++) {
    if (arg[i] === '--markdown') md = true;
    else if (arg[i] === '--zeit') zeitDateien.push(arg[++i]);
    else if (arg[i] === '--kontrolle') { kDateien = [arg[i + 1], arg[i + 2]]; i += 2; }
    else armArgs.push(arg[i]);
  }
  if (!armArgs.length || (kDateien && !(kDateien[0] && kDateien[1]))) {
    console.error('Aufruf: node auswertung/fuego/pruefstand-bericht.js 9/100=a.jsonl,b.jsonl ... [--zeit zeit.txt ...] [--kontrolle neu.jsonl alt.jsonl.gz] [--markdown]');
    process.exit(2);
  }
  const zeiten = zeitDateien.flatMap(d => fs.readFileSync(d, 'utf8').split('\n').filter(Boolean).map(z => {
    const [schluessel, sekunden, n] = z.trim().split(/\s+/); return {schluessel, sekunden: +sekunden, partien: +n};
  }));
  const arme = armArgs.map(a => {
    const [kopf, dateien] = a.split('=');
    const [vorgabe, spiele] = kopf.split('/').map(Number);
    const partien = (dateien || '').split(',').filter(Boolean).flatMap(lies);
    return arm(vorgabe, spiele, partien, zeiten.filter(z => z.schluessel === kopf));
  }).sort((x, y) => y.vorgabe - x.vorgabe || x.spiele - y.spiele);
  const k = kDateien ? kontrolle(lies(kDateien[0]), lies(kDateien[1])) : null;
  console.log(text(arme, md, k));
}

if (require.main === module) main();
module.exports = {arm, wahl, intervall, kontrolle, text, MINDESTENS};
