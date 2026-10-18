// Mapa de la Zona 6: El Pueblo. Mismas convenciones que la Zona 1 (ver zone1_finca.js).
// No tiene fuente propia: en la plaza está la Casa del café, que recibe las bolsas de la Finca, y cada
// estación espera junto a la carretera por la que le llega lo suyo de otra zona.
export const ZONE6 = {
  id: 'pueblo',
  name: 'El Pueblo',
  icon: '⛪',
  size: 26,
  seed: 97,
  theme: 'town',
  chain: ['coffee_house', 'greca', 'fonda', 'basket_shop', 'gift_wrap', 'export_dock'],
  // La plaza, con la Casa del café en una esquina.
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
  exitSign: [21.5, 24.2],
  // El Willys del Pueblo lleva lo que se vende hasta la carretera al puerto.
  exitText: 'Al puerto ➜',
  muleSpeed: 4,
  dispatchCost: { base: 400000, growth: 1.17 },
  // Seis carreteras: por la derecha llegan el café, la panela y los chocolates; por abajo, las arepas
  // y el arequipe.
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
