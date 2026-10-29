# Muster-Eröffnung: die Muster erst ab Zug 40 oder 80

Vorab festgelegt am 29.10.2026, vor jedem Lauf. Hazeberry hat den Versuch an
diesem Tag beauftragt. Der Messlauf startet erst nach einem eigenen Go.

## 1. Anlass

In Stufe A der Komponentenmessung ([`komponenten.md`](komponenten.md) §9)
zeigte das Phasenprofil ein Muster in zwei Richtungen:

- **Früh schaden die Muster.** Ohne Muster (M0) lag die KI nach Zug 40 nach
  GNU Gos Schätzung besser als D: +27 gegen GNU Go, +35 gegen Fuego. Nach Zug 80
  waren es noch +14 bzw. +34.
- **Spät helfen sie.** Am Ende lag M0 bei +2,0 gegen GNU Go und −10,1 gegen
  Fuego. Ohne Netz waren die Muster rund 43 Punkte wert (NM0 − N0).

Wenn das stimmt, müsste die KI gewinnen, wenn die Muster erst später
einsetzen. Ein Vorbehalt steht vorab fest: Über die Eröffnung urteilt hier
GNU Gos `estimate_score`, und die ist früh in der Partie grob. Ob der Vorsprung
nach Zug 40 echt ist, zeigt erst der Endstand.

## 2. Arme und Schalter

**Neuer Schalter `musterAb`** in `index.html`: Die Muster zählen erst ab der
Zugzahl `mc >= musterAb`, davor zählt nur `evaluateMove`. Default 0, also das
heutige Verhalten, bitgenau ([`tests/muster.js`](../tests/muster.js): vor
`musterAb` wie Gewicht 0, ab `musterAb` wie ohne Schalter). Der Schalter wirkt
im Spiel genauso wie im Messwerkzeug. Damit wäre ein Gewinn direkt übertragbar.

[`auswertung/komponenten/arme-m.sh`](../auswertung/komponenten/arme-m.sh):

| Arm | Angabe (`--ki`) | Partien je Gegner |
|---|---|---:|
| D | – | 480 |
| M0 | `musterGewicht=0` | 480 |
| A40 | `musterAb=40` | 480 |
| A80 | `musterAb=80` | 480 |

- **D und M0 werden nicht neu gespielt.** Ihre Partien stammen aus Stufe A
  ([`komponenten/lauf1`](daten/komponenten/lauf1/), Seed 220). Die neuen Arme
  spielen mit demselben Seed dieselben Partienummern. Der neue Schalter ändert
  mit Default 0 nichts, das prüfen zwei Kontrollen (§3).
- **Probe:** A40 muss in jedem Paar die ersten 40 Züge wie M0 spielen, A80 die
  ersten 80. Davor sind beide Arme dieselbe Engine.

## 3. Bedingungen

**M1** wie in Stufe A ([`komponenten.md`](komponenten.md) §3): sechs
Vorgabesteine, 120 Simulationen, Aufgabe der KI aus, der Gegner gibt nicht auf,
bis 600 Züge, Schätzung nach Zug 40, 80, 120 und 200. Gegner g ist GNU Go
Stufe 1, Gegner f Fuego (SVN r2038, C++14) mit 100 Spielen je Zug, GNU Go zählt.

| Eingabe | Wert |
|---|---|
| `seed` | 220 |

Der Seed ist fest im Workflow, es gibt kein Eingabefeld.

**M2:** Selbstspiel des Arms gegen D, je 360 Partien in zwölf Teilen zu 30,
beide Seiten 120 Simulationen, ohne Aufgabe, bis 600 Züge, Farben im Wechsel
([`selbstspiel-spielen.sh`](../auswertung/dagger/selbstspiel-spielen.sh) mit
`ARME_DATEI=auswertung/komponenten/arme-m.sh`, `OHNE_AUFGABE=1`). Seeds: Teil k
spielt mit Basis + k − 1, Basis **20262201** für A40 und **20262301** für
A80. Beide sind noch nie benutzt.

**Kontrollen.** Je ein Job spielt die Partien 1 bis 20 von D nach, gegen GNU Go
und gegen Fuego. Erwartet: 20 von 20 Zug für Zug gleich wie in Stufe A. Weicht
eine ab, gilt M1 nicht als gepaart mit Stufe A. Dann wird D neu gespielt, bevor
ein Urteil fällt.

## 4. Endpunkt und Entscheidung, vorab festgelegt

[`bericht.js`](../auswertung/komponenten/bericht.js) mit `--stufe M`,
[`ergebnis-m.sh`](../auswertung/komponenten/ergebnis-m.sh),
[`selbstspiel-bericht.js`](../auswertung/selbstspiel-bericht.js).

**M1:** Endstand Arm − D nach GNU Gos Zählung, gepaart nach Partienummer, je
Gegner. Zwei Arme, also nach Bonferroni **alpha 0,025** je Arm, Intervall
97,5 % (t). Ein Arm ist **„besser gegen beide Gegner“**, wenn die Untergrenze
seines Intervalls gegen GNU Go **und** gegen Fuego über 0 liegt. Er ist
**„schlechter“**, wenn die Obergrenze gegen mindestens einen Gegner unter 0
liegt. Sonst ist er **„nicht belegt“**.

**M2:** Siegrate des Arms gegen 50 %, exakter Binomialtest, zweiseitig,
alpha 0,05.

| M1 | M2 des Arms | Folge |
|---|---|---|
| genau ein Arm besser gegen beide Gegner | nicht signifikant unter 50 % | **`musterAb` dieses Arms wird Default** |
| beide besser gegen beide Gegner | beide nicht signifikant unter 50 % | der Arm mit dem größeren Mittel der beiden Differenzen wird Default |
| besser gegen beide Gegner | signifikant unter 50 % | nicht Default; untersuchen |
| sonst | — | Default bleibt 0; berichtet werden die Intervalle |

Gegen nur einen Gegner besser reicht nicht. Seit Stufe A gilt: Was nur gegen
GNU Go hilft, kann auch an GNU Go gebunden sein.

**Beschreibend, ohne Anspruch:** Phasenprofil nach Zug 40, 80, 120 und 200,
Siege, erste Abweichung von D, Unterschied der Gegner, die Probe aus §2.

## 5. Auflösung, vorab gerechnet

Die SD der Differenzen M0 − D lag in Stufe A bei 73 (GNU Go) und 83 (Fuego).
Mit 480 Paaren, alpha 0,025 und 80 % Power sind also rund **10 bis 12
Punkte** sichtbar. M2 mit 360 Partien erkennt eine Abweichung von 50 % ab rund
7 Prozentpunkten.

## 6. Erwartung vorab

- **Phasen:** A80 liegt nach Zug 40 und 80 genau wie M0 vorn (+27 und +14
  gegen GNU Go), A40 nach Zug 40 wie M0. Danach nähern sich beide D.
- **Endstand:** ein kleiner Gewinn oder nichts, eher 0 bis +10. Mehr als
  +10 ist unwahrscheinlich, weil M0 am Ende schon nahe D lag. Ob die Auflösung
  reicht, ist offen. Das wahrscheinlichste Ergebnis ist „nicht belegt“.
- **Zwischen den Armen:** A40 eher besser als A80. Ab Zug 80 wirkt zusätzlich
  das Netz, und mit A80 hätte die KI bis dahin gar keinen gelernten Teil.
- **M2:** nahe 50 %.

## 7. Ablauf und Dauer

[`muster-eroeffnung.yml`](../.github/workflows/muster-eroeffnung.yml), manuell
auf `main`, ohne Eingaben:

- `fuego-bauen`: Fuego einmal bauen;
- `gnugo`: A40 und A80 × 24 Teile zu 20 Partien gegen GNU Go (48 Jobs);
- `fuego`: A40 und A80 × 12 Teile zu 40 Partien gegen Fuego (24 Jobs);
- `selbstspiel`: A40 und A80 × 12 Teile zu 30 Partien gegen D (24 Jobs);
- `kontrolle-g`, `kontrolle-f`: die Kontrollen aus §3;
- `ergebnis`: Bericht, Rohdaten gepackt, Branch
  `ergebnisse/muster-eroeffnung-lauf<N>` unter
  `docs/daten/muster-eroeffnung/lauf<N>/`. Nur dieser Job darf ins Repo
  schreiben.

Zusammen 1 920 Partien gegen die beiden Gegner, 720 im Selbstspiel und 40 in
den Kontrollen. Erwartet werden **1,5 bis 2 Stunden**.

## 8. Danach

Der Nachtrag wendet die Regel aus §4 an. Wird ein Arm Default, ändert sich nur
`musterAb` in `index.html`, samt Kommentar und README. Sonst bleibt der Schalter
mit 0 im Code, und das Ergebnis steht beim Schalter.

## 9. Nachtrag: Ergebnis von Lauf 1 (29.10.2026)

[Workflow-Lauf 40866993818](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40866993818)
auf Merge `d6e3ddb`, in knapp anderthalb Stunden (11:38 bis 13:02 UTC). Alle
99 Jobs sind grün, es fehlt kein Teil. Daten:
[`docs/daten/muster-eroeffnung/lauf1/`](daten/muster-eroeffnung/lauf1/).

**Der Lauf ist sauber.** Keine Partie ist abgebrochen, keine lief bis zum
Zuglimit. Beide Kontrollen sind bestanden (je 20 von 20 Partien gleich wie in
Stufe A), der neue Schalter ändert mit 0 also nichts. Die Probe trifft in allen
Paaren zu: A40 spielt in 480 von 480 Paaren die ersten 40 Züge wie M0, A80 die
ersten 80, gegen beide Gegner.

### M1: Arm − D, Endstand (97,5 %)

| Arm | gegen GNU Go | gegen Fuego | Urteil |
|---|---|---|---|
| A40 | −3,7 [−11,2; +3,7] | +0,8 [−8,3; +9,9] | nicht belegt |
| A80 | +3,5 [−3,8; +10,9] | −3,1 [−11,9; +5,6] | nicht belegt |

### M2: Selbstspiel gegen D, ohne Aufgabe (360 Partien)

| Arm | Siege | Rate | 95 % | p |
|---|---:|---:|---|---:|
| A40 | 160 | 44,4 % | [39,4; 49,6] | 0,040 |
| A80 | 100 | **27,8 %** | [23,4; 32,6] | 1,5 · 10⁻¹⁷ |

### Entscheidung nach §4

Kein Arm ist gegen beide Gegner besser, und beide liegen im Selbstspiel
signifikant unter 50 %. **`musterAb` bleibt 0**, die Muster zählen weiter von
Anfang an. Der Schalter bleibt im Code, das Ergebnis steht bei ihm.

### Einordnung

- **Gegen GNU Go und Fuego ändert der spätere Einsatz nichts Messbares.** Alle
  vier Intervalle enthalten 0. Ein Gewinn von mehr als rund 11 Punkten ist
  gegen beide Gegner ausgeschlossen.
- **Im Selbstspiel schadet er klar,** am stärksten mit A80: Nur 28 % der
  Partien gegen den Default gewinnt die KI, wenn die Muster erst ab Zug 80
  zählen. Die Muster tragen in der Eröffnung also doch etwas bei. Gegen die
  eigene Engine wird das sichtbar, gegen die beiden fremden Gegner nicht.
- **Der frühe Vorsprung war eine Täuschung des Richters.** Nach Zug 40 liegen
  beide Arme wieder +27 (GNU Go) bzw. +35 (Fuego) vorn, genau wie M0. Bis Zug
  200 ist das gegen beide Gegner aufgebraucht, und am Ende bleibt nichts.
  GNU Gos `estimate_score` bewertet die Eröffnung ohne Muster besser, als sie
  ist. Das Phasenprofil aus Stufe A war damit kein Beleg für einen Schaden der
  Muster, sondern ein Merkmal der Schätzung.

### Abgleich mit der Erwartung (§6)

| Erwartung | eingetreten? |
|---|---|
| A80 nach Zug 40 und 80, A40 nach Zug 40 wie M0 vorn | ja, genau (Probe 480 von 480) |
| Endstand eher 0 bis +10, wahrscheinlich nicht belegt | ja, beide nicht belegt |
| A40 eher besser als A80 | gemischt: gegen Fuego und im Selbstspiel ja, gegen GNU Go nein |
| M2 nahe 50 % | **nein**: 44,4 % und 27,8 %, beide signifikant darunter |

### Nachträgliche Diagnose der Selbstspiel-Niederlagen (ohne Anspruch)

Nachgetragen am 29.10.2026, nach dem Lauf und an schon bekannten Daten. Es
wurde keine Partie neu gespielt. Die Zahlen beschreiben nur, sie begründen
keine Entscheidung. Gerechnet mit
[`selbstspiel-diagnose.js`](../auswertung/komponenten/selbstspiel-diagnose.js)
aus `m2-A40.jsonl.gz` und `m2-A80.jsonl.gz`. Alles aus Sicht des Arms mit
späten Mustern (B), gewertet wie im Harness: Fläche, Benson-tote Steine
entfernt.

Geprüft wird, ob die Niederlagen im Selbstspiel an der Wertung hängen
könnten: an der Komi, an knappen Partien oder an einer Farbe.

| Arm | Siege, Komi 7,5 | Komi 0 | Sieger kippt | davon für B | Niederlagen | Median | knapp (über −7,5) | Schranke |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A40 | 160 | 155 | 39 | 17 | 200 | −18,5 | 33 | 53,6 % |
| A80 | 100 | 99 | 33 | 16 | 260 | −26,5 | 31 | 36,4 % |

| Arm | B als Schwarz: Siege, Endstand Ø | B als Weiß: Siege, Endstand Ø | Schwarz − Weiß (95 %) |
|---|---|---|---|
| A40 | 68 von 180, −5,4 | 92 von 180, +0,1 | −5,5 [−11,9; +0,8] |
| A80 | 40 von 180, −19,6 | 60 von 180, −13,7 | −5,9 [−12,5; +0,6] |

| Arm | Zug 150 | Zug 200 | Zug 250 | Ende | B vorn nach Zug 150 | geschlagene Steine B / A |
|---|---:|---:|---:|---:|---:|---|
| A40 | −4,3 | −4,1 | −1,0 | −2,7 | 105 von 360 | 31,8 / 30,8 |
| A80 | −11,7 | −11,1 | −5,3 | −16,7 | 35 von 360 | 36,9 / 28,4 |

Die Spalten „Zug 150“ bis „Ende“ zeigen den Gebietsstand ohne Komi, Mittel
über alle 360 Partien.

- **Die Komi erklärt nichts.** Die Engine spielt komi-blind (die Suche
  kennt keine Komi; `KOMI` steht in `index.html` nur in der Anzeige, im SGF
  und im Ergebnis, mit dem das Policy-Netz im Browser nach der Partie
  lernt). Mit Komi 0 ändert sich die Zahl der Siege kaum, und die gekippten
  Partien verteilen sich etwa gleich auf beide Seiten.
- **Knappe Partien erklären es auch nicht.** Selbst wenn eine andere Wertung
  alle 31 knappen Niederlagen von A80 kippte, läge A80 bei 36,4 %, also
  weiter klar unter 50 %. Die Hälfte der Niederlagen geht mit mehr als 26
  Punkten verloren.
- **Keine Farbe ist schwach.** B schneidet als Schwarz in beiden Armen gleich
  viel schlechter ab als als Weiß (−5,5 und −5,9; beide Intervalle enthalten
  0). Das liegt also nicht am Arm, sondern eher daran, dass Komi 7,5 Schwarz
  in diesem Selbstspiel um etwa 3 Punkte benachteiligt. Daher kommen auch die
  40 gegen 60 Siege von A80 je Farbe.
- **Der Rückstand entsteht früh.** Nach Zug 150 liegt B bei A80 nur in 35
  von 360 Partien vorn. Ab Zug 80 spielen beide Seiten gleich, der Rückstand
  stammt also aus den Zügen ohne Muster. Der Gebietsstand während der Partie
  ist grob (tote Steine erkennt nur Benson). Dass er bei Zug 250 kleiner ist
  als bei Zug 200 und am Ende, ist eher Rauschen der Zählung als ein
  Aufholen.
- **Was das nicht zeigt:** Die Dosis (A40 schwächer als A80) belegt, dass
  der Effekt im Selbstspiel echt ist. Ob er gegen einen fremden Gegner auf
  dem leeren Brett auftritt, zeigt sie nicht. Eine Verstärkung durch das
  Selbstspiel würde mit der Länge des Fensters genauso wachsen. Gemessen
  wurde gegen fremde Gegner nur mit sechs Vorgabesteinen (M1: nichts
  Messbares). Für `musterAb` ändert das nichts: Der Schalter bleibt 0 bei
  jedem Ausgang, weil M1 gegen beide Gegner keinen Gewinn zeigt.
