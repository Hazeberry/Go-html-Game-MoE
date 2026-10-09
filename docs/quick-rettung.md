# Rettungsbonus in quickEval: Schalter und Pilot

**Stand: 09.10.2026, Pilot.** Eine Messung ist noch nicht festgelegt. Kommt
sie, steht sie als eigener Abschnitt darunter, vor dem Lauf.

---

## 1. Anlass

[`verschenkt-warum.md`](verschenkt-warum.md) §2: `quickEval` wählt die Züge
der Rollouts und die Kinder innerer Knoten der Suche. Sie gibt +80 je
Nachbarstein einer eigenen Kette mit höchstens zwei Freiheiten, auch wenn die
Kette nach dem Zug genauso schwach bleibt. So verlängern beide Seiten in Suche
und Rollouts schwache Ketten, und die Bewertung der Stellungen hängt an
solchen Rettungsläufen.

Die beiden anderen Hebel aus der Diagnose sind gemessen:
- `gebietFreiheit`: +19,5, nicht signifikant, kein Default
  ([`gebiet-freiheit.md`](gebiet-freiheit.md))
- `wurzelFrisch`: +25,7, Default ([`wurzel-frisch.md`](wurzel-frisch.md))

## 2. Der Schalter

**`quickRettung`**: Der Bonus von +80 je schwachem Nachbarstein zählt nur
noch, wenn die eigene Kette nach dem Zug mindestens drei Freiheiten hat, die
Rettung also wirkt. Alles andere an `quickEval` bleibt. Bei 0 rechnet
`quickEval` bitgenau wie vorher, nachgerechnet an allen freien Punkten
echter Stellungen in `tests/quick-rettung.js`.

## 3. Pilot

20 Partien gegen GNU Go (Stufe 1, neun Vorgabesteine, 120 Simulationen,
Seed 131, Partien 1–20). Gepaart mit dem heutigen Default, also Arm B aus
`daten/wurzel-gnugo.json`. Vier Default-Partien kamen mit dem neuen Code
exakt wie gespeichert heraus.

| | Default | `quickRettung` 1 |
|---|---:|---:|
| Endstand | −64,8 | −39,2 |
| B − A | | **+25,6** (SD 53,0, t = 2,16), besser in 14, schlechter in 6 |
| nach Zug 120 / 200 | | +3,6 / +7,9 |
| Partielänge | Ø 261 | Ø 244 |
| GNU Go gibt auf | 2 | 4 |
| verschenkte eigene Züge ab Zug 100, je Partie | 32,6 | 29,6 |

Der Vorteil entsteht vor allem nach Zug 200. Mit 20 Partien ist das ein
Pilot: Die Piloten der letzten Messungen lagen jeweils über dem späteren
Ergebnis (+40,4 → +25,7 bei `wurzelFrisch`, +22,1 → +19,5 bei
`gebietFreiheit`).

## 4. Nächster Schritt

Eine Messung im bewährten Ablauf, vorab festgelegt, mit neuem Seed:
- M1 gegen GNU Go als Hauptendpunkt, 60 Paare
- M2 Selbstspiel als Kontrolle, 360 Partien
- Entscheidungsregel wie in [`endspiel-verlust.md`](endspiel-verlust.md) §4
