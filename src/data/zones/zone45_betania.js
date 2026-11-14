// Tolima Grande Map · Zone 3: La Represa de Betania (v4.0), in Huila. Same layout as the third zone of
// each region: cleaned tilapia is split between the Smokehouse, the Filleting Table (passing fillets to the
// Pickling Pot), and the Dam Kitchen.
import { ICON } from '../icons.js';

export const ZONE45 = {
  id: 'betania',
  region: 'tolima',
  name: 'La Represa de Betania',
  icon: ICON.tilapia,
  theme: 'lake',
  style: 'betania',
  size: 26,
  seed: 197,
  chain: ['tilapia_cages', 'tilapia_cleaner', 'tilapia_smoker', 'tilapia_filleter', 'escabeche_pot', 'represa_kitchen'],
  farm: { stationId: 'tilapia_cages', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'tilapia_cleaner', x: 9, y: 5 },
    { stationId: 'tilapia_filleter', x: 9, y: 8 },
    // The Pickling Pot sits next to the Filleting Table: fillets pass from one to the other.
    { stationId: 'escabeche_pot', x: 12, y: 7 },
    { stationId: 'tilapia_smoker', x: 11, y: 12 },
    { stationId: 'represa_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Yaguará ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Smoked tilapia and escabeche leave toward La Chamba; lunches toward Neiva.
  routes: {
    ahumadas_tilapia: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Tilapia ahumada a La Chamba ⬇' },
    escabeches: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Escabeche ⬇' },
    almuerzos_represa: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Almuerzos a Neiva ➜' },
  },
  unlockedBy: 'cafe_huila',
  next: 'lechoneria',
};
