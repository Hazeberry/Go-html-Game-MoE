# Aufbauprüfung K3, Schritt 1: Übernahme der Simulationszahl

**Gültig. Kein Aufbaufehler gefunden:** Jeder Steinzug von A meldet genau 2600, jeder Steinzug von B genau 5200 Simulationen, in beiden Farben; jede Entscheidung ohne Meldung ist ein Pass.
Commit 98aa1ad586c9de23f64ca76c26af1d7b199b7b3a · Festlegung: docs/skalierung-aufbaupruefung-vorabfestlegung.md §1

## Je Arm und Farbe

| Arm | Farbe | Sollwert | Partien | Entscheidungen | Steinzüge | davon genau Sollwert | Abweichungen | Pässe | Pässe mit Meldung |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | Schwarz | 2600 | 615 | 115483 | 109042 | 109042 | 0 | 6441 | 0 |
| A | Weiß | 2600 | 615 | 114130 | 107537 | 107537 | 0 | 6593 | 0 |
| B | Schwarz | 5200 | 615 | 114437 | 106942 | 106942 | 0 | 7495 | 0 |
| B | Weiß | 5200 | 615 | 115163 | 107157 | 107157 | 0 | 8006 | 0 |

## Daten

- Teilläufe 123, geprüfte Partien 1230.
- Prüfsummen: 123 von 123 gleich der Angabe von GitHub; 123 von 123 gleich laeufe.csv.
- Konfiguration A: „mctsFixedSims=2600,resignEnabled=0“ (123); B: „mctsFixedSims=5200,resignEnabled=0“ (123).
- params_hash: 267e790b09679bca… (1230 Partien).
