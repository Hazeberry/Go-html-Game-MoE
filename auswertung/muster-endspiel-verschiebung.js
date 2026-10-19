// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster: Trifft die Tabelle GNU Gos Zug auch auf den Stellungen,
   in die sie selbst führt? Gehört zu docs/muster-endspiel-spiel.md §8.

   Nimmt eine feste Tabelle (muster-endspiel-tabelle.js --aus) und mehrere
   Mengen von Stellungen (Zwischenspeicher von muster-endspiel-daten.js, je
   Menge Partien einer KI-Variante) und gibt für jede Menge aus, an welcher
   Stelle der Wurzelliste (Wert ohne Muster + Dosis × Muster) GNU Gos Zug
   steht, mit der Tabelle im Spiel („heute“) und mit der neuen. Dazu, wie
   oft der in der Partie gespielte Zug GNU Gos Zug ist.

   Aufruf:
     node auswertung/muster-endspiel-verschiebung.js --tabelle zw/tabelle.json [--dosis 200]
          --menge NAME=PRÄFIX:dump1.jsonl,dump2.jsonl [--menge ...]
   --menge  NAME der Menge, PRÄFIX des Zwischenspeichers, dahinter die Rohdumps von
            gnugo-duell.js, aus denen die Stellungen stammen (für die gespielten Züge) */
'use strict';
const fs = require('fs');
const ME = require('./muster-endspiel.js');

const a = process.argv.slice(2), opt = {tabelle: null, dosis: 200, mengen: []};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--tabelle') opt.tabelle = a[++i];
  else if (a[i] === '--dosis') opt.dosis = +a[++i];
  else if (a[i] === '--menge') { const m = /^([^=]+)=([^:]+):(.+)$/.exec(a[++i]); if (!m) throw new Error('--menge NAME=PRÄFIX:dump,...'); opt.mengen.push({name: m[1], praefix: m[2], dumps: m[3].split(',')}); }
}
if (!opt.tabelle || !opt.mengen.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + SPALTEN.indexOf(s[0]); };
const T = JSON.parse(fs.readFileSync(opt.tabelle, 'utf8')).tabelle;
const sp = ME.gruppenSpalten('mlzduk'.split(''));
const PHASEN = [['alle', () => true], ['Zug 81–160', k => k <= 160], ['Zug 161–200', k => k > 160 && k <= 200], ['ab Zug 201', k => k > 200]];

console.log(`Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + ${opt.dosis} × Muster), in %, Stellungen mit der KI am Zug`);
console.log('Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go');
for (const m of opt.mengen) {
  const D = ME.lade([m.praefix]);
  const tab = new Float64Array(D.namen.length); D.namen.forEach((n, i) => { tab[i] = T[n] || 0; });
  const gespielt = new Map();
  for (const d of m.dumps) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) { const r = JSON.parse(z); gespielt.set(`${r.seed}#${r.nr}`, r.zuege); }
  const kh = new Float64Array(2000), kn = new Float64Array(2000);
  const S = PHASEN.map(() => ({n: 0, h1: 0, h16: 0, n1: 0, n16: 0, ue: 0, nUe: 0}));
  for (const p of D.pos) {
    if (p.c !== 1 || p.ziel < 0) continue;
    for (let j = 0; j < p.n; j++) {
      const o = (p.off + j) * D.K; let s = 0; for (const g of sp) s += tab[D.f[o + g]];
      kh[j] = D.e[p.off + j] + opt.dosis * D.w0[p.off + j];
      kn[j] = D.e[p.off + j] + opt.dosis * s;
    }
    const rh = ME.rangWahrscheinlichkeit(kh, p.n, p.ziel), rn = ME.rangWahrscheinlichkeit(kn, p.n, p.ziel);
    const z = gespielt.get(p.seedNr), ue = z && z[p.k] ? (vonGtp(z[p.k]) === D.idx[p.off + p.ziel] ? 1 : 0) : null;
    PHASEN.forEach(([, f], i) => {
      if (!f(p.k)) return;
      const x = S[i]; x.n++; x.h1 += rh.p1; x.h16 += rh.p16; x.n1 += rn.p1; x.n16 += rn.p16;
      if (ue !== null) { x.ue += ue; x.nUe++; }
    });
  }
  PHASEN.forEach(([name], i) => {
    const x = S[i]; if (!x.n) return;
    const p = v => (100 * v / x.n).toFixed(1).padStart(6);
    console.log(`${m.name.padEnd(13)} ${name.padEnd(14)} ${String(x.n).padStart(8)}   ${p(x.h1)}        ${p(x.n1)}       ${p(x.h16)}     ${p(x.n16)}       ${x.nUe ? (100 * x.ue / x.nUe).toFixed(1) : '–'}`);
  });
}
