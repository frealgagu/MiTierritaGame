import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { recommendUpgrade } from '../sim/analysis.js';
import { nextToUnlock } from '../sim/chain.js';
import { toast } from './toast.js';
import { clockLabel } from '../render/DayNight.js';

// Nombre legible de lo que se mejora: 'farm', 'farm:transport' o 'dispatch'.
export function upgradeName(id) {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') return DISPATCH.name;
  return part === 'transport' ? `Arrieros del ${STATIONS_BY_ID[sid].name}` : STATIONS_BY_ID[sid].name;
}

export class HUD {
  constructor(game, onOpen, getHour) {
    this.game = game;
    this.getHour = getHour;
    this.clock = document.getElementById('clock');
    this.coins = document.getElementById('coins');
    this.income = document.getElementById('income');
    this.chip = document.getElementById('bottleneck');
    // Tocar el aviso abre la mejora recomendada.
    this.chip.addEventListener('click', () => this.recommended && onOpen(this.recommended));
  }

  update() {
    const s = this.game.state;
    this.coins.textContent = formatNumber(s.coins);
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    const hour = this.getHour();
    if (hour !== undefined) this.clock.textContent = clockLabel(hour);
    const rec = recommendUpgrade(s, (id, mode) => this.game.quote(id, mode));
    this.recommended = rec.id;
    this.chip.hidden = false;
    this.chip.textContent = `💡 Mejora recomendada: ${upgradeName(rec.id)}`;
    this.hintUnlock(s);
  }

  // Avisa una sola vez cuando alcanza para construir la siguiente estación.
  hintUnlock(s) {
    const id = nextToUnlock(s);
    if (!id || s.hints.includes(id)) return;
    const q = this.game.quoteUnlock(id);
    if (!q.ok) return;
    s.hints.push(id);
    toast(`🏗️ ¡Ya puedes construir ${STATIONS_BY_ID[id].name}! Toca su parcela en el mapa.`, 6000);
  }
}
