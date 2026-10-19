# Cafetal

Juego incremental de cadena de suministros con estilo visual inspirado en *Frozen City*. Un cafetal ilimitado pero lento alimenta una cadena de estaciones (beneficiadero, secado, trilla, tueste, molienda y empaque) que se mejoran para producir cada vez más. Una sola zona que se puede completar, ampliable con actualizaciones. Escrito en JavaScript (Vite + PixiJS).

El diseño completo está en [`docs/GDD.md`](docs/GDD.md).

## Jugar

Versión publicada: **https://frealgagu.github.io/Game/** (se actualiza sola con cada push gracias a `.github/workflows/pages.yml`).

## Jugar en local

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas de la simulación
npm run balance  # simula una partida entera (npm run balance -- 6 casual)
npm run build    # versión para publicar en dist/
```

## Estado: v1.5 — Zona 6: El Pueblo (juego completo)

Las seis zonas del juego, cada una se abre al completar la anterior: **La Finca** (café), **El Trapiche** (panela), **La Lechería** (leche, queso, mantequilla y arequipe), **El Cacaotal** (chocolate), **El Maizal** (arepas) y **El Pueblo**, el final, donde todo llega de las demás zonas. Al nivel 100 (el máximo) cada estación produce una potencia de 2 por segundo (4.096, 2.048, 1.024, 512 o 256). Todas las zonas abiertas producen a la vez (`npm run balance` simula la partida completa). Novedades de cada versión en [`CHANGELOG.md`](CHANGELOG.md).

- **La Finca**: Cafetal ♾️ → Beneficiadero → Marquesina → Trilladora → Tostadora → Molino → Empacadora → Bodega, más la **Compostera** como rama opcional (la pulpa se vuelve compost y, mientras haya, todo lo que vende la Finca vale un 30 % más).
- **El Trapiche**: Cañaduzal ♾️ → Molienda → Hornilla → Gaveras → Pulverizadora; el **bagazo** de la Molienda alimenta el fuego de la Hornilla (×2).
- **La Lechería**: Potrero ♾️ → Pasteurizadora, que **reparte la leche en tres ramas**: Quesera, Descremadora → Batidora y Paila de arequipe. La Paila necesita **panela pulverizada del Trapiche**, que llega por la **Ruta de la panela** (una chiva con su propio nivel).
- **El Cacaotal**: Cacaotal ♾️ → Cajones de fermentación → Secadero → Tostador → Molino de cacao, que reparte la pasta entre la **Mesa de chocolate** y la **Chocolatería**. Las dos necesitan panela del Trapiche y la Chocolatería además leche de la Lechería: tres zonas trabajando para una.
- **El Maizal**: Maizal ♾️ → Desgranadora → Piladora → Molino de masa → Budare → **Puesto de arepas**, que hace arepas de queso con el queso y la mantequilla de la Lechería.
- **El Pueblo** (final): sin fuente propia; seis rutas traen lo que sobra en cada zona. En la plaza, la **Casa del café** recibe las bolsas de la Finca y reparte café de origen entre la **Greca de tintos** (con panela) → **Fonda** (desayunos con arepas de queso) y el **Taller de canastas** (con arequipe) → **Empaque de regalos** (con los dos chocolates) → **Patio de contenedores**. Exportar 7.000 contenedores termina el juego.
- **Selector de zonas** 🗺️: cada zona con su bodega, su Willys, sus objetivos e investigaciones; las monedas se comparten.
- **Arrieros** por estación (mulas que van y vuelven; al mismo nivel que su estación llevan todo) y **Willys** que vende en el pueblo; desvío a la bodega cuando una estación no da abasto.
- **Mejoras** de nivel 1–100 con hitos (nivel 10 ×2, 25 ×2, 50 ×4, 75 ×4, 100 ×8), **investigaciones** únicas, **objetivos** con recompensa y un final por zona (el del juego: 7.000 contenedores de exportación). **Maestría** (toda una zona al nivel 75: ×4) y **Supremacía** (toda al 100: ×8 más). **Segundo final**: tras el primero, todas las estaciones al nivel 100; entonces se puede volver a empezar con la producción ×2 (×4, ×8… en cada reinicio; se ve abajo a la derecha).
- **Guía**: mejora recomendada, flecha en el mapa, vista «La cadena» con el cuello de botella en rojo.
- **Eventos** 🏅: una vez al año cada zona tiene su evento (la broca, la gran molienda, la feria ganadera, el derrumbe en la vía, la fiesta del maíz y el barco que sale el viernes) en un tablero aparte, con su propio reloj; según lo rápido que se cumpla, medalla de oro, plata o bronce y Renombre ⭐, que no se pierde al reiniciar y se gasta en el álbum de láminas y en decoración.
- **Jornada y temporadas**: se trabaja de 6:00 a 18:00; el año tiene verano, entrada de aguas, invierno y veranillo, que suben o bajan la producción (toca el reloj para ver el calendario).
- **Vida**: edificios que evolucionan con los hitos, día y noche, lluvia, aves, luciérnagas, efectos y sonido sintetizado.
- **Guardado** automático, ganancias sin conexión (2 h, hasta 24 h con una investigación por zona), copia de seguridad exportable.
- **Instalable en el móvil** (PWA) y jugable sin internet.
- **Regiones**: al completar el Pueblo se abre **Santander** (por ahora, La Guayabera y su bocadillo veleño, El Tabacal y su tabaco torcido a mano, La Fiquera con sus costales, alpargatas y tercios de tabaco, El Hato con su carne oreada, y Las Hormigas, que solo se cosechan en la entrada de aguas), con su propia economía; todas las regiones producen a la vez.
- **Música propia**: un bambuco para el Eje Cafetero y una guabina para Santander, compuestos para el juego y tocados por él mismo, sin archivos (tiple, guitarra y bandola sintetizados con Karplus-Strong).

### App de Android
El mismo juego empaquetado con [Capacitor](https://capacitorjs.com) (como Melvor Idle): va dentro de la app, funciona sin internet y el botón «atrás» cierra ventanas o pasa la app a segundo plano. Para generar el APK hace falta Java 21 y el Android SDK (plataforma 36):

```bash
npm run android:apk   # compila el juego, lo copia a android/ y genera android/app/build/outputs/apk/debug/app-debug.apk
```

El APK de depuración se instala directamente en el teléfono (hay que permitir «instalar apps desconocidas»). Para Google Play hará falta una versión firmada (AAB) con una clave propia.

**Cada push publica las dos cosas a la vez** (`.github/workflows/pages.yml`): la web en GitHub Pages y el APK en https://frealgagu.github.io/Game/cafetal.apk (el menú ⚙️ de la web lo enlaza). Los APK de prueba se firman siempre con la misma clave, así que cada versión se instala encima de la anterior sin perder la partida. Si existen los secretos del repositorio (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), se usa esa clave; mientras tanto, temporalmente, la de pruebas guardada en `android/app/cafetal-pruebas.keystore`. La versión de la app sale de `package.json`.

### Instalar en el móvil
Abre https://frealgagu.github.io/Game/ y usa «Añadir a pantalla de inicio» (Safari: botón Compartir; Chrome: menú ⋮ → «Instalar app»).

## Origen y originalidad
La idea parte del género de los juegos incrementales de **cadena de producción** (un recurso ilimitado pero lento que alimenta estaciones que se mejoran), del que *Frozen City* es un ejemplo; de ahí se tomaron solo ideas generales: la cadena visible y un aspecto isométrico «de juguete» con personajes que llevan cargas. El tema (café, panela, leche, cacao y maíz colombianos), las zonas, las recetas, los números, el código, los dibujos (hechos con código, sin imágenes de otros juegos) y los textos son propios. La música también es propia.

## Licencia
El código, los gráficos y la música son [MIT](LICENSE).

## Estructura

```
src/
├─ core/     bucle de juego, guardado, formato de números
├─ sim/      simulación pura (se prueba con Node, sin navegador)
├─ data/     productos, estaciones (las 6 zonas), rutas entre zonas y mapas de las zonas jugables
├─ render/   dibujo isométrico procedural con PixiJS
├─ ui/       barra superior, panel de estación, avisos
└─ assets/   fuente de íconos propios (cafetal-icons.woff2)
tools/
├─ icons/build_icons.py   genera la fuente de íconos (cereza de café, guarapo, panela, queso campesino…)
├─ event-bots.js          jugadores automáticos de los eventos
├─ event-sim.js           juega cada objetivo de los eventos con esos bots y propone las medallas
└─ sprites.html           los vehículos del mapa en grande (npm run dev → /tools/sprites.html)
```

Los productos que no tienen un emoji parecido usan íconos propios: una fuente de color (COLR) con
letras de uso privado, para que sirvan en cualquier texto igual que un emoji. Para cambiarlos o
agregar uno: `pip install fonttools brotli && python3 tools/icons/build_icons.py` (genera la fuente y
`src/data/icons.js`).
