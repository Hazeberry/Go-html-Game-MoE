# Datenaggregation, Runde 2

## Pilot gegen GNU Go (Endstand, gepaart nach Partienummer)

| Arm | Partien | Endstand Ø | Siege |
|---|---:|---:|---:|
| A | 60 | 21,9 | 38 |
| VOR | 60 | 22,7 | 37 |
| NEU | 60 | 25,9 | 33 |

| Vergleich (Endstand) | Paare | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---:|---|---:|---|---|---:|
| **NEU − A** | 60 | **+4,0** | [−14,8; +22,8] | 0,6719 | −6,6 / +14,6 | 33 gegen 38 | +2,8 |
| **VOR − A** | 60 | **+0,7** | [−15,4; +16,9] | 0,9279 | −12,1 / +13,6 | 37 gegen 38 | +1,2 |
| **NEU − VOR** | 60 | **+3,3** | [−9,8; +16,3] | 0,6175 | +5,5 / +1,0 | 33 gegen 37 | +1,6 |

## Trifft die Tabelle GNU Gos Zug auf den eigenen Stellungen?

```
Stellungen der Partien von NEU (Pilot, Seed wie oben), Tabelle der Runde davor (VOR):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               2099     22.7          25.0         65.5       76.6       24.4
NEU           Zug 81–160         1179     22.7          26.5         62.3       77.4       26.1
NEU           Zug 161–200         455     19.8          19.6         65.2       65.5       17.6
NEU           ab Zug 201          465     25.6          26.7         74.0       85.6       26.7

dieselben Stellungen, neue Tabelle (NEU):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
NEU           alle               2099     22.7          24.8         65.5       78.5       24.4
NEU           Zug 81–160         1179     22.7          26.4         62.3       78.2       26.1
NEU           Zug 161–200         455     19.8          18.7         65.2       70.8       17.6
NEU           ab Zug 201          465     25.6          26.9         74.0       86.9       26.7
```

## Lernen

```
entw-b: 7944 Stellungen, 1456543 Kandidaten, 5059 Merkmalswerte, ohne Liste: 0
frueher1: 17881 Stellungen, 3039159 Kandidaten, 5389 Merkmalswerte, ohne Liste: 0
pruef: 16228 Stellungen, 2899200 Kandidaten, 4966 Merkmalswerte, ohne Liste: 0
runde: 16541 Stellungen, 2879839 Kandidaten, 5244 Merkmalswerte, ohne Liste: 0

Tabelle VOR auf den eigenen Stellungen (Daten dieser Runde):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              16365     23.5          26.2         73.1       83.1       25.4
D1            Zug 81–160         9272     22.2          26.4         68.3       83.2       25.9
D1            Zug 161–200        3429     23.3          23.9         75.6       79.7       24.0
D1            ab Zug 201         3664     26.9          27.7         82.9       86.1       25.3

Tabelle NEU auf denselben Stellungen (hat sie mitgelernt, also zu günstig):
Rang von GNU Gos Zug in der Wurzelliste (Wert ohne Muster + 200 × Muster), in %, Stellungen mit der KI am Zug
Menge         Phase          Stellungen   heute Rang 1  neu Rang 1   heute ≤ 16  neu ≤ 16   gespielter Zug = GNU Go
D1            alle              16365     23.5          31.9         73.1       88.6       25.4
D1            Zug 81–160         9272     22.2          29.9         68.3       86.4       25.9
D1            Zug 161–200        3429     23.3          31.2         75.6       86.5       24.0
D1            ab Zug 201         3664     26.9          37.5         82.9       96.3       25.3
```
