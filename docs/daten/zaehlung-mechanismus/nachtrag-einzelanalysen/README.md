# Nachtrag: Einzelanalysen der beiden Gegenproben

Zu [`../../../zaehlung-mechanismus.md`](../../../zaehlung-mechanismus.md) §12 (08.11.2026). Keine Spieländerung, kein Actions-Lauf, kein GNU Go, kein Browser.

| Datei | Herkunft |
|---|---|
| `diagonalauge-je-stellung.txt`, `.json` | Ausgabe des Skripts `auswertung/zaehlung-mechanismus/diagonalauge-je-stellung.js` (Fassung im Scratchpad der Sitzung, siehe unten), aufgerufen mit `index.html` (SHA-256 `d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b`), dem entpackten Artefakt der Stufe C (`../../passregel-vergleich/stufe-c-42331033107/bericht.zip`, SHA-256 `0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08`), einem Verzeichnis für die Test-Kopie und dem Ausgabepfad der `.json` |
| `freiheitsverband-je-stellung.txt` | Ausgabe von `auswertung/zaehlung-mechanismus/freiheitsverband-je-stellung.js` auf `../gegenprobe-freiheitsverband.json` (gespeicherte Ergebnisse; nichts neu gerechnet) |
| `SHA256SUMS` | Prüfsummen dieser Dateien |

**Wichtig zur Herkunft von `diagonalauge-je-stellung.*`:** Die Ausgabe stammt aus dem Lauf des Skripts in der Sitzung (Datei im Arbeitsverzeichnis der Sitzung, Aufruf `node schritt1.js <index.html> <entpacktes Artefakt> <tmp> <aus.json>`).
Die im Repo abgelegte Fassung `diagonalauge-je-stellung.js` unterscheidet sich davon **nur im Lizenzkopf, im Kommentar und im `require`-Pfad** (`diff` am 08.11.2026 geprüft: der Rumpf ab `const [html, daten, tmp, aus]` ist identisch). Sie wurde **nach dem Ablegen nicht erneut ausgeführt**.
Die Ausgabedateien sind byteidentisch zu den Ausgaben aus der Sitzung.

```sh
sha256sum -c SHA256SUMS
```
