# Laufzeitprobe Kandidaten-Orakel (Stufe 0)

**Gültig** (technische Bedingungen 1 bis 4 erfüllt; Bedingung 5 prüft Hazeberry mit dem Budget).

## Dauer (Partie, Millisekunden) und Orakelabfragen

| Gegner | Arm | Partien | Median | Maximum | ms je Abfrage | Eingriffe je Partie |
|---|---|---:|---:|---:|---:|---:|
| GNU Go | A | 8 | 54083 | 66401 | 242,5 | 60,1 |
| GNU Go | S | 8 | 55574 | 75423 | 230,9 | 48,3 |
| GNU Go | ZS | 8 | 65690,5 | 90743 | 314,7 | 64,5 |
| Fuego | A | 4 | 104558 | 109935 | 373,7 | 86 |
| Fuego | S | 4 | 118237 | 171736 | 569,3 | 86,3 |
| Fuego | ZS | 4 | 74011,5 | 82742 | 300,8 | 94,8 |

Größte Partiedauer der Probe: 171736 ms (Grundlage für Bedingung 5: Maximum, nicht Mittel, plus 50 % Reserve).

Orakelantwort: 4678 von 4678 Abfragen beantwortet (100 %).

## Fälle nach Farbe (alle Arme, alle Abfragen)

| Farbe | a | b | c | c1 | d | d1 | kein-protokoll |
|---|---:|---:|---:|---:|---:|---:|---:|
| KI Schwarz | 750 | 11 | 499 | 330 | 681 | 4 | 20 |
| KI Weiß | 730 | 29 | 529 | 335 | 733 | 5 | 22 |

Erster Auslöser S gegen ZS: 12 Paare, 0 abweichend, 0 ohne Auslöser in beiden.

Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): bitgleich.

## Streuung der Paardifferenz des Endstands (S − A), nur zur Planung

- GNU Go: SD 44,9 Punkte bei 8 Paaren (zu wenige Paare für mehr als eine grobe Größenordnung; Mittelwerte werden nicht ausgegeben).
- Fuego: SD 13,2 Punkte bei 4 Paaren (zu wenige Paare für mehr als eine grobe Größenordnung; Mittelwerte werden nicht ausgegeben).
