#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Ein Teil der Prüfung des Endspiel-Lerners (docs/endspiel-lerner.md §4,
# .github/workflows/endspiel-lerner.yml): die Partien <von> bis <von> + 14 aus
# der Prüfdatei (ohne die Partien in OHNE_NR) von GNU Go Stufe 10 beschriften
# lassen (muster-daten.js, nur Züge der KI ab Zug 81), dann jede beschriftete
# Stellung ohne und mit Lerner ziehen lassen (lerner-pruefung.js).
#
# Aufruf: bash auswertung/dagger/lerner-teil.sh <von> <pruef.jsonl.gz> <netz.json.gz> <λ> <top> <ausverzeichnis>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
von=${1:?Beginn fehlt}; pruef=${2:?Prüfdatei fehlt}; netz=${3:?Netz fehlt}; lambda=${4:?λ fehlt}; top=${5:?top fehlt}; aus=${6:?Ausgabeverzeichnis fehlt}
case "$von" in ''|*[!0-9]*) echo "keine Zahl: '$von'" >&2; exit 2;; esac
case "$top" in ''|*[!0-9]*) echo "keine Zahl: '$top'" >&2; exit 2;; esac
case "$lambda" in ''|*[!0-9.]*) echo "keine Zahl: '$lambda'" >&2; exit 2;; esac
for f in "$pruef" "$netz"; do [ -f "$f" ] || { echo "Datei fehlt: $f" >&2; exit 2; }; done
ohne=${OHNE_NR:-}
mkdir -p "$aus"
roh="$aus/roh-$von.jsonl"; lehr="$aus/lehr-$von.jsonl"
rm -f "$roh" "$lehr"
VON="$von" OHNE="$ohne" node -e '
const zlib = require("zlib"), fs = require("fs");
const von = +process.env.VON, ohne = new Set((process.env.OHNE || "").split(",").filter(Boolean).map(Number));
const text = zlib.gunzipSync(fs.readFileSync(process.argv[1])).toString("utf8");
const zeilen = text.trim().split("\n").filter(z => { const nr = JSON.parse(z).nr; return nr >= von && nr < von + 15 && !ohne.has(nr); });
fs.writeFileSync(process.argv[2], zeilen.join("\n") + (zeilen.length ? "\n" : ""));
console.error(zeilen.length + " Partien ab " + von);' "$pruef" "$roh"
node "$here/../muster-daten.js" "$roh" --ab 80 --bis 600 --stufe 10 --seite ki --aus "$lehr"
node "$here/../lerner-pruefung.js" "$lehr" --netz "$netz" --lambda "$lambda" --top "$top" --ab 80 --aus "$aus/ergebnis-$von.jsonl"
