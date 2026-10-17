import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { StationView, Label } from './Stations.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';

// Color de remates (zócalo, puertas, balcones) según los hitos alcanzados.
const TRIMS = [PAL.balconyGreen, PAL.balconyBlue, PAL.balconyRed, PAL.balconyYellow, 0x8e44ad, 0xffd700];

// Edificio de una estación de procesamiento sobre su parcela de 3×3.
// Cada estación tiene su propio dibujo y, si aplica, una animación mientras trabaja.
export class BuildingView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    this.art = new Graphics();
    this.anim = new Container();
    this.addChild(this.art, this.anim);
    this.label = new Label(def.name);
    this.tier = -1;
    this.working = false;
    this.smokePoints = [];
    this.time = 0;
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
    this.animate = null;
    const { x, y } = this.plot;
    const p = iso(x + 1.5, y + 1.5);
    shadow(this.art, p.x + 6, p.y + 8, 80, 32, 0.18);
    // Patio de tierra apisonada.
    this.art.poly(isoPoly([[x + 0.1, y + 0.1], [x + 2.9, y + 0.1], [x + 2.9, y + 2.9], [x + 0.1, y + 2.9]])).fill({ color: 0xd8b07a, alpha: 0.6 });
    DRAW[this.def.id].call(this, this.art, x, y, TRIMS[tier]);
  }

  update(dt, t) {
    super.update(dt, t);
    this.time += this.working ? dt : 0;
    if (this.animate) this.animate(this.time);
  }
}

// Fachada con puerta en la cara delantera (eje gy+).
function door(g, x, y, d, at, h, color) {
  g.poly(isoPoly([[x + at - 0.15, y + d, 0], [x + at + 0.15, y + d, 0], [x + at + 0.15, y + d, h], [x + at - 0.15, y + d, h]])).fill(shade(color, 0.75)).stroke(OUTLINE);
}

function windowOnRight(g, x, y, w, at, z, color) {
  g.poly(isoPoly([[x + w, y + at - 0.13, z], [x + w, y + at + 0.13, z], [x + w, y + at + 0.13, z + 10], [x + w, y + at - 0.13, z + 10]])).fill(color).stroke(OUTLINE);
}

function sack(g, gx, gy, z, color) {
  const p = iso(gx, gy, z);
  g.ellipse(p.x, p.y - 4, 7, 5.5).fill(PAL.sack).stroke(OUTLINE);
  g.ellipse(p.x, p.y - 8, 3.5, 1.8).fill(color);
}

const DRAW = {
  // Beneficiadero: casa con tolva y tanques de lavado.
  wetmill(g, x, y, trim) {
    const hx = x + 0.3;
    const hy = y + 0.25;
    box(g, hx, hy, 1.8, 1.5, 7, trim);
    box(g, hx, hy, 1.8, 1.5, 22, PAL.wall, { z: 7 });
    gableRoof(g, hx, hy, 1.8, 1.5, 29, 16, PAL.roof, PAL.wall);
    door(g, hx, hy, 1.5, 0.9, 16, trim);
    windowOnRight(g, hx, hy, 1.8, 0.75, 14, PAL.balconyYellow);
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
  dryer(g, x, y, trim) {
    const x0 = x + 0.25;
    const y0 = y + 0.3;
    const w = 2.5;
    const d = 2.3;
    // Camas elevadas con café pergamino.
    for (const by of [0.45, 1.25]) {
      box(g, x0 + 0.2, y0 + by, w - 0.4, 0.6, 7, PAL.wood);
      g.poly(isoPoly([[x0 + 0.25, y0 + by + 0.05, 7], [x0 + w - 0.25, y0 + by + 0.05, 7], [x0 + w - 0.25, y0 + by + 0.55, 7], [x0 + 0.25, y0 + by + 0.55, 7]])).fill(PRODUCTS.parchment.color);
      for (let i = 0; i < 14; i++) {
        const p = iso(x0 + 0.35 + (i % 7) * 0.3, y0 + by + 0.15 + Math.floor(i / 7) * 0.25, 7);
        g.circle(p.x, p.y, 1.2).fill(shade(PRODUCTS.parchment.color, 0.75));
      }
    }
    // Postes.
    for (const [px, py] of [[0, 0], [w, 0], [0, d], [w, d]]) box(g, x0 + px - 0.05, y0 + py - 0.05, 0.1, 0.1, 26, trim);
    // Techo curvo de plástico (aproximado con un tejado a dos aguas translúcido).
    const ym = y0 + d / 2;
    g.poly(isoPoly([[x0, y0, 26], [x0 + w, y0, 26], [x0 + w, ym, 40], [x0, ym, 40]])).fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
    g.poly(isoPoly([[x0 + w, y0, 26], [x0 + w, y0 + d, 26], [x0 + w, ym, 40]])).fill({ color: 0xe8f4f8, alpha: 0.45 }).stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
    g.poly(isoPoly([[x0, y0 + d, 26], [x0 + w, y0 + d, 26], [x0 + w, ym, 40], [x0, ym, 40]])).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });
    for (let i = 1; i < 5; i++) {
      const a = iso(x0 + (w * i) / 5, y0 + d, 26);
      const b = iso(x0 + (w * i) / 5, ym, 40);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: trim, alpha: 0.6 });
    }
    // Brillo del sol sobre el plástico.
    const shine = new Graphics();
    this.anim.addChild(shine);
    this.animate = (time) => {
      const f = (time * 0.25) % 1;
      const p = iso(x0 + f * w, y0 + d * 0.75, 33);
      shine.clear().ellipse(p.x, p.y, 10, 4).fill({ color: 0xffffff, alpha: 0.6 * Math.sin(f * Math.PI) });
    };
  },

  // Trilladora: galpón con techo de zinc y máquina.
  huller(g, x, y, trim) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    box(g, hx, hy, 2.3, 1.8, 26, 0xb08a5a);
    // Tablones.
    for (let i = 1; i < 8; i++) {
      const a = iso(hx + (2.3 * i) / 8, hy + 1.8, 0);
      const b = iso(hx + (2.3 * i) / 8, hy + 1.8, 26);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x7a5a3a, alpha: 0.6 });
    }
    gableRoof(g, hx, hy, 2.3, 1.8, 26, 12, 0x9aa3a8, 0xb08a5a);
    // Portón abierto con la máquina adentro.
    g.poly(isoPoly([[hx + 0.4, hy + 1.8, 0], [hx + 1.3, hy + 1.8, 0], [hx + 1.3, hy + 1.8, 20], [hx + 0.4, hy + 1.8, 20]])).fill(0x3a2a1c).stroke(OUTLINE);
    box(g, hx + 0.55, hy + 1.85, 0.55, 0.4, 14, trim);
    const f = iso(hx + 0.83, hy + 2.05, 14);
    g.poly([f.x - 9, f.y - 12, f.x + 9, f.y - 12, f.x + 3, f.y, f.x - 3, f.y]).fill(0x6c757d).stroke(OUTLINE);
    // Costales listos.
    sack(g, x + 2.4, y + 2.4, 0, PRODUCTS.green.color);
    sack(g, x + 2.65, y + 2.25, 0, PRODUCTS.green.color);
    sack(g, x + 2.5, y + 2.3, 9, PRODUCTS.green.color);
    const pipe = iso(hx + 2, hy + 0.5, 38);
    box(g, hx + 1.9, hy + 0.4, 0.2, 0.2, 44, 0x6c757d);
    this.smokePoints.push({ x: pipe.x, y: pipe.y - 8 });
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
  roaster(g, x, y, trim) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    const brick = 0xb5653a;
    box(g, hx, hy, 2.0, 1.7, 30, brick);
    for (let r = 1; r < 6; r++) {
      const a = iso(hx, hy + 1.7, r * 5);
      const b = iso(hx + 2, hy + 1.7, r * 5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(brick, 0.7), alpha: 0.5 });
      const c = iso(hx + 2, hy, r * 5);
      const d = iso(hx + 2, hy + 1.7, r * 5);
      g.moveTo(c.x, c.y).lineTo(d.x, d.y).stroke({ width: 1, color: shade(brick, 0.55), alpha: 0.5 });
    }
    gableRoof(g, hx, hy, 2.0, 1.7, 30, 14, PAL.roof, brick);
    door(g, hx, hy, 1.7, 0.6, 18, trim);
    windowOnRight(g, hx, hy, 2.0, 0.85, 14, 0xffc864);
    box(g, hx + 1.4, hy + 0.3, 0.35, 0.35, 66, shade(brick, 0.9));
    const top = iso(hx + 1.57, hy + 0.47, 66);
    this.smokePoints.push({ x: top.x, y: top.y - 4 }, { x: top.x + 2, y: top.y - 6 });
    // Tambor tostador en el patio.
    const dp = iso(x + 2.45, y + 2.4, 10);
    g.ellipse(dp.x, dp.y + 10, 16, 6).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(dp.x - 14, dp.y - 8, 28, 16).fill(0x3b3b3b).stroke(OUTLINE);
    g.ellipse(dp.x + 14, dp.y, 4, 8).fill(0x555555).stroke(OUTLINE);
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
  grinder(g, x, y, trim) {
    const hx = x + 0.3;
    const hy = y + 0.3;
    box(g, hx, hy, 1.8, 1.8, 8, trim);
    box(g, hx, hy, 1.8, 1.8, 26, PAL.wall, { z: 8 });
    gableRoof(g, hx, hy, 1.8, 1.8, 34, 18, PAL.roof, PAL.wall);
    door(g, hx, hy, 1.8, 0.8, 16, trim);
    // Canal de agua junto a la rueda.
    g.poly(isoPoly([[x + 2.2, y + 0.2], [x + 2.6, y + 0.2], [x + 2.6, y + 2.8], [x + 2.2, y + 2.8]])).fill(0x6ec6d9).stroke({ width: 1, color: 0x3a7ca5, alpha: 0.6 });
    const c = iso(hx + 1.95, hy + 1.0, 20);
    const holder = new Container();
    holder.position.set(c.x, c.y);
    holder.skew.y = -Math.atan(0.5);
    holder.scale.x = 0.9;
    const wheel = new Graphics();
    wheel.circle(0, 0, 19).stroke({ width: 4, color: PAL.wood });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      wheel.moveTo(0, 0).lineTo(Math.cos(a) * 19, Math.sin(a) * 19).stroke({ width: 2, color: PAL.woodDark });
      wheel.rect(Math.cos(a) * 19 - 3, Math.sin(a) * 19 - 3, 6, 6).fill(PAL.wood);
    }
    wheel.circle(0, 0, 3).fill(PAL.woodDark);
    holder.addChild(wheel);
    this.anim.addChild(holder);
    this.animate = (time) => {
      wheel.rotation = time * 1.6;
    };
  },

  // Empacadora: bodega amarilla con banda transportadora y bolsas.
  packer(g, x, y, trim) {
    const hx = x + 0.25;
    const hy = y + 0.25;
    const wall = 0xf2d16b;
    box(g, hx, hy, 2.4, 1.6, 8, trim);
    box(g, hx, hy, 2.4, 1.6, 22, wall, { z: 8 });
    gableRoof(g, hx, hy, 2.4, 1.6, 30, 14, PAL.roof, wall);
    door(g, hx, hy, 1.6, 1.8, 18, trim);
    windowOnRight(g, hx, hy, 2.4, 0.8, 14, 0xffffff);
    // Banda transportadora.
    box(g, x + 0.4, y + 2.15, 1.6, 0.35, 8, 0x555555);
    // Pila de bolsas.
    for (const [bx, by, z] of [[2.35, 2.2, 0], [2.65, 2.2, 0], [2.5, 2.5, 0], [2.5, 2.3, 10]]) {
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
