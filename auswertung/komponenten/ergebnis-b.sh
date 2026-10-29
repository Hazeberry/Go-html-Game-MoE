#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht von Stufe B der Komponentenmessung erstellen
# (.github/workflows/komponenten-b.yml, docs/komponenten-b.md §4). Erwartet in
# stand/: <g|f>-<arm>-<von>.jsonl für T0, W0, E0, P0, BE0, BF0 und O7
# (GNU Go: 24 Teile zu 20 Partien, Fuego: 12 Teile zu 40), kontrolle-g.jsonl
# und kontrolle-f.jsonl. D und R0 kommen aus Stufe A
# (docs/daten/komponenten/lauf1). Fehlende Teile brechen nicht ab: Der Bericht
# nennt die Paare, die da sind, fehlende-teile.txt die übrigen.
#
# Aufruf: bash auswertung/komponenten/ergebnis-b.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
a="$wurzel/docs/daten/komponenten/lauf1"
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

args=()
for o in g f; do
  if [ "$o" = g ]; then schritt=20; n=24; else schritt=40; n=12; fi
  for alt in D R0; do args+=(--arm "$o:$alt=$a/$o-$alt.jsonl.gz"); done
  for arm in T0 W0 E0 P0 BE0 BF0 O7; do
    : > "zw/$o-$arm.jsonl"
    for ((i = 0; i < n; i++)); do
      d="stand/$o-$arm-$((1 + i * schritt)).jsonl"
      if [ -s "$d" ]; then cat "$d" >> "zw/$o-$arm.jsonl"; else echo "$o-$arm-$((1 + i * schritt))" >> ergebnisse/fehlende-teile.txt; fi
    done
    if [ -s "zw/$o-$arm.jsonl" ]; then
      args+=(--arm "$o:$arm=zw/$o-$arm.jsonl")
      gzip -9 -c "zw/$o-$arm.jsonl" > "ergebnisse/$o-$arm.jsonl.gz"
    fi
  done
done
for o in g f; do
  if [ -s "stand/kontrolle-$o.jsonl" ]; then
    args+=(--kontrolle "$o=stand/kontrolle-$o.jsonl,$a/$o-D.jsonl.gz")
    gzip -9 -c "stand/kontrolle-$o.jsonl" > "ergebnisse/kontrolle-$o.jsonl.gz"
  else echo "kontrolle-$o" >> ergebnisse/fehlende-teile.txt; fi
done
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"
{ echo "# Komponenten Stufe B"; echo; echo "D und R0 aus Stufe A (docs/daten/komponenten/lauf1, Seed 220)."; echo;
  node "$wurzel/auswertung/komponenten/bericht.js" --stufe B "${args[@]}"; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
