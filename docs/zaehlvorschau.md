# Zählvorschau: wie die App die Stellung einschätzt, ohne die KI zu zwingen

Vorbereitet am 31.10.2026, **angeschlossen am 31.10.2026** (§7): Die Rechenfunktion
und die Oberfläche stehen; im Spiel gibt es den Knopf „Zählvorschau“. Anlass und Einordnung: [`endspiel-abraeumen.md`](endspiel-abraeumen.md)
§12. Dort steht auch, warum es kein vorzeitiges Passen der KI sein soll: Ein Pass
des Menschen heißt nicht, dass die Stellung ausgespielt ist.

## 1. Idee

Der Mensch kann **jederzeit** nachsehen, wie die App die Stellung zählt, und danach
weiterspielen. Die Vorschau ändert nichts am Spiel: kein Zug, kein Entfernen von
Steinen, kein Pass, kein Einfluss auf die KI. Die Unsicherheit bei toten Gruppen
bleibt sichtbar, statt in einer einzigen Zahl zu verschwinden.

## 2. Die Rechenfunktion `zaehlVorschau(board, komi)`

Steht in der gemeinsamen Spiellogik in `index.html` (hinter `toteSteineAmEnde`),
rein, ohne Zustand, vom Spiel nicht aufgerufen. Sie teilt jeden Stein in genau eine
von vier Mengen:

| Menge | Bedeutung | Sicherheit |
|---|---|---|
| `bewiesenTot` | Benson-tot | bewiesen, ohne Annahmen |
| `geschaetztTot` | nach `toteSteineAmEnde` tot, aber nicht bewiesen | Annahme der Gruppenregel ([`zaehlung.md`](zaehlung.md)) |
| `bewiesenLebend` | Benson-lebendig (pass-alive) | bewiesen |
| `unbewiesen` | lebend nach der Gruppenregel, aber nicht bewiesen (zwei Augen, großes Auge, offene Grenze) | Annahme; **„nicht von Benson bestätigt“ heißt nicht „tot“** |

Dazu **zwei Stände** (Fläche, chinesisch, `stand` = Schwarz − Weiß − Komi, größer 0
heißt Schwarz vorn):

- `nurBewiesen`: nur die bewiesen toten Steine entfernt.
- `mitSchaetzung`: zusätzlich die geschätzt toten entfernt (wie die Schlusszählung).

Der Abstand beider Stände ist die Unsicherheit durch die Gruppenregel. In der
Partie vom 12.10. (`zaehlung-358.sgf`) zeigt die Vorschau W+82,5 ohne Annahme und
W+102,5 mit Schätzung (GNU Go: W+102,5): Die acht toten schwarzen Steine oben rechts
sind **nicht bewiesen**, sondern geschätzt tot. `gemischtAnteil` ist der Anteil der
leeren Punkte in Regionen, die an beide Farben grenzen; hoch heißt „noch nicht
ausgespielt“ (nach 60 Zügen 1,0, in der ausgespielten Partie 0).

**Was die Funktion nicht kann:** Seki und Ko erkennt die Gruppenregel nicht. Solche
Gruppen erklärt die Funktion deshalb weder für bewiesen noch für tot: In den
Teststellungen (Seki-ähnlich, Ko-Form) bleiben alle Steine `unbewiesen`. Ob eine
`unbewiesen`-Gruppe im Seki lebt, sagt die Vorschau nicht, sie markiert nur, dass
das nicht belegt ist.

## 3. Vorschlag für die Darstellung (nicht gebaut)

Offene Gestaltung, bevor etwas angeschlossen wird:

1. Ein Knopf „Zählvorschau“ neben den Zugknöpfen; die Vorschau öffnet ein Fenster
   und markiert Steine auf dem Brett, das Spiel pausiert bis „Weiterspielen“.
2. **Zwei Zahlen:** „Schwarz +x, wenn die markierten toten Steine tot sind“ und
   „Schwarz +y ohne diese Annahme“, mit Komi 7,5 in der Zeile.
3. **Markierung:** bewiesen tot sichtbar anders als geschätzt tot (z. B. ausgefülltes
   Kreuz gegen Kreuz mit Fragezeichen); `unbewiesen` nur dort hervorheben, wo es für
   die Zahl zählt.
4. **Text:** „Seki und Ko erkennt die Zählung nicht.“ und bei hohem `gemischtAnteil`
   „Die Stellung ist noch nicht ausgespielt.“ (Schwelle als Vorschlag: 10 %).
5. Nur auf dem eigenen Zug des Menschen, nicht während die KI rechnet; ein Zug oder
   „Weiterspielen“ schließt die Vorschau.

Zu klären (deine Entscheidung): Platz und Name des Knopfes, ob die Vorschau auch beim
Spielende gezeigt werden soll, ob die Farbe der Markierung dem Brett-Design folgt,
ob die Vorschau im Dashboard/Protokoll erscheint.

## 4. Tests und Grenzen

[`tests/zaehlvorschau.js`](../tests/zaehlvorschau.js): Reinheit (Brett unverändert,
deterministisch, jede Stelle in genau einer Menge), die Partie vom 12.10. (acht
geschätzt tote Steine, zwei Stände), kleine Formen (zwei Augen bewiesen lebend;
Seki-ähnlich und Ko unbewiesen), unfertige Stellungen (`gemischtAnteil`), Komi.

Grenzen:

- **Die Vorschau ist so gut wie `toteSteineAmEnde`.** Sie macht deren Annahmen
  sichtbar, sie verbessert sie nicht.
- Fehlen in den Teststellungen: echte Seki aus Partien, Ko mit Drohungen, Gruppen
  mit ungewöhnlichen Augen (Nakade-Formen sind in [`tests/zaehlung.js`](../tests/zaehlung.js)
  abgedeckt). Vor dem Anschließen an die Oberfläche sollten dafür weitere
  Stellungen aus echten Partien gesammelt werden.
- Die Dauer ist ein Durchlauf über das Brett (Millisekunden), kein Einfluss auf die
  Bedenkzeit der KI.

## 5. Entscheidungen zur Oberfläche (31.10.2026, Vorabfestlegung vor dem Bau)

Hazeberry hat Name und Platz in meine Hand gegeben (Vorschlag: unter „Neues Spiel“,
Name „Zughilfe“). Entschieden, mit Begründung:

- **Name: „Zählvorschau“, nicht „Zughilfe“.** „Zughilfe“ klingt nach einem
  Zugvorschlag der KI („welchen Zug soll ich spielen?“). Die Vorschau zeigt etwas
  anderes: wie die App die Stellung zählt. Ein Zugvorschlag wäre ein eigenes
  Merkmal; die Knöpfe sollen nicht dasselbe versprechen wie etwas, das sie nicht
  tun.
- **Platz: im Knopffeld mit „Passen“ und „Rückgängig“, zwischen „Rückgängig“ und
  „Neues Spiel“**, nicht unter „Neues Spiel“. Die Vorschau ist eine
  Spielhandlung wie Passen und Rückgängig und gehört dazu; „Neues Spiel“ löscht die
  Partie und soll als letzter, abgesetzter Knopf stehen, damit ein Fehlklick auf dem
  Handy nichts zerstört. Reihenfolge: Passen, Rückgängig, Zählvorschau, Neues Spiel.
- **Ergebnis** in einem eigenen kleinen Feld direkt unter dem Knopffeld, nur sichtbar,
  solange die Vorschau gilt.
- **Gültigkeit:** Die Vorschau gilt für genau die Stellung, für die sie berechnet
  wurde (Hash der Stellung). Jeder Zug, Pass, Rückgängig oder „Neues Spiel“ macht sie
  ungültig und blendet sie aus; kein Zustand wird dabei verändert. „Weiterspielen“
  (oder erneutes Antippen) blendet sie ebenfalls aus.
- **Anzeige:**
  - Zeile 1: „Mit Annahmen: Schwarz +x“ (alle geschätzt toten Steine entfernt),
    Zeile 2: „Nur Bewiesenes: Schwarz +y“, jeweils „Fläche, Komi 7,5“.
  - Markierung auf dem Brett: bewiesen tot = rotes Kreuz (wie bisher in der
    Schlusszählung), geschätzt tot = oranges Kreuz mit Fragezeichen. Unbewiesene
    Steine bleiben unmarkiert; sie stehen nur als Zahl im Text („n Steine nicht
    bewiesen lebendig“).
  - Hinweis immer: „Seki und Ko erkennt die Zählung nicht.“ Bei `gemischtAnteil`
    über 10 %: „Die Stellung ist noch nicht ausgespielt.“
- **Verfügbar** solange die Partie läuft (nicht nach dem Spielende, dort zeigt die App
  das Ergebnis ohnehin) und auch, wenn die KI rechnet; die Berechnung liest nur.
- **Kein Einfluss auf die KI:** Die Vorschau ändert weder Zustand noch Brett noch
  Protokoll und wird von der KI nicht gelesen.

**Tests (vor dem Bau festgelegt):** im Browser (wie `browser-ui.js`): Knopf steht
zwischen „Rückgängig“ und „Neues Spiel“; Klick zeigt zwei Zahlen und den Hinweis;
das Brett (`state.board`), die Gefangenen, das Protokoll und `deadStones` sind danach
unverändert; ein Zug blendet die Vorschau aus; Rückgängig und „Neues Spiel“ ebenfalls;
in einer ausgespielten Stellung (Partie vom 12.10.) erscheint das Fragezeichen-Kreuz an
den acht Steinen; in einer offenen Stellung der Hinweis „noch nicht ausgespielt“.

Gebaut wird erst auf dein Go.

## 6. Sechs Handpartien als Prüfmaterial (31.10.2026)

Hazeberry hat sechs Partien gegen die KI bereitgestellt (SGF aus der App,
5. bis 29.10.2026, jetzt `tests/stellungen/hand-*.sgf`: 478, 455, 427, 392, 364 und
117 Züge). Gefragt war, ob sie Seki- und Ko-Fälle enthalten. Befund, geprüft an den
Endstellungen und den Zugfolgen:

- **Kein Seki.** In keiner der sechs Endstellungen stehen zwei gegnerische Ketten
  mit mindestens zwei gemeinsamen Freiheiten und je höchstens vier Freiheiten. Die
  Seki-Teststellung bleibt deshalb konstruiert (`tests/zaehlvorschau.js`).
- **Ko-Kämpfe kommen vor**, aber keiner ist am Ende offen: In den Zugfolgen stehen
  je 4 bis 12 einzelne Schläge in Ko-Form (ein Stein genommen, der schlagende Stein
  hat eine Freiheit; das zählt auch Rückschläge, die keine längeren Kämpfe waren).
  Die Endstellungen enthalten keinen offenen Ko. Sie belegen, dass die
  Spiellogik Ko-Züge verarbeitet, nicht, dass die Vorschau ein offenes Ko beurteilt.
- **Keine ungewöhnlichen Augen auffällig**; das heißt nicht, dass keine vorkamen,
  nur, dass der Test an diesen Endstellungen keine falsche Behauptung gefunden hat.

**Was die Partien trotzdem prüfen** (`tests/zaehlvorschau.js`, Test „Sechs
Handpartien“):

- In vier Partien (455, 427, 392, 364) steht das Ergebnis, das die App selbst
  angezeigt hat, in `RE[]` (B+61,5, B+67,5, W+106,5, W+98,5). Die Vorschau liefert an
  der Endstellung **genau diese Stände**, ohne einen Stein als nur geschätzt tot zu
  behaupten (`geschaetztTot` ist 0) und ohne gemischten Rest.
- Partie 478 (nicht beendet, kein `RE`): Stand 93,5.
- Partie 117 (Aufgabe der KI, B+R): **nicht ausgespielt** (gemischter Rest über 90 %),
  die Vorschau sagt es, `sicher` ist falsch.

**Grenze:** Alle fünf Endstellungen sind bereits aufgeräumt (die toten Steine wurden
gespielt oder liegen schon als bewiesen tot), sie sind also leicht für die Vorschau.
Schwierig wären Stellungen **vor** dem Aufräumen. Dafür fehlen echte Partien noch;
Hinweis: Eine SGF-Datei aus der App enthält nur die Züge, die toten Steine am Ende
sind darin nicht markiert. Wer eine Partie meldet, bei der die Zählung falsch lag,
liefert am besten die SGF **und** die Stellung, die die App am Ende angezeigt hat.

## 7. Umgesetzt (31.10.2026)

Gebaut nach §5, ohne Abweichung:

- Knopf „Zählvorschau“ im Knopffeld, Reihenfolge Passen, Rückgängig, Zählvorschau,
  Neues Spiel („Neues Spiel“ mit größerem Abstand).
- Ergebnisfeld darunter (`zv-panel`) mit „Mit Annahmen“, „Nur Bewiesenes“, Zähl-Info
  („Fläche, Komi 7,5 …“) und Hinweis; Knopf „Weiterspielen“ blendet es aus, ein
  zweiter Klick auf „Zählvorschau“ ebenso.
- Gültig nur für die berechnete Stellung (Zugzähler und Hash); jeder Zug, Pass,
  Rückgängig und „Neues Spiel“ blendet aus (`vorschauAbgleichen`, aus `updateUI` und
  `drawStateToCache` aufgerufen). Nach dem Spielende gibt es keine Vorschau.
- Markierung auf dem Brett: rotes Kreuz = bewiesen tot, oranges Kreuz mit „?“ =
  geschätzt tot. Das Spiel selbst bleibt unberührt (kein Eintrag in `deadStones`,
  keine Änderung am Brett, an den Gefangenen oder am Protokoll).
- Browser-Tests: [`tests/browser-zaehlvorschau.js`](../tests/browser-zaehlvorschau.js),
  im CI-Job „Browser“.

Nicht enthalten: eine Vorschau mit der Wertung Territory (die Vorschau rechnet Fläche),
und eine Darstellung unbewiesener Gruppen auf dem Brett (nur als Zahl im Text).
