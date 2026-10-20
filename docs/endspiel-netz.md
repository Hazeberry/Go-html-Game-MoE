# Endspiel-Netz im Spiel: `endspielNetz` (Schritt 2)

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Schritt 1 ([`endspiel-lerner.md`](endspiel-lerner.md) §8) hat das Tor bestanden.
Mit dem Netz treffen die gespielten Züge ab Zug 81 GNU Gos Zug (Stufe 10) in
34,9 % statt 18,1 % der Stellungen (+16,8 Prozentpunkte, 19 222 frische
Stellungen). Das Netz ändert fast jeden zweiten Zug. Ob daraus Punkte werden,
zeigt nur das Spiel. Bei den Tabellen der Datenaggregation ist ein Vorsprung in
der Vorhersage im Spiel verpufft. Hazeberry hat am 20.10.2026 Schritt 2
beauftragt, alles in GitHub Actions.

## 2. Der Schalter und die Arme

`index.html` bekommt den Schalter `endspielNetz` (Default **0**, aus) mit
`endspielNetzTop` = 4 und `endspielNetzAb` = 80. Die Gewichte des geprüften
Netzes stehen als Float32 in `index.html` (`const ENDSPIEL_NETZ`, geschrieben
von [`lerner-einbetten.js`](../auswertung/lerner-einbetten.js)), sodass
`index.html` von 460 auf 786 KB wächst. Merkmale und Vorwärtsrechnung sind
dieselben wie in Schritt 1. [`tests/endspiel-netz.js`](../tests/endspiel-netz.js)
prüft drei Dinge:
- gleiche Ebenen wie die Werkzeuge aus Schritt 1;
- gleiche Wahrscheinlichkeiten wie das geprüfte Netz (Abweichung unter 10⁻⁶);
- an echten Stellungen mit `endspielNetz` 0,5 genau die Züge der Offline-Prüfung.

Bei 0 läuft kein Teil des Netzes. Neu ist nur, dass `getAIMove` sich je Farbe
den eigenen letzten Zug merkt.

| Arm | `--ki` | Was passiert |
|---|---|---|
| **A** | (Default, `endspielNetz` 0) | Referenz |
| **N** | `endspielNetz=0.5` | ab Zug 81: die 4 besten Netzpunkte unter die 16 Kandidaten der Wurzel, Prior der Wurzelkinder zur Hälfte vom Netz |

Die Einstellung ist die aus Schritt 1, unverändert.

## 3. Messung

**M1 gegen GNU Go.** Bedingungen wie in den Messungen: GNU Go Stufe 1, neun
Vorgabesteine, 120 Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis
600 Züge, ausgespielt. Seed **213**, noch nie benutzt. Je Arm 240 Partien in 16
Teilläufen zu 15; gleiche Partienummer ist ein Paar.

**M2 im Selbstspiel** ([`teststaerke.md`](teststaerke.md) §2). N gegen A mit
`ab-harness.js`, beide Seiten mit 120 Simulationen, 360 Partien in zwölf Teilen
zu 30. Teil k spielt mit Seed 20261401 + k − 1, bis 400 Züge, Aufgabe an.

**Kontrolle.** Ein Job spielt Arm A mit Seed 206 (Partien 1 bis 15) und
vergleicht mit Arm A der Parameter-Reihe. Erwartet: 15 von 15 Partien gleich.
Das belegt, dass der Schalter bei 0 auch in ganzen Partien nichts ändert.

Der Lauf geschieht in GitHub Actions
([`endspiel-netz.yml`](../.github/workflows/endspiel-netz.yml), 45 Jobs zum
Spielen), auf dem Merge-Commit von `main`, der dieses Dokument enthält.

## 4. Endpunkt und Entscheidung

**M1:** Differenz des Endstands N − A nach GNU Gos Zählung, gepaart nach
Partienummer, zweiseitiger t-Test, α = 0,05, mit 95-%-Intervall. **M2:**
Siegrate von N gegen 50 %, zweiseitig, exakter Binomialtest, α = 0,05.

| M1 (240 Paare) | M2 (360 Partien) | Folge |
|---|---|---|
| N signifikant besser | nicht signifikant unter 50 % | **Default `endspielNetz` = 0,5** |
| N signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Sekundär, ohne Anspruch:**
- Siege gepaart (McNemar).
- Stand nach Zug 120 und 200. Bis Zug 80 sind die Arme gleich, also
  zeigt sich der Effekt erst danach.
- Hälften, Median, Vorzeichentest, Züge je Partie.
- In M2 die Aufgaben je Seite und die Siegrate in den ausgezählten Partien.
  Das ist die Lehre aus der Prior-Nachmessung ([`prior-nachmessung.md`](prior-nachmessung.md)
  §8): Dort kam die Niederlage im Selbstspiel vor allem aus eigenen Aufgaben.

## 5. Erkennbare Größe und Erwartung

Die Streuung der Paardifferenz liegt bei 55 bis 65 Punkten. Mit 240 Paaren sind
Effekte ab 10 bis 12 Punkten mit 80 % Teststärke erkennbar. Da der Eingriff erst
ab Zug 81 wirkt, kann die Streuung kleiner sein (bei Eingriffen im späten
Endspiel lag sie bei 12 bis 21). Dann sind auch 4 bis 6 Punkte erkennbar.

**Erwartung vorab, ohne Wirkung auf die Lesart:** N − A positiv, +3 bis +15
Punkte. Die Messlatte aus dem Orakel-Test sagt rund +21 voraus. Sie zählt aber
nur Züge, die genau GNU Gos Zug werden; die andere Hälfte der geänderten Züge
kann kosten, und die Partien laufen in neue Stellungen. M2 nicht signifikant
unter 50 %. Kontrolle 15 von 15.

## 6. Grenzen

- Ein Gegner (GNU Go Stufe 1), neun Vorgabesteine, 120 Simulationen je Zug. Im
  Browser gilt ein Zeitbudget. Das Netz kostet dort rund 0,1 s je Zug ab Zug
  81, die der Suche an Zeit fehlen.
- Lehrer und Gegner sind GNU Go. Ein Gewinn gegen GNU Go kann teils daher
  kommen, dass die KI GNU Gos Züge vorwegnimmt.
- Gemessen wird nur λ = 0,5 und Top 4. Andere Einstellungen bräuchten eine eigene
  Vorabfestlegung.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält. Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 213 |
| `selbstspiel_seed` | 20261401 |
| `kontrolle` | `docs/daten/parameter-reihe/lauf1/A.jsonl.gz` |
| `kontrolle_seed` | 206 |

Jobs: `pruefen`, `spielen` (A und N × 16 Teile), `kontrolle` (ein Teil),
`selbstspiel` (12 Teile zu 30 Partien), `ergebnis` (Bericht mit
`auswertung/dagger/endspiel-netz-ergebnis.sh`). Die Ergebnisse legt der Workflow
auf den Branch `ergebnisse/endspiel-netz-lauf<N>` unter
`docs/daten/endspiel-netz/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben. Erwartet werden 20 bis 40 Minuten.

## 8. Nachtrag: Ergebnis der Messung, Default 0,5 (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `endspiel-netz.yml`
([Run 39382667707](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39382667707)),
auf dem Merge-Commit `c9e76fc` von `main`, mit den Eingaben aus §7, in 21 Minuten
(06:50 bis 07:11 UTC). Alle 495 Partien gegen GNU Go und 360 im Selbstspiel
ausgespielt, keine abgebrochen. Daten:
[`daten/endspiel-netz/lauf1/`](daten/endspiel-netz/lauf1/).

**Kontrolle.** Arm K gibt Arm A der Parameter-Reihe in **15 von 15** Partien
wieder. Der Schalter bei 0 ändert also auch in ganzen Partien nichts.

**M1** (240 Paare, Seed 213):

| Arm | Endstand Ø | Siege | Züge Ø |
|---|---:|---:|---:|
| A (Default) | +18,9 | 149 | 242,0 |
| N (`endspielNetz` 0,5) | **+65,9** | **227** | 253,4 |

| Vergleich | Differenz | 95 % | p | Hälfte 1 / 2 | nach Zug 120 | nach Zug 200 |
|---|---:|---|---:|---|---:|---:|
| **N − A** | **+46,9** | [+40,4; +53,4] | 1,0 · 10⁻³³ | +43,8 / +50,1 | +7,5 | +45,4 |

Siege: In 81 Paaren gewinnt nur N, in 3 nur A (McNemar p = 1,0 · 10⁻²⁰). Median
der Differenz +44, Vorzeichentest 192 gegen 42.

**M2** (N gegen A im Selbstspiel, 360 Partien): N gewinnt **299, also 83,1 %**
[78,8 %; 86,6 %], p = 8,2 · 10⁻³⁹. **Nicht unter 50 %.**

**Entscheidung nach §4: Default `endspielNetz` = 0,5.** N ist signifikant besser,
und M2 liegt nicht unter 50 %. Das ist der größte gemessene Gewinn des Projekts
seit den Mustern (+102,8).

**Gegen die Erwartung aus §5.** Erwartet waren +3 bis +15 Punkte. Gemessen sind
+46,9, mehr als das Doppelte der Vorhersage aus der Messlatte des Orakel-Tests
(rund +21). Die Prüfung offline hat den Gewinn also unterschätzt, nicht
überschätzt wie bei den Tabellen. Eine Erklärung, ohne Beleg: Das Netz ändert die
Partien so, dass die KI weniger Gebiet verschenkt, und die Wirkung summiert sich
über rund 80 Züge.

**Sekundär, ohne Anspruch.**
- Der Vorsprung wächst über die Partie: +7,5 nach Zug 120, +45,4 nach Zug 200.
- Die Partien dauern 11 Züge länger.
- In M2 gibt A in 252 Partien auf, N in 27. Von den 81 ausgezählten Partien
  gewinnt N 47 (58 %). Ein Teil des Vorsprungs im Selbstspiel kommt also aus
  Aufgaben. Für die Regel zählt nur, dass N nicht unter 50 % liegt, und das ist
  deutlich erfüllt.

**Was offen bleibt.**
- Im Browser kostet das Netz rund 0,1 s je Zug ab Zug 81.
- Gemessen ist nur λ = 0,5 und Top 4.
- Lehrer und Gegner sind GNU Go. Ein Teil des Gewinns kann daher kommen, dass
  die KI GNU Gos Züge vorwegnimmt.
- Für ältere Läufe heißt „Default“ seit diesem Commit auch `endspielNetz` = 0,5.
