# Wo die Punkte zwischen Zug 100 und 200 verloren gehen

**Stand: 11.10.2026.** Diagnose, keine Messung. Alle Zahlen sind
nachträglich an vorhandenen Partien erhoben; sie begründen Hypothesen, keine
Defaults.

---

## 1. Anlass

Drei Schalter haben die verschenkten Züge der KI gesenkt, ohne den Endstand
gegen GNU Go messbar zu ändern: `quickRettung`
([`quick-rettung.md`](quick-rettung.md)), `gebietFreiheit` in der
Nachmessung ([`gebiet-freiheit.md`](gebiet-freiheit.md) §8) und
`atariVerzicht` ([`atari-verschenkt.md`](atari-verschenkt.md)). In GNU Gos
Schätzung steht die KI nach Zug 100 rund 70 Punkte vorn, nach Zug 200 rund
45 Punkte hinten. Die Frage war, welche Züge in dieser Spanne die Punkte
kosten.

**Daten:** die 120 ausgespielten Partien der beiden Default-Arme aus diesen
Messungen (Seed 151 und 161; GNU Go Stufe 1 gibt nicht auf, neun
Vorgabesteine für die KI, 120 Simulationen). Die Rohdumps entstehen neu mit
den Befehlen in `gebiet-freiheit.md` §7 und `atari-verschenkt.md` §5.

## 2. Zug für Zug gegen GNU Gos Vorschlag: taugt nicht

`auswertung/punktverlust.js` vergleicht an jedem Zug GNU Gos Schätzung nach
dem gespielten Zug mit der nach GNU Gos eigenem Vorschlag. Weil eine
Schätzung direkt nach einem Atari die Drohung bewertet, bevor der Gegner
antwortet ([`endspiel-verlust.md`](endspiel-verlust.md) §2), bekommt hier
jede Variante zuerst die Antwort des Gegners.

Auch so taugt der Vergleich nicht für einzelne Züge. Bei 44 Partien
(Schiedsrichter GNU Go Stufe 5):
- Die Summe der Einzelverluste hängt mit dem echten Abstieg der Partie kaum
  zusammen (Korrelation 0,20).
- Ein Drittel der KI-Züge wäre besser als GNU Gos Vorschlag.
- Zwei Halbzüge tief sieht ein erzwingender Zug immer gut aus: Der Gegner
  muss lokal antworten. Ein ruhiger Vorschlag lässt ihm dagegen den nächsten
  großen Punkt. In einer Partie spielte die KI drei Randzüge, die Weiß lokal
  beantworten musste. GNU Go schlug jedes Mal einen ruhigen Zug vor, nach
  dem Weiß den großen Punkt H16 nahm. Der Vergleich gab der KI 16–24 Punkte
  je Zug recht, während die Partie in dieser Spanne über 100 Punkte verlor.

Statt einzelner Züge zählen deshalb die folgenden Abschnitte, was auf dem
Brett passiert.

## 3. Wohin die Punkte gehen

`auswertung/besitz-verlauf.js` fragt GNU Go alle 20 Züge nach dem Status der
Stellung und ordnet jeden Brettpunkt zu: lebender Stein, Gebiet oder toter
Stein einer Seite, oder neutral. Daraus ergibt sich eine Zählung, die ab
Zug 120 eng bei GNU Gos Schätzung liegt:

| Zug | 100 | 120 | 140 | 160 | 180 | 200 |
|---|---:|---:|---:|---:|---:|---:|
| Zählung (Sicht der KI) | +55,8 | +36,2 | +15,9 | −2,1 | −18,4 | −38,8 |
| GNU Gos Schätzung | +70,9 | +46,0 | +21,1 | −0,9 | −23,4 | −44,0 |

Der Abstieg ist gleichmäßig, rund 20 Punkte je 20 Züge. Zwischen Zug 100
und 200 wechseln die Brettpunkte so, je Partie:

| Posten | Punkte |
|---|---:|
| **Gebiet der KI geht verloren** | **−63,2** |
|   davon: GNU-Go-Steine leben dort | −32,5 |
|   davon: wird Gebiet von GNU Go / neutral / toter KI-Stein | −12,5 / −11,8 / −6,4 |
| neutrales Gebiet: an GNU Go −49,3, an die KI +28,2 | −21,1 |
| Steine der KI sterben | −20,4 |
| Steine und Gebiet von GNU Go an die KI | +14,5 |
| tote GNU-Go-Steine leben wieder | −4,4 |
| **Summe** | **−94,5** |

Alle 120 Partien steigen ab. In 116 verliert die KI mehr über Gebiet als
über gestorbene Steine. (Mit Marken alle 10 Züge ergibt dieselbe Buchung
−94,8 statt −94,5: GNU Gos Statusurteil hängt geringfügig davon ab, welche
Stellungen es vorher geprüft hat.) Verschenkte Steine stecken vor allem im kleinsten
Posten. Deshalb änderten Schalter gegen verschenkte Steine am Endstand kaum
etwas.

## 4. Einbrüche ins Gebiet

`auswertung/einbruch.js` (Karten alle 10 Züge, Züge 101–180): Ein Einbruch
ist ein Zug auf einen Punkt, der an der Marke davor Gebiet des Gegners war.
Ein Gebietspunkt grenzt nie an einen lebenden Stein des Gegners; flach heißt
deshalb Abstand 2 zum nächsten eigenen lebenden Stein (Reduktion vom Rand),
tief Abstand 3 und mehr (Invasion).

| | GNU Go ins Gebiet der KI | KI ins Gebiet von GNU Go |
|---|---:|---:|
| Züge je Partie | 4,9 | 5,6 |
| davon flach / tief | 3,7 / 1,1 | 2,6 / 3,0 |
| Antwort direkt daneben (Abstand ≤ 2) | 71 % | 47 % |
| Stein lebt 20 Züge später | **86 %** | **30 %** |
|   nach einer Antwort direkt daneben | 84 % | 25 % |
| vom Leser der Engine sofort fangbar | 1 % | 13 % |

Die KI ignoriert die Einbrüche nicht. Sie antwortet meist direkt daneben,
und trotzdem leben GNU Gos Steine fast immer. Ihr taktischer Leser kann sie
fast nie sofort fangen: GNU Go setzt Steine, die sich nicht einfach fangen
lassen. Die Reduktionen vom Rand kosten die KI ihr Gebiet. Das ist
eine Frage von Form und Richtung der Abwehr, nicht von Taktik.

## 5. Kritische Gruppen

`auswertung/kritisch.js` fragt GNU Go vor jedem Zug nach dem Status jeder
Gruppe (`dragon_status`: alive, critical, dead; bei critical mit Angriffs-
und Rettungspunkt). Gruppen ab drei Steinen, Züge 100–200, je Partie:

| | KI | GNU Go |
|---|---:|---:|
| eigene Gruppe vor dem Zug kritisch | 6,8 | 4,6 |
| danach gerettet | **33 %** | **89 %** |
| GNU Gos Rettungspunkt gespielt | 15 % | 66 % |
| 10 Züge später tot | **58 %** | 5 % |
| Gruppe des Gegners vor dem Zug kritisch | 0,7 | 8,9 |
| danach getötet | 25 % | 69 % |

Über alle Gruppen, auch einzelne Steine, tötet GNU Go mit seinen Zügen
51,6 Steine je Partie, die KI 5,2. Die großen Gruppen von GNU Go werden für
die KI fast nie kritisch. Die der KI werden es oft, und dann rettet sie sie
selten.

## 6. Warum die KI ihre Gruppen nicht rettet

`auswertung/kritisch-rang.js` stellt an diesen Stellungen die Zugwahl der
KI nach (120 Simulationen, ohne Baumwiederverwendung). Für GNU Gos
Rettungspunkt:

| | nicht gerettet (550) | gerettet (269) |
|---|---:|---:|
| Rang 1 in der Kandidatenliste | 4 % | 38 % |
| Rang 2–16 (die Suche sieht ihn) | 33 % | 32 % |
| Rang über 16 (die Suche sieht ihn nie) | **61 %** | 28 % |
| Rang im Median | 31 | 4 |
| Gruppe in der Krisenkarte der Engine | **21 %** | 47 % |
| Rettungspunkt ist eine Freiheit der Gruppe | 41 % | 42 % |
| Freiheiten der Gruppe (Median) | 2 | 3 |
| nachgestellte Zugwahl spielt den Rettungspunkt | 3 % | 39 % |

Die Zugbewertung sieht die Gefahr meist nicht. Die Krisenkarte markiert
Ketten mit zwei Freiheiten erst ab vier Steinen, und zwei Drittel der nicht
geretteten Gruppen haben nur drei oder vier Steine.

**Der eigene Leser weiß es besser.** In 64 % der nicht geretteten Fälle
hält er die Kette für fangbar (ab zwei Steinen, bis drei Freiheiten), in
99 % davon für rettbar. GNU Gos Rettungspunkt rettet in 62 % dieser Fälle
auch nach dem Leser. Genau diese Rettungen hebt `leseRettung` an die Spitze
der Kandidaten ([`laufkampf-lesen.md`](laufkampf-lesen.md)). Der Schalter
steht auf 0: Im Selbstspiel brachte er 62,8 %, gegen GNU Go aber −30,5
Punkte. Diese Messung lief vor `leseVerzicht` und `wurzelFrisch` und mit
Endständen, die bei einer Aufgabe von GNU Go nur Zwischenstände waren
([`gnugo-ausspielen.md`](gnugo-ausspielen.md)).

## 7. Was daraus folgt

- **Der größte Posten ist Gebiet**, rund 85 von 95 Punkten über verlorenes
  eigenes und neutrales Gebiet. GNU Go reduziert vom Rand her, die KI
  antwortet lokal, kann die Steine aber nicht fangen. Ein schneller Schalter
  dafür ist nicht in Sicht. Der Hebel läge in der Bewertung von Grenzzügen
  und der Richtung der Abwehr.
- **Sterbende eigene Gruppen kosten rund 20 Punkte.** Hier gibt es einen
  konkreten, billigen nächsten Schritt: `leseRettung` neu messen, vorab
  festgelegt und mit ausgespielten Partien. Der Leser kennt zwei Drittel
  der Fälle, in denen die Zugbewertung den Rettungspunkt nicht sieht.
- Die Zahl verschenkter Züge taugt nicht als Ziel. Sie misst den kleinsten
  der drei Posten.

**Werkzeuge:** `punktverlust.js` (§2), `besitz-verlauf.js` (§3),
`einbruch.js` (§4), `kritisch.js` (§5), `kritisch-rang.js` (§6). Alle unter
`auswertung/`, Aufrufe in ihren Köpfen.

---

## 8. Nachtrag: `leseRettung` nachgemessen (11.10.2026)

Vorab festgelegt in [`laufkampf-lesen.md`](laufkampf-lesen.md) §7,
Ergebnis in §8: gegen GNU Go −6,3 Punkte (p = 0,42), im Selbstspiel 58,1 %
(p = 0,002). Default bleibt 0. Der Schalter rettet kritische Gruppen direkt
nach dem Zug öfter (43 % statt 26 %), zehn Züge später sind sie aber fast
genauso oft tot (51 % statt 53 %). Eine taktische Rettung schafft keine
Augen. Der Posten „eigene Steine sterben“ bleibt unverändert.
