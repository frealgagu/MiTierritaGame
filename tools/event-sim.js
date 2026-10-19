// Juega cada objetivo de los eventos con jugadores automáticos (tools/event-bots.js) y propone las
// medallas. Uso: node tools/event-sim.js [evento] [--detalle]
//   mejor:  el más rápido de todos los estilos y ahorros, decidiendo cada segundo
//   atento: sigue la mejora recomendada y decide cada 5 s
//   lento:  sube lo del camino del objetivo y decide cada 30 s (alguien que mira de vez en cuando)
// Oro propuesto: el mejor más un 9 %, redondeado a 15 s hacia arriba; plata, 5 minutos más.
import { EVENTS, EVENTS_BY_ID } from '../src/data/events.js';
import { bestRun, play } from './event-bots.js';

export const GOLD_MARGIN = 1.09;
const defs = EVENTS_BY_ID[process.argv[2]] ? [EVENTS_BY_ID[process.argv[2]]] : EVENTS;
const verbose = process.argv.includes('--detalle');
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

for (const def of defs) {
  console.log(`== ${def.icon} ${def.name}`);
  for (let year = 1; year <= def.objectives.length; year++) {
    const obj = def.objectives[year - 1];
    const best = bestRun(def, year);
    const attentive = play(def, year, { style: 'rec', save: 30, every: 5 });
    const slow = play(def, year, { style: 'obj', save: 60, every: 30 });
    const gold = Math.ceil((best.t * GOLD_MARGIN) / 15) * 15;
    console.log(
      `año ${year}: ${obj.kind} ${JSON.stringify(obj.items)}: mejor ${mmss(best.t)} (${best.style} ${best.save}) · atento ${mmss(attentive.t)} · lento ${mmss(slow.t)}` +
        ` | ahora 🥇 ${mmss(obj.medals[0])} 🥈 ${mmss(obj.medals[1])} | propuesta 🥇 ${mmss(gold)} 🥈 ${mmss(gold + 300)} → medals: [${gold}, ${gold + 300}]`,
    );
    if (verbose) {
      const r = play(def, year, { style: best.style, save: best.save });
      console.log(`   compras: ${r.bought.map(([id, t]) => `${id} ${mmss(t)}`).join(', ') || 'ninguna'}`);
      console.log(`   niveles: ${Object.entries(r.board.stations).map(([id, st]) => `${id} ${st.level}/${st.transport.level}`).join(' · ')}`);
    }
  }
}
