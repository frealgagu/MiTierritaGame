// Mapa de Boyacá · Zona 4: Paipa (v3.25). Mismo trazado que el Hato y la Quesera: las almojábanas se
// reparten entre la Mesa del piquete y el Horno de barro, que esperan junto a las dos carreteras por las
// que llegan las papitas del Papal y el barro de Ráquira.
import { ICON } from '../icons.js';

export const ZONE22 = {
  id: 'paipa',
  region: 'boyaca',
  name: 'Paipa',
  icon: ICON.quesoPaipa,
  theme: 'dairy',
  style: 'paipa',
  size: 26,
  seed: 137,
  chain: ['paipa_herd', 'paipa_curdler', 'cheese_molds', 'cheese_cave', 'almojabana_oven', 'piquete_table', 'clay_oven'],
  farm: { stationId: 'paipa_herd', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'paipa_curdler', x: 9, y: 5 },
    { stationId: 'cheese_molds', x: 9, y: 8 },
    { stationId: 'cheese_cave', x: 11, y: 12 },
    { stationId: 'almojabana_oven', x: 13, y: 7 },
    { stationId: 'piquete_table', x: 17, y: 12 },
    { stationId: 'clay_oven', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Duitama ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    papitas: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Papitas del Papal' },
    barro: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Barro de Ráquira' },
    // Los amasijos y los piquetes salen hacia Villa de Leyva (v3.27).
    amasijos: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Amasijos a Villa de Leyva ➜' },
    piquetes: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Piquetes ⬇' },
  },
  unlockedBy: 'raquira',
  next: 'ruanas',
};
