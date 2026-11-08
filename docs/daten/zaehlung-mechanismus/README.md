# Diagnosezustand: Zählabweichung, Vorschau gegen GNU-Go-Tot-Liste, Bughunt gegen die eigene `index.html`

Ausgaben von `auswertung/zaehlung-mechanismus/lauf.sh` am 08.11.2026. Deutung und Grenzen: [`../../zaehlung-mechanismus.md`](../../zaehlung-mechanismus.md). **Keine Spieländerung, kein Actions-Lauf, kein GNU Go.**

## Herkunft

| | |
|---|---|
| Repo-Stand | `main` bei `3454039b375920fc77fe994797ff01cc70e22a41` |
| `index.html` | SHA-256 `d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b` |
| Rohdaten | `../passregel-vergleich/stufe-c-42331033107/bericht.zip`, SHA-256 `0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08` (nicht kopiert; `lauf.sh` prüft den Hash) |
| `browser.cjs` | `Hazeberry/codex` Commit `04a9287b3098055ea76be37e3685e009c1f7d45c` |
| Umgebung | Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12 |

## Dateien

| Datei | Inhalt (Teil im Doc) |
|---|---|
| `zaehl-liste.txt` | 16 Stellungen in 15 Einheiten mit Abweichung Fläche aus Tot-Liste gegen `final_score` (§5) |
| `mechanismus.txt`, `mech.json` | Typ A und B je Stellung mit Schutzgrund und Augenregionen; Kontrolle Test-Kopie gleich Original (§6) |
| `kennzahlen.txt` | Kennzahlen aus `mech.json` (§6.1, §6.2, §6.7) |
| `benson.txt`, `benson.json` | App-Benson gegen unabhängige Implementierung (§6.3) |
| `gegenprobe-freiheitsverband.txt`, `.json` | Gegenprobe ohne Verbandsbildung über gemeinsame Freiheiten (§6.4) |
| `gegenprobe-diagonalauge.txt`, `.json` | Gegenprobe mit Diagonalprüfung bei Ein-Punkt-Augen, mit Einzelliste der „nur App tot“-/„nur GNU tot“-Ketten in V (§6.6) |
| `falschesauge.txt` | Ein-Punkt-Augen nach der Diagonalregel (§6.5) |
| `browser/`, `browser-konsole.txt`, `browser-selbsttest.txt`, `browser-exit.txt`, `browser-vergleich.txt` | `browser.cjs` gegen die eigene `index.html` (erzeugt von `browser-teil.sh`, das alte Ausgaben vorher löscht), Gültigkeitsprüfung und Vergleich mit der Wiederholung (§4) |
| `SHA256SUMS` | Prüfsummen aller Dateien in diesem Verzeichnis |

```sh
sha256sum -c SHA256SUMS
```

Die Ausgaben sind bis auf die Browser-Bilder und Pixel-Hashes (nicht deterministisch, Doc §4) und Zeitstempel in `browser/bericht.json` reproduzierbar. Die Test-Kopien von `index.html`, die die Skripte erzeugen, liegen im Arbeitsverzeichnis und nicht hier.
