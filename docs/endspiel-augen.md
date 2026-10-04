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
