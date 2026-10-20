# Benson-lebende Ketten und die Sterbe-Treppe: `bensonAliveExempt`

**Status: festgelegt am 20.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Hazeberry wies am 20.10.2026 auf eine Lücke in `evaluateBoard` hin:

1. `bensonClassify` berechnet beide Mengen, `_bnAlive` (pass-alive-Ketten) und
   `_bnDead` (beweisbar tote Ketten). Der Lebend-Marker steht in derselben Epoche
   zur Verfügung.
2. `evaluateBoard` fragt ausschließlich `_bnDead`. Benson-lebende Ketten fallen
   in die normale Gruppen-Arithmetik.
3. Die Sterbe-Treppe prüft nur „libs < 4 und size ≥ `deathDiscountSize`“, ohne
   Lebend-Prüfung. Eine vollständig eingeschlossene lebende Kette mit zwei
   Einzelaugen hat zwei Freiheiten, `STERBE_RAMPE` liefert 0,5, und es werden
   `deathTransfer` × 0,5 × Größe × `captureWeight` abgezogen.

**Alle drei Aussagen stimmen.** `bensonClassify` stempelt `_bnAlive` und
`_bnDead`; `evaluateBoard` liest nur `_bnDead`; der Zweig der Treppe fragt
Freiheiten und Größe und sonst nichts.

**Nachgebaut** ([`tests/benson-lebend-treppe.js`](../tests/benson-lebend-treppe.js)):
Zehn Steine mit zwei Einzelaugen, von `bensonClassify` als pass-alive erkannt.
Der Wert der Kette ist 5 · 10 + 3 · 2 = 56, die Treppe zieht mit dem Default
`deathTransfer` = 1,0 genau 1,0 · 0,5 · 10 · 20 = 100 ab: aus +56 wird −44.

**In echten Partien.** In den Endstellungen der Partien 2 und 3 von Arm A der
Messung M1 (Seed 206) hat GNU Gos Weiß je zwei bewiesen lebende Ketten mit zwei
Freiheiten (9 + 9 und 12 + 7 Steine). Mit der Ausnahme sinkt die Bewertung aus
Sicht der KI um 180 und 190, genau die unabhängig neu gerechneten Abzüge: Die
Bewertung bucht GNU Gos lebende Ketten als Last und steht ohne die Ausnahme zu
gut da. Wie oft das vorkommt, zählt die Sonde
[`treppe-sonde.js`](../auswertung/treppe-sonde.js) in vier ganzen Partien (die
Partien 1 bis 4 von Seed 206, Bedingungen von §3; die Zähler ändern nichts am
Spiel):

| Partie | Bewertungen mit Benson-Analyse | davon mit einer lebenden Kette in der Treppe | Treffer auf lebenden Ketten (eigene / fremde) | Anteil am Abzug der Treppe |
|---:|---:|---:|---:|---:|
| 1 | 5 926 | 46 (0,8 %) | 2 / 44 | 0,1 % |
| 2 | 5 679 | 1 601 (28,2 %) | 0 / 1 888 | 28,4 % |
| 3 | 3 875 | 3 875 (100 %) | 1 / 4 805 | 16,9 % |
| 4 | 612 | 601 (98,2 %) | 587 / 509 | 25,1 % |
| zusammen | 16 092 | 6 123 (38,0 %) | 590 / 7 246 | 13,2 % |

Die Benson-Analyse läuft nur bei höchstens `bensonEvalMaxEmpty` = 160 freien
Feldern, also im Spätspiel; dort ist der Fall häufig. Meist ist es die Kette des
Gegners (7 246 von 7 836 Treffern). Mit zwei Freiheiten zählt eine solche Kette
−5 · Größe + 6: Jeder weitere Stein des Gegners verbessert die Bewertung der KI
um 5, jeder weitere eigene Stein verschlechtert sie um 5.

**Was nicht behauptet wird.** Dass der Defekt Stärke kostet. Die Treppe selbst
ist belegt: `deathTransfer` 1,0 ist der bestbelegte Parameter des Projekts (65,2 %
über 210 Partien, in beide Richtungen vermessen). Ein Deckel auf den Abzug wurde
geprüft und verworfen („Nicht bauen“): Der Arm mit 100 % Überkompensation schnitt
am besten ab. Die Ausnahme ist etwas anderes. Sie nimmt den Abzug nur dort weg,
wo die Kette bewiesen lebt und die Annahme der Treppe („meistens, nicht immer
tot“) sicher falsch ist, und lässt jede andere Kette, wie sie ist. Der Kommentar
an `deathTransfer` verlangt für jede Änderung einen neuen Grund, nicht eine neue
Dosis; dies ist einer.

## 2. Arme

| Arm | Schalter | Was passiert |
|---|---|---|
| **A** | `bensonAliveExempt=0` (Default) | Referenz; spielt dieselben Partien wie Arm A der Messung M1 |
| **B** | `bensonAliveExempt=1` | Benson-lebende Ketten bekommen weder `deathDiscount` noch `deathTransfer` noch das Raumrisiko (`raumGewicht`, Default 0) |

Im Code: `lebend = PARAMS.bensonAliveExempt >= 1 && bEpoch >= 0 && _bnAlive[i] === bEpoch`
in `evaluateBoard`; für `lebend` werden die Treppe und das Raumrisiko
übersprungen. Bei 0 ist `lebend` immer falsch: Es gibt keinen neuen Zweig und
keine neue Rechnung, die Werte sind bitgleich (getestet an den Werten vor der
Änderung und, in ganzen Partien, an Arm A der Messung M1, siehe §3).

## 3. Messung

**M1.** Bedingungen wie in den Messungen: Gegner GNU Go Stufe 1, neun
Vorgabesteine, 120 Simulationen (`mctsFixedSims=120`), Aufgabe der KI aus, GNU Go
gibt nicht auf, bis 600 Züge, ausgespielt. Seed **206**, 240 Partien je Arm in 16
Teilläufen zu 15; gleiche Partienummer in beiden Armen ist ein Paar. Arm A spielt
Zug für Zug dieselben Partien wie Arm A der Messung M1; der Lauf prüft das
(Eingabe `kontrolle`, erwartet 240 von 240). Das belegt zugleich, dass der Schalter
bei 0 auch in ganzen Partien nichts ändert. Der Code ist der des Dispatch-Commits
von `main`. Der Lauf geschieht in GitHub Actions
([`benson-lebend.yml`](../.github/workflows/benson-lebend.yml), 32 Jobs).

**M2, nur bei einem Treffer in M1.** Selbstspiel mit `ab-harness.yml`, vier Läufe
zu 90 Partien, Seeds 20261021 bis 20261024, `params_a`
`mctsFixedSims=120`, `params_b` `mctsFixedSims=120,bensonAliveExempt=1`,
`maxmoves` 400; gepoolt 360 Partien. Ohne Treffer in M1 entfällt M2 (§4).

## 4. Endpunkt und Entscheidung

**Primär (M1):** Differenz des Endstands B − A nach GNU Gos Zählung, gepaart nach
Partienummer, zweiseitiger t-Test, α = 0,05 (eine Hypothese, kein Bonferroni),
mit 95-%-Intervall. **M2:** Siegrate von B gegen 50 %, zweiseitig, α = 0,05,
Normalapproximation.

| M1 (GNU Go, 240 Paare) | M2 (Selbstspiel, 360 Partien) | Folge |
|---|---|---|
| B signifikant besser | nicht signifikant unter 50 % | Default `bensonAliveExempt` = 1 |
| B signifikant besser | signifikant unter 50 % | kein Default; untersuchen |
| sonst | entfällt | Default bleibt 0; „nicht belegt“, „verworfen“ nur bei einer Obergrenze des 95-%-Intervalls unter +10 |

**Sekundär, ohne Anspruch:** Hälften, Siege, Median und Vorzeichentest, Stand nach
Zug 120 und 200, Züge je Partie, abgebrochene Partien, die Zahl der Partien, die
Zug für Zug dieselben sind wie in A.

## 5. Erkennbare Größe und Erwartung

Die Streuung der Paardifferenz liegt bei 55 bis 65 Punkten (Messung M1: 55;
[`teststaerke.md`](teststaerke.md) §3: rund 65). Mit 240 Paaren ist der
Standardfehler 3,6 bis 4,2, und Effekte ab 10 bis 12 Punkten sind mit 80 %
Teststärke erkennbar. Kleinere bleiben unmessbar; ein Nullergebnis heißt dann
„nicht belegt“.

**Erwartung vorab, ohne Wirkung auf die Lesart:** B − A innerhalb von ±8 Punkten
und nicht signifikant. Ein signifikanter Gewinn wäre eine Überraschung. Der
Eingriff verschiebt Bewertungen meist um eine Konstante (dieselbe Kette steht in
allen Ästen der Suche), und der Vorgänger am anderen Ende, `bensonDeathTransfer`,
zeigte im Selbstspiel keine Wirkung auf die Siegrate (51,7 % und 48,3 %). Die
Spiele ändern sich aber: Mit der Ausnahme laufen die Partien anders (in der Sonde
enden sie früher oder später), sodass Arm B nur in wenigen Partien Zug für Zug
dasselbe spielt wie A.

**Trockenlauf vor dieser Festlegung.** Die Sonde mit `--ki bensonAliveExempt=1`
spielte dieselben vier Partien (Partien 1 bis 4 von Seed 206) ohne Absturz und
ohne Warnung; die Zahl der Treffer auf lebenden Ketten ist dabei in allen vier 0,
wie sie sein muss. Die Partien laufen anders als mit Schalter 0 (Partie 3: 12 240
statt 15 240 Bewertungen).

## 6. Grenzen

- Die Ausnahme wirkt nur bei höchstens 160 freien Feldern und nur auf Ketten, die
  `bensonClassify` als pass-alive beweist. Lebende Ketten ohne Beweis (Seki, Ketten
  mit Augen, die Benson nicht fasst) behalten die Treppe.
- Die Treppe ist nicht der einzige Term, der eine lebende Kette falsch lesen kann:
  Die Freiheits- und Atariterme in der Zugbewertung an der Wurzel (`evaluateMove`)
  sind nicht untersucht.
- Ein Seed, ein Gegner (GNU Go Stufe 1), neun Vorgabesteine, 120 Simulationen je
  Zug.
- M1 allein ist kein Beleg für einen Mechanismus: Auch ein Treffer sagt nur, dass B
  stärker spielt, nicht warum.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 206 |
| `kontrolle` | `docs/daten/endspiel-messung/lauf1/A.jsonl.gz` (Arm A der Messung M1) |

Jobs: `pruefen` (Eingaben), `spielen` (2 Arme × 16 Teile zu 15 Partien),
`ergebnis` (Bericht mit `auswertung/parameter-bericht.js`, `gnugo-vergleich.js` und
`messung-zusatz.js`, Rohdaten gepackt). Die Ergebnisse legt der Workflow auf den
Branch `ergebnisse/benson-lebend-lauf<N>` unter
`docs/daten/benson-lebend/lauf<N>/`, dazu als Artefakt (90 Tage). Nur der letzte
Job darf ins Repo schreiben, und nur auf einen neuen Branch. Erwartet werden 10 bis
15 Minuten für den ganzen Lauf.
