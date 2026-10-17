import { Container, Graphics, Polygon, Sprite, Text } from 'pixi.js';
import { iso, isoPoly, depth, shade } from './iso.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { drawCacaoTree, drawCaneClump, drawCoffeeBush, drawCornStalk, drawCow } from './Terrain.js';
import { createRng } from '../core/rng.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';
import { formatNumber } from '../core/format.js';


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
    if (text === this.current) return;
    this.current = text;
    this.text.text = text;
    const w = this.text.width + 18;
    this.bg.clear().roundRect(-w / 2, -11, w, 22, 11).fill({ color: 0x3a2418, alpha: 0.78 }).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 });
  }
}

// Base común: contenedor clicable sobre una huella de casillas, con etiqueta e icono de estado.
export class StationView extends Container {
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
    this.status = new Text({ text: '', style: { fontSize: 22 }, resolution: 3 });
    this.status.anchor.set(0.5);
    this.status.visible = false;
    // Luces nocturnas (ventanas, faroles): la escena pone esta capa sobre el tinte de la noche.
    this.lightLayer = new Container();
    this.lights = [];
    this.lightsDirty = true;
  }

  // Reconstruye los puntos de luz con una textura de halo suave.
  buildLights(texture) {
    this.lightsDirty = false;
    this.lightLayer.removeChildren().forEach((c) => c.destroy());
    for (const l of this.lights) {
      const s = new Sprite(texture);
      s.anchor.set(0.5);
      s.position.set(l.x, l.y);
      s.scale.set(l.r / 32);
      s.tint = l.color ?? 0xffc864;
      s.blendMode = 'add';
      this.lightLayer.addChild(s);
    }
  }

  // icon: '⛔' | '⏸️' | '↪️' | null
  setStatus(icon) {
    this.status.visible = Boolean(icon);
    if (icon && this.status.text !== icon) this.status.text = icon;
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

// Fuente ilimitada de la zona: Cafetal (cafetos), Cañaduzal (caña) o Potrero (vacas), con la casa que crece.
export class FarmView extends StationView {
  constructor(zone, def) {
    const f = zone.farm;
    super(f.x, f.y, f.w, f.h);
    this.zoneFarm = f;
    this.theme = zone.theme;
    this.def = def;
    this.art = new Graphics();
    this.addChild(this.art);
    this.label = new Label(def.name);
    this.tier = -1;
    this.bushes = [];
  }

  sync(state) {
    const farm = state.stations[this.def.id];
    const tier = milestoneTier(farm.level);
    if (tier !== this.tier) this.draw(tier);
    this.label.set(`${this.def.icon} ${this.def.name} · Nv ${farm.level}`);
  }

  draw(tier) {
    this.tier = tier;
    const g = this.art.clear();
    const { x, y, w, h } = this.zoneFarm;
    const rng = createRng(42);
    this.bushes = [];
    this.lights = drawHut(g, x, y, tier);
    this.lightsDirty = true;
    if (this.theme === 'dairy') {
      this.drawPasture(g, tier, rng);
      return;
    }
    // Cafetos (o caña) en filas; con cada hito son más grandes.
    const scale = 0.75 + tier * 0.1;
    for (let gx = x; gx < x + w; gx++) {
      for (let gy = y; gy < y + h; gy++) {
        if (gx < x + 2 && gy < y + 2) continue; // sitio de la casa
        // Los cacaos son más grandes: uno por casilla.
        for (const ox of this.theme === 'cacao' ? [0.5] : [0.28, 0.75]) {
          const p = iso(gx + ox, gy + 0.5);
          this.bushes.push(p);
          if (this.theme === 'cane') drawCaneClump(g, p.x, p.y, scale, rng);
          else if (this.theme === 'cacao') drawCacaoTree(g, p.x, p.y, scale, rng, 2 + tier);
          else if (this.theme === 'corn') drawCornStalk(g, p.x, p.y, scale, rng, 1 + Math.min(tier, 2));
          else drawCoffeeBush(g, p.x, p.y, scale, rng, 3 + tier * 2);
        }
      }
    }
  }

  // Potrero: cerca de madera, bebedero, cantinas de leche y vacas; con cada hito, más vacas.
  drawPasture(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    // Bebedero y cantinas junto a la casa.
    box(g, x + 2.2, y + 0.3, 1.2, 0.35, 6, 0x9aa3a8);
    const water = iso(x + 2.8, y + 0.47, 6);
    g.ellipse(water.x, water.y, 12, 3).fill(0x6fa8dc);
    for (const [cx, cy] of [[0.4, 2.3], [0.75, 2.45], [1.1, 2.3]]) {
      const p = iso(x + cx, y + cy);
      g.roundRect(p.x - 4, p.y - 13, 8, 13, 2).fill(0xc7ccd1).stroke(OUTLINE);
      g.ellipse(p.x, p.y - 13, 3, 1.4).fill(0x9aa3a8);
    }
    const cows = [];
    const n = 5 + tier * 2;
    for (let i = 0; i < 60 && cows.length < n; i++) {
      const gx = x + 0.6 + rng() * (w - 1.2);
      const gy = y + 0.6 + rng() * (h - 1.2);
      if (gx < x + 2.6 && gy < y + 2.8) continue; // sitio de la casa
      if (cows.some(([cx, cy]) => Math.hypot(cx - gx, cy - gy) < 0.9)) continue;
      cows.push([gx, gy]);
    }
    cows.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    for (const [gx, gy] of cows) {
      const p = iso(gx, gy);
      drawCow(g, p.x, p.y, 0.9 + tier * 0.05, rng, rng() < 0.5);
      this.bushes.push({ x: p.x, y: p.y - 4 });
    }
    // Cerca alrededor del potrero (delante de las vacas).
    const fence = [[x, y + h], [x + w, y + h], [x + w, y]];
    for (let i = 1; i < fence.length; i++) {
      const [ax, ay] = fence[i - 1];
      const [bx, by] = fence[i];
      const steps = Math.round(Math.hypot(bx - ax, by - ay) * 2);
      for (let k = 0; k <= steps; k++) {
        const p = iso(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps);
        g.rect(p.x - 1.2, p.y - 11, 2.4, 11).fill(PAL.wood);
      }
      for (const z of [4, 9]) {
        const a = iso(ax, ay, z);
        const b = iso(bx, by, z);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color: PAL.woodDark, alpha: 0.85 });
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
  const doorLight = (size) => {
    const d = iso(ox + size * 0.55, oy + size, 10);
    return { x: d.x, y: d.y, r: 22 };
  };
  if (tier === 0) {
    shadow(g, p.x, p.y + 6, 34, 14);
    box(g, ox, oy, 1.4, 1.4, 20, 0xa47148);
    gableRoof(g, ox, oy, 1.4, 1.4, 20, 14, 0x9c8a5a, 0xa47148);
    door(g, ox, oy, 1.4, 1.4);
    return [doorLight(1.4)];
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
  const lights = [doorLight(size)];
  if (tier >= 2) {
    const b = iso(ox + size / 2, oy + size, height - 2);
    lights.push({ x: b.x, y: b.y, r: 26 });
  }
  return lights;
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
      const c = iso(ox + wx, oy + D, 26);
      this.lights.push({ x: c.x, y: c.y, r: 18 });
    }
    for (const wy of [0.7, 1.6]) {
      g.poly(isoPoly([[ox + W, oy + wy - 0.15, 18], [ox + W, oy + wy + 0.15, 18], [ox + W, oy + wy + 0.15, 32], [ox + W, oy + wy - 0.15, 32]])).fill(shade(PAL.balconyYellow, 0.8)).stroke(OUTLINE);
      const c = iso(ox + W, oy + wy, 25);
      this.lights.push({ x: c.x, y: c.y, r: 18 });
    }
    // Farol en la puerta del patio.
    const lamp = iso(ox + 0.4, oy + D + 0.15, 30);
    g.rect(lamp.x - 1, lamp.y, 2, 30).fill(0x2b2b2b);
    g.rect(lamp.x - 3.5, lamp.y - 7, 7, 7).fill(0xffd27a).stroke({ width: 1, color: 0x2b2b2b });
    this.lights.push({ x: lamp.x, y: lamp.y - 3, r: 28 });
    // Letrero.
    const s = iso(ox + 1.2, oy + D, 38);
    g.roundRect(s.x - 22, s.y - 7, 44, 13, 3).fill(PAL.wood).stroke(OUTLINE);
    const t = new Text({ text: 'BODEGA', style: { fontFamily: FONT, fontSize: 9, fontWeight: '700', fill: 0xfff3d6 }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(s.x, s.y - 0.5);
    t.skew.set(0, 0.46);
    this.addChild(t);
  }

  // Costales apilados en el patio según lo que hay en bodega. `zone` es el estado de la zona.
  sync(zone, capacity) {
    const stock = Object.values(zone.warehouse).reduce((a, b) => a + b, 0);
    const n = stock <= 0 ? 0 : Math.min(9, Math.ceil((stock / capacity) * 9));
    this.label.set(`🚙 Bodega · Nv ${zone.dispatch.level}`);
    if (n === this.lastSacks) return;
    this.lastSacks = n;
    const g = this.sacks.clear();
    const ids = Object.keys(zone.warehouse);
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

// Parcela de una estación aún sin construir: cerca, letrero y precio.
export class PlotView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    const g = new Graphics();
    this.glow = new Graphics();
    this.addChild(this.glow, g);
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
    // Letrero con icono y precio.
    const s = iso(x + 1.5, y + 1.5);
    g.rect(s.x - 1.5, s.y - 26, 3, 26).fill(PAL.woodDark);
    g.roundRect(s.x - 26, s.y - 48, 52, 26, 5).fill(PAL.wood).stroke(OUTLINE);
    this.sign = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 11, fontWeight: '700', fill: 0xfff3d6, align: 'center' },
      resolution: 3,
    });
    this.sign.anchor.set(0.5);
    this.sign.position.set(s.x, s.y - 35);
    this.addChild(this.sign);
    this.label = new Label(def.name);
    this.label.alpha = 0.8;
    this.label.scale.set(0.85);
    this.available = false;
  }

  // quote: resultado de quoteUnlock.
  sync(quote) {
    const text = `${this.def.icon} ${formatNumber(quote.cost)}💰`;
    if (this.sign.text !== text) this.sign.text = text;
    const available = quote.ok;
    if (available !== this.available) {
      this.available = available;
      const { x, y } = this.plot;
      this.glow.clear();
      if (available) this.glow.poly(isoPoly([[x, y], [x + 3, y], [x + 3, y + 3], [x, y + 3]])).fill({ color: 0xffe066, alpha: 0.35 });
      this.label.alpha = available ? 1 : 0.8;
    }
  }

  update(dt, t) {
    super.update(dt, t);
    if (this.available) this.glow.alpha = 0.5 + Math.sin(t * 4) * 0.5;
  }
}
