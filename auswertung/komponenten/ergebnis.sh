#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht von Stufe A der Komponentenmessung erstellen
# (.github/workflows/komponenten.yml, docs/komponenten.md §4). Erwartet in
# stand/: <g|f>-<arm>-<von>.jsonl (GNU Go: Teile zu 20 Partien, Fuego: zu 40),
# kontrolle-g.jsonl und kontrolle-f.jsonl. Fehlende Teile brechen nicht ab:
# Der Bericht nennt die Paare, die da sind, fehlende-teile.txt die übrigen.
#
# Aufruf: bash auswertung/komponenten/ergebnis.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

# Teile je Gegner: Beginn, Schritt, Zahl der Teile für 480 und für 240 Partien
teile() { local start=1 schritt=$1 anzahl=$2 i; for ((i = 0; i < anzahl; i++)); do echo $((start + i * schritt)); done; }
args=()
for o in g f; do
  if [ "$o" = g ]; then schritt=20; gross=24; klein=12; else schritt=40; gross=12; klein=6; fi
  for arm in D N0 M0 NM0 B R0; do
    case "$arm" in B|R0) n=$klein ;; *) n=$gross ;; esac
    : > "zw/$o-$arm.jsonl"
    for v in $(teile "$schritt" "$n"); do
      d="stand/$o-$arm-$v.jsonl"
      if [ -s "$d" ]; then cat "$d" >> "zw/$o-$arm.jsonl"; else echo "$o-$arm-$v" >> ergebnisse/fehlende-teile.txt; fi
    done
    if [ -s "zw/$o-$arm.jsonl" ]; then
      args+=(--arm "$o:$arm=zw/$o-$arm.jsonl")
      gzip -9 -c "zw/$o-$arm.jsonl" > "ergebnisse/$o-$arm.jsonl.gz"
    fi
  done
done
if [ -s stand/kontrolle-g.jsonl ]; then
  args+=(--kontrolle "g=stand/kontrolle-g.jsonl,$wurzel/docs/daten/netz-dosis/lauf1/L8.jsonl.gz")
  gzip -9 -c stand/kontrolle-g.jsonl > ergebnisse/kontrolle-g.jsonl.gz
else echo "kontrolle-g" >> ergebnisse/fehlende-teile.txt; fi
if [ -s stand/kontrolle-f.jsonl ]; then
  args+=(--kontrolle "f=stand/kontrolle-f.jsonl,$wurzel/docs/daten/fuego-pruefstand/lauf1/v6-s100.jsonl.gz")
  gzip -9 -c stand/kontrolle-f.jsonl > ergebnisse/kontrolle-f.jsonl.gz
else echo "kontrolle-f" >> ergebnisse/fehlende-teile.txt; fi
[ "${#args[@]}" -gt 0 ] || { echo "keine Partien" >&2; exit 1; }
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"
{ echo "# Komponenten Stufe A"; echo; node "$wurzel/auswertung/komponenten/bericht.js" "${args[@]}"; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
