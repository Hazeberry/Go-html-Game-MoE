# Korrektur UI-2 und UI-3: Vorabfestlegung

**Stand: 22.11.2026. Status: umgesetzt (§9), Abnahme gültig.** Befunde aus `docs/bughunt-wiederholung.md` §5 (UI-2, UI-3),
am heutigen Code bestätigt. Go von Hazeberry am 22.11.2026: „UI-2, UI-3".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt

Beide Korrekturen betreffen nur das Hauptskript: den Handler der Wertungsknöpfe, `showFinalScore` und `pass`. Die
Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch** (Prüfsummen wie in
`docs/korrektur-d1-w1-vorabfestlegung.md` §1, am Stand `0d92bbd` gültig). `PARAMS_DEFAULT` bleibt gleich.

Kein Schalter, kein Messlauf. Die Zugwahl ändert sich nicht: UI-2 betrifft eine Anzeige nach Spielende, UI-3 das
Neuzeichnen des Bildes.

## 2. Befund UI-2: Die Endpunktzahl folgt dem Wertungswechsel nicht

Zeilen am Stand `0d92bbd` (`index.html` SHA-256 `334166b0…`).

Der Handler der Wertungsknöpfe (Z. 6778 bis 6782) setzt `state.scoringMode` und schließt die Zählvorschau. Er rechnet
die **angezeigte Endpunktzahl nicht neu**. `showFinalScore` (Z. 5861) hat sie beim Spielende in der damaligen Wertung
berechnet und in `final-label` und `final-score` geschrieben; dort bleibt sie stehen.

`buildSGF` rechnet dagegen bei jedem Aufruf neu (Z. 6372 bis 6377, nach `state.scoringMode`). Anzeige und SGF sagen
danach Verschiedenes.

**Gemessen** (§6), Stellung: alles Schwarz außer zwei Augen, also Fläche 361 zu 0 und Territory 2 zu 0:

| | Anzeige | SGF |
|---|---|---|
| nach zwei Pässen, Wertung „Area" | Schwarz +353.5 | `RE[B+353.5]` |
| nach dem Klick auf „Territory" | **Schwarz +353.5** (unverändert) | `RE[W+5.5]` |

**Die Aufgabe ist nicht betroffen.** `buildSGF` behandelt sie vorher und ohne Wertungsrechnung (Z. 6370 bis 6371:
`RE[X+R]`). Die Anzeige schreibt dort „Aufgabe" und „X gewinnt (Stand …)" (Z. 5955 bis 5957). Zwischen beiden
entsteht also kein Widerspruch über die Wertung.

## 3. Befund UI-3: Die Marken der Zählvorschau bleiben nach einem Pass stehen

`drawStateToCache` (Z. 6514) baut das Bild neu auf, ruft dabei selbst `vorschauAbgleichen()` (Z. 6537) und zeichnet
die Marken nur, wenn die Vorschau noch zur Stellung passt (Z. 6538). **Wer `drawStateToCache` aufruft, bekommt also
automatisch den richtigen Zustand.** Das tun `placeStone` (Z. 5746), `undo`, `resetGame`, `resolveLifeAndDeath`
(Z. 5814) und der Aufgabe-Pfad.

`pass` (Z. 5750 bis 5765) ruft es **nicht**. Der Pass-Knopf ruft `pass(); render(); updateUI(…)` (Z. 6784 bis 6788):
`render` malt den alten Cache, und `updateUI` ruft `vorschauAbgleichen` (Z. 6685), das `state.vorschau` verwirft und
das Panel ausblendet, aber nichts neu zeichnet. `vorschauSchliessen` (Z. 6571) würde neu zeichnen, wird hier aber
nicht aufgerufen.

Folge: Nach einem Pass ist die Vorschau beendet, ihre Marken stehen aber weiter auf dem Brett.

**Gemessen** (§6), Stellung mit drei toten weißen Steinen, also drei Marken: Das Bild nach dem Pass gleicht dem Bild
**mit** Vorschau und unterscheidet sich vom sauberen Neuaufbau.

**Eine Feststellung zum Prüfen dieses Befunds:** Die Marken zeigen **tote Steine** (`bewiesenTot`, `geschaetztTot`,
Z. 6593 ff.), nicht Gebiet. Eine Stellung ohne toten Klumpen malt keine Marke, und ein Test mit ein paar einzelnen
Steinen würde nichts zeigen — er wäre grün, ohne etwas zu prüfen. Der erste Entwurf dieses Prüfskripts hatte genau
diesen Fehler (§6).

## 4. Änderung

### UI-2: Anzeigeteil trennen, Handler rechnet neu

`showFinalScore` wird in zwei Teile zerlegt. Der Anzeigeteil (Z. 5862 bis 5879) wird `endstandAnzeigen()`; der
Trainingsteil (Z. 5883 bis 5888) bleibt in `showFinalScore`, das nun zuerst `endstandAnzeigen()` ruft:

```js
function endstandAnzeigen() {
  /* unveränderter Anzeigeteil: Wertung rechnen, final-label, final-score,
     territory-panel sichtbar machen */
}

/* Spielende: Anzeige und, einmal je Partie, das Training. Getrennt, damit ein
   Wertungswechsel nur die Anzeige neu rechnet (UI-2). */
function showFinalScore() {
  endstandAnzeigen();
  /* unveränderter Trainingsteil */
}
```

Der Handler der Wertungsknöpfe bekommt eine Zeile:

```js
  /* Nach Spielende die angezeigte Endpunktzahl in der neuen Wertung neu
     rechnen; buildSGF tut das ohnehin (UI-2). Bei Aufgabe nicht: dort steht
     im SGF RE[+R] ohne Wertungsrechnung. */
  if (state.gameOver && !state.resignedBy) endstandAnzeigen();
```

### UI-3: `pass` zeichnet den Cache neu

```js
  } else state.currentPlayer = opp;
  /* Wie placeStone: der Cache muss den neuen Zustand zeigen, sonst bleiben die
     Marken der Zählvorschau nach einem Pass sichtbar (UI-3). */
  drawStateToCache();
  updateUndoButton();
```

**Bewusst so:**
- **Bei zwei Pässen wird zweimal gezeichnet**, weil `resolveLifeAndDeath` (Z. 5814) es schon tut. `drawStateToCache`
  hängt allein am Zustand und ist damit idempotent: Das Bild ist dasselbe, es kostet einen Neuaufbau mehr. Dafür steht
  der Aufruf an derselben Stelle wie in `placeStone` und gilt für jeden Weg durch `pass`.
- **Der Aufgabe-Fall von UI-2 bleibt unberührt.** Der dort angezeigte „Stand" bleibt in der Wertung, mit der er
  gerechnet wurde. Ihn neu zu rechnen hieße, den Tanz aus Z. 5940 bis 5953 zu wiederholen: Brett sichern,
  `resolveLifeAndDeath`, rechnen, Brett zurücksetzen. Das wäre mehr Umbau für eine Zahl, die bei einer Aufgabe
  Beiwerk ist und im SGF nicht vorkommt.

**Erwogen und verworfen:**
- *Im Handler einfach `showFinalScore()` rufen.* Das ist die kürzere Fassung und war der erste Entwurf. Sie vermischt
  Anzeige und Training: Hat jemand zwischendurch „🗑 Netz zurücksetzen" gedrückt (Z. 7862, setzt `_trained` auf false,
  Z. 7369), so setzt ein Klick auf einen Wertungsknopf `_trained` wieder auf true. **Schaden entsteht dabei nicht** —
  `reset()` leert auch den Puffer, und `trainGame` kehrt bei leerem Puffer vor jeder Gewichtsänderung zurück
  (Z. 7218). Es bleibt eine Zustandsänderung ohne Anlass, und ein Anzeige-Klick soll den Trainingszustand nicht
  anfassen. *Die Behauptung, das sei gefährlich, wäre falsch; geprüft, siehe §6.*
- *Den Wertungswechsel nach Spielende sperren.* Das wäre konsistent, nimmt aber die Möglichkeit, dieselbe Partie in
  beiden Wertungen anzusehen. Funktionsverlust statt Korrektur.
- *Für UI-3 `vorschauSchliessen()` in `pass` rufen.* Das zeichnet auch neu, tut aber zusätzlich etwas, das nicht
  hierher gehört (es blendet das Panel aus, auch wenn die Vorschau noch zur Stellung passte — nach einem Pass passt
  sie ohnehin nie). `drawStateToCache` ist der Aufruf, den `placeStone` an derselben Stelle macht.

**Nicht Teil der Korrektur:** TRAIN-1, TRAIN-2, NET-1, GTP-1 bis GTP-3. Dass `vorschauAbgleichen` in
`drawStateToCache` steckt und damit eine Anzeigefunktion Zustand ändert — unschön, aber bestehender Aufbau.

## 5. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Benennung: `T-S…` für die
Wertung (UI-2), `T-V…` für die Vorschau (UI-3).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-S1 | Alles Schwarz außer zwei Augen, zwei Pässe, dann Klick auf „Territory": Anzeige „Weiß +5.5", Label „Territory (Komi 7.5)", SGF `RE[W+5.5]` | scheitert: Anzeige bleibt „Schwarz +353.5", SGF sagt `W+5.5` |
| T-S2 | Nach Aufgabe der KI ein Klick auf „Territory": Label bleibt „Aufgabe", die Anzeige nennt weiter den Gewinner, das SGF enthält `RE[…+R]` | besteht (Kontrolle: der Umbau darf die Aufgabe-Anzeige nicht überschreiben) |
| T-V1 | Stellung mit drei toten weißen Steinen, Vorschau offen mit drei Marken, dann ein Pass über den Knopf: Das Bild gleicht dem sauberen Neuaufbau und **nicht** dem Bild mit Vorschau | scheitert: Bild gleicht dem mit Vorschau |
| T-V2 | Dieselbe Stellung, statt des Passes ein Zug: Das Bild gleicht dem Neuaufbau | besteht (Kontrolle: `placeStone` zeichnet schon) |

T-S1 und T-V1 müssen am alten Code fehlschlagen und am neuen bestehen. T-S2 und T-V2 bestehen an beiden.

T-V1 und T-V2 prüfen zuerst, dass die Vorschau überhaupt Marken hat (drei), damit der Test nicht grün ist, ohne etwas
zu zeigen (§3).

## 6. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. T-S1 und T-V1 schlagen am alten Code fehl und bestehen am neuen; T-S2 und T-V2 bestehen an beiden.
3. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen am neuen Code — heute sind das 38
   ausgeführte Tests.
4. `node tests/run.js` lokal grün, CI grün.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-ui2-ui3.json` abgelegt, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 7. Prüfung des Entwurfs am Prototyp (22.11.2026)

Die Änderungen aus §4 wurden in eine Kopie der `index.html` (Stand `0d92bbd`) **außerhalb des Repos** eingesetzt und
lokal geprüft: Chromium 153.0.8010.12 headless, Node v22.23.5, nur Seitenaufrufe auf `127.0.0.1`. Der Prototyp ist
nicht die Umsetzung. Keine Partie, kein Messlauf.

**Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.

**UI-2**, Stellung alles Schwarz außer zwei Augen, zwei Pässe, dann Klick auf „Territory":

| | alter Code | Prototyp |
|---|---|---|
| Anzeige vor dem Klick | Schwarz +353.5 (Area (Komi 7.5)) | Schwarz +353.5 (Area (Komi 7.5)) |
| SGF vor dem Klick | `B+353.5` | `B+353.5` |
| Anzeige nach dem Klick | **Schwarz +353.5 (Area)** | **Weiß +5.5 (Territory (Komi 7.5))** |
| SGF nach dem Klick | `W+5.5` | `W+5.5` |
| Anzeige und SGF passen zusammen | **nein** | ja |

**UI-3**, Stellung mit drei toten weißen Steinen, Vorschau offen (drei Marken), dann ein Pass:

| | alter Code | Prototyp |
|---|---|---|
| Vorschau nach dem Pass verworfen | ja | ja |
| Bild nach Pass == Bild mit Vorschau | **ja** (Marken stehen noch) | nein |
| Bild nach Pass == sauberer Neuaufbau | **nein** | ja |

Keine Seitenfehler in allen vier Läufen.

**Bestehende Tests:** `node tests/browser-ui.js <prototyp>` ergibt **38 bestanden, 0 fehlgeschlagen**. `showFinalScore`
wird in `tests/` und `auswertung/` nirgends direkt aufgerufen; das Umbenennen des Anzeigeteils trifft also keinen
anderen Aufrufer.

**Geprüft und dabei eine eigene Annahme verworfen:** Zuerst schien es, ein erneuter `showFinalScore()`-Aufruf könnte
nach einem Netz-Reset ein Training auslösen. Das ist falsch: `reset()` leert den Puffer (Z. 7369), und `trainGame`
kehrt bei leerem Puffer vor jeder Gewichtsänderung und vor `gamesPlayed++` zurück (Z. 7218). Die Trennung in §4 wird
deshalb mit Klarheit begründet, nicht mit einem Schaden.

**Ein Fehler im ersten Prüfskript, der hier festgehalten wird, weil er den Test wertlos gemacht hätte:** Der erste
Aufbau für UI-3 setzte vier einzelne Steine. Die Vorschau malte dort **keine** Marke, alle drei verglichenen Bilder
waren gleich, und der Fall sah an beiden Ständen „richtig" aus. Die Marken zeigen tote Steine, nicht Gebiet (§3). Erst
mit drei toten weißen Steinen zeigte der alte Code den Fehler.

**Grenzen:** Nur Chromium 153 headless. Die Stellungen sind synthetisch gesetzt, nicht erspielt. Der Aufgabe-Fall von
UI-2 ist im Prototyp nicht eigens geprüft; dafür ist T-S2 vorgesehen. Keine Partie, keine Spielstärkemessung.

## 8. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §4, Tests nach §5, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §6 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 9. Nachtrag: Umsetzung und Abnahme (22.11.2026)

Hazeberry, nach grüner CI von #345: „Go". Die Umsetzung folgt §4 und §5 ohne Abweichung. Geändert sind `index.html`
(Anzeigeteil als `endstandAnzeigen`, eine Zeile im Handler der Wertungsknöpfe, ein Aufruf in `pass`),
`tests/browser-ui.js` (T-S1, T-S2, T-V1, T-V2 und der Kommentarkopf) und `tests/README.md`.

**Abnahme nach §6:**

1. **Prüfsummen und Standardwerte:** Die drei Engine-Blöcke haben die Prüfsummen aus §1, nach der Änderung
   nachgerechnet. Der Diff enthält keine Parameterzeile; `PARAMS_DEFAULT` ist unverändert. Erfüllt.
2. **Neue Tests:** Am alten Code (`index.html` SHA-256 `334166b0…`, Stand `3407ea8`) schlagen T-S1 und T-V1 fehl,
   T-S2 und T-V2 bestehen dort (40 bestanden, 2 fehlgeschlagen). Am neuen Code bestehen alle 42 Tests der Datei.
   Erfüllt.
   - T-S1 scheitert am alten Code an „Anzeige folgt der Wertung: erwartet Weiß +5.5, bekommen Schwarz +353.5".
   - T-V1 scheitert an „das Bild zeigt die Marken nicht mehr".
3. **Bestehende Tests:** unverändert übernommen; die 38 bestehen am neuen Code. Erfüllt.
4. **Testsuite:** `node tests/run.js` mit Browser-Tests: **alle 60 Testdateien bestanden**, Exit 0. Eine Prüfung
   übersprang sich, weil GNU Go lokal fehlt (wie bei R-1, UI-1 und H-1). Die CI steht im PR. Erfüllt, sobald die CI
   grün ist.
5. **Prüfskript:** `auswertung/bughunt-20261116/pruefung.js` am neuen Code: 1 von 13 reproduziert, nämlich B-2 — das
   Soll. Daten: `docs/daten/bughunt-20261116/nach-ui2-ui3.json`, Konsole `nach-ui2-ui3-konsole.txt`. Erfüllt.

Neue `index.html`: SHA-256 `7cef50aa4c82825b9e102637d8c07e396cd904d2e93601b10a946b95e4af5c77`.

**Ein Fehler im ersten Testentwurf, hier festgehalten, weil er eine Kontrolle rot gemacht hat:** T-V2 rief
`placeStone` ohne `render()`. `placeStone` baut den Cache neu auf, aber erst `render()` malt ihn aufs Canvas — der
Test verglich also ein veraltetes Bild und schlug am alten Code fehl, obwohl er dort bestehen sollte. Der echte
Klickweg ist `placeStone(col,row); render();` (`index.html` Z. 6721); T-V2 nimmt jetzt denselben Weg. Der Befund UI-3
war davon nicht berührt — T-V1 klickt den Pass-Knopf, der `render()` selbst ruft.

**Grenzen:** Nur Chromium 153 headless. Die Stellungen sind synthetisch gesetzt, nicht erspielt. T-S2 löst die
Aufgabe über `applyAIResult` aus, nicht über eine echte Suche. Die Zugwahl ist unverändert, es gibt also nichts zu
messen.
