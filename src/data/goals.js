// Objetivos de la Zona 1 (GDD §6): una lista en orden; se ven 3 a la vez y dan monedas al cobrarlos.
// Ojo: los productos intermedios usan 'produced', no 'sold': solo se venden si se desvían, y un
// objetivo que dependa de eso puede quedar imposible y bloquear la lista.
//   sold / produced: { product, amount }   level: { target, level }   unlock: { station }
//   research: { research }   researchCount: { count }   income: { perSecond, zone }   allLevels: { level, zone }
//   imported: { product, amount } (lo que llegó por una ruta entre zonas)
// Cada zona tiene su lista; el último objetivo (final: true) completa la zona y abre la siguiente.
const FINCA = [
  { id: 'g01', type: 'sold', product: 'cherry', amount: 20, reward: 15 },
  { id: 'g02', type: 'level', target: 'farm', level: 5, reward: 20 },
  { id: 'g03', type: 'level', target: 'farm:transport', level: 5, reward: 25 },
  { id: 'g04', type: 'unlock', station: 'wetmill', reward: 30 },
  { id: 'g06', type: 'produced', product: 'washed', amount: 50, reward: 80 },
  { id: 'g07', type: 'level', target: 'farm', level: 10, reward: 100 },
  { id: 'g08', type: 'unlock', station: 'dryer', reward: 150 },
  { id: 'g09', type: 'level', target: 'dispatch:finca', level: 5, reward: 150 },
  { id: 'g10', type: 'produced', product: 'parchment', amount: 200, reward: 300 },
  { id: 'g11', type: 'unlock', station: 'huller', reward: 500 },
  { id: 'g12', type: 'research', research: 'herraduras', reward: 500 },
  { id: 'g13', type: 'income', zone: 'finca', perSecond: 5, reward: 600 },
  { id: 'g14', type: 'level', target: 'dryer', level: 10, reward: 800 },
  { id: 'g14c', type: 'unlock', station: 'composter', reward: 1000 },
  { id: 'g15', type: 'unlock', station: 'roaster', reward: 1500 },
  { id: 'g16', type: 'produced', product: 'roasted', amount: 100, reward: 2000 },
  { id: 'g17', type: 'researchCount', count: 3, reward: 2500 },
  { id: 'g18', type: 'income', zone: 'finca', perSecond: 20, reward: 4000 },
  { id: 'g19', type: 'allLevels', zone: 'finca', level: 10, reward: 5000 },
  { id: 'g20', type: 'unlock', station: 'grinder', reward: 8000 },
  { id: 'g21', type: 'produced', product: 'ground', amount: 500, reward: 12000 },
  { id: 'g22', type: 'level', target: 'farm', level: 25, reward: 15000 },
  { id: 'g23', type: 'income', zone: 'finca', perSecond: 100, reward: 20000 },
  { id: 'g24', type: 'unlock', station: 'packer', reward: 40000 },
  { id: 'g25', type: 'sold', product: 'coffee_bag', amount: 50, reward: 50000 },
  { id: 'g26', type: 'research', research: 'sello', reward: 80000 },
  { id: 'g27', type: 'allLevels', zone: 'finca', level: 25, reward: 100000 },
  { id: 'g05', type: 'research', research: 'abono', reward: 50000 },
  { id: 'g28', type: 'sold', product: 'coffee_bag', amount: 500, reward: 150000 },
  // Final de la Zona 1.
  { id: 'final', type: 'sold', product: 'coffee_bag', amount: 2000, reward: 0, final: true },
];

const TRAPICHE = [
  { id: 't01', type: 'sold', product: 'cane', amount: 50, reward: 500 },
  { id: 't02', type: 'level', target: 'canefield', level: 10, reward: 1000 },
  { id: 't03', type: 'unlock', station: 'cane_mill', reward: 2000 },
  { id: 't04', type: 'level', target: 'canefield:transport', level: 10, reward: 2000 },
  { id: 't05', type: 'unlock', station: 'furnace', reward: 5000 },
  { id: 't06', type: 'produced', product: 'melado', amount: 200, reward: 8000 },
  { id: 't08', type: 'unlock', station: 'molds', reward: 20000 },
  { id: 't09', type: 'level', target: 'dispatch:trapiche', level: 10, reward: 20000 },
  { id: 't10', type: 'produced', product: 'panela', amount: 500, reward: 40000 },
  { id: 't11', type: 'unlock', station: 'pulverizer', reward: 80000 },
  { id: 't12', type: 'allLevels', zone: 'trapiche', level: 25, reward: 100000 },
  { id: 't07', type: 'research', research: 'motor', reward: 50000 },
  { id: 't13', type: 'income', zone: 'trapiche', perSecond: 500, reward: 150000 },
  { id: 't14', type: 'sold', product: 'panela_powder', amount: 1000, reward: 300000 },
  // Final de la Zona 2.
  { id: 'tfinal', type: 'sold', product: 'panela_powder', amount: 6000, reward: 0, final: true },
];

const LECHERIA = [
  { id: 'l01', type: 'sold', product: 'raw_milk', amount: 50, reward: 10000 },
  { id: 'l02', type: 'level', target: 'pasture', level: 10, reward: 20000 },
  { id: 'l03', type: 'unlock', station: 'pasteurizer', reward: 40000 },
  { id: 'l04', type: 'level', target: 'pasture:transport', level: 10, reward: 40000 },
  { id: 'l05', type: 'unlock', station: 'cheesery', reward: 80000 },
  { id: 'l06', type: 'produced', product: 'cheese', amount: 100, reward: 120000 },
  { id: 'l08', type: 'unlock', station: 'separator', reward: 250000 },
  { id: 'l09', type: 'level', target: 'dispatch:lecheria', level: 10, reward: 250000 },
  { id: 'l10', type: 'unlock', station: 'churn', reward: 500000 },
  { id: 'l11', type: 'produced', product: 'butter', amount: 200, reward: 800000 },
  { id: 'l12', type: 'unlock', station: 'arequipe_pot', reward: 1200000 },
  { id: 'l13', type: 'imported', product: 'panela_powder', amount: 200, reward: 1500000 },
  { id: 'l14', type: 'level', target: 'route:panela', level: 25, reward: 2000000 },
  { id: 'l15', type: 'allLevels', zone: 'lecheria', level: 25, reward: 3000000 },
  { id: 'l07', type: 'research', research: 'ordeno', reward: 1500000 },
  { id: 'l16', type: 'sold', product: 'arequipe', amount: 1000, reward: 5000000 },
  // Final de la Zona 3.
  { id: 'lfinal', type: 'sold', product: 'arequipe', amount: 6000, reward: 0, final: true },
];

const CACAOTAL = [
  { id: 'c01', type: 'sold', product: 'cacao_pod', amount: 50, reward: 75000 },
  { id: 'c02', type: 'level', target: 'cacao_grove', level: 10, reward: 125000 },
  { id: 'c03', type: 'unlock', station: 'fermenter', reward: 250000 },
  { id: 'c04', type: 'level', target: 'cacao_grove:transport', level: 10, reward: 250000 },
  { id: 'c05', type: 'unlock', station: 'cacao_dryer', reward: 500000 },
  { id: 'c06', type: 'produced', product: 'cacao_dry', amount: 200, reward: 750000 },
  { id: 'c08', type: 'unlock', station: 'cacao_roaster', reward: 1500000 },
  { id: 'c09', type: 'level', target: 'dispatch:cacaotal', level: 10, reward: 1500000 },
  { id: 'c10', type: 'unlock', station: 'cacao_mill', reward: 2500000 },
  { id: 'c11', type: 'produced', product: 'cacao_paste', amount: 300, reward: 3750000 },
  { id: 'c12', type: 'unlock', station: 'chocolate_table', reward: 6250000 },
  { id: 'c13', type: 'sold', product: 'table_chocolate', amount: 200, reward: 7500000 },
  { id: 'c14', type: 'unlock', station: 'chocolatier', reward: 12500000 },
  { id: 'c15', type: 'imported', product: 'milk', amount: 500, reward: 15000000 },
  { id: 'c16', type: 'allLevels', zone: 'cacaotal', level: 25, reward: 20000000 },
  { id: 'c07', type: 'research', research: 'injertos', reward: 10000000 },
  { id: 'c17', type: 'sold', product: 'milk_chocolate', amount: 1000, reward: 30000000 },
  // Final de la Zona 4.
  { id: 'cfinal', type: 'sold', product: 'milk_chocolate', amount: 4000, reward: 0, final: true },
];

const MAIZAL = [
  { id: 'm01', type: 'sold', product: 'corn_cob', amount: 50, reward: 1000000 },
  { id: 'm02', type: 'level', target: 'cornfield', level: 10, reward: 2000000 },
  { id: 'm03', type: 'unlock', station: 'sheller', reward: 4000000 },
  { id: 'm04', type: 'level', target: 'cornfield:transport', level: 10, reward: 4000000 },
  { id: 'm05', type: 'unlock', station: 'corn_huller', reward: 8000000 },
  { id: 'm06', type: 'produced', product: 'corn_hulled', amount: 200, reward: 12000000 },
  { id: 'm08', type: 'unlock', station: 'dough_mill', reward: 25000000 },
  { id: 'm09', type: 'level', target: 'dispatch:maizal', level: 10, reward: 25000000 },
  { id: 'm10', type: 'unlock', station: 'budare', reward: 50000000 },
  { id: 'm11', type: 'sold', product: 'arepa', amount: 300, reward: 80000000 },
  { id: 'm12', type: 'unlock', station: 'arepa_stand', reward: 120000000 },
  { id: 'm13', type: 'imported', product: 'cheese', amount: 200, reward: 150000000 },
  { id: 'm14', type: 'allLevels', zone: 'maizal', level: 25, reward: 200000000 },
  { id: 'm07', type: 'research', research: 'maiz_hibrido', reward: 100000000 },
  { id: 'm15', type: 'sold', product: 'cheese_arepa', amount: 1000, reward: 300000000 },
  // Final de la Zona 5.
  { id: 'mfinal', type: 'sold', product: 'cheese_arepa', amount: 6000, reward: 0, final: true },
];

const PUEBLO = [
  { id: 'p01', type: 'imported', product: 'coffee_bag', amount: 50, reward: 5000000 },
  { id: 'p02', type: 'level', target: 'coffee_house', level: 10, reward: 10000000 },
  { id: 'p03', type: 'unlock', station: 'greca', reward: 20000000 },
  { id: 'p04', type: 'level', target: 'route:cafe', level: 10, reward: 40000000 },
  { id: 'p05', type: 'produced', product: 'tinto', amount: 200, reward: 60000000 },
  { id: 'p07', type: 'unlock', station: 'fonda', reward: 150000000 },
  { id: 'p08', type: 'level', target: 'dispatch:pueblo', level: 10, reward: 200000000 },
  { id: 'p09', type: 'sold', product: 'breakfast', amount: 300, reward: 300000000 },
  { id: 'p10', type: 'unlock', station: 'basket_shop', reward: 300000000 },
  { id: 'p11', type: 'imported', product: 'arequipe', amount: 300, reward: 400000000 },
  { id: 'p12', type: 'unlock', station: 'gift_wrap', reward: 500000000 },
  { id: 'p13', type: 'imported', product: 'milk_chocolate', amount: 300, reward: 800000000 },
  { id: 'p14', type: 'unlock', station: 'export_dock', reward: 800000000 },
  { id: 'p15', type: 'allLevels', zone: 'pueblo', level: 25, reward: 1500000000 },
  { id: 'p06', type: 'research', research: 'catadores', reward: 750000000 },
  { id: 'p16', type: 'sold', product: 'container', amount: 100, reward: 2500000000 },
  // Final de la Zona 6 y del juego.
  { id: 'pfinal', type: 'sold', product: 'container', amount: 7000, reward: 0, final: true },
];

export const GOALS_BY_ZONE = { finca: FINCA, trapiche: TRAPICHE, lecheria: LECHERIA, cacaotal: CACAOTAL, maizal: MAIZAL, pueblo: PUEBLO };
export const GOALS = [...FINCA, ...TRAPICHE, ...LECHERIA, ...CACAOTAL, ...MAIZAL, ...PUEBLO];
