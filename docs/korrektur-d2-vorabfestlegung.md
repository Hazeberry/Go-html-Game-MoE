# Korrektur D-2: Vorabfestlegung

**Stand: 16.11.2026. Status: Vorabfestlegung, noch keine Codeänderung.** Befund aus `docs/bughunt-20261116.md` (D-2).
Go von Hazeberry am 16.11.2026: „Go für D-2, Vorabfestlegung schreiben“.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster von `docs/korrektur-d1-w1-vorabfestlegung.md`.

## 1. Grundsatz: Die Engine bleibt unberührt

Die Änderung betrifft nur den Dashboard-Block am Ende von `index.html`. Die Blöcke `shared-go-logic`, `worker-ai` und
`policy-net` bleiben **byteidentisch**; `PARAMS_DEFAULT` und die Werte der Presets bleiben gleich. Am Stand `d8f72f7`
haben die drei Blöcke dieselben Prüfsummen wie in `docs/korrektur-d1-w1-vorabfestlegung.md` §1:
`54dfef2d…`, `f847c124…` und `56a5d6c0…`.

Deshalb gibt es **keinen Schalter** und **keinen Messlauf**. Andere Werte bekommt die Engine nur beim Wählen eines
Presets, und zwar in zwei Fällen:
- **Wechsel zwischen Presets:** Es gelten die Werte des zuletzt gewählten Presets, ohne Reste der vorigen.
- **Von Hand geänderter Preset-Schlüssel:** Wer einen der 13 Schlüssel aus §2 von Hand geändert hat und danach ein
  Preset wählt, das diesen Schlüssel nicht selbst setzt, bekommt den Standardwert. Heute bliebe der eigene Wert stehen
  (§3, „Folge, bewusst so“).

Ohne Klick auf ein Preset ändert sich nichts. Die Presets selbst sind nie gemessen worden. Eine Wirkung auf die
Spielstärke ist weder heute noch nach der Korrektur belegt.

## 2. Befund

`dashApplyPreset` (Z. 7890 am Stand `d8f72f7`) schreibt nur die Werte des gewählten Presets in `PARAMS`. Was ein vorher
gewähltes Preset gesetzt hat und das neue nicht kennt, bleibt stehen. Nur „↺ Std“ setzt alles zurück (`dashReset`).

Die drei Presets setzen zusammen 13 Schlüssel:
- `crisisLargeSize`, `crisisDragonSize`, `midCapBonus`, `midLibBonus`, `tsumegoCapBonus`, `passGainThreshold` und
  `endAreaGain` setzen alle drei;
- `endCapBonus`, `passMinMc120` und `passMinMc150` nur „Ausgewogen“;
- `tsumegoAtariSet` nur „Aggressiv“;
- `midRescueAtari` und `tsumegoRescue3` nur „Defensiv“.

Am Prototyp (§6) weichen **alle sechs** Folgen aus zwei verschiedenen Presets vom direkten Aufruf ab, nicht nur die
zwei aus dem Bug Hunt.

Die Doku beschreibt die Presets nirgends als aufeinander aufbauend. Sie sind als „Spielstil“ beschriftet, und der aktive
Knopf zeigt nur das zuletzt gewählte Preset. Das Aufbauen ist also kein belegtes Verhalten, sondern der Befund.

## 3. Änderung

In `dashApplyPreset` wird vor dem Anwenden jeder Schlüssel, den **irgendein** Preset setzt, auf `PARAMS_DEFAULT`
gesetzt. Danach kommen die Werte des gewählten Presets. Felder und ihre grüne Markierung folgen für alle diese Schlüssel.
Die Menge der Schlüssel wird aus der Tabelle `PRESETS` abgeleitet, nicht von Hand gepflegt:

```js
const PRESET_SCHLUESSEL = [...new Set(Object.values(PRESETS).flatMap(p => p.values ? Object.keys(p.values) : []))];
// in dashApplyPreset, Zweig mit Werten:
const werte = {};
for (const k of PRESET_SCHLUESSEL) werte[k] = PARAMS_DEFAULT[k];
Object.assign(werte, preset.values);
Object.assign(PARAMS, werte);
// danach die Felder für alle Einträge von werte setzen, wie heute für preset.values
```

Damit hängt das Ergebnis eines Presets nur noch vom Preset selbst und von den Werten **außerhalb** der Presets ab, nicht
mehr von der Reihenfolge der Klicks.

**Unverändert:**
- „↺ Std“ (`dashReset`).
- Werte außerhalb der 13 Schlüssel, etwa `aiTimeBudget` oder die Diagonalprüfung: Ein Preset fasst sie nicht an. Die
  Prüfung auf `diagonalAugeEnde` mit Neuberechnung der Zählvorschau bleibt, auch wenn kein Preset diesen Schalter setzt.
- Speichern und Laden der Einstellungen.

**Folge, bewusst so:** Wer einen der 13 Werte von Hand geändert hat und dann ein Preset wählt, findet ihn auf dem
Standard oder auf dem Wert des Presets wieder. Heute bleibt er erhalten, wenn das gewählte Preset diesen Schlüssel
nicht setzt. Ein Preset legt damit den ganzen „Spielstil“ fest, nicht nur einen Teil davon.

**Erwogen und verworfen:**
- *Vor jedem Preset alles auf den Standard setzen.* Das verwirft auch Einstellungen, die mit dem Spielstil nichts zu
  tun haben, etwa das Zeitbudget auf dem Handy.
- *Nur die Schlüssel des zuletzt gewählten Presets zurücksetzen.* Das letzte Preset wird nicht gespeichert. Nach einem
  Neuladen wüsste die Seite es nicht mehr und würde wieder aufbauen.

**Nicht Teil der Korrektur:**
- Gespeicherte Einstellungen, die Reste früherer Presets enthalten: Sie bleiben, wie sie sind.
- Die Werte der Presets.
- B-1 (Anzeige nach Begrenzung) und die übrigen offenen Befunde.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`. Die Zeile in `tests/README.md` wird ergänzt.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-P1 | Für jedes Preset X und jedes Preset Y aus Ausgewogen, Aggressiv, Defensiv: „Std“, Y, X ergibt dasselbe `PARAMS` (alle Schlüssel) wie „Std“, X | scheitert an allen sechs Folgen mit Y ≠ X |
| T-P2 | `aiTimeBudget` über das Feld auf 2500, danach Aggressiv und Defensiv: `aiTimeBudget` bleibt 2500 | besteht (Kontrolle: Werte außerhalb der Presets) |
| T-P3 | Nach Std, Aggressiv, Defensiv zeigt jedes Feld eines `PARAMS`-Schlüssels den Wert aus `PARAMS`, grün markiert genau bei Abweichung vom Standard | besteht (Kontrolle: Felder folgen dem Zurücksetzen) |

T-P1 muss am alten Code fehlschlagen und am neuen bestehen. T-P2 und T-P3 bestehen an beiden. Sie sichern ab, dass
die Korrektur nichts außerhalb der Presets berührt und die Anzeige mitzieht.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1. `PARAMS_DEFAULT` und die Tabelle `PRESETS` sind unverändert.
2. T-P1 schlägt am alten Code fehl und besteht am neuen; T-P2 und T-P3 bestehen an beiden.
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: D-2 „nicht reproduziert“. D-1 und W-1a bis W-1c bleiben
   „nicht reproduziert“, W-1k ebenso. K-1, K-2, L-1, R-1 und B-1 bis B-3 bleiben „reproduziert“ (7 von 13).
   Die Ausgabe wird als `docs/daten/bughunt-20261116/nach-d2.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (16.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `d8f72f7`) außerhalb des Repos eingesetzt und lokal
geprüft (Chromium 153 headless). Der Prototyp ist nicht die Umsetzung.

- **Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-P1:** Am alten Code weichen alle sechs Folgen ab. Ein Beispiel: Aggressiv → Defensiv behält `tsumegoAtariSet` 650,
  Ausgewogen → Aggressiv behält `endCapBonus` 12, `passMinMc120` 6 und `passMinMc150` 8. Am Prototyp weicht keine ab.
- **T-P2:** `aiTimeBudget` bleibt an beiden 2500.
- **T-P3:** An beiden zeigen alle Felder die Werte aus `PARAMS`.
- **Prüfskript:** `pruefung.js` am Prototyp ergibt genau das Soll aus §5 Punkt 4: D-2 „nicht reproduziert“, 7 von 13.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht.
