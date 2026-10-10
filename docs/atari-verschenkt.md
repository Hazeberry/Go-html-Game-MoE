# Verschenkte Atari-Züge: Diagnose und Schalter

**Stand: 10.10.2026.** Abschnitte 1–4: Diagnose, Schalter, Pilot.
Abschnitt 5: vorab festgelegte Messung, vor dem Lauf. Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

„Atari geben“ ist die häufigste Art verschenkter Züge der KI gegen GNU Go
([`quick-rettung.md`](quick-rettung.md) §6, `auswertung/verschenkt.js`).
Den Vorsprung verschenkter Züge in der Zugbewertung bringt zu 34 % der
Krisenteil `evalTsumego` ([`verschenkt-warum.md`](verschenkt-warum.md) §2).
Steht ein Punkt neben einer großen gegnerischen Kette mit zwei Freiheiten,
kommt der Wert des Zugs zu 80 % aus `evalTsumego`, und das Atari bringt dort
+500, ob die Kette entkommen kann oder nicht.

## 2. Diagnose

`auswertung/atari-verschenkt.js` auf den 60 ausgespielten Default-Partien
der Nachmessung von `gebietFreiheit` (Seed 151, GNU Go gibt nicht auf,
[`gebiet-freiheit.md`](gebiet-freiheit.md) §7), Züge ab 100. Ein Atari-Zug
setzt eine gegnerische Kette ins Atari, ohne zu schlagen und ohne eine eigene
Kette aus dem Atari zu retten. Verschenkt heißt wie in `verschenkt.js`: Der
Stein wird später geschlagen oder ist am Ende tot.

| Atari-Züge ab Zug 100 | KI | GNU Go |
|---|---:|---:|
| je Partie | 17,9 | 24,6 |
| verschenkt | **51 %** (9,2 je Partie) | 15 % (3,6) |
| bis Zug 200 / danach verschenkt | 40 % / 64 % | 17 % / 11 % |

**Nach dem Urteil des Lesers** (`leseVerteidigung`: Kann der Gegner am Zug
die Kette im Atari retten?):

| Ziel des Ataris | KI: Anteil | KI: verschenkt | GNU Go: Anteil | GNU Go: verschenkt |
|---|---:|---:|---:|---:|
| gefangen | 8 % | 16 % | 39 % | 12 % |
| entkommt | **87 %** | 54 % | 52 % | 15 % |
| Doppel-Atari | 5 % | 62 % | 10 % | 24 % |

Die KI gibt Atari fast nur auf Ketten, die entkommen. GNU Go gibt Atari zu
zwei Fünfteln auf Ketten, die danach gefangen sind.

**Nach der eigenen Kette:**

| eigene Kette nach dem Atari | KI: Züge | KI: verschenkt | GNU Go: Züge | GNU Go: verschenkt |
|---|---:|---:|---:|---:|
| 1 Freiheit | 132 | 98 % | 26 | 100 % |
| 2 Freiheiten | 361 | 76 % | 723 | 23 % |
| 3 Freiheiten | 286 | 29 % | 354 | 5 % |
| 4 und mehr | 293 | 22 % | 371 | 1 % |
| **Leser fängt sie danach** | **271 (4,5 je Partie)** | **98 %** | 26 (0,4) | 100 % |
| davon Ziel entkommt | 235 (3,9 je Partie) | 98 % | 18 | 100 % |

Der eindeutigste Fall: ein Atari, nach dem der eigene Leser die eigene Kette
fängt und das Ziel entkommt. Er kostet fast immer den Stein, und die KI
spielt ihn mehr als zehnmal so oft wie GNU Go. `leseVerzicht` schließt genau solche
Züge aus, nimmt aber Züge aus, die Atari geben
([`endspiel-verlust.md`](endspiel-verlust.md)).

**Nach dem Krisengewicht** (wie `buildCrisisMap`):

| Krisengewicht des Punkts | KI: Züge | KI: verschenkt | GNU Go: Züge | GNU Go: verschenkt |
|---|---:|---:|---:|---:|
| 0 (Wert aus den Phasen) | 753 | 42 % | 1 380 | 15 % |
| 0,5 (Drache mit drei Freiheiten) | 32 | 78 % | 14 | 14 % |
| 0,8 (große Kette mit zwei Freiheiten) | 287 | 72 % | 80 | 5 % |
| davon Ziel entkommt | 281 (4,7 je Partie) | 72 % | 29 | 7 % |

Wo `evalTsumego` den Zug bewertet, verschenkt die KI fast drei Viertel ihrer
Ataris, GNU Go an solchen Punkten 5 %. Fast alle diese Ziele entkommen.

## 3. Der Schalter

**`atariVerzicht`**: Auch ein Zug, der Atari gibt, fällt unter den
Lese-Verzicht, wenn der Leser die eigene Kette danach fängt und jedes Ziel
entkommt (`vergeblicherZug`). Ein Einwurf, dessen Ziel danach gefangen ist,
etwa ein Snapback, bleibt erlaubt. Wirkt nur zusammen mit `leseVerzicht`
(Default 1). Bei 0 urteilt `vergeblicherZug` bitgenau wie vorher,
nachgerechnet an allen freien Punkten echter Stellungen in
`tests/atari-verzicht.js`.

Betroffen sind in der Diagnose 235 Züge, 3,9 je Partie. 230 davon sind
verschenkt, 42 % aller verschenkten Ataris. Den zweiten Hebel, den
Atari-Wert in `evalTsumego` nur zu geben, wenn das Ziel nicht entkommt,
fasst der Schalter nicht an.

## 4. Pilot

20 Partien gegen GNU Go, ausgespielt (Stufe 1, neun Vorgabesteine, 120
Simulationen, Seed 151, Partien 1–20). Gepaart mit dem Default-Arm der
Nachmessung von `gebietFreiheit`. Drei Default-Partien kamen mit dem neuen
Code exakt wie gespeichert heraus.

| | Default | `atariVerzicht` 1 |
|---|---:|---:|
| Endstand | −99,0 | −92,6 |
| B − A | | **+6,4** (SD 59,2, t = 0,48), besser in 11, schlechter in 9 |
| nach Zug 120 / 200 | | −4,7 / +7,4 |
| Partielänge | Ø 282 | Ø 269 |

**Wirkung auf die verschenkten Züge**, ab Zug 100, je Partie:

| | Default | `atariVerzicht` 1 |
|---|---:|---:|
| Atari, Leser fängt die eigene Kette, Ziel entkommt | 3,5 | **0** |
| verschenkte Ataris | 9,1 (51 %) | 4,9 (34 %) |
| verschenkte Züge insgesamt | 40,5 | **33,5** |
| verschenkt bis Zug 200 / danach | 40 % / 51 % | 35 % / 47 % |

Der Schalter tut, was er soll: Die aussichtslosen Ataris verschwinden, und
die KI verschenkt sieben Züge je Partie weniger. Am Endstand ist das über 20
Paare nicht zu sehen. Das 95-%-Intervall des Unterschieds reicht von etwa
−21 bis +34 Punkte, der Pilot entscheidet also nichts.

## 5. Messung, vorab festgelegt (10.10.2026, vor dem Lauf)

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`atariVerzicht` 0; `leseVerzicht` 1, `wurzelFrisch` 1) |
| B | `atariVerzicht` = 1 |

Neuer Seed, damit die Pilotpartien nicht mitzählen. Beide Arme werden neu
gespielt.

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf
([`gnugo-ausspielen.md`](gnugo-ausspielen.md)), bis 600 Züge, `--seed 161`,
60 Partien je Arm in vier Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 161 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh atari-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,atariVerzicht=1
done
node auswertung/gnugo-vergleich.js --A atari-gnugo-A-*.jsonl --B atari-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261130 20261131 20261132 20261133; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,atariVerzicht=1 \
    --roh atari-$s.jsonl --json atari-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt** (wie in
[`endspiel-verlust.md`](endspiel-verlust.md) §4):

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `atariVerzicht` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Siege je Arm, Partielänge
- verschenkte Züge je Arm (`auswertung/verschenkt.js`) und verschenkte
  Ataris (`auswertung/atari-verschenkt.js`)

**Grenzen:**
- Der Pilot zeigt die Wirkung auf die verschenkten Züge deutlich, auf den
  Endstand kaum. Ein Effekt unter 20 Punkten ist mit 60 Paaren schwer zu
  erkennen.
- Der Schalter fasst den zweiten Hebel aus §2 nicht an: Ataris mit
  Krisengewicht auf Ketten, die entkommen, bleiben, solange die eigene Kette
  nicht sofort fangbar ist.
- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
  Gemessen wird mit 120 Simulationen.

---

## 6. Nachtrag: Ergebnis, Default bleibt 0 (10.10.2026)

Gelaufen auf dem Merge-Commit `1b6c1e3`, ohne Unterbrechung. Daten:
`daten/atari-gnugo.json` (M1, beide Arme) und `daten/atari-20261130.json`
bis `…33.json` (Hash-Listen M2).

**M1, gegen GNU Go (primär), 60 Paare, Seed 161, ausgespielt:**

| | A (Default) | B (`atariVerzicht` 1) | B − A |
|---|---:|---:|---|
| **Endstand** | −80,1 | −77,7 | **+2,4** (SD 66,5), p = 0,78 |
| nach Zug 120 | +45,4 | +48,3 | +2,9, p = 0,41 (60 Paare) |
| nach Zug 200 | −43,3 | −40,3 | +3,0, p = 0,60 (58 Paare) |

- B ist in 34 von 60 Paaren besser, in 25 schlechter, in einem gleich, im
  Median um 6 Punkte besser.
- Teilläufe B − A: −6,0 / +17,9 / +0,9 / −3,1.
- Keine Aufgaben, kein Zuglimit. Die KI gewann mit jedem Arm 4 Partien.
- Partielänge: Ø 276 Züge (A) gegen 263 (B).

**M2, Selbstspiel (Kontrolle):** B gewinnt **182 von 360 Partien, 50,6 %**
(z = 0,21, p = 0,83, 95-%-KI 45,4–55,7 %). Teilläufe: 58,9 / 45,6 / 55,6 /
42,2 %.

**Entscheidung nach §5: Default `atariVerzicht` bleibt 0.** M1 ist nicht
signifikant. Der Schalter bleibt im Dashboard.

**Sekundär**, ab Zug 100, je Partie:

| | A | B |
|---|---:|---:|
| Atari, Leser fängt die eigene Kette, Ziel entkommt | 3,7 | **0** |
| verschenkte Ataris | 8,7 (51 %) | 5,4 (39 %) |
| verschenkte Züge bis Zug 200 | 19,2 (38 %) | 19,0 (37 %) |
| verschenkte Züge nach Zug 200 | 20,3 (56 %) | 15,3 (50 %) |

**Einordnung:**
- Der Schalter wirkt wie im Pilot: Die aussichtslosen Ataris verschwinden,
  die KI verschenkt fünf Züge je Partie weniger. Am Endstand ändert das
  nichts Messbares.
- Ein verschenkter Stein kostet bei Flächenzählung wenig. Der Gegner
  braucht selbst einen Zug, um ihn zu schlagen, und der Zug, den die KI
  stattdessen spielt, ist nicht unbedingt besser.
- Dasselbe zeigen `quickRettung` ([`quick-rettung.md`](quick-rettung.md))
  und die Nachmessung von `gebietFreiheit`
  ([`gebiet-freiheit.md`](gebiet-freiheit.md) §8): weniger verschenkte
  Steine, kein messbarer Gewinn. Die Zahl verschenkter Züge taugt damit
  nicht als Maß für Punkte.
- Wo die Punkte verloren gehen, zeigt GNU Gos Schätzung im Default-Arm:
  +45 nach Zug 120, −43 nach Zug 200, −80 am Ende. Der größte Verlust, rund
  90 Punkte, entsteht zwischen Zug 120 und 200.
