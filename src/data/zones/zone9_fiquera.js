// Santander Map · Zone 3: La Fiquera (v3.2). Same layout as La Lechería (zone3_lecheria.js): the
// fiber from the Decorticator is split between the Sack Loom, the Spinner, and the Bale Packer.
import { ICON } from '../icons.js';

export const ZONE9 = {
  id: 'fiquera',
  region: 'santander',
  name: 'La Fiquera',
  icon: ICON.fiquePlant,
  theme: 'fique',
  size: 26,
  seed: 53,
  chain: ['fique_field', 'decorticator', 'sack_loom', 'spinner', 'alpargata_shop', 'tercio_packer'],
  farm: { stationId: 'fique_field', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'decorticator', x: 9, y: 5 },
    { stationId: 'spinner', x: 9, y: 8 },
    // The Espadrille Workshop sits next to the Spinner: yarn passes from one to the other.
    { stationId: 'alpargata_shop', x: 12, y: 7 },
    { stationId: 'sack_loom', x: 11, y: 12 },
    // The Bale Packer waits for tobacco from El Tabacal next to the route road.
    { stationId: 'tercio_packer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Curití ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Tobacco Route arrives, up to the Bale Packer.
  routes: {
    tabaco: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Tabacal' },
    // The Cabuya Route leaves the warehouse toward El Hato (v3.3).
    cabuya: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Cabuya al Hato ➜' },
    // Sacks and espadrilles leave toward Las Hormigas (v3.4).
    costales: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Costales a las Hormigas ⬇' },
    alpargatas: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Alpargatas ⬇' },
    // Tobacco bales leave toward Barichara (v3.5).
    tercios: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Tercios a Barichara ➜' },
  },
  unlockedBy: 'tabacal',
  next: 'hato',
};
