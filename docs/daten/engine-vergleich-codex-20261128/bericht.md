# Engine-Vergleich (getrennte Prozesse)

**GLEICH.** 26 Läufe, 1328 KI-Abfragen, davon 1328 mit Wurzelkindern: gewählter Zug, Wurzelkinder, Priors je Wurzelkind und Protokollfelder (fall, r, rn, nIdx, pG, pN, aufgenommen, angehoben, kinder, priorSumme) identisch; Priors vorhanden und endlich; Abdeckung erfüllt.


## Abdeckung je Arm

Verlangt: je Arm mindestens eine KI-Abfrage ab Zug 81 und die Fälle c, d.

| Arm | Läufe | davon mit Abfrage im Fenster | Abfragen im Fenster | Fälle | fehlende Fälle | Ergebnis |
|---|---:|---:|---:|---|---|---|
| A | 8 | 8 | 200 | c 97, c1 3, d 100 | – | erfüllt |
| S | 8 | 8 | 22 | c 10, c1 1, d 11 | – | erfüllt |
| ZS | 8 | 8 | 16 | c 10, c1 1, d 5 | – | erfüllt |

## Je Replay

Das Nachspielen folgt den Archivzügen und fragt die KI nur bis zu ihrer ersten Abweichung vom Archivzug. Verglichen werden die KI-Abfragen bis dahin.

| Partie | Arm | Rang | KI-Abfragen alt / neu | davon ab Zug 81 | erste Archivabweichung (alt) | erste Archivabweichung (neu) | Ergebnis |
|---:|---|---:|---|---:|---|---|---|
| 1 | - | – | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 1 | A | 5 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 1 | S | 5 | 41 / 41 | 1 | Zug 82: Archiv O2, KI S13 | Zug 82: Archiv O2, KI S13 | gleich |
| 1 | ZS | 5 | 41 / 41 | 1 | Zug 82: Archiv O2, KI K2 | Zug 82: Archiv O2, KI K2 | gleich |
| 1 | A | 16 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 1 | S | 16 | 42 / 42 | 2 | Zug 84: Archiv F12, KI O12 | Zug 84: Archiv F12, KI O12 | gleich |
| 1 | ZS | 16 | 45 / 45 | 5 | Zug 90: Archiv S6, KI K2 | Zug 90: Archiv S6, KI K2 | gleich |
| 1 | A | 17 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 1 | S | 17 | 41 / 41 | 1 | Zug 82: Archiv O2, KI S13 | Zug 82: Archiv O2, KI S13 | gleich |
| 1 | ZS | 17 | 41 / 41 | 1 | Zug 82: Archiv O2, KI N10 | Zug 82: Archiv O2, KI N10 | gleich |
| 1 | A | 30 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 1 | S | 30 | 42 / 42 | 2 | Zug 84: Archiv F12, KI S13 | Zug 84: Archiv F12, KI S13 | gleich |
| 1 | ZS | 30 | 42 / 42 | 2 | Zug 84: Archiv F12, KI S13 | Zug 84: Archiv F12, KI S13 | gleich |
| 2 | - | – | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 2 | A | 5 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 2 | S | 5 | 47 / 47 | 7 | Zug 93: Archiv F2, KI G2 | Zug 93: Archiv F2, KI G2 | gleich |
| 2 | ZS | 5 | 44 / 44 | 4 | Zug 87: Archiv D6, KI B14 | Zug 87: Archiv D6, KI B14 | gleich |
| 2 | A | 16 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 2 | S | 16 | 41 / 41 | 1 | Zug 81: Archiv E8, KI E5 | Zug 81: Archiv E8, KI E5 | gleich |
| 2 | ZS | 16 | 41 / 41 | 1 | Zug 81: Archiv E8, KI E5 | Zug 81: Archiv E8, KI E5 | gleich |
| 2 | A | 17 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 2 | S | 17 | 41 / 41 | 1 | Zug 81: Archiv E8, KI G16 | Zug 81: Archiv E8, KI G16 | gleich |
| 2 | ZS | 17 | 41 / 41 | 1 | Zug 81: Archiv E8, KI G7 | Zug 81: Archiv E8, KI G7 | gleich |
| 2 | A | 30 | 65 / 65 | 25 | keine (bis zum Ende) | keine (bis zum Ende) | gleich |
| 2 | S | 30 | 47 / 47 | 7 | Zug 93: Archiv F2, KI P4 | Zug 93: Archiv F2, KI P4 | gleich |
| 2 | ZS | 30 | 41 / 41 | 1 | Zug 81: Archiv E8, KI E5 | Zug 81: Archiv E8, KI E5 | gleich |

**Nicht prüfbare Läufe:** keine. Sie zählen nicht zur Abdeckung; reicht die Abdeckung ohne sie nicht, lautet das Ergebnis KEIN URTEIL.

Einstellungen: Archiv g-D.jsonl.gz, Partien 1, 2, bis Zug 130, Ränge 5, 16, 17, 30, Arme A, S, ZS, Eingriff ab Zug 81.
