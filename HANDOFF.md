# Übergabe – Kandidaten-Orakel (Stand 03.11.2026)

## Erledigt
- Vorabfestlegung `docs/kandidaten-orakel.md` (#265) und Umsetzung Stufe 1 (#266, Merge `1c71b02`).
  Schalter `extra.kandidatenOrakel = {arm, g}` in `index.html`, Standard aus, Arm A bitgleich zum Default.
  Harness: `gnugo-duell.js --kandidaten-orakel A|S|ZS [--kandidaten-ab 80]`; `spielen.sh` mit `DUELL_ZUSATZ`.
- Fall d1 (Zusatzkind schon mit höchstem Prior): Aufnahme als 17. Kind bleibt, nur die Anhebung entfällt
  (geprüft, Test „Randfall d1“ in `tests/kandidaten-orakel.js`).
- Laufzeitprobe: Lauf 41550610778 (Workflow `kandidaten-orakel-probe.yml`, Seed 230), **gültig**.
  Bericht und Rohdaten auf Branch `ergebnisse/kandidaten-orakel-probe-lauf1`
  (`docs/daten/kandidaten-orakel/probe-lauf1/`), noch **nicht** in `main`.

## Ergebnis der Probe (nur Technik, keine Effekthöhe)
- Kontrolle Seed 222 Nr. 1–4 bitgleich; Orakelantwort 4678/4678; Fall d in beiden Farben (681 S / 733 W);
  erster Auslöser S/ZS in 12/12 Paaren gleich.
- Partiedauer max.: GNU Go 90,7 s, Fuego 171,7 s. Planung mit +50 %: 136 s bzw. 258 s je Partie.
- SD Paardifferenz S−A: GNU Go 44,9 (n=8), Fuego 13,2 (n=4) – nur Größenordnung, Planungswerte 59/85 bleiben.
- Auffälligkeiten: Spalte „Eingriffe je Partie“ zählt Auslöser (auch in Arm A) → im Nachtrag umbenennen;
  42× `kein-protokoll` (Wurzel nicht neu gebildet, Orakel ohne Wirkung).

## Aufwand Hauptversuch (Arme A, S, ZS je Gegner, Runnerzeit)
| n je Arm | GNU Go | Fuego | Summe | halbe Breite 97,5 % (GNU Go / Fuego) |
|---|---:|---:|---:|---:|
| 240 | 27 h | 52 h | ~79 h | 8,5 / 12,3 |
| 480 | 54 h | 103 h | ~158 h | 6,0 / 8,7 |
| 960 | 109 h | 206 h | ~316 h | 4,3 / 6,1 |
Vorschlag: n=480; Pakete 30 (GNU Go) bzw. 20 Partien (Fuego), Seeds 231 (GNU Go) und 232 (Fuego).

## Stand 03.11.2026, später
- Festgelegt (Hazeberry): 480 Paare je Gegner und Arm (2880 Partien), Budget 158 Runnerstunden als Planungsbudget.
- PR #267 gemergt (Merge `5b42448`), Abo beendet.
- PR #268 gemergt (Merge `370df8e`), Abo beendet. Workflow `kandidaten-orakel-haupt.yml` liegt in main. **Hauptlauf: kein Go.**
- Budget vorsichtig 157,5 h Partien, mit Kontrollen rund 159 bis 160 h (gut 1 % über Plan); nach Medianen rund 65 h.

## Hauptversuch (03.11.2026)
- Lauf 41563696817 (Go Hazeberry), gültig. S − A: GNU Go +24,7 [+19,9; +29,5] (478 Paare), Fuego +36,0
  [+30,1; +42,0] (480 Paare). 2 Ausfälle (GNU-Go-Absturz). Partiezeit 65 h, Wanduhr 3 h 39 min.
- PR #269 gemergt (Merge `c45298a`), Abo beendet. Nachtrag §13 und Rohdaten in main.
- Keine weiteren Läufe ohne Wort von Hazeberry. Löschbar: `ergebnisse/kandidaten-orakel-haupt-lauf1`,
  `claude/kandidaten-orakel-haupt-ergebnis`, `claude/kandidaten-orakel-vierarm`,
  `claude/kandidaten-orakel-vierarm-umsetzung`, `claude/engine-vergleich-actions`,
  `claude/kandidaten-orakel-vierarm-probe-nachtrag`, `ergebnisse/kandidaten-orakel-vierarm-probe-lauf1`.

## Vierarm-Versuch (03.11.2026)
- Vorabfestlegung `docs/kandidaten-orakel-vierarm.md` gemergt (#270, `4eb8dee`).
- Umsetzung gemergt (#271, `bd93a21`): Arme N, P, pEnd, vierarm-bericht.js, Workflows Probe Seed 233 und
  Hauptlauf Seeds 234/235, Tests.
- **Probe und Hauptlauf: kein Go.**
- PR #272 (`claude/engine-vergleich-actions`): Engine-Vergleich in Actions, Regel in CLAUDE.md. Wartet aufs
  Lesen. **Engine-Vergleich: kein Go** (meine Lesart als Go war falsch). #271 erst nach Vergleich mergen.

## Engine-Vergleich (03.11.2026)
- #272 gemergt (`f87f148`). Engine-Vergleich Lauf 41617738140 (alt `370df8e317f5919f92837563fd5aaf553bf39789`,
  neu `e0de66f8f2f74257155557df9da928f75eb8b681`) **ohne Go gestartet** (Empfehlung als Go gelesen, Fehler).
  Hazeberry lässt ihn durchlaufen. Merke: **nur ein ausdrückliches „Go“ zählt**, keine Empfehlung.
- Vergleich: GLEICH (Nachtrag in docs/kandidaten-orakel-vierarm.md §12). #271 gemergt (`bd93a21`, Kopf `c44ef9b`).
- Vierarm-Probe Lauf 41623472366 (Go Hazeberry): gültig; Nachtrag §13 und Rohdaten gemergt (#273, `8740574`).
- **Hauptlauf des Vierarm-Versuchs (Seeds 234/235): kein Go.**

## Regeln (Kurzfassung, siehe CLAUDE.md)
Deutsch, nüchtern; Läufe nur in Actions und nur nach „Go“; Merge `merge` mit voller Kopf-SHA;
Docs mit Vorgaben vor Merge von Hazeberry lesen lassen; gültig/ungültig, ungültig = „KEIN URTEIL“, Lauf rot.

## Löschbare Branches
`claude/diagnose-p1p2`, `claude/diagnose-p1p2-pakete`, `claude/diagnose-probe-nachtrag`,
`claude/diagnose-rohdaten-41480291668`, `claude/diagnose-korrektur`, `claude/diagnose-p2-rang`,
`claude/claude-md-skalierung`, `claude/diagnose-p2-rang-ergebnis-41538801704`, `claude/kandidaten-orakel`,
`claude/kandidaten-orakel-umsetzung`. `ergebnisse/kandidaten-orakel-probe-lauf1`, `claude/kandidaten-orakel-probe-nachtrag`, `claude/kandidaten-orakel-hauptversuch` löschbar.
