/* Auswertung eines Rohdumps (ab-harness.js --roh) für die Einflusskarte,
   nach docs/einflusskarte.md.

   Mechanismus: In welcher Zone der Einflusskarte liegen die Züge eines
   Arms — in der des Gegners, in der eigenen, oder in keiner? Jede Stellung
   wird aus dem Dump nachgespielt, die Karte mit primeInfluenceCache aus
   index.html auf der Stellung VOR dem Zug berechnet — dieselbe Karte, die
   die Engine in diesem Moment sah.

   Stärke: Siegrate von B, zweiseitig gegen 50 % (Normalapproximation).

   Aufruf:
     node auswertung/einfluss.js <dump.jsonl> [--namen A,B] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});

function zonen(p) {
  const b = new Uint8Array(E.BOARD_SIZE);
  const leer = () => ({gegner: 0, eigen: 0, neutral: 0});
  const z = {S: leer(), W: leer()};
  for (const e of p.ereignisse) {
    if (e.idx < 0) continue;
    const f = e.farbe === 'S' ? 1 : 2;
    E.primeInfluenceCache(b);
    const zo = E.influenceZone(e.idx, f);
    z[e.farbe][zo < 0 ? 'gegner' : zo > 0 ? 'eigen' : 'neutral']++;
    b[e.idx] = f; E.removeDeadGroups(b, f === 1 ? 2 : 1, e.idx);
  }
  return z;
}

function zweiseitig(z) {
  z = Math.abs(z);
  const a1 = .254829592, a2 = -.284496736, a3 = 1.421413741, a4 = -1.453152027,
        a5 = 1.061405429, pp = .3275911;
  const tt = 1 / (1 + pp * z / Math.SQRT2);
  return (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-z * z / 2);
}
function tTest(d) {
  const n = d.length, m = d.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n), t = se ? m / se : 0;
  return {n, m, t, p: zweiseitig(t)};
}
const pS = p => p < 0.0001 ? '< 0,0001' : p.toFixed(4);

function auswerten(datei, {namen = ['A', 'B']} = {}) {
  const P = fs.readFileSync(datei, 'utf8').trim().split('\n').map(z => JSON.parse(z));
  const [nA, nB] = namen;
  const L = [], log = s => L.push(s);
  log(`${datei}`);
  log(`${nA} gegen ${nB}   ${P.length} Partien`);
  log(`params_hash einheitlich: ${new Set(P.map(p => p.params_hash)).size === 1 ? 'ja' : 'NEIN'}`
    + `   verschiedene Endstellungen: ${new Set(P.map(p => p.final_board_hash)).size}`);

  const anteil = {A: [], B: []}, eig = {A: [], B: []}, summe = {A: {gegner: 0, eigen: 0, neutral: 0},
                                                               B: {gegner: 0, eigen: 0, neutral: 0}};
  let siegeB = 0, aufgabe = {A: 0, B: 0}, laenge = 0;
  for (const p of P) {
    const z = zonen(p);
    const farbeVon = {[p.armSchwarz]: 'S', [p.armWeiss]: 'W'};
    for (const arm of ['A', 'B']) {
      const x = z[farbeVon[arm]], n = x.gegner + x.eigen + x.neutral;
      anteil[arm].push(n ? x.gegner / n : 0);
      eig[arm].push(n ? x.eigen / n : 0);
      for (const k of ['gegner', 'eigen', 'neutral']) summe[arm][k] += x[k];
    }
    const siegerArm = p.sieger === 'S' ? p.armSchwarz : p.armWeiss;
    if (siegerArm === 'B') siegeB++;
    if (p.aufgabe) aufgabe[p.aufgabe === 'S' ? p.armSchwarz : p.armWeiss]++;
    laenge += p.zuege;
  }
  const proz = x => (100 * x).toFixed(1) + ' %';
  log('\nZüge nach Zone (gepoolt)');
  for (const arm of ['A', 'B']) {
    const s = summe[arm], n = s.gegner + s.eigen + s.neutral;
    log(`  ${(arm === 'A' ? nA : nB).padEnd(12)} Gegnerzone ${proz(s.gegner / n)}   eigene Zone ${proz(s.eigen / n)}`
      + `   neutral ${proz(s.neutral / n)}   (${n} Züge)`);
  }
  const dg = tTest(anteil.B.map((x, i) => x - anteil.A[i]));
  const de = tTest(eig.B.map((x, i) => x - eig.A[i]));
  log(`  Gegnerzone, gepaart je Partie:  Differenz ${(100 * dg.m).toFixed(2)} pp   t = ${dg.t.toFixed(2)}   p = ${pS(dg.p)}`);
  log(`  eigene Zone, gepaart je Partie: Differenz ${(100 * de.m).toFixed(2)} pp   t = ${de.t.toFixed(2)}   p = ${pS(de.p)}`);

  const n = P.length, rate = siegeB / n, z = (rate - 0.5) / Math.sqrt(0.25 / n);
  log('\nStärke');
  log(`  Siegrate ${nB}: ${siegeB} von ${n} = ${proz(rate)}   (±${(196 * Math.sqrt(0.25 / n)).toFixed(1)} pp)`
    + `   z = ${z.toFixed(2)}   p = ${pS(zweiseitig(z))}`);
  log(`  Aufgaben: ${nA} ${aufgabe.A}   ${nB} ${aufgabe.B}   |   Partielänge Ø ${(laenge / n).toFixed(0)} Züge`);
  return {text: L.join('\n'), siegeB, n, p: zweiseitig(z), dGegner: dg.m};
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (!a[0]) { console.error('Aufruf: node auswertung/einfluss.js <dump.jsonl> [--namen A,B]'); process.exit(2); }
  const opt = {};
  for (let i = 1; i < a.length; i++) if (a[i] === '--namen') opt.namen = a[++i].split(',');
  console.log(auswerten(a[0], opt).text);
}

module.exports = {auswerten, zonen};
