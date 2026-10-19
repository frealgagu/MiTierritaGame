# Registro de cambios

## v1.8.1 — Horas sin conexión por zona
- **Horas sin conexión**: cada zona tiene ahora su investigación que suma horas a las ganancias sin conexión, y se suman entre sí: Capataz (Finca) +3 h, Trapichero de confianza (Trapiche) +3 h, Ordeño programado (Lechería) +4 h, Vigilante del cacaotal +4 h, Vecina que cuida el budare (Maizal) +4 h y Administrador del Pueblo +4 h. Con la base de 2 h, **24 h** con las seis. (El Capataz daba 6 h; ahora da 5 h hasta comprar la del Trapiche.)
- **Opciones de desarrollador**: el tiempo acelerado ya no multiplica el tiempo fuera; sin conexión cuenta a velocidad normal (multiplicarlo hacía que volver tardara mucho en calcularse).
- **Arreglo**: con bandas eléctricas, la banda llegaba hasta la puerta de la bodega por el patio, y el Willys le pasaba por encima. Ahora termina antes del patio, junto a la pared de la bodega.

## v1.8.0 — Datos reales y la gente de cada zona
- **Datos reales**: el subtítulo del panel de cada estación alterna, cada 7 segundos, entre lo que hace y uno o varios datos reales («En Colombia el café se cultiva entre 1.200 y 2.000 metros de altura», «El cacao fermenta de 5 a 7 días en cajones de madera»…). Hay al menos uno por cada una de las 38 estaciones.
- **La gente de cada zona**: Don Jairo (el mayordomo de la Finca), Don Aurelio (el trapichero), Doña Marina (la ordeñadora), Don Eliécer (el cacaotero), Doña Rosa (la arepera) y Mateo (el exportador del Pueblo). Dan la bienvenida la primera vez que se ve su zona, avisan cuando ya alcanza para construir la siguiente estación y cuando aparece un problema que dura (las mulas no dan abasto, la siguiente estación no alcanza, la bodega se llenó, una estación esperando producto…). Sin cansar: cada estación avisa como mucho una vez cada 5 minutos y entre aviso y aviso pasan al menos 45 segundos; con una ventana abierta, esperan.
- El plan de las próximas versiones (ambiente, jornada y temporadas, eventos e insignias) quedó en el documento de diseño.

## v1.7.16 — Un ícono para cada producto
- Ningún producto comparte ícono y todos se parecen a lo que son. 19 íconos propios nuevos:
  - **Finca**: café lavado (granos claros mojados, antes 💧), pulpa (las cáscaras rojas abiertas, antes 🟥), café pergamino (con su cascarilla, antes 🟫 como la pasta de cacao), café verde (antes 🟢), café tostado (antes 🟤 como el compost), café molido (antes ☕ como el tinto), bolsa de café (paquete kraft con su etiqueta, antes 🛍️), compost (tierra con lombriz y un brote) y el Cafetal como una mata de café con cerezas.
  - **Trapiche**: bagazo (las fibras de la caña, antes 🌾 como el maíz desgranado).
  - **Lechería**: leche cruda en la cantina de aluminio.
  - **Cacaotal**: mazorca de cacao (antes un mango 🥭) y pasta de cacao en una totuma.
  - **Maizal**: maíz desgranado (granos amarillos), maíz pilado (granos blancos en el pilón, antes ⚪) y masa de maíz (antes 🥣).
  - **Pueblo**: café de origen (costal de fique con granos tostados y la franja de Colombia, antes 🫘 como el cacao fermentado), desayuno campesino (arepa, huevo y chocolate; también para la Fonda) y contenedor de exportación (también para el Patio de contenedores).
- Investigaciones: Beneficio ecológico 🪱 (acelera la Compostera), Tueste de origen 🏅 (sube el precio, como las demás), Chiva para el Trapiche 🚚 (mejora el despacho, no una ruta) y Secador mecánico ☀️.

## v1.7.15 — Subir una ruta
- **Arreglo**: al subir de nivel una ruta (por ejemplo, ×10 en la de la mantequilla, desde su panel o desde la pestaña 🚌 de la estación) se cobraba, pero el panel seguía mostrando el nivel de antes hasta cerrarlo y volverlo a abrir o cambiar de pestaña. El efecto del mapa para «subió de nivel» buscaba la zona de la ruta como si fuera una estación, fallaba y cortaba la compra a medias (tampoco se recalculaba la mejora recomendada). Ahora la subida de una ruta se celebra en la estación que abastece, si está en la zona que se ve.
- Más resistente: si algo falla al avisar un evento o al dibujar un cuadro, el resto sigue (antes un error en un cuadro podía detener el juego hasta recargar).

## v1.7.14 — Arepas
- **Arepa** sola con ícono propio: una arepa grande, dorada y tostada en el budare, en vez del pan plano (🫓).
- **Arepas de queso**: el queso blanco derretido ahora rebasa el borde de la arepa y chorrea por el canto.
- `src/data/icons.js` lo genera ahora `tools/icons/build_icons.py` junto con la fuente.

## v1.7.13 — Más íconos propios
- **Cacao seco**: granos color canela secándose en una estera, para distinguirlo del fermentado (🫘). El **cacao tostado** también tiene el suyo: granos oscuros en el tiesto, con humo. Así los tres pasos del cacao se ven distintos.
- **Chocolatina con leche**: una barra de chocolate con leche, medio desenvuelta en su papel azul, en vez del dulce (🍬). También para la Chocolatería y la Temperadora.
- **Arepas de queso**: dos arepas doradas, tostadas en el budare, con el queso blanco derretido, en vez del sándwich (🥪). También para el Puesto de arepas y la Plancha doble.

## v1.7.12 — El segundo final, después del primero
- Para el segundo final (todas las estaciones al nivel 100) ahora también hace falta el primero: el Pueblo completo, con los 7.000 contenedores exportados y cobrados. Antes se podía llegar al segundo final teniendo todo al 100 sin haber terminado el Pueblo.
- Si ya está todo al 100 cuando se cobra el final del Pueblo, primero sale su pantalla y, al cerrarla, la del segundo final.

## v1.7.11 — La Quesera no se queda atrás
- **Arreglo**: una estación por debajo del nivel de la anterior no recibía nada si su entrada no alcanzaba para una carga entera de las mulas (por ejemplo, la Quesera en 45 con la Pasteurizadora en 50: las mulas llevan 270 de leche y a la Quesera le caben 58). Se quedaba parada con ⏸️ y la leche se vendía. Ahora se le lleva lo que quepa en cuanto tiene media entrada libre, y procesa todo lo que puede.
- La Pasteurizadora reparte su leche en cuatro cuartos: uno para la Quesera, uno para la Descremadora, uno para la Paila y el último para la **Ruta de la leche** del Cacaotal. Mientras el Cacaotal no abre, ese cuarto se vende como leche, y el juego lo mostraba como un problema: ↪️ en la Pasteurizadora todo el tiempo y «reparte más de lo que procesan sus ramas… mejórala» en la Quesera y las otras ramas, aun con todo al mismo nivel. Ahora no:
  - La Pasteurizadora no se marca con ↪️ y su panel dice que su parte para la Ruta de la leche se vende hasta que abra el Cacaotal.
  - Una rama solo se marca como atrasada si procesa menos que lo que le toca («A esta rama le tocan 33,7/s y procesa 6,9/s»).
  - En la cadena (🔗), esa leche aparece aparte («🚌 … a la bodega: se venden hasta que abra la Ruta de la leche») y en rojo solo lo que pase de ahí.

## v1.7.10 — Ventanas más altas
- Las ventanas de investigaciones, objetivos, zonas y cadena siguen teniendo alto fijo, pero ahora usan todo el alto de la pantalla (hasta 900 px) en vez de 640 px. En la v1.7.6 se habían quedado más bajas que antes y, en el teléfono, investigaciones como «Cuajo de calidad» (la ×2 de la Quesera, la sexta de la Lechería) quedaban más abajo, sin verse a menos que se bajara en la lista.
- Cualquier ventana más alta que la pantalla (el menú ⚙️ con las opciones abiertas, en un teléfono pequeño) se puede bajar con el dedo.

## v1.7.9 — Íconos propios, mulas y Willys nuevos
- **Íconos propios** para los productos que no tenían un emoji parecido, dibujados para el juego:
  - Cereza de café: un racimo de granos ovalados rojos con su «ombligo» (y uno todavía verde) en la rama con hojas, en vez de la cereza común.
  - Guarapo: vaso de jugo de caña verde amarillento con espuma, hielo, limón y un trozo de caña, en vez del vaso de agua.
  - Panela: bloque de molde, café dorado, sobre hoja seca de plátano.
  - Panela pulverizada: dorada y amarilla, en una totuma, en vez del salero (parecía azúcar).
  - Lechería: queso campesino **blanco** sobre hoja de plátano (en vez del queso amarillo), botella de leche (en vez del tetero) y pote de crema de leche con cuchara (en vez del cono de helado). También para la Quesera, la Descremadora y sus investigaciones. La mantequilla sigue igual.
  - Son una fuente de color hecha con `tools/icons/build_icons.py`, así que se ven en todos lados: paneles, objetivos, cadena y textos del mapa.
- **Willys** redibujado: ahora mira hacia donde va (antes, en dos de las cuatro direcciones iba en reversa), con capó, parrilla y faros adelante, parabrisas bajo, el conductor de sombrero, el platón abierto con los bultos y la llanta de repuesto atrás. Ya no parece una volqueta.
- **Mulas** redibujadas: cabeza larga de hocico oscuro y orejas de mula, crin, cola, cascos, enjalma de colores y costales de fique amarrados con la franja del color del producto. El arriero lleva pantalón blanco, alpargatas, ruana a rayas, carriel, vara y sombrero aguadeño.
- Los avisos de las estaciones miran ahora los últimos **10 s** (antes 30): salen si el problema ocupa al menos la mitad de ese tiempo.

## v1.7.8 — Avisos solo si el problema dura
- Los íconos sobre las estaciones (⛔ patio lleno, ↪️ desviando, ⏸️ esperando) salían apenas pasaba algo, aunque fuera un instante. Con todo nivelado el producto viaja por tandas, así que es normal que un patio se llene un momento, que una estación espere la siguiente mula o que un viaje se desvíe a la bodega, y parecía un problema sin serlo.
- Ahora un aviso sale solo si el problema ocupa al menos la mitad de los últimos 30 s de juego, y se quita cuando baja de la quinta parte (así no parpadea). «Esperando» cuenta solo en las rachas de 8 s o más sin que llegue nada: la Hornilla con bagazo, más rápida que el Trapiche, ya no se marca siempre con ⏸️.
- El aviso del panel de la estación usa el mismo criterio que el ícono, igual que «Bodega llena» en el Despacho.
- La Compostera llena ya no se marca con ⛔: es compost de sobra (su panel ya lo decía con ✅).
- Al abrir el juego, los avisos tardan unos 15 s en aparecer (se mide desde ese momento).

## v1.7.7 — Cómo se juega
- Al abrir el juego aparece una pantalla con **la idea** (la cadena del café: estaciones, arrieros y el Willys), **cómo se juega** (mejorar, subir los arrieros, la mejora recomendada, la cadena 🔗, los hitos, objetivos e investigaciones, lo que se gana con el juego cerrado) y **el objetivo** (las seis zonas, las rutas entre ellas y el segundo final).
- Sale cada vez que se abre el juego, salvo que se marque «No mostrar de nuevo» (se guarda con la partida y se conserva al volver a empezar). Se puede ver otra vez desde el menú ⚙️ con «❓ Cómo se juega», donde también se puede desmarcar la casilla.

## v1.7.6 — Paneles de tamaño fijo
- El panel de cada estación tiene ahora un alto fijo (el de la vista más llena: pestañas, receta y seis filas de datos). Al pasar de pestaña o cuando cambian los textos ya no crece ni se encoge: el aviso, la barra del hito, los botones ×1/×10/Máx y «Mejorar» quedan siempre en el mismo lugar.
- La cabecera es la de la estación en todas sus pestañas (antes cambiaba a «Arrieros · …» o al nombre de la ruta); el subtítulo dice qué pestaña es. El nivel pasó junto a la barra del próximo hito.
- La franja de la receta aparece en todas las vistas: en los arrieros, qué llevan y adónde («🍒 ➜ 🐴 ➜ Beneficiadero»); en las rutas, de dónde a dónde; en el Despacho, de la bodega al pueblo.
- Cada texto tiene su caja calculada para el más largo posible (medido con todos los nombres de estaciones y rutas y números como «-8,88e40»). Si en una pantalla muy angosta aun así no cabe, la letra se achica un poco en vez de salirse o mover lo demás. Varios textos se acortaron (p. ej. «Ida y vuelta» en vez de «Viaje (ida y vuelta)»).
- Con cuatro pestañas (Empaque de regalos, Chocolatería, Arepería) las de la estación y el transporte muestran solo el ícono.
- La barra superior tiene anchos fijos para las monedas, el ingreso y el reloj (que ahora siempre lleva dos dígitos): ya no se ensancha al crecer el número ni mueve los botones 🔗 y ⚙️. En el móvil el ingreso va debajo de las monedas, para que todo quepa en 360 px.
- El marcador de objetivos (abajo a la izquierda) y las ventanas de objetivos, investigaciones, zonas y cadena tienen alto fijo: al cobrar un objetivo la ventana no se encoge ni mueve el ✕. La recomendación de arriba nunca se sale de la pantalla.
- **Arreglo**: con un panel abierto, tocar una recomendación de otra zona hacía fallar el juego al cambiar de zona.

## v1.7.5 — El patio lleno culpa a quien es
- **Arreglo**: con el Cafetal y sus arrieros en 25 y el Beneficiadero en 10, el Cafetal decía «⛔ Patio lleno: las mulas no dan abasto», pero el problema era el Beneficiadero, que procesa mucho menos: lo que sobra va a la bodega por el camino largo y no alcanza a salir todo. Ahora, si las estaciones siguientes van más lentas, el Cafetal muestra ↪️ (está desviando) y su panel dice que hay que subir la estación siguiente, que a su vez sigue mostrando cuánto le llega y cuánto procesa. Vale para cualquier estación de cualquier zona.

## v1.7.4 — Arreglos
- **Arreglo**: al bajar los reinicios en las opciones de desarrollador (de 41 a 4, por ejemplo) el juego se colgaba: el Willys y la Chiva iban cargados con lo de ×2⁴¹ y se intentaban dibujar miles de millones de bultos. Ahora se dibujan como mucho llenos.
- **Arreglo**: la leyenda «🔁 Producción ×…» quedaba encima de las ventanas (configuración, objetivos…). Ahora queda detrás, y es más pequeña y algo transparente.
- El APK vuelve a publicarse en cada push con la clave de pruebas (temporalmente en el repositorio; si se crean los secretos de GitHub, se usan esos).

## v1.7.3 — Web y APK en el mismo flujo
- GitHub Actions publica en cada push la web y el APK a la vez: el APK queda en https://frealgagu.github.io/Game/cafetal.apk y el menú ⚙️ de la web tiene «📱 App de Android».
- Todos los APK de prueba se firman con la misma clave, que GitHub Actions toma de los secretos del repositorio (no queda en el código): se instalan encima del anterior sin perder la partida. La versión de la app sale de `package.json`.

## v1.7.2 — App de Android
- **App de Android** con Capacitor 8 (como Melvor Idle): el juego va dentro de la app (funciona sin internet), con ícono adaptable y pantalla de inicio. «Atrás» cierra la ventana o el panel abierto y, si no hay ninguno, pasa la app a segundo plano sin cerrarla. Al salir se guarda la partida y al volver se suma lo producido mientras tanto. `npm run android:apk` genera el APK.

## v1.7.1 — Reinicios sin límite
- Los reinicios del segundo final nunca tuvieron tope, pero los números grandes se veían mal. Ahora, más allá de Dc (10³³), las cifras pasan a notación científica (4,20e40) y el multiplicador se muestra exacto mientras se pueda leer (×2.048, ×1.048.576) y abreviado después (×1,10T, ×1,43e45). Nuevos sufijos: Sp, Oc, No y Dc.
- **Opciones de desarrollador**: «Reinicios» es ahora un número libre (antes, una lista hasta ×1.024) que muestra el multiplicador y se aplica mientras se escribe. Llega hasta 900 reinicios: más allá, las monedas dejarían de caber en los números de JavaScript.
- Pruebas: 40 reinicios seguidos (×2⁴⁰) y la cadena sigue cuadrando.

## v1.7 — Hitos más fuertes, Maestría y Supremacía
- **Hitos nuevos**: nivel 10 ×2, 25 ×2, 50 ×4, 75 ×4 y 100 ×8 (antes ×2 cada uno). Al nivel 100 una estación produce 16 veces más que antes, y sigue siendo una potencia de 2 por segundo: 4.096, 2.048, 1.024, 512 o 256. El panel y el aviso del hito dicen cuánto multiplica cada uno.
- **Maestría** (⭐, una por zona): con todos los edificios de la zona en el nivel 75 se puede investigar y toda la zona produce ×4 (su Willys lleva ×4 también). **Supremacía** (👑): con todos en el 100, ×8 más. En 🔬 se ve cuántos edificios van en el nivel pedido. Sirven para llegar al segundo final.
- **Objetivos finales más largos**, para que el primer final dure parecido con los hitos más fuertes: Finca 2.000 bolsas, Trapiche 6.000 panelas, Lechería 6.000 arequipes, Cacaotal 4.000 chocolatinas, Maizal 6.000 arepas de queso y Pueblo 7.000 contenedores.
- Patios, entradas y bodegas crecen con la Maestría y la Supremacía de su zona: a igual nivel todo sigue cuadrando (al nivel 100 con todo, ningún patio se llena).

## v1.6.1 — Bodegas llenas en otras zonas
- **Arreglo de la mejora recomendada**: si una zona que abastece a otra tiene la bodega llena (lo que sobra no alcanza a venderse), toda la zona se frena, también lo que manda por sus rutas; el análisis no lo veía y la recomendación se quedaba subiendo cosas que no servían (en una prueba, la leche que sobraba en la Lechería dejaba sin queso al Maizal y sin arepas al Pueblo). Ahora lo tiene en cuenta y puede recomendar el despacho de esa zona.
- **Arreglo**: al probar el despacho de otra zona, la recomendación subía por error el de la zona actual.

## v1.6 — Segundo final y volver a empezar ×2
- **Segundo final, «¡Maestro cafetero!»**: llevar las 38 estaciones de las seis zonas al nivel 100. Tras el Pueblo, el marcador de objetivos cuenta cuántas van. Al lograrlo aparece una pantalla de felicitación con las estadísticas de la partida.
- **Volver a empezar con la producción al doble**: desde esa pantalla (o luego desde ⚙️) se empieza de cero en la Finca, pero todo produce ×2; en el siguiente reinicio ×4, luego ×8… Se conservan los ajustes y el registro de partidas. El multiplicador se ve abajo a la derecha («🔁 Producción ×2»).
- El ×2 duplica la velocidad de todas las estaciones y lo que lleva el Willys; los arrieros, las rutas, los patios y las entradas se ajustan solos, así que a igual nivel todo sigue cuadrando (hay pruebas a ×8 y ×32: ningún patio se llena al nivel 100).
- **Opciones de desarrollador**: selector «Producción» (×1, ×2, ×4… ×1024) para simular reinicios; el botón de acelerar cambia mientras se escribe la velocidad (y, si ya está acelerado, se aplica al momento).
- **Arreglo**: algunos botones ocultos se veían igual (el de «Ir a…» de la pantalla de zona completada, por ejemplo).
- Simulador de balance: `BALANCE_RESETS=n` empieza con la producción ×2ⁿ, y tras el Pueblo los bots siguen hasta el segundo final subiendo siempre lo más atrasado.
- Duración medida del primer final (Pueblo) con el bot casual: 10 h 16 min a ×1, 5 h 58 min a ×2, 2 h 44 min a ×4 y 1 h 39 min a ×8. Del segundo final, desde el inicio: unas 143 h, 72 h, 36 h y 18 h.

## v1.5 — Zona 6: El Pueblo (final del juego)
- **La última zona**, que se abre al completar el Maizal. Es la única **sin fuente propia**: todo llega por **seis rutas**, una desde cada zona. En la plaza, la **Casa del café** recibe las bolsas de la Finca y reparte café de origen entre la **Greca de tintos** (con panela del Trapiche) → **Fonda** (desayunos campesinos con las arepas de queso del Maizal) y el **Taller de canastas** (con arequipe de la Lechería) → **Empaque de regalos** (con el chocolate de mesa y las chocolatinas del Cacaotal) → **Patio de contenedores**.
- **Final del juego**: exportar 1.000 contenedores de canastas de regalo. 17 objetivos y 8 investigaciones nuevas.
- **Cuadra a igual nivel**: cada zona tenía un producto final que no se llevaba nadie (las bolsas de café, el cuarto de panela que sobraba, el arequipe, los dos chocolates y las arepas de queso); a igual nivel en las seis zonas, el Pueblo los gasta justo, y la panela del Trapiche se reparte entera entre sus tres rutas (hay una prueba). Cambia respecto al primer borrador, que usaba café molido, leche y crema: ya se gastan del todo en sus zonas.
- **Mapa nuevo**: plaza empedrada con fuente, guayacanes amarillos y rosados, mesas con parasol, gente paseando y la Casa del café (crece con los hitos); casitas de colores y faroles alrededor; cinco edificios nuevos (la greca humeante, la fonda con mesas de mantel a cuadros, el cobertizo de las tejedoras de fique, la tienda de regalos con moños y el patio de contenedores con una grúa que va y viene). Cada zona proveedora tiene su carretera «Al Pueblo».
- **La mejora recomendada, más rápida**: los análisis de una misma prueba se comparten entre zonas, cada prueba solo vuelve a calcular las zonas que puede cambiar y, de una zona proveedora, solo se prueba lo que frena la ruta. En el Pueblo (que mira cinco zonas) pasó de unos 200 ms a unos 10 ms; en las demás zonas, a la mitad. En un móvil lento se recalcula con menos frecuencia.
- **La mejora recomendada sigue el faltante**: si lo que frena la zona es una estación que espera un importado, subirla no sirve; ahora señala la ruta, o lo más atrasado de la zona que manda ese producto, y si allá también se espera un importado, sigue hasta esa zona (la Fonda espera arepas, el Maizal espera queso: se recomienda la Lechería). Además prueba subir juntas una estación y sus arrieros (un Patio de contenedores recién construido no sacaba nada con sus arrieros en nivel 1) y la ganancia mínima se mide contra el ingreso de la zona, no contra el de las cinco que la abastecen.
- Construcciones del Pueblo: 300 M, 700 M, 1.500 M, 1.200 M y 2.000 M (las dos últimas, más baratas: con el ingreso de ese momento se esperaba una hora por cada una). Duración medida del Pueblo: 2 h (atento) y 1 h 47 min (casual); el juego completo, unas 11 h y 10 h 15 min. El bot atento del simulador, cuando la mejor compra suelta casi no rinde en el Pueblo, sigue la mejora recomendada (antes se quedaba comprando migajas), y simular el Pueblo es mucho más rápido.
- Partida v9 (las de antes se cargan solas; si el Maizal estaba completo, se abre el Pueblo).

## v1.4.1 — Saldo negativo para pruebas y licencia MIT
- **Opciones de desarrollador**: nueva casilla «Permitir saldo negativo». Con ella todo se puede comprar (construir, investigar, subir niveles; «máx» sube hasta el nivel 100) y lo que falta queda como deuda: el saldo baja de cero, se ve en rojo y lo que se gana después la va pagando. Al quitarla, la deuda se queda y no se compra nada hasta volver a positivo. Al ocultar las opciones se apaga.
- **Licencia MIT** para el código y los gráficos (archivo `LICENSE`). La música sigue siendo CC0. El README explica de dónde sale la idea y qué es propio.

## v1.4 — Zona 5: El Maizal, y música
- **Nueva zona** que se abre al completar el Cacaotal: Maizal ♾️ → Desgranadora → Piladora → Molino de masa → Budare → **Puesto de arepas**, que hace bandejas de arepas de queso con el queso y la mantequilla de la Lechería. Mapa con milpa de espigas, girasoles y espantapájaros, y cinco edificios nuevos (pilones que suben y bajan, budare con arepas, puesto con parasol de colores).
- **Rutas del queso y de la mantequilla**: salen de la bodega de la Lechería por la carretera de abajo. A igual nivel, el Puesto gasta justo lo que hacen la Quesera y la Batidora.
- **Música de fondo**: «Apple Cider», de Zane Little (CC0, dominio público, de OpenGameArt): guitarra acústica y flauta, tranquila, para la finca. Suena en bucle y bajito tras el primer toque, se pausa en segundo plano y se quita en ⚙️ («🎵 Música»). Pesa 2,4 MB.
- **Arreglo importante (venía de la v1.3)**: lo que la bodega guarda para una ruta (carga y media) podía llenarla entera; con la Ruta de la leche en nivel alto, la bodega de la Lechería se llenaba de leche, todas sus estaciones se paraban y no salía queso ni mantequilla. Ahora lo que espera una ruta va en el **andén** y no le quita sitio a la bodega (el panel del despacho lo muestra aparte).
- **La mejora recomendada prueba grupos**: el Puesto de arepas puede quedar frenado a la vez por su nivel, sus arrieros y las dos rutas; subir uno solo (o dos) no servía de nada y se recomendaba la Piladora para siempre (en una partida de prueba, el Maizal tardaba más de 10 h). Ahora se prueba subir juntos una estación y lo que va detrás de ella, y se recomienda lo más atrasado.
- Simulador de balance: el jugador atento, cuando ninguna compra suelta rinde, sigue la mejora recomendada. Duración medida del Maizal: 1 h 45 min (atento) y 1 h 10 min (casual); unas 8 h 30 min de juego en total. Para eso, el Puesto de arepas se construye por 600 M (el atento esperaba hora y media para pagarlo).
- 16 objetivos y 8 investigaciones nuevas. Partida v8 (las de antes se cargan solas; si el Cacaotal estaba completo, se abre el Maizal).

## v1.3.2 — El tiempo acelerado también cuenta sin conexión
- Si cierras el juego con el tiempo acelerado (opciones de desarrollador, ×10, ×100…), al volver **sigue acelerado** y el tiempo que estuviste fuera cuenta a esa velocidad, con el tope (2 h, o 6 h con el Capataz) también multiplicado. El mensaje de bienvenida lo dice: «…trabajando 5 h (a ⏩ ×10)».
- La vuelta es rápida aunque sean cientos de horas de juego: se simulan de verdad las primeras 2 h y el resto se suma al ritmo de la última hora simulada (monedas, ventas, producción e importados, para que los objetivos también avancen). Comparado con simular 6 h paso a paso, la diferencia es menor al 5 % (hay una prueba).

## v1.3.1 — Sin rojo en lo que ya está al máximo
- «La cadena» ya no marca en rojo un edificio, unos arrieros, una ruta o un despacho que estén en el nivel 100: no se pueden mejorar más. Si lo que frena la zona ya está al máximo, no se marca nada.
- La mejora recomendada lo tiene en cuenta: si no queda nada que subir, dice «🏗️ Siguiente: construye…» o «🏁 Esta zona está al máximo».

## v1.3 — Zona 4: El Cacaotal
- **Nueva zona** que se abre al completar la Lechería: Cacaotal ♾️ → Cajones de fermentación → Secadero → Tostador de cacao → Molino de cacao → **Mesa de chocolate** y **Chocolatería** (la pasta se reparte entre las dos). Mapa propio con cacaos cargados de mazorcas, guamos de sombra, plátano y heliconias, y seis edificios nuevos.
- **Dos importaciones a la vez**: la Chocolatería necesita panela del Trapiche y leche de la Lechería; si falta cualquiera, se para y te dice cuál.
- **Rutas nuevas**: la Ruta de la panela al Cacaotal abastece dos estaciones y reparte cada carga; la Ruta de la leche sale de la bodega de la Lechería. Las dos rutas de panela se reparten lo que produce el Trapiche. Para exportar leche, la Lechería tiene que producir más de la que usa.
- La estación tiene una pestaña 🚌 por cada ruta que la abastece («🚌 Panela», «🚌 Leche»).
- **Las rutas cuadran a igual nivel**, también al nivel 100: la Pasteurizadora reparte su leche en cuartos (Quesera, Descremadora, Paila y la Ruta de la leche) y la Paila, la Mesa y la Chocolatería piden entre las tres ¾ de la panela del Trapiche. Recetas ajustadas: Paila cada 32 s; Mesa y Chocolatería con 2 pastas cada 32 s (la Chocolatería, 4 leches), y sus precios al doble.
- **Arreglo de las alertas ⛔ y ↪️ en cadenas sanas**: cuando la siguiente estación tenía poco sitio, las mulas salían con migajas, todas quedaban en camino y el patio se llenaba («la banda no da abasto») aunque el transporte alcanzara. Ahora esperan a que quepa la carga entera y solo con el patio casi lleno salen con media carga o desvían. Al nivel 100 en las cuatro zonas, la Pasteurizadora pasó de estar bloqueada un 30 % del tiempo a nunca (hay una prueba).
- **Arreglo**: mientras la Chiva iba de viaje, el Willys vendía la panela que ella esperaba y al volver salía medio vacía (la Paila se quedaba parada). Ahora la bodega le guarda carga y media.
- **La mejora recomendada prueba pares**: si ninguna mejora suelta rinde, prueba arrieros y rutas de dos en dos. Antes, la Chocolatería podía quedarse con la Ruta de la leche en nivel 4 y sus arrieros en nivel 1 para siempre, porque subir solo uno de los dos no servía de nada. Y si a una estación le faltan dos importados, se avisa del que más escasea.
- Simulador de balance: el jugador atento mide el ingreso del final de cada cadena (como la mejora recomendada) y los dos bots deciden cada 5 s de juego; el casual ahorra para construir si le faltan menos de 10 minutos. Duración medida: La Finca 2 h 20 min / 2 h 35 min, El Trapiche 35 min, La Lechería 2 h 20 min, El Cacaotal 1 h 45 min / 1 h 55 min (atento / casual); unas 7 h 15 min en total.
- La recomendación se recalcula como mucho una vez por segundo (y enseguida tras cada compra): con cuatro zonas y sus rutas, calcularla cinco veces por segundo se notaba en el móvil.
- **Arreglo**: al calcular cuánto puede enviar una zona, ya no se olvida de lo que ella misma recibe por otra ruta (la Paila parecía no gastar leche y la Ruta de la leche se veía con más leche de la que había).
- 18 objetivos y 9 investigaciones nuevas. Partida v7 (las de antes se cargan solas; si la Lechería estaba completa, se abre el Cacaotal).

## v1.2.3 — Bandas eléctricas
- **Desde el nivel 50 de transporte** (un hito), las mulas de una estación se cambian por una **banda eléctrica**: el tramo del camino se cubre con una banda y lo que va en camino se ve como cajas del color del producto. Lleva exactamente lo mismo; solo cambia el dibujo.
- Con muchas estaciones avanzadas ya no hay decenas de mulas con arriero en pantalla: las bandas y sus cajas se dibujan de una vez, lo que alivia la animación (sobre todo en el móvil).
- El panel de transporte pasa a llamarse «⚡ Banda» y avisa del cambio antes de llegar al nivel 50.

## v1.2.2 — Producción en potencias de 2
- **Fórmula de nivel ajustada**: cada nivel suma 15/99 (≈ 0,1515) en vez de 0,15, así el nivel 100 (el máximo) multiplica exactamente ×512. Con ciclos que son potencias de 2, al nivel 100 cada estación produce 256, 128, 64, 32 o 16 unidades por segundo (el doble con su investigación). Una prueba lo comprueba.
- **Compostera**: 4 pulpas por compost en 16 s (antes 5 en 20 s); se gasta 1 compost por cada 8 cafés lavados.
- **Lechería**: la Paila procesa la mitad de la leche y la Quesera y la Descremadora un cuarto cada una. Quesera: 4 leches en 32 s; Descremadora: 2 leches en 16 s; Batidora: 32 s; Paila: 16 s. Precios ajustados para que cada litro rinda lo mismo que antes: crema 800, mantequilla 2.000, queso 2.400, arequipe 4.000.

## v1.2.1 — Variedad Castillo sin descompensar la cadena
- **Variedad Castillo** ya no vuelve a duplicar el Cafetal: ahora **todo lo que vende la Finca vale un 50 % más**. Era un segundo ×2 para el Cafetal (y Beneficio ecológico, otro para el Beneficiadero), mientras el resto de la Finca solo tenía uno: con todo comprado, de la Marquesina en adelante la cadena quedaba siempre a la mitad.
- **Beneficio ecológico** ahora acelera la **Compostera** ×2 (cuesta 20.000 y aparece con ella): con menos niveles cubre el bono del compost.
- Regla nueva, con prueba: cada estación de cada cadena tiene **exactamente una** investigación de velocidad, así que con todas compradas la cadena queda tan equilibrada como sin ninguna.

## v1.2 — Zona 3: La Lechería
- **Nueva zona** que se abre al completar el Trapiche: Potrero y establo ♾️ → Pasteurizadora → tres ramas: **Quesera**, **Descremadora → Batidora** y **Paila de arequipe**. Mapa propio con vacas, eucaliptos, cipreses y pacas de heno, y cinco edificios nuevos.
- **Ramas**: la leche pasteurizada se reparte sola entre las estaciones que la usan (las mulas van a la de la entrada más vacía). A igual nivel, cada rama procesa un tercio; mientras falta alguna, la leche que sobra se vende.
- **Primera ruta entre zonas**: la **Chiva** de la Ruta de la panela lleva panela pulverizada de la bodega del Trapiche a la Paila. Tiene su propio nivel (pestaña 🚌 de la Paila, o tocando la chiva o su letrero) y se ve salir del Trapiche y llegar a la Lechería. El Willys del Trapiche no vende la panela que la Chiva está esperando.
- **La mejora recomendada mira la zona que te abastece**: si la Paila espera panela porque el Trapiche no da abasto, puede recomendar algo del Trapiche; tocarla lleva allá.
- La mejora recomendada mide los arrieros y las rutas de 10 en 10 cuando un nivel suelto suma muy poco (antes podía dejar unos arrieros en nivel 1 sin recomendarlos nunca), y el cuello de botella señala primero una estación cuyo patio se llena.
- «La cadena» muestra las ramas sangradas y la ruta con lo que llega por ella. 17 objetivos y 9 investigaciones nuevas. Partida v6 (las de antes se cargan solas; si el Trapiche estaba completo, se abre la Lechería).

## v1.1.3 — Opciones de desarrollador
- **Opciones de desarrollador ocultas** en ⚙️: toca 7 veces la versión del menú para mostrarlas. Permiten **acelerar el tiempo** (×10 por defecto, de ×1 a ×100). Mientras está acelerado, un indicador ⏩ en la barra de arriba lo recuerda; tocarlo vuelve a ×1. La aceleración arranca apagada al abrir el juego y no afecta las ganancias sin conexión.

## v1.1.2 — El compost sube el precio, no la velocidad
- **El compost ya no acelera el Cafetal.** Mientras haya compost, **todo lo que vende la Finca vale un 30 % más** (también las cerezas y el café desviado). Antes el Cafetal ×1,5 producía más de lo que el Beneficiadero alcanzaba a procesar, y además se encendía y apagaba según hubiera compost.
- **El compost se gasta según el café que lava el Beneficiadero** (1 por cada 10), no según lo que cosecha el Cafetal: subir el Cafetal ya no deja sin compost. Una Compostera a un nivel parecido al del Beneficiadero cubre todo el bono.
- El panel de la Compostera muestra el bono de ahora y el que puede sostener; el «Precio de venta» de cada estación incluye investigaciones y compost (🪱).
- La mejora recomendada mide la Compostera de 10 en 10 niveles, así que ahora sí la sugiere.

## v1.1.1 — Investigaciones para toda la cadena
- **Cada estación tiene su investigación ×2.** Nuevas: Despulpadora eléctrica y Beneficio ecológico (Beneficiadero), Trilladora de rodillos, Tostador de tambor grande, Molino eléctrico, Empacadora automática, Hornilla de más pailas y Pulverizadora eléctrica. Aparecen junto a la que acelera la estación anterior (la Despulpadora, junto al Abono orgánico).
- **La mejora recomendada puede sugerir una investigación** cuando ya alcanza el dinero y rinde más que subir un nivel. Tocarla abre la lista de investigaciones.
- **La mejora recomendada mira el final de la cadena**, no lo que se vende desviado: antes podía recomendar subir arrieros para vender cerezas sueltas mientras la cadena se quedaba atrás.

## v1.1 — Zona 2: El Trapiche
- **Nueva zona** que se abre al completar la Finca: Cañaduzal ♾️ → Molienda → Hornilla → Gaveras → Pulverizadora, con su mapa de guaduales y samanes y edificios propios.
- **Bagazo**: la Molienda lo produce y la Hornilla lo quema como combustible (×2 mientras haya).
- **Varias zonas a la vez**: todas las zonas abiertas producen, aunque solo se vea una. Cada zona tiene su bodega, su Willys, sus objetivos y sus investigaciones; las monedas se comparten.
- **Selector de zonas (🗺️)** con lo que rinde cada una; la pantalla de zona completada lleva directo a la siguiente.
- 15 objetivos y 5 investigaciones nuevas; final: «Primer cargamento de panela».
- Corregido: los objetivos de investigación se guardaban con un nombre equivocado (no afectaba al juego); las partidas guardadas se corrigen solas.
- La «primera ruta entre zonas» pasa a la v1.2, cuando la Lechería necesite la panela del Trapiche.

## v1.0.1 — Arrieros parejos
- **Arrieros al mismo nivel que su estación llevan todo lo que produce** (un 25 % más), sin importar la distancia ni las investigaciones. Antes la carga se calculaba para un viaje fijo y sin contar el Abono ni el compost: en tramos largos o con investigaciones hacían falta arrieros de más nivel, y en tramos cortos sobraban.
- La carga por mula puede tener decimales: cada nivel de arrieros suma capacidad (antes varios niveles seguidos no cambiaban nada).
- La pestaña Arrieros compara lo que llevan con lo que produce la estación y dice a qué nivel subirlos.
- La «Producción» de cada estación ya incluye investigaciones y compost.
- Corregido: los objetivos «Vende café lavado / tostado / molido» podían quedar imposibles (solo se venden si se desvían) y bloquear la lista. Ahora cuentan lo producido.
- La zona dura ahora unas 3 h 20 min – 3 h 30 min (antes 1 h 30 min – 3 h).

## v1.0 — Zona 1 completa
- **Compostera** (rama opcional): la pulpa del Beneficiadero llega por una canaleta y se convierte en compost, que acelera el Cafetal ×1,5 mientras haya. Se gasta 1 compost por cada 20 cerezas.
- **Flecha guía** en el mapa: señala la construcción o mejora que conviene, solo cuando ya te alcanza.
- **App instalable** (PWA): icono propio, pantalla completa y se puede abrir sin internet.
- Monedas en la pestaña del navegador, Esc cierra ventanas y menos partículas si el sistema pide reducir el movimiento.
- Corregido: el aviso «la estación anterior produce más de lo que esta procesa» casi nunca aparecía.
- 30 objetivos (nuevo: construir la Compostera).

## v0.5 — Guía
- Objetivos con recompensa, investigaciones, mejora recomendada, bienvenida con ganancias sin conexión, copia de seguridad.
- Herramienta de balance (`npm run balance`).
- Corregido: lo desviado podía llenar la bodega y dejar sin sitio al producto final.

## v0.4 — Vida
- Edificios que evolucionan en cada hito, día y noche decorativo, aves, luciérnagas, monedas y sonido sintetizado.

## v0.3 — Arrieros
- Mulas por estación que van y vuelven, con nivel propio; vista «La cadena».

## v0.2 — Cadena
- Las seis estaciones de procesamiento, desvío a la bodega e indicadores de estado.

## v0.1 — Prototipo
- Mapa isométrico, Cafetal, mulas, bodega y Willys, mejoras y guardado.
