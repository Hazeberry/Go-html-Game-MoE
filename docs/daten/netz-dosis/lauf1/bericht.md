# Dosis des Endspiel-Netzes

Seed 216 gegen GNU Go mit sechs Vorgabesteinen; Selbstspiel ohne Aufgabe, L8 ab Seed 20261701, T8 ab Seed 20261801.

## M1: Endstand, gepaart nach Partienummer (alpha 0,025 je Vergleich)

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +3,3 | 123 | 265,8 |
| L8 | `endspielNetz=0.8` | 240 | 0 | +18,8 | 154 | 296,3 |
| T8 | `endspielNetzTop=8` | 240 | 0 | +4,6 | 120 | 265,0 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,025) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **L8** | 240 | **+15,5** | [+7,9; +23,1] | 7,5 · 10⁻5 | +16,3 / +14,7 | 154 gegen 123 | +5,0 | 0 von 240 | besser: Kandidat |
| **T8** | 240 | **+1,3** | [−6,0; +8,6] | 0,7285 | +5,4 / −2,8 | 120 gegen 123 | +1,5 | 0 von 240 | verworfen: kein Gewinn von 10 |

## M2: Selbstspiel gegen den Default, ohne Aufgabe

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **L8** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,endspielNetz=0.8,resignEnabled=0` | 360 | 203 | **56,4 %** | [51,2 %; 61,4 %] | 0,0176 | 102 von 180 | 101 von 180 | 0 | 371,9 | signifikant über 50 % |

- 12 Teile, Seeds 20261701 bis 20261712
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 203 von 360 (p = 0,0176)

| Arm | A | B | Partien | Siege B | Rate B | 95 % | p | B als Schwarz | B als Weiß | Aufgaben | Züge Ø | Urteil |
|---|---|---|---:|---:|---:|---|---:|---|---|---:|---:|---|
| **T8** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=120,endspielNetzTop=8,resignEnabled=0` | 360 | 184 | **51,1 %** | [46,0 %; 56,2 %] | 0,7122 | 96 von 180 | 88 von 180 | 0 | 347,9 | nicht signifikant |

- 12 Teile, Seeds 20261801 bis 20261812
- Aufgaben: B 0, A 0 · ausgezählt: B gewinnt 184 von 360 (p = 0,7122)

## Siege, gepaart (McNemar, sekundär)

| Arm | Siege | Siege A | nur Arm | nur A | beide | keiner | McNemar p |
|---|---:|---:|---:|---:|---:|---:|---:|
| **L8** | 154 | 123 | 55 | 24 | 99 | 62 | 0,0006 |
| **T8** | 120 | 123 | 36 | 39 | 84 | 81 | 0,8176 |

## Kontrolle

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| K | `Default` | 15 | 0 | +5,7 | 8 | 249,5 |

| Arm | Paare | Differenz zu K | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich K | Urteil (alpha 0,005) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
 - Kontrolle gegen docs/daten/pruefstand/lauf1/vorgabe-6.jsonl.gz, Arm K: 15 von 15 Partien mit gleichem Endstand und gleicher Zugzahl

## Nach Zug 120, nach Zug 200 und am Ende

```
== L8 − A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 27.5 · B Ø 32.5 · Differenz B − A 5.0 (SD 25.1) · t = 3.10, p = 0.0022
nach Zug 200: 233 Paare (7 ohne Partner/abgebrochen) · A Ø 14.3 · B Ø 22.6 · Differenz B − A 8.3 (SD 56.1) · t = 2.27, p = 0.0240
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 3.3 · B Ø 18.8 · Differenz B − A 15.5 (SD 59.6) · t = 4.03, p = 7.5e-5

== T8 − A
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 27.5 · B Ø 29.0 · Differenz B − A 1.5 (SD 25.2) · t = 0.92, p = 0.3585
nach Zug 200: 231 Paare (9 ohne Partner/abgebrochen) · A Ø 14.6 · B Ø 11.6 · Differenz B − A -3.0 (SD 52.0) · t = -0.87, p = 0.3851
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 3.3 · B Ø 4.6 · Differenz B − A 1.3 (SD 57.6) · t = 0.35, p = 0.7285

```

## Zusatzzahlen

```
== L8 − A
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 265.8, B Ø 296.3
Median der Differenz B − A: +12,0
Vorzeichentest: B besser in 144 Paaren, schlechter in 92, gleich in 4 · p = 0,0009 (zweiseitig, exakt)

== T8 − A
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 265.8, B Ø 265.0
Median der Differenz B − A: +1,0
Vorzeichentest: B besser in 120 Paaren, schlechter in 117, gleich in 3 · p = 0,8967 (zweiseitig, exakt)

```
