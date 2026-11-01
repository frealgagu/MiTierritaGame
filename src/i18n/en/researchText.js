// Las investigaciones en inglés (v3.68): el nombre de en/content/research.js y la descripción armada con su
// efecto («The Wet Mill works twice as fast.»), con los nombres ya en inglés. Las que llevan una nota
// (para qué sirve, qué se ajusta solo) tienen su texto propio en NOTES.
import { RESEARCH } from '../../data/research.js';
import { STATIONS_BY_ID } from '../../data/stations.js';
import { PRODUCTS } from '../../data/products.js';
import { ZONES_BY_ID } from '../../data/zones/index.js';
import NAMES, { COMMON, NOTES } from './content/research.js';

const the = (name) => (/^the /i.test(name) ? name.replace(/^The /, 'the ') : `the ${name}`);
const capital = (s) => s[0].toUpperCase() + s.slice(1);
const times = (m) => (m === 2 ? 'twice as' : m === 4 ? 'four times as' : `${m} times as`);

function describe(r, spanishName) {
  const e = r.effect;
  switch (e.type) {
    case 'stationSpeed':
      return `${capital(the(STATIONS_BY_ID[e.target].name))} works ${times(e.mult)} fast.`;
    case 'muleSpeed':
      return e.mult === 1.5 ? 'The mules walk 50 % faster.' : `The mules walk ${times(e.mult)} fast.`;
    case 'dispatchCapacity':
      return `The Willys carries ${times(e.mult)} much per trip.`;
    case 'productValue':
      return `${PRODUCTS[e.target].name} is worth ${Math.round((e.mult - 1) * 100)} % more.`;
    case 'zoneValue':
      return `Everything ${the(ZONES_BY_ID[e.target].name)} sells is worth ${Math.round((e.mult - 1) * 100)} % more.`;
    case 'zoneSpeed':
      return `All the buildings in the zone produce ×${e.mult}.`;
    default:
      return spanishName;
  }
}

// { id: [nombre, descripción] } para applyContent.
export function researchTexts() {
  const out = {};
  for (const r of RESEARCH) {
    const zone = ZONES_BY_ID[r.zone]?.name.replace(/^The /, '') ?? '';
    const name = NAMES[r.id] ?? COMMON[r.name] ?? (r.id.startsWith('maestria_') ? `Mastery: ${zone}` : r.id.startsWith('supremacia_') ? `Supremacy: ${zone}` : null);
    out[r.id] = [name, NOTES[r.id] ?? describe(r, r.desc)];
  }
  return out;
}
