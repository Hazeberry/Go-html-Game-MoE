# Muster ausbauen: zweite Tabelle `musterTabelle` 2

**Status: festgelegt am 12.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–6 werden nicht mehr geändert.

---

## 1. Anlass

Die erste Mustertabelle ([`muster.md`](muster.md)) brachte gegen GNU Go
+102,8 Punkte. Sie zählt jedes Merkmal einzeln (wie viel häufiger als im
Schnitt wählt GNU Go einen Zug damit) und addiert die Logarithmen, als
wären die Merkmale unabhängig. Sie überlappen aber: Ein Kontaktzug liegt
meist auch nah am letzten Zug. Und taktische Folgen eines Zugs (schlägt er,
rettet er, setzt er sich selbst ins Atari) sieht das 3×3-Muster nur
teilweise.

## 2. Was neu ist

- **Mehr Lehrdaten:** 120 Partien der Muster-KI aus der Messung in
  [`muster.md`](muster.md) §8 (Arm B), an jeder zweiten Stellung von Zug 10
  bis 250 mit GNU Gos Zug auf Stufe 10: 12 784 Stellungen. Zusammen mit den
  alten 14 021 sind es rund 26 800.
- **Gemeinsam gelernte Gewichte** (`auswertung/muster.js --verfahren mm`):
  verallgemeinertes Bradley-Terry-Modell mit dem MM-Verfahren nach Coulom
  (2007). Jeder Merkmalswert hat eine Stärke, ein Zug die Stärke des
  Produkts seiner Merkmale. Die Gewichte werden so gelernt, dass GNU Gos
  Zug unter allen legalen Zügen möglichst wahrscheinlich wird. Vorwissen:
  ein virtueller Sieg und eine virtuelle Niederlage gegen Stärke 1.
- **Taktisches Merkmal** (`--taktik`): schlägt 0, 1 oder 2+ Steine,
  Selbstatari, rettet eine eigene Kette aus dem Atari, setzt eine fremde
  ins Atari.

## 3. Machbarkeit

Gelernt aus den Trainingspartien beider Läufe (nr % 4 ≠ 0), geprüft an den
Testpartien der Muster-KI (nr % 4 = 0, 30 Partien). Rang 1 von GNU Gos Zug
unter allen legalen Zügen, nur nach Muster:

| Tabelle | bis Zug 80 | ab Zug 81 | ab Zug 81, Rang ≤ 16 |
|---|---:|---:|---:|
| heute im Spiel (`MUSTER_TABELLE`) | 11,6 % | 19,3 % | 76,6 % |
| einzeln gezählt, mehr Daten | 11,7 % | 20,8 % | 79,5 % |
| gemeinsam gelernt, mehr Daten | 16,5 % | 26,4 % | 83,3 % |
| **gemeinsam + Taktik, mehr Daten** | **16,6 %** | **27,7 %** | **83,0 %** |

Mehr Daten allein bringen wenig. Der Gewinn kommt aus dem gemeinsamen
Lernen, das taktische Merkmal legt ab Zug 81 etwas drauf. Auf den alten
Daten allein (geprüft an alten Testpartien) war der Abstand kleiner: 17,7
gegen 14,7 % ab Zug 81.

Die Tabelle in `index.html` (`MUSTER_TABELLE_2`) ist aus allen 240 Partien
gelernt, mit Merkmalswerten, die mindestens fünfmal möglich waren: 3003
Einträge, 82 KB.

```bash
node auswertung/muster-daten.js <Partien der Muster-KI> --aus neu.jsonl
node auswertung/muster.js alt.jsonl neu.jsonl --test neu.jsonl --ohne-vor --verfahren mm --taktik
node auswertung/muster.js alt.jsonl neu.jsonl --alle --ohne-vor --verfahren mm --taktik --min 5 --tabelle t.json
```

## 4. Der Schalter und die Piloten

`musterTabelle` (Default 1): 2 benutzt `MUSTER_TABELLE_2` und das
taktische Merkmal. Bei 1 ist das Verhalten bitgenau das alte. Test:
`tests/muster.js`, das taktische Merkmal in `index.html` ist dasselbe wie in
`auswertung/muster.js`.

Die Werte der neuen Tabelle streuen etwa 1,4-mal so stark. Piloten gegen
den Default (Tabelle 1, Gewicht 200), GNU Go Stufe 1, neun Vorgabesteine,
ausgespielt, je 30 Paare:

| Tabelle 2, Gewicht | Seed | Endstand B − A | p | Siege A / B |
|---:|---:|---:|---:|---:|
| 100 | 193 | +1,3 | 0,94 | 15 / 17 |
| 150 | 194 | −22,5 | 0,12 | 12 / 10 |
| 200 | 193 | +24,5 | 0,15 | 15 / 25 |
| 200 | 194 | +11,4 | 0,43 | 12 / 22 |
| 250 | 194 | +13,3 | 0,42 | 12 / 16 |
| 300 | 193 | −11,7 | 0,43 | 15 / 12 |

Kein Pilot ist signifikant, die Kurve ist unruhig. Gewicht 200 ist das
einzige, das in beiden Seeds vorn liegt (zusammen rund +18 über 60 Paare,
Siege 47 gegen 27). Gewählt wird **200**. Erwartet ist damit eher ein
Effekt von 10–20 Punkten als ein Sprung wie bei der ersten Tabelle; die
Messung erkennt rund 12 Punkte sicher ([`teststaerke.md`](teststaerke.md)).

## 5. Messung, vorab festgelegt

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`musterTabelle` 1, `musterGewicht` 200) |
| B | `musterTabelle` = 2 (`musterGewicht` 200) |

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600 Züge,
neuer Seed `--seed 202`, 240 Partien je Arm in 16 Teilläufen zu 15.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 202 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh ausbau-gnugo-A-$v.jsonl
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,musterTabelle=2
done
node auswertung/gnugo-vergleich.js --A ausbau-gnugo-A-*.jsonl --B ausbau-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05,
mit 95-%-Intervall.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261180 20261181 20261182 20261183; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,musterTabelle=2 \
    --roh ausbau-$s.jsonl --json ausbau-$s.json
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `musterTabelle` = 2 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 1 |

**Sekundär, ohne Anspruch:** M1 nach Zug 120 und 200, Siege je Arm,
Partielänge, Laufzeit je Zug.

## 6. Grenzen

- Lehrer und Gegner sind wie in [`muster.md`](muster.md) §7 dasselbe
  Programm, auf verschiedenen Stufen.
- Die neuen Lehrdaten stammen aus Partien der Muster-KI mit Tabelle 1. Was
  die KI mit Tabelle 2 spielt, sieht wieder etwas anders aus.
- Das Gewicht ist nur grob bestimmt. Ein besseres Gewicht kann es geben;
  die Messung prüft nur 200.
