import { Container, Graphics } from 'pixi.js';
import { iso, shade } from './iso.js';
import { OUTLINE } from './palette.js';
import { pointAtDistance } from '../core/path.js';
import { PRODUCTS } from '../data/products.js';

const SIDE = 0.3; // casillas: la banda va a un lado del camino, las mulas que quedan por el otro
const STEP = 0.2; // casillas entre puntos al dibujar la banda
const MARK_GAP = 0.5; // casillas entre las marcas que se mueven sobre la banda
const MARK_SPEED = 1.2; // casillas por segundo de las marcas (solo decorativo)
const MARK_STEP = 0.05; // casillas entre los puntos precalculados para las marcas

// Bandas eléctricas (v1.2.3): las estaciones con transporte de nivel 50 o más ya no dibujan mulas.
// Los tramos del camino que usan se cubren con una banda y lo que va en camino se dibuja como cajas.
// Todo va en tres Graphics (base, marcas y cajas) para que muchas estaciones no pesen en la animación.
export class Belts extends Container {
  constructor(road) {
    super();
    this.road = road;
    this.base = new Graphics();
    this.marks = new Graphics();
    this.crates = new Graphics();
    this.addChild(this.base, this.marks, this.crates);
    this.key = '';
    this.intervals = [];
  }

  // Punto de la banda a una distancia s del inicio del camino, desplazado a un lado.
  at(s, z = 0) {
    const p = pointAtDistance(this.road, s);
    const len = Math.hypot(p.dx, p.dy) || 1;
    return iso(p.gx - (p.dy / len) * SIDE, p.gy + (p.dx / len) * SIDE, z);
  }

  // intervals: tramos [desde, hasta] (distancias sobre el camino); se unen los que se tocan.
  setIntervals(intervals) {
    const sorted = intervals.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((x, y) => x[0] - y[0]);
    const merged = [];
    for (const [a, b] of sorted) {
      const last = merged.at(-1);
      if (last && a <= last[1] + 0.01) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    const key = merged.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join(',');
    if (key === this.key) return;
    this.key = key;
    this.intervals = merged;
    this.drawBase();
  }

  drawBase() {
    const g = this.base.clear();
    // Puntos ya calculados de cada tramo, para mover las marcas sin recalcular el camino en cada cuadro.
    this.samples = this.intervals.map(([a, b]) => {
      const pts = [];
      for (let s = a; s <= b; s += MARK_STEP) pts.push(this.at(s, 2));
      return { a, pts };
    });
    for (const [a, b] of this.intervals) {
      const pts = [];
      for (let s = a; s < b; s += STEP) pts.push(this.at(s, 2));
      pts.push(this.at(b, 2));
      // Patas cada casilla y media.
      for (let s = a; s <= b; s += 1.5) {
        const p = this.at(s, 0);
        g.rect(p.x - 1.2, p.y - 2, 2.4, 4).fill(0x555b60);
      }
      const line = (width, color) => {
        g.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
        g.stroke({ width, color, cap: 'round', join: 'round' });
      };
      line(10, 0x3c4146);
      line(7, 0x6f777e);
      // Cabezales en los extremos, con el motor (un cuadrito amarillo).
      for (const s of [a, b]) {
        const p = this.at(s, 2);
        g.circle(p.x, p.y, 5).fill(0x3c4146).stroke(OUTLINE);
        g.rect(p.x - 2, p.y - 2, 4, 4).fill(0xe8b90f);
      }
    }
  }

  // crates: [{ s, productId }] (distancia sobre el camino); t: tiempo para mover las marcas.
  update(crates, t) {
    const m = this.marks.clear();
    const off = (t * MARK_SPEED) % MARK_GAP;
    const every = Math.round(MARK_GAP / MARK_STEP);
    const shift = Math.round(off / MARK_STEP);
    for (const { pts } of this.samples ?? []) {
      for (let i = shift; i < pts.length; i += every) m.circle(pts[i].x, pts[i].y, 1.2);
    }
    m.fill({ color: 0xc7ccd1, alpha: 0.9 });
    const g = this.crates.clear();
    // De atrás hacia adelante, para que las de delante tapen a las de detrás.
    const placed = crates.map((c) => ({ ...c, p: this.at(c.s, 3) })).sort((x, y) => x.p.y - y.p.y);
    for (const { p, productId } of placed) {
      const color = PRODUCTS[productId]?.color ?? 0xd9c08c;
      // Caja de madera con la tapa del color del producto.
      g.poly([p.x - 6, p.y - 3, p.x, p.y - 6, p.x + 6, p.y - 3, p.x, p.y]).fill(color).stroke({ width: 1, color: 0x3a2418, alpha: 0.6 });
      g.poly([p.x - 6, p.y - 3, p.x, p.y, p.x, p.y + 5, p.x - 6, p.y + 2]).fill(shade(0xb08050, 0.85)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
      g.poly([p.x, p.y, p.x + 6, p.y - 3, p.x + 6, p.y + 2, p.x, p.y + 5]).fill(shade(0xb08050, 0.7)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
    }
  }
}

