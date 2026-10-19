// Mapa de Santander · Zona 6: Barichara (v3.5). Mismo trazado que el Pueblo (zone6_pueblo.js): no tiene
// fuente propia; en la plaza está la Dulcería, que recibe el bocadillo de la Guayabera, y cada estación
// espera junto a la carretera por la que le llega lo suyo de otra zona de Santander. Se dibuja como el
// Pueblo (tema 'town'), pero blanca y con calles de piedra amarilla (style).
import { ICON } from '../icons.js';

export const ZONE12 = {
  id: 'barichara',
  region: 'santander',
  name: 'Barichara',
  icon: '⛪',
  size: 26,
  seed: 101,
  theme: 'town',
  style: 'barichara',
  chain: ['dulceria', 'park_cafe', 'posada', 'box_shop', 'hamper', 'camino_real'],
  farm: { stationId: 'dulceria', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'park_cafe', x: 9, y: 5 },
    { stationId: 'posada', x: 5, y: 8 },
    { stationId: 'box_shop', x: 11, y: 12 },
    { stationId: 'hamper', x: 13, y: 7 },
    { stationId: 'camino_real', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  exitSign: [21.5, 24.2],
  exitText: 'A Guane ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  routes: {
    dulces: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Bocadillo de la Guayabera' },
    tabacos: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Tabacos del Tabacal' },
    fiambres: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Fiambres' },
    almuerzos: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Almuerzos del Hato' },
    recuerdos: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Recuerdos de las Hormigas ⬆' },
    tercios: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Tercios de la Fiquera ⬆' },
  },
  unlockedBy: 'hormigas',
  next: null, // la última de Santander
};
