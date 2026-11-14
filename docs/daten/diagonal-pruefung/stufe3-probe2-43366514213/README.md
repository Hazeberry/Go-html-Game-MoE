# Diagonalprüfung Stufe 3 – zweite Probe (sechs Unterlagen)

Zweite Probe nach §18.6 von `docs/diagonalpruefung-vorabfestlegung.md`: sechs Unterlagen zur Prüfung der präzisierten Anleitung und für die Zeitschätzung. **Die Urteile werden nicht ausgewertet**, ein Bogen zum Probe-Paket wird von `auswerten` abgelehnt (anderes Manifest). Gesichert am 14.11.2026. Einordnung in §18.7.

## Probe-Paket

Artefakt des [Actions-Laufs 43366514213](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/43366514213) (Workflow `diagonal-pruefung-stufe3.yml`, Modus `probe`, `probe_anzahl` 6, `probe_ziehung` 1, 13.11.2026, Go von Hazeberry).

- Commit: `e2a5d119aa5241ca1c000e180ba4bf002cbcba83` (Merge von #313)
- Artefakt: `probe-paket`, ID `14011325020`. Die Datei hier ist die von Hazeberry hochgeladene Kopie; ihre SHA-256 ist gleich dem Digest des Artefakts (`35e3e262…`). Die Sitzung, die sichert, konnte das Artefakt nicht selbst herunterladen.
- `manifestSha256`: `a6a4c945de8800744423ed9733c9aa2b1d77332e306e5d9fd61b2fe102849fce`; Unterlagen U-2173a8, U-15d04c, U-351c82, U-49f79f, U-dea5f6, U-f4bb91 (alle Art V, nach Zug 251 oder 301)

## Bogen

| Datei | Herkunft | Zeit |
|---|---|---|
| `bogen-sitzung3.json` | frische KI-Sitzung, die die erste Probe nicht gesehen hat; laut Dateiname des hochgeladenen Pakets GLM 5.3 (nicht weiter geprüft). Hilfsmittel laut Bogen: Textanzeige, Zeitmessung, Schemaprüfung, keine Go-Software | im Bogen (`dauerSekunden`, gemessen mit `time.monotonic()`, nur Lesen und Urteilen): 24,8 / 17,0 / 44,6 / 24,7 / 18,2 / 39,3 s |

Die Datei ist die von Hazeberry hochgeladene, unverändert.

## Bei der Sicherung geprüft

- `node auswertung/endspiel/diagonal-pruefung-stufe3.js pruefen --bogen bogen-sitzung3.json --manifest manifest.json` (Manifest aus dem ZIP): Exit 0.
- Prüfsummen aller Paketdateien gleich dem Manifest; `unzip -t` fehlerfrei.
- Nicht geprüft: die fachliche Richtigkeit irgendeines Urteils.

## Prüfung

```sh
sha256sum -c SHA256SUMS
unzip -t probe-paket.zip
```
