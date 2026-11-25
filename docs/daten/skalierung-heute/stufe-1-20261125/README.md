# Stufe 1: K1 und K2 auf dem heutigen Default, 25.11.2026

Stufe 1 nach `docs/skalierung-heute-vorabfestlegung.md` §5 und §17. Es liefen 30 Teilläufe über `ab-harness.yml`
auf `claude/skalierung-stand` (Commit `98aa1ad`), je 82 Partien, zusammen 2460 Partien. Gestartet wurden sie am
25.11.2026 um 20:21 UTC, alle endeten erfolgreich. Der Bericht kam aus `skalierung-bericht.yml`, Lauf 45719087322,
um 23:09 UTC.

**Ergebnis: gültig.** K1 (120 → 240) +28,3 Elo [+8,6; +48,1], K2 (240 → 480) +30,6 Elo [+10,8; +50,4]. Ein
Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (D = −2,3 Elo [−29,8; +25,3], p = 0,90).

| Datei | Inhalt |
|---|---|
| `skalierung-bericht.md` | der Bericht des Werkzeugs im Wortlaut |
| `laeufe.csv` | die 30 Teilläufe: Vergleich, Seed, Run-Nummer und -ID, Artefakt mit SHA-256 und Größe, Laufzeit, Ablaufdatum des Artefakts |

**Herkunft von `skalierung-bericht.md`:** Der Text ist maschinell aus dem Job-Log des Berichtslaufs übernommen,
nicht abgetippt. Nur die Zeitstempel am Zeilenanfang sind entfernt. Die Zahlen sind aus den Siegzahlen nachgerechnet:
Siegrate, Clopper-Pearson, Binomialtest, Elo, Fisher-Test und das Intervall für D stimmen.

**Herkunft von `laeufe.csv`:** Die Zuordnung von Lauf zu Seed stammt aus den Artefaktnamen
(`ab-harness-82p-seed<Seed>-run<Nummer>`), die Laufzeiten aus dem Bericht. Alle 30 Artefakte tragen den Commit
`98aa1ad`.

**Daten je Partie:** Sie liegen nur in den Artefakten der Läufe (JSON, Rohdump, Log). GitHub löscht sie am
**23.02.2027**. Aus einer Sitzung sind Artefakte nicht erreichbar (`docs/eval-streuung-vorabfestlegung.md` §14.4).
Mit den Prüfsummen in `laeufe.csv` lässt sich jede spätere Kopie prüfen. Der Vorschlag zur dauerhaften Sicherung
steht in §17.7 der Festlegung.

**Nachrechnen** (in Actions, Werkzeug auf `main`; die Werkzeugdateien sind gleich wie an `98aa1ad`): den Workflow
„Skalierung-Bericht“ mit `stufe` 1, `commit` `98aa1ad586c9de23f64ca76c26af1d7b199b7b3a`, `n` 2600 und den 30 Run-IDs
aus `laeufe.csv` starten, solange die Artefakte bestehen.
