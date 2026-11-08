// Mapa de Cundinamarca · Zona 6: Zipaquirá (v4.4), la última de la región. Como Neiva y Villa de Leyva, sin fuente
// propia: la plaza colonial de casonas blancas con balcones verdes, adonde llega una carretera de cada zona de la región.
import { ICON } from '../icons.js';

export const ZONE54 = {
  id: 'zipaquira',
  region: 'cundinamarca',
  name: 'Zipaquirá',
  icon: ICON.catedralSal,
  size: 26,
  seed: 229,
  theme: 'town',
  style: 'villa',
  chain: ['floristeria_plaza', 'salon_onces', 'hotel_plaza_zipa', 'plaza_mercado_zipa', 'mochilas_paseo', 'entrada_catedral'],
  farm: { stationId: 'floristeria_plaza', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'salon_onces', x: 9, y: 5 },
    { stationId: 'hotel_plaza_zipa', x: 5, y: 8 },
    { stationId: 'plaza_mercado_zipa', x: 11, y: 12 },
    { stationId: 'mochilas_paseo', x: 13, y: 7 },
    { stationId: 'entrada_catedral', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A la mina ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    cajas_flores: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Flores de la Sabana' },
    fresas_crema: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Fresas de Sibaté' },
    cofres_sal: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Cofres de sal' },
    canastas: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Canastas' },
    almuerzos_sabaneros: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Ajiaco ⬆' },
    mermeladas: { road: [[4.5, 25.9], [4.5, 11.2]], sign: [3.3, 21.6], text: 'Mermelada ⬆' },
    almuerzos_trucha: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Trucha ⬆' },
  },
  unlockedBy: 'cocina',
  next: null, // la última de Cundinamarca
};
