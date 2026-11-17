# Korrektur B-1 bis B-3: Vorabfestlegung

**Stand: 17.11.2026. Status: Vorabfestlegung, noch keine Codeänderung.** Befunde aus `docs/bughunt-20261116.md`
(B-1 bis B-3). Go von Hazeberry am 17.11.2026, nach „Übrig sind nur B-1 bis B-3“: „Go“.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. **Bei B-2 ist eine Gestaltungsfrage
zu entscheiden (§3.2).** Die Umsetzung folgt danach in einem eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt

Betroffen sind nur Anzeige und Dashboard. Die Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben
**byteidentisch** (Prüfsummen wie in `docs/korrektur-d1-w1-vorabfestlegung.md` §1: `54dfef2d…`, `f847c124…`,
`56a5d6c0…`). `PARAMS`, Spielzustand und Wertung ändern sich nicht. Bei B-2 bleibt insbesondere die Schlusszählung
gleich: Tote Steine werden weiter vom Brett genommen und als Gefangene gezählt.

Kein Schalter, kein Messlauf. Die Engine bekommt in keinem Fall andere Werte.

## 2. Befunde

Zeilen am Stand `f75dc43` (`main`).

- **B-1, Klemmung im Dashboard** (`dashUpdate`, Z. 8011): Ein Wert über dem Maximum oder unter dem Minimum wird in
  `PARAMS` begrenzt, das Feld zeigt aber weiter die Eingabe. Gemessen: `aiTimeBudget` Eingabe 99999, in `PARAMS` 5000,
  im Feld 99999. Dasselbe gilt für ganzzahlige Felder mit gebrochener Eingabe: „7.6“ bei `resignStreak` gilt als 7,
  das Feld zeigt 7.6.
- **B-2, tote Steine am Spielende** (`resolveLifeAndDeath` Z. 5794, `drawStateToCache` Z. 6498):
  - Tote Steine werden vom Brett genommen. Dabei entsteht nur die Zeile „! n tote Steine entfernt“; auf dem Brett
    sieht man nicht, **welche** Steine es waren.
  - Der Zeichenweg mit rotem Kreuz (`drawStoneTo` mit `isDead`) wird nie erreicht, weil der Stein beim Zeichnen schon
    fehlt.
  - Der Kommentar an `zeichneVorschauMarken` („rotes Kreuz, wie bei der Schlusszählung“) trifft damit nicht zu.
- **B-3, Statuszeile** (`updateUI` Z. 6649): Der Pass-Knopf übergibt „Beide gepasst.“ (Z. 6754). `updateUI` schreibt bei
  Spielende aber immer „Spiel beendet“ und verwirft damit jede übergebene Meldung. Betroffen ist auch der SGF-Rückfall
  „SGF in Zwischenablage kopiert.“ nach Spielende.

## 3. Änderungen

### 3.1 B-1: Feld zeigt nach der Eingabe den gültigen Wert

Ein `change`-Listener am Dashboard-Panel, per `addEventListener` und ohne Inline-Handler. Gehört das Feld zu einem
`PARAMS`-Schlüssel (id `pd-<Schlüssel>`) und weicht seine Anzeige von `PARAMS` ab, schreibt er den Wert aus `PARAMS`
zurück ins Feld. `change` feuert erst beim Verlassen des Feldes oder bei Enter, nicht bei jedem Tastendruck. Während
des Tippens greift deshalb nichts ein; „5“, „50“, „500“ lassen sich ungestört eingeben.

Folge: Nach der Eingabe zeigt das Feld immer den Wert, mit dem die Engine rechnet. Das betrifft auch ganzzahlige
Felder mit gebrochener Eingabe („7.6“ wird zu „7“).

**Nicht Teil:** Die Begrenzung selbst bleibt, wie sie ist. Die Felder der Tabelle CAND/R/D (`dashCrdUpdate`) begrenzen
nicht auf ihr Maximum; der Listener zeigt dort nur, was in `PARAMS` steht.

### 3.2 B-2: Tote Steine sichtbar machen (Entscheidung nötig)

**Variante A (empfohlen, am Prototyp geprüft): markieren.**
- `resolveLifeAndDeath` merkt sich zusätzlich die Farbe jedes entfernten Steins (`state.deadFarben`, eine Map von
  Punkt zu Farbe).
- `drawStateToCache` zeichnet diese Steine an ihrem Punkt halb durchsichtig, darüber das rote Kreuz.
- Das Brett selbst bleibt wie heute **leer** an diesen Punkten. Wertung, Gefangene, Protokoll und SGF bleiben
  unverändert.
- `deadFarben` wird wie `deadStones` behandelt:
  - im Rückgängig-Stapel gesichert und zurückgesetzt;
  - bei „Neues Spiel“ geleert;
  - im Aufgabe-Pfad von `applyAIResult` wie `deadStones` gesichert und wiederhergestellt, sodass nach einer Aufgabe
    nichts markiert ist.
- `drawStoneTo` bekommt einen optionalen Parameter, der nur das Kreuz zeichnet.

Begründung: Wer am Ende nachrechnet, sieht, welche Steine als tot gezählt wurden. Bisher stand nur eine Zahl im
Protokoll. Die Zählvorschau markiert vorher genauso, und der Kommentar dort wird richtig.

**Variante B: so lassen und nur den Kommentar berichtigen.** Der ungenutzte Zweig in `drawStoneTo` bliebe oder fiele
weg. Kein Risiko, aber am Ende bleibt unsichtbar, welche Steine als tot galten.

**Entscheidung (17.11.2026): Variante A.** Hazeberry hat die Wahl Claude überlassen („Ich überlasse die Entscheidung,
ob tote Steine markiert werden. Nimm das, was du für sinnvoll hältst.“). Gewählt ist A:
- Am Ende ist sichtbar, welche Steine als tot gezählt wurden.
- Wertung, Gefangene, Protokoll und SGF bleiben unverändert.
- Der Prototyp zeigte keine Nebenwirkung auf Rückgängig und Aufgabe (§6).
- Der vorhandene, bisher unerreichbare Zeichenweg mit rotem Kreuz zeigt, dass es so gedacht war.

### 3.3 B-3: Übergebene Meldung auch nach Spielende

`updateUI`: `elMsg.textContent = state.gameOver ? (msg || 'Spiel beendet') : (msg || '–')`. Ohne Meldung bleibt es bei
„Spiel beendet“.

Folge: Nach zwei Pässen über den Knopf steht „Beide gepasst.“. Endet das Spiel durch den Pass der KI, ruft
`applyAIResult` `updateUI()` ohne Meldung auf, und es bleibt bei „Spiel beendet“. Auch die SGF-Meldungen erscheinen nach
Spielende.

**Nicht Teil:** eine eigene Meldung, wenn die KI das Spiel mit ihrem Pass beendet.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`. Die Zeile in `tests/README.md` wird ergänzt. Für B-2 dient dieselbe Stellung
wie im Bug Hunt: eine schwarze Mauer auf Reihe 17, eine weiße auf Reihe 15 und ein weißer Stein auf F19 im schwarzen
Gebiet.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-B1 | `aiTimeBudget`: 99999 eingeben (`input`), dann `change`. Während der Eingabe steht 99999 im Feld, danach 5000 (= `PARAMS`). Eingabe „5“, „50“, „500“ einzeln mit `input`: Das Feld bleibt jeweils bei der Eingabe, nach `change` 500. `resignStreak` „7.6“ zeigt nach `change` „7“ | scheitert: nach `change` weiter 99999 und 7.6 |
| T-B2 | Beide Spieler passen. F19 ist auf dem Brett leer und in `deadStones`, Anzeige und Gefangene wie am alten Code („Weiß +235.5“, Schwarz 1 Gefangener). Am Punkt F19 liegt rotes Kreuz (Pixel am Kreuzarm rötlich) | scheitert: Holz an F19 |
| T-B3 | Nach Spielende wie T-B2 einmal Rückgängig: Kein Kreuz an F19, der weiße Stein ist zurück, `deadFarben` ist leer | besteht (Kontrolle: Rückgängig) |
| T-B4 | Dieselbe Stellung, die KI gibt auf (`applyAIResult` mit `resign`): Am weißen Stein auf F19 ist kein Kreuz | besteht (Kontrolle: Aufgabe-Pfad) |
| T-B5 | Zwei Pässe über den Knopf, ohne KI: Die Statuszeile zeigt „Beide gepasst.“. Nach einer Aufgabe der KI zeigt sie „Spiel beendet“ | scheitert am ersten Teil; der zweite besteht |

T-B1, T-B2 und T-B5 müssen am alten Code fehlschlagen und am neuen bestehen. T-B3 und T-B4 bestehen an beiden. Bei
Variante B entfallen T-B2 bis T-B4. Dann wird nur der Kommentar geändert, und das wird im Nachtrag vermerkt.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1.
2. Tests, je nach Variante für B-2:
   - **Variante A (gewählt):** T-B1, T-B2 und T-B5 schlagen am alten Code fehl und bestehen am neuen; T-B3 und T-B4
     bestehen an beiden.
   - **Variante B:** T-B1 und T-B5 schlagen am alten Code fehl und bestehen am neuen; T-B2 bis T-B4 entfallen. Statt
     ihrer wird geprüft, dass sich an B-2 nur der Kommentar ändert (Diff).
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: B-1 und B-3 „nicht reproduziert“, alle früher behobenen
   Fälle weiter „nicht reproduziert“. **B-2 bleibt dort „reproduziert“.** Der Fall prüft, ob der Stein vom Brett
   verschwindet, und das bleibt nach Variante A ausdrücklich so. Die Markierung prüft T-B2. Das Prüfskript wird nicht
   geändert, es ist das Werkzeug des Bug Hunts. Die Ausgabe wird als
   `docs/daten/bughunt-20261116/nach-b1-b3.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (17.11.2026)

Die Änderungen aus §3 (B-2 nach Variante A) wurden in eine Kopie der `index.html` (Stand `f75dc43`) außerhalb des Repos
eingesetzt und lokal geprüft (Chromium 153 headless). Der Prototyp ist nicht die Umsetzung.

- **Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-B1:**
  - Alter Code: nach `change` 99999 im Feld bei 5000 in `PARAMS`; „7.6“ bleibt stehen.
  - Prototyp: während der Eingabe 99999, nach `change` 5000. Die Eingabe „5“, „50“, „500“ bleibt ungestört, danach
    500. „7.6“ wird nach `change` zu „7“.
- **T-B2:**
  - Alter Code: an F19 Holz (RGB 200/160/90).
  - Prototyp: am Kreuzarm RGB 192/57/43 (das Rot des Kreuzes). An beiden: F19 leer, `deadStones` = {F19},
    „Weiß +235.5“, Gefangene Schwarz 1, Weiß 0.
- **T-B3:** An beiden ist nach Rückgängig der weiße Stein zurück und kein Kreuz zu sehen; am Prototyp ist `deadFarben`
  leer.
- **T-B4:** An beiden nach der Aufgabe kein Kreuz, F19 weiß.
- **T-B5:** Alter Code: „Spiel beendet“. Prototyp: „Beide gepasst.“; nach der Aufgabe an beiden „Spiel beendet“.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest und entscheidet über B-2, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht.

**Hinweis aus der Lesung (17.11.2026), eingearbeitet:** §4 ließ bei Variante B die Tests T-B2 bis T-B4 entfallen, §5
verlangte sie aber uneingeschränkt. Variante B wäre damit nach dem Wortlaut nicht abnahmefähig gewesen. §5 Punkt 2
unterscheidet jetzt nach Variante A und B.
