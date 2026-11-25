# Stufe G: formale Partie auf dem Galaxy A17 vom 25.11.2026

Formale Stufe G nach `docs/skalierung-heute-vorabfestlegung.md` §4, §14.1 und §16: die erste Partie nach dem Merge
des Werkzeug-PR #387 (14:53:29 UTC, Commit `98aa1ad`) und Hazeberrys Go. Territory-Partie, KI Weiß auf Schwer,
458 Züge, 228 KI-Steinzüge. Fehlerbericht exportiert um 20:05:28 UTC.

**Ergebnis: gültig. S = 2618,5 Simulationen, N = 2600, K3 = 2600 → 5200.**

| Datei | Inhalt |
|---|---|
| `bericht.json` | der Fehlerbericht (🐞) im Wortlaut, wie Hazeberry ihn in die Sitzung eingefügt hat |
| `bereitstellungen.json` | die Pages-Bereitstellungen zwischen Merge und Export: genau eine (Lauf 350, `98aa1ad`), mit den Prüfsummen ihrer Engine-Blöcke |
| `arbeitspunkt-bericht.md` | Ausgabe von `auswertung/arbeitspunkt.js` auf diesen Dateien |

**Herkunft von `bericht.json`:** Der Text ist nicht abgetippt, sondern maschinell aus dem Protokoll der Sitzung
übernommen. Nur Leerraum am Anfang und Ende ist entfernt und ein Zeilenumbruch angehängt. Die Datei ist gültiges JSON.
Ob der Text beim Einfügen gegenüber dem Export auf dem Gerät verändert wurde, lässt sich nicht prüfen. Die Prüfungen
unten sprechen dagegen.

**Plausibilität:** In allen 228 KI-Steinzügen gilt `gesamtMs = vorMs + sucheMs + nachMs`, eine Identität der Engine.
`msProSim` passt auf die Rundung genau zu `sucheMs` / Simulationen. `netzMs ≤ vorMs` und `dauerMs ≥ gesamtMs` gelten
überall. Die Simulationen im `zugprotokoll` stimmen in allen 228 Zügen mit `kiDiagnose` überein. Der
Parameter-Schnappschuss (164 Schlüssel) ist identisch mit dem der Referenzpartie
([`../referenz-20261125/params.json`](../referenz-20261125/params.json)).

**Gerät (Notiz von Hazeberry, §4.1):** Galaxy A17, Chrome 158.0.8127.42, V8-Optimierer an, keine Ausnahme für eine
Website. Das Bildschirmfoto der Einstellung von 19:32 UTC liegt hier nicht. Der `userAgent` belegt die Hauptversion
158.

**Nachrechnen:**

```
git show 98aa1ad:index.html > stand.html
node auswertung/arbeitspunkt.js docs/daten/skalierung-heute/stufe-g-20261125/bericht.json --html stand.html \
     --seit 2026-11-25T14:53:29Z \
     --bereitstellungen docs/daten/skalierung-heute/stufe-g-20261125/bereitstellungen.json --markdown
```
