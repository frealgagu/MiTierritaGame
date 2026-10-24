// Mapa de la Costa · Zona 5: El Sombrero (v3.19). Mismo trazado que las Hormigas (zone11_hormigas.js):
// cadena lineal hasta el Parador de Tuchín, que espera junto a las dos carreteras por las que llegan el
// pescado salado y el pescado frito de la Ciénaga.
import { ICON } from '../icons.js';

export const ZONE17 = {
  id: 'sombrero',
  region: 'costa',
  name: 'El Sombrero',
  icon: ICON.sombreroVueltiao,
  theme: 'canaflecha',
  size: 26,
  seed: 83,
  chain: ['canaflechal', 'fiber_scraper', 'fiber_dyer', 'braiders', 'hat_sewer', 'parador'],
  farm: { stationId: 'canaflechal', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'fiber_scraper', x: 9, y: 5 },
    { stationId: 'fiber_dyer', x: 9, y: 8 },
    { stationId: 'braiders', x: 11, y: 12 },
    { stationId: 'hat_sewer', x: 13, y: 7 },
    { stationId: 'parador', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Tuchín ➜',
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  routes: {
    salado: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Pescado salado de la Ciénaga' },
    frito: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Pescado frito' },
    // Los recuerdos salen hacia Cartagena (v3.20).
    recuerdos_costa: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Cartagena ➜' },
  },
  unlockedBy: 'quesera',
  next: 'cartagena',
};
