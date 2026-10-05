# Gefangenen-Deckel gegen falsche Aufgaben: vorab festgelegte Messung

**Status: festgelegt am 05.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

Zwei Partien eines Menschen gegen die KI endeten mit einer Aufgabe der KI,
obwohl sie laut GNU Go klar vorn lag:

| Partie | Aufgabe bei | GNU Go | Gefangene (Mensch : KI) |
|---|---|---:|---:|
| 3 (04.10., 5000 ms) | Zug 277 | W +63,5 | 18 : 5 |
| 4 (04.10., 1800 ms) | Zug 201 | W +96,5 | 27 : 3 |

Im Selbstspiel M2 aus [`gebiet.md`](gebiet.md) waren 6 von 47 Aufgaben mit
`gebietZug` 80 falsch. Diagnose in [`falsche-aufgabe.md`](falsche-aufgabe.md):

- Q stammt aus `evaluateBoard`. Ein Gefangener zählt dort 20 Punkte, ein Stein
  auf dem Brett 5, Gebiet nichts.
- In Partie 4 bleibt Q auch ohne Rollouts gleich (−0,70 statt −0,72). Die
  Gefangenen allein reißen es unter die Schwelle.

`captureCap` deckelt den Beitrag des Gefangenen-Saldos zu `evaluateBoard`.
Gegen die Spielstärke wurde er schon gemessen (Dosis 200: 55,8 % über 120
Partien, n. s.). Damals galten die Aufgaben noch als berechtigt, weil es
keinen fremden Schiedsrichter gab.

## 2. Was die Vorprobe gezeigt hat

Offline an den 313 Aufgabestellungen aus M2 (GNU-Go-Urteil bekannt, 9 davon
falsch): Q mit den heutigen Defaults neu gerechnet, 120 Simulationen. Gezählt
wird, wie oft Q weiter bei ≤ −0,95 liegt, die KI also weiter aufgeben würde:

| Variante | falsche Aufgaben bleiben | berechtigte bleiben |
|---|---:|---:|
| Default | 3 von 9 | 271 von 304 |
| `captureCap` 300 | 2 von 9 | 262 von 304 |
| `captureCap` 200 | 1 von 9 | 210 von 304 |
| `captureWeight` 5 | 0 von 9 | 33 von 304 |
| `gebietGewicht` 3 | 5 von 9 | 282 von 304 |

In den Partien des Menschen, mit 400 Simulationen:

- Partie 4: `captureCap` 200 hebt Q bei Zug 200 von −0,97 auf −0,59. Die KI
  hätte nicht aufgegeben.
- Partie 3: Zug 276 bleibt bei −0,95. Dort tragen auch die Rollouts und
  `deathTransfer` bei.

`captureWeight` wirkt stärker, ändert aber auch, wie attraktiv ein Schlag in
der Suche ist, und die KI gäbe fast nie mehr auf. Der Deckel greift nur in
den Saldo ein. Gemessen wird deshalb `captureCap` 200.

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default (`captureCap` 0) |
| B | `captureCap` = 200 |

## 4. Messung und Endpunkte

Selbstspiel, 720 Partien, acht Teilläufe zu je 90, Aufgabe an (Default):

```bash
for s in 20261040 20261041 20261042 20261043 20261044 20261045 20261046 20261047; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,captureCap=200 \
    --roh deckel-$s.jsonl --json deckel-$s.json &
done
node auswertung/aufgabe-gnugo.js deckel-*.jsonl
```

`auswertung/aufgabe-gnugo.js` spielt jede Partie, die mit einer Aufgabe
endet, bis zur Aufgabestellung nach und lässt GNU Go 3.8 schätzen
(`estimate_score`, chinesisch, Komi 7,5). Liegt der Aufgebende vorn, war die
Aufgabe falsch.

**Primär:** Zahl der falschen Aufgaben je gespielter Partie, A gegen B.
Fishers exakter Test, zweiseitig, α = 0,05.

**Kontrolle:** Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| Falsche Aufgaben | Siegrate B | Folge |
|---|---|---|
| B seltener, p < 0,05 | nicht signifikant unter 50 % | Default `captureCap` = 200 |
| B seltener, p < 0,05 | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**

- Aufgaben je Arm, darunter berechtigte, die B nicht mehr gibt
- Partielänge
- Q an den Stellungen der Partien 3 und 4 mit dem Commit des Laufs

## 5. Grenzen

- Falsche Aufgaben sind selten. Erwartet werden mit A rund 6 bis 12 in 720
  Partien. Die Vorprobe sagt für B etwa ein Neuntel davon voraus; dafür
  reicht die Stichprobe, für kleinere Effekte nicht.
- GNU Gos Schätzung ist eine Schätzung. Als Schiedsrichter ist sie aber
  unabhängig von unserer Bewertung.
- Gemessen wird KI gegen KI mit 120 Simulationen. Ein Mensch, der gezielt
  Steine schlägt, um die Bewertung zu kippen, ist darin nicht abgebildet; die
  Partien 3 und 4 bleiben die Fallbeispiele dafür.
