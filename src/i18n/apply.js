// Pone los textos de un idioma sobre los datos del juego (v3.68), por id: así no hay que tocar cada lugar
// que usa `.name`. Se llama una vez al arrancar, antes de que el juego lea los datos.
//   content: lo que trae el idioma, cada parte con su forma corta (ver en/content/*.js):
//     stations { id: nombre } · products { id: nombre } · productZones { id: nombre }
//     research { id: [nombre, descripción] } · events { id: [nombre, presentación, aviso, lo que frena] }
//     eventActions { id: [nombre, descripción] } · medals { gold: 'gold' }
//     albumPages { id: nombre } · stickers { id: [nombre, texto] } · logros { id: [nombre, texto] }
//     routes { id: [nombre, vehículo, pestaña] } · zones { id: [nombre, letrero de salida, { ruta: letrero }] }
//     facts { id: [dato, …] } · people { zona: [nombre, oficio] } · welcome { zona: saludo }
//     decor { id: [nombre, { opción: nombre }] } · regions { id: nombre } · songs { región: [nombre, instrumentos] }
// Lo que falte se queda en español.
import { STATIONS } from '../data/stations.js';
import { PRODUCTS, ZONES as PRODUCT_ZONES } from '../data/products.js';
import { RESEARCH } from '../data/research.js';
import { EVENTS, EVENT_ACTIONS_BY_ID, MEDALS } from '../data/events.js';
import { ALBUM, STICKERS_BY_ID } from '../data/album.js';
import { LOGROS } from '../data/logros.js';
import { ROUTES } from '../data/routes.js';
import { ZONE_LIST } from '../data/zones/index.js';
import { FACTS, PEOPLE, WELCOME } from '../data/lore.js';
import { DECOR } from '../data/decor.js';
import { REGIONS } from '../data/regions.js';
import { SONGS } from '../audio/songs.js';

// Pone los campos `fields` de cada objeto de `items` (por su id) con lo que diga `texts[id]`: un texto
// (el primer campo) o una lista (en orden; null deja el de español).
function patch(items, texts, fields) {
  if (!texts) return;
  for (const item of items) {
    const v = texts[item.id];
    if (v == null) continue;
    const list = Array.isArray(v) ? v : [v];
    fields.forEach((f, i) => {
      if (typeof list[i] === 'string' && f in item) item[f] = list[i];
    });
  }
}

// Lo mismo para un objeto con los ids como claves (PRODUCTS, MEDALS).
function applyKeyed(obj, texts, fields) {
  for (const [id, v] of Object.entries(texts ?? {})) {
    const item = obj[id];
    if (!item) continue;
    const list = Array.isArray(v) ? v : [v];
    fields.forEach((f, i) => {
      if (typeof list[i] === 'string') item[f] = list[i];
    });
  }
}

export function applyContent(c) {
  patch(STATIONS, c.stations, ['name']);
  applyKeyed(PRODUCTS, c.products, ['name']);
  patch(PRODUCT_ZONES, c.productZones, ['name']);
  patch(RESEARCH, c.research, ['name', 'desc']);
  patch(EVENTS, c.events, ['name', 'intro', 'announce', 'blame']);
  // Las compras de los eventos están dos veces: en su evento y en EVENT_ACTIONS_BY_ID (una copia).
  patch([...EVENTS.flatMap((e) => e.actions), ...Object.values(EVENT_ACTIONS_BY_ID)], c.eventActions, ['name', 'desc']);
  applyKeyed(MEDALS, c.medals, ['name']);
  patch(ALBUM, c.albumPages, ['name']);
  patch([...ALBUM.flatMap((p) => p.stickers), ...Object.values(STICKERS_BY_ID)], c.stickers, ['name', 'text']);
  patch(LOGROS, c.logros, ['name', 'text']);
  patch(ROUTES, c.routes, ['name', 'vehicle', 'tab']);
  patch(ZONE_LIST, c.zones, ['name', 'exitText']);
  for (const z of ZONE_LIST) {
    const signs = c.zones?.[z.id]?.[2];
    if (signs) for (const [id, text] of Object.entries(signs)) if (z.routes?.[id]) z.routes[id].text = text;
  }
  for (const [id, list] of Object.entries(c.facts ?? {})) if (FACTS[id]) FACTS[id] = list;
  for (const [id, [name, role]] of Object.entries(c.people ?? {})) if (PEOPLE[id]) Object.assign(PEOPLE[id], { name, role });
  for (const [id, text] of Object.entries(c.welcome ?? {})) if (id in WELCOME) WELCOME[id] = text;
  patch(DECOR, c.decor, ['name']);
  for (const d of DECOR) patch(d.options, c.decor?.[d.id]?.[1], ['name']);
  patch(REGIONS, c.regions, ['name']);
  for (const [id, [name, instruments]] of Object.entries(c.songs ?? {})) if (SONGS[id]) Object.assign(SONGS[id], { name, instruments });
}
