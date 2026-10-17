// Mapa de la Zona 4: El Cacaotal. Mismas convenciones que la Zona 1 (ver zone1_finca.js).
// La pasta de cacao se reparte entre la Mesa de chocolate y la Chocolatería, que esperan junto a las
// dos carreteras por las que llegan la panela del Trapiche y la leche de la Lechería.
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
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  // Carreteras por las que llegan las rutas, hasta la Mesa y la Chocolatería.
  routes: {
    panela_cacao: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Panela del Trapiche' },
    leche: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Leche de la Lechería' },
  },
  unlockedBy: 'lecheria',
  next: null,
};
