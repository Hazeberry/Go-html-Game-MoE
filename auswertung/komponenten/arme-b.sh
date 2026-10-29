#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme von Stufe B der Komponentenmessung (docs/komponenten-b.md §2).
# Aufbau wie arme.sh. Jeder Einzelarm schaltet auf dem Default D genau einen
# der sieben Zusätze ab, O7 alle sieben zusammen (Netz und Muster bleiben an).
# D und R0 werden nicht neu gespielt: Ihre Partien kommen aus Stufe A
# (docs/daten/komponenten/lauf1, Seed 220); sie stehen hier nur, damit
# spielen.sh --ki für alle Arme dieselbe Angabe liefert.
ARM_REIHE=(D R0 T0 W0 E0 P0 BE0 BF0 O7)
declare -A ARM_KI=(
  [D]=""
  [R0]="raveEnabled=0"
  [T0]="mctsTreeReuse=0"
  [W0]="wurzelFrisch=0"
  [E0]="endTieBreak=0"
  [P0]="mctsPriorSharp=0"
  [BE0]="bensonEval=0"
  [BF0]="bensonMoveFilter=0"
  [O7]="raveEnabled=0,mctsTreeReuse=0,wurzelFrisch=0,endTieBreak=0,mctsPriorSharp=0,bensonEval=0,bensonMoveFilter=0"
)
