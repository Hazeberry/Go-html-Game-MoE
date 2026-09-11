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

Gegen Rückfall abgesichert in [`tests/`](tests/): 29 Fälle in fünf Dateien,
drei davon im echten Browser mit Web Worker. Am Stand vor dem Fix fallen
16 davon durch — die übrigen prüfen bewusst unverändertes Verhalten und
müssen auf beiden Ständen halten.

### Die KI gab in ausgeglichener Stellung auf

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

#### Behoben wurde stattdessen das Kriterium

`resignAreaMargin` (Default 30) verlangt, dass **auch** die Gebietsschätzung
verloren sagt. `estimateArea` ist dafür kein neuer willkürlicher Maßstab: auf
allen vier Stellungen liefert es exakt dasselbe wie `finalAreaScore`, also die
Endabrechnung des Spiels. Die vier Rückstände lagen bei −6, +3, +11 und +13
Punkten; ab Marge 14 wären alle vier verhindert, 30 lässt Luft. Bei echtem
Rückstand wird weiterhin aufgegeben.

Bewusste Unschärfe: Komi 7,5 fließt nicht ein — die Engine ist komi-blind, und
den Worker dafür an den Zählmodus zu koppeln wäre der teurere Fehler. Weiß gibt
dadurch um 7,5 Punkte zu früh auf, Schwarz ebenso viel zu spät.

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

Nachmessung auf Dosis 1,00 über 210 Partien läuft. Default bleibt 0.

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
