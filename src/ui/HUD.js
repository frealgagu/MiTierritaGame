import { formatNumber, formatRate } from '../core/format.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { dispatchRate, stationOutputRate } from '../sim/rules.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.coins = document.getElementById('coins');
    this.income = document.getElementById('income');
    this.chip = document.getElementById('bottleneck');
  }

  update() {
    const s = this.game.state;
    this.coins.textContent = formatNumber(s.coins);
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    const farm = stationOutputRate(STATIONS_BY_ID.farm, s.stations.farm.level);
    const dispatch = dispatchRate(s.dispatch.level);
    this.chip.hidden = false;
    this.chip.textContent = farm > dispatch ? '🔴 Cuello de botella: Despacho' : '🔴 Cuello de botella: Cafetal';
  }
}
