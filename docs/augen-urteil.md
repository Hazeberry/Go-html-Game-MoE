# Augen zählen: Erkennt die Engine die gefährdeten Gruppen?

**Stand: 11.10.2026.** Diagnose, keine Messung. Alle Zahlen sind
nachträglich an vorhandenen Partien erhoben. Ergebnis: Ein Schalter, der
Augen zählt, hätte nichts, woran er ansetzen könnte. Gebaut wurde keiner.

---

## 1. Anlass

Die Krisenkarte der Engine (`buildCrisisMap`) und die Stellungsbewertung
sehen nur Freiheiten: eine Freiheit, zwei ab vier Steinen, drei ab acht.
Die Engine kann aber auch Augen zählen. `findEyes` findet echte Augen einer
Kette, mit Diagonalprüfung gegen falsche Augen, und `bensonClassify`
beweist bedingungsloses Leben. Beide werden nur in der Anzeige und im
Augenbonus von `evalTsumego` benutzt.

In [`punktverlust.md`](punktverlust.md) §5–6 rettet die KI kritische
Gruppen in 33 % der Fälle, GNU Go in 89 %. Die Krisenkarte erfasst nur 21 %
der nicht geretteten Gruppen. Die Frage war: Sagen Augen GNU Gos Urteil
über eine Gruppe besser voraus als Freiheiten? Und gäbe es für einen
Schalter auf dieser Grundlage etwas zu holen?

**Daten:** dieselben 120 ausgespielten Partien der beiden Default-Arme wie
in [`punktverlust.md`](punktverlust.md) (Seed 151 und 161, GNU Go Stufe 1
gibt nicht auf, neun Vorgabesteine für die KI, 120 Simulationen).

## 2. Werkzeug

`auswertung/augen-urteil.js` hält alle 20 Züge von Zug 100 bis 220 an.
Für jede Gruppe ab drei Steinen fragt es GNU Go nach ihrem Status
(`dragon_status`: alive, critical, dead) und nach GNU Gos eigener
Augenzahl (`dragon_data`, `genus`). Gruppe heißt hier wie in `kritisch.js`
ein Drache von GNU Go: Ketten, die GNU Go als verbunden ansieht. Auf dem
eigenen Brett rechnet die Engine dazu:
- Freiheiten der schwächsten Kette,
- echte Augen aller Ketten (`findEyes`),
- Augenräume: kleine leere Gebiete ohne gegnerischen Nachbarn,
- Benson,
- ob Krisenkarte oder taktischer Leser die Gruppe markieren.

An der nächsten Marke wird für jeden Stein gezählt, ob er noch lebt.

**Korrektur während der Auswertung:** Zuerst bestimmte ein einzelner Stein
der Gruppe ihr Schicksal. So schien es, als stürben vor allem große Gruppen
mit zwei sicheren Augen (7,2 Steine je Partie). Je Stein gezählt, stirbt
dort meist nur ein abgeschnittener Teil, und der Rest lebt weiter. Alle
Zahlen unten zählen je Stein.

## 3. Augen beschreiben den Status – im Nachhinein

In jeder Stellung an den Marken stehen im Schnitt rund 5 Gruppen der KI ab
drei Steinen. Ein Drittel davon hält GNU Go für tot.

| Gruppen der KI (4361) | Anzahl | lebt | kritisch | tot |
|---|---:|---:|---:|---:|
| schwächste Kette 1 Freiheit | 370 | 0 % | 4 % | 96 % |
| 2 Freiheiten | 2199 | 67 % | 4 % | 29 % |
| 3 Freiheiten | 1434 | 72 % | 2 % | 26 % |
| 4–5 Freiheiten | 328 | 71 % | 2 % | 27 % |
| 2+ echte Augen (Engine) oder Benson | 1263 | **97 %** | 1 % | 2 % |
| 1 echtes Auge | 732 | 69 % | 2 % | 29 % |
| 0 Augen, mit Augenraum | 231 | 11 % | 10 % | 79 % |
| 0 Augen, ohne Augenraum | 2135 | **47 %** | 4 % | 49 % |

Ab zwei Freiheiten trennen Freiheiten kaum noch. Augen trennen deutlich.

**Die Engine zählt Augen brauchbar.** Wo sie zwei oder mehr Augen findet,
gibt GNU Go der Gruppe in 72 % zwei sichere Augen und in weiteren 12 % zwei
Augen, wenn sie zuerst zieht. Wo sie keines findet, sieht auch GNU Go in
93 % keines.

**Aber der Zusammenhang ist vor allem ein Rückblick.** Tote Gruppen liegen
im Gebiet des Gegners und haben deshalb keinen Augenraum. Dass sie keine
Augen haben, sagt nichts darüber, ob eine lebende Gruppe als nächste
stirbt. Die augenlosen Gruppen von GNU Go leben zu 87 %. Sie sind mit
anderen verbunden oder können ins Freie laufen.

## 4. Lebende Gruppen: Augen sagen ihr Schicksal kaum voraus

Wie viele Steine lebender Gruppen der KI sind 20 Züge später tot oder
geschlagen? Die sechs Abschnitte von Zug 100 bis 220 sind zusammengezählt;
„je Partie“ heißt also Zug 100–220.

| lebt an der Marke, Augen nach der Engine | Gruppen je Marke | Anteil ihrer Steine, die sterben | sterbende Steine je Partie |
|---|---:|---:|---:|
| 2+ echte Augen oder Benson | 1,4 | 2,3 % | 5,2 |
| 1 echtes Auge | 0,7 | 6,0 % | 2,8 |
| 0 Augen, mit Augenraum | 0,03 | 14,7 % | 0,3 |
| 0 Augen, ohne Augenraum | 1,4 | 6,9 % | 3,4 |
| **alle** | 3,5 | 3,6 % | **11,7** |

Augenlose Gruppen verlieren dreimal so viele Steine wie Gruppen mit zwei
Augen. Absolut sind es aber 3,4 Steine in 120 Zügen, verteilt auf
durchschnittlich 1,4 augenlose lebende Gruppen je Stellung, von denen 93 %
der Steine ohnehin überleben. Auch GNU Gos eigene Augenzahl trennt nicht
besser: Ohne Auge (genus 0) sterben 6,5 % der Steine, mit zwei sicheren
Augen 2,6 %. Zum Vergleich: Lebende Gruppen von GNU Go verlieren 0,4 %
ihrer Steine.

Gruppen, die an einer Marke schon kritisch sind, gibt es selten: 1,0 je
Partie über die sechs Marken, mit zusammen 4,8 Steinen. Von diesen Steinen sind 20 Züge
später 4,2 tot.

## 5. Wie lebende Gruppen sterben

`auswertung/augen-tod.js` spielt für jede lebende Gruppe, die bis zur
nächsten Marke mindestens drei Steine verliert, die Züge dazwischen nach.
Nach jedem Zug fragt es GNU Go nach dem Status. Zur Kontrolle dient jede
zehnte lebende Gruppe, die keinen Stein verliert.

| je Gruppe | verliert ≥ 3 Steine (191) | Kontrolle (208) |
|---|---:|---:|
| Steine / Ketten Ø | 18,7 / 8,9 | 13,7 / 6,8 |
| kippt: mindestens 3 Steine (bei kleinen Gruppen die Hälfte) leben nicht mehr | 100 %, nach Ø 7,0 Zügen | 8 %, vorübergehend |
| … durch einen Zug von GNU Go | 98 % | 100 % |
| … die stehenden Steine gehören danach zu 2+ Drachen | 69 % | 82 % der gekippten |
| Züge von GNU Go in den Augenraum der Gruppe | 0,1 | 0,0 |
| Züge der KI in den eigenen Augenraum / auf ein eigenes Auge | 0,1 / 0,0 | 0,1 / 0,0 |
| Züge von GNU Go nah an der Gruppe (Abstand ≤ 2) | 2,5 | 1,9 |
| KI antwortet direkt darauf nah | **40 %** | **54 %** |
| … bei Gruppen ohne Auge | 27 % | 53 % |

Gezählt wird bis zum Kippen, in der Kontrolle über alle 20 Züge. Die
Antwortquote der Kontrolle hängt von der Auswahl ab: Mit einer anderen
Auswahl jeder zehnten Gruppe (das Werkzeug in vier Teilläufen) lag sie bei
63 %. Die Züge einer Gruppe hängen zusammen, die Stichprobe ist kleiner,
als die Zahl der Züge vermuten lässt.

Die Gruppen verlieren keine Augen, die sie schon hatten. GNU Go spielt fast
nie in ihre geschlossenen Augenräume, und die KI füllt keine eigenen Augen.
Den Ausschlag gibt fast immer ein Zug von GNU Go, und meistens wird die Gruppe
dabei geteilt: Ein Teil stirbt, der Rest lebt weiter. Vorher spielt GNU Go
nah an der Gruppe, und die KI antwortet darauf seltener nah als bei
Gruppen, die überleben. Das ist ein Zusammenhang, kein Nachweis der
Ursache: Wie dringend eine Antwort ist, hängt davon ab, was GNU Gos Zug
droht.

## 6. Welche Regel fände die kritischen Gruppen?

Ein Schalter müsste Gruppen finden, die noch zu retten sind, also kritische.
Je Stellung markieren die Regeln so viele Gruppen der KI:

| Regel | Gruppen je Stellung | davon lebt / kritisch / tot | erfasst von 139 kritischen |
|---|---:|---:|---:|
| Krisenkarte | 0,77 | 9 % / 7 % / 84 % | 32 % |
| Leser | 1,21 | 2 % / 7 % / 91 % | 54 % |
| Krisenkarte oder Leser | 1,32 | 6 % / 8 % / 86 % | 61 % |
| kein Auge, höchstens ein Augenraum | 2,78 | 44 % / **5 %** / 51 % | **78 %** |
| höchstens ein echtes Auge | 3,69 | 49 % / 4 % / 46 % | 93 % |

Die Augenregel findet drei von vier kritischen Gruppen. Von den Gruppen,
die sie markiert, ist aber nur jede zwanzigste kritisch. Die übrigen leben
ohnehin (44 %) oder sind schon tot (51 %). Ein Bonus auf diese Gruppen
schickte die KI also meist zu toten Steinen, genau zu den verschenkten
Zügen, die `leseVerzicht` abgestellt hat. Oder zu Gruppen, die nichts
brauchen.

## 7. Was daraus folgt

- **Kein Schalter für Augen.** Die Engine zählt Augen brauchbar, aber keine
  Regel aus Augen trennt rettbare von lebenden und toten Gruppen. Die
  Obergrenze ist klein: Würde jede augenlose lebende Gruppe ohne Kosten
  gerettet, wären das 3,4 Steine in 120 Zügen, höchstens rund 7 Punkte.
  Die Messung gegen GNU Go mit 60 Paaren erkennt erst etwa 25 Punkte
  sicher; ihr Standardfehler liegt bei rund 8 Punkten (Streuung der
  Paardifferenzen 60,8 in [`laufkampf-lesen.md`](laufkampf-lesen.md) §8).
- **Gruppen sterben in wenigen Zügen nach einem Angriff.** Eine lebende
  Gruppe kippt im Schnitt sieben Züge nach der Marke, fast immer durch
  einen Zug von GNU Go, und meist stirbt nur ein abgetrennter Teil. Auf
  GNU Gos Züge nah an der Gruppe antwortet die KI vorher seltener nah. Wenn
  hier ein Hebel liegt, dann in der Antwort auf Annäherung und Schnitt. Der
  nächste billige Schritt wäre eine Diagnose wie in `kritisch-rang.js`:
  Steht nach GNU Gos Zug die Antwort, die GNU Go selbst spielen würde,
  unter den Kandidaten der Suche?
- **Der größte Posten bleibt Gebiet.** Rund 85 der 95 Punkte zwischen Zug
  100 und 200 gehen über Gebiet verloren, nur rund 20 über sterbende Steine
  ([`punktverlust.md`](punktverlust.md) §3).

## 8. Nachvollziehen

Die Rohdumps entstehen neu mit den Befehlen in
[`gebiet-freiheit.md`](gebiet-freiheit.md) §7 und
[`atari-verschenkt.md`](atari-verschenkt.md) §5 (je Arm A, vier
Teilläufe). Dann:

```
node auswertung/augen-urteil.js <dumps> --aus urteil.jsonl
node auswertung/augen-urteil.js --bericht urteil.jsonl
node auswertung/augen-tod.js --urteil urteil.jsonl --dumps <dumps> --aus tod.jsonl
node auswertung/augen-tod.js --bericht tod.jsonl
```

`augen-urteil.js` braucht rund 1 s je Partie, `augen-tod.js` rund 1 s je
Fall. Die Tabellen in §3, §4 und §6 stehen im Bericht von
`augen-urteil.js` unter A, C und D, die Gegenüberstellung mit GNU Gos
`genus` unter B.
