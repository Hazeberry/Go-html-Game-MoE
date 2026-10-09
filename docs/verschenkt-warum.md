# Warum die KI Züge verschenkt: Diagnose

**Stand: 09.10.2026.** Fortsetzung von [`endspiel-verlust.md`](endspiel-verlust.md).
Seit `leseVerzicht` Default ist, setzt die KI gegen GNU Go ab Zug 100 noch in
41 % (bis Zug 200) bzw. 54 % (danach) ihrer Züge Steine, die später
geschlagen werden oder am Ende tot sind. GNU Go: 4–9 %. Hier steht, wo in
der Zugwahl diese Züge nach vorn kommen. Eine Messung ist das noch nicht.

## 1. Methode

Grundlage sind die 60 Partien des heutigen Defaults gegen GNU Go aus
`endspiel-verlust.md` §6 (Seed 111, Arm B).

- `auswertung/endspiel-verlauf.js` liefert für jeden eigenen Zug ab Zug 100
  den Zug, den GNU Go an unserer Stelle gespielt hätte (`reg_genmove`).
- `auswertung/zugwahl-grund.js` stellt jede dieser 4 783 Stellungen nach. Es
  ruft `getAIMove` mit den Defaults auf (120 Simulationen, ohne
  Baumwiederverwendung) und hält fest, was die Suche als Kandidatenliste
  bekommt.
- Für den gespielten Zug und für GNU Gos Vorschlag zerlegt es `evaluateMove`
  in drei Teile:
  - **Gebiet:** Wert mit minus ohne `gebietZug`
  - **Krise:** Krisengewicht × `evalTsumego`
  - **Phase:** der Rest, also die Phasen-Experten
- Dazu kommen die Einflusszone vor dem Zug und die Freiheiten der neuen
  Kette.
- Verschenkt heißt wie in `auswertung/verschenkt.js`: Der Stein wird später
  geschlagen oder ist am Ende tot.

## 2. Befunde

**Die Suche folgt der Zugbewertung.** Der gespielte Zug steht in der
Kandidatenliste meist ganz oben:

| | verschenkt (2 205) | nicht verschenkt (2 578) |
|---|---:|---:|
| gespielter Zug auf Platz 1 | 66 % | 70 % |
| auf Platz 2–16 | 27 % | 20 % |
| jenseits von Platz 16 | 7 % | 10 % |
| GNU Gos Vorschlag auf Platz 1 | 8 % | 20 % |
| GNU Gos Vorschlag jenseits von Platz 16 (die Suche sieht ihn nie) | 47 % | 39 % |

Mit 120 Simulationen ändert die Suche die Reihenfolge der Zugbewertung
selten. Wo verschenkt wird, liegt es also an `evaluateMove`.

**Was den verschenkten Zug vor GNU Gos Vorschlag bringt** (1 517 Paare,
größter Beitrag zum Vorsprung):

| Teil | Anteil |
|---|---:|
| Gebiet (`gebietZug`) | 54 % |
| Krise (`evalTsumego`) | 34 % |
| Phase | 10 % |

Bei nicht verschenkten Zügen ist die Verteilung fast gleich (52 / 35 / 11 %).
Die Teile sind also nicht fehlerhaft, sie wissen nur nicht, ob der neue Stein
überlebt:
- `gebietZug` rechnet den Gewinn auf der Bouzy-Karte so, als stünde der
  Stein für immer.
- `evalTsumego` bewertet Rettung und Angriff an Ketten im Atari. Steht ein
  Punkt an einer solchen Kette, ist sein Wert ganz evalTsumego, oft 800 bis
  5 000 Punkte.

**Die neuen Steine sterben, weil ihre Kette schwach ist:**

| Freiheiten der neuen Kette | Züge | verschenkt |
|---|---:|---:|
| 2 | 951 | 73 % |
| 3 | 1 371 | 53 % |
| 4 | 1 255 | 46 % |
| 5 und mehr | 1 206 | 16 % |

`leseVerzicht` fängt nur Ketten, die sofort gefangen werden. Ketten mit zwei
oder drei Freiheiten, die der Leser nicht fängt, sterben trotzdem
mehrheitlich, oft später an fehlenden Augen.

**Es sind Kämpfe, keine Invasionen.** 85 % der verschenkten Züge stehen in
neutralem Gelände der Einflusskarte, nur 6 % tief in der gegnerischen Zone.

**Zwei Nebenwege:**
- **Baumwiederverwendung:** Spielt der Gegner einen Zug, den die Suche schon
  untersucht hatte, übernimmt die KI den Teilbaum. Dessen Wurzelkinder (8
  Stück) hat im vorigen Zug `quickEval` ausgesucht, nicht `evaluateMove`.
  Die neue Kandidatenliste filtert dann nur noch heraus, was nicht mehr legal
  ist. Daher kommen die gespielten Züge jenseits von Platz 16.
- **Schnelle Bewertung:** `quickEval` bewertet Suche und Rollouts. Sie gibt
  +80 für jeden Zug an eine eigene Kette mit höchstens zwei Freiheiten, +200
  neben einer gegnerischen Kette im Atari und +500 je geschlagenem Stein. In
  den Rollouts verlängern beide Seiten so schwache Ketten. Die Blattbewertung
  (`evaluateBoard`, Steine × 5 + Freiheiten × 3) bevorzugt den verschenkten
  Zug vor GNU Gos Vorschlag in 59 % der Fälle, bei nicht verschenkten in 50 %.

## 3. Zwei Piloten

Je 16 Partien gegen GNU Go (Seed 111, Partien 1–16), gepaart mit dem Default
aus `daten/verzicht-gnugo.json`:

| Pilot | Endstand B − Default | besser in | verschenkte Züge je Partie |
|---|---:|---:|---:|
| Default | | | 38,1 |
| `mctsTreeReuse` = 0 (Wurzel immer aus `evaluateMove`) | +26,1 (t = 0,86) | 8 von 16 | 32,1 |
| Gebiet nach Freiheiten | +22,1 (t = 0,95) | 11 von 16 | 26,9 |

„Gebiet nach Freiheiten“ war ein Versuchsstand außerhalb des Repos. Ein
positiver Gebietsgewinn aus `gebietZug` wird mit 0,25 multipliziert, wenn
die neue Kette zwei Freiheiten hat, mit 0,6 bei drei. Bei einer Freiheit
wird er 0, ab vier bleibt er unverändert.

Beide Piloten zeigen in die richtige Richtung, sind mit 16 Partien aber nicht
belastbar. Der zweite senkt die verschenkten Züge deutlich, bis Zug 200 von
43 % auf 33 %.

## 4. Was daraus folgt

Die Diagnose zeigt drei Hebel. Jeder davon bräuchte eine eigene vorab
festgelegte Messung:

1. **Gebiet nach Freiheiten:** den Gebietsgewinn schwacher neuer Ketten
   abschwächen. Pilot +22, am meisten weniger verschenkte Züge.
2. **Wurzel bei Baumwiederverwendung:** die Kandidaten aus `evaluateMove` in
   die wiederverwendete Wurzel aufnehmen, statt nur zu filtern. Pilot ohne
   Wiederverwendung +26, aber mit großer Streuung.
3. **`quickEval`:** Der Bonus für Züge an schwache eigene Ketten macht
   Rollouts und Suche zum Rettungsspiel. Dieser Eingriff wirkt am breitesten
   und ist am schwersten abzuschätzen.
