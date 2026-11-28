<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Endspiel-Hypothese bei B: Vorabfestlegung

**Stand: 28.11.2026. Status: festgelegt, Stufe 1 noch nicht nach Armen gerechnet.** Dieses Doc enthält Vorgaben für
Werkzeug und Läufe. Hazeberry liest es vor dem Merge. Jede Stufe braucht ein eigenes Go; der Merge dieses Docs ist
keins.

## 1. Anlass und Hypothese

Im K3-Vergleich (2600 gegen 5200 Simulationen) verliert die doppelte Suche (B) gegen die einfache (A): 577 : 653,
−21,5 Elo [−41,3; −1,8] ([`skalierung-heute-vorabfestlegung.md`](skalierung-heute-vorabfestlegung.md) §18). Die
Aufbauprüfung
([`skalierung-aufbaupruefung-vorabfestlegung.md`](skalierung-aufbaupruefung-vorabfestlegung.md) §5 bis §7) fand keinen
Aufbaufehler; die Ursache blieb offen. Beschreibend fiel auf, dass B in beiden Farben häufiger und etwas
früher passt und dass sein q im Spätspiel (ab Zug 301) deutlich niedriger liegt als das von A. Daraus entstand die
Hypothese, die dort als solche gekennzeichnet ist:

> **H:** B verliert ab Zug 301 (Endspiel nach den Zugphasen aus §3 der Aufbauprüfung) gegenüber A Punkte.

H ist **nicht getestet**. Pässe und q sind keine Messung von Punkten, und q der beiden Arme stammt aus verschieden
tiefer Suche.

## 2. Was vor dieser Festlegung gerechnet wurde

Zur Planung wurde am 28.11.2026 eine Streuung über **alle** Partien gerechnet, ohne Trennung nach Armen: der Endstand
minus GNU Gos Schätzung nach Zug m, aus Sicht von Schwarz.

| Messpunkt | SD in Punkten | Median der Abweichung (Betrag) | Endstand gleich der Schätzung (±0,5) |
|---|---:|---:|---:|
| nach Zug 100 | 38,6 | 25,4 | 0,8 % |
| nach Zug 200 | 34,3 | 19,7 | 1,8 % |
| nach Zug 300 | 10,6 | 0,0 | 54,7 % |

Gleichzeitig: Von 1230 Partien haben 1226 mehr als 300 Züge. Ab Zug 300 ist der Endstand also in gut der Hälfte der
Partien schon festgelegt, und der Abschnitt ab Zug 301 kann nur in der anderen Hälfte Punkte verschieben.

**Nicht gerechnet** wurden die Zerlegung aus Sicht von B und alle Abschnittswerte nach Armen. Diese Festlegung gilt vor
dieser Rechnung.

## 3. Stufe 1: Zerlegung des Endstands (keine neue Partie)

**Frage:** In welchem Abschnitt der K3-Partien verschiebt sich der Endstand zu Ungunsten von B?

**Daten:** nur die archivierten Einzelwerte,
[`k3-partien.csv`](daten/skalierung-heute/stufe-2-20261126/k3-partien.csv) (Endstand, Züge, Farbe von A) und
[`k3-diagnose-partien.csv`](daten/skalierung-heute/aufbaupruefung-20261127/k3-diagnose-partien.csv) (GNU Gos
`estimate_score` nach Zug 100, 200, 300, chinesische Regeln, Komi 7,5, aus Sicht von Schwarz). Alle 1230 Partien, keine
Auswahl.

**Größen je Partie, aus Sicht von B** (σ = +1, wenn B Schwarz spielt, sonst −1; s100, s200, s300 die Schätzungen,
Endmarge = „B x − W y“ aus dem Endstand der Messung):

| Größe | Rechnung | Bedeutung |
|---|---|---|
| Y100 | σ · s100 | Lage nach Zug 100 |
| D1 | σ · (s200 − s100) | Veränderung in den Zügen 101–200 |
| D2 | σ · (s300 − s200) | Veränderung in den Zügen 201–300 |
| **D3** | σ · (Endmarge − s300) | **Veränderung ab Zug 301 bis zum Ende (primär)** |
| T | σ · Endmarge | Endstand; T = Y100 + D1 + D2 + D3 |

Negativ heißt: B verliert in diesem Abschnitt Punkte gegenüber A. Das Spiel ist ein Nullsummenspiel; was B verliert,
gewinnt A. Jede Partie enthält beide Arme, die Zerlegung ist damit je Partie gepaart, und jeder Arm spielt in 615 von
1230 Partien Schwarz, sodass ein Fehler von GNU Gos Schätzung, der von der Farbe abhängt, sich aufhebt.

**Je Abschnitt berichtet:** n, Mittel, Standardabweichung, 95-%-Intervall (t), Zahl der Partien zu Ungunsten, zu
Gunsten und ohne Veränderung, exakter zweiseitiger Vorzeichentest (Nullen ausgenommen), Clopper-Pearson (95 %) für den
Anteil zu Ungunsten, dazu getrennt nach der Farbe von B. Partien unter 300 Zügen (vier) gehen nur in die Abschnitte
ein, für die ihre Messpunkte reichen; die Zahl steht im Bericht.

**Urteil nur für D3**, ein Test bei α = 0,05, nach dem Vorzeichentest; der Mittelwert muss in dieselbe Richtung zeigen.
Die Sätze stehen im Werkzeug wörtlich:

- p < 0,05, mehr Partien zu Ungunsten und Mittel < 0: „Ab Zug 301 verliert B gegenüber A nachweisbar Punkte: m Punkte
  [u; o] (95 %), in k von n Partien mit Veränderung.“
- p < 0,05, mehr Partien zu Gunsten und Mittel > 0: „Ab Zug 301 gewinnt B gegenüber A nachweisbar Punkte: …“
- p < 0,05, aber Vorzeichentest und Mittel zeigen in verschiedene Richtungen: „… kein einheitliches Urteil.“
- p ≥ 0,05: „Ein Punktverlust von B ab Zug 301 gegenüber A ist nicht nachgewiesen. Das Intervall [u; o] sagt, wie
  groß er sein könnte.“

Alle anderen Abschnitte und alle ergänzenden p-Werte sind beschreibend und begründen kein weiteres Urteil. Es gibt
keine Mehrfachtests, weil nur D3 getestet wird.

**Gültigkeit:** zwei Zustände. Ungültig heißt „KEIN URTEIL“ mit Grund, und der Lauf wird rot: Dateien nicht lesbar
oder nicht vollständig (1230 Partien, 123 Seeds zu je 10), Schlüssel nicht in beiden Dateien oder doppelt, Farbe von A
und Arme nicht stimmig, Endstand unlesbar, unentschieden oder nicht zum Verlierer passend, Zugzahl nicht gleich oder
außerhalb von 1 bis 600, Messpunkt fehlend obwohl die Partie lang genug ist oder vorhanden obwohl sie kürzer ist,
Abschnitte, die sich nicht zum Endstand addieren. Vorab werden die Prüfsummen beider Datenordner gegen ihre
`SHA256SUMS` geprüft.

## 4. Was Stufe 1 sagen kann und was nicht

- Sie zeigt, **in welchem Abschnitt** sich der Endstand von K3 zu Ungunsten von B verschiebt, gemessen an GNU Gos
  Schätzung. Sie zeigt nicht, warum.
- Sie zeigt nicht, ob B oder A in diesem Abschnitt „anders spielt als bei gleicher Stellung“. Eine Verschiebung kann
  auch aus den Stellungen kommen, in die beide vorher geraten sind. Das wäre Stufe 2.
- GNU Gos Schätzung ist vor Zug 300 grob (SD der Abweichung zum Endstand 34 bis 39 Punkte, siehe §2). Die Abschnitte
  Y100, D1 und D2 haben deshalb weite Intervalle; nach Zug 300 ist die Schätzung in mehr als der Hälfte der Partien
  exakt, D3 ist genau.
- Der Endstand T ist die Summe der Abschnitte. Stufe 1 zerlegt damit den K3-Effekt in Teile und erklärt ihn nicht.
- Pässe und q bleiben Hypothesen für die Mechanik. Kein Ergebnis von Stufe 1 ändert etwas am Spiel.

## 5. Entscheidung nach Stufe 1

Ohne automatische Folgefreigabe; jede Messung danach braucht Festlegung und Go.

- **D3 nachweisbar zu Ungunsten von B:** H ist für die Verschiebung gestützt. Dann ist Stufe 2 zu planen (§6).
- **D3 nicht nachgewiesen, zu Gunsten von B oder uneinheitlich:** H ist für die Züge ab 301 nicht gestützt. Der
  Abschnitt mit der größten Verschiebung ist dann beschreibend zu nennen, und ob Stufe 2 für ihn lohnt, ist eine neue
  Entscheidung mit Kosten.

## 6. Stufe 2 (Skizze, nicht festgelegt)

Fortsetzungsexperiment mit neuen Partien: aus Stellungen von K3 nach Zug W (Beginn des Abschnitts, in dem B verliert)
spielen A (2600) und B (5200) mit getauschten Farben weiter, gepaart je Stellung. Endpunkt wären die Punkte aus Sicht
von B, mit Vorzeichentest je Stellung. Der Harness braucht dafür eine Option, die Startstellungen aus dem Rohdump
nachspielt (Standard aus, bei aus bitgleich, mit Test). Auswahl der Stellungen, Zahl, Gültigkeit und Urteilssätze
kommen in eine eigene Festlegung.

Größenordnung, nur aus den vorhandenen Zahlen gerechnet und vorläufig:

| Start | Zeit je Fortsetzung (beide Arme) | 200 Stellungen, 400 Partien |
|---|---|---|
| nach Zug 300 | rund 2 Minuten | rund 13 Rechenstunden |
| nach Zug 200 | rund 4 bis 5 Minuten | rund 30 Rechenstunden |

Grundlage ist die Kostenformel aus §7.3 der Hauptfestlegung (Zeit ist proportional zu den Simulationen: rund 1,0 s je
Zug bei 2600, 2,1 s bei 5200). Fallzahl: Mit der Streuung 10,6 ab Zug 300 ergäbe sich bei 200 Stellungen ein
Standardfehler von rund 0,5 Punkten, ein Unterschied von rund 1,5 Punkten wäre mit 80 % Macht erkennbar. Das gilt nur,
wenn die Streuung der Fortsetzung der von K3 entspricht.

## 7. Was läuft, wo, mit welchem Go

| Teil | Was | Wo | Go |
|---|---|---|---|
| Stufe 1 | Zerlegung der archivierten Einzelwerte, keine Partie | GitHub Actions, Workflow `endspiel-zerlegung.yml` auf `main`, unter einer Minute | Hazeberrys Go nach dem Merge dieser Festlegung |
| Stufe 2 | neue Partien | GitHub Actions | eigene Festlegung und eigenes Go, erst nach Stufe 1 |

Das Werkzeug (`auswertung/endspiel-zerlegung.js`) und seine Tests (`tests/endspiel-zerlegung.js`, erfundene
Datensätze mit bekannter Wirkung, dazu die Prüfung der echten Dateien auf Gültigkeit ohne Zerlegung) kommen mit
diesem Doc. Auf den echten Daten wird die Zerlegung erst nach dem Merge gerechnet, im Lauf in Actions.
