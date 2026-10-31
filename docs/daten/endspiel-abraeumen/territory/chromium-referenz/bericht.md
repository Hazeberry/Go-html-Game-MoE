# Chromium-Zeitreferenz

Commit: 9e6bbf89cc5948183a48c2592b35d102ca747be5; Chromium 141.0.7390.37. Rohdaten und Metadaten liegen daneben.

Kaltstart separat in den Rohdaten; Tabelle: Median der zwei warmen Wiederholungen.
Suchzeit umfasst mctsPUCT; Vor-/Nacharbeit = getAIMove minus mctsPUCT. Netz ist Teil dieser Vorarbeit.

| Zug | Netz | Modus | Antworten | getAIMove ms | Netz ms | mctsPUCT ms | Vor-/Nacharbeit ms | Roundtrip ms |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 78 | 0 | 120 | stone, stone | 76.9 | 0.0 | 51.2 | 25.8 | 77.4 |
| 78 | 0 | Zeitbudget | stone, stone | 1824.9 | 0.0 | 1799.6 | 25.3 | 1825.4 |
| 78 | 0.8 | 120 | stone, stone | 76.7 | 0.0 | 49.4 | 27.3 | 77.1 |
| 78 | 0.8 | Zeitbudget | stone, stone | 1824.5 | 0.0 | 1799.4 | 25.0 | 1824.9 |
| 80 | 0 | 120 | stone, stone | 69.3 | 0.0 | 47.5 | 21.8 | 69.8 |
| 80 | 0 | Zeitbudget | stone, stone | 1824.0 | 0.0 | 1799.9 | 24.0 | 1824.4 |
| 80 | 0.8 | 120 | stone, stone | 79.1 | 0.0 | 53.7 | 25.4 | 79.7 |
| 80 | 0.8 | Zeitbudget | stone, stone | 1822.4 | 0.0 | 1799.6 | 22.8 | 1822.8 |
| 82 | 0 | 120 | stone, stone | 78.4 | 0.1 | 51.1 | 27.3 | 79.3 |
| 82 | 0 | Zeitbudget | stone, stone | 1821.8 | 0.0 | 1799.7 | 22.1 | 1822.4 |
| 82 | 0.8 | 120 | stone, stone | 125.0 | 48.6 | 54.7 | 70.3 | 125.3 |
| 82 | 0.8 | Zeitbudget | stone, stone | 1865.9 | 48.6 | 1799.8 | 66.1 | 1866.5 |
| 84 | 0 | 120 | stone, stone | 74.6 | 0.0 | 53.5 | 21.1 | 74.8 |
| 84 | 0 | Zeitbudget | stone, stone | 1820.1 | 0.0 | 1799.6 | 20.4 | 1821.1 |
| 84 | 0.8 | 120 | stone, stone | 129.1 | 53.2 | 52.4 | 76.7 | 129.4 |
| 84 | 0.8 | Zeitbudget | stone, stone | 1879.3 | 54.9 | 1799.4 | 79.9 | 1879.8 |
| 160 | 0 | 120 | stone, stone | 73.6 | 0.0 | 56.7 | 16.9 | 73.9 |
| 160 | 0 | Zeitbudget | stone, stone | 1822.3 | 0.0 | 1800.4 | 21.9 | 1822.8 |
| 160 | 0.8 | 120 | stone, stone | 147.5 | 62.9 | 69.2 | 78.3 | 148.2 |
| 160 | 0.8 | Zeitbudget | stone, stone | 1866.6 | 48.3 | 1800.1 | 66.5 | 1867.0 |
| 300 | 0 | 120 | stone, stone | 83.6 | 0.0 | 78.7 | 4.9 | 83.9 |
| 300 | 0 | Zeitbudget | stone, stone | 1809.4 | 0.0 | 1799.6 | 9.9 | 1809.9 |
| 300 | 0.8 | 120 | stone, stone | 128.4 | 45.1 | 78.6 | 49.8 | 128.9 |
| 300 | 0.8 | Zeitbudget | stone, stone | 1859.2 | 52.4 | 1800.1 | 59.1 | 1859.6 |

Lokale Container-Messung mit Chromium Headless Shell, keine Android-Messung. Netz an/aus ändert die Suchverteilung; bei Zeitbudget darf die Zugwahl abweichen. Kein statistisches Urteil über Spielstärke.

72 Messantworten, 12 Kontrollen gegen uninstrumentierte Worker bestanden, keine Seiten- oder Workerfehler. Das reproduziert die rund 3,8 Sekunden auf Android nicht. Die zusätzliche Netzzeit ist hier deutlich kleiner. Hauptthread-Vorarbeit, Darstellung und Fallbacks wurden nicht gemessen.
