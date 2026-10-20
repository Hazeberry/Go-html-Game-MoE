# Messung zu bensonAliveExempt: 240 Paare gegen GNU Go

Seed 206. Arm A: Default (`bensonAliveExempt` 0), Arm B: `bensonAliveExempt` 1.

## Endstand, gepaart nach Partienummer

| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|---:|---:|
| A | `Default` | 240 | 0 | +20,8 | 149 | 241,6 |
| B | `bensonAliveExempt=1` | 240 | 0 | +22,1 | 152 | 241,1 |

| Arm | Paare | Differenz zu A | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich A | Urteil (alpha 0,05) |
|---|---:|---:|---|---:|---|---|---:|---:|---|
| **B** | 240 | **+1,3** | [−1,3; +4,0] | 0,3236 | −0,1 / +2,7 | 152 gegen 149 | +0,0 | 77 von 240 | verworfen: kein Gewinn von 10 |
 - Kontrolle gegen docs/daten/endspiel-messung/lauf1/A.jsonl.gz, Arm A: 240 von 240 Partien mit gleichem Endstand und gleicher Zugzahl

Als Text:

```
Arm A (Default): 240 Partien, 0 abgebrochen, Endstand Ø +20,8, Siege 149, Züge Ø 241,6
Arm B (bensonAliveExempt=1): 240 Partien, 0 abgebrochen, Endstand Ø +22,1, Siege 152, Züge Ø 241,1

B − A: 240 Paare · Differenz +1,3 (SD 20,9), 95 %: [−1,3; +4,0], p = 0,3236 · Hälften −0,1 / +2,7 · Siege 152 gegen 149 · nach Zug 120: +0,0 (p = 1,0000) · Zug für Zug gleich A: 77 von 240 → verworfen: kein Gewinn von 10
 Kontrolle gegen docs/daten/endspiel-messung/lauf1/A.jsonl.gz, Arm A: 240 von 240 Partien mit gleichem Endstand und gleicher Zugzahl
```

## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)

```
nach Zug 120: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 73.7 · B Ø 73.7 · Differenz B − A 0.0 (SD 0.0) · t = NaN, p = NaN
nach Zug 200: 187 Paare (53 ohne Partner/abgebrochen) · A Ø 22.7 · B Ø 23.8 · Differenz B − A 1.1 (SD 10.3) · t = 1.50, p = 0.1354
Endstand: 240 Paare (0 ohne Partner/abgebrochen) · A Ø 20.8 · B Ø 22.1 · Differenz B − A 1.3 (SD 20.9) · t = 0.99, p = 0.3236
```

## Zusatzzahlen

```
Paare: 240 (0 ohne Partner oder abgebrochen), abgebrochene Partien: A 0, B 0
Züge je Partie: A Ø 241.6, B Ø 241.1
Median der Differenz B − A: +0,0
Vorzeichentest: B besser in 46 Paaren, schlechter in 37, gleich in 157 · p = 0,3800 (zweiseitig, exakt)
```
