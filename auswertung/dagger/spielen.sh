#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Partien gegen GNU Go spielen und auf Wunsch die Stellungen der KI von GNU Go
# beschriften lassen (docs/muster-endspiel-dagger.md §3). Bedingungen wie in
# den früheren Messungen: GNU Go Stufe 1, neun Vorgabesteine, 120
# Simulationen, GNU Go gibt nicht auf, bis 600 Züge, ausgespielt.
#
# Aufruf: bash auswertung/dagger/spielen.sh <roh.jsonl> <von> <anzahl> <seed> <gewicht> [<lehr.jsonl> [<n>]]
#   gewicht 0 = Default (Schalter aus); sonst musterEndspiel=<gewicht>
#   lehr.jsonl: GNU Gos Zug (Stufe 10) an jeder Stellung der KI ab Zug 81,
#               in den ersten <n> Partien (Standard: in allen)
set -euo pipefail
roh=${1:?Ausgabedatei fehlt}; von=${2:?}; anzahl=${3:?}; seed=${4:?}; gewicht=${5:?}; lehr=${6:-}; n=${7:-$anzahl}
for v in "$von" "$anzahl" "$seed" "$gewicht" "$n"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
mkdir -p "$(dirname "$roh")"
ki="mctsFixedSims=120,resignEnabled=0"
if [ "$gewicht" -gt 0 ]; then ki="$ki,musterEndspiel=$gewicht"; fi
rm -f "$roh"
node gnugo-duell.js --partien "$anzahl" --von "$von" --seed "$seed" --stufe 1 --vorgabe 9 \
  --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 --ki "$ki" --roh "$roh"
if [ -n "$lehr" ]; then
  mkdir -p "$(dirname "$lehr")"; rm -f "$lehr"
  kopf="$roh.kopf"; head -n "$n" "$roh" > "$kopf"
  node auswertung/muster-daten.js "$kopf" --ab 80 --bis 300 --stufe 10 --seite ki --aus "$lehr"
  rm -f "$kopf"
fi
