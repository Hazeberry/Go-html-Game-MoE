## Prüfstand

| Vorgabe | Partien | Siege der KI | Endstand Ø | SD | nach Zug 120 |
|---:|---:|---:|---:|---:|---:|
| 9 | 60 | 57 (95 %) | +61,1 | 29,9 | +83,8 |
| 6 | 60 | 32 (53 %) | +11,1 | 57,0 | +28,8 |
| 4 | 60 | 26 (43 %) | −11,3 | 51,1 | +8,4 |
| 2 | 60 | 2 (3 %) | −65,4 | 40,7 | −20,7 |

**Wahl nach §8:** 6 Vorgabesteine

## Laufzeit des Endspiel-Netzes

```
22 Stellungen (Zug 100, 150, 200 aus 8 Partien), Zeitbudget 1800 ms
Netz allein (Ebenen + Vorwärtsrechnung): Median 43 ms, größter Wert 76 ms
Ganzer Zug ohne Netz: Median 1814 ms, 4527 Simulationen
Ganzer Zug mit Netz:  Median 1855 ms, 4619 Simulationen
Unterschied: 41 ms je Zug, Simulationen 102 % von ohne Netz
```
