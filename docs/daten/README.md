# Hash-Listen der Messläufe

Je Lauf ein kleiner Fingerabdruck statt des Rohdumps (`pilot-benson-defense.md`,
§14.4): der Befehl, `params_hash`, je Partie der Sieger (`S`/`W` = Farbe) und
der `final_board_hash`. Die Rohdumps selbst sind nicht aufgehoben — mit
`mctsFixedSims` erzeugt derselbe Befehl auf demselben Commit Zug für Zug
dieselben Partien.

Eine Wiederholung prüfen:

```bash
node ab-harness.js <Befehl aus der Liste> --roh neu.jsonl
node auswertung/hashliste.js neu.jsonl --pruefe docs/daten/<lauf>.json
```

Weicht eine Partie ab, stimmt der Commit nicht, oder die Reproduzierbarkeit
ist gebrochen. Im Paarmodus gilt das nicht (Errata E7); alle Läufe hier sind
im Standardmodus gefahren.
