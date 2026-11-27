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
| `k1-partien.csv`, `k2-partien.csv` | die je 1230 Partien von K1 und K2 einzeln (nachgetragen mit §18) |

**Herkunft von `skalierung-bericht.md`:** Der Text ist maschinell aus dem Job-Log des Berichtslaufs übernommen,
nicht abgetippt. Nur die Zeitstempel am Zeilenanfang sind entfernt. Die Zahlen sind aus den Siegzahlen nachgerechnet:
Siegrate, Clopper-Pearson, Binomialtest, Elo, Fisher-Test und das Intervall für D stimmen.

**Herkunft von `laeufe.csv`:** Die Zuordnung von Lauf zu Seed stammt aus den Artefaktnamen
(`ab-harness-82p-seed<Seed>-run<Nummer>`), die Laufzeiten aus dem Bericht. Alle 30 Artefakte tragen den Commit
`98aa1ad`.

**Daten je Partie:** `k1-partien.csv` und `k2-partien.csv` enthalten je Partie Seed, Lauf-ID, Farbe von A, Sieger,
Endstand, Zugzahl, Simulationen je Entscheidung, Laufzeit und den Hash des Endbretts. Spalten und Herkunft beschreibt
[`../stufe-2-20261126/README.md`](../stufe-2-20261126/README.md); sie sind dort und hier gleich. Nachgezählt am
27.11.2026: Siege, Farben, Partielängen und Simulationen ergeben die Werte des Berichts, die Lauf-IDs passen zu
`laeufe.csv`. Die Tabelle, die §17.7 vorgeschlagen hat, liegt damit vor; sie kommt nicht aus dem Log des
Berichtswerkzeugs, sondern aus den Artefakten selbst.

Die vollständigen Artefakte (JSON, Rohdump mit Zugereignissen, Log) löscht GitHub am **23.02.2027**; aus einer
Sitzung sind sie nicht erreichbar (`docs/eval-streuung-vorabfestlegung.md` §14.4). Sie liegen zusätzlich außerhalb des
Repos in den ZIP-Sicherungen aus §18 der Festlegung. Mit den Prüfsummen in `laeufe.csv` lässt sich jede Kopie prüfen.

**Nachrechnen** (in Actions, Werkzeug auf `main`; die Werkzeugdateien sind gleich wie an `98aa1ad`): den Workflow
„Skalierung-Bericht“ mit `stufe` 1, `commit` `98aa1ad586c9de23f64ca76c26af1d7b199b7b3a`, `n` 2600 und den 30 Run-IDs
aus `laeufe.csv` starten, solange die Artefakte bestehen.
