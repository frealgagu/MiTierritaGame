// Regions (v3.0, GDD §10.3): each is an independent save with own economy (coins, levels,
// research, goals, second ending, ×2 resets), zones, and soundtrack. Only Renown,
// album, decoration, achievements, and country calendar are shared.
//   zones: ordered (first opens with region; each unlocks the next)
//   unlock: unlock condition ({ region, zone }: completing that zone in that region)
import { ICON } from './icons.js';

export const REGIONS = [
  { id: 'cafetero', name: 'Eje Cafetero', icon: '☕', zones: ['finca', 'trapiche', 'lecheria', 'cacaotal', 'maizal', 'pueblo'], music: 'cafetero', unlock: null },
  {
    id: 'santander',
    name: 'Santander',
    icon: ICON.guava,
    zones: ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas', 'barichara'],
    music: 'santander',
    unlock: { region: 'cafetero', zone: 'pueblo' },
  },
  // Coast (v3.15): unlocks upon completing Barichara. Released zone-by-zone (v3.15–v3.20) while
  // `wip` lacked finale; since v3.21 has events, album, and achievements. WIP regions advertise
  // missing upcoming zones (`soon`).
  {
    id: 'costa',
    name: 'La Costa',
    icon: '🌴',
    zones: ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena'],
    music: 'costa',
    unlock: { region: 'santander', zone: 'barichara' },
  },
  // Boyacá (v3.22): unlocks upon completing Cartagena. Released zone-by-zone like Coast (v3.22–v3.27),
  // and since v3.28 has events, album, and achievements.
  {
    id: 'boyaca',
    name: 'Boyacá',
    icon: '⛰️',
    zones: ['papal', 'cerveceria', 'raquira', 'paipa', 'ruanas', 'villa_leyva'],
    music: 'boyaca',
    unlock: { region: 'costa', zone: 'cartagena' },
  },
  // Llanos (v3.31): unlocks upon completing Villa de Leyva. Released zone-by-zone like Coast and Boyacá
  // (v3.31–v3.36), and since v3.37 has events, album, and achievements.
  {
    id: 'llanos',
    name: 'Los Llanos',
    icon: '🐎',
    zones: ['palma', 'frutal', 'cachamera', 'hato_llanero', 'talabarteria', 'villavicencio'],
    music: 'llanos',
    unlock: { region: 'boyaca', zone: 'villa_leyva' },
  },
  // Pacific Coast (v3.38): unlocks upon completing Villavicencio. Zone-by-zone like Llanos (v3.38–v3.43),
  // since v3.44 has events, album, and achievements. Originally «Chocó» (`choco`), renamed
  // `'pacifico'` in v3.46.
  {
    id: 'pacifico',
    name: 'Costa Pacífica',
    icon: '🐋',
    zones: ['platanal', 'azotea', 'bahia', 'manglar', 'werregue', 'buenaventura'],
    music: 'pacifico',
    unlock: { region: 'llanos', zone: 'villavicencio' },
  },
  // Amazon (v3.47): unlocks upon completing Buenaventura. Zone-by-zone like Pacific Coast (v3.47–v3.52),
  // since v3.53 has events, album, and achievements.
  {
    id: 'amazonas',
    name: 'Amazonas',
    icon: '🦜',
    zones: ['asaizal', 'ajizal', 'lago', 'casaberia', 'yanchama', 'leticia'],
    music: 'amazonas',
    unlock: { region: 'pacifico', zone: 'buenaventura' },
  },
  // Tolima Grande (v4.0): Tolima & Huila, with sanjuanero music. Unlocks upon completing Leticia,
  // released whole with v4.0's twin mechanics (dual-output and combiner stations).
  {
    id: 'tolima',
    name: 'Tolima Grande',
    icon: '🌵',
    zones: ['achirales', 'cafe_huila', 'betania', 'lechoneria', 'chamba', 'neiva'],
    music: 'tolima',
    unlock: { region: 'amazonas', zone: 'leticia' },
  },
  // Cundinamarca (v4.4): Bogotá Sabana and towns (flowers, strawberries, trout, salt, ajiaco),
  // with pasillo music. Unlocks after Neiva, zone-by-zone (v4.4.0–v4.4.5); finished with events,
  // album, and achievements (v4.4.8). Ends in Zipaquirá at Salt Cathedral.
  {
    id: 'cundinamarca',
    name: 'Cundinamarca',
    icon: ICON.rosa,
    zones: ['flores', 'fresas', 'truchas', 'salinas', 'cocina', 'zipaquira'],
    music: 'cundinamarca',
    unlock: { region: 'tolima', zone: 'neiva' },
  },
  // Bogotá (v4.5): produces nothing native. Single double-sized zone where all goods arrive by
  // tractomula from other regions. Unlocks upon completing Cundinamarca.
  // Music is Danza de La Candelaria. (From v4.4.8–v4.4.11 hidden WIP via `wip`/`hidden`:
  // map showed «Coming soon».)
  {
    id: 'bogota',
    name: 'Bogotá',
    icon: ICON.monserrate,
    zones: ['bogota'],
    music: 'bogota',
    unlock: { region: 'cundinamarca', zone: 'zipaquira' },
  },
  // Special zone (v5.4): a reward region, a single 26×26 zone whose eight stations form one linear chain (the
  // tour of the island). `special`: opens once every other region has its second ending or a reset (see
  // sim/regions.js: specialProgress). `secret`: no list, map, or text shows its name until it opens; before that
  // the region list only shows a «⭐ Special zone» card. `offMap`: it has no department on the country map,
  // which draws it in an inset instead (data/zoneGeo.js: MAP_GEO). (Until v5.4, `devOnly`: only the developer
  // option opened it, while its art, event, and music were missing; v5.5 opens it for real.)
  {
    id: 'sanandres',
    name: 'San Andrés',
    icon: ICON.johnnyCay,
    zones: ['sanandres'],
    music: 'sanandres',
    unlock: { special: true },
    special: true,
    secret: true,
    offMap: true,
  },
];

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
export const REGION_OF_ZONE = Object.fromEntries(REGIONS.flatMap((r) => r.zones.map((z) => [z, r.id])));
export const regionOf = (state) => REGIONS_BY_ID[state.region ?? 'cafetero'];
// Regions a list may name (v5.4): a secret region only once it has opened in this save.
export const shownRegions = (opened) => REGIONS.filter((r) => !r.secret || opened(r.id));
