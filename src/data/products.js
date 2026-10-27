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

  // Costa · La Quesera (v3.18): los mismos valores que el Hato.
  ordeno_milk: { name: 'Leche de ordeño', zone: 'quesera', value: 1000, icon: ICON.ordenoMilk, color: 0xfbfaf6 },
  cuajada: { name: 'Cuajada', zone: 'quesera', value: 2500, icon: ICON.cuajada, color: 0xf4f1e8 },
  salted_curd: { name: 'Cuajada salada', zone: 'quesera', value: 4400, icon: ICON.saltedCurd, color: 0xece6d6 },
  queso_costeno: { name: 'Queso costeño', zone: 'quesera', value: 8800, icon: ICON.quesoCosteno, color: 0xf4efe1 },
  mote_queso: { name: 'Mote de queso', zone: 'quesera', value: 22000, icon: ICON.moteQueso, color: 0xf2e3b3 },
  almuerzo_costeno: { name: 'Almuerzo costeño', zone: 'quesera', value: 100000, icon: ICON.almuerzoCosteno, color: 0xd7263d },
  bandeja_costena: { name: 'Bandeja costeña', zone: 'quesera', value: 220000, icon: ICON.bandejaCostena, color: 0xc68a4a },

  // Costa · El Sombrero (v3.19): los mismos valores que las Hormigas.
  cana_flecha: { name: 'Caña flecha', zone: 'sombrero', value: 6000, icon: ICON.canaFlecha, color: 0x6fae44 },
  cana_fiber: { name: 'Fibra de caña flecha', zone: 'sombrero', value: 12000, icon: ICON.canaFiber, color: 0xefe3c2 },
  dyed_fiber: { name: 'Fibra teñida', zone: 'sombrero', value: 30000, icon: ICON.dyedFiber, color: 0x2b2b2b },
  trenza: { name: 'Trenza de caña flecha', zone: 'sombrero', value: 70000, icon: ICON.trenza, color: 0xd9c99a },
  sombrero_vueltiao: { name: 'Sombrero vueltiao', zone: 'sombrero', value: 120000, icon: ICON.sombreroVueltiao, color: 0xefe3c2 },
  recuerdo_costa: { name: 'Recuerdo de la Costa', zone: 'sombrero', value: 1200000, icon: ICON.recuerdoCosta, color: 0xd7c39b },

  // Costa · Cartagena (v3.20): los mismos valores que Barichara.
  arroz_con_coco: { name: 'Arroz con coco', zone: 'cartagena', value: 150000, icon: ICON.arrozConCoco, color: 0xc8975a },
  cena_muralla: { name: 'Cena en la muralla', zone: 'cartagena', value: 400000, icon: ICON.cenaMuralla, color: 0xd7263d },
  noche_hotel: { name: 'Noche en la ciudad amurallada', zone: 'cartagena', value: 3200000, icon: ICON.nocheHotel, color: 0xf28c9a },
  almuerzo_bahia: { name: 'Almuerzo en la bahía', zone: 'cartagena', value: 600000, icon: ICON.almuerzoBahia, color: 0x4fc3f7 },
  lonchera_paseo: { name: 'Lonchera del paseo', zone: 'cartagena', value: 2000000, icon: ICON.loncheraPaseo, color: 0xfbfaf6 },
  paseo_islas: { name: 'Paseo a las Islas del Rosario', zone: 'cartagena', value: 24000000, icon: ICON.paseoIslas, color: 0x26c6da },

  // Boyacá · El Papal (v3.22): los mismos valores que el Arrozal.
  potato: { name: 'Papa', zone: 'papal', value: 1, icon: ICON.potato, color: 0xb98a52 },
  washed_potato: { name: 'Papa lavada', zone: 'papal', value: 3, icon: ICON.washedPotato, color: 0xe0bb7a },
  graded_potato: { name: 'Papa de primera', zone: 'papal', value: 6, icon: ICON.gradedPotato, color: 0xd4a960 },
  peeled_potato: { name: 'Papa pelada', zone: 'papal', value: 10, icon: ICON.peeledPotato, color: 0xf6d860 },
  criollas: { name: 'Papitas criollas fritas', zone: 'papal', value: 30, icon: ICON.criollas, color: 0xf2b705 },
  criollas_bag: { name: 'Bolsa de papitas', zone: 'papal', value: 45, icon: ICON.criollasBag, color: 0x2fa36b },
  criollas_box: { name: 'Caja de papitas', zone: 'papal', value: 250, icon: ICON.criollasBox, color: 0xc8a26a },

  // Boyacá · La Cervecería (v3.23): los mismos valores que el Tabacal y el Cocal.
  barley: { name: 'Cebada', zone: 'cerveceria', value: 10, icon: ICON.barley, color: 0xe6b93a },
  malt: { name: 'Malta', zone: 'cerveceria', value: 25, icon: ICON.malt, color: 0xa0612d },
  wort: { name: 'Mosto', zone: 'cerveceria', value: 60, icon: ICON.wort, color: 0xc46a2a },
  beer: { name: 'Cerveza', zone: 'cerveceria', value: 150, icon: ICON.beer, color: 0xe8a317 },
  beer_crate: { name: 'Canasta de cerveza', zone: 'cerveceria', value: 250, icon: ICON.beerCrate, color: 0xd7263d },

  // Boyacá · Ráquira (v3.24): los mismos valores que la Fiquera y la Ciénaga.
  greda: { name: 'Greda', zone: 'raquira', value: 125, icon: ICON.greda, color: 0xa8735a },
  barro: { name: 'Barro amasado', zone: 'raquira', value: 300, icon: ICON.barro, color: 0xb5653a },
  pieza_torneada: { name: 'Pieza torneada', zone: 'raquira', value: 800, icon: ICON.piezaTorneada, color: 0xc08a6a },
  matera: { name: 'Matera pintada', zone: 'raquira', value: 2000, icon: ICON.matera, color: 0xd9772e },
  olla_barro: { name: 'Olla de barro', zone: 'raquira', value: 2400, icon: ICON.ollaBarro, color: 0x4e342e },
  jarra_cerveza: { name: 'Jarra de barro con cerveza', zone: 'raquira', value: 4000, icon: ICON.jarraCerveza, color: 0xb5653a },

  // Boyacá · Paipa (v3.25): los mismos valores que el Hato y la Quesera.
  paipa_milk: { name: 'Leche fresca', zone: 'paipa', value: 1000, icon: ICON.rawMilk, color: 0xfbfaf6 },
  paipa_curd: { name: 'Cuajada de Paipa', zone: 'paipa', value: 2500, icon: ICON.cuajada, color: 0xf4f1e8 },
  molded_cheese: { name: 'Queso en molde', zone: 'paipa', value: 4400, icon: ICON.moldedCheese, color: 0xfbfaf6 },
  queso_paipa: { name: 'Queso Paipa', zone: 'paipa', value: 8800, icon: ICON.quesoPaipa, color: 0xf2c14e },
  almojabana: { name: 'Almojábanas', zone: 'paipa', value: 22000, icon: ICON.almojabana, color: 0xe8a53a },
  piquete: { name: 'Piquete boyacense', zone: 'paipa', value: 100000, icon: ICON.piquete, color: 0xc68a4a },
  canasta_amasijos: { name: 'Canasta de amasijos', zone: 'paipa', value: 220000, icon: ICON.amasijos, color: 0xb08850 },

  // Boyacá · Las Ruanas (v3.26): los mismos valores que las Hormigas y el Sombrero.
  wool: { name: 'Lana', zone: 'ruanas', value: 6000, icon: ICON.wool, color: 0xece4cf },
  clean_wool: { name: 'Lana lavada', zone: 'ruanas', value: 12000, icon: ICON.cleanWool, color: 0xffffff },
  carded_wool: { name: 'Lana cardada', zone: 'ruanas', value: 30000, icon: ICON.cardedWool, color: 0xfbfaf6 },
  wool_yarn: { name: 'Hilo de lana', zone: 'ruanas', value: 70000, icon: ICON.woolYarn, color: 0x8e44ad },
  ruana: { name: 'Ruana', zone: 'ruanas', value: 120000, icon: ICON.ruana, color: 0x6d4c41 },
  recuerdo_boyaca: { name: 'Recuerdo de Boyacá', zone: 'ruanas', value: 1200000, icon: ICON.recuerdoBoyaca, color: 0xd9772e },

  // Boyacá · Villa de Leyva (v3.27): los mismos valores que Barichara y Cartagena.
  onces: { name: 'Onces', zone: 'villa_leyva', value: 150000, icon: ICON.onces, color: 0xd7263d },
  tarde_plaza: { name: 'Tarde en la plaza', zone: 'villa_leyva', value: 400000, icon: ICON.tardePlaza, color: 0xf2b705 },
  noche_villa: { name: 'Noche en Villa de Leyva', zone: 'villa_leyva', value: 3200000, icon: ICON.nocheVilla, color: 0x2f7d4f },
  canasta_mercado: { name: 'Canasta del mercado', zone: 'villa_leyva', value: 600000, icon: ICON.canastaMercado, color: 0xb08850 },
  fiambre_paseo: { name: 'Fiambre del paseo', zone: 'villa_leyva', value: 2000000, icon: ICON.fiambrePaseo, color: 0x2e7d32 },
  excursion_fosil: { name: 'Excursión al Fósil', zone: 'villa_leyva', value: 24000000, icon: ICON.excursionFosil, color: 0xc9b48a },

  // Los Llanos · La Palma (v3.31): mismos valores que el Papal.
  palm_bunch: { name: 'Racimo de palma', zone: 'palma', value: 1, icon: ICON.palmBunch, color: 0xc0392b },
  palm_fruit: { name: 'Fruto de palma', zone: 'palma', value: 3, icon: ICON.palmFruit, color: 0xe65100 },
  cooked_fruit: { name: 'Fruto cocido', zone: 'palma', value: 6, icon: ICON.cookedFruit, color: 0xbf5a1a },
  crude_oil: { name: 'Aceite crudo', zone: 'palma', value: 10, icon: '🛢️', color: 0xa8380e },
  palm_oil: { name: 'Aceite de palma', zone: 'palma', value: 30, icon: ICON.palmOil, color: 0xf57c00 },
  oil_bottle: { name: 'Botella de aceite', zone: 'palma', value: 45, icon: ICON.oilBottle, color: 0xf9a825 },
  oil_box: { name: 'Caja de aceite', zone: 'palma', value: 250, icon: ICON.oilBox, color: 0xc8a26a },

  // Los Llanos · El Frutal (v3.32): mismos valores que la Cervecería.
  passion_fruit: { name: 'Maracuyá', zone: 'frutal', value: 10, icon: ICON.passionFruit, color: 0xf4c430 },
  passion_pulp: { name: 'Pulpa de maracuyá', zone: 'frutal', value: 25, icon: ICON.passionPulp, color: 0xf9a825 },
  past_pulp: { name: 'Pulpa pasteurizada', zone: 'frutal', value: 60, icon: ICON.pastPulp, color: 0xffb300 },
  passion_juice: { name: 'Jugo de maracuyá', zone: 'frutal', value: 150, icon: ICON.passionJuice, color: 0xffd54f },
  juice_box: { name: 'Caja de jugos', zone: 'frutal', value: 250, icon: ICON.juiceBox, color: 0x43a047 },

  // Los Llanos · La Cachamera (v3.33): mismos valores que Ráquira.
  cachama: { name: 'Cachama', zone: 'cachamera', value: 125, icon: ICON.cachama, color: 0x546e7a },
  clean_cachama: { name: 'Cachama limpia', zone: 'cachamera', value: 300, icon: ICON.cleanCachama, color: 0xb0bec5 },
  cachama_fillet: { name: 'Filete de cachama', zone: 'cachamera', value: 800, icon: ICON.cachamaFillet, color: 0xffccbc },
  smoked_cachama: { name: 'Cachama ahumada', zone: 'cachamera', value: 2000, icon: ICON.smokedCachama, color: 0x8d5524 },
  pisillo: { name: 'Pisillo de cachama', zone: 'cachamera', value: 2400, icon: ICON.pisillo, color: 0xc6893f },
  cachama_maracuya: { name: 'Cachama al maracuyá', zone: 'cachamera', value: 4000, icon: ICON.cachamaMaracuya, color: 0xf4c430 },

  // Los Llanos · El Hato llanero (v3.34): mismos valores que Paipa.
  llanero_steer: { name: 'Novillo llanero', zone: 'hato_llanero', value: 1000, icon: ICON.cebu, color: 0xeceae4 },
  ternera: { name: 'Ternera', zone: 'hato_llanero', value: 2500, icon: '🥩', color: 0xc0392b },
  ternera_adobada: { name: 'Ternera adobada', zone: 'hato_llanero', value: 4400, icon: ICON.adobada, color: 0xa93226 },
  mamona: { name: 'Mamona a la vara', zone: 'hato_llanero', value: 8800, icon: ICON.mamona, color: 0x8e3b1f },
  carne_llanera: { name: 'Carne a la llanera', zone: 'hato_llanero', value: 22000, icon: ICON.carneLlanera, color: 0x8d3b1f },
  almuerzo_llanero: { name: 'Almuerzo llanero', zone: 'hato_llanero', value: 100000, icon: ICON.almuerzoLlanero, color: 0xf4f1e8 },
  parranda_llanera: { name: 'Asado de la parranda', zone: 'hato_llanero', value: 220000, icon: ICON.parranda, color: 0xd9772e },

  // Los Llanos · La Talabartería (v3.35): mismos valores que Las Ruanas.
  raw_hide: { name: 'Cuero crudo', zone: 'talabarteria', value: 6000, icon: ICON.rawHide, color: 0xc9a37a },
  tanned_leather: { name: 'Cuero curtido', zone: 'talabarteria', value: 12000, icon: ICON.leather, color: 0x8d5524 },
  leather_pieces: { name: 'Piezas de cuero', zone: 'talabarteria', value: 30000, icon: ICON.leatherPieces, color: 0xa0522d },
  tooled_leather: { name: 'Cuero repujado', zone: 'talabarteria', value: 70000, icon: ICON.tooledLeather, color: 0x7b4a22 },
  silla_montar: { name: 'Silla de montar', zone: 'talabarteria', value: 120000, icon: ICON.saddle, color: 0x6d3b1f },
  recuerdo_llano: { name: 'Recuerdo del Llano', zone: 'talabarteria', value: 1200000, icon: ICON.recuerdoLlano, color: 0xd9772e },

  // Los Llanos · Villavicencio (v3.36): mismos valores que Villa de Leyva.
  empanadas: { name: 'Empanadas', zone: 'villavicencio', value: 150000, icon: ICON.empanadas, color: 0xf2b705 },
  tarde_parque: { name: 'Tarde en el parque', zone: 'villavicencio', value: 400000, icon: ICON.tardeParque, color: 0x43a047 },
  noche_villavo: { name: 'Noche en Villavicencio', zone: 'villavicencio', value: 3200000, icon: ICON.nocheVillavo, color: 0x1e88e5 },
  almuerzo_plaza: { name: 'Almuerzo de la plaza', zone: 'villavicencio', value: 600000, icon: ICON.almuerzoPlaza, color: 0xf4c430 },
  fiambre_viaje: { name: 'Morral del viaje', zone: 'villavicencio', value: 2000000, icon: ICON.fiambreViaje, color: 0x8d5524 },
  excursion_cano: { name: 'Excursión a Caño Cristales', zone: 'villavicencio', value: 24000000, icon: ICON.canoCristales, color: 0xd7263d },

  // Costa Pacífica · El Platanal (v3.38): mismos valores que la Palma.
  plantain_bunch: { name: 'Racimo de plátano', zone: 'platanal', value: 1, icon: ICON.plantainBunch, color: 0x5e9a3c },
  plantain_hand: { name: 'Mano de plátano', zone: 'platanal', value: 3, icon: ICON.plantainHand, color: 0x7cb342 },
  washed_plantain: { name: 'Plátano lavado', zone: 'platanal', value: 6, icon: ICON.washedPlantain, color: 0x9ccc65 },
  peeled_plantain: { name: 'Plátano pelado', zone: 'platanal', value: 10, icon: ICON.peeledPlantain, color: 0xeee0a6 },
  patacon: { name: 'Patacón', zone: 'platanal', value: 30, icon: ICON.patacon, color: 0xe0a030 },
  patacon_bag: { name: 'Bolsa de patacones', zone: 'platanal', value: 45, icon: ICON.pataconBag, color: 0xf4c430 },
  patacon_box: { name: 'Caja de patacones', zone: 'platanal', value: 250, icon: ICON.pataconBox, color: 0xc8a26a },

  // Costa Pacífica · La Azotea (v3.39): mismos valores que el Frutal.
  herbs: { name: 'Hierbas de azotea', zone: 'azotea', value: 10, icon: ICON.herbs, color: 0x4caf50 },
  washed_herbs: { name: 'Hierbas lavadas', zone: 'azotea', value: 25, icon: ICON.washedHerbs, color: 0x66bb6a },
  pounded_herbs: { name: 'Hierbas machacadas', zone: 'azotea', value: 60, icon: ICON.poundedHerbs, color: 0x558b2f },
  alino: { name: 'Aliño de azotea', zone: 'azotea', value: 150, icon: ICON.alino, color: 0x7a8a2e },
  alino_box: { name: 'Caja de aliño', zone: 'azotea', value: 250, icon: ICON.alinoBox, color: 0xc8a26a },

  // Costa Pacífica · La Bahía (v3.40): mismos valores que la Cachamera.
  pargo: { name: 'Pargo rojo', zone: 'bahia', value: 125, icon: ICON.pargo, color: 0xe53935 },
  clean_pargo: { name: 'Pargo limpio', zone: 'bahia', value: 300, icon: ICON.cleanPargo, color: 0xef9a9a },
  pargo_fillet: { name: 'Filete de pargo', zone: 'bahia', value: 800, icon: ICON.pargoFillet, color: 0xffe0d6 },
  smoked_pargo: { name: 'Pargo ahumado', zone: 'bahia', value: 2000, icon: ICON.smokedPargo, color: 0x8d5524 },
  dried_fish: { name: 'Pescado seco', zone: 'bahia', value: 2400, icon: ICON.driedFish, color: 0xd7c49e },
  tapao: { name: 'Tapao de pescado', zone: 'bahia', value: 4000, icon: ICON.tapao, color: 0xc98a24 },

  // Costa Pacífica · El Manglar (v3.41): mismos valores que el Hato llanero.
  piangua: { name: 'Piangua', zone: 'manglar', value: 1000, icon: ICON.piangua, color: 0x37302a },
  washed_piangua: { name: 'Piangua lavada', zone: 'manglar', value: 2500, icon: ICON.piangua, color: 0x4e443a },
  cooked_piangua: { name: 'Piangua cocida', zone: 'manglar', value: 4400, icon: ICON.cookedPiangua, color: 0x6d5a48 },
  piangua_meat: { name: 'Carne de piangua', zone: 'manglar', value: 8800, icon: ICON.pianguaMeat, color: 0xb5654a },
  encocado: { name: 'Piangua encocada', zone: 'manglar', value: 22000, icon: ICON.encocado, color: 0xe8d9b5 },
  arroz_piangua: { name: 'Arroz con piangua', zone: 'manglar', value: 100000, icon: ICON.arrozPiangua, color: 0xf4f1e8 },
  cazuela_mariscos: { name: 'Cazuela de mariscos', zone: 'manglar', value: 220000, icon: ICON.cazuela, color: 0xd9772e },

  // Costa Pacífica · El Werregue (v3.42): mismos valores que la Talabartería.
  werregue_leaf: { name: 'Cogollo de werregue', zone: 'werregue', value: 6000, icon: ICON.werreguePalm, color: 0x7cb342 },
  werregue_fiber: { name: 'Fibra de werregue', zone: 'werregue', value: 12000, icon: ICON.werregueFiber, color: 0xe0cf9a },
  dyed_werregue: { name: 'Fibra teñida', zone: 'werregue', value: 30000, icon: ICON.dyedWerregue, color: 0x3a2a20 },
  werregue_thread: { name: 'Hebra de werregue', zone: 'werregue', value: 70000, icon: ICON.werregueThread, color: 0xc0392b },
  werregue_jar: { name: 'Jarrón de werregue', zone: 'werregue', value: 120000, icon: ICON.werregueJar, color: 0xd9a85a },
  recuerdo_pacifico: { name: 'Recuerdo del Pacífico', zone: 'werregue', value: 1200000, icon: ICON.recuerdoPacifico, color: 0x8d3b1f },

  // Costa Pacífica · Buenaventura (v3.43): mismos valores que Villavicencio.
  marranitas: { name: 'Marranitas', zone: 'buenaventura', value: 150000, icon: ICON.marranitas, color: 0xd9a032 },
  ceviche: { name: 'Ceviche del malecón', zone: 'buenaventura', value: 400000, icon: ICON.ceviche, color: 0xff8a65 },
  noche_buenaventura: { name: 'Noche en Buenaventura', zone: 'buenaventura', value: 3200000, icon: ICON.nocheBuenaventura, color: 0x1e88e5 },
  almuerzo_galeria: { name: 'Almuerzo de la galería', zone: 'buenaventura', value: 600000, icon: ICON.almuerzoGaleria, color: 0xf4c430 },
  lonchera_lancha: { name: 'Lonchera de la lancha', zone: 'buenaventura', value: 2000000, icon: ICON.loncheraLancha, color: 0x43a047 },
  excursion_ballenas: { name: 'Salida a ver las ballenas', zone: 'buenaventura', value: 24000000, icon: ICON.ballenas, color: 0x37474f },

  // Amazonas · El Asaizal (v3.47): mismos valores que el Platanal.
  asai_bunch: { name: 'Racimo de asaí', zone: 'asaizal', value: 1, icon: ICON.asaiBunch, color: 0x4a148c },
  asai_fruit: { name: 'Frutos de asaí', zone: 'asaizal', value: 3, icon: ICON.asaiFruit, color: 0x311b4e },
  soaked_asai: { name: 'Asaí remojado', zone: 'asaizal', value: 6, icon: ICON.soakedAsai, color: 0x5e35b1 },
  asai_pulp: { name: 'Pulpa de asaí', zone: 'asaizal', value: 10, icon: ICON.asaiPulp, color: 0x6a1b9a },
  asai_shake: { name: 'Asaí batido', zone: 'asaizal', value: 30, icon: ICON.asaiShake, color: 0x7b1fa2 },
  asai_bag: { name: 'Bolsa de asaí', zone: 'asaizal', value: 45, icon: ICON.asaiBag, color: 0x8e24aa },
  asai_box: { name: 'Caja de asaí', zone: 'asaizal', value: 250, icon: ICON.asaiBox, color: 0xc8a26a },

  // Amazonas · El Ajizal (v3.48): mismos valores que la Azotea.
  aji: { name: 'Ají amazónico', zone: 'ajizal', value: 10, icon: ICON.ajiPeppers, color: 0xe53935 },
  washed_aji: { name: 'Ají lavado', zone: 'ajizal', value: 25, icon: ICON.ajiPeppers, color: 0xef5350 },
  ground_aji: { name: 'Ají molido', zone: 'ajizal', value: 60, icon: ICON.groundAji, color: 0xc62828 },
  aji_negro: { name: 'Ají negro', zone: 'ajizal', value: 150, icon: ICON.ajiNegro, color: 0x3e2723 },
  aji_box: { name: 'Caja de ají negro', zone: 'ajizal', value: 250, icon: ICON.ajiBox, color: 0xc8a26a },

  // Amazonas · El Lago (v3.49): mismos valores que la Bahía.
  pirarucu: { name: 'Pirarucú', zone: 'lago', value: 125, icon: ICON.pirarucu, color: 0x4e5b4a },
  clean_pirarucu: { name: 'Pirarucú limpio', zone: 'lago', value: 300, icon: ICON.cleanPirarucu, color: 0xfff3e6 },
  pirarucu_fillet: { name: 'Posta de pirarucú', zone: 'lago', value: 800, icon: ICON.pirarucuFillet, color: 0xffe0d6 },
  moqueado: { name: 'Pirarucú moqueado', zone: 'lago', value: 2000, icon: ICON.moqueado, color: 0x8d5524 },
  salted_pirarucu: { name: 'Pirarucú salado', zone: 'lago', value: 2400, icon: ICON.saltedPirarucu, color: 0xe0cfa4 },
  pirarucu_aji: { name: 'Pirarucú al ají negro', zone: 'lago', value: 4000, icon: ICON.pirarucuAji, color: 0xc97a32 },

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
