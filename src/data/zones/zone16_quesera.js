// Mapa de la Costa · Zona 4: La Quesera (v3.18). Mismo trazado que el Hato (zone10_hato.js): el mote de
// queso se reparte entre la Fonda costeña y la Cocina de la bandeja, que esperan junto a las dos carreteras
// por las que llegan el arroz del Arrozal y el pescado de la Ciénaga.
import { ICON } from '../icons.js';

export const ZONE16 = {
  id: 'quesera',
  region: 'costa',
  name: 'La Quesera',
  icon: ICON.quesoCosteno,
  theme: 'savanna',
  size: 26,
  seed: 71,
  chain: ['milking_corral', 'curdler', 'curd_mill', 'cheese_press', 'mote_pot', 'costeno_fonda', 'bandeja_kitchen'],
  farm: { stationId: 'milking_corral', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'curdler', x: 9, y: 5 },
    { stationId: 'curd_mill', x: 9, y: 8 },
    { stationId: 'cheese_press', x: 11, y: 12 },
    { stationId: 'mote_pot', x: 13, y: 7 },
    { stationId: 'costeno_fonda', x: 17, y: 12 },
    { stationId: 'bandeja_kitchen', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Sahagún ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    arroz: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Arroz del Arrozal' },
    pescado: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Pescado de la Ciénaga' },
  },
  unlockedBy: 'cienaga',
  next: 'sombrero',
};
