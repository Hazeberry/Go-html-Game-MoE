#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Partien eines Arms von Stufe A der Komponentenmessung spielen
# (docs/komponenten.md, .github/workflows/komponenten.yml).
#
#   gegner g   GNU Go Stufe 1 zieht und zählt
#   gegner f   Fuego mit 100 Spielen je Zug zieht, GNU Go Stufe 1 zählt
#              (docs/fuego.md §12); FUEGO nennt das Programm
#
# Beide: sechs Vorgabesteine, 120 Simulationen, Aufgabe der KI aus, GNU Go
# gibt nicht auf, bis 600 Züge, Schätzung nach Zug 40, 80, 120 und 200
# (SCHAETZUNG ändert die Liste, für die Kontrollen). SIMS ändert die 120
# Simulationen (docs/baum-uebernahme.md: 600). GNUGO nennt GNU Go
# (Standard /usr/games/gnugo). Die Arme stehen in arme.sh (Stufe A); ARME
# nennt eine andere Datei mit demselben Aufbau (arme-b.sh für Stufe B,
# docs/komponenten-b.md).
#
# Aufruf: bash auswertung/komponenten/spielen.sh <g|f> <arm> <von> <anzahl> <seed> <roh.jsonl>
#         bash auswertung/komponenten/spielen.sh --ki <arm>   (nur die --ki-Angabe ausgeben)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
arme=${ARME:-$here/arme.sh}
[ -f "$arme" ] || { echo "Datei der Arme fehlt: $arme" >&2; exit 2; }
# shellcheck source=arme.sh
source "$arme"

ki_von() {
  local a=$1 bekannt=0 x
  for x in "${ARM_REIHE[@]}"; do [ "$x" = "$a" ] && bekannt=1; done
  [ "$bekannt" -eq 1 ] || { echo "unbekannter Arm: '$a'" >&2; exit 2; }
  local sims=${SIMS:-120}
  case "$sims" in ''|*[!0-9]*) echo "SIMS keine Zahl: '$sims'" >&2; exit 2;; esac
  [ "$sims" -ge 1 ] && [ "$sims" -le 100000 ] || { echo "SIMS 1 bis 100000: $sims" >&2; exit 2; }
  local ki="mctsFixedSims=$sims,resignEnabled=0"
  [ -z "${ARM_KI[$a]}" ] || ki="$ki,${ARM_KI[$a]}"
  echo "$ki"
}

if [ "${1:-}" = "--ki" ]; then ki_von "${2:?Arm fehlt}"; exit 0; fi

gegner=${1:?Gegner fehlt}; arm=${2:?Arm fehlt}; von=${3:?Beginn fehlt}; anzahl=${4:?Anzahl fehlt}
seed=${5:?Seed fehlt}; roh=${6:?Ausgabedatei fehlt}
for v in "$von" "$anzahl" "$seed"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
schaetzung=${SCHAETZUNG:-40,80,120,200}
case "$schaetzung" in ''|*[!0-9,]*) echo "Schätzung: Zugzahlen mit Komma: '$schaetzung'" >&2; exit 2;; esac
ki=$(ki_von "$arm")
case "$gegner" in
  g) wer=() ;;
  f) wer=(--gegner fuego --fuego "${FUEGO:-$here/../../fuego-bin/fuego}" --fuego-spiele 100) ;;
  *) echo "Gegner g (GNU Go) oder f (Fuego): '$gegner'" >&2; exit 2 ;;
esac
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node "$here/../../gnugo-duell.js" "${wer[@]}" --gnugo "${GNUGO:-/usr/games/gnugo}" \
  --partien "$anzahl" --von "$von" --seed "$seed" --stufe 1 --vorgabe 6 \
  --maxzuege 600 --schaetzung "$schaetzung" --gnugo-aufgabe 0 \
  --ki "$ki" --roh "$roh"
