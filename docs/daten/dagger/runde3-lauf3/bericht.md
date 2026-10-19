# Datenaggregation, Runde 3

## Pilot gegen GNU Go (Endstand, gepaart nach Partienummer)

| Arm | Partien | Endstand Ø | Siege |
|---|---:|---:|---:|
| A | 60 | 27,7 | 40 |
| VOR | 60 | 20,7 | 35 |
| NEU | 60 | 22,0 | 36 |

| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---:|---|---:|---|---|---:|
| **NEU − A** | 60 | **−5,7** | [−20,4; +9,0] | 0,4438 | −0,3 / −11,0 | 36 gegen 40 | +1,5 |
| **VOR − A** | 60 | **−7,0** | [−25,2; +11,2] | 0,4445 | −5,5 / −8,5 | 35 gegen 40 | +0,4 |
| **NEU − VOR** | 60 | **+1,3** | [−12,1; +14,8] | 0,8436 | +5,1 / −2,5 | 36 gegen 35 | +1,2 |

## Trifft die Tabelle GNU Gos Zug auf den eigenen Stellungen?

```
Stellungen der Partien von NEU (Pilot, Seed wie oben), Tabelle der Runde davor (VOR):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               1928     22.4          24.3         67.9       78.9       24.7
NEU           Zug 81–160         1111     21.1          23.1         60.9       74.5       23.9
NEU           Zug 161–200         349     20.9          20.9         77.4       81.1       22.3
NEU           ab Zug 201          468     26.8          29.7         77.6       87.8       28.4

dieselben Stellungen, neue Tabelle (NEU):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               1928     22.4          25.6         67.9       86.6       24.7
NEU           Zug 81–160         1111     21.1          24.5         60.9       87.6       23.9
NEU           Zug 161–200         349     20.9          22.9         77.4       81.9       22.3
NEU           ab Zug 201          468     26.8          30.3         77.6       87.8       28.4
```

## Lernen

```
entw-b: 7944 Stellungen, 1456543 Kandidaten, 5059 Merkmalswerte, ohne Liste: 0
frueher1: 17881 Stellungen, 3039159 Kandidaten, 5389 Merkmalswerte, ohne Liste: 0
frueher2: 16541 Stellungen, 2879839 Kandidaten, 5244 Merkmalswerte, ohne Liste: 0
pruef: 16228 Stellungen, 2899200 Kandidaten, 4966 Merkmalswerte, ohne Liste: 0
runde: 16408 Stellungen, 2907546 Kandidaten, 5261 Merkmalswerte, ohne Liste: 0

Tabelle VOR auf den eigenen Stellungen (Daten dieser Runde):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              16303     22.2          24.7         65.2       77.4       24.6
D1            Zug 81–160         9455     20.8          24.0         59.3       75.3       24.2
D1            Zug 161–200        3584     22.4          22.9         66.7       73.2       22.9
D1            ab Zug 201         3264     25.9          28.9         80.6       88.1       27.7

Tabelle NEU auf denselben Stellungen (hat sie mitgelernt, also zu günstig):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              16303     22.2          27.9         65.2       89.5       24.6
D1            Zug 81–160         9455     20.8          26.0         59.3       88.2       24.2
D1            Zug 161–200        3584     22.4          27.7         66.7       87.7       22.9
D1            ab Zug 201         3264     25.9          33.7         80.6       95.3       27.7
```
