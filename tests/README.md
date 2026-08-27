# Tests

Regressionstests zum NaN-Bug in `mctsPUCT` ([#49](https://github.com/Hazeberry/Go-html-Game-MoE/pull/49)).

```
node tests/run.js                     # alles
node tests/nan-guards.js              # nur die Schutzschichten (< 1 s)
node tests/training-stability.js      # nur das Training (~20 s)
node tests/browser-nan.js             # nur Ende-zu-Ende im Browser (~45 s)
```

Keine `node_modules` nötig — bis auf den Browser-Test, der sich ohne
Playwright selbst überspringt und den Gesamtlauf grün lässt.

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
| `training-stability.js` | Training | Regularisierungs-Parameter, Gradienten-Deckel, Max-Norm-Projektion, Advantage-Dämpfung, dazu der ursprüngliche Repro-Lauf |
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
| `training-stability.js` | 0 von 5 | 5 von 5 |
| `browser-nan.js` | 1 von 3 | 3 von 3 |

Die grünen Fälle im alten Stand prüfen bewusst *unverändertes* Verhalten und
sollen auf beiden Ständen halten: in `nan-guards.js` der Rang-Prior-Zweig und
gleiche Scores, in `browser-nan.js` der gesunde Start ohne vergiftete
Gewichte.

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
