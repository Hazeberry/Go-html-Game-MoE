#!/bin/bash
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
# Fuego (https://fuego.sourceforge.net, LGPL 3) als zweiten Gegner neben GNU Go
# bauen (docs/fuego.md). Fuego liegt nicht im Repo und nicht als Ubuntu-Paket
# vor; das Skript lädt einen festen Stand und baut ihn:
#   svn      Stand r2038 des Trunks (10.12.2019)
#   tarball  Version 1.1 (13.03.2011), Prüfsumme fest; baut nicht mit dem
#            Boost von Ubuntu 24.04 („reference to ‘mutex’ is ambiguous“,
#            docs/fuego.md §4), bleibt nur zum Nachvollziehen
# <std> ist der C++-Standard für den Compiler (z. B. gnu++14).
# Voraussetzung (Ubuntu): build-essential autoconf automake libtool subversion
# libboost-all-dev.
#
# Aufruf: bash auswertung/fuego/bauen.sh <svn|tarball> <std> <zielordner>
set -euo pipefail
quelle=${1:?Quelle fehlt (svn oder tarball)}; std=${2:?C++-Standard fehlt}; ziel=${3:?Zielordner fehlt}
REV=2038
TAR_SHA=c61d18293670c3cde8cc8b7b28ae037a85a4b8018827f2a0f93e34b165bc16ce
case "$std" in gnu++11|gnu++14|gnu++17|c++11|c++14|c++17) ;; *) echo "unbekannter Standard: $std" >&2; exit 2;; esac
case "$quelle" in svn|tarball) ;; *) echo "unbekannte Quelle: $quelle" >&2; exit 2 ;; esac
# Zielordner absolut machen, bevor das Skript ins Bauverzeichnis wechselt
mkdir -p "$ziel"; ziel=$(cd "$ziel" && pwd)
arbeit=$(mktemp -d)
case "$quelle" in
  svn)
    svn export -q -r "$REV" https://svn.code.sf.net/p/fuego/code/trunk "$arbeit/fuego" ;;
  tarball)
    curl -fsSL -o "$arbeit/fuego.tar.gz" "https://sourceforge.net/projects/fuego/files/fuego/1.1/fuego-1.1.tar.gz/download"
    echo "$TAR_SHA  $arbeit/fuego.tar.gz" | sha256sum -c -
    tar -xzf "$arbeit/fuego.tar.gz" -C "$arbeit"
    mv "$arbeit/fuego-1.1" "$arbeit/fuego" ;;
  *) echo "unbekannte Quelle: $quelle" >&2; exit 2 ;;
esac
cd "$arbeit/fuego"
[ -x configure ] || autoreconf -fi
./configure --quiet --with-boost-libdir=/usr/lib/x86_64-linux-gnu CXXFLAGS="-O2 -std=$std -w -DNDEBUG"
make -j"$(nproc)" -s
cp fuegomain/fuego "$ziel/fuego"
[ -f book/book.dat ] && cp book/book.dat "$ziel/book.dat" || true
echo "Fuego gebaut: $quelle, $std → $ziel/fuego"
