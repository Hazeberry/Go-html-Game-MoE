#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Partien des Vergleichs mit der PWA spielen (docs/pwa-vergleich.md,
# .github/workflows/pwa-vergleich.yml). N ist die aktuelle Engine
# (index.html), der Gegner die KI aus vergleich/pwa-index.html oder, für die
# Gleichstandsprobe, noch einmal index.html, über gtp-ki.js.
#
#   M1   N gegen die PWA, beide 120 Simulationen, Seed 223
#   M2   N gegen die PWA, beide 1,8 s je Zug, Seed 224
#   K1   N gegen N, beide 120 Simulationen, Seed 225
#
# Alle: ohne Vorgabe (Farben wechseln je Partie, Komi 7,5), Aufgabe beider
# KIs aus, bis 600 Züge, GNU Go Stufe 1 zählt und schätzt nach Zug 40, 80,
# 120 und 200. GNUGO nennt GNU Go (Standard /usr/games/gnugo), SEED ändert
# den Seed (für die Kontrolle nicht nötig: sie spielt M1 mit Seed 223 nach).
#
# Aufruf: bash auswertung/pwa-spielen.sh <M1|M2|K1> <von> <anzahl> <roh.jsonl>
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
wurzel=$(cd "$here/.." && pwd)
teil=${1:?Teil fehlt}; von=${2:?Beginn fehlt}; anzahl=${3:?Anzahl fehlt}; roh=${4:?Ausgabedatei fehlt}
for v in "$von" "$anzahl"; do case "$v" in ''|*[!0-9]*) echo "keine Zahl: '$v'" >&2; exit 2;; esac; done
case "$teil" in
  M1) seed=223; ki="mctsFixedSims=120,resignEnabled=0"; gegner="$wurzel/vergleich/pwa-index.html" ;;
  M2) seed=224; ki="mctsFixedSims=0,aiTimeBudget=1800,resignEnabled=0"; gegner="$wurzel/vergleich/pwa-index.html" ;;
  K1) seed=225; ki="mctsFixedSims=120,resignEnabled=0"; gegner="$wurzel/index.html" ;;
  *) echo "Teil M1, M2 oder K1: '$teil'" >&2; exit 2 ;;
esac
seed=${SEED:-$seed}
case "$seed" in ''|*[!0-9]*) echo "SEED keine Zahl: '$seed'" >&2; exit 2;; esac
mkdir -p "$(dirname "$roh")"
rm -f "$roh"
node "$wurzel/gnugo-duell.js" --gegner ki --gegner-html "$gegner" --gegner-ki "$ki" \
  --gnugo "${GNUGO:-/usr/games/gnugo}" --partien "$anzahl" --von "$von" --seed "$seed" --stufe 1 --vorgabe 0 \
  --maxzuege 600 --schaetzung 40,80,120,200 --gnugo-aufgabe 0 --ki "$ki" --roh "$roh"
