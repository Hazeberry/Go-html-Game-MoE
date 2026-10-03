# Skalierung: Wie viel bringt mehr Suche? Vorab festgelegte Messung

**Status: festgelegt am 03.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–4 werden nicht mehr geändert.

---

## 1. Anlass

Alle bisherigen Messungen liefen mit fester Simulationszahl 120. Im Spiel
rechnet die KI deutlich mehr. In der Partie vom 03.10. (5 000 ms Bedenkzeit)
waren es 1 331 Simulationen bei Zug 2 und noch 749 bei Zug 198. Dazwischen
stieg die Zeit je Simulation von 3,7 auf 8 ms.

Zwei offene Befunde zeigen auf die Suche als Grenze:

- [`laufkampf.md`](laufkampf.md) §8: Die KI erkennt eine eingeschlossene
  Gruppe und versucht doppelt so oft auszubrechen. Die Gruppen sterben
  trotzdem, weil die Suche den Ausbruch nicht durchrechnet.
- [`endspiel-gleichstand.md`](endspiel-gleichstand.md): Schon bessere
  Kandidaten an der Wurzel brachten 9 Prozentpunkte. Die Suche nutzt also,
  was man ihr gibt.

Wie viel eine Verdopplung der Suche wert ist, wurde nie gemessen. Davon hängt
ab, ob sich Arbeit an der Geschwindigkeit lohnt.

## 2. Vergleiche

Beide Arme spielen mit allen Defaults (also `endTieBreak` = 1). Sie
unterscheiden sich nur in `mctsFixedSims`.

| Vergleich | A | B | Seeds |
|---|---|---|---|
| **K1** | 120 | 240 | 20261018–21 |
| **K2** | 240 | 480 | 20261022–25 |

Je Vergleich 360 Partien, als vier Teilläufe zu je 90:

```bash
for s in 20261018 20261019 20261020 20261021; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=240 \
    --roh skalierung-k1-$s.jsonl --json skalierung-k1-$s.json &
done
# K2 ebenso mit --A mctsFixedSims=240 --B mctsFixedSims=480 und den Seeds 20261022–25
```

Commit: der Merge dieser Festlegung. K1 läuft zuerst, K2 danach.

## 3. Endpunkte

**Primär, je Vergleich:** Siegrate von B, zweiseitig gegen 50 %, α = 0,05.
Dazu die Elo-Differenz `400 · log10(p / (1 − p))` mit 95-%-Intervall aus
dem Intervall der Siegrate.

**Lesart, vorab festgelegt:**

| Ergebnis | Folge |
|---|---|
| Verdopplung bringt ≥ 100 Elo (Siegrate ≥ 64 %) | Geschwindigkeit ist ein starker Hebel. Der Anstieg der Zeit je Simulation über die Partie wird als Nächstes untersucht |
| zwischen 0 und 100 Elo, p < 0,05 | Suche hilft, aber begrenzt; Geschwindigkeit nur mit geringem Aufwand |
| p ≥ 0,05 | Mehr Suche hilft in diesem Bereich nicht nachweisbar; die Grenze liegt in Bewertung und Zugauswahl |

Fällt der Gewinn von K1 nach K2 deutlich ab, flacht die Kurve ab. Dann sagt
der Bereich 120–480 wenig über die 750–1 300 Simulationen im Spiel.

**Sekundär, ohne Anspruch:** Aufgaben je Arm, Partielänge.

## 4. Grenzen

- Der Bereich 120–480 liegt unter dem, was die KI im Spiel rechnet.
  Gemessen wird die Steigung der Kurve, nicht ihr Wert bei 1 000.
  960 gegen 480 würde rund sechs Stunden dauern und ist nicht vorgesehen.
- Selbstspiel: Beide Arme haben dieselben Schwächen. Ob mehr Suche auch
  gegen einen fremden Gegner hilft, misst die Brücke zu GNU Go, die parallel
  entsteht.

---

## 5. Nachtrag: Ergebnis (03.10.2026)

Gelaufen auf dem Merge-Commit `94b59d0`, alle acht Teilläufe ohne
Unterbrechung. Hash-Listen: `daten/skalierung-k1-…json` und
`daten/skalierung-k2-…json`.

| Vergleich | Siegrate der doppelten Suche | p | Elo je Verdopplung (95-%-Intervall) |
|---|---:|---:|---|
| **K1** 240 gegen 120 | **60,6 %** (218/360) | 0,0001 | **+75** (38–112) |
| **K2** 480 gegen 240 | **57,8 %** (208/360) | 0,003 | **+55** (19–92) |

Teilläufe K1: 60,0 / 62,2 / 60,0 / 60,0 %. Teilläufe K2: 55,6 / 64,4 / 60,0
/ 51,1 %.

**Lesart nach §3:** Beide Vergleiche fallen in „zwischen 0 und 100 Elo,
p < 0,05". Suche hilft, aber begrenzt. Von K1 zu K2 fällt der Gewinn je
Verdopplung von 75 auf 55 Elo. Das ist kein gesicherter Unterschied (die
Intervalle überlappen weit), passt aber zum erwarteten Abflachen.

**Was das für das Spiel heißt.** Die KI rechnet im Spiel 750–1 300
Simulationen, zwei bis drei Verdopplungen über 240. Setzt sich das Abflachen
fort, bringt eine weitere Verdopplung dort eher 30–50 Elo. Das ist eine
Hochrechnung, keine Messung. Arbeit an der Geschwindigkeit (die Zeit je
Simulation verdoppelt sich über die Partie) wäre damit etwas wert, aber kein
großer Hebel.

**Zusammen mit dem GNU-Go-Pilot** ([`gnugo.md`](gnugo.md)): Gegen GNU Go
änderten 1 000 statt 120 Simulationen nichts, 0 von 8 gegen 0 von 17 Siegen.
Dort fehlen nicht 50 Elo, sondern mehr als neun Vorgabesteine. Die Grenze
liegt also nicht in der Suche, sondern in der Bewertung, die sie füttert.

**Sekundär, ohne Anspruch:** Der schwächere Arm gibt öfter auf (K1: 169
gegen 99, K2: 151 gegen 100). In K2 gewinnt die doppelte Suche als Weiß
öfter als als Schwarz (115 gegen 93 von je 180). Partielänge Ø 333 bzw. 337
Züge.
