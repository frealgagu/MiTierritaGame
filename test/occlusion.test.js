import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_LIST } from '../src/data/zones/index.js';
import { moverDepth, orderFootprints, overlaps, setBlockers } from '../src/render/occlusion.js';

// Orden de pintado (v4.5.1): en todos los caminos de todas las zonas (rutas, tractomulas, Willys y mulas), lo que se
// mueve queda detrás de cada estación de la que no ha pasado el borde de adelante y delante de las demás, sin que
// dos estaciones pidan cosas contrarias. Ningún camino de vehículo atraviesa una estación.
const footprints = (z) => [
  { id: 'farm', ...z.farm },
  { id: 'bodega', ...z.warehouse },
  ...z.plots.map((p) => ({ id: p.stationId, x: p.x, y: p.y, w: 3, h: 3 })),
];
const paths = (z) => [
  ...Object.entries(z.routes ?? {}).map(([id, r]) => [`ruta ${id}`, r.road, true]),
  ...(z.jeepRoad ? [['Willys', z.jeepRoad, true]] : []),
  ...(z.jeepRoad2 ? [['Willys 2', z.jeepRoad2, true]] : []),
  ...(z.muleRoad ? [['mulas', z.muleRoad, false]] : []),
];
function* points(road) {
  for (let i = 1; i < road.length; i++) {
    const [ax, ay] = road[i - 1];
    const [bx, by] = road[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.1);
    for (let k = 0; k <= n; k++) yield [ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n];
  }
}

for (const z of ZONE_LIST) {
  test(`${z.name}: lo que se mueve se pinta delante o detrás de cada estación según su huella`, () => {
    const views = footprints(z).map((f) => ({ foot: f }));
    orderFootprints(views);
    setBlockers(() => views);
    try {
      for (const [name, road, vehicle] of paths(z)) {
        for (const [gx, gy] of points(road)) {
          const zIndex = moverDepth(gx, gy);
          for (const v of views) {
            const f = v.foot;
            const inside = gx > f.x + 0.05 && gx < f.x + f.w - 0.05 && gy > f.y + 0.05 && gy < f.y + f.h - 0.05;
            if (vehicle) assert.ok(!inside, `${name} atraviesa ${f.id} en (${gx.toFixed(1)}, ${gy.toFixed(1)})`);
            if (!overlaps(f, gx, gy)) continue;
            const front = gx >= f.x + f.w || gy >= f.y + f.h;
            if (front) assert.ok(zIndex > v.zIndex, `${name} en (${gx.toFixed(1)}, ${gy.toFixed(1)}) debería ir delante de ${f.id}`);
            else assert.ok(zIndex < v.zIndex, `${name} en (${gx.toFixed(1)}, ${gy.toFixed(1)}) debería ir detrás de ${f.id}`);
          }
        }
      }
    } finally {
      setBlockers(null);
    }
  });
}
