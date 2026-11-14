import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../src/data/events.js';
import { Game } from '../src/core/Game.js';
import { createEventState, eventProgress, EVENT_CLOCK_MAX } from '../src/sim/events.js';

// Without touching anything, the board runs on its own up to `limit` seconds; returns completion time (or null).
function idle(def, limit) {
  const board = createEventState(def, 1);
  const game = new Game(board);
  for (let t = 0; t < limit; t++) {
    for (let k = 0; k < 10; k++) game.step(0.1);
    if (eventProgress(board) >= 1) return t + 1;
  }
  return null;
}

// All six event types (Tolima Grande's, one per zone): idle doesn't reach silver (v4.3.2).
test('sin hacer nada no se gana la plata en un evento (v4.3.2)', () => {
  for (const def of EVENTS.filter((e) => e.zone && ['achirales', 'cafe_huila', 'betania', 'lechoneria', 'chamba', 'neiva'].includes(e.zone))) {
    assert.equal(idle(def, def.objective.medals[1]), null, `${def.id}: llega a la plata solo`);
  }
});

// Even when the road is blocked a trickle arrives: letting it run finishes with bronze (v4.3.2).
test('sin hacer nada el evento de la vía tapada se termina, con bronce (v4.3.2)', () => {
  const def = EVENTS.find((e) => e.id === 'derrumbe_tolima');
  const t = idle(def, EVENT_CLOCK_MAX);
  assert.ok(t !== null && t > def.objective.medals[1], `terminó en ${t}`);
});

// Cundinamarca's (v4.4.8), with Tolima Grande's numbers: same behavior.
test('Cundinamarca: sin hacer nada no se gana la plata, y el derrumbe se termina con bronce (v4.4.8)', () => {
  for (const def of EVENTS.filter((e) => ['flores', 'fresas', 'truchas', 'salinas', 'cocina', 'zipaquira'].includes(e.zone))) {
    assert.equal(idle(def, def.objective.medals[1]), null, `${def.id}: llega a la plata solo`);
  }
  const def = EVENTS.find((e) => e.id === 'derrumbe_sabana');
  const t = idle(def, EVENT_CLOCK_MAX);
  assert.ok(t !== null && t > def.objective.medals[1], `terminó en ${t}`);
});

// Bogotá's (v4.5), several in the same zone: idle doesn't earn silver, and in ones where the tractomula doesn't
// arrive (pico y placa, strike) a trickle still arrives, so letting them run finishes with bronze.
test('Bogotá: sin hacer nada no se gana la plata, y los de la tractomula se terminan con bronce (v4.5)', () => {
  for (const def of EVENTS.filter((e) => e.zone === 'bogota')) {
    assert.equal(idle(def, def.objective.medals[1]), null, `${def.id}: llega a la plata solo`);
  }
  for (const id of ['pico_placa', 'paro_camionero']) {
    const def = EVENTS.find((e) => e.id === id);
    const t = idle(def, EVENT_CLOCK_MAX);
    assert.ok(t !== null && t > def.objective.medals[1], `${id}: terminó en ${t}`);
  }
});
