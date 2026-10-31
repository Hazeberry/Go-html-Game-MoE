# Zählvorschau: wie die App die Stellung einschätzt, ohne die KI zu zwingen

Vorbereitet am 31.10.2026. **Nur Vorbereitung:** die Rechenfunktion und ihre Tests
stehen, **im Spiel ist nichts angeschlossen** (kein Knopf, kein Verhalten
geändert). Anlass und Einordnung: [`endspiel-abraeumen.md`](endspiel-abraeumen.md)
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
