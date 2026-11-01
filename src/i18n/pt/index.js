// Português do Brasil (v3.69).
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
import { dispatch, pets, seasons } from './content/misc.js';
import victory from './content/victory.js';
import { ptArticle } from './article.js';

export { UI };
export const DECIMAL = ',';

export function applyData() {
  applyContent({ stations, products, productZones, events, eventActions, medals, albumPages, stickers, logros, routes, zones, facts, people, welcome, decor, regions, songs, dispatch, seasons, victory, pets });
  // As pesquisas depois: a descrição usa os nomes de estações e produtos já em português.
  applyContent({ research: researchTexts() });
  setArticleRule(ptArticle);
}
