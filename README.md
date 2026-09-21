# Go — 19×19 im Browser, mit messbarer KI

Ein vollständiges Go-Spiel in einer einzigen HTML-Datei. Keine Abhängigkeiten,
kein Build, kein Server: `index.html` im Browser öffnen und spielen. Die KI
läuft als Monte-Carlo-Baumsuche in einem Web Worker.

Der zweite Teil des Projekts ist ein Messrahmen. Jede Aussage über die
Spielstärke in diesem README stammt aus gepaarten Selbstspiel-Läufen mit
Signifikanztest, nicht aus dem Eindruck beim Spielen.

## Spielen

`index.html` öffnen — lokal per Doppelklick oder über GitHub Pages. Es gibt
nichts zu installieren.

- 19×19, Komi 7.5, Superko-Regel
- Drei Schwierigkeitsgrade: Leicht, Mittel, Schwer
- Wertung wahlweise **Area** (chinesisch) oder **Territory** (japanisch)
- SGF-Export, Zug-Log, Bug-Report-Export als JSON
- Parameter-Dashboard: alle KI-Parameter live verstellbar, speicherbar im
  `localStorage`

## Stand: was funktioniert, was offen ist

**Funktioniert und ist gemessen:**

- MCTS mit PUCT, RAVE/AMAF und Baum-Wiederverwendung
- Bensons Algorithmus für bedingungslos lebende Gruppen — bewiesen, nicht
  geschätzt, und damit die einzige Schicht, die nicht heuristisch ist
- Aufgabe bei aussichtsloser Stellung, sowohl über Q als auch strukturell
  („alle legalen Züge wären todgeboren")
- Worker-Fallback-Kette `data:` → `blob:` → Hauptthread, damit die KI auch
  unter `file://` läuft, wo der Origin `null` ist

**Bekannte Grenzen, gemessen statt vermutet:**

- **Der Suchmechanismus ist nur teilweise verstanden.** `mctsValueScale` ist
  belegt der wichtigste Parameter, *warum* er wirkt, ist offen (siehe unten).
- **Die Phasengrenze liegt nicht dort, wo der Parameter sagt.** `openingMoves`
  steht auf 20, aber der Eröffnungs-Experte regiert effektiv nur etwa 15 Züge:
  Der Blend mittelt Rohwerte, und `evalMidgame` hat die rund zehnfach größere
  Entscheidungsspanne. Am nominellen 50/50-Punkt trägt es bereits 81 % der
  Varianz. Ob das schädlich ist, ist offen — ein Normierungsversuch hat nicht
  geholfen.
- **Lange Partien.** Ohne Aufgabelogik laufen Selbstspiel-Partien regelmäßig
  auf 400+ Züge, der erste Pass fällt im Mittel um Zug 390.
- **Die Zeitsteuerung ist Wall-Clock.** Auf langsamer Hardware sinkt die Zahl
  der Simulationen pro Zug und damit die Spielstärke. Ein fester Seed macht
  Läufe deshalb **nicht** reproduzierbar.
- **Das Policy-Netz lernt, aber zu wenig, um zu helfen.** Ein kleines
  Dense-Netz (3971→128→361) kann Wurzelzüge mitgewichten. Bis August 2026 war
  es doppelt tot: im Messrahmen gar nicht vorhanden, und im Spiel in einem
  geschlossenen Kreis gefangen, der `gamesPlayed` nie über 0 kommen ließ — es
  hat also nie gelernt, bei niemandem. Beides ist behoben. Danach gemessen:
  Distillation auf den Suchzug verbessert den mittleren Rang repliziert über
  vier Initialisierungen (111,7 → 90,3 bei Zufallserwartung 101,3), aber die
  Trefferquote im Kopf der Verteilung bleibt auf Zufallsniveau — der Suchzug
  landet nie auf Rang 1. Für PUCT zählt nur der Kopf. `netMaxBlend` steht
  deshalb auf 0: das Netz lernt mit, steuert aber nicht.

  Der Nachfolgeversuch, überwacht aus KataGo-Partien zu lernen
  ([`distillation/`](distillation/)), hebt den Kopf erstmals **über**
  Zufallsniveau — Top-1 1,2 %, Top-10 7,8 % gegen 0,28 % / 2,77 % bei Zufall —
  und gewinnt trotzdem in keinem A/B: 35,0 % über 120 gepaarte Partien bei
  `netScoreScale` 5000 (p = 0,003). Diese Skala ist **gemessen** kommensurabel
  — der Netzterm liegt bei 0,4× bis 5,6× der Entscheidungsspanne von
  `evaluateMove`, die spannenkalibrierten Werte streuen um Median 3841. Ein
  Gegentest mit 800 kam auf 41,7 %, schaltete das Netz dabei aber weitgehend ab
  (0,06×–0,35×) und belegt daher keine Neutralität. `netMaxBlend` bleibt 0.

  Kalibrierung ist als Erklärung **erschöpft**. Über eine 250-fache
  Skalenspanne ergibt sich eine monotone Dosis-Wirkungs-Kurve, die von unten
  gegen 50 % läuft: 35,0 % (Skala 5000), 41,7 % (800), 46,7 % (20, ab Zug 250
  auf 1000). Wäre die Skala nur falsch eingestellt, müsste eine Zwischendosis
  über 50 % schießen — keine tut es, und das beste Ergebnis ist dasjenige, bei
  dem das Netz fast nichts tut. Der Engpass ist die Kopfgüte: der Abstand
  zwischen bestem und zweitbestem Heuristikzug ist in Eröffnung und Mittelspiel
  praktisch null (Gap 0,0–0,5 bei einer Spanne von 45–236), dort entscheidet
  der Prior bei jeder Skala — und ein Netz mit Top-1 1,2 % bringt dort fast
  Zufall ein.

  Und die Kopfgüte hängt an der **Datenmenge**, nicht an Kapazität oder
  Merkmalsform: 554 985 Parameter auf 56 363 Beispiele waren 9,8×
  überparametrisiert. Eine Datenmengen-Kurve bei identischem Testsatz steigt
  monoton und ohne Plateau — Top-1 0,37 % → 0,99 % und Top-10 3,77 % → 8,24 %
  (Mittel über die letzten zehn Epochen, Endpunkte rund 4 SD getrennt)
  über 15 k bis 120 k Zeilen, wobei der Trainingsverlust dabei von 2,43 auf
  4,21 *steigt*: das Netz verlässt den Memorierbereich. Benutzt wurden bisher
  vier `val/`-Shards mit zusammen 61 363 Zeilen; verfügbar sind **8160
  `train/`-Shards**, und die sind 22,7× größer (348 571 nutzbare Zeilen gegen
  15 388) — hochgerechnet von einem gemessenen train-Shard rund 2,8 Milliarden
  Stellungen, von denen der Referenzlauf **0,002 %** gesehen hat. Die höchste
  Hebelwirkung liegt damit in der Datenpipeline, und dort im **Durchsatz**,
  nicht in der Verfügbarkeit: dicht gespeichert wären das 45 TB, sparse noch
  7–13 TB. Streaming ist der einzige Weg für den vollen Bestand, sparse das
  RAM-Format für den Arbeitsausschnitt. Ob all das der Spielstärke hilft, ist
  **nicht** gemessen.

## Architektur

Eine Datei, drei Skriptblöcke — bewusst so, damit die Engine ohne Build-Schritt
im Browser *und* im Messrahmen identisch läuft:

| Block | Inhalt |
|---|---|
| `<script id="shared-go-logic">` | Regeln, Zobrist-Hashing, Freiheiten, Benson — DOM-frei |
| `<script id="worker-ai">` | MCTS, Bewertungsfunktionen, Rollouts — DOM-frei |
| `<script id="policy-net">` | Policy-Netz: Features, Forward, REINFORCE-Training |
| Haupt-Skript | UI, Rendering, Worker-Verwaltung, Dashboard |

Alle drei ID-Blöcke werden vom Messrahmen zur Laufzeit aus der `index.html`
extrahiert. Es gibt also **kein Code-Duplikat**: Gemessen wird exakt der Stand,
der auch im Browser läuft. Die ersten beiden Blöcke sind DOM-frei; `policy-net`
fasst `localStorage` und `document.getElementById` an und bekommt beide vom
Messrahmen als Schale gestellt, statt im Code zu verzweigen.

### Bewertung

Ein Mixture-of-Experts über die Partiephasen — `evalOpening`, `evalMidgame`,
`evalEndgame`, `evalTsumego`, `evalNakade` — mit weichem Übergang zwischen den
Phasen. Darüber liegt Benson als beweisbare Schicht: Was als bedingungslos
lebend erkannt ist, wird nicht mehr heuristisch bewertet.

## Messen

`ab-harness.js` spielt gepaarte Selbstspiel-Partien und vergleicht zwei
Parametersätze.

```bash
node ab-harness.js --paired 30 --seed 2026 --budget 250 \
  --A mctsValueScale=200 --B mctsValueScale=350 --json lauf.json
```

**Gepaart** heißt: Beide Partien eines Paares starten aus derselben neutralen
Eröffnung, danach werden die Farben getauscht. Paare, in denen der Sieger
wechselt, tragen den Parametereffekt; Paare, in denen dieselbe Farbe zweimal
gewinnt, den Farbeffekt. Das trennt beides bei einem Bruchteil der Partienzahl.

Phasenabhängige Parameter für Mechanismus-Tests:

```bash
--B mctsValueScale=200,mctsValueScale@200=1000   # ab Zug 200 umschalten
```

In CI läuft derselbe Harness über
[`.github/workflows/ab-harness.yml`](.github/workflows/ab-harness.yml),
manuell startbar mit Feldern für Partienzahl, Seed, Paarmodus und beide
Parametersätze. Jeder Lauf archiviert Rohdaten, Log **und Hardware-Kontext** —
Letzteres, weil GitHubs Runner unterschiedlich schnell sind und die
Simulationszahl pro Zug direkt an der Rechenleistung hängt.

## Belegte Ergebnisse

| Befund | Messung | Konsequenz |
|---|---|---|
| `mctsValueScale` 200 statt 350 | 65:35 über 100 gepaarte Partien, p = 0,0035 | **eingebaut** (≈ +108 Elo) |
| Kurve 100/150/200/250/300/500/1000 | Plateau bei 150–250, Abfall zu beiden Seiten | Mitte des Plateaus gewählt, nicht der Höchstwert |
| `resignQ` 0,95 gegen 0,997 | 29:31 über 60 Partien, p = 0,90 | 0,95 bleibt — rechtzeitiges Aufgeben kostet nichts |
| Phasentausch früh/spät | +12,5 gegen +5,0 Prozentpunkte, Differenz 3 Partien | **nicht entschieden** — Mechanismus offen |
| `openContactResponse` (neuer Term in `evalOpening`) | 48,8 % über 80 Partien, p = 0,91 | verworfen — Default 0 |
| `phaseNormalize` (Experten vor dem Blend normieren) | 42,5 % über 80 Partien, p = 0,22 | verworfen — Default 0 |
| `rolloutSample`, `evaluateMove`-Expansion, FPU-Vorzeichen | 60 %, 61 %, ±0,005 ΔQ | abgelehnt bzw. ohne Stärkeeffekt eingebaut |
| Policy-Netz, Rang des Suchzugs | 4 von 4 Initialisierungen besser (111,7 → 90,3), Top-10 aber auf Zufallsniveau | `netMaxBlend` bleibt 0 — kein A/B, es gibt nichts zu blenden |
| KataGo-Distillation, `netMaxBlend` 0,30 gegen 0 | vier Läufe über 250-fache Skalenspanne, monoton von unten gegen 50 %: 35,0 % (5000, p = 0,003), 41,7 % (800), 46,7 % (20→1000, p = 0,82) | verworfen — `netMaxBlend` bleibt 0. Keine Dosis über 50 %, also **kein** Kalibrierungsproblem; Engpass ist die Kopfgüte |
| Entscheidungsspanne von `evaluateMove`, gemessen | Spanne zum Median 45–1206, Gap zum Zweitbesten aber 0,0–0,5 in Eröffnung und Mittelspiel | Jeder Prior kippt dort die Zugwahl, unabhängig von `netScoreScale` — Kalibrierung allein kann das nicht steuern |

Zwei der Nullergebnisse sind **gehaltvoll, nicht leer**: Bei beiden ist per
Verhaltensmessung belegt, dass der Parameter die Zugwahl ändert — bei
`openContactResponse` steigen die lokalen Antworten von Rang 20 auf 4. Die
Engine spielt also nachweislich anders und gewinnt dadurch nicht.

Die vollständigen Zahlen samt Vorbehalten stehen im Kopfkommentar von
[`ab-harness.js`](ab-harness.js).

### Gemessen heißt nicht wirksam: gespeicherte Parameter überschreiben jeden Default

Ein exportierter Spielstand vom 18.08.2026 (Zug 204, Stufe „hard") zeigt die
Grenze dieser ganzen Messreihe. Die Partie lief mit:

| Parameter | Default im Repo | im Spiel | Messlage |
|---|---|---|---|
| `mctsValueScale` | 200 | **350** | 200 schlägt 350 mit 65:35, p = 0,0035 (≈ +108 Elo) |
| `netMaxBlend` | 0,00 | **0,3** | 0,3 verliert mit 35 % über 120 Partien, p = 0,003 |
| `resignQ` | 0,95 | **0,9** | — |

Beide belegten Verschlechterungen waren gleichzeitig aktiv. Die KI spielte
also gegen zwei selbst gemessene Handicaps, und keine Analyse ihres
Zugverhaltens ist ohne diesen Hinweis interpretierbar.

**Der Mechanismus ist strukturell, kein Bedienfehler.** `dashSave` legt mit
`JSON.stringify(PARAMS)` den **vollständigen** Parametersatz unter
`localStorage['go_params']` ab (`index.html:3669`), und beim Start übernimmt
`dashLoadSaved` **jeden** Schlüssel daraus, der in `PARAMS_DEFAULT` vorkommt
und eine endliche Zahl ist (`index.html:3689`). Der Speichern-Knopf ist dabei
völlig legitim bedient — die Semantik dahinter ist das Problem: gespeichert
wird nicht „was ich geändert habe", sondern „der gesamte Stand von damals".
Wer einmal
gespeichert hat, friert alle Defaults ein — jede spätere Messung erreicht
diesen Browser nie, ohne Versionsstempel und ohne sichtbare Warnung.

Naheliegende Abhilfe, ungetestet: nur Abweichungen sichern
(`PARAMS[k] !== PARAMS_DEFAULT[k]`), dann wandern neue Defaults automatisch
mit und bewusste Abweichungen bleiben trotzdem erhalten. Bis dahin gilt:
`dashReset` (`index.html:3697`) löscht den Speicher und stellt die gemessenen
Werte wieder her.

### Divergierendes Training, NaN-Priors, toter PUCT-Knoten

Derselbe Speicher-Mechanismus hat einen zweiten Fehler sichtbar gemacht. Ein
Bug-Report mit `netMaxBlend: 0,09` (Default im Repo: 0) meldete ab dem ersten
KI-Zug einen `TypeError: Cannot read properties of null (reading 'idx')` in
`mctsPUCT` — im Worker **und** im synchronen Fallback, also bei jedem Zug.

Die Kette, von hinten aufgerollt:

1. **REINFORCE hier divergiert.** Bei negativem Advantage maximiert der
   Schritt `−log p(a)`; das hat kein Optimum, denn `p(a) → 0` erreicht man nur
   mit `‖W‖ → ∞`. Der Gradient des gespielten Zuges ist `(1−p)·|lr|` und
   schrumpft dabei *nicht*. Daraus wird eine Rückkopplung: größeres `W1` →
   größere Aktivierungen → größere `W2`-Updates (`dL·hidden`) → größeres `dH`
   → größeres `W1`. Gemessen an einem Repro über den `policy-net`-Block
   (400 Züge/Partie): in **5 von 6 Läufen nicht-finite Float32-Gewichte binnen
   30 Partien**, `|W2|` zuletzt Faktor ~10 pro Partie.
2. **`save()` machte es dauerhaft.** Die NaN-Gewichte gingen ungeprüft nach
   `localStorage['go_pnet']` und wurden beim nächsten Start ebenso ungeprüft
   geladen. Kein Reload heilte das.
3. **`forward()` gab NaN aus.** Sobald die Logits die Float32-Grenze reißen,
   ist `logits[k] − maxL` gleich `Inf − Inf` = `NaN` — und damit *jede*
   Wahrscheinlichkeit.
4. **Ein einzelnes NaN vergiftete den ganzen Knoten.** Über den Score-Blend
   (`(1−bw)·MoE + bw·Prior·scale`) landete es in `_mctsKids`, wo `Z = Σ w`
   zu `NaN` wird und damit `P[r] = w[r]/Z` für **alle** Kinder.
5. **PUCT stand ohne Kandidat da.** `NaN > -Infinity` ist `false`, also blieb
   `best` auf `null` — und die nächste Zeile las `best.idx`.

Behoben auf beiden Ebenen. Verteidigung: `_mctsKids` bildet Spannweite und
Summe nur über finite Scores und fällt bei entarteter Softmax auf den
Rang-Prior zurück; die PUCT-Auswahl vergleicht nur finite Scores und hat einen
Fallback; der Score-Blend überspringt nicht-finite Priors; `forward()` liefert
im Fehlerfall eine Gleichverteilung und zieht über `_healthy` den Blend
sofort auf 0. Ursache: `netGradClip` (elementweise **und** über die
Update-Norm), `netWeightDecay`, `netMaxNorm` (Max-Norm-Projektion je Schicht
als Vielfaches der Init-Norm) und eine Dämpfung des negativen Advantage
unterhalb von `1/361` — dort ist nichts mehr zu verlernen. Dazu Prüfungen vor
jedem `save()`, beim `load()` (Selbstheilung für bereits vergiftete Browser)
und ein Rollback auf den letzten gültigen Stand nach jeder Partie.

Belege aus dem Repro über die ausgeschnittenen Skript-Blöcke:

| Messung | vorher | nachher |
|---|---|---|
| Ein NaN unter 8 Wurzel-Scores | 8 von 8 Priors `NaN` | 0 von 8, Summe 1,000 |
| `mctsPUCT` mit reiner NaN-Wurzelliste | `TypeError … 'idx'` | 482 Sims, Zug geliefert |
| Vergiftete `go_pnet` (NaN) geladen | Crash bei jedem KI-Zug | verworfen, Netz startet frisch |
| Vergiftete `go_pnet` (endlich, 1e20) | Crash bei jedem KI-Zug | Netz meldet sich ab, Partie läuft |
| 40 Trainingspartien, reines Rauschen | nicht-finite Gewichte | `‖W1‖` 9,20 → 7,92, nie `NaN` |
| 24 Trainingspartien im Harness | — | `‖W1‖` 8,91 / `‖W2‖` 14,92, Projektion greift nie |
| `_mctsKids` bei finiten Scores | — | 94 212 Priors bitgleich zu vorher |

`dashReset` setzt `netMaxBlend` auf 0 zurück und umgeht den Pfad damit — das
war der Workaround, nicht der Fix.

Gegen Rückfall abgesichert in [`tests/`](tests/): 37 Fälle in sechs Dateien,
drei davon im echten Browser mit Web Worker. Am Stand vor dem Fix fallen
16 davon durch — die übrigen prüfen bewusst unverändertes Verhalten und
müssen auf beiden Ständen halten.

### Die KI gab in ausgeglichener Stellung auf — widerlegt am 21.09.

> **Dieser Abschnitt stand zehn Monate lang falsch hier.** Die Stellungen
> waren nicht ausgeglichen; die KI lag in allen vier Fällen zurück. Die
> ursprüngliche Fassung bleibt stehen, die Korrektur folgt darunter — sonst
> ist nicht nachvollziehbar, was behauptet und was widerrufen wurde.

Elf exportierte Partien vom 29.08. — vier auf „schwer", sieben auf „einfach",
alle verloren. Die sieben Easy-Niederlagen sind echt: rund 100 Gebietspunkte
Rückstand, ausgespielt bis zum Ende. Die vier Hard-Partien nicht.

Dort gab die KI jedes Mal auf (`RE[B+R]`). Das Gebiet zum Zeitpunkt der
Aufgabe, mit der Engine nachgerechnet und gegen `finalAreaScore` geprüft:

| Partie | Gebiet KI | Mensch | mit Komi | Differenz |
|---|---|---|---|---|
| 197 Züge | 104 | 98 | 111,5 | **+13,5** |
| 269 Züge | 139 | 150 | 146,5 | −3,5 |
| 249 Züge | 125 | 138 | 132,5 | −5,5 |
| 305 Züge | 170 | 173 | 177,5 | **+4,5** |

In zwei von vier Partien gab sie aus einer Führung heraus auf. Die Aufgaben
waren dabei intern korrekt — `Q ≤ −0,95`, die Schwelle war gerissen. Nur sagt
Q nichts über den Spielstand: es kommt aus `tanh(evaluateBoard/200)`, und
`evaluateBoard` wird vom Gefangenen-Term beherrscht. Die KI hatte 20–27 Steine
verloren; der Term `(cap[eigen] − cap[fremd]) · 20` lag bei −380 bis −540 und
machte **92–105 % der gesamten Bewertung** aus. Ohne ihn liegt `evaluateBoard`
bei −35 bis +25, also ausgeglichen und in Übereinstimmung mit `estimateArea`.

Strukturell doppelt gezählt: ein Stein auf dem Brett zählt in derselben
Funktion `size·5 + libs·3`, also rund 5–8. Wird er gefangen, verschwindet er
aus dieser Summe **und** schlägt zusätzlich mit 20 zu Buche.

#### Die Korrektur (21.09.): die Gegenprobe war blind

Nach der [`estimateArea`-Korrektur](#estimatearea-taugt-nicht-als-maßstab-für-wer-liegt-vorn)
blieb hier offen, ob diese vier Partien betroffen sind. Sie sind es.

Der Satz oben — „mit der Engine nachgerechnet und gegen `finalAreaScore`
geprüft" — klingt nach einer unabhängigen Gegenprobe. Das Skript von damals
zeigt, dass es keine war: es enthält eine eigene Nachbildung von
`finalAreaScore`, die Steine und umschlossenes Gebiet zählt, **aber
`resolveLifeAndDeath` nie aufruft**. Sie hat also denselben blinden Fleck wie
`estimateArea`. Die Spalte „gleich? ja" bestätigte nur, dass zwei Maßstäbe mit
demselben Fehler denselben Wert liefern.

Nachgemessen mit drei Lesarten derselben Stellung — aus Sicht der KI (Weiß),
Komi eingerechnet, negativ heißt Rückstand:

| Partie | roh (= der alte Maßstab) | nur Benson-**bewiesen** tot | volle Schlussauswertung |
|---|---:|---:|---:|
| 197 Züge | **+13,5** | +13,5 (0 Steine) | −14,5 (8) |
| 249 Züge | −5,5 | −5,5 (0) | −44,5 (14) |
| 269 Züge | −3,5 | −3,5 (0) | −56,5 (21) |
| 305 Züge | **+4,5** | **−19,5 (5)** | −19,5 (6) |

Die mittlere Spalte entfernt nur, was nach Benson **beweisbar** tot ist — keine
Heuristik, kein Ermessen. Die rechte nutzt zusätzlich die Augen/Freiheiten-
Heuristik, die für die Schlussstellung gedacht ist.

Der Vorwurf lautete: „in zwei von vier Partien gab sie aus einer Führung heraus
auf". Gemeint waren die Partien mit 197 und 305 Zügen. Beide fallen:

* **305 Züge — beweisbar.** Fünf weiße Steine sind Benson-tot. Allein sie zu
  entfernen kippt +4,5 auf −19,5. Hier braucht es keine Heuristik.
* **197 Züge — nur unter der Endstellungs-Lesart.** Benson beweist hier nichts;
  die acht toten Steine sind samt und sonders Heuristik-Urteile. Das „+13,5"
  übersteht also die exakte Prüfung.

**Vorbehalt, der hier wirklich zählt:** diese Partien endeten durch Aufgabe,
nicht durch zweimaliges Passen. `resolveLifeAndDeath` ist für die
Schlussstellung gebaut; bei Zug 197 kann die Heuristik Gruppen totsagen, die
noch laufen könnten. Die beiden Maßstäbe sind **gegenläufig verzerrt** — der
rohe zugunsten dessen, der todgeweihte Gruppen hält, der volle zulasten dessen,
der schwache, aber kämpfende Gruppen hält. Die Wahrheit liegt dazwischen.
Deshalb die Spanne statt einer Zahl, und deshalb die Benson-Spalte.

Was die Spanne in jedem Fall hergibt: in **keiner** der vier Partien ist die
Lesart „die KI liegt komfortabel vorn" haltbar, und in dreien lag sie unter
jeder Lesart zurück. Die Aufgaben waren nicht die Fehlalarme, für die ich sie
gehalten habe.

Auffällig ist noch, wem die toten Steine gehören: 8:0, 12:2, 20:1 und 5:1 zu
Lasten von Weiß — verstreute Einzelsteine tief in Schwarz' Gebiet. Das ist das
Bild einer KI, die Steine ins gegnerische Gebiet streut, nicht das einer, die
knapp vorn liegt.

#### Das Gewicht zu senken hilft nicht — gemessen

Naheliegend wäre, `captureWeight` kleiner zu setzen. Drei gepaarte A/B-Läufe
zu je 40 Partien (Seed 2026, Sims/Zug zwischen A und B abgeglichen):

| A | B | Siegrate A:B | B-Anteil | p | Aufgaben A:B | p |
|---|---|---|---|---|---|---|
| 20 | 5 | 19 : 21 | 52,5 % | 0,88 | 19 : 7 | 0,029 |
| 20 | 10 | 16 : 24 | 60,0 % | 0,27 | 20 : 9 | 0,061 |
| 20 | 0 | 15 : 25 | 62,5 % | 0,15 | **14 : 1** | **0,001** |

Der Effekt auf die **Aufgabequote** ist stark und monoton, der auf die
**Siegrate** in keiner Dosis signifikant — und nicht einmal monoton. Das
Gewicht treibt also das Aufgabeverhalten, nicht die Spielstärke. `captureWeight`
bleibt deshalb bei 20; es zu senken wäre ein Eingriff in die gesamte Suche für
einen unbewiesenen Nutzen.

Nebenbefund derselben Messung: die vielen Aufgaben kosten im Selbstspiel kaum
Partien. Die KI gibt zu früh auf, aber meist in Stellungen, die sie ohnehin
verloren hätte. Gegen einen Menschen kann das anders aussehen — der Harness
misst KI gegen KI und sagt dazu nichts.

#### Behoben wurde stattdessen das Kriterium — auf falscher Grundlage

`resignAreaMargin` (damaliger Default 30, heute `-1` — siehe Korrektur unten)
verlangte, dass **auch** die Gebietsschätzung
verloren sagt. `estimateArea` ist dafür kein neuer willkürlicher Maßstab: auf
allen vier Stellungen liefert es exakt dasselbe wie `finalAreaScore`, also die
Endabrechnung des Spiels. Die vier Rückstände lagen bei −6, +3, +11 und +13
Punkten; ab Marge 14 wären alle vier verhindert, 30 lässt Luft. Bei echtem
Rückstand wird weiterhin aufgegeben.

Bewusste Unschärfe: Komi 7,5 fließt nicht ein — die Engine ist komi-blind, und
den Worker dafür an den Zählmodus zu koppeln wäre der teurere Fehler. Weiß gibt
dadurch um 7,5 Punkte zu früh auf, Schwarz ebenso viel zu spät.

> **Korrektur (21.09.).** Der Satz „liefert exakt dasselbe wie
> `finalAreaScore`" ist der tragende Teil dieser Begründung, und er ist falsch.
> Verglichen wurde gegen eine Nachbildung ohne `resolveLifeAndDeath` (siehe
> [oben](#die-korrektur-2109-die-gegenprobe-war-blind)). Gegen die echte
> Endabrechnung weichen alle vier Stellungen ab, um 6 bis 53 Punkte.
>
> Damit fällt der Anlass: die vier Aufgaben waren keine Fehlalarme. Gemessen
> am heutigen Default **blockiert Marge 30 alle vier** — also genau die
> Aufgaben, die richtig waren. Der Parameter unterdrückt, wofür er gebaut
> wurde.
>
> Die Gegenprobe, die weiterhin trägt: bei den sieben Easy-Niederlagen sind
> roher und echter Maßstab identisch (kein einziger toter Stein), die
> Rückstände liegen bei 47 bis 153 Punkten, und Marge 30 lässt dort jede
> Aufgabe zu. Das Kriterium schadet also nicht überall — es stützt sich nur
> auf einen Befund, den es nicht gibt.
>
> **Gemessen und abgeschaltet (21.09.).** Die Dosisreihe steht
> [weiter unten](#resignareamargin-stark-wirksam-ohne-messbare-folge): der
> Parameter greift hart, kostet aber keine messbare Spielstärke — und ihn zu
> entfernen ebenfalls nicht. Entschieden hat deshalb nicht die Messung, sondern
> der widerlegte Anlass. **Default jetzt `-1`, das Kriterium ist aus;** Q allein
> entscheidet wieder über die Aufgabe.

**Fürs Auswerten von Spielständen:** `reproduktion.board` ist die Stellung
**vor** dem letzten KI-Zug — es ist die Eingabe, mit der die KI gerechnet hat
(`mc`, `lastMove` und `aiColor` passen dazu). `meta.zug` und die ASCII-Anzeige
`brett` zeigen dagegen die Stellung danach. Beide sind korrekt, aber sie
liegen einen Zug auseinander.

### Randspiel im Mittelspiel: Diagnose bestätigt, Therapie widerlegt

Die KI spielt im Mittelspiel deutlich zu oft am Rand. Nach dominierendem
Experten gebucketet (fünf Hard-Partien, alle `RE[B+R]`, also von der KI
aufgegeben):

| Experte | Stellungen | Zugbereich | verfügbar | Heuristik Top-1 | KI gespielt | Mensch |
|---|---:|---:|---:|---:|---:|---:|
| `evalOpening` | 45 | 2–18 | 39 % | 0 % | 0 % | 0 % |
| `evalMidgame` | 150 | 20–78 | 39 % | 58 % | 68 % | 17 % |
| `evalEndgame` | 476 | 80–326 | 42 % | 53 % | 42 % | 29 % |

„Verfügbar" ist der Anteil der legalen Züge auf Linie 1-2 — die Nulllinie.
Eröffnung und Endspiel sind unauffällig; die Lücke sitzt allein im Mittelspiel.

**Warnung zur Methode:** Ein Bucket nach Zugnummer misst hier falsch. Bei
`openingMoves 20` und `endgameMoves 80` spannt „Zug 51–150" über zwei Experten.
Dieser Fehler ist in diesem Projekt zweimal passiert und hat jedes Mal eine
falsche Zuordnung erzeugt. Nach Phasengewicht bucketen, nicht nach Zugnummer.

`evalMidgame` hat keinen Positionsterm. Die Ablation aller `mid*`-Parameter
zeigt `midLibBonus` als Treiber: auf 0 gesetzt fällt der Anteil Top-1 auf
Linie 1-2 von 60 % auf 17 %. Ursache ist, dass `lib` die Freiheitszahl der
entstehenden **Gruppe** ist — ein Zug an eine bestehende Kette erbt deren
Freiheiten, und Freiheiten sind dort am billigsten, wo niemand widerspricht.

#### Den Term zu deckeln hilft nicht — gemessen

`midLibCap` deckelt `lib` wie `midExtBonus` es mit `Math.min(ext, 12)` tut.
A/B gegen Default 99, je eigener Kontrollarm, 250 ms/Zug, Farbwechsel:

| `midLibCap` | 12 | 8 | 6 | 4 | gepoolt |
|---|---:|---:|---:|---:|---:|
| Partien | 15 | 14 | 13 | 14 | 56 |
| Siegrate des Deckels | 20 % | 29 % | 31 % | 14 % | **23 %** |

Exakter Binomialtest einseitig p = 3,7 · 10⁻⁵; Simulationen pro Zug in jedem
Lauf gleich. Der Schaden zeigt **keine Dosis-Abstufung**: `cap=12` greift nur
bei 4,8 % der Kandidatenzüge und kostet trotzdem rund 30 Punkte Siegrate. Die
seltenen Stellungen mit über zwölf Gruppenfreiheiten sind die entscheidenden —
der Term trägt Randanreiz **und** Kampfbewertung, und ein harter Schnitt trifft
beide. Der Parameter bleibt mit Default 99 als Negativbefund stehen.

Zwei Nachprüfungen, weil beide den Befund hätten kippen können:

**Misst die Siegrate den Resign-Detektor?** 41 der 56 Partien endeten durch
Aufgabe, 38 davon durch die gedeckelte Seite. Test über den mitgeschriebenen
Gebietsstand bei Partieende: in **38 von 38** Fällen lag die aufgebende Seite
tatsächlich hinten, im Mittel 76 Punkte. Die Aufgaben waren berechtigt, die
Siegrate misst nicht den Detektor.

**Der Mechanismus, bestätigt.** Bestätigungslauf über GitHub Actions (Lauf 23,
30 Partien, Seed 4711, A = 999 als beweisbar neutraler Kontrollarm, B = 12,
547 gegen 546 Sims/Zug). Erlittene Schläge, gepaarter Vorzeichentest — beide
Konfigurationen ziehen in derselben Partie:

| erlittene Schläge | A (999) | B (12) | Faktor | p (einseitig) |
|---|---:|---:|---:|---:|
| Ø größter Einzelschlag | 9,4 | 17,7 | 1,88× | 3,1 · 10⁻² |
| Ø Verluste ab 5 Steinen | 1,6 | 2,3 | 1,49× | 2,2 · 10⁻² |
| Ø Steine gesamt | 23,7 | 38,7 | 1,63× | 2,6 · 10⁻³ |

Die gedeckelte Seite verliert messbar größere Gruppen. Oberhalb des Deckels ist
jede weitere Freiheit gratis, damit wird der Unterschied zwischen „atmet" und
„eingekesselt" unsichtbar. Siegrate im selben Lauf 24:6 (20 %, p = 7,2 · 10⁻⁴)
— identisch zur lokalen Messung bei `cap=12`, was zugleich zeigt, dass der
Kontrollarm 99 gegen 999 praktisch keinen Unterschied machte.

**Zurückgenommen:** aus 10 von 15 ausgezählten Partien war zunächst gelesen
worden, der Schaden sei „konzentriert, nicht flächig". Lauf 23 liefert dort 2
von 9, gepoolt 12 von 24 — eine Münze. Die Aussage war das Rauschen, das bei
ihr selbst angemerkt war.

Der Default ist **999** und damit beweisbar neutral: Freiheiten sind
verschiedene leere Punkte, also ≤ 361. Vorher stand 99 mit empirischer
Begründung — eine konstruierte Kammkette hat 162 Freiheiten, dort hätte 99
geschnitten.

#### Weiche Sättigung hilft auch nicht — und widerlegt die Erklärung

Naheliegende Antwort auf den gescheiterten Deckel: nicht abschneiden, sondern
dämpfen, damit der Grenznutzen fällt statt auf null zu springen. `midLibSoft`
tut das über eine Kniestelle — unterhalb von k exakt `lib`, oberhalb
`k + (lib−k)/(1+(lib−k)/k)`, Grenznutzen `1/(1+d/k)²`, fallend aber strikt
positiv. Statischer Randanteil des Top-1 fällt monoton: 60 % bei k=0 auf 29 %
bei k=6.

Zwei Läufe à 30 Partien, A = aus:

| Variante | Siegrate B | Ø größter Schlag A→B | p (Verlust) |
|---|---:|---:|---:|
| weich k=6 (Rand 29 %) | 5:25 = **17 %** | 7,0 → 16,0 (2,27×) | 3,0 · 10⁻⁵ |
| weich k=12 (Rand 47 %) | 5:25 = **17 %** | 7,7 → 12,4 (1,61×) | 7,2 · 10⁻⁴ |
| harter Deckel 12 (Referenz) | 6:24 = 20 % | 9,4 → 17,7 (1,88×) | 3,1 · 10⁻² |

Siegrate-p je 1,6 · 10⁻⁴. Sims/Zug in beiden Läufen gleich.

**Die Gradienten-Erklärung ist damit widerlegt.** Sie lautete: der harte Deckel
scheitert, weil er den Grenznutzen auf exakt null setzt und die KI für Leben
und Tod großer Gruppen blind macht. `k=12` hält den Grenznutzen bei 0,791 an
der Stelle 13→14 und den Bereich 1–12 exakt — und verliert genauso, mit
denselben vergrößerten Gruppenverlusten.

#### Der Kontrolltest: nicht der Betrag, sondern die Spreizung

`midLibBonus` gleichmäßig von 30 auf 20 (×0,67 — derselbe Faktor, den `k=12`
bei `lib=30` erzeugt), 30 Partien: **17:13, B-Rate 43 %, zweiseitig p = 0,59**.
Gruppenverlust 1,09–1,29× bei p ≥ 0,12. Nicht von Rauschen unterscheidbar.

Eine gleichmäßige Absenkung desselben Terms um ein Drittel ist also harmlos,
eine Kompression nur am oberen Ende kostet 30 Punkte. Beiträge zum Score
(Gewicht × f(lib)):

| lib | Basis 30×lib | uniform 20×lib | Knie k=12 (30×f) |
|---:|---:|---:|---:|
| 4 | 120 | 80 | 120 |
| 12 | 360 | 240 | 360 |
| 30 | 900 | 600 | **576** |
| 34 | 1020 | 680 | 593 |

Bei `lib=30` liegt der Knie-Beitrag mit 576 **unter** dem uniformen mit 600 —
der schädliche Eingriff hat dort den kleineren Betrag. „Absoluter Betrag bei
hohen Freiheitszahlen" ist damit als Erklärung ebenfalls widerlegt, und mit ihr
die Lesart „lokales Optimum, jede Störung kostet": die uniforme Störung trifft
jeden Zug, ist also größer, und kostet nichts.

**Was übrig bleibt und von allen drei Läufen getragen wird: die Spreizung.**
`f(30)/f(4)` ist 7,50 in der Basis, 7,50 bei uniformer Absenkung — und 4,80
beim Knie. Die Rangfolge zwischen einem Zug mit vielen und einem mit wenigen
Gruppenfreiheiten muss erhalten bleiben; das Gewicht dieser Rangfolge gegenüber
anderen Termen darf sich ändern.

Damit ist auch erklärt, warum drei Eingriffe scheitern mussten: der Randvorteil
**ist** die hohe Freiheitszahl. Jeder Eingriff, der Randspiel über diesen Term
dämpft, komprimiert notwendig dessen Spreizung. Der Freiheitsterm ist als Hebel
strukturell unbrauchbar. Was fehlt, ist ein eigener Positionsterm in
`evalMidgame` — das Gegenstück zu `openLineWeight`. Ungemessen.

### Der entkoppelte Positionsterm: erster Eingriff ohne Schaden

Nach drei gescheiterten Eingriffen am Freiheitsterm ist `midLineWeight` additiv
— ein eigener Summand, kein Faktor auf `lib`, sodass die tragende Spreizung
`f(30)/f(4) = 7,50` unberührt bleibt. `MID_LINIE` bestraft die erste Linie
voll, die zweite halb, ab der dritten neutral; kein Zentrumsbonus, damit die
Dosisreihe eindeutig bleibt.

Statischer Randanteil des Top-1 (Nulllinie 39 %, Mensch 17 %): 60 / 48 / 46 /
34 / 5 / 1 % bei Gewicht 0 / 10 / 20 / 40 / 80 / 160 — monoton, ab 80 unter der
menschlichen Rate.

Vier Läufe à 30 Partien, A = 0:

| Gewicht | A : B | B-Rate | Ø größter erlittener Schlag A → B |
|---:|---:|---:|---:|
| 20 | 12:18 | 60 % | 11,8 → 10,6 |
| 40 | 16:14 | 47 % | 12,7 → 12,3 |
| 60 | 12:18 | 60 % | 13,1 → 10,9 |
| 80 | 12:18 | 60 % | 19,1 → 10,1 |

Gepoolt **68:52 über 120 Partien, B-Rate 56,7 %**, 95 %-CI (Clopper-Pearson)
**47,3 – 65,7 %**. Sims/Zug je Lauf gleich.

**Belegt:** der Term kostet keine Spielstärke. Das CI schließt die
Größenordnung der drei gescheiterten Eingriffe aus (harter Deckel 20 %, CI
7,7–38,6; weich k=6 und k=12 je 17 %, CI 5,6–34,7). Der Gruppenverlust sinkt in
allen vier Läufen statt zu steigen — das Gegenrisiko der Vorgänger tritt nicht
auf.

**Nicht belegt:** ein Spielstärke-Gewinn. Das CI enthält 50 %, einseitig
p = 0,085, und es gibt keinen Dosis-Trend (60/47/60/60 ist flach).

#### Nachmessung auf Dosis 60: 210 Partien, Gewinn bleibt unbelegt

Sechs weitere Läufe (Seeds 7200–7205), gepoolt mit dem ersten Lauf dort.
Einzelergebnisse 60 / 50 / 53 / 47 / 57 / 50 / 57 %:

| | B : A | B-Rate | 95 %-CI | p (zweiseitig) |
|---|---:|---:|---:|---:|
| Dosis 60 (210 Partien) | 112:98 | 53,3 % | 46,3 – 60,2 % | 0,37 |
| alle Dosen (300 Partien) | 162:138 | 54,0 % | 48,2 – 59,7 % | 0,18 |

Die 60 % des ersten Laufs waren überwiegend Rauschen — genau die Regression
zur Mitte, vor der bei der Einzelzahl gewarnt war. Ein Gewinn ist damit
weiterhin **nicht belegt**.

Was 300 Partien dagegen fest machen: **der Term schadet nicht.** Das
Konfidenzintervall liegt vollständig oberhalb der drei gescheiterten Eingriffe
(harter Deckel 20 %, CI 7,7–38,6; weich k=6 und k=12 je 17 %, CI 5,6–34,7).
Der Gruppenverlust bleibt günstig: Ø größter Einzelschlag 12,4 → 10,5, B
kleiner in 111 von 205 entschiedenen Paaren (einseitig p = 0,13 — ein Trend
ohne Signifikanz, aber in keinem Fall die Verschlechterung, an der die
Vorgänger gescheitert sind).

Der Default bleibt 0. Die Frage abschließend zu entscheiden bräuchte rund
1500 Partien für einen 54-%-Effekt; das steht in keinem Verhältnis zum
erwarteten Nutzen.

### Der Sterbe-Abschlag: Ehrlichkeit ist gratis, aber sie repariert nichts

Ausgangspunkt waren zwei Partielogs, in denen große eigene Gruppen plötzlich
starben. Die Autopsie (Zug 274 der rekonstruierten Partie, alle acht
Schlagzahlen als Prüfsumme verifiziert) schloss Suchtiefe und Move-Ordering
aus: von 275 auf 20 000 Simulationen wählt die Engine denselben Zug mit
demselben Q, und die Crisis-Heuristik feuerte korrekt. Die Ursache liegt in
`evaluateBoard`, die eine 22er-Kette mit zwei Freiheiten als vollwertiges
Material zählt — mit Gruppe +78, ohne Gruppe −532.

`deathDiscount` schlägt große Gruppen mit wenigen Freiheiten ab, symmetrisch
für beide Farben, über eine Rampe 1 / 1 / 0,5 / 0,25 nach Freiheiten. Er greift
über 254 Stellungen und 4938 Gruppen bei 1,6 % — chirurgisch.

Vier Läufe à 30 Partien, A = 0, Sims/Zug paritätisch 657:657:

| Dosis | B-Siege | B-Rate | 95 %-CI | p (exakt) |
|---:|---:|---:|---:|---:|
| 0,25 | 17/30 | 56,7 % | 37,4 – 74,5 % | 0,585 |
| 0,50 | 16/30 | 53,3 % | 34,3 – 71,7 % | 0,856 |
| 0,75 | 15/30 | 50,0 % | 31,3 – 68,7 % | 1,000 |
| 1,00 | 17/30 | 56,7 % | 37,4 – 74,5 % | 0,585 |
| **gepoolt** | **65/120** | **54,2 %** | **44,8 – 63,3 %** | **0,411** |

Kein Dosis-Trend. Die vorab benannte Sorge — der Abschlag könne rettbare
Gruppen abschreiben oder die Engine beim Töten passiv machen — tritt nicht ein.
Im direkten Duell ist der zugefügte Verlust der einen Seite der erlittene der
anderen, und B fügt *mehr* zu als A (gepaart, n = 120):

| erlitten | A | B | Vorzeichentest |
|---|---:|---:|---:|
| größter Einzelschlag | 12,8 | 10,4 | 65:49, p = 0,16 |
| Gesamtverlust | 32,1 | 29,1 | 68:50, p = 0,12 |
| Schläge ab 5 Steinen | 1,85 | 1,91 | 48:49, p = 1,00 |

Aufgaben: A gibt 41× auf, B 32×, bei ähnlichem Zug (329 vs. 334) und ähnlichem
Rückstand (57 vs. 52 Punkte) — kein Frühaufgabe-Schaden.

**Belegt:** der Term macht Q ehrlich (Zug 274: +0,23 → −0,35), ohne
Spielstärke zu kosten. **Nicht belegt:** ein Gewinn.

**Was er strukturell nicht kann**, und das ist der eigentliche Befund: der
Abschlag schließt nur ~20 % der Bewertungslücke. Er kann höchstens den
Eigenwert der Gruppe entfernen (22×5 + 2×3 = 116 Punkte). Die restlichen ~490
sind der Gefangenen-Bonus, den der *Gegner* beim Schlagen erhält (22 Steine ×
`captureWeight` 20 = 440). Eine ehrliche Bewertung müsste die Gruppe
**übertragen**, nicht nur abschlagen. Default 0.

### Die Übertragung: erster Hinweis auf einen echten Gewinn

`deathTransfer` bucht den fehlenden Gefangenen-Bonus: die sterbende Gruppe
gilt anteilig als bereits geschlagen, über dieselbe Freiheiten-Rampe. Das ist
kein Gebietsterm — `evaluateBoard` benutzt `estimateArea` nicht, und die
gemessene Lücke besteht aus Material und Gefangenen, nicht aus Gebiet.

An der rekonstruierten Stellung vor Zug 274 (Zielwert −532, Basis +78):
Abschlag 1,00 allein schließt 20 %, Übertragung 1,00 allein 77 %, beide
zusammen **97 %**.

Vier Läufe à 30 Partien, A = 0, `deathDiscount` = 0, Sims/Zug 582:583:

| Dosis | B-Siege | B-Rate | 95 %-CI | p (exakt) |
|---:|---:|---:|---:|---:|
| 0,25 | 16/30 | 53,3 % | 34,3–71,7 % | 0,856 |
| 0,50 | 15/30 | 50,0 % | 31,3–68,7 % | 1,000 |
| 0,75 | 19/30 | 63,3 % | 43,9–80,1 % | 0,200 |
| 1,00 | 21/30 | 70,0 % | 50,6–85,3 % | 0,043 |
| **gepoolt** | **71/120** | **59,2 %** | **49,8–68,0 %** | **0,055** |

**Nicht belegt.** Das gepoolte CI enthält 50 %; die 70 % bei Dosis 1,00 sind
eine von vier Dosen (Bonferroni p = 0,17); der Trendtest über die Dosis gibt
z = 1,58, p = 0,11. Der Rauschboden sagt, bei 120 Partien ist erst ab ~59 %
etwas nachweisbar — der Wert liegt genau auf der Kante. Und `midLineWeight`
zeigte im ersten Lauf 60 % und fiel über 210 Partien auf 53 %: dieselbe Form.

**Besser belegt ist der Wirkmechanismus.** Der erlittene größte Einzelschlag
sinkt von 14,2 auf 9,9 Steine, gepaart über 120 Partien 73:45, p = 0,013 —
und zwar dosisabhängig, im selben Muster wie die Siegrate:

| Dosis | Ø größter erlitten A → B | Vorzeichen B:A | p |
|---:|---:|---:|---:|
| 0,25 | 11,6 → 11,7 | 16:14 | 0,856 |
| 0,50 | 12,7 → 10,0 | 14:15 | 1,000 |
| 0,75 | 19,1 → 8,6 | 22:8 | 0,016 |
| 1,00 | 13,3 → 9,2 | 21:8 | 0,024 |

Die Engine verliert seltener große Gruppen, genau ab der Dosis, ab der auch
die Siegrate steigt. Der Mechanismus ist damit besser abgesichert als die
Wirkung, die er erzeugen soll.

**Das vorab benannte Hauptrisiko tritt nicht ein.** Die Sorge war, die
Übertragung drücke Q so früh unter `resignQ`, dass rettbare Partien
abgeschrieben werden — in der Einzelpartie-Analyse fiel Q schon bei Zug 262
auf −0,87 statt +0,24. Gemessen ergibt sich das Gegenteil: A gibt 39× auf
(Ø Zug 322, Ø Rückstand 48,7 Punkte), B nur 25× (Ø Zug 323, Ø Rückstand
54,6 Punkte). B gibt seltener und bei größerem Rückstand auf — plausibel,
weil B seltener in die Lage gerät, in der Q kollabiert.

#### Nachmessung auf Dosis 1,00: 210 Partien, der Gewinn hält

Sechs weitere Läufe (Seeds 8200–8205), gepoolt mit Lauf 44. Einzelergebnisse
70 / 80 / 60 / 70 / 57 / 50 / 70 %. **Kein Lauf unter 50 %.**

| | B : A | B-Rate | 95 %-CI | p (zweiseitig) |
|---|---:|---:|---:|---:|
| Dosis 1,00 (210 Partien) | 137:73 | **65,2 %** | **58,4 – 71,7 %** | 1,2 · 10⁻⁵ |
| alle Dosen (300 Partien) | 187:113 | 62,3 % | 56,6 – 67,8 % | 2,3 · 10⁻⁵ |

Die Regression zur Mitte, die `midLineWeight` entzaubert hat, tritt hier
nicht ein — die Rate steigt sogar von 59 auf 65 %. Das Konfidenzintervall
liegt vollständig über 50 %. **Das ist der erste belegte Spielstärkegewinn
dieses Projekts.**

Der Gruppenverlust folgt in allen drei Maßen, gepaart über 210 Partien:

| erlitten | A | B | Vorzeichentest |
|---|---:|---:|---:|
| größter Einzelschlag | 12,9 | 10,3 | 130:68, p = 1,3 · 10⁻⁵ |
| Gesamtverlust | 34,8 | 27,8 | 135:71, p = 9,7 · 10⁻⁶ |
| Schläge ab 5 Steinen | 2,36 | 1,60 | 121:55, p = 7,2 · 10⁻⁷ |

Aufgaben: A gibt 78× auf (Ø Zug 324, Ø Rückstand 50,6 Punkte), B nur 29×
(Ø Zug 335, Ø Rückstand 60,8). Bemerkenswert, weil **A die optimistische
Bewertung hat** und trotzdem fast dreimal so oft aufgibt — A steht wirklich
häufiger verloren, es ist kein Schwellenartefakt.

**Einschränkung, und sie gehört dazu:** der Effekt sitzt fast ganz in den
durch Aufgabe entschiedenen Partien.

| | B-Rate | 95 %-CI | p |
|---|---:|---:|---:|
| nur ausgezählte Partien (n = 103) | 57,3 % | 47,2 – 67,0 % | 0,17 |
| nur Partien mit Aufgabe (n = 107) | 72,9 % | 63,4 – 81,0 % | 2,4 · 10⁻⁶ |

Das passt zum Mechanismus, statt ihm zu widersprechen: der Term greift bei
1,6 % der Gruppen, nämlich genau dann, wenn eine große Gruppe stirbt. Ruhige
Partien zählt er aus wie vorher (Ø Endmarge −3,0 Punkte aus A-Sicht); Partien
mit Katastrophe entscheidet er. **Der Term verhindert Desaster, er verbessert
nicht das Endspiel.**

Confounds geprüft: Farbbalance exakt 105:105, B gewinnt in beiden Rollen
(70,5 % als Weiß-Gegner, 60,0 % als Schwarz-Gegner); Sims/Zug 570:571.

#### Default gesetzt: `deathTransfer = 1,0`

Nach Vorlage der 210-Partien-Messung vom Projektinhaber freigegeben. Damit ist
dies **der erste Parameter dieses Projekts, der aufgrund eines belegten
Spielstärkegewinns aktiv geschaltet wurde**. Alle Vorgänger — `captureWeight`,
`openLineWeight`, `midLibCap`, `midLibSoft`, `midLineWeight`, `deathDiscount` —
blieben auf ihrem neutralen Wert, weil die Messung den Gewinn nicht hergab.
(`midLineWeight` ist später nachgezogen — siehe unten; zum Zeitpunkt dieser
Freigabe stand es noch auf 0.)

Abschaltbarkeit geprüft, nicht behauptet: mit `deathTransfer = 0` ist der Stand
über 6554 `evaluateBoard`-Aufrufe **bitgenau identisch** zum Vorstand. Als
Gegenprobe derselbe Vergleich ohne Erzwingen — 1758 Abweichungen, der Default
wirkt also wirklich. Ein Test, der in beide Richtungen prüft, ist einer, dem man
glauben kann; einer, der nur Gleichheit zeigt, könnte auch nur schlafen.

#### Abschlag *plus* Übertragung: weitgehend redundant

Letzte offene Frage der Serie: bringt `deathDiscount` auf der Übertragungs-Basis
noch etwas? An der Einzelstellung schließen beide zusammen 97 % der Lücke statt
77 %. A = `deathTransfer 1,0` + `deathDiscount 0` gegen B = beide auf 1,0,
Sims/Zug 586:586.

| | B : A | B-Rate | 95 %-CI | p |
|---|---:|---:|---:|---:|
| erster Durchgang (120 Partien) | 71:49 | 59,2 % | 49,8–68,0 % | 0,055 |
| Nachmessung (180 Partien) | 97:83 | 53,9 % | 46,3–61,3 % | 0,33 |
| **gepoolt (300 Partien)** | **168:132** | **56,0 %** | **50,2–61,7 %** | **0,043** |

Das ist der `midLineWeight`-Verlauf, nicht der `deathTransfer`-Verlauf: die Rate
**fällt** bei mehr Partien statt zu steigen. Beim Transfer ging sie von 59,2 auf
65,2 % hoch, hier von 59,2 auf 53,9 % herunter.

Beim Wirkmechanismus noch deutlicher. Erster Durchgang: erlittener größter
Einzelschlag 13,11 → 9,75, gepaart 69:45, p = 0,031. Nachmessung: 12,49 → 11,98,
93:83, **p = 0,50**. Über alle 300 Partien 12,74 → 11,09, 162:128, p = 0,053.
Der Mechanismus-Effekt, der beim reinen Transfer bei p = 1,3 · 10⁻⁵ lag, ist
hier nicht belegbar.

**Befund: weitgehend redundant.** Ein kleiner Restnutzen ist nicht
ausgeschlossen — gepoolt p = 0,043 —, aber die untere CI-Grenze liegt bei 50,2 %
und der Effekt *schrumpft* mit wachsendem n. Das ist die Signatur von Rauschen,
nicht die eines echten Effekts. Zum Vergleich: der Transfer lieferte bei nur 210
Partien 65,2 % mit CI 58,4–71,7 %. Default bleibt 0.

#### Der methodische Ertrag: „Prozent der Lücke geschlossen" ist keine Zielgröße

Der Befund reicht über den Parameter hinaus. Die Serie hat eine 610-Punkte-Lücke
in `evaluateBoard` freigelegt und drei Eingriffe daran gemessen:

| Eingriff | Lücke geschlossen | Siegrate |
|---|---:|---:|
| `deathDiscount` allein | 20 % | 54,2 % (n = 120), nicht belegt |
| `deathTransfer` allein | 77 % | **65,2 %** (n = 210), belegt |
| beide zusammen | 97 % | 56,0 % (n = 300), im Rauschen |

Die beiden Spalten laufen nicht parallel. Die letzten 20 Prozentpunkte der Lücke
kosten nichts und bringen nichts. Die Lücke war nie linear in Spielstärke
umrechenbar — sie war der Wegweiser zur richtigen Ursache, nicht das Maß des
Erfolgs. Wer eine Bewertungsfunktion nach „wie nah am ehrlichen Wert" optimiert,
optimiert eine Hilfsgröße.

### Randspiel als Ursache: die Struktur lässt sich ändern, die Stärke nicht

Fünf Partien gegen einen Menschen (alle mit `deathTransfer 1,0`) legten eine
Synthese nahe: die KI schlägt in fünf Partien **keine einzige** Gruppe ab 5
Steinen, verliert aber neun — und fünf der neun sind Randgruppen mit 70–100 %
ihrer Steine auf Linie 1–2. Es sind die späten, spielentscheidenden (Zug 213,
249, 271, 313, 317, 345). In `3120944b` führt die KI bei Zug 325 mit 20,5
Punkten, verliert bei Zug 345 eine 16er-Randkette und verliert mit 13,5.

These: `deathTransfer` heilt die *Fehlbewertung* toter Gruppen,
`midLineWeight` verhindert ihre *Entstehung*. Dafür kam die Randanteil-
Telemetrie in den Harness.

A = `deathTransfer 1,0` + `midLineWeight 0`, B = plus 40 bzw. 80, je 120
Partien, Sims/Zug paritätisch.

**Der Eingriff trifft die Struktur, zweifelsfrei:**

| Dosis | Randanteil A → B | gepaart | p |
|---:|---|---:|---:|
| 40 | 38,2 % → 32,6 % | 83:37 | 3,2 · 10⁻⁵ |
| 80 | 40,8 % → 30,1 % | 97:23 | 5,3 · 10⁻¹² |

**Die Spielstärke folgt nicht:**

| Dosis | B-Siege | Rate | 95 %-CI | p (Bonferroni ×2) |
|---:|---:|---:|---:|---:|
| 40 | 61/120 | 50,8 % | 41,6–60,1 % | 0,93 (1,00) |
| 80 | 67/120 | 55,8 % | 46,5–64,9 % | 0,235 (0,47) |

Auch das Zwischenglied trägt kaum: Gruppenverlust bei Dosis 80 nur
11,78 → 10,79 (p = 0,16); Schläge ab 5 Steinen 2,23 → 1,77 (p = 0,043,
Bonferroni 0,086). Der Vorteil sitzt zudem ganz in den Aufgabe-Partien — in
den ausgezählten steht B bei 48,2 %.

**Korrektur einer eigenen Aussage.** Der Rauchtest zur Telemetrie ergab für
die Baseline 50,7 % und schien damit die 51,0 % aus den Menschpartien zu
bestätigen — das wurde hier zunächst als Validierung der Diagnose verbucht.
Zu stark: bei vollem Budget (250 ms, ~550 Sims/Zug) liegt die Baseline bei
**38–41 %**, der Rauchtest lief mit 60 ms. Die Übereinstimmung hing am
kleinen Budget.

Das ist selbst ein Befund: **mehr Suche senkt das Randkriechen schon von
allein** (60 ms: 50,7 % · 250 ms: 38–41 %). Ein Teil der Randneigung ist
Symptom flacher Suche, nicht des Bewertungsterms. Dazu passt, dass die
einzige Menschpartie mit sicher hohem Budget den niedrigsten Randanteil aller
fünf hatte (33,3 %) und der klarste KI-Sieg war.

#### Nachmessung auf Dosis 80: die Kette schließt sich

Erwartet war Regression zur Mitte. Eingetreten ist das Gegenteil:

| | B : A | B-Rate | 95 %-CI | p |
|---|---:|---:|---:|---:|
| erster Durchgang (120) | 67:53 | 55,8 % | 46,5–64,9 % | 0,235 |
| Nachmessung (180) | 109:71 | **60,6 %** | **53,0–67,7 %** | 0,0057 |
| gepoolt (300) | 176:124 | 58,7 % | 52,9–64,3 % | 0,0032 |

Die unabhängige Zahl ist die **Nachmessung allein: 60,6 %**. Der gepoolte Wert
enthält den ersten Durchgang, der gerade wegen seines Anscheins zur
Nachmessung ausgewählt wurde, und ist dadurch leicht nach oben verzerrt. Beide
liegen vollständig über 50 %.

**Alle drei Glieder der Kausalkette sind belegt:**

| Glied | A → B | gepaart | p |
|---|---|---:|---:|
| Randanteil | 41,5 % → 29,8 % | 245:55 | 8,8 · 10⁻³⁰ |
| größter Einzelschlag | 13,19 → 10,69 | 180:111 | 6,2 · 10⁻⁵ |
| Gesamtverlust | 35,53 → 29,36 | 179:119 | 6,1 · 10⁻⁴ |
| Schläge ab 5 Steinen | 2,33 → 1,71 | 160:93 | 3,0 · 10⁻⁵ |
| **Siegrate** | | **58,7 %** | **0,0032** |

Die Dosis-Wirkung stützt die Kausalität zusätzlich: Gewicht 40 senkt den
Randanteil um 5,6 Punkte und bringt 50,8 %; Gewicht 80 senkt ihn um 11,7
Punkte und bringt 58,7 %. Aufgaben A 101× / B 66×. Sims 552:553,
Farbbalance exakt 150:150.

**Revidiert** wird damit die Einschätzung nach dem ersten Durchgang, die
Synthese stehe schlecht. Sie war verfrüht: 120 Partien konnten zwischen
55,8 % als Rauschen und als echtem Effekt nicht unterscheiden, und die
Vermutung fiel auf die falsche Seite. Der Befund aus den Menschpartien —
Randgruppen sterben, und sie entscheiden die Partien — ist nicht nur richtig
beobachtet, sondern auch richtig kausal gedeutet.

Was das nicht aufhebt: mehr Suche senkt den Randanteil ebenfalls (60 ms
50,7 %, 250 ms 38–41 %). Beide Wege wirken auf dieselbe Schwäche; ob sie sich
addieren, ist ungemessen.

#### Default gesetzt: `midLineWeight = 80`

Vom Projektinhaber freigegeben. Damit ist dies der **zweite** Parameter des
Projekts, der aufgrund eines belegten Spielstärkegewinns aktiv geschaltet
wurde — und der erste, bei dem nicht nur die Wirkung, sondern auch die
**Ursache** durchgemessen ist: bei `deathTransfer` steht die Siegrate allein,
hier steht die Kette Randanteil → Gruppenverlust → Siegrate.

**Abschaltbarkeit geprüft, beide Richtungen**, 28 802 `evalMidgame`-Aufrufe je
Variante über 60 Stellungen von 10 bis 305 Steinen:

| Richtung | Ergebnis |
|---|---|
| auf 0 zurückgesetzt | **bitgenau identisch** zum Vorstand, 0 Abweichungen |
| auf dem Default 80 | Differenz **genau** der Linienabschlag, 0 Abweichungen |
| | Linie 1: −80 · Linie 2: −40 · ab Linie 3: exakt 0 |
| | wirksam auf 10 714 von 28 802 Zügen = 37,2 % |

Die 37,2 % sind keine Eigenschaft des Parameters, sondern der Geometrie: auf
19×19 liegen 136 der 361 Punkte auf Linie 1–2, also 37,7 %. Die Messung trifft
den Erwartungswert — der Abschlag greift auf allen Randpunkten und auf keinem
anderen.

Zwei Dinge gingen beim ersten Anlauf der Probe schief und stehen deshalb hier.
`evalMidgame` endet auf `s + Math.random() * 4`, einem Rauschterm zur
Zugstreuung; ohne deterministisch gesetzten Generator vergleicht die Probe
Rauschen statt Bewertung, und der erste Durchlauf meldete prompt 100 %
Abweichung. Und Bit-Gleichheit ist nur ab Linie 3 die richtige Forderung: auf
Linie 1–2 verschiebt der zusätzliche Summand die Rundung der Gleitkommasumme um
ein ULP (größte beobachtete Abweichung 2,3 · 10⁻¹³). Dort Bit-Gleichheit zu
verlangen hieße, Rundung für einen Fehler zu halten — der zweite Durchlauf
meldete 1580 „Abweichungen", von denen keine eine war.

**Was der Default nicht trägt**, ausdrücklich: alles Gemessene ist Selfplay. Der
Anlass dieser ganzen Spur war gerade, dass ein Selfplay-Gewinn gegen einen
Menschen verpuffen kann, wenn beide Seiten dieselbe Schwäche teilen — genau so
war es bei `deathTransfer` (65 % im Selfplay, gegen einen Menschen
unauffällig). Hier ist das Risiko geringer, weil der Term auf die *Entstehung*
des Randkriechens zielt und der Mensch diese Struktur nicht hat (Randanteil
20,7 % gegen 51,0 %). Geringer ist aber nicht gemessen; der Beleg gegen einen
Menschen fehlt und wird nicht behauptet.

**Vorbehalt für bestehende Installationen:** `dashSave` serialisiert das ganze
`PARAMS`-Objekt, `dashLoad` schreibt jeden Schlüssel zurück. Wer im Dashboard je
„Speichern" gedrückt hat, hat `midLineWeight: 0` in `localStorage`
festgeschrieben und bekommt den neuen Default **nicht**, bis er „Zurücksetzen"
drückt. Das ist Absicht der Speicherfunktion — eine gespeicherte Konfiguration
soll nicht von einem Update überschrieben werden —, heißt aber: der neue Default
wirkt nur für frische Profile und nach einem Reset.

### Die KI erstickt ihre eigene Gruppe: `atariSizeWeight`

Zwei Partien gegen einen Menschen (13.09., KI als Weiß) brachten einen Befund
anderer Art als die bisherigen. In der zweiten, über 407 Züge, hatte die KI in
der linken unteren Ecke eine Gruppe mit **über 30 Zügen lang konstant vier
Freiheiten** (B2, A1, E3, E1). Schwarz passte neunmal in Folge. Die KI zog in
dieser Zeit zehnmal — F19, G19, J19, M19, L19, O19, A15, S3, T2, S1, **alle auf
Rand-Abstand 0 oder 1**, keiner an der Gruppe. Dann setzte sie sich in drei
Zügen selbst matt:

| Zug | Weiß spielt | Gruppe | Freiheiten | `evalEndgame` |
|---:|---|---:|---|---:|
| 394 | E3 | 35 → 36 | 4 → 3 | **+0,2** |
| 396 | A1 | 36 → 37 | 3 → 2 | **+0,3** |
| 398 | E1 | 37 → 38 | 2 → 1 | −399,7 |
| 399 | *Schwarz B2* | — | — | **38 geschlagen** |

Der Gebietsstand fiel dadurch von −13 auf −52. Die Bewertungen sind an genau
diesen Stellungen gemessen, der Rauschterm über 400 Aufrufe ausgemittelt.

Zwei Lücken stecken darin. **Freiheitsverlust oberhalb von Atari kostet
nichts** — der Bewerter kennt nur `if (lib === 1 && cap === 0)`. Und die
**Atari-Strafe ist flach**: 38 Steine kosten dieselben 400 wie ein einzelner
Stein. In Area-Wertung kostet der Verlust 38 Gebietspunkte plus 38 Gefangene,
in Einheiten von `endAreaGain` also rund 2280.

`atariSizeWeight` greift die zweite an: `Strafe = Basis × (1 + w × (Größe − 1))`,
für Mittel- und Endspiel gemeinsam. Multiplikativ, weil die beiden Evaluatoren
auf verschiedenen Skalen rechnen (`midCapBonus` 800 gegen `endCapBonus` 18) —
eine additive Konstante je Stein bräuchte zwei Parameter und damit zwei
Dosisachsen. Der Freiheitsterm oberhalb von Atari bleibt bewusst unangetastet:
ein zweiter Eingriff machte die Dosisreihe mehrdeutig.

An der echten Stellung, für E1 mit einer 38er-Gruppe:

| `atariSizeWeight` | Strafe |
|---:|---:|
| 0 (Default) | −400 |
| 0,05 | −1140 |
| 0,1 | −1880 |
| 0,25 | −4100 |

Ein Einzelstein im Atari bleibt bei jedem Gewicht unverändert bei −400, weil
der Faktor bei Größe 1 exakt 1 ist.

**Was nicht belegt ist:** dass diese Lücke den Zug in jener Partie *verursacht*
hat. Mit kaltem Suchbaum und 2000 ms passt die Engine in derselben Stellung,
statt E3 zu spielen — in alter wie neuer Konfiguration. Der Unterschied kann an
Tree-Reuse, Budget oder Zughistorie liegen und ist ungeklärt. Belegt ist die
Lücke im Bewerter, nicht ihre Wirkung im Spiel.

**Geprüft, drei Richtungen.** `countGroupSize` — eine allokationsfreie
Primitive nach dem Muster von `countLiberties` — stimmt über 5253
Gruppenabfragen exakt mit `floodFill` überein. Mit Gewicht 0 sind
`evalMidgame` und `evalEndgame` über 36 748 Aufrufpaare **bitgleich** zum
Vorstand, bei identischem Zufallsverbrauch. Mit Gewicht 0,1 ändert sich die
Bewertung um **genau** den vorhergesagten Betrag und nur auf Zügen mit
Selbst-Atari (2,69 % der geprüften Züge), größte Abweichung 1,1 · 10⁻¹³.

Ein eigener Wächter im Harness zählt, wo die Entscheidung fällt: Aufrufe der
Skalierung je Zug, Anteil an Gruppen ab 6 Steinen, größte berührte Gruppe.
Rauchtest über 4 Partien: Arm A (Gewicht 0) **0,00** Aufrufe je Zug, Arm B
(0,1) **1,98**, größte berührte Gruppe 17 Steine. Ein Arm ohne Aufrufe wäre
nicht verdrahtet, und ein Nullergebnis dort bedeutungslos.

#### Gemessen: die Lücke ist real, ihre Behebung bringt nichts

Läufe 83–88, drei Dosen zu je 120 Partien:

| Dosis | B-Siege | Rate | 95 %-CI | p (Bonferroni ×3) |
|---:|---:|---:|---:|---:|
| 0,05 | 65/120 | 54,2 % | 44,8–63,3 % | 0,41 (1,00) |
| 0,1 | 57/120 | 47,5 % | 38,3–56,8 % | 0,65 (1,00) |
| 0,25 | 57/120 | 47,5 % | 38,3–56,8 % | 0,65 (1,00) |
| **gepoolt** | **179/360** | **49,7 %** | 44,4–55,0 % | 0,96 |

Kein Gewinn, kein Dosis-Trend — die Punktschätzer *fallen* mit der Dosis. Der
Eingriff ist dabei nachweislich aktiv: der Wächter zählt in Arm A 0,00 Aufrufe
je Zug, in Arm B 2,54 bis 3,15, mit größten berührten Gruppen von 37 bis 100
Steinen. Auch die Mechanismus-Metrik trägt nicht: Ø größter erlittener Schlag
12,05 → 11,65 (−3,3 %), Schläge ab 5 Steinen 806 → 800, Gesamtverlust
12 079 → 11 845.

**Der eigentliche Befund dieses Laufs ist methodisch.** Je Dosis sah der
Gruppenverlust so aus: 0,05 → −13,5 %, 0,1 → −2,1 %, 0,25 → +7,0 %. Das liest
sich wie eine saubere, wenn auch unerwünschte Dosis-Wirkung. Es ist keine:

| | |
|---|---|
| Streuung der **Kontrollarme** allein | 11,3 bis 13,3 (18 %) |
| Korrelation Kontrollarm ↔ gemessene „Verbesserung" | **r = −0,90** |

Je schlechter der Kontrollarm zufällig ausfiel, desto größer die scheinbare
Wirkung — und die Dosis 0,05 hat zufällig die beiden schlechtesten erwischt
(13,3 und 12,7). Das ist Regression zur Mitte, nicht Dosis-Wirkung. Dass jeder
Lauf seinen eigenen Kontrollarm trägt, schützt gegen *Verzerrung*, nicht gegen
diese Täuschung: bei drei Dosen zu je zwei Läufen ist die Zuordnung guter und
schlechter Kontrollarme zu den Dosen selbst zufällig. Die Gegenprüfung ist
billig — die Streuung der Kontrollarme neben die Effektgröße legen — und
gehört ab jetzt zu jeder Dosisreihe.

Damit ist dies der **dritte** Eingriff dieser Art: ein real belegter Defekt,
dessen Behebung messbar nichts bringt (Min-Sims-Boden, Hungerzone, jetzt die
Atari-Skalierung). Power-Vorbehalt, vorab benannt: 120 Partien je Dosis lösen
erst ab rund 63 % auf.

Der Default bleibt 0. Der Parameter bleibt im Code, weil die Messung ihn
belegt und weil er abschaltbar geprüft ist — nicht, weil er wirkt.

### Der Freiheitsterm oberhalb von Atari: `endLibPressure`

`atariSizeWeight` hat nur den letzten Schritt teurer gemacht (2→1 Freiheiten) —
und da war es schon zu spät. Der Fehler sind die beiden davor: 4→3 kostete
+0,2, 3→2 kostete +0,3. `endLibPressure` greift sie an, mit
`Strafe = Gewicht × Gruppengröße / Freiheiten` für 2 und 3 Freiheiten.

Der Term ist viel breiter als sein Vorgänger: er feuert auf **34 %** aller
geprüften Endspielzüge, gegen 2,7 % bei `atariSizeWeight`. Deshalb begann die
Dosisreihe niedrig.

| Dosis | B-Siege | Rate | 95 %-CI | p (Bonferroni ×3) |
|---:|---:|---:|---:|---:|
| 5 | 63/120 | 52,5 % | 43,2–61,7 % | 0,65 (1,00) |
| 15 | 61/120 | 50,8 % | 41,6–60,1 % | 0,93 (1,00) |
| 40 | 68/120 | 56,7 % | 47,3–65,7 % | 0,17 (0,51) |
| **gepoolt** | **192/360** | **53,3 %** | 48,0–58,6 % | 0,225 |

Verdrahtet: Wächter A 0,00 Aufrufe je Zug, B 42,5–45,3, größte berührte Gruppe
37 bis 175 Steine. Die Mechanismus-Metrik zeigt in die richtige Richtung —
Ø größter erlittener Schlag 11,72 → 10,50, Schläge ab 5 Steinen 704 → 636,
Gesamtverlust 11 409 → 10 292, jeweils B besser in 5 von 6 Läufen (p = 0,22).

**Unentschieden, nicht belegt.** Zwei Vorbehalte stehen ausdrücklich dagegen.
Die Kontrollarme streuen für sich zwischen 9,3 und 15,6 (68 %), und die
Korrelation zwischen Kontrollarm und gemessener Verbesserung liegt wieder bei
**r = −0,90** — die Dosiszeile ist damit nicht als Dosis-Wirkung lesbar. Und
ein einzelner Lauf trägt die Hälfte: ohne `r90`, dessen Kontrollarm mit 15,6
der schlechteste der Serie war, fällt der gepoolte Gruppenverlust von −10,4 %
auf −4,0 %.

Was die sechs Läufe dennoch zeigen, und was `r90` nicht allein erklärt, ist die
**Streuung**:

| | Spanne | SD | ohne `r90` |
|---|---|---:|---:|
| Kontrollarm A | 9,3–15,6 | 2,21 | 1,25 |
| Testarm B | 9,6–11,8 | **0,82** | 0,92 |

B hat in keinem Lauf eine Katastrophenserie. Das ist genau das, was ein
Freiheitsdruck tun sollte: nicht den Schnitt senken, sondern den Schwanz
abschneiden. Belegt ist es damit nicht — sechs Läufe sind für eine
Varianzaussage wenig.

#### Nachmessung auf Dosis 40: der erste belegte Bewertungsfix

Erwartet war Regression zur Mitte. Eingetreten ist das Gegenteil.

| | B : A | Rate | 95 %-CI | p |
|---|---:|---:|---:|---:|
| erster Durchgang (120) | 68:52 | 56,7 % | 47,3–65,7 % | 0,17 |
| **Nachmessung (180)** | **123:57** | **68,3 %** | **61,0–75,1 %** | **9,7 · 10⁻⁷** |
| gepoolt (300) | 191:109 | 63,7 % | 57,9–69,1 % | 2,6 · 10⁻⁶ |

Die unabhängige Zahl ist die **Nachmessung allein**; der gepoolte Wert enthält
den Durchgang, der wegen seines Anscheins zur Nachmessung ausgewählt wurde.
Einzelläufe 42:18 · 39:21 · 42:18 — kein Ausreißer trägt das Ergebnis. Die
Mechanismus-Metrik trägt mit: Ø größter erlittener Schlag 12,23 → 9,30
(−24,0 %, B besser in 3/3), Schläge ab 5 Steinen 378 → 298, Gesamtverlust
6073 → 4685.

**Warum das diesmal keine Regression zur Mitte ist** — die Prüfung, an der
`atariSizeWeight` und der erste Durchgang gescheitert sind:

| | Streuung der Kontrollarme |
|---|---|
| erster Durchgang | 9,3 bis 15,6 — **68 %** |
| Nachmessung | 11,9 bis 12,8 — **8 %** |

Im ersten Durchgang war die Streuung der Kontrollarme so groß wie der gesuchte
Effekt; hier ist sie ein Drittel davon. Ein Effekt von −24 % kann aus einer
8-Prozent-Streuung nicht entstehen. Die Korrelation liegt zwar wieder bei
r = −0,81, aber über drei Punkte mit 8 % Spannweite beschreibt sie Rauschen,
nicht den Effekt.

Confounds geprüft: Sims 622:622, 619:618, 890:888; Zeit −0,6/−0,8/−0,8 %, also
wenn überhaupt zu Bs Ungunsten; Komi-0-Wertung in gleicher Richtung.
**Code-Identität geprüft**, weil die Durchgänge auf verschiedenen Commits
liefen: der Diff ist reiner Kommentar, und über 48 552 Bewertungspaare liefern
beide Stände bitgleiche Werte.

Offen bleibt, dass die beiden Durchgänge sich mit p = 0,040 unterscheiden. Das
ist mit Zufall vereinbar, heißt aber: die wahre Rate liegt eher im Bereich
57–75 % als genau bei 68 %.

Damit ist dies nach `midLineWeight` der **zweite Eingriff mit belegtem
Spielstärkegewinn** — und der erste, der einen *Bewertungsfehler* behebt statt
einer Gewohnheit. Die vier Vorgänger dieser Art waren allesamt wirkungslos.

#### Default gesetzt: `endLibPressure = 40`

Vom Projektinhaber freigegeben. **Dritter Parameter des Projekts, der auf
belegter Spielstärke aktiviert wird** — nach `deathTransfer` und
`midLineWeight`, und der mit der stärksten Beweislage.

Abschaltbarkeit geprüft, beide Richtungen, 18 228 `evalEndgame`-Aufrufe je
Variante über 40 Stellungen von 20 bis 332 Steinen:

| Richtung | Ergebnis |
|---|---|
| auf 0 zurückgesetzt | **bitgleich** zum Vorstand, gleicher Zufallsverbrauch |
| auf dem Default 40 | Änderung **genau** Gewicht × Größe / Freiheiten, nur auf Zügen mit 2–3 Freiheiten |

Im Harness gegengeprüft, mit vertauschten Rollen: Arm A (Default) 43,02
Aufrufe je Zug, Arm B (erzwungen 0) 0,00.

**Laufzeit:** mit dem Default wechselt der Freiheits-Deckel in
`countLiberties` von 2 auf 4, und `countGroupSize` läuft auf dem Atari-Pfad
mit. Gemessen kostet das nichts — in den drei Nachmessungsläufen lag die
Gesamtzeit je Partie bei −0,6/−0,8/−0,8 % bei gleicher Simulationszahl.

**Vorbehalt für bestehende Installationen**, wie bei `midLineWeight`:
`dashSave` serialisiert das ganze `PARAMS`-Objekt, `dashLoad` schreibt jeden
Schlüssel zurück. Wer im Dashboard je „Speichern" gedrückt hat, hat
`endLibPressure: 0` in `localStorage` festgeschrieben und bekommt den neuen
Default **nicht** — bis er „Zurücksetzen" drückt.

### Der Augen-Überzähler: `tsumegoEyeOpenPenalty`

| Dosis | B-Siege | Rate | p (Bonferroni ×3) |
|---:|---:|---:|---:|
| 30 | 64/120 | 53,3 % | 0,52 (1,00) |
| 60 | 62/120 | 51,7 % | 0,78 (1,00) |
| 100 | 54/120 | 45,0 % | 0,32 (0,95) |
| **gepoolt** | **180/360** | **50,0 %** | 1,00 |

Exakt 50,0 %, kein Dosis-Trend. Der Gruppenverlust sinkt um 4,0 %, aber die
Kontrollarme streuen für sich um 21 % — die Zahl trägt nicht.

**Der Überzähler ist bestätigt**, im vollen Spielbetrieb: über alle sechs Läufe
sind im Mittel **25,1 %** der gezählten Augenpunkte offen (22,9 bis 26,5 %), bei
rund 800 gezählten Augenpunkten je Zug. Jeder vierte Punkt, den der Bewerter
„potenzielles Auge" nennt, ist einer, durch den der Gegner noch hineinlaufen
kann. Der Defekt ist real und groß — seine Behebung ändert nichts.

**Widerlegt wird damit eine eigene Erklärung.** Nach fünf Nullergebnissen und
dem einen Treffer hatte ich vermutet, der Unterschied liege in der
*Reichweite*: `endLibPressure` greift auf 34 % der Endspielzüge,
`atariSizeWeight` nur auf 2,7 %. Dieser Term greift auf rund 25 % und bringt
exakt nichts. Die Reichweite ist es nicht.

Was als struktureller Unterschied übrig bleibt: `evalTsumego` wird nur über
`getCrisisWeight` eingeblendet, also ausschließlich auf den Freiheiten einer
Gruppe, die **bereits** in der Krise ist — dasselbe gilt für `tsumegoSunkCost`.
`atariSizeWeight` preist Atari, den Moment, in dem es zu spät ist.
`endLibPressure` ist der einzige Eingriff der Serie, der auf gewöhnlichen Zügen
wirkt, *bevor* eine Gruppe in Not ist. Das ist eine Hypothese, keine Messung —
aber die einzige, die nach diesem Lauf noch steht.

### Versenkte Kosten: `tsumegoSunkCost`

Eine Gruppe, die zum dritten Mal in Folge gerettet wird und immer noch keine
Form hat, soll eher fallengelassen als weiter gefüttert werden.

| Dosis | B-Siege | Rate | p (Bonferroni ×3) |
|---:|---:|---:|---:|
| 100 | 56/120 | 46,7 % | 0,52 (1,00) |
| 300 | 65/120 | 54,2 % | 0,41 (1,00) |
| 700 | 57/120 | 47,5 % | 0,65 (1,00) |
| **gepoolt** | **178/360** | **49,4 %** | 0,87 |

Kein Gewinn, kein Dosis-Trend. Der Eingriff greift dabei kräftig: Wächter
A 0,0 %, B **24,6–30,6 %** aller Tsumego-Bewertungen.

**Der Mechanismus arbeitet, dosisgeordnet.** Wie oft der B-Arm die Partie
aufgab, je Dosis: **34 → 30 → 26**. Je teurer die Rettung, desto seltener muss
B aufgeben — genau die erwartete Kette: Gruppe früher fallenlassen, weniger
Material verlieren, länger im Spiel bleiben. Nur zahlt es sich nicht in Siegen
aus.

**Ein Befund unabhängig vom Parameter:** die längste ununterbrochene
Krisendauer einer Gruppe lag je Lauf bei **48 bis 76 Zügen**. Es gibt also
tatsächlich Gruppen, die über siebzig Züge gefüttert werden, ohne
herauszukommen. Die Beobachtung, die den Parameter veranlasst hat, ist
bestätigt — nur ihre Behandlung ändert nichts.

**Warum die Gruppenverlust-Zahl hier nicht zählt.** Gepoolt sinkt der Ø größte
erlittene Schlag von 13,18 auf 11,67 (−11,5 %), B besser in 4 von 6 Läufen.
Sieht gut aus, ist aber nicht belastbar:

| | Streuung der Kontrollarme | Effekt | r |
|---|---|---:|---:|
| `tsumegoSunkCost` | 11,1–16,1 — **45 %** | −11,5 % | −0,92 |
| `endLibPressure` (Nachmessung) | 11,9–12,8 — **8 %** | −24,0 % | −0,81 |

Hier ist die Streuung der Kontrollarme größer als der Effekt, dort ein Drittel
davon. Derselbe Test, zwei Ausgänge — und genau dafür ist er da.

Der Default bleibt 0.

### Die Q-Sättigung deckeln: `captureCap`

| Dosis | B-Siege | Rate | 95 %-CI | p (Bonferroni ×3) |
|---:|---:|---:|---:|---:|
| 200 | 67/120 | 55,8 % | 46,5–64,9 % | 0,24 (0,71) |
| 300 | 64/120 | 53,3 % | 44,0–62,5 % | 0,52 (1,00) |
| 400 | 52/120 | 43,3 % | 34,3–52,7 % | 0,17 (0,51) |
| **gepoolt** | **183/360** | **50,8 %** | 45,5–56,1 % | 0,79 |

Kein Gewinn. Der Deckel tut dabei nachweislich genau das, wofür er gebaut ist,
und **beide** Wirkungen sind sauber dosisgeordnet:

| Dosis | Deckel schnitt bei | Aufgabe-Siege A : B |
|---:|---|---:|
| 200 | 10,0 % / 9,4 % | 28 : 41 |
| 300 | 5,0 % / 4,4 % | 31 : 31 |
| 400 | 2,0 % / 2,3 % | 37 : 24 |

Je enger der Deckel, desto seltener gibt B auf — die vorhergesagte
Nebenwirkung, in der vorhergesagten Reihenfolge. Der Mechanismus ist bestätigt,
der Nutzen nicht.

Die **Kostenseite** ist konsistent: B erlitt in fünf von sechs Läufen *mehr*
Schläge ab 5 Steinen (769 → 788 gepoolt). Das passt zum Eingriff — wer den
Gefangenen-Saldo deckelt, gewichtet ihn im Spiel geringer und lässt eher große
Gruppen fallen.

Der Default bleibt 0.

#### Korrektur (20.09.): der Anlass war ein Messfehler

Dieser Parameter wurde gebaut, weil ich in zwei Partien gegen einen Menschen
berichtet hatte, das Q sättige, während die Stellung noch ausgeglichen sei —
in einem Fall sogar „Weiß liegt mit +10 vorn". Diese Gebietsstände stammten
aus `estimateArea`. **Dieser Maßstab zählt zum Tode verurteilte, aber noch
stehende Gruppen als lebendiges Material.** Mit der echten Schlussauswertung
(`resolveLifeAndDeath` + `finalAreaScore`) an denselben Stellen:

| | mein Maßstab | wahr |
|---|---:|---:|
| Partie 1, Zug 208 | −4 | **−54** |
| Partie 2, Zug 260 | **+10** | **−16** |
| Partie 3, Zug 250 | 0 | **−36** |

Das Q hatte recht, der Maßstab nicht. Die Sättigung kam nicht daher, dass das
Wertsignal die Stellung verliert, sondern daher, dass die Stellung verloren
*war*. Damit fällt die Deutung, die den Parameter veranlasst hat — und ebenso
die Korrelationszahlen (0,62 ungesättigt gegen 0,31 gesättigt), die gegen
denselben schiefen Maßstab gerechnet sind.

Das erklärt rückwirkend das Nullergebnis: hier wurde ein Problem behandelt,
das größtenteils ein eigener Messfehler war. Die 360 Partien sind nicht
verloren — sie zeigen, dass der Deckel nichts bringt, und jetzt ist auch klar,
warum.

**Was bestehen bleibt** ist die Arithmetik: 19 Gefangene Rückstand genügen, um
`tanh` in den flachen Bereich zu schieben, und die Empfindlichkeit bricht dabei
15-fach ein. Das ist eine Rechnung, keine Messung, und sie stimmt weiter — nur
war sie in diesen Partien kein Fehlalarm.

**Inzwischen nachgemessen (21.09.):** die vier Partien vom 29.08., auf die sich
der Kommentar an `captureWeight` und die Einführung von `resignAreaMargin`
stützen, sind betroffen — die dortige „Gegenprobe gegen `finalAreaScore`" lief
ohne `resolveLifeAndDeath` und hatte denselben blinden Fleck. Ergebnis und
Folgen stehen bei
[Die Korrektur (21.09.)](#die-korrektur-2109-die-gegenprobe-war-blind).

Die Zählung der wirkungslosen Eingriffe bleibt davon unberührt — `captureCap`
ist einer, nur aus einem anderen Grund als angenommen.

### Praxistest der drei Defaults, und ein Werkzeug, dem ich nicht mehr traue

Erste Partie gegen einen Menschen mit `deathTransfer 1,0`, `midLineWeight 80`
und `endLibPressure 40` gleichzeitig aktiv (20.09., 335 Züge, KI als Weiß,
Aufgabe). Nachgespielt mit 0 Abweichungen zum Protokoll und 0 Feldunterschieden
zum gelieferten Endbrett.

**Der Randanteil ist gefallen, zum ersten Mal außerhalb der bisherigen
Spanne:**

| | KI | Mensch |
|---|---:|---:|
| drei Partien ohne `midLineWeight` | 51,0 / 51,3 / 52,6 % | 20,7 / 18,9 / 22,0 % |
| **diese Partie** | **39,7 %** | 28,5 % |

Der erste Hinweis, dass ein im Selfplay gemessener Parameter sich gegen einen
Menschen überträgt. Vorbehalt: der Mensch spielte hier selbst randnäher, der
Abstand ist also von rund 30 auf 11 Punkte geschrumpft und nicht nur die KI hat
sich bewegt. Und es ist eine Partie.

#### `estimateArea` taugt nicht als Maßstab für „wer liegt vorn"

Der wichtigere Befund dieser Partie ist methodisch, und er korrigiert meine
eigene Auswertung aus drei Partien. Ich hatte dreimal berichtet, das Q sättige,
während die Stellung noch ausgeglichen sei. Gemessen war das mit
`estimateArea` — und dieser Maßstab zählt zum Tode verurteilte, aber noch
stehende Gruppen als lebendiges Material.

Mit der echten Schlussauswertung (`resolveLifeAndDeath` + `finalAreaScore`)
sieht der Verlauf dieser Partie so aus:

| Zug | `estimateArea` | wahr | Q |
|---:|---:|---:|---:|
| 125 | +11 | +6 | −0,25 |
| 150 | +9 | −10 | +0,01 |
| 200 | −5 | **−47** | −0,80 |
| 250 | 0 | **−36** | −0,98 |
| 300 | −4 | −28 | −1,00 |

Die Partie kippte zwischen Zug 125 und 200, nicht im Endspiel, wie der rohe
Maßstab nahelegte. Die Aufgabe bei Zug 335 erfolgte bei einem wahren Rückstand
von −65 und war eher zu spät als zu früh.

**Regel für künftige Auswertungen:** „Wer liegt vorn" wird mit
`resolveLifeAndDeath` + `finalAreaScore` beantwortet, nicht mit
`estimateArea`. Der rohe Maßstab ist für die Engine als schnelle Heuristik
gedacht, nicht als Schiedsrichter in der Analyse. Wo er trotzdem auftaucht,
gilt: er begünstigt systematisch die Seite mit den todgeweihten Gruppen.

Die Folgen stehen bei [`captureCap`](#die-q-sättigung-deckeln-capturecap).

#### Konvention: jede Partie-Auswertung nennt ihren Maßstab

Die Regel allein hätte den Fehler nicht verhindert. Er ist entstanden, weil
nirgends stand, womit gemessen wurde — und die eine Stelle, an der es
dranstand („gegen `finalAreaScore` geprüft"), war eine Nachbildung ohne
`resolveLifeAndDeath`. Es hat zehn Monate gedauert, das zu bemerken, und das
Nachbessern war jedes Mal teurer als das Hinschreiben gewesen wäre.

**Ab jetzt nennt jede Partie-Auswertung — in der README, im Commit und im
Code-Kommentar — den Maßstab beim Namen**, in einer der drei Formen:

| Form | bedeutet | wann |
|---|---|---|
| `[roh]` | `estimateArea`, ohne Totsteinbereinigung | nur für Engine-interne Fragen, nie für „wer liegt vorn" |
| `[benson]` | nur Benson-**bewiesen** Totes entfernt | wenn es belastbar sein muss |
| `[voll]` | `resolveLifeAndDeath` + `finalAreaScore` | Schlussstellungen, Standardfall |

Zwei Zusatzregeln, beide aus einem eigenen Fehler:

1. **Eine Gegenprobe zählt nur, wenn sie einen anderen blinden Fleck hat.**
   `finalAreaScore` ohne `resolveLifeAndDeath` gegen `estimateArea` zu
   stellen ist keine — beide zählen tote Gruppen mit. Wer gegenprüft, sagt
   dazu, worin sich die beiden Verfahren unterscheiden.
2. **Auf Nicht-Schlussstellungen wird eine Spanne angegeben, keine Zahl.**
   `[roh]` und `[voll]` sind gegenläufig verzerrt; bei einer Aufgabe im
   Mittelspiel liegt die Wahrheit dazwischen, und `[benson]` sagt, wie viel
   davon beweisbar ist.

Das ist die dritte Regel dieser Art, nach der
[Kontrollarm-Prüfung](#die-ki-erstickt-ihre-eigene-gruppe-atarisizeweight) und
dem Maßstab selbst. Alle drei kosten beim Schreiben eine Zeile und haben beim
Nicht-Schreiben Monate gekostet.

#### Ein zweiter Irrtum, rechtzeitig bemerkt

Zwei Zugpaare im Endspiel sahen nach einem Snapback aus: Zug 316 (Weiß schlägt
1, verliert 6) und 326 (Weiß schlägt 1, verliert 11). Dazu gibt es eine
passende Codestelle — die Selbst-Atari-Strafe ist in allen drei Bewertern an
`cap === 0` gebunden, ein schlagender Zug ist also ausgenommen, und
`evalTsumego` belohnt ihn zusätzlich mit `tsumegoCapBonus` 1200. Gemessen
bekommen die beiden Züge +188 bzw. +2021.

Nur standen beide Weiß-Gruppen **schon vor dem Zug im Atari**, mit der
Schlagstelle als einziger Freiheit. Es war jeweils ein verlorenes
Schlagrennen, kein Fehler; Weiß verlor einen Stein mehr als beim Nichtstun.
Die Codestelle ist real, aber diese Partie belegt nicht, dass sie etwas kostet.

### Die Hungerzone: eine echte Fehlfunktion, deren Behebung nichts bringt

Eine externe Messreihe (hard gegen easy, Zugzeit und Simulationen je Zug) legte
eine Fehlfunktion im adaptiven Zeitbudget offen:

| Zug | dt (ms) | Faktor | ms/Sim | Sims |
|---:|---:|---:|---:|---:|
| 0 | 1817 | 1,01 | 8,8 | **206** |
| 160 | 1815 | **1,01** | 12,9 | 141 |
| 206 | 1859 | **1,03** | 14,3 | **130** |
| 320 | 3891 | 2,16 | 16,9 | 234 |
| 360 | 4142 | 2,30 | 11,9 | **349** |

Die Simulationszahl bricht über **Zug 136–238** auf 130 ein, während der
Skalierungsfaktor dort noch bei 1,03 steht. Die Kompensation kommt eine Phase
zu spät: bei Zug 320–360 gibt es Faktor 2,2–2,3 und ohnehin wieder 234–349
Sims. Ursache ist eine Entkopplung — ausgelöst wird über die **Kandidatenzahl**
(`adaptiveBudgetRefEmpty`, trotz des Namens nicht die freien Felder), teuer
wird es durch **wachsende Gruppen**: `ms/Sim` steigt ab Zug 0 stetig von 8,8
auf 14,4.

`refEmpty` heraufzusetzen lässt die Skalierung früher einsetzen. A ist der
ausgelieferte Default, die Budgets sind aus E[factor] über das gemessene
Kandidatenprofil abgeleitet (1,326 / 1,478 / 1,642), nicht aus Zeitquotienten.

| Arm | Skalierung ab | B-Siege | Rate | 95 %-CI | p (Bonferroni ×2) |
|---|---:|---:|---:|---:|---:|
| B1 `ref 220` @ 224 ms | Zug 137 | 60/120 | **50,0 %** | 40,7–59,3 % | 1,00 (1,00) |
| B2 `ref 300` @ 202 ms | Zug 62 | 65/120 | 54,2 % | 44,8–63,3 % | 0,41 (0,82) |

**Dass die Behandlung stattfand, ist belegt** — ohne diesen Nachweis wäre das
Ergebnis nicht deutbar. Anteil der Züge mit Skalierungsfaktor > 1 ab Zug 20:
A 43,6–45,1 % · B1 63,8–65,4 % · B2 87,1–87,5 %. Vorhergesagt aus dem Profil:
45 / 62 / 83 %. Phasensplit spät/früh 1,58 → 1,85 → 1,95. Gepoolte Zeitparität
+0,53 % und +1,58 %, beide im Band. Sims paritätisch, Farbbalance 60:60.

**Befund: die Fehlfunktion ist real, das Beheben bringt nichts Messbares.**
`ref 220` setzt die Skalierung exakt am Beginn der Hungerzone an (Zug 137 gegen
gemessene 136) und liefert exakt 50,0 %.

**Einschränkung, vorab gerechnet:** 120 Partien je Dosis erlauben einen
Nachweis erst ab 62,8 % (80 % Power). Ein kleiner Effekt bei B2 ist nicht
ausgeschlossen; ausgeschlossen ist ein *großer*. Zum Vergleich: `deathTransfer`
65,2 % über 210 Partien, `midLineWeight` 58,7 % über 300. Einen 54-%-Effekt
aufzulösen bräuchte rund 1500 Partien.

Der Default bleibt 150.

### `resignAreaMargin`: stark wirksam, ohne messbare Folge

Der Parameter, dessen Begründung die
[Nachmessung der vier Partien](#die-korrektur-2109-die-gegenprobe-war-blind)
widerlegt hat. 160 Partien, A = 30 (heutiger Default) gegen vier Dosen, je
40 Partien auf disjunkten Seeds.

**Der Arm beißt, und er ist saubere Dosisordnung.** Der neue Aufgabe-Wächter
zählt, wie oft Q die Aufgabeschwelle riss und wie oft das Gebietskriterium die
Aufgabe dann abfing:

| Lauf | B-Dosis | A fängt ab | B fängt ab | größter blockierter Rückstand B | B gab auf |
|---|---|---:|---:|---:|---:|
| 116 | aus (−1) | 83,3 % | **0,0 %** | 0 | 15× |
| 117 | 0 | 77,8 % | 6,7 % | 0 | 11× |
| 118 | 15 | 70,2 % | 58,2 % | 15 | 11× |
| 119 | 60 | 84,9 % | **93,4 %** | 60 | 2× |

Der größte blockierte Rückstand ist **exakt die Dosis** — der Parameter tut
genau das, was auf der Packung steht. Bei Marge 30 fängt er vier von fünf
Aufgaben ab, die Q auslösen will.

**Auf die Siegrate schlägt davon nichts durch:**

| B-Dosis | A : B | B-Anteil | 95 %-KI | p |
|---|---|---:|---|---:|
| aus (−1) | 21 : 19 | 47,5 % | [31,5; 63,9] | 0,875 |
| 0 | 22 : 18 | 45,0 % | [29,3; 61,5] | 0,636 |
| 15 | 20 : 20 | 50,0 % | [33,8; 66,2] | 1,000 |
| 60 | 26 : 14 | 35,0 % | [20,6; 51,7] | 0,081 |
| **gepoolt** | **89 : 71** | **44,4 %** | **[36,5; 52,4]** | **0,179** |

Keine Dosis signifikant (kleinstes p = 0,081 gegen eine Bonferroni-Schwelle von
0,0125), das gepoolte KI schließt 50 % ein, und die Werte sind **nicht
dosisgeordnet** — 47,5 / 45,0 / 50,0 / 35,0 %. Derselbe Befund wie bei
`atariSizeWeight`.

Der Kontrollarm ist diesmal unauffällig: A ist in allen vier Läufen identisch
konfiguriert, und seine unabhängigen Kennzahlen streuen nur um 11 %
(Gruppenverlust 24,1–26,8, Randanteil 33,9–36,0 %). Die Siegrate taugt hier
übrigens **nicht** als Kontrollarm-Maß: sie ist innerhalb eines Laufs
nullsummig, A ist per Konstruktion 100 % minus B.

#### Warum das Nullergebnis diesmal vorhersagbar war

Ich hatte vorab das Gegenteil vermutet: eine Aufgabe ist eine sofortige
Niederlage, wer seltener aufgibt kann nur gewinnen oder gleichziehen, also
müsste die hohe Marge dominieren. **Das war falsch, und die Zahlen zeigen
warum.** Weiterspielen wandelt eine Aufgabe-Niederlage meistens in eine
Zähl-Niederlage um — nur manchmal in einen Sieg. Gemessen an der Kreuzung
„Marge hat in dieser Partie eine Aufgabe abgefangen" gegen den Ausgang:

| | Partien mit Block | davon gewonnen |
|---|---:|---:|
| A (Marge 30) | 58 | 8 (13,8 %) |
| B (alle Dosen) | 37 | 6 (16,2 %) |
| **zusammen** | **95** | **14 (14,7 %)** |

Rund jede siebte abgefangene Aufgabe wird noch gewonnen. Hochgerechnet auf die
20 Partien je Lauf, die überhaupt per Aufgabe endeten, ist die **Obergrenze des
Effekts 3,2 Partien je 40 = 8,1 Prozentpunkte** — und das ist großzügig
gerechnet. Um 8,1 Punkte mit 80 % Macht nachzuweisen, bräuchte es rund **612
Partien je Dosis**; diese Kampagne hatte 40. Das 95 %-KI ist hier ±16 Punkte
breit.

Die Kampagne war also **unterdimensioniert, und zwar von der Bauart her**: der
Mechanismus kann gar nicht mehr als ein Achtel der Aufgabepartien bewegen.
Diese Zahl hätte ich vor dem Start ausrechnen können, nicht danach.

Die 14,7 % sind dabei eine **Obergrenze**, keine Rettungsquote: die
Aufgabe-Serie verlangt fünf qualifizierende Züge in Folge. Ein einzelner Block
bricht die Serie, aber ob sie ohne ihn je fünf erreicht hätte, sagt die
Messung nicht.

#### Eine Zahl, die ich nachgeprüft und nicht erklärt habe

In Lauf 119 sinken die Gesamtaufgaben von rund 20 auf 6. Der größere Teil ist
der Mechanismus: B fängt 93,4 % seiner Aufgaben ab, es bleiben fast nur noch
A-Aufgaben übrig, und 4 + 2 ergibt genau die 6. Aber auch **A** gab dort
seltener auf — 4-mal gegen 6/8/11 in den anderen Läufen, bei identischer
Konfiguration. Poisson-Streuung bei diesen Zahlen ist ±2,7; alle vier Werte
liegen innerhalb von 1,5 sd. Das Zug-Limit ist es nicht: **keine einzige
Partie** erreichte die 600 Züge. Also Rauschen, und kein Anlass, dafür einen
Mechanismus zu erfinden.

#### Was die Messung entscheidet und was nicht

Sie kann **nicht** sagen, ob die Marge weg soll. Sie sagt zwei Dinge:

1. Der Anlass ist widerlegt — die vier Aufgaben waren richtig.
2. Die Marge kostet **keine messbare Spielstärke**, in keiner Dosis. Sie zu
   entfernen kostet ebenfalls keine.

Damit ist die Frage keine Messfrage mehr, sondern eine Geschmacksfrage: soll
die KI bei 30 Punkten Rückstand `[roh]` — und `[roh]` unterschätzt den
Rückstand systematisch — aufgeben oder auspielen? Gegen einen Menschen ist das
Auspielen einer verlorenen Partie eher Ärgernis als Dienst, und genau das
bewirkt der Parameter heute. Das Gegenteil von dem, wofür er gebaut wurde.

#### Entschieden: abgeschaltet

**Der Default steht jetzt auf `-1`, das Kriterium ist aus.** Q allein
entscheidet wieder über die Aufgabe, wie vor dem vermeintlichen Fix.

Den Ausschlag gab nicht die Messung — die sagt bei beiden Wegen dasselbe —,
sondern der widerlegte Anlass. Ein Parameter, der gegen vier Fehlaufgaben
gebaut wurde, die keine waren, hat keine Grundlage mehr. Was ohne diese
Grundlage übrig bleibt, ist ein Kriterium, das die KI bei bis zu 30 Punkten
Rückstand `[roh]` weiterspielen lässt, wobei `[roh]` den Rückstand systematisch
unterschätzt.

Eine größere Kampagne hätte daran nichts geändert: 612 Partien je Dosis für
einen Effekt, dessen Obergrenze bei 8 Punkten liegt — teuer für eine Frage,
die keine Stärkefrage ist.

Die Mechanik bleibt unverändert in `gebietSagtVerloren` stehen und ist durch
den Aufgabe-Wächter messbar. Wer das Kriterium zurückholen will, setzt einen
Wert ≥ 0.

**Nebenwirkung, die man kennen muss:** wer eine Dashboard-Konfiguration
gespeichert hat, trägt darin weiterhin die 30 — `dashSave`/`dashLoad`
serialisieren das gesamte `PARAMS`-Objekt. Erst „Zurücksetzen" holt den neuen
Default.

### Transfer-Wächter: was `deathTransfer` wirklich anrichtet

`deathTransfer` zieht einer sterbenden Gruppe anteilig ihren Wert ab und
schreibt ihn dem Gegner als Gefangene gut. Der Parameter steht seit Ende
August auf 1,0 — aber niemand konnte sehen, wie oft er greift und wie groß
der Abzug ausfällt. Der Wächter macht das sichtbar.

**Hinter einem Schalter, und das ist der Punkt.** `evaluateBoard` läuft einmal
je Simulation, bei ~500 Sims/Zug also hunderte Male pro Zug — es ist die
heißeste Funktion der Engine. `transferTelemetrie` steht deshalb auf **0**;
dann wird kein zusätzlicher Zweig betreten und die Zähler kosten nichts.

Gemessen wird, je Farbe getrennt:

| Kennzahl | Frage |
|---|---|
| Rufe, Gruppen, je 1000 Bewertungen | greift die Übertragung überhaupt? |
| Abzug Ø und Maximum | wie hart trifft sie eine einzelne Gruppe? |
| **überkompensiert** | wie oft ist der Abzug **größer als der Gruppenwert**? |
| Gefangenen-Anteil | wie sehr beherrscht der Gefangenen-Term die Bewertung? |

Die dritte Zeile ist die interessante: übersteigt der Abzug den Gruppenwert,
zählt die Gruppe danach **negativ**, obwohl sie noch auf dem Brett steht.

**Erste Ablesung, zwei Partien, ausdrücklich kein Befund:** 4973 Eingriffe,
204,7 je 1000 Bewertungen, mittlerer Abzug 96, größter 820 — und **56 %
überkompensiert**. Das ist eine Stichprobe von zwei Partien auf einem
nicht reproduzierbaren Harness; ob die Quote hält und ob sie schadet, ist
offen. Sie wäre eine Dosisreihe wert.

**Bit-Identität in beide Richtungen**, über 8000 Bewertungen auf zufälligen
Brettern, verglichen gegen den Stand vor dem Eingriff und bitgenau (nicht
„ungefähr", `Object.is` trennt auch −0 von 0):

| | Abweichungen |
|---|---:|
| alt gegen neu, Telemetrie **aus** | **0** |
| alt gegen neu, Telemetrie **an** | **0** |

Bei ausgeschalteter Telemetrie zählt der Wächter 0 Rufe und 0 Gruppen; bei
eingeschalteter 8000 Rufe und 7716 Gruppen. Neutral bei 0, und er beißt
nachweislich.

#### Die Dosisreihe: die Ueberkompensation ist kein Schaden

360 Partien, A = `deathTransfer 1,0` (Default) gegen drei Dosen, je zwei
Läufe auf disjunkten Seeds, Telemetrie in **beiden** Armen. Der gemessene
Aufschlag der Zähler ist nicht von null zu unterscheiden (−1,1 % über 40 000
Aufrufe, also Rauschen), der Vergleich bleibt fair.

**Vorab festgehalten, bevor Rechenzeit floss:** primärer Endpunkt ist die
Ueberkompensationsquote, nicht die Siegrate. Bei 120 Partien je Dosis ist erst
ab 60 % etwas nachweisbar, und eine *Teildosis* gegen 1,0 muss kleiner
ausfallen als die 65,2 %, die 0 gegen 1,0 geliefert hat. Ein Nullergebnis bei
der Siegrate war also erwartet.

##### Die 56 % waren zu hoch — und es ist eine Treppe, kein Anstieg

Über **10,8 Millionen** Gruppen im 1,0-Arm: **38,0 %**, nicht 56 %. Die
Ablesung aus zwei Partien lag um die Hälfte daneben.

| `deathTransfer` | überkompensiert | Gruppen |
|---:|---:|---:|
| 0,5 | **3,9 %** | 4,33 Mio |
| 0,75 | 38,5 % | 3,22 Mio |
| **1,0 (Default)** | **38,0 %** | 10,79 Mio |
| 1,5 | **100,0 %** | 3,27 Mio |

Dass 0,75 und 1,0 praktisch gleich liegen, ist kein Zufall. Die Bedingung
`dT · RAMPE[libs] · size · captureWeight > size·5 + libs·3` ist mit
`STERBE_RAMPE = [1, 1, 0,5, 0,25]`, `captureWeight 20` und
`deathDiscountSize 6` reine Arithmetik:

| `dT` | libs 1 | libs 2 | libs 3 | ergibt |
|---:|---|---|---|---|
| 0,5 | alle | nie | nie | 3,9 % |
| 0,75 | alle | alle | nie | 38,5 % |
| 1,0 | alle | alle | nie | 38,0 % |
| 1,5 | alle | alle | alle | 100 % |

**0,75 und 1,0 treffen dieselbe Gruppenmenge.** Zwischen diesen beiden Werten
zu justieren kann die Ueberkompensation gar nicht verändern — die Stellschraube
ist die Rampe, nicht die Dosis.

##### Die Vermutung, die diese Kampagne ausgelöst hat, ist widerlegt

Der Verdacht war: wenn der Abzug den Gruppenwert übersteigt, zählt die Gruppe
negativ, obwohl sie noch steht — die Engine würde Stellungen zu schlecht
bewerten. **Der Arm mit 100 % Ueberkompensation hat am besten abgeschnitten,
nicht am schlechtesten.**

| B-Dosis | A : B | B-Anteil | 95 %-KI | p |
|---:|---|---:|---|---:|
| 0,5 | 64 : 56 | 46,7 % | [37,5; 56,0] | 0,523 |
| 0,75 | 69 : 51 | 42,5 % | [33,5; 51,9] | 0,120 |
| 1,5 | 50 : 70 | **58,3 %** | [49,0; 67,3] | 0,082 |

Keine Dosis signifikant (Bonferroni-Schwelle 0,0167). Die Richtung ist aber
über alle Messungen dieselbe: **mehr Übertragung ist besser, weniger ist
schlechter.**

##### Der Mechanismus ist deutlicher als die Siegrate — wie schon 2025

Gepaart **je Partie** gerechnet, nicht über Lauf-Mittelwerte: A und B spielen
dieselbe Partie gegeneinander, der Vergleich ist von Natur aus gepaart.

| B-Dosis | größter erlittener Einzelschlag | p | Gruppenverlust | p |
|---:|---:|---:|---:|---:|
| 0,5 | **+1,25** (B schlechter) | 0,035 | +0,19 | 0,714 |
| 0,75 | **+1,78** (B schlechter) | 0,031 | **+2,07** | 0,034 |
| 1,5 | −1,59 (B besser) | 0,223 | −2,17 | 0,195 |

Alle vier Vorzeichen zeigen in dieselbe Richtung. Die Übertragung zu
**senken** verschlechtert den Mechanismus messbar; sie zu **erhöhen** zeigt
denselben Trend nach oben, ohne die Schwelle zu reißen.

**Methodischer Punkt, der hier zählt:** der Kontrollarm A streut über die sechs
Läufe um 15 % (Gruppenverlust) bzw. 24 % (größter Schlag) — in der
Größenordnung des Effekts. Das entwertet die Tabelle oben aber **nicht**: die
Kontrollarm-Prüfung trifft Vergleiche *zwischen* Läufen, und diese Rechnung
ist *innerhalb* eines Laufs gepaart. Wo sie greift — bei der Siegrate je
Dosis — habe ich sie angewandt.

##### Was bleibt

**Default bleibt 1,0.** Die Messung gibt keine Änderung her: 1,5 zeigt in
jeder einzelnen Kennzahl in dieselbe Richtung, aber 58,3 % bei p = 0,082
liegt unter der vorab festgelegten Nachweisschwelle von 60 %.

Was die Kampagne **entschieden** hat, ist etwas anderes und war ihr Zweck: die
Ueberkompensation ist kein Schaden. Damit fällt der Anlass, einen Deckel zu
bauen, der den Abzug auf den Gruppenwert begrenzt — er hätte genau das
weggenommen, was der beste Arm am meisten tut.

Offen und billig zu klären: hält der 1,5-Trend? Bei 240 Partien je Dosis läge
dieselbe Rate bei p = 0,012 und damit unter der Bonferroni-Schwelle. Das ist
eine Verdopplung der Partienzahl, kein neuer Apparat.

#### Zwei Fehler, die dabei aufgefallen sind

**Der Harness-Rauchtest hat einen Namenskonflikt gefangen:** meine lokale
Variable `mxA` gab es in dem Ausgabeblock schon. Syntaxfehler, der jeden
Messlauf getötet hätte — bemerkt, bevor Rechenzeit verbrannt war.

**Die erste Fassung der Ausgabe hat gelogen.** Sie zeigte „Gruppen je
Bewertung **0.00**" direkt neben „50 % überkompensiert, Abzug Ø 30". Die
Rate war so klein, dass sie auf zwei Nachkommastellen verschwand — ein Leser
schließt daraus „greift nie" und deutet jedes Nullergebnis falsch. Jetzt
stehen dort absolute Zahlen plus eine Rate je 1000. Ein Wächter, der eine
missverständliche Zahl meldet, ist schlimmer als keiner: man glaubt ihm.

## Methodik

Drei Regeln, die aus Fehlern in diesem Projekt entstanden sind und im
Harness-Kopf ausführlicher stehen:

**Der Rauschboden ist gemessen, nicht geschätzt.** Zwei *identische*
Konfigurationen kamen über 20 Partien auf 7:13. Alles zwischen 30 % und 70 % ist
bei dieser Partienzahl mit reinem Zufall vereinbar — zwei früher vielversprechende
Kandidaten (60 % und 61 %) lagen darunter und wurden zu Recht verworfen.

**Erstlauf ist Hypothese, nicht Beleg.** Ein Bestätigungslauf mit frischem Seed
und einer *vor* dem Lauf festgelegten Schwelle entscheidet. Der Höchstwert einer
verrauschten Serie ist systematisch überschätzt, deshalb wurde beim
Skalen-Plateau die Mitte gewählt und nicht der Spitzenwert.

**Ein Nullergebnis zählt nur mit Wirksamkeitsnachweis.** Beim `resignQ`-Test
wurde mitgezählt, dass die Schwelle unterschiedlich oft feuerte (26 gegen 18
Aufgaben). Ohne diese Zahl wäre „der Parameter tat nichts" nicht von
„rechtzeitiges Aufgeben kostet nichts" zu unterscheiden gewesen.

**Erstläufe mit zwei Seeds parallel, nicht als ein längerer Lauf.** Beim
`phaseNormalize`-Test lieferte der erste Seed 32,5 % bei p = 0,039 — ein
„signifikantes" Ergebnis, das der zweite Seed mit 52,5 % nicht trug. Bei zwei
Tests rutscht rund jeder zehnte zufällig unter 0,05. Zwei parallele Läufe
kosten dieselbe Wanduhrzeit wie einer und nehmen die Replikation vorweg,
statt sie nachzuschieben.

**Werkzeugfehler sehen aus wie Nullergebnisse.** Der Harness übergab
`getAIMove` jahrelang `lastMove = null`, während das Spiel den echten Wert
übergibt. Der davon abhängige Lokalitätsterm konnte im Harness also gar nicht
feuern — ein A/B darüber hätte strukturell 50 % geliefert. Dasselbe beim
Policy-Netz: die Klasse stand im Haupt-Skript, `globalThis.policyNet` war im
Harness `undefined`, der Blend-Zweig damit tot. Und selbst nach der Extraktion
blieb ein zweites stilles Tor — `blendWeight` liefert unter zwei gespielten
Partien 0. Vor der Deutung eines Nullergebnisses gehört deshalb der Nachweis,
dass der Parameter im Messaufbau überhaupt erreichbar *und* wirksam war; der
Harness zählt dafür `PHASENWECHSEL` mit, und für das Netz **zwei** Zahlen —
Vorwärtsläufe und davon solche mit Wirkung auf die Zugwahl. Ein Zähler
genügte nicht: seit Beobachten und Steuern getrennt sind, läuft das Netz bei
jedem Zug, ohne deshalb etwas zu bewirken.

Abgelehnte Befunde stehen als Kommentar an der jeweiligen Codestelle. Sonst
wird derselbe Versuch in einem Jahr erneut gefahren und die Untersuchungskosten
fallen zweimal an.

## Repository

```
index.html                      Spiel und Engine, eine Datei
ab-harness.js                   Messrahmen; Kopfkommentar = Versuchsprotokoll
distillation/                   Überwachtes Training fürs Policy-Netz
tests/                          Regressionstests (node tests/run.js)
.github/workflows/tests.yml       Regressionstests bei jedem Push und PR
.github/workflows/ab-harness.yml  Messläufe in CI, manuell startbar
```

[`tests/`](tests/) prüft die NaN-Schutzschichten und die Trainings-Stabilität —
ohne `node_modules`, gegen dieselben `<script>`-Blöcke, die ausgeliefert
werden. Ein Test gegen eine Kopie prüft irgendwann etwas, das niemand
ausliefert. Der Browser-Test braucht zusätzlich Playwright und überspringt
sich ohne es.

[`distillation/`](distillation/) enthält die Kette, um dem Policy-Netz starke
Züge beizubringen, statt es aus Selbstspiel lernen zu lassen — samt der
Prüfungen, die sicherstellen, dass ein Nullergebnis am Ende auch wirklich
eines ist.

## Lizenz

Siehe [LICENSE](LICENSE).
