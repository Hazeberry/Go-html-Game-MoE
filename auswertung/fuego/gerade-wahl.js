// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Prüfstand gegen Fuego ohne Vorgabe (docs/muster-fuego-siege.md §3): je
   Spielzahl die Siegquote von D mit exaktem 95-%-Intervall (Clopper-Pearson)
   und die vorab festgelegte Wahl:

     1. In Frage kommt eine Spielzahl mit einer Siegquote von D zwischen 40
        und 50 % (je einschließlich); gewählt wird die nächste an 45 %.
     2. Liegt keine dazwischen, kommt eine zwischen 30 und 60 % in Frage,
        wieder die nächste an 45 %; der Bericht nennt das.
     3. Bei Gleichstand die höhere Spielzahl (Fuego möglichst stark).
     4. Kommt keine in Frage, gibt es keine Wahl.

   Partien ohne Sieger (abgebrochen oder am Zuglimit) zählen nicht.

   Aufruf: node auswertung/fuego/gerade-wahl.js 10=a.jsonl,b.jsonl 20=... */
'use strict';
const fs = require('fs'), zlib = require('zlib');
const {intervall} = require('./pruefstand-bericht.js');

const pz = x => Number.isFinite(x) ? (100 * x).toFixed(1).replace('.', ',') + ' %' : '–';
const z1 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') : '–';

function arm(spiele, partien) {
  const ok = partien.filter(r => !r.abgebrochen && (r.gewonnen === true || r.gewonnen === false));
  const siege = ok.filter(r => r.gewonnen).length, n = ok.length;
  const end = ok.map(r => r.endstand).filter(Number.isFinite);
  return {spiele, partien: partien.length, n, siege, rate: n ? siege / n : NaN, ki: intervall(siege, n),
          endstand: end.length ? end.reduce((a, b) => a + b, 0) / end.length : NaN};
}

function wahl(arme) {
  const abstand = z => Math.round(Math.abs(z.rate - 0.45) * 1e6);
  for (const [lo, hi, stufe] of [[0.40, 0.50, 1], [0.30, 0.60, 2]]) {
    const l = arme.filter(z => z.n > 0 && z.rate >= lo - 1e-12 && z.rate <= hi + 1e-12).sort((a, b) => abstand(a) - abstand(b) || b.spiele - a.spiele);
    if (l.length) return {spiele: l[0].spiele, stufe};
  }
  return null;
}

function text(arme) {
  const w = wahl(arme);
  const z = ['| Spiele je Zug | Partien | gewertet | Siege D | Quote | 95 % | Endstand Ø |', '|---:|---:|---:|---:|---:|---|---:|'];
  for (const a of arme) z.push(`| ${a.spiele} | ${a.partien} | ${a.n} | ${a.siege} | ${pz(a.rate)} | ${pz(a.ki[0])} bis ${pz(a.ki[1])} | ${z1(a.endstand)} |`);
  z.push('', w ? `**Wahl: ${w.spiele} Spiele je Zug**${w.stufe === 2 ? ' (keine Quote zwischen 40 und 50 %, gewählt nach Regel 2: zwischen 30 und 60 %)' : ''}.`
    : '**Keine Wahl**: keine Quote zwischen 30 und 60 %.');
  return z.join('\n') + '\n';
}

module.exports = {arm, wahl, text};

if (require.main === module) {
  const lies = d => { const r = fs.readFileSync(d); return (d.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)); };
  const arme = [];
  for (const a of process.argv.slice(2)) {
    const m = /^(\d+)=(.+)$/.exec(a);
    if (!m) { console.error('Angabe spiele=datei,... erwartet: ' + a); process.exit(2); }
    arme.push(arm(+m[1], m[2].split(',').flatMap(lies)));
  }
  if (!arme.length) { console.error('Aufruf: node auswertung/fuego/gerade-wahl.js 10=a.jsonl 20=...'); process.exit(2); }
  arme.sort((a, b) => a.spiele - b.spiele);
  process.stdout.write(text(arme));
}
