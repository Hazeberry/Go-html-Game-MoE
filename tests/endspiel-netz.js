// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Netz in index.html (PARAMS.endspielNetz, docs/endspiel-netz.md).

     1. Default 0,8 (seit docs/netz-dosis.md §8); bei 0 lässt
        endspielNetzWurzel die Kandidatenliste unberührt.
     2. Die Ebenen der Engine (_enEbenen) sind dieselben wie in
        auswertung/lerner-merkmale.js, an echten Stellungen.
     3. Die eingebetteten Float32-Gewichte geben dieselben Wahrscheinlichkeiten
        wie das geprüfte Netz (docs/daten/endspiel-lerner/netz.json.gz), bis
        auf die Rundung, und denselben besten Punkt.
     4. Mit endspielNetz 0,5 zieht getAIMove an echten Stellungen genau den Zug,
        den auswertung/lerner-pruefung.js in der Offline-Prüfung gezogen hat.

   Aufruf:  node tests/endspiel-netz.js */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const {test, pruefe, pruefeGleich, laufeTests, ladeKI} = require('./rahmen');
const M = require('../auswertung/lerner-merkmale.js');
const LN = require('../auswertung/lerner-netz.js');
const LD = require('../auswertung/lerner-daten.js');
const LP = require('../auswertung/lerner-pruefung.js');

const wurzel = path.join(__dirname, '..');
/* Eine einzige Engine: index.html mit dem Haken der Offline-Prüfung. Ohne
   gesetzten Haken (globalThis.__lernerHaken) verhält sie sich wie index.html.
   Zwei Engines im selben Prozess teilen globale Funktionen und spielen dann
   nicht mehr dieselben Züge; deshalb nur eine. */
const TMP = path.join(require('os').tmpdir(), `en-test-${process.pid}.html`);
fs.writeFileSync(TMP, LP.gepatcht(fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8')));
const E = ladeKI({htmlPfad: TMP, mitNetz: false});
fs.unlinkSync(TMP);
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
const NETZ = LN.netzAus(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'endspiel-lerner', 'netz.json.gz')))));
/* Stellungen aus den Entwicklungsdaten: eine Partie, jede fünfte beschriftete Stellung */
const PARTIE = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'muster-endspiel-pruef.jsonl.gz'))).toString('utf8').split('\n')[0]);
const STELLUNGEN = LD.stellungen(E, PARTIE, 80, true).filter((_, i) => i % 5 === 0);

test('Default 0,8 seit der Messung der Dosis; bei 0 lässt der Haken die Kandidaten unberührt', () => {
  pruefeGleich(E.PARAMS.endspielNetz, 0.8, 'endspielNetz ist 0,8 (docs/netz-dosis.md §8)');
  const s = STELLUNGEN[0], liste = [{m: {idx: 1}, score: 2}, {m: {idx: 2}, score: 1}];
  E.PARAMS.endspielNetz = 0;
  globalThis.endspielNetzWurzel(s.b, s.c, s.k, liste, null);
  E.PARAMS.endspielNetz = DEFAULT.endspielNetz;
  pruefe(!liste.__pNetz && liste.length === 2 && liste[0].m.idx === 1, 'keine Markierung, keine Umordnung');
});

test('Ebenen der Engine gleich lerner-merkmale.js', () => {
  pruefe(STELLUNGEN.length >= 5, `${STELLUNGEN.length} Stellungen`);
  for (const s of STELLUNGEN) {
    const a = M.ebenen(E, s.b, s.c, s.letzt, s.vorletzt, s.ko, s.k, new Uint8Array(M.EBENEN * 361));
    const b = globalThis._enEbenen(s.b, s.c, s.letzt, s.vorletzt, s.ko, s.k, new Uint8Array(M.EBENEN * 361));
    let gleich = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { gleich = false; break; }
    pruefe(gleich, `Zug ${s.k}: Ebenen gleich`);
  }
});

test('Eingebettete Gewichte (Float32): Wahrscheinlichkeiten und bester Punkt wie das geprüfte Netz', () => {
  let maxDiff = 0;
  for (const s of STELLUNGEN) {
    const x = M.ebenen(E, s.b, s.c, s.letzt, s.vorletzt, s.ko, s.k, new Uint8Array(M.EBENEN * 361));
    const p = LN.softmax(LN.vorwaerts(NETZ, x)), q = globalThis.endspielNetzWahrscheinlichkeiten(x);
    let bp = 0, bq = 0;
    for (let i = 0; i < 361; i++) { maxDiff = Math.max(maxDiff, Math.abs(p[i] - q[i])); if (p[i] > p[bp]) bp = i; if (q[i] > q[bq]) bq = i; }
    pruefeGleich(bq, bp, `Zug ${s.k}: bester Punkt`);
  }
  pruefe(maxDiff < 1e-6, `größte Abweichung einer Wahrscheinlichkeit ${maxDiff.toExponential(2)}`);
});

test('Mit endspielNetz 0,5 derselbe Zug wie in der Offline-Prüfung', () => {
  const auswahl = STELLUNGEN.slice(0, 6);
  const zug = (G, s, netz) => {
    Object.assign(G.PARAMS, DEFAULT, {mctsFixedSims: 120, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0, endspielNetz: netz});
    globalThis.endspielNetzMerke(s.c, s.vorletzt, s.k - 2);
    Math.random = LP.mulberry32((s.seed * 1000 + s.k) >>> 0);
    const r = G.getAIMove(new Uint8Array(s.b), s.c, s.hist, {...s.caps}, s.k, 'hard', 1, s.ko >= 0 ? s.ko : null, s.letzt >= 0 ? s.letzt : null);
    return r.type === 'stone' ? r.y * 19 + r.x : 361;
  };
  const mitSchalter = auswahl.map(s => zug(E, s, 0.5));
  const zustand = {letzt: -1, vorletzt: -1, ko: -1, aufgenommen: 0};
  globalThis.__lernerHaken = LP.haken(E, NETZ, {ab: 80, top: 4, lambda: 0.5}, zustand);
  let gleich = 0;
  auswahl.forEach((s, j) => {
    Object.assign(zustand, {letzt: s.letzt, vorletzt: s.vorletzt, ko: s.ko});
    if (zug(E, s, 0) === mitSchalter[j]) gleich++;
  });
  globalThis.__lernerHaken = null;
  pruefeGleich(gleich, auswahl.length, `${gleich} von ${auswahl.length} Zügen gleich`);
});

laufeTests('Endspiel-Netz in index.html').then(ok => process.exit(ok ? 0 : 1));
