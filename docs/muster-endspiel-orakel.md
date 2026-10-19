# Endspiel-Muster: Orakel-Test, wie viel in besseren Zügen steckt

**Status: festgelegt am 19.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Die Datenaggregation ([`muster-endspiel-dagger.md`](muster-endspiel-dagger.md))
und die Messung mit 240 Paaren ([`muster-endspiel-messung.md`](muster-endspiel-messung.md))
haben für die Endspiel-Tabelle dasselbe gezeigt: Sie trifft GNU Gos Zug auf
neuen Stellungen um 2 bis 3 Prozentpunkte öfter als die alte, und das Spiel
wird davon nicht besser (B − A −3,7, 95 %: [−10,7; +3,3]). Offen ist, ob das
an der Tabelle liegt oder daran, dass im Endspiel wenig zu holen ist, und wie
viel besser ein Lerner treffen müsste, damit sich Punkte ergeben.

Dieser Test beantwortet das mit einem **Orakel**: GNU Go Stufe 10 zieht für
die KI, ab Zug 81 oder ab Zug 161, in einem Anteil der Züge oder in allen. Der
Unterschied im Endstand ist die Obergrenze dessen, was bessere Züge ab dort
bringen können; aus der Dosis ergibt sich, wie viel ein einzelner geänderter
Zug im Mittel wert ist. Hazeberry hat den Test am 19.10.2026 angefordert. Er
ändert nichts an der Engine und entscheidet nichts über die Tabelle (die ist
mit der Messung verworfen); er misst den Spielraum.

## 2. Arme

| Arm | Orakel |
|---|---|
| **A** | keins (Default) |
| **D25** | GNU Go Stufe 10 zieht für die KI ab Zug 81 in 25 % ihrer Züge |
| **D50** | ab Zug 81 in 50 % ihrer Züge |
| **D100** | ab Zug 81 in allen ihrer Züge |
| **E100** | ab Zug 161 in allen ihrer Züge |

„Zieht“ heißt: Ein zweites GNU Go auf Stufe 10 spielt jeden Zug der Partie mit
und liefert in jedem Zug der KI ab der Zugzahl `mc` ≥ AB (AB 80 = ab dem 81.
Zug, 160 = ab dem 161.) seinen Zug (`reg_genmove`). Mit der Wahrscheinlichkeit
des Arms, gezogen aus einem eigenen Zufallsstrom je Partie, wird dieser Zug
statt des Zugs der KI gespielt. Ein Pass des Orakels wird als Pass gespielt.
Die Suche der KI läuft in jedem Zug trotzdem, ihre Wahl wird nur verglichen.
Option `--orakel-zug AB[:ANTEIL]` in `gnugo-duell.js`; ohne sie ändert sich
nichts (der Test `tests/gnugo-bruecke.js` prüft, dass eine nicht erreichte
Schwelle dieselbe Partie ergibt).

## 3. Messung

Bedingungen wie in den Messungen: Gegner GNU Go Stufe 1, neun Vorgabesteine,
120 Simulationen (`mctsFixedSims=120`), Aufgabe der KI aus, GNU Go gibt nicht
auf, bis 600 Züge, ausgespielt. Seed **206**, 120 Partien je Arm in 8
Teilläufen zu 15 (Partien 1 bis 120); gleiche Partienummer in allen Armen ist
ein Paar. Das sind die Partien 1 bis 120 der Messung M1: Arm A spielt Zug für
Zug dieselben Partien wie dort. Der Lauf prüft das (Eingabe `kontrolle`:
gleicher Endstand und gleiche Zugzahl je Partie gegen Arm A aus M1).

Der Code ist der des Dispatch-Commits von `main`: `index.html` unverändert,
`gnugo-duell.js` mit der neuen Option. Es gibt keinen Schalter und keine
Tabelle. Der Lauf geschieht in GitHub Actions
([`endspiel-orakel.yml`](../.github/workflows/endspiel-orakel.yml), 40 Jobs:
5 Arme × 8 Teile).

## 4. Was gemessen wird und wie gelesen wird

Je Arm gegen A, gepaart nach Partienummer:

- **Differenz des Endstands** nach GNU Gos Zählung, mit 95-%-Intervall
  (gepaarter t-Test).
- **Gelegenheiten** (Züge der KI ab AB je Partie), **ersetzt** (davon vom
  Orakel gespielt), **geändert** (ersetzt, und der Orakelzug war nicht der der
  KI), und wie oft der Zug der KI derselbe gewesen wäre.
- **Punkte je geändertem Zug** = Differenz / Ø geänderte Züge je Partie.
  Näherung: Der Nenner wird als fest behandelt.
- **Steigung** s über D25, D50, D100 (Regression durch den Ursprung der
  Punkte (Ø geänderte Züge, Differenz)): Punkte je geändertem Zug.
- **Messlatte:** Ein Lerner, der in einem Anteil q der Züge der KI ab Zug 81
  den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind,
  gewinnt rund s × n × q Punkte (n Gelegenheiten je Partie in D100). Für +5
  Punkte ist q = 5 / (s × n). q ist der Zuwachs der Trefferquote der
  gespielten Züge.

**Lesart, vorab festgelegt** (es gibt keine Entscheidung über die Engine, nur
über die Richtung der Arbeit):

| D100 − A | Folge |
|---|---|
| unter +10 | Auch perfekt gewählte Züge ab Zug 81 bringen weniger als 10 Punkte. Die Arbeit an Endspielzügen lohnt nicht. Der nächste Orakel-Test wäre ab Zug 1 (Eröffnung und Mittelspiel). |
| +10 und mehr | Es steckt etwas drin. Dann gilt die Messlatte: Ein stärkerer Lerner als die Tabelle (z. B. ein kleines Netz auf den vorhandenen 71 000 beschrifteten Stellungen) wird zuerst offline geprüft, ohne Partien. Tor: Er muss die Trefferquote der gespielten Züge um mindestens q (+5 Punkte) über die Trefferquote der KI ohne Tabelle heben, auf Stellungen, die er nicht gesehen hat. Erst dann ein Pilot. |

Zur Einordnung steht im Nachtrag, welchen Gewinn s × n × q für den Zuwachs
von T4 (2 bis 3 Prozentpunkte bei Rang 1 in der Kandidatenliste, nicht bei den
gespielten Zügen, aber als Größenordnung brauchbar) vorhersagt, neben der
Messung M1 (−3,7 [−10,7; +3,3]). Aus E100 gegen D100 ergibt sich, welcher
Anteil des Gewinns auf Züge ab Zug 161 entfällt.

## 5. Erkennbare Größe und Erwartung

Mit 120 Paaren je Arm liegt der Standardfehler der Paardifferenz bei 6 bis 8
Punkten, die Intervalle bei ±12 bis ±16. Große Effekte (D100, E100) sind damit
klar zu sehen; bei D25 reicht es nur für einen Bereich. Es ist eine Schätzung,
kein Test einer Hypothese.

**Erwartung vorab, ohne Wirkung auf die Lesart:** D100 − A etwa +40 (zwischen
+20 und +70), E100 − A etwa +15 (zwischen +5 und +35), s etwa 0,6 Punkte je
geändertem Zug (zwischen 0,2 und 1,0), der Zug der KI gleich dem Orakelzug in
20 bis 30 % der Fälle (wie die Trefferquote bei Rang 1), q für +5 Punkte etwa
10 % (zwischen 6 % und 30 %). Daraus folgt für T4 ein Gewinn von rund +1 Punkt,
unter der Nachweisgrenze: kein Widerspruch zu M1. Das steht hier, damit sich
die Erwartung nicht nachträglich anpassen lässt.

## 6. Grenzen

- Das Orakel ersetzt nicht nur Randzüge, sondern auch Taktik (Lebensrettung,
  Angriff). D100 ist die Obergrenze für bessere Züge ab Zug 81 insgesamt, nicht
  für Randspiel allein; E100 grenzt auf Züge ab Zug 161 ein.
- Die Dosis-Wirkung muss nicht linear sein (ein Orakelzug kann mehr wert sein,
  wenn die folgenden auch gut sind). Die Steigung durch den Ursprung ist eine
  Näherung; die drei Dosen zeigen, ob sie trägt.
- Lehrer, Schiedsrichter und Gegner sind dasselbe Programm (GNU Go): Das
  Orakel (Stufe 10) spielt gegen Stufe 1, und die Zählung ist die von GNU Go.
- Ein Seed, 120 Paare je Arm. GNU Go 3.8 kann an einzelnen Stellungen
  abstürzen; abgebrochene Partien fallen samt Partner heraus und werden
  genannt.
- Gemessen wird gegen GNU Go Stufe 1 mit neun Vorgabesteinen, nicht gegen
  Menschen und nicht ohne Vorgabe.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 206 |
| `kontrolle` | `docs/daten/endspiel-messung/lauf1/A.jsonl.gz` (Arm A der Messung M1) |

Jobs: `pruefen` (Eingaben), `spielen` (5 Arme × 8 Teile zu 15 Partien),
`ergebnis` (Bericht mit `auswertung/endspiel-pilot-bericht.js`,
`orakel-bericht.js` und `messung-zusatz.js`, Rohdaten gepackt). Die Ergebnisse
legt der Workflow auf den Branch `ergebnisse/endspiel-orakel-lauf<N>` unter
`docs/daten/endspiel-orakel/lauf<N>/`, dazu als Artefakt (90 Tage). Nur der
letzte Job darf ins Repo schreiben, und nur auf einen neuen Branch. Ein
Orakel-Zug kostet GNU Go Stufe 10 Rechenzeit; erwartet werden 20 bis 40
Minuten für den ganzen Lauf.
