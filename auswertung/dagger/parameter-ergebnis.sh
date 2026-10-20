#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Parameter-Reihe erstellen
# (.github/workflows/parameter-reihe.yml, docs/parameter-reihe.md §4).
# Erwartet im Arbeitsverzeichnis parameter/<arm>-<von>.jsonl für die Arme von
# parameter-arme.sh: 16 Teile (von = 1, 16, ..., 226, je 15 Partien) für jeden
# Arm, für die Negativkontrolle N nur die ersten zwei. Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/parameter-ergebnis.sh <seed> [kontrolle.jsonl[.gz]]
#   kontrolle: eine frühere Messung desselben Seeds, gegen die Arm A verglichen wird
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
# shellcheck source=parameter-arme.sh
source "$wurzel/auswertung/dagger/parameter-arme.sh"
seed=${1:?Seed fehlt}; kontrolle=${2:-}
[ -z "$kontrolle" ] || [ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

# Alle Teile je Arm, je 15 Partien: sonst bricht der Bericht ab
alle=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
for a in "${ARM_REIHE[@]}"; do
  if [ "$a" = N ]; then teile=(1 16); soll=30; else teile=("${alle[@]}"); soll=240; fi
  : > "zw/$a.jsonl"
  for v in "${teile[@]}"; do
    d="parameter/$a-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$a.jsonl"
  done
  [ "$(wc -l < "zw/$a.jsonl")" -eq "$soll" ]
done

args=(); texte=()
for a in "${ARM_REIHE[@]}"; do
  args+=(--arm "$a=zw/$a.jsonl")
  [ -z "${ARM_KI[$a]}" ] || texte+=(--text "$a=${ARM_KI[$a]}")
done
kargs=(); [ -z "$kontrolle" ] || kargs=(--kontrolle "$kontrolle")
# 10 Vergleiche gegen A: alpha je Vergleich nach Bonferroni = 0,05 / 10
node "$wurzel/auswertung/parameter-bericht.js" --ref A "${args[@]}" "${texte[@]}" --gleich N --alpha 0.005 ${kargs[@]+"${kargs[@]}"} > ergebnisse/parameter.txt
node "$wurzel/auswertung/parameter-bericht.js" --ref A "${args[@]}" "${texte[@]}" --gleich N --alpha 0.005 ${kargs[@]+"${kargs[@]}"} --markdown > ergebnisse/parameter.md
for a in "${ARM_REIHE[@]}"; do
  [ "$a" = A ] || [ "$a" = N ] && continue
  echo "== $a gegen A"; node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B "zw/$a.jsonl"
done > ergebnisse/zusatz.txt

{
  echo "# Parameter-Reihe: 240 Paare je Arm gegen GNU Go"
  echo
  echo "Seed $seed. Arm A: Default. Die übrigen Arme ändern je einen Parameter (Tabelle), N ist die Negativkontrolle (30 Partien)."
  echo
  echo "## Endstand, gepaart nach Partienummer"
  echo
  cat ergebnisse/parameter.md
  echo
  echo "## Median und Vorzeichentest"
  echo
  echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt mitnehmen
for a in "${ARM_REIHE[@]}"; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
