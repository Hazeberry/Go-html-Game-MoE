#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung zur Baum-Übernahme erstellen
# (.github/workflows/baum-uebernahme.yml, docs/baum-uebernahme.md §4). Erwartet
# in stand/: s<sims>-<g|f>-<arm>-<von>.jsonl für D und T0, bei 120
# Simulationen 32 Teile zu 30 (GNU Go) und 16 zu 60 (Fuego), bei 600
# Simulationen 30 Teile zu 8 und 16 zu 15; dazu kontrolle-g.jsonl,
# kontrolle-f.jsonl und m2-T0-<teil>.json (12 Teile zu 30). Fehlende Teile
# brechen nicht ab, der Bericht nennt sie; das Selbstspiel braucht alle zwölf.
#
# Aufruf: bash auswertung/komponenten/ergebnis-t.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
a="$wurzel/docs/daten/komponenten/lauf1"
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

# sammle <sims> <gegner> <schritt> <teile>: hängt --arm-Angaben an args an
sammle() {
  local sims=$1 o=$2 schritt=$3 n=$4 arm i d
  for arm in D T0; do
    : > "zw/s$sims-$o-$arm.jsonl"
    for ((i = 0; i < n; i++)); do
      d="stand/s$sims-$o-$arm-$((1 + i * schritt)).jsonl"
      if [ -s "$d" ]; then cat "$d" >> "zw/s$sims-$o-$arm.jsonl"; else echo "s$sims-$o-$arm-$((1 + i * schritt))" >> ergebnisse/fehlende-teile.txt; fi
    done
    if [ -s "zw/s$sims-$o-$arm.jsonl" ]; then
      args+=(--arm "$o:$arm=zw/s$sims-$o-$arm.jsonl")
      gzip -9 -c "zw/s$sims-$o-$arm.jsonl" > "ergebnisse/s$sims-$o-$arm.jsonl.gz"
    fi
  done
}
args=(); sammle 120 g 30 32; sammle 120 f 60 16; args120=("${args[@]}")
args=(); sammle 600 g 8 30; sammle 600 f 15 16; args600=("${args[@]}")
kontrolle=()
for o in g f; do
  if [ -s "stand/kontrolle-$o.jsonl" ]; then
    kontrolle+=(--kontrolle "$o=stand/kontrolle-$o.jsonl,$a/$o-D.jsonl.gz")
    gzip -9 -c "stand/kontrolle-$o.jsonl" > "ergebnisse/kontrolle-$o.jsonl.gz"
  else echo "kontrolle-$o" >> ergebnisse/fehlende-teile.txt; fi
done

teile=()
for t in $(seq 1 12); do
  if [ -s "stand/m2-T0-$t.json" ]; then teile+=("stand/m2-T0-$t.json"); else echo "m2-T0-$t" >> ergebnisse/fehlende-teile.txt; fi
done
if [ "${#teile[@]}" -eq 12 ]; then
  node "$wurzel/auswertung/selbstspiel-bericht.js" --name T0 --partien 360 --markdown --roh zw/m2-T0.jsonl "${teile[@]}" > ergebnisse/selbstspiel.md
  gzip -9 -c zw/m2-T0.jsonl > ergebnisse/m2-T0.jsonl.gz
else
  echo "T0: Selbstspiel unvollständig (${#teile[@]} von 12 Teilen)" > ergebnisse/selbstspiel.md
fi
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"

B="$wurzel/auswertung/komponenten/bericht.js"
{ echo "# Baum-Übernahme"; echo; echo "Seed 221; Kontrollen gegen Stufe A (docs/daten/komponenten/lauf1, Seed 220)."; echo
  echo "## Hauptmessung: 120 Simulationen"; echo
  if [ "${#args120[@]}" -gt 0 ]; then node "$B" --stufe T "${args120[@]}" "${kontrolle[@]}"; else echo "keine Partien"; fi; echo
  echo "## Zweite Messung: 600 Simulationen"; echo
  if [ "${#args600[@]}" -gt 0 ]; then node "$B" --stufe T6 "${args600[@]}"; else echo "keine Partien"; fi; echo
  echo "## Selbstspiel: T0 gegen D, 120 Simulationen, ohne Aufgabe"; echo; cat ergebnisse/selbstspiel.md; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
