// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Sagen Muster GNU Gos Zug voraus, und hilft das der Zugbewertung? Gehört
   zu docs/muster.md.

   Liest die Lehrdaten von muster-daten.js. Merkmale eines Zugs m für die
   Seite c am Zug:

     muster   3×3-Umgebung von m: leer, eigen, fremd, Rand; bei Steinen
              auf den vier direkten Nachbarn dazu, ob ihre Kette 1 oder 2
              Freiheiten hat. Auf Drehung und Spiegelung normiert.
     nahLetzt Abstand (Chebyshev) zum letzten Zug: 1, 2, 3, 4–6, weiter
     nahVor   Abstand zum vorletzten Zug (dem eigenen), ebenso
     linie    1, 2, 3, 4, 5 und mehr

   Training: Für jedes Merkmal zählt das Werkzeug, wie oft ein Zug mit
   diesem Wert möglich war und wie oft GNU Go ihn wählte. Der Musterwert
   eines Zugs ist die Summe der Logarithmen von (gewählt + 1) / (möglich +
   1 / Grundrate) / Grundrate, also wie viel häufiger als im Schnitt GNU
   Go Züge mit diesem Wert wählt.

   Test (Partien mit nr % 4 = 0): Rang von GNU Gos Zug unter allen legalen
   Zügen (Ko nicht geprüft) nach
     evaluateMove        die heutige Zugbewertung (Zufall auf 0)
     Muster              nur der Musterwert
     evaluateMove + w ×  Musterwert, für mehrere w
   getrennt für Züge vor und ab Zug 81 (ab dort bewertet allein der
   Endspiel-Experte).

   Aufruf:
     node auswertung/muster.js daten.jsonl [...] [--gewichte 25,50,100,200,400]
          [--ohne-vor] [--min 1] [--tabelle muster-tabelle.json]
     node auswertung/muster.js daten.jsonl [...] --alle --ohne-vor --min 20 --tabelle t.json
       (Tabelle aus allen Partien, ohne Test; so entsteht MUSTER_TABELLE in index.html)
   Weitere Schalter: --taktik (taktisches Merkmal), --verfahren mm (gemeinsam
   gelernte Gewichte statt einzeln gezählter), --iter 30, --aktuell (statt
   zu lernen die Tabelle aus index.html prüfen), --test datei (nur an den
   Testpartien dieser Datei prüfen) */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

/* Die Engine erst bei Bedarf laden: tests/muster.js holt sich nur
   musterSchluessel und darf keine zweite Engine in den globalen Raum
   bekommen. */
let _E = null;
const ki = () => _E || (_E = ladeKI({mitNetz: false}));
/* Für Tests: die Engine des Aufrufers benutzen statt eine zweite zu laden. */
const nutzeKI = e => { _E = e; };
const N = 361, G = 19;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const abstand = (a, b) => a < 0 || b < 0 ? 99 : Math.max(Math.abs(a % G - b % G), Math.abs(Math.floor(a / G) - Math.floor(b / G)));
const linie = i => { const x = i % G, y = Math.floor(i / G); return Math.min(x, y, G - 1 - x, G - 1 - y) + 1; };

/* Die 8 Symmetrien des 3×3-Felds als Abbildung (dx, dy) → (dx', dy') */
const SYM = [
  (x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y],
  (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x],
];
const ZELLEN = [];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ZELLEN.push([dx, dy]);

function musterSchluessel(b, m, c, frei) {
  const x0 = m % G, y0 = Math.floor(m / G);
  const code = (dx, dy) => {
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= G || y >= G) return '#';
    const i = y * G + x, v = b[i];
    if (!v) return '.';
    let s = v === c ? 'o' : 'x';
    if (dx === 0 || dy === 0) { const l = frei(i); if (l === 1) s += '1'; else if (l === 2) s += '2'; }
    return s;
  };
  const roh = new Map();
  for (const [dx, dy] of ZELLEN) roh.set(dx + ',' + dy, code(dx, dy));
  let best = null;
  for (const t of SYM) {
    const s = ZELLEN.map(([dx, dy]) => { const [u, v] = t(dx, dy); return roh.get(u + ',' + v); }).join('|');
    if (best === null || s < best) best = s;
  }
  return best;
}
/* Der vorletzte Zug (der eigene) ist der Engine in getAIMove nicht bekannt;
   --ohne-vor lässt das Merkmal weg, um zu sehen, was es kostet. */
let MIT_VOR = true;
/* --taktik: zusätzlich ein taktisches Merkmal t: aus dem Brett nach dem Zug
   (c0/c1/c2 = schlägt 0, 1, 2+ Steine; s = Selbstatari; r = rettet eine
   eigene Kette aus dem Atari; a = setzt eine fremde Kette ins Atari). */
let MIT_TAKTIK = false;
/* Merkmalswerte, die seltener als MIN_MOEGLICH Mal möglich waren, kommen
   nicht in die Tabelle (Wert 0). */
let MIN_MOEGLICH = 1;
const eimer = d => d >= 99 ? 'keiner' : d <= 3 ? String(d) : d <= 6 ? '4-6' : 'weit';

function taktik(b, nb, m, c, cap, frei) {
  let t = cap === 0 ? 'c0' : cap === 1 ? 'c1' : 'c2';
  const eigen = ki().floodFill(nb, m).liberties.length;
  if (eigen === 1 && !cap) t += 's';
  let rettet = false, atari = false;
  for (const n of ki().NEIGHBORS[m]) {
    if (b[n] === c && frei(n) === 1 && eigen >= 2) rettet = true;
    if (nb[n] === 3 - c && ki().floodFill(nb, n).liberties.length === 1) atari = true;
  }
  if (rettet) t += 'r';
  if (atari) t += 'a';
  return t;
}

/* Alle legalen Züge der Stellung mit ihren Merkmalen */
function zuege(b, c, letzt, vor) {
  const libsCache = new Map();
  const frei = i => {
    if (libsCache.has(i)) return libsCache.get(i);
    const ff = ki().floodFill(b, i);
    for (const q of ff.group) libsCache.set(q, ff.liberties.length);
    return ff.liberties.length;
  };
  const aus = [];
  for (let m = 0; m < N; m++) {
    if (b[m]) continue;
    const nb = new Uint8Array(b); nb[m] = c;
    const cap = ki().removeDeadGroups(nb, 3 - c, m);
    if (!cap && ki().floodFill(nb, m).liberties.length === 0) continue;
    const f = ['m:' + musterSchluessel(b, m, c, frei), 'l:' + eimer(abstand(m, letzt)), 'z:' + Math.min(linie(m), 5)];
    if (MIT_VOR) f.push('v:' + eimer(abstand(m, vor)));
    if (MIT_TAKTIK) f.push('t:' + taktik(b, nb, m, c, cap, frei));
    aus.push({m, f});
  }
  return aus;
}

/* Stellungen einer Partie nachspielen: ruft f(b, c, k, letzt, vor, ziel) */
function stellungen(p, f) {
  const b = new Uint8Array(N), zuerst = p.beginnt === 'S' ? 1 : 2;
  for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
  const ziel = new Map(p.ziele.map(z => [z.k, vonGtp(z.gnugo)]));
  let letzt = -1, vor = -1;
  for (let k = 0; k < p.zuege.length; k++) {
    const c = k % 2 === 0 ? zuerst : 3 - zuerst;
    if (ziel.has(k) && ziel.get(k) >= 0) f(b, c, k, letzt, vor, ziel.get(k));
    if (!ziel.size || k > Math.max(...ziel.keys())) break;
    const i = vonGtp(p.zuege[k]);
    vor = letzt; letzt = i;
    if (i >= 0) { b[i] = c; ki().removeDeadGroups(b, 3 - c, i); }
  }
}

function lerne(partien) {
  const moeglich = new Map(), gewaehlt = new Map();
  let nM = 0, nG = 0;
  for (const p of partien) stellungen(p, (b, c, k, letzt, vor, t) => {
    for (const z of zuege(b, c, letzt, vor)) {
      for (const x of z.f) moeglich.set(x, (moeglich.get(x) || 0) + 1);
      nM++;
      if (z.m === t) { for (const x of z.f) gewaehlt.set(x, (gewaehlt.get(x) || 0) + 1); nG++; }
    }
  });
  const grund = nG / nM, tabelle = {};
  for (const [x, n] of moeglich) if (n >= MIN_MOEGLICH) tabelle[x] = +Math.log(((gewaehlt.get(x) || 0) + 1) / (n + 1 / grund) / grund).toFixed(3);
  return {tabelle, grund, merkmale: moeglich.size, stellungen: nG};
}

/* Gemeinsam gelernte Gewichte (verallgemeinertes Bradley-Terry-Modell,
   MM-Verfahren nach Coulom 2007): Jeder Merkmalswert i hat eine Stärke
   gamma_i, ein Zug die Stärke des Produkts seiner Merkmale, und GNU Gos Zug
   wird mit Wahrscheinlichkeit Stärke / Summe aller Stärken gewählt. Jeder
   Zug hat genau ein Merkmal je Gruppe (m, l, z, ...); die Gruppen werden
   nacheinander aktualisiert. Vorwissen: ein virtueller Sieg und eine
   virtuelle Niederlage gegen Stärke 1. Tabellenwert = ln gamma. */
function lerneMM(partien, iter = 30) {
  const id = new Map(), namen = [];
  let K = 0, feats = new Int32Array(1 << 20), nF = 0;
  const pos = [];   /* [erster Kandidat, Zahl, gewählter Kandidat] */
  let nKand = 0;
  for (const p of partien) stellungen(p, (b, c, k, letzt, vor, t) => {
    const zs = zuege(b, c, letzt, vor);
    const gi = zs.findIndex(z => z.m === t);
    if (gi < 0) return;
    K = zs[0].f.length;
    pos.push([nKand, zs.length, nKand + gi]);
    for (const z of zs) {
      for (const x of z.f) {
        let j = id.get(x);
        if (j === undefined) { j = namen.length; id.set(x, j); namen.push(x); }
        if (nF === feats.length) { const n = new Int32Array(feats.length * 2); n.set(feats); feats = n; }
        feats[nF++] = j;
      }
      nKand++;
    }
  });
  const F = namen.length, gamma = new Float64Array(F).fill(1), W = new Float64Array(F), moeglich = new Float64Array(F);
  for (const [, , g] of pos) for (let k = 0; k < K; k++) W[feats[g * K + k]]++;
  for (let q = 0; q < nKand * K; q++) moeglich[feats[q]]++;
  const staerke = new Float64Array(nKand);
  for (let it = 0; it < iter; it++) {
    for (let grp = 0; grp < K; grp++) {
      const D = new Float64Array(F);
      for (const [a, n] of pos) {
        let E = 0;
        for (let m = a; m < a + n; m++) {
          let s = 1;
          for (let k = 0; k < K; k++) s *= gamma[feats[m * K + k]];
          staerke[m] = s; E += s;
        }
        for (let m = a; m < a + n; m++) { const i = feats[m * K + grp]; D[i] += staerke[m] / gamma[i] / E; }
      }
      for (let i = 0; i < F; i++) {
        if (!D[i]) continue;   /* Merkmal einer anderen Gruppe */
        gamma[i] = (W[i] + 1) / (D[i] + 2 / (gamma[i] + 1));
      }
    }
  }
  const tabelle = {};
  for (let i = 0; i < F; i++) if (moeglich[i] >= MIN_MOEGLICH) tabelle[namen[i]] = +Math.log(gamma[i]).toFixed(3);
  return {tabelle, grund: pos.length / nKand, merkmale: F, stellungen: pos.length};
}

const musterWert = (tabelle, z) => z.f.reduce((s, x) => s + (tabelle[x] || 0), 0);

function teste(partien, tabelle, gewichte) {
  const ergebnis = {};
  const zaehle = (phase, name, rang) => {
    const k = phase + '|' + name;
    if (!ergebnis[k]) ergebnis[k] = {n: 0, r1: 0, r16: 0};
    ergebnis[k].n++; if (rang === 1) ergebnis[k].r1++; if (rang <= 16) ergebnis[k].r16++;
  };
  for (const p of partien) stellungen(p, (b, c, k, letzt, vor, t) => {
    const zs = zuege(b, c, letzt, vor);
    if (!zs.some(z => z.m === t)) return;
    const zufall = Math.random; Math.random = () => 0;
    ki().buildCrisisMap(b, c); ki().primeAreaCache(b, c); ki().primeEndTieBreak(b);
    for (const z of zs) { z.e = ki().evaluateMove(b, z.m, c, k + 1, zs.length); z.w = musterWert(tabelle, z); }
    Math.random = zufall;
    const phase = k + 1 <= 80 ? 'bis Zug 80' : 'ab Zug 81';
    const rang = wert => { const t0 = zs.find(z => z.m === t), v = wert(t0); return 1 + zs.filter(z => wert(z) > v).length; };
    zaehle(phase, 'evaluateMove', rang(z => z.e));
    zaehle(phase, 'Muster', rang(z => z.w));
    for (const g of gewichte) zaehle(phase, `evaluateMove + ${g} × Muster`, rang(z => z.e + g * z.w));
  });
  return ergebnis;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  let gewichte = [25, 50, 100, 200, 400], tabelleAus = null, alle = false, verfahren = 'naiv', iter = 30, aktuell = false, testDatei = null;
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--gewichte') gewichte = a[++k].split(',').map(Number);
    else if (a[k] === '--tabelle') tabelleAus = a[++k];
    else if (a[k] === '--ohne-vor') MIT_VOR = false;
    else if (a[k] === '--min') MIN_MOEGLICH = +a[++k];
    else if (a[k] === '--alle') alle = true;
    else if (a[k] === '--taktik') MIT_TAKTIK = true;
    else if (a[k] === '--verfahren') verfahren = a[++k];
    else if (a[k] === '--iter') iter = +a[++k];
    else if (a[k] === '--aktuell') aktuell = true;
    else if (a[k] === '--test') testDatei = a[++k];
    else dateien.push(a[k]);
  }
  const partien = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)));
  /* --test datei: geprüft wird nur an den Testpartien dieser Datei (zum
     Beispiel nur an Partien der neuen KI); gelernt wird weiter aus allen. */
  const testQuelle = testDatei ? fs.readFileSync(testDatei, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)) : partien;
  const training = alle ? partien : partien.filter(p => p.nr % 4 !== 0), test = alle ? [] : testQuelle.filter(p => p.nr % 4 === 0);
  const t0 = Date.now();
  const {tabelle, grund, merkmale, stellungen: n} = aktuell ? {tabelle: ki().MUSTER_TABELLE, grund: 0, merkmale: Object.keys(ki().MUSTER_TABELLE).length, stellungen: 0}
    : verfahren === 'mm' ? lerneMM(training, iter) : lerne(training);
  console.log(`Training: ${training.length} Partien, ${n} Stellungen, ${merkmale} Merkmalswerte, Grundrate ${(100 * grund).toFixed(2)} % · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (tabelleAus) fs.writeFileSync(tabelleAus, JSON.stringify(tabelle));
  if (alle) return;
  const erg = teste(test, tabelle, gewichte);
  console.log(`Test: ${test.length} Partien. Rang von GNU Gos Zug unter allen legalen Zügen:`);
  for (const [k, v] of Object.entries(erg)) {
    const [phase, name] = k.split('|');
    console.log(`  ${phase.padEnd(11)} ${name.padEnd(30)} ${String(v.n).padStart(5)}   Rang 1 ${(100 * v.r1 / v.n).toFixed(1).padStart(5)} %   Rang ≤ 16 ${(100 * v.r16 / v.n).toFixed(1).padStart(5)} %`);
  }
}

module.exports = {musterSchluessel, zuege, lerne, lerneMM, teste, musterWert, taktik, nutzeKI};
