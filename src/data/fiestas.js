// Fiestas (v5.17): the real calendar's celebrations, read from the device's date (sim/fiestas.js). Each one dresses
// every zone up (render/Fiesta.js), its people greet the player (ui/Chatter.js) and production rises in every region
// while it lasts, like a season of the game's own calendar (not on event boards).
//   kind: 'big' (×1.25; a season event and a sticker of its own from v5.19) or 'decor' (decorations only, ×1.10).
//         (v5.19) Semana Santa and the Feria de las Flores are decorations only and Amor y Amistad is big: twelve big
//         ones, nearly one a month.
//   dates: when, inclusive: { from: [month, day], to: [month, day] } (it may cross the new year), relative to Easter
//          { easter: [first, last] } in days, or around the nth weekday of a month { month, weekday (0 = Sunday), nth,
//          before, after } (the days before and after it).
//   decor: what the map shows (render/Fiesta.js draws the ones it knows; the rest come in later versions), from its
//          `decorDates` when they are longer than the fiesta itself (the manger stays until the Día de Reyes).
//   greeting: what a zone's person says once a day while it lasts. Texts are the Spanish i18n keys (tk).
//   sticker: (v5.19) a big fiesta's sticker text in the «Fiestas de Colombia» album, won in its season event.
import { tk } from '../i18n/index.js';
import { ICON } from './icons.js';

export const FIESTA_BONUS = { big: 1.25, decor: 1.1 };

export const FIESTAS = [
  {
    id: 'negros_blancos', icon: '🎨', kind: 'big', dates: { from: [1, 2], to: [1, 7] }, decor: ['streamers', 'talc'],
    name: tk('Carnaval de Negros y Blancos'),
    greeting: tk('🎨 ¡Es el Carnaval de Negros y Blancos! En Pasto se juega con talco y pintura negra.'),
    sticker: tk('El 5 de enero se pintan de negro y el 6 de blanco: en Pasto nadie se salva del talco.'),
  },
  {
    id: 'barranquilla', icon: '🎭', kind: 'big', dates: { easter: [-53, -47] }, decor: ['streamers', 'confetti'],
    name: tk('Carnaval de Barranquilla'),
    greeting: tk('🎭 ¡Llegó el Carnaval de Barranquilla! Quien lo vive es quien lo goza.'),
    sticker: tk('La Batalla de Flores, la marimonda y el garabato: patrimonio de la humanidad.'),
  },
  {
    id: 'semana_santa', icon: '✝️', kind: 'decor', dates: { easter: [-7, 0] },
    name: tk('Semana Santa'),
    greeting: tk('✝️ Es Semana Santa: palmas el domingo de Ramos, procesiones y pescado en la mesa.'),
  },
  {
    id: 'vallenato', icon: '🪗', kind: 'big', dates: { from: [4, 24], to: [4, 30] }, decor: ['streamers', 'notes'],
    name: tk('Festival de la Leyenda Vallenata'),
    greeting: tk('🪗 En Valledupar suenan los acordeones: ¡es el Festival de la Leyenda Vallenata!'),
    sticker: tk('Acordeón, caja y guacharaca: en Valledupar se corona al rey vallenato.'),
  },
  {
    id: 'dia_madre', icon: '💐', kind: 'big', dates: { month: 5, weekday: 0, nth: 2, before: 2, after: 0 }, decor: ['flowers'],
    name: tk('Día de la Madre'),
    greeting: tk('💐 ¡Feliz Día de la Madre! Hay serenata y almuerzo en familia.'),
    sticker: tk('Serenata con mariachis, flores y almuerzo en familia el segundo domingo de mayo.'),
  },
  {
    id: 'san_pedro', icon: '🎉', kind: 'big', dates: { from: [6, 20], to: [6, 30] }, decor: ['streamers', 'fireworks'],
    name: tk('Fiestas de San Juan y San Pedro'),
    greeting: tk('🎉 ¡Son las fiestas de San Juan y San Pedro! En el Huila y el Tolima suena el bambuco.'),
    sticker: tk('En Neiva se baila el sanjuanero y se come asado huilense.'),
  },
  {
    id: 'independencia', icon: '🇨🇴', kind: 'big', dates: { from: [7, 18], to: [7, 21] }, decor: ['flags'],
    name: tk('Día de la Independencia'),
    greeting: tk('🇨🇴 ¡Feliz 20 de julio! Hay banderas en cada ventana por la Independencia.'),
    sticker: tk('El 20 de julio de 1810 empezó la Independencia con el florero de Llorente.'),
  },
  {
    id: 'cometas', icon: '🪁', kind: 'decor', dates: { from: [8, 1], to: [8, 31] },
    name: tk('Mes de las cometas'),
    greeting: tk('🪁 ¡Llegó agosto, el mes de los vientos! Es tiempo de elevar cometas.'),
  },
  {
    id: 'feria_flores', icon: '🌺', kind: 'decor', dates: { from: [8, 1], to: [8, 10] },
    name: tk('Feria de las Flores'),
    greeting: tk('🌺 Es la Feria de las Flores: los silleteros cargan jardines enteros en la espalda.'),
  },
  {
    id: 'batalla_boyaca', icon: '🌉', kind: 'big', dates: { from: [8, 5], to: [8, 8] },
    name: tk('Batalla de Boyacá'),
    greeting: tk('🌉 El 7 de agosto se recuerda la Batalla de Boyacá, en el Puente de Boyacá.'),
    sticker: tk('El 7 de agosto de 1819 el ejército libertador ganó en el Puente de Boyacá.'),
  },
  {
    id: 'amor_amistad', icon: '💕', kind: 'big', dates: { month: 9, weekday: 6, nth: 3, before: 5, after: 1 },
    name: tk('Amor y Amistad'),
    greeting: tk('💕 ¡Feliz Amor y Amistad! Es semana de amigo secreto.'),
    sticker: tk('En septiembre se juega al amigo secreto y se regalan dulces y detalles.'),
  },
  {
    id: 'halloween', icon: '🎃', kind: 'big', dates: { from: [10, 25], to: [11, 1] },
    name: tk('Halloween'),
    greeting: tk('🎃 ¡Llegó Halloween! Los niños salen disfrazados a pedir dulces.'),
    sticker: tk('El 31 de octubre los niños salen disfrazados a pedir: «¡Triqui, triqui, Halloween!».'),
  },
  {
    id: 'cartagena', icon: '🏰', kind: 'big', dates: { from: [11, 9], to: [11, 12] },
    name: tk('Independencia de Cartagena'),
    greeting: tk('🏰 ¡Fiestas de la Independencia de Cartagena! Hay bandas y desfiles en la ciudad amurallada.'),
    sticker: tk('El 11 de noviembre de 1811 Cartagena se declaró independiente.'),
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
    sticker: tk('El 7 de diciembre, en la noche, se encienden velas y faroles en cada andén.'),
  },
  {
    id: 'navidad', icon: '🎄', kind: 'big', dates: { from: [12, 16], to: [12, 25] }, decor: ['manger'], decorDates: { from: [12, 16], to: [1, 6] },
    name: tk('Navidad'),
    greeting: tk('🎄 ¡Feliz Navidad, patrón! Empezó la novena: hay buñuelos, natilla y villancicos.'),
    sticker: tk('Del 16 al 24 se reza la novena con natilla, buñuelos y villancicos.'),
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

// (v5.19) The «🎉 Fiestas de Colombia» album: one sticker per big fiesta, won in its season event (not bought), two
// pages of six by semester. Completing a page pays its Renown like any page. It counts for no achievement, the
// rest of the album or the grand finale: each sticker can only be won on its real date.
export const FIESTA_PAGES = [
  { id: 'fiestas_1', icon: '🎭', name: tk('Primer semestre'), stickers: ['negros_blancos', 'barranquilla', 'vallenato', 'dia_madre', 'san_pedro', 'independencia'] },
  { id: 'fiestas_2', icon: '🎄', name: tk('Segundo semestre'), stickers: ['batalla_boyaca', 'amor_amistad', 'halloween', 'cartagena', 'velitas', 'navidad'] },
];

// (v5.20) Each sticker's own art in the game's icon font (tools/icons/build_icons.py), as the regions' albums have;
// the fiesta's emoji stays for texts and greetings.
export const FIESTA_ART = {
  negros_blancos: ICON.fiestaNegrosBlancos,
  barranquilla: ICON.fiestaBarranquilla,
  vallenato: ICON.fiestaVallenato,
  dia_madre: ICON.fiestaDiaMadre,
  san_pedro: ICON.fiestaSanPedro,
  independencia: ICON.fiestaIndependencia,
  batalla_boyaca: ICON.fiestaBatallaBoyaca,
  amor_amistad: ICON.fiestaAmorAmistad,
  halloween: ICON.fiestaHalloween,
  cartagena: ICON.fiestaCartagena,
  velitas: ICON.fiestaVelitas,
  navidad: ICON.fiestaNavidad,
};
