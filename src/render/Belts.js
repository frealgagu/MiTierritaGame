import { Container, Graphics } from 'pixi.js';
import { iso, shade } from './iso.js';
import { OUTLINE } from './palette.js';
import { pathLength, pointAtDistance } from '../core/path.js';
import { PRODUCTS } from '../data/products.js';

export const SEG_SIDE = 0.3; // casillas: las bandas por tramos, a un lado del camino (y más afuera si se cruzan)
export const SEG_LANE = 0.26; // casillas entre un carril de banda por tramos y el siguiente
export const GENERAL_SIDE = -0.3; // la banda general, al otro lado del camino (v4.3.1)
const STEP = 0.2; // casillas entre puntos al dibujar la banda
const MARK_GAP = 0.5; // casillas entre las marcas que se mueven sobre la banda
const MARK_SPEED = 1.2; // casillas por segundo de las marcas (solo decorativo)
const MARK_STEP = 0.05; // casillas entre los puntos precalculados para las marcas
const YARD_GAP = 0.6; // casillas antes del patio de la bodega donde termina la banda
const GENERAL_COLOR = 0xcfd4d8; // la general, plateada (las de tramo van del color de su producto)
const OFF = 0x5f6468; // una banda apagada se ve gris oscura, con apenas el tinte de su color

// Mezcla dos colores (k = 0: a; k = 1: b).
const mix = (a, b, k) => {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
};

// Bandas eléctricas (v1.2.3): las estaciones con transporte de nivel 50 o más ya no dibujan mulas.
// Desde la v4.3.1 hay dos clases de banda, solo de dibujo: las bandas por tramos, cada una del color de su
// producto (el mismo de su tubo en la cadena), que van de una estación a la siguiente, y la banda general, al
// otro lado del camino, que lleva a la bodega lo que se vende sin procesar. Cada banda se apaga (gris y quieta)
// mientras no tiene nada que llevar. Todo va en tres Graphics (base, marcas y cajas) para que muchas
// estaciones no pesen en la animación.
export class Belts extends Container {
  constructor(road) {
    super();
    this.road = road;
    // El último tramo del camino (de la esquina a la puerta de la bodega) va por el patio, que es
    // también la carretera del Willys: la banda termina antes, junto a la pared de la bodega, para
    // que el jeep no pase por encima.
    this.end = pathLength(road.slice(0, -1)) - YARD_GAP;
    this.base = new Graphics();
    this.marks = new Graphics();
    this.crates = new Graphics();
    this.addChild(this.base, this.marks, this.crates);
    this.key = '';
    this.belts = [];
  }

  // Punto de la banda a una distancia s del inicio del camino, desplazado `side` casillas a un lado.
  at(s, z = 0, side = SEG_SIDE) {
    const p = pointAtDistance(this.road, s);
    const len = Math.hypot(p.dx, p.dy) || 1;
    return iso(p.gx - (p.dy / len) * side, p.gy + (p.dx / len) * side, z);
  }

  // belts: [{ a, b, side, color (número, o null para la general), on }] (distancias sobre el camino).
  setBelts(belts) {
    const list = belts
      .map((x) => ({ ...x, a: Math.min(x.a, x.b, this.end), b: Math.min(Math.max(x.a, x.b), this.end) }))
      .filter((x) => x.b > x.a);
    const key = list.map((x) => `${x.a.toFixed(2)}-${x.b.toFixed(2)}@${x.side.toFixed(2)}:${x.color}:${x.on ? 1 : 0}`).join(',');
    if (key === this.key) return;
    this.key = key;
    this.belts = list;
    this.drawBase();
  }

  drawBase() {
    const g = this.base.clear();
    // Puntos ya calculados de las bandas encendidas, para mover las marcas sin recalcular el camino en cada cuadro.
    this.samples = [];
    // Primero las apagadas, para que una encendida que pase por el mismo carril quede encima.
    const order = [...this.belts].sort((x, y) => Number(x.on) - Number(y.on));
    for (const { a, b, side, color, on } of order) {
      const pts = [];
      for (let s = a; s < b; s += STEP) pts.push(this.at(s, 2, side));
      pts.push(this.at(b, 2, side));
      if (on) {
        const marks = [];
        for (let s = a; s <= b; s += MARK_STEP) marks.push(this.at(s, 2, side));
        this.samples.push({ a, pts: marks, dark: color === null });
      }
      // Patas cada casilla y media.
      for (let s = a; s <= b; s += 1.5) {
        const p = this.at(s, 0, side);
        g.rect(p.x - 1.2, p.y - 2, 2.4, 4).fill(0x555b60);
      }
      const line = (width, c) => {
        g.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
        g.stroke({ width, color: c, cap: 'round', join: 'round' });
      };
      const surface = color ?? GENERAL_COLOR;
      line(10, 0x3c4146);
      line(7, on ? surface : mix(surface, OFF, 0.7));
      // Cabezales en los extremos, con el motor: la luz amarilla si anda, gris si está apagada.
      for (const s of [a, b]) {
        const p = this.at(s, 2, side);
        g.circle(p.x, p.y, 5).fill(0x3c4146).stroke(OUTLINE);
        g.rect(p.x - 2, p.y - 2, 4, 4).fill(on ? 0xe8b90f : 0x7d8287);
      }
    }
  }

  // crates: [{ s, side, productId }] (distancia sobre el camino); t: tiempo para mover las marcas.
  update(crates, t) {
    const m = this.marks.clear();
    const off = (t * MARK_SPEED) % MARK_GAP;
    const every = Math.round(MARK_GAP / MARK_STEP);
    const shift = Math.round(off / MARK_STEP);
    // Marcas blancas sobre las de color y oscuras sobre la general, que es clara.
    for (const dark of [false, true]) {
      for (const { pts } of (this.samples ?? []).filter((x) => x.dark === dark)) {
        for (let i = shift; i < pts.length; i += every) m.circle(pts[i].x, pts[i].y, 1.2);
      }
      m.fill(dark ? { color: 0x4a5056, alpha: 0.8 } : { color: 0xffffff, alpha: 0.8 });
    }
    const g = this.crates.clear();
    // De atrás hacia adelante, para que las de delante tapen a las de detrás.
    const placed = crates
      .filter((c) => c.s <= this.end)
      .map((c) => ({ ...c, p: this.at(c.s, 3, c.side ?? SEG_SIDE) }))
      .sort((x, y) => x.p.y - y.p.y);
    for (const { p, productId } of placed) {
      const color = PRODUCTS[productId]?.color ?? 0xd9c08c;
      // Caja de madera con la tapa del color del producto.
      g.poly([p.x - 6, p.y - 3, p.x, p.y - 6, p.x + 6, p.y - 3, p.x, p.y]).fill(color).stroke({ width: 1, color: 0x3a2418, alpha: 0.6 });
      g.poly([p.x - 6, p.y - 3, p.x, p.y, p.x, p.y + 5, p.x - 6, p.y + 2]).fill(shade(0xb08050, 0.85)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
      g.poly([p.x, p.y, p.x + 6, p.y - 3, p.x + 6, p.y + 2, p.x, p.y + 5]).fill(shade(0xb08050, 0.7)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
    }
  }
}

