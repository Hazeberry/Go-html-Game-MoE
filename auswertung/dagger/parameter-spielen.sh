#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# 15 Partien eines Arms der Parameter-Reihe gegen GNU Go spielen
# (.github/workflows/parameter-reihe.yml, docs/parameter-reihe.md §2).
# Bedingungen wie in den Messungen: GNU Go Stufe 1, neun Vorgabesteine, 120
# Simulationen, GNU Go gibt nicht auf, bis 600 Züge, ausgespielt. Die Arme
# unterscheiden sich nur in den Parametern von parameter-arme.sh.
#
# Aufruf: bash auswertung/dagger/parameter-spielen.sh <arm> <von> <seed> <roh.jsonl>
#         bash auswertung/dagger/parameter-spielen.sh --ki <arm>   (nur die --ki-Angabe ausgeben)
# Die Arme stehen in parameter-arme.sh; ARME_DATEI nennt eine andere Datei mit
# demselben Aufbau (benson-lebend-arme.sh für docs/benson-lebend-treppe.md).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
arme_datei=${ARME_DATEI:-$here/parameter-arme.sh}
[ -f "$arme_datei" ] || { echo "Datei der Arme fehlt: $arme_datei" >&2; exit 2; }
# shellcheck source=parameter-arme.sh
source "$arme_datei"

ki_von() {
  local a=$1 bekannt=0 x
  for x in "${ARM_REIHE[@]}"; do [ "$x" = "$a" ] && bekannt=1; done
  [ "$bekannt" -eq 1 ] || { echo "unbekannter Arm: '$a'" >&2; exit 2; }
  local ki="mctsFixedSims=120,resignEnabled=0"
  [ -z "${ARM_KI[$a]}" ] || ki="$ki,${ARM_KI[$a]}"
  echo "$ki"
}

if [ "${1:-}" = "--ki" ]; then ki_von "${2:?Arm fehlt}"; exit 0; fi

arm=${1:?Arm fehlt}; von=${2:?Beginn fehlt}; seed=${3:?Seed fehlt}; roh=${4:?Ausgabedatei fehlt}
for v in "$von" "$seed"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
ki=$(ki_von "$arm")
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node "$here/../../gnugo-duell.js" --partien 15 --von "$von" --seed "$seed" --stufe 1 --vorgabe 9 \
  --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
  --ki "$ki" --roh "$roh"
