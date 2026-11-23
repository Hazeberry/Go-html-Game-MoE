# Prior-Messung: wann der Fehlerbericht zur Nachstellung nicht reicht

**Stand: 23.11.2026. Status: Entwurf, nicht gemessen.** Vorschlag von Hazeberry am 23.11.2026. Sie schließt den
letzten offenen Punkt aus `docs/passregel-wege-nachtrag-vorabfestlegung.md` §8.4: Dass eine Nachstellung aus dem
Fehlerbericht einen **anderen Zug** ergeben kann, wenn das Netz mitsteuert, ist dort **geschlossen, nicht gemessen**.

Dieses Doc enthält Vorgaben. Hazeberry liest es vor dem Merge.

## 1. Die Frage

`buildBugReport` liefert `reproduktion` — Brett, Historie, Gefangene, Ko-Punkt, `reqId`, `extra`, `PARAMS`. **Nicht**
dabei: die Netzgewichte und die Priors (BR-1 §3, mit gemessener Begründung). Solange `netMaxBlend` 0 ist, spielt das
keine Rolle. Sobald jemand den Blend einschaltet, hängt der Zug an den Priors — und die hängen an Gewichten, die
sich mit jedem Training ändern.

**Die Frage, zugespitzt:** Ergibt dieselbe Stellung, mit demselben Seed, derselben Simulationszahl und demselben
`netBlend`, einen anderen Zug, wenn nur der Trainingsstand des Netzes ein anderer ist?

## 2. Hazeberrys Aufbau, und wo er nicht trägt

Sein Vorschlag: Originalzug und Priors festhalten; dieselbe Stellung zweimal nachspielen, einmal mit den
ursprünglichen Gewichten, einmal mit einem späteren Trainingsstand; Lauf 1 muss den Originalzug treffen, sonst taugt
der Vergleich nicht; in Lauf 2 auch die Rangfolge der beiden Kandidaten festhalten. Als Gegenprobe: wechselt der Zug,
ihn mit den **aufgezeichneten Original-Priors** noch einmal nachspielen — kommt der ursprüngliche Zug zurück, ist der
Beleg da.

**Die Gültigkeitsregel, die Rangfolge und die Stellungswahl übernehme ich unverändert.** Die Gegenprobe trägt
nicht, und zwar aus einem Grund, der am Code steht:

Das Netz erreicht die Zugwahl über **genau einen Kanal**, den Prior-Vektor. `_getAIMoveKern` (`worker-ai`,
Z. 4598 bis 4616) nimmt `_bw = policyNet.blendWeight`, holt `_p` entweder aus `forward()` oder aus
`policyNet._netPriors` und blendet nur bei `_bw > 0`; alles weitere, was dort geschrieben wird (`_netHidden`,
`_netInp`), ist Buchhaltung fürs Training. `docs/bughunt-wiederholung.md` §6 hält dasselbe aus dem Lesen **aller**
`policyNet.`-Verwendungen fest.

Die Original-Gewichte **erzeugen** also genau die aufgezeichneten Priors; es gibt keinen zweiten Weg, auf dem sie
wirken könnten. Die Gegenprobe ist damit mit Lauf 1 **konstruktionsgleich**. Sie kann nicht unabhängig scheitern —
käme dort ein anderer Zug heraus, wäre das ein Fehler in der Einspeisung, kein Befund über die Priors. Als Prüfung
der Apparatur ist sie nützlich, als Beleg trägt sie nichts.

**Deshalb ein dritter Arm, der scheitern kann** (§4, Arm C): die Stellung so nachspielen, wie ein Fehlerbericht sie
wirklich liefert.

## 3. Sondierung (gemessen, 23.11.2026)

**Was lief, wo, mit welchem Go:** Trockenläufe auf Archivstellungen im Container, auf Hazeberrys Go für
kostengünstige Läufe. Quelle: die sechs `tests/stellungen/hand-*.sgf`, je die ersten N Züge eingespielt. Messanker im
Quelltext nach dem Vorbild von `auswertung/diagnose/wurzel-replay.js` — eine Zeile, die die endgültige
Kandidatenliste herausreicht und nichts verändert. Kein Messlauf, keine Partie.

### 3.1 Wie dicht die besten Kandidaten liegen

28 Stellungen (Zug 60 bis 140 in Schritten von 20), `netMaxBlend` 0, 20 Simulationen. Lücke zwischen Platz 1 und 2,
auf Punktskalen von rund 2 000 bis 8 700: von **0,167** bis 386. Mit feinerem Raster (Schritt 10, 56 Stellungen)
kamen noch dichtere Paare dazu: **0,0462** (`hand-364` @110), **0,0545** (`hand-427` @90), **0,0559**
(`hand-427` @110).

### 3.2 Eine Fehleinschätzung von mir, berichtigt

Ich hatte Prior-Unterschiede zwischen zwei Punkten von etwa 4·10⁻³ angenommen und daraus einen Prior-Term von
„einigen Einheiten" gerechnet. **Das war um etwa den Faktor 100 falsch.** Gemessen an `hand-364` @120: Q6 hat
0,0030495, D5 0,0029150 — Unterschied **1,3·10⁻⁴**. Der Softmax über 361 Punkte liegt dicht am Mittel
1/361 = 0,00277. Bei `netScoreScale` 5000 und Blend 0,3 ist der Prior-Term damit rund **0,2 Punkte**, nicht 6.

Daraus folgt die Kippbedingung, die die Stellungswahl bestimmt — und nicht die Punktlücke allein:

```
m = bw · netScoreScale · (p₂ − p₁) − (1 − bw) · (s₁ − s₂)      Rangwechsel genau dann, wenn m > 0
```

Der Zweitplatzierte muss den **höheren** Prior haben. An `hand-364` @120 ist das nicht so (D5 liegt im Prior
niedriger), und dort kippt bei Blend 0,1, 0,3 und 0,6 nichts — weder vor noch nach dem Training. Die kleinste
Punktlücke ist also kein brauchbares Kriterium.

### 3.3 Dass Training die Priors genug bewegt

Drei echte `trainGame`-Aufrufe über 18 Beispiele aus Archivstellungen, gebaut wie im Spiel (`boardToInput` +
`forward`, **keine Attrappen** — mit denen landet man im Divergenzpfad, die Falle aus TRAIN-1 §4 und TRAIN-2 §4).
Null Divergenzen, Netz gesund, `gamesPlayed` 0 → 3. Die Priors der beiden Kandidaten verschoben sich um
**−7,5·10⁻⁵** und **+5,2·10⁻⁵** — dieselbe Größenordnung wie ihr Unterschied selbst.

### 3.4 Eine Stellung sitzt auf der Kippgrenze

392 Paare (56 Stellungen × 7 Blendwerte) gerechnet. Ergebnis:

| Stellung | Kandidaten | Lücke | Δp (10⁻⁴) | Blend | `m` | Rangwechsel |
|---|---|---|---|---|---|---|
| `hand-427` @110, Schwarz | K11 vs K9 | 0,0559 | +0,223 | 0,2 | −0,0224 | nein |
| | | | | **0,3** | **−0,0057** | **nein, aber 0,6 % von der Grenze** |
| | | | | 0,45 | +0,0194 | ja |
| | | | | 0,6 | +0,0446 | ja |

Das ist die Stellung für die Messung: Bei Blend 0,3 liegt sie **knapp unter** der Grenze, der Originalzug sollte
also K11 sein (Gültigkeitsregel), und eine Prior-Änderung von etwa 10⁻⁶ würde sie überschreiten — das Training
in §3.3 hat **zehnmal mehr** bewegt.

**Nebenbefund:** **44 von 392** Paaren kippen schon mit den Originalgewichten. Dass der Blend die Rangfolge
überhaupt ändert, ist damit nicht hypothetisch, sondern gezählt.

**Wichtige Einschränkung:** `m > 0` ist ein Rangwechsel in der **Kandidatenliste**, nicht notwendig ein anderer
**Zug**. Die Liste bildet die Wurzelkinder, die Suche entscheidet danach. Ein Rangwechsel ist also notwendig, aber
nicht hinreichend. Deshalb wird in §4 beides getrennt festgehalten, wie Hazeberry es vorgeschlagen hat.

## 4. Aufbau: drei Arme

Alle Arme auf derselben Stellung (`hand-427.sgf`, erste 110 Züge, Schwarz am Zug), mit **identischem** Seed,
`mctsFixedSims` und `blendWeight`. `Math.random` wird vor jedem Arm aus demselben Seed neu gesetzt
(`mulberry32`, wie in `passregel-lib.js` und `wurzel-replay.js`).

| Arm | Was das Netz liefert | Rolle |
|---|---|---|
| **A** | echtes `policyNet` mit den **Originalgewichten** W₀ | Gültigkeit: muss den Originalzug treffen |
| **B** | echtes `policyNet` mit dem **späteren Stand** W₁ (§3.3) | der Befund: Zug und Rangfolge der beiden Kandidaten |
| **C** | Worker-Stummel mit den **aufgezeichneten Priors** aus A, bei sonst gleichem Zustand wie B | der dritte Arm, der scheitern kann |

**Arm C ist der Ersatz für Hazeberrys Gegenprobe und etwas anderes als sie.** Er fragt nicht „wirken die Priors"
(das ist konstruktionsgleich mit A, §2), sondern: **Würde ein Fehlerbericht mit `netPriors` die Nachstellung
retten?** Ein Nachsteller hat nach einem Trainingslauf W₁; er kann die Priors entweder neu rechnen (= Arm B) oder,
wenn der Bericht sie trüge, einspeisen (= Arm C). Diese zwei Mechanismen stehen ihm wirklich zur Verfügung, und ihr
Unterschied ist die Antwort auf §8.4.

Festgehalten wird je Arm: Zugtyp und Punkt, `info`, die Reihenfolge und Punktzahl der ersten drei Kandidaten,
`policyNet.blendWeight`, `gamesPlayed`, `_divergences`, `_healthy`, und die Priors der beiden Kandidaten.

## 5. Endpunkt, Umfang, Schwellen

- **Endpunkt:** der von `getAIMove` zurückgegebene Zug je Arm, und getrennt davon die Rangfolge der beiden
  Kandidaten in der Wurzelliste.
- **Umfang:** eine Stellung, drei Arme, je ein Aufruf. Zusätzlich dieselben drei Arme auf den zwei nächstgelegenen
  Stellungen aus §3.4 (`hand-427` @90, `hand-364` @110) als Breitenprobe — insgesamt neun Aufrufe.
- **Schwellen:** keine statistischen. Das ist eine **Einzelfallmessung**, kein gepaarter Vergleich; es gibt nichts
  zu mitteln und keine Siegquote. Entsprechend auch kein McNemar und kein Clopper-Pearson — die Standardbedingungen
  aus `CLAUDE.md` gelten für Spielstärkemessungen, und das ist keine.
- **Urteil:**
  - **„Nachstellung bricht"** — wenn Arm B einen anderen Zug liefert als Arm A **und** Arm C den Zug aus A
    zurückbringt. Dann ist belegt: Der Bericht ohne `netPriors` reicht nicht, mit ihnen schon.
  - **„Nur Rangwechsel"** — wenn B eine andere Rangfolge, aber denselben Zug liefert. Dann ist die Wirkung
    nachgewiesen, aber ohne Folge für den Zug in dieser Stellung.
  - **„Kein Unterschied"** — wenn B dasselbe liefert wie A. Gültiges Ergebnis **für diese Stellungen**; die Aussage
    in §8.4 bleibt dann geschlossen statt gemessen, und das wird so berichtet.

**Gültigkeitsregel.** Zwei Zustände, gültig oder ungültig. **Ungültig**, mit „kein Urteil" und Grund, wenn
irgendetwas davon zutrifft:

1. Arm A trifft den Originalzug nicht.
2. `blendWeight` ist in einem Arm 0 oder weicht zwischen den Armen ab.
3. Ein Arm meldet eine Divergenz oder ein krankes Netz.
4. Die Priors in Arm C sind nicht die aus Arm A aufgezeichneten (Prüfung auf Gleichheit, nicht auf Ähnlichkeit).
5. Zwei Aufrufe desselben Arms mit demselben Seed liefern verschiedene Züge.

Punkt 5 wird ausdrücklich geprüft: Jeder Arm läuft **zweimal**, und beide Läufe müssen übereinstimmen. Ohne das
wäre ein Unterschied zwischen A und B nicht von Rauschen zu trennen.

## 6. Was diese Messung nicht sagt

- **Sie gilt nur bei `netMaxBlend` > 0.** Der ausgelieferte Standard ist 0, dort gehen die Priors nicht in die
  Zugwahl ein. Jede Aussage hier beginnt mit „wenn jemand den Blend einschaltet".
- **Kein Spielstärkeergebnis.** Ein anderer Zug ist kein schlechterer Zug. Die Messung sagt nichts darüber, ob W₀
  oder W₁ besser spielt.
- **Der Rand ist ein Messerrücken.** Bei Blend 0,3 beträgt `m` −0,0057, rund 0,6 % der Lücke. Ein Ergebnis an so
  einer Kante verallgemeinert auf **nichts** außer diese Stellung. Genau deshalb die Breitenprobe auf zwei weiteren
  Stellungen — und auch die trägt nur für ihre Stellungen.
- **W₁ kommt aus echten Trainingsschritten auf echten Merkmalen, nicht aus echten Partien.** „Gewichte nach drei
  `trainGame`-Aufrufen über 18 Beispiele aus Archivstellungen" ist die genaue Beschreibung, und so steht sie im
  Ergebnis. Was ein Trainingsstand nach hundert gespielten Partien tut, ist damit nicht gemessen.
- **Eine Umgebung**, Node im Container, keine Browserprüfung.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Messung als eigener PR: Werkzeug unter `auswertung/diagnose/`, Rohdaten unter
   `docs/daten/prior-reproduktion/`, Nachtrag hier mit dem Urteil nach §5.
3. Trifft das Urteil „Nachstellung bricht", folgt eine eigene Entscheidung, ob `netPriors` doch in den Bericht
   kommt — gegen die 7 775 Zeichen aus BR-1 §3. Diese Messung entscheidet das **nicht** vor, sie liefert die
   Tatsache dazu.
4. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.
