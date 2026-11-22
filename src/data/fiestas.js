// Fiestas (v5.17): the real calendar's celebrations, read from the device's date (sim/fiestas.js). Each one dresses
// every zone up (render/Fiesta.js), its people greet the player (ui/Chatter.js) and production rises in every region
// while it lasts, like a season of the game's own calendar (not on event boards).
//   kind: 'big' (×1.25; a season event of its own from v5.18) or 'decor' (decorations only, ×1.10).
//   dates: when, inclusive: { from: [month, day], to: [month, day] } (it may cross the new year), relative to Easter
//          { easter: [first, last] } in days, or around the nth weekday of a month { month, weekday (0 = Sunday), nth,
//          before, after } (the days before and after it).
//   decor: what the map shows (render/Fiesta.js draws the ones it knows; the rest come in later versions), from its
//          `decorDates` when they are longer than the fiesta itself (the manger stays until the Día de Reyes).
//   greeting: what a zone's person says once a day while it lasts. Texts are the Spanish i18n keys (tk).
import { tk } from '../i18n/index.js';

export const FIESTA_BONUS = { big: 1.25, decor: 1.1 };

export const FIESTAS = [
  {
    id: 'negros_blancos', icon: '🎨', kind: 'big', dates: { from: [1, 2], to: [1, 7] },
    name: tk('Carnaval de Negros y Blancos'),
    greeting: tk('🎨 ¡Es el Carnaval de Negros y Blancos! En Pasto se juega con talco y pintura negra.'),
  },
  {
    id: 'barranquilla', icon: '🎭', kind: 'big', dates: { easter: [-53, -47] },
    name: tk('Carnaval de Barranquilla'),
    greeting: tk('🎭 ¡Llegó el Carnaval de Barranquilla! Quien lo vive es quien lo goza.'),
  },
  {
    id: 'semana_santa', icon: '✝️', kind: 'big', dates: { easter: [-7, 0] },
    name: tk('Semana Santa'),
    greeting: tk('✝️ Es Semana Santa: palmas el domingo de Ramos, procesiones y pescado en la mesa.'),
  },
  {
    id: 'vallenato', icon: '🪗', kind: 'big', dates: { from: [4, 24], to: [4, 30] },
    name: tk('Festival de la Leyenda Vallenata'),
    greeting: tk('🪗 En Valledupar suenan los acordeones: ¡es el Festival de la Leyenda Vallenata!'),
  },
  {
    id: 'dia_madre', icon: '💐', kind: 'big', dates: { month: 5, weekday: 0, nth: 2, before: 2, after: 0 },
    name: tk('Día de la Madre'),
    greeting: tk('💐 ¡Feliz Día de la Madre! Hay serenata y almuerzo en familia.'),
  },
  {
    id: 'san_pedro', icon: '🎉', kind: 'big', dates: { from: [6, 20], to: [6, 30] },
    name: tk('Fiestas de San Juan y San Pedro'),
    greeting: tk('🎉 ¡Son las fiestas de San Juan y San Pedro! En el Huila y el Tolima suena el bambuco.'),
  },
  {
    id: 'independencia', icon: '🇨🇴', kind: 'big', dates: { from: [7, 18], to: [7, 21] },
    name: tk('Día de la Independencia'),
    greeting: tk('🇨🇴 ¡Feliz 20 de julio! Hay banderas en cada ventana por la Independencia.'),
  },
  {
    id: 'cometas', icon: '🪁', kind: 'decor', dates: { from: [8, 1], to: [8, 31] },
    name: tk('Mes de las cometas'),
    greeting: tk('🪁 ¡Llegó agosto, el mes de los vientos! Es tiempo de elevar cometas.'),
  },
  {
    id: 'feria_flores', icon: '🌺', kind: 'big', dates: { from: [8, 1], to: [8, 10] },
    name: tk('Feria de las Flores'),
    greeting: tk('🌺 Es la Feria de las Flores: los silleteros cargan jardines enteros en la espalda.'),
  },
  {
    id: 'batalla_boyaca', icon: '🌉', kind: 'big', dates: { from: [8, 5], to: [8, 8] },
    name: tk('Batalla de Boyacá'),
    greeting: tk('🌉 El 7 de agosto se recuerda la Batalla de Boyacá, en el Puente de Boyacá.'),
  },
  {
    id: 'amor_amistad', icon: '💕', kind: 'decor', dates: { month: 9, weekday: 6, nth: 3, before: 5, after: 1 },
    name: tk('Amor y Amistad'),
    greeting: tk('💕 ¡Feliz Amor y Amistad! Es semana de amigo secreto.'),
  },
  {
    id: 'halloween', icon: '🎃', kind: 'big', dates: { from: [10, 25], to: [11, 1] },
    name: tk('Halloween'),
    greeting: tk('🎃 ¡Llegó Halloween! Los niños salen disfrazados a pedir dulces.'),
  },
  {
    id: 'cartagena', icon: '🏰', kind: 'big', dates: { from: [11, 9], to: [11, 12] },
    name: tk('Independencia de Cartagena'),
    greeting: tk('🏰 ¡Fiestas de la Independencia de Cartagena! Hay bandas y desfiles en la ciudad amurallada.'),
  },
  {
    id: 'alumbrado', icon: '✨', kind: 'decor', dates: { from: [12, 1], to: [1, 6] }, decor: ['lights', 'tree'],
    name: tk('Alumbrado navideño'),
    greeting: tk('✨ Empezó el alumbrado navideño: hay luces en cada casa hasta el Día de Reyes.'),
  },
  {
    id: 'velitas', icon: '🕯️', kind: 'big', dates: { from: [12, 6], to: [12, 8] }, decor: ['candles'],
    name: tk('Noche de las Velitas'),
    greeting: tk('🕯️ ¡Feliz Noche de las Velitas! Esta noche se encienden velas y faroles en las calles.'),
  },
  {
    id: 'navidad', icon: '🎄', kind: 'big', dates: { from: [12, 16], to: [12, 25] }, decor: ['manger'], decorDates: { from: [12, 16], to: [1, 6] },
    name: tk('Navidad'),
    greeting: tk('🎄 ¡Feliz Navidad, patrón! Empezó la novena: hay buñuelos, natilla y villancicos.'),
  },
  {
    id: 'ano_viejo', icon: '🎆', kind: 'decor', dates: { from: [12, 30], to: [1, 1] }, decor: ['old_year', 'fireworks'],
    name: tk('Año Viejo'),
    greeting: tk('🎆 ¡Feliz Año Nuevo! A medianoche se quema el muñeco de año viejo y hay pólvora.'),
  },
  {
    id: 'reyes', icon: '👑', kind: 'decor', dates: { from: [1, 6], to: [1, 6] }, decor: ['kings'],
    name: tk('Día de Reyes'),
    greeting: tk('👑 Hoy es Día de Reyes: los Reyes Magos llegan al pesebre y se apaga el alumbrado.'),
  },
];

export const FIESTAS_BY_ID = Object.fromEntries(FIESTAS.map((f) => [f.id, f]));
