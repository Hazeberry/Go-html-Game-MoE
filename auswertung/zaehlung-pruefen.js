// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Auszählung der App gegen GNU Go (docs/zaehlung.md).

   Für jede ausgespielte Partie aus gnugo-duell.js wird die Schlussstellung
   nachgestellt und nach Fläche gezählt (chinesisch, wie die App), einmal
   mit der alten Regel für tote Steine (je Kette, wie resolveLifeAndDeath
   bis zum 12.10.) und einmal mit toteSteineAmEnde. Verglichen wird mit
   GNU Gos final_score (endstand, aus Sicht der KI; GNU Go rechnet je
   Vorgabestein einen Punkt Ausgleich für Weiß, das wird hier ebenso
   gezählt).

   Aufruf:
     node auswertung/zaehlung-pruefen.js partien.jsonl [...] [--gross 4] [--zeige 5]
       --gross   AUGE_GROSS für toteSteineAmEnde
       --offen   OFFEN_GROSS für toteSteineAmEnde
       --zeige   die N größten Abweichungen der neuen Regel ausgeben */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const a = process.argv.slice(2), dateien = [];
const opt = {gross: undefined, offen: undefined, zeige: 0};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--gross') opt.gross = +a[++i];
  else if (a[i] === '--offen') opt.offen = +a[++i];
  else if (a[i] === '--zeige') opt.zeige = +a[++i];
  else dateien.push(a[i]);
}
const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE, L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };

/* Die alte Regel aus resolveLifeAndDeath, je Kette */
function toteAlt(board) {
  const tot = new Uint8Array(N), ep = E.bensonClassify(board), ges = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const c = board[i];
    if (!c || ges[i]) continue;
    const {group, liberties} = E.floodFill(board, i);
    for (const g of group) ges[g] = 1;
    if (E._bnAlive[i] === ep) continue;
    if (E._bnDead[i] === ep) { for (const g of group) tot[g] = 1; continue; }
    if (liberties.length >= 5) continue;
    const eyes = E.findEyes(board, group, c);
    if (eyes.length >= 2) continue;
    if (eyes.length === 1 && liberties.length >= 3) continue;
    if (liberties.length <= (eyes.length === 0 ? 3 : 2)) for (const g of group) tot[g] = 1;
  }
  return tot;
}
function flaeche(board, tot) {
  const b = new Uint8Array(N); for (let i = 0; i < N; i++) b[i] = tot[i] ? 0 : board[i];
  const f = {1: 0, 2: 0}, v = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (b[i]) f[b[i]]++;
  for (let i = 0; i < N; i++) {
    if (b[i] || v[i]) continue;
    const q = [i]; v[i] = 1; let r = 0;
    for (let k = 0; k < q.length; k++) for (const n of E.NEIGHBORS[q[k]]) {
      if (!b[n]) { if (!v[n]) { v[n] = 1; q.push(n); } } else r |= b[n];
    }
    if (r === 1 || r === 2) f[r] += q.length;
  }
  return f;
}

const erg = {alt: [], neu: []}, abw = [];
let n = 0, sieg = {alt: 0, neu: 0};
for (const datei of dateien) for (const z of fs.readFileSync(datei, 'utf8').split('\n')) {
  if (!z.trim()) continue;
  const p = JSON.parse(z);
  if (p.abgebrochen || !p.zuege || p.endstand === undefined) continue;
  /* nur Partien, die mit zwei Pässen endeten */
  const k = p.zuege.length;
  if (k < 2 || p.zuege[k - 1] !== 'pass' || p.zuege[k - 2] !== 'pass') continue;
  const b = new Uint8Array(N);
  for (const v of p.vorgabeSteine || []) b[vonGtp(v)] = 1;
  const zuerst = p.beginnt === 'S' ? 1 : 2;
  for (let j = 0; j < k; j++) {
    const i = vonGtp(p.zuege[j]); if (i < 0) continue;
    const f = j % 2 === 0 ? zuerst : 3 - zuerst;
    b[i] = f; E.removeDeadGroups(b, 3 - f, i);
  }
  const wir = p.wirFarbe === 'S' ? 1 : 2;
  /* GNU Go zählt nach chinesischen Regeln je Vorgabestein einen Punkt
     Ausgleich für Weiß. */
  const ausgleich = p.vorgabe >= 2 ? p.vorgabe : 0;
  const stand = tot => { const f = flaeche(b, tot); return (wir === 1 ? 1 : -1) * (f[1] - f[2] - p.komi - ausgleich); };
  const sAlt = stand(toteAlt(b)), sNeu = stand(E.toteSteineAmEnde(b, opt.gross, opt.offen));
  erg.alt.push(sAlt - p.endstand); erg.neu.push(sNeu - p.endstand);
  if (Math.sign(sAlt) === Math.sign(p.endstand)) sieg.alt++;
  if (Math.sign(sNeu) === Math.sign(p.endstand)) sieg.neu++;
  abw.push({quelle: path.basename(datei), nr: p.nr, gnugo: p.endstand, alt: sAlt, neu: sNeu});
  n++;
}
const zeile = (name, d) => {
  const abs = d.map(Math.abs).sort((x, y) => x - y);
  const gleich = d.filter(x => x === 0).length, nah = d.filter(x => Math.abs(x) <= 2).length;
  console.log(`${name}: gleich wie GNU Go ${gleich} (${(100 * gleich / n).toFixed(1)} %), höchstens 2 Punkte daneben ${nah} (${(100 * nah / n).toFixed(1)} %),`
    + ` |Abweichung| Ø ${(abs.reduce((s, x) => s + x, 0) / n).toFixed(1)}, Median ${abs[n >> 1]}, max ${abs[n - 1]}, Sieger gleich ${sieg[name]}`);
};
console.log(`Partien mit zwei Pässen am Ende: ${n}`);
zeile('alt', erg.alt); zeile('neu', erg.neu);
if (opt.zeige) {
  abw.sort((x, y) => Math.abs(y.neu - y.gnugo) - Math.abs(x.neu - x.gnugo));
  for (const x of abw.slice(0, opt.zeige)) console.log(`  ${x.quelle} Nr. ${x.nr}: GNU Go ${x.gnugo}, alt ${x.alt}, neu ${x.neu}`);
}
