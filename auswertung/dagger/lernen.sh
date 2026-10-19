#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die neue Tabelle lernen (docs/muster-endspiel-dagger.md §3): aus den Daten B
# und den Prüfdaten aus Schritt 1 (docs/daten), den neu beschrifteten
# Stellungen der Runde und, wenn angegeben, den Stellungen früherer Runden.
# Zwischenspeicher in zw/, Ergebnis tabelle-neu.json.
#
# Aufruf: bash auswertung/dagger/lernen.sh <lehr-runde.jsonl> [<lehr-frueher.jsonl[.gz]> ...]
set -euo pipefail
runde=${1:?Beschriftete Stellungen der Runde fehlen}; shift
mkdir -p zw
pids=(); namen=()
starte() { node auswertung/muster-endspiel-daten.js "$1" --aus "zw/$2" 2> "zw/$2.log" & pids+=($!); namen+=("$2"); }
starte docs/daten/muster-endspiel-entw-b.jsonl.gz entw-b
starte docs/daten/muster-endspiel-pruef.jsonl.gz pruef
starte "$runde" runde
i=0; for f in "$@"; do i=$((i+1)); starte "$f" "frueher$i"; done
fehler=0
for j in "${!pids[@]}"; do
  if ! wait "${pids[$j]}"; then echo "Zwischenspeicher ${namen[$j]} fehlgeschlagen" >&2; tail -n 5 "zw/${namen[$j]}.log" >&2; fehler=1; fi
  echo "${namen[$j]}: $(tail -n 1 "zw/${namen[$j]}.log")"
done
[ "$fehler" -eq 0 ]
lehr=zw/entw-b,zw/pruef,zw/runde
for j in $(seq 1 $i); do lehr="$lehr,zw/frueher$j"; done
node auswertung/muster-endspiel-tabelle.js --lehr "$lehr" --aus tabelle-neu.json
