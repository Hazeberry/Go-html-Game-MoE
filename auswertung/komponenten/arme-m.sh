#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Muster-Eröffnung (docs/muster-eroeffnung.md §2). Aufbau wie
# arme.sh, auch für auswertung/dagger/selbstspiel-spielen.sh (ARME_DATEI).
# A40 und A80 schalten die Muster erst ab Zug 40 bzw. 80 ein. D und M0
# werden nicht neu gespielt: Ihre Partien kommen aus Stufe A
# (docs/daten/komponenten/lauf1, Seed 220).
ARM_REIHE=(D M0 A40 A80)
declare -A ARM_KI=(
  [D]=""
  [M0]="musterGewicht=0"
  [A40]="musterAb=40"
  [A80]="musterAb=80"
)
