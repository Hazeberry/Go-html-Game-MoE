# Rohdaten: GNU Go und die positionelle Wiederholung

Lauf 1 vom 23.11.2026, `workflow_dispatch` auf `main` bei `76a559bce5529e92a2dcfa2e72d9953986519d1c`.
Workflow-Lauf: https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/45176376828

GNU Go 3.8, Debian-Paket `3.8-11build2`, `ubuntu-24.04`. Fünf Proben, je ein eigener Prozess, nie `genmove`.

| Datei | Inhalt |
|---|---|
| `lauf-45176376828-protokoll.txt` | Auszug des Job-Protokolls, **wörtlich mit Zeitstempeln**: die Gültigkeitsprüfung und alle fünf Proben mit jeder Anfrage und jeder Antwort |

**Herkunft:** Der Auszug ist aus dem Job-Protokoll des Laufs übernommen, nicht neu erzeugt. Die
maschinenlesbare `ergebnis.json` und `konsole.txt` liegen als Artefakt `gnugo-superko` am Lauf
(Artefakt-ID 14819451626, 90 Tage Aufbewahrung); sie sind hier nicht abgelegt, weil der Download eine
Anmeldung braucht. Das Protokoll enthält denselben Inhalt in derselben Reihenfolge.

**Ergebnis:** Lauf gültig. P1 (Selbstmord) und P2 (einfaches Ko) werden mit `? illegal move` abgelehnt,
P3 (Wiederholung nach zwei Pässen) mit `=` angenommen, P4 (ohne `--chinese-rules`) ebenfalls.
Einordnung in `docs/gnugo-superko-vorabfestlegung.md` §8.
