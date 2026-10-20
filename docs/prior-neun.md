# Prior-Schärfe 9 auf dem neuen Default: Stärke und Aufgabe getrennt prüfen

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Die Nachmessung ([`prior-nachmessung.md`](prior-nachmessung.md) §8) bestätigte
`mctsPriorSharp` 9 gegen GNU Go: +7,3 [+2,1; +12,5], Siege 365 gegen 304. Im
Selbstspiel gewann S9 aber nur 25,6 %, und **213 der 268 Niederlagen waren
eigene Aufgaben**. Ausgezählt stand es 45 zu 55. Nach der Regel hieß das: kein
Default, untersuchen.

Zwei Dinge sind seitdem offen:

1. **Ist S9 im Selbstspiel schwächer, oder gibt es nur zu früh auf?** Das
   trennt ein Selbstspiel ohne Aufgabe auf beiden Seiten (M2) von einem mit
   Aufgabe wie bisher (M3).
2. **Gilt der Gewinn noch auf dem neuen Default?** Seit dem 20.10. greift das
   Endspiel-Netz ab Zug 81 in den Prior der Wurzel ein
   ([`endspiel-netz.md`](endspiel-netz.md) §8). Die Schärfe wirkt auf den
   Anteil der Heuristik. Der Gewinn kann kleiner oder größer sein als vorher.

Hazeberry hat die Prüfung am 20.10.2026 beauftragt.

## 2. Arme

| Arm | `--ki` | Was passiert |
|---|---|---|
| **A** | (Default: `mctsPriorSharp` 3, `endspielNetz` 0,5) | Referenz |
| **S9** | `mctsPriorSharp=9` | schärferer Prior, sonst Default |

## 3. Messung

**M1 gegen GNU Go.** Bedingungen wie in den Messungen: GNU Go Stufe 1, neun
Vorgabesteine, 120 Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis
600 Züge, ausgespielt. Seed **214**, noch nie benutzt. Je Arm 240 Partien in 16
Teilläufen zu 15.

**M2, Selbstspiel ohne Aufgabe.** S9 gegen A mit `ab-harness.js`, beide Seiten
mit 120 Simulationen und `resignEnabled=0`, bis 600 Züge, 360 Partien in zwölf
Teilen zu 30, Teil k mit Seed 20261501 + k − 1. Jede Partie wird ausgezählt.

**M3, Selbstspiel mit Aufgabe.** Wie M2, aber mit Aufgabe auf beiden Seiten und
bis 400 Züge, genau das Rezept der Nachmessung. Teil k spielt mit Seed
20261601 + k − 1.

**Kontrolle.** Arm A spielt Seed 213 (Partien 1 bis 15). Das muss Zug für Zug
Arm N der Messung des Endspiel-Netzes wiedergeben, denn der heutige Default ist
genau N. Erwartet: 15 von 15.

Der Lauf geschieht in GitHub Actions
([`prior-neun.yml`](../.github/workflows/prior-neun.yml), 57 Jobs zum Spielen).

## 4. Endpunkt und Entscheidung

**M1:** Differenz des Endstands S9 − A, gepaart, zweiseitiger t-Test, α = 0,05.
**M2 und M3:** Siegrate von S9 gegen 50 %, exakter Binomialtest, zweiseitig,
α = 0,05.

| M1 (240 Paare) | M2 (ohne Aufgabe) | M3 (mit Aufgabe) | Folge |
|---|---|---|---|
| S9 signifikant besser | nicht signifikant unter 50 % | nicht signifikant unter 50 % | **Default `mctsPriorSharp` = 9** |
| S9 signifikant besser | nicht signifikant unter 50 % | signifikant unter 50 % | kein Default. S9 spielt nicht schwächer, gibt aber zu früh auf. Nächster Schritt: die Aufgabe bei Schärfe 9 prüfen, mit eigener Vorabfestlegung |
| S9 signifikant besser | signifikant unter 50 % | — | kein Default; S9 ist im Selbstspiel schwächer, untersuchen |
| sonst | — | — | Default bleibt 3; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Sekundär, ohne Anspruch:**
- Siege gepaart (McNemar).
- Stand nach Zug 120 und 200, Züge je Partie.
- In M2 und M3 die Siege je Farbe.
- In M3 die Aufgaben je Seite und die Siegrate in den ausgezählten Partien.

## 5. Erkennbare Größe und Erwartung

M1: Die Streuung der Paardifferenz lag bei 56 bis 58. Mit 240 Paaren sind rund
10 Punkte mit 80 % Teststärke erkennbar. Ein Gewinn wie zuletzt (+7,3) wird nur
in rund der Hälfte der Läufe signifikant. M2 und M3: Der Standardfehler liegt bei
2,6 Prozentpunkten; der Wächter schlägt sicher unter rund 43 % an.

**Erwartung vorab, ohne Wirkung auf die Lesart:**
- M1: S9 − A von +2 bis +8, eher kleiner als vorher, weil das Netz ab Zug 81 die
  Hälfte des Priors stellt.
- M2: 45 bis 55 %, nicht signifikant.
- M3: deutlich unter 50 %, mit vielen Aufgaben von S9, wie in der Nachmessung.
- Kontrolle: 15 von 15.

Am wahrscheinlichsten ist damit die zweite Zeile der Tabelle: kein Default, aber
die Aufgabe als klarer nächster Schritt.

## 6. Grenzen

- Ein Gegner (GNU Go Stufe 1), neun Vorgabesteine, 120 Simulationen je Zug.
- M2 ohne Aufgabe misst die Spielstärke, nicht das Verhalten im Browser, wo die
  Aufgabe an ist. Deshalb zählt M3 für die Entscheidung mit.
- Warum S9 früher aufgibt, misst diese Prüfung nicht. Naheliegend ist, dass die
  schärfere Suche ihre Werte Q schneller in den negativen Bereich treibt.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält. Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 214 |
| `selbstspiel_seed` | 20261501 |
| `aufgabe_seed` | 20261601 |
| `kontrolle` | `docs/daten/endspiel-netz/lauf1/N.jsonl.gz` |
| `kontrolle_seed` | 213 |

Jobs: `pruefen`, `spielen` (A und S9 × 16 Teile), `kontrolle` (ein Teil),
`selbstspiel` (M2 und M3 × 12 Teile), `ergebnis` (Bericht mit
`auswertung/dagger/prior-neun-ergebnis.sh`). Die Ergebnisse legt der Workflow auf
den Branch `ergebnisse/prior-neun-lauf<N>` unter `docs/daten/prior-neun/lauf<N>/`.
Erwartet werden 25 bis 45 Minuten.

## 8. Nachtrag: Ergebnis der Prüfung, verworfen (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `prior-neun.yml`
([Run 39388959861](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39388959861)),
auf dem Merge-Commit `76a0e28` von `main`, mit den Eingaben aus §7, in 34 Minuten
(07:48 bis 08:22 UTC). Alle 495 Partien gegen GNU Go und 720 im Selbstspiel
ausgespielt, keine abgebrochen. Daten:
[`daten/prior-neun/lauf1/`](daten/prior-neun/lauf1/). Der Workflow legte sie
wegen eines Fehlers im Pfad unter `daten/endspiel-neun/` ab; sie sind hierher
verschoben, und der Pfad im Workflow ist korrigiert.

**Kontrolle.** Arm A gibt Arm N der Messung des Endspiel-Netzes in **15 von 15**
Partien wieder. Der heutige Default ist also genau der gemessene.

| Messung | Ergebnis | 95 % | p |
|---|---|---|---:|
| **M1:** S9 − A gegen GNU Go (240 Paare) | **−11,4**, Siege 197 gegen 222 | [−18,4; −4,5] | 0,0014 |
| **M2:** S9 im Selbstspiel ohne Aufgabe | **26,4 %** (95 von 360) | [22,1 %; 31,2 %] | 1,1 · 10⁻¹⁹ |
| **M3:** S9 im Selbstspiel mit Aufgabe | **18,6 %** (67 von 360) | [14,9 %; 23,0 %] | 8,0 · 10⁻³⁵ |

**Entscheidung nach §4: Default bleibt 3.** S9 ist gegen GNU Go signifikant
**schlechter**, nicht besser. Die Obergrenze (−4,5) liegt unter 0. Schärfe 9 ist
damit verworfen.

**Die Vermutung zur Aufgabe ist widerlegt.** In der Nachmessung
([`prior-nachmessung.md`](prior-nachmessung.md) §8) lag nahe, dass S9 im
Selbstspiel nur zu früh aufgibt. Ohne Aufgabe gewinnt S9 aber nur 26,4 %, fast
so wenig wie mit Aufgabe in der Nachmessung (25,6 %). S9 spielt gegen den
Default im Selbstspiel schwächer, unabhängig von der Aufgabe. Die 45 zu 55 in
den ausgezählten Partien der Nachmessung waren eine verzerrte Auswahl: Ausgezählt
wurden nur die Partien, die S9 nicht vorher aufgegeben hatte.

**Gegen die Erwartung aus §5.** Erwartet waren M1 +2 bis +8 und M2 nicht
signifikant. Beides lag daneben. Getroffen haben M3 (deutlich unter 50 %) und die
Kontrolle.

**Was das heißt, ohne Anspruch.** Ohne Netz war S9 gegen GNU Go besser (+7,3, in
zwei Seeds), mit Netz ist es schlechter (−11,4). Die Schärfe und das Netz wirken
offenbar auf dieselbe Schwäche, den zu flachen Prior im Endspiel. Das Netz behebt
sie besser, und die zusätzliche Schärfe schadet dann. Nach Zug 120 liegen beide
Arme noch gleich (−1,5), der Rückstand entsteht danach (−9,9 nach Zug 200), also
dort, wo das Netz wirkt. Belegt ist diese Erklärung nicht. Gegen den Default
im Selbstspiel war S9 schon ohne Netz schwächer. GNU Go Stufe 1 hat diese
Schwäche nur nicht ausgenutzt.

**Sekundär.** Median der Differenz −4, Vorzeichentest 104 gegen 126 (p = 0,17).
S9 spielt kürzere Partien (230,9 gegen 255,4 Züge). In M3 gibt S9 in 256 Partien
auf, A in 31; ausgezählt gewinnt S9 36 von 73.
