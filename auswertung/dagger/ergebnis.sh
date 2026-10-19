#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Den Bericht einer Runde der Datenaggregation erstellen
# (docs/muster-endspiel-dagger.md §4): Pilot A gegen VOR gegen NEU, dazu wie
# gut die Tabellen GNU Gos Zug auf den Stellungen von NEU treffen.
# Erwartet im Arbeitsverzeichnis:
#   pilot/pilot-{A,VOR,NEU}-{1,31}.jsonl, pilot/lehr-NEU-{1,31}.jsonl   (Pilotpartien)
#   tabelle/tabelle-vor.json, tabelle/tabelle-neu.json                  (die beiden Tabellen)
#   tabelle/d1-spiele.jsonl, tabelle/d1-lehr.jsonl, tabelle/lernen-bericht.txt
# Schreibt ergebnisse/ (Bericht und gepackte Rohdaten).
#
# Aufruf: bash auswertung/dagger/ergebnis.sh <runde> [kontrolle]
#   kontrolle: ja = A und VOR gegen den Container-Pilot (docs/daten/endmuster-pilot.json) prüfen
set -euo pipefail
runde=${1:?Runde fehlt}; kontrolle=${2:-nein}
mkdir -p ergebnisse zw
arm() { printf 'pilot/pilot-%s-1.jsonl,pilot/pilot-%s-31.jsonl' "$1" "$1"; }

args=(--arm "A=$(arm A)" --arm "VOR=$(arm VOR)" --arm "NEU=$(arm NEU)" --paare NEU-A,VOR-A,NEU-VOR)
if [ "$kontrolle" = ja ]; then args+=(--container docs/daten/endmuster-pilot.json --zuordnung A=A,VOR=200); fi
node auswertung/endspiel-pilot-bericht.js "${args[@]}" > ergebnisse/pilot.txt
node auswertung/endspiel-pilot-bericht.js "${args[@]}" --markdown > ergebnisse/pilot.md

# Treffen die Tabellen GNU Gos Zug auf den Stellungen von NEU?
node auswertung/muster-endspiel-daten.js pilot/lehr-NEU-1.jsonl pilot/lehr-NEU-31.jsonl --aus zw/neu 2> zw/neu.log
tail -n 1 zw/neu.log
{
  echo "Stellungen der Partien von NEU (Pilot, Seed wie oben), Tabelle der Runde davor (VOR):"
  node auswertung/muster-endspiel-verschiebung.js --tabelle tabelle/tabelle-vor.json --menge "NEU=zw/neu:$(arm NEU)"
  echo
  echo "dieselben Stellungen, neue Tabelle (NEU):"
  node auswertung/muster-endspiel-verschiebung.js --tabelle tabelle/tabelle-neu.json --menge "NEU=zw/neu:$(arm NEU)"
} > ergebnisse/verschiebung.txt

{
  echo "# Datenaggregation, Runde $runde"
  echo
  echo "## Pilot gegen GNU Go (Endstand, gepaart nach Partienummer)"
  echo
  cat ergebnisse/pilot.md
  echo
  echo "## Trifft die Tabelle GNU Gos Zug auf den eigenen Stellungen?"
  echo
  echo '```'; cat ergebnisse/verschiebung.txt; echo '```'
  echo
  echo "## Lernen"
  echo
  echo '```'; cat tabelle/lernen-bericht.txt; echo '```'
} > ergebnisse/bericht.md

# Rohdaten gepackt mitnehmen
for a in A VOR NEU; do cat "pilot/pilot-$a-1.jsonl" "pilot/pilot-$a-31.jsonl" | gzip -9 > "ergebnisse/pilot-$a.jsonl.gz"; done
cat pilot/lehr-NEU-1.jsonl pilot/lehr-NEU-31.jsonl | gzip -9 > ergebnisse/pilot-NEU-lehr.jsonl.gz
gzip -9 -c tabelle/d1-spiele.jsonl > ergebnisse/dagger-spiele.jsonl.gz
gzip -9 -c tabelle/d1-lehr.jsonl > ergebnisse/dagger-lehr.jsonl.gz
cp tabelle/tabelle-neu.json ergebnisse/tabelle-neu.json
cp tabelle/tabelle-vor.json ergebnisse/tabelle-vor.json
cat ergebnisse/bericht.md
