// Mapa de Santander · Zona 4: El Hato (v3.3). Mismo trazado que el Cacaotal (zone4_cacaotal.js): la
// carne asada se reparte entre la Mesa del almuerzo y la Fiambrería, que esperan junto a las dos
// carreteras por las que llegan el bocadillo de la Guayabera y la cabuya de la Fiquera.
export const ZONE10 = {
  id: 'hato',
  region: 'santander',
  name: 'El Hato',
  icon: '🐂',
  theme: 'ranch',
  size: 26,
  seed: 61,
  chain: ['cattle_ranch', 'butcher', 'salter', 'airing_rack', 'grill', 'lunch_table', 'fiambre_maker'],
  farm: { stationId: 'cattle_ranch', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'butcher', x: 9, y: 5 },
    { stationId: 'salter', x: 9, y: 8 },
    { stationId: 'airing_rack', x: 11, y: 12 },
    { stationId: 'grill', x: 13, y: 7 },
    { stationId: 'lunch_table', x: 17, y: 12 },
    { stationId: 'fiambre_maker', x: 17, y: 15 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  exitText: 'A Los Santos ➜',
  muleSpeed: 4,
  dispatchCost: { base: 4000, growth: 1.17 },
  routes: {
    bocadillo: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Bocadillo de la Guayabera' },
    cabuya: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Cabuya de la Fiquera' },
    // Los fiambres y los almuerzos salen hacia Barichara (v3.5).
    fiambres: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'Fiambres a Barichara ➜' },
    almuerzos: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [23.7, 23.6], text: 'Almuerzos ⬇' },
  },
  unlockedBy: 'fiquera',
  next: 'hormigas',
};
