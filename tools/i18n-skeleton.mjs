// Los textos en español de una parte del contenido, con la forma que lleva cada idioma en
// src/i18n/<idioma>/content/<parte>.js (ver src/i18n/apply.js). Sirve para traducir y para saber qué falta.
//   node tools/i18n-skeleton.mjs <parte> [idioma]   (con idioma, solo lo que ese idioma todavía no tiene)
//   partes: stations products productZones research events eventActions medals albumPages stickers logros
//           routes zones facts people welcome decor regions songs victory
import { STATIONS } from '../src/data/stations.js';
import { PRODUCTS, ZONES as PRODUCT_ZONES } from '../src/data/products.js';
import { RESEARCH } from '../src/data/research.js';
import { EVENTS, MEDALS } from '../src/data/events.js';
import { ALBUM } from '../src/data/album.js';
import { LOGROS } from '../src/data/logros.js';
import { ROUTES } from '../src/data/routes.js';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { FACTS, PEOPLE, WELCOME } from '../src/data/lore.js';
import { DECOR } from '../src/data/decor.js';
import { REGIONS } from '../src/data/regions.js';
import { SONGS } from '../src/audio/songs.js';
import { VICTORY } from '../src/data/victory.js';

const pick = (list, fields) => Object.fromEntries(list.map((x) => [x.id, fields.length === 1 ? x[fields[0]] : fields.map((f) => x[f] ?? null)]));

export const PARTS = {
  stations: () => pick(STATIONS, ['name']),
  products: () => Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [id, p.name])),
  productZones: () => pick(PRODUCT_ZONES, ['name']),
  research: () => pick(RESEARCH, ['name', 'desc']),
  events: () => pick(EVENTS, ['name', 'intro', 'announce', 'blame']),
  eventActions: () => pick(EVENTS.flatMap((e) => e.actions), ['name', 'desc']),
  medals: () => Object.fromEntries(Object.entries(MEDALS).map(([id, m]) => [id, m.name])),
  albumPages: () => pick(ALBUM, ['name']),
  stickers: () => pick(ALBUM.flatMap((p) => p.stickers), ['name', 'text']),
  logros: () => pick(LOGROS, ['name', 'text']),
  routes: () => pick(ROUTES, ['name', 'vehicle', 'tab']),
  zones: () => Object.fromEntries(ZONE_LIST.map((z) => [z.id, [z.name, z.exitText ?? null, Object.fromEntries(Object.entries(z.routes ?? {}).map(([id, r]) => [id, r.text]))]])),
  facts: () => FACTS,
  people: () => Object.fromEntries(Object.entries(PEOPLE).map(([id, p]) => [id, [p.name, p.role]])),
  welcome: () => WELCOME,
  decor: () => Object.fromEntries(DECOR.map((d) => [d.id, [d.name, Object.fromEntries(d.options.map((o) => [o.id, o.name]))]])),
  regions: () => pick(REGIONS, ['name']),
  songs: () => Object.fromEntries(Object.entries(SONGS).map(([id, s]) => [id, [s.name, s.instruments]])),
  victory: () => Object.fromEntries(Object.entries(VICTORY).map(([id, v]) => [id, [v.title, v.text, v.stat[0]]])),
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const [part, lang] = process.argv.slice(2);
  let data = PARTS[part]();
  if (lang) {
    const have = (await import(`../src/i18n/${lang}/content/${part}.js`).catch(() => ({ default: {} }))).default;
    data = Object.fromEntries(Object.entries(data).filter(([id]) => !(id in have)));
  }
  const lines = Object.entries(data).map(([id, v]) => `  ${/^[a-z_][a-z0-9_]*$/i.test(id) ? id : JSON.stringify(id)}: ${JSON.stringify(v)},`);
  console.log(`export default {\n${lines.join('\n')}\n};`);
}
