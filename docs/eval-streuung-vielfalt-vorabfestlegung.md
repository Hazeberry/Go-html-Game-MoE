<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Vorabfestlegung: Was kauft der Rauschterm an Vielfalt?

Fortsetzung von `docs/eval-streuung-vorabfestlegung.md`. Dort ist die eine Hälfte beantwortet: der Rauschterm der
vier Bewertungsexperten kostet bei 120 Simulationen **keine nachweisbare Spielstärke** (S1: −1,9 Elo
[−38,8; +34,9]; S2: +7,7 Elo [−29,1; +44,6]). Die andere Hälfte ist offen: Der Kommentar in `index.html` Z. 1238
nennt den Zweck „Rauschterm zur Zugstreuung". Wenn er keine Stärke kostet und auch keine Streuung bringt, ist er
entbehrlich.

> **Zur Entstehung:** Diese Festlegung hat zwei Durchsichten von Luna hinter sich, die zusammen **fünf**
> methodische Fehler gefunden haben. §10 nennt sie einzeln und was daraus folgte: unanwendbare Statistik, eine
> unhaltbare Schrankenaussage, eine zu scharfe Gültigkeitsregel, ein Testaufbau, den ein einziger Gleichstand
> unbrauchbar macht, und ein Urteilssatz, der mehr behauptete als die Daten tragen. Die Frage selbst ist
> unberührt.

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

**Die Zahl verschiedener Eröffnungen kann ebenfalls sättigen.** Zeigen beide Arme 300 von 300 verschiedene
Zehn-Zug-Eröffnungen, ist die Messung ohne Aussage. Diese Gefahr ist vorab zu benennen, nicht hinterher.

**Deshalb ein zweites Maß: die Konzentration der Zugwahl.** Die Kollisionsrate des ersten Zugs kann Unterschiede
sichtbar machen, auch wenn alle Zehn-Zug-Präfixe verschieden sind — sie fragt nicht, ob eine ganze Eröffnung sich
wiederholt, sondern wie ungleich die Wahl des ersten Punktes ausfällt. Für den ersten Zug gibt es 361 Felder und
30 Partien je Block. Gemessen als **Kollisionsrate**

    q = Σ_k C(m_k, 2) / C(n, 2)

mit `m_k` der Häufigkeit des Feldes k unter den n ersten Zügen eines Blocks: die Wahrscheinlichkeit, dass zwei
zufällig gezogene Partien desselben Blocks auf demselben Punkt eröffnen. `q` ist eine **Eigenschaft der
Verteilung**, nicht der Stichprobengröße, und damit über Blöcke hinweg vergleichbar und mittelbar. Bei
Gleichverteilung über 361 Punkte wäre q ≈ 0,0028, bei immer demselben Eröffnungszug q = 1.

**Auch dieses Maß hat eine Untergrenze, und sie ist geregelt.** Tritt in einem Block keine einzige Kollision auf,
ist q dort exakt 0; sind beide Arme in einem Block bei 0, ist die gepaarte Differenz 0. Das ist der erwartbare
Fall und nicht der seltene, und §4.1 legt vorab fest, was dann gilt — bis zu vier solcher Gleichstände trägt der
Aufbau, darüber lautet der primäre Endpunkt „kein Urteil".

**Der Rohdump trägt das.** `ereignisse` enthält **jeden** Zug mit Nummer, Farbe und Feldindex; nachgesehen an
einem echten Dump: 370 Ereignisse bei 370 Zügen.

## 3. Aufbau

Zwei Arme, jeder **gegen sich selbst** (beide Seiten dieselbe Konfiguration):

| Arm | `evalStreuung` beider Seiten |
|---|---|
| **V1** | 1 (heutiger Standard) |
| **V0** | 0 (ohne Rauschen) |

**Zehn gepaarte Blöcke je Arm, je 30 Partien** — Seeds 20261201 bis 20261210, dieselben zehn in beiden Armen.
Zusammen 300 Partien je Arm, zwanzig Teilläufe von `ab-harness.yml` mit `roh=1`, je rund 15 Minuten.

**Warum zehn Blöcke:** Die unabhängig wiederholte Einheit ist der **Seed-Block**, nicht die Partie (§4). Mit zwei
Blöcken ist der kleinste erreichbare p-Wert eines Vorzeichentests 0,50 — es bliebe nur Deskription. Sechs Blöcke
reichen dafür zwar formal (6 : 0 ergibt p = 0,031), sind aber **brüchig**: ein einziger Gleichstand senkt die
Zahl der von Null verschiedenen Differenzen auf fünf, und damit ist α = 0,05 unerreichbar (bestmöglich 0,0625).
Gleichstände sind hier nicht exotisch, sondern erwartbar — die Kollisionsrate eines Blocks ist exakt 0, sobald
dort keine Eröffnung doppelt vorkommt, und sind beide Arme in einem Block bei 0, ist die Differenz 0.

Zehn Blöcke verkraften **bis zu vier Gleichstände** (§4). Das kostet acht zusätzliche Teilläufe und keine
Wartezeit, weil sie parallel laufen.

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

**Primär:** die Kollisionsrate `q` des ersten Zugs je Block. Verglichen werden die zehn **gepaarten
Differenzen** d_i = q(V0, Seed i) − q(V1, Seed i) mit dem **exakten Vorzeichentest**, zweiseitig, α = 0,05. Alle
zehn Differenzen stehen einzeln im Bericht, mit Median.

### 4.1 Gleichstände, vorab geregelt

Eine Differenz kann **exakt null** sein, und das ist hier nicht der Randfall, sondern erwartbar: `q` ist 0, sobald
in einem Block keine Eröffnung doppelt vorkommt, und sind beide Arme dort bei 0, ist d_i = 0.

Geregelt wird das so, und zwar **vorab und im Werkzeug**, nicht beim Ablesen:

1. Differenzen mit d_i = 0 fallen aus dem Test heraus (übliche Behandlung des exakten Vorzeichentests). Die Zahl
   der verbleibenden heißt **n_eff** und steht im Bericht, immer.
2. Der Test läuft auf n_eff. Die erreichbaren p-Werte stehen hier, damit niemand sie nachrechnen muss:

   | n_eff | bestes Ergebnis | p | zweitbestes | p |
   |---:|---|---:|---|---:|
   | 10 | 10 : 0 | 0,00195 | 9 : 1 | 0,02148 |
   | 9 | 9 : 0 | 0,00391 | 8 : 1 | 0,03906 |
   | 8 | 8 : 0 | 0,00781 | 7 : 1 | 0,07031 |
   | 7 | 7 : 0 | 0,01563 | 6 : 1 | 0,12500 |
   | 6 | 6 : 0 | 0,03125 | 5 : 1 | 0,21875 |
   | 5 | 5 : 0 | 0,06250 | 4 : 1 | 0,37500 |

3. **Bei n_eff < 6 lautet das Ergebnis des primären Endpunkts „kein Urteil"**, mit dem Grund „zu wenige von Null
   verschiedene Blockdifferenzen (n_eff = …)". Dann ist α = 0,05 strukturell unerreichbar, und ein p-Wert über
   0,05 wäre keine Information, sondern eine Eigenschaft des Umfangs. Die beschreibenden Maße werden trotzdem
   vollständig berichtet.
4. **Sind alle zehn Differenzen null** (n_eff = 0), lautet der Bericht genau das: in allen Blöcken dieselbe
   Kollisionsrate. Trifft das zu, weil **beide** Arme in allen Blöcken keine einzige Kollision zeigen, steht dieser
   Satz dort: „In beiden Armen trat in keinem Block eine Wiederholung des ersten Zugs auf." Das ist ein Befund
   über die Messbarkeit, kein Befund über Gleichheit — §8.
5. Bei n_eff ≥ 6 gilt das Urteil nach §5.

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

| Ergebnis des Vorzeichentests auf die gepaarten Differenzen | Folge |
|---|---|
| V0 hat die **höhere** Kollisionsrate, p < 0,05 | Ohne Rauschen eröffnet die Engine konzentrierter: das Rauschen kauft Streuung. Die Rate benennt, wie viel — und damit erstmals den Preis, den S1 und S2 nicht messen konnten. Ob er sich lohnt, entscheidet Hazeberry. |
| p ≥ 0,05 | **„Über die Seed-Blöcke ließ sich kein konsistenter Unterschied in der Konzentration des ersten Zugs nachweisen."** Das ist der ganze Urteilssatz. Er sagt nicht, dass die übrige Streuung aus den Ausspielungen stammt — `quickEval` wurde nicht variiert. Er sagt nicht, dass Abschalten praktisch gleichwertig wäre: die Elo-Intervalle aus S1 und S2 lassen Vor- **und** Nachteile offen ([−38,8; +34,9] und [−29,1; +44,6]). Eine Entscheidung über den Standard bräuchte eine eigene Messung mit vorab festgelegter Gleichwertigkeitsgrenze. |
| V0 hat die **niedrigere** Kollisionsrate, p < 0,05 | Unerwartet: das Rauschen würde die Zugwahl zusammenziehen statt sie zu streuen. Wird berichtet wie gemessen, mit ausdrücklichem Hinweis, dass dafür keine Erklärung vorliegt. |

## 6. Gültigkeitsregel

Zwei Zustände. **Ungültig**, mit „kein Urteil" und Grund, wenn:

1. Ein Teillauf erreicht die 30 Partien nicht, oder ein Arm kommt nicht auf zehn Blöcke und 300 Partien.
2. Innerhalb eines Arms unterscheiden sich die beiden Seiten in irgendeinem `PARAMS`-Wert.
3. Die beiden Arme unterscheiden sich in irgendeinem `PARAMS`-Wert außer `evalStreuung`.
4. Die Seeds 20261201 bis 20261210 kommen nicht in beiden Armen je genau einmal vor.
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

Ein Nullergebnis lautet hier genau der Satz aus §5: **über die Seed-Blöcke ließ sich kein konsistenter
Unterschied in der Konzentration des ersten Zugs nachweisen** — und nichts darüber hinaus. Insbesondere folgt
daraus nicht, woher die übrige Streuung kommt, und nicht, dass Abschalten gleichwertig wäre.

Zeigen beide Arme in allen Blöcken keine einzige Wiederholung, lautet der Bericht „in beiden Stichproben trat
keine Wiederholung auf" und der primäre Endpunkt „kein Urteil" (§4.1 Nr. 4) — nicht, der Unterschied sei kleiner
als irgendetwas.

Für eine belastbare Obergrenze bräuchte es eine **vorab definierte Toleranz** (ab welcher Ratendifferenz wäre der
Verlust praktisch bedeutsam?) und eine dazu passende Auswertung, etwa einen Nichtunterlegenheitsvergleich mit
Bootstrap über die Blöcke. Beides ist hier **nicht** festgelegt und wird deshalb auch nicht nachträglich
behauptet.

## 9. Ablauf

1. Diese Festlegung als PR, CI grün, Merge.
2. **Zwanzig Teilläufe in Actions** (`ab-harness.yml`, `roh=1`): V1 und V0, je Seeds 20261201 bis 20261210, je
   30 Partien. Je rund 15 Minuten, parallel.
3. Auswertungswerkzeug und Workflow für die Zählung, während die Läufe laufen — eigener PR, mit Test.
4. Auswertung über Actions, weil die Artefakte aus einer Session nicht erreichbar sind
   (Vorgängerfestlegung §14.4). Ergebnis als Nachtrag hier, Rohwerte unter `docs/daten/eval-streuung-vielfalt/`.
5. Urteil nach §5, Gültigkeit nach §6.

## 10. Die fünf Fehler der ersten Fassungen

Luna hat zweimal durchgesehen und zusammen fünf Stellen beanstandet — §10.1 bis §10.3 nach der ersten Fassung,
§10.4 und §10.5 nach der zweiten. Alle fünf treffen zu; sie stehen hier, damit nachvollziehbar bleibt, was sich
geändert hat und warum.

### 10.1 Fisher und Clopper-Pearson auf die Zahl verschiedener Präfixe

**Befund:** „Verschiedene Eröffnungen unter 180 Partien" (so der damalige Umfang, 2 × 90) ist eine Eigenschaft der ganzen Stichprobe. Ob eine
Partie als Wiederholung zählt, hängt von den übrigen ab. Die vier Tabellenwerte sind deshalb keine gewöhnliche
Stichprobe unabhängiger Ja/Nein-Beobachtungen.

**Nachgeprüft:** Die Varianz der Wiederholerzahl liegt bei 0,94 bis 0,26 der Binomialvarianz, je nach
Konzentration — und am weitesten daneben dort, wo Wiederholungen häufig sind.

**Folge:** Fisher und Clopper-Pearson auf dieses Maß sind gestrichen. Die Zahl verschiedener Präfixe bleibt als
beschreibende Messgröße. Die statistische Aussage läuft über **gepaarte Seed-Blöcke** als unabhängige Einheiten
(§4). Weil zwei Blöcke dafür nicht reichen — kleinster p-Wert 0,50 —, wurden es erst sechs und nach der zweiten
Durchsicht **zehn** (§10.4).

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

### 10.4 Ein Gleichstand hätte den Test unbrauchbar gemacht

**Befund:** Bei sechs Differenzen ergibt nur 6 : 0 ein zweiseitiges p < 0,05 (0,03125); schon 5 : 1 ergibt
0,21875. Bei fünf gleichgerichteten Differenzen und einem Gleichstand fällt die Null-Differenz aus dem exakten
Vorzeichentest heraus, und es bleibt p = 0,0625. Der Fall, dass alle Differenzen null sind, war gar nicht geregelt.

**Warum das hier zählt und nicht Theorie ist:** Die Kollisionsrate eines Blocks ist **exakt 0**, sobald dort keine
Eröffnung doppelt vorkommt. Sind beide Arme in einem Block bei 0, ist die Differenz 0. Gleichstände sind in diesem
Aufbau also der erwartbare Fall, nicht der seltene — und ein einziger hätte bei sechs Blöcken gereicht, um α = 0,05
unerreichbar zu machen.

**Folge:** Zehn Blöcke statt sechs; sie verkraften bis zu vier Gleichstände. Die Behandlung steht als §4.1 fest, mit
der Tabelle der erreichbaren p-Werte, der Regel „n_eff < 6 heißt kein Urteil" und dem ausdrücklich geregelten Fall,
dass alle Differenzen null sind. Das gehört ins Werkzeug, nicht ins Ablesen.

### 10.5 Der Urteilssatz bei einem Nullergebnis behauptete zu viel

**Befund:** §8 zog die richtige Grenze, §5 ging darüber hinaus. Ein unauffälliger Test zeigt weder, dass die
übrige Streuung aus `quickEval` stammt, noch dass Abschalten praktisch gleichwertig wäre. Auch S1 und S2 lassen
nach ihren Elo-Intervallen Vor- und Nachteile offen.

**Folge:** Die Nullzeile in §5 enthält jetzt nur noch den Satz „Über die Seed-Blöcke ließ sich kein konsistenter
Unterschied in der Konzentration des ersten Zugs nachweisen", dazu ausdrücklich, was daraus **nicht** folgt. Die
Formulierung „Kandidat zum Abschalten" ist gestrichen; eine Entscheidung über den Standard bräuchte eine eigene
Messung mit vorab festgelegter Gleichwertigkeitsgrenze. §5 und §8 sagen damit dasselbe.
