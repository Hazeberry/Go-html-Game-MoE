# Muster aus GNU-Go-Zügen: `musterGewicht`

**Status: festgelegt am 11.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–7 werden nicht mehr geändert.

---

## 1. Anlass

Die Diagnosen der letzten Tage laufen auf dieselbe Lücke hinaus. Die KI
verliert ihre Gruppen nicht an Augen ([`augen-urteil.md`](augen-urteil.md)).
Sie antwortet auf Annäherungen lokal, aber selten mit dem Zug, den GNU Go
spielen würde ([`annaeherung.md`](annaeherung.md)). Umgewichten hilft nicht:
Weder `gebietFreiheit` noch ein Gebiet mit Lesestatus bringen GNU Gos Antwort
nach vorn ([`annaeherung.md`](annaeherung.md) §10). Der Zugbewertung fehlt
Formwissen, also welcher lokale Zug gut ist.

Die übliche Quelle für Formwissen sind Muster, deren Spielrate man aus den
Zügen eines stärkeren Spielers lernt. Das bringt neue Information in die
Zugbewertung. Nach der Regel im Harness-Kopf ist das die Art Eingriff, die
wirken kann; der bisher größte Erfolg `leseVerzicht` war auch so einer.

## 2. Lehrdaten

`auswertung/muster-daten.js` spielt die 120 ausgespielten Default-Partien
aus [`punktverlust.md`](punktverlust.md) nach (Seed 151 und 161). An jeder
zweiten Stellung von Zug 10 bis 250 fragt es GNU Go auf Stufe 10 nach
seinem Zug für die Seite am Zug. Das ergibt 14 021 Stellungen für beide
Farben; vier Prozesse brauchten rund 75 Minuten.

```bash
node auswertung/muster-daten.js <dumps> --aus muster-daten.jsonl
```

## 3. Merkmale und Machbarkeit

`auswertung/muster.js` beschreibt jeden legalen Zug durch:
- **3×3-Muster:** die acht Nachbarn (leer, eigen, fremd, Rand). Direkte
  Nachbarsteine sind markiert, wenn ihre Kette 1 oder 2 Freiheiten hat.
  Das Muster ist auf Drehung und Spiegelung normiert.
- **Abstand zum letzten Zug des Gegners:** 1, 2, 3, 4–6, weiter oder
  keiner.
- **Linie:** 1–4 oder 5 und höher.

Je Merkmalswert zählt das Werkzeug, wie oft ein Zug damit möglich war und
wie oft GNU Go ihn wählte. Der Musterwert eines Zugs ist die Summe der
Logarithmen von „so viel häufiger als im Schnitt“. Ein Merkmal zum
vorletzten Zug (dem eigenen) brächte 1–2 Prozentpunkte mehr, die Engine
kennt diesen Zug in `getAIMove` aber nicht. Es fehlt deshalb.

Gelernt an 90 Partien, geprüft an 30 anderen (Partien mit nr % 4 = 0).
Gezählt wird, wo GNU Gos Zug unter allen legalen Zügen landet:

| | bis Zug 80: Rang 1 | Rang ≤ 16 | ab Zug 81: Rang 1 | Rang ≤ 16 |
|---|---:|---:|---:|---:|
| `evaluateMove` (heute) | 0,0 % | 0,7 % | 1,6 % | 6,6 % |
| nur Muster | **19,6 %** | **73,8 %** | **14,7 %** | **68,5 %** |
| `evaluateMove` + 400 × Muster | 1,6 % | 7,7 % | 5,8 % | 30,3 % |
| `evaluateMove` + 800 × Muster | 12,6 % | 41,8 % | 11,3 % | 49,9 % |

**Gegenprobe:** Dieselbe Rechnung setzt den Zug, den die KI tatsächlich
spielte, in 45 % auf Rang 1 und in 97 % unter die ersten 16. Der Aufbau
stimmt also. Die Zugwahl der KI ist dagegen fast unabhängig von GNU Gos
Wahl: Die Züge von GNU Go Stufe 1 landen nur in 1,4 % auf Rang 1 und in
5,8 % unter den ersten 16. Bei 227 legalen Zügen im Schnitt brächte reiner
Zufall etwa 7 %.

Die Tabelle in `index.html` ist aus allen 120 Partien gelernt. Sie enthält
nur Merkmalswerte, die mindestens fünfmal möglich waren: 2689 Einträge,
74 KB.

```bash
node auswertung/muster.js muster-daten.jsonl --ohne-vor                          # Machbarkeit
node auswertung/muster.js muster-daten.jsonl --alle --ohne-vor --min 5 --tabelle t.json   # Tabelle
```

## 4. Der Schalter

`musterGewicht` (Default 0): Jeder Kandidat an der Wurzel der KI bekommt
`musterGewicht × musterWert(Zug)` zu seiner Bewertung. Der Term wirkt nur
dort, nicht in den Gegnerbewertungen. Bei 0 ist das Verhalten bitgenau das
alte. Test: `tests/muster.js`. Er prüft auch, dass der Musterschlüssel in
`index.html` derselbe ist wie in `auswertung/muster.js`.

## 5. Piloten

Gegen GNU Go Stufe 1, neun Vorgabesteine, 120 Simulationen, ausgespielt,
je 30 Paare:

| `musterGewicht` | Seed | Endstand B − A | p | nach Zug 200 | Siege A / B |
|---:|---:|---:|---:|---:|---:|
| 100 | 192 | +64,9 | 0,0001 | +46,9 | 6 / 15 |
| 200 | 192 | +70,5 | 0,0002 | +45,2 | 6 / 17 |
| 400 | 191 | +76,0 | 0,00001 | +63,4 | 3 / 19 |
| 400 | 192 | +70,1 | 0,00004 | +51,8 | 6 / 19 |
| 800 | 191 | +12,9 | 0,36 | +14,1 | 3 / 6 |
| 1600 | 191 | +1,2 | 0,94 | +6,3 | 3 / 3 |

Von 100 bis 400 liegt ein Plateau um +70 Punkte, ab 800 bricht der Effekt
ein. Gewählt wird die Mitte des Plateaus, **200**. Das hält Abstand zur
Klippe bei 800 und folgt der Regel, nicht den Spitzenwert zu nehmen.

Auffällig in den Piloten: Mit dem Schalter passt GNU Go viel öfter (17,4
gegen 4,2 Pässe je Partie bei 400, erster Pass meist zwischen Zug 180 und
220). GNU Go findet dann keinen sinnvollen Zug mehr. Die KI passt in beiden
Armen gleich selten (1,2 je Partie). Gezählt wird wie immer GNU Gos
Auszählung der Schlussstellung.

Der Pilot hat aus sechs Armen eine Dosis ausgewählt. Er belegt deshalb
nichts; das tut die Messung unten mit frischem Seed.

## 6. Messung, vorab festgelegt

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`musterGewicht` 0) |
| B | `musterGewicht` = 200 |

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600 Züge,
neuer Seed `--seed 201`. **240 Partien je Arm** ([`teststaerke.md`](teststaerke.md)),
in 16 Teilläufen zu 15, gefahren in vier Wellen zu je acht Prozessen.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 201 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh muster-gnugo-A-$v.jsonl
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,musterGewicht=200
done
node auswertung/gnugo-vergleich.js --A muster-gnugo-A-*.jsonl --B muster-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.
Bei einer Streuung um 65–90 Punkte erkennen 240 Paare einen Unterschied
von rund 12–16 Punkten mit 80 % Wahrscheinlichkeit. Berichtet wird das
95-%-Intervall.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261170 20261171 20261172 20261173; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,musterGewicht=200 \
    --roh muster-$s.jsonl --json muster-$s.json
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `musterGewicht` = 200 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Siege je Arm, Partielänge, Pässe je Seite
- Laufzeit je Zug (der Term rechnet für jeden Kandidaten ein Muster)

## 7. Grenzen

- **Lehrer und Gegner kommen aus demselben Programm.** Gelernt ist von GNU
  Go auf Stufe 10, gemessen wird gegen GNU Go auf Stufe 1. Die Muster
  ahmen einen stärkeren GNU Go nach. Ob das gegen andere Gegner genauso
  hilft, zeigt nur M2 (Selbstspiel) und später das Spiel gegen Menschen.
- **Die Lehrdaten stammen aus Partien mit neun Vorgabesteinen.** Muster
  sind lokal und sollten übertragbar sein; die Abstands- und
  Linienmerkmale tragen aber auch die Eigenheiten dieser Partien.
- Mit 120 Simulationen folgt die Suche fast immer ihrem Favoriten. Der
  Schalter verschiebt vor allem diesen Favoriten. Bei mehr Simulationen
  kann die Wirkung anders ausfallen.
