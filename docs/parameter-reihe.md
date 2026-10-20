# Vier offene Parameter: raveK, mctsPriorSharp, phaseBlendWidth und die Pass-Kurve

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Hazeberry fragte am 20.10.2026, ob sich vier offene Punkte abhaken lassen:
`raveK`, `mctsPriorSharp` und `phaseBlendWidth` („unverändert offen“) sowie die
Kurve `passMinMc` („die einzige gewichtete Region ohne Kommentar und ohne
Messung, nicht-monoton (−50, 20, 8, 10)“). Der Stand im Repo:

- **Nie gemessen.** `raveK` = 300, `phaseBlendWidth` = 8 und `passMinMc40/80/120/150`
  = −50 / 20 / 8 / 10 stehen seit dem ersten Commit unverändert im Code,
  `mctsPriorSharp` = 3 seit der Einführung des Softmax-Priors (Commit `fe8cdcc`).
  Keine Messreihe des Projekts (README, `docs/`) hat sie je verändert. Gemessen
  wurden nur Nachbarn: `phaseNormalize` (die Normierung der Experten in der
  Übergangszone, verworfen) und `endgameMoves` (die Lage der Grenze,
  [`endspielgrenze.md`](endspielgrenze.md)).
- **Was sie tun.** `raveK` bestimmt, wie lange der AMAF-Wert in den Knoten der
  PUCT-Suche mitgewichtet wird: β = √(K / (3 N + K)), N sind die Besuche des
  Kindes. Bei 120 Simulationen je Zug ist N nirgends größer als 120, und mit
  K = 300 liegt β in jedem Knoten bei mindestens 0,67: Der AMAF-Wert zählt dort
  mehr als Q.
  `mctsPriorSharp` ist die Schärfe des Softmax-Priors über die Heuristikwerte der
  Kandidaten: Der beste Kandidat bekommt das e^Schärfe-fache Gewicht des
  schlechtesten (3: rund 20-fach); 0 ist der alte, fast flache Rang-Prior.
  `phaseBlendWidth` ist die Breite der Übergänge zwischen den Experten
  (smoothstep über ± Breite Züge); 0 ist die harte Umschaltung.
- **Die Pass-Kurve.** `wantsToPass` in `getAIMove` ist eine ODER-Verknüpfung:
  (Zug > 40 und bester Wert < −50) oder (Zug > 80 und < 20) oder (Zug > 120 und
  < 8) oder (Zug > 150 und < 10). Jede Stellung, die den dritten oder vierten
  Term auslöst, löst schon den zweiten aus, denn 8 und 10 sind kleiner als 20.
  **Die Einträge für Zug 120 und 150 sind bei den Defaults wirkungslos**; das
  Dashboard bietet sie auch nicht an. Wirksam sind nur die Stufen bei Zug 40
  und 80. Auch die greifen heute nur ganz am Ende: Die Schwellen stammen aus
  einer Zeit, in der Zugwerte in den Zehnern lagen. Die Sonde
  [`pass-sonde.js`](../auswertung/pass-sonde.js) hat vier ganze Partien
  mitgeschrieben (die Partien 1 bis 4 von Seed 206, Bedingungen von §3, 351 Züge
  der KI nach Zug 80; die Protokollzeile ändert nichts am Spiel): Der beste
  Kandidat liegt dort im Median bei 906 (5 %: 130, 25 %: 428, 75 %: 1717). Unter
  20 liegt er in 5 von 351 Zügen (1,4 %), alle ganz am Ende der Partien (letzte
  Werte 19, −60, −41, −85), unter 60 in 2,6 %, unter 100 in 4,0 %, unter 300 in
  15,1 %. Zwischen 20 und 35 liegt kein einziger Wert, zwischen 8 und 20
  einer. Schwellen zwischen 8 und 35 sind in der Praxis gleichwertig; sie legen
  nur fest, bei welchem der letzten Züge die KI zu passen ansetzt. Dazu passt der
  Befund des Orakel-Tests ([`muster-endspiel-orakel.md`](muster-endspiel-orakel.md)
  §8): Die KI spielt nach dem ersten Pass der Partie im Mittel noch 29 Züge
  weiter, ohne dass sich der Endstand dadurch ändert (+1,15, SE 1,06). Eine
  Schwelle auf der heutigen Skala liegt bei einigen Hundert; dort setzen die
  Arme P300 und PNIE an.

Gemessen wird nach der Regel, die seit [`teststaerke.md`](teststaerke.md) gilt:
240 Paare gegen GNU Go, Endstand, gepaart.

## 2. Arme

| Arm | Ändert gegenüber dem Default | Frage |
|---|---|---|
| **A** | nichts | Referenz; spielt dieselben Partien wie Arm A der Messung M1 (Seed 206) |
| **N** | `passMinMc120=-1000,passMinMc150=-1000` | Negativkontrolle, 30 Partien: Die beiden Einträge sind nach §1 wirkungslos, N muss Zug für Zug dasselbe spielen wie A |
| **RAUS** | `raveEnabled=0` | Trägt RAVE bei 120 Simulationen überhaupt? |
| **R30** | `raveK=30` | RAVE früher abklingen lassen (Faktor 10 unter dem Default) |
| **R3000** | `raveK=3000` | RAVE länger stark gewichten (Faktor 10 darüber) |
| **S0** | `mctsPriorSharp=0` | alter Rang-Prior statt Softmax: Trägt der Score-Prior? |
| **S1** | `mctsPriorSharp=1` | flacherer Prior (bester Kandidat 2,7-fach statt 20-fach) |
| **S9** | `mctsPriorSharp=9` | schärferer Prior (rund 8000-fach) |
| **B0** | `phaseBlendWidth=0` | harte Umschaltung der Experten |
| **B24** | `phaseBlendWidth=24` | dreimal so breite Übergänge |
| **P300** | `passMinMc80=300` | Pass-Prüfung ab Zug 81 schon bei bestem Kandidaten unter 300 (15 % der Züge statt 1,4 %): Schadet es, früher zu passen, wenn der Gegner nichts Großes mehr hat? |
| **PNIE** | `passMinMc80=-50,passMinMc120=-50,passMinMc150=-50` | Pass-Prüfung nur bei bestem Kandidaten unter −50, also fast nie: Bringt das Passen überhaupt etwas? |

Die Arme sind Klammern um den Default und die Ausschaltungen RAUS, S0 und B0,
keine gesuchten Optima.

## 3. Messung

Bedingungen wie in der Messung M1: Gegner GNU Go Stufe 1, neun Vorgabesteine,
120 Simulationen (`mctsFixedSims=120`), Aufgabe der KI aus, GNU Go gibt nicht
auf, bis 600 Züge, ausgespielt. Seed **206**, 240 Partien je Arm in 16 Teilläufen
zu 15 (Partien 1 bis 240), N nur die Partien 1 bis 30; gleiche Partienummer in
allen Armen ist ein Paar. Arm A spielt Zug für Zug dieselben Partien wie Arm A
der Messung M1. Der Lauf prüft das (Eingabe `kontrolle`: gleicher Endstand und
gleiche Zugzahl je Partie, erwartet 240 von 240).

Der Code ist der des Dispatch-Commits von `main`: `index.html` unterscheidet
sich von dem der Messung M1 nur in einem Kommentar (PR #173), `gnugo-duell.js`
kennt seitdem die Option `--orakel-zug`, die ohne Angabe nichts ändert (der
Orakel-Test hat Arm A der Messung M1 in 120 von 120 Partien wiedergegeben). Es
gibt keinen Schalter und keine Tabelle; die Arme unterscheiden sich nur in
`--ki` ([`parameter-arme.sh`](../auswertung/dagger/parameter-arme.sh)). Der Lauf
geschieht in GitHub Actions
([`parameter-reihe.yml`](../.github/workflows/parameter-reihe.yml), 178 Jobs:
11 Arme × 16 Teile und 2 Teile der Negativkontrolle). Eine Selbstspiel-Messung
(M2) gehört nicht zu dieser Reihe; sie käme nur für einen Kandidaten (§4).

## 4. Endpunkt und Entscheidungsregel

**Primär** je Arm gegen A: die Differenz des Endstands nach GNU Gos Zählung,
gepaart nach Partienummer, zweiseitiger t-Test, mit 95-%-Intervall.

Zehn Vergleiche laufen gegen dasselbe A. Damit nicht einer von zehn nur durch
Zufall auffällt, gilt als Schwelle je Vergleich **α = 0,005** (Bonferroni, 0,05
durch 10). Ein p unter 0,05 ist ein Hinweis, keine Entscheidung.

| Ergebnis des Arms gegen A | Lesart | Folge |
|---|---|---|
| besser, p < 0,005 | Kandidat | Nachmessung dieses Arms allein, 240 Paare mit frischem Seed, dazu M2 (Selbstspiel, 360 Partien). Default nur, wenn die Nachmessung besser ist (p < 0,05) und M2 nicht signifikant unter 50 % liegt |
| besser, 0,005 ≤ p < 0,05 | Hinweis | Default bleibt; eine Nachmessung nur, wenn Hazeberry sie will |
| schlechter, p < 0,005 | schlechter | Default bestätigt gegen diesen Wert. Bei RAUS, S0 und B0 ist belegt, dass der Bestandteil trägt; sein Wert ist die Differenz |
| schlechter, 0,005 ≤ p < 0,05 | Hinweis | Default bleibt |
| sonst, Obergrenze des 95-%-Intervalls unter +10 | verworfen | Default bleibt; ein Gewinn von 10 Punkten ist ausgeschlossen |
| sonst | nicht belegt | Default bleibt; kleinere Effekte sind mit dieser Paarzahl nicht erkennbar (§5) |

**Negativkontrolle N:** erwartet 30 von 30 Partien Zug für Zug gleich A
(Zugfolge und Endstand). Weicht eine ab, ist die Lesart des Codes in §1 falsch,
und der Nachtrag korrigiert §1.

**Kontrolle A gegen M1:** erwartet 240 von 240.

**Pass-Arme.** Ändern P300 oder PNIE den Endstand nicht, wohl aber die Länge
der Partien, ist das ein Befund über Rechenzeit und Spielgefühl, kein Gewinn an
Stärke. Spart P300 mindestens 10 % der Züge und liegt die Untergrenze des
95-%-Intervalls der Endstand-Differenz nicht unter −10, lege ich Hazeberry vor,
ob P300 Default werden soll. Die Entscheidung trifft nicht diese Festlegung.

**Sekundär, ohne Anspruch:** Hälften, Siege, Median und Vorzeichentest, Stand
nach Zug 120, Züge je Partie (bei P300 und PNIE: Verkürzen oder verlängern sie
die Partien?), die Zahl der Partien, die Zug für Zug dieselben sind wie in A,
abgebrochene Partien.

## 5. Erkennbare Größe und Erwartung

Die Streuung der Paardifferenz liegt bei 55 bis 65 Punkten (Messung M1: 55;
[`teststaerke.md`](teststaerke.md) §3: rund 65). Mit 240 Paaren ist der
Standardfehler 3,6 bis 4,2. Bei α = 0,05 sind Effekte ab 10 bis 12 Punkten mit
80 % Teststärke erkennbar, bei α = 0,005 ab 13 bis 15; ein echter Effekt von 12
Punkten wird bei α = 0,005 in 50 bis 70 % der Fälle gefunden. Kleinere Effekte
bleiben unmessbar (`teststaerke.md` §6): Ein Nullergebnis heißt dann „nicht
belegt“.

**Erwartung vorab, ohne Wirkung auf die Lesart:** Bei R30, R3000, S1, S9, B0
und B24 erwarte ich Differenzen innerhalb von ±10 Punkten und bei keinem die
Schwelle. PNIE liegt innerhalb von ±5: Es ändert nur, bei welchem der letzten
Züge die KI passt (§1). P300 kostet eher Punkte, −15 bis +3, weil die KI dann
schon in rund jedem siebten Zug prüft, ob sie passen kann. Einen Ausschlag
erwarte ich nur bei den Ausschaltungen: S0 (Rang-Prior) deutlich schlechter, −10
bis −40; RAUS zwischen −15 und +5. N ist gleich A. Das steht hier, damit sich
die Erwartung nicht nachträglich anpassen lässt.

**Trockenlauf vor dieser Festlegung.** Je Arm lief Partie 1 von Seed 206 zur
Probe, bei den Pass-Armen und bei N als ganze Partie, sonst über die ersten 60
Züge. Die Partien gehören zur Messung; der Lauf spielt sie noch einmal und muss
dieselben Zugfolgen ergeben. Keiner der zwölf Arme stürzt ab oder meldet eine
Warnung. In den ersten 60 Zügen spielen N und RAUS dieselben Züge wie A; R30,
R3000, S1 und B0 weichen bei Zug 26 ab, S0 bei Zug 18, S9 und B24 bei Zug 6.
N spielt die ganze Partie (284 Züge, Endstand −0,5) Zug für Zug wie A. P300
passt in dieser Partie bei Zug 240 statt 284, PNIE spielt 329 statt 284 Züge; der
Endstand ist in beiden −0,5 wie in A. Die Erwartung oben ist vor diesem
Trockenlauf geschrieben und bleibt stehen. Eine erste Fassung der Pass-Arme
(`passMinMc80=35`) wurde nach der Sonde aus §1 verworfen: Zwischen 20 und 35 lag
in 351 Zügen kein Wert, der Arm hätte in Partie 1 nichts geändert.

## 6. Grenzen

- Die Arme sind Klammern, keine Optima. Ein Nullergebnis bei R30 und R3000
  sagt, dass ein Faktor 10 nach oben und unten keinen Effekt von 12 Punkten und
  mehr hat; es sagt nicht, dass 300 das Optimum ist.
- Gemessen wird der Einzeleffekt je Parameter, keine Wechselwirkung (RAVE und
  Prior wirken zusammen auf dieselben Knoten).
- Die Messung läuft mit 120 Simulationen je Zug; im Spiel gilt ein Zeitbudget
  mit mehr Simulationen. Bei größerer Zahl sinkt β in den Knoten, und die Rolle
  von RAVE und Prior kann sich verschieben.
- Ein Seed, ein Gegner (GNU Go Stufe 1), neun Vorgabesteine.
- Bonferroni ist streng (§5). Das Urteil „verworfen“ nutzt wie in den früheren
  Messungen das 95-%-Intervall, nicht das Intervall zu α = 0,005.
- Die Pass-Arme messen den Endstand. Ob sie Züge und Rechenzeit sparen, wird
  berichtet, entscheidet aber nichts.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 206 |
| `kontrolle` | `docs/daten/endspiel-messung/lauf1/A.jsonl.gz` (Arm A der Messung M1) |

Jobs: `pruefen` (Eingaben), `spielen` (11 Arme × 16 Teile zu 15 Partien und 2
Teile von N), `ergebnis` (Bericht mit `auswertung/parameter-bericht.js` und
`messung-zusatz.js`, Rohdaten gepackt). Die Ergebnisse legt der Workflow auf den
Branch `ergebnisse/parameter-reihe-lauf<N>` unter
`docs/daten/parameter-reihe/lauf<N>/`, dazu als Artefakt (90 Tage). Nur der
letzte Job darf ins Repo schreiben, und nur auf einen neuen Branch. Erwartet
werden 50 bis 70 Minuten für den ganzen Lauf (20 Jobs gleichzeitig, ein Teil
dauert 4 bis 8 Minuten).

## 8. Nachtrag: Ergebnis der Messreihe (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `parameter-reihe.yml`
([Run 39353518498](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39353518498)),
auf dem Merge-Commit `c14831c` von `main`, mit den Eingaben aus §7, in 49
Minuten (01:27 bis 02:16 UTC). Alle 2 670 Partien ausgespielt (11 Arme zu 240 und
N zu 30), keine abgebrochen. Die Ergebnisse legte der Workflow auf den Branch
`ergebnisse/parameter-reihe-lauf1`; sie stehen hier unter
[`daten/parameter-reihe/lauf1/`](daten/parameter-reihe/lauf1/): der Bericht, die
Partien aller Arme und die Zusatzzahlen. Die Tabelle der Siege (`siege.md`) kam
danach dazu, aus denselben Partien mit `parameter-bericht.js --siege`.

**Kontrollen.** Die Negativkontrolle N spielt in **30 von 30** Partien Zug für Zug
dasselbe wie A: Die Einträge `passMinMc120` und `passMinMc150` sind bei den
Defaults wirkungslos, wie §1 aus dem Code gelesen hatte. Arm A gibt Arm A der
Messung M1 in **240 von 240** Partien wieder.

**Endpunkt** (240 Paare je Arm, Endstand nach GNU Gos Zählung, gepaart, Seed 206;
Schwelle je Vergleich α = 0,005):

| Arm | Parameter | Endstand Ø | Siege | Züge Ø |
|---|---|---:|---:|---:|
| A | Default | +20,8 | 149 | 241,6 |
| RAUS | `raveEnabled=0` | +24,3 | 152 | 236,3 |
| R30 | `raveK=30` | +19,3 | 153 | 236,5 |
| R3000 | `raveK=3000` | +20,3 | 145 | 241,7 |
| S0 | `mctsPriorSharp=0` | −37,8 | 72 | 283,2 |
| S1 | `mctsPriorSharp=1` | −21,5 | 100 | 272,2 |
| S9 | `mctsPriorSharp=9` | +28,1 | 189 | 222,6 |
| B0 | `phaseBlendWidth=0` | +18,1 | 146 | 240,9 |
| B24 | `phaseBlendWidth=24` | +21,1 | 152 | 243,0 |
| P300 | `passMinMc80=300` | +19,1 | 146 | 213,7 |
| PNIE | `passMinMc80/120/150=-50` | +20,9 | 148 | 255,8 |

| Arm − A | Differenz | 95 % | p | Hälfte 1 / 2 | nach Zug 120 | Zug für Zug gleich A | Urteil nach §4 |
|---|---:|---|---:|---|---:|---:|---|
| RAUS | +3,6 | [−4,6; +11,7] | 0,39 | +2,1 / +5,0 | −4,2 | 0 | nicht belegt |
| R30 | −1,4 | [−9,8; +7,0] | 0,74 | −2,1 / −0,7 | −1,6 | 0 | verworfen |
| R3000 | −0,4 | [−8,1; +7,2] | 0,92 | −6,3 / +5,5 | +2,0 | 0 | verworfen |
| **S0** | **−58,6** | [−70,4; −46,8] | 2,7 · 10⁻¹⁹ | −49,9 / −67,3 | −15,6 | 0 | **schlechter** |
| **S1** | **−42,2** | [−54,3; −30,1] | 5,2 · 10⁻¹¹ | −44,3 / −40,1 | −6,1 | 0 | **schlechter** |
| **S9** | **+7,3** | [+0,2; +14,5] | 0,045 | +9,1 / +5,6 | −9,6 | 1 | **Hinweis: besser** |
| B0 | −2,7 | [−9,6; +4,3] | 0,45 | −5,9 / +0,6 | −0,1 | 1 | verworfen |
| B24 | +0,3 | [−8,5; +9,1] | 0,94 | −0,9 / +1,6 | +0,0 | 0 | verworfen |
| P300 | −1,6 | [−3,8; +0,6] | 0,15 | −3,5 / +0,3 | −0,0 | 7 | verworfen |
| PNIE | +0,2 | [−0,6; +1,0] | 0,65 | −0,1 / +0,5 | +0,0 | 126 | verworfen |

„Verworfen“ heißt nach §4: Die Obergrenze des 95-%-Intervalls liegt unter +10, ein
Gewinn von 10 Punkten ist ausgeschlossen. **Kein Arm erreicht die Schwelle für
einen Kandidaten**; S9 liegt bei p = 0,045, also im Bereich „Hinweis“.

**Die vier Punkte.**

- **`raveK`: ohne Wirkung.** Ein Faktor 10 nach unten (−1,4) und nach oben (−0,4)
  verändert den Endstand nicht, und RAVE ganz abzuschalten kostet nichts
  (+3,6 [−4,6; +11,7], nicht belegt). Bei 120 Simulationen nützt RAVE also
  höchstens rund 5 Punkte; ob es schadet, bleibt offen (Obergrenze +11,7). Der
  Default 300 bleibt.
- **`phaseBlendWidth`: ohne Wirkung.** Harte Umschaltung (−2,7) und dreifache
  Breite (+0,3) liegen beide im Rauschen. Der Default 8 bleibt.
- **`passMinMc`: wirkungslos, was die Stärke angeht.** Die Einträge für Zug 120 und
  150 tun nichts (N: 30 von 30). Auch die Höhe der Schwelle ändert den Endstand
  nicht: Pass-Prüfung nur unter −50 +0,2 [−0,6; +1,0], schon unter 300 −1,6
  [−3,8; +0,6]. Sie bestimmt nur, wann die KI aufhört: PNIE spielt 14 Züge länger
  (255,8 gegen 241,6), P300 28 kürzer (213,7). Die Kurve bleibt; im Code steht
  jetzt, was sie tut.
- **`mctsPriorSharp`: der Prior trägt, und der Default ist nicht das Optimum.**
  Die Siegrate steigt monoton mit der Schärfe: 72 (Rang-Prior), 100 (1), 149
  (Default 3), 189 (9) von 240, also 30 %, 42 %, 62 %, 79 %; der Endstand −58,6,
  −42,2, 0, +7,3. Dass S0 und S1 deutlich schlechter sind, ist belegt (p < 10⁻¹⁰).
  S9 ist nach der vorab festgelegten Regel ein **Hinweis** (Endstand p = 0,045,
  Schwelle 0,005). Die Siege, nur sekundär, sind deutlicher: In 58 Paaren gewinnt
  nur S9, in 18 nur A (McNemar, exakt, p = 4,7 · 10⁻⁶). Der Endstand bewegt sich
  weniger, weil S9 Partien enger gewinnt (Ø der Siege +44,7 gegen +52,2) und
  Niederlagen etwas höher verliert (−33,6 gegen −30,7). Nach Zug 120 liegt S9
  schlechter (−9,6, p = 0,0003), am Ende besser: Der Gewinn entsteht nach Zug 120.
  Nach §4 bleibt der Default 3; **eine Nachmessung von S9 und höheren Dosen mit
  frischem Seed ist die naheliegende Folge** und wird Hazeberry vorgeschlagen.

**Pass-Arme (§4).** P300 spart 27,9 Züge je Partie (11,5 %), und die Untergrenze
des Intervalls (−3,8) liegt nicht unter −10: Die Bedingung aus §4 ist erfüllt,
Hazeberry entscheidet, ob P300 Default werden soll. Zu bedenken ist: Der
Vorzeichentest sieht B schlechter in 66 und besser in 31 Paaren (143 gleich,
p = 0,0005), also einen kleinen, systematischen Verlust von rund 1,6 Punkten; die
Siege ändern sich nicht (146 gegen 149, McNemar p = 0,61). Empfehlung: nein, die
Ersparnis sind Züge am Ende der Partie, keine Stärke.

**Gegen die Erwartung aus §5.** Die Erwartung stand vor dem Lauf und bleibt stehen.
Abweichungen gab es bei den Armen mit dem Prior: S0 liegt mit −58,6 unter dem
erwarteten Bereich (−10 bis −40), und S1 (−42,2) sollte innerhalb von ±10 liegen.
R30, R3000, B0, B24, RAUS (+3,6 im Bereich −15 bis +5), P300 (−1,6 im Bereich −15
bis +3), PNIE und N trafen die Erwartung.

**Sekundär, ohne Anspruch.** Siege gepaart in
[`siege.md`](daten/parameter-reihe/lauf1/siege.md); Median der Differenz in allen
Armen 0 bis auf RAUS (+1,0), S0 (−59,0) und S1 (−38,0). Vorzeichentest: P300 31 gegen 66
(p = 0,0005), alle anderen Arme außer S0 und S1 ohne Auffälligkeit. Keine Partie
abgebrochen.

**Grenzen der Aussage.** Die Messung läuft mit 120 Simulationen je Zug und gegen
GNU Go Stufe 1; im Spiel gilt ein Zeitbudget mit mehr Simulationen, bei dem das
Gewicht von Prior und RAVE anders aussehen kann. Gemessen ist der Einzeleffekt je
Parameter. Ein Nullergebnis heißt bei RAUS „nicht belegt“, bei den übrigen „kein
Gewinn von 10“; kleinere Effekte sind mit 240 Paaren unmessbar. Der Befund zu S9
stammt aus einem Seed und gehört nachgemessen, ehe er eine Änderung trägt.
