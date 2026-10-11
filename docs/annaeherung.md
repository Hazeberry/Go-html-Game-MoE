# Antwort auf Annäherung

**Stand: 11.10.2026.** Diagnose, keine Messung. Alle Zahlen sind
nachträglich an vorhandenen Partien erhoben. Ergebnis: Die KI antwortet oft
genug lokal, aber selten mit dem Zug, den GNU Go spielen würde. Die
Zugbewertung zieht Züge vor, die Gebiet versprechen, statt die eigene Gruppe
zu stärken. Die Befunde sind kein Rauschen. Ein billiger Schalter dafür ist
nicht in Sicht.

---

## 1. Anlass

In [`augen-urteil.md`](augen-urteil.md) §5 sterben lebende Gruppen der KI
nicht an verlorenen Augen. Den Ausschlag gibt ein Zug von GNU Go, meist wird
die Gruppe dabei geteilt, und auf GNU Gos Züge nah an der Gruppe antwortet
die KI vorher seltener nah. Dieser Vergleich stand auf schwachen Füßen: Die
Antwortquote der Kontrollgruppen lag je nach Auswahl bei 54 % oder 63 %.
Hier wird die Frage direkt gestellt: Steht nach GNU Gos Zug die Antwort,
die GNU Go selbst spielen würde, unter den Kandidaten der Suche?

**Daten:** dieselben 120 ausgespielten Partien wie in
[`punktverlust.md`](punktverlust.md) und [`augen-urteil.md`](augen-urteil.md)
(Seed 151 und 161, GNU Go Stufe 1 gibt nicht auf, neun Vorgabesteine für
die KI, 120 Simulationen).

## 2. Werkzeuge

`auswertung/annaeherung.js` sucht zwischen Zug 100 und 200 jeden Zug, der
nah (Abstand ≤ 2) an eine lebende Gruppe der anderen Seite gesetzt wird.
Gruppe heißt wie in `kritisch.js` ein Drache von GNU Go ab drei Steinen.
Für jede solche Gruppe hält das Werkzeug fest:
- GNU Gos Status nach dem Zug (lebt, kritisch, tot),
- die **Referenz**: GNU Gos Zug auf Stufe 10 für die angegriffene Seite;
  lokal heißt Abstand ≤ 2 zum Annäherungszug,
- den Zug, den die angegriffene Seite in der Partie spielte,
- bei Gruppen der KI den Rang der Referenz in der nachgestellten
  Kandidatenliste (wie `kritisch-rang.js`),
- wie viele Steine der Gruppe 20 Züge später tot oder geschlagen sind.

Zum Vergleich dasselbe, wenn die KI sich einer Gruppe von GNU Go nähert.

`auswertung/annaeherung-merkmale.js` beschreibt die Antwortzüge: Kontakt,
Atari, Verbinden, Stärken, Linie. Außerdem zerlegt es die Zugbewertung der
KI für die Referenz und für den eigenen Zug in die Beiträge der Terme.

**Rauschprüfung:** Ereignisse einer Partie hängen zusammen, dieselbe Gruppe
wird oft mehrmals angegangen. Die Intervalle unten ziehen deshalb ganze
Partien neu (Bootstrap über die 120 Partien, 2000 Ziehungen, 95 %).

## 3. Wie oft und wie gefährlich

Im Fenster setzt GNU Go 44 seiner rund 50 Züge je Partie nah an eine
lebende Gruppe der KI, die KI 49 ihrer Züge nah an eine von GNU Go. Je
Gruppe gezählt sind das 55,3 und 52,1 Ereignisse je Partie.

| nach dem Annäherungszug | Gruppen der KI | Gruppen von GNU Go |
|---|---:|---:|
| lebt | 80 % | 76 % |
| kritisch | 19 % | 24 % |
| tot | 0,7 % | 0,2 % |
| Referenz antwortet lokal | 42 % | 36 % |

## 4. Die KI antwortet lokal, aber mit einem anderen Zug

Betrachtet werden die Fälle, in denen die Referenz lokal antwortet; das
sind 23 je Partie bei der KI.

| Referenz lokal | KI | GNU Go | KI − GNU Go |
|---|---:|---:|---:|
| antwortet lokal | 72 % [70, 74] | 89 % [88, 90] | −17 Punkte [−19, −14] |
| spielt genau die Referenz | **31 % [28, 34]** | **78 % [76, 80]** | |
| nach „kritisch“: spielt GNU Gos Rettungspunkt (alle Fälle) | 38 % | 54 % | |

In eckigen Klammern das 95-%-Intervall. GNU Go Stufe 1 trifft die Antwort
seiner eigenen Stufe 10 in vier von fünf Fällen, die KI in einem von drei.
Rund 16 Mal je Partie weicht die KI von einer lokalen Referenz ab.

**Wo die Referenz in der Kandidatenliste steht** (2760 Fälle):

| Rang | Anteil |
|---|---:|
| 1 | 30 % |
| 2–16 (die Suche sieht sie) | 47 % |
| über 16 (die Suche sieht sie nie) | 23 % [21, 25] |

Die nachgestellte Zugwahl spielt die Referenz in 30 % der Fälle, fast genau
so oft, wie sie auf Rang 1 steht. Wie in
[`verschenkt-warum.md`](verschenkt-warum.md) folgt die Suche mit 120
Simulationen ihrem Favoriten aus der Zugbewertung. Steht die Referenz
nicht vorn, wird sie nicht gespielt. Bei kritischen Gruppen steht GNU Gos
Rettungspunkt in 39 % auf Rang 1 und in 31 % über Rang 16.

## 5. Kostet das Steine?

Steine der angegriffenen Gruppe, die 20 Züge später tot oder geschlagen
sind, je Ereignis mit lokaler Referenz:

| Antwort | KI | GNU Go |
|---|---:|---:|
| spielt die Referenz | 1,1 | 0,2 |
| lokal, aber anders | 1,7 | 0,3 |
| woanders | 2,0 | 0,4 |
| *nach „kritisch“:* Referenz / lokal anders / woanders | 1,6 / 3,0 / 3,7 | |

Unterschied bei der KI: lokal anders minus Referenz **+0,6 Steine
[0,4; 0,8]**, woanders minus Referenz **+0,9 [0,7; 1,2]**.

Das ist kein Rauschen, aber auch kein Nachweis der Ursache. Die KI wählt die
Referenz vielleicht gerade in Lagen, die ohnehin leichter sind. Die
Ereignisse überlappen außerdem: Eine Gruppe wird mehrmals angegangen, und
derselbe verlorene Stein zählt in mehreren Ereignissen. Die Zeilen lassen
sich deshalb nicht zu einer Zahl je Partie aufsummieren. Die Obergrenze
bleibt der Posten aus [`augen-urteil.md`](augen-urteil.md) §4: lebende
Gruppen der KI verlieren rund 12 Steine in 120 Zügen.

## 6. Was für Züge das sind

Merkmale des Antwortzugs, je Annäherungszug mit lokaler Referenz:

| | Referenz für die KI (2014) | KI, lokal, nicht die Referenz (808) | Referenz für GNU Go (2118) |
|---|---:|---:|---:|
| grenzt an den Annäherungsstein | 48 % | **61 %** | 40 % |
| Atari | 19 % | 21 % | 33 % |
| verbindet zwei eigene Ketten | 27 % | 17 % | 23 % |
| **stärkt eine eigene Kette** (mehr Freiheiten als vorher) | **62 %** | **27 %** | 42 % |
| eigene Kette danach ≤ 2 Freiheiten | 6 % | 13 % | 29 % |
| Linie 1–2 / 5 und höher | 24 % / 50 % | 18 % / 56 % | 35 % / 38 % |

GNU Go antwortet für die KI meistens, indem es die eigene Kette stärkt. Die
KI legt lieber an den Annäherungsstein an und lässt die eigene Kette öfter
mit zwei Freiheiten stehen.

## 7. Warum die Zugbewertung anders entscheidet

Ab Zug 81 bewertet allein der Endspiel-Experte (`endgameMoves` 80,
[`endspielgrenze.md`](endspielgrenze.md)). Er kennt Flächengewinn, Schlagen,
Atari und den Freiheitsdruck der neuen Kette (`endLibPressure`). Dazu kommen
`gebietZug` und die Krisenkarte. Einen Term für das Stärken einer
bestehenden Kette hat er nicht. Den hat nur der Mittelspiel-Experte
(`midRescue2Lib` und Nachbarn), und der rechnet ab Zug 81 nicht mehr.

Beiträge zur Bewertung (Wert mit minus Wert ohne den Term), wenn die
Referenz lokal ist und die KI lokal anders spielte (808 Züge):

| Term | Referenz | KI-Zug | KI − Referenz |
|---|---:|---:|---:|
| **gesamt** | 516 | 1056 | **+540** |
| `gebietZug` | 389 | 712 | **+323** |
| Krisenkarte (`evalTsumego`) | 43 | 262 | **+219** |
| Flächengewinn (`endAreaGain`) | 28 | 45 | +17 |
| `endLibPressure` | −5 | −8 | −3 |

In 97 % dieser Fälle bewertet die KI ihren Zug höher als die Referenz. Der
Vorsprung kommt aus Gebiet und Krise: Der Kontaktzug drängt den Einfluss
des Gegners zurück, und oft greift er eine schwache Kette an. Das Stärken
bringt in keinem Term etwas. `endLibPressure` bestraft sogar einen Zug, der
eine Kette mit zwei Freiheiten auf drei bringt, genauso, als hätte er die
schwache Kette erst geschaffen. Spielt die KI woanders (582 Züge), kommt
ihr Vorsprung fast ganz aus der Krisenkarte (+597): Sie kümmert sich dann
um eine andere Krise.

**Würde ein Term für abgebauten Druck helfen?** Abgebauter Druck ist der
Druck der Nachbarketten vorher (Größe / Freiheiten bei 2–3 Freiheiten, wie
`endLibPressure`) minus der Druck der Kette danach. Er ist bei 46 % der
Referenzen positiv, aber nur bei 13 % der Züge der KI. Im Mittel ist er aber
klein, weil die meisten Nachbarketten schon vier oder mehr Freiheiten haben.
Bei Gewicht 40, so viel wie `endLibPressure`, rückte die Referenz in 5 % der
Fälle vor den Zug der KI, bei 100 in 6 %, bei 200 in 11 %, bei 400 in 19 %.

## 8. Was daraus folgt

- **Kein Rauschen.** Alle Vergleiche halten mit Intervallen über ganze
  Partien:
  - Die KI antwortet seltener lokal als GNU Go (−17 Prozentpunkte).
  - Sie spielt GNU Gos Antwort seltener (31 % gegen 78 %).
  - Die Referenz steht in 23 % der Fälle außerhalb der Suche.
  - Gruppen verlieren mehr Steine, wenn die KI anders antwortet.

  Der letzte Punkt ist ein Zusammenhang, keine nachgewiesene Ursache. Der
  Befund aus `augen-urteil.md` §5, die KI antworte zu selten nah, bestätigt
  sich hier mit einem Vergleich, der nicht von einer Auswahl abhängt.
- **Lokal antworten ist nicht das Problem.** Die KI antwortet in drei von
  vier Fällen lokal, aber selten mit dem richtigen Zug. Sie nimmt Gebiet und
  Angriff, wo GNU Go die eigene Kette stärkt. Ein Bonus für Nähe
  (`localityBonus`, `openContactResponse`) zielt daran vorbei.
- **Kein billiger Schalter.** Der Abstand in der Bewertung ist groß (im
  Mittel +540), und das Stärken ist in Freiheiten gemessen klein.
  Ein Term für abgebauten Druck brächte die Referenz nur in 5–19 % der Fälle
  nach vorn. Ein vorab festgelegter Versuch damit wäre möglich, aber mit
  geringen Aussichten.
- **Der eigentliche Hebel** ist dieselbe Lücke wie beim Gebiet
  ([`punktverlust.md`](punktverlust.md) §7): Ab Zug 81 bewertet die Engine
  Gebiet, aber keine Sicherheit. `gebietZug` rechnet jeden Stein als
  lebend, auch einen, der gleich abgeschnitten wird. Das zu ändern ist
  kein Schalter, sondern Arbeit am Endspiel-Experten.

## 9. Nachvollziehen

Rohdumps wie in [`augen-urteil.md`](augen-urteil.md) §8. Dann:

```
node auswertung/annaeherung.js <dumps> --aus annaeherung.jsonl
node auswertung/annaeherung.js --bericht annaeherung.jsonl
node auswertung/annaeherung-merkmale.js --ereignisse annaeherung.jsonl --dumps <dumps>
node auswertung/annaeherung-gegenprobe.js --ereignisse annaeherung.jsonl --dumps <dumps>
```

`annaeherung.js` braucht rund 90 s je Partie (zwei GNU-Go-Prozesse und die
nachgestellte Zugwahl). Mit acht Prozessen auf vier Kernen dauerten die 120
Partien gut eine Stunde. Die Tabellen in §3–5 und die Rauschprüfung stehen
im Bericht von `annaeherung.js`, §6 und §7 im Bericht von
`annaeherung-merkmale.js`.

---

## 10. Nachtrag: zwei Gegenproben (11.10.2026)

Bevor ein Schalter nachgemessen oder gebaut wird: Bringt er GNU Gos Antwort
nach vorn? `auswertung/annaeherung-gegenprobe.js` bewertet die 2014
Annäherungen an die KI mit lokaler Referenz neu. Der Rang zählt unter
allen leeren Punkten, ohne die Filter von `getAIMove`, an jeder fünften
Stellung (403).

| Bewertung | Referenz höher als der Zug der KI | Referenz auf Rang 1 | Rang ≤ 16 |
|---|---:|---:|---:|
| Default | 2,5 % | 19,4 % | 72,2 % |
| `gebietFreiheit` 1 | 14,4 % | 14,4 % | 73,7 % |
| `gebietZug` mit Lesestatus (Prototyp) | 10,1 % | 9,2 % | 54,1 % |

- **`gebietFreiheit`** wertet den Gebietsgewinn schwacher neuer Ketten ab.
  Der Zug der KI fällt dadurch öfter hinter die Referenz. Auf Rang 1 kommt
  die Referenz aber seltener, weil andere Züge nach vorn rücken. Für eine
  Nachmessung mit 240 Paaren ([`teststaerke.md`](teststaerke.md)) fehlt
  damit der Grund.
- **`gebietZug` mit Lesestatus:** Im Prototyp, nicht in `index.html`, zählt
  die Bouzy-Karte keine Kette, die der taktische Leser für verloren hält.
  Damit verliert die Referenz deutlich an Rang. An die Spitze springen
  Rettungen von Ketten, die taktisch noch zu halten sind. Das ist das
  Muster von `leseRettung`
  ([`punktverlust.md`](punktverlust.md) §8: kurzfristig gerettet, zehn
  Züge später fast genauso oft tot). Nicht gebaut.

Beide Eingriffe gewichten nur um, was die Bewertung schon weiß: Gebiet und
Taktik. GNU Gos Antwort beruht auf Formwissen, also darauf, welcher lokale
Zug die Gruppe hält. Das fehlt der Bewertung.
