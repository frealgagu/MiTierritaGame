// Plays each event's challenge with automated players (tools/event-bots.js) and proposes the
// medals. Usage: node tools/event-sim.js [event] [--detail]
//   best:      fastest across all styles and saving thresholds, deciding every second
//   attentive: follows recommended upgrade and decides every 5 s
//   slow:      upgrades along goal path and decides every 30 s (occasional checker)
// Proposed gold: best plus 9 %, rounded up to 15 s; silver, 5 minutes more.
import { EVENTS, EVENTS_BY_ID } from '../src/data/events.js';
import { bestRun, play } from './event-bots.js';

export const GOLD_MARGIN = 1.09;
const defs = EVENTS_BY_ID[process.argv[2]] ? [EVENTS_BY_ID[process.argv[2]]] : EVENTS;
const verbose = process.argv.includes('--detail');
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

for (const def of defs) {
  console.log(`== ${def.icon} ${def.name}`);
  // One challenge per event (v3.72); `year` is just the playthrough count.
  for (let year = 1; year <= 1; year++) {
    const obj = def.objective;
    const best = bestRun(def, year);
    const attentive = play(def, year, { style: 'rec', save: 30, every: 5 });
    const slow = play(def, year, { style: 'obj', save: 60, every: 30 });
    const gold = Math.ceil((best.t * GOLD_MARGIN) / 15) * 15;
    console.log(
      `year ${year}: ${obj.kind} ${JSON.stringify(obj.items)}: best ${mmss(best.t)} (${best.style} ${best.save}) · attentive ${mmss(attentive.t)} · slow ${mmss(slow.t)}` +
        ` | ahora 🥇 ${mmss(obj.medals[0])} 🥈 ${mmss(obj.medals[1])} | propuesta 🥇 ${mmss(gold)} 🥈 ${mmss(gold + 300)} → medals: [${gold}, ${gold + 300}]`,
    );
    if (verbose) {
      const r = play(def, year, { style: best.style, save: best.save });
      console.log(`   compras: ${r.bought.map(([id, t]) => `${id} ${mmss(t)}`).join(', ') || 'ninguna'}`);
      console.log(`   levels: ${Object.entries(r.board.stations).map(([id, st]) => `${id} ${st.level}/${st.transport.level}`).join(' · ')}`);
    }
  }
}
