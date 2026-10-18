import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { StationView, Label } from './Stations.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';

// Color de remates (zócalo, puertas, balcones) según los hitos alcanzados.
export const TRIMS = [PAL.balconyGreen, PAL.balconyBlue, PAL.balconyRed, PAL.balconyYellow, 0x8e44ad, 0xffd700];

// Lo que gana cada edificio en cada hito (GDD §8, evolución visual):
//   hito 1 (nv 10): macetas con flores y remates de otro color
//   hito 2 (nv 25): segundo piso con balcón
//   hito 3 (nv 50): faroles que se encienden de noche
//   hito 4 (nv 75): patio empedrado
//   hito 5 (nv 100): bandera de Colombia en el tejado y remates dorados
export const UPPER_FLOOR = 12; // px extra de pared desde el hito 2

// Edificio de una estación de procesamiento sobre su parcela de 3×3.
// Cada estación tiene su propio dibujo y, si aplica, una animación mientras trabaja.
export class BuildingView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    // El cuerpo se escala desde el suelo para los rebotes al construir y mejorar.
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
    this.label.set(`${this.def.icon} ${this.def.name} · Nv ${st.level}`);
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

  // Rebote: 'pop' al construir (brota del suelo), 'bump' al subir de nivel.
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
        // De 0 a 1 con un pequeño rebote al final (easeOutBack).
        const c = 1.7;
        const e = 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
        this.body.scale.set(1, Math.max(0.01, e));
      } else {
        this.body.scale.set(1, 1 + Math.sin(k * Math.PI) * this.bounceSize);
      }
    }
  }
}

// Detalles comunes según los hitos.
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

// Farol de poste; devuelve el punto de la lámpara.
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

// Bandera de Colombia (amarillo, azul, rojo) ondeando.
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

// Fachada con puerta en la cara delantera (eje gy+).
function door(g, x, y, d, at, h, color) {
  g.poly(isoPoly([[x + at - 0.15, y + d, 0], [x + at + 0.15, y + d, 0], [x + at + 0.15, y + d, h], [x + at - 0.15, y + d, h]])).fill(shade(color, 0.75)).stroke(OUTLINE);
}

// Ventana en la cara derecha (eje gx+); se ilumina de noche.
function windowOnRight(view, g, x, y, w, at, z, color) {
  g.poly(isoPoly([[x + w, y + at - 0.13, z], [x + w, y + at + 0.13, z], [x + w, y + at + 0.13, z + 10], [x + w, y + at - 0.13, z + 10]])).fill(color).stroke(OUTLINE);
  const c = iso(x + w, y + at, z + 5);
  view.lights.push({ x: c.x, y: c.y, r: 18 });
}

// Ventana en la fachada delantera (eje gy+).
function windowOnFront(view, g, x, y, d, at, z, color) {
  g.poly(isoPoly([[x + at - 0.13, y + d, z], [x + at + 0.13, y + d, z], [x + at + 0.13, y + d, z + 10], [x + at - 0.13, y + d, z + 10]])).fill(color).stroke(OUTLINE);
  const c = iso(x + at, y + d, z + 5);
  view.lights.push({ x: c.x, y: c.y, r: 18 });
}

// Barandilla de balcón en la fachada delantera, a la altura z.
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

// Casa básica: zócalo de color, paredes encaladas, tejado de barro. Devuelve la altura de la pared.
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

// Canasta de fique: cesta tejida con asa (de color si es de regalo).
function basketShape(g, gx, gy, z, scale = 1, color = PRODUCTS.basket.color) {
  const p = iso(gx, gy, z);
  const w = 7 * scale;
  g.poly([p.x - w, p.y - 7 * scale, p.x + w, p.y - 7 * scale, p.x + w * 0.75, p.y, p.x - w * 0.75, p.y]).fill(color).stroke(OUTLINE);
  for (let k = 1; k < 3; k++) g.moveTo(p.x - w + k, p.y - (7 * scale * k) / 3).lineTo(p.x + w - k, p.y - (7 * scale * k) / 3).stroke({ width: 0.8, color: shade(color, 0.7) });
  g.moveTo(p.x - w * 0.7, p.y - 7 * scale).quadraticCurveTo(p.x, p.y - 15 * scale, p.x + w * 0.7, p.y - 7 * scale).stroke({ width: 1.5, color: shade(color, 0.75) });
}

// Contenedor de exportación sobre la huella (gx, gy), de 1,1 × 0,6 casillas, a la altura z.
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

const DRAW = {
  // Beneficiadero: casa con tolva y tanques de lavado.
  wetmill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.5, 29, ctx);
    door(g, hx, hy, 1.5, 0.9, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.75, 14, PAL.balconyYellow);
    // Tolva (embudo) de recibo.
    const t = iso(x + 2.5, y + 0.8, 28);
    g.poly([t.x - 14, t.y - 6, t.x + 14, t.y - 6, t.x + 5, t.y + 12, t.x - 5, t.y + 12]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 14, 5).fill(PAL.cherry).stroke(OUTLINE);
    box(g, x + 2.35, y + 0.65, 0.3, 0.3, 18, 0x6c757d);
    // Tanques de lavado.
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

  // Marquesina: techo de plástico translúcido sobre camas de café secándose.
  dryer(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.3;
    const H = 26 + ctx.up;
    // Camas elevadas con café pergamino (una más con el segundo hito).
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
    // Techo curvo de plástico (aproximado con un tejado a dos aguas translúcido).
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
    // Bombillo colgado bajo el techo.
    const bulb = iso(x0 + w / 2, ym, H - 4);
    g.circle(bulb.x, bulb.y, 2.5).fill(0xffe9a8);
    this.lights.push({ x: bulb.x, y: bulb.y, r: 30 });
    // Brillo del sol sobre el plástico.
    const shine = new Graphics();
    this.anim.addChild(shine);
    this.animate = (time) => {
      const f = (time * 0.25) % 1;
      const p = iso(x0 + f * w, y0 + d * 0.75, H + 7);
      shine.clear().ellipse(p.x, p.y, 10, 4).fill({ color: 0xffffff, alpha: 0.6 * Math.sin(f * Math.PI) });
    };
  },

  // Trilladora: galpón con techo de zinc y máquina.
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
    // Portón abierto con la máquina adentro.
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
    // Vibración de la máquina.
    const shaker = new Graphics();
    this.anim.addChild(shaker);
    this.animate = (time) => {
      shaker.clear();
      const j = Math.sin(time * 40) * 0.8;
      shaker.circle(f.x + j, f.y - 14, 2).fill(PRODUCTS.parchment.color);
      shaker.circle(f.x - 3 - j, f.y - 16, 1.6).fill(PRODUCTS.parchment.color);
    };
  },

  // Tostadora: edificio de ladrillo con chimenea alta y tambor.
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
    // Tambor tostador en el patio.
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

  // Molino: casa con rueda hidráulica que gira.
  grinder(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.8, 1.8, 34, ctx, { roofH: 18 });
    door(g, hx, hy, 1.8, 0.8, 16, ctx.trim);
    windowOnFront(this, g, hx, hy, 1.8, 1.4, 14, PAL.balconyYellow);
    // Canal de agua junto a la rueda.
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

  // Compostera: tres cajones de madera con compost y una canaleta que trae la pulpa.
  composter(g, x, y, ctx) {
    // Canaleta desde el Beneficiadero (a la izquierda).
    const a = iso(x - 0.6, y + 1.5, 4);
    const b = iso(x + 0.4, y + 1.5, 4);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 5, color: PAL.wood });
    g.moveTo(a.x, a.y - 1).lineTo(b.x, b.y - 1).stroke({ width: 2, color: PRODUCTS.pulp.color });
    const bins = [[0.35, 0.3], [0.35, 1.15], [0.35, 2.0]];
    for (const [bx, by] of bins) {
      box(g, x + bx, y + by, 2.2, 0.7, 12 + ctx.up / 2, PAL.wood);
      // Compost asomando por encima.
      const c = iso(x + bx + 1.1, y + by + 0.35, 12 + ctx.up / 2);
      g.ellipse(c.x, c.y, 34, 10).fill(0x4a3424).stroke(OUTLINE);
      g.ellipse(c.x - 8, c.y - 2, 10, 3).fill(0x5e4430);
    }
    // Pala clavada en el compost.
    const sh = iso(x + 1.6, y + 1.5, 20 + ctx.up / 2);
    g.moveTo(sh.x, sh.y).lineTo(sh.x + 6, sh.y - 22).stroke({ width: 2.5, color: PAL.woodDark });
    g.poly([sh.x - 4, sh.y, sh.x + 4, sh.y, sh.x + 2, sh.y + 8, sh.x - 2, sh.y + 8]).fill(0x9aa3a8).stroke(OUTLINE);
    this.roofTop = iso(x + 1.45, y + 0.65, 22);
    // Lombrices que asoman mientras trabaja (es compost de verdad).
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

  // Molienda: ramada con techo de zinc sobre el trapiche de tres mazas, caña y pila de bagazo.
  cane_mill(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.0;
    const d = 1.8;
    const H = 24 + ctx.up;
    // Piso de cemento.
    g.poly(isoPoly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]])).fill(0xc7beb0).stroke(OUTLINE);
    // Trapiche: base y tres mazas (cilindros).
    box(g, x0 + 0.6, y0 + 0.6, 0.8, 0.6, 8, 0x5a5a5a);
    const rollers = [];
    for (const k of [0, 1, 2]) {
      const c = iso(x0 + 0.75 + k * 0.25, y0 + 0.9, 18);
      g.rect(c.x - 5, c.y - 10, 10, 18).fill(0x8a8f94).stroke(OUTLINE);
      g.ellipse(c.x, c.y - 10, 5, 2.5).fill(0xb0b5ba).stroke(OUTLINE);
      rollers.push(c);
    }
    // Postes y techo de zinc a dos aguas.
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, 0x9aa3a8, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Atados de caña a la izquierda y pila de bagazo a la derecha (hacia la Hornilla).
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.25 + i * 0.12, y + 2.5, i * 3);
      g.roundRect(p.x - 14, p.y - 5, 28, 6, 3).fill(0x9cc65b).stroke(OUTLINE);
    }
    const b = iso(x + 2.5, y + 2.4);
    g.ellipse(b.x, b.y - 6, 18, 9).fill(PRODUCTS.bagasse.color).stroke(OUTLINE);
    g.ellipse(b.x - 4, b.y - 10, 8, 3).fill(0xe8d6a8);
    // Las mazas giran mientras trabaja.
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

  // Hornilla: horno largo de ladrillo con pailas de melado hirviendo y chimenea.
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
    // Boca del horno con fuego (de frente).
    const mouth = iso(x0 + 0.3, y0 + 1.0, 4);
    g.ellipse(mouth.x, mouth.y, 7, 5).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 26, color: 0xff7a1a });
    // Pailas: con el segundo hito, una más.
    const pans = ctx.tier >= 2 ? [0.35, 0.95, 1.55, 2.15] : [0.5, 1.25, 2.0];
    const tops = [];
    for (const px of pans) {
      const c = iso(x0 + px, y0 + 0.5, 12);
      g.ellipse(c.x, c.y, 15, 7).fill(0xb87333).stroke(OUTLINE);
      g.ellipse(c.x, c.y, 11, 5).fill(PRODUCTS.melado.color);
      tops.push(c);
    }
    // Chimenea alta al fondo.
    const chimneyH = 56 + ctx.up;
    box(g, x0 + 2.2, y0 - 0.45, 0.35, 0.35, chimneyH, shade(brick, 0.9));
    const top = iso(x0 + 2.37, y0 - 0.28, chimneyH);
    this.smokePoints.push({ x: top.x, y: top.y - 4 }, { x: top.x + 2, y: top.y - 6 });
    this.roofTop = iso(x0 + 0.4, y0 - 0.3, 26);
    // Montón de bagazo (combustible) junto a la boca.
    const pile = iso(x + 0.3, y + 2.8);
    g.ellipse(pile.x, pile.y - 4, 13, 6).fill(PRODUCTS.bagasse.color).stroke(OUTLINE);
    // El melado burbujea y la boca parpadea mientras trabaja.
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

  // Gaveras: mesas de madera con moldes llenos de panela, bajo una ramada de teja.
  molds(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.2;
    const H = 26 + ctx.up;
    const tables = ctx.tier >= 2 ? [0.25, 0.95, 1.6] : [0.4, 1.3];
    for (const ty of tables) {
      box(g, x0 + 0.2, y0 + ty, w - 0.4, 0.5, 9, PAL.wood);
      // Cuadrícula de moldes con panelas.
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
    // Vapor de la panela recién vertida.
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

  // Pulverizadora: casita con la máquina, bultos de panela pulverizada y polvillo.
  pulverizer(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Máquina en el patio: tolva y salida.
    const m = iso(x + 1.6, y + 2.35, 0);
    box(g, x + 1.3, y + 2.1, 0.6, 0.5, 12, 0xd7263d);
    g.poly([m.x - 10, m.y - 22, m.x + 10, m.y - 22, m.x + 4, m.y - 12, m.x - 4, m.y - 12]).fill(0x9aa3a8).stroke(OUTLINE);
    // Bultos de panela pulverizada.
    for (const [bx, by, z] of [[2.45, 2.2, 0], [2.7, 2.45, 0], [2.55, 2.3, 10]]) {
      const p = iso(x + bx, y + by, z);
      g.roundRect(p.x - 7, p.y - 13, 14, 13, 3).fill(0xf4efe6).stroke(OUTLINE);
      g.rect(p.x - 5, p.y - 9, 10, 4).fill(PRODUCTS.panela_powder.color);
    }
    // Polvillo dorado que sale de la máquina.
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

  // Pasteurizadora: nave blanca con dos tanques de acero, tubería y vapor.
  pasteurizer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.7, 1.5, 26, ctx, { wall: 0xf7f7f2, roofColor: 0x8fa3ad, roofH: 12 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.7, 0.75, 13, 0xd6ecff);
    // Tanques de acero inoxidable (cilindros) a la derecha.
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
    // Tubería que une la nave con los tanques.
    const a = iso(hx + 1.7, hy + 0.75, 12);
    const b2 = iso(x + 2.35, y + 0.9, 12);
    g.moveTo(a.x, a.y).lineTo(b2.x, b2.y).stroke({ width: 3, color: 0x9aa3a8 });
    this.roofTop = iso(hx + 0.85, hy + 0.75, 26 + ctx.up + 12);
    // Vapor de la pasteurización.
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

  // Descremadora: casita con la centrífuga (gira mientras trabaja) y cantinas de crema.
  separator(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.6, 1.4, 24, ctx, { wall: 0xfff3d6, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.6, 0.7, 12, PAL.balconyYellow);
    // Centrífuga en el patio: base, tazón y la manivela.
    const c = iso(x + 2.35, y + 1.2);
    g.rect(c.x - 4, c.y - 14, 8, 14).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 18, 11, 6).fill(0xd8dde2).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 19, 7, 3.5).fill(PRODUCTS.cream.color);
    // Cantinas de crema.
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

  // Batidora: mantequera de madera (barril que gira) bajo una ramada, con bloques de mantequilla.
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
    // Mesa con bloques de mantequilla.
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
    // El barril da vueltas mientras trabaja (se dibuja encogido según el ángulo).
    this.animate = (time) => {
      const k = Math.abs(Math.cos(time * 3));
      barrel.clear();
      barrel.roundRect(c.x - 13, c.y - 10 - 4 * k, 26, 12 + 8 * k, 5).fill(0xa0703c).stroke(OUTLINE);
      barrel.moveTo(c.x - 13, c.y - 4).lineTo(c.x + 13, c.y - 4).stroke({ width: 1.5, color: 0x5a5a5a });
    };
    this.animate(0);
  },

  // Quesera: casa con zócalo verde, repisas con ruedas de queso y una prensa de madera.
  cheesery(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.5, 26, ctx, { wall: 0xf9f2df, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 13, PAL.balconyYellow);
    // Repisa con quesos frente a la casa.
    box(g, x + 0.4, y + 2.15, 1.5, 0.35, 10, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 0.55 + i * 0.35, y + 2.3, 10);
      g.ellipse(p.x, p.y - 3, 6, 3).fill(PRODUCTS.cheese.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 5, 6, 3).fill(shade(PRODUCTS.cheese.color, 1.05)).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Prensa de queso (tornillo de madera) que baja y sube.
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

  // Paila de arequipe: gran paila de cobre sobre un fogón, con mecedor y frascos de arequipe.
  arequipe_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    // Fogón de ladrillo con la paila encima.
    box(g, x0 + 0.5, y0 + 0.5, 1.3, 1.1, 10, 0xb5653a);
    const c = iso(x0 + 1.15, y0 + 1.05, 10);
    g.ellipse(c.x, c.y, 26, 13).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(c.x, c.y, 21, 10).fill(PRODUCTS.arequipe.color);
    const mouth = iso(x0 + 0.8, y0 + 1.6, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    // Leña.
    for (let i = 0; i < 3; i++) {
      const p = iso(x + 0.3 + i * 0.12, y + 2.65, i * 2);
      g.roundRect(p.x - 10, p.y - 4, 20, 4, 2).fill(0x8b5a2b).stroke(OUTLINE);
    }
    // Frascos de arequipe y bultos de panela pulverizada (lo que trae la Chiva).
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
    // El mecedor da vueltas en la paila y el arequipe burbujea.
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

  // Cajones de fermentación: tres cajones de madera en escalera, tapados con hojas de plátano.
  fermenter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    const boxes = [[0.2, 0.3, 14], [0.95, 0.75, 9], [1.7, 1.2, 4]];
    for (const [bx, by, z] of boxes) {
      box(g, x0 + bx, y0 + by, 0.7, 0.7, 10, 0x8b5a2b, { z });
      // Hojas de plátano encima.
      const c = iso(x0 + bx + 0.35, y0 + by + 0.35, z + 10);
      g.ellipse(c.x - 3, c.y, 11, 4).fill(0x5e9a3c).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.ellipse(c.x + 4, c.y - 1, 9, 3).fill(0x74b14a);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, 0x9aa3a8, 0xb08a5a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Baba de cacao que escurre y vapor tibio de la fermentación.
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

  // Secadero: tarima de madera elevada con el cacao extendido y un techo corredizo sobre rieles.
  cacao_dryer(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.0;
    // Patas y tarima.
    for (const [px, py] of [[0.1, 0.1], [w - 0.1, 0.1], [0.1, d - 0.1], [w - 0.1, d - 0.1]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 10, PAL.woodDark);
    box(g, x0, y0, w, d, 3, PAL.wood, { z: 10 });
    // Granos extendidos (más con cada hito).
    const rng = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
    for (let k = 0; k < 40 + ctx.tier * 10; k++) {
      const p = iso(x0 + 0.15 + rng(k) * (w - 0.3), y0 + 0.15 + rng(k + 99) * (d - 0.3), 13);
      g.ellipse(p.x, p.y, 1.6, 1).fill(k % 3 ? PRODUCTS.cacao_dry.color : PRODUCTS.cacao_fermented.color);
    }
    // Rieles y techo corredizo (abierto de día, se mueve mientras trabaja).
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

  // Tostador de cacao: tambor que gira sobre un fogón de ladrillo, con chimenea.
  cacao_roaster(g, x, y, ctx) {
    const brick = 0xb5653a;
    const x0 = x + 0.4;
    const y0 = y + 0.6;
    box(g, x0, y0, 1.8, 1.2, 12, brick);
    const mouth = iso(x0 + 0.4, y0 + 1.2, 4);
    g.ellipse(mouth.x, mouth.y, 6, 4).fill(0x2b1a10).stroke(OUTLINE);
    this.lights.push({ x: mouth.x, y: mouth.y, r: 24, color: 0xff7a1a });
    // Soportes del tambor.
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
    // Costales de cacao seco esperando.
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

  // Molino de cacao: casa con una piedra de moler que gira y escurre la pasta.
  cacao_mill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.7, 1.4, 26, ctx, { wall: 0xf1e3cf, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.7, 0.7, 13, PAL.balconyYellow);
    // Piedra de moler en el patio.
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

  // Mesa de chocolate: ramada con una mesa larga y las pastillas de chocolate en sus moldes.
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

  // Chocolatería: tienda con toldo a rayas, vitrina y una pila de chocolatinas.
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
    // Toldo a rayas sobre la vitrina.
    for (let i = 0; i < 6; i++) {
      const a = hx + 0.2 + i * 0.2;
      g.poly(isoPoly([[a, hy + 1.5, 21], [a + 0.2, hy + 1.5, 21], [a + 0.2, hy + 1.85, 16], [a, hy + 1.85, 16]])).fill(i % 2 ? 0xffffff : 0xd7263d).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, PAL.balconyYellow);
    // Pila de cajas de chocolatinas.
    const stack = [[2.4, 2.4, 0], [2.7, 2.4, 0], [2.55, 2.4, 9]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 1))) {
      const p = iso(x + bx, y + by, z);
      g.roundRect(p.x - 7, p.y - 9, 14, 9, 2).fill(0x8b5a3c).stroke(OUTLINE);
      g.rect(p.x - 5, p.y - 6, 10, 2).fill(0xe8b90f);
    }
  },

  // Desgranadora: casita con la máquina de manivela, un montón de mazorcas y el grano que cae.
  sheller(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.6, 1.4, 24, ctx, { wall: 0xf3e6c4, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.6, 0.7, 12, PAL.balconyYellow);
    // Montón de mazorcas.
    for (let k = 0; k < 7; k++) {
      const p = iso(x + 0.5 + (k % 4) * 0.2, y + 2.45 + Math.floor(k / 4) * 0.15, Math.floor(k / 4) * 4);
      g.ellipse(p.x, p.y - 3, 5, 2.5).fill(PRODUCTS.corn_cob.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Máquina: tolva roja y manivela que gira.
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

  // Piladora: dos pilones de madera con sus manos (mazos) que suben y bajan, bajo una ramada.
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

  // Molino de masa: casa con el molino de corona en la puerta y bolas de masa en una batea.
  dough_mill(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.4, 25, ctx, { wall: 0xf9f2df, roofH: 13 });
    door(g, hx, hy, 1.4, 0.55, 15, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.7, 12, PAL.balconyYellow);
    // Batea con bolas de masa.
    box(g, x + 0.4, y + 2.15, 1.2, 0.45, 5, PAL.wood);
    for (let k = 0; k < 4; k++) {
      const p = iso(x + 0.55 + k * 0.28, y + 2.37, 5);
      g.circle(p.x, p.y - 3, 3.5).fill(PRODUCTS.corn_dough.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    // Molino de corona sobre una mesa, con la manivela que gira.
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

  // Budare: fogón de barro con el budare redondo lleno de arepas y una chimenea.
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
    // Leña.
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

  // Puesto de arepas: kiosco de colores con parasol, mostrador y bandejas de arepas de queso.
  arepa_stand(g, x, y, ctx) {
    const x0 = x + 0.5;
    const y0 = y + 0.5;
    box(g, x0, y0, 2.0, 0.9, 16, PAL.balconyYellow);
    box(g, x0, y0 + 0.9, 2.0, 0.1, 16, PAL.balconyRed);
    // Bandejas sobre el mostrador.
    for (let k = 0; k < 4; k++) {
      const p = iso(x0 + 0.3 + k * 0.45, y0 + 0.45, 16);
      g.ellipse(p.x, p.y, 7, 3.5).fill(0xffffff).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(p.x, p.y - 1.5, 5, 2.5).fill(PRODUCTS.cheese_arepa.color);
      g.ellipse(p.x, p.y - 2.5, 3, 1.2).fill(0xfff3d6);
    }
    // Parasol a gajos de colores.
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
    // Bancos de madera para los clientes.
    for (const [bx, by] of [[0.4, 2.5], [1.9, 2.5]]) box(g, x + bx, y + by, 0.6, 0.25, 6, PAL.wood);
    // Vapor de las arepas calientes.
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

  // Greca de tintos: cafetería de esquina con la greca plateada en el mostrador y vapor.
  greca(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 1.9, 1.3, 26, ctx, { wall: 0xf2a7a0 });
    door(g, hx, hy, 1.3, 0.5, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.65, 10, 0xffffff);
    // Mostrador al frente con la greca.
    box(g, x + 0.9, y + 1.85, 1.3, 0.45, 12, PAL.wood);
    const base = iso(x + 1.55, y + 2.07, 12);
    g.roundRect(base.x - 7, base.y - 22, 14, 22, 4).fill(0xc7ccd1).stroke(OUTLINE);
    g.ellipse(base.x, base.y - 22, 7, 3).fill(0xe3e6e9).stroke(OUTLINE);
    g.circle(base.x, base.y - 28, 4).fill(0xd8b07a).stroke(OUTLINE);
    g.rect(base.x + 6, base.y - 10, 6, 2).fill(0x555555);
    // Tacitas de tinto.
    for (let k = 0; k < 3; k++) {
      const c = iso(x + 1.05 + k * 0.18, y + 2.05, 12);
      g.roundRect(c.x - 2.5, c.y - 4, 5, 4, 1).fill(0xffffff).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
      g.ellipse(c.x, c.y - 4, 2.5, 1).fill(PRODUCTS.tinto.color);
    }
    // Banca para los clientes.
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

  // Fonda: casa larga con corredor, mesas con mantel de cuadros y el fogón humeando.
  fonda(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const H = house(this, g, hx, hy, 2.4, 1.3, 26, ctx, { wall: 0xb8e0a8 });
    door(g, hx, hy, 1.3, 1.2, 16, ctx.trim);
    windowOnFront(this, g, hx, hy, 1.3, 0.5, 8, 0xffffff);
    windowOnFront(this, g, hx, hy, 1.3, 1.9, 8, 0xffffff);
    // Chimenea del fogón de leña.
    box(g, hx + 2.0, hy + 0.2, 0.25, 0.25, H + 18, 0xb5653a);
    const top = iso(hx + 2.12, hy + 0.32, H + 18);
    this.smokePoints.push({ x: top.x, y: top.y - 4 });
    // Mesas con mantel a cuadros y desayunos.
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

  // Taller de canastas: cobertizo abierto con atados de fique, canastas apiladas y una tejedora.
  basket_shop(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.35;
    // Postes y techo de teja sobre el cobertizo.
    for (const [px, py] of [[0, 0], [2.1, 0], [0, 1.4], [2.1, 1.4]]) box(g, x0 + px, y0 + py, 0.12, 0.12, 24 + ctx.up, PAL.wood);
    // Fique colgado secándose.
    for (let k = 0; k < 5; k++) {
      const p = iso(x0 + 0.3 + k * 0.4, y0 + 0.1, 22 + ctx.up);
      g.moveTo(p.x, p.y).lineTo(p.x - 2, p.y + 14).lineTo(p.x + 2, p.y + 14).closePath().fill(0xe8d9a8).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
    }
    gableRoof(g, x0, y0, 2.22, 1.52, 24 + ctx.up, 12, PAL.roof, PAL.wood);
    // Canastas apiladas (más con cada hito).
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

  // Empaque de regalos: tienda con vitrina, cajas de colores con moño y canastas de regalo.
  gift_wrap(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const H = house(this, g, hx, hy, 2.1, 1.4, 27, ctx, { wall: 0xf4efe6 });
    // Vitrina en la fachada.
    g.poly(isoPoly([[hx + 0.2, hy + 1.4, 6], [hx + 1.2, hy + 1.4, 6], [hx + 1.2, hy + 1.4, 18], [hx + 0.2, hy + 1.4, 18]])).fill(0xbfe3f5).stroke(OUTLINE);
    door(g, hx, hy, 1.4, 1.65, 16, ctx.trim);
    const v = iso(hx + 0.7, hy + 1.4, 12);
    this.lights.push({ x: v.x, y: v.y, r: 26 });
    // Toldo de rayas.
    for (let i = 0; i < 6; i++) {
      const a = hx + 0.1 + i * 0.32;
      g.poly(isoPoly([[a, hy + 1.4, 22], [a + 0.32, hy + 1.4, 22], [a + 0.32, hy + 1.72, 17], [a, hy + 1.72, 17]])).fill(i % 2 ? 0xffffff : 0x8e44ad).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
    }
    // Cajas de regalo con moño.
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

  // Patio de contenedores: contenedores apilados de colores y una grúa pórtico que va y viene.
  export_dock(g, x, y, ctx) {
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill({ color: 0x8f8f8f, alpha: 0.5 });
    const colors = [0x2e6fd1, PAL.balconyRed, PAL.balconyGreen, 0xe67e22, 0x8e44ad, PAL.balconyYellow];
    const stacks = [[0.3, 0.4], [0.3, 1.1], [1.6, 0.4]];
    const levels = 1 + Math.min(ctx.tier, 3);
    stacks.forEach(([sx, sy], i) => {
      for (let k = 0; k < (i === 2 ? Math.max(1, levels - 1) : levels); k++) container(g, x + sx, y + sy, k * 11, colors[(i * 2 + k) % colors.length]);
    });
    // Rieles de la grúa.
    for (const ry of [0.2, 2.6]) {
      const a = iso(x + 0.1, y + ry);
      const b = iso(x + 2.9, y + ry);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0x555555 });
    }
    const crane = new Graphics();
    this.anim.addChild(crane);
    const H = 52 + ctx.up;
    this.roofTop = iso(x + 1.5, y + 1.4, H + 4);
    this.lights.push({ x: this.roofTop.x, y: this.roofTop.y + 6, r: 30 });
    this.animate = (time) => {
      crane.clear();
      const cx = x + 0.6 + (Math.sin(time * 0.6) * 0.5 + 0.5) * 1.8;
      for (const ry of [0.2, 2.6]) box(crane, cx - 0.06, y + ry - 0.06, 0.12, 0.12, H, PAL.balconyYellow);
      const a = iso(cx, y + 0.2, H);
      const b = iso(cx, y + 2.6, H);
      crane.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color: 0xd9a400 });
      const hookY = y + 1.4;
      const top = iso(cx, hookY, H);
      const drop = 14 + (Math.sin(time * 1.2) * 0.5 + 0.5) * 12;
      crane.moveTo(top.x, top.y).lineTo(top.x, top.y + drop).stroke({ width: 1, color: 0x333333 });
      container(crane, cx - 0.35, hookY - 0.15, H - drop - 10, 0x2e6fd1, 0.7);
    };
    this.animate(0);
  },

  // Empacadora: bodega amarilla con banda transportadora y bolsas.
  packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf2d16b, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, 0xffffff);
    // Banda transportadora.
    box(g, x + 0.4, y + 2.15, 1.6, 0.35, 8, 0x555555);
    // Pila de bolsas (más alta con cada hito).
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
};
