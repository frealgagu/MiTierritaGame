// Cuánto tarda cada evento si no se hace nada (v4.3.2): no debería llegar a la plata solo, pero sí al bronce.
// Uso: node tools/event-idle.js
import { EVENTS } from '../src/data/events.js';
import { Game } from '../src/core/Game.js';
import { createEventState, eventProgress, EVENT_CLOCK_MAX } from '../src/sim/events.js';

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export function idleTime(def, limit = EVENT_CLOCK_MAX) {
  const board = createEventState(def, 1);
  const game = new Game(board);
  let t = 0;
  while (t < limit && eventProgress(board) < 1) {
    for (let k = 0; k < 10; k++) game.step(0.1);
    t += 1;
  }
  return { t, done: eventProgress(board) >= 1, progress: eventProgress(board) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const def of EVENTS) {
    const r = idleTime(def);
    const [g, s] = def.objective.medals;
    const flag = !r.done ? 'NO LLEGA' : r.t <= s ? 'PLATA SOLO' : 'ok';
    console.log(`${def.id.padEnd(24)} sin hacer nada ${r.done ? mmss(r.t) : `${Math.round(r.progress * 100)} %`} · 🥇 ${mmss(g)} 🥈 ${mmss(s)} · ${flag}`);
  }
}
