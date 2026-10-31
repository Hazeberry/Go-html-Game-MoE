# Lauf 3 von komi-k.yml: explorative Gegenproben (31.10.2026)

Aus dem Job-Protokoll von Lauf 3 abgeschrieben (Run 41214877919, `main` ca85a1e). Die Dateien liegen dort auch als Artefakt `komi-k`. Das Urteil aus §5 bleibt; dies ist explorativ.

## gnugo: d aus GNU Gos final_score, alle brauchbaren Partien

| Zug | Stellungen | zu kurz | R² | u | 95 % von u | k = 7,5 · u |
|---:|---:|---:|---:|---:|---|---:|
| 200 | 2399 | 0 | 0,049 | 4,504 | 4,321 bis 4,684 | 33,780 |
| 240 | 2391 | 8 | 0,124 | 5,811 | 5,581 bis 6,056 | 43,584 |
| 280 | 2257 | 142 | 0,284 | 7,721 | 7,428 bis 8,010 | 57,909 |

Abweichung der k-Werte bei 200 und 280 vom Wert bei 240: 22,5 % und 32,9 %. R² unter 0,25 bei Zug 200 und 240.

## gleiche: d aus eigener Zählung, nur Partien, die Zug 280 erreichen (2257)

| Zug | Stellungen | R² | u | 95 % von u | k = 7,5 · u |
|---:|---:|---:|---:|---|---:|
| 200 | 2257 | 0,322 | 6,096 | 5,869 bis 6,324 | 45,719 |
| 240 | 2257 | 0,313 | 7,926 | 7,643 bis 8,224 | 59,445 |
| 280 | 2257 | 0,338 | 10,415 | 10,085 bis 10,763 | 78,110 |

Abweichung: 23,1 % und 31,4 %.

## gnugo-gleiche: d aus GNU Gos final_score, nur die 2257 Partien

| Zug | Stellungen | R² | u | 95 % von u | k = 7,5 · u |
|---:|---:|---:|---:|---|---:|
| 200 | 2257 | 0,062 | 4,519 | 4,331 bis 4,712 | 33,895 |
| 240 | 2257 | 0,139 | 5,876 | 5,630 bis 6,127 | 44,071 |
| 280 | 2257 | 0,284 | 7,721 | 7,428 bis 8,010 | 57,909 |

Abweichung: 23,1 % und 31,4 %. R² unter 0,25 bei Zug 200 und 240.

Vergleich: Das Nachspielen stimmt in allen Varianten (Gefangene bei 2399 bzw. 2257 von 2399 bzw. 2257 Partien wie im Datensatz).
