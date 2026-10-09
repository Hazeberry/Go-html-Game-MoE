# Endspiel-Gleichstand gegen GNU Go: vorab festgelegte Nachprüfung

**Status: festgelegt am 09.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

`endTieBreak` steht auf 1. Belegt ist das nur im Selbstspiel: 57,2 % und in
der Wiederholung 59,4 % über je 360 Partien
([`endspiel-gleichstand.md`](endspiel-gleichstand.md)). Gegen GNU Go wurde es
nie geprüft. Das ist die zweite Nachprüfung nach
[`wertskala-gnugo.md`](wertskala-gnugo.md).

**Erwartung, vor dem Lauf aufgeschrieben:** kaum ein Unterschied. Der
Schalter ordnet gleich bewertete Endspielzüge nach der Änderung der
Bouzy-Bilanz, begrenzt auf ±1 Punkt. Gemessen wurde er, bevor es
`gebietZug` gab. Seit `gebietZug` = 80 Default ist, geht genau dieselbe
Änderung der Bilanz mit dem Faktor 80 in jeden Kandidaten ein. Beide Terme
steigen mit derselben Größe, `endTieBreak` ordnet also nichts mehr um, was
`gebietZug` nicht schon ordnet. Er verschiebt die Werte nur um höchstens
einen Punkt und damit die Priors der Suche ein wenig.

## 2. Arme

| Arm | Parameter |
|---|---|
| A | Default (`endTieBreak` 1) |
| B | `endTieBreak` = 0 |

## 3. Messung

Wie in [`wertskala-gnugo.md`](wertskala-gnugo.md):
- **Anordnung:** GNU Go 3.8 Stufe 1, neun Vorgabesteine, 120 Simulationen,
  Aufgabe aus, bis 600 Züge, `--seed 101`, 60 Partien je Arm in vier
  Teilläufen.
- **Arm A** ist Arm A aus `daten/lesen-gnugo.json`. Die Engine-Blöcke sind
  unverändert (SHA-256 `01d45978…`). Die Gegenprobe vom 09.10. (vier
  Partien exakt gleich) gilt für diesen Commit weiter, weil sich seitdem nur
  Dokumentation geändert hat.
- **Arm B:** `--ki mctsFixedSims=120,resignEnabled=0,endTieBreak=0`.

**Primär:** gepaarte Differenz B − A des Endstands, zweiseitiger t-Test,
α = 0,05.

## 4. Entscheidung, vorab festgelegt

| Ergebnis | Folge |
|---|---|
| B signifikant besser (p < 0,05) | Default `endTieBreak` = 0 |
| B signifikant schlechter (p < 0,05) | 1 ist auch gegen GNU Go bestätigt |
| sonst | 1 bleibt |

**Sekundär, ohne Anspruch:**
- Differenz nach Zug 120 und 200
- Aufgaben von GNU Go je Arm
- Zahl der Paare, deren Partien Zug für Zug gleich verlaufen. Ist sie hoch,
  stützt das die Erwartung aus §1.

## 5. Grenzen

Wie in [`wertskala-gnugo.md`](wertskala-gnugo.md) §5:
- GNU Go ist ein einzelner, enger Gegner.
- Gemessen wird mit 120 Simulationen.
- Ein Unterschied unter etwa 33 Punkten bleibt bei 60 Paaren unentschieden.
