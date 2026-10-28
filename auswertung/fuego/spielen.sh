#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Partien der heutigen Standard-KI gegen Fuego (docs/fuego.md §9,
# .github/workflows/fuego-kurz.yml). GNU Go Stufe 1 ist Schiedsrichter.
# Bedingungen sonst wie in den Messungen gegen GNU Go: 120 Simulationen,
# Aufgabe der KI aus, bis 600 Züge, Schätzung nach Zug 60, 120 und 200.
# FUEGO nennt das Programm (Standard fuego-bin/fuego), GNUGO den Schiedsrichter
# (Standard /usr/games/gnugo).
#
# Aufruf: bash auswertung/fuego/spielen.sh <von> <anzahl> <seed> <spiele-je-zug> <vorgabe> <roh.jsonl>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
von=${1:?Beginn fehlt}; anzahl=${2:?Anzahl fehlt}; seed=${3:?Seed fehlt}; spiele=${4:?Spiele je Zug fehlen}
vorgabe=${5:?Vorgabe fehlt}; roh=${6:?Ausgabedatei fehlt}
for v in "$von" "$anzahl" "$seed" "$spiele" "$vorgabe"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
{ [ "$vorgabe" -eq 0 ] || { [ "$vorgabe" -ge 2 ] && [ "$vorgabe" -le 9 ]; }; } || { echo "Vorgabe 0 oder 2 bis 9: $vorgabe" >&2; exit 2; }
fuego=${FUEGO:-$here/../../fuego-bin/fuego}
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node "$here/../../gnugo-duell.js" --gegner fuego --fuego "$fuego" --fuego-spiele "$spiele" --gnugo "${GNUGO:-/usr/games/gnugo}" \
  --partien "$anzahl" --von "$von" --seed "$seed" --stufe 1 --vorgabe "$vorgabe" \
  --maxzuege 600 --schaetzung 60,120,200 --gnugo-aufgabe 0 \
  --ki mctsFixedSims=120,resignEnabled=0 --roh "$roh"
