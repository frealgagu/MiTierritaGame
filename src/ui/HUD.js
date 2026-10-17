import { formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { recommendUpgrade } from '../sim/analysis.js';
import { nextToUnlock } from '../sim/chain.js';
import { toast } from './toast.js';
import { clockLabel } from '../render/DayNight.js';
import { ZONES_BY_ID } from '../data/zones/index.js';

// Nombre legible de lo que se mejora: 'farm', 'farm:transport' o 'dispatch:<zona>'.
export function upgradeName(id) {
  const [sid, part] = id.split(':');
  if (sid === 'dispatch') return DISPATCH.name;
  return part === 'transport' ? `Arrieros del ${STATIONS_BY_ID[sid].name}` : STATIONS_BY_ID[sid].name;
}

export class HUD {
  // getZone: zona que se está viendo.
  constructor(game, onOpen, getHour, getZone) {
    this.game = game;
    this.getZone = getZone;
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
    // Las monedas también en la pestaña del navegador.
    const title = `💰 ${formatNumber(s.coins)} · Cafetal`;
    if (document.title !== title) document.title = title;
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    const hour = this.getHour();
    if (hour !== undefined) this.clock.textContent = clockLabel(hour);
    const zone = this.getZone();
    const rec = recommendUpgrade(s, (id, mode) => this.game.quote(id, mode), zone);
    this.recommended = rec.id;
    this.guide = this.guideTarget(s, rec, zone);
    this.chip.hidden = false;
    this.chip.textContent = `💡 Mejora recomendada: ${upgradeName(rec.id)}`;
    this.hintUnlock(s, zone);
  }

  // Qué señalar con la flecha del mapa: algo que ya se puede pagar (construir primero, luego mejorar).
  guideTarget(s, rec, zone) {
    for (const { stationId: id } of ZONES_BY_ID[zone].plots) {
      if (!s.stations[id] && this.game.quoteUnlock(id).ok) return id;
    }
    if (rec && this.game.quote(rec.id, 1).affordable) return rec.id.split(':')[0];
    return null;
  }

  // Avisa una sola vez cuando alcanza para construir la siguiente estación.
  hintUnlock(s, zone) {
    const id = nextToUnlock(s, zone);
    if (!id || s.hints.includes(id)) return;
    const q = this.game.quoteUnlock(id);
    if (!q.ok) return;
    s.hints.push(id);
    toast(`🏗️ ¡Ya puedes construir ${STATIONS_BY_ID[id].name}! Toca su parcela en el mapa.`, 6000);
  }
}
