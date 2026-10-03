# Endspielgrenze `endgameMoves`: vorab festgelegte Messung

**Status: festgelegt am 01.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–6 werden nicht mehr geändert.

---

## 1. Anlass

[`wurzel-gleichstand.md`](wurzel-gleichstand.md): Ab Zug 80 bewertet allein
der Endspiel-Experte. Er sieht kein offenes Gebiet und gibt jedem ruhigen
Zug in offenem Gelände denselben Wert, `endAreaGain` × ein Feld = 30. Dort
werden im Mittel 13 der 16 Wurzelplätze gelost, und 37 % der gespielten
Endspielzüge stammen aus der gelosten Gruppe. In Eröffnung und Mittelspiel
ist es kein einziger.

Partien der Engine gegen sich selbst dauern im Mittel rund 320 Züge (Piloten
in `einflusskarte.md`: Ø 312 und 320). Zug 80
ist für „Endspiel" früh. `endgameMoves` steht seit jeher auf 80 und wurde
nie gemessen — das README führt es nur als Phasengrenze.

## 2. Was der Parameter tut

`phaseWeights` mischt die Experten über `endgameMoves` (mit `phaseBlendWidth`
= 8 Zügen Übergang) **oder** `endgameEmpty` = 50: das Endspiel beginnt, wenn
eine der beiden Grenzen fällt. `endgameEmpty` bleibt unverändert; spät in
der Partie, wenn weniger als 50 Kandidaten übrig sind, bewertet also weiter
der Endspiel-Experte. Die zweite Verwendung von `endgameMoves` in
`getAIMove` liegt im alten Kandidatenpfad (`useMCTS = 0`) und wird im MCTS-
Betrieb nicht erreicht.

Mit 150 bewertet zwischen Zug 80 und 150 der Mittelspiel-Experte. Der hat
einen bekannten Fehler: er spielt zu oft am Rand (README, „Randspiel im
Mittelspiel"; `midLineWeight` = 80 mildert das). Ob der Tausch hilft, ist
damit offen — auch Schaden ist eine mögliche Antwort.

## 3. Arme und Lauf

| Arm | Parameter |
|---|---|
| A | Default (`endgameMoves = 80`) |
| B | `endgameMoves = 150` |

```bash
node ab-harness.js --games 360 --seed 20261005 \
  --A mctsFixedSims=120 \
  --B mctsFixedSims=120,endgameMoves=150 \
  --roh endspiel-150.jsonl --json endspiel-150.json
```

Commit: der Merge dieser Festlegung. Kein Pilot: der Parameter existiert,
wirkt nachweislich (§4) und ändert keinen Code.

## 4. Endpunkte

**Primär:** Siegrate von B, zweiseitig gegen 50 %, α = 0,05,
Normalapproximation. Kleinster nachweisbarer Effekt bei 80 % Power:
±7,4 Prozentpunkte.

| Ergebnis | Lesart |
|---|---|
| B > 50 %, p < 0,05 | B spielt stärker — als Erstlauf eine Hypothese; vor einer Default-Änderung zu wiederholen |
| p ≥ 0,05 | kein Stärkeeffekt in dieser Größe nachweisbar |
| B < 50 %, p < 0,05 | B spielt schwächer |

**Wirksamkeitsnachweis (vorab festgelegt, ohne Test):** Anteil der
gespielten Züge, die aus der gelosten Gleichstandsgruppe an Platz 16
stammen, je Arm — jede 5. Stellung aller 360 Partien, jede Stellung mit den
Parametern des Arms bewertet, der am Zug war:

```bash
node auswertung/wurzel-gleichstand.js endspiel-150.jsonl --partien 360 --abstand 5 \
  --A endgameMoves=80 --B endgameMoves=150
```

Erwartet: bei B niedriger als bei A. Liegt er gleich, hat der Tausch das Los
nicht verringert, und ein Nullergebnis der Siegrate sagt über die Frage aus
`wurzel-gleichstand.md` nichts.

**Sekundär, ohne Anspruch:** Aufgaben je Arm, Partielänge.

## 5. Zum Zeitpunkt

Der Lauf startet, während drei andere laufen (Kontrolllauf und Wiederholung
aus `pilot-benson-defense.md` §14, Hauptreihe aus `einflusskarte.md`).
Zulässig, weil `mctsFixedSims` die Partien von der CPU-Last unabhängig macht.
Ein Lauf, den der Ausführungsrahmen abbricht, wird mit identischem Befehl neu
gestartet; die Partien sind dann dieselben.

## 6. Was dieser Plan nicht beantwortet

- Andere Werte als 150, und ob `endgameEmpty` mitgezogen werden sollte.
- Ob ein Endspiel-Experte, der offenes Gebiet sieht, die bessere Antwort wäre
  als ein späterer Wechsel.
- Ob B im Browser mit Zeitbudget anders spielt. Ob der Mittelspiel-Experte
  teurer rechnet als der Endspiel-Experte, ist hier nicht gemessen; mit
  fester Simulationszahl spielt das für den Lauf keine Rolle.

---

# Nachtrag vom 02.10.2026: Ergebnis

## 7. Ergebnis

360 Partien nach §3, `index.html` aus `cdd9e48`, Harness aus `b42349c`
(dieser Stand fügt nur das Feld `zufall` und `--fortsetzen` hinzu). Hash-Liste:
`docs/daten/endspiel-150.json`.

```
Siegrate B (endgameMoves = 150): 113 von 360 = 31,4 %   z = −7,06   p < 0,0001
Aufgaben A / B: 78 / 153                                Partielänge Ø 323 Züge

Wirksamkeitsnachweis (jede 5. Stellung, je Arm mit eigenen Parametern bewertet)
          Stellungen   Endspiel-Experte   Losplätze Ø   gespielter Zug aus dem Los
  A         11 531         76,6 %            11,2              26,9 %
  B         11 494         54,6 %             8,8              16,7 %
```

**B spielt schwächer** — nach der Tabelle in §4 die dritte Lesart, und mit
z = −7,06 eindeutig. Der Mechanismus hat dabei gewirkt wie erwartet: der
Anteil der Züge, die nur per Los in die Suche kamen, fällt von 26,9 % auf
16,7 %. Weniger Los hilft also nicht, wenn das, was es ersetzt, schlechter
bewertet. Naheliegende Deutung, nicht geprüft: Zwischen Zug 80 und 150
bewertet bei B der Mittelspiel-Experte mit seinem bekannten Hang zum Rand
(§2), und das kostet mehr, als das Los im Endspiel-Experten kostet. Auffällig
ist auch hier die Zahl der Aufgaben (153 gegen 78).

**`endgameMoves` bleibt 80** — jetzt gemessen statt gesetzt. Für die Frage
aus `wurzel-gleichstand.md` heißt das: der Hebel ist nicht die Phasengrenze,
sondern ein Endspiel-Experte, der offenes Gebiet sieht (§6, zweiter Punkt).

## 8. Zur Reproduzierbarkeit dieses Laufs

Dieser Lauf wurde nach Partie 45 unterbrochen und mit `--fortsetzen` zu Ende
gespielt. Ein früherer, ununterbrochener Lauf desselben Befehls (vom
Ausführungsrahmen nach 285 Partien abgebrochen) stimmt mit ihm in den
Partien 1 bis 150 überein, ab Partie 151 nicht mehr. Eingegrenzt:

```
Prozess beginnt bei Partie   1 (frisch, ununterbrochen, Wiederholung):  Partie 151 wie der alte ununterbrochene Lauf
Prozess beginnt bei Partie  46, 101, 141 (fortgesetzt):                 Partie 151 untereinander gleich, anders als oben
erste Abweichung: Partie 151, Zug 198, Arm B — derselbe Zug, Q −0,66 gegen −0,67, beide 120 Simulationen
```

Ein Prozess, der seit Partie 1 läuft, sucht in Partie 151 also numerisch
minimal anders als einer, der später eingesetzt hat. Ausgeschlossen sind:
der Zufallsstrom (beide Ströme werden gesetzt, die Prozesse ab 46, 101 und 141
stimmen überein), der Überlauf des Epochenzählers (an 48 Stellen in den
Partien 1 und 151 erzwungen, nie eine Abweichung), Fristen und Uhr (mit
`mctsFixedSims` stehen alle Fristen der Suche auf unendlich) und die
gemeinsame leere Hash-Menge der Rollouts (wird nie beschrieben). Die Ursache
ist nicht gefunden.

Für das Ergebnis spielt das keine Rolle: in den ersten 285 Partien gewinnt B
im ununterbrochenen Lauf 30,9 %, im fortgesetzten 28,8 %. Für die Behauptung
„derselbe Befehl, dieselben Partien" heißt es: sie gilt für ununterbrochene
Läufe, und fortgesetzte stimmen meist mit ihnen überein — der Kontrolllauf in
`pilot-benson-defense.md` §15.2, selbst nach Partie 41 fortgesetzt, ergab
jede Kennzahl der Septemberserie auf die letzte Stelle. Bitgleich garantiert
ist ein fortgesetzter Lauf aber nur mit derselben Unterbrechung.

---

## 9. Nachtrag: Ursache der Abweichung gefunden und behoben (03.10.2026)

**Ursache.** `evaluateBoard` markierte gezählte Gruppen in `_evalBoardSeen`
mit einer Epoche aus `_nextFfEpoch` und holte sich in der Gruppenschleife je
Gruppe eine weitere Epoche aus demselben Zähler, für die Freiheiten. Der
Zähler wächst über Partien hinweg und läuft im Harness etwa alle neun
Partien über. Beim Überlauf nullt er seine Markierungsfelder, damals auch
`_evalBoardSeen`. Fiel der Überlauf in die Gruppenschleife, waren die
Gesehen-Marken aller schon gezählten Gruppen weg. Jede dieser Gruppen, die
einen Stein hinter der aktuellen Brettposition hatte, wurde ein zweites Mal
gezählt. Ob das passierte, hing nur am Zählerstand seit Prozessstart.

**Nachweis**, alles auf dem Stand dieses Laufs (Harness `b42349c`,
`index.html` aus `cdd9e48`):

1. **Zustandsvergleich.** Zwei Prozesse, einer ab Partie 1, einer mit
   `--fortsetzen` ab Partie 141. Vor Partie 151 wurde der vollständige
   Modulzustand der Engine verglichen: alle Variablen auf Modulebene, die
   Parameter, das Netz und der Zufallsstrom. Verschieden waren nur die drei
   Epochenzähler mit ihren Markierungsfeldern (und `_lastMsPerSim`, das der
   Harness vor jedem Zug ohnehin je Farbe setzt). Im Prozess ab Partie 1
   stand `_ffEpoch` bei 2 025 582 498, nur 122 Millionen unter dem Überlauf
   bei 2^31 − 1.
2. **Übertragung.** Der fortgesetzte Prozess bekam vor Partie 151 genau
   diesen Zählerstand samt seinen Markierungsfeldern. Der Überlauf fiel dann
   in `evaluateBoard`, bei der 29. Gruppe einer Bewertung. Partie 151 kam
   Zug für Zug so heraus wie im Prozess ab Partie 1.
3. **Korrektur.** Derselbe übernommene Zählerstand, aber mit eigenem
   Zähler für `_evalBoardSeen`: Partie 151 kam so heraus wie in den
   fortgesetzten Prozessen.

Der frühere Versuch, Überläufe an 48 Stellen zu erzwingen (§8), hatte
keinen davon in die Gruppenschleife gelegt.

**Behoben:** `_evalBoardSeen` hat einen eigenen Zähler
(`_nextEvalSeenEpoch`). Dessen Überlauf kann nur am Anfang einer Bewertung
fallen, vor jeder Marke. Der neue Test `tests/epochen.js` legt den Überlauf
von `_nextFfEpoch` nacheinander auf jeden der ersten 120 Aufrufe in
`evaluateBoard` und verlangt jedes Mal denselben Wert. Gegen den alten Code
scheitert er (−41 statt −70).

**Folgen.**

- Falsch war höchstens eine Blattbewertung je Überlauf, und auch das nur,
  wenn der Überlauf in die Gruppenschleife fiel. Im Prozess ab Partie 1
  (unverändert, nur protokolliert) lagen die ersten 16 Überläufe außerhalb,
  der 17. fiel in Partie 151 in die Schleife, bei der 29. Gruppe.
  Beide Arme waren gleich betroffen, also verzerrt das keinen der
  A/B-Vergleiche. Es machte nur die Läufe von der Prozessgeschichte
  abhängig.
- Im Browser lebt der Worker über viele Züge; dort lief der Zähler nach
  grob 300 bis 350 Zügen auf Schwer über. Auch dort war jeweils eine
  Bewertung betroffen.
- Ab diesem Commit sind ununterbrochene und fortgesetzte Läufe gleich.
  Hash-Listen älterer Läufe gelten für deren Commits.
