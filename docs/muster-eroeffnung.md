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
