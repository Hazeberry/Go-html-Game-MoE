# Endspiel-Muster: eine Tabelle für die Zeit ab Zug 81

**Status: Entwurf, wird vor dem Prüflauf festgelegt.** Was danach
hinzukommt, steht als Nachtrag darunter; die Abschnitte 1–8 werden nicht
mehr geändert.

---

## 1. Anlass

Die Diagnose in [`punktverlust-muster.md`](punktverlust-muster.md) zeigt,
wo die Muster-KI ihre Punkte verliert: im Endspiel an den Grenzen. Von Zug
80 bis zum Ende verliert die KI gegen GNU Go im Schnitt 51 von 154 Punkten
Gebiet, GNU Go nur 5,5 von 43. Gut die Hälfte liegt auf den Linien 1 und
2, knapp 60 % direkt an der alten Grenze. Die KI spielt dort GNU Gos besten
Zug in 18,7 % der Stellungen, GNU Go Stufe 1 in 68,7 %. Weder ein einzelner
Term noch mehr Suche ändert das.

Nachahmung war bisher der stärkste Hebel: Die Muster aus GNU Gos Zügen
brachten +102,8 Punkte ([`muster.md`](muster.md)). Die Tabelle im Spiel ist
aber aus allen Spielphasen und aus Stellungen beider Seiten gelernt und
zählt jedes Merkmal einzeln. Zwei Beobachtungen sprechen dafür, dass das
fürs Endspiel zu grob ist:

- **Die Seite der KI ist eine andere als die von GNU Go.** In den
  Vorgabepartien führt die KI (Schwarz) und GNU Go (Weiß) liegt weit
  zurück. GNU Go spielt dann Einbrüche und Angriffe, die in der Liste der
  KI kaum je vorn stehen. Das Endspiel der KI ist ein anderes Spiel.
  (Zahlen in §3.)
- **Das Abstandsmerkmal.** Die Tabelle gibt einem Zug neben dem letzten
  Gegnerzug +2,5, einem weit entfernten −0,5 ([`punktverlust-muster.md`](punktverlust-muster.md)
  §5). Im Endspiel sind die großen Züge selten Antworten auf den letzten.

Die Warnung aus [`muster-ausbau.md`](muster-ausbau.md) §7 gilt: Bessere
Vorhersage ist nicht bessere Zugwahl. Eine zweite Tabelle sagte GNU Gos Zug
öfter voraus (27,7 % statt 19,3 % ab Zug 81) und spielte gegen GNU Go
schlechter (−11,0 Punkte). Deshalb ist dieser Schritt nur die Eintrittskarte
für eine Messung.

## 2. Frage und Aufbau

**Frage:** Sagt eine Tabelle, die nur aus Stellungen ab Zug 81 mit der KI am
Zug gelernt ist, GNU Gos Zug in der Kandidatenliste der KI besser voraus als
die Tabelle im Spiel?

**Schritt 1 (dieses Dokument):** offline, an GNU Gos Zügen. Entwickelt wird
an vorhandenen Lehrdaten, geprüft wird an frisch beschrifteten Stellungen,
die vorher niemand ausgewertet hat.

**Schritt 2 (nur wenn das Tor in §8 bestanden ist, eigenes Dokument):**
Schalter im Spiel, Pilot mit 30 Paaren für die Dosis, Messung wie bei den
bisherigen Mustern (240 Paare gegen GNU Go, 360 Partien im Selbstspiel).
Besteht keine Variante das Tor, endet es hier mit einem negativen Ergebnis.
