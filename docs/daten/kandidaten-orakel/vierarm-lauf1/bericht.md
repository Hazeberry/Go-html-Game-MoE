# Vierarm-Versuch Kandidaten-Orakel: Hauptlauf (Arme A, N, P, S)

**Gültig**: alle technischen Prüfungen bestanden (Tabelle).

## Technische Prüfungen

„Bestanden“ gilt nur für die geprüften Einheiten. Nicht prüfbare Einheiten stehen in der eigenen Spalte; zulässige Partieausfälle folgen getrennt im nächsten Abschnitt.

| Nr. | Prüfung | geprüft | nicht prüfbar | Ergebnis |
|---|---|---|---|---|
| 1 | Vollständigkeit (jede Nummer genau einmal, Farbe nach Nummer) | 3840 Partien | – | bestanden |
| P | Pflichtprotokoll und Endstand je nicht abgebrochener Partie | 3836 Partien | 4 (zulässiger Ausfall) | bestanden |
| 2 | mindestens 98 % je Arm und Gegner ausgewertet | 8 Arme | – | bestanden |
| 3 | Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4) | 4 Partien | – | bestanden |
| 4 | Antwortquote des Orakels ≥ 98 % je Arm und Gegner | 514616 Abfragen | – | bestanden |
| 5 | Fall d je Gegner in beiden Farben | 3836 Partien | 4 Partien (zulässiger Ausfall) | bestanden |
| 6 | Wiederholungskontrolle (Partien 1 bis 3 je Arm und Gegner) | 24 Partienpaare | – | bestanden |
| 7 | Zählersummen (Eintrag je Abfrage, Abfrage je KI-Zug ab Zug 81, Fälle bekannt) | 3836 Partien | 4 Partien (zulässiger Ausfall) | bestanden |
| 8 | Prior-Summe 1 je Eingriff (Abweichung ≤ 1e-9) | 508984 Einträge | 4 Partien (zulässiger Ausfall) | bestanden |
| 10 | erste Auslösestelle in allen vier Armen gleich | 959 Vierergruppen | 1 Vierergruppen (Ausfall in einem Arm): g127 | bestanden |
| 11 | Eingriffsart je Arm an jedem Protokolleintrag | 514616 Einträge | 4 Partien (zulässiger Ausfall) | bestanden |

## Zulässige Partieausfälle

4 Partien abgebrochen. Sie sind **keine** bestandene oder gescheiterte technische Prüfung, zählen gegen die 98 % je Arm (Prüfung 2) und machen die betroffenen Vierergruppen für Prüfung 10 nicht prüfbar.

| Gegner | Arm | Partie | KI | Grund |
|---|---|---:|---|---|
| GNU Go | A | 127 | Weiß | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  |
| GNU Go | N | 127 | Weiß | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  |
| GNU Go | P | 127 | Weiß | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  |
| GNU Go | S | 127 | Weiß | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  |

### Einzelheiten

| Gegner | Arm | Antwortquote | erste Auslösestelle | Wiederholung |
|---|---|---:|---|---|
| GNU Go | A | 100,0 % (58357/58357) | 479 geprüft, 0 abweichend, 0 ohne Auslöser, 1 nicht prüfbar | identisch |
| GNU Go | N | 100,0 % (57943/57943) |  | identisch |
| GNU Go | P | 100,0 % (58007/58007) |  | identisch |
| GNU Go | S | 100,0 % (58766/58766) |  | identisch |
| Fuego (100 Spiele je Zug) | A | 100,0 % (69485/69485) | 480 geprüft, 0 abweichend, 0 ohne Auslöser, 0 nicht prüfbar | identisch |
| Fuego (100 Spiele je Zug) | N | 100,0 % (71269/71269) |  | identisch |
| Fuego (100 Spiele je Zug) | P | 100,0 % (70399/70399) |  | identisch |
| Fuego (100 Spiele je Zug) | S | 100,0 % (70390/70390) |  | identisch |

Kontrolle Arm A gegen Archiv (Seed 222, Nr. 1 bis 4): bitgleich.

Eingriffsart je Arm (Prüfung 11): 0 Abweichungen.

Prior-Summe zur Laufzeit: 508984 Einträge geprüft, größte Abweichung 8,88e-16; Fehlerprotokoll 0 Einträge, davon 0 bei einem Eingriff.

### Fälle nach Farbe (alle Arme)

GNU Go:

| Farbe | a | b | c | c1 | d | d1 | kein-protokoll |
|---|---:|---:|---:|---:|---:|---:|---:|
| KI Schwarz | 40073 | 1163 | 22200 | 16509 | 33047 | 259 | 971 |
| KI Weiß | 37767 | 894 | 23513 | 16743 | 38678 | 285 | 971 |

Fuego (100 Spiele je Zug):

| Farbe | a | b | c | c1 | d | d0 | d1 | e | kein-protokoll |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| KI Schwarz | 37713 | 2689 | 25508 | 16819 | 55721 | 1 | 304 | 8 | 1802 |
| KI Weiß | 36527 | 2011 | 25531 | 17389 | 57288 | 0 | 336 | 8 | 1888 |

### Laufzeit, Auslöser und Eingriffe je Arm

| Gegner | Arm | Partien | Dauer Median / Max (s) | Partiezeit (h) | ms je Abfrage | Auslöser je Partie | Aufnahmen je Partie | Anhebungen je Partie | kein-protokoll (davon Orakel mit Zug) |
|---|---|---:|---|---:|---:|---:|---:|---:|---|
| GNU Go | A | 479 | 62,0 / 132,3 | 8,5 | 305,0 | 63,8 | 0,0 | 0,0 | 488 (7) |
| GNU Go | N | 479 | 62,4 / 138,2 | 8,5 | 307,1 | 63,5 | 38,8 | 0,0 | 488 (7) |
| GNU Go | P | 479 | 58,3 / 199,9 | 8,0 | 288,3 | 61,7 | 0,0 | 20,7 | 484 (3) |
| GNU Go | S | 479 | 59,9 / 153,9 | 8,3 | 301,4 | 57,3 | 32,2 | 56,9 | 482 (2) |
| Fuego (100 Spiele je Zug) | A | 480 | 83,6 / 524,9 | 12,2 | 393,2 | 87,3 | 0,0 | 0,0 | 904 (93) |
| Fuego (100 Spiele je Zug) | N | 480 | 79,6 / 506,6 | 11,8 | 372,8 | 88,1 | 61,2 | 0,0 | 944 (100) |
| Fuego (100 Spiele je Zug) | P | 480 | 91,2 / 1117,8 | 13,3 | 434,3 | 87,7 | 0,0 | 20,6 | 940 (72) |
| Fuego (100 Spiele je Zug) | S | 480 | 90,7 / 1112,3 | 12,8 | 424,5 | 80,1 | 47,9 | 79,7 | 902 (25) |

Summe der Partiezeit: 83,5 h.

## Protokoll: Orakelzug schon Kind (Fall c) oder neu aufgenommen (Fall d, d1)

Beschreibend; ersetzt keinen kausalen Vergleich der Arme (§8). Priors als Median [Quartile]; Besuche nur, wo der Orakelzug Kind ist.

| Gegner | Arm | Gruppe | Stellen | natürlicher Prior | endgültiger Prior | aufgenommen | angehoben | Kind | null Besuche (von Kind) | Besuche Median [Quartile] | gespielt |
|---|---|---|---:|---|---|---:|---:|---:|---:|---|---:|
| GNU Go | A | schon Kind (c) | 11952 | 0,073 [0,031; 0,131] | 0,073 [0,031; 0,131] | 0,0 % | 0,0 % | 100,0 % | 6,9 % | 8,0 [3,0; 16,0] | 5,6 % |
| GNU Go | A | neu (d, d1) | 18607 | 0,018 [0,007; 0,040] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | N | schon Kind (c) | 11821 | 0,076 [0,032; 0,133] | 0,076 [0,032; 0,133] | 0,0 % | 0,0 % | 100,0 % | 7,4 % | 8,0 [3,0; 16,0] | 5,5 % |
| GNU Go | N | neu (d, d1) | 18601 | 0,017 [0,007; 0,039] | 0,017 [0,007; 0,039] | 100,0 % | 0,0 % | 100,0 % | 19,4 % | 2,0 [1,0; 5,0] | 1,0 % |
| GNU Go | P | schon Kind (c) | 9908 | 0,093 [0,046; 0,150] | 0,253 [0,201; 0,318] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [19,0; 36,0] | 35,9 % |
| GNU Go | P | neu (d, d1) | 19661 | 0,018 [0,008; 0,040] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | S | schon Kind (c) | 12032 | 0,090 [0,044; 0,147] | 0,247 [0,197; 0,313] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 26,0 [19,0; 35,0] | 37,1 % |
| GNU Go | S | neu (d, d1) | 15400 | 0,021 [0,009; 0,044] | 0,218 [0,177; 0,278] | 100,0 % | 98,9 % | 100,0 % | 0,0 % | 24,0 [18,0; 31,0] | 32,3 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | 12792 | 0,059 [0,019; 0,131] | 0,059 [0,019; 0,131] | 0,0 % | 0,0 % | 100,0 % | 11,4 % | 7,0 [2,0; 16,0] | 5,2 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | 29095 | 0,010 [0,004; 0,027] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | 12872 | 0,060 [0,020; 0,132] | 0,060 [0,020; 0,132] | 0,0 % | 0,0 % | 100,0 % | 11,7 % | 7,0 [2,0; 16,0] | 5,1 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | 29398 | 0,010 [0,004; 0,027] | 0,010 [0,004; 0,027] | 100,0 % | 0,0 % | 100,0 % | 23,0 % | 1,0 [1,0; 3,0] | 0,7 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | 9906 | 0,086 [0,034; 0,150] | 0,273 [0,216; 0,339] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 31,0 [22,0; 41,0] | 37,6 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | 32176 | 0,010 [0,004; 0,026] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | 15469 | 0,086 [0,036; 0,149] | 0,263 [0,209; 0,328] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 29,0 [21,0; 39,0] | 36,0 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | 22980 | 0,013 [0,005; 0,033] | 0,234 [0,187; 0,296] | 100,0 % | 99,2 % | 100,0 % | 0,0 % | 25,0 [19,0; 33,0] | 25,9 % |

### Nach Farbe und Spielphase

| Gegner | Arm | Gruppe | KI | Zug | Stellen | natürlicher Prior | endgültiger Prior | aufgenommen | angehoben | Kind | null Besuche (von Kind) | Besuche Median [Quartile] | gespielt |
|---|---|---|---|---|---:|---|---|---:|---:|---:|---:|---|---:|
| GNU Go | A | schon Kind (c) | Schwarz | 81–160 | 2612 | 0,062 [0,026; 0,124] | 0,062 [0,026; 0,124] | 0,0 % | 0,0 % | 100,0 % | 10,5 % | 7,0 [2,0; 16,0] | 5,6 % |
| GNU Go | A | schon Kind (c) | Schwarz | 161–240 | 2675 | 0,073 [0,025; 0,132] | 0,073 [0,025; 0,132] | 0,0 % | 0,0 % | 100,0 % | 11,2 % | 8,0 [2,0; 17,0] | 5,7 % |
| GNU Go | A | schon Kind (c) | Schwarz | ab 241 | 493 | 0,080 [0,039; 0,141] | 0,080 [0,039; 0,141] | 0,0 % | 0,0 % | 100,0 % | 5,9 % | 7,0 [3,0; 16,0] | 5,3 % |
| GNU Go | A | schon Kind (c) | Weiß | 81–160 | 2443 | 0,077 [0,035; 0,128] | 0,077 [0,035; 0,128] | 0,0 % | 0,0 % | 100,0 % | 2,4 % | 8,0 [3,0; 15,0] | 5,3 % |
| GNU Go | A | schon Kind (c) | Weiß | 161–240 | 2780 | 0,079 [0,036; 0,138] | 0,079 [0,036; 0,138] | 0,0 % | 0,0 % | 100,0 % | 4,5 % | 8,0 [3,0; 16,0] | 6,1 % |
| GNU Go | A | schon Kind (c) | Weiß | ab 241 | 949 | 0,075 [0,033; 0,130] | 0,075 [0,033; 0,130] | 0,0 % | 0,0 % | 100,0 % | 4,5 % | 7,0 [2,0; 15,0] | 4,5 % |
| GNU Go | A | neu (d, d1) | Schwarz | 81–160 | 5340 | 0,015 [0,007; 0,033] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | A | neu (d, d1) | Schwarz | 161–240 | 2993 | 0,023 [0,008; 0,048] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | A | neu (d, d1) | Schwarz | ab 241 | 273 | 0,029 [0,009; 0,057] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | A | neu (d, d1) | Weiß | 81–160 | 5771 | 0,016 [0,006; 0,037] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | A | neu (d, d1) | Weiß | 161–240 | 3797 | 0,022 [0,009; 0,046] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | A | neu (d, d1) | Weiß | ab 241 | 433 | 0,025 [0,009; 0,050] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | N | schon Kind (c) | Schwarz | 81–160 | 2658 | 0,058 [0,024; 0,119] | 0,058 [0,024; 0,119] | 0,0 % | 0,0 % | 100,0 % | 10,9 % | 7,0 [2,0; 15,0] | 4,3 % |
| GNU Go | N | schon Kind (c) | Schwarz | 161–240 | 2600 | 0,077 [0,029; 0,141] | 0,077 [0,029; 0,141] | 0,0 % | 0,0 % | 100,0 % | 12,9 % | 8,0 [2,0; 17,0] | 5,8 % |
| GNU Go | N | schon Kind (c) | Schwarz | ab 241 | 520 | 0,071 [0,031; 0,137] | 0,071 [0,031; 0,137] | 0,0 % | 0,0 % | 100,0 % | 4,2 % | 7,0 [2,0; 15,0] | 5,8 % |
| GNU Go | N | schon Kind (c) | Weiß | 81–160 | 2318 | 0,079 [0,036; 0,132] | 0,079 [0,036; 0,132] | 0,0 % | 0,0 % | 100,0 % | 2,9 % | 9,0 [4,0; 16,0] | 5,8 % |
| GNU Go | N | schon Kind (c) | Weiß | 161–240 | 2797 | 0,086 [0,040; 0,141] | 0,086 [0,040; 0,141] | 0,0 % | 0,0 % | 100,0 % | 4,3 % | 9,0 [3,0; 17,0] | 6,0 % |
| GNU Go | N | schon Kind (c) | Weiß | ab 241 | 928 | 0,085 [0,041; 0,140] | 0,085 [0,041; 0,140] | 0,0 % | 0,0 % | 100,0 % | 3,7 % | 8,0 [3,0; 16,0] | 6,0 % |
| GNU Go | N | neu (d, d1) | Schwarz | 81–160 | 5372 | 0,015 [0,007; 0,033] | 0,015 [0,007; 0,033] | 100,0 % | 0,0 % | 100,0 % | 27,4 % | 2,0 [0,0; 4,0] | 0,7 % |
| GNU Go | N | neu (d, d1) | Schwarz | 161–240 | 2986 | 0,020 [0,007; 0,047] | 0,020 [0,007; 0,047] | 100,0 % | 0,0 % | 100,0 % | 26,9 % | 2,0 [0,0; 5,0] | 1,8 % |
| GNU Go | N | neu (d, d1) | Schwarz | ab 241 | 226 | 0,023 [0,008; 0,050] | 0,023 [0,008; 0,050] | 100,0 % | 0,0 % | 100,0 % | 16,4 % | 3,0 [1,0; 6,0] | 2,2 % |
| GNU Go | N | neu (d, d1) | Weiß | 81–160 | 5902 | 0,016 [0,007; 0,036] | 0,016 [0,007; 0,036] | 100,0 % | 0,0 % | 100,0 % | 9,9 % | 2,0 [1,0; 4,0] | 0,5 % |
| GNU Go | N | neu (d, d1) | Weiß | 161–240 | 3709 | 0,021 [0,008; 0,046] | 0,021 [0,008; 0,046] | 100,0 % | 0,0 % | 100,0 % | 17,7 % | 2,0 [1,0; 5,0] | 1,6 % |
| GNU Go | N | neu (d, d1) | Weiß | ab 241 | 406 | 0,023 [0,011; 0,046] | 0,023 [0,011; 0,046] | 100,0 % | 0,0 % | 100,0 % | 12,6 % | 2,0 [1,0; 5,0] | 1,2 % |
| GNU Go | P | schon Kind (c) | Schwarz | 81–160 | 2170 | 0,079 [0,036; 0,136] | 0,249 [0,199; 0,312] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [20,0; 37,0] | 37,4 % |
| GNU Go | P | schon Kind (c) | Schwarz | 161–240 | 2276 | 0,105 [0,054; 0,157] | 0,259 [0,210; 0,324] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [20,0; 37,0] | 35,6 % |
| GNU Go | P | schon Kind (c) | Schwarz | ab 241 | 467 | 0,099 [0,054; 0,163] | 0,280 [0,221; 0,354] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 28,0 [17,0; 39,0] | 30,4 % |
| GNU Go | P | schon Kind (c) | Weiß | 81–160 | 2065 | 0,082 [0,038; 0,141] | 0,242 [0,189; 0,309] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 26,0 [19,0; 35,0] | 38,8 % |
| GNU Go | P | schon Kind (c) | Weiß | 161–240 | 2310 | 0,104 [0,054; 0,156] | 0,253 [0,201; 0,318] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [19,0; 36,0] | 35,3 % |
| GNU Go | P | schon Kind (c) | Weiß | ab 241 | 620 | 0,097 [0,051; 0,149] | 0,257 [0,206; 0,325] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 24,0 [16,0; 35,0] | 28,7 % |
| GNU Go | P | neu (d, d1) | Schwarz | 81–160 | 5715 | 0,015 [0,007; 0,032] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | P | neu (d, d1) | Schwarz | 161–240 | 3099 | 0,025 [0,011; 0,050] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | P | neu (d, d1) | Schwarz | ab 241 | 356 | 0,026 [0,013; 0,050] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | P | neu (d, d1) | Weiß | 81–160 | 6022 | 0,016 [0,007; 0,036] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | P | neu (d, d1) | Weiß | 161–240 | 4056 | 0,024 [0,009; 0,048] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | P | neu (d, d1) | Weiß | ab 241 | 413 | 0,023 [0,007; 0,048] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| GNU Go | S | schon Kind (c) | Schwarz | 81–160 | 2826 | 0,083 [0,038; 0,142] | 0,246 [0,197; 0,309] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [21,0; 36,0] | 40,4 % |
| GNU Go | S | schon Kind (c) | Schwarz | 161–240 | 2417 | 0,101 [0,053; 0,157] | 0,253 [0,205; 0,318] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 28,0 [19,0; 37,0] | 35,6 % |
| GNU Go | S | schon Kind (c) | Schwarz | ab 241 | 486 | 0,100 [0,048; 0,154] | 0,269 [0,208; 0,343] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 26,0 [18,0; 37,0] | 30,7 % |
| GNU Go | S | schon Kind (c) | Weiß | 81–160 | 2629 | 0,081 [0,037; 0,142] | 0,243 [0,191; 0,308] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [20,0; 35,0] | 40,4 % |
| GNU Go | S | schon Kind (c) | Weiß | 161–240 | 2921 | 0,092 [0,048; 0,144] | 0,243 [0,193; 0,313] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 25,0 [18,0; 34,0] | 34,3 % |
| GNU Go | S | schon Kind (c) | Weiß | ab 241 | 753 | 0,090 [0,044; 0,160] | 0,251 [0,204; 0,319] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 25,0 [18,0; 35,0] | 33,7 % |
| GNU Go | S | neu (d, d1) | Schwarz | 81–160 | 4371 | 0,017 [0,007; 0,037] | 0,221 [0,179; 0,279] | 100,0 % | 99,3 % | 100,0 % | 0,0 % | 24,0 [19,0; 32,0] | 34,4 % |
| GNU Go | S | neu (d, d1) | Schwarz | 161–240 | 2369 | 0,029 [0,013; 0,051] | 0,220 [0,181; 0,282] | 100,0 % | 98,6 % | 100,0 % | 0,0 % | 24,0 [18,0; 32,0] | 30,9 % |
| GNU Go | S | neu (d, d1) | Schwarz | ab 241 | 206 | 0,036 [0,010; 0,072] | 0,223 [0,177; 0,285] | 100,0 % | 96,1 % | 100,0 % | 0,0 % | 23,0 [16,0; 31,0] | 30,6 % |
| GNU Go | S | neu (d, d1) | Weiß | 81–160 | 5035 | 0,018 [0,008; 0,039] | 0,216 [0,173; 0,272] | 100,0 % | 99,2 % | 100,0 % | 0,0 % | 23,0 [18,0; 30,0] | 33,6 % |
| GNU Go | S | neu (d, d1) | Weiß | 161–240 | 3063 | 0,027 [0,011; 0,053] | 0,216 [0,175; 0,279] | 100,0 % | 98,4 % | 100,0 % | 0,0 % | 23,0 [17,0; 31,0] | 29,1 % |
| GNU Go | S | neu (d, d1) | Weiß | ab 241 | 356 | 0,026 [0,010; 0,051] | 0,217 [0,180; 0,286] | 100,0 % | 98,0 % | 100,0 % | 0,0 % | 23,0 [15,8; 31,0] | 27,2 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Schwarz | 81–160 | 2270 | 0,062 [0,024; 0,126] | 0,062 [0,024; 0,126] | 0,0 % | 0,0 % | 100,0 % | 4,1 % | 7,0 [3,0; 15,0] | 7,9 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Schwarz | 161–240 | 2293 | 0,041 [0,015; 0,122] | 0,041 [0,015; 0,122] | 0,0 % | 0,0 % | 100,0 % | 13,7 % | 5,0 [1,0; 14,0] | 3,7 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Schwarz | ab 241 | 1768 | 0,062 [0,016; 0,145] | 0,062 [0,016; 0,145] | 0,0 % | 0,0 % | 100,0 % | 16,8 % | 6,0 [1,0; 17,0] | 3,8 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Weiß | 81–160 | 2112 | 0,068 [0,028; 0,131] | 0,068 [0,028; 0,131] | 0,0 % | 0,0 % | 100,0 % | 7,8 % | 8,0 [3,0; 17,0] | 6,5 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Weiß | 161–240 | 2488 | 0,057 [0,018; 0,126] | 0,057 [0,018; 0,126] | 0,0 % | 0,0 % | 100,0 % | 13,2 % | 6,0 [2,0; 15,0] | 4,5 % |
| Fuego (100 Spiele je Zug) | A | schon Kind (c) | Weiß | ab 241 | 1861 | 0,065 [0,019; 0,140] | 0,065 [0,019; 0,140] | 0,0 % | 0,0 % | 100,0 % | 14,3 % | 7,0 [1,0; 18,0] | 4,4 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Schwarz | 81–160 | 6068 | 0,010 [0,004; 0,024] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Schwarz | 161–240 | 5921 | 0,009 [0,004; 0,026] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Schwarz | ab 241 | 2518 | 0,010 [0,004; 0,033] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Weiß | 81–160 | 6435 | 0,011 [0,005; 0,027] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Weiß | 161–240 | 5692 | 0,011 [0,004; 0,030] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | A | neu (d, d1) | Weiß | ab 241 | 2461 | 0,010 [0,004; 0,029] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Schwarz | 81–160 | 2175 | 0,064 [0,026; 0,126] | 0,064 [0,026; 0,126] | 0,0 % | 0,0 % | 100,0 % | 2,6 % | 7,0 [3,0; 15,0] | 7,1 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Schwarz | 161–240 | 2298 | 0,046 [0,017; 0,132] | 0,046 [0,017; 0,132] | 0,0 % | 0,0 % | 100,0 % | 9,7 % | 5,0 [2,0; 15,0] | 4,4 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Schwarz | ab 241 | 1892 | 0,057 [0,018; 0,137] | 0,057 [0,018; 0,137] | 0,0 % | 0,0 % | 100,0 % | 14,6 % | 6,0 [1,0; 16,0] | 4,0 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Weiß | 81–160 | 2085 | 0,067 [0,028; 0,133] | 0,067 [0,028; 0,133] | 0,0 % | 0,0 % | 100,0 % | 6,8 % | 9,0 [3,0; 17,0] | 8,0 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Weiß | 161–240 | 2333 | 0,055 [0,017; 0,125] | 0,055 [0,017; 0,125] | 0,0 % | 0,0 % | 100,0 % | 18,0 % | 6,0 [1,0; 15,0] | 3,8 % |
| Fuego (100 Spiele je Zug) | N | schon Kind (c) | Weiß | ab 241 | 2089 | 0,068 [0,018; 0,141] | 0,068 [0,018; 0,141] | 0,0 % | 0,0 % | 100,0 % | 18,5 % | 7,0 [1,0; 17,0] | 3,4 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Schwarz | 81–160 | 6255 | 0,010 [0,004; 0,023] | 0,010 [0,004; 0,023] | 100,0 % | 0,0 % | 100,0 % | 11,6 % | 2,0 [1,0; 3,0] | 0,4 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Schwarz | 161–240 | 5856 | 0,010 [0,004; 0,027] | 0,010 [0,004; 0,027] | 100,0 % | 0,0 % | 100,0 % | 20,4 % | 1,0 [1,0; 3,0] | 0,5 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Schwarz | ab 241 | 2445 | 0,009 [0,004; 0,030] | 0,009 [0,004; 0,030] | 100,0 % | 0,0 % | 100,0 % | 29,1 % | 1,0 [0,0; 3,0] | 1,7 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Weiß | 81–160 | 6425 | 0,011 [0,005; 0,027] | 0,011 [0,005; 0,027] | 100,0 % | 0,0 % | 100,0 % | 26,3 % | 1,0 [0,0; 3,0] | 0,5 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Weiß | 161–240 | 5943 | 0,012 [0,005; 0,030] | 0,012 [0,005; 0,030] | 100,0 % | 0,0 % | 100,0 % | 29,6 % | 1,0 [0,0; 3,0] | 0,7 % |
| Fuego (100 Spiele je Zug) | N | neu (d, d1) | Weiß | ab 241 | 2474 | 0,011 [0,004; 0,037] | 0,011 [0,004; 0,037] | 100,0 % | 0,0 % | 100,0 % | 27,2 % | 1,0 [0,0; 4,0] | 1,7 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Schwarz | 81–160 | 1905 | 0,079 [0,033; 0,140] | 0,262 [0,210; 0,319] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 28,0 [21,0; 37,0] | 39,8 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Schwarz | 161–240 | 1557 | 0,089 [0,032; 0,155] | 0,276 [0,220; 0,343] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 30,0 [23,0; 40,0] | 37,3 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Schwarz | ab 241 | 1391 | 0,099 [0,036; 0,169] | 0,297 [0,234; 0,369] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 35,0 [25,0; 46,0] | 37,2 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Weiß | 81–160 | 1741 | 0,088 [0,038; 0,145] | 0,257 [0,203; 0,314] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 29,0 [21,0; 40,0] | 39,9 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Weiß | 161–240 | 1584 | 0,084 [0,032; 0,144] | 0,271 [0,212; 0,335] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 30,0 [22,0; 40,0] | 36,6 % |
| Fuego (100 Spiele je Zug) | P | schon Kind (c) | Weiß | ab 241 | 1728 | 0,086 [0,032; 0,155] | 0,287 [0,225; 0,365] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 33,0 [23,8; 44,0] | 34,3 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Schwarz | 81–160 | 6396 | 0,009 [0,004; 0,022] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Schwarz | 161–240 | 6475 | 0,010 [0,004; 0,026] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Schwarz | ab 241 | 2991 | 0,008 [0,004; 0,027] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Weiß | 81–160 | 6659 | 0,010 [0,004; 0,025] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Weiß | 161–240 | 6724 | 0,009 [0,004; 0,024] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | P | neu (d, d1) | Weiß | ab 241 | 2931 | 0,011 [0,005; 0,035] | – [–; –] | 0,0 % | 0,0 % | 0,0 % | – | – [–; –] | 0,0 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Schwarz | 81–160 | 2772 | 0,077 [0,032; 0,137] | 0,257 [0,207; 0,314] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 27,0 [20,0; 36,0] | 36,9 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Schwarz | 161–240 | 2790 | 0,084 [0,033; 0,145] | 0,262 [0,207; 0,327] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 29,0 [21,0; 38,0] | 35,6 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Schwarz | ab 241 | 2397 | 0,093 [0,042; 0,156] | 0,273 [0,214; 0,346] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 31,0 [22,0; 42,0] | 34,8 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Weiß | 81–160 | 2540 | 0,082 [0,036; 0,144] | 0,256 [0,205; 0,313] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 28,0 [21,0; 38,0] | 38,8 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Weiß | 161–240 | 2585 | 0,089 [0,038; 0,153] | 0,262 [0,208; 0,327] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 29,0 [22,0; 39,0] | 36,8 % |
| Fuego (100 Spiele je Zug) | S | schon Kind (c) | Weiß | ab 241 | 2385 | 0,094 [0,041; 0,156] | 0,275 [0,212; 0,348] | 0,0 % | 100,0 % | 100,0 % | 0,0 % | 32,0 [23,0; 43,0] | 32,9 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Schwarz | 81–160 | 4880 | 0,010 [0,004; 0,025] | 0,233 [0,187; 0,290] | 100,0 % | 99,6 % | 100,0 % | 0,0 % | 23,0 [18,0; 30,0] | 28,3 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Schwarz | 161–240 | 4309 | 0,013 [0,005; 0,033] | 0,232 [0,190; 0,297] | 100,0 % | 99,4 % | 100,0 % | 0,0 % | 25,0 [19,0; 33,0] | 24,4 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Schwarz | ab 241 | 1911 | 0,022 [0,008; 0,049] | 0,245 [0,193; 0,319] | 100,0 % | 98,3 % | 100,0 % | 0,0 % | 28,0 [20,0; 37,0] | 22,5 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Weiß | 81–160 | 5155 | 0,012 [0,005; 0,028] | 0,226 [0,181; 0,284] | 100,0 % | 99,5 % | 100,0 % | 0,0 % | 24,0 [18,0; 32,0] | 28,8 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Weiß | 161–240 | 4555 | 0,014 [0,006; 0,035] | 0,234 [0,187; 0,298] | 100,0 % | 99,4 % | 100,0 % | 0,0 % | 26,0 [19,0; 34,0] | 24,9 % |
| Fuego (100 Spiele je Zug) | S | neu (d, d1) | Weiß | ab 241 | 2170 | 0,019 [0,006; 0,047] | 0,248 [0,195; 0,319] | 100,0 % | 97,8 % | 100,0 % | 0,0 % | 29,0 [21,0; 39,0] | 22,4 % |

## Ausfälle und vollständige Vierergruppen

Alle Vergleiche verwenden nur Partienummern, die in **allen vier Armen** eines Gegners ausgewertet sind. Für die Vollständigkeit gilt allein die 98-%-Regel je Arm; alle übrigen Gültigkeitsbedingungen gelten unverändert.

| Gegner | Arm | KI | gespielt | nicht ausgewertet | nur wegen Ausfall in anderem Arm nicht in der Gruppe | Nummern | Gründe |
|---|---|---|---:|---:|---:|---|---|
| GNU Go | A | Schwarz | 240/240 | 0 | 0 | – | – |
| GNU Go | A | Weiß | 240/240 | 1 | 0 | 127 | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| GNU Go | N | Schwarz | 240/240 | 0 | 0 | – | – |
| GNU Go | N | Weiß | 240/240 | 1 | 0 | 127 | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| GNU Go | P | Schwarz | 240/240 | 0 | 0 | – | – |
| GNU Go | P | Weiß | 240/240 | 1 | 0 | 127 | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| GNU Go | S | Schwarz | 240/240 | 0 | 0 | – | – |
| GNU Go | S | Weiß | 240/240 | 1 | 0 | 127 | abgebrochen: GNU Go: genmove B → ? GNU Go beendet (code null, signal SIGSEGV)  (1) |
| Fuego (100 Spiele je Zug) | A | Schwarz | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | A | Weiß | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | N | Schwarz | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | N | Weiß | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | P | Schwarz | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | P | Weiß | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | S | Schwarz | 240/240 | 0 | 0 | – | – |
| Fuego (100 Spiele je Zug) | S | Weiß | 240/240 | 0 | 0 | – | – |

- GNU Go: **479 vollständige Vierergruppen** von 480 verwendet; alle Intervalle und Tests unten sind aus diesen Gruppen berechnet.
- Fuego (100 Spiele je Zug): **480 vollständige Vierergruppen** von 480 verwendet; alle Intervalle und Tests unten sind aus diesen Gruppen berechnet.

## Hauptvergleiche (gepaart, α = 0,05/6 je Test, Intervall 99,17 %)

| Gegner | Vergleich | verwendete Paare | Differenz [Intervall] | SD | t | p (zweiseitig) | Urteil |
|---|---|---:|---|---:|---:|---:|---|
| GNU Go | N − A | 479 | +0,7 [−5,2; +6,6] | 49,0 | 0,3 | 0,7603 | kein nachgewiesener Unterschied |
| GNU Go | S − N | 479 | +26,3 [+19,9; +32,6] | 52,2 | 11,0 | 2,9e-25 | S besser als N |
| GNU Go | P − A | 479 | +13,8 [+8,2; +19,5] | 46,8 | 6,5 | 2,5e-10 | P besser als A |
| Fuego (100 Spiele je Zug) | N − A | 480 | −0,9 [−6,9; +5,1] | 49,5 | -0,4 | 0,6935 | kein nachgewiesener Unterschied |
| Fuego (100 Spiele je Zug) | S − N | 480 | +30,4 [+23,3; +37,5] | 58,7 | 11,3 | 1,6e-26 | S besser als N |
| Fuego (100 Spiele je Zug) | P − A | 480 | +11,7 [+5,5; +18,0] | 51,7 | 5,0 | 9,1e-7 | P besser als A |

- GNU Go, N − A: kein nachgewiesener Unterschied; Intervall +0,7 [−5,2; +6,6], kein nachgewiesener Gewinn über +6,6 Punkte. Weder Wirkungslosigkeit noch Gleichwertigkeit (§6).
- Fuego (100 Spiele je Zug), N − A: kein nachgewiesener Unterschied; Intervall −0,9 [−6,9; +5,1], kein nachgewiesener Gewinn über +5,1 Punkte. Weder Wirkungslosigkeit noch Gleichwertigkeit (§6).

Grenze (§3): S − N umfasst die Anhebung neuer und schon vorhandener Kinder, P − A nur vorhandener; die beiden nicht voneinander abziehen. Für die Mittelwerte gilt auf denselben Gruppen exakt (N − A) + (S − N) = S − A; daraus folgt keine Zerlegung in unabhängige Mechanismen.

- GNU Go: (N − A) +0,7 + (S − N) +26,3 = +26,9; S − A +26,9.
- Fuego (100 Spiele je Zug): (N − A) −0,9 + (S − N) +30,4 = +29,5; S − A +29,5.

## Ergänzend, ohne Signifikanzurteil (95 %)

| Gegner | Vergleich | verwendete Paare | Differenz [95 %] | Vorzeichen besser/schlechter (p) | Siege nur erster / nur zweiter (McNemar p) |
|---|---|---:|---|---|---|
| GNU Go | N − A | 479 | +0,7 [−3,7; +5,1] | 218/246 (0,2100) | 9/10 (1,0000) |
| GNU Go | S − N | 479 | +26,3 [+21,6; +31,0] | 342/127 (7,8e-24) | 39/6 (5,4e-7) |
| GNU Go | P − A | 479 | +13,8 [+9,6; +18,0] | 282/191 (3,3e-5) | 29/8 (0,0008) |
| GNU Go | S − A | 479 | +26,9 [+22,3; +31,6] | 329/139 (7,9e-19) | 39/7 (1,8e-6) |
| GNU Go | S − P | 479 | +13,1 [+8,3; +17,9] | 295/181 (2,0e-7) | 36/25 (0,2000) |
| Fuego (100 Spiele je Zug) | N − A | 480 | −0,9 [−5,3; +3,6] | 218/243 (0,2636) | 45/38 (0,5104) |
| Fuego (100 Spiele je Zug) | S − N | 480 | +30,4 [+25,1; +35,6] | 327/144 (2,0e-17) | 128/29 (4,8e-16) |
| Fuego (100 Spiele je Zug) | P − A | 480 | +11,7 [+7,1; +16,4] | 273/194 (0,0003) | 80/33 (1,1e-5) |
| Fuego (100 Spiele je Zug) | S − A | 480 | +29,5 [+24,0; +35,0] | 322/152 (4,3e-15) | 138/32 (6,9e-17) |
| Fuego (100 Spiele je Zug) | S − P | 480 | +17,7 [+12,3; +23,2] | 285/188 (9,5e-6) | 109/50 (3,3e-6) |

### Nach Farbe der KI (95 %, beschreibend)

| Gegner | KI | Vergleich | Paare | Differenz [95 %] |
|---|---|---|---:|---|
| GNU Go | Schwarz | N − A | 240 | −0,9 [−6,4; +4,7] |
| GNU Go | Schwarz | S − N | 240 | +26,7 [+19,8; +33,6] |
| GNU Go | Schwarz | P − A | 240 | +12,0 [+6,0; +18,0] |
| GNU Go | Schwarz | S − A | 240 | +25,8 [+19,3; +32,4] |
| GNU Go | Schwarz | S − P | 240 | +13,8 [+6,3; +21,4] |
| GNU Go | Weiß | N − A | 239 | +2,2 [−4,7; +9,1] |
| GNU Go | Weiß | S − N | 239 | +25,8 [+19,5; +32,2] |
| GNU Go | Weiß | P − A | 239 | +15,6 [+9,7; +21,5] |
| GNU Go | Weiß | S − A | 239 | +28,1 [+21,4; +34,8] |
| GNU Go | Weiß | S − P | 239 | +12,4 [+6,4; +18,5] |
| Fuego (100 Spiele je Zug) | Schwarz | N − A | 240 | −3,6 [−10,1; +3,0] |
| Fuego (100 Spiele je Zug) | Schwarz | S − N | 240 | +26,9 [+19,9; +33,8] |
| Fuego (100 Spiele je Zug) | Schwarz | P − A | 240 | +8,2 [+2,2; +14,1] |
| Fuego (100 Spiele je Zug) | Schwarz | S − A | 240 | +23,3 [+16,3; +30,3] |
| Fuego (100 Spiele je Zug) | Schwarz | S − P | 240 | +15,1 [+8,8; +21,5] |
| Fuego (100 Spiele je Zug) | Weiß | N − A | 240 | +1,8 [−4,3; +7,8] |
| Fuego (100 Spiele je Zug) | Weiß | S − N | 240 | +33,9 [+26,0; +41,8] |
| Fuego (100 Spiele je Zug) | Weiß | P − A | 240 | +15,3 [+8,2; +22,4] |
| Fuego (100 Spiele je Zug) | Weiß | S − A | 240 | +35,7 [+27,1; +44,2] |
| Fuego (100 Spiele je Zug) | Weiß | S − P | 240 | +20,4 [+11,4; +29,3] |

### Siege in den vollständigen Vierergruppen (95 %, Clopper-Pearson)

| Gegner | A | N | P | S |
|---|---|---|---|---|
| GNU Go | 2,1 % [1,0 %; 3,8 %] | 1,9 % [0,9 %; 3,5 %] | 6,5 % [4,4 %; 9,1 %] | 8,8 % [6,4 %; 11,7 %] |
| Fuego (100 Spiele je Zug) | 12,9 % [10,0 %; 16,3 %] | 14,4 % [11,4 %; 17,8 %] | 22,7 % [19,0 %; 26,7 %] | 35,0 % [30,7 %; 39,5 %] |

