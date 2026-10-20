#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# 15 Partien der heutigen Standard-KI gegen GNU Go Stufe 1 mit <vorgabe>
# Vorgabesteinen (docs/teststaerke.md §8, .github/workflows/pruefstand.yml).
# Bedingungen sonst wie in den Messungen: 120 Simulationen, GNU Go gibt nicht
# auf, bis 600 Züge, Schätzung nach Zug 120 und 200.
#
# Aufruf: bash auswertung/dagger/pruefstand-spielen.sh <vorgabe> <von> <seed> <roh.jsonl>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
vorgabe=${1:?Vorgabe fehlt}; von=${2:?Beginn fehlt}; seed=${3:?Seed fehlt}; roh=${4:?Ausgabedatei fehlt}
for v in "$vorgabe" "$von" "$seed"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
[ "$vorgabe" -ge 2 ] && [ "$vorgabe" -le 9 ] || { echo "Vorgabe zwischen 2 und 9: $vorgabe" >&2; exit 2; }
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node "$here/../../gnugo-duell.js" --partien 15 --von "$von" --seed "$seed" --stufe 1 --vorgabe "$vorgabe" \
  --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
  --ki mctsFixedSims=120,resignEnabled=0 --roh "$roh"
