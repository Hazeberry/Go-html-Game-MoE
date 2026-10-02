# Einflusskarte (Bouzy): vorab festgelegte Messung

**Status: festgelegt am 01.10.2026, vor dem ersten Lauf.** Was nach einem
Lauf hinzukommt, steht als Nachtrag darunter; die Abschnitte 1–7 werden
danach nicht mehr geändert. Dieselbe Regel wie in
[`pilot-benson-defense.md`](pilot-benson-defense.md).

Auswertung: [`auswertung/einfluss.js`](../auswertung/einfluss.js).

---

## 1. Anlass

`evaluateBoard` und die Zugexperten sehen kein Gebiet. `estimateArea` zählt
nur vollständig umschlossene Regionen und ist im Mittelspiel nicht
angeschlossen; ein Rahmen mit einer einzigen Lücke zählt dort nur noch seine
Steine (47 statt 169). Die Einflusskarte nach Bouzy (5 Dilatationen,
21 Erosionen) sieht ihn trotzdem — als Band um die Steine, nicht als
gefülltes Gebiet: 69 der 121 Innenfelder, dazu 115 Felder außerhalb.

Zwei Gewichte wirken in `evaluateMove`, vor dem Krisen-Blend:

| Parameter | Wirkung |
|---|---|
| `influenceInvade` | Bonus für Züge in der Zone des **Gegners** (Reduktion, Invasion) |
| `influenceOwn` | Abzug für Züge in der **eigenen** Zone (nicht das eigene Gebiet auffüllen) |

Default beider: 0. Dann wird die Karte nicht berechnet und kein Zweig
betreten; die Engine spielt bitgleich wie vorher.

## 2. Stand des Codes

Die erste Fassung (`b65715e`) ließ bei der Dilatation ein leeres Feld
zwischen beiden Farben in Richtung der Mehrheit wachsen (`pos − neg`). Bei
Bouzy bleibt es 0 — umstritten. An konstruierten Stellungen schleift die
Erosion das wieder weg; an echten Partiestellungen blieben 1 bis 3 Felder je
Stellung falsch zugeordnet, stets als Zone statt als neutral. Behoben, und
`tests/influence.js` vergleicht die Karte jetzt an fünf Stellungen der
mitgelieferten Partie Feld für Feld mit einer unabhängigen Nachrechnung.
Gemessen wird ausschließlich mit der behobenen Fassung.

## 3. Skala — woran sich die Dosis orientiert

Zugwerte von `evaluateMove` an der mitgelieferten Partie
(`tests/stellungen/laufkampf-211.sgf`), absteigend sortiert:

```
Zug     #1    #16    #40   Median
 20    215    191    161      143
 40    930    816    280      255
 80    995    965    963      153
120    610    610     30       30
160    610    610     30       30
200    610    610     60       30
```

Zwischen Rang 1 und Rang 16 liegen bis Zug 80 nur 24 bis 114 Punkte. Ab Zug
120 teilen sich mindestens 16 Kandidaten den Wert 610, dahinter fällt es auf
30 bis 60. Ein Gewicht von **50** sortiert also die vorderen Kandidaten um,
**150** stark; keines der beiden hebt ab Zug 120 einen Zug von unterhalb des
Plateaus hinein. Das sind die beiden Dosen des Piloten.

In Partien der Engine gegen sich selbst liegt die Grenze bei Platz 16 meist
mitten in einem Gleichstand. Gemessen an jeder 20. Stellung der ersten zehn
Partien des Kontrolllaufs aus `pilot-benson-defense.md` §14.1, ohne Rauschen
gerechnet: in 144 von 161 Stellungen reichen gleich bewertete Züge über
Platz 16 hinweg, im Median 58 Züge, am häufigsten beim Wert 30 — dem
Grundwert des Endspiel-Experten (`endAreaGain` × ein Feld, weil
`estimateArea` offenes Gebiet nicht sieht). Welche davon an die Wurzel
kommen, entscheidet heute das Rauschen. Jedes Gewicht über 0 entscheidet
diese Gleichstände stattdessen nach Zone; auch die kleine Dosis wirkt also
nicht nur am Rand.

## 4. Arme

| Arm | Parameter |
|---|---|
| A | Default (`influenceInvade = influenceOwn = 0`) |
| B(X) | `influenceInvade = X`, `influenceOwn = X` |

Beide mit `mctsFixedSims=120`, Standardmodus mit Farbwechsel. Beide Gewichte
laufen gemeinsam mit derselben Dosis: das hält den Versuch bei einem Regler.
Welcher der beiden Terme wirkt, beantwortet dieser Plan deshalb nicht.

## 5. Pilot

```bash
node ab-harness.js --games 40 --seed 20261002 \
  --A mctsFixedSims=120 \
  --B mctsFixedSims=120,influenceInvade=50,influenceOwn=50 \
  --roh einfluss-50.jsonl --json einfluss-50.json

node ab-harness.js --games 40 --seed 20261003 \
  --A mctsFixedSims=120 \
  --B mctsFixedSims=120,influenceInvade=150,influenceOwn=150 \
  --roh einfluss-150.jsonl --json einfluss-150.json
```

Der Pilot misst den **Mechanismus** (Anteil der Züge in Gegner- und eigener
Zone je Arm) und dient bei der Siegrate nur als Schadensprüfung. Eine
Stärkeaussage trifft er nicht.

**Dosiswahl, vorab festgelegt:** Die Hauptreihe läuft mit X = 150, wenn in
dessen Pilot

1. B mindestens 12 von 40 Partien gewinnt — weniger wäre bei einer
   gleichstarken Engine nur mit p = 0,003 zu erwarten — und
2. der gepoolte Anteil der Züge in der Gegnerzone bei B höher liegt als bei A.

Sonst mit X = 50 unter denselben zwei Bedingungen. Erfüllt keine Dosis
beide, entfällt die Hauptreihe und der Pilot wird als Ergebnis berichtet.

## 6. Hauptreihe

```bash
node ab-harness.js --games 360 --seed 20261004 \
  --A mctsFixedSims=120 \
  --B mctsFixedSims=120,influenceInvade=X,influenceOwn=X \
  --roh einfluss-haupt.jsonl --json einfluss-haupt.json
```

**Primär:** Siegrate von B, zweiseitig gegen 50 %, α = 0,05,
Normalapproximation. Kleinster nachweisbarer Effekt bei 80 % Power:
±7,4 Prozentpunkte.

| Ergebnis | Lesart |
|---|---|
| B > 50 %, p < 0,05 | B spielt stärker — als Erstlauf eine Hypothese; vor einer Default-Änderung zu wiederholen |
| p ≥ 0,05 | kein Stärkeeffekt in dieser Größe nachweisbar |
| B < 50 %, p < 0,05 | B spielt schwächer |

**Sekundär, ohne Anspruch:** Zonenanteile je Arm (gepaart je Partie),
Aufgaben, Partielänge.

## 7. Was dieser Plan nicht beantwortet

- Welcher der beiden Terme wirkt (§4).
- Andere Dosen als die gewählte, und ob 5/21 für diese Engine die richtigen
  Bouzy-Werte sind.
- Was der Term in der Browser-Partie mit Zeitbudget statt fester
  Simulationszahl kostet. Die Karte wird einmal je Zug an der Wurzel
  berechnet (rund 40 000 Schritte), nicht je Simulation.

---

# Nachtrag vom 01.10.2026: Pilot und Dosiswahl

Geschrieben nach dem Piloten und **vor** jedem Ergebnis der Hauptreihe.

## 8. Pilot

Beide Läufe nach §5, je 40 Partien, Commit `a34fe3f` (Merge von #79),
ausgewertet mit `auswertung/einfluss.js`:

```
                 Züge in der Gegnerzone   Züge in der eigenen Zone   Siege B           Aufgaben A / B
A gegen B(50)    5,1 % → 10,0 %           9,3 % → 6,6 %              18 von 40 (45 %)  14 / 22
A gegen B(150)   4,3 % → 10,4 %           9,0 % → 5,2 %              14 von 40 (35 %)   9 / 21

gepaart je Partie, B − A:
  B(50)    Gegnerzone +5,27 pp (t = 9,42)    eigene Zone −2,90 pp (t = −4,35)
  B(150)   Gegnerzone +6,57 pp (t = 10,56)   eigene Zone −3,87 pp (t = −7,48)
```

Der Mechanismus greift in beiden Dosen: der Anteil der Züge in der Zone des
Gegners verdoppelt sich, der in der eigenen Zone sinkt. Damit ist die
Methodik-Regel des README erfüllt — ein späteres Nullergebnis der Siegrate
wäre keines, bei dem der Parameter gar nicht wirkte.

Die Siegrate ist im Piloten nur Schadensprüfung. Bei 40 Partien liegt das
95 %-Band bei ±15,5 Prozentpunkten; 35 % (p = 0,058) und 45 % (p = 0,53)
sind beide damit vereinbar, dass B gleich stark spielt. Auffällig, aber nicht
geprüft: B gibt in beiden Piloten öfter auf (22 gegen 14, 21 gegen 9).

## 9. Dosiswahl nach §5

Für X = 150 sind beide Bedingungen erfüllt: B gewinnt 14 von 40 (Schwelle:
mindestens 12), und der Anteil der Züge in der Gegnerzone liegt bei B höher
(10,4 % gegen 4,3 %). **Die Hauptreihe läuft mit X = 150.**

Dass der Pilot bei 150 eher nach Schaden aussieht als bei 50, ändert die Wahl
nicht. Die Regel war vor den Daten festgelegt und sollte nur deutlichen
Schaden ausschließen; nach den Daten umzusteuern hieße, sie wertlos zu
machen. Spielt B(150) schwächer, zeigt das die Hauptreihe — auch das ist eine
Antwort.

## 10. Ausführung

Hauptreihe gestartet am 01.10.2026 um 20:18 UTC auf Commit `a34fe3f`, Befehl
aus §6 mit X = 150, Seed 20261004.

---

# Nachtrag vom 02.10.2026: Ergebnis der Hauptreihe

## 11. Ergebnis

360 Partien nach §6 mit X = 150, `index.html` aus `a34fe3f`, Harness aus
`b42349c` (nur das Feld `zufall` und `--fortsetzen` kamen hinzu). Der Lauf
wurde nach Partie 42 unterbrochen und mit `--fortsetzen` zu Ende gespielt;
die abgebrochenen Teilserien des ersten Harness stimmen in allen gemeinsamen
Partien überein (14/14, 271/271). Hash-Liste:
`docs/daten/einfluss-haupt-150.json`.

```
Siegrate B(150): 162 von 360 = 45,0 %   z = −1,90   p = 0,058   95 %-Band ±5,2 pp
Aufgaben A / B:  124 / 172              Partielänge Ø 323 Züge

Züge in der Gegnerzone    A 4,6 %  →  B 10,0 %   gepaart +5,62 pp   t = 33,7
Züge in der eigenen Zone  A 8,8 %  →  B 5,6 %    gepaart −3,34 pp   t = −20,9
```

**p ≥ 0,05: nach der Tabelle in §6 ist kein Stärkeeffekt in dieser Größe
nachweisbar.** Der Mechanismus greift dabei stark — der Anteil der Züge in
der Gegnerzone verdoppelt sich, der in der eigenen Zone sinkt um ein Drittel.
Am Parameter liegt das Nullergebnis also nicht.

Die Richtung zeigt zum Schaden, nicht zum Nutzen: 45,0 % hier, 35 % im
Piloten derselben Dosis. Das Konfidenzintervall der Hauptreihe reicht von
39,8 % bis 50,2 %; ein nennenswerter Vorteil für B ist damit ausgeschlossen, ein
Nachteil nicht belegt. Auffällig wie im Piloten: B gibt deutlich öfter auf
(172 gegen 124) — nicht vorab als Endpunkt festgelegt, deshalb nur
festgehalten.

**Defaults bleiben 0.** Wer die Karte wieder aufgreift, findet in
`wurzel-gleichstand.md` den Ort, an dem ein Tie-Break wirken müsste: die
Gleichstände beim Wert 30 im Endspiel-Experten. Die beiden Terme hier wirken
auf alle Kandidaten, nicht nur dort.
