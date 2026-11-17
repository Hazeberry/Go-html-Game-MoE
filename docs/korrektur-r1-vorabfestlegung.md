# Korrektur R-1: Vorabfestlegung

**Stand: 17.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befund aus `docs/bughunt-20261116.md` (R-1).
Go von Hazeberry am 17.11.2026: „Go für R-1, Vorabfestlegung schreiben“.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt

Betroffen ist nur der Zweig für Leicht und Mittel in `triggerAIMove` im Hauptskript. Die Blöcke `shared-go-logic`,
`worker-ai` und `policy-net` bleiben **byteidentisch** (Prüfsummen wie in `docs/korrektur-d1-w1-vorabfestlegung.md` §1:
`54dfef2d…`, `f847c124…`, `56a5d6c0…`).

Kein Schalter, kein Messlauf. Solange `getAIMove` nicht wirft, läuft genau derselbe Code mit denselben Aufrufen in
derselben Reihenfolge: Das `try` umschließt nur, was schon da ist. Andere Züge entstehen nur in dem Fall, der heute
hängt. Statt stehen zu bleiben, macht die KI dort einen Notzug oder passt.

## 2. Befund

Im Zweig für Leicht und Mittel (Z. 6291 bis 6321 am Stand `497716e`) ruft `triggerAIMove` `getAIMove` in einem
`setTimeout` ohne `try/catch` auf. Wirft `getAIMove`, oder liefert es kein Objekt (dann wirft `r.zeiten = …`), bleibt
`state.aiThinking` für immer `true`:
- Der Status zeigt „KI denkt...“.
- Rückgängig ist gesperrt.
- Die KI zieht nicht mehr.
- Nur „Neues Spiel“ hilft.

Der Rückfall für Schwer (`fallbackToMainThread`, Z. 6048) hat für genau diesen Fall schon einen Schutz: `try/catch`,
eine Protokollzeile, einen Notzug über `findAnyLegalMove` oder einen Pass. Der Kommentar dort nennt den Anlass, die
Partie mit 347 Zügen.

Ein echter Auslöser auf Leicht oder Mittel ist **nicht bekannt**. Gezeigt ist der Fehler nur mit einer Attrappe, die
`getAIMove` werfen lässt. Die Korrektur sichert also einen Fall ab, der bisher nicht beobachtet wurde. Wenn er eintritt,
hängt die KI ohne sichtbaren Grund.

## 3. Änderung

Der Aufruf im Zweig für Leicht und Mittel bekommt denselben Schutz wie `fallbackToMainThread`:

```js
let r;
try {
  r = getAIMove(/* unverändert */);
  r.zeiten = zeitenLesen();
} catch (e) {
  console.error('[Leicht/Mittel] getAIMove gescheitert:', e);
  state.log.push(`! KI-Fehler (${{easy: 'Leicht', medium: 'Mittel'}[state.aiDifficulty]}): ${(e && e.message) || e} → Notzug`);
  const fb = findAnyLegalMove(state.aiColor);
  r = fb ? {type: 'stone', x: fb.x, y: fb.y, requestId: reqId} : {type: 'pass', requestId: reqId};
}
applyAIResult(r, reqId, null, null, null);
```

1. **Sichtbar:** Der Fehler steht im Zugprotokoll und damit auch im Fehlerbericht (🐞), zusammen mit dem
   Reproduktionszustand, den `state.lastAIRequest` vor dem Aufruf schon festhält.
2. **Spiel geht weiter:** Notzug über `findAnyLegalMove`, nämlich der erste Schlag, sonst der erste legale Punkt, der
   kein eigenes Auge füllt. Gibt es keinen, passt die KI. Danach läuft alles über `applyAIResult` wie bei einem
   gewöhnlichen Zug: Status, Rückgängig, Diagnosezeile.
3. **Gleiches Muster wie bei Schwer:** Beide Zweige verhalten sich bei einem Fehler gleich. Die Protokollzeile nennt
   die Stufe mit dem Anzeigenamen.

**Unverändert:** Ohne Fehler bleibt alles gleich (§1). Schwer, der Worker und `fallbackToMainThread` werden nicht
berührt. `findAnyLegalMove` bleibt, wie es ist.

**Bewusst so:**
- Der Notzug ist schwach. Er steht auf dem ersten passenden Punkt, im Test A19.
- Wirft `getAIMove` dauerhaft, wird jeder weitere KI-Zug ein Notzug. Jeder steht mit einer Zeile im Protokoll.

Das ist dasselbe Verhalten wie bei Schwer nach einem Absturz. Ziel ist, dass das Spiel bedienbar bleibt und der Fehler
gemeldet werden kann, nicht ein guter Zug.

**Erwogen und verworfen:**
- *Nur `aiThinking` zurücksetzen.* Dann wäre die KI am Zug, rechnete aber nicht. Das ist ein Hänger in anderer Form,
  den man nur über KI aus und an lösen kann.
- *Die KI nach einem Fehler abschalten.* Das ist sichtbar, weicht aber vom Verhalten bei Schwer ab und verlangt einen
  Klick, bevor man weiterspielen kann. Bei einem einmaligen Fehler wäre das übertrieben.

**Nicht Teil der Korrektur:** Fehler, die erst in `applyAIResult` selbst entstehen (auch bei Schwer nicht abgesichert);
B-1 bis B-3.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`. Die Zeile in `tests/README.md` wird ergänzt. Die Attrappe ersetzt nach dem
Laden der Seite `getAIMove` durch eine Funktion, die wirft.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-R1 | Leicht, KI Weiß, Mensch setzt D16, `getAIMove` wirft: Nach 600 ms rechnet die KI nicht mehr, Rückgängig ist frei, Weiß hat einen Notzug gesetzt (Zug 2, Schwarz am Zug). Im Protokoll steht „! KI-Fehler (Leicht): … → Notzug“; keine Seitenfehler | scheitert: „KI denkt...“, Rückgängig gesperrt, Seitenfehler |
| T-R2 | Dasselbe auf Mittel; die Zeile nennt „Mittel“ | scheitert wie T-R1 |
| T-R3 | Leicht, kein legaler Zug für Weiß (ganzes Brett schwarz bis auf zwei Augen A19 und C19), `getAIMove` wirft: Weiß passt, die KI rechnet nicht mehr | scheitert: „KI denkt...“ |
| T-R4 | Leicht ohne Attrappe: Die KI zieht normal, keine Zeile „KI-Fehler“, keine Seitenfehler | besteht (Kontrolle des normalen Wegs) |

T-R1 bis T-R3 müssen am alten Code fehlschlagen und am neuen bestehen. T-R4 besteht an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1.
2. T-R1 bis T-R3 schlagen am alten Code fehl und bestehen am neuen; T-R4 besteht an beiden.
3. `node tests/run.js` lokal grün, CI grün. Die bestehenden Browser-Tests bleiben unverändert.
4. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: R-1 „nicht reproduziert“. D-1, D-2, W-1, K-1, K-2 und L-1
   bleiben „nicht reproduziert“, B-1 bis B-3 „reproduziert“ (3 von 13). Die Ausgabe wird als
   `docs/daten/bughunt-20261116/nach-r1.json` abgelegt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (17.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `497716e`) außerhalb des Repos eingesetzt und lokal
geprüft (Chromium 153 headless). Der Prototyp ist nicht die Umsetzung. Er schrieb in die Protokollzeile noch die
internen Namen `easy`/`medium`; §3 legt die Anzeigenamen fest.

- **Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.
- **T-R1/T-R2, alter Code:** „KI denkt...“, Rückgängig gesperrt, Zug 1, Seitenfehler „Attrappe“.
- **T-R1/T-R2, Prototyp:** Zug 2 (Notzug A19), Schwarz am Zug, Status „KI aktiv · Weiß · Leicht“ bzw. „Mittel“,
  Protokollzeile vorhanden, keine Seitenfehler.
- **T-R3:** Alter Code hängt. Prototyp: „○ Weiß passt“, Schwarz am Zug.
- **T-R4:** An beiden zieht die KI normal, ohne Fehlerzeile und ohne Seitenfehler.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, Hazeberry liest, Merge.
2. Umsetzung in einem eigenen PR: Code, Tests, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht.

## 8. Nachtrag: Umsetzung und Abnahme (17.11.2026)

Hazeberry, nach grüner CI von #334: „Go“. Die Umsetzung folgt §3 und §4 ohne Abweichung. Geändert sind `index.html`
(Zweig für Leicht und Mittel in `triggerAIMove`), `tests/browser-ui.js` (T-R1 bis T-R4) und `tests/README.md`.

**Abnahme nach §5:**

1. **Prüfsummen:** Die Engine-Blöcke haben die Prüfsummen aus §1. Erfüllt.
2. **Tests:** Am alten Code (`index.html` SHA-256 `7466f876…`, Stand `2b5b077`) schlagen T-R1 bis T-R3 fehl, jeweils
   mit „die KI rechnet nicht mehr (KI denkt...)“. T-R4 besteht dort. Am neuen Code bestehen alle 26 Tests der Datei.
   Ausgaben: `docs/daten/bughunt-20261116/browser-ui-r-alt.txt` und `browser-ui-r-neu.txt`. Erfüllt.
3. **Testsuite:** `node tests/run.js` lokal mit Browser-Tests: siehe Nachtrag im PR. Die CI steht im PR.
4. **Prüfskript:** `pruefung.js` am neuen Code ergibt genau das Soll: R-1 „nicht reproduziert“; D-1, D-2, W-1, K-1, K-2
   und L-1 weiter „nicht reproduziert“; B-1 bis B-3 „reproduziert“ (3 von 13).
   Daten: `docs/daten/bughunt-20261116/nach-r1.json`, Konsole `nach-r1-konsole.txt`. Erfüllt.

Neue `index.html`: SHA-256 `7a0353b1f4c5d899d92c001f1ddc79d00651db32197cc2084e81e5a6f8a38535`.

**Grenzen:** Nur Chromium 153 headless. Der Fehler ist mit einer Attrappe ausgelöst; ein echter Auslöser auf Leicht
oder Mittel ist weiterhin nicht bekannt.
