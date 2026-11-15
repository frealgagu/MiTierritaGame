// Grand finale (v5.9): once every achievement is earned, the keeper of every zone congratulates the player,
// region by region, each in the way of speaking of their land. Spanish is the source (translations go in
// src/i18n/*/content/finale.js). Kept family-friendly: no alcohol, tobacco or swearing.

// What each keeper says, by zone.
export const FINALE_LINES = {
  // Eje Cafetero: paisa
  finca: '¡Ave María, pues, patrón! Usted sí se lo ganó todito, ¡qué berraquera!',
  trapiche: '¡Eh, Dios mío! Esto se celebra con aguapanela y melcocha, mijo.',
  lecheria: '¡Ay, mi amor, qué orgullo! Hasta las vacas están contentas, pues.',
  cacaotal: '¡Qué cosa tan buena, hombre! Le guardé el chocolate más rico de la cosecha.',
  maizal: '¡Ay, mijito, venga le doy una arepa con quesito, que se la ganó!',
  pueblo: '¡Parce, lo logró! El contenedor de la victoria ya va pa’l puerto.',
  // Santander
  guayabera: '¡Ome, qué verraquera! Le envolví un bocadillo veleño de premio.',
  tabacal: '¡Ve, hombre! Usted sí es mucho berraco, ¡así es que se trabaja!',
  fiquera: '¡Ay, mijo, le tejí unas alpargatas pa’ que baile toda la noche!',
  hato: '¡Hágale, pues, hombre! Esto se celebra con carne oreada y pepitoria.',
  hormigas: '¡Ome, qué felicidad! Tome sus hormiguitas culonas, que son de buena suerte.',
  barichara: '¡Bienvenido al pueblito más lindo, campeón! Por el Camino Real ya se oye la fiesta.',
  // La Costa: costeño
  arrozal: '¡Ajá, mi llave! ¡Usted sí es un duro, compa!',
  cocal: '¡Eche, mijo, qué alegría tan grande! Coma cocada, que hay pa’ todos.',
  cienaga: '¡Ajá, cuadro! Vamo’ a celebrá con pescao frito y patacón.',
  quesera: '¡Ay, hombe, qué cosa tan bonita! Le tengo un queso costeño de premio.',
  sombrero: '¡Póngase el vueltiao, compa, que esto es pa’ bailá cumbia toda la noche!',
  cartagena: '¡Alegría, alegría! Cocadas y caballitos pa’ mi campeón, ¡ay, cariño!',
  // Boyacá
  papal: '¡Sumercé, qué maravilla! Dios le pague por tanto trabajito.',
  cerveceria: '¡Qué hubo, sumercé! Esto merece un caldito de papa bien calientico.',
  raquira: '¡Ay, sumercé, le hice una ollita de barro con su nombre!',
  paipa: '¡Qué alegría, mi señor! Venga, que le tengo almojábanas recién horneadas.',
  ruanas: '¡Póngase esta ruanita, sumercé, que la fiesta va hasta la madrugada!',
  villa_leyva: '¡Sumercé, hasta el fósil está aplaudiendo! Bienvenido a la fiesta.',
  // Los Llanos: llanero
  palma: '¡Epa, compadre! ¡Se lució como garza en el estero!',
  frutal: '¡Ay, catire, qué orgullo! Jugo de maracuyá pa’ todo el mundo.',
  cachamera: '¡Ajá, camarita! Hoy hasta las cachamas bailan joropo.',
  hato_llanero: '¡Epa, catire! Ensille el caballo, ¡que nos vamos de parranda llanera!',
  talabarteria: '¡Compadre, esta silla nueva es pa’ usted, que se la ganó a pulso!',
  villavicencio: '¡Bienvenido, camarita! Caño Cristales se pintó de todos los colores pa’ usted.',
  // Costa Pacífica
  platanal: '¡Ey, mi hermano! ¡Usté sí es bien berraco, oís!',
  azotea: '¡Ay, mi pariente, le tengo un sudao con toda la sazón de la azotea!',
  bahia: '¡Eso, mi hermano! ¡Hasta las ballenas brincan de la alegría!',
  manglar: '¡Ay, mi niño, qué contenta estoy! Piangua y currulao pa’ celebrá.',
  werregue: 'Mi hermano, le tejimos una canasta de werregue con mucho cariño.',
  buenaventura: '¡Ey, ey! ¡Que suene la marimba, que llegó el campeón al puerto!',
  // Amazonas
  asaizal: '¡Lo logró, paisano! Hasta los delfines rosados están saltando.',
  ajizal: '¡Ay, hijito, qué alegría! Le preparé ají negro, del bravo.',
  lago: '¡Bien hecho, paisano! El pirarucú más grande del lago es pa’ usted.',
  casaberia: 'Mi nieto, la selva entera canta por usted. Coma casabe, que es bendito.',
  yanchama: 'Hermano, le pintamos una yanchama para que la selva recuerde su historia.',
  leticia: '¡Parabéns, paisano! En tres países se oye la celebración.',
  // Tolima Grande: opita y tolimense
  achirales: '¡Ay, sí, mijo, qué juicio! Bizcochos de achira pa’ toda la familia.',
  cafe_huila: '¡Opa, mano! Un tintico del Huila pa’ celebrar por usted.',
  betania: '¡Eso, mano! Hasta la represa se puso de fiesta.',
  lechoneria: '¡Ay, mijito, la lechona tolimense ya está lista, y es toda suya!',
  chamba: '¡Qué orgullo, mano! Le hice una cazuela negrita de La Chamba.',
  neiva: '¡Que suene el sanjuanero, mano, que esto es pa’ bailar!',
  // Cundinamarca
  flores: '¡Ay, sumercé, le armé un ramo con todas las flores de la Sabana!',
  fresas: '¡Qué hubo, sumercé! Fresas con crema pa’ endulzar la fiesta.',
  truchas: '¡Muy bien, sumercé! Una trucha de Guatavita pa’l campeón.',
  salinas: '¡Sumercé, qué berraquera! Le guardé la sal más fina de Nemocón.',
  cocina: '¡Ay, mijo, siéntese, que le sirvo un ajiaco bien santafereño!',
  zipaquira: '¡Qué hubo, chino! Hasta la Catedral de Sal se iluminó por usted.',
  // Bogotá: rolo
  bogota: '¡Ala, chino, qué nota! Venga se toma un chocolatico con queso, que se lo ganó.',
  // The special zone: Raizal (island Creole and Spanish)
  sanandres: '¡Yu dida bes, mi fren! Bienvenido a la fiesta del mar de siete colores.',
};

// Opening and closing cards.
export const FINALE_TEXT = {
  title: '🎉 ¡Gran final!',
  intro: 'Todos los logros, en todas las regiones. Colombia entera vino a felicitarte.',
  outro: '¡Gracias por recorrer Colombia con nosotros!',
  thanks: 'Encantos de Mi Tierrita',
};
