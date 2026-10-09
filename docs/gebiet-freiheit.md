# Gebiet nach Freiheiten: vorab festgelegte Messung

**Status: festgelegt am 09.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

[`verschenkt-warum.md`](verschenkt-warum.md) hat gezeigt, warum die KI
gegen GNU Go noch rund 40 % ihrer Züge ab Zug 100 verschenkt:
- Die Suche folgt meist dem Favoriten von `evaluateMove`.
- Den Vorsprung eines verschenkten Zuges bringt in 54 % der Fälle der
  Gebietsanteil (`gebietZug`). Er rechnet den Gewinn auf der Einflusskarte
  so, als bliebe der neue Stein stehen.
- Ob er stehen bleibt, hängt stark an den Freiheiten seiner Kette: Mit zwei
  Freiheiten nach dem Zug sterben 73 %, mit drei 53 %, mit vier 46 %, mit
  fünf und mehr 16 %.

## 2. Der Schalter und der Pilot

**`gebietFreiheit`**: Ein positiver Gebietsanteil aus `gebietZug` zählt nur
anteilig, wenn die Kette des neuen Steins danach wenige Freiheiten hat:

| Freiheiten nach dem Zug | 1 | 2 | 3 | ab 4 |
|---|---:|---:|---:|---:|
| Anteil des Gebietsgewinns | 0 | 0,25 | 0,6 | 1 |

Ein negativer Anteil bleibt unverändert. Der Schalter wirkt überall, wo
`evaluateMove` rechnet (Wurzel, Pass-Prüfung, Leicht und Mittel). Bei 0 ist
die Bewertung bitgenau die alte. Test in `tests/gebiet.js`.

**Pilot** (`verschenkt-warum.md` §3), 16 Partien gegen GNU Go mit Seed 111,
gepaart mit dem Default: Endstand +22,1 (SD 93,5, t = 0,95), besser in 11
von 16. Verschenkte eigene Züge ab Zug 100: 38,1 → 26,9 je Partie. Der Pilot
lief mit demselben Code in einer Kopie außerhalb des Repos.

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default (`gebietFreiheit` 0) |
| B | `gebietFreiheit` = 1 |

## 4. Messung

Neuer Seed, damit die Pilotpartien nicht mitzählen. Beide Arme werden neu
gespielt.

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, bis 600 Züge, `--seed 121`, 60 Partien je Arm in
vier Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 121 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh freiheit-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,gebietFreiheit=1
done
node auswertung/gnugo-vergleich.js --A freiheit-gnugo-A-*.jsonl --B freiheit-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261090 20261091 20261092 20261093; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,gebietFreiheit=1 \
    --roh freiheit-$s.jsonl --json freiheit-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt** (wie in
[`endspiel-verlust.md`](endspiel-verlust.md) §4):

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `gebietFreiheit` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Aufgaben von GNU Go je Arm, Partielänge
- verschenkte Züge je Arm (`auswertung/verschenkt.js`)

## 5. Grenzen

- Die Anteile (0 / 0,25 / 0,6 / 1) sind aus der Verlustrate je Freiheiten
  grob abgeleitet, nicht optimiert. Gemessen wird nur diese eine Stufe.
- Freiheiten sind ein grobes Maß für die Stärke einer Kette. Augen und
  Verbindungen sieht der Schalter nicht.
- Der Pilot zeigte +22 Punkte; bei einer Streuung um 100 Punkte erkennen 60
  Paare einen solchen Unterschied nur knapp zur Hälfte. Ein Nullergebnis
  hieße daher nicht, dass der Schalter wirkungslos ist.
- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
  Gemessen wird mit 120 Simulationen.
