// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Wo geht das Gebiet der KI verloren? Liest die Karten von
   besitz-verlauf.js (--karten) und ordnet jeden Punkt, der zwischen zwei
   Marken vom Gebiet der KI (G) zu GNU Go (s, g, T) oder neutral (.)
   wechselt, nach drei Merkmalen:
     Linie   Abstand zum Brettrand, 1 = Randlinie
     Tiefe   Abstand bei der ersten Marke zum nächsten Punkt, der nicht der
             KI gehörte (nicht S, G, t): 1 = direkt an der alten Grenze,
             3 und mehr = tief im eigenen Gebiet
     wohin   GNU-Go-Stein, GNU-Go-Gebiet, toter KI-Stein, neutral
   Ein Punkt zu GNU Go zählt 2, zu neutral 1. Mit --seite gg dasselbe für
   das Gebiet von GNU Go (g), zum Vergleich. Gehört zu
   docs/punktverlust-muster.md.

   Aufruf:
     node auswertung/gebiet-verlust.js besitz.jsonl [...] --von 40 --bis ende [--seite gg] */
'use strict';
const fs = require('fs');

const a = process.argv.slice(2), dateien = [];
let von = null, bis = null, seite = 'ki';
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--von') von = a[++i];
  else if (a[i] === '--bis') bis = a[++i];
  else if (a[i] === '--seite') seite = a[++i];
  else dateien.push(a[i]);
}
const rs = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)))
  .filter(r => r.karten && r.karten[von] && r.karten[bis]);
const n = rs.length;
/* Karte: 361 Zeichen, Zeile 19 zuerst; Index k → x = k % 19, y = k / 19 */
const linie = k => { const x = k % 19, y = Math.floor(k / 19); return Math.min(x, y, 18 - x, 18 - y) + 1; };
const nb = k => { const x = k % 19, y = Math.floor(k / 19), r = [];
  if (x > 0) r.push(k - 1); if (x < 18) r.push(k + 1); if (y > 0) r.push(k - 19); if (y < 18) r.push(k + 19); return r; };

/* Codes aus Sicht der untersuchten Seite: eigener Stein, eigenes Gebiet, toter Stein des Gegners */
const [ST, GE, TO] = seite === 'gg' ? ['s', 'g', 'T'] : ['S', 'G', 't'];
const nachLinie = {}, nachZiel = {}, nachTiefe = {};
let summe = 0;
for (const r of rs) {
  const A = r.karten[von], B = r.karten[bis];
  /* Tiefe: Abstand zum nächsten Punkt, der bei von nicht der KI gehörte */
  const tiefe = new Int32Array(361).fill(-1), q = [];
  for (let k = 0; k < 361; k++) if (A[k] !== ST && A[k] !== GE && A[k] !== TO) { tiefe[k] = 0; q.push(k); }
  for (let i = 0; i < q.length; i++) for (const m of nb(q[i])) if (tiefe[m] < 0) { tiefe[m] = tiefe[q[i]] + 1; q.push(m); }
  for (let k = 0; k < 361; k++) {
    if (A[k] !== GE || B[k] === GE || B[k] === ST || B[k] === TO) continue;
    const wert = B[k] === '.' ? 1 : 2;
    const l = Math.min(linie(k), 6), t = tiefe[k] < 0 ? 9 : Math.min(tiefe[k], 5);
    nachLinie[l] = (nachLinie[l] || 0) + wert;
    nachTiefe[t] = (nachTiefe[t] || 0) + wert;
    nachZiel[B[k]] = (nachZiel[B[k]] || 0) + wert;
    summe += wert;
  }
}
const je = x => (x / n).toFixed(1);
console.log(`${n} Partien, Gebiet ${seite === 'gg' ? 'von GNU Go' : 'der KI'} verloren zwischen ${von} und ${bis}: ${je(summe)} Punkte je Partie`);
console.log('nach Linie (1 = Randlinie, 6 = sechste und weiter innen):');
for (const l of Object.keys(nachLinie).sort()) console.log(`  Linie ${l}: ${je(nachLinie[l]).padStart(6)}  (${(100 * nachLinie[l] / summe).toFixed(0)} %)`);
const NAME = {s: 'GNU-Go-Stein', g: 'GNU-Go-Gebiet', T: 'toter KI-Stein', '.': 'neutral', S: 'KI-Stein', G: 'KI-Gebiet', t: 'toter GNU-Go-Stein'};
console.log('wohin:');
for (const [z, v] of Object.entries(nachZiel).sort((x, y) => y[1] - x[1])) console.log(`  ${NAME[z].padEnd(16)} ${je(v).padStart(6)}`);
console.log('nach Tiefe im eigenen Gebiet (1 = an der alten Grenze, 5 = fünf und tiefer):');
for (const t of Object.keys(nachTiefe).sort()) console.log(`  Tiefe ${t}: ${je(nachTiefe[t]).padStart(6)}  (${(100 * nachTiefe[t] / summe).toFixed(0)} %)`);
