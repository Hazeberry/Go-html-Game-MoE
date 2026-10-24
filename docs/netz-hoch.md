# Höhere Dosis des Endspiel-Netzes: λ 0,9 und 1

**Status: festgelegt am 24.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Von λ = 0,5 auf 0,8 gewann die KI gegen GNU Go +15,5 Punkte
([`netz-dosis.md`](netz-dosis.md) §8), mehr als erwartet. Seitdem ist
`endspielNetz` = 0,8 Default. Offen blieb, ob noch mehr Netz hilft. Bei λ = 1
zählt die Heuristik im Prior der Wurzelkinder ab Zug 81 gar nicht mehr. Die
Heuristik wählt aber weiter die Kandidaten (12 von 16), und die Suche bewertet
sie. Hazeberry hat die Messung am 24.10.2026 beauftragt, in GitHub Actions.

## 2. Arme

| Arm | `--ki` | Was passiert |
|---|---|---|
| **A** | (Default: `endspielNetz` 0,8, `endspielNetzTop` 4) | Referenz |
| **L9** | `endspielNetz=0.9` | Prior der Wurzelkinder ab Zug 81 zu 90 % vom Netz |
| **L10** | `endspielNetz=1` | Prior der Wurzelkinder ab Zug 81 nur vom Netz |

Den Schalter gibt es schon; `index.html` ändert sich nicht.

## 3. Messung

**M1 gegen GNU Go.** Wie in [`netz-dosis.md`](netz-dosis.md) §3: GNU Go Stufe 1,
**sechs Vorgabesteine**, 120 Simulationen, Aufgabe der KI aus, GNU Go gibt nicht
auf, bis 600 Züge, ausgespielt. Seed **217**, noch nie benutzt. Je Arm 240
Partien in 16 Teilläufen zu 15; gleiche Partienummer ist ein Paar.

**M2, Selbstspiel ohne Aufgabe.** L9 gegen A und L10 gegen A mit
`ab-harness.js`, beide Seiten mit 120 Simulationen und `resignEnabled=0`, bis
600 Züge, je 360 Partien in zwölf Teilen zu 30. Teil k spielt für L9 mit Seed
20261901 + k − 1, für L10 mit Seed 20262001 + k − 1.

**Kontrolle.** Arm A spielt Seed 216 (Partien 1 bis 15) mit sechs
Vorgabesteinen. Das muss Zug für Zug Arm L8 der Dosis-Messung wiedergeben, denn
der heutige Default ist genau L8. Erwartet: 15 von 15.

Der Lauf geschieht in GitHub Actions
([`netz-hoch.yml`](../.github/workflows/netz-hoch.yml), 73 Jobs zum Spielen).

## 4. Endpunkt und Entscheidung

**M1:** Differenz des Endstands L9 − A und L10 − A nach GNU Gos Zählung,
gepaart nach Partienummer, zweiseitiger t-Test. Zwei Vergleiche, also nach
Bonferroni **α = 0,025** je Vergleich. **M2:** Siegrate des Arms gegen 50 %,
exakter Binomialtest, zweiseitig, α = 0,05.

| M1 | M2 des Arms | Folge |
|---|---|---|
| genau ein Arm signifikant besser | nicht signifikant unter 50 % | **dieser Arm wird Default** |
| beide signifikant besser | beide nicht signifikant unter 50 % | der Arm mit der größeren Differenz wird Default |
| ein Arm signifikant besser | signifikant unter 50 % | dieser Arm wird nicht Default; untersuchen |
| sonst | — | Default bleibt 0,8; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

Ein Arm, der signifikant **schlechter** ist, gilt als verworfen. Das ist
unabhängig von der Obergrenze.

**Sekundär, ohne Anspruch:**
- Siege gepaart (McNemar).
- Stand nach Zug 120 und 200, Züge je Partie, Median und Vorzeichentest.
- In M2 die Siege je Farbe.

## 5. Erkennbare Größe und Erwartung

In der Dosis-Messung streute die Paardifferenz mit sechs Steinen mit 58 bis 60
Punkten. Mit 240 Paaren und α = 0,025 sind damit rund 12 Punkte mit 80 %
Teststärke erkennbar. M2: Der Standardfehler liegt bei 2,6 Prozentpunkten; der
Wächter schlägt sicher unter rund 43 % an.

**Erwartung vorab, ohne Wirkung auf die Lesart:**
- L9 − A: −3 bis +6. Die Schritte werden kleiner: von 0 auf 0,5 waren es +46,9,
  von 0,5 auf 0,8 +15,5.
- L10 − A: −8 bis +5. Ohne jeden Anteil der Heuristik fehlt dem Prior ihr Wissen
  über Benson, Leitern und Fänge.
- M2 für beide nicht signifikant unter 50 %. Kontrolle 15 von 15.

Am wahrscheinlichsten ist damit die letzte Zeile der Tabelle: Der Default
bleibt 0,8.

## 6. Grenzen

- Ein Gegner (GNU Go Stufe 1), sechs Vorgabesteine, 120 Simulationen je Zug.
- Lehrer und Gegner sind GNU Go. Je mehr das Netz bestimmt, desto mehr kann ein
  Gewinn daher kommen, dass die KI GNU Gos Züge vorwegnimmt. M2 prüft das gegen
  die eigene KI. Ein zweiter Gegner (Fuego) ist in Arbeit.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält. Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 217 |
| `seed_neun` | 20261901 |
| `seed_eins` | 20262001 |
| `kontrolle` | `docs/daten/netz-dosis/lauf1/L8.jsonl.gz` |
| `kontrolle_seed` | 216 |

Jobs: `pruefen`, `spielen` (A, L9 und L10 × 16 Teile), `kontrolle` (ein Teil),
`selbstspiel` (L9 und L10 × 12 Teile), `ergebnis` (Bericht mit
`auswertung/dagger/netz-hoch-ergebnis.sh`). Die Ergebnisse legt der Workflow auf
den Branch `ergebnisse/netz-hoch-lauf<N>` unter `docs/daten/netz-hoch/lauf<N>/`.
Nur der letzte Job darf ins Repo schreiben. Erwartet werden 30 bis 50 Minuten.

## 8. Nachtrag: Ergebnis der Messung, Default bleibt 0,8 (24.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `netz-hoch.yml`
([Run 40104450559](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40104450559)),
auf dem Merge-Commit `910fce2` von `main`, mit den Eingaben aus §7, in 37 Minuten
(14:52 bis 15:29 UTC). Alle 735 Partien gegen GNU Go und 720 im Selbstspiel
ausgespielt, keine abgebrochen. Daten:
[`daten/netz-hoch/lauf1/`](daten/netz-hoch/lauf1/).

**Kontrolle.** Arm A gibt Arm L8 der Dosis-Messung in **15 von 15** Partien
wieder.

| Vergleich (240 Paare) | Differenz | 95 % | p | Siege | Selbstspiel ohne Aufgabe |
|---|---:|---|---:|---|---:|
| L9 − A (λ 0,9) | −1,9 | [−9,3; +5,6] | 0,62 | 161 gegen 157 | 49,7 % (p = 0,96) |
| L10 − A (λ 1) | −4,1 | [−11,4; +3,2] | 0,27 | 159 gegen 157 | 53,1 % (p = 0,27) |

Arm A (λ 0,8) kommt im Mittel auf +24,1 bei 157 Siegen von 240.

**Entscheidung nach §4: Default bleibt `endspielNetz` = 0,8.** Keiner der Arme
ist signifikant besser. **Beide sind verworfen**, denn beide Obergrenzen (+5,6
und +3,2) liegen unter +10.

**Gegen die Erwartung aus §5.** Erwartet waren für L9 −3 bis +6 und für L10 −8
bis +5, dazu M2 nicht signifikant und die Kontrolle 15 von 15. Alles ist so
eingetroffen. Die Dosis hat damit ihr Maß gefunden: Von 0 auf 0,5 kamen +46,9,
von 0,5 auf 0,8 +15,5, darüber nichts mehr. Ob λ 0,8 genau der beste Wert ist,
misst die Reihe nicht. Zwischen 0,8 und 1 ist die Kurve aber flach.

**Sekundär, ohne Anspruch.** Nach Zug 120 liegen die Arme gleich (−0,4 und
−0,6), nach Zug 200 leicht vorn (+1,2 und +2,1), am Ende leicht hinten. Median
der Differenz +2 und 0, Vorzeichentest 123 gegen 115 und 114 gegen 118. Die
Paardifferenz streut mit 57 bis 59 Punkten wie bisher.

**Was das für den Ausbau heißt.** Mehr Gewicht für dasselbe Netz bringt nichts
mehr. Mehr kann nur ein besseres Netz bringen: mehr und eigene Lehrdaten
(Datenaggregation) oder ein Netz fürs Mittelspiel. Den Gewinn auch gegen einen
zweiten Gegner zu prüfen ([`fuego.md`](fuego.md)), bleibt offen.
