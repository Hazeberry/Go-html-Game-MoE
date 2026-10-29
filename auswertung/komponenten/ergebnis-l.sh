#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung auf dem leeren Brett erstellen
# (.github/workflows/leeres-brett.yml, docs/leeres-brett.md §4). Erwartet in
# stand/: g-<arm>-<von>.jsonl für D, M0, N0 und A80 (16 Teile zu 30 Partien)
# und kontrolle-g.jsonl (D, Partien 1 bis 20, noch einmal gespielt). Zum
# Vergleich mit sechs Vorgabesteinen kommen D, M0 und N0 aus Stufe A
# (docs/daten/komponenten/lauf1) und A80 aus der Muster-Eröffnung
# (docs/daten/muster-eroeffnung/lauf1), alle mit Seed 220. Fehlende Teile
# brechen nicht ab, der Bericht nennt sie.
#
# Aufruf: bash auswertung/komponenten/ergebnis-l.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
a="$wurzel/docs/daten/komponenten/lauf1"
m="$wurzel/docs/daten/muster-eroeffnung/lauf1"
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

args=()
for arm in D M0 N0 A80; do
  : > "zw/g-$arm.jsonl"
  for ((i = 0; i < 16; i++)); do
    d="stand/g-$arm-$((1 + i * 30)).jsonl"
    if [ -s "$d" ]; then cat "$d" >> "zw/g-$arm.jsonl"; else echo "g-$arm-$((1 + i * 30))" >> ergebnisse/fehlende-teile.txt; fi
  done
  if [ -s "zw/g-$arm.jsonl" ]; then
    args+=(--arm "g:$arm=zw/g-$arm.jsonl")
    gzip -9 -c "zw/g-$arm.jsonl" > "ergebnisse/g-$arm.jsonl.gz"
  fi
done
for arm in D M0 N0; do args+=(--arm "v:$arm=$a/g-$arm.jsonl.gz"); done
args+=(--arm "v:A80=$m/g-A80.jsonl.gz")
kontrolle=()
if [ -s stand/kontrolle-g.jsonl ] && [ -s zw/g-D.jsonl ]; then
  kontrolle=(--kontrolle "g=stand/kontrolle-g.jsonl,zw/g-D.jsonl")
  gzip -9 -c stand/kontrolle-g.jsonl > ergebnisse/kontrolle-g.jsonl.gz
else echo "kontrolle-g" >> ergebnisse/fehlende-teile.txt; fi
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"

{ echo "# Leeres Brett"; echo
  echo "Seed 222, ohne Vorgabe; Vergleich mit sechs Vorgabesteinen aus Stufe A und der Muster-Eröffnung (Seed 220). Kontrolle: D, Partien 1 bis 20, im selben Lauf noch einmal gespielt."; echo
  node "$wurzel/auswertung/komponenten/bericht.js" --stufe L "${args[@]}" "${kontrolle[@]}"; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
