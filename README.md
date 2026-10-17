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
npm run build    # versión para publicar en dist/
```

## Estado: v0.4

- Mapa isométrico de la Zona 1 (La Finca) con cámara: arrastrar para mover, rueda o pellizco para zoom.
- **Cadena completa de la finca**: Cafetal ♾️ → Beneficiadero → Marquesina → Trilladora → Tostadora → Molino → Empacadora → Bodega.
  - Cada estación se construye en orden con monedas y tiene receta, entrada, patio y niveles 1–100 con hitos (×2).
  - Cada edificio tiene su propio dibujo y se anima mientras trabaja (agua, humo, rueda, banda).
- **Arrieros**: cada estación tiene sus mulas, que van, entregan y vuelven vacías. Se mejoran aparte (más mulas y más carga); si no dan abasto, el patio se llena.
- **Vista «Ver cadena» (🔗)**: flujo de cada estación y cada tramo, con el cuello de botella en rojo; toca una fila para mejorarla.
- **Desvío automático**: si una estación no da abasto, el sobrante va a la bodega y se vende sin procesar (↪️).
- **Indicadores**: ⛔ patio lleno, ⏸️ sin entrada, ↪️ desviando; aviso del cuello de botella (tócalo para abrir esa estación).
- **Despacho**: el Willys vende en el pueblo lo que llega a la bodega, lo más valioso primero.
- **Edificios que crecen con los hitos**: macetas (nv 10), segundo piso con balcón (nv 25), faroles (nv 50), patio empedrado (nv 75) y bandera de Colombia (nv 100).
- **Día y noche decorativo** (un día = 8 min): amanecer, atardecer, noche con estrellas, ventanas y faroles encendidos y luciérnagas. No afecta a la producción.
- **Vida y efectos**: bandadas de pájaros, monedas que saltan al vender, edificios que brotan al construirse y rebotan al mejorar.
- **Sonido sintetizado** (sin archivos): monedas, mejoras, hitos, construcción, pájaros de día y grillos de noche. Se apaga en el menú ⚙️.
- Guardado automático en el navegador (las partidas de la v0.1 se conservan) y ganancias sin conexión (máx. 2 h).

## Estructura

```
src/
├─ core/     bucle de juego, guardado, formato de números
├─ sim/      simulación pura (se prueba con Node, sin navegador)
├─ data/     productos, estaciones (las 6 zonas) y mapa de la zona 1
├─ render/   dibujo isométrico procedural con PixiJS
└─ ui/       barra superior, panel de estación, avisos
```
