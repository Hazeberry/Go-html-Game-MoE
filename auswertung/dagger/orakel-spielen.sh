#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# 15 Partien eines Arms des Orakel-Tests gegen GNU Go spielen
# (.github/workflows/endspiel-orakel.yml, docs/muster-endspiel-orakel.md §2).
# Bedingungen wie in den Messungen: GNU Go Stufe 1, neun Vorgabesteine, 120
# Simulationen, GNU Go gibt nicht auf, bis 600 Züge, ausgespielt. Die Arme
# unterscheiden sich nur in --orakel-zug (AB ist die Zugzahl mc, ab der das
# Orakel zieht: 80 = ab dem 81. Zug).
#
# Aufruf: bash auswertung/dagger/orakel-spielen.sh <arm> <von> <seed> <roh.jsonl>
#   arm: A (ohne Orakel), D25, D50, D100 (ab Zug 81, in 25 %, 50 %, allen
#        Zügen der KI), E100 (ab Zug 161, in allen)
set -euo pipefail
arm=${1:?Arm fehlt}; von=${2:?Beginn fehlt}; seed=${3:?Seed fehlt}; roh=${4:?Ausgabedatei fehlt}
for v in "$von" "$seed"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
case "$arm" in
  A)    extra=() ;;
  D25)  extra=(--orakel-zug 80:0.25) ;;
  D50)  extra=(--orakel-zug 80:0.5) ;;
  D100) extra=(--orakel-zug 80) ;;
  E100) extra=(--orakel-zug 160) ;;
  *) echo "unbekannter Arm: '$arm'" >&2; exit 2 ;;
esac
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node gnugo-duell.js --partien 15 --von "$von" --seed "$seed" --stufe 1 --vorgabe 9 \
  --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
  --ki mctsFixedSims=120,resignEnabled=0 ${extra[@]+"${extra[@]}"} --roh "$roh"
