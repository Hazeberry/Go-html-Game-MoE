#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht der Nachmessung zu mctsPriorSharp und der Messung von
# bensonDeathTransfer gegen GNU Go erstellen (.github/workflows/prior-nachmessung.yml,
# docs/prior-nachmessung.md §4). Erwartet im Arbeitsverzeichnis prior/:
#   <arm>-<von>.jsonl     M1 gegen GNU Go, je 15 Partien: A und S9 in 32 Teilen
#                         (Partien 1 bis 480), S15, S30, PH und BT in 16 Teilen
#                         (Partien 1 bis 240)
#   K-1.jsonl             Kontrolle: Arm A mit dem Seed der Kontrolldatei, Partien 1 bis 15
#   m2-<arm>-<teil>.json  M2 im Selbstspiel: S9 und BT je 12 Teile zu 30 Partien
# Schreibt ergebnisse/.
#
# Aufruf: bash auswertung/dagger/prior-ergebnis.sh <seed> <kontrolle.jsonl[.gz]> <selbstspiel-seed>
set -euo pipefail
wurzel=$(cd "$(dirname "$0")/../.." && pwd)
seed=${1:?Seed fehlt}; kontrolle=${2:?Kontrolldatei fehlt}; m2seed=${3:?Seed des Selbstspiels fehlt}
[ -f "$kontrolle" ] || { echo "Kontrolldatei fehlt: $kontrolle" >&2; exit 2; }
mkdir -p ergebnisse zw

# Erst alles prüfen: Fehlt ein Teil oder ist er unvollständig, entsteht kein Bericht
lang=(); for ((v = 1; v <= 466; v += 15)); do lang+=("$v"); done   # 32 Teile, Partien 1 bis 480
kurz=("${lang[@]:0:16}")                                            # 16 Teile, Partien 1 bis 240
sammle() {
  local arm=$1; shift
  : > "zw/$arm.jsonl"
  for v in "$@"; do
    local d="prior/$arm-$v.jsonl"
    [ -s "$d" ] || { echo "$d fehlt oder ist leer" >&2; exit 1; }
    [ "$(wc -l < "$d")" -eq 15 ] || { echo "$d hat nicht 15 Partien" >&2; exit 1; }
    cat "$d" >> "zw/$arm.jsonl"
  done
}
sammle A "${lang[@]}"; sammle S9 "${lang[@]}"
for a in S15 S30 PH BT; do sammle "$a" "${kurz[@]}"; done
sammle K 1
for a in S9 BT; do for t in $(seq 1 12); do
  [ -s "prior/m2-$a-$t.json" ] || { echo "prior/m2-$a-$t.json fehlt oder ist leer" >&2; exit 1; }
done; done

P="$wurzel/auswertung/parameter-bericht.js"
texte=(--text S9=mctsPriorSharp=9 --text S15=mctsPriorSharp=15 --text S30=mctsPriorSharp=30 --text PH=mctsPriorSharp@120=9 --text BT=bensonDeathTransfer=1)
fuer_beide() { local ziel=$1; shift; node "$P" "$@" > "ergebnisse/$ziel.txt"; node "$P" "$@" --markdown > "ergebnisse/$ziel.md"; }
# Frage 1, Stufe 1: S9 gegen A, 480 Paare, alpha 0,05
fuer_beide stufe1 --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl "${texte[@]}" --alpha 0.05
# Frage 1, Stufe 2: S15, S30 und PH gegen S9, Partien 1 bis 240, alpha 0,05 / 3
fuer_beide stufe2 --ref S9 --arm S9=zw/S9.jsonl --arm S15=zw/S15.jsonl --arm S30=zw/S30.jsonl --arm PH=zw/PH.jsonl "${texte[@]}" --alpha 0.0167
# Die Dosis-Kurve gegen A, beschreibend (Bonferroni über vier Vergleiche); die Probe der Umschaltung von PH
fuer_beide dosis --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --arm S15=zw/S15.jsonl --arm S30=zw/S30.jsonl --arm PH=zw/PH.jsonl "${texte[@]}" --alpha 0.0125 --anfang 120
# Frage 2: BT gegen A, Partien 1 bis 240, alpha 0,05
fuer_beide transfer --ref A --arm A=zw/A.jsonl --arm BT=zw/BT.jsonl "${texte[@]}" --alpha 0.05
# Siege, gepaart (McNemar, sekundär)
fuer_beide siege --ref A --arm A=zw/A.jsonl --arm S9=zw/S9.jsonl --arm S15=zw/S15.jsonl --arm S30=zw/S30.jsonl --arm PH=zw/PH.jsonl --arm BT=zw/BT.jsonl --siege
fuer_beide siege-s9 --ref S9 --arm S9=zw/S9.jsonl --arm S15=zw/S15.jsonl --arm S30=zw/S30.jsonl --arm PH=zw/PH.jsonl --siege
# Kontrolle: Arm A mit dem Seed der Kontrolldatei gibt deren Partien wieder
node "$P" --ref K --arm K=zw/K.jsonl --kontrolle "$kontrolle" --markdown > ergebnisse/kontrolle.md
# Nach Zug 120, nach Zug 200 und am Ende; Zusatzzahlen
: > ergebnisse/zuege.txt; : > ergebnisse/zusatz.txt
for a in S9 S15 S30 PH BT; do
  { echo "== $a gegen A"; node "$wurzel/auswertung/gnugo-vergleich.js" --A zw/A.jsonl --B "zw/$a.jsonl" --zug 120,200,ende; } >> ergebnisse/zuege.txt
  { echo "== $a gegen A"; node "$wurzel/auswertung/messung-zusatz.js" --A zw/A.jsonl --B "zw/$a.jsonl"; } >> ergebnisse/zusatz.txt
done
# M2 im Selbstspiel, je 360 Partien
: > ergebnisse/selbstspiel.txt; : > ergebnisse/selbstspiel.md
for a in S9 BT; do
  teile=(); for t in $(seq 1 12); do teile+=("prior/m2-$a-$t.json"); done
  node "$wurzel/auswertung/selbstspiel-bericht.js" --name "$a" --partien 360 --roh "zw/m2-$a.jsonl" "${teile[@]}" >> ergebnisse/selbstspiel.txt
  { node "$wurzel/auswertung/selbstspiel-bericht.js" --name "$a" --partien 360 --markdown "${teile[@]}"; echo; } >> ergebnisse/selbstspiel.md
done

{
  echo "# Nachmessung zu mctsPriorSharp und bensonDeathTransfer gegen GNU Go"
  echo
  echo "Seed $seed gegen GNU Go, Seeds ab $m2seed im Selbstspiel. Arm A: Default (\`mctsPriorSharp\` 3, \`bensonDeathTransfer\` 0)."
  echo
  echo "## Frage 1, Stufe 1: S9 gegen A (480 Paare, alpha 0,05)"
  echo; cat ergebnisse/stufe1.md; echo
  echo "## Frage 1, Stufe 2: S15, S30 und PH gegen S9 (Partien 1 bis 240, alpha 0,0167)"
  echo
  echo "Zählt nach docs/prior-nachmessung.md §4 nur, wenn Stufe 1 S9 als besser ausweist."
  echo; cat ergebnisse/stufe2.md; echo
  echo "## Die Dosis-Kurve gegen A (beschreibend)"
  echo; cat ergebnisse/dosis.md; echo
  echo "## Frage 2: BT gegen A (Partien 1 bis 240, alpha 0,05)"
  echo; cat ergebnisse/transfer.md; echo
  echo "## M2: Selbstspiel gegen den Default (je 360 Partien)"
  echo; cat ergebnisse/selbstspiel.md
  echo "## Siege, gepaart (McNemar, sekundär)"
  echo; cat ergebnisse/siege.md; echo; cat ergebnisse/siege-s9.md; echo
  echo "## Kontrolle"
  echo; cat ergebnisse/kontrolle.md; echo
  echo "## Nach Zug 120, nach Zug 200 und am Ende (gnugo-vergleich.js)"
  echo; echo '```'; cat ergebnisse/zuege.txt; echo '```'; echo
  echo "## Zusatzzahlen"
  echo; echo '```'; cat ergebnisse/zusatz.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt mitnehmen
for a in A S9 S15 S30 PH BT K m2-S9 m2-BT; do gzip -9 -c "zw/$a.jsonl" > "ergebnisse/$a.jsonl.gz"; done
cat ergebnisse/bericht.md
