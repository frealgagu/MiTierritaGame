// Mapa de los Llanos · Zona 6: Villavicencio (v3.36). Mismo trazado que Barichara, Cartagena y Villa de
// Leyva: no tiene fuente propia; en el parque está la Empanadería, que recibe las cajas de aceite de la Palma, y
// cada estación espera junto a la carretera por la que le llega lo suyo de otra zona de los Llanos. Se dibuja como
// el Pueblo (tema 'town'), con casas de colores, techos de zinc, palmas de moriche y mangos (style).
import { ICON } from '../icons.js';

export const ZONE30 = {
  id: 'villavicencio',
  region: 'llanos',
  name: 'Villavicencio',
  icon: ICON.canoCristales,
  size: 26,
  seed: 157,
  theme: 'town',
  style: 'villavo',
  chain: ['empanaderia', 'kiosco_parque', 'hotel_campestre', 'plaza_mercado', 'morrales_viaje', 'salida_cano'],
  farm: { stationId: 'empanaderia', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'kiosco_parque', x: 9, y: 5 },
    { stationId: 'hotel_campestre', x: 5, y: 8 },
    { stationId: 'plaza_mercado', x: 11, y: 12 },
    { stationId: 'morrales_viaje', x: 13, y: 7 },
    { stationId: 'salida_cano', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Caño Cristales ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_aceite: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Aceite de la Palma' },
    cajas_jugos: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Jugos' },
    parrandas: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Asados' },
    almuerzos_llaneros: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Almuerzos del Hato' },
    recuerdos_llano: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Sillas de la Talabartería ⬆' },
    platos_cachama: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Cachama ⬆' },
  },
  unlockedBy: 'talabarteria',
  next: null, // la última de los Llanos
};
