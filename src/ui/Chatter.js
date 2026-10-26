import { FACTS, PEOPLE, WELCOME, WithArticle, withArticle } from '../data/lore.js';
import { formatNumber } from '../core/format.js';
import { nextToUnlock } from '../sim/chain.js';
import { quoteUnlock } from '../sim/upgrades.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { alerts } from '../sim/alerts.js';
import { slowConsumers } from '../sim/transport.js';
import { waitingHarvest } from '../sim/production.js';
import { toast } from './toast.js';
import { clockOf, hourLabel, isLunch, isWorkTime, nextWorkHour, seasonOf, workOf } from '../sim/calendar.js';
import { EVENTS } from '../data/events.js';
import { eventDef, eventHandicaps, eventStatus, handicapText } from '../sim/events.js';

// La persona de cada zona avisa lo importante (v1.8): la bienvenida la primera vez que se ve su zona
// y los problemas que duran (los mismos de los íconos del mapa) en cuanto aparecen. Sin cansar: cada
// estación avisa como mucho una vez cada 5 minutos, y entre un aviso y otro pasan al menos 45 s.
// También anuncia cada temporada nueva y, la primera vez, que de noche no se trabaja (v1.9).
const PER_STATION_MS = 5 * 60 * 1000;
const BETWEEN_MS = 45 * 1000;

const capital = (s) => s[0].toUpperCase() + s.slice(1);

// Lo último que dijo cada persona (v3.12: al tocarla en el mapa lo repite, si aún aplica).
const lastLine = new Map();
let cursor = null; // { zone, i }: por dónde va al tocarla varias veces seguidas

export const say = (zone, text, ms = 6000) => {
  const p = PEOPLE[zone];
  lastLine.set(zone, text);
  cursor = null;
  toast(`${p.icon} ${p.name}: ${text}`, ms, { speech: true });
};

// Hablar al tocar a la persona de la zona (v3.12): la primera vez repite lo último que dijo, si todavía
// aplica; cada toque siguiente pasa al siguiente aviso que aplique (y vuelve a empezar).
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

export class Chatter {
  // root: la partida principal, con los cupos de los eventos (v3.30).
  constructor(game, getZone, root = () => game.state) {
    this.game = game;
    this.getZone = getZone;
    this.root = root;
    this.seen = new Map(); // estación → avisos que ya estaban puestos
    this.lastSaid = new Map(); // estación → cuándo avisó
    this.lastAny = -Infinity;
    this.season = seasonOf(clockOf(game.state));
  }

  update() {
    // Con una ventana abierta (la de inicio, objetivos…) espera: el aviso se perdería detrás.
    if (document.querySelector('.modal:not([hidden])')) return;
    const state = this.game.state;
    const zone = this.getZone();
    // Bienvenida, una vez por zona.
    const key = `welcome:${zone}`;
    if (!state.hints.includes(key)) {
      state.hints.push(key);
      say(zone, WELCOME[zone], 7000);
      this.lastAny = performance.now();
      return;
    }
    const now = performance.now();
    const season = seasonOf(clockOf(state));
    if (season !== this.season) {
      this.season = season;
      this.lastAny = now;
      const mult = season.mult === 1 ? '' : ` (×${String(season.mult).replace('.', ',')})`;
      // Con las Hormigas abiertas, la entrada de aguas la anuncia Doña Gloria (v3.4).
      if (season.id === 'entrada' && state.zones.hormigas?.unlocked) {
        say('hormigas', '🌦️ ¡Llegó la entrada de aguas y salieron las hormigas culonas! Es la cosecha de todo el año: suba el Hormiguero y sus arrieros.', 7000);
        return;
      }
      say(zone, `${season.icon} ¡Llegó ${withArticle(season.name.toLowerCase())}! ${capital(season.text)}${mult}.`, 7000);
      return;
    }
    // Un evento que se abre (una vez al año), dicho por la persona de su zona.
    for (const def of EVENTS) {
      if (!(def.zone in state.zones)) continue; // (los de las otras regiones los dice su gente)
      const st = eventStatus(this.root(), def.zone);
      const hint = `evento:${def.id}:${st?.round}`; // (v3.7: por reto; antes, `event:` por año)
      if (st?.kind !== 'available' || state.hints.includes(hint)) continue;
      state.hints.push(hint);
      this.lastAny = now;
      say(def.zone, `${def.icon} ${def.announce}`, 7000);
      return;
    }
    // De noche no hay problemas que avisar: todo descansa.
    // (v3.8: también a la hora del almuerzo, de 12 a 14, mientras no se compre ese bloque).
    const t = clockOf(state);
    const extra = workOf(state);
    if (!isWorkTime(t, extra)) {
      const lunch = isLunch(t, extra);
      const hint = lunch ? 'lunch' : 'night';
      if (!state.hints.includes(hint)) {
        state.hints.push(hint);
        this.lastAny = now;
        say(
          zone,
          lunch
            ? '¡A almorzar! De 12 a 2 se para: la jornada sigue a las 14:00. Con Renombre ⭐ se puede trabajar también a esta hora.'
            : `De noche no se trabaja: las estaciones descansan hasta las ${hourLabel(nextWorkHour(t, extra))}. ¡Hasta mañana, patrón!`,
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
      // Si hay que esperar, queda pendiente (sin marcarlo como visto) y avisa cuando se pueda.
      if (now - this.lastAny < BETWEEN_MS) continue;
      this.seen.set(id, on);
      if (now - (this.lastSaid.get(id) ?? -Infinity) < PER_STATION_MS) continue;
      this.lastSaid.set(id, now);
      this.lastAny = now;
      say(zone, this.message(state, id, on, a));
    }
  }

  // Lo que la persona de la zona tiene para decir ahora (v3.12), lo más urgente primero: en un evento,
  // lo que lo frena y qué comprar; en la partida, el evento que se puede jugar, la noche o el almuerzo, los
  // problemas de sus estaciones, la temporada y, para que nunca se quede callada, un dato de su zona.
  lines(zone) {
    const state = this.game.state;
    const out = [];
    if (state.event) {
      const def = eventDef(state);
      for (const h of eventHandicaps(state)) if (h.pct < 1) out.push(handicapText(state, h));
      const next = def.actions.find((a) => !state.research.includes(a.id));
      if (next) out.push(`${next.icon} Compre ${next.name} (💰 ${formatNumber(next.cost)}): ${next.desc}`);
      if (state.event.done) out.push(`🏁 ¡Ganamos el evento! Mire todo lo que quiera; para cerrarlo, toque 🏁 Terminar evento.`);
      else if (state.event.medal) out.push(`✅ La medalla ya está asegurada. Faltan las compras del evento para terminarlo.`);
      else out.push(`${def.icon} ${def.intro}`);
      return out;
    }
    for (const def of EVENTS) {
      if (def.zone === zone && eventStatus(this.root(), def.zone)?.kind === 'available') out.push(`${def.icon} ${def.announce}`);
    }
    // Lo que ya se puede construir.
    const build = nextToUnlock(state, zone);
    if (build && quoteUnlock(state, build).ok) out.push(`¡Ya alcanza para construir ${withArticle(STATIONS_BY_ID[build].name)}! Toque su parcela en el mapa.`);
    const t = clockOf(state);
    const extra = workOf(state);
    if (!isWorkTime(t, extra)) {
      out.push(
        isLunch(t, extra)
          ? '¡A almorzar! De 12 a 2 se para: la jornada sigue a las 14:00. Con Renombre ⭐ se puede trabajar también a esta hora.'
          : `De noche no se trabaja: las estaciones descansan hasta las ${hourLabel(nextWorkHour(t, extra))}. ¡Hasta mañana, patrón!`,
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
    const season = seasonOf(t);
    if (season.id !== 'none') out.push(`${season.icon} Estamos en ${season.name.toLowerCase()} (${season.text}).`);
    const facts = Object.keys(state.stations).filter((id) => STATIONS_BY_ID[id].zone === zone).flatMap((id) => FACTS[id] ?? []);
    if (facts.length) out.push(`💡 ¿Sabía que…? ${facts[Math.floor(Math.random() * facts.length)]}`);
    return out;
  }

  // Tocaron a la persona de la zona en el mapa.
  talk(zone) {
    talk(zone, this.lines(zone));
  }

  message(state, id, kind, a) {
    const name = STATIONS_BY_ID[id].name;
    if (kind === 'starved' && waitingHarvest(state, STATIONS_BY_ID[id].zone)) return 'Se acabó lo de la despensa: toca esperar a que salgan las hormigas en la entrada de aguas 🌦️.';
    if (kind === 'starved') return `${WithArticle(name)} está esperando producto: hay que mejorar las estaciones anteriores.`;
    if (kind === 'diverting') return `En ${withArticle(name)} se está vendiendo producto sin procesar: la siguiente no da abasto.`;
    if (a.waiting === 'space') return '¡Se llenó la bodega! Hay que mejorar el Despacho.';
    const slow = slowConsumers(state, id);
    if (slow.length) return `${WithArticle(name)} produce más de lo que alcanza a procesar ${withArticle(STATIONS_BY_ID[slow[0]].name)}. ¡Hay que subirle el nivel!`;
    return `¡En ${withArticle(name)} las mulas no dan abasto, patrón! Hay que mejorar a los arrieros.`;
  }
}
