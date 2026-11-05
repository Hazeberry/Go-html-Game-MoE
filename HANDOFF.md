# Übergabe – Kandidaten-Orakel (Stand 05.11.2026)

## Aktueller Stand
- **Nichts läuft.** Keine offenen PRs (#267 bis #274 sind alle gemergt). Keine Läufe ohne ausdrückliches Go.
- `main` steht auf `645a325` (Merge von #274).
- Alle Ergebnisse und Rohdaten liegen in `main` unter `docs/daten/kandidaten-orakel/`.

## Merges (Commit auf main)
| PR | Inhalt | Merge |
|---|---|---|
| #265 / #266 | Vorabfestlegung und Umsetzung Stufe 1 (Schalter `extra.kandidatenOrakel`, Standard aus) | `1d3dd75` / `1c71b02` |
| #267 | Nachtrag Laufzeitprobe Stufe 1, Rohdaten | `5b42448` |
| #268 | Workflow Hauptversuch Stufe 1, Prior-Prüfung, vollständige Paare | `370df8e` |
| #269 | Nachtrag Hauptversuch Stufe 1 (§13), Rohdaten | `c45298a` |
| #270 | Vorabfestlegung Vierarm-Versuch (§12 Engine-Vergleich nachgetragen) | `4eb8dee` |
| #272 | Engine-Vergleich in Actions, Regel in CLAUDE.md | `f87f148` |
| #271 | Umsetzung Vierarm (Arme N, P, pEnd, Bericht, Workflows, Tests) | `bd93a21` |
| #273 | Nachtrag technische Probe Vierarm (§13), Rohdaten | `8740574` |
| #274 | Nachtrag Hauptlauf Vierarm (§14), Rohdaten | `645a325` |

## Ergebnisse
**Stufe 1** (Lauf 41563696817, Seeds 231/232, gültig, §13 in `docs/kandidaten-orakel.md`):
- S − A: GNU Go +24,7 [+19,9; +29,5] (478 Paare), Fuego +36,0 [+30,1; +42,0] (480 Paare).
- Der kombinierte Eingriff (Orakelzug als zusätzliches Wurzelkind mit Spitzenprior) verbessert den Endstand.
  ZS (Rang-Nachbar) verschlechtert ihn; das ist keine isoliert gemessene Eingriffskost.
- Siegquote gegen Fuego mit 100 Spielen je Zug. Die frühere 48-%-Messung (50 Spiele je Zug) ist nicht direkt vergleichbar.

**Vierarm-Versuch** (§14 in `docs/kandidaten-orakel-vierarm.md`, Hauptlauf 41627980348, Seeds 234/235, gültig):
- N − A: kein nachgewiesener Unterschied (GNU Go +0,7 [−5,2; +6,6], Fuego −0,9 [−6,9; +5,1]).
- S − N: positiv (+26,3 GNU Go; +30,4 Fuego). P − A: positiv (+13,8 GNU Go; +11,7 Fuego).
- Nicht getrennt voneinander abgezogen; die Mittelwerte sind additiv (N − A) + (S − N) = S − A.
- Ausfall: Partie 127 gegen GNU Go in allen Armen (SIGSEGV). Die Ursache liegt nach Vermutung an einer
  Stellung vor dem ersten Eingriff; das ist nicht geprüft.
- Laufzeit: 83,5 h Partiezeit, rund 4 h 40 min Wanduhr. Einzelne Fuego-Partien bis 1118 s; die Ursache ist nicht untersucht.

**Engine-Vergleich** (Lauf 41617738140, alt `370df8e`, neu `e0de66f`): GLEICH über 26 Replays und 1328 KI-Abfragen.
Die Vorprüfung ist bestanden. Abdeckung: S und ZS nur 22 bzw. 16 Stellen ab Zug 81, für ZS nur 5 mit Fall d.
Fall d1, e, c0 und d0 kamen nicht vor.

## Offene Punkte (keine Aufgabe ohne Go)
- **GNU-Go-Verwandtschaft:** Hypothese, Ursache nicht nachgewiesen. Dass der Gewinn auch gegen Fuego auftrat,
  spricht gegen eine rein gegnerspezifische Ausnutzung. Er trennt aber nicht den Einfluss von (a) dem
  GNU-Go-Orakel, (b) den GNU-Go-geprägten Netz- und Musterdaten und (c) der GNU-Go-Wertung (Endstand-Zählung).
- **Lange Fuego-Partien und GNU-Go-Absturz:** nicht untersucht. Fuego-Partien dauerten bis 1117,8 s (Arm P) bzw.
  1112,3 s (Arm S), Probe-Maximum 170,2 s. GNU Go stürzte in Partie 127 in allen vier Armen mit SIGSEGV bei
  `genmove B` ab. Die gemeinsame Stellung vor dem Eingriff ist eine **Vermutung**, keine ermittelte Ursache.
- **Nutzung ohne Orakel:** offen. Der Versuch zeigt, dass die Prior-Anhebung hilft, auch bei Zügen, die schon
  Kandidaten sind (P − A +13,8 und +11,7; S − N positiv). Arm P braucht aber GNU Go, um zu wissen, welchen Zug
  er anheben soll. N − A zeigt keinen nachgewiesenen Gewinn; das ist **kein** Beleg für Wirkungslosigkeit.
  Die nächste Frage: Lässt sich die nützliche Anhebung mit einer rein engineinternen Regel finden? Eine solche
  Regel dürfte das Orakel nicht als Eingabe nutzen, sonst bliebe die Abhängigkeit bestehen. Das ist eine neue
  Fragestellung mit eigener Vorabfestlegung und eigenem Go; noch nicht festgelegt.

## Regeln aus den letzten Sitzungen
- **Nur ein ausdrückliches „Go“ startet einen Lauf** oder merged einen PR. Eine Empfehlung ist kein Go. Diesen Fehler gab es einmal (Engine-Vergleich), er ist im Nachtrag vermerkt.
- Messungen laufen ausschließlich in GitHub Actions. Engine-Vergleiche je Stand in einem eigenen Prozess, nie zwei Stände im selben Node-Prozess (CLAUDE.md).
- „Gleich“ erst nach Vorprüfung (Priors je Wurzelkind vorhanden und endlich, Abdeckung der Arme und Fälle), sonst KEIN URTEIL.
- Zulässige Partieausfälle stehen getrennt von bestandenen Prüfungen. Ein fehlendes Pflichtprotokoll ist kein Ausfall, sondern KEIN URTEIL.
- Merge mit voller Kopf-SHA (`expectedHeadSha`), Merge-Methode `merge`. Docs mit Vorgaben vor dem Merge von Hazeberry lesen lassen.

## Löschbare Branches (nicht gelöscht; auf Wort von Hazeberry)
Alle auf origin vorhanden und durch PRs eingegangen:
- Diagnose: `claude/diagnose-p1p2`, `claude/diagnose-p1p2-pakete`, `claude/diagnose-probe-nachtrag`,
  `claude/diagnose-rohdaten-41480291668`, `claude/diagnose-korrektur`, `claude/diagnose-p2-rang`,
  `claude/claude-md-skalierung`, `claude/diagnose-p2-rang-ergebnis-41538801704`
- Kandidaten-Orakel: `claude/kandidaten-orakel`, `claude/kandidaten-orakel-umsetzung`,
  `claude/kandidaten-orakel-probe-nachtrag`, `claude/kandidaten-orakel-hauptversuch`,
  `claude/kandidaten-orakel-haupt-ergebnis`, `claude/kandidaten-orakel-vierarm`,
  `claude/kandidaten-orakel-vierarm-umsetzung`, `claude/kandidaten-orakel-vierarm-probe-nachtrag`,
  `claude/kandidaten-orakel-vierarm-ergebnis`, `claude/engine-vergleich-actions`
- Ergebnis-Branches: `ergebnisse/kandidaten-orakel-probe-lauf1`, `ergebnisse/kandidaten-orakel-haupt-lauf1`,
  `ergebnisse/kandidaten-orakel-vierarm-probe-lauf1`, `ergebnisse/kandidaten-orakel-vierarm-lauf1`
