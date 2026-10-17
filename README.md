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

## Estado: v1.1 — Zona 2: El Trapiche

Dos zonas jugables: **La Finca** (café, unas 3 h 30 min) y **El Trapiche** (panela, de 2 a 3 h más), que se abre al completar la Finca. Todas las zonas abiertas producen a la vez (`npm run balance` simula la partida completa). Novedades de cada versión en [`CHANGELOG.md`](CHANGELOG.md).

- **La Finca**: Cafetal ♾️ → Beneficiadero → Marquesina → Trilladora → Tostadora → Molino → Empacadora → Bodega, más la **Compostera** como rama opcional (la pulpa se vuelve compost y, mientras haya, todo lo que vende la Finca vale un 30 % más).
- **El Trapiche**: Cañaduzal ♾️ → Molienda → Hornilla → Gaveras → Pulverizadora; el **bagazo** de la Molienda alimenta el fuego de la Hornilla (×2).
- **Selector de zonas** 🗺️: cada zona con su bodega, su Willys, sus objetivos e investigaciones; las monedas se comparten.
- **Arrieros** por estación (mulas que van y vuelven; al mismo nivel que su estación llevan todo) y **Willys** que vende en el pueblo; desvío a la bodega cuando una estación no da abasto.
- **Mejoras** de nivel 1–100 con hitos ×2, **investigaciones** únicas, **objetivos** con recompensa y final («Primer gran pedido»: 1.000 bolsas).
- **Guía**: mejora recomendada, flecha en el mapa, vista «La cadena» con el cuello de botella en rojo.
- **Vida**: edificios que evolucionan con los hitos, día y noche, aves, luciérnagas, efectos y sonido sintetizado.
- **Guardado** automático, ganancias sin conexión (2 h, 6 h con el Capataz), copia de seguridad exportable.
- **Instalable en el móvil** (PWA) y jugable sin internet.

### Instalar en el móvil
Abre https://frealgagu.github.io/Game/ y usa «Añadir a pantalla de inicio» (Safari: botón Compartir; Chrome: menú ⋮ → «Instalar app»).

## Estructura

```
src/
├─ core/     bucle de juego, guardado, formato de números
├─ sim/      simulación pura (se prueba con Node, sin navegador)
├─ data/     productos, estaciones (las 6 zonas) y mapa de la zona 1
├─ render/   dibujo isométrico procedural con PixiJS
└─ ui/       barra superior, panel de estación, avisos
```
