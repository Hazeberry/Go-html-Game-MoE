# Diagonalprüfung Stufe 2 – zweiter Hauptlauf (gültig)

Unverändertes Original-Artefakt des [Actions-Laufs 43274198340](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/43274198340) (Run 3, Workflow `diagonal-pruefung-stufe2.yml`, `workflow_dispatch`, 12.11.2026), gesichert am 12.11.2026 aus dem von Hazeberry bereitgestellten Download.

- Commit: `f43fa4d65e8c90079266c2457e246fb5b0163dbb` (Merge von #304, mit der Korrektur des Image-Vergleichs)
- Modus: `haupt`, Paketgröße 50, `e2_entschieden` gesetzt
- Artefakt: `diagonal-pruefung-stufe2`, ID `13970480435`
- ZIP: 1.593.388 Bytes, SHA-256 `d3f92b964891a176aedf128e834138816cb92399b0edfa6fe2d1c4c263f49d95`, gleich dem Digest im Upload-Log des Laufs
- Das GitHub-Artefakt läuft am 10.02.2027 ab. Diese Git-Kopie bleibt erhalten.

## Inhalt (48 Einträge)

`bericht/bericht.json`, `bericht/bericht.md`, `bericht/auswahl-stufe3.json` (B1 und gezogene B2-Ketten für Stufe 3), `eingabe/plan/plan.json`, `eingabe/plan/teile.json` und `teile/teil-1.jsonl` bis `teil-43.jsonl` (je Paket ein Kopf mit Fassung, GNU-Go-Version und Runner-Image, dann eine Zeile je Stellung).

## Bei der Sicherung geprüft

- SHA-256 des ZIP gleich dem Upload-Digest aus dem Log; `unzip -t` meldet alle 48 Einträge fehlerfrei.
- Der gespeicherte Bericht: Urteil „gültig“, alle acht Kontrollen bestanden, 2.118 Stellungen in 43 Paketen (betroffen S 658 und V 1.060, Kontrolle je 200), 0 Ausfälle. Alle 2.118 Zeilen haben den Status `gueltig`.
- Die Paketköpfe nennen in allen 43 Paketen GNU Go 3.8 (Paket `gnugo 3.8-11build2`), dieselbe `index.html` (SHA-256 beginnt mit `3570ca10`) und die `captures`-Konvention „gefangen-von“. Die Runner-Images sind `20261101.360.1` (27 Pakete), `20261111.370.1` (12) und `20261111.127.1` (4); sie werden nur protokolliert.
- Die Zahlen des Berichts und der Umfang von `auswahl-stufe3.json` (B1 356 Ketten in 80 Stellungen, B2 60 aus 6.820 Kandidaten, zusammen 416 Unterlagen) stimmen mit dem Auswertungs-Log und mit `docs/diagonalpruefung-vorabfestlegung.md` §17.6 überein.
- Nicht geprüft: die Einzelwerte der Paketdateien gegen die Archive, die Engine-Rechnung. Das ist eine Sicherung, keine Neuberechnung.

Der Bericht beschreibt die Übereinstimmung mit GNU Gos Tot-Liste (Schicht A), nicht die Richtigkeit. Die Beurteilung (Stufe 3) steht aus. Die Sicherung erteilt keine Freigabe für weitere Läufe.

Der erste Hauptlauf (43197546660) war wegen der Runner-Image-Abweichung ungültig und ist getrennt gesichert (PR #305, dort „KEIN URTEIL“).

## Prüfung des Originals

```sh
sha256sum -c SHA256SUMS
unzip -t diagonal-pruefung-stufe2.zip
```
