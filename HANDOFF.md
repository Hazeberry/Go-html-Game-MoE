# Übergabe: Querverweis zwischen Go-html-Game-MoE und codex

Stand 08.11.2026, `main` dieses Repos bei `35e3581`. **Zweck:** zeigen, was wo steht, damit nichts doppelt geschrieben oder gepflegt wird. Diese Datei enthält **keine Regeln**
(die stehen in `CLAUDE.md`) und **keine Ergebnisse** (die stehen in den jeweils genannten Docs). Sie erteilt kein Go.

## 1. Zwei Repos, ein Ursprung

- `Hazeberry/codex` ist laut der dortigen `HANDOFF.md` ein Import dieses Repos mit Historie (übernommen aus Commit `818ba2a54763a9977b802f48b74b9f41aaee868b`, dort PR #1).
  Dieselbe Datei nennt `Hazeberry/codex` als „Ziel der weiteren Arbeit“ (Stand der Datei: `17117ae`, gelesen am 07.11.2026). Hier liefen danach die Passregel-Arbeit (PR #275 bis #286) und die Bughunt-Wiederholung.
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
| Passregel: Versuch, Vergleich (Stufen A bis C), Zähldiagnose, Vorsprung-Untersuchung | dieses Repo | `docs/passregel-versuch.md`, `docs/passregel-vergleich.md` (§13 bis §15), `docs/passregel-zaehldiagnose.md`, `docs/passregel-vorsprung.md` (§9) |
| Stärkemessungen, Komponenten, Skalierung, Fuego, PWA-Vergleich, Kandidaten-Orakel (älterer Stand) | dieses Repo (in codex als übernommene Historie) | `docs/skalierung.md`, `docs/komponenten.md`, `docs/fuego.md`, `docs/pwa-vergleich.md`, `docs/kandidaten-orakel.md`, `docs/kandidaten-orakel-vierarm.md` |

## 3. Stand der Passregel in diesem Repo (Orientierung; maßgeblich sind die Docs)

Die Regel `passNachGegnerpass` bleibt **ausgeschaltet** (Standard 0), `index.html` ist dafür nicht geändert. Aus keinem Ergebnis folgt eine Aktivierung.

- Stufe A (Lauf 42302248358) abgeschlossen; Probe 1 (Lauf 42302924212) **ungültig**; Zähldiagnose (Lauf 42317041690); Probe 2 (Lauf 42324497564) laut Auswertung gültig.
- Stufe C (Lauf 42331033107) laut Auswertung gültig: verlorene Siege durch sofortiges Passen L = A = K = 0, obere Grenze des 95-%-Intervalls 0,66 % (Fläche) und 0,71 % (Territory); der vorab festgelegte
  Wortlaut „höchstens 2 %“ gilt unter den Modellannahmen. Zahlen und Grenzen: `docs/passregel-vergleich.md` §15. Die Reihenfolge Festlegung vor Merge ist dort vermerkt.
- Vorsprung-Untersuchung (Lauf 42340940626) gültig: Die Zerlegung weist Gruppen aus, die GNU Gos Tot-Liste als tot führt und die Zählvorschau nicht entfernt. **Ursache und Richtigkeit der Tot-Bewertung sind offen**
  (`docs/passregel-vorsprung.md` §9).
- Die Rohdaten der Stufe C liegen **nicht** im Repo: Artefakt `bericht` (ID 13557498693 am Lauf 42331033107) läuft am 05.02.2027 ab.

## 4. Offene Punkte (alle ohne Go)

- Ursache der Zählabweichung bei 15 Einheiten (`docs/passregel-vergleich.md` §15) und warum die Vorschau die Gruppen aus §3 nicht entfernt.
- Sicherung der Rohdaten der Stufe C ins Repo oder an einen anderen dauerhaften Ort.
- Ein Lauf von `browser.cjs --html index.html` gegen die `index.html` **dieses** Repos; bisher beruht die Übertragbarkeit der Bughunt-Befunde auf dem Textvergleich in `docs/bughunt-wiederholung.md` §2.
- Ob GTP-1 und GTP-3 (`gtp-ki.js`) die Läufe berühren, in denen der Adapter als Gegner-KI diente (`gnugo-duell.js`, PWA-Vergleich, Gruppe „alte PWA“); nicht geprüft.
- Korrekturen der Bughunt-Befunde: eigene Vorabfestlegung und Go.

## 5. Pflege

- Jedes Thema steht in **einem** Repo; das andere verweist nur. Zahlen, Lauf-IDs und SHAs stehen in den Docs der jeweiligen Arbeit, hier nur zur Orientierung.
- Ändert sich in einem Repo ein Verweis (Dateiname, Abschnitt, Repo-Zuordnung), wird dieser Abschnitt hier angepasst; sonst nichts doppelt nachgezogen.
- **Gegenverweis für `Hazeberry/codex`** (dort zu schreiben, nicht hier; Vorschlag): „Die Passregel-Arbeit (Stufen A bis C, Zähldiagnose, Vorsprung-Untersuchung) und die Wiederholung der
  Bughunt-Prüfung stehen in `Hazeberry/Go-html-Game-MoE`, siehe dessen `HANDOFF.md` §2 und §3. Dort nicht doppelt pflegen.“
- Freigaben gelten unverändert nach `CLAUDE.md`: Nur ein ausdrückliches Go startet einen Lauf oder merged einen PR; Docs mit Vorgaben liest Hazeberry vor dem Merge.
