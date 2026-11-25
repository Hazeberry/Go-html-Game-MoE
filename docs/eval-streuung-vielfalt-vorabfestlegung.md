<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Vorabfestlegung: Was kauft der Rauschterm an Vielfalt?

Fortsetzung von `docs/eval-streuung-vorabfestlegung.md`. Dort ist die eine Hälfte beantwortet: der Rauschterm der
vier Bewertungsexperten kostet bei 120 Simulationen **keine nachweisbare Spielstärke** (S1: −1,9 Elo
[−38,8; +34,9]; S2: +7,7 Elo [−29,1; +44,6]). Die andere Hälfte ist offen: Der Kommentar in `index.html` Z. 1238
nennt den Zweck „Rauschterm zur Zugstreuung". Wenn er keine Stärke kostet und auch keine Streuung bringt, ist er
entbehrlich.

## 1. Die Frage

**Erzeugt die Engine mit Rauschen mehr verschiedene Partien als ohne?**

Das ist nicht die Frage, die S1 und S2 beantworten konnten. Dort spielten beide Arme **jede** Partie, einer
Schwarz, einer Weiß (`docs/eval-streuung-vorabfestlegung.md` §10.8) — eine Partie gehört dort keinem Arm, und die
Vielfaltszahl gilt nur für das Gemisch. Hier spielt jeder Arm **gegen sich selbst**, und damit ist die Zahl je Arm
definiert.

## 2. Warum die Endstellung als Endpunkt nicht reicht

§6 der Vorgängerfestlegung nannte als Maß die Zahl unterschiedlicher `final_board_hash`. Diese Zahl ist
**gesättigt**: in S2 waren 360 von 360 Partien verschieden (100,0 %, §14.1). Ein Endpunkt am Anschlag kann keinen
Unterschied zeigen. Der Grund ist, dass zwei Partien über 300 bis 450 Züge schon bei einem einzigen abweichenden
Zug in verschiedenen Endstellungen landen — das Maß ist zu großzügig.

**Der Rohdump trägt mehr, als bisher benutzt wurde.** `ereignisse` enthält **jeden** Zug mit Nummer, Farbe und
Feldindex; nachgesehen an einem echten Dump: 370 Ereignisse bei 370 Zügen. Damit lässt sich Vielfalt dort messen,
wo sie entsteht — am Anfang der Partie, bevor sich die Wege ohnehin trennen.

## 3. Aufbau

Zwei Arme, jeder **gegen sich selbst** (beide Seiten dieselbe Konfiguration):

| Arm | `evalStreuung` beider Seiten |
|---|---|
| **V1** | 1 (heutiger Standard) |
| **V0** | 0 (ohne Rauschen) |

Je Arm **2 Seeds × 90 Partien = 180**, zusammen vier Teilläufe von `ab-harness.yml` mit `roh=1`.

**Dieselben Seeds in beiden Armen:** 20261201 und 20261202. Mit gleichem Seed und festen Simulationen starten
beide Arme aus demselben Zufallsstrom; die Partien laufen allein deshalb auseinander, weil die Bewertung sich
unterscheidet. Das ist der engste mögliche Kontrast.

Weitere Bedingungen wie in der Vorgängerfestlegung: `mctsFixedSims` 120, `resignEnabled` 0, Zug-Limit 600,
Komi 7,5, ohne Vorgabe, `paired` 0.

**Zwei Seeds je Arm, obwohl einer für den Primärtest reichte** (§8): In S1 sah ein einzelner Teillauf auffällig aus
(50 : 40) und war bei vier Teilen nachweisbar gewöhnlich. Ein zweiter Seed je Arm kostet 43 Minuten parallel und
trennt Seed-Eigenheiten von Armeigenschaften.

**Die Siegrate ist hier kein Endpunkt.** Beide Seiten eines Arms sind identisch; die Siegrate muss bei 50 % liegen
und ist nur eine Negativkontrolle (§6 Nr. 6).

## 4. Endpunkte

**Primär, je Arm:** Zahl **verschiedener Eröffnungen über die ersten 10 Züge** — die Folge der Feldindizes
`idx` der Züge 1 bis 10, als Zeichenkette verglichen, gezählt über die 180 Partien des Arms.

Verglichen werden die beiden Arme mit **Fishers exaktem Test**, zweiseitig, α = 0,05, auf der Vierfeldertafel aus
verschiedenen und wiederholten Eröffnungen. Dazu je Arm der Anteil mit Clopper-Pearson-Intervall.

**Warum 10 Züge:** kurz genug, dass Wiederholungen überhaupt auftreten können, lang genug, dass es nicht nur die
erste Punktwahl ist. Die Zahl ist vorab gesetzt und wird nicht nach den Daten gewählt.

**Sekundär, ohne statistischen Anspruch** — eine Kurve statt einer Zahl, damit sichtbar wird, wo sich die Wege
trennen:

| Maß | Zweck |
|---|---|
| verschiedene erste Züge (Präfix 1) | engste Stelle; zeigt, ob die Zugwahl ohne Rauschen auf wenige Punkte zusammenfällt |
| verschiedene Präfixe über 5 und 30 Züge | Verlauf zwischen Anfang und Mittelspiel |
| verschiedene `final_board_hash` | das Maß aus §6 der Vorgängerfestlegung, zur Anschlussfähigkeit; Sättigung erwartet |
| Zug der ersten Abweichung, Median über alle Partienpaare eines Arms | wie lange zwei Partien gleich laufen |
| Partielänge, Anomalien, Aufgaben | wie bisher |

## 5. Lesart, vorab festgelegt

| Ergebnis des Primärvergleichs | Folge |
|---|---|
| V0 hat **weniger** verschiedene Eröffnungen, p < 0,05 | Das Rauschen kauft Vielfalt. Die Zahl benennt, wie viel — und damit erstmals den Preis, den S1 und S2 nicht messen konnten. Ob er sich lohnt, entscheidet Hazeberry. |
| p ≥ 0,05 | Kein nachweisbarer Vielfaltsgewinn. Zusammen mit S1 und S2 heißt das: der Rauschterm kostet keine Stärke **und** bringt keine messbare Streuung. Dann ist er ein Kandidat zum Abschalten — mit **eigener** Festlegung, nicht in diesem Lauf. Die Streuung käme in diesem Fall aus den Ausspielungen (`quickEval`, `sampleLegalMoves`), die hier in beiden Armen unangetastet bleiben. |
| V0 hat **mehr** verschiedene Eröffnungen, p < 0,05 | Unerwartet. Würde bedeuten, dass das Rauschen die Zugwahl auf wenige Punkte zieht statt sie zu streuen. Wird berichtet wie gemessen, mit ausdrücklichem Hinweis, dass dafür keine Erklärung vorliegt. |

## 6. Gültigkeitsregel

Zwei Zustände. **Ungültig**, mit „kein Urteil" und Grund, wenn:

1. Ein Teillauf erreicht die 90 Partien nicht, oder ein Arm kommt nicht auf 180.
2. Innerhalb eines Arms unterscheiden sich die beiden Seiten in irgendeinem `PARAMS`-Wert.
3. Die beiden Arme unterscheiden sich in irgendeinem `PARAMS`-Wert außer `evalStreuung`.
4. Die Seeds 20261201 und 20261202 kommen nicht in beiden Armen je genau einmal vor.
5. Für eine Partie fehlen die Zugereignisse oder ihre Zahl weicht von `zuege` ab — ohne die Züge gibt es den
   primären Endpunkt nicht.
6. Die Siegrate eines Arms weicht signifikant von 50 % ab (exakter Test, α = 0,05). Beide Seiten sind identisch;
   eine Abweichung wäre ein Hinweis auf einen Fehler im Aufbau, nicht auf eine Eigenschaft.
7. `PARAMS_DEFAULT` ist verändert, geprüft über die Prüfsummen der drei Engine-Blöcke.
8. Die Anomaliezahl eines Teillaufs liegt über 2 % seiner Partien.

## 7. Grenzen und Risiken

- **Selbstspiel ist ein Stellvertreter.** Der Spieler sieht die Engine gegen sich selbst nie; er spielt gegen
  einen Arm. Vielfalt im Selbstspiel ist das nächstliegende Maß, nicht das gesuchte.
- **Präfix-Gleichheit ist ein strenges Maß und damit großzügig zur Vielfalt.** Zwei Partien, die sich in einem
  einzigen Zug unterscheiden, zählen als verschieden, auch wenn sie strategisch dasselbe sind. Ein Nullergebnis
  ist deshalb **stark** (selbst ein großzügiges Maß sieht keinen Verlust), ein positives Ergebnis ist belastbar.
- **Das Ausspielrauschen bleibt in beiden Armen** (`quickEval`, Vorgängerfestlegung §3). Gemessen wird der
  **zusätzliche** Beitrag des Bewertungsrauschens zur Vielfalt, nicht die Vielfalt insgesamt. Das ist die richtige
  Frage für diesen Schalter, aber es ist eine engere Frage als „sind die Partien vielfältig?".
- **Kein Standardwechsel in diesem Schritt.** Der Default bleibt 1,00, unabhängig vom Ergebnis.
- **Die Siegrate trägt hier nichts** außer der Negativkontrolle, und 180 Partien je Arm sagen über Stärke nichts,
  was S1 und S2 mit je 360 nicht besser sagen.

## 8. Auflösung, vorab gerechnet

Fishers exakter Test auf 180 gegen 180: Hat der verrauschte Arm 0 Wiederholer, wird der Vergleich **ab 6
Wiederholern** im rauschfreien Arm signifikant (p = 0,0300) — also ab einem Rückgang von 100 % auf **96,7 %**
verschiedene Eröffnungen.

Dieselbe Schwelle gilt bei 90 Partien je Arm, weil die Empfindlichkeit an der Null-Seite hängt und nicht am
Umfang. Die zweiten 90 Partien je Arm kaufen keine Empfindlichkeit, sondern die Trennung von Seed-Eigenheiten
(§3) und ein engeres Intervall je Arm.

Ein Nullergebnis heißt damit: **der Vielfaltsverlust ist kleiner als rund 3 Prozentpunkte**, nicht „es gibt
keinen".

## 9. Ablauf

1. Diese Festlegung als PR, CI grün, Merge.
2. **Vier Teilläufe in Actions** (`ab-harness.yml`, `roh=1`): V1 mit Seeds 20261201 und 20261202, V0 mit denselben
   beiden. Je rund 43 Minuten, parallel.
3. Auswertungswerkzeug und Workflow für die Zählung, während die Läufe laufen — eigener PR.
4. Auswertung über Actions, weil die Artefakte aus einer Session nicht erreichbar sind
   (Vorgängerfestlegung §14.4). Ergebnis als Nachtrag hier, Rohwerte unter `docs/daten/eval-streuung-vielfalt/`.
5. Urteil nach §5, Gültigkeit nach §6.
