#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Nachmessung zu mctsPriorSharp und der Messung von
# bensonDeathTransfer gegen GNU Go (docs/prior-nachmessung.md §2). Aufbau wie
# parameter-arme.sh; parameter-spielen.sh und selbstspiel-spielen.sh lesen die
# Datei über ARME_DATEI ein. name@N=wert gilt ab Zug N (gnugo-duell.js).
ARM_REIHE=(A S9 S15 S30 PH BT)
declare -A ARM_KI=(
  [A]=""
  [S9]="mctsPriorSharp=9"
  [S15]="mctsPriorSharp=15"
  [S30]="mctsPriorSharp=30"
  [PH]="mctsPriorSharp@120=9"
  [BT]="bensonDeathTransfer=1"
)
