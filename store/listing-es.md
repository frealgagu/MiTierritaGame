# Google Play listing — Latin American Spanish (es-419)

Texts and images for Play Console (*Grow → Store presence → Main store listing*). Default language: Spanish (Latin America), es-419.

## App details

**App name** (max 30 characters):

```
Encantos de Mi Tierrita
```

**Short description** (max 80 characters):

```
Produce, transporta y descubre los encantos de las regiones de Colombia.
```

**Full description** (max 4000 characters):

```
Del grano de la montaña a un contenedor rumbo al puerto: construye cadenas de producción por toda Colombia y descubre lo que hace única a cada región.

☕ EMPIEZA EN LA FINCA
Siembra café en el Eje Cafetero. La cereza se lava en el Beneficiadero, se seca en la marquesina, se trilla, se tuesta, se muele y se empaca. Los arrieros llevan cada producto a la siguiente estación y el Willys lo vende en el pueblo.

🗺️ RECORRE DIEZ REGIONES
Eje Cafetero, Santander, La Costa, Boyacá, Los Llanos, la Costa Pacífica, el Amazonas, el Tolima Grande, Cundinamarca y Bogotá: 55 zonas inspiradas en lugares reales, como Salento, Barichara, Cartagena, Villa de Leyva, Villavicencio, Buenaventura, Leticia, Neiva y Zipaquirá. En cada una se produce algo distinto: panela, cacao, arepas, bocadillo, sombrero vueltiao, ruanas, cerámica de Ráquira, casabe, lechona, flores de la Sabana y mucho más. Y al final, una zona especial por descubrir.

🔗 PIENSA EN CADENA
La cadena va tan rápido como su estación más lenta. Mejora estaciones y transportes, une zonas con rutas, investiga mejoras y cumple objetivos. El juego te sugiere qué subir y te muestra dónde se frena la producción.

🏅 EVENTOS, ÁLBUM Y LOGROS
Enfrenta la broca, saca adelante la gran molienda, lleva tu ganado a la feria y gana medallas. Llena el álbum de láminas con datos curiosos de cada región, decora tus zonas y completa todos los logros para ver el gran final.

🌎 APRENDE JUGANDO
Cada producto, cada oficio y cada lugar está inspirado en la Colombia real. Las personas de cada zona te cuentan cómo se hacen las cosas.

🎶 MÚSICA PROPIA
Bambuco, guabina, cumbia, torbellino, joropo, chirimía, cumbia amazónica, sanjuanero, pasillo y danza: cada región tiene su música, compuesta para el juego.

✨ HECHO CON CARIÑO
• Sigue produciendo mientras no juegas.
• Funciona sin internet.
• Sin publicidad y sin recoger datos personales.
• Apto para toda la familia.
• En español, inglés, portugués y francés.
• Si te gusta, puedes invitar un tinto a quien lo hace (opcional y sin ventajas en el juego).
```

## Graphics

| Asset | File | Size |
|---|---|---|
| App icon | `store/icon-512.png` | 512 × 512 |
| Feature graphic | `store/feature-graphic-es.png` | 1024 × 500 |
| Phone screenshots (2 to 8) | `store/screenshots-es/1-farm.png` … `6-zones.png` | 1080 × 1920 |

The listings in other languages (texts, screenshots and feature graphic) are in `store/listing-en.md` (English), `store/listing-pt.md` (Brazilian Portuguese) and `store/listing-fr.md` (French).

Suggested order of the screenshots: the farm, the station (Tostadora), the chain, El Sombrero (La Costa), the map of La Costa (the Caribbean Coast) and the zone picker. They are regenerated with `tools/play-screenshots.mjs`.

## Category and contact

- **Type:** Game. **Category:** Simulation. Suggested tags: «Management», «Educational», «Idle» (whichever the console offers).
- **Contact email:** frealgagu@gmail.com
- **Website:** https://frealgagu.github.io/MiTierritaGame/
- **Privacy policy:** https://frealgagu.github.io/MiTierritaGame/privacidad.html (Play Console takes one URL for the whole app; the page links to its English, Portuguese and French versions).

## App content (*Policy → App content*)

- **Privacy policy:** the URL above.
- **Ads:** No, the app contains no ads.
- **App access:** All functionality is available without special access (there are no accounts or sign-in).
- **Content rating** (IARC questionnaire): category *Game*.
  - Violence, fear, sexuality, crude language, drugs, alcohol and tobacco, gambling: **No**. The borer, the coffee pest, is not shown in a violent way.
  - User interaction, location sharing, user-generated content: **No**.
  - Purchases of digital goods: **Yes** (optional tips).
  - Expected result: for all ages (PEGI 3 / ESRB Everyone).
- **Target audience:** 6–8, 9–12, 13–15, 16–17 and 18+. The Families policy applies, and the game meets it: it has no ads, collects no data, and purchases are behind an adult gate.
  - «Could the listing unintentionally appeal to children?»: does not apply, because it is aimed at children.
- **Data safety:**
  - Does it collect or share user data? **No.**
  - The game is saved only on the device. Payments are processed by Google Play: the game only receives the confirmation on the phone and neither stores nor sends it.
  - Encryption in transit: does not apply, because it sends no data.
  - Data deletion request: does not apply, because there is no data on servers. Uninstalling the app or using «Borrar partida» deletes everything.
- **Financial features, health, news, government app:** No.
- **Permissions:** internet, network state and Google Play billing (added by the billing library).

## In-app products (*Monetize → Products → One-time products*)

| ID | Name | Description | Price |
|---|---|---|---|
| `tinto` | Un tinto | Invita un tinto a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$0,99 |
| `arepa` | Una arepa | Invita una arepa a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$2,99 |
| `almuerzo` | Un almuerzo | Invita un almuerzo a quien hace el juego. No da nada dentro del juego. ¡Gracias! | US$4,99 |

## Release notes (v5.16.0)

```
<es-419>
• Los subproductos que sobran ahora se venden en vez de botarse. La pulpa, el bagazo y el compost tienen precio.
• Ya puedes detener estaciones también en los eventos.
• Panel de la estación: los avisos largos ya no salen cortados ni desaparecen las cifras en teléfonos pequeños.
• Gran final: botón propio a la izquierda al terminar la zona especial, con una ventana que dice cuántos logros faltan.
• Estadísticas: la lista de regiones ya no se cierra sola.
</es-419>
```
