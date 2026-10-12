# Wo die Muster-KI ihre Punkte verliert

**Stand: 12.10.2026.** Diagnose, keine Messung. Alle Zahlen sind
nachträglich an vorhandenen Partien erhoben. Sie begründen Hypothesen, keine
Defaults.

---

## 1. Anlass

Die letzte Diagnose dieser Art ([`punktverlust.md`](punktverlust.md)) stammt
aus der Zeit vor den Mustern. Seitdem spielt die KI deutlich anders:
`musterGewicht` brachte gegen GNU Go +102,8 Punkte
([`muster.md`](muster.md)). Ein Urteil über Leben und Tod in der
Zugbewertung brächte höchstens +13,6 ([`gebiet-sicher.md`](gebiet-sicher.md)).
Die Frage hier ist: Wo verliert die heutige KI noch Punkte?

**Daten:** die 240 ausgespielten Partien von Arm A der Wiederholung in
[`gebiet-sicher.md`](gebiet-sicher.md) §9, gespielt mit der Standard-KI auf
Commit `2816458`:
- Seed 203, GNU Go Stufe 1 gibt nicht auf
- neun Vorgabesteine für die KI, 120 Simulationen
- Partielänge im Median 240 Züge

## 2. Verlauf und Buchung der Brettpunkte

`auswertung/besitz-verlauf.js` bucht jeden Brettpunkt nach GNU Gos Status
zu. Die Marke „ende“ steht dabei für die Schlussstellung, wann immer die
Partie endet. Stand aus Sicht der KI, ohne den Vorgabeausgleich von GNU Go
(am Ende: +30,6 − 9 = +21,6, genau GNU Gos Endstand im Schnitt):

| Zug | 40 | 80 | 120 | 140 | Ende |
|---|---:|---:|---:|---:|---:|
| Zählung | +117,2 | +116,0 | +90,8 | +70,7 | +30,6 |

Bis Zug 80 hält die KI ihren Vorsprung. Danach verliert sie gleichmäßig rund
85 Punkte.

Von Zug 40 bis zum Ende, je Partie:

| Posten | Punkte |
|---|---:|
| **eigenes Gebiet geht verloren** | **−73,3** |
| neutrales Gebiet: an GNU Go −67,8, an die KI +54,5 | −13,3 |
| eigene Steine sterben | −7,3 |
| tote GNU-Go-Steine leben wieder | −5,5 |
| von GNU Go zurückgewonnen | +10,4 |
| eigene tote Steine leben wieder | +2,2 |
| **Summe** | **−86,6** |

Sterbende Steine kosten nur noch 7 Punkte, vor den Mustern waren es 20.
Das passt zur bescheidenen Obergrenze für ein Lebensurteil.

## 3. Wo das Gebiet verloren geht

`auswertung/gebiet-verlust.js` ordnet jeden Punkt, der vom Gebiet der KI
abgeht, nach drei Merkmalen:
- Linie,
- Tiefe hinter der alten Grenze (1 = direkt an ihr),
- Ziel (GNU-Go-Stein, GNU-Go-Gebiet, toter KI-Stein, neutral).

Zug 40 bis Ende, 73,3 Punkte je Partie:

| Linie | 1 | 2 | 3 | 4 | 5 | 6+ |
|---|---:|---:|---:|---:|---:|---:|
| Anteil | **34 %** | **19 %** | 13 % | 7 % | 8 % | 19 % |

| Tiefe | 1 | 2 | 3 | 4 | 5+ |
|---|---:|---:|---:|---:|---:|
| Anteil | **35 %** | **24 %** | 15 % | 8 % | 17 % |

Gut die Hälfte liegt auf den beiden Randlinien, knapp 60 % direkt an der
alten Grenze oder einen Punkt dahinter. Das ist Endspiel an den Grenzen:
Grenzen werden verschoben, Invasionen sind selten.

Gegenprobe, von Zug 80 bis Ende:

| | Gebiet bei Zug 80 | verloren bis zum Ende |
|---|---:|---:|
| KI | 154 Punkte | **51,4** |
| GNU Go | 43 Punkte | **5,5** |

Die KI hat mehr Gebiet, das angegriffen werden kann. Sie verliert aber ein
Drittel davon, GNU Go nur ein Achtel. Die Grenzkämpfe gewinnt fast nur
GNU Go. Außerdem stehen am Ende im Schnitt 27 tote KI-Steine auf dem Brett.

## 4. Die Züge selbst

`auswertung/zugwert.js` fragt vor jedem Zug ab Zug 81 GNU Go (Stufe 10)
nach seinen zehn besten Zügen und deren Werten (`top_moves`). Das läuft an
40 der 240 Partien, für die Züge der KI und, als Vergleich, für die von GNU
Go Stufe 1.

**Vorbehalt:** GNU Gos Zugwerte sind keine additiven Punkte. Sie enthalten
Folgewerte und Zuschläge für Angriff und Verteidigung. Summiert ergäbe
selbst GNU Go Stufe 1 rund 260 „verlorene“ Punkte je Partie, obwohl sich
der Stand nur um rund 85 bewegt. Aussagekräftig ist nur der Vergleich der
beiden Seiten.

| | KI | GNU Go Stufe 1 |
|---|---:|---:|
| spielt GNU Gos besten Zug (Stufe 10) | **18,7 %** | 68,7 % |
| … wenn dieser auf Linie 1–2 liegt | **24 %** | 75 % |
| Zug nicht unter GNU Gos zehn besten | 51–70 % je Phase | 6–10 % |
| Abstand zum besten Zug je Zug, Zug 81–120 / 121–160 | 9,9 / 7,6 | 4,9 / 3,1 |
| … Zug 161–200 / ab 201 | 6,9 / 3,3 | 4,0 / 2,8 |

Der Vergleich ist nicht fair: GNU Go Stufe 1 benutzt dieselbe
Zugbewertung wie Stufe 10, nur mit weniger Lesen. Trotzdem ist der Abstand
groß, am größten zwischen Zug 81 und 160.

## 5. Sieht die Zugbewertung GNU Gos besten Zug?

`auswertung/zugwert-rang.js` bestimmt den Rang von GNU Gos bestem Zug in
der Kandidatenliste von `getAIMove`. Das ist die sortierte statische
Bewertung vor der Suche. Ausgewertet sind 1354 Stellungen, jede zweite:

| | Rang 1 | Rang ≤ 16 | Rang > 16 | Median |
|---|---:|---:|---:|---:|
| alle | 20 % | 70 % | 30 % | 7 |
| bester Zug auf Linie 1–2, nicht gespielt | 3 % | 57 % | 41 % | 13 |
| bester Zug auf Linie 3+, nicht gespielt | 2 % | 65 % | 35 % | 12 |

Die Suche betrachtet höchstens die ersten 16 Kandidaten. In fast einem
Drittel der Stellungen sieht sie GNU Gos besten Zug also nie. Randzüge
liegen etwas weiter hinten, der Unterschied ist aber klein.

**Was schiebt den Favoriten der KI nach vorn?** In 1048 Stellungen spielte
die KI nicht GNU Gos besten Zug. Dort ist die Bewertung beider Züge in ihre
Terme zerlegt (Beitrag = Wert mit minus Wert ohne den Term). Der Favorit
liegt im Schnitt 1094 vorn:

| Term | Vorsprung des Favoriten | allein ausschlaggebend |
|---|---:|---:|
| Muster gesamt (`musterGewicht` × `musterWert`) | +455 | 18 % |
|   davon 3×3-Muster | +239 | 7 % |
|   davon Abstand zum letzten Gegnerzug | +242 | 9 % |
|   davon Linie | −27 | 1 % |
| Krisenkarte | +352 | 8 % |
| Flächengewinn (`endAreaGain`) | +116 | 3 % |
| `gebietZug` | +114 | 7 % |

Der Favorit der KI liegt in 66 % dieser Fälle nah am letzten Gegnerzug
(Abstand ≤ 2), GNU Gos bester Zug nur in 23 %. Das Abstandsmerkmal der
Muster gibt einem angrenzenden Zug +498, einem weit entfernten −96.

**Gegenprobe:** Ohne das Abstandsmerkmal spielt der Favorit weniger lokal,
aber GNU Gos bester Zug rückt nicht nach vorn:

| Abstandsmerkmal × | Favorit lokal | GNU Gos Zug auf Rang 1 | Rang ≤ 16 |
|---:|---:|---:|---:|
| 1 (heute) | 66 % | 20 % | 70 % |
| 0,5 | 55 % | 20 % | 70 % |
| 0 | 40 % | 18 % | 69 % |

Die Muster schieben nur einen anderen falschen Zug nach vorn. **Kein
einzelner Term ist schuld.** Auch der Gebietsanteil des Gegners
(`gegnerGebiet`) wurde schon gemessen und schadete
([`gegnerwert.md`](gegnerwert.md)).

## 6. Mehr Suche

GNU Gos bester Zug steht in 70 % der Stellungen unter den Kandidaten der
Suche. Mit 120 Simulationen bleibt die Suche aber meist beim Favoriten der
statischen Bewertung. Im Browser rechnet die KI 750–1300 Simulationen.

`auswertung/zugwert-suche.js` lässt `getAIMove` an jeder achten der
Stellungen aus §4 neu ziehen, 340 Stellungen, mit festen Simulationszahlen,
geseedet und ohne Baumwiederverwendung:

| Simulationen | GNU Gos bester Zug | derselbe Zug wie in der Partie |
|---:|---:|---:|
| 120 | 16,5 % | 83 % |
| 480 | 14,4 % | 74 % |
| 1000 | 14,4 % | 62 % |

Mehr Suche ändert den Zug öfter, bei 1000 Simulationen in fast 40 % der
Stellungen. Zu GNU Gos bestem Zug führt sie aber nicht. Die Suche bewertet
ihre Blätter mit derselben Vorstellung vom Wert eines Zugs wie die
Kandidatenliste.

## 7. Was daraus folgt

- **Der größte Posten ist das Endspiel an den Grenzen.** Gut die Hälfte des
  verlorenen Gebiets liegt auf den Linien 1 und 2, und fast immer direkt an
  der alten Grenze. GNU Go gewinnt diese Kämpfe, die KI fast nie.
- **Sterbende Gruppen sind kein großer Posten mehr** (−7). Das deckt sich
  mit der Obergrenze von +13,6 für ein Lebensurteil.
- **Die KI wählt im Endspiel selten GNU Gos Zug**, auch wenn er unter ihren
  Kandidaten steht. Weder ein einzelner Term noch mehr Suche ändert das. Ihr
  fehlt ein Maß für den **Wert eines Grenzzugs**: was ich gewinne, wenn ich
  dort spiele, plus was der Gegner gewänne, wenn er dort spielte, mit
  Vorhand und Nachhand. Die Bouzy-Karte ist dafür am Rand zu grob; der
  Versuch mit `gegnerGebiet` scheiterte.

**Zwei mögliche nächste Schritte, beide zuerst offline zu prüfen:**

1. **Endspiel-Muster:** eine eigene Mustertabelle für die Zeit ab Zug 81,
   gelernt aus GNU Gos Zügen in den Endspielen der heutigen KI. Nachahmung
   war bisher der stärkste Hebel (+102,8). Die Tabelle aus §5 ist über die
   ganze Partie gelernt; ihre Vorliebe für lokale Antworten passt ins
   Endspiel schlecht. Offline-Kriterium: Kommt GNU Gos bester Zug in
   `zugwert-rang.js` deutlich öfter auf Rang 1? Vorsicht aus
   [`muster-ausbau.md`](muster-ausbau.md) §7: bessere Vorhersage ist nicht
   bessere Zugwahl. Ein Offline-Gewinn ist nur die Eintrittskarte für eine
   Messung.
2. **Grenzwert-Rechner:** der Wert eines Zugs an der Grenze, lokal und
   genau gezählt (mein Zug gegen den Zug des Gegners auf denselben Punkt,
   jeweils mit der besten lokalen Antwort). Das ist der richtigere, aber
   größere Weg.

**Werkzeuge** (alle unter `auswertung/`, Aufrufe in ihren Köpfen):
- `besitz-verlauf.js` (§2), jetzt mit der Marke „ende“
- `gebiet-verlust.js` (§3)
- `zugwert.js` (§4)
- `zugwert-rang.js` (§5)
- `zugwert-suche.js` (§6)
