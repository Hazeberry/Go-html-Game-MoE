# Muster ohne Vorgabe: weniger oder gar keine?

Vorab festgelegt am 30.10.2026, vor jedem Lauf. Hazeberry hat den Versuch am
29./30.10. beauftragt und MW0 dazugenommen. Der Messlauf startet erst nach
einem eigenen Go.

## 1. Anlass und Frage

Ohne Vorgabe kosten die Muster gegen GNU Go Stufe 1 Punkte: Ohne sie (M0)
stand die KI um 14,3 [+7,8; +20,8] besser, mit Mustern erst ab Zug 80 um
17,1. Der Schaden entstand vor allem, wenn die KI Weiß spielte (+21,6 gegen
+6,9 als Schwarz). Mit sechs Vorgabesteinen brachten die Muster nichts
Messbares (+2,0), und im Selbstspiel helfen sie
([`leeres-brett.md`](leeres-brett.md) §9,
[`muster-eroeffnung.md`](muster-eroeffnung.md) §9).

Der Browser kennt keine Vorgabe. Was ohne Vorgabe gilt, gilt also für jede
Partie gegen einen Menschen. Die Frage: **Spielt die KI ohne Vorgabe besser,
wenn die Muster dort schwächer oder gar nicht zählen?** Dafür bekommt die
Engine zwei Schalter, die nur ohne Vorgabe greifen. Die Messungen mit sechs
Steinen behalten damit ihren Default.

## 2. Schalter und Arme

In [`index.html`](../index.html):

- `musterOhneVorgabe` (Default 1): Faktor auf `musterGewicht`, wenn
  `vorgabeSteine` unter 2 liegt.
- `musterWeissOhneVorgabe` (Default 1): ein weiterer Faktor, wenn die KI
  dort Weiß spielt.
- `vorgabeSteine` (Default 0): die Zahl der Vorgabesteine der laufenden
  Partie. Der Browser lässt sie bei 0. [`gnugo-duell.js`](../gnugo-duell.js)
  setzt sie aus `--vorgabe`, [`gtp-ki.js`](../gtp-ki.js) aus
  `set_free_handicap`.

Mit den Defaults rechnet die Engine bitgleich wie vorher (Kontrolle in §3).

[`auswertung/komponenten/arme-o.sh`](../auswertung/komponenten/arme-o.sh):

| Arm | Angabe (`--ki`) | Partien je Gegner |
|---|---|---:|
| D | – | 480 |
| M0 | `musterOhneVorgabe=0` | 480 |
| M50 | `musterOhneVorgabe=0.5` | 480 |
| MW0 | `musterWeissOhneVorgabe=0` | 480 |

**MW0 ist erkundend.** Die Idee, die Muster nur als Weiß abzuschalten, kommt
aus den Daten des Laufs, an dem sie gefunden wurde. MW0 wird gemessen und
berichtet, aber nicht beurteilt, und kann keinen Default ändern.

## 3. Bedingungen

Ohne Vorgabe, Komi 7,5, die Farben wechseln je Partie (gerade Nummer: KI
Schwarz). Sonst wie in [`leeres-brett.md`](leeres-brett.md) §3: 120
Simulationen, Aufgabe der KI aus, der Gegner gibt nicht auf, bis 600 Züge,
Schätzung nach Zug 40, 80, 120 und 200, GNU Go zählt nach Fläche
([`muster-ohne-vorgabe.yml`](../.github/workflows/muster-ohne-vorgabe.yml),
[`spielen.sh`](../auswertung/komponenten/spielen.sh) mit
`ARME=auswertung/komponenten/arme-o.sh` und `VORGABE=0`).

| Gegner | Teile | Partien je Arm |
|---|---|---:|
| GNU Go Stufe 1 | 16 zu 30 | 480 |
| Fuego, 100 Spiele je Zug | 8 zu 60 | 480 |

| Eingabe | Wert |
|---|---|
| `seed` | 226 |

Seed **226** gegen beide Gegner, noch nie benutzt. Fuego spielt zum ersten Mal
ohne Vorgabe. Die Einstellung von 100 Spielen je Zug wurde für sechs Steine
gewählt ([`fuego.md`](fuego.md) §12). Ohne Vorgabe ist Fuego damit
vermutlich klar stärker als die KI. Gemessen wird aber der Endstand, nicht die
Siegrate, und der streut auch dann (wie gegen GNU Go ohne Vorgabe).

**Selbstspiel.** M0, M50 und MW0 je gegen D, 360 Partien ohne Vorgabe, beide
Seiten 120 Simulationen, ohne Aufgabe, bis 600 Züge, Farben im Wechsel. Basis
der Seeds **20262501** (M0), **20262601** (M50) und **20262701** (MW0), Teil
k mit Basis + k − 1.

**Kontrollen.**
- GNU Go: D mit Seed 222, Partien 1 bis 20, gegen den Lauf „Leeres Brett“.
  Erwartet: 20 von 20 Zug für Zug gleich, die neuen Schalter ändern mit
  ihren Defaults also nichts.
- Fuego: D mit Seed 226, Partien 1 bis 20, noch einmal im selben Lauf.
  Erwartet: 20 von 20.

## 4. Endpunkt und Entscheidung, vorab festgelegt

[`bericht.js`](../auswertung/komponenten/bericht.js) mit `--stufe O`,
[`ergebnis-o.sh`](../auswertung/komponenten/ergebnis-o.sh),
[`selbstspiel-bericht.js`](../auswertung/selbstspiel-bericht.js).

Endpunkt ist der Endstand Arm − D nach GNU Gos Zählung, gepaart nach
Partienummer, je Gegner, mit einem Intervall zu alpha 0,05/3 (**98,3 %**, t),
weil es drei Arme gibt.

**Extern, je Arm M0 und M50** (wie in der Muster-Eröffnung):

- **besser gegen beide Gegner**: die Untergrenze liegt gegen GNU Go **und**
  gegen Fuego über 0;
- **schlechter**: gegen mindestens einen Gegner liegt die Obergrenze unter 0;
- sonst **nicht belegt**.

**Selbstspiel: Veto**, wenn die Obergrenze des 95-%-Intervalls der Siegrate
des Arms gegen D unter **45 %** liegt (wie in
[`baum-uebernahme.md`](baum-uebernahme.md) §4).

| extern | Selbstspiel | Folge |
|---|---|---|
| besser gegen beide | kein Veto | **Default `musterOhneVorgabe` auf den Wert des Arms** |
| besser gegen beide | Veto | Default bleibt 1; untersuchen |
| nicht belegt oder schlechter | — | Default bleibt 1 |

Bestehen M0 und M50 beide, wird M50 Default, der kleinere Eingriff.
`musterWeissOhneVorgabe` bleibt in jedem Fall 1 (MW0 ist erkundend).

**Beschreibend, ohne Anspruch:** Arm − D je Farbe der KI, Phasenprofil,
Verteilung des Endstands und geschlagene Steine, Siege, erste Abweichung,
Unterschied der Gegner (Welch, 98,3 %), Kontrollen und alles zu MW0.

## 5. Auflösung, vorab gerechnet

Die SD der Paardifferenzen lag ohne Vorgabe gegen GNU Go bei 56 bis 59
([`leeres-brett.md`](leeres-brett.md) §9). Gegen Fuego ist sie ohne Vorgabe
nicht bekannt, mit sechs Steinen lag sie bei 85
([`komponenten.md`](komponenten.md) §9). Mit 480 Paaren und t = 2,40:

| Gegner | SD (angenommen) | halbe Breite (98,3 %) | Chance, eine wahre Wirkung von +14 als „besser“ zu sehen | … von +7 |
|---|---:|---:|---:|---:|
| GNU Go | 59 | 6,5 | > 99 % | 59 % |
| Fuego | 85 | 9,3 | 89 % | 27 % |

„Besser gegen beide“ braucht also eine deutliche Wirkung auch gegen Fuego.
Das Selbstspiel mit 360 Partien hat bei einer Rate um 50 % eine halbe Breite
von rund 5 Prozentpunkten.

## 6. Erwartung vorab

- **GNU Go:** M0 wie im Lauf „Leeres Brett“ rund +14, M50 dazwischen (rund +5
  bis +12), MW0 rund +11, fast ganz aus den Partien als Weiß.
- **Fuego:** offen. Mit sechs Steinen halfen die Muster gegen Fuego eher
  (M0 −10,1, nicht gesichert). Wahrscheinlich kleiner als gegen GNU Go.
- **Selbstspiel:** M0 deutlich unter 50 % und wohl unter der Vetogrenze (A80
  kam auf 27,8 %), M50 und MW0 näher an 50 %.
- **Am wahrscheinlichsten:** Default bleibt 1, entweder weil Fuego nicht
  mitzieht oder weil das Selbstspiel M0 ablehnt. M50 hat die beste Chance
  auf einen neuen Default.
- Kontrollen 20 von 20.

## 7. Ablauf und Dauer

[`muster-ohne-vorgabe.yml`](../.github/workflows/muster-ohne-vorgabe.yml),
manuell auf `main`, ohne Eingaben: Fuego einmal bauen, 64 Jobs gegen GNU Go,
32 gegen Fuego, 36 Selbstspiel, zwei Kontrollen und der Bericht auf
`ergebnisse/muster-ohne-vorgabe-lauf<N>` unter
`docs/daten/muster-ohne-vorgabe/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben.

Zusammen 3 840 Partien gegen die Gegner, 1 080 im Selbstspiel und 40 in den
Kontrollen. Erwartet werden rund 36 Runner-Stunden, bei höchstens 20 Jobs
gleichzeitig **rund zwei Stunden**.

## 8. Danach

Der Nachtrag wendet die Regel aus §4 an. Ändert sich der Default, dann nur
`musterOhneVorgabe` in `index.html`, mit Kommentar und README.

## 9. Nachtrag: Ergebnis von Lauf 1 (30.10.2026)

[Workflow-Lauf 41022192878](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/41022192878)
auf Merge `e40d82e`, von 07:47 bis 10:08 UTC (41 Runner-Stunden). Alle 136
Jobs sind grün, es fehlt kein Teil. Daten:
[`docs/daten/muster-ohne-vorgabe/lauf1/`](daten/muster-ohne-vorgabe/lauf1/),
der volle Bericht in [`bericht.md`](daten/muster-ohne-vorgabe/lauf1/bericht.md).

**Der Lauf ist sauber.** Keine Partie ist abgebrochen, keine lief bis zum
Zuglimit. Beide Kontrollen sind bestanden: GNU Go 20 von 20 gleich wie im
Lauf „Leeres Brett“, die neuen Schalter ändern mit ihren Defaults also
nichts; Fuego 20 von 20 gleich im selben Lauf. MW0 spielt in allen 240
Partien als Schwarz Zug für Zug wie D, wie es sein muss.

### Arm − D, Endstand (98,3 %)

| Arm | gegen GNU Go | gegen Fuego | Urteil nach §4 | Selbstspiel gegen D |
|---|---|---|---|---|
| M0 | **+18,1** [+11,9; +24,4] | +0,6 [−5,4; +6,6] | nicht belegt | **26,9 %** [22,6; 31,8] |
| M50 | **+15,2** [+8,5; +22,0] | −0,3 [−6,5; +5,8] | nicht belegt | 45,6 % [40,5; 50,7] |
| MW0 (erkundend) | +13,1 [+8,5; +17,7] | −4,1 [−8,6; +0,4] | – | 38,6 % [33,7; 43,7] |

### Entscheidung nach §4

Kein Arm ist gegen beide Gegner besser: Gegen Fuego liegen M0 und M50 genau
bei D. **`musterOhneVorgabe` bleibt 1**, die Muster zählen ohne Vorgabe weiter
voll. Die Schalter bleiben im Code, das Ergebnis steht bei ihnen. Auf das
Selbstspiel kommt es nach der Regel nicht mehr an. M0 wäre dort mit 26,9 %
ohnehin am Veto gescheitert, M50 nicht (Obergrenze 50,7 %).

### Einordnung

- **Der Schaden gegen GNU Go bestätigt sich**, mit neuem Seed: M0 +18,1
  (vorher +14,3). Er entsteht wieder vor allem als Weiß (+26,2 gegen +10,0
  als Schwarz).
- **Gegen Fuego gibt es ihn nicht.** Ohne Muster steht die KI dort genauso
  wie mit. Als Weiß helfen die Muster gegen Fuego sogar eher (M0 als Weiß
  −8,2 [−17,2; +0,8], MW0 −4,1 insgesamt). Der Unterschied der Gegner ist
  gesichert: −17,6 [−26,2; −8,9] für M0.
- **Der Schaden hängt also an GNU Go**, nicht am leeren Brett. Die Muster sind
  aus Zügen von GNU Go gelernt ([`muster.md`](muster.md) §2). Eine mögliche
  Erklärung, nicht geprüft: GNU Go Stufe 1 kennt genau die Formen, die die
  Muster vorschlagen, und weiß gegen sie zu spielen, Fuego nicht.
- **Im Selbstspiel helfen die Muster** wie schon in der Muster-Eröffnung:
  ohne sie 26,9 %, mit halbem Gewicht 45,6 %, nur als Weiß ohne 38,6 %. Das
  Selbstspiel und Fuego sprechen also beide nicht gegen die Muster.
- **Gegen Fuego gewinnt D die meisten Partien:** 73 von 480, M0 nur 43, M50
  49, bei gleichem mittlerem Endstand. Das ist beschreibend und nicht
  geprüft, passt aber zum Bild, dass die Muster gegen Fuego nicht schaden.
- **Fuego ohne Vorgabe** spielt deutlich stärker als die KI: D verliert im
  Mittel mit −25,1 und gewinnt 15 % der Partien. Der Endstand streut aber
  breit genug (SD 45), um Unterschiede zu messen.
- Wie schon zweimal liegt der frühe Vorsprung nach GNU Gos Schätzung nicht am
  Ende: M0 gegen Fuego +33,6 nach Zug 80, +0,6 am Ende.

### Abgleich mit der Erwartung (§6)

| Erwartung | eingetreten? |
|---|---|
| GNU Go: M0 rund +14, M50 +5 bis +12, MW0 rund +11 | M0 +18,1, M50 +15,2 (darüber), MW0 +13,1 |
| Fuego: offen, wahrscheinlich kleiner als gegen GNU Go | ja: rund 0 |
| Selbstspiel: M0 unter der Vetogrenze, M50 und MW0 näher an 50 % | ja: 26,9 %, 45,6 %, 38,6 % |
| Am wahrscheinlichsten Default bleibt 1 | ja, weil Fuego nicht mitzieht |
| Kontrollen 20 von 20 | ja |

## 10. Nachtrag: gepaarter Vergleich der Siege (explorativ, 30.10.2026)

**Explorativ, nicht vorab festgelegt.** Hazeberry hat am 30.10. gebeten, ohne
neue Partien auch die Siege gepaart zu vergleichen. Es zählen dieselben Paare
wie in §9 und im Lauf „Leeres Brett“. Der Test ist der exakte McNemar-Test,
also der Vorzeichentest auf den Paaren, in denen nur einer der beiden Arme
gewinnt. Partien ohne Sieger (zwei Partien von Fuego am Zuglimit von 600
Zügen) fallen samt Partner heraus. Bei neun Tests läge eine Bonferroni-Grenze
bei 0,05/9 ≈ 0,0056. Die Zahlen sind ein Hinweis, kein Urteil. Gerechnet mit
[`siege-gepaart.js`](../auswertung/komponenten/siege-gepaart.js):

| Gegner | Arm | Paare | Siege Arm | Siege D | nur Arm | nur D | Differenz (Prozentpunkte) | McNemar p |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GNU Go, Leeres Brett (Seed 222) | M0 | 480 | 16 (3,3 %) | 8 (1,7 %) | 16 | 8 | +1,7 | 0,1516 |
| GNU Go, Leeres Brett (Seed 222) | A80 | 479 | 19 (4,0 %) | 8 (1,7 %) | 19 | 8 | +2,3 | 0,0522 |
| GNU Go (Seed 226) | M0 | 480 | 13 (2,7 %) | 11 (2,3 %) | 13 | 11 | +0,4 | 0,8388 |
| GNU Go (Seed 226) | M50 | 480 | 21 (4,4 %) | 11 (2,3 %) | 21 | 11 | +2,1 | 0,1102 |
| GNU Go (Seed 226) | MW0 | 480 | 14 (2,9 %) | 11 (2,3 %) | 5 | 2 | +0,6 | 0,4531 |
| Fuego, 100 Spiele (Seed 226) | M0 | 478 | 42 (8,8 %) | 73 (15,3 %) | 32 | 63 | −6,5 | 0,0019 |
| Fuego, 100 Spiele (Seed 226) | M50 | 479 | 49 (10,2 %) | 73 (15,2 %) | 41 | 65 | −5,0 | 0,0250 |
| Fuego, 100 Spiele (Seed 226) | MW0 | 479 | 44 (9,2 %) | 73 (15,2 %) | 16 | 45 | −6,1 | 0,0003 |

- **Gegen GNU Go gewinnt die KI ohne Vorgabe fast nie**, mit und ohne Muster
  (2 bis 4 %). Die Siege tragen dort kaum Information, die Endstände in §9
  sind aussagekräftiger.
- **Gegen Fuego gewinnt D deutlich öfter als jeder Arm**: 73 von 480 Partien
  gegen 42 ohne Muster (McNemar p = 0,0019), 49 mit halbem Gewicht
  (p = 0,025) und 44 nur als Weiß ohne Muster (p = 0,0003). Zwei der drei
  liegen unter der Bonferroni-Grenze. Der mittlere Endstand war dagegen bei
  allen gleich (§9). Die Muster verschieben gegen Fuego also eher, wie oft
  die KI knapp vorn landet, als wie viele Punkte sie im Mittel macht.
- Das spricht wie das Selbstspiel für die Muster. Weil Fuego mit 100 Spielen
  je Zug ohne Vorgabe so stark ist, dass D nur 15 % gewinnt, misst es aber
  am Rand. Eine vorab festgelegte Messung mit neu kalibriertem Fuego folgt
  ([`muster-fuego-siege.md`](muster-fuego-siege.md)).
