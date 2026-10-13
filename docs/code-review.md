# Code-Review vom 13.10.2026: geprüft und korrigiert

**Stand: 13.10.2026.** Ein Review der ganzen `index.html`, nur lesend
geschrieben, nannte 15 Problemstellen und zwei Einwände zur Methodik. Jeder
Punkt ist hier am Code geprüft. Die bestätigten Fehler sind behoben, jeweils
mit Test.

---

## 1. Was zutraf und behoben ist

| Nr. | Befund | Geprüft | Korrektur | Test |
|---:|---|---|---|---|
| 1 | Die Suche ignorierte Ko: Expansion im Baum mit `getLegalMoves(…, null)`, Rollout am Blatt mit dem Ko-Punkt der Wurzel. Das gilt auch für den Pfad ohne MCTS. | stimmt | `koNachZug` setzt den Ko-Punkt nach jedem Baumzug neu und reicht ihn an Expansion und Rollout weiter; im Pfad ohne MCTS gilt der Ko-Punkt nach dem Kandidaten | `tests/ko-suche.js` |
| 2 | Aufgabe der KI: PolicyNet trainierte nach der Fläche, also unter Umständen mit „gewonnen“ | stimmt | Aufgabe = `trainGame(-1)`, vor `showFinalScore` | `tests/browser-ui.js` |
| 3 | Undo ließ zurückgenommene KI-Züge im Trainingspuffer | stimmt | Puffer erst nach gelungenem Zug füllen, `undo()` kürzt ihn auf die Länge vor dem Zug | `tests/browser-ui.js` |
| 4 | Nach Undo kannte die Superko-Prüfung nur noch die letzten 50 Stellungen | stimmt | Hash-Verlauf als Liste (`hashListe`), `undo()` kürzt sie und baut die Menge neu | `tests/browser-ui.js` |
| 5 | Lehnt Chrome den `data:`-Worker erst asynchron ab (`onerror`), ging die KI sofort für immer auf den Hauptthread, ohne `blob:` zu versuchen | stimmt | `erzeugeWorker`; `onerror` versucht `blob:` und sendet dieselbe Anfrage neu, solange der `data:`-Worker noch nie geantwortet hat | `tests/browser-ui.js` (`data:`-Ablehnung simuliert) |
| 6 | Das Dashboard speicherte den ganzen Parametersatz, alte Speicherstände hielten alte Defaults fest (stand schon im README) | stimmt | nur Abweichungen vom Default, mit Version 2; ein Speicherstand im alten Format wird einmal verworfen, mit Hinweis im Protokoll | `tests/browser-ui.js` |
| 7 | Doppeltes Undo: „+R“ blieb in der SGF, und das Spiel hänge danach | **teilweise**: `resignedBy` blieb stehen. Das Hängen trifft nicht zu, weil der Undo-Knopf danach `triggerAIMove()` aufruft, wenn die KI am Zug ist | `undo()` setzt `resignedBy` und `finalMargin` zurück | `tests/browser-ui.js` |
| 8 | Aufgabe bei „alle Züge todgeboren“: Fläche plus Gefangene | stimmt | nur Fläche; Komi bleibt draußen wie überall in der Engine | — (nur bei `resignEnabled`, selten) |
| 10 | Notzug `findAnyLegalMove` konnte ein eigenes Auge füllen | stimmt | eigene Augen ausgeschlossen, notfalls passen | `tests/browser-ui.js` |

Alle neuen Tests schlagen mit dem Code vor der Korrektur an.

## 2. Was nicht zutraf oder bewusst so bleibt

- **9, PolicyNet trainiert immer nach Fläche:** bewusst so, der Kommentar an
  der Stelle sagt es. Das Netz ist auf Fläche kalibriert.
- **11, RAVE nur mit Baumzügen und mit Zügen vor dem Knoten:** praktisch
  ohne Wirkung. Ein Zug, den dieselbe Farbe früher im Pfad gespielt hat,
  steht danach auf einem besetzten Punkt und ist kein Kind. Die Ausnahme
  sind Punkte, die inzwischen geschlagen wurden. Rollout-Züge auszulassen ist
  eine Bauentscheidung.
- **12, Vorwärtslauf von PolicyNet bei jedem Zug:** gewollt, damit das Netz
  trainiert wird, auch wenn es nicht mitsteuert (Kommentar dort). Er kostet
  rund eine Millisekunde.
- **13, Gewichte nahe am Speicherlimit:** ein berechtigter Hinweis, aber ohne
  akuten Fehler. `save()` meldet das Scheitern über den Rückgabewert.
- **14, `findEyes` ungenutzt:** Das Spiel ruft es seit der neuen Zählung
  ([`zaehlung.md`](zaehlung.md)) nicht mehr auf, drei Auswertungswerkzeuge
  aber schon (`augen-tod.js`, `augen-urteil.js`, `zaehlung-pruefen.js`).
  Deshalb bleibt es.
- **15, Kommentaranteil:** Die Kommentare halten fest, warum etwas so ist
  und was gemessen wurde. Das ist hier Absicht.
- **Methodik, Muster:** Lehrer (GNU Go Stufe 10) und Gegner (Stufe 1) sind
  dasselbe Programm. Das steht als Grenze in [`muster.md`](muster.md) §7.
  Das Selbstspiel gegen die KI ohne Muster ist gerade die unabhängige
  Gegenprobe.
- **Methodik, `gebietZug`:** Die +229 Punkte sind GNU Gos eigene Schätzung
  nach Zug 120, nicht die Bouzy-Karte, die der Term benutzt. Spätere
  Messungen nehmen GNU Gos Endstand.

## 3. Ko-Korrektur: Wirkung auf das Spiel, vorab festgelegt

Die Ko-Korrektur ändert die Züge der KI häufig. 16 Partien der Messung in
[`gebiet-sicher.md`](gebiet-sicher.md) §9 (Arm A, Seed 203), mit dem neuen
Code nachgespielt: 15 weichen ab, zwischen Zug 60 und 180. Der Endstand
liegt im Schnitt +5,3 Punkte über dem alten, das ist bei 16 Partien
Rauschen.

**Messung:**
- Arm A: die 240 Partien von Arm A aus `gebiet-sicher.md` §9 (Seed 203,
  Commit `2816458`).
- Arm B: dieselben Partien mit dem korrigierten Code, auf dem Merge-Commit
  dieses Stands.
- Sonst wie dort: GNU Go Stufe 1, neun Vorgabesteine, 120 Simulationen,
  ausgespielt, bis 600 Züge.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 203 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh ko-gnugo-B-$v.jsonl
done
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05, mit
95-%-Intervall.

**Entscheidung, vorab festgelegt:** Eine Regelkorrektur bleibt, außer sie
ist signifikant schlechter. Ist B signifikant schlechter, wird die Ursache
gesucht, bevor sie bleibt.
