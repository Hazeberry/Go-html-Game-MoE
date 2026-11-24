<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# S2 — Rohwerte je Teillauf

Messung zum Rauschterm der Bewertung, Vergleich S2: `evalStreuung` 1 (Arm A) gegen **0,5** (Arm B).
Festlegung: `docs/eval-streuung-vorabfestlegung.md` §6, §10 und §12. Gestartet am 24.11.2026 um 00:57 UTC
auf `main` `e8bb351`, vier Dispatches von `ab-harness.yml` mit **`roh=1`**.

Beide Arme: `mctsFixedSims=120,resignEnabled=0`, Zug-Limit 600, `paired 0`, Komi 7,5, ohne Vorgabe.
Sie unterscheiden sich in genau einem `PARAMS`-Wert.

## Ergebnis je Teillauf

| Lauf | Seed | A : B | Siegrate B | p (einzeln) | Laufzeit | Sims/Zug A : B | Aufgaben |
|---|---:|---:|---:|---:|---:|---:|---:|
| [138](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45301310902) | 20261127 | 40 : 50 | 55,6 % | 0,3428 | 40,8 min | 110 : 112 | 0 / 0 |
| [139](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45301321706) | 20261128 | 49 : 41 | 45,6 % | 0,4608 | 44,1 min | 111 : 110 | 0 / 0 |
| [140](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45301332483) | 20261129 | 40 : 50 | 55,6 % | 0,3428 | 44,1 min | 111 : 112 | 0 / 0 |
| [141](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45301343548) | 20261130 | 47 : 43 | 47,8 % | 0,7520 | 41,1 min | 111 : 113 | 0 / 0 |
| **Summe** | | **176 : 184** | **51,11 %** | **0,7122** | | | **0 / 0** |

## Weitere Zeilen des Aggregatblocks

| Lauf | Farbe S : W | Randanteil A : B | Gruppenverlust ab 5 Steinen A : B | Zeit je Partie A : B |
|---|---:|---:|---:|---:|
| 138 | 45 : 45 | 33,7 % : 35,1 % | 82 : 107 | 13,5 s : 13,7 s |
| 139 | 40 : 50 | 34,4 % : 34,6 % | 89 : 90 | 14,8 s : 14,6 s |
| 140 | 43 : 47 | 33,5 % : 35,2 % | 77 : 84 | 14,7 s : 14,7 s |
| 141 | 44 : 46 | 34,2 % : 35,0 % | 77 : 104 | 13,6 s : 13,8 s |

## Anomalien

In keinem der vier Logs steht die Zeile `⚠ … illegale KI-Züge abgefangen`. 0 von 360, erlaubt waren 7.

## Artefakte

Mit `roh=1` enthält jedes Artefakt **vier** Dateien statt drei (JSON, Log, Runner-Kontext, **Rohdump**) und
ist rund 470 KB statt 29 KB groß — der Rohdump mit `final_board_hash` je Partie ist also geschrieben.
Aufbewahrung 90 Tage, bis 22.02.2027.

Diese Session kann die Artefakte nicht herunterladen: die Blob-Adresse von Actions ist für sie nicht
freigegeben (HTTP 403 vom Egress-Proxy). Die Zahl verschiedener Endstellungen bleibt daher auch für S2
unberechnet, obwohl die Daten existieren. Kennungen und Prüfsummen, damit die Dateien identifizierbar sind:

| Lauf | Artefakt-ID | Größe | SHA-256 des ZIP |
|---|---:|---:|---|
| 138 | 14880184965 | 472 593 B | `f187d41ebbd11d407ca698eb3c0765fc6d56086be155733f877cb760b389c637` |
| 139 | 14880763322 | 478 633 B | `ebce0946cb0dac557de5516fee0f6539f9606d92a69760d341f76ce5c8e30730` |
| 140 | 14881895706 | 473 093 B | `fbfd749c96c50ff61f9b98c8dd172bbf648682aac4f6c5eee759257535c5dac6` |
| 141 | 14880807837 | 473 803 B | `65b654344937526db14e04c139e3140a38d96a36694e573904f1fecf56fd96cf` |

**Nachtrag 24.11.2026:** Die Zahl liegt jetzt vor, ohne Download. `.github/workflows/eval-streuung-bericht.yml`
lädt die Artefakte in Actions und rechnet dort; Lauf
[45396629430](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45396629430), 29 Sekunden:

| Nebenendpunkt | Wert |
|---|---|
| Verschiedene Endstellungen | **360 von 360 (100,0 %)**, je Farbzuordnung 180 / 180 |
| Partielänge | Mittel 374,8 · Median 374 · Spanne 291 bis 446 Züge |
| Aufgaben | 0 (resignEnabled=0) |
| Anomalien | 0 |

Der primäre Endpunkt kam dabei unabhängig auf dieselben Zahlen wie die Handrechnung oben: 184 : 176,
p = 0,7122, Clopper-Pearson [45,8 %; 56,4 %], Elo 7,7 [−29,1; +44,6]. Nach §10.8 gilt die Vielfaltszahl für den
ganzen Lauf, nicht je Arm.

Die Zahlen in den Tabellen oben stammen aus dem Aggregatblock der vier Job-Logs, die über die GitHub-API
lesbar sind — dieselbe Ausgabe derselben Partien, aber eine andere Quelle als das JSON.
