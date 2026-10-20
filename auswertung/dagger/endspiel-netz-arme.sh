#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Messung des Endspiel-Netzes im Spiel (docs/endspiel-netz.md §2).
# Aufbau wie parameter-arme.sh; parameter-spielen.sh und selbstspiel-spielen.sh
# lesen die Datei über ARME_DATEI ein.
ARM_REIHE=(A N)
declare -A ARM_KI=(
  [A]=""
  [N]="endspielNetz=0.5"
)
