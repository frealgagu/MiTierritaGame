// Juega un evento con jugadores automáticos y dice cuánto tarda cada objetivo (para calibrar las
// medallas). Uso: node tools/event-sim.js [evento] [--detalle]
//   objetivo:    compra la siguiente mejora del evento apenas puede (o ahorra si le falta poco) y, si
//                no, sube lo más barato del camino que lleva al objetivo (estaciones, arrieros y, si
//                hay que vender, el despacho). Es como juega alguien atento.
//   recomendada: igual, pero sigue la «mejora recomendada» (que busca ganar más monedas, no el objetivo)
//   lento:       como objetivo, pero decide cada 30 s (alguien que mira el juego de vez en cuando)
import { Game } from '../src/core/Game.js';
import { EVENTS, EVENTS_BY_ID } from '../src/data/events.js';
import { STATIONS_BY_ID } from '../src/data/stations.js';
import { createEventState, eventProgress, boardObjective, quoteAction, buyAction } from '../src/sim/events.js';
import { recommendUpgrade } from '../src/sim/analysis.js';
import { PARENT } from '../src/sim/chain.js';

const defs = EVENTS_BY_ID[process.argv[2]] ? [EVENTS_BY_ID[process.argv[2]]] : EVENTS;
const verbose = process.argv.includes('--detalle');
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// Las estaciones que hacen falta para el objetivo: las que lo producen y todas las anteriores.
function pathOf(def, obj) {
  const ids = new Set();
  for (const product of Object.keys(obj.items)) {
    let id = def.stations.find((s) => Object.keys(STATIONS_BY_ID[s].out)[0] === product);
    while (id) {
      ids.add(id);
      id = PARENT[id];
    }
  }
  return [...ids];
}

function play(def, year, style) {
  const board = createEventState(def, year);
  const game = new Game(board);
  const obj = boardObjective(board);
  const every = style === 'lento' ? 30 : 5;
  const path = pathOf(def, obj);
  const options = [...path.flatMap((id) => [id, `${id}:transport`]), ...(obj.kind === 'sold' ? [`dispatch:${def.zone}`] : [])];
  let t = 0;
  const bought = [];
  while (eventProgress(board) < 1 && t < 4 * 3600) {
    for (let k = 0; k < every * 10; k++) game.step(0.1);
    t += every;
    for (let n = 0; n < 60; n++) {
      const next = def.actions.find((a) => !board.research.includes(a.id));
      if (next && quoteAction(board, next.id).ok) {
        buyAction(board, next.id);
        bought.push(`${next.name} ${mmss(t)}`);
        continue;
      }
      // Ahorra para la siguiente mejora del evento si le falta poco (menos de 60 s de ingresos).
      if (next && next.cost - board.coins < 60 * game.incomePerSecond()) break;
      let id;
      if (style === 'recomendada') {
        const r = recommendUpgrade(board, (x, mode) => game.quote(x, mode), def.zone);
        id = r && !r.id.startsWith('research:') ? r.id : null;
      } else {
        const quotes = options.map((x) => [x, game.quote(x, 1)]).filter(([, q]) => q.affordable);
        id = quotes.sort((a, b) => a[1].cost - b[1].cost)[0]?.[0];
      }
      if (!id || !game.buy(id, 1)) break;
    }
  }
  return { t, bought, board };
}

for (const def of defs) {
  console.log(`== ${def.icon} ${def.name}`);
  for (let year = 1; year <= def.objectives.length; year++) {
    const obj = def.objectives[year - 1];
    const runs = ['objetivo', 'recomendada', 'lento'].map((style) => [style, play(def, year, style)]);
    const times = runs.map(([style, r]) => `${style} ${mmss(r.t)}`).join(' · ');
    console.log(`año ${year}: ${obj.kind} ${JSON.stringify(obj.items)}: ${times} (oro ${mmss(obj.medals[0])}, plata ${mmss(obj.medals[1])})`);
    if (verbose) {
      const r = runs[0][1];
      console.log(`   compras: ${r.bought.join(', ') || 'ninguna'}`);
      console.log(`   niveles: ${Object.entries(r.board.stations).map(([id, st]) => `${id} ${st.level}/${st.transport.level}`).join(' · ')}`);
    }
  }
}
