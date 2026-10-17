# Registro de cambios

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
