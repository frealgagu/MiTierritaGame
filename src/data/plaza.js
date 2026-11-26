// La plaza de las fiestas (v5.19): where the season events are played (sim/seasonEvents.js). It belongs to no region:
// each big fiesta with an event dresses the plaza up with its own short chain, a zone of its own (`plaza_<fiesta>`)
// built from one layout, in the hidden region «fiestas» (data/regions.js: FIESTA_REGION). Its stations, products and
// zones join STATIONS_BY_ID, PRODUCTS and ZONES_BY_ID, but not the region lists (STATIONS, ZONE_LIST), so nothing
// of the main game counts them: no goal, achievement, album page, mastery or production page.
//   The chains need nothing from outside (no imports or routes): every board starts the same for everyone.
//   At the same level each station takes exactly what the one before it makes, like the Finca.
//   SEASON_EVENTS: one per fiesta with a plaza. Long events (about 3 hours of production played sensibly) with no
//   medals, upgrades or handicap: meeting the objective wins the fiesta's sticker (data/fiestas.js: FIESTA_PAGES).
import { tk } from '../i18n/index.js';
import { ICON } from './icons.js';

// The plaza's layout, Salento's (zone6_pueblo.js): the square with the first station in one corner and the others
// along the mule road down to the warehouse.
const LAYOUT = {
  size: 26,
  theme: 'town',
  style: 'salento',
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]],
  exitSign: [21.5, 24.2],
  exitText: tk('A la fiesta ➜'),
  muleSpeed: 4,
  dispatchCost: { base: 10, growth: 1.17 },
  routes: {},
  unlockedBy: null,
  next: null,
  region: 'fiestas',
  season: true,
};
// Plot spots along the road, in order (3x3 tiles).
const SPOTS = [
  { x: 9, y: 5 },
  { x: 5, y: 8 },
  { x: 11, y: 12 },
  { x: 13, y: 7 },
  { x: 17, y: 13 },
];
const plaza = (id, seed, fiesta, chain, decor) => ({
  ...LAYOUT,
  id,
  seed,
  fiesta,
  name: tk('La plaza de las fiestas'),
  icon: '🎉',
  chain,
  decor, // what render/Fiesta.js draws on it, whatever the date
  farm: { stationId: chain[0], x: 2, y: 2, w: 6, h: 6, look: fiesta }, // look: its first station's art (render/Stations.js)
  plots: chain.slice(1).map((stationId, k) => ({ stationId, ...SPOTS[k] })),
});

export const PLAZA_ZONES = [
  plaza('plaza_velitas', 1207, 'velitas', ['velitas_cereria', 'velitas_faroles', 'velitas_calle'], ['lights', 'candles']),
  plaza('plaza_navidad', 1224, 'navidad', ['navidad_molino', 'navidad_natilla', 'navidad_bunuelos', 'navidad_novena'], ['lights', 'tree', 'manger']),
  // (v5.21) Pasto's carnival: paper streamers over the streets and clouds of talcum powder.
  plaza('plaza_negros_blancos', 1302, 'negros_blancos', ['nyb_disfraces', 'nyb_negros', 'nyb_blancos', 'nyb_desfile'], ['streamers', 'talc']),
  // (v5.21) Barranquilla's carnival: bunting, streamers and falling confetti.
  plaza('plaza_barranquilla', 1347, 'barranquilla', ['baq_mascaras', 'baq_marimondas', 'baq_congos', 'baq_batalla'], ['streamers', 'confetti']),
  // (v5.21) Valledupar's festival: bunting and music notes rising over the paths.
  plaza('plaza_vallenato', 1424, 'vallenato', ['vall_escuela', 'vall_acordeon', 'vall_caja', 'vall_tarima'], ['streamers', 'notes']),
  // (v5.21) Mother's Day: flowers along the paths and at every door.
  plaza('plaza_dia_madre', 1507, 'dia_madre', ['dm_mercado', 'dm_floristeria', 'dm_cocina', 'dm_mesa'], ['flowers']),
  // (v5.21) San Juan y San Pedro: bunting by day and fireworks (the «castillo») at night.
  plaza('plaza_san_pedro', 1620, 'san_pedro', ['sp_lenero', 'sp_asado', 'sp_achiras', 'sp_tablado'], ['streamers', 'fireworks']),
  // (v5.21) 20 de julio: Colombian flags on every building and tricolor bunting.
  plaza('plaza_independencia', 1718, 'independencia', ['ind_telar', 'ind_banderas', 'ind_escarapelas', 'ind_desfile'], ['flags']),
];

// Same prices and paces as the Finca's first stations (data/stations.js).
const station = (id, zone, name, icon, rest) => ({ id, zone, name, icon, growth: 1.15, release: '5.19', season: true, ...rest });
export const PLAZA_STATIONS = [
  // 🕯️ Noche de las Velitas: candles, paper lanterns, and every street of the town lit up.
  station('velitas_cereria', 'plaza_velitas', 'Cerería', '🕯️', { infinite: true, out: { vela: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5 }),
  station('velitas_faroles', 'plaza_velitas', 'Taller de faroles', '🏮', { in: { vela: 2 }, out: { farol: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8 }),
  station('velitas_calle', 'plaza_velitas', 'Calle de las velitas', '✨', { in: { farol: 2 }, out: { calle_iluminada: 1 }, cycle: 8, unlockCost: 250, upgradeBase: 12 }),
  // 🎄 Navidad: the novena with natilla and buñuelos, both made from corn flour.
  station('navidad_molino', 'plaza_navidad', 'Molino de maíz', '🌽', { infinite: true, out: { harina_maiz: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5 }),
  station('navidad_natilla', 'plaza_navidad', 'Paila de natilla', '🍮', { in: { harina_maiz: 1 }, out: { natilla: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8 }),
  station('navidad_bunuelos', 'plaza_navidad', 'Fritanga de buñuelos', '🧆', { in: { harina_maiz: 1 }, out: { bunuelo: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8 }),
  station('navidad_novena', 'plaza_navidad', 'Mesa de la novena', '🎄', { in: { natilla: 1 }, joins: [{ product: 'bunuelo', perCycle: 1, from: 'navidad_bunuelos' }], out: { novena: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12 }),
  // (v5.21) 🎨 Carnaval de Negros y Blancos: costumes for the comparsas, painted black on the 5th of January and
  // covered in talcum on the 6th, meet in the great parade. The same paces and prices as the Navidad.
  station('nyb_disfraces', 'plaza_negros_blancos', 'Taller de disfraces', '🎭', { infinite: true, out: { disfraz: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('nyb_negros', 'plaza_negros_blancos', 'Día de Negros', '🖤', { in: { disfraz: 1 }, out: { comparsa_negra: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('nyb_blancos', 'plaza_negros_blancos', 'Día de Blancos', '🤍', { in: { disfraz: 1 }, out: { comparsa_blanca: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('nyb_desfile', 'plaza_negros_blancos', 'Gran Desfile', '🎊', { in: { comparsa_negra: 1 }, joins: [{ product: 'comparsa_blanca', perCycle: 1, from: 'nyb_blancos' }], out: { desfile: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🎭 Carnaval de Barranquilla: masks carved in the workshop become marimondas and congos, who dance together
  // in the Batalla de Flores. The same paces and prices as the Navidad.
  station('baq_mascaras', 'plaza_barranquilla', 'Taller de máscaras', '🎭', { infinite: true, out: { mascara: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('baq_marimondas', 'plaza_barranquilla', 'Casa de las marimondas', '🐘', { in: { mascara: 1 }, out: { marimonda: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('baq_congos', 'plaza_barranquilla', 'Casa de los congos', '🌺', { in: { mascara: 1 }, out: { congo: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('baq_batalla', 'plaza_barranquilla', 'Batalla de Flores', '💃', { in: { marimonda: 1 }, joins: [{ product: 'congo', perCycle: 1, from: 'baq_congos' }], out: { batalla_flores: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🪗 Festival de la Leyenda Vallenata: the music school's apprentices become accordionists and caja and
  // guacharaca players, who play together on the Francisco el Hombre stage. The same paces and prices as the Navidad.
  station('vall_escuela', 'plaza_vallenato', 'Escuela vallenata', '🎵', { infinite: true, out: { aprendiz: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('vall_acordeon', 'plaza_vallenato', 'Casa del acordeón', '🪗', { in: { aprendiz: 1 }, out: { acordeonero: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('vall_caja', 'plaza_vallenato', 'Caja y guacharaca', '🥁', { in: { aprendiz: 1 }, out: { percusionista: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('vall_tarima', 'plaza_vallenato', 'Tarima Francisco el Hombre', '🎤', { in: { acordeonero: 1 }, joins: [{ product: 'percusionista', perCycle: 1, from: 'vall_caja' }], out: { cancion_vallenata: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 💐 Día de la Madre: the market basket becomes a bouquet at the florist's and lunch in the kitchen, and both
  // reach the family table. The same paces and prices as the Navidad.
  station('dm_mercado', 'plaza_dia_madre', 'Mercado de la plaza', '🧺', { infinite: true, out: { mercado_madre: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('dm_floristeria', 'plaza_dia_madre', 'Floristería', '💐', { in: { mercado_madre: 1 }, out: { ramo: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('dm_cocina', 'plaza_dia_madre', 'Cocina del almuerzo', '🍲', { in: { mercado_madre: 1 }, out: { almuerzo_madre: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('dm_mesa', 'plaza_dia_madre', 'Mesa familiar', '🍽️', { in: { ramo: 1 }, joins: [{ product: 'almuerzo_madre', perCycle: 1, from: 'dm_cocina' }], out: { celebracion_madre: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🎉 San Juan y San Pedro (Huila and Tolima): firewood for the clay ovens of the asado huilense and of the
  // achiras, served on the stage where the sanjuanero is danced. The same paces and prices as the Navidad.
  station('sp_lenero', 'plaza_san_pedro', 'Leñero', '🪵', { infinite: true, out: { lena_sampedro: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('sp_asado', 'plaza_san_pedro', 'Horno del asado huilense', '🥩', { in: { lena_sampedro: 1 }, out: { asado_sampedro: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('sp_achiras', 'plaza_san_pedro', 'Horno de achiras', '🔥', { in: { lena_sampedro: 1 }, out: { achiras_sampedro: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('sp_tablado', 'plaza_san_pedro', 'Tablado del sanjuanero', '💃', { in: { asado_sampedro: 1 }, joins: [{ product: 'achiras_sampedro', perCycle: 1, from: 'sp_achiras' }], out: { fiesta_sampedrina: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🇨🇴 Día de la Independencia: cloth from the loom becomes flags and rosettes for the 20 de julio parade.
  // The same paces and prices as the Navidad.
  station('ind_telar', 'plaza_independencia', 'Telar', '🧵', { infinite: true, out: { tela_patria: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('ind_banderas', 'plaza_independencia', 'Taller de banderas', '🇨🇴', { in: { tela_patria: 1 }, out: { bandera_patria: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('ind_escarapelas', 'plaza_independencia', 'Taller de escarapelas', '🎗️', { in: { tela_patria: 1 }, out: { escarapela: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('ind_desfile', 'plaza_independencia', 'Desfile del 20 de julio', '🥁', { in: { bandera_patria: 1 }, joins: [{ product: 'escarapela', perCycle: 1, from: 'ind_escarapelas' }], out: { desfile_patrio: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
];

export const PLAZA_PRODUCTS = {
  vela: { name: 'Vela', zone: 'plaza_velitas', value: 1, icon: '🕯️', color: 0xfff3c4 },
  farol: { name: 'Farol', zone: 'plaza_velitas', value: 3, icon: '🏮', color: 0xe53935 },
  calle_iluminada: { name: 'Calle iluminada', zone: 'plaza_velitas', value: 10, icon: '✨', color: 0xffd54f },
  harina_maiz: { name: 'Harina de maíz', zone: 'plaza_navidad', value: 1, icon: '🌽', color: 0xf6d36b },
  natilla: { name: 'Natilla', zone: 'plaza_navidad', value: 3, icon: '🍮', color: 0xc98a3a },
  bunuelo: { name: 'Buñuelo', zone: 'plaza_navidad', value: 3, icon: '🧆', color: 0xd9a441 },
  novena: { name: 'Plato de novena', zone: 'plaza_navidad', value: 10, icon: '🎶', color: 0x2e7d32 },
  disfraz: { name: 'Disfraz', zone: 'plaza_negros_blancos', value: 1, icon: '👗', color: 0xab47bc },
  comparsa_negra: { name: 'Comparsa de negros', zone: 'plaza_negros_blancos', value: 3, icon: '🖤', color: 0x263238 },
  comparsa_blanca: { name: 'Comparsa de blancos', zone: 'plaza_negros_blancos', value: 3, icon: '🤍', color: 0xf5f5f5 },
  desfile: { name: 'Carroza del desfile', zone: 'plaza_negros_blancos', value: 10, icon: ICON.fiestaNegrosBlancos, color: 0xfdd835 },
  mascara: { name: 'Máscara', zone: 'plaza_barranquilla', value: 1, icon: '🎭', color: 0xfdd835 },
  marimonda: { name: 'Marimonda', zone: 'plaza_barranquilla', value: 3, icon: '🐘', color: 0x1e88e5 },
  congo: { name: 'Congo', zone: 'plaza_barranquilla', value: 3, icon: '🌺', color: 0xe53935 },
  batalla_flores: { name: 'Carroza de la Batalla de Flores', zone: 'plaza_barranquilla', value: 10, icon: ICON.fiestaBarranquilla, color: 0x43a047 },
  aprendiz: { name: 'Aprendiz de música', zone: 'plaza_vallenato', value: 1, icon: '🎵', color: 0xffb300 },
  acordeonero: { name: 'Acordeonero', zone: 'plaza_vallenato', value: 3, icon: '🪗', color: 0xc62828 },
  percusionista: { name: 'Cajero y guacharaquero', zone: 'plaza_vallenato', value: 3, icon: '🥁', color: 0x8d5a32 },
  cancion_vallenata: { name: 'Canción vallenata', zone: 'plaza_vallenato', value: 10, icon: ICON.fiestaVallenato, color: 0xfdd835 },
  mercado_madre: { name: 'Canasta del mercado', zone: 'plaza_dia_madre', value: 1, icon: '🧺', color: 0xc8a165 },
  ramo: { name: 'Ramo de flores', zone: 'plaza_dia_madre', value: 3, icon: '💐', color: 0xe91e63 },
  almuerzo_madre: { name: 'Almuerzo de domingo', zone: 'plaza_dia_madre', value: 3, icon: '🍲', color: 0xf4a259 },
  celebracion_madre: { name: 'Almuerzo con serenata', zone: 'plaza_dia_madre', value: 10, icon: ICON.fiestaDiaMadre, color: 0xf06292 },
  lena_sampedro: { name: 'Leña', zone: 'plaza_san_pedro', value: 1, icon: '🪵', color: 0x8d6e63 },
  asado_sampedro: { name: 'Asado huilense', zone: 'plaza_san_pedro', value: 3, icon: '🥩', color: 0xc0392b },
  achiras_sampedro: { name: 'Achiras', zone: 'plaza_san_pedro', value: 3, icon: ICON.bizcochos, color: 0xe8b860 },
  tela_patria: { name: 'Tela tricolor', zone: 'plaza_independencia', value: 1, icon: '🧵', color: 0xfdd835 },
  bandera_patria: { name: 'Bandera de Colombia', zone: 'plaza_independencia', value: 3, icon: '🇨🇴', color: 0xfcd116 },
  escarapela: { name: 'Escarapela', zone: 'plaza_independencia', value: 3, icon: '🎗️', color: 0xce1126 },
  desfile_patrio: { name: 'Desfile del 20 de julio', zone: 'plaza_independencia', value: 10, icon: ICON.fiestaIndependencia, color: 0x003893 },
  fiesta_sampedrina: { name: 'Fiesta sampedrina', zone: 'plaza_san_pedro', value: 10, icon: ICON.fiestaSanPedro, color: 0xe53935 },
};

// The season events. `fiesta`: its fiesta (data/fiestas.js); `season`: played in the plaza, not in a region.
//   level: every station starts built at this level; coins: to start with.
//   objective: produce these (kind 'produced'); calibrated with tools/season-sim.js for about 3 hours played
//   sensibly (stations and mules raised along the chain as coins allow).
export const SEASON_EVENTS = [
  {
    id: 'fiesta_velitas',
    fiesta: 'velitas',
    season: true,
    zone: 'plaza_velitas',
    icon: '🕯️',
    name: tk('Noche de las Velitas'),
    intro: tk('Es la víspera de la Inmaculada y el pueblo quiere encender una vela en cada andén. Haz velas en la Cerería, ármalas en faroles de papel y alumbra todas las calles antes de que pase la fiesta.'),
    stations: ['velitas_cereria', 'velitas_faroles', 'velitas_calle'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { calle_iluminada: 80000 } },
  },
  {
    id: 'fiesta_navidad',
    fiesta: 'navidad',
    season: true,
    zone: 'plaza_navidad',
    icon: '🎄',
    name: tk('La novena de Navidad'),
    intro: tk('Llegó la novena y cada noche se reúne todo el pueblo en la plaza: muele el maíz, revuelve la natilla en la paila, fríe los buñuelos y sirve un plato para cada vecino.'),
    stations: ['navidad_molino', 'navidad_natilla', 'navidad_bunuelos', 'navidad_novena'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { novena: 240000 } },
  },
  {
    id: 'fiesta_negros_blancos',
    fiesta: 'negros_blancos',
    season: true,
    zone: 'plaza_negros_blancos',
    icon: '🎨',
    name: tk('El Carnaval de Negros y Blancos'),
    intro: tk('En Pasto el carnaval llega con el año nuevo: cose los disfraces, pinta de negro a las comparsas el 5 de enero, llénalas de talco el 6 y súbelas a las carrozas del Gran Desfile.'),
    stations: ['nyb_disfraces', 'nyb_negros', 'nyb_blancos', 'nyb_desfile'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { desfile: 240000 } },
  },
  {
    id: 'fiesta_barranquilla',
    fiesta: 'barranquilla',
    season: true,
    zone: 'plaza_barranquilla',
    icon: '🎭',
    name: tk('El Carnaval de Barranquilla'),
    intro: tk('¡Quien lo vive es quien lo goza! Talla las máscaras, viste a las marimondas y a los congos y llévalos juntos a bailar en las carrozas de la Batalla de Flores.'),
    stations: ['baq_mascaras', 'baq_marimondas', 'baq_congos', 'baq_batalla'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { batalla_flores: 240000 } },
  },
  {
    id: 'fiesta_vallenato',
    fiesta: 'vallenato',
    season: true,
    zone: 'plaza_vallenato',
    icon: '🪗',
    name: tk('El Festival de la Leyenda Vallenata'),
    intro: tk('En Valledupar se busca al nuevo rey vallenato: enseña a los aprendices de la escuela, forma acordeoneros, cajeros y guacharaqueros, y súbelos juntos a la tarima Francisco el Hombre.'),
    stations: ['vall_escuela', 'vall_acordeon', 'vall_caja', 'vall_tarima'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { cancion_vallenata: 240000 } },
  },
  {
    id: 'fiesta_dia_madre',
    fiesta: 'dia_madre',
    season: true,
    zone: 'plaza_dia_madre',
    icon: '💐',
    name: tk('El Día de la Madre'),
    intro: tk('El segundo domingo de mayo toda la familia celebra a las mamás: haz el mercado en la plaza, arma los ramos de flores, cocina el almuerzo de domingo y llévalo todo a la mesa, con serenata.'),
    stations: ['dm_mercado', 'dm_floristeria', 'dm_cocina', 'dm_mesa'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { celebracion_madre: 240000 } },
  },
  {
    id: 'fiesta_san_pedro',
    fiesta: 'san_pedro',
    season: true,
    zone: 'plaza_san_pedro',
    icon: '🎉',
    name: tk('Las fiestas de San Juan y San Pedro'),
    intro: tk('En el Huila y el Tolima se baila el sanjuanero: trae la leña, prende los hornos de barro del asado huilense y de las achiras, y sírvelos en el tablado mientras las parejas bailan.'),
    stations: ['sp_lenero', 'sp_asado', 'sp_achiras', 'sp_tablado'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { fiesta_sampedrina: 240000 } },
  },
  {
    id: 'fiesta_independencia',
    fiesta: 'independencia',
    season: true,
    zone: 'plaza_independencia',
    icon: '🇨🇴',
    name: tk('El 20 de julio'),
    intro: tk('Se celebra el Grito de Independencia y no puede faltar una bandera en cada ventana: teje la tela, cose banderas y escarapelas y llévalas al desfile del 20 de julio con la banda del colegio.'),
    stations: ['ind_telar', 'ind_banderas', 'ind_escarapelas', 'ind_desfile'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { desfile_patrio: 240000 } },
  },
];
export const SEASON_EVENT_OF_FIESTA = Object.fromEntries(SEASON_EVENTS.map((e) => [e.fiesta, e]));
