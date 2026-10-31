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

## 5. Nachtrag: Ergebnis der Stufe 1 (31.10.2026)

Lauf 2 von [`komi-k.yml`](../.github/workflows/komi-k.yml) (Lauf 1 brach wegen
eines Fehlers im Workflow ab: GitHub startet Schritte mit `bash -e`, der
Exit-Code 1 des Werkzeugs beendete den Schritt; Korrektur in PR #228). Bericht:
[`docs/daten/komi-k/lauf2/bericht.md`](daten/komi-k/lauf2/bericht.md). Die Daten
sind Arm D ohne Vorgabe aus den vier archivierten Läufen: 2 399 Partien, davon
alle bei Zug 200, 2 391 bei Zug 240 und 2 257 bei Zug 280 (142 Partien kürzer).
Das Nachspielen ist richtig: Die Gefangenenzahlen stimmen bei 2 399 von 2 399
Partien.

| Zug | Stellungen | R² | u (Einheiten je Punkt) | 95 % von u | k = 7,5 · u |
|---:|---:|---:|---:|---|---:|
| 200 | 2 399 | 0,327 | 5,88 | 5,67 bis 6,10 | 44,1 |
| 240 | 2 391 | 0,309 | 7,62 | 7,34 bis 7,90 | 57,1 |
| 280 | 2 257 | 0,338 | 10,42 | 10,09 bis 10,76 | 78,1 |

**Nach der Regel aus §3:** R² liegt bei allen drei Zugzahlen über 0,25, und die
Intervalle von u liegen über 0. Verfehlt ist allein die Stabilität von k: Die
Werte bei 200 und 280 weichen um 22,8 % und 36,7 % vom Wert bei 240 ab,
erlaubt waren 25 %. Es wird **kein k eingefroren.**

**Ergebnis, nüchtern:** Diese Methode liefert auf diesen Daten keine tragfähige
Kalibrierung. Die Einheiten je Punkt wachsen mit der Zugzahl (u 5,9, 7,6, 10,4);
ein einzelnes k gibt es mit `evaluateBoard` nicht. Daraus folgt nicht, dass das
Komi wirkungslos ist, und nicht, dass ein anderer Bewerter nötig wäre. Die Stufen
2 und 3 bleiben zunächst zurückgestellt. Eine Randbemerkung zur Auswahl: Bei Zug
280 fehlen 142 kürzere Partien, die Stichprobe dort ist also nicht dieselbe wie
bei Zug 200.

**Abschwächungen an den Aussagen in diesem Dokument:**

1. **Verzerrung der Regressionen (§3):** Die Aussage, die beiden Regressionen
   seien durch Messfehler „entgegengesetzt verzerrt“, ist nicht begründet. Für
   den Fehler in der erklärenden Größe stimmt sie als Faustregel, für die
   tatsächliche Fehlerstruktur zwischen `evaluateBoard` und dem späteren
   Flächenstand wurde sie nicht geprüft. Das geometrische Mittel SD(E)/SD(d) ist
   eine Konvention, kein nachgewiesener Schätzer.
2. **Keine nachgewiesene Komi-Umrechnung:** SD(E)/SD(d) beschreibt das
   Größenverhältnis der Streuung von E und d. Ein Bestehen der Kriterien wäre
   nur ein Anlass zu weiterer Prüfung gewesen, keine Freigabe eines Komi-Arms.
3. **Folgen (§1):** Dass die Komi-Blindheit Siegquote, Sieggefühl und Aufgabe
   verschlechtert, ist bislang eine Hypothese. Belegt ist nur, dass die KI als
   Weiß öfter gewinnt als als Schwarz, was zu einer Komi-Blindheit passt, sie
   aber nicht beweist.

## 6. Nachtrag: zwei methodische Einschränkungen und Gegenproben (31.10.2026)

Aus der Durchsicht von §5 (PR #229). Das Urteil aus §5 bleibt unverändert;
die Gegenproben unten sind **explorativ** und ändern es nicht rückwirkend.

**1. Abweichung der Datenquelle von der Beschreibung.** §3 sagt, der komifreie
Flächenstand stamme „aus der Zählung von GNU Go“. Tatsächlich rechnet
[`k-schaetzung.js`](../auswertung/komi/k-schaetzung.js) mit `unsereZaehlung`,
der eigenen Flächenzählung von `gnugo-duell.js` (die Funktion
`unsereZaehlung`), nicht mit GNU Gos `final_score`; dieser steht im Feld
`endstand` (aus Sicht der KI, mit Komi). Die beiden Größen können deutlich
auseinanderliegen: In Partie 1 von Seed 226 (`f-D`) ergibt die eigene Zählung
komifrei +5 für Schwarz, GNU Go zählt B+9,5 mit Komi, also komifrei +17. Ob die
ursprüngliche Festlegung die GNU-Go-Zählung verbindlich verlangte, ist aus dem
Wortlaut von §3 nicht eindeutig zu sagen („von GNU Go gezählt“ beschreibt die
Absicht, die Rechnung folgte der leichter verfügbaren eigenen Zählung). Das
steht hier so, ohne die Festlegung nachträglich umzudeuten: **Geurteilt wurde
nach der eigenen Zählung (§5).** Die Rechnung mit `endstand` als Gegenprobe
folgt unten.

**2. Zwischenstellung gegen späteren Endstand.** Verglichen wird E nach Zug 200,
240 und 280 mit dem Flächenstand der Schlussstellung. Die Regression misst
deshalb auch, wie gut `evaluateBoard` den späteren Endstand vorhersagt, und
nicht nur, wie viele Einheiten einem Punkt in dieser Stellung entsprechen. Das
Wachsen von u (5,9 / 7,6 / 10,4) kann mehrere Ursachen haben: die Bewertungsfunktion
selbst, die mit dem Partieverlauf genauere Vorhersage und die wechselnde
Auswahl der Partien (142 Partien erreichen Zug 280 nicht). Belegt ist nur, dass
dieser Schätzer keinen ausreichend stabilen Faktor geliefert hat. Daraus folgt
nicht, dass `evaluateBoard` grundsätzlich keinen festen Komi-Faktor haben kann.

**Explorative Gegenproben** (`komi-k.yml`, zweiter Schritt, ohne neue Partien;
Ergebnisse als Nachtrag §7 nach dem Lauf):

- `--quelle gnugo`: d aus `endstand` (GNU Gos final_score) statt `unsereZaehlung`.
- `--gleiche-partien`: an allen drei Zugzahlen nur die Partien, die Zug 280
  erreichen (damit ändert sich die Stichprobe zwischen den Zugzahlen nicht).
- beides zusammen.
