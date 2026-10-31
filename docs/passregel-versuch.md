# Versuchsregel „Pass nach Gegnerpass“

Vorabfestlegung, 31.10.2026. Status: **Versuchsschalter, AUS als Standard.** Keine fertige
Passregel, kein Ersatz der bestehenden Regel. Auslöser: In der Territory-Partie vom 31.10.
([`endspiel-abraeumen.md`](endspiel-abraeumen.md) §13) spielte die KI nach 49 Gegnerpässen weiter,
obwohl sie längst gewonnen hatte. Die Engine kennt „der Gegner hat gepasst“ nicht und passt nur
über feste Schwellen (`passMinMc…`) plus Atari- und Unabwendbarkeitsprüfung.

## 1. Regel

`PARAMS.passNachGegnerpass` = 1 (Standard 0). Auf Stufe Schwer passt die KI **vor** der Suche, wenn
alle vier Bedingungen gelten (`passNachGegnerpassPruefung`):

1. Der Gegner hat gerade gepasst (`state.consecutivePasses >= 1` bei KI am Zug).
2. Die Stellung ist **ausgespielt**: Anteil freier Punkte in gemischten Regionen höchstens
   `passGemischt` = 0,25.
3. Sie ist **geklärt**: die beiden Stände der Zählvorschau („Mit Annahmen“ und „Nur Bewiesenes“) liegen
   höchstens `passSpanne` = 2 Punkte auseinander.
4. Der Vorsprung aus Sicht der KI erreicht `passMarge` = 20 Punkte **im ungünstigeren der beiden
   Stände**.

Gerechnet wird in der **eingestellten Wertung** (Area oder Territory, mit Gefangenen), Komi 7,5. Trifft
eine Bedingung nicht zu, läuft alles wie bisher; die bestehende Passregel bleibt unverändert. Das
Ergebnis liefert `getAIMove` zusätzlich als `versuch` (Stände, Spanne, Anteil, Grund), damit Messungen
den Grund einer Nicht-Auslösung sehen. Bei Schalter 0 ist das Verhalten gleich wie vorher (Test).

Die Werte 20, 2 und 0,25 sind Setzungen, keine Messergebnisse. Spanne und Anteil stehen nicht im
Dashboard, damit sie während des Versuchs nicht verstellt werden.

## 2. Was die Regel nicht ist

- **Kein Sicherheitsnachweis.** Auch „Nur Bewiesenes“ ist keine garantierte Untergrenze: lebende
  Gruppen, offene Grenzen und ungeklärte Gruppen fließen in die Wertung ein, Seki und Ko erkennt die
  Zählung nicht. Eine große Marge kann täuschen. Die Spanne-Bedingung schließt nur die sichtbar
  ungeklärten Fälle aus.
- **Sie beantwortet „Kann ich den Sieg behalten?“, nicht „Sind weitere Züge sinnvoll?“.** Bei großem
  Vorsprung kann sie Punkte verschenken, bei einer ausgespielten verlorenen Stellung passt sie
  nicht (die Marge ist nur positiv). Als alleinige Passregel reicht sie deshalb nicht.

## 3. Einzelrechnung an der Partie vom 31.10. (keine Messung)

Prüfung an jeder KI-Entscheidung nach einem Schwarzpass (KI = Weiß, Archivdaten):

- Zug 355 und 357: kein Pass, Spanne 12 bzw. 9 (Stand mit Annahmen 186,5, nur Bewiesenes 174,5).
- Zug 359 bis 369: Pass (Territory 184,5 bis 179,5, Spanne 0).
- Zug 413 bis 455: kein Pass, **Spanne 62** (Schätzung tot/nicht tot schwankt, siehe
  [`endspiel-abraeumen.md`](endspiel-abraeumen.md) §13).
- Zug 457 bis 493: Pass (Territory 218,5 bis 200,5, Spanne 0).
- Area und Territory laufen im Spiel auseinander, weil Weiß mehr Züge macht als Schwarz. Bei Zug 354
  sind sie gleich (gleich viele Züge).
- Die Regel hätte bei Zug 359 eine Area-Partie beendet (186,5) bzw. eine Territory-Partie mit 184,5
  statt der gespielten 200,5: **die gespielten Züge haben im Territory-Modus 16 Punkte Marge gebracht**,
  die die Regel verschenkt hätte. Das ist eine Partie und keine Aussage über die Regel im Allgemeinen.

## 4. Geplanter Vergleich (nicht gestartet, braucht Go)

„Sofort beenden“ (Schalter 1) gegen „normal weiterspielen“ (Schalter 0), gepaart je Stellung, ausgehend
von Stellungen **direkt nach einem Gegnerpass** (Quelle: Pass-Stellungen, `pass-stellungen.yml`, und die
archivierten Handpartien als Prüfmaterial). Weiterspielen gegen GNU Go Stufe 1 bis zwei Pässe, Zählung
durch GNU Go.

Kennzahlen, getrennt nach Area und Territory:

- **verlorene Siege:** Stellung gewonnen bei Weiterspielen, aber bei sofortigem Ende verloren (und
  umgekehrt),
- **Punktverlust:** mittlere Differenz des Endstandes aus KI-Sicht,
- **eingesparte Züge:** KI-Züge, die beim Weiterspielen noch anfallen.

Gültigkeitsregel wie bei den Fuego-Messungen (vorab zwei Zustände gültig/ungültig, Mindestanteil der
erwarteten Paare, Kontrolle), Vorzeichentest für die Siegwechsel. Entscheidungsregel: **Die Regel wird
nicht Standard, solange verlorene Siege nicht ausgeschlossen werden können.** Der Vorsprung der
Zählvorschau gilt bis dahin nicht als Sicherheitsnachweis.

Offene Punkte vor einem Go: Das Duell-Werkzeug kann bisher nur vom leeren Brett starten
([`endspiel-abraeumen.md`](endspiel-abraeumen.md) §11); die Territory-Zählung durch GNU Go (japanische
Regeln oder eigene Territory-Rechnung auf GNU Gos Tot-Liste) ist zu klären.

## 5. Umgesetzt

- Schalter und Parameter in `PARAMS`, im Dashboard unter der Aufgabe-Serie (`passNachGegnerpass`,
  `passMarge`).
- Prüfung `passNachGegnerpassPruefung`, Einbindung in `getAIMove` (nur Stufe Schwer), Weitergabe von
  `gegnerPasste`, `wertung` und `komi` durch Hauptthread, Worker-Nachricht und Rückfall (`passExtra`).
- Tests: [`tests/passregel-versuch.js`](../tests/passregel-versuch.js) und ein Browser-Test.
