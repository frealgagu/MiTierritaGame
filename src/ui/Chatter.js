import { fiestasOn, today } from '../sim/fiestas.js';
import { FACTS, PEOPLE, WELCOME, WithArticle, withArticle } from '../data/lore.js';
import { formatNumber } from '../core/format.js';
import { nextToUnlock } from '../sim/chain.js';
import { quoteUnlock } from '../sim/upgrades.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { alerts } from '../sim/alerts.js';
import { slowConsumers } from '../sim/transport.js';
import { waitingHarvest } from '../sim/production.js';
import { toast } from './toast.js';
import { t } from '../i18n/index.js';
import { decimal } from '../core/format.js';
import { clockOf, hourLabel, isLunch, isWorkTime, nextWorkHour, seasonOf, workOf } from '../sim/calendar.js';
import { EVENTS, eventKey } from '../data/events.js';
import { eventDef, eventHandicaps, eventStatus, handicapText } from '../sim/events.js';

// Zone character announces key moments (v1.8): a welcome the first time the zone is viewed
// and persistent bottlenecks (same as map warning icons) as soon as they appear. Not spammy: each
// station speaks at most once every 5 minutes, and notices wait at least 45 s between messages.
// Also announces each new season and, the first time, that work pauses at night (v1.9).
const PER_STATION_MS = 5 * 60 * 1000;
const BETWEEN_MS = 45 * 1000;

const capital = (s) => s[0].toUpperCase() + s.slice(1);

// Last remark per character (v3.12: tapping them on the map repeats it if still relevant).
const lastLine = new Map();
let cursor = null; // { zone, i }: index tracked when tapping them repeatedly

export const say = (zone, text, ms = 6000) => {
  const p = PEOPLE[zone];
  lastLine.set(zone, text);
  cursor = null;
  toast(`${p.icon} ${p.name}: ${text}`, ms, { speech: true });
};

// Speak when tapping the zone character on the map (v3.12): first tap repeats last remark if still
// relevant; each subsequent tap cycles to the next applicable notice (wrapping around).
export function talk(zone, lines) {
  const p = PEOPLE[zone];
  if (!lines.length) return;
  let i;
  if (cursor?.zone === zone) i = (cursor.i + 1) % lines.length;
  else {
    const k = lines.indexOf(lastLine.get(zone));
    i = k >= 0 ? k : 0;
  }
  cursor = { zone, i };
  lastLine.set(zone, lines[i]);
  toast(`${p.icon} ${p.name}: ${lines[i]}${lines.length > 1 ? ` (${i + 1}/${lines.length})` : ''}`, 7000, { speech: true, now: true });
}

// Fiesta greetings already said today (zone and date): not saved, so a new day greets again.
const greeted = new Set();

export class Chatter {
  // root: main save, with event slots (v3.30).
  constructor(game, getZone, root = () => game.state) {
    this.game = game;
    this.getZone = getZone;
    this.root = root;
    this.seen = new Map(); // station → notices already shown
    this.lastSaid = new Map(); // station → last notice timestamp
    this.lastAny = -Infinity;
    this.season = seasonOf(clockOf(game.state));
  }

  update() {
    // With a modal open (intro, goals…) wait: notice would be lost behind it.
    if (document.querySelector('.modal:not([hidden])')) return;
    const state = this.game.state;
    const zone = this.getZone();
    // Welcome line, once per zone.
    const key = `welcome:${zone}`;
    if (!state.hints.includes(key)) {
      state.hints.push(key);
      say(zone, WELCOME[zone], 7000);
      this.lastAny = performance.now();
      return;
    }
    const now = performance.now();
    // (v5.17) The real calendar's fiestas: each zone's person greets once a day while one lasts (sim/fiestas.js).
    for (const { fiesta } of fiestasOn()) {
      const said = `${fiesta.id}:${today().toDateString()}:${zone}`;
      if (greeted.has(said)) continue;
      greeted.add(said);
      say(zone, t(fiesta.greeting), 7000);
      this.lastAny = now;
      return;
    }
    const season = seasonOf(clockOf(state));
    if (season !== this.season) {
      this.season = season;
      this.lastAny = now;
      const mult = season.mult === 1 ? '' : ` (×${decimal(season.mult)})`;
      // With Hormigas open, rainy onset is announced by Doña Gloria (v3.4).
      if (season.id === 'entrada' && state.zones.hormigas?.unlocked) {
        say('hormigas', t('🌦️ ¡Llegó la entrada de aguas y salieron las hormigas culonas! Es la cosecha de todo el año: suba el Hormiguero y sus arrieros.'), 7000);
        return;
      }
      say(zone, `${season.icon} ${t('¡Llegó {season}! {text}.', { season: withArticle(season.name.toLowerCase()), text: capital(season.text) + mult })}`, 7000);
      return;
    }
    // An event opening (once a year), spoken by its zone character.
    for (const def of EVENTS) {
      if (!(def.zone in state.zones)) continue; // (other regions' lines are spoken by their own people)
      const st = eventStatus(this.root(), eventKey(def));
      const hint = `evento:${def.id}:${st?.round}`; // (v3.7: per challenge; previously `event:` per year)
      if (st?.kind !== 'available' || state.hints.includes(hint)) continue;
      state.hints.push(hint);
      this.lastAny = now;
      say(def.zone, `${def.icon} ${def.announce}`, 7000);
      return;
    }
    // No bottleneck chatter at night: everything rests.
    // (v3.8: also at lunch, 12 to 14, until that shift block is bought).
    const clock = clockOf(state);
    const extra = workOf(state);
    if (!isWorkTime(clock, extra)) {
      const lunch = isLunch(clock, extra);
      const hint = lunch ? 'lunch' : 'night';
      if (!state.hints.includes(hint)) {
        state.hints.push(hint);
        this.lastAny = now;
        say(
          zone,
          lunch
            ? t('¡A almorzar! De 12 a 2 se para: la jornada sigue a las 14:00. Con Renombre ⭐ se puede trabajar también a esta hora.')
            : t('De noche no se trabaja: las estaciones descansan hasta las {hour}. ¡Hasta mañana, patrón!', { hour: hourLabel(nextWorkHour(clock, extra)) }),
          7000,
        );
      }
      return;
    }
    for (const [id, st] of Object.entries(state.stations)) {
      const def = STATIONS_BY_ID[id];
      if (def.zone !== zone) continue;
      const a = alerts(st);
      const on = a.blocked && !def.side ? 'blocked' : a.starved ? 'starved' : a.diverting ? 'diverting' : null;
      const before = this.seen.get(id);
      if (!on || on === before) {
        this.seen.set(id, on);
        continue;
      }
      // If deferred, keep pending (don't mark seen) and announce when clear.
      if (now - this.lastAny < BETWEEN_MS) continue;
      this.seen.set(id, on);
      if (now - (this.lastSaid.get(id) ?? -Infinity) < PER_STATION_MS) continue;
      this.lastSaid.set(id, now);
      this.lastAny = now;
      say(zone, this.message(state, id, on, a));
    }
  }

  // What the zone character has to say right now (v3.12), most urgent first: in an event,
  // what blocks it and what to buy; in main save, playable event, night or lunch break,
  // station issues, season, and a zone factoid so they are never speechless.
  lines(zone) {
    const state = this.game.state;
    const out = [];
    if (state.event) {
      const def = eventDef(state);
      for (const h of eventHandicaps(state)) if (h.pct < 1) out.push(handicapText(state, h));
      const next = def.actions.find((a) => !state.research.includes(a.id));
      if (next) out.push(t('{icon} Compre {action} (💰 {cost}): {desc}', { icon: next.icon, action: next.name, cost: formatNumber(next.cost), desc: next.desc }));
      if (state.event.done) out.push(t('🏁 ¡Ganamos el evento! Mire todo lo que quiera; para cerrarlo, toque 🏁 Terminar evento.'));
      else if (state.event.medal) out.push(t('✅ La medalla ya está asegurada. Faltan las compras del evento para terminarlo.'));
      else out.push(`${def.icon} ${def.intro}`);
      return out;
    }
    for (const def of EVENTS) {
      if (def.zone === zone && eventStatus(this.root(), eventKey(def))?.kind === 'available') out.push(`${def.icon} ${def.announce}`);
    }
    // What can already be built.
    const build = nextToUnlock(state, zone);
    if (build && quoteUnlock(state, build).ok) out.push(t('¡Ya alcanza para construir {station}! Toque su parcela en el mapa.', { station: withArticle(STATIONS_BY_ID[build].name) }));
    const clock = clockOf(state);
    const extra = workOf(state);
    if (!isWorkTime(clock, extra)) {
      out.push(
        isLunch(clock, extra)
          ? t('¡A almorzar! De 12 a 2 se para: la jornada sigue a las 14:00. Con Renombre ⭐ se puede trabajar también a esta hora.')
          : t('De noche no se trabaja: las estaciones descansan hasta las {hour}. ¡Hasta mañana, patrón!', { hour: hourLabel(nextWorkHour(clock, extra)) }),
      );
    } else {
      for (const [id, st] of Object.entries(state.stations)) {
        const def = STATIONS_BY_ID[id];
        if (def.zone !== zone) continue;
        const a = alerts(st);
        const on = a.blocked && !def.side ? 'blocked' : a.starved ? 'starved' : a.diverting ? 'diverting' : null;
        if (on) out.push(this.message(state, id, on, a));
      }
    }
    const season = seasonOf(clock);
    if (season.id !== 'none') out.push(`${season.icon} ${t('Estamos en {season} ({text}).', { season: season.name.toLowerCase(), text: season.text })}`);
    const facts = Object.keys(state.stations).filter((id) => STATIONS_BY_ID[id].zone === zone).flatMap((id) => FACTS[id] ?? []);
    if (facts.length) out.push(`💡 ${t('¿Sabía que…?')} ${facts[Math.floor(Math.random() * facts.length)]}`);
    return out;
  }

  // Zone character was tapped on the map.
  talk(zone) {
    talk(zone, this.lines(zone));
  }

  message(state, id, kind, a) {
    const name = STATIONS_BY_ID[id].name;
    if (kind === 'starved' && waitingHarvest(state, STATIONS_BY_ID[id].zone)) return t('Se acabó lo de la despensa: toca esperar a que salgan las hormigas en la entrada de aguas 🌦️.');
    if (kind === 'starved') return t('{station} está esperando producto: hay que mejorar las estaciones anteriores.', { station: WithArticle(name) });
    if (kind === 'diverting') return t('En {station} se está vendiendo producto sin procesar: la siguiente no da abasto.', { station: withArticle(name) });
    if (a.waiting === 'space') return t('¡Se llenó la bodega! Hay que mejorar el Despacho.');
    const slow = slowConsumers(state, id);
    if (slow.length) return t('{station} produce más de lo que alcanza a procesar {next}. ¡Hay que subirle el nivel!', { station: WithArticle(name), next: withArticle(STATIONS_BY_ID[slow[0]].name) });
    return t('¡En {station} las mulas no dan abasto, patrón! Hay que mejorar a los arrieros.', { station: withArticle(name) });
  }
}
