# Korrektur TRAIN-1: Vorabfestlegung

**Stand: 22.11.2026. Status: Entwurf, nicht umgesetzt.** Befund aus `docs/bughunt-wiederholung.md` §5 und §7
(TRAIN-1), Varianten in `docs/bughunt-20261116.md` §7. Hazeberry hat am 22.11.2026 **Variante (a)** gewählt: „Das
erste abgeschlossene Ergebnis gilt dauerhaft."

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt, und das Training ändert sich nicht

Betroffen sind zwei Stellen im Hauptskript: der Puffer-Push in `applyAIResult` und `undo`. Die Blöcke
`shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch** (Prüfsummen wie in
`docs/korrektur-d1-w1-vorabfestlegung.md` §1, am Stand `e2cd3c4` gültig). `PARAMS_DEFAULT` bleibt gleich.

**Wichtig für die Einordnung:** Der Kern von Variante (a) — eine Partie wird genau einmal gelernt — ist **bereits das
heutige Verhalten**. Gemessen (§6): Nach einem Undo am Spielende und einem zweiten Spielende bleibt es bei einem
Trainingsaufruf und einer gezählten Partie, am alten Code genauso wie am neuen. Diese Korrektur ändert das Training
also **nicht**. Sie beendet ein nutzloses Sammeln und macht die Festlegung sichtbar.

Kein Schalter, kein Messlauf. Bei `netMaxBlend` 0 (Default) wirkt das PolicyNet ohnehin nicht auf die Zugwahl
(`docs/korrektur-h1-vorabfestlegung.md` §2).

## 2. Befund

Zeilen am Stand `e2cd3c4` (`index.html` SHA-256 `7cef50aa…`).

`showFinalScore` setzt `policyNet._trained = true` und ruft `trainGame` (Z. 5896 bis 5901); der Aufgabe-Pfad in
`applyAIResult` tut dasselbe mit `-1` (Z. 5960). `trainGame` ändert dabei die Gewichte, erhöht `gamesPlayed`, zählt
`wins`, setzt `lastResult`, **leert den Puffer** und schreibt nach localStorage (Z. 7305 bis 7310).

`undo` (Z. 5685 bis 5705) stellt Brett, Zähler und Spielende wieder her, setzt `resignedBy` zurück und blendet das
Endstands-Panel aus. `_trained` bleibt **true**; zurückgesetzt wird es nur in `resetGame` (Z. 5779), im Konstruktor
und in `reset()`.

Daraus folgt, Schritt für Schritt und in §6 gemessen:

1. Beim ersten Spielende wird gelernt: ein Trainingsaufruf, `gamesPlayed` 1, Puffer leer.
2. Ein Undo hebt das Spielende auf — `_trained` bleibt true.
3. Weiterspielen füllt den Puffer neu (`applyAIResult`, Z. 5926 bis 5931). `undo` kürzt ihn nur, wenn er **länger**
   ist als der gemerkte Stand (Z. 5698 f.); nach dem Training ist er leer, also greift das nicht.
4. Das nächste Spielende findet `_trained` true → **kein Training**. Der Puffer bleibt gefüllt, bis `resetGame` ihn
   leert.

**Was daran stört, und was nicht.** Dass nicht erneut gelernt wird, ist Variante (a) und gewollt. Es stören zwei
Dinge: Die Züge ab dem Undo werden **gesammelt und dann verworfen** — Arbeit und Speicher ohne Zweck, und bei einer
langen Fortsetzung wächst der Puffer. Und die Festlegung ist **unsichtbar**: Niemand erfährt, dass die Fortsetzung
nicht mehr ins Training geht.

**Was der Befund nicht sagt.** Eine Wirkung auf die Spielstärke ist nicht gemessen und bei `netMaxBlend` 0 auch nicht
zu erwarten. Betroffen sind die gelernten Gewichte und die Lernstatistik. Letztere wiegt erst, wenn jemand den Blend
einschaltet: `gamesPlayed` geht über `blendWeight` in den Einfluss des Netzes ein, und `wins/gamesPlayed` ist die
Baseline des Vorteilsterms (Z. 7243 f.).

## 3. Änderung

Zwei Einfügungen, nichts wird entfernt.

**(a) Nach dem Abschluss wird nicht mehr gesammelt** (`applyAIResult`, Z. 5926):

```js
    /* Nach dem ersten Abschluss dieser Partie wird nicht mehr gelernt
       (TRAIN-1, Variante a) — dann auch nicht mehr gesammelt. */
    if (r.ok && netPriors && globalThis.policyNet && !policyNet._trained) {
```

**(b) Das Undo am Spielende sagt es** (`undo`): `warEnde` zu Beginn merken, weil Z. 5691 `state.gameOver` aus `prev`
überschreibt, und die Zeile **nach** `state.log.splice` (Z. 5695) schreiben, sonst wird sie weggeschnitten:

```js
  const warEnde = state.gameOver;
  …
  /* Die Partie ist beim ersten Abschluss gelernt und bleibt es; was jetzt
     folgt, geht nicht mehr ins Training (TRAIN-1, Variante a). Das steht im
     Protokoll, damit es keine stille Festlegung ist. */
  if (warEnde && !state.gameOver && globalThis.policyNet && policyNet._trained)
    state.log.push('! Partie ist bereits gelernt — die Fortsetzung geht nicht ins Training.');
```

**Unverändert:** `showFinalScore`, der Aufgabe-Pfad, `trainGame`, `resetGame`, `_trained` selbst. Die Engine ohnehin
(§1).

**Bewusst so:**
- **Die Zeile steht im Zugprotokoll**, nicht als Dialog. Damit landet sie auch im Fehlerbericht (🐞) und stört den
  Spielfluss nicht.
- **Der Puffer wird beim Undo nicht eigens geleert.** Er ist nach `trainGame` leer, und mit (a) füllt er sich nicht
  mehr. Ein zusätzliches Leeren wäre eine Zeile ohne Wirkung.
- **Mehrfaches Undo im Spielende-Zustand schreibt die Zeile nur einmal**, weil sie an `warEnde && !state.gameOver`
  hängt: Beim zweiten Undo ist `state.gameOver` schon false.

**Erwogen und verworfen:**
- *`_trained` beim Undo zurücksetzen.* Das wäre Variante (b) oder eine halbe Fassung davon: Die Gewichtsänderung des
  ersten Trainings bliebe drin, und am zweiten Ende würde dieselbe Partie ein zweites Mal gelernt — schlechter als
  heute.
- *Den Puffer beim Undo behalten und am zweiten Ende verwenden.* Dasselbe Problem: zwei Trainings für eine Partie.
- *Die Zeile in die Statuszeile schreiben.* Die wird beim nächsten Zug überschrieben; das Protokoll bleibt.

**Nicht Teil der Korrektur:** TRAIN-2, NET-1, GTP-1 bis GTP-3. Die Varianten (b), (c) und (d) aus
`docs/bughunt-20261116.md` §7 — Hazeberry hat (a) gewählt, die Gründe gegen die anderen stehen dort und in der
Beratung vom 22.11.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Benennung `T-T…`.

**Eine Vorgabe zum Aufbau, die den Test erst tragfähig macht:** Die Puffer-Einträge müssen **echte Netzeingaben**
tragen (`policyNet.boardToInput` und `policyNet.forward`), nicht Attrappen wie `new Float32Array(4)`. Mit Attrappen
rechnet `_backward` Unsinn, `_badWeight` schlägt an, und `trainGame` läuft in den Divergenzpfad (Z. 7286 ff.), der
`reset()` aufruft: `gamesPlayed` 0 und `_trained` false. Der Test prüfte dann die Divergenz-Mechanik statt TRAIN-1.
Der erste Entwurf dieses Prüfskripts hatte genau diesen Fehler (§6).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-T1 | Zwei KI-Züge mit echten Eingaben, Spielende durch zwei Pässe, Undo, dann ein weiterer KI-Zug: Der Puffer bleibt **leer**; `_trained` bleibt true, `gamesPlayed` 1, keine Divergenz | scheitert: Puffer 1 |
| T-T2 | Derselbe Ablauf, danach ein zweites Spielende: weiter **ein** Trainingsaufruf und `gamesPlayed` 1, Puffer leer | scheitert am Puffer (1 statt 0); die Trainingszahlen stimmen dort schon |
| T-T3 | Nach dem Undo am Spielende steht „Partie ist bereits gelernt" im Protokoll; ein zweites Undo schreibt sie nicht erneut | scheitert: keine Zeile |
| T-T4 | Nach „Neues Spiel" ist `_trained` false, und ein KI-Zug landet wieder im Puffer | besteht (Kontrolle: das Sammeln ist nicht dauerhaft abgeschaltet) |
| T-T5 | Ein Undo **ohne** vorheriges Spielende schreibt die Zeile nicht | besteht (Kontrolle) |

T-T1 bis T-T3 müssen am alten Code fehlschlagen und am neuen bestehen. T-T4 und T-T5 bestehen an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. T-T1 bis T-T3 schlagen am alten Code fehl und bestehen am neuen; T-T4 und T-T5 bestehen an beiden.
3. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen am neuen Code — heute sind das 42
   ausgeführte Tests, darunter „PolicyNet-Puffer: erst nach gelungenem Zug, Undo nimmt ihn heraus" und „Aufgabe der
   KI: Training mit -1".
4. `node tests/run.js` lokal grün, CI grün. `tests/training-stability.js` ist dabei besonders zu beachten, weil es den
   Trainingspfad betrifft.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-train1.json` abgelegt, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (22.11.2026)

Die Änderungen aus §3 wurden in eine Kopie der `index.html` (Stand `e2cd3c4`) **außerhalb des Repos** eingesetzt und
lokal geprüft: Chromium 153.0.8010.12 headless, Node v22.23.5, nur Seitenaufrufe auf `127.0.0.1`. Der Prototyp ist
nicht die Umsetzung. Ablauf: zwei KI-Züge mit echten Netzeingaben, Spielende durch zwei Pässe, Undo, ein weiterer
KI-Zug, zweites Spielende, „Neues Spiel", noch ein KI-Zug.

**Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.

| Schritt | alter Code | Prototyp |
|---|---|---|
| vor dem Ende | Puffer 2, `_trained` false, Spiele 0 | gleich |
| nach dem Ende | Puffer 0, `_trained` true, Spiele 1, 1 Trainingsaufruf, 0 Divergenzen, gesund | gleich |
| nach dem Undo | Spielende aufgehoben, `_trained` true, **keine Protokollzeile** | **Protokollzeile vorhanden** |
| nach einem KI-Zug | **Puffer 1** | **Puffer 0** |
| nach dem zweiten Ende | 1 Trainingsaufruf, Spiele 1, **Puffer 1** | 1 Trainingsaufruf, Spiele 1, **Puffer 0** |
| nach „Neues Spiel" | `_trained` false, Puffer 0 | gleich |
| danach ein KI-Zug | Puffer 1 | Puffer 1 |

Keine Seitenfehler in beiden Läufen.

**Damit ist belegt:** Der Kern von (a) gilt schon heute (ein Trainingsaufruf, eine gezählte Partie — in beiden
Spalten). Der Prototyp beendet das Sammeln nach dem Abschluss und macht die Festlegung sichtbar; das Sammeln
funktioniert nach „Neues Spiel" unverändert.

**Bestehende Tests:** `node tests/browser-ui.js <prototyp>` ergibt **42 bestanden, 0 fehlgeschlagen**.

**Ein Fehler im ersten Prüfskript, hier festgehalten, weil er das Ergebnis unbrauchbar gemacht hätte:** Der erste
Aufbau übergab `new Float32Array(4)` als `inp`, `probs` und `hidden`. Damit divergierte das Training, `trainGame` lief
in den Divergenzpfad und rief `reset()`; beide Stände zeigten dann `_trained` false und `gamesPlayed` 0, und der
Unterschied zwischen ihnen verschwand. Erst mit echten Eingaben über `boardToInput` und `forward` wurde der Befund
sichtbar. §4 schreibt das für die Tests fest.

**Grenzen:** Nur Chromium 153 headless. Die KI-Züge sind über `applyAIResult` eingespeist, nicht aus einer echten
Suche. Keine Partie gegen einen Gegner, keine Spielstärkemessung — das Training ändert sich nicht (§1).

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §5 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.
