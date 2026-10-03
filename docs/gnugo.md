# Gegen GNU Go: wie stark ist die KI wirklich?

**Pilot vom 03.10.2026, explorativ.** Noch keine vorab festgelegte Messung,
sondern die erste Begegnung mit einem fremden Gegner. Werkzeug:
[`gnugo-duell.js`](../gnugo-duell.js).

---

## 1. Warum ein fremder Gegner

Jede bisherige Messung war Selbstspiel. Sie zeigt, ob eine Änderung besser
ist als vorher. Sie zeigt nicht, wie stark die KI ist, und sie kann keine
Schwäche aufdecken, die beide Seiten teilen. GNU Go 3.8 ist eine klassische
Engine mit festen Stufen (1–10), reproduzierbar über `--seed` und über GTP
ansprechbar.

## 2. Das Werkzeug

`gnugo-duell.js` lädt die Engine wie `auswertung/weiterspielen.js` und
spricht GTP mit GNU Go (`apt-get install gnugo`, dann unter
`/usr/games/gnugo`).

- Unsere Züge kommen aus `getAIMove` mit den Parametern aus `--ki`, GNU Gos
  aus `genmove`.
- GNU Go zählt aus (`final_score`, chinesische Regeln). Unsere eigene
  Zählung steht daneben.
- Nach jeder Partie werden die Bretter beider Programme verglichen
  (`list_stones`). Bei einer Abweichung bricht der Lauf ab.
- Mit `--vorgabe N` bekommt unsere KI N Vorgabesteine (Schwarz, Komi 0,5,
  Weiß beginnt).

**GNU Go 3.8 stürzt an manchen Stellungen ab** (Speicherzugriffsfehler,
Debian-Paket). Geprüft an einer langen diagonalen Treppe: Der Absturz kommt
auf allen Stufen, mit jedem Seed, ohne Zugfolge (Steine direkt gesetzt), mit
`reg_genmove`, ohne Fuseki-/Joseki-Datenbank und mit größerem Stack. Die
Stellung selbst löst ihn aus. Das Werkzeug startet einmal neu (Gegenprobe)
und zählt die Partie sonst als abgebrochen. Im Pilot traf das 2 von 41
Partien.

## 3. Pilot

| GNU Go | Vorgabe für uns | Simulationen | Aufgabe | gewonnen |
|---|---:|---:|---|---:|
| Stufe 5 | — | 120 | an | 0 von 11 |
| Stufe 5 | — | 120 | aus | 0 von 6 |
| Stufe 5 | — | 1 000 | aus | 0 von 8 |
| Stufe 1 | — | 120 | aus | 0 von 5 |
| Stufe 1 | 9 Steine | 120 | aus | 0 von 6 |
| Stufe 1 | 9 Steine | 120 | an | 0 von 3 |

**Kein einziger Sieg, auch nicht mit neun Vorgabesteinen gegen die
schwächste Stufe.** Ohne Aufgabe endet jede Partie mit dem ganzen Brett für
GNU Go: Am Ende erklärt es alle Steine unserer KI für tot. Mehr Suche
(1 000 statt 120 Simulationen, etwa so viel wie im Spiel) ändert daran
nichts. Der Abstand ist größer als neun Vorgabesteine. Als Siegrate lässt
er sich so nicht messen.

## 4. Woran es liegt: eine Partie mit neun Steinen

Partie 1 des Laufs „Stufe 1, 9 Steine, Aufgabe aus". GNU Gos Schätzung
(`estimate_score`):

| nach Zug | Schätzung |
|---:|---|
| 30 | W+11,9 |
| 60 | W+145,1 |
| 90 | W+211,5 |
| Ende (346) | W+370,5 |

Mit neun Steinen beginnt Schwarz weit vorn. Nach 30 Zügen ist der Vorsprung
weg, nach 60 ist die Partie entschieden. Die schwarzen Züge 1–60:

```
E16 E15 D15 D17 E17 E4 Q15 C15 C16 C17 F17 G17 H17 J17 K17
F15 G15 C14 C13 C12 C11 C10 E10 F10 G10 H10 J10 L10 F16 G16
```

**Schwarz baut Mauern:** Zeile 17 von C bis K, Spalte C von 10 bis 17,
Zeile 10 von C bis L, jeweils Stein an Stein. Dazwischen liegt ein großer,
leerer Rahmen. Auf die eigenen Vorgabesteine antwortet Schwarz nicht. Nach
30 Zügen hält GNU Go D4/E4 und Q4 für tot, nach 60 auch Q16/Q15 und Q10.
Später füllt Schwarz den Rahmen selbst auf (C–K, Zeilen 10–17 fast lückenlos).
Der Klumpen hat kaum Augen, Weiß umschließt ihn, und er stirbt als Ganzes.

**Die Vermutung zur Ursache:** `evaluateBoard` bewertet eine Kette mit
`Größe × 5 + Freiheiten × 3`. Gebiet kommt darin nicht vor: Leere Punkte
zählen nur als Freiheiten einer Kette. Eine lange, dünne Kette hat viele
Freiheiten, also lohnt es nach dieser Bewertung, Ketten zu verlängern und
eigene Flächen aufzufüllen. `pilot-benson-defense.md` §1 hat dasselbe am
Laufkampf gesehen („Für Raum, Verbindung, Ausbruch oder Einschließung gibt
es in `evaluateBoard` keinen Term"). Im Selbstspiel fällt das nicht auf,
weil beide Seiten es gleich machen.

Das ist eine Vermutung aus einer Partie, keine Messung.

## 5. Was daraus folgt

- **Als Maßstab** taugt GNU Go so nur mit einer stetigen Größe statt der
  Siegrate, etwa GNU Gos Schätzung nach einer festen Zugzahl oder der
  Endstand mit Vorgabe. Damit ließe sich eine Verbesserung messen, lange
  bevor die erste Partie gewonnen wird.
- **Als Hebel** zeigt der Pilot auf die Bewertung: Gebiet statt Material
  und Freiheiten. Das ist eine größere Änderung an `evaluateBoard`. Gemessen
  würde sie sowohl im Selbstspiel als auch gegen GNU Go mit Vorgabe.
