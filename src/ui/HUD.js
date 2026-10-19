import { formatMult, formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { recommendUpgrade } from '../sim/analysis.js';
import { legacyMult } from '../sim/modifiers.js';
import { nextToUnlock, zoneOf } from '../sim/chain.js';
import { clockLabel } from '../render/DayNight.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { RESEARCH_BY_ID } from '../data/research.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { setFitted } from './fit.js';
import { say } from './Chatter.js';
import { withArticle } from '../data/lore.js';

// Nombre legible de lo que se mejora: 'farm', 'farm:transport', 'dispatch:<zona>' o 'route:<ruta>'.
export function upgradeName(id) {
  const [sid, part] = id.split(':');
  if (sid === 'research') return `🔬 ${RESEARCH_BY_ID[part].name}`;
  if (sid === 'dispatch') return DISPATCH.name;
  if (sid === 'route') return `${ROUTES_BY_ID[part].icon} ${ROUTES_BY_ID[part].name}`;
  return part === 'transport' ? `Arrieros del ${STATIONS_BY_ID[sid].name}` : STATIONS_BY_ID[sid].name;
}

const REC_INTERVAL_MS = 1000;

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
    this.recCost = 0; // ms que tardó la última recomendación
    this.legacy = document.getElementById('legacy-chip');
    // Tras una compra, la recomendación se recalcula enseguida.
    for (const type of ['levelUp', 'unlocked', 'research', 'zoneUnlocked']) game.bus.on(type, () => (this.recDirty = true));
    // Tocar el aviso abre la mejora recomendada.
    this.chip.addEventListener('click', () => this.recommended && onOpen(this.recommended));
  }

  update() {
    const s = this.game.state;
    this.coins.textContent = formatNumber(s.coins);
    // Multiplicador de producción de esta partida (tras reiniciar en el segundo final).
    const mult = legacyMult(s);
    this.legacy.hidden = mult <= 1;
    const legacyText = `🔁 Producción ${formatMult(mult)}`;
    if (this.legacy.textContent !== legacyText) this.legacy.textContent = legacyText;
    // En rojo si hay deuda (saldo negativo de las opciones de desarrollador).
    this.coins.classList.toggle('debt', s.coins < 0);
    // Las monedas también en la pestaña del navegador.
    const title = `💰 ${formatNumber(s.coins)} · Cafetal`;
    if (document.title !== title) document.title = title;
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    const hour = this.getHour();
    if (hour !== undefined) this.clock.textContent = clockLabel(hour);
    const zone = this.getZone();
    // La recomendación mira varias zonas (rutas) y cuesta calcularla: como mucho una vez por segundo.
    const now = performance.now();
    // En un móvil lento, si calcularla tarda, se espera más (diez veces lo que tardó).
    if (zone !== this.recZone || this.recDirty || !(now - this.recAt <= Math.max(REC_INTERVAL_MS, this.recCost * 10))) {
      this.rec = recommendUpgrade(s, (id, mode) => this.game.quote(id, mode), zone);
      this.recCost = performance.now() - now;
      this.recZone = zone;
      this.recAt = now;
      this.recDirty = false;
    }
    const rec = this.rec;
    this.recommended = rec?.id ?? null;
    this.guide = this.guideTarget(s, rec, zone);
    if (!rec) {
      // No queda nada que subir: o falta construir algo, o la zona está al máximo.
      const next = nextToUnlock(s, zone);
      this.chip.hidden = false;
      setFitted(this.chip, next ? `🏗️ Siguiente: construye ${STATIONS_BY_ID[next].name}` : '🏁 Esta zona está al máximo');
      if (next) this.recommended = next;
      this.hintUnlock(s, zone);
      return;
    }
    this.chip.hidden = false;
    // Puede ser de la zona que la abastece por una ruta: se dice de cuál.
    const [sid] = rec.id.split(':');
    const elsewhere = STATIONS_BY_ID[sid] && zoneOf(sid) !== zone ? ` (${ZONES_BY_ID[zoneOf(sid)].icon} ${ZONES_BY_ID[zoneOf(sid)].name})` : '';
    setFitted(this.chip, `💡 Mejora recomendada: ${upgradeName(rec.id)}${elsewhere}`);
    this.hintUnlock(s, zone);
  }

  // Qué señalar con la flecha del mapa: algo que ya se puede pagar (construir primero, luego mejorar).
  guideTarget(s, rec, zone) {
    for (const { stationId: id } of ZONES_BY_ID[zone].plots) {
      if (!s.stations[id] && this.game.quoteUnlock(id).ok) return id;
    }
    if (!rec || rec.id.startsWith('research:')) return null; // la flecha solo señala edificios
    const sid = rec.id.split(':')[0];
    if (STATIONS_BY_ID[sid] && zoneOf(sid) !== zone) return null; // está en otra zona
    if (!this.game.quote(rec.id, 1).affordable) return null;
    // La ruta se mejora desde la estación que abastece.
    if (!rec.id.startsWith('route:')) return rec.id.split(':')[0];
    return ROUTES_BY_ID[rec.id.split(':')[1]].stations.find((id) => s.stations[id]) ?? null;
  }

  // Avisa una sola vez cuando alcanza para construir la siguiente estación.
  hintUnlock(s, zone) {
    const id = nextToUnlock(s, zone);
    if (!id || s.hints.includes(id)) return;
    const q = this.game.quoteUnlock(id);
    if (!q.ok) return;
    s.hints.push(id);
    say(zone, `¡Ya alcanza para construir ${withArticle(STATIONS_BY_ID[id].name)}! Toque su parcela en el mapa.`);
  }
}
