# Hauptversuch Kandidaten-Orakel, Stufe 1 (Arme A, S, ZS)

**Gültig.** 480 Partienummern je Arm und Gegner gespielt; Kontrolle gegen das Archiv bitgleich; Wiederholungskontrolle identisch; Zählersummen stimmen; Prior-Summe 1 in jedem Eingriff; erster Auslöser S = ZS in allen Paaren.

## Technische Kennzahlen

| Gegner | Arm | Antwortquote | Wiederholung | erster Auslöser S/ZS |
|---|---|---:|---|---|
| GNU Go | A | 100,0 % (57685/57685) | identisch |  |
| GNU Go | S | 100,0 % (57558/57558) | identisch | 478 Paare, 0 abweichend, 0 ohne Auslöser |
| GNU Go | ZS | 100,0 % (57150/57150) | identisch |  |
| Fuego | A | 100,0 % (71021/71021) | identisch |  |
| Fuego | S | 100,0 % (70420/70420) | identisch | 480 Paare, 0 abweichend, 0 ohne Auslöser |
| Fuego | ZS | 100,0 % (67750/67750) | identisch |  |

Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): bitgleich.

### Prior-Summe zur Laufzeit

Geprüft: 377496 Protokolleinträge mit Summe; größte Abweichung von 1: 8,88e-16 (Grenze 1e-9). Fehlerprotokoll: 0 Einträge, davon 0 bei einem Eingriff.

### Fälle nach Farbe (alle Arme)

GNU Go:

| Farbe | a | b | c | c1 | d | d1 | kein-protokoll |
|---|---:|---:|---:|---:|---:|---:|---:|
| KI Schwarz | 26786 | 665 | 19082 | 13085 | 24307 | 176 | 726 |
| KI Weiß | 25288 | 751 | 20254 | 13192 | 27162 | 194 | 725 |

Fuego:

| Farbe | a | b | c | c1 | d | d1 | e | kein-protokoll |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| KI Schwarz | 25781 | 1565 | 23154 | 13615 | 39404 | 213 | 13 | 1325 |
| KI Weiß | 23736 | 1365 | 23843 | 13726 | 39930 | 191 | 18 | 1312 |

## Ausfälle und vollständige Paare

Ausgewertet werden nur **vollständige Paare**: Partienummern, die in allen drei Armen eines Gegners ausgewertet sind. Alle Vergleiche nutzen dieselben Nummern.

| Gegner | Arm | KI | gespielt | nicht ausgewertet (davon abgebrochen) | nur wegen Ausfall in anderem Arm nicht im Paar | Nummern der eigenen Ausfälle | Gründe |
|---|---|---|---:|---:|---:|---|---|
| GNU Go | A | Schwarz | 240/240 | 0 (0) | 1 | – | – |
| GNU Go | A | Weiß | 240/240 | 0 (0) | 1 | – | – |
| GNU Go | S | Schwarz | 240/240 | 0 (0) | 1 | – | – |
| GNU Go | S | Weiß | 240/240 | 1 (1) | 0 | 401 | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| GNU Go | ZS | Schwarz | 240/240 | 1 (1) | 0 | 422 | abgebrochen: GNU Go: genmove W → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| GNU Go | ZS | Weiß | 240/240 | 0 (0) | 1 | – | – |
| Fuego | A | Schwarz | 240/240 | 0 (0) | 0 | – | – |
| Fuego | A | Weiß | 240/240 | 0 (0) | 0 | – | – |
| Fuego | S | Schwarz | 240/240 | 0 (0) | 0 | – | – |
| Fuego | S | Weiß | 240/240 | 0 (0) | 0 | – | – |
| Fuego | ZS | Schwarz | 240/240 | 0 (0) | 0 | – | – |
| Fuego | ZS | Weiß | 240/240 | 0 (0) | 0 | – | – |

- GNU Go: **478 vollständige Paare** von 480 verwendet; alle Intervalle und Tests unten sind aus diesen Paaren berechnet.
- Fuego: **480 vollständige Paare** von 480 verwendet; alle Intervalle und Tests unten sind aus diesen Paaren berechnet.

Eine eigene Schwelle für vollständige Paare gibt es nicht: Für die Vollständigkeit gilt allein die 98-%-Regel je Arm; alle übrigen Gültigkeitsbedingungen gelten unverändert (Festlegung Hazeberry, 03.11.2026).

## Primärer Endpunkt: Endstand S − A (gepaart, α = 0,025 je Gegner, Intervall 97,5 %)

| Gegner | verwendete Paare | Differenz S − A [97,5 %] | SD | t | p (zweiseitig) | Urteil |
|---|---:|---|---:|---:|---:|---|
| GNU Go | 478 | +24,7 [+19,9; +29,5] | 46,6 | 11,6 | 1,7e-27 | S besser als A |
| Fuego | 480 | +36,0 [+30,1; +42,0] | 58,0 | 13,6 | 6,8e-36 | S besser als A |


## Ergänzend, ohne Signifikanzurteil (95 %)

| Gegner | Vergleich | verwendete Paare | Differenz [95 %] | Vorzeichen (besser/schlechter, p) | Siege: nur erster / nur zweiter (McNemar p) |
|---|---|---:|---|---|---|
| GNU Go | S − ZS | 478 | +42,4 [+38,0; +46,8] | 394/75, 2,7e-53 | 35/3 (6,7e-8) |
| GNU Go | ZS − A | 478 | −17,7 [−22,2; −13,3] | 167/306, 1,7e-10 | 4/7 (0,5488) |
| GNU Go | S − A | 478 | +24,7 [+20,5; +28,9] | 332/141, 8,0e-19 | 34/5 (2,4e-6) |
| Fuego | S − ZS | 480 | +51,7 [+46,1; +57,3] | 392/87, 2,9e-47 | 165/19 (3,1e-30) |
| Fuego | ZS − A | 480 | −15,7 [−20,5; −10,8] | 179/290, 3,4e-7 | 31/48 (0,0712) |
| Fuego | S − A | 480 | +36,0 [+30,8; +41,2] | 363/113, 1,3e-31 | 152/23 (1,6e-24) |

### Nach Farbe der KI (95 %, beschreibend)

| Gegner | KI | S − A | S − ZS | ZS − A | Siege A | Siege S | Siege ZS |
|---|---|---|---|---|---|---|---|
| GNU Go | Schwarz | +20,6 [+14,8; +26,4] (239) | +44,8 [+39,1; +50,4] | −24,2 [−30,3; −18,1] | 1,7 % [0,5 %; 4,2 %] | 10,9 % [7,2 %; 15,5 %] | 0,0 % [0,0 %; 1,5 %] |
| GNU Go | Weiß | +28,8 [+22,8; +34,8] (239) | +40,0 [+33,3; +46,8] | −11,3 [−17,6; −4,9] | 1,3 % [0,3 %; 3,6 %] | 4,2 % [2,0 %; 7,6 %] | 1,7 % [0,5 %; 4,2 %] |
| Fuego | Schwarz | +34,2 [+27,3; +41,2] (240) | +50,4 [+42,6; +58,3] | −16,2 [−22,9; −9,5] | 8,8 % [5,5 %; 13,1 %] | 32,1 % [26,2 %; 38,4 %] | 5,8 % [3,2 %; 9,6 %] |
| Fuego | Weiß | +37,9 [+30,1; +45,6] (240) | +53,0 [+44,9; +61,1] | −15,1 [−22,2; −8,0] | 15,8 % [11,5 %; 21,1 %] | 46,3 % [39,8 %; 52,8 %] | 11,7 % [7,9 %; 16,4 %] |

## Beschreibung je Arm

| Gegner | Arm | ausgewertet | abgebrochen | Siege in vollständigen Paaren [95 %] | Züge Ø | Auslöser je Partie (c, d, d1) | Eingriffe je Partie | gespielt = Orakelzug bei Auslöser | kein-protokoll (davon Orakel mit Zug) | Dauer Median / Max (s) | Partiezeit (h) |
|---|---|---:|---:|---|---:|---:|---:|---:|---|---|---:|
| GNU Go | A | 480 | 0 | 1,5 % [0,6 %; 3,0 %] | 320,7 | 63,5 | 0,0 | 2,2 % | 487 (5) | 60,5 / 139,5 | 8,2 |
| GNU Go | S | 479 | 1 | 7,5 % [5,3 %; 10,3 %] | 320,7 | 57,6 | 57,6 | 34,3 % | 480 (2) | 64,9 / 121,8 | 8,6 |
| GNU Go | ZS | 479 | 1 | 0,8 % [0,2 %; 2,1 %] | 319,0 | 69,0 | 69,0 | 2,0 % | 484 (4) | 68,7 / 194,9 | 9,4 |
| Fuego | A | 480 | 0 | 12,3 % [9,5 %; 15,6 %] | 375,9 | 88,1 | 0,0 | 1,4 % | 913 (91) | 79,4 / 235,2 | 11,4 |
| Fuego | S | 480 | 0 | 39,2 % [34,8 %; 43,7 %] | 373,4 | 80,5 | 80,5 | 30,9 % | 934 (31) | 91,1 / 272,3 | 12,9 |
| Fuego | ZS | 480 | 0 | 8,8 % [6,4 %; 11,6 %] | 362,1 | 95,4 | 95,4 | 1,3 % | 790 (93) | 101,5 / 351,2 | 14,5 |

Summe der Partiezeit (ohne Einrichten der Jobs und Kontrollen): 65,0 h (Planungsbudget rund 160 h).

