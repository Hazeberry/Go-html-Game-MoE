/* Bringen zwei naheliegende Eingriffe GNU Gos Antwort auf eine Annäherung
   nach vorn? Gehört zu docs/annaeherung.md §10.

   Liest die Ereignisse von annaeherung.js (nur Annäherungen an die KI mit
   lokaler Referenz) und die Rohdumps, stellt die Stellung nach dem
   Annäherungszug nach und bewertet mit evaluateMove (Zufall auf 0):

     gebietFreiheit  der vorhandene Schalter (0 gegen 1)
     Lesestatus      Prototyp, nicht in index.html: gebietZug rechnet die
                     Bouzy-Karte ohne die Ketten, die der taktische Leser
                     für verloren hält. Vor dem Zug ist die KI am Zug (ihre
                     Kette ist verloren, wenn leseVerteidigung nein sagt; eine
                     des Gegners, wenn leseAngriff ja sagt), danach der Gegner
                     (umgekehrt). Ketten neben dem Zug werden nach dem Zug neu
                     gelesen, alle anderen behalten den Status, den sie mit
                     dem Gegner am Zug auf dem Brett vor dem Zug haben.

   Gezählt: Referenz höher bewertet als der Zug, den die KI spielte (über
   alle Ereignisse), und für jede --jede-te Stellung der Rang der Referenz
   unter allen leeren Punkten (ohne die Filter von getAIMove).

   Aufruf:
     node auswertung/annaeherung-gegenprobe.js --ereignisse annaeherung.jsonl [...] --dumps dump.jsonl [...] [--jede 5] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };

/* Verlorene Ketten auf b mit amZug am Zug (Ketten ab 4 Freiheiten nie) */
function verloren(b, amZug, nur) {
  const tot = new Uint8Array(N), ges = new Uint8Array(N);
  const pruefe = s => {
    if (!b[s] || ges[s]) return;
    const ff = E.floodFill(b, s);
    for (const q of ff.group) ges[q] = 1;
    if (ff.liberties.length > 3) return;
    const t = b[s] === amZug ? !E.leseVerteidigung(b, s).ja : E.leseAngriff(b, s).ja;
    if (t) for (const q of ff.group) tot[q] = 1;
  };
  if (nur) for (const s of nur) pruefe(s); else for (let s = 0; s < N; s++) pruefe(s);
  return tot;
}
const bilanzOhne = (b, tot) => { const nb = new Uint8Array(b); for (let i = 0; i < N; i++) if (tot[i]) nb[i] = 0; return E.bouzyBilanz(nb); };

/* Werte je Kandidat: alt (Default), gf (gebietFreiheit 1), lese (Lesestatus) */
function bewerte(b, c, mc, leer, kand) {
  const zufall = Math.random, P = E.PARAMS;
  Math.random = () => 0;
  const prime = () => { E.buildCrisisMap(b, c); E.primeAreaCache(b, c); E.primeEndTieBreak(b); };
  prime();
  const gz = P.gebietZug, sg = c === 1 ? 1 : -1;
  const balVor = bilanzOhne(b, verloren(b, c)), fern = verloren(b, 3 - c);
  const aus = new Map();
  for (const m of kand) {
    if (m < 0 || b[m]) continue;
    const alt = E.evaluateMove(b, m, c, mc, leer);
    P.gebietFreiheit = 1; const gf = E.evaluateMove(b, m, c, mc, leer); P.gebietFreiheit = 0;
    P.gebietZug = 0; const ohne = E.evaluateMove(b, m, c, mc, leer); P.gebietZug = gz;
    const nb = new Uint8Array(b); nb[m] = c; E.removeDeadGroups(nb, 3 - c, m);
    const tot = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (nb[i] && fern[i]) tot[i] = 1;
    const nah = [m, ...E.NEIGHBORS[m]].filter(q => nb[q]), naheKetten = new Set();
    for (const q of nah) for (const x of E.floodFill(nb, q).group) naheKetten.add(x);
    const neu = verloren(nb, 3 - c, nah);
    for (const x of naheKetten) tot[x] = neu[x];
    const lese = ohne + (1 - E.getCrisisWeight(m)) * gz * (bilanzOhne(nb, tot) - balVor) * sg;
    aus.set(m, {alt, gf, lese});
  }
  Math.random = zufall;
  return aus;
}

if (require.main === module) {
  const a = process.argv.slice(2), ereignisse = [], dumps = [];
  let liste = null, jede = 5;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ereignisse') liste = ereignisse;
    else if (a[k] === '--dumps') liste = dumps;
    else if (a[k] === '--jede') jede = +a[++k];
    else if (liste) liste.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  const proPartie = new Map();
  for (const e of ereignisse.flatMap(lies)) {
    if (e.seite !== 'ki' || e.abstandReferenz > 2) continue;
    if (!proPartie.has(e.seed)) proPartie.set(e.seed, new Map());
    if (!proPartie.get(e.seed).has(e.mc)) proPartie.get(e.seed).set(e.mc, e);
  }
  const ARTEN = ['alt', 'gf', 'lese'];
  const vorn = {alt: 0, gf: 0, lese: 0}, rang1 = {alt: 0, gf: 0, lese: 0}, rang16 = {alt: 0, gf: 0, lese: 0};
  let n = 0, gerankt = 0;
  for (const p of dumps.flatMap(lies)) {
    const evs = proPartie.get(p.seed);
    if (!evs) continue;
    const b = new Uint8Array(N), zuerst = p.beginnt === 'S' ? 1 : 2;
    for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
    for (let k = 0; k < p.zuege.length; k++) {
      const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
      if (i >= 0) { b[i] = f; E.removeDeadGroups(b, 3 - f, i); }
      const e = evs.get(mc);
      if (!e) continue;
      const c = 3 - f, r = vonGtp(e.referenz), ant = vonGtp(e.antwort);
      if (r < 0 || b[r]) continue;
      let leer = 0;
      for (let q = 0; q < N; q++) if (!b[q]) leer++;
      const voll = n++ % jede === 0;
      const kand = voll ? [...Array(N).keys()].filter(q => !b[q]) : [r, ant];
      const w = bewerte(b, c, mc + 1, leer, kand);
      if (ant >= 0 && ant !== r && w.has(ant)) for (const x of ARTEN) if (w.get(r)[x] > w.get(ant)[x]) vorn[x]++;
      if (voll) {
        gerankt++;
        const werte = [...w.entries()];
        for (const x of ARTEN) {
          const rg = werte.slice().sort((u, v) => v[1][x] - u[1][x]).findIndex(z => z[0] === r) + 1;
          if (rg === 1) rang1[x]++;
          if (rg <= 16) rang16[x]++;
        }
      }
    }
  }
  const pz = (z, m) => `${(100 * z / m).toFixed(1)} %`;
  console.log(`${n} Annäherungen an die KI mit lokaler Referenz, ${gerankt} voll gerankt`);
  for (const [x, t] of [['alt', 'Default'], ['gf', 'gebietFreiheit 1'], ['lese', 'gebietZug mit Lesestatus']])
    console.log(`  ${t.padEnd(26)} Referenz vor dem KI-Zug ${pz(vorn[x], n).padStart(7)}   Rang 1 ${pz(rang1[x], gerankt).padStart(7)}   Rang ≤ 16 ${pz(rang16[x], gerankt).padStart(7)}`);
}

module.exports = {bewerte, verloren};
