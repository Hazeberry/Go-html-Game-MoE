# Stufe 2: K3 auf dem heutigen Default, 25./26.11.2026

Stufe 2 nach `docs/skalierung-heute-vorabfestlegung.md` §7 und §18. Es liefen 123 Teilläufe über `ab-harness.yml` auf
`claude/skalierung-stand` (Commit `98aa1ad`), je 10 Partien, zusammen 1230 Partien: Seeds 11260001 bis 11260123,
Run-Nummern 192 bis 314. Gestartet wurden sie ab dem 25.11.2026 um 23:38 UTC in Wellen, alle endeten erfolgreich, der
letzte am 26.11.2026 um 10:08 UTC. Der Bericht kam aus `skalierung-bericht.yml`, Lauf 45800124437, um 10:20 UTC auf
`main` (`06533a7`).

Arme: A `mctsFixedSims=2600,resignEnabled=0`, B `mctsFixedSims=5200,resignEnabled=0`. Zuglimit 600, Rohdump an,
Standardmodus (nicht gepaart), Komi 7,5.

**Ergebnis: gültig.** K3 (2600 → 5200) 577 : 653, 46,9 % [44,1 %; 49,7 %], p = 0,0324, −21,5 Elo [−41,3; −1,8]:
„Die doppelte Suche verliert nachweisbar.“ Nach §5.3 ist das zuerst ein Verdacht auf einen Aufbaufehler. Die Deutung
ist offen; die Aufbauprüfung steht in `docs/skalierung-aufbaupruefung-vorabfestlegung.md`.

| Datei | Inhalt |
|---|---|
| `skalierung-bericht.md` | der Bericht des Werkzeugs im Wortlaut |
| `laeufe.csv` | die 123 Teilläufe: Seed, Lauf-ID, Artefakt-ID, Artefaktname, SHA-256 und Größe des Artefakts; die letzte Zeile (ohne Seed) ist der Berichtslauf |
| `k3-partien.csv` | die 1230 Partien einzeln, Spalten unten |

**Herkunft von `skalierung-bericht.md`:** Der Text stimmt Zeichen für Zeichen mit dem Job-Log des Berichtslaufs
überein, wenn man die Zeitstempel am Zeilenanfang entfernt (geprüft am 27.11.2026).

**Herkunft von `laeufe.csv`:** Die Zuordnung von Lauf zu Seed steht im Artefaktnamen
(`ab-harness-10p-seed<Seed>-run<Nummer>`). Die SHA-256 ist die Prüfsumme, die GitHub für das Artefakt (ZIP) angibt.
Geprüft am 27.11.2026: Die 123 Lauf-IDs stimmen mit den beim Start notierten überein; für drei Artefakte (Seed
11260001, Seed 11260123, Bericht) stimmt die Prüfsumme mit der Angabe von GitHub. Die Spalten weichen von
`../stufe-1-20261125/laeufe.csv` ab: Run-Nummer steckt im Namen, die Laufzeiten stehen im Bericht.

**Herkunft von `k3-partien.csv`:** aus den Artefakten der Teilläufe ausgelesen, außerhalb der Sitzung; das
Auslesewerkzeug liegt nicht im Repo. Die Spaltennamen entsprechen den Feldern je Partie im Ergebnis-JSON des Harness
(`raw.partien` in `ab-harness.js`), `final_board_hash` dem gleichnamigen Feld im Rohdump. Nachgezählt am 27.11.2026:
Siege, Farben, Partielängen und Simulationen ergeben die Werte des Berichts.

**Spalten** (gleich in `../stufe-1-20261125/k1-partien.csv` und `k2-partien.csv`):

| Spalte | Bedeutung |
|---|---|
| `seed`, `lauf_id` | Teillauf |
| `partie` | Nummer der Partie im Teillauf, ab 1. In ungeraden Partien ist A Schwarz (`ab-harness.js`, `aIsBlack = g % 2 === 0`). |
| `aIst` | Farbe von Arm A: `Schwarz` oder `Weiß` |
| `sieger` | Siegerarm: `A` oder `B` |
| `siegerFarbe` | Siegerfarbe: `S` oder `W` |
| `stand` | Endstand nach `finalScore` im Harness, Weiß mit Komi 7,5 |
| `zuege` | Zahl der Züge einschließlich Pässen |
| `simsA`, `simsB` | Simulationen je Entscheidung des Arms in dieser Partie, auf ganze Zahlen gerundet. Der Nenner zählt alle Entscheidungen; ein Pass zählt mit 0 Simulationen. |
| `dauerMin` | Laufzeit der Partie in Minuten, auf 0,01 gerundet |
| `final_board_hash` | SHA-256 über die 361 Bytes des Endbretts (0 leer, 1 Schwarz, 2 Weiß), ohne Totsteinbereinigung (`docs/pilot-benson-defense.md` §5.3) |

**Artefakte:** GitHub löscht sie am 23. und 24.02.2027. Aus einer Sitzung sind sie nicht herunterladbar. Die
vollständigen Laufarchive liegen zusätzlich außerhalb des Repos in den ZIP-Sicherungen aus §18; jede Kopie lässt sich
mit den Prüfsummen in `laeufe.csv` prüfen.

**Nachrechnen** (in Actions, solange die Artefakte bestehen): den Workflow „Skalierung-Bericht“ mit `stufe` 2,
`commit` `98aa1ad586c9de23f64ca76c26af1d7b199b7b3a`, `n` 2600, `partien_je_teil` 10, `vergleich_vorstufe` `669:1230`
und den 123 Lauf-IDs aus `laeufe.csv` starten.
