# Rauschterm der Bewertung: Was kostet die Zugstreuung an Spielstärke?

**Stand: 23.11.2026. Status: Entwurf, nicht gemessen.** Hazeberry hat am 23.11.2026 zugestimmt, das zu untersuchen.
Dieses Doc enthält Vorgaben; er liest es vor dem Merge. **Der Messlauf braucht ein eigenes, ausdrückliches Go.**

## 1. Die Frage

Die Zugbewertung addiert Zufall. `evalMidgame` endet auf `s + Math.random() * 4`, und drei weitere
Bewertungsfunktionen tun Ähnliches. Der Kommentar in `index.html` Z. 1238 nennt den Zweck: **„Rauschterm zur
Zugstreuung"** — die KI soll nicht immer denselben Zug spielen.

Das ist eine bewusste Entscheidung für Vielfalt, kein Fehler. **Was sie an Spielstärke kostet, ist nie gemessen
worden**, und zwar weil es sich nicht messen ließ: Die fünf Faktoren sind hartkodiert, es gibt keinen
`PARAMS`-Eintrag dafür.

**Warum das die lohnendste offene Frage ist:**

- Sie betrifft den **Standard**. Jeder Zug jeder Partie — anders als das PolicyNet, das bei `netMaxBlend` 0 die
  Zugwahl nie erreicht.
- Das Projekt zeigt selbst dorthin. `docs/skalierung.md` Z. 109 schließt aus der Skalierungsmessung, die Grenze
  „liegt also nicht in der Suche, sondern in der **Bewertung**, die sie füttert"; `CLAUDE.md` hält das als
  **vermutet, nicht nachgewiesen** fest. Hier wäre es direkt prüfbar.
- Der Term ist nicht Dekoration. **Gemessen** an den 56 Mittelspielstellungen aus
  `docs/prior-reproduktion-vorabfestlegung.md`: In **6 von 56** (11 %) liegen die beiden besten Kandidaten unter
  8 Punkten auseinander — in Reichweite zweier Rauschterme von je bis 4. In **3 von 56** unter 0,5 Punkten, dort
  entscheidet der Zufall die Spitze der Wurzelliste allein. Median 57, Maximum 3 973.

**Das Vorzeichen ist unbekannt.** Das Rauschen speist die Wurzelpriors und wirkt damit auch als Erkundung. Weniger
davon kann die Suche schärfen oder verengen. Deshalb wird gemessen, nicht argumentiert — und „kostet nichts
Messbares" ist ein ebenso brauchbares Ergebnis, denn dann ist die Vielfalt gratis.

## 2. Wo das Rauschen sitzt

`evaluateMove` mischt vier Experten nach Phasengewicht (`index.html` Z. 3975 ff.); jeder von ihnen endet auf einen
Rauschterm. **Diese vier sind der Gegenstand:**

| Funktion | Zeile | Term |
|---|---|---|
| `evalOpening` | 3137 | `s + Math.random() * 3` |
| `evalMidgame` | 3255 | `s + Math.random() * 4` |
| `evalEndgame` | 3689 | `s + Math.random() * 0.5` |
| `evalTsumego` | 3902 | `s * safetyMul + Math.random() * 3` |

## 3. Was ausdrücklich NICHT angefasst wird

Es gibt weitere Zufallsstellen in `worker-ai`. Sie bleiben unberührt, jede aus einem eigenen Grund:

| Stelle | Was es ist | Warum draußen |
|---|---|---|
| `quickEval` Z. 4067, `* 5` | Bewertung **in den Ausspielungen** (Aufrufer Z. 4325 im `rollout`, Z. 4689 in der MCTS-Expansion) | Das ist die Ausspielstrategie, nicht die Kandidatenordnung. Eine deterministische Ausspielstrategie wäre ein anderer, riskanterer Eingriff: alle Playouts würden sich ähneln, und MCTS lebt von ihrer Streuung. Eigene Frage, eigene Festlegung. |
| Z. 3664 und 3818, `-10000 + Math.random()` | Gleichstandsbruch unter Zügen, die sich selbst schlagen | Ein Jitter unter 1 Punkt auf einer Strafe von −10 000. Skalieren ändert dort nichts Erkennbares. |
| Z. 4280 (`sampleLegalMoves`), Z. 4329 (Ausspielzug aus den besten) | Zufall der Ausspielungen | wie `quickEval` |
| Z. 5542 und 5545 | Zufallswahl unter den besten 25 % bzw. 8 % der Kandidaten | Das ist die **absichtliche Schwächung** von Leicht und Mittel. Auf Schwer läuft sie nicht, und die Messung läuft auf Schwer. |

Diese Trennung ist der Kern des Zuschnitts: **Gemessen wird das Rauschen, das die Kandidatenordnung bestimmt** —
das, was der Spieler als Zugwahl sieht. Das Rauschen der Ausspielungen bleibt, wie es ist.

## 4. Die Änderung

Ein Parameter, vier Einfügungen, nichts wird entfernt.

```js
  evalStreuung:      1.00,   // Faktor auf den Rauschterm der vier Bewertungsexperten
                             // (evalOpening/Midgame/Endgame/Tsumego). 1 = heutiges
                             // Verhalten, 0 = kein Rauschen. Zweck des Rauschens ist
                             // Zugstreuung (Z. 1238); was es an Stärke kostet, misst
                             // docs/eval-streuung-vorabfestlegung.md.
```

An den vier Stellen wird der Term rechts erweitert, zum Beispiel:

```js
  return s + Math.random() * 4 * PARAMS.evalStreuung;
```

**Bei `evalStreuung` 1 ist das bitgleich, und zwar konstruktiv, nicht zufällig.** JavaScript rechnet von links:
`((r * 4) * 1)`. Eine Multiplikation mit 1,0 ist in IEEE 754 für jeden endlichen Wert **exakt** — sie ändert kein
Bit. Das ist dieselbe Art von Argument, die `evaluateMove` Z. 3980 ff. für `phaseNormalize` führt („bei einem
einzigen aktiven Experten wäre (v/S)·S mathematisch v, aber nicht bitgenau"), nur fällt es hier zu unseren Gunsten
aus.

**Kein Dashboard-Feld.** Der Parameter wird über `ab-harness.js --A`/`--B` gesetzt. Ein Feld samt Tooltip und
Tooltip-Test käme erst, wenn die Messung einen Grund dafür liefert — dann mit eigener Festlegung.

## 5. Was das kostet, offen benannt

Diese Änderung berührt `worker-ai`. Damit:

- **Die Prüfsumme des Blocks ändert sich.** `f847c124…` ist danach nicht mehr der Wert; die Liste in
  `docs/korrektur-d1-w1-vorabfestlegung.md` §1 braucht einen Nachtrag.
- **Ein Engine-Vergleich in Actions wird nötig** (`ladeEngine` lädt diesen Block), nach eigenem Go. Er ist hier
  **kein Formalismus**: Bei `evalStreuung` 1 muss er „gleich" zeigen, und das ist die Prüfung der Bitgleichheit aus
  §4. Zeigt er einen Unterschied, ist die Änderung falsch gebaut.

**Dass ich diesen Preis hier zahle und bei der Engine-Warnung nicht**, ist kein Widerspruch, sondern der Unterschied
zwischen den beiden Fällen. Die Warnung (`docs/passregel-wege-nachtrag-vorabfestlegung.md` §1.5) wäre eine
Versicherung gegen einen Fall gewesen, von dem festgelegt ist, dass er nicht eintritt, und hätte ein `throw` in den
heißen Pfad gelegt. Hier geht es um das **Standardverhalten** an der Stelle, die das Projekt selbst als Engpass
vermutet, und die Änderung kann bei Standardwert nichts tun. Der Nutzen ist ungleich größer, das Risiko kleiner.

## 6. Die Messung

**Vorbild ist `docs/skalierung.md` §2 und §3**, derselbe Aufbau und dieselbe Statistik.

**Arme:** A ist immer `evalStreuung=1` (heute). Zwei Vergleiche:

| Vergleich | A | B | Frage |
|---|---|---|---|
| **S1** | `evalStreuung=1` | `evalStreuung=0` | Kostet das Rauschen Stärke, und wie viel? |
| **S2** | `evalStreuung=1` | `evalStreuung=0.5` | Ist der Effekt abgestuft oder ein Sprung? |

**Umfang:** je Vergleich **4 Seeds × 90 Partien = 360**, wie in `skalierung.md`. Standardbedingungen aus
`CLAUDE.md`: `mctsFixedSims` 120, Aufgabe aus, Komi 7,5, ohne Vorgabe. S1 läuft zuerst, S2 danach.

**In Actions, nicht im Container.** Das ist ein Messlauf; er braucht ein eigenes, ausdrückliches Go.

**Primärer Endpunkt je Vergleich:** Siegrate von B, zweiseitig gegen 50 %, α = 0,05, mit exaktem Test und
Clopper-Pearson-Intervall; dazu die Elo-Differenz `400 · log10(p / (1 − p))` mit 95-%-Intervall aus dem Intervall
der Siegrate.

**Lesart, vorab festgelegt:**

| Ergebnis von S1 | Folge |
|---|---|
| B (ohne Rauschen) gewinnt, p < 0,05 | Die Zugstreuung kostet Stärke. Die Zahl benennt den Preis; ob er sich lohnt, entscheidet Hazeberry. Ein Standardwechsel bräuchte eine eigene Festlegung. |
| A (mit Rauschen) gewinnt, p < 0,05 | Das Rauschen **hilft** — es ist dann nicht nur Vielfalt, sondern Erkundung. Das wäre das überraschendste Ergebnis und würde die Engpass-Vermutung aus `skalierung.md` eher stützen als entkräften. |
| p ≥ 0,05 | Kein nachweisbarer Unterschied in diesem Umfang. Die Vielfalt ist in diesem Rahmen gratis; das Clopper-Pearson-Intervall sagt, wie groß ein Effekt noch sein könnte, ohne aufzufallen. |

S2 wird nur gelesen, wenn S1 einen Unterschied zeigt; sonst als beschreibend berichtet, ohne Anspruch.

**Sekundär, ohne statistischen Anspruch — und das ist die Kostenseite:** Wie viele **verschiedene** Partien je Arm?
Gemessen als Zahl unterschiedlicher `final_board_hash` über die 360 Partien, mit `auswertung/hashliste.js` aus den
Rohdaten. Verliert B deutlich an Vielfalt, ist das der Preis, den das Rauschen erkauft, und er gehört neben die
Siegrate. Dazu Anomalien je Arm, Partielänge, Aufgaben je Arm.

**Gültigkeitsregel.** Zwei Zustände. **Ungültig**, mit „kein Urteil" und Grund, wenn:

1. Der Engine-Vergleich bei `evalStreuung` 1 **nicht** „gleich" zeigt (dann ist die Bitgleichheit aus §4 verletzt).
2. Die beiden Arme unterscheiden sich in irgendeinem `PARAMS`-Wert außer `evalStreuung`.
3. Ein Lauf erreicht die festgelegte Partienzahl nicht.
4. `PARAMS_DEFAULT` ist außer dem neuen Eintrag verändert.
5. Die Anomaliezahl eines Arms liegt über 2 % der Partien.

## 7. Grenzen und Risiken

- **Das Vorzeichen ist offen** (§1). Ein Ergebnis „Rauschen hilft" ist möglich und würde die Frage umdrehen.
- **Die 11 % aus §1 sind ein Seed.** Sie stammen aus 56 Stellungen bei einem Suchseed; die Rangfolge der Kandidaten
  hängt selbst am Rauschen. Die Zahl begründet, dass die Frage sich lohnt, sie ist kein Ergebnis.
- **Selbstspiel A gegen B** sagt nichts über die absolute Stärke gegen GNU Go oder Fuego. Ein externer Gegenlauf
  wäre ein eigener Schritt.
- **Vielfalt ist nicht nur Spielgefühl.** Weniger Streuung kann auch die Messungen dieses Projekts beeinflussen, die
  auf Partienvielfalt beruhen. Deshalb steht die Zahl der verschiedenen Partien in §6 als eigener Endpunkt.
- **`quickEval` bleibt**, also auch das Rauschen der Ausspielungen. Ein Teil der Streuung bleibt damit immer
  erhalten, auch bei `evalStreuung` 0 — die Partien werden nicht deterministisch.
- **Kein Standardwechsel in diesem Schritt.** Der Default bleibt 1,00, unabhängig vom Ergebnis.

## 8. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung als eigener PR: der Parameter, die vier Einfügungen, ein Test auf Bitgleichheit bei 1,00, Nachtrag der
   neuen `worker-ai`-Prüfsumme in `docs/korrektur-d1-w1-vorabfestlegung.md` §1, `tests/README.md`.
3. **Engine-Vergleich in Actions**, nach eigenem Go. Bei `evalStreuung` 1 muss er „gleich" zeigen.
4. **Messlauf S1 in Actions, nach eigenem Go.** Danach S2.
5. Auswertung als Nachtrag hier, Rohdaten unter `docs/daten/eval-streuung/`, Urteil nach §6.

## 9. Nachtrag: Umsetzung (23.11.2026)

Schritt 2 des Ablaufs ist erledigt. Was tatsächlich im Code steht:

**Der Parameter** sitzt in `PARAMS` unter der neuen Überschrift `/* Bewertung, alle Phasen */` direkt hinter den
Phasen-Grenzen (Z. 792–797), nicht in einem der Phasenblöcke — er gilt für alle vier Experten. Default `1.00`.

**Die vier Einfügungen** stehen genau an den in §2 genannten Stellen. Ihre Zeilennummern sind durch den neuen
Parameterblock um sechs gewachsen:

| Experte | Zeile vorher (§2) | Zeile jetzt | Term |
|---|---|---|---|
| `evalOpening` | 3137 | 3143 | `return s + Math.random() * 3 * PARAMS.evalStreuung;` |
| `evalMidgame` | 3255 | 3261 | `return s + Math.random() * 4 * PARAMS.evalStreuung;` |
| `evalEndgame` | 3689 | 3695 | `return s + Math.random() * 0.5 * PARAMS.evalStreuung;` |
| `evalTsumego` | 3902 | 3908 | `return s * safetyMul + Math.random() * 3 * PARAMS.evalStreuung;` |

Dieselbe Verschiebung gilt für die in §3 genannten Stellen, die **nicht** angefasst wurden: `quickEval` steht jetzt
auf Z. 4073, der Gleichstandsbruch der Selbstschlag-Züge auf Z. 3670 und 3824. Geprüft ist das nicht nur gelesen,
sondern getestet (siehe unten): beide streuen auch bei `evalStreuung` 0 weiter.

**Prüfsumme.** `worker-ai` lautet jetzt
`3523535bb70bc29e2fbb07081b2b1535a6aa4da56881ed9259c312f288bf7cb9` (vorher
`f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9`). `shared-go-logic` und `policy-net` sind
byteidentisch geblieben. Nachgetragen in `docs/korrektur-d1-w1-vorabfestlegung.md` §1.

**Der Test** ist `tests/eval-streuung.js` (82 Prüfungen). Er belegt die Konstruktion aus §4 stärker als „Bitgleichheit
bei 1,00": für jeden der vier Experten gilt bei festgehaltenem `Math.random() = r` bitgenau

    Wert(1)   === Wert(0) + r·k        und        Wert(0,5) === Wert(0) + r·k·0,5

mit k = 3 / 4 / 0,5 / 3. Das prüft zugleich **welcher** Faktor an **welchem** Experten hängt — ein Vertauschen der
vier Stellen wäre aufgefallen. Zwei der drei r-Werte sind absichtlich unrund (0,1 · 3 = 0,30000000000000004,
⅓ · 4), damit die Gleichung nicht an glatten Zahlen vorbeigeht. Dazu:

- Bei 0 hängt der Wert nicht mehr von `Math.random` ab (fünf verschiedene r, bitgleich) — das Rauschen ist weg,
  nicht klein. Auch über `evaluateMove` in allen drei reinen Phasen.
- Der Zuschnitt aus §3 ist nicht versehentlich gewachsen: `quickEval` und der Selbstschlag-Bruch streuen bei 0 weiter.
- `evalStreuung` steht in `PARAMS_DEFAULT` — sonst ließe das Dashboard ihn nicht zurücksetzen.

**Zwei Ergänzungen am Rahmen**, beide nach der Regel in `CLAUDE.md`: `tests/rahmen.js` reicht jetzt `evalOpening`,
`evalMidgame`, `evalEndgame` und `PARAMS_DEFAULT` heraus. Ohne die drei Experten hätte der Test nur über
`evaluateMove` messen können, also durch die Phasenmischung hindurch; die Zuordnung von k zu Experte wäre damit
nicht prüfbar gewesen.

**Nicht im Bestand von T-PR1.** Die Bestandsprüfung der Engine-Aufrufer
(`docs/passregel-wege-nachtrag-vorabfestlegung.md` §1.5) überspringt `tests/` und bleibt bei 22 Dateien. Das ist
kein Versehen des Tests: sie zählt Mess- und Auswertungswerkzeuge, die die Engine fahren, nicht Testdateien, die
`PARAMS` absichtlich verstellen und in der CI laufen.

**Was damit noch nicht belegt ist.** Der Test prüft Arithmetik an vier Stellen, nicht, dass eine ganze Partie mit
`evalStreuung` 1 Zug für Zug wie vorher läuft. Das ist Schritt 3, der Engine-Vergleich in Actions. Zeigt er einen
Unterschied, ist die Änderung falsch gebaut, und die Messläufe entfallen.

## 10. Nachtrag: Präzisierung von §6 VOR dem Messlauf (23.11.2026)

§6 hat zwei Dinge offen gelassen (Seeds, Zug-Limit) und eines nur scheinbar widersprüchlich gesetzt. Dieser
Nachtrag füllt die Lücken und wendet §6 an; er ändert keine Vorgabe, die §6 getroffen hat. Er steht hier, **bevor**
eine einzige Partie gespielt ist — der Merge dieses Nachtrags liegt in der Geschichte vor den Rohdaten, und das ist der Grund,
warum es ein eigener Schritt ist und keine Fußnote in der Auswertung.

### 10.1 Die Seeds (§6 nannte keine)

§6 verlangt „4 Seeds × 90 Partien", ohne die Seeds zu nennen; `skalierung.md` §2 nennt seine (20261018–21).
Nachgeholt:

| Vergleich | Seeds |
|---|---|
| **S1** (`evalStreuung` 1 gegen 0) | 20261123, 20261124, 20261125, 20261126 |
| **S2** (1 gegen 0,5) | 20261127, 20261128, 20261129, 20261130 |

Die Seeds stehen hier, weil die Wahl nach den Daten keine Wahl mehr wäre.

### 10.2 Zug-Limit 600 (§6 nannte keins)

Mit Aufgabe aus laufen Partien länger, und das Default-Limit 400 von `ab-harness.js` würde die Partielänge deckeln —
also ausgerechnet den Nebenendpunkt verfälschen, der sie messen soll. Der Vorgängerlauf mit `resignEnabled=0` nahm
600 (`ab-harness.js` Z. 271). Dabei bleibt es: `--maxmoves 600`.

### 10.3 Aufgabe aus; „Aufgaben je Arm" wird dadurch leer (§6 widersprach sich scheinbar)

§6 verlangt im Bedingungssatz „Aufgabe aus" und nennt wenige Zeilen später „Aufgaben je Arm" als Nebenendpunkt.
Das sieht wie ein Widerspruch aus, ist aber eine Rangfrage: Die Bedingung steht fest, der Endpunkt ist ihr
nachgeordnet. Also `resignEnabled=0` in beiden Armen — und „Aufgaben je Arm" wird im Bericht **nicht gestrichen,
sondern als 0 / 0 ausgewiesen**, mit dem Hinweis, dass die Bedingung ihn leer macht. Gestrichen würde eine
vorab festgelegte Zahl verschwinden; so bleibt sichtbar, dass sie gefordert war und warum sie nichts sagt.

Dass die Bedingung und nicht der Endpunkt gewinnt, hat einen sachlichen Grund und nicht nur einen formalen: Das
Aufgabekriterium liest selbst die verrauschte Bewertung (`index.html` Z. 5297 prüft `Q` gegen die Schwelle). Mit
`resignEnabled=1` erreichte der Rauschterm das Ergebnis über **zwei** Wege — die Zugwahl und den Zeitpunkt der
Aufgabe — und die Siegrate könnte sich allein dadurch verschieben, dass ein Arm früher aufgibt. Genau diese
Vermischung soll die Messung vermeiden. `skalierung.md`, das Vorbild aus §6, hatte die Aufgabe an und konnte sie
deshalb ausweisen; dort war das Rauschen in beiden Armen gleich, hier ist es der Gegenstand.

**Hazeberry kann das umdrehen.** Wer „Aufgaben je Arm" als echte Zahl haben will, braucht `resignEnabled=1` und
nimmt den Störkanal in Kauf; das wäre ein eigener Lauf mit eigener Festlegung, nicht dieser.

### 10.4 Woher Komi und Schiedsrichter kommen

§6 beruft sich auf die Standardbedingungen aus `CLAUDE.md`. Die beschreiben Läufe **gegen GNU Go oder Fuego**
(„GNU Go Stufe 1 als Schiedsrichter (Fläche)"). Dieser Lauf ist Selbstspiel über `ab-harness.js`; dort rechnet das
Werkzeug selbst in Fläche ab, mit Komi 7,5 als Default (`ab-harness.js` Z. 49 und 760), und die Engine ist
komi-blind — Komi ändert nur die Abrechnung, nie einen Zug. Die Bedingungen sind damit erfüllt, aber durch
Übertragung, nicht wörtlich. Ohne Vorgabe spielt der Harness ohnehin.

### 10.5 Die Befehle

Je Vergleich vier Teilläufe über `ab-harness.yml` (ein Seed je Dispatch), Standardmodus (`paired = 0`):

```
--games 90  --seed <Seed>  --maxmoves 600  --paired 0
--A mctsFixedSims=120,resignEnabled=0,evalStreuung=1
--B mctsFixedSims=120,resignEnabled=0,evalStreuung=0        (S1; S2: evalStreuung=0.5)
```

Die Arme unterscheiden sich in genau einem `PARAMS`-Wert — Gültigkeitsregel Nr. 2 aus §6 ist damit konstruktiv
erfüllt und wird am Bericht nachgeprüft.

### 10.6 Vorprüfung im Container, damit der Lauf in Actions nicht ins Leere geht

`ab-harness.js` setzt die `--A`/`--B`-Schlüssel mit
`Object.assign(PARAMS, PARAMS_DEFAULT, …, cfg)` (Z. 1104) — **ungeprüft**. Ein Tippfehler im Schlüsselnamen würde
stillschweigend gesetzt und nie gelesen; der Lauf sähe aus wie eine Messung und wäre keine. Deshalb vorher drei
kurze Läufe im Container (4 Partien, `mctsFixedSims=30`, Zug-Limit 60, Seed 99), verglichen über die
Endbrett-Hashes aus `--roh`:

| Lauf | B-Arm | Endbrett-Hashes |
|---|---|---|
| X1 | `evalStreuung=1` | `cf033b7d…`, `e1485423…`, `bf1c7277…`, `d74a6577…` |
| X2 | `evalStreuung=1` | byteidentisch zu X1 |
| Y | `evalStreuung=0` | `00f5de0f…`, `1fb36fe6…`, `c9e02e6c…`, `1fb36fe6…` — alle vier anders als X |

X1 gegen X2 belegt die Reproduzierbarkeit des Standardmodus mit `mctsFixedSims`, die der Workflow-Kopf behauptet.
X gegen Y belegt, dass `evalStreuung` über `--B` bis in die Engine durchkommt.

Ohne statistischen Anspruch, aber notiert: in Y tragen Partie 2 und 4 denselben Endbrett-Hash. Bei Zug-Limit 60 ist
„Endbrett" nur die Stellung nach 60 Zügen, und vier Partien sind eine Anekdote. Die Richtung ist die, die §6 als
Kostenseite erwartet; entschieden wird sie von den 360 Partien, nicht hiervon.

### 10.7 Laufzeit und Zug-Limit, nachgemessen

Gültigkeitsregel Nr. 3 aus §6 macht einen Lauf ungültig, der seine Partienzahl nicht erreicht, und
`ab-harness.yml` bricht nach 300 Minuten ab. Ob 90 Partien mit Zug-Limit 600 hineinpassen, war geschätzt. Vier
Partien unter den echten Bedingungen (`mctsFixedSims=120`, `resignEnabled=0`, Zug-Limit 600, Seed 4242) im
Container:

| Partie | Züge | Zeit |
|---:|---:|---:|
| 1 | 370 | 0,6 min |
| 2 | 384 | 0,7 min |
| 3 | 389 | 0,7 min |
| 4 | 391 | 0,7 min |

**Laufzeit:** 90 Partien × 0,7 min ≈ 63 Minuten im Container. Ein Hosted Runner ist langsamer, die Reserve bis 300
Minuten ist aber groß. Das Limit ist damit geprüft und nicht angenommen.

**Zug-Limit:** Die vier Partien liegen bei 370 bis 391 Zügen, also direkt an der 400er-Grenze. Mit dem Default 400
wären Partien abgeschnitten worden — §10.2 stützte sich auf den Vorgängerlauf, jetzt steht eine eigene Zahl
dahinter. Bei 600 ist das Limit in keiner der vier Partien gebunden; die Längenmessung ist also unverzerrt.

**Nebenbefund zur Reproduzierbarkeit.** Der Harness schreibt in seinen Kopf „Budget: 250 ms/Zug (fest)", auch wenn
`mctsFixedSims` gesetzt ist. Die Zeile ist kosmetisch: liefe die Suche wirklich nach Zeit, wären zwei Läufe mit
gleichem Seed nicht byteidentisch — in §10.6 sind sie es. `mctsFixedSims` greift also, und die Kopfzeile ist nur
irreführend.
