# Korrektur D-1 und W-1: Vorabfestlegung

**Stand: 16.11.2026. Status: Vorabfestlegung, noch keine Codeänderung.** Befunde aus `docs/bughunt-20261116.md`.
Go von Hazeberry am 16.11.2026: „Go für D-1 und W-1, Vorabfestlegung schreiben“.

Dieses Doc legt fest, was geändert wird, was unverändert bleiben muss und woran die Korrektur gemessen wird. Es
enthält Vorgaben für die Umsetzung; Hazeberry liest es vor dem Merge. Die Umsetzung folgt erst danach, in einem
eigenen PR. Ob das Go vom 16.11. die Umsetzung schon abdeckt, bestätigt Hazeberry beim Lesen.

## 1. Grundsatz: Die Engine bleibt unberührt

Beide Korrekturen betreffen nur das Hauptskript (Oberfläche, Worker-Anbindung) und das Dashboard. Die Blöcke
`shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch**; `PARAMS_DEFAULT` bleibt gleich.
SHA-256 des Inhalts der drei Blöcke am Stand `0f11058` (Prüfung in §5):

| Block | SHA-256 |
|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` |
| `worker-ai` | `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9` |
| `policy-net` | `56a5d6c0eb3f122425560fc55ebfb44ee70eda8fb47406a4f354928d5d93a475` |

Deshalb gibt es **keinen Schalter** und **keinen Messlauf**: Eine Spielstärkefrage entsteht nicht, weil die Suche
dieselben Eingaben bekommt wie vorher. Abweichend ist nur, welche Eingaben ankommen: Bei D-1 die Werte, die man im
Dashboard tatsächlich eingegeben hat. Bei W-1 eine Anfrage, die ein Klick während der Rechnung ausgelöst hat.

## 2. D-1: Gebrochene Werte im Dashboard

**Befund:** Vier Felder mit gebrochenem Schritt werden mit `parseInt` gelesen (`atariSizeWeight`, `raumZug`,
`raumGewicht`, `endTieBreak`). Eingabe 0,5 bei `endTieBreak` ergibt in der Engine 0.

**Änderung:** Beim Aufbau der Parameterzeilen (Z. 7781 bis 7795 am Stand `0f11058`) gilt ein Feld als gebrochen,
wenn es `float:true` trägt **oder** sein Schritt keine ganze Zahl ist:
`const gebrochen = !!p.float || !Number.isInteger(p.step);`, und `dashUpdate` bekommt diesen Wert. Damit sind die vier
Felder abgedeckt, und ein künftiges Feld mit gebrochenem Schritt kann den Fehler nicht wiederholen. Eine Zeile mit
`float:true` je Feld wäre gleichwertig, schützt aber nicht vor dem nächsten vergessenen Kennzeichen.

**Unverändert:** Alle anderen Felder. Laut Prüfung (`docs/daten/bughunt-20261116/ergebnis.json`, D-1,
`betroffeneFelder`) sind genau diese vier Felder betroffen. Felder mit ganzzahligem Schritt lesen weiter mit
`parseInt`, ebenso die Tabelle CAND/R/D (`dashCrdUpdate`). Die Felder des Policy-Netzes haben ein eigenes, festes
Kennzeichen und bleiben, wie sie sind.

**Nicht Teil der Korrektur:**
- B-1, die Anzeige nach der Begrenzung auf das Maximum.
- Gespeicherte Einstellungen, die einen abgeschnittenen Wert halten: Welcher Wert gemeint war, ist nicht mehr zu
  erkennen. Sie bleiben, wie sie sind.

## 3. W-1: Neue Anfrage während einer Rechnung auf Schwer

**Befund:** Jeder Klick auf Stufe oder Farbe und jedes Wieder-Einschalten der KI schickt eine weitere Anfrage an
denselben Worker. Der Worker arbeitet sie nacheinander ab. Der Watchdog der letzten Anfrage zählt ab ihrem Absenden
und läuft deshalb ab, bevor sie an der Reihe war. Folge: Der Worker gilt bis „Neues Spiel“ als tot.

**Änderung, zwei Teile:**

1. **Laufende Anfrage ersetzen statt anhängen.** Die Worker-Anbindung merkt sich, ob eine Anfrage beim Worker liegt:
   `state.aiWorkerCtx.laeuft` wird beim `postMessage` auf die reqId gesetzt und bei jeder Antwort des Workers
   (`onmessage`) auf `null`. Liegt beim Auslösen eines Zuges auf Schwer noch eine Anfrage beim Worker, beendet
   `triggerAIMove` ihn (`cleanupWorker()`) und baut einen neuen auf dem üblichen Weg, zuerst `data:`, dann `blob:`.
   Ins Zugprotokoll kommt dabei die Zeile `! Neue Anfrage während der Rechnung → Worker neu gestartet`; so sieht man
   den Neustart im Fehlerbericht.
2. **Gleiche Wahl ohne Wirkung, solange die KI rechnet.** Ein Klick auf die bereits gewählte Stufe oder Farbe löst
   keine neue Anfrage aus, solange `state.aiThinking` gilt. Rechnet die KI gerade nicht, bleibt alles wie bisher:
   Der Klick stößt sie an, wenn sie am Zug ist. Das bleibt neben KI aus und an ein Weg aus einem Hänger.

**Unverändert:** Liegt beim Auslösen keine Anfrage beim Worker, und das ist der normale Spielverlauf, läuft der Code
wie heute: derselbe Worker, dieselbe Nachricht, derselbe Watchdog. Der Weg über den Hauptthread
(`workerDead`, `fallbackToMainThread`) sowie Leicht und Mittel bleiben unverändert; dort gibt es keine Warteschlange.

**Kosten im Klickfall** (nur dann, wenn wirklich ersetzt wird):
- **Worker-Zustand:** Er geht verloren, genau wie heute bei „Neues Spiel“ und nach einem Watchdog:
  - der Suchbaum für die Wiederverwendung (`_mctsSavedRoot`);
  - die Aufgabe-Serien (`_hopelessStreak`, `_allDeadStreak`); eine Aufgabe kommt danach frühestens nach
    `resignStreak` weiteren Zügen;
  - der eigene letzte Zug für das Endspiel-Netz (`_enEigen`);
  - die Zeitrückmeldung des Workers (`_lastMsPerSim`);
  - die Krisendauer (`_krisenDauer`, wirkt nur bei `tsumegoSunkCost` > 0, Standard 0).
- **Zeit:** Ein frischer Worker brauchte lokal bis zur ersten Antwort rund 110 ms mehr Nachrichtenzeit: 109 bis
  118 ms gegen 1 ms beim laufenden Worker, drei Messungen, Chromium am Desktop, Budget 300 ms. Auf langsamen Handys
  ist mehr zu erwarten; das ist nicht gemessen.

**Erwogen und verworfen:**
- *Eine Anfrage in Arbeit, die neueste wartet.* Das hält den Worker-Zustand, aber der Watchdog muss dann die laufende
  Anfrage weiter überwachen, obwohl sie veraltet ist. Mehr Code an der heikelsten Stelle, und die Wartezeit für den
  Nutzer wird nicht kürzer. Kann später kommen, wenn der Zustandsverlust stört.
- *Watchdog ab Arbeitsbeginn im Worker.* Braucht eine zusätzliche Startmeldung des Workers und ändert damit den
  Worker-Code. Das widerspricht §1.
- *Nur Teil 2.* Deckt wechselnde Wahl und KI aus/an nicht ab (W-1c).

**Nicht Teil der Korrektur:** UI-1 (Abschalten der KI bricht die laufende Anfrage nicht ab) und R-1.

## 4. Tests (in der Umsetzung)

Alle neuen Tests kommen in `tests/browser-ui.js`. Dort laufen sie im Job „Browser“ der CI mit; `tests/run.js` und
`.github/workflows/tests.yml` führen die Datei bereits auf. Die Zeile in `tests/README.md` wird ergänzt. Jeder neue
Test muss mit dem Code **vor** der Korrektur fehlschlagen. Das wird im Umsetzungs-PR mit der Ausgabe gezeigt.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-D1 | Jedes Dashboard-Feld mit gebrochenem Schritt übernimmt einen gebrochenen Wert im Bereich genau in `PARAMS`. Ein Feld mit ganzzahligem Schritt (`resignStreak`) liest „7.6“ weiter als 7 | scheitert an vier Feldern |
| T-W1 | KI Schwarz auf Schwer, `aiTimeBudget` 300, `adaptiveBudgetEnabled` 0 (Watchdog 3900 ms). Während der ersten Rechnung 15-mal KI aus und an. Danach: genau ein KI-Zug, `workerDead` false, keine Watchdog-Zeile | Watchdog, `workerDead` true |
| T-W2 | Während der Rechnung 5 Klicks auf die gewählte Stufe und 5 auf die gewählte Farbe: `aiRequestId` steigt nicht, der Worker bleibt derselbe | `aiRequestId` steigt um 20 |
| T-W3 | Zwei KI-Züge auf Schwer ohne Klick dazwischen: derselbe Worker (Objektgleichheit), keine Neustartzeile im Protokoll | besteht auch vorher (Kontrolle des normalen Wegs) |

Rechnung zu T-W1: Ohne Korrektur stehen 16 Anfragen zu je rund 0,3 s an, zusammen etwa 4,8 s. Das liegt über dem
Watchdog von 3,9 s. Die Ausführungsdauer der Datei steigt dadurch um wenige Sekunden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. T-D1, T-W1 und T-W2 schlagen am alten Code fehl und bestehen am neuen. T-W3 besteht an beiden.
3. `node tests/run.js` lokal grün, CI grün.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: D-1, W-1a, W-1b und W-1c „nicht reproduziert“, W-1k
   weiter „nicht reproduziert“. Die übrigen Fälle (D-2, K-1, K-2, L-1, R-1, B-1 bis B-3) unverändert „reproduziert“.
   Die Ausgabe wird als `docs/daten/bughunt-20261116/nach-d1-w1.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5.
   Dazu eine Zeile in `docs/bughunt-20261116.md`, dass D-1 und W-1 behoben sind.
3. CI grün, Merge, kurzer Bericht.
