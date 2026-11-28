<!-- Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE) -->
<!-- SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 -->
# Engine-Vergleich: codex gegen dieses Repo

**Stand: 28.11.2026. Status: gemessen, GLEICH bei Standardwerten und den geprüften Stellungen.** Dieses Doc hält ein
Ergebnis fest; es enthält keine Vorgaben und erteilt kein Go.

## 1. Anlass

Der H/R-Lauf (Prior-Anhebung ohne Orakel) wurde in `Hazeberry/codex` am Commit `0ab23b9` gerechnet, mit der dortigen
Engine. Die Frage war, wie weit diese Engine von der in diesem Repo entfernt ist, damit sich sagen lässt, ob das
H/R-Ergebnis hier gilt. Die Ergebnisse des H/R-Laufs stehen in codex (`docs/prior-anhebung-ohne-orakel.md`, §14); sie
gelten hier nicht automatisch ([`../HANDOFF.md`](../HANDOFF.md)).

## 2. Unterschied der Engine-Blöcke (aus dem Quelltext gelesen)

Alle drei Blöcke (`shared-go-logic`, `worker-ai`, `policy-net`) weichen ab. Die codex-Stände `0ab23b9`, `6a6fe69`,
`6bfaa33` und `04a9287` haben dieselben Blöcke untereinander.

- **Nur hier**, jeweils bei Standard aus oder wirkungsgleich: `evalStreuung` (Standard 1,00, der Rauschterm wird mit
  1,00 multipliziert), `diagonalAugeEnde` und `diagonalAugeSchluss` (Standard 0), zwei Absicherungen in `policy-net`
  (gesperrtes `localStorage`, fehlende Anzeigefelder; weder Suche noch Zugwahl).
- **Nur in codex:** der H/R-Eingriff in `worker-ai`, nur über `extra.priorOhneOrakel` erreichbar.
- Standardwerte: Bei den Einträgen, die sich lesen ließen (152 hier, 149 in codex), sind alle gemeinsamen gleich.

## 3. Messung

Workflow `engine-vergleich.yml`, Lauf 46158521878, am 28.11.2026: codex `0ab23b9` (`index.html`) gegen `main`
`950c504`, je Stand ein eigener Prozess. Ergebnis **GLEICH**: 26 Läufe, 1328 KI-Abfragen, gewählter Zug, Wurzelkinder,
Priors und Protokollfelder identisch, Abdeckung erfüllt. Bericht, Eingaben und Herkunft:
[`daten/engine-vergleich-codex-20261128/`](daten/engine-vergleich-codex-20261128/README.md).

## 4. Grenzen

- Geprüft sind zwei Archivpartien bis Zug 130 mit Standardparametern. Spätere Spielphasen und andere Einstellungen
  deckt der Vergleich nicht ab.
- Der H/R-Eingriff selbst (`extra.priorOhneOrakel`) ist nicht verglichen; er gibt es hier nicht.
- Daraus folgt, dass der Arm A des H/R-Laufs bei Standardwerten wie die Engine hier entscheidet. Dass H und R hier
  dasselbe bewirken wie in codex, ist eine Hypothese; gemessen wäre es erst mit einem eigenen Lauf, der eine
  Vorabfestlegung und ein Go braucht.
