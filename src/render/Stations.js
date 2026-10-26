import { Container, Graphics, Polygon, Sprite, Text } from 'pixi.js';
import { iso, isoPoly, depth, shade } from './iso.js';
import { LOOK } from './look.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { drawCacaoTree, drawCaneClump, drawCoffeeBush, drawAnthill, drawBarley, drawCanaFlecha, drawClayMound, drawOilPalm, drawPotatoPlant, drawCoconutPalm, drawCornStalk, drawFiquePlant, drawGuavaTree, drawRicePlant, drawTobaccoPlant } from './Terrain.js';
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
    this.zoneStyle = zone.style; // 'barichara': el Pueblo, pero blanco y de piedra (v3.5)
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
    // Cosecha de temporada (v3.4): mientras se cosecha, las reinas vuelan sobre los hormigueros.
    this.swarming = Boolean(this.def.harvest) && farm.status === 'working';
  }

  update(dt, t) {
    super.update(dt, t);
    if (this.theme === 'cienaga' && this.boats) this.drawBoats(t);
    if (!this.def.harvest) return;
    if (!this.flyers) this.addChild((this.flyers = new Graphics()));
    const g = this.flyers.clear();
    if (!this.swarming || !this.bushes.length) return;
    for (let i = 0; i < 18; i++) {
      const home = this.bushes[(i * 7) % this.bushes.length];
      const f = (t * 0.35 + i * 0.37) % 1;
      const x = home.x + Math.sin(t * 2 + i) * 10 + (i % 2 ? 1 : -1) * f * 14;
      const y = home.y - 10 - f * 40;
      g.ellipse(x, y, 3, 1.9).fill({ color: 0x6b2e14, alpha: 1 - f * 0.7 });
      g.ellipse(x - 1.5, y - 2.5, 3.4, 1.4).fill({ color: 0xe3f2fd, alpha: (1 - f) * 0.85 });
    }
  }

  draw(tier) {
    this.tier = tier;
    const g = this.art.clear();
    const { x, y, w, h } = this.zoneFarm;
    const rng = createRng(42);
    this.bushes = [];
    this.lightsDirty = true;
    if (this.theme === 'town') {
      this.drawPlaza(g, tier, rng);
      return;
    }
    this.lights = drawHut(g, x, y, tier);
    if (this.theme === 'dairy' || this.theme === 'ranch' || this.theme === 'savanna' || this.theme === 'sheep') {
      this.drawPasture(g, tier, rng);
      return;
    }
    if (this.theme === 'cienaga') {
      this.drawLagoon(g, tier, rng);
      return;
    }
    // Cafetos (o caña) en filas; con cada hito son más grandes.
    const scale = 0.75 + tier * 0.1;
    for (let gx = x; gx < x + w; gx++) {
      for (let gy = y; gy < y + h; gy++) {
        if (gx < x + 2 && gy < y + 2) continue; // sitio de la casa
        // Los cacaos son más grandes: uno por casilla.
        for (const ox of this.theme === 'cacao' || this.theme === 'guava' || this.theme === 'ants' || this.theme === 'coconut' || this.theme === 'clay' || this.theme === 'palm' ? [0.5] : [0.28, 0.75]) {
          const p = iso(gx + ox, gy + 0.5);
          this.bushes.push(p);
          if (this.theme === 'cane') drawCaneClump(g, p.x, p.y, scale, rng);
          else if (this.theme === 'cacao') drawCacaoTree(g, p.x, p.y, scale, rng, 2 + tier);
          else if (this.theme === 'guava') drawGuavaTree(g, p.x, p.y, scale, rng, 3 + tier);
          else if (this.theme === 'ants') drawAnthill(g, p.x, p.y, scale * (0.9 + tier * 0.06), rng);
          else if (this.theme === 'fique') drawFiquePlant(g, p.x, p.y, scale * (0.85 + tier * 0.05), rng);
          else if (this.theme === 'tobacco') drawTobaccoPlant(g, p.x, p.y, scale, rng, Math.min(1 + tier, 5));
          else if (this.theme === 'clay') drawClayMound(g, p.x, p.y, scale * (0.9 + tier * 0.06), rng, (gx + gy) % 3 === 0);
          else if (this.theme === 'barley') drawBarley(g, p.x, p.y, scale, rng, tier);
          else if (this.theme === 'palm') drawOilPalm(g, p.x, p.y, 0.6 + tier * 0.06, rng, 1 + Math.min(tier, 4));
          else if (this.theme === 'potato') drawPotatoPlant(g, p.x, p.y, scale, rng, Math.min(1 + tier, 4));
          else if (this.theme === 'canaflecha') drawCanaFlecha(g, p.x, p.y, scale * 0.8, rng, Math.min(tier, 2));
          else if (this.theme === 'coconut') drawCoconutPalm(g, p.x, p.y, 0.55 + tier * 0.06, rng, 2 + Math.min(tier * 2, 5), true);
          else if (this.theme === 'rice') drawRicePlant(g, p.x, p.y, scale, rng, Math.min(tier, 3));
          else if (this.theme === 'corn') drawCornStalk(g, p.x, p.y, scale, rng, 1 + Math.min(tier, 2));
          else drawCoffeeBush(g, p.x, p.y, scale, rng, 3 + tier * 2);
        }
      }
    }
  }

  // Ciénaga (v3.17): el agua, un muelle de tablas junto a la casa y las canoas de los pescadores (con cada
  // hito, más canoas). Las canoas se mecen y los pescadores tiran la atarraya (ver drawBoats).
  drawLagoon(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    // Muelle de tablas.
    for (let k = 0; k < 6; k++) box(g, x + 2.1 + k * 0.32, y + 0.9, 0.28, 0.6, 2, k % 2 ? PAL.wood : PAL.woodDark);
    for (const [px, py] of [[2.1, 0.9], [3.95, 0.9], [2.1, 1.45], [3.95, 1.45]]) box(g, x + px, y + py, 0.06, 0.06, 3, PAL.woodDark);
    // Una canoa amarrada al muelle.
    this.boats = [{ gx: x + 3.4, gy: y + 1.85, flip: 1, phase: 0, moored: true }];
    const n = 3 + Math.min(tier, 4);
    for (let i = 0; i < 60 && this.boats.length < n + 1; i++) {
      const gx = x + 0.8 + rng() * (w - 1.6);
      const gy = y + 0.8 + rng() * (h - 1.6);
      if (gx < x + 4.4 && gy < y + 2.6) continue; // la casa y el muelle
      if (this.boats.some((b) => Math.hypot(b.gx - gx, b.gy - gy) < 1.3)) continue;
      this.boats.push({ gx, gy, flip: rng() < 0.5 ? -1 : 1, phase: rng() * 6 });
    }
    for (const b of this.boats) {
      const p = iso(b.gx, b.gy);
      this.bushes.push({ x: p.x, y: p.y - 6 });
    }
  }

  // Las canoas: se mecen en el agua; el pescador lanza la atarraya y la recoge.
  drawBoats(t) {
    if (!this.boatLayer) this.addChild((this.boatLayer = new Graphics()));
    const g = this.boatLayer.clear();
    for (const b of this.boats) {
      const p = iso(b.gx, b.gy);
      const bob = Math.sin(t * 1.5 + b.phase) * 1.2;
      const f = b.flip;
      const cx = p.x;
      const cy = p.y + bob;
      g.ellipse(cx, cy + 2, 18, 4).fill({ color: 0x3f7f88, alpha: 0.5 });
      g.moveTo(cx - 16 * f, cy - 4).quadraticCurveTo(cx, cy + 5, cx + 16 * f, cy - 4).lineTo(cx + 13 * f, cy).quadraticCurveTo(cx, cy + 7, cx - 13 * f, cy).closePath().fill(0x8d5a32).stroke(OUTLINE);
      g.moveTo(cx - 14 * f, cy - 3).quadraticCurveTo(cx, cy + 3, cx + 14 * f, cy - 3).stroke({ width: 1, color: 0x5d3a1e });
      if (b.moored) continue;
      // El pescador, de pie, con su sombrero.
      const mx = cx - 4 * f;
      g.rect(mx - 2, cy - 11, 1.6, 9).fill(0x37474f);
      g.rect(mx + 0.6, cy - 11, 1.6, 9).fill(0x37474f);
      g.roundRect(mx - 3, cy - 19, 6, 9, 2).fill(0xf4efe6);
      g.circle(mx, cy - 21.5, 2.6).fill(0x8d5524);
      g.ellipse(mx, cy - 23.5, 5, 1.4).fill(0xf4e3b5);
      // La atarraya: se abre en el aire y cae al agua; luego la recoge.
      const k = ((t * 0.35 + b.phase) % 1);
      if (k < 0.5) {
        const open = Math.sin(k * 2 * Math.PI) * 0.5 + 0.5;
        const nx = mx + f * (8 + k * 30);
        const ny = cy - 18 + k * 30;
        const r = 4 + open * 10;
        g.moveTo(mx + 2 * f, cy - 16).lineTo(nx, ny - r * 0.5).stroke({ width: 0.8, color: 0x90a4ae });
        g.ellipse(nx, ny, r, r * 0.45).fill({ color: 0xeceff1, alpha: 0.55 }).stroke({ width: 0.8, color: 0x90a4ae });
      } else {
        const ring = (k - 0.5) * 2;
        const nx = mx + f * 23;
        const ny = cy - 3;
        g.ellipse(nx, ny, 6 + ring * 10, (6 + ring * 10) * 0.4).stroke({ width: 1, color: 0xe8f6ff, alpha: 1 - ring });
        g.moveTo(mx + 2 * f, cy - 14).lineTo(nx - 2 * f, ny).stroke({ width: 0.8, color: 0x90a4ae });
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
    if (this.theme === 'sheep') {
      // En las Ruanas (v3.26), en vez de cantinas, los bultos de lana trasquilada.
      for (const [cx, cy] of [[0.45, 2.3], [0.85, 2.45], [1.2, 2.3]]) {
        const p = iso(x + cx, y + cy);
        g.ellipse(p.x, p.y - 5, 7, 5.5).fill(0xece4cf).stroke(OUTLINE);
        for (const [dx, dy] of [[-3, -7], [2, -8], [0, -4]]) g.circle(p.x + dx, p.y + dy, 2).fill(0xfbfaf6);
      }
    } else if (this.theme === 'ranch') {
      // En el Hato, en vez de cantinas, el saladero del ganado: una canoa de madera con sal.
      box(g, x + 0.3, y + 2.2, 1.0, 0.3, 5, PAL.wood);
      g.poly(isoPoly([[x + 0.35, y + 2.25, 5], [x + 1.25, y + 2.25, 5], [x + 1.25, y + 2.45, 5], [x + 0.35, y + 2.45, 5]])).fill(0xf4f1e8);
    } else {
      for (const [cx, cy] of [[0.4, 2.3], [0.75, 2.45], [1.1, 2.3]]) {
        const p = iso(x + cx, y + cy);
        g.roundRect(p.x - 4, p.y - 13, 8, 13, 2).fill(0xc7ccd1).stroke(OUTLINE);
        g.ellipse(p.x, p.y - 13, 3, 1.4).fill(0x9aa3a8);
      }
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
    // Las vacas se mueven por el potrero (ver Critters.js); aquí solo cuántas son y dónde salta la leche.
    this.cowCount = cows.length;
    for (const [gx, gy] of cows) {
      const p = iso(gx, gy);
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

  // Plaza del Pueblo: la Casa del café en la esquina, con mesas afuera, una fuente en el centro,
  // guayacanes, bancas, faroles y gente. Con cada hito, más mesas y la casa más alta.
  drawPlaza(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    this.lights = drawCoffeeHouse(g, x, y, tier, PLAZA_HOUSE[this.zoneStyle ?? 'pueblo']);
    // Mesas con parasol delante de la casa: de ahí salta el café de origen.
    const tables = [[0.6, 2.6], [1.5, 2.7], [2.6, 0.6], [2.7, 1.5], [2.5, 2.5], [0.6, 3.5], [3.5, 0.6]].slice(0, 3 + Math.min(tier, 4));
    for (const [tx, ty] of tables) {
      const p = iso(x + tx, y + ty);
      shadow(g, p.x, p.y + 1, 12, 5);
      g.rect(p.x - 1, p.y - 22, 2, 22).fill(0x555555);
      g.ellipse(p.x, p.y - 9, 8, 4).fill(0xffffff).stroke(OUTLINE);
      g.poly([p.x, p.y - 30, p.x - 15, p.y - 20, p.x + 15, p.y - 20]).fill(rng() < 0.5 ? PAL.balconyRed : PAL.balconyGreen).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
      g.circle(p.x - 3, p.y - 10, 1.8).fill(PRODUCTS[Object.keys(this.def.out)[0]].color);
      this.bushes.push({ x: p.x, y: p.y + 4 });
    }
    // Fuente.
    const c = iso(x + w * 0.62, y + h * 0.62);
    g.ellipse(c.x, c.y, 34, 17).fill(0xb9b2a5).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 4, 30, 15).fill(0xd2cbbd).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 4, 25, 12).fill(0x6fa8dc);
    g.rect(c.x - 3, c.y - 26, 6, 22).fill(0xd2cbbd).stroke(OUTLINE);
    g.ellipse(c.x, c.y - 26, 11, 5).fill(0xb9b2a5).stroke(OUTLINE);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.moveTo(c.x, c.y - 28).quadraticCurveTo(c.x + Math.cos(a) * 12, c.y - 36, c.x + Math.cos(a) * 18, c.y - 6 + Math.sin(a) * 8).stroke({ width: 1.5, color: 0xd6ecff, alpha: 0.8 });
    }
    // Guayacanes y bancas alrededor.
    for (const [gx, gy, pink] of [[w - 0.7, 0.8, false], [0.8, h - 0.7, true], [w - 0.6, h - 0.6, false]]) {
      const p = iso(x + gx, y + gy);
      shadow(g, p.x + 4, p.y + 2, 22, 8);
      g.moveTo(p.x - 2, p.y).lineTo(p.x - 1.5, p.y - 26).lineTo(p.x + 1.5, p.y - 26).lineTo(p.x + 2, p.y).closePath().fill(0x6b4a2e);
      const colors = pink ? [0xe58fb5, 0xf2b5cf, 0xd46a9a] : [0xf4c430, 0xf9dc5c, 0xe0a91b];
      for (const [dx, dy, r] of [[-11, -30, 12], [10, -31, 12], [0, -39, 14], [-4, -27, 9], [5, -43, 9]]) g.circle(p.x + dx, p.y + dy, r).fill(colors[Math.floor(rng() * 3)]);
    }
    for (const [bx, by] of [[w * 0.62 - 1.6, h * 0.62 + 0.9], [w * 0.62 + 0.9, h * 0.62 - 1.6]]) box(g, x + bx, y + by, 0.7, 0.2, 5, PAL.wood);
    for (const [lx, ly] of [[w * 0.62 - 1.4, h * 0.62 - 1.4], [w - 0.3, h * 0.62], [w * 0.62, h - 0.3]]) {
      const p = iso(x + lx, y + ly);
      g.rect(p.x - 1.2, p.y - 30, 2.4, 30).fill(0x2b2b2b);
      g.rect(p.x - 4, p.y - 38, 8, 8).fill(0xffd27a).stroke({ width: 1.5, color: 0x2b2b2b });
      if (tier >= 1) this.lights.push({ x: p.x, y: p.y - 34, r: 26 });
    }
    // La gente que pasea por la plaza la pone Critters (más con cada hito).
    this.peopleCount = 4 + tier * 2;
  }

  // Un punto al azar sobre un cafeto (para las cerezas que saltan).
  randomBushTop(rng = Math.random) {
    const p = this.bushes[Math.floor(rng() * this.bushes.length)];
    return p ? { x: p.x, y: p.y - 14 } : this.anchorPoint(20);
  }
}

// Casa del café del Pueblo: casona de esquina con toldo y letrero; con los hitos, segundo piso con
// balcón, remates de colores y, al final, un tercer piso. Devuelve las luces de la noche.
const PLAZA_HOUSE = {
  pueblo: { wall: 0xf6d860, trims: [PAL.balconyGreen, PAL.balconyBlue, PAL.balconyRed, PAL.balconyYellow, 0x8e44ad, 0xffd700], awning: PAL.balconyRed, sign: 'cup' },
  // Barichara (v3.5): tapia blanca, puertas y balcones verdes o azules, toldo verde.
  barichara: { wall: 0xf7f4ee, trims: [0x2f7d4f, 0x2f7d4f, 0x2e6fd1, 0x2f7d4f, 0x8e44ad, 0xffd700], awning: 0x2f7d4f, sign: 'sweet' },
  // Salento (v3.12): casona blanca con remates de colores vivos, como las de la Calle Real.
  // Cartagena (v3.20): casona amarilla con balcones de madera y toldo verde.
  cartagena: { wall: 0xf6c244, trims: [0x7a4a22, 0x7a4a22, 0x2f7d4f, 0x7a4a22, 0xd63384, 0xffd700], awning: 0x2f7d4f, sign: 'cup' },
  // Villa de Leyva (v3.27): casona blanca con balcones verdes.
  villa: { wall: 0xfbf8f1, trims: [0x2f7d4f, 0x2f7d4f, 0x1f5a38, 0x2f7d4f, 0x8e44ad, 0xffd700], awning: 0x2f7d4f, sign: 'cup' },
  salento: { wall: 0xfbf8f1, trims: [0xd7263d, 0x2e6fd1, 0x2fa36b, 0xf07f1d, 0x8e44ad, 0xf2b705], awning: 0xd7263d, sign: 'cup' },
};

function drawCoffeeHouse(g, x, y, tier, look = PLAZA_HOUSE.pueblo) {
  const ox = x + 0.2;
  const oy = y + 0.2;
  const w = 1.8;
  const d = 1.8;
  const trim = look.trims[tier];
  const height = 26 + (tier >= 2 ? 14 : 0) + (tier >= 5 ? 12 : 0);
  const p = iso(ox + w / 2, oy + d / 2);
  shadow(g, p.x + 6, p.y + 8, 52, 20);
  box(g, ox, oy, w, d, 8, trim);
  box(g, ox, oy, w, d, height - 8, look.wall, { z: 8 });
  gableRoof(g, ox, oy, w, d, height, 18, PAL.roof, look.wall);
  const lights = [];
  // Puertas en las dos fachadas y un toldo de rayas sobre la delantera.
  for (const at of [0.5, 1.3]) {
    g.poly(isoPoly([[ox + at - 0.17, oy + d, 0], [ox + at + 0.17, oy + d, 0], [ox + at + 0.17, oy + d, 17], [ox + at - 0.17, oy + d, 17]])).fill(shade(trim, 0.7)).stroke(OUTLINE);
    const l = iso(ox + at, oy + d, 9);
    lights.push({ x: l.x, y: l.y, r: 20 });
  }
  g.poly(isoPoly([[ox + w, oy + 0.6, 0], [ox + w, oy + 0.95, 0], [ox + w, oy + 0.95, 17], [ox + w, oy + 0.6, 17]])).fill(shade(trim, 0.6)).stroke(OUTLINE);
  for (let i = 0; i < 6; i++) {
    const a = ox + 0.1 + (i * (w - 0.2)) / 6;
    const b = a + (w - 0.2) / 6;
    g.poly(isoPoly([[a, oy + d, 21], [b, oy + d, 21], [b, oy + d + 0.35, 15], [a, oy + d + 0.35, 15]])).fill(i % 2 ? 0xffffff : look.awning).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  }
  // Letrero con una taza (o con un bocadillo).
  const s = iso(ox + w / 2, oy + d, 26);
  g.roundRect(s.x - 15, s.y - 7, 30, 13, 3).fill(PAL.woodDark).stroke(OUTLINE);
  if (look.sign === 'sweet') {
    g.rect(s.x - 7, s.y - 3, 14, 6).fill(PRODUCTS.bocadillo.color);
    g.rect(s.x - 7, s.y + 1, 14, 1.5).fill(0xfce4ec);
  } else {
    g.roundRect(s.x - 5, s.y - 4, 8, 7, 2).fill(0xffffff);
    g.circle(s.x + 4.5, s.y - 0.5, 2).stroke({ width: 1.2, color: 0xffffff });
  }
  if (tier >= 2) {
    const z = 30;
    const a = iso(ox + 0.15, oy + d + 0.1, z);
    const b = iso(ox + w - 0.15, oy + d + 0.1, z);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: trim });
    for (let i = 0; i <= 9; i++) {
      const q = iso(ox + 0.15 + ((w - 0.3) * i) / 9, oy + d + 0.1, z);
      g.moveTo(q.x, q.y).lineTo(q.x, q.y + 7).stroke({ width: 1.5, color: trim });
    }
    for (const at of [0.5, 1.3]) {
      g.poly(isoPoly([[ox + at - 0.13, oy + d, z + 1], [ox + at + 0.13, oy + d, z + 1], [ox + at + 0.13, oy + d, z + 11], [ox + at - 0.13, oy + d, z + 11]])).fill(PAL.balconyYellow).stroke(OUTLINE);
      const l = iso(ox + at, oy + d, z + 6);
      lights.push({ x: l.x, y: l.y, r: 18 });
    }
  }
  if (tier >= 1) {
    // Macetas con flores colgadas de la fachada.
    for (const at of [0.15, 0.9, 1.65]) {
      const q = iso(ox + at, oy + d + 0.05, 20);
      g.circle(q.x, q.y, 3.5).fill(0x4e8a33);
      g.circle(q.x - 1.5, q.y - 1, 1.4).fill(0xe07a5f);
      g.circle(q.x + 1.5, q.y - 1.5, 1.4).fill(0xffffff);
    }
  }
  return lights;
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
    // Banderines (decoración comprada con Renombre, v2.2): del farol a un palo en la otra esquina.
    const flags = LOOK.banderines.colors;
    if (flags.length) {
      const a = iso(ox + 0.4, oy + D + 0.15, 30);
      const b = iso(ox + W + 0.1, oy + D + 0.15, 30);
      const foot = iso(ox + W + 0.1, oy + D + 0.15, 0);
      g.rect(foot.x - 1, b.y, 2, foot.y - b.y).fill(0x6b4a2e);
      const sag = 9;
      const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + sag * 4 * t * (1 - t) });
      g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2, b.x, b.y).stroke({ width: 1, color: 0x3a2418 });
      const n = 9;
      for (let k = 1; k < n; k++) {
        const p0 = at((k - 0.35) / n);
        const p1 = at((k + 0.35) / n);
        const mid = at(k / n);
        g.poly([p0.x, p0.y, p1.x, p1.y, mid.x, mid.y + 7]).fill(flags[k % flags.length]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      }
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
