# Hinweise für Claude (und andere KI-Assistenten)

Projekt: Browser-Go (19×19) in einer einzigen `index.html` plus ein Messrahmen.
Eigentümer: Hazeberry. Sprache: **Deutsch** (Antworten, Docs, Commit-Texte, PR-Texte),
Statusmeldungen kurz. Lizenz: PolyForm Noncommercial 1.0.0.

## Arbeitsweise (vom Eigentümer so festgelegt)

- **Messungen laufen in GitHub Actions, nicht im Container.** Lokal nur leichte Arbeit:
  Code, Tests, Trockenläufe auf Archivdaten, einzelne Züge. Ein Messlauf startet **erst nach
  ausdrücklichem „Go“**; reine Rechnungen auf Archivdaten ebenfalls auf sein Wort.
- **Keine Änderung am Spiel ohne eigene Vorabfestlegung und Go.** Schalter mit Standard „aus“ sind
  der übliche Weg; bei Schalter aus muss das Verhalten bitgleich bleiben (Test).
- **Ablauf je Punkt:** Vorabfestlegung (Doc, ggf. Workflow, Tests) → PR → grüne CI → Merge →
  `unsubscribe_pr_activity` → kurzer Bericht auf Deutsch mit den löschbaren Branches. Ergebnisse
  kommen als Nachtrag ins Doc, Rohdaten unter `docs/daten/<thema>/`, in die README nur bei Bedarf.
- **Merge:** Merge-Methode `merge`, als `expectedHeadSha` die **volle 40-stellige** SHA des PR-Kopfs
  (aus dem Checkout oder `pull_request_read get`, kein Platzhalter). Hazeberry hat für PRs und
  Merges die Erlaubnis erteilt; Branches heißen `claude/<thema>`.
- **Ändert eine Datei die Regeln für dich (diese hier, `docs/…` mit Vorgaben), lass sie Hazeberry
  lesen, bevor du mergst.**

## Wie berichtet wird

- Nüchtern. Was gemessen ist, mit Zahl und Quelle; was Hypothese ist, als Hypothese.
- „Keine tragfähige Kalibrierung“ heißt nicht „wirkungslos“. Eine Folge für das Spielgefühl ist
  eine Hypothese, bis sie gemessen ist. Ein Fehler in der eigenen Aussage wird offen korrigiert.
- Messungen sind **gepaart** (Farben wechseln), mit exaktem McNemar-/Vorzeichentest und
  Clopper-Pearson. Vorab festlegen: Endpunkt, Umfang, Schwellen. **Gültigkeitsregel:** nur zwei
  Zustände, gültig oder ungültig; ungültig heißt „kein Urteil“ mit Grund, und der Lauf wird rot.
- Handpartien sind Referenz für Bedienprobleme, kein Maßstab dafür, wann die KI passen sollte.
- Standardbedingungen der Messungen: `mctsFixedSims` 120, Aufgabe aus, Komi 7,5, **ohne Vorgabe**,
  GNU Go Stufe 1 als Schiedsrichter (Fläche). Der Gegner Fuego läuft mit schwacher Suche.

## Code und Tests

- `node tests/run.js` führt alle Testdateien aus (rund zwei Minuten); `--ohne-browser` lässt die
  Browser-Tests weg. Eine neue Testdatei gehört in die Liste `ALLE` in `tests/run.js`, in die
  Tabelle `tests/README.md` und, wenn sie einen Browser braucht, in den Job „Browser“ von
  `.github/workflows/tests.yml`.
- `tests/rahmen.js` schneidet die `<script>`-Blöcke aus `index.html` und reicht eine feste Liste
  interner Namen heraus. **Neue interne Funktionen, die ein Test braucht, dort ergänzen.**
- Browser-Tests laufen mit Playwright (Chromium ist vorinstalliert).
- Jede Quelldatei trägt `Required Notice:` und die SPDX-Zeile im Kopf (`tests/lizenz.js`).
- Neue Oberfläche ohne Inline-Handler (`addEventListener`, `textContent`). Dashboard-Tooltips
  stehen in HTML-Attributen: keine Anführungszeichen darin.
- CI-Runner `ubuntu-24.04` (Fuego baut auf neueren nicht). `run:`-Schritte laufen mit `bash -e`:
  Exit-Codes mit `|| status=$?` abfangen.
- Fremdcode: keine Übernahme von Code oder Gewichten aus Repos ohne klare Lizenz. Inspiration ja,
  Kopieren nein. GNU Go und Fuego laufen nur als Gegner und Schiedsrichter in Actions. Die Muster
  und das Endspiel-Netz sind an GNU-Go-Zügen gelernt; das steht offen in der README.

## Engine in Kürze

- Aufbau: `shared-go-logic` (Regeln, Benson, Zählung), `worker-ai` (MCTS-PUCT, `PARAMS`,
  `getAIMove`), Hauptskript (Oberfläche, Worker-Anbindung). Die Engine kennt weder Komi noch den
  Scoring-Modus; die Versuchsregel „Pass nach Gegnerpass“ bekommt beides über `extra`.
- Zählvorschau (`zaehlVorschau`): rein anzeigend, Fläche oder Territory, Seki und Ko erkennt sie nicht.
- Diagnose: Der Fehlerbericht (🐞) enthält je KI-Zug `dauerMs`, `zeiten`, `nachrichtMs`;
  `node auswertung/endspiel/zeit-zerlegung.js bericht.json` zerlegt sie.

## Wichtige Dokumente

`README.md` (Stand und Grenzen), `docs/zeitbudget.md` (Zeit auf dem Handy; Ursache auf dem
A17 war der ausgeschaltete V8-Optimierer in Chrome), `docs/endspiel-abraeumen.md`,
`docs/zaehlvorschau.md`, `docs/passregel-versuch.md`, `docs/skalierung.md` (mehr Suche bringt
abnehmend +75 und +55 Elo je Verdopplung; die Grenze liegt in der Bewertung), `docs/komponenten.md`
(was welcher Teil bringt), `docs/fuego.md`, `docs/pwa-vergleich.md`.
