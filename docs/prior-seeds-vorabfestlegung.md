# Prior-Messung, zweiter Versuch: dieselben 13 Stellungen, zwanzig Seeds

**Stand: 23.11.2026. Status: Entwurf, nicht gemessen.** Vorschlag von Hazeberry, nach dem Ergebnis des ersten
Versuchs (`docs/prior-reproduktion-vorabfestlegung.md` §8). Dieses Doc enthält Vorgaben; Hazeberry liest es vor dem
Merge.

## 1. Was der erste Versuch offen gelassen hat

Der erste Versuch ergab **„Nur Rangwechsel", gültig**: in 112 Fällen kein einziger Zugwechsel, ein Rangwechsel der
Spitze. Als wichtigste offene Flanke nannte §8.4 dort **den einen Seed** — die Rangfolge der Kandidaten hängt am
Rauschterm der Bewertung (bis zu etwa 4 Punkte je Kandidat, `index.html` Z. 2476 u. a.), und ein anderer Seed gibt
andere Paare. Die zweite Flanke war, dass in nur **13 von 56** Stellungen der gewählte Zug überhaupt der
Spitzenkandidat war; nur dort kann eine Umsortierung der Spitze den Zug erreichen.

Dieser Versuch greift genau diese beiden Punkte, und **nur** sie.

## 2. Hazeberrys Aufbau, unverändert übernommen

Alle 13 Stellungen mit denselben 20 vorab festgelegten Seeds prüfen. Für jedes Paar aus Stellung und Seed den
ursprünglichen und den späteren Netzstand vergleichen. Simulationszahl und `netBlend` bleiben gleich. Pro Stellung
ausweisen, bei wie vielen der 20 Seeds der **Spitzenkandidat** wechselt und bei wie vielen der **gespielte Zug**. Bei
einem Zugwechsel mit den ursprünglichen Priors gegenprüfen.

**Zuerst nur die Seeds variieren, die vorhandenen Trainingsstände beibehalten.** Mehr Training ist der zweite
Versuch. Der Endpunkt „Spitzenkandidat wechselt" ist dabei schärfer als der des ersten Versuchs („Rangfolge der
ersten zwei"): Er fragt genau nach dem Kopf der Liste, und nur der kann den Zug erreichen.

## 3. Drei Punkte, die ich vorher prüfen musste

### 3.1 Der Seed hatte drei Rollen — er wird geteilt

Im Werkzeug des ersten Versuchs steuert **ein** Seed dreierlei: die Startgewichte des Netzes (Z. 53, vor `ladeKI`),
das Training (Z. 93) und die Suche (Z. 110 und 171). Hätte ich ihn einfach variiert, wären **W₀ und W₁
mitvariiert** — der Lauf hätte dann gemessen, ob ein anderes Netz *und* anderes Rauschen den Zug ändern, nicht, ob
anderes Rauschen ändert, **ob das Netz durchschlägt**. Das ist nicht die Frage.

**Festlegung:** Zwei getrennte Seeds.

| Seed | Rolle | Wert |
|---|---|---|
| `netzseed` | Startgewichte und Training — bestimmt W₀ und W₁ | **fest 7**, für alle 20 Läufe derselbe |
| `suchseed` | allein die Suche (Rauschterm, MCTS) | **1 bis 20** |

Damit sind W₀ und W₁ in allen 20 Läufen **dieselben Gewichte**, und variiert wird nur das, was variieren soll. Die
Gültigkeitsregel prüft das nach (§6 Nr. 5).

### 3.2 Die 13 sind mit Seed 7 ausgewählt

Die Menge der 13 entstand im ersten Versuch **bei Seed 7** — der Teil der Stichprobe, in dem der gewählte Zug der
Spitzenkandidat war. Seed 7 ist einer der 20. Die Auswahl ist also auf einem der Seeds getroffen, die hier variiert
werden. Zwei Dinge dazu, beide nachgeprüft:

- **Die Menge ist bei beiden Blendwerten identisch** (0,1 und 0,3 ergeben dieselben 13 Stellungen). Die Eigenschaft
  hängt also nicht am Blend.
- Ob sie an **anderen** Seeds hält, ist unbekannt. Deshalb hält die Messung je Paar mit fest, **ob der gewählte Zug
  dort der Spitzenkandidat war**, und weist das getrennt aus. Nur die Paare, in denen er es ist, tragen die Aussage
  „eine Umsortierung der Spitze könnte den Zug erreichen". Die übrigen sind nicht wertlos, sie zählen aber in eine
  eigene Spalte.

### 3.3 Die Gegenprobe ist wieder eine Prüfung der Apparatur

„Bei einem Zugwechsel mit den ursprünglichen Priors gegenprüfen" ist, für den **Zug**, konstruktionsgleich mit dem
W₀-Arm: Das Netz erreicht die Zugwahl nur über den Prior-Vektor (`worker-ai` Z. 4598 bis 4616), und W₀ erzeugt genau
diese Priors. Sie kann also nicht unabhängig scheitern — dasselbe Argument wie in
`docs/passregel-wege-nachtrag-vorabfestlegung.md` §2.

Sie bleibt trotzdem drin, aus zwei Gründen: Sie prüft, dass die Einspeisung stimmt (§6 Nr. 4), und sie beantwortet
die Frage, **ob ein Fehlerbericht mit `netPriors` die Nachstellung retten würde** — das ist nicht „wirken die
Priors", sondern „genügt es, sie aufzuschreiben". Sie läuft nur bei einem Zugwechsel, wie Hazeberry es vorgibt.

## 4. Die 13 Stellungen, und ein Muster darin

| Datei | Züge |
|---|---|
| `hand-117.sgf` | 60, 70 |
| `hand-364.sgf` | 60, 70 |
| `hand-392.sgf` | 60, 70, **140** |
| `hand-427.sgf` | 60, 70 |
| `hand-455.sgf` | 60, 70 |
| `hand-478.sgf` | 60, 70 |

**Elf der dreizehn liegen bei Zug 60 oder 70**, nur `hand-392` @140 ist spät. Die Auswahl ist damit faktisch
**frühes Mittelspiel** — dünnes Brett, wenige Kandidaten, der Spitzenkandidat dominiert. Das geht über Hazeberrys
eigenen Vorbehalt hinaus und gehört in §7: Die 13 sind nicht nur „empfindliche Fälle", sondern überwiegend **frühe**
Stellungen.

## 5. Aufbau

Je Stellung und Seed zwei Arme, bei identischem `suchseed`, identischer Simulationszahl und identischem
`blendWeight`:

| Arm | Netz | Rolle |
|---|---|---|
| **A** | W₀ (`gamesPlayed` 2, 12 Beispiele) | der „ursprüngliche" Zug |
| **B** | W₁ (`gamesPlayed` 8, 48 Beispiele) | der Befund |
| **C** | Worker-Stummel mit den in A aufgezeichneten Priors | **nur bei einem Zugwechsel** (§3.3) |

Feste Parameter: `mctsFixedSims` **120**, `netMaxBlend` **0,3**, `netWarmup` 2, `mctsTreeReuse` **0**,
`adaptiveBudgetEnabled` 0, `resignEnabled` 0, `netzseed` **7**.

**Ein Blendwert, nicht zwei.** Der erste Versuch zeigte den einzigen Rangwechsel bei 0,3; 0,1 ergab keinen. Mehr als
ein Blendwert wäre eine zweite Frage im selben Lauf, und Hazeberrys Vorgabe ist, dass `netBlend` gleich bleibt.

W₀ und W₁ sind **dieselben Trainingsstände wie im ersten Versuch** — erzeugt mit `netzseed` 7 aus 2 bzw. 8
`trainGame`-Aufrufen. Nicht neu trainiert, nicht mehr trainiert.

## 6. Endpunkt, Umfang, Urteil, Gültigkeit

**Endpunkt**, je Paar aus Stellung und Seed:

1. **Spitzenkandidat wechselt** — unterscheidet sich Kandidat 1 zwischen A und B?
2. **Zug wechselt** — unterscheidet sich der von `getAIMove` zurückgegebene Zug?
3. **Zug war Spitzenkandidat** — war der Zug in A der Kopf der Liste? (§3.2)
4. Bei 2: **stellt Arm C den Zug aus A her?**

**Ausgewiesen wird je Stellung**: wie viele der 20 Seeds unter 1, wie viele unter 2, wie viele unter 3, und bei 2 das
Ergebnis von 4. Dazu die Summen über alle 13.

**Umfang:** 13 × 20 × 2 Arme × 2 Wiederholungen = **1 040 Aufrufe** mit 120 Simulationen, plus Arm C je Zugwechsel
(zweimal). Geschätzt rund 30 Minuten, im Container, auf Hazeberrys Go für kostengünstige Läufe. Sprengt es das
Budget, geht es nach Actions.

**Keine statistischen Schwellen.** Auszählung deterministischer Einzelfälle; bei festem Seed ist jeder Aufruf
reproduzierbar. Berichtet werden Anzahlen mit Nenner (von 20, von 260). Kein McNemar, kein Clopper-Pearson — die
Standardbedingungen aus `CLAUDE.md` gelten für Spielstärkemessungen, und das ist keine.

**Urteil:**

- **„Nachstellung bricht"** — mindestens ein Paar mit Zugwechsel, und Arm C bringt dort den Zug aus A zurück.
  Ausgewiesen mit Anzahl und den betroffenen Stellungen.
- **„Nur Spitzenwechsel"** — Spitzenkandidat wechselt in mindestens einem Paar, der Zug nirgends.
- **„Kein Unterschied"** — weder Spitze noch Zug. Gültiges Ergebnis **für diese 13 Stellungen und diese 20 Seeds**.

**Gültigkeitsregel.** Zwei Zustände. **Ungültig**, mit „kein Urteil" und Grund, wenn:

1. `blendWeight` ist in einem Arm 0 oder weicht zwischen den Armen ab.
2. Ein Arm meldet eine Divergenz oder ein krankes Netz.
3. Die Priors in Arm C sind nicht **gleich** den in A aufgezeichneten.
4. Zwei Wiederholungen desselben Arms liefern verschiedene Züge.
5. **Neu, aus §3.1:** W₀ oder W₁ sind nicht über alle 20 Läufe **byteidentisch**. Das ist die Prüfung, dass die
   Teilung der Seeds wirklich greift — ohne sie wäre der Lauf eine andere Messung.
6. W₀ und W₁ sind untereinander byteidentisch (dann wäre nichts trainiert).

Zusätzlich wird die **prozessübergreifende** Wiederholbarkeit geprüft: Der ganze Lauf wird zweimal gefahren und die
Berichte auf Byteidentität verglichen. Diese Prüfung fehlte in der Regel des ersten Versuchs und hat dort einen
Fehler durchgelassen (`docs/prior-reproduktion-vorabfestlegung.md` §8.1 Nr. 3).

## 7. Was diese Messung nicht sagt

- **Keine Häufigkeit für gewöhnliche Spielzüge.** Hazeberrys eigener Vorbehalt, und er ist der wichtigste: Die 13
  sind **ausgewählt**, weil dort der Zug am Spitzenkandidaten hängt. Aus ihrer Trefferquote folgt nichts über eine
  beliebige Stellung.
- **Überwiegend frühes Mittelspiel** (§4): elf von dreizehn bei Zug 60 oder 70. Auch innerhalb der Auswahl ist die
  Verteilung schief.
- **Ein Blendwert, ein Netzpaar.** W₀ und W₁ liegen sechs `trainGame`-Aufrufe auseinander; die Prior-Verschiebung
  lag im ersten Versuch bei maximal 1,4·10⁻⁴. Mehr Training ist der zweite Versuch, wie Hazeberry sagt.
- **Gilt nur bei `netMaxBlend` > 0**, was nicht der ausgelieferte Standard ist.
- **Kein Spielstärkeergebnis.** Ein anderer Zug ist kein schlechterer Zug.
- **Node im Container**, eine Umgebung, keine Browserprüfung.

## 8. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Werkzeug erweitern (`--netzseed`/`--suchseed`, Seedliste, Auszählung je Stellung), Messung, Rohdaten unter
   `docs/daten/prior-seeds/`, Nachtrag hier mit dem Urteil nach §6.
3. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.
