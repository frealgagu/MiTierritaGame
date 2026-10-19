// Jugadores automáticos de los eventos (los usan tools/event-sim.js para calibrar las medallas y
// test/events.test.js para comprobar que el oro se puede lograr).
//   estilo  obj: sube lo más barato del camino que lleva al objetivo (estaciones, arrieros y, si hay
//                que vender, el despacho)
//           rec: sigue la «mejora recomendada» (que en el tablero mira solo el camino del objetivo)
//           mix: sigue la recomendada si ya le alcanza; si no, como obj (no ahorra para la recomendada)
//   ahorro  compra la siguiente mejora del evento apenas puede; si no le alcanza pero le falta menos que
//           `save` segundos de ingresos, espera a juntar (0 = nunca espera)
//   every   cada cuántos segundos decide (1 = alguien muy atento; 30 = alguien que mira de vez en cuando)
import { Game } from '../src/core/Game.js';
import { createEventState, eventProgress, quoteAction, buyAction, objectiveUpgrades } from '../src/sim/events.js';
import { recommendUpgrade } from '../src/sim/analysis.js';

export const STYLES = ['obj', 'rec', 'mix'];
export const SAVES = [0, 30, 60, 120];

// Juega el objetivo de ese año y devuelve { t (segundos), bought (compras del evento con su hora), board }.
export function play(def, year, { style = 'rec', save = 30, every = 1, limit = 2 * 3600 } = {}) {
  const board = createEventState(def, year);
  const game = new Game(board);
  const cheapest = () => objectiveUpgrades(board).map((x) => [x, game.quote(x, 1)]).filter(([, q]) => q.affordable).sort((a, b) => a[1].cost - b[1].cost)[0]?.[0];
  const bought = [];
  let t = 0;
  // Decide también en el segundo cero: el tablero arranca con monedas.
  for (;;) {
    for (let n = 0; n < 60; n++) {
      const next = def.actions.find((a) => !board.research.includes(a.id));
      if (next && quoteAction(board, next.id).ok) {
        buyAction(board, next.id);
        bought.push([next.id, t]);
        continue;
      }
      if (next && next.cost - board.coins < save * game.incomePerSecond()) break;
      let id = null;
      if (style === 'obj') id = cheapest();
      else {
        const r = recommendUpgrade(board, (x, mode) => game.quote(x, mode), def.zone);
        id = r && !r.id.startsWith('research:') && game.quote(r.id, 1).affordable ? r.id : null;
        if (style === 'mix' && !id) id = cheapest();
      }
      if (!id || !game.buy(id, 1)) break;
    }
    if (eventProgress(board) >= 1 || t >= limit) break;
    for (let k = 0; k < every * 10; k++) game.step(0.1);
    t += every;
  }
  return { t, bought, board };
}

// El más rápido de todos los estilos y ahorros, decidiendo cada segundo: { t, style, save }.
export function bestRun(def, year, opts = {}) {
  let best = null;
  for (const style of STYLES) {
    for (const save of SAVES) {
      const { t } = play(def, year, { ...opts, style, save });
      if (!best || t < best.t) best = { t, style, save };
    }
  }
  return best;
}
