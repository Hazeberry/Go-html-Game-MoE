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
