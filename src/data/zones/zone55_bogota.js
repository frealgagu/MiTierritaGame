// Bogotá (v4.5): la región que no produce nada propio. Una sola zona del doble de lado (52 casillas, cuatro veces el
// área de las demás) que llega barrio por barrio; todo lo que se transforma aquí llega en tractomula desde las otras
// regiones, con carga que no se acaba (ver sim/routes.js).
//
// El mapa sigue la ciudad: el oriente (los Cerros, con Monserrate) es el borde gy = 0, arriba a la derecha; el norte,
// el borde gx = 0; el occidente, gy = 52, y el sur, gx = 52. La Carrera Séptima (gy = 12,5) corre al pie de los Cerros
// y es el camino de las mulas desde La Candelaria hacia el norte (Chapinero y la Zona G, luego Usaquén); de ahí baja por
// el occidente (gy = 30,5: la feria y Paloquemao) hasta la bodega, en la Central de abastos, al suroccidente.
// La Avenida Caracas (gy = 20,5) cruza de norte a sur: por ella entran la Autopista Norte (Boyacá, Santander) y la
// Autopista Sur (Tolima, Pacífico). Del occidente llegan la Calle 80 (gx = 8,5: la Costa y el Eje Cafetero), la
// Calle 26 (gx = 18,5, con El Dorado: el Amazonas, en avión) y la Calle 13 (gx = 44,5: Cundinamarca); del sur, la Vía
// al Llano (gy = 8,5).
//
// Lotes que quedan para los otros barrios (3×3 a cada lado de la Séptima y de la avenida del occidente):
//   Séptima, al oriente (y = 9): 27 (Funicular de Monserrate), 23, 19, 15, 11, 7; al occidente (y = 13): 25, 21, 17,
//   13, 9. Occidente, al norte (y = 27) y al sur (y = 31) de gy = 30,5: de 6 a 38, de cuatro en cuatro.
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
  // En red (v4.6; hasta la v4.5 eran cinco barrios, cada uno en su orden): una estación se puede construir cuando ya
  // están todas las de Bogotá que la abastecen (ver sim/chain.js: buildableStations). La cadena va por niveles. Las
  // estaciones siguen en el mapa en sus barrios: La Candelaria al pie de los Cerros, la Zona G y Usaquén al norte,
  // Paloquemao al occidente y el centro.
  network: true,
  chain: ['tostadero_chorro', 'despensa_zona_g', 'toldo_tejidos', 'puesto_flores', 'puesto_frutas', 'cafeteria_septima', 'cocina_entradas', 'toldo_sombreros', 'pescaderia_plaza', 'chocolateria_candelaria', 'parrilla_zona_g', 'toldo_loza', 'fritanga_plaza', 'dulceria_calle11', 'reposteria_zona_g', 'toldo_mascaras', 'plaza_paloquemao', 'casa_colonial', 'restaurante_zona_g', 'mercado_pulgas', 'hotel_capital', 'funicular_monserrate', 'pabellon_regiones', 'gran_feria'],
  // El Chorro de Quevedo: la plazoleta donde empieza todo, al pie de los Cerros.
  farm: { stationId: 'tostadero_chorro', x: 35, y: 6, w: 6, h: 6 },
  plots: [
    { stationId: 'cafeteria_septima', x: 37, y: 13 },
    { stationId: 'chocolateria_candelaria', x: 33, y: 13 },
    { stationId: 'dulceria_calle11', x: 31, y: 9 },
    { stationId: 'casa_colonial', x: 29, y: 13 },
    // Chapinero y la Zona G, siguiendo la Séptima hacia el norte.
    { stationId: 'despensa_zona_g', x: 25, y: 13 },
    { stationId: 'cocina_entradas', x: 23, y: 9 },
    { stationId: 'parrilla_zona_g', x: 21, y: 13 },
    { stationId: 'reposteria_zona_g', x: 19, y: 9 },
    { stationId: 'restaurante_zona_g', x: 17, y: 13 },
    // Usaquén, al final de la Séptima, al norte.
    { stationId: 'toldo_tejidos', x: 15, y: 9 },
    { stationId: 'toldo_sombreros', x: 13, y: 13 },
    { stationId: 'toldo_loza', x: 11, y: 9 },
    { stationId: 'toldo_mascaras', x: 9, y: 13 },
    { stationId: 'mercado_pulgas', x: 7, y: 9 },
    // Paloquemao, al occidente del centro, sobre la avenida que baja hacia la bodega.
    { stationId: 'puesto_flores', x: 28, y: 27 },
    { stationId: 'puesto_frutas', x: 30, y: 31 },
    { stationId: 'pescaderia_plaza', x: 32, y: 27 },
    { stationId: 'fritanga_plaza', x: 34, y: 31 },
    { stationId: 'plaza_paloquemao', x: 36, y: 27 },
    // El centro: el Hotel sobre la avenida del occidente, el Funicular al pie de Monserrate y, ya cerca de la bodega,
    // el Pabellón de las regiones y el Recinto de la Gran Feria.
    { stationId: 'hotel_capital', x: 12, y: 31 },
    { stationId: 'funicular_monserrate', x: 27, y: 9 },
    { stationId: 'pabellon_regiones', x: 39, y: 36 },
    { stationId: 'gran_feria', x: 39, y: 40 },
  ],
  warehouse: { x: 47, y: 42, w: 3, h: 3 },
  muleRoad: [[40.5, 12.5], [4.5, 12.5], [4.5, 30.5], [42.5, 30.5], [42.5, 44.5], [46.5, 44.5], [46.5, 45.5], [47.4, 45.5]],
  yard: { x: 46, y: 45, w: 4, h: 1 },
  jeepRoad: [[48.7, 45.5], [46.5, 45.5], [46.5, 51.9]],
  jeepRoad2: [[48.7, 46.5], [47.5, 46.5], [47.5, 51.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [47.5, 50.2],
  exitText: 'A la Autopista Sur ➜',
  // El letrero de la zona y su persona van junto a la bodega, como en las demás zonas pero corridos a esta esquina.
  signShift: [26, 26],
  // Lo que se ve al llegar: La Candelaria (el resto del mapa se recorre arrastrando).
  view: { x0: 25, y0: 3, x1: 42, y1: 22 },
  muleSpeed: 8,
  dispatchCost: { base: 10, growth: 1.17 },
  routes: {
    tm_cafe: { road: [[8.5, 51.9], [8.5, 20.5], [36.5, 20.5], [36.5, 12.5]], sign: [9.7, 49.4], text: 'Café del Eje ⬆' },
    tm_chocolate: { road: [[8.5, 51.9], [8.5, 20.5], [34.5, 20.5], [34.5, 16.2]], sign: [9.7, 46.4], text: 'Chocolate del Eje ⬆' },
    tm_cocadas: { road: [[8.5, 51.9], [8.5, 20.5], [28.5, 20.5], [28.5, 12.5], [31.2, 12.5]], sign: [9.7, 43.4], text: 'Cocadas de la Costa ⬆' },
    tm_amasijos: { road: [[0.1, 20.5], [33.5, 20.5], [33.5, 16.2]], sign: [2.6, 19.4], text: 'Amasijos de Boyacá ⬇' },
    tm_bocadillos: { road: [[0.1, 20.5], [32.5, 20.5], [32.5, 12.5]], sign: [5.6, 19.4], text: 'Bocadillos de Santander ⬇' },
    tm_bizcochos: { road: [[51.9, 20.5], [38.5, 20.5], [38.5, 16.2]], sign: [49.4, 21.6], text: '⬆ Bizcochos del Tolima' },
    tm_flores: { road: [[44.5, 51.9], [44.5, 20.5], [29.5, 20.5], [29.5, 26.2]], sign: [45.6, 49.4], text: 'Flores de la Sabana ⬆' },
    // Chapinero y la Zona G.
    tm_alino: { road: [[51.9, 20.5], [26.5, 20.5], [26.5, 16.2]], sign: [46.4, 21.6], text: '⬆ Aliño del Pacífico' },
    tm_aji: { road: [[18.5, 51.9], [18.5, 20.5], [25.5, 20.5], [25.5, 16.2]], sign: [19.7, 49.4], text: 'Ají negro, de El Dorado ⬆' },
    tm_papitas: { road: [[0.1, 20.5], [24.5, 20.5], [24.5, 12.5]], sign: [8.6, 19.4], text: 'Papitas de Boyacá ⬇' },
    tm_hormigas: { road: [[0.1, 20.5], [20.5, 20.5], [20.5, 12.5], [23.2, 12.5]], sign: [11.6, 19.4], text: 'Hormigas de Santander ⬇' },
    tm_asado: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [22.5, 20.5], [22.5, 16.2]], sign: [49.4, 9.6], text: '⬆ Asado de los Llanos' },
    tm_arroz: { road: [[8.5, 51.9], [8.5, 20.5], [21.5, 20.5], [21.5, 16.2]], sign: [9.7, 40.4], text: 'Arroz de la Costa ⬆' },
    tm_asai: { road: [[18.5, 51.9], [18.5, 20.5], [31.5, 20.5], [31.5, 30.8]], sign: [19.7, 46.4], text: 'Asaí, de El Dorado ⬆' },
    tm_jugos: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [31.5, 20.5], [31.5, 30.8]], sign: [46.4, 9.6], text: '⬆ Jugos de los Llanos' },
    // Usaquén.
    tm_ruanas: { road: [[0.1, 20.5], [16.5, 20.5], [16.5, 12.5]], sign: [14.6, 19.4], text: 'Ruanas de Boyacá ⬇' },
    tm_alpargatas: { road: [[0.1, 20.5], [12.5, 20.5], [12.5, 12.5], [15.2, 12.5]], sign: [17.6, 19.4], text: 'Alpargatas de Santander ⬇' },
    tm_sombreros: { road: [[8.5, 51.9], [8.5, 20.5], [14.5, 20.5], [14.5, 16.2]], sign: [7.3, 49.4], text: 'Sombreros de la Costa ⬆' },
    tm_sillas: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [13.5, 20.5], [13.5, 16.2]], sign: [43.4, 9.6], text: '⬆ Sillas de los Llanos' },
    tm_loza: { road: [[51.9, 20.5], [12.5, 20.5], [12.5, 12.5]], sign: [43.4, 21.6], text: '⬆ Loza del Tolima' },
    tm_canastas: { road: [[8.5, 51.9], [8.5, 12.5], [10.8, 12.5]], sign: [7.3, 46.4], text: 'Canastas del Eje ⬆' },
    tm_mascaras: { road: [[18.5, 51.9], [18.5, 20.5], [10.5, 20.5], [10.5, 16.2]], sign: [19.7, 43.4], text: 'Máscaras, de El Dorado ⬆' },
    tm_werregue: { road: [[51.9, 20.5], [9.5, 20.5], [9.5, 16.2]], sign: [40.4, 21.6], text: '⬆ Werregue del Pacífico' },
    tm_cofres: { road: [[44.5, 51.9], [44.5, 20.5], [8.5, 20.5], [8.5, 12.5]], sign: [45.6, 46.4], text: 'Cofres de sal ⬆' },
    // Paloquemao.
    tm_trucha: { road: [[44.5, 51.9], [44.5, 20.5], [33.5, 20.5], [33.5, 26.2]], sign: [45.6, 43.4], text: 'Truchas de Guatavita ⬆' },
    tm_pargo: { road: [[51.9, 20.5], [32.5, 20.5], [32.5, 26.2]], sign: [37.4, 21.6], text: '⬆ Pargo del Pacífico' },
    tm_lechona: { road: [[51.9, 35.5], [35.5, 35.5], [35.5, 34.2]], sign: [49.4, 36.6], text: '⬆ Lechona del Tolima' },
  },
  unlockedBy: null, // la única de Bogotá: se abre con la región
  next: null,
};
