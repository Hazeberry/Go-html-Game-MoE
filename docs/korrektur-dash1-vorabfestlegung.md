# Korrektur DASH-1: Vorabfestlegung

**Stand: 23.11.2026. Status: umgesetzt (§8), Abnahme gültig, eine Abweichung von §7 in §8.2.** Befund aus
`docs/korrektur-net1-vorabfestlegung.md` §10.4, dort bei der Folgeprüfung zu NET-1 aufgefallen und als „braucht
eigene Vorabfestlegung und Go" vermerkt. Go von Hazeberry am 23.11.2026, als Punkt 2 einer Liste von vier.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR.

## 1. Grundsatz: Dieser Eingriff ändert den Block `policy-net`

`dashUpdate` steht in `<script id="policy-net">` (Z. 6928 bis 7432). Die Korrektur ändert damit **einen Engine-Block**
— wie NET-1, und aus demselben Grund harmlos für die Messwerkzeuge:

- `shared-go-logic` und `worker-ai` bleiben **byteidentisch**: `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66`
  und `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9`.
- `policy-net` steht heute auf `b0040fe8c0a9eecead4c88b6d9f209846734d98d9a3b2050bffc420b5f2db4d2` und **ändert sich**.
  Die neue Zahl nennt der Nachtrag, und **Abnahmepunkt 6** schreibt den Eintrag in
  `docs/korrektur-d1-w1-vorabfestlegung.md` §1 fest — genau die Folgebaustelle, die NET-1 §8 Nr. 2 benannt hat: Die
  nächste Korrektur würde sonst die veraltete Zahl zitieren und als „unberührt" belegen, was gar nicht geprüft ist.
- **Ein Engine-Vergleich wäre blind:** `ladeEngine` lädt den Block `policy-net` nicht, und `gnugo-duell.js`,
  `gtp-ki.js` und `auswertung/engine-vergleich.js` laden ihn ebenfalls nicht
  (`docs/korrektur-net1-vorabfestlegung.md` §8 Nr. 4 und Nr. 5). Die Werkzeuge, die gegen GNU Go und Fuego spielen,
  sind von dieser Änderung nicht berührt.

`PARAMS_DEFAULT` bleibt gleich. Kein Schalter, kein Messlauf. `dashUpdate` schreibt ausschließlich in die Anzeige und
geht nie in die Zugwahl ein.

## 2. Befund

Zeilen am Stand `93156e9`. `dashUpdate` (Z. 7409) holt seine Elemente über `el` und prüft **nur das erste**:

```js
    const el = id => document.getElementById(id);
    if (!el('pn-games')) return;
    el('pn-games').textContent = this.gamesPlayed;
    ...
    el('pn-wins').textContent  = ...;        /* Z. 7414, ungeprüft */
    el('pn-blend').textContent = ...;        /* Z. 7415, ungeprüft */
    const res = el('pn-result');             /* Z. 7416, ungeprüft */
    res.textContent = ...;
    const hp = el('pn-health');   if (hp)  { ... }   /* Z. 7421, geprüft */
    const bar = el('pn-warmup-bar'); if (bar) ...    /* Z. 7426, geprüft */
```

Von sechs Elementen sind also zwei geprüft, eines deckt der frühe Ausstieg, und **drei sind ungeprüft**.

**Gemessen** (Chromium headless, Elemente einzeln aus dem DOM entfernt, die vier Pflichtfelder vorher auf eine
Markierung gesetzt, damit sichtbar ist, was der Aufruf wirklich schreibt):

| Fall | Wurf | geschrieben |
|---|---|---|
| alle sechs da | kein | alle vier Pflichtfelder |
| `pn-wins` fehlt | **TypeError: Cannot set properties of null** | nur `pn-games` |
| `pn-blend` fehlt | **TypeError** | `pn-games`, `pn-wins` |
| `pn-result` fehlt | **TypeError** | `pn-games`, `pn-wins`, `pn-blend` |
| `pn-games` fehlt | kein | nichts — der frühe Ausstieg greift |
| `pn-health` und `pn-warmup-bar` fehlen | kein | alle vier |

**Zwei Folgen, nicht eine.** Der Wurf bricht den **Aufrufer** ab — dieselbe Fehlerklasse wie NET-1, denn `reset()`
(Z. 7405) und der Divergenzpfad von `trainGame` (Z. 7305) rufen `dashUpdate`, und beide stecken im Spielende. Und die
Anzeige bleibt **halb aktualisiert**: neue Spielzahl neben altem Siegestand.

**Was der Befund ausdrücklich NICHT sagt.** In der ausgelieferten `index.html` ist das **nicht erreichbar**: Alle
sechs IDs stehen in einem zusammenhängenden Markup-Block (Z. 7868 bis 7873), sie sind also immer gemeinsam da oder
gemeinsam weg. Im Worker und unter Node liefert `document.getElementById` durchgängig `null`, dort fängt der frühe
Ausstieg alles ab. **Es gibt keinen reproduzierten Ausfall im Spiel.** Erreichbar wäre der Fehler, wenn jemand das
Dashboard-Markup umbaut, ein Feld umbenennt oder eine Attrappe nur einen Teil der IDs bedient.

Der Befund ist damit **Robustheit und eine beseitigte Unsymmetrie**, keine Fehlerbehebung mit gemessener Wirkung. Dass
NET-1 den Weg `reset() → dashUpdate()` in Umgebungen überhaupt erst erreichbar gemacht hat, in denen er vorher
abbrach, ist der Anlass — nicht ein Vorfall.

## 3. Änderung

Eine Stelle in `dashUpdate`. Alle vier Pflichtfelder werden vorab geholt; fehlt eines, wird **gar nichts** geschrieben.

```js
    const el = id => document.getElementById(id);
    /* Alle vier Pflichtfelder vorab holen: fehlt eines, wird gar nichts
       geschrieben. Vorher pruefte nur pn-games, und ein fehlendes Geschwister
       liess die Anzeige halb aktualisiert und brach den Aufrufer ab (DASH-1). */
    const spiele = el('pn-games'), siege = el('pn-wins'),
          blend = el('pn-blend'), res = el('pn-result');
    if (!spiele || !siege || !blend || !res) return;
    spiele.textContent = this.gamesPlayed;
    const wr = this.gamesPlayed > 0 ? Math.round(this.wins/this.gamesPlayed*100) : 0;
    siege.textContent  = `${this.wins} (${wr}%)`;
    blend.textContent = `${(this.blendWeight*100).toFixed(0)}%`;
    res.textContent = ...
```

Der Rest der Funktion bleibt unverändert, `pn-health` und `pn-warmup-bar` behalten ihre eigenen Prüfungen.

**Bewusst so:**
- **Alles oder nichts.** Das ist die Semantik, die der heutige frühe Ausstieg schon hat — er gilt nur für das falsche
  Element. Eine halb geschriebene Anzeige ist schlechter als eine unveränderte: sie sieht richtig aus.
- **`pn-health` und `pn-warmup-bar` bleiben optional.** Sie sind später dazugekommen und könnten in einem älteren
  Dashboard fehlen. Ihre Prüfungen anzutasten würde Verhalten ändern, das niemand beklagt hat.
- **Keine Protokollzeile, keine Konsolenwarnung.** Ein fehlendes Anzeigefeld ist kein Zustand, den der Spieler oder
  das Protokoll klären könnte; es wäre Lärm bei jedem Aufruf. `dashUpdate` läuft mehrmals pro Partie.
- **Der Normalfall bleibt bitgleich.** Sind alle sechs Elemente da — also immer, im ausgelieferten Spiel — schreibt
  die Funktion dasselbe wie heute. T-DA2 belegt das.

**Erwogen und verworfen:**
- *Jedes Feld einzeln prüfen (`if (w) w.textContent = …`).* Fünf Prüfungen statt einer, und es lässt die halb
  aktualisierte Anzeige ausdrücklich zu — genau die Folge, die stört.
- *`el` tolerant machen, etwa eine Attrappe zurückgeben.* Das verdeckt einen echten Markup-Fehler dauerhaft und
  würde auch `pn-health` und `pn-warmup-bar` betreffen. Fehler sollen auffallen, nur nicht den Aufrufer mitnehmen.
- *Den `try/catch` um die Aufrufe von `dashUpdate` legen.* Behandelt den Fehler dort, wo er nicht entsteht, und
  verdeckt jeden anderen Fehler in der Funktion gleich mit.
- *Die Inline-Handler im Dashboard mitnehmen.* Das Dashboard ist durchgehend so geschrieben: 20 der 25
  Inline-Handler in `index.html` stehen dort, `onclick` wie `onchange`. CLAUDE.md verlangt es fuer **neue**
  Oberflaeche, bestehender Code verstoesst also nicht dagegen. Eine Umstellung waere ein eigenes Vorhaben mit
  eigener Festlegung, kein Beiwerk dieser Korrektur.

**Nicht Teil der Korrektur:** TRAIN-2. Die Frage, ob die Versuchsregel auch in `gnugo-duell.js`, `ab-harness.js` und
den Auswertungsskripten versorgt werden soll (Punkt 4 der Liste). Die Inline-Handler im Dashboard.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Benennung `T-DA…` — `T-D1`
ist von der Korrektur D-1 belegt.

**Eine Vorgabe zum Aufbau:** Die Tests setzen die vier Pflichtfelder vor jedem Aufruf auf eine **Markierung** und
lesen sie danach. Sonst ist nicht unterscheidbar, ob ein Feld geschrieben wurde oder noch einen Wert aus einem
früheren Schritt trägt. Der erste Entwurf dieser Messung hatte genau den Fehler und las Werte aus einer vorherigen
Probe (§6).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-DA1 | Fehlt `pn-wins`, `pn-blend` oder `pn-result`: `dashUpdate()` wirft nicht, und **kein** Pflichtfeld ist geschrieben | scheitert: TypeError, und die Anzeige ist halb aktualisiert |
| T-DA2 | Alle sechs da: die vier Pflichtfelder tragen dieselben Werte wie am alten Code (Kontrolle, Normalfall bitgleich) | besteht an beiden |
| T-DA3 | Nur `pn-health` und `pn-warmup-bar` fehlen: die vier Pflichtfelder werden trotzdem gesetzt (Kontrolle: die Optionalität bleibt) | besteht an beiden |
| T-DA4 | Fehlt `pn-games`: früher Ausstieg wie bisher, kein Wurf, nichts geschrieben (Kontrolle) | besteht an beiden |

T-DA1 muss am alten Code fehlschlagen und am neuen bestehen. T-DA2 bis T-DA4 bestehen an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `shared-go-logic` und `worker-ai` haben die Prüfsummen aus §1; `policy-net` hat eine neue, im Nachtrag genannte;
   `PARAMS_DEFAULT` ist unverändert. Der Diff an `index.html` liegt **ausschließlich** in `dashUpdate`.
2. T-DA1 schlägt am alten Code fehl und besteht am neuen; T-DA2 bis T-DA4 bestehen an beiden.
3. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen — heute 50 ausgeführte Tests.
4. `node tests/run.js` lokal grün, CI grün.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-dash1.json` abgelegt, mit Konsole, und in `SHA256SUMS` ergänzt.
6. Der Nachtrag in `docs/korrektur-d1-w1-vorabfestlegung.md` §1 nennt die neue `policy-net`-Prüfsumme, damit keine
   künftige Korrektur die veraltete zitiert.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (23.11.2026)

Die Änderung aus §3 wurde in eine Kopie von `index.html` **außerhalb des Repos** eingesetzt und im Browser gefahren:
Node v22.23.5, Chromium headless, kein Netzwerk, keine Partie.

| Fall | alter Code | Prototyp |
|---|---|---|
| alle sechs da | kein Wurf, alle vier geschrieben | **gleich** |
| `pn-wins` fehlt | TypeError, nur `pn-games` geschrieben | kein Wurf, **nichts** geschrieben |
| `pn-blend` fehlt | TypeError, zwei Felder geschrieben | kein Wurf, nichts geschrieben |
| `pn-result` fehlt | TypeError, drei Felder geschrieben | kein Wurf, nichts geschrieben |
| `pn-games` fehlt | kein Wurf, nichts geschrieben | **gleich** |
| `pn-health` und `pn-warmup-bar` fehlen | kein Wurf, alle vier geschrieben | **gleich** |

**Ein eigener Fehler bei dieser Messung, offen notiert:** Die erste Fassung der Probe lief alle Fälle auf **einer**
Seite und las die Feldwerte ohne Markierung. Damit standen dort Werte aus früheren Proben, und die Spalte
„geschrieben" war nichts wert; nur Wurf oder kein Wurf war belastbar. Mit der Markierung vor jedem Aufruf ist sie es.
Diese Vorgabe steht deshalb in §4.

**Was dabei nicht geprüft ist, und das soll die Umsetzung nachholen:**
- `node tests/pwa.js` und die volle Suite am Prototyp.
- Ein echtes Dashboard mit umgebautem Markup — die fehlenden Elemente sind im Test entfernt, nicht nie erzeugt.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit den Ergebnissen
   aus §5, der Eintrag nach Abnahmepunkt 6 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 8. Nachtrag: Umsetzung und Abnahme (23.11.2026)

Hazeberry: Go für die Liste und die PRs, autonom. Die Umsetzung folgt §3 und §4 ohne Abweichung in der Sache.
Node v22.23.5, Chromium headless, lokal; kein Messlauf.

### 8.1 Die sechs Abnahmepunkte

1. **`shared-go-logic` und `worker-ai` sind byteidentisch** (`54dfef2d…`, `f847c124…`), **`policy-net` steht jetzt auf
   `14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190`** (vorher `b0040fe8…`). `PARAMS_DEFAULT`
   unverändert. Der Diff an `index.html` ist **ein einziger Block** bei Z. 7408, also ausschließlich `dashUpdate`.
2. **T-DA1 schlägt am alten Code fehl und besteht am neuen; T-DA2 bis T-DA4 bestehen an beiden.** Zwei Läufe von
   `tests/browser-ui.js`, einmal gegen den `index.html` am Stand `93156e9`: **alt 53 von 54**, neu **54 von 54**. Die
   Meldung am alten Code: `ohneWins: kein Wurf: erwartet null, bekommen TypeError`.
3. **Die bestehenden 50 Tests in `tests/browser-ui.js` sind unverändert und bestehen.** Dass T-DA2 auch am alten Code
   besteht, ist der Nachweis für den Normalfall: dieselben vier Werte, `7`, `4 (57%)`, `0%`, `✓ Sieg`.
4. **`node tests/run.js` lokal: alle 60 Testdateien bestanden.** CI: siehe PR.
5. **`pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2.** Abgelegt als
   `docs/daten/bughunt-20261116/nach-dash1.json` mit `nach-dash1-konsole.txt`, beide in `SHA256SUMS` ergänzt;
   `sha256sum -c` bestätigt alle 41 Einträge.
6. **Der Nachtrag in `docs/korrektur-d1-w1-vorabfestlegung.md` §1 nennt die neue `policy-net`-Prüfsumme** und
   markiert sie ausdrücklich als die aktuelle.

### 8.2 Eine Abweichung von §7, offen benannt

§7 Nr. 2 verlangt „eine Zeile in `docs/bughunt-20261116.md` §3". **Die habe ich nicht geschrieben**, und zwar
absichtlich: Jener §3 heißt „Stand der älteren Befunde" und führt die Befunde des Bug Hunts vom 16.11. und der
Bughunt-Wiederholung — UI-1 bis UI-3, TRAIN-1, TRAIN-2, NET-1, GTP-1 bis GTP-3. **DASH-1 steht dort nicht**, der
Befund stammt aus der Folgeprüfung zu NET-1. Eine Zeile dort hätte einen Befund vermerkt, den das Doc nie erhoben
hat.

Stattdessen steht der Zeiger da, wo der Befund herkommt: `docs/korrektur-net1-vorabfestlegung.md` §10.4 trug ihn als
„braucht eigene Vorabfestlegung und Go" und hat jetzt einen Nachtrag, der auf dieses Doc verweist. Das ist dieselbe
Pflege, nur an der richtigen Stelle. Ich hatte §7 nach dem Muster der vorigen Korrekturen geschrieben, ohne zu
prüfen, ob der Befund in jenem §3 überhaupt vorkommt.

### 8.3 Was die Messung bestätigt und was sie nicht zeigt

Bestätigt: Der Normalfall bleibt bitgleich (T-DA2 an beiden Ständen), jeder Fehlfall wirft nicht mehr und schreibt
nichts (T-DA1), die Optionalität von `pn-health` und `pn-warmup-bar` bleibt (T-DA3), und der frühe Ausstieg bei
fehlendem `pn-games` arbeitet wie bisher (T-DA4).

Nicht gezeigt, und in §2 schon so festgehalten: **ein Ausfall im Spiel.** Die fehlenden Elemente sind im Test aus dem
DOM entfernt, nicht nie erzeugt; in der ausgelieferten `index.html` stehen alle sechs in einem Markup-Block. Die
Korrektur beseitigt eine Unsymmetrie und eine Fehlerklasse, keinen beobachteten Vorfall.

### 8.4 Geändert

`index.html` (nur `dashUpdate`), `tests/browser-ui.js` (T-DA1 bis T-DA4), `tests/README.md`, dieses Doc,
`docs/korrektur-d1-w1-vorabfestlegung.md` §1, `docs/korrektur-net1-vorabfestlegung.md` §10.4 und die beiden
Prüfdateien unter `docs/daten/bughunt-20261116/` samt `SHA256SUMS`.

### 8.5 Was offen bleibt

- Die **Inline-Handler im Dashboard**: 20 der 25 in `index.html` stehen dort (ab Z. 7865), `onclick` wie
  `onchange`. **Berichtigung meiner eigenen Notiz:** Ich hatte in einem frueheren Bericht von zwei Stellen
  gesprochen und sie als Regelverstoss bezeichnet. Beides war falsch: es ist ein durchgehendes Muster, und die
  Regel gilt fuer **neue** Oberflaeche, bestehender Code verstoesst also nicht. Eine Umstellung braeuchte eine
  eigene Festlegung; von dieser Korrektur ist nichts davon beruehrt.
- **TRAIN-2** steht weiter im Code, ohne Vorabfestlegung.
