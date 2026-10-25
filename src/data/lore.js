// Ambiente (v1.8): un dato real de cada estación (rotan en el subtítulo de su panel) y una persona por
// zona que avisa lo importante. Los datos son cortos para caber en dos renglones del panel.

export const FACTS = {
  // La Finca
  farm: ['En Colombia el café se cultiva entre 1.200 y 2.000 metros de altura.', 'Desde la flor, la cereza de café tarda unos 8 meses en madurar.', 'Un cafeto da su primera cosecha al segundo o tercer año.', 'La mitaca es la cosecha chica del café, meses después de la grande.'],
  wetmill: ['El beneficio húmedo despulpa el grano el mismo día de la cosecha.', 'Después de despulpar, el café fermenta en tanques para soltar el mucílago.'],
  dryer: ['El café se seca hasta quedar con un 10 a 12 % de humedad.', 'La marquesina es un techo plástico que protege el café de la lluvia.'],
  huller: ['La trilladora quita el pergamino y deja el café verde o «excelso».', 'El café excelso se clasifica por el tamaño del grano, en mallas.'],
  roaster: ['Al tostarse, el grano pierde agua y casi duplica su tamaño.', 'En el tueste, el grano cruje como las crispetas: es el «primer crac».'],
  grinder: ['El café molido pierde aroma rápido: lo ideal es molerlo al prepararlo.'],
  packer: ['Las bolsas de café tienen una válvula que deja salir el gas del tueste.'],
  composter: ['La pulpa del café hecha compost le devuelve nutrientes al cafetal.', 'Las lombrices rojas convierten la pulpa en abono.'],
  // El Trapiche
  canefield: ['La caña panelera se corta cuando tiene entre 12 y 18 meses.'],
  cane_mill: ['En el trapiche, la caña pasa entre rodillos que le sacan el guarapo.', 'Los trapiches antiguos los movían mulas o bueyes dando vueltas.'],
  furnace: ['La hornilla quema el bagazo seco de la misma caña.', 'El guarapo hierve en pailas hasta volverse una miel espesa.'],
  molds: ['La miel caliente se bate y se vierte en gaveras de madera para que cuaje.'],
  pulverizer: ['Colombia es uno de los mayores productores de panela del mundo.', 'La panela pulverizada se disuelve fácil, hasta en agua fría.'],
  // La Lechería
  pasture: ['En tierra fría abundan las vacas Holstein y Normando.', 'Las vacas lecheras se ordeñan dos veces al día.'],
  pasteurizer: ['Pasteurizar es calentar la leche para eliminar microbios sin hervirla.', 'La pasteurización rápida calienta la leche a 72 °C por 15 segundos.'],
  cheesery: ['El queso campesino se hace cuajando la leche y prensando la cuajada.', 'Para un kilo de queso fresco se necesitan unos 7 litros de leche.'],
  separator: ['La descremadora gira muy rápido y separa la crema, más liviana.'],
  churn: ['La mantequilla se hace batiendo la crema hasta que la grasa se junta.'],
  arequipe_pot: ['El arequipe es leche con azúcar cocinada horas en paila de cobre.', 'El arequipe se revuelve sin parar para que no se pegue.'],
  // El Cacaotal
  cacao_grove: ['Las mazorcas de cacao nacen directamente del tronco del árbol.', 'Colombia produce cacao «fino de aroma», apreciado en el mundo.'],
  fermenter: ['El cacao fermenta de 5 a 7 días en cajones de madera.', 'La fermentación es la que desarrolla el sabor del chocolate.'],
  cacao_dryer: ['El cacao fermentado se seca al sol durante unos 5 a 7 días.'],
  cacao_roaster: ['El tostado suelta la cascarilla del grano y aviva su aroma.'],
  cacao_mill: ['Al molerse, el grano suelta su grasa y se vuelve una pasta líquida.'],
  chocolate_table: ['El chocolate de mesa se bate con molinillo, en agua o en leche.', 'En Colombia, el chocolate se toma con queso dentro de la taza.'],
  chocolatier: ['La chocolatina se hace con pasta de cacao, azúcar y leche.'],
  // El Maizal
  cornfield: ['El maíz es nativo de América y se cultiva hace miles de años.'],
  sheller: ['La desgranadora separa los granos de la tusa.'],
  corn_huller: ['Pilar el maíz es quitarle la cáscara golpeándolo en un pilón.'],
  dough_mill: ['El maíz pilado se cocina y luego se muele para hacer la masa.'],
  budare: ['El budare es una plancha redonda de barro o hierro para asar arepas.'],
  arepa_stand: ['Colombia tiene decenas de tipos de arepa, una por cada región.'],
  // El Pueblo
  coffee_house: ['Los cafés de origen llevan el nombre de la región donde se cultivan.'],
  greca: ['La greca es la cafetera grande de las cafeterías de pueblo.', 'En Colombia, un «tinto» es una taza de café negro.'],
  fonda: ['El desayuno campesino lleva arepa, huevos, caldo y chocolate.'],
  basket_shop: ['El fique es una planta de fibra fuerte para costales y canastos.'],
  gift_wrap: ['Las canastas de regalo juntan productos de varias regiones.'],
  export_dock: ['El café colombiano sale al mundo en contenedores desde los puertos.'],
  // Santander · La Guayabera
  guava_grove: ['Vélez y Barbosa, en Santander, son la tierra del bocadillo.', 'La guayaba tiene más vitamina C que la naranja.'],
  guava_pulper: ['La despulpadora separa la pulpa de las semillas duras de la guayaba.'],
  guava_pot: ['El bocadillo se cocina en paila, revolviendo, hasta que «hace punto».'],
  guava_molds: ['El bocadillo cuaja en moldes de madera antes de cortarlo.'],
  bocadillo_cutter: ['El bocadillo combinado lleva una capa de guayaba blanca y una roja.'],
  bijao_wrapper: ['La hoja de bijao seca envuelve el bocadillo veleño y le da su aroma.'],
  crate_packer: ['El bocadillo veleño se vende en cajitas de madera liviana.'],
  // Santander · El Tabacal
  tobacco_field: ['Santander es la tierra del tabaco negro en Colombia.', 'La mata de tabaco pasa del metro de alto y da flores rosadas.'],
  caney: ['El caney es un rancho alto y aireado donde la hoja se cuelga a secar.', 'Colgada en el caney, la hoja pasa del verde al dorado en semanas.'],
  stripper: ['Despalillar es quitarle a la hoja curada la vena gruesa del centro.'],
  tobacco_piles: ['Apiladas en pilones, las hojas se calientan solas al fermentar.', 'Al pilón hay que voltearlo para que no se queme por dentro.'],
  cigar_roller: ['Torcer un tabaco a mano es un oficio que se aprende de los mayores.', 'El tabaco lleva por dentro la tripa y por fuera una hoja fina: la capa.'],
  // Santander · La Fiquera
  fique_field: ['El fique es una planta de pencas largas de las que sale una fibra fuerte.', 'A la mata de fique se le cortan las pencas de abajo y sigue creciendo.'],
  decorticator: ['La desfibradora raspa la penca y deja solo la fibra.', 'La fibra de fique se lava y se pone a secar al sol.'],
  sack_loom: ['Por décadas, el café colombiano viajó en costales de fique.'],
  spinner: ['Con la fibra torcida se hace la cabuya, un hilo grueso y resistente.'],
  alpargata_shop: ['La alpargata tiene suela de fique trenzado y capellada de tela.', 'Curití, en Santander, es famoso por sus artesanías de fique.'],
  tercio_packer: ['La hoja de tabaco se empaca en pacas forradas con tela de fique.'],
  // Santander · El Hato
  cattle_ranch: ['Un hato es una finca grande dedicada a criar ganado.'],
  butcher: ['En Colombia, a la carnicería también se le dice «fama».'],
  salter: ['La carne para orear se corta en tiras delgadas y se adoba con sal.'],
  airing_rack: ['Orear es secar al aire: la carne se cuelga al sol y al viento.', 'La carne oreada es uno de los platos típicos de Santander.'],
  grill: ['La carne oreada se come asada, con yuca y pepitoria.'],
  lunch_table: ['Un buen almuerzo santandereano termina con un bocadillo de postre.'],
  fiambre_maker: ['El fiambre es el almuerzo envuelto en hojas para llevarlo al camino.', 'El fiambre se amarra con cabuya para que no se abra en el viaje.'],
  // Santander · Las Hormigas
  anthill: ['Las hormigas culonas salen a volar con las primeras lluvias del año.', 'Solo se cosechan las reinas, que salen del hormiguero a fundar otro.'],
  ant_cleaner: ['Antes de cocinarlas, a las hormigas se les quitan las alas y las patas.'],
  brine_pot: ['Antes de tostarlas, las hormigas se remojan en agua con sal.'],
  ant_toaster: ['Las hormigas se tuestan en tiesto de barro, revolviendo sin parar.', 'Las hormigas culonas se comen en Santander desde antes de los españoles.'],
  cone_table: ['En la calle se venden en cucuruchos de papel, como crispetas.'],
  souvenir_shop: ['Quien pasa por Santander se lleva hormigas, bocadillo y alpargatas.'],
  // Santander · Barichara
  dulceria: ['Barichara fue declarado Monumento Nacional en 1978.', 'Sus calles están empedradas con la piedra amarilla de la región.'],
  park_cafe: ['La sobremesa en el parque: un tinto, un dulce y la charla.'],
  posada: ['Las casas de Barichara son de tapia pisada, con tejas de barro.'],
  box_shop: ['En Barichara se hace papel a mano con fibra de fique.'],
  hamper: ['Los caminantes llevan fiambre para el camino, como los arrieros.'],
  camino_real: ['El Camino Real a Guane lo empedró Geo von Lengerke en el siglo XIX.', 'De Barichara a Guane se baja a pie en unas dos horas, entre piedras.'],
  // Costa · El Arrozal (v3.15)
  rice_field: ['Córdoba y el Tolima son de los que más arroz siembran en Colombia.', 'El arroz crece en terrenos inundados, con los pies en el agua.', 'Las garzas siguen al tractor en el arrozal buscando comida.'],
  rice_dryer: ['El arroz se cosecha húmedo: hay que secarlo para guardarlo.'],
  rice_huller: ['La cascarilla del arroz sirve de abono y de combustible.'],
  rice_polisher: ['Pulir el arroz le quita el salvado y lo deja blanco y brillante.'],
  rice_sorter: ['El arroz excelso tiene casi todos los granos enteros.'],
  rice_bagger: ['En la Costa no hay almuerzo sin arroz: de coco, de lisa…'],
  rice_stacker: ['Un bulto de arroz pesa 50 kilos y se carga al hombro.'],
  // Boyacá · La Cervecería (v3.23)
  barley_field: ['La cebada se da en el altiplano frío de Boyacá, junto al trigo.', 'De la cebada sale la malta, y de la malta, la cerveza.'],
  maltings: ['Maltear es dejar germinar el grano y luego secarlo con calor.'],
  brew_kettle: ['La malta molida se cocina en agua caliente: así sale el mosto dulce.'],
  fermenters: ['La levadura se come el azúcar del mosto y lo vuelve cerveza.', 'En Boyacá también se toma chicha, hecha con maíz fermentado.'],
  bottler: ['La cerveza se reparte en canastas de botellas retornables.'],
  // Boyacá · El Papal (v3.22)
  potato_field: ['Boyacá es uno de los departamentos que más papa siembra en Colombia.', 'La papa se da en tierra fría, entre los 2.500 y los 3.500 metros.', 'Hay papa pastusa, sabanera, tocarreña y la criolla, amarilla y chiquita.'],
  potato_washer: ['La papa se lava para quitarle la tierra negra del páramo.'],
  potato_grader: ['La papa se escoge por tamaño: la gruesa, la pareja y la menuda.'],
  potato_peeler: ['La papa criolla casi no se pela: su cáscara es delgadita.'],
  criollas_fryer: ['Las papitas criollas fritas acompañan la fritanga y el ají.'],
  criollas_bagger: ['En Colombia a los paquetes de papitas se les dice mecato.'],
  criollas_boxer: ['La papa colombiana se cultiva desde antes de los españoles.'],
  // Costa · Cartagena (v3.20)
  fogon_getsemani: ['Getsemaní era el barrio de los artesanos, junto a la ciudad amurallada.', 'El arroz con coco se hace con coco, panela y uvas pasas.'],
  restaurante_muralla: ['Las murallas de Cartagena miden unos once kilómetros.', 'Desde la muralla se ve la puesta de sol sobre el mar.'],
  hotel_colonial: ['Las casas coloniales tienen balcones de madera y patios con bugambilias.'],
  cocina_bahia: ['Cartagena es Patrimonio de la Humanidad desde 1984.'],
  loncheras: ['Las palenqueras venden frutas con su ponchera en la cabeza.'],
  muelle: ['Las Islas del Rosario son un parque nacional de corales.', 'De la ciudad a las islas se llega en lancha en una hora.'],
  // Costa · El Sombrero (v3.19)
  canaflechal: ['La caña flecha es una palma de hojas largas que crece en la sabana.', 'El sombrero vueltiao viene del pueblo zenú, de Córdoba y Sucre.'],
  fiber_scraper: ['De cada hoja se raspa la fibra blanca con un cuchillo.'],
  fiber_dyer: ['La fibra negra se tiñe con barro y hojas, y se pone a hervir.'],
  braiders: ['Cuantas más pares tenga la trenza, más fino es el sombrero.', 'Las figuras de la trenza se llaman pintas y cada una tiene nombre.'],
  hat_sewer: ['El sombrero se arma cosiendo la trenza en vueltas: de ahí, vueltiao.'],
  parador: ['El sombrero vueltiao es símbolo cultural de Colombia desde 2004.', 'En Tuchín se venden sombreros a la orilla de la carretera.'],
  // Costa · La Quesera (v3.18)
  milking_corral: ['La vaca cebú tiene una giba en el lomo y aguanta bien el calor.', 'En la sabana se ordeña a mano, de madrugada, con el ternero al lado.'],
  curdler: ['La leche se cuaja con cuajo: en unas horas queda la cuajada.'],
  curd_mill: ['La cuajada se muele con bastante sal: por eso el costeño es salado.'],
  cheese_press: ['El queso costeño se prensa en moldes de madera para sacarle el suero.'],
  mote_pot: ['El mote de queso es una sopa de ñame con queso costeño.', 'El mote de queso es el plato de Córdoba y Sucre.'],
  costeno_fonda: ['En la Costa no hay almuerzo sin arroz, y el mote se come con él.'],
  bandeja_kitchen: ['Pescado frito, arroz, patacón, queso y limón: bandeja completa.'],
  // Costa · La Ciénaga (v3.17)
  fishing_canoes: ['En la Ciénaga Grande hay pueblos de casas sobre el agua: palafitos.', 'El pescador tira la atarraya, una red redonda que se abre en el aire.'],
  fish_cleaner: ['El bocachico es el pescado más comido en los ríos y ciénagas.'],
  fish_salter: ['Salar el pescado y secarlo al sol era la forma de guardarlo.', 'El pescado salado llega a los pueblos para la Semana Santa.'],
  fish_filleter: ['El bocachico tiene muchas espinas: hay que saberlo filetear.'],
  fish_fryer: ['Pescado frito, patacón, arroz con coco y limón: el almuerzo costeño.'],
  coconut_fish_kitchen: ['El pescado se cocina en leche de coco con ají, cebolla y tomate.'],
  // Costa · El Cocal (v3.16)
  coconut_grove: ['La palma de coco da cocos todo el año, en racimos.', 'Un coco verde tiene agua dulce por dentro: se toma frío.'],
  coconut_peeler: ['El coco se pela a machete: la cáscara verde sirve de fibra.'],
  coconut_grater: ['El coco se ralla a mano, en un rallador de lata con huequitos.'],
  coconut_press: ['La leche de coco sale de exprimir el coco rallado en un trapo.', 'El arroz con coco se hace con leche de coco y panela.'],
  cocada_kitchen: ['Las palenqueras venden cocadas en las calles de Cartagena.', 'Hay cocadas blancas, de panela, de piña y de guayaba.'],
};

// Quién avisa en cada zona (en los avisos importantes, no en todos).
export const PEOPLE = {
  finca: { icon: '🧔', name: 'Don Jairo', role: 'el mayordomo' },
  trapiche: { icon: '👴', name: 'Don Aurelio', role: 'el trapichero' },
  lecheria: { icon: '👩‍🌾', name: 'Doña Marina', role: 'la ordeñadora' },
  cacaotal: { icon: '👨‍🌾', name: 'Don Eliécer', role: 'el cacaotero' },
  maizal: { icon: '👵', name: 'Doña Rosa', role: 'la arepera' },
  pueblo: { icon: '🧑‍💼', name: 'Mateo', role: 'el exportador' },
  guayabera: { icon: '👩‍🍳', name: 'Doña Inés', role: 'la bocadillera' },
  tabacal: { icon: '🧓', name: 'Don Ramiro', role: 'el veguero' },
  fiquera: { icon: '👩‍🦳', name: 'Doña Carmen', role: 'la tejedora' },
  hato: { icon: '🤠', name: 'Don Efraín', role: 'el vaquero' },
  hormigas: { icon: '👵', name: 'Doña Gloria', role: 'la hormiguera' },
  barichara: { icon: '👩', name: 'Lucía', role: 'la guía' },
  arrozal: { icon: '👨🏾‍🌾', name: 'Don Abelardo', role: 'el arrocero' },
  cocal: { icon: '👩🏾', name: 'Doña Eulalia', role: 'la cocadera' },
  cienaga: { icon: '🧔🏾', name: 'Don Aníbal', role: 'el pescador' },
  quesera: { icon: '👩🏽', name: 'Doña Rosmira', role: 'la quesera' },
  sombrero: { icon: '👴🏽', name: 'Don Eliécer', role: 'el artesano' },
  cartagena: { icon: '👩🏿', name: 'Doña Dionisia', role: 'la palenquera' },
  papal: { icon: '👨🏻‍🌾', name: 'Don Aurelio', role: 'el papicultor' },
  cerveceria: { icon: '🧔🏻', name: 'Don Hernando', role: 'el cervecero' },
};

// Lo que dicen al abrir su zona por primera vez.
export const WELCOME = {
  finca: '¡Bienvenido a la finca, patrón! Toque el Cafetal y mejórelo cuando tenga monedas.',
  trapiche: '¡Llegó a la molienda! Aquí la caña se vuelve panela.',
  lecheria: 'Las vacas ya están ordeñadas. ¡A hacer queso y arequipe!',
  cacaotal: 'Del cacao sale el chocolate más rico del país. ¡Manos a la obra!',
  maizal: 'Sin arepa no hay desayuno. ¡Prenda ese budare!',
  pueblo: 'Todo lo de sus fincas termina aquí. ¡A exportar!',
  guayabera: '¡Bienvenido a Santander, mijo! Aquí la guayaba se vuelve bocadillo veleño.',
  tabacal: '¡Llegó al Tabacal! Aquí la hoja se cura en el caney y se tuerce a mano.',
  fiquera: '¡Bienvenido a la Fiquera! De estas pencas sale la cabuya de los costales y las alpargatas.',
  hato: '¡Llegó al Hato, compadre! Aquí se hace la carne oreada, al sol y al viento.',
  barichara: '¡Bienvenido a Barichara! Aquí llega lo mejor de todo Santander, y de aquí salen las excursiones a Guane.',
  hormigas: '¡Bienvenido, mijo! Las hormigas solo salen en la entrada de aguas, pero tenemos la despensa llena de la última cosecha.',
  arrozal: '¡Ajá, bienvenido a la Costa, compa! Aquí el arroz crece con los pies en el agua.',
  cocal: '¡Ey, mi vida, bienvenido al Cocal! Aquí bajamos el coco de la palma y lo volvemos cocada.',
  cerveceria: '¡Qué más, sumercé! Aquí la cebada del altiplano se vuelve malta, y la malta, cerveza.',
  papal: '¡Sumercé, bienvenido a Boyacá! Aquí la papa se da en la tierra fría, entre la neblina y los eucaliptos.',
  cartagena: '¡Bienvenido a Cartagena, mi amor! Aquí llega lo mejor de toda la Costa, y de aquí salen las lanchas a las islas.',
  sombrero: '¡Bienvenido a Tuchín, compadre! Aquí la caña flecha se vuelve trenza, y la trenza, sombrero vueltiao.',
  quesera: '¡Ajá, mi amor, bienvenido a la sabana! De esta leche sale el queso costeño, y del queso, el mote.',
  cienaga: '¡Qué hubo, primo! Bienvenido a la Ciénaga. Aquí se pesca en canoa, con atarraya, como los abuelos.',
};

// «el Beneficiadero», «la Quesera», «las Gaveras», «los Cajones de fermentación».
export function withArticle(name) {
  const first = name.split(' ')[0];
  const article = first.endsWith('as') ? 'las' : first.endsWith('es') ? 'los' : first.endsWith('a') ? 'la' : 'el';
  return `${article} ${name}`;
}
const capital = (s) => s[0].toUpperCase() + s.slice(1);
export const WithArticle = (name) => capital(withArticle(name));
