// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zusatzzahlen zur Paarmessung gegen GNU Go (docs/muster-endspiel-messung.md
   §4, sekundär): Züge je Partie, Median der Differenz B − A des Endstands und
   ein Vorzeichentest (exakt, zweiseitig; Gleichstände fallen heraus).
   Abgebrochene Partien fallen samt ihrem Partner heraus, wie in
   gnugo-vergleich.js.

   Aufruf:
     node auswertung/messung-zusatz.js --A a.jsonl[,a2.jsonl] --B b.jsonl[,...] */
'use strict';
const fs = require('fs');

function lies(dateien) {
  const m = new Map();
  for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) { const r = JSON.parse(z); m.set(r.nr, r); }
  return m;
}

/* Zweiseitiger exakter Vorzeichentest bei Wahrscheinlichkeit 1/2: doppelte
   Wahrscheinlichkeit, mindestens so viele Paare in der häufigeren Richtung zu
   sehen (höchstens 1). */
function vorzeichenP(besser, schlechter) {
  const n = besser + schlechter;
  if (n === 0) return 1;
  const lf = [0];
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  let p = 0;
  for (let i = Math.max(besser, schlechter); i <= n; i++) p += Math.exp(lf[n] - lf[i] - lf[n - i] - n * Math.LN2);
  return Math.min(1, 2 * p);
}

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;

function zusatz(A, B) {
  const nummern = [...A.keys()].filter(nr => B.has(nr) && !A.get(nr).abgebrochen && !B.get(nr).abgebrochen).sort((a, b) => a - b);
  const d = nummern.map(nr => B.get(nr).endstand - A.get(nr).endstand), n = d.length;
  const s = [...d].sort((a, b) => a - b);
  const median = n === 0 ? NaN : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const besser = d.filter(x => x > 0).length, schlechter = d.filter(x => x < 0).length;
  return {
    paare: n, ohnePartner: A.size - n, median, besser, schlechter, gleich: n - besser - schlechter, p: vorzeichenP(besser, schlechter),
    zuegeA: n ? mittel(nummern.map(nr => A.get(nr).zuegeAnzahl)) : NaN, zuegeB: n ? mittel(nummern.map(nr => B.get(nr).zuegeAnzahl)) : NaN,
    abgebrochenA: [...A.values()].filter(r => r.abgebrochen).length, abgebrochenB: [...B.values()].filter(r => r.abgebrochen).length,
  };
}

const f1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
const fp = p => p.toFixed(4).replace('.', ',');

function text(z) {
  return [
    `Paare: ${z.paare} (${z.ohnePartner} ohne Partner oder abgebrochen), abgebrochene Partien: A ${z.abgebrochenA}, B ${z.abgebrochenB}`,
    `Züge je Partie: A Ø ${z.zuegeA.toFixed(1)}, B Ø ${z.zuegeB.toFixed(1)}`,
    `Median der Differenz B − A: ${f1(z.median)}`,
    `Vorzeichentest: B besser in ${z.besser} Paaren, schlechter in ${z.schlechter}, gleich in ${z.gleich} · p = ${fp(z.p)} (zweiseitig, exakt)`,
  ].join('\n');
}

function main() {
  const a = process.argv.slice(2), opt = {A: [], B: []};
  for (let i = 0; i < a.length; i++) if (a[i] === '--A' || a[i] === '--B') opt[a[i].slice(2)] = a[++i].split(',');
  if (!opt.A.length || !opt.B.length) { console.error('Aufruf: node auswertung/messung-zusatz.js --A a.jsonl[,...] --B b.jsonl[,...]'); process.exit(1); }
  console.log(text(zusatz(lies(opt.A), lies(opt.B))));
}

if (require.main === module) main();
module.exports = {vorzeichenP, zusatz, text};
