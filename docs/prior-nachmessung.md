# Nachmessung der Prior-Schärfe und `bensonDeathTransfer` gegen GNU Go

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

Ein Lauf in GitHub Actions beantwortet zwei getrennte Fragen. Sie teilen sich
nur den Referenzarm A:

1. **Hält der Befund zu `mctsPriorSharp` mit frischem Seed?** Und liegt das
   Optimum bei 9, höher oder bei einem Prior, der erst spät schärfer wird?
2. **Wirkt `bensonDeathTransfer` gegen GNU Go?** Bisher ist er nur im
   Selbstspiel gemessen.

---

## 1. Anlass

**Frage 1.** In der Parameter-Reihe ([`parameter-reihe.md`](parameter-reihe.md)
§8; Seed 206, 240 Paare je Arm gegen GNU Go) trug der Prior deutlich, und
schärfer war besser:

| `mctsPriorSharp` | Endstand gegen 3 | 95 % | Siege von 240 |
|---:|---:|---|---:|
| 0 (alter Rang-Prior) | −58,6 | [−70,4; −46,8] | 72 |
| 1 | −42,2 | [−54,3; −30,1] | 100 |
| **3 (Default)** | 0 | | 149 |
| 9 | **+7,3** | [+0,2; +14,5], p = 0,045 | **189** |

Nach der vorab festgelegten Regel der Reihe (zehn Vergleiche, Schwelle je
Vergleich α = 0,005) war 9 nur ein **Hinweis**. Die Siege, dort nur sekundär,
sind deutlicher: In 58 Paaren gewinnt nur S9, in 18 nur A (McNemar, exakt,
p = 4,7 · 10⁻⁶). Der Endstand bewegt sich weniger, weil S9 enger gewinnt und
etwas höher verliert. Hazeberry hat am 20.10.2026 die vorgeschlagene
Nachmessung beauftragt, mit höheren Dosen und einem phasenabhängigen Prior.

**Der Phasen-Befund.** Gemessen an GNU Gos Schätzung (`estimate_score`) liegt S9
nach Zug 120 **hinter** A, −9,6 [−14,7; −4,5] über 240 Paare, nach Zug 200
**vorn**, +11,6 [+2,6; +20,7] über die 126 Paare, die so lange laufen, und am
Ende bei +7,3. Der Gewinn entsteht also nach Zug 120. Das legt einen Prior nahe,
der bis Zug 120 beim Default bleibt und erst danach schärfer wird. Er sollte den
Rückstand vermeiden und den späten Gewinn behalten. Ob GNU Gos Schätzung bei Zug
120 den Stil von S9 nur anders liest, ist offen; der Arm PH (§2) prüft es im
Spiel.

**Frage 2.** `bensonDeathTransfer` (Default 0) schließt eine gemessene
Nicht-Monotonie in `evaluateBoard`: Eine bewiesen tote Kette kostet bisher
nichts, dieselbe Kette im Atari kostet ihre volle Größe. Im Selbstspiel wirkt der
Mechanismus (Züge in später sterbende Gruppen 0,346 → 0,247, tote Steine je
Partie 12,85 → 9,59), die Siegrate bewegt sich nicht (51,7 % und 48,3 %, gepoolt
360 von 720; [`pilot-benson-defense.md`](pilot-benson-defense.md) §12, §15).
Gegen GNU Go ist er nie gemessen. Der Kommentar an der Stelle in `index.html`
sagt das seit dem 20.10.

## 2. Arme

| Arm | `--ki` | Frage | Partien gegen GNU Go |
|---|---|---|---:|
| **A** | (Default: `mctsPriorSharp` 3, `bensonDeathTransfer` 0) | Referenz für beide Fragen | 480 |
| **S9** | `mctsPriorSharp=9` | 1, Nachmessung | 480 |
| **S15** | `mctsPriorSharp=15` | 1, höhere Dosis | 240 |
| **S30** | `mctsPriorSharp=30` | 1, höhere Dosis | 240 |
| **PH** | `mctsPriorSharp@120=9` | 1, bis Zug 120 Default 3, danach 9 | 240 |
| **BT** | `bensonDeathTransfer=1` | 2 | 240 |

Alle Arme spielen mit `mctsFixedSims=120,resignEnabled=0`; sonst gilt der
Default des Dispatch-Commits.

**Was die Schärfe tut.** Der Prior der Suche ist eine Softmax über die
Heuristik-Scores der Kandidaten mit der Temperatur Spannweite / Schärfe. Bei
Schärfe s bekommt der schlechteste Kandidat das e^(−s)-fache Gewicht des besten:
bei 3 rund 1/20, bei 9 rund 1/8 000, bei 15 rund 1/3 · 10⁶, bei 30 rund
1/10¹³. Ab 15 liegt fast die ganze Prior-Masse auf den besten Kandidaten, bei 30
ist er nahezu gierig. Wo die Kurve kippt, ist offen.

**PH, neu im Duell-Skript.** `gnugo-duell.js` nimmt in `--ki` jetzt Phasenstufen
wie `ab-harness.js`: `name@N=wert` gilt ab der Zugzahl N (mc ≥ N, gezählt ab dem
ersten gespielten Zug; bei neun Vorgabesteinen zieht GNU Go die geraden, die KI
die ungeraden). Beim Wechsel wird der gespeicherte Suchbaum verworfen, wie im
Harness; sonst trügen wiederverwendete Knoten die Priors der alten Stufe. Der
erste Zug der KI mit Schärfe 9 ist der 122. Zug der Partie (mc = 121; der 121.
gehört GNU Go). Bis dahin spielt PH Zug für Zug wie A, auch GNU Gos Schätzung
nach Zug 120 ist in jedem Paar dieselbe. Der Bericht
prüft das (§3). Ohne `@` ändert die Neuerung nichts: Arm A spielte vor dieser
Festlegung die Partien 1 und 2 von Seed 206 Zug für Zug wie Arm A der
Parameter-Reihe, PH wich dort erst bei Zug 198 und 166 ab, mit genau einem
Phasenwechsel je Partie (Trockenlauf im Container).

## 3. Messung

**M1 gegen GNU Go.** Bedingungen wie in den Messungen: GNU Go Stufe 1, neun
Vorgabesteine, 120 Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis
600 Züge, ausgespielt, GNU Gos Schätzung nach Zug 120 und 200. Seed **212**,
noch nie benutzt. A und S9 spielen die Partien 1 bis 480 in 32 Teilläufen zu 15,
die übrigen Arme die Partien 1 bis 240 in 16 Teilläufen. Gleiche Partienummer
heißt gleicher Seed: Das ist ein Paar.

**M2 im Selbstspiel, als Wächter** ([`teststaerke.md`](teststaerke.md) §2). S9
gegen A und BT gegen A mit `ab-harness.js`, beide Seiten mit
`mctsFixedSims=120`, je 360 Partien in zwölf Teilen zu 30 (Farben im Wechsel,
Teil k mit Seed 20261201 + k − 1, bis 400 Züge, Aufgabe an). M2 läuft gleich
mit, nicht erst nach einem Treffer: Ein Lauf liefert dann alles, was die Regel
in §4 braucht. Für S15, S30 und PH gibt es in diesem Lauf kein M2 (§4).

**Kontrollen.**

- **Code-Stand:** Ein Job spielt Arm A mit Seed 206 (Partien 1 bis 15) und
  vergleicht sie mit Arm A der Parameter-Reihe. Erwartet: 15 von 15 mit
  gleichem Endstand und gleicher Zugzahl.
- **Umschaltung von PH:** In allen 240 Paaren sind die ersten 120 Züge von PH
  und A gleich. Ist das nicht so, ist PH ungültig und fällt aus Stufe 2 (§4).

Der Code ist der des Dispatch-Commits von `main`. Der Lauf geschieht in GitHub
Actions ([`prior-nachmessung.yml`](../.github/workflows/prior-nachmessung.yml),
153 Jobs zum Spielen).

## 4. Endpunkt und Entscheidung

**Endpunkt (M1):** Differenz des Endstands nach GNU Gos Zählung (`final_score`,
chinesische Regeln, aus Sicht der KI), gepaart nach Partienummer, zweiseitiger
t-Test, mit 95-%-Intervall. **M2:** Siegrate von B gegen 50 %, zweiseitig,
exakter Binomialtest, α = 0,05.

### Frage 1: `mctsPriorSharp`

Getestet wird in zwei Stufen. Stufe 2 wird nur geprüft, wenn Stufe 1 trägt
(Gatekeeping). So bleibt die Fehlerrate über die ganze Frage bei 5 %, und die
Nachmessung von S9 behält ihre volle Schärfe.

**Stufe 1: S9 − A**, 480 Paare, α = 0,05 (eine Hypothese: dieselbe wie in der
Parameter-Reihe, jetzt mit frischem Seed).

| Stufe 1 (M1, 480 Paare) | M2 (S9, 360 Partien) | Folge |
|---|---|---|
| S9 signifikant besser | nicht signifikant unter 50 % | **Default `mctsPriorSharp` = 9**; weiter mit Stufe 2 |
| S9 signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| S9 signifikant schlechter | — | Default bleibt 3; der Befund der Reihe war ein Zufallstreffer |
| sonst | — | Default bleibt 3; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Stufe 2: S15, S30 und PH gegen S9**, Partien 1 bis 240, je zweiseitig,
α = 0,05 / 3 = 0,0167 (Bonferroni über drei Vergleiche). Nur wenn Stufe 1 den
Default 9 ergibt:

- Ist kein Arm signifikant besser als S9, bleibt es bei 9.
- Ist ein Arm signifikant besser als S9, wird er Kandidat; sind es mehrere, der
  mit der größten Differenz zu S9. Ein Kandidat ersetzt 9 erst, wenn auch sein
  M2 (dasselbe Rezept, Seeds ab 20261301) nicht signifikant unter 50 % liegt.
  Das ist ein eigener, kleiner Lauf. Bis dahin gilt 9.
- PH geht nur in Stufe 2 ein, wenn die Kontrolle seiner Umschaltung (§3) hält.
  Wird PH Default, bekommt `index.html` dafür einen eigenen Parameter; der
  Umschaltpunkt bleibt Zug 120.

Trägt Stufe 1 nicht, wird Stufe 2 nicht geprüft. S15, S30 und PH sind dann nur
beschreibend (Tabelle gegen A, Bonferroni über vier Vergleiche, α = 0,0125). Ein
Default folgt daraus nicht, jeder weitere Schritt braucht eine neue
Vorabfestlegung.

### Frage 2: `bensonDeathTransfer`

**BT − A**, Partien 1 bis 240, α = 0,05. Das ist eine eigene Hypothese mit
eigener Fehlerrate, wie bei jedem einzeln gemessenen Schalter.

| M1 (240 Paare) | M2 (BT, 360 Partien) | Folge |
|---|---|---|
| BT signifikant besser | nicht signifikant unter 50 % | **Default `bensonDeathTransfer` = 1** |
| BT signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | — | Default bleibt 0; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Kommen beide Fragen zu einem neuen Default**, werden beide übernommen. Ihre
Wechselwirkung ist dann nicht gemessen; der Nachtrag sagt das, und die nächste
Messung spielt mit beiden.

**Sekundär, ohne Anspruch:**

- Siege gepaart mit McNemar-Test, für alle Vergleiche; für S9 − A die
  Wiederholung des stärksten Signals der Reihe.
- GNU Gos Schätzung nach Zug 120 und 200 je Arm gegen A, für den Phasen-Befund
  aus §1.
- Die Dosis-Kurve gegen A (S9, S15, S30, PH).
- S9 − A über beide Seeds gepoolt (Seed 206 und 212, 720 Paare), gewichtet nach
  der inversen Varianz.
- Hälften, Median und Vorzeichentest, Züge je Partie, abgebrochene Partien.
- M2: Siege je Farbe, Aufgaben, Züge je Partie.

## 5. Erkennbare Größe und Erwartung

**Stufe 1.** Die Streuung der Paardifferenz von S9 − A lag in der Reihe bei 56.
Mit 480 Paaren ist der Standardfehler 2,6, und mit 80 % Teststärke erkennbar
sind 7,2 Punkte. Wäre +7,3 der wahre Effekt, fände die Nachmessung ihn in rund
vier von fünf Läufen. Der Wert der Reihe ist als Sieger unter zehn Armen
vermutlich überschätzt. Bei wahren +5 Punkten liegt die Chance nur bei rund 50 %.
Deshalb 480 statt 240 Paare: Mit 240 wären es 52 % und 28 %.

**Stufe 2.** 240 Paare, α = 0,0167: Erkennbar sind rund 11 bis 12 Punkte
Unterschied zu S9. Stufe 2 findet also nur einen deutlich besseren Arm.
Kleinere Unterschiede zwischen 9, 15 und 30 bleiben offen.

**Frage 2.** BT greift wie `bensonAliveExempt` nur bei höchstens 160 freien
Feldern, im Spätspiel. Bei `bensonAliveExempt` lag die Streuung der
Paardifferenz deshalb bei 20,9. Bei 20 bis 30 sind mit 240 Paaren 3,6 bis 5,4
Punkte erkennbar.

**M2.** Standardfehler 2,6 Prozentpunkte. Der Wächter schlägt sicher erst ab
einer Siegrate unter rund 43 % an.

**Erwartung vorab, ohne Wirkung auf die Lesart:**

- S9 − A positiv, +3 bis +8, mit Signifikanz in ungefähr jedem zweiten Lauf;
  bei den Siegen deutlich (McNemar p < 0,01). Nach Zug 120 wieder hinter A.
- S15 ungefähr wie S9. S30 schlechter als S9, weil der nahezu gierige Prior die
  Suche auf ein, zwei Kandidaten verengt; das ist die unsicherste Erwartung.
- PH zwischen A und S9 oder auf Höhe von S9. Nach Zug 120 ist PH gleich A, wie es
  sein muss.
- BT − A innerhalb von ±5 Punkten und nicht signifikant, wie im Selbstspiel und
  wie bei `bensonAliveExempt` (+1,3 [−1,3; +4,0]).
- M2: S9 über 50 % oder nicht signifikant; BT nicht signifikant (wie 51,7 % und
  48,3 % im September).
- Kontrolle 15 von 15; PH gleicher Anfang in 240 von 240.

## 6. Grenzen

- Ein Gegner (GNU Go Stufe 1), neun Vorgabesteine, 120 Simulationen je Zug. Im
  Spiel gilt ein Zeitbudget mit mehr Simulationen. Dort hat der Prior weniger
  Gewicht, weil die Suche mehr selbst korrigiert. Ein Gewinn bei 120
  Simulationen kann dort kleiner sein.
- Der Umschaltpunkt von PH (Zug 120) kommt aus den Daten der Reihe, mit nur
  zwei Messpunkten (Zug 120 und 200). Ein anderer Punkt ist nicht geprüft.
- Stufe 2 vergleicht mit S9 auf den Partien 1 bis 240; S9 spielt sie mit
  demselben Seed wie die anderen Arme.
- M2 prüft nur S9 und BT. Ein Kandidat aus Stufe 2 braucht sein eigenes M2 (§4).
- Auch ein Treffer sagt nur, dass ein Arm stärker spielt, nicht warum.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 212 |
| `selbstspiel_seed` | 20261201 |
| `kontrolle` | `docs/daten/parameter-reihe/lauf1/A.jsonl.gz` (Arm A der Parameter-Reihe) |
| `kontrolle_seed` | 206 |

Jobs: `pruefen` (Eingaben), `spielen` (A und S9 × 32 Teile zu 15 Partien),
`spielen-weitere` (S15, S30, PH und BT × 16 Teile), `kontrolle` (ein Teil),
`selbstspiel` (S9 und BT × 12 Teile zu 30 Partien), `ergebnis` (Bericht mit
`auswertung/dagger/prior-ergebnis.sh`: `parameter-bericht.js`,
`selbstspiel-bericht.js`, `gnugo-vergleich.js`, `messung-zusatz.js`; Rohdaten
gepackt). Die Ergebnisse legt der Workflow auf den Branch
`ergebnisse/prior-nachmessung-lauf<N>` unter `docs/daten/prior-nachmessung/lauf<N>/`,
dazu als Artefakt (90 Tage). Nur der letzte Job darf ins Repo schreiben, und nur
auf einen neuen Branch. Erwartet werden 40 bis 70 Minuten.

## 8. Nachtrag: Ergebnis der Messung (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `prior-nachmessung.yml`
([Run 39369713828](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39369713828)),
auf dem Merge-Commit `489dbd9` von `main`, mit den Eingaben aus §7, in 39 Minuten
(04:28 bis 05:07 UTC). Alle 1 935 Partien gegen GNU Go und alle 720 Partien im
Selbstspiel ausgespielt, keine abgebrochen. Die Ergebnisse legte der Workflow
auf den Branch `ergebnisse/prior-nachmessung-lauf1`; sie stehen hier unter
[`daten/prior-nachmessung/lauf1/`](daten/prior-nachmessung/lauf1/).

**Kontrollen.** Arm K gibt Arm A der Parameter-Reihe in **15 von 15** Partien
wieder (gleicher Endstand, gleiche Zugzahl). PH spielt in **240 von 240** Paaren
die ersten 120 Züge wie A; nach Zug 120 liegt PH − A bei genau 0,0.

### Frage 1: `mctsPriorSharp`

**Stufe 1** (480 Paare, Seed 212):

| Vergleich | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---|---:|---|---|---:|
| **S9 − A** | **+7,3** | [+2,1; +12,5] | **0,0064** | +11,7 / +2,9 | 365 gegen 304 | −10,4 |

S9 ist signifikant besser als A. Die Siege bestätigen es: In 120 Paaren gewinnt
nur S9, in 59 nur A (McNemar, exakt, p = 6,0 · 10⁻⁶).

**M2** (S9 gegen A im Selbstspiel, 360 Partien): S9 gewinnt **92, also 25,6 %**
[21,3 %; 30,3 %], p = 4,5 · 10⁻²¹. **Signifikant unter 50 %.**

**Entscheidung nach §4: kein Default; untersuchen.** M1 und M2 widersprechen sich.
Der Default bleibt 3. Stufe 2 wird nach der Regel nicht geprüft, weil Stufe 1
keinen Default 9 ergibt.

**Was den Widerspruch erklärt, nachträglich und ohne Anspruch.** Im Selbstspiel
ist die Aufgabe an (§3), gegen GNU Go aus. Von den 268 Niederlagen von S9 sind
**213 Aufgaben von S9**. In den 100 Partien, die ausgezählt wurden, gewinnt S9 45
und verliert 55 (exakter Test p = 0,37). Der schärfere Prior lässt die Suche die
eigene Lage offenbar zu schlecht einschätzen, und die KI gibt auf, wo sie noch
spielen könnte. Belegt ist das nicht: Ob S9 die aufgegebenen Partien gewonnen
hätte, sagt diese Messung nicht. Die naheliegende Nachprüfung ist M2 ohne
Aufgabe auf beiden Seiten, vorab festgelegt.

**Beschreibend, ohne Anspruch** (gegen A, Bonferroni über vier, α = 0,0125):

| Arm | Differenz zu A | 95 % | p | Siege (A: 149) | nach Zug 120 |
|---|---:|---|---:|---|---:|
| S15 | +12,7 | [+4,3; +21,2] | 0,0034 | 165 | +1,9 |
| S30 | +3,9 | [−5,9; +13,7] | 0,43 | 160 | +8,4 |
| PH | −0,3 | [−4,7; +4,0] | 0,87 | 135 | +0,0 |

Gegen S9 (Partien 1 bis 240): S15 +1,1 [−5,2; +7,4], S30 −7,8 [−16,4; +0,8], PH
−12,0 [−19,2; −4,8]. Die Kurve steigt von 3 bis 9 oder 15 und fällt bei 30. **Der
phasenabhängige Prior trägt nicht:** PH liegt auf Höhe von A und deutlich unter
S9. Der Gewinn von S9 entsteht also nicht erst nach Zug 120, auch wenn GNU Gos
Schätzung S9 dort hinten sieht (−10,4, nach Zug 200 +8,2). Die Schätzung bei Zug
120 liest den Stil von S9 offenbar anders, als die Partien ausgehen.

**Beide Seeds zusammen** (Seed 206: +7,3 bei 240 Paaren; Seed 212: +7,3 bei 480;
nach der inversen Varianz gewichtet): **+7,3 [+3,1; +11,5]**.

### Frage 2: `bensonDeathTransfer`

| Vergleich | Differenz | 95 % | p | Siege | Zug für Zug gleich A |
|---|---:|---|---:|---|---:|
| **BT − A** | **−0,8** | [−2,4; +0,7] | 0,29 | 144 gegen 149 | 100 von 240 |

M2: BT gewinnt 183 von 360, 50,8 % (p = 0,79). **Entscheidung nach §4:
verworfen.** Die Obergrenze liegt mit +0,7 weit unter +10, der Default bleibt 0.
Damit ist der Übertrag gegen GNU Go und im Selbstspiel gemessen: Der Defekt ist
belegt, ein Stärkegewinn nicht.

### Gegen die Erwartung aus §5

Die Erwartung stand vor dem Lauf und bleibt stehen. S9 − A lag im erwarteten
Bereich (+3 bis +8), ebenso BT und die Kontrollen. Daneben lagen: M2 für S9
(erwartet: über 50 % oder nicht signifikant), S15 (erwartet ungefähr wie S9,
gemessen +12,7 gegen A und +1,1 gegen S9: im Rahmen) und PH (erwartet zwischen A
und S9, gemessen auf Höhe von A).

**Sekundär.** Median der Differenz S9 − A +2,0, Vorzeichentest 244 gegen 226
(p = 0,43). S9 spielt kürzere Partien (223,5 gegen 241,1 Züge). Alle Zahlen in
[`bericht.md`](daten/prior-nachmessung/lauf1/bericht.md).
