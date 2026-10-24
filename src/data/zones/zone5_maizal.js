// Mapa de la Zona 5: El Maizal. Mismas convenciones que la Zona 1 (ver zone1_finca.js).
// Cadena lineal hasta el Puesto de arepas, que espera junto a las dos carreteras por las que llegan
// el queso y la mantequilla de la Lechería.
export const ZONE5 = {
  id: 'maizal',
  name: 'El Maizal',
  icon: '🌽',
  size: 26,
  seed: 73,
  theme: 'corn',
  chain: ['cornfield', 'sheller', 'corn_huller', 'dough_mill', 'budare', 'arepa_stand'],
  farm: { stationId: 'cornfield', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'sheller', x: 9, y: 5 },
    { stationId: 'corn_huller', x: 9, y: 8 },
    { stationId: 'dough_mill', x: 11, y: 12 },
    { stationId: 'budare', x: 13, y: 7 },
    { stationId: 'arepa_stand', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 40000, growth: 1.17 },
  // Carreteras por las que llegan el queso y la mantequilla, hasta el Puesto de arepas.
  routes: {
    queso: { road: [[25.9, 13.5], [20.3, 13.5]], sign: [24.2, 12.3], text: '⬅ Queso de la Lechería' },
    mantequilla: { road: [[25.9, 15.5], [20.3, 15.5]], sign: [24.6, 14.6], text: '⬅ Mantequilla' },
    // Las arepas de queso salen de la bodega hacia el Pueblo.
    arepas: { road: [[24.2, 17.5], [25.9, 17.5]], sign: [25.3, 16.6], text: 'A Salento ➜' },
  },
  unlockedBy: 'cacaotal',
  next: 'pueblo',
};
