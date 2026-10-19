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
};

// «el Beneficiadero», «la Quesera», «las Gaveras», «los Cajones de fermentación».
export function withArticle(name) {
  const first = name.split(' ')[0];
  const article = first.endsWith('as') ? 'las' : first.endsWith('es') ? 'los' : first.endsWith('a') ? 'la' : 'el';
  return `${article} ${name}`;
}
const capital = (s) => s[0].toUpperCase() + s.slice(1);
export const WithArticle = (name) => capital(withArticle(name));
