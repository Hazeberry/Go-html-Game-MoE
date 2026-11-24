<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# S1 — Rohwerte je Teillauf

Messung zum Rauschterm der Bewertung, Vergleich S1: `evalStreuung` 1 (Arm A) gegen 0 (Arm B).
Festlegung: `docs/eval-streuung-vorabfestlegung.md` §6 und §10. Gestartet am 23.11.2026 um 23:30 UTC
auf `main` `c756763`, vier Dispatches von `ab-harness.yml`.

Beide Arme: `mctsFixedSims=120,resignEnabled=0`, Zug-Limit 600, `paired 0`, Komi 7,5, ohne Vorgabe.
Sie unterscheiden sich in genau einem `PARAMS`-Wert.

## Ergebnis je Teillauf

| Lauf | Seed | A : B | Siegrate B | p (einzeln) | Laufzeit | Sims/Zug A : B | Aufgaben |
|---|---:|---:|---:|---:|---:|---:|---:|
| [134](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45289369101) | 20261123 | 43 : 47 | 52,2 % | 0,7520 | 43,5 min | 111 : 112 | 0 / 0 |
| [135](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45289380117) | 20261124 | 44 : 46 | 51,1 % | 0,9161 | 43,2 min | 111 : 112 | 0 / 0 |
| [136](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45289396068) | 20261125 | 50 : 40 | 44,4 % | 0,3428 | 41,0 min | 112 : 112 | 0 / 0 |
| [137](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45289408634) | 20261126 | 44 : 46 | 51,1 % | 0,9161 | 43,4 min | 113 : 111 | 0 / 0 |
| **Summe** | | **181 : 179** | **49,72 %** | **0,9580** | | | **0 / 0** |

Die Sims/Zug stehen hier, weil der Workflow selbst darauf hinweist: gleicher Seed erzeugt nur bei
gleicher Simulationszahl gleiche Züge. Die Arme liegen in allen vier Läufen innerhalb von zwei
Simulationen — ein Unterschied in der Siegrate wäre also nicht der Rechenleistung zuzuschreiben.

## Weitere Zeilen des Aggregatblocks

| Lauf | Farbe S : W | Randanteil A : B | Gruppenverlust Ø größter A : B | Zeit je Partie A : B |
|---|---:|---:|---:|---:|
| 134 | 50 : 40 | 34,7 % : 34,5 % | 6,9 : 6,9 | 14,4 s : 14,6 s |
| 135 | 39 : 51 | 34,7 % : 34,6 % | 7,0 : 6,6 | 14,3 s : 14,5 s |
| 136 | 33 : 57 | 34,5 % : 34,6 % | 6,5 : 7,3 | 13,6 s : 13,7 s |
| 137 | 45 : 45 | 35,0 % : 33,6 % | 6,9 : 7,1 | 14,6 s : 14,4 s |

Kein systematischer Unterschied. Der Randanteil liegt in beiden Armen bei rund 34,6 % gegen 20,7 %
beim Menschen — das ist ein bekannter Befund des Projekts und vom Rauschterm unberührt.

## Anomalien

In keinem der vier Logs steht die Zeile `⚠ … illegale KI-Züge abgefangen` (`ab-harness.js` Z. 1744).
Der Harness schreibt sie nur, wenn es Anomalien gab; ihr Fehlen heißt null. Gültigkeitsregel Nr. 5
ist damit erfüllt: 0 von 360, erlaubt waren 7.

## Artefakte

Die `--json`-Dateien und Logs liegen als Actions-Artefakte (Aufbewahrung 90 Tage, bis 21.02.2027).
Diese Session kann sie nicht herunterladen: die Blob-Adresse von Actions ist für sie nicht
freigegeben (HTTP 403 vom Egress-Proxy). Deshalb stehen hier die Kennungen und Prüfsummen, damit
die Dateien identifizierbar bleiben:

| Lauf | Artefakt-ID | SHA-256 des ZIP |
|---|---:|---|
| 134 | 14876955315 | `0622ff7096fa8fa0688b98c7c1640842f9234c8a5b98e7a449b625a1e3719f5a` |
| 135 | 14875702504 | `cbd5f50b57460a764b6d0cd38850fcbec8486ce426545a64537487d5a9282b73` |
| 136 | 14875961902 | `3c049061963bd53b44f72636c89bc17a4b6570580d319be888b9561e9ef298bb` |
| 137 | 14875997242 | `5ca172820e8cf7edcb0b2be98f4361ac1a3405088dd8d03886a41803ed454f1b` |

Die Zahlen in den Tabellen oben stammen aus dem Aggregatblock der vier Job-Logs, die über die
GitHub-API lesbar sind. Das ist dieselbe Ausgabe derselben Partien, nur anders serialisiert als im
JSON — aber es ist eine andere Quelle, und das steht hier, damit niemand annimmt, die Artefakte
seien ausgewertet worden.
