#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Ein Teil des Selbstspiel-Wächters M2 (docs/teststaerke.md §2,
# docs/prior-nachmessung.md §3): 30 Partien ab-harness.js, Arm A (Default)
# gegen den Arm aus der Datei der Arme, beide mit 120 Simulationen, Farben im
# Wechsel. Teil k (1 bis 12) spielt mit dem Seed <seed-basis> + k − 1; zwölf
# Teile sind 360 Partien, wie im Rezept von docs/quick-rettung.md.
#
# Aufruf: bash auswertung/dagger/selbstspiel-spielen.sh <arm> <teil> <seed-basis> <aus.json>
# ARME_DATEI nennt die Datei der Arme (Standard: prior-arme.sh).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
arme_datei=${ARME_DATEI:-$here/prior-arme.sh}
[ -f "$arme_datei" ] || { echo "Datei der Arme fehlt: $arme_datei" >&2; exit 2; }
# shellcheck source=prior-arme.sh
source "$arme_datei"

arm=${1:?Arm fehlt}; teil=${2:?Teil fehlt}; basis=${3:?Seed-Basis fehlt}; aus=${4:?Ausgabedatei fehlt}
for v in "$teil" "$basis"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
[ "$teil" -ge 1 ] && [ "$teil" -le 12 ] || { echo "Teil muss zwischen 1 und 12 liegen: $teil" >&2; exit 2; }
bekannt=0; for x in "${ARM_REIHE[@]}"; do [ "$x" = "$arm" ] && bekannt=1; done
[ "$bekannt" -eq 1 ] || { echo "unbekannter Arm: '$arm'" >&2; exit 2; }
[ -n "${ARM_KI[$arm]}" ] || { echo "Arm $arm ist der Default, gegen sich selbst wird nicht gespielt" >&2; exit 2; }
mkdir -p "$(dirname "$aus")"
rm -f "$aus"
node "$here/../../ab-harness.js" --html "$here/../../index.html" --games 30 --seed "$((basis + teil - 1))" \
  --A mctsFixedSims=120 --B "mctsFixedSims=120,${ARM_KI[$arm]}" --json "$aus"
