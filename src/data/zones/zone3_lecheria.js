// Zone 3 Map: La Lechería. Same conventions as Zone 1 (see zone1_finca.js).
// First zone with branches: pasteurized milk is split between the Cream Separator, the Cheese Dairy,
// and the Arequipe Kettle. All stations sit along the same mule path.
export const ZONE3 = {
  id: 'lecheria',
  name: 'La Lechería',
  icon: '🐄',
  size: 26,
  seed: 41,
  theme: 'dairy',
  // Build order. Which feeds which comes from the recipes (see sim/chain.js).
  chain: ['pasture', 'pasteurizer', 'cheesery', 'separator', 'churn', 'arequipe_pot'],
  farm: { stationId: 'pasture', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'pasteurizer', x: 9, y: 5 },
    { stationId: 'separator', x: 9, y: 8 },
    // The Churn sits next to the Cream Separator: cream passes from one to the other.
    { stationId: 'churn', x: 12, y: 7 },
    { stationId: 'cheesery', x: 11, y: 12 },
    // The Kettle waits for panela from El Trapiche next to the route road.
    { stationId: 'arequipe_pot', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  muleSpeed: 4,
  dispatchCost: { base: 500, growth: 1.17 },
  // Road along which the Panela Route arrives, up to the Arequipe Kettle.
  // The Milk Route leaves the warehouse toward El Cacaotal; cheese and butter routes go to El Maizal.
  routes: {
    panela: { road: [[25.9, 14.5], [20.3, 14.5]], sign: [24.2, 13.3], text: '⬅ Del Trapiche' },
    leche: { road: [[24.5, 17.2], [24.5, 16.5], [25.9, 16.5]], sign: [25.3, 15.6], text: 'Al Cacaotal ➜' },
    queso: { road: [[22.5, 19.6], [22.5, 25.9]], sign: [25.5, 18.6], text: 'Queso al Maizal ⬇' },
    mantequilla: { road: [[23.5, 19.6], [23.5, 25.9]], sign: [25.5, 20.6], text: 'Mantequilla al Maizal ⬇' },
    arequipe: { road: [[24.2, 18.5], [25.9, 18.5]], sign: [25.3, 17.6], text: 'Arequipe a Salento ➜' },
  },
  unlockedBy: 'trapiche',
  next: 'cacaotal',
};
