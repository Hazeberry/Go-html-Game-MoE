# Laufkämpfe lesen: Diagnose und vorab festgelegte Messung

**Status: festgelegt am 06.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

[`laufkampf.md`](laufkampf.md) §8 endete mit dem Befund, dass die Bewertung
gefährdete Gruppen erkennt, die Gruppen aber trotzdem sterben. Ob ein Ausbruch
durchkommt, ist eine Lesefrage (Leitern, Netze, Schlagabtausch), und die Suche
liest bei 120 Simulationen nicht. [`gegnerwert.md`](gegnerwert.md) §6 kam zum
selben Schluss: Die Rettung aus dem Atari in die Suche zu heben hilft nicht,
weil Atari selten der Engpass ist.

## 2. Der Leser

`leseAngriff(board, a)` und `leseVerteidigung(board, a)` in `index.html`
sind eine kleine Tiefensuche Angriff gegen Verteidigung für die Kette auf `a`:

- **Angreifer:** spielt auf die Freiheiten, bei zwei Freiheiten in den ersten
  beiden Ebenen zusätzlich auf deren leere Nachbarn (Netz). Drei Freiheiten
  greift er nur an der Wurzel an.
- **Verteidiger:** spielt auf die Freiheiten und auf die Freiheiten
  angrenzender gegnerischer Ketten mit höchstens zwei Freiheiten.
- **Abbruch:** Eine Kette mit drei Freiheiten gilt nach der Wurzel als
  entkommen (Leiter-Annahme). Tiefe 40 Halbzüge, 4 000 Knoten. Ko wird nicht
  beachtet.

Tests in `tests/lesen.js`: Leiter ohne Brecher gefangen, mit Brechern auf
beiden Wegen nicht (mit nur einem läuft sie in die andere Richtung), Atari in
der Ecke unrettbar. Eine Leiter liest er in etwa 0,2 ms.

Eine strengere Fassung (entkommen erst ab vier Freiheiten) traf GNU Go öfter
(63 statt 53 %), schaffte aber die einfache Leiter nicht mehr im Budget und
wurde verworfen.

## 3. Diagnose

`auswertung/laufkampf-lesen.js` geht jeden Schlag ab fünf Steinen bis zu 40
Halbzüge zurück. An jeder Stellung, in der das Opfer am Zug war, fragt es den
Leser: bedroht, rettbar, gerettet durch den gespielten Zug? Es zählt die
letzte bedrohte und rettbare Stellung, deren Zug nicht rettete.

**Selbstspiel**, 720 Partien aus [`gegnerwert.md`](gegnerwert.md) §6:

| | Verluste ab 5 Steinen | mit verpasster Rettung laut Leser |
|---|---:|---:|
| beide Arme | 2 766 (25 277 Steine) | 2 317 (83,8 %, 20 906 Steine) |

- Abstand zwischen verpasster Rettung und Schlag: Median 5 Halbzüge.
- Freiheiten der Kette bei der verpassten Rettung: 1 bei 109, 2 bei 1 029,
  3 bei 1 179 Verlusten. Nur 5 % standen im Atari, deshalb half
  `krisenKandidaten` nicht.

**Gegenprobe mit GNU Go 3.8** (`attack`, `defend`, `does_defend`) an 209
zufällig gezogenen verpassten Rettungen:

| GNU Go urteilt | Fälle |
|---|---:|
| fangbar | 208 |
| fangbar und rettbar, gespielter Zug rettet nicht | **111 (53 %)** |
| fangbar, nicht rettbar (unser Leser zu optimistisch) | 97 |

Hochgerechnet hatten damit rund 44 % aller großen Gruppenverluste wenige
Züge vorher eine echte Rettung, die die KI nicht spielte.

**Partien des Menschen** (Weiß = KI, Verluste der KI):

| Partie | Verlust | verpasste Rettung |
|---|---|---|
| 3 | Zug 225, 8 Steine | Zug 220, 3 Freiheiten, gespielt Q17 |
| 4 | Zug 117, 6 Steine | Zug 114, 2 Freiheiten, gespielt M10 |
| 6 | Zug 137, 12 Steine | Zug 134, 2 Freiheiten, gespielt O15 |
| 7, 8 | 13 bzw. 20 Steine | keine, die Steine waren schon tot |

## 4. Der Schalter und der Pilot

**`leseRettung`**: Eigene Ketten ab zwei Steinen mit höchstens drei
Freiheiten, die der Leser fangen kann. Jeder Zug, nach dem er sie nicht mehr
fängt, kommt mit dem Wert des besten Kandidaten + 1 an die Spitze. Stufe 2:
zusätzlich Züge, nach denen eine gegnerische fangbare Kette nicht mehr zu
retten ist. Die Pass-Prüfung sieht die Werte ohne diesen Aufschlag. Kosten
etwa 1 ms je Zug.

Pilot, gegen den Default:

| | Selbstspiel, 40 Partien | Schläge ab 5 Steinen A : B | gegen GNU Go, 16 Paare, Endstand B − A |
|---|---:|---:|---:|
| Stufe 1 | **33 : 7 für B** | 87 : 54 | −21,1 (p = 0,50) |
| Stufe 2 | 24 : 16 für B | 46 : 56 | −39,0 (p = 0,32) |

Gegen GNU Go Stufe 1 ändert sich nichts Messbares; GNU Go stellt auf dieser
Stufe wenige taktische Fallen. Gemessen wird Stufe 1.

## 5. Messung

**Arme:** A Default, B `leseRettung` = 1.

**M1, Selbstspiel, primär:** 720 Partien, acht Teilläufe zu je 90.

```bash
for s in 20261070 20261071 20261072 20261073 20261074 20261075 20261076 20261077; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,leseRettung=1 \
    --roh lesen-$s.jsonl --json lesen-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

**M2, gegen GNU Go, Kontrolle:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, ganze Partien bis 600 Züge, je Arm 60 Partien mit
denselben Seeds (`--seed 101`, vier Teilläufe zu je 15), Endpunkt gepaarte
Differenz B − A des Endstands, zweiseitig, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 | M2 | Folge |
|---|---|---|
| B über 50 %, p < 0,05 | nicht signifikant schlechter | Default `leseRettung` = 1 |
| B über 50 %, p < 0,05 | signifikant schlechter | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:** Schläge ab 5 Steinen je Arm; verpasste
Rettungen je Arm nach §3; M2 nach Zug 120 und 200.

**Grenzen:**

- Der Leser beachtet keinen Ko.
- Er ist beim Verteidiger optimistisch: Drei Freiheiten nach der Wurzel
  gelten als entkommen. Eine als Rettung gehobene Kandidatenkette kann also
  trotzdem sterben.
- Gemessen wird mit 120 Simulationen; Menschen spielen mit 300 bis 1 300.

---

## 6. Nachtrag: Ergebnis, kein Default (06.10.2026)

Gelaufen auf dem Merge-Commit `3f6db6d`, ohne Unterbrechung. Daten:
`daten/lesen-20261070.json` bis `…77.json` (Hash-Listen) und
`daten/lesen-gnugo.json`.

**M1, Selbstspiel (primär):** B gewinnt **452 von 720 Partien, 62,8 %**
(z = 6,86, p = 7 · 10⁻¹², 95-%-KI 59,2–66,3 %, rund +91 Elo). Alle acht
Teilläufe liegen über 50 %:

| Teillauf | 1070 | 1071 | 1072 | 1073 | 1074 | 1075 | 1076 | 1077 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Siegrate B | 65,6 % | 65,6 % | 56,7 % | 60,0 % | 58,9 % | 58,9 % | 67,8 % | 68,9 % |

**M2, gegen GNU Go (Kontrolle), 60 Paare:**

| | A | B | B − A |
|---|---:|---:|---|
| **Endstand** | −143,3 | −173,8 | **−30,5** (SD 90,0), **p = 0,011** |
| nach Zug 120 | +15,1 | +19,0 | +3,9, p = 0,18 |
| nach Zug 200 | −80,8 | −88,3 | −7,4, p = 0,21 |

B ist im Endstand in 25 von 60 Paaren besser, im Median um 6 Punkte
schlechter. Die B-Partien dauern länger (Ø 326 gegen 309 Züge). GNU Go gab in
beiden Armen je dreimal auf.

**Entscheidung nach §5: kein Default.** M1 ist signifikant besser, M2
signifikant schlechter. Das ist genau der Fall, der zu untersuchen ist.
`leseRettung` bleibt 0 und steht jetzt im Dashboard.

**Sekundär:**

- Schläge ab 5 Steinen: A 1 451, B 1 244. Geschlagene Steine insgesamt:
  A 22 002, B 19 206.
- Verpasste Rettungen nach §3: A 1 189 von 1 451 Verlusten (81,9 %),
  B 969 von 1 244 (77,9 %). Auch B verpasst also viele. Der Schalter hebt
  die Rettung an die Spitze der Kandidaten, gespielt wird sie aber nur, wenn
  die Suche sie wählt. Ketten mit einem Stein erfasst er nicht.

**Lesart.** Im Selbstspiel greift der Gegner bedrohte Ketten konsequent an,
dort lohnt jede Rettung. GNU Go auf Stufe 1 tut das seltener. Der Verlust
entsteht dort erst nach Zug 200, also im Endspiel. Wahrscheinlich rettet B
dort kleine Ketten, die GNU Go nicht verfolgt hätte, und lässt dafür größere
Punkte liegen. Naheliegende nächste Schritte, ungemessen:

- eine Mindestgröße der geretteten Kette (etwa ab 4 Steinen)
- den Schalter nur vor dem Endspiel wirken lassen
- den Wert der Rettung gegen den besten anderen Zug abwägen, statt sie
  immer an die Spitze zu setzen
