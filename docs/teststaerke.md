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
