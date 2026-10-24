# Dosis des Endspiel-Netzes: λ 0,8 und Top 8

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Das Endspiel-Netz bringt mit λ = 0,5 und Top 4 gegen GNU Go +46,9 Punkte
([`endspiel-netz.md`](endspiel-netz.md) §8). Gemessen war nur diese eine
Einstellung. Sie stammt aus der Prüfung offline und ist nicht gesucht. Mehr
Netz kann mehr bringen: Der Schritt von 0 auf 0,5 war der größte Gewinn seit den
Mustern. Er kann aber auch kippen, weil die Heuristik Dinge weiß, die das Netz
nicht kennt (Benson, Leitern, Aufgabe).

Das Netz kostet im Spiel 41 ms je Zug und keine Suchzeit
([`teststaerke.md`](teststaerke.md) §9). Mehr Gewicht oder mehr Netzpunkte
ändern daran nichts, denn das Netz rechnet einmal je Zug.

Hazeberry hat am 20.10.2026 den Ausbau des Netzes beauftragt, als erstes die
Dosis. Alles läuft in GitHub Actions.

## 2. Arme

| Arm | `--ki` | Was passiert |
|---|---|---|
| **A** | (Default: `endspielNetz` 0,5, `endspielNetzTop` 4) | Referenz |
| **L8** | `endspielNetz=0.8` | Prior der Wurzelkinder ab Zug 81 zu 80 % vom Netz statt zur Hälfte |
| **T8** | `endspielNetzTop=8` | die 8 besten Netzpunkte statt 4 unter die 16 Kandidaten der Wurzel |

Die Schalter gibt es schon; `index.html` ändert sich nicht.

## 3. Messung

**M1 gegen GNU Go.** Ab dieser Messung mit **sechs Vorgabesteinen**
([`teststaerke.md`](teststaerke.md) §9). Sonst wie bisher: GNU Go Stufe 1, 120
Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600 Züge,
ausgespielt. Seed **216**, noch nie benutzt. Je Arm 240 Partien in 16
Teilläufen zu 15; gleiche Partienummer ist ein Paar.

**M2, Selbstspiel ohne Aufgabe.** L8 gegen A und T8 gegen A mit `ab-harness.js`,
beide Seiten mit 120 Simulationen und `resignEnabled=0`, bis 600 Züge, je 360
Partien in zwölf Teilen zu 30. Teil k spielt für L8 mit Seed 20261701 + k − 1,
für T8 mit Seed 20261801 + k − 1. Ohne Aufgabe, weil die Prüfung der
Prior-Schärfe gezeigt hat, dass Aufgaben das Selbstspiel verzerren
([`prior-neun.md`](prior-neun.md) §8).

**Kontrolle.** Arm A spielt Seed 215 (Partien 1 bis 15) mit sechs
Vorgabesteinen. Das muss Zug für Zug die Partien mit sechs Steinen des
Prüfstands wiedergeben. Seitdem hat sich in `index.html` nur ein Kommentar
geändert. Erwartet: 15 von 15.

Der Lauf geschieht in GitHub Actions
([`netz-dosis.yml`](../.github/workflows/netz-dosis.yml), 73 Jobs zum Spielen).

## 4. Endpunkt und Entscheidung

**M1:** Differenz des Endstands L8 − A und T8 − A nach GNU Gos Zählung, gepaart
nach Partienummer, zweiseitiger t-Test. Zwei Vergleiche, also nach Bonferroni
**α = 0,025** je Vergleich. **M2:** Siegrate des Arms gegen 50 %, exakter
Binomialtest, zweiseitig, α = 0,05.

| M1 | M2 des Arms | Folge |
|---|---|---|
| genau ein Arm signifikant besser | nicht signifikant unter 50 % | **dieser Arm wird Default** |
| beide signifikant besser | beide nicht signifikant unter 50 % | der Arm mit der größeren Differenz wird Default; die Verbindung (λ 0,8 und Top 8) braucht eine eigene Vorabfestlegung |
| ein Arm signifikant besser | signifikant unter 50 % | dieser Arm wird nicht Default; untersuchen |
| sonst | — | Default bleibt; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Sekundär, ohne Anspruch:**
- Siege gepaart (McNemar).
- Stand nach Zug 120 und 200, Züge je Partie, Median und Vorzeichentest.
- In M2 die Siege je Farbe und die Aufgaben (ohne Aufgabe: keine erwartet).

## 5. Erkennbare Größe und Erwartung

Mit sechs Vorgabesteinen streut der Endstand eines Arms mit 57 Punkten, fast
doppelt so stark wie mit neun (30; [`teststaerke.md`](teststaerke.md) §9). Die
Streuung der Paardifferenz ist mit sechs Steinen noch nicht gemessen. Liegt sie
bei 60 bis 70, sind mit 240 Paaren und α = 0,025 rund 12 bis 14 Punkte mit 80 %
Teststärke erkennbar. Die Messung sieht also nur einen großen Schritt. Kleine
Gewinne bleiben „nicht belegt“. M2: Der Standardfehler liegt bei 2,6
Prozentpunkten; der Wächter schlägt sicher unter rund 43 % an.

**Erwartung vorab, ohne Wirkung auf die Lesart:**
- L8 − A: 0 bis +10. Der erste Schritt (0 auf 0,5) brachte viel; der zweite
  bringt meist weniger.
- T8 − A: −3 bis +5. Die besten 4 Netzpunkte liegen meist schon unter den 16
  Kandidaten, weitere 4 verdrängen eher gute Kandidaten der Heuristik.
- M2 für beide nicht signifikant unter 50 %. Kontrolle 15 von 15.

Am wahrscheinlichsten ist damit die letzte Zeile der Tabelle: Der Default
bleibt.

## 6. Grenzen

- Ein Gegner (GNU Go Stufe 1), sechs Vorgabesteine, 120 Simulationen je Zug.
- Gemessen werden zwei Punkte, keine Kurve. λ = 1 (nur Netz) und ein früherer
  Beginn als Zug 81 sind nicht dabei: Das Netz ist nur an Stellungen ab Zug 81
  gelernt.
- Lehrer und Gegner sind GNU Go. Ein Gewinn kann teils daher kommen, dass die KI
  GNU Gos Züge vorwegnimmt. M2 prüft das gegen die eigene KI.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält. Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 216 |
| `seed_lambda` | 20261701 |
| `seed_top` | 20261801 |
| `kontrolle` | `docs/daten/pruefstand/lauf1/vorgabe-6.jsonl.gz` |
| `kontrolle_seed` | 215 |

Jobs: `pruefen`, `spielen` (A, L8 und T8 × 16 Teile), `kontrolle` (ein Teil),
`selbstspiel` (L8 und T8 × 12 Teile), `ergebnis` (Bericht mit
`auswertung/dagger/netz-dosis-ergebnis.sh`). Die Ergebnisse legt der Workflow
auf den Branch `ergebnisse/netz-dosis-lauf<N>` unter
`docs/daten/netz-dosis/lauf<N>/`. Nur der letzte Job darf ins Repo schreiben.
Erwartet werden 30 bis 50 Minuten.

## 8. Nachtrag: Ergebnis der Messung, Default 0,8 (24.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `netz-dosis.yml`
([Run 39398039531](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39398039531)),
auf dem Merge-Commit `8d37bf0` von `main`, mit den Eingaben aus §7, in 36 Minuten
(20.10., 09:04 bis 09:40 UTC). Alle 735 Partien gegen GNU Go und 720 im
Selbstspiel ausgespielt, keine abgebrochen. Daten:
[`daten/netz-dosis/lauf1/`](daten/netz-dosis/lauf1/).

**Kontrolle.** Arm A gibt die Partien mit sechs Steinen des Prüfstands in
**15 von 15** Partien wieder.

**M1** (240 Paare, Seed 216, sechs Vorgabesteine):

| Arm | Endstand Ø | Siege | Züge Ø |
|---|---:|---:|---:|
| A (Default, λ 0,5, Top 4) | +3,3 | 123 | 265,8 |
| L8 (`endspielNetz` 0,8) | **+18,8** | **154** | 296,3 |
| T8 (`endspielNetzTop` 8) | +4,6 | 120 | 265,0 |

| Vergleich | Differenz | 95 % | p | Hälfte 1 / 2 | nach Zug 120 | nach Zug 200 |
|---|---:|---|---:|---|---:|---:|
| **L8 − A** | **+15,5** | [+7,9; +23,1] | 7,5 · 10⁻⁵ | +16,3 / +14,7 | +5,0 | +8,3 |
| T8 − A | +1,3 | [−6,0; +8,6] | 0,73 | +5,4 / −2,8 | +1,5 | −3,0 |

**M2** (Selbstspiel ohne Aufgabe gegen A, je 360 Partien):

| Arm | Siege | Rate | 95 % | p |
|---|---:|---:|---|---:|
| L8 | 203 | **56,4 %** | [51,2 %; 61,4 %] | 0,018 |
| T8 | 184 | 51,1 % | [46,0 %; 56,2 %] | 0,71 |

**Entscheidung nach §4: Default `endspielNetz` = 0,8.** Genau ein Arm ist
signifikant besser: L8 mit p = 7,5 · 10⁻⁵, weit unter α = 0,025. Im Selbstspiel
liegt L8 nicht unter 50 %, sondern signifikant darüber. **T8 ist verworfen:**
Die Obergrenze des Intervalls (+8,6) liegt unter +10. `endspielNetzTop` bleibt 4.

**Gegen die Erwartung aus §5.** Erwartet war für L8 0 bis +10, gemessen sind
+15,5. Der zweite Schritt der Dosis bringt also mehr als erwartet, rund ein
Drittel des ersten (+46,9 von 0 auf 0,5). Getroffen haben T8 (−3 bis +5), M2 und
die Kontrolle. Die Tabelle aus §4 hatte die letzte Zeile als wahrscheinlich
angesehen; eingetreten ist die erste.

**Sekundär, ohne Anspruch.**
- Siege: In 55 Paaren gewinnt nur L8, in 24 nur A (McNemar p = 0,0006). Median
  der Differenz +12, Vorzeichentest 144 gegen 92 (p = 0,0009).
- Der Vorsprung wächst über die Partie: +5,0 nach Zug 120, +8,3 nach Zug 200,
  +15,5 am Ende. Das Muster ist dasselbe wie beim ersten Schritt.
- L8 spielt gegen GNU Go 30 Züge längere Partien (296,3 gegen 265,8). Warum,
  misst diese Prüfung nicht.
- Mit sechs Steinen streut die Paardifferenz mit 58 bis 60 Punkten, so wie mit
  neun. Die Annahme aus §5 (60 bis 70) war etwas zu vorsichtig.

**Was offen bleibt.**
- Ob noch mehr Netz hilft (λ = 0,9 oder 1), ist nicht gemessen. λ = 1 hieße,
  dass die Heuristik im Prior der Wurzel ab Zug 81 gar nicht mehr zählt.
- Für ältere Läufe heißt „Default“ seit diesem Commit auch `endspielNetz` = 0,8.
  Die Kontrollen künftiger Messungen können deshalb nicht mehr gegen Arm A des
  Prüfstands oder dieser Messung laufen, sondern gegen Arm L8 hier.
