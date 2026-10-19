import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../src/data/events.js';
import { play } from '../tools/event-bots.js';

// El oro tiene que ser difícil pero posible (v3.1.1): alguien que mira el tablero cada 5 s y sigue una
// de dos estrategias razonables (la mejora recomendada, ahorrando hasta 2 min para la siguiente compra
// del evento, o lo que alcance del camino del objetivo, ahorrando 30 s) lo logra en cada objetivo.
// Las medallas se calibran con tools/event-sim.js; si un cambio en la simulación las deja fuera de
// alcance, esta prueba lo dice.
for (const def of EVENTS) {
  test(`${def.icon} ${def.name}: el oro de cada año se puede lograr`, () => {
    def.objectives.forEach((obj, i) => {
      const gold = obj.medals[0];
      const times = [];
      for (const [style, save] of [['rec', 120], ['mix', 30]]) {
        times.push(play(def, i + 1, { style, save, every: 5, limit: gold + 60 }).t);
        if (times.at(-1) <= gold) return;
      }
      assert.fail(`año ${i + 1}: el oro pide ${gold} s y los jugadores automáticos tardan ${times.join(' y ')} s`);
    });
  });
}
