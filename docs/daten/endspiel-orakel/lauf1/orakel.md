| Arm | Orakel | Partien | Gelegenheiten Ø | ersetzt Ø | davon geändert Ø | Zug der KI = Orakelzug | Differenz zu A | 95 % | p | je geändertem Zug |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| **D25** | ab Zug 81, 25 % | 120 | 63,6 | 15,6 | 11,7 | 25,1 % | **+21,3** | [+10,6; +32,1] | 0,0001 | +1,83 [+0,91; +2,75] |
| **D50** | ab Zug 81, 50 % | 120 | 58,4 | 28,8 | 21,4 | 25,6 % | **+32,8** | [+23,3; +42,3] | 3,9 · 10⁻10 | +1,53 [+1,08; +1,97] |
| **D100** | ab Zug 81, 100 % | 120 | 45,6 | 45,6 | 37,7 | 17,5 % | **+78,7** | [+68,5; +88,9] | 5,6 · 10⁻30 | +2,09 [+1,82; +2,36] |
| **E100** | ab Zug 161, 100 % | 120 | 16,4 | 16,4 | 13,3 | 18,6 % | **+34,4** | [+26,0; +42,8] | 5,9 · 10⁻13 | +2,58 [+1,95; +3,21] |

Steigung über D25, D50 (Regression durch den Ursprung): +1,60 Punkte je geändertem Zug.
Messlatte: Mit n = 79,1 Zügen der KI ab dem Beginn des Orakels in einer Partie von Arm A gewinnt ein Lerner, der in einem Anteil q dieser Züge den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind, rund +1,60 × 79,1 × q Punkte. Für 5 Punkte ist q = 4,0 %.
 - Kontrolle gegen docs/daten/endspiel-messung/lauf1/A.jsonl.gz, Arm A: 120 von 120 Partien mit gleichem Endstand und gleicher Zugzahl
