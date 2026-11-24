// Zone 1 Map. Coordinates in tiles (gx, gy); the gx axis goes down-right
// on screen and gy goes down-left. Paths use the tile center (+0.5).

export const ZONE1 = {
  id: 'finca',
  name: 'La Finca',
  icon: '☕',
  theme: 'coffee',
  size: 26,
  seed: 7,
  // Chain order: each station delivers its product to the next one.
  chain: ['farm', 'wetmill', 'dryer', 'huller', 'roaster', 'grinder', 'packer'],
  farm: { stationId: 'farm', x: 2, y: 2, w: 6, h: 6 },
  // Plots for subsequent stations, in chain order (3x3 tiles).
  plots: [
    { stationId: 'wetmill', x: 9, y: 5 },
    { stationId: 'dryer', x: 5, y: 8 },
    { stationId: 'huller', x: 10, y: 11 },
    { stationId: 'roaster', x: 15, y: 11 },
    { stationId: 'grinder', x: 11, y: 14 },
    { stationId: 'packer', x: 16, y: 17 },
    // Secondary branch, next to the Wet Mill.
    { stationId: 'composter', x: 12, y: 5 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  // Mule path: from the coffee grove exit to the warehouse door.
  muleRoad: [[8.5, 4.5], [8.5, 10.5], [14.5, 10.5], [14.5, 16.5], [20.5, 16.5], [20.5, 19.5], [21.4, 19.5]],
  // Yard in front of the warehouse (extra path tiles).
  yard: { x: 20, y: 19, w: 4, h: 1 },
  // Willys road: from the warehouse yard to the map edge (toward El Pueblo).
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  muleSpeed: 4, // tiles per second
  dispatchCost: { base: 10, growth: 1.17 },
  // Road for the Coffee Route: leaves the warehouse toward El Pueblo (v1.5).
  routes: {
    cafe: { road: [[24.5, 17.2], [24.5, 14.5], [25.9, 14.5]], sign: [24.2, 13.3], text: 'Café a Salento ➜' },
    // (v5.18) The compost the bonus does not need goes to fertilize the cacao trees.
    abono: { road: [[24.3, 18.5], [25.9, 18.5]], sign: [25.1, 19.6], text: 'Abono al Cacaotal ➜' },
  },
  unlockedBy: null, // available from the start
  next: 'trapiche', // zone unlocked upon completing this one
};
