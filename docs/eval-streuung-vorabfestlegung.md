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

### 10.8 Drei Größen hat §6 „je Arm" verlangt, die der Aufbau nicht je Arm hergibt

Beim Bauen der Auswertung, noch vor den Daten, fiel ein schwererer Fehler in §6 auf als die beiden in §10.1
und §10.2. §6 verlangt drei Größen „je Arm". Zwei davon kann dieser Aufbau nicht liefern, und das liegt nicht am
Werkzeug, sondern an der Versuchsanordnung.

**Verschiedene Partien.** §6 nennt als Kostenseite „Wie viele **verschiedene** Partien je Arm? Gemessen als Zahl
unterschiedlicher `final_board_hash` über die 360 Partien". Im Selbstspiel A gegen B spielen aber **beide Arme jede
Partie** — einer Schwarz, einer Weiß; der Rohdump führt das in `armSchwarz` und `armWeiss` mit. Eine Partie gehört
keinem Arm. „Je Arm" ist hier nicht definiert, und keine Rechnung auf diesen Daten macht es definiert.

Ausgewiesen wird deshalb die Zahl verschiedener Endstellungen **über den ganzen Lauf**, dazu getrennt nach
Farbzuordnung. Das ist weniger, als §6 wollte: sinkt die Zahl, ist die Vielfalt des Gemischs gesunken, und man kann
sie nicht B zuschreiben. Wer die Vielfalt **je Arm** will, braucht zwei getrennte Läufe, A gegen A und B gegen B.
Das ist ein eigener, billiger Folgeversuch — aber nicht dieser.

**Anomalien.** Gültigkeitsregel Nr. 5 spricht von „der Anomaliezahl eines Arms". `ab-harness.js` zählt Anomalien
jedoch nur global (`agg.anomalies`, Z. 1518) und schreibt eine Warnzeile nach stdout (Z. 1744); je Partie stehen sie
weder in `--json` noch in `--roh`. Die Regel wird daher auf **Laufebene** geprüft: höchstens 2 % von 360, also
höchstens 7 Anomalien. Fehlt das Konsolenlog eines Teillaufs, ist die Regel ungeprüft, und das Ergebnis lautet nach
der Zwei-Zustände-Regel **KEIN URTEIL** — nicht „wahrscheinlich in Ordnung". Dass keine Warnzeile im Log steht,
heißt null; nur eine fehlende Logdatei heißt unbekannt.

**Aufgaben.** Mit `resignEnabled=0` sind sie 0, wie §10.3 festhält. Die Zahl wird ausgewiesen, nicht gestrichen.

**Was daran mein Fehler ist.** Ich habe in §6 „je Arm" geschrieben, ohne zu prüfen, ob das Messgerät je Arm
berichtet. Bei zwei von drei Größen tut es das nicht, und bei der Vielfalt kann es das in diesem Aufbau prinzipiell
nicht. Das entwertet den primären Endpunkt nicht — die Siegrate von B ist je Partie wohldefiniert, weil jede Partie
genau einen Sieger hat. Es verkleinert die Kostenseite, und die war in §1 das zweite Argument für die ganze
Messung. Das steht hier, bevor eine Zahl vorliegt, und nicht in der Auswertung, wo es wie eine Ausrede klänge.

### 10.9 Auflösung der Messung, die §6 nicht genannt hat

§6 legt α und Umfang fest, sagt aber nicht, was damit überhaupt nachweisbar ist. Nachgerechnet mit dem exakten
Test: bei 360 Partien wird 200 : 160 mit p = 0,0397 signifikant, 199 : 161 nicht mehr. Die Messung erkennt also
Effekte ab einer Siegrate von rund **55,6 %**, das sind etwa **39 Elo**.

Das gehört in die Lesart eines Nullergebnisses: „kein nachweisbarer Unterschied" heißt dann nicht „kein
Unterschied", sondern „kleiner als rund 39 Elo, mit dem Clopper-Pearson-Intervall als genauer Auskunft". §6 sagt
das im Grundsatz („das Clopper-Pearson-Intervall sagt, wie groß ein Effekt noch sein könnte"); hier steht die Zahl.

### 10.10 Werkzeug und Test

Die Auswertung läuft über `auswertung/eval-streuung-bericht.js`. Es rechnet nichts, solange die Gültigkeitsregel
nicht hält, und endet dann mit Status 1, damit ein Lauf in Actions rot wird. Clopper-Pearson und der exakte Test
sind nicht neu geschrieben, sondern aus `auswertung/kandidaten-orakel/haupt-bericht.js` und
`auswertung/messung-zusatz.js` übernommen; `clopperPearson(2, 20)` ergibt `[0,0123; 0,3170]`, den Lehrbuchwert.

`tests/eval-streuung-bericht.js` führt jede der fünf Regeln einzeln an der Prüfung vorbei und verlangt, dass sie
anschlägt — ein Auswertungsskript ohne Test ist die Stelle, an der ein stiller Fehler zur falschen Zahl im Dokument
wird. Geprüft werden außerdem die Statistik an von Hand nachrechenbaren Werten, die Lesart in allen drei
Richtungen und dass der Bericht bei KEIN URTEIL jeden Grund nennt und keine Zahl ausgibt.

## 11. Nachtrag: Ergebnis von S1 (24.11.2026)

**Urteil nach der Lesart in §6: GÜLTIG, kein nachweisbarer Unterschied.**

Vier Teilläufe von `ab-harness.yml` auf `main` `c756763`, gestartet am 23.11.2026 um 23:30 UTC, je 90 Partien,
zusammen 360. Rohwerte je Teillauf: `docs/daten/eval-streuung/s1-teilergebnisse.md`.

| | |
|---|---|
| Siegrate von B (`evalStreuung` 0) | **179 von 360 = 49,72 %** |
| Exakter zweiseitiger Binomialtest gegen 50 % | **p = 0,9580** (α = 0,05) |
| Clopper-Pearson 95 % | **[44,4 %; 55,0 %]** |
| Elo-Differenz | **−1,9** [−38,8; +34,9] |

### 11.1 Was das heißt, und was nicht

§6 hat diesen Fall vorab beschrieben: „p ≥ 0,05 → Kein nachweisbarer Unterschied in diesem Umfang. Die Vielfalt ist
in diesem Rahmen gratis; das Clopper-Pearson-Intervall sagt, wie groß ein Effekt noch sein könnte, ohne
aufzufallen." Genau das gilt.

Das Intervall ist die eigentliche Auskunft: Der Effekt liegt zwischen **−39 und +35 Elo**. Das deckt sich mit der in
§10.9 vorab gerechneten Auflösung von rund 39 Elo — wie es muss, denn beides ist dieselbe Rechnung von zwei Seiten.
**Ein Rauschterm, der 100 Elo kostete, wäre hier aufgefallen. Einer, der 20 Elo kostet, nicht.** Wer „wirkungslos"
daraus liest, liest mehr, als dasteht.

Die Richtung ist nicht einmal eindeutig: −1,9 Elo heißt, der Arm **mit** Rauschen lag um zwei Partien vorn, was bei
360 Partien nichts ist. Die in §7 offen gelassene Frage nach dem Vorzeichen bleibt offen.

### 11.2 Streuung zwischen den Seeds, geprüft statt behauptet

Die vier Teile gaben B 47, 46, 40 und 46 Siege. Der dritte fällt auf: dort gewann A mit 50 : 40. Das verleitet dazu,
nach einer Ursache zu suchen — also nachgerechnet, wie wahrscheinlich eine solche Spanne bei echter Gleichheit ist:
Eine Spanne von 7 oder mehr Siegen über vier Teilläufe zu je 90 Partien tritt in **76,7 %** der Fälle auf
(200 000 Simulationen bei p = 0,5). Die Streuung ist also vollkommen gewöhnlich, und der dritte Teillauf ist kein
Signal. Der Einzeltest dort gibt p = 0,34.

### 11.3 Die Gültigkeitsregel, Punkt für Punkt

| Regel | Prüfung | Ergebnis |
|---|---|---|
| 1 Engine-Vergleich „gleich" | Lauf 45286526826: GLEICH, 26 Läufe, 1328 KI-Abfragen | erfüllt |
| 2 Arme nur in `evalStreuung` verschieden | `PARAMS_A`/`PARAMS_B` aus den `env`-Blöcken aller vier Logs | erfüllt |
| 3 Partienzahl erreicht | je „Partie 90/90", Summe 360; Seeds 20261123–26, jeder genau einmal (Artefaktnamen und `env`) | erfüllt |
| 4 `PARAMS_DEFAULT` unverändert | Blockprüfsummen von `index.html` gegen `docs/korrektur-d1-w1-vorabfestlegung.md` §1 | erfüllt |
| 5 Anomalien ≤ 2 % | in keinem Log die Zeile `⚠ … illegale KI-Züge`; 0 von 360, erlaubt 7 | erfüllt |

Dazu die Parität, auf die der Workflow selbst hinweist: Sims/Zug liegen je Lauf innerhalb von zwei Simulationen
(A 111–113, B 111–112). Ein Unterschied in der Siegrate wäre also nicht der Rechenleistung zuzuschreiben gewesen.

### 11.4 Was S1 NICHT geliefert hat, und warum — vierte Lücke in §6

**Die Kostenseite fehlt vollständig.** §6 nennt als sekundären Endpunkt die Zahl verschiedener Endstellungen und
sagt dazu: „das ist die Kostenseite". Diese Zahl steht nur im Rohdump (`--roh`), und **`ab-harness.yml` hat gar
keine Eingabe dafür** — der Workflow schreibt ausschließlich `--json`. §10.5 habe ich die Befehlszeile aufgeschrieben,
ohne zu prüfen, ob der Workflow sie so annimmt. Also:

- **Verschiedene Endstellungen: nicht gemessen.** Nicht „null", nicht „unauffällig" — nicht gemessen.
- **Partielänge: nur als Stichprobe.** Sie steht je Partie im JSON, nicht im Aggregatblock; aus den gelesenen
  Logzeilen reicht sie von 315 bis 462 Zügen. Das Zug-Limit 600 war in keiner gesehenen Partie gebunden, die
  Begründung aus §10.7 trägt also.
- **Anomalien und Aufgaben: gemessen**, weil beide im Aggregatblock stehen.

Erschwerend kam hinzu, dass diese Session die Artefakte nicht herunterladen kann: die Blob-Adresse von Actions ist
nicht freigegeben (HTTP 403 vom Egress-Proxy, mit `[agent-proxy]`-Zeile). Die Zahlen oben stammen daher aus dem
Aggregatblock der Job-Logs — dieselbe Ausgabe derselben Partien, aber eine andere Quelle als das JSON. Auch das
hätte der Rohdump nicht gerettet; er wäre genauso unerreichbar gewesen. Der Fehler ist der fehlende
Workflow-Eingang, nicht die Netzregel.

**Das entwertet den primären Endpunkt nicht.** Die Siegrate steht im Aggregatblock, ist je Partie wohldefiniert und
durch fünf Gültigkeitsregeln gedeckt. Es entwertet die Aussage „die Vielfalt ist gratis": gratis heißt hier nur
„kostet keine nachweisbare Spielstärke", nicht „kostet keine Vielfalt". Was das Rauschen an Vielfalt **erkauft**,
ist nach wie vor unbekannt — und nach §10.8 braucht die ehrliche Antwort darauf ohnehin getrennte Läufe A gegen A
und B gegen B.

### 11.5 Vier Fehler in einer Festlegung

Zur Bilanz, weil sie zusammengehören. §6 war an vier Stellen nicht ausführbar: keine Seeds (§10.1), kein Zug-Limit
(§10.2), drei Größen „je Arm" verlangt, die der Aufbau nicht je Arm hergibt (§10.8), und eine Befehlszeile, die der
Workflow nicht annimmt (§11.4). Drei davon fielen beim Aufsetzen auf und wurden vor den Daten geschlossen; die
vierte erst, als die Daten da waren und der Endpunkt fehlte.

Der Grund ist in allen vier Fällen derselbe: Ich habe aufgeschrieben, **was** gemessen werden soll, ohne zu prüfen,
**ob das Messgerät das kann**. Für den primären Endpunkt ging es gut — der war von Anfang an wohldefiniert und
instrumentiert. Die Kostenseite ist daran gescheitert.

## 12. Der fehlende Workflow-Eingang, geschlossen (24.11.2026)

§11.4 hält fest, dass `ab-harness.yml` keine Eingabe für `--roh` hatte und die Kostenseite deshalb unmessbar war.
Das ist jetzt behoben: eine Eingabe `roh` (Default `0`, also unverändertes Verhalten für jeden bisherigen Aufruf).
Bei `roh=1` ruft der Workflow `--roh ergebnisse/roh-<LABEL>.jsonl` auf und legt die Datei ins Artefakt.

**Geprüft, nicht angenommen, dass `--roh` das Spiel nicht verändert.** Zwei Läufe im Container mit gleichem Seed,
gleicher Konfiguration und festen Simulationen, einer mit und einer ohne `--roh`: Partiezeilen und Aggregatblock
sind identisch. Das war die Voraussetzung dafür, den Schalter überhaupt zwischen S1 und S2 einzuführen — sonst
wären die beiden Vergleiche nicht mehr vergleichbar. Der Grund dahinter: `schreibeRoh` **liest** den
Zufallszustand (`zufallHaupt.zustand()`), es verbraucht ihn nicht.

Die Eingabe wird abgewiesen, wenn sie nicht `0` oder `1` ist, und ebenso bei `roh=1` zusammen mit `paired>0` —
`ab-harness.js` schreibt den Rohdump nur im Standardmodus und bräche sonst mitten im Lauf ab. Lieber vor dem Start
mit klarer Meldung scheitern.

**Was das für S2 heißt.** S2 (`evalStreuung` 1 gegen 0,5, Seeds 20261127–30) läuft mit `roh=1` und liefert damit
die Zahl verschiedener Endstellungen, die S1 nicht liefern konnte — allerdings weiter nur auf Laufebene, nicht je
Arm (§10.8). Nach §6 wird S2 **beschreibend** berichtet, ohne Anspruch, weil S1 keinen Unterschied gezeigt hat.
Daran ändert der Rohdump nichts; er füllt nur eine Lücke, die sonst auch in S2 geblieben wäre.

**Was weiterhin offen bleibt.** Die Vielfalt **je Arm** braucht getrennte Läufe A gegen A und B gegen B (§10.8).
Das ist eine eigene Messung mit eigener Festlegung und keine Fortsetzung dieser Kette. Sie ist billig — zwei Läufe
zu je rund 43 Minuten — und beantwortet die Frage, die §1 als zweites Argument für die ganze Messung genannt hat.
Vorschlag, keine Beschlusslage: Hazeberry entscheidet, ob sie kommt.

## 13. Nachtrag: Ergebnis von S2 und Abschluss der Kette (24.11.2026)

**S2 trägt nach §6 keinen Anspruch**, weil S1 keinen Unterschied gezeigt hat: „S2 wird nur gelesen, wenn S1 einen
Unterschied zeigt; sonst als beschreibend berichtet, ohne Anspruch." Die Zahlen stehen hier beschreibend.

Vier Teilläufe auf `main` `e8bb351`, gestartet am 24.11.2026 um 00:57 UTC, mit `roh=1`, je 90 Partien.
Rohwerte: `docs/daten/eval-streuung/s2-teilergebnisse.md`.

| | |
|---|---|
| Siegrate von B (`evalStreuung` 0,5) | **184 von 360 = 51,11 %** |
| Exakter zweiseitiger Binomialtest | p = 0,7122 |
| Clopper-Pearson 95 % | [45,8 %; 56,4 %] |
| Elo-Differenz | **+7,7** [−29,1; +44,6] |

### 13.1 Das Dosisbild über beide Vergleiche

| Rauschen | Siegrate gegen den Vollarm | Elo | Intervall |
|---|---:|---:|---|
| voll (Arm A, Bezug) | 50,00 % | 0 | — |
| halbiert (S2) | 51,11 % | +7,7 | [−29,1; +44,6] |
| aus (S1) | 49,72 % | −1,9 | [−38,8; +34,9] |

**Kein Trend, keine Stufe.** §6 fragte, ob der Effekt „abgestuft oder ein Sprung" ist. Die Antwort lautet: beide
Dosen liegen von 50 % nicht unterscheidbar weit weg, also ist nichts da, was abgestuft oder sprunghaft sein könnte.
Ergänzend und in §6 nicht vorab festgelegt, daher ohne Anspruch: S2 und S1 unterscheiden sich um 1,4 Prozentpunkte
(z = 0,37, p = 0,71).

### 13.2 Eine Gegenprobe, die zwei Nullergebnisse erlauben

Zwei unabhängige Nullvergleiche sind mehr als einer, weil sich an ihnen prüfen lässt, ob die Nebenzahlen
reproduzieren. Sie tun es nicht, und das ist die nützliche Beobachtung:

| Nebenzahl | S1 (1 gegen 0) | S2 (1 gegen 0,5) |
|---|---|---|
| Randanteil der Endstellung | A höher in 3 von 4 Teilen | **B** höher in 4 von 4 Teilen |
| Gruppenverluste ab 5 Steinen | B niedriger in 3 von 4 | **B** höher in 4 von 4 |

Beide Zahlen zeigen in den beiden Vergleichen in **entgegengesetzte** Richtungen. Hätte ich nur S2 gesehen, wäre
„weniger Rauschen verliert mehr große Gruppen und klebt stärker am Rand" eine verführerische Geschichte gewesen —
mit 4 von 4 Teilen in derselben Richtung. S1 widerlegt sie. Das ist der Grund, warum solche Zahlen in §6 als
„sekundär, ohne statistischen Anspruch" stehen, und ein Beleg dafür, dass die Einschränkung nicht Zierde ist.

### 13.3 Gültigkeitsregel für S2

| Regel | Prüfung | Ergebnis |
|---|---|---|
| 1 Engine-Vergleich „gleich" | Lauf 45286526826 | erfüllt |
| 2 Arme nur in `evalStreuung` verschieden | `PARAMS_A`/`PARAMS_B` aus allen vier `env`-Blöcken | erfüllt |
| 3 Partienzahl, Seeds | je 90, Summe 360; Seeds 20261127–30 je einmal (Artefaktnamen und `env`) | erfüllt |
| 4 `PARAMS_DEFAULT` unverändert | Blockprüfsummen von `index.html` | erfüllt |
| 5 Anomalien ≤ 2 % | keine `⚠`-Zeile: 0 von 360 | erfüllt |

Sims/Zug: A 110–111, B 110–113 — Parität, wie der Workflow sie verlangt.

### 13.4 Die Kostenseite bleibt offen, jetzt aus einem anderen Grund

Mit `roh=1` **existieren** die Rohdumps: jedes Artefakt trägt vier Dateien statt drei und ist rund 470 KB statt
29 KB groß. Der Workflow-Eingang aus §12 funktioniert. Diese Session kann die Artefakte aber nicht herunterladen
(HTTP 403 vom Egress-Proxy auf die Blob-Adresse von Actions). Die Zahl verschiedener Endstellungen bleibt daher
**auch für S2 unberechnet** — nicht mehr, weil die Daten fehlen, sondern weil sie unerreichbar sind.

Das Problem hatte zwei Hälften, und ich habe nur eine geschlossen: den fehlenden Workflow-Eingang. Die andere ist
die Netzfreigabe dieser Session, und die ändere ich nicht. Zwei Wege führen weiter, beide ohne neuen Messlauf:

1. **Hazeberry lädt die Artefakte herunter** (bis 22.02.2027 verfügbar, IDs und Prüfsummen stehen in der
   Datendatei) und zählt mit `node auswertung/hashliste.js` die `final_board_hash` über die 360 Partien.
2. **Der Workflow rechnet die Zahl selbst** und schreibt sie in die Zusammenfassung, die über die API lesbar ist.
   Das wäre ein kleiner Schritt in `ab-harness.yml` — und die richtige Lehre aus §11.4: ein Endpunkt, der nur im
   Artefakt steht, ist für eine Auswertung über die API kein Endpunkt.

Nach §10.8 gilt die Zahl ohnehin nur für den ganzen Lauf, nicht je Arm. Die Vielfalt **je Arm** braucht getrennte
Läufe A gegen A und B gegen B: eigene Messung, eigene Festlegung, rund zwei mal 43 Minuten. Vorschlag, kein
Beschluss.

### 13.5 Stand der Kette aus §8

| Schritt | Stand |
|---|---|
| 1 Festlegung | gemergt (#370) |
| 2 Umsetzung | gemergt (#371), `worker-ai` neu `3523535b…` |
| 3 Engine-Vergleich | **GLEICH**, Lauf 45286526826 |
| 4 S1 | **kein nachweisbarer Unterschied**, −1,9 Elo [−38,8; +34,9] (#374) |
| 4 S2 | beschreibend, +7,7 Elo [−29,1; +44,6] |
| 5 Auswertung und Rohdaten | dieses Dokument, `docs/daten/eval-streuung/` |

**Was die Messung beantwortet hat.** Der Rauschterm der vier Bewertungsexperten kostet bei 120 Simulationen keine
nachweisbare Spielstärke. Die beiden Intervalle stehen getrennt, weil sie verschieden weit reichen: S1 lässt
−38,8 bis +34,9 Elo offen, S2 −29,1 bis +44,6. Die ±39 aus §10.9 sind die Auflösung des Tests bei einer Siegrate
von genau 50 %, keine Schranke für beide Dosen — S2 reicht mit +44,6 darüber hinaus. Der Default bleibt 1,00, wie
§7 es vorab festgelegt hat, unabhängig vom Ergebnis.

*(Berichtigt am 25.11.2026. Die erste Fassung schrieb „die Schranke liegt bei rund ±39 Elo, und das gilt für beide
geprüften Dosen" und verwechselte damit die vorab gerechnete Auflösung mit den beobachteten Intervallen.)*

**Was sie nicht beantwortet hat.** Was die Zugstreuung an Vielfalt erkauft. Das war in §1 das zweite Argument für
die Messung und ist nach vier Teilläufen in jedem Vergleich weiter unbekannt.

## 14. Nachtrag: Die Kostenseite, gemessen (24.11.2026)

§13.4 hielt fest, dass die Zahl verschiedener Endstellungen unberechenbar bleibt, weil die Rohdumps nur im
Artefakt liegen und eine Auswertung über die GitHub-API nicht an Artefakte herankommt. Das ist behoben, und zwar
ohne neuen Messlauf: `.github/workflows/eval-streuung-bericht.yml` lädt die vorhandenen Artefakte **dort**, wo sie
erreichbar sind, lässt `auswertung/eval-streuung-bericht.js` darauf laufen und schreibt das Ergebnis in die
Zusammenfassung und ins Log, die beide über die API lesbar sind.

Erster Lauf: [45396629430](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45396629430), 29 Sekunden,
auf den vier S2-Artefakten.

### 14.1 Die Zahl

**Verschiedene Endstellungen in S2: 360 von 360 Partien (100,0 %).** Kein einziger Wiederholer, und auch getrennt
nach Farbzuordnung 180 von 180 je Seite.

Das ist die Kostenseite, die §6 verlangt hat — für den Vergleich 1 gegen 0,5. Eine Vielfaltseinbuße ist nicht
nur „nicht nachweisbar", sondern in diesen Daten **nicht vorhanden**: bei vollem Verlust an Streuung müsste man
Wiederholungen sehen, und es gibt keine.

### 14.2 Was die Zahl NICHT abdeckt, und das ist die wichtigere Hälfte

Gemessen ist die Dosis, die **am wenigsten** am Rauschen ändert. Für S1 — `evalStreuung` ganz **aus** — gibt es
die Zahl weiter nicht, weil jene vier Teilläufe vor der Workflow-Änderung liefen und keinen Rohdump schrieben
(§12 kam danach). Der interessante Fall bleibt also offen:

| Vergleich | Siegrate | Verschiedene Endstellungen |
|---|---|---|
| S2 (1 gegen 0,5) | 51,11 %, kein Unterschied | **360 / 360 = 100 %** |
| S1 (1 gegen 0) | 49,72 %, kein Unterschied | **nicht gemessen** |

Ein Nachlauf von S1 mit `roh=1` würde das schließen — allerdings erneut nur als **Laufzahl über das Gemisch**,
nicht je Arm (§10.8). Wer die Vielfalt je Arm will, braucht nach wie vor getrennte Läufe A gegen A und B gegen B,
und dort ist `evalStreuung` 0 der Arm, auf den es ankommt. Das bleibt der Vorschlag, nicht die Beschlusslage.

### 14.3 Drei Korrekturen an eigenen Aussagen

**Meine Anekdote aus §10.6 zeigte in die falsche Richtung.** Dort hatte ich notiert, dass in einem Vorprüflauf mit
`evalStreuung` 0 zwei von vier Partien denselben Endbrett-Hash trugen, und dazu geschrieben, die Richtung sei die,
die §6 als Kostenseite erwarte. Mit Zug-Limit 60 war „Endbrett" nur die Stellung nach 60 Zügen — das war die
Ursache, nicht die verringerte Streuung. In 360 vollständigen Partien gibt es keinen einzigen Wiederholer. Die
Einschränkung stand damals dabei; die Richtungsangabe hätte ich mir trotzdem sparen sollen.

**Das Zug-Limit 400 hätte wirklich abgeschnitten, und jetzt steht die ganze Stichprobe dahinter.** §10.7 stützte
sich auf vier Partien von 370 bis 391 Zügen und schloss, 400 wäre knapp. Über 360 Partien: Mittel 374,8, Median
374, **Spanne 291 bis 446**. Die längste Partie liegt 46 Züge über dem alten Default — die Entscheidung für 600
war richtig, und zwar nicht nur knapp.

**Die Zahlen aus §13 sind unabhängig nachgerechnet.** Der Bericht in Actions kommt auf 184 : 176, p = 0,7122,
Clopper-Pearson [45,8 %; 56,4 %], Elo 7,7 [−29,1; 44,6] — identisch zu dem, was ich in §13 aus den Aggregatzeilen
der Logs von Hand gerechnet hatte. Zwei Wege, dieselben Zahlen; die Handrechnung war kein Flüchtigkeitsfehler.

### 14.4 Warum der Workflow und nicht eine Netzfreigabe

Der Download in diese Session scheitert am Egress-Proxy (`*.blob.core.windows.net`, CONNECT-Tunnel 403). Geprüft
wurde, ob eine gezielte Freigabe trägt: Der Blob-Host ist **pro Artefakt fest** — dasselbe Artefakt liefert
zweimal denselben Host, nur mit neuer Signatur —, aber über Artefakte hinweg verschieden; die vier S2-Artefakte
liegen auf `sa16`, `sa5`, `sa30` und `sa32`. Eine Freigabe einzelner Hostnamen hätte also genau für diese vier
Dateien gegolten und wäre beim nächsten Lauf wertlos. Der Umweg über `api.github.com` hilft nicht, weil der
Endpunkt auf dieselben Blob-Hosts umleitet.

Der Workflow trägt dauerhaft und ist die Lehre aus §11.4 in brauchbarer Form: **Ein Endpunkt, der nur im Artefakt
steht, ist für eine Auswertung über die API kein Endpunkt.** Künftige Messungen brauchen die Zahl nicht mehr aus
einem Download, sondern bekommen sie in die Zusammenfassung geschrieben.
