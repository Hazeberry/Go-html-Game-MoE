#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung des Endspiel-Netzes erstellen
# (.github/workflows/endspiel-netz.yml, docs/endspiel-netz.md §4). Erwartet in
# netz/: A-<von>.jsonl und N-<von>.jsonl (16 Teile zu 15 Partien), K-1.jsonl
# (Kontrolle) und m2-N-<teil>.json (12 Teile zu 30 Partien). Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/endspiel-netz-ergebnis.sh <seed> <kontrolle.jsonl[.gz]> <selbstspiel-seed>
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:?Kontrolldatei fehlt}; m2seed=${3:?Seed des Selbstspiels fehlt}
[ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

teile=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
sammle() {
  local arm=$1; shift
  : > "zw/$arm.jsonl"
  for v in "$@"; do
    local d="netz/$arm-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$arm.jsonl"
  done
}
sammle A "${teile[@]}"; sammle N "${teile[@]}"; sammle K 1
m2=(); for t in $(seq 1 12); do
  [ -s "netz/m2-N-$t.json" ] || { echo "netz/m2-N-$t.json fehlt oder ist leer" >&2; exit 1; }
  m2+=("netz/m2-N-$t.json")
done

P="$wurzel/auswertung/parameter-bericht.js"
node "$P" --ref A --arm A=zw/A.jsonl --arm N=zw/N.jsonl --text N=endspielNetz=0.5 --alpha 0.05 > ergebnisse/messung.txt
node "$P" --ref A --arm A=zw/A.jsonl --arm N=zw/N.jsonl --text N=endspielNetz=0.5 --alpha 0.05 --markdown > ergebnisse/messung.md
node "$P" --ref A --arm A=zw/A.jsonl --arm N=zw/N.jsonl --siege > ergebnisse/siege.txt
node "$P" --ref A --arm A=zw/A.jsonl --arm N=zw/N.jsonl --siege --markdown > ergebnisse/siege.md
node "$P" --ref K --arm K=zw/K.jsonl --kontrolle "$kontrolle" --markdown > ergebnisse/kontrolle.md
node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B zw/N.jsonl --zug 120,200,ende > ergebnisse/zuege.txt
node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B zw/N.jsonl > ergebnisse/zusatz.txt
node "$wurzel/auswertung/selbstspiel-bericht.js" --name N --partien 360 --roh zw/m2-N.jsonl "${m2[@]}" > ergebnisse/selbstspiel.txt
node "$wurzel/auswertung/selbstspiel-bericht.js" --name N --partien 360 --markdown "${m2[@]}" > ergebnisse/selbstspiel.md

{
  echo "# Messung des Endspiel-Netzes: 240 Paare gegen GNU Go, 360 Partien im Selbstspiel"
  echo
  echo "Seed $seed gegen GNU Go, Seeds ab $m2seed im Selbstspiel. Arm A: Default (\`endspielNetz\` 0), Arm N: \`endspielNetz\` 0,5."
  echo
  echo "## M1: Endstand, gepaart nach Partienummer (alpha 0,05)"
  echo; cat ergebnisse/messung.md; echo
  echo "## M2: Selbstspiel gegen den Default"
  echo; cat ergebnisse/selbstspiel.md; echo
  echo "## Siege, gepaart (McNemar, sekundär)"
  echo; cat ergebnisse/siege.md; echo
  echo "## Kontrolle"
  echo; cat ergebnisse/kontrolle.md; echo
  echo "## Nach Zug 120, nach Zug 200 und am Ende"
  echo; echo '```'; cat ergebnisse/zuege.txt; echo '```'; echo
  echo "## Zusatzzahlen"
  echo; echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

for a in A N K m2-N; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
