# Muster ohne Vorgabe

Seed 226, ohne Vorgabe. Kontrolle GNU Go gegen den Lauf „Leeres Brett“ (docs/daten/leeres-brett/lauf1, Seed 222), Kontrolle Fuego gegen die Partien von D dieses Laufs.

## Gegen GNU Go und Fuego

## GNU Go Stufe 1, ohne Vorgabe

| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |
|---|---:|---:|---:|---:|---:|
| D | 480 | 0 | 0 | 11 (2 %) | −82,1 |
| M0 | 480 | 0 | 0 | 13 (3 %) | −64,0 |
| M50 | 480 | 0 | 0 | 21 (4 %) | −66,9 |
| MW0 | 480 | 0 | 0 | 14 (3 %) | −69,0 |

Gegen D, gepaart, Intervall mit alpha 0,05/3 (98,3 %):

| Arm − D | Paare | Differenz | 98,3 % | SD der Differenzen | standardisiert | Siege Arm / D | erste Abweichung (Median) |
|---|---:|---:|---|---:|---:|---|---:|
| M0 | 480 | +18,1 | [+11,9; +24,4] | 56,8 | +0,40 | 13 / 11 | Zug 2 |
| M50 | 480 | +15,2 | [+8,5; +22,0] | 61,4 | +0,34 | 21 / 11 | Zug 2 |
| MW0 | 480 | +13,1 | [+8,5; +17,7] | 42,2 | +0,29 | 14 / 11 | Zug 2 (240 gleich) |

Phasenprofil, Arm − D nach GNU Gos Schätzung (98,3 %):

| Arm − D | Zug 40 | Zug 80 | Zug 120 | Zug 200 | Ende |
|---|---|---|---|---|---|
| M0 | +31,0 [+27,9; +34,1] | +30,0 [+25,8; +34,1] | +12,9 [+8,5; +17,4] | +16,0 [+10,3; +21,7] | +18,1 [+11,9; +24,4] |
| M50 | +17,2 [+14,3; +20,1] | +15,5 [+11,3; +19,7] | +9,5 [+4,5; +14,4] | +12,8 [+6,7; +18,9] | +15,2 [+8,5; +22,0] |
| MW0 | +18,0 [+15,3; +20,7] | +14,2 [+10,8; +17,5] | +6,8 [+3,4; +10,1] | +10,3 [+6,0; +14,7] | +13,1 [+8,5; +17,7] |

Arm − D je Farbe der KI (98,3 %):

| Arm − D | KI Schwarz | KI Weiß |
|---|---|---|
| M0 | +10,0 [+1,4; +18,7] (240) | +26,2 [+17,4; +35,1] (240) |
| M50 | +4,9 [−3,9; +13,7] (240) | +25,6 [+15,5; +35,6] (240) |
| MW0 | +0,0 [+0,0; +0,0] (240) | +26,2 [+17,4; +35,1] (240) |

Verteilung des Endstands je Arm (aus Sicht der KI) und Steine, die die KI im Mittel verliert bzw. schlägt:

| Arm | Partien | Min | 10 % | 25 % | Median | 75 % | 90 % | Max | SD | verloren Ø | geschlagen Ø |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D | 480 | −243,5 | −141,7 | −109,5 | −80,0 | −50,5 | −26,5 | +45,5 | 45,3 | 21,5 | 13,9 |
| M0 | 480 | −181,5 | −106,6 | −85,5 | −64,5 | −39,5 | −21,5 | +71,5 | 37,1 | 20,2 | 14,7 |
| M50 | 480 | −256,5 | −120,5 | −92,5 | −65,0 | −42,3 | −21,4 | +113,5 | 43,1 | 19,2 | 14,6 |
| MW0 | 480 | −216,5 | −118,7 | −93,8 | −71,0 | −40,5 | −22,4 | +52,5 | 39,5 | 19,1 | 14,2 |

Kontrolle: 20 von 20 Partien gleich wie im Lauf „Leeres Brett“ (Seed 222) (bestanden)

## Fuego, 100 Spiele, ohne Vorgabe

| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |
|---|---:|---:|---:|---:|---:|
| D | 480 | 0 | 0 | 73 (15 %) | −25,1 |
| M0 | 480 | 0 | 0 | 43 (9 %) | −24,5 |
| M50 | 480 | 0 | 0 | 49 (10 %) | −25,5 |
| MW0 | 480 | 0 | 0 | 44 (9 %) | −29,2 |

Gegen D, gepaart, Intervall mit alpha 0,05/3 (98,3 %):

| Arm − D | Paare | Differenz | 98,3 % | SD der Differenzen | standardisiert | Siege Arm / D | erste Abweichung (Median) |
|---|---:|---:|---|---:|---:|---|---:|
| M0 | 480 | +0,6 | [−5,4; +6,6] | 54,8 | +0,01 | 43 / 73 | Zug 2 |
| M50 | 480 | −0,3 | [−6,5; +5,8] | 56,3 | −0,01 | 49 / 73 | Zug 2 |
| MW0 | 480 | −4,1 | [−8,6; +0,4] | 41,2 | −0,09 | 44 / 73 | Zug 2 (240 gleich) |

Phasenprofil, Arm − D nach GNU Gos Schätzung (98,3 %):

| Arm − D | Zug 40 | Zug 80 | Zug 120 | Zug 200 | Ende |
|---|---|---|---|---|---|
| M0 | +15,4 [+13,1; +17,7] | +33,6 [+29,5; +37,7] | +19,3 [+14,2; +24,3] | +7,3 [+0,6; +14,0] | +0,6 [−5,4; +6,6] |
| M50 | +6,8 [+4,6; +9,1] | +10,6 [+6,7; +14,5] | +0,5 [−4,7; +5,8] | −2,2 [−9,0; +4,7] | −0,3 [−6,5; +5,8] |
| MW0 | +8,1 [+6,2; +10,0] | +16,1 [+12,8; +19,5] | +7,7 [+4,1; +11,3] | −1,4 [−6,2; +3,3] | −4,1 [−8,6; +0,4] |

Arm − D je Farbe der KI (98,3 %):

| Arm − D | KI Schwarz | KI Weiß |
|---|---|---|
| M0 | +9,4 [+1,6; +17,1] (240) | −8,2 [−17,2; +0,8] (240) |
| M50 | +5,5 [−2,9; +13,8] (240) | −6,1 [−15,2; +2,9] (240) |
| MW0 | +0,0 [+0,0; +0,0] (240) | −8,2 [−17,2; +0,8] (240) |

Verteilung des Endstands je Arm (aus Sicht der KI) und Steine, die die KI im Mittel verliert bzw. schlägt:

| Arm | Partien | Min | 10 % | 25 % | Median | 75 % | 90 % | Max | SD | verloren Ø | geschlagen Ø |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D | 480 | −186,5 | −74,5 | −50,5 | −26,5 | −7,5 | +31,6 | +132,5 | 45,3 | 31,5 | 31,7 |
| M0 | 480 | −171,5 | −64,6 | −38,5 | −20,5 | −7,5 | −0,5 | +95,5 | 31,2 | 32,7 | 29,2 |
| M50 | 480 | −156,5 | −68,5 | −46,5 | −22,5 | −6,5 | +0,9 | +125,5 | 34,4 | 32,1 | 29,9 |
| MW0 | 480 | −186,5 | −74,5 | −46,5 | −23,5 | −8,5 | −0,5 | +91,5 | 35,4 | 33,1 | 29,3 |

Kontrolle: 20 von 20 Partien gleich wie in den Partien von D dieses Laufs (bestanden)

## Unterschied der Gegner

Δ_Fuego − Δ_GNU Go je Arm (Welch, 98,3 %); positiv: das Abschalten kostet gegen Fuego weniger.

| Arm | Δ_f − Δ_g | 98,3 % | standardisiert f − g |
|---|---:|---|---:|
| M0 | −17,6 | [−26,2; −8,9] | −0,39 |
| M50 | −15,6 | [−24,7; −6,5] | −0,34 |
| MW0 | −17,2 | [−23,7; −10,8] | −0,38 |

## Urteil gegen die externen Gegner (vorab festgelegt; MW0 erkundend, ohne Urteil)

- M0: **nicht belegt**
- M50: **nicht belegt**

## Selbstspiel gegen D, ohne Aufgabe

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **M0** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,musterOhneVorgabe=0,resignEnabled=0` | 360 | 97 | **26,9 %** | [22,6 %; 31,8 %] | 8,1 · 10⁻19 | 43 von 180 | 54 von 180 | 0 | 366,2 | signifikant unter 50 % |

- 12 Teile, Seeds 20262501 bis 20262512
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 97 von 360 (p = 8,1 · 10⁻19)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **M50** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,musterOhneVorgabe=0.5,resignEnabled=0` | 360 | 164 | **45,6 %** | [40,5 %; 50,7 %] | 0,1022 | 64 von 180 | 100 von 180 | 0 | 370,2 | nicht signifikant |

- 12 Teile, Seeds 20262601 bis 20262612
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 164 von 360 (p = 0,1022)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **MW0** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,musterWeissOhneVorgabe=0,resignEnabled=0` | 360 | 139 | **38,6 %** | [33,7 %; 43,7 %] | 1,8 · 10⁻5 | 86 von 180 | 53 von 180 | 0 | 371,0 | signifikant unter 50 % |

- 12 Teile, Seeds 20262701 bis 20262712
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 139 von 360 (p = 1,8 · 10⁻5)

