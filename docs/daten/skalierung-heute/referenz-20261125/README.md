# Vorher-Referenz: Partie auf dem Galaxy A17 vom 25.11.2026

**Keine formale Stufe G** (`docs/skalierung-heute-vorabfestlegung.md` §14): exportiert am 25.11.2026 um
13:16:46 UTC, vor dem Merge des Werkzeug-PR und ohne eigenes Go. Sie bleibt als Vorher-Referenz im Bericht.

Territory-Partie, KI Weiß auf Schwer, 578 Züge, 288 KI-Steinzüge. Hazeberry hat den Fehlerbericht (🐞) als Text in
die Sitzung gegeben; die Datei selbst liegt hier nicht.

| Datei | Inhalt |
|---|---|
| `diagnose.csv` | die 288 KI-Steinzüge aus `kiDiagnose`, Feld für Feld übertragen; `info` ist in Simulationen, Anteil, Feld und Q zerlegt |
| `params.json` | `reproduktion.params` des Berichts, wörtlich (164 Schlüssel) |
| `auszug-bauen.js` | baut daraus `bericht-auszug.json` (`node auszug-bauen.js`) |
| `bericht-auszug.json` | Auszug für `auswertung/arbeitspunkt.js`: `meta`, `kiDiagnose` (mit dem Pass bei Zug 578) und `reproduktion` ohne `board`, `histHashes` und `captures`; `brett` und `zugprotokoll` fehlen |
| `bereitstellungen.json` | die 16 Stände auf `main` zwischen dem Merge von #371 (23.11., 23:16:51 UTC) und dem Export, mit den Prüfsummen ihrer Engine-Blöcke |

**Prüfung der Übertragung:** In allen 288 Zeilen gilt `gesamtMs = vorMs + sucheMs + nachMs` (eine Identität der
Engine), und `msProSim` stimmt mit `sucheMs / Simulationen` auf die Rundung genau überein. Damit sind Simulationen,
Suchzeit und Zugfolge belegt. `netzMs ≤ vorMs` und `dauerMs ≥ gesamtMs` gelten ebenfalls in allen Zeilen. Nicht durch
eine Identität geprüft sind `budgetMs`, `nachrichtMs` und `anwendenMs`.

**Herkunft:** `index.html` ist auf `main` seit dem Merge von #371 unverändert; alle 16 Stände tragen die Prüfsummen
aus §6. Der Parameter-Schnappschuss enthält `evalStreuung`, das es erst seit #371 gibt.
