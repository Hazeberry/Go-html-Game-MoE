# Skalierung auf dem heutigen Default — Stufe 1

**GÜLTIG.**
Commit 98aa1ad586c9de23f64ca76c26af1d7b199b7b3a · Engine-Blöcke wie in §6 · Zuglimit 600 · Komi 7,5 · Aufgabe aus.

## F1: Gewinn je Verdopplung

| Vergleich | Siege B : A | Siegrate B (95 %) | p | Elo (95 %) |
|---|---:|---|---:|---|
| K1 120 → 240 | 665 : 565 | 54,1 % [51,2 %; 56,9 %] | 0,0047 | **+28,3** [+8,6; +48,1] |
| K2 240 → 480 | 669 : 561 | 54,4 % [51,6 %; 57,2 %] | 0,0023 | **+30,6** [+10,8; +50,4] |

- K1: **Eine Verdopplung von 120 auf 240 Simulationen bringt dem heutigen Default nachweisbar Stärke: +28,3 Elo [+8,6; +48,1].**
- K2: **Eine Verdopplung von 240 auf 480 Simulationen bringt dem heutigen Default nachweisbar Stärke: +30,6 Elo [+10,8; +50,4].**

## F2: Abflachung

D = Elo(K1) − Elo(K2) = −2,3 Elo, 95 % genähert [−29,8; +25,3]
Exakter zweiseitiger Fisher-Test auf die Siege von B in K1 und K2: p = 0,9034 (alpha 0,05)

**Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (−2,3 Elo [−29,8; +25,3]). Die Messung war so bemessen, dass sie eine Abflachung von 40 Elo mit rund 80 % erkannt hätte.**

## Nebenmaße, beschreibend (§5.4)

- K1: B als Schwarz 359/615, als Weiß 306/615 · Partielänge Mittel 373,5, Median 373,0 · am Zuglimit 0 (0,0 %) · Anomalien 0 · Simulationen je Zug im Mittel A 111,5, B 223,2 · 0,62 min je Partie
- K2: B als Schwarz 304/615, als Weiß 365/615 · Partielänge Mittel 377,7, Median 377,5 · am Zuglimit 0 (0,0 %) · Anomalien 0 · Simulationen je Zug im Mittel A 223,2, B 446,8 · 1,06 min je Partie

## Kostenschätzung für Stufe 2 (§7.3)

Laufzeit je Partie ≈ 0,183 + 2,443 · 10⁻³ · mittlere Simulationen je Zug (Minuten).

| K3 = N → 2N | min je Partie | Partien je Teillauf | Teilläufe | Rechenstunden | Wanduhr bei 20 Jobs |
|---|---:|---:|---:|---:|---:|
| 1000 → 2000 | 3,85 | 30 | 41 | 78,9 | 5,8 h |
| 1500 → 3000 | 5,68 | 30 | 41 | 116,4 | 8,5 h |
| 2000 → 4000 | 7,51 | 10 | 123 | 154,0 | 8,8 h |
| 2500 → 5000 | 9,34 | 10 | 123 | 191,5 | 10,9 h |
| **2600 → 5200 (N aus Stufe G)** | 9,71 | 10 | 123 | 199,1 | 11,3 h |
| 3000 → 6000 | 11,18 | 10 | 123 | 229,1 | 13,0 h |
| 3500 → 7000 | 13,01 | 10 | 123 | 266,7 | 15,2 h |
| 4000 → 8000 | 14,84 | 10 | 123 | 304,2 | 17,3 h |

Eine Schätzung, kein Messwert (§7.3). Ist sie zu teuer, wird Stufe 2 neu festgelegt, nicht verkleinert.

## Teilläufe

- K1: 11250001 (47,5 min), 11250002 (48,4 min), 11250003 (51,2 min), 11250004 (51,8 min), 11250005 (51,0 min), 11250006 (50,4 min), 11250007 (48,8 min), 11250008 (47,5 min), 11250009 (50,5 min), 11250010 (48,1 min), 11250011 (61,1 min), 11250012 (60,0 min), 11250013 (47,7 min), 11250014 (51,7 min), 11250015 (50,6 min)
- K2: 11250016 (98,8 min), 11250017 (84,2 min), 11250018 (83,1 min), 11250019 (85,4 min), 11250020 (83,9 min), 11250021 (82,7 min), 11250022 (81,8 min), 11250023 (80,7 min), 11250024 (80,2 min), 11250025 (84,7 min), 11250026 (112,6 min), 11250027 (82,0 min), 11250028 (102,0 min), 11250029 (81,7 min), 11250030 (83,5 min)
