# Partien am Zuglimit: Zählung im Bericht korrigiert

30.10.2026. Anlass war ein Hinweis von Hazeberry: Der Bericht des Laufs
„Muster ohne Vorgabe“ meldete 0 Partien am Zuglimit, der nachträgliche
Vergleich der Siege ([`muster-ohne-vorgabe.md`](muster-ohne-vorgabe.md) §10)
schloss aber zwei Partien gegen Fuego ohne Sieger aus.

## Der Fehler

[`gnugo-duell.js`](../gnugo-duell.js) rechnet für jede Partie einen `endstand`
(GNU Gos `final_score` der Schlussstellung), auch wenn sie am Zuglimit von
600 Zügen endet. Nur der Sieger bleibt dann `null` (und `gewonnen` auch), wenn
`--schaetzung` gesetzt ist. [`bericht.js`](../auswertung/komponenten/bericht.js)
hielt dagegen nur eine Partie **ohne Endstand** für eine am Zuglimit. Die
Spalte „Zuglimit“ zeigte deshalb immer 0, und die Partien gingen mit ihrem
Endstand in die gepaarten Intervalle ein, während die Siegzahl sie nicht
enthielt. Der Kopfkommentar von `bericht.js` versprach dagegen, solche
Partien samt Partner wegzulassen.

## Die Korrektur

`bericht.js` erkennt eine Partie am Zuglimit an `gewonnen === null`, zählt sie
in der Spalte „Zuglimit“ und lässt sie samt Partner aus den Intervallen
heraus, wie es der Kopfkommentar immer sagte. Die anderen Berichte
(`pwa-bericht.js`, `kurz-bericht.js`) zählten schon so. Ein Test in
[`tests/komponenten.js`](../tests/komponenten.js) prüft Zählung, Ausschluss
samt Partner und den unveränderten Normalfall.

## Wirkung auf die bisherigen Ergebnisse

Gemessen am Lauf „Muster ohne Vorgabe“ (Arm − D, 98,3 %), mit den Zuglimit-Paaren
gegen ohne sie:

| Gegner | Arm | mit | ohne Zuglimit-Paare |
|---|---|---|---|
| GNU Go | M0, M50, MW0 | +18,1, +15,2, +13,1 | gleich (kein Paar betroffen) |
| Fuego | M0 | +0,6 [−5,4; +6,6], 480 Paare | +0,6 [−5,5; +6,6], 478 Paare |
| Fuego | M50 | −0,3 [−6,5; +5,8], 480 Paare | −0,3 [−6,4; +5,9], 479 Paare |
| Fuego | MW0 | −4,1 [−8,6; +0,4], 480 Paare | −4,1 [−8,6; +0,4], 479 Paare |

Kein Urteil und keine Entscheidung ändert sich. Frühere Nachträge schreiben
in mehreren Läufen „keine Partie lief bis zum Zuglimit“ oder zählen 0; das
ist für die Läufe unten falsch, die Zahlen daneben bleiben bis auf die dritte
Stelle gleich. Rohdaten mit `gewonnen = null` (Partien am Zuglimit):

| Lauf | Dateien (Partien am Zuglimit) |
|---|---|
| Stufe A (`komponenten/lauf1`) | `g-M0` (1) |
| Stufe B (`komponenten-b/lauf1`) | `g-BE0` (2), `g-E0` (1), `g-P0` (1), `g-T0` (1) |
| Baum-Übernahme (`baum-uebernahme/lauf1`) | `s120-g-D` (2), `s120-g-T0` (2), `s600-g-T0` (1) |
| Muster ohne Vorgabe (`muster-ohne-vorgabe/lauf1`) | `f-D` (1), `f-M0` (1), `f-MW0` (1) |
| ältere Läufe | `netz-dosis/lauf1/L8` (2), `netz-hoch/lauf1/L10` (1), `prior-neun/lauf1/A` (1) |

Die Berichte (`bericht.md`) in den Datenordnern bleiben, wie sie waren.
Neu gerechnet werden sie nicht; wer sie braucht, kann `bericht.js` mit den
Rohdaten noch einmal laufen lassen.
