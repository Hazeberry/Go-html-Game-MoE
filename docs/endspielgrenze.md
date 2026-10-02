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
