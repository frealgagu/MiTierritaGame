// Special zone · San Andrés (v5.4): the reward region, a single zone the size of any other. Its eight stations
// form one linear chain, the tour a visitor takes around the island: arrival at the airport, Spratt Bight
// beach, the boats over the Sea of Seven Colors, Johnny Cay, rondón in San Luis on the east coast, the Hoyo
// Soplador at the southern tip, snorkeling at La Piscinita on the west coast, and La Loma in the middle of the
// island, which closes the tour. The mule road runs around the island like the Circunvalar and then climbs to
// La Loma; the warehouse sits beside it, inland.
// (Its buildings borrow Cartagena's town look, with the arrival plaza as its source, until their own art arrives.)
import { ICON } from '../icons.js';

export const ZONE56 = {
  id: 'sanandres',
  region: 'sanandres',
  name: 'San Andrés',
  icon: ICON.paseoIslas,
  theme: 'town',
  style: 'cartagena',
  size: 26,
  seed: 241,
  // Open sea on every side (render/Terrain.js: markIsland): rounded corners, white beaches, and the coral shore on
  // the west, where La Piscinita is.
  island: { corner: 5, rocky: 'west' },
  chain: ['aeropuerto_sai', 'carpas_spratt', 'lanchas_siete_colores', 'paseo_johnny_cay', 'rondon_san_luis', 'hoyo_soplador', 'snorkel_piscinita', 'mirador_la_loma'],
  farm: { stationId: 'aeropuerto_sai', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    // North shore: the beach and the boats.
    { stationId: 'carpas_spratt', x: 11, y: 1 },
    { stationId: 'lanchas_siete_colores', x: 17, y: 1 },
    // East shore: Johnny Cay offshore, then San Luis.
    { stationId: 'paseo_johnny_cay', x: 23, y: 6 },
    { stationId: 'rondon_san_luis', x: 23, y: 17 },
    // Southern tip, then the west shore.
    { stationId: 'hoyo_soplador', x: 13, y: 22 },
    { stationId: 'snorkel_piscinita', x: 1, y: 13 },
    // The middle of the island.
    { stationId: 'mirador_la_loma', x: 10, y: 11 },
  ],
  warehouse: { x: 17, y: 11, w: 3, h: 3 },
  // Around the island (north, east, south, and west shores), then inland to La Loma and the warehouse.
  muleRoad: [[8.5, 4.5], [21.5, 4.5], [21.5, 20.5], [4.5, 20.5], [4.5, 10.5], [16.5, 10.5], [16.5, 14.5], [17.4, 14.5]],
  yard: { x: 17, y: 14, w: 4, h: 1 },
  // The Willys leave eastward, toward the town and the pier.
  jeepRoad: [[18.7, 14.5], [25.9, 14.5]],
  jeepRoad2: [[18.7, 15.5], [25.9, 15.5]], // lane of the second Willys, beside the first one
  exitSign: [24.2, 13.4],
  exitText: 'Al muelle ➜',
  muleSpeed: 4,
  dispatchCost: { base: 1, growth: 1.15 },
  unlockedBy: null, // the first and only zone of its region
  next: null,
};
