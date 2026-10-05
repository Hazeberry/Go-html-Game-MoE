# Gegnerwert und Krisenkandidaten: vorab festgelegte Messung

**Status: festgelegt am 05.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

---

## 1. Anlass

In den Partien eines Menschen gegen die KI vom 05.10. nahm der Mensch
mehrmals genau den Punkt, den GNU Go 3.8 für die KI vorgeschlagen hatte.
GNU Gos Schätzung, Weiß = KI:

| Partie | Zug | KI spielt | GNU Go hätte gespielt | Mensch antwortet | Kosten |
|---|---|---|---|---|---:|
| 6 | 134 | O15 | S7 (rettet 12 Steine) | S9, schneidet ab | −21 |
| 7 | 228 | M8 | J10 | J10 | −15 |
| 7 | 326 | N2 | O1 | O1 | −18 |

In Partie 6 schlug der Mensch die 12 Steine bei Zug 137. Die KI gab danach
bei W +37 auf (`captureCap` war noch 0, siehe
[`aufgabe-deckel.md`](aufgabe-deckel.md)).

## 2. Was die Piloten gezeigt haben

Gemessen gegen GNU Go 3.8 Stufe 1, neun Vorgabesteine für uns, 120
Simulationen, Aufgabe aus, ganze Partien bis 600 Züge, `--seed 51`. Gepaart
gegen den Default über 8 Partien (Endstand = GNU Gos Auszählung der
Schlussstellung, aus unserer Sicht).

**Gegnerwert (`gegnerWert`) schadet stark.** Jeder Kandidat bekommt
`gegnerWert` × den Wert, den derselbe Punkt für den Gegner hätte
(`evaluateMove` aus seiner Sicht).

| `gegnerWert` | nach Zug 120 | Endstand B − A |
|---|---:|---:|
| 0,25 | −160 | −90 (p = 0,03) |
| 0,5 | −178 | −113 (p = 0,03) |
| 1 | −183 | −126 (p = 0,01) |

Die besten Punkte des Gegners sind oft Verlängerungen seiner eigenen langen
Ketten, denn der Freiheitsterm in `evalMidgame` belohnt sie stark. Die KI
spielt dann direkt an starke gegnerische Mauern.

**Nur der Gebietsanteil (`gegnerGebiet`) schadet ebenso.** Jeder Kandidat
bekommt `gegnerGebiet` × `gebietZug` × den Bouzy-Gewinn, den der Gegner mit
dem Punkt hätte.

| `gegnerGebiet` | nach Zug 120 | Endstand B − A |
|---|---:|---:|
| 0,5 | −171 | −93 (p = 0,02) |
| 1 | −187 | −110 (p = 0,02) |

Die größten Gebietsgewinne des Gegners liegen mitten im eigenen Rahmen der
KI. Ein Eindringen dort sähe auf der Einflusskarte groß aus, wäre aber nicht
durchführbar. Die KI verteidigt Punkt für Punkt ihren Rahmen (in einer
Pilotpartie Q17, Q15, P13, M16, N16, S16 …), und Weiß nimmt die anderen
Ecken. Im Selbstspiel blieben beide Varianten unauffällig (11:19, 17:13,
16:14, 15:15 über je 30 Partien).

**Der eigentliche Befund.** Am Testbeispiel aus `tests/gegnerwert.js` (drei
weiße Steine am Rand im Atari, Weiß am Zug) bewertet `evaluateMove` die
Rettung mit 422 Punkten. Freie Züge mit Gebietsgewinn bekommen 1 398. Die
Rettung liegt damit auf **Rang 222**. Die Suche sieht nur die 16 besten
Kandidaten (`mctsRootChildren`), also erreicht der Rettungszug sie nie. Ohne
`gebietZug` stünde die Rettung auf Rang 1. Seit `gebietZug` = 80 Default ist
([`gebiet.md`](gebiet.md)), überstrahlt der Gebietsterm die Taktik.

**Krisenkandidaten (`krisenKandidaten`).** Züge, die eine eigene Kette aus
dem Atari retten (danach mindestens zwei Freiheiten), und alle Schläge
bekommen mindestens den Wert des besten Kandidaten. Damit kommen sie mit
voller Priorität in die Suche; ob sie gespielt werden, entscheidet die Suche.
Die Pass-Prüfung sieht die Werte ohne diesen Aufschlag.

- Partie 6, Zug 134 (400 Simulationen): Default N16 mit Q −0,61, mit dem
  Schalter S9 mit Q 0,00. GNU Go schätzt nach S9 W +88, nach N16 W +72,5.
- Gegen GNU Go, 16 Partien gepaart: Endstand −13,0 (SD 146,6, p = 0,73),
  nach Zug 120 −17,9 (p = 0,04), nach Zug 200 +2,0 (p = 0,88). GNU Go gewann
  in beiden Armen gleich oft (je 2 Partien gab es auf).
- Selbstspiel, 40 Partien: B gewinnt 24 (60 %).

## 3. Arme

| Arm | Parameter |
|---|---|
| A | Default (`krisenKandidaten` 0) |
| B | `krisenKandidaten` = 1 |

`gegnerWert` und `gegnerGebiet` bleiben 0 und werden nicht weiter gemessen.

## 4. Messungen und Endpunkte

**M1, Selbstspiel, primär:** 720 Partien, acht Teilläufe zu je 90.

```bash
for s in 20261060 20261061 20261062 20261063 20261064 20261065 20261066 20261067; do
  node ab-harness.js --games 90 --seed $s \
    --A mctsFixedSims=120 --B mctsFixedSims=120,krisenKandidaten=1 \
    --roh krise-$s.jsonl --json krise-$s.json &
done
```

Endpunkt: Siegrate von B, zweiseitig gegen 50 %, α = 0,05.

Selbstspiel ist hier der primäre Endpunkt, weil die KI gegen sich selbst
taktische Fehler bestraft. GNU Go auf Stufe 1 tat das im Pilot selten.

**M2, gegen GNU Go, Kontrolle:** Stufe 1, neun Vorgabesteine, 120
Simulationen, Aufgabe aus, ganze Partien bis 600 Züge. Je Arm 60 Partien
mit denselben Seeds, als vier Teilläufe zu je 15:

```bash
for v in 1 16 31 46; do
  node gnugo-duell.js --partien 15 --von $v --seed 91 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --ki mctsFixedSims=120,resignEnabled=0 \
    --roh krise-gnugo-A-$v.jsonl &
  # B ebenso mit --ki mctsFixedSims=120,resignEnabled=0,krisenKandidaten=1
done
node auswertung/gnugo-vergleich.js --A krise-gnugo-A-*.jsonl --B krise-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05.

**Entscheidung, vorab festgelegt:**

| M1 (Selbstspiel) | M2 (GNU Go) | Folge |
|---|---|---|
| B über 50 %, p < 0,05 | nicht signifikant schlechter | Default `krisenKandidaten` = 1 |
| B über 50 %, p < 0,05 | signifikant schlechter | kein Default; untersuchen |
| sonst | — | Default bleibt 0 |

**Sekundär, ohne Anspruch:** M2 nach Zug 120 und 200; Gruppenverluste je Arm
in M1 (Harness-Zeile „GRUPPENVERLUST“); Aufgaben je Arm.

## 5. Grenzen

- Gerettet und geschlagen wird nur im Atari. Ketten mit zwei Freiheiten,
  Leitern und Netze erfasst der Schalter nicht.
- Der Schalter hebt die Bewertung nur auf den besten Kandidaten an. Bei 120
  Simulationen kann die Suche den Zug trotzdem verwerfen.
- Gemessen wird mit 120 Simulationen; Menschen spielen mit 300 bis 1 300.

---

## 6. Nachtrag: Ergebnis, Default bleibt 0 (05.10.2026)

Gelaufen auf dem Merge-Commit `8968c5b`. Die Läufe standen einmal für etwa
eine Stunde still, weil der Prozess pausiert war. Mit `mctsFixedSims` ändert
das an den Partien nichts. Daten: `daten/krise-20261060.json` bis
`…67.json` (Hash-Listen), `daten/krise-gnugo.json` (je Partie Schätzungen
und Endstand).

**M1, Selbstspiel (primär):** B gewinnt **372 von 720 Partien, 51,7 %**
(z = 0,89, **p = 0,37**, 95-%-KI 48,0–55,3 %).

| Teillauf | 1060 | 1061 | 1062 | 1063 | 1064 | 1065 | 1066 | 1067 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Siegrate B | 45,6 % | 55,6 % | 42,2 % | 48,9 % | 60,0 % | 51,1 % | 60,0 % | 50,0 % |

**M2, gegen GNU Go (Kontrolle), 60 Paare:**

| | A | B | B − A |
|---|---:|---:|---|
| Endstand | −160,4 | −152,8 | +7,5 (SD 87,0), p = 0,50 |
| nach Zug 120 | +21,7 | +17,8 | −3,9, p = 0,35 |
| nach Zug 200 | −87,1 | −98,1 | −10,9, p = 0,10 |

GNU Go gab in 1 (A) bzw. 3 (B) Partien auf.

**Sekundär:** Schläge ab 5 Steinen über alle acht Teilläufe: A 1 349, B
1 417. Steine insgesamt geschlagen: A 20 138, B 20 164. Der Schalter
verhindert also keine Gruppenverluste, die im Selbstspiel entscheidend wären.

**Entscheidung nach §4: Default `krisenKandidaten` bleibt 0.**

**Einordnung:** Der Schalter tut, was er soll: Die Rettung erreicht die Suche
(Test, Partie 6, Zug 134). Bei 120 Simulationen bewertet die Suche aber nach
dem Rollout, und der sieht in der Rettung einer Gruppe im Atari kaum mehr
Wert als in einem Gebietszug. Atari ist außerdem selten der Engpass. Die
Gruppen, die im Selbstspiel und in den Partien des Menschen verloren gehen,
stehen meist vorher mit zwei bis vier Freiheiten im Laufkampf
([`laufkampf.md`](laufkampf.md)). Der Schalter bleibt im Code und kann in
Einzelfällen helfen. Messbar besser spielt die KI damit nicht.
