# Prior-Messung: wann der Fehlerbericht zur Nachstellung nicht reicht

**Stand: 23.11.2026. Status: Entwurf, nicht gemessen.** Vorschlag von Hazeberry am 23.11.2026. Sie schließt den
letzten offenen Punkt aus `docs/passregel-wege-nachtrag-vorabfestlegung.md` §8.4: Dass eine Nachstellung aus dem
Fehlerbericht einen **anderen Zug** ergeben kann, wenn das Netz mitsteuert, ist dort **geschlossen, nicht gemessen**.

Dieses Doc enthält Vorgaben. Hazeberry liest es vor dem Merge.

**Diese Fassung ist die zweite.** Die erste hatte drei Fehler, die beim Bauen des Werkzeugs aufgefallen sind; alle
drei stehen unten ausgeschrieben (§3.2, §3.3, §3.5) und haben den Aufbau geändert, nicht nur die Zahlen.

## 1. Die Frage

`buildBugReport` liefert `reproduktion` — Brett, Historie, Gefangene, Ko-Punkt, `reqId`, `extra`, `PARAMS`. **Nicht**
dabei: die Netzgewichte und die Priors (BR-1 §3, mit gemessener Begründung). Solange `netMaxBlend` 0 ist, spielt das
keine Rolle. Sobald jemand den Blend einschaltet, hängt der Zug an den Priors — und die hängen an Gewichten, die
sich mit jedem Training ändern.

**Die Frage, zugespitzt:** Ergibt dieselbe Stellung, mit demselben Seed, derselben Simulationszahl und demselben
`netBlend`, einen anderen Zug, wenn nur der Trainingsstand des Netzes ein anderer ist? Und wenn ja: Würde der
Bericht mit `netPriors` die Nachstellung retten?

## 2. Hazeberrys Aufbau, und wo er nicht trägt

Sein Vorschlag: Originalzug und Priors festhalten; dieselbe Stellung zweimal nachspielen, einmal mit den
ursprünglichen Gewichten, einmal mit einem späteren Trainingsstand, bei gleichem Seed, gleicher Simulationszahl und
gleichem `netBlend`; Lauf 1 muss den Originalzug treffen, sonst taugt der Vergleich nicht; in Lauf 2 auch die
Rangfolge der beiden Kandidaten festhalten. Als Gegenprobe: wechselt der Zug, ihn mit den **aufgezeichneten
Original-Priors** noch einmal nachspielen.

**Die Gültigkeitsregel, die Rangfolge, den festen Seed und die Stellungsidee übernehme ich unverändert** — der feste
Seed war der Punkt, an dem meine eigene Sondierung gescheitert ist (§3.3).

**Die Gegenprobe trägt nicht**, und zwar aus einem Grund, der am Code steht: Das Netz erreicht die Zugwahl über
**genau einen Kanal**, den Prior-Vektor. `_getAIMoveKern` (`worker-ai`, Z. 4598 bis 4616) nimmt
`_bw = policyNet.blendWeight`, holt `_p` entweder aus `forward()` oder aus `policyNet._netPriors` und blendet nur bei
`_bw > 0`; alles weitere, was dort geschrieben wird (`_netHidden`, `_netInp`), ist Buchhaltung fürs Training.
`docs/bughunt-wiederholung.md` §6 hält dasselbe aus dem Lesen **aller** `policyNet.`-Verwendungen fest.

Die Original-Gewichte **erzeugen** also genau die aufgezeichneten Priors; es gibt keinen zweiten Weg. Die Gegenprobe
ist damit mit Lauf 1 **konstruktionsgleich** und kann nicht unabhängig scheitern — käme dort ein anderer Zug heraus,
wäre das ein Fehler in der Einspeisung, kein Befund über die Priors. Als Prüfung der Apparatur ist sie nützlich
(§5, Gültigkeitspunkt 4), als Beleg trägt sie nichts. Deshalb Arm C in §4.

## 3. Sondierung (gemessen, 23.11.2026) — mit drei Berichtigungen

**Was lief, wo, mit welchem Go:** Trockenläufe auf Archivstellungen im Container, auf Hazeberrys Go für
kostengünstige Läufe. Quelle: die sechs `tests/stellungen/hand-*.sgf`, je die ersten N Züge eingespielt (Zug 60 bis
150 in Schritten von 10, 56 Stellungen). Messanker im Quelltext nach dem Vorbild von
`auswertung/diagnose/wurzel-replay.js` — eine Zeile, die die endgültige Kandidatenliste herausreicht und nichts
verändert. Kein Messlauf, keine Partie.

### 3.1 Die Kippbedingung

```
m = bw · netScoreScale · (p₂ − p₁) − (1 − bw) · (s₁ − s₂)      Rangwechsel genau dann, wenn m > 0
```

`s₁, s₂` sind die Punktwerte der beiden besten Kandidaten ohne Blend, `p₁, p₂` ihre Priors. `netScoreScale` ist 5000.

### 3.2 Erste Berichtigung: die Größenordnung der Priors

Ich hatte Prior-Unterschiede zwischen zwei Punkten von etwa 4·10⁻³ angenommen und daraus einen Prior-Term von
„einigen Einheiten" gerechnet. **Das war um etwa den Faktor 100 falsch.** Gemessen: Unterschiede von rund
**10⁻⁴**. Der Softmax über 361 Punkte liegt dicht am Mittel 1/361 = 0,00277. Bei Blend 0,3 ist der Prior-Term
damit rund **0,2 Punkte**, nicht 6.

Daraus folgt, dass nicht die Punktlücke das Auswahlkriterium ist, sondern `m`: Der Zweitplatzierte muss den
**höheren** Prior haben, und der Betrag muss passen.

### 3.3 Zweite Berichtigung: die Bewertung enthält Rauschen, mein Seed fehlte

Meine ersten zwei Sondierungen liefen **ohne gesetzten Zufallsgenerator**. Das war ein Fehler, den der Code selbst
vorhersagt (`index.html` Z. 1238 f.):

> „Rauschterm zur Zugstreuung. **Ohne deterministisch gesetzten Generator vergleicht die Probe Rauschen, nicht
> Bewertung** — der erste Durchlauf …"

Die Zugbewertung addiert Rauschen: `evalMidgame` endet auf `s + Math.random() * 4` (Z. 2476), dazu weitere Terme
bei Z. 2358 (`* 3`), 2910 (`* 0.5`), 3123 (`* 3`) und 3288 (`* 5`). **Bis zu etwa 4 Punkte je Kandidat.**

Die Lücken, die ich in der ersten Fassung dieses Docs genannt hatte — 0,0147 bis 0,167 — liegen **weit unter** der
Rauschamplitude. Sie waren **Stichproben, keine Eigenschaft der Stellung**; dieselbe Stellung lieferte in drei Läufen
drei verschiedene Kandidatenpaare. Die Tabelle der ersten Fassung ist damit gegenstandslos und ersetzt.

**Mit festem Seed ist alles wiederholbar.** Nachgeprüft: dieselbe Stellung sechsmal mit Seed 7 — identische Werte,
mit und ohne vorher bewertete Stellung, mit und ohne Zurücksetzen des Engine-Zustands (mein erster Verdacht,
übergeschleppter Cache-Zustand, war damit **falsch**). Und die komplette Suche über 392 Paare, zweimal
hintereinander mit festem Seed: **identisch**.

### 3.4 Dass Training die Priors genug bewegt

Echte `trainGame`-Aufrufe über Beispiele aus Archivstellungen, gebaut wie im Spiel (`boardToInput` + `forward`,
**keine Attrappen** — mit denen landet man im Divergenzpfad, die Falle aus TRAIN-1 §4 und TRAIN-2 §4). Null
Divergenzen, Netz gesund. Die Priors der betrachteten Kandidaten verschoben sich um **5·10⁻⁵ bis 7,5·10⁻⁵**.

Das ergibt eine Verschiebung von `m` um `bw · 5000 · ~1,2·10⁻⁴`, also **~0,18 bei Blend 0,3** und **~0,06 bei
Blend 0,1**. Brauchbar sind demnach Stellungen, deren `|m|` unter dieser Verschiebung liegt.

### 3.5 Dritte Berichtigung: `blendWeight` ist bei einem frischen Netz 0

```js
get blendWeight() {
  if (!this._healthy) return 0;
  if (this.gamesPlayed < 2) return 0;
  return Math.min(PARAMS.netMaxBlend, (this.gamesPlayed / Math.max(1, PARAMS.netWarmup)) * PARAMS.netMaxBlend);
}
```

Meine Suche benutzte die Priors eines **frischen** Netzes (`gamesPlayed` 0). Arm A braucht aber `blendWeight > 0`,
also `gamesPlayed >= 2` — und ein solches Netz ist schon trainiert und hat **andere Priors**. Die Stellung, die ich
in der ersten Fassung festgelegt hatte (`hand-427` @110), hatte mit dem frischen Netz Δp **+0,22**·10⁻⁴ und mit
einem W₀ nach zwei Trainingsschritten Δp **−8,06**·10⁻⁴ — **das Vorzeichen kippt**, und `m` liegt 230-mal weiter von
der Grenze. Sie war mit Priors ausgesucht, die in der Messung nie vorkommen.

**Festlegung daraus:** `netWarmup` wird auf 2 gesetzt und W₀ auf `gamesPlayed >= 2` trainiert. Dann ist
`blendWeight == netMaxBlend` **exakt**, in Arm A wie in Arm B, unabhängig davon wie oft W₁ zusätzlich trainiert wird.
Beide Parameter werden im Ergebnis genannt.

### 3.6 Was die korrigierte Suche ergibt

Mit festem Seed 7, W₀ (`gamesPlayed` 2, `blendWeight` = `netMaxBlend`), 56 Stellungen × 7 Blendwerte = 392 Paare:

| Blend | Stellung | Kandidaten | Lücke | Δp (10⁻⁴) | `m` | Rangwechsel schon mit W₀ |
|---|---|---|---|---|---|---|
| **0,1** | `hand-364` @120, S | D6 vs D5 | 0,2328 | +3,839 | **−0,0176** | nein — und das Training bewegt 0,06 |
| 0,1 | `hand-364` @110, S | D6 vs D5 | 0,1732 | +6,859 | +0,1871 | ja |
| 0,3 | `hand-364` @120, S | D6 vs D5 | 0,2328 | +3,839 | +0,4129 | ja |
| 0,3 | `hand-427` @90, S | K10 vs K9 | 0,3276 | −4,873 | −0,9603 | nein |

**58 von 392** Paaren kippen schon mit W₀ — dass der Blend die Rangfolge ändert, ist gezählt, nicht vermutet.

**Wichtige Einschränkung:** `m > 0` ist ein Rangwechsel in der **Kandidatenliste**, nicht notwendig ein anderer
**Zug**. Die Liste bildet die Wurzelkinder, die Suche entscheidet danach. Ein Rangwechsel ist notwendig, aber nicht
hinreichend — deshalb wird beides getrennt festgehalten, wie Hazeberry es vorgeschlagen hat.

## 4. Aufbau: drei Arme über alle 56 Stellungen

**Abweichung von der ersten Fassung, und sie ist eine Verbesserung:** Dort war **eine** Stellung auf der Kippgrenze
festgelegt. Das ist der schwächere Aufbau — ein Ergebnis an einer Kante verallgemeinert auf nichts, und §3.5 hat
gezeigt, wie leicht die Kante wegrutscht, wenn sich eine Voraussetzung ändert. Stattdessen laufen alle drei Arme
über **alle 56 Stellungen**, und das Ergebnis ist eine **Anzahl** statt einer Anekdote.

Alle Arme mit **identischem** Seed (7, vor jedem Aufruf neu gesetzt mit `mulberry32`, wie in `passregel-lib.js` und
`wurzel-replay.js`), identischem `mctsFixedSims` (120, die Standardbedingung aus `CLAUDE.md`) und identischem
`blendWeight`.

| Arm | Was das Netz liefert | Rolle |
|---|---|---|
| **A** | echtes `policyNet` mit **W₀** (`gamesPlayed` 2) | der „Originalzug" je Stellung |
| **B** | echtes `policyNet` mit **W₁** = W₀ plus weitere echte Trainingsschritte | der Befund: Zug und Rangfolge |
| **C** | Worker-Stummel (`{blendWeight, _netPriors}`, ohne `forward`) mit den in A **aufgezeichneten** Priors | der dritte Arm, der scheitern kann |

**Arm C ist der Ersatz für Hazeberrys Gegenprobe und etwas anderes als sie.** Er fragt nicht „wirken die Priors"
(konstruktionsgleich mit A, §2), sondern: **Würde ein Fehlerbericht mit `netPriors` die Nachstellung retten?** Ein
Nachsteller hat nach einem Trainingslauf W₁; er kann die Priors entweder neu rechnen (= Arm B) oder, wenn der
Bericht sie trüge, einspeisen (= Arm C). Diese zwei Mechanismen stehen ihm wirklich zur Verfügung.

Festgehalten wird je Arm und Stellung: Zugtyp und Punkt, `info`, Reihenfolge und Punktwerte der ersten drei
Kandidaten, `blendWeight`, `gamesPlayed`, `_divergences`, `_healthy`, und die Priors der ersten zwei Kandidaten.

**Zwei Blendwerte**, getrennt ausgewertet: **0,1** und **0,3**. Nicht um den besseren zu finden, sondern weil §3.4
zeigt, dass die Trainingsverschiebung bei 0,1 einen größeren Teil des Randes ausmacht — ein Wechsel ist dort
wahrscheinlicher, und ein Nullergebnis bei beiden wäre stärker als bei einem.

## 5. Endpunkt, Umfang, Urteil

- **Endpunkt:** je Stellung und Blendwert zwei Ja/Nein-Angaben — (a) liefert Arm B einen anderen **Zug** als Arm A,
  (b) liefert Arm B eine andere **Rangfolge** der ersten zwei Kandidaten. Dazu, für jede Stellung mit (a): liefert
  Arm C den Zug aus Arm A zurück.
- **Umfang:** 56 Stellungen × 2 Blendwerte × 3 Arme × 2 Wiederholungen = **672 Aufrufe** mit `mctsFixedSims` 120.
  Läuft im Container; sprengt es das Budget, geht es nach Actions. Die Sondierungen brauchten für 392 Aufrufe mit
  20 Simulationen je rund zwei Minuten.
- **Keine statistischen Schwellen.** Das ist eine Auszählung deterministischer Einzelfälle, kein gepaarter
  Spielstärkevergleich: Bei festem Seed ist jeder Aufruf reproduzierbar (§3.3), es gibt nichts zu mitteln und keine
  Siegquote. Entsprechend kein McNemar und kein Clopper-Pearson — die Standardbedingungen aus `CLAUDE.md` gelten
  für Spielstärkemessungen, und das ist keine. Berichtet werden Anzahlen mit Nenner.
- **Urteil:**
  - **„Nachstellung bricht"** — mindestens eine Stellung, in der Arm B einen anderen Zug liefert als A **und** Arm C
    den Zug aus A zurückbringt. Dann ist belegt: Der Bericht ohne `netPriors` reicht dort nicht, mit ihnen schon.
    Berichtet wird die Anzahl solcher Stellungen von 56, je Blendwert.
  - **„Nur Rangwechsel"** — Rangwechsel ja, Zugwechsel nirgends. Die Wirkung ist nachgewiesen, bleibt aber ohne
    Folge für den Zug in diesen Stellungen.
  - **„Kein Unterschied"** — Arm B liefert überall dasselbe wie A. Gültiges Ergebnis **für diese 56 Stellungen**;
    die Aussage in §8.4 bleibt dann geschlossen statt gemessen, und das wird so berichtet.

**Gültigkeitsregel.** Zwei Zustände, gültig oder ungültig. **Ungültig**, mit „kein Urteil" und Grund, wenn
irgendetwas davon zutrifft:

1. `blendWeight` ist in einem Arm 0 oder weicht zwischen den Armen ab (§3.5).
2. Ein Arm meldet eine Divergenz oder ein krankes Netz.
3. Die Priors in Arm C sind nicht **gleich** den in Arm A aufgezeichneten — Prüfung auf Gleichheit, nicht
   Ähnlichkeit. Das ist gleichzeitig die Prüfung der Einspeisung, die Hazeberrys Gegenprobe leisten sollte (§2).
4. Zwei Wiederholungen desselben Arms liefern in irgendeiner Stellung verschiedene Züge. Ohne das wäre ein
   Unterschied zwischen A und B nicht von Rauschen zu trennen — und §3.3 zeigt, dass das Rauschen hier größer ist
   als der Effekt, den wir suchen.
5. W₀ und W₁ sind byteidentisch (dann wäre nichts trainiert worden).

## 6. Was diese Messung nicht sagt

- **Sie gilt nur bei `netMaxBlend` > 0.** Der ausgelieferte Standard ist 0, dort gehen die Priors nicht in die
  Zugwahl ein. Jede Aussage hier beginnt mit „wenn jemand den Blend einschaltet".
- **Kein Spielstärkeergebnis.** Ein anderer Zug ist kein schlechterer Zug. Die Messung sagt nichts darüber, ob W₀
  oder W₁ besser spielt.
- **56 Stellungen aus sechs Partien**, alle aus Handpartien dieses Projekts. Keine Zufallsstichprobe aus einer
  definierten Grundgesamtheit; die Anzahl ist eine Auszählung über genau diese Stellungen.
- **Ein Seed.** Bei festem Seed ist alles reproduzierbar, aber die Rangfolge der Kandidaten hängt am Rauschterm
  (§3.3). Ein anderer Seed gibt andere Paare und möglicherweise eine andere Anzahl. Das ist eine **Grenze der
  Aussage**, nicht ein Mangel der Durchführung; ein zweiter Seed wäre die nächste Stufe.
- **W₁ kommt aus echten Trainingsschritten auf echten Merkmalen, nicht aus echten Partien.** Die genaue
  Beschreibung — Anzahl der Aufrufe und der Beispiele — steht im Ergebnis. Was ein Trainingsstand nach hundert
  gespielten Partien tut, ist nicht gemessen.
- **Eine Umgebung**, Node im Container, keine Browserprüfung.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Messung als eigener PR: Werkzeug unter `auswertung/diagnose/`, Rohdaten unter
   `docs/daten/prior-reproduktion/`, Nachtrag hier mit dem Urteil nach §5.
3. Trifft das Urteil „Nachstellung bricht", folgt eine eigene Entscheidung, ob `netPriors` doch in den Bericht
   kommt — gegen die 7 775 Zeichen aus BR-1 §3. Diese Messung entscheidet das **nicht** vor, sie liefert die
   Tatsache dazu.
4. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.

## 8. Nachtrag: Messung und Urteil (23.11.2026)

**Urteil: „Nur Rangwechsel". Gültig.** Rohdaten `docs/daten/prior-reproduktion/lauf1.json`, Konsole
`lauf1-konsole.txt`.

### 8.1 Drei Fehler im Werkzeug, vor dem Ergebnis gefunden

Die Messung hat zuerst das Werkzeug widerlegt, nicht die Frage beantwortet. Die Zahlen der ersten zwei Läufe sind
Ergebnisse eines fehlerhaften Aufbaus und **nicht abgelegt**.

1. **Falscher Endpunkt.** §5 legt die Rangfolge der ersten **zwei** Kandidaten fest; das Werkzeug verglich die
   ersten **drei** und zählte fünf Rangwechsel statt einem. Jetzt werden `rangWechselTop2` (der Endpunkt) und
   `rangWechselTop3` getrennt geführt.
2. **`mctsTreeReuse` stand im Default auf 1.** Damit trägt `_mctsSavedRoot` den Suchbaum von Aufruf zu Aufruf
   weiter: Arm B erbte den Baum, den Arm A gerade auf **demselben** Brett gebaut hatte. Die Arme waren nicht
   unabhängig. Jedes andere Auswertungswerkzeug im Repo setzt es auf 0 (`annaeherung.js`, `kritisch-rang.js`,
   `lebensurteil-vergleich.js`, `lerner-pruefung.js`, `muster-endspiel-daten.js`); ich hatte es übersehen.
3. **Die Startgewichte des Netzes waren nicht geseedet.** Zwei Läufe mit identischen Argumenten wichen um 0,05 bis
   0,6 Punkte ab. Ursache: Der PolicyNet-Konstruktor zieht die Startgewichte mit `_rand`, also `Math.random`, beim
   Auswerten des `policy-net`-Blocks — **vor** jeder Zeile des Werkzeugs. Jeder Prozess hatte damit ein anderes W₀,
   andere Priors und andere geblendete Punktwerte; die Abweichung passt genau auf `bw · Δp · netScoreScale`. Der
   Generator wird jetzt **vor** `ladeKI` gesetzt. Nachgewiesen: zwei getrennte Prozesse liefern **bitgleiche**
   Berichte.

**Eine Lücke in dieser Festlegung selbst:** §5 Nr. 4 prüft zwei Aufrufe desselben Arms **innerhalb** eines
Prozesses — die waren immer identisch, auch mit Fehler 3. Prozessübergreifende Wiederholbarkeit stand nicht in der
Regel. Das war eine Lücke in meiner Vorgabe, nicht im Werkzeug, und wer die Regel künftig anwendet, sollte sie
mitnehmen.

**Allgemeine Folge für das Repo:** Jede Messung, in der ein frisches PolicyNet vorkommt, ist prozessübergreifend
nicht wiederholbar, solange `Math.random` nicht **vor** dem Laden der Blöcke gesetzt ist. Bei `netMaxBlend` 0 fällt
das nicht auf, weil das Netz dann nicht in die Zugwahl eingeht.

### 8.2 Das Ergebnis

Seed 7, `mctsFixedSims` 120, `netWarmup` 2, `mctsTreeReuse` 0. W₀: `gamesPlayed` 2 aus 12 Beispielen. W₁:
`gamesPlayed` 8 aus 48 Beispielen, 8 `trainGame`-Aufrufe. Gewichte verschieden, null Divergenzen, Netz gesund.

| Blend | Stellungen | **Zugwechsel** | Rangwechsel erste zwei | Rangwechsel erste drei | Arm C stellt her | Zug = Spitzenkandidat |
|---|---|---|---|---|---|---|
| 0,1 | 56 | **0** | 0 | 0 | 0 | 13 |
| 0,3 | 56 | **0** | **1** | 1 | 0 | 13 |

`blendWeight` war in **allen** Armen exakt 0,1 beziehungsweise 0,3; jeder Arm bei Wiederholung identisch; die in
Arm C eingespeisten Priors bitgleich den in Arm A aufgezeichneten. Keiner der fünf Ungültigkeitsgründe traf zu.

**Der eine Rangwechsel**, `hand-364.sgf` @110, Schwarz, Blend 0,3:

| | Kandidaten | gewählter Zug |
|---|---|---|
| Arm A (W₀) | D5 = 3511,6565 · D6 = 3511,5704 · Q6 = 3510,7778 | **P14** |
| Arm B (W₁) | **D6** = 3511,6826 · **D5** = 3511,6708 · Q6 = 3510,7958 | **P14** |

Die Priors der beiden tauschten die Reihenfolge (A: 2,574·10⁻³ gegen 2,504·10⁻³; B: 2,583·10⁻³ gegen 2,584·10⁻³),
die Lücke betrug 0,0861 Punkte — und der **Zug blieb derselbe**.

Die Prior-Verschiebung von W₀ nach W₁ am jeweiligen Spitzenkandidaten lag zwischen **3,5·10⁻⁸ und 1,4·10⁻⁴**, also
in derselben Größenordnung wie der Unterschied zwischen zwei Kandidaten überhaupt.

### 8.3 Was das heißt, und was nicht

**Die Frage aus §8.4 des BR-1-Docs ist nicht bestätigt.** In 112 Fällen hat der geänderte Trainingsstand **keinen
einzigen Zug** verändert. Für diese 56 Stellungen bleibt die Aussage „eine Nachstellung kann einen anderen Zug
ergeben" **geschlossen, nicht gemessen** — sie ist damit nicht widerlegt, sondern unbestätigt.

**Arm C ist hier gegenstandslos.** Ohne Zugwechsel gibt es nichts herzustellen; `cStelltHer` 0 sagt nichts über
seinen Wert. Dass die Einspeisung funktioniert, ist über die Prior-Gleichheit belegt — er hatte nur keine Arbeit.

**Eine gemessene Erklärung, warum nichts passiert:** In nur **13 von 56** Stellungen war der gewählte Zug überhaupt
der Spitzenkandidat der Wurzelliste. Die Suche nimmt nicht den Listenkopf; bei 120 Simulationen entscheidet sie
selbst, und eine Umsortierung der Spitze erreicht den Zug meist nicht. Im einen Rangwechsel oben war der gewählte
Zug P14 — keiner der drei getauschten Kandidaten.

**Eine Berichtigung an `docs/passregel-wege-nachtrag-vorabfestlegung.md` §2.2.** Dort habe ich aus der
GTP-Messung (Partie 427, `pass` gegen `R4`) geschlossen, eine Nachstellung aus dem Fehlerbericht würde „einen
anderen Zug ergeben". Diese Messung betraf die **Versuchsregel** über `extra`, nicht die Priors. Für die Priors sagt
die Messung hier: kein Zugwechsel in 56 Stellungen. **Die praktische Reichweite des fehlenden `netPriors` ist
kleiner, als ich dort argumentiert habe.** Die Entscheidung in BR-1 §3, `netPriors` nicht aufzunehmen, steht damit
besser da als zum Zeitpunkt ihrer Begründung — das war Glück, nicht Weitsicht.

### 8.4 Was offen bleibt

- **Ein Seed.** Die Rangfolge hängt am Rauschterm der Bewertung; ein anderer Seed gibt andere Kandidatenpaare und
  möglicherweise eine andere Anzahl. Das ist die wichtigste offene Flanke.
- **Wenig Training.** W₁ liegt nur sechs `trainGame`-Aufrufe hinter W₀, und die Prior-Verschiebung ist entsprechend
  klein (maximal 1,4·10⁻⁴). Ein Netz nach hundert echten Partien könnte weiter auseinanderliegen.
- **Die 13 Stellungen, in denen der Zug am Spitzenkandidaten hängt**, wären die interessantere Stichprobe. Eine
  Messung, die sich auf sie beschränkt, hätte mehr Aussicht — und wäre eine eigene Festlegung.
- **56 Stellungen aus sechs Handpartien**, keine Zufallsstichprobe. Node im Container, keine Browserprüfung.
- **Kein Spielstärkeergebnis**, und alles nur unter `netMaxBlend` > 0, was nicht der ausgelieferte Standard ist.
