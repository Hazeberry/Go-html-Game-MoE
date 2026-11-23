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
