<!-- Quelle: Job-Log des Actions-Laufs 42317041690 (Job 128232101736), Workflow passregel-zaehldiagnose.yml auf main am Merge-Commit
     358ca0951480d9b46e0b7e3f4e4b93b86487bdd9, 07.11.2026. Unten steht der Bericht des Werkzeugs unverändert, ohne Zeitstempel des Logs.
     NICHT gesichert: die Rohdaten des Artefakts 13551695622 (zaehldiagnose.json mit der vollständigen Zugfolge und allen Listen,
     gtp-protokoll.txt mit den unveränderten GTP-Antworten, apt-policy.txt, gnugo-version.txt). Das Artefakt war aus der
     Arbeitsumgebung nicht ladbar (Proxy). Einordnung des Befunds: docs/passregel-zaehldiagnose.md §8. -->
# Zähldiagnose

Einheit alte PWA|m1.jsonl.gz|206|341; KI S; Index 341 (0-basiert) ist der 342. Zug der Aufzeichnung; die Zugfolge enthält Index 0 bis 341.
Folge: 342 Züge, SHA-256 ca08970090e9fc458f40f5c3f8f8ab82fb6cf425a22ea7ae3585101f30fe60a0; Archiv gesamt 417 Züge.
Seed 432182360 (aus passregel-vergleich-v1|1|alte PWA|m1.jsonl.gz|206|341); GNU-Go-Argumente: --mode gtp --level 1 --chinese-rules --komi 7.5 --seed 432182360 --never-resign
GNU Go: GNU Go 3.8; Paket gnugo 3.8-11build2; Image 20261101.360.1; GTP name/version: GNU Go / 3.8
captures-Kalibrierung: gefangen-von. Auslösung (Stufe-A-Prüfung): Fläche 341, Territory 341.

**Diagnose gültig.**
Zwei Läufe mit demselben Seed, Rohantworten identisch: ja (360 Befehle).

## Ergebnis (Fläche)

- final_score roh: `= B+139.5` (Stand Schwarz − Weiß − Komi 139.5)
- Fläche aus der Tot-Liste (unsere Zählung): 136.5; Unterschied -3; **Abweichung reproduziert**
- Zählbestandteile (unsere Zählung): Schwarz Steine 150 + Gebiet 100 = 250; Weiß Steine 70 + Gebiet 36 = 106; neutrale Punkte 5; tote Steine Schwarz 1, Weiß 19
- Gefangene bisher Schwarz/Weiß 74/20 (GNU Go black/white 74/20); Territory aus Tot-Liste 128.5
- GNU Gos Listen (Anzahl Punkte): alive 220, dead 20, seki 0, wt 35, bt 84, dame 2
- Nachbildung aus GNU Gos Listen: Variante 1 (lebende Steine + Gebiet) Stand 121.5 (ungleich final_score); Variante 2 (mit Seki-Steinen) Stand 121.5 (ungleich)
- Neutrale Regionen (unsere Zählung): 5 Punkte, Rand SW: E19 F19 G19 H19 J19
- Tote Koordinaten (GNU Go): S18 N14 N13 Q12 Q11 T11 Q10 S10 T10 Q9 R9 S9 R8 S8 T8 M7 N7 S7 T6 M5
- Seki: –; Dame: E19 F19
- Punkte, an denen GNU Gos Gebiets- oder Dame-Klasse von unserem Besitzer abweicht (und Seki/unklassifiziert): 3
    - G19: GNU Go gebiet-S, unser Besitzer neutral
    - H19: GNU Go gebiet-S, unser Besitzer neutral
    - J19: GNU Go gebiet-S, unser Besitzer neutral

### Kreuztabelle GNU-Go-Klasse → unser Besitzer (Anzahl Punkte)

- dame → neutral: 2
- gebiet-S → S: 81
- gebiet-S → neutral: 3
- gebiet-W → W: 35
- lebend-S → S: 150
- lebend-W → W: 70
- tot-S → W: 1
- tot-W → S: 19

### Brett

    ...O.....X...XXO...
    .OO.OXXXX.XXXXOOOX.
    O..O.OOOOX.XOOOOOO.
    O.OO..OXOX.XXOXO.O.
    .OO.O.OXX.XXXXXXOOO
    ....OOX.X..XO.X.XXX
    ...OOXXXX..XOX.X.X.
    .OOXOOX..XXXX.XOX.X
    OOXXXXOXX.X..XXOXXO
    OX.XXOOXX.X.X.XOXOO
    XXXXOOX..XXXX.XOOO.
    ..XOOXXXX.X..XXXOOO
    XXO.OOXX..XOO.XXXO.
    .XOOO.OX..XXXX...XO
    X.XO..OXX.XO.XX..X.
    X.XO.O.OXX...XXXXXX
    .XXXOOOOX.XX..XX.XX
    ..X.XXOX.X..XX....X
    ...X.XXXX...X.XXX.X
