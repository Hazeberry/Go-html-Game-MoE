# Komponenten Stufe B: die sieben übrigen Zusätze einzeln

Vorab festgelegt am 29.10.2026, vor jedem Lauf. Hazeberry hat Stufe B an diesem
Tag beauftragt. Der Messlauf startet erst nach einem eigenen Go.

## 1. Anlass

Stufe A ([`komponenten.md`](komponenten.md) §9) hat den Default gegen GNU Go und
Fuego zerlegt. Netz und Muster bringen gegen beide Gegner fast gleich viel. Der
einzige Unterschied der Gegner, dessen Intervall 0 ausschließt, betraf die
reduzierte Engine B: +38,0 [+20,3; +55,7]. Er liegt bei den sieben übrigen
Zusätzen. Nachgerechnet bringen sie auf einer Engine ohne Netz und Muster gegen
GNU Go −39,0 [−49,2; −28,8] und gegen Fuego −1,7 [−13,4; +9,9] (B − NM0, nicht
vorab festgelegt).

Stufe B fragt deshalb:

1. Was bringen die sieben auf dem **vollen Default** D, gegen beide Gegner?
   Bisher kennen wir sie nur auf der Engine ohne Netz und Muster.
2. Welcher der sieben trägt den Unterschied der Gegner?

**Stufe B wählt keinen Default und ändert `index.html` nicht**, wie Stufe A.

## 2. Arme

[`auswertung/komponenten/arme-b.sh`](../auswertung/komponenten/arme-b.sh):

| Arm | Abschaltung auf D (`--ki`) | Partien je Gegner |
|---|---|---:|
| D | – | 480 |
| R0 | `raveEnabled=0` | 240 |
| T0 | `mctsTreeReuse=0` | 480 |
| W0 | `wurzelFrisch=0` | 480 |
| E0 | `endTieBreak=0` | 480 |
| P0 | `mctsPriorSharp=0` | 480 |
| BE0 | `bensonEval=0` | 480 |
| BF0 | `bensonMoveFilter=0` | 480 |
| O7 | `raveEnabled=0,mctsTreeReuse=0,wurzelFrisch=0,endTieBreak=0,mctsPriorSharp=0,bensonEval=0,bensonMoveFilter=0` | 480 |

- **D und R0 werden nicht neu gespielt.** Ihre Partien stammen aus Stufe A
  ([`komponenten/lauf1`](daten/komponenten/lauf1/), Seed 220). Die neuen Arme
  spielen mit demselben Seed dieselben Partienummern. Das spart 1 440 Partien.
  Es ist zulässig, weil sich `index.html` und `gnugo-duell.js` seit Stufe A
  nicht geändert haben und die Partien Zug für Zug wiederholbar sind (zwei
  Kontrollen, §3).
- **O7** schaltet alle sieben zusammen ab, Netz und Muster bleiben an. Es ist
  das Gegenstück zu B − NM0 aus Stufe A, aber auf dem vollen Default.
- **T0 und W0 überlappen.** Die frische Wurzel wirkt nur, wenn der Baum
  übernommen wird. T0 schaltet also W0 mit ab.
- `mctsPriorSharp=0` nimmt den Rang-Prior, wie in Stufe A.

## 3. Bedingungen

Wie in Stufe A ([`komponenten.md`](komponenten.md) §3): sechs Vorgabesteine,
120 Simulationen, Aufgabe der KI aus, der Gegner gibt nicht auf, bis 600 Züge,
Schätzung nach Zug 40, 80, 120 und 200. Gegner g ist GNU Go Stufe 1, Gegner f
Fuego (SVN r2038, C++14) mit 100 Spielen je Zug, GNU Go zählt
([`komponenten-b.yml`](../.github/workflows/komponenten-b.yml),
[`spielen.sh`](../auswertung/komponenten/spielen.sh) mit
`ARME=auswertung/komponenten/arme-b.sh`).

| Eingabe | Wert |
|---|---|
| `seed` | 220 |

Der Seed ist fest im Workflow, es gibt kein Eingabefeld. Mit einem anderen Seed
passten die neuen Arme nicht zu D und R0.

**Kontrollen.** Je ein Job spielt die Partien 1 bis 20 von D nach, gegen GNU Go
und gegen Fuego. Erwartet: 20 von 20 Zug für Zug gleich wie in Stufe A. Weicht
eine ab, gilt die Messung nicht als gepaart mit Stufe A. Dann wird D in einem
eigenen Lauf neu gespielt, bevor der Nachtrag etwas einordnet.

## 4. Auswertung, vorab festgelegt

[`auswertung/komponenten/bericht.js`](../auswertung/komponenten/bericht.js) mit
`--stufe B`, [`ergebnis-b.sh`](../auswertung/komponenten/ergebnis-b.sh).

Endpunkt, Paarung und Ausschluss wie in Stufe A (§4 dort). **Berichtet werden
Intervalle, keine Urteile.**

| Familie | Vergleiche | alpha je Vergleich | Intervall |
|---|---|---|---|
| Arm − D gegen GNU Go | R0, T0, W0, E0, P0, BE0, BF0, O7 | 0,05/8 = 0,00625 | 99,4 % (t) |
| Arm − D gegen Fuego | dieselben acht | 0,00625 | 99,4 % (t) |
| Unterschied der Gegner Δ_f − Δ_g | dieselben acht | 0,00625 | 99,4 % (Welch) |
| Wechselwirkung I | GNU Go, Fuego | 0,05/2 = 0,025 | 97,5 % (t) |

- R0 steht wieder in der Familie. Es ist dieselbe Datenlage wie in Stufe A, nur
  mit dem strengeren alpha dieser Familie.
- **Wechselwirkung:** je Partienummer I = O7 − (R0 + T0 + W0 + E0 + P0 + BE0 +
  BF0) + 6·D, also Δ_O7 minus die Summe der sieben Einzelwirkungen. Nur
  Partienummern, die in allen neun Armen fertig sind, wegen R0 also höchstens
  240. I < 0 heißt: Zusammen fehlen sie mehr als die Summe (Ersatz). I > 0 heißt:
  Die Einzelwirkungen überlappen, etwa T0 und W0.
- **Erste Abweichung:** je Arm der Median des ersten Zugs, in dem die Partie
  von D abweicht. Er zeigt, ab wann ein Zusatz überhaupt eingreift.
- Phasenprofil, standardisierte Wirkung, Siege und Kontrollen wie in Stufe A.

## 5. Auflösung, vorab gerechnet

SD der gepaarten Differenzen aus Stufe A: gegen GNU Go 64 bis 75, gegen Fuego 74
bis 83. Gerechnet mit 70 und 80, alpha 0,00625, 80 % Power:

| Vergleich | Paare | kleinste sichtbare Wirkung |
|---|---:|---:|
| Arm − D gegen GNU Go | 480 | rund 11 Punkte |
| Arm − D gegen Fuego | 480 | rund 13 Punkte |
| R0 − D | 240 | rund 16 (GNU Go) und 18 (Fuego) |
| Δ_f − Δ_g | 480 je Gegner | rund 17 Punkte |
| Wechselwirkung | höchstens 240 | grob 30 Punkte oder mehr |

Die meisten Einzelwirkungen dürften kleiner sein. Stufe B kann also für die
meisten Zusätze nur Obergrenzen liefern. Das Muster der Unterschiede sehen wir
am ehesten in O7 und in einem großen Einzelteil, falls es einen gibt.

## 6. Erwartung vorab

Aus früheren Messungen gegen GNU Go, alle mit anderem Default und meist mit
neun Steinen, also nur als Richtung:

- **P0** liegt gegen GNU Go klar unter D. Gemessen war 0 gegen 3 mit −58,6
  [−70,4; −46,8] ([`parameter-reihe.md`](parameter-reihe.md)). Mit Netz und
  Mustern ist es vermutlich weniger, weil das Netz ab Zug 80 den Prior
  mitbestimmt.
- **W0** liegt gegen GNU Go unter D (früher +25,7 für die frische Wurzel über
  60 Paare, [`wurzel-frisch.md`](wurzel-frisch.md)).
- **E0** liegt gegen GNU Go nahe 0 (früher +0,4 über 60 Paare,
  [`gleichstand-gnugo.md`](gleichstand-gnugo.md)). E0, BE0 und BF0 weichen erst
  spät von D ab, weil sie nur im Endspiel oder bei fast vollem Brett eingreifen.
- **T0, BE0, BF0:** gegen GNU Go nie einzeln gemessen. Erwartet: klein.
- **R0** nahe 0, wie in Stufe A.
- **O7** liegt gegen GNU Go deutlich unter D und gegen Fuego weniger. Der
  Unterschied der Gegner ist für O7 positiv. Das wäre die Wiederholung des
  Befunds aus Stufe A auf dem vollen Default.
- **Träger des Unterschieds:** am ehesten P0. Der scharfe Prior wurde gegen
  GNU Go abgestimmt und ist der größte der sieben. Das ist eine Vermutung, kein
  Teil einer Regel.
- **Wechselwirkung:** Vorzeichen offen. T0 und W0 überlappen (I > 0), Ersatz
  zwischen den übrigen zöge I unter 0.

## 7. Ablauf und Dauer

[`komponenten-b.yml`](../.github/workflows/komponenten-b.yml), manuell auf
`main`, ohne Eingaben:

- `fuego-bauen`: Fuego einmal bauen;
- `gnugo`: 7 Arme × 24 Teile zu 20 Partien gegen GNU Go (168 Jobs);
- `fuego`: 7 Arme × 12 Teile zu 40 Partien gegen Fuego (84 Jobs);
- `kontrolle-g`, `kontrolle-f`: die Kontrollen aus §3;
- `ergebnis`: Bericht, Rohdaten gepackt, Branch
  `ergebnisse/komponenten-b-lauf<N>` unter `docs/daten/komponenten-b/lauf<N>/`.
  Nur dieser Job darf ins Repo schreiben.

Zusammen 6 760 neue Partien. Stufe A brauchte für 4 825 rund zwei Stunden.
Erwartet werden **3 bis 4 Stunden**.

## 8. Danach

Der Nachtrag ordnet die Intervalle ein, ohne Urteil über Defaults. Trägt ein
einzelner Zusatz einen großen Teil des Unterschieds der Gegner, bekommt er eine
eigene Messung. Die Muster in der Eröffnung (`musterGewicht@N`, Stufe A §9)
bleiben ein eigener Versuch mit eigener Vorabfestlegung.
