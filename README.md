# Cafetal

Juego incremental de cadena de suministros con estilo visual inspirado en *Frozen City*. Un cafetal ilimitado pero lento alimenta una cadena de estaciones (beneficiadero, secado, trilla, tueste, molienda y empaque) que se mejoran para producir cada vez más. Una sola zona que se puede completar, ampliable con actualizaciones. Escrito en JavaScript (Vite + PixiJS).

El diseño completo está en [`docs/GDD.md`](docs/GDD.md).

## Jugar en local

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas de la simulación
npm run build    # versión para publicar en dist/
```

## Estado: v0.1

- Mapa isométrico de la Zona 1 (La Finca) con cámara: arrastrar para mover, rueda o pellizco para zoom.
- **Cafetal** (fuente ilimitada): produce cerezas; se mejora del nivel 1 al 100, con hitos que duplican la velocidad y cambian la casa.
- **Mulas** que llevan las cerezas por el camino hasta la **Bodega**.
- **Despacho**: el Willys lleva la carga al pueblo y la vende; se mejora su carga por viaje.
- Compra de mejoras ×1, ×10 y Máx; indicador del cuello de botella.
- Parcelas de las 6 estaciones siguientes, con su receta (llegan en la v0.2).
- Guardado automático en el navegador y ganancias sin conexión (máx. 2 h).

## Estructura

```
src/
├─ core/     bucle de juego, guardado, formato de números
├─ sim/      simulación pura (se prueba con Node, sin navegador)
├─ data/     productos, estaciones (las 6 zonas) y mapa de la zona 1
├─ render/   dibujo isométrico procedural con PixiJS
└─ ui/       barra superior, panel de estación, avisos
```
