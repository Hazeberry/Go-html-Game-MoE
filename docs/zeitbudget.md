# Zeitüberschreitung der KI auf dem Handy

Stand 31.10.2026. Auslöser: Diagnose der Territory-Partie vom 31.10. (Android-Chrome-Handy,
KI Weiß „hard“, 494 Züge,
[`mensch-494zuege-diagnose.json`](daten/endspiel-abraeumen/territory/mensch-494zuege-diagnose.json)).
Dort dauerten 238 von 281 KI-Steinzügen länger als das 1,5-Fache des Budgets (`budgetMs`).
Untersucht ist, **wo die Zeit bleibt**. Gerechnet wurde auf der Archivdatei und mit einzelnen
Zügen in der Entwicklungsumgebung, keine Partie wurde gespielt.

## 1. Befund an den Daten

Zerlegung je Zug: Suche = Simulationen × `msProSim`, Rest = `dauerMs` − Suche
([`auswertung/endspiel/zeit-zerlegung.js`](../auswertung/endspiel/zeit-zerlegung.js),
Ausgabe [`zeit-zerlegung.txt`](daten/endspiel-abraeumen/territory/zeit-zerlegung.txt)):

| | Züge | Dauer (Median) | davon Suche | davon Rest |
|---|---|---|---|---|
| bis Zug 80 | 43 | 1992 ms | 1802 ms | **191 ms** |
| ab Zug 81 | 238 | 4144 ms | 2353 ms | **1759 ms** (1628 bis 2079) |

- Der Rest springt bei **Zug 82** von rund 0,2 auf rund 1,8 s und bleibt dann nahezu konstant
  (1,6 bis 2,1 s), unabhängig von Q, Zugnummer und Brettzustand. Er ist **nicht** vom
  Zeitbudget abgeleitet (das Budget steigt, der Rest sinkt leicht).
- Die Suche selbst hält zunächst das Budget (1800 ms). Später überschreitet sie die im Bericht
  genannte `budgetMs` (140 Züge länger als 1,1 × Budget, z. B. Zug 484: Suche 3935 ms gegen
  `budgetMs` 2862 ms). Der Grund ist ein Anzeigeproblem, kein Laufzeitproblem: Der Hauptthread
  berechnet `budgetMs` aus der Zahl der freien Felder, `mctsPUCT` im Worker aus der Zahl der
  Kandidaten (`getAdaptiveTimeBudget(rootScored.length)`, siehe den Kommentar an der Funktion).
  Die beiden Zahlen sind nicht dasselbe Budget.

## 2. Verdächtiger: das Endspiel-Netz

`endspielNetzAb` ist 80. Das Netz (`endspielNetzWurzel`) rechnet vor jeder Suche ab Zug 80 eine
Faltung über 28 Eingabeebenen und fünf Schichten à 32 Kanäle, in `Float64Array`, auf dem Weg dorthin
die Eingabeebenen mit Bouzy-Karte und Benson-Klassifikation. Das liegt **vor** `_simStart`, zählt also
nicht zum Suchbudget, und sein Aufwand ist nicht von Q oder der Stellung abhängig. Das passt zu einem
konstanten Rest ab Zug 82.

Messung hier ([`netz-kosten.js`](../auswertung/endspiel/netz-kosten.js), Ausgabe
[`netz-kosten.txt`](daten/endspiel-abraeumen/territory/netz-kosten.txt); `getAIMove` ohne Suche,
mit und ohne Netz): Das Netz kostet auf dieser Maschine **0 ms bis Zug 80 und 44 bis 67 ms ab Zug 82**
(Zug 82: 84 ms mit, 17 ms ohne Netz). Der Sprung liegt also an derselben Stelle wie in der
Handy-Diagnose. Der Rest der Vorarbeit ändert sich in diesem Bereich nicht.

## 3. Gegenprobe im echten Chromium (Entwicklungsumgebung)

[`browser-zeit.js`](../auswertung/endspiel/browser-zeit.js) lässt die KI in der App (Worker, Nachrichten,
Diagnose wie auf dem Handy) dieselben Stellungen ziehen und zerlegt die Dauer.
Ausgaben: [`browser-zeit-cpu1.txt`](daten/endspiel-abraeumen/territory/browser-zeit-cpu1.txt) und
[`browser-zeit-cpu10.txt`](daten/endspiel-abraeumen/territory/browser-zeit-cpu10.txt) (CPU auf ein Zehntel
gedrosselt, grobe Nachstellung eines langsamen Geräts).

- **Ohne Drosselung:** Rest 160 bis 270 ms, mit dem Netz ab Zug 82 etwa 60 bis 90 ms mehr (Netz 62, 77, 85 ms).
  Kein Sprung auf 1,8 s.
- **Mit Drosselung auf ein Zehntel:** Rest 540 bis 800 ms, mit und ohne Netz; das Netz selbst bleibt bei ca. 90 ms,
  die Suche hält ihre 1,8 s. Auch hier **kein Sprung bei Zug 82 von der Größenordnung des Handys**.

Das Endspiel-Netz erklärt die 1,76 s auf dem Handy damit **nicht**; die Vermutung aus §2 ist geschwächt, nicht
widerlegt: Ein Handy kann sich anders verhalten als eine gedrosselte Desktop-CPU (Kerne, Hitze, Hintergrund).
Auffällig ist der **Nachrichtenweg** (Hauptthread → Worker → Hauptthread) mit rund 90 bis 110 ms schon ohne
Drosselung und 210 bis 350 ms mit; auf dem Handy ist er noch nicht gemessen.

### Unabhängige Referenz (Sol 6.1)

Eine zweite, unabhängige Messung im Container-Chromium (anderes Werkzeug, Produktions-Worker, 72 Antworten, 12
Kontrollen bestanden) ist archiviert unter
[`chromium-referenz/`](daten/endspiel-abraeumen/territory/chromium-referenz/README.md): Das Netz kostet ab Zug 82
rund 45 bis 63 ms (davor 0), der Rest außerhalb der Suche liegt bei 20 bis 25 ms ohne und 60 bis 80 ms mit Netz. Der
zusätzliche Roundtrip-Aufwand gegenüber `getAIMove` beträgt etwa 0,5 ms; der Roundtrip insgesamt enthält die
Zugberechnung. Die 3,8 s vom Handy werden **nicht** reproduziert.

Einordnung: Die Desktop-Messungen bestätigen das Netz als Ursache nicht. Sie schließen aber einen deutlich höheren
Aufwand auf dem Handy nicht aus. Bis zum Handy-Bericht mit den Messpunkten (§4) rechtfertigen die Daten keine
Änderung am Netz.

## 4. Zerlegung auf dem Handy: jetzt in der Diagnose

Die Diagnose (`kiDiagnose` im Fehlerbericht) trägt seit dieser Änderung je KI-Zug Messpunkte, nur aus `Date.now()`,
ohne Einfluss auf Zug oder Budget:

- `zeiten.gesamtMs`: Zeit in `getAIMove`; davon `vorMs` (alles vor der Suche, enthält `netzMs`), `netzMs`
  (Endspiel-Netz), `sucheMs`, `nachMs` (nach der Suche bis zur Rückgabe).
- `nachrichtMs`: Hin- und Rückweg zwischen Hauptthread und Worker (Warten, Kopieren, Start).
- `anwendenMs`: den Zug im Hauptthread einsetzen.

Auswertung: `node auswertung/endspiel/zeit-zerlegung.js bericht.json` zeigt die Mediane vor und nach Zug 80.
Dann steht in Zahlen, welcher Teil der 1,76 s auf dem Handy liegt: Vorarbeit im Worker, Netz, Nachrichtenweg
oder Einsetzen im Hauptthread. Es genügt, auf dem Handy eine Partie bis etwa Zug 100 zu spielen und den
Bericht zu exportieren; die Gegenprobe `endspielNetz` = 0 ist danach nur noch nötig, wenn das Netz in den
Zahlen auffällt.

## 5. Was nicht belegt ist

Die Ursache auf dem Handy ist **nicht belegt**. Was die Daten tragen: Der Rest außerhalb der Suche springt bei
Zug 82; in der Entwicklungsumgebung tritt der Sprung in dieser Größe nicht auf. Offen ist, ob es das Gerät,
der Nachrichtenweg oder etwas Drittes ist.

## 6. Mögliche Änderungen (nur nach Entscheidung, nicht gebaut)

1. Die Vorarbeit auf das Suchbudget anrechnen (Frist ab Beginn des Zuges), damit die Dauer das
   Budget nicht übersteigt. Kostet etwas Suchzeit, ändert die Spielstärke leicht.
2. Das Netz schneller machen (Float32 statt Float64, weniger Kanäle). Würde dessen Wirkung
   verändern und müsste neu gemessen werden (`docs/endspiel-netz.md`).
3. `budgetMs` im Hauptthread und das Budget im Worker auf dieselbe Rechnung stellen, damit der
   Bericht das wirkliche Budget zeigt.

Der Watchdog im Hauptthread feuert nach `3 × budgetMs + 3000` ms (Zug 484: 11,6 s). Die längsten Züge in
der Diagnose liegen bei 5,7 s und damit nicht in der Nähe; auf noch langsameren Geräten könnte das
anders sein.
