# Korrektur D-1 und W-1: Vorabfestlegung

**Stand: 16.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befunde aus `docs/bughunt-20261116.md`.
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

Deshalb gibt es **keinen Schalter** und **keinen Messlauf**. Im normalen Spielverlauf bekommt die Suche dieselben
Anfragen wie vorher. Abweichungen gibt es nur in zwei Fällen:
- **D-1:** Die Engine bekommt den Wert, der im Dashboard tatsächlich eingegeben wurde.
- **W-1:** Klickt man während einer Rechnung, startet der Worker neu und verliert seinen Zustand (§3). Das ist
  derselbe Zustand, den heute schon „Neues Spiel“ und jeder Watchdog verwerfen. Eine Wirkung auf die Spielstärke ist
  für diesen Fall nicht gemessen. Er tritt nur bei Klicks während der Rechnung auf.

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
   - `state.aiWorkerCtx.laeuft` ist beim Erzeugen `null`.
   - Es wird an **jeder** Stelle, die eine Anfrage an den Worker schickt, auf die reqId gesetzt. Das ist
     `triggerAIMove` und der Wechsel von `data:` auf `blob:` in `onerror`.
   - Es wird zu **Beginn** von `onmessage` auf `null` gesetzt, vor `applyAIResult`. Sonst sähe ein
     `triggerAIMove`, das `applyAIResult` am Ende selbst aufruft, die eben beantwortete Anfrage noch als laufend und
     startete den Worker ohne Grund neu.

   Liegt beim Auslösen eines Zuges auf Schwer noch eine Anfrage beim Worker, beendet `triggerAIMove` ihn
   (`cleanupWorker()`). Dann baut es einen neuen Worker **derselben Art** (`data:` oder `blob:`) wie der beendete,
   mit `blob:` als Rückfall. Ein neuer Versuch mit `data:` würde in einer Umgebung, die `data:` erst asynchron
   ablehnt, bei jedem Neustart dieselbe Ablehnung wiederholen.

   Die Neustarts zählt `state.workerNeustarts`. „Neues Spiel“ setzt den Zähler auf 0, und er steht im Fehlerbericht
   unter `meta`. Ins Zugprotokoll kommt dafür **keine** Zeile: Im Prototyp ergaben 20 Klicks 20 gleiche Zeilen, die
   die Züge aus dem sichtbaren Teil des Protokolls drängen.
2. **Gleiche Wahl ohne Wirkung, solange die KI rechnet.** Ein Klick auf die bereits gewählte Stufe oder Farbe löst
   keine neue Anfrage aus, solange `state.aiThinking` gilt. Rechnet die KI gerade nicht, bleibt alles wie bisher:
   Der Klick stößt sie an, wenn sie am Zug ist. Bleibt `aiThinking` einmal hängen (etwa R-1), hilft dieser Klick
   nicht mehr. KI aus und wieder an bleibt aber ein Weg heraus, denn der KI-Knopf bekommt keine Sperre.

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
`.github/workflows/tests.yml` führen die Datei bereits auf. Die Zeile in `tests/README.md` wird ergänzt.
T-D1, T-W1 und T-W2 müssen mit dem Code **vor** der Korrektur fehlschlagen. T-W3 ist die Kontrolle des normalen Wegs
und besteht an beiden. T-W4 prüft den Neustartweg selbst; am alten Code scheitert er nur daran, dass es keinen
Neustart und keinen Zähler gibt. Das Verhalten an beiden Ständen wird im Umsetzungs-PR mit der Ausgabe gezeigt.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-D1 | Jedes Dashboard-Feld mit gebrochenem Schritt übernimmt einen gebrochenen Wert im Bereich genau in `PARAMS`. Ein Feld mit ganzzahligem Schritt (`resignStreak`) liest „7.6“ weiter als 7 | scheitert an vier Feldern |
| T-W1 | KI Schwarz auf Schwer, `aiTimeBudget` 300, `adaptiveBudgetEnabled` 0 (Watchdog 3900 ms). Während der ersten Rechnung 20-mal KI aus und an, **in einem einzigen `page.evaluate`**. Danach: genau ein KI-Zug, `workerDead` false, keine Watchdog-Zeile, `workerNeustarts` 20 | Watchdog, `workerDead` true |
| T-W2 | Einstellungen wie T-W1. Während der Rechnung 5 Klicks auf die gewählte Stufe und 5 auf die gewählte Farbe: `aiRequestId` steigt nicht, der Worker bleibt derselbe, `workerNeustarts` 0 | `aiRequestId` steigt um 20 |
| T-W3 | Zwei KI-Züge auf Schwer ohne Klick dazwischen: derselbe Worker (Objektgleichheit), `workerNeustarts` 0 | besteht auch vorher (Kontrolle des normalen Wegs) |
| T-W4 | `data:` wird asynchron abgelehnt (Attrappe wie im bestehenden Test 6), die KI rechnet im `blob:`-Worker. Während der Rechnung 5-mal KI aus und an in einem Aufruf: Der neue Worker ist wieder `blob:`, die Ablehnung von `data:` steht genau einmal im Protokoll, `workerNeustarts` 5, kein Watchdog, ein Zug | scheitert nur am fehlenden Zähler |

Zu T-W1:
- **Warum in einem Aufruf:** Einzelne Playwright-Klicks verteilen die Anfragen über rund 2 s. Der Worker arbeitet die
  Warteschlange in dieser Zeit schon teilweise ab, und der Watchdog läuft am alten Code **nicht** ab. So wurde es im
  Prototyp mit 15 Zyklen gemessen (§7).
- **Warum 20 Zyklen:** Die Suche endet an ihrer Frist von 300 ms **oder** bei 20 000 Simulationen
  (`mctsPUCT`, `simLimit`), je nachdem, was zuerst eintritt. Gemessen wurden rund 1 900 Simulationen je Sekunde
  (3 491 in 1,8 s), in 300 ms also rund 580. Die Grenze von 20 000 erreicht erst ein etwa 35-mal schnellerer Rechner.
  Solange die Frist greift, brauchen 21 Anfragen mindestens 6,3 s, mehr als der Watchdog von 3,9 s. Gemessen dauerten
  sie je rund 0,32 s. Eine Garantie für jeden Rechner ist das **nicht**. Deshalb prüft T-W1 die Vorbedingung selbst:
  Der ausgeführte Zug meldet weniger als 20 000 Simulationen. Endet die Suche einmal an der Grenze, schlägt T-W1 fehl
  und verdeckt die Lage nicht. Den Fehlernachweis am alten Code liefert die abgelegte Ausgabe.

Die Ausführungsdauer von `tests/browser-ui.js` steigt um einige Sekunden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. T-D1, T-W1 und T-W2 schlagen am alten Code fehl und bestehen am neuen. T-W3 besteht an beiden. T-W4 besteht am
   neuen Code.
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: D-1, W-1a, W-1b und W-1c „nicht reproduziert“, W-1k
   weiter „nicht reproduziert“. Die übrigen Fälle (D-2, K-1, K-2, L-1, R-1, B-1 bis B-3) unverändert „reproduziert“.
   Die Ausgabe wird als `docs/daten/bughunt-20261116/nach-d1-w1.json` abgelegt. W-1a und W-1b klicken auf die schon
   gewählte Stufe bzw. Farbe und prüfen damit Teil 2. Den Neustart (Teil 1) prüft W-1c, und gründlicher T-W1.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5.
   Dazu eine Zeile in `docs/bughunt-20261116.md`, dass D-1 und W-1 behoben sind.
3. CI grün, Merge, kurzer Bericht.

## 7. Nachprüfung vor dem Merge (16.11.2026)

Auf Bitte von Hazeberry wurde die Vorabfestlegung nicht nur gelesen, sondern als **Prototyp** geprüft: die Änderungen
aus §2 und §3 in einer Kopie der `index.html` außerhalb des Repos, lokal, Chromium 153 headless. Der Prototyp ist nicht
die Umsetzung; er dient nur der Prüfung des Entwurfs.

**Ergebnisse:**
- Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-D1:** Am alten Code scheitern genau die vier Felder (`atariSizeWeight` 0,05 → 0, `raumZug` und `raumGewicht`
  0,5 → 0, `endTieBreak` 0,5 → 0). Am Prototyp scheitert keines, auch nicht die Felder des Policy-Netzes.
  `resignStreak` liest „7.6“ an beiden als 7.
- **T-W1** (je ein Lauf):

  | Zyklen | alter Code | Prototyp |
  |---:|---|---|
  | 10 | kein Watchdog, Zug nach 3,6 s | kein Watchdog, Zug nach 0,5 s |
  | 15 | Watchdog, `workerDead` | kein Watchdog |
  | 20 | Watchdog, `workerDead` | kein Watchdog, 20 Neustarts |

  Die Neustarts waren im Prototyp noch Protokollzeilen und sind daran gezählt. Den Zähler `workerNeustarts` gab es
  dort noch nicht.

  Mit einzelnen Playwright-Klicks (15 Zyklen) lief der Watchdog am alten Code nicht ab. Der Test hätte in der ersten
  Fassung also nichts bewiesen; jetzt steht er in §4 in einem Aufruf mit 20 Zyklen.
- **T-W2:** Am alten Code steigt `aiRequestId` um 20, am Prototyp gar nicht. Der Worker bleibt derselbe.
- **T-W3:** Besteht an beiden.
- **Bestehende Browser-Tests:** `browser-ui`, `browser-nan`, `browser-zaehlvorschau`, `browser-passregel`,
  `browser-zeiten` und `browser-diagonalauge` bestehen am Prototyp, 29 Prüfungen.
- **Prüfskript:** `pruefung.js` am Prototyp ergibt genau das Soll aus §5 Punkt 4 (8 von 13 Fällen reproduziert).
- **Zusatzfälle:** Schwer → Mittel → Schwer während der Rechnung: ein Neustart, kein Watchdog, ein Zug. Sechsmal die
  Farbe hin und zurück: sechs Neustarts, kein Watchdog, ein Zug.

**Danach am Entwurf geändert** (gegenüber der ersten Fassung dieses PRs):
1. **T-W1:** Anfragen in einem Aufruf statt über einzelne Klicks, 20 statt 15 Zyklen. Die Rechnung steht jetzt mit der
   Untergrenze aus dem Budget (§4).
2. **Art des neuen Workers:** dieselbe wie die des beendeten, statt immer zuerst `data:`.
3. **`laeuft`:** an jeder Sendestelle setzen (auch beim Wechsel auf `blob:`) und zu Beginn von `onmessage`
   zurücksetzen, vor `applyAIResult`.
4. **Neustarts:** zählen statt protokollieren (20 Klicks gaben 20 Protokollzeilen).
5. **Wortlaut:** §1 sagt nicht mehr pauschal, es entstehe keine Spielstärkefrage, sondern nennt den Klickfall.
   Die Dauer je Anfrage ist gemessen (0,32 s) statt geschätzt (0,3 s).

**Hinweise von Luna zu dieser Fassung (16.11.2026), eingearbeitet:**
- T-W1 behandelte das Zeitbudget als garantierte Mindestdauer. Die Suche kann auch an der Grenze von 20 000
  Simulationen enden. Die Garantie ist gestrichen, T-W1 prüft die Vorbedingung selbst (§4).
- §4 verlangte, dass jeder neue Test vorher fehlschlägt. Das widersprach T-W3. §4 ist an §5 angeglichen.
- Dass ein Neustart die Art `data:` oder `blob:` beibehält, war festgelegt, aber durch keinen Test geprüft. Dafür gibt
  es jetzt T-W4.

## 8. Nachtrag: Umsetzung und Abnahme (16.11.2026)

Hazeberry: „Du kannst schon mal PRen.“ Die Umsetzung folgt §2 bis §4 ohne Abweichung, im eigenen PR auf Grundlage
dieses Docs. Geändert sind `index.html` (Dashboard, Worker-Anbindung, Stufen- und Farbknöpfe, Fehlerbericht),
`tests/browser-ui.js` (T-D1 bis T-W4) und `tests/README.md`.

**Abnahme nach §5:**

1. **Prüfsummen:** Die Engine-Blöcke haben am neuen Stand genau die Prüfsummen aus §1. `PARAMS_DEFAULT` liegt im
   Block `worker-ai` und ist damit ebenfalls unverändert. Erfüllt.
2. **Tests:** Am alten Code (`index.html` SHA-256 `8f2c56e6…`, Stand `0f11058`) schlagen T-D1, T-W1 und T-W2 fehl,
   T-W3 besteht. Gründe:
   - T-D1: vier Felder abgeschnitten.
   - T-W1: „der Worker gilt nicht als tot (Watchdog: keine Antwort nach 3900 ms)“. Die Vorbedingung
     (Suche endet an der Frist, unter 20 000 Simulationen) war dabei erfüllt.
   - T-W2: `aiRequestId` 21 statt 1.
   - T-W4: scheitert wie angekündigt nur am fehlenden Zähler `workerNeustarts`.

   Am neuen Code bestehen alle elf Tests der Datei.

   **Gegenprobe für T-W4:** eine Variante, die beim Neustart wieder `data:` versucht. Dort scheitert T-W4, weil am
   Ende kein `blob:`-Worker mehr läuft („erwartet blob, bekommen null“). Der Test erkennt also den Fehler, für den er
   da ist. Ausgaben: `docs/daten/bughunt-20261116/browser-ui-alt.txt` und
   `browser-ui-neu.txt`. Erfüllt.
3. **Testsuite:** `node tests/run.js` lokal mit Browser-Tests: alle 60 Testdateien bestanden. Eine Prüfung übersprang
   sich, weil GNU Go lokal fehlt. Die CI steht im PR. Erfüllt, sobald die CI grün ist.
4. **Prüfskript:** `pruefung.js` am neuen Code ergibt genau das Soll: D-1 und W-1a bis W-1c „nicht reproduziert“,
   W-1k „nicht reproduziert“, D-2, K-1, K-2, L-1, R-1 und B-1 bis B-3 „reproduziert“ (8 von 13).
   Daten: `docs/daten/bughunt-20261116/nach-d1-w1.json`, Konsole `nach-d1-w1-konsole.txt`. Erfüllt.

**Ergebnis:** gültig, vorbehaltlich grüner CI. Neue `index.html`:
SHA-256 `4981f5f7a0a030ec7595c199c14ae6ad2d2b8f5fd05bf1a3c9c1231da93666a3`.

**Grenzen:**
- Nur Chromium 153 headless am Desktop, je Test ein Lauf.
- Auf dem Handy nicht geprüft, auch nicht die Kosten eines Neustarts dort.
- Eine Wirkung auf die Spielstärke ist nicht gemessen und nach §1 nicht zu erwarten, außer im Klickfall.
