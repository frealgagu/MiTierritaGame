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

// El de Boyacá (v3.28): su papa, su cerveza, su barro, sus quesos, su lana y Villa de Leyva.
const BOYACA = [
  {
    id: 'papa',
    icon: ICON.potatoPlant,
    name: 'La papa',
    stickers: [
      { id: 'papa_criolla', icon: ICON.criollas, name: 'La papa criolla', cost: 1, text: 'Amarilla, chiquita y de cáscara delgada: se come frita o en el ajiaco.' },
      { id: 'papicultor', icon: '👨🏻‍🌾', name: 'El papicultor', cost: 1, text: 'Siembra, aporca y saca la papa a mano, con azadón.' },
      { id: 'cocido', icon: '🍲', name: 'El cocido boyacense', cost: 2, text: 'Papas, mazorca, habas, cubios, chuguas y carnes, todo cocinado junto.' },
      { id: 'cubios', icon: '🥔', name: 'Cubios y chuguas', cost: 2, text: 'Tubérculos del altiplano que se siembran desde los tiempos de los muiscas.' },
      { id: 'neblina', icon: '🌫️', name: 'La neblina', cost: 2, text: 'En la madrugada fría el páramo amanece cubierto de niebla.' },
      { id: 'muiscas', icon: '☀️', name: 'Los muiscas', cost: 3, text: 'El pueblo indígena del altiplano: cultivaban papa y adoraban al sol.' },
    ],
  },
  {
    id: 'cerveza',
    icon: ICON.beer,
    name: 'La cerveza',
    stickers: [
      { id: 'cebada', icon: ICON.barleyPlant, name: 'La cebada', cost: 1, text: 'Crece en el altiplano frío, junto al trigo, y se cosecha dorada.' },
      { id: 'malta', icon: ICON.malt, name: 'La malta', cost: 1, text: 'El grano germinado y tostado que le da color y sabor a la cerveza.' },
      { id: 'chicha', icon: '🫙', name: 'La chicha', cost: 2, text: 'Bebida de maíz fermentado, la de los muiscas y las fiestas de pueblo.' },
      { id: 'guarapo_b', icon: '🥤', name: 'El guarapo', cost: 2, text: 'Jugo de caña o de panela fermentado, para el trabajo del campo.' },
      { id: 'tejo', icon: '🎯', name: 'El tejo', cost: 2, text: 'El deporte nacional: se lanza el tejo a la mecha y ¡totea!' },
      { id: 'tibasosa', icon: '🍈', name: 'Tibasosa', cost: 3, text: 'Pueblo de la feijoa, de casas blancas, en el valle de Sogamoso.' },
    ],
  },
  {
    id: 'barro',
    icon: ICON.caballito,
    name: 'El barro',
    stickers: [
      { id: 'alfarera', icon: '👩🏽', name: 'La alfarera', cost: 1, text: 'Amasa, tornea y hornea el barro como le enseñaron sus abuelas.' },
      { id: 'caballito', icon: ICON.caballito, name: 'El caballito de Ráquira', cost: 1, text: 'Caballito de barro con ollitas a lado y lado, pintado de colores.' },
      { id: 'olla_negra', icon: ICON.ollaBarro, name: 'La olla negra', cost: 2, text: 'Para cocinar a fuego lento: dicen que la comida sabe mejor.' },
      { id: 'alcancia', icon: '🐷', name: 'La alcancía', cost: 2, text: 'Marranito de barro para guardar monedas; se rompe para sacarlas.' },
      { id: 'candelaria', icon: '⛪', name: 'La Candelaria', cost: 2, text: 'El desierto y el monasterio de La Candelaria, junto a Ráquira.' },
      { id: 'raquira_pueblo', icon: '🏘️', name: 'Ráquira', cost: 3, text: 'El pueblo de las ollas, con sus casas pintadas de colores vivos.' },
    ],
  },
  {
    id: 'quesos',
    icon: ICON.quesoPaipa,
    name: 'Los quesos',
    stickers: [
      { id: 'queso_paipa_l', icon: ICON.quesoPaipa, name: 'El queso Paipa', cost: 1, text: 'Madurado semanas en la cava: tiene denominación de origen.' },
      { id: 'almojabana_l', icon: ICON.almojabana, name: 'La almojábana', cost: 1, text: 'Pan redondo de cuajada, queso y maíz, para el desayuno.' },
      { id: 'kumis_paipa', icon: '🥛', name: 'El kumis', cost: 2, text: 'Leche fermentada, espesa y dulce, con un pedazo de almojábana.' },
      { id: 'piquete_l', icon: ICON.piquete, name: 'El piquete', cost: 2, text: 'Papa criolla, mazorca, carnes y ají, para comer con la mano.' },
      { id: 'termales', icon: '♨️', name: 'Los termales', cost: 2, text: 'Las aguas calientes de Paipa, que salen de la tierra con vapor.' },
      { id: 'pantano_vargas', icon: '🗿', name: 'El Pantano de Vargas', cost: 3, text: 'Donde los catorce lanceros ganaron la batalla de 1819.' },
    ],
  },
  {
    id: 'lana',
    icon: ICON.ruana,
    name: 'La lana',
    stickers: [
      { id: 'oveja', icon: ICON.sheep, name: 'La oveja', cost: 1, text: 'Su lana gruesa aguanta el frío del páramo.' },
      { id: 'rueca', icon: ICON.woolYarn, name: 'La rueca', cost: 1, text: 'La rueda con la que se tuerce la lana cardada hasta volverla hilo.' },
      { id: 'telar_l', icon: '🧶', name: 'El telar', cost: 2, text: 'Telar de madera donde la ruana crece franja por franja.' },
      { id: 'ruana_l', icon: ICON.ruana, name: 'La ruana', cost: 2, text: 'Manta de lana con un hueco para la cabeza: el abrigo de Boyacá.' },
      { id: 'frailejon', icon: '🌼', name: 'El frailejón', cost: 2, text: 'La planta peluda del páramo, que guarda el agua de la niebla.' },
      { id: 'nobsa', icon: '🏘️', name: 'Nobsa', cost: 3, text: 'El pueblo de las ruanas, cerca de Sogamoso.' },
    ],
  },
  {
    id: 'villa_leyva',
    icon: ICON.iglesiaVilla,
    name: 'Villa de Leyva',
    stickers: [
      { id: 'plaza_mayor', icon: '🪨', name: 'La plaza empedrada', cost: 1, text: 'Una de las plazas más grandes de Colombia, toda de piedra.' },
      { id: 'casonas', icon: ICON.nocheVilla, name: 'Las casonas', cost: 1, text: 'Casas coloniales blancas, con balcones y puertas verdes.' },
      { id: 'kronosaurio', icon: ICON.excursionFosil, name: 'El kronosaurio', cost: 2, text: 'El fósil de un reptil marino de cuando todo esto era mar.' },
      { id: 'cometas', icon: '🪁', name: 'Las cometas', cost: 2, text: 'En agosto, con los vientos, el cielo de la villa se llena de cometas.' },
      { id: 'pozos_azules', icon: '💧', name: 'Los Pozos Azules', cost: 2, text: 'Lagunitas de agua azul en medio del desierto, cerca del pueblo.' },
      { id: 'casa_terracota', icon: '🏺', name: 'La casa de barro', cost: 3, text: 'Una casa entera hecha de barro cocido, como una gran vasija.' },
    ],
  },
];

// Los Llanos (v3.37).
const LLANOS = [
  {
    id: 'palma',
    icon: ICON.oilPalm,
    name: 'La palma',
    stickers: [
      { id: 'palma_aceite', icon: ICON.oilPalm, name: 'La palma de aceite', cost: 1, text: 'Vino de África y da racimos rojos todo el año en las sabanas del Meta.' },
      { id: 'moriche', icon: '🌴', name: 'La palma de moriche', cost: 1, text: 'Crece en los morichales, donde nace el agua del Llano.' },
      { id: 'aceite_rojo', icon: ICON.palmOil, name: 'El aceite rojo', cost: 2, text: 'Del fruto sale el aceite rojo; de la semilla, el de palmiste.' },
      { id: 'comejenera', icon: '🐜', name: 'La comejenera', cost: 2, text: 'Montículo de tierra roja que levantan los comejenes en la sabana.' },
      { id: 'corocora', icon: '🐦', name: 'La corocora', cost: 2, text: 'El ave roja de los esteros: vuela en bandadas al atardecer.' },
      { id: 'atardecer_llanero', icon: '🌅', name: 'El atardecer llanero', cost: 3, text: 'El sol se pone rojo sobre la sabana que no tiene fin.' },
    ],
  },
  {
    id: 'frutas_llano',
    icon: ICON.passionFruit,
    name: 'Las frutas',
    stickers: [
      { id: 'maracuya', icon: ICON.passionFruit, name: 'El maracuyá', cost: 1, text: 'Ácido y perfumado: se toma en jugo, en postre o en salsa.' },
      { id: 'mango_llanero', icon: '🥭', name: 'El mango', cost: 1, text: 'Los palos de mango dan sombra y fruta en todas las fincas del Llano.' },
      { id: 'pina_llanera', icon: '🍍', name: 'La piña', cost: 2, text: 'En el Meta se siembra piña dulce para todo el país.' },
      { id: 'araza', icon: '🍋', name: 'El arazá', cost: 2, text: 'Fruta amarilla y ácida de la Orinoquía, para jugos y helados.' },
      { id: 'pan_arroz', icon: '🍞', name: 'El pan de arroz', cost: 2, text: 'Pan de harina de arroz y queso, el desayuno llanero.' },
      { id: 'masato', icon: '🥛', name: 'El masato', cost: 3, text: 'Bebida de arroz fermentado, dulce y espesa, que se toma fría.' },
    ],
  },
  {
    id: 'rios_llano',
    icon: ICON.cachama,
    name: 'Los ríos',
    stickers: [
      { id: 'cachama_rio', icon: ICON.cachama, name: 'La cachama', cost: 1, text: 'Pez redondo de los ríos llaneros que también se cría en estanques.' },
      { id: 'rio_meta', icon: '🌊', name: 'El río Meta', cost: 1, text: 'Cruza los Llanos hasta el Orinoco; por él bajan los planchones.' },
      { id: 'chiguiro', icon: '🐹', name: 'El chigüiro', cost: 2, text: 'El roedor más grande del mundo: vive en grupos junto al agua.' },
      { id: 'babilla', icon: '🐊', name: 'La babilla', cost: 2, text: 'Pequeño caimán de los esteros que se asolea en las orillas.' },
      { id: 'tonina', icon: '🐬', name: 'La tonina', cost: 2, text: 'El delfín rosado de los ríos de la Orinoquía.' },
      { id: 'anaconda', icon: '🐍', name: 'La anaconda', cost: 3, text: 'La gran serpiente de los esteros, que nada sin hacer ruido.' },
    ],
  },
  {
    id: 'hato_llano',
    icon: ICON.mamona,
    name: 'El hato',
    stickers: [
      { id: 'vaquero_llanero', icon: '🤠', name: 'El vaquero llanero', cost: 1, text: 'Arrea el ganado a caballo por la sabana, cantando.' },
      { id: 'mamona_vara', icon: ICON.mamona, name: 'La mamona', cost: 1, text: 'Ternera asada en varas junto al fuego: la carne a la llanera.' },
      { id: 'cebu_llanero', icon: ICON.cebu, name: 'El cebú', cost: 2, text: 'Ganado blanco con giba, que aguanta el sol del Llano.' },
      { id: 'sanmartinero', icon: '🐂', name: 'El sanmartinero', cost: 2, text: 'Ganado criollo rojizo de San Martín, criado en el Llano por siglos.' },
      { id: 'cabrestero', icon: '🎶', name: 'El cabrestero', cost: 2, text: 'El que va adelante del ganado, cantando para guiarlo.' },
      { id: 'hallaca', icon: '🫔', name: 'La hallaca', cost: 3, text: 'Masa de maíz rellena de carne, envuelta en hoja de plátano.' },
    ],
  },
  {
    id: 'caballo_llano',
    icon: ICON.saddle,
    name: 'El caballo',
    stickers: [
      { id: 'caballo_criollo', icon: '🐎', name: 'El caballo criollo', cost: 1, text: 'Pequeño y fuerte, el compañero del llanero en la sabana.' },
      { id: 'silla_llanera', icon: ICON.saddle, name: 'La silla llanera', cost: 1, text: 'De cuero, con la cabeza alta para enlazar el ganado.' },
      { id: 'cotizas', icon: '👡', name: 'Las cotizas', cost: 2, text: 'Las alpargatas del llanero, de cuero y suela.' },
      { id: 'sombrero_llanero', icon: '👒', name: 'El sombrero llanero', cost: 2, text: 'De ala ancha, para el sol; el de pelo de guama es el más fino.' },
      { id: 'coleo', icon: '🐂', name: 'El coleo', cost: 2, text: 'El jinete tumba al toro halándolo por la cola, a todo galope.' },
      { id: 'zamarro', icon: ICON.leather, name: 'El zamarro', cost: 3, text: 'El delantal de cuero que protege al vaquero al enlazar.' },
    ],
  },
  {
    id: 'villavicencio',
    icon: ICON.canoCristales,
    name: 'Villavicencio',
    stickers: [
      { id: 'puerta_llano', icon: '🚪', name: 'La Puerta del Llano', cost: 1, text: 'Así le dicen a Villavicencio: de ahí para allá empieza la sabana.' },
      { id: 'joropo', icon: '💃', name: 'El joropo', cost: 1, text: 'Se baila zapateando, al son del arpa, el cuatro y las maracas.' },
      { id: 'arpa_llanera', icon: '🎵', name: 'El arpa llanera', cost: 2, text: 'Lleva la melodía del joropo con sus muchas cuerdas.' },
      { id: 'cuatro', icon: '🎸', name: 'El cuatro', cost: 2, text: 'Guitarrita de cuatro cuerdas que rasguea el ritmo.' },
      { id: 'cano_cristales', icon: ICON.canoCristales, name: 'Caño Cristales', cost: 2, text: 'El río de los cinco colores, en la sierra de La Macarena.' },
      { id: 'macarena', icon: '⛰️', name: 'La Macarena', cost: 3, text: 'Sierra muy antigua, entre los Andes, el Llano y la selva.' },
    ],
  },
];

// La Costa Pacífica (v3.44).
const PACIFICO = [
  {
    id: 'selva_pacifico',
    icon: ICON.plantainPlant,
    name: 'La selva',
    stickers: [
      { id: 'platano_album', icon: ICON.plantainPlant, name: 'El plátano', cost: 1, text: 'Verde para el patacón y el tapao; maduro, para la tajada.' },
      { id: 'chontaduro', icon: '🌴', name: 'El chontaduro', cost: 1, text: 'El fruto rojo de una palma espinosa: se come cocido, con sal y miel.' },
      { id: 'borojo', icon: '🟤', name: 'El borojó', cost: 2, text: 'Fruta parda y ácida del Chocó: se toma en jugo, dulce o en sorbete.' },
      { id: 'rana_dorada', icon: '🐸', name: 'La rana dorada', cost: 2, text: 'Pequeña y amarilla, vive solo en las selvas del Pacífico colombiano.' },
      { id: 'lluvia_choco', icon: '🌧️', name: 'La lluvia', cost: 2, text: 'En Lloró, Chocó, llueve casi todo el año: de lo más lluvioso del mundo.' },
      { id: 'heliconia_pacifico', icon: '🌺', name: 'La heliconia', cost: 3, text: 'Flor roja y amarilla de la selva húmeda, que visitan los colibríes.' },
    ],
  },
  {
    id: 'cocina_pacifico',
    icon: ICON.alino,
    name: 'La cocina',
    stickers: [
      { id: 'azotea_album', icon: ICON.azotea, name: 'La azotea', cost: 1, text: 'La huerta alzada en pilotes, donde la abuela siembra sus hierbas.' },
      { id: 'chillangua', icon: ICON.herbs, name: 'La chillangua', cost: 1, text: 'El cilantro cimarrón: de hoja larga y olor fuerte, va en todo.' },
      { id: 'tapao_album', icon: ICON.tapao, name: 'El tapao', cost: 2, text: 'Pescado con plátano verde y hierbas, cocinado en olla tapada.' },
      { id: 'encocado_album', icon: ICON.encocado, name: 'El encocado', cost: 2, text: 'Piangua, jaiba o pescado cocinados en leche de coco.' },
      { id: 'arroz_clavado', icon: '🍚', name: 'El arroz clavado', cost: 2, text: 'Arroz con queso costeño y longaniza, como lo hacen en el Chocó.' },
      { id: 'viche', icon: '🍶', name: 'El viche', cost: 3, text: 'La bebida de caña de los abuelos, patrimonio del Pacífico.' },
    ],
  },
  {
    id: 'mar_pacifico',
    icon: ICON.pargo,
    name: 'El mar',
    stickers: [
      { id: 'pargo_album', icon: ICON.pargo, name: 'El pargo rojo', cost: 1, text: 'El pez de las rocas del Pacífico, que se pesca con anzuelo.' },
      { id: 'potrillo', icon: '🛶', name: 'El potrillo', cost: 1, text: 'La canoa pequeña de un solo tronco, para los esteros y los ríos.' },
      { id: 'piangua_album', icon: ICON.piangua, name: 'La piangua', cost: 2, text: 'La concha negra del manglar que sacan a mano las piangüeras.' },
      { id: 'mangle', icon: ICON.mangrove, name: 'El manglar', cost: 2, text: 'Los mangles de raíces zancudas, donde nacen peces, jaibas y conchas.' },
      { id: 'tortuga', icon: '🐢', name: 'La tortuga', cost: 2, text: 'Las tortugas marinas llegan de noche a poner sus huevos en la playa.' },
      { id: 'ballena', icon: ICON.ballenas, name: 'La ballena jorobada', cost: 3, text: 'De julio a octubre llega a las aguas tibias del Pacífico a tener su cría.' },
    ],
  },
  {
    id: 'musica_pacifico',
    icon: '🥁',
    name: 'La música',
    stickers: [
      { id: 'marimba', icon: '🎹', name: 'La marimba de chonta', cost: 1, text: 'El piano de la selva, de tablas de palma; suena en el currulao.' },
      { id: 'cununo', icon: '🥁', name: 'El cununo', cost: 1, text: 'Tambor de un solo parche que se toca con las manos.' },
      { id: 'guasa', icon: '🎋', name: 'El guasá', cost: 2, text: 'Tubo de guadua con semillas adentro, que sacuden las cantadoras.' },
      { id: 'currulao', icon: '💃', name: 'El currulao', cost: 2, text: 'Baile de marimba y tambores: patrimonio de la humanidad.' },
      { id: 'chirimia', icon: '🎺', name: 'La chirimía', cost: 2, text: 'Clarinete, bombardino, redoblante, tambora y platillos: la banda del Chocó.' },
      { id: 'san_pacho', icon: '🎉', name: 'San Pacho', cost: 3, text: 'Las fiestas de San Francisco de Asís en Quibdó, con desfiles y chirimía.' },
    ],
  },
  {
    id: 'manos_pacifico',
    icon: ICON.werregueJar,
    name: 'Las manos',
    stickers: [
      { id: 'werregue_album', icon: ICON.werregueJar, name: 'El werregue', cost: 1, text: 'Los jarrones tejidos por los wounaan con la fibra de una palma.' },
      { id: 'tambo', icon: '🛖', name: 'El tambo', cost: 1, text: 'La casa redonda sobre pilotes, abierta y con techo de palma.' },
      { id: 'catanga', icon: '🧺', name: 'La catanga', cost: 2, text: 'El canasto que la piangüera lleva a la espalda.' },
      { id: 'canalete', icon: '🛶', name: 'El canalete', cost: 2, text: 'El remo tallado en madera, con la pala en forma de hoja.' },
      { id: 'casa_pilotes', icon: '🏠', name: 'La casa en pilotes', cost: 2, text: 'Las casas de tabla se alzan del suelo para que no las alcance el agua.' },
      { id: 'jagua_achiote', icon: '🎨', name: 'La jagua y el achiote', cost: 3, text: 'Los tintes de la selva: el negro de la jagua y el rojo del achiote.' },
    ],
  },
  {
    id: 'buenaventura',
    icon: ICON.ballenas,
    name: 'Buenaventura',
    stickers: [
      { id: 'puerto', icon: '🚢', name: 'El puerto', cost: 1, text: 'Por Buenaventura entra y sale buena parte de lo que comercia Colombia.' },
      { id: 'malecon', icon: '🌅', name: 'El malecón', cost: 1, text: 'Donde se camina al atardecer, con ceviche y la brisa del mar.' },
      { id: 'marranitas_album', icon: ICON.marranitas, name: 'Las marranitas', cost: 2, text: 'Bolitas de plátano verde rellenas de chicharrón.' },
      { id: 'juanchaco', icon: '🏖️', name: 'Juanchaco y Ladrilleros', cost: 2, text: 'Las playas a donde se llega en lancha desde Buenaventura.' },
      { id: 'festival_folclorico', icon: '🥁', name: 'El Festival Folclórico', cost: 2, text: 'La fiesta del puerto, con marimba, currulao y reinado.' },
      { id: 'ballena_salto', icon: ICON.ballenas, name: 'El salto de la ballena', cost: 3, text: 'La ballena saca todo el cuerpo del agua y cae con un estruendo.' },
    ],
  },
];

export const ALBUM = [...CAFETERO.map((pg) => ({ ...pg, region: 'cafetero' })), ...SANTANDER.map((pg) => ({ ...pg, region: 'santander' })), ...COSTA.map((pg) => ({ ...pg, region: 'costa' })), ...BOYACA.map((pg) => ({ ...pg, region: 'boyaca' })), ...LLANOS.map((pg) => ({ ...pg, region: 'llanos' })), ...PACIFICO.map((pg) => ({ ...pg, region: 'pacifico' }))];
// Las páginas del álbum de una región.
export const albumOf = (regionId) => ALBUM.filter((pg) => pg.region === regionId);

export const STICKERS_BY_ID = Object.fromEntries(ALBUM.flatMap((page) => page.stickers.map((s) => [s.id, { ...s, page: page.id }])));
