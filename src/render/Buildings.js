import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { StationView, Label } from './Stations.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';
import { t } from '../i18n/index.js';

// Trim colors (plinth, doors, balconies) based on reached milestones.
export const TRIMS = [PAL.balconyGreen, PAL.balconyBlue, PAL.balconyRed, PAL.balconyYellow, 0x8e44ad, 0xffd700];

// Visual additions per milestone (GDD §8, visual evolution):
//   milestone 1 (lv 10): flower pots and accent trim color
//   milestone 2 (lv 25): second story with balcony
//   milestone 3 (lv 50): night-lit streetlamps
//   hito 4 (nv 75): patio empedrado
//   milestone 5 (lv 100): rooftop Colombian flag and gold trim
export const UPPER_FLOOR = 12; // extra wall px from milestone 2 upward

// Processing station building on its 3×3 tile lot.
// Each station has bespoke artwork plus optional work animation.
export class BuildingView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    // Body scales from ground level for build and upgrade bounces.
    const base = iso(plot.x + 1.5, plot.y + 1.5);
    this.body = new Container();
    this.body.pivot.set(base.x, base.y);
    this.body.position.set(base.x, base.y);
    this.art = new Graphics();
    this.anim = new Container();
    this.body.addChild(this.art, this.anim);
    this.addChild(this.body);
    this.label = new Label(def.name);
    this.tier = -1;
    this.working = false;
    this.smokePoints = [];
    this.time = 0;
    this.clock = 0;
    this.bounceT = 1;
    this.bounceSize = 0;
  }

  sync(state) {
    const st = state.stations[this.def.id];
    const tier = milestoneTier(st.level);
    if (tier !== this.tier) this.draw(tier);
    this.working = st.status === 'working';
    this.label.set(`${this.def.icon} ${this.def.name} · ${t('Nv')} ${st.level}`);
  }

  draw(tier) {
    this.tier = tier;
    this.art.clear();
    this.anim.removeChildren().forEach((c) => c.destroy());
    this.smokePoints = [];
    this.lights = [];
    this.lightsDirty = true;
    this.animate = null;
    this.roofTop = null;
    const { x, y } = this.plot;
    const g = this.art;
    const p = iso(x + 1.5, y + 1.5);
    shadow(g, p.x + 6, p.y + 8, 80, 32, 0.18);
    if (tier >= 4) cobblestones(g, x, y);
    else g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill({ color: 0xd8b07a, alpha: 0.6 });
    const ctx = { trim: TRIMS[tier], tier, up: tier >= 2 ? UPPER_FLOOR : 0 };
    DRAW[this.def.id].call(this, g, x, y, ctx);
    decorate.call(this, g, x, y, ctx);
  }

  // Bounce: 'pop' when built (springs from ground), 'bump' on level up.
  bounce(kind = 'bump') {
    this.bounceT = 0;
    this.bounceSize = kind === 'pop' ? 1 : 0.08;
  }

  update(dt, t) {
    super.update(dt, t);
    this.time += this.working ? dt : 0;
    this.clock += dt;
    if (this.animate) this.animate(this.time, this.clock);
    if (this.bounceT < 1) {
      this.bounceT = Math.min(1, this.bounceT + dt / (this.bounceSize === 1 ? 0.6 : 0.35));
      const k = this.bounceT;
      if (this.bounceSize === 1) {
        // 0 to 1 with slight overshoot at the end (easeOutBack).
        const c = 1.7;
        const e = 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
        this.body.scale.set(1, Math.max(0.01, e));
      } else {
        this.body.scale.set(1, 1 + Math.sin(k * Math.PI) * this.bounceSize);
      }
    }
  }
}

// Shared milestone details.
function decorate(g, x, y, { tier }) {
  if (tier >= 1) {
    for (const [px, py] of [[0.14, 2.25], [0.14, 2.62]]) flowerPot(g, x + px, y + py, tier);
  }
  if (tier >= 3) {
    for (const [px, py] of [[0.12, 2.9], [2.9, 0.12]]) {
      const top = lantern(g, x + px, y + py);
      this.lights.push({ x: top.x, y: top.y, r: 26 });
    }
  }
  if (tier >= 5 && this.roofTop) {
    const flag = new Graphics();
    this.anim.addChild(flag);
    const { x: fx, y: fy } = this.roofTop;
    const previous = this.animate;
    this.animate = (time, clock) => {
      previous?.(time, clock);
      drawFlag(flag, fx, fy, clock);
    };
  }
}

function flowerPot(g, gx, gy, tier) {
  const p = iso(gx, gy);
  g.ellipse(p.x, p.y - 1, 5, 2.5).fill({ color: 0x000000, alpha: 0.2 });
  g.poly([p.x - 4, p.y - 7, p.x + 4, p.y - 7, p.x + 3, p.y, p.x - 3, p.y]).fill(0xb5512e).stroke(OUTLINE);
  g.circle(p.x, p.y - 10, 4.5).fill(0x4e8a33);
  const colors = [0xe07a5f, 0xffffff, 0xf6d860, 0xc77dff, 0xd7263d];
  for (let i = 0; i < 3; i++) g.circle(p.x - 2.5 + i * 2.5, p.y - 11 - (i % 2) * 2, 1.6).fill(colors[(tier + i) % colors.length]);
}

// Pole lantern; returns lamp light anchor point.
function lantern(g, gx, gy) {
  const p = iso(gx, gy);
  g.ellipse(p.x, p.y, 4, 2).fill({ color: 0x000000, alpha: 0.25 });
  g.rect(p.x - 1.2, p.y - 30, 2.4, 30).fill(0x2b2b2b);
  g.rect(p.x - 4, p.y - 38, 8, 8).fill(0xffd27a).stroke({ width: 1.5, color: 0x2b2b2b });
  g.poly([p.x - 5, p.y - 38, p.x + 5, p.y - 38, p.x, p.y - 43]).fill(0x2b2b2b);
  return { x: p.x, y: p.y - 34 };
}

function cobblestones(g, x, y) {
  g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0xb9b2a5);
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const p = iso(x + 0.3 + i * 0.4, y + 0.3 + j * 0.4);
      g.ellipse(p.x, p.y, 6, 3).fill((i + j) % 2 ? 0xa39b8c : 0xc9c2b4);
    }
  }
}

// Waving Colombian flag (yellow, blue, red).
function drawFlag(g, x, y, t) {
  g.clear();
  const pole = 18;
  g.rect(x - 1, y - pole, 2, pole).fill(0x5e3b1c);
  const w = 18;
  const h = 11;
  const bands = [[0xfcd116, 0, h / 2], [0x003893, h / 2, h / 4], [0xce1126, (h * 3) / 4, h / 4]];
  const steps = 6;
  for (const [color, top, bh] of bands) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const fx = (i / steps) * w;
      pts.push(x + 1 + fx, y - pole + top + Math.sin(t * 4 - i * 0.8) * (i / steps) * 2);
    }
    for (let i = steps; i >= 0; i--) {
      const fx = (i / steps) * w;
      pts.push(x + 1 + fx, y - pole + top + bh + Math.sin(t * 4 - i * 0.8) * (i / steps) * 2);
    }
    g.poly(pts).fill(color);
  }
}

// Front facade doorway (+gy face).
function door(g, x, y, d, at, h, color) {
  g.poly(isoPoly([[x + at - 0.15, y + d, 0], [x + at + 0.15, y + d, 0], [x + at + 0.15, y + d, h], [x + at - 0.15, y + d, h]])).fill(shade(color, 0.75)).stroke(OUTLINE);
}

// Right-side window (+gx face); glows at night.
function windowOnRight(view, g, x, y, w, at, z, color) {
  g.poly(isoPoly([[x + w, y + at - 0.13, z], [x + w, y + at + 0.13, z], [x + w, y + at + 0.13, z + 10], [x + w, y + at - 0.13, z + 10]])).fill(color).stroke(OUTLINE);
  const c = iso(x + w, y + at, z + 5);
  view.lights.push({ x: c.x, y: c.y, r: 18 });
}

// Front facade window (+gy face).
function windowOnFront(view, g, x, y, d, at, z, color) {
  g.poly(isoPoly([[x + at - 0.13, y + d, z], [x + at + 0.13, y + d, z], [x + at + 0.13, y + d, z + 10], [x + at - 0.13, y + d, z + 10]])).fill(color).stroke(OUTLINE);
  const c = iso(x + at, y + d, z + 5);
  view.lights.push({ x: c.x, y: c.y, r: 18 });
}

// Balcony railing across front facade at height z.
function balcony(g, x, y, w, d, z, color) {
  const a = iso(x + 0.15, y + d + 0.08, z);
  const b = iso(x + w - 0.15, y + d + 0.08, z);
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color });
  const n = Math.round(w * 5);
  for (let i = 0; i <= n; i++) {
    const q = iso(x + 0.15 + ((w - 0.3) * i) / n, y + d + 0.08, z);
    g.moveTo(q.x, q.y).lineTo(q.x, q.y + 7).stroke({ width: 1.5, color });
  }
}

// Flea-market awning stall (Usaquén, v4.5): four-pole white canopy with colored stripe and
// display table with wares (`goods`: colors). w: width in tiles.
function fleaStall(view, g, x0, y0, ctx, stripe, goods, w = 2.2) {
  const d = 1.4;
  const H = 22 + Math.min(ctx.tier, 2) * 2;
  box(g, x0 + 0.15, y0 + 0.5, w - 0.3, 0.6, 9, 0xa1693f);
  const n = Math.min(goods.length, 3 + ctx.tier);
  for (let k = 0; k < n; k++) {
    const p = iso(x0 + 0.3 + (k * (w - 0.6)) / Math.max(1, n - 1), y0 + 0.8, 9);
    g.roundRect(p.x - 3.5, p.y - 6, 7, 6, 1.5).fill(goods[k]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.7 });
  }
  for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.04, y0 + py - 0.04, 0.08, 0.08, H, 0x8d6e63);
  gableRoof(g, x0, y0, w, d, H, 9, 0xfafafa, 0xfafafa, 0.15);
  const a = iso(x0 - 0.15, y0 + d + 0.15, H);
  const b = iso(x0 + w + 0.15, y0 + d + 0.15, H);
  g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: stripe });
  view.roofTop = view.roofTop ?? iso(x0 + w / 2, y0 + d / 2, H + 9);
}

// Bogotá exposed brick (v4.5) and front awning at height z.
const BRICK = 0xb35a33;
function awningFront(g, x, y, w, d, z, color) {
  const a = iso(x, y + d, z);
  const b = iso(x + w, y + d, z);
  const c = iso(x + w, y + d + 0.4, z - 5);
  const e = iso(x, y + d + 0.4, z - 5);
  g.poly([a.x, a.y, b.x, b.y, c.x, c.y, e.x, e.y]).fill(color).stroke(OUTLINE);
}

// Basic house: colored plinth, whitewashed walls, clay tile roof. Returns wall height.
function house(view, g, hx, hy, w, d, wallH, ctx, { wall = PAL.wall, plinth = true, roofColor = PAL.roof, roofH = 16 } = {}) {
  const H = wallH + ctx.up;
  if (plinth) {
    box(g, hx, hy, w, d, 7, ctx.trim);
    box(g, hx, hy, w, d, H - 7, wall, { z: 7 });
  } else {
    box(g, hx, hy, w, d, H, wall);
  }
  if (ctx.up) {
    balcony(g, hx, hy, w, d, wallH + 2, ctx.trim);
    windowOnFront(view, g, hx, hy, d, w * 0.3, wallH + 3, PAL.balconyYellow);
  }
  gableRoof(g, hx, hy, w, d, H, roofH, roofColor, wall);
  view.roofTop = iso(hx + w / 2, hy + d / 2, H + roofH);
  return H;
}

// Fique basket: woven hamper with handle (colored for gift baskets).
function basketShape(g, gx, gy, z, scale = 1, color = PRODUCTS.basket.color) {
  const p = iso(gx, gy, z);
  const w = 7 * scale;
  g.poly([p.x - w, p.y - 7 * scale, p.x + w, p.y - 7 * scale, p.x + w * 0.75, p.y, p.x - w * 0.75, p.y]).fill(color).stroke(OUTLINE);
  for (let k = 1; k < 3; k++) g.moveTo(p.x - w + k, p.y - (7 * scale * k) / 3).lineTo(p.x + w - k, p.y - (7 * scale * k) / 3).stroke({ width: 0.8, color: shade(color, 0.7) });
  g.moveTo(p.x - w * 0.7, p.y - 7 * scale).quadraticCurveTo(p.x, p.y - 15 * scale, p.x + w * 0.7, p.y - 7 * scale).stroke({ width: 1.5, color: shade(color, 0.75) });
}

// Shipping container on footprint (gx, gy), 1.1 × 0.6 tiles at elevation z.
function container(g, gx, gy, z, color, scale = 1) {
  const w = 1.1 * scale;
  const d = 0.6 * scale;
  box(g, gx, gy, w, d, 10 * scale, color, { z });
  for (let k = 1; k < 6; k++) {
    const a = iso(gx + (w * k) / 6, gy + d, z + 1);
    const b = iso(gx + (w * k) / 6, gy + d, z + 10 * scale - 1);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(color, 0.65) });
  }
}

function sack(g, gx, gy, z, color) {
  const p = iso(gx, gy, z);
  g.ellipse(p.x, p.y - 4, 7, 5.5).fill(PAL.sack).stroke(OUTLINE);
  g.ellipse(p.x, p.y - 8, 3.5, 1.8).fill(color);
}

// Small fish in profile (on tables, tubs, and cauldrons in Ciénaga, v3.17).
function fishOn(g, x, y, len, color) {
  g.ellipse(x, y, len, len * 0.42).fill(color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
  g.poly([x + len * 0.8, y, x + len * 1.4, y - len * 0.4, x + len * 1.4, y + len * 0.4]).fill(shade(color, 0.8)).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
  g.circle(x - len * 0.55, y - len * 0.08, 0.7).fill(0x263238);
}

// Standing front-facing worker (for station animations).
function worker(g, x, y, shirt) {
  g.rect(x - 2.2, y - 9, 1.8, 9).fill(0x3d3d5c);
  g.rect(x + 0.4, y - 9, 1.8, 9).fill(0x3d3d5c);
  g.roundRect(x - 3.2, y - 18, 6.4, 9.5, 2).fill(shirt);
  g.circle(x, y - 20.5, 2.8).fill(0x6d4c32);
  g.ellipse(x, y - 22.5, 5.5, 1.5).fill(0xf4e3b5);
}

// Stilt plank house, Pacific style (v3.38): stilts, raised deck, painted plank walls,
// front stairs, and zinc roof. Returns deck height (z where walls begin).
function stiltHouse(view, g, hx, hy, w, d, wallH, ctx, { wall = 0x4fb3bf, trim = 0xf7f4ee, roofColor = 0x9aa3a8, roofH = 12, lift = 10 } = {}) {
  for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d], [w / 2, d]]) box(g, hx + px - 0.05, hy + py - 0.05, 0.1, 0.1, lift, 0x6b4a2e);
  box(g, hx - 0.05, hy - 0.05, w + 0.1, d + 0.1, 2, 0x8d6e4a, { z: lift });
  const z = lift + 2;
  const H = wallH + ctx.up;
  box(g, hx, hy, w, d, H, wall, { z });
  for (let k = 1; k < 4; k++) {
    const a = iso(hx, hy + d, z + (H * k) / 4);
    const b = iso(hx + w, hy + d, z + (H * k) / 4);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: shade(wall, 0.7), alpha: 0.6 });
  }
  // Plank staircase up to deck.
  const s0 = iso(hx + w * 0.3, hy + d + 0.55, 0);
  const s1 = iso(hx + w * 0.3, hy + d + 0.05, lift + 2);
  g.moveTo(s0.x - 3, s0.y).lineTo(s1.x - 3, s1.y).moveTo(s0.x + 3, s0.y).lineTo(s1.x + 3, s1.y).stroke({ width: 1.2, color: 0x6b4a2e });
  for (let k = 1; k < 4; k++) g.moveTo(s0.x - 3 + (s1.x - s0.x) * k / 4, s0.y + (s1.y - s0.y) * k / 4).lineTo(s0.x + 3 + (s1.x - s0.x) * k / 4, s0.y + (s1.y - s0.y) * k / 4).stroke({ width: 1, color: 0x8d6e4a });
  g.poly(isoPoly([[hx + w * 0.3 - 0.15, hy + d, z], [hx + w * 0.3 + 0.15, hy + d, z], [hx + w * 0.3 + 0.15, hy + d, z + 16], [hx + w * 0.3 - 0.15, hy + d, z + 16]])).fill(shade(trim, 0.75)).stroke(OUTLINE);
  g.poly(isoPoly([[hx + w, hy + d * 0.5 - 0.15, z + 6], [hx + w, hy + d * 0.5 + 0.15, z + 6], [hx + w, hy + d * 0.5 + 0.15, z + 15], [hx + w, hy + d * 0.5 - 0.15, z + 15]])).fill(0xffe0b2).stroke(OUTLINE);
  const c = iso(hx + w, hy + d * 0.5, z + 10);
  view.lights.push({ x: c.x, y: c.y, r: 18 });
  gableRoof(g, hx, hy, w, d, z + H, roofH, roofColor, wall);
  view.roofTop = iso(hx + w / 2, hy + d / 2, z + H + roofH);
  return z;
}

// Open shed (ramada): four corner posts and gable zinc roof, open sides.
function ramada(view, g, x0, y0, w, d, H, roofColor = 0x9aa3a8) {
  for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x6b4a2e);
  gableRoof(g, x0, y0, w, d, H, 10, roofColor, 0x8d6e4a);
  view.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 10);
}

// Wounaan tambo (v3.42): open round stilt hut with conical palm roof. (gx, gy): tile
// center; r: radius in tiles. Returns floor center in pixels.
function tamboHouse(view, g, gx, gy, r, ctx, lift = 12) {
  const c = iso(gx, gy, 0);
  const rx = r * 32;
  const ry = r * 16;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    g.rect(c.x + Math.cos(a) * rx * 0.85 - 1.2, c.y + Math.sin(a) * ry * 0.85 - lift, 2.4, lift).fill(0x5d4037);
  }
  g.ellipse(c.x, c.y - lift, rx, ry).fill(0x8d6e4a).stroke(OUTLINE);
  g.ellipse(c.x, c.y - lift - 1.5, rx * 0.92, ry * 0.92).fill(0xa1887f);
  const H = 22 + ctx.up;
  for (const a of [Math.PI * 0.15, Math.PI * 0.85]) g.rect(c.x + Math.cos(a) * rx * 0.85 - 1.2, c.y + Math.sin(a) * ry * 0.85 - lift - H, 2.4, H).fill(0x5d4037);
  const floor = { x: c.x, y: c.y - lift - 2 };
  view.tamboRoof = () => {
    const top = c.y - lift - H;
    g.moveTo(c.x - rx * 1.15, top).lineTo(c.x, top - 30).lineTo(c.x + rx * 1.15, top).quadraticCurveTo(c.x, top + ry * 0.7, c.x - rx * 1.15, top).fill(0xc9a96b).stroke(OUTLINE);
    for (let k = 1; k < 4; k++) g.moveTo(c.x - rx * 1.15 * (1 - k / 4), top - 30 * k / 4).lineTo(c.x + rx * 1.15 * (1 - k / 4), top - 30 * k / 4).stroke({ width: 0.8, color: 0xa1854f });
    view.roofTop = { x: c.x, y: top - 30 };
  };
  return floor;
}

// --- Special zone (v5.5) helpers ---
const TENT_COLORS = [[0xe63946, 0xffffff], [0x2a9d8f, 0xf4d35e], [0xf4a261, 0x264653], [0x8e44ad, 0xffffff]];
// White beach sand over the whole lot, with a few shells.
function sandLot(g, x, y) {
  g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0xf3e6c0);
  for (let k = 0; k < 8; k++) {
    const p = iso(x + 0.3 + ((k * 41) % 25) / 10, y + 0.3 + ((k * 29) % 23) / 9.5);
    g.ellipse(p.x, p.y, 1.6, 0.9).fill(k % 2 ? 0xffffff : 0xf4b6a0);
  }
}
// Sea of seven colors over the whole lot: bands from turquoise to blue.
function seaLot(g, x, y) {
  const bands = [0x80deea, 0x4dd0e1, 0x26c6da, 0x00acc1];
  bands.forEach((c, k) => {
    const a = 0.1 + k * 0.35;
    g.poly(isoPoly([[x + a, y + a], [x + 2.9, y + a], [x + 2.9, y + 2.9], [x + a, y + 2.9]])).fill(c);
  });
}
// Striped beach tent (cone canopy on a pole) with a lounge chair, at tile (gx, gy).
function beachTent(g, gx, gy, [a, b]) {
  const p = iso(gx, gy);
  g.ellipse(p.x + 3, p.y + 1, 13, 5).fill({ color: 0x000000, alpha: 0.15 });
  g.poly([p.x - 9, p.y + 2, p.x + 3, p.y - 2, p.x + 6, p.y + 2, p.x - 6, p.y + 6]).fill(0x4cc9f0).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  g.rect(p.x - 0.8, p.y - 22, 1.6, 22).fill(0x6d4c41);
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI + (k / 6) * Math.PI;
    const a1 = Math.PI + ((k + 1) / 6) * Math.PI;
    g.poly([p.x, p.y - 27, p.x + Math.cos(a0) * 15, p.y - 19 + Math.sin(a0) * 2.6, p.x + Math.cos(a1) * 15, p.y - 19 + Math.sin(a1) * 2.6]).fill(k % 2 ? b : a);
  }
  g.ellipse(p.x, p.y - 19, 15, 2.8).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
}
// Coconut palm rooted at screen point (x, y), h px tall.
function palmAt(g, x, y, h) {
  g.ellipse(x + 4, y + 1, 9, 3).fill({ color: 0x000000, alpha: 0.15 });
  g.moveTo(x - 1.6, y).quadraticCurveTo(x + 2, y - h * 0.5, x + 4, y - h).lineTo(x + 6, y - h).quadraticCurveTo(x + 4, y - h * 0.5, x + 1.6, y).closePath().fill(0x8d6e4a);
  for (const [dx, dy] of [[-14, 6], [-10, -6], [4, -10], [14, -2], [13, 8]]) {
    g.moveTo(x + 5, y - h).quadraticCurveTo(x + 5 + dx * 0.5, y - h + dy * 0.5 - 6, x + 5 + dx, y - h + dy).stroke({ width: 3.2, color: 0x2e7d32 });
  }
  g.circle(x + 4, y - h + 2, 1.8).fill(0x6d4c41).circle(x + 7, y - h + 2.4, 1.8).fill(0x6d4c41);
}
// Passenger launch on the water at screen point (px, py) with `people` aboard.
function launch(b, px, py, people, color) {
  b.ellipse(px, py + 2, 14, 3.4).fill({ color: 0x1f8aa6, alpha: 0.6 });
  b.moveTo(px - 13, py - 3).lineTo(px + 11, py - 3).lineTo(px + 14, py - 6).lineTo(px + 9, py + 1).lineTo(px - 11, py + 1).closePath().fill(0xffffff).stroke(OUTLINE);
  b.rect(px - 11, py - 1.5, 20, 1.6).fill(color);
  for (let i = 0; i < people; i++) {
    b.circle(px - 9 + i * 4, py - 6, 1.8).fill(0x8d5524);
    b.rect(px - 10.5 + i * 4, py - 4.5, 3, 2).fill([0xf6d860, 0xe76f51, 0x4cc9f0, 0xffffff][i % 4]);
  }
}
// Golf cart («mulita») parked at screen point p, with a striped canopy.
function mulitaAt(g, p, color) {
  const c = parseInt(color.slice(1), 16);
  g.ellipse(p.x, p.y + 1, 12, 4).fill({ color: 0x000000, alpha: 0.18 });
  g.roundRect(p.x - 10, p.y - 9, 20, 8, 2).fill(c).stroke(OUTLINE);
  g.rect(p.x - 9, p.y - 19, 1.4, 10).fill(0x546e7a).rect(p.x + 7.6, p.y - 19, 1.4, 10).fill(0x546e7a);
  g.roundRect(p.x - 11, p.y - 21, 22, 3, 1).fill(0xf4a261).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
  g.circle(p.x - 6, p.y, 2.6).fill(0x263238).circle(p.x + 6, p.y, 2.6).fill(0x263238);
}

const DRAW = {

  // --- Special zone · San Andrés (v5.5): the island tour ---

  // Spratt Bight beach tents: white sand, striped tent canopies over lounge chairs, and a palm-thatch kiosk.
  carpas_spratt(g, x, y, ctx) {
    sandLot(g, x, y);
    ramada(this, g, x + 0.25, y + 0.25, 1.1, 0.9, 18 + ctx.up, 0xc9a96b);
    box(g, x + 0.35, y + 0.5, 0.9, 0.35, 8, 0x8d6e4a);
    const n = 3 + Math.min(ctx.tier, 3);
    const spots = [[1.9, 0.6], [2.5, 1.3], [1.8, 1.6], [0.7, 1.9], [1.4, 2.4], [2.4, 2.3]];
    for (let k = 0; k < n; k++) beachTent(g, x + spots[k][0], y + spots[k][1], TENT_COLORS[k % TENT_COLORS.length]);
  },

  // Boats on the sea of seven colors: turquoise water bands, a wooden pier, and launches heading out full.
  lanchas_siete_colores(g, x, y, ctx) {
    seaLot(g, x, y);
    for (let k = 0; k < 5; k++) box(g, x + 0.3, y + 0.9 + k * 0.28, 1.4, 0.24, 3, k % 2 ? PAL.wood : PAL.woodDark);
    for (const [px, py] of [[0.3, 0.9], [1.65, 0.9], [0.3, 2.25], [1.65, 2.25]]) box(g, x + px, y + py, 0.07, 0.07, 6, PAL.woodDark);
    const boats = new Graphics();
    this.anim.addChild(boats);
    this.animate = (time) => {
      boats.clear();
      const bob = Math.sin(time * 1.6) * 0.8;
      const a = iso(x + 2.2, y + 0.7);
      launch(boats, a.x, a.y + bob, 0, 0x1e88e5);
      if (ctx.tier >= 2) {
        const c = iso(x + 2.3, y + 2.5);
        launch(boats, c.x, c.y - bob, 2, 0xf4a261);
      }
      if (!this.working) return;
      const f = (time * 0.12) % 1;
      const b = iso(x + 1.9 + f * 0.8, y + 1.6 - f * 1.4);
      launch(boats, b.x, b.y + Math.sin(time * 2) * 0.8, 4, 0xd7263d);
      boats.moveTo(b.x - 14, b.y + 1).lineTo(b.x - 24, b.y + 3).stroke({ width: 1.2, color: 0xffffff, alpha: 0.7 });
    };
    this.animate(0);
  },

  // Trip to Johnny Cay: a small white-sand cay with coconut palms out in the sea, and the launch going back and forth.
  paseo_johnny_cay(g, x, y, ctx) {
    seaLot(g, x, y);
    const c = iso(x + 1.6, y + 1.2);
    g.ellipse(c.x, c.y + 2, 46, 20).fill({ color: 0x80deea, alpha: 0.8 });
    g.ellipse(c.x, c.y, 38, 15).fill(0xf3e6c0).stroke(OUTLINE);
    g.ellipse(c.x - 4, c.y - 2, 22, 8).fill(0x7cb342);
    const palms = 2 + Math.min(ctx.tier, 3);
    for (let k = 0; k < palms; k++) palmAt(g, c.x - 22 + k * 11, c.y - 1 + (k % 2) * 4, 30 + (k % 3) * 6 + ctx.up * 0.5);
    this.roofTop = { x: c.x, y: c.y - 40 };
    const boats = new Graphics();
    this.anim.addChild(boats);
    this.animate = (time) => {
      boats.clear();
      const f = this.working ? (Math.sin(time * 0.5) + 1) / 2 : 0;
      const b = iso(x + 0.6 + f * 0.4, y + 2.6 - f * 0.3);
      launch(boats, b.x, b.y + Math.sin(time * 2) * 0.8, this.working ? 3 : 0, 0x26a69a);
    };
    this.animate(0);
  },

  // San Luis rondón kitchen: island house on stilts with a fire under the big pot, smoke rising.
  rondon_san_luis(g, x, y, ctx) {
    const z = stiltHouse(this, g, x + 0.3, y + 0.25, 1.7, 1.2, 20, ctx, { wall: 0xfdd835, trim: 0xffffff, roofColor: 0x2e7d32, lift: 8 });
    windowOnFront(this, g, x + 0.3, y + 0.25, 1.2, 1.3, z + 6, 0xffe0b2);
    // Fogón: three stones, firewood, and the black pot of rondón.
    const p = iso(x + 2.3, y + 2.2);
    g.ellipse(p.x, p.y, 13, 6).fill({ color: 0x000000, alpha: 0.2 });
    for (const [dx, dy] of [[-8, 0], [8, 0], [0, 4]]) g.ellipse(p.x + dx, p.y + dy, 4, 3).fill(0x8d8478).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.poly([p.x - 6, p.y - 2, p.x + 6, p.y - 2, p.x + 4, p.y + 2, p.x - 4, p.y + 2]).fill(0xff7043);
    g.moveTo(p.x - 11, p.y - 6).quadraticCurveTo(p.x - 12, p.y - 22, p.x, p.y - 22).quadraticCurveTo(p.x + 12, p.y - 22, p.x + 11, p.y - 6).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(p.x, p.y - 21, 11, 3.5).fill(0xf3e3c3).stroke(OUTLINE);
    this.smokePoints.push({ x: p.x, y: p.y - 26 });
    // Coconuts waiting to be grated.
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x + 0.4 + k * 0.25, y + 2.6);
      g.circle(q.x, q.y - 3, 3.2).fill(0x6d4c41).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
  },

  // Hoyo Soplador: coral rock shore with the blowhole spouting sea water, a railing, and golf carts (mulitas) parked.
  hoyo_soplador(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0xa89c88);
    for (let k = 0; k < 14; k++) {
      const p = iso(x + 0.3 + ((k * 37) % 23) / 9, y + 0.3 + ((k * 53) % 19) / 8);
      g.ellipse(p.x, p.y, 4 + (k % 3), 2 + (k % 2)).fill(k % 2 ? 0x6f6658 : 0x7d7362);
    }
    const h = iso(x + 1.8, y + 1.0);
    g.ellipse(h.x, h.y, 10, 4.5).fill(0x263238).stroke(OUTLINE);
    // Railing around the blowhole.
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI;
      const q = { x: h.x + Math.cos(a) * 18, y: h.y + 6 + Math.sin(a) * 6 };
      g.rect(q.x - 0.8, q.y - 8, 1.6, 8).fill(0xffffff);
    }
    const carts = 1 + Math.min(ctx.tier, 2);
    for (let k = 0; k < carts; k++) mulitaAt(g, iso(x + 0.6 + k * 0.7, y + 2.4), ['#ffffff', '#4dd0e1', '#fdd835'][k]);
    this.roofTop = { x: h.x, y: h.y - 40 };
    const spout = new Graphics();
    this.anim.addChild(spout);
    this.animate = (time) => {
      spout.clear();
      if (!this.working) return;
      const f = (time * 0.6) % 1;
      const height = f < 0.35 ? (f / 0.35) * 38 : Math.max(0, 38 - ((f - 0.35) / 0.65) * 50);
      if (height <= 0) return;
      spout.moveTo(h.x - 3, h.y).quadraticCurveTo(h.x, h.y - height * 1.2, h.x + 3, h.y).fill({ color: 0xe1f5fe, alpha: 0.85 });
      for (let k = 0; k < 5; k++) spout.circle(h.x + (k - 2) * 4, h.y - height + Math.abs(k - 2) * 4, 2.2).fill({ color: 0xffffff, alpha: 0.8 });
    };
    this.animate(0);
  },

  // Snorkeling at La Piscinita: coral ledge with a ladder into a natural turquoise pool, a gear kiosk, and swimmers.
  snorkel_piscinita(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0xa89c88);
    g.poly(isoPoly([[x + 1.0, y + 0.9], [x + 2.8, y + 0.9], [x + 2.8, y + 2.8], [x + 1.0, y + 2.8]])).fill(0x26c6da).stroke(OUTLINE);
    g.poly(isoPoly([[x + 1.3, y + 1.2], [x + 2.6, y + 1.2], [x + 2.6, y + 2.6], [x + 1.3, y + 2.6]])).fill(0x4dd0e1);
    for (const [px, py] of [[1.6, 1.6], [2.3, 2.2], [1.9, 2.4]]) {
      const c = iso(x + px, y + py);
      g.ellipse(c.x, c.y, 5, 2).fill({ color: 0xff8a65, alpha: 0.8 });
    }
    const l = iso(x + 1.0, y + 1.5);
    g.moveTo(l.x - 3, l.y - 10).lineTo(l.x - 3, l.y + 4).moveTo(l.x + 3, l.y - 10).lineTo(l.x + 3, l.y + 4).stroke({ width: 1.2, color: 0xb0bec5 });
    for (let k = 0; k < 3; k++) g.moveTo(l.x - 3, l.y - 7 + k * 4).lineTo(l.x + 3, l.y - 7 + k * 4).stroke({ width: 1, color: 0xb0bec5 });
    ramada(this, g, x + 0.2, y + 0.2, 0.8, 0.7, 16 + ctx.up, 0x26a69a);
    box(g, x + 0.25, y + 0.55, 0.7, 0.3, 7, 0xffb74d);
    const swim = new Graphics();
    this.anim.addChild(swim);
    const n = 1 + Math.min(ctx.tier, 3);
    this.animate = (time) => {
      swim.clear();
      if (!this.working) return;
      for (let k = 0; k < n; k++) {
        const f = (time * 0.08 + k / n) % 1;
        const c = iso(x + 1.4 + f * 1.1, y + 1.4 + ((k * 0.37) % 1));
        swim.ellipse(c.x, c.y, 6, 2).fill({ color: 0x00838f, alpha: 0.5 });
        swim.circle(c.x - 4, c.y - 1, 2.2).fill(0x8d5524);
        swim.rect(c.x - 2, c.y - 6, 1.2, 5).fill(0xffd54f);
      }
    };
    this.animate(0);
  },

  // La Loma lookout: the white wooden Baptist church with its red roof and bell tower, on the hilltop.
  mirador_la_loma(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0x7cb342);
    const H = 24 + ctx.up;
    box(g, x + 0.3, y + 0.5, 1.7, 1.2, H, 0xfafafa);
    for (let k = 1; k < 5; k++) {
      const a = iso(x + 0.3, y + 1.7, (H * k) / 5);
      const b = iso(x + 2.0, y + 1.7, (H * k) / 5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.7, color: 0xcfd8dc });
    }
    gableRoof(g, x + 0.3, y + 0.5, 1.7, 1.2, H, 14, 0xc62828, 0xfafafa);
    door(g, x + 0.3, y + 0.5, 1.2, 0.85, 15, 0x5d4037);
    windowOnRight(this, g, x + 0.3, y + 0.5, 1.7, 0.6, 10, 0x4fc3f7);
    // Bell tower at the front corner.
    const T = H + 22;
    box(g, x + 2.0, y + 1.2, 0.55, 0.55, T, 0xfafafa);
    windowOnFront(this, g, x + 2.0, y + 1.2, 0.55, 0.27, T - 12, 0x5d4037);
    const top = iso(x + 2.275, y + 1.475, T);
    const left = iso(x + 2.0, y + 1.75, T);
    const right = iso(x + 2.55, y + 1.2, T);
    const front = iso(x + 2.55, y + 1.75, T);
    g.poly([left.x, left.y, front.x, front.y, top.x, top.y - 22]).fill(0xb71c1c).stroke(OUTLINE);
    g.poly([front.x, front.y, right.x, right.y, top.x, top.y - 22]).fill(0xc62828).stroke(OUTLINE);
    g.moveTo(top.x, top.y - 22).lineTo(top.x, top.y - 30).moveTo(top.x - 3, top.y - 27).lineTo(top.x + 3, top.y - 27).stroke({ width: 1.4, color: 0x5d4037 });
    this.roofTop = { x: top.x, y: top.y - 30 };
    palmAt(g, iso(x + 0.3, y + 2.5).x, iso(x + 0.3, y + 2.5).y, 34);
  },
  // Beneficiadero: house with receiving hopper and washing tanks.
  wetmill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.5, 29, ctx);
    door(g, hx, hy, 1.5, 0.9, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.75, 14, PAL.balconyYellow);
    // Receiving hopper (funnel).
    const t = iso(x + 2.5, y + 0.8, 28);
    g.poly([t.x - 14, t.y - 6, t.x + 14, t.y - 6, t.x + 5, t.y + 12, t.x - 5, t.y + 12]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 14, 5).fill(PAL.cherry).stroke(OUTLINE);
    box(g, x + 2.35, y + 0.65, 0.3, 0.3, 18, 0x6c757d);
    // Washing tanks.
    for (const ty of [2.05, 2.45]) {
      box(g, x + 0.3, y + ty, 2.4, 0.32, 8, 0xc7beb0);
      g.poly(isoPoly([[x + 0.38, y + ty + 0.05, 8], [x + 2.62, y + ty + 0.05, 8], [x + 2.62, y + ty + 0.27, 8], [x + 0.38, y + ty + 0.27, 8]])).fill(0x6ec6d9);
    }
    const ripple = new Graphics();
    this.anim.addChild(ripple);
    this.animate = (time) => {
      ripple.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.4 + i / 3) % 1;
        const p = iso(x + 0.4 + f * 2.2, y + 2.21, 8);
        ripple.ellipse(p.x, p.y, 4, 1.5).fill({ color: 0xffffff, alpha: 0.7 * (1 - f) });
      }
    };
  },

  // Marquesina: translucent plastic roof over drying coffee beds.
  dryer(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.3;
    const H = 26 + ctx.up;
    // Raised parchment coffee drying beds (one more at second milestone).
    const beds = ctx.tier >= 2 ? [0.3, 0.95, 1.6] : [0.45, 1.25];
    for (const by of beds) {
      box(g, x0 + 0.2, y0 + by, w - 0.4, 0.5, 7, PAL.wood);
      g.poly(isoPoly([[x0 + 0.25, y0 + by + 0.05, 7], [x0 + w - 0.25, y0 + by + 0.05, 7], [x0 + w - 0.25, y0 + by + 0.45, 7], [x0 + 0.25, y0 + by + 0.45, 7]])).fill(PRODUCTS.parchment.color);
      for (let i = 0; i < 14; i++) {
        const p = iso(x0 + 0.35 + (i % 7) * 0.3, y0 + by + 0.12 + Math.floor(i / 7) * 0.2, 7);
        g.circle(p.x, p.y, 1.2).fill(shade(PRODUCTS.parchment.color, 0.75));
      }
    }
    // Postes.
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    // Arched plastic roof (approximated with translucent gable roof).
    const ym = y0 + d / 2;
    g.poly(isoPoly([[x0, y0, H], [x0 + w, y0, H], [x0 + w, ym, H + 14], [x0, ym, H + 14]])).fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
    g.poly(isoPoly([[x0 + w, y0, H], [x0 + w, y0 + d, H], [x0 + w, ym, H + 14]])).fill({ color: 0xe8f4f8, alpha: 0.45 }).stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
    g.poly(isoPoly([[x0, y0 + d, H], [x0 + w, y0 + d, H], [x0 + w, ym, H + 14], [x0, ym, H + 14]])).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });
    for (let i = 1; i < 5; i++) {
      const a = iso(x0 + (w * i) / 5, y0 + d, H);
      const b = iso(x0 + (w * i) / 5, ym, H + 14);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: ctx.trim, alpha: 0.6 });
    }
    this.roofTop = iso(x0 + w / 2, ym, H + 14);
    // Hanging light bulb under roof.
    const bulb = iso(x0 + w / 2, ym, H - 4);
    g.circle(bulb.x, bulb.y, 2.5).fill(0xffe9a8);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 30 });
    // Sun glint across plastic roof.
    const shine = new Graphics();
    this.anim.addChild(shine);
    this.animate = (time) => {
      const f = (time * 0.25) % 1;
      const p = iso(x0 + f * w, y0 + d * 0.75, H + 7);
      shine.clear().ellipse(p.x, p.y, 10, 4).fill({ color: 0xffffff, alpha: 0.6 * Math.sin(f * Math.PI) });
    };
  },

  // Trilladora: zinc-roofed shed housing hulling mill.
  huller(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 2.3, 1.8, 26, ctx, { wall: 0xb08a5a, plinth: false, roofColor: 0x9aa3a8, roofH: 12 });
    // Tablones.
    for (let i = 1; i < 8; i++) {
      const a = iso(hx + (2.3 * i) / 8, hy + 1.8, 0);
      const b = iso(hx + (2.3 * i) / 8, hy + 1.8, ctx.up ? 26 : H);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x7a5a3a, alpha: 0.6 });
    }
    // Open doorway revealing mill inside.
    g.poly(isoPoly([[hx + 0.4, hy + 1.8, 0], [hx + 1.3, hy + 1.8, 0], [hx + 1.3, hy + 1.8, 20], [hx + 0.4, hy + 1.8, 20]])).fill(0x3a2a1c).stroke(OUTLINE);
    box(g, hx + 0.55, hy + 1.85, 0.55, 0.4, 14, ctx.trim);
    const f = iso(hx + 0.83, hy + 2.05, 14);
    g.poly([f.x - 9, f.y - 12, f.x + 9, f.y - 12, f.x + 3, f.y, f.x - 3, f.y]).fill(0x6c757d).stroke(OUTLINE);
    windowOnRight(this, g, hx, hy, 2.3, 0.9, 12, 0xffc864);
    // Costales listos.
    sack(g, x + 2.4, y + 2.4, 0, PRODUCTS.green.color);
    sack(g, x + 2.65, y + 2.25, 0, PRODUCTS.green.color);
    sack(g, x + 2.5, y + 2.3, 9, PRODUCTS.green.color);
    const pipeTop = H + 18;
    const pipe = iso(hx + 2, hy + 0.5, pipeTop);
    box(g, hx + 1.9, hy + 0.4, 0.2, 0.2, pipeTop, 0x6c757d);
    this.smokePoints.push({ x: pipe.x, y: pipe.y - 4 });
    // Running machine vibration.
    const shaker = new Graphics();
    this.anim.addChild(shaker);
    this.animate = (time) => {
      shaker.clear();
      const j = Math.sin(time * 40) * 0.8;
      shaker.circle(f.x + j, f.y - 14, 2).fill(PRODUCTS.parchment.color);
      shaker.circle(f.x - 3 - j, f.y - 16, 1.6).fill(PRODUCTS.parchment.color);
    };
  },

  // Tostadora: brick building with tall chimney and roasting drum.
  roaster(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const brick = 0xb5653a;
    const H = 30 + ctx.up;
    box(g, hx, hy, 2.0, 1.7, H, brick);
    for (let r = 1; r < H / 5; r++) {
      const a = iso(hx, hy + 1.7, r * 5);
      const b = iso(hx + 2, hy + 1.7, r * 5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(brick, 0.7), alpha: 0.5 });
      const c = iso(hx + 2, hy, r * 5);
      const d = iso(hx + 2, hy + 1.7, r * 5);
      g.moveTo(c.x, c.y).lineTo(d.x, d.y).stroke({ width: 1, color: shade(brick, 0.55), alpha: 0.5 });
    }
    if (ctx.up) {
      balcony(g, hx, hy, 2.0, 1.7, 32, ctx.trim);
      windowOnFront(this, g, hx, hy, 1.7, 1.4, 33, 0xffc864);
    }
    gableRoof(g, hx, hy, 2.0, 1.7, H, 14, PAL.roof, brick);
    this.roofTop = iso(hx + 0.5, hy + 0.85, H + 14);
    door(g, hx, hy, 1.7, 0.6, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.85, 14, 0xffc864);
    const chimneyH = H + 36;
    box(g, hx + 1.4, hy + 0.3, 0.35, 0.35, chimneyH, shade(brick, 0.9));
    const top = iso(hx + 1.57, hy + 0.47, chimneyH);
    this.smokePoints.push({ x: top.x, y: top.y - 4 }, { x: top.x + 2, y: top.y - 6 });
    // Yard roasting drum.
    const dp = iso(x + 2.45, y + 2.4, 10);
    g.ellipse(dp.x, dp.y + 10, 16, 6).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(dp.x - 14, dp.y - 8, 28, 16).fill(0x3b3b3b).stroke(OUTLINE);
    g.ellipse(dp.x + 14, dp.y, 4, 8).fill(0x555555).stroke(OUTLINE);
    this.lights.push({ x: dp.x - 4, y: dp.y - 12, r: 16, color: 0xff7a1a });
    const drum = new Graphics();
    this.anim.addChild(drum);
    this.animate = (time) => {
      drum.clear();
      for (let i = 0; i < 3; i++) {
        const yy = dp.y - 6 + (((time * 20 + i * 5) % 14) | 0);
        drum.moveTo(dp.x - 12, yy).lineTo(dp.x + 12, yy).stroke({ width: 1, color: 0x777777 });
      }
      drum.circle(dp.x - 4, dp.y - 12, 2).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 10) * 0.4 });
    };
  },

  // Molino: house with spinning waterwheel.
  grinder(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.8, 1.8, 34, ctx, { roofH: 18 });
    door(g, hx, hy, 1.8, 0.8, 16, ctx.trim);
    windowOnFront(this, g, hx, hy, 1.8, 1.4, 14, PAL.balconyYellow);
    // Millrace water channel beside wheel.
    g.poly(isoPoly([[x + 2.2, y + 0.2], [x + 2.6, y + 0.2], [x + 2.6, y + 2.8], [x + 2.2, y + 2.8]])).fill(0x6ec6d9).stroke({ width: 1, color: 0x3a7ca5, alpha: 0.6 });
    const c = iso(hx + 1.95, hy + 1.0, 20);
    const holder = new Container();
    holder.position.set(c.x, c.y);
    holder.skew.y = -Math.atan(0.5);
    holder.scale.x = 0.9;
    const wheel = new Graphics();
    const r = ctx.tier >= 2 ? 23 : 19;
    wheel.circle(0, 0, r).stroke({ width: 4, color: PAL.wood });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      wheel.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r).stroke({ width: 2, color: PAL.woodDark });
      wheel.rect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6).fill(PAL.wood);
    }
    wheel.circle(0, 0, 3).fill(PAL.woodDark);
    holder.addChild(wheel);
    this.anim.addChild(holder);
    this.animate = (time) => {
      wheel.rotation = time * 1.6;
    };
  },

  // Compostera: three wooden compost bins fed by pulp chute.
  composter(g, x, y, ctx) {
    // Chute incoming from Beneficiadero (left).
    const a = iso(x - 0.6, y + 1.5, 4);
    const b = iso(x + 0.4, y + 1.5, 4);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 5, color: PAL.wood });
    g.moveTo(a.x, a.y - 1).lineTo(b.x, b.y - 1).stroke({ width: 2, color: PRODUCTS.pulp.color });
    const bins = [[0.35, 0.3], [0.35, 1.15], [0.35, 2.0]];
    for (const [bx, by] of bins) {
      box(g, x + bx, y + by, 2.2, 0.7, 12 + ctx.up / 2, PAL.wood);
      // Compost mounding over tops.
      const c = iso(x + bx + 1.1, y + by + 0.35, 12 + ctx.up / 2);
      g.ellipse(c.x, c.y, 34, 10).fill(0x4a3424).stroke(OUTLINE);
      g.ellipse(c.x - 8, c.y - 2, 10, 3).fill(0x5e4430);
    }
    // Shovel stuck in compost.
    const sh = iso(x + 1.6, y + 1.5, 20 + ctx.up / 2);
    g.moveTo(sh.x, sh.y).lineTo(sh.x + 6, sh.y - 22).stroke({ width: 2.5, color: PAL.woodDark });
    g.poly([sh.x - 4, sh.y, sh.x + 4, sh.y, sh.x + 2, sh.y + 8, sh.x - 2, sh.y + 8]).fill(0x9aa3a8).stroke(OUTLINE);
    this.roofTop = iso(x + 1.45, y + 0.65, 22);
    // Earthworms peeking out while active (real organic compost).
    const worms = new Graphics();
    this.anim.addChild(worms);
    this.animate = (time) => {
      worms.clear();
      bins.forEach(([bx, by], i) => {
        const up = Math.max(0, Math.sin(time * 2 + i * 2));
        const c = iso(x + bx + 0.7 + i * 0.3, y + by + 0.35, 12 + ctx.up / 2);
        worms.moveTo(c.x, c.y).quadraticCurveTo(c.x + 3, c.y - 5 * up, c.x + 1, c.y - 8 * up).stroke({ width: 2, color: 0xd98c8c });
      });
    };
  },

  // Molienda: zinc-roofed shed over three-roller cane press, cane bundles, and bagazo pile.
  cane_mill(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.0;
    const d = 1.8;
    const H = 24 + ctx.up;
    // Concrete slab.
    g.poly(isoPoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]])).fill(0xc7beb0).stroke(OUTLINE);
    // Cane crusher: frame and three rollers (cylinders).
    box(g, x0 + 0.6, y0 + 0.6, 0.8, 0.6, 8, 0x5a5a5a);
    const rollers = [];
    for (const k of [0, 1, 2]) {
      const c = iso(x0 + 0.75 + k * 0.25, y0 + 0.9, 18);
      g.rect(c.x - 5, c.y - 10, 10, 18).fill(0x8a8f94).stroke(OUTLINE);
      g.ellipse(c.x, c.y - 10, 5, 2.5).fill(0xb0b5ba).stroke(OUTLINE);
      rollers.push(c);
    }
    // Posts and gable zinc roof.
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, 0x9aa3a8, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Cane bundles on left and bagazo pile on right (toward Hornilla).
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.25 + i * 0.12, y + 2.5, i * 3);
      g.roundRect(p.x - 14, p.y - 5, 28, 6, 3).fill(0x9cc65b).stroke(OUTLINE);
    }
    const b = iso(x + 2.5, y + 2.4);
    g.ellipse(b.x, b.y - 6, 18, 9).fill(PRODUCTS.bagasse.color).stroke(OUTLINE);
    g.ellipse(b.x - 4, b.y - 10, 8, 3).fill(0xe8d6a8);
    // Rollers spin while active.
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      rollers.forEach((c, k) => {
        const yy = c.y - 8 + (((time * 30 + k * 6) % 16) | 0);
        spin.moveTo(c.x - 5, yy).lineTo(c.x + 5, yy).stroke({ width: 1.5, color: 0x5a5a5a });
      });
    };
  },

  // Hornilla: long brick furnace with boiling syrup pans and chimney.
  furnace(g, x, y, ctx) {
    const brick = 0xb5653a;
    const x0 = x + 0.25;
    const y0 = y + 0.6;
    box(g, x0, y0, 2.5, 1.0, 12, brick);
    for (let r = 1; r < 3; r++) {
      const a = iso(x0, y0 + 1.0, r * 4);
      const b2 = iso(x0 + 2.5, y0 + 1.0, r * 4);
      g.moveTo(a.x, a.y).lineTo(b2.x, b2.y).stroke({ width: 1, color: shade(brick, 0.7), alpha: 0.5 });
    }
    // Glowing furnace firebox door (front).
    const mouth = iso(x0 + 0.3, y0 + 1.0, 4);
    g.ellipse(mouth.x, mouth.y, 7, 5).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 26, color: 0xff7a1a });
    // Syrup pans: second milestone adds an extra pan.
    const pans = ctx.tier >= 2 ? [0.35, 0.95, 1.55, 2.15] : [0.5, 1.25, 2.0];
    const tops = [];
    for (const px of pans) {
      const c = iso(x0 + px, y0 + 0.5, 12);
      g.ellipse(c.x, c.y, 15, 7).fill(0xb87333).stroke(OUTLINE);
      g.ellipse(c.x, c.y, 11, 5).fill(PRODUCTS.melado.color);
      tops.push(c);
    }
    // Tall back chimney.
    const chimneyH = 56 + ctx.up;
    box(g, x0 + 2.2, y0 - 0.45, 0.35, 0.35, chimneyH, shade(brick, 0.9));
    const top = iso(x0 + 2.37, y0 - 0.28, chimneyH);
    this.smokePoints.push({ x: top.x, y: top.y - 4 }, { x: top.x + 2, y: top.y - 6 });
    this.roofTop = iso(x0 + 0.4, y0 - 0.3, 26);
    // Bagazo fuel pile beside firebox.
    const pile = iso(x + 0.3, y + 2.8);
    g.ellipse(pile.x, pile.y - 4, 13, 6).fill(PRODUCTS.bagasse.color).stroke(OUTLINE);
    // Syrup bubbles and firebox flickers while active.
    const boil = new Graphics();
    this.anim.addChild(boil);
    this.animate = (time) => {
      boil.clear();
      tops.forEach((c, k) => {
        for (let i = 0; i < 2; i++) {
          const f = (time * 1.5 + k * 0.3 + i * 0.5) % 1;
          boil.circle(c.x - 4 + i * 7, c.y - f * 3, 1.8 * (1 - f)).fill({ color: 0xffe0a0, alpha: 1 - f });
        }
      });
      boil.ellipse(mouth.x, mouth.y + 1, 5, 3).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 9) * 0.3 });
    };
  },

  // Gaveras: wooden tables of panela molds under a clay-tile shed.
  molds(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.2;
    const H = 26 + ctx.up;
    const tables = ctx.tier >= 2 ? [0.25, 0.95, 1.6] : [0.4, 1.3];
    for (const ty of tables) {
      box(g, x0 + 0.2, y0 + ty, w - 0.4, 0.5, 9, PAL.wood);
      // Grid of panela mold trays.
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
          const p = iso(x0 + 0.38 + i * 0.32, y0 + ty + 0.13 + j * 0.24, 9);
          g.poly([p.x - 5, p.y, p.x, p.y - 2.5, p.x + 5, p.y, p.x, p.y + 2.5]).fill(PRODUCTS.panela.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
        }
      }
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 14, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 14);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 30 });
    // Steam rising off freshly poured panela.
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        const p = iso(x0 + 0.6 + i * 0.7, y0 + tables[0] + 0.25, 12 + f * 18);
        steam.circle(p.x, p.y, 3 + f * 4).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
  },

  // Pulverizadora: cottage with grinding machine, pulverized panela sacks, and golden dust.
  pulverizer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Yard grinder: hopper and discharge chute.
    const m = iso(x + 1.6, y + 2.35, 0);
    box(g, x + 1.3, y + 2.1, 0.6, 0.5, 12, 0xd7263d);
    g.poly([m.x - 10, m.y - 22, m.x + 10, m.y - 22, m.x + 4, m.y - 12, m.x - 4, m.y - 12]).fill(0x9aa3a8).stroke(OUTLINE);
    // Sacks of pulverized panela.
    for (const [bx, by, z] of [[2.45, 2.2, 0], [2.7, 2.45, 0], [2.55, 2.3, 10]]) {
      const p = iso(x + bx, y + by, z);
      g.roundRect(p.x - 7, p.y - 13, 14, 13, 3).fill(0xf4efe6).stroke(OUTLINE);
      g.rect(p.x - 5, p.y - 9, 10, 4).fill(PRODUCTS.panela_powder.color);
    }
    // Golden dust puffing out of grinder.
    const dust = new Graphics();
    this.anim.addChild(dust);
    this.animate = (time) => {
      dust.clear();
      for (let i = 0; i < 5; i++) {
        const f = (time * 0.8 + i / 5) % 1;
        dust.circle(m.x + Math.sin(i * 2 + time) * 8, m.y - 22 - f * 16, 1.5).fill({ color: PRODUCTS.panela_powder.color, alpha: 1 - f });
      }
    };
  },

  // Pasteurizadora: white hall with twin stainless tanks, piping, and steam.
  pasteurizer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.7, 1.5, 26, ctx, { wall: 0xf7f7f2, roofColor: 0x8fa3ad, roofH: 12 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.7, 0.75, 13, 0xd6ecff);
    // Stainless steel cylindrical tanks on right.
    const tanks = ctx.tier >= 2 ? [[2.35, 0.7], [2.35, 1.5], [2.35, 2.3]] : [[2.35, 0.9], [2.35, 1.9]];
    const tops = [];
    for (const [tx, ty] of tanks) {
      const b = iso(x + tx, y + ty);
      const H = 30 + ctx.up;
      g.rect(b.x - 9, b.y - H, 18, H).fill(0xc7ccd1).stroke(OUTLINE);
      g.rect(b.x + 3, b.y - H, 6, H).fill({ color: 0x9aa3a8, alpha: 0.8 });
      g.ellipse(b.x, b.y - H, 9, 4.5).fill(0xe6e9ec).stroke(OUTLINE);
      g.ellipse(b.x, b.y, 9, 4.5).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
      tops.push({ x: b.x, y: b.y - H });
    }
    // Piping linking building to tanks.
    const a = iso(hx + 1.7, hy + 0.75, 12);
    const b2 = iso(x + 2.35, y + 0.9, 12);
    g.moveTo(a.x, a.y).lineTo(b2.x, b2.y).stroke({ width: 3, color: 0x9aa3a8 });
    this.roofTop = iso(hx + 0.85, hy + 0.75, 26 + ctx.up + 12);
    // Pasteurization steam.
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      tops.forEach((t, k) => {
        const f = (time * 0.7 + k * 0.4) % 1;
        steam.circle(t.x, t.y - 4 - f * 18, 3 + f * 4).fill({ color: 0xffffff, alpha: 0.55 * (1 - f) });
      });
    };
  },

  // Descremadora: cottage with spinning cream separator and cream cans.
  separator(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.6, 1.4, 24, ctx, { wall: 0xfff3d6, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.6, 0.7, 12, PAL.balconyYellow);
    // Yard centrifuge: stand, bowl, and hand crank.
    const c = iso(x + 2.35, y + 1.2);
    g.rect(c.x - 4, c.y - 14, 8, 14).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 18, 11, 6).fill(0xd8dde2).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 19, 7, 3.5).fill(PRODUCTS.cream.color);
    // Cream cans.
    for (const [bx, by] of [[1.0, 2.5], [1.35, 2.62], [1.7, 2.5]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 4, p.y - 13, 8, 13, 2).fill(0xc7ccd1).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 13, 3, 1.4).fill(PRODUCTS.cream.color);
    }
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      const a = time * 8;
      spin.moveTo(c.x, c.y - 19).lineTo(c.x + Math.cos(a) * 10, c.y - 19 + Math.sin(a) * 5).stroke({ width: 2, color: 0x5a5a5a });
      spin.circle(c.x + Math.cos(a) * 10, c.y - 19 + Math.sin(a) * 5, 2).fill(0xd7263d);
    };
  },

  // Batidora: rotating wooden butter churn barrel under shed with butter blocks.
  churn(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 2.0;
    const H = 24 + ctx.up;
    g.poly(isoPoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]])).fill(0xc7beb0).stroke(OUTLINE);
    // Soportes y barril.
    const c = iso(x0 + 1.1, y0 + 1.0, 14);
    g.rect(c.x - 16, c.y - 2, 3, 16).fill(PAL.woodDark);
    g.rect(c.x + 13, c.y - 2, 3, 16).fill(PAL.woodDark);
    const barrel = new Graphics();
    this.anim.addChild(barrel);
    // Table with butter blocks.
    box(g, x0 + 1.5, y0 + 1.5, 0.7, 0.4, 8, PAL.wood);
    for (const k of [0, 1, 2]) {
      const p = iso(x0 + 1.6 + k * 0.2, y0 + 1.7, 8);
      g.rect(p.x - 4, p.y - 4, 8, 4).fill(PRODUCTS.butter.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 28 });
    // Barrel spins while active (foreshortened by rotation angle).
    this.animate = (time) => {
      const k = Math.abs(Math.cos(time * 3));
      barrel.clear();
      barrel.roundRect(c.x - 13, c.y - 10 - 4 * k, 26, 12 + 8 * k, 5).fill(0xa0703c).stroke(OUTLINE);
      barrel.moveTo(c.x - 13, c.y - 4).lineTo(c.x + 13, c.y - 4).stroke({ width: 1.5, color: 0x5a5a5a });
    };
    this.animate(0);
  },

  // Quesera: green-plinth house with cheese curing shelves and wooden screw press.
  cheesery(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 26, ctx, { wall: 0xf9f2df, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 13, PAL.balconyYellow);
    // Outdoor shelf lined with cheese wheels.
    box(g, x + 0.4, y + 2.15, 1.5, 0.35, 10, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 0.55 + i * 0.35, y + 2.3, 10);
      g.ellipse(p.x, p.y - 3, 6, 3).fill(PRODUCTS.cheese.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 5, 6, 3).fill(shade(PRODUCTS.cheese.color, 1.05)).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Wooden screw cheese press moving up and down.
    const pr = iso(x + 2.45, y + 2.3);
    g.rect(pr.x - 9, pr.y - 6, 18, 6).fill(PAL.woodDark).stroke(OUTLINE);
    g.rect(pr.x - 8, pr.y - 30, 3, 26).fill(PAL.wood);
    g.rect(pr.x + 5, pr.y - 30, 3, 26).fill(PAL.wood);
    g.rect(pr.x - 9, pr.y - 33, 18, 4).fill(PAL.woodDark).stroke(OUTLINE);
    const press = new Graphics();
    this.anim.addChild(press);
    this.roofTop = iso(hx + 1.0, hy + 0.75, 26 + ctx.up + 14);
    this.animate = (time) => {
      const k = (Math.sin(time * 2) + 1) / 2;
      press.clear();
      press.rect(pr.x - 1, pr.y - 30, 2, 8 + k * 8).fill(0x5a5a5a);
      press.rect(pr.x - 6, pr.y - 22 + k * 8, 12, 4).fill(PAL.wood).stroke(OUTLINE);
      press.ellipse(pr.x, pr.y - 9, 6, 3).fill(PRODUCTS.cheese.color);
    };
    this.animate(0);
  },

  // Paila de arequipe: huge copper kettle over hearth, stirring paddle, and arequipe jars.
  arequipe_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    // Brick hearth holding copper kettle.
    box(g, x0 + 0.5, y0 + 0.5, 1.3, 1.1, 10, 0xb5653a);
    const c = iso(x0 + 1.15, y0 + 1.05, 10);
    g.ellipse(c.x, c.y, 26, 13).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(c.x, c.y, 21, 10).fill(PRODUCTS.arequipe.color);
    const mouth = iso(x0 + 0.8, y0 + 1.6, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    // Firewood.
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.3 + i * 0.12, y + 2.65, i * 2);
      g.roundRect(p.x - 10, p.y - 4, 20, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    // Arequipe jars and pulverized panela sacks (brought by Chiva).
    for (const [bx, by] of [[2.2, 2.5], [2.45, 2.62], [2.7, 2.5]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 4, p.y - 10, 8, 10, 2).fill(PRODUCTS.arequipe.color).stroke(OUTLINE);
      g.rect(p.x - 4, p.y - 12, 8, 3).fill(0xd7263d);
    }
    const sack2 = iso(x + 2.6, y + 1.2);
    g.roundRect(sack2.x - 7, sack2.y - 13, 14, 13, 3).fill(0xf4efe6).stroke(OUTLINE);
    g.rect(sack2.x - 5, sack2.y - 9, 10, 4).fill(PRODUCTS.panela_powder.color);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    // Stirring paddle circles inside kettle while arequipe bubbles.
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      const a = time * 2.5;
      const ex = c.x + Math.cos(a) * 12;
      const ey = c.y + Math.sin(a) * 5;
      stir.moveTo(ex, ey).lineTo(ex + 8, ey - 26).stroke({ width: 3, color: PAL.wood });
      for (let i = 0; i < 2; i++) {
        const f = (time * 1.2 + i * 0.5) % 1;
        stir.circle(c.x - 8 + i * 14, c.y - f * 3, 2 * (1 - f)).fill({ color: 0xe0a070, alpha: 1 - f });
      }
      stir.ellipse(mouth.x, mouth.y + 1, 4, 2.5).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 9) * 0.3 });
    };
    this.animate(0);
  },

  // Fermentation boxes: three stepped wooden boxes covered with plantain leaves.
  fermenter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    const boxes = [[0.2, 0.3, 14], [0.95, 0.75, 9], [1.7, 1.2, 4]];
    for (const [bx, by, z] of boxes) {
      box(g, x0 + bx, y0 + by, 0.7, 0.7, 10, 0x8b5a2b, { z });
      // Plantain leaves laid on top.
      const c = iso(x0 + bx + 0.35, y0 + by + 0.35, z + 10);
      g.ellipse(c.x - 3, c.y, 11, 4).fill(0x5e9a3c).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.ellipse(c.x + 4, c.y - 1, 9, 3).fill(0x74b14a);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, 0x9aa3a8, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Draining cacao sweatings and warm fermentation vapor.
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      boxes.forEach(([bx, by, z], k) => {
        const f = (time * 0.5 + k / 3) % 1;
        const p = iso(x0 + bx + 0.35, y0 + by + 0.35, z + 12 + f * 14);
        steam.circle(p.x, p.y, 2.5 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      });
    };
  },

  // Secadero: raised wooden drying deck for cacao with rolling rail roof.
  cacao_dryer(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.0;
    // Patas y tarima.
    for (const [px, py] of [[0.1, 0.1], [w - 0.1, 0.1], [0.1, d - 0.1], [w - 0.1, d - 0.1]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 10, PAL.woodDark);
    box(g, x0, y0, w, d, 3, PAL.wood, { z: 10 });
    // Spread cacao beans (more at milestones).
    const rng = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (let k = 0; k < 40 + ctx.tier * 10; k++) {
      const p = iso(x0 + 0.15 + rng(k) * (w - 0.3), y0 + 0.15 + rng(k + 99) * (d - 0.3), 13);
      g.ellipse(p.x, p.y, 1.6, 1).fill(k % 3 ? PRODUCTS.cacao_dry.color : PRODUCTS.cacao_fermented.color);
    }
    // Rails and sliding roof (open by day, slides while active).
    const rail = iso(x0 + w, y0 + 0.1, 13);
    const rail2 = iso(x0 + w + 0.6, y0 + 0.1, 13);
    g.moveTo(rail.x, rail.y).lineTo(rail2.x, rail2.y).stroke({ width: 2, color: 0x555555 });
    const roof = new Graphics();
    this.anim.addChild(roof);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, 34 + ctx.up);
    this.animate = (time) => {
      const off = 0.6 + Math.sin(time * 0.6) * 0.5;
      roof.clear();
      const H = 26 + ctx.up;
      for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(roof, x0 + off + px - 0.04, y0 + py - 0.04, 0.08, 0.08, H - 13, 0x9aa3a8, { z: 13 });
      gableRoof(roof, x0 + off, y0, w, d, H, 8, 0x9aa3a8, 0xb08a5a);
    };
    this.animate(0);
  },

  // Cacao roaster: rotating drum over brick firebox with chimney.
  cacao_roaster(g, x, y, ctx) {
    const brick = 0xb5653a;
    const x0 = x + 0.4;
    const y0 = y + 0.6;
    box(g, x0, y0, 1.8, 1.2, 12, brick);
    const mouth = iso(x0 + 0.4, y0 + 1.2, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    // Drum support brackets.
    const c = iso(x0 + 0.9, y0 + 0.6, 24);
    g.rect(c.x - 20, c.y - 2, 3, 14).fill(0x555555);
    g.rect(c.x + 17, c.y - 2, 3, 14).fill(0x555555);
    const drum = new Graphics();
    this.anim.addChild(drum);
    const chimneyH = 52 + ctx.up;
    box(g, x0 + 1.5, y0 - 0.3, 0.3, 0.3, chimneyH, shade(brick, 0.9));
    const top = iso(x0 + 1.65, y0 - 0.15, chimneyH);
    this.smokePoints.push({ x: top.x, y: top.y - 4 });
    this.roofTop = iso(x0 + 0.3, y0 - 0.2, 28);
    // Waiting sacks of dried cacao.
    for (const [bx, by] of [[0.35, 2.55], [0.7, 2.7]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(PAL.sack).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9, 3.5, 1.8).fill(PRODUCTS.cacao_dry.color);
    }
    this.animate = (time) => {
      drum.clear();
      drum.roundRect(c.x - 17, c.y - 10, 34, 18, 8).fill(0x6b6f73).stroke(OUTLINE);
      for (let k = 0; k < 4; k++) {
        const xx = c.x - 14 + ((time * 20 + k * 8) % 30);
        drum.moveTo(xx, c.y - 9).lineTo(xx, c.y + 7).stroke({ width: 1.5, color: 0x45494d });
      }
      drum.ellipse(mouth.x, mouth.y + 1, 4, 2.5).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 9) * 0.3 });
    };
    this.animate(0);
  },

  // Cacao grinder: cottage with turning grindstone dripping cacao paste.
  cacao_mill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.7, 1.4, 26, ctx, { wall: 0xf1e3cf, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.7, 0.7, 13, PAL.balconyYellow);
    // Yard grindstone.
    const c = iso(x + 2.3, y + 2.2);
    g.ellipse(c.x, c.y - 4, 16, 8).fill(0x9a948a).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 6, 11, 5).fill(PRODUCTS.cacao_paste.color);
    const stone = new Graphics();
    this.anim.addChild(stone);
    this.animate = (time) => {
      stone.clear();
      const a = time * 2;
      const sx = c.x + Math.cos(a) * 7;
      const sy = c.y - 8 + Math.sin(a) * 3;
      stone.moveTo(c.x, c.y - 8).lineTo(sx, sy).stroke({ width: 2, color: PAL.woodDark });
      stone.ellipse(sx, sy - 2, 5, 6).fill(0xb8b2a6).stroke(OUTLINE);
    };
    this.animate(0);
  },

  // Chocolate table: open shed with long molding table and chocolate tablets.
  chocolate_table(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.2;
    const H = 26 + ctx.up;
    const tables = ctx.tier >= 2 ? [0.3, 1.0, 1.6] : [0.45, 1.3];
    for (const ty of tables) {
      box(g, x0 + 0.2, y0 + ty, w - 0.4, 0.5, 9, PAL.wood);
      for (let i = 0; i < 7; i++) {
        const p = iso(x0 + 0.35 + i * 0.28, y0 + ty + 0.25, 9);
        g.circle(p.x, p.y, 3).fill(PRODUCTS.table_chocolate.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      }
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 28 });
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        const p = iso(x0 + 0.6 + i * 0.7, y0 + tables[0] + 0.25, 12 + f * 16);
        steam.circle(p.x, p.y, 2.5 + f * 3.5).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
    };
  },

  // Chocolatería: shop with striped awning, display case, and stacked chocolate bars.
  chocolatier(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xfbe3e8, roofH: 14 });
    door(g, hx, hy, 1.5, 1.8, 17, ctx.trim);
    // Vitrina iluminada.
    g.poly(isoPoly([[hx + 0.3, hy + 1.5, 6], [hx + 1.3, hy + 1.5, 6], [hx + 1.3, hy + 1.5, 18], [hx + 0.3, hy + 1.5, 18]])).fill(0xfff3d6).stroke(OUTLINE);
    for (let i = 0; i < 4; i++) {
      const p = iso(hx + 0.45 + i * 0.25, hy + 1.5, 10);
      g.rect(p.x - 3, p.y - 3, 6, 4).fill(i % 2 ? PRODUCTS.milk_chocolate.color : 0xd7263d);
    }
    const win = iso(hx + 0.8, hy + 1.5, 12);
    this.lights.push({ x: win.x, y: win.y, r: 26 });
    // Striped awning over display window.
    for (let i = 0; i < 6; i++) {
      const a = hx + 0.2 + i * 0.2;
      g.poly(isoPoly([[a, hy + 1.5, 21], [a + 0.2, hy + 1.5, 21], [a + 0.2, hy + 1.85, 16], [a, hy + 1.85, 16]])).fill(i % 2 ? 0xffffff : 0xd7263d).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, PAL.balconyYellow);
    // Stacked boxes of chocolate bars.
    const stack = [[2.4, 2.4, 0], [2.7, 2.4, 0], [2.55, 2.4, 9]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + bx, y + by, z);
      g.roundRect(p.x - 7, p.y - 9, 14, 9, 2).fill(0x8b5a3c).stroke(OUTLINE);
      g.rect(p.x - 5, p.y - 6, 10, 2).fill(0xe8b90f);
    }
  },

  // Desgranadora: cottage with hand-cranked sheller, cob heap, and falling corn kernels.
  sheller(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.6, 1.4, 24, ctx, { wall: 0xf3e6c4, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.6, 0.7, 12, PAL.balconyYellow);
    // Pile of corn cobs.
    for (let k = 0; k < 7; k++) {
      const p = iso(x + 0.5 + (k % 4) * 0.2, y + 2.45 + Math.floor(k / 4) * 0.15, Math.floor(k / 4) * 4);
      g.ellipse(p.x, p.y - 3, 5, 2.5).fill(PRODUCTS.corn_cob.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Machine: red hopper and spinning crank.
    const m = iso(x + 2.35, y + 1.6);
    box(g, x + 2.1, y + 1.4, 0.5, 0.45, 12, 0xd7263d);
    g.poly([m.x - 9, m.y - 22, m.x + 9, m.y - 22, m.x + 4, m.y - 12, m.x - 4, m.y - 12]).fill(0x9aa3a8).stroke(OUTLINE);
    const crank = new Graphics();
    this.anim.addChild(crank);
    this.animate = (time) => {
      crank.clear();
      const a = time * 6;
      crank.moveTo(m.x + 6, m.y - 8).lineTo(m.x + 6 + Math.cos(a) * 6, m.y - 8 + Math.sin(a) * 6).stroke({ width: 2, color: 0x5a5a5a });
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.2 + i / 4) % 1;
        crank.circle(m.x - 2 + i * 1.5, m.y - 2 + f * 8, 1.2).fill({ color: PRODUCTS.corn_kernels.color, alpha: 1 - f * 0.5 });
      }
    };
    this.animate(0);
  },

  // Piladora: twin wooden mortars with pestles pounding up and down under open shed.
  corn_huller(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 2.0;
    const H = 26 + ctx.up;
    g.poly(isoPoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]])).fill(0xc7beb0).stroke(OUTLINE);
    const mortars = ctx.tier >= 2 ? [[0.6, 0.7], [1.6, 0.7], [1.1, 1.4]] : [[0.7, 0.9], [1.6, 0.9]];
    const tops = mortars.map(([mx, my]) => {
      const c = iso(x0 + mx, y0 + my);
      g.rect(c.x - 7, c.y - 16, 14, 16).fill(0x8b5a2b).stroke(OUTLINE);
      g.ellipse(c.x, c.y - 16, 7, 3).fill(PRODUCTS.corn_hulled.color).stroke(OUTLINE);
      return c;
    });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const pestles = new Graphics();
    this.anim.addChild(pestles);
    this.animate = (time) => {
      pestles.clear();
      tops.forEach((c, k) => {
        const up = Math.abs(Math.sin(time * 4 + k * 1.6)) * 10;
        pestles.roundRect(c.x - 2, c.y - 40 - up, 4, 24, 2).fill(0xa0703c).stroke(OUTLINE);
      });
    };
    this.animate(0);
  },

  // Mass mill: cottage with corona grinder at door and masa balls in wooden trough.
  dough_mill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.4, 25, ctx, { wall: 0xf9f2df, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.7, 12, PAL.balconyYellow);
    // Trough filled with masa dough balls.
    box(g, x + 0.4, y + 2.15, 1.2, 0.45, 5, PAL.wood);
    for (let k = 0; k < 4; k++) {
      const p = iso(x + 0.55 + k * 0.28, y + 2.37, 5);
      g.circle(p.x, p.y - 3, 3.5).fill(PRODUCTS.corn_dough.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    // Corona mill bolted to table with spinning crank.
    const m = iso(x + 2.4, y + 2.2);
    box(g, x + 2.15, y + 1.95, 0.5, 0.5, 10, PAL.woodDark);
    g.rect(m.x - 5, m.y - 22, 10, 10).fill(0x6b6f73).stroke(OUTLINE);
    const crank = new Graphics();
    this.anim.addChild(crank);
    this.animate = (time) => {
      crank.clear();
      const a = time * 5;
      crank.moveTo(m.x + 5, m.y - 17).lineTo(m.x + 5 + Math.cos(a) * 8, m.y - 17 + Math.sin(a) * 4).stroke({ width: 2, color: 0x45494d });
      crank.circle(m.x + 5 + Math.cos(a) * 8, m.y - 17 + Math.sin(a) * 4, 2).fill(PAL.wood);
    };
    this.animate(0);
  },

  // Budare: clay hearth with round griddle full of arepas and chimney.
  budare(g, x, y, ctx) {
    const clay = 0xb5653a;
    const x0 = x + 0.4;
    const y0 = y + 0.5;
    box(g, x0, y0, 1.8, 1.4, 12, clay);
    const mouth = iso(x0 + 0.5, y0 + 1.4, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    const c = iso(x0 + 0.9, y0 + 0.7, 12);
    g.ellipse(c.x, c.y, 24, 12).fill(0x3a3a3a).stroke(OUTLINE);
    const arepas = ctx.tier >= 2 ? 7 : 5;
    for (let k = 0; k < arepas; k++) {
      const a = (k / arepas) * Math.PI * 2;
      g.ellipse(c.x + Math.cos(a) * 12, c.y + Math.sin(a) * 6, 5, 2.5).fill(PRODUCTS.arepa.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    const chimneyH = 44 + ctx.up;
    box(g, x0 + 1.5, y0 - 0.2, 0.3, 0.3, chimneyH, shade(clay, 0.9));
    const top = iso(x0 + 1.65, y0 - 0.05, chimneyH);
    this.smokePoints.push({ x: top.x, y: top.y - 4 });
    this.roofTop = iso(x0 + 0.3, y0 - 0.2, 26);
    // Firewood.
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.3 + i * 0.12, y + 2.7, i * 2);
      g.roundRect(p.x - 10, p.y - 4, 20, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      fire.ellipse(mouth.x, mouth.y + 1, 4, 2.5).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 9) * 0.3 });
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.7 + i * 0.5) % 1;
        fire.circle(c.x - 6 + i * 12, c.y - 4 - f * 14, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.4 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Arepa stand: colorful kiosk with beach umbrella, counter, and cheese-arepa trays.
  arepa_stand(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0, y0, 2.0, 0.9, 16, PAL.balconyYellow);
    box(g, x0, y0 + 0.9, 2.0, 0.1, 16, PAL.balconyRed);
    // Trays arranged along counter.
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.3 + k * 0.45, y0 + 0.45, 16);
      g.ellipse(p.x, p.y, 7, 3.5).fill(0xffffff).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 1.5, 5, 2.5).fill(PRODUCTS.cheese_arepa.color);
      g.ellipse(p.x, p.y - 2.5, 3, 1.2).fill(0xfff3d6);
    }
    // Multi-colored umbrella.
    const pole = iso(x0 + 1.0, y0 + 1.6);
    g.rect(pole.x - 1, pole.y - 52 - ctx.up, 2, 52 + ctx.up).fill(0x555555);
    const top = { x: pole.x, y: pole.y - 52 - ctx.up };
    const colors = [PAL.balconyRed, 0xffffff, PAL.balconyBlue, PAL.balconyYellow, PAL.balconyGreen, 0xffffff];
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2;
      const a1 = ((k + 1) / 6) * Math.PI * 2;
      g.poly([top.x, top.y - 6, top.x + Math.cos(a0) * 34, top.y + Math.sin(a0) * 12, top.x + Math.cos(a1) * 34, top.y + Math.sin(a1) * 12]).fill(colors[k]).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    this.roofTop = { x: top.x, y: top.y - 6 };
    this.lights.push({ x: top.x, y: top.y + 10, r: 34 });
    // Wooden customer stools.
    for (const [bx, by] of [[0.4, 2.5], [1.9, 2.5]]) box(g, x + bx, y + by, 0.6, 0.25, 6, PAL.wood);
    // Steam rising from hot arepas.
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        const p = iso(x0 + 0.5 + i * 0.5, y0 + 0.45, 18 + f * 14);
        steam.circle(p.x, p.y, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
    };
  },

  // Coffee urn shop: corner café with silver greca urn on counter and steam.
  greca(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 1.9, 1.3, 26, ctx, { wall: 0xf2a7a0 });
    door(g, hx, hy, 1.3, 0.5, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.65, 10, 0xffffff);
    // Front counter holding coffee urn.
    box(g, x + 0.9, y + 1.85, 1.3, 0.45, 12, PAL.wood);
    const base = iso(x + 1.55, y + 2.07, 12);
    g.roundRect(base.x - 7, base.y - 22, 14, 22, 4).fill(0xc7ccd1).stroke(OUTLINE);
    g.ellipse(base.x, base.y - 22, 7, 3).fill(0xe3e6e9).stroke(OUTLINE);
    g.circle(base.x, base.y - 28, 4).fill(0xd8b07a).stroke(OUTLINE);
    g.rect(base.x + 6, base.y - 10, 6, 2).fill(0x555555);
    // Tiny tinto cups.
    for (let k = 0; k < 3; k++) {
      const c = iso(x + 1.05 + k * 0.18, y + 2.05, 12);
      g.roundRect(c.x - 2.5, c.y - 4, 5, 4, 1).fill(0xffffff).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(c.x, c.y - 4, 2.5, 1).fill(PRODUCTS.tinto.color);
    }
    // Customer bench.
    box(g, x + 0.3, y + 2.6, 0.8, 0.22, 6, PAL.wood);
    this.roofTop = iso(hx + 0.95, hy + 0.65, H + 16);
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.5 + i / 3) % 1;
        steam.circle(base.x + Math.sin((f + i) * 5) * 2, base.y - 32 - f * 18, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Fonda: long porch house, checkered-cloth dining tables, smoking hearth.
  fonda(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const H = house(this, g, hx, hy, 2.4, 1.3, 26, ctx, { wall: 0xb8e0a8 });
    door(g, hx, hy, 1.3, 1.2, 16, ctx.trim);
    windowOnFront(this, g, hx, hy, 1.3, 0.5, 8, 0xffffff);
    windowOnFront(this, g, hx, hy, 1.3, 1.9, 8, 0xffffff);
    // Wood-stove chimney.
    box(g, hx + 2.0, hy + 0.2, 0.25, 0.25, H + 18, 0xb5653a);
    const top = iso(hx + 2.12, hy + 0.32, H + 18);
    this.smokePoints.push({ x: top.x, y: top.y - 4 });
    // Checkered-cloth tables set with breakfast.
    for (const [mx, my] of [[0.6, 2.35], [1.6, 2.35], [2.5, 2.0]].slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + mx, y + my, 8);
      g.rect(p.x - 1, p.y, 2, 8).fill(PAL.woodDark);
      g.ellipse(p.x, p.y, 10, 5).fill(0xffffff).stroke(OUTLINE);
      for (let k = 0; k < 4; k++) g.rect(p.x - 7 + k * 3.5, p.y - 2 + (k % 2) * 1.5, 2.5, 1.5).fill(PAL.balconyRed);
      g.ellipse(p.x - 3, p.y - 1, 3, 1.5).fill(PRODUCTS.cheese_arepa.color);
      g.circle(p.x + 3, p.y - 2, 1.8).fill(PRODUCTS.tinto.color);
    }
    this.roofTop = iso(hx + 1.2, hy + 0.65, H + 16);
  },

  // Basket workshop: open shed with fique bundles, stacked baskets, and weaver.
  basket_shop(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    // Posts and tiled shed roof.
    for (const [px, py] of [[0, 0], [2.1, 0], [0, 1.4], [2.1, 1.4]]) box(g, x0 + px, y0 + py, 0.12, 0.12, 24 + ctx.up, PAL.wood);
    // Hanging fique strands drying.
    for (let k = 0; k < 5; k++) {
      const p = iso(x0 + 0.3 + k * 0.4, y0 + 0.1, 22 + ctx.up);
      g.moveTo(p.x, p.y).lineTo(p.x - 2, p.y + 14).lineTo(p.x + 2, p.y + 14).closePath().fill(0xe8d9a8).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    gableRoof(g, x0, y0, 2.22, 1.52, 24 + ctx.up, 12, PAL.roof, PAL.wood);
    // Stacked baskets (more at milestones).
    const spots = [[0.5, 0.9, 0], [0.95, 0.9, 0], [1.4, 0.9, 0], [0.72, 0.9, 9], [1.17, 0.9, 9], [0.95, 0.9, 18]];
    for (const [bx, by, z] of spots.slice(0, 3 + Math.min(ctx.tier, 3))) basketShape(g, x0 + bx, y0 + by, z);
    // Tejedora sentada.
    const p = iso(x0 + 1.9, y0 + 0.9);
    g.ellipse(p.x, p.y, 5, 2.5).fill({ color: 0x000000, alpha: 0.2 });
    g.roundRect(p.x - 3, p.y - 10, 6, 8, 2).fill(PAL.balconyBlue);
    g.circle(p.x, p.y - 12.5, 2.8).fill(0xc68e5e);
    g.ellipse(p.x, p.y - 14.5, 3, 1.4).fill(0x2b1a10);
    const weave = new Graphics();
    this.anim.addChild(weave);
    this.roofTop = iso(x0 + 1.1, y0 + 0.75, 36 + ctx.up);
    this.animate = (time) => {
      weave.clear();
      const a = Math.sin(time * 6) * 3;
      basketShape(weave, x0 + 1.75, y0 + 1.25, 4, 0.7);
      weave.moveTo(p.x - 2, p.y - 7).lineTo(p.x - 6 + a, p.y - 3).stroke({ width: 1.5, color: 0xc68e5e });
    };
    this.animate(0);
  },

  // Gift wrapping shop: storefront with window, ribboned colored boxes, and gift hampers.
  gift_wrap(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 2.1, 1.4, 27, ctx, { wall: 0xf4efe6 });
    // Storefront display window.
    g.poly(isoPoly([[hx + 0.2, hy + 1.4, 6], [hx + 1.2, hy + 1.4, 6], [hx + 1.2, hy + 1.4, 18], [hx + 0.2, hy + 1.4, 18]])).fill(0xbfe3f5).stroke(OUTLINE);
    door(g, hx, hy, 1.4, 1.65, 16, ctx.trim);
    const v = iso(hx + 0.7, hy + 1.4, 12);
    this.lights.push({ x: v.x, y: v.y, r: 26 });
    // Striped awning.
    for (let i = 0; i < 6; i++) {
      const a = hx + 0.1 + i * 0.32;
      g.poly(isoPoly([[a, hy + 1.4, 22], [a + 0.32, hy + 1.4, 22], [a + 0.32, hy + 1.72, 17], [a, hy + 1.72, 17]])).fill(i % 2 ? 0xffffff : 0x8e44ad).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
    }
    // Ribboned gift boxes.
    const boxes = [[0.4, 2.4, PAL.balconyRed], [0.85, 2.5, PAL.balconyBlue], [1.3, 2.45, PAL.balconyYellow], [0.62, 2.45, PAL.balconyGreen], [2.6, 1.0, 0x8e44ad]];
    boxes.slice(0, 3 + Math.min(ctx.tier, 2)).forEach(([bx, by, color], k) => {
      const z = k === 3 ? 9 : 0;
      box(g, x + bx - 0.15, y + by - 0.15, 0.3, 0.3, 9, color, { z });
      const top = iso(x + bx, y + by, z + 9);
      g.moveTo(top.x - 9, top.y).lineTo(top.x + 9, top.y).stroke({ width: 1.5, color: 0xffffff });
      g.circle(top.x - 2, top.y - 2, 2).fill(0xffffff);
      g.circle(top.x + 2, top.y - 2, 2).fill(0xffffff);
    });
    basketShape(g, x + 2.4, y + 2.4, 0, 1, PRODUCTS.gift_basket.color);
    this.roofTop = iso(hx + 1.05, hy + 0.7, H + 16);
  },

  // Export dispatch (v4.1.2; formerly port crane container yard though Salento is landlocked):
  // warehouse, queued containers, and container tractomula bound for Buenaventura.
  // Forklift shuttles crates between warehouse door and trailer.
  export_dock(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill({ color: 0x8f8f8f, alpha: 0.5 });
    const hx = x + 0.2;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.5, 1.25, 26, ctx, { wall: 0xe9e1cf, roofH: 12 });
    door(g, hx, hy, 1.25, 0.75, 18, 0x7a5230);
    windowOnRight(this, g, hx, hy, 1.5, 0.6, 12, 0xffffff);
    const roof = this.roofTop;
    // Queued containers: more at milestones.
    const colors = [0x2e6fd1, PAL.balconyRed, PAL.balconyGreen, 0xe67e22];
    const levels = 1 + Math.min(ctx.tier, 2);
    for (let k = 0; k < levels; k++) container(g, x + 1.85, y + 0.3, k * 11, colors[k % colors.length]);
    for (let k = 0; k < Math.max(1, levels - 1); k++) container(g, x + 1.85, y + 1.0, k * 11, colors[(k + 2) % colors.length]);
    // Tractomula: red cab to side (clear of warehouse signboard) with container trailer.
    // contenedor.
    const ty = y + 2.2;
    box(g, x + 0.2, ty, 0.55, 0.6, 15, 0xc0392b, { z: 3 });
    box(g, x + 0.2, ty + 0.05, 0.25, 0.5, 6, 0xc0392b, { z: 18 });
    g.poly(isoPoly([[x + 0.2, ty + 0.6, 10], [x + 0.75, ty + 0.6, 10], [x + 0.75, ty + 0.6, 16], [x + 0.2, ty + 0.6, 16]])).fill(0x9fd3ec).stroke(OUTLINE);
    box(g, x + 0.8, ty + 0.05, 1.55, 0.5, 5, 0x3d3d3d, { z: 3 });
    container(g, x + 1.05, ty, 8, 0xd35400);
    for (const wx of [0.45, 1.2, 2.1]) {
      const w = iso(x + wx, ty + 0.6, 3);
      g.ellipse(w.x, w.y, 4.2, 3.2).fill(0x222222).stroke(OUTLINE);
      g.ellipse(w.x, w.y, 1.6, 1.2).fill(0xbbbbbb);
    }
    // Forklift shuttling from warehouse doorway to trailer tail.
    const lift = new Graphics();
    this.anim.addChild(lift);
    this.roofTop = roof;
    this.lights.push({ x: roof.x, y: roof.y + 8, r: 30 });
    this.animate = (time) => {
      lift.clear();
      const k = Math.sin(time * 0.9) * 0.5 + 0.5;
      const fx = x + 0.35 + k * 1.0;
      const fy = y + 1.62;
      const up = 4 + (1 - Math.abs(k - 0.5) * 2) * 6;
      box(lift, fx, fy, 0.38, 0.28, 7, 0xe8b90f);
      box(lift, fx + 0.08, fy + 0.04, 0.16, 0.2, 5, 0x333333, { z: 7 });
      const m = iso(fx + 0.4, fy + 0.14, 0);
      lift.moveTo(m.x, m.y).lineTo(m.x, m.y - 18).stroke({ width: 1.6, color: 0x555555 });
      box(lift, fx + 0.42, fy + 0.02, 0.24, 0.24, 6, 0xb07a3a, { z: up });
    };
    this.animate(0);
  },

  // Empacadora: yellow warehouse with conveyor belt and coffee bags.
  packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf2d16b, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0xffffff);
    // Banda transportadora.
    box(g, x + 0.4, y + 2.15, 1.6, 0.35, 8, 0x555555);
    // Stacked bags (taller at milestones).
    const stack = [[2.35, 2.2, 0], [2.65, 2.2, 0], [2.5, 2.5, 0], [2.5, 2.3, 10], [2.35, 2.2, 10], [2.5, 2.3, 20]];
    for (const [bx, by, z] of stack.slice(0, 4 + Math.min(ctx.tier, 2))) {
      const p = iso(x + bx, y + by, z);
      g.roundRect(p.x - 6, p.y - 14, 12, 14, 2).fill(PRODUCTS.coffee_bag.color).stroke(OUTLINE);
      g.rect(p.x - 4, p.y - 10, 8, 3).fill(0xfff3d6);
    }
    const bags = new Graphics();
    this.anim.addChild(bags);
    this.animate = (time) => {
      bags.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.3 + i / 3) % 1;
        const p = iso(x + 0.45 + f * 1.5, y + 2.32, 8);
        bags.roundRect(p.x - 4, p.y - 9, 8, 9, 2).fill(PRODUCTS.coffee_bag.color).stroke(OUTLINE);
      }
    };
  },

  // --- Santander · La Guayabera (v3.0) ---

  // Guava pulper: cottage with yard pulper machine, guavas in hopper, pink pulp tub.
  guava_pulper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.5, 28, ctx, { wall: 0xf6e7c8 });
    door(g, hx, hy, 1.5, 0.9, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.75, 14, PAL.balconyYellow);
    // Hopper filled with guavas.
    const t = iso(x + 2.5, y + 0.8, 28);
    box(g, x + 2.35, y + 0.65, 0.3, 0.3, 18, 0x6c757d);
    g.poly([t.x - 14, t.y - 6, t.x + 14, t.y - 6, t.x + 5, t.y + 12, t.x - 5, t.y + 12]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 14, 5).fill(PRODUCTS.guava.color).stroke(OUTLINE);
    for (const [dx, dy] of [[-6, -7], [0, -9], [6, -7], [-2, -5]]) g.circle(t.x + dx, t.y + dy, 2.6).fill(0xd4e157).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    // Pink pulp tubs.
    for (const tx of [0.5, 1.4]) {
      box(g, x + tx, y + 2.1, 0.7, 0.55, 9, 0xc7beb0);
      g.poly(isoPoly([[x + tx + 0.06, y + 2.16, 9], [x + tx + 0.64, y + 2.16, 9], [x + tx + 0.64, y + 2.59, 9], [x + tx + 0.06, y + 2.59, 9]])).fill(PRODUCTS.guava_pulp.color);
    }
    const drip = new Graphics();
    this.anim.addChild(drip);
    this.animate = (time) => {
      drip.clear();
      const f = (time * 0.8) % 1;
      const p = iso(x + 2.5, y + 0.8, 10 - f * 10);
      drip.circle(p.x, p.y, 2).fill({ color: PRODUCTS.guava_pulp.color, alpha: 1 - f * 0.5 });
    };
  },

  // Bocadillo kettle: shed with hearth and copper kettle continuously stirred.
  guava_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    box(g, x0 + 0.5, y0 + 0.5, 1.3, 1.1, 10, 0xb5653a);
    const c = iso(x0 + 1.15, y0 + 1.05, 10);
    g.ellipse(c.x, c.y, 26, 13).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(c.x, c.y, 21, 10).fill(PRODUCTS.guava_jelly.color);
    const mouth = iso(x0 + 0.8, y0 + 1.6, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.3 + i * 0.12, y + 2.65, i * 2);
      g.roundRect(p.x - 10, p.y - 4, 20, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    // Baskets of ripe guavas beside hearth.
    for (const [bx, by] of [[2.3, 2.4], [2.65, 2.55]]) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 8, p.y - 10, p.x + 8, p.y - 10, p.x + 6, p.y, p.x - 6, p.y]).fill(0xc8a26b).stroke(OUTLINE);
      for (const dx of [-4, 0, 4]) g.circle(p.x + dx, p.y - 11, 2.6).fill(PRODUCTS.guava.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      const a = time * 2.5;
      const ex = c.x + Math.cos(a) * 12;
      const ey = c.y + Math.sin(a) * 5;
      stir.moveTo(ex, ey).lineTo(ex + 8, ey - 26).stroke({ width: 3, color: PAL.wood });
      for (let i = 0; i < 2; i++) {
        const f = (time * 1.2 + i * 0.5) % 1;
        stir.circle(c.x - 8 + i * 14, c.y - f * 3, 2 * (1 - f)).fill({ color: 0xf06292, alpha: 1 - f });
      }
      stir.ellipse(mouth.x, mouth.y + 1, 4, 2.5).fill({ color: 0xff7a1a, alpha: 0.6 + Math.sin(time * 9) * 0.3 });
    };
    this.animate(0);
  },

  // Wooden molds: long tables of trays filled with setting bocadillo under roof.
  guava_molds(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.2;
    const H = 26 + ctx.up;
    const tables = ctx.tier >= 2 ? [0.25, 0.95, 1.6] : [0.4, 1.3];
    for (const ty of tables) {
      box(g, x0 + 0.2, y0 + ty, w - 0.4, 0.5, 9, PAL.wood);
      for (let i = 0; i < 3; i++) {
        box(g, x0 + 0.3 + i * 0.66, y0 + ty + 0.08, 0.56, 0.34, 3, PAL.woodDark, { z: 9 });
        g.poly(isoPoly([[x0 + 0.34 + i * 0.66, y0 + ty + 0.12, 12], [x0 + 0.82 + i * 0.66, y0 + ty + 0.12, 12], [x0 + 0.82 + i * 0.66, y0 + ty + 0.38, 12], [x0 + 0.34 + i * 0.66, y0 + ty + 0.38, 12]])).fill(PRODUCTS.bocadillo_block.color);
      }
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 14, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 14);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 30 });
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        const p = iso(x0 + 0.6 + i * 0.66, y0 + tables[0] + 0.25, 14 + f * 18);
        steam.circle(p.x, p.y, 3 + f * 4).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
  },

  // Cutter: house with yard table slicing blocks into bars.
  bocadillo_cutter(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Yard cutting table with slab and sliced bars.
    box(g, x + 0.4, y + 2.1, 1.9, 0.5, 9, PAL.wood);
    box(g, x + 0.5, y + 2.18, 0.7, 0.34, 5, PRODUCTS.bocadillo_block.color, { z: 9 });
    for (let i = 0; i < 5; i++) box(g, x + 1.35 + i * 0.17, y + 2.2, 0.11, 0.3, 4, PRODUCTS.bocadillo.color, { z: 9 });
    const knife = new Graphics();
    this.anim.addChild(knife);
    this.animate = (time) => {
      knife.clear();
      const k = Math.abs(Math.sin(time * 3));
      const p = iso(x + 1.25, y + 2.35, 14 + k * 10);
      knife.rect(p.x - 1, p.y - 14, 2, 14).fill(0xd0d4d8).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
      knife.rect(p.x - 2, p.y - 20, 4, 6).fill(PAL.woodDark);
    };
    this.animate(0);
  },

  // Bijao wrapping: house with wrapping table and drying bijao leaf bundles.
  bijao_wrapper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.6, 28, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.6, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.8, 14, PAL.balconyYellow);
    // Drying line of hung bijao leaves.
    const a = iso(x + 2.45, y + 0.4, 24);
    const b = iso(x + 2.45, y + 1.9, 24);
    g.rect(a.x - 1, a.y, 2, 24).fill(PAL.wood);
    g.rect(b.x - 1, b.y, 2, 24).fill(PAL.wood);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
    for (let i = 1; i < 6; i++) {
      const px = a.x + ((b.x - a.x) * i) / 6;
      const py = a.y + ((b.y - a.y) * i) / 6;
      g.ellipse(px, py + 8, 3, 8).fill(i % 2 ? 0x8d9f3c : 0xa5b84a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    }
    // Table with wrapped bocadillos.
    box(g, x + 0.4, y + 2.15, 1.7, 0.45, 9, PAL.wood);
    for (let i = 0; i < 6; i++) {
      const p = iso(x + 0.55 + i * 0.26, y + 2.37, 9);
      g.ellipse(p.x, p.y - 2, 4.5, 3).fill(PRODUCTS.bocadillo_bijao.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 0.7, p.y - 5, 1.4, 6).fill(0xe0c48a);
    }
  },

  // Crate warehouse: storage shed of wooden bocadillo boxes stacked for dispatch.
  crate_packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0xffffff);
    box(g, x + 0.4, y + 2.15, 1.6, 0.35, 8, 0x555555);
    const stack = [[2.3, 2.15, 0], [2.65, 2.15, 0], [2.48, 2.5, 0], [2.48, 2.3, 9], [2.3, 2.15, 9], [2.48, 2.3, 18]];
    for (const [bx, by, z] of stack.slice(0, 4 + Math.min(ctx.tier, 2))) box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 9, PRODUCTS.bocadillo_crate.color, { z });
    const crates = new Graphics();
    this.anim.addChild(crates);
    this.animate = (time) => {
      crates.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.3 + i / 3) % 1;
        const p = iso(x + 0.45 + f * 1.5, y + 2.32, 8);
        crates.rect(p.x - 5, p.y - 7, 10, 7).fill(PRODUCTS.bocadillo_crate.color).stroke(OUTLINE);
        crates.rect(p.x - 5, p.y - 4, 10, 1.2).fill(0xb07d48);
      }
    };
  },

  // --- Coast · El Arrozal (v3.15) ---

  // Rice dryer: concrete patio with sun-spread rice, worker turning with rake, and
  // gas grain dryer (cylinder with chimney) under zinc roof.
  rice_dryer(g, x, y, ctx) {
    const px = x + 0.25;
    const py = y + 0.9;
    // Concrete slab covered in golden paddy rice.
    g.poly(isoPoly([[px, py], [px + 2.5, py], [px + 2.5, py + 1.85], [px, py + 1.85]])).fill(0xc9c4b8).stroke(OUTLINE);
    g.poly(isoPoly([[px + 0.15, py + 0.15], [px + 2.35, py + 0.15], [px + 2.35, py + 1.7], [px + 0.15, py + 1.7]])).fill(PRODUCTS.dry_paddy.color);
    for (let k = 0; k < 7; k++) {
      const a = iso(px + 0.2, py + 0.25 + k * 0.21);
      const b = iso(px + 2.3, py + 0.25 + k * 0.21);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(PRODUCTS.dry_paddy.color, 0.8) });
    }
    // Gas dryer: cylinder on legs with chimney under small zinc roof.
    const sx = x + 0.3;
    const sy = y + 0.15;
    box(g, sx, sy, 1.2, 0.6, 18, 0x9aa3a8);
    for (let k = 0; k < 4; k++) box(g, sx + 0.1 + k * 0.28, sy + 0.05, 0.06, 0.5, 2, 0x6c757d, { z: 18 });
    box(g, sx + 1.0, sy + 0.1, 0.16, 0.16, 34 + ctx.up, 0x555555);
    for (const [ax, ay] of [[0, 0], [1.6, 0]]) box(g, x + 0.15 + ax, y + 0.05 + ay, 0.08, 0.08, 26 + ctx.up, PAL.wood);
    g.poly(isoPoly([[x + 0.05, y - 0.05, 30 + ctx.up], [x + 1.85, y - 0.05, 30 + ctx.up], [x + 1.85, y + 0.85, 24 + ctx.up], [x + 0.05, y + 0.85, 24 + ctx.up]])).fill(0xb0b8bf).stroke(OUTLINE);
    this.roofTop = iso(x + 0.95, y + 0.4, 30 + ctx.up);
    this.smokePoints = [iso(sx + 1.08, sy + 0.18, 34 + ctx.up)];
    const rake = new Graphics();
    this.anim.addChild(rake);
    this.animate = (time) => {
      rake.clear();
      const f = (Math.sin(time * 1.2) + 1) / 2;
      const p = iso(px + 0.6 + f * 1.4, py + 1.1);
      // Worker turning rice with wooden rake.
      rake.rect(p.x - 2.2, p.y - 9, 1.8, 9).fill(0x3d3d5c);
      rake.rect(p.x + 0.4, p.y - 9, 1.8, 9).fill(0x3d3d5c);
      rake.roundRect(p.x - 3.2, p.y - 18, 6.4, 9.5, 2).fill(0xf4efe6).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
      rake.circle(p.x, p.y - 20.5, 2.8).fill(0x8d5524);
      rake.ellipse(p.x, p.y - 22.5, 5.5, 1.5).fill(0xe9d8a6);
      const swing = Math.sin(time * 5) * 4;
      rake.moveTo(p.x + 3, p.y - 14).lineTo(p.x + 12 + swing, p.y + 2).stroke({ width: 1.6, color: PAL.wood });
      rake.moveTo(p.x + 8 + swing, p.y + 2).lineTo(p.x + 16 + swing, p.y + 2).stroke({ width: 2, color: PAL.woodDark });
    };
    this.animate(0);
  },

  // Rice huller: zinc-roofed mill with top hopper and chaff blowing out pipe onto heap.
  // pipe onto heap.
  rice_huller(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 30, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.6, 0.6, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 15, PAL.balconyBlue);
    // Hopper filled with paddy rice.
    const t = iso(x + 2.55, y + 0.6, 30 + ctx.up);
    box(g, x + 2.4, y + 0.45, 0.3, 0.3, 22 + ctx.up, 0x6c757d);
    g.poly([t.x - 13, t.y - 6, t.x + 13, t.y - 6, t.x + 4, t.y + 10, t.x - 4, t.y + 10]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 13, 4.5).fill(PRODUCTS.paddy.color).stroke(OUTLINE);
    // Chaff mound.
    const h = iso(x + 2.45, y + 2.4);
    g.ellipse(h.x, h.y, 22, 9).fill(0xc9a45a).stroke(OUTLINE);
    g.ellipse(h.x - 4, h.y - 5, 14, 6).fill(0xd8b46a);
    const pipeA = iso(x + 2.3, y + 1.5, 20);
    const pipeB = iso(x + 2.45, y + 2.3, 10);
    g.moveTo(pipeA.x, pipeA.y).lineTo(pipeB.x, pipeB.y).stroke({ width: 5, color: 0x8a939a });
    const husk = new Graphics();
    this.anim.addChild(husk);
    this.animate = (time) => {
      husk.clear();
      for (let i = 0; i < 6; i++) {
        const f = (time * 0.9 + i / 6) % 1;
        husk.circle(pipeB.x + Math.sin(i * 2 + time) * 6 * f, pipeB.y - 2 + f * 8 - Math.sin(f * Math.PI) * 8, 1.4).fill({ color: 0xd8b46a, alpha: 1 - f * 0.6 });
      }
    };
  },

  // Rice polisher: house with yard polishing machine puffing white bran dust.
  rice_polisher(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyYellow);
    // Polisher: upright body with motor.
    box(g, x + 2.35, y + 0.6, 0.45, 0.45, 26, 0xd0d4d8);
    box(g, x + 2.35, y + 1.15, 0.4, 0.3, 8, 0x2e6fd1);
    // Sacks of white rice.
    for (const [bx, by] of [[0.5, 2.3], [0.85, 2.45], [1.2, 2.3]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(PRODUCTS.white_rice.color).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9, 3.5, 1.6).fill(0xe9e4d8);
    }
    const dust = new Graphics();
    this.anim.addChild(dust);
    this.animate = (time) => {
      dust.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.5 + i / 4) % 1;
        const p = iso(x + 2.58, y + 0.83, 26 + f * 22);
        dust.circle(p.x + Math.sin(time * 2 + i) * 5 * f, p.y, 3 + f * 6).fill({ color: 0xffffff, alpha: 0.55 * (1 - f) });
      }
    };
  },

  // Sorter: open shed with shaking tiered sieve trays pouring whole grains into sack
  // and broken grains separately.
  rice_sorter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 28 + ctx.up;
    // Sacks of graded rice.
    for (const [bx, by, c] of [[0.5, 1.75, PRODUCTS.premium_rice.color], [0.85, 1.85, PRODUCTS.premium_rice.color], [2.0, 1.85, 0xe9e4d8]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(c).stroke(OUTLINE);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 28 });
    const sieve = new Graphics();
    this.anim.addChild(sieve);
    this.animate = (time) => {
      sieve.clear();
      const shake = Math.sin(time * 14) * 0.04;
      // Sieve frame legs and three shaking trays.
      for (const lx of [0.5, 1.9]) box(sieve, x0 + lx, y0 + 0.8, 0.08, 0.08, 14, PAL.woodDark);
      for (let k = 0; k < 3; k++) {
        const z = 8 + k * 4;
        box(sieve, x0 + 0.4 + shake, y0 + 0.6 + k * 0.05, 1.7, 0.6, 2, k === 2 ? PRODUCTS.white_rice.color : PAL.wood, { z });
      }
      for (let i = 0; i < 5; i++) {
        const f = (time * 1.4 + i / 5) % 1;
        const p = iso(x0 + 0.55 + (i % 2) * 0.3, y0 + 1.5, 10 - f * 10);
        sieve.circle(p.x, p.y, 1.3).fill(0xffffff);
      }
    };
    this.animate(0);
  },

  // Rice packer: house with table filling and sealing one-pound bags.
  rice_bagger(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.6, 28, ctx, { wall: 0xfdf6e3, roofH: 14 });
    door(g, hx, hy, 1.6, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.8, 14, PAL.balconyRed);
    box(g, x + 0.4, y + 2.15, 1.9, 0.35, 8, 0x555555);
    const bags = new Graphics();
    this.anim.addChild(bags);
    this.animate = (time) => {
      bags.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.7, y + 2.32, 8);
        bags.roundRect(p.x - 3.5, p.y - 9, 7, 9, 1.5).fill(0xfbfaf6).stroke(OUTLINE);
        bags.rect(p.x - 3.5, p.y - 6, 7, 3).fill(PRODUCTS.rice_bag.color);
      }
    };
  },

  // Rice warehouse: large depot stacked with rice bales in yard (more stacks at milestones).
  rice_stacker(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.6, 20, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 15, 0xffffff);
    const stack = (bx, by, rows) => {
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < rows - r; k++) {
          const p = iso(x + bx + k * 0.3 + r * 0.15, y + by, r * 7);
          g.roundRect(p.x - 8, p.y - 7, 16, 8, 3).fill(0xf4f1e8).stroke(OUTLINE);
          g.rect(p.x - 6, p.y - 4.5, 12, 2.2).fill(PRODUCTS.rice_sack.color);
        }
      }
    };
    stack(0.35, 2.4, 3);
    if (ctx.tier >= 2) stack(1.5, 2.45, 2);
    const carrier = new Graphics();
    this.anim.addChild(carrier);
    this.animate = (time) => {
      carrier.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 1.4 + k * 1.1, y + 2.1);
      carrier.rect(p.x - 2.2, p.y - 9, 1.8, 9).fill(0x3d3d5c);
      carrier.rect(p.x + 0.4, p.y - 9, 1.8, 9).fill(0x3d3d5c);
      carrier.roundRect(p.x - 3.2, p.y - 18, 6.4, 9.5, 2).fill(0xd7263d);
      carrier.circle(p.x, p.y - 20.5, 2.8).fill(0x8d5524);
      if (!back) {
        carrier.roundRect(p.x - 8, p.y - 28, 16, 8, 3).fill(0xf4f1e8).stroke(OUTLINE);
        carrier.rect(p.x - 6, p.y - 25.5, 12, 2).fill(PRODUCTS.rice_sack.color);
      }
    };
  },

  // --- Coast · El Cocal (v3.16) ---

  // Coconut husker: palm shed with green coconut heap, empty husks aside, worker husking.
  // a machete.
  coconut_peeler(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    // Green coconut pile in front.
    const pile = iso(x0 + 2.0, y0 + 1.95);
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 4);
      g.circle(pile.x + ((i % 4) - 1.5) * 7 + row * 3, pile.y - row * 5, 4.5).fill(PRODUCTS.coconut.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Fibrous husks and basket of husked coconuts.
    const husks = iso(x0 + 2.6, y0 + 0.9);
    for (let i = 0; i < 6; i++) g.ellipse(husks.x + (i % 3) * 6 - 6, husks.y - Math.floor(i / 3) * 4, 5, 2.5).fill(i % 2 ? 0xb08a4a : 0x9ccc65).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.4 });
    const basket = iso(x0 + 1.55, y0 + 2.3);
    g.moveTo(basket.x - 9, basket.y - 8).lineTo(basket.x + 9, basket.y - 8).lineTo(basket.x + 7, basket.y).lineTo(basket.x - 7, basket.y).closePath().fill(0xc9a35a).stroke(OUTLINE);
    for (const dx of [-5, 0, 5]) g.circle(basket.x + dx, basket.y - 9, 3.4).fill(PRODUCTS.peeled_coconut.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 14, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 14);
    const man = new Graphics();
    this.anim.addChild(man);
    this.animate = (time) => {
      man.clear();
      const p = iso(x0 + 1.3, y0 + 0.9);
      man.rect(p.x - 2.2, p.y - 9, 1.8, 9).fill(0xf4efe6);
      man.rect(p.x + 0.4, p.y - 9, 1.8, 9).fill(0xf4efe6);
      man.roundRect(p.x - 3.2, p.y - 18, 6.4, 9.5, 2).fill(0x2e6fd1);
      man.circle(p.x, p.y - 20.5, 2.8).fill(0x6d4c32);
      man.ellipse(p.x, p.y - 22.5, 5.5, 1.5).fill(0xe9d8a6);
      // Coconut in hand and rising/falling machete.
      man.circle(p.x - 6, p.y - 13, 3.6).fill(PRODUCTS.coconut.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      const a = this.working ? -0.6 + Math.abs(Math.sin(time * 4)) * 1.6 : 0.6;
      const hx = p.x + 3;
      const hy = p.y - 15;
      man.moveTo(hx, hy).lineTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10).stroke({ width: 1.8, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Grater: colorful cottage with grating bench feeding grated coconut into bowl.
  coconut_grater(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0x9ad0ec, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyYellow);
    box(g, x + 0.4, y + 2.1, 1.7, 0.5, 9, PAL.wood);
    const bowl = iso(x + 1.6, y + 2.35, 9);
    g.ellipse(bowl.x, bowl.y - 2, 9, 4).fill(0x2fa36b).stroke(OUTLINE);
    g.ellipse(bowl.x, bowl.y - 3.5, 7, 2.5).fill(PRODUCTS.grated_coconut.color);
    // Cocos pelados esperando.
    for (const [bx, by] of [[2.45, 2.2], [2.7, 2.35], [2.55, 2.55]]) {
      const p = iso(x + bx, y + by);
      g.circle(p.x, p.y - 3.5, 3.6).fill(PRODUCTS.peeled_coconut.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
    const grate = new Graphics();
    this.anim.addChild(grate);
    this.animate = (time) => {
      grate.clear();
      const k = this.working ? Math.sin(time * 9) * 0.12 : 0;
      const r = iso(x + 0.8, y + 2.35, 9);
      grate.rect(r.x - 3, r.y - 12, 6, 12).fill(0xb0bec5).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      const c = iso(x + 0.8 + k, y + 2.3, 15);
      grate.circle(c.x, c.y, 3.6).fill(0xfbfaf6).stroke({ width: 0.6, color: 0x6d4c32 });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 1.5 + i / 3) % 1;
        grate.circle(r.x + (i - 1) * 2, r.y - 1 + f * 4, 0.9).fill(0xffffff);
      }
    };
    this.animate(0);
  },

  // Coconut press: cottage with porch screw press dripping milk through cloth into bucket.
  coconut_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf2a7a0, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyBlue);
    // Press: twin posts, crossbar, and screw.
    const px = x + 0.7;
    const py = y + 2.3;
    for (const dx of [0, 0.7]) box(g, px + dx, py, 0.1, 0.1, 22, PAL.woodDark);
    box(g, px - 0.05, py - 0.02, 0.85, 0.14, 3, PAL.wood, { z: 22 });
    box(g, px + 0.12, py - 0.05, 0.5, 0.2, 4, PAL.wood, { z: 4 });
    // Bottles of coconut milk.
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 1.9 + (i % 3) * 0.2, y + 2.25 + Math.floor(i / 3) * 0.25);
      g.roundRect(p.x - 2, p.y - 10, 4, 10, 1.5).fill(PRODUCTS.coconut_milk.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 2, p.y - 6.5, 4, 2.5).fill(0x7cb342);
    }
    const press = new Graphics();
    this.anim.addChild(press);
    this.animate = (time) => {
      press.clear();
      const down = this.working ? (Math.sin(time * 1.5) + 1) * 2.5 : 0;
      // Screw lowers to squeeze cloth bundle of grated coconut.
      const top = iso(px + 0.4, py + 0.05, 22);
      press.rect(top.x - 1.2, top.y - 6, 2.4, 10 + down).fill(0x6c757d);
      press.moveTo(top.x - 6, top.y - 6).lineTo(top.x + 6, top.y - 6).stroke({ width: 2, color: PAL.woodDark });
      const cloth = iso(px + 0.4, py + 0.05, 10);
      press.ellipse(cloth.x, cloth.y - (4 - down * 0.3), 8, 3.5 - down * 0.25).fill(0xf4efe6).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      const bucket = iso(px + 0.4, py + 0.05, 0);
      press.rect(bucket.x - 5, bucket.y - 6, 10, 6).fill(0x2e6fd1).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      press.ellipse(bucket.x, bucket.y - 6, 5, 1.6).fill(0xfbfaf6);
      if (!this.working) return;
      for (let i = 0; i < 2; i++) {
        const f = (time * 1.8 + i / 2) % 1;
        press.circle(cloth.x + (i ? 2 : -2), cloth.y + f * 8, 1.1).fill(0xffffff);
      }
    };
    this.animate(0);
  },

  // Cocada kettle: palm kiosk with copper kettle over hearth, stirring paddle, and
  // table of colorful cocadas (more trays at milestones).
  cocada_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf6d860, roofColor: 0xc9a35a, roofH: 16 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyGreen);
    // Brick hearth holding kettle.
    box(g, x + 0.4, y + 2.1, 0.8, 0.6, 8, 0xa0522d);
    const pan = iso(x + 0.8, y + 2.4, 8);
    g.ellipse(pan.x, pan.y - 2, 13, 5.5).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y - 3, 10.5, 4).fill(0xc68a4a);
    // Table with cocada trays.
    box(g, x + 1.6, y + 2.15, 1.1, 0.5, 9, PAL.wood);
    const colors = [0xfbfaf6, PRODUCTS.cocada.color, 0xe57373, 0xf6d860];
    for (let i = 0; i < 2 + Math.min(ctx.tier, 2); i++) {
      const p = iso(x + 1.75 + (i % 2) * 0.5, y + 2.25 + Math.floor(i / 2) * 0.25, 9);
      for (let k = 0; k < 3; k++) g.ellipse(p.x - 4 + k * 4, p.y - 1.5, 2.6, 1.6).fill(colors[i % colors.length]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    this.smokePoints = [iso(x + 0.8, y + 2.4, 14)];
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      const a = this.working ? time * 2.5 : 0;
      // Boiling coconut syrup and circling paddle.
      stir.ellipse(pan.x, pan.y - 3, 9, 3.5).fill(0xd9a066);
      if (this.working) for (let i = 0; i < 3; i++) stir.circle(pan.x + Math.sin(time * 3 + i * 2) * 6, pan.y - 3 + Math.cos(time * 2 + i) * 1.5, 1.2).fill({ color: 0xffffff, alpha: 0.6 });
      stir.moveTo(pan.x + Math.cos(a) * 6, pan.y - 3 + Math.sin(a) * 2).lineTo(pan.x + Math.cos(a) * 3 + 8, pan.y - 18).stroke({ width: 2, color: PAL.wood });
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        if (!this.working) break;
        stir.circle(pan.x - 3 + i * 3, pan.y - 6 - f * 14, 1.5 + f * 2).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // --- Coast · La Ciénaga (v3.17) ---

  // Fish cleaning: palm shed with scaling table; front tub of fresh bocachicos and
  // vulture waiting for scraps.
  fish_cleaner(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.5, 1.6, 0.5, 9, PAL.wood);
    for (let i = 0; i < 3; i++) {
      const p = iso(x0 + 0.7 + i * 0.45, y0 + 0.75, 9);
      fishOn(g, p.x, p.y - 1, 6, PRODUCTS.clean_fish.color);
    }
    // Tub of water and bocachicos.
    const tub = iso(x0 + 1.9, y0 + 2.0);
    g.ellipse(tub.x, tub.y - 3, 13, 6).fill(0x2e6fd1).stroke(OUTLINE);
    g.ellipse(tub.x, tub.y - 4.5, 11, 4.5).fill(0x6fa8dc);
    for (const [dx, dy] of [[-4, -5], [3, -4], [0, -6]]) fishOn(g, tub.x + dx, tub.y + dy, 5, PRODUCTS.fish.color);
    // Black vulture.
    const v = iso(x0 + 0.6, y0 + 2.2);
    g.ellipse(v.x, v.y - 6, 4.5, 6).fill(0x263238).stroke({ width: 0.6, color: 0x000000, alpha: 0.5 });
    g.circle(v.x - 2, v.y - 13, 2).fill(0x8d6e63);
    g.moveTo(v.x - 3.5, v.y - 13).lineTo(v.x - 6, v.y - 12).stroke({ width: 1, color: 0xd7ccc8 });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 14, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 14);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.2, y0 + 1.05);
      worker(work, p.x, p.y, 0xd7263d);
      const k = this.working ? Math.sin(time * 10) * 3 : 0;
      work.moveTo(p.x + 3, p.y - 14).lineTo(p.x + 9 + k, p.y - 12).stroke({ width: 1.6, color: 0xb0bec5 });
      if (!this.working) return;
      // Flying fish scales.
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.6 + i / 4) % 1;
        work.circle(p.x + 10 + i * 2, p.y - 13 - Math.sin(f * Math.PI) * 8, 0.9).fill({ color: 0xeceff1, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Salting yard: drying racks hung with salted fish in sun, salt bin, and rear shack.
  fish_salter(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.8, 1.0, 22, ctx, { wall: 0xb8e0a8, roofColor: 0xc9a35a, roofH: 12 });
    door(g, hx, hy, 1.0, 0.6, 15, ctx.trim);
    // Wooden salt bin.
    box(g, x + 2.25, y + 0.4, 0.6, 0.5, 7, PAL.wood);
    g.poly(isoPoly([[x + 2.3, y + 0.45, 7], [x + 2.8, y + 0.45, 7], [x + 2.8, y + 0.85, 7], [x + 2.3, y + 0.85, 7]])).fill(0xffffff);
    const lines = ctx.tier >= 2 ? [1.6, 2.2, 2.75] : [1.8, 2.55];
    this.lines = lines;
    for (const ly of lines) for (const lx of [0.35, 2.6]) box(g, x + lx, y + ly, 0.06, 0.06, 20, PAL.woodDark);
    const hang = new Graphics();
    this.anim.addChild(hang);
    this.animate = (time) => {
      hang.clear();
      for (const [r, ly] of lines.entries()) {
        const a = iso(x + 0.38, y + ly, 19);
        const b = iso(x + 2.63, y + ly, 19);
        hang.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x5d4037 });
        for (let k = 1; k < 7; k++) {
          const px = a.x + ((b.x - a.x) * k) / 7;
          const py = a.y + ((b.y - a.y) * k) / 7;
          const sway = Math.sin(time * 1.4 + k + r) * (this.working ? 1.2 : 0.4);
          hang.poly([px - 3 + sway, py + 3, px + 3 + sway, py + 3, px + 1.5 + sway, py + 12, px + sway, py + 14, px - 1.5 + sway, py + 12]).fill(PRODUCTS.salted_fish.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
          hang.moveTo(px, py).lineTo(px + sway, py + 3).stroke({ width: 0.6, color: 0x5d4037 });
        }
      }
    };
    this.animate(0);
  },

  // Filleter: cottage with porch filleting table slicing out fillets one by one.
  fish_filleter(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf4efe6, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyBlue);
    box(g, x + 0.4, y + 2.1, 1.7, 0.5, 9, 0xd0d4d8);
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 1.3 + i * 0.25, y + 2.35, 9);
      g.ellipse(p.x, p.y - 1, 4.5, 2).fill(PRODUCTS.fish_fillet.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    // Fish bones in bucket for broth.
    const bucket = iso(x + 2.6, y + 2.4);
    g.rect(bucket.x - 5, bucket.y - 8, 10, 8).fill(0xf6d860).stroke(OUTLINE);
    g.ellipse(bucket.x, bucket.y - 8, 5, 1.6).fill(0xe0e0e0);
    const cut = new Graphics();
    this.anim.addChild(cut);
    this.animate = (time) => {
      cut.clear();
      const p = iso(x + 0.75, y + 2.35, 9);
      fishOn(cut, p.x, p.y - 1, 6, PRODUCTS.clean_fish.color);
      const k = this.working ? (Math.sin(time * 4) + 1) / 2 : 0.5;
      cut.moveTo(p.x - 6 + k * 10, p.y - 7).lineTo(p.x - 2 + k * 10, p.y - 1).stroke({ width: 1.6, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Fish fry stall: palm kiosk with oil cauldron on hearth, frying fish, and plated
  // fried fish with patacones.
  fish_fryer(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.6;
    const H = 24 + ctx.up;
    // Hearth and frying cauldron.
    box(g, x0 + 0.3, y0 + 0.4, 0.7, 0.6, 7, 0xa0522d);
    const pot = iso(x0 + 0.65, y0 + 0.7, 7);
    g.ellipse(pot.x, pot.y - 3, 11, 5).fill(0x263238).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 4, 9, 3.6).fill(0xe0b84a);
    // Table set with plates.
    box(g, x0 + 1.2, y0 + 0.5, 0.8, 0.9, 8, 0xd7263d);
    for (const [px, py] of [[1.4, 0.75], [1.75, 0.75], [1.4, 1.15], [1.75, 1.15]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      const p = iso(x0 + px, y0 + py, 8);
      g.ellipse(p.x, p.y, 5, 2.4).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x - 1, p.y - 0.8, 3, 1.4).fill(PRODUCTS.fried_fish.color);
      g.circle(p.x + 3, p.y, 1.2).fill(0xf2c14e);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 28 });
    const fry = new Graphics();
    this.anim.addChild(fry);
    this.animate = (time) => {
      fry.clear();
      fishOn(fry, pot.x - 2, pot.y - 4, 5, PRODUCTS.fried_fish.color);
      if (!this.working) return;
      for (let i = 0; i < 4; i++) fry.circle(pot.x + Math.sin(time * 5 + i * 1.7) * 7, pot.y - 4 + Math.cos(time * 4 + i) * 1.5, 1).fill({ color: 0xfff3c4, alpha: 0.9 });
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.5 + i / 3) % 1;
        fry.circle(pot.x - 3 + i * 3, pot.y - 8 - f * 16, 1.6 + f * 3).fill({ color: 0xffffff, alpha: 0.4 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Coconut-fish kitchen: large house with wood stove and steaming clay casseroles;
  // bottles of coconut milk from Cocal stacked by door.
  coconut_fish_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf2a7a0, roofColor: 0xc9a35a, roofH: 16 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyGreen);
    box(g, x + 0.4, y + 2.1, 1.3, 0.55, 8, 0xa0522d);
    const pots = [[0.7, 2.37], [1.3, 2.37]];
    for (const [px, py] of pots) {
      const p = iso(x + px, y + py, 8);
      g.ellipse(p.x, p.y - 2, 8.5, 4).fill(0xb5562e).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 3, 6.5, 2.6).fill(0xf5ecd7);
      g.ellipse(p.x - 1, p.y - 3.3, 3, 1).fill(0xd4a35a);
    }
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 2.1 + (i % 3) * 0.2, y + 2.25 + Math.floor(i / 3) * 0.25);
      g.roundRect(p.x - 2, p.y - 10, 4, 10, 1.5).fill(PRODUCTS.coconut_milk.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 2, p.y - 6.5, 4, 2.5).fill(0x7cb342);
    }
    // Empty coconut half-shells.
    const shell = iso(x + 2.7, y + 2.6);
    g.ellipse(shell.x, shell.y - 2, 4.5, 2.6).fill(0x6d4c32).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.ellipse(shell.x, shell.y - 3, 3.6, 1.4).fill(0xfbfaf6);
    this.smokePoints = [iso(x + 1.0, y + 2.37, 12)];
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      if (!this.working) return;
      for (const [k, [px, py]] of pots.entries()) {
        for (let i = 0; i < 2; i++) {
          const f = (time * 0.45 + i / 2 + k * 0.3) % 1;
          const p = iso(x + px, y + py, 12 + f * 16);
          steam.circle(p.x + Math.sin(f * 6 + k) * 3, p.y, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
        }
      }
    };
    this.animate(0);
  },

  // --- Coast · La Quesera (v3.18) ---

  // Curdling house: white house with wooden curd trough; cheesemaker stirs while
  // fresh milk cans wait beside it.
  curdler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xfbf8f1, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyBlue);
    for (const [cx, cy] of [[2.4, 2.1], [2.7, 2.25], [2.45, 2.5]]) {
      const p = iso(x + cx, y + cy);
      g.roundRect(p.x - 4, p.y - 13, 8, 13, 2).fill(0xc7ccd1).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 13, 3, 1.4).fill(0x9aa3a8);
    }
    // Wooden trough.
    box(g, x + 0.45, y + 2.05, 1.4, 0.55, 7, PAL.wood);
    const tub = iso(x + 1.15, y + 2.32, 7);
    g.ellipse(tub.x, tub.y - 0.5, 15, 4.5).fill(0xfbfaf6);
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      // Forming curd clumps and stirring paddle.
      for (let i = 0; i < 5; i++) stir.circle(tub.x - 10 + i * 5, tub.y - 0.5 + Math.sin(i * 2) * 1.5, 1.8).fill(0xece6d6);
      const a = this.working ? time * 2 : 0;
      stir.moveTo(tub.x + Math.cos(a) * 8, tub.y + Math.sin(a) * 2).lineTo(tub.x + 6 + Math.cos(a) * 4, tub.y - 16).stroke({ width: 2, color: PAL.wood });
    };
    this.animate(0);
  },

  // Curd grinder: shed with table-bolted crank mill pouring ground curds into trough
  // beside waiting salt sacks.
  curd_mill(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.5, y0 + 0.4, 1.4, 0.6, 9, PAL.wood);
    const tray = iso(x0 + 1.4, y0 + 0.7, 9);
    g.ellipse(tray.x, tray.y - 1, 8, 3).fill(PRODUCTS.salted_curd.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    // Salt sacks in front.
    for (const [bx, by] of [[1.9, 1.95], [2.25, 2.1], [2.05, 2.35]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(0xf4f1e8).stroke(OUTLINE);
      g.rect(p.x - 4, p.y - 6, 8, 2).fill(0x2e6fd1);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const mill = new Graphics();
    this.anim.addChild(mill);
    this.animate = (time) => {
      mill.clear();
      const m = iso(x0 + 0.85, y0 + 0.7, 9);
      mill.rect(m.x - 4, m.y - 12, 8, 10).fill(0x9aa3a8).stroke(OUTLINE);
      mill.poly([m.x - 6, m.y - 16, m.x + 6, m.y - 16, m.x + 3, m.y - 12, m.x - 3, m.y - 12]).fill(0xb0bec5).stroke(OUTLINE);
      mill.ellipse(m.x, m.y - 16, 6, 1.8).fill(PRODUCTS.cuajada.color);
      const a = this.working ? time * 4 : 0.6;
      const hx = m.x + 4;
      const hy = m.y - 8;
      mill.moveTo(hx, hy).lineTo(hx + Math.cos(a) * 7, hy + Math.sin(a) * 4).stroke({ width: 1.6, color: 0x555555 });
      mill.circle(hx + Math.cos(a) * 7, hy + Math.sin(a) * 4, 1.4).fill(PAL.woodDark);
      const p = iso(x0 + 1.2, y0 + 1.15);
      worker(mill, p.x, p.y, 0x2fa36b);
    };
    this.animate(0);
  },

  // Lever cheese press: house with yard beam press—stacked wooden molds, weighted
  // lever beam hung with stones, draining whey.
  cheese_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.9, 1.3, 26, ctx, { wall: 0xf6d860, roofColor: 0xc9a35a, roofH: 13 });
    door(g, hx, hy, 1.3, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyRed);
    // Molds stacked under beam.
    const mx = x + 0.7;
    const my = y + 2.15;
    box(g, mx - 0.1, my - 0.05, 0.75, 0.55, 3, 0x8d6e4a);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) box(g, mx, my, 0.55, 0.42, 5, k % 2 ? 0xa1785a : 0x8d5a32, { z: 3 + k * 5 });
    const top = 3 + (2 + Math.min(ctx.tier, 2)) * 5;
    // Fulcrum post and weighted beam with stones.
    box(g, mx - 0.35, my + 0.15, 0.1, 0.1, top + 10, PAL.woodDark);
    const a = iso(mx - 0.3, my + 0.2, top + 6);
    const b = iso(mx + 1.6, my + 0.2, top - 2);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: PAL.wood });
    g.moveTo(b.x, b.y).lineTo(b.x, b.y + 8).stroke({ width: 1, color: 0x5d4037 });
    g.ellipse(b.x, b.y + 11, 6, 4.5).fill(0x9e9e9e).stroke(OUTLINE);
    g.ellipse(b.x + 2, b.y + 16, 5, 4).fill(0x8a8a8a).stroke(OUTLINE);
    // Pressed cheese wheels resting on plank.
    for (let i = 0; i < 3; i++) box(g, x + 2.3 + (i % 2) * 0.28, y + 1.85 + Math.floor(i / 2) * 0.35, 0.22, 0.22, 4, PRODUCTS.queso_costeno.color);
    const whey = new Graphics();
    this.anim.addChild(whey);
    this.animate = (time) => {
      whey.clear();
      const p = iso(mx + 0.28, my + 0.5, 2);
      whey.ellipse(p.x, p.y + 2, 6, 2).fill({ color: 0xe8f0d0, alpha: 0.8 });
      if (!this.working) return;
      for (let i = 0; i < 2; i++) {
        const f = (time * 1.4 + i / 2) % 1;
        whey.circle(p.x - 2 + i * 4, p.y - 4 + f * 6, 1).fill(0xe8f0d0);
      }
    };
    this.animate(0);
  },

  // Mote pot: palm kiosk with giant pot on three-stone hearth, yam heap, and smoke;
  // cook stirs the mote stew.
  mote_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.1;
    const H = 24 + ctx.up;
    // Three-stone hearth holding pot.
    const pot = iso(x0 + 0.9, y0 + 1.75);
    for (const [dx, dy] of [[-8, 1], [8, 1], [0, 4]]) g.ellipse(pot.x + dx, pot.y + dy, 4, 2.6).fill(0x8a8a8a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    g.moveTo(pot.x - 11, pot.y - 2).lineTo(pot.x - 12, pot.y - 16).quadraticCurveTo(pot.x, pot.y - 20, pot.x + 12, pot.y - 16).lineTo(pot.x + 11, pot.y - 2).quadraticCurveTo(pot.x, pot.y + 2, pot.x - 11, pot.y - 2).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 16, 12, 4).fill(PRODUCTS.mote_queso.color).stroke({ width: 0.8, color: 0x263238 });
    // Heap of yams.
    for (const [bx, by] of [[1.8, 1.55], [2.05, 1.7], [1.9, 1.85]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 3, 7, 3.4).fill(0x8d6e4a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const cook = new Graphics();
    this.anim.addChild(cook);
    this.animate = (time) => {
      cook.clear();
      // Fire.
      if (this.working) for (let i = 0; i < 3; i++) cook.poly([pot.x - 6 + i * 6, pot.y + 1, pot.x - 3 + i * 6, pot.y - 5 - Math.abs(Math.sin(time * 9 + i)) * 4, pot.x + i * 6, pot.y + 1]).fill(i % 2 ? 0xffb300 : 0xf4511e);
      for (let i = 0; i < 4; i++) cook.rect(pot.x - 9 + i * 5, pot.y - 17 + Math.sin(i * 1.7) * 1.5, 2.6, 1.8).fill(0xfbfaf6);
      const a = this.working ? time * 2.2 : 0;
      cook.moveTo(pot.x + Math.cos(a) * 7, pot.y - 16 + Math.sin(a) * 2).lineTo(pot.x + 14, pot.y - 32).stroke({ width: 2, color: PAL.wood });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.5 + i / 3) % 1;
        cook.circle(pot.x - 4 + i * 4, pot.y - 20 - f * 18, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Coastal fonda: colorful house with signboard, red porch tables set with lunch plates,
  // and bustling waitress.
  costeno_fonda(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 28, ctx, { wall: 0x9ad0ec, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.4, 1.5, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 14, PAL.balconyYellow);
    const sign = iso(x + 1.4, y + 1.65, 30);
    g.roundRect(sign.x - 14, sign.y - 6, 28, 9, 2).fill(0xd7263d).stroke(OUTLINE);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 2); i++) {
      const p = iso(x + 0.7 + (i % 2) * 1.3, y + 2.2 + Math.floor(i / 2) * 0.45);
      g.rect(p.x - 1, p.y - 8, 2, 8).fill(0xb71c1c);
      g.ellipse(p.x, p.y - 8, 9, 4.2).fill(0xd7263d).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x - 2, p.y - 8.5, 3.6, 1.6).fill(0xffffff);
      g.circle(p.x + 3, p.y - 9, 1.8).fill(PRODUCTS.mote_queso.color).stroke({ width: 0.5, color: 0xd7263d });
    }
    const waiter = new Graphics();
    this.anim.addChild(waiter);
    this.animate = (time) => {
      waiter.clear();
      const f = (time * 0.2) % 1;
      const k = f < 0.5 ? f * 2 : 2 - f * 2;
      const p = iso(x + 0.5 + k * 1.9, y + 1.95);
      worker(waiter, p.x, p.y, 0xf07f1d);
      waiter.ellipse(p.x + 4, p.y - 17, 4, 1.5).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    };
    this.animate(0);
  },

  // Tray kitchen: long house with assembly counter and smoking grill.
  bandeja_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.5, 28, ctx, { wall: 0xb8e0a8, roofColor: 0xc9a35a, roofH: 15 });
    door(g, hx, hy, 1.5, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.75, 14, PAL.balconyRed);
    box(g, x + 0.4, y + 2.05, 1.7, 0.5, 9, PAL.wood);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 2); i++) {
      const p = iso(x + 0.65 + i * 0.4, y + 2.3, 9);
      g.poly([p.x - 6, p.y - 1, p.x, p.y - 4, p.x + 6, p.y - 1, p.x, p.y + 2]).fill(0xc68a4a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x - 1.5, p.y - 1.2, 2.6, 1.1).fill(0xd4892a);
      g.circle(p.x + 2.4, p.y - 1, 1.2).fill(0xffffff);
    }
    box(g, x + 2.3, y + 2.0, 0.5, 0.5, 8, 0x37474f);
    this.smokePoints = [iso(x + 2.55, y + 2.25, 10)];
    const grill = new Graphics();
    this.anim.addChild(grill);
    this.animate = (time) => {
      grill.clear();
      const p = iso(x + 2.55, y + 2.25, 8);
      fishOn(grill, p.x - 2, p.y - 1, 4, PRODUCTS.fried_fish.color);
      if (this.working) grill.ellipse(p.x + 3, p.y, 2, 1).fill({ color: 0xff7043, alpha: 0.5 + Math.sin(time * 8) * 0.3 });
    };
    this.animate(0);
  },

  // --- Coast · El Sombrero (v3.19) ---

  // Cane scraping: palm shed where each leaf is scraped clean; green leaf pile and
  // white caña flecha fiber draped over pole.
  fiber_scraper(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Green leaves, front right.
    const pile = iso(x0 + 2.0, y0 + 1.95);
    for (let i = 0; i < 8; i++) g.moveTo(pile.x - 12 + i * 2, pile.y - (i % 3)).lineTo(pile.x + 6 + i * 2, pile.y - 6 - (i % 3)).stroke({ width: 2, color: i % 2 ? 0x4e8f34 : 0x6fae44 });
    // Pole hung with bleached fiber.
    for (const lx of [0.3, 1.3]) box(g, x0 + lx, y0 + 2.0, 0.06, 0.06, 18, PAL.woodDark);
    const a = iso(x0 + 0.33, y0 + 2.03, 17);
    const b = iso(x0 + 1.33, y0 + 2.03, 17);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: PAL.wood });
    for (let k = 1; k < 8; k++) {
      const px = a.x + ((b.x - a.x) * k) / 8;
      const py = a.y + ((b.y - a.y) * k) / 8;
      g.moveTo(px, py).lineTo(px + 0.5, py + 12).stroke({ width: 1.2, color: 0xefe3c2 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.2, y0 + 1.0);
      worker(work, p.x, p.y, 0x8e44ad);
      // Leaf held in hand with scraping knife.
      work.moveTo(p.x - 10, p.y - 13).lineTo(p.x + 2, p.y - 15).stroke({ width: 2, color: 0x6fae44 });
      const k = this.working ? (Math.sin(time * 6) + 1) / 2 : 0.5;
      work.moveTo(p.x - 8 + k * 8, p.y - 18).lineTo(p.x - 7 + k * 8, p.y - 13).stroke({ width: 1.4, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Mud dyeing: boiling black dye pot on hearth and dyed fiber hanging on drying line.
  fiber_dyer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.8, 1.0, 22, ctx, { wall: 0xf4efe6, roofColor: 0xc9a35a, roofH: 12 });
    door(g, hx, hy, 1.0, 0.6, 15, ctx.trim);
    const pot = iso(x + 2.45, y + 0.75);
    for (const [dx, dy] of [[-7, 1], [7, 1], [0, 3.5]]) g.ellipse(pot.x + dx, pot.y + dy, 3.4, 2.2).fill(0x8a8a8a);
    g.moveTo(pot.x - 9, pot.y - 2).lineTo(pot.x - 10, pot.y - 13).quadraticCurveTo(pot.x, pot.y - 16, pot.x + 10, pot.y - 13).lineTo(pot.x + 9, pot.y - 2).quadraticCurveTo(pot.x, pot.y + 1, pot.x - 9, pot.y - 2).closePath().fill(0x263238).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 13, 10, 3.4).fill(0x3e2723);
    const lines = ctx.tier >= 2 ? [1.65, 2.2, 2.75] : [1.9, 2.6];
    for (const ly of lines) for (const lx of [0.35, 2.6]) box(g, x + lx, y + ly, 0.06, 0.06, 18, PAL.woodDark);
    this.smokePoints = [iso(x + 2.45, y + 0.75, 16)];
    const hang = new Graphics();
    this.anim.addChild(hang);
    this.animate = (time) => {
      hang.clear();
      if (this.working) for (let i = 0; i < 3; i++) hang.circle(pot.x - 5 + i * 5, pot.y - 13 + Math.sin(time * 6 + i) * 0.8, 1).fill(0x5d4037);
      for (const [r, ly] of lines.entries()) {
        const a = iso(x + 0.38, y + ly, 17);
        const b = iso(x + 2.63, y + ly, 17);
        hang.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x5d4037 });
        for (let k = 1; k < 10; k++) {
          const px = a.x + ((b.x - a.x) * k) / 10;
          const py = a.y + ((b.y - a.y) * k) / 10;
          const sway = Math.sin(time * 1.5 + k + r) * (this.working ? 1 : 0.3);
          hang.moveTo(px, py).lineTo(px + sway, py + 13).stroke({ width: 1.3, color: k % 2 ? 0x2b2b2b : 0xefe3c2 });
        }
      }
    };
    this.animate(0);
  },

  // Braiding porch: house where seated weavers plait strips; finished braid coils stack
  // on a table.
  braiders(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 26, ctx, { wall: 0xf2a7a0, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyGreen);
    box(g, x + 2.2, y + 2.05, 0.6, 0.5, 8, PAL.wood);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 2.35 + (i % 2) * 0.28, y + 2.2 + Math.floor(i / 2) * 0.15, 8 + Math.floor(i / 2) * 3);
      g.circle(p.x, p.y - 3, 3.4).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.circle(p.x, p.y - 3, 2).stroke({ width: 0.8, color: 0x2b2b2b });
    }
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      for (const [k, [bx, shirt]] of [[0.7, 0xf6d860], [1.5, 0x2e6fd1]].entries()) {
        const p = iso(x + bx, y + 2.2);
        // Seated on stool with long braid draped across lap.
        work.rect(p.x - 4, p.y - 6, 8, 6).fill(PAL.wood);
        work.roundRect(p.x - 3.2, p.y - 15, 6.4, 9.5, 2).fill(shirt);
        work.circle(p.x, p.y - 17.5, 2.8).fill(0x8d5524);
        work.moveTo(p.x - 1, p.y - 18).quadraticCurveTo(p.x - 4, p.y - 14, p.x - 3, p.y - 10).stroke({ width: 1.6, color: 0x2b2b2b });
        const m = this.working ? Math.sin(time * 7 + k * 2) * 1.5 : 0;
        work.moveTo(p.x + 3, p.y - 10 + m).lineTo(p.x + 9, p.y - 2).stroke({ width: 2.4, color: 0xefe3c2 });
        work.moveTo(p.x + 4, p.y - 9 + m).lineTo(p.x + 9, p.y - 3).stroke({ width: 0.8, color: 0x2b2b2b });
      }
    };
    this.animate(0);
  },

  // Hat sewing: house with porch sewing machine; braid spirals under needle as finished
  // hats stack up.
  hat_sewer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0x9ad0ec, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyYellow);
    box(g, x + 0.45, y + 2.1, 0.9, 0.5, 9, PAL.wood);
    const m = iso(x + 0.9, y + 2.35, 9);
    g.roundRect(m.x - 7, m.y - 8, 14, 6, 2).fill(0x263238).stroke(OUTLINE);
    g.rect(m.x + 3, m.y - 8, 3, 7).fill(0x263238);
    // Sombreros apilados.
    const hats = 2 + Math.min(ctx.tier, 3);
    for (let i = 0; i < hats; i++) {
      const p = iso(x + 2.25 + (i % 2) * 0.35, y + 2.25, Math.floor(i / 2) * 4);
      g.ellipse(p.x, p.y - 2, 9, 3.4).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 2, 6.5, 2.4).stroke({ width: 1.2, color: 0x2b2b2b });
      g.moveTo(p.x - 4.5, p.y - 2).quadraticCurveTo(p.x, p.y - 12, p.x + 4.5, p.y - 2).closePath().fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.moveTo(p.x - 3.8, p.y - 5).lineTo(p.x + 3.8, p.y - 5).stroke({ width: 1, color: 0x2b2b2b });
    }
    const sew = new Graphics();
    this.anim.addChild(sew);
    this.animate = (time) => {
      sew.clear();
      // Hat spinning under sewing needle.
      const a = this.working ? time * 2 : 0;
      sew.ellipse(m.x - 2, m.y - 1, 7, 2.6).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      sew.moveTo(m.x - 2 + Math.cos(a) * 5, m.y - 1 + Math.sin(a) * 1.8).lineTo(m.x - 2 + Math.cos(a + Math.PI) * 5, m.y - 1 + Math.sin(a + Math.PI) * 1.8).stroke({ width: 1, color: 0x2b2b2b });
      const n = this.working ? Math.abs(Math.sin(time * 14)) * 2 : 0;
      sew.moveTo(m.x + 4, m.y - 8).lineTo(m.x + 4, m.y - 4 + n).stroke({ width: 0.8, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Tuchín roadside stall: palm kiosk beside highway with hats hung for sale, salted fish
  // on line, and fried-fish table for travelers.
  parador(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    // Fried-fish dining table.
    box(g, x0 + 1.4, y0 + 0.4, 0.8, 0.6, 8, 0xd7263d);
    for (const [px, py] of [[1.6, 0.6], [1.95, 0.75]]) {
      const p = iso(x0 + px, y0 + py, 8);
      g.ellipse(p.x, p.y, 4.6, 2.2).fill(0xffffff);
      fishOn(g, p.x - 0.5, p.y - 0.5, 3, PRODUCTS.fried_fish.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    // Hats hung across kiosk front (more at milestones).
    const front = (k, n, z) => iso(x0 + 0.2 + (k * (w - 0.4)) / (n - 1), y0 + d + 0.05, z);
    const n = 3 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const p = front(k, n, H - 8);
      g.ellipse(p.x, p.y, 6.5, 2.4).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y, 4.5, 1.6).stroke({ width: 1, color: 0x2b2b2b });
      g.moveTo(p.x - 3.2, p.y).quadraticCurveTo(p.x, p.y - 7, p.x + 3.2, p.y).closePath().fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.moveTo(p.x - 2.6, p.y - 2.5).lineTo(p.x + 2.6, p.y - 2.5).stroke({ width: 1, color: 0x2b2b2b });
    }
    // Signboard.
    const sign = iso(x0 + 0.5, y0 + 2.2);
    g.rect(sign.x - 1, sign.y - 22, 2, 22).fill(PAL.woodDark);
    g.roundRect(sign.x - 13, sign.y - 30, 26, 9, 2).fill(0xf6d860).stroke(OUTLINE);
    const salt = new Graphics();
    this.anim.addChild(salt);
    this.animate = (time) => {
      salt.clear();
      // Salted fish hung on line between kiosk and signboard.
      const a = iso(x0 + 0.6, y0 + 2.2, 18);
      const b = iso(x0 + 2.3, y0 + 2.2, 18);
      salt.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x5d4037 });
      for (let k = 1; k < 5; k++) {
        const px = a.x + ((b.x - a.x) * k) / 5;
        const py = a.y + ((b.y - a.y) * k) / 5;
        const sway = Math.sin(time * 1.3 + k) * 0.8;
        salt.poly([px - 2.6 + sway, py + 2, px + 2.6 + sway, py + 2, px + sway, py + 12]).fill(PRODUCTS.salted_fish.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      }
      box(salt, x0 + 2.3, y0 + 2.15, 0.06, 0.06, 20, PAL.woodDark);
    };
    this.animate(0);
  },

  // --- Coast · Cartagena (v3.20): colorful colonial houses, coral-stone walls, and sea ---

  // Rampart restaurant: wall section with corner sentry boxes and candlelit tablecloth
  // dinner tables on top (more tables at milestones).
  restaurante_muralla(g, x, y, ctx) {
    const x0 = x + 0.2;
    const y0 = y + 0.5;
    const w = 2.6;
    const d = 1.4;
    const H = 18;
    box(g, x0, y0, w, d, H, 0xd9c9a8);
    for (let k = 1; k < 4; k++) {
      const a = iso(x0, y0 + d, (H * k) / 4);
      const b = iso(x0 + w, y0 + d, (H * k) / 4);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0xbfae8a });
    }
    // Front battlements.
    for (let k = 0; k < 6; k++) box(g, x0 + 0.1 + k * 0.45, y0 + d - 0.15, 0.25, 0.15, 4, 0xcdbb94, { z: H });
    // Corner garita turret.
    box(g, x0 + w - 0.45, y0 - 0.1, 0.45, 0.45, 12, 0xd9c9a8, { z: H });
    const cap = iso(x0 + w - 0.22, y0 + 0.12, H + 12);
    g.moveTo(cap.x - 9, cap.y).quadraticCurveTo(cap.x, cap.y - 14, cap.x + 9, cap.y).closePath().fill(0xcdbb94).stroke(OUTLINE);
    // Stone access stairs.
    for (let k = 0; k < 5; k++) box(g, x0 - 0.35, y0 + 0.2 + k * 0.22, 0.35, 0.22, H - k * 3.6, 0xcdbb94);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 10);
    const tables = [[0.5, 0.5], [1.3, 0.7], [0.8, 1.05], [1.75, 1.1]].slice(0, 2 + Math.min(ctx.tier, 2));
    this.flames = [];
    for (const [tx, ty] of tables) {
      const p = iso(x0 + tx, y0 + ty, H);
      g.rect(p.x - 1, p.y - 7, 2, 7).fill(0x555555);
      g.ellipse(p.x, p.y - 7, 8, 3.6).fill(0xfbfaf6).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.moveTo(p.x - 8, p.y - 7).quadraticCurveTo(p.x, p.y - 2, p.x + 8, p.y - 7).stroke({ width: 1.6, color: 0xd7263d });
      g.ellipse(p.x - 3, p.y - 7.5, 2.4, 1).fill(PRODUCTS.arroz_con_coco.color);
      g.rect(p.x + 2, p.y - 11, 1.4, 4).fill(0xfbfaf6);
      this.flames.push({ x: p.x + 2.7, y: p.y - 12 });
      this.lights.push({ x: p.x + 2.7, y: p.y - 12, r: 14 });
    }
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      for (const [k, f] of this.flames.entries()) fire.ellipse(f.x, f.y - Math.abs(Math.sin(time * 8 + k)) * 0.6, 1, 1.8).fill(0xffb300);
    };
    this.animate(0);
  },

  // Colonial hotel: two-story pink mansion with full-length wooden balcony and hanging
  hotel_colonial(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up }, { wall: 0xf28c9a, roofH: 15 });
    door(g, hx, hy, 1.6, 0.7, 17, 0x2f7d4f);
    door(g, hx, hy, 1.6, 1.6, 17, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, 0x7a4a22);
    // bougainvillea.
    const z = 22 + up / 2;
    g.poly(isoPoly([[hx, hy + 1.6, z], [hx + 2.3, hy + 1.6, z], [hx + 2.3, hy + 1.85, z], [hx, hy + 1.85, z]])).fill(0x5d3a1e).stroke(OUTLINE);
    g.poly(isoPoly([[hx, hy + 1.85, z], [hx + 2.3, hy + 1.85, z], [hx + 2.3, hy + 1.85, z + 7], [hx, hy + 1.85, z + 7]])).fill({ color: 0x7a4a22, alpha: 0.35 }).stroke(OUTLINE);
    for (let k = 0; k <= 10; k++) {
      const a = iso(hx + (2.3 * k) / 10, hy + 1.85, z);
      const b = iso(hx + (2.3 * k) / 10, hy + 1.85, z + 7);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x5d3a1e });
    }
    // Bugambilias.
    for (const [bx, dz] of [[0.2, 2], [0.45, -2], [1.9, 1], [2.15, -3]]) {
      const p = iso(hx + bx, hy + 1.85, z + dz);
      for (const [dx, dy] of [[-3, 0], [3, -1], [0, -3], [1, 3]]) g.circle(p.x + dx, p.y + dy, 2.8).fill(0xd63384);
      g.circle(p.x, p.y + 1, 1.6).fill(0x4e8a33);
    }
  },

  // Second-story wooden balcony across whole front.
  cocina_bahia(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0x6fc3e0, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x7a4a22);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0x7a4a22);
    box(g, x + 0.4, y + 2.1, 0.7, 0.55, 8, 0xa0522d);
    const pot = iso(x + 0.75, y + 2.37, 8);
    g.ellipse(pot.x, pot.y - 2, 8.5, 4).fill(0xb5562e).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 3, 6.5, 2.6).fill(0xf5ecd7);
    box(g, x + 1.4, y + 2.1, 1.2, 0.55, 8, PAL.wood);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 2); i++) {
      const p = iso(x + 1.6 + (i % 2) * 0.45, y + 2.25 + Math.floor(i / 2) * 0.25, 8);
      g.ellipse(p.x, p.y, 5, 2.4).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x - 1.5, p.y - 0.5, 2.2, 1.1).fill(PRODUCTS.arroz_con_coco.color);
      fishOn(g, p.x + 1.8, p.y - 0.4, 2.2, 0xd4a35a);
    }
    this.smokePoints = [iso(x + 0.75, y + 2.37, 12)];
  },

  // Waterfront kitchen: blue seaside house with hearth casserole and plated counter.
  loncheras(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xf6c244, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0x7a4a22);
    const cooler = (bx, by, z) => {
      box(g, x + bx, y + by, 0.35, 0.25, 7, 0xfbfaf6, { z });
      g.poly(isoPoly([[x + bx, y + by + 0.25, z + 2.5], [x + bx + 0.35, y + by + 0.25, z + 2.5], [x + bx + 0.35, y + by + 0.25, z + 4], [x + bx, y + by + 0.25, z + 4]])).fill(0x2e6fd1);
    };
    for (const [bx, by, z] of [[1.3, 2.3, 0], [1.75, 2.3, 0], [1.5, 2.3, 7], [2.2, 2.3, 0]].slice(0, 2 + Math.min(ctx.tier, 2))) cooler(bx, by, z);
    const fill = new Graphics();
    this.anim.addChild(fill);
    this.animate = (time) => {
      fill.clear();
      // Picnic coolers: yellow house with stacked foam coolers and one being packed.
      const p = iso(x + 0.75, y + 2.4);
      fill.rect(p.x - 7, p.y - 7, 14, 7).fill(0xfbfaf6).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      fill.ellipse(p.x, p.y - 7, 7, 2.2).fill(0x81d4fa);
      if (!this.working) return;
      const f = (time * 0.8) % 1;
      fill.rect(p.x - 1, p.y - 22 + f * 14, 2.4, 5).fill([0xd7263d, 0x2fa36b][Math.floor(time * 0.8) % 2]);
    };
    this.animate(0);
  },

  // Ice cubes and sodas dropping into open cooler.
  // Tour boat dock: bay water, wooden pier, and boats departing full of island-bound tourists.
  muelle(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0x26a6c4);
    g.poly(isoPoly([[x + 0.3, y + 0.3], [x + 2.7, y + 0.3], [x + 2.7, y + 2.7], [x + 0.3, y + 2.7]])).fill(0x3cc0d6);
    for (let k = 0; k < 5; k++) box(g, x + 0.3, y + 1.0 + k * 0.28, 1.5, 0.24, 3, k % 2 ? PAL.wood : PAL.woodDark);
    for (const [px, py] of [[0.3, 1.0], [1.75, 1.0], [0.3, 2.35], [1.75, 2.35]]) box(g, x + px, y + py, 0.07, 0.07, 6, PAL.woodDark);
    const sign = iso(x + 0.5, y + 0.6);
    g.rect(sign.x - 1, sign.y - 20, 2, 20).fill(PAL.woodDark);
    g.roundRect(sign.x - 12, sign.y - 28, 24, 9, 2).fill(0x26c6da).stroke(OUTLINE);
    const boats = new Graphics();
    this.anim.addChild(boats);
    const lancha = (b, px, py, people) => {
      b.ellipse(px, py + 2, 14, 3.4).fill({ color: 0x1f8aa6, alpha: 0.6 });
      b.moveTo(px - 13, py - 3).lineTo(px + 11, py - 3).lineTo(px + 14, py - 6).lineTo(px + 9, py + 1).lineTo(px - 11, py + 1).closePath().fill(0xffffff).stroke(OUTLINE);
      b.rect(px - 11, py - 1.5, 20, 1.6).fill(0x2e6fd1);
      b.rect(px - 4, py - 9, 8, 6).fill(0xd7263d).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      for (let i = 0; i < people; i++) {
        b.circle(px - 9 + i * 4, py - 6, 1.8).fill(0x8d5524);
        b.rect(px - 10.5 + i * 4, py - 4.5, 3, 2).fill(0xf6d860);
      }
    };
    this.animate = (time) => {
      boats.clear();
      // One moored at pier and one heading out.
      const bob = Math.sin(time * 1.6) * 0.8;
      const a = iso(x + 2.2, y + 0.75);
      lancha(boats, a.x, a.y + bob, 0);
      if (!this.working) return;
      const f = (time * 0.12) % 1;
      const b = iso(x + 1.9 + f * 0.7, y + 1.9 - f * 1.6);
      lancha(boats, b.x, b.y + Math.sin(time * 2) * 0.8, 3);
      boats.moveTo(b.x - 14, b.y + 1).lineTo(b.x - 24, b.y + 3).stroke({ width: 1.2, color: 0xffffff, alpha: 0.7 });
    };
    this.animate(0);
  },

  // --- Boyacá · El Papal (v3.22): white rammed-earth houses with green plinth and clay tile ---

  // Potato washer: wash tank, inclined exit conveyor, and muddy potato sacks.
  potato_washer(g, x, y, ctx) {
    const tx = x + 0.3;
    const ty = y + 0.4;
    box(g, tx, ty, 1.5, 1.1, 10, 0x9aa3a8);
    g.poly(isoPoly([[tx + 0.1, ty + 0.1, 10], [tx + 1.4, ty + 0.1, 10], [tx + 1.4, ty + 1.0, 10], [tx + 0.1, ty + 1.0, 10]])).fill(0x6fa8dc);
    // Inclined belt lifting washed potatoes.
    const a = iso(tx + 1.5, ty + 0.55, 8);
    const b = iso(tx + 2.6, ty + 0.55, 18);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 7, color: 0x37474f });
    box(g, tx + 2.4, ty + 0.3, 0.1, 0.1, 18, PAL.woodDark);
    // Dirty potato sacks waiting.
    for (const [bx, by] of [[0.5, 2.3], [0.85, 2.45], [1.2, 2.3]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(0xc8a26a).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9, 3.5, 1.6).fill(PRODUCTS.potato.color);
    }
    const water = new Graphics();
    this.anim.addChild(water);
    this.animate = (time) => {
      water.clear();
      // Potatoes riding belt up with splashing water drops.
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.5 + i / 4) % 1;
        water.circle(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f - 4, 2.6).fill(PRODUCTS.washed_potato.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      }
      if (!this.working) return;
      const c = iso(tx + 0.75, ty + 0.55, 10);
      for (let i = 0; i < 5; i++) {
        const f = (time * 1.6 + i / 5) % 1;
        water.circle(c.x + Math.cos(i * 1.3) * 10 * f, c.y - Math.sin(f * Math.PI) * 8, 1.2).fill({ color: 0xe8f6ff, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Potato grader: shed with sorting table; large, medium, and small tubers sorted into 3 sacks.
  potato_grader(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.4, 1.6, 0.6, 9, PAL.wood);
    for (const [k, [bx, by]] of [[1.0, 1.95], [1.5, 2.1], [2.0, 1.95]].entries()) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 5, 6 + k, 5 + k * 0.5).fill(0xc8a26a).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9 - k * 0.5, 3, 1.4).fill(PRODUCTS.graded_potato.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      for (let i = 0; i < 5; i++) {
        const p = iso(x0 + 0.6 + i * 0.3, y0 + 0.7, 9);
        work.ellipse(p.x, p.y - 1.5, 2.6, 1.8).fill(PRODUCTS.washed_potato.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      }
      const p = iso(x0 + 1.2, y0 + 1.15);
      worker(work, p.x, p.y, 0x8e44ad);
      // Wool ruana draped over shoulders.
      work.poly([p.x - 5, p.y - 17, p.x + 5, p.y - 17, p.x + 6, p.y - 11, p.x - 6, p.y - 11]).fill(0x8d6e63);
      if (!this.working) return;
      const f = (time * 1.2) % 1;
      work.circle(p.x + 4 + f * 8, p.y - 14 + f * 10, 2).fill(PRODUCTS.graded_potato.color);
    };
    this.animate(0);
  },

  // Potato peeler: white green-plinth house; rotating porch peeler drum ejecting peels.
  // ejecting peels.
  potato_peeler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0x2f7d4f);
    box(g, x + 2.25, y + 2.0, 0.5, 0.5, 6, 0x9aa3a8);
    const drum = iso(x + 2.5, y + 2.25, 14);
    const peel = iso(x + 1.6, y + 2.5);
    g.ellipse(peel.x, peel.y - 2, 9, 3.5).fill(0x8a6a3a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      spin.ellipse(drum.x, drum.y, 9, 8).fill(0xb0bec5).stroke(OUTLINE);
      const a = this.working ? time * 6 : 0;
      for (let k = 0; k < 3; k++) {
        const b = a + (k * Math.PI * 2) / 3;
        spin.moveTo(drum.x, drum.y).lineTo(drum.x + Math.cos(b) * 7, drum.y + Math.sin(b) * 6).stroke({ width: 1.2, color: 0x607d8b });
      }
      if (!this.working) return;
      const f = (time * 1.3) % 1;
      spin.ellipse(drum.x - 8 - f * 10, drum.y + 2 + f * 8, 2, 1).fill(0x8a6a3a);
    };
    this.animate(0);
  },

  // Chip fryer: house with large porch fryer crisping golden yellow native potato chips.
  criollas_fryer(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.5, 1.2, 0.8, 12, 0x9aa3a8);
    const vat = iso(x0 + 1.0, y0 + 0.9, 12);
    g.ellipse(vat.x, vat.y, 14, 6).fill(0xd9a30a).stroke(OUTLINE);
    // Baskets of freshly fried chips.
    for (const [bx, by] of [[1.9, 1.7], [0.6, 1.8]]) {
      const p = iso(x0 + bx, y0 + by);
      g.poly([p.x - 7, p.y - 8, p.x + 7, p.y - 8, p.x + 5, p.y, p.x - 5, p.y]).fill(0xb08850).stroke(OUTLINE);
      for (const dx of [-4, 0, 4]) g.circle(p.x + dx, p.y - 9, 2.2).fill(PRODUCTS.criollas.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    this.smokePoints = [iso(x0 + 1.0, y0 + 0.9, 18)];
    const fry = new Graphics();
    this.anim.addChild(fry);
    this.animate = (time) => {
      fry.clear();
      for (let i = 0; i < 6; i++) {
        const bob = this.working ? Math.sin(time * 5 + i) * 1.2 : 0;
        fry.circle(vat.x - 9 + i * 3.6, vat.y - 1 + Math.sin(i * 2) * 1.6 + bob, 2.2).fill(PRODUCTS.criollas.color).stroke({ width: 0.4, color: 0x8a5a0a });
      }
      if (!this.working) return;
      for (let i = 0; i < 4; i++) fry.circle(vat.x + Math.sin(time * 6 + i * 1.7) * 10, vat.y + Math.cos(time * 5 + i) * 2.5, 0.9).fill({ color: 0xfff3c4, alpha: 0.9 });
    };
    this.animate(0);
  },

  // Chip bagger: house with table filling and sealing yellow snack bags.
  criollas_bagger(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.6, 28, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.6, 0.7, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 1.9, 0.8, 14, 0x2e6fd1);
    box(g, x + 0.4, y + 2.15, 1.9, 0.35, 8, 0x555555);
    const bags = new Graphics();
    this.anim.addChild(bags);
    this.animate = (time) => {
      bags.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.7, y + 2.32, 8);
        bags.roundRect(p.x - 3.5, p.y - 9, 7, 9, 1.5).fill(PRODUCTS.criollas.color).stroke(OUTLINE);
        bags.rect(p.x - 3.5, p.y - 6, 7, 2.4).fill(PRODUCTS.criollas_bag.color);
      }
    };
  },

  // Chip depot: warehouse stacked with chip cartons in yard (more stacks at milestones).
  criollas_boxer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.6, 20, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 15, 0xffffff);
    const stack = (bx, by, rows) => {
      for (let r = 0; r < rows; r++) for (let k = 0; k < rows - r; k++) box(g, x + bx + k * 0.3 + r * 0.15, y + by, 0.26, 0.26, 7, PRODUCTS.criollas_box.color, { z: r * 7 });
    };
    stack(0.35, 2.3, 3);
    if (ctx.tier >= 2) stack(1.5, 2.35, 2);
    const carrier = new Graphics();
    this.anim.addChild(carrier);
    this.animate = (time) => {
      carrier.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 1.4 + k * 1.1, y + 2.1);
      worker(carrier, p.x, p.y, 0xd7263d);
      if (!back) carrier.rect(p.x - 6, p.y - 30, 12, 9).fill(PRODUCTS.criollas_box.color).stroke(OUTLINE);
    };
  },

  // --- Boyacá · La Cervecería (v3.23) ---

  // Maltings: malting floor of spread barley being turned plus kiln house with chimney.
  // its chimney.
  maltings(g, x, y, ctx) {
    const px = x + 0.25;
    const py = y + 1.1;
    g.poly(isoPoly([[px, py], [px + 2.5, py], [px + 2.5, py + 1.65], [px, py + 1.65]])).fill(0xc9c4b8).stroke(OUTLINE);
    g.poly(isoPoly([[px + 0.15, py + 0.15], [px + 2.35, py + 0.15], [px + 2.35, py + 1.5], [px + 0.15, py + 1.5]])).fill(0xd9b56a);
    for (let k = 0; k < 6; k++) {
      const a = iso(px + 0.2, py + 0.25 + k * 0.21);
      const b = iso(px + 2.3, py + 0.25 + k * 0.21);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0xb08a4a });
    }
    // Drying kiln: small brick house with chimney.
    box(g, x + 0.3, y + 0.15, 1.3, 0.8, 18, 0xb5562e);
    gableRoof(g, x + 0.3, y + 0.15, 1.3, 0.8, 18, 8, PAL.roof, 0xb5562e);
    box(g, x + 1.3, y + 0.3, 0.2, 0.2, 32 + ctx.up, 0x8a3b1f);
    this.roofTop = iso(x + 0.95, y + 0.55, 26);
    this.smokePoints = [iso(x + 1.4, y + 0.4, 32 + ctx.up)];
    const rake = new Graphics();
    this.anim.addChild(rake);
    this.animate = (time) => {
      rake.clear();
      const f = (Math.sin(time * 1.1) + 1) / 2;
      const p = iso(px + 0.6 + f * 1.4, py + 0.95);
      worker(rake, p.x, p.y, 0x2e6fd1);
      const swing = Math.sin(time * 5) * 4;
      rake.moveTo(p.x + 3, p.y - 14).lineTo(p.x + 12 + swing, p.y + 2).stroke({ width: 1.6, color: PAL.wood });
      rake.moveTo(p.x + 8 + swing, p.y + 2).lineTo(p.x + 16 + swing, p.y + 2).stroke({ width: 2, color: PAL.woodDark });
    };
    this.animate(0);
  },

  // Brew kettle: house with big steaming copper kettle on porch and malt sacks.
  brew_kettle(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0x2f7d4f);
    const k = iso(x + 1.0, y + 2.35);
    g.moveTo(k.x - 13, k.y - 2).lineTo(k.x - 14, k.y - 18).quadraticCurveTo(k.x, k.y - 22, k.x + 14, k.y - 18).lineTo(k.x + 13, k.y - 2).quadraticCurveTo(k.x, k.y + 3, k.x - 13, k.y - 2).closePath().fill(0xc46a2a).stroke(OUTLINE);
    g.ellipse(k.x, k.y - 18, 14, 4.5).fill(PRODUCTS.wort.color).stroke({ width: 0.8, color: 0x8a4a1a });
    g.rect(k.x - 9, k.y - 14, 3, 10).fill(0xe08a4a);
    for (const [bx, by] of [[2.3, 2.1], [2.6, 2.3], [2.35, 2.5]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 6.5, 5).fill(0xe8d9a8).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9, 3, 1.3).fill(PRODUCTS.malt.color);
    }
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.45 + i / 4) % 1;
        steam.circle(k.x - 6 + i * 4 + Math.sin(f * 6) * 3, k.y - 22 - f * 22, 2.5 + f * 4).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Fermentation tanks: row of steel tanks with catwalk ladders and airlock bubbles.
  fermenters(g, x, y, ctx) {
    const tanks = ctx.tier >= 2 ? [[0.5, 0.6], [1.3, 0.6], [2.1, 0.6], [0.9, 1.6], [1.7, 1.6]] : [[0.6, 0.7], [1.6, 0.7], [1.1, 1.7]];
    this.tanks = [];
    for (const [tx, ty] of tanks) {
      const base = iso(x + tx, y + ty);
      const h = 34 + ctx.up / 2;
      shadow(g, base.x + 3, base.y + 1, 13, 5);
      g.rect(base.x - 10, base.y - h, 20, h).fill(0xc7ccd1).stroke(OUTLINE);
      g.rect(base.x - 7, base.y - h, 4, h).fill(0xe3e7ea);
      g.ellipse(base.x, base.y - h, 10, 4).fill(0xdfe3e6).stroke(OUTLINE);
      g.poly([base.x - 10, base.y, base.x + 10, base.y, base.x + 4, base.y + 6, base.x - 4, base.y + 6]).fill(0x9aa3a8).stroke(OUTLINE);
      g.rect(base.x + 3, base.y - h * 0.6, 4, 8).fill(0xffffff).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      this.tanks.push({ x: base.x, y: base.y - h });
    }
    this.roofTop = iso(x + 1.4, y + 1.2, 40);
    const bub = new Graphics();
    this.anim.addChild(bub);
    this.animate = (time) => {
      bub.clear();
      if (!this.working) return;
      for (const [k, t] of this.tanks.entries()) {
        const f = (time * 0.6 + k * 0.3) % 1;
        bub.circle(t.x + 2, t.y - 2 - f * 8, 1.2).fill({ color: 0xffffff, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Bottling line: house with filling bottle conveyor beside stacked red crates.
  bottler(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0x2e6fd1);
    box(g, x + 0.4, y + 2.15, 1.5, 0.35, 8, 0x555555);
    const stack = [[2.3, 2.2, 0], [2.65, 2.2, 0], [2.48, 2.2, 6], [2.48, 2.55, 0], [2.3, 2.55, 0]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 3))) box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 6, PRODUCTS.beer_crate.color, { z });
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 6; i++) {
        const f = (time * 0.3 + i / 6) % 1;
        const p = iso(x + 0.45 + f * 1.4, y + 2.32, 8);
        belt.roundRect(p.x - 1.6, p.y - 9, 3.2, 9, 1).fill(0x6d4c1f).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
        belt.rect(p.x - 1.6, p.y - 5, 3.2, 2).fill(0xf2b705);
      }
    };
  },

  // --- Boyacá · Ráquira (v3.24): bright houses hung with pots and clay horses ---

  // Clay wedging: tiled shed where worker treads clay pit by foot; wedged clay balls aside.
  clay_kneader(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Wedged clay balls, front right.
    for (const [bx, by] of [[1.9, 1.9], [2.2, 2.05], [2.05, 2.25], [1.75, 2.2]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 3, 5, 4).fill(PRODUCTS.barro.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const pool = iso(x0 + 1.1, y0 + 0.8);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      work.ellipse(pool.x, pool.y, 18, 7).fill(0x8a5a46).stroke(OUTLINE);
      work.ellipse(pool.x, pool.y - 1, 15, 5.5).fill(PRODUCTS.barro.color);
      // Worker treading clay: alternating feet up and down.
      const step = this.working ? Math.sin(time * 6) * 2 : 0;
      work.rect(pool.x - 2.2, pool.y - 9 - Math.max(0, step), 1.8, 9).fill(0x8d5524);
      work.rect(pool.x + 0.4, pool.y - 9 - Math.max(0, -step), 1.8, 9).fill(0x8d5524);
      work.roundRect(pool.x - 3.2, pool.y - 18, 6.4, 9.5, 2).fill(0xf28c9a);
      work.circle(pool.x, pool.y - 20.5, 2.8).fill(0x8d5524);
      work.ellipse(pool.x, pool.y - 22.5, 5.5, 1.5).fill(0x3e2723);
    };
    this.animate(0);
  },

  // Pottery shelf: yellow house with black clay pots drying in rows on plank (more at milestones).
  pot_maker(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.8, 1.0, 22, ctx, { wall: 0xf6c244, roofH: 12 });
    door(g, hx, hy, 1.0, 0.6, 15, 0x2e6fd1);
    const rows = ctx.tier >= 2 ? [1.65, 2.2, 2.75] : [1.9, 2.6];
    for (const ry of rows) {
      box(g, x + 0.35, y + ry, 2.3, 0.25, 4, PAL.wood);
      for (let k = 0; k < 5; k++) {
        const p = iso(x + 0.55 + k * 0.45, y + ry + 0.12, 4);
        g.ellipse(p.x, p.y - 5, 5, 5.5).fill(PRODUCTS.olla_barro.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
        g.ellipse(p.x, p.y - 10, 3, 1.1).fill(0x3e2723);
        g.moveTo(p.x - 4.5, p.y - 5).lineTo(p.x + 4.5, p.y - 5).stroke({ width: 0.8, color: 0xd9772e });
      }
    }
  },

  // Potter's wheel: blue house with potter at wheel; vessel rises as wheel spins.
  potter_wheel(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0x9ad0ec, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0xd7263d);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0xd7263d);
    // Unfired greenware drying.
    for (const [bx, by] of [[2.3, 2.1], [2.6, 2.25], [2.4, 2.5]]) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 3, p.y, p.x - 4, p.y - 7, p.x - 2, p.y - 11, p.x + 2, p.y - 11, p.x + 4, p.y - 7, p.x + 3, p.y]).fill(PRODUCTS.pieza_torneada.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    const wheel = iso(x + 1.0, y + 2.3);
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      spin.ellipse(wheel.x, wheel.y - 6, 10, 3.5).fill(0x8b5a2b).stroke(OUTLINE);
      spin.rect(wheel.x - 1.5, wheel.y - 6, 3, 6).fill(0x5e3b1c);
      const grow = this.working ? (time * 0.4) % 1 : 0.6;
      const h = 4 + grow * 9;
      spin.poly([wheel.x - 4, wheel.y - 7, wheel.x - 5, wheel.y - 7 - h * 0.6, wheel.x - 2.5, wheel.y - 7 - h, wheel.x + 2.5, wheel.y - 7 - h, wheel.x + 5, wheel.y - 7 - h * 0.6, wheel.x + 4, wheel.y - 7]).fill(PRODUCTS.pieza_torneada.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      const a = this.working ? time * 10 : 0;
      spin.moveTo(wheel.x + Math.cos(a) * 9, wheel.y - 6 + Math.sin(a) * 3).lineTo(wheel.x + Math.cos(a) * 6, wheel.y - 6 + Math.sin(a) * 2).stroke({ width: 1, color: 0x3e2723 });
      // Potter seated behind wheel.
      spin.roundRect(wheel.x + 8, wheel.y - 18, 6.4, 9, 2).fill(0x2fa36b);
      spin.circle(wheel.x + 11.2, wheel.y - 21, 2.8).fill(0x8d5524);
      spin.moveTo(wheel.x + 8, wheel.y - 14).lineTo(wheel.x + 3, wheel.y - 11 - grow * 4).stroke({ width: 1.4, color: 0x8d5524 });
    };
    this.animate(0);
  },

  // Wood kiln: dome-shaped brick kiln with glowing firemouth and smoke beside painted planters.
  // planters already painted.
  pottery_kiln(g, x, y, ctx) {
    const k = iso(x + 1.1, y + 1.2);
    shadow(g, k.x + 4, k.y + 2, 30, 11);
    g.moveTo(k.x - 26, k.y).quadraticCurveTo(k.x - 26, k.y - 40, k.x, k.y - 42).quadraticCurveTo(k.x + 26, k.y - 40, k.x + 26, k.y).quadraticCurveTo(k.x, k.y + 8, k.x - 26, k.y).closePath().fill(0xb5562e).stroke(OUTLINE);
    for (let r = 1; r < 5; r++) g.moveTo(k.x - 26 + r * 2, k.y - r * 8).quadraticCurveTo(k.x, k.y - r * 8 + 6, k.x + 26 - r * 2, k.y - r * 8).stroke({ width: 0.8, color: 0x8a3b1f, alpha: 0.7 });
    box(g, x + 1.0, y + 0.95, 0.25, 0.25, 50 + ctx.up, 0x8a3b1f);
    g.moveTo(k.x - 8, k.y + 2).lineTo(k.x - 8, k.y - 12).quadraticCurveTo(k.x, k.y - 20, k.x + 8, k.y - 12).lineTo(k.x + 8, k.y + 2).closePath().fill(0x2b1d14);
    this.smokePoints = [iso(x + 1.12, y + 1.07, 50 + ctx.up)];
    // Materas pintadas.
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 2.3 + (i % 2) * 0.35, y + 1.9 + Math.floor(i / 2) * 0.35);
      g.poly([p.x - 5, p.y - 9, p.x + 5, p.y - 9, p.x + 3.5, p.y, p.x - 3.5, p.y]).fill(PRODUCTS.matera.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.circle(p.x, p.y - 5, 1.5).fill(0xffffff);
    }
    const flame = new Graphics();
    this.anim.addChild(flame);
    this.animate = (time) => {
      flame.clear();
      if (!this.working) return;
      const h = 9 + Math.sin(time * 9) * 3;
      flame.poly([k.x - 6, k.y + 1, k.x - 3, k.y - h * 0.6, k.x, k.y - h, k.x + 3, k.y - h * 0.5, k.x + 6, k.y + 1]).fill(0xff8c1a);
      flame.poly([k.x - 3, k.y + 1, k.x, k.y - h * 0.6, k.x + 3, k.y + 1]).fill(0xfff0a0);
    };
    this.animate(0);
  },

  // Beer mugs: pink house with table of clay mugs and beer barrel arriving from Cervecería;
  // filling mug foams over.
  jarras(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf28c9a, roofH: 16 });
    door(g, hx, hy, 1.6, 1.8, 18, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0x2f7d4f);
    box(g, x + 1.3, y + 2.1, 1.3, 0.5, 8, PAL.wood);
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 1.45 + (i % 3) * 0.38, y + 2.25 + Math.floor(i / 3) * 0.22, 8);
      g.roundRect(p.x - 2.6, p.y - 7, 5.2, 7, 1.2).fill(PRODUCTS.jarra_cerveza.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 7.5, 2.6, 1.2).fill(0xffffff);
    }
    // Beer barrel.
    const b = iso(x + 0.75, y + 2.35);
    g.ellipse(b.x, b.y - 1, 8, 3).fill(0x6d4c32);
    g.rect(b.x - 8, b.y - 16, 16, 15).fill(0x8b5a2b).stroke(OUTLINE);
    g.ellipse(b.x, b.y - 16, 8, 3).fill(0xa0703a).stroke(OUTLINE);
    for (const dy of [-12, -5]) g.moveTo(b.x - 8, b.y + dy).lineTo(b.x + 8, b.y + dy).stroke({ width: 1.2, color: 0x555555 });
    const foam = new Graphics();
    this.anim.addChild(foam);
    this.animate = (time) => {
      foam.clear();
      const p = iso(x + 1.1, y + 2.4);
      foam.roundRect(p.x - 3, p.y - 8, 6, 8, 1.2).fill(PRODUCTS.jarra_cerveza.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      if (!this.working) return;
      const f = (time * 0.7) % 1;
      foam.circle(p.x, p.y - 9 - f * 3, 2 + f * 1.5).fill({ color: 0xffffff, alpha: 1 - f * 0.5 });
      foam.moveTo(b.x + 8, b.y - 9).lineTo(p.x - 1, p.y - 9).stroke({ width: 1.2, color: 0xe8a317, alpha: 0.8 });
    };
    this.animate(0);
  },

  // --- Boyacá · Paipa (v3.25) ---

  // Paipa curdler: white green-plinth house with porch curd vat and milk cans.
  paipa_curdler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0x2f7d4f);
    for (const [cx, cy] of [[2.4, 2.1], [2.7, 2.25], [2.45, 2.5]]) {
      const p = iso(x + cx, y + cy);
      g.roundRect(p.x - 4, p.y - 13, 8, 13, 2).fill(0xc7ccd1).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 13, 3, 1.4).fill(0x9aa3a8);
    }
    box(g, x + 0.45, y + 2.05, 1.4, 0.55, 7, 0x9aa3a8);
    const tub = iso(x + 1.15, y + 2.32, 7);
    g.ellipse(tub.x, tub.y - 0.5, 15, 4.5).fill(0xfbfaf6);
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      for (let i = 0; i < 5; i++) stir.circle(tub.x - 10 + i * 5, tub.y - 0.5 + Math.sin(i * 2) * 1.5, 1.8).fill(0xece6d6);
      const a = this.working ? time * 2 : 0;
      stir.moveTo(tub.x + Math.cos(a) * 8, tub.y + Math.sin(a) * 2).lineTo(tub.x + 6 + Math.cos(a) * 4, tub.y - 16).stroke({ width: 2, color: PAL.wood });
    };
    this.animate(0);
  },

  // Cheese molds: shed with wooden hoop molds, weighted pressing boards, draining whey.
  cheese_molds(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.4, 1.6, 0.6, 9, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x0 + 0.65 + i * 0.38, y0 + 0.7, 9);
      g.ellipse(p.x, p.y - 3, 5, 2.4).fill(0xa0703a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 4.5, 4, 1.8).fill(0xfbfaf6);
      g.rect(p.x - 1, p.y - 12, 2, 7).fill(0x9aa3a8);
    }
    for (const [bx, by] of [[1.9, 1.95], [2.2, 2.1], [2.0, 2.3]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 3, 5, 2.4).fill(0xfbfaf6).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.rect(p.x - 5, p.y - 3, 10, 3).fill(0xf4efe1);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const drip = new Graphics();
    this.anim.addChild(drip);
    this.animate = (time) => {
      drip.clear();
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.2 + i / 4) % 1;
        const p = iso(x0 + 0.65 + i * 0.38, y0 + 0.95, 9);
        drip.circle(p.x, p.y + f * 8, 0.9).fill(0xe8f0d0);
      }
    };
    this.animate(0);
  },

  // Aging cellar: stone house with cheese wheels ripening deeper gold on shelves at milestones.
  cheese_cave(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.9, 1.3, 26, ctx, { wall: 0xb9b2a5, roofH: 13 });
    door(g, hx, hy, 1.3, 0.6, 16, 0x5e3b1c);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0x5e3b1c);
    for (let r = 0; r < 3; r++) {
      box(g, x + 0.4, y + 2.0, 2.2, 0.35, 2, PAL.wood, { z: r * 7 });
      for (let k = 0; k < 4; k++) {
        const p = iso(x + 0.6 + k * 0.5, y + 2.17, r * 7 + 2);
        const ripe = (k + r + ctx.tier) % 3;
        g.ellipse(p.x, p.y - 2.5, 5, 3).fill([0xfbfaf6, 0xf6d860, 0xd9a330][ripe]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      }
    }
    for (const lx of [0.4, 2.6]) box(g, x + lx, y + 2.0, 0.06, 0.35, 21, PAL.woodDark);
  },

  // Almojábana oven: yellow house with porch brick oven and baking trays of almojábanas.
  almojabana_oven(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf6d860, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0x2e6fd1);
    box(g, x + 0.4, y + 2.0, 0.9, 0.6, 14, 0xb5562e);
    const mouth = iso(x + 0.85, y + 2.6, 7);
    g.roundRect(mouth.x - 6, mouth.y - 6, 12, 8, 3).fill(0x2b1d14);
    box(g, x + 1.7, y + 2.1, 0.9, 0.45, 8, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 1.85 + (i % 2) * 0.4, y + 2.22 + Math.floor(i / 2) * 0.2, 8);
      g.circle(p.x, p.y - 2, 2.6).fill(PRODUCTS.almojabana.color).stroke({ width: 0.4, color: 0x8a5a0a });
    }
    this.smokePoints = [iso(x + 0.85, y + 2.3, 16)];
    const glow = new Graphics();
    this.anim.addChild(glow);
    this.animate = (time) => {
      glow.clear();
      if (this.working) glow.roundRect(mouth.x - 5, mouth.y - 5, 10, 6, 3).fill({ color: 0xff8c1a, alpha: 0.6 + Math.sin(time * 7) * 0.25 });
    };
    this.animate(0);
  },

  // Piquete feast: house with long outdoor tables laden with platters and dining crowd.
  piquete_table(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 28, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.4, 1.5, 18, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 14, 0xd7263d);
    box(g, x + 0.4, y + 2.15, 2.2, 0.5, 8, PAL.wood);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const p = iso(x + 0.6 + i * 0.45, y + 2.4, 8);
      g.ellipse(p.x, p.y, 5, 2.4).fill(0xc68a4a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      for (const dx of [-2, 0, 2]) g.circle(p.x + dx, p.y - 0.6, 1.1).fill(0xf2b705);
    }
    const eaters = new Graphics();
    this.anim.addChild(eaters);
    this.animate = (time) => {
      eaters.clear();
      for (const [k, bx] of [0.8, 1.9].entries()) {
        const p = iso(x + bx, y + 2.85);
        worker(eaters, p.x, p.y, k ? 0x8e44ad : 0x2e6fd1);
        eaters.poly([p.x - 5, p.y - 17, p.x + 5, p.y - 17, p.x + 6, p.y - 11, p.x - 6, p.y - 11]).fill(k ? 0x8d6e63 : 0x6d4c41);
        const m = this.working ? Math.max(0, Math.sin(time * 3 + k * 2)) : 0;
        eaters.moveTo(p.x + 3, p.y - 14).lineTo(p.x + 3 - m * 2, p.y - 18 - m * 2).stroke({ width: 1.4, color: 0x8d5524 });
      }
    };
    this.animate(0);
  },

  // Mud oven: yard dome clay oven with glowing mouth, kneading table, and baked-goods baskets.
  // pastry baskets.
  clay_oven(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.2, 28, ctx, { wall: 0xf28c9a, roofH: 14 });
    door(g, hx, hy, 1.2, 1.8, 18, 0x2f7d4f);
    const k = iso(x + 0.9, y + 2.25);
    g.moveTo(k.x - 18, k.y).quadraticCurveTo(k.x - 18, k.y - 26, k.x, k.y - 27).quadraticCurveTo(k.x + 18, k.y - 26, k.x + 18, k.y).quadraticCurveTo(k.x, k.y + 6, k.x - 18, k.y).closePath().fill(0xb5653a).stroke(OUTLINE);
    g.moveTo(k.x - 6, k.y + 2).lineTo(k.x - 6, k.y - 8).quadraticCurveTo(k.x, k.y - 13, k.x + 6, k.y - 8).lineTo(k.x + 6, k.y + 2).closePath().fill(0x2b1d14);
    for (const [bx, by] of [[2.0, 2.2], [2.45, 2.35]].slice(0, 1 + Math.min(ctx.tier, 1))) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 8, p.y - 9, p.x + 8, p.y - 9, p.x + 6, p.y, p.x - 6, p.y]).fill(0xb08850).stroke(OUTLINE);
      for (const dx of [-4, 0, 4]) g.circle(p.x + dx, p.y - 10, 2.4).fill(PRODUCTS.almojabana.color);
    }
    this.smokePoints = [iso(x + 0.9, y + 2.0, 28)];
    const flame = new Graphics();
    this.anim.addChild(flame);
    this.animate = (time) => {
      flame.clear();
      if (!this.working) return;
      const h = 7 + Math.sin(time * 9) * 2;
      flame.poly([k.x - 5, k.y + 1, k.x - 2, k.y - h * 0.6, k.x, k.y - h, k.x + 2, k.y - h * 0.5, k.x + 5, k.y + 1]).fill(0xff8c1a);
    };
    this.animate(0);
  },

  // --- Boyacá · Las Ruanas (v3.26) ---

  // Wool washing: stone creek-water basin where wool washes and drapes over fence to dry.
  wool_washer(g, x, y, ctx) {
    const tx = x + 0.3;
    const ty = y + 0.4;
    box(g, tx, ty, 1.5, 1.0, 9, 0xa39b8c);
    g.poly(isoPoly([[tx + 0.1, ty + 0.1, 9], [tx + 1.4, ty + 0.1, 9], [tx + 1.4, ty + 0.9, 9], [tx + 0.1, ty + 0.9, 9]])).fill(0x6fa8dc);
    // Fence draped with drying fleece.
    const a = iso(x + 0.4, y + 2.4, 12);
    const b = iso(x + 2.6, y + 2.4, 12);
    for (const p of [a, b]) g.rect(p.x - 1, p.y, 2, 12).fill(PAL.woodDark);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: PAL.wood });
    for (let k = 1; k < 5; k++) {
      const px = a.x + ((b.x - a.x) * k) / 5;
      const py = a.y + ((b.y - a.y) * k) / 5;
      for (const [dx, dy] of [[-3, 1], [2, 0], [0, 3], [3, 3]]) g.circle(px + dx, py + dy, 2.6).fill(0xffffff).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.4 });
    }
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(tx + 1.8, ty + 0.5);
      worker(work, p.x, p.y, 0x6d4c41);
      const k = this.working ? Math.sin(time * 4) * 3 : 0;
      const c = iso(tx + 1.2, ty + 0.5, 10);
      for (const [dx, dy] of [[-3, 0], [2, -1], [0, 2]]) work.circle(c.x + dx + k, c.y + dy, 2.6).fill(0xece4cf);
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.6 + i / 4) % 1;
        work.circle(c.x + Math.cos(i * 1.6) * 9 * f, c.y - Math.sin(f * Math.PI) * 7, 1.1).fill({ color: 0xe8f6ff, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Carding: house porch where worker combs wool with hand carders into fluffy rovings basket.
  carder(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.8, 1.0, 22, ctx, { wall: 0xf7f4ee, roofH: 12 });
    door(g, hx, hy, 1.0, 0.6, 15, 0x2e6fd1);
    const basket = iso(x + 2.3, y + 2.3);
    g.poly([basket.x - 9, basket.y - 9, basket.x + 9, basket.y - 9, basket.x + 7, basket.y, basket.x - 7, basket.y]).fill(0xb08850).stroke(OUTLINE);
    for (const dx of [-5, 0, 5]) g.circle(basket.x + dx, basket.y - 10, 3.4).fill(0xfbfaf6);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x + 1.1, y + 2.2);
      // Seated on bench holding a carder in each hand.
      work.rect(p.x - 5, p.y - 6, 10, 6).fill(PAL.wood);
      work.roundRect(p.x - 3.2, p.y - 15, 6.4, 9.5, 2).fill(0xd7263d);
      work.poly([p.x - 5, p.y - 14, p.x + 5, p.y - 14, p.x + 6, p.y - 8, p.x - 6, p.y - 8]).fill(0x6d4c41);
      work.circle(p.x, p.y - 17.5, 2.8).fill(0x8d5524);
      const k = this.working ? Math.sin(time * 8) * 3 : 0;
      work.rect(p.x + 3 + k, p.y - 13, 6, 4).fill(0xa0703a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      work.rect(p.x + 4, p.y - 9, 6, 4).fill(0xa0703a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      work.circle(p.x + 7 + k * 0.5, p.y - 9, 2.4).fill(0xfbfaf6);
    };
    this.animate(0);
  },

  // Spinning wheel: blue house with spinning wooden wheel on porch and hanging yarn skeins.
  spinning_wheel(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 26, ctx, { wall: 0x9ad0ec, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, 0xd7263d);
    for (const [k, col] of [0xece4cf, 0x8e44ad, 0xd7263d].entries()) {
      const p = iso(x + 2.2 + k * 0.2, y + 2.1 + k * 0.1, 12);
      g.ellipse(p.x, p.y + 4, 3, 5).fill(col).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    const wheel = iso(x + 1.0, y + 2.35);
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      spin.rect(wheel.x - 8, wheel.y - 4, 16, 4).fill(PAL.wood);
      spin.circle(wheel.x - 2, wheel.y - 14, 9).stroke({ width: 2, color: PAL.woodDark });
      const a = this.working ? time * 5 : 0;
      for (let k = 0; k < 4; k++) {
        const b = a + (k * Math.PI) / 4;
        spin.moveTo(wheel.x - 2 + Math.cos(b) * 9, wheel.y - 14 + Math.sin(b) * 9).lineTo(wheel.x - 2 - Math.cos(b) * 9, wheel.y - 14 - Math.sin(b) * 9).stroke({ width: 0.8, color: PAL.wood });
      }
      spin.moveTo(wheel.x - 2, wheel.y - 14).lineTo(wheel.x + 10, wheel.y - 10).stroke({ width: 0.8, color: 0xece4cf });
      spin.circle(wheel.x + 10, wheel.y - 10, 2).fill(0xece4cf);
      // Seated spinner.
      spin.roundRect(wheel.x + 10, wheel.y - 14, 6.4, 9, 2).fill(0x2fa36b);
      spin.circle(wheel.x + 13.2, wheel.y - 17, 2.8).fill(0x8d5524);
      spin.ellipse(wheel.x + 13.2, wheel.y - 19.5, 5, 1.4).fill(0x3e2723);
    };
    this.animate(0);
  },

  // Ruana loom: shed with large wooden loom where colorful striped ruana grows.
  ruana_loom(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.0;
    const H = 26 + ctx.up;
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    // Folded ruanas stacked on front table.
    for (let i = 0; i < 2 + Math.min(ctx.tier, 2); i++) box(g, x0 + 1.6, y0 + 2.2, 0.6, 0.4, 2.5, [0x6d4c41, 0x37474f, 0x8d6e63, 0x5d4037][i], { z: i * 2.5 });
    const loom = new Graphics();
    this.anim.addChild(loom);
    this.animate = (time) => {
      loom.clear();
      const a = iso(x0 + 0.4, y0 + 1.2);
      const b = iso(x0 + 1.6, y0 + 1.2);
      for (const p of [a, b]) loom.rect(p.x - 1.5, p.y - 22, 3, 22).fill(PAL.woodDark);
      loom.moveTo(a.x, a.y - 22).lineTo(b.x, b.y - 22).stroke({ width: 2.4, color: PAL.wood });
      const grow = this.working ? (time * 0.15) % 1 : 0.5;
      const h = 4 + grow * 12;
      loom.poly([a.x + 2, a.y - 20, b.x - 2, b.y - 20, b.x - 2, b.y - 20 + h, a.x + 2, a.y - 20 + h]).fill(0x6d4c41);
      for (let k = 0; k < 3; k++) loom.moveTo(a.x + 2, a.y - 18 + k * 4).lineTo(b.x - 2, b.y - 18 + k * 4).stroke({ width: 1, color: k === 1 ? 0xd7263d : 0xece4cf });
      for (let k = 1; k < 8; k++) loom.moveTo(a.x + ((b.x - a.x) * k) / 8, a.y - 20 + ((b.y - a.y) * k) / 8 + h).lineTo(a.x + ((b.x - a.x) * k) / 8, a.y - 6 + ((b.y - a.y) * k) / 8).stroke({ width: 0.4, color: 0xece4cf });
      const shuttle = this.working ? (Math.sin(time * 3) + 1) / 2 : 0.5;
      loom.rect(a.x + (b.x - a.x) * shuttle - 3, a.y + (b.y - a.y) * shuttle - 20 + h, 6, 2).fill(0x8b5a2b);
    };
    this.animate(0);
  },

  // Nobsa shop: roadside storefront hung with ruanas plus Ráquira pots and planters on counter.
  // on counter.
  tienda_nobsa(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    box(g, x0 + 1.4, y0 + 0.4, 0.8, 0.6, 8, PAL.wood);
    for (const [px, py, col] of [[1.55, 0.6, PRODUCTS.olla_barro.color], [1.85, 0.6, PRODUCTS.matera.color], [1.7, 0.85, PRODUCTS.olla_barro.color]]) {
      const p = iso(x0 + px, y0 + py, 8);
      g.ellipse(p.x, p.y - 3, 3.2, 3.6).fill(col).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const n = 3 + Math.min(ctx.tier, 3);
    const colors = [0x6d4c41, 0x37474f, 0x8d6e63, 0x5d4037, 0x2e4fa8, 0x8e44ad];
    for (let k = 0; k < n; k++) {
      const p = iso(x0 + 0.2 + (k * (w - 0.4)) / (n - 1), y0 + d + 0.05, H - 6);
      g.poly([p.x - 5, p.y, p.x + 5, p.y, p.x + 6, p.y + 12, p.x - 6, p.y + 12]).fill(colors[k % colors.length]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.moveTo(p.x - 5.5, p.y + 6).lineTo(p.x + 5.5, p.y + 6).stroke({ width: 1, color: 0xece4cf });
    }
    const sign = iso(x0 + 0.5, y0 + 2.2);
    g.rect(sign.x - 1, sign.y - 22, 2, 22).fill(PAL.woodDark);
    g.roundRect(sign.x - 13, sign.y - 30, 26, 9, 2).fill(0x6d4c41).stroke(OUTLINE);
  },

  // --- Boyacá · Villa de Leyva (v3.27): white mansions, green balconies, cobblestone streets ---

  // Plaza terrace: white mansion with red outdoor umbrellas; tables served beer and chips.
  terraza_plaza(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.4, 28, ctx, { wall: 0xfbf8f1, roofH: 14 });
    door(g, hx, hy, 1.4, 0.6, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.0, 0.7, 14, 0x2f7d4f);
    const tables = [iso(x + 0.8, y + 2.3), iso(x + 1.9, y + 2.4)];
    for (const p of tables) {
      shadow(g, p.x, p.y + 1, 12, 5);
      g.rect(p.x - 1, p.y - 20, 2, 20).fill(0x555555);
      g.ellipse(p.x, p.y - 9, 8, 4).fill(0xffffff).stroke(OUTLINE);
      g.poly([p.x, p.y - 28, p.x - 14, p.y - 19, p.x + 14, p.y - 19]).fill(0xd7263d).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.rect(p.x - 4, p.y - 15, 2, 5).fill(0x6d4c1f);
      g.rect(p.x - 1, p.y - 15, 2, 5).fill(0x6d4c1f);
      g.ellipse(p.x + 3, p.y - 10, 2.6, 1.2).fill(PRODUCTS.criollas.color);
    }
  },

  // Colonial inn: two-story whitewashed mansion with continuous green wooden balcony and geraniums.
  hospedaje_colonial(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up }, { wall: 0xfbf8f1, roofH: 15 });
    door(g, hx, hy, 1.6, 0.7, 17, 0x2f7d4f);
    door(g, hx, hy, 1.6, 1.6, 17, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, 0x2f7d4f);
    const z = 22 + up / 2;
    g.poly(isoPoly([[hx, hy + 1.6, z], [hx + 2.3, hy + 1.6, z], [hx + 2.3, hy + 1.85, z], [hx, hy + 1.85, z]])).fill(0x1f5a38).stroke(OUTLINE);
    for (let k = 0; k <= 10; k++) {
      const a = iso(hx + (2.3 * k) / 10, hy + 1.85, z);
      const b = iso(hx + (2.3 * k) / 10, hy + 1.85, z + 7);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x2f7d4f });
    }
    const top0 = iso(hx, hy + 1.85, z + 7);
    const top1 = iso(hx + 2.3, hy + 1.85, z + 7);
    g.moveTo(top0.x, top0.y).lineTo(top1.x, top1.y).stroke({ width: 1.6, color: 0x2f7d4f });
    // Geranios en materas.
    for (const bx of [0.3, 0.9, 1.5, 2.1]) {
      const p = iso(hx + bx, hy + 1.85, z + 8);
      g.rect(p.x - 2.5, p.y - 3, 5, 3).fill(PRODUCTS.matera.color);
      for (const [dx, dy] of [[-2, -4], [1.5, -5], [0, -6.5]]) g.circle(p.x + dx, p.y + dy, 1.8).fill(0xd7263d);
    }
  },

  // Saturday market: canvas stalls stocked with fruit, produce, pots, and mugs; shoppers.
  mercado_sabado(g, x, y, ctx) {
    const stalls = [[0.5, 0.6, 0xd7263d], [1.7, 0.6, 0x2e6fd1], [0.5, 1.7, 0xf2b705], [1.7, 1.7, 0x2fa36b]].slice(0, 2 + Math.min(ctx.tier, 2));
    for (const [sx, sy, col] of stalls) {
      box(g, x + sx, y + sy, 0.9, 0.5, 8, PAL.wood);
      for (let k = 0; k < 4; k++) {
        const p = iso(x + sx + 0.15 + k * 0.2, y + sy + 0.25, 8);
        g.circle(p.x, p.y - 2, 2.2).fill([0xf2b705, 0xd7263d, 0x7cb342, PRODUCTS.jarra_cerveza.color][k]);
      }
      for (const [px, py] of [[0, 0], [0.9, 0], [0, 0.5], [0.9, 0.5]]) box(g, x + sx + px - 0.03, y + sy + py - 0.03, 0.06, 0.06, 20, PAL.woodDark);
      g.poly(isoPoly([[x + sx - 0.1, y + sy - 0.1, 20], [x + sx + 1.0, y + sy - 0.1, 20], [x + sx + 1.0, y + sy + 0.6, 17], [x + sx - 0.1, y + sy + 0.6, 17]])).fill(col).stroke(OUTLINE);
    }
    this.roofTop = iso(x + 1.5, y + 1.3, 22);
    const people = new Graphics();
    this.anim.addChild(people);
    this.animate = (time) => {
      people.clear();
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.08 + i * 0.5) % 1;
        const p = iso(x + 0.3 + f * 2.4, y + 1.35);
        worker(people, p.x, p.y, i ? 0x8e44ad : 0xd7263d);
        people.poly([p.x - 5, p.y - 17, p.x + 5, p.y - 17, p.x + 6, p.y - 11, p.x - 6, p.y - 11]).fill(i ? 0x6d4c41 : 0x37474f);
      }
    };
    this.animate(0);
  },

  // Picnic baskets: house with leaf-wrapped travel lunches and hampers ready to go.
  canastos_paseo(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xfbf8f1, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0x2f7d4f);
    for (const [bx, by] of [[1.3, 2.35], [1.65, 2.5], [2.0, 2.35], [1.65, 2.2]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 8, p.y - 10, p.x + 8, p.y - 10, p.x + 6, p.y, p.x - 6, p.y]).fill(0xb08850).stroke(OUTLINE);
      g.ellipse(p.x - 2, p.y - 11, 4, 2.5).fill(PRODUCTS.fiambre_paseo.color);
      g.moveTo(p.x - 6, p.y - 10).quadraticCurveTo(p.x, p.y - 20, p.x + 6, p.y - 10).stroke({ width: 1.4, color: 0xa07c4a });
    }
  },

  // Fossil trailhead: stone path to countryside with sign and Kronosaurus rock; hikers depart.
  // caminantes en ruana.
  salida_fosil(g, x, y, ctx) {
    for (let k = 0; k < 9; k++) {
      const p = iso(x + 0.6 + k * 0.28, y + 1.5 + Math.sin(k) * 0.15);
      g.ellipse(p.x, p.y, 8, 4).fill(k % 2 ? 0x9a948a : 0xb9b2a5).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.3 });
    }
    // Fossilized rock slab.
    const r = iso(x + 1.2, y + 0.6);
    g.poly([r.x - 22, r.y + 2, r.x - 16, r.y - 10, r.x + 14, r.y - 12, r.x + 24, r.y, r.x + 12, r.y + 8, r.x - 14, r.y + 8]).fill(0xc9b48a).stroke(OUTLINE);
    g.moveTo(r.x - 16, r.y - 1).lineTo(r.x + 16, r.y - 3).stroke({ width: 2, color: 0xfbf8f1 });
    for (let k = 0; k < 8; k++) g.moveTo(r.x - 12 + k * 3.5, r.y - 2).lineTo(r.x - 11 + k * 3.5, r.y + 3).stroke({ width: 1, color: 0xfbf8f1 });
    g.ellipse(r.x - 18, r.y - 1.5, 4, 2.4).fill(0xfbf8f1);
    const sign = iso(x + 2.6, y + 0.6);
    g.rect(sign.x - 1.2, sign.y - 22, 2.4, 22).fill(PAL.wood);
    g.poly([sign.x - 12, sign.y - 22, sign.x + 8, sign.y - 22, sign.x + 13, sign.y - 18, sign.x + 8, sign.y - 14, sign.x - 12, sign.y - 14]).fill(0x8b5a2b).stroke(OUTLINE);
    const walkers = new Graphics();
    this.anim.addChild(walkers);
    this.animate = (time) => {
      walkers.clear();
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.12 + i / 3) % 1;
        const p = iso(x + 0.9 + f * 2.1, y + 1.5 + Math.sin(f * 9) * 0.1);
        const step = Math.sin(time * 8 + i) * 1.2;
        walkers.rect(p.x - 1.5 + step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.rect(p.x + 0.2 - step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.poly([p.x - 4, p.y - 14, p.x + 4, p.y - 14, p.x + 5, p.y - 7, p.x - 5, p.y - 7]).fill([0x6d4c41, 0x37474f, 0x8d6e63][i]);
        walkers.circle(p.x, p.y - 16, 2.2).fill(0xe0ac7e);
        walkers.ellipse(p.x, p.y - 17.5, 4, 1.2).fill(0x3e2723);
      }
    };
  },

  // --- Llanos · La Palma (v3.31): extraction plant with zinc-roofed halls ---

  // Fruit thresher: zinc shed with spinning drum stripping palm fruit from bunches beside
  // fresh bunch pile and empty bunch waste pile.
  bunch_thresher(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.5;
    const H = 26 + ctx.up;
    // Red fruit bunch pile and empty stalk pile.
    for (const [bx, by, col] of [[0.55, 2.3, PRODUCTS.palm_bunch.color], [0.95, 2.45, PRODUCTS.palm_bunch.color], [2.35, 2.3, 0x8d6e4a]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 4, 8, 5.5).fill(col).stroke(OUTLINE);
      for (let k = 0; k < 4; k++) g.circle(p.x - 4 + k * 2.6, p.y - 6 - (k % 2) * 2, 1.6).fill(col === 0x8d6e4a ? 0x6d5236 : 0xe65100);
    }
    box(g, x0 + 0.3, y0 + 0.4, 1.8, 0.7, 6, 0x6d6d6d);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x8a8f94);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const drum = new Graphics();
    this.anim.addChild(drum);
    this.animate = (time) => {
      drum.clear();
      const a = iso(x0 + 0.5, y0 + 0.75, 13);
      const b = iso(x0 + 1.9, y0 + 0.75, 13);
      drum.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 14, color: 0x78909c, cap: 'round' });
      const turn = this.working ? time * 4 : 0;
      for (let k = 0; k < 5; k++) {
        const f = (k / 5 + (turn / (Math.PI * 2)) * 0.2) % 1;
        drum.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f - 6).lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + 6).stroke({ width: 1.4, color: 0x546e7a });
      }
      if (!this.working) return;
      for (let i = 0; i < 5; i++) {
        const f = (time * 1.4 + i / 5) % 1;
        drum.circle(a.x + (b.x - a.x) * (0.2 + i * 0.15), a.y + 6 + f * 10, 1.8).fill(PRODUCTS.palm_fruit.color);
      }
    };
    this.animate(0);
  },

  // Sterilizer: horizontal steel autoclave cylinder with rail cart of fruit and escaping steam.
  // escaping steam.
  fruit_sterilizer(g, x, y, ctx) {
    const a = iso(x + 0.45, y + 1.0, 14);
    const b = iso(x + 2.3, y + 1.0, 14);
    for (const f of [0.15, 0.85]) {
      const p = iso(x + 0.45 + 1.85 * f, y + 1.0);
      g.rect(p.x - 2, p.y - 8, 4, 8).fill(0x5d6a72);
    }
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 22, color: 0x90a4ae, cap: 'round' });
    g.moveTo(a.x, a.y - 6).lineTo(b.x, b.y - 6).stroke({ width: 4, color: 0xcfd8dc, cap: 'round' });
    g.circle(b.x + 4, b.y + 2, 10).fill(0xb0bec5).stroke(OUTLINE);
    g.circle(b.x + 4, b.y + 2, 6).stroke({ width: 1.5, color: 0x607d8b });
    // Tracks leading into autoclave mouth.
    const r0 = iso(x + 2.4, y + 1.6);
    const r1 = iso(x + 2.9, y + 2.9);
    g.moveTo(r0.x, r0.y).lineTo(r1.x, r1.y).stroke({ width: 1.5, color: 0x5d4037 }).moveTo(r0.x + 8, r0.y).lineTo(r1.x + 8, r1.y).stroke({ width: 1.5, color: 0x5d4037 });
    this.smokePoints = [iso(x + 1.4, y + 1.0, 26)];
    this.roofTop = iso(x + 1.4, y + 1.0, 30);
    const cart = new Graphics();
    this.anim.addChild(cart);
    this.animate = (time) => {
      cart.clear();
      const f = this.working ? (Math.sin(time * 0.6) + 1) / 2 : 0.5;
      const p = iso(x + 2.45 + f * 0.35, y + 1.85 + f * 0.9);
      cart.poly([p.x - 9, p.y - 10, p.x + 9, p.y - 10, p.x + 7, p.y - 2, p.x - 7, p.y - 2]).fill(0x78909c).stroke(OUTLINE);
      for (let k = 0; k < 4; k++) cart.circle(p.x - 6 + k * 4, p.y - 11 - (k % 2) * 1.5, 2.4).fill(PRODUCTS.cooked_fruit.color);
      cart.circle(p.x - 5, p.y - 1, 1.8).fill(0x37474f);
      cart.circle(p.x + 5, p.y - 1, 1.8).fill(0x37474f);
    };
    this.animate(0);
  },

  // Oil press: zinc hall with screw press draining crimson crude palm oil down trough to drums.
  // drums.
  palm_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x8d6e4a);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, 0xffe0b2);
    // Oil trough and crude oil drums.
    const c0 = iso(x + 1.6, y + 2.2, 4);
    const c1 = iso(x + 2.4, y + 2.2, 2);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 4, color: 0x8a8f94 });
    for (const [bx, by] of [[2.65, 2.05], [2.65, 2.55], [0.6, 2.4]].slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + bx, y + by);
      g.rect(p.x - 5, p.y - 12, 10, 12).fill(PRODUCTS.crude_oil.color).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 12, 5, 2).fill(0x5d2a0a).stroke(OUTLINE);
      g.moveTo(p.x - 5, p.y - 6).lineTo(p.x + 5, p.y - 6).stroke({ width: 1, color: 0x5d2a0a });
    }
    box(g, x + 1.1, y + 2.0, 0.5, 0.4, 10, 0x607d8b);
    const flow = new Graphics();
    this.anim.addChild(flow);
    this.animate = (time) => {
      flow.clear();
      const s = iso(x + 1.35, y + 2.2, 18);
      const turn = this.working ? time * 3 : 0;
      flow.moveTo(s.x, s.y).lineTo(s.x, s.y - 10).stroke({ width: 2, color: 0x37474f });
      flow.ellipse(s.x, s.y - 10, 6, 2).fill(0x546e7a);
      flow.moveTo(s.x + Math.cos(turn) * 6, s.y - 10 + Math.sin(turn) * 2).lineTo(s.x - Math.cos(turn) * 6, s.y - 10 - Math.sin(turn) * 2).stroke({ width: 1.5, color: 0x263238 });
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.8 + i / 4) % 1;
        flow.circle(c0.x + (c1.x - c0.x) * f, c0.y + (c1.y - c0.y) * f - 1, 1.6).fill(PRODUCTS.crude_oil.color);
      }
    };
    this.animate(0);
  },

  // Clarifier: settling tanks with sight glass showing golden-orange oil rising.
  oil_clarifier(g, x, y, ctx) {
    const tanks = ctx.tier >= 2 ? [[0.6, 0.7], [1.5, 0.7], [2.4, 0.7], [1.0, 1.8], [1.9, 1.8]] : [[0.7, 0.8], [1.7, 0.8], [1.2, 1.9]];
    this.tanks = [];
    for (const [tx, ty] of tanks) {
      const base = iso(x + tx, y + ty);
      const h = 30 + ctx.up / 2;
      shadow(g, base.x + 3, base.y + 1, 13, 5);
      g.rect(base.x - 10, base.y - h, 20, h).fill(0xb0bec5).stroke(OUTLINE);
      g.rect(base.x - 7, base.y - h, 4, h).fill(0xcfd8dc);
      g.ellipse(base.x, base.y - h, 10, 4).fill(0xcfd8dc).stroke(OUTLINE);
      g.rect(base.x + 2, base.y - h + 6, 5, h - 10).fill(0x37474f);
      this.tanks.push({ x: base.x + 4.5, y: base.y - 4, h: h - 10 });
    }
    const pipe0 = iso(x + tanks[0][0], y + tanks[0][1], 8);
    const pipe1 = iso(x + tanks[1][0], y + tanks[1][1], 8);
    g.moveTo(pipe0.x, pipe0.y).lineTo(pipe1.x, pipe1.y).stroke({ width: 3, color: 0x8a8f94 });
    this.roofTop = iso(x + 1.5, y + 1.2, 38);
    const level = new Graphics();
    this.anim.addChild(level);
    this.animate = (time) => {
      level.clear();
      for (const [k, t] of this.tanks.entries()) {
        const f = this.working ? 0.55 + Math.sin(time * 0.8 + k) * 0.25 : 0.6;
        level.rect(t.x - 2, t.y - t.h * f, 4, t.h * f).fill(PRODUCTS.palm_oil.color);
      }
    };
    this.animate(0);
  },

  // Bottling hall: hall with conveyor filling and capping oil bottles.
  oil_bottler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.6, 28, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.6, 0.7, 16, 0xd7263d);
    windowOnRight(this, g, hx, hy, 1.9, 0.8, 14, 0xffe0b2);
    box(g, x + 0.4, y + 2.15, 1.9, 0.35, 8, 0x555555);
    const tap = iso(x + 1.0, y + 2.32, 22);
    g.rect(tap.x - 3, tap.y - 6, 6, 8).fill(0x8a8f94).stroke(OUTLINE);
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.7, y + 2.32, 8);
        const full = f > 0.3;
        belt.roundRect(p.x - 2.5, p.y - 11, 5, 11, 1.5).fill(full ? PRODUCTS.oil_bottle.color : 0xffe0b2).stroke(OUTLINE);
        belt.rect(p.x - 1.5, p.y - 13, 3, 2.5).fill(f > 0.45 ? 0xd7263d : 0xffffff);
      }
      if (!this.working) return;
      const f = (time * 2) % 1;
      belt.moveTo(tap.x, tap.y + 2).lineTo(tap.x, tap.y + 6 + f * 3).stroke({ width: 1.2, color: PRODUCTS.palm_oil.color });
    };
  },

  // Oil depot: warehouse with stacked oil cartons in yard (more stacks at milestones).
  oil_boxer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.6, 20, 0x8d6e4a);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 15, 0xffffff);
    const stack = (bx, by, rows) => {
      for (let r = 0; r < rows; r++) for (let k = 0; k < rows - r; k++) box(g, x + bx + k * 0.3 + r * 0.15, y + by, 0.26, 0.26, 7, PRODUCTS.oil_box.color, { z: r * 7 });
    };
    stack(0.35, 2.3, 3);
    if (ctx.tier >= 2) stack(1.5, 2.35, 2);
    const carrier = new Graphics();
    this.anim.addChild(carrier);
    this.animate = (time) => {
      carrier.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 1.4 + k * 1.1, y + 2.1);
      worker(carrier, p.x, p.y, 0x2e7d32);
      if (!back) carrier.rect(p.x - 6, p.y - 30, 12, 9).fill(PRODUCTS.oil_box.color).stroke(OUTLINE);
    };
  },

  // --- Llanos · El Frutal (v3.32): white bahareque houses with zinc roofs ---

  // Passionfruit pulper: shed with fruit-halving machine ejecting rinds beside fruit baskets.
  // waiting baskets.
  passion_pulper(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    for (const [bx, by] of [[0.5, 2.2], [0.9, 2.4], [2.3, 2.2]]) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 7, p.y - 8, p.x + 7, p.y - 8, p.x + 5, p.y, p.x - 5, p.y]).fill(0xb08850).stroke(OUTLINE);
      for (const dx of [-4, 0, 4]) g.circle(p.x + dx, p.y - 9, 2.4).fill(PRODUCTS.passion_fruit.color).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
    }
    box(g, x0 + 0.7, y0 + 0.4, 0.9, 0.6, 12, 0xb0bec5);
    const peel = iso(x0 + 1.9, y0 + 1.1);
    g.ellipse(peel.x, peel.y - 2, 8, 3).fill(0x9e8a3a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const top = iso(x0 + 1.15, y0 + 0.7, 12);
      work.ellipse(top.x, top.y, 8, 3.5).fill(0x90a4ae).stroke(OUTLINE);
      const a = this.working ? time * 7 : 0;
      for (let k = 0; k < 3; k++) work.moveTo(top.x, top.y).lineTo(top.x + Math.cos(a + k * 2.1) * 7, top.y + Math.sin(a + k * 2.1) * 3).stroke({ width: 1.2, color: 0x546e7a });
      if (!this.working) return;
      const f = (time * 1.5) % 1;
      work.circle(top.x - 18 + f * 18, top.y - 6 - Math.sin(f * Math.PI) * 6, 2.2).fill(PRODUCTS.passion_fruit.color);
      work.circle(top.x + 4 + f * 10, top.y + 6 + f * 6, 1.4).fill(PRODUCTS.passion_pulp.color);
    };
    this.animate(0);
  },

  // Pulp pasteurizer: house with steaming stainless steel jacketed kettle.
  pulp_pasteurizer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.5, 26, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x43a047);
    windowOnRight(this, g, hx, hy, 1.8, 0.75, 13, 0xfff8e1);
    const k = iso(x + 2.45, y + 1.4);
    g.rect(k.x - 11, k.y - 16, 22, 16).fill(0xc7ccd1).stroke(OUTLINE);
    g.ellipse(k.x, k.y - 16, 11, 4.5).fill(PRODUCTS.past_pulp.color).stroke(OUTLINE);
    g.rect(k.x - 3, k.y - 5, 6, 5).fill(0x37474f);
    // Pulp bags packed in foam cooler.
    box(g, x + 2.0, y + 2.3, 0.6, 0.4, 7, 0xffffff);
    this.smokePoints = [iso(x + 2.45, y + 1.4, 20)];
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      if (!this.working) return;
      for (let i = 0; i < 3; i++) fire.circle(k.x - 6 + i * 6 + Math.sin(time * 5 + i) * 1.2, k.y - 17 + Math.cos(time * 4 + i) * 1, 1.4).fill(0xfff3c4);
      fire.ellipse(k.x, k.y - 2, 5, 2).fill({ color: 0xff7043, alpha: 0.6 + Math.sin(time * 10) * 0.3 });
    };
    this.animate(0);
  },

  // Juice blender: stainless tanks swirling yellow juice beside pitcher-lined table.
  juice_mixer(g, x, y, ctx) {
    const tanks = ctx.tier >= 2 ? [[0.6, 0.6], [1.5, 0.6], [2.4, 0.6], [1.0, 1.6], [1.9, 1.6]] : [[0.7, 0.7], [1.7, 0.7], [1.2, 1.7]];
    this.tanks = [];
    for (const [tx, ty] of tanks) {
      const base = iso(x + tx, y + ty);
      const h = 26 + ctx.up / 2;
      shadow(g, base.x + 3, base.y + 1, 12, 5);
      g.rect(base.x - 9, base.y - h, 18, h).fill(0xc7ccd1).stroke(OUTLINE);
      g.rect(base.x - 6, base.y - h, 3, h).fill(0xe3e7ea);
      g.ellipse(base.x, base.y - h, 9, 3.6).fill(PRODUCTS.passion_juice.color).stroke(OUTLINE);
      this.tanks.push({ x: base.x, y: base.y - h });
    }
    box(g, x + 1.9, y + 2.4, 0.9, 0.35, 8, PAL.wood);
    for (let k = 0; k < 3; k++) {
      const p = iso(x + 2.05 + k * 0.28, y + 2.55, 8);
      g.rect(p.x - 2, p.y - 7, 4, 7).fill(PRODUCTS.passion_juice.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
    this.roofTop = iso(x + 1.5, y + 1.2, 34);
    const swirl = new Graphics();
    this.anim.addChild(swirl);
    this.animate = (time) => {
      swirl.clear();
      for (const [k, t] of this.tanks.entries()) {
        const a = this.working ? time * 3 + k : k;
        swirl.moveTo(t.x, t.y).lineTo(t.x + Math.cos(a) * 7, t.y + Math.sin(a) * 2.8).stroke({ width: 1.4, color: 0x8a6d1a });
        swirl.ellipse(t.x + Math.cos(a + 1.5) * 4, t.y + Math.sin(a + 1.5) * 1.6, 1.6, 0.8).fill(0xfff8e1);
      }
    };
    this.animate(0);
  },

  // Juice carton line: hall with green-carton conveyor beside stacked cases.
  juice_packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, 0x43a047);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0xfff8e1);
    box(g, x + 0.4, y + 2.15, 1.5, 0.35, 8, 0x555555);
    const stack = [[2.3, 2.2, 0], [2.65, 2.2, 0], [2.48, 2.2, 6], [2.48, 2.55, 0], [2.3, 2.55, 0]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 3))) box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 6, PRODUCTS.juice_box.color, { z });
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.4, y + 2.32, 8);
        belt.rect(p.x - 2.5, p.y - 8, 5, 8).fill(PRODUCTS.juice_box.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.7 });
        belt.circle(p.x, p.y - 4, 1.4).fill(PRODUCTS.passion_fruit.color);
      }
    };
  },

  // --- Llanos · La Cachamera (v3.33) ---

  // Cachama cleaning: shed with washing table, hose, and worker scaling fish.
  cachama_cleaner(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.3, y0 + 0.4, 1.8, 0.6, 9, 0xb0bec5);
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.55 + k * 0.42, y0 + 0.7, 9);
      fishOn(g, p.x, p.y - 2, 5, PRODUCTS.clean_cachama.color);
    }
    for (const [bx, by] of [[0.5, 2.3], [2.3, 2.25]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 4, 9, 4).fill(0x1e88e5).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 6, 7, 2.5).fill(0x90caf9);
      fishOn(g, p.x - 2, p.y - 7, 4, PRODUCTS.cachama.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.2, y0 + 1.2);
      worker(work, p.x, p.y, 0x1e88e5);
      work.rect(p.x - 4, p.y - 15, 8, 6).fill(0xffffff);
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 2 + i / 4) % 1;
        work.circle(p.x + 6 + f * 6, p.y - 12 + f * 4, 0.9).fill({ color: 0xe0f7fa, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Fish flaking kitchen: cottage with hearth and cauldron shredding and sautéing cachama.
  pisillo_kitchen(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 13 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x1e88e5);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, 0xfff8e1);
    box(g, x + 1.95, y + 2.0, 0.7, 0.5, 8, 0x9e9e9e);
    const pot = iso(x + 2.3, y + 2.25, 8);
    g.ellipse(pot.x, pot.y, 9, 4).fill(0x37474f).stroke(OUTLINE);
    this.smokePoints = [iso(x + 2.3, y + 2.25, 14)];
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      stir.ellipse(pot.x, pot.y, 7, 2.6).fill(PRODUCTS.pisillo.color);
      const a = this.working ? time * 3 : 0;
      stir.moveTo(pot.x + Math.cos(a) * 4, pot.y + Math.sin(a) * 1.5).lineTo(pot.x + Math.cos(a) * 6 + 4, pot.y - 12).stroke({ width: 1.6, color: 0x8d6e4a });
      if (!this.working) return;
      stir.ellipse(pot.x, pot.y + 5, 6, 2).fill({ color: 0xff7043, alpha: 0.5 + Math.sin(time * 9) * 0.3 });
    };
    this.animate(0);
  },

  // Cachama filleter: shed with long filleting table.
  cachama_filleter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.3, y0 + 0.4, 1.7, 0.6, 9, PAL.wood);
    for (let k = 0; k < 3; k++) {
      const p = iso(x0 + 0.6 + k * 0.5, y0 + 0.7, 9);
      g.ellipse(p.x, p.y - 2, 5, 2.2).fill(PRODUCTS.cachama_fillet.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.0, y0 + 1.2);
      worker(work, p.x, p.y, 0xf4c430);
      const a = this.working ? Math.sin(time * 8) * 3 : 0;
      work.moveTo(p.x + 3, p.y - 13).lineTo(p.x + 9, p.y - 15 + a).stroke({ width: 1.6, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Smokehouse: bahareque smokehouse hung with fish and smoke rising through roof.
  cachama_smoker(g, x, y, ctx) {
    const hx = x + 0.4;
    const hy = y + 0.4;
    house(this, g, hx, hy, 1.6, 1.3, 22, ctx, { wall: 0xc9a77a, plinth: false, roofColor: 0x8d6e4a, roofH: 12 });
    door(g, hx, hy, 1.3, 0.6, 14, 0x5d4037);
    // Outdoor airing rack of fish beside smokehouse.
    const a = iso(x + 2.3, y + 0.6, 18);
    const b = iso(x + 2.3, y + 2.2, 18);
    for (const p of [a, b]) g.rect(p.x - 1, p.y, 2, 18).fill(PAL.woodDark);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: PAL.woodDark });
    for (let k = 1; k < 4; k++) {
      const p = { x: a.x + (b.x - a.x) * k / 4, y: a.y + (b.y - a.y) * k / 4 };
      g.ellipse(p.x, p.y + 7, 2.6, 6).fill(PRODUCTS.smoked_cachama.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    this.smokePoints = [iso(hx + 0.8, hy + 0.65, 34 + ctx.up), iso(hx + 0.4, hy + 0.65, 34 + ctx.up)];
  },

  // Cachama kitchen: wood grill roasting cachama alongside passionfruit-sauce pot fed by
  // juice jugs from El Frutal.
  cachama_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 13 });
    door(g, hx, hy, 1.5, 0.7, 18, 0xf4c430);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0xfff8e1);
    box(g, x + 0.5, y + 2.05, 1.2, 0.45, 7, 0x6d4c32);
    for (let k = 0; k < 3; k++) {
      const p = iso(x + 0.7 + k * 0.38, y + 2.27, 7);
      fishOn(g, p.x, p.y - 2, 4.5, PRODUCTS.smoked_cachama.color);
    }
    const pot = iso(x + 2.4, y + 2.3, 6);
    box(g, x + 2.15, y + 2.1, 0.5, 0.4, 6, 0x9e9e9e);
    g.ellipse(pot.x, pot.y - 2, 7, 3).fill(PRODUCTS.cachama_maracuya.color).stroke(OUTLINE);
    for (const [bx, by] of [[2.65, 1.35], [2.65, 1.7]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 3.5, p.y - 11, 7, 11, 2).fill(PRODUCTS.passion_juice.color).stroke(OUTLINE);
    }
    this.smokePoints = [iso(x + 1.1, y + 2.27, 12)];
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      if (!this.working) return;
      for (let i = 0; i < 4; i++) fire.circle(iso(x + 0.7 + i * 0.3, y + 2.27, 3).x, iso(x + 0.7 + i * 0.3, y + 2.27, 3).y, 1.6 + Math.sin(time * 9 + i)).fill({ color: 0xff7043, alpha: 0.8 });
    };
    this.animate(0);
  },

  // --- Llanos · El Hato llanero (v3.34): palm-thatched caneyes and zinc houses ---

  // Butchery: white zinc house beside open shed hung with beef cuts.
  llanero_butcher(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.7, 1.4, 26, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.4, 0.7, 16, 0x8e3b1f);
    windowOnRight(this, g, hx, hy, 1.7, 0.7, 13, 0xffffff);
    const a = iso(x + 2.3, y + 0.5, 22);
    const b = iso(x + 2.3, y + 2.4, 22);
    for (const p of [a, b]) g.rect(p.x - 1, p.y, 2, 22).fill(PAL.woodDark);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: PAL.woodDark });
    for (let k = 1; k < 4 + Math.min(ctx.tier, 2); k++) {
      const f = k / (5 + Math.min(ctx.tier, 2));
      const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      g.moveTo(p.x, p.y).lineTo(p.x, p.y + 3).stroke({ width: 1, color: 0x9aa3a8 });
      g.ellipse(p.x, p.y + 9, 3.4, 6.5).fill(PRODUCTS.ternera.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x - 1, p.y + 7, 1.2, 3).fill(0xf8bbd0);
    }
  },

  // Curing shed: shed with wooden salting troughs rubbing coarse salt into meat, salt sacks.
  adobadero(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 23 + ctx.up;
    for (const by of [0.35, 0.85]) {
      box(g, x0 + 0.3, y0 + by, 1.7, 0.35, 6, PAL.wood);
      for (let k = 0; k < 4; k++) {
        const p = iso(x0 + 0.5 + k * 0.42, y0 + by + 0.17, 6);
        g.ellipse(p.x, p.y - 1, 4, 1.8).fill(PRODUCTS.ternera_adobada.color);
        g.circle(p.x - 1, p.y - 2, 0.7).fill(0xffffff);
        g.circle(p.x + 1.5, p.y - 1, 0.7).fill(0xffffff);
      }
    }
    for (const [bx, by] of [[0.5, 2.3], [0.85, 2.45]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 4, 7, 5).fill(0xf4f1e8).stroke(OUTLINE);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.2, y0 + 1.35);
      worker(work, p.x, p.y, 0xeceae4);
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.5 + i / 4) % 1;
        work.circle(p.x + 5 + i * 2, p.y - 16 + f * 8, 0.8).fill({ color: 0xffffff, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Stake roast: open ground fire ringed by skewered mamona veal stakes tended by griller.
  vara_grill(g, x, y, ctx) {
    const c = iso(x + 1.5, y + 1.5);
    g.ellipse(c.x, c.y, 26, 12).fill(0x5d4632).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
    g.ellipse(c.x, c.y, 16, 7).fill(0x3a2a1e);
    // Log benches.
    for (const [bx, by] of [[0.5, 2.5], [2.6, 0.6]]) box(g, x + bx, y + by, 0.6, 0.18, 4, PAL.woodDark);
    this.stakes = [];
    const n = 5 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const p = { x: c.x + Math.cos(a) * 22, y: c.y + Math.sin(a) * 10 };
      this.stakes.push(p);
      g.moveTo(p.x, p.y).lineTo(p.x - Math.cos(a) * 6, p.y - 30).stroke({ width: 2, color: 0x6d4c32 });
      g.ellipse(p.x - Math.cos(a) * 4, p.y - 20, 4.5, 6).fill(PRODUCTS.mamona.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
    this.roofTop = iso(x + 1.5, y + 1.5, 36);
    this.smokePoints = [iso(x + 1.5, y + 1.5, 10)];
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      const h = this.working ? 10 + Math.sin(time * 9) * 3 : 4;
      fire.poly([c.x - 10, c.y, c.x - 4, c.y - h, c.x, c.y - 3, c.x + 4, c.y - h * 1.2, c.x + 10, c.y]).fill(0xff7043);
      fire.poly([c.x - 5, c.y, c.x, c.y - h * 0.7, c.x + 5, c.y]).fill(0xffd54f);
      const p = iso(x + 2.4, y + 2.3);
      worker(fire, p.x, p.y, 0xd7263d);
      fire.ellipse(p.x, p.y - 22.5, 7, 1.8).fill(0x3a2a1e);
    };
    this.animate(0);
  },

  // Carving pavilion: palm-thatched caney with large table and carver slicing llanero style.
  carving_table(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 1.6;
    const H = 22 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.5, 1.4, 0.6, 8, PAL.wood);
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.6 + k * 0.3, y0 + 0.8, 8);
      g.rect(p.x - 2, p.y - 4, 4, 4).fill(PRODUCTS.carne_llanera.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x8d6e4a);
    gableRoof(g, x0, y0, w, d, H, 16, 0xc9a35a, 0xd9c08c);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 16);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 1.1, y0 + 1.4);
      worker(work, p.x, p.y, 0xf4c430);
      work.ellipse(p.x, p.y - 22.5, 7, 1.8).fill(0x3a2a1e);
      const a = this.working ? Math.abs(Math.sin(time * 6)) * 4 : 0;
      work.moveTo(p.x + 3, p.y - 13).lineTo(p.x + 8, p.y - 16 + a).stroke({ width: 1.6, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Llanero feast table: grand caney with long table full of diners and cassava frying in
  // La Palma oil.
  lunch_llanero(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 1.6;
    const H = 22 + ctx.up;
    box(g, x0 + 0.3, y0 + 0.55, 1.9, 0.5, 8, PAL.wood);
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.5 + k * 0.45, y0 + 0.8, 8);
      g.ellipse(p.x, p.y - 1, 3.4, 1.6).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
      g.ellipse(p.x - 0.5, p.y - 1.4, 1.8, 0.9).fill(PRODUCTS.carne_llanera.color);
    }
    const pot = iso(x + 2.7, y + 2.4, 4);
    box(g, x + 2.45, y + 2.2, 0.5, 0.4, 4, 0x9e9e9e);
    g.ellipse(pot.x, pot.y - 2, 6, 2.6).fill(PRODUCTS.palm_oil.color).stroke(OUTLINE);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x8d6e4a);
    gableRoof(g, x0, y0, w, d, H, 16, 0xc9a35a, 0xd9c08c);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 16);
    const people = new Graphics();
    this.anim.addChild(people);
    this.animate = (time) => {
      people.clear();
      const shirts = [0xd7263d, 0x2e6fd1, 0xf4c430];
      for (let k = 0; k < Math.min(2 + ctx.tier, 3); k++) {
        const p = iso(x0 + 0.6 + k * 0.6, y0 + 1.35);
        const bob = this.working ? Math.max(0, Math.sin(time * 3 + k * 2)) * 1.5 : 0;
        worker(people, p.x, p.y + bob, shirts[k]);
        people.ellipse(p.x, p.y - 22.5 + bob, 7, 1.8).fill(0x3a2a1e);
      }
    };
    this.animate(0);
  },

  // Parranda roast: huge feast roast with beef and cachama stakes, harpist playing, and
  // baila joropo zapateando.
  parranda_grill(g, x, y, ctx) {
    const c = iso(x + 1.1, y + 1.2);
    g.ellipse(c.x, c.y, 18, 8).fill(0x3a2a1e);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const p = { x: c.x + Math.cos(a) * 16, y: c.y + Math.sin(a) * 7 };
      g.moveTo(p.x, p.y).lineTo(p.x - Math.cos(a) * 4, p.y - 26).stroke({ width: 2, color: 0x6d4c32 });
      if (k % 2) g.ellipse(p.x - Math.cos(a) * 3, p.y - 18, 4, 5).fill(PRODUCTS.mamona.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      else fishOn(g, p.x - Math.cos(a) * 3, p.y - 18, 4, PRODUCTS.smoked_cachama.color);
    }
    // Harp.
    const h = iso(x + 2.5, y + 0.7);
    g.moveTo(h.x - 6, h.y).lineTo(h.x - 6, h.y - 30).quadraticCurveTo(h.x + 2, h.y - 34, h.x + 8, h.y - 22).lineTo(h.x + 7, h.y).closePath().fill(0xa1785a).stroke(OUTLINE);
    for (let k = 0; k < 5; k++) g.moveTo(h.x - 4 + k * 2.4, h.y - 28 + k * 1.2).lineTo(h.x - 4 + k * 2.4, h.y - 2).stroke({ width: 0.6, color: 0xfff8e1 });
    this.roofTop = iso(x + 1.5, y + 1.5, 34);
    this.smokePoints = [iso(x + 1.1, y + 1.2, 8)];
    const fiesta = new Graphics();
    this.anim.addChild(fiesta);
    this.animate = (time) => {
      fiesta.clear();
      const fh = this.working ? 8 + Math.sin(time * 9) * 2.5 : 3;
      fiesta.poly([c.x - 8, c.y, c.x - 3, c.y - fh, c.x, c.y - 2, c.x + 3, c.y - fh * 1.2, c.x + 8, c.y]).fill(0xff7043);
      const harpist = iso(x + 2.85, y + 0.9);
      worker(fiesta, harpist.x, harpist.y, 0xffffff);
      fiesta.ellipse(harpist.x, harpist.y - 22.5, 7, 1.8).fill(0x3a2a1e);
      // Joropo dancing couple: stomping and spinning.
      for (const [k, [bx, by, shirt]] of [[1.9, 2.5, 0xd7263d], [2.4, 2.6, 0xf4c430]].entries()) {
        const p = iso(x + bx, y + by);
        const step = this.working ? Math.abs(Math.sin(time * 8 + k * Math.PI)) * 3 : 0;
        const sway = this.working ? Math.sin(time * 2 + k) * 2 : 0;
        worker(fiesta, p.x + sway, p.y - step, shirt);
        if (k === 1) fiesta.poly([p.x + sway - 5, p.y - step - 9, p.x + sway + 5, p.y - step - 9, p.x + sway + 8, p.y - step, p.x + sway - 8, p.y - step]).fill(0xf06292);
        else fiesta.ellipse(p.x + sway, p.y - step - 22.5, 7, 1.8).fill(0x3a2a1e);
      }
    };
    this.animate(0);
  },

  // --- Llanos · La Talabartería (v3.35) ---

  // Tannery: tanning vats steeped in bark liquor and hanging hides dripping dry.
  tannery(g, x, y, ctx) {
    for (const [px, py] of [[0.4, 0.4], [1.5, 0.4], [0.4, 1.4]]) {
      box(g, x + px, y + py, 0.9, 0.8, 5, 0x9e9e9e);
      g.poly(isoPoly([[x + px + 0.08, y + py + 0.08, 5], [x + px + 0.82, y + py + 0.08, 5], [x + px + 0.82, y + py + 0.72, 5], [x + px + 0.08, y + py + 0.72, 5]])).fill(0x6d4c1f);
    }
    const a = iso(x + 2.6, y + 1.2, 22);
    const b = iso(x + 2.6, y + 2.6, 22);
    for (const p of [a, b]) g.rect(p.x - 1, p.y, 2, 22).fill(PAL.woodDark);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: PAL.woodDark });
    for (let k = 1; k < 4; k++) {
      const p = { x: a.x + (b.x - a.x) * k / 4, y: a.y + (b.y - a.y) * k / 4 };
      g.poly([p.x - 4, p.y, p.x + 4, p.y, p.x + 5, p.y + 14, p.x - 5, p.y + 14]).fill(PRODUCTS.tanned_leather.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
    this.roofTop = iso(x + 1.4, y + 1.2, 30);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x + 1.5, y + 1.9);
      worker(work, p.x, p.y, 0x8d5524);
      const a2 = this.working ? Math.sin(time * 3) * 4 : 0;
      work.moveTo(p.x - 3, p.y - 14).lineTo(p.x - 12 + a2, p.y - 4).stroke({ width: 1.6, color: 0x8d6e4a });
      if (!this.working) return;
      const q = iso(x + 0.85, y + 0.8, 5);
      for (let i = 0; i < 3; i++) work.circle(q.x - 6 + i * 6 + Math.sin(time * 4 + i) * 2, q.y + Math.cos(time * 3 + i), 1).fill({ color: 0xd9b98a, alpha: 0.8 });
    };
    this.animate(0);
  },

  // Leather cutter: shed with broad cutting bench, stretched hide, and die-cut pieces.
  leather_cutter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 23 + ctx.up;
    box(g, x0 + 0.3, y0 + 0.35, 1.8, 0.75, 8, PAL.wood);
    g.poly(isoPoly([[x0 + 0.45, y0 + 0.45, 8], [x0 + 1.4, y0 + 0.45, 8], [x0 + 1.4, y0 + 1.0, 8], [x0 + 0.45, y0 + 1.0, 8]])).fill(PRODUCTS.tanned_leather.color);
    for (let k = 0; k < 3; k++) box(g, x0 + 1.5 + (k % 2) * 0.25, y0 + 0.45 + k * 0.18, 0.22, 0.14, 1.5, PRODUCTS.leather_pieces.color, { z: 8 });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 11, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 11);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const p = iso(x0 + 0.9, y0 + 1.4);
      worker(work, p.x, p.y, 0x2e6fd1);
      const a = this.working ? Math.abs(Math.sin(time * 5)) * 3 : 0;
      work.moveTo(p.x + 3, p.y - 13).lineTo(p.x + 8, p.y - 16 + a).stroke({ width: 1.6, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Leather tooling: artisan cottage porch workbench where craftsman stamps patterns with mallet.
  leather_tooler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.4, 25, ctx, { wall: 0xf7f4ee, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.4, 0.7, 15, 0x6d3b1f);
    windowOnRight(this, g, hx, hy, 1.8, 0.7, 13, 0xfff8e1);
    box(g, x + 2.2, y + 1.9, 0.6, 0.4, 7, PAL.wood);
    const p = iso(x + 2.5, y + 2.1, 7);
    g.rect(p.x - 4, p.y - 2, 8, 3).fill(PRODUCTS.tooled_leather.color);
    const work = new Graphics();
    this.anim.addChild(work);
    this.animate = (time) => {
      work.clear();
      const q = iso(x + 2.5, y + 2.55);
      worker(work, q.x, q.y, 0xf4c430);
      const up = this.working ? Math.abs(Math.sin(time * 9)) * 4 : 0;
      work.rect(q.x + 3, q.y - 22 - up, 2, 7).fill(0x8a8f94);
    };
    this.animate(0);
  },

  // Saddle workshop: saddler's house with finished saddles perched on outdoor wooden horses.
  saddler(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 27, ctx, { wall: 0xe8d9b8, roofColor: PAL.roof, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 17, 0x6d3b1f);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0xfff8e1);
    for (const [bx, by] of [[2.4, 1.0], [2.4, 1.7], [2.4, 2.4]].slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + bx, y + by);
      g.rect(p.x - 6, p.y - 10, 2, 10).fill(PAL.woodDark);
      g.rect(p.x + 4, p.y - 10, 2, 10).fill(PAL.woodDark);
      g.moveTo(p.x - 8, p.y - 11).quadraticCurveTo(p.x - 2, p.y - 16, p.x + 2, p.y - 13).quadraticCurveTo(p.x + 6, p.y - 22, p.x + 8, p.y - 18).lineTo(p.x + 8, p.y - 10).lineTo(p.x - 8, p.y - 10).closePath().fill(PRODUCTS.silla_montar.color).stroke(OUTLINE);
      g.moveTo(p.x, p.y - 10).lineTo(p.x, p.y - 4).stroke({ width: 1, color: 0x3a2418 });
      g.rect(p.x - 2, p.y - 4, 4, 2).fill(0xb0bec5);
    }
  },

  // Llanero outfitter: roadside shop hung with saddles, hats, and espadrilles, plus pisillo
  // and smoked cachama on counter.
  tienda_llanera(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xf7f4ee, roofColor: PAL.roof, roofH: 14 });
    door(g, hx, hy, 1.5, 1.6, 18, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, 0xfff8e1);
    // Overhang displaying hung wares.
    for (let k = 0; k < 4; k++) {
      const p = iso(hx + 0.3 + k * 0.5, hy + 1.5, 20);
      if (k % 2) {
        g.ellipse(p.x, p.y + 4, 6, 1.8).fill(0x3e2a1a);
        g.roundRect(p.x - 3, p.y - 1, 6, 5, 2).fill(0x5d4037);
      } else {
        g.rect(p.x - 2, p.y, 4, 8).fill(PRODUCTS.leather_pieces.color);
      }
    }
    box(g, x + 0.5, y + 2.1, 1.2, 0.4, 8, PAL.wood);
    const p1 = iso(x + 0.8, y + 2.3, 8);
    g.ellipse(p1.x, p1.y - 1, 4, 1.6).fill(PRODUCTS.pisillo.color);
    const p2 = iso(x + 1.35, y + 2.3, 8);
    fishOn(g, p2.x, p2.y - 2, 4, PRODUCTS.smoked_cachama.color);
    const p3 = iso(x + 2.6, y + 2.3);
    g.moveTo(p3.x - 8, p3.y - 11).quadraticCurveTo(p3.x - 2, p3.y - 16, p3.x + 2, p3.y - 13).quadraticCurveTo(p3.x + 6, p3.y - 22, p3.x + 8, p3.y - 18).lineTo(p3.x + 8, p3.y - 8).lineTo(p3.x - 8, p3.y - 8).closePath().fill(PRODUCTS.silla_montar.color).stroke(OUTLINE);
  },

  // --- Llanos · Villavicencio (v3.36): colorful houses, palm kiosks, Caño Cristales trailhead ---

  // Park kiosk: round palm-thatched kiosk with tables serving juice and empanadas.
  kiosco_parque(g, x, y, ctx) {
    const c = iso(x + 1.3, y + 1.1);
    shadow(g, c.x + 4, c.y + 3, 34, 14);
    g.ellipse(c.x, c.y, 30, 13).fill(0xd9c4a0).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.rect(c.x + Math.cos(a) * 22 - 1, c.y + Math.sin(a) * 9 - 26, 2, 26).fill(0x6d4c32);
    }
    g.poly([c.x - 34, c.y - 24, c.x, c.y - 48, c.x + 34, c.y - 24, c.x, c.y - 12]).fill(0xc9a35a).stroke(OUTLINE);
    g.poly([c.x - 34, c.y - 24, c.x, c.y - 12, c.x + 34, c.y - 24, c.x, c.y - 16]).fill(0xa8873e);
    for (const [dx, dy] of [[-10, 2], [10, 4]]) {
      g.ellipse(c.x + dx, c.y + dy - 8, 7, 3.4).fill(0xffffff).stroke(OUTLINE);
      g.rect(c.x + dx - 3, c.y + dy - 13, 2.4, 5).fill(PRODUCTS.passion_juice.color);
      g.ellipse(c.x + dx + 3, c.y + dy - 9, 2.4, 1.2).fill(PRODUCTS.empanadas.color);
    }
    this.roofTop = iso(x + 1.3, y + 1.1, 50);
    this.lights.push({ x: c.x, y: c.y - 20, r: 26 });
  },

  // Country hotel: long single-story tiled house with swimming pool and palms.
  hotel_campestre(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    house(this, g, hx, hy, 2.5, 1.2, 26, ctx, { wall: 0xfbf8f1, roofH: 13 });
    door(g, hx, hy, 1.2, 1.25, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 2.5, 0.6, 13, 0x2e6fd1);
    windowOnFront(this, g, hx, hy, 1.2, 0.5, 9, 0xfff3c4);
    windowOnFront(this, g, hx, hy, 1.2, 2.0, 9, 0xfff3c4);
    g.poly(isoPoly([[x + 0.6, y + 1.8], [x + 2.2, y + 1.8], [x + 2.2, y + 2.7], [x + 0.6, y + 2.7]])).fill(0xe0e0e0).stroke(OUTLINE);
    g.poly(isoPoly([[x + 0.7, y + 1.9], [x + 2.1, y + 1.9], [x + 2.1, y + 2.6], [x + 0.7, y + 2.6]])).fill(0x29b6f6);
    this.lights.push({ ...iso(x + 1.4, y + 2.25), r: 20, color: 0x81d4fa });
    const water = new Graphics();
    this.anim.addChild(water);
    this.animate = (time) => {
      water.clear();
      for (let i = 0; i < 3; i++) {
        const p = iso(x + 0.9 + i * 0.45, y + 2.0 + ((time * 0.2 + i * 0.3) % 0.55));
        water.moveTo(p.x - 5, p.y).lineTo(p.x + 5, p.y).stroke({ width: 1, color: 0xe1f5fe, alpha: 0.8 });
      }
    };
    this.animate(0);
  },

  // Market plaza: open zinc-roofed market hall with produce and fish stalls plus shoppers.
  plaza_mercado(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.25;
    const w = 2.5;
    const d = 2.0;
    const H = 24 + ctx.up;
    const stalls = [[0.3, 0.3, 'fruit'], [1.4, 0.3, 'fish'], [0.3, 1.2, 'fish'], [1.4, 1.2, 'fruit']].slice(0, 2 + Math.min(ctx.tier, 2));
    for (const [sx, sy, kind] of stalls) {
      box(g, x0 + sx, y0 + sy, 0.9, 0.45, 8, PAL.wood);
      for (let k = 0; k < 4; k++) {
        const p = iso(x0 + sx + 0.15 + k * 0.2, y0 + sy + 0.22, 8);
        if (kind === 'fish') fishOn(g, p.x, p.y - 2, 3.5, PRODUCTS.cachama.color);
        else g.circle(p.x, p.y - 2, 2.2).fill([0xf4c430, 0xe65100, 0x7cb342, 0xf4b400][k]);
      }
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x8a8f94);
    gableRoof(g, x0, y0, w, d, H, 12, 0x9aa3a8, 0xd9dde0);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const people = new Graphics();
    this.anim.addChild(people);
    this.animate = (time) => {
      people.clear();
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.08 + i * 0.5) % 1;
        const p = iso(x0 + 0.2 + f * 2.3, y0 + 0.95);
        worker(people, p.x, p.y, i ? 0xf4c430 : 0x2e6fd1);
        people.ellipse(p.x, p.y - 22.5, 7, 1.8).fill(0x3e2a1a);
      }
    };
    this.animate(0);
  },

  // Trip packs: colorful house with backpacks, hats, and thermoses packed on porch.
  morrales_viaje(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 27, ctx, { wall: 0xf28c9a, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0x2e6fd1);
    for (const [bx, by] of [[1.3, 2.35], [1.65, 2.5], [2.0, 2.35], [1.65, 2.2]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 6, p.y - 12, 12, 12, 3).fill(PRODUCTS.fiambre_viaje.color).stroke(OUTLINE);
      g.rect(p.x - 6, p.y - 9, 12, 3).fill(0x6d3b1f);
      g.ellipse(p.x, p.y - 13, 8, 2).fill(0x3e2a1a);
      g.roundRect(p.x - 3, p.y - 17, 6, 4, 2).fill(0x5d4037);
    }
  },

  // Caño Cristales trailhead: rainbow river (red, yellow, green) between boulders, signpost,
  // and hikers setting out with packs and hats.
  salida_cano(g, x, y, ctx) {
    const pts = [[0.3, 0.5], [0.9, 0.9], [1.5, 0.7], [2.1, 1.1], [2.7, 0.9]];
    for (let i = 1; i < pts.length; i++) {
      const a = iso(x + pts[i - 1][0], y + pts[i - 1][1]);
      const b = iso(x + pts[i][0], y + pts[i][1]);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 16, color: 0x4fc3f7, cap: 'round' });
    }
    for (const [k, [px, py]] of pts.entries()) {
      const p = iso(x + px, y + py);
      g.ellipse(p.x - 3, p.y, 5, 2.4).fill([0xd7263d, 0xf4c430, 0x2e7d32, 0xd7263d, 0xf4c430][k]);
      g.ellipse(p.x + 4, p.y + 1, 3, 1.6).fill([0x2e7d32, 0xd7263d, 0xf4c430, 0x2e7d32, 0xd7263d][k]);
    }
    for (const [px, py] of [[0.5, 1.3], [2.3, 0.4], [1.2, 0.2]]) {
      const p = iso(x + px, y + py);
      g.ellipse(p.x, p.y - 2, 7, 4).fill(0x8d8a80).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.4 });
    }
    for (let k = 0; k < 7; k++) {
      const p = iso(x + 0.6 + k * 0.32, y + 1.9);
      g.ellipse(p.x, p.y, 7, 3.5).fill(k % 2 ? 0xc9a77a : 0xd9c4a0).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.3 });
    }
    const sign = iso(x + 2.7, y + 1.7);
    g.rect(sign.x - 1.2, sign.y - 22, 2.4, 22).fill(PAL.wood);
    g.poly([sign.x - 12, sign.y - 22, sign.x + 8, sign.y - 22, sign.x + 13, sign.y - 18, sign.x + 8, sign.y - 14, sign.x - 12, sign.y - 14]).fill(0x8b5a2b).stroke(OUTLINE);
    this.roofTop = iso(x + 1.5, y + 1.2, 24);
    const walkers = new Graphics();
    this.anim.addChild(walkers);
    this.animate = (time) => {
      walkers.clear();
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.12 + i / 3) % 1;
        const p = iso(x + 0.6 + f * 2.1, y + 1.9);
        const step = Math.sin(time * 8 + i) * 1.2;
        walkers.rect(p.x - 1.5 + step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.rect(p.x + 0.2 - step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.roundRect(p.x - 3, p.y - 14, 6, 7, 2).fill([0xd7263d, 0x2e6fd1, 0xf4c430][i]);
        walkers.roundRect(p.x + 2, p.y - 13, 3, 5, 1).fill(PRODUCTS.fiambre_viaje.color);
        walkers.circle(p.x, p.y - 16, 2.2).fill(0xe0ac7e);
        walkers.ellipse(p.x, p.y - 17.5, 4.5, 1.2).fill(0x3e2a1a);
      }
    };
  },

  // --- Pacific Coast · El Platanal (v3.38): painted plank stilt houses with zinc roofs ---

  // Debunching shed: shed with overhead cableway; worker machetes hands off bunches into
  // water tub.
  plantain_dehander(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.35;
    const w = 2.3;
    const d = 1.5;
    const H = 30 + ctx.up;
    // Overhead banana cableway.
    const c0 = iso(x0 - 0.2, y0 + d / 2, H - 4);
    const c1 = iso(x0 + w + 0.2, y0 + d / 2, H - 4);
    // Water tub holding cut plantain hands.
    box(g, x0 + 1.2, y0 + 0.9, 1.0, 0.55, 7, 0x8d6e4a);
    const tub = iso(x0 + 1.7, y0 + 1.17, 7);
    g.ellipse(tub.x, tub.y, 13, 4).fill(0x4fa3c7);
    for (let k = 0; k < 3; k++) g.ellipse(tub.x - 6 + k * 6, tub.y - 1, 3.5, 1.8).fill(PRODUCTS.plantain_hand.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    // Bunches stacked on ground.
    for (const [bx, by] of [[0.45, 2.35], [0.9, 2.5]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 5, 7).fill(PRODUCTS.plantain_bunch.color).stroke(OUTLINE);
      for (let k = 0; k < 3; k++) g.moveTo(p.x - 4, p.y - 9 + k * 4).lineTo(p.x + 4, p.y - 9 + k * 4).stroke({ width: 0.8, color: 0x3f7a2a });
    }
    ramada(this, g, x0, y0, w, d, H);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 1.2, color: 0x37474f });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const hook = iso(x0 + 0.8, y0 + d / 2, H - 4);
      const sway = this.working ? Math.sin(time * 2) * 1.5 : 0;
      anim.moveTo(hook.x, hook.y).lineTo(hook.x + sway, hook.y + 6).stroke({ width: 1, color: 0x37474f });
      anim.ellipse(hook.x + sway, hook.y + 15, 6, 10).fill(PRODUCTS.plantain_bunch.color).stroke(OUTLINE);
      for (let k = 0; k < 3; k++) anim.moveTo(hook.x + sway - 5, hook.y + 10 + k * 5).lineTo(hook.x + sway + 5, hook.y + 10 + k * 5).stroke({ width: 0.8, color: 0x3f7a2a });
      anim.ellipse(hook.x + sway, hook.y + 27, 2.4, 3.4).fill(0x7b1f4b);
      const wp = iso(x0 + 1.3, y0 + 0.55);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      const swing = this.working ? Math.sin(time * 6) : 0;
      anim.moveTo(wp.x - 3, wp.y - 15).lineTo(wp.x - 8 - swing * 3, wp.y - 20 + swing * 4).stroke({ width: 1.6, color: 0xb0bec5 });
      if (!this.working) return;
      const f = (time * 1.2) % 1;
      anim.ellipse(hook.x + (tub.x - hook.x) * f, hook.y + 18 + (tub.y - hook.y - 18) * f - Math.sin(f * Math.PI) * 6, 3.4, 1.8).fill(PRODUCTS.plantain_hand.color);
    };
    this.animate(0);
  },

  // Washing tank: long concrete troughs under zinc roof washing sap off floating hands
  // into exit basket.
  plantain_washer(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const tanks = ctx.tier >= 2 ? [0.25, 1.0, 1.75] : [0.45, 1.3];
    this.tanks = [];
    for (const ty of tanks) {
      box(g, x0, y0 + ty, 2.4, 0.6, 9, 0xb0b0a8);
      const a = iso(x0 + 0.08, y0 + ty + 0.08, 9);
      const b = iso(x0 + 2.32, y0 + ty + 0.08, 9);
      const c = iso(x0 + 2.32, y0 + ty + 0.52, 9);
      const e = iso(x0 + 0.08, y0 + ty + 0.52, 9);
      g.poly([a.x, a.y, b.x, b.y, c.x, c.y, e.x, e.y]).fill(0x4fa3c7);
      this.tanks.push(ty);
    }
    for (const [px, py] of [[0, -0.1], [2.4, -0.1], [0, 2.1], [2.4, 2.1]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 30 + ctx.up, 0x6b4a2e);
    const crate = iso(x + 2.85, y + 2.55);
    g.poly([crate.x - 8, crate.y - 8, crate.x + 8, crate.y - 8, crate.x + 7, crate.y, crate.x - 7, crate.y]).fill(0x2e7d32).stroke(OUTLINE);
    for (let k = 0; k < 3; k++) g.ellipse(crate.x - 5 + k * 5, crate.y - 9, 3, 1.6).fill(PRODUCTS.washed_plantain.color);
    gableRoof(g, x0, y0 - 0.1, 2.4, 2.2, 30 + ctx.up, 10, 0x9aa3a8, 0x8d6e4a);
    this.roofTop = iso(x0 + 1.2, y0 + 1, 40 + ctx.up);
    const water = new Graphics();
    this.anim.addChild(water);
    this.animate = (time) => {
      water.clear();
      for (const [k, ty] of this.tanks.entries()) {
        for (let i = 0; i < 4; i++) {
          const f = this.working ? (time * 0.12 + i / 4 + k * 0.3) % 1 : i / 4 + 0.1;
          const p = iso(x0 + 0.25 + f * 1.9, y0 + ty + 0.3, 9);
          const bob = this.working ? Math.sin(time * 3 + i) * 0.8 : 0;
          water.ellipse(p.x, p.y - 1 + bob, 4, 2).fill(PRODUCTS.washed_plantain.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
        }
        if (this.working) {
          const q = iso(x0 + 0.3 + ((time * 0.5 + k * 0.4) % 1) * 1.8, y0 + ty + 0.15, 9);
          water.moveTo(q.x - 3, q.y).lineTo(q.x + 3, q.y).stroke({ width: 1, color: 0xe8f6ff, alpha: 0.8 });
        }
      }
    };
    this.animate(0);
  },

  // Peeling house: turquoise plank stilt house; beside it, table peeling plantains with knife,
  // green peel heap, and bucket of peeled fruit.
  plantain_peeler(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.4, 22, ctx, { wall: 0x4fb3bf });
    box(g, x + 2.2, y + 0.55, 0.45, 1.2, 9, 0x8d6e4a);
    const peel = iso(x + 2.55, y + 2.25);
    for (let k = 0; k < 5; k++) g.ellipse(peel.x - 6 + (k % 3) * 5, peel.y - 2 - Math.floor(k / 3) * 3, 4, 1.6).fill(k % 2 ? 0x558b2f : 0x689f38).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
    const pail = iso(x + 1.9, y + 2.3);
    g.poly([pail.x - 6, pail.y - 9, pail.x + 6, pail.y - 9, pail.x + 5, pail.y, pail.x - 5, pail.y]).fill(0x1e88e5).stroke(OUTLINE);
    for (let k = 0; k < 3; k++) g.ellipse(pail.x - 3 + k * 3, pail.y - 10, 2.6, 1.2).fill(PRODUCTS.peeled_plantain.color);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const t = iso(x + 2.42, y + 1.15, 9);
      anim.ellipse(t.x, t.y - 1, 7, 2.2).fill(this.working && (time * 0.8) % 1 > 0.5 ? PRODUCTS.peeled_plantain.color : PRODUCTS.washed_plantain.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      const wp = iso(x + 2.9, y + 1.15);
      worker(anim, wp.x, wp.y, 0xe5737f);
      if (!this.working) return;
      const f = (time * 2.4) % 1;
      anim.moveTo(t.x - 6 + f * 12, t.y - 4).lineTo(t.x - 2 + f * 12, t.y - 7).stroke({ width: 1.4, color: 0xcfd8dc });
      const fl = (time * 0.8) % 1;
      anim.ellipse(t.x + (peel.x - t.x) * fl, t.y - 3 + fl * (peel.y - t.y) - Math.sin(fl * Math.PI) * 8, 3, 1.2).fill(0x558b2f);
    };
    this.animate(0);
  },

  // Patacón fryer: open kitchen with wood stove and oil kettle, smashing board, and
  // tray of golden fried patacones.
  patacon_fryer(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.3;
    // Mud stove holding oil kettle.
    box(g, x0 + 0.3, y0 + 0.6, 1.2, 0.8, 10, 0xa1887f);
    const pan = iso(x0 + 0.9, y0 + 1.0, 10);
    g.ellipse(pan.x, pan.y, 15, 6).fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y, 12, 4.5).fill(0xc98a24);
    const fire = iso(x0 + 0.9, y0 + 1.42, 3);
    g.ellipse(fire.x, fire.y, 5, 2.5).fill(0x212121);
    // Smashing board and tray of patacones.
    box(g, x0 + 1.75, y0 + 0.75, 0.75, 0.6, 9, 0x8d6e4a);
    const tray = iso(x0 + 2.12, y0 + 1.05, 9);
    g.ellipse(tray.x, tray.y, 10, 4).fill(0x6d4c41);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) g.ellipse(tray.x - 6 + (k % 3) * 6, tray.y - 1 - Math.floor(k / 3) * 2, 3.2, 1.6).fill(PRODUCTS.patacon.color).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
    // Firewood.
    for (let k = 0; k < 3; k++) box(g, x + 0.3 + k * 0.08, y + 2.6 - k * 0.05, 0.9, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    ramada(this, g, x0, y0 + 0.1, 2.6, 1.6, 28 + ctx.up);
    this.smokePoints = [iso(x0 + 0.9, y0 + 1.0, 40 + ctx.up)];
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      if (this.working) for (let i = 0; i < 4; i++) {
        const a = time * 2 + i * 1.7;
        anim.circle(pan.x + Math.cos(a) * 8, pan.y + Math.sin(a * 1.3) * 3, 1 + ((time * 3 + i) % 1)).fill({ color: 0xfff3c4, alpha: 0.8 });
      }
      for (let k = 0; k < 3; k++) anim.ellipse(pan.x - 6 + k * 6, pan.y - (this.working ? Math.abs(Math.sin(time * 2 + k)) : 0), 3, 1.5).fill(PRODUCTS.patacon.color);
      const wp = iso(x0 + 1.65, y0 + 1.65);
      worker(anim, wp.x, wp.y, 0x6cbf6c);
      const press = this.working ? Math.max(0, Math.sin(time * 4)) * 3 : 0;
      anim.rect(tray.x - 14, tray.y - 9 + press, 9, 2.5).fill(0xbc8a5f).stroke({ width: 0.5, color: 0x3a2418 });
    };
    this.animate(0);
  },

  // Bagger: yellow plank stilt house; beneath, conveyor dropping patacones into sealed bags.
  // sealed bags.
  patacon_bagger(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.0, 1.4, 22, ctx, { wall: 0xf2c14e, trim: 0x2e7d32 });
    box(g, x + 0.4, y + 2.15, 2.0, 0.35, 8, 0x555555);
    const hopper = iso(x + 0.9, y + 2.32, 20);
    g.poly([hopper.x - 7, hopper.y - 8, hopper.x + 7, hopper.y - 8, hopper.x + 3, hopper.y, hopper.x - 3, hopper.y]).fill(0x8a8f94).stroke(OUTLINE);
    g.ellipse(hopper.x, hopper.y - 8, 7, 2).fill(PRODUCTS.patacon.color);
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.8, y + 2.32, 8);
        const full = f > 0.3;
        belt.roundRect(p.x - 4, p.y - 11, 8, 11, 1.5).fill(full ? PRODUCTS.patacon_bag.color : 0xfff3c4).stroke(OUTLINE);
        if (full) belt.rect(p.x - 4, p.y - 11, 8, 2).fill(f > 0.5 ? 0xd99a1e : PRODUCTS.patacon_bag.color);
      }
      if (!this.working) return;
      const f = (time * 2) % 1;
      belt.ellipse(hopper.x, hopper.y + 2 + f * 5, 2, 1).fill(PRODUCTS.patacon.color);
    };
  },

  // Patacón depot: large green stilt warehouse with stacked boxes and porter carrying loads.
  // porter carrying loads.
  patacon_boxer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.4, 1.5, 24, ctx, { wall: 0x6cbf6c, trim: 0xf7f4ee, roofColor: 0x9a7b5a, roofH: 14 });
    const stack = (bx, by, rows) => {
      for (let r = 0; r < rows; r++) for (let k = 0; k < rows - r; k++) box(g, x + bx + k * 0.3 + r * 0.15, y + by, 0.26, 0.26, 7, PRODUCTS.patacon_box.color, { z: r * 7 });
    };
    stack(1.3, 2.35, 3);
    if (ctx.tier >= 2) stack(2.2, 2.6, 2);
    const carrier = new Graphics();
    this.anim.addChild(carrier);
    this.animate = (time) => {
      carrier.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 0.5 + k * 0.9, y + 2.2 + k * 0.5);
      worker(carrier, p.x, p.y, 0x1e88e5);
      if (!back) carrier.rect(p.x - 6, p.y - 30, 12, 9).fill(PRODUCTS.patacon_box.color).stroke(OUTLINE);
    };
  },

  // --- Pacific Coast · La Azotea (v3.39): Pacific kitchen in plank stilt houses ---

  // Herb wash: shed with water-filled wooden trough; cook washes herb bunches and drains
  // them in basket.
  herb_washer(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.4, y0 + 0.6, 1.6, 0.7, 9, 0x8d6e4a);
    const tub = iso(x0 + 1.2, y0 + 0.95, 9);
    g.ellipse(tub.x, tub.y, 18, 6).fill(0x6d4c41).stroke(OUTLINE);
    g.ellipse(tub.x, tub.y, 15, 4.5).fill(0x4fa3c7);
    const basket = iso(x + 2.6, y + 2.3);
    g.poly([basket.x - 9, basket.y - 9, basket.x + 9, basket.y - 9, basket.x + 7, basket.y, basket.x - 7, basket.y]).fill(0xc8a26a).stroke(OUTLINE);
    for (let k = 0; k < 4; k++) g.moveTo(basket.x - 6 + k * 4, basket.y - 9).lineTo(basket.x - 7 + k * 4, basket.y - 15).stroke({ width: 2, color: PRODUCTS.washed_herbs.color, cap: 'round' });
    const drum = iso(x + 0.55, y + 2.4);
    g.rect(drum.x - 6, drum.y - 14, 12, 14).fill(0x1e88e5).stroke(OUTLINE);
    g.ellipse(drum.x, drum.y - 14, 6, 2).fill(0x4fa3c7).stroke(OUTLINE);
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < 3; k++) {
        const bob = this.working ? Math.sin(time * 3 + k * 2) * 1.2 : 0;
        anim.moveTo(tub.x - 8 + k * 7, tub.y + bob).lineTo(tub.x - 9 + k * 7, tub.y - 6 + bob).stroke({ width: 2.2, color: PRODUCTS.herbs.color, cap: 'round' });
      }
      const wp = iso(x0 + 1.2, y0 + 1.75);
      worker(anim, wp.x, wp.y, 0xe5737f);
      if (!this.working) return;
      const f = (time * 1.5) % 1;
      anim.circle(tub.x + 10, tub.y - 4 + f * 8, 1.1).fill(0xe8f6ff);
      anim.moveTo(tub.x - 12 + Math.sin(time * 5) * 3, tub.y - 1).lineTo(tub.x - 6 + Math.sin(time * 5) * 3, tub.y - 1).stroke({ width: 1, color: 0xe8f6ff });
    };
    this.animate(0);
  },

  // Mortar house: pink stilt house eaves with wooden pilón mortar pounded alternately by
  // two cooks beside garlic and onion.
  herb_pestle(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.6, 1.2, 20, ctx, { wall: 0xe5737f, trim: 0xf7f4ee, lift: 8 });
    const pil = iso(x + 2.3, y + 1.9);
    const pils = ctx.tier >= 2 ? [pil, iso(x + 1.4, y + 2.55)] : [pil];
    for (const p of pils) {
      g.poly([p.x - 9, p.y - 16, p.x + 9, p.y - 16, p.x + 6, p.y, p.x - 6, p.y]).fill(0x8d6e4a).stroke(OUTLINE);
      g.moveTo(p.x - 8, p.y - 10).lineTo(p.x + 8, p.y - 10).stroke({ width: 1, color: 0x6d4c41 });
      g.ellipse(p.x, p.y - 16, 9, 3).fill(0x4e342e).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 16, 6.5, 2).fill(PRODUCTS.pounded_herbs.color);
    }
    const garlic = iso(x + 0.5, y + 2.6);
    for (let k = 0; k < 3; k++) g.circle(garlic.x - 4 + k * 4, garlic.y - 3, 2.6).fill(k === 1 ? 0xb06ab3 : 0xf5f0e1).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, p] of pils.entries()) {
        for (const side of [-1, 1]) {
          const phase = side < 0 ? 0 : Math.PI;
          const up = this.working ? (Math.sin(time * 5 + phase + k) + 1) * 6 : 6;
          const wx = p.x + side * 14;
          worker(anim, wx, p.y + 2, side < 0 ? 0xf2c14e : 0x6cbf6c);
          anim.moveTo(p.x + side * 2, p.y - 20 - up).lineTo(p.x + side * 3, p.y - 42 - up).stroke({ width: 3, color: 0xbc8a5f, cap: 'round' });
        }
      }
    };
    this.animate(0);
  },

  // Sofrito kitchen: blue stilt house with porch wood hearth simmering seasoning pot,
  // smoke rising through roof.
  refrito_pot(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 1.9, 1.3, 22, ctx, { wall: 0x5c8dd6, trim: 0xf2c14e });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pot = iso(x + 2.1, y + 2.35, 10);
    g.moveTo(pot.x - 10, pot.y - 12).lineTo(pot.x - 9, pot.y).quadraticCurveTo(pot.x, pot.y + 4, pot.x + 9, pot.y).lineTo(pot.x + 10, pot.y - 12).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 12, 10, 3.5).fill(PRODUCTS.alino.color).stroke(OUTLINE);
    for (let k = 0; k < 3; k++) box(g, x + 0.4 + k * 0.08, y + 2.55 - k * 0.05, 0.8, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    this.smokePoints = [{ x: pot.x, y: pot.y - 20 }];
    const fire = iso(x + 2.1, y + 2.72, 3);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      const wp = iso(x + 1.45, y + 2.85);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
      const stir = this.working ? time * 3 : 0;
      anim.moveTo(pot.x + Math.cos(stir) * 5, pot.y - 12 + Math.sin(stir) * 1.5).lineTo(pot.x - 8, pot.y - 28).stroke({ width: 1.8, color: 0xbc8a5f });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) anim.circle(pot.x - 5 + i * 5, pot.y - 13 - ((time * 2 + i * 0.3) % 1) * 3, 1).fill({ color: 0xc5e1a5, alpha: 0.8 });
    };
    this.animate(0);
  },

  // Seasoning jar line: green-and-yellow grand stilt house with lower table filling,
  // capping, and crating jars.
  alino_packer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.4, 22, ctx, { wall: 0x6cbf6c, trim: 0xf2c14e });
    box(g, x + 0.4, y + 2.15, 2.0, 0.35, 8, 0x8d6e4a);
    const tap = iso(x + 0.9, y + 2.32, 22);
    g.rect(tap.x - 5, tap.y - 10, 10, 10).fill(PRODUCTS.alino.color).stroke(OUTLINE);
    for (let k = 0; k < 1 + Math.min(ctx.tier, 2); k++) box(g, x + 2.5, y + 0.6 + k * 0.4, 0.32, 0.32, 8, PRODUCTS.alino_box.color);
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.3 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.8, y + 2.32, 8);
        const full = f > 0.3;
        belt.rect(p.x - 2.5, p.y - 9, 5, 9).fill(full ? PRODUCTS.alino.color : 0xe8f6ff).stroke(OUTLINE);
        belt.rect(p.x - 2.5, p.y - 11, 5, 2.2).fill(f > 0.55 ? 0xd7263d : 0xe8f6ff);
      }
      if (!this.working) return;
      const f = (time * 2) % 1;
      belt.moveTo(tap.x, tap.y + 1).lineTo(tap.x, tap.y + 4 + f * 3).stroke({ width: 1.4, color: PRODUCTS.alino.color });
    };
  },

  // --- Pacific Coast · La Bahía (v3.40): fishermen's beach ---

  // Snapper cleaning: beach shed with plank table; fisherman scales red snapper, buckets
  // of seawater, and pelicans waiting for scraps.
  pargo_cleaner(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.3, y0 + 0.6, 1.8, 0.6, 9, 0x8d6e4a);
    const top = iso(x0 + 1.2, y0 + 0.9, 9);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) fishOn(g, top.x - 14 + k * 9, top.y - 1 - (k % 2), 4, PRODUCTS.clean_pargo.color);
    for (const [bx, by] of [[0.45, 2.45], [0.95, 2.6]]) {
      const b = iso(x + bx, y + by);
      g.poly([b.x - 6, b.y - 10, b.x + 6, b.y - 10, b.x + 5, b.y, b.x - 5, b.y]).fill(0x1e88e5).stroke(OUTLINE);
      g.ellipse(b.x, b.y - 10, 6, 2).fill(0x4fa3c7);
    }
    ramada(this, g, x0, y0, 2.3, 1.5, 28 + ctx.up, 0x9a7b5a);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.2, y0 + 1.55);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      fishOn(anim, top.x + 10, top.y - 2, 5, PRODUCTS.pargo.color);
      const bird = iso(x + 2.7, y + 2.3);
      const hop = this.working ? Math.abs(Math.sin(time * 2)) * 2 : 0;
      anim.ellipse(bird.x, bird.y - 7 - hop, 5, 3.4).fill(0x8d8478).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      anim.poly([bird.x - 4, bird.y - 9 - hop, bird.x - 13, bird.y - 6 - hop, bird.x - 4, bird.y - 7 - hop]).fill(0xd7a35a);
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 2 + i / 3) % 1;
        anim.circle(top.x + 10 + f * 8, top.y - 4 - Math.sin(f * Math.PI) * 6, 0.9).fill(0xe8f6ff);
      }
    };
    this.animate(0);
  },

  // Drying racks: sunny lines hung with split salted fish beside salt sacks.
  // salt sacks.
  fish_drier(g, x, y, ctx) {
    const rows = ctx.tier >= 2 ? [0.5, 1.3, 2.1] : [0.7, 1.7];
    this.lines = [];
    for (const ry of rows) {
      const a = iso(x + 0.4, y + ry, 0);
      const b = iso(x + 2.6, y + ry, 0);
      for (const p of [a, b]) g.rect(p.x - 1.2, p.y - 24, 2.4, 24).fill(0x6b4a2e);
      g.moveTo(a.x, a.y - 22).lineTo(b.x, b.y - 22).stroke({ width: 1, color: 0x8d6e4a });
      this.lines.push([a, b]);
    }
    for (const [sx, sy] of [[2.7, 2.6], [2.35, 2.75]]) sack(g, x + sx, y + sy, 0, 0xffffff);
    this.roofTop = iso(x + 1.5, y + 1.3, 30);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, [a, b]] of this.lines.entries()) {
        for (let i = 0; i < 5; i++) {
          const f = (i + 0.5) / 5;
          const sway = this.working ? Math.sin(time * 1.5 + i + k) * 1.2 : 0;
          const px = a.x + (b.x - a.x) * f + sway;
          const py = a.y + (b.y - a.y) * f - 21;
          anim.poly([px - 3, py + 1, px + 3, py + 1, px + 2, py + 10, px, py + 13, px - 2, py + 10]).fill(PRODUCTS.dried_fish.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
        }
      }
    };
    this.animate(0);
  },

  // Snapper filleter: white-and-blue stilt house with porch table slicing fillets that move
  // to neighboring Smokehouse.
  pargo_filleter(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.3, 20, ctx, { wall: 0xf7f4ee, trim: 0x1e88e5 });
    box(g, x + 2.2, y + 0.5, 0.45, 1.2, 9, 0x8d6e4a);
    const t = iso(x + 2.42, y + 1.1, 9);
    for (let k = 0; k < 2; k++) g.ellipse(t.x - 4 + k * 7, t.y - 1 + k * 3, 4, 2).fill(PRODUCTS.pargo_fillet.color).stroke({ width: 0.5, color: 0xe53935 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      fishOn(anim, t.x - 2, t.y - 5, 5, PRODUCTS.clean_pargo.color);
      const wp = iso(x + 2.95, y + 1.1);
      worker(anim, wp.x, wp.y, 0x1e88e5);
      if (!this.working) return;
      const f = (time * 2.2) % 1;
      anim.moveTo(t.x - 7 + f * 10, t.y - 8).lineTo(t.x - 3 + f * 10, t.y - 12).stroke({ width: 1.4, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Snapper smokehouse: tall mud firebox with pole grill smoking split snappers over wood
  // embers beside firewood stack.
  pargo_smoker(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    const n = ctx.tier >= 2 ? 2 : 1;
    this.grills = [];
    for (let k = 0; k < n; k++) {
      const gx = x0 + k * 1.1;
      box(g, gx, y0, 0.9, 0.9, 12, 0xa1887f);
      for (const [px, py] of [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]]) box(g, gx + px - 0.04, y0 + py - 0.04, 0.08, 0.08, 26, 0x6b4a2e, { z: 12 });
      const grill = iso(gx + 0.45, y0 + 0.45, 22);
      for (let i = -2; i <= 2; i++) g.moveTo(grill.x - 14, grill.y + i * 2.4).lineTo(grill.x + 14, grill.y + i * 2.4).stroke({ width: 0.8, color: 0x4e342e });
      this.grills.push(grill);
      const fire = iso(gx + 0.45, y0 + 0.9, 3);
      g.ellipse(fire.x, fire.y, 6, 2.5).fill(0x212121);
    }
    for (let k = 0; k < 3; k++) box(g, x + 0.4 + k * 0.08, y + 2.55 - k * 0.05, 0.9, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    this.smokePoints = this.grills.map((p) => ({ x: p.x, y: p.y - 10 }));
    this.roofTop = iso(x0 + 0.45, y0 + 0.45, 40);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, p] of this.grills.entries()) {
        for (let i = 0; i < 2; i++) fishOn(anim, p.x - 6 + i * 11, p.y - 1 + (i % 2) * 2, 4.5, PRODUCTS.smoked_pargo.color);
        const fire = iso(x0 + k * 1.1 + 0.45, y0 + 0.9, 3);
        anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 6 - (this.working ? Math.sin(time * 9 + k) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      }
    };
    this.animate(0);
  },

  // Tapao kitchen: orange stilt kitchen with porch stove simmering plantain-leaf-covered
  // tapao stew using seasoning from La Azotea.
  tapao_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 2.0, 1.3, 22, ctx, { wall: 0xf08a3c, trim: 0x2e7d32 });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pot = iso(x + 2.1, y + 2.35, 10);
    g.moveTo(pot.x - 10, pot.y - 12).lineTo(pot.x - 9, pot.y).quadraticCurveTo(pot.x, pot.y + 4, pot.x + 9, pot.y).lineTo(pot.x + 10, pot.y - 12).closePath().fill(0x546e7a).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 13, 12, 4).fill(0x2e7d32).stroke(OUTLINE);
    g.moveTo(pot.x - 10, pot.y - 13).lineTo(pot.x + 10, pot.y - 13).stroke({ width: 0.8, color: 0x66bb6a });
    // Green plantain bunch and seasoning jars on table.
    box(g, x + 0.45, y + 2.2, 0.9, 0.45, 8, 0x8d6e4a);
    const t = iso(x + 0.9, y + 2.42, 8);
    g.ellipse(t.x - 5, t.y - 3, 5, 3).fill(PRODUCTS.washed_plantain?.color ?? 0x9ccc65).stroke({ width: 0.5, color: 0x3a2418 });
    for (let k = 0; k < 2; k++) g.rect(t.x + 2 + k * 4, t.y - 8, 3, 6).fill(PRODUCTS.alino.color).stroke({ width: 0.5, color: 0x3a2418 });
    this.smokePoints = [{ x: pot.x, y: pot.y - 20 }];
    const fire = iso(x + 2.1, y + 2.72, 3);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      const wp = iso(x + 1.45, y + 2.95);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
      if (!this.working) return;
      const lift = Math.max(0, Math.sin(time * 1.2)) * 4;
      anim.ellipse(pot.x + 2, pot.y - 15 - lift, 11, 3.5).fill({ color: 0x43a047, alpha: lift > 1 ? 0.9 : 0 });
    };
    this.animate(0);
  },

  // --- Pacific Coast · El Manglar (v3.41): piangua cockle kitchen by the estuary ---

  // Cockle wash: shed with water-filled dugout canoe rinsing full catanga baskets beside
  // queued baskets.
  piangua_washer(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const a = iso(x0 + 0.3, y0 + 0.9, 6);
    const b = iso(x0 + 2.1, y0 + 0.9, 6);
    g.moveTo(a.x - 6, a.y - 4).lineTo(b.x + 6, b.y - 4).quadraticCurveTo(b.x + 2, b.y + 6, b.x - 8, b.y + 5).lineTo(a.x + 6, a.y + 5).quadraticCurveTo(a.x - 4, a.y + 4, a.x - 6, a.y - 4).fill(0x8d5a32).stroke(OUTLINE);
    g.moveTo(a.x - 3, a.y - 2).lineTo(b.x + 3, b.y - 2).quadraticCurveTo(b.x, b.y + 3, b.x - 6, b.y + 2).lineTo(a.x + 4, a.y + 2).closePath().fill(0x5a8f9a);
    for (const [bx, by] of [[0.45, 2.4], [0.9, 2.55], [2.6, 2.3]].slice(0, 2 + Math.min(ctx.tier, 1))) {
      const q = iso(x + bx, y + by);
      g.poly([q.x - 7, q.y - 12, q.x + 7, q.y - 12, q.x + 5, q.y, q.x - 5, q.y]).fill(0xc8a26a).stroke(OUTLINE);
      for (let k = 0; k < 3; k++) g.circle(q.x - 4 + k * 4, q.y - 13, 2.2).fill(PRODUCTS.piangua.color);
    }
    ramada(this, g, x0, y0 - 0.1, 2.4, 1.7, 28 + ctx.up, 0x9a7b5a);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.2, y0 + 1.6);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      const c = iso(x0 + 1.2, y0 + 0.9, 6);
      const dip = this.working ? (Math.sin(time * 3) + 1) * 2.5 : 2;
      anim.poly([c.x - 6, c.y - 8 + dip, c.x + 6, c.y - 8 + dip, c.x + 4, c.y + dip, c.x - 4, c.y + dip]).fill(0xc8a26a).stroke({ width: 0.6, color: 0x3a2418 });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 1.6 + i / 3) % 1;
        anim.circle(c.x - 8 + i * 8, c.y - 2 - Math.sin(f * Math.PI) * 5, 1).fill(0xe8f6ff);
      }
    };
    this.animate(0);
  },

  // Cockle boiling pot: open shed wood stove boiling pianguas until shells pop open,
  // steaming beside firewood.
  piangua_cooker(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.4;
    box(g, x0 + 0.4, y0 + 0.5, 1.4, 1.0, 10, 0xa1887f);
    const pot = iso(x0 + 1.1, y0 + 1.0, 10);
    g.moveTo(pot.x - 14, pot.y - 16).lineTo(pot.x - 12, pot.y).quadraticCurveTo(pot.x, pot.y + 5, pot.x + 12, pot.y).lineTo(pot.x + 14, pot.y - 16).closePath().fill(0xb0bec5).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 16, 14, 5).fill(0x90a4ae).stroke(OUTLINE);
    const fire = iso(x0 + 1.1, y0 + 1.5, 3);
    g.ellipse(fire.x, fire.y, 6, 2.5).fill(0x212121);
    for (let k = 0; k < 3; k++) box(g, x + 2.0 + k * 0.08, y + 2.55 - k * 0.05, 0.9, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    ramada(this, g, x0, y0, 2.2, 1.6, 30 + ctx.up, 0x9aa3a8);
    this.smokePoints = [{ x: pot.x, y: pot.y - 26 }];
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 5, fire.y, fire.x, fire.y - 6 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 5, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      for (let k = 0; k < 4; k++) {
        const jump = this.working ? Math.abs(Math.sin(time * 3 + k)) * 1.5 : 0;
        anim.ellipse(pot.x - 8 + k * 5, pot.y - 17 - jump, 2.6, 1.8).fill(PRODUCTS.cooked_piangua.color);
      }
      const wp = iso(x0 + 1.9, y0 + 1.75);
      worker(anim, wp.x, wp.y, 0x4fb3bf);
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.8 + i / 3) % 1;
        anim.circle(pot.x - 6 + i * 6, pot.y - 20 - f * 12, 2 + f * 2).fill({ color: 0xeceff1, alpha: 0.6 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Shucker: yellow stilt house with porch table shucking cockles by spoon; empty shell
  // heap grows at milestones.
  piangua_sheller(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.3, 20, ctx, { wall: 0xf2c14e, trim: 0x1e88e5 });
    box(g, x + 2.2, y + 0.5, 0.45, 1.2, 9, 0x8d6e4a);
    const pile = iso(x + 2.2, y + 2.4);
    const n = 6 + Math.min(ctx.tier, 3) * 3;
    for (let k = 0; k < n; k++) g.ellipse(pile.x - 8 + (k % 5) * 4, pile.y - 2 - Math.floor(k / 5) * 2.5, 2.6, 1.8).fill(k % 2 ? 0x2b2622 : 0x3a3028).stroke({ width: 0.4, color: 0x000000, alpha: 0.4 });
    const bowl = iso(x + 2.42, y + 0.8, 9);
    g.ellipse(bowl.x, bowl.y, 5, 2).fill(0xffffff).stroke({ width: 0.6, color: 0x3a2418 });
    g.ellipse(bowl.x, bowl.y - 0.5, 3.5, 1.2).fill(PRODUCTS.piangua_meat.color);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const t = iso(x + 2.42, y + 1.3, 9);
      anim.ellipse(t.x, t.y - 1, 3, 2).fill(PRODUCTS.cooked_piangua.color);
      const wp = iso(x + 2.95, y + 1.15);
      worker(anim, wp.x, wp.y, 0xe5737f);
      if (!this.working) return;
      const f = (time * 1.1) % 1;
      anim.ellipse(t.x + (pile.x - t.x) * f, t.y + (pile.y - 4 - t.y) * f - Math.sin(f * Math.PI) * 10, 2.2, 1.5).fill(0x2b2622);
    };
    this.animate(0);
  },

  // Coconut stew pot: pink stilt kitchen with coconut pile, grater, and pot simmering
  // cockles in coconut milk.
  encocado_pot(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 1.9, 1.3, 22, ctx, { wall: 0xe5737f, trim: 0xf7f4ee });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pot = iso(x + 2.1, y + 2.35, 10);
    g.moveTo(pot.x - 10, pot.y - 12).lineTo(pot.x - 9, pot.y).quadraticCurveTo(pot.x, pot.y + 4, pot.x + 9, pot.y).lineTo(pot.x + 10, pot.y - 12).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 12, 10, 3.5).fill(PRODUCTS.encocado.color).stroke(OUTLINE);
    const coco = iso(x + 0.6, y + 2.5);
    for (let k = 0; k < 4 + Math.min(ctx.tier, 2); k++) g.circle(coco.x - 6 + (k % 3) * 6, coco.y - 3 - Math.floor(k / 3) * 4, 3).fill(0x7a5a2e).stroke({ width: 0.6, color: 0x3a2418 });
    this.smokePoints = [{ x: pot.x, y: pot.y - 20 }];
    const fire = iso(x + 2.1, y + 2.72, 3);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      for (let k = 0; k < 3; k++) anim.ellipse(pot.x - 5 + k * 5, pot.y - 12.5, 2, 1.2).fill(PRODUCTS.piangua_meat.color);
      const wp = iso(x + 1.3, y + 2.85);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
      const stir = this.working ? time * 3 : 0;
      anim.moveTo(pot.x + Math.cos(stir) * 5, pot.y - 12 + Math.sin(stir) * 1.5).lineTo(pot.x - 8, pot.y - 28).stroke({ width: 1.8, color: 0xbc8a5f });
    };
    this.animate(0);
  },

  // Rice-and-piangua diner: blue stilt restaurant with porch tables under eaves, plated
  // rice dishes, and bustling waitress.
  piangua_lunch(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.3, 22, ctx, { wall: 0x5c8dd6, trim: 0xf2c14e });
    const tables = ctx.tier >= 2 ? [[0.7, 2.2], [1.6, 2.2], [2.5, 2.2]] : [[0.9, 2.2], [2.0, 2.2]];
    this.plates = [];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 9, 0xf7f4ee);
      const q = iso(x + tx, y + ty, 9);
      g.ellipse(q.x - 4, q.y, 3.2, 1.4).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418 });
      g.ellipse(q.x - 4, q.y - 0.4, 2, 0.8).fill(PRODUCTS.arroz_piangua.color === 0xf4f1e8 ? 0xf6d77a : PRODUCTS.arroz_piangua.color);
      g.ellipse(q.x + 4, q.y + 1, 3.2, 1.4).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418 });
      g.ellipse(q.x + 4, q.y + 0.6, 2, 0.8).fill(PRODUCTS.patacon.color);
      this.plates.push(q);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, q] of this.plates.entries()) worker(anim, q.x + (k % 2 ? 10 : -10), q.y + 10, [0xe5737f, 0x6cbf6c, 0xf2c14e][k % 3]);
      const f = this.working ? (Math.sin(time * 0.7) + 1) / 2 : 0.5;
      const w = iso(x + 0.6 + f * 2, y + 2.75);
      worker(anim, w.x, w.y, 0xffffff);
      anim.ellipse(w.x + 4, w.y - 17, 4, 1.5).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418 });
    };
    this.animate(0);
  },

  // Casserole kitchen: grand green stilt kitchen with clay seafood casseroles bubbling on
  // hearth and served at table.
  cazuela_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.3, 22, ctx, { wall: 0x6cbf6c, trim: 0xe5737f });
    box(g, x + 0.5, y + 2.0, 1.9, 0.6, 10, 0xa1887f);
    this.pots = [];
    for (const f of [0.3, 0.7]) {
      const q = iso(x + 0.5 + 1.9 * f, y + 2.3, 10);
      g.ellipse(q.x, q.y - 3, 10, 4).fill(0xa1522f).stroke(OUTLINE);
      g.ellipse(q.x, q.y - 4, 8, 2.8).fill(0xf0c27a);
      this.pots.push(q);
    }
    this.smokePoints = this.pots.map((q) => ({ x: q.x, y: q.y - 14 }));
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, q] of this.pots.entries()) {
        anim.ellipse(q.x - 3, q.y - 4.5, 2, 1.3).fill(0x2b2622);
        anim.ellipse(q.x + 3, q.y - 4.2, 2.2, 1.2).fill(PRODUCTS.clean_pargo.color);
        if (!this.working) continue;
        for (let i = 0; i < 2; i++) anim.circle(q.x - 4 + i * 7, q.y - 5 - ((time * 2 + i * 0.4 + k) % 1) * 3, 0.9).fill({ color: 0xfff8e1, alpha: 0.9 });
      }
      const wp = iso(x + 1.45, y + 2.95);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
    };
    this.animate(0);
  },

  // --- Pacific Coast · El Werregue (v3.42): Wounaan stilt huts of the San Juan river ---

  // Fiber stripper: shed stripping palm heart shoots into white strips hung in bundles.
  // hung in bundles.
  werregue_stripper(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const pile = iso(x + 0.55, y + 2.45);
    for (let k = 0; k < 4; k++) g.moveTo(pile.x - 8 + k * 3, pile.y).lineTo(pile.x - 2 + k * 4, pile.y - 14).stroke({ width: 2.4, color: PRODUCTS.werregue_leaf.color, cap: 'round' });
    box(g, x0 + 0.5, y0 + 0.7, 1.4, 0.5, 6, 0x8d6e4a);
    ramada(this, g, x0, y0, 2.3, 1.5, 28 + ctx.up, 0xc9a96b);
    const bar0 = iso(x0 + 0.1, y0 + 1.5, 22 + ctx.up);
    const bar1 = iso(x0 + 2.2, y0 + 1.5, 22 + ctx.up);
    g.moveTo(bar0.x, bar0.y).lineTo(bar1.x, bar1.y).stroke({ width: 1.6, color: 0x6b4a2e });
    const n = 3 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const px = bar0.x + (bar1.x - bar0.x) * f;
      const py = bar0.y + (bar1.y - bar0.y) * f;
      for (let i = -1; i <= 1; i++) g.moveTo(px, py).lineTo(px + i * 1.5, py + 14).stroke({ width: 1, color: PRODUCTS.werregue_fiber.color });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, side] of [[0, -1], [1, 1]]) {
        const wp = iso(x0 + 0.7 + k * 0.9, y0 + 1.4);
        worker(anim, wp.x, wp.y, side < 0 ? 0xe5737f : 0x4fb3bf);
        const pull = this.working ? (Math.sin(time * 3 + k * 2) + 1) * 3 : 2;
        anim.moveTo(wp.x - 2, wp.y - 14).lineTo(wp.x + 6 * side + pull * side, wp.y - 16).stroke({ width: 1.2, color: PRODUCTS.werregue_fiber.color });
      }
    };
    this.animate(0);
  },

  // Dyeing hearth: stove with twin pots (black jagua and red achiote) and dyed skeins
  // hanging to dry.
  werregue_dyer(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.4;
    box(g, x0 + 0.3, y0 + 0.4, 1.6, 0.8, 8, 0xa1887f);
    this.pots = [];
    for (const [f, col] of [[0.3, 0x2b2018], [0.7, 0xb23a2a]]) {
      const q = iso(x0 + 0.3 + 1.6 * f, y0 + 0.8, 8);
      g.moveTo(q.x - 8, q.y - 10).lineTo(q.x - 7, q.y).quadraticCurveTo(q.x, q.y + 3, q.x + 7, q.y).lineTo(q.x + 8, q.y - 10).closePath().fill(0x37474f).stroke(OUTLINE);
      g.ellipse(q.x, q.y - 10, 8, 3).fill(col).stroke(OUTLINE);
      this.pots.push(q);
    }
    // Ropes of dyed skeins.
    const a = iso(x + 0.3, y + 2.4, 0);
    const b = iso(x + 2.7, y + 2.4, 0);
    for (const p of [a, b]) g.rect(p.x - 1.2, p.y - 24, 2.4, 24).fill(0x6b4a2e);
    g.moveTo(a.x, a.y - 22).lineTo(b.x, b.y - 22).stroke({ width: 1, color: 0x8d6e4a });
    const cols = [0x2b2018, 0xb23a2a, 0x2b2018, PRODUCTS.werregue_fiber.color, 0xb23a2a, 0x2b2018];
    for (let k = 0; k < 4 + Math.min(ctx.tier, 2); k++) {
      const f = (k + 0.5) / (4 + Math.min(ctx.tier, 2));
      const px = a.x + (b.x - a.x) * f;
      const py = a.y + (b.y - a.y) * f - 21;
      g.poly([px - 2.5, py, px + 2.5, py, px + 1.8, py + 13, px - 1.8, py + 13]).fill(cols[k]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    this.smokePoints = this.pots.map((q) => ({ x: q.x, y: q.y - 14 }));
    this.roofTop = iso(x0 + 1.1, y0 + 0.8, 30);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.1, y0 + 1.55);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      const stir = this.working ? time * 2.5 : 0;
      const q = this.pots[Math.floor(time / 3) % 2];
      anim.moveTo(q.x + Math.cos(stir) * 4, q.y - 10).lineTo(q.x - 6, q.y - 24).stroke({ width: 1.6, color: 0xbc8a5f });
    };
    this.animate(0);
  },

  // Twister hut: small tambo where weaver rolls fiber into cord on thigh beside cord coils.
  werregue_twister(g, x, y, ctx) {
    const floor = tamboHouse(this, g, x + 1.4, y + 1.2, 1.0, ctx);
    const rolls = 2 + Math.min(ctx.tier, 3);
    for (let k = 0; k < rolls; k++) g.circle(floor.x + 10 + (k % 3) * 6, floor.y + 2 - Math.floor(k / 3) * 5, 3).fill([0x2b2018, 0xb23a2a, PRODUCTS.werregue_fiber.color][k % 3]).stroke({ width: 0.5, color: 0x3a2418 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.tamboRoof();
    this.animate = (time) => {
      anim.clear();
      const p = { x: floor.x - 6, y: floor.y };
      anim.roundRect(p.x - 3.2, p.y - 12, 6.4, 8, 2).fill(0xe5737f);
      anim.rect(p.x - 1, p.y - 4, 9, 2.4).fill(0x3d3d5c);
      anim.circle(p.x, p.y - 14.5, 2.8).fill(0x6d4c32);
      anim.rect(p.x - 2.8, p.y - 16, 5.6, 1.6).fill(0x2b2018);
      const roll = this.working ? Math.sin(time * 4) * 3 : 0;
      anim.moveTo(p.x + 3 + roll, p.y - 6).lineTo(p.x + 9, p.y - 5).stroke({ width: 1.4, color: PRODUCTS.werregue_thread.color });
    };
    this.animate(0);
  },

  // Weavers hall: grand tambo where Wounaan women weave fine werregue vases resting on floor.
  // vases resting on floor.
  werregue_weaver(g, x, y, ctx) {
    const floor = tamboHouse(this, g, x + 1.5, y + 1.3, 1.25, ctx);
    const jars = 2 + Math.min(ctx.tier, 3);
    const jar = (jx, jy, sc) => {
      g.moveTo(jx - 2 * sc, jy - 11 * sc).lineTo(jx + 2 * sc, jy - 11 * sc).quadraticCurveTo(jx + 7 * sc, jy - 7 * sc, jx + 6 * sc, jy - 3 * sc).quadraticCurveTo(jx + 4 * sc, jy, jx, jy).quadraticCurveTo(jx - 4 * sc, jy, jx - 6 * sc, jy - 3 * sc).quadraticCurveTo(jx - 7 * sc, jy - 7 * sc, jx - 2 * sc, jy - 11 * sc).fill(PRODUCTS.werregue_jar.color).stroke({ width: 0.6, color: 0x3a2418 });
      g.moveTo(jx - 5.5 * sc, jy - 5 * sc).lineTo(jx + 5.5 * sc, jy - 5 * sc).stroke({ width: 1, color: 0x2b2018 });
      g.moveTo(jx - 5 * sc, jy - 3 * sc).lineTo(jx + 5 * sc, jy - 3 * sc).stroke({ width: 0.8, color: 0xb23a2a });
    };
    for (let k = 0; k < jars; k++) jar(floor.x - 16 + k * 8, floor.y + 6 + (k % 2) * 3, 1);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.tamboRoof();
    this.animate = (time) => {
      anim.clear();
      for (const [k, dx] of [[0, -8], [1, 10]]) {
        const p = { x: floor.x + dx, y: floor.y - 2 };
        anim.roundRect(p.x - 3.2, p.y - 12, 6.4, 8, 2).fill(k ? 0x4fb3bf : 0xf2c14e);
        anim.circle(p.x, p.y - 14.5, 2.8).fill(0x6d4c32);
        anim.rect(p.x - 2.8, p.y - 16, 5.6, 1.6).fill(0x2b2018);
        const w = this.working ? Math.sin(time * 3 + k * 2) * 1.5 : 0;
        anim.ellipse(p.x + 5 * (k ? -1 : 1), p.y - 4 + w * 0.3, 4, 3).fill(PRODUCTS.werregue_jar.color).stroke({ width: 0.5, color: 0x3a2418 });
        anim.moveTo(p.x + 2 * (k ? -1 : 1), p.y - 8).lineTo(p.x + 5 * (k ? -1 : 1) + w, p.y - 6).stroke({ width: 1, color: 0x2b2018 });
      }
    };
    this.animate(0);
  },

  // Craft shop: turquoise plank stilt house with vases displayed on porch shelves, sign,
  // and browsing visitors.
  tienda_pacifico(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.3, 22, ctx, { wall: 0x4fb3bf, trim: 0xf2c14e });
    box(g, x + 0.5, y + 2.0, 1.9, 0.4, 12, 0x8d6e4a);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const q = iso(x + 0.7 + k * 0.38, y + 2.2, 12);
      g.moveTo(q.x - 1.5, q.y - 9).lineTo(q.x + 1.5, q.y - 9).quadraticCurveTo(q.x + 5, q.y - 6, q.x + 4, q.y - 2).quadraticCurveTo(q.x, q.y + 1, q.x - 4, q.y - 2).quadraticCurveTo(q.x - 5, q.y - 6, q.x - 1.5, q.y - 9).fill(PRODUCTS.werregue_jar.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.moveTo(q.x - 4, q.y - 4.5).lineTo(q.x + 4, q.y - 4.5).stroke({ width: 1, color: 0x2b2018 });
    }
    const sign = iso(x + 1.4, y + 1.5, 44 + ctx.up);
    g.rect(sign.x - 16, sign.y - 6, 32, 9).fill(0xf7f4ee).stroke(OUTLINE);
    g.rect(sign.x - 13, sign.y - 3, 26, 2).fill(0xb23a2a);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.5) + 1) / 2 : 0.3;
      for (const [k, sh] of [[0, 0xe5737f], [1, 0x6cbf6c]]) {
        const p = iso(x + 0.8 + f * 1.4 + k * 0.5, y + 2.85 + k * 0.1);
        worker(anim, p.x, p.y, sh);
      }
    };
    this.animate(0);
  },

  // --- Pacific Coast · Buenaventura (v3.43): port with colorful houses and zinc roofs ---

  // Boardwalk cevichería: zinc-roofed kiosk with foam cooler, ceviche goblets on counter,
  // and seated customers.
  cevicheria(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0 + 0.2, y0 + 0.3, 1.6, 1.0, 12, 0xf7f4ee);
    box(g, x0 + 0.2, y0 + 1.3, 1.6, 0.12, 12, 0x4fb3bf);
    for (const [px, py] of [[0, 0], [2.0, 0], [0, 1.6], [2.0, 1.6]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 30 + ctx.up, 0x8a8f94);
    for (let k = 0; k < 3; k++) {
      const q = iso(x0 + 0.5 + k * 0.5, y0 + 0.8, 12);
      g.moveTo(q.x - 3, q.y - 5).lineTo(q.x + 3, q.y - 5).lineTo(q.x + 1.5, q.y).lineTo(q.x - 1.5, q.y).closePath().fill(0xe8f6ff).stroke({ width: 0.5, color: 0x3a2418 });
      g.ellipse(q.x, q.y - 5, 3, 1.1).fill(PRODUCTS.ceviche.color);
    }
    const cooler = iso(x + 2.6, y + 0.9);
    g.rect(cooler.x - 7, cooler.y - 10, 14, 10).fill(0xffffff).stroke(OUTLINE);
    g.rect(cooler.x - 7, cooler.y - 12, 14, 2.5).fill(0x1e88e5);
    gableRoof(g, x0, y0, 2.0, 1.6, 30 + ctx.up, 8, 0x9aa3a8, 0x8a8f94);
    this.roofTop = iso(x0 + 1, y0 + 0.8, 38 + ctx.up);
    const stools = [[0.4, 2.3], [1.0, 2.4], [1.6, 2.3], [2.2, 2.4]].slice(0, 2 + Math.min(ctx.tier, 2));
    for (const [sx, sy] of stools) {
      const q = iso(x + sx + 0.3, y + sy);
      g.rect(q.x - 0.8, q.y - 7, 1.6, 7).fill(0x555555);
      g.ellipse(q.x, q.y - 7, 3.5, 1.5).fill(0xe5737f);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.0, y0 + 0.15);
      worker(anim, wp.x, wp.y, 0xffffff);
      for (const [k, [sx, sy]] of stools.entries()) {
        if (!this.working && k > 0) continue;
        const q = iso(x + sx + 0.3, y + sy);
        anim.roundRect(q.x - 3, q.y - 15, 6, 8, 2).fill([0xf2c14e, 0x6cbf6c, 0x5c8dd6, 0xe5737f][k]);
        anim.circle(q.x, q.y - 17.5, 2.6).fill(0x6d4c32);
      }
    };
    this.animate(0);
  },

  // Bay hotel: three-story pink-painted brick hotel with balconies and zinc roof; windows
  // glow at night.
  hotel_bahia(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 2.2, 1.5, 44, ctx, { wall: 0xf28c9a, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.5, 1.1, 16, 0x2e6fd1);
    for (const z of [10, 24, 36]) for (const at of [0.35, 1.15]) windowOnRight(this, g, hx, hy, 2.2, at, z, 0xffe0b2);
    for (const z of [20, 33]) balcony(g, hx, hy, 2.2, 1.5, z, 0xf7f4ee);
    for (const at of [0.4, 1.8]) windowOnFront(this, g, hx, hy, 1.5, at, 24, 0xffe0b2);
    const sign = iso(hx + 1.1, hy + 1.5, H - 6);
    g.rect(sign.x - 16, sign.y - 5, 32, 8).fill(0x2e6fd1).stroke(OUTLINE);
    g.rect(sign.x - 12, sign.y - 2.5, 24, 2).fill(0xffffff);
  },

  // Pueblo Nuevo market: roofed market plaza with fish, piangua, plantain, and chontaduro
  // stalls with vendors beneath awnings.
  galeria_pueblo_nuevo(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const stalls = [[0.2, 0.3, 0x5c8dd6], [1.3, 0.3, 0xe5737f], [0.2, 1.4, 0x6cbf6c], [1.3, 1.4, 0xf2c14e]];
    const goods = [PRODUCTS.pargo.color, PRODUCTS.piangua.color, 0x7cb342, 0xe65100];
    // Each stall with vendor (ordered back-to-front so front awnings overlap rear ones).
    for (const [k, [sx, sy, col]] of stalls.entries()) {
      const v = iso(x0 + sx + 0.5, y0 + sy - 0.05);
      worker(g, v.x, v.y, [0xf7f4ee, 0xf2c14e, 0xe5737f, 0x4fb3bf][k]);
      box(g, x0 + sx, y0 + sy, 1.0, 0.6, 9, 0x8d6e4a);
      const q = iso(x0 + sx + 0.5, y0 + sy + 0.3, 9);
      for (let i = 0; i < 4; i++) g.ellipse(q.x - 7 + i * 4.5, q.y - 1 - (i % 2), 2.6, 1.8).fill(goods[k]);
      for (const [px, py] of [[0, 0], [1, 0], [0, 0.6], [1, 0.6]]) box(g, x0 + sx + px - 0.03, y0 + sy + py - 0.03, 0.06, 0.06, 24, 0x6b4a2e);
      g.poly(isoPoly([[x0 + sx - 0.05, y0 + sy - 0.05, 24], [x0 + sx + 1.05, y0 + sy - 0.05, 24], [x0 + sx + 1.05, y0 + sy + 0.65, 22], [x0 + sx - 0.05, y0 + sy + 0.65, 22]])).fill(col).stroke(OUTLINE);
    }
    this.roofTop = iso(x0 + 1.2, y0 + 1.1, 30);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.12 + i * 0.5) % 1;
        const b = iso(x0 + 0.1 + f * 2.2, y0 + 2.3);
        worker(anim, b.x, b.y, i ? 0x8e44ad : 0xf08a3c);
      }
    };
    this.animate(0);
  },

  // Boat lunches: pier shed packing excursion lunch coolers beside hanging life jackets.
  // hanging life jackets and packed coolers.
  loncheras_lancha(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.8, 1.3, 26, ctx, { wall: 0x6cbf6c, roofColor: 0x9aa3a8, roofH: 10 });
    door(g, hx, hy, 1.3, 0.9, 16, 0xf2c14e);
    windowOnRight(this, g, hx, hy, 1.8, 0.65, 12, 0xffe0b2);
    const rack = iso(x + 2.55, y + 1.1, 0);
    g.rect(rack.x - 12, rack.y - 22, 2, 22).fill(0x6b4a2e);
    g.rect(rack.x + 10, rack.y - 22, 2, 22).fill(0x6b4a2e);
    g.moveTo(rack.x - 11, rack.y - 20).lineTo(rack.x + 11, rack.y - 20).stroke({ width: 1.2, color: 0x6b4a2e });
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) g.roundRect(rack.x - 9 + k * 5, rack.y - 19, 4, 8, 1).fill(0xff6f00).stroke({ width: 0.5, color: 0x3a2418 });
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) box(g, x + 0.4 + k * 0.4, y + 2.3, 0.32, 0.25, 7, k % 2 ? 0xffffff : 0x1e88e5);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 1.2 + k * 1.2, y + 2.0);
      worker(anim, p.x, p.y, 0xff6f00);
      if (!back) anim.rect(p.x - 5, p.y - 28, 10, 7).fill(PRODUCTS.lonchera_lancha.color).stroke(OUTLINE);
    };
    this.animate(0);
  },

  // Whale-watching pier: plank dock over sea with launches departing full of tourists in
  // orange life vests; whale breaches in distance.
  salida_ballenas(g, x, y, ctx) {
    // The sea.
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0x2f86a8);
    for (let k = 0; k < 8; k++) {
      const q = iso(x + 0.3 + (k % 4) * 0.7, y + 0.4 + Math.floor(k / 4) * 1.6);
      g.moveTo(q.x - 6, q.y).quadraticCurveTo(q.x, q.y - 2, q.x + 6, q.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.6 });
    }
    // The pier.
    for (let k = 0; k < 7; k++) box(g, x + 0.2 + k * 0.32, y + 1.25, 0.28, 0.5, 3, k % 2 ? PAL.wood : PAL.woodDark, { z: 3 });
    for (const px of [0.2, 1.2, 2.2]) for (const py of [1.25, 1.7]) box(g, x + px, y + py, 0.06, 0.06, 6, PAL.woodDark);
    const sign = iso(x + 0.3, y + 1.5);
    g.rect(sign.x - 1.2, sign.y - 26, 2.4, 22).fill(PAL.wood);
    g.poly([sign.x - 12, sign.y - 26, sign.x + 8, sign.y - 26, sign.x + 13, sign.y - 22, sign.x + 8, sign.y - 18, sign.x - 12, sign.y - 18]).fill(0x2e6fd1).stroke(OUTLINE);
    this.roofTop = iso(x + 1.5, y + 1.4, 24);
    const sea = new Graphics();
    this.anim.addChild(sea);
    const boat = (q, full, sc = 1) => {
      sea.moveTo(q.x - 14 * sc, q.y - 4).quadraticCurveTo(q.x, q.y + 4, q.x + 14 * sc, q.y - 4).lineTo(q.x + 11 * sc, q.y).quadraticCurveTo(q.x, q.y + 5, q.x - 11 * sc, q.y).closePath().fill(0xf7f4ee).stroke(OUTLINE);
      sea.rect(q.x + 10 * sc, q.y - 6, 3, 6).fill(0x37474f);
      if (full) for (let i = 0; i < 4; i++) {
        sea.circle(q.x - 8 * sc + i * 5 * sc, q.y - 7, 2).fill(0xff6f00);
        sea.circle(q.x - 8 * sc + i * 5 * sc, q.y - 10, 1.6).fill(0x6d4c32);
      }
    };
    this.animate = (time) => {
      sea.clear();
      const bob = Math.sin(time * 1.5) * 1;
      boat({ ...iso(x + 1.4, y + 2.15), y: iso(x + 1.4, y + 2.15).y + bob }, false);
      if (this.working) {
        const f = (time * 0.1) % 1;
        const q = iso(x + 0.4 + f * 2.4, y + 0.6 + f * 0.2);
        boat({ x: q.x, y: q.y + Math.sin(time * 2) }, true, 0.9);
      }
      // Leaping humpback whale, occasionally surfacing.
      const k = (time * 0.08) % 1;
      if (k < 0.2) {
        const t = k / 0.2;
        const w = iso(x + 2.4, y + 0.5);
        const hgt = Math.sin(t * Math.PI) * 18;
        sea.ellipse(w.x, w.y - hgt, 9, 4).fill(0x37474f);
        sea.poly([w.x + 7, w.y - hgt, w.x + 14, w.y - hgt - 5, w.x + 13, w.y - hgt + 3]).fill(0x37474f);
        sea.ellipse(w.x, w.y + 1, 10 + t * 8, 3).stroke({ width: 1, color: 0xffffff, alpha: 1 - t });
      }
    };
    this.animate(0);
  },

  // --- Amazon · El Asaizal (v3.47): wooden stilt houses with palm or zinc roofs ---

  // Berry threshing: palm shed shaking bunches over tarp so berries drop beside piled
  // fresh bunches and stripped panicles.
  asai_thresher(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const tarp = isoPoly([[x0 + 0.3, y0 + 0.4], [x0 + 2.0, y0 + 0.4], [x0 + 2.0, y0 + 1.3], [x0 + 0.3, y0 + 1.3]]);
    g.poly(tarp).fill(0x1e88e5).stroke(OUTLINE);
    const mid = iso(x0 + 1.15, y0 + 0.85);
    for (let k = 0; k < 4 + Math.min(ctx.tier, 3) * 2; k++) g.circle(mid.x - 12 + (k * 7) % 24, mid.y - 2 + ((k * 5) % 6) - 3, 1.8).fill(PRODUCTS.asai_fruit.color);
    for (const [bx, by] of [[0.45, 2.4], [0.9, 2.55]]) {
      const q = iso(x + bx, y + by);
      g.ellipse(q.x, q.y - 4, 7, 5).fill(PRODUCTS.asai_bunch.color).stroke(OUTLINE);
      for (let k = 0; k < 5; k++) g.circle(q.x - 5 + k * 2.5, q.y - 7 - (k % 2) * 2, 1.2).fill(0x7e57c2);
    }
    const stems = iso(x + 2.6, y + 2.5);
    for (let k = 0; k < 4; k++) g.moveTo(stems.x - 6 + k * 3, stems.y).lineTo(stems.x - 2 + k * 3, stems.y - 9).stroke({ width: 1.2, color: 0x8d6e4a });
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.15, y0 + 1.55);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      const shake = this.working ? Math.sin(time * 8) * 3 : 0;
      anim.ellipse(wp.x + shake, wp.y - 24, 6, 4).fill(PRODUCTS.asai_bunch.color).stroke({ width: 0.6, color: 0x3a2418 });
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.5 + i / 4) % 1;
        anim.circle(wp.x - 6 + i * 4 + shake, wp.y - 20 + f * 14, 1.4).fill(PRODUCTS.asai_fruit.color);
      }
    };
    this.animate(0);
  },

  // Soaking tanks: blue tanks of warm purple-stained water steaming beside baskets of
  // softened fruit.
  asai_soaker(g, x, y, ctx) {
    const tanks = ctx.tier >= 2 ? [[0.6, 0.7], [1.5, 0.7], [2.4, 0.7], [1.0, 1.7]] : [[0.8, 0.8], [1.8, 0.8], [1.3, 1.8]];
    this.tanks = [];
    for (const [tx, ty] of tanks) {
      const b = iso(x + tx, y + ty);
      shadow(g, b.x + 3, b.y + 1, 12, 5);
      g.rect(b.x - 9, b.y - 18, 18, 18).fill(0x1e88e5).stroke(OUTLINE);
      g.rect(b.x - 6, b.y - 18, 3, 18).fill(0x42a5f5);
      g.ellipse(b.x, b.y - 18, 9, 3.5).fill(0x5e35b1).stroke(OUTLINE);
      this.tanks.push({ x: b.x, y: b.y - 18 });
    }
    const crate = iso(x + 2.6, y + 2.5);
    g.poly([crate.x - 8, crate.y - 8, crate.x + 8, crate.y - 8, crate.x + 7, crate.y, crate.x - 7, crate.y]).fill(0x2e7d32).stroke(OUTLINE);
    for (let k = 0; k < 4; k++) g.circle(crate.x - 5 + k * 3.3, crate.y - 9, 1.6).fill(PRODUCTS.soaked_asai.color);
    this.roofTop = iso(x + 1.5, y + 1.2, 26);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (const [k, t] of this.tanks.entries()) {
        const f = (time * 0.6 + k * 0.3) % 1;
        anim.circle(t.x - 3 + k, t.y - 3 - f * 12, 2 + f * 2).fill({ color: 0xeceff1, alpha: 0.5 * (1 - f) });
        anim.circle(t.x + Math.sin(time * 2 + k) * 4, t.y, 1).fill(0x311b4e);
      }
    };
    this.animate(0);
  },

  // Açaí pulper: zinc-roofed wooden stilt house; porch steel pulper pours purple pulp into bucket.
  // into bucket.
  asai_pulper(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.4, 22, ctx, { wall: 0xa1887f, trim: 0x6cbf6c });
    box(g, x + 2.2, y + 0.6, 0.5, 0.6, 8, 0x8d6e4a);
    const m = iso(x + 2.45, y + 0.9, 8);
    g.rect(m.x - 6, m.y - 14, 12, 14).fill(0xb0bec5).stroke(OUTLINE);
    g.ellipse(m.x, m.y - 14, 6, 2.2).fill(0x90a4ae).stroke(OUTLINE);
    const pail = iso(x + 2.5, y + 1.6);
    g.poly([pail.x - 6, pail.y - 9, pail.x + 6, pail.y - 9, pail.x + 5, pail.y, pail.x - 5, pail.y]).fill(0xffffff).stroke(OUTLINE);
    g.ellipse(pail.x, pail.y - 9, 6, 2).fill(PRODUCTS.asai_pulp.color);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x + 2.95, y + 1.0);
      worker(anim, wp.x, wp.y, 0xe5737f);
      const turn = this.working ? time * 6 : 0;
      anim.moveTo(m.x, m.y - 14).lineTo(m.x + Math.cos(turn) * 5, m.y - 14 + Math.sin(turn) * 2).stroke({ width: 1.4, color: 0x37474f });
      if (!this.working) return;
      const f = (time * 2) % 1;
      anim.moveTo(m.x + 4, m.y - 4).lineTo(pail.x, pail.y - 9 + f).stroke({ width: 2, color: PRODUCTS.asai_pulp.color });
    };
    this.animate(0);
  },

  // Blender stand: light-green stilt booth with counter blender, bowls of whipped açaí,
  // and drinking customer.
  asai_blender(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.8, 1.3, 20, ctx, { wall: 0x9ccc65, trim: 0xf7f4ee, roofColor: 0xc9a96b });
    box(g, x + 0.5, y + 2.0, 1.8, 0.4, 10, 0x8d6e4a);
    const bl = iso(x + 0.9, y + 2.2, 10);
    g.rect(bl.x - 4, bl.y - 14, 8, 14).fill(0xe8f6ff).stroke(OUTLINE);
    g.rect(bl.x - 4, bl.y - 9, 8, 9).fill(PRODUCTS.asai_shake.color);
    g.rect(bl.x - 5, bl.y - 16, 10, 2.5).fill(0x37474f);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x + 1.3 + k * 0.25, y + 2.2, 10);
      g.rect(q.x - 2, q.y - 7, 4, 7).fill(PRODUCTS.asai_shake.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.rect(q.x - 2, q.y - 8, 4, 1.4).fill(0xe8d9a0);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x + 1.4, y + 2.85);
      worker(anim, wp.x, wp.y, 0x4fb3bf);
      if (!this.working) return;
      const sp = time * 20;
      anim.moveTo(bl.x - 3, bl.y - 5).lineTo(bl.x + Math.cos(sp) * 3, bl.y - 5 + Math.sin(sp)).stroke({ width: 1, color: 0xe1bee7 });
    };
    this.animate(0);
  },

  // Açaí packer: large white stilt house with belt filling purple pulp bags beside freezer.
  // beside freezer.
  asai_bagger(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.0, 1.4, 22, ctx, { wall: 0xf7f4ee, trim: 0x7b1fa2 });
    box(g, x + 0.4, y + 2.15, 2.0, 0.35, 8, 0x555555);
    box(g, x + 2.5, y + 1.6, 0.45, 0.6, 10, 0xeceff1);
    const hopper = iso(x + 0.9, y + 2.32, 20);
    g.poly([hopper.x - 7, hopper.y - 8, hopper.x + 7, hopper.y - 8, hopper.x + 3, hopper.y, hopper.x - 3, hopper.y]).fill(0x8a8f94).stroke(OUTLINE);
    g.ellipse(hopper.x, hopper.y - 8, 7, 2).fill(PRODUCTS.asai_pulp.color);
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.35 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.8, y + 2.32, 8);
        const full = f > 0.3;
        belt.roundRect(p.x - 4, p.y - 10, 8, 10, 1.5).fill(full ? PRODUCTS.asai_bag.color : 0xf3e5f5).stroke(OUTLINE);
      }
      if (!this.working) return;
      const f = (time * 2) % 1;
      belt.moveTo(hopper.x, hopper.y + 1).lineTo(hopper.x, hopper.y + 3 + f * 4).stroke({ width: 1.6, color: PRODUCTS.asai_pulp.color });
    };
  },

  // Açaí depot: zinc-roofed stilt warehouse stacked with foam coolers and porter hauling boxes.
  // carrying boxes to yard.
  asai_boxer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.4, 1.5, 24, ctx, { wall: 0xbcaaa4, trim: 0xf7f4ee, roofH: 14 });
    const stack = (bx, by, rows) => {
      for (let r = 0; r < rows; r++) for (let k = 0; k < rows - r; k++) box(g, x + bx + k * 0.3 + r * 0.15, y + by, 0.26, 0.26, 7, 0xeceff1, { z: r * 7 });
    };
    stack(1.3, 2.35, 3);
    if (ctx.tier >= 2) stack(2.2, 2.6, 2);
    const carrier = new Graphics();
    this.anim.addChild(carrier);
    this.animate = (time) => {
      carrier.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 0.5 + k * 0.9, y + 2.2 + k * 0.5);
      worker(carrier, p.x, p.y, 0x7b1fa2);
      if (!back) carrier.rect(p.x - 6, p.y - 30, 12, 9).fill(0xeceff1).stroke(OUTLINE);
    };
  },

  // --- Amazon · El Ajizal (v3.48): black chili kitchen in wooden stilt houses ---

  // Chili wash: palm shed with water trough; worker rinses chilies wearing gloves and drains
  // them in basket.
  aji_washer(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.4, y0 + 0.6, 1.6, 0.7, 9, 0x8d6e4a);
    const tub = iso(x0 + 1.2, y0 + 0.95, 9);
    g.ellipse(tub.x, tub.y, 18, 6).fill(0x6d4c41).stroke(OUTLINE);
    g.ellipse(tub.x, tub.y, 15, 4.5).fill(0x4fa3c7);
    const basket = iso(x + 2.6, y + 2.3);
    g.poly([basket.x - 9, basket.y - 9, basket.x + 9, basket.y - 9, basket.x + 7, basket.y, basket.x - 7, basket.y]).fill(0xc8a26a).stroke(OUTLINE);
    for (let k = 0; k < 5; k++) g.ellipse(basket.x - 6 + k * 3, basket.y - 10, 1.4, 2.6).fill([0xe53935, 0xfbc02d, 0x8e24aa][k % 3]);
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < 4; k++) {
        const bob = this.working ? Math.sin(time * 3 + k * 2) * 1.2 : 0;
        anim.ellipse(tub.x - 9 + k * 6, tub.y - 1 + bob, 1.3, 2.4).fill([0xe53935, 0xfbc02d, 0xe53935, 0x8e24aa][k]);
      }
      const wp = iso(x0 + 1.2, y0 + 1.75);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      if (!this.working) return;
      anim.moveTo(tub.x - 12 + Math.sin(time * 5) * 3, tub.y - 1).lineTo(tub.x - 6 + Math.sin(time * 5) * 3, tub.y - 1).stroke({ width: 1, color: 0xe8f6ff });
    };
    this.animate(0);
  },

  // Chili mill: blue wooden stilt house with hand grinder on porch dripping red paste into bowl.
  // bowl.
  aji_grinder(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.3, 20, ctx, { wall: 0x5c8dd6, trim: 0xf7f4ee, roofColor: 0xc9a96b, lift: 8 });
    box(g, x + 2.2, y + 0.5, 0.45, 1.2, 9, 0x8d6e4a);
    const mill = iso(x + 2.42, y + 0.9, 9);
    g.rect(mill.x - 4, mill.y - 14, 8, 14).fill(0x90a4ae).stroke(OUTLINE);
    g.rect(mill.x - 6, mill.y - 17, 12, 3).fill(0xb0bec5).stroke(OUTLINE);
    const bowl = iso(x + 2.42, y + 1.5, 9);
    g.ellipse(bowl.x, bowl.y, 7, 2.6).fill(0xcfd8dc).stroke(OUTLINE);
    g.ellipse(bowl.x, bowl.y - 0.5, 5, 1.6).fill(PRODUCTS.ground_aji.color);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const turn = this.working ? time * 4 : 0;
      const c = { x: mill.x + 6, y: mill.y - 9 };
      anim.moveTo(c.x, c.y).lineTo(c.x + Math.cos(turn) * 6, c.y + Math.sin(turn) * 3).stroke({ width: 1.6, color: 0x607d8b });
      anim.circle(c.x + Math.cos(turn) * 6, c.y + Math.sin(turn) * 3, 1.6).fill(0x8d6e4a);
      const wp = iso(x + 2.95, y + 1.1);
      worker(anim, wp.x, wp.y, 0xe5737f);
      if (!this.working) return;
      anim.moveTo(mill.x, mill.y).lineTo(bowl.x, bowl.y - 1).stroke({ width: 1.6, color: PRODUCTS.ground_aji.color });
    };
    this.animate(0);
  },

  // Tucupí pot: palm-roofed stilt kitchen boiling chilies for days in cassava juice turning black.
  // turns black.
  tucupi_pot(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 1.9, 1.3, 22, ctx, { wall: 0xa1887f, trim: 0xf2c14e, roofColor: 0xc9a96b });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pot = iso(x + 2.1, y + 2.35, 10);
    g.moveTo(pot.x - 10, pot.y - 12).lineTo(pot.x - 9, pot.y).quadraticCurveTo(pot.x, pot.y + 4, pot.x + 9, pot.y).lineTo(pot.x + 10, pot.y - 12).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 12, 10, 3.5).fill(PRODUCTS.aji_negro.color).stroke(OUTLINE);
    // Hanging tipití squeezer (for extracting cassava juice) and firewood.
    const tp = iso(x + 0.6, y + 2.4, 0);
    g.moveTo(tp.x, tp.y - 30).lineTo(tp.x, tp.y - 26).stroke({ width: 1, color: 0x6d4c41 });
    g.roundRect(tp.x - 2.5, tp.y - 26, 5, 22, 2).fill(0xc9a96b).stroke(OUTLINE);
    for (let k = 0; k < 5; k++) g.moveTo(tp.x - 2.5, tp.y - 24 + k * 4).lineTo(tp.x + 2.5, tp.y - 22 + k * 4).stroke({ width: 0.6, color: 0x8d6e4a });
    for (let k = 0; k < 3; k++) box(g, x + 0.9 + k * 0.08, y + 2.6 - k * 0.05, 0.6, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    this.smokePoints = [{ x: pot.x, y: pot.y - 20 }];
    const fire = iso(x + 2.1, y + 2.72, 3);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      const wp = iso(x + 1.45, y + 2.95);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
      const stir = this.working ? time * 2 : 0;
      anim.moveTo(pot.x + Math.cos(stir) * 5, pot.y - 12 + Math.sin(stir) * 1.5).lineTo(pot.x - 8, pot.y - 28).stroke({ width: 1.8, color: 0xbc8a5f });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) anim.circle(pot.x - 5 + i * 5, pot.y - 13 - ((time * 1.5 + i * 0.3) % 1) * 3, 1).fill({ color: 0x6d4c41, alpha: 0.9 });
    };
    this.animate(0);
  },

  // Black-chili jar line: large yellow stilt house capping wooden-lidded jars at porch table.
  // capped with wooden lids.
  aji_packer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.4, 22, ctx, { wall: 0xf2c14e, trim: 0x2e7d32 });
    box(g, x + 0.4, y + 2.15, 2.0, 0.35, 8, 0x8d6e4a);
    const tap = iso(x + 0.9, y + 2.32, 22);
    g.rect(tap.x - 5, tap.y - 10, 10, 10).fill(PRODUCTS.aji_negro.color).stroke(OUTLINE);
    for (let k = 0; k < 1 + Math.min(ctx.tier, 2); k++) box(g, x + 2.5, y + 0.6 + k * 0.4, 0.32, 0.32, 8, PRODUCTS.aji_box.color);
    const belt = new Graphics();
    this.anim.addChild(belt);
    this.animate = (time) => {
      belt.clear();
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.3 + i / 4) % 1;
        const p = iso(x + 0.45 + f * 1.8, y + 2.32, 8);
        const full = f > 0.3;
        belt.rect(p.x - 2.5, p.y - 9, 5, 9).fill(full ? PRODUCTS.aji_negro.color : 0xe8f6ff).stroke(OUTLINE);
        belt.rect(p.x - 2.5, p.y - 11, 5, 2.2).fill(f > 0.55 ? 0x8d6e4a : 0xe8f6ff);
      }
      if (!this.working) return;
      const f = (time * 2) % 1;
      belt.moveTo(tap.x, tap.y + 1).lineTo(tap.x, tap.y + 4 + f * 3).stroke({ width: 1.4, color: PRODUCTS.aji_negro.color });
    };
  },

  // --- Amazon · El Lago (v3.49): pirarucu fishermen port on Lake Tarapoto ---

  // Pirarucu cleaning: lakeside palm shed with long table holding giant fish; fisherman
  // cuts with machete beside lake buckets and waiting heron.
  pirarucu_cleaner(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.2, y0 + 0.6, 2.0, 0.6, 9, 0x8d6e4a);
    const top = iso(x0 + 1.2, y0 + 0.9, 9);
    for (let k = 0; k < 1 + Math.min(ctx.tier, 2); k++) g.rect(top.x - 16 + k * 6, top.y - 4 - (k % 2), 5, 4).fill(PRODUCTS.clean_pirarucu.color).stroke({ width: 0.5, color: 0x3a2418 });
    for (const [bx, by] of [[0.45, 2.45], [0.95, 2.6]]) {
      const b = iso(x + bx, y + by);
      g.poly([b.x - 6, b.y - 10, b.x + 6, b.y - 10, b.x + 5, b.y, b.x - 5, b.y]).fill(0x2e7d32).stroke(OUTLINE);
      g.ellipse(b.x, b.y - 10, 6, 2).fill(0x365a50);
    }
    ramada(this, g, x0, y0, 2.4, 1.5, 28 + ctx.up, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.2, y0 + 1.55);
      worker(anim, wp.x, wp.y, 0xf2c14e);
      // Whole pirarucu, long body and red tail.
      anim.ellipse(top.x + 8, top.y - 3, 13, 3.6).fill(PRODUCTS.pirarucu.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.7 });
      anim.ellipse(top.x + 15, top.y - 3, 5, 3).fill(0xc62828);
      anim.poly([top.x + 20, top.y - 3, top.x + 25, top.y - 7, top.x + 25, top.y + 1]).fill(0xc62828);
      const bird = iso(x + 2.7, y + 2.3);
      const hop = this.working ? Math.abs(Math.sin(time * 2)) * 2 : 0;
      anim.moveTo(bird.x, bird.y).lineTo(bird.x, bird.y - 8).stroke({ width: 0.8, color: 0x37474f });
      anim.ellipse(bird.x, bird.y - 11 - hop, 4.5, 3).fill(0xf7f4ee).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      anim.moveTo(bird.x - 3, bird.y - 12 - hop).lineTo(bird.x - 4, bird.y - 19 - hop).stroke({ width: 1.4, color: 0xf7f4ee });
      anim.poly([bird.x - 4, bird.y - 20 - hop, bird.x - 11, bird.y - 18 - hop, bird.x - 4, bird.y - 18.5 - hop]).fill(0xfbc02d);
      if (!this.working) return;
      const f = (time * 1.6) % 1;
      anim.moveTo(top.x - 2 + f * 12, top.y - 9).lineTo(top.x + 4 + f * 12, top.y - 14).stroke({ width: 1.6, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Salting racks: sunny poles draped with butterflied salted pirarucu beside salt sacks.
  // salt sacks.
  pirarucu_salter(g, x, y, ctx) {
    const rows = ctx.tier >= 2 ? [0.5, 1.3, 2.1] : [0.7, 1.7];
    this.lines = [];
    for (const ry of rows) {
      const a = iso(x + 0.4, y + ry, 0);
      const b = iso(x + 2.6, y + ry, 0);
      for (const p of [a, b]) g.rect(p.x - 1.2, p.y - 24, 2.4, 24).fill(0x6b4a2e);
      g.moveTo(a.x, a.y - 22).lineTo(b.x, b.y - 22).stroke({ width: 1.4, color: 0x8d6e4a });
      this.lines.push([a, b]);
    }
    for (const [sx, sy] of [[2.7, 2.6], [2.35, 2.75]]) sack(g, x + sx, y + sy, 0, 0xffffff);
    this.roofTop = iso(x + 1.5, y + 1.3, 30);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, [a, b]] of this.lines.entries()) {
        for (let i = 0; i < 3; i++) {
          const f = (i + 0.5) / 3;
          const sway = this.working ? Math.sin(time * 1.2 + i + k) * 0.8 : 0;
          const px = a.x + (b.x - a.x) * f + sway;
          const py = a.y + (b.y - a.y) * f - 21;
          anim.poly([px - 7, py, px + 7, py, px + 6, py + 15, px - 6, py + 15]).fill(PRODUCTS.salted_pirarucu.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
          anim.moveTo(px - 5, py + 7).lineTo(px + 5, py + 7).stroke({ width: 0.6, color: 0xb89a6a });
        }
      }
    };
    this.animate(0);
  },

  // Pirarucu filleter: palm-roofed stilt house slicing steaks on porch table to pass next door
  // to the Moquén grill.
  pirarucu_filleter(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.3, 20, ctx, { wall: 0x8fbf9f, trim: 0xf7f4ee, roofColor: 0xc9a96b, lift: 8 });
    box(g, x + 2.2, y + 0.5, 0.45, 1.2, 9, 0x8d6e4a);
    const t = iso(x + 2.42, y + 1.1, 9);
    for (let k = 0; k < 3; k++) g.rect(t.x - 7 + k * 5, t.y - 2 + k * 2, 4, 3.4).fill(PRODUCTS.pirarucu_fillet.color).stroke({ width: 0.5, color: 0x4e5b4a });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.ellipse(t.x - 2, t.y - 6, 9, 2.6).fill(PRODUCTS.clean_pirarucu.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.7 });
      const wp = iso(x + 2.95, y + 1.1);
      worker(anim, wp.x, wp.y, 0x2e7d32);
      if (!this.working) return;
      const f = (time * 2.2) % 1;
      anim.moveTo(t.x - 7 + f * 10, t.y - 9).lineTo(t.x - 3 + f * 10, t.y - 14).stroke({ width: 1.6, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Moquén smoker: tall vine-lashed wooden grid over embers slow-smoking pirarucu steaks
  // Indigenous-style beside firewood.
  moquen(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    const n = ctx.tier >= 2 ? 2 : 1;
    this.grills = [];
    for (let k = 0; k < n; k++) {
      const gx = x0 + k * 1.1;
      for (const [px, py] of [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]]) box(g, gx + px - 0.04, y0 + py - 0.04, 0.08, 0.08, 22, 0x6b4a2e);
      const grill = iso(gx + 0.45, y0 + 0.45, 20);
      g.poly([grill.x - 16, grill.y, grill.x, grill.y - 8, grill.x + 16, grill.y, grill.x, grill.y + 8]).fill({ color: 0x4e342e, alpha: 0.35 });
      for (let i = -2; i <= 2; i++) g.moveTo(grill.x - 14 + Math.abs(i) * 3, grill.y + i * 3).lineTo(grill.x + 14 - Math.abs(i) * 3, grill.y + i * 3).stroke({ width: 1.2, color: 0x6d4c2e });
      this.grills.push(grill);
      const fire = iso(gx + 0.45, y0 + 0.45, 0);
      g.ellipse(fire.x, fire.y, 8, 3).fill(0x212121);
    }
    for (let k = 0; k < 3; k++) box(g, x + 0.4 + k * 0.08, y + 2.55 - k * 0.05, 0.9, 0.1, 3, 0x6b4a2e, { z: k * 3 });
    this.smokePoints = this.grills.map((p) => ({ x: p.x, y: p.y - 8 }));
    this.roofTop = iso(x0 + 0.45, y0 + 0.45, 40);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, p] of this.grills.entries()) {
        const fire = iso(x0 + k * 1.1 + 0.45, y0 + 0.45, 0);
        anim.poly([fire.x - 5, fire.y, fire.x, fire.y - 8 - (this.working ? Math.sin(time * 9 + k) * 2 : 0), fire.x + 5, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
        for (let i = 0; i < 3; i++) anim.rect(p.x - 10 + i * 7, p.y - 3 + (i % 2) * 2, 6, 4).fill(PRODUCTS.moqueado.color).stroke({ width: 0.5, color: 0x3a2418 });
      }
    };
    this.animate(0);
  },

  // Pirarucu kitchen: palm-roofed stilt kitchen cooking steaks in black chili from El Ajizal.
  // from El Ajizal.
  pirarucu_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 2.0, 1.3, 22, ctx, { wall: 0xd98b4a, trim: 0xf7f4ee, roofColor: 0xc9a96b });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pan = iso(x + 2.1, y + 2.35, 10);
    g.ellipse(pan.x, pan.y - 2, 12, 4.5).fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y - 2.5, 10, 3.4).fill(0x5d4037);
    g.moveTo(pan.x + 12, pan.y - 2).lineTo(pan.x + 20, pan.y - 5).stroke({ width: 1.8, color: 0x37474f });
    // Jars of black chili and cassava flatbread on table.
    box(g, x + 0.45, y + 2.2, 0.9, 0.45, 8, 0x8d6e4a);
    const t = iso(x + 0.9, y + 2.42, 8);
    g.ellipse(t.x - 5, t.y - 2, 5, 2).fill(0xf3e3b8).stroke({ width: 0.5, color: 0x3a2418 });
    for (let k = 0; k < 2; k++) g.rect(t.x + 2 + k * 4, t.y - 8, 3, 6).fill(PRODUCTS.aji_negro.color).stroke({ width: 0.5, color: 0x3a2418 });
    this.smokePoints = [{ x: pan.x, y: pan.y - 12 }];
    const fire = iso(x + 2.1, y + 2.72, 3);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 5 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      const flip = this.working ? Math.max(0, Math.sin(time * 2)) * 4 : 0;
      anim.rect(pan.x - 5, pan.y - 5 - flip, 10, 4).fill(PRODUCTS.pirarucu_aji.color).stroke({ width: 0.5, color: 0x3a2418 });
      const wp = iso(x + 1.45, y + 2.95);
      worker(anim, wp.x, wp.y, 0xf7f4ee);
    };
    this.animate(0);
  },

  // --- Amazon · La Casabería (v3.50): bitter cassava to casabe in chagra and maloca ---

  // Cassava peeler: palm shed with water basin; worker peels roots by knife beside peel heap
  // (unpeeled root heap grows at milestones).
  yuca_peeler(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.4, y0 + 0.6, 1.6, 0.7, 9, 0x8d6e4a);
    const tub = iso(x0 + 1.2, y0 + 0.95, 9);
    g.ellipse(tub.x, tub.y, 18, 6).fill(0x6d4c41).stroke(OUTLINE);
    g.ellipse(tub.x, tub.y, 15, 4.5).fill(0x5a9aa0);
    const pile = iso(x + 2.6, y + 2.3);
    for (let k = 0; k < 4 + Math.min(ctx.tier, 3) * 2; k++) {
      const px = pile.x - 8 + (k % 4) * 5;
      const py = pile.y - 2 - Math.floor(k / 4) * 3;
      g.ellipse(px, py, 4.5, 1.6).fill(PRODUCTS.yuca_brava.color).stroke({ width: 0.5, color: 0x3a2418 });
    }
    const peels = iso(x + 0.5, y + 2.6);
    for (let k = 0; k < 5; k++) g.moveTo(peels.x - 6 + k * 3, peels.y - 1).quadraticCurveTo(peels.x - 4 + k * 3, peels.y - 4, peels.x - 2 + k * 3, peels.y).stroke({ width: 1.4, color: 0x8d5a32 });
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < 3; k++) {
        const bob = this.working ? Math.sin(time * 2.5 + k * 2) * 0.8 : 0;
        anim.ellipse(tub.x - 7 + k * 7, tub.y - 1 + bob, 4, 1.4).fill(PRODUCTS.peeled_yuca.color).stroke({ width: 0.4, color: 0x8d6e4a });
      }
      const wp = iso(x0 + 1.2, y0 + 1.75);
      worker(anim, wp.x, wp.y, 0xe5737f);
      if (!this.working) return;
      const f = (time * 2) % 1;
      anim.moveTo(tub.x + 10, tub.y - 6 + f * 3).lineTo(tub.x + 14, tub.y - 9 + f * 3).stroke({ width: 1.2, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Cassava grater: palm-roofed stilt house with wooden canoe trough holding tin grater turning
  // roots into mash.
  yuca_grater(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 1.7, 1.3, 20, ctx, { wall: 0xb08850, trim: 0xf7f4ee, roofColor: 0xc9a96b, lift: 8 });
    const a = iso(x + 2.05, y + 0.6, 4);
    const b = iso(x + 2.05, y + 2.2, 4);
    g.moveTo(a.x - 4, a.y - 3).lineTo(b.x - 4, b.y - 3).lineTo(b.x + 6, b.y).lineTo(a.x + 6, a.y).closePath().fill(0x8d5a32).stroke(OUTLINE);
    g.moveTo(a.x - 1, a.y - 1).lineTo(b.x - 1, b.y - 1).lineTo(b.x + 3, b.y).lineTo(a.x + 3, a.y).closePath().fill(PRODUCTS.grated_yuca.color);
    const gr = iso(x + 2.05, y + 1.3, 10);
    g.poly([gr.x - 5, gr.y - 2, gr.x + 3, gr.y - 8, gr.x + 6, gr.y - 2, gr.x - 2, gr.y + 4]).fill(0xb0bec5).stroke(OUTLINE);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const rub = this.working ? Math.sin(time * 8) * 3 : 0;
      anim.ellipse(gr.x + rub, gr.y - 4 - rub * 0.5, 4, 1.6).fill(PRODUCTS.peeled_yuca.color).stroke({ width: 0.4, color: 0x8d6e4a });
      const wp = iso(x + 2.75, y + 1.3);
      worker(anim, wp.x, wp.y, 0x6cbf6c);
      if (!this.working) return;
      for (let i = 0; i < 3; i++) anim.circle(gr.x - 2 + i * 2, gr.y + 2 + ((time * 3 + i * 0.3) % 1) * 4, 0.8).fill(0xffffff);
    };
    this.animate(0);
  },

  // Tipití press: timber frame hanging woven palm squeeze-tube full of mash; worker sits on
  // lever pole draining juice (which boils into tucupí) into gourd. Second press at milestones.
  tipiti_press(g, x, y, ctx) {
    const n = ctx.tier >= 2 ? 2 : 1;
    this.frames = [];
    for (let k = 0; k < n; k++) {
      const fx = x + 0.9 + k * 1.2;
      const fy = y + 1.4 - k * 0.2;
      const p = iso(fx, fy, 0);
      for (const dx of [-12, 12]) g.rect(p.x + dx - 1.4, p.y - 46, 2.8, 46).fill(0x6b4a2e).stroke({ width: 0.6, color: 0x3a2418 });
      g.rect(p.x - 14, p.y - 48, 28, 3).fill(0x6b4a2e).stroke({ width: 0.6, color: 0x3a2418 });
      g.ellipse(p.x + 6, p.y - 1, 5, 2).fill(0x5d4037).stroke({ width: 0.5, color: 0x3a2418 });
      this.frames.push(p);
    }
    for (const [sx, sy] of [[2.6, 2.6], [2.25, 2.75]]) sack(g, x + sx, y + sy, 0, PRODUCTS.pressed_yuca.color);
    this.roofTop = iso(x + 1.5, y + 1.3, 50);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, p] of this.frames.entries()) {
        const s = this.working ? (Math.sin(time * 1.5 + k) + 1) * 2.5 : 0;
        const top = p.y - 45;
        const bot = p.y - 18 + s;
        const w = 4.5 - s * 0.3;
        anim.moveTo(p.x - w, top).lineTo(p.x + w, top).lineTo(p.x + w * 0.8, bot).lineTo(p.x - w * 0.8, bot).closePath().fill(0xd9b26a).stroke({ width: 0.6, color: 0x3a2418 });
        for (let i = 1; i < 6; i++) anim.moveTo(p.x - w, top + (bot - top) * i / 6).lineTo(p.x + w, top + (bot - top) * (i + 0.5) / 6).stroke({ width: 0.5, color: 0xa07a3e });
        anim.moveTo(p.x, bot).lineTo(p.x, bot + 4).stroke({ width: 1, color: 0x6d4c41 });
        anim.moveTo(p.x - 14, bot + 4).lineTo(p.x + 16, bot + 6).stroke({ width: 2.4, color: 0x8d5a32 });
        worker(anim, p.x + 16, p.y + 4, 0xe5737f);
        if (this.working) anim.moveTo(p.x + 1, bot).lineTo(p.x + 5, p.y - 2).stroke({ width: 1, color: 0xf4d03f, alpha: 0.8 });
      }
    };
    this.animate(0);
  },

  // Casabe griddle: open palm kitchen with clay budare plate over three stones and fire;
  // worker spreads mash, flips flatcakes, and dries rounds beside it on mat.
  casabe_budare(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const c = iso(x0 + 1.1, y0 + 0.9, 0);
    for (const [dx, dy] of [[-12, 2], [12, 2], [0, 7]]) g.ellipse(c.x + dx, c.y + dy - 2, 4, 3).fill(0x78716c).stroke({ width: 0.6, color: 0x3a2418 });
    g.ellipse(c.x, c.y - 8, 22, 9).fill(0x8d4a2f).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 9, 19, 7.5).fill(0x5d3a28);
    // Casabe flatcakes drying on woven mat.
    const mat = iso(x + 2.5, y + 2.5, 0);
    g.poly([mat.x - 16, mat.y, mat.x, mat.y - 8, mat.x + 16, mat.y, mat.x, mat.y + 8]).fill(0xc9a96b).stroke({ width: 0.6, color: 0x3a2418 });
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) g.ellipse(mat.x - 6 + (k % 2) * 10, mat.y - 2 + Math.floor(k / 2) * 3 - (k % 2) * 2, 6, 2.6).fill(PRODUCTS.casabe.color).stroke({ width: 0.5, color: 0x8d6e4a });
    ramada(this, g, x0, y0, 2.2, 1.8, 30 + ctx.up, 0xc9a96b);
    this.smokePoints = [{ x: c.x, y: c.y - 20 }];
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([c.x - 6, c.y + 1, c.x - 2, c.y - 4 - (this.working ? Math.sin(time * 9) * 1.5 : 0), c.x + 2, c.y + 1]).fill(this.working ? 0xff7043 : 0x5d4037);
      anim.poly([c.x + 2, c.y + 1, c.x + 6, c.y - 3 - (this.working ? Math.sin(time * 7) * 1.5 : 0), c.x + 10, c.y + 1]).fill(this.working ? 0xffa726 : 0x5d4037);
      const flip = this.working ? Math.abs(Math.sin(time * 1.2)) : 0;
      anim.ellipse(c.x, c.y - 9.5 - flip * 6, 15, 6 * (1 - flip * 0.8)).fill(flip > 0.5 ? 0xe8cf94 : PRODUCTS.casabe.color).stroke({ width: 0.5, color: 0x8d6e4a });
      const wp = iso(x0 + 1.9, y0 + 1.6);
      worker(anim, wp.x, wp.y, 0xf2c14e);
    };
    this.animate(0);
  },

  // Breakfast diner: seafoam-green stilt house with porch tables serving casabe alongside
  // açaí from Asaizal and moving waitress.
  desayuno_table(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.3, 22, ctx, { wall: 0x4fb3bf, trim: 0xf2c14e, roofColor: 0xc9a96b });
    const tables = ctx.tier >= 2 ? [[0.7, 2.2], [1.6, 2.2], [2.5, 2.2]] : [[0.9, 2.2], [2.0, 2.2]];
    this.plates = [];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 9, 0x8d6e4a);
      const q = iso(x + tx, y + ty, 9);
      g.ellipse(q.x - 3, q.y, 4.5, 1.8).fill(PRODUCTS.casabe.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.rect(q.x + 3, q.y - 6, 3.4, 6).fill(PRODUCTS.asai_bag.color).stroke({ width: 0.5, color: 0x3a2418 });
      this.plates.push(q);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, q] of this.plates.entries()) worker(anim, q.x + (k % 2 ? 10 : -10), q.y + 10, [0xe5737f, 0x6cbf6c, 0xf2c14e][k % 3]);
      const f = this.working ? (Math.sin(time * 0.7) + 1) / 2 : 0.5;
      const w = iso(x + 0.6 + f * 2, y + 2.75);
      worker(anim, w.x, w.y, 0xffffff);
      anim.rect(w.x + 3, w.y - 20, 3, 5).fill(PRODUCTS.asai_bag.color).stroke({ width: 0.5, color: 0x3a2418 });
    };
    this.animate(0);
  },

  // Maloca: grand circular communal longhouse with palm thatch reaching nearly to ground and
  // painted bark facade; outside, fire and crowd gathering for pirarucu feast.
  maloca(g, x, y, ctx) {
    const c = iso(x + 1.4, y + 1.2, 0);
    const rx = 52;
    const ry = 26;
    g.ellipse(c.x, c.y, rx, ry).fill(0x8d6e4a).stroke(OUTLINE);
    const wallH = 10;
    g.moveTo(c.x - rx * 0.92, c.y).lineTo(c.x - rx * 0.92, c.y - wallH).quadraticCurveTo(c.x, c.y + ry * 0.9 - wallH, c.x + rx * 0.92, c.y - wallH).lineTo(c.x + rx * 0.92, c.y).quadraticCurveTo(c.x, c.y + ry * 0.9, c.x - rx * 0.92, c.y).fill(0x6b4a2e).stroke(OUTLINE);
    // Conical palm roof swooping nearly to ground.
    const H = 46 + ctx.up;
    const eave = c.y - wallH + 2;
    g.moveTo(c.x - rx * 1.05, eave).lineTo(c.x, eave - H).lineTo(c.x + rx * 1.05, eave).quadraticCurveTo(c.x, eave + ry * 0.95, c.x - rx * 1.05, eave).fill(0xc9a96b).stroke(OUTLINE);
    for (let k = 1; k < 5; k++) g.moveTo(c.x - rx * 1.05 * (1 - k / 5), eave - H * k / 5).quadraticCurveTo(c.x, eave - H * k / 5 + ry * 0.95 * (1 - k / 5), c.x + rx * 1.05 * (1 - k / 5), eave - H * k / 5).stroke({ width: 0.8, color: 0xa1854f });
    // Painted bark-cloth front wall with doorway.
    const fy = c.y + ry * 0.55;
    g.poly([c.x - 14, fy - 2, c.x + 14, fy - 2, c.x + 12, fy - 26, c.x, fy - 34, c.x - 12, fy - 26]).fill(0xe8d9b5).stroke(OUTLINE);
    for (const [ox, col] of [[-8, 0x3e2723], [8, 0x3e2723], [0, 0xc62828]]) g.poly([c.x + ox - 3, fy - 22, c.x + ox, fy - 27, c.x + ox + 3, fy - 22, c.x + ox, fy - 17]).fill(col);
    g.moveTo(c.x - 12, fy - 12).lineTo(c.x - 6, fy - 15).lineTo(c.x, fy - 12).lineTo(c.x + 6, fy - 15).lineTo(c.x + 12, fy - 12).stroke({ width: 1.2, color: 0xc62828 });
    g.rect(c.x - 4, fy - 11, 8, 9).fill(0x3e2723);
    this.roofTop = { x: c.x, y: eave - H };
    const fire = iso(x + 2.7, y + 2.7, 0);
    for (const [dx, dy] of [[-5, 0], [5, 0], [0, 3]]) g.ellipse(fire.x + dx, fire.y + dy, 2.6, 1.8).fill(0x78716c);
    this.smokePoints = [{ x: fire.x, y: fire.y - 10 }];
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      anim.poly([fire.x - 4, fire.y, fire.x, fire.y - 7 - (this.working ? Math.sin(time * 9) * 1.5 : 0), fire.x + 4, fire.y]).fill(this.working ? 0xff7043 : 0x5d4037);
      const n = this.working ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const f = this.working ? (time * 0.15 + k / 3) % 1 : 0.3;
        const p = iso(x + 0.3 + f * 1.4, y + 2.9 - f * 0.2, 0);
        worker(anim, p.x, p.y, [0xc62828, 0xf2c14e, 0x6cbf6c][k]);
        anim.ellipse(p.x + 4, p.y - 18, 5, 2).fill(k === 1 ? PRODUCTS.casabe.color : PRODUCTS.clean_pirarucu.color).stroke({ width: 0.5, color: 0x3a2418 });
      }
    };
    this.animate(0);
  },

  // --- Amazon · La Yanchama (v3.51): bark cloth and Ticuna masks ---

  // Bark soaking: spring-fed log pit where bark strips soften weighted under stones; artisan
  // lifts a strip onto drying pole.
  bark_soaker(g, x, y, ctx) {
    const c = iso(x + 1.3, y + 1.2, 0);
    g.ellipse(c.x, c.y, 36, 17).fill(0x6d4c41).stroke(OUTLINE);
    g.ellipse(c.x, c.y, 32, 14.5).fill(0x4f8f96);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      g.rect(c.x + Math.cos(a) * 34 - 1, c.y + Math.sin(a) * 16 - 8, 2.2, 8).fill(0x6b4a2e);
    }
    const n = 3 + Math.min(ctx.tier, 2);
    for (let k = 0; k < n; k++) {
      const dy = -8 + k * (16 / n);
      g.moveTo(c.x - 22 + k * 2, c.y + dy).lineTo(c.x + 18 - k * 2, c.y + dy - 4).stroke({ width: 4, color: PRODUCTS.soaked_bark.color, cap: 'round' });
    }
    for (const [dx, dy] of [[-10, -4], [8, 4], [14, -6]]) g.ellipse(c.x + dx, c.y + dy, 4, 2.6).fill(0x8a8f94).stroke({ width: 0.5, color: 0x3a2418 });
    const a = iso(x + 0.3, y + 2.6, 0);
    const b = iso(x + 1.6, y + 2.8, 0);
    for (const p of [a, b]) g.rect(p.x - 1.2, p.y - 20, 2.4, 20).fill(0x6b4a2e);
    g.moveTo(a.x, a.y - 18).lineTo(b.x, b.y - 18).stroke({ width: 1.6, color: 0x6b4a2e });
    for (let k = 0; k < 3; k++) {
      const px = a.x + (b.x - a.x) * (k + 0.5) / 3;
      const py = a.y + (b.y - a.y) * (k + 0.5) / 3 - 18;
      g.rect(px - 2, py, 4, 12).fill(PRODUCTS.soaked_bark.color).stroke({ width: 0.5, color: 0x3a2418 });
    }
    this.roofTop = iso(x + 1.3, y + 1.2, 24);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x + 2.6, y + 1.9);
      worker(anim, wp.x, wp.y, 0x6cbf6c);
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        anim.ellipse(c.x - 10 + i * 10, c.y + 2, 4 + f * 8, (4 + f * 8) * 0.4).stroke({ width: 0.8, color: 0xe8f6ff, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Beating shed: palm shed with prone log anvil where wooden mallet beats bark into pale
  // flexible cloth hung over pole.
  bark_beater(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const a = iso(x0 + 0.3, y0 + 0.9, 0);
    const b = iso(x0 + 2.0, y0 + 0.9, 0);
    g.moveTo(a.x, a.y - 10).lineTo(b.x, b.y - 10).lineTo(b.x, b.y).lineTo(a.x, a.y).closePath().fill(0x8d6e4a).stroke(OUTLINE);
    g.ellipse(b.x, b.y - 5, 3, 5).fill(0xc9a96b).stroke({ width: 0.6, color: 0x3a2418 });
    g.moveTo(a.x + 6, a.y - 10.5).lineTo(b.x - 4, b.y - 10.5).stroke({ width: 3, color: PRODUCTS.bark_cloth.color });
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xc9a96b);
    const bar0 = iso(x0 + 0.1, y0 + 1.6, 22 + ctx.up);
    const bar1 = iso(x0 + 2.2, y0 + 1.6, 22 + ctx.up);
    g.moveTo(bar0.x, bar0.y).lineTo(bar1.x, bar1.y).stroke({ width: 1.6, color: 0x6b4a2e });
    const n = 2 + Math.min(ctx.tier, 2);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const px = bar0.x + (bar1.x - bar0.x) * f;
      const py = bar0.y + (bar1.y - bar0.y) * f;
      g.rect(px - 4, py, 8, 13).fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.5, color: 0x8d6e4a });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, f] of [[0, 0.35], [1, 0.7]]) {
        const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
        worker(anim, p.x - 2, p.y + 14, k ? 0xe5737f : 0xf2c14e);
        const up = this.working ? Math.abs(Math.sin(time * 5 + k * 1.6)) : 0.5;
        const hx = p.x + 4;
        const hy = p.y - 12 - up * 10;
        anim.moveTo(p.x, p.y + 0).lineTo(hx, hy).stroke({ width: 1.6, color: 0x6b4a2e });
        anim.ellipse(hx, hy, 4, 2.6).fill(0xa1887f).stroke({ width: 0.5, color: 0x3a2418 });
      }
    };
    this.animate(0);
  },

  // Bark painters: small tambo painting cloth with jagua and achiote; painted cloths dry on line.
  // dry hung on rope.
  cloth_painter(g, x, y, ctx) {
    const floor = tamboHouse(this, g, x + 1.2, y + 1.1, 0.95, ctx);
    const a = iso(x + 0.4, y + 2.6, 0);
    const b = iso(x + 2.7, y + 2.5, 0);
    for (const p of [a, b]) g.rect(p.x - 1.2, p.y - 22, 2.4, 22).fill(0x6b4a2e);
    g.moveTo(a.x, a.y - 20).lineTo(b.x, b.y - 20).stroke({ width: 1, color: 0x8d6e4a });
    const n = 3 + Math.min(ctx.tier, 2);
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const px = a.x + (b.x - a.x) * f;
      const py = a.y + (b.y - a.y) * f - 19;
      g.rect(px - 5, py, 10, 12).fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.moveTo(px - 4, py + 3).lineTo(px - 2, py + 5).lineTo(px, py + 3).lineTo(px + 2, py + 5).lineTo(px + 4, py + 3).stroke({ width: 1, color: 0xb23a2a });
      g.poly([px - 2, py + 8.5, px, py + 6.5, px + 2, py + 8.5, px, py + 10.5]).fill(0x2b2018);
    }
    for (const [dx, col] of [[10, 0x2b2018], [16, 0xb23a2a]]) g.ellipse(floor.x + dx, floor.y + 2, 3, 1.4).fill(col).stroke({ width: 0.5, color: 0x3a2418 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.tamboRoof();
    this.animate = (time) => {
      anim.clear();
      const p = { x: floor.x - 6, y: floor.y };
      anim.rect(p.x + 2, p.y - 3, 12, 6).fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.5, color: 0x3a2418 });
      anim.roundRect(p.x - 3.2, p.y - 12, 6.4, 8, 2).fill(0xe5737f);
      anim.circle(p.x, p.y - 14.5, 2.8).fill(0x6d4c32);
      anim.rect(p.x - 2.8, p.y - 16, 5.6, 1.6).fill(0x2b2018);
      const brush = this.working ? Math.sin(time * 4) * 3 : 0;
      anim.moveTo(p.x + 3, p.y - 8).lineTo(p.x + 8 + brush, p.y - 1).stroke({ width: 1.2, color: 0x8d6e4a });
      anim.moveTo(p.x + 4, p.y - 1).lineTo(p.x + 8 + brush, p.y - 1).stroke({ width: 1, color: 0xb23a2a });
    };
    this.animate(0);
  },

  // Mask workshop: grand tambo crafting Pelazón ritual masks watching from entry poles.
  // poles by entrance.
  mask_maker(g, x, y, ctx) {
    const floor = tamboHouse(this, g, x + 1.5, y + 1.3, 1.2, ctx);
    const mask = (mx, my) => {
      g.moveTo(mx - 5, my - 12).quadraticCurveTo(mx, my - 15, mx + 5, my - 12).lineTo(mx + 5, my - 4).quadraticCurveTo(mx, my + 2, mx - 5, my - 4).closePath().fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.6, color: 0x3a2418 });
      g.ellipse(mx - 2.2, my - 8, 1.6, 1.2).fill(0x2b2018);
      g.ellipse(mx + 2.2, my - 8, 1.6, 1.2).fill(0x2b2018);
      g.moveTo(mx, my - 6).lineTo(mx, my - 3).stroke({ width: 0.8, color: 0xb23a2a });
      for (let k = -2; k <= 2; k++) g.moveTo(mx + k * 2, my - 2).lineTo(mx + k * 2.4, my + 4).stroke({ width: 0.6, color: 0xc9a96b });
    };
    const n = 2 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const p = iso(x + 0.3 + k * 0.55, y + 2.85, 0);
      g.rect(p.x - 1, p.y - 22, 2, 22).fill(0x6b4a2e);
      mask(p.x, p.y - 18);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.tamboRoof();
    this.animate = (time) => {
      anim.clear();
      for (const [k, dx] of [[0, -8], [1, 10]]) {
        const p = { x: floor.x + dx, y: floor.y - 2 };
        anim.roundRect(p.x - 3.2, p.y - 12, 6.4, 8, 2).fill(k ? 0x4fb3bf : 0xf2c14e);
        anim.circle(p.x, p.y - 14.5, 2.8).fill(0x6d4c32);
        anim.rect(p.x - 2.8, p.y - 16, 5.6, 1.6).fill(0x2b2018);
        const w = this.working ? Math.sin(time * 3 + k * 2) * 1.5 : 0;
        const mx = p.x + 6 * (k ? -1 : 1);
        anim.moveTo(mx - 3.5, p.y - 9 + w * 0.3).quadraticCurveTo(mx, p.y - 11 + w * 0.3, mx + 3.5, p.y - 9 + w * 0.3).lineTo(mx + 3.5, p.y - 3).quadraticCurveTo(mx, p.y + 1, mx - 3.5, p.y - 3).closePath().fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.5, color: 0x3a2418 });
        anim.circle(mx - 1.5, p.y - 6, 0.9).fill(0x2b2018).circle(mx + 1.5, p.y - 6, 0.9).fill(0x2b2018);
      }
    };
    this.animate(0);
  },

  // Yanchama shop: palm-roofed stilt house displaying masks and painted bark cloths on
  // porch with signboard and browsing visitors.
  tienda_yanchama(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    stiltHouse(this, g, hx, hy, 2.1, 1.3, 22, ctx, { wall: 0xb08850, trim: 0xb23a2a, roofColor: 0xc9a96b });
    box(g, x + 0.5, y + 2.0, 1.9, 0.4, 12, 0x8d6e4a);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const q = iso(x + 0.7 + k * 0.38, y + 2.2, 12);
      if (k % 2) {
        g.rect(q.x - 4, q.y - 10, 8, 10).fill(PRODUCTS.painted_cloth.color).stroke({ width: 0.5, color: 0x3a2418 });
        g.moveTo(q.x - 3, q.y - 6).lineTo(q.x - 1, q.y - 8).lineTo(q.x + 1, q.y - 6).lineTo(q.x + 3, q.y - 8).stroke({ width: 0.8, color: 0x2b2018 });
      } else {
        g.moveTo(q.x - 4, q.y - 9).quadraticCurveTo(q.x, q.y - 12, q.x + 4, q.y - 9).lineTo(q.x + 4, q.y - 3).quadraticCurveTo(q.x, q.y + 1, q.x - 4, q.y - 3).closePath().fill(PRODUCTS.bark_cloth.color).stroke({ width: 0.5, color: 0x3a2418 });
        g.circle(q.x - 1.6, q.y - 6, 1).fill(0x2b2018).circle(q.x + 1.6, q.y - 6, 1).fill(0x2b2018);
        g.moveTo(q.x - 2, q.y - 2.5).lineTo(q.x + 2, q.y - 2.5).stroke({ width: 0.8, color: 0xb23a2a });
      }
    }
    const sign = iso(x + 1.4, y + 1.5, 46 + ctx.up);
    g.rect(sign.x - 16, sign.y - 6, 32, 9).fill(0xe8d9b5).stroke(OUTLINE);
    g.moveTo(sign.x - 13, sign.y - 1).lineTo(sign.x - 8, sign.y - 4).lineTo(sign.x - 3, sign.y - 1).lineTo(sign.x + 2, sign.y - 4).lineTo(sign.x + 7, sign.y - 1).lineTo(sign.x + 12, sign.y - 4).stroke({ width: 1.2, color: 0xb23a2a });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.5) + 1) / 2 : 0.3;
      for (const [k, sh] of [[0, 0xe5737f], [1, 0x6cbf6c]]) {
        const p = iso(x + 0.8 + f * 1.4 + k * 0.5, y + 2.85 + k * 0.1);
        worker(anim, p.x, p.y, sh);
      }
    };
    this.animate(0);
  },

  // --- Amazon · Leticia (v3.52): triple-border river port with colorful zinc/palm houses ---

  // Riverside diner: riverside palm kiosk with foam cooler and black-chili fish plates on
  // counter for seated customers.
  restaurante_ribera(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0 + 0.2, y0 + 0.3, 1.6, 1.0, 12, 0xf7f4ee);
    box(g, x0 + 0.2, y0 + 1.3, 1.6, 0.12, 12, 0x2e7d32);
    for (const [px, py] of [[0, 0], [2.0, 0], [0, 1.6], [2.0, 1.6]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 30 + ctx.up, 0x6b4a2e);
    for (let k = 0; k < 3; k++) {
      const q = iso(x0 + 0.5 + k * 0.5, y0 + 0.8, 12);
      g.ellipse(q.x, q.y - 1, 4.5, 1.8).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418 });
      g.ellipse(q.x, q.y - 1.5, 3, 1).fill(PRODUCTS.cena_ribera.color);
    }
    const cooler = iso(x + 2.6, y + 0.9);
    g.rect(cooler.x - 7, cooler.y - 10, 14, 10).fill(0xffffff).stroke(OUTLINE);
    g.rect(cooler.x - 7, cooler.y - 12, 14, 2.5).fill(0x1e88e5);
    gableRoof(g, x0, y0, 2.0, 1.6, 30 + ctx.up, 10, 0xc9a96b, 0x8d6e4a);
    this.roofTop = iso(x0 + 1, y0 + 0.8, 38 + ctx.up);
    const stools = [[0.4, 2.3], [1.0, 2.4], [1.6, 2.3], [2.2, 2.4]].slice(0, 2 + Math.min(ctx.tier, 2));
    for (const [sx, sy] of stools) {
      const q = iso(x + sx + 0.3, y + sy);
      g.rect(q.x - 0.8, q.y - 7, 1.6, 7).fill(0x555555);
      g.ellipse(q.x, q.y - 7, 3.5, 1.5).fill(0xe5737f);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.0, y0 + 0.15);
      worker(anim, wp.x, wp.y, 0xffffff);
      for (const [k, [sx, sy]] of stools.entries()) {
        if (!this.working && k > 0) continue;
        const q = iso(x + sx + 0.3, y + sy);
        anim.roundRect(q.x - 3, q.y - 15, 6, 8, 2).fill([0xf2c14e, 0x6cbf6c, 0x5c8dd6, 0xe5737f][k]);
        anim.circle(q.x, q.y - 17.5, 2.6).fill(0x6d4c32);
      }
    };
    this.animate(0);
  },
  // Jungle hotel: three-story wooden hotel with balconies and palm roof nestled in trees;
  // windows glow at night.
  hotel_selva(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 2.2, 1.5, 44, ctx, { wall: 0xa1887f, roofColor: 0xc9a96b, roofH: 14 });
    door(g, hx, hy, 1.5, 1.1, 16, 0x2e7d32);
    for (const z of [10, 24, 36]) for (const at of [0.35, 1.15]) windowOnRight(this, g, hx, hy, 2.2, at, z, 0xffe0b2);
    for (const z of [20, 33]) balcony(g, hx, hy, 2.2, 1.5, z, 0x6b4a2e);
    for (const at of [0.4, 1.8]) windowOnFront(this, g, hx, hy, 1.5, at, 24, 0xffe0b2);
    const sign = iso(hx + 1.1, hy + 1.5, H - 6);
    g.rect(sign.x - 16, sign.y - 5, 32, 8).fill(0x2e7d32).stroke(OUTLINE);
    g.rect(sign.x - 12, sign.y - 2.5, 24, 2).fill(0xffffff);
  },
  // Port market: riverside roofed stalls selling pirarucu, açaí, plantain, and fariña with
  // awning-shaded vendors.
  mercado_puerto(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const stalls = [[0.2, 0.3, 0xc9a96b], [1.3, 0.3, 0x9aa3a8], [0.2, 1.4, 0x9aa3a8], [1.3, 1.4, 0xc9a96b]];
    const goods = [PRODUCTS.pirarucu.color, PRODUCTS.asai_bag.color, 0x7cb342, 0xe8d9a0];
    // Each stall with vendor (ordered back-to-front so front awnings overlap rear ones).
    for (const [k, [sx, sy, col]] of stalls.entries()) {
      const v = iso(x0 + sx + 0.5, y0 + sy - 0.05);
      worker(g, v.x, v.y, [0xf7f4ee, 0xf2c14e, 0xe5737f, 0x4fb3bf][k]);
      box(g, x0 + sx, y0 + sy, 1.0, 0.6, 9, 0x8d6e4a);
      const q = iso(x0 + sx + 0.5, y0 + sy + 0.3, 9);
      for (let i = 0; i < 4; i++) g.ellipse(q.x - 7 + i * 4.5, q.y - 1 - (i % 2), 2.6, 1.8).fill(goods[k]);
      for (const [px, py] of [[0, 0], [1, 0], [0, 0.6], [1, 0.6]]) box(g, x0 + sx + px - 0.03, y0 + sy + py - 0.03, 0.06, 0.06, 24, 0x6b4a2e);
      g.poly(isoPoly([[x0 + sx - 0.05, y0 + sy - 0.05, 24], [x0 + sx + 1.05, y0 + sy - 0.05, 24], [x0 + sx + 1.05, y0 + sy + 0.65, 22], [x0 + sx - 0.05, y0 + sy + 0.65, 22]])).fill(col).stroke(OUTLINE);
    }
    this.roofTop = iso(x0 + 1.2, y0 + 1.1, 30);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.12 + i * 0.5) % 1;
        const b = iso(x0 + 0.1 + f * 2.2, y0 + 2.3);
        worker(anim, b.x, b.y, i ? 0x8e44ad : 0xf08a3c);
      }
    };
    this.animate(0);
  },
  // Canoe provisions: port shed packing river-trip hampers beside hanging life vests.
  // ready baskets.
  provisiones_canoa(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.8, 1.3, 26, ctx, { wall: 0xf2c14e, roofColor: 0x9aa3a8, roofH: 10 });
    door(g, hx, hy, 1.3, 0.9, 16, 0xf2c14e);
    windowOnRight(this, g, hx, hy, 1.8, 0.65, 12, 0xffe0b2);
    const rack = iso(x + 2.55, y + 1.1, 0);
    g.rect(rack.x - 12, rack.y - 22, 2, 22).fill(0x6b4a2e);
    g.rect(rack.x + 10, rack.y - 22, 2, 22).fill(0x6b4a2e);
    g.moveTo(rack.x - 11, rack.y - 20).lineTo(rack.x + 11, rack.y - 20).stroke({ width: 1.2, color: 0x6b4a2e });
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) g.roundRect(rack.x - 9 + k * 5, rack.y - 19, 4, 8, 1).fill(0xff6f00).stroke({ width: 0.5, color: 0x3a2418 });
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) box(g, x + 0.4 + k * 0.4, y + 2.3, 0.32, 0.25, 7, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = (time * 0.25) % 1;
      const back = f > 0.5;
      const k = back ? 1 - (f - 0.5) * 2 : f * 2;
      const p = iso(x + 1.2 + k * 1.2, y + 2.0);
      worker(anim, p.x, p.y, 0xff6f00);
      if (!back) anim.rect(p.x - 5, p.y - 28, 10, 7).fill(PRODUCTS.provision_canoa.color).stroke(OUTLINE);
    };
    this.animate(0);
  },
  // Pink dolphin dock: plank jetty over river with canoes departing full of vested tourists;
  // pink river dolphin leaps in distance.
  salida_delfines(g, x, y, ctx) {
    // The river.
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0x3e5a50);
    for (let k = 0; k < 8; k++) {
      const q = iso(x + 0.3 + (k % 4) * 0.7, y + 0.4 + Math.floor(k / 4) * 1.6);
      g.moveTo(q.x - 6, q.y).quadraticCurveTo(q.x, q.y - 2, q.x + 6, q.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.6 });
    }
    // The dock.
    for (let k = 0; k < 7; k++) box(g, x + 0.2 + k * 0.32, y + 1.25, 0.28, 0.5, 3, k % 2 ? PAL.wood : PAL.woodDark, { z: 3 });
    for (const px of [0.2, 1.2, 2.2]) for (const py of [1.25, 1.7]) box(g, x + px, y + py, 0.06, 0.06, 6, PAL.woodDark);
    const sign = iso(x + 0.3, y + 1.5);
    g.rect(sign.x - 1.2, sign.y - 26, 2.4, 22).fill(PAL.wood);
    g.poly([sign.x - 12, sign.y - 26, sign.x + 8, sign.y - 26, sign.x + 13, sign.y - 22, sign.x + 8, sign.y - 18, sign.x - 12, sign.y - 18]).fill(0xf48fb1).stroke(OUTLINE);
    this.roofTop = iso(x + 1.5, y + 1.4, 24);
    const sea = new Graphics();
    this.anim.addChild(sea);
    const boat = (q, full, sc = 1) => {
      sea.moveTo(q.x - 14 * sc, q.y - 4).quadraticCurveTo(q.x, q.y + 4, q.x + 14 * sc, q.y - 4).lineTo(q.x + 11 * sc, q.y).quadraticCurveTo(q.x, q.y + 5, q.x - 11 * sc, q.y).closePath().fill(0x8d5a32).stroke(OUTLINE);
      sea.rect(q.x + 10 * sc, q.y - 6, 3, 6).fill(0x37474f);
      if (full) for (let i = 0; i < 4; i++) {
        sea.circle(q.x - 8 * sc + i * 5 * sc, q.y - 7, 2).fill(0xff6f00);
        sea.circle(q.x - 8 * sc + i * 5 * sc, q.y - 10, 1.6).fill(0x6d4c32);
      }
    };
    this.animate = (time) => {
      sea.clear();
      const bob = Math.sin(time * 1.5) * 1;
      boat({ ...iso(x + 1.4, y + 2.15), y: iso(x + 1.4, y + 2.15).y + bob }, false);
      if (this.working) {
        const f = (time * 0.1) % 1;
        const q = iso(x + 0.4 + f * 2.4, y + 0.6 + f * 0.2);
        boat({ x: q.x, y: q.y + Math.sin(time * 2) }, true, 0.9);
      }
      // Leaping pink river dolphin surfacing now and then.
      const k = (time * 0.08) % 1;
      if (k < 0.2) {
        const t = k / 0.2;
        const w = iso(x + 2.4, y + 0.5);
        const hgt = Math.sin(t * Math.PI) * 18;
        sea.ellipse(w.x, w.y - hgt, 8, 3.2).fill(0xf48fb1);
        sea.poly([w.x - 7, w.y - hgt, w.x - 13, w.y - hgt + 1, w.x - 7, w.y - hgt + 1.6]).fill(0xf48fb1);
        sea.poly([w.x + 6, w.y - hgt, w.x + 12, w.y - hgt - 4, w.x + 11, w.y - hgt + 3]).fill(0xec6f9b);
        sea.ellipse(w.x, w.y + 1, 10 + t * 8, 3).stroke({ width: 1, color: 0xffffff, alpha: 1 - t });
      }
    };
    this.animate(0);
  },
  // --- Santander · El Tabacal (v3.1) ---

  // Curing barn (caney): tall open barn hung with tobacco poles—green below, golden above.
  caney(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.25;
    const w = 2.5;
    const d = 2.3;
    const H = 40 + ctx.up;
    for (const [px, py] of [[0, 0], [w, 0], [0, d]]) box(g, x0 + px - 0.06, y0 + py - 0.06, 0.12, 0.12, H, PAL.wood);
    // Hung tobacco leaf poles back-to-front (front ones sway, see animate).
    const rows = [0.35, 0.95, 1.55];
    const leafColors = [0xc8913b, 0xa8a040, 0x7cb342];
    const hang = (gr, ty, i, sway) => {
      const a = iso(x0 + 0.1, y0 + ty, H - 6);
      const b = iso(x0 + w - 0.1, y0 + ty, H - 6);
      gr.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: PAL.woodDark });
      for (let k = 1; k < 9; k++) {
        const px = a.x + ((b.x - a.x) * k) / 9;
        const py = a.y + ((b.y - a.y) * k) / 9;
        const dx = sway * Math.sin(k * 1.7);
        gr.poly([px - 1.5, py, px + 1.5, py, px + 3 + dx, py + 11, px + dx, py + 17, px - 3 + dx, py + 11]).fill(leafColors[i]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.45 });
      }
    };
    rows.slice(0, 2).forEach((ty, i) => hang(g, ty, i, 0));
    box(g, x0 + w - 0.06, y0 + d - 0.06, 0.12, 0.12, H, PAL.wood);
    // Bundles of green leaves waiting on ground.
    for (const [bx, by] of [[0.5, 2.55], [0.85, 2.7]]) {
      const p = iso(x0 + bx, y0 + by);
      g.ellipse(p.x, p.y - 4, 9, 5).fill(PRODUCTS.tobacco_leaf.color).stroke(OUTLINE);
      g.ellipse(p.x - 2, p.y - 6, 4, 2).fill({ color: 0xc5e1a5, alpha: 0.7 });
    }
    gableRoof(g, x0, y0, w, d, H, 18, 0xb89a5a, 0x8a6a3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 18);
    const front = new Graphics();
    this.anim.addChild(front);
    this.animate = (time) => {
      front.clear();
      hang(front, rows[2], 2, Math.sin(time * 1.3) * (this.working ? 1.6 : 0.5));
    };
    this.animate(0);
  },

  // Stemmer: house with porch table stripping central vein off each cured leaf.
  stripper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Table of cured leaves beside pile of stripped stems.
    box(g, x + 0.4, y + 2.1, 1.7, 0.5, 9, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 0.6 + i * 0.4, y + 2.35, 9);
      g.ellipse(p.x, p.y - 1, 7, 3).fill(i % 2 ? PRODUCTS.cured_leaf.color : PRODUCTS.stripped_leaf.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    }
    const pile = iso(x + 2.5, y + 2.4);
    for (let i = 0; i < 9; i++) {
      const ox = (i % 3) * 4 - 4;
      const oy = -Math.floor(i / 3) * 2.5;
      g.moveTo(pile.x + ox - 5, pile.y + oy).lineTo(pile.x + ox + 5, pile.y + oy - 3).stroke({ width: 1.6, color: 0xd9a26b });
    }
    const hands = new Graphics();
    this.anim.addChild(hands);
    this.animate = (time) => {
      hands.clear();
      // Stripped vein flicks from leaf onto pile.
      const f = (time * 0.9) % 1;
      const a = iso(x + 1.6, y + 2.35, 12);
      const px = a.x + (pile.x - a.x) * f;
      const py = a.y + (pile.y - 6 - a.y) * f - Math.sin(f * Math.PI) * 10;
      hands.moveTo(px - 4, py + 1).lineTo(px + 4, py - 1).stroke({ width: 1.6, color: 0xd9a26b });
    };
    this.animate(0);
  },

  // Fermentation piles: open shed stacking leaves into self-heating fermentation bulks.
  tobacco_piles(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.2;
    const H = 28 + ctx.up;
    const piles = ctx.tier >= 2 ? [[0.25, 0.3], [1.35, 0.3], [0.25, 1.25], [1.35, 1.25]] : [[0.3, 0.4], [1.3, 1.1]];
    for (const [px, py] of piles) {
      box(g, x0 + px, y0 + py, 0.9, 0.75, 14, PRODUCTS.fermented_tobacco.color);
      for (let k = 1; k < 4; k++) {
        const a = iso(x0 + px, y0 + py + 0.75, k * 3.5);
        const b = iso(x0 + px + 0.9, y0 + py + 0.75, k * 3.5);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x8a5a2b, alpha: 0.7 });
      }
      // Thermometer probe stuck in leaf bulk.
      const t = iso(x0 + px + 0.45, y0 + py + 0.37, 14);
      g.rect(t.x - 1, t.y - 9, 2, 9).fill(0xd0d4d8).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.circle(t.x, t.y - 1, 1.6).fill(0xd7263d);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 14, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 14);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 30 });
    const heat = new Graphics();
    this.anim.addChild(heat);
    this.animate = (time) => {
      heat.clear();
      if (!this.working) return;
      for (const [k, [px, py]] of piles.entries()) {
        const f = (time * 0.5 + k * 0.3) % 1;
        const p = iso(x0 + px + 0.45, y0 + py + 0.37, 14 + f * 10);
        heat.moveTo(p.x - 3, p.y).quadraticCurveTo(p.x, p.y - 3, p.x + 3, p.y).stroke({ width: 1.2, color: 0xffffff, alpha: 0.6 * (1 - f) });
      }
    };
  },

  // Cigar rollers: town house with rolling bench on porch, lined-up cigars, and cedar boxes.
  cigar_roller(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyYellow);
    box(g, x + 0.4, y + 2.1, 1.5, 0.5, 9, PAL.wood);
    for (let i = 0; i < 6; i++) {
      const p = iso(x + 1.1 + i * 0.12, y + 2.35, 9);
      g.roundRect(p.x - 1.5, p.y - 8, 3, 9, 1.5).fill(PRODUCTS.cigar.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 1.5, p.y - 6, 3, 1.2).fill(0xd7263d);
    }
    // Stacked cedar boxes ready for warehouse.
    const stack = [[2.3, 2.2, 0], [2.65, 2.2, 0], [2.48, 2.2, 6], [2.48, 2.55, 0]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 2))) {
      box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 6, 0xa0522d, { z });
    }
    const roll = new Graphics();
    this.anim.addChild(roll);
    this.animate = (time) => {
      roll.clear();
      // Cigar under hand rolls on bench; wisp of smoke drifts from sample cigar.
      const k = Math.sin(time * 4) * 0.12;
      const p = iso(x + 0.7 + k, y + 2.35, 9);
      roll.roundRect(p.x - 6, p.y - 3, 12, 3.5, 1.7).fill(PRODUCTS.fermented_tobacco.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      for (let i = 0; i < 2; i++) {
        const f = (time * 0.4 + i / 2) % 1;
        const s = iso(x + 1.75, y + 2.35, 18 + f * 20);
        roll.circle(s.x + Math.sin(f * 8) * 3, s.y, 1.5 + f * 3).fill({ color: 0xdddddd, alpha: 0.5 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // --- Santander · La Fiquera (v3.2) ---

  // Fiber decorticator: shed with stripping machine, fresh fique leaf pile, and sun-drying rack.
  // drying in sun.
  decorticator(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 1.5;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Freshly cut fique leaves.
    const pile = iso(x + 0.5, y + 2.0);
    for (let i = 0; i < 7; i++) {
      const dx = (i % 4) * 4 - 6;
      const dy = -Math.floor(i / 4) * 3;
      g.poly([pile.x + dx - 9, pile.y + dy, pile.x + dx + 9, pile.y + dy - 4, pile.x + dx + 9, pile.y + dy - 1, pile.x + dx - 9, pile.y + dy + 3]).fill(i % 2 ? 0x6f9a7a : 0x5d8a6a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
    }
    // Machine under shed.
    box(g, x0 + 0.35, y0 + 0.4, 0.8, 0.6, 12, 0x6c757d);
    const wheel = iso(x0 + 1.15, y0 + 0.7, 12);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Drying rack: twin poles draped with bright white fiber.
    // (in front: back-right position would be blocked by Spinner and Alpargatería)
    const lines = [[1.0, 2.3, 2.7, 2.3]];
    for (const [ax, ay, bx, by] of lines) {
      const a = iso(x + ax, y + ay, 22);
      const b = iso(x + bx, y + by, 22);
      g.rect(a.x - 1, a.y, 2, 22).fill(PAL.wood);
      g.rect(b.x - 1, b.y, 2, 22).fill(PAL.wood);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x3a2418 });
      for (let k = 1; k < 9; k++) {
        const px = a.x + ((b.x - a.x) * k) / 9;
        const py = a.y + ((b.y - a.y) * k) / 9;
        g.poly([px - 2.5, py, px + 2.5, py, px + 1.5, py + 13, px - 1.5, py + 13]).fill(k % 2 ? 0xe8d9a8 : 0xd9c08c).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.4 });
      }
    }
    const spin = new Graphics();
    this.anim.addChild(spin);
    this.animate = (time) => {
      spin.clear();
      spin.circle(wheel.x, wheel.y - 4, 7).fill(0x495057).stroke(OUTLINE);
      const a = time * (this.working ? 8 : 0.5);
      for (let k = 0; k < 3; k++) {
        const b = a + (k * Math.PI * 2) / 3;
        spin.moveTo(wheel.x, wheel.y - 4).lineTo(wheel.x + Math.cos(b) * 6, wheel.y - 4 + Math.sin(b) * 6).stroke({ width: 1.5, color: 0xadb5bd });
      }
      if (this.working) {
        for (let i = 0; i < 3; i++) {
          const f = (time * 1.5 + i / 3) % 1;
          spin.circle(wheel.x - 10 - f * 8, wheel.y - 2 + f * 6, 1.4).fill({ color: 0x8fb996, alpha: 1 - f });
        }
      }
    };
    this.animate(0);
  },

  // Sack loom: house with porch loom weaving burlap fabric beside stacked sacks.
  sack_loom(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.2, 0.8, 14, PAL.balconyYellow);
    // Loom: wooden frame holding woven fabric.
    box(g, x + 0.9, y + 2.15, 1.2, 0.08, 18, PAL.woodDark);
    g.poly(isoPoly([[x + 0.95, y + 2.2, 4], [x + 2.05, y + 2.2, 4], [x + 2.05, y + 2.2, 16], [x + 0.95, y + 2.2, 16]])).fill(0xd9c08c).stroke(OUTLINE);
    for (let k = 1; k < 6; k++) {
      const a = iso(x + 0.95 + k * 0.18, y + 2.2, 4);
      g.moveTo(a.x, a.y).lineTo(a.x, a.y - 12).stroke({ width: 0.6, color: 0xb89a5a });
    }
    // Costales llenos, amarrados.
    for (const [bx, by] of [[0.45, 2.4], [0.6, 2.7], [2.5, 2.45], [2.7, 2.7]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 6, p.y - 13, 12, 13, 3).fill(0xd9c08c).stroke(OUTLINE);
      g.rect(p.x - 2, p.y - 16, 4, 4).fill(0x8b5a2b);
    }
    const shuttle = new Graphics();
    this.anim.addChild(shuttle);
    this.animate = (time) => {
      shuttle.clear();
      const f = this.working ? (Math.sin(time * 3) + 1) / 2 : 0.5;
      const p = iso(x + 1 + f * 1, y + 2.2, 10);
      shuttle.roundRect(p.x - 4, p.y - 2, 8, 3, 1.5).fill(PAL.wood).stroke({ width: 0.6, color: 0x3a2418 });
    };
    this.animate(0);
  },

  // Twine spinner: house with porch spinning wheel winding yarn onto cabuya spool.
  spinner(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, PAL.balconyYellow);
    const hub = iso(x + 1.3, y + 2.35, 14);
    box(g, x + 0.9, y + 2.3, 0.9, 0.12, 6, PAL.woodDark);
    const ball = iso(x + 2.45, y + 2.4, 4);
    g.circle(ball.x, ball.y - 4, 6).fill(0xd9c08c).stroke(OUTLINE);
    g.moveTo(ball.x - 5, ball.y - 6).lineTo(ball.x + 5, ball.y - 2).stroke({ width: 0.8, color: 0xb89a5a });
    const wheel = new Graphics();
    this.anim.addChild(wheel);
    this.animate = (time) => {
      wheel.clear();
      wheel.circle(hub.x, hub.y - 4, 11).stroke({ width: 2, color: PAL.wood });
      const a = time * (this.working ? 4 : 0.3);
      for (let k = 0; k < 6; k++) {
        const b = a + (k * Math.PI) / 3;
        wheel.moveTo(hub.x, hub.y - 4).lineTo(hub.x + Math.cos(b) * 11, hub.y - 4 + Math.sin(b) * 11).stroke({ width: 0.8, color: PAL.woodDark });
      }
      wheel.moveTo(hub.x + 11, hub.y - 4).lineTo(ball.x - 5, ball.y - 5).stroke({ width: 0.8, color: 0xb89a5a });
    };
    this.animate(0);
  },

  // Alpargata workshop: stitching bench and pairs of espadrilles hung out for sale.
  alpargata_shop(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, PAL.balconyYellow);
    box(g, x + 0.9, y + 2.15, 1.4, 0.45, 9, PAL.wood);
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 1.1 + i * 0.4, y + 2.37, 9);
      g.ellipse(p.x, p.y - 1, 5, 2.2).fill(0xd9c08c).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x + 1, p.y - 2.5, 3, 1.6).fill(PRODUCTS.alpargatas.color);
    }
    // Pairs hung from rope outside house.
    const a = iso(x + 2.5, y + 0.5, 22);
    const b = iso(x + 2.5, y + 1.9, 22);
    g.rect(a.x - 1, a.y, 2, 22).fill(PAL.wood);
    g.rect(b.x - 1, b.y, 2, 22).fill(PAL.wood);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
    const colors = [PRODUCTS.alpargatas.color, 0xd7263d, 0x2fa36b, 0xf4efe6];
    for (let k = 1; k < 5; k++) {
      const px = a.x + ((b.x - a.x) * k) / 5;
      const py = a.y + ((b.y - a.y) * k) / 5;
      g.roundRect(px - 2.5, py + 2, 5, 9, 2).fill(colors[k - 1]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.rect(px - 2.5, py + 9, 5, 2).fill(0xd9c08c);
    }
    const needle = new Graphics();
    this.anim.addChild(needle);
    this.animate = (time) => {
      needle.clear();
      if (!this.working) return;
      const k = Math.abs(Math.sin(time * 5));
      const p = iso(x + 1.5, y + 2.37, 12 + k * 6);
      needle.moveTo(p.x, p.y).lineTo(p.x + 1, p.y - 6).stroke({ width: 1, color: 0xd0d4d8 });
    };
  },

  // Bale press: warehouse with beam press bundling fique bales beside stacked bales.
  tercio_packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.5, 30, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.5, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.75, 14, 0xffffff);
    // Press: two uprights and crossbar.
    for (const px of [0.45, 1.25]) box(g, x + px, y + 2.2, 0.08, 0.08, 24, PAL.woodDark);
    box(g, x + 0.45, y + 2.2, 0.88, 0.08, 3, PAL.woodDark, { z: 24 });
    box(g, x + 0.6, y + 2.15, 0.55, 0.3, 8, PRODUCTS.tobacco_bale.color);
    const stack = [[2.3, 2.15, 0], [2.65, 2.15, 0], [2.48, 2.5, 0], [2.48, 2.3, 9], [2.3, 2.15, 9], [2.48, 2.3, 18]];
    for (const [bx, by, z] of stack.slice(0, 3 + Math.min(ctx.tier, 3))) {
      box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 9, PRODUCTS.tobacco_bale.color, { z });
      const p = iso(x + bx, y + by + 0.12, z + 4.5);
      g.rect(p.x - 5, p.y - 1, 10, 2).fill(0x8b5a2b);
    }
    const plate = new Graphics();
    this.anim.addChild(plate);
    this.animate = (time) => {
      plate.clear();
      const k = this.working ? (Math.sin(time * 2) + 1) / 2 : 1;
      const a = iso(x + 0.6, y + 2.3, 10 + k * 10);
      const b = iso(x + 1.15, y + 2.3, 10 + k * 10);
      plate.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: PAL.wood });
      const m = iso(x + 0.88, y + 2.3, 24);
      plate.moveTo(m.x, m.y).lineTo((a.x + b.x) / 2, (a.y + b.y) / 2).stroke({ width: 1.5, color: 0x6c757d });
    };
    this.animate(0);
  },

  // --- Santander · El Hato (v3.3) ---

  // Butcher shop (fama): house with striped awning and meat cuts hung from window hooks.
  butcher(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Red-and-white striped awning over counter.
    for (let i = 0; i < 6; i++) {
      const a = iso(hx + 0.9 + i * 0.18, hy + 1.6, 20);
      const b = iso(hx + 1.08 + i * 0.18, hy + 1.6, 20);
      g.poly([a.x, a.y, b.x, b.y, b.x, b.y + 7, a.x, a.y + 7]).fill(i % 2 ? 0xffffff : 0xd7263d).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    box(g, hx + 0.95, hy + 1.65, 1.05, 0.3, 9, 0xe9e4d8);
    const hooks = [];
    for (let i = 0; i < 4; i++) hooks.push(iso(hx + 1.05 + i * 0.25, hy + 1.65, 18));
    const meat = new Graphics();
    this.anim.addChild(meat);
    this.animate = (time) => {
      meat.clear();
      hooks.forEach((p, i) => {
        const sway = Math.sin(time * 1.5 + i) * (this.working ? 1 : 0.3);
        meat.moveTo(p.x, p.y).lineTo(p.x + sway, p.y + 3).stroke({ width: 0.8, color: 0x6c757d });
        meat.ellipse(p.x + sway, p.y + 7, 2.6, 4).fill(PRODUCTS.beef.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      });
    };
    this.animate(0);
  },

  // Salting shed: shed with wooden troughs curing meat beside salt sacks.
  salter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 2.0;
    const H = 24 + ctx.up;
    for (const ty of [0.4, 1.2]) {
      box(g, x0 + 0.25, y0 + ty, w - 0.5, 0.5, 8, PAL.wood);
      g.poly(isoPoly([[x0 + 0.3, y0 + ty + 0.05, 8], [x0 + w - 0.3, y0 + ty + 0.05, 8], [x0 + w - 0.3, y0 + ty + 0.45, 8], [x0 + 0.3, y0 + ty + 0.45, 8]])).fill(PRODUCTS.salted_beef.color);
      for (let k = 0; k < 6; k++) {
        const p = iso(x0 + 0.45 + k * 0.28, y0 + ty + 0.25, 8);
        g.circle(p.x, p.y, 1.1).fill(0xffffff);
      }
    }
    // Salt sacks beside shed.
    for (const [bx, by] of [[2.55, 2.4], [2.75, 2.65]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 6, p.y - 11, 12, 11, 3).fill(0xf4f1e8).stroke(OUTLINE);
      g.rect(p.x - 6, p.y - 7, 12, 2).fill(0x2e6fd1);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const bulb = iso(x0 + w / 2, y0 + d / 2, H - 4);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 26 });
  },

  // Air-drying rack: tall sunny poles strung with meat strips swaying in breeze.
  airing_rack(g, x, y, ctx) {
    const rows = ctx.tier >= 2 ? [0.5, 1.2, 1.9] : [0.7, 1.6];
    const H = 26;
    const strips = [];
    for (const ty of rows) {
      const a = iso(x + 0.3, y + ty, H);
      const b = iso(x + 2.7, y + ty, H);
      for (const [px, py] of [[a.x, a.y], [b.x, b.y]]) g.rect(px - 1.2, py, 2.4, H).fill(PAL.wood).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.6, color: PAL.woodDark });
      for (let k = 1; k < 10; k++) strips.push({ x: a.x + ((b.x - a.x) * k) / 10, y: a.y + ((b.y - a.y) * k) / 10, k });
    }
    // Trough of marinated strips waiting.
    box(g, x + 0.4, y + 2.45, 0.9, 0.35, 6, PAL.wood);
    g.poly(isoPoly([[x + 0.45, y + 2.5, 6], [x + 1.25, y + 2.5, 6], [x + 1.25, y + 2.75, 6], [x + 0.45, y + 2.75, 6]])).fill(PRODUCTS.salted_beef.color);
    const hang = new Graphics();
    this.anim.addChild(hang);
    this.animate = (time) => {
      hang.clear();
      for (const p of strips) {
        const sway = Math.sin(time * 1.4 + p.k * 0.7) * (this.working ? 1.5 : 0.5);
        const h = 10 + (p.k % 3) * 2;
        hang.poly([p.x - 1.6, p.y, p.x + 1.6, p.y, p.x + 1.2 + sway, p.y + h, p.x - 1.2 + sway, p.y + h]).fill(p.k % 2 ? PRODUCTS.carne_oreada.color : 0xa3392a).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
      }
    };
    this.animate(0);
  },

  // Grill house: brick charcoal grill with meat sizzling over embers under griller's shed.
  grill(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.6;
    const H = 26 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.4, 1.4, 0.8, 10, 0xb5653a);
    const top = [[x0 + 0.45, y0 + 0.45, 10], [x0 + 1.75, y0 + 0.45, 10], [x0 + 1.75, y0 + 1.15, 10], [x0 + 0.45, y0 + 1.15, 10]];
    g.poly(isoPoly(top)).fill(0x2b1a10);
    for (let k = 0; k < 5; k++) {
      const a = iso(x0 + 0.5 + k * 0.28, y0 + 0.5, 11);
      const b = iso(x0 + 0.5 + k * 0.28, y0 + 1.1, 11);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: 0x9aa3a8 });
    }
    for (let k = 0; k < 3; k++) {
      const p = iso(x0 + 0.75 + k * 0.4, y0 + 0.8, 11);
      g.ellipse(p.x, p.y, 6, 2.5).fill(PRODUCTS.grilled_oreada.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    const coals = iso(x0 + 1.1, y0 + 0.8, 10);
    this.lights.push({ x: coals.x, y: coals.y, r: 30, color: 0xff7a1a });
    // Yucas en un canasto.
    const basket = iso(x + 2.4, y + 2.5);
    g.poly([basket.x - 8, basket.y - 10, basket.x + 8, basket.y - 10, basket.x + 6, basket.y, basket.x - 6, basket.y]).fill(0xc8a26b).stroke(OUTLINE);
    for (const dx of [-4, 0, 4]) g.ellipse(basket.x + dx, basket.y - 11, 2.2, 4).fill(0xf3e5c0).stroke({ width: 0.5, color: 0x8a5a3c });
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      fire.ellipse(coals.x, coals.y + 1, 14, 3).fill({ color: 0xff7a1a, alpha: this.working ? 0.35 + Math.sin(time * 7) * 0.15 : 0.15 });
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.5 + i / 3) % 1;
        const p = iso(x0 + w + 0.2, y0 + 0.4 + i * 0.3, H + f * 24);
        fire.circle(p.x + Math.sin(f * 6) * 3, p.y, 3 + f * 5).fill({ color: 0xdddddd, alpha: 0.45 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Lunch diner: roadside fonda with checkered-cloth tables along porch.
  lunch_table(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.5, 28, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.75, 14, PAL.balconyYellow);
    for (const tx of [0.9, 1.9]) {
      box(g, x + tx, y + 2.15, 0.6, 0.45, 8, 0xd7263d);
      for (let k = 0; k < 3; k++) {
        const p = iso(x + tx + 0.1 + k * 0.2, y + 2.3, 8);
        g.rect(p.x - 1.5, p.y - 1, 3, 2).fill(0xffffff);
      }
      const plate = iso(x + tx + 0.3, y + 2.37, 8);
      g.ellipse(plate.x, plate.y - 1, 5, 2.2).fill(0xf4f1e8).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(plate.x - 1, plate.y - 1.5, 2.5, 1.2).fill(PRODUCTS.grilled_oreada.color);
    }
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      if (!this.working) return;
      for (const tx of [0.9, 1.9]) {
        const f = (time * 0.6 + tx) % 1;
        const p = iso(x + tx + 0.3, y + 2.37, 10 + f * 12);
        steam.circle(p.x, p.y, 1.5 + f * 2.5).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
  },

  // Trail lunch shop: house wrapping fiambres in bijao leaves and tying with twine.
  fiambre_maker(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyYellow);
    box(g, x + 0.4, y + 2.15, 1.5, 0.45, 9, PAL.wood);
    for (let i = 0; i < 5; i++) {
      const p = iso(x + 0.55 + i * 0.28, y + 2.37, 9);
      g.ellipse(p.x, p.y - 2.5, 4.5, 3.2).fill(PRODUCTS.fiambre.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 4.5, p.y - 3, 9, 1).fill(0xd9c08c);
    }
    // Fresh bijao leaf bundle by doorway.
    const bundle = iso(x + 2.5, y + 2.5);
    for (let k = 0; k < 4; k++) g.ellipse(bundle.x + (k - 1.5) * 2.5, bundle.y - 9, 3, 9).fill(k % 2 ? 0x8db33a : 0x6b8e23).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
  },

  // --- Santander · Las Hormigas (v3.4) ---

  // Cleaning bench: long open shed table pulling wings and legs off culona ants.
  ant_cleaner(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 1.8;
    const H = 24 + ctx.up;
    box(g, x0 + 0.25, y0 + 0.6, w - 0.5, 0.6, 8, PAL.wood);
    const ants = [];
    for (let i = 0; i < 9; i++) ants.push(iso(x0 + 0.4 + (i % 5) * 0.36, y0 + 0.75 + Math.floor(i / 5) * 0.25, 8));
    for (const a of ants) g.ellipse(a.x, a.y, 2.2, 1.4).fill(PRODUCTS.ant_queen.color);
    // Baskets: one holding incoming ants, another for cleaned ones.
    for (const [bx, by] of [[0.5, 2.5], [2.4, 2.5]]) {
      const b = iso(x + bx, y + by);
      g.poly([b.x - 7, b.y - 9, b.x + 7, b.y - 9, b.x + 5, b.y, b.x - 5, b.y]).fill(0xc8a26b).stroke(OUTLINE);
      for (const dx of [-3, 0, 3]) g.ellipse(b.x + dx, b.y - 10, 1.8, 1.2).fill(PRODUCTS.ant_clean.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    const wings = new Graphics();
    this.anim.addChild(wings);
    this.animate = (time) => {
      wings.clear();
      if (!this.working) return;
      // Plucked wings fluttering to floor.
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.7 + i / 4) % 1;
        const a = ants[(i * 2) % ants.length];
        wings.ellipse(a.x + f * 10 - 5, a.y + f * 16, 2.5, 1).fill({ color: 0xe3f2fd, alpha: 0.9 * (1 - f) });
      }
    };
  },

  // Brine pots: clay pots of salted water set along roofed porch.
  brine_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.8;
    const H = 24 + ctx.up;
    const pots = ctx.tier >= 2 ? [[0.45, 0.5], [1.25, 0.5], [0.45, 1.25], [1.25, 1.25]] : [[0.55, 0.7], [1.35, 0.95]];
    for (const [px, py] of pots) {
      const c = iso(x0 + px + 0.25, y0 + py + 0.25, 8);
      g.ellipse(c.x, c.y + 6, 13, 6).fill(0x94502c).stroke(OUTLINE);
      g.rect(c.x - 13, c.y, 26, 6).fill(0xb5653a);
      g.ellipse(c.x, c.y, 13, 6).fill(0xb5653a).stroke(OUTLINE);
      g.ellipse(c.x, c.y, 10.5, 4.5).fill(0xcfe8f0);
      g.ellipse(c.x - 3, c.y, 2, 1.2).fill(PRODUCTS.ant_clean.color);
      g.ellipse(c.x + 3, c.y + 1, 2, 1.2).fill(PRODUCTS.ant_clean.color);
    }
    // Salt sack.
    const salt = iso(x + 2.6, y + 2.5);
    g.roundRect(salt.x - 6, salt.y - 11, 12, 11, 3).fill(0xf4f1e8).stroke(OUTLINE);
    g.rect(salt.x - 6, salt.y - 7, 12, 2).fill(0x2e6fd1);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
  },

  // Clay griddle: wood hearth with shallow clay pans stirring roasting ants.
  ant_toaster(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.3;
    const d = 1.8;
    const H = 26 + ctx.up;
    box(g, x0 + 0.35, y0 + 0.45, 1.6, 0.8, 10, 0xb5653a);
    const pans = [iso(x0 + 0.75, y0 + 0.85, 10), iso(x0 + 1.55, y0 + 0.85, 10)];
    for (const c of pans) {
      g.ellipse(c.x, c.y, 15, 7).fill(0x8a4a2a).stroke(OUTLINE);
      g.ellipse(c.x, c.y, 11, 5).fill(PRODUCTS.toasted_ants.color);
    }
    const mouth = iso(x0 + 1.15, y0 + 1.25, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    // Firewood.
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 2.3 + i * 0.1, y + 2.6, i * 2);
      g.roundRect(p.x - 9, p.y - 4, 18, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      const a = time * 3;
      for (const [k, c] of pans.entries()) {
        const ex = c.x + Math.cos(a + k * 2) * 7;
        const ey = c.y + Math.sin(a + k * 2) * 3;
        stir.moveTo(ex, ey).lineTo(ex + 6, ey - 18).stroke({ width: 2.4, color: PAL.wood });
      }
      stir.ellipse(mouth.x, mouth.y + 1, 4, 2.5).fill({ color: 0xff7a1a, alpha: this.working ? 0.6 + Math.sin(time * 9) * 0.3 : 0.2 });
    };
    this.animate(0);
  },

  // Paper-cone stall: awning booth filling paper cones of toasted ants.
  cone_table(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, PAL.balconyYellow);
    box(g, x + 0.9, y + 2.15, 1.4, 0.45, 9, PAL.wood);
    for (let i = 0; i < 6; i++) {
      const p = iso(x + 1.0 + i * 0.22, y + 2.37, 9);
      g.poly([p.x - 2.5, p.y - 9, p.x + 2.5, p.y - 9, p.x, p.y]).fill(0xf4efe6).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 9.5, 2.5, 1.2).fill(PRODUCTS.toasted_ants.color);
    }
    // Striped awning.
    for (let i = 0; i < 6; i++) {
      const a = iso(x + 0.9 + i * 0.24, y + 2.1, 22);
      const b = iso(x + 1.14 + i * 0.24, y + 2.1, 22);
      g.poly([a.x, a.y, b.x, b.y, b.x, b.y + 6, a.x, a.y + 6]).fill(i % 2 ? 0xffffff : 0x2fa36b).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
  },

  // Souvenir shop: plaza storefront with full sacks, hung alpargatas, and ant cones.
  souvenir_shop(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyYellow);
    // Full fique sacks outside shop.
    for (const [bx, by] of [[0.45, 2.35], [0.7, 2.6]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 6, p.y - 13, 12, 13, 3).fill(PRODUCTS.fique_sack.color).stroke(OUTLINE);
      g.rect(p.x - 2, p.y - 16, 4, 4).fill(0x8b5a2b);
    }
    // Alpargatas hanging in doorway.
    const a = iso(hx + 1.2, hy + 1.6, 22);
    const b = iso(hx + 1.2 + 0.9, hy + 1.6, 22);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
    const colors = [PRODUCTS.alpargatas.color, 0xd7263d, 0x2fa36b, 0xe8b90f];
    for (let k = 1; k < 5; k++) {
      const px = a.x + ((b.x - a.x) * k) / 5;
      const py = a.y + ((b.y - a.y) * k) / 5;
      g.roundRect(px - 2.5, py + 2, 5, 8, 2).fill(colors[k - 1]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.rect(px - 2.5, py + 8, 5, 2).fill(0xd9c08c);
    }
    // Counter topped with ant cones.
    box(g, x + 1.4, y + 2.25, 1.1, 0.35, 8, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 1.5 + i * 0.25, y + 2.42, 8);
      g.poly([p.x - 2.5, p.y - 8, p.x + 2.5, p.y - 8, p.x, p.y]).fill(0xf4efe6).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 8.5, 2.5, 1.2).fill(PRODUCTS.toasted_ants.color);
    }
  },

  // --- Santander · Barichara (v3.5): white rammed-earth houses, green doors, yellow stone ---

  // Park café: umbrella tables outside house; wisps of smoke rise from cigars.
  park_cafe(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.4, 28, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.4, 0.6, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.0, 0.7, 14, PAL.balconyYellow);
    const tables = [iso(x + 0.8, y + 2.3), iso(x + 1.9, y + 2.4)];
    for (const p of tables) {
      shadow(g, p.x, p.y + 1, 12, 5);
      g.rect(p.x - 1, p.y - 20, 2, 20).fill(0x555555);
      g.ellipse(p.x, p.y - 9, 8, 4).fill(0xffffff).stroke(OUTLINE);
      g.poly([p.x, p.y - 28, p.x - 14, p.y - 19, p.x + 14, p.y - 19]).fill(0x2f7d4f).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.circle(p.x - 3, p.y - 10, 1.8).fill(PRODUCTS.sobremesa.color);
      g.rect(p.x + 1, p.y - 11, 4, 2).fill(PRODUCTS.bocadillo.color);
    }
    const smoke = new Graphics();
    this.anim.addChild(smoke);
    this.animate = (time) => {
      smoke.clear();
      if (!this.working) return;
      for (const [k, p] of tables.entries()) {
        const f = (time * 0.4 + k * 0.5) % 1;
        smoke.circle(p.x + 4 + Math.sin(f * 7) * 2, p.y - 12 - f * 18, 1.4 + f * 2.5).fill({ color: 0xdddddd, alpha: 0.5 * (1 - f) });
      }
    };
  },

  // Country inn: two-story mansion with wooden balcony, flower pots, and guest courtyard.
  posada(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up: Math.max(ctx.up, UPPER_FLOOR) }, { wall: 0xf7f4ee, roofH: 15 });
    door(g, hx, hy, 1.6, 0.7, 17, 0x2f7d4f);
    door(g, hx, hy, 1.6, 1.6, 17, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, PAL.balconyYellow);
    // Bougainvillea draping over courtyard wall.
    for (const [bx, by] of [[0.25, 2.2], [0.25, 2.6], [2.6, 0.3]]) {
      const p = iso(x + bx, y + by, 10);
      for (const [dx, dy] of [[-3, 0], [3, -1], [0, -4]]) g.circle(p.x + dx, p.y + dy, 3.2).fill(0xd63384);
      g.circle(p.x, p.y + 1, 2).fill(0x4e8a33);
    }
    const hammock = iso(x + 1.6, y + 2.5, 8);
    g.moveTo(hammock.x - 12, hammock.y - 6).quadraticCurveTo(hammock.x, hammock.y + 4, hammock.x + 12, hammock.y - 6).stroke({ width: 3, color: 0xd7263d });
  },

  // Box workshop: house making gift boxes with sheets of handmade fique paper drying outdoors.
  box_shop(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, PAL.balconyYellow);
    // Drying rack with fique paper sheets.
    const a = iso(x + 0.5, y + 2.4, 20);
    const b = iso(x + 2.6, y + 2.4, 20);
    for (const p of [a, b]) g.rect(p.x - 1, p.y, 2, 20).fill(PAL.wood);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
    for (let k = 1; k < 6; k++) {
      const px = a.x + ((b.x - a.x) * k) / 6;
      const py = a.y + ((b.y - a.y) * k) / 6;
      g.rect(px - 4, py, 8, 10).fill(k % 2 ? 0xf1e6cf : 0xe8dcc0).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
    }
    for (const [bx, by, z] of [[2.55, 2.75, 0], [2.85, 2.75, 0], [2.7, 2.75, 7]].slice(0, 2 + Math.min(ctx.tier, 1))) box(g, x + bx - 0.12, y + by - 0.1, 0.24, 0.2, 7, PRODUCTS.caja_surtida.color, { z });
  },

  // Hiker baskets: house with stacked trail hampers and one being packed at doorway.
  hamper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xf1e6cf, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, PAL.balconyYellow);
    for (const [bx, by] of [[1.3, 2.35], [1.65, 2.5], [2.0, 2.35], [1.65, 2.2]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      const p = iso(x + bx, y + by);
      g.poly([p.x - 8, p.y - 10, p.x + 8, p.y - 10, p.x + 6, p.y, p.x - 6, p.y]).fill(PRODUCTS.canasta_caminante.color).stroke(OUTLINE);
      g.ellipse(p.x - 2, p.y - 11, 4, 2.5).fill(PRODUCTS.fiambre.color);
      g.moveTo(p.x - 6, p.y - 10).quadraticCurveTo(p.x, p.y - 20, p.x + 6, p.y - 10).stroke({ width: 1.4, color: 0xa07c4a });
    }
  },

  // Camino Real trailhead: stone archway starting cobblestone trail to Guane; hikers depart.
  camino_real(g, x, y, ctx) {
    // Yellow cobblestone path descending toward lot edge.
    for (let k = 0; k < 9; k++) {
      const p = iso(x + 0.6 + k * 0.28, y + 1.5 + Math.sin(k) * 0.15);
      g.ellipse(p.x, p.y, 8, 4).fill(k % 2 ? 0xc9a96b : 0xe0c890).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.3 });
    }
    // Archway: twin stone piers and arch.
    const H = 34 + ctx.up / 2;
    for (const py of [1.05, 1.95]) box(g, x + 0.6, y + py, 0.3, 0.3, H, 0xd9b56a);
    box(g, x + 0.6, y + 1.05, 0.3, 1.2, 8, 0xc9a96b, { z: H });
    const top = iso(x + 0.75, y + 1.65, H + 8);
    g.roundRect(top.x - 12, top.y - 10, 24, 10, 3).fill(0xa1672c).stroke(OUTLINE);
    g.rect(top.x - 8, top.y - 6, 16, 2).fill(0xfff8ec);
    // «Guane» signpost and waiting bench.
    const sign = iso(x + 2.6, y + 0.6);
    g.rect(sign.x - 1.2, sign.y - 22, 2.4, 22).fill(PAL.wood);
    g.poly([sign.x - 12, sign.y - 22, sign.x + 8, sign.y - 22, sign.x + 13, sign.y - 18, sign.x + 8, sign.y - 14, sign.x - 12, sign.y - 14]).fill(0xa1672c).stroke(OUTLINE);
    box(g, x + 1.4, y + 2.5, 0.8, 0.2, 5, PAL.wood);
    const walkers = new Graphics();
    this.anim.addChild(walkers);
    this.animate = (time) => {
      walkers.clear();
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.12 + i / 3) % 1;
        const p = iso(x + 0.9 + f * 2.1, y + 1.5 + Math.sin(f * 9) * 0.1);
        const step = Math.sin(time * 8 + i) * 1.2;
        walkers.rect(p.x - 1.5 + step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.rect(p.x + 0.2 - step, p.y - 7, 1.4, 7).fill(0x3d3d5c);
        walkers.roundRect(p.x - 2.5, p.y - 14, 5, 7, 2).fill([0xd7263d, 0x2e6fd1, 0x2fa36b][i]);
        walkers.circle(p.x, p.y - 16, 2.2).fill(0xe0ac7e);
        walkers.ellipse(p.x, p.y - 17.5, 4, 1.2).fill(0xe8d9a8);
        walkers.rect(p.x + 2.5, p.y - 14, 2.5, 5).fill(PRODUCTS.canasta_caminante.color);
      }
    };
  },

  // ---------- Tolima Grande (v4.0) ----------
  // Los Achirales. Grater: open shed with wooden trough and cranked grater beside rhizome pile.
  // pile.
  achira_grater(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.4, y0 + 0.5, 1.4, 0.6, 7, PAL.wood);
    const t = iso(x0 + 1.1, y0 + 0.8, 7);
    g.ellipse(t.x, t.y, 22, 6).fill(PRODUCTS.achira_mash.color).stroke(OUTLINE);
    for (const [bx, by] of [[0.4, 2.4], [0.8, 2.6], [0.6, 2.2]]) {
      const q = iso(x + bx, y + by);
      g.ellipse(q.x, q.y - 4, 7, 4.5).fill(PRODUCTS.achira_root.color).stroke(OUTLINE);
    }
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xc9a96b);
    const wheel = iso(x0 + 1.9, y0 + 0.8, 14);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const a = this.working ? time * 5 : 0;
      anim.circle(wheel.x, wheel.y, 9).fill(0xb0bec5).stroke(OUTLINE);
      for (let k = 0; k < 4; k++) anim.moveTo(wheel.x, wheel.y).lineTo(wheel.x + Math.cos(a + k * 1.57) * 9, wheel.y + Math.sin(a + k * 1.57) * 9).stroke({ width: 1.2, color: 0x607d8b });
      const wp = iso(x0 + 0.6, y0 + 1.4);
      worker(anim, wp.x, wp.y, 0xe53935);
    };
    this.animate(0);
  },

  // Settling tanks: concrete basins washing grated achira to settle starch; milky water runs down.
  // trough.
  starch_tanks(g, x, y, ctx) {
    const tanks = ctx.tier >= 2 ? [[0.3, 0.4], [1.4, 0.4], [0.3, 1.5], [1.4, 1.5]] : [[0.4, 0.5], [1.5, 0.5], [0.9, 1.6]];
    this.tanks = [];
    for (const [tx, ty] of tanks) {
      box(g, x + tx, y + ty, 0.9, 0.9, 10, 0xb0bec5);
      g.poly(isoPoly([[x + tx + 0.08, y + ty + 0.08, 10], [x + tx + 0.82, y + ty + 0.08, 10], [x + tx + 0.82, y + ty + 0.82, 10], [x + tx + 0.08, y + ty + 0.82, 10]])).fill(0xe8f0f2);
      this.tanks.push(iso(x + tx + 0.45, y + ty + 0.45, 10));
    }
    const c0 = iso(x + 2.6, y + 0.3, 14);
    const c1 = iso(x + 2.6, y + 2.6, 4);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 4, color: 0x90a4ae });
    this.roofTop = iso(x + 1.3, y + 1.3, 20);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, t] of this.tanks.entries()) {
        const f = this.working ? (time * 0.5 + k * 0.3) % 1 : 0;
        anim.ellipse(t.x, t.y, 10 - f * 6, 4 - f * 2).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
      const f = (time * 1.2) % 1;
      if (this.working) anim.circle(c0.x + (c1.x - c0.x) * f, c0.y + (c1.y - c0.y) * f, 2).fill(0xf1ece0);
    };
    this.animate(0);
  },

  // Drying yard: mats of white starch in sun turned by raker.
  starch_patio(g, x, y, ctx) {
    const mats = ctx.tier >= 2 ? [[0.3, 0.3], [1.5, 0.3], [0.3, 1.5], [1.5, 1.5]] : [[0.4, 0.4], [1.5, 0.6], [0.7, 1.6]];
    for (const [mx, my] of mats) {
      g.poly(isoPoly([[x + mx, y + my], [x + mx + 1.1, y + my], [x + mx + 1.1, y + my + 1.0], [x + mx, y + my + 1.0]])).fill(0xc9a96b).stroke(OUTLINE);
      g.poly(isoPoly([[x + mx + 0.1, y + my + 0.1], [x + mx + 1.0, y + my + 0.1], [x + mx + 1.0, y + my + 0.9], [x + mx + 0.1, y + my + 0.9]])).fill(PRODUCTS.achira_starch.color);
    }
    for (const [sx, sy] of [[2.6, 2.4], [2.3, 2.7]]) {
      const q = iso(x + sx, y + sy);
      g.ellipse(q.x, q.y - 5, 7, 5.5).fill(PAL.sack).stroke(OUTLINE);
      g.ellipse(q.x, q.y - 9, 4, 1.8).fill(0xffffff);
    }
    this.roofTop = iso(x + 1.4, y + 1.4, 12);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.8) + 1) / 2 : 0.5;
      const w = iso(x + 0.6 + f * 1.6, y + 2.5);
      worker(anim, w.x, w.y, 0xfdd835);
      anim.moveTo(w.x + 3, w.y - 14).lineTo(w.x + 12, w.y - 2).stroke({ width: 1.4, color: 0x8d6e4a });
    };
    this.animate(0);
  },

  // Kneading house: white red-plinth bahareque house with long table kneading dough with curds.
  achira_kneader(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 26, ctx, { wall: 0xfbf8f1 });
    door(g, hx, hy, 1.4, 1.6, 17, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 12, 0x2f7d4f);
    box(g, x + 0.5, y + 2.15, 1.8, 0.5, 8, PAL.wood);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x + 0.75 + k * 0.4, y + 2.4, 8);
      g.ellipse(q.x, q.y - 2, 5, 3).fill(PRODUCTS.bizcocho_dough.color).stroke({ width: 0.6, color: 0x3a2418 });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const q = iso(x + 1.4, y + 2.9);
      worker(anim, q.x, q.y, 0xf2c14e);
      const press = this.working ? Math.abs(Math.sin(time * 5)) * 3 : 0;
      anim.ellipse(q.x, q.y - 21 + press, 3, 2).fill(0x6d4c32);
    };
    this.animate(0);
  },

  // Bizcocho oven: domed clay oven with lit firebox, wooden peel, and baking sheets.
  bizcocho_oven(g, x, y, ctx) {
    const k = iso(x + 1.2, y + 1.2);
    shadow(g, k.x + 4, k.y + 2, 32, 12);
    g.moveTo(k.x - 28, k.y).quadraticCurveTo(k.x - 28, k.y - 38, k.x, k.y - 40).quadraticCurveTo(k.x + 28, k.y - 38, k.x + 28, k.y).quadraticCurveTo(k.x, k.y + 8, k.x - 28, k.y).closePath().fill(0xc97a46).stroke(OUTLINE);
    g.moveTo(k.x - 8, k.y + 3).lineTo(k.x - 8, k.y - 11).quadraticCurveTo(k.x, k.y - 19, k.x + 8, k.y - 11).lineTo(k.x + 8, k.y + 3).closePath().fill(0x2b1d14);
    this.lights.push({ x: k.x, y: k.y - 4, r: 24, color: 0xff7a1a });
    this.smokePoints.push(iso(x + 1.2, y + 1.0, 42 + ctx.up));
    this.roofTop = iso(x + 1.2, y + 1.2, 40);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 2.3 + (i % 2) * 0.35, y + 1.9 + Math.floor(i / 2) * 0.3);
      g.rect(q.x - 7, q.y - 3, 14, 3).fill(0x90a4ae).stroke({ width: 0.5, color: 0x3a2418 });
      for (let b = 0; b < 3; b++) g.roundRect(q.x - 6 + b * 4.5, q.y - 5, 3.5, 2.2, 1).fill(PRODUCTS.bizcochos.color);
    }
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      if (!this.working) return;
      const h = 8 + Math.sin(time * 9) * 3;
      fire.poly([k.x - 6, k.y + 2, k.x - 2, k.y - h * 0.6, k.x, k.y - h, k.x + 3, k.y - h * 0.5, k.x + 6, k.y + 2]).fill(0xff8c1a);
    };
    this.animate(0);
  },

  // Bizcocho packer: shop with red achira sign and stacked cartons along porch.
  bizcocho_packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xf6d860 });
    door(g, hx, hy, 1.5, 1.7, 18, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, 0xd7263d);
    const s = iso(hx + 0.8, hy + 1.5, 24 + ctx.up);
    g.roundRect(s.x - 12, s.y - 7, 24, 12, 3).fill(0xfffaf0).stroke(OUTLINE);
    g.ellipse(s.x - 2, s.y - 1, 2.5, 4).fill(0xe53935);
    g.ellipse(s.x + 2, s.y - 2, 2.5, 4).fill(0xe53935);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 4); i++) box(g, x + 1.6 + (i % 3) * 0.4, y + 2.1 + Math.floor(i / 3) * 0.4, 0.35, 0.3, 7, PRODUCTS.bizcocho_box.color, { z: Math.floor(i / 3) === 0 ? 0 : 0 });
  },

  // ---------- Cundinamarca (v4.4) ----------
  // Flores de la Sabana. Cutting bench: shed table covered in fresh-cut roses with clipper
  // and rose buckets alongside.
  mesa_corte(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.2, y0 + 0.5, 1.9, 0.6, 9, PAL.wood);
    for (let k = 0; k < 4 + Math.min(ctx.tier, 3); k++) {
      const a = iso(x0 + 0.35 + k * 0.24, y0 + 0.62, 9);
      const b = iso(x0 + 0.5 + k * 0.24, y0 + 0.98, 9);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x3f7f3a });
      g.circle(b.x, b.y - 1, 2.4).fill(PRODUCTS.rosa.color);
    }
    for (const [bx, by] of [[0.5, 2.4], [0.9, 2.6]]) {
      const q = iso(x + bx, y + by);
      g.rect(q.x - 5, q.y - 9, 10, 9).fill(0x90a4ae).stroke(OUTLINE);
      for (const dx of [-3, 0, 3]) g.circle(q.x + dx, q.y - 12, 2.4).fill(PRODUCTS.rosa.color);
    }
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0xeef4f6);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.1, y0 + 1.5);
      worker(anim, wp.x, wp.y, 0xe91e63);
      const snip = this.working ? Math.abs(Math.sin(time * 6)) * 3 : 1;
      anim.moveTo(wp.x + 4, wp.y - 14).lineTo(wp.x + 9, wp.y - 16 - snip).stroke({ width: 1.2, color: 0x607d8b });
      anim.moveTo(wp.x + 4, wp.y - 14).lineTo(wp.x + 9, wp.y - 12 + snip).stroke({ width: 1.2, color: 0x607d8b });
    };
    this.animate(0);
  },

  // Hydration tubs: blue tubs of preservative water holding standing roses; water ripples.
  // ripples.
  tinas_hidratacion(g, x, y, ctx) {
    const tubs = ctx.tier >= 2 ? [[0.3, 0.4], [1.4, 0.4], [0.3, 1.5], [1.4, 1.5]] : [[0.4, 0.5], [1.5, 0.5], [0.9, 1.6]];
    this.tubs = [];
    for (const [tx, ty] of tubs) {
      box(g, x + tx, y + ty, 0.9, 0.9, 8, 0x1e88e5);
      g.poly(isoPoly([[x + tx + 0.08, y + ty + 0.08, 8], [x + tx + 0.82, y + ty + 0.08, 8], [x + tx + 0.82, y + ty + 0.82, 8], [x + tx + 0.08, y + ty + 0.82, 8]])).fill(0x81d4fa);
      for (let k = 0; k < 5; k++) {
        const q = iso(x + tx + 0.2 + (k % 3) * 0.25, y + ty + 0.25 + Math.floor(k / 3) * 0.35, 8);
        g.moveTo(q.x, q.y).lineTo(q.x, q.y - 12).stroke({ width: 1, color: 0x3f7f3a });
        g.circle(q.x, q.y - 13, 2.6).fill(k % 2 ? 0xd81b3c : 0xf06292).stroke({ width: 0.6, color: 0x7a0c1e });
      }
      this.tubs.push(iso(x + tx + 0.45, y + ty + 0.45, 8));
    }
    this.roofTop = iso(x + 1.3, y + 1.3, 22);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, t] of this.tubs.entries()) {
        const f = this.working ? (time * 0.6 + k * 0.3) % 1 : 0;
        anim.ellipse(t.x, t.y, 6 + f * 8, 2 + f * 3).stroke({ width: 1, color: 0xffffff, alpha: 0.7 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Rose grader: shed with conveyor sorting stems against length gauge.
  clasificadora_flores(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.4;
    box(g, x0, y0 + 0.6, 2.3, 0.5, 8, 0x455a64);
    g.poly(isoPoly([[x0, y0 + 0.65, 8], [x0 + 2.3, y0 + 0.65, 8], [x0 + 2.3, y0 + 1.05, 8], [x0, y0 + 1.05, 8]])).fill(0x263238);
    box(g, x0 + 0.2, y0 + 1.4, 1.8, 0.3, 6, 0xfdd835);
    ramada(this, g, x0, y0, 2.4, 1.8, 30 + ctx.up, 0xeef4f6);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < 4; k++) {
        const f = ((this.working ? time * 0.25 : 0) + k / 4) % 1;
        const q = iso(x0 + 0.1 + f * 2.1, y0 + 0.85, 9);
        anim.moveTo(q.x - 5, q.y + 2).lineTo(q.x + 4, q.y - 1).stroke({ width: 1.2, color: 0x3f7f3a });
        anim.circle(q.x + 5, q.y - 2, 2.4).fill([0xd81b3c, 0xf06292, 0xfafafa, 0xfbc02d][k]);
      }
      const wp = iso(x0 + 1.2, y0 + 1.9);
      worker(anim, wp.x, wp.y, 0x7e57c2);
    };
    this.animate(0);
  },

  // Bunching hall: white packing house bundling wrapped bouquets beside cardboard sleeves.
  boncheo(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 26, ctx, { wall: 0xfbf8f1, roofColor: 0x6d8f4e });
    door(g, hx, hy, 1.4, 1.6, 17, 0x2e7d32);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 12, 0x2e7d32);
    box(g, x + 0.5, y + 2.15, 1.8, 0.5, 8, PAL.wood);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x + 0.75 + k * 0.4, y + 2.4, 8);
      g.poly([q.x - 4, q.y - 2, q.x + 4, q.y - 2, q.x + 2, q.y + 4, q.x - 2, q.y + 4]).fill(PRODUCTS.bonche_rosas.color).stroke({ width: 0.6, color: 0x3a2418 });
      for (const dx of [-2.5, 0, 2.5]) g.circle(q.x + dx, q.y - 3.5, 1.9).fill(PRODUCTS.rosa.color);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const q = iso(x + 1.4, y + 2.9);
      worker(anim, q.x, q.y, 0xf06292);
      const wrap = this.working ? Math.abs(Math.sin(time * 4)) * 3 : 0;
      anim.circle(q.x - 2 + wrap, q.y - 20, 2.2).fill(PRODUCTS.rosa.color);
    };
    this.animate(0);
  },

  // Cold room: thick-walled white vault with freezer door, rooftop condenser fan spinning,
  // and frost at threshold.
  cuarto_frio(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0, y0, 2.2, 1.7, 30 + ctx.up, 0xf4f6f8);
    door(g, x0, y0, 1.7, 1.2, 20, 0x90a4ae);
    const fr = iso(x0 + 2.2, y0 + 1.1, 12);
    g.rect(fr.x - 1, fr.y - 8, 6, 3).fill({ color: 0xe1f5fe, alpha: 0.9 });
    box(g, x0 + 0.5, y0 + 0.4, 1.0, 0.8, 8, 0xb0bec5, { z: 30 + ctx.up });
    this.fan = iso(x0 + 1.0, y0 + 0.8, 38 + ctx.up);
    this.roofTop = iso(x0 + 1.1, y0 + 0.85, 40 + ctx.up);
    for (let i = 0; i < 1 + Math.min(ctx.tier, 3); i++) box(g, x + 0.4 + i * 0.45, y + 2.4, 0.38, 0.3, 6, PRODUCTS.bonche_rosas.color);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const a = this.working ? time * 8 : 0;
      anim.ellipse(this.fan.x, this.fan.y, 9, 4.5).fill(0x607d8b);
      for (let k = 0; k < 3; k++) anim.moveTo(this.fan.x, this.fan.y).lineTo(this.fan.x + Math.cos(a + k * 2.09) * 8, this.fan.y + Math.sin(a + k * 2.09) * 4).stroke({ width: 2, color: 0xcfd8dc });
    };
    this.animate(0);
  },

  // Flower exporter: shop with rose-and-plane sign and long export boxes stacked for airport.
  // airport.
  empacadora_flores(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xf8e1e7, roofColor: 0x8d6e63 });
    door(g, hx, hy, 1.5, 1.7, 18, 0x6d4c41);
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, 0x6d4c41);
    const s = iso(hx + 0.8, hy + 1.5, 24 + ctx.up);
    g.roundRect(s.x - 13, s.y - 7, 26, 12, 3).fill(0xfffaf0).stroke(OUTLINE);
    g.circle(s.x - 5, s.y - 1, 3.5).fill(PRODUCTS.rosa.color);
    g.poly([s.x + 1, s.y - 1, s.x + 10, s.y - 1, s.x + 6, s.y - 4, s.x + 6, s.y + 2]).fill(0x1e88e5);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 4); i++) box(g, x + 1.5 + (i % 2) * 0.55, y + 2.1 + Math.floor(i / 2) * 0.3, 0.5, 0.25, 6, PRODUCTS.caja_flores.color, { z: 0 });
  },

  // Freseros de Sibaté. Strawberry wash: baskets under flowing rinse shower; seconds drop
  // down back chute toward Marmita.
  lavadero_fresas(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.35;
    box(g, x0, y0 + 0.4, 1.9, 1.1, 10, 0xb0bec5);
    g.poly(isoPoly([[x0 + 0.08, y0 + 0.48, 10], [x0 + 1.82, y0 + 0.48, 10], [x0 + 1.82, y0 + 1.42, 10], [x0 + 0.08, y0 + 1.42, 10]])).fill(0x81d4fa);
    for (let k = 0; k < 3; k++) {
      const q = iso(x0 + 0.4 + k * 0.55, y0 + 0.95, 12);
      g.rect(q.x - 7, q.y - 5, 14, 6).fill(0x43a047).stroke({ width: 0.7, color: 0x1b5e20 });
      for (const dx of [-4, 0, 4]) g.circle(q.x + dx, q.y - 6, 2.3).fill(PRODUCTS.fresa.color);
    }
    const c0 = iso(x + 2.3, y + 0.5, 10);
    const c1 = iso(x + 2.8, y + 2.2, 2);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 4, color: 0x8d6e4a });
    const pile = iso(x + 2.6, y + 2.6);
    g.ellipse(pile.x, pile.y - 3, 12, 6).fill(0x8d6e4a).stroke(OUTLINE);
    for (let k = 0; k < 6; k++) g.circle(pile.x - 8 + k * 3.2, pile.y - 5 - (k % 2) * 2, 1.8).fill(PRODUCTS.fresa_segunda.color);
    ramada(this, g, x0, y0, 2.0, 1.7, 28 + ctx.up, 0x9aa3a8);
    const shower = iso(x0 + 1.0, y0 + 0.95, 24);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (let k = 0; k < 5; k++) {
        const f = (time * 2 + k * 0.2) % 1;
        anim.circle(shower.x - 8 + k * 4, shower.y + f * 12, 1).fill({ color: 0xe1f5fe, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Sorter: long shed table sorting strawberries into full green punnets.
  seleccionadora_fresas(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.2, y0 + 0.5, 1.9, 0.6, 9, PAL.wood);
    for (let k = 0; k < 5; k++) {
      const q = iso(x0 + 0.4 + k * 0.33, y0 + 0.8, 9);
      g.circle(q.x, q.y - 2, 2.3).fill(PRODUCTS.fresa.color);
    }
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.5 + (i % 3) * 0.45, y + 2.4 + Math.floor(i / 3) * 0.35);
      g.rect(q.x - 6, q.y - 6, 12, 6).fill(0x43a047).stroke({ width: 0.7, color: 0x1b5e20 });
      for (const dx of [-3, 0, 3]) g.circle(q.x + dx, q.y - 7, 2).fill(PRODUCTS.fresa.color);
    }
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0x9aa3a8);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, wx] of [[0, 0.7], [1, 1.6]]) {
        const wp = iso(x0 + wx, y0 + 1.5);
        worker(anim, wp.x, wp.y, k ? 0x1e88e5 : 0xe53935);
        const reach = this.working ? Math.abs(Math.sin(time * 3 + k)) * 3 : 0;
        anim.circle(wp.x + 3, wp.y - 16 - reach, 2).fill(PRODUCTS.fresa.color);
      }
    };
    this.animate(0);
  },

  // Tray packer: white hall with belt moving lidded punnets out to stacked cartons.
  llenadora_bandejas(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 24, ctx, { wall: 0xf4f6f8, roofColor: 0x90a4ae });
    door(g, hx, hy, 1.4, 1.6, 16, 0x546e7a);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 12, 0x546e7a);
    box(g, x + 0.4, y + 2.2, 2.0, 0.35, 7, 0x455a64);
    for (let i = 0; i < 1 + Math.min(ctx.tier, 3); i++) box(g, x + 2.4 + (i % 2) * 0.3, y + 1.8 + Math.floor(i / 2) * 0.3, 0.28, 0.25, 6, 0xc8a26a);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < 3; k++) {
        const f = ((this.working ? time * 0.3 : 0) + k / 3) % 1;
        const q = iso(x + 0.5 + f * 1.8, y + 2.37, 8);
        anim.rect(q.x - 5, q.y - 3, 10, 3).fill(0xeceff1).stroke({ width: 0.6, color: 0x3a2418 });
        for (const dx of [-3, 0, 3]) anim.circle(q.x + dx, q.y - 3.5, 1.6).fill(PRODUCTS.fresa.color);
      }
    };
    this.animate(0);
  },

  // Strawberries-and-cream stand: roadside stall with red-and-white awning, cups, and sign.
  mesa_fresas_crema(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.5;
    box(g, x0, y0 + 0.5, 2.0, 0.7, 12, 0xfafafa);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x0 + 0.3 + (k % 4) * 0.42, y0 + 0.7 + Math.floor(k / 4) * 0.3, 12);
      g.rect(q.x - 2.5, q.y - 7, 5, 7).fill(0xfafafa).stroke({ width: 0.6, color: 0x3a2418 });
      g.circle(q.x, q.y - 8, 2.6).fill(0xfff3e0);
      g.circle(q.x, q.y - 10, 1.4).fill(PRODUCTS.fresa.color);
    }
    const r = 28 + ctx.up;
    for (const [px, py] of [[0, 0.3], [2.1, 0.3], [0, 1.4], [2.1, 1.4]]) box(g, x0 + px, y0 + py, 0.08, 0.08, r, 0x8d6e4a);
    for (let k = 0; k < 6; k++) {
      g.poly(isoPoly([[x0 + k * 0.36, y0 + 0.2, r], [x0 + (k + 1) * 0.36, y0 + 0.2, r], [x0 + (k + 1) * 0.36, y0 + 1.5, r + 4], [x0 + k * 0.36, y0 + 1.5, r + 4]])).fill(k % 2 ? 0xfafafa : 0xe53935).stroke({ width: 0.6, color: 0x3a2418 });
    }
    this.roofTop = iso(x0 + 1.1, y0 + 0.85, r + 4);
    const sign = iso(x0 + 2.4, y0 + 1.8, 18);
    g.moveTo(sign.x, sign.y + 18).lineTo(sign.x, sign.y).stroke({ width: 1.5, color: 0x6b4a2e });
    g.roundRect(sign.x - 11, sign.y - 8, 22, 10, 2).fill(0xfffaf0).stroke(OUTLINE);
    g.circle(sign.x - 4, sign.y - 3, 3).fill(PRODUCTS.fresa.color);
    g.circle(sign.x + 4, sign.y - 3, 3).fill(0xfff3e0).stroke({ width: 0.5, color: 0x3a2418 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.0, y0 + 2.0);
      worker(anim, wp.x, wp.y, 0xe53935);
      const spoon = this.working ? Math.sin(time * 5) * 3 : 0;
      anim.moveTo(wp.x + 4, wp.y - 15).lineTo(wp.x + 9 + spoon, wp.y - 19).stroke({ width: 1.2, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Jam kettle: copper kettle over fire with stirring ladle beside lined sealed jars.
  marmita_mermelada(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0, y0, 1.3, 1.1, 8, 0x9e9e9e);
    const c = iso(x0 + 0.65, y0 + 0.55, 8);
    g.ellipse(c.x, c.y - 6, 16, 7).fill(0xb87333).stroke(OUTLINE);
    g.rect(c.x - 16, c.y - 16, 32, 10).fill(0xc98a4b).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 16, 16, 6).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 16, 13, 4.5).fill(PRODUCTS.mermelada_fresa.color);
    this.lights.push({ x: c.x, y: c.y + 2, r: 18, color: 0xff7a1a });
    this.smokePoints.push(iso(x0 + 0.65, y0 + 0.55, 30));
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.4 + i * 0.32, y + 2.5);
      g.rect(q.x - 3, q.y - 8, 6, 8).fill(PRODUCTS.mermelada_fresa.color).stroke({ width: 0.6, color: 0x3a2418 });
      g.rect(q.x - 3.5, q.y - 10, 7, 2.5).fill(0xe53935).stroke({ width: 0.5, color: 0x3a2418 });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const a = this.working ? time * 2 : 0;
      anim.moveTo(c.x + Math.cos(a) * 8, c.y - 16 + Math.sin(a) * 2.5).lineTo(c.x + 14 + Math.cos(a) * 4, c.y - 34).stroke({ width: 2, color: 0x8d6e4a });
      if (this.working) for (let k = 0; k < 3; k++) anim.circle(c.x - 6 + k * 6, c.y - 17 - ((time * 3 + k) % 1) * 3, 1.4).fill({ color: 0xef5350, alpha: 0.8 });
    };
    this.animate(0);
  },

  // Truchas de Guatavita. Ceviche bench: steel counter with goblets, lemon-curing bowl, and lime basket.
  // lime basket.
  mesa_ceviche(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.45;
    box(g, x0, y0 + 0.4, 1.8, 0.8, 10, 0xb0bec5);
    const bowl = iso(x0 + 0.5, y0 + 0.8, 10);
    g.ellipse(bowl.x, bowl.y - 3, 10, 5).fill(0xeceff1).stroke(OUTLINE);
    g.ellipse(bowl.x, bowl.y - 4, 7.5, 3).fill(PRODUCTS.ceviche_trucha.color);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x0 + 1.0 + (k % 3) * 0.28, y0 + 0.65 + Math.floor(k / 3) * 0.3, 10);
      g.poly([q.x - 4, q.y - 7, q.x + 4, q.y - 7, q.x + 1, q.y - 2, q.x - 1, q.y - 2]).fill(0xe1f5fe).stroke({ width: 0.6, color: 0x3a2418 });
      g.rect(q.x - 0.6, q.y - 2, 1.2, 2).fill(0xe1f5fe);
      g.ellipse(q.x, q.y - 6.5, 3.2, 1.2).fill(PRODUCTS.ceviche_trucha.color);
    }
    const basket = iso(x + 2.5, y + 2.4);
    g.ellipse(basket.x, basket.y - 3, 9, 5).fill(0x8d6e4a).stroke(OUTLINE);
    for (let k = 0; k < 5; k++) g.circle(basket.x - 6 + k * 3, basket.y - 6 - (k % 2) * 2, 2.2).fill(0x9ccc65).stroke({ width: 0.5, color: 0x33691e });
    ramada(this, g, x0 - 0.1, y0 - 0.1, 2.0, 1.5, 26 + ctx.up, 0x9aa3a8);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 0.6, y0 + 1.6);
      worker(anim, wp.x, wp.y, 0xfafafa);
      const sq = this.working ? Math.abs(Math.sin(time * 4)) * 2 : 0;
      anim.circle(bowl.x + 2, bowl.y - 12 - sq, 2.3).fill(0x9ccc65);
      if (this.working && sq > 1.5) anim.circle(bowl.x + 2, bowl.y - 7, 0.9).fill(0xfff59d);
    };
    this.animate(0);
  },

  // Lakeside kitchen: tiled restaurant frying trout over hearth beside checkered tables.
  cocina_laguna(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.3, 24, ctx, { wall: 0xfbf8f1, roofColor: 0xb5512e });
    door(g, hx, hy, 1.3, 1.5, 16, 0x2e7d32);
    windowOnRight(this, g, hx, hy, 2.2, 0.65, 12, 0x2e7d32);
    this.smokePoints.push(iso(hx + 1.8, hy + 0.4, 40 + ctx.up));
    const tables = ctx.tier >= 2 ? [[0.6, 2.3], [1.5, 2.4], [2.4, 2.3]] : [[0.8, 2.3], [2.0, 2.4]];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 8, 0xe53935);
      const q = iso(x + tx, y + ty, 8);
      g.ellipse(q.x, q.y - 1, 6, 3).fill(0xfafafa).stroke({ width: 0.5, color: 0x3a2418 });
      fishOn(g, q.x, q.y - 1.5, 4, PRODUCTS.almuerzo_trucha.color);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.7) + 1) / 2 : 0.5;
      const w = iso(x + 0.5 + f * 2, y + 2.85);
      worker(anim, w.x, w.y, 0xfafafa);
    };
    this.animate(0);
  },

  // Salinas de Nemocón. Brine wells: rock salt dissolving pools feeding salt blocks down rear chute
  // to Carving workshop.
  pozos_salmuera(g, x, y, ctx) {
    const pools = ctx.tier >= 2 ? [[0.3, 0.4], [1.3, 0.4], [0.3, 1.4], [1.3, 1.4]] : [[0.4, 0.5], [1.4, 0.5], [0.8, 1.5]];
    this.pools = [];
    for (const [px, py] of pools) {
      box(g, x + px, y + py, 0.85, 0.85, 6, 0x9e9e9e);
      g.poly(isoPoly([[x + px + 0.07, y + py + 0.07, 6], [x + px + 0.78, y + py + 0.07, 6], [x + px + 0.78, y + py + 0.78, 6], [x + px + 0.07, y + py + 0.78, 6]])).fill(0x9fd8ee);
      const r = iso(x + px + 0.3, y + py + 0.35, 6);
      g.poly([r.x - 4, r.y, r.x, r.y - 4, r.x + 5, r.y - 1, r.x + 2, r.y + 2]).fill(PRODUCTS.roca_sal.color).stroke({ width: 0.6, color: 0x3a2418 });
      this.pools.push(iso(x + px + 0.42, y + py + 0.42, 6));
    }
    const c0 = iso(x + 2.3, y + 0.5, 10);
    const c1 = iso(x + 2.8, y + 2.2, 2);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 4, color: 0x8d6e4a });
    for (let i = 0; i < 4; i++) box(g, x + 2.35 + (i % 2) * 0.3, y + 2.3 + Math.floor(i / 2) * 0.28, 0.26, 0.24, 8, PRODUCTS.bloque_sal.color, { z: 0 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, t] of this.pools.entries()) {
        const f = this.working ? (time * 0.5 + k * 0.27) % 1 : 0;
        anim.ellipse(t.x, t.y, 4 + f * 9, 2 + f * 4).stroke({ width: 1, color: 0xffffff, alpha: 0.8 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Carving workshop: shed where sculptor chisels cross from salt block beside finished pieces.
  // repisa.
  taller_tallado(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    box(g, x0 + 0.3, y0 + 0.6, 0.6, 0.6, 12, PRODUCTS.bloque_sal.color);
    box(g, x0 + 1.3, y0 + 0.4, 0.9, 0.35, 10, PAL.wood);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x0 + 1.4 + k * 0.18, y0 + 0.55, 10);
      g.rect(q.x - 1, q.y - 9, 2, 9).fill(0xf4f1ea).stroke({ width: 0.5, color: 0x3a2418 });
      g.rect(q.x - 3, q.y - 7, 6, 1.6).fill(0xf4f1ea).stroke({ width: 0.5, color: 0x3a2418 });
    }
    ramada(this, g, x0, y0, 2.3, 1.6, 28 + ctx.up, 0x9aa3a8);
    const block = iso(x0 + 0.6, y0 + 0.9, 12);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 0.9, y0 + 1.5);
      worker(anim, wp.x, wp.y, 0x6d4c41);
      const hit = this.working ? Math.abs(Math.sin(time * 7)) * 3 : 0;
      anim.moveTo(wp.x - 2, wp.y - 16).lineTo(block.x + 4 + hit, block.y - 8).stroke({ width: 1.4, color: 0x607d8b });
      if (this.working) for (let k = 0; k < 3; k++) anim.circle(block.x + 2 + ((time * 9 + k * 3) % 6), block.y - 12 - ((time * 4 + k) % 1) * 6, 0.9).fill(0xffffff);
    };
    this.animate(0);
  },

  // Evaporation pans: tin pans over brick furnace crystallizing white salt beneath rising steam.
  // rising steam.
  tachos_evaporacion(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.4;
    box(g, x0, y0 + 0.2, 2.2, 1.5, 10, 0xb5653a);
    const pans = ctx.tier >= 2 ? [[0.15, 0.3], [1.15, 0.3], [0.15, 1.0], [1.15, 1.0]] : [[0.2, 0.4], [1.2, 0.4], [0.7, 1.05]];
    this.steam = [];
    for (const [px, py] of pans) {
      box(g, x0 + px, y0 + py, 0.85, 0.6, 4, 0x90a4ae, { z: 10 });
      g.poly(isoPoly([[x0 + px + 0.06, y0 + py + 0.06, 14], [x0 + px + 0.79, y0 + py + 0.06, 14], [x0 + px + 0.79, y0 + py + 0.54, 14], [x0 + px + 0.06, y0 + py + 0.54, 14]])).fill(0xf7f7f2);
      this.steam.push(iso(x0 + px + 0.42, y0 + py + 0.3, 16));
    }
    const mouth = iso(x0 + 1.1, y0 + 1.7, 3);
    g.rect(mouth.x - 6, mouth.y - 6, 12, 6).fill(0x2b1d14);
    this.lights.push({ x: mouth.x, y: mouth.y - 3, r: 16, color: 0xff7a1a });
    this.roofTop = iso(x0 + 1.1, y0 + 0.9, 24);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (const [k, p] of this.steam.entries()) {
        const f = (time * 0.6 + k * 0.3) % 1;
        anim.circle(p.x + Math.sin(time + k) * 3, p.y - f * 22, 3 + f * 4).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
      anim.poly([mouth.x - 4, mouth.y, mouth.x, mouth.y - 5 - Math.sin(time * 9) * 1.5, mouth.x + 4, mouth.y]).fill(0xff8c1a);
    };
    this.animate(0);
  },

  // Clay brine pots (gachas): row of Muisca-style conical clay pots over embers beside
  // crystallized salt loaves.
  gachas_barro(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.6;
    box(g, x0, y0 + 0.5, 2.0, 0.7, 4, 0x5d4037);
    g.poly(isoPoly([[x0 + 0.05, y0 + 0.55, 4], [x0 + 1.95, y0 + 0.55, 4], [x0 + 1.95, y0 + 1.15, 4], [x0 + 0.05, y0 + 1.15, 4]])).fill(0x3e2723);
    this.coals = [];
    for (let k = 0; k < 4; k++) {
      const q = iso(x0 + 0.3 + k * 0.45, y0 + 0.85, 4);
      g.poly([q.x - 6, q.y - 14, q.x + 6, q.y - 14, q.x, q.y + 2]).fill(0xc0784a).stroke(OUTLINE);
      g.ellipse(q.x, q.y - 14, 6, 2).fill(0xf4f1ea).stroke({ width: 0.6, color: 0x3a2418 });
      this.coals.push(q);
    }
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.5 + i * 0.35, y + 2.5);
      g.poly([q.x - 4, q.y, q.x, q.y - 11, q.x + 4, q.y]).fill(PRODUCTS.pan_sal.color).stroke({ width: 0.7, color: 0x3a2418 });
    }
    this.lights.push({ x: this.coals[1].x, y: this.coals[1].y, r: 22, color: 0xff6d00 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (const [k, q] of this.coals.entries()) anim.circle(q.x + Math.sin(time * 5 + k) * 3, q.y + 4, 1.4).fill({ color: 0xff8c1a, alpha: 0.7 + 0.3 * Math.sin(time * 7 + k) });
    };
    this.animate(0);
  },

  // Gift packer: white mine shop with wooden gift chests stacked along porch.
  empaque_regalo(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xfbf8f1, roofColor: 0x8d6e63 });
    door(g, hx, hy, 1.5, 1.7, 18, 0x6d4c41);
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, 0x6d4c41);
    const s2 = iso(hx + 0.8, hy + 1.5, 24 + ctx.up);
    g.roundRect(s2.x - 12, s2.y - 7, 24, 12, 3).fill(0xfffaf0).stroke(OUTLINE);
    g.rect(s2.x - 1, s2.y - 5, 2, 8).fill(0xb0a898);
    g.rect(s2.x - 4, s2.y - 3, 8, 2).fill(0xb0a898);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 4); i++) box(g, x + 1.6 + (i % 3) * 0.4, y + 2.1 + Math.floor(i / 3) * 0.4, 0.34, 0.3, 7, PRODUCTS.cofre_sal.color, { z: 0 });
  },

  // Gift hamper table: awning workbench assembling hampers with salt loaves, roses, and berries.
  armadora_canastas(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.4;
    box(g, x0, y0 + 0.5, 2.0, 0.7, 10, PAL.wood);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x0 + 0.25 + (k % 4) * 0.45, y0 + 0.75 + Math.floor(k / 4) * 0.3, 10);
      g.ellipse(q.x, q.y - 2, 6, 3).fill(PRODUCTS.canasta_sabanera.color).stroke({ width: 0.7, color: 0x3a2418 });
      g.circle(q.x - 2.5, q.y - 4, 1.8).fill(0xd81b3c);
      g.poly([q.x, q.y - 9, q.x - 2, q.y - 3, q.x + 2, q.y - 3]).fill(0xf4f1ea);
      g.circle(q.x + 3, q.y - 4, 1.5).fill(0xe53935);
    }
    const r = 26 + ctx.up;
    for (const [px, py] of [[0, 0.3], [2.0, 0.3], [0, 1.4], [2.0, 1.4]]) box(g, x0 + px, y0 + py, 0.08, 0.08, r, 0x8d6e4a);
    g.poly(isoPoly([[x0, y0 + 0.2, r], [x0 + 2.1, y0 + 0.2, r], [x0 + 2.1, y0 + 1.5, r + 4], [x0, y0 + 1.5, r + 4]])).fill(0x6d8f4e).stroke(OUTLINE);
    this.roofTop = iso(x0 + 1.05, y0 + 0.85, r + 4);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const wp = iso(x0 + 1.0, y0 + 1.9);
      worker(anim, wp.x, wp.y, 0x7e57c2);
      const lift = this.working ? Math.abs(Math.sin(time * 3)) * 3 : 0;
      anim.circle(wp.x + 4, wp.y - 18 - lift, 2).fill(0xd81b3c);
    };
    this.animate(0);
  },

  // Cocina de la Sabana. Broth pot: wood hearth with giant pot dissolving three potato types;
  // steam rises as cook stirs.
  olla_caldo(g, x, y, ctx) {
    const x0 = x + 0.45;
    const y0 = y + 0.45;
    box(g, x0, y0, 1.5, 1.2, 10, 0xb5653a);
    const c = iso(x0 + 0.75, y0 + 0.6, 10);
    g.rect(c.x - 15, c.y - 18, 30, 14).fill(0x90a4ae).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 18, 15, 5.5).fill(0x78909c).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 18, 12.5, 4).fill(PRODUCTS.caldo_papas.color);
    for (const [dx, col] of [[-5, 0xfdd835], [3, 0xe8d6a8]]) g.circle(c.x + dx, c.y - 18, 2.2).fill(col);
    this.lights.push({ x: c.x, y: c.y + 2, r: 18, color: 0xff7a1a });
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.4 + i * 0.4, y + 2.5);
      g.ellipse(q.x, q.y - 4, 6, 4).fill(0x8d6e4a).stroke(OUTLINE);
      g.circle(q.x - 2, q.y - 6, 1.8).fill(0xc9a06a);
      g.circle(q.x + 2, q.y - 6, 1.6).fill(0xfdd835);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (this.working) for (let k = 0; k < 3; k++) {
        const f = (time * 0.6 + k * 0.33) % 1;
        anim.circle(c.x - 6 + k * 6 + Math.sin(time + k) * 2, c.y - 24 - f * 20, 3 + f * 3).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
      const wp = iso(x0 + 1.6, y0 + 1.5);
      worker(anim, wp.x, wp.y, 0xfafafa);
      const stir = this.working ? Math.sin(time * 3) * 4 : 0;
      anim.moveTo(c.x + stir, c.y - 18).lineTo(c.x + 10 + stir, c.y - 34).stroke({ width: 2, color: 0x8d6e4a });
    };
    this.animate(0);
  },

  // Ajiaco kitchen: bahareque kitchen with clay-pot hearth and hanging guascas herb bundles.
  olla_ajiaco(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 24, ctx, { wall: 0xfbf8f1, roofColor: 0xb5512e });
    door(g, hx, hy, 1.4, 1.6, 16, 0x2e7d32);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 12, 0x2e7d32);
    this.smokePoints.push(iso(hx + 1.8, hy + 0.4, 40 + ctx.up));
    box(g, x + 0.4, y + 2.1, 1.9, 0.55, 8, 0xb5653a);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) {
      const q = iso(x + 0.7 + k * 0.5, y + 2.4, 8);
      g.ellipse(q.x, q.y - 4, 7, 5).fill(0x8d5a32).stroke(OUTLINE);
      g.ellipse(q.x, q.y - 7, 6, 2.2).fill(PRODUCTS.ajiaco.color);
    }
    const h = iso(hx + 2.2, hy + 0.4, 20);
    for (let k = 0; k < 3; k++) g.moveTo(h.x + 2 + k * 3, h.y).quadraticCurveTo(h.x + 4 + k * 3, h.y + 8, h.x + 1 + k * 3, h.y + 12).stroke({ width: 2, color: 0x558b2f });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const q = iso(x + 1.4, y + 2.95);
      worker(anim, q.x, q.y, 0xe53935);
      if (this.working) anim.circle(q.x + 6, q.y - 26 - ((time * 2) % 1) * 6, 2).fill({ color: 0xffffff, alpha: 0.6 });
    };
    this.animate(0);
  },

  // Serving counter: station plating ajiaco with cream, capers, and avocado.
  servidora_ajiaco(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.45;
    box(g, x0, y0 + 0.4, 2.0, 0.8, 12, 0xfafafa);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const q = iso(x0 + 0.25 + (k % 4) * 0.45, y0 + 0.65 + Math.floor(k / 4) * 0.35, 12);
      g.ellipse(q.x, q.y - 1, 5.5, 3).fill(0xa85a32).stroke({ width: 0.6, color: 0x3a2418 });
      g.ellipse(q.x, q.y - 2, 4.4, 2).fill(PRODUCTS.ajiaco.color);
      g.circle(q.x - 1.4, q.y - 2.4, 1.1).fill(0xfffaf0);
      g.circle(q.x + 1.6, q.y - 2.2, 0.8).fill(0x558b2f);
    }
    ramada(this, g, x0 - 0.1, y0 - 0.1, 2.2, 1.5, 26 + ctx.up, 0x9aa3a8);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.8) + 1) / 2 : 0.5;
      const wp = iso(x0 + 0.4 + f * 1.4, y0 + 1.6);
      worker(anim, wp.x, wp.y, 0xfafafa);
    };
    this.animate(0);
  },

  // Santafereño restaurant: balconied mansion with ajiaco sign and courtyard checkered tables.
  restaurante_santafereno(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.4, 30, ctx, { wall: 0xfbf8f1, roofColor: 0xb5512e });
    door(g, hx, hy, 1.4, 1.7, 18, 0x2e5d8a);
    windowOnRight(this, g, hx, hy, 2.4, 0.7, 16, 0x2e5d8a);
    balcony(g, hx, hy, 2.4, 1.4, 16, 0x2e5d8a);
    const s2 = iso(hx + 0.8, hy + 1.4, 26 + ctx.up);
    g.roundRect(s2.x - 13, s2.y - 7, 26, 12, 3).fill(0xfffaf0).stroke(OUTLINE);
    g.ellipse(s2.x, s2.y - 1, 6, 3).fill(0xa85a32);
    g.ellipse(s2.x, s2.y - 2, 4.6, 1.8).fill(PRODUCTS.ajiaco.color);
    const tables = ctx.tier >= 2 ? [[0.6, 2.4], [1.5, 2.5], [2.4, 2.4]] : [[0.8, 2.4], [2.0, 2.5]];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 8, 0xe53935);
      const q = iso(x + tx, y + ty, 8);
      g.ellipse(q.x, q.y - 1, 5, 2.6).fill(0xa85a32);
      g.ellipse(q.x, q.y - 1.6, 3.8, 1.6).fill(PRODUCTS.ajiaco.color);
    }
  },

  // Zipaquirá. Salt Cathedral entrance: mountain mine portal topped with white cross, blue
  // tunnel glow, and helmeted tourist line; cross lights up at night.
  entrada_catedral(g, x, y, ctx) {
    const c = iso(x + 1.3, y + 1.0);
    shadow(g, c.x + 4, c.y + 6, 60, 22);
    g.moveTo(c.x - 52, c.y + 6).quadraticCurveTo(c.x - 46, c.y - 46, c.x, c.y - 52).quadraticCurveTo(c.x + 46, c.y - 46, c.x + 52, c.y + 6).quadraticCurveTo(c.x, c.y + 22, c.x - 52, c.y + 6).fill(0x8d7f72).stroke(OUTLINE);
    g.moveTo(c.x - 34, c.y - 20).quadraticCurveTo(c.x - 20, c.y - 44, c.x + 4, c.y - 46).quadraticCurveTo(c.x - 14, c.y - 34, c.x - 26, c.y - 14).closePath().fill(0xa89a8c);
    g.moveTo(c.x - 14, c.y + 10).lineTo(c.x - 14, c.y - 12).quadraticCurveTo(c.x, c.y - 26, c.x + 14, c.y - 12).lineTo(c.x + 14, c.y + 10).closePath().fill(0x1a1f3a).stroke(OUTLINE);
    g.moveTo(c.x - 9, c.y + 9).lineTo(c.x - 9, c.y - 9).quadraticCurveTo(c.x, c.y - 18, c.x + 9, c.y - 9).lineTo(c.x + 9, c.y + 9).closePath().fill(0x3949ab);
    const cross = { x: c.x, y: c.y - 58 - ctx.up * 0.3 };
    g.rect(cross.x - 2.5, cross.y - 16, 5, 22).fill(0xf4f1ea).stroke(OUTLINE);
    g.rect(cross.x - 9, cross.y - 10, 18, 4.5).fill(0xf4f1ea).stroke(OUTLINE);
    this.roofTop = { x: cross.x, y: cross.y - 16 };
    this.lights.push({ x: c.x, y: c.y - 4, r: 30, color: 0x5c6bc0 }, { x: cross.x, y: cross.y - 4, r: 18, color: 0xe8eaf6 });
    const sign = iso(x + 2.6, y + 2.3, 16);
    g.moveTo(sign.x, sign.y + 16).lineTo(sign.x, sign.y).stroke({ width: 1.5, color: 0x6b4a2e });
    g.roundRect(sign.x - 12, sign.y - 8, 24, 10, 2).fill(0xfffaf0).stroke(OUTLINE);
    g.rect(sign.x - 1, sign.y - 7, 2, 8).fill(0x3949ab);
    g.rect(sign.x - 4, sign.y - 5, 8, 2).fill(0x3949ab);
    const anim = new Graphics();
    this.anim.addChild(anim);
    const n = 2 + Math.min(ctx.tier, 4);
    this.animate = (time) => {
      anim.clear();
      for (let k = 0; k < n; k++) {
        const f = ((this.working ? time * 0.08 : 0) + k / n) % 1;
        const q = iso(x + 2.6 - f * 1.3, y + 2.9 - f * 1.5);
        if (f > 0.92) continue;
        worker(anim, q.x, q.y, [0xe53935, 0x1e88e5, 0x43a047, 0xfbc02d, 0x8e24aa, 0xff7043][k % 6]);
        anim.ellipse(q.x, q.y - 21, 3.4, 1.6).fill(0xfdd835);
      }
    };
    this.animate(0);
  },

  // --- Bogotá · La Candelaria (v4.5): colorful colonial houses, wood balconies, clay tile ---

  // Seventh Ave café: corner orange house with striped awning, sidewalk tables, tinto sign.
  cafeteria_septima(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.1, 1.4, 28, ctx, { wall: 0xf0a04b, roofH: 14 });
    door(g, hx, hy, 1.4, 0.6, 16, 0x1e5aa8);
    windowOnRight(this, g, hx, hy, 2.1, 0.7, 14, 0x1e5aa8);
    // Striped awning over doorway.
    const a = iso(hx + 0.2, hy + 1.4, 20);
    const b = iso(hx + 1.4, hy + 1.4, 20);
    const c = iso(hx + 1.4, hy + 1.85, 15);
    const d = iso(hx + 0.2, hy + 1.85, 15);
    g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(0xfafafa).stroke(OUTLINE);
    for (let k = 0; k < 6; k += 2) {
      const p0 = iso(hx + 0.2 + k * 0.2, hy + 1.4, 20);
      const p1 = iso(hx + 0.4 + k * 0.2, hy + 1.4, 20);
      const p2 = iso(hx + 0.4 + k * 0.2, hy + 1.85, 15);
      const p3 = iso(hx + 0.2 + k * 0.2, hy + 1.85, 15);
      g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill(0xd7263d);
    }
    for (const [tx, ty] of [[0.7, 2.5], [1.8, 2.4]].slice(0, 1 + Math.min(ctx.tier, 1))) {
      const p = iso(x + tx, y + ty);
      shadow(g, p.x, p.y + 1, 10, 4);
      g.rect(p.x - 1, p.y - 9, 2, 9).fill(0x555555);
      g.ellipse(p.x, p.y - 9, 7, 3.5).fill(0xffffff).stroke(OUTLINE);
      g.ellipse(p.x - 2, p.y - 11, 1.8, 1.2).fill(0xfafafa).stroke({ width: 0.6, color: 0x3a2418 });
      g.ellipse(p.x + 2.5, p.y - 10.5, 2.4, 1).fill(PRODUCTS.bizcochos.color);
    }
    const s = iso(hx + 2.1, hy + 0.2, 30);
    g.roundRect(s.x - 2, s.y - 10, 16, 10, 2).fill(0x2b1a10).stroke(OUTLINE);
    g.circle(s.x + 6, s.y - 5, 2.6).fill(0xfafafa);
  },

  // Santafereña chocolatería: two-story blue mansion with wood balcony; chocolate pot boils inside.
  chocolateria_candelaria(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up }, { wall: 0x5b8fd6, roofH: 15 });
    door(g, hx, hy, 1.6, 0.6, 17, 0x6d4c41);
    door(g, hx, hy, 1.6, 1.5, 17, 0x6d4c41);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, 0xffe082);
    const z = 22 + up / 2;
    g.poly(isoPoly([[hx, hy + 1.6, z], [hx + 2.3, hy + 1.6, z], [hx + 2.3, hy + 1.85, z], [hx, hy + 1.85, z]])).fill(0x5d4037).stroke(OUTLINE);
    for (let k = 0; k <= 10; k++) {
      const a = iso(hx + (2.3 * k) / 10, hy + 1.85, z);
      const b = iso(hx + (2.3 * k) / 10, hy + 1.85, z + 7);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x6d4c41 });
    }
    // Signboard: hot chocolate cup.
    const s = iso(hx + 1.05, hy + 1.6, 18);
    g.roundRect(s.x - 9, s.y - 8, 18, 9, 2).fill(0xfff3d6).stroke(OUTLINE);
    g.ellipse(s.x, s.y - 3.5, 4, 2.4).fill(PRODUCTS.chocolate_completo.color);
    this.smokePoints.push(iso(hx + 1.8, hy + 0.5, 30 + up + 15));
  },

  // Calle 11 candy shop: pink storefront with display case full of sweets and green awning.
  dulceria_calle11(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.2, 1.4, 27, ctx, { wall: 0xf3a6c0, roofH: 13 });
    door(g, hx, hy, 1.4, 1.7, 16, 0x2f7d4f);
    // Glass showcase filled with jars and trays.
    box(g, hx + 0.25, hy + 1.5, 1.05, 0.45, 9, 0xdff3fb);
    const colors = [PRODUCTS.cocada.color, PRODUCTS.bocadillo_crate.color, 0xfafafa, 0xe57373, PRODUCTS.onces_bogotanas.color];
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const p = iso(hx + 0.38 + k * 0.2, hy + 1.72, 9);
      g.circle(p.x, p.y - 1.5, 2.2).fill(colors[k % colors.length]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    const a = iso(hx + 0.1, hy + 1.4, 22);
    const b = iso(hx + 2.1, hy + 1.4, 22);
    const c = iso(hx + 2.1, hy + 1.8, 18);
    const d = iso(hx + 0.1, hy + 1.8, 18);
    g.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill(0x2f7d4f).stroke(OUTLINE);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 14, 0x2f7d4f);
  },

  // Colonial house: two-story yellow mansion with full wood balcony, geraniums, corner lantern.
  casa_colonial(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.5, 1.7, 30, { ...ctx, up }, { wall: 0xf2c94c, roofH: 16 });
    door(g, hx, hy, 1.7, 0.8, 18, 0x1e5aa8);
    door(g, hx, hy, 1.7, 1.8, 18, 0x1e5aa8);
    windowOnRight(this, g, hx, hy, 2.5, 0.85, 14, 0x1e5aa8);
    const z = 22 + up / 2;
    g.poly(isoPoly([[hx, hy + 1.7, z], [hx + 2.5, hy + 1.7, z], [hx + 2.5, hy + 1.98, z], [hx, hy + 1.98, z]])).fill(0x5d4037).stroke(OUTLINE);
    for (let k = 0; k <= 12; k++) {
      const a = iso(hx + (2.5 * k) / 12, hy + 1.98, z);
      const b = iso(hx + (2.5 * k) / 12, hy + 1.98, z + 7);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.2, color: 0x6d4c41 });
    }
    for (const bx of [0.3, 0.95, 1.6, 2.25]) {
      const p = iso(hx + bx, hy + 1.98, z + 8);
      g.rect(p.x - 2.5, p.y - 3, 5, 3).fill(0xa1693f);
      for (const [dx, dy] of [[-2, -4], [1.5, -5], [0, -6.5]]) g.circle(p.x + dx, p.y + dy, 1.8).fill(0xd7263d);
    }
    const l = iso(hx + 2.5, hy + 1.7, 24);
    g.rect(l.x - 1, l.y - 2, 6, 2).fill(0x2b2b2b);
    g.rect(l.x + 3, l.y - 8, 6, 8).fill(0xffd27a).stroke({ width: 1.5, color: 0x2b2b2b });
    this.lights.push({ x: l.x + 6, y: l.y - 4, r: 22 });
  },

  // --- Bogotá · Chapinero & Zona G (v4.5): exposed brick houses, pitched roofs, restaurants ---

  // Zona G pantry: brick house with green awning and window stacked with colorful sauce jars.
  despensa_zona_g(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.2, 1.4, 26, ctx, { wall: BRICK, roofH: 14, roofColor: 0x5d4037 });
    door(g, hx, hy, 1.4, 1.75, 16, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.2, 0.7, 14, 0xcfe3ee);
    box(g, hx + 0.2, hy + 1.45, 1.2, 0.35, 10, 0x5d4037);
    const jars = [0x3e2723, 0x7cb342, 0xe53935, 0xfbc02d, 0x6a1b9a, 0xff9800];
    for (let k = 0; k < 4 + Math.min(ctx.tier, 2); k++) {
      const p = iso(hx + 0.3 + k * 0.17, hy + 1.62, 10);
      g.roundRect(p.x - 1.8, p.y - 6, 3.6, 6, 1).fill(jars[k]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    awningFront(g, hx + 0.1, hy, 2.0, 1.4, 22, 0x2f7d4f);
  },

  // Appetizer kitchen: brick house with smoking chimney and outdoor picada table.
  cocina_entradas(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 26, ctx, { wall: BRICK, roofH: 15, roofColor: 0x37474f });
    door(g, hx, hy, 1.5, 0.6, 16, 0x1e5aa8);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, 0xffe082);
    box(g, hx + 1.4, hy + 0.3, 0.3, 0.3, 26 + ctx.up + 20, 0x8a3b22);
    this.smokePoints.push(iso(hx + 1.55, hy + 0.45, 26 + ctx.up + 22));
    const p = iso(x + 1.2, y + 2.5);
    shadow(g, p.x, p.y + 1, 12, 5);
    g.rect(p.x - 1, p.y - 9, 2, 9).fill(0x555555);
    g.ellipse(p.x, p.y - 9, 8, 4).fill(0xa1693f).stroke(OUTLINE);
    for (const [dx, col] of [[-3, PRODUCTS.criollas_box.color], [1, 0xe6c26a], [4, 0x3e2723]]) g.circle(p.x + dx, p.y - 10, 1.6).fill(col);
  },

  // Steakhouse grill: brick house with large outdoor grill, meat skewers, and rising smoke.
  parrilla_zona_g(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.4, 26, ctx, { wall: BRICK, roofH: 14, roofColor: 0x5d4037 });
    door(g, hx, hy, 1.4, 0.6, 16, 0x5d4037);
    windowOnRight(this, g, hx, hy, 1.8, 0.7, 14, 0xffe082);
    // Brick grill firebox with grate and roasting cuts.
    box(g, x + 1.9, y + 1.8, 0.9, 0.6, 10, 0x8a3b22);
    const r = iso(x + 2.35, y + 2.1, 10);
    g.ellipse(r.x, r.y, 14, 6).fill(0x2b2b2b);
    for (let k = -2; k <= 2; k++) g.moveTo(r.x - 12, r.y + k * 1.8).lineTo(r.x + 12, r.y + k * 1.8).stroke({ width: 0.8, color: 0x9e9e9e });
    for (const dx of [-6, 0, 6]) g.roundRect(r.x + dx - 2.5, r.y - 2.5, 5, 3, 1).fill(0x8d4f2a);
    this.smokePoints.push(iso(x + 2.35, y + 2.1, 16));
  },

  // Bakery & juices: pink-painted brick cottage with counter juice dispensers and pastry case.
  reposteria_zona_g(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.1, 1.4, 26, ctx, { wall: 0xf8bbd0, roofH: 13, roofColor: 0x8a3b22 });
    door(g, hx, hy, 1.4, 1.7, 16, 0x6a1b9a);
    windowOnRight(this, g, hx, hy, 2.1, 0.7, 14, 0xcfe3ee);
    box(g, hx + 0.2, hy + 1.45, 1.1, 0.35, 10, 0xdff3fb);
    for (const [k, col] of [[0, 0x6a1b9a], [1, 0xfbc02d], [2, 0xfafafa], [3, 0xe57373]]) {
      const p = iso(hx + 0.32 + k * 0.24, hy + 1.62, 10);
      g.ellipse(p.x, p.y - 2, 3, 2).fill(col).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    // Corner juice dispenser.
    const d = iso(hx + 2.1, hy + 1.6, 0);
    g.rect(d.x - 4, d.y - 16, 8, 16).fill(0xeceff1).stroke(OUTLINE);
    g.rect(d.x - 3, d.y - 15, 6, 6).fill(0xfbc02d);
    g.rect(d.x - 3, d.y - 8, 6, 5).fill(0x6a1b9a);
    awningFront(g, hx + 0.1, hy, 1.9, 1.4, 22, 0x6a1b9a);
  },

  // Zona G restaurant: two-story brick house with terrace greenery and warm string bulbs.
  restaurante_zona_g(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.5, 1.6, 30, { ...ctx, up }, { wall: BRICK, roofH: 16, roofColor: 0x37474f });
    door(g, hx, hy, 1.6, 0.8, 18, 0x2b2b2b);
    windowOnRight(this, g, hx, hy, 2.5, 0.8, 14, 0xffe082);
    windowOnRight(this, g, hx, hy, 2.5, 0.8, 30, 0xffe082);
    // Lit string bulbs hung over terrace.
    const a = iso(hx, hy + 2.6, 22);
    const b = iso(hx + 2.5, hy + 2.6, 22);
    g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 6, b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 4.5;
      g.circle(px, py + 1.5, 1.6).fill(0xffe082);
      if (k % 2) this.lights.push({ x: px, y: py, r: 12 });
    }
    for (const [tx, ty] of [[0.6, 2.5], [1.7, 2.6]]) {
      const p = iso(x + tx, y + ty);
      shadow(g, p.x, p.y + 1, 10, 4);
      g.rect(p.x - 1, p.y - 9, 2, 9).fill(0x2b2b2b);
      g.ellipse(p.x, p.y - 9, 7, 3.5).fill(0xfafafa).stroke(OUTLINE);
      g.rect(p.x - 0.8, p.y - 14, 1.6, 4).fill(0xfff8e1);
      g.circle(p.x, p.y - 15, 1.2).fill(0xff9800);
    }
  },

  // --- Bogotá · Usaquén (v4.5): Sunday flea-market white awnings ---

  toldo_tejidos(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.5, ctx, 0x2e4fa8, [0x5d4037, 0x3e2723, 0x2e4fa8, 0xf4f1ea, 0x8d6e63]);
  },
  toldo_sombreros(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.5, ctx, 0xd7263d, [0xf4efe6, 0x8d5a32, 0xf4efe6, 0x5d3a1e, 0xf4efe6]);
  },
  toldo_loza(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.5, ctx, 0x2f7d4f, [0x2b2b2b, 0xc9a26a, 0x2b2b2b, 0xc9a26a, 0x424242]);
  },
  toldo_mascaras(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.5, ctx, 0xf2b705, [0xe0c08a, 0xe8b04c, 0xd7263d, 0xe8b04c, 0x3e2723]);
  },

  // Flea market: white Usaquén church fronted by twin market tents full of eclectic wares.
  mercado_pulgas(g, x, y, ctx) {
    const cx = x + 1.7;
    const cy = y + 0.2;
    box(g, cx, cy, 1.1, 1.0, 30 + ctx.up, 0xfbf8f1);
    gableRoof(g, cx, cy, 1.1, 1.0, 30 + ctx.up, 12, PAL.roof, 0xfbf8f1);
    box(g, cx + 0.75, cy + 0.6, 0.4, 0.4, 48 + ctx.up, 0xfbf8f1);
    const t = iso(cx + 0.95, cy + 0.8, 48 + ctx.up);
    g.poly([t.x - 8, t.y, t.x, t.y - 12, t.x + 8, t.y]).fill(PAL.roof).stroke(OUTLINE);
    g.rect(t.x - 0.8, t.y - 20, 1.6, 8).fill(0x5d4037);
    g.rect(t.x - 3, t.y - 17, 6, 1.6).fill(0x5d4037);
    this.roofTop = { x: t.x, y: t.y - 20 };
    fleaStall(this, g, x + 0.2, y + 1.5, ctx, 0xd7263d, [0x2e4fa8, 0xe8b04c, 0x2b2b2b, 0xd7263d, 0x8d5a32], 1.3);
  },

  // --- Bogotá · Paloquemao (v4.5): market stalls and blue-roofed central hall ---

  // Flower stall: tent fronted by buckets of colorful cut blooms.
  puesto_flores(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.3, ctx, 0x2f7d4f, [0xd81b3c, 0xfbc02d, 0xf06292, 0xfafafa, 0x8e24aa]);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x + 0.6 + k * 0.42, y + 2.45);
      g.rect(p.x - 3, p.y - 6, 6, 6).fill(0x78909c).stroke({ width: 0.6, color: 0x3a2418 });
      for (const [dx, dy, c] of [[-2, -8, 0xd81b3c], [1.5, -9, 0xfbc02d], [0, -11, 0xf06292]]) g.circle(p.x + dx, p.y + dy, 2).fill(c);
    }
  },

  // Fruit stall: tent stacked with pyramids of fruit.
  puesto_frutas(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.3, ctx, 0xf2b705, [0xfbc02d, 0x6a1b9a, 0xe53935, 0x8bc34a, 0xff9800]);
    for (const [k, c] of [[0, 0xfbc02d], [1, 0xe53935], [2, 0x8bc34a]].slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + 0.7 + k * 0.6, y + 2.45);
      for (const [dx, dy] of [[-3, 0], [0, 0], [3, 0], [-1.5, -2.6], [1.5, -2.6], [0, -5.2]]) g.circle(p.x + dx, p.y - 2 + dy, 1.9).fill(c).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.6 });
    }
  },

  // Fishmonger: white-tiled stall under blue awning with ice bed and hanging fish.
  pescaderia_plaza(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.2, 1.3, 24, ctx, { wall: 0xeef3f6, roofH: 12, roofColor: 0x5d8aa8 });
    box(g, hx + 0.2, hy + 1.35, 1.6, 0.4, 9, 0xdff3fb);
    for (let k = 0; k < 4; k++) {
      const p = iso(hx + 0.35 + k * 0.38, hy + 1.55, 9);
      g.ellipse(p.x, p.y - 1.5, 4, 1.6).fill(k % 2 ? 0xb8742a : 0xf8a5a5).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
    }
    awningFront(g, hx + 0.1, hy, 2.0, 1.3, 21, 0x1e5aa8);
    windowOnRight(this, g, hx, hy, 2.2, 0.65, 13, 0xcfe3ee);
  },

  // Market fritanga: stall with bubbling frying cauldron, whole lechona, and smoke.
  fritanga_plaza(g, x, y, ctx) {
    fleaStall(this, g, x + 0.4, y + 0.3, ctx, 0xd7263d, [0xd9a066, 0xfdd835, 0x5d2f17, 0xd9a066]);
    const p = iso(x + 1.6, y + 2.4);
    shadow(g, p.x, p.y + 2, 18, 7);
    g.rect(p.x - 10, p.y - 8, 20, 8).fill(0x8a3b22).stroke(OUTLINE);
    g.ellipse(p.x, p.y - 9, 13, 5).fill(0x2b2b2b).stroke(OUTLINE);
    g.ellipse(p.x, p.y - 9.5, 10, 3.6).fill(0xd9a066);
    for (const dx of [-5, 0, 5]) g.circle(p.x + dx, p.y - 10, 1.8).fill(0xfdd835);
    this.smokePoints.push(iso(x + 1.6, y + 2.4, 16));
  },

  // Paloquemao plaza: grand pale-walled blue-roofed market hall with arched entrance.
  plaza_paloquemao(g, x, y, ctx) {
    const hx = x + 0.15;
    const hy = y + 0.2;
    const w = 2.7;
    const d = 2.0;
    const H = 26 + ctx.up;
    box(g, hx, hy, w, d, H, 0xe0d6c4);
    gableRoof(g, hx, hy, w, d, H, 18, 0x5d8aa8, 0xe0d6c4);
    this.roofTop = iso(hx + w / 2, hy + d / 2, H + 18);
    const a = isoPoly([[hx + w / 2 - 0.35, hy + d, 0], [hx + w / 2 + 0.35, hy + d, 0], [hx + w / 2 + 0.35, hy + d, 16], [hx + w / 2 - 0.35, hy + d, 16]]);
    g.poly(a).fill(0x5d4037).stroke(OUTLINE);
    for (const at of [0.45, 2.25]) {
      const q = isoPoly([[hx + at - 0.25, hy + d, 12], [hx + at + 0.25, hy + d, 12], [hx + at + 0.25, hy + d, 18], [hx + at - 0.25, hy + d, 18]]);
      g.poly(q).fill(0xfff8e1).stroke(OUTLINE);
    }
    windowOnRight(this, g, hx, hy, w, 0.7, 14, 0xfff8e1);
    windowOnRight(this, g, hx, hy, w, 1.4, 14, 0xfff8e1);
  },

  // --- Bogotá · Downtown (v4.5) ---

  // Capital hotel: four-story white building with glowing windows and entry flags.
  hotel_capital(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const w = 2.3;
    const d = 1.7;
    const H = 50 + ctx.up;
    box(g, hx, hy, w, d, H, 0xeceff1);
    box(g, hx - 0.03, hy - 0.03, w + 0.06, d + 0.06, 3, 0xb0bec5, { z: H });
    this.roofTop = iso(hx + w / 2, hy + d / 2, H + 3);
    for (let f = 0; f < 4 + (ctx.up ? 1 : 0); f++) {
      for (const at of [0.35, 0.85, 1.35, 1.85]) {
        const z = 8 + f * 10;
        g.poly(isoPoly([[hx + at - 0.12, hy + d, z], [hx + at + 0.12, hy + d, z], [hx + at + 0.12, hy + d, z + 6], [hx + at - 0.12, hy + d, z + 6]])).fill(0xffe082).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      }
      windowOnRight(this, g, hx, hy, w, 0.85, 8 + f * 10, 0xffe082);
    }
    awningFront(g, hx + 0.7, hy, 0.9, d, 12, 0x1a237e);
    for (const [fx, col] of [[0.3, 0xfdd835], [2.0, 0xd7263d]]) {
      const p = iso(x + fx, y + 2.6);
      g.rect(p.x - 0.8, p.y - 30, 1.6, 30).fill(0x9e9e9e);
      g.poly([p.x + 0.8, p.y - 30, p.x + 12, p.y - 26, p.x + 0.8, p.y - 22]).fill(col).stroke({ width: 0.6, color: 0x3a2418 });
    }
  },

  // Monserrate funicular: lower station with track ascending toward Eastern Hills and red railcar.
  funicular_monserrate(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 1.2;
    house(this, g, hx, hy, 1.8, 1.4, 24, ctx, { wall: 0xfbf8f1, roofH: 12 });
    door(g, hx, hy, 1.4, 0.9, 15, 0x5d4037);
    // Track: twin rails climbing east (smaller gy) up toward the mountain.
    const a = iso(x + 1.2, y + 1.2, 6);
    const b = iso(x + 2.2, y - 0.6, 40);
    for (const off of [-3, 3]) g.moveTo(a.x + off, a.y).lineTo(b.x + off, b.y).stroke({ width: 1.6, color: 0x37474f });
    for (let k = 1; k < 6; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / 6, y: a.y + ((b.y - a.y) * k) / 6 };
      g.moveTo(p.x - 4, p.y).lineTo(p.x + 4, p.y).stroke({ width: 1, color: 0x6d4c41 });
    }
    const c = { x: a.x + (b.x - a.x) * 0.55, y: a.y + (b.y - a.y) * 0.55 };
    g.roundRect(c.x - 7, c.y - 9, 14, 9, 2).fill(0xd7263d).stroke(OUTLINE);
    g.rect(c.x - 5, c.y - 7, 4, 3).fill(0xcfe3ee);
    g.rect(c.x + 1, c.y - 7, 4, 3).fill(0xcfe3ee);
  },

  // Regions pavilion: grand yellow, blue, and red marquee flying regional color pennants.
  pabellon_regiones(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.3;
    const w = 2.6;
    const d = 1.8;
    const H = 18 + ctx.up / 2;
    box(g, hx, hy, w, d, H, 0xfafafa);
    gableRoof(g, hx, hy, w, d, H, 20, 0xfdd835, 0xfafafa, 0.2);
    this.roofTop = iso(hx + w / 2, hy + d / 2, H + 20);
    const cols = [0x8bc34a, 0xe5a15a, 0xf2c14e, 0x9fb4d8, 0xc8d66a, 0x4fb3bf, 0x3f9a5a, 0xe39b6a, 0xd98fb5];
    for (let k = 0; k < cols.length; k++) {
      const p = iso(hx + 0.1 + (k * (w - 0.2)) / (cols.length - 1), hy + d + 0.2, H - 1 - Math.sin((k / (cols.length - 1)) * Math.PI) * 4);
      g.poly([p.x - 2.5, p.y, p.x + 2.5, p.y, p.x, p.y + 5]).fill(cols[k]);
    }
    const door0 = isoPoly([[hx + w / 2 - 0.35, hy + d, 0], [hx + w / 2 + 0.35, hy + d, 0], [hx + w / 2 + 0.35, hy + d, 14], [hx + w / 2 - 0.35, hy + d, 14]]);
    g.poly(door0).fill(0xa1693f).stroke(OUTLINE);
  },

  // Gran Feria grounds: yellow entry arch striped blue and red, balloons, and star.
  gran_feria(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    box(g, hx, hy, 2.5, 1.5, 22 + ctx.up, 0xeceff1);
    gableRoof(g, hx, hy, 2.5, 1.5, 22 + ctx.up, 14, 0x1e5aa8, 0xeceff1);
    const z = 0;
    const a0 = iso(x + 0.5, y + 2.5, z);
    const a1 = iso(x + 2.5, y + 2.5, z);
    for (const p of [a0, a1]) {
      g.rect(p.x - 3, p.y - 34, 6, 34).fill(0xfdd835).stroke(OUTLINE);
      g.rect(p.x - 3, p.y - 14, 6, 7).fill(0x1e5aa8);
      g.rect(p.x - 3, p.y - 7, 6, 7).fill(0xd7263d);
    }
    g.moveTo(a0.x, a0.y - 34).quadraticCurveTo((a0.x + a1.x) / 2, (a0.y + a1.y) / 2 - 56, a1.x, a1.y - 34).stroke({ width: 6, color: 0xfdd835 });
    const top = { x: (a0.x + a1.x) / 2, y: (a0.y + a1.y) / 2 - 47 };
    g.star(top.x, top.y - 6, 5, 7, 3).fill(0xffd54f).stroke(OUTLINE);
    this.roofTop = { x: top.x, y: top.y - 12 };
    for (const [dx, dy, c] of [[-14, -20, 0xd7263d], [-6, -26, 0x1e5aa8], [4, -22, 0xfdd835], [12, -28, 0x8bc34a]].slice(0, 2 + Math.min(ctx.tier, 2))) {
      g.moveTo(top.x + dx, top.y + dy + 6).lineTo(top.x + dx * 0.6, top.y + 22).stroke({ width: 0.6, color: 0x37474f });
      g.ellipse(top.x + dx, top.y + dy, 4, 5).fill(c).stroke({ width: 0.6, color: 0x3a2418 });
    }
  },

  // Café del Huila. Beneficiadero: hopper, washing tank, rear chute piling red coffee husks
  // bound for husk dryer.
  huila_wetmill(g, x, y, ctx) {
    DRAW.wetmill.call(this, g, x, y, ctx);
    const c0 = iso(x + 2.3, y + 0.5, 10);
    const c1 = iso(x + 2.8, y + 2.2, 2);
    g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).stroke({ width: 4, color: 0x8d6e4a });
    const pile = iso(x + 2.6, y + 2.6);
    g.ellipse(pile.x, pile.y - 3, 12, 6).fill(PRODUCTS.cascara.color).stroke(OUTLINE);
    for (let k = 0; k < 5; k++) g.circle(pile.x - 7 + k * 3.5, pile.y - 5 - (k % 2) * 2, 1.4).fill(0xc0392b);
  },

  // Husk dryer: trays of drying red cascara under sliding zinc roof typical of Huila;
  // beside it, small sacks of cascara tea.
  cascara_dryer(g, x, y, ctx) {
    const beds = ctx.tier >= 2 ? [[0.3, 0.4], [0.3, 1.2], [1.5, 0.4], [1.5, 1.2]] : [[0.4, 0.5], [0.4, 1.4], [1.6, 0.9]];
    for (const [bx, by] of beds) {
      box(g, x + bx, y + by, 1.0, 0.7, 6, PAL.wood);
      g.poly(isoPoly([[x + bx + 0.06, y + by + 0.06, 6], [x + bx + 0.94, y + by + 0.06, 6], [x + bx + 0.94, y + by + 0.64, 6], [x + bx + 0.06, y + by + 0.64, 6]])).fill(PRODUCTS.cascara.color);
    }
    // Sliding zinc roof on rails.
    const roofZ = 22 + ctx.up;
    for (const [px, py] of [[0.2, 0.3], [2.6, 0.3], [0.2, 2.1], [2.6, 2.1]]) box(g, x + px, y + py, 0.08, 0.08, roofZ, 0x6b4a2e);
    g.poly(isoPoly([[x + 0.2, y + 0.3, roofZ], [x + 1.6, y + 0.3, roofZ + 6], [x + 1.6, y + 2.1, roofZ + 6], [x + 0.2, y + 2.1, roofZ]])).fill({ color: 0x9aa3a8, alpha: 0.95 }).stroke(OUTLINE);
    this.roofTop = iso(x + 1.4, y + 1.2, roofZ + 6);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 2.3 + (i % 2) * 0.3, y + 2.4 + Math.floor(i / 2) * 0.25);
      g.ellipse(q.x, q.y - 4, 5, 4).fill(PRODUCTS.te_cascara.color).stroke(OUTLINE);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.9) + 1) / 2 : 0.3;
      const w = iso(x + 0.5 + f * 1.8, y + 2.6);
      worker(anim, w.x, w.y, 0x2e7d32);
    };
    this.animate(0);
  },

  // Betania Dam. Escabeche kettle: hearth with large pot, jar packing bench, and onions.
  escabeche_pot(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.4;
    box(g, x0, y0, 1.4, 1.1, 10, 0xb5653a);
    const c = iso(x0 + 0.7, y0 + 0.55, 10);
    g.ellipse(c.x, c.y - 6, 16, 6).fill(0x546e7a).stroke(OUTLINE);
    g.rect(c.x - 16, c.y - 14, 32, 8).fill(0x607d8b).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 14, 16, 6).fill(PRODUCTS.escabeche.color).stroke(OUTLINE);
    this.lights.push({ x: c.x, y: c.y + 4, r: 20, color: 0xff7a1a });
    ramada(this, g, x + 0.2, y + 0.2, 2.5, 1.7, 30 + ctx.up, 0xc9a96b);
    box(g, x + 1.9, y + 2.1, 0.9, 0.5, 8, PAL.wood);
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 2.0 + (i % 3) * 0.28, y + 2.25 + Math.floor(i / 3) * 0.2, 8);
      g.roundRect(q.x - 2.5, q.y - 8, 5, 8, 1).fill(PRODUCTS.escabeche.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.rect(q.x - 2.5, q.y - 9.5, 5, 2).fill(0xd7263d);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        anim.circle(c.x - 8 + i * 8, c.y - 18 - f * 16, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Reservoir kitchen: waterside palm kiosk serving fried tilapia with frying kettle.
  // and oil kettle.
  represa_kitchen(g, x, y, ctx) {
    const c = iso(x + 1.1, y + 1.0, 0);
    for (const a of [0, 1.57, 3.14, 4.71]) g.rect(c.x + Math.cos(a + 0.78) * 30 - 1.2, c.y + Math.sin(a + 0.78) * 15 - 26 - ctx.up, 2.4, 26 + ctx.up).fill(0x6b4a2e);
    const top = c.y - 26 - ctx.up;
    g.moveTo(c.x - 42, top).lineTo(c.x, top - 28).lineTo(c.x + 42, top).quadraticCurveTo(c.x, top + 18, c.x - 42, top).fill(0xc9a96b).stroke(OUTLINE);
    this.roofTop = { x: c.x, y: top - 28 };
    const tables = ctx.tier >= 2 ? [[0.6, 2.3], [1.5, 2.4], [2.4, 2.3]] : [[0.8, 2.3], [2.0, 2.4]];
    this.plates = [];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 8, 0xd7263d);
      const q = iso(x + tx, y + ty, 8);
      fishOn(g, q.x, q.y - 1, 4, PRODUCTS.almuerzo_represa.color);
      this.plates.push(q);
    }
    const pan = iso(x + 2.4, y + 0.7, 8);
    box(g, x + 2.1, y + 0.45, 0.6, 0.5, 8, 0x8d6e4a);
    g.ellipse(pan.x, pan.y, 10, 4).fill(0x3a3a3a).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y, 8, 3).fill(0xe0a800);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (this.working) for (let i = 0; i < 4; i++) anim.circle(pan.x - 5 + i * 3.5, pan.y - 1 - Math.abs(Math.sin(time * 12 + i)) * 3, 0.9).fill(0xfff59d);
      const f = this.working ? (Math.sin(time * 0.7) + 1) / 2 : 0.5;
      const w = iso(x + 0.5 + f * 2, y + 2.85);
      worker(anim, w.x, w.y, 0xffffff);
    };
    this.animate(0);
  },

  // Lechonería. Pork butchery: cottage with cutting bench, hanging cuts, and chute feeding
  // pigskins to Skin Cleaning.
  pork_butcher(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.4, 26, ctx, { wall: 0xfbf8f1 });
    door(g, hx, hy, 1.4, 1.4, 17, 0x2f7d4f);
    box(g, x + 2.35, y + 0.3, 0.1, 1.4, 22 + ctx.up, 0x6b4a2e);
    for (let k = 0; k < 3; k++) {
      const q = iso(x + 2.4, y + 0.5 + k * 0.45, 18 + ctx.up);
      g.moveTo(q.x, q.y).lineTo(q.x, q.y + 4).stroke({ width: 1, color: 0x9e9e9e });
      g.ellipse(q.x, q.y + 9, 4, 6).fill(PRODUCTS.carne_cerdo.color).stroke({ width: 0.6, color: 0x3a2418 });
    }
    box(g, x + 0.6, y + 2.1, 1.4, 0.5, 8, PAL.wood);
    const s0 = iso(x + 2.1, y + 2.3, 6);
    const s1 = iso(x + 2.9, y + 2.9, 1);
    g.moveTo(s0.x, s0.y).lineTo(s1.x, s1.y).stroke({ width: 4, color: 0x8d6e4a });
    const hide = iso(x + 2.8, y + 2.8);
    g.ellipse(hide.x, hide.y - 2, 8, 4).fill(PRODUCTS.cuero_cerdo.color).stroke(OUTLINE);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const q = iso(x + 1.2, y + 2.85);
      worker(anim, q.x, q.y, 0xffffff);
      const cut = this.working ? Math.abs(Math.sin(time * 6)) * 4 : 0;
      anim.moveTo(q.x + 3, q.y - 16 + cut).lineTo(q.x + 8, q.y - 12 + cut).stroke({ width: 1.4, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Skin cleaning: hides stretched on frame beside hot water trough and scraper worker.
  skin_cleaner(g, x, y, ctx) {
    for (const [fx, fy] of ctx.tier >= 2 ? [[0.3, 0.4], [1.3, 0.4], [2.2, 0.4]] : [[0.5, 0.4], [1.6, 0.4]]) {
      box(g, x + fx, y + fy, 0.08, 0.08, 24, 0x6b4a2e);
      box(g, x + fx + 0.7, y + fy, 0.08, 0.08, 24, 0x6b4a2e);
      const a = iso(x + fx + 0.05, y + fy + 0.05, 20);
      const b = iso(x + fx + 0.75, y + fy + 0.05, 20);
      g.poly([a.x, a.y, b.x, b.y, b.x, b.y + 14, a.x, a.y + 14]).fill(PRODUCTS.cuero_limpio.color).stroke(OUTLINE);
    }
    box(g, x + 0.6, y + 1.6, 1.4, 0.6, 7, 0x8d6e4a);
    const w = iso(x + 1.3, y + 1.9, 7);
    g.ellipse(w.x, w.y, 18, 5).fill(0xbcaaa4);
    this.roofTop = iso(x + 1.4, y + 0.6, 26);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (this.working) for (let i = 0; i < 2; i++) {
        const f = (time * 0.5 + i / 2) % 1;
        anim.circle(w.x - 6 + i * 12, w.y - 4 - f * 14, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.4 * (1 - f) });
      }
      const q = iso(x + 1.3, y + 2.75);
      worker(anim, q.x, q.y, 0x1e88e5);
      const r = this.working ? Math.sin(time * 6) * 4 : 0;
      anim.moveTo(q.x + 3, q.y - 15).lineTo(q.x + 8 + r, q.y - 19).stroke({ width: 1.4, color: 0x8d6e4a });
    };
    this.animate(0);
  },

  // Filling cauldron: wood hearth boiling rice, peas, and seasoned pork.
  relleno_pot(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0, y0, 1.6, 1.3, 9, 0xb5653a);
    const c = iso(x0 + 0.8, y0 + 0.65, 9);
    g.ellipse(c.x, c.y, 24, 9).fill(0x3a3a3a).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 1, 21, 7).fill(PRODUCTS.relleno.color);
    for (let k = 0; k < 8; k++) g.circle(c.x - 14 + (k * 9) % 28, c.y - 3 + (k * 5) % 5, 1.4).fill(0x7cb342);
    const mouth = iso(x0 + 0.5, y0 + 1.3, 3);
    g.ellipse(mouth.x, mouth.y, 6, 3.5).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 22, color: 0xff7a1a });
    ramada(this, g, x + 0.25, y + 0.25, 2.5, 2.0, 34 + ctx.up, PAL.roof);
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.2 + i * 0.12, y + 2.8, i * 2);
      g.roundRect(p.x - 10, p.y - 4, 20, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (this.working) for (let i = 0; i < 3; i++) {
        const f = (time * 0.6 + i / 3) % 1;
        anim.circle(c.x - 10 + i * 10, c.y - 5 - f * 18, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
      const w = iso(x0 + 1.9, y0 + 0.9);
      worker(anim, w.x, w.y, 0xf2c14e);
      const st = this.working ? Math.sin(time * 4) * 4 : 0;
      anim.moveTo(w.x - 3, w.y - 15).lineTo(c.x + 8 + st, c.y - 2).stroke({ width: 1.6, color: 0x8d6e4a });
    };
    this.animate(0);
  },

  // Tamal hearth: open kitchen boiling huge tamal pot wrapped in plantain leaves.
  tamal_stove(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.6, 1.2, 24, ctx, { wall: 0xf5e6c8 });
    door(g, hx, hy, 1.2, 0.8, 16, 0xd7263d);
    box(g, x + 2.0, y + 0.6, 0.8, 0.8, 7, 0xb5653a);
    const c = iso(x + 2.4, y + 1.0, 7);
    g.rect(c.x - 9, c.y - 16, 18, 16).fill(0x546e7a).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 16, 9, 3.5).fill(0x607d8b).stroke(OUTLINE);
    this.lights.push({ x: c.x, y: c.y + 2, r: 18, color: 0xff7a1a });
    box(g, x + 0.5, y + 2.0, 1.6, 0.6, 8, PAL.wood);
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.7 + (i % 3) * 0.45, y + 2.2 + Math.floor(i / 3) * 0.25, 8);
      g.roundRect(q.x - 4, q.y - 4, 8, 4, 1.5).fill(PRODUCTS.tamal.color).stroke({ width: 0.6, color: 0x3a2418 });
      g.moveTo(q.x, q.y - 4).lineTo(q.x, q.y).stroke({ width: 0.8, color: 0xc9a96b });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (this.working) for (let i = 0; i < 2; i++) {
        const f = (time * 0.5 + i / 2) % 1;
        anim.circle(c.x - 3 + i * 6, c.y - 20 - f * 16, 2 + f * 3).fill({ color: 0xffffff, alpha: 0.45 * (1 - f) });
      }
      const w = iso(x + 1.4, y + 2.9);
      worker(anim, w.x, w.y, 0xe53935);
    };
    this.animate(0);
  },

  // Wood brick oven: large oven roasting whole stuffed lechona; golden pig displayed outdoors
  // in wooden trough.
  lechona_oven(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    box(g, hx, hy, 1.9, 1.5, 22 + ctx.up, 0xb5562e);
    for (let r = 1; r < 5; r++) {
      const a = iso(hx, hy + 1.5, r * 5);
      const b = iso(hx + 1.9, hy + 1.5, r * 5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: 0x8a3b1f, alpha: 0.7 });
    }
    gableRoof(g, hx, hy, 1.9, 1.5, 22 + ctx.up, 12, PAL.roof, 0xb5562e);
    this.roofTop = iso(hx + 0.95, hy + 0.75, 34 + ctx.up);
    const m = isoPoly([[hx + 0.6, hy + 1.5, 0], [hx + 1.3, hy + 1.5, 0], [hx + 1.3, hy + 1.5, 12], [hx + 0.6, hy + 1.5, 12]]);
    g.poly(m).fill(0x2b1d14).stroke(OUTLINE);
    const mouth = iso(hx + 0.95, hy + 1.5, 5);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 26, color: 0xff7a1a });
    box(g, hx + 1.5, hy + 0.2, 0.3, 0.3, 46 + ctx.up, 0x8a3b1f);
    this.smokePoints.push(iso(hx + 1.65, hy + 0.35, 46 + ctx.up));
    const t = iso(x + 2.1, y + 2.4, 6);
    box(g, x + 1.6, y + 2.1, 1.1, 0.6, 6, PAL.wood);
    g.ellipse(t.x, t.y, 15, 6).fill(0x8d5a32).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 3, 12, 5).fill(PRODUCTS.lechona.color).stroke({ width: 0.8, color: 0x3a2418 });
    g.circle(t.x - 12, t.y - 4, 4).fill(PRODUCTS.lechona.color).stroke({ width: 0.8, color: 0x3a2418 });
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time) => {
      fire.clear();
      if (!this.working) return;
      const h = 6 + Math.sin(time * 9) * 2;
      fire.poly([mouth.x - 7, mouth.y + 4, mouth.x - 2, mouth.y - h, mouth.x + 2, mouth.y - h * 0.6, mouth.x + 7, mouth.y + 4]).fill(0xff8c1a);
    };
    this.animate(0);
  },

  // Tolimense breakfast porch: tables served with tamal, Huila tinto cup, and Achirales bizcochos.
  // from Los Achirales.
  desayuno_tolimense_table(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.2;
    house(this, g, hx, hy, 2.4, 1.3, 26, ctx, { wall: 0xfbf8f1 });
    door(g, hx, hy, 1.3, 1.2, 17, 0x2f7d4f);
    windowOnFront(this, g, hx, hy, 1.3, 2.0, 10, 0x2f7d4f);
    const tables = ctx.tier >= 2 ? [[0.7, 2.2], [1.6, 2.2], [2.5, 2.2]] : [[0.9, 2.2], [2.0, 2.2]];
    this.plates = [];
    for (const [tx, ty] of tables) {
      box(g, x + tx - 0.3, y + ty - 0.2, 0.6, 0.4, 9, 0xd7263d);
      const q = iso(x + tx, y + ty, 9);
      g.roundRect(q.x - 6, q.y - 2, 6, 3, 1).fill(PRODUCTS.tamal.color).stroke({ width: 0.5, color: 0x3a2418 });
      g.rect(q.x + 2, q.y - 5, 3, 4).fill(0xffffff).stroke({ width: 0.5, color: 0x3a2418 });
      g.roundRect(q.x - 2, q.y + 1, 5, 1.6, 0.8).fill(PRODUCTS.bizcochos.color);
      this.plates.push(q);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, q] of this.plates.entries()) worker(anim, q.x + (k % 2 ? 10 : -10), q.y + 10, [0xe5737f, 0x6cbf6c, 0xf2c14e][k % 3]);
      const f = this.working ? (Math.sin(time * 0.7) + 1) / 2 : 0.5;
      const w = iso(x + 0.6 + f * 2, y + 2.75);
      worker(anim, w.x, w.y, 0xffffff);
      if (this.working) anim.circle(w.x + 4, w.y - 24 - ((time * 2) % 1) * 6, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
    };
    this.animate(0);
  },

  // La Chamba. Clay treading yard: wet clay pit trodden barefoot beside fine tempering sand.
  clay_treader(g, x, y, ctx) {
    const c = iso(x + 1.2, y + 1.3);
    g.ellipse(c.x, c.y, 38, 18).fill(0x6d4c41).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 1, 34, 15).fill(PRODUCTS.barro_pisado.color);
    for (let k = 0; k < 6; k++) g.ellipse(c.x - 20 + k * 8, c.y - 4 + (k % 2) * 6, 2.5, 4).fill(0x5d4037);
    const sand = iso(x + 2.6, y + 2.5);
    g.ellipse(sand.x, sand.y - 3, 12, 6).fill(0xe0c890).stroke(OUTLINE);
    ramada(this, g, x + 0.2, y + 0.3, 2.3, 2.0, 30 + ctx.up, 0xc9a96b);
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const n = ctx.tier >= 2 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const step = this.working ? Math.sin(time * 6 + k * 2) * 2 : 0;
        worker(anim, c.x - 10 + k * 20, c.y + 4 + step, k ? 0xd7263d : 0xf2c14e);
      }
    };
    this.animate(0);
  },

  // Potters: seated women hand-coiling casseroles without wheel (La Chamba style) under shed.
  // shed.
  pot_modelers(g, x, y, ctx) {
    ramada(this, g, x + 0.25, y + 0.25, 2.5, 2.2, 30 + ctx.up, 0xc9a96b);
    const spots = ctx.tier >= 2 ? [[0.8, 1.0], [1.9, 1.0], [0.8, 2.0], [1.9, 2.0]] : [[0.9, 1.1], [1.9, 1.6]];
    this.spots = spots.map(([sx, sy]) => iso(x + sx, y + sy));
    for (const p of this.spots) {
      g.ellipse(p.x + 10, p.y - 4, 8, 5).fill(PRODUCTS.pieza_cruda.color).stroke(OUTLINE);
      g.ellipse(p.x + 10, p.y - 8, 7, 2).fill(0x8d6e63);
    }
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 2.5 + (i % 2) * 0.25, y + 2.6 - Math.floor(i / 2) * 0.3);
      g.ellipse(q.x, q.y - 4, 5, 4).fill(PRODUCTS.pieza_cruda.color).stroke({ width: 0.6, color: 0x3a2418 });
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      for (const [k, p] of this.spots.entries()) {
        anim.roundRect(p.x - 4, p.y - 12, 8, 9, 2).fill([0xe5737f, 0x6cbf6c, 0xf2c14e, 0x4fb3bf][k % 4]);
        anim.circle(p.x, p.y - 15, 2.8).fill(0x6d4c32);
        const r = this.working ? Math.sin(time * 4 + k) * 2 : 0;
        anim.moveTo(p.x + 3, p.y - 9).lineTo(p.x + 8 + r, p.y - 7).stroke({ width: 1.4, color: 0x6d4c32 });
      }
    };
    this.animate(0);
  },

  // Burnishers: leather-hard pots rubbed by women with smooth river stones until gleaming;
  // highlights shimmer.
  pot_burnishers(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.2, 22, ctx, { wall: 0xf5e6c8 });
    door(g, hx, hy, 1.2, 0.9, 15, 0x2f7d4f);
    box(g, x + 0.4, y + 1.9, 2.2, 0.6, 8, PAL.wood);
    this.pots = [];
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.6 + (i % 4) * 0.5, y + 2.1 + Math.floor(i / 4) * 0.25, 8);
      g.ellipse(q.x, q.y - 4, 5, 4).fill(PRODUCTS.pieza_brunida.color).stroke({ width: 0.6, color: 0x3a2418 });
      this.pots.push(q);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const w = iso(x + 1.5, y + 2.9);
      worker(anim, w.x, w.y, 0xc77dff);
      if (!this.working) return;
      const q = this.pots[Math.floor(time * 1.5) % this.pots.length];
      anim.circle(q.x - 2, q.y - 6, 1.6 + Math.abs(Math.sin(time * 6))).fill({ color: 0xffffff, alpha: 0.9 });
    };
    this.animate(0);
  },

  // Smoking kiln: open kiln firing clay with wood then smothering in dung so pots emerge
  // jet black; thick dark smoke.
  black_kiln(g, x, y, ctx) {
    const k = iso(x + 1.3, y + 1.2);
    shadow(g, k.x + 4, k.y + 2, 32, 12);
    g.moveTo(k.x - 30, k.y).lineTo(k.x - 26, k.y - 26).lineTo(k.x + 26, k.y - 26).lineTo(k.x + 30, k.y).quadraticCurveTo(k.x, k.y + 10, k.x - 30, k.y).closePath().fill(0x8d6e63).stroke(OUTLINE);
    g.ellipse(k.x, k.y - 26, 26, 9).fill(0x3e2723).stroke(OUTLINE);
    for (let i = 0; i < 4; i++) g.ellipse(k.x - 14 + i * 9, k.y - 28, 5, 3).fill(0x2b2b2b);
    g.moveTo(k.x - 8, k.y + 4).lineTo(k.x - 8, k.y - 8).lineTo(k.x + 8, k.y - 8).lineTo(k.x + 8, k.y + 4).closePath().fill(0x2b1d14);
    this.lights.push({ x: k.x, y: k.y - 2, r: 26, color: 0xff7a1a });
    this.roofTop = iso(x + 1.3, y + 1.2, 30);
    for (let i = 0; i < 2 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 2.4 + (i % 2) * 0.3, y + 2.0 + Math.floor(i / 2) * 0.3);
      g.ellipse(q.x, q.y - 4, 5.5, 4).fill(PRODUCTS.loza_negra.color).stroke({ width: 0.6, color: 0x000000 });
      g.ellipse(q.x - 2, q.y - 5, 1.2, 2).fill(0x777777);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      if (!this.working) return;
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.4 + i / 4) % 1;
        anim.circle(k.x - 10 + i * 7 + Math.sin(time + i) * 3, k.y - 32 - f * 34, 4 + f * 6).fill({ color: 0x424242, alpha: 0.55 * (1 - f) });
      }
      const h = 6 + Math.sin(time * 9) * 2;
      anim.poly([k.x - 6, k.y + 3, k.x - 2, k.y - h, k.x + 2, k.y - h * 0.6, k.x + 6, k.y + 3]).fill(0xff8c1a);
    };
    this.animate(0);
  },

  // La Chamba shop: cottage hung with black clay casseroles alongside smoked tilapia and
  // pickled fish jars from Betania.
  tienda_chamba(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.4, 28, ctx, { wall: 0xfbf8f1 });
    door(g, hx, hy, 1.4, 1.2, 18, 0xd7263d);
    windowOnFront(this, g, hx, hy, 1.4, 2.0, 10, 0xd7263d);
    for (let i = 0; i < 4 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.4 + (i % 5) * 0.48, y + 2.2 + Math.floor(i / 5) * 0.35);
      g.ellipse(q.x, q.y - 4, 6, 4.5).fill(PRODUCTS.loza_negra.color).stroke({ width: 0.6, color: 0x000000 });
      g.ellipse(q.x, q.y - 8, 5, 1.6).fill(0x3a3a3a);
    }
    const s = iso(x + 2.6, y + 1.3, 6);
    box(g, x + 2.45, y + 1.0, 0.35, 0.6, 6, PAL.wood);
    g.rect(s.x - 3, s.y - 8, 6, 8).fill(PRODUCTS.escabeche.color).stroke({ width: 0.5, color: 0x3a2418 });
    fishOn(g, s.x + 2, s.y - 12, 4, PRODUCTS.tilapia_ahumada.color);
  },

  // Neiva. Riverside restaurant: mansion overlooking Magdalena boardwalk with lantern terrace.
  restaurante_rio(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.5, 30, ctx, { wall: 0xf6d860 });
    door(g, hx, hy, 1.5, 1.6, 18, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.4, 0.75, 14, 0xd7263d);
    const tables = ctx.tier >= 2 ? [[0.6, 2.3], [1.5, 2.4], [2.4, 2.3]] : [[0.8, 2.3], [2.0, 2.4]];
    for (const [tx, ty] of tables) {
      const p = iso(x + tx, y + ty);
      g.rect(p.x - 1, p.y - 20, 2, 20).fill(0x555555);
      g.ellipse(p.x, p.y - 8, 7, 3.5).fill(0xffffff).stroke(OUTLINE);
      g.poly([p.x, p.y - 28, p.x - 13, p.y - 19, p.x + 13, p.y - 19]).fill(0x2f7d4f).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.ellipse(p.x - 2, p.y - 9, 3, 1.4).fill(PRODUCTS.cena_opita.color);
    }
  },

  // San Pedro hotel: two-story balconied hotel decked in red-and-yellow festival bunting;
  // couple dancing sanjuanero at doorway.
  hotel_sanpedro(g, x, y, ctx) {
    const hx = x + 0.2;
    const hy = y + 0.2;
    house(this, g, hx, hy, 2.5, 1.6, 34, { ...ctx, up: ctx.up || UPPER_FLOOR }, { wall: 0xfbf8f1 });
    door(g, hx, hy, 1.6, 1.25, 18, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.5, 0.8, 14, 0x2f7d4f);
    const a = iso(hx, hy + 1.65, 30);
    const b = iso(hx + 2.5, hy + 1.65, 30);
    g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 8, b.x, b.y).stroke({ width: 0.8, color: 0x5d4037 });
    for (let k = 1; k < 9; k++) {
      const f = k / 9;
      const px = a.x + (b.x - a.x) * f;
      const py = a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 8;
      g.poly([px - 2.5, py, px + 2.5, py, px, py + 5]).fill(k % 2 ? 0xd7263d : 0xfdd835);
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time, clock) => {
      anim.clear();
      const c = iso(x + 1.8, y + 2.6);
      const sp = clock * 2;
      const r = 5;
      const dx = Math.cos(sp) * r;
      const dy = Math.sin(sp) * r * 0.5;
      anim.poly([c.x + dx - 5, c.y + dy, c.x + dx, c.y + dy - 14, c.x + dx + 5, c.y + dy]).fill(0xd7263d);
      anim.circle(c.x + dx, c.y + dy - 16, 2.5).fill(0x6d4c32);
      worker(anim, c.x - dx, c.y - dy, 0xffffff);
    };
    this.animate(0, 0);
  },

  // Neiva market plaza: high-ceiling hall with fruit stalls, roast pork, and Betania tilapia.
  plaza_neiva(g, x, y, ctx) {
    const H = 30 + ctx.up;
    for (const [px, py] of [[0.2, 0.3], [2.7, 0.3], [0.2, 2.4], [2.7, 2.4], [1.45, 0.3], [1.45, 2.4]]) box(g, x + px, y + py, 0.12, 0.12, H, 0x9e9e9e);
    gableRoof(g, x + 0.15, y + 0.25, 2.7, 2.25, H, 14, 0x9aa3a8, 0xd2cbbd);
    this.roofTop = iso(x + 1.5, y + 1.4, H + 14);
    const stalls = [[0.6, 1.0, 0xffb74d], [1.6, 1.0, 0xe53935], [0.6, 1.9, 0x9ccc65], [1.6, 1.9, PRODUCTS.almuerzo_opita.color]];
    for (const [sx, sy, col] of stalls.slice(0, 2 + Math.min(ctx.tier, 2))) {
      box(g, x + sx, y + sy, 0.8, 0.45, 8, PAL.wood);
      for (let k = 0; k < 4; k++) {
        const q = iso(x + sx + 0.15 + k * 0.17, y + sy + 0.22, 8);
        g.circle(q.x, q.y - 2, 2.2).fill(col);
      }
    }
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time) => {
      anim.clear();
      const f = this.working ? (Math.sin(time * 0.6) + 1) / 2 : 0.5;
      const w = iso(x + 0.5 + f * 2, y + 1.55);
      worker(anim, w.x, w.y, 0x1e88e5);
    };
    this.animate(0);
  },

  // Picnic lunch shop: wrapping leaf-tied fiambres at counter beside stacked outing baskets.
  // Tatacoa.
  fiambrera_tatacoa(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.4, 28, ctx, { wall: 0xf28c9a });
    door(g, hx, hy, 1.4, 1.5, 18, 0x2f7d4f);
    box(g, x + 0.5, y + 2.1, 1.8, 0.5, 8, PAL.wood);
    for (let i = 0; i < 3 + Math.min(ctx.tier, 3); i++) {
      const q = iso(x + 0.7 + (i % 4) * 0.4, y + 2.3 + Math.floor(i / 4) * 0.2, 8);
      g.ellipse(q.x, q.y - 2, 5, 2.5).fill(0x4e8a34).stroke({ width: 0.5, color: 0x3a2418 });
    }
    basketShape(g, x + 2.6, y + 2.6, 0, 0.9);
  },

  // Tatacoa trailhead: safari jeep, telescope, and tent on red earth with cactus; at night
  // telescope points up at stars.
  salida_tatacoa(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.2, y + 0.2], [x + 2.8, y + 0.2], [x + 2.8, y + 2.8], [x + 0.2, y + 2.8]])).fill({ color: 0xc0582b, alpha: 0.75 });
    for (const [cx, cy] of [[0.5, 0.6], [2.5, 2.4]]) {
      const p = iso(x + cx, y + cy);
      g.rect(p.x - 2.5, p.y - 22, 5, 22).fill(0x558b2f).stroke(OUTLINE);
      g.rect(p.x - 8, p.y - 14, 5, 3).fill(0x558b2f);
      g.rect(p.x - 8, p.y - 19, 3, 6).fill(0x558b2f);
      g.rect(p.x + 3, p.y - 11, 5, 3).fill(0x558b2f);
      g.rect(p.x + 5, p.y - 16, 3, 6).fill(0x558b2f);
    }
    const tent = iso(x + 0.9, y + 1.9);
    g.poly([tent.x - 18, tent.y, tent.x, tent.y - 22, tent.x + 18, tent.y]).fill(0xf2c14e).stroke(OUTLINE);
    g.poly([tent.x - 4, tent.y, tent.x, tent.y - 12, tent.x + 4, tent.y]).fill(0x5d4037);
    box(g, x + 1.5, y + 0.7, 1.0, 0.55, 10, 0x2e7d32);
    box(g, x + 1.55, y + 0.75, 0.55, 0.45, 8, 0x2e7d32, { z: 10 });
    for (const [wx, wy] of [[1.6, 1.25], [2.35, 1.25]]) {
      const w = iso(x + wx, y + wy);
      g.circle(w.x, w.y - 2, 3.5).fill(0x263238);
    }
    this.roofTop = iso(x + 1.8, y + 0.95, 18);
    const t = iso(x + 2.3, y + 2.0);
    for (const dx of [-4, 0, 4]) g.moveTo(t.x, t.y - 12).lineTo(t.x + dx, t.y).stroke({ width: 1, color: 0x424242 });
    const anim = new Graphics();
    this.anim.addChild(anim);
    this.animate = (time, clock) => {
      anim.clear();
      const a = -0.8 + Math.sin(clock * 0.3) * 0.2;
      anim.moveTo(t.x, t.y - 12).lineTo(t.x + Math.cos(a) * 12, t.y - 12 + Math.sin(a) * 12).stroke({ width: 3, color: 0xeceff1 });
    };
    this.animate(0, 0);
  },

  // --- La plaza de las fiestas (v5.19) ---
  // Lantern workshop (Velitas): open shed with colored paper lanterns hanging from the beam and a worktable with
  // paper and wire frames; the lanterns glow at night.
  velitas_faroles(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const H = 24 + ctx.up;
    box(g, x0 + 0.3, y0 + 0.7, 1.6, 0.5, 9, PAL.wood);
    const colors = [0xe53935, 0xffb300, 0x43a047, 0x1e88e5, 0x8e24aa, 0xff7043];
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.5 + k * 0.38, y0 + 0.95, 9);
      g.rect(p.x - 4, p.y - 2, 8, 2).fill(colors[(k + 2) % colors.length]);
    }
    for (const [px, py] of [[0, 0], [2.1, 0], [0, 1.4], [2.1, 1.4]]) box(g, x0 + px, y0 + py, 0.12, 0.12, H, PAL.wood);
    gableRoof(g, x0, y0, 2.22, 1.52, H, 12, PAL.roof, PAL.wood);
    // Lanterns hanging along the front, more at each milestone.
    const n = 3 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const p = iso(x0 + 0.2 + (k * 1.8) / (n - 1), y0 + 1.6, H - 4);
      g.moveTo(p.x, p.y - 4).lineTo(p.x, p.y).stroke({ width: 0.8, color: 0x3a2418 });
      g.roundRect(p.x - 3.5, p.y, 7, 9, 3).fill(colors[k % colors.length]).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 2, p.y - 1, 4, 1.5).fill(0x3a2418);
      this.lights.push({ x: p.x, y: p.y + 4, r: 14, color: colors[k % colors.length] });
    }
    this.roofTop = iso(x0 + 1.1, y0 + 0.75, H + 12);
  },

  // Street of little candles (Velitas): two house fronts facing a sidewalk lined with candles in paper lanterns,
  // and a string of lights across; every candle glows at night and flickers.
  velitas_calle(g, x, y, ctx) {
    const H = house(this, g, x + 0.25, y + 0.25, 1.2, 1.3, 24, ctx, { wall: 0xfff3d6 });
    door(g, x + 0.25, y + 0.25, 1.3, 0.6, 15, ctx.trim);
    const H2 = house(this, g, x + 1.6, y + 0.25, 1.15, 1.3, 22, ctx, { wall: 0xb8e0f5 });
    door(g, x + 1.6, y + 0.25, 1.3, 0.55, 14, ctx.trim);
    // Sidewalk.
    g.poly(isoPoly([[x + 0.2, y + 1.65], [x + 2.85, y + 1.65], [x + 2.85, y + 2.15], [x + 0.2, y + 2.15]])).fill(0xd9d2c3).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
    // Candles in little paper lanterns along the curb.
    const flames = [];
    const n = 6 + Math.min(ctx.tier, 4) * 2;
    for (let k = 0; k < n; k++) {
      const p = iso(x + 0.3 + (k * 2.45) / (n - 1), y + 2.05);
      g.roundRect(p.x - 2.2, p.y - 6, 4.4, 6, 1).fill(k % 3 === 0 ? 0xffcc80 : k % 3 === 1 ? 0xef9a9a : 0xfff59d).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      flames.push(p);
      this.lights.push({ x: p.x, y: p.y - 5, r: 10, color: 0xffb74d });
    }
    // String of lights between the two roofs.
    const a = iso(x + 0.3, y + 1.55, H - 2);
    const b = iso(x + 2.7, y + 1.55, H2 - 2);
    g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y).stroke({ width: 1, color: 0x3a2418, alpha: 0.7 });
    const fire = new Graphics();
    this.anim.addChild(fire);
    this.animate = (time, clock) => {
      fire.clear();
      for (const [k, p] of flames.entries()) {
        const f = 1 + Math.sin(clock * 9 + k * 1.7) * 0.2;
        fire.ellipse(p.x, p.y - 7.5, 1.3 * f, 2.4 * f).fill(0xffb300);
        fire.ellipse(p.x, p.y - 7, 0.6, 1.2).fill(0xfff8e1);
      }
    };
    this.animate(0, 0);
  },

  // Natilla pot (Navidad): open kitchen with a big copper paila over a wood fire and someone stirring it with a
  // long wooden paddle; it steams while working.
  navidad_natilla(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const H = 24 + ctx.up;
    for (const [px, py] of [[0, 0], [2.3, 0], [0, 1.5], [2.3, 1.5]]) box(g, x0 + px, y0 + py, 0.12, 0.12, H, PAL.wood);
    gableRoof(g, x0, y0, 2.42, 1.62, H, 12, PAL.roof, PAL.wood);
    // Brick stove and the paila.
    box(g, x0 + 0.5, y0 + 0.4, 1.2, 0.9, 8, 0xb5653a);
    const c = iso(x0 + 1.1, y0 + 0.85, 8);
    g.ellipse(c.x, c.y, 17, 8.5).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 1, 14, 6.5).fill(PRODUCTS.natilla.color);
    const fireAt = iso(x0 + 1.1, y0 + 1.32, 2);
    g.ellipse(fireAt.x, fireAt.y, 5, 2.5).fill(0x3a2418);
    this.lights.push({ x: fireAt.x, y: fireAt.y - 2, r: 16, color: 0xff7043 });
    // Bowls of natilla cooling on a side table.
    box(g, x0 + 1.9, y0 + 0.9, 0.5, 0.5, 8, PAL.wood);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 2.0 + (k % 2) * 0.22, y0 + 1.0 + Math.floor(k / 2) * 0.22, 8);
      g.ellipse(p.x, p.y, 3.5, 1.8).fill(0xffffff).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 0.5, 2.6, 1.2).fill(PRODUCTS.natilla.color);
    }
    this.smokePoints.push({ x: c.x, y: c.y - 6 });
    const stir = new Graphics();
    this.anim.addChild(stir);
    const cook = iso(x0 + 1.1, y0 + 1.5);
    this.animate = (time) => {
      stir.clear();
      worker(stir, cook.x + 10, cook.y + 4, PAL.balconyRed);
      const a = Math.sin(time * 3) * 6;
      stir.moveTo(cook.x + 7, cook.y - 10).lineTo(c.x + a, c.y - 2).stroke({ width: 1.8, color: PAL.woodDark });
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.2, y0 + 0.8, H + 12);
  },

  // Buñuelo fryer (Navidad): a street stall with a pot of hot oil, golden buñuelos in a basket and a striped
  // awning; the oil bubbles while working.
  navidad_bunuelos(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.4;
    fleaStall(this, g, x0, y0, ctx, 0xc62828, [PRODUCTS.bunuelo.color, PRODUCTS.bunuelo.color, 0xffffff, PRODUCTS.bunuelo.color, 0xffe082], 2.2);
    // Fryer on a burner in front of the stall.
    box(g, x0 + 0.6, y0 + 1.55, 0.6, 0.5, 7, 0x455a64);
    const pot = iso(x0 + 0.9, y0 + 1.8, 7);
    g.ellipse(pot.x, pot.y - 3, 9, 4.5).fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 4, 7, 3.2).fill(0xd4a017);
    // Basket of buñuelos.
    const bk = iso(x0 + 1.7, y0 + 1.85);
    g.ellipse(bk.x, bk.y - 3, 9, 4.5).fill(0xc8a165).stroke(OUTLINE);
    for (let k = 0; k < 5 + Math.min(ctx.tier, 3); k++) g.circle(bk.x - 6 + (k % 4) * 4, bk.y - 5 - Math.floor(k / 4) * 3, 2.4).fill(PRODUCTS.bunuelo.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    const oil = new Graphics();
    this.anim.addChild(oil);
    this.animate = (time) => {
      oil.clear();
      for (let k = 0; k < 4; k++) {
        const f = (time * 1.3 + k / 4) % 1;
        oil.circle(pot.x - 5 + k * 3.3, pot.y - 4 - f * 2, 0.6 + f * 1.4).fill({ color: 0xfff3c4, alpha: 0.8 * (1 - f) });
      }
      for (let k = 0; k < 2; k++) oil.circle(pot.x - 2 + k * 4, pot.y - 5, 2.2).fill(PRODUCTS.bunuelo.color);
    };
    this.animate(0);
  },

  // Novena table (Navidad): a long table set outdoors with natilla and buñuelos, a Christmas tree beside it, a
  // string of lights over it and the neighbors' chairs; the tree and the lights glow at night.
  navidad_novena(g, x, y, ctx) {
    const H = house(this, g, x + 0.25, y + 0.25, 2.4, 1.0, 24, ctx, { wall: 0xfff3d6 });
    door(g, x + 0.25, y + 0.25, 1.0, 1.2, 15, ctx.trim);
    windowOnFront(this, g, x + 0.25, y + 0.25, 1.0, 0.5, 8, 0xfff59d);
    windowOnFront(this, g, x + 0.25, y + 0.25, 1.0, 1.9, 8, 0xfff59d);
    // Long table with plates.
    box(g, x + 0.5, y + 1.6, 1.8, 0.5, 8, 0xffffff);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const p = iso(x + 0.65 + k * 0.27, y + 1.85, 8);
      g.ellipse(p.x, p.y, 3.4, 1.7).fill(0xffffff).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x - 1, p.y - 0.5, 1.6, 0.9).fill(PRODUCTS.natilla.color);
      g.circle(p.x + 1.3, p.y - 1, 1.2).fill(PRODUCTS.bunuelo.color);
    }
    // Little Christmas tree at the corner.
    const tr = iso(x + 2.6, y + 1.9);
    g.rect(tr.x - 1.5, tr.y - 5, 3, 5).fill(PAL.woodDark);
    for (const [w, top] of [[10, 20], [8, 15], [6, 10]]) g.poly([tr.x - w, tr.y - top + 12, tr.x + w, tr.y - top + 12, tr.x, tr.y - top - 4]).fill(0x2e7d32).stroke({ width: 0.8, color: 0x1b5e20 });
    g.star(tr.x, tr.y - 25, 5, 3, 1.4).fill(0xffd54f);
    const balls = [0xe53935, 0xffd54f, 0x1e88e5, 0xffffff];
    for (let k = 0; k < 6; k++) {
      const bx = tr.x - 6 + (k * 2.4) % 12;
      const by = tr.y - 6 - k * 2.6;
      g.circle(bx, by, 1.3).fill(balls[k % balls.length]);
      this.lights.push({ x: bx, y: by, r: 6, color: balls[k % balls.length] });
    }
    // String of colored lights along the eave.
    for (let k = 0; k < 8; k++) {
      const p = iso(x + 0.35 + k * 0.3, y + 1.27, H - 1);
      g.circle(p.x, p.y + (k % 2), 1.4).fill(balls[k % balls.length]);
      this.lights.push({ x: p.x, y: p.y, r: 7, color: balls[k % balls.length] });
    }
  },

  // --- Carnaval de Negros y Blancos (v5.21) ---
  // Día de Negros: an awning stall with pots of black cosmetic paint and painted revelers in line; the paint
  // brushes move while working.
  nyb_negros(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.35;
    fleaStall(this, g, x0, y0, ctx, 0x212121, [0x212121, 0x37474f, 0x212121, 0x455a64, 0x212121], 2.2);
    // Pots of paint in front.
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 0.3 + k * 0.4, y0 + 1.75);
      g.roundRect(p.x - 3.5, p.y - 6, 7, 6, 1.5).fill(0x8d6e63).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 6, 3.5, 1.4).fill(0x111111);
    }
    // Revelers with black-painted faces.
    const crowd = new Graphics();
    this.anim.addChild(crowd);
    const spots = [0.6, 1.3, 2.0].map((k) => iso(x0 + k, y0 + 2.35));
    this.animate = (time) => {
      crowd.clear();
      spots.forEach((p, k) => {
        worker(crowd, p.x, p.y, [0xe53935, 0x1e88e5, 0xfdd835][k]);
        crowd.circle(p.x, p.y - 20.5, 2.8).fill(0x111111);
        crowd.rect(p.x + 3, p.y - 15 - Math.abs(Math.sin(time * 4 + k)) * 4, 1.2, 6).fill(0x5d4037);
      });
    };
    this.animate(0);
  },

  // Día de Blancos: an open shed with sacks of talcum and a cloud of talc rising over the comparsa.
  nyb_blancos(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const H = 24 + ctx.up;
    for (const [px, py] of [[0, 0], [2.1, 0], [0, 1.4], [2.1, 1.4]]) box(g, x0 + px, y0 + py, 0.12, 0.12, H, PAL.wood);
    gableRoof(g, x0, y0, 2.22, 1.52, H, 12, 0xeceff1, PAL.wood);
    for (const [bx, by, z] of [[0.4, 0.6, 0], [0.9, 0.6, 0], [1.4, 0.6, 0], [0.65, 0.6, 9], [1.15, 0.6, 9]].slice(0, 3 + Math.min(ctx.tier, 2))) {
      const p = iso(x0 + bx, y0 + by, z);
      g.ellipse(p.x, p.y - 4, 7, 5.5).fill(0xfafafa).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 8, 3.5, 1.8).fill(0xe0e0e0);
    }
    const cloud = new Graphics();
    this.anim.addChild(cloud);
    const c = iso(x0 + 1.1, y0 + 2.0);
    this.animate = (time) => {
      cloud.clear();
      worker(cloud, c.x - 8, c.y + 2, 0x8e24aa);
      worker(cloud, c.x + 8, c.y + 4, 0x43a047);
      for (let k = 0; k < 7; k++) {
        const f = (time * 0.5 + k / 7) % 1;
        cloud.circle(c.x + Math.sin(k * 2.3 + time) * 12, c.y - 18 - f * 26, 4 + f * 7).fill({ color: 0xffffff, alpha: 0.75 * (1 - f) });
      }
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.1, y0 + 0.75, H + 12);
  },

  // Gran Desfile: a carnival float on wheels with a big papier-mâché figure (a laughing face, half black and half
  // white) and colored streamers; the figure nods while working.
  nyb_desfile(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.5;
    box(g, x0, y0, 2.4, 1.6, 8, 0x8e24aa);
    for (const [wx, wy] of [[0.3, 1.6], [2.1, 1.6]]) {
      const p = iso(x0 + wx, y0 + wy, 2);
      g.circle(p.x, p.y, 4.5).fill(0x3e2723).stroke(OUTLINE);
      g.circle(p.x, p.y, 1.6).fill(0x9e9e9e);
    }
    // Skirt of streamers around the platform.
    const colors = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xff7043];
    for (let k = 0; k < 10; k++) {
      const a = iso(x0 + 0.1 + k * 0.23, y0 + 1.6, 7);
      g.rect(a.x - 1, a.y, 2, 6).fill(colors[k % colors.length]);
    }
    const figure = new Graphics();
    this.anim.addChild(figure);
    const c = iso(x0 + 1.2, y0 + 0.8, 8);
    const size = 13 + Math.min(ctx.tier, 3) * 2;
    this.animate = (time) => {
      const nod = Math.sin(time * 2) * 2;
      figure.clear();
      const cy = c.y - size - 6 + nod;
      figure.circle(c.x, cy, size).fill(0xfafafa);
      // The left half painted black (Día de Negros), the right white with talc (Día de Blancos).
      figure.moveTo(c.x, cy - size).arc(c.x, cy, size, -Math.PI / 2, Math.PI / 2, true).closePath().fill(0x212121);
      figure.circle(c.x, cy, size).stroke(OUTLINE);
      figure.circle(c.x - size * 0.4, c.y - size * 1.2 - 6 + nod, 2.2).fill(0xfafafa);
      figure.circle(c.x + size * 0.4, c.y - size * 1.2 - 6 + nod, 2.2).fill(0x212121);
      figure.ellipse(c.x, c.y - size * 0.7 - 6 + nod, size * 0.45, size * 0.2).fill(0xe53935);
      // Hat with a pompom.
      figure.poly([c.x - size * 0.7, c.y - size * 1.85 - 6 + nod, c.x + size * 0.7, c.y - size * 1.85 - 6 + nod, c.x, c.y - size * 2.7 - 6 + nod]).fill(0xfdd835).stroke(OUTLINE);
      figure.circle(c.x, c.y - size * 2.7 - 6 + nod, 2.6).fill(0xe53935);
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.2, y0 + 0.8, 8 + 2 * size + 20);
  },

  // --- Carnaval de Barranquilla (v5.21) ---
  // Marimondas: a house with a blue porch where marimonda masks (big ears, long trunk nose) hang to dry, and a
  // marimonda dancing in front.
  baq_marimondas(g, x, y, ctx) {
    const H = house(this, g, x + 0.3, y + 0.25, 2.3, 1.1, 24, ctx, { wall: 0x90caf9 });
    door(g, x + 0.3, y + 0.25, 1.1, 1.15, 15, ctx.trim);
    const masks = 2 + Math.min(ctx.tier, 3);
    for (let k = 0; k < masks; k++) {
      const p = iso(x + 0.5 + k * 0.42, y + 1.37, H - 8);
      g.ellipse(p.x - 5, p.y + 1, 2.4, 3.4).fill(0xe53935);
      g.ellipse(p.x + 5, p.y + 1, 2.4, 3.4).fill(0xe53935);
      g.ellipse(p.x, p.y + 1, 4.4, 5).fill(0x1e88e5).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.circle(p.x - 1.6, p.y, 1).fill(0xffffff);
      g.circle(p.x + 1.6, p.y, 1).fill(0xffffff);
      g.moveTo(p.x, p.y + 2).quadraticCurveTo(p.x + 1, p.y + 9, p.x + 4, p.y + 9).stroke({ width: 1.6, color: 0x43a047 });
    }
    const dancer = new Graphics();
    this.anim.addChild(dancer);
    const c = iso(x + 1.5, y + 2.2);
    this.animate = (time) => {
      const hop = Math.abs(Math.sin(time * 5)) * 3;
      dancer.clear();
      worker(dancer, c.x, c.y - hop, 0xe53935);
      dancer.ellipse(c.x, c.y - 20.5 - hop, 4, 4.4).fill(0x1e88e5);
      dancer.ellipse(c.x - 4.5, c.y - 21 - hop, 2, 3).fill(0xe53935);
      dancer.ellipse(c.x + 4.5, c.y - 21 - hop, 2, 3).fill(0xe53935);
      dancer.moveTo(c.x, c.y - 19 - hop).quadraticCurveTo(c.x + 1, c.y - 12 - hop, c.x + 4, c.y - 12 - hop).stroke({ width: 1.4, color: 0x43a047 });
    };
    this.animate(0);
  },

  // Congos: an awning stall with the congos' tall flowered turbans and a congo dancer with his turban and mirrors.
  baq_congos(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.35;
    fleaStall(this, g, x0, y0, ctx, 0xe53935, [0xe53935, 0xfdd835, 0x43a047, 0x1e88e5, 0xff7043], 2.2);
    const turban = (gr, px, py) => {
      gr.poly([px - 4, py, px + 4, py, px + 3, py - 12, px - 3, py - 12]).fill(0xfafafa).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      for (const [dx, dy, c] of [[-2, -4, 0xe53935], [2, -7, 0xfdd835], [-1, -10, 0x1e88e5]]) gr.circle(px + dx, py + dy, 1.6).fill(c);
      gr.circle(px, py - 13, 2).fill(0x43a047);
    };
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 0.4 + k * 0.45, y0 + 1.75);
      turban(g, p.x, p.y - 2);
    }
    const dancer = new Graphics();
    this.anim.addChild(dancer);
    const c = iso(x0 + 1.9, y0 + 2.2);
    this.animate = (time) => {
      const sway = Math.sin(time * 4) * 2;
      dancer.clear();
      worker(dancer, c.x + sway, c.y, 0xfdd835);
      turban(dancer, c.x + sway, c.y - 22);
    };
    this.animate(0);
  },

  // Batalla de Flores: a float covered in flowers with a giant marimonda head and dancers on it; the head sways while
  // working.
  baq_batalla(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.5;
    box(g, x0, y0, 2.4, 1.6, 8, 0x43a047);
    for (const [wx, wy] of [[0.3, 1.6], [2.1, 1.6]]) {
      const p = iso(x0 + wx, y0 + wy, 2);
      g.circle(p.x, p.y, 4.5).fill(0x3e2723).stroke(OUTLINE);
      g.circle(p.x, p.y, 1.6).fill(0x9e9e9e);
    }
    const colors = [0xe53935, 0xfdd835, 0xff7043, 0xf06292, 0xffffff];
    for (let k = 0; k < 14 + ctx.tier * 3; k++) {
      const p = iso(x0 + 0.1 + ((k * 0.37) % 2.3), y0 + 1.55, 2 + ((k * 3) % 6));
      g.circle(p.x, p.y, 1.8).fill(colors[k % colors.length]);
    }
    const head = new Graphics();
    this.anim.addChild(head);
    const c = iso(x0 + 1.2, y0 + 0.8, 8);
    const size = 12 + Math.min(ctx.tier, 3) * 2;
    this.animate = (time) => {
      const sway = Math.sin(time * 2) * 3;
      const cy = c.y - size - 6;
      head.clear();
      head.ellipse(c.x - size + sway, cy, size * 0.45, size * 0.7).fill(0xe53935).stroke(OUTLINE);
      head.ellipse(c.x + size + sway, cy, size * 0.45, size * 0.7).fill(0xe53935).stroke(OUTLINE);
      head.circle(c.x + sway, cy, size).fill(0x1e88e5).stroke(OUTLINE);
      head.circle(c.x - size * 0.4 + sway, cy - size * 0.2, size * 0.2).fill(0xffffff);
      head.circle(c.x + size * 0.4 + sway, cy - size * 0.2, size * 0.2).fill(0xffffff);
      head.moveTo(c.x + sway, cy + size * 0.1).quadraticCurveTo(c.x + sway + 3, cy + size * 1.3, c.x + sway + size * 0.8, cy + size * 1.2).stroke({ width: 3, color: 0x43a047 });
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.2, y0 + 0.8, 8 + 2 * size + 14);
  },

  // --- Festival de la Leyenda Vallenata (v5.21) ---
  // Casa del acordeón: a house with a mango tree in front and an accordionist playing on a stool in its shade; the
  // bellows open and close while working.
  vall_acordeon(g, x, y, ctx) {
    house(this, g, x + 0.25, y + 0.25, 2.0, 1.1, 24, ctx, { wall: 0xfff3e0 });
    door(g, x + 0.25, y + 0.25, 1.1, 1.0, 15, ctx.trim);
    windowOnFront(this, g, x + 0.25, y + 0.25, 1.1, 0.4, 8, 0xffffff);
    // Mango tree.
    const tr = iso(x + 2.55, y + 1.0);
    g.rect(tr.x - 2, tr.y - 18, 4, 18).fill(0x6d4c41);
    for (const [dx, dy, r] of [[-9, -24, 10], [8, -25, 10], [0, -33, 12], [-3, -20, 8]]) g.circle(tr.x + dx, tr.y + dy, r).fill(0x2e7d32);
    for (const [dx, dy] of [[-6, -22], [5, -28], [9, -19]].slice(0, 1 + Math.min(ctx.tier, 2))) g.ellipse(tr.x + dx, tr.y + dy, 2, 2.6).fill(0xffb300);
    const player = new Graphics();
    this.anim.addChild(player);
    const c = iso(x + 1.5, y + 2.2);
    this.animate = (time) => {
      const open = 3 + Math.sin(time * 5) * 2.5;
      player.clear();
      player.rect(c.x - 5, c.y - 6, 10, 6).fill(PAL.wood);
      worker(player, c.x, c.y - 4, 0xfafafa);
      player.ellipse(c.x, c.y - 26, 6, 1.6).fill(0xe8c063);
      player.rect(c.x - 6 - open, c.y - 17, 3, 8).fill(0x5d4037);
      player.rect(c.x - 3 - open, c.y - 16.5, 6 + 2 * open, 7).fill(0xc62828);
      player.rect(c.x + 3 + open, c.y - 17, 3, 8).fill(0x5d4037);
    };
    this.animate(0);
  },

  // Caja y guacharaca: an awning stall with caja drums and guacharacas for sale, and a cajero drumming.
  vall_caja(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.35;
    fleaStall(this, g, x0, y0, ctx, 0x2e7d32, [0x8d5a32, 0xc8a165, 0x8d5a32, 0xc8a165, 0x8d5a32], 2.2);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 0.4 + k * 0.45, y0 + 1.75);
      g.rect(p.x - 4, p.y - 8, 8, 8).fill(0xa1693f).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 8, 4, 1.6).fill(0xf5deb3).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
    const drummer = new Graphics();
    this.anim.addChild(drummer);
    const c = iso(x0 + 1.9, y0 + 2.2);
    this.animate = (time) => {
      const hit = Math.abs(Math.sin(time * 8)) * 3;
      drummer.clear();
      drummer.rect(c.x - 5, c.y - 9, 10, 9).fill(0xa1693f);
      drummer.ellipse(c.x, c.y - 9, 5, 2).fill(0xf5deb3);
      worker(drummer, c.x + 7, c.y + 2, 0xfdd835);
      drummer.rect(c.x + 1, c.y - 13 - hit, 6, 1.6).fill(0x6d4c41);
    };
    this.animate(0);
  },

  // Tarima Francisco el Hombre: a stage with a roof and a banner where the conjunto plays (accordion, caja and
  // guacharaca); colored lights at night.
  vall_tarima(g, x, y, ctx) {
    const x0 = x + 0.2;
    const y0 = y + 0.3;
    box(g, x0, y0, 2.6, 1.6, 7, 0x8d6e63);
    const H = 30 + ctx.up;
    for (const [px, py] of [[0, 0], [2.5, 0], [0, 1.5], [2.5, 1.5]]) box(g, x0 + px, y0 + py, 0.1, 0.1, H, 0x455a64);
    gableRoof(g, x0, y0, 2.6, 1.6, H, 10, 0xc62828, 0xfdd835, 0.1);
    const a = iso(x0 + 0.2, y0 + 1.6, H - 2);
    const b = iso(x0 + 2.4, y0 + 1.6, H - 2);
    g.poly([a.x, a.y, b.x, b.y, b.x, b.y + 7, a.x, a.y + 7]).fill(0xfdd835).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    const colors = [0xe53935, 0x43a047, 0x1e88e5, 0xfdd835];
    for (let k = 0; k < 6; k++) {
      const p = iso(x0 + 0.2 + k * 0.44, y0 + 1.62, H - 3);
      this.lights.push({ x: p.x, y: p.y, r: 9, color: colors[k % colors.length] });
    }
    const band = new Graphics();
    this.anim.addChild(band);
    const spots = [0.6, 1.3, 2.0].map((k) => iso(x0 + k, y0 + 1.0, 7));
    this.animate = (time) => {
      band.clear();
      spots.forEach((p, k) => {
        const bob = Math.abs(Math.sin(time * 4 + k)) * 1.5;
        worker(band, p.x, p.y - bob, [0xfafafa, 0xe53935, 0x1e88e5][k]);
        if (k === 0) band.rect(p.x - 5, p.y - 16 - bob, 10, 7).fill(0xc62828);
        if (k === 1) band.rect(p.x - 4, p.y - 12 - bob, 8, 7).fill(0xa1693f);
        if (k === 2) band.rect(p.x + 2, p.y - 18 - bob, 2, 12).fill(0xc8a165);
      });
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.3, y0 + 0.8, H + 10);
  },

  // --- Día de la Madre (v5.21) ---
  // Floristería: an awning stall full of buckets of flowers, with the florist tying a bouquet.
  dm_floristeria(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.35;
    const colors = [0xe91e63, 0xfdd835, 0xffffff, 0xe53935, 0x8e24aa];
    fleaStall(this, g, x0, y0, ctx, 0xe91e63, colors, 2.2);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 0.3 + k * 0.4, y0 + 1.75);
      g.poly([p.x - 4, p.y - 8, p.x + 4, p.y - 8, p.x + 3, p.y, p.x - 3, p.y]).fill(0x90a4ae).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
      g.rect(p.x - 0.5, p.y - 13, 1, 5).fill(0x558b2f);
      for (let f = 0; f < 4; f++) g.circle(p.x - 3 + f * 2, p.y - 11 - (f % 2) * 2.5, 1.9).fill(colors[(k + f) % colors.length]);
    }
    const florist = new Graphics();
    this.anim.addChild(florist);
    const c = iso(x0 + 1.9, y0 + 2.2);
    this.animate = (time) => {
      florist.clear();
      worker(florist, c.x, c.y, 0xf06292);
      const tilt = Math.sin(time * 3) * 2;
      for (let f = 0; f < 3; f++) florist.circle(c.x + 5 + f * 2 + tilt, c.y - 16 - f, 1.8).fill(colors[f]);
      florist.rect(c.x + 6 + tilt, c.y - 14, 1.2, 5).fill(0x558b2f);
    };
    this.animate(0);
  },

  // Cocina del almuerzo: a kitchen house with a big pot of sancocho over a wood fire in the yard, steaming while
  // working.
  dm_cocina(g, x, y, ctx) {
    const H = house(this, g, x + 0.25, y + 0.25, 2.0, 1.1, 24, ctx, { wall: 0xfff8e1 });
    door(g, x + 0.25, y + 0.25, 1.1, 0.5, 15, ctx.trim);
    windowOnFront(this, g, x + 0.25, y + 0.25, 1.1, 1.5, 8, 0xffffff);
    box(g, x + 1.9, y + 0.4, 0.25, 0.25, H + 16, 0xb5653a);
    const top = iso(x + 2.02, y + 0.52, H + 16);
    this.smokePoints.push({ x: top.x, y: top.y - 4 });
    const pot = iso(x + 1.4, y + 2.1, 6);
    const fire = iso(x + 1.4, y + 2.1);
    g.ellipse(fire.x, fire.y, 9, 4).fill(0x3e2723);
    for (const dx of [-7, 0, 7]) g.rect(fire.x + dx - 1, fire.y - 6, 2, 6).fill(0x424242);
    g.roundRect(pot.x - 10, pot.y - 12, 20, 12, 3).fill(0x616161).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 12, 10, 3.6).fill(0xf4a259);
    this.lights.push({ x: fire.x, y: fire.y - 3, r: 16, color: 0xff7043 });
    const steam = new Graphics();
    this.anim.addChild(steam);
    this.animate = (time) => {
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const f = (time * 0.5 + i / 3) % 1;
        steam.circle(pot.x + Math.sin((f + i) * 5) * 3, pot.y - 16 - f * 20, 2.5 + f * 3).fill({ color: 0xffffff, alpha: 0.5 * (1 - f) });
      }
    };
    this.animate(0);
  },

  // Mesa familiar: a long table under an awning with lunch and a vase of flowers, and a trio of musicians with
  // guitars giving the serenade.
  dm_mesa(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const H = 22 + ctx.up;
    for (const [px, py] of [[0, 0], [2.4, 0], [0, 1.2], [2.4, 1.2]]) box(g, x0 + px, y0 + py, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, 2.5, 1.3, H, 8, 0xf8bbd0, 0xf8bbd0, 0.1);
    box(g, x0 + 0.3, y0 + 0.4, 1.9, 0.5, 8, 0xffffff);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const p = iso(x0 + 0.45 + k * 0.3, y0 + 0.65, 8);
      g.ellipse(p.x, p.y, 3.4, 1.7).fill(0xffffff).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 0.5, 2.2, 1).fill(0xf4a259);
    }
    const vase = iso(x0 + 1.25, y0 + 0.62, 8);
    g.rect(vase.x - 2, vase.y - 6, 4, 6).fill(0x4fc3f7);
    for (let f = 0; f < 5; f++) g.circle(vase.x - 4 + f * 2, vase.y - 8 - (f % 2) * 2, 1.8).fill([0xe91e63, 0xfdd835, 0xffffff, 0xe53935, 0x8e24aa][f]);
    const trio = new Graphics();
    this.anim.addChild(trio);
    const spots = [0.6, 1.25, 1.9].map((k) => iso(x0 + k, y0 + 1.75));
    this.animate = (time) => {
      trio.clear();
      spots.forEach((p, k) => {
        const strum = Math.sin(time * 6 + k) * 1.2;
        worker(trio, p.x, p.y, 0x263238);
        trio.ellipse(p.x, p.y - 23, 6, 1.6).fill(0x263238);
        trio.ellipse(p.x + 1, p.y - 12, 4, 3).fill(0xa1693f);
        trio.rect(p.x + 3, p.y - 17, 5, 1.2).fill(0x6d4c41);
        trio.rect(p.x - 1 + strum, p.y - 13, 1.4, 3).fill(0xc68e5e);
      });
    };
    this.animate(0);
    this.roofTop = iso(x0 + 1.25, y0 + 0.65, H + 8);
  },

  // --- San Juan y San Pedro (v5.21) ---
  // Clay oven of the asado huilense: a big dome of clay under a shed, the pork roasting inside and smoke rising.
  sp_asado(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const H = 22 + ctx.up;
    for (const [px, py] of [[0, 0], [2.3, 0], [0, 1.5], [2.3, 1.5]]) box(g, x0 + px, y0 + py, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, 2.4, 1.6, H, 10, PAL.roof, PAL.wood);
    const c = iso(x0 + 1.2, y0 + 0.9);
    g.ellipse(c.x, c.y, 22, 11).fill(0x8d4a2b).stroke(OUTLINE);
    g.moveTo(c.x - 20, c.y).quadraticCurveTo(c.x, c.y - 34, c.x + 20, c.y).fill(0xb5653a).stroke(OUTLINE);
    g.moveTo(c.x - 7, c.y + 3).quadraticCurveTo(c.x, c.y - 11, c.x + 7, c.y + 3).fill(0x2b1a10);
    this.lights.push({ x: c.x, y: c.y - 2, r: 18, color: 0xff7043 });
    this.smokePoints.push({ x: c.x + 6, y: c.y - 24 });
    // Pots of marinated pork waiting.
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) {
      const p = iso(x0 + 0.3 + k * 0.45, y0 + 1.85);
      g.roundRect(p.x - 4, p.y - 6, 8, 6, 1.5).fill(0x616161).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 6, 4, 1.4).fill(0xc0392b);
    }
    this.roofTop = iso(x0 + 1.2, y0 + 0.8, H + 10);
  },

  // Achira oven: a small clay oven and a table with achiras on bijao leaves, the baker taking out a tray.
  sp_achiras(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    const c = iso(x0 + 0.8, y0 + 0.8);
    g.ellipse(c.x, c.y, 15, 7.5).fill(0x8d4a2b).stroke(OUTLINE);
    g.moveTo(c.x - 13, c.y).quadraticCurveTo(c.x, c.y - 24, c.x + 13, c.y).fill(0xc68a5b).stroke(OUTLINE);
    g.moveTo(c.x - 5, c.y + 2).quadraticCurveTo(c.x, c.y - 8, c.x + 5, c.y + 2).fill(0x2b1a10);
    this.lights.push({ x: c.x, y: c.y - 1, r: 14, color: 0xff8a65 });
    box(g, x0 + 1.3, y0 + 0.9, 1.0, 0.6, 9, PAL.wood);
    const leaf = iso(x0 + 1.8, y0 + 1.2, 9);
    g.ellipse(leaf.x, leaf.y, 12, 4.5).fill(0x689f38);
    for (let k = 0; k < 5 + Math.min(ctx.tier, 3); k++) g.ellipse(leaf.x - 8 + (k % 4) * 5, leaf.y - 1 - Math.floor(k / 4) * 2, 2.2, 1.3).fill(PRODUCTS.achiras_sampedro.color).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
    const baker = new Graphics();
    this.anim.addChild(baker);
    const b = iso(x0 + 1.0, y0 + 1.9);
    this.animate = (time) => {
      const reach = Math.sin(time * 2) * 3;
      baker.clear();
      worker(baker, b.x, b.y, 0xf2c14e);
      baker.rect(b.x - 10 + reach, b.y - 15, 10, 1.6).fill(0x6d4c41);
      baker.rect(b.x - 12 + reach, b.y - 17, 5, 2).fill(0xe8b860);
    };
    this.animate(0);
  },

  // Tablado del sanjuanero: a wooden stage with red and yellow bunting where a couple dances the sanjuanero, her
  // wide skirt swirling and his straw hat in hand.
  sp_tablado(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.35;
    box(g, x0, y0, 2.5, 1.5, 8, 0xa1693f);
    for (let k = 0; k < 6; k++) {
      const a = iso(x0 + k * 0.5, y0 + 1.5, 8);
      g.rect(a.x - 0.4, a.y, 0.8, 8).fill(0x6d4c41);
    }
    for (const [px, py] of [[0, 0], [2.4, 0]]) box(g, x0 + px, y0 + py, 0.1, 0.1, 30 + ctx.up, PAL.woodDark);
    const a = iso(x0 + 0.05, y0 + 0.05, 30 + ctx.up);
    const b = iso(x0 + 2.45, y0 + 0.05, 30 + ctx.up);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 8 };
    g.moveTo(a.x, a.y).quadraticCurveTo(mid.x, mid.y, b.x, b.y).stroke({ width: 1, color: 0x5d4037 });
    for (let k = 0; k < 8; k++) {
      const tt = (k + 0.5) / 8;
      const px = (1 - tt) * (1 - tt) * a.x + 2 * (1 - tt) * tt * mid.x + tt * tt * b.x;
      const py = (1 - tt) * (1 - tt) * a.y + 2 * (1 - tt) * tt * mid.y + tt * tt * b.y;
      g.poly([px - 2.5, py, px + 2.5, py, px, py + 5]).fill(k % 2 ? 0xd7263d : 0xf2c14e);
    }
    const couple = new Graphics();
    this.anim.addChild(couple);
    const c = iso(x0 + 1.25, y0 + 0.75, 8);
    this.animate = (time) => {
      const turn = Math.sin(time * 3);
      couple.clear();
      // She: white blouse and a wide flowered skirt that swirls.
      const sx = c.x - 6 + turn * 3;
      couple.poly([sx - 9 - Math.abs(turn) * 3, c.y, sx + 9 + Math.abs(turn) * 3, c.y, sx + 2, c.y - 12, sx - 2, c.y - 12]).fill(0xfafafa).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      for (let k = 0; k < 4; k++) couple.circle(sx - 6 + k * 4, c.y - 3, 1.4).fill([0xd7263d, 0xf2c14e, 0x1e88e5, 0x2f7d4f][k]);
      couple.roundRect(sx - 3, c.y - 19, 6, 8, 2).fill(0xfafafa);
      couple.circle(sx, c.y - 21.5, 2.8).fill(0x6d4c32);
      couple.circle(sx + 2.5, c.y - 23, 1.4).fill(0xd7263d);
      // He: white shirt, red scarf, straw hat in hand.
      const hx = c.x + 7 - turn * 3;
      worker(couple, hx, c.y, 0xfafafa);
      couple.rect(hx - 3, c.y - 17, 6, 1.6).fill(0xd7263d);
      couple.ellipse(hx + 6, c.y - 18 + turn * 2, 5, 1.6).fill(0xf3d27a);
    };
    this.animate(0);
  },

  // --- 20 de julio (v5.21) ---
  // Taller de banderas: an awning stall with Colombian flags hanging to dry and a seamstress at her machine.
  ind_banderas(g, x, y, ctx) {
    const x0 = x + 0.4;
    const y0 = y + 0.35;
    fleaStall(this, g, x0, y0, ctx, 0x003893, [0xfcd116, 0x003893, 0xce1126, 0xfcd116, 0x003893], 2.2);
    // drawFlag clears its Graphics, so each flag has its own.
    const spots = Array.from({ length: 2 + Math.min(ctx.tier, 2) }, (_, k) => iso(x0 + 0.3 + k * 0.5, y0 + 1.9, 2));
    const flags = spots.map(() => this.anim.addChild(new Graphics()));
    const seamstress = this.anim.addChild(new Graphics());
    const seam = iso(x0 + 1.9, y0 + 2.2);
    this.animate = (time, clock) => {
      spots.forEach((p, k) => drawFlag(flags[k], p.x, p.y, clock + k));
      seamstress.clear();
      worker(seamstress, seam.x, seam.y, 0xce1126);
      seamstress.rect(seam.x - 7, seam.y - 12, 8, 4).fill(0x37474f);
      seamstress.rect(seam.x - 6, seam.y - 14 - Math.abs(Math.sin(time * 10)) * 1.5, 1, 3).fill(0xb0bec5);
    };
    this.animate(0, 0);
  },

  // Taller de escarapelas: a house with tricolor rosettes pinned on a board at the door.
  ind_escarapelas(g, x, y, ctx) {
    const H = house(this, g, x + 0.25, y + 0.25, 2.2, 1.1, 24, ctx, { wall: 0xfff8e1 });
    door(g, x + 0.25, y + 0.25, 1.1, 1.6, 15, ctx.trim);
    windowOnFront(this, g, x + 0.25, y + 0.25, 1.1, 0.5, 8, 0xffffff);
    const board = iso(x + 1.0, y + 1.38, 4);
    g.rect(board.x - 12, board.y - 16, 24, 14).fill(0x8d6e63).stroke(OUTLINE);
    for (let k = 0; k < 3 + Math.min(ctx.tier, 3); k++) {
      const cx = board.x - 8 + (k % 3) * 8;
      const cy = board.y - 12 + Math.floor(k / 3) * 7;
      g.circle(cx, cy, 3.2).fill(0xce1126);
      g.circle(cx, cy, 2.2).fill(0x003893);
      g.circle(cx, cy, 1.2).fill(0xfcd116);
    }
    this.roofTop = iso(x + 1.35, y + 0.8, H + 16);
  },

  // Desfile del 20 de julio: a reviewing stand with a big flag on its pole and the school band marching in front,
  // drum and bass drum included.
  ind_desfile(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.25;
    box(g, x0, y0, 2.4, 1.0, 10, 0xeceff1);
    for (let k = 0; k < 3; k++) box(g, x0, y0 + 0.2 + k * 0.25, 2.4, 0.06, 12 + k * 3, [0xfcd116, 0x003893, 0xce1126][k]);
    box(g, x0 + 2.4, y0 + 0.4, 0.08, 0.08, 46 + ctx.up, 0x9e9e9e);
    const flag = new Graphics();
    const band = new Graphics();
    this.anim.addChild(flag, band);
    const pole = iso(x0 + 2.44, y0 + 0.44, 46 + ctx.up);
    const marchers = [0.4, 1.0, 1.6, 2.2].map((k) => iso(x0 + k, y0 + 2.0));
    this.animate = (time, clock) => {
      drawFlag(flag, pole.x, pole.y + 18, clock);
      band.clear();
      marchers.forEach((p, k) => {
        const step = Math.sin(time * 6 + k * 1.5) * 1.5;
        worker(band, p.x, p.y - Math.abs(step), 0x003893);
        band.rect(p.x - 3, p.y - 26 - Math.abs(step), 6, 3).fill(0xce1126);
        if (k === 1) band.ellipse(p.x, p.y - 12 - Math.abs(step), 5, 4).fill(0xfafafa).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
        if (k === 3) band.rect(p.x + 3, p.y - 16 - Math.abs(step), 5, 2).fill(0xfdd835);
      });
    };
    this.animate(0, 0);
    this.roofTop = null;
  },
};

// Tolima Grande (v4.0): stations sharing artwork from other regions.
DRAW.huila_huller = DRAW.huller;
// Truchas de Guatavita (v4.4): cleaning, smokehouse, and filleter shared with Betania.
DRAW.limpieza_trucha = DRAW.fish_cleaner;
DRAW.ahumadero_trucha = DRAW.cachama_smoker;
DRAW.fileteadora_trucha = DRAW.fish_filleter;
// Cocina de la Sabana (v4.4): Peeler shared with Boyacá potato peeler.
DRAW.peladero = DRAW.potato_peeler;
// Zipaquirá (v4.4): colonial plaza sharing Villa de Leyva buildings.
DRAW.salon_onces = DRAW.terraza_plaza;
DRAW.hotel_plaza_zipa = DRAW.hospedaje_colonial;
DRAW.plaza_mercado_zipa = DRAW.mercado_sabado;
DRAW.mochilas_paseo = DRAW.canastos_paseo;
DRAW.huila_roaster = DRAW.roaster;
DRAW.huila_packer = DRAW.packer;
DRAW.tilapia_cleaner = DRAW.fish_cleaner;
DRAW.tilapia_filleter = DRAW.fish_filleter;
DRAW.tilapia_smoker = DRAW.cachama_smoker;

