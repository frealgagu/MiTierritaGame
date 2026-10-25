// Mapa de Boyacá · Zona 3: Ráquira (v3.24). Mismo trazado que la Fiquera y la Ciénaga: el barro amasado
// se reparte entre las Ollas de barro, el Torno (que le pasa las piezas al Horno) y las Jarras.
import { ICON } from '../icons.js';

export const ZONE21 = {
  id: 'raquira',
  region: 'boyaca',
  name: 'Ráquira',
  icon: ICON.caballito,
  theme: 'clay',
  size: 26,
  seed: 131,
  chain: ['clay_pit', 'clay_kneader', 'pot_maker', 'potter_wheel', 'pottery_kiln', 'jarras'],
  farm: { stationId: 'clay_pit', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'clay_kneader', x: 9, y: 5 },
    { stationId: 'potter_wheel', x: 9, y: 8 },
    // El Horno va junto al Torno: las piezas pasan de uno a otro.
    { stationId: 'pottery_kiln', x: 12, y: 7 },
    { stationId: 'pot_maker', x: 11, y: 12 },
    // Las Jarras esperan la cerveza de la Cervecería junto a la carretera de la ruta.
    { stationId: 'jarras', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys, por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Tinjacá ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta de la cerveza, hasta las Jarras.
  routes: {
    cerveza: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ De la Cervecería' },
  },
  unlockedBy: 'cerveceria',
  next: null,
};
