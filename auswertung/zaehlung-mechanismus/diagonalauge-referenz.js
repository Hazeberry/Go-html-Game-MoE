// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* AP1 der Vorabfestlegung zur Diagonalprüfung (docs/diagonalpruefung-vorabfestlegung.md §7 Nr. 3, §11): friert Referenzwerte ein, BEVOR index.html geändert wird.
   Aus der UNVERÄNDERTEN index.html:
     aus  Tot-Menge von toteSteineAmEnde und Ergebnis von zaehlVorschau (Fläche und Territory) auf den festen Prüfbrettern (tests/diagonalauge-brett.js)
     an   dieselben Größen in einer TEST-KOPIE, in der ein Ein-Punkt-Auge nur mit _diagIsTrueEye zählt (Verfahren wie gegenprobe.js --variante diagonalauge;
          die Test-Kopie liegt im Verzeichnis tmp, nicht im Repo). Das ist die Vorgabe, die die Umsetzung (AP2) erfüllen muss.
   Dazu sieben Entwicklungsstellungen der Stufe C (Brett, Tot-Mengen aus und an).
   Das Skript bricht ab, wenn index.html nicht dem Stand entspricht, aus dem die Referenz stammen soll (--erwartet-sha).
   Aufruf: node diagonalauge-referenz.js --html index.html --daten <entpacktes Artefakt der Stufe C> --tmp <Verzeichnis> --aus tests/referenz/diagonalauge.json --erwartet-sha <sha256 der unveränderten index.html> */
'use strict';
const G = require('./gemeinsam.js');
const B = require(G.path.join(G.WURZEL, 'tests', 'diagonalauge-brett.js'));
const {execFileSync} = require('child_process');
const o = G.optionen(process.argv.slice(2), ['html', 'daten', 'tmp', 'aus', 'erwartet-sha']);
const orig = G.fs.readFileSync(o.html, 'utf8'), sha = G.sha256(orig);
if (sha !== o['erwartet-sha']) throw new Error(`index.html weicht ab (${sha}); die Referenz muss aus dem unveränderten Stand stammen`);
const anker = 'V.augen++; if (r.groesse >= augeGross';
if (orig.split(anker).length !== 2) throw new Error('Anker nicht genau einmal');
G.fs.mkdirSync(o.tmp, {recursive: true});
const kopie = G.path.join(o.tmp, 'index-diagonalauge-referenz.html');
G.fs.writeFileSync(kopie, orig.replace(anker, 'if (r.groesse === 1 && !_diagIsTrueEye(b, r.punkte[0], r.rand)) continue; ' + anker));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: G.WURZEL, encoding: 'utf8'}).trim();
const SCHLUESSEL = ['Fuego 50 Spiele|D.jsonl.gz|270|449', 'Fuego 100 Spiele|f-D.jsonl.gz|21|428', 'Fuego 50 Spiele|D.jsonl.gz|903|306', 'Fuego 50 Spiele|D.jsonl.gz|212|337',
  'alte PWA|m1.jsonl.gz|339|314', 'Fuego 50 Spiele|D.jsonl.gz|523|354', 'alte PWA|m1.jsonl.gz|26|335'];
const zeilen = new Map(G.ladeZeilen(o.daten).map(r => [r.schluessel, r]));
for (const k of SCHLUESSEL) if (!zeilen.has(k)) throw new Error('Entwicklungsstellung fehlt: ' + k);

function rechne(htmlPfad) {
  const E = G.ladeKI({htmlPfad, mitNetz: false});
  const bretter = {};
  for (const {quelle, brett} of B.bretterAlle(E)) {
    bretter[quelle] = {
      tot: B.hashTot(E.toteSteineAmEnde(brett)),
      vorschauFlaeche: B.hashVorschau(E.zaehlVorschau(brett, 7.5, {modus: 'flaeche', gefangen: {1: 0, 2: 0}})),
      vorschauTerritory: B.hashVorschau(E.zaehlVorschau(brett, 7.5, {modus: 'territory', gefangen: {1: 5, 2: 3}}))
    };
  }
  const entwicklung = SCHLUESSEL.map(k => B.indizes(E.toteSteineAmEnde(B.brettAusText(zeilen.get(k).diagnose.anfang.brett))));
  return {bretter, entwicklung};
}
const aus = rechne(o.html);     /* Original zuerst; die Test-Kopie danach (zwei Stände nie gleichzeitig benutzen) */
const an = rechne(kopie);
const ergebnis = {
  _beschreibung: 'Eingefrorene Referenz zur Diagonalprüfung (docs/diagonalpruefung-vorabfestlegung.md). aus = unveränderte Fassung; an = Test-Kopie der Diagnose. Erzeugt vor der Änderung von index.html.',
  quelle: {commit, indexHtmlSha256: sha, verfahrenAn: 'Test-Kopie wie auswertung/zaehlung-mechanismus/gegenprobe.js --variante diagonalauge', stufeCZipSha256: '0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08'},
  bretter: Object.fromEntries(Object.keys(aus.bretter).map(q => [q, {aus: aus.bretter[q], an: an.bretter[q]}])),
  entwicklung: SCHLUESSEL.map((k, i) => ({schluessel: k, brett: zeilen.get(k).diagnose.anfang.brett, totAus: aus.entwicklung[i], totAn: an.entwicklung[i]}))
};
G.fs.writeFileSync(o.aus, JSON.stringify(ergebnis, null, 1) + '\n');
const geaendertB = Object.values(ergebnis.bretter).filter(x => x.aus.tot !== x.an.tot).length;
console.log(`Referenz geschrieben: ${Object.keys(ergebnis.bretter).length} Bretter (davon ${geaendertB} mit anderer Tot-Menge bei an), ${ergebnis.entwicklung.length} Entwicklungsstellungen; commit ${commit}; index.html ${sha}`);
for (const e of ergebnis.entwicklung) console.log(`  ${e.schluessel}: aus ${e.totAus.length} Steine tot, an ${e.totAn.length}, ${JSON.stringify(e.totAus) === JSON.stringify(e.totAn) ? 'gleich' : 'verschieden'}`);
