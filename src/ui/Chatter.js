import { PEOPLE, WELCOME, WithArticle, withArticle } from '../data/lore.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { alerts } from '../sim/alerts.js';
import { slowConsumers } from '../sim/transport.js';
import { toast } from './toast.js';
import { isWorkTime, seasonOf } from '../sim/calendar.js';

// La persona de cada zona avisa lo importante (v1.8): la bienvenida la primera vez que se ve su zona
// y los problemas que duran (los mismos de los íconos del mapa) en cuanto aparecen. Sin cansar: cada
// estación avisa como mucho una vez cada 5 minutos, y entre un aviso y otro pasan al menos 45 s.
// También anuncia cada temporada nueva y, la primera vez, que de noche no se trabaja (v1.9).
const PER_STATION_MS = 5 * 60 * 1000;
const BETWEEN_MS = 45 * 1000;

const capital = (s) => s[0].toUpperCase() + s.slice(1);

export const say = (zone, text, ms = 6000) => {
  const p = PEOPLE[zone];
  toast(`${p.icon} ${p.name}: ${text}`, ms);
};

export class Chatter {
  constructor(game, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.seen = new Map(); // estación → avisos que ya estaban puestos
    this.lastSaid = new Map(); // estación → cuándo avisó
    this.lastAny = -Infinity;
    this.season = seasonOf(game.state.playTime);
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
    const season = seasonOf(state.playTime);
    if (season !== this.season) {
      this.season = season;
      this.lastAny = now;
      const mult = season.mult === 1 ? '' : ` (×${String(season.mult).replace('.', ',')})`;
      say(zone, `${season.icon} ¡Llegó ${withArticle(season.name.toLowerCase())}! ${capital(season.text)}${mult}.`, 7000);
      return;
    }
    // De noche no hay problemas que avisar: todo descansa.
    if (!isWorkTime(state.playTime)) {
      if (!state.hints.includes('night')) {
        state.hints.push('night');
        this.lastAny = now;
        say(zone, 'De noche no se trabaja: las estaciones descansan hasta las 6 de la mañana. ¡Hasta mañana, patrón!', 7000);
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

  message(state, id, kind, a) {
    const name = STATIONS_BY_ID[id].name;
    if (kind === 'starved') return `${WithArticle(name)} está esperando producto: hay que mejorar las estaciones anteriores.`;
    if (kind === 'diverting') return `En ${withArticle(name)} se está vendiendo producto sin procesar: la siguiente no da abasto.`;
    if (a.waiting === 'space') return '¡Se llenó la bodega! Hay que mejorar el Despacho.';
    const slow = slowConsumers(state, id);
    if (slow.length) return `${WithArticle(name)} produce más de lo que alcanza a procesar ${withArticle(STATIONS_BY_ID[slow[0]].name)}. ¡Hay que subirle el nivel!`;
    return `¡En ${withArticle(name)} las mulas no dan abasto, patrón! Hay que mejorar a los arrieros.`;
  }
}
