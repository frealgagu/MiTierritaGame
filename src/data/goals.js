// Objetivos de la Zona 1 (GDD §6): una lista en orden; se ven 3 a la vez y dan monedas al cobrarlos.
// Ojo: los productos intermedios usan 'produced', no 'sold': solo se venden si se desvían, y un
// objetivo que dependa de eso puede quedar imposible y bloquear la lista.
//   sold / produced: { product, amount }   level: { target, level }   unlock: { station }
//   research: { research }   researchCount: { count }   income: { perSecond, zone }   allLevels: { level, zone }
// Cada zona tiene su lista; el último objetivo (final: true) completa la zona y abre la siguiente.
const FINCA = [
  { id: 'g01', type: 'sold', product: 'cherry', amount: 20, reward: 15 },
  { id: 'g02', type: 'level', target: 'farm', level: 5, reward: 20 },
  { id: 'g03', type: 'level', target: 'farm:transport', level: 5, reward: 25 },
  { id: 'g04', type: 'unlock', station: 'wetmill', reward: 30 },
  { id: 'g05', type: 'research', research: 'abono', reward: 60 },
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
  { id: 'g28', type: 'sold', product: 'coffee_bag', amount: 500, reward: 150000 },
  // Final de la Zona 1.
  { id: 'final', type: 'sold', product: 'coffee_bag', amount: 1000, reward: 0, final: true },
];

const TRAPICHE = [
  { id: 't01', type: 'sold', product: 'cane', amount: 50, reward: 500 },
  { id: 't02', type: 'level', target: 'canefield', level: 10, reward: 1000 },
  { id: 't03', type: 'unlock', station: 'cane_mill', reward: 2000 },
  { id: 't04', type: 'level', target: 'canefield:transport', level: 10, reward: 2000 },
  { id: 't05', type: 'unlock', station: 'furnace', reward: 5000 },
  { id: 't06', type: 'produced', product: 'melado', amount: 200, reward: 8000 },
  { id: 't07', type: 'research', research: 'motor', reward: 10000 },
  { id: 't08', type: 'unlock', station: 'molds', reward: 20000 },
  { id: 't09', type: 'level', target: 'dispatch:trapiche', level: 10, reward: 20000 },
  { id: 't10', type: 'produced', product: 'panela', amount: 500, reward: 40000 },
  { id: 't11', type: 'unlock', station: 'pulverizer', reward: 80000 },
  { id: 't12', type: 'allLevels', zone: 'trapiche', level: 25, reward: 100000 },
  { id: 't13', type: 'income', zone: 'trapiche', perSecond: 500, reward: 150000 },
  { id: 't14', type: 'sold', product: 'panela_powder', amount: 1000, reward: 300000 },
  // Final de la Zona 2.
  { id: 'tfinal', type: 'sold', product: 'panela_powder', amount: 5000, reward: 0, final: true },
];

export const GOALS_BY_ZONE = { finca: FINCA, trapiche: TRAPICHE };
export const GOALS = [...FINCA, ...TRAPICHE];
