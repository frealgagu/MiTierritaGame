// Boyacá Map · Zone 3: Ráquira (v3.24). Same layout as La Fiquera and La Ciénaga: kneaded clay
// is split between the Clay Pots, the Potter's Wheel (which passes pieces to the Kiln), and the Pitchers.
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
    // The Kiln sits next to the Potter's Wheel: pieces pass from one to the other.
    { stationId: 'pottery_kiln', x: 12, y: 7 },
    { stationId: 'pot_maker', x: 11, y: 12 },
    // The Pitchers station waits for beer from La Cervecería next to the route road.
    { stationId: 'jarras', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Tinjacá ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Beer Route arrives, up to the Pitchers station.
  routes: {
    cerveza: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ De la Cervecería' },
    // The Clay Route leaves the warehouse toward Paipa (v3.25).
    barro: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Barro a Paipa ➜' },
    // Pots and planters leave toward Las Ruanas (v3.26).
    ollas: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Ollas a Las Ruanas ⬇' },
    materas: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Materas ⬇' },
    // Beer pitchers leave toward Villa de Leyva (v3.27).
    jarras_cerveza: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Jarras a Villa de Leyva ➜' },
  },
  unlockedBy: 'cerveceria',
  next: 'paipa',
};
