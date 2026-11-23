# Korrektur GTP-1 bis GTP-3: Vorabfestlegung

**Stand: 23.11.2026. Status: Entwurf, nicht umgesetzt.** Befunde aus `docs/bughunt-wiederholung.md` §5 (GTP-1 bis
GTP-3), dort mit `reproduce.cjs` reproduziert. Go von Hazeberry am 22.11.2026: „die Vorabfestlegung für GTP-1 bis
GTP-3 vorbereiten und das ist ein go für den GTP PR".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR.

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

## 2. Befund GTP-1: Ko und Superko werden nicht geprüft

`setze` (Z. 84 bis 93) rechnet beides mit: den Ko-Punkt (Z. 89 f.) und die Stellungshistorie `hist` (Z. 92). Bei
`play` (Z. 112) wird **keines von beidem abgefragt**; geprüft wird nur, ob das Feld besetzt ist (Z. 86).

**Gemessen** (§6), Ko-Stellung von Hand gesetzt, Weiß nimmt unmittelbar zurück: Der alte Adapter nimmt den Zug an —
`list_stones W` zeigt danach `C5 B4 D4 C3`, der verbotene Stein steht auf dem Brett.

Betroffen ist, was **von außen** kommt: Ein Gegner wie GNU Go kann dem Adapter einen regelwidrigen Zug schicken, und
der Adapter widerspricht nicht. Nicht betroffen ist `genmove`: Dort kommt der Zug von der eigenen Engine, die den
Ko-Punkt als Parameter bekommt (Z. 118).

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
Adapter. GTP-2 ist eine Falle für künftige Läufe, kein Fehler in den bisherigen.

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
  if (hist.has(E.computeZobrist(probe))) throw new Error('Stellungswiederholung verboten: ' + zuGtp(i));
}
```

`case 'play'` ruft sie vor `setze`. **`setze` selbst bleibt unverändert**, und `genmove` ruft die Prüfung nicht: Dort
kommt der Zug von der eigenen Engine, die den Ko-Punkt schon kennt. Eine Prüfung dort könnte einen Messlauf mitten
in der Partie abbrechen, ohne dass ein Gegner etwas falsch gemacht hätte.

Die Superko-Regel ist **positional** (`hist` speichert Brett-Hashes ohne Spieler am Zug) — dieselbe Regel, die die
Engine über `histHashes` anwendet.

**GTP-2: `extra` mitgeben.** Dafür führt der Adapter zwei Zustände nach: `letzterPass` (welche Farbe zuletzt gepasst
hat; `setze` setzt es bei einem Pass und löscht es bei einem Zug) und `komi` (aus dem `komi`-Befehl, Vorgabe 7,5).

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

**Nicht Teil der Korrektur:** TRAIN-1 (Umsetzung), TRAIN-2. Die Frage, ob frühere PWA-Läufe von GTP-1 berührt waren —
`docs/bughunt-wiederholung.md` §9 lässt sie offen, und sie ist ohne die Protokolle jener Läufe nicht zu beantworten.

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
- Die **Superko-Prüfung** (Stellungswiederholung) ist nur am Code belegt, nicht ausgelöst. Der Ko-Teil ist gemessen.
- **GTP-2** ist nur am Code belegt: dass `extra` nun mitgeht. Eine tatsächlich ausgelöste Passregel (mit
  `--ki passNachGegnerpass=1`) ist nicht gezeigt.
- `node tests/pwa.js` ist am Prototyp noch nicht gelaufen.

## 7. Tests (in der Umsetzung)

Die Tests kommen in `tests/pwa.js`, wo „gtp-ki.js: Befehle, Schlagen, wiederholbarer genmove, Fehler" (Z. 41) schon
steht. Die Zeile in `tests/README.md` wird ergänzt.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-G1 | Ko-Stellung, unmittelbare Rücknahme: Antwort beginnt mit `?`, der Stein steht danach **nicht** auf dem Brett | scheitert: Antwort `=`, der Stein steht |
| T-G2 | Stellungswiederholung (Superko) über Schlagen und Zurückschlagen: wird abgelehnt | scheitert: wird angenommen |
| T-G3 | `--ki passNachGegnerpass=1`, Gegner passt, dann `genmove`: Die Engine bekommt `extra.gegnerPasste === true` — geprüft über eine Attrappe für `getAIMove`, die die Argumentzahl und `extra` protokolliert | scheitert: `argc` 9, `extra` undefined |
| T-G4 | `17 protocol_version` → `=17 2`; `19 bloedsinn` → `?19 …`; ohne Nummer unverändert `= 2` | scheitert: `? unbekannter Befehl` |
| T-G5 | Kontrolle: ein gewöhnlicher Ablauf (`boardsize`, `clear_board`, `komi`, `play`, `genmove`, `list_stones`) läuft unverändert, und `genmove` liefert denselben Zug wie am alten Adapter (fester Seed) | besteht an beiden |

T-G1 bis T-G4 müssen am alten Adapter fehlschlagen und am neuen bestehen. T-G5 besteht an beiden — er ist der
Nachweis, dass die Zugwahl unberührt bleibt.

## 8. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `index.html` ist **unverändert** (Prüfsumme vor und nach dem PR gleich); geändert sind nur `gtp-ki.js`,
   `tests/pwa.js`, `tests/README.md` und dieses Doc.
2. T-G1 bis T-G4 schlagen am alten Adapter fehl und bestehen am neuen; T-G5 besteht an beiden.
3. Die bestehenden Tests in `tests/pwa.js` bleiben unverändert und bestehen — heute 5 Tests.
4. `node tests/run.js` lokal grün, CI grün.
5. `auswertung/bughunt-20261116/pruefung.js` ist **nicht** anzuwenden: Es prüft `index.html`, die hier unberührt
   bleibt. Stattdessen wird die unveränderte Prüfsumme von `index.html` im Nachtrag genannt.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 9. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §5, Tests nach §7, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §8 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.
