# Falsche Aufgaben und Gebiet im Wert: Befunde ohne Default

**Stand 04.10.2026.** Keine vorab festgelegte Messung, sondern Diagnose und
Piloten. Am Code ändert sich nichts; alle Defaults bleiben.

## 1. Anlass

Eine Partie eines Menschen gegen die KI (Weiß, 5 000 ms Zeitbudget, rund 700
bis 1 300 Simulationen je Zug) endete mit einer Aufgabe der KI bei Zug 277.
GNU Go 3.8 wertet die Schlussstellung mit **W +63,5** und gibt als Schwarz
nach einem weiteren Zug selbst auf.

| Zug | Q der KI | GNU Gos Schätzung (+ = Weiß) |
|---|---:|---:|
| 160 | 0,79 | +103 |
| 200 | 0,60 | +75 |
| 220 | 0,26 | +74 |
| 240 | −0,57 | +94 |
| 260 | −0,75 | +70 |
| 276 | −0,99 | +64 |

## 2. Wie oft das vorkommt

Alle 313 Aufgaben aus dem Selbstspiel-Lauf M2 von [`gebiet.md`](gebiet.md)
(120 Simulationen), von GNU Go an der Aufgabestellung geschätzt:

| Arm | Aufgaben | davon falsch (Aufgebender laut GNU Go vorn) |
|---|---:|---:|
| `gebietZug` 0 | 266 | 3 (1 %) |
| `gebietZug` 80 | 47 | 6 (13 %), alle als Weiß, bis +47 |

## 3. Was nicht hilft

**Gebiet in der Stellungsbewertung (`gebietGewicht`).**

- Gegen GNU Go (Pilot in [`endspiel-augen.md`](endspiel-augen.md) §6)
  verbessert es den Endstand nicht.
- In der Partie oben, nachgestellt mit 700 Simulationen, hebt es Q bei den
  Zügen 224 und 240 an, mit Gewicht 10 sogar ins Positive. Bei Zug 276
  bleibt Q in allen Stufen bei −0,98:

  | Zug | 0 | 1 | 3 | 10 |
  |---|---:|---:|---:|---:|
  | 200 | 0,60 | 0,70 | 0,82 | 0,97 |
  | 224 | −0,46 | −0,42 | −0,31 | 0,11 |
  | 240 | −0,57 | −0,51 | −0,40 | 0,09 |
  | 260 | −0,61 | −0,58 | −0,60 | −0,19 |
  | 276 | −0,98 | −0,98 | −0,98 | −0,98 |

**Der Grund bei Zug 276.** Schwarz hat eine einzige Kette aus 133 Steinen
mit 13 Freiheiten, Weiß zwölf Gruppen zu 6 bis 11 Steinen mit 3 bis 4
Freiheiten. Die Rollout-Politik bevorzugt Schläge und Atari, Weiß verteidigt
darin nicht verlässlich, und `deathTransfer` bucht Gruppen mit 3 Freiheiten
anteilig als geschlagen. GNU Go hält die weißen Gruppen für lebendig.

**Gebietsschätzung als Bremse vor der Aufgabe.**

- *Bouzy-Bilanz:* hätte die Partie oben gerettet. In M2 verhindert sie bei
  Marge 0 aber nur 2 der 9 falschen Aufgaben und sperrt 10 berechtigte.
- *Monte-Carlo-Endstand:* 8 bis 16 Ausspielungen bis zu zwei Pässen, mit
  Augenschutz und Flächenzählung. In M2 trifft er GNU Gos Urteil oft fast
  genau (15,5/14,8, 14,5/14,5, 19,2/21,3) und verhindert 8 der 9 falschen
  Aufgaben. In der Partie oben sagt er aber Weiß −30 (Zug 240) und −1 (Zug
  277). Außerdem sperrt er 19 Aufgaben, die laut GNU Go mit bis zu 169
  Punkten verloren sind. Ursache ist dieselbe Rollout-Schwäche wie bei Q.

## 4. Wo die Punkte im Mittelspiel verloren gehen

Gegen GNU Go fällt die Schätzung zwischen Zug 120 (um +16) und Zug 200 (um
−90). Je eigenem Zug zwischen 100 und 220 wurde GNU Gos Vorschlag (Stufe 10,
`reg_genmove`) mit unserem Zug verglichen, jeweils über `estimate_score`.
Ergebnis über 7 Partien und 427 Züge: Wir spielen 640 Punkte schlechter als
GNU Gos Vorschlag, im Mittel rund 90 je Partie. Nur 5 Züge kosten mehr als
20 Punkte. Es sind keine Patzer, sondern viele kleine Züge mit je 5 bis 15
Punkten Bedauern.

## 5. Folgerungen

- Die falschen Aufgaben kommen aus der taktischen Schwäche der Rollouts
  gegen viele schwache, aber lebende Gruppen, nicht allein aus fehlendem
  Gebiet. Ein Gebietsterm verschiebt Q, behebt es aber nicht.
- Für Menschen, die die KI nicht aufgeben lassen wollen: im Dashboard
  „Aufgabe-Q“ auf 1,00 stellen. Q erreicht −1 praktisch nie.
- Kandidaten für die nächste Baustelle: die Rollout-Politik (Gruppen mit 3
  bis 4 Freiheiten verteidigen) und die Zugwahl im Mittelspiel (große
  Punkte).
