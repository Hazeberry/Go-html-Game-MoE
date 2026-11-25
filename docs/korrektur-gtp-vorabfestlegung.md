# Korrektur GTP-1 bis GTP-3: Vorabfestlegung

**Stand: 23.11.2026. Status: umgesetzt (§11), Abnahme gültig, eine Abweichung von Abnahmepunkt 1 in §11.1.** Befunde aus `docs/bughunt-wiederholung.md` §5 (GTP-1 bis
GTP-3), dort mit `reproduce.cjs` reproduziert. Go von Hazeberry am 22.11.2026: „die Vorabfestlegung für GTP-1 bis
GTP-3 vorbereiten und das ist ein go für den GTP PR".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR. **Durchgesehen am 23.11.2026**; §2, §3, §5, §7 und §8 sind dabei berichtigt oder ergänzt worden, die
Nachmessungen stehen in §10.

**Herkunft der Befunde** (am 23.11.2026 in `Hazeberry/codex` nachgelesen, öffentlich, in `main`): Befund und
Prüfaufträge stammen aus einem von Hazeberry übermittelten, **statischen** GTP-Review — `HANDOFF.md` dort: „Prüfstand:
gezielter statischer Review, keine Testsuite und keine lokale Ausführung" und „**Die Autorenzuordnung des separaten
GTP-Reviews ist nicht festgehalten**" (Terra und Astra sind den beiden `index.html`-Bughunts zugeordnet, den
GTP-Befunden niemand). Die konkreten Stellungen stammen aus `auswertung/bughunt-20261107/reproduce.cjs`; deren
GTP-1-Block enthält **keinen Kommentar**, und eine Begründung für die Wahl der Stellungen steht in keiner der Dateien.
Alle Commits beider Dateien tragen keine Attributionszeile. `docs/bughunt-wiederholung.md` in diesem Repo ist die
**Ausführung** jenes Skripts, nicht sein Entwurf (dort §1: „nicht ein neuer Testentwurf"; §8: „Das Testdesign wurde
nicht neu entworfen, nur gegengelesen").

## 1. Grundsatz: Die Engine und das Spiel bleiben unberührt

Geändert wird **allein `gtp-ki.js`** (145 Zeilen), der GTP-Adapter, der die Engine als Gegner für GNU Go und für die
PWA-Vergleiche bereitstellt. `index.html` wird nicht angefasst: keine Zeile, kein Parameter, keine Engine-Prüfsumme.
Das Spiel im Browser verhält sich bitgleich.

Der Adapter lädt `shared-go-logic` und `worker-ai` (Z. 48 bis 52) — **nicht `policy-net`**
(`docs/bughunt-20261116.md` §7, dort am 22.11. berichtigt). Kein Messlauf, kein Engine-Vergleich.

**Was sich für Messungen ändert:** Der Adapter lehnt künftig Züge ab, die er bisher angenommen hat (GTP-1), und gibt
`getAIMove` ein zehntes Argument mit (GTP-2). Beides ändert die Zugwahl der Engine **nicht**; GTP-2 kann sie nur
dann ändern, wenn jemand die Versuchsregel ausdrücklich über `--ki passNachGegnerpass=1` einschaltet — und genau das
war bisher wirkungslos (§3).

## 2. Befund GTP-1: Ko, Superko und Selbstmord werden nicht geprüft

`setze` (Z. 84 bis 93) prüft ausschließlich, ob das Feld besetzt ist (Z. 86). **Drei** Verbote fehlen:

- **Ko:** Der Ko-Punkt wird in Z. 89 f. berechnet und bei `play` (Z. 112) nie abgefragt.
- **Superko:** Die Stellungshistorie `hist` wird in Z. 92 fortgeschrieben und bei `play` nie abgefragt.
- **Selbstmord:** Es gibt überhaupt keine Freiheitsprüfung. `removeDeadGroups(board, 3 - f, i)` entfernt nur
  Gegnersteine; ein eigener Stein ohne Freiheit bleibt stehen.

**Berichtigt am 23.11.2026:** Diese Fassung nannte nur Ko und Superko. Der Selbstmord steht im Review-Auftrag (codex
`HANDOFF.md`, GTP-1, Priorität P1: „`play` prüft besetzte Punkte, soll aber **Suizid** sowie Ko-/Superko-Rückschläge
annehmen und so den Brettzustand verfälschen"), in der Verifikation (codex `docs/bughunt-verifikation.md`: „Nach W A2,
W B1 akzeptiert `play B A1` den Suizid mit Erfolg; `list_stones B` enthält A1"), in den mitgelieferten Rohdaten dieses
Repos (`docs/daten/bughunt-wiederholung/lauf1/reproduce-ergebnis.json`, Schlüssel `suicideAccepted`, zuerst genannt)
und in `docs/zaehlung-mechanismus.md` §3 („weder Ko noch Superko noch Selbstmord"). Vier Quellen nennen drei Fälle.
Nur die Lesung in `docs/bughunt-wiederholung.md` §5 nennt zwei — sie ist am Code entlang geschrieben, und dort sind
`ko` und `hist` Variablen in `setze`, während der Selbstmord das Fehlen einer Prüfung ist und keine hat. Diese
Vorabfestlegung hatte die engere Prosa übernommen.

**Gemessen** (§6 und §10.1): alle drei Fälle werden angenommen. Der Selbstmord ist der schärfste, weil er einen Stein
mit **null Freiheiten** auf dem Brett hinterlässt — eine Stellung, die die Regeln nie erzeugen. `getLegalMoves` wirft
darauf nicht, sondern liefert still weiter. Ko und Wiederholung hinterlassen je eine regelgültige Stellung.

**Was betroffen ist: eine fehlende Eingangsvalidierung des Adapters** — so formuliert es die Verifikation (codex
`docs/bughunt-verifikation.md`: „GTP-1 bestätigt eine fehlende Eingangsvalidierung, keinen nachgewiesenen illegalen
Zug in einer bestimmten Messung"). **Berichtigt:** Hier stand, ein Gegner wie GNU Go könne dem Adapter einen
regelwidrigen Zug schicken. So ist es nicht verdrahtet. In `gnugo-duell.js --gegner ki` ist GNU Go
**Schiedsrichter** und erzeugt keinen Zug (Z. 478 fragt `(fu || g)`, mit gesetztem `fu` nie GNU Go); der Adapter
bekommt als `play` nur die Züge **unserer eigenen Engine** (Z. 471) und die Vorgabesteine, seine eigenen erzeugt er
über `genmove`. In `auswertung/endspiel/passregel-fortsetzung.js` (Z. 362) dasselbe Bild, und
`auswertung/pwa-spielen.sh` (Z. 34) treibt wieder `gnugo-duell.js`. Weitere Aufrufer gibt es nicht. Heute kann dem
Adapter also niemand einen regelwidrigen Zug schicken, weil die einzige Quelle `getLegalMoves` ist. Die Korrektur ist
Robustheit gegen künftige oder andere Steuerprogramme — nötig bleibt sie, weil der Schutz vollständig außerhalb des
Adapters liegt.

Nicht betroffen ist `genmove`: Dort kommt der Zug von der eigenen Engine, und `getLegalMoves` (`index.html` Z. 3052)
prüft Ko (`koPoint`), Selbstmord (`captured === 0 && countLiberties === 0`) **und** Superko (gegen den Hash-Satz). Der
Adapter übergibt `ko` und `Array.from(hist)` (Z. 118), die Suche läuft also unter vollständiger Prüfung; jeder
zurückgegebene Steinzug stammt aus dieser Liste, und der Baumübernahme-Pfad filtert übernommene Wurzelkinder gegen die
aktuelle legale Liste (`index.html` Z. 4650). Ungeprüft bleibt nur, dass der Adapter das Ergebnis nicht noch einmal
nachprüft — und dass sein Zustand stimmt, was wiederum an der eingehenden Richtung hängt.

## 3. Befund GTP-2: `extra` fehlt, die Versuchsregel ist tot

`genmove` ruft `getAIMove` mit **neun** Argumenten (Z. 118); die Signatur hat zehn
(`index.html` Z. 5242, letzter Parameter `extra`). `passNachGegnerpassPruefung` beginnt mit

```js
if (!(PARAMS.passNachGegnerpass >= 1) || !extra || !extra.gegnerPasste) return null;
```

(`index.html` Z. 5226). Ohne `extra` gibt die Prüfung also **immer** `null` zurück.

**Die Folge ist schärfer als „ein Argument fehlt":** Der Adapter kann die Versuchsregel nicht auslösen, auch nicht
mit `--ki passNachGegnerpass=1`. Ein Messlauf, der die Regel über den Adapter einschalten wollte, liefe still ohne
sie — und sähe aus wie ein Lauf mit Regel.

Der Adapter kann `extra` heute auch gar nicht füllen: Er merkt sich nicht, ob der Gegner gepasst hat (`setze` setzt
bei einem Pass nur `ko` und `mc`, Z. 85), und `komi` wird geprüft, aber nicht gespeichert (Z. 107).

**Heute ohne Wirkung auf die Messungen:** `passNachGegnerpass` steht im Standard auf 0 (`index.html` Z. 2913), und
`docs/bughunt-wiederholung.md` §9 hält fest, dass die Passregel-Messungen die Regel direkt prüfen, nicht über den
Adapter. **Ergänzt am 23.11.2026**, weil es belegbar statt plausibel ist: `.github/workflows/passregel-vergleich.yml`
(Z. 20) läuft ausdrücklich mit `passNachGegnerpass 0`, `auswertung/endspiel/passregel-fortsetzung.js` (Z. 220) wirft
sogar, wenn der Wert nicht 0 ist, und weder ein Workflow noch ein Spielskript noch eine Archiv-`ki`-Zeichenkette nennt
den Parameter. **Kein Messlauf hat dem Adapter die Regel je mitgegeben.** GTP-2 ist eine Falle für künftige Läufe,
kein Fehler in den bisherigen.

**GTP-2 ist nicht adapterspezifisch.** Kein Node-Aufrufer übergibt `gegnerPasste`: `gnugo-duell.js` (Z. 449) nur für
das Kandidaten-Orakel, `ab-harness.js` (Z. 1152 und 1390) und alle dreizehn Aufrufe in `auswertung/` mit neun
Argumenten. Nur der Browser versorgt die Regel (`passExtra()`, `index.html` Z. 6062), dazu die Auswertungs- und
Testskripte, die `passNachGegnerpassPruefung` direkt aufrufen. Diese Korrektur heilt **einen von vier Wegen**; die
anderen bleiben, wie sie sind. Das steht hier, damit später niemand „GTP-2 ist erledigt" daraus liest.

**Nachtrag 23.11.2026:** Die anderen Wege sind jetzt behandelt, aber anders als dieser Satz es nahelegt — `docs/passregel-wege-vorabfestlegung.md`: Von 20 Node-Aufrufstellen kann der Schalter nur an sechs anliegen. `gnugo-duell.js` versorgt `extra` jetzt; vier Werkzeuge brechen stattdessen ab, weil ihr Pass-Zähler auch Anomalien zählt oder sie Einzelstellungen bewerten; elf Aufrufer bleiben unberührt. **„GTP-2 ist erledigt" stimmt damit für zwei von sechs Wegen und ist für vier als Abbruch statt als Versorgung gelöst.**

## 4. Befund GTP-3: Befehlsnummern werden nicht erkannt

`antworte` nimmt das erste Wort als Befehl (Z. 98). Das GTP erlaubt jedem Befehl eine vorangestellte Nummer, und die
Antwort trägt sie dann ebenfalls. `17 protocol_version` fällt deshalb in `default` und wird abgelehnt; die
Fehlerantwort trägt keine Nummer.

**Gemessen** (§6): `17 protocol_version` → `? unbekannter Befehl`.

Betroffen sind nur Clients, die Nummern verwenden. GNU Go in den hiesigen Läufen tut es nicht — sonst wäre nie eine
Partie zustande gekommen.

## 5. Änderung

Alles in `gtp-ki.js`.

**GTP-1: eine Prüffunktion vor `setze`, nur im `play`-Zweig.**

```js
function pruefeRegeln(i, f) {
  if (i < 0) return;
  if (ko !== null && i === ko) throw new Error('Ko verboten: ' + zuGtp(i));
  if (board[i]) return;                        /* setze meldet das selbst */
  const probe = Uint8Array.from(board);
  probe[i] = f;
  E.removeDeadGroups(probe, 3 - f, i);
  if (E.floodFill(probe, i).liberties.length === 0) throw new Error('Selbstmord verboten: ' + zuGtp(i));
  if (hist.has(E.computeZobrist(probe))) throw new Error('Stellungswiederholung verboten: ' + zuGtp(i));
}
```

Die Selbstmord-Zeile ist **am 23.11.2026 ergänzt** worden; ohne sie behebt die Funktion nur zwei der drei Verbote
(§10.1). Sie braucht keinen neuen Export: `floodFill` steht schon in der Exportliste (Z. 49), und `setze` nutzt es in
Z. 90 genauso. Den Vorbehalt `captured === 0`, den `getLegalMoves` führt, braucht es hier nicht — wer schlägt, hat
danach zwangsläufig eine Freiheit.

`case 'play'` ruft sie vor `setze`. **Die Regelprüfung kommt nicht in `setze` hinein** — für GTP-2 bekommt `setze`
sehr wohl eine Zeile, siehe unten —, und `genmove` ruft die Prüfung nicht: Dort
kommt der Zug von der eigenen Engine, die den Ko-Punkt schon kennt. Eine Prüfung dort könnte einen Messlauf mitten
in der Partie abbrechen, ohne dass ein Gegner etwas falsch gemacht hätte.

Die Superko-Regel ist **positional** (`hist` speichert Brett-Hashes ohne Spieler am Zug) — dieselbe Regel, die die
Engine über `histHashes` anwendet.

**GTP-2: `extra` mitgeben.** Dafür führt der Adapter zwei Zustände nach: `letzterPass` (welche Farbe zuletzt gepasst
hat; `setze` setzt es bei einem Pass und löscht es bei einem Zug) und `komi` (aus dem `komi`-Befehl, Vorgabe 7,5).

**`neu()` setzt beide zurück** (ergänzt am 23.11.2026): `letzterPass` auf `null`, sonst leckt ein Pass über
`clear_board` in die nächste Partie — im Prozess je Partie fällt das nicht auf, in `tests/pwa.js` aber schon, weil es
mitten im Prozess `clear_board` schickt. Und `komi` auf 7,5. Alle heutigen Aufrufer senden `komi` **nach**
`clear_board` (`gnugo-duell.js` Z. 293, `passregel-fortsetzung.js` Z. 354 und 365), das Zurücksetzen ist also
gefahrlos; es ist aber eine Festlegung und steht deshalb hier.

```js
const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last,
  {gegnerPasste: letzterPass === 3 - f, wertung: 'flaeche', komi});
```

**Wertung `flaeche` als Festlegung:** GTP kennt keine Wertungsangabe, und die Messungen laufen mit GNU Go Stufe 1 als
Schiedsrichter nach Fläche (`CLAUDE.md`, Standardbedingungen). Wer Territory messen will, braucht dafür eine eigene
Festlegung.

**GTP-3: Nummer abspalten und zurückgeben.** `antworte` erkennt eine führende Zahl und merkt sie; die drei
Ausgabestellen (Z. 140 bis 142) schreiben `=17 …`, `=17` und `?17 …`. Ohne Nummer bleibt die Ausgabe wie bisher
(`= …`, `=`, `? …`).

**Randfall, ergänzt am 23.11.2026:** Eine Zeile, die nur aus einer Zahl besteht (`17` allein), wird nach dem Abspalten
ein leerer Befehl; Z. 136 fängt nur die ganz leere Zeile. Festlegung: Sie bleibt ein unbekannter Befehl und wird mit
`?17 unbekannter Befehl` beantwortet — wie heute, nur mit Nummer. Sie stillschweigend zu überspringen, würde einen
Client, der auf eine Antwort wartet, hängen lassen.

**Bewusst so:**
- **Die Fehlermeldungen nennen den Punkt** („Ko verboten: D4"), damit ein Protokoll zeigt, welcher Zug abgelehnt
  wurde.
- **Ein abgelehnter Zug beendet den Adapter nicht.** Die Schleife fängt den Wurf schon heute ab und antwortet mit
  `?` (Z. 142); das bleibt so.
- **`set_free_handicap` wird nicht geprüft.** Dort setzt der Adapter Vorgabesteine ohne Schlagen; Ko und Superko sind
  für Vorgabesteine ohne Bedeutung.

**Erwogen und verworfen:**
- *Die Prüfung in `setze`.* Dann prüfte sie auch die Züge der eigenen Engine. Liefert die KI je einen Zug, den die
  Prüfung ablehnt, bräche der Messlauf ab — ein Verhalten, das heute niemand erwartet und das einen Lauf zerstören
  könnte, statt ihn nur zu protokollieren.
- *`extra.wertung` aus einem neuen Kommandozeilenschalter.* Mehr Oberfläche für einen Fall, den niemand angefragt
  hat. Lässt sich nachrüsten, wenn Territory gemessen werden soll.
- *GTP-3 nur beim Erfolgsfall.* Die GTP-Spezifikation verlangt die Nummer auch in der Fehlerantwort; ein Client, der
  Nummern nutzt, ordnet sonst falsch zu.

**Nicht Teil der Korrektur:** TRAIN-1 (Umsetzung), TRAIN-2. Ob die Versuchsregel auch auf den anderen drei Wegen
versorgt werden soll (§3) — das wäre eine eigene Festlegung.

**Zur Frage, ob frühere PWA-Läufe von GTP-1 berührt waren** (am 23.11.2026 enger gefasst): `docs/bughunt-wiederholung.md`
§9 lässt sie offen. Für die drei heutigen Aufrufer ist sie aber **aus der Verdrahtung** beantwortbar, ohne die
Protokolle jener Läufe: der Adapter bekommt als `play` nur Züge unserer eigenen Engine, und die entstehen unter
vollständiger Regelprüfung (§2). Offen bleibt allein, ob je ein Lauf den Adapter anders getrieben hat.

## 6. Prüfung des Entwurfs am Prototyp (23.11.2026)

Die Änderungen aus §5 wurden in eine Kopie von `gtp-ki.js` **außerhalb des Repos** eingesetzt und lokal geprüft:
Node v22.23.5, Adapter gegen `index.html` am Stand `e20d5ff`, kein Netzwerk, keine Partie.

| | alter Adapter | Prototyp |
|---|---|---|
| `17 protocol_version` | **`? unbekannter Befehl`** | `=17 2` |
| `18 name` | **`? unbekannter Befehl`** | `=18 gtp-ki` |
| `19 bloedsinn` | `? unbekannter Befehl` (ohne Nummer) | `?19 unbekannter Befehl` |
| `protocol_version` ohne Nummer | `= 2` | `= 2` (unverändert) |
| Ko-Rücknahme: `list_stones W` danach | **`C5 B4 D4 C3`** — der verbotene Stein steht | `C5 B4 C3` — abgelehnt |
| `boardsize`/`clear_board`/`komi`/`play`/`genmove`/`list_stones` | funktioniert | funktioniert (`genmove W` → `C3`) |

**Was dabei nicht geprüft ist, und das soll die Umsetzung nachholen:**
- Die **Superko-Prüfung** (Stellungswiederholung) war hier nur am Code belegt. **Nachgeholt am 23.11.2026:** ausgelöst
  und gemessen, §10.1.
- Der **Selbstmord** fehlte in dieser Fassung ganz. §10.1 zeigt, dass §5 ihn ohne die ergänzte Zeile durchlässt.
- Eine **Gegenprobe gegen Fehlalarm** fehlte. Nachgeholt in §10.2, festgelegt als T-G2b.
- Die hier gebaute Ko-Stellung ist nicht angegeben und damit nicht nachrechenbar. Die Umsetzung verwendet stattdessen
  die Originalzugfolgen aus `reproduce.cjs` (§10.3).
- **GTP-2** ist nur am Code belegt: dass `extra` nun mitgeht. Eine tatsächlich ausgelöste Passregel (mit
  `--ki passNachGegnerpass=1`) ist nicht gezeigt; sie ist jetzt als T-G3b festgelegt.
- `node tests/pwa.js` ist am Prototyp noch nicht gelaufen.

## 7. Tests (in der Umsetzung)

Die Tests kommen in `tests/pwa.js`, wo „gtp-ki.js: Befehle, Schlagen, wiederholbarer genmove, Fehler" (Z. 41) schon
steht. Die Zeile in `tests/README.md` wird ergänzt.

Die Stellungen sind die aus `reproduce.cjs` (§10.3), nicht neu gebaute.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-G1 | Ko-Stellung, unmittelbare Rücknahme: Antwort beginnt mit `?`, der Stein steht danach **nicht** auf dem Brett, und Brett, Gefangene, Ko-Punkt, Historie und Zugzähler sind **unverändert** | scheitert: Antwort `=`, der Stein steht |
| **T-G1b** | **Selbstmord** (`play W A2`, `play W B1`, dann `play B A1`): wird abgelehnt, kein Stein ohne Freiheit auf dem Brett, Zustand unverändert | scheitert: Antwort `=`, A1 steht mit null Freiheiten |
| T-G2 | Stellungswiederholung (Superko) über Schlagen und Zurückschlagen: wird abgelehnt, Zustand unverändert | scheitert: wird angenommen |
| **T-G2b** | **Gegenprobe gegen Fehlalarm:** in derselben Ko-Stellung wird ein legaler Zug angenommen, ein Pass angenommen, und nach einem zwischenliegenden Zug ist der vorher verbotene Punkt erlaubt; der Ablauf des bestehenden Tests (`play b B1`, `play w A1`, `play b A2`) bleibt unverändert | besteht an beiden |
| T-G3 | `--ki passNachGegnerpass=1`, Gegner passt, dann `genmove`: Die Engine bekommt `extra.gegnerPasste === true`, `extra.wertung === 'flaeche'` und das über `komi` gesetzte Komi — geprüft über eine Attrappe für `getAIMove`, die die Argumentzahl und `extra` protokolliert | scheitert: `argc` 9, `extra` undefined |
| **T-G3b** | **Auslösung an und aus:** eine Stellung, in der die Regel greift, einmal mit `--ki passNachGegnerpass=1` und einmal ohne — mit Schalter passt die Engine, ohne zieht sie | scheitert: passt in keinem der beiden Fälle |
| T-G4 | `17 protocol_version` → `=17 2`; `19 bloedsinn` → `?19 …`; `17` allein → `?17 unbekannter Befehl`; ohne Nummer unverändert `= 2` | scheitert: `? unbekannter Befehl` |
| T-G5 | Kontrolle: ein gewöhnlicher Ablauf (`boardsize`, `clear_board`, `komi`, `play`, `genmove`, `list_stones`) läuft unverändert, und `genmove` liefert denselben Zug wie am alten Adapter (fester Seed) | besteht an beiden |

T-G1, T-G1b, T-G2, T-G3, T-G3b und T-G4 müssen am alten Adapter fehlschlagen und am neuen bestehen. T-G2b und T-G5
bestehen an beiden — T-G5 ist der Nachweis, dass die Zugwahl unberührt bleibt, T-G2b der, dass die neuen Prüfungen
keinen legalen Zug ablehnen.

**Die Zustandsinvarianz ist Vorgabe des Review-Auftrags**, nicht eine Zutat dieser Vorabfestlegung: codex
`HANDOFF.md`, GTP-1, Spalte „Reproduktion und erwartetes Verhalten": „**Bei Ablehnung müssen Brett, Gefangene, Ko,
Historie und Zugzustand unverändert bleiben**", und codex `docs/bughunt-verifikation.md`, Zeile GTP-1: „Ablehnung vor
jeder Zustandsänderung erforderlich." Die Prüffunktion aus §5 erfüllt das — sie arbeitet auf einer Kopie, liest `hist`
nur mit `has` und wirft vor `setze` —, aber erst T-G1, T-G1b und T-G2 belegen es. **Ohne die Selbstmord-Zeile wird die
Vorgabe verletzt**, weil dann Brett, `hist` und `mc` verändert werden (§10.1).

**T-G3b ebenfalls aus dem Auftrag:** „Gegnerpass einspielen und eine passende Auslösestellung mit Schalter an/aus
vergleichen. Komi und Wertungsmodus des GTP-Aufbaus explizit prüfen." Beides war in der alten Fassung von §7 nicht
abgedeckt.

## 8. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `index.html` ist **unverändert** (Prüfsumme vor und nach dem PR gleich); geändert sind nur `gtp-ki.js`,
   `tests/pwa.js`, `tests/README.md` und dieses Doc.
2. T-G1, T-G1b, T-G2, T-G3, T-G3b und T-G4 schlagen am alten Adapter fehl und bestehen am neuen; T-G2b und T-G5
   bestehen an beiden.
3. **Alle drei Verbote sind abgedeckt** — Ko, Superko und Selbstmord. Fehlt eines, ist der Lauf ungültig: die
   Vorabfestlegung hatte den Selbstmord bis zum 23.11.2026 ausgelassen (§2, §10.1).
4. **Bei jeder Ablehnung sind Brett, Gefangene, Ko-Punkt, Historie und Zugzähler unverändert** (Vorgabe des
   Review-Auftrags, §7).
5. Die bestehenden Tests in `tests/pwa.js` bleiben unverändert und bestehen — heute 5 Tests (nachgezählt).
6. `node tests/run.js` lokal grün, CI grün.
7. `auswertung/bughunt-20261116/pruefung.js` ist **nicht** anzuwenden: Es prüft `index.html`, die hier unberührt
   bleibt. Stattdessen wird die unveränderte Prüfsumme von `index.html` im Nachtrag genannt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 9. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge. Die Durchsicht vom 23.11.2026 ist eingearbeitet (§10);
   §2, §5, §7 und §8 haben sich dadurch inhaltlich geändert, nicht nur redaktionell.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §5, Tests nach §7, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §8 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 10. Nachtrag: Durchsicht und Nachmessung (23.11.2026)

Anlass: Hazeberry bat um eine Durchsicht dieser Vorabfestlegung. Nur Lesen und kurze lokale Funktionstests am echten
Adapterprozess — keine Partie, kein GNU Go, keine Messung, Node v22.23.5. Geprüft wurde unter anderem §5 **wörtlich**:
die Prüffunktion wurde in eine Kopie von `gtp-ki.js` außerhalb des Repos eingesetzt und der Adapter damit gefahren.

### 10.1 §5 in der alten Fassung behebt zwei von drei Verboten

| Fall | alter Adapter | §5 ohne Selbstmord-Zeile | §5 mit Selbstmord-Zeile |
|---|---|---|---|
| Ko-Rücknahme | `=`, Stein steht | `? Ko verboten: B2` | wie links |
| Wiederholung nach zwei Pässen | `=`, Stellung kehrt zurück | `? Stellungswiederholung verboten: B2` | wie links |
| Selbstmord `play B A1` | `=`, A1 mit null Freiheiten | **`=`, unverändert durchgelassen** | `? Selbstmord verboten: A1` |

Gemessen wurde außerdem, was der durchgelassene Selbstmord anrichtet: `countLiberties` des Steins ist 0,
`getLegalMoves` wirft darauf nicht, sondern liefert 358 Züge weiter, und bei der Wiederholung wächst `hist` nicht
mehr — der Hash steht schon im `Set`, die Wiederholung ist danach nicht mehr erkennbar.

### 10.2 Gegenprobe gegen Fehlalarm

Mit allen drei Prüfungen aktiv: legaler Zug `W T19` in der Ko-Stellung `=`, Pass `=`, `W B2` nach einem
zwischenliegenden Zug `=` (keine Wiederholung mehr), und der Ablauf des bestehenden Tests in `tests/pwa.js`
(`play b B1`, `play w A1`, `play b A2` schlägt A1) unverändert. Keine der drei Prüfungen lehnt einen legalen Zug ab.
Das ist jetzt T-G2b, denn eine zu scharfe Wiederholungsprüfung würde einen Messlauf hart abbrechen:
`gnugo-duell.js` (Z. 254) verwirft jede Antwort ohne `=`. Nebenbefund: Die Folge `B1`, `A1`, `A2` erzeugt **keinen**
Ko-Punkt, weil die schlagende Gruppe drei Freiheiten hat — der bestehende Test kommt den neuen Prüfungen nicht in die
Quere.

### 10.3 Die Originalzugfolgen aus `reproduce.cjs`

Nachgelesen in `Hazeberry/codex`, `auswertung/bughunt-20261107/reproduce.cjs` (in `main`). §6 hatte eine eigene
Ko-Stellung gebaut und sie nicht angegeben; mit diesen Folgen ist die Vorher-Nachher-Tabelle direkt mit dem Lauf vom
07.11. vergleichbar. Die Umsetzung verwendet sie:

- **Selbstmord:** `play W A2`, `play W B1`, `play B A1`, `list_stones B` → erwartet `= ` und `= A1`.
- **Ko:** Aufbau `play W B2`, `W A3`, `W C3`, `W B4`, `B A2`, `B B1`, `B C2`, `B B3`; dann `play W B2`,
  `list_stones W`, `list_stones B` → erwartet: angenommen, `B2` bei Weiß, `B3` nicht mehr bei Schwarz.
- **Superko:** derselbe Aufbau, dann `play W pass`, `play B pass`, `play W B2`, `list_stones W` → erwartet:
  angenommen.
- Helfer: `gtp-ki.js --html index.html`, Zeitgrenze 5 s, Exitcode 0 erwartet.

Der GTP-1-Block dort enthält keinen Kommentar; eine Begründung für die Wahl der Stellungen steht nirgends. Dass die
Eckstellung der billigste Selbstmord auf dem Brett ist — zwei Nachbarn statt drei am Rand oder vier im Zentrum, und
beide umgebenden Steine behalten eigene Freiheiten, es wird also nichts geschlagen — ist eine Lesart, keine Quelle.

### 10.4 Zurückgezogen

Eine Beanstandung aus der Durchsicht war falsch: **Die Quellenangabe in §3 stimmt.** `docs/bughunt-wiederholung.md` §9
beginnt mit „Die Passregel-Auslösung wird direkt über `passNachGegnerpassPruefung` geprüft, im Arm ‚weiter' ist die
Regel aus …". Was §3 jetzt zusätzlich nennt, ist Ergänzung, keine Berichtigung.

### 10.5 Was offen bleibt

- Ob **GNU Go 3.8** mit `--chinese-rules` eine positionelle Wiederholung ablehnt. **Beantwortet am 23.11.2026:
  nein.** Gemessen in Actions (`docs/gnugo-superko-vorabfestlegung.md` §8, Lauf 45176376828, GNU Go 3.8 aus dem
  Paket `3.8-11build2`): GNU Go lehnt Selbstmord und die unmittelbare Ko-Rücknahme mit `? illegal move` ab, nimmt
  die Wiederholung nach zwei Pässen aber mit `=` an — ohne `--chinese-rules` genauso. GNU Go hätte einen solchen
  Adapterzug also **nicht gemeldet**; vor dieser Korrektur hätte eine Wiederholung in beiden Richtungen still
  passieren können. Daraus folgt eine Präzisierung zu §2 und zum `HANDOFF.md` §4: eingehende `play`-Züge waren
  durch GNU Go **gegen Selbstmord und einfaches Ko** vorgeschaltet geschützt, **nicht gegen positionelle
  Wiederholung** — der Schutz war teilweise, nicht vollständig. Am Code ändert das nichts.
- `node tests/pwa.js` am Prototyp (§6). **Hinfällig seit der Umsetzung (23.11.2026).** Nicht nachgeholt,
  sondern überholt: Den Prototyp aus §6 gibt es nicht mehr, und was der Lauf zeigen sollte, ist am ausgelieferten
  Adapter gezeigt — §11.1 Nr. 2 nennt zwei volle Läufe von `node tests/pwa.js`, alt 7 von 11, neu 11 von 11. Am
  23.11.2026 noch einmal lokal nachgefahren: **11 von 11 bestanden**.
- GTP-3 wurde in dieser Durchsicht nur gelesen, nicht prototypisch gebaut. **Hinfällig seit der Umsetzung
  (23.11.2026).** Der Prototypschritt ist übersprungen, nicht nachgeholt: GTP-3 steht direkt im Adapter — `antworte`
  spaltet die Nummer ab (`gtp-ki.js` Z. 121 ff.) — und T-G4 prüft ihn mit sechs Prüfungen (Erfolgsantwort `=17 2`,
  Fehlerantwort mit Nummer). Am alten Adapter scheiterte T-G4 mit `? unbekannter Befehl` (§11.1 Nr. 2).
- Ob je ein Lauf den Adapter anders getrieben hat als über die drei in §2 genannten Aufrufer. Für diese drei ist die
  eingehende Richtung aus der Verdrahtung beantwortet, ohne Protokolle.

## 11. Nachtrag: Umsetzung und Abnahme (23.11.2026)

Hazeberry: „GTP-1 bis GTP-3 Go". Die Umsetzung folgt §5 und §7 ohne Abweichung in der Sache. Node v22.23.5, lokal;
keine Partie, kein GNU Go, kein Fuego, kein Messlauf.

### 11.1 Die sieben Abnahmepunkte

1. **`index.html` ist unverändert**, Prüfsumme `4827da81e18b7f59500c027316eaba36e75296c9eb1a0136dcc313469b11482c`
   (Abnahmepunkt 7 verlangt sie hier statt `pruefung.js`, das nur `index.html` prüft). **Abweichung von
   Abnahmepunkt 1:** Geändert sind fünf Dateien, nicht vier — `gtp-ki.js`, `tests/pwa.js`, `tests/README.md`, dieses
   Doc **und** `docs/bughunt-20261116.md` §3. Die fünfte verlangt §9 Nr. 2 ausdrücklich („eine Zeile in
   `docs/bughunt-20261116.md` §3"); §8 Nr. 1 hatte sie nur nicht mitgezählt. Sie ist reine Dokumentation.
2. **T-G1, T-G1b, T-G2, T-G3, T-G3b und T-G4 scheitern am alten Adapter und bestehen am neuen; T-G2b und T-G5
   bestehen an beiden.** Gemessen durch zwei Läufe von `node tests/pwa.js`, einmal mit dem Adapter am Stand
   `7382a19` an seiner Stelle: **alt 7 von 11 bestanden**, neu **11 von 11**. Die vier Fehlschläge am alten Stand
   sind genau die vorhergesagten, mit diesen Meldungen:
   - `Selbstmord abgelehnt: =` (der Block T-G1/T-G1b/T-G2 bricht beim ersten Fall ab)
   - `zehn Argumente: erwartet 10, bekommen 9` (T-G3)
   - `mit Schalter passt die Engine: erwartet = pass, bekommen = R4` (T-G3b)
   - `Erfolgsantwort mit Nummer: erwartet =17 2, bekommen ? unbekannter Befehl` (T-G4)
3. **Alle drei Verbote sind abgedeckt.** Am laufenden Adapter, mit den Zugfolgen aus §10.3:
   `? Selbstmord verboten: A1`, `? Ko verboten: B2`, `? Stellungswiederholung verboten: B2`.
4. **Bei einer Ablehnung bleibt der Zustand stehen.** Die Prüffunktion arbeitet auf einer Kopie, liest `hist` nur mit
   `has` und wirft vor `setze`; `setze` selbst wirft bei besetztem Feld ebenfalls vor jeder Änderung. **Grenze der
   Prüfung:** über GTP sind nur Brett und Weiterspielen beobachtbar — die Gefangenenzahl ist von außen nicht
   abfragbar. Belegt ist daher: nach der abgelehnten Ko-Rücknahme steht das Brett unverändert, der Ko-Punkt gilt
   weiter, und sobald die Stellung sich wirklich unterscheidet, ist derselbe Punkt erlaubt und schlägt (T-G1).
5. **Die fünf bestehenden Tests in `tests/pwa.js` sind unverändert und bestehen** — auch der ältere
   `gtp-ki.js`-Test mit `play b B1`, `play w A1`, `play b A2`, der den neuen Prüfungen nicht in die Quere kommt, weil
   die schlagende Gruppe drei Freiheiten hat und kein Ko-Punkt entsteht.
6. **`node tests/run.js` lokal: alle 60 Testdateien bestanden.** CI: siehe PR.
7. Erledigt mit Punkt 1.

### 11.2 Was über §7 hinaus gemessen wurde

**T-G3b spielt 397 Züge einer echten Partie ein** (`tests/stellungen/hand-427.sgf`, dieselbe Stellung wie in
`tests/passregel-versuch.js`) und prüft, dass **kein einziger** davon abgelehnt wird. Das ist die tragfähigste
Gegenprobe gegen Fehlalarm, die zur Verfügung steht — stärker als die synthetischen Fälle in T-G2b, die daneben
stehen bleiben. Danach: mit `--ki passNachGegnerpass=1` antwortet `genmove B` mit `pass`, ohne den Schalter mit einem
Stein (`R4`). Am alten Adapter liefern **beide** Arme `R4` — der Schalter war wirkungslos, wie §3 es beschreibt.

**T-G5 pinnt die Zugwahl auf eine Konstante.** Nach `set_random_seed 7` und `play b Q16` liefert `genmove w` den Zug
`R17`, am alten wie am neuen Adapter nachgefahren. Die Konstante steht im Test, mit Herkunftsangabe.

**T-G3 prüft Komi und Wertung ausdrücklich**, wie der Review-Auftrag es verlangt: eine Attrappe für `getAIMove`
protokolliert vier Aufrufe — `argc` 10, `gegnerPasste` true, `wertung` `flaeche`, das über `komi 6.5` gesetzte Komi
kommt als 6,5 an, nach `clear_board` wieder als 7,5, ein Steinzug löscht `letzterPass`, und ein Pass der eigenen
Farbe gilt nicht als Gegnerpass.

### 11.3 Umsetzung im Code

`gtp-ki.js` wächst von 145 auf 178 Zeilen. Neu: `pruefeRegeln` nach `setze`, der Aufruf im `play`-Zweig, die Zustände
`letzterPass` und `komi` samt Rücksetzen in `neu()`, die Zeile in `setze`, das zehnte Argument in `genmove`, die
Kennung in `antworte` und an den drei Ausgabestellen, und der Kopfkommentar. Die Exportliste (Z. 49) ist unverändert
— `floodFill`, `removeDeadGroups` und `computeZobrist` standen schon darin.

### 11.4 Was offen bleibt

- Ob **GNU Go 3.8** mit `--chinese-rules` eine positionelle Wiederholung ablehnt (§10.5). Unverändert offen; es
  braucht einen Lauf in Actions und ein eigenes Go.
- Die Versuchsregel auf den anderen drei Wegen (§3): eigene Festlegung, wie in §5 abgegrenzt.
- Ob je ein Lauf den Adapter anders getrieben hat als über die drei Aufrufer aus §2.
- Kein Messlauf: dass die Korrektur eine Messung verändert, ist nicht behauptet und nicht geprüft. T-G5 zeigt die
  Zugwahl an einer Stellung unverändert, nicht an allen.
