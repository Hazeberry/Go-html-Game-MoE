#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Dosis des Endspiel-Netzes (docs/netz-dosis.md §2). Aufbau wie
# parameter-arme.sh.
ARM_REIHE=(A L8 T8)
declare -A ARM_KI=(
  [A]=""
  [L8]="endspielNetz=0.8"
  [T8]="endspielNetzTop=8"
)
