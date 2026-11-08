#!/usr/bin/env bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Teil B der Diagnose (docs/zaehlung-mechanismus.md): browser.cjs aus Hazeberry/codex gegen die eigene index.html.
#   bash browser-teil.sh <index.html> <codex-Checkout> <Ausgabeverzeichnis> [<Bericht der Wiederholung>]
# Exit 0: Lauf gültig (browser.cjs Exit 0 oder 1 UND frischer, vollständiger Bericht); Exit 1: kein Urteil oder technischer Fehler.
# browser.cjs: Exit 0 = nichts reproduziert, 1 = mindestens ein Fall reproduziert, 2 = nicht ausgeführt/Testfehler. Ein Exit 1 allein
# genügt nicht (node meldet auch technische Fehler mit 1): maßgeblich ist der Bericht, den browser-vergleich.js prüft.
set -u
H=$1; CODEX=$2; AUS=$3
HIER=$(cd "$(dirname "$0")" && pwd); WURZEL=$(cd "$HIER/../.." && pwd)
LAUF1=${4:-$WURZEL/docs/daten/bughunt-wiederholung/lauf1/browser/bericht.json}
B="$CODEX/auswertung/bughunt-20261107/browser.cjs"; status=0
mkdir -p "$AUS"
# Frische Ausgabe: Reste früherer Läufe entfernen, damit nie ein alter Bericht gelesen wird
rm -rf "$AUS/browser" "$AUS/browser-konsole.txt" "$AUS/browser-exit.txt" "$AUS/browser-selbsttest.txt" "$AUS/browser-vergleich.txt"
mkdir -p "$AUS/browser"
echo "== browser-selbsttest"
node "$B" --selftest > "$AUS/browser-selbsttest.txt" 2>&1 || { s=$?; echo "   Exit $s: Selbsttest fehlgeschlagen"; status=1; }
tail -n 3 "$AUS/browser-selbsttest.txt"
START=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
echo "== browser (Exit 0 oder 1 gültig, jeder andere Exit technischer Fehler; Gültigkeit entscheidet der Bericht)"
node "$B" --html "$H" --aus "$AUS/browser" > "$AUS/browser-konsole.txt" 2>&1; be=$?
echo "Exit $be" > "$AUS/browser-exit.txt"; echo "   Exit $be"
if [ "$be" != 0 ] && [ "$be" != 1 ]; then echo "   technischer Fehler (Exit $be): kein Urteil"; status=1; fi
echo "== browser-vergleich"
node "$HIER/browser-vergleich.js" --eigen "$AUS/browser/bericht.json" --lauf1 "$LAUF1" --html "$H" --seit "$START" > "$AUS/browser-vergleich.txt" 2>&1 || { s=$?; echo "   Exit $s"; status=1; }
tail -n 3 "$AUS/browser-vergleich.txt"
exit $status
