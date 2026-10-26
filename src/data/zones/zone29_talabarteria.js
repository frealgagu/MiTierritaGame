// Mapa de los Llanos · Zona 5: La Talabartería (v3.35). Mismo trazado que las Hormigas, el Sombrero y Las
// Ruanas: cadena lineal hasta la Tienda llanera, que espera junto a las dos carreteras por las que llegan el
// pisillo y la cachama ahumada de la Cachamera.
import { ICON } from '../icons.js';

export const ZONE29 = {
  id: 'talabarteria',
  region: 'llanos',
  name: 'La Talabartería',
  icon: ICON.saddle,
  theme: 'hides',
  size: 26,
  seed: 151,
  chain: ['hide_yard', 'tannery', 'leather_cutter', 'leather_tooler', 'saddler', 'tienda_llanera'],
  farm: { stationId: 'hide_yard', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'tannery', x: 9, y: 5 },
    { stationId: 'leather_cutter', x: 9, y: 8 },
    { stationId: 'leather_tooler', x: 11, y: 12 },
    { stationId: 'saddler', x: 13, y: 7 },
    { stationId: 'tienda_llanera', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Acacías ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    pisillos: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Pisillo de la Cachamera' },
    ahumadas: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Cachama ahumada' },
  },
  unlockedBy: 'hato_llanero',
  next: 'villavicencio',
};
