#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Probe eines gebauten Fuego (docs/fuego.md §2), Ausgabe als Markdown:
#   1. Welche GTP-Befehle es kennt, die das Duell-Skript braucht.
#   2. Ob die Einstellungen greifen (ein Thread, feste Spielzahl, keine Aufgabe).
#   3. Zeit je Zug bei 1 000, 3 000 und 10 000 Spielen je Zug (20 Züge, 19×19,
#      sechs Vorgabesteine).
#   4. Ob zwei Läufe mit demselben Seed dieselben Züge ziehen, ohne und mit
#      deterministic_mode (docs/fuego.md §6).
#
# Aufruf: bash auswertung/fuego/probe.sh <pfad/zu/fuego>
set -euo pipefail
bin=${1:?Pfad zu fuego fehlt}
[ -x "$bin" ] || { echo "nicht ausführbar: $bin" >&2; exit 2; }
arbeit=$(mktemp -d)

# <spiele> <seed> <det>: det 1 schaltet deterministic_mode ein. Der Befehl
# legt selbst einen Thread, keine Uhr und kein Weiterverwenden des Baums fest,
# sperrt diese Parameter und setzt den Seed auf 1; deshalb folgt danach
# set_random_seed (GoUctCommands.cpp, CmdDeterministicMode).
einstellungen() {
  if [ "$3" = 1 ]; then
    cat <<GTP
uct_param_player max_games $1
uct_param_player ponder 0
uct_param_player resign_threshold 0
deterministic_mode
set_random_seed $2
GTP
  else
    cat <<GTP
uct_param_search number_threads 1
uct_param_player max_games $1
uct_param_player ignore_clock 1
uct_param_player reuse_subtree 0
uct_param_player ponder 0
uct_param_player resign_threshold 0
GTP
  fi
}
partie() {   # <spiele> <züge> <seed> <det>: Vorgabe 6, Weiß beginnt, abwechselnd genmove
  echo "boardsize 19"; echo "clear_board"; echo "komi 0.5"; echo "fixed_handicap 6"
  einstellungen "$1" "$3" "$4"
  local i f
  for i in $(seq 1 "$2"); do if [ $((i % 2)) -eq 1 ]; then f=w; else f=b; fi; echo "genmove $f"; done
  echo "list_stones black"; echo "final_score"; echo "quit"
}
zuege() { grep -Ei '^= ([A-HJ-T][0-9]{1,2}|pass|resign)$' "$1" | sed 's/^= //' | tr '\n' ' ' || true; }
# Fuego liest lange Optionen nur mit zwei Strichen (boost::program_options);
# mit einem Strich zeigt es die Hilfe und beendet sich ohne GTP (Lauf #2).
lauf() { "$bin" --srand "$1" --nobook --quiet < "$2" 2>> "$arbeit/stderr.txt"; }
abbruch() { echo; echo "**Abbruch:** $1"; echo; echo '```'; head -n 30 "$arbeit/stderr.txt"; echo '```'; exit 1; }

echo "## Fuego-Probe"
echo
printf 'name\nversion\nlist_commands\nquit\n' > "$arbeit/info.gtp"
lauf 1 "$arbeit/info.gtp" > "$arbeit/info.txt"
grep -q '^= ' "$arbeit/info.txt" || abbruch "Fuego antwortet nicht auf GTP"
echo "- Name und Version: $(grep '^= ' "$arbeit/info.txt" | head -2 | sed 's/^= //' | tr '\n' ' ')"
echo
echo "### Befehle, die das Duell-Skript braucht"
echo
for b in boardsize clear_board komi fixed_handicap play genmove final_score list_stones final_status_list uct_param_player uct_param_search gogui-analyze_commands; do
  if grep -qxE "(= )?$b" "$arbeit/info.txt"; then echo "- \`$b\`: ja"; else echo "- \`$b\`: **nein**"; fi
done
echo
echo "### Einstellungen"
echo
for det in 0 1; do
  { echo "boardsize 19"; einstellungen 1000 5 "$det"; echo "quit"; } > "$arbeit/einst$det.gtp"
  lauf 5 "$arbeit/einst$det.gtp" > "$arbeit/einst$det.txt"
  echo "deterministic_mode $det:"; echo; echo '```'; grep -v '^$' "$arbeit/einst$det.gtp"; echo '---'; grep -v '^$' "$arbeit/einst$det.txt"; echo '```'; echo
done
echo
echo "### Zeit je Zug (20 Züge, ein Thread, deterministic_mode)"
echo
echo "| Spiele je Zug | Sekunden je Zug | letzter Zug | final_score |"
echo "|---:|---:|---|---|"
for n in 1000 3000 10000; do
  partie "$n" 20 7 1 > "$arbeit/p$n.gtp"
  t0=$(date +%s.%N); lauf 7 "$arbeit/p$n.gtp" > "$arbeit/p$n.txt"; t1=$(date +%s.%N)
  zuege=$(grep -Eic '^= ([A-HJ-T][0-9]{1,2}|pass|resign)$' "$arbeit/p$n.txt" || true)
  letzt=$(grep -Ei '^= ([A-HJ-T][0-9]{1,2}|pass|resign)$' "$arbeit/p$n.txt" | tail -1 | sed 's/^= //' || true)
  score=$(grep '^[=?]' "$arbeit/p$n.txt" | tail -2 | head -1 || true)
  echo "| $n | $(awk -v a="$t0" -v b="$t1" 'BEGIN { printf "%.2f", (b - a) / 20 }') | $letzt ($zuege Züge) | \`$score\` |"
done
echo
echo "### Gleicher Seed, gleiche Züge?"
echo
echo "| deterministic_mode | Spiele je Zug | Seed 11 zweimal | Seed 11 gegen 12 | erster Unterschied (Zug) |"
echo "|---:|---:|---|---|---:|"
for det in 0 1; do for n in 1000 3000; do
  partie "$n" 40 11 "$det" > "$arbeit/r.gtp"; partie "$n" 40 12 "$det" > "$arbeit/s.gtp"
  lauf 11 "$arbeit/r.gtp" > "$arbeit/r1.txt"; lauf 11 "$arbeit/r.gtp" > "$arbeit/r2.txt"; lauf 12 "$arbeit/s.gtp" > "$arbeit/r3.txt"
  a=$(zuege "$arbeit/r1.txt"); b=$(zuege "$arbeit/r2.txt"); c=$(zuege "$arbeit/r3.txt")
  if [ "$a" = "$b" ]; then gl="**gleich**"; ab="–"; else gl="verschieden"
    ab=$(paste <(echo "$a" | tr ' ' '\n') <(echo "$b" | tr ' ' '\n') | awk -F'\t' '$1 != $2 { print NR; exit }'); fi
  if [ "$a" = "$c" ]; then sd="gleich (der Seed wirkt nicht)"; else sd="verschieden"; fi
  echo "| $det | $n | $gl | $sd | $ab |"
done; done
echo
echo "### Fehlerausgabe (Anfang)"
echo
echo '```'; head -n 30 "$arbeit/stderr.txt" || true; echo '```'
echo
echo "### Rohausgabe der ersten Partie (1 000 Spiele)"
echo
echo '```'; head -n 60 "$arbeit/p1000.txt"; echo '```'
