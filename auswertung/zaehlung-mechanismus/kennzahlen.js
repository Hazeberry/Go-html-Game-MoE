// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil D: Kennzahlen aus der Ausgabe von mechanismus.js (rein beschreibend, keine Deutung).
   Typ A = Kette, die GNU Go ganz als tot führt und die toteSteineAmEnde behält; Typ B = umgekehrt.
   „Kette“ = zusammenhängende Steine gleicher Farbe. Das ist NICHT die Gruppendefinition von auswertung/endspiel/passregel-vorsprung.js
   (dort Gruppen je Richtung der Abweichung in der Variante „mit“ oder „nur“); die Zahlen sind deshalb nicht gleichzusetzen.
   Aufruf: node kennzahlen.js --mech mech.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['mech']);
const d = JSON.parse(G.fs.readFileSync(o.mech, 'utf8')), out = d.out;
const V = out.filter(x => x.V);
console.log(`Stellungen ${out.length}; V (Fläche, Referenzstand < 0): ${V.length}; Gruppen der V-Stellungen: ${[...new Set(V.map(x => x.gruppe))].join('; ')}`);
const grund = a => a.gemischt ? 'gemischt' : !a.schutz ? 'kein Verband' : [a.schutz.benson && 'benson', a.schutz.augen >= 2 && 'zwei Augen', a.schutz.gross && 'großes Auge', a.schutz.offen && 'offen'].filter(Boolean).join('+') || '?';
const zaehl = (liste, f) => { const m = {}; for (const x of liste) for (const a of x.A) { const k = f(a, x); m[k] = (m[k] || 0) + 1; } return m; };
const mitA = out.filter(x => x.A.length), mitB = out.filter(x => x.B.length);
console.log(`Stellungen mit Typ A: ${mitA.length} (davon V: ${mitA.filter(x => x.V).length}); mit Typ B: ${mitB.length} (davon V: ${mitB.filter(x => x.V).length})`);
console.log(`Ketten Typ A: ${out.reduce((s, x) => s + x.A.length, 0)} (V: ${V.reduce((s, x) => s + x.A.length, 0)}); Ketten Typ B: ${out.reduce((s, x) => s + x.B.length, 0)} (V: ${V.reduce((s, x) => s + x.B.length, 0)})`);
console.log('Schutzgrund Typ A, alle:', JSON.stringify(zaehl(out, grund)));
console.log('Schutzgrund Typ A, nur V:', JSON.stringify(zaehl(V, grund)));
const farbe = (a, x) => (a.farbe === x.kiFarbe ? 'KI-Farbe' : 'Gegnerfarbe');
console.log('Typ A nach Farbe, alle:', JSON.stringify(zaehl(out, farbe)), '| nur V:', JSON.stringify(zaehl(V, farbe)));
const bV = {}; for (const x of V) for (const b of x.B) { const k = b.farbe === x.kiFarbe ? 'KI-Farbe' : 'Gegnerfarbe'; bV[k] = (bV[k] || 0) + 1; }
console.log('Typ B in V nach Farbe:', JSON.stringify(bV));
const alle = out.flatMap(x => x.A.map(a => ({...a, V: x.V, s: x.schluessel}))), mitS = alle.filter(a => a.schutz);
const gross = mitS.filter(a => a.schutz.verbandSteine > a.steine), allein = mitS.filter(a => a.schutz.verbandSteine === a.steine);
console.log(`Typ-A-Ketten, Verband größer als die Kette: ${gross.length} von ${alle.length}; Verband = Kette allein: ${allein.length}; in V: ${alle.filter(a => a.V && a.schutz && a.schutz.verbandSteine > a.steine).length} von ${alle.filter(a => a.V).length}`);
const bens = mitS.filter(a => a.schutz.benson);
console.log(`Typ-A-Ketten in einem Verband mit Benson-lebender Kette: ${bens.length}; davon Verband = Kette allein: ${bens.filter(a => a.schutz.verbandSteine === a.steine).length}`);
const g = {};
for (const x of out) { const k = x.gruppe; g[k] = g[k] || {Stellungen: 0, mitTypA: 0, mitTypB: 0, V: 0, kettenTypA: 0}; g[k].Stellungen++; if (x.A.length) { g[k].mitTypA++; g[k].kettenTypA += x.A.length; } if (x.B.length) g[k].mitTypB++; if (x.V) g[k].V++; }
console.log('Je Gruppe:', JSON.stringify(g));
const verb = new Map();
for (const a of alle.filter(a => a.V && a.schutz)) { const k = a.s + '|' + JSON.stringify(a.schutz.ag) + '|' + a.schutz.verbandSteine; if (!verb.has(k)) verb.set(k, a); }
const klein = [...verb.values()].filter(a => (a.schutz.ag || []).length >= 2 && (a.schutz.ag || []).every(x => x <= 2));
const grossB = [...verb.values()].filter(a => a.schutz.benson || (a.schutz.ag || []).some(x => x >= 6));
console.log(`Geschützte Verbände in V: ${verb.size}; nur Regionen mit höchstens 2 Punkten (mindestens zwei): ${klein.length}; mit Benson-Kette oder Region ab 6 Punkten: ${grossB.length}; übrige: ${verb.size - klein.length - grossB.length}`);
for (const a of verb.values()) console.log('  ' + a.s.split('|').slice(1).join('|') + '  Augenregionen: ' + (a.schutz.ag || []).join(',') + '  Verband: ' + a.schutz.verbandSteine + (a.schutz.benson ? '  (Benson-Kette im Verband)' : ''));
