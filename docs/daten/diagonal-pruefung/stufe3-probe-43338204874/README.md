# Diagonalprüfung Stufe 3 – Probe (drei Unterlagen)

Probe nach §10.4 und §18.1 Nr. 2 von `docs/diagonalpruefung-vorabfestlegung.md`: drei Unterlagen für Zeitschätzung und Brauchbarkeit. **Die Urteile werden nicht ausgewertet**, ein Bogen zum Probe-Paket wird von `auswerten` abgelehnt (anderes Manifest). Gesichert am 13.11.2026. Einordnung in §18.5.

## Probe-Paket

Unverändertes Original-Artefakt des [Actions-Laufs 43338204874](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/43338204874) (Run 1, Workflow `diagonal-pruefung-stufe3.yml`, Modus `probe`, 13.11.2026).

- Commit: `86d91507d54b6f658de46d7527aecb3c948519b9` (Merge von #311)
- Artefakt: `probe-paket`, ID `13997493363`, läuft am 11.02.2027 ab. Diese Git-Kopie bleibt erhalten.
- ZIP: 11.054 Bytes, SHA-256 gleich dem Digest des Artefakts (`4512cec7…`)
- `manifestSha256`: `37b3a59aceb45f5ad4535d8aa7407eaae6b7ad563785a1944e03093f1118bdf0`; Unterlagen U-6d01cf, U-f56b4d, U-8300dc

## Bögen und Zeiten

| Datei | Herkunft | Zeit |
|---|---|---|
| `bogen-sitzung1.json` | erste getrennte KI-Sitzung, nur das Paket | im Bogen (`dauerSekunden`, Selbstangabe): 60,2 / 29,4 / 25,8 s |
| `bogen-sitzung2.json` | zweite, frische KI-Sitzung, nur das Paket, mit eigenem Skript zum Nachspielen (keine Engine) | `zeiten-sitzung2.json`: 422 / 98 / 126 s (Wanduhrzeit inkl. Skriptläufe) |
| `bogen-luna.json` | Nachprüfung durch Luna nach Sicht auf Bogen 1; nach eigener Angabe **unvollständig** | nicht gemessen |

`bogen-sitzung1.json` und `zeiten-sitzung2.json`/`bogen-sitzung2.json` sind die von Hazeberry hochgeladenen Dateien, unverändert. `bogen-luna.json` ist aus dem von Hazeberry in den Chat kopierten Text gespeichert (Inhalt unverändert, Formatierung neu).

## Bei der Sicherung geprüft

- Alle drei Bögen bestehen `node auswertung/endspiel/diagonal-pruefung-stufe3.js pruefen` gegen das Manifest des Probe-Pakets (Exit 0).
- `unzip -t` des ZIP fehlerfrei; Prüfsummen der Paketdateien gleich dem Manifest.
- Nicht geprüft: die fachliche Richtigkeit irgendeines Urteils.

## Prüfung

```sh
sha256sum -c SHA256SUMS
unzip -t probe-paket.zip
```
