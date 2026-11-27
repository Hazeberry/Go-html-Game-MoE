<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Skalierung auf dem heutigen Default: Vorabfestlegung

**Stand: 27.11.2026. Status: Stufe G gültig (§16): S = 2618,5, N = 2600, K3 = 2600 → 5200. Stufe 1 gültig (§17):
K1 +28,3 Elo, K2 +30,6 Elo, ein Unterschied ist nicht nachgewiesen. Stufe 2 gültig (§18): K3 −21,5 Elo [−41,3; −1,8],
„Die doppelte Suche verliert nachweisbar.“ Deutung offen, Aufbauprüfung nach §5.3 ausstehend.** Dieses Doc enthält
Vorgaben für Werkzeug und Läufe.
Hazeberry liest es vor dem Merge. Jede der drei Stufen braucht ein eigenes Go; der Merge dieses Docs ist keins.

Festlegungen von Hazeberry am 25.11.2026: **1230 Partien je Vergleich, Aufgabe aus, Gerätemessung zuerst** — vor
der Verdopplung am Arbeitspunkt des Zielgeräts. **Zielgerät ist das Galaxy A17**, Hazeberrys aktuelles Telefon.
Das Galaxy A20s (2019) ist ein altes Referenzgerät und wird nicht berücksichtigt.

## 1. Anlass

Am 03.10.2026 brachte eine Verdopplung der Suche im Selbstspiel ([`skalierung.md`](skalierung.md) §5, Commit
`94b59d0`, je 360 Partien):

| Vergleich | Siegrate der doppelten Suche | Elo je Verdopplung (95 %) |
|---|---:|---|
| K1 240 gegen 120 | 60,6 % (218/360) | +75 [38; 112] |
| K2 480 gegen 240 | 57,8 % (208/360) | +55 [19; 92] |

Zwei Dinge folgen daraus **nicht**:

- **Kein Knick.** Für die Frage nach dem Abflachen zählt die Differenz der beiden Gewinne, nicht die zwei
  Punktschätzungen. Sie beträgt 20 Elo, 95 % rund [−32; +72] (Delta-Methode); der exakte Fisher-Test auf die beiden
  Siegzahlen ergibt p = 0,495. +75 und +55 ergeben für sich keinen belastbaren Knick.
- **Kein Wert für heute.** `94b59d0` hatte weder die Muster (Default seit 11.10.) noch das Endspiel-Netz (seit
  20.10.). Die Zahlen beschreiben eine andere Engine.

`DOKU.md` führt deshalb unter „Was tatsächlich offen bleibt“: wie stark zusätzliche Simulationen den heutigen
Default im relevanten Browser-Bereich verbessern.

## 2. Fragen, und was nicht beantwortet wird

- **F1:** Was bringt eine Verdopplung dem heutigen Default bei 120 → 240 und bei 240 → 480? Je Vergleich Elo mit
  Unsicherheitsintervall.
- **F2:** Flacht der Gewinn von K1 zu K2 ab? Maßgeblich ist die Differenz der beiden Gewinne.
- **F3:** Bei welcher Simulationszahl arbeiten die Zielgeräte, und was kostet dort eine Verdopplung an Zeit?
- **F4:** Was bringt eine Verdopplung am Arbeitspunkt des A17, also von N ≈ S auf 2N (§7.1)?

**Nicht beantwortet:** ob das Spiel geändert wird. Mehr Simulationen pro Zug und dieselbe Zahl Simulationen in
kürzerer Zeit sind für Spieler **zwei verschiedene Verbesserungen**. Diese Messung bewertet die erste (Elo je
Verdopplung) und misst, was sie auf dem Gerät an Zeit kostet. Die zweite — kürzere Wartezeit bei gleicher Stärke —
ist eine Frage der Bedienung und wird hier nicht bewertet. Eine Änderung an Zeitbudget oder Geschwindigkeit braucht
eine eigene Vorabfestlegung (§8).

## 3. Vergleichbarkeit mit dem 03.10.

| Bedingung | 03.10. | jetzt | Folge |
|---|---|---|---|
| Werkzeug | `ab-harness.js`, Selbstspiel, Standardmodus | gleich | vergleichbar |
| Stufen | 120 / 240 / 480 über `mctsFixedSims` je Arm | gleich | vergleichbar |
| Endpunkt | Siegrate von B, Elo mit Intervall aus Clopper-Pearson | gleich, dazu der Test auf F2 | vergleichbar |
| Engine | ohne Muster, ohne Endspiel-Netz | heutiger Default, festgelegt in §6 | **nicht vergleichbar — genau das wird gemessen** |
| Aufgabe | an (damaliger Default; der schwächere Arm gab 169- bzw. 151-mal auf) | **aus** (`resignEnabled=0`, heutiger Standard) | **Abweichung, offen benannt** |
| Zuglimit | 400 (Werkzeug-Default) | 600 | folgt aus „Aufgabe aus“: ohne Aufgabe laufen Partien im Mittel rund 375 Züge ([Vielfalt, Blockwerte](daten/eval-streuung-vielfalt/blockwerte.md)) |
| Umfang | 360 je Vergleich | 1230 je Vergleich | erst damit ist F2 beurteilbar (§5.2) |
| Seeds | 20261018–25 | neu (§5.1) | bei anderer Engine ohnehin nicht wiederverwendbar |

Der Vergleich mit den Zahlen vom 03.10. ist deshalb **beschreibend**, kein Test.

## 4. Stufe G: Gerätemessung

### 4.1 Durchführung (Hazeberry)

- **Gerät:** Galaxy A17 mit Chrome, V8-Optimierer an ([`zeitbudget.md`](zeitbudget.md)). Eine Partie.
- Vor der Partie die Seite neu laden, nicht aus dem Cache, damit der aktuelle Stand von `main` läuft.
- Stufe **Schwer**, Standardparameter (keine gespeicherten Abweichungen im Dashboard), Komi 7,5; die Wertung ist für
  die Zeiten gleichgültig.
- Die Partie zu Ende spielen, dann den Fehlerbericht (🐞) exportieren. Dazu als Notiz: Browser und Stand des
  V8-Schalters.

### 4.2 Gültigkeit

Zwei Zustände. **Ungültig**, mit „kein Urteil“ und Grund, wenn:

1. `meta.kiStufe` nicht `hard` ist.
2. `reproduktion.params` von `PARAMS_DEFAULT` des Commits aus §6 abweicht, in einem Schlüssel oder einem Wert.
3. Eine Pages-Bereitstellung („pages build and deployment“) zwischen dem Merge des Werkzeug-PR (§9) und
   `meta.erstellt` einen Commit trägt, dessen Engine-Blöcke nicht den Prüfsummen aus §6 entsprechen.
4. `meta.workerNeustarts` größer als 0 oder `meta.workerDead` wahr ist. Dann rechnete zeitweise der Hauptthread,
   und die Zeiten wären andere.
5. Weniger als 120 KI-Steinzüge mit Simulationszahl und `zeiten.sucheMs` vorliegen oder weniger als 40 davon nach
   Zug 80.

Eine ungültige Partie bleibt im Archiv. Eine neue Partie ist erlaubt und wird als Wiederholung
berichtet.

### 4.3 Auswertung

Über alle KI-Steinzüge, und getrennt bis und ab Zug 80 (Grenze wie in `zeit-zerlegung.js`):

- **Simulationen je Zug:** Median, 10. und 90. Perzentil.
- **Zeiten:** Median der Zugdauer (`dauerMs`), der Suchzeit (`zeiten.sucheMs`, von der Engine direkt gemessen) und
  des Rests außerhalb der Suche (`dauerMs` − `zeiten.sucheMs`), darin das Endspiel-Netz (`zeiten.netzMs`). Die
  Suchzeit wird **nicht** aus Simulationen × `msProSim` zurückgerechnet: `msProSim` steht im Bericht auf zwei
  Nachkommastellen gerundet, die Rückrechnung brächte vermeidbare Rundungsabweichungen.
- **Arbeitspunkt S:** Median der Simulationen über alle KI-Steinzüge.
- **Zeitkosten einer Verdopplung**, gerechnet aus der gemessenen Suchzeit: Bei gleicher Zeit je Simulation
  verdoppelt sich die Suchzeit, ein Zug dauert also um den Median von `zeiten.sucheMs` länger. Umgekehrt bräuchte „doppelt so viele Simulationen
  in derselben Zeit“ eine doppelt so schnelle Suche.

## 5. Stufe 1: Wiederholung bei 120, 240 und 480

### 5.1 Aufbau

| Vergleich | A | B | Seeds |
|---|---|---|---|
| **K1** | `mctsFixedSims=120,resignEnabled=0` | `mctsFixedSims=240,resignEnabled=0` | 11250001 bis 11250015 |
| **K2** | `mctsFixedSims=240,resignEnabled=0` | `mctsFixedSims=480,resignEnabled=0` | 11250016 bis 11250030 |

Je Vergleich 15 Teilläufe über `ab-harness.yml` mit je 82 Partien, zusammen **1230**: `games` 82, `maxmoves` 600,
`paired` 0, `roh` 1, Komi 7,5 (Default). Im Standardmodus spielt A in geraden Partien Schwarz, in ungeraden Weiß;
82 Partien sind also 41 je Farbe. **B ist immer der Arm mit doppelter Suche.**

Alle Teilläufe laufen auf dem Branch `claude/skalierung-stand`, der auf den Commit aus §6 zeigt und nicht bewegt
wird. So läuft jeder Teillauf auf genau diesem Commit, auch wenn `main` sich weiterbewegt.

**Laufzeit:** Ein Teillauf des Vielfaltslaufs (30 Partien bei 120 gegen 120, Aufgabe aus, Zuglimit 600, Lauf
45528336526) brauchte 13 min 43 s, also 27,4 s je Partie. Selbst bei voll proportionaler Rechenzeit sind das rund
41 s (K1) und 82 s (K2) je Partie, also höchstens rund 112 Minuten je Teillauf. Die Zeitgrenze des Workflows liegt bei
300 Minuten.

### 5.2 Endpunkte

**Primär, je Vergleich (F1):** Siegrate von B, exakter zweiseitiger Binomialtest gegen 50 %, α = 0,05;
Clopper-Pearson 95 %; Elo = 400 · log10(p / (1 − p)) mit Intervall aus den Grenzen der Siegrate.

**Primär für F2:** Differenz D = Elo(K1) − Elo(K2). Getestet mit dem exakten zweiseitigen Fisher-Test auf die
Vierfeldertafel aus Siegen und Niederlagen von B in K1 und in K2, α = 0,05. Elo ist streng monoton in der
Siegrate; „gleicher Gewinn je Verdopplung“ heißt also genau „gleiche Siegrate von B in beiden Vergleichen“, und der
Test prüft diese Hypothese exakt. D wird mit einem genäherten 95-%-Intervall (Delta-Methode) berichtet; das
Intervall beschreibt, das Urteil kommt aus dem Test.

**Bemessung:** Bei einer Siegrate um 59 % erkennt der Umfang eine Abflachung von **40 Elo mit rund 80 %**
(zweiseitig, α = 0,05). Die Halbbreite des Intervalls von D liegt dann bei rund ±28 Elo; mit den 360 Partien vom
03.10. waren es ±52.

### 5.3 Urteilssätze, vorab

**F1, je Vergleich von N auf 2N:**

- p < 0,05 und Siegrate über 50 %: „Eine Verdopplung von N auf 2N Simulationen bringt dem heutigen Default
  nachweisbar Stärke: E Elo [u; o].“
- p ≥ 0,05: „Ein Gewinn durch die Verdopplung von N auf 2N ist nicht nachgewiesen. Das Intervall [u; o] sagt, wie
  groß er sein könnte.“
- p < 0,05 und Siegrate unter 50 %: „Die doppelte Suche verliert nachweisbar.“ Das ist zuerst ein Verdacht auf
  einen Aufbaufehler; vor jeder Deutung werden Armzuordnung und Parameter geprüft.

**F2:**

- p < 0,05 und D > 0: „Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar kleiner als bei 120 → 240:
  D Elo [u; o].“
- p < 0,05 und D < 0: „Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar größer als bei 120 → 240:
  D Elo [u; o].“
- p ≥ 0,05: „Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (D Elo [u; o]). Die Messung war so
  bemessen, dass sie eine Abflachung von 40 Elo mit rund 80 % erkannt hätte.“ Das ist kein Nachweis gleicher Gewinne.

Der Vergleich mit dem 03.10. wird beschreibend berichtet, mit den Unterschieden aus §3.

### 5.4 Nebenmaße, beschreibend

Siegrate von B je Farbe; Partielänge; Anteil der Partien am Zuglimit (liegt er über 5 %, wird das Ergebnis
zusätzlich ohne diese Partien berichtet, beschreibend); Anomalien je Arm; Laufzeit je Partie in K1 und K2 (Grundlage
der Kostenschätzung für Stufe 2, §7.3).

### 5.5 Gültigkeit

Zwei Zustände. **Ungültig**, mit „kein Urteil“ und Grund, und der Bericht wird rot, wenn:

1. Ein Teillauf fehlt, doppelt vorkommt oder einen Seed außerhalb der Liste trägt. Die Zuordnung zu K1 und K2 liest
   das Werkzeug aus `konfig.A` und `konfig.B`, nicht aus der Reihenfolge.
2. Ein Teillauf nicht genau 82 Partien hat, 41 je Farbe.
3. Die Arme sich in einem anderen `PARAMS`-Wert als `mctsFixedSims` unterscheiden, `resignEnabled` nicht in beiden
   Armen 0 ist, oder Zuglimit, Komi oder Modus von §5.1 abweichen.
4. Ein Teillauf nicht auf dem Commit aus §6 lief (`headSha`), oder dessen Engine-Blöcke nicht den Prüfsummen aus §6
   entsprechen.
5. Die Anomaliezahl eines Arms über 2 % seiner Partien liegt (wie
   [`eval-streuung-vorabfestlegung.md`](eval-streuung-vorabfestlegung.md) §6 Nr. 5).

**Die Siegrate ist kein Gültigkeitsgrund**, auch keine auffällige je Teillauf: Bei 30 Teilläufen und α = 0,05 sind
auffällige Teilläufe auch bei richtigem Aufbau zu erwarten
([`eval-streuung-vielfalt-vorabfestlegung.md`](eval-streuung-vielfalt-vorabfestlegung.md) §11.1).

## 6. Festgelegter Stand

**Commit:** der Merge-Commit des Werkzeug-PR (§9), festgehalten im ersten Nachtrag. Seine drei Engine-Blöcke müssen
diese Prüfsummen tragen (SHA-256 des Blockinhalts wie in den Korrektur-Docs, am Stand `591e70e` nachgerechnet):

| Block | SHA-256 |
|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` |
| `worker-ai` | `3523535bb70bc29e2fbb07081b2b1535a6aa4da56881ed9259c312f288bf7cb9` |
| `policy-net` | `14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190` |

`PARAMS` und `PARAMS_DEFAULT` stehen im Block `worker-ai` und sind damit mit festgelegt. Weicht ein Block ab,
gilt dieses Doc nicht für diesen Stand; dann braucht es eine neue Festlegung, keine stillschweigende Anpassung.

## 7. Stufe 2: Verdopplung am Arbeitspunkt

### 7.1 Regel für Stufe 2

Gefragt ist die Verdopplung **ab** dem Arbeitspunkt, also von S auf 2S. Aus dem gültig gemessenen S der formalen
Partie (§14.1):

**N = S, auf volle Hundert gerundet (x50 aufwärts); K3 = N gegen 2N.**

K3 läuft mit A = N und B = 2N, sonst wie Stufe 1 (Aufgabe aus, Zuglimit 600, `roh` 1, B mit doppelter Suche). Ist
N kleiner als 100 (S unter 50), gibt es keine sinnvolle Messung, und Stufe 2 entfällt.

Die Regel ist feiner gestuft als das frühere Raster, mathematisch bleibt sie diskret: Bei S = 2749 ergibt sie
2700 → 5400, bei S = 2750 ergibt sie 2800 → 5600. Was entfällt, ist die Verdopplung des ganzen Vergleichs an einer
einzigen Schwelle. Die frühere Rasterregel und der Anlass der Änderung stehen in §15.

Erwartung, ausdrücklich **keine** Festlegung: Laut `zeitbudget.md` rechnete das A17 2662 Simulationen bei Zug 2,
die Referenzpartie (§14) ergab S = 2726. K3 läge damit bei 2700 → 5400. Maßgeblich ist allein die formale Partie;
die Zahl je Zug ändert sich über die Partie.

### 7.2 Umfang und Seeds

1230 Partien je Vergleich, wie in Stufe 1. Partien je Teillauf: der größte gerade Teiler von 1230 (2, 6, 10, 30,
82, 246, 410), bei dem die geschätzte Laufzeit eines Teillaufs 200 Minuten nicht übersteigt. So bleiben die Farben
je Teillauf ausgeglichen, und die Zeitgrenze von 300 Minuten wird mit Abstand eingehalten. Seeds: 11260001 + j − 1
für Teillauf j. Auch Stufe 2 läuft auf `claude/skalierung-stand`.

### 7.3 Kosten und Go

Die Laufzeit je Partie wird aus Stufe 1 geschätzt: K1 und K2 liefern zwei Punkte für „Laufzeit = a + b · mittlere
Simulationen je Zug“, daraus folgt die Schätzung für K3. Der Bericht von Stufe 1 rechnet sie für eine feste Reihe
N = 1000 bis 4000 in Schritten von 500 und, mit dem N aus Stufe G, zusätzlich für dieses. Mit dieser Schätzung
(Zahl der Teilläufe, Rechenstunden, Wanduhrzeit bei 20 gleichzeitigen Jobs) wird das Go für Stufe 2 erfragt.
**Ist sie zu teuer, wird Stufe 2 nicht verkleinert, sondern neu festgelegt.**

Grobe Orientierung heute, ausdrücklich eine Schätzung und nur ein Beispiel: Bei voll proportionaler Rechenzeit
kostet 2700 gegen 5400 rund 15 Minuten je Partie, also rund 316 Rechenstunden für 1230 Partien und etwa 18 Stunden
Wanduhrzeit.

### 7.4 Endpunkt, Urteil, Gültigkeit

**Primär:** wie §5.2 für F1, also Siegrate von B, Binomialtest, Clopper-Pearson und Elo mit Intervall. Das ergibt
den Gewinn einer Verdopplung am Arbeitspunkt. Die Urteilssätze sind die aus §5.3 für F1.

**Beschreibend:** die Differenz zum Gewinn von K2 mit genähertem Intervall, **ohne Test**. K3 schließt nur bei
N = 480 unmittelbar an K2 (240 → 480) an; liegt N darüber, bleibt der Abstand dazwischen ungemessen, und der Bericht
nennt ihn in Verdopplungen. Ein Test auf Abflachung ist für Stufe 2 nicht vorab festgelegt und wird nachträglich
nicht hinzugefügt.

**Gültigkeit:** wie §5.5, mit der Partienzahl je Teillauf und den Seeds aus §7.2.

## 8. Was die Ergebnisse für das Spiel bedeuten, vorab und ohne Entscheidung

Für das A17 stehen am Ende zwei Zahlen nebeneinander:

- der **Gewinn einer Verdopplung an seinem Arbeitspunkt**, mit Intervall (aus K3), und
- die **Zeit, die eine Verdopplung auf diesem Gerät kostet** (§4.3).

Damit lässt sich beurteilen, was eine längere Bedenkzeit oder eine schnellere Suche an Stärke brächte. Was eine
längere Bedenkzeit die Spieler an Wartezeit kostet, und ob eine schnellere Suche in Stärke oder in kürzere
Wartezeit gehen soll, entscheidet Hazeberry. Folgt daraus eine Änderung am Spiel, braucht sie eine eigene
Vorabfestlegung.

## 9. Werkzeug, eigener PR nach dem Merge dieses Docs

- **`auswertung/skalierung-bericht.js`:** liest je Teillauf JSON, Rohdump und Log (nach dem Muster von
  `auswertung/eval-streuung-bericht.js`), ordnet nach `konfig`, prüft §5.5, rechnet §5.2 und §5.4 und schreibt den
  Bericht. Exit 1 bei „kein Urteil“. Binomialtest und Clopper-Pearson kommen aus den vorhandenen Funktionen
  (`auswertung/messung-zusatz.js`, `auswertung/kandidaten-orakel/haupt-bericht.js`), der Fisher-Test ist neu.
- **`auswertung/arbeitspunkt.js`:** liest Fehlerberichte, prüft §4.2 Nr. 1, 2, 4 und 5, rechnet §4.3 und wendet die
  Regel aus §7.1 an. Die Suchzeit liest es aus `zeiten.sucheMs`, nicht als Simulationen × `msProSim` wie
  `zeit-zerlegung.js`. §4.2 Nr. 3 prüft der Bericht anhand der Actions-Läufe „pages build and deployment“.
- **`.github/workflows/skalierung-bericht.yml`:** lädt die Artefakte in Actions herunter (aus einer Session sind
  sie nicht erreichbar, `eval-streuung-vorabfestlegung.md` §14), prüft die Engine-Blöcke am `headSha` der
  Teilläufe und ruft das Werkzeug auf.
- **Tests** für beide Werkzeuge, jede Gültigkeitsregel einzeln ausgelöst, dazu die Urteilssätze wörtlich; Einträge in
  `tests/run.js`, `tests/README.md` und `tests/dagger.js`.

## 10. Grenzen

- **Selbstspiel.** Gewinne gegen die eigene Engine fallen gegen fremde Gegner oft kleiner aus; hier nicht gemessen.
- **Feste Simulationszahl statt Wanduhr.** Im Spiel schwankt die Zahl je Zug; der Arbeitspunkt ist ein Median.
- **Ein Gerät, eine Partie.** Für andere Geräte gilt nur, was sich an ihrer Simulationszahl ablesen lässt; das
  A20s ist bewusst nicht berücksichtigt.
- **Unabhängige Partien** sind angenommen, wie am 03.10.; Paare mit gleicher Eröffnung gibt es im Standardmodus nicht.
- Die **Bemessung** (40 Elo, 80 %) setzt eine Siegrate um 59 % voraus.
- Das **Intervall für D ist genähert**; der Test ist exakt.
- Die **Zeitkosten einer Verdopplung** sind gerechnet (doppelte Suchzeit bei gleicher Zeit je Simulation), nicht
  gemessen; gemessen ist nur die Suchzeit selbst.

## 11. Ablauf

1. Dieses Doc als PR; Hazeberry liest; Merge.
2. Werkzeug-PR (§9), CI grün, Merge. Dessen Merge-Commit ist der Commit aus §6; darauf wird der Branch
   `claude/skalierung-stand` angelegt.
3. **Stufe G**, nach Go: Hazeberry spielt eine Partie auf dem A17; Auswertung; Nachtrag mit dem Arbeitspunkt.
4. **Stufe 1**, nach Go: 30 Teilläufe, Bericht über `skalierung-bericht.yml`, Nachtrag, Rohwerte unter
   `docs/daten/skalierung-heute/`. Stufe 1 hängt nicht von Stufe G ab.
5. **Stufe 2**, nach Go mit der Kostenschätzung aus §7.3 und den Stufen aus §7.1: Teilläufe, Bericht, Nachtrag.

## 12. Änderungen vor dem Merge

Drei Änderungen am Entwurf, bevor irgendeine Zahl vorlag:

1. **Nur das Galaxy A17** (Hazeberry): Das A20s (2019) ist ein altes Referenzgerät und wird nicht berücksichtigt.
2. **Regel §7.1, gemeldet:** Der erste Entwurf ordnete den Arbeitspunkt um eine Verdopplung versetzt zu. Bei k ≥ 3
   begann der Vergleich am Arbeitspunkt, bei k = 1 und 2 aber nahm er den Vergleich, der dort **endet**: K1 für
   S ≈ 240, K2 für S ≈ 480. Gefragt ist die Verdopplung ab S. Für das A17 hätte das bei S ≈ 480 den Gewinn von
   240 → 480 statt 480 → 960 berichtet. Jetzt gilt durchgehend „Vergleich ab 120 · 2^k“: k = 0 → K1, k = 1 → K2,
   k ≥ 2 → K3. Daraus folgen F4 in §2 und der Satz in §7.4, der eine Lücke zwischen K2 und K3 immer annahm.
3. **Suchzeit §4.3, gemeldet:** Die Suchzeit kommt direkt aus `zeiten.sucheMs`, nicht aus Simulationen ×
   `msProSim`, weil `msProSim` im Bericht gerundet ist. §4.2 Nr. 5 verlangt das Feld deshalb je gezähltem Zug.

## 13. Nachtrag: Umsetzung des Werkzeugs (25.11.2026)

Gebaut nach §9, vor jeder Zahl: `auswertung/skalierung-bericht.js` (Stufe 1 und 2), `auswertung/arbeitspunkt.js`
(Stufe G), `.github/workflows/skalierung-bericht.yml`, dazu `tests/skalierung-bericht.js` (16 Fälle) und
`tests/arbeitspunkt.js` (11 Fälle), jede Gültigkeitsregel einzeln ausgelöst, die Urteilssätze wörtlich. Die
Konstanten aus §5.1, §6 und §7.2 (Seeds, Stufen, Partienzahl, Zuglimit, Komi, Prüfsummen) stehen im Werkzeug fest
und werden nicht über die Befehlszeile übergeben.

### 13.1 Wo das Werkzeug den Wortlaut nur so weit prüft, wie der Harness es hergibt

1. **§5.5 Nr. 5, Anomalien „eines Arms“.** `ab-harness.js` zählt abgefangene illegale Züge nur je Teillauf und
   schreibt sie als Warnzeile ins Log, nicht je Arm (wie schon `eval-streuung-vorabfestlegung.md` §10.8). Geprüft
   wird deshalb **konservativ**: die Summe beider Arme höchstens 2 % der Partien des Vergleichs. Was das besteht,
   besteht die Regel je Arm sicher. Umgekehrt kann eine Summe über 2 % einen Lauf ungültig machen, in dem kein
   einzelner Arm über 2 % lag. Das nehme ich in Kauf: Bisher lagen alle Läufe bei 0, und die Alternative wäre eine
   Änderung am Harness vor der Messung.
   Dieser Fehler lag in meiner Festlegung, nicht im Werkzeug: Ich habe „je Arm“ geschrieben, ohne zu prüfen, ob der
   Harness das liefert — dieselbe Falle wie bei `evalStreuung`.
2. **§5.5 Nr. 3, Zuglimit.** Das Zuglimit steht nicht im JSON des Harness, nur in der Kopfzeile des Logs
   („max 600 Züge“). Das Werkzeug liest es dort; fehlt die Zeile, ist die Regel nicht erfüllt.
3. **§5.5 Nr. 4, Commit.** Der Harness schreibt `GITHUB_SHA` als `konfig.commit`. Bei einem Dispatch auf
   `claude/skalierung-stand` ist das genau der Commit aus §6. Der Workflow checkt diesen Commit aus und prüft dessen
   `index.html` gegen die Prüfsummen.

### 13.2 Was §4 offen ließ und jetzt festgelegt ist

- **Median und Perzentile (§4.3):** Median als Mittel der beiden mittleren Werte bei gerader Zahl, wie in
  `zeit-zerlegung.js`; Perzentile nach dem Rangverfahren (kleinster Wert, unter dem mindestens der Anteil q liegt).
- **§4.2 Nr. 3, Pages:** Die Liste der Bereitstellungen entsteht aus den Actions-Läufen „pages build and
  deployment“ (Commit und Zeit) und den Prüfsummen von `index.html` an diesen Commits. Das Fenster beginnt mit dem
  Merge dieses Werkzeug-PR. Mindestens eine Bereitstellung muss im Fenster liegen, alle darin müssen stimmen.
- **§4.2 Nr. 5:** Die Teilbedingung „40 nach Zug 80“ folgt in einer echten Partie aus „120 Steinzüge“, weil die KI
  bis Zug 80 höchstens 40 Steinzüge macht. Sie bleibt stehen; sie schadet nicht.
- **§4.2 Nr. 2:** `PARAMS_DEFAULT` hat am Stand `591e70e` 164 Schlüssel. Verglichen wird Schlüssel für Schlüssel,
  fehlende und zusätzliche Schlüssel eingeschlossen.

### 13.3 Commit und Branch

Der Commit aus §6 ist der Merge-Commit dieses Werkzeug-PR. Nach dem Merge wird darauf der Branch
`claude/skalierung-stand` angelegt und nicht mehr bewegt; die Prüfsummen der drei Engine-Blöcke werden dort noch
einmal nachgerechnet, bevor ein Go erfragt wird.

### 13.4 Was eine Partie und einen Zug zählbar macht (Hinweis Hazeberry, 25.11.2026)

**Anlass.** Der Bericht zählte `sieger === 'B'` und wertete alles andere als Niederlage von B. Ein fehlendes Siegerfeld
hätte den Elo-Wert verschoben, ohne den Lauf ungültig zu machen. Die Farbprüfung zählte nur `aIst === 'Schwarz'`; ein
unbekannter Wert ging dort als Weiß durch. Eine Gegenprobe am vorigen Stand des Werkzeugs bestätigt beides: Mit einem
fehlenden Sieger oder einem `aIst` „X“ statt „Weiß“ blieb der Lauf gültig, und 20 fehlende Sieger in einem Teillauf
senkten die Siege von B in K1 still von 750 auf 730.

**Stufe 1 und 2, unter §5.5 Nr. 2.** „Genau 82 Partien“ heißt 82 auswertbare Partien. Eine Partie ist auswertbar, wenn

1. `aIst` Schwarz oder Weiß ist, `sieger` A oder B und `siegerFarbe` S oder W;
2. `sieger` zu `siegerFarbe` und `aIst` passt;
3. `aufgabe` null ist, wie bei Aufgabe aus zu erwarten;
4. der Stand („B x : W y“) zwei endliche Zahlen trägt und x > y genau dann gilt, wenn `siegerFarbe` S ist;
5. `zuege` eine ganze Zahl von 1 bis zum Zuglimit ist.

Sonst gilt „kein Urteil“. Die Farbprüfung zählt Schwarz und Weiß getrennt.

Der Harness schreibt im Standardmodus nur diese Werte (`ab-harness.js`). In einem sauberen Lauf schlägt die Prüfung
also nie an; sie schützt vor beschädigten, bearbeiteten oder fremden Dateien. Nr. 2 und 4 gehen über den Wertebereich
hinaus. Sie fangen auch einen erlaubten, aber falschen Wert ab, also genau den Aufbaufehler, den §5.3 als ersten
Verdacht nennt. Außerdem schließt Nr. 4 eine Stelle im Harness: Er bucht einen Stand, der keine Zahl ist, als Sieg von
Weiß (`score.b > score.w ? 1 : 2`).

**Stufe G, unter §4.2 Nr. 4.** Jeder KI-Steinzug muss eine Simulationszahl tragen. Auf Schwer kommt jeder Steinzug aus
der Suche (`MCTS n Sims`). Ohne Zahl bleiben im Spielcode nur zwei Fälle: der Notzug nach einem KI-Fehler und der
Rückfallweg, wenn die Suche keinen Zug liefert. Bisher fiel ein solcher Zug still aus S heraus; jetzt gilt „kein
Urteil“. In der Referenzpartie (§14) trugen alle 288 KI-Steinzüge eine Simulationszahl. Das ist eine Zählung der
Einträge, keine neue Auswertung.

## 14. Nachtrag: Vorher-Referenz vom 25.11.2026 — keine formale Stufe G

Hazeberry hat am 25.11.2026 um 13:16:46 UTC eine Partie auf dem A17 exportiert, vor dem Merge dieses Werkzeug-PR und
ohne eigenes Go für Stufe G.

### 14.1 Entscheidung (Hazeberry, 25.11.2026)

- Die 578-Züge-Partie bleibt als **Vorher-Referenz** im Bericht.
- **Für die formale Stufe G gilt die erste gültige Partie nach dem Merge des Werkzeug-PR und dem eigenen Go.**
  §13.2 bleibt wie festgelegt. Eine Partie im vorgesehenen Zeitfenster braucht keine neue Festlegung. Eine gemeinsame
  Auswertung beider Partien wäre eine andere Frage.
- **Grund ist die Stufengrenze.** Sie liegt bei 120 · 2^4,5 ≈ 2715,3 Simulationen. Die Referenzpartie ergibt
  S = 2726, nur 10,7 Simulationen oder rund 0,4 % darüber. Damit entscheidet die Zuordnung zwischen 1920 → 3840 und
  3840 → 7680. Wenn das Ergebnis schon bekannt ist und die Entscheidung den Rechenaufwand in dieser Größenordnung
  beeinflusst, wird das Gültigkeitsfenster nicht rückwirkend verschoben. Für die spätere Zuordnung zählt die formale
  Partie, auf welcher Seite der Grenze sie auch landet.
- Bei der formalen Partie werden **Gerät und V8-Einstellung kurz notiert** (§4.1). Das kostet einen Satz und erspart
  später die Herleitung aus genau den Messwerten, die verglichen werden sollen.

Die Rasterregel, auf die sich diese Begründung bezieht, ist vor der formalen Partie durch eine feiner gestufte
ersetzt (§15). Für die Zuordnung zählt weiterhin allein die formale Partie.

Mein Vorschlag, das Fenster für diese Partie ab dem Merge von #371 zu setzen, ist damit verworfen. Er kam, nachdem der
Bericht und damit S bekannt war.

### 14.2 Die Referenzpartie, beschreibend

Territory, KI Weiß auf Schwer, 578 Züge. Daten und Prüfung der Übertragung:
[`daten/skalierung-heute/referenz-20261125/`](daten/skalierung-heute/referenz-20261125/README.md).

| KI-Steinzüge | n | Simulationen je Zug, Median [P10; P90] | Zugdauer | Suche (`zeiten.sucheMs`) | Rest | Netz |
|---|---:|---|---:|---:|---:|---:|
| alle | 288 | 2726 [2056; 4057] | 2053,5 ms | 1926,5 ms | 133 ms | 106 ms |
| bis Zug 80 | 40 | 2845,5 [2784; 3072] | 1839 ms | 1800 ms | 39 ms | 0 ms |
| ab Zug 81 | 248 | 2644,5 [2005; 4143] | 2637 ms | 2502 ms | 135 ms | 107 ms |

Korrektur (§16): In der ersten Fassung dieser Tabelle waren vier Mediane, die auf ,5 enden, zur ganzen Zahl gerundet
(2054, 1927, 2846, 2645). S = 2726 und alle Aussagen dieses Abschnitts bleiben unberührt.

- Die Regeln aus §4.2 Nr. 1, 2, 4 und 5 sind erfüllt. Nr. 3 ist im vorgesehenen Fenster nicht anwendbar, weil die
  Partie davor lag. Die Herkunft ist ersatzweise belegt: `index.html` ist auf `main` seit #371 unverändert, und der
  Parameter-Schnappschuss enthält `evalStreuung`.
- Über die Stufengrenze kommt S nur durch die 75 KI-Züge nach dem ersten Pass von Schwarz (ab Zug 427, Median 3562,
  das Brett war fast voll). Ohne sie läge der Median bei 2590. Das ist Beschreibung, keine Umwertung: Diese Phase
  gehört zum Spiel, und für die Zuordnung zählt allein die formale Partie (§14.1).

### 14.3 Vergleich mit dem A17-Lauf vom 31.10. („Chrome, V8-Optimierer an“, `zeitbudget.md`)

Nur die dort dokumentierten Werte, keine neue Rechnung auf dem Archiv; die heutigen Werte nach derselben Definition.

| Median | 31.10. (358 Züge) | 25.11. (578 Züge) |
|---|---:|---:|
| Endspiel-Netz ab Zug 81 | 106 ms | 107 ms (bis Zug 358: 106 ms) |
| Rest außerhalb der Suche ab Zug 81 | 137 ms | 135 ms (bis Zug 358: 141 ms) |
| ms je Simulation, nur Zug 2 | 0,68 | 0,65 |
| Simulationen, nur Zug 2 | 2662 | 2755 |
| Zugdauer ab Zug 81 | 2241 ms | 2637 ms (bis Zug 358: 1949 ms) — **nicht vergleichbar** |

**Die dokumentierten Vergleichswerte beider Partien sind ähnlich. Ein deutlicher Geschwindigkeitsverlust ist darin
nicht erkennbar.** Besonders aussagekräftig ist die Netzzeit mit 106 gegenüber 107 ms. Die Werte je Simulation stammen
nur aus Zug 2. Aus zwei verschiedenen Partien lässt sich weder eine allgemeine Aussage über sämtliche Engine-Änderungen
seit dem 31.10. noch eine belastbare Nachweisgrenze ableiten. Die Zugdauer hängt am Partieverlauf: Das Zeitbudget
wächst, wenn das Brett sich füllt, und in dieser Partie blieb es wegen vieler geschlagener Steine bis etwa Zug 306 bei
1,8 s.

Für spätere Vorher-Nachher-Vergleiche auf dem Gerät taugen deshalb die Größen, die nicht vom Partieverlauf abhängen —
Netzzeit, Rest, Zeit je Simulation —, nicht die Zugdauer und nicht der Median der Simulationen über die ganze Partie.

## 15. Nachtrag: feiner gestufte Regel für Stufe 2 (25.11.2026)

**Entscheidung (Hazeberry, 25.11.2026):** Die Rasterregel in §7.1 wird vor der formalen Stufe G durch eine feiner
gestufte („stetige“) Regel ersetzt: **N = S auf volle Hundert gerundet, K3 = N gegen 2N.**

**Die frühere Regel:** k = log2(S / 120), kaufmännisch gerundet; k = 0 → K1, k = 1 → K2, k ≥ 2 → 120 · 2^k gegen
das Doppelte.

**Anlass, offen benannt: die Referenzpartie (§14).** Sie zeigte, dass das A17 genau an der Rastergrenze 120 · 2^4,5 ≈
2715,3 arbeitet: S = 2726, ohne die 75 KI-Züge nach dem ersten Pass von Schwarz 2590. Unter dem Raster hätte das
Rauschen einer einzigen Partie entschieden, ob K3 1920 → 3840 oder 3840 → 7680 lautet. Beide Vergleiche liegen eine
halbe Verdopplung neben S, keiner beantwortet F4, und ihre Kosten unterscheiden sich um den Faktor zwei. In der
Referenzpartie lagen 85 % der KI-Steinzüge zwischen 1920 und 3840 und nur 11 % darüber.

**Warum das keine rückwirkende Anpassung ist:** §14.1 schließt aus, das Gültigkeitsfenster bei bekanntem Ergebnis
rückwirkend zu verschieben. Diese Änderung betrifft nicht die Gültigkeit einer Partie, sondern die Zuordnung von S zu
einem Vergleich. Sie fällt vor der formalen Partie und wählt keine Seite der alten Grenze, sondern schafft die große
Kante ab. Angestoßen hat sie trotzdem ein bekanntes Ergebnis; deshalb steht sie hier.

**Präzisierung (Hazeberry):** Die neue Regel ist feiner gestuft, mathematisch bleibt sie diskret. Bei S = 2749 ergibt
sie 2700 → 5400, bei S = 2750 ergibt sie 2800 → 5600. Das ist zugleich ein Grenztest für das Werkzeug. Die
problematische Verdopplung des gesamten Vergleichs an einer einzigen Schwelle entfällt.

**Was verloren geht:** die Kette 120 · 2^k und die Sonderfälle K1 und K2 für sehr kleine S. Der Abstand zu K2 war
ohnehin nur beschreibend (§7.4).

**Was gleich bleibt:** Umfang, Seeds, Teillauf-Regel, Gültigkeit und das eigene Go für Stufe 2 (§7.2 bis §7.4). Für die
Zuordnung zählt allein die formale Partie (§14.1).

**Werkzeug (#387):** `arbeitspunkt.js` nennt N statt k. Ein Median aus einer geraden Zahl von Zügen kann auf ,5
enden; S wird dann mit einer Nachkommastelle angezeigt, damit 2749,5 nicht als „2750“ neben N = 2700 steht.
`skalierung-bericht.js` und der Workflow nehmen `--n` (Eingabe `n`) statt `--k`; N muss ein Vielfaches von 100 und
mindestens 100 sein, sonst Bedienfehler (Exit 2). In Stufe 1 ist `--n` freiwillig und ergänzt die Kostenschätzung um
eine markierte Zeile für dieses N. Im beschreibenden Teil von Stufe 2 nennt der Bericht die Lage von K3 zu K2.

## 16. Nachtrag: Stufe G, formale Partie vom 25.11.2026

**Ablauf.** Go von Hazeberry am 25.11.2026 („Go für merge, Stufe G um 18:00 Uhr“). Der Werkzeug-PR #387 wurde um
14:53:29 UTC gemergt; der Merge-Commit `98aa1ad` ist der Commit aus §6, seine Engine-Blöcke tragen die Prüfsummen. Die
Partie lief am Abend auf dem A17, der Fehlerbericht ist um 20:05:28 UTC exportiert. Es ist die erste Partie nach Merge
und Go, also die formale Stufe G (§14.1).

**Gerät (§4.1), Notiz von Hazeberry:** Galaxy A17, Chrome 158.0.8127.42, V8-Optimierer an („Websites mit der
V8-Engine von Chrome beschleunigen“), keine Ausnahme für eine Website. Das Bildschirmfoto der Einstellung stammt von
19:32 UTC; dass sie während der Partie galt, beruht auf Hazeberrys Angabe. Der `userAgent` meldet
„Chrome/158.0.0.0“: Die Hauptversion 158 ist damit belegt, die volle Nummer nicht.

**Daten:** [`daten/skalierung-heute/stufe-g-20261125/`](daten/skalierung-heute/stufe-g-20261125/README.md), mit dem
Fehlerbericht im Wortlaut, den Bereitstellungen und der Ausgabe des Werkzeugs.

### 16.1 Gültigkeit (§4.2 und §13.4): gültig

1. `meta.kiStufe` ist `hard`.
2. `reproduktion.params` gleicht `PARAMS_DEFAULT` von `98aa1ad` in allen 164 Schlüsseln. Der Schnappschuss ist auch
   mit dem der Referenzpartie identisch.
3. Zwischen dem Merge und dem Export liegt genau eine Pages-Bereitstellung: Lauf 350, Commit `98aa1ad`,
   14:53:33 UTC. Sie trägt die Prüfsummen aus §6.
4. `workerNeustarts` ist 0, der Worker lief durch, und alle 228 KI-Steinzüge tragen eine Simulationszahl.
5. 228 KI-Steinzüge mit Simulationszahl und `zeiten.sucheMs`, davon 188 nach Zug 80.

Plausibilität, keine Gültigkeitsregel: In allen 228 Zeilen gilt `gesamtMs = vorMs + sucheMs + nachMs`, `msProSim`
passt auf die Rundung genau zu `sucheMs` / Simulationen, und die Simulationen im Zugprotokoll stimmen mit
`kiDiagnose` überein.

### 16.2 Ergebnis (§4.3)

| KI-Steinzüge | n | Simulationen je Zug, Median [P10; P90] | Zugdauer | Suche (`zeiten.sucheMs`) | Rest | Netz |
|---|---:|---|---:|---:|---:|---:|
| alle | 228 | 2618,5 [1986; 3494] | 1956 ms | 1800 ms | 133 ms | 106 ms |
| bis Zug 80 | 40 | 2846,5 [2753; 3052] | 1842 ms | 1800 ms | 42 ms | 0 ms |
| ab Zug 81 | 188 | 2559 [1911; 3584] | 2368 ms | 2232 ms | 136 ms | 106 ms |

**Arbeitspunkt S = 2618,5 Simulationen. Nach §7.1 ist N = 2600, und K3 in Stufe 2 lautet 2600 gegen 5200.**

**Zeitkosten einer Verdopplung: rund 1800 ms je Zug.** Das ist der Median der gemessenen Suchzeit; bei gleicher Zeit
je Simulation verdoppelt sie sich. Gerechnet, nicht gemessen (§10).

### 16.3 Beschreibend, ohne Folge für die Zuordnung

- **Gegen die Referenzpartie (§14):** S 2618,5 gegen 2726, also N 2600 gegen 2700. Netzzeit 106 gegen 106 ms, Rest
  133 gegen 133 ms, Simulationen bis Zug 80 2846,5 gegen 2845,5. Die Größen, die nicht vom Partieverlauf abhängen,
  sind praktisch gleich.
- **Die frühere Rasterregel:** Beide Partien liegen nur 4 % auseinander, aber auf verschiedenen Seiten ihrer Grenze
  2715,3. Unter dem Raster hätte die formale Partie 1920 → 3840 ergeben, die Referenzpartie 3840 → 7680. Genau diese
  Kante hat §15 vor der formalen Partie beseitigt.
- **Nach dem ersten Pass von Schwarz** (Zug 385) spielte die KI noch 36 Steinzüge mit dem Median 3585 Simulationen;
  das Brett war fast voll, Simulationen wurden billig (zuletzt 15 073). Ohne diese Phase läge der Median bei 2562,5
  (192 Züge). Für die Zuordnung zählt S über alle Züge (§4.3).
- **Verteilung:** 8,8 % der KI-Steinzüge unter 1920 Simulationen, 86,0 % zwischen 1920 und 3840, 5,3 % darüber.

### 16.4 Werkzeug: Anzeige korrigiert

Die Tabelle von `arbeitspunkt.js` rundete Mediane, die auf ,5 enden, zur ganzen Zahl: 2618,5 erschien als „2619“.
Für die Zeile mit S war das schon behoben (§15), für die Tabelle nicht. Jetzt zeigt auch sie eine Nachkommastelle,
mit Test. An Gültigkeit und Zuordnung ändert das nichts; N ist bei 2618,5 wie bei 2619 gleich 2600. Derselbe
Rundungsfehler stand in der Tabelle in §14.2 und ist dort korrigiert.

### 16.5 Wie es weitergeht

Stufe 1 (K1 120 → 240, K2 240 → 480) braucht ein eigenes Go. Ihr Bericht schätzt mit `--n 2600` die Kosten von K3,
und mit dieser Schätzung wird das Go für Stufe 2 erfragt (§7.3). Grobe Orientierung, ausdrücklich nur unter der
Proportionalannahme aus §7.3: rund 300 Rechenstunden und 17 Stunden Wanduhrzeit für 2600 gegen 5200.

## 17. Nachtrag: Stufe 1, Ergebnis vom 25.11.2026

**Ablauf.** Go von Hazeberry am 25.11.2026 („Go für Stufe 1“). Die 30 Teilläufe nach §5.1 starteten um 20:21 UTC auf
`claude/skalierung-stand` (`98aa1ad`): K1 mit den Seeds 11250001 bis 11250015, K2 mit 11250016 bis 11250030, je 82
Partien. Alle endeten erfolgreich, K1 nach 47 bis 61 Minuten, K2 nach 80 bis 113 Minuten. Den Bericht erstellte
`skalierung-bericht.yml` um 23:09 UTC (Lauf 45719087322), mit dem Werkzeug von `main`; dessen Dateien sind gleich wie
an `98aa1ad`. Daten: [`daten/skalierung-heute/stufe-1-20261125/`](daten/skalierung-heute/stufe-1-20261125/README.md).

### 17.1 Gültigkeit (§5.5 und §13.4): gültig

Alle 30 Teilläufe sind vorhanden und richtig zugeordnet. Jeder hat 82 auswertbare Partien, 41 je Farbe. Die Arme
unterscheiden sich nur in `mctsFixedSims`, die Aufgabe ist aus, Zuglimit 600, Komi 7,5, Standardmodus. Alle Läufe
liefen auf `98aa1ad`, und die Engine-Blöcke tragen die Prüfsummen aus §6. Anomalien gab es keine.

### 17.2 F1: Gewinn je Verdopplung

| Vergleich | Siege B : A | Siegrate B (95 %) | p | Elo (95 %) |
|---|---:|---|---:|---|
| K1 120 → 240 | 665 : 565 | 54,1 % [51,2 %; 56,9 %] | 0,0047 | **+28,3** [+8,6; +48,1] |
| K2 240 → 480 | 669 : 561 | 54,4 % [51,6 %; 57,2 %] | 0,0023 | **+30,6** [+10,8; +50,4] |

- K1: **Eine Verdopplung von 120 auf 240 Simulationen bringt dem heutigen Default nachweisbar Stärke: +28,3 Elo
  [+8,6; +48,1].**
- K2: **Eine Verdopplung von 240 auf 480 Simulationen bringt dem heutigen Default nachweisbar Stärke: +30,6 Elo
  [+10,8; +50,4].**

### 17.3 F2: Abflachung

D = Elo(K1) − Elo(K2) = −2,3 Elo, 95 % genähert [−29,8; +25,3]. Exakter Fisher-Test auf die Siege von B: p = 0,9034.

**Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (−2,3 Elo [−29,8; +25,3]). Die Messung war so
bemessen, dass sie eine Abflachung von 40 Elo mit rund 80 % erkannt hätte.**

Das ist kein Nachweis gleicher Gewinne (§5.3). Das Intervall lässt eine Abflachung bis rund 25 Elo ebenso zu wie
einen Anstieg bis rund 30 Elo.

### 17.4 Vergleich mit dem 03.10., beschreibend (§3)

| | 03.10. (360 Partien je Vergleich) | 25.11. (1230 Partien je Vergleich) |
|---|---|---|
| K1 120 → 240 | +75 [38; 112] | +28,3 [8,6; 48,1] |
| K2 240 → 480 | +55 [19; 92] | +30,6 [10,8; 50,4] |

Die Punktschätzungen liegen heute deutlich niedriger, die Intervalle überlappen in beiden Vergleichen. Seit dem 03.10.
sind drei Bedingungen anders (§3): die Engine (Muster, Endspiel-Netz), die Aufgabe (damals an, heute aus) und das
Zuglimit (400, heute 600). Welche davon den Unterschied trägt, lässt sich mit diesem Aufbau nicht trennen.

### 17.5 Nebenmaße, beschreibend (§5.4)

- **Partielänge:** im Mittel 373,5 (K1) und 377,7 Züge (K2). Keine Partie erreichte das Zuglimit.
- **Laufzeit:** 0,62 (K1) und 1,06 Minuten (K2) je Partie.
- **Simulationen je Zug:** im Mittel 93 % des festgelegten Werts (A 111,5 statt 120 in K1, B 446,8 statt 480 in K2).
  Das ist eine Eigenschaft der Zählung, keine Abweichung der Suche: `ab-harness.js` teilt die Simulationen durch alle
  KI-Entscheidungen, Pässe eingeschlossen, aber nur Steinzüge tragen Simulationen (Zeilen 1208 bis 1213). Im Teillauf
  11250001 kamen rund 25 Pässe auf eine Partie, also rund 7 % der Entscheidungen; das passt zu 93 %.
- **Farbe, nicht vorab festgelegt und nicht getestet:** In K1 gewann Schwarz 668 von 1230 Partien (54,3 %), in K2 554
  (45,0 %). B gewann in K1 als Schwarz 359 von 615 und als Weiß 306, in K2 als Schwarz 304 und als Weiß 365. Hypothese,
  nicht geprüft: Mit stärkerem Spiel verschiebt Komi 7,5 den Vorteil von Schwarz zu Weiß. Auf F1 und F2 wirkt das
  nicht, weil jeder Teillauf beide Farben je zur Hälfte spielt.

### 17.6 Kostenschätzung für Stufe 2 (§7.3)

Aus K1 und K2: Laufzeit je Partie ≈ 0,183 + 2,443 · 10⁻³ · mittlere Simulationen je Zug (Minuten). Für K3 = 2600 gegen
5200 (§16) ergibt das **9,71 Minuten je Partie, 10 Partien je Teillauf, 123 Teilläufe, rund 199 Rechenstunden und
rund 11,3 Stunden Wanduhrzeit** bei 20 gleichzeitigen Jobs. Die ganze Tabelle steht im Bericht.

Das ist eine Schätzung, kein Messwert. Sie schreibt eine Gerade von 180 und 360 mittleren Simulationen bis 3900 fort,
also über mehr als das Zehnfache des gemessenen Bereichs. Wachsen die Kosten je Simulation mit der Baumgröße, wird es
teurer. Bei doppelten Kosten bräuchte ein Teillauf rund 194 Minuten. Das läge knapp unter den 200 Minuten aus §7.2
und deutlich unter der Zeitgrenze des Workflows von 300 Minuten.

### 17.7 Daten und Aufbewahrung

Im Repository liegen der Bericht im Wortlaut und die Liste der Teilläufe mit Run-IDs, Artefakt-IDs und SHA-256 der
Artefakte. Die Daten je Partie (JSON, Rohdump, Log) liegen nur in den Artefakten, und GitHub löscht sie am
**23.02.2027**. Vorschlag, eigener kleiner PR: Das Berichtswerkzeug schreibt zusätzlich eine Tabelle je Partie
(Teillauf, Partie, Farbe von A, Sieger, Siegerfarbe, Stand, Züge, Simulationen, Dauer) ins Log. Daraus übernehme ich
sie maschinell nach `docs/daten/`. Bis dahin lässt sich jede spätere Kopie der Artefakte an den Prüfsummen prüfen.

### 17.8 Wie es weitergeht

Stufe 2 (K3 = 2600 gegen 5200, Seeds ab 11260001, 10 Partien je Teillauf nach §7.2) braucht ein eigenes Go, auf
Grundlage der Schätzung aus §17.6.

## 18. Ergebnis der Stufe 2 vom 26.11.2026

**Deutung offen, Aufbauprüfung nach §5.3 ausstehend**

Im [Originalbericht](daten/skalierung-heute/stufe-2-20261126/skalierung-bericht.md) lautet das vorab festgelegte
Urteil im Wortlaut:

> K3: **Die doppelte Suche verliert nachweisbar.**

B (5200) gewann 577 von 1230 Partien gegen A (2600), entsprechend 46,9 % [44,1 %; 49,7 %], p = 0,0324 und −21,5 Elo
[−41,3; −1,8]. B gewann als Schwarz 239/615, als Weiß 338/615. Der Abstand K2–K3 ist nach §7.4 rein beschreibend.
Die Ursache des negativen Ergebnisses ist offen.

### Kontrolle an den vorhandenen Artefakten

Die SHA-256 der 123 Laufarchive und des Berichts stimmen mit dem
[Laufverzeichnis](daten/skalierung-heute/stufe-2-20261126/laeufe.csv) überein. Alle 123 Konfigurationen melden
Abschluss, denselben Commit wie im Bericht, Komi 7,5, Aufgabe aus und A/B in der vorgesehenen Budgetreihenfolge. Pro
Seed liegen zehn nummerierte Partien vor. Für jede Partie stimmen Seed, Partienummer, Zugzahl, Armfarbe, Siegerfarbe
und daraus abgeleiteter Siegerarm zwischen Ergebnisdatei und Rohdump überein. Die nachgezählten Arm-Siege ergeben
577 : 653. Diese Kontrollen prüfen die gespeicherten Angaben. Die Übergabe an die laufende Engine ist Gegenstand der
Aufbauprüfung.

Die [Einzelwerte für K3](daten/skalierung-heute/stufe-2-20261126/k3-partien.csv) enthalten auch den Hash des
Schlussbretts aus dem Rohdump. Die entsprechenden Tabellen für
[K1](daten/skalierung-heute/stufe-1-20261125/k1-partien.csv) und
[K2](daten/skalierung-heute/stufe-1-20261125/k2-partien.csv) sichern die Daten je Partie aus §17.7. Die
vollständigen ursprünglichen Laufarchive einschließlich Zugereignissen liegen zusätzlich außerhalb des Repos in zwei
ZIP-Sicherungen. Jedes Laufarchiv darin lässt sich über die SHA-256 in den Laufverzeichnissen von
[Stufe 1](daten/skalierung-heute/stufe-1-20261125/laeufe.csv) und
[Stufe 2](daten/skalierung-heute/stufe-2-20261126/laeufe.csv) prüfen. Spalten und Herkunft der Tabellen stehen in den
READMEs der beiden Datenordner.

### Gegenprüfung in der Sitzung (27.11.2026)

Unabhängig von der Kontrolle oben nachgezählt, nur Größen, die in den Berichten schon stehen:

- **Einzelwerte:** K1, K2 und K3 haben je 1230 Zeilen, jeder Seed alle Partienummern, keine Partie doppelt. Die
  Lauf-IDs passen zu den Laufverzeichnissen. Die Prüfkette aus §13.4 findet in keiner der 3690 Partien einen Fehler,
  soweit die Tabellen ihre Felder enthalten (das Feld `aufgabe` fehlt; die Berichte haben es geprüft).
  Siege, Farben, Partielängen und Simulationen stimmen mit den Berichten aus §17 und §18 überein, die Simulationen bis
  auf die Rundung der Einzelwerte.
- **Prüfsummen:** Drei der 124 Werte im Laufverzeichnis von Stufe 2 (erster und letzter Teillauf, Bericht) stimmen mit
  der Prüfsumme, die GitHub für das Artefakt angibt. Die 123 Lauf-IDs stimmen mit den beim Start notierten überein.
- **Bericht:** `skalierung-bericht.md` ist zeichengleich mit dem Job-Log des Berichtslaufs (Zeitstempel entfernt).
- **Nebenbefund K1:** Seed 11250006 Partie 75 und Seed 11250008 Partie 77 haben denselben Schlussbrett-Hash, dieselben
  370 Züge, denselben Stand und dieselben Simulationen. Vermutlich ist es zweimal dieselbe Partie; belegt ist nur das
  gleiche Endbrett. Auf das Ergebnis wirkt es nicht (1 von 1230).

Die Aufbauprüfung hat eine eigene Festlegung:
[`skalierung-aufbaupruefung-vorabfestlegung.md`](skalierung-aufbaupruefung-vorabfestlegung.md).
