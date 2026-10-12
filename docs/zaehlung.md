# Auszählung am Partieende: tote Steine je Gruppe statt je Kette

**Stand: 12.10.2026.** Fehlerbehebung in der App, keine Änderung der KI.

---

## 1. Anlass

In einer Partie vom 12.10. (Mensch Schwarz gegen KI Weiß, 358 Züge, jetzt
`tests/stellungen/zaehlung-358.sgf`) zeigte die App am Ende **W+70,5**. GNU
Go zählt dieselbe Stellung als **W+102,5**.

Die App bestimmt vor dem Zählen die toten Steine (`resolveLifeAndDeath`).
Die alte Regel prüfte jede **Kette** für sich. Was nicht nach Benson sicher
lebte, galt als tot, wenn es ohne Auge höchstens drei Freiheiten hatte oder
mit einem Auge höchstens zwei. Das ging in dieser Partie zweimal schief:

- **Lebende Randsteine entfernt:** Die weißen Einzelsteine H19 und A13
  stehen am Rand neben weißem Gebiet. Je Kette gesehen haben sie zwei
  Freiheiten und „ein Auge“ und galten damit als tot. Dass dieses Auge von
  lauter weißen Steinen umgeben ist und sie zur lebenden Gruppe gehören,
  sah die Regel nicht.
- **Tote Gruppe stehen gelassen:** Acht schwarze Steine oben rechts (R19
  bis S16) haben nur die beiden Punkte S19 und T19, also ein einziges
  Auge. Die Regel zählte jeden der beiden Punkte als eigenes Auge und hielt
  die Gruppe für lebendig.

## 2. Die neue Regel: `toteSteineAmEnde`

Die neue Regel steht in der gemeinsamen Spiellogik in `index.html`;
`resolveLifeAndDeath` ruft sie nur noch auf. Sie beurteilt Gruppen, nicht
Ketten:

- **Verband:** Ketten derselben Farbe gehören zusammen, wenn sie sich eine
  Freiheit teilen oder an dieselbe Region grenzen, die nur an ihre Farbe
  grenzt.
- **Auge:** eine leere Region, die nur an den Verband grenzt. Gezählt wird
  die Region als Ganzes, nicht jeder ihrer Punkte.
- **Lebt:**
  - eine Kette ist nach Benson lebendig, oder
  - der Verband hat zwei Augen, oder
  - er hat ein Auge mit mindestens 6 Punkten (`AUGE_GROSS`), oder
  - er grenzt an eine gemischte Region ab 40 Punkten (`OFFEN_GROSS`), ist
    also nicht eingeschlossen.
- **Tot:** Was nach Benson tot ist. Danach stirbt der schwächste übrige
  Verband: wenigste Augen, dann wenigste Freiheiten, dann wenigste Steine.
  Anschließend wird neu gerechnet, bis jeder Verband lebt.

Die Verbände sterben einzeln, weil tote Steine im eigenen Gebiet dessen
Region an beide Farben grenzen lassen. Erst wenn der Eindringling weg ist,
wird das Gebiet zum Auge.

Die Sperre für offene Regionen schützt unfertige Stellungen, etwa wenn die
App nach einer Aufgabe zählt. Mitten in der Partie grenzt kaum eine Region
nur an eine Farbe. Ohne Sperre stirbt dann eine Gruppe nach der anderen:
Die aufgegebene Partie `tests/stellungen/aufgabe-151.sgf` ergab B+353,5
statt B+51,5.

Seki erkennt die Regel nicht: Von zwei Gruppen ohne zwei Augen, die sich
Freiheiten teilen, stirbt die schwächere. Das konnte die alte Regel auch
nicht.

## 3. Prüfung gegen GNU Go

`auswertung/zaehlung-pruefen.js` zählt die Schlussstellungen von 480
ausgespielten Partien gegen GNU Go nach. Die Partien stammen aus der
Wiederholung in [`gebiet-sicher.md`](gebiet-sicher.md) §9 und enden alle mit
zwei Pässen. Verglichen wird mit GNU Gos `final_score`. Dabei bekommt Weiß
wie bei GNU Go einen Punkt je Vorgabestein.

| Regel | genau wie GNU Go | Abweichung Ø | Median | Sieger wie GNU Go |
|---|---:|---:|---:|---:|
| alt (je Kette) | 10 (2,1 %) | 55,1 | 51 | 262 von 480 |
| **neu (je Gruppe)** | **329 (68,5 %)** | **13,6** | **0** | **440 von 480** |

Ohne die Sperre für offene Regionen wären es 331 (69,0 %). Mit
`AUGE_GROSS` 4, 5 und 7 statt 6 sind es 323, 327 und 328. Die verbleibenden
großen Abweichungen sind Stellungen, in denen tote Steine in einer großen
Gruppe stecken und dort über eine gemeinsame Freiheit an einer lebenden
Gruppe hängen. Dann stirbt die falsche Gruppe. Zwei Abwandlungen, die das
beheben sollten, waren insgesamt schlechter (61–63 % genau): zuerst die
kleinste Gruppe entfernen, oder Ketten nur über rein eigene Regionen
verbinden.

**Partien in der App** (ohne Vorgabe, Komi 7,5), gegen GNU Gos
`final_score`:

| Partie | Ende | alt | neu | GNU Go |
|---|---|---:|---:|---:|
| 441 Züge | zwei Pässe | W+26,5 | W+26,5 | W+26,5 |
| 402 Züge | zwei Pässe | W+88,5 | W+88,5 | W+88,5 |
| 444 Züge | zwei Pässe | W+80,5 | W+80,5 | W+80,5 |
| 358 Züge (12.10.) | zwei Pässe | W+70,5 | **W+102,5** | W+102,5 |
| 151 Züge | Aufgabe | B+47,5 | B+34,5 | B+51,5 |

**Mitten in der Partie** (Partien von Arm A, Stellungen nach Zug 60, 120
und 180), im Schnitt für tot erklärte Steine:

| nach Zug | alt | neu |
|---:|---:|---:|
| 60 | 17,1 | 0,1 |
| 120 | 31,1 | 2,7 |
| 180 | 40,8 | 16,0 |

Die alte Regel nahm schon nach 60 Zügen im Schnitt 17 Steine vom Brett. Das
traf jede Zählung vor dem Ende, zum Beispiel den Stand nach einer Aufgabe.

## 4. Was sich ändert und was nicht

- **Ändert sich:** der angezeigte Endstand in der App und die toten Steine,
  die sie am Ende entfernt.
- **Bleibt gleich:**
  - Die KI selbst und alle Messungen. `gnugo-duell.js` lässt GNU Go zählen,
    `ab-harness.js` hat eine eigene Zählung.
- Tests: `tests/zaehlung.js`
