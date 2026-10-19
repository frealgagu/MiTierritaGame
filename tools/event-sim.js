// Juega un evento con un jugador automático y dice cuánto tarda cada objetivo (para calibrar las
// medallas). Uso: node tools/event-sim.js [evento] [atento|lento]
//   atento: compra la siguiente mejora del evento apenas puede y, si no, la mejora recomendada
//   lento:  igual, pero decide cada 30 s (como quien mira el juego de vez en cuando)
import { Game } from '../src/core/Game.js';
import { EVENTS, EVENTS_BY_ID } from '../src/data/events.js';
import { createEventState, eventProgress, boardObjective, quoteAction, buyAction } from '../src/sim/events.js';
import { recommendUpgrade } from '../src/sim/analysis.js';

const def = EVENTS_BY_ID[process.argv[2]] ?? EVENTS[0];
const style = process.argv[3] ?? 'atento';
const every = style === 'lento' ? 30 : 5;
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

for (let year = 1; year <= def.objectives.length; year++) {
  const board = createEventState(def, year);
  const game = new Game(board);
  const obj = boardObjective(board);
  let t = 0;
  const bought = [];
  while (eventProgress(board) < obj.amount && t < 4 * 3600) {
    for (let k = 0; k < every * 10; k++) game.step(0.1);
    t += every;
    for (let n = 0; n < 50; n++) {
      const next = def.actions.find((a) => !board.research.includes(a.id));
      if (next && quoteAction(board, next.id).ok) {
        buyAction(board, next.id);
        bought.push(`${next.name} ${mmss(t)}`);
        continue;
      }
      // Ahorra para la siguiente mejora del evento si le falta poco (menos de 60 s de ingresos).
      const rate = game.incomePerSecond();
      if (next && next.cost - board.coins < 60 * rate) break;
      const r = recommendUpgrade(board, (id, mode) => game.quote(id, mode), def.zone);
      if (!r || r.id.startsWith('research:') || !game.buy(r.id, 1)) break;
    }
  }
  const levels = Object.entries(board.stations).map(([id, st]) => `${id} ${st.level}/${st.transport.level}`).join(' · ');
  console.log(`año ${year}: ${obj.kind} ${obj.amount} ${obj.product} en ${mmss(t)} (oro ${mmss(obj.medals[0])}, plata ${mmss(obj.medals[1])})`);
  console.log(`   compras: ${bought.join(', ') || 'ninguna'}`);
  console.log(`   niveles: ${levels}`);
}
