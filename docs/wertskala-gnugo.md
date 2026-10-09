# Wert-Skala gegen GNU Go: vorab festgelegte Nachprüfung

**Status: festgelegt am 09.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

`mctsValueScale` steht seit der ersten Messreihe auf 200 statt 350. Belegt
ist das nur im Selbstspiel: 65:35 über 100 gepaarte Partien, p = 0,0035
(README, „Belegte Ergebnisse“). Gegen einen fremden Gegner wurde der Wert nie
geprüft. Seitdem hat sich die Engine stark verändert (`gebietZug`,
`augenSchutz`, `passUnabwendbar`, `endTieBreak`).

Seit [`laufkampf-lesen.md`](laufkampf-lesen.md) gilt: Eine Änderung, die im
Selbstspiel gewinnt, gegen GNU Go aber verliert, wird nicht Default. Diese
Messung wendet die Regel nachträglich auf den wichtigsten Suchparameter an.
Anstoß war ein externes Review, das genau diese Lücke benannte.

Zur Wirkung: Der Wert eines Blatts ist tanh(evaluateBoard / `mctsValueScale`).
Eine kleinere Skala sättigt früher; große Unterschiede in der Bewertung
werden dann gleich hoch eingestuft.

## 2. Arme

| Arm | Parameter |
|---|---|
| A | Default (`mctsValueScale` 200) |
| B | `mctsValueScale` = 350 (der Wert vor der ersten Messreihe) |

## 3. Messung

GNU Go 3.8 Stufe 1, neun Vorgabesteine für die KI, 120 Simulationen, Aufgabe
aus, ganze Partien bis 600 Züge, `--seed 101`, 60 Partien je Arm in vier
Teilläufen zu je 15. Das ist dieselbe Anordnung wie M2 in
[`laufkampf-lesen.md`](laufkampf-lesen.md).

**Arm A wird nicht neu gespielt.** Er liegt schon vor: Arm A in
`daten/lesen-gnugo.json`, gespielt auf Commit `3f6db6d`.
- Die Blöcke `shared-go-logic` und `worker-ai` sind auf `3f6db6d` und auf dem
  heutigen `main` Byte für Byte gleich (SHA-256 `01d45978…`).
- `gnugo-duell.js` ist seitdem unverändert und mit festen Simulationen
  reproduzierbar (eigener Zufall je Partie geseedet, GNU Go mit `--seed`).
- GNU Go ist dieselbe Version 3.8.

**Gegenprobe vorab:** Die erste Partie jedes Teillaufs (Nr. 1, 16, 31, 46)
wird mit Arm A auf dem Commit des Laufs neu gespielt. Alle vier müssen im
Endstand und in der Zugzahl exakt mit den gespeicherten Werten
übereinstimmen. Weicht eine ab, wird Arm A vollständig neu gespielt, bevor
ausgewertet wird.

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 101 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 \
    --ki mctsFixedSims=120,resignEnabled=0,mctsValueScale=350 --roh skala-gnugo-B-$v.jsonl &
done
# Gegenprobe A: je eine Partie ab Nr. 1, 16, 31, 46
node gnugo-duell.js --partien 1 --von 1 --seed 101 ... --ki mctsFixedSims=120,resignEnabled=0 --roh skala-A-probe-1.jsonl
```

**Primär:** gepaarte Differenz B − A des Endstands (GNU Gos Auszählung der
Schlussstellung, aus Sicht der KI), zweiseitiger t-Test, α = 0,05.

## 4. Entscheidung, vorab festgelegt

| Ergebnis | Folge |
|---|---|
| B signifikant besser (p < 0,05) | 200 widerspricht dem fremden Maßstab: Default zurück auf 350 |
| B signifikant schlechter (p < 0,05) | 200 ist auch gegen GNU Go bestätigt |
| sonst | 200 bleibt; der fremde Maßstab widerspricht nicht, bestätigt aber auch nicht |

**Sekundär, ohne Anspruch:** Differenz nach Zug 120 und 200, Aufgaben von
GNU Go je Arm, Partielänge.

## 5. Grenzen

- GNU Go Stufe 1 mit neun Vorgabesteinen ist ein einzelner, enger Gegner.
- Gemessen wird mit 120 Simulationen; Menschen spielen mit 300 bis 1 300.
- Arm A stammt aus einem früheren Lauf. Die Gegenprobe sichert ab, dass er
  heute genauso ausfiele.
- Bei einer Streuung der Paardifferenz um 90 Punkte, wie in den letzten
  Läufen, erkennen 60 Paare einen Unterschied von etwa 33 Punkten mit 80 %
  Wahrscheinlichkeit. Kleinere Unterschiede bleiben unentschieden.
