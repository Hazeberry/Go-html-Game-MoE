#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Parameter-Reihe (docs/parameter-reihe.md §2). Wird von
# parameter-spielen.sh und parameter-ergebnis.sh eingelesen (source); die
# Reihenfolge ist die der Tabelle im Dokument. ARM_KI[arm] sind die Parameter,
# die der Arm gegenüber dem Default ändert (Option --ki von gnugo-duell.js);
# für Arm A bleibt der Eintrag leer.
ARM_REIHE=(A N RAUS R30 R3000 S0 S1 S9 B0 B24 P300 PNIE)
declare -A ARM_KI=(
  [A]=""
  [N]="passMinMc120=-1000,passMinMc150=-1000"
  [RAUS]="raveEnabled=0"
  [R30]="raveK=30"
  [R3000]="raveK=3000"
  [S0]="mctsPriorSharp=0"
  [S1]="mctsPriorSharp=1"
  [S9]="mctsPriorSharp=9"
  [B0]="phaseBlendWidth=0"
  [B24]="phaseBlendWidth=24"
  [P300]="passMinMc80=300"
  [PNIE]="passMinMc80=-50,passMinMc120=-50,passMinMc150=-50"
)
