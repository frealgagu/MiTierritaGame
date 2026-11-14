// Overlay a language's texts onto game data (v3.68), by id: avoids touching every place
// reading `.name`. Called once at startup before the game reads data.
//   content: language payload, each section in short form (see en/content/*.js):
//     stations { id: name } · products { id: name } · productZones { id: name }
//     research { id: [name, description] } · events { id: [name, intro, notice, blame] }
//     eventActions { id: [name, description] } · medals { gold: 'gold' }
//     albumPages { id: name } · stickers { id: [name, text] } · logros { id: [name, text] }
//     routes { id: [name, vehicle, tab] } · zones { id: [name, exit sign, { route: sign }] }
//     facts { id: [fact, ...] } · people { zone: [name, role] } · welcome { zone: greeting }
//     decor { id: [name, { option: name }] } · regions { id: name } · songs { region: [name, instruments] }
//     dispatch: warehouse name · seasons { id: [name, short, text] }
//     victory { zone: [title, text, stat] } · pets { id: [name, plural] }
// Anything missing remains in Spanish.
import { DISPATCH, STATIONS } from '../data/stations.js';
import { SEASONS } from '../sim/calendar.js';
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
import { VICTORY } from '../data/victory.js';
import { PETS } from '../sim/renown.js';

// Sets `fields` on each item in `items` (by id) from `texts[id]`: a single string
// (the first field) or an array (in order; null keeps the Spanish original).
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

// Same helper for an object keyed by ids (PRODUCTS, MEDALS).
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
  // Event actions appear twice: inside their event and in EVENT_ACTIONS_BY_ID (a copy).
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
  if (c.dispatch) DISPATCH.name = c.dispatch;
  patch(SEASONS, c.seasons, ['name', 'short', 'text']);
  applyKeyed(PETS, c.pets, ['name', 'plural']);
  for (const [id, [title, text, stat]] of Object.entries(c.victory ?? {})) if (VICTORY[id]) Object.assign(VICTORY[id], { title, text, stat: [stat, VICTORY[id].stat[1]] });
}
