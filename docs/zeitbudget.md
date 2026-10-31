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

## 3. Was nicht belegt ist

Die Vermutung „Netz = Ursache“ ist **nicht bewiesen**:

- Die Maschine hier rechnet etwa zehnmal schneller als das Handy (4178 gegen 414 Simulationen in
  1,8 s). Mit demselben Faktor ergäben 45 bis 67 ms rund 0,5 bis 0,7 s, beobachtet sind 1,8 s.
  Das Netz müsste auf dem Handy also relativ langsamer laufen als die Suche (große `Float64`-Puffer,
  Cache, Drosselung); denkbar, nicht gemessen.
- Es könnte noch etwas anderes ab Zug 80 oder 82 eintreten, das hier nicht auftritt (zum Beispiel die
  Nachrichten zwischen Worker und Hauptthread oder die Nachbearbeitung im Hauptthread).

## 4. Entscheidender Test (braucht das Handy)

Auf dem Handy im Dashboard `endspielNetz` auf 0 stellen, eine Partie bis Zug 100 spielen (der Mensch
darf passen oder beliebig spielen) und den Fehlerbericht exportieren. Dann
`node auswertung/endspiel/zeit-zerlegung.js bericht.json`:

- Fällt der Rest ab Zug 82 auf rund 0,2 s zurück, ist das Netz die Ursache.
- Bleibt er bei rund 1,8 s, liegt die Ursache anderswo, und die Zerlegung muss feiner werden
  (Zeitstempel vor und nach `endspielNetzWurzel`, vor `mctsPUCT` und nach `getAIMove` in die
  Diagnose aufnehmen; das wäre dann eine kleine Änderung der Diagnose, keine am Spiel).

## 5. Mögliche Änderungen (nur nach Entscheidung, nicht gebaut)

1. Die Vorarbeit auf das Suchbudget anrechnen (Frist ab Beginn des Zuges), damit die Dauer das
   Budget nicht übersteigt. Kostet etwas Suchzeit, ändert die Spielstärke leicht.
2. Das Netz schneller machen (Float32 statt Float64, weniger Kanäle). Würde dessen Wirkung
   verändern und müsste neu gemessen werden (`docs/endspiel-netz.md`).
3. `budgetMs` im Hauptthread und das Budget im Worker auf dieselbe Rechnung stellen, damit der
   Bericht das wirkliche Budget zeigt.

Der Watchdog im Hauptthread feuert nach `3 × budgetMs + 3000` ms (Zug 484: 11,6 s). Die längsten Züge in
der Diagnose liegen bei 5,7 s und damit nicht in der Nähe; auf noch langsameren Geräten könnte das
anders sein.
