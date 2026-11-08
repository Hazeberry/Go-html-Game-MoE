// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil B: Vergleicht den Bericht eines browser.cjs-Laufs gegen die eigene index.html mit dem der Wiederholung
   (docs/daten/bughunt-wiederholung/lauf1/browser/bericht.json). Gleich heißt: gleiche Felder außer Zeitstempel.
   Aufruf: node browser-vergleich.js --eigen bericht.json --lauf1 bericht.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['eigen', 'lauf1']);
const a = JSON.parse(G.fs.readFileSync(o.eigen, 'utf8')), b = JSON.parse(G.fs.readFileSync(o.lauf1, 'utf8'));
console.log(`eigene index.html SHA-256 ${a.quelle.sha256} | Browser ${a.browser} | Startfehler ${a.startfehler || '-'}`);
console.log(`Lauf 1             SHA-256 ${b.quelle.sha256} | Browser ${b.browser}`);
const fl = (x, p = '') => Object.entries(x).flatMap(([k, v]) => (v && typeof v === 'object' ? fl(v, p + k + '.') : [[p + k, v]]));
for (const t of a.tests) {
  const u = b.tests.find(x => x.id === t.id);
  const A = Object.fromEntries(fl(t)), B = u ? Object.fromEntries(fl(u)) : {};
  const diff = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
  console.log(`${t.id}: ${t.status} (Lauf 1: ${u && u.status}); Seitenfehler: ${JSON.stringify(t.pageErrors || t.seitenfehler || [])}; abweichende Felder: ${diff.length ? diff.join(', ') : 'keine'}`);
}
