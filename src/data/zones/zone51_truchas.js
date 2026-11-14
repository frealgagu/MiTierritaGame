// Cundinamarca Map · Zone 3: Las Truchas de Guatavita (v4.4). Same layout as the third zone of each region:
// cleaned trout is split between the Smokehouse, the Filleting Table (passing fillets to the Ceviche Table), and the
// Lagoon Kitchen.
import { ICON } from '../icons.js';

export const ZONE51 = {
  id: 'truchas',
  region: 'cundinamarca',
  name: 'Las Truchas de Guatavita',
  icon: ICON.trucha,
  theme: 'ponds',
  style: 'truchas',
  size: 26,
  seed: 211,
  chain: ['estanques_trucha', 'limpieza_trucha', 'ahumadero_trucha', 'fileteadora_trucha', 'mesa_ceviche', 'cocina_laguna'],
  farm: { stationId: 'estanques_trucha', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'limpieza_trucha', x: 9, y: 5 },
    { stationId: 'fileteadora_trucha', x: 9, y: 8 },
    // The Ceviche Table sits next to the Filleting Table: fillets pass from one to the other.
    { stationId: 'mesa_ceviche', x: 12, y: 7 },
    { stationId: 'ahumadero_trucha', x: 11, y: 12 },
    { stationId: 'cocina_laguna', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Guatavita ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Smoked trout and ceviche leave toward La Cocina de la Sabana; lunches toward Zipaquirá.
  routes: {
    ahumadas_trucha: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Trucha ahumada a la Cocina ⬇' },
    ceviches: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Ceviche ⬇' },
    almuerzos_trucha: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Almuerzos a Zipaquirá ➜' },
  },
  unlockedBy: 'fresas',
  next: 'salinas',
};
