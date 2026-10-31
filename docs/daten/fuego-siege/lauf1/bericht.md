# Siege gegen Fuego ohne Vorgabe

Seed 228, Fuego mit 50 Spielen je Zug, ohne Vorgabe, je Arm 960 Partien.

Lauf gültig: alle Arme vollständig, genug Paare, Kontrolle bestanden.

Quoten:

| Arm | gewertet | Siege | Quote | 95 % | KI Schwarz | KI Weiß |
|---|---:|---:|---:|---|---:|---:|
| D | 960 | 461 | 48,0 % | 44,8 % bis 51,2 % | 35,4 % | 60,6 % |
| M0 | 960 | 338 | 35,2 % | 32,2 % bis 38,3 % | 29,4 % | 41,0 % |
| M50 | 960 | 379 | 39,5 % | 36,4 % bis 42,7 % | 37,1 % | 41,9 % |

Gepaart gegen D (alpha 0,025, exakter McNemar-Test):

| Arm | Paare | nur Arm | nur D | Differenz (Prozentpunkte) | p | Urteil | Endstand Arm − D (97,5 %) |
|---|---:|---:|---:|---:|---:|---|---|
| M0 | 960 | 180 | 303 | −12,8 | 2,4e-8 | **D gewinnt öfter** | −15,8 (−21,1 bis −10,5) |
| M50 | 960 | 196 | 278 | −8,5 | 0,0002 | **D gewinnt öfter** | −10,2 (−15,8 bis −4,7) |

**Folge:** Default bleibt 1.

Kontrolle: 20 von 20 Partien Zug für Zug gleich (erwartet 20 von 20).
