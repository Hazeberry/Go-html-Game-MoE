# Rettungsbonus in quickEval: Schalter und Pilot

**Stand: 09.10.2026.** Abschnitte 1–4: Schalter und Pilot. Abschnitt 5:
vorab festgelegte Messung, vor dem Lauf. Was danach hinzukommt, steht als
Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

[`verschenkt-warum.md`](verschenkt-warum.md) §2: `quickEval` wählt die Züge
der Rollouts und die Kinder innerer Knoten der Suche. Sie gibt +80 je
Nachbarstein einer eigenen Kette mit höchstens zwei Freiheiten, auch wenn die
Kette nach dem Zug genauso schwach bleibt. So verlängern beide Seiten in Suche
und Rollouts schwache Ketten, und die Bewertung der Stellungen hängt an
solchen Rettungsläufen.

Die beiden anderen Hebel aus der Diagnose sind gemessen:
- `gebietFreiheit`: +19,5, nicht signifikant, kein Default
  ([`gebiet-freiheit.md`](gebiet-freiheit.md))
- `wurzelFrisch`: +25,7, Default ([`wurzel-frisch.md`](wurzel-frisch.md))

## 2. Der Schalter

**`quickRettung`**: Der Bonus von +80 je schwachem Nachbarstein zählt nur
noch, wenn die eigene Kette nach dem Zug mindestens drei Freiheiten hat, die
Rettung also wirkt. Alles andere an `quickEval` bleibt. Bei 0 rechnet
`quickEval` bitgenau wie vorher, nachgerechnet an allen freien Punkten
echter Stellungen in `tests/quick-rettung.js`.

## 3. Pilot

20 Partien gegen GNU Go (Stufe 1, neun Vorgabesteine, 120 Simulationen,
Seed 131, Partien 1–20). Gepaart mit dem heutigen Default, also Arm B aus
`daten/wurzel-gnugo.json`. Vier Default-Partien kamen mit dem neuen Code
exakt wie gespeichert heraus.

| | Default | `quickRettung` 1 |
|---|---:|---:|
| Endstand | −64,8 | −39,2 |
| B − A | | **+25,6** (SD 53,0, t = 2,16), besser in 14, schlechter in 6 |
| nach Zug 120 / 200 | | +3,6 / +7,9 |
| Partielänge | Ø 261 | Ø 244 |
| GNU Go gibt auf | 2 | 4 |
| verschenkte eigene Züge ab Zug 100, je Partie | 32,6 | 29,6 |

Der Vorteil entsteht vor allem nach Zug 200. Mit 20 Partien ist das ein
Pilot: Die Piloten der letzten Messungen lagen jeweils über dem späteren
Ergebnis (+40,4 → +25,7 bei `wurzelFrisch`, +22,1 → +19,5 bei
`gebietFreiheit`).

## 4. Nächster Schritt

Eine Messung im bewährten Ablauf, vorab festgelegt, mit neuem Seed:
- M1 gegen GNU Go als Hauptendpunkt, 60 Paare
- M2 Selbstspiel als Kontrolle, 360 Partien
- Entscheidungsregel wie in [`endspiel-verlust.md`](endspiel-verlust.md) §4

## 5. Messung, vorab festgelegt (09.10.2026, vor dem Lauf)

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`quickRettung` 0; `leseVerzicht` 1, `wurzelFrisch` 1) |
| B | `quickRettung` = 1 |

Neuer Seed, damit die Pilotpartien nicht mitzählen. Beide Arme werden neu
gespielt.

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, bis 600 Züge, `--seed 141`, 60 Partien je Arm in
vier Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 141 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh quick-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,quickRettung=1
done
node auswertung/gnugo-vergleich.js --A quick-gnugo-A-*.jsonl --B quick-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261110 20261111 20261112 20261113; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,quickRettung=1 \
    --roh quick-$s.jsonl --json quick-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt** (wie in
[`endspiel-verlust.md`](endspiel-verlust.md) §4):

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `quickRettung` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Aufgaben von GNU Go je Arm, Partielänge
- verschenkte Züge je Arm (`auswertung/verschenkt.js`)
- Wächter der Baumwiederverwendung je Arm

**Grenzen:**
- `quickEval` wirkt in Rollouts und inneren Knoten, also auf beide Seiten
  der Suche. Im Selbstspiel spielen beide Arme damit gegeneinander; der
  Schalter ändert dort, wie B die Antworten von A einschätzt.
- Der Pilot (+25,6 über 20 Partien) ist zum Teil Zufall: Die Piloten der
  letzten Messungen lagen über dem späteren Ergebnis. Bei einer Streuung um
  85–100 Punkte erkennen 60 Paare einen Unterschied von 25 Punkten etwa zur
  Hälfte.
- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
  Gemessen wird mit 120 Simulationen.

---

## 6. Nachtrag: Ergebnis, Default bleibt 0 (10.10.2026)

Gelaufen auf dem Merge-Commit `94d3f8b`, ohne Unterbrechung. Daten:
`daten/quick-gnugo.json` (M1, beide Arme, mit Wächter) und
`daten/quick-20261110.json` bis `…13.json` (Hash-Listen M2).

**M1, gegen GNU Go (primär), 60 Paare, Seed 141:**

| | A (Default) | B (`quickRettung` 1) | B − A |
|---|---:|---:|---|
| **Endstand** | −26,5 | −41,4 | **−14,9** (SD 75,1), p = 0,13 |
| nach Zug 120 | +47,6 | +46,5 | −1,0, p = 0,78 (52 Paare) |
| nach Zug 200 | −47,6 | −44,9 | +2,7, p = 0,71 (36 Paare) |

- B ist in 25 von 60 Paaren besser, in 32 schlechter, in 3 gleich, im
  Median um 6 Punkte schlechter.
- Teilläufe B − A: +22,3 / −33,4 / −28,0 / −20,4. Nur die ersten 15
  Partien sehen aus wie der Pilot.
- GNU Go gab mit A 23-mal auf, mit B 17-mal.
- Partielänge: Ø 218 Züge (A) gegen 230 (B).

**M2, Selbstspiel (Kontrolle):** B gewinnt **187 von 360 Partien, 51,9 %**
(z = 0,74, p = 0,46, 95-%-KI 46,8–57,1 %). Teilläufe: 50,0 / 53,3 / 48,9 /
55,6 %.

**Entscheidung nach §5: Default bleibt `quickRettung` = 0.** M1 ist nicht
signifikant besser, sondern im Mittel 15 Punkte schlechter, ebenfalls nicht
signifikant. Der Schalter bleibt im Dashboard.

**Sekundär:**

| | A | B |
|---|---:|---:|
| Suchen mit übernommenem Teilbaum | 12 % (768 von 6 496) | 11 % (777 von 6 826) |
| verschenkt ab Zug 100, bis Zug 200 | 38 % (14,0 je Partie) | 40 % (16,1) |
| verschenkt nach Zug 200 | 60 % (14,0 je Partie) | 53 % (13,4) |

**Woher die −14,9 kommen:**

| Paare | Anzahl | B − A im Mittel |
|---|---:|---:|
| GNU Go gibt nur gegen A auf | 8 | −145,8 |
| GNU Go gibt nur gegen B auf | 2 | +87,0 |
| GNU Go gibt in beiden auf | 15 | −1,9 |
| beide ausgespielt | 35 | +3,7 |

Bei einer Aufgabe zählt die Stellung, wie sie stehen blieb, oft weit vor
dem Ende. Der Unterschied kommt also fast ganz aus den acht Paaren, die GNU
Go nur gegen A aufgab. In den ausgespielten Paaren liegen die Arme
gleichauf.

**Einordnung:**
- Der Pilot (+25,6 über 20 Partien, t = 2,16) hielt nicht. Auch die
  letzten Piloten lagen über dem späteren Ergebnis, dieser so weit, dass
  kein Vorteil übrig blieb. §5 hatte damit gerechnet: Bei dieser Streuung
  ist ein Pilot über 20 Partien zum Teil Zufall.
- Weder M1 noch M2 noch die verschenkten Züge zeigen eine Wirkung. Die
  Rettungen in Suche und Rollouts sind damit kein messbarer Hebel. Den
  größten Teil des Vorsprungs verschenkter Züge bringt weiter die
  Zugbewertung selbst ([`verschenkt-warum.md`](verschenkt-warum.md) §2).
- Mit Seed 141 gewann der Default 24 von 60 Partien, 23 davon durch
  Aufgabe von GNU Go. Mit Seed 131 waren es 8. Vier Default-Partien mit
  Seed 131 kamen auf dem Messcommit exakt wie in `daten/wurzel-gnugo.json`
  gespeichert heraus. Der Code ist also unverändert; die Partien dieses
  Seeds liegen der KI besser. Der gepaarte Vergleich ist davon nicht
  berührt, Mittelwerte aus verschiedenen Seeds sind aber nicht
  vergleichbar.
