# Frische Wurzel bei Tree-Reuse: vorab festgelegte Messung

**Status: festgelegt am 09.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

[`verschenkt-warum.md`](verschenkt-warum.md) §2 fand einen Nebenweg, auf dem
verschenkte Züge in die Suche kommen, die Baumwiederverwendung
(`mctsTreeReuse`):
- Hat die Suche die Antwort des Gegners schon untersucht, übernimmt sie
  deren Teilbaum.
- Die Wurzelkinder dieses Teilbaums hat im vorigen Zug `quickEval`
  ausgesucht. Das sind acht Stück (`mctsChildren`), mit Priors aus
  `quickEval`.
- Die frische Kandidatenliste von `getAIMove` filtert sie nur noch nach
  Legalität. Was `evaluateMove` vorn sieht, kommt dann nicht in die Suche.
- `quickEval` bevorzugt Züge an schwache eigene Ketten (+80) und neben
  gegnerischen Ketten im Atari (+200).

Ein Pilot ganz ohne Wiederverwendung brachte +26,1 Punkte über 16 Partien
(t = 0,86).

## 2. Der Schalter und der Pilot

**`wurzelFrisch`**: Wird ein Teilbaum übernommen, bildet die Suche die
Wurzelkinder neu aus der Kandidatenliste von `getAIMove`
(`mctsRootChildren` = 16, Prior aus `evaluateMove`). Was der alte Baum über
dieselben Züge weiß (Besuche, Werte, Teilbäume, AMAF-Zahlen), wird
übernommen. Alte Kinder, die nicht unter den neuen 16 sind, fallen weg. Bei 0
bleibt die Suche bitgenau die alte. Tests in `tests/wurzel.js`.

Ein Wächter (`leseWurzelWaechter`) zählt Suchen, übernommene Teilbäume und
übernommene bzw. verworfene alte Kinder. `gnugo-duell.js` schreibt ihn je
Partie in den Rohdump (Feld `wurzel`).

**Pilot**, 16 Partien gegen GNU Go mit Seed 111, gepaart mit dem Default:

| | Default | `wurzelFrisch` 1 |
|---|---:|---:|
| Endstand | −83,5 | −43,1 |
| B − A | | **+40,4** (SD 123,1, t = 1,31), besser in 10 von 16 |
| Suchen mit übernommenem Teilbaum | 9 % (194 von 2 059) | 12 % (222 von 1 925) |
| alte Wurzelkinder übernommen / verworfen | | 158 / 812 |

Die Default-Partien kamen mit dem neuen Code in allen 16 Fällen exakt wie
gespeichert heraus. Bei 0 ändern Schalter und Wächter also nichts.

Nur jede zehnte Suche ist betroffen. Bei einem Pilotergebnis von +40 Punkten
ist Vorsicht angebracht, die Streuung ist groß.

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default (`wurzelFrisch` 0) |
| B | `wurzelFrisch` = 1 |

## 4. Messung

Neuer Seed, damit die Pilotpartien nicht mitzählen. Beide Arme werden neu
gespielt.

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, bis 600 Züge, `--seed 131`, 60 Partien je Arm in
vier Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 131 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh wurzel-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,wurzelFrisch=1
done
node auswertung/gnugo-vergleich.js --A wurzel-gnugo-A-*.jsonl --B wurzel-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261100 20261101 20261102 20261103; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,wurzelFrisch=1 \
    --roh wurzel-$s.jsonl --json wurzel-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt** (wie in
[`endspiel-verlust.md`](endspiel-verlust.md) §4):

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `wurzelFrisch` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Aufgaben von GNU Go je Arm, Partielänge
- Wächter je Arm
- verschenkte Züge je Arm (`auswertung/verschenkt.js`)

## 5. Grenzen

- Der Schalter wirkt nur in Suchen mit übernommenem Teilbaum, im Pilot
  rund jede zehnte.
- Die Baumwiederverwendung im Selbstspiel des Harness führt den Zustand je
  Farbe (`ab-harness.js`, Modulzustand pro Farbe), gegen GNU Go nur für die
  KI. Die Häufigkeit kann sich zwischen M1 und M2 unterscheiden.
- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
  Gemessen wird mit 120 Simulationen.
