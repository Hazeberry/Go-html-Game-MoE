#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung „Muster ohne Vorgabe“ erstellen
# (.github/workflows/muster-ohne-vorgabe.yml, docs/muster-ohne-vorgabe.md §4).
# Erwartet in stand/: <g|f>-<arm>-<von>.jsonl für D, M0, M50 und MW0 (GNU Go:
# 16 Teile zu 30 Partien, Fuego: 8 Teile zu 60), kontrolle-g.jsonl (D, Seed
# 222, Partien 1 bis 20, gegen docs/daten/leeres-brett/lauf1), kontrolle-f.jsonl
# (D, Partien 1 bis 20, gegen die Partien von D dieses Laufs) und
# m2-<arm>-<teil>.json (Selbstspiel gegen D ohne Aufgabe, 12 Teile zu 30).
# Fehlende Teile brechen nicht ab, der Bericht nennt sie; ein Selbstspiel
# braucht alle zwölf Teile.
#
# Aufruf: bash auswertung/komponenten/ergebnis-o.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
lb="$wurzel/docs/daten/leeres-brett/lauf1"
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

args=()
for o in g f; do
  if [ "$o" = g ]; then schritt=30; n=16; else schritt=60; n=8; fi
  for arm in D M0 M50 MW0; do
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
kontrolle=()
if [ -s stand/kontrolle-g.jsonl ]; then
  kontrolle+=(--kontrolle "g=stand/kontrolle-g.jsonl,$lb/g-D.jsonl.gz")
  gzip -9 -c stand/kontrolle-g.jsonl > ergebnisse/kontrolle-g.jsonl.gz
else echo "kontrolle-g" >> ergebnisse/fehlende-teile.txt; fi
if [ -s stand/kontrolle-f.jsonl ] && [ -s zw/f-D.jsonl ]; then
  kontrolle+=(--kontrolle "f=stand/kontrolle-f.jsonl,zw/f-D.jsonl")
  gzip -9 -c stand/kontrolle-f.jsonl > ergebnisse/kontrolle-f.jsonl.gz
else echo "kontrolle-f" >> ergebnisse/fehlende-teile.txt; fi

S="$wurzel/auswertung/selbstspiel-bericht.js"
: > ergebnisse/selbstspiel.md
for arm in M0 M50 MW0; do
  teile=()
  for t in $(seq 1 12); do
    if [ -s "stand/m2-$arm-$t.json" ]; then teile+=("stand/m2-$arm-$t.json"); else echo "m2-$arm-$t" >> ergebnisse/fehlende-teile.txt; fi
  done
  if [ "${#teile[@]}" -eq 12 ]; then
    node "$S" --name "$arm" --partien 360 --markdown --roh "zw/m2-$arm.jsonl" "${teile[@]}" >> ergebnisse/selbstspiel.md
    gzip -9 -c "zw/m2-$arm.jsonl" > "ergebnisse/m2-$arm.jsonl.gz"
  else
    echo "$arm: Selbstspiel unvollständig (${#teile[@]} von 12 Teilen)" >> ergebnisse/selbstspiel.md
  fi
  echo >> ergebnisse/selbstspiel.md
done
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"

{ echo "# Muster ohne Vorgabe"; echo
  echo "Seed 226, ohne Vorgabe. Kontrolle GNU Go gegen den Lauf „Leeres Brett“ (docs/daten/leeres-brett/lauf1, Seed 222), Kontrolle Fuego gegen die Partien von D dieses Laufs."; echo
  echo "## Gegen GNU Go und Fuego"; echo
  if [ "${#args[@]}" -gt 0 ]; then node "$wurzel/auswertung/komponenten/bericht.js" --stufe O "${args[@]}" "${kontrolle[@]}"; else echo "keine Partien"; fi; echo
  echo "## Selbstspiel gegen D, ohne Aufgabe"; echo; cat ergebnisse/selbstspiel.md; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
