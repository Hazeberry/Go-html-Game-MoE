#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung M1 erstellen
# (.github/workflows/endspiel-messung.yml, docs/muster-endspiel-messung.md §4):
# Arm A (Default) gegen Arm B (musterEndspiel mit Tabelle), 240 Paare gegen
# GNU Go. Erwartet im Arbeitsverzeichnis messung/{A,B}-<von>.jsonl für die 16
# Teile (von = 1, 16, ..., 226, je 15 Partien). Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/messung-ergebnis.sh <basis> <tabelle.json> <gewicht> <seed>
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
basis=${1:?Basis fehlt}; tabelle=${2:?Tabelle fehlt}; gewicht=${3:?Gewicht fehlt}; seed=${4:?Seed fehlt}
[ -f "$tabelle" ] || { echo "Tabelle fehlt: $tabelle" >&2; exit 2; }
mkdir -p ergebnisse zw

# Alle 16 Teile je Arm, je 15 Partien: sonst bricht der Bericht ab
teile=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
for a in A B; do
  : > "zw/$a.jsonl"
  for v in "${teile[@]}"; do
    d="messung/$a-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$a.jsonl"
  done
  [ "$(wc -l < "zw/$a.jsonl")" -eq 240 ]
done

bericht="$wurzel/auswertung/endspiel-pilot-bericht.js"
node "$bericht" --arm A=zw/A.jsonl --arm B=zw/B.jsonl --paare B-A > ergebnisse/messung.txt
node "$bericht" --arm A=zw/A.jsonl --arm B=zw/B.jsonl --paare B-A --markdown > ergebnisse/messung.md
node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B zw/B.jsonl --zug 120,200,ende > ergebnisse/zuege.txt
node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B zw/B.jsonl > ergebnisse/zusatz.txt

{
  echo "# Messung M1: 240 Paare gegen GNU Go"
  echo
  echo "Basis \`${basis:0:7}\`, Tabelle von B: \`$tabelle\`, Gewicht $gewicht, Seed $seed. Arm A: Default (\`musterEndspiel\` 0), Arm B: \`musterEndspiel\` $gewicht."
  echo
  echo "## Endstand, gepaart nach Partienummer"
  echo
  cat ergebnisse/messung.md
  echo
  echo "Als Text:"
  echo
  echo '```'; cat ergebnisse/messung.txt; echo '```'
  echo
  echo "## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)"
  echo
  echo '```'; cat ergebnisse/zuege.txt; echo '```'
  echo
  echo "## Zusatzzahlen"
  echo
  echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt und die Tabelle von B mitnehmen
for a in A B; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cp "$tabelle" ergebnisse/tabelle-B.json
cat ergebnisse/bericht.md
