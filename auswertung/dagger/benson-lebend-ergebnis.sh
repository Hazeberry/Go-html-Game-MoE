#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Messung zu bensonAliveExempt erstellen
# (.github/workflows/benson-lebend.yml, docs/benson-lebend-treppe.md §4):
# Arm A (Default) gegen Arm B (bensonAliveExempt 1), 240 Paare gegen GNU Go.
# Erwartet im Arbeitsverzeichnis benson-lebend/{A,B}-<von>.jsonl für die 16
# Teile (von = 1, 16, ..., 226, je 15 Partien). Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/benson-lebend-ergebnis.sh <seed> [kontrolle.jsonl[.gz]]
#   kontrolle: eine frühere Messung desselben Seeds, gegen die Arm A verglichen wird
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:-}
[ -z "$kontrolle" ] || [ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

# Alle 16 Teile je Arm, je 15 Partien: sonst bricht der Bericht ab
teile=(1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226)
for a in A B; do
  : > "zw/$a.jsonl"
  for v in "${teile[@]}"; do
    d="benson-lebend/$a-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$a.jsonl"
  done
  [ "$(wc -l < "zw/$a.jsonl")" -eq 240 ]
done

kargs=(); [ -z "$kontrolle" ] || kargs=(--kontrolle "$kontrolle")
# Ein Vergleich, eine Hypothese: alpha 0,05
node "$wurzel/auswertung/parameter-bericht.js" --ref A --arm A=zw/A.jsonl --arm B=zw/B.jsonl --text B=bensonAliveExempt=1 --alpha 0.05 ${kargs[@]+"${kargs[@]}"} > ergebnisse/messung.txt
node "$wurzel/auswertung/parameter-bericht.js" --ref A --arm A=zw/A.jsonl --arm B=zw/B.jsonl --text B=bensonAliveExempt=1 --alpha 0.05 ${kargs[@]+"${kargs[@]}"} --markdown > ergebnisse/messung.md
node "$wurzel/auswertung/parameter-bericht.js" --ref A --arm A=zw/A.jsonl --arm B=zw/B.jsonl --siege > ergebnisse/siege.txt
node "$wurzel/auswertung/parameter-bericht.js" --ref A --arm A=zw/A.jsonl --arm B=zw/B.jsonl --siege --markdown > ergebnisse/siege.md
node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B zw/B.jsonl --zug 120,200,ende > ergebnisse/zuege.txt
node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B zw/B.jsonl > ergebnisse/zusatz.txt

{
  echo "# Messung zu bensonAliveExempt: 240 Paare gegen GNU Go"
  echo
  echo "Seed $seed. Arm A: Default (\`bensonAliveExempt\` 0), Arm B: \`bensonAliveExempt\` 1."
  echo
  echo "## Endstand, gepaart nach Partienummer"
  echo
  cat ergebnisse/messung.md
  echo
  echo "Als Text:"
  echo
  echo '```'; cat ergebnisse/messung.txt; echo '```'
  echo
  echo "## Siege, gepaart (McNemar, sekundär)"
  echo
  cat ergebnisse/siege.md
  echo
  echo "## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)"
  echo
  echo '```'; cat ergebnisse/zuege.txt; echo '```'
  echo
  echo "## Zusatzzahlen"
  echo
  echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt mitnehmen
for a in A B; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
