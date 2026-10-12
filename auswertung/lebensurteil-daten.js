/* GNU Gos Lebensurteil an Stellungen aus gnugo-duell-Partien, als Lehr- und
   Prüfdaten für ein eigenes Urteil (docs/gebiet-sicher.md, Stufe 2).

   Spielt jede Partie in einem GNU Go nach (Vorgabe wie in der Partie) und
   fragt vor jedem --jede-ten Zug der KI dragon_status und dragon_stones ab.
   Eine Zeile je Stellung:
     {quelle, nr, zug, farbe, status, steine}
   zug = Zahl der gespielten Züge davor (die Stellung ist zuege[0..zug-1]),
   farbe = 1/2, wer am Zug ist (die KI).
   Stürzt GNU Go ab, endet die Partie dort (Zeile mit abbruch).

   Aufruf:
     node auswertung/lebensurteil-daten.js partien.jsonl [...] --aus urteil.jsonl
                                          [--jede 4] [--stufe 10] [--gnugo pfad] */
'use strict';
const fs = require('fs');
const {spawn} = require('child_process');

const a = process.argv.slice(2), dateien = [];
const opt = {jede: 4, stufe: 10, aus: null, gnugo: '/usr/games/gnugo'};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--jede') opt.jede = +a[++i];
  else if (a[i] === '--stufe') opt.stufe = +a[++i];
  else if (a[i] === '--aus') opt.aus = a[++i];
  else if (a[i] === '--gnugo') opt.gnugo = a[++i];
  else dateien.push(a[i]);
}
if (!opt.aus || !dateien.length) { console.error('Aufruf: lebensurteil-daten.js partien.jsonl ... --aus urteil.jsonl'); process.exit(2); }

function gnugo(komi) {
  const p = spawn(opt.gnugo, ['--mode', 'gtp', '--level', String(opt.stufe), '--chinese-rules', '--komi', String(komi)],
                  {stdio: ['pipe', 'pipe', 'ignore']});
  let puffer = '', warte = [], tot = false;
  p.on('exit', () => { tot = true; for (const w of warte.splice(0)) w(null); });
  p.stdout.on('data', d => {
    puffer += d.toString();
    let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) {
      const t = puffer.slice(0, k); puffer = puffer.slice(k + 2);
      const w = warte.shift(); if (w) w(t);
    }
  });
  const frage = b => new Promise((ok, fehler) => {
    if (tot) return fehler(new Error('GNU Go beendet'));
    warte.push(t => t === null ? fehler(new Error('GNU Go beendet'))
                   : t.startsWith('=') ? ok(t.slice(1).trim()) : fehler(new Error(`${b} → ${t}`)));
    p.stdin.write(b + '\n');
  });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) {} p.kill(); }};
}

(async () => {
  const aus = fs.openSync(opt.aus, 'a');
  for (const datei of dateien) {
    for (const zeile of fs.readFileSync(datei, 'utf8').split('\n')) {
      if (!zeile.trim()) continue;
      const p = JSON.parse(zeile);
      if (p.abgebrochen || !p.zuege) continue;
      const g = gnugo(p.komi);
      const quelle = datei.split('/').pop();
      try {
        await g.frage('boardsize 19'); await g.frage('clear_board');
        if (p.vorgabe >= 2) {
          const st = (await g.frage(`fixed_handicap ${p.vorgabe}`)).split(/\s+/).sort().join();
          if (st !== [...p.vorgabeSteine].sort().join()) throw new Error(`Partie ${p.nr}: Vorgabe weicht ab`);
        }
        const wir = p.wirFarbe === 'S' ? 1 : 2, zuerst = p.beginnt === 'S' ? 1 : 2;
        let kiZug = 0;
        for (let k = 0; k < p.zuege.length; k++) {
          const f = k % 2 === 0 ? zuerst : 3 - zuerst;
          if (f === wir && kiZug++ % opt.jede === 0) {
            const status = await g.frage('dragon_status'), steine = await g.frage('dragon_stones');
            fs.writeSync(aus, JSON.stringify({quelle, nr: p.nr, zug: k, farbe: f, status, steine}) + '\n');
          }
          await g.frage(`play ${f === 1 ? 'B' : 'W'} ${p.zuege[k]}`);
        }
      } catch (e) {
        fs.writeSync(aus, JSON.stringify({quelle, nr: p.nr, abbruch: e.message.slice(0, 100)}) + '\n');
      } finally { g.ende(); }
    }
  }
  fs.closeSync(aus);
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
