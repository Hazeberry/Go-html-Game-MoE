# Augen füllen und nicht passen: vorab festgelegte Messung

**Status: festgelegt am 04.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

Eine Partie eines Menschen gegen die KI (Weiß, 277 Züge, 04.10.) endete mit
einer Aufgabe der KI. GNU Go wertet die Schlussstellung mit **W +63,5** und
gibt als Schwarz selbst sofort auf. Q fiel von +0,79 (Zug 160) auf −0,99,
während GNU Gos Schätzung zwischen W +64 und W +103 blieb. Ursache:
`evaluateBoard` kennt kein Gebiet, und die geschlagenen Steine des Menschen
zählen dort je 20 Punkte. Im Selbstspiel M2 aus [`gebiet.md`](gebiet.md)
waren 6 von 47 Aufgaben mit `gebietZug` = 80 falsch (GNU Go sah den
Aufgebenden vorn), ohne den Term 3 von 266. Das ist die Frage „Gebiet in der
Stellungsbewertung“ und kommt als eigene Messung.

Beim Vorbereiten dieser Messung fiel ein zweiter Fehler auf, und der kommt
zuerst, weil er jede Messung des Endstands verfälscht:

**Die KI passt nicht und füllt ihre eigenen Augen.** In den ganzen
Partien gegen GNU Go aus `gebiet.md` §2 passt GNU Go, sobald es nichts mehr
zu holen gibt. Unsere KI spielt weiter, Zug um Zug in ihr eigenes Gebiet, bis
jede Gruppe nur noch ein Auge hat. GNU Go zählt danach das ganze Brett für
Weiß: **W +370,5** in drei von sechs Partien, die anderen drei liefen bis ans
Zuglimit von 400 Zügen.

Zwei Ursachen, beide in `getAIMove`:

1. **Kein Augenschutz.** Nichts verbietet einen Zug in ein eigenes echtes
   Auge, weder an der Wurzel noch in der Suche noch in den Rollouts. Im
   Selbstspiel M2 füllt die KI in 130 (A) bzw. 146 (B) von 360 Partien
   mindestens ein eigenes echtes Auge (`auswertung/augen.js`).
2. **Der Pass wird verweigert, auch wenn nichts zu retten ist.** Die
   Pass-Prüfung verbietet den Pass, wenn eine eigene Kette im Atari steht oder
   der beste Gegnerzug mehr als `passGainThreshold` (60) bringt. In der
   Pilotpartie steht eine tote schwarze Gruppe im weißen Gebiet im Atari; der
   Schlag ist 13 521 wert. Kein schwarzer Zug ändert daran etwas, aber
   gepasst wird nie.

## 2. Die Änderung und was der Pilot gezeigt hat

**`augenSchutz`**: Kein Zug auf einen Punkt, dessen orthogonale Nachbarn
alle eigene Steine sind, dessen Diagonalen `_diagIsTrueEye` bestehen und an
dem keine eigene Kette im Atari steht (dann ist der Punkt die letzte
Freiheit, nicht ein Auge). 1 = an der Wurzel (alle Stufen), 2 = zusätzlich in
den MCTS-Knoten und in den Rollouts. Bleibt an der Wurzel kein Zug übrig,
passt die KI.

**`passUnabwendbar`**: Verbieten Atari oder großer Gegnerzug den Pass,
prüft die KI erst, ob einer ihrer acht besten Züge (oder der Punkt eines der
drei besten Gegnerzüge) alle drei Gegnerzüge unter die Schwelle drückt. Wenn
keiner das schafft, passt sie trotzdem.

Pilot: gegen GNU Go 3.8 Stufe 1, neun Vorgabesteine, 120 Simulationen,
Aufgabe aus, ganze Partien bis höchstens 400 Züge, `--seed 51`, je 6
Partien. Stand = GNU Gos `final_score` aus unserer Sicht.

| Variante | Stand je Partie | Augenfüllungen |
|---|---|---:|
| Default | −370,5 · −370,5 · Zuglimit · Zuglimit · Zuglimit · −370,5 | 79 |
| `augenSchutz` 1 | −252,5 · −116,5 · Zuglimit · −136,5 · −130,5 · −182,5 | 0 |
| `passUnabwendbar` 1 | −98,5 · −272,5 · −52,5 · −62,5 · −136,5 · −226,5 | — |
| beide (1 + 1) | −252,5 · −116,5 · −50,5 · −136,5 · −130,5 · −182,5 | 0 |
| beide (2 + 1) | **GNU Go gibt auf (Zug 104)** · −146,5 · −88,5 · −176,5 · −132,5 · −152,5 | 0 |

Selbstspiel, 24 Partien je Vergleich gegen den Default: beide (1 + 1)
gewinnt 15:9, beide (2 + 1) 17:7.

Beide Änderungen verlieren gegen GNU Go weiter deutlich. Der Großteil des
Rückstands entsteht zwischen Zug 120 (Schätzung um +10) und Zug 200 (um
−90): Weiß dringt in den offenen schwarzen Rahmen ein und lebt dort. Das
ist die Frage „Gebiet in der Stellungsbewertung“ und nicht Gegenstand dieser
Messung.

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default (`augenSchutz` 0, `passUnabwendbar` 0) |
| B | `augenSchutz` = 2, `passUnabwendbar` = 1 |

Die Stufe 2 stammt aus dem Pilot. Sie ist auch die übliche Regel für
Monte-Carlo-Rollouts. Beide Schalter werden zusammen gemessen, weil sie
denselben Fehler beheben: Ohne Pass füllt die KI ohne Augenschutz ihre
Augen, und mit Augenschutz allein spielt sie bis zum Zuglimit weiter.

## 4. Messungen und Endpunkte

**M1, extern, primär:** gegen GNU Go 3.8 Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, ganze Partien bis höchstens 600 Züge. Je Arm 60
Partien mit denselben Seeds, als vier Teilläufe zu je 15:

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 81 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh augen-m1-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,augenSchutz=2,passUnabwendbar=1
done
node auswertung/gnugo-vergleich.js --A augen-m1-A-*.jsonl --B augen-m1-B-*.jsonl --zug 200,ende
```

Endpunkt: mittlere gepaarte Differenz B − A des **Endstands**, also GNU Gos
`final_score` der Schlussstellung aus unserer Sicht (Feld `endstand`, neu in
`gnugo-duell.js`; auch bei Aufgabe und Zuglimit wird die Schlussstellung
ausgezählt). Gepaarter t-Test, zweiseitig, α = 0,05. Partien, die durch einen
GNU-Go-Absturz abbrechen, fallen samt Partner heraus.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261030 20261031 20261032 20261033; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,augenSchutz=2,passUnabwendbar=1 \
    --roh augen-m2-$s.jsonl --json augen-m2-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 | M2 | Folge |
|---|---|---|
| B besser, p < 0,05 | B nicht signifikant schlechter | Default `augenSchutz` = 2, `passUnabwendbar` = 1 |
| B besser, p < 0,05 | B signifikant schlechter | kein Default; untersuchen |
| sonst | — | Defaults bleiben 0 |

**Sekundär, ohne Anspruch:** M1 nach Zug 200 (die Suche ändert sich durch
Stufe 2 schon vorher); Partien, die GNU Go aufgibt; Augenfüllungen je Arm in
M1 und M2 (`auswertung/augen.js`); Partielänge.

## 5. Grenzen

- M1 ist gegen den Default kaum zu verlieren: Die A-Partien enden mit
  W +370,5 oder am Zuglimit. Der Endpunkt sagt deshalb vor allem, ob der
  Fehler weg ist. Wie gut das Endspiel danach ist, misst er nur grob.
- `final_score` an einer Stellung, die nicht durch zwei Pässe endete, ist
  GNU Gos Urteil über die Stellung, wie sie steht.
- Die Pass-Regel bewertet Gegnerzüge mit `evaluateMove`, also mit unserer
  eigenen Heuristik. Wo die eine Drohung übersieht, passt die KI zu früh.
  M2 würde das zeigen, wenn es spielentscheidend wäre.

---

## 6. Nachtrag: Ergebnis, Defaults 2 und 1 (04.10.2026)

Gelaufen auf dem Merge-Commit `bd7beb0`, ohne Unterbrechung. Daten:
`daten/augen-m1.json` (je Partie Schätzungen, Endstand, Zugzahl) und
`daten/augen-m2-20261030.json` bis `…33.json` (Hash-Listen).

**M1, gegen GNU Go (primär):**

| | A (Default) | B (`augenSchutz` 2, `passUnabwendbar` 1) | Differenz B − A, gepaart |
|---|---:|---:|---|
| **Endstand (60 Paare)** | −346,5 | −129,4 | **+217,1** (SD 141,9), p = 3,1 · 10⁻¹⁷ |
| Schätzung nach Zug 200 (49 Paare) | −99,8 | −87,9 | +11,9 (SD 43,6), p = 0,061 |
| Schätzung nach Zug 120 (55 Paare) | +17,1 | +15,4 | −1,6 (SD 40,5), p = 0,77 |

- **A zerstört sich selbst:** 57 der 60 A-Partien enden mit W +370,5,
  also mit dem ganzen Brett für Weiß. Der Median des Endstands liegt bei
  A −370,5, bei B −160,5.
- **Augenfüllungen:** A füllt 803 eigene Augen, B keines. Ohne den Fehler
  endet die Partie im Mittel nach 293 statt 396 Zügen.
- **GNU Go gibt auf:** in 8 B-Partien und 3 A-Partien. Abgebrochen ist keine
  Partie, weder durch einen Absturz noch am Zuglimit.
- **Vor Zug 200 ändert sich wenig:** Die Rollout-Stufe 2 verschiebt die
  Schätzung nach 200 Zügen um +11,9, nicht signifikant.

**M2, Selbstspiel (Kontrolle):** B gewinnt **194 von 360 Partien, 53,9 %**
(z = 1,48, p = 0,14, 95-%-KI 48,7–59,0 %). Das ist nicht signifikant
schlechter.

| Teillauf | Siegrate B |
|---|---:|
| 20261030 | 50,0 % |
| 20261031 | 52,2 % |
| 20261032 | 60,0 % |
| 20261033 | 53,3 % |

A füllt in 224 von 360 Partien mindestens ein eigenes Auge (582
Füllungen), B in keiner. Zeit je Partie: A 15,5 s, B 15,2 s.

**Entscheidung nach §4: Default `augenSchutz` = 2, `passUnabwendbar` = 1.**

**Was offen bleibt:**

- **Der große Verlust bleibt.** Er entsteht zwischen Zug 120 (Schätzung
  um +16) und Zug 200 (um −90). In den angesehenen Partien dringt GNU Go in
  den offenen schwarzen Rahmen ein und lebt dort.
- **Gebiet in der Stellungsbewertung hilft dagegen nicht.** Pilot auf
  `bd7beb0` mit den neuen Schaltern, `--seed 51`, 8 Partien, Endstand
  gepaart gegen `gebietGewicht` 0:

  | `gebietGewicht` | Endstand B − A | nach Zug 200 |
  |---|---:|---:|
  | 1 | −40,3 | +20,9 |
  | 3 | −21,0 | −18,0 |
  | 10 | −24,8 | +24,6 |

  Keine dieser Differenzen ist signifikant. Bei 120 Simulationen kommt der
  Zug fast ganz aus `evaluateMove`. Für die falschen Aufgaben (§1) bleibt
  `gebietGewicht` trotzdem ein Kandidat, denn dort zählt Q, und Menschen
  spielen mit 700 bis 1 300 Simulationen.
- **Ältere Läufe:** Ein Arm „Default" heißt ab jetzt auch `augenSchutz` = 2
  und `passUnabwendbar` = 1. Wer einen älteren Lauf wiederholt, nimmt dessen
  Commit oder setzt beide in beiden Armen auf 0.
