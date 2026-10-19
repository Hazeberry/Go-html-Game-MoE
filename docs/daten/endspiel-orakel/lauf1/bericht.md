# Orakel-Test: 120 Paare je Arm gegen GNU Go

Seed 206. Arm A: ohne Orakel. D25, D50, D100: GNU Go Stufe 10 zieht für die KI ab Zug 81 in 25 %, 50 %, allen ihrer Züge. E100: ab Zug 161 in allen.

## Das Orakel und was es wert war

| Arm | Orakel | Partien | Gelegenheiten Ø | ersetzt Ø | davon geändert Ø | Zug der KI = Orakelzug | Differenz zu A | 95 % | p | je geändertem Zug |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| **D25** | ab Zug 81, 25 % | 120 | 63,6 | 15,6 | 11,7 | 25,1 % | **+21,3** | [+10,6; +32,1] | 0,0001 | +1,83 [+0,91; +2,75] |
| **D50** | ab Zug 81, 50 % | 120 | 58,4 | 28,8 | 21,4 | 25,6 % | **+32,8** | [+23,3; +42,3] | 3,9 · 10⁻10 | +1,53 [+1,08; +1,97] |
| **D100** | ab Zug 81, 100 % | 120 | 45,6 | 45,6 | 37,7 | 17,5 % | **+78,7** | [+68,5; +88,9] | 5,6 · 10⁻30 | +2,09 [+1,82; +2,36] |
| **E100** | ab Zug 161, 100 % | 120 | 16,4 | 16,4 | 13,3 | 18,6 % | **+34,4** | [+26,0; +42,8] | 5,9 · 10⁻13 | +2,58 [+1,95; +3,21] |

Steigung über D25, D50 (Regression durch den Ursprung): +1,60 Punkte je geändertem Zug.
Messlatte: Mit n = 79,1 Zügen der KI ab dem Beginn des Orakels in einer Partie von Arm A gewinnt ein Lerner, der in einem Anteil q dieser Züge den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind, rund +1,60 × 79,1 × q Punkte. Für 5 Punkte ist q = 4,0 %.
 - Kontrolle gegen docs/daten/endspiel-messung/lauf1/A.jsonl.gz, Arm A: 120 von 120 Partien mit gleichem Endstand und gleicher Zugzahl

## Endstand, gepaart nach Partienummer

| Arm | Partien | Endstand Ø | Siege |
|---|---:|---:|---:|
| A | 120 | 22,9 | 79 |
| D25 | 120 | 44,3 | 100 |
| D50 | 120 | 55,7 | 107 |
| D100 | 120 | 101,7 | 120 |
| E100 | 120 | 57,4 | 109 |

| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---:|---|---:|---|---|---:|
| **D25 − A** | 120 | **+21,3** | [+10,6; +32,1] | 0,0001 | +27,6 / +15,1 | 100 gegen 79 | +1,4 |
| **D50 − A** | 120 | **+32,8** | [+23,3; +42,3] | 3,9 · 10⁻10 | +31,0 / +34,6 | 107 gegen 79 | +6,1 |
| **D100 − A** | 120 | **+78,7** | [+68,5; +88,9] | 5,6 · 10⁻30 | +78,9 / +78,5 | 120 gegen 79 | +22,2 |
| **E100 − A** | 120 | **+34,4** | [+26,0; +42,8] | 5,9 · 10⁻13 | +35,9 / +32,9 | 109 gegen 79 | +0,0 |

## Median und Vorzeichentest

```
== D25 gegen A
Paare: 120 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 238.8, B Ø 207.7
Median der Differenz B − A: +26,0
Vorzeichentest: B besser in 80 Paaren, schlechter in 40, gleich in 0 · p = 0,0003 (zweiseitig, exakt)
== D50 gegen A
Paare: 120 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 238.8, B Ø 197.2
Median der Differenz B − A: +28,0
Vorzeichentest: B besser in 91 Paaren, schlechter in 28, gleich in 1 · p = 0,0000 (zweiseitig, exakt)
== D100 gegen A
Paare: 120 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 238.8, B Ø 171.8
Median der Differenz B − A: +86,0
Vorzeichentest: B besser in 117 Paaren, schlechter in 3, gleich in 0 · p = 0,0000 (zweiseitig, exakt)
== E100 gegen A
Paare: 120 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 238.8, B Ø 193.2
Median der Differenz B − A: +21,0
Vorzeichentest: B besser in 81 Paaren, schlechter in 12, gleich in 27 · p = 0,0000 (zweiseitig, exakt)
```
