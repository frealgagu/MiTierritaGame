// Mapa de la Zona 2: El Trapiche. Mismas convenciones que la Zona 1 (ver zone1_finca.js).
export const ZONE2 = {
  id: 'trapiche',
  name: 'El Trapiche',
  icon: '🎋',
  size: 26,
  seed: 23,
  theme: 'cane',
  chain: ['canefield', 'cane_mill', 'furnace', 'molds', 'pulverizer'],
  farm: { stationId: 'canefield', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'cane_mill', x: 9, y: 5 },
    // La Hornilla va pegada a la Molienda: el bagazo pasa directo de una a otra.
    { stationId: 'furnace', x: 9, y: 8 },
    { stationId: 'molds', x: 11, y: 12 },
    { stationId: 'pulverizer', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 100, growth: 1.17 },
  // Carreteras de las rutas de la panela: salen de la bodega hacia la Lechería y el Cacaotal.
  routes: {
    panela: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'A la Lechería ➜' },
    panela_cacao: { road: [[23.5, 15.6], [23.5, 12.5], [25.9, 12.5]], sign: [22.4, 11.4], text: 'Al Cacaotal ➜' },
  },
  unlockedBy: 'finca', // se abre al completar la Finca
  next: 'lecheria',
};
