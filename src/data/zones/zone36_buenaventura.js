// Mapa de la Costa Pacífica · Zona 6: Buenaventura (v3.43). Mismo trazado que Barichara, Cartagena, Villa de
// Leyva y Villavicencio: no tiene fuente propia; en el malecón está la Fritanga del puerto, que recibe las cajas de
// patacones del Platanal, y cada estación espera junto a la carretera por la que le llega lo suyo de otra zona
// del Pacífico. Se dibuja como el Pueblo (tema 'town'), con casas de colores, techos de zinc y palmas de coco (style).
import { ICON } from '../icons.js';

export const ZONE36 = {
  id: 'buenaventura',
  region: 'pacifico',
  name: 'Buenaventura',
  icon: ICON.ballenas,
  size: 26,
  seed: 159,
  theme: 'town',
  style: 'buenaventura',
  chain: ['fritanga_puerto', 'cevicheria', 'hotel_bahia', 'galeria_pueblo_nuevo', 'loncheras_lancha', 'salida_ballenas'],
  farm: { stationId: 'fritanga_puerto', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'cevicheria', x: 9, y: 5 },
    { stationId: 'hotel_bahia', x: 5, y: 8 },
    { stationId: 'galeria_pueblo_nuevo', x: 11, y: 12 },
    { stationId: 'loncheras_lancha', x: 13, y: 7 },
    { stationId: 'salida_ballenas', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Juanchaco ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_patacones: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Patacones del Platanal' },
    cajas_alino: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Aliño' },
    cazuelas_mariscos: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Cazuelas' },
    arroces_piangua: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Arroz del Manglar' },
    recuerdos_pacifico: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Werregue ⬆' },
    platos_tapao: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Tapao ⬆' },
  },
  // El Pacífico detrás del mapa (v3.54): las ballenas jorobadas que llegan a la bahía de julio a octubre, y las
  // lanchas de los turistas que salen a verlas. [gx, gy, hacia dónde nada]; las lanchas, [gx, gy].
  sea: {
    whales: [[-3.2, 6, 1], [8, -3.4, -1], [-4.6, 16, -1], [17, -4.2, 1], [-2.6, 23, 1]],
    boats: [[-2, 9.5], [11.5, -2.2], [21, -2.6]],
  },
  unlockedBy: 'werregue',
  next: null, // la última de la Costa Pacífica
};
