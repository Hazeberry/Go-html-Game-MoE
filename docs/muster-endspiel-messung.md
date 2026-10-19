# Endspiel-Muster: Messung gegen GNU Go mit 240 Paaren

**Status: festgelegt am 19.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Die Reihe der Datenaggregation ([`muster-endspiel-dagger.md`](muster-endspiel-dagger.md))
endete nach drei Runden negativ: Die drei Piloten zusammen (NEU − A, 180
Paare) liegen bei −0,2 Punkten, 95 %: [−9,4; +9,0]. Ein Gewinn über gut 9
Punkte ist damit ausgeschlossen, ein kleinerer nicht; der Pilot mit 60 Paaren
ist dafür zu grob (Standardfehler 7 bis 9 Punkte). Die letzte Tabelle, T4,
lag im dritten Pilot bei −5,7 [−20,4; +9,0].

Hazeberry wünscht die Messung mit 240 Paaren in GitHub Actions (19.10.2026).
Sie ist die M1 aus [`muster-endspiel-spiel.md`](muster-endspiel-spiel.md) §4
(Seed 206, 240 Paare in 16 Teilläufen zu 15), mit T4 als Tabelle von B. Der
Pilot der Reihe hat sie nicht ausgelöst, er ist durchgefallen; sie ist ein
zusätzlicher, genauerer Test. Die Entscheidung der Reihe (negatives Ergebnis,
kein Schalter auf `main`) gilt, bis diese Messung etwas anderes zeigt.

## 2. Arme

| Arm | Parameter |
|---|---|
| **A** | Default: `musterEndspiel` 0 (Schalter aus; bitgenau das Verhalten ohne Schalter, `tests/muster-endspiel.js` im Commit `63f727b`) |
| **B** | `musterEndspiel` 200 mit der Tabelle T4 ([`daten/dagger/runde3-lauf3/tabelle-neu.json`](daten/dagger/runde3-lauf3/tabelle-neu.json)) |

Beide Arme laufen mit derselben `index.html`: dem Stand des Commits `63f727b`
(der Schalter `musterEndspiel`) mit T4 darin
(`auswertung/dagger/vorbereiten.sh`, nie eingecheckt). Sie unterscheiden sich
nur im Parameter. Tabelle und Gewicht sind vorab gewählt, nicht nach den
Piloten: T4 ist die letzte Tabelle der Reihe und mit allen Daten gelernt, 200
ist das Gewicht aller Piloten. Dass T4 im Pilot nicht besser abschnitt als
die früheren, ändert daran nichts.

## 3. Messung M1

Bedingungen wie in den früheren Messungen: GNU Go Stufe 1, neun
Vorgabesteine, 120 Simulationen (`mctsFixedSims=120`), Aufgabe der KI aus,
GNU Go gibt nicht auf, bis 600 Züge, ausgespielt. Seed **206**, 240 Partien je
Arm in 16 Teilläufen zu 15 (Partien 1 bis 240); gleiche Partienummer in A und
B ist ein Paar. Der Seed 206 war dafür in `muster-endspiel-spiel.md` §4
vorgemerkt und ist sonst nicht benutzt (die Datenaggregation spielte auf den
Seeds 204, 205 und 207 bis 210).

Der Lauf geschieht in GitHub Actions, nicht im Container einer Sitzung:
Workflow [`endspiel-messung.yml`](../.github/workflows/endspiel-messung.yml),
32 Jobs (2 Arme × 16 Teile). `mctsFixedSims` zählt Simulationen statt Zeit und
GNU Go bekommt den Seed (`gnugo-duell.js`): Die Partien sind unabhängig von
der Last des Runners dieselben, so wie in den Läufen der Datenaggregation, die
Zug für Zug mit dem Container übereinstimmten.

## 4. Endpunkt und Entscheidung

Endpunkt: gepaarte Differenz **B − A** des Endstands nach GNU Gos Zählung,
gepaarter t-Test, zweiseitig, α = 0,05, mit 95-%-Intervall.

Nach [`teststaerke.md`](teststaerke.md) §6 heißt ein Nullergebnis „nicht
belegt“; „verworfen“ nur, wenn das Intervall einen relevanten Gewinn
ausschließt, etwa +10 Punkte.

| Ergebnis | Folge |
|---|---|
| B − A signifikant größer als 0 | **Gewinn belegt.** Kein Default allein aus dieser Messung: Es folgt die Kontrolle im Selbstspiel (M2, 360 Partien, Siegrate von B nicht signifikant unter 50 %, wie in `muster-endspiel-spiel.md` §4), mit eigener Vorabfestlegung. Erst danach kämen Schalter und T4 nach `main`. |
| nicht signifikant, obere Grenze des Intervalls unter +10 | **Verworfen.** Das Intervall schließt einen relevanten Gewinn aus. Die Tabelle wird nicht übernommen; Ende. |
| nicht signifikant, obere Grenze bei +10 oder darüber | **Nicht belegt.** Die Tabelle wird nicht übernommen. Ein Gewinn um 10 Punkte bleibt möglich; eine weitere Messung bräuchte eine neue Vorabfestlegung mit frischem Seed. |
| B − A signifikant kleiner als 0 | **Schadet.** Nicht übernehmen; Ende. |

Sekundär, ohne Anspruch: Siege je Arm, die Hälften (Partien 1–120 und
121–240), die Schätzung nach Zug 120 und 200, Züge je Partie, Median der
Differenz, Vorzeichentest. Nachträglich und ohne Wirkung auf die Entscheidung
darf der Nachtrag B − A mit den Piloten der Datenaggregation zusammenfassen.

## 5. Was die Messung erkennt, und die Erwartung

Mit einer Streuung der Paardifferenz von rund 65 Punkten
([`teststaerke.md`](teststaerke.md) §3; in den drei Piloten 57 bis 73) hat
die Messung mit 240 Paaren einen Standardfehler von 4,2 Punkten:

- signifikant wird sie ab einer Differenz von rund 8;
- einen echten Gewinn von 11,8 Punkten findet sie mit 80 % Sicherheit;
- einen Gewinn von 5 / 10 / 15 Punkten findet sie mit 22 % / 66 % / 95 %
  Wahrscheinlichkeit.

Ein Gewinn von 3 bis 5 Punkten bleibt damit auch nach dieser Messung kaum
nachweisbar. Sie verengt das Intervall auf rund ±8 und kann sagen, ob ein
Gewinn um 10 Punkte noch möglich ist.

**Erwartung vorab, ohne Wirkung auf die Entscheidung:** Nach den drei Piloten
und dem Bild offline (die Tabelle trifft GNU Gos Zug bei Rang 1 um 2 bis 3
Prozentpunkte öfter) wird B − A zwischen −8 und +8 erwartet, nicht
signifikant, mit einer oberen Grenze unter +10: „verworfen“. Das steht hier,
damit sich die Erwartung nicht nachträglich anpassen lässt.

## 6. Grenzen

- Gemessen wird gegen GNU Go Stufe 1 mit neun Vorgabesteinen und 120
  Simulationen, nicht gegen Menschen und nicht ohne Vorgabe.
- Lehrer der Tabelle, Schiedsrichter und Gegner sind dasselbe Programm (GNU
  Go); das Urteil ist nicht unabhängig.
- Ein Selbstspiel (M2) gehört nicht zu dieser Messung. Ohne M2 gibt es keinen
  neuen Default.
- Eine Tabelle, ein Gewicht. Andere Tabellen oder Gewichte werden nicht
  gemessen.
- Der Schalter `musterEndspiel` steht nur im Commit `63f727b`, nicht in
  `index.html` auf `main`; der Lauf holt den Code von dort.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `basis` | `63f727b` |
| `tabelle` | `docs/daten/dagger/runde3-lauf3/tabelle-neu.json` (T4) |
| `gewicht` | 200 |
| `seed` | 206 |

Jobs: `pruefen` (Eingaben, die Tabelle muss sich in die `index.html` der
Basis einsetzen lassen), `spielen` (32 Teile zu 15 Partien), `ergebnis`
(Bericht mit `auswertung/endspiel-pilot-bericht.js`, `gnugo-vergleich.js` und
`messung-zusatz.js`, Rohdaten gepackt). Die Ergebnisse legt der Workflow auf
den Branch `ergebnisse/endspiel-messung-lauf<N>` unter
`docs/daten/endspiel-messung/lauf<N>/`, dazu als Artefakt (90 Tage). Nur der
letzte Job darf ins Repo schreiben, und nur auf einen neuen Branch. Die
Partien der Datenaggregation dauerten in Actions 0,2 bis 0,3 Minuten; die 32
Teile laufen in ein bis zwei Wellen, erwartet werden 15 bis 30 Minuten.
