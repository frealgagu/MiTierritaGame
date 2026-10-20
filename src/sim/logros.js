// Logros generales (v2.3): lo que se cuenta suma lo de las partidas anteriores (lo que se guarda en el
// perfil al reiniciar) y lo de esta. Al llegar a un nivel se gana su Renombre, una sola vez.
// Desde la v3.10 cada región tiene sus logros (ver data/logros.js), que miran la partida de esa región;
// el Renombre es el mismo del jugador.
import { logrosOf } from '../data/logros.js';
import { albumOf } from '../data/album.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { YEAR_DAYS, DAY_LENGTH } from './calendar.js';
import { pageDone, profileOf } from './renown.js';

const YEAR = YEAR_DAYS * DAY_LENGTH;

// Lo acumulado de las partidas terminadas de una región (el del Eje Cafetero es el de antes de la v3.10).
function lifetimeOf(profile, region = 'cafetero') {
  const empty = () => ({ sold: {}, produced: {}, earned: 0, playTime: 0 });
  if (region === 'cafetero') return (profile.lifetime ??= empty());
  profile.lifetimes ??= {};
  return (profile.lifetimes[region] ??= empty());
}

// Al reiniciar (segundo final): lo de la partida que termina pasa al acumulado de su región.
export function bankRun(state, profile) {
  const life = lifetimeOf(profile, state.region);
  for (const kind of ['sold', 'produced']) {
    for (const [id, n] of Object.entries(state.stats?.[kind] ?? {})) life[kind][id] = (life[kind][id] ?? 0) + n;
  }
  life.earned += state.totalEarned ?? 0;
  life.playTime += state.playTime ?? 0;
}

// state: la partida de la región   profile: el del jugador (lo guarda la del Eje Cafetero)
export function metric(state, name, profile = profileOf(state)) {
  const region = state.region ?? 'cafetero';
  const life = lifetimeOf(profile, region);
  const [kind, product] = name.split(':');
  const runs = state.legacy?.history?.length ?? 0;
  // Las medallas de los eventos de esta región.
  const medals = Object.entries(profile.medals)
    .filter(([id]) => REGION_OF_ZONE[EVENTS_BY_ID[id]?.zone] === region)
    .map(([, m]) => m);
  switch (kind) {
    case 'sold':
    case 'produced':
      return (life[kind][product] ?? 0) + (state.stats[kind][product] ?? 0);
    case 'earned':
      return life.earned + state.totalEarned;
    case 'years':
      return (life.playTime + state.playTime) / YEAR;
    // Cada partida que se reinició llegó al segundo final, y antes al primero (su última zona).
    case 'endings':
      return runs + (state.zones[REGIONS_BY_ID[region].zones.at(-1)]?.complete ? 1 : 0);
    case 'masteries':
      return runs + (state.mastered ? 1 : 0);
    case 'medals':
      return medals.reduce((n, m) => n + Object.values(m.count ?? {}).reduce((a, b) => a + b, 0), 0);
    case 'eventsMedaled':
      return medals.filter((m) => m.best).length;
    case 'eventsGold':
      return medals.filter((m) => m.best === 'gold').length;
    case 'pages':
      return albumOf(region).filter((pg) => pageDone(profile, pg.id)).length;
    case 'research':
      return state.research.length;
    default:
      return 0;
  }
}

// Niveles alcanzados de un logro según lo que lleva (0 a tiers.length).
export const tierOf = (logro, value) => logro.tiers.filter((t) => value >= t).length;

// Revisa los logros de la región de `state` y paga los niveles nuevos. Devuelve la lista de lo ganado:
// [{ logro, tier, reward }].
export function checkLogros(state, profile = profileOf(state)) {
  profile.logros ??= {};
  const won = [];
  for (const logro of logrosOf(state.region ?? 'cafetero')) {
    const have = profile.logros[logro.id] ?? 0;
    const tier = tierOf(logro, metric(state, logro.metric, profile));
    for (let k = have; k < tier; k++) {
      profile.renown += logro.reward[k];
      won.push({ logro, tier: k + 1, reward: logro.reward[k] });
    }
    if (tier > have) profile.logros[logro.id] = tier;
  }
  return won;
}

