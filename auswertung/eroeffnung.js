// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Wie eröffnet die KI? Linie und Ecken der ersten Züge. Gehört zu
   docs/eroeffnung-linie.md.

   Liest Rohdumps von ab-harness.js (Selbstspiel, beide Seiten) oder von
   gnugo-duell.js (nur die Züge der KI) und zählt je Abschnitt (Züge 1–20,
   21–40, 41–60), auf welcher Linie gespielt wurde (1 = Rand) und wie viele
   Züge im Eckbereich lagen (beide Abstände zum Rand höchstens 5). Dazu der
   Zug, nach dem in allen vier Eckbereichen ein Stein steht (Median).

   Mit --arm A oder B zählen bei ab-harness-Dumps nur die Züge dieses Arms.
   Mit --gnugo-selbst N spielt GNU Go N Eröffnungen zu 60 Zügen gegen sich
   selbst (Stufe --stufe, Seed 1000 + Partie) als Vergleich.

   Aufruf:
     node auswertung/eroeffnung.js <dump.jsonl> [...] [--arm A|B]
     node auswertung/eroeffnung.js --gnugo-selbst 10 [--stufe 5] [--gnugo pfad] */
'use strict';
const fs = require('fs');
const {gtp} = require('./endspiel-verlauf.js');

const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const linie = i => { const x = i % 19, y = Math.floor(i / 19); return Math.min(x, y, 18 - x, 18 - y) + 1; };
const eckeNr = i => { const x = i % 19, y = Math.floor(i / 19);
  const ex = x <= 5 ? 0 : x >= 13 ? 1 : -1, ey = y <= 5 ? 0 : y >= 13 ? 2 : -1;
  return ex < 0 || ey < 0 ? -1 : ex + ey; };

/* partien: Liste von {zuege: [idx|-1], zaehlt: k => bool} (zaehlt: Zug k
   gehört zur betrachteten Seite) */
function bericht(name, partien) {
  for (const [von, bis] of [[1, 20], [21, 40], [41, 60]]) {
    const z = partien.flatMap(p => p.zuege.slice(von - 1, bis).filter((i, k) => i >= 0 && p.zaehlt(von - 1 + k)));
    if (!z.length) continue;
    const anteil = f => `${(100 * z.filter(f).length / z.length).toFixed(0)} %`;
    console.log(`${name}, Züge ${von}–${bis} (${z.length}): Linie 1 ${anteil(i => linie(i) === 1)}, 2 ${anteil(i => linie(i) === 2)},`
      + ` 3 ${anteil(i => linie(i) === 3)}, 4 ${anteil(i => linie(i) === 4)}, 5+ ${anteil(i => linie(i) >= 5)}; Eckbereich ${anteil(i => eckeNr(i) >= 0)}`);
  }
  const voll = partien.map(p => {
    const s = new Set();
    for (let k = 0; k < p.zuege.length; k++) { const e = p.zuege[k] >= 0 ? eckeNr(p.zuege[k]) : -1; if (e >= 0) s.add(e); if (s.size === 4) return k + 1; }
    return Infinity;
  }).sort((a, b) => a - b);
  console.log(`${name}: alle vier Eckbereiche besetzt (von beiden Seiten) nach Zug ${voll[voll.length >> 1]} (Median, ${partien.length} Partien)`);
}

function lies(dateien, arm = null) {
  const partien = [];
  for (const d of dateien) for (const zeile of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) {
    const r = JSON.parse(zeile);
    if (r.typ === 'partie' && r.ereignisse) {
      const farbe = arm === null ? null : r.armSchwarz === arm ? 'S' : 'W';
      partien.push({zuege: r.ereignisse.map(e => e.idx ?? -1),
                    zaehlt: k => farbe === null || (r.ereignisse[k] && r.ereignisse[k].farbe === farbe)});
    }
    else if (r.zuege && r.wirFarbe && !r.abgebrochen) {
      /* gnugo-duell: Vorgabesteine zählen nicht als Züge; nur die KI */
      const zuerst = r.beginnt === 'S' ? 1 : 2, wir = r.wirFarbe === 'S' ? 1 : 2;
      partien.push({zuege: r.zuege.map(vonGtp), zaehlt: k => (k % 2 === 0 ? zuerst : 3 - zuerst) === wir});
    }
  }
  return partien;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  let selbst = 0, stufe = 5, gnugo = '/usr/games/gnugo', arm = null;
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--gnugo-selbst') selbst = +a[++k];
    else if (a[k] === '--stufe') stufe = +a[++k];
    else if (a[k] === '--gnugo') gnugo = a[++k];
    else if (a[k] === '--arm') arm = a[++k];
    else dateien.push(a[k]);
  }
  if (dateien.length) bericht((dateien.length > 1 ? `${dateien.length} Dateien` : dateien[0].split('/').pop()) + (arm ? `, Arm ${arm}` : ''), lies(dateien, arm));
  if (selbst) (async () => {
    const partien = [];
    for (let n = 0; n < selbst; n++) {
      const g = gtp(gnugo, stufe, 7.5);
      await g.frage('boardsize 19'); await g.frage('clear_board'); await g.frage('set_random_seed ' + (1000 + n));
      const z = [];
      for (let k = 0; k < 60; k++) z.push(vonGtp(await g.frage('genmove ' + (k % 2 ? 'W' : 'B'))));
      g.ende();
      partien.push({zuege: z, zaehlt: () => true});
    }
    bericht(`GNU Go Stufe ${stufe} gegen sich selbst`, partien);
  })();
}

module.exports = {bericht, lies};
