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
const plaza = (id, seed, fiesta, chain, decor, look = fiesta) => ({
  ...LAYOUT,
  id,
  seed,
  fiesta,
  name: tk('La plaza de las fiestas'),
  icon: '🎉',
  chain,
  decor, // what render/Fiesta.js draws on it, whatever the date
  farm: { stationId: chain[0], x: 2, y: 2, w: 6, h: 6, look }, // look: its first station's art (render/Stations.js)
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
  // (v5.21) 7 de agosto: flags, like the 20 de julio.
  plaza('plaza_batalla_boyaca', 1819, 'batalla_boyaca', ['bb_vereda', 'bb_cocina', 'bb_caballeriza', 'bb_puente'], ['flags']),
  // (v5.21) Amor y Amistad: hearts floating up over the paths.
  plaza('plaza_amor_amistad', 1913, 'amor_amistad', ['aa_papeleria', 'aa_dulceria', 'aa_tarjetas', 'aa_amigo'], ['hearts']),
  // (v5.21) Halloween: carved pumpkins along the paths, lit at night.
  plaza('plaza_halloween', 2031, 'halloween', ['hw_huerta', 'hw_calabazas', 'hw_dulce', 'hw_triqui'], ['pumpkins']),
  // (v5.21) Independencia de Cartagena: bunting by day and fireworks at night. Its look is not Cartagena's café (the
  // region's zone already has that one) but the palenqueras' coconut palms.
  plaza('plaza_cartagena', 2111, 'cartagena', ['ctg_palmar', 'ctg_palenqueras', 'ctg_coco', 'ctg_cabildo'], ['streamers', 'fireworks'], 'cartagena_fiesta'),
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
  // (v5.21) 🌉 Batalla de Boyacá: the farms of the vereda feed the soldiers in the camp kitchen and the lancers'
  // horses in the stable, and both cross the Puente de Boyacá. The same paces and prices as the Navidad.
  station('bb_vereda', 'plaza_batalla_boyaca', 'Vereda de provisiones', '🥔', { infinite: true, out: { provisiones: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('bb_cocina', 'plaza_batalla_boyaca', 'Cocina de campaña', '🍲', { in: { provisiones: 1 }, out: { racion: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('bb_caballeriza', 'plaza_batalla_boyaca', 'Caballeriza de los lanceros', '🐎', { in: { provisiones: 1 }, out: { caballeria: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('bb_puente', 'plaza_batalla_boyaca', 'Puente de Boyacá', '🌉', { in: { racion: 1 }, joins: [{ product: 'caballeria', perCycle: 1, from: 'bb_caballeriza' }], out: { victoria_boyaca: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 💕 Amor y Amistad: wrapping paper from the stationer's becomes boxes of sweets and cards, exchanged as the
  // secret friend's gift. The same paces and prices as the Navidad.
  station('aa_papeleria', 'plaza_amor_amistad', 'Papelería', '🎀', { infinite: true, out: { papel_regalo: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('aa_dulceria', 'plaza_amor_amistad', 'Dulcería', '🍬', { in: { papel_regalo: 1 }, out: { dulces_amistad: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('aa_tarjetas', 'plaza_amor_amistad', 'Tarjetería', '💌', { in: { papel_regalo: 1 }, out: { tarjeta_amistad: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('aa_amigo', 'plaza_amor_amistad', 'Amigo secreto', '🎁', { in: { dulces_amistad: 1 }, joins: [{ product: 'tarjeta_amistad', perCycle: 1, from: 'aa_tarjetas' }], out: { regalo_amistad: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🎃 Halloween (and Children's Day): pumpkins from the garden are carved into lanterns and cooked into dulce de
  // ahuyama, and both go out with the children for the «triqui triqui». The same paces and prices as the Navidad.
  station('hw_huerta', 'plaza_halloween', 'Huerta de ahuyamas', '🎃', { infinite: true, out: { ahuyama: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('hw_calabazas', 'plaza_halloween', 'Taller de calabazas', '🕯️', { in: { ahuyama: 1 }, out: { calabaza_tallada: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('hw_dulce', 'plaza_halloween', 'Cocina del dulce de ahuyama', '🍯', { in: { ahuyama: 1 }, out: { dulce_ahuyama: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('hw_triqui', 'plaza_halloween', 'Triqui triqui', '👻', { in: { calabaza_tallada: 1 }, joins: [{ product: 'dulce_ahuyama', perCycle: 1, from: 'hw_dulce' }], out: { triqui_triqui: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
  // (v5.21) 🏰 Independencia de Cartagena: coconuts from the palm grove become the palenqueras' cocadas and coconut
  // water, handed out along the Cabildo de Getsemaní. The same paces and prices as the Navidad.
  station('ctg_palmar', 'plaza_cartagena', 'Palmar de cocos', '🌴', { infinite: true, out: { coco_fiesta: 1 }, cycle: 2, unlockCost: 0, upgradeBase: 5, release: '5.21' }),
  station('ctg_palenqueras', 'plaza_cartagena', 'Cocadas de las palenqueras', '👒', { in: { coco_fiesta: 1 }, out: { cocada_fiesta: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('ctg_coco', 'plaza_cartagena', 'Puesto de agua de coco', '🥥', { in: { coco_fiesta: 1 }, out: { agua_coco: 1 }, cycle: 4, unlockCost: 50, upgradeBase: 8, release: '5.21' }),
  station('ctg_cabildo', 'plaza_cartagena', 'Cabildo de Getsemaní', '🥁', { in: { cocada_fiesta: 1 }, joins: [{ product: 'agua_coco', perCycle: 1, from: 'ctg_coco' }], out: { cabildo: 1 }, cycle: 4, unlockCost: 250, upgradeBase: 12, release: '5.21' }),
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
  provisiones: { name: 'Provisiones', zone: 'plaza_batalla_boyaca', value: 1, icon: '🥔', color: 0xc8a165 },
  racion: { name: 'Ración de la tropa', zone: 'plaza_batalla_boyaca', value: 3, icon: '🍲', color: 0xd9a441 },
  caballeria: { name: 'Lanceros a caballo', zone: 'plaza_batalla_boyaca', value: 3, icon: '🐎', color: 0x6d4c41 },
  victoria_boyaca: { name: 'Paso del puente', zone: 'plaza_batalla_boyaca', value: 10, icon: ICON.fiestaBatallaBoyaca, color: 0xfcd116 },
  papel_regalo: { name: 'Papel de regalo', zone: 'plaza_amor_amistad', value: 1, icon: '🎀', color: 0xf48fb1 },
  dulces_amistad: { name: 'Caja de dulces', zone: 'plaza_amor_amistad', value: 3, icon: '🍬', color: 0xe91e63 },
  tarjeta_amistad: { name: 'Tarjeta de amor y amistad', zone: 'plaza_amor_amistad', value: 3, icon: '💌', color: 0xef5350 },
  regalo_amistad: { name: 'Regalo de amigo secreto', zone: 'plaza_amor_amistad', value: 10, icon: ICON.fiestaAmorAmistad, color: 0xd32f2f },
  ahuyama: { name: 'Ahuyama', zone: 'plaza_halloween', value: 1, icon: '🎃', color: 0xfb8c00 },
  calabaza_tallada: { name: 'Calabaza tallada', zone: 'plaza_halloween', value: 3, icon: '🕯️', color: 0xef6c00 },
  dulce_ahuyama: { name: 'Dulce de ahuyama', zone: 'plaza_halloween', value: 3, icon: '🍯', color: 0xffa726 },
  triqui_triqui: { name: 'Bolsa del triqui triqui', zone: 'plaza_halloween', value: 10, icon: ICON.fiestaHalloween, color: 0x6a1b9a },
  coco_fiesta: { name: 'Coco de la costa', zone: 'plaza_cartagena', value: 1, icon: ICON.coconut, color: 0x7cb342 },
  cocada_fiesta: { name: 'Cocadas de palenquera', zone: 'plaza_cartagena', value: 3, icon: ICON.cocada, color: 0xa0612d },
  agua_coco: { name: 'Agua de coco', zone: 'plaza_cartagena', value: 3, icon: '🥥', color: 0xe8f5e9 },
  cabildo: { name: 'Comparsa del Cabildo', zone: 'plaza_cartagena', value: 10, icon: ICON.fiestaCartagena, color: 0xd32f2f },
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
  {
    id: 'fiesta_batalla_boyaca',
    fiesta: 'batalla_boyaca',
    season: true,
    zone: 'plaza_batalla_boyaca',
    icon: '🌉',
    name: tk('La Batalla de Boyacá'),
    intro: tk('Se recuerda el 7 de agosto de 1819: las veredas de Boyacá alimentaron al ejército libertador. Recoge las provisiones, cocina las raciones, alista los caballos de los lanceros y haz que todos crucen el Puente de Boyacá.'),
    stations: ['bb_vereda', 'bb_cocina', 'bb_caballeriza', 'bb_puente'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { victoria_boyaca: 240000 } },
  },
  {
    id: 'fiesta_amor_amistad',
    fiesta: 'amor_amistad',
    season: true,
    zone: 'plaza_amor_amistad',
    icon: '💕',
    name: tk('Amor y Amistad'),
    intro: tk('Es la semana del amigo secreto: corta el papel de regalo, arma las cajas de dulces, escribe las tarjetas y entrega cada regalo sin que nadie adivine quién lo manda.'),
    stations: ['aa_papeleria', 'aa_dulceria', 'aa_tarjetas', 'aa_amigo'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { regalo_amistad: 240000 } },
  },
  {
    id: 'fiesta_halloween',
    fiesta: 'halloween',
    season: true,
    zone: 'plaza_halloween',
    icon: '🎃',
    name: tk('Halloween'),
    intro: tk('Los niños salen disfrazados a pedir dulces: recoge las ahuyamas de la huerta, talla las calabazas con su vela, cocina el dulce de ahuyama y llena las bolsas del «¡triqui triqui!» casa por casa.'),
    stations: ['hw_huerta', 'hw_calabazas', 'hw_dulce', 'hw_triqui'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { triqui_triqui: 240000 } },
  },
  {
    id: 'fiesta_cartagena',
    fiesta: 'cartagena',
    season: true,
    zone: 'plaza_cartagena',
    icon: '🏰',
    name: tk('Las fiestas de la Independencia de Cartagena'),
    intro: tk('En noviembre Cartagena celebra su independencia con el Cabildo de Getsemaní: baja los cocos del palmar, prepara las cocadas de las palenqueras y el agua de coco, y repártelos a las comparsas que bailan por la ciudad amurallada.'),
    stations: ['ctg_palmar', 'ctg_palenqueras', 'ctg_coco', 'ctg_cabildo'],
    level: 1,
    coins: 0,
    actions: [],
    objective: { kind: 'produced', items: { cabildo: 240000 } },
  },
];
export const SEASON_EVENT_OF_FIESTA = Object.fromEntries(SEASON_EVENTS.map((e) => [e.fiesta, e]));
