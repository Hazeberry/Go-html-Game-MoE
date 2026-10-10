# Gegen GNU Go ausspielen statt aufgeben lassen

**Stand: 10.10.2026.** Änderung der Messmethode für alle folgenden
Messungen gegen GNU Go.

---

## 1. Anlass

Der Hauptendpunkt der Messungen gegen GNU Go ist der Endstand: GNU Gos
`final_score` der Schlussstellung, gepaart je Partie. Gibt GNU Go auf, ist
die Schlussstellung die Stellung, in der es aufgab, oft um Zug 80–120. Ein
solcher Zwischenstand steht im Paar dann gegen eine ausgespielte Partie.

Bei `quickRettung` ([`quick-rettung.md`](quick-rettung.md) §6) kam der
ganze Unterschied aus acht Paaren, in denen GNU Go nur gegen einen Arm
aufgab. In den gespeicherten Daten der letzten vier Messungen streuen die
Paare ohne Aufgabe deutlich weniger:

| Messung | Paare | SD alle | ausgespielt | SD ausgespielt | einseitige Aufgabe |
|---|---:|---:|---:|---:|---:|
| `quickRettung` | 60 | 75,1 | 35 | 60,1 | 10 |
| `wurzelFrisch` | 60 | 84,0 | 49 | 59,9 | 9 |
| `gebietFreiheit` | 60 | 99,9 | 45 | 67,4 | 14 |
| `leseVerzicht` | 60 | 101,1 | 51 | 83,6 | 9 |

Die ausgespielten Paare sind nachträglich herausgegriffen. Sie hängen vom
Ausgang ab und taugen deshalb nicht als Test, nur als Hinweis.

## 2. Was ein Zwischenstand verdeckt

Zwei Partien aus `quick-rettung.md` (Seed 141, Arm A, Default) mit
`--gnugo-aufgabe 0` nachgespielt. Bis Zug 80 sind die Züge gleich:

| Partie | mit Aufgabe | ausgespielt |
|---|---|---|
| 39 | GNU Go gibt nach 80 Zügen auf, Endstand **+107,5** | 259 Züge, **−56,5** |
| 45 | GNU Go gibt nach 80 Zügen auf, Endstand **+107,5** | 236 Züge, **−2,5** |

Die KI verspielt den Vorsprung im Mittel- und Endspiel. Genau diese
Schwäche verdeckt die Aufgabe ([`endspiel-verlust.md`](endspiel-verlust.md),
[`verschenkt-warum.md`](verschenkt-warum.md)). Eine Änderung, die GNU Go
früher aufgeben lässt, sieht dann besser aus, als sie ist. Eine Änderung, die
das Endspiel verbessert, sieht in Partien mit Aufgabe gar nichts.

## 3. Die Option

`gnugo-duell.js --gnugo-aufgabe 0` startet GNU Go mit `--never-resign`.
Jede Partie läuft bis zu zwei Pässen oder bis `--maxzuege`. Jeder Datensatz
trägt das Feld `gnugoDarfAufgeben`. Ohne die Option bleibt alles wie
bisher: Alte Läufe sind Partie für Partie wiederholbar. Test in
`tests/gnugo-bruecke.js`.

## 4. Was sich ändert

- Neue Messungen gegen GNU Go laufen mit `--gnugo-aufgabe 0`, beide Arme.
- Endstände aus Läufen mit und ohne Aufgabe sind nicht vergleichbar. Die
  alten Messungen bleiben gültig, wie sie festgelegt waren.
- Erwartet, nicht belegt: kleinere Streuung der Paare, damit mehr
  Trennschärfe bei 60 Paaren. Die erste Messung mit der neuen Methode
  zeigt, ob das stimmt.
- Die Läufe dauern etwas länger, weil früh aufgegebene Partien jetzt
  ausgespielt werden.

**Nebenbefund:** Unter den 60 Partien je Arm aus `quick-rettung.md` sind
58 verschieden. Die Partien 39, 45 und 49 des Default-Arms sind trotz
verschiedener Seeds gleich. Die ersten 20 Züge kommen in nur 18 Varianten
vor. Die Partien sind also nicht ganz unabhängig, die Wirkung auf die
gepaarte Auswertung ist bei drei Dubletten aber klein.
