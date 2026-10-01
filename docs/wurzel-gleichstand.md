# Wurzel-Kandidaten: ein Los an Gleichständen, nicht am Rauschen

**Messung vom 01.10.2026.** Beantwortet die zweite offene Frage aus dem
Schlussstand von [`pilot-benson-defense.md`](pilot-benson-defense.md). Keine
Spielstärke-Aussage, kein neuer Parameter, keine Änderung an der Engine.
Gemessen mit [`auswertung/wurzel-gleichstand.js`](../auswertung/wurzel-gleichstand.js).

---

## 1. Die Frage

MCTS bekommt an der Wurzel die besten 16 Züge nach `evaluateMove`
(`mctsRootChildren`). Zwei Ziehungen auf demselben Brett teilten nur 27 %
dieser 16 (gemessen an 18 Stellungen einer Partie, Errata E8). Die Vermutung
im Schlussstand: das Rauschen der vier Phasen-Experten (`+rnd*3`, `*4`,
`*0,5`, `*3`) entscheidet, welche Kandidaten MCTS überhaupt prüft.

## 2. Methode

Zwei Erklärungen sind möglich:

- **(a)** das Rauschen sortiert Züge mit **verschiedenen** Werten um, oder
- **(b)** an der Grenze zu Platz 16 stehen viele Züge mit **gleichem** Wert,
  und das Rauschen lost aus, welche hineinkommen.

Getrennt wird das, indem `Math.random` während der Bewertung skaliert wird.
Bei Faktor 10⁻⁶ ist das Rauschen höchstens 4·10⁻⁶ — kleiner als jeder
Abstand zwischen zwei verschiedenen rauschfreien Werten (kleinster gemessen:
0,015) —, bricht aber jeden Gleichstand weiterhin zufällig. In `evaluateMove`
und den Experten kommt `Math.random` nur in diesen Rauschtermen vor (und in
`−10000 + Math.random()` für Selbstmord ohne Schlag); die Skalierung trifft
also genau sie. Für die Gleichstandsstatistik wird rauschfrei gerechnet
(`Math.random = 0`).

**Stellungen:** die ersten 40 Partien des Kontrolllaufs aus
`pilot-benson-defense.md` §14.1 (Seed 20260923, `mctsFixedSims=120`, beide
Seiten Default bis auf `bensonDeathTransfer`, das `evaluateMove` nicht
berührt), jede 5. Stellung: 2618 Stellungen mit mehr als 16 Kandidaten.
Die Kandidatenliste wird wie in `getAIMove` gebaut: Benson-Zugfilter,
`emptyFields` = Zahl der Kandidaten nach dem Filter, `buildCrisisMap`,
`primeAreaCache`. Der Dump trägt keinen Superko-Verlauf; der einfache
Ko-Punkt wird aus dem letzten Einzelschlag rekonstruiert.

**Prüfung der Rekonstruktion:** sechs Partien mit `mctsTreeReuse=0`
(Seed 777), jede Stellung. Jeder der 1812 gespielten Züge (ohne Pässe) liegt
in der rekonstruierten Liste — 1208 sicher, 604 aus der Gleichstandsgruppe,
**keiner darunter**. Die Liste stimmt also mit der überein, die die Engine
tatsächlich hatte.

## 3. Ergebnis

### 3.1 Das Los entsteht an Gleichständen

```
Top-16-Überlappung zweier Ziehungen, 2618 Stellungen
  volles Rauschen                        51,4 %
  Rauschen × 10⁻⁶ (nur Gleichstände)     51,5 %
  erwartet, wenn NUR gelost wird         51,5 %
```

Das Umsortieren verschiedener Werte trägt nichts Messbares bei. Die
Instabilität ist vollständig durch Gleichstände an Platz 16 erklärt: die
Überlappung, die ein reines Los erwarten lässt (die sicheren Plätze immer,
von s Losplätzen aus g gleichen Zügen im Mittel s²/g), trifft die gemessene
auf ein Zehntel Prozentpunkt.

```
Gleichstand über Platz 16 hinweg:   2494 von 2618 Stellungen (95,3 %)
  Größe der Gleichstandsgruppe:     Median 45, Spanne 2–161
  sicher in der Liste (Wert höher): Median 2 Züge
  per Los vergebene Plätze:         Ø 11,2 von 16
```

### 3.2 Wo — nach dominierendem Experten

Nach Phasengewicht eingeordnet, nicht nach Zugnummer (README, Warnung zur
Methode).

| Experte | Zugbereich | Stellungen | Gleichstand an Platz 16 | Losplätze Ø | Überlappung | gespielter Zug aus dem Los |
|---|---|---:|---:|---:|---:|---:|
| Eröffnung | 5–15 | 120 | 100,0 % | 5,0 | 77,6 % | 0,0 % |
| Mittelspiel | 20–75 | 480 | 79,8 % | 4,5 | 87,6 % | 0,0 % |
| **Endspiel** | **80–395** | **2018** | **98,7 %** | **13,2** | **41,3 %** | **37,2 %** |

In Eröffnung und Mittelspiel gibt es Gleichstände, aber sie liegen unter den
Zügen, die MCTS am Ende wählt: kein einziger gespielter Zug kam dort aus der
gelosten Gruppe. Ab Zug 80 ändert sich das Bild vollständig.

### 3.3 Woran — der Wert 30

In 1677 der 2494 Stellungen mit Gleichstand steht die Gruppe beim Wert
**30**. Das ist der Grundwert des Endspiel-Experten:

```js
let s = (myGain + oppLoss) * PARAMS.endAreaGain;   // endAreaGain = 30
```

`estimateArea` zählt nur vollständig umschlossene Regionen. Ein ruhiger Zug in
offenem Gelände ändert sie um genau ein Feld — den Stein selbst. Eins mal 30
ist 30, für jeden solchen Zug auf dem Brett. Der Endspiel-Experte bewertet ab
Zug 80 (`endgameMoves`, mit acht Zügen Übergang) allein; für ihn ist jede
offene Fläche gleich viel wert. Der zweithäufigste Wert ist 0 (237 Stellungen):
Züge, die weder Gebiet noch Schlag noch Atari bewegen.

### 3.4 Was davon gespielt wird

Im Endspiel kommen **37,2 %** der gespielten Züge aus der gelosten Gruppe
(Kontrolllauf, mit Wiederverwendung des Suchbaums). In den sechs Partien ohne
Wiederverwendung sind es 44,9 % — andere Partien, die Zahlen sind nicht
gegeneinander zu lesen, nur in der Größenordnung. Etwa jeder dritte
Endspielzug der Engine ist damit ein Zug, den MCTS nur per Los überhaupt
prüfen durfte.

### 3.5 Nebenbefund: wiederverwendete Teilbäume

392 gespielte Züge des Kontrolllaufs (15 % der Züge ohne Pässe) liegen
**unter** der Grenze von Platz 16. Sie stammen aus wiederverwendeten
Teilbäumen, deren Kinder im Vorzug `quickEval` ausgewählt hat, nicht
`evaluateMove`: in der Gegenprobe ohne Wiederverwendung sind es null. Das ist
eine Untergrenze dafür, wie oft der Tree-Reuse im Selbstspiel greift — ein
wiederverwendetes Kind, das zufällig auch in den Top-16 liegt, ist hier nicht
zu erkennen. Zum Vergleich: gegen einen Menschen lag die Obergrenze bei
14,7 % (Schlussstand, Frage 3).

### 3.6 Einordnung der 27 %

Die 27 % aus E8 stammen aus 18 Stellungen (Züge 160–194) einer Partie gegen
einen Menschen, also aus dem Endspiel-Bereich. Hier liegt die Überlappung im
Endspiel bei 41,3 %. Richtung und Größenordnung stimmen; die Zahl selbst war,
wie E8 sagt, nicht übertragbar.

## 4. Was daraus folgt — und was nicht

- **Die Frage war richtig gestellt, die Ursache falsch vermutet.** Nicht das
  Rauschen entscheidet, sondern Gleichstände. Weniger Rauschen würde nichts
  ändern. Gar kein Rauschen wäre schlechter: dann entschiede bei Gleichstand
  der Feldindex (stabile Sortierung), also systematisch die linke obere Ecke.
- **Ob das Los Spielstärke kostet, misst diese Untersuchung nicht.** Sie zeigt
  nur, wie viel es entscheidet.
- **Der naheliegende Hebel ist ein informierter Tie-Break**, und die
  Einflusskarte ist einer: bei Gewicht über 0 verschiebt sie Züge nach Zone
  und entscheidet damit die Gleichstände bei 30 nach Zone statt nach Los
  ([`einflusskarte.md`](einflusskarte.md), §3). Ihre Hauptreihe ist damit
  zugleich der erste Stärketest eines informierten Tie-Breaks — kein reiner,
  weil sie auch ungleiche Werte verschiebt.
- **Die Wurzel sieht im Endspiel kaum Bewertung.** Im Median stehen zwei
  Züge über dem Gleichstand; der Rest der 16 ist Los. Die Priors der
  gelosten Züge sind untereinander praktisch gleich (sie unterscheiden sich
  nur um das Rauschen), MCTS muss sie mit 120 Simulationen auseinanderhalten.

## 5. Reproduktion

```bash
# Stellungen: Kontrolllauf aus pilot-benson-defense.md §14.1
node ab-harness.js --games 360 --seed 20260923 \
  --A mctsFixedSims=120,bensonEvalMaxEmpty=160,bensonDeathTransfer=0 \
  --B mctsFixedSims=120,bensonEvalMaxEmpty=160,bensonDeathTransfer=1 \
  --roh repro-ab.jsonl
node auswertung/wurzel-gleichstand.js repro-ab.jsonl --partien 40 --abstand 5

# Gegenprobe zur Rekonstruktion und zum Tree-Reuse
node ab-harness.js --games 6 --seed 777 \
  --A mctsFixedSims=120,mctsTreeReuse=0 --B mctsFixedSims=120,mctsTreeReuse=0 \
  --roh ohne-reuse.jsonl
node ab-harness.js --games 6 --seed 777 \
  --A mctsFixedSims=120 --B mctsFixedSims=120 --roh mit-reuse.jsonl
node auswertung/wurzel-gleichstand.js ohne-reuse.jsonl --abstand 1
node auswertung/wurzel-gleichstand.js mit-reuse.jsonl --abstand 1
```

Die Rauschziehungen der Überlappung laufen über einen festen Seed je
Stellung; alle Zahlen sind damit bei gleichem Commit exakt wiederholbar.
