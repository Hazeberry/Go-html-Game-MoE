# Endspiel-Muster, Schritt 2: der Schalter im Spiel

**Status: Abschnitte 1–6 festgelegt am 19.10.2026, vor dem Pilot.** Die Datei
mit den Regeln für Pilot und Messung war geschrieben, bevor der erste Pilotlauf
startete; sie wurde erst danach eingecheckt. Was danach kommt, steht als
Nachtrag darunter; die Abschnitte 1–6 werden nicht mehr geändert. **Der
Schalter ist nach dem Pilot wieder aus `index.html` entfernt** (§7); die
Abschnitte 1–6 beschreiben ihn, wie er im Commit `63f727b` steht.

---

## 1. Ausgangslage

Schritt 1 ([`muster-endspiel.md`](muster-endspiel.md)) hat das Tor bestanden:
Eine Tabelle, die nur aus Stellungen ab Zug 81 mit der KI am Zug gelernt ist
und neben dem 3×3-Muster, dem Abstand zum letzten Gegnerzug und der Linie
auch den Abstand zu eigenen und fremden Steinen und zwei Ringe um den Punkt
kennt, sagt GNU Gos Zug in der Kandidatenliste der KI an 16 228 frischen
Stellungen bei Rang 1 um 12,6 Prozentpunkte öfter voraus als die Tabelle im
Spiel (95 %: [+10,7; +14,5]), auf Linie 1–2 um 8,7 und in verlorenen Partien
um 5,5.

Das ist nicht der Endstand. Die zweite Tabelle aus
[`muster-ausbau.md`](muster-ausbau.md) sagte GNU Gos Zug auch öfter voraus
und spielte gegen GNU Go schlechter (−11,0 Punkte). Dieser Schritt klärt, ob
die Vorhersage im Spiel ankommt.

## 2. Der Schalter

`musterEndspiel` (Default 0) ist ein Gewicht, wie `musterGewicht`. Bei 0 ist
das Verhalten bitgenau das alte. Bei einem Gewicht größer als 0 gilt ab Zug 80
(`mc >= 80`, wie in der Studie) an der Wurzel der KI

    Wurzelwert = evaluateMove + musterEndspiel × musterWertEndspiel

statt `evaluateMove + musterGewicht × musterWert`. Vor Zug 80 bleibt die alte
Tabelle. Nur die Wurzel ändert sich, nicht die Suche und nicht die Rollouts,
wie bei den Mustern bisher.

`musterWertEndspiel` ist die Summe der Tabellenwerte von sechs Schlüsseln:
`m`, `l`, `z` (wie `musterWert`), `d` (Abstand zum nächsten eigenen und
fremden Stein), `u` (die acht Punkte im Abstand 2) und `k` (die acht
Springerpunkte). Die Abstände zu den Steinen werden einmal je Wurzel
berechnet (`primeMusterEndspiel`).

**Die Tabelle** `MUSTER_ENDSPIEL` hat 4 039 Einträge (90 KB): m 1 679, l 5,
z 5, d 19, u 1 084, k 1 247. Sie ist mit dem Verfahren aus
[`muster-endspiel.md`](muster-endspiel.md) §5 aus den 20 196 Stellungen mit der
KI am Zug gelernt, die in der Prüfung aus Schritt 1 lernen (Daten B: 3 968,
Prüfdaten: 16 228; die Daten A lernen nicht mit). Die Werte sind mit 0,59
skaliert: Das ist der Maßstab, bei dem die mittlere Streuung der Musterwerte
je Stellung der von `MUSTER_TABELLE` gleicht (0,595 auf diesen Daten, 0,60 in
der Prüfung außerhalb der Stichprobe). So heißt `musterEndspiel` 200 dasselbe
wie „Dosis 200“ in Schritt 1.

```bash
# Zwischenspeicher wie in muster-endspiel.md §8 (zw/entw-b, zw/pruef), dann:
node auswertung/muster-endspiel-tabelle.js --lehr zw/entw-b,zw/pruef --aus zw/tabelle.json --index index.html
```

**Tests** (`tests/muster-endspiel.js`):

- Default 0; die Tabelle hat die sechs Gruppen, alle Werte endlich.
- Die Schlüsselzeichen im Spiel sind die der Auswertung
  (`auswertung/muster-endspiel-daten.js`): `d`, `u` und `k` als Zeichenfolgen,
  der Wert als Summe der sechs Tabellenwerte, an allen Kandidaten einer
  Stellung.
- Der Wert ist unter Drehung und Spiegelung des Bretts gleich.
- An der Wurzel: Zug 80 und später gilt Wert ohne Muster + Gewicht ×
  `musterWertEndspiel` und `musterGewicht` hat keine Wirkung mehr; Zug 79
  und bei 0 ist der Wurzelwert unverändert.

**Ende-zu-Ende-Probe** (kein Test, an den ersten 40 Prüfpartien aus Schritt
1, 2 861 Stellungen, mit der echten Wurzelliste von `getAIMove`; die Tabelle
hat diese Partien mitgelernt, die Zahlen sind also leicht zu günstig): GNU
Gos Zug steht bei Gewicht 0 in 21,6 % der Stellungen an der Spitze (unter den
ersten 16: 64,0 %), bei `musterEndspiel` 200 in 35,5 % (93,7 %). Die
Prüfung außerhalb der Stichprobe in Schritt 1 ergab 20,3 und 32,9 % (63,2 und
89,1 %). Die Übertragung in den Spielcode stimmt damit.

**Aufwand:** Die Wurzelliste kostet rund 1 ms mehr (19 gegen 20 ms), also etwa
5 % einer Liste und einen kleinen Bruchteil eines Zugs.

## 3. Pilot

Gegen den Default (A: `musterEndspiel` 0), GNU Go Stufe 1, neun
Vorgabesteine, ausgespielt, 120 Simulationen, Seed 204 (neu: die Partien
sind nicht in den Lehrdaten). B hat `musterEndspiel` 100, 200, 400 oder 800.
Je Gewicht 60 Paare in zwei Hälften zu 30 (Partien 1–30 und 31–60); A läuft
einmal.

```bash
for von in 1 31; do
  node gnugo-duell.js --partien 30 --von $von --seed 204 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh pilot-A-$von.jsonl
  for w in 100 200 400 800; do
    node gnugo-duell.js --partien 30 --von $von --seed 204 --stufe 1 --vorgabe 9 \
      --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
      --ki mctsFixedSims=120,resignEnabled=0,musterEndspiel=$w --roh pilot-$w-$von.jsonl
  done
done
node auswertung/gnugo-vergleich.js --A pilot-A-1.jsonl,pilot-A-31.jsonl \
  --B pilot-$w-1.jsonl,pilot-$w-31.jsonl --zug 120,200,ende      # je Gewicht w
```

**Wahl des Gewichts, vorab festgelegt.** Bei 30 Paaren und einer Streuung um
80–90 Punkte je Paar ist der Pilot grob: Der Standardfehler liegt bei rund 11
Punkten über 60 Paare, und die Piloten der zweiten Tabelle (+24,5 und +11,4
bei Gewicht 200) waren Rauschen. Deshalb gilt:

1. **200** (das Gewicht, auf dem das Tor in Schritt 1 entschieden wurde), es
   sei denn,
2. ein anderes Gewicht hat über die 60 Paare einen um mehr als 15 Punkte
   höheren mittleren Endstand B − A als 200 **und** ist in keiner der beiden
   Hälften schlechter als A. Dann gilt dieses.
3. Ist B − A bei allen vier Gewichten über die 60 Paare signifikant negativ
   (gepaarter t-Test, zweiseitig, p < 0,05), endet der Versuch nach dem
   Pilot: Die Messung entfällt, das Ergebnis steht als Nachtrag, der
   Schalter wird entfernt (wie in §4).

## 4. Messung, vorab festgelegt

Nach der Hausregel auf dem Merge-Commit dieses Dokuments, beide Arme mit
demselben Code.

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default (`musterEndspiel` 0, `musterGewicht` 200) |
| B | `musterEndspiel` = das gewählte Gewicht W |

**M1, gegen GNU Go, primär:** Stufe 1, neun Vorgabesteine, 120 Simulationen,
Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600 Züge, neuer Seed
`--seed 206`, 240 Partien je Arm in 16 Teilläufen zu 15.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 206 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh endmuster-gnugo-A-$v.jsonl
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,musterEndspiel=W
done
node auswertung/gnugo-vergleich.js --A $(ls endmuster-gnugo-A-*.jsonl | paste -sd,) \
  --B $(ls endmuster-gnugo-B-*.jsonl | paste -sd,) --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05, mit
95-%-Intervall.

**M2, Selbstspiel, Kontrolle:** 360 Partien, vier Teilläufe zu je 90.

```bash
for s in 20261190 20261191 20261192 20261193; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,musterEndspiel=W \
    --roh endmuster-$s.jsonl --json endmuster-$s.json
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 (GNU Go) | M2 (Selbstspiel) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `musterEndspiel` = W |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

Bleibt der Default 0, wird der Schalter samt Tabelle wieder aus `index.html`
entfernt (90 KB für einen verworfenen Schalter); der Stand der Messung bleibt
über den Merge-Commit reproduzierbar, die Werkzeuge in `auswertung/` bleiben.

**Sekundär, ohne Anspruch:** M1 nach Zug 120 und 200, Siege je Arm,
Partielänge, Laufzeit je Zug.

## 5. Erwartung

Schritt 1 sagt nur, dass die Tabelle GNU Gos Zug öfter trifft. Die Diagnose
([`punktverlust-muster.md`](punktverlust-muster.md)) sagt, dass die KI im
Endspiel an den Grenzen im Schnitt 51 von 154 Punkten Gebiet verliert, GNU Go
5,5 von 43. Wenn die Tabelle einen Teil dieser Züge richtig stellt, sind
zweistellige Punktgewinne denkbar; die Messung erkennt rund 12 Punkte sicher
([`teststaerke.md`](teststaerke.md)). Genauso denkbar ist, dass die
Tabelle die übrige Bewertung an der Wurzel überstimmt und das Spiel nicht
verbessert, wie bei der zweiten Tabelle. Beides ist offen.

## 6. Grenzen

- Lehrer und Gegner sind dasselbe Programm (GNU Go Stufe 10 und Stufe 1),
  wie in [`muster.md`](muster.md) §7.
- Die Tabelle ist aus Partien der heutigen KI gelernt, die mit der alten
  Tabelle spielt. Was die KI mit der neuen Tabelle spielt, sieht wieder
  etwas anders aus (Verteilungsverschiebung).
- Das Gewicht ist nur grob bestimmt (Pilot mit 60 Paaren). Ein besseres
  Gewicht kann es geben; die Messung prüft nur W.
- Gemessen wird gegen GNU Go Stufe 1 mit neun Vorgabesteinen und im
  Selbstspiel. Wie die Tabelle in Partien ohne Vorgabe oder gegen Menschen
  wirkt, ist offen.

---

## 7. Nachtrag: Pilot, alle vier Gewichte schlechter als der Default (19.10.2026)

Der Pilot lief wie in §3 festgelegt, auf dem Code dieses Dokuments (Basis
`ca14f9e` mit dem Schalter `musterEndspiel`), Seed 204, 60 Paare je Gewicht,
ausgespielt. Daten: [`daten/endmuster-pilot.json`](daten/endmuster-pilot.json).
Arm A (Default): Endstand Ø +24,0, Siege 35 von 60.

| `musterEndspiel` | Endstand B | B − A | 95 % | p | Hälfte 1 / 2 | Siege B | nach Zug 120 |
|---:|---:|---:|---|---:|---|---:|---:|
| 100 | −14,5 | **−38,5** | [−57,4; −19,7] | 0,0001 | −48,4 / −28,6 | 20 | −4,3 |
| 200 | +2,2 | **−21,8** | [−36,2; −7,4] | 0,0036 | −22,6 / −21,0 | 26 | −4,5 |
| 400 | +0,7 | **−23,3** | [−41,3; −5,3] | 0,012 | −35,9 / −10,7 | 33 | +0,2 |
| 800 | +4,6 | **−19,4** | [−36,0; −2,9] | 0,022 | −24,5 / −14,4 | 30 | +4,0 |

(Gepaarter t-Test über die 60 Paare, zweiseitig; „B − A“ in Punkten Endstand
nach GNU Gos Zählung.) Alle vier Differenzen sind negativ, in jeder Hälfte
und bei jedem Gewicht. Nach Zug 120, 40 Züge nach dem Einsatz der Tabelle,
steht B noch gleich (−4,3 bis +4,0, keines signifikant); der Verlust entsteht
danach.

**Entscheidung nach §3, Regel 3:** Bei allen vier Gewichten ist B − A über die 60 Paare
signifikant negativ (p < 0,05). Der Versuch endet nach dem Pilot. Die Messung
mit 240 Paaren und 360 Partien im Selbstspiel entfällt, der Default bleibt
`musterEndspiel` 0, und der Schalter samt Tabelle wird wieder aus
`index.html` entfernt (§4). Der Stand des Pilots bleibt über den Commit
`63f727b` reproduzierbar, in dem der Schalter eingecheckt ist.

---

## 8. Nachtrag: Warum? Diagnose an den Pilotpartien (19.10.2026)

Das Folgende ist nach dem Pilot entstanden, ohne Vorabfestlegung und ohne
Anspruch auf einen Beweis: Fragen, die der Pilot aufwirft. Als Schiedsrichter
dient überall GNU Go Stufe 10, also dasselbe Programm, das die Lehrdaten
geliefert hat; sein Urteil bevorzugt seinen eigenen Stil. Befehle, Ausgaben
und Rohzeilen: [`daten/endmuster-diagnose.txt`](daten/endmuster-diagnose.txt),
`daten/endmuster-zugwert.jsonl.gz`.

**1. Auf den Stellungen der alten KI zieht die Tabelle besser.**
`auswertung/muster-endspiel-zugwert.js`: In 40 Partien der heutigen KI (die
Prüfdaten aus Schritt 1, KI am Zug, Zug 101–240) steht in 1 113 Stellungen
an der Spitze der Wurzelliste mit der Endspiel-Tabelle (Dosis 200) ein
anderer Zug als der, den die KI gespielt hat. Beide Züge, bewertet wie in
`punktverlust.js` (Zug, GNU Gos Antwort, Schätzung aus Sicht der KI): Der Zug
der Tabelle ist im Mittel **2,04 Punkte besser** (95 %: [+1,59; +2,49]), in
61 % der Stellungen besser, in 23 % schlechter. Das gilt in allen Phasen
(Zug 101–160 +1,78; 161–200 +2,80; ab 201 +1,27), auf Linie 1–2 (+1,36)
wie weiter innen (+2,75). GNU Gos eigener Zug ist im Mittel 4,25 Punkte
besser als der der KI und 2,22 besser als der der Tabelle. Die Tabelle
macht also im Einzelnen den kleineren Fehler. Der Gewinn steckt in den
Stellungen, in denen ihr Zug GNU Gos Zug ist (+4,31, 462 Stellungen); sonst
gibt es keinen messbaren Unterschied (+0,43 [−0,22; +1,07], 651 Stellungen).

**2. Die Suche folgt dem Favoriten.** In den Pilotpartien (erste 15 Partien
je Arm, KI am Zug, ab Zug 101) ist der gespielte Zug die Spitze der
Wurzelliste in 75,0 % (A) und in 82,9 % (B). B spielt also überwiegend, was
die Tabelle vorne sieht.

**3. Auf den Stellungen, in die die Tabelle führt, trifft sie nicht mehr
besser.** `auswertung/muster-endspiel-verschiebung.js`: GNU Gos Zug (Stufe 10)
an den KI-Stellungen der Pilotpartien (30 Partien je Arm, ab Zug 81), dazu
die Wurzelliste bei Dosis 200, Rang von GNU Gos Zug in %:

| Stellungen aus den Partien von | Zahl | heute Rang 1 | Tabelle Rang 1 | heute Rang ≤ 16 | Tabelle Rang ≤ 16 | gespielter Zug = GNU Go |
|---|---:|---:|---:|---:|---:|---:|
| A (alte Tabelle) | 2 166 | 19,4 | **31,3** | 63,5 | 90,4 | 19,2 |
| B (Endspiel-Tabelle 200) | 2 168 | 24,9 | **24,8** | 81,4 | 81,6 | 24,3 |

Auf den Stellungen von A (neuer Seed, außerhalb der Stichprobe) bestätigt sich
Schritt 1: +11,9 Punkte bei Rang 1. Auf den Stellungen von B ist der Vorsprung
weg (24,8 gegen 24,9), in Zug 161–200 liegt die Tabelle sogar zurück (21,2
gegen 25,9). B spielt GNU Gos Zug in 24,3 % der Stellungen, A in 19,2 %: ein
Bruchteil des Abstands von 12 Punkten, den die Wurzelliste auf den
Stellungen von A verspricht. Der Gewinn schrumpft im Lauf der Partie (Zug
81–160: 27,5 gegen 18,3 %; 161–200: 21,8 gegen 17,5 %) und kehrt sich zuletzt
um (ab Zug 201: 19,1 gegen 23,8 %).

**4. Wo B Punkte verliert.** `auswertung/endspiel-verlauf.js` (Stufe 10, ab
Zug 100), 10 Partien A und 9 Partien B, abgebrochen, weil zu langsam (rund 5
Minuten je Partie). Bis Zug 160 verlieren beide ähnlich viel nach GNU Gos
Schätzung (Σ je Partie 93 gegen 100 Punkte in Zug 101–160). Ab Zug 161 hat B
mehr große Fehler: Züge, die mindestens 15 Punkte kosten, 14 gegen 4 in Zug
161–200 und 25 gegen 5 ab Zug 201 (Σ 994 gegen 88 Punkte); eigene tote Steine
am Ende Ø 37,0 gegen 29,6. Ein einzelner Fall prägt die Summen: In Partie 2
(A: +165,5, B: −32,5) ist GNU Gos Zug in 32 von 93 eigenen Zügen ab Zug 100
derselbe Punkt, P17, von Zug 170 bis 236 in jedem eigenen Zug, im Mittel 34,4
Punkte wert; B spielt ihn nie.

**Was daraus folgt.**

1. **Die Tabelle ist im Einzelnen besser, das Spiel mit ihr schlechter.**
   Das ist kein Widerspruch zu „bessere Vorhersage ist nicht bessere
   Zugwahl“ aus [`muster-ausbau.md`](muster-ausbau.md), sondern seine
   genauere Fassung: Hier trifft die Tabelle bessere Züge als die KI, aber nur
   auf den Stellungen, aus denen sie gelernt hat.
2. **Verschiebung der Stellungen.** Die Tabelle ist aus Partien der alten KI
   gelernt. Spielt die KI mit ihr, kommt sie in andere Stellungen, und dort
   verschwindet der Vorsprung (3.). Fehler häufen sich dann, besonders spät,
   wo große ungelöste Stellen übrig bleiben (4.). Das ist die bekannte
   Schwäche des Lernens aus fremden Stellungen (Ross, Gordon und Bagnell
   2011). Belegt ist die Verschiebung für die Vorhersage (3.); dass sie das
   Spiel kostet, ist die naheliegende, nicht bewiesene Erklärung.
3. **Das Urteil von GNU Go ist nicht unabhängig.** Lehrer und Schiedsrichter
   sind dasselbe Programm; die +2,04 Punkte dürften zu günstig sein.
4. **Offen und möglich:** die Datenaggregation von Ross et al. (DAgger): mit
   der Tabelle spielen, die dabei erreichten Stellungen von GNU Go beschriften
   lassen, mit den neuen und den alten Stellungen neu lernen, wiederholen.
   Eine Runde kostet rund zwei Stunden (240 Partien, 18 000
   Beschriftungen, Pilot) und braucht eine eigene Vorabfestlegung. Ob sie den
   Pilot dreht, ist offen.
