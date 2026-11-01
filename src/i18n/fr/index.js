// Français (v3.70).
import { applyContent } from '../apply.js';
import { setArticleRule } from '../../data/lore.js';
import ui from './ui.js';
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
import { frArticle } from './article.js';

// La typographie française : une espace insécable avant ! ? : ; et à l’intérieur des « ». Los textos se
// escriben con espacio normal y aquí se vuelve insecable, para que «!» nunca quede solo en otro renglón.
export const nbsp = (s) => s.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');
const deep = (v) => (typeof v === 'string' ? nbsp(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);

export const UI = deep(ui);
export const DECIMAL = ',';

export function applyData() {
  applyContent(deep({ stations, products, productZones, events, eventActions, medals, albumPages, stickers, logros, routes, zones, facts, people, welcome, decor, regions, songs, dispatch, seasons, victory, pets }));
  // Les recherches ensuite : leur description utilise les noms des stations et des produits déjà en français.
  applyContent({ research: deep(researchTexts()) });
  setArticleRule(frArticle);
}
