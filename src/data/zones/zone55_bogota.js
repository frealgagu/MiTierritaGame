// Bogotá (v4.5): the region that produces nothing of its own. A single double-sided zone (52 tiles, four times the
// area of the others) arriving neighborhood by neighborhood; everything processed here arrives by semi-truck from the other
// regions, with inexhaustible cargo (see sim/routes.js).
//
// The map follows the city layout: east (the Eastern Hills, with Monserrate) is edge gy = 0, top right; north
// is edge gx = 0; west is gy = 52; south is gx = 52. Carrera Séptima (gy = 12.5) runs at the foot of the Hills
// and serves as the mule path from La Candelaria northward (Chapinero and Zona G, then Usaquén); from there it descends
// west (gy = 30.5: the fairgrounds and Paloquemao) to the warehouse at Corabastos in the southwest.
// Avenida Caracas (gy = 20.5) cuts north-south: Autopista Norte (Boyacá, Santander) and Autopista Sur
// (Tolima, Pacífico) enter along it. From the west arrive Calle 80 (gx = 8.5: the Coast and Eje Cafetero),
// Calle 26 (gx = 18.5, with El Dorado: Amazonas, by plane) and Calle 13 (gx = 44.5: Cundinamarca); from the south, Vía
// al Llano (gy = 8.5).
//
// Remaining lots for the other neighborhoods (3x3 on each side of Séptima and the western avenue):
//   Séptima, east side (y = 9): 27 (Monserrate Funicular), 23, 19, 15, 11, 7; west side (y = 13): 25, 21, 17,
//   13, 9. West avenue, north (y = 27) and south (y = 31) of gy = 30.5: from 6 to 38, in steps of four.
import { ICON } from '../icons.js';

export const ZONE55 = {
  id: 'bogota',
  region: 'bogota',
  name: 'Bogotá',
  icon: ICON.monserrate,
  size: 52,
  seed: 233,
  theme: 'town',
  style: 'bogota',
  // As a network (v4.6; up to v4.5 there were five neighborhoods, each in sequence): a station can be built once
  // all Bogotá stations supplying it already exist (see sim/chain.js: buildableStations). The chain runs by tiers. The
  // stations remain on the map in their neighborhoods: La Candelaria at the foot of the Hills, Zona G and Usaquén to the north,
  // Paloquemao to the west, and downtown.
  network: true,
  chain: ['tostadero_chorro', 'despensa_zona_g', 'toldo_tejidos', 'puesto_flores', 'puesto_frutas', 'cafeteria_septima', 'cocina_entradas', 'toldo_sombreros', 'pescaderia_plaza', 'chocolateria_candelaria', 'parrilla_zona_g', 'toldo_loza', 'fritanga_plaza', 'dulceria_calle11', 'reposteria_zona_g', 'toldo_mascaras', 'plaza_paloquemao', 'casa_colonial', 'restaurante_zona_g', 'mercado_pulgas', 'hotel_capital', 'funicular_monserrate', 'pabellon_regiones', 'gran_feria'],
  // El Chorro de Quevedo: the little square where everything begins, at the foot of the Hills.
  farm: { stationId: 'tostadero_chorro', x: 35, y: 6, w: 6, h: 6 },
  plots: [
    { stationId: 'cafeteria_septima', x: 37, y: 13 },
    { stationId: 'chocolateria_candelaria', x: 33, y: 13 },
    { stationId: 'dulceria_calle11', x: 31, y: 9 },
    { stationId: 'casa_colonial', x: 29, y: 13 },
    // Chapinero and Zona G, following Carrera Séptima northward.
    { stationId: 'despensa_zona_g', x: 25, y: 13 },
    { stationId: 'cocina_entradas', x: 23, y: 9 },
    { stationId: 'parrilla_zona_g', x: 21, y: 13 },
    { stationId: 'reposteria_zona_g', x: 19, y: 9 },
    { stationId: 'restaurante_zona_g', x: 17, y: 13 },
    // Usaquén, at the northern end of Carrera Séptima.
    { stationId: 'toldo_tejidos', x: 15, y: 9 },
    { stationId: 'toldo_sombreros', x: 13, y: 13 },
    { stationId: 'toldo_loza', x: 11, y: 9 },
    { stationId: 'toldo_mascaras', x: 9, y: 13 },
    { stationId: 'mercado_pulgas', x: 7, y: 9 },
    // Paloquemao, west of downtown, on the avenue heading down to the warehouse.
    { stationId: 'puesto_flores', x: 28, y: 27 },
    { stationId: 'puesto_frutas', x: 30, y: 31 },
    { stationId: 'pescaderia_plaza', x: 32, y: 27 },
    { stationId: 'fritanga_plaza', x: 34, y: 31 },
    { stationId: 'plaza_paloquemao', x: 36, y: 27 },
    // Downtown: the Hotel on the western avenue, the Funicular at the foot of Monserrate, and near the warehouse,
    // the Regions Pavilion and the Grand Fairground.
    { stationId: 'hotel_capital', x: 12, y: 31 },
    { stationId: 'funicular_monserrate', x: 27, y: 9 },
    { stationId: 'pabellon_regiones', x: 39, y: 36 },
    { stationId: 'gran_feria', x: 39, y: 40 },
  ],
  // TransMilenio (v4.6), purely decorative: its lane runs alongside Caracas, NQS / 30th (between Caracas and
  // Paloquemao) and Calle 80, which reaches Caracas (see render/Scene.js: syncBuses).
  transmilenio: [
    [[0.1, 21.5], [51.9, 21.5]],
    [[0.1, 24.5], [51.9, 24.5]],
    [[9.5, 51.9], [9.5, 21.5]],
  ],
  warehouse: { x: 47, y: 42, w: 3, h: 3 },
  muleRoad: [[40.5, 12.5], [4.5, 12.5], [4.5, 30.5], [42.5, 30.5], [42.5, 44.5], [46.5, 44.5], [46.5, 45.5], [47.4, 45.5]],
  yard: { x: 46, y: 45, w: 4, h: 1 },
  jeepRoad: [[48.7, 45.5], [46.5, 45.5], [46.5, 51.9]],
  jeepRoad2: [[48.7, 46.5], [47.5, 46.5], [47.5, 51.9]], // lane of the second Willys, inside the first one
  exitSign: [47.5, 50.2],
  exitText: 'A la Autopista Sur ➜',
  // The zone sign and its character go next to the warehouse, like in other zones, shifted to this corner.
  signShift: [26, 26],
  // What is visible on arrival: La Candelaria (the rest of the map is explored by panning).
  view: { x0: 25, y0: 3, x1: 42, y1: 22 },
  muleSpeed: 8,
  dispatchCost: { base: 40, growth: 1.17 },
  routes: {
    tm_cafe: { road: [[8.5, 51.9], [8.5, 20.5], [36.5, 20.5], [36.5, 12.5]], sign: [10.7, 49.4], text: 'Café del Eje ⬆' },
    tm_chocolate: { road: [[8.5, 51.9], [8.5, 20.5], [34.5, 20.5], [34.5, 16.2]], sign: [10.7, 46.4], text: 'Chocolate del Eje ⬆' },
    tm_cocadas: { road: [[8.5, 51.9], [8.5, 20.5], [28.5, 20.5], [28.5, 12.5], [31.2, 12.5]], sign: [10.7, 43.4], text: 'Cocadas de la Costa ⬆' },
    tm_amasijos: { road: [[0.1, 20.5], [33.5, 20.5], [33.5, 16.2]], sign: [2.6, 19.4], text: 'Amasijos de Boyacá ⬇' },
    tm_bocadillos: { road: [[0.1, 20.5], [32.5, 20.5], [32.5, 12.5]], sign: [5.6, 19.4], text: 'Bocadillos de Santander ⬇' },
    tm_bizcochos: { road: [[51.9, 20.5], [38.5, 20.5], [38.5, 16.2]], sign: [49.4, 22.6], text: '⬆ Bizcochos del Tolima' },
    tm_flores: { road: [[44.5, 51.9], [44.5, 20.5], [29.5, 20.5], [29.5, 26.2]], sign: [45.6, 49.4], text: 'Flores de la Sabana ⬆' },
    // Chapinero and Zona G.
    tm_alino: { road: [[51.9, 20.5], [26.5, 20.5], [26.5, 16.2]], sign: [46.4, 22.6], text: '⬆ Aliño del Pacífico' },
    tm_aji: { road: [[18.5, 51.9], [18.5, 20.5], [25.5, 20.5], [25.5, 16.2]], sign: [19.7, 49.4], text: 'Ají negro, de El Dorado ⬆' },
    tm_papitas: { road: [[0.1, 20.5], [24.5, 20.5], [24.5, 12.5]], sign: [8.6, 19.4], text: 'Papitas de Boyacá ⬇' },
    tm_hormigas: { road: [[0.1, 20.5], [20.5, 20.5], [20.5, 12.5], [23.2, 12.5]], sign: [11.6, 19.4], text: 'Hormigas de Santander ⬇' },
    tm_asado: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [22.5, 20.5], [22.5, 16.2]], sign: [49.4, 9.6], text: '⬆ Asado de los Llanos' },
    tm_arroz: { road: [[8.5, 51.9], [8.5, 20.5], [21.5, 20.5], [21.5, 16.2]], sign: [10.7, 40.4], text: 'Arroz de la Costa ⬆' },
    tm_asai: { road: [[18.5, 51.9], [18.5, 20.5], [31.5, 20.5], [31.5, 30.8]], sign: [19.7, 46.4], text: 'Asaí, de El Dorado ⬆' },
    tm_jugos: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [31.5, 20.5], [31.5, 30.8]], sign: [46.4, 9.6], text: '⬆ Jugos de los Llanos' },
    // Usaquén.
    tm_ruanas: { road: [[0.1, 20.5], [16.5, 20.5], [16.5, 12.5]], sign: [14.6, 19.4], text: 'Ruanas de Boyacá ⬇' },
    tm_alpargatas: { road: [[0.1, 20.5], [12.5, 20.5], [12.5, 12.5], [15.2, 12.5]], sign: [17.6, 19.4], text: 'Alpargatas de Santander ⬇' },
    tm_sombreros: { road: [[8.5, 51.9], [8.5, 20.5], [14.5, 20.5], [14.5, 16.2]], sign: [7.3, 49.4], text: 'Sombreros de la Costa ⬆' },
    tm_sillas: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [13.5, 20.5], [13.5, 16.2]], sign: [43.4, 9.6], text: '⬆ Sillas de los Llanos' },
    tm_loza: { road: [[51.9, 20.5], [12.5, 20.5], [12.5, 12.5]], sign: [43.4, 22.6], text: '⬆ Loza del Tolima' },
    tm_canastas: { road: [[8.5, 51.9], [8.5, 12.5], [10.8, 12.5]], sign: [7.3, 46.4], text: 'Canastas del Eje ⬆' },
    tm_mascaras: { road: [[18.5, 51.9], [18.5, 20.5], [10.5, 20.5], [10.5, 16.2]], sign: [19.7, 43.4], text: 'Máscaras, de El Dorado ⬆' },
    tm_werregue: { road: [[51.9, 20.5], [9.5, 20.5], [9.5, 16.2]], sign: [40.4, 22.6], text: '⬆ Werregue del Pacífico' },
    tm_cofres: { road: [[44.5, 51.9], [44.5, 20.5], [8.5, 20.5], [8.5, 12.5]], sign: [45.6, 46.4], text: 'Cofres de sal ⬆' },
    // Paloquemao.
    tm_trucha: { road: [[44.5, 51.9], [44.5, 20.5], [33.5, 20.5], [33.5, 26.2]], sign: [45.6, 43.4], text: 'Truchas de Guatavita ⬆' },
    tm_pargo: { road: [[51.9, 20.5], [32.5, 20.5], [32.5, 26.2]], sign: [37.4, 22.6], text: '⬆ Pargo del Pacífico' },
    tm_lechona: { road: [[51.9, 35.5], [35.5, 35.5], [35.5, 34.2]], sign: [49.4, 36.6], text: '⬆ Lechona del Tolima' },
  },
  unlockedBy: null, // the only zone in Bogotá: opens with the region
  next: null,
};
