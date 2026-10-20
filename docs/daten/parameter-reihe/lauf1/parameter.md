| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +20,8 | 149 | 241,6 |
| N | `passMinMc120=-1000,passMinMc150=-1000` | 30 | 0 | +21,4 | 19 | 236,9 |
| RAUS | `raveEnabled=0` | 240 | 0 | +24,3 | 152 | 236,3 |
| R30 | `raveK=30` | 240 | 0 | +19,3 | 153 | 236,5 |
| R3000 | `raveK=3000` | 240 | 0 | +20,3 | 145 | 241,7 |
| S0 | `mctsPriorSharp=0` | 240 | 0 | −37,8 | 72 | 283,2 |
| S1 | `mctsPriorSharp=1` | 240 | 0 | −21,5 | 100 | 272,2 |
| S9 | `mctsPriorSharp=9` | 240 | 0 | +28,1 | 189 | 222,6 |
| B0 | `phaseBlendWidth=0` | 240 | 0 | +18,1 | 146 | 240,9 |
| B24 | `phaseBlendWidth=24` | 240 | 0 | +21,1 | 152 | 243,0 |
| P300 | `passMinMc80=300` | 240 | 0 | +19,1 | 146 | 213,7 |
| PNIE | `passMinMc80=-50,passMinMc120=-50,passMinMc150=-50` | 240 | 0 | +20,9 | 148 | 255,8 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **RAUS** | 240 | **+3,6** | [−4,6; +11,7] | 0,3876 | +2,1 / +5,0 | 152 gegen 149 | −4,2 | 0 von 240 | nicht belegt |
| **R30** | 240 | **−1,4** | [−9,8; +7,0] | 0,7428 | −2,1 / −0,7 | 153 gegen 149 | −1,6 | 0 von 240 | verworfen: kein Gewinn von 10 |
| **R3000** | 240 | **−0,4** | [−8,1; +7,2] | 0,9156 | −6,3 / +5,5 | 145 gegen 149 | +2,0 | 0 von 240 | verworfen: kein Gewinn von 10 |
| **S0** | 240 | **−58,6** | [−70,4; −46,8] | 2,7 · 10⁻19 | −49,9 / −67,3 | 72 gegen 149 | −15,6 | 0 von 240 | schlechter |
| **S1** | 240 | **−42,2** | [−54,3; −30,1] | 5,2 · 10⁻11 | −44,3 / −40,1 | 100 gegen 149 | −6,1 | 0 von 240 | schlechter |
| **S9** | 240 | **+7,3** | [+0,2; +14,5] | 0,0451 | +9,1 / +5,6 | 189 gegen 149 | −9,6 | 1 von 240 | Hinweis: besser |
| **B0** | 240 | **−2,7** | [−9,6; +4,3] | 0,4493 | −5,9 / +0,6 | 146 gegen 149 | −0,1 | 1 von 240 | verworfen: kein Gewinn von 10 |
| **B24** | 240 | **+0,3** | [−8,5; +9,1] | 0,9420 | −0,9 / +1,6 | 152 gegen 149 | +0,0 | 0 von 240 | verworfen: kein Gewinn von 10 |
| **P300** | 240 | **−1,6** | [−3,8; +0,6] | 0,1505 | −3,5 / +0,3 | 146 gegen 149 | −0,0 | 7 von 240 | verworfen: kein Gewinn von 10 |
| **PNIE** | 240 | **+0,2** | [−0,6; +1,0] | 0,6465 | −0,1 / +0,5 | 148 gegen 149 | +0,0 | 126 von 240 | verworfen: kein Gewinn von 10 |

- Negativkontrolle N: 30 von 30 Partien Zug für Zug gleich Arm A
 - Kontrolle gegen docs/daten/endspiel-messung/lauf1/A.jsonl.gz, Arm A: 240 von 240 Partien mit gleichem Endstand und gleicher Zugzahl
