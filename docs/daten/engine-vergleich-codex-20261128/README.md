# Engine-Vergleich: codex `0ab23b9` gegen dieses Repo, 28.11.2026

Frage: Entscheidet die Engine aus `Hazeberry/codex` (Messcommit des H/R-Laufs) bei Standardwerten wie die Engine in
diesem Repo? Workflow `engine-vergleich.yml`, [Lauf 46158521878](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/46158521878)
auf `main` (`950c504`), gestartet nach Hazeberrys Go am 28.11.2026 um 15:11 UTC, Dauer rund 2 Minuten.

**Ergebnis: GLEICH.** 26 Läufe, 1328 KI-Abfragen, alle mit Wurzelkindern; gewählter Zug, Wurzelkinder, Priors je
Wurzelkind und Protokollfelder identisch. Die 26 Replays sind zwei Referenzläufe (Arm „-“, je Partie einer) und 24
Varianten des Kandidaten-Orakels (Arme A, S, ZS, Ränge 5, 16, 17, 30, je Partie). Jedes Replay endet bei der ersten
Abweichung vom Archivzug, spätestens bei Zug 130.

| Datei | Inhalt |
|---|---|
| `bericht.md` | der Bericht des Werkzeugs im Wortlaut |

**Verglichene Stände:**

- alt: Branch `claude/codex-stand`, Commit `25a39737a2db494b445229d5af5eecc94685b9df`. Er enthält gegenüber `main`
  (`950c504`) nur eine andere `index.html`, nämlich die aus `Hazeberry/codex` am Commit
  `0ab23b9f304eaafea27c83aede9f41150649804f` (SHA-256 der Datei `a14ac4d40580…`, gleich der `index.html` am codex-`main`
  `04a9287` und an `6a6fe69`). Der Branch ist ein reiner Messstand und wird nie gemergt.
- neu: `main` dieses Repos, `950c5040641821618f8c01e05b431ba13e46c7a5`. Die Engine-Blöcke sind die des Messcommits
  `98aa1ad` (shared-go-logic `54dfef2d…`, worker-ai `3523535b…`, policy-net `14cb39a1…`).

Eingaben des Workflows: `alt` und `neu` wie oben, alles andere Standard (Archiv `leeres-brett-g-D`, Partien 1 und 2,
bis Zug 130, Ränge 5, 16, 17, 30, Arme A, S, ZS, Fälle c und d).

**Herkunft von `bericht.md`:** maschinell aus dem Job-Log übernommen (Job 141020808268), Zeitstempel am Zeilenanfang
entfernt, nicht abgetippt. Artefakt `engine-vergleich-bericht` (ID 15269225483, Digest
`d01c89def2f48331f0b87d9a1756558212f01fbf765edb6df043a0f697126bb4`); GitHub löscht es bei diesem Workflow nach 30 Tagen.
Alle 26 Zeilen der Tabelle „Je Replay“ tragen das Ergebnis „gleich“.

**Nachrechnen** (in Actions): `engine-vergleich.yml` mit `alt` = `25a39737a2db494b445229d5af5eecc94685b9df` und `neu` =
`950c5040641821618f8c01e05b431ba13e46c7a5`. Der Branch `claude/codex-stand` kann gelöscht sein; dann entsteht der alte
Stand neu, indem man die `index.html` aus codex `0ab23b9` auf einen Zweig dieses Repos legt.
