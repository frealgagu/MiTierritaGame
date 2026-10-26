// Logros generales (v2.3, GDD §10.2): suman entre partidas (no se pierden al reiniciar) y ninguno es de
// velocidad (con cada reinicio todo va más rápido). Cada uno tiene niveles; cada nivel da Renombre ⭐.
// (v3.10: cada región tiene sus logros, con lo suyo: sus productos, sus eventos, su álbum, sus
// investigaciones. El Renombre que dan es el mismo. Las medallas cuentan las de los eventos de la región.)
//   metric: qué se cuenta (ver sim/logros.js)   tiers: cuánto pide cada nivel   reward: ⭐ por nivel
import { ICON } from './icons.js';
import { RESEARCH } from './research.js';
import { REGION_OF_ZONE } from './regions.js';

const researchOf = (region) => RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === region).length;

const CAFETERO = [
  { id: 'bolsas', icon: '☕', name: 'Café de exportación', text: 'Vende {n} bolsas de café', metric: 'sold:coffee_bag', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'panela', icon: '🎋', name: 'Panelero', text: 'Produce {n} de panela pulverizada', metric: 'produced:panela_powder', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'queso', icon: '🧀', name: 'Quesero', text: 'Produce {n} quesos campesinos', metric: 'produced:cheese', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'chocolate', icon: '🍫', name: 'Chocolatero', text: 'Produce {n} de chocolate de mesa', metric: 'produced:table_chocolate', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'arepas', icon: ICON.cheeseArepa, name: 'Arepera', text: 'Produce {n} arepas de queso', metric: 'produced:cheese_arepa', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'contenedores', icon: '🚢', name: 'Al puerto', text: 'Exporta {n} contenedores', metric: 'sold:container', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'monedas', icon: '💰', name: 'Patrón', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'anos', icon: '📅', name: 'Toda una vida', text: 'Vive {n} años de juego', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'pueblo', icon: '⛪', name: 'Primer gran pedido', text: 'Completa Salento {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'maestro', icon: '🏅', name: 'Maestro cafetero', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('cafetero')], reward: [1, 2, 4] },
];

// Los de Santander (v3.10): sus productos y lo general de la región.
const SANTANDER = [
  { id: 's_bocadillo', icon: ICON.bocadilloCrate, name: 'Bocadillo veleño', text: 'Vende {n} cajas de bocadillo', metric: 'sold:bocadillo_crate', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 's_tabaco', icon: ICON.cigar, name: 'Torcedor', text: 'Tuerce {n} tabacos', metric: 'produced:cigar', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 's_alpargatas', icon: ICON.alpargatas, name: 'Alpargatero', text: 'Teje {n} pares de alpargatas', metric: 'produced:alpargatas', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 's_fiambre', icon: ICON.fiambre, name: 'Para el camino', text: 'Prepara {n} fiambres', metric: 'produced:fiambre', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 's_recuerdo', icon: ICON.recuerdo, name: 'Recuerdos de Santander', text: 'Arma {n} recuerdos', metric: 'produced:recuerdo', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 's_excursion', icon: ICON.excursion, name: 'Por el Camino Real', text: 'Vende {n} excursiones a Guane', metric: 'sold:excursion', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 's_monedas', icon: '💰', name: 'Patrón santandereano', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 's_anos', icon: '📅', name: 'Echando raíces', text: 'Vive {n} años de juego en Santander', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 's_barichara', icon: '⛪', name: 'Hasta Barichara', text: 'Completa Barichara {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 's_maestro', icon: '🏅', name: 'Maestro santandereano', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 's_medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 's_todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 's_oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 's_album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 's_ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('santander')], reward: [1, 2, 4] },
];

// Los de la Costa (v3.21).
const COSTA = [
  { id: 'c_arroz', icon: ICON.riceSack, name: 'Arrocero', text: 'Vende {n} bultos de arroz', metric: 'sold:rice_sack', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'c_cocadas', icon: ICON.cocada, name: 'Cocadero', text: 'Haz {n} cocadas', metric: 'produced:cocada', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'c_pescado', icon: ICON.fishInCoconut, name: 'Pescador', text: 'Cocina {n} pescados en coco', metric: 'produced:fish_in_coconut', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'c_bandejas', icon: ICON.bandejaCostena, name: 'Bandeja completa', text: 'Sirve {n} bandejas costeñas', metric: 'produced:bandeja_costena', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'c_sombreros', icon: ICON.sombreroVueltiao, name: 'Sombrerero', text: 'Cose {n} sombreros vueltiaos', metric: 'produced:sombrero_vueltiao', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'c_islas', icon: ICON.paseoIslas, name: 'A las islas', text: 'Vende {n} paseos a las Islas del Rosario', metric: 'sold:paseo_islas', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'c_monedas', icon: '💰', name: 'Patrón costeño', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'c_anos', icon: '📅', name: 'Costeño de corazón', text: 'Vive {n} años de juego en la Costa', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'c_cartagena', icon: ICON.torreReloj, name: 'Hasta Cartagena', text: 'Completa Cartagena {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'c_maestro', icon: '🏅', name: 'Maestro costeño', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'c_medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'c_todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'c_oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'c_album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'c_ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('costa')], reward: [1, 2, 4] },
];

// Los de Boyacá (v3.28).
const BOYACA = [
  { id: 'b_papitas', icon: ICON.criollasBox, name: 'Papicultor', text: 'Vende {n} cajas de papitas', metric: 'sold:criollas_box', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'b_cerveza', icon: ICON.beer, name: 'Cervecero', text: 'Fermenta {n} cervezas', metric: 'produced:beer', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'b_jarras', icon: ICON.jarraCerveza, name: 'Alfarero', text: 'Llena {n} jarras de barro', metric: 'produced:jarra_cerveza', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'b_amasijos', icon: ICON.amasijos, name: 'Amasijos', text: 'Hornea {n} canastas de amasijos', metric: 'produced:canasta_amasijos', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'b_ruanas', icon: ICON.ruana, name: 'Tejedor', text: 'Teje {n} ruanas', metric: 'produced:ruana', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'b_fosil', icon: ICON.excursionFosil, name: 'Al Fósil', text: 'Vende {n} excursiones al Fósil', metric: 'sold:excursion_fosil', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'b_monedas', icon: '💰', name: 'Patrón boyacense', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'b_anos', icon: '📅', name: 'Boyacense de corazón', text: 'Vive {n} años de juego en Boyacá', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'b_villa', icon: ICON.iglesiaVilla, name: 'Hasta Villa de Leyva', text: 'Completa Villa de Leyva {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'b_maestro', icon: '🏅', name: 'Maestro boyacense', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'b_medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'b_todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'b_oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'b_album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'b_ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('boyaca')], reward: [1, 2, 4] },
];

// Los de los Llanos (v3.37).
const LLANOS = [
  { id: 'll_aceite', icon: ICON.oilBox, name: 'Palmicultor', text: 'Vende {n} cajas de aceite', metric: 'sold:oil_box', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'll_jugo', icon: ICON.passionJuice, name: 'Frutero', text: 'Mezcla {n} jugos de maracuyá', metric: 'produced:passion_juice', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'll_cachama', icon: ICON.cachamaMaracuya, name: 'Piscicultor', text: 'Sirve {n} cachamas al maracuyá', metric: 'produced:cachama_maracuya', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'll_parranda', icon: ICON.parranda, name: 'Parrandero', text: 'Asa {n} asados de parranda', metric: 'produced:parranda_llanera', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'll_sillas', icon: ICON.saddle, name: 'Talabartero', text: 'Haz {n} sillas de montar', metric: 'produced:silla_montar', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'll_cano', icon: ICON.canoCristales, name: 'A Caño Cristales', text: 'Vende {n} excursiones a Caño Cristales', metric: 'sold:excursion_cano', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'll_monedas', icon: '💰', name: 'Patrón llanero', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'll_anos', icon: '📅', name: 'Llanero de corazón', text: 'Vive {n} años de juego en los Llanos', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'll_villavo', icon: ICON.canoCristales, name: 'Hasta Villavicencio', text: 'Completa Villavicencio {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'll_maestro', icon: '🏅', name: 'Maestro llanero', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'll_medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'll_todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'll_oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'll_album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'll_ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('llanos')], reward: [1, 2, 4] },
];

// Los de la Costa Pacífica (v3.44).
const PACIFICO = [
  { id: 'pa_patacones', icon: ICON.pataconBox, name: 'Platanero', text: 'Vende {n} cajas de patacones', metric: 'sold:patacon_box', tiers: [1000, 100000, 10000000], reward: [1, 2, 4] },
  { id: 'pa_alino', icon: ICON.alino, name: 'Cocinera de azotea', text: 'Prepara {n} frascos de aliño', metric: 'produced:alino', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'pa_tapao', icon: ICON.tapao, name: 'Pescador', text: 'Sirve {n} tapaos de pescado', metric: 'produced:tapao', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'pa_cazuela', icon: ICON.cazuela, name: 'Piangüera', text: 'Sirve {n} cazuelas de mariscos', metric: 'produced:cazuela_mariscos', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'pa_werregue', icon: ICON.werregueJar, name: 'Tejedora', text: 'Teje {n} jarrones de werregue', metric: 'produced:werregue_jar', tiers: [10000, 1000000, 100000000], reward: [1, 2, 4] },
  { id: 'pa_ballenas', icon: ICON.ballenas, name: 'A ver las ballenas', text: 'Vende {n} salidas a ver las ballenas', metric: 'sold:excursion_ballenas', tiers: [1000, 100000, 10000000], reward: [2, 4, 8] },
  { id: 'pa_monedas', icon: '💰', name: 'Patrón del Pacífico', text: 'Gana {n} monedas en total', metric: 'earned', tiers: [1e9, 1e15, 1e21], reward: [1, 2, 4] },
  { id: 'pa_anos', icon: '📅', name: 'Del Pacífico', text: 'Vive {n} años de juego en la Costa Pacífica', metric: 'years', tiers: [4, 16, 64], reward: [1, 2, 4] },
  { id: 'pa_buenaventura', icon: ICON.ballenas, name: 'Hasta Buenaventura', text: 'Completa Buenaventura {n} veces', metric: 'endings', tiers: [1, 3, 10], reward: [2, 4, 8] },
  { id: 'pa_maestro', icon: '🏅', name: 'Maestro del Pacífico', text: 'Lleva todo al nivel 100 {n} veces', metric: 'masteries', tiers: [1, 3, 10], reward: [4, 8, 16] },
  { id: 'pa_medallas', icon: '🎖️', name: 'Coleccionista', text: 'Gana {n} medallas', metric: 'medals', tiers: [6, 24, 60], reward: [1, 2, 4] },
  { id: 'pa_todas', icon: '🗺️', name: 'De todas partes', text: 'Gana una medalla en {n} eventos distintos', metric: 'eventsMedaled', tiers: [3, 6], reward: [2, 4] },
  { id: 'pa_oro', icon: '🥇', name: 'De oro', text: 'Gana el oro en {n} eventos distintos', metric: 'eventsGold', tiers: [1, 3, 6], reward: [1, 3, 6] },
  { id: 'pa_album', icon: '📖', name: 'Álbum lleno', text: 'Llena {n} páginas del álbum', metric: 'pages', tiers: [1, 3, 6], reward: [1, 2, 4] },
  { id: 'pa_ciencia', icon: '🔬', name: 'Ingeniero', text: 'Compra {n} investigaciones en una partida', metric: 'research', tiers: [20, 50, researchOf('pacifico')], reward: [1, 2, 4] },
];

export const LOGROS = [...CAFETERO.map((l) => ({ ...l, region: 'cafetero' })), ...SANTANDER.map((l) => ({ ...l, region: 'santander' })), ...COSTA.map((l) => ({ ...l, region: 'costa' })), ...BOYACA.map((l) => ({ ...l, region: 'boyaca' })), ...LLANOS.map((l) => ({ ...l, region: 'llanos' })), ...PACIFICO.map((l) => ({ ...l, region: 'pacifico' }))];
export const logrosOf = (region) => LOGROS.filter((l) => l.region === region);

export const LOGROS_BY_ID = Object.fromEntries(LOGROS.map((l) => [l.id, l]));
