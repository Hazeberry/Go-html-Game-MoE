# Muster gegen Fuego: was zählt, sind Siege

Vorab festgelegt am 30.10.2026, vor jedem Lauf. Hazeberry hat den Versuch an
diesem Tag beauftragt. Jeder der beiden Messläufe startet erst nach einem
eigenen Go.

## 1. Anlass und Frage

Ohne Vorgabe kosten die Muster gegen GNU Go Punkte, gegen Fuego mit 100
Spielen je Zug im Mittel nichts ([`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md)
§9). Der nachträgliche Vergleich der Siege (dort §10, explorativ) zeigte
aber: Gegen Fuego gewinnt D mit Mustern deutlich öfter (73 von 480) als ohne
(42, McNemar p = 0,0019) oder mit halbem Gewicht (49, p = 0,025).

Zwei Dinge daran sind schwach. Die Siege waren nicht vorab der Endpunkt, und
D gewann gegen Fuego nur 15 %, misst also am Rand. Hazeberry: „Menschen
erleben Siege.“ Deshalb wird jetzt **vorab festgelegt die Siegquote** gemessen,
gegen ein Fuego, gegen das D ohne Vorgabe etwa 40 bis 50 % gewinnt.

Die Frage: **Gewinnt die KI ohne Vorgabe öfter mit vollen Mustern, mit
halben oder ohne?**

## 2. Zwei Stufen

1. **Prüfstand** (§3): Fuego wird schwächer gestellt, bis D ohne Vorgabe 40 bis
   50 % gewinnt. Die Wahl folgt einer festen Regel.
2. **Messung** (§4): D, M0 und M50 gegen dieses Fuego. Der Workflow dafür
   entsteht erst nach Stufe 1, mit der dort gewählten Spielzahl. Alles andere
   steht hier fest.

## 3. Stufe 1: Prüfstand ohne Vorgabe

D (Default) ohne Vorgabe gegen Fuego mit **10, 20, 30, 50 und 70 Spielen je
Zug**, je 120 Partien (4 Teile zu 30), Seed **227**. Sonst wie in
[`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §3: Farben im Wechsel, Komi
7,5, 120 Simulationen, Aufgabe aus, bis 600 Züge, GNU Go zählt
([`fuego-gerade.yml`](../.github/workflows/fuego-gerade.yml),
[`spielen.sh`](../auswertung/komponenten/spielen.sh) mit `FUEGO_SPIELE`).

**Wahl** ([`gerade-wahl.js`](../auswertung/fuego/gerade-wahl.js)):

1. In Frage kommt eine Spielzahl, bei der D zwischen 40 und 50 % gewinnt
   (einschließlich); gewählt wird die nächste an 45 %.
2. Liegt keine dazwischen, kommt eine zwischen 30 und 60 % in Frage, wieder
   die nächste an 45 %.
3. Bei Gleichstand die höhere Spielzahl (Fuego möglichst stark).
4. Kommt keine in Frage, gibt es keine Wahl und keine Stufe 2. Dann folgt eine
   neue Vorabfestlegung mit anderen Spielzahlen.

Partien ohne Sieger zählen nicht. Mit 120 Partien ist die Quote auf rund ±9
Prozentpunkte genau. Das reicht, um eine Spielzahl in die Nähe von 45 % zu
legen. Die Messung in Stufe 2 misst die Quote von D noch einmal mit 960
Partien.

**Erwartung:** Mit 100 Spielen gewann D 15 %. Mit 10 Spielen gewinnt D
deutlich mehr als die Hälfte, mit 70 deutlich weniger. Gewählt wird
wahrscheinlich 20 oder 30.

## 4. Stufe 2: Messung, vorab festgelegt

**Arme** aus [`arme-o.sh`](../auswertung/komponenten/arme-o.sh): D, M0
(`musterOhneVorgabe=0`) und M50 (`musterOhneVorgabe=0.5`), ohne Vorgabe gegen
Fuego mit der Spielzahl aus Stufe 1, je **960 Partien** (16 Teile zu 60), Seed
**228**. Bedingungen wie in Stufe 1. Dazu eine Kontrolle: D, Partien 1 bis
20, im selben Lauf noch einmal; erwartet 20 von 20 Zug für Zug gleich.

**Endpunkt ist die Siegquote**, gepaart nach Partienummer: je Arm die Paare,
in denen nur der Arm gewinnt (b), und die, in denen nur D gewinnt (c), mit dem
exakten McNemar-Test, zweiseitig, alpha **0,05/2 = 0,025** für zwei Arme
([`siege-gepaart.js`](../auswertung/komponenten/siege-gepaart.js)). Partien
ohne Sieger fallen samt Partner heraus.

| Ergebnis je Arm | wenn |
|---|---|
| **Arm gewinnt öfter** | p < 0,025 und b > c |
| **D gewinnt öfter** | p < 0,025 und c > b |
| kein Unterschied belegt | sonst |

**Folge für den Default:**

| Ergebnis | Folge |
|---|---|
| M50 gewinnt öfter | **Default `musterOhneVorgabe` 0,5** |
| M0 gewinnt öfter | Default bleibt 1; untersuchen. M0 ist schon am Veto des Selbstspiels gescheitert (26,9 %, [`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §9) |
| sonst | Default bleibt 1 |

M50 hatte im Selbstspiel kein Veto (45,6 %, Obergrenze 50,7 %), deshalb kann
nur M50 neuer Default werden.

**Beschreibend, ohne Anspruch:** Endstand Arm − D (gepaart, 97,5 %, t),
Siegquoten je Farbe der KI, die Quote von D selbst, Phasenprofil.

## 4a. Gültigkeit des Laufs (ergänzt vor dem Messlauf, 31.10.2026)

Zwei Zustände: **gültig** oder **ungültig**. Gültig nur, wenn **alle** drei
gelten:

1. Alle drei Arme (D, M0, M50) liegen vollständig vor: die Partienummern 1 bis
   960 je Arm, also alle 16 Teile.
2. Je Arm mit D sind mindestens **98 %** der erwarteten Paare gewertet
   (mindestens 941 von 960). Partien ohne Sieger (Zuglimit, Abbruch) fallen
   samt Partner heraus; ein bis zwei solcher Paare lassen den Lauf gültig.
3. Die Kontrolle ist bestanden: 20 von 20 Partien Zug für Zug gleich.

**Ungültig:** Der Bericht trägt oben „KEIN URTEIL“ mit dem Grund; die Zahlen
darunter sind als **vorläufig** gekennzeichnet, die Spalte „Urteil“ nennt
„kein Urteil“, und es gibt keine Folge für den Default. Der Lauf wird **rot**:
`siege-ergebnis.sh` und `siege-bericht.js` enden mit Exit-Code 1, der Job
„Bericht und Ergebnisbranch“ sichert erst Bericht und Rohdaten auf den
Ergebnisbranch und schlägt danach im letzten Schritt fehl. Kein grüner Lauf
mit leerem Urteil.

## 4b. Geltungsbereich: ein sehr schwacher Fuego

Fuego mit **50 Spielen je Zug** ist ein Fuego mit sehr schwacher Suche (die
Standardeinstellung rechnet mit Zehntausenden Spielen je Zug). Er wurde
gewählt, weil D gegen ihn etwa die Hälfte gewinnt (§9). Das Ergebnis gilt für
**diesen** Gegner, nicht für Fuego bei normaler Stärke und nicht für Menschen.
Gegen das Fuego mit 100 Spielen (D gewinnt 15 %) wurde nur der Punktestand
gemessen ([`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §9).

## 5. Auflösung, vorab gerechnet

Bei einer Siegquote um 45 % wechselt der Sieger erfahrungsgemäß in rund einem
Drittel der Paare. Bei 960 Paaren sind das rund 330 Paare mit wechselndem
Sieger. Mit alpha 0,025 wird dann ein Unterschied der Siegquoten von rund 6
Prozentpunkten in 80 % der Läufe erkannt, einer von 4 Prozentpunkten in rund
der Hälfte. Im explorativen Vergleich (15 % Grundquote) lag der Unterschied
bei 5 bis 6,5 Prozentpunkten.

## 6. Erwartung vorab

- **Stufe 1:** Wahl bei 20 oder 30 Spielen je Zug.
- **Stufe 2:** D gewinnt um 45 %. M0 und M50 gewinnen seltener, wie im
  explorativen Vergleich; für M0 eher „D gewinnt öfter“, für M50 eher „kein
  Unterschied belegt“. **Default bleibt 1.**
- Kontrolle 20 von 20.

## 7. Ablauf und Dauer

**Stufe 1:** [`fuego-gerade.yml`](../.github/workflows/fuego-gerade.yml),
manuell auf `main`, ohne Eingaben: Fuego bauen, 20 Spiel-Jobs, Bericht auf
`ergebnisse/fuego-gerade-lauf<N>` unter `docs/daten/fuego-gerade/lauf<N>/`.
600 Partien, rund 5 Runner-Stunden, unter einer halben Stunde Laufzeit.

**Stufe 2:** eigener Workflow nach Stufe 1, mit der gewählten Spielzahl.
2 880 Partien und 20 in der Kontrolle, rund 25 Runner-Stunden, gut eine
Stunde Laufzeit.

## 8. Danach

Nach Stufe 1 ein Nachtrag mit der Wahl und der Workflow für Stufe 2. Nach
Stufe 2 der Nachtrag mit dem Urteil aus §4. Ändert sich der Default, dann nur
`musterOhneVorgabe` in `index.html`, mit Kommentar und README.

## 9. Nachtrag: Ergebnis der Stufe 1 (31.10.2026)

Lauf 2 von [`fuego-gerade.yml`](../.github/workflows/fuego-gerade.yml) (Lauf 1
scheiterte vor dem ersten Spiel: `ubuntu-latest` war seit dem 30.10.2026 Ubuntu
26.04, auf dem Fuego mit dem neuen Boost nicht baut; seitdem laufen alle
Workflows auf `ubuntu-24.04`). Daten:
`docs/daten/fuego-gerade/lauf2/`. Alle 600 Partien gewertet.

| Spiele je Zug | gewertet | Siege D | Quote | 95 % | Endstand Ø |
|---:|---:|---:|---:|---|---:|
| 10 | 120 | 120 | 100,0 % | 97,0 % bis 100,0 % | +156,9 |
| 20 | 120 | 117 | 97,5 % | 92,9 % bis 99,5 % | +121,9 |
| 30 | 120 | 97 | 80,8 % | 72,6 % bis 87,4 % | +67,6 |
| 50 | 120 | 61 | 50,8 % | 41,6 % bis 60,1 % | +21,0 |
| 70 | 120 | 34 | 28,3 % | 20,5 % bis 37,3 % | −12,3 |

**Wahl: 50 Spiele je Zug**, nach Regel 2: keine Quote liegt zwischen 40 und
50 % (50 Spiele knapp darüber mit 50,8 %), 50 ist die nächste an 45 % im Bereich
30 bis 60 %. Das Intervall von 50 Spielen (41,6 % bis 60,1 %) schließt 45 %
ein.

**Die Erwartung in §6 lag daneben:** Ich erwartete 20 oder 30 Spiele. Fuego wird
mit steigender Spielzahl viel schneller stärker als gedacht; 20 und 30 sind
für D zu leicht.

**Stufe 2 steht fest:** Fuego mit 50 Spielen je Zug, Seed 228, D, M0 und M50 zu
je 960 Partien, Kontrolle D Partien 1 bis 20, Endpunkt und Urteil wie in §4
([`fuego-siege.yml`](../.github/workflows/fuego-siege.yml), Bericht
[`siege-bericht.js`](../auswertung/fuego/siege-bericht.js), 3 × 16 Teile zu 60
Partien und eine Kontrolle). Die Auflösung in §5 gilt für eine Quote von D um
50 %. Der Lauf startet erst nach einem eigenen Go.

## 10. Nachtrag: Ergebnis der Stufe 2 (31.10.2026)

Lauf 1 von [`fuego-siege.yml`](../.github/workflows/fuego-siege.yml), Seed 228,
Fuego mit 50 Spielen je Zug, ohne Vorgabe. Daten:
`docs/daten/fuego-siege/lauf1/`. **Der Lauf ist gültig** (§4a): alle drei Arme
mit je 960 Partien, 960 von 960 Paaren gewertet, Kontrolle 20 von 20 Zug für
Zug gleich, keine fehlenden Teile.

| Arm | gewertet | Siege | Quote | 95 % | KI Schwarz | KI Weiß |
|---|---:|---:|---:|---|---:|---:|
| D | 960 | 461 | 48,0 % | 44,8 % bis 51,2 % | 35,4 % | 60,6 % |
| M0 | 960 | 338 | 35,2 % | 32,2 % bis 38,3 % | 29,4 % | 41,0 % |
| M50 | 960 | 379 | 39,5 % | 36,4 % bis 42,7 % | 37,1 % | 41,9 % |

Gepaart gegen D (alpha 0,025, exakter McNemar-Test):

| Arm | nur Arm | nur D | Differenz (Prozentpunkte) | p | Urteil | Endstand Arm − D (97,5 %) |
|---|---:|---:|---:|---:|---|---|
| M0 | 180 | 303 | −12,8 | 2,4 · 10⁻⁸ | **D gewinnt öfter** | −15,8 (−21,1 bis −10,5) |
| M50 | 196 | 278 | −8,5 | 0,0002 | **D gewinnt öfter** | −10,2 (−15,8 bis −4,7) |

**Urteil nach §4: Default bleibt 1.** Mit vollen Mustern gewinnt die KI ohne
Vorgabe gegen dieses Fuego öfter als ohne (12,8 Prozentpunkte) und öfter als mit
halbem Gewicht (8,5 Prozentpunkte). Auch der Endstand ist mit Mustern besser.
Das bestätigt den explorativen Befund aus
[`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §10 (dort 15 % Grundquote,
hier 48 %) mit vorab festgelegtem Endpunkt.

**Gegen die Erwartung (§6):** Für M0 erwartet war „D gewinnt öfter“, das trat
ein. Für M50 erwartete ich eher „kein Unterschied belegt“; es kam
„D gewinnt öfter“, deutlicher als gedacht. Die Quote von D lag mit 48,0 % im
angepeilten Bereich (Prüfstand 50,8 %).

**Farben:** Die KI gewinnt als Weiß viel öfter als als Schwarz (60,6 % gegen
35,4 % für D). Das liegt am Komi von 7,5, den die Engine nicht kennt
([`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §9). Der Unterschied
zwischen den Armen kommt vor allem von Weiß (D 60,6 %, M0 41,0 %, M50 41,9 %);
als Schwarz liegt D (35,4 %) hinter M50 (37,1 %) und vor M0 (29,4 %). Je Farbe
wurde nicht getestet (nur beschreibend).

**Geltung (§4b):** Das Ergebnis gilt für ein Fuego mit 50 Spielen je Zug, also
mit sehr schwacher Suche, nicht für Fuego bei normaler Stärke.

**Folge:** Keine Änderung am Spiel. `musterOhneVorgabe` bleibt 1; der Kommentar
im Code nennt das Ergebnis. Zusammen mit [`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md)
§9 (Punkte gegen GNU Go: Muster kosten dort 14 bis 18 Punkte) bleibt es bei
dem Bild: Die Muster kosten Punkte gegen GNU Go, gewinnen aber Partien gegen
Fuego, und im Selbstspiel helfen sie.
