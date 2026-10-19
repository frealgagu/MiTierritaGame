// Álbum de láminas (v2.2, GDD §10.2): como el de las chocolatinas, pero sin sobres al azar: cada lámina
// se compra con Renombre ⭐ y se pega la que uno quiera. Una página llena da Renombre de premio.
// Seis páginas, una por zona, con seis láminas de lo que rodea a cada producto en Colombia.
import { ICON } from './icons.js';

export const PAGE_BONUS = 3; // ⭐ al llenar una página

export const ALBUM = [
  {
    id: 'cafe',
    icon: '☕',
    name: 'El café',
    stickers: [
      { id: 'arriero', icon: '🧑‍🌾', name: 'El arriero', cost: 1, text: 'Llevaba el café en recuas de mulas por caminos de herradura.' },
      { id: 'mula', icon: '🐴', name: 'La mula', cost: 1, text: 'Fuerte y de paso firme: por eso subía el café por la montaña.' },
      { id: 'chapolera', icon: '👩‍🌾', name: 'La chapolera', cost: 2, text: 'Así se llama a quien recoge café en la cosecha, grano a grano.' },
      { id: 'carriel', icon: '👜', name: 'El carriel', cost: 2, text: 'Bolso de cuero del arriero, con bolsillos secretos.' },
      { id: 'aguadeno', icon: '👒', name: 'El aguadeño', cost: 2, text: 'Sombrero de iraca tejido en Aguadas, Caldas.' },
      { id: 'yipao', icon: '🚙', name: 'El yipao', cost: 3, text: 'Un Willys cargado hasta el techo: en Armenia hacen desfiles de yipaos.' },
    ],
  },
  {
    id: 'panela',
    icon: '🎋',
    name: 'La panela',
    stickers: [
      { id: 'trapiche', icon: '⚙️', name: 'El trapiche', cost: 1, text: 'Los rodillos que exprimen la caña; antes los movían bueyes.' },
      { id: 'molienda', icon: '🎋', name: 'La molienda', cost: 1, text: 'Días de trabajo en familia para convertir la caña en panela.' },
      { id: 'hornilla', icon: '🔥', name: 'La hornilla', cost: 2, text: 'Hierve el guarapo en pailas, con el bagazo de la misma caña.' },
      { id: 'aguapanela', icon: '🍵', name: 'La aguapanela', cost: 2, text: 'Panela en agua, fría con limón o caliente con queso.' },
      { id: 'melcocha', icon: '🍬', name: 'La melcocha', cost: 2, text: 'Miel de panela estirada a mano hasta ponerse dorada.' },
      { id: 'gaveras', icon: '🧱', name: 'Las gaveras', cost: 3, text: 'Moldes de madera donde la miel se vuelve panela.' },
    ],
  },
  {
    id: 'leche',
    icon: '🐄',
    name: 'La leche',
    stickers: [
      { id: 'normando', icon: '🐄', name: 'La Normando', cost: 1, text: 'Vaca de leche y carne, muy común en el altiplano.' },
      { id: 'ordeno', icon: '🪣', name: 'El ordeño', cost: 1, text: 'Al amanecer y en la tarde, todos los días del año.' },
      { id: 'cuajada', icon: '🍯', name: 'Cuajada con melao', cost: 2, text: 'Queso fresco con miel de panela: postre de tierra fría.' },
      { id: 'kumis', icon: '🥛', name: 'El kumis', cost: 2, text: 'Leche fermentada, espesa y dulce, para acompañar el pandebono.' },
      { id: 'arequipe', icon: '🍮', name: 'El arequipe', cost: 2, text: 'Leche y azúcar a fuego lento hasta quedar color caramelo.' },
      { id: 'cantina', icon: '🥫', name: 'La cantina', cost: 3, text: 'Tarro de aluminio en el que se lleva la leche al camino.' },
    ],
  },
  {
    id: 'cacao',
    icon: '🍫',
    name: 'El cacao',
    stickers: [
      { id: 'mazorca', icon: ICON.cacaoPod, name: 'La mazorca', cost: 1, text: 'El fruto del cacao: guarda entre 30 y 50 semillas.' },
      { id: 'molinillo', icon: '🥄', name: 'El molinillo', cost: 1, text: 'Se frota entre las manos para batir el chocolate.' },
      { id: 'santafereno', icon: '☕', name: 'Chocolate santafereño', cost: 2, text: 'Chocolate con queso y almojábana: el de Bogotá.' },
      { id: 'chocolatera', icon: '🫖', name: 'La chocolatera', cost: 2, text: 'Olla de aluminio de boca ancha para hervir el chocolate.' },
      { id: 'fino', icon: '🏅', name: 'Fino de aroma', cost: 2, text: 'Así se reconoce en el mundo casi todo el cacao colombiano.' },
      { id: 'lamina', icon: '📒', name: 'El álbum de chocolatina', cost: 3, text: 'Las láminas venían en las chocolatinas: ¡se cambiaban las repetidas!' },
    ],
  },
  {
    id: 'maiz',
    icon: '🌽',
    name: 'El maíz',
    stickers: [
      { id: 'arepa', icon: ICON.arepa, name: 'La arepa', cost: 1, text: 'Hay decenas: de choclo, de huevo, boyacense, paisa…' },
      { id: 'budare', icon: '🍳', name: 'El budare', cost: 1, text: 'Plancha redonda de barro o de hierro para asar arepas.' },
      { id: 'mazamorra', icon: '🥣', name: 'La mazamorra', cost: 2, text: 'Maíz pilado cocido, con leche y un pedazo de panela.' },
      { id: 'envuelto', icon: '🌿', name: 'El envuelto', cost: 2, text: 'Masa de maíz dulce envuelta en hoja y cocinada al vapor.' },
      { id: 'pilon', icon: '🪵', name: 'El pilón', cost: 2, text: 'Tronco hueco donde se golpea el maíz para quitarle la cáscara.' },
      { id: 'choclo', icon: '🌽', name: 'El choclo', cost: 3, text: 'Mazorca tierna: asada con mantequilla y sal, en la carretera.' },
    ],
  },
  {
    id: 'pueblo',
    icon: '⛪',
    name: 'El pueblo',
    stickers: [
      { id: 'plaza', icon: '⛲', name: 'La plaza', cost: 1, text: 'Con su iglesia, su parque y el mercado de los domingos.' },
      { id: 'tinto', icon: '☕', name: 'El tinto', cost: 1, text: 'Café negro en pocillo: se ofrece a toda visita.' },
      { id: 'chiva', icon: '🚌', name: 'La chiva', cost: 2, text: 'Bus de escalera pintado a mano: lleva gente, gallinas y bultos.' },
      { id: 'fonda', icon: '🍳', name: 'La fonda', cost: 2, text: 'Donde paran los arrieros por un desayuno con chocolate.' },
      { id: 'balcones', icon: '🏠', name: 'Los balcones', cost: 2, text: 'Casas de bahareque con balcones de colores en los pueblos.' },
      { id: 'fiestas', icon: '🎆', name: 'Las fiestas', cost: 3, text: 'Cada pueblo tiene las suyas: del café, de la panela, del maíz…' },
    ],
  },
];

export const STICKERS_BY_ID = Object.fromEntries(ALBUM.flatMap((page) => page.stickers.map((s) => [s.id, { ...s, page: page.id }])));
