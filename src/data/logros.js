// Logros generales (v2.3, GDD §10.2): suman entre partidas (no se pierden al reiniciar) y ninguno es de
// velocidad (con cada reinicio todo va más rápido). Cada uno tiene niveles; cada nivel da Renombre ⭐.
//   metric: qué se cuenta (ver sim/logros.js)   tiers: cuánto pide cada nivel   reward: ⭐ por nivel
import { ICON } from './icons.js';
import { RESEARCH } from './research.js';

export const LOGROS = [
  { id: 'bolsas', icon: '☕', name: 'Café de exportación', text: 'Vende {n} bolsas de café', metric: 'sold:coffee_bag', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'panela', icon: '🎋', name: 'Panelero', text: 'Produce {n} de panela pulverizada', metric: 'produced:panela_powder', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'queso', icon: '🧀', name: 'Quesero', text: 'Produce {n} quesos campesinos', metric: 'produced:cheese', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'chocolate', icon: '🍫', name: 'Chocolatero', text: 'Produce {n} de chocolate de mesa', metric: 'produced:table_chocolate', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'arepas', icon: ICON.cheeseArepa, name: 'Arepera', text: 'Produce {n} arepas de queso', metric: 'produced:cheese_arepa', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'contenedores', icon: '🚢', name: 'Al puerto', text: 'Exporta {n} contenedores', metric: 'sold:container', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'monedas', icon: '💰', name: 'Patrón', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'anos', icon: '📅', name: 'Toda una vida', text: 'Vive {n} años de juego', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'pueblo', icon: '⛪', name: 'Primer gran pedido', text: 'Completa el Pueblo {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'maestro', icon: '🏅', name: 'Maestro cafetero', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, RESEARCH.length], reward: [1, 2, 4] },
];

export const LOGROS_BY_ID = Object.fromEntries(LOGROS.map((l) => [l.id, l]));
