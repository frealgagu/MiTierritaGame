// Mapa de la Zona 3: La Lechería. Mismas convenciones que la Zona 1 (ver zone1_finca.js).
// Es la primera zona con ramas: la leche pasteurizada se reparte entre la Descremadora, la Quesera
// y la Paila de arequipe. Todas las estaciones quedan junto al mismo camino de las mulas.
export const ZONE3 = {
  id: 'lecheria',
  name: 'La Lechería',
  icon: '🐄',
  size: 26,
  seed: 41,
  theme: 'dairy',
  // Orden en que se construyen. Quién alimenta a quién sale de las recetas (ver sim/chain.js).
  chain: ['pasture', 'pasteurizer', 'cheesery', 'separator', 'churn', 'arequipe_pot'],
  farm: { stationId: 'pasture', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pasteurizer', x: 9, y: 5 },
    { stationId: 'separator', x: 9, y: 8 },
    // La Batidora va junto a la Descremadora: la crema pasa de una a otra.
    { stationId: 'churn', x: 12, y: 7 },
    { stationId: 'cheesery', x: 11, y: 12 },
    // La Paila espera la panela del Trapiche junto a la carretera de la ruta.
    { stationId: 'arequipe_pot', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Carretera por la que llega la Ruta de la panela, hasta la Paila de arequipe.
  // La Ruta de la leche sale de la bodega hacia el Cacaotal.
  routes: {
    panela: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Trapiche' },
    leche: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Al Cacaotal ➜' },
  },
  unlockedBy: 'trapiche',
  next: 'cacaotal',
};
