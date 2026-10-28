# Ficha de Google Play

Textos e imágenes para Play Console (*Crecer → Presencia en la tienda → Ficha principal de la tienda*). Idioma predeterminado: español (Latinoamérica), es-419.

## Detalles de la app

**Nombre** (máximo 30 caracteres):

```
Encantos de Mi Tierrita
```

**Descripción breve** (máximo 80 caracteres):

```
Produce, transporta y descubre los encantos de las regiones de Colombia.
```

**Descripción completa** (máximo 4000 caracteres):

```
Del grano de la montaña a un contenedor rumbo al puerto: construye cadenas de producción por toda Colombia y descubre lo que hace única a cada región.

☕ EMPIEZA EN LA FINCA
Siembra café en el Eje Cafetero. La cereza se lava en el Beneficiadero, se seca en la marquesina, se trilla, se tuesta, se muele y se empaca. Los arrieros llevan cada producto a la siguiente estación y el Willys lo vende en el pueblo.

🗺️ RECORRE SIETE REGIONES
Eje Cafetero, Santander, La Costa, Boyacá, Los Llanos, la Costa Pacífica y el Amazonas: 42 zonas inspiradas en lugares reales, como Salento, Barichara, Cartagena, Villa de Leyva, Villavicencio, Buenaventura y Leticia. En cada una se produce algo distinto: panela, cacao, arepas, bocadillo, sombrero vueltiao, ruanas, cerámica de Ráquira, casabe y mucho más.

🔗 PIENSA EN CADENA
La cadena va tan rápido como su estación más lenta. Mejora estaciones y transportes, une zonas con rutas, investiga mejoras y cumple objetivos. El juego te sugiere qué subir y te muestra dónde se frena la producción.

🏅 EVENTOS, ÁLBUM Y LOGROS
Enfrenta la broca, saca adelante la gran molienda, lleva tu ganado a la feria y gana medallas. Llena el álbum de láminas con datos curiosos de cada región y decora tus zonas.

🌎 APRENDE JUGANDO
Cada producto, cada oficio y cada lugar está inspirado en la Colombia real. Las personas de cada zona te cuentan cómo se hacen las cosas.

🎶 MÚSICA PROPIA
Bambuco, guabina, cumbia, torbellino, joropo, chirimía y cumbia amazónica: cada región tiene su música, compuesta para el juego.

✨ HECHO CON CARIÑO
• Sigue produciendo mientras no juegas.
• Funciona sin internet.
• Sin publicidad y sin recoger datos personales.
• Apto para toda la familia.
• Si te gusta, puedes invitar un tinto a quien lo hace (opcional y sin ventajas en el juego).
```

## Recursos gráficos

| Recurso | Archivo | Tamaño |
|---|---|---|
| Ícono de la app | `store/icon-512.png` | 512 × 512 |
| Gráfico destacado | `store/feature-graphic.png` | 1024 × 500 |
| Capturas de teléfono (2 a 8) | `store/capturas/1-finca.png` … `6-zonas.png` | 1080 × 1920 |

Orden sugerido de las capturas: la finca, la estación (Tostadora), la cadena, El Sombrero (La Costa), el mapa de Colombia y el selector de zonas. Se regeneran con `tools/capturas-play.mjs`.

## Categoría y contacto

- **Tipo:** Juego. **Categoría:** Simulación. Etiquetas sugeridas: «Gestión», «Educativos», «Inactivo» (las que ofrezca la consola).
- **Correo de contacto:** frealgagu@gmail.com
- **Sitio web:** https://frealgagu.github.io/MiTierritaGame/
- **Política de privacidad:** https://frealgagu.github.io/MiTierritaGame/privacidad.html

## Contenido de la app (*Política → Contenido de la app*)

- **Política de privacidad:** la URL de arriba.
- **Anuncios:** No, la app no contiene anuncios.
- **Acceso a la app:** Toda la funcionalidad está disponible sin acceso especial (no hay cuentas ni inicio de sesión).
- **Clasificación de contenido** (cuestionario IARC): categoría *Juego*.
  - Violencia, miedo, sexualidad, lenguaje grosero, drogas, alcohol y tabaco, apuestas: **No**. La broca, la plaga del café, no se muestra de forma violenta.
  - Interacción entre usuarios, compartir ubicación, contenido generado por usuarios: **No**.
  - Compras de productos digitales: **Sí** (propinas opcionales).
  - Resultado esperado: para todas las edades (PEGI 3 / ESRB Everyone).
- **Público objetivo:** 6–8, 9–12, 13–15, 16–17 y 18+. Se aplica la política de Familias, y el juego la cumple: no tiene anuncios, no recoge datos y las compras están detrás de una barrera para adultos.
  - «¿La ficha podría atraer sin querer a niños?»: no aplica, porque sí está dirigida a niños.
- **Seguridad de los datos:**
  - ¿Recopila o comparte datos de usuario? **No.**
  - La partida se guarda solo en el dispositivo. Los pagos los procesa Google Play: el juego solo recibe la confirmación en el teléfono y no la guarda ni la envía.
  - Cifrado en tránsito: no aplica, porque no envía datos.
  - Solicitud de eliminación de datos: no aplica, porque no hay datos en servidores. Desinstalar la app o usar «Borrar partida» borra todo.
- **Funciones financieras, salud, noticias, app gubernamental:** No.
- **Permisos:** internet, estado de la red y pagos de Google Play (lo añade la biblioteca de facturación).

## Productos (*Monetizar → Productos → Productos únicos*)

| ID | Nombre | Descripción | Precio |
|---|---|---|---|
| `tinto` | Un tinto | Invita un tinto a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$0,99 |
| `arepa` | Una arepa | Invita una arepa a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$2,99 |
| `almuerzo` | Un almuerzo | Invita un almuerzo a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$4,99 |
