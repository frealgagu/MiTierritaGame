# Registro de cambios

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
