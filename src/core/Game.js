import { EventBus } from './EventBus.js';
import { createInitialState } from '../sim/state.js';
import { stepComposter, stepFuel, stepStation } from '../sim/production.js';
import { ZONE_LIST } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stepMules } from '../sim/transport.js';
import { stepJeep } from '../sim/dispatch.js';
import { offlineCapSeconds } from '../sim/modifiers.js';
import { buyResearch, buyUpgrade, quoteResearch, quoteUnlock, quoteUpgrade, unlockStation } from '../sim/upgrades.js';
import { claimGoal, unlockZone } from '../sim/goals.js';

export const TICK = 0.1; // s, la simulación avanza a 10 ticks/s
const INCOME_WINDOW = 60; // s para calcular 💰/s

export class Game {
  constructor(state = createInitialState()) {
    this.state = state;
    this.bus = new EventBus();
    this.accumulator = 0;
    this.incomeLog = [];
    this.bus.on('sold', ({ coins }) => this.incomeLog.push({ t: this.state.playTime, coins }));
  }

  // Avanza el tiempo real transcurrido en pasos fijos.
  update(dtSeconds) {
    this.accumulator += Math.min(dtSeconds, 1);
    while (this.accumulator >= TICK) {
      this.step(TICK);
      this.accumulator -= TICK;
    }
  }

  step(dt) {
    this.state.playTime += dt;
    // Todas las zonas abiertas producen a la vez, aunque solo se vea una.
    for (const zone of ZONE_LIST) {
      if (!this.state.zones[zone.id]?.unlocked) continue;
      for (const id of zone.chain) {
        if (!this.state.stations[id]) continue;
        if (STATIONS_BY_ID[id].fuel) stepFuel(this.state, id);
        stepStation(this.state, id, dt, this.bus);
      }
    }
    stepComposter(this.state, dt, this.bus);
    stepMules(this.state, dt, this.bus);
    for (const zone of ZONE_LIST) if (this.state.zones[zone.id]?.unlocked) stepJeep(this.state, zone.id, dt, this.bus);
  }

  // Ganancias mientras el juego estuvo cerrado: se simula en pasos de 1 s, sin efectos visuales.
  catchUp(seconds) {
    const total = Math.min(Math.max(seconds, 0), offlineCapSeconds(this.state));
    const before = this.state.coins;
    this.bus.muted = true;
    for (let t = 0; t < total; t += 1) this.step(1);
    this.bus.muted = false;
    return { seconds: total, coins: this.state.coins - before };
  }

  incomePerSecond() {
    const now = this.state.playTime;
    this.incomeLog = this.incomeLog.filter((e) => now - e.t <= INCOME_WINDOW);
    const window = Math.min(INCOME_WINDOW, Math.max(now, 1));
    return this.incomeLog.reduce((n, e) => n + e.coins, 0) / window;
  }

  quote(id, mode) {
    return quoteUpgrade(this.state, id, mode);
  }

  buy(id, mode) {
    return buyUpgrade(this.state, id, mode, this.bus);
  }

  quoteUnlock(id) {
    return quoteUnlock(this.state, id);
  }

  unlock(id) {
    return unlockStation(this.state, id, this.bus);
  }

  quoteResearch(id) {
    return quoteResearch(this.state, id);
  }

  research(id) {
    return buyResearch(this.state, id, this.bus);
  }

  claimGoal(id) {
    return claimGoal(this.state, id, this.bus);
  }

  unlockZone(id) {
    return unlockZone(this.state, id, this.bus);
  }
}
