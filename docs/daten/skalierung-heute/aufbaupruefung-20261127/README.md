# Aufbauprüfung K3, Teil 1c und Teil 3, 27.11.2026

Teil 1c nach `docs/skalierung-aufbaupruefung-vorabfestlegung.md` §1 und §5: Hat die Suche je Arm und Farbe die
festgelegte Simulationszahl übernommen? Workflow `k3-uebergabe.yml`, Lauf 46002282339, auf `main` (`d3a5767`), mit
den 123 Lauf-IDs aus `../stufe-2-20261126/laeufe.csv` und dem Messcommit `98aa1ad`. Es wurde keine Partie gespielt.

**Ergebnis: gültig, kein Aufbaufehler gefunden.**

| Datei | Inhalt |
|---|---|
| `k3-uebergabe.md` | Teil 1c: der Bericht von `auswertung/k3-uebergabe.js` im Wortlaut |
| `k3-diagnose.md` | Teil 3: der Bericht von `auswertung/k3-diagnose.js` im Wortlaut (Lauf 46048978573, Job 140675270631, `main` `950c504`) |

**Herkunft:** maschinell aus dem Job-Log des Laufs (Job 140516703833) übernommen, Zeitstempel am Zeilenanfang
entfernt. Die Zeilen der Tabelle sind nachgerechnet: Steinzüge plus Pässe ergeben je Zeile die Entscheidungen.

**Nachrechnen** (in Actions, solange die K3-Artefakte bestehen, bis 23./24.02.2027): den Workflow „K3-Übergabe“ mit
den 123 Lauf-IDs aus `../stufe-2-20261126/laeufe.csv` und `commit` `98aa1ad586c9de23f64ca76c26af1d7b199b7b3a` starten.

**Teil 3** (§3 und §7 der Festlegung): Workflow `k3-diagnose.yml`, Lauf 46048978573, gültig, beschreibend. Der Bericht
ist ebenso maschinell aus dem Job-Log übernommen, Zeitstempel entfernt, ohne die Zeile mit der Dauer.

`k3-diagnose-partien.csv` (1230 Partien) stammt aus dem Artefakt `k3-diagnose` des Laufs (Artefakt-ID 15224780341, Digest
`5c68053d61f0e278f9d257edf752afe79149cd3f2b1d50e7476781f7016299df`). Hazeberry hat es heruntergeladen und in die Sitzung
gegeben; die ZIP selbst habe ich nicht gesehen, der Digest gilt für sie. Die Datei ist mit dem Bericht abgeglichen: Der
Bericht aus der Datei des Artefakts ist zeichengleich mit dem aus dem Job-Log, und alle Tabellen sind aus der CSV
nachgezählt (siehe §7 der Festlegung). Die Prüfsummenliste des Artefakts (`pruefsummen.tsv`) ist mit
`../stufe-2-20261126/laeufe.csv` in allen 123 Zeilen gleich und liegt deshalb nicht noch einmal hier.

| Spalte | Bedeutung |
|---|---|
| `seed`, `partie` | wie in `../stufe-2-20261126/k3-partien.csv` |
| `zuege` | Zahl der Züge einschließlich Pässen |
| `armSchwarz`, `armWeiss` | Arm, der die Farbe spielt (`A` 2600, `B` 5200 Simulationen) |
| `verliererArm`, `verliererFarbe` | Verlierer der Partie nach dem Endstand der Messung (`S` Schwarz, `W` Weiß) |
| `s_gnugo100`, `…200`, `…300` | `estimate_score` von GNU Go nach Zug 100, 200, 300, in Punkten aus Sicht von Schwarz (negativ: Weiß vorn); leer, wenn die Partie kürzer ist |
| `w_oben…`, `w_unten…` | die Schranken, die GNU Go dazu ausgibt, aus Sicht von Weiß (der Wert aus Sicht von Weiß, also `−s_gnugo`, liegt dazwischen; an allen 3686 Messpunkten geprüft) |
| `kipppunkt` | erster Messpunkt (`100`, `200`, `300`), ab dem der Verlierer nach dem Wert der Schätzung an jedem folgenden hinten liegt; sonst `kein`, `ohne` (Partie unter 100 Zügen) oder `fehlt` |
| `kipppunkt_streng` | dasselbe, wenn zusätzlich die für den Verlierer günstigste Schranke unter 0 liegen muss (§3, strenge Zählung) |
