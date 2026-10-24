// Catálogo completo de productos del juego (las 6 zonas, ver docs/GDD.md §4b).
// Las zonas posteriores valen más (×5 en el Trapiche) porque arrancan con la economía de las anteriores.
// `value` es el precio de venta base en monedas; 0 = no se vende (subproducto o final).
// `color` se usa para los costales de las mulas y los iconos.
// `icon`: un emoji o un ícono propio (ICON, de la fuente del juego) cuando no hay emoji parecido.
import { ICON } from './icons.js';

export const ZONES = [
  { id: 'finca', name: 'La Finca', release: '0.1' },
  { id: 'trapiche', name: 'El Trapiche', release: '1.1' },
  { id: 'lecheria', name: 'La Lechería', release: '1.2' },
  { id: 'cacaotal', name: 'El Cacaotal', release: '1.3' },
  { id: 'maizal', name: 'El Maizal', release: '1.4' },
  { id: 'pueblo', name: 'Salento', release: '1.5' },
];

export const PRODUCTS = {
  // Zona 1 · La Finca
  cherry: { name: 'Cereza de café', zone: 'finca', value: 1, icon: ICON.cherry, color: 0xd7263d },
  washed: { name: 'Café lavado', zone: 'finca', value: 3, icon: ICON.washed, color: 0xe9d8a6 },
  pulp: { name: 'Pulpa', zone: 'finca', value: 0, icon: ICON.pulp, color: 0x9b2335 },
  parchment: { name: 'Café pergamino', zone: 'finca', value: 6, icon: ICON.parchment, color: 0xcfae7a },
  green: { name: 'Café verde', zone: 'finca', value: 10, icon: ICON.greenCoffee, color: 0x8fae5d },
  roasted: { name: 'Café tostado', zone: 'finca', value: 30, icon: ICON.roastedCoffee, color: 0x6b3e26 },
  ground: { name: 'Café molido', zone: 'finca', value: 45, icon: ICON.groundCoffee, color: 0x4a2a1a },
  coffee_bag: { name: 'Bolsa de café', zone: 'finca', value: 250, icon: ICON.coffeeBag, color: 0xc8643b },
  compost: { name: 'Compost', zone: 'finca', value: 0, icon: ICON.compost, color: 0x5b4636 },

  // Zona 2 · El Trapiche
  cane: { name: 'Caña', zone: 'trapiche', value: 10, icon: '🎋', color: 0x9cc65b },
  guarapo: { name: 'Guarapo', zone: 'trapiche', value: 25, icon: ICON.guarapo, color: 0xd8e2a0 },
  bagasse: { name: 'Bagazo', zone: 'trapiche', value: 0, icon: ICON.bagasse, color: 0xd9c38c },
  melado: { name: 'Melado', zone: 'trapiche', value: 60, icon: '🍯', color: 0xc98a2b },
  panela: { name: 'Panela', zone: 'trapiche', value: 150, icon: ICON.panela, color: 0xb5651d },
  panela_powder: { name: 'Panela pulverizada', zone: 'trapiche', value: 250, icon: ICON.panelaPowder, color: 0xe8b23a },

  // Zona 3 · La Lechería (×25 respecto al primer borrador, igual que el Trapiche ×5)
  raw_milk: { name: 'Leche cruda', zone: 'lecheria', value: 125, icon: ICON.rawMilk, color: 0xf4f1e8 },
  milk: { name: 'Leche pasteurizada', zone: 'lecheria', value: 300, icon: ICON.milk, color: 0xffffff },
  cream: { name: 'Crema de leche', zone: 'lecheria', value: 800, icon: ICON.cream, color: 0xfff3d6 },
  butter: { name: 'Mantequilla', zone: 'lecheria', value: 2000, icon: '🧈', color: 0xf6d860 },
  cheese: { name: 'Queso campesino', zone: 'lecheria', value: 2400, icon: ICON.cheese, color: 0xf7f2e2 },
  arequipe: { name: 'Arequipe', zone: 'lecheria', value: 4000, icon: '🍮', color: 0xa0522d },

  // Zona 4 · El Cacaotal (×125 respecto al primer borrador)
  cacao_pod: { name: 'Mazorca de cacao', zone: 'cacaotal', value: 1000, icon: ICON.cacaoPod, color: 0xd98e04 },
  cacao_fermented: { name: 'Cacao fermentado', zone: 'cacaotal', value: 2500, icon: '🫘', color: 0xa86b3c },
  cacao_dry: { name: 'Cacao seco', zone: 'cacaotal', value: 4400, icon: ICON.cacaoDry, color: 0x8a5a33 },
  cacao_roasted: { name: 'Cacao tostado', zone: 'cacaotal', value: 8800, icon: ICON.cacaoRoasted, color: 0x5e3a1f },
  cacao_paste: { name: 'Pasta de cacao', zone: 'cacaotal', value: 22000, icon: ICON.cacaoPaste, color: 0x4b2e1a },
  table_chocolate: { name: 'Chocolate de mesa', zone: 'cacaotal', value: 100000, icon: '🍫', color: 0x5a3220 },
  milk_chocolate: { name: 'Chocolatina con leche', zone: 'cacaotal', value: 220000, icon: ICON.milkChocolate, color: 0x8b5a3c },

  // Zona 5 · El Maizal (×1.000 respecto al primer borrador)
  corn_cob: { name: 'Mazorca de maíz', zone: 'maizal', value: 6000, icon: '🌽', color: 0xf2c94c },
  corn_kernels: { name: 'Maíz desgranado', zone: 'maizal', value: 12000, icon: ICON.cornKernels, color: 0xf5d76e },
  corn_hulled: { name: 'Maíz pilado', zone: 'maizal', value: 30000, icon: ICON.cornHulled, color: 0xf7ecc8 },
  corn_dough: { name: 'Masa de maíz', zone: 'maizal', value: 70000, icon: ICON.cornDough, color: 0xf0e0a8 },
  arepa: { name: 'Arepa', zone: 'maizal', value: 120000, icon: ICON.arepa, color: 0xe8c77a },
  cheese_arepa: { name: 'Arepas de queso', zone: 'maizal', value: 1200000, icon: ICON.cheeseArepa, color: 0xf0d58c },

  // Zona 6 · El Pueblo
  cafe_origen: { name: 'Café de origen', zone: 'pueblo', value: 150000, icon: ICON.cafeOrigen, color: 0x6b3e26 },
  tinto: { name: 'Tinto', zone: 'pueblo', value: 400000, icon: '☕', color: 0x3b2314 },
  breakfast: { name: 'Desayuno campesino', zone: 'pueblo', value: 3200000, icon: ICON.breakfast, color: 0xf2c94c },
  basket: { name: 'Canasta de fique', zone: 'pueblo', value: 600000, icon: '🧺', color: 0xc9a66b },
  gift_basket: { name: 'Canasta de regalo', zone: 'pueblo', value: 2000000, icon: '🎁', color: 0xd7263d },
  container: { name: 'Contenedor de exportación', zone: 'pueblo', value: 24000000, icon: ICON.container, color: 0x2e6fd1 },

  // Santander · La Guayabera (v3.0): mismos valores que la Finca.
  guava: { name: 'Guayaba', zone: 'guayabera', value: 1, icon: ICON.guava, color: 0xcddc39 },
  guava_pulp: { name: 'Pulpa de guayaba', zone: 'guayabera', value: 3, icon: ICON.guavaPulp, color: 0xf06292 },
  guava_jelly: { name: 'Melado de guayaba', zone: 'guayabera', value: 6, icon: ICON.guavaJelly, color: 0xc2185b },
  bocadillo_block: { name: 'Bloque de bocadillo', zone: 'guayabera', value: 10, icon: ICON.bocadilloBlock, color: 0x880e4f },
  bocadillo: { name: 'Bocadillo', zone: 'guayabera', value: 30, icon: ICON.bocadillo, color: 0xd81b60 },
  bocadillo_bijao: { name: 'Bocadillo veleño', zone: 'guayabera', value: 45, icon: ICON.bocadilloBijao, color: 0x8d9f3c },
  bocadillo_crate: { name: 'Caja de bocadillos', zone: 'guayabera', value: 250, icon: ICON.bocadilloCrate, color: 0xd7a86e },

  // Costa · El Arrozal (v3.15): los mismos valores que la Finca y la Guayabera.
  paddy: { name: 'Arroz en cáscara', zone: 'arrozal', value: 1, icon: ICON.paddy, color: 0xe0b23c },
  dry_paddy: { name: 'Arroz seco', zone: 'arrozal', value: 3, icon: ICON.dryPaddy, color: 0xf2d36b },
  brown_rice: { name: 'Arroz integral', zone: 'arrozal', value: 6, icon: ICON.brownRice, color: 0xd9b98a },
  white_rice: { name: 'Arroz blanco', zone: 'arrozal', value: 10, icon: ICON.whiteRice, color: 0xf4f1e8 },
  premium_rice: { name: 'Arroz excelso', zone: 'arrozal', value: 30, icon: ICON.premiumRice, color: 0xfffdf5 },
  rice_bag: { name: 'Bolsa de arroz', zone: 'arrozal', value: 45, icon: ICON.riceBag, color: 0xd7263d },
  rice_sack: { name: 'Bulto de arroz', zone: 'arrozal', value: 250, icon: ICON.riceSack, color: 0x2e6fd1 },

  // Costa · El Cocal (v3.16): los mismos valores que el Tabacal.
  coconut: { name: 'Coco', zone: 'cocal', value: 10, icon: ICON.coconut, color: 0x7cb342 },
  peeled_coconut: { name: 'Coco pelado', zone: 'cocal', value: 25, icon: ICON.peeledCoconut, color: 0x8d6e4a },
  grated_coconut: { name: 'Coco rallado', zone: 'cocal', value: 60, icon: ICON.gratedCoconut, color: 0xfbfaf6 },
  coconut_milk: { name: 'Leche de coco', zone: 'cocal', value: 150, icon: ICON.coconutMilk, color: 0xf4f1e8 },
  cocada: { name: 'Cocada', zone: 'cocal', value: 250, icon: ICON.cocada, color: 0xa0612d },

  // Costa · La Ciénaga (v3.17): los mismos valores que la Fiquera.
  fish: { name: 'Bocachico', zone: 'cienaga', value: 125, icon: ICON.fish, color: 0x90a4ae },
  clean_fish: { name: 'Pescado limpio', zone: 'cienaga', value: 300, icon: ICON.cleanFish, color: 0xb0bec5 },
  fish_fillet: { name: 'Filete de pescado', zone: 'cienaga', value: 800, icon: ICON.fishFillet, color: 0xffe0d6 },
  fried_fish: { name: 'Pescado frito con patacón', zone: 'cienaga', value: 2000, icon: ICON.friedFish, color: 0xd4892a },
  salted_fish: { name: 'Pescado salado', zone: 'cienaga', value: 2400, icon: ICON.saltedFish, color: 0xd7c39b },
  fish_in_coconut: { name: 'Pescado en coco', zone: 'cienaga', value: 4000, icon: ICON.fishInCoconut, color: 0xb5562e },

  // Santander · El Tabacal (v3.1): mismos valores que el Trapiche.
  tobacco_leaf: { name: 'Hoja de tabaco', zone: 'tabacal', value: 10, icon: ICON.tobaccoLeaf, color: 0x7cb342 },
  cured_leaf: { name: 'Hoja curada', zone: 'tabacal', value: 25, icon: ICON.curedLeaf, color: 0xc8913b },
  stripped_leaf: { name: 'Hoja despalillada', zone: 'tabacal', value: 60, icon: ICON.strippedLeaf, color: 0xb7792c },
  fermented_tobacco: { name: 'Tabaco fermentado', zone: 'tabacal', value: 150, icon: ICON.fermentedTobacco, color: 0x5d3a1a },
  cigar: { name: 'Tabaco torcido', zone: 'tabacal', value: 250, icon: ICON.cigar, color: 0x7b4a22 },

  // Santander · La Fiquera (v3.2): mismos valores que la Lechería.
  fique_leaf: { name: 'Penca de fique', zone: 'fiquera', value: 125, icon: ICON.fiqueLeaf, color: 0x6f9a7a },
  fique_fiber: { name: 'Fibra de fique', zone: 'fiquera', value: 300, icon: ICON.fiqueFiber, color: 0xe8d9a8 },
  fique_yarn: { name: 'Hilo de fique', zone: 'fiquera', value: 800, icon: ICON.fiqueYarn, color: 0xd9c08c },
  alpargatas: { name: 'Alpargatas', zone: 'fiquera', value: 2000, icon: ICON.alpargatas, color: 0x2e4fa8 },
  fique_sack: { name: 'Costal de fique', zone: 'fiquera', value: 2400, icon: ICON.fiqueSack, color: 0xc2a46c },
  tobacco_bale: { name: 'Tercio de tabaco', zone: 'fiquera', value: 4000, icon: ICON.tobaccoBale, color: 0xb0905a },

  // Santander · El Hato (v3.3): mismos valores que el Cacaotal.
  steer: { name: 'Novillo', zone: 'hato', value: 1000, icon: '🐂', color: 0xb5774a },
  beef: { name: 'Carne de res', zone: 'hato', value: 2500, icon: '🥩', color: 0xc0392b },
  salted_beef: { name: 'Carne adobada', zone: 'hato', value: 4400, icon: ICON.saltedBeef, color: 0xa93226 },
  carne_oreada: { name: 'Carne oreada', zone: 'hato', value: 8800, icon: ICON.carneOreada, color: 0x8e2c1f },
  grilled_oreada: { name: 'Carne oreada asada', zone: 'hato', value: 22000, icon: ICON.grilledOreada, color: 0x8d3b1f },
  almuerzo: { name: 'Almuerzo santandereano', zone: 'hato', value: 100000, icon: ICON.almuerzo, color: 0xf4f1e8 },
  fiambre: { name: 'Fiambre', zone: 'hato', value: 220000, icon: ICON.fiambre, color: 0x6b8e23 },

  // Santander · Las Hormigas (v3.4): mismos valores que el Maizal.
  ant_queen: { name: 'Hormiga culona', zone: 'hormigas', value: 6000, icon: ICON.antQueen, color: 0x8e3b1f },
  ant_clean: { name: 'Hormiga limpia', zone: 'hormigas', value: 12000, icon: ICON.antClean, color: 0x9c4a2a },
  ant_brine: { name: 'Hormigas en salmuera', zone: 'hormigas', value: 30000, icon: ICON.antBrine, color: 0xcfe8f0 },
  toasted_ants: { name: 'Hormigas tostadas', zone: 'hormigas', value: 70000, icon: ICON.toastedAnts, color: 0x6b2e14 },
  ant_cone: { name: 'Cucurucho de hormigas', zone: 'hormigas', value: 120000, icon: ICON.antCone, color: 0xf4efe6 },
  recuerdo: { name: 'Recuerdo de Santander', zone: 'hormigas', value: 1200000, icon: ICON.recuerdo, color: 0xd9c08c },

  // Santander · Barichara (v3.5): mismos valores que el Pueblo.
  dulces_tipicos: { name: 'Dulces típicos', zone: 'barichara', value: 150000, icon: ICON.dulcesTipicos, color: 0xd81b60 },
  sobremesa: { name: 'Sobremesa', zone: 'barichara', value: 400000, icon: ICON.sobremesa, color: 0x3b2314 },
  estadia: { name: 'Estadía en la posada', zone: 'barichara', value: 3200000, icon: ICON.estadia, color: 0xc9a227 },
  caja_surtida: { name: 'Caja surtida', zone: 'barichara', value: 600000, icon: ICON.cajaSurtida, color: 0xe8dcc0 },
  canasta_caminante: { name: 'Canasta del caminante', zone: 'barichara', value: 2000000, icon: ICON.canastaCaminante, color: 0xc8a26b },
  excursion: { name: 'Excursión a Guane', zone: 'barichara', value: 24000000, icon: ICON.excursion, color: 0xa1672c },
};
