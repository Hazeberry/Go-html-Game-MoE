# Endspiel-Muster: Datenaggregation, Runde 1

**Status: festgelegt am 19.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–5
werden nicht mehr geändert.

---

## 1. Anlass

Der Pilot in [`muster-endspiel-spiel.md`](muster-endspiel-spiel.md) war bei
allen vier Gewichten schlechter als der Default (Endstand −19 bis −38 Punkte
über 60 Paare). Die Diagnose dort (§8) zeigt: Auf den Stellungen der alten KI
zieht die Tabelle im Einzelnen besser (+2,0 Punkte nach GNU Go), und die
Suche folgt ihr in 83 % der Züge. Auf den Stellungen aber, in die die Tabelle
selbst führt, trifft sie GNU Gos Zug nicht mehr besser als die alte Tabelle
(24,8 gegen 24,9 %; auf den Stellungen der alten KI 31,3 gegen 19,4 %).

Das ist die Verschiebung der Stellungen beim Lernen aus fremden Stellungen.
Das Mittel dagegen ist die Datenaggregation (Ross, Gordon und Bagnell 2011,
„DAgger“): mit der gelernten Strategie spielen, die dabei erreichten
Stellungen vom Lehrer beschriften lassen, mit den neuen und den alten
Stellungen neu lernen, wiederholen. Diese Datei legt Runde 1 fest.

Der Lauf geschieht in GitHub Actions, nicht im Container einer Sitzung
(Wunsch von Hazeberry vom 19.10.2026): unabhängig von der Sitzung, in einer
dokumentierten Umgebung, dem Lauf zugeordnet.

## 2. Verfahren

| Name | Bedeutung |
|---|---|
| **A** | Default: `musterEndspiel` 0 |
| **VOR** | die Strategie, mit der gespielt wird: `musterEndspiel` 200 mit der Tabelle T1 (die Tabelle aus Schritt 2, im Commit `63f727b`); im Pilot von Schritt 2 war das „B, Gewicht 200“ |
| **NEU** | `musterEndspiel` 200 mit der neu gelernten Tabelle T2 |

1. **Daten D1:** VOR spielt 240 neue Partien gegen GNU Go (Stufe 1, neun
   Vorgabesteine, 120 Simulationen, ausgespielt, Seed 207, 16 Teile zu je 15
   Partien). GNU Go beschriftet an jeder Stellung der KI ab Zug 81 seinen Zug
   (Stufe 10, `auswertung/muster-daten.js --seite ki`).
2. **Lernen:** T2 aus den Stellungen mit der KI am Zug in D0 (die Daten B und
   die Prüfdaten aus Schritt 1, zusammen die 20 196 Stellungen, aus denen auch
   T1 gelernt wurde) und D1, mit dem Verfahren aus
   [`muster-endspiel.md`](muster-endspiel.md) §5 (gemeinsames Bradley-Terry-
   Modell, 25 Durchläufe, Werte ab fünf möglichen Fällen) und den Gruppen m,
   l, z, d, u, k. Der Maßstab wird aus den Daten bestimmt, wie bei T1
   (`auswertung/muster-endspiel-tabelle.js`).
3. **Pilot:** A, VOR und NEU spielen je 60 Partien gegen GNU Go, Seed 204 (wie
   in Schritt 2, in zwei Hälften zu 30), gepaart nach Partienummer.
4. **Verschiebungsprobe:** GNU Go beschriftet die Stellungen der KI in 30
   Partien von NEU. Gemessen wird, wo GNU Gos Zug in der Wurzelliste steht,
   mit der alten Tabelle, T1 und T2 (`auswertung/muster-endspiel-
   verschiebung.js`), Dosis 200. In Schritt 2 war der Vorsprung von T1 auf den
   eigenen Stellungen weg.

## 3. Ausführung in GitHub Actions

Workflow [`endspiel-dagger.yml`](../.github/workflows/endspiel-dagger.yml),
manuell gestartet, mit den Eingaben dieser Runde:

| Eingabe | Wert |
|---|---|
| `runde` | 1 |
| `basis` | `63f727b` (index.html mit dem Schalter `musterEndspiel` und T1) |
| `tabelle`, `daten_extra` | leer |
| `seed_daten` | 207 |
| `seed_pilot` | 204 |
| `gewicht` | 200 |
| `kontrolle` | ja |

Der Schalter steht nicht in `index.html` auf `main`. Der Lauf legt die
`index.html` des Basis-Commits in den Arbeitsordner jedes Jobs
(`auswertung/dagger/vorbereiten.sh`) und checkt sie nie ein; der Basis-Commit
muss ein Vorfahr von `main` sein.

Jobs: `pruefen` (Eingaben), `daten` (16 Teile spielen und beschriften),
`lernen` (Zwischenspeicher, T2, `index.html` mit T2), `pilot-ref` (A und VOR,
je 2 × 30 Partien), `pilot-neu` (NEU, 2 × 30 Partien, dazu die Beschriftung),
`ergebnis` (Bericht, Rohdaten gepackt). Erwartete Laufzeit 60 bis 90 Minuten.

- **Dieselben Partien wie im Container.** `mctsFixedSims` zählt Simulationen
  statt Zeit, GNU Go bekommt den Seed (`gnugo-duell.js`). Der Container hat GNU
  Go 3.8 aus dem Paket 3.8-11build2; die Version des Runners steht im Log der
  Jobs. Der Lauf **prüft die Gleichheit**: Die 60 Partien von A und von
  VOR werden mit denen des Container-Pilots verglichen
  ([`daten/endmuster-pilot.json`](daten/endmuster-pilot.json), Arme `A` und
  `200`), gleicher Endstand und gleiche Zugzahl je Partie. Das ist keine
  Bedingung für die Entscheidung: Die Vergleiche zwischen A, VOR und NEU
  laufen alle in Actions und sind für sich gültig. Es zeigt aber, ob Actions
  und Container Zug für Zug dasselbe spielen.
- **Ergebnisse.** Der Bericht steht in der Übersicht des Laufs (und im Log des
  Jobs `ergebnis`). Die Rohdaten (240 Partien, beschriftete Stellungen, Pilot,
  beide Tabellen) legt der Workflow auf den Branch
  `ergebnisse/dagger-runde1-lauf<N>` unter
  `docs/daten/dagger/runde1-lauf<N>/`, als Commit von `github-actions[bot]`,
  dazu als Artefakt (90 Tage).
- **Sicherheit.** Nur manueller Start. Eingaben des Formulars stehen nur in
  `env`-Blöcken und werden geprüft, in Shell-Zeilen steht kein `${{ }}`
  (`tests/dagger.js` prüft das). Schreibrecht hat nur der letzte Job, und nur
  auf einen neuen Branch.

## 4. Entscheidung, vorab festgelegt

Endpunkt ist **NEU − A**: Endstand nach GNU Gos Zählung, 60 Paare, gepaarter
t-Test, zweiseitig, α = 0,05, mit 95-%-Intervall.

| Ergebnis | Folge |
|---|---|
| NEU − A signifikant größer als 0 | Der Pilot ist bestanden. Es folgt die Messung wie bei den früheren Mustern (240 Paare gegen GNU Go, 360 Partien im Selbstspiel) in einem eigenen Dokument mit eigener Vorabfestlegung; der Schalter kommt dafür nach `main`. |
| NEU − A nicht signifikant, **oder** signifikant kleiner als 0 mit NEU − VOR ≥ +10 Punkten | Runde 2. Die beschrifteten Stellungen dieser Runde kommen als `daten_extra` dazu, NEU ist dann VOR. Höchstens drei Runden insgesamt. |
| sonst | Ende, negatives Ergebnis als Nachtrag. Die Datenaggregation behebt es nicht. |

Zur Einordnung: VOR − A war im Pilot von Schritt 2 −21,8 (95 %: [−36,2; −7,4]).
Mit 60 Paaren liegt der Standardfehler bei rund 10 Punkten, ein Vorsprung muss
also gegen 20 Punkte gehen, um signifikant zu sein. Sekundär, ohne Anspruch:
NEU − VOR, Siege, die Schätzung nach Zug 120, die Verschiebungsprobe, die
Kontrolle gegen den Container-Pilot.

## 5. Grenzen

- **Eine Runde.** Die Datenaggregation braucht oft mehrere. Deshalb die
  zweite Zeile der Entscheidungstabelle, mit Obergrenze.
- **Lehrer, Schiedsrichter und Gegner sind dasselbe Programm** (GNU Go Stufe
  10, Stufe 10 und Stufe 1), wie in [`muster.md`](muster.md) §7.
- **Die Tabelle lernt weiter nur Züge, keine Folgen.** Sie ordnet die
  Kandidatenliste an der Wurzel; ob ein Zug eine Gruppe rettet oder in einen
  Fehler führt, sieht sie nicht. Die Verschiebung ist eine Ursache des
  schlechten Pilots, nicht notwendig die einzige.
- **Der Pilot ist grob.** 60 Paare erkennen Unterschiede ab rund 20 Punkten.
  Ein Pilot, der besteht, ist noch keine Messung.
- **T2 hat die Stellungen von D1 mitgelernt.** Auf ihnen ist sie zu günstig; die
  Verschiebungsprobe benutzt deshalb die Stellungen der Pilotpartien von NEU,
  die sie nicht gesehen hat.
