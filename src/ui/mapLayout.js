// Dónde se dibuja cada zona y cada aeropuerto en el mapa de su región (v4.4.10; antes estaba dentro de ZoneMap.js).
// Sin DOM: lo usan el mapa del juego y tools/map-coords.mjs, que hace la página de coordenadas.
//   1. Cada zona va en su pueblo y cada aeropuerto en el real (data/zoneGeo.js), en unidades del mapa (1/40 de grado).
//   2. Si dos puntos quedan muy juntos (Barichara y San Gil, Leticia y su aeropuerto) se separan hasta que quepan
//      sus marcas.
//   3. Ningún punto queda fuera de su región ni pegado al borde: si se sale, se corre al punto de la región más
//      cercano, un poco hacia adentro (El Dorado queda en Bogotá, y para Cundinamarca se corre a la Sabana).
import { DEPARTMENTS, MAP_ORIGIN, MAP_SCALE } from '../data/colombiaMap.js';
import { AIRPORT_GEO, ZONE_GEO } from '../data/zoneGeo.js';
import { REGIONS } from '../data/regions.js';

export const proj = ([lat, lon]) => [(lon - MAP_ORIGIN[0]) * MAP_SCALE, (MAP_ORIGIN[1] - lat) * MAP_SCALE];
export const unproj = ([x, y]) => [MAP_ORIGIN[1] - y / MAP_SCALE, x / MAP_SCALE + MAP_ORIGIN[0]];

// Los polígonos de un camino SVG hecho solo de M, L y Z (así los escribe tools/geo).
function polygons(d) {
  return d
    .split('M')
    .filter((part) => part.trim())
    .map((part) => part.replace(/Z/g, '').split('L').map((pt) => pt.split(',').map(Number)));
}
export const REGION_POLYS = Object.fromEntries(REGIONS.map((r) => [r.id, DEPARTMENTS.filter((d) => d.region === r.id).flatMap((d) => polygons(d.d))]));

// ¿Está el punto dentro de alguno de los polígonos? (rayo hacia la derecha)
export function inside([x, y], polys) {
  let hit = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

// El punto del borde más cercano, con la dirección del borde en ese tramo.
function nearestEdge([x, y], polys) {
  let best = null;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      const px = ax + dx * t;
      const py = ay + dy * t;
      const d = Math.hypot(x - px, y - py);
      if (!best || d < best.d) best = { d, p: [px, py], dir: [dx, dy] };
    }
  }
  return best;
}

// El punto, dentro de la región y a `margin` del borde por lo menos (si ya lo está, igual).
export function keepInside(pt, polys, margin) {
  const edge = nearestEdge(pt, polys);
  if (!edge) return pt;
  if (inside(pt, polys) && edge.d >= margin) return pt;
  const len = Math.hypot(...edge.dir) || 1;
  const n = [-edge.dir[1] / len, edge.dir[0] / len];
  // Hacia adentro: el lado de la normal que cae dentro de la región (probando cada vez más cerca del borde).
  for (const k of [1, 0.6, 0.3, 0.15, 0.05]) {
    for (const s of [1, -1]) {
      const q = [edge.p[0] + n[0] * margin * k * s, edge.p[1] + n[1] * margin * k * s];
      if (inside(q, polys)) return q;
    }
  }
  // En una punta angosta (el Trapecio Amazónico) ninguno sirve: se camina hacia el centro de la región hasta entrar.
  const all = polys.flat();
  const c = [all.reduce((n, p) => n + p[0], 0) / all.length, all.reduce((n, p) => n + p[1], 0) / all.length];
  for (let f = 0.02; f <= 1; f += 0.02) {
    const q = [pt[0] + (c[0] - pt[0]) * f, pt[1] + (c[1] - pt[1]) * f];
    if (inside(q, polys) && nearestEdge(q, polys).d >= margin * 0.3) return q;
  }
  return edge.p;
}

export const ZONE_POS = {};
export const AIRSTRIP = {};
export const ZONES_VIEW = {};
const box = (pts) =>
  pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
const viewOf = (b, pad) => ({ x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 });

for (const r of REGIONS) {
  const polys = REGION_POLYS[r.id];
  // Las zonas y, al final, el aeropuerto.
  const pts = [...r.zones.map((z) => proj(ZONE_GEO[z])), proj(AIRPORT_GEO[r.id])];
  const b0 = box(pts);
  const size = Math.max(b0.x1 - b0.x0, b0.y1 - b0.y0, 90);
  const min = size * 0.24;
  const margin = (k) => size * (k === pts.length - 1 ? 0.07 : 0.05); // la pista es más larga que una marca
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const dist = Math.hypot(dx, dy) || 0.01;
        // Con el aeropuerto basta la mitad: la pista es angosta y va de lado.
        const need = j === pts.length - 1 ? min / 2 : min;
        if (dist >= need) continue;
        const push = (need - dist) / 2 / dist;
        pts[i][0] -= dx * push;
        pts[i][1] -= dy * push;
        pts[j][0] += dx * push;
        pts[j][1] += dy * push;
      }
    }
    for (let k = 0; k < pts.length; k++) pts[k] = keepInside(pts[k], polys, margin(k));
  }
  r.zones.forEach((z, k) => (ZONE_POS[z] = pts[k]));
  AIRSTRIP[r.id] = pts.at(-1);
  // La región se mira de cerca alrededor de sus zonas y su aeropuerto (en los Llanos y el Amazonas, los
  // departamentos son enormes y las zonas quedan en una esquina).
  const b = box(pts);
  const s = Math.max(b.x1 - b.x0, b.y1 - b.y0, 90);
  ZONES_VIEW[r.id] = viewOf(b, s * 0.3);
}
