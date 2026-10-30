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
