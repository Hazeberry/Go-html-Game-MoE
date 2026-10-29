#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Messung zur Baum-Übernahme (docs/baum-uebernahme.md §2).
# Aufbau wie arme.sh, auch für auswertung/dagger/selbstspiel-spielen.sh
# (ARME_DATEI). T0 schaltet die Baum-Übernahme ab; die frische Wurzel wirkt
# dann nicht mehr, weil sie nur einen übernommenen Baum betrifft.
ARM_REIHE=(D T0)
declare -A ARM_KI=(
  [D]=""
  [T0]="mctsTreeReuse=0"
)
