#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Prüfung von mctsPriorSharp 9 erstellen (.github/workflows/prior-neun.yml,
# docs/prior-neun.md §4). Erwartet in neun/: A-<von>.jsonl und S9-<von>.jsonl (16 Teile
# zu 15 Partien), K-1.jsonl (Kontrolle), m2-S9-<teil>.json (Selbstspiel ohne Aufgabe)
# und m3-S9-<teil>.json (Selbstspiel mit Aufgabe), je 12 Teile zu 30 Partien.
#
# Aufruf: bash auswertung/dagger/prior-neun-ergebnis.sh <seed> <kontrolle.jsonl[.gz]> <seed-m2> <seed-m3>
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:?Kontrolldatei fehlt}; m2seed=${3:?Seed von M2 fehlt}; m3seed=${4:?Seed von M3 fehlt}
[ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

teile=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
sammle() {
  local arm=$1; shift
  : > "zw/$arm.jsonl"
  for v in "$@"; do
    local d="neun/$arm-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$arm.jsonl"
  done
}
sammle A "${teile[@]}"; sammle S9 "${teile[@]}"; sammle K 1
m2=(); m3=(); for t in $(seq 1 12); do
  for m in m2 m3; do [ -s "neun/$m-S9-$t.json" ] || { echo "neun/$m-S9-$t.json fehlt oder ist leer" >&2; exit 1; }; done
  m2+=("neun/m2-S9-$t.json"); m3+=("neun/m3-S9-$t.json")
done

P="$wurzel/auswertung/parameter-bericht.js"
node "$P" --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --text S9=mctsPriorSharp=9 --alpha 0.05 > ergebnisse/messung.txt
node "$P" --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --text S9=mctsPriorSharp=9 --alpha 0.05 --markdown > ergebnisse/messung.md
node "$P" --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --siege > ergebnisse/siege.txt
node "$P" --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --siege --markdown > ergebnisse/siege.md
node "$P" --ref K --arm K=zw/K.jsonl --kontrolle "$kontrolle" --markdown > ergebnisse/kontrolle.md
node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B zw/S9.jsonl --zug 120,200,ende > ergebnisse/zuege.txt
node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B zw/S9.jsonl > ergebnisse/zusatz.txt
S="$wurzel/auswertung/selbstspiel-bericht.js"
node "$S" --name "M2 (ohne Aufgabe)" --partien 360 --roh zw/m2-S9.jsonl "${m2[@]}" > ergebnisse/selbstspiel.txt
node "$S" --name "M3 (mit Aufgabe)" --partien 360 --roh zw/m3-S9.jsonl "${m3[@]}" >> ergebnisse/selbstspiel.txt
{ node "$S" --name "M2 (ohne Aufgabe)" --partien 360 --markdown "${m2[@]}"; echo; node "$S" --name "M3 (mit Aufgabe)" --partien 360 --markdown "${m3[@]}"; } > ergebnisse/selbstspiel.md

{
  echo "# Prüfung von mctsPriorSharp 9 auf dem Default mit Endspiel-Netz"
  echo
  echo "Seed $seed gegen GNU Go; Selbstspiel ohne Aufgabe ab Seed $m2seed, mit Aufgabe ab Seed $m3seed."
  echo
  echo "## M1: Endstand, gepaart nach Partienummer (alpha 0,05)"
  echo; cat ergebnisse/messung.md; echo
  echo "## M2 und M3: Selbstspiel gegen den Default"
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

for a in A S9 K m2-S9 m3-S9; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
