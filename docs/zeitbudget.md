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

## 5. Ergebnis vom Handy (31.10.2026, nachgetragen)

> **Stand beim Eintragen, später aufgelöst:** Die Messwerte unten gelten. Die Deutung „das Netz ist die Ursache“ trifft nur
> bedingt zu: Auf dem A17 war der V8-Optimierer von Chrome aus; mit ihm kostet das Netz 106 ms (siehe „Auflösung“ weiter unten).

Bericht einer Territory-Partie auf dem Android-Handy (Chrome 156, KI Weiß „hard“, 280 Züge, 140 Steinzüge mit
Messpunkten): [`handy-bericht-280zuege.json`](daten/endspiel-abraeumen/territory/handy-bericht-280zuege.json),
Auswertung [`handy-zeit-zerlegung.txt`](daten/endspiel-abraeumen/territory/handy-zeit-zerlegung.txt).

| Median in ms | bis Zug 80 (40 Züge) | ab Zug 81 (100 Züge) |
|---|---:|---:|
| Dauer des Zuges | 2022 | 3727 |
| Vorarbeit im Worker (`vorMs`) | 213 | 1829 |
| davon Endspiel-Netz (`netzMs`) | 0 | **1627** (Spanne 1604 bis 1717) |
| Suche (`sucheMs`) | 1802 | 1803 |
| nach der Suche (`nachMs`) | 0 | 0 |
| Nachrichtenweg (`nachrichtMs`) | 1 | 1 |
| Einsetzen im Hauptthread (`anwendenMs`) | 4 | 11 |

- **Das Endspiel-Netz ist auf dem Handy die Ursache des Sprungs**: Es kostet dort rund 1,6 s je Zug (sehr stabil, in jedem
  der 100 Züge zwischen 1,60 und 1,72 s) gegen 50 bis 90 ms in Chromium auf dem Desktop. Ohne das Netz läge die
  Dauer ab Zug 81 im Median bei rund 2,1 s.
- Der übrige Rest ist klein: Vorarbeit ohne Netz rund 200 ms (vorher und nachher gleich), Nachrichtenweg 1 ms, Einsetzen
  11 ms. Die Vermutung zum Nachrichtenweg (100 ms in der Entwicklungsumgebung) trifft auf dem Handy nicht zu.
- Das Netz läuft auf dem Handy also etwa 27-mal langsamer als im Container, die Suche etwa 10-mal (4 bis 8 ms je Simulation
  gegen 0,45) und die übrige Vorarbeit etwa 4-mal. Warum gerade das Netz so viel stärker einbricht, ist **nicht untersucht**
  (denkbar: Gleitkommarechnung mit `Float64Array` auf diesem Gerät, Speicher, Takt zu Beginn eines Zuges).
- Die Desktop-Messungen (§3) zeigten das Netz dort nicht als langsam, schlossen es aber auch nicht aus. Die Ursache
  ist der Aufwand des Netzes auf dem Gerät, nicht die Vorarbeit allgemein.

Zum damaligen Stand stützten die Daten eine Änderung (siehe die Auflösung unten, danach nicht mehr). Welche, wäre eine Entscheidung (§6); das Netz ist zugleich der größte
gemessene Gewinn des Projekts (`endspiel-netz.md`, im Selbstspiel 83,1 %), ein einfaches Abschalten kostet also Spielstärke.

### Zweites Gerät: Galaxy A20s (Chrome 156, 292 Züge, 146 Steinzüge)

[`handy-bericht-a20s-292zuege.json`](daten/endspiel-abraeumen/territory/handy-bericht-a20s-292zuege.json),
Auswertung [`handy-a20s-zeit-zerlegung.txt`](daten/endspiel-abraeumen/territory/handy-a20s-zeit-zerlegung.txt).
Der Benutzeragent ist in beiden Berichten derselbe (Android 10, „K“, Chrome 156) und sagt nichts über das Gerät.

| Median in ms, ab Zug 81 | Bericht 1 (280 Züge) | Galaxy A20s (292 Züge) |
|---|---:|---:|
| Dauer des Zuges | 3727 | 2508 |
| Endspiel-Netz (`netzMs`) | **1627** (1604 bis 1717) | **520** (508 bis 647) |
| Suche | 1803 | 1804 |
| Nachrichtenweg | 1 | 2 |
| Einsetzen im Hauptthread | 11 | 5 |

- **Gleiche Richtung, anderer Betrag:** Auf dem A20s springt der Zug bei Zug 82 ebenfalls, das Netz kostet aber rund
  520 ms statt 1627 ms, also etwa ein Drittel. Das ist rund das Zehnfache des Desktops (50 bis 90 ms) und damit in der Größe der
  Suche (ca. 10-mal langsamer), nicht mehr 27-mal.
- Der Unterschied zwischen den beiden Berichten ist nicht erklärt. Möglich sind ein anderes Gerät mit demselben
  (gekürzten) Benutzeragenten, Energiesparmodus, Wärme oder Hintergrundlast; das lässt sich aus den Berichten nicht
  trennen.
- Beide Berichte stützen: Das Netz ist der Teil, der ab Zug 81 die Dauer über das Budget hebt; Nachrichtenweg und
  Einsetzen sind vernachlässigbar.

### Auflösung (nachgetragen): der V8-Optimierer in Chrome

Weitere Läufe auf dem Galaxy A17 (alle mit denselben 161 Parametern, ohne Abweichung vom Standard; Berichte und
Auswertungen unter [`daten/endspiel-abraeumen/territory/`](daten/endspiel-abraeumen/territory/)):

| Median | Chrome, Lauf 2 (Chrome-Daten gelöscht) | **Firefox** | **Chrome, V8-Optimierer an** | PWA (Go-PWA, ohne Netz) |
|---|---:|---:|---:|---:|
| Simulationen in 1,8 s (Zug 2) | 453 | 2187 | **2662** | – |
| ms pro Simulation (Zug 2) | 3,98 | 0,82 | **0,68** | 4,07 |
| Endspiel-Netz (ab Zug 81) | 1635 | 242 | **106** | – |
| Rest außerhalb der Suche (ab Zug 81) | 1796 | 321 | **137** | 186 |
| Dauer des Zuges (ab Zug 81) | 3798 | 2227 | **2241** | 2125 |

- **Ursache:** Auf dem A17 lief Chrome mit ausgeschaltetem V8-Optimierer. Nach dem Einschalten verhält sich Chrome
  wie Firefox: Suche und Netz sind um den Faktor 5 bis 15 schneller, der Rest außerhalb der Suche fällt von 1,8 s
  auf 0,14 s, kein Zug überschreitet mehr das 1,5-Fache des Budgets (vorher alle).
- Das Endspiel-Netz war also nicht „zu teuer“, sondern nur der Teil der Rechnung, den der fehlende Optimierer am
  stärksten verlangsamte. Die PWA ohne Netz zeigte keinen Sprung, weil ihr Netzteil fehlt, aber ihre Suche läuft auf
  demselben Chrome mit 4 ms pro Simulation genauso langsam.
- **Hypothesen, die sich nicht bestätigt haben:** gemeinsamer Speicher beider Projekte auf `hazeberry.github.io`
  (die Parameter sind in allen Berichten gleich und gleich dem Standard; das Löschen der Chrome-Daten änderte nichts)
  sowie Energiesparmodus (war aus). Das Risiko gemeinsamer Speicherschlüssel (`go_pnet`, `PD_STORE`) beider Projekte bleibt
  davon unberührt.
- **Bestätigt (Hazeberry):** Der V8-Schalter in Chrome war auf dem A17 aus; er wurde eingeschaltet, Chrome neu gestartet und
  ein neues Spiel begonnen (der Lauf „Chrome, V8-Optimierer an“). Hazeberry vermutet, den Schalter selbst ausgeschaltet zu
  haben; das ist keine gesicherte Angabe, und ob er auf anderen Geräten voreingestellt aus ist, ist unbekannt.
- **Galaxy A20s:** Dort war der Schalter **an**. Die langsame Suche des A20s (ca. 4 ms pro Simulation, Netz 520 ms) hat also
  eine andere Ursache als beim A17 und ist mit der Hardware (schwacher, älterer Prozessor) verträglich; gleiche
  Simulationszahlen wie das A17 vorher waren Zufall. Die V8-Auflösung gilt nur für das A17.

Folge für das A17: Option 1 und 2 (§6) sind dort nicht mehr nötig. Auf dem A20s kostet das Netz weiterhin 520 ms von 2,5 s je Zug; ob sich Option 1 dafür lohnt, ist offen. Offen bleibt, ob die App einen zu
langsamen JavaScript-Pfad erkennen und dem Menschen sagen soll (§6, neu).

## 6. Mögliche Änderungen (nur nach Entscheidung, nicht gebaut)

Stand nach der Auflösung: Das Handy-Problem war eine Browser-Einstellung. Was bleibt:

0. **Langsamen Pfad erkennen und melden.** Schafft die Suche beim ersten KI-Zug auf Stufe Schwer weniger als etwa 800 Simulationen in 1,8 s (statt ca. 2000 und mehr), zeigt die App einen Hinweis („Dein Browser rechnet langsam, prüfe die Chrome-Einstellung für den V8-Optimierer“). Eine Anzeige, kein Eingriff in die Suche; die Schwelle wäre vorab festzulegen.

Die folgenden Optionen waren vor der Auflösung gedacht und sind jetzt zurückgestellt:

1. Das Netz schneller rechnen, ohne sein Ergebnis zu ändern (gleiche Ausgabe, andere Schleifen oder
   Zahlenformat). Spielstärke unverändert, Prüfung über `tests/endspiel-netz.js`; ob es auf dem Handy reicht,
   zeigt nur ein neuer Handy-Bericht.
2. Die Netzzeit messen und das Netz auf langsamen Geräten überspringen oder seltener rechnen (zum Beispiel,
   wenn es einmal länger als eine Schwelle braucht). Kostet auf diesen Geräten den Gewinn des Netzes.
3. Die Vorarbeit auf das Suchbudget anrechnen (Frist ab Beginn des Zuges): hielte die Dauer, würde auf dem Handy
   aber fast die gesamte Suche streichen (1,8 s Budget, 1,6 s Netz).
4. `budgetMs` im Hauptthread und das Budget im Worker auf dieselbe Rechnung stellen, damit der
   Bericht das wirkliche Budget zeigt.

Der Watchdog im Hauptthread feuert nach `3 × budgetMs + 3000` ms (Zug 484: 11,6 s). Die längsten Züge in
der Diagnose liegen bei 5,7 s und damit nicht in der Nähe; auf noch langsameren Geräten könnte das
anders sein.
