<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Aufbauprüfung zu K3 nach §5.3

**Stand: 27.11.2026. Status: Teil 1c gültig, kein Aufbaufehler gefunden (§5). Teil 1b: kein Hinweis auf Suchzustand, der von einem Arm zum anderen gelangt (§6). Teil 3 offen.** Dieses Doc enthält Vorgaben für Werkzeug und Läufe.
Hazeberry liest es vor dem Merge. Jeder Lauf in Actions braucht ein eigenes Go; der Merge dieses Docs ist keins.

Festlegung nach Kenntnis des K3-Ergebnisses ([`skalierung-heute-vorabfestlegung.md`](skalierung-heute-vorabfestlegung.md)
§5.3 und §18), vor einer neuen Partie und vor der Auswertung der Zugverläufe. Gegenstand ist der Messaufbau des Commits
98aa1ad586c9de23f64ca76c26af1d7b199b7b3a. Der beobachtete K3-Effekt bleibt bis zum Abschluss offen.

## 0. Was läuft, wo, mit welchem Go

| Teil | Was | Wo | Go |
|---|---|---|---|
| 1a | Weg der Parameter, aus dem Code | in diesem Doc, ohne Lauf | keins nötig |
| 1b | Durchsicht des gemeinsamen Engine-Zustands, aus dem Code | Nachtrag in diesem Doc, ohne Lauf | keins nötig |
| 1c | Simulationen je Zug und Konfiguration aus den 123 K3-Artefakten | GitHub Actions | eigenes Go |
| 3 | Beschreibende Diagnose der K3-Artefakte, mit GNU Go als Bewerter | GitHub Actions | eigenes Go |

Teil 1c und 3 spielen keine Partie; sie lesen die vorhandenen Artefakte, die GitHub am 23. und 24.02.2027 löscht. Das
Auswertungswerkzeug kommt mit Tests in einem eigenen PR (je Fehlerfall ein Test mit erwartetem „KEIN URTEIL“ bzw.
„Aufbaufehler gefunden“); dieser PR nennt vor dem Go die erwartete Laufzeit. Ein neuer Messlauf (§2) braucht eine
eigene Festlegung.

**Gültigkeit.** Wie im Haupt-Doc kennt jeder Teil nur gültig oder ungültig. Ungültig heißt „kein Urteil“ mit Grund,
und der Lauf wird rot: Ein Artefakt fehlt, eine Prüfsumme weicht von
[`laeufe.csv`](daten/skalierung-heute/stufe-2-20261126/laeufe.csv) ab, ein Ergebnis-JSON oder Rohdump ist nicht
vollständig lesbar, oder eine der 1230 Partien fehlt. Ein gültiger Teil endet mit „kein Aufbaufehler gefunden“ oder
„Aufbaufehler gefunden“. Der zweite Fall macht den Lauf ebenfalls rot und nennt die betroffenen Partien.

## 1. Übergabe und Zuordnung

Bei falscher Zuordnung, abweichendem Engine-Stand oder ungeklärter Parameterübergabe: stoppen, betroffene Partien
benennen und vor einem Wiederholungslauf neu festlegen.

### 1a. Weg der Parameter, aus dem Code

Im Harness gibt es keinen Worker: Beide Arme ziehen im selben Node-Prozess. `ab-harness.js` und `index.html` sind seit
dem Messcommit unverändert; die Zeilenangaben gelten dort und auf `main`.

1. `--A` und `--B` laufen durch denselben Parser `kv()` in `AB.A` und `AB.B` (`ab-harness.js:798–799`).
2. Je Partie legt `aIsBlack = g % 2 === 0` die Farbe von A fest; `playGame` bekommt die beiden Parametersätze für
   Schwarz und Weiß (`ab-harness.js:1887–1889`). A ist also in den ungeraden Partien Schwarz.
3. Vor jedem Zug setzt `Object.assign(PARAMS, PARAMS_DEFAULT, {aiTimeBudget, adaptiveBudgetEnabled: 0}, cfg)` die
   Parameter der ziehenden Farbe (`ab-harness.js:1104`).
4. In der Stufe „hard“ mit `useMCTS` 1 (Standard) gibt `_getAIMoveKern` (`index.html:5268`) Steinzüge nur über
   `mctsPUCT` zurück; jeder andere Ausgang ist Pass oder Aufgabe. `mctsPUCT` (`index.html:4604`) liest
   `PARAMS.mctsFixedSims`. Ist der Wert größer als 0, sind beide Zeitgrenzen unendlich, und die Suchschleife endet erst
   bei `sims === mctsFixedSims`.
5. Die Meldung `MCTS n Sims · … · Q q` liest der Harness mit `SIMS_RE` (`ab-harness.js:941`) und schreibt `n` und `q`
   in das Zugereignis des Rohdumps; ein Pass hat dort `idx` −1 und keine Simulationen.
6. Siegerfarbe aus `finalScore` mit Komi (`ab-harness.js:907`, Aufruf in `playGame`), Siegerarm aus der Farbe von A
   (`raw.partien`, `ab-harness.js:1893`).

Daraus folgt das Kriterium für 1c: Jeder Steinzug von A meldet genau 2600, jeder Steinzug von B genau 5200
Simulationen; jede Entscheidung ohne Meldung ist ein Pass.

### 1b. Gemeinsamer Engine-Zustand

Weil beide Arme im selben Prozess ziehen, kann Zustand, der einen Zug überdauert, die Suche des einen Arms in die des
anderen tragen. Diese Fehlerklasse erkennt keine Prüfung mit gleichen Parametern auf beiden Seiten (§2). Der Harness
führt fünf Zustände je Farbe und spielt sie vor jedem Zug ein: `_mctsSavedRoot`, `_hopelessStreak`, `_allDeadStreak`,
`_lastMsPerSim` und die Krisendauer (`ab-harness.js:1124–1136`, zurück ab `:1205`).

Festgelegt wird eine vollständige Liste aller veränderlichen Zustände auf Modulebene in `shared-go-logic`, `worker-ai`
und `policy-net` am Messcommit: `let` und `var`, dazu `const`-Objekte, Maps und Typed Arrays mit veränderlichem Inhalt
(Beispiel: `_enEigen`, der letzte eigene Zug je Farbe). Jeder Eintrag kommt in genau eine Klasse:

1. vor Gebrauch in jedem Zug neu gesetzt oder ungültig gemacht;
2. Zähler oder Wächter ohne Wirkung auf die Zugwahl;
3. je Farbe getrennt, im Harness oder in der Engine selbst;
4. überdauert einen Zug, wirkt auf die Zugwahl und ist nicht je Farbe getrennt.

Ein Eintrag in Klasse 4 ist ein Befund „Aufbaufehler möglich“ mit Variable, Wirkweg und Codezeilen. Eine erste,
unvollständige Durchsicht am 27.11.2026 fand keinen solchen Eintrag; sie ersetzt die Liste nicht. Die Liste kommt als
Nachtrag in dieses Doc.

### 1c. Prüfung an den K3-Artefakten, in Actions

Für alle 123 Teilläufe und 1230 Partien:

- Prüfsumme jedes Artefakts gegen `laeufe.csv`; Konfiguration A `mctsFixedSims=2600,resignEnabled=0`, B
  `mctsFixedSims=5200,resignEnabled=0`; Commit `98aa1ad`; `params_hash` in allen 123 Rohdumps gleich.
- Je Zugereignis: Farbe → Arm über `armSchwarz`/`armWeiss` des Rohdumps. Jeder Steinzug meldet genau den Sollwert
  seines Arms (2600 bzw. 5200). Jede Entscheidung ohne Meldung hat `idx` −1.
- Je Partie: Zahl der Zugereignisse gleich `zuege`; Siegerfarbe und Siegerarm wie in `raw.partien`.

Berichtet werden je Arm und Farbe: Steinzüge, davon mit Sollwert, Pässe. Jede Abweichung ist „Aufbaufehler gefunden“
mit Liste der Partien und Züge.

## 2. A/A-Kontrolle: entfällt

Erwogen war eine A/A-Kontrolle: K3-Konfiguration mit 5200 gegen 5200, Seeds 11260001 bis 11260123, 1230 Partien. Sie
entfällt aus zwei Gründen.

- **Sie prüft hier nichts Neues.** Im Harness sind die Arme nur Parametersätze (§1a, Punkte 1 bis 3). Die Farbe hängt
  an der Partienummer, der Zufallsstrom ist einer für den ganzen Lauf (`ab-harness.js:833`). Bei gleichen Parametern
  spielt der Harness dieselben Partien, gleich welcher Arm „A“ heißt. Die Bezeichnung wirkt nur auf die Buchführung,
  also Farbe von A und Siegerarm, und die ist für alle 1230 K3-Partien schon je Partie geprüft (Haupt-Doc §18 und
  §13.4). Armreihenfolge und Zufallsstrom hängen nicht an der Bezeichnung. Gemeinsamen Zustand (§1b) sieht die
  A/A-Kontrolle nicht, weil beide Seiten dieselbe Suche machen.
- **Sie ist schwach und teuer.** Der exakte zweiseitige Test bei 1230 Partien schlägt erst bei höchstens 580 oder
  mindestens 650 Siegen von B an. Eine Verzerrung in der vollen Größe des K3-Effekts (−21,5 Elo) fände er mit rund 58 %.
  Nach dem Kostenmodell aus §7.3 wären es rund 12 Minuten je Partie und etwa 247 Rechenstunden.

Bleibt nach Teil 1 ein Verdacht auf gemeinsamen Zustand, oder braucht die Deutung eine Wiederholung, dann: K3 mit neuen
Seeds, jeder Arm in einem eigenen Engine-Prozess. Das braucht einen Schalter im Harness (Standard aus, bei aus
bitgleich getestet) und eine eigene Festlegung. Ein solcher Lauf prüft den Aufbau und wiederholt den Vergleich
zugleich.

## 3. Beschreibende Diagnose der bestehenden K3-Dumps in Actions

Alle 1230 Partien einschließen. Passzahl je 100 Entscheidungen, erster Pass und Anteil der Partien ohne eigenen Pass
getrennt nach Arm und Farbe berichten. Für den ersten Pass nur Partien mit eigenem Pass verwenden und den Nenner
angeben. Weil Steinzüge nur aus der Suche kommen (§1a), sind die Pässe genau die Entscheidungen ohne Simulationen.
Grob aus den Mitteln der Berichte gerechnet, nicht gezählt: In K3 entschied A rund 5,5 % seiner Züge ohne Suche
(1 − 2457,2/2600), B rund 6,5 % (1 − 4860,1/5200); in K1 und K2 lagen beide Arme bei rund 7,0 %. Die Auswertung zählt
das genau.

Zugphasen vorab auf 1–100, 101–200, 201–300 und ab 301 festlegen. Je Arm, Farbe und Phase Anzahl beobachteter
Partien sowie Median der je Partie gemittelten q-Werte eigener Steinzüge angeben. Perspektive und Skala von q laut
Code: Wert des gewählten Wurzelkindes aus Sicht der ziehenden Seite, `tanh(Bewertung / mctsValueScale)`, also
zwischen −1 und 1. Die Engine kennt kein Komi; q = 0 heißt „ausgeglichen ohne Komi“, bei Komi 7,5 liegt Schwarz dort
zurück. Die q-Werte werden deshalb nur getrennt nach Farbe berichtet und nicht an einer gemeinsamen Schwelle gemessen.
Außerdem stammen sie aus verschieden tiefer Suche; sie beschreiben die Suche jedes Arms, keinen gemeinsamen Maßstab.

Den beschreibenden Kipppunkt bestimmt deshalb ein fester Bewerter, der für beide Arme gleich ist und Komi kennt: GNU Go
3.8 mit `estimate_score`, chinesische Regeln, Komi 7,5, wie in `auswertung/aufgabe-gnugo.js`. Die Züge jeder Partie
werden aus dem Rohdump nachgespielt; Messpunkte sind die Stellungen nach Zug 100, 200 und 300, soweit die Partie so
lang ist. Kipppunkt ist der erste Messpunkt, ab dem GNU Go den späteren Verlierer an jedem folgenden Messpunkt hinten
sieht (Schätzung unter 0 aus seiner Sicht). Partien ohne bestimmbaren Kipppunkt gesondert zählen, ebenso Schätzungen,
die GNU Go nicht liefert. Berichtet wird die Verteilung je Arm des Verlierers. GNU Gos Schätzung ist grob, einige
Punkte Rauschen; der Wert beschreibt eine Schätzung, keine gesicherte Verluststellung.

**Strenge Zählung, ergänzt vor dem Lauf am 27.11.2026 (Hazeberry).** Zusätzlich zur Zählung nach dem Wert der
Schätzung: Ein Messpunkt gilt nur dann als „hinten“, wenn auch die für den Verlierer günstigste Schranke, die GNU Go mit
`estimate_score` ausgibt, unter 0 liegt. GNU Go 3.8 gibt die Schranken aus Sicht von Weiß aus; verliert Weiß, zählt die
obere Schranke, verliert Schwarz, die untere mit umgekehrtem Vorzeichen. Fehlen die Schranken, zählt der Messpunkt in
der strengen Zählung als fehlend. Der Kipppunkt wird sonst gleich bestimmt. Beide Zählungen werden berichtet, die
Schranken stehen in den Einzelwerten. Anlass: In einer Testpartie (Harness, 60 Simulationen, nicht K3) lagen die
Schranken nach Zug 100 bei −49 und +84, nach Zug 200 bei −104 und +2, nach Zug 300 fielen sie mit dem Wert zusammen.

Baumwiederverwendung: Der Harness liest die Zähler der Engine (`leseWurzelWaechter`, `index.html:4564`: Suchen,
Wiederverwendungen, übernommene und verworfene Wurzelkinder) am Messcommit nicht aus. Der Befund lautet daher schon
jetzt „mit vorhandenen Dumps nicht messbar“. Eine instrumentierte Neumessung braucht eine eigene Festlegung.

## 4. Abschluss

Konfigurationen, Kommando, Auswertungscode, Job-IDs, Daten je Partie und Prüfsummen veröffentlichen: Ergebnisse als
Nachtrag in diesem Doc, Rohdaten unter `docs/daten/skalierung-heute/aufbaupruefung-<Datum>/`. K3 nur bei belegtem
Fehler im Aufbau als fehlerhaft kennzeichnen. Ohne Befund den Umfang der geprüften Fehlerquellen nennen: Teil 1a bis 1c
schließen falsche Übergabe von `mctsFixedSims`, falsche Zuordnung von Farbe und Sieger und Zustand in Klasse 4 aus,
soweit die Liste aus 1b vollständig ist; einen Fehler, der nur bei ungleichen Budgets und ohne solchen Zustand wirkt,
schließen sie nicht aus. Die Phasenanalyse dient der Hypothesenbildung. Änderungen an der Spiel-Engine sind kein
Bestandteil dieser Prüfung.

## 5. Nachtrag: Teil 1c vom 27.11.2026

**Gültig. Kein Aufbaufehler gefunden.** Workflow `k3-uebergabe.yml`, Lauf 46002282339, auf `main` (`d3a5767`,
Werkzeug aus #392), gestartet nach Hazeberrys Go um 12:52 UTC, Dauer rund 3 Minuten. Bericht im Wortlaut:
[`k3-uebergabe.md`](daten/skalierung-heute/aufbaupruefung-20261127/k3-uebergabe.md).

| Arm | Farbe | Soll | Partien | Entscheidungen | Steinzüge | davon genau Soll | Abweichungen | Pässe | Pässe mit Meldung |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | Schwarz | 2600 | 615 | 115 483 | 109 042 | 109 042 | 0 | 6 441 | 0 |
| A | Weiß | 2600 | 615 | 114 130 | 107 537 | 107 537 | 0 | 6 593 | 0 |
| B | Schwarz | 5200 | 615 | 114 437 | 106 942 | 106 942 | 0 | 7 495 | 0 |
| B | Weiß | 5200 | 615 | 115 163 | 107 157 | 107 157 | 0 | 8 006 | 0 |

Alle 123 Prüfsummen stimmen mit GitHub und mit `laeufe.csv`; Konfiguration in allen 123 Läufen wie festgelegt;
`params_hash` in allen 1230 Partien gleich; Commit und Engine-Blöcke wie am Messcommit. Die 459 213 Entscheidungen
ergeben im Mittel 373,3 je Partie, wie im K3-Bericht.

**Was das belegt:** Alle 430 678 Steinzüge suchten mit genau der Simulationszahl ihres Arms, in beiden Farben. Farbe
von A, Arm je Farbe, Siegerfarbe und die Zählung im JSON stimmen. Eine falsche Übergabe von `mctsFixedSims` und
vertauschte Arme erklären das K3-Ergebnis nicht.

**Was es nicht belegt:** gemeinsamen Zustand beider Arme im selben Prozess (Teil 1b) und ein Verhalten der Engine,
das nur bei größerem Budget auftritt. Das K3-Ergebnis bleibt offen.

**Beschreibend, ohne Deutung:** B passt häufiger als A, in beiden Farben: A 13 034 Pässe in 229 613 Entscheidungen
(5,7 %, 10,6 je Partie), B 15 501 in 229 600 (6,8 %, 12,6 je Partie). Ob das mit den Niederlagen von B zusammenhängt,
ist eine Hypothese für Teil 3.

## 6. Nachtrag: Teil 1b vom 27.11.2026

**Die Durchsicht am Messcommit ergab keinen Hinweis darauf, dass Suchzustand von einem Arm zum anderen gelangt.**
Kein Eintrag in Klasse 4. Das ist ein Befund aus dem Lesen des Codes, kein Beweis: Ein Weg, den die Durchsicht
übersehen hat, bliebe möglich. Durchsicht der Blöcke `shared-go-logic`, `worker-ai` und `policy-net` am Messcommit
`98aa1ad`, aus dem Code, ohne Lauf. Erfasst sind alle Deklarationen auf oberster Ebene mit `let` und `var`, alle
`const` mit veränderlichem Inhalt (Typed Arrays, Objekte, Arrays, Sets) und die beiden globalen Objekte `PARAMS`
und `policyNet`. Zeilen beziehen sich auf `index.html` am Messcommit.

**Klasse 1, vor Gebrauch in jedem Zug neu gesetzt oder ungültig gemacht:**

- *Arbeitsspeicher mit Epochenstempel:* `_ffVisited`/`_ffEpoch`, `_bnChainId`, `_bnRegionId`, `_bnChainMark`,
  `_bnAlive`, `_bnDead`, `_bnBornDead`/`_bnEpoch`, `_areaVisited`/`_areaEpoch`, `_tbBesucht`/`_tbStempel`,
  `_evalBoardSeen`/`_evalSeenEpoch`. Jeder Lesezugriff auf die Benson-Stempel vergleicht mit der Epoche, die ein
  `bensonClassify` in derselben Funktion zurückgibt (Z. 627, 735, 4165, 4834, 5134, 5280); ein Stempel aus einem
  früheren Zug passt nie.
- *Puffer, die vor Gebrauch überschrieben werden:* `_groupQueue`, `_rdgChecked`, `_bnAdjTmp`, `_legalScratch`,
  `_evalScratch`, `_quickScratch`, `_rolloutScratch`, `_simScratch`, `_tsumegoScratch`, `_mctsScratch`, `_infA`,
  `_infB`, `_tbEbenen`, `_tbBrett`, `_tbAkt`, `_tbListe`, `_tbWert`, `_lsWurzel`, `_lsNb`, `_geA`, `_geB`,
  `_gzScratch`, `_raumK3`, `_raumBrett`, `_raA`, `_raB`, `_raInKette`, `_raGesehen`, `_raScratch`, `_krisenFlag`,
  `_krisenGesehen`, `_vzScratch`, `_puBrett`, `_puProbe`, `_ggScratch`, `_enPuffer`.
- *Caches an der Wurzel:* `_areaCache…` wird in jedem Zug an der Wurzel gefüllt (Z. 5325) und vor der Suche
  ungültig (Z. 5421); `_tbBilanz`/`_tbValid` ebenso (Z. 5327, ungültig Z. 5434 oder 5468), `_lsBasis…` mit
  (Z. 3465); `_infMap`/`_infValid` nur bei `influenceInvade`/`influenceOwn` > 0, beide 0, also nie gefüllt;
  `_raumValid`/`_raumKetten` nur bei `raumGewicht`/`raumZug` > 0, beide 0, und dann in jedem Zug neu (Z. 5328);
  `_crisisOwn`/`_crisisOpp` leert `buildCrisisMap` vor jedem Füllen (Z. 3702).
- *Je Aufruf gesetzt:* `_lastMoveIdx` (Z. 5269, aus dem Argument), `_kandOrakel`/`_kandProt`, `_mctsNonFinite`.
- *PARAMS:* setzt der Harness vor jedem Zug vollständig aus `PARAMS_DEFAULT` und dem Arm (`ab-harness.js:1104`);
  `PARAMS_DEFAULT` ist eingefroren.
- *Unverändert nach dem Laden:* `NEIGHBORS`, `ZOBRIST_LO`/`_HI`, `HOSHI_…`, die Tabellen (`MUSTER_TABELLE`,
  `RAUM_RISIKO`, `OPEN_LINIE`, `MID_LINIE`, `PHASE_SPAN`, `GEBIET_FREIHEIT`, `STERBE_RAMPE`, `_MU_…`),
  `ENDSPIEL_NETZ`/`_enNetz`, `_emptyHashes` (nur gelesen), `_lebensUrteil` (bleibt null; gesetzt nur über
  `setzeLebensurteil`, das der Harness nicht aufruft).
- *policyNet:* Gewichte unverändert (kein Training im Lauf), `gamesPlayed` 0, also `blendWeight` 0: die Priors
  werden je Zug neu gerechnet, gehen aber nicht in die Zugwahl ein (Z. 5400ff.).

**Klasse 2, Zähler und Wächter ohne Wirkung auf die Zugwahl:** `_bodenGriff`, `_letzterFaktor`/`_letztesArgument`,
`_atari…`, `_druck…`, `_augen…`, `_sunk…`, `_deckel…`, `_tr…`, `_raumGriff`, `_wurzelSuchen`/`…Wieder`/
`…Uebernommen`/`…Verworfen`, `_aufgabeQRufe`/`…GebietBlock`/`…MaxLuecke`, `_zeit`.

**Klasse 3, je Farbe getrennt:** `_mctsSavedRoot`, `_hopelessStreak`, `_allDeadStreak`, `_lastMsPerSim` und
`_krisenDauer` tauscht der Harness je Farbe und Partie (`ab-harness.js:1124–1136`, zurück ab `:1205`);
`_enEigen` führt die Engine selbst je Farbe und liest es nur, wenn der eigene Zug genau zwei Züge zurückliegt
(Z. 5192), also nie über eine Partiegrenze.

**Klasse 4:** kein Eintrag.

**Nicht Zustand der Suche, aber geteilt:** der Zufallsstrom. Beide Arme ziehen aus demselben seedabhängigen Strom
(`ab-harness.js:833`), und wie viel ein Zug verbraucht, hängt an der Suche. Das ist so gebaut und trägt keine
Suchergebnisse von einem Arm zum anderen; dass ein Arm dadurch systematisch bevorzugt wird, ist nicht zu erkennen.

**Umfang:** Teil 1c schließt an den Daten aus, dass `mctsFixedSims` falsch übergeben wurde oder die Arme vertauscht
sind. Teil 1b ergab keinen Hinweis darauf, dass Suchzustand von einem Arm zum anderen gelangt; gemessen ist das nicht.
Nicht ausgeschlossen ist ein Verhalten der Engine, das erst bei größerem Budget auftritt. Damit ist das K3-Ergebnis nach §5.3 nicht als Aufbaufehler gekennzeichnet; die
Deutung bleibt offen und ist Gegenstand von Teil 3.
