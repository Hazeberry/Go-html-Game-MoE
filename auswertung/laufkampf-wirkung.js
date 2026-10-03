/* Wirksamkeit des Raumrisikos (raumGewicht/raumZug), nach
   docs/laufkampf.md §7.4. Je Arm:

     1. Große Verluste: Anteil der Partien, in denen der Arm eine Kette von
        mindestens 10 Steinen verliert — ein Zug des Gegners schlägt
        mindestens 10 Steine, oder bei Partieende ist eine eigene Kette ab 10
        Steinen Benson-tot.
     2. Ausbruch: an jeder Stellung, an der der ziehende Arm eine eigene
        Kette ab 6 Steinen mit 4–7 Freiheiten und K3 ≤ 4 hat, der Anteil der
        Züge, die eine Freiheit einer solchen Kette besetzen.

   K3 wie auswertung/einschliessung.js (Felder der eigenen Bouzy-Zone, über
   eigene Zonenfelder mit der Kette zusammenhängend, ohne sie).

   Aufruf:
     node auswertung/laufkampf-wirkung.js <dump.jsonl> [weitere.jsonl ...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;

function k3(b, group, farbe) {
  const inG = new Uint8Array(N); for (const g of group) inG[g] = 1;
  const ges = new Uint8Array(N), q = [];
  for (const g of group) for (const n of E.NEIGHBORS[g])
    if (!inG[n] && !ges[n] && E.influenceZone(n, farbe) > 0) { ges[n] = 1; q.push(n); }
  for (let k = 0; k < q.length; k++) for (const n of E.NEIGHBORS[q[k]])
    if (!inG[n] && !ges[n] && E.influenceZone(n, farbe) > 0) { ges[n] = 1; q.push(n); }
  return q.length;
}

/* Freiheiten der eigenen gefährdeten Ketten des Ziehenden, oder null. */
function gefaehrdet(b, farbe) {
  const ges = new Uint8Array(N), kandidaten = [];
  for (let i = 0; i < N; i++) {
    if (b[i] !== farbe || ges[i]) continue;
    const {group, liberties} = E.floodFill(b, i);
    for (const g of group) ges[g] = 1;
    if (group.length >= 6 && liberties.length >= 4 && liberties.length <= 7) kandidaten.push({group, liberties});
  }
  if (!kandidaten.length) return null;
  E.primeInfluenceCache(b);
  const frei = new Set();
  for (const k of kandidaten) if (k3(b, k.group, farbe) <= 4) for (const l of k.liberties) frei.add(l);
  return frei.size ? frei : null;
}

function auswerten(partien) {
  const arm = {A: {partien: 0, verlust: 0, stellungen: 0, ausbruch: 0},
               B: {partien: 0, verlust: 0, stellungen: 0, ausbruch: 0}};
  for (const p of partien) {
    const armVon = f => f === 1 ? p.armSchwarz : p.armWeiss;
    const verloren = {1: false, 2: false};
    const b = new Uint8Array(N);
    arm[p.armSchwarz].partien++; arm[p.armWeiss].partien++;
    for (const e of p.ereignisse) {
      const f = e.farbe === 'S' ? 1 : 2;
      if (e.idx >= 0) {
        const frei = gefaehrdet(b, f);
        if (frei) { arm[armVon(f)].stellungen++; if (frei.has(e.idx)) arm[armVon(f)].ausbruch++; }
        b[e.idx] = f;
        const cap = E.removeDeadGroups(b, 3 - f, e.idx);
        if (cap >= 10) verloren[3 - f] = true;
      }
    }
    const ep = E.bensonClassify(b), ges = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!b[i] || ges[i]) continue;
      const {group} = E.floodFill(b, i);
      for (const g of group) ges[g] = 1;
      if (group.length >= 10 && E._bnDead[i] === ep) verloren[b[i]] = true;
    }
    for (const f of [1, 2]) if (verloren[f]) arm[armVon(f)].verlust++;
  }
  return arm;
}

if (require.main === module) {
  const dateien = process.argv.slice(2);
  if (!dateien.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(2); }
  const P = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').map(z => JSON.parse(z)));
  const a = auswerten(P);
  const proz = (x, n) => (100 * x / (n || 1)).toFixed(1) + ' %';
  console.log(`${P.length} Partien`);
  for (const k of ['A', 'B'])
    console.log(`  ${k}: große Verluste in ${a[k].verlust} von ${a[k].partien} Partien (${proz(a[k].verlust, a[k].partien)})`
      + ` · Ausbruch ${a[k].ausbruch} von ${a[k].stellungen} Stellungen (${proz(a[k].ausbruch, a[k].stellungen)})`);
}

module.exports = {auswerten};
