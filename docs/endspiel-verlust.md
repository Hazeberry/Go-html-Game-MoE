# Wo die Punkte gegen GNU Go verloren gehen: Diagnose und vorab festgelegte Messung

**Status: festgelegt am 09.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

Gegen GNU Go 3.8 (Stufe 1, neun Vorgabesteine für die KI) steht die KI nach
Zug 120 im Mittel bei +16, nach Zug 200 bei −81 und am Ende bei −143
Punkten. Die Nachprüfungen [`wertskala-gnugo.md`](wertskala-gnugo.md) und
[`gleichstand-gnugo.md`](gleichstand-gnugo.md) haben daran nichts geändert.
Die Frage ist, wo dieser Abstieg entsteht.

## 2. Diagnose

Grundlage sind die 60 Partien des Default-Arms (Seed 101), neu gespielt mit
gespeicherten Zugfolgen. Alle 60 kamen im Endstand und in der Zugzahl exakt
wie in `daten/lesen-gnugo.json` heraus.

**Der Abstieg ist gleichmäßig und beginnt vor Zug 120.** GNU Gos Urteil im
Verlauf (`auswertung/endspiel-verlauf.js`, alle 20 Züge):

| Zug | eigene tote Steine laut GNU Go | GNU Gos Schätzung |
|---:|---:|---:|
| 100 | 15,6 | +52 |
| 120 | 21,5 | +16 |
| 160 | 31,3 | −37 |
| 200 | 40,9 | −81 |
| 240 | 52,1 | −126 |
| 280 | 61,9 | −154 |

Am Ende hält GNU Go im Mittel 63 eigene Steine für tot. Unsere eigene
Zählung sieht die Partien dagegen oft ausgeglichen (Partie 1: S 178 :
W 178,5, GNU Go: W +136,5), weil sie diese Steine als lebend zählt.

Der Vergleich Zug für Zug mit GNU Gos Vorschlag (`reg_genmove`, Schätzung
nach beiden Zügen) taugt dafür nicht: GNU Gos Schätzung bewertet einen
Atari-Zug, bevor der Gegner antwortet, und ist dafür zu verrauscht.

**Der Befund: Die KI verschenkt die Hälfte ihrer Züge.**
`auswertung/verschenkt.js` zählt einen Zug als verschenkt, wenn sein Stein
später geschlagen wird oder am Ende tot ist:

| ab Zug 100 | KI | GNU Go |
|---|---:|---:|
| bis Zug 200 | **55 %** (26,8 je Partie) | 7 % (3,5) |
| nach Zug 200 | **68 %** (37,3 je Partie) | 5 % (2,5) |

Nach Art des Zugs (KI, bis Zug 200 / danach):
- Rettung aus dem Atari: 67 % / 61 %
- an eigene Kette mit 2–3 Freiheiten: 60 % / 73 %
- erste Linie, ruhig: 77 % / 91 %
- Atari geben: 49 % / 67 %
- sonstiger ruhiger Zug: 43 % / 56 %

**Die meisten davon erkennt unser eigener Leser vorher.** Bei 1 990 Zügen
(31,7 je Partie) kann der Gegner die Kette des neuen Steins laut
`leseAngriff` sofort fangen. 96 % davon sind tatsächlich verschenkt. Bei
Rettungen aus dem Atari, die der Leser schon vorher für aussichtslos hält
(`leseVerteidigung`), sind es 98 % (503 Züge, 8,2 je Partie).

**Ein Beispiel:** In Partie 1 steht die KI vor Zug 140 mit drei toten Steinen
rechts unten, einer davon im Atari. Sie spielt S1 und verbindet sie. GNU Go
schlägt L3 vor, das hätte eine Gruppe im Zentrum gesichert. Weiß greift dort
an. Zwischen Zug 140 und 160 steigt die Zahl der eigenen toten Steine von 21
auf 37.

Unter Flächenwertung kostet ein toter Stein im fremden Gebiet selbst kaum
etwas. Er kostet ein Tempo: Für jeden verschenkten Zug spielt GNU Go einen
echten.

## 3. Der Schalter und der Pilot

**`leseVerzicht`**: Ein eigener Zug kommt nicht in die Kandidaten, wenn er
- nichts schlägt,
- kein Atari gibt (Einwurf und Snapback bleiben möglich),
- die Kette des neuen Steins danach höchstens drei Freiheiten hat und
- der Leser sie mit dem Gegner am Zug fängt.

Bleibt kein Zug übrig, gilt die ungefilterte Liste. Der Filter wirkt nur an
der Wurzel, also nicht in Suche und Rollouts. Tests in `tests/lesen.js`.

**Pilot gegen GNU Go**, Partien 1–16 mit Seed 101, gepaart mit dem Default:

| | Default | `leseVerzicht` 1 |
|---|---:|---:|
| Endstand | −134,8 | −87,4 |
| B − A | | **+47,4** (SD 119,1, t = 1,59), besser in 11 von 16 |
| nach Zug 120 / 200 | | +16,8 / +19,5 |
| Züge, deren Kette der Leser fängt, je Partie | 30,3 | 5,3 |
| verschenkte eigene Züge ab Zug 100, je Partie | 58,4 | 37,8 |

## 4. Messung

Neuer Seed, damit die Pilotpartien nicht mitzählen. Beide Arme werden neu
gespielt.

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, bis 600 Züge, `--seed 111`, 60 Partien je Arm in
vier Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 111 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh verzicht-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,leseVerzicht=1
done
node auswertung/gnugo-vergleich.js --A verzicht-gnugo-A-*.jsonl --B verzicht-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261080 20261081 20261082 20261083; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,leseVerzicht=1 \
    --roh verzicht-$s.jsonl --json verzicht-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

Diesmal ist GNU Go der primäre Endpunkt: Das Problem ist gegen GNU Go
gefunden, und seit [`laufkampf-lesen.md`](laufkampf-lesen.md) zählt der
fremde Gegner vor dem Selbstspiel.

**Entscheidung, vorab festgelegt:**

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `leseVerzicht` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 120 und 200, Aufgaben von GNU Go je Arm
- verschenkte Züge je Arm (`auswertung/verschenkt.js`)
- Partielänge

## 5. Grenzen

- Der Leser ist für den Angreifer streng (er muss den Fang finden), sieht
  aber keinen Ko, keine Augen und keine Ketten mit mehr als drei
  Freiheiten. Ketten, die an fehlenden Augen sterben, erfasst der Filter
  nicht. Das ist knapp die Hälfte der verschenkten Züge.
- Der Filter wirkt nur an der Wurzel. In Suche und Rollouts spielen beide
  Seiten weiter vergebliche Züge, die Bewertung der Stellungen bleibt davon
  verzerrt.
- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
- Gemessen wird mit 120 Simulationen.
