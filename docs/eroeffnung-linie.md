# Eröffnung auf leerem Brett: Linie der ersten Züge

**Stand: 11.10.2026.** Abschnitte 1–3: Befund und Vorläufe. Abschnitt 4:
vorab festgelegte Messung, vor dem Lauf. Was danach hinzukommt, steht als
Nachtrag darunter; die Abschnitte 1–4 werden nicht mehr geändert.

---

## 1. Anlass

In den Messungen gegen GNU Go stehen neun Vorgabesteine auf Ecken und
Rändern. Die Eröffnung der KI auf leerem Brett kommt dort nicht vor. Eine
Partie gegen einen Menschen zeigte dagegen frühe Züge der KI auf der ersten
und zweiten Linie (A7, Q2, T15).

`evalOpening` gibt jedem Punkt auf den Linien 1 bis 5 dieselben 40 Punkte.
Der Regler `openLineWeight` stuft innerhalb dieses Bands ab: Linie 1 −1,
Linie 2 −0,5, Linien 3 und 4 +1, Linie 5 0, jeweils mal Gewicht. Er steht
auf 0. Eine statische Dosisreihe über 65 Eröffnungsstellungen fand keinen
Effekt; sie lief vor `gebietZug` und prüfte nur den besten Kandidaten der
Bewertung, keine Partien (Kommentar bei `openLineWeight` in `index.html`).

## 2. Befund

`auswertung/eroeffnung.js`. Linie der Züge 1–20, Anteil:

| | Linie 1 | Linie 2 | Linie 3 | Linie 4 | ab 5 | alle vier Ecken besetzt nach Zug |
|---|---:|---:|---:|---:|---:|---:|
| KI im Selbstspiel (360 Partien) | 3 % | **30 %** | 50 % | 13 % | 4 % | 13 |
| KI gegen GNU Go ohne Vorgabe (8 Partien, nur ihre Züge) | 1 % | 10 % | 38 % | 10 % | **41 %** | 6 |
| GNU Go Stufe 5 gegen sich selbst (10 Partien) | 0 % | 9 % | 49 % | 33 % | 10 % | 4 |

Im Selbstspiel spielt die KI früh zu tief und besetzt die Ecken spät. Gegen
GNU Go, das die Ecken schnell nimmt, weicht sie in die Mitte aus.

## 3. Vorläufe

**Dosis** (Selbstspiel, 40 Eröffnungen zu 40 Zügen je Wert, beide Seiten
mit demselben Gewicht):

| `openLineWeight` | 0 | 20 | 40 | 80 | 160 |
|---|---:|---:|---:|---:|---:|
| Züge 1–20 auf Linie 2 | 28 % | 26 % | 25 % | 16 % | **12 %** |
| Züge 1–20 auf Linie 3–4 | 67 % | 67 % | 71 % | 76 % | 84 % |
| Züge 21–40 auf Linie 2 | 28 % | 24 % | 25 % | 30 % | 30 % |
| alle vier Ecken besetzt nach Zug | 13 | 17 | 16 | 15 | 12 |

Der Regler wirkt erst in hoher Dosis und nur in den ersten rund 20 Zügen;
danach bewertet `evalMidgame`. Die späte Besetzung der Ecken ändert er
nicht. Gewählt wird 160: Dort liegt der Anteil der zweiten Linie nahe bei
GNU Go.

**Machbarkeit gegen GNU Go ohne Vorgabe** (Stufe 1, Komi 7,5, Farben
wechseln, 120 Simulationen, ausgespielt, Seed 9181, 8 Partien, Default):

- Die KI verliert alle 8 Partien, Endstand Ø −140,5 (SD 44,9). Gepaarte
  Unterschiede sind damit messbar.
- GNU Gos Schätzung nach Zug 30: Ø +8,8, nach Zug 60: Ø +24,1 aus Sicht
  der KI. Verloren werden die Partien im Mittelspiel, nicht in der Eröffnung.
  Ein großer Effekt auf den Endstand ist deshalb nicht zu erwarten.

## 4. Messung, vorab festgelegt (11.10.2026, vor dem Lauf)

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`openLineWeight` 0) |
| B | `openLineWeight` = 160 |

**M1, gegen GNU Go, primär:** Stufe 1, **ohne Vorgabe** (Komi 7,5, die
Farben wechseln je Partie), 120 Simulationen, Aufgabe der KI aus, GNU Go
gibt nicht auf, bis 600 Züge, Seed 191, 60 Partien je Arm in vier
Teilläufen.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 191 --stufe 1 --vorgabe 0 \
    --maxzuege 600 --schaetzung 30,60,120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh linie-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,openLineWeight=160
done
node auswertung/gnugo-vergleich.js --A linie-gnugo-A-*.jsonl --B linie-gnugo-B-*.jsonl --zug 30,60,120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261150 20261151 20261152 20261153; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,openLineWeight=160 \
    --roh linie-$s.jsonl --json linie-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt** (wie in
[`endspiel-verlust.md`](endspiel-verlust.md) §4):

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `openLineWeight` = 160 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:**
- M1 nach Zug 30, 60, 120 und 200 (GNU Gos Schätzung), Siege je Arm,
  Partielänge
- Wirksamkeit: Linie der Züge 1–20 je Arm in M1 und M2
  (`auswertung/eroeffnung.js`)

**Grenzen:**
- Der Regler wirkt nur in den ersten rund 20 Zügen, die Partien gegen
  GNU Go werden aber im Mittelspiel verloren (§3).
- Gegen GNU Go verschiebt der Regler vor allem Züge aus der Mitte auf die
  dritte und vierte Linie, im Selbstspiel vor allem Züge von der zweiten
  Linie (§2). Beide Messungen prüfen damit nicht ganz dasselbe.
- Die Messung prüft nicht, ob die KI gegen Menschen besser eröffnet.
