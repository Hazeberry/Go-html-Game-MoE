// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Hilfsmodul (kein Test) für tests/diagonalauge.js und den Referenz-Generator
   auswertung/zaehlung-mechanismus/diagonalauge-referenz.js (docs/diagonalpruefung-vorabfestlegung.md §2, §7 Nr. 3).
   Erzeugt die festen Prüfbretter: 80 Zufallsbretter nach Seed (Zufallszüge ohne Selbstmord, mit Schlagen) und die Endbretter aller SGF unter
   tests/stellungen/. Die Bretter hängen nur von diesem Modul, dem Seed und den SGF-Dateien ab, nicht von toteSteineAmEnde. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = require('../auswertung/endspiel/passregel-lib.js');

const N = 361;
const STELLUNGEN = path.join(__dirname, 'stellungen');
const ZUFALL = Array.from({length: 80}, (_, k) => ({seed: k + 1, zuege: 200 + (((k + 1) * 13) % 500)}));
const SGF_DATEIEN = fs.readdirSync(STELLUNGEN).filter(f => f.endsWith('.sgf')).sort();

/* Zufallsbrett: abwechselnd Schwarz und Weiß, je Zug bis zu 30 Versuche an einem leeren Punkt; Selbstmord wird zurückgenommen */
function zufallsbrett(E, seed, zuege) {
  const rnd = L.mulberry32(seed), b = new Uint8Array(N);
  let f = 1;
  for (let k = 0; k < zuege; k++) {
    for (let t = 0; t < 30; t++) {
      const i = Math.floor(rnd() * N);
      if (b[i]) continue;
      b[i] = f; E.removeDeadGroups(b, 3 - f, i);
      if (E.floodFill(b, i).liberties.length === 0) { b[i] = 0; continue; }
      break;
    }
    f = 3 - f;
  }
  return b;
}
/* Endbrett einer SGF-Datei (nur Züge, Pässe weggelassen, Schlagen wie im Spiel) */
function sgfBrett(E, datei) {
  const txt = fs.readFileSync(path.join(STELLUNGEN, datei), 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(N);
  let m;
  while ((m = re.exec(txt))) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; E.removeDeadGroups(b, 3 - f, i);
  }
  return b;
}
/* Alle Prüfbretter als [{quelle, brett}] */
function bretterAlle(E) {
  return [...ZUFALL.map(z => ({quelle: `zufall-${z.seed}`, brett: zufallsbrett(E, z.seed, z.zuege)})),
          ...SGF_DATEIEN.map(f => ({quelle: `sgf-${f}`, brett: sgfBrett(E, f)}))];
}
const sha256 = daten => crypto.createHash('sha256').update(daten).digest('hex');
const hashTot = tot => sha256(Buffer.from(Uint8Array.from(tot)));
/* Hash des Ergebnisses von zaehlVorschau (alle Felder, Typed Arrays als Listen) */
function hashVorschau(v) {
  return sha256(JSON.stringify({bt: Array.from(v.bewiesenTot), gt: Array.from(v.geschaetztTot), bl: Array.from(v.bewiesenLebend), ub: Array.from(v.unbewiesen),
    a: v.anzahl, nb: v.nurBewiesen, ms: v.mitSchaetzung, k: v.komi, m: v.modus, s: v.sicher}));
}
const brettAusText = t => Uint8Array.from(String(t), c => (c === 'X' ? 1 : c === 'O' ? 2 : 0));
const brettZuText = b => Array.from(b, c => (c === 1 ? 'X' : c === 2 ? 'O' : '.')).join('');
const indizes = tot => Array.from(tot).flatMap((t, i) => (t ? [i] : []));
const REFERENZ_DATEI = path.join(__dirname, 'referenz', 'diagonalauge.json');
module.exports = {N, ZUFALL, SGF_DATEIEN, zufallsbrett, sgfBrett, bretterAlle, sha256, hashTot, hashVorschau, brettAusText, brettZuText, indizes, REFERENZ_DATEI};
