<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Vielfaltsmessung — Werte je Block

Festlegung: `docs/eval-streuung-vielfalt-vorabfestlegung.md`. Zwanzig Teilläufe von `ab-harness.yml`
(#142 bis #161) auf `main` `6b1332d`, gestartet am 25.11.2026 um 01:49 UTC, je 30 Partien mit `roh=1`,
`mctsFixedSims=120`, `resignEnabled=0`, Zug-Limit 600, Komi 7,5, ohne Vorgabe, `paired 0`.

Jeder Arm spielt **gegen sich selbst**: V1 mit `evalStreuung` 1 auf beiden Seiten, V0 mit 0.
Ausgewertet mit `auswertung/eval-streuung-vielfalt.js` über
[Lauf 45531129203](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45531129203), 33 Sekunden.

## Primärer Endpunkt: Kollisionsrate q des ersten Zugs

| Seed | q (V1) | q (V0) | Differenz |
|---:|---:|---:|---:|
| 20261201 | 0,2437 | 0,2713 | +0,0276 |
| 20261202 | 0,2437 | 0,3264 | +0,0828 |
| 20261203 | 0,2713 | 0,2345 | −0,0368 |
| 20261204 | 0,2483 | 0,3471 | +0,0989 |
| 20261205 | 0,2368 | 0,3103 | +0,0736 |
| 20261206 | 0,2437 | 0,2345 | −0,0092 |
| 20261207 | 0,2299 | 0,2920 | +0,0621 |
| 20261208 | 0,2667 | 0,3402 | +0,0736 |
| 20261209 | 0,2345 | 0,2552 | +0,0207 |
| 20261210 | 0,2253 | 0,3126 | +0,0874 |
| **Mittel** | **0,2444** | **0,2924** | |

n_eff = 10 von 10 (kein Gleichstand) · Richtung 8 höher in V0, 2 niedriger · Median der Differenzen
+0,0678 · exakter zweiseitiger Vorzeichentest **p = 0,10938**.

## Sekundär je Block — beschreibend, ohne p-Wert und ohne Intervall

### Arm V1 (`evalStreuung` 1)

| Seed | q | verschiedene erste Züge | Anteil häufigster | Präfix 5 | Präfix 10 | Präfix 30 | Endstellungen | Median erste Abweichung | Züge Ø |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20261201 | 0,2437 | 4 / 30 | 33,3 % | 13 | 20 | 29 | 30 | 1,0 | 377,1 |
| 20261202 | 0,2437 | 4 / 30 | 30,0 % | 12 | 20 | 30 | 30 | 1,0 | 389,3 |
| 20261203 | 0,2713 | 4 / 30 | 36,7 % | 10 | 18 | 29 | 30 | 1,0 | 367,0 |
| 20261204 | 0,2483 | 4 / 30 | 33,3 % | 11 | 18 | 30 | 30 | 1,0 | 381,8 |
| 20261205 | 0,2368 | 4 / 30 | 33,3 % | 13 | 18 | 29 | 30 | 1,0 | 374,1 |
| 20261206 | 0,2437 | 4 / 30 | 30,0 % | 14 | 23 | 29 | 30 | 1,0 | 376,1 |
| 20261207 | 0,2299 | 4 / 30 | 30,0 % | 13 | 21 | 29 | 30 | 1,0 | 368,6 |
| 20261208 | 0,2667 | 4 / 30 | 36,7 % | 10 | 17 | 27 | 30 | 1,0 | 377,5 |
| 20261209 | 0,2345 | 4 / 30 | 30,0 % | 11 | 19 | 30 | 30 | 1,0 | 376,3 |
| 20261210 | 0,2253 | 4 / 30 | 26,7 % | 10 | 17 | 30 | 30 | 1,0 | 378,2 |
| **Mittel** | **0,2444** | **4,0** | **32,0 %** | — | **19,1** | — | **30,0** | **1,0** | **376,6** |

### Arm V0 (`evalStreuung` 0)

| Seed | q | verschiedene erste Züge | Anteil häufigster | Präfix 5 | Präfix 10 | Präfix 30 | Endstellungen | Median erste Abweichung | Züge Ø |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20261201 | 0,2713 | 4 / 30 | 33,3 % | 7 | 11 | 30 | 30 | 1,0 | 369,0 |
| 20261202 | 0,3264 | 4 / 30 | 50,0 % | 9 | 16 | 28 | 30 | 1,0 | 376,3 |
| 20261203 | 0,2345 | 4 / 30 | 33,3 % | 8 | 14 | 30 | 30 | 1,0 | 379,4 |
| 20261204 | 0,3471 | 4 / 30 | 53,3 % | 7 | 11 | 28 | 30 | 1,0 | 377,6 |
| 20261205 | 0,3103 | 4 / 30 | 46,7 % | 6 | 12 | 26 | 30 | 1,0 | 381,6 |
| 20261206 | 0,2345 | 4 / 30 | 30,0 % | 10 | 17 | 29 | 30 | 1,0 | 366,0 |
| 20261207 | 0,2920 | 4 / 30 | 40,0 % | 7 | 14 | 29 | 30 | 1,0 | 367,1 |
| 20261208 | 0,3402 | 4 / 30 | 53,3 % | 9 | 13 | 29 | 30 | 1,0 | 376,8 |
| 20261209 | 0,2552 | 4 / 30 | 33,3 % | 9 | 13 | 30 | 30 | 1,0 | 370,8 |
| 20261210 | 0,3126 | 4 / 30 | 40,0 % | 8 | 13 | 28 | 30 | 1,0 | 378,8 |
| **Mittel** | **0,2924** | **4,0** | **41,3 %** | — | **13,4** | — | **30,0** | **1,0** | **374,3** |

Aufgaben und Anomalien: in allen zwanzig Blöcken 0.

## Diagnose: Siegrate je Block — kein Ausschlussgrund (§6)

Auffällig bei α = 0,05 waren drei von zwanzig Blöcken: Seed 20261201 in V1 mit 9 : 21, Seed 20261208
in V0 mit 21 : 9 und Seed 20261209 in V0 mit 21 : 9, je p = 0,04277. Genau dieser Fall stand in §6
vorab: beide Seiten eines Arms sind identisch, die Zuordnung zu A und B willkürlich, und eine
auffällige Rate kommt bei korrektem Aufbau mit der üblichen Häufigkeit vor. Bei zwanzig Blöcken und
α = 0,05 sind im Mittel eins zu erwarten; drei liegen im Rahmen. Kein Lauf wurde deshalb verworfen,
und ein Aufbaufehler ist nicht nachgewiesen.

## Artefakte

Die zwanzig Artefakte (JSON, Rohdump, Log, Runner-Kontext je Teillauf) liegen bei Actions,
Aufbewahrung 90 Tage. Aus einer Session sind sie nicht herunterladbar; die Zahlen oben kommen aus dem
Bericht, den `eval-streuung-vielfalt.yml` in Actions gerechnet und in die Zusammenfassung geschrieben
hat. Lauf-IDs der Teilläufe:

`45528336526, 45528363907, 45528373527, 45528383145, 45528395079, 45528406498, 45528415732,
45528427320, 45528438153, 45528448134, 45528461115, 45528475104, 45528485373, 45528502108,
45528513827, 45528524868, 45528535690, 45528548522, 45528556913, 45528567839`

Berichtsartefakt: ID 14985485923, SHA-256 `33416dbedb87ab2206d04e0012f8c0aa33dd920cd8b75b108bea1f31cecb6344`.
