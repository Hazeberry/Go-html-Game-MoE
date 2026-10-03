# Aufgaben: richtig, aber nicht gleich verteilt

**Explorative Auswertung vom 03.10.2026**, nicht vorab festgelegt. Anlass: in
allen vier Messläufen vom 01./02.10. gab der Eingriffs-Arm B deutlich öfter
auf als A (124/115, 125/96, 172/124, 153/78). Ist das ein Messartefakt, das
die Siegraten verzerrt? Werkzeug:
[`auswertung/weiterspielen.js`](../auswertung/weiterspielen.js).

---

## 1. Wie die Engine aufgibt

Allein nach Q: fünf eigene Züge in Folge mit Q ≤ −0,95, ab Zug 60. Die
zweite Instanz, das Gebiet (`resignAreaMargin`), ist seit dem 21.09.
abgeschaltet — der Kasten an dem Parameter in `index.html` sagt warum. Q
stammt aus der Suche des jeweiligen Arms. Ein Parameter, der die Bewertung
oder die Suche verändert, verschiebt damit auch, wann aufgegeben wird.

## 2. Methode

Jede Partie, die durch Aufgabe endete, wird an der Aufgabestellung
aufgenommen und Engine gegen Engine zu Ende gespielt — beide Arme mit ihren
Parametern, Aufgabe aus, gezählt wie im Harness (Benson-tote Ketten entfernt,
Fläche, Komi 7,5). Gewinnt der Aufgebende dann doch, war die Aufgabe falsch.

Grenzen: eine Fortsetzung je Partie, also ein Zufallszug aus dem, was die
Stellung noch hergibt; ohne Tree-Reuse; Aufgabe beider Seiten aus. Eine
Schätzung, ob die Stellung noch zu gewinnen war, kein Nachspielen.

## 3. Ergebnis

Alle 987 Aufgaben der vier Läufe:

| Lauf | A gibt auf → gewinnt doch | B gibt auf → gewinnt doch | Siegrate B gemessen → ohne falsche Aufgaben |
|---|---|---|---|
| Benson A–B, Kontrolllauf | 4 von 115 (3,5 %) | 7 von 124 (5,6 %) | 51,7 % → 52,5 % |
| Benson A–B, Wiederholung | 5 von 96 (5,2 %) | 4 von 125 (3,2 %) | 48,3 % → 48,1 % |
| Endspielgrenze 150 | 5 von 78 (6,4 %) | 9 von 153 (5,9 %) | 31,4 % → 32,5 % |
| **Einflusskarte 150** | 9 von 124 (7,3 %) | **25 von 172 (14,5 %)** | **45,0 % → 49,4 %** |

**Aufgaben sind meist richtig**, rund 95 % in drei der vier Läufe. Dass B dort
öfter aufgibt, hat zwei harmlose Gründe: B verliert öfter
(Endspielgrenze), oder B gibt verlorene Partien früher auf, statt sie
auszuzählen (Benson-Übertrag: die Bewertung bucht bewiesen tote Gruppen schon
vorher als verloren). Die Siegraten dieser drei Läufe bleiben, wie sie sind.

**Bei der Einflusskarte nicht.** B gibt doppelt so oft fälschlich auf wie A
(14,5 % gegen 7,3 %; zweiseitig p ≈ 0,055 für den Unterschied der Anteile).
Ohne die falschen Aufgaben liegt B bei 49,4 % statt 45,0 % — nicht mehr von
50 % zu unterscheiden. Die „Richtung Schaden" aus `einflusskarte.md` §11 geht
damit großteils auf die Aufgabe zurück, nicht auf das Spiel. Das bleibt
explorativ; die vorab festgelegte Lesart dort („kein Stärkeeffekt
nachweisbar") ändert sich nicht.

## 4. Eine irreführende Meldung

Ein Bug-Report aus einer echten Partie (Hard-KI als Weiß, Zug 243): die KI
gab auf mit der Meldung „Gebiet 132:123" — Weiß scheinbar vorn. Die Zahl war
`estimateArea` [roh], die tote, aber noch stehende Ketten mitzählt. In der
Stellung waren 46 weiße Steine Benson-tot, vor allem eine 38er-Kette unten
rechts:

| Maßstab | Schwarz | Weiß (+ 7,5 Komi) |
|---|---|---|
| roh (die Meldung) | 123 | 132 |
| ohne beweisbar tote Steine | 184 | 93,5 |
| volle Schlussauswertung des Spiels | 183 | 83,5 |

Die Aufgabe war richtig, die Meldung nicht. Seitdem nennt sie die Fläche ohne
beweisbar tote Steine und die rohe Zahl nur in Klammern, z. B.
„Fläche 86:184 ohne 46 beweisbar tote Steine (roh 132:123)". Am Verhalten der
KI ändert das nichts. Die Stellung liegt als
`tests/stellungen/aufgabe-zug243.txt` bei den Tests.

## 5. Reproduktion

```bash
# Rohdumps nach docs/daten/ neu erzeugen (Befehle dort), dann z. B.:
node auswertung/weiterspielen.js einfluss-haupt.jsonl \
  --A mctsFixedSims=120 --B mctsFixedSims=120,influenceInvade=150,influenceOwn=150 \
  --aus einfluss-weiter.jsonl
node auswertung/weiterspielen.js einfluss-haupt.jsonl --auswerten einfluss-weiter.jsonl
```

Mit `--von`/`--bis` lässt sich die Arbeit auf mehrere Prozesse verteilen; die
Fortsetzungen sind je Partie geseedet und damit bei gleichem Commit
wiederholbar.
