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
];
export const SEASON_EVENT_OF_FIESTA = Object.fromEntries(SEASON_EVENTS.map((e) => [e.fiesta, e]));
