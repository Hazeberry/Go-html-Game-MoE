// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Lehrdaten für Muster: GNU Gos Zug in Stellungen aus echten Partien.
   Gehört zu docs/muster.md.

   Spielt jede Partie eines Rohdumps von gnugo-duell.js in GNU Go nach und
   fragt an jeder zweiten Stellung zwischen Zug --ab und --bis nach GNU Gos
   Zug für die Seite am Zug (reg_genmove auf --stufe, Standard 10). Damit
   beide Farben vorkommen, beginnt die Zählung je nach Partienummer bei
   --ab oder --ab + 1.

   Ausgabe je Partie: seed, nr, beginnt, vorgabeSteine, zuege (die Partie)
   und ziele: [{k, gnugo}], k = Zahl der gespielten Züge vor der Stellung,
   gnugo = GNU Gos Zug (GTP-Koordinate oder PASS).

   Aufruf:
     node auswertung/muster-daten.js <dump.jsonl> [...] [--ab 10] [--bis 250]
          [--stufe 10] --aus daten.jsonl [--gnugo pfad] */
'use strict';
const fs = require('fs');
const {gtp} = require('./endspiel-verlauf.js');

async function analysiere(p, opt) {
  const g = gtp(opt.gnugo, opt.stufe, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W', andere = f => f === 'B' ? 'W' : 'B';
    const ziele = [];
    for (let k = 0; k < Math.min(p.zuege.length, opt.bis); k++) {
      if (k >= opt.ab && (k - opt.ab - p.nr) % 2 === 0) {
        const f = k % 2 === 0 ? zuerst : andere(zuerst);
        let z = (await g.frage('reg_genmove ' + f)).toUpperCase();
        if (z === 'RESIGN') z = 'PASS';
        ziele.push({k, gnugo: z});
      }
      await g.frage(`play ${k % 2 === 0 ? zuerst : andere(zuerst)} ${p.zuege[k]}`);
    }
    return {seed: p.seed, nr: p.nr, beginnt: p.beginnt, vorgabeSteine: p.vorgabeSteine || [], zuege: p.zuege, ziele};
  } finally { g.ende(); }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {ab: 10, bis: 250, stufe: 10, aus: null, gnugo: '/usr/games/gnugo'};
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ab') opt.ab = +a[++k];
    else if (a[k] === '--bis') opt.bis = +a[++k];
    else if (a[k] === '--stufe') opt.stufe = +a[++k];
    else if (a[k] === '--aus') opt.aus = a[++k];
    else if (a[k] === '--gnugo') opt.gnugo = a[++k];
    else dateien.push(a[k]);
  }
  if (!opt.aus) { console.error('--aus fehlt'); process.exit(1); }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  (async () => {
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege) continue;
      const t0 = Date.now();
      const r = await analysiere(p, opt);
      fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
      console.error(`Partie ${p.nr} (Seed ${p.seed}): ${r.ziele.length} Stellungen · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere};
