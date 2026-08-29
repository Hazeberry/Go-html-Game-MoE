# Tests

Regressionstests zum NaN-Bug in `mctsPUCT` ([#49](https://github.com/Hazeberry/Go-html-Game-MoE/pull/49)).

```
node tests/run.js                     # alles
node tests/run.js --ohne-browser      # alles außer dem Browser-Test
node tests/nan-guards.js              # nur die Schutzschichten (< 1 s)
node tests/resign-criterion.js        # nur das Aufgabe-Kriterium (< 1 s)
node tests/training-stability.js      # nur das Training (~20 s)
node tests/harness-smoke.js           # nur der Harness-Rauchtest (< 1 s)
node tests/browser-nan.js             # nur Ende-zu-Ende im Browser (~45 s)
```

Keine `node_modules` nötig — bis auf den Browser-Test, der sich ohne
Playwright selbst überspringt und den Gesamtlauf grün lässt.

## In CI

`.github/workflows/tests.yml` fährt die Tests bei jedem Push und jedem Pull
Request auf `main`, in zwei Jobs: `node` (alle Suiten außer Browser, keine
Abhängigkeiten, ~30 s) und `browser` (installiert Chromium, deshalb getrennt).

Der Node-Job ruft `node tests/run.js --ohne-browser` auf — **einen** Befehl,
nicht eine Liste von Einzelaufrufen. Das ist kein Stilentscheid: die frühere
Fassung listete die Dateien im Workflow auf, und beim Hinzufügen von
`resign-criterion.js` wurde die Liste dort nicht mitgepflegt. Der Job blieb
grün und prüfte den neuen Test nicht. Die Suite-Liste lebt jetzt nur in
`tests/run.js` und kann nicht mehr davon abdriften.
Der A/B-Harness läuft dort bewusst **nicht** mit — sein Zeitbudget ist
Wall-Clock, das Ergebnis also nicht reproduzierbar, und ein Messwerkzeug ohne
festes Ergebnis taugt nicht als Ja/Nein-Prüfung.

Der Browser-Job setzt `REQUIRE_BROWSER=1`. Ohne die Variable überspringt sich
der Test, wenn er Chromium nicht findet — in CI wäre der Lauf dann grün, ohne
irgendetwas geprüft zu haben. Mit ihr ist eine fehlende Installation ein
Fehlschlag.

Das ist kein hypothetisches Risiko: die erste Fassung suchte Chromium unter
`PLAYWRIGHT_BROWSERS_PATH` mit Rückfall auf einen festen Pfad. Auf einem
GitHub-Runner ist die Variable nicht gesetzt und Playwright installiert nach
`~/.cache/ms-playwright` — der Test hätte sich dort still übersprungen. Er
fragt jetzt Playwright selbst nach dem Pfad (`chromium.executablePath()`).

Jede Datei nimmt optional einen Pfad zu einer `index.html`. So lässt sich ein
älterer Stand gegenprüfen:

```
node tests/nan-guards.js /pfad/zu/alter/index.html
```

## Was geprüft wird

Getestet wird derselbe Code, der ausgeliefert wird: die `<script>`-Blöcke
werden zur Laufzeit aus `index.html` geschnitten, genau wie `ab-harness.js`
es macht. Ein Test gegen eine Kopie würde irgendwann etwas prüfen, das
niemand ausliefert.

| Datei | Ebene | Inhalt |
|---|---|---|
| `nan-guards.js` | Logik im Prozess | `_mctsKids` bei NaN/Infinity, `mctsPUCT` mit vergifteter Wurzelliste, `forward`/`save`/`load`/`_backward`/`trainGame`-Schutz |
| `resign-criterion.js` | Aufgabe | gibt die KI nur noch auf, wenn auch das Gebiet verloren sagt |
| `training-stability.js` | Training | Regularisierungs-Parameter, Gradienten-Deckel, Max-Norm-Projektion, Advantage-Dämpfung, dazu der ursprüngliche Repro-Lauf |
| `harness-smoke.js` | Messwerkzeug | läuft `ab-harness.js` einmal winzig durch — misst nichts, prüft nur, dass er noch anläuft |
| `browser-nan.js` | echter Browser | Chromium, echter Web Worker, echtes `localStorage` — der Pfad, auf dem der Fehler gemeldet wurde |

Der Browser-Test ist nicht redundant: die Node-Tests werten die Skript-Blöcke
im Prozess aus und sehen den Worker nie. Der gemeldete Crash tötete aber erst
den Worker und danach den synchronen Fallback.

## Wohin ein neuer Test gehört

| Was geprüft wird | Datei |
|---|---|
| Neue Guard-Logik — etwas fängt einen nicht-finiten oder entarteten Wert ab | `nan-guards.js` |
| Trainingsdynamik oder Regularisierung — Gradienten, Normen, Dämpfung, Zerfall | `training-stability.js` |
| Browser-spezifisches Verhalten oder `localStorage`-Interaktion | `browser-nan.js` |
| Der Messrahmen selbst (`ab-harness.js`) läuft nicht mehr | `harness-smoke.js` |
| Wann die KI aufgibt | `resign-criterion.js` |

Die Trennung ist nicht kosmetisch, sie folgt den Kosten: `nan-guards.js`
läuft in unter einer Sekunde und ist deshalb der Ort, an dem man beim
Entwickeln ständig nachsieht. `training-stability.js` braucht zwanzig
Sekunden, `browser-nan.js` startet einen Browser. Wer eine schnelle
Zusicherung in eine langsame Datei legt, verliert sie faktisch — sie wird
seltener ausgeführt.

Ein Grenzfall, der schon vorkam: `save()` und `load()` fassen `localStorage`
an, gehören aber trotzdem nach `nan-guards.js`, weil dort die
*Entscheidung* geprüft wird (einen nicht-finiten Stand ablehnen). Nach
`browser-nan.js` gehört der *Rundlauf* durch den echten Speicher — dass ein
vergifteter Eintrag einen Reload nicht überlebt. Faustregel: Logik, die
unter der Node-Schale identisch abläuft, bleibt in Node; alles, was nur im
Browser anders ist (Worker, echter Speicher, DOM), gehört in den
Browser-Test.

## Gegen den Stand vor dem Fix

Ein Test, der auf der kaputten Version grün ist, prüft nichts. Gemessen gegen
`ae626f9` (letzter Commit vor dem Fix):

| Datei | vor dem Fix | nach dem Fix |
|---|---|---|
| `nan-guards.js` | 2 von 11 bestanden | 11 von 11 |
| `resign-criterion.js` | 1 von 8 | 8 von 8 |
| `training-stability.js` | 0 von 5 | 5 von 5 |
| `harness-smoke.js` | 2 von 2 | 2 von 2 |
| `browser-nan.js` | 1 von 3 | 3 von 3 |

Die grünen Fälle im alten Stand prüfen bewusst *unverändertes* Verhalten und
sollen auf beiden Ständen halten: in `nan-guards.js` der Rang-Prior-Zweig und
gleiche Scores, in `browser-nan.js` der gesunde Start ohne vergiftete
Gewichte. `harness-smoke.js` ist grün auf beiden Ständen, weil er nichts über
den NaN-Bug aussagt — er bewacht eine andere Lücke, siehe unten.

## Warum der Harness einen eigenen Rauchtest hat

`ab-harness.js` läuft bewusst nicht als Messlauf in der CI — Wall-Clock-Budget,
nicht reproduzierbar, taugt nicht als Ja/Nein-Prüfung. Dadurch war er aber die
einzige Datei im Repo, die kein Push je anfasste.

Das ist keine Kosmetik. Harness und `tests/rahmen.js` schneiden beide die
`<script>`-Blöcke aus `index.html`, aber mit **getrennten** Implementierungen —
sie können auseinanderlaufen. Der Harness greift zusätzlich auf sechs
Engine-Funktionen zu, die kein anderer Test berührt (`bensonClassify`,
`evaluateBoard`, `evaluateMove`, `floodFill`, `quickEval`, `removeDeadGroups`),
und auf neun `policyNet`-Interna, darunter `_netInp`, `_netHidden` und
`_gameBuffer`.

Gemessen an Negativproben:

| Bruch | Rauchtest |
|---|---|
| Syntaxfehler in `ab-harness.js` | rot |
| `bensonClassify` in `index.html` umbenannt | rot — `nan-guards.js` bleibt dabei **grün** |
| Script-Block-Id in `index.html` umbenannt | rot |
| nichts verändert | grün |

Ohne diesen Test wäre so ein Bruch erst beim nächsten manuellen Messlauf
aufgefallen: Wochen später, Ursache irgendwo in dreißig Commits. Dieselbe
Fehlerklasse wie der ursprüngliche NaN-Bug — etwas läuft still kaputt, weil
nichts hinschaut.

Der Test bewertet bewusst **keine** Ergebnisse, nur den Exit-Code und die
Struktur der Auswertung. Sonst wäre die Nichtreproduzierbarkeit wieder das
Problem.

## Zum Repro-Lauf

`training-stability.js` fährt zuletzt den ursprünglichen Repro: Selbstspiel
auf einem nicht lernbaren Zufallsziel, also der Worst Case, in dem das
Trainingssignal nie schwächer wird.

Der Lauf würfelt aus einem **festen Seed** (Standard 2026, änderbar über
`SEED=…`). Ohne den war er glücksabhängig: bei 30 Partien × 400 Zügen fing er
die Divergenz im alten Stand je nach Zufallsstrom mal in 4 von 6 Fällen, mal
seltener. Ein Regressionstest, der mal anschlägt und mal nicht, erzeugt
falsche Sicherheit. Mit festem Seed ist das Ergebnis reproduzierbar:

| | ‖W1,b1‖ nach 30 Partien | Grenze |
|---|---|---|
| vor dem Fix | **603,6** — 65× Initialisierung | 92,4 |
| nach dem Fix | 8,25 | 37,0 |

Bei 25 × 200 divergiert der alte Stand in keinem geprüften Lauf, deshalb
30 × 400. Für einen schnellen Durchlauf ohne Regressionsanspruch:
`node tests/training-stability.js 12 200`.

Der Seed ist so gewählt, dass er den Fehler im alten Stand reproduziert —
das ist der Zweck eines Regressionstests. Umgekehrt ist er nicht
zurechtgebogen: der Test besteht nach dem Fix bei allen sechs geprüften
Seeds (1, 7, 42, 2026, 99991, 123456).

### Zwei Grenzen, und die zweite ist die wichtigere

Der Lauf prüft die Gewichtsnorm gegen die Max-Norm-Grenze des Fixes **und**
gegen das Zehnfache der gemessenen Startnorm. Die zweite Grenze setzt nichts
vom Fix voraus — und ohne sie war der Test zahnlos: am alten Stand lief
`‖W1,b1‖` auf 603 hoch, und der Test blieb grün, weil kein einziger Wert NaN
geworden war. Ein Training, das die Gewichte um eine Größenordnung aufbläst,
ist kaputt, egal ob daraus am Ende ein NaN wird.

## Warum das Zeitbudget hier keine Rolle spielt

Die Spielstärke-Messung über `ab-harness.js` ist wall-clock-getrieben und
deshalb **nicht** reproduzierbar (siehe Haupt-README). Diese Tests umgehen
das: sie prüfen Invarianten — finit, beschränkt, kein Absturz — und keine
Spielstärke. Nur `mctsPUCT` bekommt ein kleines Zeitbudget, und dort zählt
allein, *dass* ein Zug herauskommt.
