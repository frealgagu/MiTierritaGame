// Álbum de láminas (v2.2, GDD §10.2): como el de las chocolatinas, pero sin sobres al azar: cada lámina
// se compra con Renombre ⭐ y se pega la que uno quiera. Una página llena da Renombre de premio.
// Seis páginas, una por zona, con seis láminas de lo que rodea a cada producto en Colombia.
// Desde la v3.10 cada región tiene su álbum (`region` de cada página): el de Santander, con su bocadillo,
// su tabaco, su fique, su hato, sus hormigas y Barichara (y desde la v3.21 el de la Costa). El Renombre
// con que se pagan es el mismo.
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

// El de la Costa (v3.21): su arroz, su coco, su ciénaga, su queso, su sombrero y Cartagena.
const COSTA = [
  {
    id: 'arroz',
    icon: ICON.ricePlant,
    name: 'El arroz',
    stickers: [
      { id: 'rio_sinu', icon: '🏞️', name: 'El río Sinú', cost: 1, text: 'Riega las vegas de Córdoba, donde se siembra el arroz.' },
      { id: 'garza_blanca', icon: '🕊️', name: 'La garza blanca', cost: 1, text: 'Sigue al tractor por el arrozal buscando bichos para comer.' },
      { id: 'pilon_arroz', icon: '🪵', name: 'El pilón', cost: 2, text: 'Antes el arroz se pilaba a mano, golpeándolo en un pilón de madera.' },
      { id: 'arroz_lisa', icon: '🐟', name: 'El arroz de lisa', cost: 2, text: 'Arroz con pescado lisa ahumado: el plato de Barranquilla.' },
      { id: 'mompox', icon: '⛪', name: 'Mompox', cost: 2, text: 'Pueblo colonial a orillas del Magdalena, rodeado de arrozales.' },
      { id: 'magdalena', icon: '🚣', name: 'El río Magdalena', cost: 3, text: 'Por él bajaban los champanes cargados de arroz, de queso y de todo.' },
    ],
  },
  {
    id: 'coco',
    icon: ICON.coconutPalm,
    name: 'El coco',
    stickers: [
      { id: 'palma_coco', icon: ICON.coconutPalm, name: 'La palma de coco', cost: 1, text: 'Crece a la orilla del mar y da cocos todo el año.' },
      { id: 'agua_coco', icon: ICON.coconut, name: 'El agua de coco', cost: 1, text: 'Se toma fría, del coco verde abierto a machete.' },
      { id: 'cocada_lamina', icon: ICON.cocada, name: 'La cocada', cost: 2, text: 'Dulce de coco con panela: blanca, de piña, de guayaba o de arequipe.' },
      { id: 'arroz_coco', icon: ICON.arrozConCoco, name: 'El arroz con coco', cost: 2, text: 'Con coco y panela: acompaña el pescado en todo almuerzo costeño.' },
      { id: 'enyucado', icon: '🍠', name: 'El enyucado', cost: 2, text: 'Torta de yuca con coco, queso costeño y anís.' },
      { id: 'tolu', icon: '🏖️', name: 'Tolú y Coveñas', cost: 3, text: 'Las playas del golfo de Morrosquillo, llenas de palmas de coco.' },
    ],
  },
  {
    id: 'cienaga',
    icon: ICON.canoe,
    name: 'La ciénaga',
    stickers: [
      { id: 'atarraya', icon: ICON.canoe, name: 'La atarraya', cost: 1, text: 'Red redonda que el pescador lanza desde la canoa y se abre en el aire.' },
      { id: 'bocachico', icon: ICON.fish, name: 'El bocachico', cost: 1, text: 'El pescado de río y de ciénaga más comido de la Costa.' },
      { id: 'palafitos', icon: '🛖', name: 'Los palafitos', cost: 2, text: 'Casas sobre pilotes en medio del agua, como las de Nueva Venecia.' },
      { id: 'manglar', icon: '🌳', name: 'El manglar', cost: 2, text: 'Árboles con las raíces en el agua, donde se crían los peces.' },
      { id: 'salado_sol', icon: ICON.saltedFish, name: 'El pescado salado', cost: 2, text: 'Abierto, salado y seco al sol para que aguante el viaje.' },
      { id: 'cienaga_grande', icon: '🏞️', name: 'La Ciénaga Grande', cost: 3, text: 'La laguna más grande de Colombia, entre el mar y el río Magdalena.' },
    ],
  },
  {
    id: 'sabana',
    icon: ICON.quesoCosteno,
    name: 'La sabana',
    stickers: [
      { id: 'vaca_cebu', icon: ICON.cebu, name: 'La vaca cebú', cost: 1, text: 'Blanca y con giba: aguanta el calor de la sabana.' },
      { id: 'ordeno_sabana', icon: ICON.ordenoMilk, name: 'El ordeño', cost: 1, text: 'De madrugada, a mano, con el ternero al lado de la vaca.' },
      { id: 'suero_costeno', icon: '🥣', name: 'El suero costeño', cost: 2, text: 'Crema agria y salada que se come con yuca, bollo y arepa.' },
      { id: 'bollo', icon: '🌽', name: 'El bollo limpio', cost: 2, text: 'Masa de maíz envuelta en hoja, el compañero del queso costeño.' },
      { id: 'mote', icon: ICON.moteQueso, name: 'El mote de queso', cost: 2, text: 'Sopa de ñame con queso costeño, el plato de Córdoba y Sucre.' },
      { id: 'porro', icon: '🎺', name: 'El porro', cost: 3, text: 'Música de banda de la sabana: trompetas, bombardino y redoblante.' },
    ],
  },
  {
    id: 'vueltiao',
    icon: ICON.sombreroVueltiao,
    name: 'El sombrero',
    stickers: [
      { id: 'cana_flecha', icon: ICON.canaFlechaPlant, name: 'La caña flecha', cost: 1, text: 'La palma de cuyas hojas sale la fibra del sombrero.' },
      { id: 'trenzadora', icon: ICON.trenza, name: 'La trenzadora', cost: 1, text: 'Trenza la fibra blanca y la negra con los dedos, sin mirar.' },
      { id: 'pintas', icon: '🔷', name: 'Las pintas', cost: 2, text: 'Las figuras de la trenza: cada una tiene su nombre y su historia.' },
      { id: 'zenues', icon: '🏺', name: 'Los zenúes', cost: 2, text: 'El pueblo que hizo canales en las ciénagas y orfebrería de oro.' },
      { id: 'vueltiao', icon: ICON.sombreroVueltiao, name: 'El vueltiao', cost: 2, text: 'Símbolo cultural de Colombia: la trenza cosida en vueltas.' },
      { id: 'tuchin', icon: '🏘️', name: 'Tuchín', cost: 3, text: 'Pueblo zenú de Córdoba, la capital del sombrero vueltiao.' },
    ],
  },
  {
    id: 'cartagena',
    icon: ICON.torreReloj,
    name: 'Cartagena',
    stickers: [
      { id: 'murallas', icon: '🧱', name: 'Las murallas', cost: 1, text: 'Once kilómetros de piedra coralina para cuidar la ciudad de los piratas.' },
      { id: 'torre_reloj', icon: ICON.torreReloj, name: 'La Torre del Reloj', cost: 1, text: 'La puerta principal de la ciudad amurallada.' },
      { id: 'palenquera', icon: '👩🏿', name: 'La palenquera', cost: 2, text: 'Vende frutas en la ponchera, con su vestido de colores. Viene de San Basilio de Palenque.' },
      { id: 'balcones_cartagena', icon: '🌺', name: 'Los balcones', cost: 2, text: 'Balcones de madera llenos de bugambilias en las casas coloniales.' },
      { id: 'san_felipe', icon: '🏰', name: 'El castillo de San Felipe', cost: 2, text: 'La fortaleza más grande que construyeron los españoles en América.' },
      { id: 'islas_rosario', icon: '🏝️', name: 'Las Islas del Rosario', cost: 3, text: 'Islas de arena blanca y corales, a una hora en lancha.' },
    ],
  },
];

export const ALBUM = [...CAFETERO.map((pg) => ({ ...pg, region: 'cafetero' })), ...SANTANDER.map((pg) => ({ ...pg, region: 'santander' })), ...COSTA.map((pg) => ({ ...pg, region: 'costa' }))];
// Las páginas del álbum de una región.
export const albumOf = (regionId) => ALBUM.filter((pg) => pg.region === regionId);

export const STICKERS_BY_ID = Object.fromEntries(ALBUM.flatMap((page) => page.stickers.map((s) => [s.id, { ...s, page: page.id }])));
