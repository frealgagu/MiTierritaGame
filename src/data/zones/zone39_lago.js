// Amazonas Map · Zone 3: El Lago (v3.49). Same layout as La Fiquera, La Ciénaga, Ráquira, La Cachamera, and
// La Bahía: cleaned pirarucu is split between the Salting Shed, the Filleting Table (passing steaks to the Moquén), and the Kitchen.
import { ICON } from '../icons.js';

export const ZONE39 = {
  id: 'lago',
  region: 'amazonas',
  name: 'El Lago',
  icon: ICON.pirarucu,
  theme: 'lake',
  size: 26,
  seed: 167,
  chain: ['pirarucu_canoes', 'pirarucu_cleaner', 'pirarucu_salter', 'pirarucu_filleter', 'moquen', 'pirarucu_kitchen'],
  farm: { stationId: 'pirarucu_canoes', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pirarucu_cleaner', x: 9, y: 5 },
    { stationId: 'pirarucu_filleter', x: 9, y: 8 },
    // The Moquén sits next to the Filleting Table: steaks pass from one to the other.
    { stationId: 'moquen', x: 12, y: 7 },
    { stationId: 'pirarucu_salter', x: 11, y: 12 },
    // The Pirarucu Kitchen waits for black chili from El Ajizal next to the route road.
    { stationId: 'pirarucu_kitchen', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A los lagos de Tarapoto ➜',
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Black Chili Route arrives, up to the Pirarucu Kitchen.
  routes: {
    ajinegro: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Ajizal' },
    // Cleaned pirarucu leaves the warehouse toward La Casabería (v3.50).
    pirarucus: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Pirarucú a la Casabería ➜' },
    // Salted and moqueado pirarucu leave toward La Yanchama (v3.51).
    pirarucus_salados: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Pirarucú salado a la Yanchama ⬇' },
    moqueados: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Moqueado ⬇' },
    // Black-chili pirarucu leaves toward Leticia (v3.52).
    platos_pirarucu: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Pirarucú a Leticia ➜' },
  },
  unlockedBy: 'ajizal',
  next: 'casaberia',
};
