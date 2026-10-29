#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Messung auf dem leeren Brett (docs/leeres-brett.md §2). Aufbau
# wie arme.sh. M0 und N0 wie in Stufe A, A80 wie in der Muster-Eröffnung; alle
# vier werden ohne Vorgabe neu gespielt (VORGABE=0 in spielen.sh).
ARM_REIHE=(D M0 N0 A80)
declare -A ARM_KI=(
  [D]=""
  [M0]="musterGewicht=0"
  [N0]="endspielNetz=0"
  [A80]="musterAb=80"
)
