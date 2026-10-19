#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Legt index.html für einen Lauf der Datenaggregation bereit
# (.github/workflows/endspiel-dagger.yml, docs/muster-endspiel-dagger.md §3):
# den Stand des Basis-Commits mit dem Schalter musterEndspiel und, wenn
# angegeben, eine andere Tabelle darin. Überschreibt index.html im
# Arbeitsverzeichnis, ohne etwas einzuchecken.
#
# Aufruf: bash auswertung/dagger/vorbereiten.sh <Basis-Commit> [tabelle.json] [Ziel]
set -euo pipefail
basis=${1:?Basis-Commit fehlt}
tabelle=${2:-}
ziel=${3:-index.html}
case "$basis" in ''|*[!0-9a-f]*) echo "Basis muss ein Commit-Hash sein: '$basis'" >&2; exit 2;; esac
git cat-file -e "$basis^{commit}"
# Nur Stände aus der Geschichte von main: kein Code von fremden Branches
git merge-base --is-ancestor "$basis" origin/main || { echo "Basis $basis ist kein Vorfahr von main" >&2; exit 2; }
git show "$basis:index.html" > "$ziel"
if [ -n "$tabelle" ]; then
  node auswertung/muster-endspiel-tabelle.js --einsetzen "$tabelle" --index "$ziel"
fi
grep -q '^const MUSTER_ENDSPIEL = {"' "$ziel" || { echo "$ziel enthält keine Tabelle MUSTER_ENDSPIEL (Basis ohne Schalter?)" >&2; exit 2; }
echo "index.html bereit: Basis ${basis:0:7}${tabelle:+, Tabelle $tabelle}"
