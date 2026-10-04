# Gebiet in der Bewertung: vorab festgelegte Messung

**Status: festgelegt am 04.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

[`gnugo.md`](gnugo.md): Gegen GNU Go gewinnt die KI keine Partie, auch nicht
mit neun Vorgabesteinen gegen Stufe 1. Sie baut Mauern Stein an Stein und
verliert ihre Steine. `evaluateBoard` und `evaluateMove` kennen kein Gebiet.
[`skalierung.md`](skalierung.md): Mehr Suche schließt die Lücke nicht.

## 2. Was der Pilot gezeigt hat

Gemessen gegen GNU Go 3.8 Stufe 1, neun Vorgabesteine für uns, 120
Simulationen, Aufgabe aus. Die Partie endet nach 120 Zügen. Messgröße ist
GNU Gos `estimate_score` aus unserer Sicht (+ = wir vorn). Je Variante 8
Partien mit denselben Seeds (`--seed 31`), also gepaart.

**Woher der Mauerbau kommt.** Ab Zug 16 spielt die KI fast immer den Zug auf
Rang 1 von `evaluateMove`, und dessen Wert wächst mit jeder Verlängerung
derselben Kette: P13 = 500, P12 = 636, P11 = 756, P10 = 868. Treiber ist
`libGewicht(lib) × midLibBonus` im Mittelspiel-Experten. `lib` ist die
absolute Freiheitszahl der Kette nach dem Zug, und ein Stein an einer langen
Kette erbt sie ganz.

**Den Freiheitsterm zu schwächen schadet, auch gegen GNU Go:**

| Variante | Schätzung nach 60 | nach 120 |
|---|---:|---:|
| Default | −127,9 | −199,5 |
| `midLibCap` = 12 | −148,9 | −307,9 |
| `midLibSoft` = 12 | −158,9 | −311,9 |
| `midLibBonus` = 10 | −150,1 | −273,5 |
| `midLibBonus` = 0 | −159,9 | −334,4 |

Das bestätigt die Selbstspiel-Messungen am Parameter `midLibCap`: Der Term
trägt das Leben der Gruppen, der Mauerbau ist eine Nebenwirkung.

**Gebiet in der Stellungsbewertung (`gebietGewicht`) wirkt nicht:**

| `gebietGewicht` | nach 60 | nach 120 |
|---|---:|---:|
| 0 | −127,9 | −199,5 |
| 2 | −135,0 | −245,4 |
| 5 | −117,3 | −202,4 |
| 10 | −110,9 | −188,7 |

Mit 120 Simulationen auf 16 Kandidaten bekommt jeder rund sieben
Rollouts. Die Zugwahl kommt fast ganz aus `evaluateMove`.

**Gebiet in der Zugbewertung (`gebietZug`) wirkt stark:** Jeder Kandidat an
der Wurzel bekommt `gebietZug ×` die Änderung der Bouzy-Bilanz durch den Zug.
Das ist dieselbe Rechnung wie bei `endTieBreak`, aber ungedeckelt und in
allen Phasen.

| `gebietZug` | nach 30 | nach 60 | nach 90 | nach 120 |
|---|---:|---:|---:|---:|
| 0 | +6,5 | −127,9 | −214,6 | −199,5 |
| 5 | +74,3 | −35,8 | −125,3 | −143,4 |
| 15 | +132,3 | +16,0 | −85,8 | −116,8 |
| 40 | +134,6 | +95,5 | +50,4 | +1,7 |
| **80** | +121,3 | **+116,2** | +84,4 | **+34,5** |
| 150 | +133,1 | +108,8 | +79,4 | +28,0 |

80 gegen 0, gepaart: nach 120 Zügen +234,0 (SD 62,1, n = 8). In ganzen
Partien ohne Aufgabe verliert die KI auch mit 80 alle 6, und zusammen mit
`gebietGewicht` = 5 ebenso alle 6. Der Vorsprung aus der Eröffnung geht im
Mittel- und Endspiel wieder verloren. Das ist eine eigene Frage.

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default |
| B | `gebietZug` = 80 |

Die Dosis stammt aus dem Pilot (Seed 31). Die Hauptmessung läuft mit neuen
Seeds. `gebietGewicht` bleibt 0 und wird nicht weiter gemessen.

## 4. Messungen und Endpunkte

**M1, extern, primär:** gegen GNU Go 3.8 Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, bis Zug 120. Je Arm 60 Partien mit denselben Seeds,
als vier Teilläufe zu je 15:

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 71 --stufe 1 --vorgabe 9 \
    --maxzuege 120 --schaetzung 60,120 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh gebiet-m1-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,gebietZug=80
done
node auswertung/gnugo-vergleich.js --A gebiet-m1-A-*.jsonl --B gebiet-m1-B-*.jsonl --zug 60,120
```

Endpunkt: mittlere gepaarte Differenz B − A der Schätzung nach Zug 120,
gepaarter t-Test, zweiseitig, α = 0,05. Partien, die durch einen GNU-Go-
Absturz abbrechen, fallen samt Partner heraus.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261026 20261027 20261028 20261029; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,gebietZug=80 \
    --roh gebiet-m2-$s.jsonl --json gebiet-m2-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 | M2 | Folge |
|---|---|---|
| B besser, p < 0,05 | B nicht signifikant schlechter (also nicht „B < 50 % mit p < 0,05") | Default `gebietZug` = 80 |
| B besser, p < 0,05 | B signifikant schlechter | kein Default; Selbstspiel und fremder Gegner widersprechen sich, das wird untersucht |
| sonst | — | Default bleibt 0 |

Eine Wiederholung wie bei `endTieBreak` ist hier nicht vorgesehen: M1 ist
mit dem fremden Gegner selbst die unabhängige zweite Messung.

**Sekundär, ohne Anspruch:** M1 nach Zug 60; in M2 Aufgaben je Arm und
Partielänge; die Kosten je Zug.

## 5. Grenzen

- M1 misst die ersten 120 Züge. Dass die KI damit Partien gewinnt, wird
  nicht behauptet (siehe §2: ganze Partien gehen weiter verloren).
- GNU Gos `estimate_score` ist eine Schätzung, keine Auszählung. Sie ist
  aber für beide Arme dieselbe und kommt von einem Programm, das unsere
  Bewertung nicht teilt.
