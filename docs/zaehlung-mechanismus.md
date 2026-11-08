# Diagnosezustand: Zählabweichung, Vorschau gegen GNU-Go-Tot-Liste, Bughunt gegen die eigene `index.html`

Nachtrag, 08.11.2026. **Status: nur Dokumentation, Skripte und Ausgaben.** Keine Spieländerung (`index.html` und `gtp-ki.js` unverändert), kein Actions-Lauf, kein GNU Go,
keine Partie. Die Passregel `passNachGegnerpass` bleibt ausgeschaltet. Dieses Doc erteilt kein Go für Korrekturen, Schalter oder Läufe; Hazeberry liest es vor dem Merge.

Alle Zahlen stammen aus den Ausgaben unter [`daten/zaehlung-mechanismus/`](daten/zaehlung-mechanismus/README.md) (erzeugt von den Skripten in
[`../auswertung/zaehlung-mechanismus/`](../auswertung/zaehlung-mechanismus/)). Was „gelesen“ heißt (Code gelesen, nicht ausgeführt), steht jeweils dabei.

## 1. Anlass, Freigabe, Abgrenzung

- Vier offene Punkte aus `HANDOFF.md` §4 (Stand vor diesem Nachtrag) und `docs/bughunt-wiederholung.md` §8 und §9: Zählabweichung bei 15 Einheiten; warum die Zählvorschau von GNU Go als tot geführte
  Gruppen nicht entfernt; `browser.cjs` gegen die eigene `index.html`; ob GTP-1 und GTP-3 die PWA-Läufe berühren.
- Hazeberry hat am 08.11.2026 ein Go für diese Untersuchung gegeben („Alle, sofern es Sinn macht“). Sie lief **lokal** und nur lesend auf den gesicherten Rohdaten (ZIP in
  `docs/daten/passregel-vergleich/stufe-c-42331033107/`) und der `index.html` dieses Repos. Der Ablauf rechnet alle 563 Stellungen der Stufe C, aber ohne GNU Go und ohne Partie.
- Nicht Teil dieses Nachtrags: jede Änderung am Spiel, die Vorabfestlegung für eine Augenprüfung, die Ursachenuntersuchung der 15 Zählabweichungen (braucht GNU Gos Punktklassen und damit einen Actions-Lauf),
  die Prüfung der vom Adapter erzeugten Züge (§3). Diese Punkte sind in §9 getrennt aufgeführt.

## 2. Quellenstände

| Was | Stand |
|---|---|
| Repo-Stand der Untersuchung | `main` bei `3454039b375920fc77fe994797ff01cc70e22a41` (Merge von PR #289) |
| `index.html` (alle Rechnungen) | SHA-256 `d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b`; gleich der `index.html` des Stufe-C-Hauptlaufs (`docs/passregel-vorsprung.md` §9) |
| `gtp-ki.js` | SHA-256 `ab118527fe072a9e0d77a83b6a22c3c689110881dcf649bdc352b810b4b0fb94` (byteidentisch zu `Hazeberry/codex`, `docs/bughunt-wiederholung.md` §2) |
| `gnugo-duell.js` (gelesen) | SHA-256 `5a6c11db2e56589a59b3f2452d10814614ebcadd1e4b6493ebf035accf81c9a0` |
| Rohdaten Stufe C | `bericht.zip`, SHA-256 `0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08` (Lauf 42331033107, Artefakt 13557498693); `lauf.sh` bricht ab, wenn der SHA abweicht |
| `Hazeberry/codex` (nur für `browser.cjs`) | Standardbranch, Commit `04a9287b3098055ea76be37e3685e009c1f7d45c` |
| `browser.cjs` | SHA-256 `346378627bfb4a4f2cdc7062ab2b4882f178f2e0bde9440650e3aaa3bf3a7ec5` (`auswertung/bughunt-20261107/` in codex) |
| `tests/browser-rahmen.js` (codex, vom Skript geladen) | SHA-256 `b12e105ca0fd129661e5ef23af17b966c2e27c6ef24f9844f1b4c7416b977c41` |
| Umgebung | Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12 (headless), Container der Cloud-Sitzung |

## 3. Teil A: GTP-1 und GTP-3 in den PWA-Läufen (gelesen, nicht gemessen)

Die Gruppe „alte PWA“ stammt aus Läufen, in denen `gnugo-duell.js` die KI einer alten `index.html` über `gtp-ki.js` als Gegner spielen ließ (`--gegner ki`, Variable `fu`).
Zeilen aus `gnugo-duell.js` am Stand oben.

**GTP-3 (Befehlsnummern):** `gtpStarten` schreibt `befehl + '\n'` ohne Nummer (Z. 257). An den Adapter gehen nur `boardsize`, `clear_board`, `komi`, `set_random_seed` (`kiStarten`, Z. 292 bis 295), `play`
(Z. 471), `genmove` (Z. 478) und `list_stones` (Z. 508); mit Vorgabe käme `set_free_handicap` (Z. 415) dazu, `pwa-spielen.sh` nutzt `--vorgabe 0`. Alle diese Befehle kennt der Adapter.
**Nach dem Gelesenen berührt GTP-3 die PWA-Läufe nicht.**

**GTP-1 (der Adapter prüft bei `play` weder Ko noch Superko noch Selbstmord, `gtp-ki.js` Z. 84 bis 93 und 112):** Hier sind zwei Richtungen zu trennen.

1. **Eingehende `play`-Züge (unsere Engine an den Adapter):** Unsere Züge gehen zuerst an GNU Go (Z. 470) und danach an den Adapter (Z. 471). Ein von GNU Go abgelehnter Zug beendet die Partie als „abgebrochen“
   (`partie()` Z. 359 bis 365, Muster `(GNU Go|KI-Gegner): (play|genmove|…)`). Diese Richtung ist damit durch die vorgeschaltete Prüfung von GNU Go geschützt, **soweit GNU Go die Regel prüft**. Wie GNU Gos Ko-Regel
   (`--chinese-rules`, Standard-Ko) zur Regel der App (Superko über die Zobrist-Historie `hist`) steht, habe ich nicht verglichen.
2. **Vom Adapter selbst erzeugte `genmove`-Züge (Adapter an GNU Go und unsere Seite):** Der Adapter wählt den Zug mit `getAIMove` und übergibt dabei `ko` und `hist` (`gtp-ki.js` Z. 118); die Legalität hängt dort an der
   Engine der alten Datei. Danach bekommt GNU Go den Zug als `play` (Z. 483) und `gnugo-duell.js` prüft die Besetzung (Z. 489). Das fängt Besetzung und das, was GNU Go ablehnt. **Nicht geprüft** ist, ob ein
   Adapterzug nach der Regel der App illegal war (Superko über `hist`, Selbstmord), den GNU Go dennoch angenommen hätte. Der Brettabgleich am Partieende (`list_stones`, Z. 502 bis 511) erkennt nur abweichende Bretter, keine
   Regelverstöße, die zum selben Brett führen.

**Folgerung:** „GTP-3 berührt die PWA-Läufe nicht“ ist nach dem Gelesenen belegt. „GTP-1 berührt die PWA-Läufe nicht“ ist **nicht gesichert**: für eingehende Züge geschützt, für vom Adapter erzeugte Züge **offen**.
Eine Prüfung hieße, die archivierten Adapterzüge der Gruppe „alte PWA“ (`docs/daten/pwa-vergleich/`) Zug für Zug gegen eine Regelprüfung zu spielen. Sie wurde nicht durchgeführt und hat kein Go (§9).

## 4. Teil B: `browser.cjs` gegen die eigene `index.html` (gemessen)

Aufruf: `browser.cjs --html index.html` aus `Hazeberry/codex` (Stand §2), das `tests/browser-rahmen.js` aus codex lädt; Seitenaufrufe nur `127.0.0.1`, frische Browserkontexte, kein Nutzerprofil.
Ausgabe: `daten/zaehlung-mechanismus/browser/`, `browser-konsole.txt`, `browser-vergleich.txt`.

- Selbsttest Exit 0 (9 Prüfungen der Statuslogik). Voller Lauf Exit 1: **alle sieben Fälle „reproduziert“** (UI-1, TRAIN-1.pass, TRAIN-1.resign, UI-2, UI-3, TRAIN-2, NET-1), keine Seitenfehler, kein Startfehler.
  Exit 1 heißt nur „mindestens ein Fall reproduziert“; die Einzelstatus stehen in `browser/bericht.json`.
- Vergleich mit dem Bericht der Wiederholung (`docs/daten/bughunt-wiederholung/lauf1/browser/bericht.json`, dort die `index.html` aus codex): Status je Fall gleich. Bei sechs Fällen sind alle Felder gleich. Bei UI-3
  unterscheiden sich nur die drei Pixel-Hashes (`screenshotHash`, `cleanHash`, `cachedHash`); die Beziehungen (Bild nach Pass gleich Cache, ungleich Neuaufbau) sind gleich.
- **Die Pixel-Hashes sind auch zwischen Läufen mit derselben Datei verschieden** (`screenshotHash` des ersten eigenen Laufs `12b43ad1…`, des zweiten `a00abf0e…`, des dritten, abgelegten `dee051bd…`; Wiederholung `243c1d10…`; auch die PNG-Dateien sind nicht bytegleich). Die Abweichung
  gegenüber der Wiederholung ist daher kein Hinweis auf einen Unterschied der Dateien. Warum die Hashes schwanken, habe ich nicht untersucht.
- Gesichtet (abgelegter dritter Lauf): `UI-3.nach-pass.png` (acht orange Kreuze oben rechts) und `UI-3.nach-neuzeichnen.png` (keines). Die übrigen Bilder nicht.
- **Gültigkeit des Browserteils (nur zwei Zustände):** `browser-teil.sh` löscht vor dem Lauf alle früheren Browserausgaben und lässt für `browser.cjs` nur Exit 0 und 1 zu (jeder andere Exit ist ein technischer Fehler, der
  den Gesamtlauf rot macht). Ein Exit 1 allein genügt nicht, weil `node` auch bei einem technischen Fehler (etwa fehlendes Skript) mit 1 endet. Maßgeblich ist der Bericht: `browser-vergleich.js` verlangt, dass er lesbar ist,
  keinen Startfehler und eine Browserversion nennt, zur geprüften `index.html` (SHA-256) gehört, nicht älter ist als der Start des Laufs und alle sieben Pflichtfälle genau einmal mit Status „reproduziert“ oder „nicht_reproduziert“ enthält;
  sonst „KEIN URTEIL“ mit Grund und Exit 1. Geprüft von `tests/zaehlung-mechanismus.js` (Attrappen-`browser.cjs`, vier Mutationen der Skripte wurden erkannt).
- `reproduce.cjs` (neun Prüfungen unter Node) wurde **nicht** gegen diese Dateien ausgeführt; es prüft fest eingebaute Hashes der codex-Dateien und müsste dazu geändert werden.

Die Befunde UI-1, UI-2, UI-3, TRAIN-1, TRAIN-2 und NET-1 sind damit auch an der `index.html` dieses Repos in dieser Umgebung (nur Chromium 153) reproduziert. Das bestätigt die Übertragbarkeit der Abläufe, ist aber
weiterhin keine Spielstärkemessung und keine Aussage über echte Nutzerprofile oder andere Browser (`docs/bughunt-wiederholung.md` §6 und §8 gelten unverändert).

## 5. Teil C: Zählabweichung bei 15 Einheiten (Rohdaten gelesen)

Quelle: `daten/zaehlung-mechanismus/zaehl-liste.txt` (aus `diagnose.anfang`/`.ende` je Ergebniszeile und `bericht/zahlen.json`).

- Bestätigt an den Rohdaten: **16 Stellungen in 15 Einheiten** (14 alte PWA, 1 Fuego 50 Spiele) mit „Fläche aus Tot-Liste ≠ `final_score`“, Unterschiede −29 bis +10 (`docs/passregel-vergleich.md` §15).
- Verglichen werden **GNU Gos `final_score` und die App-Zählregel, angewandt auf GNU Gos eigene Tot-Liste**. `toteSteineAmEnde` ist daran nicht beteiligt; diese Abweichung hat mit Teil D nichts zu tun.
- Muster der gespeicherten Punktabweichungen (nur Zählung der Texte, keine Deutung): „GNU Go Gebiet, unser Besitzer neutral“ (7 Stellungen, davon die großen Fälle `41|312` mit −29 bei 22 Punkten und `286|311` mit +10 bei 11 Punkten),
  „Seki, unser Besitzer W/S“ (`26|335` beide Stellungen, `212|337`, `360|335`) und „Dame, unser Besitzer S/W“ (acht Stellungen, meist ein bis zwei Punkte, bei `26|335` und `360|335` je acht). Mehrere Muster können in einer Stellung zusammen auftreten (Tabelle).
- **Nicht erklärt:** `alte PWA|m1.jsonl.gz|49|318` (Unterschied +1) hat keine gespeicherte Punktabweichung. Warum GNU Go einen Punkt als Gebiet, Seki oder Dame führt, wo die App-Regel einen Besitzer oder neutral zuordnet,
  geben die Daten nicht her; sie enthalten GNU Gos Punktklassen nur als Text der Abweichungen und nur für diese Stellungen.
- Ein Fehler eines der beiden Verfahren ist nicht gezeigt. Eine Ursachenuntersuchung braucht GNU Gos `final_status_list` je Stellung, also einen Actions-Lauf (wie die Zähldiagnose, `docs/passregel-zaehldiagnose.md`), und hat kein Go (§9).

## 6. Teil D: Warum behält die Zählvorschau Gruppen, die GNU Go als tot führt?

Skripte: `mechanismus.js`, `kennzahlen.js`, `benson-unabhaengig.js`, `gegenprobe.js`, `falschesauge.js`. Eingabe sind die Anfangsstellungen (`diagnose.anfang`) aller 563 Ergebniszeilen und GNU Gos Tot-Liste dazu.
Rechnungen mit Änderungen an `index.html` laufen nur an **Test-Kopien** im Arbeitsverzeichnis, nie im Repo. Beim Mitschreiben (`mechanismus.js`) muss die Tot-Menge der Test-Kopie in jeder Stellung gleich der des Originals
sein; sie war es in 563 von 563 (`mechanismus.txt`).

**Begriffe.** „Kette“ = zusammenhängende Steine gleicher Farbe. **Typ A** = eine Kette, die GNU Go ganz als tot führt und die `toteSteineAmEnde` behält; **Typ B** = umgekehrt. V = Stellungen der Fläche mit
Referenzstand < 0 (KI-Sicht, `final_score`), wie in `docs/passregel-vorsprung.md`.

### 6.1 Befund (gemessen, `kennzahlen.txt`)

- V: 18 von 563 Stellungen, alle aus den Gruppen Fuego 50 Spiele und Fuego 100 Spiele (gleich `docs/passregel-vorsprung.md` §9).
- Typ A: 98 Ketten in 31 Stellungen, davon **71 Ketten in den 18 V-Stellungen**. Von den 98 sind 79 in der Farbe der KI und 19 in der des Gegners; in V sind alle 71 in der Farbe der KI. Typ B: 21 Ketten in 13 Stellungen,
  davon 10 Ketten in 7 V-Stellungen, alle in der Farbe des Gegners.
- Typ A kommt in allen Gruppen vor (alte PWA 11 Stellungen, Fuego 50 Spiele 14, Fuego 100 Spiele 4, GNU Go 2); zu einem Vorzeichenwechsel (V) führt es nur bei Fuego. Warum nur bei Fuego, ist nicht untersucht.

### 6.2 Schutzgrund der behaltenen Ketten (gemessen)

- Alle Typ-A-Ketten außer zweien (96 von 98, in V alle 71) liegen in einem **Verband**, der größer ist als die Kette (Verbände: Ketten gleicher Farbe mit gemeinsamer Freiheit oder am selben Auge, Kommentar zu
  `toteSteineAmEnde` in `index.html`). Verbandsgrößen reichen bis 141 Steine.
- Schutzgrund (am Ende der Rechnung, Mehrfachnennung): zwei Augen 85 der 98 Ketten, großes Auge 33; ein Benson-Beweis für den Verband bei 16.
- Von den 27 verschiedenen geschützten Verbänden in V leben **20 allein durch mindestens zwei Regionen mit höchstens 2 Punkten**, fünf haben eine Benson-Kette im Verband und Regionen ab 6 Punkten (117 bis 141 Steine), zwei
  haben Regionen mit 1 und 4 Punkten (`kennzahlen.txt`, Liste am Ende).

### 6.3 Unabhängige Benson-Prüfung (gemessen, `benson.txt`)

Eine eigene Benson-Implementierung (Lehrbuchform, `benson-unabhaengig.js`) stimmt mit `bensonClassify` der App in **563 von 563** Stellungen überein. In GNU Gos Tot-Liste steht in **keiner** Stellung ein Stein, der
(nach dieser Rechnung) Benson-lebendig ist. Der Benson-Schutz in 6.2 betrifft also den Verband, nicht die GNU-tot-Kette selbst.

### 6.4 Gegenprobe „keine Verbandsbildung über gemeinsame Freiheiten“ (gemessen, `gegenprobe-freiheitsverband.txt`)

In der Test-Kopie ohne diese Verbandsbildung (Verbände nur über gemeinsame Augen) ändert sich in V fast nichts: Steine „nur GNU tot“ 362 auf 360, Steine „nur App tot“ 80 auf 132, in V weiterhin 0 von 18 Stellungen mit gleicher Tot-Menge.
**Die Gegenprobe spricht gegen die Verbandsbildung über gemeinsame Freiheiten als Hauptursache in diesen Stellungen.** Sie schließt nicht aus, dass sie in anderen Stellungen oder zusammen mit anderen Teilen der Regel
(Verbandsbildung über gemeinsame Augen, Schutz durch Benson im Verband) eine Rolle spielt. Meine erste Vermutung während der Untersuchung war diese Verbandsbildung; sie hat sich in dieser Gegenprobe nicht gehalten.

### 6.5 Ein-Punkt-Augen (gemessen, `falschesauge.txt`)

- `toteSteineAmEnde` ruft `_diagIsTrueEye` nicht auf (gelesen, Zeilen 621 bis 699); die Funktion wird an anderen Stellen verwendet (Z. 396, 1699, 4985). Jede leere Region, die nur an eine Farbe und an eine Kette des Verbands grenzt, erhöht `V.augen`
  (Zeile `V.augen++`), unabhängig von ihrer Größe; die Größe ab `AUGE_GROSS` und `augeTeilbar` (4 bis 5 Punkte) setzen nur das Merkmal „großes Auge“.
- An den 71 Typ-A-Ketten in V liegen 88 Ein-Punkt-Augen (leerer Punkt, alle Nachbarn Steine derselben Farbe). Nach der Diagonalregel der App (`_diagIsTrueEye`: im Zentrum höchstens eine, am Rand keine gegnerische
  Diagonale) sind **70 von 88 falsch**, 67 der 71 Ketten haben mindestens ein falsches Ein-Punkt-Auge, **keine** hat zwei echte. Das Ergebnis bleibt gleich, wenn von GNU Go als tot geführte Gegnersteine an den
  Diagonalen nicht als Gegner zählen (zweite Zeile der Ausgabe). Größere Regionen sind nicht beurteilt.

### 6.6 Gegenprobe „Ein-Punkt-Auge nur mit `_diagIsTrueEye`“: nachträglicher Diagnosebefund (`gegenprobe-diagonalauge.txt`, `.json`)

Test-Kopie, in der ein Ein-Punkt-Auge nur zählt, wenn `_diagIsTrueEye` es bestätigt. Vergleich der Tot-Menge mit GNU Gos Tot-Liste:

| Maß | Original | Test-Kopie |
|---|---:|---:|
| V: Stellungen mit gleicher Tot-Menge wie GNU Go | 0 von 18 | 14 von 18 |
| V: Steine nur GNU tot | 362 (71 Ketten) | 60 (9 Ketten) |
| V: Steine nur App tot | 80 (10 Ketten) | 46 (6 Ketten) |
| alle 563: Stellungen mit gleicher Tot-Menge | 528 | 545 |
| alle 563: Steine nur GNU tot | 527 | 167 |
| alle 563: Steine nur App tot | 131 | 97 |

**Einordnung:**
- Das ist ein **nachträglicher Diagnosebefund an denselben Daten**, an denen die Auffälligkeit gefunden wurde. Er ist keine unabhängige Bestätigung. Übereinstimmung mit GNU Go ist hier nur der Maßstab der Messung, nicht
  die Wahrheit; „besser“ im Sinn der Spielstärke oder der Richtigkeit ist **nicht** gezeigt.
- **Die verbleibenden 46 „nur App tot“-Steine in V sind ungeprüft.** Es sind 6 Ketten in 4 Stellungen, alle in der Farbe des Gegners: `523|354` (6 und 17 Steine), `889|372` (3 und 7), `212|337` (2),
  `622|307` (11); Koordinaten in `gegenprobe-diagonalauge.json`. Drei dieser Stellungen sind die großen Verbände mit Benson-Kette aus 6.2. Ob die App dort richtig oder falsch liegt und ob sie in den 14 übereinstimmenden Stellungen durch
  die Änderung etwas verloren hätte, ist nicht untersucht. Dasselbe gilt für die 97 Steine „nur App tot“ über alle 563 Stellungen und für die verbleibenden 60 Steine „nur GNU tot“.
- Die Stellungen sind Auslösestellungen aus Fortsetzungen, keine Endstellungen von Partien mit Menschen. `toteSteineAmEnde` steckt auch in `resolveLifeAndDeath` (Schlusszählung) und `zaehlVorschau`; eine Folge für
  echte Partien ist eine **Hypothese**, nicht gemessen.
- Eine Änderung am Spiel folgt daraus nicht. Sie brauchte eine eigene Vorabfestlegung (Schalter, Standard aus, bitgleich bei aus) und ein Go (§9).

### 6.7 Abweichende Gruppenzahlen: ungeklärt

| | Zählung hier (`kennzahlen.txt`, Ketten) | `docs/passregel-vorsprung.md` §9 (Gruppen) |
|---|---:|---:|
| „GNU Go tot, Vorschau behält“ (Fläche, V, 18 Stellungen) | **71** | **76** |
| „Vorschau entfernt, nicht in Tot-Liste“ (Fläche, V) | **10** (in 7 Stellungen) | **8** |

Die Zahlen sind **nicht gleich und nicht abgeglichen.** Mögliche Gründe, alle **ungeprüft**: Die Zerlegung in `passregel-vorsprung.js` bildet Gruppen aus zusammenhängenden Steinen gleicher Farbe **und gleicher Richtung** der Abweichung, in der Variante „mit“ oder „nur“ (das
Werkzeug wählt je Einheit die mit dem kleineren Stand), während hier immer die Annahmen-Variante (`toteSteineAmEnde`) gilt und Ketten gleicher Farbe gezählt werden. In der Variante „nur“ (nur Benson-tot entfernt)
können zusätzliche Steine als „nur Tot-Liste tot“ gelten. Bis das geklärt ist, gilt für die Gruppenzahlen weiter die Angabe in `docs/passregel-vorsprung.md` §9 (dort von Hand aus Logzeilen
gezählt, Herkunft dort beschrieben); die Zahlen hier sind eine andere, maschinell gezählte Größe. Dass in V alle Typ-A-Ketten in der Farbe der KI liegen und alle Typ-B-Ketten in der des Gegners, stimmt mit der dortigen Durchsicht überein.

## 7. Eigene Fehler und Korrekturen

- **Verbandsvermutung:** Meine erste Hypothese (Verbandsbildung über gemeinsame Freiheiten) hat die Gegenprobe nicht getragen (6.4). Formulierung nach Durchsicht durch Hazeberry: „spricht gegen als Hauptursache in diesen Stellungen“, nicht „widerlegt“.
- **Farbangabe bei Typ A:** In meiner ersten Inline-Auswertung hatte ich die Argumente einer Hilfsfunktion vertauscht, wodurch alle Typ-A-Ketten als „KI-Farbe“ erschienen. Das Skript `kennzahlen.js` rechnet richtig:
  alle 98 Ketten sind 79 KI-Farbe und 19 Gegnerfarbe; für V (71 Ketten) stimmt die frühere Angabe „alle KI-Farbe“. Das wurde beim Konsolidieren der Skripte bemerkt.
- **GTP-1:** Meine Zwischenfassung „berührt die PWA-Läufe nicht“ war zu weit; nach Durchsicht durch Hazeberry gilt §3.
- **Falsche Augen:** „Verbesserung“ war zu stark; gilt als nachträglicher Diagnosebefund (6.6).
- **Browserteil von `lauf.sh`:** In der ersten Fassung wurde der Exitcode von `browser.cjs` nur in eine Datei geschrieben, `browser-vergleich.js` prüfte weder Startfehler noch fehlende Pflichtfälle, und ein wiederverwendetes
  Ausgabeverzeichnis hätte alte Berichte lesen können; der Lauf hätte erfolgreich enden können, ohne dass der Browserteil lief. Hinweis von Luna vor dem Merge, bestätigt am Code; behoben (§4, Gültigkeit des Browserteils). Die abgelegten
  Ergebnisse waren davon nicht betroffen (der Browserbericht enthielt alle sieben Fälle), wurden aber mit den korrigierten Skripten neu erzeugt; alle anderen Ausgaben waren dabei bytegleich.

## 8. Grenzen

- Alles lokal, nur lesend, ohne GNU Go; GNU Gos Urteile sind die gespeicherten Textlisten der Stufe C, nicht neu gerechnet. Der Referenzstand ist der Maßstab dieser Messung, nicht die Wahrheit (`docs/passregel-vorsprung.md` §9).
- Anfangsstellungen (`diagnose.anfang`); für `212|337` trat die Zählabweichung (§5) erst am Ende der Fortsetzung auf; die Mechanismus-Rechnung nutzt dort die Anfangsstellung.
- 18 V-Stellungen sind wenig; die Auswahl der Gegenprobe ist nachträglich. Gruppenunterschiede (Fuego gegen alte PWA) sind nicht getestet.
- Browserdiagnose nur Chromium 153 in dieser Umgebung; Pixel-Hashes sind nicht deterministisch (§4).
- Die Skripte laden die `index.html` per `eval` (wie die Tests); Test-Kopien und Original laufen nacheinander in einem Prozess, die Ergebnisse des Originals werden vorher gesichert (CLAUDE.md warnt vor zwei Ständen im selben Prozess).
  Dass die Test-Kopie bei Mitschreiben dasselbe liefert wie das Original, ist kontrolliert (563 von 563); bei den Gegenproben wird sie bewusst verändert.

## 9. Offen und ohne Go

Getrennt zu besprechen (Vorabfestlegung und Go jeweils für genau einen Punkt):

1. **Augenprüfung in `toteSteineAmEnde`:** Vorabfestlegung für einen Schalter (Standard aus, bitgleich bei aus, Test). Vorher die 46 und 97 „nur App tot“-Steine und die 60 und 167 „nur GNU tot“-Steine einzeln ansehen. Keine Änderung ohne Go.
2. **Ursache der 15 Zählabweichungen:** GNU Gos Punktklassen je Stellung (Actions, eigene Vorabfestlegung und Go).
3. **GTP-1, vom Adapter erzeugte Züge:** Archivzüge der Gruppe „alte PWA“ gegen eine Regelprüfung spielen (lokal oder Actions, eigenes Go).
4. **Gruppenzahlen 71/10 gegen 76/8 abgleichen** (§6.7).
5. Warum nur Fuego zu Vorzeichenwechseln führt; warum die Pixel-Hashes schwanken; `reproduce.cjs` gegen die eigenen Dateien.
6. Gegenverweis in `Hazeberry/codex` `HANDOFF.md` (dort zu schreiben, nicht hier).
7. Nicht gesichert, laufen im Februar 2027 ab: Artefakte von Stufe A, Probe 1 und der Zähldiagnose.

## 10. Dateien und Reproduktion

Skripte (alle mit Lizenzkopf): [`../auswertung/zaehlung-mechanismus/`](../auswertung/zaehlung-mechanismus/): `lauf.sh` (feste Reihenfolge), `gemeinsam.js`, `zaehl-liste.js`, `mechanismus.js`, `kennzahlen.js`, `benson-unabhaengig.js`,
`gegenprobe.js`, `falschesauge.js`, `browser-teil.sh`, `browser-vergleich.js`; Test: `tests/zaehlung-mechanismus.js`. Ausgaben und Prüfsummen: [`daten/zaehlung-mechanismus/`](daten/zaehlung-mechanismus/README.md).

```sh
bash auswertung/zaehlung-mechanismus/lauf.sh docs/daten/passregel-vergleich/stufe-c-42331033107/bericht.zip <Arbeitsverzeichnis außerhalb des Repos> <Ausgabeverzeichnis> [<codex-Checkout>]
```

Der Ablauf braucht rund zehn Sekunden. Er ist kein Messlauf im Sinn von CLAUDE.md, rechnet aber alle 563 Stellungen: Er startet nur nach ausdrücklichem Go.

## 11. Freigaben

Dieses Doc enthält Vorgaben für die KI-Assistenten; Hazeberry liest es vor dem Merge. Es erteilt kein Go für Spielkorrekturen, Schalter, Messläufe, Engine-Vergleiche oder Merges.
