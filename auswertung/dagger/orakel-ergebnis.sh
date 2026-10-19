#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht des Orakel-Tests erstellen
# (.github/workflows/endspiel-orakel.yml, docs/muster-endspiel-orakel.md §4).
# Erwartet im Arbeitsverzeichnis orakel/<arm>-<von>.jsonl für die Arme A, D25,
# D50, D100, E100 und die 8 Teile (von = 1, 16, ..., 106, je 15 Partien).
# Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/orakel-ergebnis.sh <seed> [kontrolle.jsonl[.gz]]
#   kontrolle: eine frühere Messung desselben Seeds, gegen die Arm A verglichen wird
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:-}
[ -z "$kontrolle" ] || [ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

# Alle Teile je Arm, je 15 Partien: sonst bricht der Bericht ab
teile=(1 16 31 46 61 76 91 106)
arme=(A D25 D50 D100 E100)
for a in "${arme[@]}"; do
  : > "zw/$a.jsonl"
  for v in "${teile[@]}"; do
    d="orakel/$a-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$a.jsonl"
  done
  [ "$(wc -l < "zw/$a.jsonl")" -eq 120 ]
done

args=(); for a in "${arme[@]}"; do args+=(--arm "$a=zw/$a.jsonl"); done
paare=D25-A,D50-A,D100-A,E100-A
kargs=(); [ -z "$kontrolle" ] || kargs=(--kontrolle "$kontrolle")
node "$wurzel/auswertung/endspiel-pilot-bericht.js" "${args[@]}" --paare "$paare" > ergebnisse/paare.txt
node "$wurzel/auswertung/endspiel-pilot-bericht.js" "${args[@]}" --paare "$paare" --markdown > ergebnisse/paare.md
node "$wurzel/auswertung/orakel-bericht.js" --ref A "${args[@]}" --dosis D25,D50 --ziel 5 ${kargs[@]+"${kargs[@]}"} > ergebnisse/orakel.txt
node "$wurzel/auswertung/orakel-bericht.js" --ref A "${args[@]}" --dosis D25,D50 --ziel 5 ${kargs[@]+"${kargs[@]}"} --markdown > ergebnisse/orakel.md
for a in D25 D50 D100 E100; do
  echo "== $a gegen A"; node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B "zw/$a.jsonl"
done > ergebnisse/zusatz.txt

{
  echo "# Orakel-Test: 120 Paare je Arm gegen GNU Go"
  echo
  echo "Seed $seed. Arm A: ohne Orakel. D25, D50, D100: GNU Go Stufe 10 zieht für die KI ab Zug 81 in 25 %, 50 %, allen ihrer Züge. E100: ab Zug 161 in allen."
  echo
  echo "## Das Orakel und was es wert war"
  echo
  cat ergebnisse/orakel.md
  echo
  echo "## Endstand, gepaart nach Partienummer"
  echo
  cat ergebnisse/paare.md
  echo
  echo "## Median und Vorzeichentest"
  echo
  echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt mitnehmen
for a in "${arme[@]}"; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
