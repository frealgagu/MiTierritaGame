// Inglés (v3.68).
import { applyContent } from '../apply.js';
import { setArticleRule } from '../../data/lore.js';
import UI from './ui.js';
import stations from './content/stations.js';
import products from './content/products.js';
import productZones from './content/productZones.js';
import { researchTexts } from './researchText.js';
import events from './content/events.js';
import eventActions from './content/eventActions.js';
import medals from './content/medals.js';
import albumPages from './content/albumPages.js';
import stickers from './content/stickers.js';
import logros from './content/logros.js';
import routes from './content/routes.js';
import zones from './content/zones.js';
import facts from './content/facts.js';
import people from './content/people.js';
import welcome from './content/welcome.js';
import decor from './content/decor.js';
import regions from './content/regions.js';
import songs from './content/songs.js';

export { UI };
export const DECIMAL = '.';

// «the Wet Mill» (en español, «el Beneficiadero»): si el nombre ya trae su artículo, se deja.
const article = (name) => (/^(the|a|an) /i.test(name) ? name.replace(/^The /, 'the ') : `the ${name}`);

export function applyData() {
  applyContent({ stations, products, productZones, events, eventActions, medals, albumPages, stickers, logros, routes, zones, facts, people, welcome, decor, regions, songs });
  // Las investigaciones después: su descripción usa los nombres de estaciones y productos ya en inglés.
  applyContent({ research: researchTexts() });
  setArticleRule(article);
}
