// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Findet mehr Suche GNU Gos besten Zug? Gehört zu
   docs/punktverlust-muster.md.

   Liest die Ausgabe von zugwert.js, stellt Stellungen vor Zügen der KI nach
   und lässt getAIMove mit verschiedenen festen Simulationszahlen ziehen
   (Zufall geseedet, ohne Baumwiederverwendung). Gezählt wird, wie oft der
   Zug GNU Gos bestem Zug entspricht und wie oft er unter GNU Gos zehn
   besten steht (dafür fragt das Werkzeug nicht erneut GNU Go: Es vergleicht
   nur mit dem besten Zug und dem in der Partie gespielten Zug und dessen
   Wert aus zugwert.js).

   Aufruf:
     node auswertung/zugwert-suche.js zugwert.jsonl --partien a.jsonl,... [--sims 120,480,1000] [--jede 4] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const a = process.argv.slice(2), dateien = [];
const opt = {partien: [], jede: 4, sims: [120, 480, 1000]};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--partien') opt.partien = a[++i].split(',');
  else if (a[i] === '--jede') opt.jede = +a[++i];
  else if (a[i] === '--sims') opt.sims = a[++i].split(',').map(Number);
  else dateien.push(a[i]);
}
const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE, L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const partien = new Map();
for (const d of opt.partien) for (const z of fs.readFileSync(d, 'utf8').split('\n')) if (z.trim()) { const p = JSON.parse(z); partien.set(p.nr, p); }

function zug(b, f, mc, last, sims, seed) {
  const alt = {...E.PARAMS};
  Object.assign(E.PARAMS, {mctsFixedSims: sims, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0});
  let s = seed; const zr = Math.random;
  Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  try {
    const r = E.getAIMove(new Uint8Array(b), f, [], {1: 0, 2: 0}, mc, 'hard', 1, null, last);
    return r.type === 'stone' ? r.y * 19 + r.x : -1;
  } finally { Math.random = zr; Object.assign(E.PARAMS, alt); }
}

const st = Object.fromEntries(opt.sims.map(s => [s, {best: 0, wieGespielt: 0}]));
let n = 0, zaehler = 0;
const t0 = Date.now();
for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').split('\n')) {
  if (!z.trim()) continue;
  const r = JSON.parse(z), p = partien.get(r.nr);
  if (!p) continue;
  const b = new Uint8Array(N);
  for (const v of p.vorgabeSteine || []) b[vonGtp(v)] = 1;
  const zuerst = p.beginnt === 'S' ? 1 : 2, wir = p.wirFarbe === 'S' ? 1 : 2;
  const kiZuege = new Map(r.zuege.filter(x => x[1] === 'K').map(x => [x[0], x]));
  let last = null;
  for (let k = 0; k < p.zuege.length; k++) {
    const x = kiZuege.get(k + 1);
    if (x && x[5] !== 'PASS' && zaehler++ % opt.jede === 0) {
      n++;
      for (const sims of opt.sims) {
        const m = zug(b, wir, k, last, sims, 7 + k);
        if (m === vonGtp(x[5])) st[sims].best++;
        if (m === vonGtp(x[2])) st[sims].wieGespielt++;
      }
      if (n % 50 === 0) process.stderr.write(`${n} Stellungen, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
    }
    const i = vonGtp(p.zuege[k]); if (i < 0) { last = null; continue; }
    const f = k % 2 === 0 ? zuerst : 3 - zuerst;
    b[i] = f; E.removeDeadGroups(b, 3 - f, i); last = i;
  }
}
console.log(`${n} Stellungen (ab Zug 81, Züge der KI)`);
for (const s of opt.sims) console.log(`  ${String(s).padStart(5)} Simulationen: GNU Gos bester Zug ${(100 * st[s].best / n).toFixed(1)} %, derselbe Zug wie in der Partie (120 Sims, mit Baum) ${(100 * st[s].wieGespielt / n).toFixed(1)} %`);
