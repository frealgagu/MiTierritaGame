// Álbum de láminas (v2.2, GDD §10.2): como el de las chocolatinas, pero sin sobres al azar: cada lámina
// se compra con Renombre ⭐ y se pega la que uno quiera. Una página llena da Renombre de premio.
// Seis páginas, una por zona, con seis láminas de lo que rodea a cada producto en Colombia.
// Desde la v3.10 cada región tiene su álbum (`region` de cada página): el de Santander, con su bocadillo,
// su tabaco, su fique, su hato, sus hormigas y Barichara. El Renombre con que se pagan es el mismo.
import { ICON } from './icons.js';

export const PAGE_BONUS = 3; // ⭐ al llenar una página

const CAFETERO = [
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

const SANTANDER = [
  {
    id: 'bocadillo',
    icon: ICON.bocadilloBijao,
    name: 'El bocadillo',
    stickers: [
      { id: 'guayaba', icon: ICON.guava, name: 'La guayaba', cost: 1, text: 'Crece en toda la hoya del río Suárez: con ella se hace el bocadillo.' },
      { id: 'bijao', icon: ICON.bocadilloBijao, name: 'La hoja de bijao', cost: 1, text: 'Hoja ancha en la que se envuelve cada bocadillo veleño.' },
      { id: 'paila_cobre', icon: ICON.guavaJelly, name: 'La paila de cobre', cost: 2, text: 'Ahí se cocina la pulpa con azúcar, revolviendo sin parar.' },
      { id: 'lonja', icon: '🍬', name: 'El bocadillo de lonja', cost: 2, text: 'De dos colores: guayaba roja y guayaba blanca, una sobre otra.' },
      { id: 'cajitas', icon: '📦', name: 'Las cajitas de madera', cost: 2, text: 'Cajitas de madera liviana en las que viaja el bocadillo por todo el país.' },
      { id: 'velez', icon: '🎻', name: 'Vélez', cost: 3, text: 'La capital del bocadillo, tierra de torbellino, tiple y requinto.' },
    ],
  },
  {
    id: 'tabaco',
    icon: ICON.tobaccoLeaf,
    name: 'El tabaco',
    stickers: [
      { id: 'veguero', icon: ICON.tobaccoPlant, name: 'El veguero', cost: 1, text: 'Quien siembra y cuida el tabaco en la vega.' },
      { id: 'caney', icon: '🛖', name: 'El caney', cost: 1, text: 'Rancho alto y ventilado donde se cuelga la hoja a curar.' },
      { id: 'hoja_curada', icon: ICON.curedLeaf, name: 'La hoja curada', cost: 2, text: 'Colgada al aire pasa de verde a dorada y luego a marrón.' },
      { id: 'torcedora', icon: ICON.cigar, name: 'La torcedora', cost: 2, text: 'Enrolla a mano cada tabaco, hoja por hoja.' },
      { id: 'chicote', icon: '🚬', name: 'El chicote', cost: 2, text: 'El tabaco corto y fuerte de los abuelos del campo.' },
      { id: 'tabaco_colonia', icon: '⛵', name: 'Tabaco para el mundo', cost: 3, text: 'Desde la Colonia, Santander es tierra de tabaco que se vendía hasta Europa.' },
    ],
  },
  {
    id: 'fique',
    icon: ICON.fiquePlant,
    name: 'El fique',
    stickers: [
      { id: 'mata_fique', icon: ICON.fiquePlant, name: 'La mata de fique', cost: 1, text: 'Hojas largas y espinosas de las que sale la fibra.' },
      { id: 'desfibrado', icon: ICON.fiqueFiber, name: 'El desfibrado', cost: 1, text: 'Se raspan las hojas hasta dejar la fibra limpia, que se seca al sol.' },
      { id: 'cabuya', icon: ICON.fiqueYarn, name: 'La cabuya', cost: 2, text: 'Cuerda de fique para amarrar cargas, enjalmas y hamacas.' },
      { id: 'costal', icon: ICON.fiqueSack, name: 'El costal de fique', cost: 2, text: 'En costales de fique viajó por años el café de Colombia.' },
      { id: 'alpargatas', icon: ICON.alpargatas, name: 'Las alpargatas', cost: 2, text: 'Calzado con suela de fique tejida, el de los caminantes.' },
      { id: 'curiti', icon: '🧵', name: 'Curití', cost: 3, text: 'Pueblo de artesanos que tejen el fique en telares.' },
    ],
  },
  {
    id: 'hato',
    icon: '🐄',
    name: 'El hato',
    stickers: [
      { id: 'vaquero', icon: '🤠', name: 'El vaquero', cost: 1, text: 'Arrea el ganado a caballo por los potreros.' },
      { id: 'carne_oreada', icon: ICON.carneOreada, name: 'La carne oreada', cost: 1, text: 'Carne salada que se pone al sol y al aire: típica de Santander.' },
      { id: 'cabro', icon: '🐐', name: 'El cabro', cost: 2, text: 'Cabros y chivos que se crían en las tierras secas del cañón.' },
      { id: 'pepitoria', icon: '🍚', name: 'La pepitoria', cost: 2, text: 'Arroz con las menudencias del cabro, plato de Santander.' },
      { id: 'mute', icon: '🍲', name: 'El mute', cost: 2, text: 'Sopa espesa de maíz, carnes y verduras, para los domingos.' },
      { id: 'chicamocha', icon: '🏞️', name: 'El cañón del Chicamocha', cost: 3, text: 'Uno de los cañones más hondos del mundo, entre montañas secas.' },
    ],
  },
  {
    id: 'hormigas',
    icon: '🐜',
    name: 'Las hormigas',
    stickers: [
      { id: 'culona', icon: ICON.antQueen, name: 'La hormiga culona', cost: 1, text: 'La reina de la arriera: se tuesta y se come con sal.' },
      { id: 'salida', icon: '🌦️', name: 'La salida', cost: 1, text: 'Con las primeras lluvias salen a volar las reinas.' },
      { id: 'recolectoras', icon: '👨‍👩‍👧', name: 'La recolección', cost: 2, text: 'Familias enteras salen al amanecer a recogerlas.' },
      { id: 'tiesto', icon: ICON.toastedAnts, name: 'El tiesto', cost: 2, text: 'Vasija de barro en la que se tuestan las hormigas.' },
      { id: 'cucurucho', icon: ICON.antCone, name: 'El cucurucho', cost: 2, text: 'Cono de papel en el que se venden a la orilla de la carretera.' },
      { id: 'san_gil', icon: '🛶', name: 'San Gil', cost: 3, text: 'Tierra de hormigas, de ríos y de aventura.' },
    ],
  },
  {
    id: 'barichara',
    icon: '⛪',
    name: 'Barichara',
    stickers: [
      { id: 'piedra', icon: '🪨', name: 'La piedra amarilla', cost: 1, text: 'Con ella están hechas las calles, las casas y las iglesias.' },
      { id: 'tapia', icon: '🧱', name: 'La tapia pisada', cost: 1, text: 'Muros de tierra apisonada, frescos en pleno calor.' },
      { id: 'camino_real', icon: ICON.excursion, name: 'El Camino Real', cost: 2, text: 'Camino empedrado hace siglos entre Barichara y Guane.' },
      { id: 'guane', icon: '🦕', name: 'Guane', cost: 2, text: 'El pueblito al final del Camino Real, con su museo de fósiles.' },
      { id: 'guanes', icon: '🏺', name: 'Los guanes', cost: 2, text: 'El pueblo indígena de estas tierras: tejían algodón y hacían cerámica.' },
      { id: 'mirador', icon: '🌅', name: 'El mirador', cost: 3, text: 'Desde el borde del pueblo se ve todo el valle del río Suárez.' },
    ],
  },
];

export const ALBUM = [...CAFETERO.map((pg) => ({ ...pg, region: 'cafetero' })), ...SANTANDER.map((pg) => ({ ...pg, region: 'santander' }))];
// Las páginas del álbum de una región.
export const albumOf = (regionId) => ALBUM.filter((pg) => pg.region === regionId);

export const STICKERS_BY_ID = Object.fromEntries(ALBUM.flatMap((page) => page.stickers.map((s) => [s.id, { ...s, page: page.id }])));
