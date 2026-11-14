// Zone 6 Map: Salento (until v3.11, 'El Pueblo'; id remains 'pueblo'). Same
// conventions as Zone 1 (see zone1_finca.js). Styled like Salento: whitewashed houses with colorful doors
// and balconies, Calle Real, and wax palms from the Cocora Valley.
// No source of its own: in the square sits the Coffee House, receiving coffee bags from La Finca, and each
// station waits next to the road bringing its item from another zone.
export const ZONE6 = {
  id: 'pueblo',
  name: 'Salento',
  icon: '⛪',
  size: 26,
  seed: 97,
  theme: 'town',
  style: 'salento',
  chain: ['coffee_house', 'greca', 'fonda', 'basket_shop', 'gift_wrap', 'export_dock'],
  // The square, with the Coffee House in one corner.
  farm: { stationId: 'coffee_house', x: 2, y: 2, w: 6, h: 6 },
  plots: [
    { stationId: 'greca', x: 9, y: 5 },
    { stationId: 'fonda', x: 5, y: 8 },
    { stationId: 'basket_shop', x: 11, y: 12 },
    { stationId: 'gift_wrap', x: 13, y: 7 },
    { stationId: 'export_dock', x: 17, y: 13 },
  ],
  warehouse: { x: 21, y: 16, w: 3, h: 3 },
  muleRoad: [[8.5, 4.5], [8.5, 11.5], [16.5, 11.5], [16.5, 18.5], [20.5, 18.5], [20.5, 19.5], [21.4, 19.5]],
  yard: { x: 20, y: 19, w: 4, h: 1 },
  jeepRoad: [[22.7, 19.5], [20.5, 19.5], [20.5, 25.9]],
  jeepRoad2: [[22.7, 20.5], [21.5, 20.5], [21.5, 25.9]], // lane of the second Willys (v3.9), inside the first one
  exitSign: [21.5, 24.2],
  // El Pueblo's Willys carries sold goods to the road to Buenaventura.
  exitText: 'A Buenaventura ➜', // (v4.1.2: Salento has no port; coffee goes down by semi-truck)
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  // Six roads: from the right arrive coffee, panela, and chocolates; from below, arepas
  // and arequipe.
  routes: {
    cafe: { road: [[25.9, 1.5], [7.6, 1.5]], sign: [24.2, 0.4], text: '⬅ Café de la Finca' },
    panela_pueblo: { road: [[25.9, 4.5], [10.5, 4.5]], sign: [24.2, 3.4], text: '⬅ Panela del Trapiche' },
    chocolatinas: { road: [[25.9, 6.5], [16.2, 6.5]], sign: [24.6, 5.6], text: '⬅ Chocolatinas' },
    chocolate_mesa: { road: [[25.9, 8.5], [16.2, 8.5]], sign: [24.6, 7.6], text: '⬅ Chocolate del Cacaotal' },
    arepas: { road: [[6.5, 25.9], [6.5, 11.2]], sign: [5.3, 23.6], text: 'Arepas del Maizal ⬆' },
    arequipe: { road: [[12.5, 25.9], [12.5, 15.2]], sign: [11.3, 23.6], text: 'Arequipe de la Lechería ⬆' },
  },
  unlockedBy: 'maizal',
  next: null,
};
