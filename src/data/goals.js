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
  { id: 'p06', type: 'research', research: 'catadores', reward: 1500000000 },
  { id: 'p16', type: 'sold', product: 'container', amount: 100, reward: 2500000000 },
  // Final de la Zona 6 y del juego.
  { id: 'pfinal', type: 'sold', product: 'container', amount: 7000, reward: 0, final: true },
];

// Santander · La Guayabera (v3.0): la misma lista que la Finca, con el bocadillo.
const GUAYABERA = [
  { id: 's01', type: 'sold', product: 'guava', amount: 20, reward: 15 },
  { id: 's02', type: 'level', target: 'guava_grove', level: 5, reward: 20 },
  { id: 's03', type: 'level', target: 'guava_grove:transport', level: 5, reward: 25 },
  { id: 's04', type: 'unlock', station: 'guava_pulper', reward: 30 },
  { id: 's06', type: 'produced', product: 'guava_pulp', amount: 50, reward: 80 },
  { id: 's07', type: 'level', target: 'guava_grove', level: 10, reward: 100 },
  { id: 's08', type: 'unlock', station: 'guava_pot', reward: 150 },
  { id: 's09', type: 'level', target: 'dispatch:guayabera', level: 5, reward: 150 },
  { id: 's10', type: 'produced', product: 'guava_jelly', amount: 200, reward: 300 },
  { id: 's11', type: 'unlock', station: 'guava_molds', reward: 500 },
  { id: 's12', type: 'research', research: 'herraduras_s', reward: 500 },
  { id: 's13', type: 'income', zone: 'guayabera', perSecond: 5, reward: 600 },
  { id: 's14', type: 'level', target: 'guava_pot', level: 10, reward: 800 },
  { id: 's15', type: 'unlock', station: 'bocadillo_cutter', reward: 1500 },
  { id: 's16', type: 'produced', product: 'bocadillo', amount: 100, reward: 2000 },
  { id: 's17', type: 'researchCount', count: 3, reward: 2500 },
  { id: 's18', type: 'income', zone: 'guayabera', perSecond: 20, reward: 4000 },
  { id: 's19', type: 'allLevels', zone: 'guayabera', level: 10, reward: 5000 },
  { id: 's20', type: 'unlock', station: 'bijao_wrapper', reward: 8000 },
  { id: 's21', type: 'produced', product: 'bocadillo_bijao', amount: 500, reward: 12000 },
  { id: 's22', type: 'level', target: 'guava_grove', level: 25, reward: 15000 },
  { id: 's23', type: 'income', zone: 'guayabera', perSecond: 100, reward: 20000 },
  { id: 's24', type: 'unlock', station: 'crate_packer', reward: 40000 },
  { id: 's25', type: 'sold', product: 'bocadillo_crate', amount: 50, reward: 50000 },
  { id: 's26', type: 'research', research: 'sello_s', reward: 80000 },
  { id: 's27', type: 'allLevels', zone: 'guayabera', level: 25, reward: 100000 },
  { id: 's05', type: 'research', research: 'injerto_guayabo', reward: 50000 },
  { id: 's28', type: 'sold', product: 'bocadillo_crate', amount: 500, reward: 150000 },
  { id: 's_final', type: 'sold', product: 'bocadillo_crate', amount: 2000, reward: 0, final: true },
];

// Santander · El Tabacal (v3.1): la misma lista que el Trapiche, con el tabaco.
const TABACAL = [
  { id: 'k01', type: 'sold', product: 'tobacco_leaf', amount: 50, reward: 500 },
  { id: 'k02', type: 'level', target: 'tobacco_field', level: 10, reward: 1000 },
  { id: 'k03', type: 'unlock', station: 'caney', reward: 2000 },
  { id: 'k04', type: 'level', target: 'tobacco_field:transport', level: 10, reward: 2000 },
  { id: 'k05', type: 'unlock', station: 'stripper', reward: 5000 },
  { id: 'k06', type: 'produced', product: 'stripped_leaf', amount: 200, reward: 8000 },
  { id: 'k08', type: 'unlock', station: 'tobacco_piles', reward: 20000 },
  { id: 'k09', type: 'level', target: 'dispatch:tabacal', level: 10, reward: 20000 },
  { id: 'k10', type: 'produced', product: 'fermented_tobacco', amount: 500, reward: 40000 },
  { id: 'k11', type: 'unlock', station: 'cigar_roller', reward: 80000 },
  { id: 'k12', type: 'allLevels', zone: 'tabacal', level: 25, reward: 100000 },
  { id: 'k07', type: 'research', research: 'caney_grande', reward: 50000 },
  { id: 'k13', type: 'income', zone: 'tabacal', perSecond: 500, reward: 150000 },
  { id: 'k14', type: 'sold', product: 'cigar', amount: 1000, reward: 300000 },
  { id: 'k_final', type: 'sold', product: 'cigar', amount: 6000, reward: 0, final: true },
];

// Santander · La Fiquera (v3.2): la misma lista que la Lechería.
const FIQUERA = [
  { id: 'q01', type: 'sold', product: 'fique_leaf', amount: 50, reward: 10000 },
  { id: 'q02', type: 'level', target: 'fique_field', level: 10, reward: 20000 },
  { id: 'q03', type: 'unlock', station: 'decorticator', reward: 40000 },
  { id: 'q04', type: 'level', target: 'fique_field:transport', level: 10, reward: 40000 },
  { id: 'q05', type: 'unlock', station: 'sack_loom', reward: 80000 },
  { id: 'q06', type: 'produced', product: 'fique_sack', amount: 100, reward: 120000 },
  { id: 'q08', type: 'unlock', station: 'spinner', reward: 250000 },
  { id: 'q09', type: 'level', target: 'dispatch:fiquera', level: 10, reward: 250000 },
  { id: 'q10', type: 'unlock', station: 'alpargata_shop', reward: 500000 },
  { id: 'q11', type: 'produced', product: 'alpargatas', amount: 200, reward: 800000 },
  { id: 'q12', type: 'unlock', station: 'tercio_packer', reward: 1200000 },
  { id: 'q13', type: 'imported', product: 'fermented_tobacco', amount: 200, reward: 1500000 },
  { id: 'q14', type: 'level', target: 'route:tabaco', level: 25, reward: 2000000 },
  { id: 'q15', type: 'allLevels', zone: 'fiquera', level: 25, reward: 3000000 },
  { id: 'q07', type: 'research', research: 'abono_fique', reward: 1500000 },
  { id: 'q16', type: 'sold', product: 'tobacco_bale', amount: 1000, reward: 5000000 },
  { id: 'q_final', type: 'sold', product: 'tobacco_bale', amount: 6000, reward: 0, final: true },
];

// Santander · El Hato (v3.3): la misma lista que el Cacaotal.
const HATO = [
  { id: 'h01', type: 'sold', product: 'steer', amount: 50, reward: 75000 },
  { id: 'h02', type: 'level', target: 'cattle_ranch', level: 10, reward: 125000 },
  { id: 'h03', type: 'unlock', station: 'butcher', reward: 250000 },
  { id: 'h04', type: 'level', target: 'cattle_ranch:transport', level: 10, reward: 250000 },
  { id: 'h05', type: 'unlock', station: 'salter', reward: 500000 },
  { id: 'h06', type: 'produced', product: 'salted_beef', amount: 200, reward: 750000 },
  { id: 'h08', type: 'unlock', station: 'airing_rack', reward: 1500000 },
  { id: 'h09', type: 'level', target: 'dispatch:hato', level: 10, reward: 1500000 },
  { id: 'h10', type: 'unlock', station: 'grill', reward: 2500000 },
  { id: 'h11', type: 'produced', product: 'grilled_oreada', amount: 300, reward: 3750000 },
  { id: 'h12', type: 'unlock', station: 'lunch_table', reward: 6250000 },
  { id: 'h13', type: 'sold', product: 'almuerzo', amount: 200, reward: 7500000 },
  { id: 'h14', type: 'unlock', station: 'fiambre_maker', reward: 12500000 },
  { id: 'h15', type: 'imported', product: 'fique_fiber', amount: 500, reward: 15000000 },
  { id: 'h16', type: 'allLevels', zone: 'hato', level: 25, reward: 20000000 },
  { id: 'h07', type: 'research', research: 'pasto_mejorado', reward: 10000000 },
  { id: 'h17', type: 'sold', product: 'fiambre', amount: 1000, reward: 30000000 },
  { id: 'h_final', type: 'sold', product: 'fiambre', amount: 4000, reward: 0, final: true },
];

// Santander · Las Hormigas (v3.4): la misma lista que el Maizal.
const HORMIGAS = [
  { id: 'a01', type: 'sold', product: 'ant_queen', amount: 50, reward: 1000000 },
  { id: 'a02', type: 'level', target: 'anthill', level: 10, reward: 2000000 },
  { id: 'a03', type: 'unlock', station: 'ant_cleaner', reward: 4000000 },
  { id: 'a04', type: 'level', target: 'anthill:transport', level: 10, reward: 4000000 },
  { id: 'a05', type: 'unlock', station: 'brine_pot', reward: 8000000 },
  { id: 'a06', type: 'produced', product: 'ant_brine', amount: 200, reward: 12000000 },
  { id: 'a08', type: 'unlock', station: 'ant_toaster', reward: 25000000 },
  { id: 'a09', type: 'level', target: 'dispatch:hormigas', level: 10, reward: 25000000 },
  { id: 'a10', type: 'unlock', station: 'cone_table', reward: 50000000 },
  { id: 'a11', type: 'sold', product: 'ant_cone', amount: 300, reward: 80000000 },
  { id: 'a12', type: 'unlock', station: 'souvenir_shop', reward: 120000000 },
  { id: 'a13', type: 'imported', product: 'fique_sack', amount: 200, reward: 150000000 },
  { id: 'a14', type: 'allLevels', zone: 'hormigas', level: 25, reward: 200000000 },
  { id: 'a07', type: 'research', research: 'reinas_grandes', reward: 100000000 },
  { id: 'a15', type: 'sold', product: 'recuerdo', amount: 1000, reward: 300000000 },
  { id: 'a_final', type: 'sold', product: 'recuerdo', amount: 6000, reward: 0, final: true },
];

export const GOALS_BY_ZONE = { finca: FINCA, trapiche: TRAPICHE, lecheria: LECHERIA, cacaotal: CACAOTAL, maizal: MAIZAL, pueblo: PUEBLO, guayabera: GUAYABERA, tabacal: TABACAL, fiquera: FIQUERA, hato: HATO, hormigas: HORMIGAS };
export const GOALS = [...FINCA, ...TRAPICHE, ...LECHERIA, ...CACAOTAL, ...MAIZAL, ...PUEBLO, ...GUAYABERA, ...TABACAL, ...FIQUERA, ...HATO, ...HORMIGAS];
