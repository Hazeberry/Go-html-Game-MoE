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
