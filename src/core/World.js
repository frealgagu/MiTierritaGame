// The whole game (v5.13): the save that holds the player's data and every region (sim/state.js:
// createGameState). It has no production of its own; it keeps the country clock running (each region's clock
// matches it) and fills the two game-wide event slots, which until v5.12 the Eje Cafetero simulation did as a side
// effect. Same `update`, `step`, `timeScale` and catch-up interface as core/Game.js, so it advances in lockstep with
// the regions.
import { TICK } from './Game.js';
import { refillSlots } from '../sim/events.js';

export class World {
  constructor(state) {
    this.state = state;
    this.accumulator = 0;
    this.timeScale = 1;
  }

  update(dtSeconds) {
    this.accumulator += Math.min(dtSeconds, 1) * this.timeScale;
    while (this.accumulator >= TICK) {
      this.step(TICK);
      this.accumulator -= TICK;
    }
  }

  step(dt) {
    this.state.playTime += dt;
    refillSlots(this.state);
  }

  // Time away: the clock moves on as much as the regions do (the same cap), then the slots are refilled.
  catchUp(seconds, cap) {
    const total = Math.min(Math.max(seconds, 0), cap);
    this.state.playTime += total;
    refillSlots(this.state);
    return { seconds: total };
  }
}
