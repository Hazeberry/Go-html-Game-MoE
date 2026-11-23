# Die Versuchsregel auf den Node-Wegen: Vorabfestlegung

**Stand: 23.11.2026. Status: Entwurf, nicht umgesetzt.** Offener Punkt aus
`docs/korrektur-gtp-vorabfestlegung.md` §3: Die Korrektur GTP-2 hat `gtp-ki.js` versorgt, „die anderen bleiben, wie
sie sind". Go von Hazeberry am 23.11.2026, als Punkt 4 einer Liste von vier.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge.

## 1. Der Befund, und warum meine eigene Formulierung daneben lag

Ich hatte den Punkt als „die Versuchsregel auch in `gnugo-duell.js`, `ab-harness.js` und den Auswertungsskripten
versorgen" beschrieben. **Das ist nach Durchsicht falsch.** Von den 20 Node-Aufrufstellen von `getAIMove` außerhalb
`index.html` und `tests/` kann der Schalter `passNachGegnerpass` nur an **sechs** überhaupt anliegen — nämlich dort,
wo frei gewählte PARAMS eingemischt werden. Alle anderen mischen nur feste Literale ein; dort steht der Schalter
immer auf 0, und eine Änderung wäre toter Code.

Gezählt (Suche nach `Object.assign(…PARAMS…)` mit einem freien Argument am Ende):

| Aufrufer | freie PARAMS | spielt aus? | Pass-Zählung |
|---|---|---|---|
| `gtp-ki.js` Z. 150 | `opt.ki` | ja | **versorgt seit GTP-2** |
| `gnugo-duell.js` Z. 449 | `opt.ki` | ja | **sauber** |
| `ab-harness.js` Z. 1152 | `cfg` (Arm) | ja | **verunreinigt** (§2) |
| `ab-harness.js` Z. 1390 | keine (Eröffnung) | ja | — |
| `auswertung/weiterspielen.js` Z. 130 | `opt[arm]` | ja | **verunreinigt** |
| `auswertung/diagnose/wurzel-replay.js` Z. 88 | `p.ki` | nein | — |
| `auswertung/lerner-pruefung.js` Z. 115 | `opt.ki` | nein | — |
| elf weitere in `auswertung/`, `distillation/collect.js` | nur feste Literale | teils | — |

`auswertung/endspiel/passregel-fortsetzung.js` Z. 222 hat freie PARAMS und **prüft schon** (Z. 220: `throw`, wenn
`passNachGegnerpass !== 0`). Das ist der Vorgang, dem diese Festlegung folgt.

## 2. Zwei Fallen, die ein blindes „`extra` überall mitgeben" aufgerissen hätte

**Falle 1: Der Pass-Zähler zählt nicht nur Pässe.** `gegnerPasste` aus dem vorhandenen Zähler abzuleiten wäre an
drei Stellen **falsch**:

- `ab-harness.js` Z. 1219: ein Zug auf ein besetztes Feld oder ohne Koordinate erhöht `passes` als **Anomalie**
  (`anomalies++; passes++`). Nach einer Anomalie hätte die Engine „der Gegner hat gepasst" gehört, obwohl er zog.
- `auswertung/weiterspielen.js` Z. 132: `if (i < 0 || board[i])` erhöht `passes` — das deckt Pass, **Aufgabe** (weil
  `i` für jeden Nicht-Stein −1 wird) und besetztes Feld in einem Zweig.
- `distillation/collect.js` Z. 38 und 40: dasselbe Muster.

**Sauber ist nur `gnugo-duell.js`:** Aufgabe wird vorher abgefangen (Z. 450 `break`), ein besetztes Feld wirft
(Z. 488), und `paesse` zählt damit ausschließlich echte Pässe beider Seiten.

**Falle 2: `ab-harness.js` sagt zu, komi-blind zu sein.** Die Hilfe des Werkzeugs, Z. 49 bis 51:

> `--komi <f>` Komi für die Wertung (Default: 7.5). Hinweis: Die Engine selbst ist komi-blind — `--komi` ändert
> **NUR die Abrechnung, nie einen Zug**.

`passNachGegnerpassPruefung` rechnet mit `extra.komi` (`index.html` Z. 5228). Würde `ab-harness.js` `extra` mitgeben,
wäre diese Zusage bei eingeschaltetem Schalter nicht mehr wahr. Mit Schalter aus bliebe sie es — aber eine Zusage,
die nur manchmal gilt, ist keine.

## 3. Änderung

**(a) `gnugo-duell.js` bekommt `extra`.** Es ist das einzige Werkzeug, das ausspielt, einen sauberen Pass-Zähler
führt und ein echtes Komi kennt (`KOMI`, Z. 203: 0,5 mit Vorgabe, sonst 7,5). Die Wertung ist `flaeche`: GNU Go läuft
dort mit `--chinese-rules`.

```js
const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last,
  {...extra, gegnerPasste: paesse >= 1, wertung: 'flaeche', komi: KOMI});
```

`extra` trägt dort schon das Kandidaten-Orakel (Z. 447); die Felder werden ergänzt, nicht ersetzt. **`paesse >= 1`
ist hier richtig**, weil der Zähler sauber ist (§2) und beim eigenen Zug unmittelbar vorher der Gegner am Zug war.

**(b) Vier Stellen bekommen einen Wächter statt `extra`:** `ab-harness.js` (Z. 1152), `auswertung/weiterspielen.js`,
`auswertung/diagnose/wurzel-replay.js` und `auswertung/lerner-pruefung.js`. Nach dem Vorgang aus
`passregel-fortsetzung.js` Z. 220:

```js
if (PARAMS.passNachGegnerpass >= 1)
  throw new Error('passNachGegnerpass: dieses Werkzeug versorgt extra nicht, die Regel wuerde still ausfallen '
                  + '(docs/passregel-wege-vorabfestlegung.md)');
```

**Warum Wächter und nicht versorgen:**
- **`ab-harness.js`:** Falle 2. Die Zusage „komi-blind" ist der Grund, warum man dem Werkzeug A/B-Vergleiche
  zutraut. Eine Passregel-Messung über `ab-harness` hätte ohnehin einen eigenen Entwurf gebraucht — die Stufe C
  wurde an Archivstellungen gerechnet, nicht ausgespielt (`docs/passregel-vergleich.md` §2).
- **`weiterspielen.js`:** Falle 1, und es ist ein Diagnosewerkzeug für eine bestimmte Untersuchung, kein Messstand.
- **`wurzel-replay.js` und `lerner-pruefung.js`:** Sie bewerten **Einzelstellungen**. `gegnerPasste` hat dort keinen
  Wert, den man herleiten könnte; die Angabe müsste aus den Daten kommen, und die tragen sie nicht.

**(c) Nichts ändert sich** an den elf Aufrufern mit festen Literalen, an `collect.js`, an `ab-harness.js` Z. 1390
(Eröffnung ohne Arm-Parameter, Schalter immer 0) und an `passregel-fortsetzung.js` (prüft schon). Ein Wächter dort
wäre toter Code.

**Die Engine bleibt unberührt.** `index.html` wird nicht angefasst: keine Zeile, kein Parameter. Damit bleiben alle
drei Engine-Blöcke byteidentisch und ein Engine-Vergleich ist nicht nötig.

**Erwogen und verworfen:**
- *Die Warnung in die Engine legen — `passNachGegnerpassPruefung` meckert, wenn der Schalter an ist und `extra`
  fehlt.* Das würde **alle** Aufrufer auf einmal abdecken, auch künftige, und wäre der sauberste Ort. Es ändert aber
  den Block `worker-ai`, auf dessen Byteidentität sich jede bisherige Korrektur beruft, und `ladeEngine` lädt diesen
  Block — ein Engine-Vergleich wäre **nicht** blind, sondern nötig, in Actions und nach eigenem Go. Das ist mehr
  Aufwand und mehr Risiko als vier Wächter in Werkzeugen. Wenn jemand es später doch will, ist es eine eigene
  Festlegung.
- *Überall `extra` mitgeben.* Falle 1 und Falle 2. An den Einzelstellungs-Skripten wäre es zudem erfunden.
- *Den Wächter als Warnung statt als Abbruch.* Eine Warnung im Protokoll eines Messlaufs geht unter; der Fall ist
  genau der, in dem jemand eine Messung für gültig hält, die ohne die Regel lief. Abbruch ist hier die mildere Folge.

**Nicht Teil der Korrektur:** TRAIN-2. Die Frage, ob die Versuchsregel überhaupt eingeschaltet werden soll — sie
bleibt auf 0, aus keinem Ergebnis folgt eine Aktivierung (`docs/passregel-vergleich.md`).

## 4. Tests (in der Umsetzung)

Benennung `T-PW…`, in `tests/passregel-versuch.js`, wo die Verdrahtung der Regel schon geprüft wird (Z. 101).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-PW1 | `gnugo-duell.js` gibt `extra` mit `gegnerPasste`, `wertung` `flaeche` und `komi` weiter — über eine Attrappe für `getAIMove`, die Argumentzahl und `extra` protokolliert | scheitert: `argc` 9 bzw. `extra` ohne die Felder |
| T-PW2 | Nach einem Gegnerpass steht `gegnerPasste` auf true, nach einem Steinzug auf false | scheitert |
| T-PW3 | Mit Vorgabe trägt `extra.komi` 0,5, ohne Vorgabe 7,5 | scheitert |
| T-PW4 | Die vier Wächter brechen mit `--ki passNachGegnerpass=1` ab und nennen den Grund | scheitert: sie laufen still durch |
| T-PW5 | Kontrolle: mit Schalter 0 verhalten sich alle fünf Werkzeuge **bitgleich** — dieselben Züge wie vorher bei festem Seed | besteht an beiden |

T-PW1 bis T-PW4 müssen am alten Stand fehlschlagen und am neuen bestehen. T-PW5 besteht an beiden und ist der
Nachweis, dass der Standardfall unberührt bleibt.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `index.html` ist **unverändert** (Prüfsumme vor und nach dem PR gleich), alle drei Engine-Blöcke byteidentisch.
2. T-PW1 bis T-PW4 schlagen am alten Stand fehl und bestehen am neuen; T-PW5 besteht an beiden.
3. Die bestehenden Tests in `tests/passregel-versuch.js` bleiben unverändert und bestehen.
4. `node tests/run.js` lokal grün, CI grün.
5. Die Hilfe von `ab-harness.js` (Z. 49 bis 51) nennt den Wächter, damit die Zusage „komi-blind" nachprüfbar bleibt.
6. Kein Messlauf. Mit Schalter 0 — dem Standard — ist jedes Werkzeug bitgleich; es gibt nichts zu messen.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR: Code nach §3, Tests nach §4, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/korrektur-gtp-vorabfestlegung.md` §3, wo der offene Punkt steht.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.
