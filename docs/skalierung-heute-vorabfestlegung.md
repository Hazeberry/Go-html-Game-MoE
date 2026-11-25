<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Skalierung auf dem heutigen Default: Vorabfestlegung

**Stand: 25.11.2026. Status: Entwurf, nicht gelaufen.** Dieses Doc enthält Vorgaben für Werkzeug und Läufe.
Hazeberry liest es vor dem Merge. Jede der drei Stufen braucht ein eigenes Go; der Merge dieses Docs ist keins.

Festlegungen von Hazeberry am 25.11.2026: **1230 Partien je Vergleich, Aufgabe aus, Gerätemessung zuerst** — vor
der Verdopplung am Arbeitspunkt der Geräte.

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
- **F4:** Was bringt eine Verdopplung am Arbeitspunkt eines Geräts, das oberhalb von Stufe 1 arbeitet?

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

- **Geräte:** Galaxy A17 mit Chrome, V8-Optimierer an; Galaxy A20s mit Chrome ([`zeitbudget.md`](zeitbudget.md)).
  Je eine Partie.
- Vor der Partie die Seite neu laden, nicht aus dem Cache, damit der aktuelle Stand von `main` läuft.
- Stufe **Schwer**, Standardparameter (keine gespeicherten Abweichungen im Dashboard), Komi 7,5; die Wertung ist für
  die Zeiten gleichgültig.
- Die Partie zu Ende spielen, dann den Fehlerbericht (🐞) exportieren. Dazu als Notiz: Gerät, Browser und beim A17
  der Stand des V8-Schalters.

### 4.2 Gültigkeit je Gerät

Zwei Zustände. **Ungültig**, mit „kein Urteil“ und Grund, wenn:

1. `meta.kiStufe` nicht `hard` ist.
2. `reproduktion.params` von `PARAMS_DEFAULT` des Commits aus §6 abweicht, in einem Schlüssel oder einem Wert.
3. Eine Pages-Bereitstellung („pages build and deployment“) zwischen dem Merge des Werkzeug-PR (§9) und
   `meta.erstellt` einen Commit trägt, dessen Engine-Blöcke nicht den Prüfsummen aus §6 entsprechen.
4. `meta.workerNeustarts` größer als 0 oder `meta.workerDead` wahr ist. Dann rechnete zeitweise der Hauptthread,
   und die Zeiten wären andere.
5. Weniger als 120 KI-Steinzüge mit Simulationszahl vorliegen oder weniger als 40 davon nach Zug 80.

Eine ungültige Partie bleibt im Archiv. Eine neue Partie auf demselben Gerät ist erlaubt und wird als Wiederholung
berichtet.

### 4.3 Auswertung

Je Gerät über alle KI-Steinzüge, und getrennt bis und ab Zug 80 (Grenze wie in `zeit-zerlegung.js`):

- **Simulationen je Zug:** Median, 10. und 90. Perzentil.
- **Zeiten:** Median der Zugdauer (`dauerMs`), der Suchzeit (Simulationen × `msProSim`) und des Rests außerhalb der
  Suche, darin das Endspiel-Netz (`zeiten.netzMs`).
- **Arbeitspunkt S_d:** Median der Simulationen über alle KI-Steinzüge des Geräts d.
- **Zeitkosten einer Verdopplung**, gerechnet, nicht gemessen: Bei gleicher Zeit je Simulation verdoppelt sich die
  Suchzeit, ein Zug dauert also um den Median der Suchzeit länger. Umgekehrt bräuchte „doppelt so viele Simulationen
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

### 7.1 Regel für die Stufen

Für jedes gültig gemessene Gerät d: k_d = log2(S_d / 120), kaufmännisch gerundet (x,5 aufwärts).

- **k_d ≤ 2** (S_d unter rund 679): Der Arbeitspunkt liegt im Bereich von Stufe 1, und deren Antwort gilt — K2 bei
  k_d = 2, K1 bei k_d = 1. Bei k_d ≤ 0 arbeitet das Gerät unter 120 Simulationen; dafür gibt es keine passende
  Messung. Für dieses Gerät gibt es keinen Lauf in Stufe 2.
- **k_d ≥ 3:** Vergleich K3_d mit A = 120 · 2^k_d und B = 2 · A, sonst wie Stufe 1 (Aufgabe aus, Zuglimit 600,
  `roh` 1, B mit doppelter Suche).

Ergeben beide Geräte dasselbe k, gibt es einen gemeinsamen Vergleich.

Erwartung, ausdrücklich **keine** Festlegung: Laut `zeitbudget.md` rechnete das A17 2662 Simulationen bei Zug 2,
lag also weit über 480; das A20s brauchte rund 4 ms je Simulation und lag damit bei rund 450, also wohl im Bereich
von Stufe 1. Gemessen ist das am heutigen Stand nicht, und die Zahl je Zug ändert sich über die Partie.

### 7.2 Umfang und Seeds

1230 Partien je Vergleich, wie in Stufe 1. Partien je Teillauf: der größte gerade Teiler von 1230 (2, 6, 10, 30,
82, 246, 410), bei dem die geschätzte Laufzeit eines Teillaufs 200 Minuten nicht übersteigt. So bleiben die Farben
je Teillauf ausgeglichen, und die Zeitgrenze von 300 Minuten wird mit Abstand eingehalten. Seeds: 11260001 + j − 1
für Teillauf j. Auch Stufe 2 läuft auf `claude/skalierung-stand`.

### 7.3 Kosten und Go

Die Laufzeit je Partie wird aus Stufe 1 geschätzt: K1 und K2 liefern zwei Punkte für „Laufzeit = a + b · mittlere
Simulationen je Zug“, daraus folgt die Schätzung für K3_d. Mit dieser Schätzung (Zahl der Teilläufe, Rechenstunden,
Wanduhrzeit bei 20 gleichzeitigen Jobs) wird das Go für Stufe 2 erfragt. **Ist sie zu teuer, wird Stufe 2 nicht
verkleinert, sondern neu festgelegt.**

Grobe Orientierung heute, ausdrücklich eine Schätzung: Bei voll proportionaler Rechenzeit kostet 1920 gegen 3840
rund 11 Minuten je Partie, also rund 225 Rechenstunden für 1230 Partien und etwa elf Stunden Wanduhrzeit.

### 7.4 Endpunkt, Urteil, Gültigkeit

**Primär:** wie §5.2 für F1, also Siegrate von B, Binomialtest, Clopper-Pearson und Elo mit Intervall. Das ergibt
den Gewinn einer Verdopplung am Arbeitspunkt. Die Urteilssätze sind die aus §5.3 für F1.

**Beschreibend:** die Differenz zum Gewinn von K2 mit genähertem Intervall, **ohne Test**: Zwischen K2 (bis 480)
und K3_d (ab 960) bleibt mindestens eine Verdopplung ungemessen.

**Gültigkeit:** wie §5.5, mit der Partienzahl je Teillauf und den Seeds aus §7.2.

## 8. Was die Ergebnisse für das Spiel bedeuten, vorab und ohne Entscheidung

Je Gerät stehen am Ende zwei Zahlen nebeneinander:

- der **Gewinn einer Verdopplung an seinem Arbeitspunkt**, mit Intervall (aus K1, K2 oder K3_d), und
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
  Regel aus §7.1 an. §4.2 Nr. 3 prüft der Bericht anhand der Actions-Läufe „pages build and deployment“.
- **`.github/workflows/skalierung-bericht.yml`:** lädt die Artefakte in Actions herunter (aus einer Session sind
  sie nicht erreichbar, `eval-streuung-vorabfestlegung.md` §14), prüft die Engine-Blöcke am `headSha` der
  Teilläufe und ruft das Werkzeug auf.
- **Tests** für beide Werkzeuge, jede Gültigkeitsregel einzeln ausgelöst, dazu die Urteilssätze wörtlich; Einträge in
  `tests/run.js`, `tests/README.md` und `tests/dagger.js`.

## 10. Grenzen

- **Selbstspiel.** Gewinne gegen die eigene Engine fallen gegen fremde Gegner oft kleiner aus; hier nicht gemessen.
- **Feste Simulationszahl statt Wanduhr.** Im Spiel schwankt die Zahl je Zug; der Arbeitspunkt ist ein Median.
- **Zwei Geräte, je eine Partie.** Für andere Geräte gilt nur, was sich an ihrer Simulationszahl ablesen lässt.
- **Unabhängige Partien** sind angenommen, wie am 03.10.; Paare mit gleicher Eröffnung gibt es im Standardmodus nicht.
- Die **Bemessung** (40 Elo, 80 %) setzt eine Siegrate um 59 % voraus.
- Das **Intervall für D ist genähert**; der Test ist exakt.
- Die **Zeitkosten einer Verdopplung** sind gerechnet (lineare Suchzeit), nicht gemessen.

## 11. Ablauf

1. Dieses Doc als PR; Hazeberry liest; Merge.
2. Werkzeug-PR (§9), CI grün, Merge. Dessen Merge-Commit ist der Commit aus §6; darauf wird der Branch
   `claude/skalierung-stand` angelegt.
3. **Stufe G**, nach Go: Hazeberry spielt je eine Partie auf A17 und A20s; Auswertung; Nachtrag mit den
   Arbeitspunkten.
4. **Stufe 1**, nach Go: 30 Teilläufe, Bericht über `skalierung-bericht.yml`, Nachtrag, Rohwerte unter
   `docs/daten/skalierung-heute/`. Stufe 1 hängt nicht von Stufe G ab.
5. **Stufe 2**, nach Go mit der Kostenschätzung aus §7.3 und den Stufen aus §7.1: Teilläufe, Bericht, Nachtrag.
