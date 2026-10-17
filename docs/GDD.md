# Último Oasis — Documento de Diseño (GDD) v0.1

> Juego de gestión y cadena de suministros, inspirado en el estilo de *Frozen City*.
> Sin héroes, sin gacha, una sola zona jugable que se completa de verdad y se amplía con actualizaciones.
> Tecnología: JavaScript (Vite + PixiJS), se ejecuta en el navegador.

---

## 1. Elección de tema

En *Frozen City* el frío es el enemigo y el horno central lo es todo. Para no copiarlo pero mantener lo que funciona (un núcleo central, supervivientes, clima hostil, cadenas de producción visibles), se evaluaron cuatro temas:

| # | Tema | Recurso vital | Amenaza | Diferenciación | Riesgo de alcance |
|---|------|---------------|---------|----------------|-------------------|
| **A** | **Último Oasis**: desierto tras el colapso | Agua | Olas de calor, tormentas de arena | Alta: paleta cálida, noche fresca, inverso a Frozen City | Bajo |
| B | Faro Boreal: pueblo pesquero ártico | Pescado / aceite | Hielo marino | Baja: muy parecido a Frozen City | Bajo |
| C | Colmena Roja: colonia en Marte | Oxígeno | Tormentas de polvo, radiación | Media | Medio (más sci‑fi, más arte) |
| D | Raíces Hondas: ciudad subterránea de hongos | Luz | Oscuridad, plagas | Alta | Medio (iluminación compleja) |

**Recomendación: A, «Último Oasis».**
- Es el «espejo» de Frozen City: la **Gran Cisterna** sustituye al horno, y el calor sustituye al frío. El jugador entiende las reglas al instante.
- Las cadenas salen de forma natural (agua → dátiles → raciones; arena → adobe/vidrio → espejos solares).
- Visualmente destaca: arena dorada, agua turquesa, atardeceres naranjas y noches azules con faroles cálidos.
- Las zonas futuras son fáciles de imaginar (salinas, cañón, ruinas solares).

El resto del documento usa el tema A. Si se elige otro, la estructura sirve igual: solo cambian nombres y paleta.

---

## 2. Concepto

> *Las ciudades se secaron. Un pequeño grupo de supervivientes encuentra un manantial bajo una cisterna antigua. Tu trabajo: convertir ese charco en un oasis capaz de resistir el Gran Siroco.*

- **Género:** gestión / city‑builder ligero con cadena de suministros.
- **Vista:** isométrica 2:1, mapa de una sola zona con cámara desplazable y zoom.
- **Sesión típica:** de 5 a 15 minutos. Hay progreso sin conexión limitado (máx. 4 h).
- **Duración de la Zona 1:** entre 3 y 5 horas para completarla. **Es lograble**: tiene un final claro.
- **Sin:** héroes, gacha, PvP, energía/stamina ni monetización.

### Pilares
1. **La cadena se ve.** Cada recurso tiene un edificio y un porteador que lo mueve. Si algo falla, se nota en el mapa.
2. **El clima presiona.** El calor sube a lo largo del día y llegan olas de calor y tormentas. Hay que prepararse.
3. **Siempre hay un siguiente paso claro.** Una lista de misiones guía al jugador; nunca se queda sin saber qué hacer.
4. **Pequeño y terminado mejor que grande y a medias.**

---

## 3. Bucle de juego

```
 ┌───────────────────────────────────────────────────────────┐
 │ Asignar trabajadores → Producir → Transportar → Consumir   │
 │        ▲                                          │       │
 │        │                                          ▼       │
 │  Llegan supervivientes ◄── Moral/Hogar ◄── Construir/Mejorar
 │                                                   │       │
 │                     Mejorar Gran Cisterna ◄───────┘       │
 │                     (desbloquea edificios y niveles)      │
 └───────────────────────────────────────────────────────────┘
```

- **Micro (segundos):** tocar edificios para recoger producción, mover trabajadores y responder a eventos.
- **Meso (minutos):** encontrar el cuello de botella de la cadena y resolverlo construyendo o mejorando.
- **Macro (horas):** subir la Gran Cisterna de nivel y prepararse para el Gran Siroco.

---

## 4. Recursos

| Recurso | Icono | Nivel | Origen | Uso principal |
|---------|-------|-------|--------|---------------|
| Agua | 💧 | 0 | Pozo, Destilador solar | Consumo de la población, cultivos, adobe |
| Madera de palma | 🪵 | 0 | Palmeral | Construcción, horno de vidrio |
| Arena | ⏳ | 0 | Cantera de arena | Adobe, vidrio |
| Dátiles | 🌴 | 1 | Huerto de dátiles | Cocina |
| Raciones | 🍲 | 2 | Cocina comunal | Consumo de la población |
| Adobe | 🧱 | 2 | Horno de adobe | Casas y mejoras |
| Vidrio | 🔷 | 2 | Horno de vidrio | Espejos |
| Espejo solar | ☀️ | 3 | Taller de espejos | Destilador solar, mejoras finales de la Cisterna |
| Monedas de sal | 🪙 | — | Caravasar (comercio) | Acelerar obras y comprar a caravanas |

### Cadena de suministros (Zona 1)

```
Pozo ───────────► 💧 Agua ─────────┬──────────────► Población (beber)
                                   │
                                   ├─► Huerto ─► 🌴 Dátiles ─┐
                                   │                         ├─► Cocina ─► 🍲 Raciones ─► Población (comer)
                                   └─────────────────────────┘
Cantera ────────► ⏳ Arena ──┬─(+💧)─► Horno de adobe ─► 🧱 Adobe ─► Casas / Cisterna
                            │
Palmeral ───────► 🪵 Madera ─┴─(+⏳)─► Horno de vidrio ─► 🔷 Vidrio ─(+🪵)─► Taller ─► ☀️ Espejo
                                                                                        │
                                                         Destilador solar ◄─────────────┘
                                                         (💧 extra sin trabajadores)
```

---

## 5. Edificios (Zona 1)

Las tasas son **por minuto, a nivel 1 y con todos los puestos ocupados**. Cada nivel adicional suma un 25 % a la producción y un puesto de trabajo cada 2 niveles. Nivel máximo en la Zona 1: 5 (Cisterna: 8).

| Edificio | Desbloqueo (Cisterna) | Coste | Puestos | Entrada/min | Salida/min | Notas |
|----------|-----------------------|-------|---------|-------------|------------|-------|
| **Gran Cisterna** | — | ver §7 | 0 | — | Almacena 💧 | Núcleo. Su nivel limita al resto |
| Palmeral | 1 | Inicial | 2 | — | 4 🪵 | |
| Pozo | 1 | 20 🪵 | 2 | — | 6 💧 | |
| Tienda de lona | 1 | 15 🪵 | — | — | +4 camas | Vivienda básica |
| Cantera de arena | 2 | 30 🪵 | 2 | — | 5 ⏳ | |
| Huerto de dátiles | 2 | 30 🪵, 10 ⏳ | 3 | 2 💧 | 4 🌴 | |
| Cocina comunal | 2 | 40 🪵, 20 ⏳ | 2 | 2 🌴, 1 💧 | 3 🍲 | |
| Almacén | 3 | 50 🪵, 30 ⏳ | 1 (porteador) | — | +capacidad, +1 porteador | |
| Horno de adobe | 3 | 60 🪵, 40 ⏳ | 2 | 3 ⏳, 2 💧 | 2 🧱 | |
| Casa de adobe | 3 | 20 🧱, 10 🪵 | — | — | +8 camas, +moral | |
| Toldo | 3 | 15 🪵 | — | — | −2 °C en un radio de 3 casillas | Defensa contra el calor |
| Horno de vidrio | 4 | 40 🧱, 40 🪵 | 3 | 4 ⏳, 2 🪵 | 1 🔷 | |
| Caravasar | 4 | 60 🧱, 30 🪵 | 1 | Excedentes | 🪙 | Llega una caravana cada 20 min |
| Enfermería | 5 | 50 🧱, 10 🔷 | 2 | 1 💧 | Cura insolación | |
| Taller de espejos | 6 | 60 🧱, 20 🔷 | 2 | 2 🔷, 1 🪵 | 1 ☀️ | |
| Destilador solar | 6 | 5 ☀️, 30 🧱 | 0 | — | 8 💧 (de día) | Automatiza el agua |
| Torre cortavientos | 7 | 80 🧱, 10 ☀️ | 0 | — | Protege de tormentas | Necesaria para el final |

### Buffers y transporte (la «cadena» de verdad)
- Cada edificio tiene un **buffer de entrada** y uno de **salida** (capacidad: 20 × nivel).
- Si el buffer de salida está lleno, el edificio **se detiene** (icono ⛔ sobre el tejado).
- Los **porteadores** recorren a pie la ruta *edificio → almacén → edificio* llevando 5 unidades por viaje.
- **Capacidad logística** = porteadores × 5 / tiempo del viaje. Es el cuello de botella intermedio del juego y la razón de colocar bien los edificios: cuanto más cerca del almacén, más rápido va todo.
- **Simplificación para el MVP (v0.2):** el transporte es instantáneo y los porteadores son solo decorativos. El transporte real llega en la v0.4.

---

## 6. Población y necesidades

- **Supervivientes:** llegan a la puerta del oasis cada 90 s si hay camas libres y la moral es ≥ 40.
- **Consumo por persona y minuto:** 0,5 💧 y 0,3 🍲. Durante una ola de calor el agua se duplica.
- **Estados:** Trabajando · Descansando (de noche) · Sediento · Hambriento · Insolación (deja de trabajar; la Enfermería lo cura).
- **Moral (0–100)**, el equivalente a la «esperanza» de Frozen City:
  - Sube con: agua y raciones disponibles, casas de adobe, toldos y eventos superados.
  - Baja con: escasez, gente sin cama, insolaciones.
  - Por debajo de 20, los supervivientes empiezan a irse. **No hay game over**: si todos se van, regresan poco a poco. La partida es lograble y nunca se bloquea.
- **Asignación:** botones +/− en cada edificio, más un botón de «autoasignar» que reparte según prioridades.

---

## 7. Progresión: la Gran Cisterna

El nivel de la Cisterna limita el nivel máximo del resto de edificios (igual que el horno en Frozen City).

| Nivel | Coste | Desbloquea | Capacidad 💧 |
|-------|-------|------------|-------------|
| 1 | — | Palmeral, Pozo, Tienda | 200 |
| 2 | 80 🪵 | Cantera, Huerto, Cocina | 400 |
| 3 | 150 🪵, 80 ⏳ | Almacén, Horno de adobe, Casa, Toldo | 700 |
| 4 | 120 🧱, 100 🪵 | Horno de vidrio, Caravasar | 1000 |
| 5 | 200 🧱, 30 🔷 | Enfermería | 1400 |
| 6 | 300 🧱, 60 🔷 | Taller de espejos, Destilador solar | 1900 |
| 7 | 400 🧱, 20 ☀️ | Torre cortavientos | 2500 |
| 8 | 500 🧱, 50 ☀️, 100 🪙 | **Desafío final: el Gran Siroco** | 3200 |

**Final de la Zona 1:** sobrevivir al **Gran Siroco**, una tormenta de 5 minutos (tiempo real) en la que el calor es extremo, la producción exterior cae un 70 % y los caminos se cubren de arena. Para ganar hay que tener ≥ 3 torres cortavientos, ≥ 600 💧 almacenados y moral ≥ 50 al terminar. Si fallas, puedes reintentarlo. Al ganar se muestra la pantalla de «Zona completada» y se deja ver la Zona 2 en el horizonte.

---

## 8. Clima y eventos

- **Ciclo de día:** 1 día = 8 minutos reales (amanecer, día, atardecer, noche).
  - El calor sube hasta el mediodía: más consumo de agua y más riesgo de insolación.
  - De noche hace fresco, la producción baja un 30 % y la gente descansa. Es el momento más bonito visualmente.
- **Eventos (aleatorios, con aviso de 60 s):**

| Evento | Frecuencia | Efecto | Cómo prepararse |
|--------|-----------|--------|-----------------|
| Ola de calor | Cada 2–3 días | Agua ×2 durante 1 día | Toldos y reservas de agua |
| Tormenta de arena | Desde Cisterna 4 | Porteadores ×0,5 de velocidad, arena acumulada en edificios (toca para limpiar) | Almacén cercano |
| Caravana | Cada 20 min (con Caravasar) | Ofrece 3 intercambios | Tener excedentes |
| Viajero perdido | Raro | +3 supervivientes si hay camas | Camas libres |
| Pozo turbio | Raro | Pozo al 50 % durante 2 min | Destilador solar |

---

## 9. Misiones (onboarding y guía)

Lista lineal con 1–3 misiones activas, cada una con su recompensa. Ejemplos de las primeras:
1. Asigna 2 trabajadores al Palmeral.
2. Construye un Pozo.
3. Construye 2 Tiendas de lona.
4. Mejora la Gran Cisterna a nivel 2.
5. Produce 20 raciones.
6. Mantén la moral por encima de 60 durante 2 minutos.
7. Sobrevive a tu primera ola de calor.
…hasta llegar a «Derrota al Gran Siroco».

Entre 30 y 40 misiones bastan para la Zona 1.

---

## 10. Dirección de arte (estilo Frozen City)

Lo que define el aspecto de Frozen City y lo que vamos a replicar:
1. **Isométrico limpio**, con edificios «de juguete» y volúmenes simples, contornos suaves y sombras proyectadas.
2. **Un foco de luz cálido central.** Allí es el horno; aquí será la Cisterna, que brilla turquesa y con faroles naranjas al anochecer.
3. **Mucha vida pequeña:** muñequitos caminando con cargas, humo, partículas y números flotando.
4. **UI gruesa y amable:** paneles con bordes redondeados, iconos grandes con contorno y botones que «rebotan».

### Paleta

| Uso | Hex |
|-----|-----|
| Arena (luz) | `#F2D29B` |
| Arena (sombra) | `#C99A5B` |
| Terracota / adobe | `#C8643B` |
| Adobe sombra | `#8E4027` |
| Agua turquesa | `#3FB8C4` |
| Agua brillo | `#B6F0F2` |
| Palmera | `#5E8C3A` |
| Lona / tela | `#EFE6D2` |
| Contorno | `#3A2418` |
| Cielo de día | `#F7E3B5` |
| Cielo de atardecer | `#F4A259` → `#C8553D` |
| Noche (tinte) | `#2B2D5B` (multiply, 45 %) |
| Farol / luz cálida | `#FFB347` (add/glow) |

### Reglas visuales
- **Casillas:** rombos de 64×32 px. Los edificios ocupan 2×2 o 3×3 casillas; la Cisterna, 4×4 en el centro.
- **Sombreado de volúmenes:** cara superior = color base, cara izquierda = base −15 % de luz, cara derecha = base −30 %. Así cualquier caja procedural ya «parece Frozen City».
- **Sombras:** elipse oscura semitransparente bajo cada edificio y personaje, que se alarga al atardecer.
- **Contorno:** 2 px en `#3A2418` con 60 % de opacidad. No usar negro puro.
- **Personajes:** chibi de 16×24 px, cabeza grande, turbante de color según su oficio y animación de caminar de 3 fotogramas; al llevar carga aparece un icono encima de la cabeza.
- **Efectos:**
  - Calima por calor (filtro de desplazamiento senoidal) cuando la temperatura es alta.
  - Partículas de polvo en tormentas, humo en los hornos y destellos en el agua.
  - Número flotante «+6 💧» que sube y se desvanece al recoger.
  - Halo (glow) en faroles y en la Cisterna por la noche.
  - Edificio en obras: andamio y barra de progreso; al terminar, un pequeño rebote (escala 1 → 1,1 → 1).
- **UI:**
  - Barra superior con los recursos y su tasa (+/min) en verde o rojo.
  - Arriba a la izquierda: temperatura, hora del día y moral.
  - Panel lateral de misiones.
  - Al tocar un edificio, panel inferior con nivel, trabajadores +/−, buffers y botón de mejorar.
  - Fuente: **Fredoka** o **Baloo 2** (Google Fonts), redondeadas como en Frozen City.

### Producción del arte (sin artista)
1. **v0.1–0.3:** todo procedural en código (cajas isométricas con tres caras, cilindros para la Cisterna y triángulos para las palmeras). Rápido y coherente.
2. **v0.4+:** sustituir edificio a edificio por sprites PNG (dibujados, generados o de paquetes CC0 como *Kenney Isometric*), sin tocar la lógica, gracias a que cada edificio declara su `sprite` en datos.

---

## 11. Arquitectura técnica

- **Stack:** JavaScript (ES modules) + **Vite** (servidor de desarrollo y build) + **PixiJS v8** (render WebGL, filtros de glow y desplazamiento, buen rendimiento con cientos de sprites).
- **Sin backend:** el guardado va a `localStorage` como JSON versionado, con exportar/importar en texto.
- **Separación estricta:** la simulación no sabe nada del render.
  - La simulación avanza a **tick fijo** (10 ticks/s), es determinista y se puede probar sin navegador.
  - El render interpola y lee el estado.
- **Datos, no código:** edificios, recursos, recetas, eventos, misiones y zonas se definen en archivos `data/*.js`. Añadir una zona nueva = añadir datos.
- **Progreso sin conexión:** al cargar se simula `min(tiempo_fuera, 4 h)` en pasos grandes (1 tick = 1 s, sin eventos aleatorios).

### Estructura de carpetas propuesta

```
/
├─ index.html
├─ package.json
├─ vite.config.js
├─ docs/
│  └─ GDD.md
└─ src/
   ├─ main.js                 # arranque: carga, crea Game, conecta render y UI
   ├─ core/
   │  ├─ Game.js              # estado raíz + bucle de tick fijo
   │  ├─ EventBus.js          # pub/sub entre sistemas y UI
   │  ├─ SaveSystem.js        # guardar/cargar/migrar versiones
   │  └─ rng.js               # aleatorio con semilla
   ├─ sim/                    # lógica pura, sin DOM ni Pixi
   │  ├─ economy.js           # recetas, buffers, producción
   │  ├─ logistics.js         # porteadores y rutas
   │  ├─ population.js        # llegada, consumo, moral, estados
   │  ├─ weather.js           # día/noche, temperatura, eventos de clima
   │  ├─ events.js            # caravanas, viajeros, etc.
   │  └─ quests.js            # misiones y recompensas
   ├─ data/
   │  ├─ resources.js
   │  ├─ buildings.js
   │  ├─ cistern.js           # niveles de la Cisterna
   │  ├─ events.js
   │  ├─ quests.js
   │  └─ zones/
   │     └─ zone1_oasis.js    # mapa, casillas bloqueadas y posiciones iniciales
   ├─ render/
   │  ├─ iso.js               # conversión mundo↔pantalla, orden de profundidad
   │  ├─ Camera.js            # arrastre, zoom, límites
   │  ├─ MapRenderer.js       # suelo, decoración
   │  ├─ BuildingRenderer.js
   │  ├─ WalkerRenderer.js    # personas y porteadores
   │  ├─ Effects.js           # partículas, números flotantes, calima, glow
   │  ├─ DayNight.js          # tinte y luces
   │  └─ procedural/          # dibujo de edificios por código
   └─ ui/
      ├─ HUD.js               # barra de recursos, clima, moral
      ├─ BuildingPanel.js
      ├─ BuildMenu.js
      ├─ QuestPanel.js
      └─ styles.css
```

### Ejemplo de definición en datos

```js
// src/data/buildings.js
export const BUILDINGS = {
  date_orchard: {
    name: 'Huerto de dátiles',
    size: [2, 2],
    unlockAt: 2,                       // nivel de Cisterna
    cost: { wood: 30, sand: 10 },
    workers: 3,
    recipe: { in: { water: 2 }, out: { dates: 4 }, perMinute: true },
    levelScaling: { output: 0.25, workersEvery: 2 },
    sprite: 'procedural:orchard',      // más adelante: 'img/orchard.png'
  },
};
```

---

## 12. Hoja de ruta

| Versión | Objetivo | Entregable jugable |
|---------|----------|--------------------|
| **v0.1** Prototipo | Mapa isométrico, cámara, colocar edificios, Palmeral + Pozo produciendo, HUD de recursos | Se puede construir y ver números subir |
| **v0.2** Cadena | Todos los edificios de nivel ≤ 4, recetas con buffers, trabajadores asignables, Cisterna 1–4 | La cadena completa funciona |
| **v0.3** Supervivencia | Población, consumo, moral, día/noche, olas de calor | Hay tensión y decisiones |
| **v0.4** Vida | Porteadores reales, caminantes, partículas, números flotantes, calima, glow nocturno | Ya «se siente» Frozen City |
| **v0.5** Guía | Misiones, guardado, progreso sin conexión, sonido básico | Se puede jugar de principio a fin hasta Cisterna 6 |
| **v1.0** Zona 1 completa | Cisterna 7–8, Torre cortavientos, Gran Siroco, pantalla final, balance | **Juego completo y lograble** |
| v1.1 | Zona 2: **Salinas del Este** (sal → conservas, comercio por camellos entre zonas) | Expansión |
| v1.2 | Zona 3: **Cañón de Cobre** (minería, herramientas, mejora de porteadores) | Expansión |
| v1.3 | Zona 4: **Ruinas Solares** (tecnología antigua, energía) | Expansión |

**Expansiones:** cada zona nueva es un mapa aparte con su propio núcleo y cadena, que **se conecta con las anteriores mediante rutas de caravana** (exporta lo que produce e importa lo que necesita). Así la cadena de suministros crece entre zonas sin rehacer la primera.

---

## 13. Fuera de alcance (a propósito)

Héroes, combate, gacha, multijugador, alianzas, tienda con dinero real, energía/stamina, varias zonas en la v1.0 y servidor.

---

## 14. Decisiones abiertas

1. ¿Tema A (Oasis) o prefieres otro (B, C o D)?
2. ¿Móvil primero (vertical, táctil) o escritorio primero? Se recomienda **escritorio primero con soporte táctil básico** por ser más rápido de probar.
3. ¿Nombre definitivo? Alternativas: *Último Oasis*, *Cisterna*, *Arena y Agua*, *Siroco*.
4. ¿Idioma de la interfaz? Solo español o español + inglés desde el inicio (preparar `i18n` desde la v0.1 es barato).
