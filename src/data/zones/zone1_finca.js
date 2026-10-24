// Mapa de la Zona 1. Coordenadas en casillas (gx, gy); el eje gx baja a la derecha
// en pantalla y gy baja a la izquierda. Los caminos usan el centro de la casilla (+0.5).

export const ZONE1 = {
  id: 'finca',
  name: 'La Finca',
  icon: '☕',
  theme: 'coffee',
  size: 26,
  seed: 7,
  // Orden de la cadena: cada estación entrega su producto a la siguiente.
  chain: ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer'],
  farm: { stationId: 'farm', x: 2, y: 2, w: 6, h: 6 },
  // Parcelas de las estaciones siguientes, en orden de la cadena (3×3 casillas).
  plots: [
    { stationId: 'wetmill', x: 9, y: 5 },
    { stationId: 'dryer', x: 5, y: 8 },
    { stationId: 'huller', x: 10, y: 11 },
    { stationId: 'roaster', x: 15, y: 11 },
    { stationId: 'grinder', x: 11, y: 14 },
    { stationId: 'packer', x: 16, y: 17 },
    // Rama secundaria, junto al Beneficiadero.
    { stationId: 'composter', x: 12, y: 5 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  // Camino de las mulas: de la salida del cafetal a la puerta de la bodega.
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  // Patio delante de la bodega (casillas de camino extra).
  yard: { x: 20, y: 19, w: 4, h: 1 },
  // Carretera del Willys: del patio de la bodega al borde del mapa (hacia el pueblo).
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // carril del segundo Willys (v3.9), por dentro del primero
  exitSign: [21.5, 24.2],
  muleSpeed: 4, // casillas por segundo
  dispatchCost: { base: 10, growth: 1.17 },
  // Carretera de la Ruta del café: sale de la bodega hacia el Pueblo (v1.5).
  routes: {
    cafe: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Café a Salento ➜' },
  },
  unlockedBy: null, // disponible desde el principio
  next: 'trapiche', // zona que se abre al completarla
};
