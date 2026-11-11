# Diagonalprüfung Stufe 1: Sicherung des Uploads

Quelle: von Hazeberry bereitgestellte `diagonal-pruefung-stufe1.zip`, übernommen am 11.11.2026. Ein bestimmter Actions-Lauf ist aus dem Upload nicht belegt.

Die ZIP bleibt unverändert und enthält alle 11 gelieferten Dateien. `bericht.md` und `schritt0.md` liegen zusätzlich unverändert zum Lesen hier. `manifest.json` nennt Größe und SHA-256 der ZIP und aller enthaltenen Dateien; `SHA256SUMS` gilt relativ zu diesem Verzeichnis.

Geprüft wurden ZIP-Integrität (CRC) und die Syntax aller JSON- und JSONL-Dateien. Die gespeicherten Ergebnisdateien nennen je 7881 Stellungen und drei verschiedene Prozess-IDs. Der Bericht meldet gültig und alle Kontrollen bestanden. Das ist eine Prüfung der gelieferten Dateien, keine unabhängige Neuberechnung oder erneute Engine-Prüfung.

Laut Bericht sind 658 von 2192 Schlussstellungen (30,0 %) und 1060 von 5120 Vorschau-Stellungen (20,7 %) betroffen. Betroffenheit sagt nichts über Richtigkeit oder Verbesserung. Stufe 2 und 3 wurden hier nicht ausgeführt.

```sh
sha256sum -c SHA256SUMS
unzip -t diagonal-pruefung-stufe1.zip
unzip diagonal-pruefung-stufe1.zip -d entpackt
```

Die Sicherung ändert keine Spielparameter und erteilt kein Go für weitere Läufe.
