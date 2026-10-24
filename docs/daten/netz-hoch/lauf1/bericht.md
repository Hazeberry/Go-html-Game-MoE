# Höhere Dosis des Endspiel-Netzes

Seed 217 gegen GNU Go mit sechs Vorgabesteinen; Selbstspiel ohne Aufgabe, L9 ab Seed 20261901, L10 ab Seed 20262001.

## M1: Endstand, gepaart nach Partienummer (alpha 0,025 je Vergleich)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +24,1 | 157 | 300,7 |
| L9 | `endspielNetz=0.9` | 240 | 0 | +22,3 | 161 | 303,5 |
| L10 | `endspielNetz=1` | 240 | 0 | +20,1 | 159 | 308,0 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,025) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **L9** | 240 | **−1,9** | [−9,3; +5,6] | 0,6241 | −0,5 / −3,2 | 161 gegen 157 | −0,4 | 0 von 240 | verworfen: kein Gewinn von 10 |
| **L10** | 240 | **−4,1** | [−11,4; +3,2] | 0,2741 | −3,8 / −4,3 | 159 gegen 157 | −0,6 | 0 von 240 | verworfen: kein Gewinn von 10 |

## M2: Selbstspiel gegen den Default, ohne Aufgabe

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **L9** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,endspielNetz=0.9,resignEnabled=0` | 360 | 179 | **49,7 %** | [44,6 %; 54,9 %] | 0,9580 | 97 von 180 | 82 von 180 | 0 | 377,4 | nicht signifikant |

- 12 Teile, Seeds 20261901 bis 20261912
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 179 von 360 (p = 0,9580)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **L10** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,endspielNetz=1,resignEnabled=0` | 360 | 191 | **53,1 %** | [47,9 %; 58,2 %] | 0,2684 | 96 von 180 | 95 von 180 | 0 | 380,1 | nicht signifikant |

- 12 Teile, Seeds 20262001 bis 20262012
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 191 von 360 (p = 0,2684)

## Siege, gepaart (McNemar, sekundär)

| Arm | Siege | Siege A | nur Arm | nur A | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **L9** | 161 | 157 | 34 | 30 | 127 | 49 | 0,7080 |
| **L10** | 159 | 157 | 26 | 24 | 133 | 57 | 0,8877 |

## Kontrolle

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| K | `Default` | 15 | 0 | +33,6 | 12 | 304,1 |

| Arm | Paare | Differenz zu K | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich K | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
 - Kontrolle gegen docs/daten/netz-dosis/lauf1/L8.jsonl.gz, Arm K: 15 von 15 Partien mit gleichem Endstand und gleicher Zugzahl

## Nach Zug 120, nach Zug 200 und am Ende

```
== L9 − A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 36.3 · B Ø 35.9 · Differenz B − A -0.4 (SD 24.5) · t = -0.26, p = 0.7978
nach Zug 200: 231 Paare (9 ohne Partner/abgebrochen) · A Ø 25.6 · B Ø 26.9 · Differenz B − A 1.2 (SD 50.5) · t = 0.37, p = 0.7099
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 24.1 · B Ø 22.3 · Differenz B − A -1.9 (SD 58.7) · t = -0.49, p = 0.6241

== L10 − A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 36.3 · B Ø 35.7 · Differenz B − A -0.6 (SD 25.6) · t = -0.33, p = 0.7395
nach Zug 200: 231 Paare (9 ohne Partner/abgebrochen) · A Ø 26.2 · B Ø 28.3 · Differenz B − A 2.1 (SD 52.2) · t = 0.60, p = 0.5509
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 24.1 · B Ø 20.1 · Differenz B − A -4.1 (SD 57.4) · t = -1.10, p = 0.2741

```

## Zusatzzahlen

```
== L9 − A
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 300.7, B Ø 303.5
Median der Differenz B − A: +2,0
Vorzeichentest: B besser in 123 Paaren, schlechter in 115, gleich in 2 · p = 0,6501 (zweiseitig, exakt)

== L10 − A
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 300.7, B Ø 308.0
Median der Differenz B − A: +0,0
Vorzeichentest: B besser in 114 Paaren, schlechter in 118, gleich in 8 · p = 0,8439 (zweiseitig, exakt)

```
