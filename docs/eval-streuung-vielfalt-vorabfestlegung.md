<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Vorabfestlegung: Was kauft der Rauschterm an Vielfalt?

Fortsetzung von `docs/eval-streuung-vorabfestlegung.md`. Dort ist die eine Hälfte beantwortet: der Rauschterm der
vier Bewertungsexperten kostet bei 120 Simulationen **keine nachweisbare Spielstärke** (S1: −1,9 Elo
[−38,8; +34,9]; S2: +7,7 Elo [−29,1; +44,6]). Die andere Hälfte ist offen: Der Kommentar in `index.html` Z. 1238
nennt den Zweck „Rauschterm zur Zugstreuung". Wenn er keine Stärke kostet und auch keine Streuung bringt, ist er
entbehrlich.

> **Zur Entstehung:** Eine erste Fassung dieser Festlegung hatte drei methodische Fehler, die Luna in einer
> Durchsicht gefunden hat. §10 nennt sie einzeln und was daraus folgte. Die Fehler betrafen die Statistik, eine
> unhaltbare Schrankenaussage und eine zu scharfe Gültigkeitsregel — nicht die Frage selbst.

## 1. Die Frage

**Erzeugt die Engine mit Rauschen vielfältigere Partien als ohne?**

Das ist nicht die Frage, die S1 und S2 beantworten konnten. Dort spielten beide Arme **jede** Partie, einer
Schwarz, einer Weiß (`docs/eval-streuung-vorabfestlegung.md` §10.8) — eine Partie gehört dort keinem Arm. Hier
spielt jeder Arm **gegen sich selbst**, und damit ist Vielfalt je Arm definiert.

## 2. Zwei Maße, und warum keines allein reicht

**Die Endstellung reicht nicht.** §6 der Vorgängerfestlegung nannte die Zahl unterschiedlicher
`final_board_hash`. Diese Zahl ist **gesättigt**: in S2 waren 360 von 360 Partien verschieden (§14.1). Zwei
Partien über 300 bis 450 Züge landen schon bei einem einzigen abweichenden Zug in verschiedenen Endstellungen —
das Maß ist zu großzügig, um einen Unterschied zu zeigen.

**Die Zahl verschiedener Eröffnungen kann ebenfalls sättigen.** Wenn beide Arme 180 von 180 verschiedene
Zehn-Zug-Eröffnungen zeigen, ist die Messung ohne Aussage. Diese Gefahr ist vorab zu benennen, nicht
hinterher.

**Deshalb ein Maß, das in jedem Fall Signal hat: die Konzentration der Zugwahl.** Für den ersten Zug gibt es 361
Felder und 30 Partien je Block — dort entsteht Streuung oder sie entsteht nicht, unabhängig davon, ob irgendeine
Eröffnung sich wiederholt. Gemessen als **Kollisionsrate**

    q = Σ_k C(m_k, 2) / C(n, 2)

mit `m_k` der Häufigkeit des Feldes k unter den n ersten Zügen eines Blocks: die Wahrscheinlichkeit, dass zwei
zufällig gezogene Partien desselben Blocks auf demselben Punkt eröffnen. `q` ist eine **Eigenschaft der
Verteilung**, nicht der Stichprobengröße, und damit über Blöcke hinweg vergleichbar und mittelbar. Bei
Gleichverteilung über 361 Punkte wäre q ≈ 0,0028, bei immer demselben Eröffnungszug q = 1.

**Der Rohdump trägt das.** `ereignisse` enthält **jeden** Zug mit Nummer, Farbe und Feldindex; nachgesehen an
einem echten Dump: 370 Ereignisse bei 370 Zügen.

## 3. Aufbau

Zwei Arme, jeder **gegen sich selbst** (beide Seiten dieselbe Konfiguration):

| Arm | `evalStreuung` beider Seiten |
|---|---|
| **V1** | 1 (heutiger Standard) |
| **V0** | 0 (ohne Rauschen) |

**Sechs gepaarte Blöcke je Arm, je 30 Partien** — Seeds 20261201 bis 20261206, dieselben sechs in beiden Armen.
Zusammen 180 Partien je Arm, zwölf Teilläufe von `ab-harness.yml` mit `roh=1`, je rund 15 Minuten.

**Warum sechs Blöcke und nicht zwei:** Die unabhängig wiederholte Einheit ist der **Seed-Block**, nicht die
Partie (§4). Mit zwei Blöcken ist der kleinste erreichbare p-Wert eines Vorzeichentests 0,50 — es bliebe nur
Deskription. Mit sechs Blöcken, alle in dieselbe Richtung, ergibt er p = 0,031. Der Gesamtaufwand ist derselbe
wie bei 2 × 90.

**Dieselben Seeds in beiden Armen:** Mit gleichem Seed und festen Simulationen starten beide Arme aus demselben
Zufallsstrom; die Partien laufen allein deshalb auseinander, weil die Bewertung sich unterscheidet. Das erlaubt
die Paarung je Block.

Weitere Bedingungen wie in der Vorgängerfestlegung: `mctsFixedSims` 120, `resignEnabled` 0, Zug-Limit 600,
Komi 7,5, ohne Vorgabe, `paired` 0.

## 4. Endpunkte und wie sie ausgewertet werden

**Die Einheit der Wiederholung ist der Block, nicht die Partie.** Das ist der Kern dieses Abschnitts, und die
erste Fassung hatte ihn falsch (§10.1): Ob eine Partie als „Wiederholung" zählt, hängt von den **übrigen**
Partien des Blocks ab. Die Zahl verschiedener Präfixe ist deshalb keine Summe unabhängiger Ja/Nein-Beobachtungen,
und Fishers exakter Test wie das Clopper-Pearson-Intervall sind darauf **nicht anwendbar**.

Nachgerechnet statt behauptet: Simuliert man n = 180 Eröffnungen gleichverteilt aus K Möglichkeiten, liegt die
Varianz der Wiederholerzahl bei 0,94 (K = 2000), 0,75 (K = 500) und **0,26** (K = 120) der Binomialvarianz. Die
Abweichung wächst genau dort, wo Wiederholungen häufig sind — also im Fall, den ein Test erkennen soll.

**Primär:** die Kollisionsrate `q` des ersten Zugs je Block. Verglichen werden die sechs **gepaarten
Differenzen** d_i = q(V0, Seed i) − q(V1, Seed i) mit dem **Vorzeichentest**, zweiseitig, α = 0,05. Dazu alle
sechs Differenzen einzeln im Bericht, mit Median.

**Sekundär, beschreibend, ohne Test** — eine Kurve statt einer Zahl, damit sichtbar wird, wo sich die Wege trennen:

| Maß | je Block und gepoolt |
|---|---|
| verschiedene erste Züge | Zahl und Anteil |
| Anteil des häufigsten ersten Zugs | zeigt Konzentration direkt |
| verschiedene Präfixe über 5, 10 und 30 Züge | Verlauf zwischen Anfang und Mittelspiel |
| verschiedene `final_board_hash` | das Maß aus §6 der Vorgängerfestlegung, zur Anschlussfähigkeit; Sättigung erwartet |
| Zug der ersten Abweichung, Median über alle Partienpaare eines Blocks | wie lange zwei Partien gleich laufen |
| Partielänge, Anomalien, Aufgaben | wie bisher |

Für diese Maße wird **kein** p-Wert und **kein** Intervall berichtet. Sie beschreiben, sie entscheiden nicht.

**Die Siegrate ist hier kein Endpunkt**, sondern Diagnose (§6).

## 5. Lesart, vorab festgelegt

| Ergebnis des Vorzeichentests auf die sechs Differenzen | Folge |
|---|---|
| V0 hat die **höhere** Kollisionsrate, p < 0,05 | Ohne Rauschen eröffnet die Engine konzentrierter: das Rauschen kauft Streuung. Die Rate benennt, wie viel — und damit erstmals den Preis, den S1 und S2 nicht messen konnten. Ob er sich lohnt, entscheidet Hazeberry. |
| p ≥ 0,05 | Kein nachweisbarer Unterschied in der Konzentration der Zugwahl. Zusammen mit S1 und S2: der Rauschterm kostet keine Stärke und bringt keine in diesem Aufbau messbare Streuung. Dann ist er ein Kandidat zum Abschalten — mit **eigener** Festlegung, nicht in diesem Lauf. Die Streuung käme in diesem Fall aus den Ausspielungen (`quickEval`, `sampleLegalMoves`), die hier in beiden Armen unangetastet bleiben. |
| V0 hat die **niedrigere** Kollisionsrate, p < 0,05 | Unerwartet: das Rauschen würde die Zugwahl zusammenziehen statt sie zu streuen. Wird berichtet wie gemessen, mit ausdrücklichem Hinweis, dass dafür keine Erklärung vorliegt. |

## 6. Gültigkeitsregel

Zwei Zustände. **Ungültig**, mit „kein Urteil" und Grund, wenn:

1. Ein Teillauf erreicht die 30 Partien nicht, oder ein Arm kommt nicht auf sechs Blöcke und 180 Partien.
2. Innerhalb eines Arms unterscheiden sich die beiden Seiten in irgendeinem `PARAMS`-Wert.
3. Die beiden Arme unterscheiden sich in irgendeinem `PARAMS`-Wert außer `evalStreuung`.
4. Die Seeds 20261201 bis 20261206 kommen nicht in beiden Armen je genau einmal vor.
5. Für eine Partie fehlen die Zugereignisse oder ihre Zahl weicht von `zuege` ab — ohne die Züge gibt es den
   primären Endpunkt nicht.
6. `PARAMS_DEFAULT` ist verändert, geprüft über die Prüfsummen der drei Engine-Blöcke.
7. Die Anomaliezahl eines Teillaufs liegt über 2 % seiner Partien.

**Die Siegrate ist ausdrücklich KEIN Ausschlussgrund.** Beide Seiten eines Arms sind identisch, die Zuordnung zu
A und B ist willkürlich; eine auffällige Siegrate kommt bei korrektem Aufbau mit der üblichen Häufigkeit vor. Wer
den Lauf deshalb verwirft, sortiert gültige Vielfaltsdaten aus. Sie wird als **Diagnose** ausgewiesen: fällt sie
auf, werden Farbwechsel, Armzuordnung und Parameter geprüft, und erst ein **nachgewiesener** Aufbaufehler macht
den Lauf ungültig — dann über Grund 2 oder 3. Das war in der ersten Fassung falsch (§10.3).

## 7. Grenzen und Risiken

- **Selbstspiel ist ein Stellvertreter.** Der Spieler sieht die Engine gegen sich selbst nie; er spielt gegen
  einen Arm. Vielfalt im Selbstspiel ist das nächstliegende Maß, nicht das gesuchte.
- **Der erste Zug ist nicht die Partie.** Die Kollisionsrate misst Konzentration an einer Stelle, an der es
  Signal gibt. Dass eine Engine vielfältig eröffnet, heißt nicht, dass die Partien vielfältig verlaufen — dafür
  stehen die Präfixmaße daneben, ohne Test.
- **Präfix-Gleichheit ist streng und damit großzügig zur Vielfalt.** Zwei Partien, die sich in einem einzigen Zug
  unterscheiden, zählen als verschieden, auch wenn sie strategisch dasselbe sind.
- **Das Ausspielrauschen bleibt in beiden Armen** (`quickEval`, Vorgängerfestlegung §3). Gemessen wird der
  **zusätzliche** Beitrag des Bewertungsrauschens zur Streuung, nicht die Streuung insgesamt.
- **30 Partien je Block sind wenig für die Rate selbst.** Die Einzelrate eines Blocks ist verrauscht; der
  Vorzeichentest braucht aber nur die Richtung je Block, und die ist robuster als der Betrag.
- **Kein Standardwechsel in diesem Schritt.** Der Default bleibt 1,00, unabhängig vom Ergebnis.

## 8. Was dieser Lauf NICHT leisten kann

**Es wird keine Obergrenze für einen Vielfaltsverlust behauptet.** Die erste Fassung hatte eine: „Nullergebnis
heißt, der Verlust ist kleiner als rund 3 Prozentpunkte". Diese Zahl stammte aus der Frage, ab welcher
beobachteten Vierfeldertafel Fishers Test unter 0,05 fällt — das beschreibt eine einzelne Tabelle und ist **keine**
Schranke für einen Effekt (§10.2). Die Aussage ist gestrichen.

Ein Nullergebnis lautet hier: **der Vorzeichentest über sechs gepaarte Blöcke zeigt keinen Unterschied**. Zeigen
beide Arme in allen Blöcken keine einzige Wiederholung eines Zehn-Zug-Präfixes, lautet der Bericht genau das —
„in beiden Stichproben trat keine Wiederholung auf" — und nicht, der Unterschied sei kleiner als irgendetwas.

Für eine belastbare Obergrenze bräuchte es eine **vorab definierte Toleranz** (ab welcher Ratendifferenz wäre der
Verlust praktisch bedeutsam?) und eine dazu passende Auswertung, etwa einen Nichtunterlegenheitsvergleich mit
Bootstrap über die Blöcke. Beides ist hier **nicht** festgelegt und wird deshalb auch nicht nachträglich
behauptet.

## 9. Ablauf

1. Diese Festlegung als PR, CI grün, Merge.
2. **Zwölf Teilläufe in Actions** (`ab-harness.yml`, `roh=1`): V1 und V0, je Seeds 20261201 bis 20261206, je 30
   Partien. Je rund 15 Minuten.
3. Auswertungswerkzeug und Workflow für die Zählung, während die Läufe laufen — eigener PR, mit Test.
4. Auswertung über Actions, weil die Artefakte aus einer Session nicht erreichbar sind
   (Vorgängerfestlegung §14.4). Ergebnis als Nachtrag hier, Rohwerte unter `docs/daten/eval-streuung-vielfalt/`.
5. Urteil nach §5, Gültigkeit nach §6.

## 10. Die drei Fehler der ersten Fassung

Luna hat die erste Fassung durchgesehen und drei Stellen beanstandet. Alle drei treffen zu; sie stehen hier,
damit nachvollziehbar bleibt, was sich geändert hat und warum.

### 10.1 Fisher und Clopper-Pearson auf die Zahl verschiedener Präfixe

**Befund:** „Verschiedene Eröffnungen unter 180 Partien" ist eine Eigenschaft der ganzen Stichprobe. Ob eine
Partie als Wiederholung zählt, hängt von den übrigen ab. Die vier Tabellenwerte sind deshalb keine gewöhnliche
Stichprobe unabhängiger Ja/Nein-Beobachtungen.

**Nachgeprüft:** Die Varianz der Wiederholerzahl liegt bei 0,94 bis 0,26 der Binomialvarianz, je nach
Konzentration — und am weitesten daneben dort, wo Wiederholungen häufig sind.

**Folge:** Fisher und Clopper-Pearson auf dieses Maß sind gestrichen. Die Zahl verschiedener Präfixe bleibt als
beschreibende Messgröße. Die statistische Aussage läuft über **gepaarte Seed-Blöcke** als unabhängige Einheiten
(§4). Weil zwei Blöcke dafür nicht reichen — kleinster p-Wert 0,50 —, sind es jetzt **sechs**, bei gleichem
Gesamtaufwand (6 × 30 statt 2 × 90).

### 10.2 Die Schranke „kleiner als rund 3 Prozentpunkte"

**Befund:** Die Rechnung „0 gegen 6 Wiederholer" beschreibt eine einzelne beobachtete Tafel und liefert keine
Obergrenze für einen Effekt, wenn der Test unauffällig bleibt. Außerdem kann das Zehn-Zug-Maß in beiden Armen bei
100 % landen.

**Folge:** Die Aussage ist gestrichen (§8). Zusätzlich hat die Sättigungsgefahr den primären Endpunkt geändert:
statt der Zahl verschiedener Präfixe ist es jetzt die **Kollisionsrate des ersten Zugs**, die auch dann Signal
trägt, wenn keine einzige Eröffnung sich wiederholt (§2).

### 10.3 Die Siegrate als Ausschlussgrund

**Befund:** Auch korrektes Selbstspiel kann zufällig eine auffällige A/B-Siegrate liefern. Wer deshalb den
gesamten Lauf verwirft, sortiert gültige Vielfaltsdaten aus.

**Folge:** Die Siegrate ist aus der Gültigkeitsregel entfernt und steht als Diagnose (§6). Verworfen wird erst
bei einem nachgewiesenen Aufbaufehler, und der fällt dann ohnehin unter Grund 2 oder 3.
