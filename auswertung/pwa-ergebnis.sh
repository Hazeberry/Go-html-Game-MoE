#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht des Vergleichs mit der PWA erstellen (.github/workflows/pwa-vergleich.yml,
# docs/pwa-vergleich.md §4). Erwartet in stand/: m1-<von>.jsonl (12 Teile zu
# 30 Partien), m2-<von>.jsonl (20 Teile zu 6), k1-<von>.jsonl (4 Teile zu 30)
# und kontrolle.jsonl (M1, Partien 1 bis 20, noch einmal). Fehlende Teile
# brechen nicht ab, der Bericht nennt sie.
#
# Aufruf: bash auswertung/pwa-ergebnis.sh   (im Verzeichnis mit stand/)
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p ergebnisse zw
: > ergebnisse/fehlende-teile.txt

args=()
# sammle <teil> <schritt> <teile>
sammle() {
  local t=$1 schritt=$2 n=$3 i d klein
  klein=$(echo "$t" | tr 'A-Z' 'a-z')
  : > "zw/$klein.jsonl"
  for ((i = 0; i < n; i++)); do
    d="stand/$klein-$((1 + i * schritt)).jsonl"
    if [ -s "$d" ]; then cat "$d" >> "zw/$klein.jsonl"; else echo "$klein-$((1 + i * schritt))" >> ergebnisse/fehlende-teile.txt; fi
  done
  if [ -s "zw/$klein.jsonl" ]; then
    args+=(--teil "$t=zw/$klein.jsonl")
    gzip -9 -c "zw/$klein.jsonl" > "ergebnisse/$klein.jsonl.gz"
  fi
}
sammle M1 30 12
sammle M2 6 20
sammle K1 30 4
if [ -s stand/kontrolle.jsonl ] && [ -s zw/m1.jsonl ]; then
  args+=(--kontrolle "stand/kontrolle.jsonl,zw/m1.jsonl")
  gzip -9 -c stand/kontrolle.jsonl > ergebnisse/kontrolle.jsonl.gz
else echo "kontrolle" >> ergebnisse/fehlende-teile.txt; fi
[ -s ergebnisse/fehlende-teile.txt ] && echo "::warning::Teile ohne Partien: $(tr '\n' ' ' < ergebnisse/fehlende-teile.txt)"

{ echo "# Vergleich mit der PWA"; echo
  echo "N: index.html dieses Laufs. PWA: vergleich/pwa-index.html (sha256 $(sha256sum "$wurzel/vergleich/pwa-index.html" | cut -c1-64))."; echo
  if [ "${#args[@]}" -gt 0 ]; then node "$wurzel/auswertung/pwa-bericht.js" "${args[@]}"; else echo "keine Partien"; fi; } > ergebnisse/bericht.md
cat ergebnisse/bericht.md
