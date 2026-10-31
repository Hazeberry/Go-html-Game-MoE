# Chromium-Zeitreferenz (Sol 6.1), archiviert

Ergebnisse einer Messung, die ein anderer Assistent (Sol 6.1) am 31.10.2026 zur Zeitüberschreitung gemacht hat
(siehe [`docs/zeitbudget.md`](../../../../zeitbudget.md) §3). Archiviert sind nur die Ergebnisse;
das zugehörige Skript und der Workflow sind **nicht** im Repository.

- **Commit:** 9e6bbf89cc5948183a48c2592b35d102ca747be5 (Stand vor den Messpunkten in der Diagnose).
- **Umgebung:** lokaler Container, Chromium 141.0.7390.37 (Headless Shell), Node v24.22.1, AMD EPYC 9V74,
  Linux. Keine Android-Messung. `adaptiveBudgetEnabled` 0, `aiTimeBudget` 1800.
- **Material:** Territory-Handpartie mit 494 Zügen, Stellungen vor Zug 78, 80, 82, 84, 160 und 300; je Stellung
  Endspiel-Netz 0 gegen 0,8, einmal mit 120 festen Simulationen und einmal mit 1800 ms Zeitbudget; je Bedingung
  ein frischer Worker mit dem Produktionscode, drei Anfragen (Kaltstart, zwei warme Wiederholungen),
  konstanter Seed 6301. 72 Messantworten, 12 Kontrollen gegen uninstrumentierte Worker bestanden, keine Seiten-
  oder Workerfehler.
- **Dateien:** `bericht.md` (Mediane der zwei warmen Wiederholungen), `metadaten.json`, `messungen.jsonl`
  (alle 72 Antworten, auch Kaltstarts).

## Grenzen (nach dem Bericht)

- Zwei warme Wiederholungen sind eine kleine Referenz, keine Laufzeitverteilung.
- Desktop-Chromium im Container, nicht Android; keine thermische Drosselung, kein vollständiger UI-Zugpfad.
- Nicht gemessen: Vorarbeit im Hauptthread (`policyNet.forward`), Darstellung, Watchdog und Rückfälle.
- Netz an/aus ändert auch die Suchpriors und damit den Suchverlauf; die Netzzeit selbst ist die direktere Kostenmessung.
- Der Roundtrip enthält die Zugberechnung. Der **zusätzliche** Aufwand für Nachrichten gegenüber `getAIMove` beträgt
  etwa 0,5 ms (z. B. 1825,4 gegen 1824,9 ms bei Zug 78); der Roundtrip insgesamt ist rund so lang wie die Berechnung.
- Der Lauf reproduziert die rund 3,8 s vom Handy nicht. Das bestätigt das Netz nicht als Ursache, schließt aber
  einen deutlich höheren Aufwand auf dem Handy auch nicht aus.
