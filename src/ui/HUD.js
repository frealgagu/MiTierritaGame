import { formatMult, formatNumber, formatRate } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { pendingUpgrade, recommendUpgrade, upgradeLevel } from '../sim/analysis.js';
import { legacyMult } from '../sim/modifiers.js';
import { nextSideToUnlock, nextToUnlock, zoneOf } from '../sim/chain.js';
import { clockLabel } from '../render/DayNight.js';
import { clockOf, seasonOf } from '../sim/calendar.js';
import { EVENTS_BY_ID, EVENT_ACTIONS_BY_ID } from '../data/events.js';
import { formatClock } from './EventBar.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { RESEARCH_BY_ID } from '../data/research.js';
import { ROUTES_BY_ID } from '../data/routes.js';
import { setFitted } from './fit.js';
import { say } from './Chatter.js';
import { withArticle } from '../data/lore.js';
import { t } from '../i18n/index.js';
import { cappedCoins } from './capped.js';

// Readable name of upgrade target: 'farm', 'farm:transport', 'dispatch:<zone>', or 'route:<route>'.
export function upgradeName(id) {
  const [sid, part] = id.split(':');
  if (sid === 'research') return `🔬 ${RESEARCH_BY_ID[part].name}`; // (in another zone: HUD.update labels it)
  if (sid === 'action') return `${EVENT_ACTIONS_BY_ID[part].icon} ${EVENT_ACTIONS_BY_ID[part].name}`; // event purchase
  if (sid === 'dispatch') return DISPATCH.name;
  if (sid === 'route') return `${ROUTES_BY_ID[part].icon} ${ROUTES_BY_ID[part].name}`;
  return part === 'transport' ? t('Arrieros del {station}', { station: STATIONS_BY_ID[sid].name }) : STATIONS_BY_ID[sid].name;
}

const REC_INTERVAL_MS = 1000;

// Updates text only when changed (avoid touching DOM on every frame).
const setText = (el, text) => el.textContent !== text && (el.textContent = text);

export class HUD {
  // getZone: currently viewed zone.
  constructor(game, onOpen, getHour, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.getHour = getHour;
    this.clock = document.getElementById('clock-time');
    this.season = document.getElementById('clock-season');
    this.coins = document.getElementById('coins');
    this.income = document.getElementById('income');
    this.chip = document.getElementById('bottleneck');
    this.recCost = 0; // ms taken by last recommendation calculation
    this.legacy = document.getElementById('legacy-chip');
    // After a purchase, recommendation recalculates immediately.
    for (const type of ['levelUp', 'unlocked', 'research', 'zoneUnlocked']) game.bus.on(type, () => (this.recDirty = true));
    // Tapping the hint opens the recommended upgrade.
    this.chip.addEventListener('click', () => this.recommended && onOpen(this.recommended));
  }

  update() {
    const s = this.game.state;
    this.coins.textContent = cappedCoins(s.coins);
    // Production multiplier for this playthrough (after second-ending reset).
    const mult = legacyMult(s);
    this.legacy.hidden = mult <= 1 || Boolean(s.event);
    const legacyText = t('🔁 Producción {mult}', { mult: formatMult(mult) });
    if (this.legacy.textContent !== legacyText) this.legacy.textContent = legacyText;
    // Red when in debt (negative balance from dev options).
    this.coins.classList.toggle('debt', s.coins < 0);
    // Coins also shown in the browser tab title.
    const title = `💰 ${formatNumber(s.coins)} · Mi Tierrita`;
    if (document.title !== title) document.title = title;
    this.income.textContent = `+${formatRate(this.game.incomePerSecond())}/s`;
    const hour = this.getHour();
    if (s.event) {
      // On an event board, uses its own clock.
      setText(this.clock, `⏱ ${formatClock(s.playTime)}`);
      setText(this.season, `${EVENTS_BY_ID[s.event.id].icon} ${t('Evento')}`);
    } else {
      if (hour !== undefined) setText(this.clock, clockLabel(hour));
      const season = seasonOf(clockOf(s));
      setText(this.season, `${season.icon} ${season.short}`);
    }
    const zone = this.getZone();
    // Recommendation checks multiple zones (routes) and is costly: run at most once per second.
    const now = performance.now();
    // On slow mobile devices, if calculation takes long, throttle further (ten times compute duration).
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
      // No upgrade increases income: either something remains unbuilt, something maxed doesn't raise sales
      // (v3.54: still named, so players don't assume everything is maxed), or zone is maxed.
      const next = nextToUnlock(s, zone) ?? nextSideToUnlock(s, zone);
      const pending = next ? null : pendingUpgrade(s, (id, mode) => this.game.quote(id, mode), zone);
      this.chip.hidden = false;
      if (next) setFitted(this.chip, t('🏗️ Siguiente: construye {station}', { station: STATIONS_BY_ID[next].name }));
      else if (pending) setFitted(this.chip, t('💡 Falta subir: {name} · Nv {level}', { name: upgradeName(pending.id), level: upgradeLevel(s, pending.id) }));
      else setFitted(this.chip, t('🏁 Esta zona está al máximo'));
      this.recommended = next ?? pending?.id ?? null;
      this.hintUnlock(s, zone);
      return;
    }
    this.chip.hidden = false;
    // Might belong to an upstream zone feeding this one via route: name which one.
    const [sid] = rec.id.split(':');
    const otherZone = sid === 'research' ? RESEARCH_BY_ID[rec.id.split(':')[1]].zone : STATIONS_BY_ID[sid] ? zoneOf(sid) : zone;
    const elsewhere = otherZone !== zone ? ` (${ZONES_BY_ID[otherZone].icon} ${ZONES_BY_ID[otherZone].name})` : '';
    setFitted(this.chip, t('💡 Mejora recomendada: {name}', { name: upgradeName(rec.id) + elsewhere }));
    this.hintUnlock(s, zone);
  }

  // What map arrow points at: something currently affordable (build first, then upgrade).
  guideTarget(s, rec, zone) {
    for (const { stationId: id } of ZONES_BY_ID[zone].plots) {
      if (!s.stations[id] && this.game.quoteUnlock(id).ok) return id;
    }
    if (!rec || rec.id.startsWith('research:') || rec.id.startsWith('action:')) return null; // arrow only points to buildings
    const sid = rec.id.split(':')[0];
    if (STATIONS_BY_ID[sid] && zoneOf(sid) !== zone) return null; // is in another zone
    if (!this.game.quote(rec.id, 1).affordable) return null;
    // Route upgrades from the supplying station.
    if (!rec.id.startsWith('route:')) return rec.id.split(':')[0];
    return ROUTES_BY_ID[rec.id.split(':')[1]].stations.find((id) => s.stations[id]) ?? null;
  }

  // Notifies once when funds first cover building the next station.
  hintUnlock(s, zone) {
    const id = nextToUnlock(s, zone);
    if (!id || s.hints.includes(id)) return;
    const q = this.game.quoteUnlock(id);
    if (!q.ok) return;
    s.hints.push(id);
    say(zone, t('¡Ya alcanza para construir {station}! Toque su parcela en el mapa.', { station: withArticle(STATIONS_BY_ID[id].name) }));
  }
}
