# Übergabe: Querverweis zwischen Go-html-Game-MoE und codex

Stand 08.11.2026, `main` dieses Repos bei `12ec527` (Merge von #295; davor `35e3581`). **Zweck:** zeigen, was wo steht, damit nichts doppelt geschrieben oder gepflegt wird. Diese Datei enthält **keine Regeln**
(die stehen in `CLAUDE.md`) und **keine Ergebnisse** (die stehen in den jeweils genannten Docs). Sie erteilt kein Go.

## 1. Zwei Repos, ein Ursprung

- `Hazeberry/codex` ist laut der dortigen `HANDOFF.md` ein Import dieses Repos mit Historie (übernommen aus Commit `818ba2a54763a9977b802f48b74b9f41aaee868b`, dort PR #1).
  Dieselbe Datei nennt `Hazeberry/codex` als „Ziel der weiteren Arbeit“ (Stand der Datei: `17117ae`, gelesen am 07.11.2026). Hier liefen danach die Passregel-Arbeit (PR #275 bis #285) und die Bughunt-Wiederholung (PR #286).
- Beide Repos haben sich seitdem unterschieden. Gemessener Stand: `gtp-ki.js` ist byteidentisch; `index.html` weicht in 150 Zeilen ab, nur im Engine-Bereich
  (codex `17117ae` gegen dieses Repo `f360445`, siehe `docs/bughunt-wiederholung.md` §2). Was dort an Code oder Messungen entstanden ist, gilt hier **nicht automatisch**.
- **Maßgeblich ist jeweils die Datei im Repo, in dem das Thema liegt** (§2). Dort steht der Stand; hier steht nur der Hinweis.

## 2. Wo was steht (Verweise, keine Kopien)

| Thema | Repo | Fundstelle |
|---|---|---|
| Prior-Anhebung ohne Orakel, H/R-Hauptlauf (Vorbereitung) | codex | `HANDOFF.md`, `docs/prior-anhebung-ohne-orakel.md` |
| Diagnose Laufzeit und GNU-Go-Absturz | codex | `HANDOFF.md`, `docs/diagnose-laufzeit-absturz.md` |
| Einzelfall-Diagnosen: Aufgabe nach Zug 113, `deathTransfer`, Gefangenenwert und Rollouts, Gefangenendeckel-Fortsetzungen | codex | `HANDOFF.md`; `docs/untersuchung-aufgabe-113.md`, `docs/death-transfer-diagnose.md`, `docs/gefangene-rollout-aufgabe.md`, `docs/gefangenendeckel-fortsetzungen.md` |
| Bughunts: neun Prüfaufträge (UI, TRAIN, NET, GTP) und deren Verifikation (PR #20) | codex | `HANDOFF.md`; `docs/bughunt-verifikation.md`, `docs/bughunt-browser.md` auf dem Branch `claude/bughunt-verifikation` (Merge-Stand von PR #20 nicht geprüft) |
| **Wiederholung** der Bughunt-Prüfung (Ausführung durch Claude, Rohdaten und Screenshots) | dieses Repo | `docs/bughunt-wiederholung.md`, `docs/daten/bughunt-wiederholung/lauf1/` |
| Diagnosezustand 08.11.2026: Zählabweichung (15 Einheiten), Vorschau gegen GNU-Go-Tot-Liste, `browser.cjs` gegen die eigene `index.html`, GTP-1/GTP-3 (gelesen) | dieses Repo | `docs/zaehlung-mechanismus.md`, `docs/daten/zaehlung-mechanismus/`, `auswertung/zaehlung-mechanismus/` |
| Passregel: Versuch, Vergleich (Stufen A bis C), Zähldiagnose, Vorsprung-Untersuchung | dieses Repo | `docs/passregel-versuch.md`, `docs/passregel-vergleich.md` (§13 bis §15), `docs/passregel-zaehldiagnose.md`, `docs/passregel-vorsprung.md` (§9) |
| Stärkemessungen, Komponenten, Skalierung, Fuego, PWA-Vergleich, Kandidaten-Orakel (älterer Stand) | dieses Repo (in codex als übernommene Historie) | `docs/skalierung.md`, `docs/komponenten.md`, `docs/fuego.md`, `docs/pwa-vergleich.md`, `docs/kandidaten-orakel.md`, `docs/kandidaten-orakel-vierarm.md` |

## 3. Stand der Passregel in diesem Repo (Orientierung; maßgeblich sind die Docs)

Die Regel `passNachGegnerpass` bleibt **ausgeschaltet** (Standard 0), `index.html` ist dafür nicht geändert. Aus keinem Ergebnis folgt eine Aktivierung.

- Stufe A (Lauf 42302248358) abgeschlossen; Probe 1 (Lauf 42302924212) **ungültig**; Zähldiagnose (Lauf 42317041690); Probe 2 (Lauf 42324497564) laut Auswertung gültig.
- Stufe C (Lauf 42331033107) laut Auswertung gültig: verlorene Siege durch sofortiges Passen L = A = K = 0, obere Grenze des 95-%-Intervalls 0,66 % (Fläche) und 0,71 % (Territory); der vorab festgelegte
  Wortlaut „höchstens 2 %“ gilt unter den Modellannahmen. Zahlen und Grenzen: `docs/passregel-vergleich.md` §15. Die Reihenfolge Festlegung vor Merge ist dort vermerkt.
- Vorsprung-Untersuchung (Lauf 42340940626) gültig: Die Zerlegung weist Gruppen aus, die GNU Gos Tot-Liste als tot führt und die Zählvorschau nicht entfernt. **Ursache und Richtigkeit der Tot-Bewertung sind offen**
  (`docs/passregel-vorsprung.md` §9).
- Die Rohdaten der Stufe C sind als unverändertes Artefakt-ZIP mit Manifest und Prüfsummen unter [`docs/daten/passregel-vergleich/stufe-c-42331033107/`](docs/daten/passregel-vergleich/stufe-c-42331033107/README.md) gesichert (siehe `docs/passregel-vergleich.md` §16). Das ursprüngliche Actions-Artefakt läuft am 05.02.2027 ab; die Git-Kopie unterliegt dieser Frist nicht.

- Auch die Artefakte [Vorsprung-Untersuchung](docs/daten/passregel-vorsprung/lauf-42340940626/README.md) und [Probe 2](docs/daten/passregel-vergleich/probe-2-42324497564/README.md) sind als unveränderte ZIPs mit Manifest und Prüfsummen gesichert (`docs/passregel-vergleich.md` §17).

## 4. Offene Punkte (alle ohne Go)

Stand der Diagnose: `docs/zaehlung-mechanismus.md` (lokal, nur lesend; keine Spieländerung, kein Actions-Lauf).

- Ursache der Zählabweichung bei 15 Einheiten (`docs/passregel-vergleich.md` §15): **nicht untersucht**; sie braucht GNU Gos Punktklassen je Stellung (Actions, eigene Vorabfestlegung und Go). Beschrieben ist nur das Muster (`docs/zaehlung-mechanismus.md` §5).
- Warum die Vorschau von GNU Go als tot geführte Gruppen behält: als Diagnose beschrieben (§6: Verbände, zwei Augen, Ein-Punkt-Augen ohne Diagonalprüfung in `toteSteineAmEnde`). Die Gegenprobe mit Diagonalprüfung ist ein **nachträglicher Diagnosebefund**, keine Verbesserungsmessung;
  46 „nur App tot“-Steine in V sind ungeprüft. Ob GNU Gos Tot-Bewertung richtig ist, bleibt offen. **Vorabfestlegung für eine Augenprüfung: getrennt zu besprechen, kein Go.**
- Einzelanalysen der Gegenproben (`docs/zaehlung-mechanismus.md` §12): Diagonalauge je Stellung: keine neu entstandenen Abweichungen in den 563 Stellungen (Steine), vier V-Restfälle; Freiheitsverband je V-Stellung: kein ausreichender Hinweis auf einen tragfähigen Hebel für die großen Restfälle. **Vorabfestlegung zur Diagonalprüfung: `docs/diagonalpruefung-vorabfestlegung.md`; §10 ist Arbeitsplan (E-0), AP1 und AP2 sind umgesetzt (Schalter `diagonalAugeEnde`, Standard aus, bitgleich bei aus; §13), AP3 (Stufe-1-Werkzeug, Workflow `diagonal-pruefung.yml`, Test) ist gebaut, aber nicht gelaufen (`docs/diagonalpruefung-vorabfestlegung.md` §14); Stufen 1 bis 3 sind nicht gestartet und brauchen je ein eigenes Go; Beurteiler bis vor Stufe 2 offen. Die 15 Zählabweichungen bleiben ein getrenntes Vorhaben.**
- Abweichende Gruppenzahlen (hier 71 und 10 Ketten, `docs/passregel-vorsprung.md` §9: 76 und 8 Gruppen): **nicht abgeglichen** (§6.7).
- `browser.cjs --html index.html` gegen die `index.html` dieses Repos: **gelaufen**, alle sieben Fälle reproduziert (§4 des Docs; nur Chromium 153).
- GTP-3 berührt die PWA-Läufe nach dem Gelesenen nicht. GTP-1: eingehende `play`-Züge sind durch GNU Go vorgeschaltet geschützt; **vom Adapter selbst erzeugte `genmove`-Züge sind nicht geprüft** (§3), „PWA-Läufe nicht betroffen“ ist nicht gesichert.
- Korrekturen der Bughunt-Befunde: eigene Vorabfestlegung und Go.

## 5. Pflege

- Jedes Thema steht in **einem** Repo; das andere verweist nur. Zahlen, Lauf-IDs und SHAs stehen in den Docs der jeweiligen Arbeit, hier nur zur Orientierung.
- Ändert sich in einem Repo ein Verweis (Dateiname, Abschnitt, Repo-Zuordnung), wird dieser Abschnitt hier angepasst; sonst nichts doppelt nachgezogen.
- **Gegenverweis für `Hazeberry/codex`** (dort zu schreiben, nicht hier; Vorschlag): „Die Passregel-Arbeit (Stufen A bis C, Zähldiagnose, Vorsprung-Untersuchung) und die Wiederholung der
  Bughunt-Prüfung stehen in `Hazeberry/Go-html-Game-MoE`, siehe dessen `HANDOFF.md` §2 und §3. Dort nicht doppelt pflegen.“
- Freigaben gelten unverändert nach `CLAUDE.md`: Nur ein ausdrückliches Go startet einen Lauf oder merged einen PR; Docs mit Vorgaben liest Hazeberry vor dem Merge.
