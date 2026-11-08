# Rohdatensicherung: Passregel-Vergleich, Stufe C

Gesichert am 08.11.2026 aus [Actions-Lauf 42331033107](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/42331033107), Quellencommit `7d57e2bf1826904be9c4e6f8a59164db632d032f`.

`bericht.zip` ist das unveränderte GitHub-Artefakt **bericht** (ID 13557498693, 511610 Bytes). Sein SHA-256 stimmt mit dem von GitHub gelieferten Digest überein:

```
0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08
```

Das Actions-Artefakt läuft am 05.02.2027 um 02:48:31 UTC ab. Diese im Git-Repository gespeicherte Kopie unterliegt nicht dieser Artefakt-Aufbewahrungsfrist.

## Inhalt und Integritätsprüfung

- 29 ZIP-Einträge, ZIP-Integritätsprüfung ohne Fehler.
- Stufe-A-Einheitenliste und Bericht.
- Alle 23 Ergebnispakete (`teile/teil-1.jsonl` bis `teil-23.jsonl`).
- 563 eindeutige Einheiten und 563 eindeutige Ergebniszeilen; ihre Schlüssel stimmen vollständig überein.
- Ursprünglicher Hauptbericht und `zahlen.json` sowie Nachspiel-Kontrolle.

`manifest.json` nennt Quelle, Archivprüfsumme und Größe sowie SHA-256 und Größe jeder Datei im ZIP. `SHA256SUMS` prüft die hier abgelegten Dateien; die darin enthaltenen Pfade gelten relativ zu diesem Verzeichnis.

```sh
sha256sum -c SHA256SUMS
unzip -t bericht.zip
unzip bericht.zip -d entpackt
```

Es wurden nur Download, Dateiintegrität und Vollständigkeit geprüft. Keine Partien, Fortsetzungen oder Wirkungsauswertungen wurden neu gerechnet. Die Sicherung ändert weder die Ergebnisse noch die Gültigkeitsregeln oder den Spielcode. Der Ergebnisnachtrag steht in `docs/passregel-vergleich.md` §15; §16 dokumentiert diese Sicherung.
