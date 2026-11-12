# Diagonalprüfung, Stufe 1: Betroffenheit

Reine Rechnung auf Archivdaten, kein GNU Go. Ergebnis ist **nur die Betroffenheit** (Tot-Menge bei Schalter aus gegen an). Das ist **keine Aussage zur Richtigkeit** und keine Beurteilung; ein Standardwechsel oder eine Kandidatur folgt daraus nicht (§8, §11).

## Kontrollen

| Kontrolle | Name | Ergebnis |
|---|---|---|
| §7 Nr. 1 | Daten (Schritt 0), Schnittmenge mit den Quellpartien leer | bestanden |
| §7 Nr. 2 | Nachspiel-Kontrolle (Einspielbarkeit, Gefangene gegen Archiv) | bestanden |
| §14.4 | Hauptprüfung ohne Entwicklungsbretter und ohne doppelte Bretter (je Stellungsart) | bestanden |
| Vollständigkeit | Ergebnisdateien: gleiche Stellungen, drei Prozesse, erwartete Fassung | bestanden |
| §7 Nr. 3 | Identität bei aus: Tot-Menge und Zählstände gleich der unveränderten Fassung | bestanden |
| Vorprüfung | Fallabdeckung der Identitätskontrolle (sonst KEIN URTEIL) | bestanden |
| §7 Nr. 4 | Konsistenz bei an: Tot-Menge gleich der Test-Kopie der Diagnose (Entwicklungsstellungen) | bestanden |
| Setzung | Konsistenz bei an auf den Prüfstellungen und Handpartien gleich der Test-Kopie (zusätzlich, über §7 Nr. 4 hinaus) | bestanden |
| Innere Konsistenz | gleiche Tot-Menge heißt gleiche Zählstände; „nur Bewiesenes“ unverändert | bestanden |

Alle Pflichtkontrollen bestanden. „Gleich bei aus“ gilt für die Stellungen dieser Prüfung (Fallabdeckung vorab geprüft); es ist keine Aussage über alle Stellungen.

## Betroffenheit

Betroffen = Tot-Menge bei an ≠ bei aus. Stellungen aus derselben Partie (V250, V300, V350 und S) sind nicht unabhängig; die Spalte „Partien“ nennt die Zahl verschiedener Partien. Intervalle: Clopper-Pearson 95 %, unter Modellannahmen (Unabhängigkeit der Stellungen ist nicht gegeben).

| Gruppe | Art | Stellungen | Partien | betroffen | betroffene Partien | Anteil | 95 %-Intervall | Steine zusätzlich tot | Steine wieder lebend |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| alte PWA | S | 162 | 162 | 0 | 0 | 0,0 % | 0,0 % bis 2,3 % | 0 | 0 |
| alte PWA | V | 459 | 162 | 21 | 19 | 4,6 % | 2,9 % bis 6,9 % | 335 | 38 |
| alte PWA | V250 | 162 | 162 | 13 | 13 | 8,0 % | 4,3 % bis 13,3 % | 196 | 21 |
| alte PWA | V300 | 162 | 162 | 8 | 8 | 4,9 % | 2,2 % bis 9,5 % | 139 | 17 |
| alte PWA | V350 | 135 | 135 | 0 | 0 | 0,0 % | 0,0 % bis 2,7 % | 0 | 0 |
| Fuego 100 Spiele | S | 434 | 434 | 95 | 95 | 21,9 % | 18,1 % bis 26,1 % | 1407 | 99 |
| Fuego 100 Spiele | V | 1148 | 435 | 131 | 103 | 11,4 % | 9,6 % bis 13,4 % | 2257 | 231 |
| Fuego 100 Spiele | V250 | 435 | 435 | 28 | 28 | 6,4 % | 4,3 % bis 9,2 % | 663 | 68 |
| Fuego 100 Spiele | V300 | 426 | 426 | 49 | 49 | 11,5 % | 8,6 % bis 14,9 % | 739 | 87 |
| Fuego 100 Spiele | V350 | 287 | 287 | 54 | 54 | 18,8 % | 14,5 % bis 23,8 % | 855 | 76 |
| Fuego 50 Spiele | S | 643 | 643 | 133 | 133 | 20,7 % | 17,6 % bis 24,0 % | 1778 | 127 |
| Fuego 50 Spiele | V | 1704 | 643 | 174 | 141 | 10,2 % | 8,8 % bis 11,7 % | 2582 | 348 |
| Fuego 50 Spiele | V250 | 643 | 643 | 46 | 46 | 7,2 % | 5,3 % bis 9,4 % | 743 | 161 |
| Fuego 50 Spiele | V300 | 637 | 637 | 55 | 55 | 8,6 % | 6,6 % bis 11,1 % | 849 | 107 |
| Fuego 50 Spiele | V350 | 424 | 424 | 73 | 73 | 17,2 % | 13,7 % bis 21,2 % | 990 | 80 |
| GNU Go ohne Vorgabe | S | 953 | 953 | 430 | 430 | 45,1 % | 41,9 % bis 48,3 % | 6988 | 312 |
| GNU Go ohne Vorgabe | V | 1809 | 929 | 734 | 467 | 40,6 % | 38,3 % bis 42,9 % | 12877 | 1394 |
| GNU Go ohne Vorgabe | V250 | 928 | 928 | 331 | 331 | 35,7 % | 32,6 % bis 38,8 % | 5726 | 891 |
| GNU Go ohne Vorgabe | V300 | 652 | 652 | 291 | 291 | 44,6 % | 40,8 % bis 48,5 % | 5152 | 447 |
| GNU Go ohne Vorgabe | V350 | 229 | 229 | 112 | 112 | 48,9 % | 42,3 % bis 55,6 % | 1999 | 56 |
| Summe (nicht gewichtet) | S | 2192 | 2192 | 658 | 658 | 30,0 % | 28,1 % bis 32,0 % | 10173 | 538 |
| Summe (nicht gewichtet) | V | 5120 | 2169 | 1060 | 730 | 20,7 % | 19,6 % bis 21,8 % | 18051 | 2011 |
| Summe (nicht gewichtet) | V250 | 2168 | 2168 | 418 | 418 | 19,3 % | 17,6 % bis 21,0 % | 7328 | 1141 |
| Summe (nicht gewichtet) | V300 | 1877 | 1877 | 403 | 403 | 21,5 % | 19,6 % bis 23,4 % | 6879 | 658 |
| Summe (nicht gewichtet) | V350 | 1075 | 1075 | 239 | 239 | 22,2 % | 19,8 % bis 24,8 % | 3844 | 212 |

## Ausgeschlossene Duplikate (nicht gerechnet, nur gezählt)

Aus der Hauptprüfung ausgeschlossen (§14.4, Brettvergleich; behalten wird der erste Vertreter in Dateireihenfolge): Partien mit gleicher Zugfolge wie eine Quellpartie 0; S: 0 gleich einem Entwicklungsbrett, 5 doppeltes Brett; V: 0 gleich einem Entwicklungsbrett, 11 doppeltes Brett. Je Gruppe: Schritt 0.

Mindestumfang für eine Kandidatur (§7 Nr. 7, Setzung 30 betroffene Stellungen je Stellungsart): S 658 (erreicht), V 1060 (erreicht).
Das Erreichen der Zahl ist kein Sicherheitsnachweis.

## Wirkung auf Stand und Vorschau (nur betroffene Stellungen, Schwarz − Weiß − Komi, an minus aus)

| Art | Wertung | Maß | betroffene Stellungen | Stand ändert sich | Sieger wechselt | min | Median | max |
|---|---|---|---:|---:|---:|---:|---:|---:|
| S (Endstand) | flaeche | Endstand | 658 | 658 | 195 | -150,0 | -19,0 | 204,0 |
| S (Endstand) | territory | Endstand | 658 | 658 | 68 | -150,0 | -19,0 | 204,0 |
| V (Vorschau) | flaeche | mit Annahmen | 1060 | 1060 | 263 | -394,0 | 14,0 | 315,0 |
| V (Vorschau) | flaeche | nur Bewiesenes | 1060 | 0 | 0 | 0,0 | 0,0 | 0,0 |
| V (Vorschau) | territory | mit Annahmen | 1060 | 1060 | 186 | -394,0 | 14,0 | 315,0 |
| V (Vorschau) | territory | nur Bewiesenes | 1060 | 0 | 0 | 0,0 | 0,0 | 0,0 |

Das ist die Wirkung des Schalters, nicht die einer Verbesserung: ob die Änderung richtig ist, sagen erst Stufe 2 (Übereinstimmung mit GNU Go) und Stufe 3 (Beurteilung).

## Handpartien (getrennt, nur illustrativ, ohne Statistik)

| Datei | reguläres Ende | Tot aus | Tot an | betroffen | Stand Fläche aus → an | Stand Territory aus → an |
|---|---|---:|---:|---|---|---|
| hand-117.sgf | nein | 1 | 1 | nein | 50,5 → 50,5 | 49,5 → 49,5 |
| hand-364.sgf | ja | 2 | 2 | nein | -98,5 → -98,5 | -102,5 → -102,5 |
| hand-392.sgf | ja | 0 | 0 | nein | -106,5 → -106,5 | -108,5 → -108,5 |
| hand-427.sgf | ja | 0 | 0 | nein | 67,5 → 67,5 | 38,5 → 38,5 |
| hand-455.sgf | ja | 0 | 0 | nein | 61,5 → 61,5 | 19,5 → 19,5 |
| hand-478.sgf | nein | 0 | 0 | nein | 93,5 → 93,5 | 18,5 → 18,5 |

Entwicklungsstellungen: 563, davon betroffen 19 (nur Kontrolle, nicht Teil der Auswertung, §3.1).

## Grenzen

- Ohne GNU Go, ohne Maßstab: Betroffenheit sagt nicht, ob die Änderung die Zählung verbessert oder verschlechtert.
- Die Prüfdaten stammen aus denselben Archiven wie die Entwicklungsdaten (gleiche Gruppen, teils gleiche Engine-Stände und Gegner); sie sind keine unabhängige Verteilung und gelten nicht für Menschen.
- Duplikate (gleiche Zugfolge) zählen mehrfach (Schritt 0 nennt ihre Zahl); die Einspiel-Kontrolle prüft Ko und Superko nicht.
- S: nur reguläre Enden (zwei Pässe in Folge, keine Aufgabe); Zuglimit und andere Enden sind im Archiv nicht getrennt erkennbar und fallen unter „Ende nicht mit zwei Pässen“.
