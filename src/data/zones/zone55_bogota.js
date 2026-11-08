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
  // Los barrios (v4.5): cada uno se construye en su orden y todos a la vez (ver sim/chain.js: groupsOf). La cadena
  // es la de todos, uno tras otro.
  groups: [
    { id: 'candelaria', name: 'La Candelaria', stations: ['tostadero_chorro', 'cafeteria_septima', 'chocolateria_candelaria', 'dulceria_calle11', 'casa_colonial'] },
    { id: 'zona_g', name: 'Chapinero y la Zona G', stations: ['despensa_zona_g', 'cocina_entradas', 'parrilla_zona_g', 'reposteria_zona_g', 'restaurante_zona_g'] },
  ],
  chain: ['tostadero_chorro', 'cafeteria_septima', 'chocolateria_candelaria', 'dulceria_calle11', 'casa_colonial', 'despensa_zona_g', 'cocina_entradas', 'parrilla_zona_g', 'reposteria_zona_g', 'restaurante_zona_g'],
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
    tm_flores: { road: [[44.5, 51.9], [44.5, 20.5], [30.5, 20.5], [30.5, 16.2]], sign: [45.6, 49.4], text: 'Flores de la Sabana ⬆' },
    // Chapinero y la Zona G.
    tm_alino: { road: [[51.9, 20.5], [26.5, 20.5], [26.5, 16.2]], sign: [46.4, 21.6], text: '⬆ Aliño del Pacífico' },
    tm_aji: { road: [[18.5, 51.9], [18.5, 20.5], [25.5, 20.5], [25.5, 16.2]], sign: [19.7, 49.4], text: 'Ají negro, de El Dorado ⬆' },
    tm_papitas: { road: [[0.1, 20.5], [24.5, 20.5], [24.5, 12.5]], sign: [8.6, 19.4], text: 'Papitas de Boyacá ⬇' },
    tm_hormigas: { road: [[0.1, 20.5], [20.5, 20.5], [20.5, 12.5], [23.2, 12.5]], sign: [11.6, 19.4], text: 'Hormigas de Santander ⬇' },
    tm_asado: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [22.5, 20.5], [22.5, 16.2]], sign: [49.4, 9.6], text: '⬆ Asado de los Llanos' },
    tm_arroz: { road: [[8.5, 51.9], [8.5, 20.5], [21.5, 20.5], [21.5, 16.2]], sign: [9.7, 40.4], text: 'Arroz de la Costa ⬆' },
    tm_asai: { road: [[18.5, 51.9], [18.5, 20.5], [16.5, 20.5], [16.5, 12.5], [19.2, 12.5]], sign: [19.7, 46.4], text: 'Asaí, de El Dorado ⬆' },
    tm_jugos: { road: [[51.9, 8.5], [44.5, 8.5], [44.5, 20.5], [20.5, 20.5], [20.5, 12.5]], sign: [46.4, 9.6], text: '⬆ Jugos de los Llanos' },
  },
  unlockedBy: null, // la única de Bogotá: se abre con la región
  next: null,
};
