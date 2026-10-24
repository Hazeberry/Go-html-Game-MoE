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
