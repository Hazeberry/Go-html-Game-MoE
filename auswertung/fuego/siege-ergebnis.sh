#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung „Siege gegen Fuego ohne Vorgabe“ erstellen
# (.github/workflows/fuego-siege.yml, docs/muster-fuego-siege.md §4).
# Erwartet in stand/: <arm>-<von>.jsonl für D, M0 und M50 (16 Teile zu 60
# Partien: von 1, 61, ..., 901) und kontrolle.jsonl (D, Partien 1 bis 20,
# wird mit den Partien von D verglichen). Fehlende Teile brechen nicht ab,
# der Bericht nennt sie.
#
# Aufruf: bash auswertung/fuego/siege-ergebnis.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt
args=()
for arm in D M0 M50; do
  : > "zw/$arm.jsonl"
  for ((i = 0; i < 16; i++)); do
    d="stand/$arm-$((1 + i * 60)).jsonl"
    if [ -s "$d" ]; then cat "$d" >> "zw/$arm.jsonl"; else echo "$arm-$((1 + i * 60))" >> ergebnisse/fehlende-teile.txt; fi
  done
  if [ -s "zw/$arm.jsonl" ]; then
    args+=("$arm=zw/$arm.jsonl")
    gzip -9 -c "zw/$arm.jsonl" > "ergebnisse/$arm.jsonl.gz"
  fi
done
kontrolle="Kontrolle: fehlt"
if [ -s stand/kontrolle.jsonl ] && [ -s zw/D.jsonl ]; then
  gzip -9 -c stand/kontrolle.jsonl > ergebnisse/kontrolle.jsonl.gz
  kontrolle=$(node -e '
    const fs = require("fs");
    const l = f => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(JSON.parse);
    const k = l("stand/kontrolle.jsonl"), d = new Map(l("zw/D.jsonl").map(r => [r.nr, r]));
    const gleich = k.filter(r => d.has(r.nr) && JSON.stringify(d.get(r.nr).zuege) === JSON.stringify(r.zuege)).length;
    console.log(`Kontrolle: ${gleich} von ${k.length} Partien Zug für Zug gleich (erwartet 20 von 20)`);')
else echo "kontrolle" >> ergebnisse/fehlende-teile.txt; fi
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"
{ echo "# Siege gegen Fuego ohne Vorgabe"; echo
  echo "Seed 228, Fuego mit 50 Spielen je Zug, ohne Vorgabe, je Arm 960 Partien."; echo
  if [ "${#args[@]}" -gt 0 ]; then node "$wurzel/auswertung/fuego/siege-bericht.js" "${args[@]}"; else echo "keine Partien"; fi
  echo; echo "$kontrolle"; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
