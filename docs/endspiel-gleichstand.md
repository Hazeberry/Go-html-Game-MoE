# Endspiel-Gleichstand `endTieBreak`: vorab festgelegte Messung

**Status: festgelegt am 03.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–6 werden nicht mehr geändert.

---

## 1. Anlass

[`wurzel-gleichstand.md`](wurzel-gleichstand.md): Im Endspiel gibt
`evalEndgame` jedem ruhigen Zug in offenem Gelände denselben Wert,
`endAreaGain` × ein Feld = 30. Den Grund liefert `estimateArea`, das nur
umschlossene Regionen zählt. Welche dieser Züge auf die 16 Wurzelplätze
kommen, entscheidet das Rauschen per Los: im Mittel 13 der 16 Plätze.

[`endspielgrenze.md`](endspielgrenze.md) hat versucht, den Endspiel-Experten
später einzusetzen, und dabei klar verloren (31,4 %). Das Los wird damit
nicht kleiner, es verschiebt sich nur. Dieser Versuch geht den anderen Weg:
Der Experte bleibt, wo er ist, aber die gleich bewerteten Züge werden
geordnet statt gelost.

**Eine echte Partie** (Bug-Report vom 03.10., Mensch gegen Hard-KI als Weiß,
243 Züge) zeigt dasselbe. Der Spieler schrieb: „Ich habe das Gefühl, die KI
ignoriert mich. Reagiert nur, wenn ich sie angreife." Nachgespielt und
rauschfrei bewertet: Von Zug 88 bis 122 stammen alle 18 weißen Züge aus der
Gleichstandsgruppe, die zwischen 143 und 169 gleich bewertete Züge umfasst.
Kein einziger Zug lag darüber. Über alle weißen Züge ab Zug 61 stammen 36
von 91 aus der Gruppe. Die 15 Züge, die höchstens 3 Felder neben dem
letzten schwarzen Zug lagen, waren bis auf einen höher bewertet als die
Gruppe — Antworten auf eine Drohung, nicht auf einen Plan.

## 2. Was der Parameter tut

`endTieBreak` (Default 0) addiert in `evalEndgame` vor dem Rauschen

    endTieBreak × clamp(Δ / 20, −1, 1)

Δ ist die Änderung der Bouzy-Bilanz durch den Zug, aus Sicht des Ziehenden,
gemessen gegen die Wurzelstellung. Die Bilanz zählt die Felder der eigenen
Einflusszone minus die der gegnerischen; es ist dieselbe Karte wie bei
`influenceInvade`, nur in eigenen Puffern. Die Wurzelbilanz wird einmal pro
Zug in `getAIMove` berechnet (`primeEndTieBreak`), die Bilanz nach dem Zug
einmal pro Kandidat. Beides geschieht nur an der Wurzel und im Pass-Check,
nie in der Simulation.

Bei 1 bleibt der Term im Band ±1. Das Rauschen des Experten ist 0 … 0,5 und
bleibt erhalten; es mischt also weiter innerhalb von rund 10 Einheiten Δ.

**Vorab gemessen** (`replik-ab`, 40 Partien, jede 10. Stellung, rauschfrei,
`auswertung/wurzel-gleichstand.js` mit `endTieBreak` 0 und 1):

| | ohne | mit Brecher |
|---|---|---|
| Paare verschieden bewerteter Züge, deren Reihenfolge kippt | — | 0 von 1 014 325 |
| Gleichstandsgruppe an Platz 16, Median (Endspiel-Experte ≥ 0,5) | 59 | 22 |
| gelöste Wurzelplätze, Mittel (ebenso, 1 051 Stellungen) | 13,2 | 7,3 |

Der Brecher ordnet also nur innerhalb von Gleichständen. Die Gruppe wird
nicht ganz aufgelöst, weil Δ ganzzahlig ist. Die meisten Züge haben Δ = 1
(nur der Stein selbst), und unter ihnen bleibt das Los. Das ist gewollt: Für
diese Züge hat die Karte keine Information.

In der Partie aus dem Bug-Report steigt der Anteil der Wurzelkandidaten von
Weiß (Zug 88–122), die höchstens 2 Felder neben einem schwarzen Stein
liegen, von 57 % auf 83 %. Die Liste wandert in die schwarzen Rahmen.

**Kosten:** eine Bouzy-Karte pro Kandidat, gemessen 40 ms je
Wurzelbewertung bei 276 Kandidaten (ohne: 3 ms). Im Lauf unten zählt das
nicht, weil `mctsFixedSims` die Suche fest hält. Im Spiel mit Zeitbudget
fehlt die Zeit der Suche. Vor einer Default-Änderung müsste das deshalb
billiger werden oder gesondert gemessen werden.

## 3. Arme und Lauf

| Arm | Parameter |
|---|---|
| A | Default (`endTieBreak = 0`) |
| B | `endTieBreak = 1` |

360 Partien als vier unabhängige Läufe zu je 90, parallel (vier Kerne):

```bash
for s in 20261006 20261007 20261008 20261009; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 \
    --B mctsFixedSims=120,endTieBreak=1 \
    --roh gleichstand-$s.jsonl --json gleichstand-$s.json &
done
```

Commit: der Merge dieser Festlegung. Kein Pilot: Der Parameter wirkt
nachweislich (§2), und die Dosis ist durch die Bedingung „nur Gleichstände
brechen" festgelegt, nicht gesucht.

## 4. Endpunkte

**Primär:** Siegrate von B über alle 360 Partien, zweiseitig gegen 50 %,
α = 0,05, Normalapproximation. Kleinster nachweisbarer Effekt bei 80 % Power:
±7,4 Prozentpunkte.

| Ergebnis | Lesart |
|---|---|
| B > 50 %, p < 0,05 | B spielt stärker — als Erstlauf eine Hypothese; vor einer Default-Änderung zu wiederholen |
| p ≥ 0,05 | kein Stärkeeffekt in dieser Größe nachweisbar |
| B < 50 %, p < 0,05 | B spielt schwächer |

**Wirksamkeitsnachweis (ohne Test):** der Anteil der gespielten Züge, die
aus der gelosten Gleichstandsgruppe an Platz 16 stammen, je Arm. Gemessen
wird an jeder 5. Stellung aller 360 Partien, jede Stellung mit den
Parametern des Arms, der am Zug war:

```bash
cat gleichstand-2026100?.jsonl > gleichstand.jsonl
node auswertung/wurzel-gleichstand.js gleichstand.jsonl --partien 360 --abstand 5 \
  --A endTieBreak=0 --B endTieBreak=1
```

Erwartet: bei B niedriger als bei A. Liegt er gleich, hat der Brecher das
Los nicht verringert, und ein Nullergebnis der Siegrate sagt über die Frage
nichts.

**Sekundär, ohne Anspruch:**

- Siegrate ohne falsche Aufgaben ([`aufgaben.md`](aufgaben.md)): jede
  Aufgabe weitergespielt, je Teillauf
  `node auswertung/weiterspielen.js gleichstand-<seed>.jsonl --A mctsFixedSims=120 --B mctsFixedSims=120,endTieBreak=1`.
  Weicht sie um mehr als 3 Prozentpunkte von der gemessenen ab, wird sie
  neben der primären berichtet. Die primäre Lesart ändert das nicht.
- Aufgaben je Arm, Partielänge.

## 5. Was nicht gemessen wird

- Spielstärke gegen Menschen. Der Anlass ist ein Eindruck aus einer
  einzelnen Partie; ob die KI dadurch „aufmerksamer" wirkt, misst kein
  Selbstspiel.
- Die Kosten im Zeitbudget (§2).
- Andere Dosen. Über 1 hinaus würde der Term verschiedene Werte umordnen;
  das wäre eine andere Frage.

## 6. Reproduktion

Die Läufe schreiben Rohdumps mit `params_hash`, `final_board_hash` und
`zufall`. Abgebrochene Teilläufe werden mit `--fortsetzen` weitergeführt
(README, „Lauf fortsetzen"). Die Hash-Listen kommen wie bei den früheren
Läufen nach [`daten/`](daten/).
