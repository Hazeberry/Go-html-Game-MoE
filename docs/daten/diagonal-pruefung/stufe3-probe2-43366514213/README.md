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
| `bogen-sitzung3.json` | frische KI-Sitzung „Astra“ (nach Angabe von Hazeberry), die die erste Probe nicht gesehen hat. **Von Hazeberry nicht als gültig gewertet:** rund 4 Minuten Wanduhrzeit für alle sechs Unterlagen, drei Aufgaben nicht wirklich untersucht. Hilfsmittel laut Bogen: Textanzeige, Zeitmessung, Schemaprüfung, keine Go-Software | im Bogen (`dauerSekunden`, gemessen mit `time.monotonic()`, nur Lesen und Urteilen): 24,8 / 17,0 / 44,6 / 24,7 / 18,2 / 39,3 s |

| `bogen-sitzung4.json` | weitere frische KI-Sitzung mit GLM 5.3 auf Einstellung Max (laut Hazeberry), nur das Probe-Paket und der Auftrag; von Hazeberry als gültig gewertet. Wanduhrzeit rund 2 Stunden (Hazeberry; der Zähler stand im letzten Screenshot bei 92 min, rund 355.000 Token). Hilfsmittel laut Bogen: eigenes Python-Skript zum Nachspielen, Freiheitenzählen und Durchspielen selbst gewählter Zugfolgen, keine Suche, keine Go-Software | im Bogen (`dauerSekunden`, Unix-Uhr je Unterlage): 1065 / 361 / 947 / 325 / 586 / 176 s |
| `bogen-sitzung5.json` | Claude Sonnet 5.5, Einstellung Mittel (laut Dateiname und Hazeberry), nur das Probe-Paket und der Auftrag. Hilfsmittel laut Bogen: eigenes Skript zum Nachspielen, Brettanzeige, Freiheitenzählen und Legalitätsprüfung, keine Go-Software, keine Suche, kein Internet | im Bogen (`dauerSekunden`, Wanduhr im Container, einschließlich Nachdenken und teils Wartezeit auf Rückfragen): 513 / 68 / 55 / 93 / 319 s, für U-f4bb91 keine brauchbare Zeit (Messung enthielt eine lange Pause) || `bogen-sitzung6.json` | Astra, Einstellung „hoch“ in Codex (laut Hazeberry), nur das Probe-Paket und der Auftrag; zweiter Lauf von Astra, getrennt von `bogen-sitzung3.json` (dort Einstellung nicht angegeben). Hilfsmittel laut Bogen: eigenes mechanisches Python-Skript zum Nachspielen, Brettanzeige, Freiheitenzählen und Prüfen gewählter Zugfolgen, keine Suche, keine Go-Software, keine externen Quellen | im Bogen (`dauerSekunden`, UTC-Uhr, einschließlich mechanischer Prüfungen und Zwischenmeldungen): 131 / 80 / 112 / 117 / 136 / 224 s |


`bogen-sitzung3.json` ist die von Hazeberry hochgeladene Datei, unverändert. `bogen-sitzung6.json` ist die von Hazeberry hochgeladene Datei (Inhalt unverändert, Formatierung neu); sein Begleittext („Alle sechs Unterlagen sind enthalten, mit gemessener Bearbeitungszeit. Der Bogen ist schema-validiert; drei nicht abschließend geklärte Fälle sind als nicht_entscheidbar begründet.“) ist hier vollständig wiedergegeben. `bogen-sitzung5.json` ist die von Hazeberry hochgeladene Datei (Inhalt unverändert, Formatierung neu); `protokoll-sitzung5.txt` ist der Begleittext, den Hazeberry dazu kopiert hat. `bogen-sitzung4.json` ist aus dem Chat-Verlauf gespeichert, den Hazeberry hochgeladen hat (Inhalt unverändert, Formatierung neu); der ganze Verlauf liegt als `protokoll-sitzung4.txt` bei.

**Korrektur (14.11.2026):** In der ersten Fassung dieser Datei und in §18.7 stand, `bogen-sitzung3.json` stamme „laut Dateiname“ von GLM 5.3. Der Dateiname gehörte zum hochgeladenen Probe-Paket, nicht zum Bogen. Nach Angabe von Hazeberry ist `bogen-sitzung4.json` die GLM-Probe und `bogen-sitzung3.json` die von Astra (14.11.2026).

## Bei der Sicherung geprüft

- `node auswertung/endspiel/diagonal-pruefung-stufe3.js pruefen --bogen … --manifest manifest.json` (Manifest aus dem ZIP): Exit 0 für `bogen-sitzung3.json`, `bogen-sitzung4.json`, `bogen-sitzung5.json` und `bogen-sitzung6.json`.
- Prüfsummen aller Paketdateien gleich dem Manifest; `unzip -t` fehlerfrei.
- Nicht geprüft: die fachliche Richtigkeit irgendeines Urteils.

## Prüfung

```sh
sha256sum -c SHA256SUMS
unzip -t probe-paket.zip
```
