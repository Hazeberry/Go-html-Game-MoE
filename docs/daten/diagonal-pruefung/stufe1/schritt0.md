# Diagonalprüfung, Schritt 0: Prüfdaten

Zählung vor jeder Rechnung. Quellpartien der Entwicklungsdaten (ausgeschlossen): 562 verschiedene Partien in 563 Einheiten; Entwicklungsstellungen: 563.
Zugindizes für V: 250, 300, 350 (Stellung nach dem Zug mit diesem nullbasierten Index; Partie muss länger sein).

| Gruppe | Zeilen | übersprungen | Quellpartien ausgeschlossen | gleiche Zugfolge wie Quellpartie (ausgeschlossen) | Prüfpartien | davon gleiche Zugfolge im Prüfsatz (nur gezählt) |
|---|---:|---|---:|---:|---:|---:|
| GNU Go ohne Vorgabe | 960 | {} | 2 | 0 | 958 | 1 |
| Fuego 100 Spiele | 480 | {} | 45 | 0 | 435 | 0 |
| Fuego 50 Spiele | 960 | {} | 317 | 0 | 643 | 0 |
| alte PWA | 360 | {} | 198 | 0 | 162 | 0 |

### Stellungen und ausgeschlossene Duplikate (Brettvergleich, §14.4)

| Gruppe | S möglich | S gleich Entwicklungsbrett | S doppeltes Brett | S behalten | S nicht (Grund) | V möglich (250/300/350) | V gleich Entwicklungsbrett | V doppeltes Brett | V behalten (250/300/350) |
|---|---:|---:|---:|---:|---|---|---:|---:|---|
| GNU Go ohne Vorgabe | 958 | 0 | 5 | 953 | {} | 934/657/229 | 0 | 11 | 928/652/229 |
| Fuego 100 Spiele | 434 | 0 | 0 | 434 | {"Ende nicht mit zwei Pässen (Zuglimit oder anders)":1} | 435/426/287 | 0 | 0 | 435/426/287 |
| Fuego 50 Spiele | 643 | 0 | 0 | 643 | {} | 643/637/424 | 0 | 0 | 643/637/424 |
| alte PWA | 162 | 0 | 0 | 162 | {} | 162/162/135 | 0 | 0 | 162/162/135 |

### Partielängen der Prüfpartien (Züge einschließlich Pässe)

| Gruppe | n | min | Q1 | Median | Q3 | max | ≤ 250 | ≤ 300 | ≤ 350 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GNU Go ohne Vorgabe | 958 | 222 | 292 | 321 | 349 | 478 | 24 | 301 | 729 |
| Fuego 100 Spiele | 435 | 288 | 341 | 367 | 394 | 600 | 0 | 9 | 148 |
| Fuego 50 Spiele | 643 | 269 | 343 | 365 | 389 | 587 | 0 | 6 | 219 |
| alte PWA | 162 | 319 | 359 | 376 | 397 | 472 | 0 | 0 | 27 |

Gefangene gegen das Archiv geprüft: GNU Go ohne Vorgabe 958 (fehlt: 0); Fuego 100 Spiele 435 (fehlt: 0); Fuego 50 Spiele 643 (fehlt: 0); alte PWA 162 (fehlt: 0).
Stellungen: S 2192, V 5120, Handpartien 6, Entwicklung 563.

Zählung vor jeder Rechnung (Schritt 0, §3.2). Duplikate (§14.4): Partien mit gleicher Zugfolge wie eine Quellpartie, Stellungen mit dem Brett einer Entwicklungsstellung und Stellungen mit einem Brett, das in derselben Stellungsart schon vorkam, sind aus der Hauptprüfung ausgeschlossen, nur gezählt und nicht gerechnet; behalten wird der erste Vertreter in Dateireihenfolge.

Pflichtprüfungen Schritt 0: bestanden.
