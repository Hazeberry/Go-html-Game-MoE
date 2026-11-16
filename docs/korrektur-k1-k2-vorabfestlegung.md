# Korrektur K-1 und K-2: Vorabfestlegung

**Stand: 16.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befunde aus `docs/bughunt-20261116.md`
(K-1, K-2). Go von Hazeberry am 16.11.2026: „Go für K-1 und K-2, Vorabfestlegung schreiben“.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der Korrekturen D-1/W-1 und D-2.

## 1. Grundsatz: Die Engine bleibt unberührt

Betroffen sind nur die Kopierknöpfe im Hauptskript (📋, 🐞) und die Knöpfe „Speichern“ und „Export“ im Dashboard. Die
Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch**; ihre Prüfsummen sind dieselben wie in
`docs/korrektur-d1-w1-vorabfestlegung.md` §1 (`54dfef2d…`, `f847c124…`, `56a5d6c0…`). `PARAMS` wird nicht berührt.

Kein Schalter, kein Messlauf: Die Engine bekommt in keinem Fall andere Werte. Was sich ändert, ist allein, ob kopiert
wird und welche Rückmeldung welcher Knopf zeigt.

## 2. Befunde

Zeilen am Stand `72c05cb` (`main`).

**K-1, Kopieren ohne Zwischenablage-Schnittstelle** (`copyWithFeedback` Z. 6739, `dashExport` Z. 8066):
- **Kein Rückfall:** Der Rückfall über ein Textfeld mit `execCommand('copy')` steht im `.catch` eines Promise.
  Fehlt `navigator.clipboard`, wirft schon der Aufruf davor, und der Rückfall wird nie erreicht. 📋 und 🐞 erzeugen
  einen Seitenfehler und kopieren nichts.
- **Export ohne Rückfall:** `dashExport` hat gar keinen Rückfall.
- **Wann die Schnittstelle fehlt:** `navigator.clipboard` gibt es laut Spezifikation nur in sicheren Kontexten, also
  nicht beim Aufruf über `http://` im LAN. Das ist nicht an einem echten LAN-Aufruf geprüft.
- **Falsches „✓“ (bei der Prüfung des Entwurfs gefunden):** `copyWithFeedback` meldet nach dem Rückfall immer „✓“,
  auch wenn `execCommand` scheitert. Scheitert das Kopieren ganz, zeigen 📋 und 🐞 „✓“, und der Speichern-Knopf zeigt
  „✓ Kopiert“.

**K-2, Rückmeldungen der Dashboard-Knöpfe** (`dashSave` Z. 8007, `dashExport` Z. 8066):
- **Falscher Knopf:** `dashExport` schreibt „✓ Kopiert“ auf den **ersten** Knopf der Klasse `pd-export-btn`, das ist
  „💾 Speichern“. Die Meldung erscheint auch, wenn das Kopieren scheitert.
- **Hängende Beschriftung:** Beide Funktionen merken sich die gerade angezeigte Beschriftung als „Original“ und stellen
  sie nach 1,5 s wieder her. Zeigt der Knopf in diesem Moment noch eine Rückmeldung, bleibt sie dauerhaft stehen.
  Bei der Prüfung des Entwurfs gefunden: Das passiert nicht nur bei Speichern und Export kurz hintereinander,
  sondern schon bei **zweimal Speichern** innerhalb von 1,5 s. Der Knopf heißt danach „✓ Gespeichert“.

## 3. Änderung

1. **Eine Kopierfunktion für alle drei Knöpfe** (Hauptskript): `inZwischenablage(text)` gibt ein Promise auf
   `true` oder `false`.
   - **Zuerst die Schnittstelle:** `navigator.clipboard.writeText` wird **innerhalb** des Promise aufgerufen
     (`Promise.resolve().then(...)`). Fehlt `navigator.clipboard` oder wirft der Aufruf, landet das im Rückfall statt
     als Seitenfehler.
   - **Rückfall:** Textfeld, `select()`, `execCommand('copy')`. Erfolg heißt Rückgabe `true`; ein Wurf oder `false`
     heißt Misserfolg. Das Textfeld wird in jedem Fall wieder entfernt.
2. **Eine Rückmeldung je Knopf:** `zeigeRueckmeldung(knopf, ok, okText, ruheText, fehlerText)`.
   - Sie zeigt „okText“ (grün) oder „fehlerText“ (rot).
   - Nach 1,5 s kehrt sie zur **festen** Ruhebeschriftung zurück, nicht zur gerade angezeigten.
   - Eine neue Rückmeldung auf demselben Knopf hebt den alten Zeitgeber auf.
3. **Die drei Knöpfe:**
   - **📋 und 🐞:** `copyWithFeedback` nutzt beide Funktionen: „✓“ bei Erfolg, „✗“ bei Misserfolg; die Ruhebeschriftung
     bleibt „📋“ bzw. „🐞“.
   - **„Speichern“:** Der Knopf bekommt die id `pd-btn-speichern`. `dashSave` meldet über `zeigeRueckmeldung` auf
     diesem Knopf: „✓ Gespeichert“ oder „✗ Fehler“, Ruhe „💾 Speichern“.
   - **„Export“:** Der Knopf bekommt die id `pd-btn-export`. `dashExport` kopiert über `inZwischenablage` und meldet
     auf **diesem** Knopf: „✓ Kopiert“ oder „✗ Fehler“, Ruhe „⬇ Export“.

**Unverändert:**
- **Inhalte:** Die kopierten Texte (Zugprotokoll, Fehlerbericht, Parameter-Export) bleiben gleich.
- **Mit Schnittstelle:** Ist die Zwischenablage-Schnittstelle da und gelingt das Schreiben, verläuft alles wie heute;
  der Rückfall wird nicht benutzt.
- **SGF-Download:** Er hat einen eigenen Rückfall und bleibt, wie er ist.
- **Inline-Handler:** Die bestehenden `onclick` im Dashboard bleiben. Es kommt keine neue Oberfläche hinzu, nur zwei
  ids an vorhandenen Knöpfen.

**Erwogen und verworfen:**
- *Nur `navigator.clipboard?.writeText` prüfen.* Das behebt den Seitenfehler, aber nicht die falsche Erfolgsmeldung
  und nicht den fehlenden Rückfall beim Export.
- *Rückmeldung bei Misserfolg weglassen.* Dann sähe man nicht, dass nichts kopiert wurde. Gerade beim Fehlerbericht
  ist das wichtig.

**Nicht Teil der Korrektur:** L-1, R-1, B-1 bis B-3; ein echter Test über `http://` im LAN oder auf dem Handy.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`. Die Zeile in `tests/README.md` wird ergänzt. Für die Fälle ohne Schnittstelle
oder mit scheiterndem Kopieren dient eine Attrappe vor dem Laden der Seite:
- `navigator.clipboard` wird entfernt bzw. `writeText` lehnt ab;
- `document.execCommand` gibt einen festen Wert zurück;
- ein Wrapper um `HTMLTextAreaElement.prototype.select` hält den Text fest, der kopiert werden sollte.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-K1 | Ohne `navigator.clipboard`, `execCommand` gelingt: 📋 (mit einer Zeile im Protokoll), 🐞 und „Export“ kopieren über den Rückfall den richtigen Text (Protokollzeile, JSON mit `"meta"`, `globalThis.PARAMS`). Die Knöpfe zeigen „✓“, „✓“ und „✓ Kopiert“ auf dem Export-Knopf; keine Seitenfehler | scheitert: Seitenfehler, nichts kopiert |
| T-K2 | `writeText` lehnt ab und `execCommand` gibt `false`: 📋 und 🐞 zeigen „✗“, der Export-Knopf „✗ Fehler“, der Speichern-Knopf bleibt „💾 Speichern“ | scheitert: „✓“ und „✓ Kopiert“ auf dem Speichern-Knopf |
| T-K3 | Mit Schnittstelle: Nach „Export“ trägt nur der Export-Knopf „✓ Kopiert“. Nach Speichern und Export kurz hintereinander und nach zweimal Speichern innerhalb von 1,5 s zeigen beide Knöpfe nach 1,8 s ihre Ruhebeschriftung | scheitert: Meldung auf dem Speichern-Knopf, „✓ Gespeichert“ bleibt stehen |
| T-K4 | Mit Schnittstelle: 📋 schreibt das Protokoll in die Zwischenablage (zurückgelesen über `readText`), `execCommand` wird nicht aufgerufen, der Knopf zeigt „✓“ | besteht (Kontrolle des normalen Wegs) |

T-K1 bis T-K3 müssen am alten Code fehlschlagen und am neuen bestehen. T-K4 besteht an beiden. T-K3 wartet zweimal
rund 2 s; die Datei braucht dadurch einige Sekunden länger.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1.
2. T-K1 bis T-K3 schlagen am alten Code fehl und bestehen am neuen; T-K4 besteht an beiden.
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: K-1 und K-2 „nicht reproduziert“. Alle übrigen Fälle
   unverändert gegenüber dem Stand, auf dem die Umsetzung aufsetzt: D-1, D-2 (sofern dessen Umsetzung schon in `main`
   ist) und W-1 „nicht reproduziert“; L-1, R-1 und B-1 bis B-3 „reproduziert“. Die Ausgabe wird als
   `docs/daten/bughunt-20261116/nach-k1-k2.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (16.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `72c05cb`) außerhalb des Repos eingesetzt und lokal
geprüft (Chromium 153 headless). Der Prototyp ist nicht die Umsetzung.

- **Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-K1:** Am alten Code erzeugen 📋 und 🐞 je einen Seitenfehler („Cannot read properties of undefined (reading
  'writeText')“), und es wird nichts kopiert. Am Prototyp wird dreimal über den Rückfall kopiert: Fehlerbericht und
  Export mit dem richtigen Anfang, ohne Seitenfehler, Rückmeldung auf den richtigen Knöpfen. Das Protokoll war in
  diesem Lauf leer; der Test in der Umsetzung schreibt vorher eine Zeile hinein.
- **T-K2:** Alter Code: 📋 „✓“, 🐞 „✓“, Speichern-Knopf „✓ Kopiert“. Prototyp: „✗“, „✗“, Export-Knopf „✗ Fehler“,
  Speichern-Knopf unverändert.
- **T-K3:** Alter Code: „✓ Kopiert“ auf dem Speichern-Knopf; nach Speichern und Export sowie nach zweimal Speichern
  bleibt „✓ Gespeichert“ stehen. Prototyp: beide Knöpfe danach in Ruhebeschriftung.
- **T-K4:** An beiden steht der Protokolltext in der Zwischenablage, `execCommand` wurde nicht aufgerufen, der Knopf
  zeigt „✓“.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht.

## 8. Nachtrag: Umsetzung und Abnahme (16.11.2026)

Hazeberry: „#329 freigegeben, du kannst schon mal PRen.“ Die Umsetzung folgt §3 und §4 ohne Abweichung. Geändert sind:
- `index.html`: `inZwischenablage`, `zeigeRueckmeldung`, `copyWithFeedback`, `dashSave` und `dashExport`, dazu die ids
  `pd-btn-speichern` und `pd-btn-export`;
- `tests/browser-ui.js`: T-K1 bis T-K4. Die Hilfsfunktion `seite` nimmt dafür optional Kontext-Optionen
  (Berechtigungen für die Zwischenablage); die bestehenden Aufrufe bleiben unverändert;
- `tests/README.md`.

Die Umsetzung setzt auf dem Stand mit der Korrektur D-2 auf (PR #330).

**Abnahme nach §5:**

1. **Prüfsummen:** Die Engine-Blöcke haben die Prüfsummen aus §1. Erfüllt.
2. **Tests:** Am alten Code (`index.html` SHA-256 `fa58790f…`, Stand mit D-2) schlagen T-K1 bis T-K3 fehl:
   - T-K1: „Export wirft nicht: … Cannot read properties of undefined (reading 'writeText')“.
   - T-K2: „✓ ✓ | ✓ Kopiert | ⬇ Export“ statt „✗ ✗ | 💾 Speichern | ✗ Fehler“.
   - T-K3: „✓ Kopiert | ⬇ Export“ statt „💾 Speichern | ✓ Kopiert“.

   T-K4 besteht dort. Am neuen Code bestehen alle 18 Tests der Datei. Ausgaben:
   `docs/daten/bughunt-20261116/browser-ui-k-alt.txt` und `browser-ui-k-neu.txt`. Erfüllt.
3. **Testsuite:** `node tests/run.js` lokal mit Browser-Tests: siehe Nachtrag im PR. Die CI steht im PR.
4. **Prüfskript:** `pruefung.js` am neuen Code ergibt genau das Soll: K-1 und K-2 „nicht reproduziert“; D-1, D-2 und W-1
   weiter „nicht reproduziert“; L-1, R-1 und B-1 bis B-3 „reproduziert“ (5 von 13).
   Daten: `docs/daten/bughunt-20261116/nach-k1-k2.json`, Konsole `nach-k1-k2-konsole.txt`. Erfüllt.

Neue `index.html`: SHA-256 `425a1c8f7ac9ccff3ac8cc8fb2222db4ce50cd7a569238adf755918e69868821`.

**Grenzen:** Nur Chromium 153 headless. Die fehlende Schnittstelle ist im Test nachgestellt, nicht über einen echten
Aufruf per `http://` im LAN oder auf dem Handy geprüft.
