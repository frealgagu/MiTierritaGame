import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../src/data/events.js';
import { Game } from '../src/core/Game.js';
import { createEventState, eventProgress, EVENT_CLOCK_MAX } from '../src/sim/events.js';

// Sin tocar nada, el tablero corre solo hasta `limit` segundos; devuelve en cuánto terminó (o null).
function idle(def, limit) {
  const board = createEventState(def, 1);
  const game = new Game(board);
  for (let t = 0; t < limit; t++) {
    for (let k = 0; k < 10; k++) game.step(0.1);
    if (eventProgress(board) >= 1) return t + 1;
  }
  return null;
}

// Los seis tipos de evento (los del Tolima Grande, uno por zona): sin hacer nada no se llega a la plata (v4.3.2).
test('sin hacer nada no se gana la plata en un evento (v4.3.2)', () => {
  for (const def of EVENTS.filter((e) => e.zone && ['achirales', 'cafe_huila', 'betania', 'lechoneria', 'chamba', 'neiva'].includes(e.zone))) {
    assert.equal(idle(def, def.objective.medals[1]), null, `${def.id}: llega a la plata solo`);
  }
});

// Aunque la vía esté tapada llega un hilito: dejándolo correr se termina, con bronce (v4.3.2).
test('sin hacer nada el evento de la vía tapada se termina, con bronce (v4.3.2)', () => {
  const def = EVENTS.find((e) => e.id === 'derrumbe_tolima');
  const t = idle(def, EVENT_CLOCK_MAX);
  assert.ok(t !== null && t > def.objective.medals[1], `terminó en ${t}`);
});
