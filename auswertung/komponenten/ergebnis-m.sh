#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Muster-Eröffnung erstellen (.github/workflows/muster-eroeffnung.yml,
# docs/muster-eroeffnung.md §4). Erwartet in stand/: <g|f>-<arm>-<von>.jsonl für
# A40 und A80 (GNU Go: 24 Teile zu 20 Partien, Fuego: 12 Teile zu 40),
# kontrolle-g.jsonl, kontrolle-f.jsonl und m2-<arm>-<teil>.json (Selbstspiel
# gegen D ohne Aufgabe, 12 Teile zu 30 Partien). D und M0 kommen aus Stufe A
# (docs/daten/komponenten/lauf1). Fehlende Teile brechen M1 nicht ab, der
# Bericht nennt sie; das Selbstspiel braucht alle zwölf Teile.
#
# Aufruf: bash auswertung/komponenten/ergebnis-m.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
a="$wurzel/docs/daten/komponenten/lauf1"
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

args=()
for o in g f; do
  if [ "$o" = g ]; then schritt=20; n=24; else schritt=40; n=12; fi
  for alt in D M0; do args+=(--arm "$o:$alt=$a/$o-$alt.jsonl.gz"); done
  for arm in A40 A80; do
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

S="$wurzel/auswertung/selbstspiel-bericht.js"
: > ergebnisse/selbstspiel.md
for arm in A40 A80; do
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
{ echo "# Muster-Eröffnung"; echo; echo "D und M0 aus Stufe A (docs/daten/komponenten/lauf1, Seed 220)."; echo
  echo "## M1: gegen GNU Go und Fuego"; echo
  node "$wurzel/auswertung/komponenten/bericht.js" --stufe M "${args[@]}"; echo
  echo "## M2: Selbstspiel gegen D, ohne Aufgabe"; echo; cat ergebnisse/selbstspiel.md; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
