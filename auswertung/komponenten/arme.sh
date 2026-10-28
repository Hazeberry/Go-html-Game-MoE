#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme von Stufe A der Komponentenmessung (docs/komponenten.md §2). Aufbau
# wie parameter-arme.sh: ARM_KI nennt, was der Arm gegenüber dem Default
# ändert. B ist die reduzierte Engine: die neun Zusätze aus, alles andere
# (evaluateMove mit seinen Phasenbewertungen, gebietZug, deathTransfer,
# augenSchutz, leseVerzicht, passUnabwendbar) bleibt wie im Default.
ARM_REIHE=(D B N0 M0 NM0 R0)
declare -A ARM_KI=(
  [D]=""
  [B]="musterGewicht=0,endspielNetz=0,raveEnabled=0,mctsTreeReuse=0,wurzelFrisch=0,endTieBreak=0,mctsPriorSharp=0,bensonEval=0,bensonMoveFilter=0"
  [N0]="endspielNetz=0"
  [M0]="musterGewicht=0"
  [NM0]="endspielNetz=0,musterGewicht=0"
  [R0]="raveEnabled=0"
)
