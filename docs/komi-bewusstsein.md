# Komi-Bewusstsein der Engine: zuerst die Kalibrierung

Vorab festgelegt am 31.10.2026 für die k-Schätzung; die späteren Stufen sind
hier nur als Plan genannt und bekommen eigene Vorabfestlegungen. Hazeberry hat
die Reihenfolge so beauftragt: erst das Diagnosewerkzeug korrigieren und
prüfen, danach entscheiden, ob die Daten einen Komi-Arm tragen. Ein
erfolgloser Kalibrierungsversuch ist ein brauchbares Ergebnis.

## 1. Anlass

Die Engine ist komi-blind: `evaluateBoard`, die Rollouts und die Aufgabe kennen
das Komi von 7,5 nicht. Folge: Schwarz hält sich bei einem Vorsprung von 3
Punkten für gewonnen und verliert; Weiß gibt zu früh auf, Schwarz zu spät
(Kommentar an `resignAreaMargin`). Als Weiß gewinnt die KI gegen Fuego viel
öfter als als Schwarz ([`muster-fuego-siege.md`](muster-fuego-siege.md) §10).

## 2. Plan in Stufen

1. **k-Schätzung** (dieses Dokument, §3): Wie viele Einheiten von
   `evaluateBoard` entsprechen einem Punkt? Daraus „Komi 7,5 ≙ k Einheiten“.
2. **Vorprobe der Passentscheidung** (eigene Vorabfestlegung): feste
   Endspielstellungen mit einem Rand von 0 bis 7,5 Punkten, geprüft wird die
   Passentscheidung, nicht nur die Suche.
3. **Messung** (eigene Vorabfestlegung): Komi-Arm gegen D, Aufgabe in beiden
   Armen aus (`resignEnabled=0`, ein Zähler belegt es), Fuego mit 50 Spielen je
   Zug, gepaarte Siegquote. Stichprobe vorab: Bei etwa 40 % ungleichen Paaren,
   alpha 0,05 zweiseitig und 80 % Power braucht ein Gewinn von 8 Prozentpunkten
   etwa 500 Paare, einer von 5 Prozentpunkten etwa 1 250. Kleinster
   interessanter Gewinn: **5 Prozentpunkte** (also rund 1 250 Paare). Alles
   erst, wenn Stufe 1 einen Komi-Arm trägt.

## 3. Stufe 1: k-Schätzung

**Daten:** Arm D ohne Vorgabe (Komi 7,5, Schwarz beginnt, kein Abbruch, Sieger
bekannt) aus den archivierten Läufen: Fuego und GNU Go aus
[`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) (Seed 226), GNU Go aus
[`leeres-brett.md`](leeres-brett.md) (Seed 222) und Fuego aus
[`muster-fuego-siege.md`](muster-fuego-siege.md) (Seed 228). Keine neuen
Partien.

**Rechnung** ([`k-schaetzung.js`](../auswertung/komi/k-schaetzung.js)): Die
Stellung nach **Zug 200, 240 und 280** wird nachgespielt, E = `evaluateBoard`
aus Sicht von Schwarz mit den Default-Parametern. Gegenstand ist der
komifreie Flächenstand d = Fläche Schwarz − Fläche Weiß aus der Zählung von
GNU Go. Je Zugzahl wird u (Einheiten je Punkt) geschätzt als SD(E) / SD(d),
das geometrische Mittel aus der Regression von d auf E und von E auf d (beide
sind durch Messfehler entgegengesetzt verzerrt). k = Komi 7,5 · u. Partien,
die kürzer als die Zugzahl sind, fehlen bei dieser Zugzahl; die Tabelle nennt
sie.

**Regel, vorab festgelegt:**

1. **k wird bei Zug 240 eingefroren**, gerundet auf eine ganze Zahl, **wenn**
   die k-Werte bei 200 und 280 höchstens 25 % von dem bei 240 abweichen.
2. **Die Daten tragen einen Komi-Arm** nur, wenn zusätzlich R² bei allen drei
   Zugzahlen mindestens 0,25 beträgt und das 95-%-Intervall von u (Bootstrap
   über Partien, 2 000 Ziehungen, fester Seed) bei allen drei Zugzahlen über 0
   liegt.
3. Sonst gilt: **die Daten tragen keinen Komi-Arm.** Das ist ein Ergebnis. Es
   gibt dann keinen Komi-Arm in Stufe 2 und 3; die nächste Frage wäre ein
   anderes Maß als `evaluateBoard`.
4. **Probe des Nachspielens:** Die Gefangenenzahlen am Ende des Nachspielens
   müssen bei jeder Partie mit `gefangen` des Datensatzes übereinstimmen.
   Sonst ist das Werkzeug fehlerhaft (Exit-Code 3, Lauf rot).

**Ehrliche Vorgeschichte:** Vor dieser Festlegung lief das Werkzeug als
Trockenlauf mit den Zugzahlen 120, 160 und 200 auf den 479 Partien von Fuego
aus Seed 226 (nur D, eine Datei): R² 0,12 bis 0,15, k von 24 bis 43, also
nicht stabil. Daraufhin wurden die Zugzahlen auf 200, 240 und 280 verlegt (Weg
B: näher am Ergebnis). Dieselben Partien gehören zu den Daten von Stufe 1; die
Schwellen (25 %, R² 0,25, Intervall über 0) standen im Code, bevor 200/240/280
gerechnet wurden. Ein Trockenlauf mit 200/240/280 auf denselben 479 Partien
ergab R² 0,15 / 0,16 / 0,22 und k 43 / 61 / 80 (Abweichung 29 % und 30 %); das
heißt, nach der Regel trägt es voraussichtlich nicht. Den Lauf auf allen Daten
macht der Workflow in GitHub Actions.

## 4. Ablauf

[`komi-k.yml`](../.github/workflows/komi-k.yml), manuell, ohne Eingaben, ein
Job. Bericht im Job-Protokoll und als Artefakt. „Trägt nicht“ ist ein
Ergebnis, kein Fehler: der Lauf wird nur bei einem Fehler im Nachspielen (Exit-
Code 3) oder falschem Aufruf rot.
