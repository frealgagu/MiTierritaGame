// Zone 4 Map: El Cacaotal. Same conventions as Zone 1 (see zone1_finca.js).
// Cocoa paste is split between the Chocolate Table and the Chocolatería, waiting next to the
// two roads bringing panela from El Trapiche and milk from La Lechería.
export const ZONE4 = {
  id: 'cacaotal',
  name: 'El Cacaotal',
  icon: '🍫',
  size: 26,
  seed: 57,
  theme: 'cacao',
  chain: ['cacao_grove', 'fermenter', 'cacao_dryer', 'cacao_roaster', 'cacao_mill', 'chocolate_table', 'chocolatier'],
  farm: { stationId: 'cacao_grove', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'fermenter', x: 9, y: 5 },
    { stationId: 'cacao_dryer', x: 9, y: 8 },
    { stationId: 'cacao_roaster', x: 11, y: 12 },
    { stationId: 'cacao_mill', x: 13, y: 7 },
    { stationId: 'chocolate_table', x: 17, y: 12 },
    { stationId: 'chocolatier', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  // Roads along which the routes arrive, up to the Table and the Chocolatería.
  routes: {
    panela_cacao: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Panela del Trapiche' },
    // (v5.18) The Finca's compost, down from the top edge straight to the cacao trees.
    abono: { road: [[5.5, 0.1], [5.5, 1.7]], sign: [7.2, 0.9], text: '⬇ Abono de la Finca' },
    leche: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Leche de la Lechería' },
    // Both chocolates leave the warehouse toward El Pueblo (v1.5).
    chocolatinas: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Chocolatinas a Salento ➜' },
    chocolate_mesa: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Chocolate a Salento ⬇' },
  },
  unlockedBy: 'lecheria',
  next: 'maizal',
};
