// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Eingabeebenen des Endspiel-Lerners (docs/endspiel-lerner.md): je Stellung
   EBENEN Ebenen zu 19 × 19, aus Sicht der Seite am Zug, als 0/1-Werte.

     0  eigener Stein            1  fremder Stein          2  leer
     3–6   eigene Kette mit 1, 2, 3, 4+ Freiheiten
     7–10  fremde Kette mit 1, 2, 3, 4+ Freiheiten
     11 letzter Zug (des Gegners)  12 eigener Zug davor   13 Ko-Punkt
     14 legal (leer, nicht Ko, kein Selbstmord)
     15 schlägt mindestens einen Stein   16 schlägt mindestens drei
     17 Selbstatari (die neue Kette hätte eine Freiheit und schlägt nichts)
     18 gibt Atari (eine fremde Kette mit zwei Freiheiten, eine davon hier)
     19 Bouzy-Zone eigen         20 Bouzy-Zone fremd
     21 Bouzy-Wert eigen ≥ 4     22 Bouzy-Wert fremd ≥ 4
     23 Benson: eigene Kette pass-alive   24 fremde pass-alive
     25 Benson: bewiesen tot (beide Farben)
     26 überall 1 (mit der Null-Auffüllung am Rand erkennt das Netz den Rand)
     27 Zug 160 oder später (überall 1)

   Die Ketten und Freiheiten rechnet die Datei selbst; Bouzy-Karte und Benson
   kommen aus der Engine (E aus tests/rahmen.js ladeKI oder die Funktionen in
   index.html). */
'use strict';
const N = 361, G = 19, EBENEN = 28;

const NACHBARN = [];
for (let i = 0; i < N; i++) {
  const x = i % G, y = (i / G) | 0, n = [];
  if (x > 0) n.push(i - 1); if (x < G - 1) n.push(i + 1);
  if (y > 0) n.push(i - G); if (y < G - 1) n.push(i + G);
  NACHBARN.push(n);
}

/* Ketten: Nummer je Punkt (−1 leer), je Kette Farbe, Größe und Freiheiten */
function ketten(b) {
  const id = new Int32Array(N).fill(-1), farbe = [], groesse = [], freiheiten = [];
  const merk = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    if (!b[i] || id[i] >= 0) continue;
    const k = farbe.length, q = [i], fr = [];
    id[i] = k;
    for (let j = 0; j < q.length; j++) for (const n of NACHBARN[q[j]]) {
      if (!b[n]) { if (merk[n] !== k) { merk[n] = k; fr.push(n); } }
      else if (b[n] === b[i] && id[n] < 0) { id[n] = k; q.push(n); }
    }
    farbe.push(b[i]); groesse.push(q.length); freiheiten.push(fr);
  }
  return {id, farbe, groesse, freiheiten};
}

/* Ebenen der Stellung b (Seite c am Zug) nach aus[off …], als Uint8 0/1 */
function ebenen(E, b, c, letzt, vorletzt, ko, k, aus, off = 0) {
  const o = 3 - c, setze = (e, i) => { aus[off + e * N + i] = 1; };
  aus.fill(0, off, off + EBENEN * N);
  const K = ketten(b);
  for (let i = 0; i < N; i++) {
    setze(26, i);
    if (k >= 160) setze(27, i);
    if (!b[i]) { setze(2, i); continue; }
    const eigen = b[i] === c, f = Math.min(K.freiheiten[K.id[i]].length, 4);
    setze(eigen ? 0 : 1, i);
    setze((eigen ? 2 : 6) + f, i);
  }
  if (letzt >= 0) setze(11, letzt);
  if (vorletzt >= 0) setze(12, vorletzt);
  if (ko !== null && ko !== undefined && ko >= 0) setze(13, ko);
  /* Was ein Stein auf jedem leeren Punkt täte */
  const gesehen = new Int32Array(K.farbe.length).fill(-1);
  for (let i = 0; i < N; i++) {
    if (b[i] || i === ko) continue;
    let geschlagen = 0, atari = false, frei = 0;
    const freiSet = new Set();
    for (const n of NACHBARN[i]) {
      if (!b[n]) { freiSet.add(n); continue; }
      const kk = K.id[n];
      if (gesehen[kk] === i) continue;
      gesehen[kk] = i;
      const fr = K.freiheiten[kk];
      if (K.farbe[kk] === o) {
        if (fr.length === 1) geschlagen += K.groesse[kk];
        else if (fr.length === 2) atari = true;
      } else for (const p of fr) if (p !== i) freiSet.add(p);
    }
    frei = freiSet.size;
    if (!geschlagen && frei === 0) continue;   /* Selbstmord: nicht legal */
    setze(14, i);
    if (geschlagen >= 1) setze(15, i);
    if (geschlagen >= 3) setze(16, i);
    if (!geschlagen && frei === 1) setze(17, i);
    if (atari) setze(18, i);
  }
  /* Bouzy-Karte der Engine, positiv = Schwarz */
  const Z = E.bouzyKarte(b, new Int32Array(N), new Int32Array(N)), s = c === 1 ? 1 : -1;
  for (let i = 0; i < N; i++) {
    const v = s * Z[i];
    if (v > 0) setze(19, i); else if (v < 0) setze(20, i);
    if (v >= 4) setze(21, i); else if (v <= -4) setze(22, i);
  }
  /* Benson der Engine: eine Epoche, in der _bnAlive/_bnDead gelten */
  const ep = E.bensonClassify(b);
  for (let i = 0; i < N; i++) {
    if (!b[i]) continue;
    if (E._bnAlive[i] === ep) setze(b[i] === c ? 23 : 24, i);
    if (E._bnDead[i] === ep) setze(25, i);
  }
  return aus;
}

module.exports = {N, G, EBENEN, NACHBARN, ketten, ebenen};
