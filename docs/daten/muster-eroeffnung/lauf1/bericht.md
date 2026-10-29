# Muster-Eröffnung

D und M0 aus Stufe A (docs/daten/komponenten/lauf1, Seed 220).

## M1: gegen GNU Go und Fuego

## GNU Go Stufe 1

| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |
|---|---:|---:|---:|---:|---:|
| D | 480 | 0 | 0 | 302 (63 %) | +20,1 |
| M0 | 480 | 0 | 0 | 325 (68 %) | +22,1 |
| A40 | 480 | 0 | 0 | 296 (62 %) | +16,4 |
| A80 | 480 | 0 | 0 | 337 (70 %) | +23,6 |

Gegen D, gepaart, Intervall mit alpha 0,05/2 (97,5 %):

| Arm − D | Paare | Differenz | 97,5 % | SD der Differenzen | standardisiert | Siege Arm / D | erste Abweichung (Median) |
|---|---:|---:|---|---:|---:|---|---:|
| A40 | 480 | −3,7 | [−11,2; +3,7] | 72,8 | −0,07 | 296 / 302 | Zug 8 |
| A80 | 480 | +3,5 | [−3,8; +10,9] | 71,6 | +0,06 | 337 / 302 | Zug 8 |

Phasenprofil, Arm − D nach GNU Gos Schätzung (97,5 %):

| Arm − D | Zug 40 | Zug 80 | Zug 120 | Zug 200 | Ende |
|---|---|---|---|---|---|
| A40 | +27,1 [+25,0; +29,2] | +10,1 [+6,3; +13,9] | +10,0 [+5,4; +14,5] | −3,9 [−10,8; +3,0] | −3,7 [−11,2; +3,7] |
| A80 | +27,1 [+25,0; +29,2] | +14,2 [+10,5; +17,8] | +13,0 [+8,5; +17,5] | +3,5 [−3,2; +10,2] | +3,5 [−3,8; +10,9] |

A40: in 480 von 480 Paaren sind die ersten 40 Züge gleich denen von M0.

A80: in 480 von 480 Paaren sind die ersten 80 Züge gleich denen von M0.

Kontrolle: 20 von 20 Partien gleich wie in der früheren Messung (bestanden)

## Fuego, 100 Spiele

| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |
|---|---:|---:|---:|---:|---:|
| D | 480 | 0 | 0 | 211 (44 %) | +12,3 |
| M0 | 480 | 0 | 0 | 183 (38 %) | +2,2 |
| A40 | 480 | 0 | 0 | 218 (45 %) | +13,1 |
| A80 | 480 | 0 | 0 | 208 (43 %) | +9,2 |

Gegen D, gepaart, Intervall mit alpha 0,05/2 (97,5 %):

| Arm − D | Paare | Differenz | 97,5 % | SD der Differenzen | standardisiert | Siege Arm / D | erste Abweichung (Median) |
|---|---:|---:|---|---:|---:|---|---:|
| A40 | 480 | +0,8 | [−8,3; +9,9] | 88,9 | +0,01 | 218 / 211 | Zug 8 |
| A80 | 480 | −3,1 | [−11,9; +5,6] | 85,3 | −0,05 | 208 / 211 | Zug 8 |

Phasenprofil, Arm − D nach GNU Gos Schätzung (97,5 %):

| Arm − D | Zug 40 | Zug 80 | Zug 120 | Zug 200 | Ende |
|---|---|---|---|---|---|
| A40 | +34,9 [+31,3; +38,5] | +12,9 [+8,0; +17,8] | +9,6 [+3,5; +15,6] | +6,3 [−2,8; +15,3] | +0,8 [−8,3; +9,9] |
| A80 | +34,9 [+31,3; +38,5] | +34,4 [+30,0; +38,8] | +14,9 [+9,4; +20,3] | −1,4 [−9,7; +6,9] | −3,1 [−11,9; +5,6] |

A40: in 480 von 480 Paaren sind die ersten 40 Züge gleich denen von M0.

A80: in 480 von 480 Paaren sind die ersten 80 Züge gleich denen von M0.

Kontrolle: 20 von 20 Partien gleich wie in der früheren Messung (bestanden)

## Unterschied der Gegner

Δ_Fuego − Δ_GNU Go je Arm (Welch, 97,5 %); positiv: das Abschalten kostet gegen Fuego weniger.

| Arm | Δ_f − Δ_g | 97,5 % | standardisiert f − g |
|---|---:|---|---:|
| A40 | +4,5 | [−7,3; +16,3] | +0,08 |
| A80 | −6,6 | [−18,0; +4,8] | −0,11 |

## Urteil über M1 (vorab festgelegt)

- A40: **nicht belegt**
- A80: **nicht belegt**

## M2: Selbstspiel gegen D, ohne Aufgabe

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **A40** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,musterAb=40,resignEnabled=0` | 360 | 160 | **44,4 %** | [39,4 %; 49,6 %] | 0,0397 | 68 von 180 | 92 von 180 | 0 | 371,7 | signifikant unter 50 % |

- 12 Teile, Seeds 20262201 bis 20262212
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 160 von 360 (p = 0,0397)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **A80** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,musterAb=80,resignEnabled=0` | 360 | 100 | **27,8 %** | [23,4 %; 32,6 %] | 1,5 · 10⁻17 | 40 von 180 | 60 von 180 | 0 | 375,5 | signifikant unter 50 % |

- 12 Teile, Seeds 20262301 bis 20262312
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 100 von 360 (p = 1,5 · 10⁻17)

