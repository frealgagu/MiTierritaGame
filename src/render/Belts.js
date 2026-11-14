import { Container, Graphics } from 'pixi.js';
import { iso, shade } from './iso.js';
import { OUTLINE } from './palette.js';
import { pathLength, pointAtDistance } from '../core/path.js';
import { PRODUCTS } from '../data/products.js';

export const SEG_SIDE = 0.3; // tiles: segmented belts running beside the road (stepping farther out where they cross)
export const SEG_LANE = 0.26; // tiles between adjacent segmented belt lanes
export const GENERAL_SIDE = -0.3; // general belt, on the opposite side of the road (v4.3.1)
const STEP = 0.2; // tiles between sampled points when drawing the belt
const MARK_GAP = 0.5; // tiles between moving chevron marks on the belt
const MARK_SPEED = 1.2; // tiles per second for chevron marks (purely visual)
const MARK_STEP = 0.05; // tiles between precomputed points for moving marks
const YARD_GAP = 0.6; // tiles before warehouse yard where belt terminates
const GENERAL_COLOR = 0xcfd4d8; // general belt, silver (segmented ones take their product's color)
const OFF = 0x5f6468; // an idle belt turns dark gray with just a hint of its color

// Blends two colors (k = 0: a; k = 1: b).
const mix = (a, b, k) => {
  const ch = (c, sh) => (c >> sh) & 255;
  const m = (sh) => Math.round(ch(a, sh) + (ch(b, sh) - ch(a, sh)) * k) << sh;
  return m(16) | m(8) | m(0);
};

// Electric conveyor belts (v1.2.3): stations at transport level 50+ swap out mules.
// Since v4.3.1 there are two visual belt types: segmented belts matching each product's color
// (same as chain pipes) running from station to destination, and the general belt on the opposite
// side of the road carrying unsold raw output to the warehouse. Inactive belts pause in gray
// until carrying cargo. Drawn across three Graphics (base, marks, crates) so many
// stations don't weigh down animation.
export class Belts extends Container {
  constructor(road) {
    super();
    this.road = road;
    // Last road segment (corner to warehouse door) crosses the yard, which is
    // also the Willys driveway: belt stops short beside the warehouse wall so
    // the jeep doesn't drive over it.
    this.end = pathLength(road.slice(0, -1)) - YARD_GAP;
    this.base = new Graphics();
    this.marks = new Graphics();
    this.crates = new Graphics();
    this.addChild(this.base, this.marks, this.crates);
    this.key = '';
    this.belts = [];
  }

  // Point along belt at distance s from road start, offset `side` tiles to the side.
  at(s, z = 0, side = SEG_SIDE) {
    const p = pointAtDistance(this.road, s);
    const len = Math.hypot(p.dx, p.dy) || 1;
    return iso(p.gx - (p.dy / len) * side, p.gy + (p.dx / len) * side, z);
  }

  // belts: [{ a, b, side, color (hex or null for general), on }] (distances along road).
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
    // Precomputed points of lit belts to animate marks without recomputing path each frame.
    this.samples = [];
    // Idle ones first so a lit belt sharing the lane draws on top.
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
      // Support legs every 1.5 tiles.
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
      // End rollers with motor: indicator light yellow when active, gray when off.
      for (const s of [a, b]) {
        const p = this.at(s, 2, side);
        g.circle(p.x, p.y, 5).fill(0x3c4146).stroke(OUTLINE);
        g.rect(p.x - 2, p.y - 2, 4, 4).fill(on ? 0xe8b90f : 0x7d8287);
      }
    }
  }

  // crates: [{ s, side, productId }] (distance along road); t: clock for moving marks.
  update(crates, t) {
    const m = this.marks.clear();
    const off = (t * MARK_SPEED) % MARK_GAP;
    const every = Math.round(MARK_GAP / MARK_STEP);
    const shift = Math.round(off / MARK_STEP);
    // White chevrons on colored belts and dark chevrons on bright general belt.
    for (const dark of [false, true]) {
      for (const { pts } of (this.samples ?? []).filter((x) => x.dark === dark)) {
        for (let i = shift; i < pts.length; i += every) m.circle(pts[i].x, pts[i].y, 1.2);
      }
      m.fill(dark ? { color: 0x4a5056, alpha: 0.8 } : { color: 0xffffff, alpha: 0.8 });
    }
    const g = this.crates.clear();
    // Back to front so foreground crates overlap background ones.
    const placed = crates
      .filter((c) => c.s <= this.end)
      .map((c) => ({ ...c, p: this.at(c.s, 3, c.side ?? SEG_SIDE) }))
      .sort((x, y) => x.p.y - y.p.y);
    for (const { p, productId } of placed) {
      const color = PRODUCTS[productId]?.color ?? 0xd9c08c;
      // Wooden crate with product-colored lid.
      g.poly([p.x - 6, p.y - 3, p.x, p.y - 6, p.x + 6, p.y - 3, p.x, p.y]).fill(color).stroke({ width: 1, color: 0x3a2418, alpha: 0.6 });
      g.poly([p.x - 6, p.y - 3, p.x, p.y, p.x, p.y + 5, p.x - 6, p.y + 2]).fill(shade(0xb08050, 0.85)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
      g.poly([p.x, p.y, p.x + 6, p.y - 3, p.x + 6, p.y + 2, p.x, p.y + 5]).fill(shade(0xb08050, 0.7)).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
    }
  }
}

