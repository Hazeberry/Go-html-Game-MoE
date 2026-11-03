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
- PR #267 (`claude/kandidaten-orakel-probe-nachtrag`, Kopf `68ed060fa05280aadab9594f3261a7f21a3ecae9`): Nachtrag §11,
  Probe-Rohdaten, Spalte „Auslöser“ korrekt, 42× kein-protokoll erklärt (Pass der KI vor der Suche, Orakel
  ebenfalls Pass → Fall a). CI grün. **Wartet aufs Lesen durch Hazeberry, dann Merge.**
- PR #268 (`claude/kandidaten-orakel-hauptversuch`, Kopf `6e27e6024722cc4a4073391dbb39d4704417ece9`, enthält #267):
  Workflow `kandidaten-orakel-haupt.yml`, `paket.js` (Fortsetzen), `zusammenfuehren.js`, `haupt-bericht.js`, Tests,
  Doc §12. **Wartet auf Prüfung; Hauptlauf erst nach eigenem Go.** Offene Punkte zur Prüfung in §12 (Prior-Summe
  nur per Test gesichert, Antwortquote je Arm, Farbgleichheit auf gespielte Partien, eine Partie je Prozess).
- Budget vorsichtig 157,5 h Partien, mit Kontrollen rund 159 bis 160 h (gut 1 % über Plan); nach Medianen rund 65 h.

## Regeln (Kurzfassung, siehe CLAUDE.md)
Deutsch, nüchtern; Läufe nur in Actions und nur nach „Go“; Merge `merge` mit voller Kopf-SHA;
Docs mit Vorgaben vor Merge von Hazeberry lesen lassen; gültig/ungültig, ungültig = „KEIN URTEIL“, Lauf rot.

## Löschbare Branches
`claude/diagnose-p1p2`, `claude/diagnose-p1p2-pakete`, `claude/diagnose-probe-nachtrag`,
`claude/diagnose-rohdaten-41480291668`, `claude/diagnose-korrektur`, `claude/diagnose-p2-rang`,
`claude/claude-md-skalierung`, `claude/diagnose-p2-rang-ergebnis-41538801704`, `claude/kandidaten-orakel`,
`claude/kandidaten-orakel-umsetzung`. `ergebnisse/kandidaten-orakel-probe-lauf1` löschbar nach Merge von #267.
