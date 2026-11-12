# Diagonalprüfung, Stufe 1: Ergebnissicherung

Gesichert am 08.11.2026 aus der von Hazeberry bereitgestellten Datei
`diagonal-pruefung-stufe1.zip`. Das ZIP bleibt unverändert erhalten.
Herkunft: Artefakt `diagonal-pruefung-stufe1` (ID `13606944528`) des Actions-Laufs
`42456406985` (Workflow `diagonal-pruefung.yml`, `workflow_dispatch` auf `main`, 08.11.2026)
auf Commit `0887732170090390ce9aa28f08d954b550225830`. Die SHA-256 des ZIP ist gleich dem von
Actions gemeldeten Artefakt-Digest (Quellen: Actions-Metadaten und Job-Log, gelesen am
08.11.2026; Näheres in der Vorabfestlegung, §15.1). Die im Archiv enthaltenen
HTML-Prüfsummen stehen in `manifest.json`.

## Inhalt

- `bericht.md` und `bericht.json`: Bericht und Kontrollen, aus dem ZIP unverändert kopiert.
- `schritt0.md` und `schritt0.json`: Prüfdaten und Ausschlüsse, unverändert kopiert.
- ZIP: zusätzlich `stellungen.jsonl`, `alt.jsonl`, `testkopie.jsonl`, `neu.jsonl`,
  `betroffen.jsonl`, `ziehen.log` und `vergleichen.log`.
- `manifest.json`: SHA-256 und Größe des ZIP und aller elf Einträge,
  Ergebnisdateiköpfe und Zeilenzahlen.
- `SHA256SUMS`: Prüfsummen der hier abgelegten Dateien, relativ zu diesem Verzeichnis.

## Prüfung bei der Übernahme

ZIP-CRC, JSON-/JSONL-Lesbarkeit, eindeutige Stellungskennungen und die vollständige
Übereinstimmung der Kennungen in `stellungen`, `alt`, `testkopie` und `neu` geprüft:
je 7.881 Stellungen (2.192 S, 5.120 V, 563 Entwicklung, sechs Handpartien).
`betroffen.jsonl` enthält 1.718 eindeutige Kennungen aus dieser Stellungsmenge.
Die Ergebnisdateien enthalten zusätzlich jeweils eine Kopfzeile.

```sh
sha256sum -c SHA256SUMS
unzip -t diagonal-pruefung-stufe1.zip
unzip diagonal-pruefung-stufe1.zip -d entpackt
```

Bei dieser Übernahme wurden keine Engine-Rechnungen oder Messläufe wiederholt.
Die bestandenen fachlichen Kontrollen sind Angaben des gelieferten Berichts.
Stufe 1 beschreibt Betroffenheit, keine Verbesserung oder Richtigkeit.
Ergebnisnachtrag: [Vorabfestlegung, §15](../../../diagonalpruefung-vorabfestlegung.md#15-ergebnisnachtrag-stufe-1-08112026-korrigiert-11112026).
