// As pesquisas em português (v3.69): o nome de pt/content/research.js e a descrição montada com o efeito
// («O Despolpador trabalha duas vezes mais rápido.»), com os nomes já em português. As que têm uma nota
// (para que servem, o que se ajusta sozinho) têm o texto próprio em NOTES.
import { RESEARCH } from '../../data/research.js';
import { STATIONS_BY_ID } from '../../data/stations.js';
import { PRODUCTS } from '../../data/products.js';
import { ZONES_BY_ID } from '../../data/zones/index.js';
import NAMES, { COMMON, NOTES } from './content/research.js';
import { ptArticle } from './article.js';

const capital = (s) => s[0].toUpperCase() + s.slice(1);
const times = (m) => ({ 2: 'duas vezes', 3: 'três vezes', 4: 'quatro vezes' })[m] ?? `${m} vezes`;
const pct = (m) => Math.round((m - 1) * 100);

function describe(r, spanishName) {
  const e = r.effect;
  switch (e.type) {
    case 'stationSpeed':
      return `${capital(ptArticle(STATIONS_BY_ID[e.target].name))} trabalha ${times(e.mult)} mais rápido.`;
    case 'muleSpeed':
      return e.mult === 1.5 ? 'As mulas andam 50 % mais rápido.' : `As mulas andam ${times(e.mult)} mais rápido.`;
    case 'dispatchCapacity':
      return `O Willys leva ${times(e.mult)} mais por viagem.`;
    case 'productValue':
      return `${PRODUCTS[e.target].name} vale ${pct(e.mult)} % a mais.`;
    case 'zoneValue':
      return `Tudo o que ${ZONES_BY_ID[e.target].name} vende vale ${pct(e.mult)} % a mais.`;
    case 'zoneSpeed':
      return `Todos os edifícios da zona produzem ×${e.mult}.`;
    default:
      return spanishName;
  }
}

// { id: [nome, descrição] } para applyContent.
export function researchTexts() {
  const out = {};
  for (const r of RESEARCH) {
    const zone = ZONES_BY_ID[r.zone]?.name ?? '';
    const name = NAMES[r.id] ?? COMMON[r.name] ?? (r.id.startsWith('maestria_') ? `Maestria: ${zone}` : r.id.startsWith('supremacia_') ? `Supremacia: ${zone}` : null);
    out[r.id] = [name, NOTES[r.id] ?? describe(r, r.desc)];
  }
  return out;
}
