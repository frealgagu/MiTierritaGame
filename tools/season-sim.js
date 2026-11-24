// Plays each season event (data/plaza.js: SEASON_EVENTS) with the automated players of tools/event-bots.js and
// reports how long its objective takes, to calibrate it at about 3 hours played sensibly (v5.19).
// Usage: node tools/season-sim.js [event id] [--detail]
//   attentive: follows the recommended upgrade, deciding every 5 s
//   regular:   follows it deciding every 60 s (checks the board now and then)
//   sometimes: follows it every 30 min (leaves the board running and comes back now and then)
// Also prints how much is made after 1, 2 and 3 hours by the attentive player, and the objective that would take
// it 3 hours.
import { SEASON_EVENTS } from '../src/data/plaza.js';
import { EVENTS_BY_ID } from '../src/data/events.js';
import { play } from './event-bots.js';

const defs = SEASON_EVENTS.filter((d) => !process.argv[2] || process.argv[2].startsWith('--') || d.id === process.argv[2]);
const hms = (t) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const LIMIT = 8 * 3600;

for (const def of defs) {
  const [product] = Object.keys(def.objective.items);
  console.log(`== ${def.icon} ${def.id}: ${def.objective.kind} ${JSON.stringify(def.objective.items)}`);
  for (const [name, opts] of [
    ['attentive', { style: 'rec', save: 0, every: 5 }],
    ['regular', { style: 'rec', save: 0, every: 60 }],
    ['sometimes', { style: 'rec', save: 0, every: 1800 }],
  ]) {
    const r = play(def, 1, { ...opts, limit: LIMIT });
    console.log(`  ${name.padEnd(9)} ${r.t >= LIMIT ? '> 8 h' : hms(r.t)}`);
  }
  // Production by the attentive player at fixed times (with an objective it can never meet).
  const goal = def.objective;
  EVENTS_BY_ID[def.id].objective = { ...goal, items: { [product]: 1e30 } };
  for (const h of [1, 2, 3]) {
    const r = play(def, 1, { style: 'rec', save: 0, every: 5, limit: h * 3600 });
    const made = r.board.stats[def.objective.kind][product] ?? 0;
    const levels = Object.entries(r.board.stations).map(([id, st]) => `${id.split('_').slice(1).join('_')} ${st.level}/${st.transport.level}`).join(' · ');
    console.log(`  after ${h} h: ${Math.round(made)} ${product}${process.argv.includes('--detail') ? ` (${levels}; warehouse ${r.board.zones[def.zone].dispatch.level})` : ''}`);
  }
  EVENTS_BY_ID[def.id].objective = goal;
}
