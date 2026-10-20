# Prüfung von mctsPriorSharp 9 auf dem Default mit Endspiel-Netz

Seed 214 gegen GNU Go; Selbstspiel ohne Aufgabe ab Seed 20261501, mit Aufgabe ab Seed 20261601.

## M1: Endstand, gepaart nach Partienummer (alpha 0,05)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +63,4 | 222 | 255,4 |
| S9 | `mctsPriorSharp=9` | 240 | 0 | +52,0 | 197 | 230,9 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,05) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **S9** | 240 | **−11,4** | [−18,4; −4,5] | 0,0014 | −13,9 / −9,0 | 197 gegen 222 | −1,5 | 0 von 240 | schlechter |

## M2 und M3: Selbstspiel gegen den Default

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **M2 (ohne Aufgabe)** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,mctsPriorSharp=9,resignEnabled=0` | 360 | 95 | **26,4 %** | [22,1 %; 31,2 %] | 1,1 · 10⁻19 | 47 von 180 | 48 von 180 | 0 | 350,6 | signifikant unter 50 % |

- 12 Teile, Seeds 20261501 bis 20261512
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 95 von 360 (p = 1,1 · 10⁻19)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **M3 (mit Aufgabe)** | `mctsFixedSims=120` | `mctsFixedSims=120,mctsPriorSharp=9` | 360 | 67 | **18,6 %** | [14,9 %; 23,0 %] | 8,0 · 10⁻35 | 29 von 180 | 38 von 180 | 287 | 260,2 | signifikant unter 50 % |

- 12 Teile, Seeds 20261601 bis 20261612
- Aufgaben: B 256, A 31 · ausgezählt: B gewinnt 36 von 73 (p = 1,0000)

## Siege, gepaart (McNemar, sekundär)

| Arm | Siege | Siege A | nur Arm | nur A | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **S9** | 197 | 222 | 13 | 38 | 184 | 5 | 0,0006 |

## Kontrolle

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| K | `Default` | 15 | 0 | +70,7 | 15 | 262,6 |

| Arm | Paare | Differenz zu K | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich K | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
 - Kontrolle gegen docs/daten/endspiel-netz/lauf1/N.jsonl.gz, Arm K: 15 von 15 Partien mit gleichem Endstand und gleicher Zugzahl

## Nach Zug 120, nach Zug 200 und am Ende

```
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 81.3 · B Ø 79.8 · Differenz B − A -1.5 (SD 35.8) · t = -0.66, p = 0.5095
nach Zug 200: 192 Paare (48 ohne Partner/abgebrochen) · A Ø 66.8 · B Ø 56.9 · Differenz B − A -9.9 (SD 52.5) · t = -2.61, p = 0.0098
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 63.4 · B Ø 52.0 · Differenz B − A -11.4 (SD 54.8) · t = -3.23, p = 0.0014
```

## Zusatzzahlen

```
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 255.4, B Ø 230.9
Median der Differenz B − A: −4,0
Vorzeichentest: B besser in 104 Paaren, schlechter in 126, gleich in 10 · p = 0,1660 (zweiseitig, exakt)
```
