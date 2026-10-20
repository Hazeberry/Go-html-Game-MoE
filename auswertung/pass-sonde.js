// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Pass-Sonde (docs/parameter-reihe.md §1): Wo liegt der beste Kandidatenwert
   (`best` in getAIMove), an dem die Schwellen passMinMc* gemessen werden?

   Die Schwellen −50, 20, 8 und 10 stammen aus einer Zeit, in der Zugwerte in
   den Zehnern lagen. Die Sonde spielt ganze Partien gegen GNU Go (Bedingungen
   der Messungen: Stufe 1, neun Vorgabesteine, 120 Simulationen, Seed 206) mit
   einer Kopie von index.html, die an der Pass-Prüfung eine Zeile ausgibt, und
   zählt, wie oft `best` unter einer Schwelle liegt. Die Kopie ändert nichts am
   Spiel; index.html im Repo bleibt unberührt.

   Aufruf:
     node auswertung/pass-sonde.js [--partien 4] [--von 1] [--seed 206] [--gnugo /usr/games/gnugo]
   Braucht GNU Go; vier Partien parallel dauern rund zwei Minuten. */
'use strict';
const {ersetzeEinmal, sondeSpielen, optionen} = require('./sonde-lauf.js');

const ANKER = "  const best = scored[0].score;\n\n  const PASS_GAIN_THRESHOLD = PARAMS.passGainThreshold;";
const SONDE = "  const best = scored[0].score;\n  if (mc > 40 && diff === 'hard') console.error('BEST ' + mc + ' ' + best + ' ' + scored.length);\n\n  const PASS_GAIN_THRESHOLD = PARAMS.passGainThreshold;";

/* index.html mit der Protokollzeile; bricht ab, wenn die Stelle nicht genau einmal vorkommt */
function gepatcht(html) { return ersetzeEinmal(html, ANKER, SONDE, 'Pass-Prüfung'); }

/* Zeilen „BEST <mc> <best> <Kandidaten>" aus der Fehlerausgabe */
function lies(err) {
  return err.split('\n').filter(l => l.startsWith('BEST ')).map(l => {
    const [, mc, best, n] = l.split(' ');
    return {mc: +mc, best: +best, kandidaten: +n};
  });
}

const SCHWELLEN = [20, 35, 60, 100, 200, 300, 500];
function statistik(zeilen, ab = 80) {
  const w = zeilen.filter(z => z.mc > ab).map(z => z.best).sort((a, b) => a - b);
  if (!w.length) return null;
  const q = p => w[Math.min(w.length - 1, Math.floor(p * w.length))];
  return {n: w.length, min: w[0], p5: q(0.05), p25: q(0.25), median: q(0.5), p75: q(0.75), max: w[w.length - 1],
          anteil: SCHWELLEN.map(t => ({schwelle: t, anteil: w.filter(x => x < t).length / w.length}))};
}

async function main() {
  const opt = optionen(process.argv.slice(2));
  const {nummern, fehler} = await sondeSpielen({...opt, patch: gepatcht});
  const alle = fehler.map(lies);
  const f0 = v => Math.round(v);
  alle.forEach((z, i) => console.log(`Partie ${nummern[i]}: letzte Werte von best (Zug:Wert/Kandidaten): `
    + z.slice(-6).map(x => `${x.mc}:${f0(x.best)}/${x.kandidaten}`).join('  ')));
  const s = statistik(alle.flat());
  console.log(`\nbest bei Zug > 80, ${s.n} Züge der KI aus ${alle.length} Partien: Min ${f0(s.min)} · 5 % ${f0(s.p5)} · 25 % ${f0(s.p25)} · Median ${f0(s.median)} · 75 % ${f0(s.p75)} · Max ${f0(s.max)}`);
  for (const t of s.anteil) console.log(`  Anteil best < ${t.schwelle}: ${(100 * t.anteil).toFixed(1).replace('.', ',')} %`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = {gepatcht, lies, statistik, ANKER};
