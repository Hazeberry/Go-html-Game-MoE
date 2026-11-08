#!/usr/bin/env bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Führt die Diagnose aus docs/zaehlung-mechanismus.md in fester Reihenfolge aus (lokal, nur lesend, kein GNU Go,
# kein Actions-Lauf, keine Spieländerung). Kein Messlauf im Sinn von CLAUDE.md, aber rechnet alle 563 Stellungen der Stufe C:
# nur nach ausdrücklichem Go starten.
#   bash auswertung/zaehlung-mechanismus/lauf.sh <bericht.zip der Stufe C> <Arbeitsverzeichnis außerhalb des Repos> <Ausgabe> [<codex-Checkout>]
# Ohne codex-Checkout entfällt Teil B (browser.cjs liegt in Hazeberry/codex).
set -u
ZIP=$1; ARBEIT=$2; AUS=$3; CODEX=${4:-}
HIER=$(cd "$(dirname "$0")" && pwd); WURZEL=$(cd "$HIER/../.." && pwd)
ERWARTET=0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08
ist=$(sha256sum "$ZIP" | cut -d' ' -f1)
if [ "$ist" != "$ERWARTET" ]; then echo "ZIP-SHA-256 weicht ab ($ist): kein Urteil"; exit 1; fi
rm -rf "$ARBEIT/stufe-c"; mkdir -p "$ARBEIT/stufe-c" "$AUS"
# Frische Ausgabe: bekannte Ergebnisdateien früherer Läufe entfernen (nie alte Zwischenstände lesen)
rm -f "$AUS"/mech.json "$AUS"/benson.json "$AUS"/gegenprobe-*.json "$AUS"/zaehl-liste.txt "$AUS"/mechanismus.txt "$AUS"/kennzahlen.txt "$AUS"/benson.txt "$AUS"/gegenprobe-*.txt "$AUS"/falschesauge.txt
unzip -q "$ZIP" -d "$ARBEIT/stufe-c" || exit 1
D="$ARBEIT/stufe-c"; H="$WURZEL/index.html"; status=0
schritt() { local name=$1; shift; echo "== $name"; "$@" > "$AUS/$name.txt" 2>&1 || { s=$?; echo "   Exit $s"; status=1; }; tail -n 3 "$AUS/$name.txt"; }
schritt zaehl-liste   node "$HIER/zaehl-liste.js" --daten "$D"
schritt mechanismus   node "$HIER/mechanismus.js" --html "$H" --daten "$D" --tmp "$ARBEIT/kopien" --aus "$AUS/mech.json"
schritt kennzahlen    node "$HIER/kennzahlen.js" --mech "$AUS/mech.json"
schritt benson        node "$HIER/benson-unabhaengig.js" --html "$H" --daten "$D" --aus "$AUS/benson.json"
schritt gegenprobe-freiheitsverband node "$HIER/gegenprobe.js" --variante freiheitsverband --html "$H" --daten "$D" --tmp "$ARBEIT/kopien" --aus "$AUS/gegenprobe-freiheitsverband.json"
schritt gegenprobe-diagonalauge     node "$HIER/gegenprobe.js" --variante diagonalauge --html "$H" --daten "$D" --tmp "$ARBEIT/kopien" --aus "$AUS/gegenprobe-diagonalauge.json"
schritt falschesauge  node "$HIER/falschesauge.js" --daten "$D" --mech "$AUS/mech.json"
if [ -n "$CODEX" ]; then
  bash "$HIER/browser-teil.sh" "$H" "$CODEX" "$AUS" || status=1
fi
exit $status
