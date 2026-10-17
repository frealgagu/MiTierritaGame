import { Container, Graphics, Polygon, Text } from 'pixi.js';
import { iso, isoPoly, depth, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { drawCoffeeBush } from './Terrain.js';
import { createRng } from '../core/rng.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';

const FONT = 'Fredoka, "Baloo 2", system-ui, sans-serif';

// Etiqueta flotante con nombre y nivel, al estilo de los juegos de gestión.
export class Label extends Container {
  constructor(text) {
    super();
    this.bg = new Graphics();
    this.text = new Text({
      text,
      style: { fontFamily: FONT, fontSize: 13, fontWeight: '600', fill: 0xffffff },
      resolution: 3,
    });
    this.text.anchor.set(0.5);
    this.addChild(this.bg, this.text);
    this.set(text);
  }

  set(text) {
    this.text.text = text;
    const w = this.text.width + 18;
    this.bg.clear().roundRect(-w / 2, -11, w, 22, 11).fill({ color: 0x3a2418, alpha: 0.78 }).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 });
  }
}

// Base común: contenedor clicable sobre una huella de casillas.
class StationView extends Container {
  constructor(x, y, w, h) {
    super();
    this.foot = { x, y, w, h };
    this.zIndex = depth(x + w, y + h) - 0.5;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Polygon(isoPoly([[x, y, 0], [x + w, y, 0], [x + w, y + h, 0], [x, y + h, 0]]));
    this.highlight = new Graphics();
    this.addChild(this.highlight);
    this.selected = false;
  }

  // Punto de anclaje para etiquetas y efectos.
  anchorPoint(h = 60) {
    const { x, y, w, h: d } = this.foot;
    return iso(x + w / 2, y + d / 2, h);
  }

  setSelected(on) {
    this.selected = on;
    const { x, y, w, h } = this.foot;
    this.highlight.clear();
    if (on) {
      this.highlight.poly(isoPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])).stroke({ width: 3, color: 0xffe066, alpha: 0.95 });
    }
  }

  update(dt, t) {
    if (this.selected) this.highlight.alpha = 0.6 + Math.sin(t * 6) * 0.4;
  }
}

export class FarmView extends StationView {
  constructor(zone) {
    const f = zone.farm;
    super(f.x, f.y, f.w, f.h);
    this.zoneFarm = f;
    this.art = new Graphics();
    this.addChild(this.art);
    this.label = new Label('Cafetal');
    this.status = new Text({ text: '⛔', style: { fontSize: 22 }, resolution: 3 });
    this.status.anchor.set(0.5);
    this.status.visible = false;
    this.tier = -1;
    this.bushes = [];
  }

  sync(state) {
    const farm = state.stations.farm;
    const tier = milestoneTier(farm.level);
    if (tier !== this.tier) this.draw(tier);
    this.label.set(`🌳 Cafetal · Nv ${farm.level}`);
    this.status.visible = farm.blocked;
  }

  draw(tier) {
    this.tier = tier;
    const g = this.art.clear();
    const { x, y, w, h } = this.zoneFarm;
    const rng = createRng(42);
    this.bushes = [];
    drawHut(g, x, y, tier);
    // Cafetos en filas; con cada hito son más grandes y tienen más cerezas.
    const scale = 0.75 + tier * 0.1;
    for (let gx = x; gx < x + w; gx++) {
      for (let gy = y; gy < y + h; gy++) {
        if (gx < x + 2 && gy < y + 2) continue; // sitio de la casa
        for (const ox of [0.28, 0.75]) {
          const p = iso(gx + ox, gy + 0.5);
          this.bushes.push(p);
          drawCoffeeBush(g, p.x, p.y, scale, rng, 3 + tier * 2);
        }
      }
    }
  }

  // Un punto al azar sobre un cafeto (para las cerezas que saltan).
  randomBushTop(rng = Math.random) {
    const p = this.bushes[Math.floor(rng() * this.bushes.length)];
    return p ? { x: p.x, y: p.y - 14 } : this.anchorPoint(20);
  }
}

// Casa del caficultor; crece con los hitos (GDD §8: evolución visual).
function drawHut(g, x, y, tier) {
  const ox = x + 0.3;
  const oy = y + 0.3;
  const p = iso(ox + 0.7, oy + 0.7);
  if (tier === 0) {
    shadow(g, p.x, p.y + 6, 34, 14);
    box(g, ox, oy, 1.4, 1.4, 20, 0xa47148);
    gableRoof(g, ox, oy, 1.4, 1.4, 20, 14, 0x9c8a5a, 0xa47148);
    door(g, ox, oy, 1.4, 1.4);
    return;
  }
  const wall = PAL.wall;
  const balcony = [PAL.balconyRed, PAL.balconyBlue, PAL.balconyYellow, PAL.balconyGreen, PAL.balconyRed][tier - 1];
  const size = tier >= 3 ? 1.6 : 1.4;
  const height = tier >= 2 ? 34 : 24;
  shadow(g, p.x, p.y + 8, 40, 16);
  box(g, ox, oy, size, size, 7, balcony);
  box(g, ox, oy, size, size, height - 7, wall, { z: 7 });
  gableRoof(g, ox, oy, size, size, height, 16, PAL.roof, wall);
  door(g, ox, oy, size, size, balcony);
  if (tier >= 2) {
    // Balcón en el segundo piso.
    const a = iso(ox + 0.2, oy + size, height - 6);
    const b = iso(ox + size - 0.2, oy + size, height - 6);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: balcony });
    for (let i = 0; i <= 6; i++) {
      const q = iso(ox + 0.2 + ((size - 0.4) * i) / 6, oy + size, height - 6);
      g.moveTo(q.x, q.y).lineTo(q.x, q.y + 7).stroke({ width: 1.5, color: balcony });
    }
  }
  if (tier >= 4) {
    // Secadero lateral.
    box(g, x + 0.2, y + 1.8, 1.6, 0.2, 2, 0xcfae7a);
  }
}

function door(g, ox, oy, w, d, color = PAL.woodDark) {
  const f = w * 0.55;
  g.poly(isoPoly([[ox + f - 0.15, oy + d, 0], [ox + f + 0.15, oy + d, 0], [ox + f + 0.15, oy + d, 14], [ox + f - 0.15, oy + d, 14]])).fill(shade(color, 0.7)).stroke(OUTLINE);
}

export class WarehouseView extends StationView {
  constructor(zone) {
    const wh = zone.warehouse;
    super(wh.x, wh.y, wh.w, wh.h);
    this.wh = wh;
    this.house = new Graphics();
    this.sacks = new Graphics();
    this.addChild(this.house, this.sacks);
    this.label = new Label('Bodega');
    this.lastSacks = -1;
    this.drawHouse();
    const c = iso(wh.x + 2.4, wh.y + 0.9, 70);
    this.chimney = c;
  }

  drawHouse() {
    const g = this.house;
    const { x, y } = this.wh;
    const ox = x + 0.25;
    const oy = y + 0.3;
    const W = 2.5;
    const D = 2.3;
    const p = iso(ox + W / 2, oy + D / 2);
    shadow(g, p.x + 8, p.y + 10, 70, 28);
    box(g, ox, oy, W, D, 9, PAL.balconyBlue);
    box(g, ox, oy, W, D, 33, PAL.wall, { z: 9 });
    // Chimenea.
    box(g, x + 2.2, y + 0.7, 0.3, 0.3, 64, 0xc7beb0);
    gableRoof(g, ox, oy, W, D, 42, 22, PAL.roof, PAL.wall);
    // Portón de madera grande en la fachada delantera.
    const f = 0.55;
    g.poly(isoPoly([[ox + f, oy + D, 0], [ox + f + 0.8, oy + D, 0], [ox + f + 0.8, oy + D, 26], [ox + f, oy + D, 26]])).fill(PAL.wood).stroke(OUTLINE);
    const m1 = iso(ox + f + 0.4, oy + D, 0);
    const m2 = iso(ox + f + 0.4, oy + D, 26);
    g.moveTo(m1.x, m1.y).lineTo(m2.x, m2.y).stroke({ width: 1.5, color: PAL.woodDark });
    // Ventanas con balcón amarillo.
    for (const wx of [1.75, 2.15]) {
      g.poly(isoPoly([[ox + wx - 0.13, oy + D, 20], [ox + wx + 0.13, oy + D, 20], [ox + wx + 0.13, oy + D, 32], [ox + wx - 0.13, oy + D, 32]])).fill(PAL.balconyYellow).stroke(OUTLINE);
    }
    for (const wy of [0.7, 1.6]) {
      g.poly(isoPoly([[ox + W, oy + wy - 0.15, 18], [ox + W, oy + wy + 0.15, 18], [ox + W, oy + wy + 0.15, 32], [ox + W, oy + wy - 0.15, 32]])).fill(shade(PAL.balconyYellow, 0.8)).stroke(OUTLINE);
    }
    // Letrero.
    const s = iso(ox + 1.2, oy + D, 38);
    g.roundRect(s.x - 22, s.y - 7, 44, 13, 3).fill(PAL.wood).stroke(OUTLINE);
    const t = new Text({ text: 'BODEGA', style: { fontFamily: FONT, fontSize: 9, fontWeight: '700', fill: 0xfff3d6 }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(s.x, s.y - 0.5);
    t.skew.set(0, 0.46);
    this.addChild(t);
  }

  // Costales apilados en el patio según lo que hay en bodega.
  sync(state, capacity) {
    const stock = Object.values(state.warehouse).reduce((a, b) => a + b, 0);
    const n = stock <= 0 ? 0 : Math.min(9, Math.ceil((stock / capacity) * 9));
    this.label.set(`🚙 Bodega · Nv ${state.dispatch.level}`);
    if (n === this.lastSacks) return;
    this.lastSacks = n;
    const g = this.sacks.clear();
    const ids = Object.keys(state.warehouse);
    const color = ids.length ? PRODUCTS[ids[0]].color : PAL.cherry;
    const slots = [[0, 0, 0], [0.32, 0, 0], [0, 0.32, 0], [0.32, 0.32, 0], [0.64, 0, 0], [0.16, 0.16, 8], [0.48, 0.16, 8], [0.16, 0.0, 8], [0.32, 0.16, 15]];
    const bx = this.wh.x + 2.55;
    const by = this.wh.y + 2.25;
    for (let i = 0; i < n; i++) {
      const [dx, dy, z] = slots[i];
      const p = iso(bx + dx, by + dy, z);
      g.ellipse(p.x, p.y - 4, 8, 6).fill(PAL.sack).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 8, 4, 2).fill(color);
    }
  }
}

// Parcela reservada para una estación que llega en una versión futura.
export class PlotView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    const g = new Graphics();
    this.addChild(g);
    const { x, y } = plot;
    // Postes de cerca.
    const posts = [];
    for (let i = 0; i <= 3; i += 0.5) posts.push([x + i, y], [x + 3, y + i], [x, y + i], [x + i, y + 3]);
    posts.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    for (const [px, py] of posts) {
      const p = iso(px, py);
      g.rect(p.x - 1.5, p.y - 10, 3, 10).fill(PAL.wood);
    }
    for (const [ax, ay, bx, by] of [[x, y, x + 3, y], [x + 3, y, x + 3, y + 3], [x, y, x, y + 3], [x, y + 3, x + 3, y + 3]]) {
      const a = iso(ax, ay, 7);
      const b = iso(bx, by, 7);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color: PAL.woodDark, alpha: 0.8 });
    }
    // Letrero.
    const s = iso(x + 1.5, y + 1.5);
    g.rect(s.x - 1.5, s.y - 26, 3, 26).fill(PAL.woodDark);
    g.roundRect(s.x - 18, s.y - 44, 36, 22, 4).fill(PAL.wood).stroke(OUTLINE);
    const t = new Text({ text: `${def.icon}🔒`, style: { fontSize: 11 }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(s.x, s.y - 33);
    this.addChild(t);
    this.label = new Label(def.name);
    this.label.alpha = 0.75;
    this.label.scale.set(0.85);
  }
}
