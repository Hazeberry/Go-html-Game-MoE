# Korrektur L-1: Vorabfestlegung

**Stand: 16.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befund aus `docs/bughunt-20261116.md` (L-1).
Go von Hazeberry am 16.11.2026: „Go für L-1, Vorabfestlegung schreiben“.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt

Betroffen ist nur die Darstellung im Hauptskript. Die Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben
**byteidentisch** (Prüfsummen wie in `docs/korrektur-d1-w1-vorabfestlegung.md` §1: `54dfef2d…`, `f847c124…`,
`56a5d6c0…`). `state`, `PARAMS` und das Spielgeschehen werden nicht berührt.

Kein Schalter, kein Messlauf. Was sich ändert: Nach einer Änderung der Fenstergröße wird das Brett in der passenden
Größe neu gezeichnet. Dabei entsteht wie beim Laden eine neue Holzmaserung.

**Zusätzliche Zufallsaufrufe:** `generateGrain` ruft `Math.random()` auf, 90-mal je Neuzeichnen. Leicht und Mittel
rechnen im Hauptthread und wählen ihre Züge mit demselben, nicht gesäten Zufallsgenerator. Nach einer Größenänderung
kann eine Partie auf diesen Stufen deshalb andere Züge bekommen, als sie ohne die Änderung bekommen hätte. Dass Leicht
und Mittel schon heute nicht reproduzierbar sind, beweist nicht, dass sich die Zugfolge nicht ändert. Es heißt nur,
dass es keine feste Zugfolge gab, die man vergleichen könnte. Die Stufe Schwer rechnet im Worker mit eigenem
Zufallsgenerator und ist davon nicht berührt, solange der Worker läuft. Im Rückfall auf den Hauptthread
(`workerDead`) teilt sie sich den Generator ebenfalls. Beides ist gelesen, nicht gemessen. Eine Auswirkung auf die Spielstärke ist
nicht gemessen.

## 2. Befund

`resizeCanvas()` (Z. 6573 am Stand `256f30d`) läuft einmal beim Laden. Einen `resize`-Handler gibt es nicht. Gemessen
im Bug Hunt (`docs/daten/bughunt-20261116/ergebnis.json`, L-1): Fenster von 1200 auf 400 Pixel Breite, das Brett
bleibt 634 Pixel breit (Soll 376), die Seite wird 517 Pixel breit und scrollt waagerecht.

Auf dem Handy betrifft das vermutlich das Drehen des Geräts. Das ist eine Hypothese, nicht geprüft.

## 3. Änderung

Nach `function render()` im Hauptskript:

```js
let _groesseUhr = 0, _groesseNachFokus = false;
function brettGroesseAnpassen() {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    if (!_groesseNachFokus) {
      _groesseNachFokus = true;
      document.addEventListener('focusout', () => { _groesseNachFokus = false; setTimeout(brettGroesseAnpassen, 0); }, {once: true});
    }
    return;
  }
  if (computeLayout().S === layout.S) return;
  resizeCanvas(); render();
  if (pendingTouch) drawGhost(pendingTouch.col, pendingTouch.row);
}
addEventListener('resize', () => { clearTimeout(_groesseUhr); _groesseUhr = setTimeout(brettGroesseAnpassen, 150); });
```

1. **Gebündelt:** Während des Ziehens am Fensterrand feuert `resize` laufend. Erst 150 ms nach dem letzten Ereignis
   wird gerechnet.
2. **Nur bei echter Änderung:** Ergibt `computeLayout()` dieselbe Brettgröße, passiert nichts. Kein Neuzeichnen und
   keine neue Maserung.
3. **Nicht beim Tippen:** Hat ein Eingabefeld den Fokus, wartet die Anpassung, bis es ihn verliert. Auf manchen
   Handy-Browsern verkleinert die Bildschirmtastatur das Fenster; ohne diese Regel würde das Brett beim Tippen in ein
   Dashboard-Feld schrumpfen und danach wieder wachsen. In welchen Browsern die Tastatur `innerHeight` tatsächlich
   ändert, ist **nicht geprüft**. Die Regel schadet auch dort nicht, wo es nicht so ist.
4. **Inhalt bleibt:** `resizeCanvas()` baut Brett, Steine, Letzter-Zug-Markierung und eine offene Zählvorschau aus
   `state` neu auf (`drawStateToCache`). Ein angefangener Touch-Zug (`pendingTouch`) wird als Vorschaustein neu
   gezeichnet. Klicks rechnet `eventToBoard` ohnehin über das aktuelle Rechteck des Canvas um.

**Unverändert:** Spielzustand, Engine, Dashboard und das Verhalten ohne Größenänderung. `computeLayout()` behält seine
Regel: höchstens 640 Pixel, 92 % der Breite, 82 % der Höhe.

**Erwogen und verworfen:**
- *Nur auf Breitenänderungen reagieren.* Das umgeht das Tastaturproblem, verpasst aber reine Höhenänderungen, etwa ein
  Desktop-Fenster, das man nur niedriger zieht. Dann ragt das Brett unten hinaus.
- *Größe per CSS skalieren statt neu zeichnen.* Das Canvas würde unscharf, und die Pixelrechnung in `eventToBoard` und
  den Tests ändert sich. Mehr Eingriff für dasselbe Ergebnis.
- *`devicePixelRatio` berücksichtigen (schärfer auf hochauflösenden Displays).* Das ist eine eigene Änderung und gehört
  nicht in diese Korrektur.

**Nicht Teil der Korrektur:** R-1, B-1 bis B-3; Messungen auf echten Handys.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`. Die Zeile in `tests/README.md` wird ergänzt. Sie laufen in einem eigenen
Browser-Kontext mit festem Fenster 1200 × 900 und verkleinern dann auf 400 × 800.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-L1 | Nach dem Verkleinern und 400 ms Wartezeit: Breite des Canvas = `computeLayout().S`; die Seite scrollt nicht waagerecht (`scrollWidth` ≤ `innerWidth`) | scheitert: 634 statt 376, Seite 517 breit |
| T-L2 | Vor dem Verkleinern ein schwarzer Stein auf D16 (3/3) und offene Zählvorschau. Danach: Der Pixel an der Soll-Lage des Steins nach `computeLayout()` ist dunkel, `state.vorschau` besteht weiter. Ein Mausklick auf den Punkt 15/15 setzt dort einen Stein | scheitert am Pixel (dort liegt noch das alte Bild); Vorschau und Klick bestehen |
| T-L3 | Fokus auf einem Dashboard-Feld, dann verkleinern: Das Canvas behält seine Breite. Nach dem Verlassen des Feldes hat es die Soll-Breite | scheitert: Breite bleibt auch danach 634 |
| T-L4 | Ein `resize`-Ereignis ohne Größenänderung: dieselbe Maserung (`grainCanvas` unverändert), keine Seitenfehler | besteht (Kontrolle: kein unnötiges Neuzeichnen) |

T-L1 bis T-L3 müssen am alten Code fehlschlagen und am neuen bestehen. T-L4 besteht an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1.
2. T-L1 bis T-L3 schlagen am alten Code fehl und bestehen am neuen; T-L4 besteht an beiden.
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: L-1 „nicht reproduziert“. Alle übrigen Fälle unverändert
   gegenüber dem Stand, auf dem die Umsetzung aufsetzt. Die Ausgabe wird als
   `docs/daten/bughunt-20261116/nach-l1.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (16.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `256f30d`) außerhalb des Repos eingesetzt und lokal
geprüft (Chromium 153 headless). Der Prototyp ist nicht die Umsetzung.

- **Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-L1:** Alter Code: Canvas 634 (Soll 376), Seite 517 Pixel breit bei 400 Fensterbreite. Prototyp: Canvas 376,
  Seite 400 Pixel breit.
- **T-L2:** Am Prototyp ist der Stein an der neuen Lage dunkel (RGB 40/40/40), die Vorschau besteht weiter, und der
  Klick setzt auf 15/15. Am alten Code bestehen Vorschau und Klick ebenfalls. Der Klick wird über das Rechteck des
  Canvas umgerechnet und trifft auch auf dem zu großen Brett.
- **T-L3:** Prototyp: mit Fokus 634, nach dem Verlassen des Feldes 376. Alter Code: auch danach 634.
- **T-L4:** An beiden bleibt die Maserung dieselbe.
- **Eigener Fehler beim Prüfen:** Die erste Fassung von T-L2 las den Pixel an der Lage nach der **gespeicherten**
  Variable `layout`. Am alten Code ist das die alte Lage, und der Test bestand fälschlich. In §4 steht deshalb die
  Soll-Lage nach `computeLayout()`. Nachgeprüft: Dort liegt am alten Code Holz (RGB 200/160/90), der Test schlägt also
  fehl. Am Prototyp liegt dort der Stein (RGB 40/40/40).

## 7. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht.

## 8. Nachtrag: Umsetzung und Abnahme (16.11.2026)

Hazeberry: „#331 freigegeben, du kannst schon mal PRen.“ Die Umsetzung folgt §3 und §4 ohne Abweichung. Geändert sind
`index.html` (`brettGroesseAnpassen` und der `resize`-Handler nach `render`), `tests/browser-ui.js` (T-L1 bis T-L4) und
`tests/README.md`. Die Umsetzung setzt auf dem Stand mit der Korrektur K-1/K-2 auf (PR #332).

**Abnahme nach §5:**

1. **Prüfsummen:** Die Engine-Blöcke haben die Prüfsummen aus §1. Erfüllt.
2. **Tests:** Am alten Code (`index.html` SHA-256 `425a1c8f…`, Stand mit K-1/K-2) schlagen T-L1 bis T-L3 fehl:
   - T-L1: Breite 634 statt 376.
   - T-L2: Holz an der Soll-Lage (RGB 200/160/90) statt des Steins; Vorschau und Klick bestehen dort, wie in §4
     angekündigt.
   - T-L3: auch nach dem Verlassen des Feldes 634 statt 376.

   T-L4 besteht dort. Am neuen Code bestehen alle 22 Tests der Datei. Ausgaben:
   `docs/daten/bughunt-20261116/browser-ui-l-alt.txt` und `browser-ui-l-neu.txt`. Erfüllt.
3. **Testsuite:** `node tests/run.js` lokal mit Browser-Tests: siehe Nachtrag im PR. Die CI steht im PR.
4. **Prüfskript:** `pruefung.js` am neuen Code ergibt genau das Soll: L-1 „nicht reproduziert“; D-1, D-2, W-1, K-1 und K-2
   weiter „nicht reproduziert“; R-1 und B-1 bis B-3 „reproduziert“ (4 von 13).
   Daten: `docs/daten/bughunt-20261116/nach-l1.json`, Konsole `nach-l1-konsole.txt`. Erfüllt.

Neue `index.html`: SHA-256 `7466f87602c1af7446fb4bbe11c23af142f18d402cd770efc884b70544cf2621`.

**Grenzen:** Nur Chromium 153 headless am Desktop, Fenstergröße per Playwright geändert. Drehen auf einem echten
Handy und das Verhalten von Bildschirmtastaturen sind nicht geprüft.
