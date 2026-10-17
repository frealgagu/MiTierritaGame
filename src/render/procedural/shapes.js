import { isoPoly, shade } from '../iso.js';
import { OUTLINE } from '../palette.js';

// Caja isométrica sobre la huella (x, y, w, d) en casillas, de altura h px.
// Caras: superior = color base, izquierda = −15 %, derecha = −30 % (GDD §8).
export function box(g, x, y, w, d, h, color, { z = 0, outline = true } = {}) {
  const left = isoPoly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]);
  const right = isoPoly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]);
  const top = isoPoly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
  const s = outline ? OUTLINE : null;
  g.poly(left).fill(shade(color, 0.85));
  if (s) g.stroke(s);
  g.poly(right).fill(shade(color, 0.7));
  if (s) g.stroke(s);
  g.poly(top).fill(color);
  if (s) g.stroke(s);
}

// Tejado a dos aguas con la cumbrera paralela al eje gx.
export function gableRoof(g, x, y, w, d, wallH, roofH, color, wallColor, overhang = 0.12) {
  const x0 = x - overhang, x1 = x + w + overhang;
  const y0 = y - overhang, y1 = y + d + overhang;
  const ym = y + d / 2;
  const top = wallH + roofH;
  // Faldón trasero (casi oculto), hastial derecho y faldón delantero.
  g.poly(isoPoly([[x0, y0, wallH], [x1, y0, wallH], [x1, ym, top], [x0, ym, top]])).fill(shade(color, 1.1)).stroke(OUTLINE);
  g.poly(isoPoly([[x + w, y, wallH], [x + w, y + d, wallH], [x + w, ym, top]])).fill(shade(wallColor, 0.72)).stroke(OUTLINE);
  g.poly(isoPoly([[x0, y1, wallH], [x1, y1, wallH], [x1, ym, top], [x0, ym, top]])).fill(shade(color, 0.85)).stroke(OUTLINE);
  // Líneas de tejas.
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const yy = y1 + (ym - y1) * t;
    const hh = wallH + roofH * t;
    const [ax, ay, bx, by] = isoPoly([[x0, yy, hh], [x1, yy, hh]]);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 1, color: shade(color, 0.6), alpha: 0.5 });
  }
}

// Sombra elíptica en el suelo centrada en (cx, cy) píxeles.
export function shadow(g, cx, cy, rx, ry, alpha = 0.22) {
  g.ellipse(cx, cy, rx, ry).fill({ color: 0x000000, alpha });
}
