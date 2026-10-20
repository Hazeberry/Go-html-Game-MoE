#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Dosis des Endspiel-Netzes erstellen (.github/workflows/netz-dosis.yml,
# docs/netz-dosis.md §4). Erwartet in dosis/: A-<von>.jsonl, L8-<von>.jsonl und
# T8-<von>.jsonl (16 Teile zu 15 Partien), K-1.jsonl (Kontrolle) und
# m2-<arm>-<teil>.json (Selbstspiel ohne Aufgabe, L8 und T8, je 12 Teile zu 30 Partien).
#
# Aufruf: bash auswertung/dagger/netz-dosis-ergebnis.sh <seed> <kontrolle.jsonl[.gz]> <seed-m2-L8> <seed-m2-T8>
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:?Kontrolldatei fehlt}; l8seed=${3:?Seed von M2 für L8 fehlt}; t8seed=${4:?Seed von M2 für T8 fehlt}
[ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

teile=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
sammle() {
  local arm=$1; shift
  : > "zw/$arm.jsonl"
  for v in "$@"; do
    local d="dosis/$arm-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$arm.jsonl"
  done
}
sammle A "${teile[@]}"; sammle L8 "${teile[@]}"; sammle T8 "${teile[@]}"; sammle K 1
l8=(); t8=(); for t in $(seq 1 12); do
  for a in L8 T8; do [ -s "dosis/m2-$a-$t.json" ] || { echo "dosis/m2-$a-$t.json fehlt oder ist leer" >&2; exit 1; }; done
  l8+=("dosis/m2-L8-$t.json"); t8+=("dosis/m2-T8-$t.json")
done

P="$wurzel/auswertung/parameter-bericht.js"
arme=(--ref A --arm A=zw/A.jsonl --arm L8=zw/L8.jsonl --arm T8=zw/T8.jsonl)
texte=(--text L8=endspielNetz=0.8 --text T8=endspielNetzTop=8)
node "$P" "${arme[@]}" "${texte[@]}" --alpha 0.025 > ergebnisse/messung.txt
node "$P" "${arme[@]}" "${texte[@]}" --alpha 0.025 --markdown > ergebnisse/messung.md
node "$P" "${arme[@]}" --siege > ergebnisse/siege.txt
node "$P" "${arme[@]}" --siege --markdown > ergebnisse/siege.md
node "$P" --ref K --arm K=zw/K.jsonl --kontrolle "$kontrolle" --markdown > ergebnisse/kontrolle.md
: > ergebnisse/zuege.txt; : > ergebnisse/zusatz.txt
for a in L8 T8; do
  { echo "== $a − A"; node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B "zw/$a.jsonl" --zug 120,200,ende; echo; } >> ergebnisse/zuege.txt
  { echo "== $a − A"; node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B "zw/$a.jsonl"; echo; } >> ergebnisse/zusatz.txt
done
S="$wurzel/auswertung/selbstspiel-bericht.js"
node "$S" --name "L8" --partien 360 --roh zw/m2-L8.jsonl "${l8[@]}" > ergebnisse/selbstspiel.txt
node "$S" --name "T8" --partien 360 --roh zw/m2-T8.jsonl "${t8[@]}" >> ergebnisse/selbstspiel.txt
{ node "$S" --name "L8" --partien 360 --markdown "${l8[@]}"; echo; node "$S" --name "T8" --partien 360 --markdown "${t8[@]}"; } > ergebnisse/selbstspiel.md

{
  echo "# Dosis des Endspiel-Netzes"
  echo
  echo "Seed $seed gegen GNU Go mit sechs Vorgabesteinen; Selbstspiel ohne Aufgabe, L8 ab Seed $l8seed, T8 ab Seed $t8seed."
  echo
  echo "## M1: Endstand, gepaart nach Partienummer (alpha 0,025 je Vergleich)"
  echo; cat ergebnisse/messung.md; echo
  echo "## M2: Selbstspiel gegen den Default, ohne Aufgabe"
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

for a in A L8 T8 K m2-L8 m2-T8; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
