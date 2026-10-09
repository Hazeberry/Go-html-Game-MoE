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
