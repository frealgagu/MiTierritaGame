// Logros generales (v2.3): lo que se cuenta suma lo de las partidas anteriores (state.profile.lifetime,
// que se llena al reiniciar) y lo de esta. Al llegar a un nivel se gana su Renombre, una sola vez.
import { LOGROS } from '../data/logros.js';
import { ALBUM } from '../data/album.js';
import { YEAR_DAYS, DAY_LENGTH } from './calendar.js';
import { pageDone, profileOf } from './renown.js';

const YEAR = YEAR_DAYS * DAY_LENGTH;

function lifetimeOf(profile) {
  return (profile.lifetime ??= { sold: {}, produced: {}, earned: 0, playTime: 0 });
}

// Al reiniciar (segundo final): lo de la partida que termina pasa al acumulado.
export function bankRun(state, profile) {
  const life = lifetimeOf(profile);
  for (const kind of ['sold', 'produced']) {
    for (const [id, n] of Object.entries(state.stats?.[kind] ?? {})) life[kind][id] = (life[kind][id] ?? 0) + n;
  }
  life.earned += state.totalEarned ?? 0;
  life.playTime += state.playTime ?? 0;
}

export function metric(state, name) {
  const profile = profileOf(state);
  const life = lifetimeOf(profile);
  const [kind, product] = name.split(':');
  const runs = state.legacy?.history?.length ?? 0;
  switch (kind) {
    case 'sold':
    case 'produced':
      return (life[kind][product] ?? 0) + (state.stats[kind][product] ?? 0);
    case 'earned':
      return life.earned + state.totalEarned;
    case 'years':
      return (life.playTime + state.playTime) / YEAR;
    // Cada partida que se reinició llegó al segundo final, y antes al primero.
    case 'endings':
      return runs + (state.zones.pueblo?.complete ? 1 : 0);
    case 'masteries':
      return runs + (state.mastered ? 1 : 0);
    case 'medals':
      return Object.values(profile.medals).reduce((n, m) => n + Object.values(m.count ?? {}).reduce((a, b) => a + b, 0), 0);
    case 'eventsMedaled':
      return Object.values(profile.medals).filter((m) => m.best).length;
    case 'eventsGold':
      return Object.values(profile.medals).filter((m) => m.best === 'gold').length;
    case 'pages':
      return ALBUM.filter((pg) => pageDone(profile, pg.id)).length;
    case 'research':
      return state.research.length;
    default:
      return 0;
  }
}

// Niveles alcanzados de un logro según lo que lleva (0 a tiers.length).
export const tierOf = (logro, value) => logro.tiers.filter((t) => value >= t).length;

// Revisa los logros y paga los niveles nuevos. Devuelve la lista de lo ganado: [{ logro, tier, reward }].
export function checkLogros(state) {
  const profile = profileOf(state);
  profile.logros ??= {};
  const won = [];
  for (const logro of LOGROS) {
    const have = profile.logros[logro.id] ?? 0;
    const tier = tierOf(logro, metric(state, logro.metric));
    for (let k = have; k < tier; k++) {
      profile.renown += logro.reward[k];
      won.push({ logro, tier: k + 1, reward: logro.reward[k] });
    }
    if (tier > have) profile.logros[logro.id] = tier;
  }
  return won;
}
