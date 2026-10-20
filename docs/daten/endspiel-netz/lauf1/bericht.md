# Messung des Endspiel-Netzes: 240 Paare gegen GNU Go, 360 Partien im Selbstspiel

Seed 213 gegen GNU Go, Seeds ab 20261401 im Selbstspiel. Arm A: Default (`endspielNetz` 0), Arm N: `endspielNetz` 0,5.

## M1: Endstand, gepaart nach Partienummer (alpha 0,05)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +18,9 | 149 | 242,0 |
| N | `endspielNetz=0.5` | 240 | 0 | +65,9 | 227 | 253,4 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,05) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **N** | 240 | **+46,9** | [+40,4; +53,4] | 1,0 · 10⁻33 | +43,8 / +50,1 | 227 gegen 149 | +7,5 | 0 von 240 | besser: Kandidat |

## M2: Selbstspiel gegen den Default

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **N** | `mctsFixedSims=120` | `mctsFixedSims=120,endspielNetz=0.5` | 360 | 299 | **83,1 %** | [78,8 %; 86,6 %] | 8,2 · 10⁻39 | 160 von 180 | 139 von 180 | 279 | 260,8 | signifikant über 50 % |

- 12 Teile, Seeds 20261401 bis 20261412

## Siege, gepaart (McNemar, sekundär)

| Arm | Siege | Siege A | nur Arm | nur A | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **N** | 227 | 149 | 81 | 3 | 146 | 10 | 1,0 · 10⁻20 |

## Kontrolle

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| K | `Default` | 15 | 0 | +17,4 | 8 | 241,7 |

| Arm | Paare | Differenz zu K | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich K | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
 - Kontrolle gegen docs/daten/parameter-reihe/lauf1/A.jsonl.gz, Arm K: 15 von 15 Partien mit gleichem Endstand und gleicher Zugzahl

## Nach Zug 120, nach Zug 200 und am Ende

```
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 77.3 · B Ø 84.8 · Differenz B − A 7.5 (SD 20.6) · t = 5.63, p = 5.1e-8
nach Zug 200: 177 Paare (63 ohne Partner/abgebrochen) · A Ø 22.4 · B Ø 67.8 · Differenz B − A 45.4 (SD 42.9) · t = 14.09, p = 1.1e-30
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 18.9 · B Ø 65.9 · Differenz B − A 46.9 (SD 51.0) · t = 14.24, p = 1.0e-33
```

## Zusatzzahlen

```
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 242.0, B Ø 253.4
Median der Differenz B − A: +44,0
Vorzeichentest: B besser in 192 Paaren, schlechter in 42, gleich in 6 · p = 0,0000 (zweiseitig, exakt)
```
