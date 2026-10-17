// Proyección isométrica 2:1. Casilla de 64×32 px.
export const TILE_W = 64;
export const TILE_H = 32;

// Punto de la cuadrícula (gx, gy) a altura h (px) → pantalla.
export function iso(gx, gy, h = 0) {
  return { x: ((gx - gy) * TILE_W) / 2, y: ((gx + gy) * TILE_H) / 2 - h };
}

// Lista plana [x, y, x, y, ...] para Graphics.poly a partir de puntos [gx, gy, h].
export function isoPoly(points) {
  const out = [];
  for (const [gx, gy, h = 0] of points) {
    const p = iso(gx, gy, h);
    out.push(p.x, p.y);
  }
  return out;
}

// Inverso (a altura 0): pantalla → cuadrícula.
export function screenToGrid(x, y) {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

// Orden de dibujo: lo que está más «abajo» en el mapa se dibuja encima.
export function depth(gx, gy) {
  return gx + gy;
}

// Oscurece (f < 1) o aclara (f > 1) un color 0xRRGGBB.
export function shade(color, f) {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
  const b = Math.min(255, Math.round((color & 255) * f));
  return (r << 16) | (g << 8) | b;
}

export function mix(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
