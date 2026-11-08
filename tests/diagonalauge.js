// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schalter PARAMS.diagonalAugeEnde (docs/diagonalpruefung-vorabfestlegung.md, AP1 und AP2), ohne Browser und ohne Rohdaten:
     1. Bitgleich bei aus: Tot-Menge von toteSteineAmEnde und Ergebnis von zaehlVorschau (Fläche und Territory) sind auf 90 festen Prüfbrettern
        (80 Zufallsbretter nach Seed, die Endbretter der SGF unter tests/stellungen/) gleich den Referenzwerten, die VOR der Änderung aus der
        unveränderten Fassung erzeugt wurden (tests/referenz/diagonalauge.json, erzeugt von auswertung/zaehlung-mechanismus/diagonalauge-referenz.js).
     2. Die Tot-Mengen der sieben Entwicklungsstellungen der Stufe C bei aus sind gleich den eingefrorenen.
     3. Bei an (Parameter diagAuge, opt.diagonalAuge) sind Tot-Menge und Vorschau gleich der Test-Kopie der Diagnose (ebenfalls vorab eingefroren), auf den
        90 Brettern und den sieben Entwicklungsstellungen; fünf von ihnen ändern sich, zwei (523|354, 26|335) nicht.
     4. Standard: PARAMS.diagonalAugeEnde ist 0, auch in PARAMS_DEFAULT.
     5. Der Worker-Pfad reicht den Schalter durch: passNachGegnerpassPruefung ruft zaehlVorschau mit opt.diagonalAuge gleich dem Parameter auf.
     (Schlusszählung im Hauptthread, Anzeige und Dashboard: tests/browser-diagonalauge.js.)
   Aufruf:  node tests/diagonalauge.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const B = require('./diagonalauge-brett.js');

const E = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const REF = JSON.parse(fs.readFileSync(B.REFERENZ_DATEI, 'utf8'));
const brettFuer = quelle => {
  if (quelle.startsWith('zufall-')) { const z = B.ZUFALL.find(x => `zufall-${x.seed}` === quelle); return B.zufallsbrett(E, z.seed, z.zuege); }
  return B.sgfBrett(E, quelle.slice(4));
};
const VORSCHAU = {flaeche: {modus: 'flaeche', gefangen: {1: 0, 2: 0}}, territory: {modus: 'territory', gefangen: {1: 5, 2: 3}}};

test('Referenz ist vollständig: 80 Zufallsbretter und alle SGF unter tests/stellungen', () => {
  const erwartet = [...B.ZUFALL.map(z => `zufall-${z.seed}`), ...B.SGF_DATEIEN.map(f => `sgf-${f}`)].sort();
  pruefeGleich(Object.keys(REF.bretter).sort().join(','), erwartet.join(','), 'Schlüssel der Referenz gleich den Prüfbrettern');
  pruefeGleich(REF.entwicklung.length, 7, 'sieben Entwicklungsstellungen');
  pruefe(/^[0-9a-f]{64}$/.test(REF.quelle.indexHtmlSha256) && /^[0-9a-f]{40}$/.test(REF.quelle.commit), 'Herkunft (Commit und Hash der unveränderten index.html) steht in der Referenz');
});

test('Schalter aus (Standard): Tot-Menge und Zählvorschau bitgleich zur eingefrorenen Referenz (90 Bretter)', () => {
  let n = 0;
  for (const [quelle, ref] of Object.entries(REF.bretter)) {
    const b = brettFuer(quelle);
    pruefeGleich(B.hashTot(E.toteSteineAmEnde(b)), ref.aus.tot, `${quelle}: Tot-Menge (Standard)`);
    pruefeGleich(B.hashTot(E.toteSteineAmEnde(b, undefined, undefined, false)), ref.aus.tot, `${quelle}: Tot-Menge (Schalter ausdrücklich aus)`);
    pruefeGleich(B.hashVorschau(E.zaehlVorschau(b, 7.5, VORSCHAU.flaeche)), ref.aus.vorschauFlaeche, `${quelle}: Vorschau Fläche`);
    pruefeGleich(B.hashVorschau(E.zaehlVorschau(b, 7.5, VORSCHAU.territory)), ref.aus.vorschauTerritory, `${quelle}: Vorschau Territory`);
    n++;
  }
  pruefeGleich(n, 90, 'alle 90 Bretter geprüft');
});

test('Entwicklungsstellungen der Stufe C: Tot-Mengen bei aus gleich den eingefrorenen', () => {
  for (const e of REF.entwicklung) {
    pruefeGleich(JSON.stringify(B.indizes(E.toteSteineAmEnde(B.brettAusText(e.brett)))), JSON.stringify(e.totAus), `${e.schluessel}: Tot-Menge aus`);
  }
});

test('Schalter an: Tot-Menge und Vorschau gleich der Test-Kopie der Diagnose (90 Bretter)', () => {
  let anders = 0;
  for (const [quelle, ref] of Object.entries(REF.bretter)) {
    const b = brettFuer(quelle);
    pruefeGleich(B.hashTot(E.toteSteineAmEnde(b, undefined, undefined, true)), ref.an.tot, `${quelle}: Tot-Menge an`);
    pruefeGleich(B.hashVorschau(E.zaehlVorschau(b, 7.5, {...VORSCHAU.flaeche, diagonalAuge: true})), ref.an.vorschauFlaeche, `${quelle}: Vorschau Fläche an`);
    pruefeGleich(B.hashVorschau(E.zaehlVorschau(b, 7.5, {...VORSCHAU.territory, diagonalAuge: true})), ref.an.vorschauTerritory, `${quelle}: Vorschau Territory an`);
    if (ref.an.tot !== ref.aus.tot) anders++;
  }
  pruefe(anders >= 5, `die Prüfbretter üben die Änderung (${anders} mit anderer Tot-Menge bei an)`);
});

test('Entwicklungsstellungen: an gleich der Test-Kopie; fünf ändern sich, zwei nicht', () => {
  const unveraendert = new Set(['Fuego 50 Spiele|D.jsonl.gz|523|354', 'alte PWA|m1.jsonl.gz|26|335']);
  for (const e of REF.entwicklung) {
    const b = B.brettAusText(e.brett);
    pruefeGleich(JSON.stringify(B.indizes(E.toteSteineAmEnde(b, undefined, undefined, true))), JSON.stringify(e.totAn), `${e.schluessel}: Tot-Menge an`);
    pruefeGleich(JSON.stringify(e.totAus) === JSON.stringify(e.totAn), unveraendert.has(e.schluessel), `${e.schluessel}: ${unveraendert.has(e.schluessel) ? 'unverändert' : 'verändert'}`);
  }
});

test('Standard: PARAMS.diagonalAugeEnde ist 0 (auch in PARAMS_DEFAULT)', () => {
  pruefeGleich(E.PARAMS.diagonalAugeEnde, 0, 'PARAMS');
  pruefeGleich(globalThis.PARAMS_DEFAULT.diagonalAugeEnde, 0, 'PARAMS_DEFAULT');
});

test('Worker-Pfad reicht den Schalter durch: passNachGegnerpassPruefung', () => {
  const alt = globalThis.zaehlVorschau, gesehen = [], P = E.PARAMS, vorher = {p: P.passNachGegnerpass, d: P.diagonalAugeEnde};
  globalThis.zaehlVorschau = function (b, k, opt) { gesehen.push(!!(opt && opt.diagonalAuge)); return alt.apply(this, arguments); };
  try {
    const b = B.brettAusText(REF.entwicklung[3].brett);
    P.passNachGegnerpass = 1;
    for (const d of [0, 1]) { P.diagonalAugeEnde = d; E.passNachGegnerpassPruefung(b, 1, {1: 0, 2: 0}, {gegnerPasste: true, wertung: 'flaeche', komi: 7.5}); }
    pruefeGleich(gesehen.join(','), 'false,true', 'opt.diagonalAuge folgt PARAMS.diagonalAugeEnde');
  } finally { globalThis.zaehlVorschau = alt; P.passNachGegnerpass = vorher.p; P.diagonalAugeEnde = vorher.d; }
});

laufeTests('diagonalauge.js').then(ok => { process.exitCode = ok ? 0 : 1; });
