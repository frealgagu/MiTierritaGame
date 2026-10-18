import { EventBus } from './EventBus.js';
import { createInitialState } from '../sim/state.js';
import { stepComposter, stepFuel, stepStation } from '../sim/production.js';
import { ZONE_LIST } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { stepMules } from '../sim/transport.js';
import { stepJeep } from '../sim/dispatch.js';
import { stepRoute } from '../sim/routes.js';
import { ROUTES } from '../data/routes.js';
import { offlineCapSeconds } from '../sim/modifiers.js';
import { buyResearch, buyUpgrade, quoteResearch, quoteUnlock, quoteUpgrade, unlockStation } from '../sim/upgrades.js';
import { claimGoal, unlockZone } from '../sim/goals.js';
import { checkMastery } from '../sim/legacy.js';

export const TICK = 0.1; // s, la simulación avanza a 10 ticks/s
const MAX_SIMULATED = 2 * 3600; // s de juego que se simulan de verdad al volver; el resto se extrapola

// Lo que se extrapola del tiempo sin conexión.
const snapshot = (s) => ({ coins: s.coins, totalEarned: s.totalEarned, sold: { ...s.stats.sold }, produced: { ...s.stats.produced }, imported: { ...s.stats.imported } });
const INCOME_WINDOW = 60; // s para calcular 💰/s

export class Game {
  constructor(state = createInitialState()) {
    this.state = state;
    this.bus = new EventBus();
    this.accumulator = 0;
    this.incomeLog = [];
    this.timeScale = 1; // opciones de desarrollador: acelera el tiempo de juego
    this.bus.on('sold', ({ coins }) => this.incomeLog.push({ t: this.state.playTime, coins }));
  }

  // Avanza el tiempo real transcurrido en pasos fijos (multiplicado por `timeScale`).
  update(dtSeconds) {
    this.accumulator += Math.min(dtSeconds, 1) * this.timeScale;
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
    for (const route of ROUTES) stepRoute(this.state, route.id, dt, this.bus);
  }

  // Ganancias mientras el juego estuvo cerrado: se simula en pasos de 1 s, sin efectos visuales.
  //   seconds: segundos de juego (con el tiempo acelerado, ya multiplicados)   cap: tope en segundos de juego
  // Se simulan de verdad hasta MAX_SIMULATED s; el resto se suma al ritmo de la segunda mitad de lo
  // simulado (monedas, ventas, producción e importados), para que horas a ×100 no tarden minutos.
  catchUp(seconds, cap = offlineCapSeconds(this.state)) {
    const total = Math.min(Math.max(seconds, 0), cap);
    const s = this.state;
    const before = s.coins;
    const simulated = Math.min(total, MAX_SIMULATED);
    this.bus.muted = true;
    let mark = null;
    for (let t = 0; t < simulated; t += 1) {
      if (!mark && t >= simulated / 2) mark = { t, ...snapshot(s) };
      this.step(1);
    }
    this.bus.muted = false;
    const rest = total - simulated;
    if (rest > 0 && mark) {
      const k = rest / (simulated - mark.t);
      const now = snapshot(s);
      s.coins += (now.coins - mark.coins) * k;
      s.totalEarned += (now.totalEarned - mark.totalEarned) * k;
      for (const kind of ['sold', 'produced', 'imported']) {
        for (const [id, n] of Object.entries(now[kind])) s.stats[kind][id] = n + (n - (mark[kind][id] ?? 0)) * k;
      }
      s.playTime += rest;
    }
    return { seconds: total, coins: s.coins - before };
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
    const bought = buyUpgrade(this.state, id, mode, this.bus);
    if (bought) checkMastery(this.state, this.bus);
    return bought;
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
