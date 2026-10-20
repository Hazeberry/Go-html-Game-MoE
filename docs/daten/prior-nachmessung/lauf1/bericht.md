# Nachmessung zu mctsPriorSharp und bensonDeathTransfer gegen GNU Go

Seed 212 gegen GNU Go, Seeds ab 20261201 im Selbstspiel. Arm A: Default (`mctsPriorSharp` 3, `bensonDeathTransfer` 0).

## Frage 1, Stufe 1: S9 gegen A (480 Paare, alpha 0,05)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 480 | 0 | +19,1 | 304 | 241,1 |
| S9 | `mctsPriorSharp=9` | 480 | 0 | +26,4 | 365 | 223,5 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,05) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **S9** | 480 | **+7,3** | [+2,1; +12,5] | 0,0064 | +11,7 / +2,9 | 365 gegen 304 | −10,4 | 0 von 480 | besser: Kandidat |

## Frage 1, Stufe 2: S15, S30 und PH gegen S9 (Partien 1 bis 240, alpha 0,0167)

Zählt nach docs/prior-nachmessung.md §4 nur, wenn Stufe 1 S9 als besser ausweist.

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| S9 | `mctsPriorSharp=9` | 480 | 0 | +26,4 | 365 | 223,5 |
| S15 | `mctsPriorSharp=15` | 240 | 0 | +28,0 | 165 | 230,2 |
| S30 | `mctsPriorSharp=30` | 240 | 0 | +19,2 | 160 | 237,1 |
| PH | `mctsPriorSharp@120=9` | 240 | 0 | +14,9 | 135 | 241,4 |

| Arm | Paare | Differenz zu S9 | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich S9 | Urteil (alpha 0,0167) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **S15** | 240 | **+1,1** | [−5,2; +7,4] | 0,7343 | −1,6 / +3,7 | 165 gegen 182 | +10,3 | 10 von 240 | verworfen: kein Gewinn von 10 |
| **S30** | 240 | **−7,8** | [−16,4; +0,8] | 0,0763 | −11,8 / −3,8 | 160 gegen 182 | +16,8 | 1 von 240 | verworfen: kein Gewinn von 10 |
| **PH** | 240 | **−12,0** | [−19,2; −4,8] | 0,0011 | −19,5 / −4,5 | 135 gegen 182 | +8,4 | 0 von 240 | schlechter |

## Die Dosis-Kurve gegen A (beschreibend)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 480 | 0 | +19,1 | 304 | 241,1 |
| S9 | `mctsPriorSharp=9` | 480 | 0 | +26,4 | 365 | 223,5 |
| S15 | `mctsPriorSharp=15` | 240 | 0 | +28,0 | 165 | 230,2 |
| S30 | `mctsPriorSharp=30` | 240 | 0 | +19,2 | 160 | 237,1 |
| PH | `mctsPriorSharp@120=9` | 240 | 0 | +14,9 | 135 | 241,4 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,0125) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **S9** | 480 | **+7,3** | [+2,1; +12,5] | 0,0064 | +11,7 / +2,9 | 365 gegen 304 | −10,4 | 0 von 480 | besser: Kandidat |
| **S15** | 240 | **+12,7** | [+4,3; +21,2] | 0,0034 | +17,3 / +8,2 | 165 gegen 149 | +1,9 | 0 von 240 | besser: Kandidat |
| **S30** | 240 | **+3,9** | [−5,9; +13,7] | 0,4349 | +7,1 / +0,7 | 160 gegen 149 | +8,4 | 0 von 240 | nicht belegt |
| **PH** | 240 | **−0,3** | [−4,7; +4,0] | 0,8735 | −0,7 / −0,1 | 135 gegen 149 | +0,0 | 1 von 240 | verworfen: kein Gewinn von 10 |

- S9: in 1 von 480 Paaren die ersten 120 Züge gleich A
- S15: in 0 von 240 Paaren die ersten 120 Züge gleich A
- S30: in 1 von 240 Paaren die ersten 120 Züge gleich A
- PH: in 240 von 240 Paaren die ersten 120 Züge gleich A

## Frage 2: BT gegen A (Partien 1 bis 240, alpha 0,05)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 480 | 0 | +19,1 | 304 | 241,1 |
| BT | `bensonDeathTransfer=1` | 240 | 0 | +14,5 | 144 | 243,5 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,05) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **BT** | 240 | **−0,8** | [−2,4; +0,7] | 0,2948 | −1,9 / +0,3 | 144 gegen 149 | +0,0 | 100 von 240 | verworfen: kein Gewinn von 10 |

## M2: Selbstspiel gegen den Default (je 360 Partien)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **S9** | `mctsFixedSims=120` | `mctsFixedSims=120,mctsPriorSharp=9` | 360 | 92 | **25,6 %** | [21,3 %; 30,3 %] | 4,5 · 10⁻21 | 50 von 180 | 42 von 180 | 260 | 260,9 | signifikant unter 50 % |

- 12 Teile, Seeds 20261201 bis 20261212

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **BT** | `mctsFixedSims=120` | `mctsFixedSims=120,bensonDeathTransfer=1` | 360 | 183 | **50,8 %** | [45,7 %; 56,0 %] | 0,7922 | 101 von 180 | 82 von 180 | 260 | 262,4 | nicht signifikant |

- 12 Teile, Seeds 20261201 bis 20261212

## Siege, gepaart (McNemar, sekundär)

| Arm | Siege | Siege A | nur Arm | nur A | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **S9** | 365 | 304 | 120 | 59 | 245 | 56 | 6,0 · 10⁻6 |
| **S15** | 165 | 149 | 61 | 45 | 104 | 30 | 0,1448 |
| **S30** | 160 | 149 | 65 | 54 | 95 | 26 | 0,3594 |
| **PH** | 135 | 149 | 15 | 29 | 120 | 76 | 0,0488 |
| **BT** | 144 | 149 | 3 | 8 | 141 | 88 | 0,2266 |

| Arm | Siege | Siege S9 | nur Arm | nur S9 | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **S15** | 165 | 182 | 22 | 39 | 143 | 36 | 0,0396 |
| **S30** | 160 | 182 | 44 | 66 | 116 | 14 | 0,0448 |
| **PH** | 135 | 182 | 28 | 75 | 107 | 30 | 4,0 · 10⁻6 |

## Kontrolle

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| K | `Default` | 15 | 0 | +17,4 | 8 | 241,7 |

| Arm | Paare | Differenz zu K | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich K | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
 - Kontrolle gegen docs/daten/parameter-reihe/lauf1/A.jsonl.gz, Arm K: 15 von 15 Partien mit gleichem Endstand und gleicher Zugzahl

## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)

```
== S9 gegen A
nach Zug 120: 480 Paare (0 ohne Partner/abgebrochen) · A Ø 73.8 · B Ø 63.4 · Differenz B − A -10.4 (SD 37.9) · t = -6.04, p = 3.0e-9
nach Zug 200: 263 Paare (217 ohne Partner/abgebrochen) · A Ø 17.3 · B Ø 25.5 · Differenz B − A 8.2 (SD 55.6) · t = 2.39, p = 0.0174
Endstand: 480 Paare (0 ohne Partner/abgebrochen) · A Ø 19.1 · B Ø 26.4 · Differenz B − A 7.3 (SD 58.4) · t = 2.74, p = 0.0064
== S15 gegen A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 70.5 · B Ø 72.4 · Differenz B − A 1.9 (SD 40.0) · t = 0.73, p = 0.4645
nach Zug 200: 155 Paare (85 ohne Partner/abgebrochen) · A Ø 14.2 · B Ø 26.9 · Differenz B − A 12.7 (SD 64.0) · t = 2.47, p = 0.0147
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 15.3 · B Ø 28.0 · Differenz B − A 12.7 (SD 66.8) · t = 2.96, p = 0.0034
== S30 gegen A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 70.5 · B Ø 78.9 · Differenz B − A 8.4 (SD 34.0) · t = 3.84, p = 0.0002
nach Zug 200: 174 Paare (66 ohne Partner/abgebrochen) · A Ø 17.5 · B Ø 21.7 · Differenz B − A 4.1 (SD 58.9) · t = 0.92, p = 0.3564
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 15.3 · B Ø 19.2 · Differenz B − A 3.9 (SD 77.1) · t = 0.78, p = 0.4349
== PH gegen A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 70.5 · B Ø 70.5 · Differenz B − A 0.0 (SD 0.0) · t = NaN, p = NaN
nach Zug 200: 181 Paare (59 ohne Partner/abgebrochen) · A Ø 14.7 · B Ø 12.5 · Differenz B − A -2.2 (SD 28.7) · t = -1.02, p = 0.3078
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 15.3 · B Ø 14.9 · Differenz B − A -0.3 (SD 34.0) · t = -0.16, p = 0.8735
== BT gegen A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 70.5 · B Ø 70.5 · Differenz B − A 0.0 (SD 0.0) · t = NaN, p = NaN
nach Zug 200: 195 Paare (45 ohne Partner/abgebrochen) · A Ø 17.2 · B Ø 17.7 · Differenz B − A 0.6 (SD 5.7) · t = 1.40, p = 0.1624
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 15.3 · B Ø 14.5 · Differenz B − A -0.8 (SD 12.3) · t = -1.05, p = 0.2948
```

## Zusatzzahlen

```
== S9 gegen A
Paare: 480 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 241.1, B Ø 223.5
Median der Differenz B − A: +2,0
Vorzeichentest: B besser in 244 Paaren, schlechter in 226, gleich in 10 · p = 0,4330 (zweiseitig, exakt)
== S15 gegen A
Paare: 240 (240 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 242.5, B Ø 230.2
Median der Differenz B − A: +7,0
Vorzeichentest: B besser in 132 Paaren, schlechter in 107, gleich in 1 · p = 0,1204 (zweiseitig, exakt)
== S30 gegen A
Paare: 240 (240 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 242.5, B Ø 237.1
Median der Differenz B − A: +10,0
Vorzeichentest: B besser in 137 Paaren, schlechter in 99, gleich in 4 · p = 0,0158 (zweiseitig, exakt)
== PH gegen A
Paare: 240 (240 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 242.5, B Ø 241.4
Median der Differenz B − A: +0,0
Vorzeichentest: B besser in 116 Paaren, schlechter in 97, gleich in 27 · p = 0,2174 (zweiseitig, exakt)
== BT gegen A
Paare: 240 (240 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 242.5, B Ø 243.5
Median der Differenz B − A: +0,0
Vorzeichentest: B besser in 38 Paaren, schlechter in 39, gleich in 163 · p = 1,0000 (zweiseitig, exakt)
```
