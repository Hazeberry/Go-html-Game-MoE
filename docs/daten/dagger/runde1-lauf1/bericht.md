# Datenaggregation, Runde 1

## Pilot gegen GNU Go (Endstand, gepaart nach Partienummer)

| Arm | Partien | Endstand Ø | Siege |
|---|---:|---:|---:|
| A | 60 | 24,0 | 35 |
| VOR | 60 | 2,2 | 26 |
| NEU | 60 | 25,1 | 40 |

| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---:|---|---:|---|---|---:|
| **NEU − A** | 60 | **+1,1** | [−13,7; +15,8] | 0,8871 | −5,6 / +7,7 | 40 gegen 35 | +3,9 |
| **VOR − A** | 60 | **−21,8** | [−36,2; −7,4] | 0,0036 | −22,6 / −21,0 | 26 gegen 35 | −4,5 |
| **NEU − VOR** | 60 | **+22,9** | [+11,1; +34,6] | 0,0003 | +17,0 / +28,7 | 40 gegen 26 | +8,4 |

- Kontrolle gegen den Container-Pilot, Arm A (dort A): 60 von 60 Partien mit gleichem Endstand und gleicher Zugzahl
- Kontrolle gegen den Container-Pilot, Arm VOR (dort 200): 60 von 60 Partien mit gleichem Endstand und gleicher Zugzahl

## Trifft die Tabelle GNU Gos Zug auf den eigenen Stellungen?

```
Stellungen der Partien von NEU (Pilot, Seed wie oben), Tabelle der Runde davor (VOR):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               1947     25.1          25.9         74.5       77.0       26.0
NEU           Zug 81–160         1166     25.5          27.2         68.2       78.4       27.6
NEU           Zug 161–200         425     19.8          21.4         81.1       71.9       21.4
NEU           ab Zug 201          356     30.3          27.2         87.1       78.7       26.4

dieselben Stellungen, neue Tabelle (NEU):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               1947     25.1          27.4         74.5       82.1       26.0
NEU           Zug 81–160         1166     25.5          28.2         68.2       82.2       27.6
NEU           Zug 161–200         425     19.8          21.9         81.1       78.7       21.4
NEU           ab Zug 201          356     30.3          31.5         87.1       86.0       26.4
```

## Lernen

```
entw-b: 7944 Stellungen, 1456543 Kandidaten, 5059 Merkmalswerte, ohne Liste: 0
pruef: 16228 Stellungen, 2899200 Kandidaten, 4966 Merkmalswerte, ohne Liste: 0
runde: 17881 Stellungen, 3039159 Kandidaten, 5389 Merkmalswerte, ohne Liste: 0

Tabelle VOR auf den eigenen Stellungen (Daten dieser Runde):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              17797     25.1          24.2         78.7       76.4       24.1
D1            Zug 81–160         9511     24.1          24.3         76.9       76.7       24.6
D1            Zug 161–200        3867     26.6          24.3         75.7       74.5       24.5
D1            ab Zug 201         4419     25.9          23.8         85.2       77.4       22.6

Tabelle NEU auf denselben Stellungen (hat sie mitgelernt, also zu günstig):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              17797     25.1          34.6         78.7       91.8       24.1
D1            Zug 81–160         9511     24.1          33.5         76.9       89.7       24.6
D1            Zug 161–200        3867     26.6          34.5         75.7       91.8       24.5
D1            ab Zug 201         4419     25.9          37.0         85.2       96.2       22.6
```
