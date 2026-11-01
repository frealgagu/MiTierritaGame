// Les recherches en français (v3.70) : le nom de fr/content/research.js et la description montée avec
// l’effet («Le Dépulpeur travaille deux fois plus vite.»), avec les noms déjà en français. Celles qui ont
// une note (à quoi elles servent, ce qui s’ajuste tout seul) ont leur texte dans NOTES.
import { RESEARCH } from '../../data/research.js';
import { STATIONS_BY_ID } from '../../data/stations.js';
import { PRODUCTS } from '../../data/products.js';
import { ZONES_BY_ID } from '../../data/zones/index.js';
import NAMES, { COMMON, NOTES } from './content/research.js';
import { frArticle } from './article.js';

const capital = (s) => s[0].toUpperCase() + s.slice(1);
const times = (m) => ({ 2: 'deux fois', 3: 'trois fois', 4: 'quatre fois' })[m] ?? `${m} fois`;
const pct = (m) => Math.round((m - 1) * 100);

function describe(r, spanishName) {
  const e = r.effect;
  switch (e.type) {
    case 'stationSpeed':
      return `${capital(frArticle(STATIONS_BY_ID[e.target].name))} travaille ${times(e.mult)} plus vite.`;
    case 'muleSpeed':
      return e.mult === 1.5 ? 'Les mules marchent 50 % plus vite.' : `Les mules marchent ${times(e.mult)} plus vite.`;
    case 'dispatchCapacity':
      return `La Willys porte ${times(e.mult)} plus par voyage.`;
    case 'productValue':
      return `${capital(frArticle(PRODUCTS[e.target].name.toLowerCase()))} vaut ${pct(e.mult)} % de plus.`;
    case 'zoneValue':
      return `Tout ce que vend ${ZONES_BY_ID[e.target].name} vaut ${pct(e.mult)} % de plus.`;
    case 'zoneSpeed':
      return `Tous les bâtiments de la zone produisent ×${e.mult}.`;
    default:
      return spanishName;
  }
}

// { id: [nom, description] } pour applyContent.
export function researchTexts() {
  const out = {};
  for (const r of RESEARCH) {
    const zone = ZONES_BY_ID[r.zone]?.name ?? '';
    const name = NAMES[r.id] ?? COMMON[r.name] ?? (r.id.startsWith('maestria_') ? `Maîtrise : ${zone}` : r.id.startsWith('supremacia_') ? `Suprématie : ${zone}` : null);
    out[r.id] = [name, NOTES[r.id] ?? describe(r, r.desc)];
  }
  return out;
}
