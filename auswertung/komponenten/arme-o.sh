#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Die Arme der Messung „Muster ohne Vorgabe“ (docs/muster-ohne-vorgabe.md §2).
# Aufbau wie arme.sh, auch für auswertung/dagger/selbstspiel-spielen.sh
# (ARME_DATEI). Gespielt wird ohne Vorgabe (VORGABE=0 in spielen.sh); die
# Schalter wirken nur dann. MW0 ist erkundend und wird nicht beurteilt.
ARM_REIHE=(D M0 M50 MW0)
declare -A ARM_KI=(
  [D]=""
  [M0]="musterOhneVorgabe=0"
  [M50]="musterOhneVorgabe=0.5"
  [MW0]="musterWeissOhneVorgabe=0"
)
