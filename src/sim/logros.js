// General achievements (v2.3): counters sum prior runs (stored in profile on reset)
// and current run. Reaching a tier awards Renown once.
// Since v3.10 each region has its own achievements (see data/logros.js) reading that
// region's save; Renown goes to shared player profile.
import { logrosOf } from '../data/logros.js';
import { albumOf } from '../data/album.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { YEAR_DAYS, DAY_LENGTH } from './calendar.js';
import { gainRenown, pageDone, profileOf } from './renown.js';
import { CAPS, capAdd } from '../data/caps.js';

const YEAR = YEAR_DAYS * DAY_LENGTH;

// Cumulative totals from finished runs of a region (Eje Cafetero's predates v3.10).
function lifetimeOf(profile, region = 'cafetero') {
  const empty = () => ({ sold: {}, produced: {}, earned: 0, playTime: 0 });
  if (region === 'cafetero') return (profile.lifetime ??= empty());
  profile.lifetimes ??= {};
  return (profile.lifetimes[region] ??= empty());
}

// On reset (second ending): finishing run counters fold into region totals.
export function bankRun(state, profile) {
  const life = lifetimeOf(profile, state.region);
  for (const kind of ['sold', 'produced']) {
    for (const [id, n] of Object.entries(state.stats?.[kind] ?? {})) life[kind][id] = capAdd(life[kind][id], n, CAPS.stat);
  }
  life.earned = capAdd(life.earned, state.totalEarned ?? 0, CAPS.lifetimeEarned);
  life.playTime += state.playTime ?? 0;
}

// state: region save   profile: player's (held by Eje Cafetero save)
export function metric(state, name, profile = profileOf(state)) {
  const region = state.region ?? 'cafetero';
  const life = lifetimeOf(profile, region);
  const [kind, product] = name.split(':');
  // Finished runs: region resets (v4.0; up to 60, matching multiplier cap).
  const runs = state.legacy?.resets ?? 0;
  // Event medals earned in this region.
  const medals = Object.entries(profile.medals)
    .filter(([id]) => REGION_OF_ZONE[EVENTS_BY_ID[id]?.zone] === region)
    .map(([, m]) => m);
  switch (kind) {
    case 'sold':
    case 'produced':
      return Math.min(CAPS.stat, (life[kind][product] ?? 0) + (state.stats[kind][product] ?? 0));
    case 'earned':
      return Math.min(CAPS.lifetimeEarned, life.earned + state.totalEarned);
    case 'years':
      return Math.min(CAPS.years, (life.playTime + state.playTime) / YEAR);
    // Every reset run reached second ending, and earlier the first ending (final zone).
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
    // Medals earned in one event (v4.7: Gran Feria de Bogotá).
    case 'eventMedals':
      return Object.values(profile.medals[product]?.count ?? {}).reduce((a, b) => a + b, 0);
    case 'pages':
      return albumOf(region).filter((pg) => pageDone(profile, pg.id)).length;
    case 'research':
      return state.research.length;
    default:
      return 0;
  }
}

// Tiers reached for an achievement given current count (0 to tiers.length).
export const tierOf = (logro, value) => logro.tiers.filter((t) => value >= t).length;

// Evaluates achievements for `state`'s region and pays new tiers. Returns newly earned list:
// [{ logro, tier, reward }].
export function checkLogros(state, profile = profileOf(state)) {
  profile.logros ??= {};
  const won = [];
  for (const logro of logrosOf(state.region ?? 'cafetero')) {
    const have = profile.logros[logro.id] ?? 0;
    const tier = tierOf(logro, metric(state, logro.metric, profile));
    for (let k = have; k < tier; k++) {
      gainRenown(profile, logro.reward[k]);
      won.push({ logro, tier: k + 1, reward: logro.reward[k] });
    }
    if (tier > have) profile.logros[logro.id] = tier;
  }
  return won;
}

