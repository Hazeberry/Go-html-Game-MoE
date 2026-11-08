// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil D: Unabhängige Benson-Prüfung (Benson 1976, Lehrbuchform, eigene Implementierung) gegen bensonClassify der App
   an den Anfangsstellungen der Stufe C. Dazu: Schnitt aus GNU Gos Tot-Liste und unabhängig Benson-lebenden Steinen.
   Aufruf: node benson-unabhaengig.js --html index.html --daten <entpacktes-Artefakt> --aus benson.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['html', 'daten', 'aus']);
const E = G.ladeKI({htmlPfad: o.html, mitNetz: false});
const N = G.N, NB = E.NEIGHBORS;
function bensonLebend(board, c) {
  const kette = new Int32Array(N).fill(-1), ketten = [];
  for (let i = 0; i < N; i++) {
    if (board[i] !== c || kette[i] >= 0) continue;
    const g = [i]; kette[i] = ketten.length;
    for (let k = 0; k < g.length; k++) for (const n of NB[g[k]]) if (board[n] === c && kette[n] < 0) { kette[n] = ketten.length; g.push(n); }
    ketten.push(g);
  }
  /* Regionen: zusammenhängende Punkte, die nicht Farbe c sind (leer oder Gegnerstein) */
  const reg = new Int32Array(N).fill(-1), regionen = [];
  for (let i = 0; i < N; i++) {
    if (board[i] === c || reg[i] >= 0) continue;
    const q = [i]; reg[i] = regionen.length;
    for (let k = 0; k < q.length; k++) for (const n of NB[q[k]]) if (board[n] !== c && reg[n] < 0) { reg[n] = regionen.length; q.push(n); }
    const rand = new Set();
    for (const p of q) for (const n of NB[p]) if (board[n] === c) rand.add(kette[n]);
    regionen.push({leer: q.filter(p => !board[p]), rand});
  }
  const frei = ketten.map(g => { const s = new Set(); for (const p of g) for (const n of NB[p]) if (!board[n]) s.add(n); return s; });
  const X = new Set(ketten.map((_, i) => i)), R = new Set(regionen.map((_, i) => i));
  for (let aenderung = true; aenderung;) {
    aenderung = false;
    for (const x of [...X]) {
      let vital = 0;
      for (const r of R) { const g = regionen[r]; if (g.rand.has(x) && g.leer.length > 0 && g.leer.every(p => frei[x].has(p))) vital++; }
      if (vital < 2) { X.delete(x); aenderung = true; }
    }
    for (const r of [...R]) for (const x of regionen[r].rand) if (!X.has(x)) { R.delete(r); aenderung = true; break; }
  }
  const lebend = new Uint8Array(N);
  for (const x of X) for (const p of ketten[x]) lebend[p] = 1;
  return lebend;
}
const zeilen = G.ladeZeilen(o.daten);
let gleich = 0; const ungleich = [], schnitt = [];
for (const r of zeilen) {
  const board = G.brettAus(r.diagnose.anfang.brett);
  const ep = E.bensonClassify(board);
  const app = new Uint8Array(N);
  for (let i = 0; i < N; i++) app[i] = board[i] && E._bnAlive[i] === ep ? 1 : 0;
  const unab = new Uint8Array(N);
  for (const c of [1, 2]) { const l = bensonLebend(board, c); for (let i = 0; i < N; i++) if (l[i]) unab[i] = 1; }
  let d = 0; for (let i = 0; i < N; i++) if (app[i] !== unab[i]) d++;
  if (d === 0) gleich++; else ungleich.push({s: r.schluessel, punkte: d});
  const gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  const sn = [...gnu].filter(p => unab[p]);
  if (sn.length) schnitt.push({s: r.schluessel, kiFarbe: r.kiFarbe, n: sn.length, koord: sn.map(G.L.zuGtp)});
}
G.fs.writeFileSync(o.aus, JSON.stringify({htmlSha256: G.sha256(G.fs.readFileSync(o.html)), zeilen: zeilen.length, gleich, ungleich, schnitt}, null, 1));
console.log('Stellungen', zeilen.length, '| App-Benson == unabhängiges Benson bei', gleich, '| ungleich', ungleich.length);
console.log('Stellungen, in denen GNU Gos Tot-Liste Steine enthält, die (unabhängig) Benson-lebend sind:', schnitt.length);
