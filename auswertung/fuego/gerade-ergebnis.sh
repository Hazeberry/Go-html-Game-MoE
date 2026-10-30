#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht des Prüfstands gegen Fuego ohne Vorgabe erstellen
# (.github/workflows/fuego-gerade.yml, docs/muster-fuego-siege.md §3).
# Erwartet in stand/: s<spiele>-<von>.jsonl für die Spielzahlen 10, 20, 30, 50
# und 70 (je 4 Teile zu 30 Partien). Fehlende Teile brechen nicht ab, der
# Bericht nennt sie.
#
# Aufruf: bash auswertung/fuego/gerade-ergebnis.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt
args=()
for s in 10 20 30 50 70; do
  : > "zw/s$s.jsonl"
  for von in 1 31 61 91; do
    d="stand/s$s-$von.jsonl"
    if [ -s "$d" ]; then cat "$d" >> "zw/s$s.jsonl"; else echo "s$s-$von" >> ergebnisse/fehlende-teile.txt; fi
  done
  if [ -s "zw/s$s.jsonl" ]; then
    args+=("$s=zw/s$s.jsonl")
    gzip -9 -c "zw/s$s.jsonl" > "ergebnisse/s$s.jsonl.gz"
  fi
done
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"
{ echo "# Prüfstand gegen Fuego ohne Vorgabe"; echo
  echo "D (Default) ohne Vorgabe gegen Fuego, Seed 227, je Spielzahl 120 Partien."; echo
  if [ "${#args[@]}" -gt 0 ]; then node "$wurzel/auswertung/fuego/gerade-wahl.js" "${args[@]}"; else echo "keine Partien"; fi; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
