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

// Un pescadito de perfil (en mesas, ponches y calderos de la Ciénaga, v3.17).
function fishOn(g, x, y, len, color) {
  g.ellipse(x, y, len, len * 0.42).fill(color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
  g.poly([x + len * 0.8, y, x + len * 1.4, y - len * 0.4, x + len * 1.4, y + len * 0.4]).fill(shade(color, 0.8)).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
  g.circle(x - len * 0.55, y - len * 0.08, 0.7).fill(0x263238);
}

// Una persona de pie, de frente (para las animaciones de las estaciones).
function worker(g, x, y, shirt) {
  g.rect(x - 2.2, y - 9, 1.8, 9).fill(0x3d3d5c);
  g.rect(x + 0.4, y - 9, 1.8, 9).fill(0x3d3d5c);
  g.roundRect(x - 3.2, y - 18, 6.4, 9.5, 2).fill(shirt);
  g.circle(x, y - 20.5, 2.8).fill(0x6d4c32);
  g.ellipse(x, y - 22.5, 5.5, 1.5).fill(0xf4e3b5);
}

// Casa de tablas sobre pilotes, como las del Pacífico (v3.38): los pilotes, el piso alzado, las paredes de color, la
// escalera al frente y el techo de zinc. Devuelve la altura del piso (z donde empiezan las paredes).
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
  // Escalera de tablas hasta el piso.
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

// Ramada: cuatro horcones y el techo de zinc a dos aguas, abierta por los lados.
function ramada(view, g, x0, y0, w, d, H, roofColor = 0x9aa3a8) {
  for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, 0x6b4a2e);
  gableRoof(g, x0, y0, w, d, H, 10, roofColor, 0x8d6e4a);
  view.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 10);
}

// Tambo wounaan (v3.42): la casa redonda sobre pilotes, abierta, con el techo cónico de palma. (gx, gy): el
// centro, en casillas; r: el radio en casillas. Devuelve el centro del piso, en píxeles.
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

  // --- Santander · La Guayabera (v3.0) ---

  // Despulpadora de guayaba: casa con la máquina en el patio, guayabas en la tolva y pulpa en la tina.
  guava_pulper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.8, 1.5, 28, ctx, { wall: 0xf6e7c8 });
    door(g, hx, hy, 1.5, 0.9, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.8, 0.75, 14, PAL.balconyYellow);
    // Tolva con guayabas.
    const t = iso(x + 2.5, y + 0.8, 28);
    box(g, x + 2.35, y + 0.65, 0.3, 0.3, 18, 0x6c757d);
    g.poly([t.x - 14, t.y - 6, t.x + 14, t.y - 6, t.x + 5, t.y + 12, t.x - 5, t.y + 12]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 14, 5).fill(PRODUCTS.guava.color).stroke(OUTLINE);
    for (const [dx, dy] of [[-6, -7], [0, -9], [6, -7], [-2, -5]]) g.circle(t.x + dx, t.y + dy, 2.6).fill(0xd4e157).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    // Tinas de pulpa rosada.
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

  // Paila de bocadillo: ramada con el fogón y la paila de cobre; el bocadillo se revuelve sin parar.
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
    // Canastos de guayaba madura junto al fogón.
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

  // Moldes de madera: mesas largas con los moldes llenos de bocadillo cuajando, bajo un techo.
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

  // Cortadora: casa con una mesa donde los bloques se cortan en barritas.
  bocadillo_cutter(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Mesa de corte en el patio, con el bloque y las barritas.
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

  // Envoltura en bijao: casa con mesa de envolver y atados de hojas de bijao secándose.
  bijao_wrapper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 1.9, 1.6, 28, ctx, { wall: 0xe9d8b4, roofH: 14 });
    door(g, hx, hy, 1.6, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.8, 14, PAL.balconyYellow);
    // Cuerda con hojas de bijao colgadas.
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
    // Mesa con bocadillos envueltos.
    box(g, x + 0.4, y + 2.15, 1.7, 0.45, 9, PAL.wood);
    for (let i = 0; i < 6; i++) {
      const p = iso(x + 0.55 + i * 0.26, y + 2.37, 9);
      g.ellipse(p.x, p.y - 2, 4.5, 3).fill(PRODUCTS.bocadillo_bijao.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.rect(p.x - 0.7, p.y - 5, 1.4, 6).fill(0xe0c48a);
    }
  },

  // Cajonera: bodega de cajitas de madera llenas de bocadillos, apiladas para despachar.
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

  // --- Costa · El Arrozal (v3.15) ---

  // Secadora de arroz: patio de cemento con el arroz extendido al sol, un rastrillo que lo voltea y la
  // secadora de gas (un cilindro con su chimenea) bajo un techo de zinc.
  rice_dryer(g, x, y, ctx) {
    const px = x + 0.25;
    const py = y + 0.9;
    // El patio de cemento con el arroz dorado.
    g.poly(isoPoly([[px, py], [px + 2.5, py], [px + 2.5, py + 1.85], [px, py + 1.85]])).fill(0xc9c4b8).stroke(OUTLINE);
    g.poly(isoPoly([[px + 0.15, py + 0.15], [px + 2.35, py + 0.15], [px + 2.35, py + 1.7], [px + 0.15, py + 1.7]])).fill(PRODUCTS.dry_paddy.color);
    for (let k = 0; k < 7; k++) {
      const a = iso(px + 0.2, py + 0.25 + k * 0.21);
      const b = iso(px + 2.3, py + 0.25 + k * 0.21);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(PRODUCTS.dry_paddy.color, 0.8) });
    }
    // La secadora: cilindro sobre patas, con chimenea, bajo un techito de zinc.
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
      // El que voltea el arroz con el rastrillo.
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

  // Descascaradora: molino de techo de zinc, con la tolva arriba y la cascarilla que sale volando por un
  // tubo hacia un montón.
  rice_huller(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 30, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.6, 0.6, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 15, PAL.balconyBlue);
    // La tolva con arroz en cáscara.
    const t = iso(x + 2.55, y + 0.6, 30 + ctx.up);
    box(g, x + 2.4, y + 0.45, 0.3, 0.3, 22 + ctx.up, 0x6c757d);
    g.poly([t.x - 13, t.y - 6, t.x + 13, t.y - 6, t.x + 4, t.y + 10, t.x - 4, t.y + 10]).fill(0x9aa3a8).stroke(OUTLINE);
    g.ellipse(t.x, t.y - 6, 13, 4.5).fill(PRODUCTS.paddy.color).stroke(OUTLINE);
    // El montón de cascarilla.
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

  // Pulidora: casa con la máquina pulidora en el patio, que bota un polvillo blanco (el salvado).
  rice_polisher(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyYellow);
    // La pulidora: un cuerpo vertical con su motor.
    box(g, x + 2.35, y + 0.6, 0.45, 0.45, 26, 0xd0d4d8);
    box(g, x + 2.35, y + 1.15, 0.4, 0.3, 8, 0x2e6fd1);
    // Costales de arroz blanco.
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

  // Clasificadora: ramada abierta con la zaranda (bandejas que se sacuden) y los granos enteros cayendo
  // a un costal; los partidos, aparte.
  rice_sorter(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 28 + ctx.up;
    // Los costales del arroz clasificado.
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
      // Patas de la zaranda y sus tres bandejas, que se sacuden.
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

  // Empacadora de arroz: casa con la mesa donde se llenan y se sellan las bolsas de una libra.
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

  // Bultera: bodega grande con los bultos de arroz arrumados en el patio (más arrumes con los hitos).
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

  // --- Costa · El Cocal (v3.16) ---

  // Peladero de cocos: ramada de palma con el montón de cocos verdes, las cáscaras a un lado y el que pela
  // a machete.
  coconut_peeler(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    // Montón de cocos verdes, adelante.
    const pile = iso(x0 + 2.0, y0 + 1.95);
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 4);
      g.circle(pile.x + ((i % 4) - 1.5) * 7 + row * 3, pile.y - row * 5, 4.5).fill(PRODUCTS.coconut.color).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
    }
    // Cáscaras (la estopa) y un canasto de cocos pelados.
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
      // El coco en la mano y el machete que sube y baja.
      man.circle(p.x - 6, p.y - 13, 3.6).fill(PRODUCTS.coconut.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      const a = this.working ? -0.6 + Math.abs(Math.sin(time * 4)) * 1.6 : 0.6;
      const hx = p.x + 3;
      const hy = p.y - 15;
      man.moveTo(hx, hy).lineTo(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10).stroke({ width: 1.8, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Ralladora: casita de colores con la mesa donde se ralla el coco; el coco rallado se junta en una ponchera.
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

  // Prensa de coco: casa con la prensa de tornillo en el corredor; la leche escurre del trapo a un balde.
  coconut_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf2a7a0, roofColor: 0xc9a35a, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyBlue);
    // La prensa: dos postes, el travesaño y el tornillo.
    const px = x + 0.7;
    const py = y + 2.3;
    for (const dx of [0, 0.7]) box(g, px + dx, py, 0.1, 0.1, 22, PAL.woodDark);
    box(g, px - 0.05, py - 0.02, 0.85, 0.14, 3, PAL.wood, { z: 22 });
    box(g, px + 0.12, py - 0.05, 0.5, 0.2, 4, PAL.wood, { z: 4 });
    // Botellas de leche de coco.
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
      // El tornillo baja y aprieta el trapo con el coco rallado.
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

  // Paila de cocadas: kiosco de palma con la paila de cobre sobre el fogón, la pala que revuelve y la mesa
  // con las cocadas de colores (más bandejas con cada hito).
  cocada_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf6d860, roofColor: 0xc9a35a, roofH: 16 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyGreen);
    // Fogón de ladrillo con la paila.
    box(g, x + 0.4, y + 2.1, 0.8, 0.6, 8, 0xa0522d);
    const pan = iso(x + 0.8, y + 2.4, 8);
    g.ellipse(pan.x, pan.y - 2, 13, 5.5).fill(0xb87333).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y - 3, 10.5, 4).fill(0xc68a4a);
    // La mesa con las bandejas de cocadas.
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
      // La melcocha de coco que hierve y la pala que da vueltas.
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

  // --- Costa · La Ciénaga (v3.17) ---

  // Limpieza de pescado: ramada de palma con la mesa donde se le quitan las escamas; adelante, la ponchera
  // con los bocachicos recién llegados y un gallinazo esperando las tripas.
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
    // La ponchera con agua y bocachicos.
    const tub = iso(x0 + 1.9, y0 + 2.0);
    g.ellipse(tub.x, tub.y - 3, 13, 6).fill(0x2e6fd1).stroke(OUTLINE);
    g.ellipse(tub.x, tub.y - 4.5, 11, 4.5).fill(0x6fa8dc);
    for (const [dx, dy] of [[-4, -5], [3, -4], [0, -6]]) fishOn(g, tub.x + dx, tub.y + dy, 5, PRODUCTS.fish.color);
    // El gallinazo.
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
      // Las escamas que saltan.
      for (let i = 0; i < 4; i++) {
        const f = (time * 1.6 + i / 4) % 1;
        work.circle(p.x + 10 + i * 2, p.y - 13 - Math.sin(f * Math.PI) * 8, 0.9).fill({ color: 0xeceff1, alpha: 1 - f });
      }
    };
    this.animate(0);
  },

  // Saladero: el patio con los tendales de pescado salado colgado al sol, el cajón de sal y un rancho atrás.
  fish_salter(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.8, 1.0, 22, ctx, { wall: 0xb8e0a8, roofColor: 0xc9a35a, roofH: 12 });
    door(g, hx, hy, 1.0, 0.6, 15, ctx.trim);
    // El cajón de sal.
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

  // Fileteadora: casa con la mesa de filetear en el corredor; el cuchillo saca los filetes uno a uno.
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
    // Las espinas, en un balde, para el caldo.
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

  // Fritanga: kiosco de palma con el caldero de aceite en el fogón, el pescado dorándose y la mesa con los
  // platos de pescado frito con patacón.
  fish_fryer(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.6;
    const H = 24 + ctx.up;
    // Fogón y caldero.
    box(g, x0 + 0.3, y0 + 0.4, 0.7, 0.6, 7, 0xa0522d);
    const pot = iso(x0 + 0.65, y0 + 0.7, 7);
    g.ellipse(pot.x, pot.y - 3, 11, 5).fill(0x263238).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 4, 9, 3.6).fill(0xe0b84a);
    // La mesa con platos.
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

  // Cocina del pescado en coco: casa grande con el fogón de leña y las cazuelas de barro humeando; junto a
  // la puerta, las botellas de leche de coco que llegan del Cocal.
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
    // Medios cocos vacíos.
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

  // --- Costa · La Quesera (v3.18) ---

  // Cuajadera: casa blanca con la batea de madera donde la leche se vuelve cuajada; la quesera la revuelve.
  // Al lado, las cantinas de la leche del ordeño.
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
    // La batea.
    box(g, x + 0.45, y + 2.05, 1.4, 0.55, 7, PAL.wood);
    const tub = iso(x + 1.15, y + 2.32, 7);
    g.ellipse(tub.x, tub.y - 0.5, 15, 4.5).fill(0xfbfaf6);
    const stir = new Graphics();
    this.anim.addChild(stir);
    this.animate = (time) => {
      stir.clear();
      // Grumos de cuajada que se forman y la pala que revuelve.
      for (let i = 0; i < 5; i++) stir.circle(tub.x - 10 + i * 5, tub.y - 0.5 + Math.sin(i * 2) * 1.5, 1.8).fill(0xece6d6);
      const a = this.working ? time * 2 : 0;
      stir.moveTo(tub.x + Math.cos(a) * 8, tub.y + Math.sin(a) * 2).lineTo(tub.x + 6 + Math.cos(a) * 4, tub.y - 16).stroke({ width: 2, color: PAL.wood });
    };
    this.animate(0);
  },

  // Molino de cuajada: ramada con el molino de manivela atornillado a la mesa; la cuajada molida cae a la
  // batea y al lado esperan los bultos de sal.
  curd_mill(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    box(g, x0 + 0.5, y0 + 0.4, 1.4, 0.6, 9, PAL.wood);
    const tray = iso(x0 + 1.4, y0 + 0.7, 9);
    g.ellipse(tray.x, tray.y - 1, 8, 3).fill(PRODUCTS.salted_curd.color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    // Los bultos de sal, adelante.
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

  // Prensa de queso: casa con la prensa de palanca en el patio: los moldes de madera apilados, la viga
  // larga con piedras colgadas en la punta, y el suero que escurre.
  cheese_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.2;
    house(this, g, hx, hy, 1.9, 1.3, 26, ctx, { wall: 0xf6d860, roofColor: 0xc9a35a, roofH: 13 });
    door(g, hx, hy, 1.3, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, PAL.balconyRed);
    // Moldes apilados bajo la viga.
    const mx = x + 0.7;
    const my = y + 2.15;
    box(g, mx - 0.1, my - 0.05, 0.75, 0.55, 3, 0x8d6e4a);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 2); k++) box(g, mx, my, 0.55, 0.42, 5, k % 2 ? 0xa1785a : 0x8d5a32, { z: 3 + k * 5 });
    const top = 3 + (2 + Math.min(ctx.tier, 2)) * 5;
    // El poste y la viga, con las piedras.
    box(g, mx - 0.35, my + 0.15, 0.1, 0.1, top + 10, PAL.woodDark);
    const a = iso(mx - 0.3, my + 0.2, top + 6);
    const b = iso(mx + 1.6, my + 0.2, top - 2);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: PAL.wood });
    g.moveTo(b.x, b.y).lineTo(b.x, b.y + 8).stroke({ width: 1, color: 0x5d4037 });
    g.ellipse(b.x, b.y + 11, 6, 4.5).fill(0x9e9e9e).stroke(OUTLINE);
    g.ellipse(b.x + 2, b.y + 16, 5, 4).fill(0x8a8a8a).stroke(OUTLINE);
    // Los quesos ya prensados, en una tabla.
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

  // Olla del mote: kiosco de palma con la olla grande en el fogón de tres piedras, el montón de ñame y el
  // humo; la cocinera revuelve el mote.
  mote_pot(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.2;
    const d = 1.1;
    const H = 24 + ctx.up;
    // Fogón de tres piedras con la olla.
    const pot = iso(x0 + 0.9, y0 + 1.75);
    for (const [dx, dy] of [[-8, 1], [8, 1], [0, 4]]) g.ellipse(pot.x + dx, pot.y + dy, 4, 2.6).fill(0x8a8a8a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    g.moveTo(pot.x - 11, pot.y - 2).lineTo(pot.x - 12, pot.y - 16).quadraticCurveTo(pot.x, pot.y - 20, pot.x + 12, pot.y - 16).lineTo(pot.x + 11, pot.y - 2).quadraticCurveTo(pot.x, pot.y + 2, pot.x - 11, pot.y - 2).closePath().fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 16, 12, 4).fill(PRODUCTS.mote_queso.color).stroke({ width: 0.8, color: 0x263238 });
    // El ñame.
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
      // El fuego.
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

  // Fonda costeña: casa de colores con su letrero, mesas rojas en el corredor con platos de almuerzo y la
  // mesera que va y viene.
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

  // Cocina de la bandeja: casa larga con el mostrador donde se arman las bandejas y la parrilla humeando.
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

  // --- Costa · El Sombrero (v3.19) ---

  // Raspado de la caña: ramada de palma donde se raspa cada hoja; el montón de hojas verdes y la fibra
  // blanca colgada en una vara.
  fiber_scraper(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Hojas verdes, adelante a la derecha.
    const pile = iso(x0 + 2.0, y0 + 1.95);
    for (let i = 0; i < 8; i++) g.moveTo(pile.x - 12 + i * 2, pile.y - (i % 3)).lineTo(pile.x + 6 + i * 2, pile.y - 6 - (i % 3)).stroke({ width: 2, color: i % 2 ? 0x4e8f34 : 0x6fae44 });
    // La vara con la fibra blanca.
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
      // La hoja en las manos y el cuchillo que la raspa.
      work.moveTo(p.x - 10, p.y - 13).lineTo(p.x + 2, p.y - 15).stroke({ width: 2, color: 0x6fae44 });
      const k = this.working ? (Math.sin(time * 6) + 1) / 2 : 0.5;
      work.moveTo(p.x - 8 + k * 8, p.y - 18).lineTo(p.x - 7 + k * 8, p.y - 13).stroke({ width: 1.4, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Tintes de barro: la olla negra hirviendo en el fogón y la fibra teñida colgada a secar en un tendal.
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

  // Trenzadoras: casa con el corredor donde las trenzadoras, sentadas, sacan la trenza; los rollos de
  // trenza se apilan en una mesa.
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
        // Sentada en un taburete, con la trenza que le cae sobre las piernas.
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

  // Costura del sombrero: casa con la máquina de coser en el corredor; la trenza entra en vueltas y los
  // sombreros terminados se apilan.
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
      // El sombrero que se va cosiendo da vueltas bajo la aguja.
      const a = this.working ? time * 2 : 0;
      sew.ellipse(m.x - 2, m.y - 1, 7, 2.6).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      sew.moveTo(m.x - 2 + Math.cos(a) * 5, m.y - 1 + Math.sin(a) * 1.8).lineTo(m.x - 2 + Math.cos(a + Math.PI) * 5, m.y - 1 + Math.sin(a + Math.PI) * 1.8).stroke({ width: 1, color: 0x2b2b2b });
      const n = this.working ? Math.abs(Math.sin(time * 14)) * 2 : 0;
      sew.moveTo(m.x + 4, m.y - 8).lineTo(m.x + 4, m.y - 4 + n).stroke({ width: 0.8, color: 0xb0bec5 });
    };
    this.animate(0);
  },

  // Parador de Tuchín: kiosco de palma a la orilla de la carretera, con los sombreros colgados a la venta,
  // el pescado salado en una cuerda y la mesa del pescado frito para los viajeros.
  parador(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 26 + ctx.up;
    // Mesa del pescado frito.
    box(g, x0 + 1.4, y0 + 0.4, 0.8, 0.6, 8, 0xd7263d);
    for (const [px, py] of [[1.6, 0.6], [1.95, 0.75]]) {
      const p = iso(x0 + px, y0 + py, 8);
      g.ellipse(p.x, p.y, 4.6, 2.2).fill(0xffffff);
      fishOn(g, p.x - 0.5, p.y - 0.5, 3, PRODUCTS.fried_fish.color);
    }
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, 0xc9a35a, 0x9c7b3a);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    // Los sombreros colgados en el frente del kiosco (más con cada hito).
    const front = (k, n, z) => iso(x0 + 0.2 + (k * (w - 0.4)) / (n - 1), y0 + d + 0.05, z);
    const n = 3 + Math.min(ctx.tier, 3);
    for (let k = 0; k < n; k++) {
      const p = front(k, n, H - 8);
      g.ellipse(p.x, p.y, 6.5, 2.4).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y, 4.5, 1.6).stroke({ width: 1, color: 0x2b2b2b });
      g.moveTo(p.x - 3.2, p.y).quadraticCurveTo(p.x, p.y - 7, p.x + 3.2, p.y).closePath().fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.moveTo(p.x - 2.6, p.y - 2.5).lineTo(p.x + 2.6, p.y - 2.5).stroke({ width: 1, color: 0x2b2b2b });
    }
    // El letrero.
    const sign = iso(x0 + 0.5, y0 + 2.2);
    g.rect(sign.x - 1, sign.y - 22, 2, 22).fill(PAL.woodDark);
    g.roundRect(sign.x - 13, sign.y - 30, 26, 9, 2).fill(0xf6d860).stroke(OUTLINE);
    const salt = new Graphics();
    this.anim.addChild(salt);
    this.animate = (time) => {
      salt.clear();
      // El pescado salado en la cuerda, entre el kiosco y el letrero.
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

  // --- Costa · Cartagena (v3.20): casas coloniales de colores, murallas de piedra coralina y el mar ---

  // Restaurante de la muralla: un tramo de la muralla con sus garitas y, encima, las mesas con mantel y
  // velas para la cena (más mesas con cada hito).
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
    // Las almenas del borde de adelante.
    for (let k = 0; k < 6; k++) box(g, x0 + 0.1 + k * 0.45, y0 + d - 0.15, 0.25, 0.15, 4, 0xcdbb94, { z: H });
    // La garita de la esquina.
    box(g, x0 + w - 0.45, y0 - 0.1, 0.45, 0.45, 12, 0xd9c9a8, { z: H });
    const cap = iso(x0 + w - 0.22, y0 + 0.12, H + 12);
    g.moveTo(cap.x - 9, cap.y).quadraticCurveTo(cap.x, cap.y - 14, cap.x + 9, cap.y).closePath().fill(0xcdbb94).stroke(OUTLINE);
    // Escalera de subida.
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

  // Hotel colonial: casona de dos pisos, rosada, con el balcón de madera corrido y bugambilias que cuelgan.
  hotel_colonial(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const up = Math.max(ctx.up, UPPER_FLOOR);
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up }, { wall: 0xf28c9a, roofH: 15 });
    door(g, hx, hy, 1.6, 0.7, 17, 0x2f7d4f);
    door(g, hx, hy, 1.6, 1.6, 17, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, 0x7a4a22);
    // El balcón de madera del segundo piso, por todo el frente.
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

  // Cocina de la bahía: casa azul frente al mar con la cazuela en el fogón y la mesa de los platos.
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

  // Loncheras del paseo: casa amarilla con las neveras de icopor apiladas y la que se está llenando.
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
      // Los hielos y las gaseosas que caen en la nevera abierta.
      const p = iso(x + 0.75, y + 2.4);
      fill.rect(p.x - 7, p.y - 7, 14, 7).fill(0xfbfaf6).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
      fill.ellipse(p.x, p.y - 7, 7, 2.2).fill(0x81d4fa);
      if (!this.working) return;
      const f = (time * 0.8) % 1;
      fill.rect(p.x - 1, p.y - 22 + f * 14, 2.4, 5).fill([0xd7263d, 0x2fa36b][Math.floor(time * 0.8) % 2]);
    };
    this.animate(0);
  },

  // Muelle de las lanchas: el agua de la bahía, el muelle de madera y las lanchas que salen con los turistas
  // hacia las islas.
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
      // Una amarrada al muelle y otra que sale.
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

  // --- Boyacá · El Papal (v3.22): casas blancas de tapia con zócalo verde y teja de barro ---

  // Lavadero de papa: el tanque de agua donde se lava la papa, la banda que la saca y los bultos de tierra.
  potato_washer(g, x, y, ctx) {
    const tx = x + 0.3;
    const ty = y + 0.4;
    box(g, tx, ty, 1.5, 1.1, 10, 0x9aa3a8);
    g.poly(isoPoly([[tx + 0.1, ty + 0.1, 10], [tx + 1.4, ty + 0.1, 10], [tx + 1.4, ty + 1.0, 10], [tx + 0.1, ty + 1.0, 10]])).fill(0x6fa8dc);
    // La banda inclinada que saca la papa lavada.
    const a = iso(tx + 1.5, ty + 0.55, 8);
    const b = iso(tx + 2.6, ty + 0.55, 18);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 7, color: 0x37474f });
    box(g, tx + 2.4, ty + 0.3, 0.1, 0.1, 18, PAL.woodDark);
    // Bultos de papa con tierra esperando.
    for (const [bx, by] of [[0.5, 2.3], [0.85, 2.45], [1.2, 2.3]]) {
      const p = iso(x + bx, y + by);
      g.ellipse(p.x, p.y - 5, 7, 5.5).fill(0xc8a26a).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 9, 3.5, 1.6).fill(PRODUCTS.potato.color);
    }
    const water = new Graphics();
    this.anim.addChild(water);
    this.animate = (time) => {
      water.clear();
      // Papas que suben por la banda y gotas que salpican.
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

  // Seleccionadora: ramada con la mesa de escoger; la papa gruesa, la pareja y la menuda en tres bultos.
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
      // La ruana sobre los hombros.
      work.poly([p.x - 5, p.y - 17, p.x + 5, p.y - 17, p.x + 6, p.y - 11, p.x - 6, p.y - 11]).fill(0x8d6e63);
      if (!this.working) return;
      const f = (time * 1.2) % 1;
      work.circle(p.x + 4 + f * 8, p.y - 14 + f * 10, 2).fill(PRODUCTS.graded_potato.color);
    };
    this.animate(0);
  },

  // Peladora de papa: casa blanca con zócalo verde; en el corredor, el tambor de la peladora que gira y
  // bota las cáscaras.
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

  // Freidora: casa con la freidora grande en el corredor; las papitas criollas se doran en el aceite.
  criollas_fryer(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.1;
    const H = 26 + ctx.up;
    box(g, x0 + 0.4, y0 + 0.5, 1.2, 0.8, 12, 0x9aa3a8);
    const vat = iso(x0 + 1.0, y0 + 0.9, 12);
    g.ellipse(vat.x, vat.y, 14, 6).fill(0xd9a30a).stroke(OUTLINE);
    // Canastos con las papitas listas.
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

  // Empacadora de papitas: casa con la mesa donde las bolsas amarillas se llenan y se sellan.
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

  // Cajonera: bodega con las cajas de papitas arrumadas en el patio (más arrumes con los hitos).
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

  // Maltería: el piso de germinación con la cebada extendida que alguien voltea, y el horno de secado con
  // su chimenea.
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
    // El horno: una casita de ladrillo con chimenea.
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

  // Paila de cocción: casa con la olla grande de cobre en el corredor, echando vapor, y los costales de malta.
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

  // Tanques de fermentación: los tanques de acero en fila, con sus escaleras y las burbujas del termómetro.
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

  // Embotelladora: casa con la banda de botellas que se llenan y, al lado, las canastas rojas apiladas.
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

  // --- Boyacá · Ráquira (v3.24): casas de colores vivos, con ollas y caballitos en las puertas ---

  // Amasado del barro: ramada de teja donde alguien pisa el barro en la poza; el barro listo en bolas.
  clay_kneader(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Las bolas de barro, adelante a la derecha.
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
      // La persona pisando: sube un pie y luego el otro.
      const step = this.working ? Math.sin(time * 6) * 2 : 0;
      work.rect(pool.x - 2.2, pool.y - 9 - Math.max(0, step), 1.8, 9).fill(0x8d5524);
      work.rect(pool.x + 0.4, pool.y - 9 - Math.max(0, -step), 1.8, 9).fill(0x8d5524);
      work.roundRect(pool.x - 3.2, pool.y - 18, 6.4, 9.5, 2).fill(0xf28c9a);
      work.circle(pool.x, pool.y - 20.5, 2.8).fill(0x8d5524);
      work.ellipse(pool.x, pool.y - 22.5, 5.5, 1.5).fill(0x3e2723);
    };
    this.animate(0);
  },

  // Ollas de barro: casa amarilla con las ollas negras secándose en fila sobre una tabla (más con los hitos).
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

  // Torno: casa azul con el alfarero en el torno; la pieza sube mientras la rueda gira.
  potter_wheel(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0x9ad0ec, roofH: 14 });
    door(g, hx, hy, 1.5, 0.7, 16, 0xd7263d);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 14, 0xd7263d);
    // Piezas crudas secándose.
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
      // El alfarero, sentado detrás.
      spin.roundRect(wheel.x + 8, wheel.y - 18, 6.4, 9, 2).fill(0x2fa36b);
      spin.circle(wheel.x + 11.2, wheel.y - 21, 2.8).fill(0x8d5524);
      spin.moveTo(wheel.x + 8, wheel.y - 14).lineTo(wheel.x + 3, wheel.y - 11 - grow * 4).stroke({ width: 1.4, color: 0x8d5524 });
    };
    this.animate(0);
  },

  // Horno de leña: el horno de ladrillo en forma de cúpula con la boca encendida y el humo; al lado, las
  // materas ya pintadas.
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

  // Jarras: casa rosada con la mesa de las jarras de barro y el barril de la cerveza que llega de la
  // Cervecería; la jarra que se llena echa espuma.
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
    // El barril.
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

  // Cuajadera de Paipa: casa blanca con zócalo verde y la tina de cuajar en el corredor, con las cantinas.
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

  // Moldes de queso: ramada con la mesa de los aros de madera y las tablas que prensan, y el suero.
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

  // Cava de maduración: casa de piedra con las ruedas de queso en repisas, que se doran con los hitos.
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

  // Horno de almojábanas: casa amarilla con el horno de ladrillo en el corredor y las latas de almojábanas.
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

  // Mesa del piquete: casa con las mesas largas afuera y las bandejas del piquete; la gente come.
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

  // Horno de barro: el horno de cúpula de barro en el patio, con la boca encendida, la mesa de amasar y las
  // canastas de amasijos.
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

  // Lavado de lana: la pila de piedra con agua de la quebrada; la lana se lava y se tiende en la cerca.
  wool_washer(g, x, y, ctx) {
    const tx = x + 0.3;
    const ty = y + 0.4;
    box(g, tx, ty, 1.5, 1.0, 9, 0xa39b8c);
    g.poly(isoPoly([[tx + 0.1, ty + 0.1, 9], [tx + 1.4, ty + 0.1, 9], [tx + 1.4, ty + 0.9, 9], [tx + 0.1, ty + 0.9, 9]])).fill(0x6fa8dc);
    // La cerca con la lana tendida.
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

  // Cardado: casa con el corredor donde se peina la lana con las cardas; los copos se juntan en un canasto.
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
      // Sentada en un banco, con una carda en cada mano.
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

  // Hilado en rueca: casa azul con la rueca de madera girando en el corredor y las madejas colgadas.
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
      // La hilandera, sentada.
      spin.roundRect(wheel.x + 10, wheel.y - 14, 6.4, 9, 2).fill(0x2fa36b);
      spin.circle(wheel.x + 13.2, wheel.y - 17, 2.8).fill(0x8d5524);
      spin.ellipse(wheel.x + 13.2, wheel.y - 19.5, 5, 1.4).fill(0x3e2723);
    };
    this.animate(0);
  },

  // Telar de ruanas: ramada con el telar grande de madera; la ruana crece con franjas de colores.
  ruana_loom(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 2.0;
    const H = 26 + ctx.up;
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 13, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 13);
    // Ruanas dobladas en una mesa, adelante.
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

  // Tienda de Nobsa: el puesto a la orilla de la carretera con las ruanas colgadas y las ollas y materas de
  // Ráquira en el mostrador.
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

  // --- Boyacá · Villa de Leyva (v3.27): casonas blancas de balcones verdes y calles empedradas ---

  // Terraza de la plaza: casona blanca con parasoles rojos afuera; en las mesas, cervezas y papitas.
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

  // Hospedaje colonial: casona blanca de dos pisos, con el balcón corrido de madera verde y geranios.
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

  // Mercado del sábado: toldos de lona con frutas, verduras, ollas y jarras; la gente comprando.
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

  // Canastos del paseo: casa con los canastos y fiambres envueltos en hoja, listos para el paseo.
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

  // Salida al Fósil: el camino de piedra hacia el campo, con el letrero y la roca con el kronosaurio; salen
  // caminantes en ruana.
  salida_fosil(g, x, y, ctx) {
    for (let k = 0; k < 9; k++) {
      const p = iso(x + 0.6 + k * 0.28, y + 1.5 + Math.sin(k) * 0.15);
      g.ellipse(p.x, p.y, 8, 4).fill(k % 2 ? 0x9a948a : 0xb9b2a5).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.3 });
    }
    // La roca con el fósil.
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

  // --- Los Llanos · La Palma (v3.31): la planta extractora, con naves de techo de zinc ---

  // Desgranadora: la ramada de zinc con el tambor que gira y suelta el fruto de los racimos; al lado, el
  // montón de racimos que llegan y el de tusas (los racimos vacíos).
  bunch_thresher(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 2.4;
    const d = 1.5;
    const H = 26 + ctx.up;
    // Montón de racimos rojos y el de tusas.
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

  // Esterilizador: el autoclave, un cilindro de acero acostado, con la vagoneta de fruto sobre los rieles y el
  // vapor que se escapa.
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
    // Rieles hacia la boca del autoclave.
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

  // Prensa de aceite: la nave de zinc con la prensa de tornillo; el aceite crudo, rojo, corre por la canal a
  // los tambores.
  palm_press(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 1.9, 1.5, 26, ctx, { wall: 0xe8e2d0, roofColor: 0x9aa3a8, roofH: 12 });
    door(g, hx, hy, 1.5, 0.7, 16, 0x8d6e4a);
    windowOnRight(this, g, hx, hy, 1.9, 0.75, 13, 0xffe0b2);
    // La canal y los tambores de aceite crudo.
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

  // Clarificador: los tanques donde el aceite se asienta; por la mirilla se ve el aceite anaranjado que sube.
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

  // Envasadora: la nave con la banda donde las botellas se llenan de aceite y se tapan.
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

  // Cajonera de aceite: la bodega con las cajas de aceite arrumadas en el patio (más arrumes con los hitos).
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

  // --- Los Llanos · El Frutal (v3.32): casas de bahareque blanco con techo de zinc ---

  // Despulpadora de maracuyá: la ramada con la máquina que parte la fruta y bota las cáscaras; las canastas de
  // maracuyá esperan al lado.
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

  // Pasteurizadora de pulpa: la casa con la marmita de acero donde la pulpa se calienta, echando vapor.
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
    // Las bolsas de pulpa en la nevera de icopor.
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

  // Mezcladora de jugos: los tanques de acero con el jugo amarillo que gira, y las jarras listas en la mesa.
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

  // Envasadora de jugos: la nave con la banda de cajitas verdes y, al lado, las cajas arrumadas.
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

  // --- Los Llanos · La Cachamera (v3.33) ---

  // Limpieza de cachama: la ramada con la mesa de lavar, la manguera y las cachamas que se escaman.
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

  // Pisillera: la casa con el fogón y el caldero donde la cachama se desmecha y se sofríe.
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

  // Fileteadora de cachama: la ramada con la mesa larga donde se sacan los filetes.
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

  // Ahumadero: la casita de bahareque con las cachamas colgadas y el humo que sale por el techo.
  cachama_smoker(g, x, y, ctx) {
    const hx = x + 0.4;
    const hy = y + 0.4;
    house(this, g, hx, hy, 1.6, 1.3, 22, ctx, { wall: 0xc9a77a, plinth: false, roofColor: 0x8d6e4a, roofH: 12 });
    door(g, hx, hy, 1.3, 0.6, 14, 0x5d4037);
    // La vara con cachamas al aire, al lado.
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

  // Cocina de la cachama: la cocina con el asador de leña, las cachamas en la parrilla y la olla de la salsa de
  // maracuyá; el jugo llega del Frutal en garrafas.
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

  // --- Los Llanos · El Hato llanero (v3.34): caneyes con techo de palma y casas de zinc ---

  // Desposte: la casa blanca de techo de zinc y, al lado, la ramada con las presas de ternera colgadas.
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

  // Adobadero: la ramada con las bateas de madera donde la carne se cubre de sal gruesa, y los bultos de sal.
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

  // Asador de vara: la candela en el suelo y las varas clavadas alrededor con la mamona; el asador la cuida.
  vara_grill(g, x, y, ctx) {
    const c = iso(x + 1.5, y + 1.5);
    g.ellipse(c.x, c.y, 26, 12).fill(0x5d4632).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
    g.ellipse(c.x, c.y, 16, 7).fill(0x3a2a1e);
    // Bancos de troncos.
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

  // Trinchadora: el caney con techo de palma, la mesa grande y el que trincha la carne a la llanera.
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

  // Mesa del almuerzo llanero: el caney grande con la mesa larga y la gente almorzando; la olla de la yuca
  // frita en el aceite de la Palma.
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

  // Asadero de la parranda: el asado grande con la carne y la cachama en las varas; el arpista toca y una pareja
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
    // El arpa.
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
      // La pareja del joropo: zapatean y giran.
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

  // --- Los Llanos · La Talabartería (v3.35) ---

  // Curtiembre: las pozas de curtido con el agua de tanino y los cueros que se escurren colgados.
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

  // Cortadora de cuero: la ramada con la mesa grande, el cuero extendido y las piezas que salen del molde.
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

  // Repujado: la casa del artesano; en el corredor, el banco donde golpea el buril sobre el cuero.
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

  // Taller de sillas: la casa del talabartero con las sillas de montar en el burro de madera, afuera.
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

  // Tienda llanera: la tienda de la carretera con las sillas, los sombreros y las cotizas colgadas, el pisillo
  // y la cachama ahumada en el mostrador.
  tienda_llanera(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.5, 28, ctx, { wall: 0xf7f4ee, roofColor: PAL.roof, roofH: 14 });
    door(g, hx, hy, 1.5, 1.6, 18, 0xd7263d);
    windowOnRight(this, g, hx, hy, 2.3, 0.75, 14, 0xfff8e1);
    // Alero con lo que se vende colgado.
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

  // --- Los Llanos · Villavicencio (v3.36): casas de colores, kioscos de palma y el camino a Caño Cristales ---

  // Kiosco del parque: el kiosco redondo con techo de palma; en las mesas, jugos y empanadas.
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

  // Hotel campestre: la casa larga de un piso, techo de teja, la piscina y las palmas.
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

  // Plaza de mercado: la nave abierta con techo de zinc, los puestos de frutas y de pescado, y la gente.
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

  // Morrales del viaje: la casa de colores con los morrales, los sombreros y los termos listos en el corredor.
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

  // Salida a Caño Cristales: el caño de colores (rojo, amarillo y verde) entre las piedras, el letrero y los
  // viajeros que salen con morral y sombrero.
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

  // --- Costa Pacífica · El Platanal (v3.38): casas de tabla sobre pilotes, pintadas de colores, con techo de zinc ---

  // Desmanadora: la ramada donde cuelgan los racimos del cable; el platanero corta las manos con el machete y
  // caen a la tina de agua.
  plantain_dehander(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.35;
    const w = 2.3;
    const d = 1.5;
    const H = 30 + ctx.up;
    // El cable de donde cuelgan los racimos.
    const c0 = iso(x0 - 0.2, y0 + d / 2, H - 4);
    const c1 = iso(x0 + w + 0.2, y0 + d / 2, H - 4);
    // La tina con agua y las manos de plátano.
    box(g, x0 + 1.2, y0 + 0.9, 1.0, 0.55, 7, 0x8d6e4a);
    const tub = iso(x0 + 1.7, y0 + 1.17, 7);
    g.ellipse(tub.x, tub.y, 13, 4).fill(0x4fa3c7);
    for (let k = 0; k < 3; k++) g.ellipse(tub.x - 6 + k * 6, tub.y - 1, 3.5, 1.8).fill(PRODUCTS.plantain_hand.color).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    // Racimos que esperan en el suelo.
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

  // Tanque de lavado: los tanques largos de cemento, bajo el zinc, donde las manos de plátano flotan y se les
  // va la leche; al final, la canastilla donde salen lavadas.
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

  // Peladora: la casa de tablas sobre pilotes (azul turquesa); al lado, la mesa donde pelan el plátano a
  // cuchillo, el montón de cáscaras verdes y el balde de plátano pelado.
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

  // Fritanga de patacones: la cocina abierta con el fogón de leña y la paila de aceite; la tabla donde se aplasta
  // el plátano y la batea con los patacones dorados.
  patacon_fryer(g, x, y, ctx) {
    const x0 = x + 0.35;
    const y0 = y + 0.3;
    // Fogón de barro con la paila.
    box(g, x0 + 0.3, y0 + 0.6, 1.2, 0.8, 10, 0xa1887f);
    const pan = iso(x0 + 0.9, y0 + 1.0, 10);
    g.ellipse(pan.x, pan.y, 15, 6).fill(0x37474f).stroke(OUTLINE);
    g.ellipse(pan.x, pan.y, 12, 4.5).fill(0xc98a24);
    const fire = iso(x0 + 0.9, y0 + 1.42, 3);
    g.ellipse(fire.x, fire.y, 5, 2.5).fill(0x212121);
    // La tabla de aplastar y la batea de patacones.
    box(g, x0 + 1.75, y0 + 0.75, 0.75, 0.6, 9, 0x8d6e4a);
    const tray = iso(x0 + 2.12, y0 + 1.05, 9);
    g.ellipse(tray.x, tray.y, 10, 4).fill(0x6d4c41);
    for (let k = 0; k < 2 + Math.min(ctx.tier, 3); k++) g.ellipse(tray.x - 6 + (k % 3) * 6, tray.y - 1 - Math.floor(k / 3) * 2, 3.2, 1.6).fill(PRODUCTS.patacon.color).stroke({ width: 0.4, color: 0x3a2418, alpha: 0.5 });
    // Leña.
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

  // Empacadora: la casa de tablas sobre pilotes (amarilla); abajo, la banda donde los patacones caen en las
  // bolsas y las bolsas se sellan.
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

  // Cajonera de patacones: la bodega grande sobre pilotes (verde), con las cajas arrumadas y el cargador que las
  // lleva al patio.
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

  // --- Costa Pacífica · La Azotea (v3.39): la cocina del Pacífico, en casas de tabla sobre pilotes ---

  // Lavadero de hierbas: la ramada con la batea de madera llena de agua; la cocinera lava los manojos y los
  // pone a escurrir en la canasta.
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

  // Pilón: el pilón de madera bajo el alero de la casa (rosada), con dos cocineras que machacan por turnos con
  // la mano de pilón; al lado, el ajo y la cebolla.
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

  // Olla del refrito: la cocina de tablas sobre pilotes (azul), con su fogón de leña en el corredor; la olla
  // grande sofríe el aliño y el humo sale por el techo.
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

  // Envasadora de aliño: la casa grande sobre pilotes (verde y amarilla); abajo, la mesa donde el aliño cae en
  // los frascos, se tapan y se guardan en las cajas.
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

  // --- Costa Pacífica · La Bahía (v3.40): la playa de los pescadores ---

  // Limpieza de pargo: la ramada en la playa con la mesa de tablas; el pescador escama el pargo, los
  // baldes con agua de mar y los alcatraces que esperan su parte.
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

  // Secadero: los tendales al sol, con los pescados abiertos y salados colgando de las cuerdas, y los costales
  // de sal.
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

  // Fileteadora de pargo: la casa de tablas sobre pilotes (blanca y azul), con la mesa del corredor donde se
  // sacan los filetes; los filetes pasan al Ahumadero de al lado.
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

  // Ahumadero de pargo: el fogón alto de barro con la parrilla de varas, los pargos abiertos encima y el humo
  // de leña; al lado, la leña.
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

  // Cocina del tapao: la cocina de tablas sobre pilotes (naranja), con el fogón en el corredor y la olla del
  // tapao tapada con hojas de plátano; el aliño llega de la Azotea.
  tapao_kitchen(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    stiltHouse(this, g, hx, hy, 2.0, 1.3, 22, ctx, { wall: 0xf08a3c, trim: 0x2e7d32 });
    box(g, x + 1.6, y + 2.0, 1.0, 0.7, 10, 0xa1887f);
    const pot = iso(x + 2.1, y + 2.35, 10);
    g.moveTo(pot.x - 10, pot.y - 12).lineTo(pot.x - 9, pot.y).quadraticCurveTo(pot.x, pot.y + 4, pot.x + 9, pot.y).lineTo(pot.x + 10, pot.y - 12).closePath().fill(0x546e7a).stroke(OUTLINE);
    g.ellipse(pot.x, pot.y - 13, 12, 4).fill(0x2e7d32).stroke(OUTLINE);
    g.moveTo(pot.x - 10, pot.y - 13).lineTo(pot.x + 10, pot.y - 13).stroke({ width: 0.8, color: 0x66bb6a });
    // Racimo de plátano verde y los frascos de aliño en la mesa.
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

  // --- Costa Pacífica · El Manglar (v3.41): la cocina de la piangua, a la orilla del estero ---

  // Lavadero de piangua: la ramada con el potrillo (la canoa vieja) lleno de agua, donde se lavan las catangas de
  // piangua; al lado, las catangas que esperan.
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

  // Olla de la piangua: el fogón de leña bajo la ramada con la olla grande donde hierve la piangua hasta que se
  // abre; el vapor sube y la leña espera al lado.
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

  // Desconchadora: la casa de tablas sobre pilotes (amarilla), con la mesa del corredor donde se abren las
  // pianguas con la cuchara; el montón de conchas vacías crece con los hitos.
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

  // Olla del encocado: la cocina sobre pilotes (rosada), con el montón de cocos, el rallo y la olla donde la
  // piangua se cocina en leche de coco.
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

  // Mesa del arroz con piangua: el restaurante de tablas sobre pilotes (azul), con las mesas del corredor bajo
  // el alero, los platos servidos y la mesera que va y viene.
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

  // Cocina de la cazuela: la cocina grande sobre pilotes (verde), con las cazuelas de barro hirviendo en el fogón
  // del corredor y las servidas en la mesa.
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

  // --- Costa Pacífica · El Werregue (v3.42): los tambos wounaan del río San Juan ---

  // Desfibradora de werregue: la ramada donde se abren los cogollos y se sacan las tiras; los manojos de fibra
  // cuelgan de la vara.
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

  // Tintorería: el fogón con las dos ollas (la negra de jagua y la roja de achiote) y las madejas de fibra
  // teñida colgadas a secar.
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
    // Las cuerdas con las madejas.
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

  // Torcedora: el tambo pequeño donde la tejedora tuerce la fibra sobre el muslo; los rollos de hebra se apilan.
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

  // Tejedoras: el tambo grande donde las tejedoras wounaan tejen los jarrones; los jarrones terminados
  // esperan en el piso.
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

  // Tienda de artesanías: la casa de tablas sobre pilotes (turquesa) con los jarrones en los estantes del
  // corredor, el letrero y los visitantes que compran.
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

  // --- Costa Pacífica · Buenaventura (v3.43): el puerto, con sus casas de colores y techos de zinc ---

  // Cevichería del malecón: el kiosco con techo de zinc y la nevera de icopor; las copas de ceviche en el
  // mostrador y los clientes en las butacas.
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

  // Hotel de la bahía: el hotel de tres pisos, de ladrillo pintado de rosado, con balcones y techo de zinc; de
  // noche se prenden las ventanas.
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

  // Galería de Pueblo Nuevo: la plaza de mercado techada, con los puestos de pescado, piangua, plátano y
  // chontaduro, y las vendedoras bajo los toldos.
  galeria_pueblo_nuevo(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const stalls = [[0.2, 0.3, 0x5c8dd6], [1.3, 0.3, 0xe5737f], [0.2, 1.4, 0x6cbf6c], [1.3, 1.4, 0xf2c14e]];
    const goods = [PRODUCTS.pargo.color, PRODUCTS.piangua.color, 0x7cb342, 0xe65100];
    // Cada puesto con su vendedora (de atrás hacia adelante, para que los toldos de adelante tapen a las de atrás).
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

  // Loncheras de la lancha: la bodeguita del muelle donde se arman las loncheras, con los chalecos salvavidas
  // colgados y las neveras listas.
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

  // Salida a las ballenas: el muelle de tablas sobre el mar, con las lanchas que salen llenas de turistas con
  // chaleco naranja; a lo lejos, una ballena salta.
  salida_ballenas(g, x, y, ctx) {
    // El mar.
    g.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill(0x2f86a8);
    for (let k = 0; k < 8; k++) {
      const q = iso(x + 0.3 + (k % 4) * 0.7, y + 0.4 + Math.floor(k / 4) * 1.6);
      g.moveTo(q.x - 6, q.y).quadraticCurveTo(q.x, q.y - 2, q.x + 6, q.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.6 });
    }
    // El muelle.
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
      // La ballena que salta, de vez en cuando.
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

  // --- Santander · El Tabacal (v3.1) ---

  // Caney de curado: rancho alto y abierto donde la hoja cuelga en varas; abajo, verde, y arriba, ya dorada.
  caney(g, x, y, ctx) {
    const x0 = x + 0.25;
    const y0 = y + 0.25;
    const w = 2.5;
    const d = 2.3;
    const H = 40 + ctx.up;
    for (const [px, py] of [[0, 0], [w, 0], [0, d]]) box(g, x0 + px - 0.06, y0 + py - 0.06, 0.12, 0.12, H, PAL.wood);
    // Varas con las hojas colgadas, de atrás hacia adelante (las de adelante se mecen, ver animate).
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
    // Atados de hoja verde esperando en el piso.
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

  // Despalilladora: casa con una mesa en el corredor donde se le quita la vena a cada hoja curada.
  stripper(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Mesa con hojas curadas y, al lado, el montón de palillos (las venas).
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
      // La vena sale de la hoja y vuela al montón.
      const f = (time * 0.9) % 1;
      const a = iso(x + 1.6, y + 2.35, 12);
      const px = a.x + (pile.x - a.x) * f;
      const py = a.y + (pile.y - 6 - a.y) * f - Math.sin(f * Math.PI) * 10;
      hands.moveTo(px - 4, py + 1).lineTo(px + 4, py - 1).stroke({ width: 1.6, color: 0xd9a26b });
    };
    this.animate(0);
  },

  // Pilones de fermentación: bodega abierta con las hojas apiladas en montones que se calientan solos.
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
      // Termómetro clavado en el pilón.
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

  // Torcedores: casa del pueblo con la mesa de torcer en el corredor, tabacos en fila y cajas de cedro.
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
    // Cajas de cedro apiladas, listas para la bodega.
    const stack = [[2.3, 2.2, 0], [2.65, 2.2, 0], [2.48, 2.2, 6], [2.48, 2.55, 0]];
    for (const [bx, by, z] of stack.slice(0, 2 + Math.min(ctx.tier, 2))) {
      box(g, x + bx - 0.15, y + by - 0.12, 0.3, 0.24, 6, 0xa0522d, { z });
    }
    const roll = new Graphics();
    this.anim.addChild(roll);
    this.animate = (time) => {
      roll.clear();
      // El tabaco que se está torciendo rueda sobre la mesa; un hilito de humo sale del de muestra.
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

  // Desfibradora: ramada con la máquina que raspa las pencas, el montón de pencas y el tendal donde
  // se seca la fibra al sol.
  decorticator(g, x, y, ctx) {
    const x0 = x + 0.3;
    const y0 = y + 0.3;
    const w = 1.5;
    const d = 1.4;
    const H = 24 + ctx.up;
    // Pencas recién cortadas.
    const pile = iso(x + 0.5, y + 2.0);
    for (let i = 0; i < 7; i++) {
      const dx = (i % 4) * 4 - 6;
      const dy = -Math.floor(i / 4) * 3;
      g.poly([pile.x + dx - 9, pile.y + dy, pile.x + dx + 9, pile.y + dy - 4, pile.x + dx + 9, pile.y + dy - 1, pile.x + dx - 9, pile.y + dy + 3]).fill(i % 2 ? 0x6f9a7a : 0x5d8a6a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
    }
    // La máquina bajo la ramada.
    box(g, x0 + 0.35, y0 + 0.4, 0.8, 0.6, 12, 0x6c757d);
    const wheel = iso(x0 + 1.15, y0 + 0.7, 12);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, PAL.wood);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
    // Tendal: dos varas con la fibra colgada, clara y brillante.
    // (al frente: atrás y a la derecha lo taparían la Hiladora y la Alpargatería)
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

  // Telar de costales: casa con el telar en el corredor (la tela de cabuya crece) y costales apilados.
  sack_loom(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.2, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.2, 0.8, 14, PAL.balconyYellow);
    // Telar: marco de madera con la tela.
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

  // Hiladora: casa con una rueda de hilar en el corredor; el hilo va a un ovillo de cabuya.
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

  // Alpargatería: taller con la mesa de coser y pares de alpargatas colgados a la venta.
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
    // Pares colgados de una cuerda frente a la casa.
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

  // Empacadora de tercios: bodega con la prensa que arma las pacas y los tercios apilados.
  tercio_packer(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.5, 30, ctx, { wall: 0xf6e7c8, roofH: 14 });
    door(g, hx, hy, 1.5, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.75, 14, 0xffffff);
    // Prensa: dos postes y una viga.
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

  // Fama (carnicería): casa con toldo de rayas y la carne colgada de los ganchos en la ventana.
  butcher(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.6, 28, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 0.6, 16, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.0, 0.8, 14, PAL.balconyYellow);
    // Toldo de rayas rojas y blancas sobre el mostrador.
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

  // Saladero: ramada con bateas de madera donde se adoba la carne y bultos de sal.
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
    // Bultos de sal junto a la ramada.
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

  // Tendedero de oreo: varas altas al sol con las tiras de carne colgadas, meciéndose con el viento.
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
    // Una batea con más carne adobada esperando.
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

  // Asadero: parrilla de ladrillo con la carne sobre las brasas, el humo y una ramada para el asador.
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

  // Mesa del almuerzo: fonda del camino con mesas de mantel a cuadros en el corredor.
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

  // Fiambrería: casa con la mesa donde se envuelven los fiambres en hoja de bijao y se amarran con cabuya.
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
    // Hojas de bijao frescas, en un atado junto a la puerta.
    const bundle = iso(x + 2.5, y + 2.5);
    for (let k = 0; k < 4; k++) g.ellipse(bundle.x + (k - 1.5) * 2.5, bundle.y - 9, 3, 9).fill(k % 2 ? 0x8db33a : 0x6b8e23).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
  },

  // --- Santander · Las Hormigas (v3.4) ---

  // Mesa de limpieza: ramada con una mesa larga donde se les quitan las alas y las patas a las hormigas.
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
    // Canastos: uno con las hormigas que llegan y otro con las limpias.
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
      // Las alas que se quitan, volando al piso.
      for (let i = 0; i < 4; i++) {
        const f = (time * 0.7 + i / 4) % 1;
        const a = ants[(i * 2) % ants.length];
        wings.ellipse(a.x + f * 10 - 5, a.y + f * 16, 2.5, 1).fill({ color: 0xe3f2fd, alpha: 0.9 * (1 - f) });
      }
    };
  },

  // Ollas de salmuera: ollas de barro con agua de sal en un corredor techado.
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
    // Bulto de sal.
    const salt = iso(x + 2.6, y + 2.5);
    g.roundRect(salt.x - 6, salt.y - 11, 12, 11, 3).fill(0xf4f1e8).stroke(OUTLINE);
    g.rect(salt.x - 6, salt.y - 7, 12, 2).fill(0x2e6fd1);
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, H, ctx.trim);
    gableRoof(g, x0, y0, w, d, H, 12, PAL.roof, PAL.wall);
    this.roofTop = iso(x0 + w / 2, y0 + d / 2, H + 12);
  },

  // Tiesto de barro: fogón de leña con los tiestos donde se tuestan las hormigas, revolviendo.
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
    // Leña.
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

  // Mesa de cucuruchos: puesto con toldo donde se llenan los cucuruchos de papel.
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
    // Toldo de rayas.
    for (let i = 0; i < 6; i++) {
      const a = iso(x + 0.9 + i * 0.24, y + 2.1, 22);
      const b = iso(x + 1.14 + i * 0.24, y + 2.1, 22);
      g.poly([a.x, a.y, b.x, b.y, b.x, b.y + 6, a.x, a.y + 6]).fill(i % 2 ? 0xffffff : 0x2fa36b).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
    }
  },

  // Tienda de recuerdos: tienda de la plaza con costales, alpargatas colgadas y cucuruchos de hormigas.
  souvenir_shop(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.4, 1.6, 30, ctx, { wall: 0xf4efe6, roofH: 14 });
    door(g, hx, hy, 1.6, 1.8, 18, ctx.trim);
    windowOnRight(this, g, hx, hy, 2.4, 0.8, 14, PAL.balconyYellow);
    // Costales de fique llenos frente a la tienda.
    for (const [bx, by] of [[0.45, 2.35], [0.7, 2.6]]) {
      const p = iso(x + bx, y + by);
      g.roundRect(p.x - 6, p.y - 13, 12, 13, 3).fill(PRODUCTS.fique_sack.color).stroke(OUTLINE);
      g.rect(p.x - 2, p.y - 16, 4, 4).fill(0x8b5a2b);
    }
    // Alpargatas colgadas en la puerta.
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
    // Mostrador con cucuruchos.
    box(g, x + 1.4, y + 2.25, 1.1, 0.35, 8, PAL.wood);
    for (let i = 0; i < 4; i++) {
      const p = iso(x + 1.5 + i * 0.25, y + 2.42, 8);
      g.poly([p.x - 2.5, p.y - 8, p.x + 2.5, p.y - 8, p.x, p.y]).fill(0xf4efe6).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
      g.ellipse(p.x, p.y - 8.5, 2.5, 1.2).fill(PRODUCTS.toasted_ants.color);
    }
  },

  // --- Santander · Barichara (v3.5): casas de tapia blanca, puertas verdes y piedra amarilla ---

  // Café del parque: mesas con parasol delante de la casa; de los tabacos sale un hilito de humo.
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

  // Posada: casona de dos pisos con balcón de madera y matas de flores, y el patio para los huéspedes.
  posada(g, x, y, ctx) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    house(this, g, hx, hy, 2.3, 1.6, 30, { ...ctx, up: Math.max(ctx.up, UPPER_FLOOR) }, { wall: 0xf7f4ee, roofH: 15 });
    door(g, hx, hy, 1.6, 0.7, 17, 0x2f7d4f);
    door(g, hx, hy, 1.6, 1.6, 17, 0x2f7d4f);
    windowOnRight(this, g, hx, hy, 2.3, 0.8, 14, PAL.balconyYellow);
    // Bugambilias sobre la tapia.
    for (const [bx, by] of [[0.25, 2.2], [0.25, 2.6], [2.6, 0.3]]) {
      const p = iso(x + bx, y + by, 10);
      for (const [dx, dy] of [[-3, 0], [3, -1], [0, -4]]) g.circle(p.x + dx, p.y + dy, 3.2).fill(0xd63384);
      g.circle(p.x, p.y + 1, 2).fill(0x4e8a33);
    }
    const hammock = iso(x + 1.6, y + 2.5, 8);
    g.moveTo(hammock.x - 12, hammock.y - 6).quadraticCurveTo(hammock.x, hammock.y + 4, hammock.x + 12, hammock.y - 6).stroke({ width: 3, color: 0xd7263d });
  },

  // Taller de cajas: casa donde se arman las cajas, con el papel de fique hecho a mano secándose al sol.
  box_shop(g, x, y, ctx) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    house(this, g, hx, hy, 2.0, 1.5, 28, ctx, { wall: 0xf7f4ee, roofH: 14 });
    door(g, hx, hy, 1.5, 0.6, 16, 0x2e6fd1);
    windowOnRight(this, g, hx, hy, 2.0, 0.75, 14, PAL.balconyYellow);
    // Tendedero con las hojas de papel de fique.
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

  // Canastas del caminante: casa con canastos apilados y el que se está llenando en la puerta.
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

  // Salida al Camino Real: el portón de piedra donde empieza el camino empedrado a Guane; salen caminantes.
  camino_real(g, x, y, ctx) {
    // El camino de piedra amarilla que baja hacia el borde de la parcela.
    for (let k = 0; k < 9; k++) {
      const p = iso(x + 0.6 + k * 0.28, y + 1.5 + Math.sin(k) * 0.15);
      g.ellipse(p.x, p.y, 8, 4).fill(k % 2 ? 0xc9a96b : 0xe0c890).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.3 });
    }
    // Portón: dos pilares y un arco de piedra.
    const H = 34 + ctx.up / 2;
    for (const py of [1.05, 1.95]) box(g, x + 0.6, y + py, 0.3, 0.3, H, 0xd9b56a);
    box(g, x + 0.6, y + 1.05, 0.3, 1.2, 8, 0xc9a96b, { z: H });
    const top = iso(x + 0.75, y + 1.65, H + 8);
    g.roundRect(top.x - 12, top.y - 10, 24, 10, 3).fill(0xa1672c).stroke(OUTLINE);
    g.rect(top.x - 8, top.y - 6, 16, 2).fill(0xfff8ec);
    // Letrero «Guane» y un banco para el que espera.
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
};
