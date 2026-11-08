# Bughunt-Verifikation: unabhängige Wiederholung desselben Testskripts

Nachtrag, 08.11.2026 (Lauf am 07.11.2026, 22:22 UTC laut `bericht.json`). **Status: nur Dokumentation und Rohdaten.** Keine Spielkorrektur,
keine Änderung an `index.html` oder `gtp-ki.js`, kein Go für Korrekturen oder Messläufe. Die Passregel bleibt ausgeschaltet.

## 1. Einordnung

- Das ist die **unabhängige Wiederholung desselben Testskripts**, nicht ein neuer Testentwurf. Wiederholt wurden `auswertung/bughunt-20261107/reproduce.cjs` (neun
  Prüfungen unter Node) und `auswertung/bughunt-20261107/browser.cjs` (sieben Browserfälle) aus **Hazeberry/codex, PR #20**, Branch `claude/bughunt-verifikation`,
  Kopf `cdf545530c0fb0bd90462a5e0154e5c16240cca0`. **Unabhängig ist die Ausführung** (anderer Ausführer, andere Umgebung), **nicht das Testdesign.** Das Design wurde
  zusätzlich lesend gegen den Code geprüft (§5 und §7).
- Ausführer: Claude, in einer Cloud-Sitzung, lokal und nur kurze Funktionstests. Kein GNU Go, keine Partien, kein Netzwerk für Seitenaufrufe.
- Die Befunde selbst stammen aus den Reviews, die im `HANDOFF.md` von `Hazeberry/codex` dokumentiert sind; die Autorenzuordnung des GTP-Reviews ist dort offen.
  Der zugehörige Bericht zu PR #20 entsteht in `Hazeberry/codex`; dieses Dokument ist die Ablage der Wiederholung in **diesem** Repo.

## 2. Quelle

- **Quellencommit der getesteten Dateien:** `17117ae822dfa0d836964311cf2f6aa41d489f2e` in `Hazeberry/codex`. `index.html` und `gtp-ki.js` sind dort, an `7e300914` und am Branch-Kopf
  `cdf5455` byteidentisch (selbst berechnet).
- SHA-256 der **getesteten** Dateien (Hazeberry/codex): `index.html` `a14ac4d4058072ec552ca524832095f628412224b96ff7159806e35499fcb4b6`, `gtp-ki.js`
  `ab118527fe072a9e0d77a83b6a22c3c689110881dcf649bdc352b810b4b0fb94`. Beide Dateien enden mit genau einem LF.
- **Hash-Korrektur nachgerechnet:** Die ursprünglich im Doc genannten Hashes (`7bf31582…`, `51a82869…`) sind genau der SHA-256 von „Datei plus ein zusätzliches LF“. Die Erklärung
  im Bericht trifft zu; die korrigierten Hashes oben stimmen.
- **Verhältnis zu diesem Repo** (`main` bei `f360445`, reiner Textvergleich, **kein Testlauf an unserer `index.html`**):
  - `gtp-ki.js` ist **byteidentisch** (gleicher SHA-256).
  - `index.html` (hier `d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b`) unterscheidet sich in 150 Zeilen. Die Zeilen 1 bis 4525 und 5681 bis zum Ende (2354 Zeilen)
    sind byteidentisch. Die Unterschiede liegen nur im Engine-Bereich (hier Zeilen 4526 bis 5680: `_mctsWurzelKinder`, `mctsPUCT`, Gebietsprüfung, `getAIMove`) und in einer Zeile
    in `saveUndoState`/`undo` (`aiDiagLength`, nicht mit dem Training verbunden).
  - **Alle neun betroffenen Stellen liegen in identischen Bereichen.** Sie stehen hier nur um 108 bis 126 Zeilen früher (Zuordnung in §5). Bei GTP-2 gilt das für die Signatur von `getAIMove`
    und für `passNachGegnerpassPruefung`; der spätere Teil von `getAIMove` (Prior-Kontext) unterscheidet sich, berührt die Aussage aber nicht.

## 3. Umgebung der Wiederholung

| | Wiederholung (Claude) | Bericht aus PR #20 (nicht selbst gesehen) |
|---|---|---|
| Node | v22.23.4 | v24.22.1 (Node-Prüfungen) |
| Playwright | 1.63.0 | 1.56.1 |
| Chromium | 153.0.8010.12, headless | 154 |
| Quelle | `git archive` des Branch-Kopfs `cdf5455`, Hashes vor dem Lauf geprüft | Branch, Commit `7e300914` |
| Dauer Browserlauf | 6,7 s (`browser-zeit.txt`) | nicht angegeben |
| Seitenaufrufe | nur `127.0.0.1` (Skript blockiert alle anderen Hosts) | wie Skript |

`browser.cjs` und `tests/browser-rahmen.js` sind an `7e300914` und am Branch-Kopf byteidentisch; das Skript, das Codex ausgeführt haben soll, ist also das heutige.

## 4. Ergebnis der Wiederholung

**A, `reproduce.cjs`:** Exit 0, alle neun Prüfungen „reproduziert“ (GTP-1, GTP-2, GTP-3, UI-1, TRAIN-1, UI-2, UI-3, TRAIN-2, NET-1). Status und Evidenz sind mit der `results.json` aus PR #20
identisch, bis auf die zufälligen Startgewichte des PolicyNets (`w0`, `w`; bei TRAIN-1 gilt in beiden Läufen `w = w0 + 1`).

**B, `browser.cjs`:** Selbsttest Exit 0 (neun Prüfungen der Statuslogik). Voller Lauf Exit 1: **alle sieben Fälle „reproduziert“**, keine Seitenfehler, keine Screenshot-Fehler.

| Fall | Beobachtung |
|---|---|
| UI-1 | KI per Button abgeschaltet, Antwort danach freigegeben: Zugzähler 0 → 1, Stein gesetzt, `aiEnabled` bleibt false |
| TRAIN-1.pass und .resign | Spiele 0 → 1, Undo öffnet die Partie, `_trained` bleibt true, Spielzahl, Gewichte und gespeicherter Stand unverändert |
| UI-2 | Anzeige bleibt „Schwarz +353.5“, erwartet und im SGF „Weiß +5.5“ (Fläche 361 zu 0, Territory 2 zu 0) |
| UI-3 | 8 Markierungen vor dem Pass. Danach Vorschauzustand `null` und Panel aus, aber das Canvas-Bild gleicht dem Cache und unterscheidet sich vom Neuaufbau (verschiedene Hashes) |
| TRAIN-2 | Weiß-Beispiel und Schwarz-Beispiel bekommen beide `advantage` +1 |
| NET-1 | `SecurityError` bei `removeItem`, Reset bricht ab, Gewichte und Zähler unverändert (17 Spiele) |

Die Bilder `UI-3.nach-pass.png` und `UI-3.nach-neuzeichnen.png` wurden angesehen: Nach dem Pass sind acht orange Kreuze in der oberen rechten Ecke zu sehen, nach dem Neuzeichnen keines.
Die übrigen Screenshots wurden nicht gesichtet.

## 5. Einzelbefunde

Zeilen: erst `Hazeberry/codex` am Quellencommit, dann dieses Repo (`main`, `f360445`). „Gelesen“ heißt von Claude im Code gelesen, nicht ausgeführt.

- **GTP-1** (`gtp-ki.js`, `setze` Z. 84, `play` Z. 112, in beiden gleich). *Gelesen:* `setze` prüft nur, ob der Punkt besetzt ist. Das berechnete `ko` und die Superko-Historie `hist` werden bei `play`
  nie abgefragt. *Wiederholung (A):* echter Adapterprozess; `play B A1` nach W A2, W B1 liefert `=` und A1 steht in `list_stones B`; unmittelbare Ko-Rücknahme und Wiederholung nach zwei Pässen werden
  akzeptiert. *Offen:* keine Aussage, dass eine Messung davon betroffen war.
- **GTP-2** (`gtp-ki.js` Z. 115 ff.; `getAIMove` Z. 5336 / 5228, `passNachGegnerpassPruefung` Z. 5319 / 5211). *Gelesen:* `genmove` ruft `getAIMove` mit 9 Argumenten auf, `extra` fehlt; ohne `extra.gegnerPasste`
  gibt die Prüfung sofort `null` zurück. *Wiederholung (A):* In einer temporären HTML-Kopie ersetzt eine Protokoll-Attrappe `getAIMove`: `argc` 9, `extra` null. Das belegt nur die Argumentübergabe, keine Suche.
  *Offen:* keine konkrete Auslösestellung durch den echten Suchpfad.
- **GTP-3** (`antworte` Z. 97). *Gelesen:* Das erste Wort gilt als Befehl; `17` fällt in `default`, die Fehlerantwort trägt keine Kennung. *Wiederholung (A):* `17 protocol_version` und `18 unknown`
  liefern `? unbekannter Befehl`; unnummeriert liefert `protocol_version` `= 2`. *Offen:* nur Clients mit Befehlsnummern betroffen.
- **UI-1** (KI-Toggle Z. 6776 / 6650; `applyAIResult` Z. 5996 / 5870; Zustellwege `attachWorkerHandlers` Z. 6198 / 6073, `fallbackToMainThread` Z. 6158 / 6032, Zeitgeber-Pfad in `triggerAIMove`).
  *Gelesen:* Der Toggle erhöht weder `aiRequestId`, noch setzt er `aiThinking` zurück; `applyAIResult` prüft `reqId` und Spieler, nie `aiEnabled`; auf allen drei Zustellwegen fehlt die Prüfung. Farb- und Stufenwechsel erhöhen
  dagegen die ID. *Wiederholung:* (A) Originalhandler mit eingespeister Antwort; (B) **echter Browser-Worker mit Stub-Skript** (`window.Worker` überschrieben, fester Zug auf 3/3 nach Freigabe), App-Handler original.
  *Offen:* echte Worker-Race mit der echten Suche; Verhalten bei `terminate`.
- **TRAIN-1** (`undo` Z. 5795 / 5670; Training in `showFinalScore` und im Aufgabepfad von `applyAIResult`; `resetGame`, `PolicyNet.reset`). *Gelesen:* `undo` stellt Brett, Zähler und Spielende wieder her und
  kürzt den Puffer, setzt aber weder `_trained` noch die Gewichte zurück; `_trained` wird nur in `resetGame`, `reset()` und im Konstruktor zurückgesetzt. *Wiederholung:* (A) Original mit Zählattrappe für `trainGame`;
  (B) echtes `trainGame` mit einem Beispiel, beide Endpfade (Pass und Aufgabe), verglichen werden Spielzahl, Gewichte, `_trained` und gespeicherter Stand. *Offen:* die Strategie für Undo (nicht Teil dieser Prüfung).
- **UI-2** (Wertungs-Handler Z. 6796 / 6670; `showFinalScore`, `buildSGF`). *Gelesen:* Der Handler setzt `scoringMode` und ruft nur `vorschauSchliessen()`, nie `showFinalScore`; `buildSGF` zählt dagegen nach `scoringMode` neu.
  *Wiederholung:* (A) DOM-Attrappe; (B) echte Seite mit synthetischer Stellung (359 Schwarz-Steine, zwei Augen, zwei Pässe; unrealistisch, aber für die Anzeige-Invariante geeignet; 361 − 7,5 = 353,5 und 2 − 7,5 = −5,5 stimmen).
  *Offen:* Verhalten bei echten Partien.
- **UI-3** (`pass` Z. 5861 / 5735; `vorschauAbgleichen` Z. 6622 / 6496; `drawStateToCache` Z. 6580 / 6454; Pass-Handler Z. 6802 / 6676). *Gelesen:* `pass()` ruft `drawStateToCache()` nicht auf (`placeStone` schon);
  `vorschauAbgleichen()` verwirft nur `state.vorschau` und blendet das Panel aus, die Markierungen bleiben im Cache. `vorschauSchliessen` würde neu zeichnen, wird hier nicht aufgerufen. *Wiederholung:* (A) nur Kontrollfluss mit
  Cache-Attrappe; (B) echter Canvas-Pixelvergleich mit der Stellung `tests/stellungen/zaehlung-358.sgf`. *Offen:* nur der Ablauf „erster Pass“; ob ein zweiter Pass (Spielende) neu zeichnet, wurde nicht gelesen.
- **TRAIN-2** (Farb-Handler Z. 6790 / 6664; `applyAIResult`-Puffer; `showFinalScore`; `trainGame`). *Gelesen:* Der Farbwechsel leert den Puffer nicht; Puffereinträge haben nur `inp`, `probs`, `hidden`, `moveIdx` (keine Farbe); der Reward
  kommt aus `state.aiColor` am Spielende, alle Einträge bekommen denselben `advantage`. *Wiederholung:* (A) `_backward` protokolliert nur; (B) Wrapper protokolliert, das echte Training läuft. Beide Beispiele bekommen `advantage` +1
  (die Höhe hängt von der bisherigen Siegquote ab; der Fehler, dass beide Farben dasselbe Signal bekommen, nicht). *Offen:* Verwerfen des Puffers beim Farbwechsel wäre eine mögliche korrekte Lösung.
- **NET-1** (`PolicyNet.reset` Z. 7356 / 7230; Aufrufer `trainGame` im Divergenzpfad und der Dashboard-Knopf). *Gelesen:* `localStorage.removeItem('go_pnet')` ist die erste Anweisung und ungeschützt; `save()` ist dagegen
  mit `try/catch` geschützt. *Wiederholung:* (A) Fehler im `localStorage`-Stub; (B) `Storage.prototype.removeItem` nach Seitenstart überschrieben, danach das originale `reset()`. *Offen:* reale gesperrte Browser.

## 6. Einordnung zur Spielstärke (gelesen, kein Beweis)

- `netMaxBlend` steht im Default auf 0 (`index.html` Z. 1861, in beiden Repos gleich). `blendWeight` (Z. 6943 / 6817) ist `min(netMaxBlend, …)`, also 0. Das lokale PolicyNet geht nur über den Blend (`if (_bw > 0)`,
  Z. 5506 / 5382) in die Zugwahl ein. Weitere Wege von `policyNet` zur Zugwahl wurden beim Lesen aller `policyNet.`-Verwendungen nicht gefunden (Vorwärtsrechnung, Aufzeichnen der Priors, Training, Puffer, Anzeige).
  **TRAIN-1, TRAIN-2 und NET-1 sind damit keine nachgewiesene Erklärung für schlechtere Zugwahl.**
- Das **Endspiel-Netz** ist davon getrennt: eingebettete Konstante `ENDSPIEL_NETZ` (Z. 5145 / 5037), Parameter `endspielNetz` 0,8, `endspielNetzTop` 4, `endspielNetzAb` 80 (Z. 2125 bis 2127, gleich), Aufruf über
  `endspielNetzWurzel` (Z. 5277 / 5169). Es hängt weder von `policyNet` noch von `netMaxBlend` ab. Gelesen: Die Gewichte werden einmal aus der Konstante dekodiert (`_enNetz`); zur Laufzeit wird nur der letzte eigene Zug je Farbe
  gemerkt (`_enEigen`, Eingabemerkmal), Trainingscode für dieses Netz fand ich in `index.html` nicht. Die drei Trainings- und Reset-Befunde betreffen nur das PolicyNet.
- **Einschränkung:** Dashboard-Parameter werden gespeichert (Eingabefeld für `netMaxBlend`). Ob im echten Browser ein Wert größer 0 steht, wurde nicht gelesen. Dann würden die Trainingsfehler wirken.
- Die Befunde sind Bedien- und Trainingsfehler und belegen weder eine allgemeine Regression noch die Ursache der negativen Q-Werte im Aufgabefall.

## 7. Zusätzliche Beobachtungen aus der Gegenlesung

- **Exit 1 allein belegt nicht „alle sieben reproduziert“.** `exitCode` in `browser.cjs` liefert 1, sobald alle Fälle prüfbar sind und mindestens einer reproduziert wurde. Die Einzelstatus stehen in `bericht.json`. In dieser Wiederholung sind alle sieben „reproduziert“.
- In `reproduce.cjs` heißt „reproduziert“, dass die Assertions des erwarteten Defekts erfüllt waren; sonst steht dort „Prüfung fehlgeschlagen“.
- **TRAIN-1, Folge aus dem Code:** `trainGame` leert den Puffer und `_trained` bleibt nach Undo true; damit wird das nach Undo anders endende Spiel gar nicht mehr trainiert. Das ist mehr als „altes Ergebnis bleibt“. *Gelesen, nicht eigens reproduziert.*
- **NET-1, abgeleitete Folge:** `trainGame` ruft `reset()` im Divergenzpfad auf. Eine Ausnahme dort würde in `showFinalScore` und im Aufgabepfad von `applyAIResult` (nach `gameOver = true`, vor `resolveLifeAndDeath`) weiterlaufen.
  *Statisch abgeleitet, weder reproduziert noch geprüft.*
- Die Zeilenangaben im Bericht aus PR #20 stimmen für `index.html` exakt; bei `gtp-ki.js` sind sie um 1 bis 2 Zeilen verschoben (`setze` steht bei 84, nicht 82).

## 8. Grenzen

- **Dasselbe Skript:** Die Wiederholung zeigt, dass die geskripteten Abläufe reproduzierbar sind. Das Testdesign wurde nicht neu entworfen, nur gegengelesen.
- **Attrappen und synthetische Daten:** DOM-, Cache- und Trainingsattrappen in (A); in (B) ein Worker mit Stub-Skript (keine Suche), synthetische Stellungen, ein kontrollierter Schwarzsieg bei TRAIN-2, ein überschriebenes `removeItem` bei NET-1.
- **Nur eine Umgebung:** Chromium 153 mit Playwright 1.63.0. Firefox, Handy und ein echtes Nutzerprofil sind nicht geprüft.
- **Unsere `index.html` wurde nicht ausgeführt.** Die Übertragbarkeit beruht auf dem Textvergleich in §2. Ein Lauf von `browser.cjs --html index.html` gegen unsere Datei wäre ein eigener, kurzer Schritt.
- Der Ausführungsbericht aus PR #20 und seine Rohartefakte wurden nicht gesehen; die Wiederholung bestätigt seine Aussagen inhaltlich, belegt aber nicht, dass er so gelaufen ist.
- Gespeicherte Parameter und Gewichte im echten Browser wurden nicht gelesen. Von den zehn Screenshots wurden nur die beiden UI-3-Bilder angesehen.
- `bericht.json` enthält als `quelle.datei` den lokalen Pfad der Arbeitskopie im Arbeitsbereich der Sitzung; die Rohdatei ist unverändert abgelegt.
- Keine Spielstärkemessung. Korrekturen brauchen eine eigene Vorabfestlegung und ein Go.

## 9. Bezug zu den Passregel-Messungen (gelesen)

Die Passregel-Auslösung wird direkt über `passNachGegnerpassPruefung` geprüft, im Arm „weiter“ ist die Regel aus, und in der Fortsetzung startet `auswertung/endspiel/passregel-fortsetzung.js` (Zeile 362)
`gtp-ki.js` nur als Gegner der Gruppe „alte PWA“. **GTP-2 betrifft die Passregel-Messungen damit nicht.**

Offen: `gtp-ki.js` wird in diesem Repo auch von `gnugo-duell.js` als Gegner-KI gestartet (`--gegner-html`, Workflow `pwa-vergleich.yml`); die Archivpartien der Gruppe „alte PWA“ stammen aus einem solchen Lauf.
**Ob GTP-1 und GTP-3 diese Läufe oder die Passregel-Messungen berühren, wurde nicht geprüft.** Eine Aussage dazu setzt voraus, dass man weiß, welche Befehle und Züge der Adapter in diesen Läufen tatsächlich bekam.

## 10. Dateien

Abgelegt unter `docs/daten/bughunt-wiederholung/lauf1/`, **unverändert** übernommen (Kopien vor dem Ablegen per Vergleich geprüft). Prüfsummen auch in `SHA256SUMS` dort.

| Datei | SHA-256 |
|---|---|
| `browser-konsole.txt` | `f02e7e785ffdcf0283c258d1f5c6630d7628536ab95b5d31b74bc19e7a91d562` |
| `browser-zeit.txt` | `39a4c85adcc7fa9293e90dc89ddad7aaceea807c3eafa545a224909f1a903893` |
| `browser/NET-1.png` | `7a4cd55b0b17acac9196ff883f7f5259a0aca5e5ec9ecbbdbc80e97ea2b5fbf0` |
| `browser/TRAIN-1.pass.png` | `39a6fc534415dc715a02a7ee7a2de31f2e4616e367856d9be72a03cc08a7fa68` |
| `browser/TRAIN-1.resign.png` | `585f8adfa2b38d7e09a27080da51d0d803755a66c468aa42e7be9845af68cfa4` |
| `browser/TRAIN-2.png` | `3a7a093ab97877ba419ef01e29e8da307766f5aea281e8b7002051cc0b15b93e` |
| `browser/UI-1.png` | `1e11c04ad4accd0a07b051edaadc04b94687110534c99125566fdf55ab94790d` |
| `browser/UI-2.png` | `20d8628be6e9ad474a210bcc079a395f4d0c0057be00a26454c164787025edc4` |
| `browser/UI-3.nach-neuzeichnen.png` | `c65d5858790161d31994833cba52989635ff97901af4734e2a48367eab23723d` |
| `browser/UI-3.nach-pass.png` | `2502ae9aa0e84a8aff20689853fbe9b8788e55728c48dbd74bd5170b7affb194` |
| `browser/UI-3.png` | `960b705de38a87733423508d69c6411f99c8b5c4ebbe28b13c801f06f09f353b` |
| `browser/UI-3.vorschau.png` | `ee84e122a5ae324c149d6ca2a292d066718edeebf72ce455cdfd83403f73e455` |
| `browser/bericht.json` | `3c82b30ad5405700ef5c5c3a339d6eb0f414c1df0946ce93508871627a64aa9a` |
| `browser/bericht.md` | `bdf10c0cccacb026bccab38fddb61456817345daf6af8351299e335f9510bfd3` |
| `reproduce-ergebnis.json` | `b8ca89215ab00a44eddb28c9ed39895476709ecd00276c32a414f5139defa6e4` |
| `reproduce-stderr.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## 11. Freigaben

Dieses Doc enthält Vorgaben für die KI-Assistenten; Hazeberry liest es vor dem Merge. Es erteilt kein Go für Spielkorrekturen, Messläufe, Engine-Vergleiche oder Merges.

## 12. Nachtrag (08.11.2026)

`browser.cjs --html index.html` ist gegen die `index.html` **dieses** Repos gelaufen (alle sieben Fälle reproduziert, nur Chromium 153; Bericht und Vergleich: `docs/zaehlung-mechanismus.md` §4,
Ausgaben `docs/daten/zaehlung-mechanismus/browser/`). Der Hinweis in §8 („unsere `index.html` wurde nicht ausgeführt“) gilt damit für `browser.cjs` nicht mehr; `reproduce.cjs` wurde nicht gegen unsere Dateien ausgeführt.
Zu §9: GTP-3 berührt die PWA-Läufe nach dem Gelesenen nicht; bei GTP-1 sind die vom Adapter erzeugten Züge ungeprüft (`docs/zaehlung-mechanismus.md` §3). Kein Go für Korrekturen.
