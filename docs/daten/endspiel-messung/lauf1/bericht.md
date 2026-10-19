# Messung M1: 240 Paare gegen GNU Go

Basis `63f727b`, Tabelle von B: `docs/daten/dagger/runde3-lauf3/tabelle-neu.json`, Gewicht 200, Seed 206. Arm A: Default (`musterEndspiel` 0), Arm B: `musterEndspiel` 200.

## Endstand, gepaart nach Partienummer

| Arm | Partien | Endstand Ø | Siege |
|---|---:|---:|---:|
| A | 240 | 20,8 | 149 |
| B | 240 | 17,1 | 132 |

| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---:|---|---:|---|---|---:|
| **B − A** | 240 | **−3,7** | [−10,7; +3,3] | 0,3016 | −3,8 / −3,6 | 132 gegen 149 | +0,1 |

Als Text:

```
Arm A: 240 Partien, Endstand Ø 20.8, Siege 149
Arm B: 240 Partien, Endstand Ø 17.1, Siege 132
B − A: 240 Paare · Ø 17.1 gegen 20.8 · Differenz −3,7 (SD 55.0), 95 %: [−10,7; +3,3], t = -1.04, p = 0,3016 · Hälften −3,8 / −3,6 · Siege 132 gegen 149 · besser 135, schlechter 102 · nach Zug 120: +0,1 (p = 0,9395)
```

## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)

```
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 73.7 · B Ø 73.8 · Differenz B − A 0.1 (SD 22.3) · t = 0.08, p = 0.9395
nach Zug 200: 152 Paare (88 ohne Partner/abgebrochen) · A Ø 17.9 · B Ø 11.7 · Differenz B − A -6.3 (SD 38.7) · t = -1.99, p = 0.0484
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 20.8 · B Ø 17.1 · Differenz B − A -3.7 (SD 55.0) · t = -1.04, p = 0.3016
```

## Zusatzzahlen

```
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 241.6, B Ø 227.0
Median der Differenz B − A: +6,0
Vorzeichentest: B besser in 135 Paaren, schlechter in 102, gleich in 3 · p = 0,0374 (zweiseitig, exakt)
```
