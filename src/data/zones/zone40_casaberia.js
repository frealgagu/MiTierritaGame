// Amazonas Map · Zone 4: La Casabería (v3.50). Same layout as El Hato, La Quesera, Paipa, El Hato Llanero,
// and El Manglar: casabe is split between the Breakfast Table and the Maloca, waiting next to the two roads
// bringing açaí bags from El Asaizal and cleaned pirarucu from El Lago.
import { ICON } from '../icons.js';

export const ZONE40 = {
  id: 'casaberia',
  region: 'amazonas',
  name: 'La Casabería',
  icon: ICON.casabe,
  theme: 'chagra',
  size: 26,
  seed: 173,
  chain: ['yuca_chagra', 'yuca_peeler', 'yuca_grater', 'tipiti_press', 'casabe_budare', 'desayuno_table', 'maloca'],
  farm: { stationId: 'yuca_chagra', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'yuca_peeler', x: 9, y: 5 },
    { stationId: 'yuca_grater', x: 9, y: 8 },
    { stationId: 'tipiti_press', x: 11, y: 12 },
    { stationId: 'casabe_budare', x: 13, y: 7 },
    { stationId: 'desayuno_table', x: 17, y: 12 },
    { stationId: 'maloca', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys, inside the first one
  exitSign: [21.5, 24.2],
  exitText: 'A Puerto Nariño ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  // The two roads bringing açaí from El Asaizal and pirarucu from El Lago.
  routes: {
    bolsas_asai: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Asaí del Asaizal' },
    pirarucus: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Pirarucú del Lago' },
    // Banquets and breakfasts leave toward Leticia (v3.52).
    banquetes_maloca: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Banquetes a Leticia ➜' },
    desayunos_amazonicos: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Desayunos ⬇' },
  },
  unlockedBy: 'lago',
  next: 'yanchama',
};
