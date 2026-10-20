# Teststärke: Paarzahl und Erfolgskriterium der Messungen

**Stand: 11.10.2026.** Prüfung der Messmethode, keine neue Messung.
Ergebnis: Mit 60 Paaren gegen GNU Go sind nur Effekte ab rund 24 Punkten
sicher erkennbar. Für die Effekte, die einzelne Schalter realistisch haben
(5–15 Punkte), ist das zu wenig. Mehr Paare kosten wenig Zeit. Empfehlung:
240 Paare, das Erfolgskriterium bleibt.

---

## 1. Anlass

Seit dem 10.10. werden Partien gegen GNU Go ausgespielt
([`gnugo-ausspielen.md`](gnugo-ausspielen.md)). Seitdem kamen vier
Schalter nicht über die Schwelle: `atariVerzicht`, die Nachmessungen von
`gebietFreiheit` und `leseRettung` sowie `openLineWeight`. Die Diagnosen
dazwischen schätzen Obergrenzen von wenigen Punkten
([`augen-urteil.md`](augen-urteil.md) §7: höchstens rund 7). Die Frage ist:
Wie groß muss ein Effekt sein, damit M1 ihn mit 60 Paaren überhaupt findet?

## 2. Das Erfolgskriterium

Vorab festgelegt, zuletzt in [`laufkampf-lesen.md`](laufkampf-lesen.md) §7:

| M1 (GNU Go, 60 Paare) | M2 (Selbstspiel, 360 Partien) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

M1: gepaarte Differenz B − A des Endstands, t-Test, zweiseitig, α = 0,05.
M2: Siegrate von B gegen 50 %, zweiseitig, α = 0,05.

Die Regel ist in allen Messungen richtig angewandt worden. Die p-Werte
lassen sich aus den Daten nachrechnen, zum Beispiel `leseRettung`:
−6,3 / (60,8 / √60) = −0,80, p = 0,42.

## 3. Die Streuung der Paare

Endstand B − A in den vier Messungen mit ausgespielten Partien:

| Messung | B − A | SD der Paardifferenz | 95-%-Intervall |
|---|---:|---:|---:|
| `atariVerzicht` | +2,4 | 66,5 | [−14,4; +19,3] |
| `gebietFreiheit` (Nachmessung) | +8,9 | 72,9 | [−9,5; +27,4] |
| `leseRettung` (Nachmessung) | −6,3 | 60,8 | [−21,7; +9,0] |
| `openLineWeight` (ohne Vorgabe) | −6,0 | 61,1 | [−21,5; +9,4] |

Die Streuung der Paardifferenz liegt bei rund **65 Punkten**. Die Paarung
hilft wenig: Beide Arme spielen mit demselben Seed, aber die Partien laufen
früh auseinander. Die Endstände eines Paars korrelieren nur mit r = −0,16
bis 0,38. Nach Zug 200 ist die Streuung kleiner (39–65), aber das ist eine
Schätzung und nicht der Endstand.

## 4. Was 60 Paare erkennen

Mit SD 65, zweiseitig α = 0,05:

| Paare | Standardfehler | sicher erkennbar (80 %) | Wahrscheinlichkeit, einen Effekt von 5 / 10 / 15 / 20 Punkten zu finden |
|---:|---:|---:|---|
| **60** | 8,4 | **23,5** | 9 % / **22 %** / 43 % / 66 % |
| 120 | 5,9 | 16,6 | 13 % / 39 % / 71 % / 92 % |
| **240** | 4,2 | **11,8** | 22 % / **66 %** / 95 % / 100 % |
| 360 | 3,4 | 9,6 | 31 % / 83 % / 99 % / 100 % |

Paare für 80 % Teststärke: 54 bei 25 Punkten, 83 bei 20, 148 bei 15, 332
bei 10.

**Ein echter Gewinn von 10 Punkten wäre mit 60 Paaren in vier von fünf
Messungen durchgefallen.** Die Nullergebnisse seit dem 10.10. sagen deshalb
„nicht belegt“, nicht „kein Effekt“. Ihre Intervalle schließen Gewinne bis
9–27 Punkte nicht aus. Sie schließen nur große Effekte aus. Die beiden
belegten Defaults der letzten Wochen waren groß genug: `leseVerzicht` mit
+56 und `wurzelFrisch` mit +26.

M2 mit 360 Partien hat einen Standardfehler von 2,6 Prozentpunkten und
erkennt sicher ab 57,4 %. Als Wächter gegen eine Verschlechterung reicht
das.

## 5. Was mehr Paare kosten

Eine Partie gegen GNU Go dauert bei acht parallelen Prozessen rund eine
Minute. 60 Paare (acht Teilläufe zu 15 Partien) brauchten 13–23 Minuten,
M2 rund 35 Minuten. 240 Paare sind 32 Teilläufe zu 15 Partien, in vier
Wellen zu je acht. Das dauert rund 60–90 Minuten.

## 6. Empfehlung

- **M1 künftig mit 240 Paaren.** Dann werden Effekte ab rund 12 Punkten
  sicher erkannt, 10 Punkte in zwei von drei Fällen. Das passt zu der
  Größe, die einzelne Schalter realistisch haben.
- **Das Kriterium bleibt** (zweiseitig α = 0,05 auf den Endstand, M2 als
  Wächter). Jede Vorabfestlegung nennt aber künftig die erkennbare
  Effektgröße. Jedes Ergebnis nennt das 95-%-Intervall.
- **Ein Nullergebnis heißt „nicht belegt“.** „Verworfen“ nur, wenn das
  Intervall einen relevanten Gewinn ausschließt, etwa +10 Punkte.
- **Nachmessungen sind möglich, aber nur vorab festgelegt** und mit
  frischem Seed. Den größten Spielraum lässt `gebietFreiheit`, mit einem
  Intervall bis +27. Ein Kandidat für eine Nachmessung wird ein Schalter
  aber nicht dadurch, dass sein Schätzwert positiv war.
- **Kleiner als rund 10 Punkte bleibt praktisch unmessbar.** Eine Obergrenze
  wie die 7 Punkte aus [`augen-urteil.md`](augen-urteil.md) bedeutet: Selbst
  ein perfekter Schalter wäre mit 240 Paaren kaum nachweisbar.

---

## 7. Nachtrag: Vorgabe nach `musterGewicht` (11.10.2026)

Seit `musterGewicht` Default ist ([`muster.md`](muster.md)), gewinnt die KI
gegen GNU Go mit neun Vorgabesteinen die Mehrzahl der Partien. Ist der
Prüfstand damit zu leicht geworden? Gemessen mit der heutigen Standard-KI,
je 30 ausgespielte Partien gegen GNU Go Stufe 1, 120 Simulationen, Seed
211 (Daten: `daten/vorgabe-gnugo.json`):

| Vorgabe | Siege der KI | Endstand Ø | SD | nach Zug 120 |
|---:|---:|---:|---:|---:|
| 9 | 17 von 30 (57 %) | +16,2 | 57,3 | +66,3 |
| 6 | 5 von 30 (17 %) | −46,4 | 55,8 | +28,0 |
| 4 | 0 von 30 | −78,5 | 42,3 | −7,5 |
| 2 | 0 von 30 | −95,2 | 36,8 | −37,3 |

- **Neun Vorgabesteine bleiben der Prüfstand.** Die KI ist dort ungefähr
  ebenbürtig. In knappen Partien reagiert der Endstand am empfindlichsten
  auf eine Änderung: Weder gewinnt eine Seite sicher noch verliert sie
  sicher.
- **Die Muster sind rund fünf Vorgabesteine wert.** Mit vier Steinen steht
  die neue KI im Schnitt so da wie die alte mit neun (−78,5 gegen −78,3 im
  Arm A der Messung in `muster.md` §8; andere Seeds, also eine grobe
  Schätzung).

## 8. Vorgabe nach dem Endspiel-Netz und Laufzeit (vorab festgelegt, 20.10.2026)

Seit `endspielNetz` Default ist ([`endspiel-netz.md`](endspiel-netz.md) §8),
gewinnt die KI gegen GNU Go mit neun Vorgabesteinen 227 von 240 Partien (95 %).
Damit ist der Prüfstand fast gesättigt: Die Siege können kaum noch steigen, und
der Endstand misst vor allem, wie hoch gewonnen wird. Wie in §7 wird die Vorgabe
neu eingestellt.

**Messung** (GitHub Actions, [`pruefstand.yml`](../.github/workflows/pruefstand.yml)):
Die heutige Standard-KI spielt gegen GNU Go Stufe 1 mit **9, 6, 4 und 2**
Vorgabesteinen, je **60 Partien**, Seed 215 (noch nie benutzt). Die Bedingungen
sind die der Messungen: 120 Simulationen, Aufgabe aus, GNU Go gibt nicht auf,
bis 600 Züge.

**Wahl, vorab festgelegt** (`auswertung/pruefstand-bericht.js`): Künftige
Messungen spielen mit der Vorgabe, deren Siegrate am nächsten an 50 % liegt,
sofern sie zwischen 25 und 75 % liegt. Bei Gleichstand gilt die Vorgabe mit mehr
Steinen. Liegt keine Vorgabe in diesem Bereich, bleiben es 9. Frühere Messungen
bleiben gültig, weil beide Arme jeder Messung dieselbe Vorgabe hatten. Die
Vorgabe ändert sich mit dem Nachtrag zu dieser Messung, erst in den Messungen
danach.

**Laufzeit** (`auswertung/netz-zeit.js`, im selben Lauf): An 24 Stellungen
(Zug 100, 150 und 200 aus 8 Partien) zieht die KI mit den Einstellungen des
Spiels, also mit Zeitbudget statt fester Simulationen, einmal ohne und einmal
mit Netz. Die Suche setzt ihre Zeitgrenze erst beim Start von `mctsPUCT`, das
Netz rechnet davor. **Erwartet:** gleich viele Simulationen, und der Zug dauert
um die Rechenzeit des Netzes länger, rund 0,1 bis 0,2 s bei einem Budget von 1,8
s. Geprüft wird, ob das stimmt. Einen Schwellenwert für eine Entscheidung gibt
es hier nicht.

**Erwartung vorab:** 9 Steine rund 90 bis 95 %, 6 Steine 50 bis 75 %, 4 Steine
15 bis 40 %, 2 Steine unter 15 %. Die Wahl fiele damit auf 6 oder 4.

## 9. Nachtrag: sechs Vorgabesteine, das Netz kostet 41 ms (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `pruefstand.yml`
([Run 39395430856](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39395430856)),
auf dem Merge-Commit `ddc4e4f` von `main`, mit Seed 215, in 8 Minuten (08:43
bis 08:51 UTC). Alle 240 Partien ausgespielt, keine abgebrochen. Daten:
[`daten/pruefstand/lauf1/`](daten/pruefstand/lauf1/).

| Vorgabe | Partien | Siege der KI | Endstand Ø | SD | nach Zug 120 |
|---:|---:|---:|---:|---:|---:|
| 9 | 60 | 57 (95 %) | +61,1 | 29,9 | +83,8 |
| **6** | 60 | **32 (53 %)** | +11,1 | 57,0 | +28,8 |
| 4 | 60 | 26 (43 %) | −11,3 | 51,1 | +8,4 |
| 2 | 60 | 2 (3 %) | −65,4 | 40,7 | −20,7 |

**Wahl nach §8: sechs Vorgabesteine.** Sechs und vier liegen im Bereich von 25
bis 75 %; sechs liegt mit 53 % näher an 50 % als vier mit 43 %. **Ab jetzt
spielen neue Messungen gegen GNU Go mit sechs Vorgabesteinen**, also mit
`gnugo-duell.js --vorgabe 6`. Das legt jede Vorabfestlegung in ihrem eigenen
Skript fest. Die Skripte früherer Läufe bleiben bei neun, damit sie sich
wiederholen lassen.

**Gegen die Erwartung aus §8.** Getroffen haben 9 Steine (95 %), 6 Steine
(53 %) und 2 Steine (3 %). Vier Steine lagen mit 43 % über dem erwarteten
Bereich von 15 bis 40 %. Zwischen vier und sechs Steinen liegen nur 10
Prozentpunkte. Mit je 60 Partien ist der Unterschied nicht gesichert.

**Was das für die Teststärke heißt, ohne Anspruch.** Mit sechs Steinen streut
der Endstand eines Arms mit 57 Punkten fast doppelt so stark wie mit neun (30).
Die Streuung der Paardifferenz ist hier nicht gemessen. Liegt sie wie bisher bei
55 bis 65, bleiben mit 240 Paaren rund 10 bis 12 Punkte erkennbar. Dafür können
die Siege wieder in beide Richtungen ausschlagen.

**Laufzeit des Endspiel-Netzes.** An 22 Stellungen (Zug 100, 150 und 200 aus 8
Partien; zwei Partien endeten vor Zug 200), Zeitbudget 1,8 s:

| | Median | |
|---|---:|---|
| Netz allein (Ebenen + Vorwärtsrechnung) | 43 ms | größter Wert 76 ms |
| ganzer Zug ohne Netz | 1 814 ms | 4 527 Simulationen |
| ganzer Zug mit Netz | 1 855 ms | 4 619 Simulationen |

Erwartet waren gleich viele Simulationen und ein Zug, der um 0,1 bis 0,2 s
länger dauert. Die Simulationen stimmen: Mit Netz sind es 102 % von ohne Netz,
die Suche verliert also keine Zeit. Der Zug dauert aber nur **41 ms** länger,
weniger als erwartet. Die Annahme von rund 0,1 s „die der Suche an Zeit
fehlen“ ([`endspiel-netz.md`](endspiel-netz.md) §6 und §8) ist damit überholt:
Das Netz kostet im Spiel rund 0,04 s Wartezeit je Zug ab Zug 81, und keine
Suchzeit. Gemessen ist das in Node auf dem Rechner von GitHub Actions, nicht in
einem Browser. Im Browser läuft die Suche im Worker mit derselben Engine. Ein
langsamerer Rechner verlängert die Wartezeit im selben Verhältnis, die Suche
bleibt unberührt.
