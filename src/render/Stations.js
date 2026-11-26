import { Container, Graphics, Polygon, Rectangle, Sprite, Text } from 'pixi.js';
import { iso, isoPoly, depth, shade } from './iso.js';
import { LOOK } from './look.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';
import { drawCacaoTree, drawCaneClump, drawCoffeeBush, drawAnthill, drawBarley, drawCanaFlecha, drawClayMound, drawOilPalm, drawPlantainPlant, drawYucaPlant, drawYanchamaTree, drawAzoteaBed, drawMangroveTree, drawWerreguePalm, drawAsaiPalm, drawAjiPlant, drawPassionVine, drawPondTile, drawHideFrame, drawPotatoPlant, drawAchiraPlant, drawRoseBush, drawStrawberryPlant, drawSaltPile, drawCoconutPalm, drawCornStalk, drawFiquePlant, drawGuavaTree, drawRicePlant, drawTobaccoPlant } from './Terrain.js';
import { createRng } from '../core/rng.js';
import { milestoneTier } from '../sim/rules.js';
import { PRODUCTS } from '../data/products.js';
import { formatNumber } from '../core/format.js';
import { t } from '../i18n/index.js';


// Floating tag with name and level, management-game style.
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
    // Whole tag clickable (v3.67.6): otherwise taps fell through to artwork below, and a tag
    // overlapping another station opened that station. Since tags sit on top, tag wins.
    this.hitArea = new Rectangle(-w / 2 - 2, -13, w + 4, 26);
  }
}

// Shared base: clickable container over tile footprint, with label and status icon.
export class StationView extends Container {
  constructor(x, y, w, h) {
    super();
    this.foot = { x, y, w, h };
    this.zIndex = depth(x + w, y + h) - 0.5;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Polygon(isoPoly([[x, y, 0], [x + w, y, 0], [x + w, y + h, 0], [x, y + h, 0]]));
    this.footArea = this.hitArea; // footprint terrain only (see Scene.stationAt)
    this.highlight = new Graphics();
    this.addChild(this.highlight);
    this.selected = false;
    this.status = new Text({ text: '', style: { fontSize: 22 }, resolution: 3 });
    this.status.anchor.set(0.5);
    this.status.visible = false;
    // Night lights (windows, lamps): scene places this layer over night tint.
    this.lightLayer = new Container();
    this.lights = [];
    this.lightsDirty = true;
  }

  // Rebuilds glow sprites using soft radial texture.
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

  // icon: '⛔' | '⏸️' | '↪' | null
  setStatus(icon) {
    this.status.visible = Boolean(icon);
    if (icon && this.status.text !== icon) this.status.text = icon;
  }

  // Hit area (v3.67): footprint plus everything rising above it up to height `h` (building,
  // trees), not floor alone. Previously clicking Cafetal's roof did nothing unless lower tiles were tapped.
  // lower bushes were tapped.
  setHitHeight(h) {
    const { x, y, w, h: d } = this.foot;
    const pts = [];
    for (const z of [0, h]) for (const [px, py] of [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]) {
      const p = iso(px, py, z);
      pts.push([p.x, p.y]);
    }
    this.hitArea = new Polygon(hull(pts).flat());
  }

  // Does global point hit any drawn station art (building, trees, lot sign)? Excludes
  // selection highlight (v3.67.6).
  drawnAt(global) {
    const hit = (node) => {
      if (!node.visible || node === this.highlight) return false;
      if (node instanceof Graphics && node.containsPoint(node.toLocal(global))) return true;
      return node.children?.some(hit) ?? false;
    };
    return this.children.some(hit);
  }

  // Anchor point for labels and floating effects.
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

// Zone unlimited source: Cafetal (bushes), Cañaduzal (cane), or Potrero (cows), with growing house.
export class FarmView extends StationView {
  constructor(zone, def) {
    const f = zone.farm;
    super(f.x, f.y, f.w, f.h);
    this.zoneFarm = f;
    this.theme = zone.theme;
    this.zoneStyle = zone.style; // 'barichara': Pueblo style, whitewashed stone instead (v3.5)
    this.def = def;
    this.art = new Graphics();
    this.addChild(this.art);
    this.label = new Label(def.name);
    this.tier = -1;
    this.bushes = [];
  }

  sync(state) {
    const farm = state.stations[this.def.id];
    // On Bogotá event board for another neighborhood (v4.5) Tostadero isn't present: skip drawing.
    this.visible = this.label.visible = Boolean(farm);
    if (!farm) return;
    const tier = milestoneTier(farm.level);
    if (tier !== this.tier) this.draw(tier);
    this.label.set(`${this.def.icon} ${this.def.name} · ${t('Nv')} ${farm.level}`);
    // Seasonal harvest (v3.4): while harvesting, queens swarm above ant nests.
    this.swarming = Boolean(this.def.harvest) && farm.status === 'working';
  }

  update(dt, t) {
    super.update(dt, t);
    if ((this.theme === 'cienaga' || this.theme === 'bay' || this.theme === 'lake') && this.boats) this.drawBoats(t);
    if (this.theme === 'mangrove' && this.pickers) this.drawPickers(t);
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
    if (this.theme === 'dairy' || this.theme === 'ranch' || this.theme === 'savanna' || this.theme === 'sheep' || this.theme === 'pigs') {
      this.drawPasture(g, tier, rng);
      return;
    }
    if (this.theme === 'mangrove') {
      this.drawMangrove(g, tier, rng);
      return;
    }
    // Bahía (v3.40) and Lago (v3.49): water using same fishing canoes as Ciénaga.
    if (this.theme === 'cienaga' || this.theme === 'bay' || this.theme === 'lake') {
      this.drawLagoon(g, tier, rng);
      return;
    }
    // Coffee bushes (or cane) in rows; grow taller at milestones.
    const scale = 0.75 + tier * 0.1;
    for (let gx = x; gx < x + w; gx++) {
      for (let gy = y; gy < y + h; gy++) {
        if (gx < x + 2 && gy < y + 2) continue; // house plot
        if (this.theme === 'ponds') {
          drawPondTile(g, gx, gy, x, y, rng, tier);
          continue;
        }
        // Cacao trees are larger: one per tile.
        for (const ox of this.theme === 'cacao' || this.theme === 'guava' || this.theme === 'ants' || this.theme === 'coconut' || this.theme === 'clay' || this.theme === 'palm' || this.theme === 'plantain' || this.theme === 'azotea' || this.theme === 'werregue' || this.theme === 'asai' || this.theme === 'chagra' || this.theme === 'yanchama' || this.theme === 'fruit' || this.theme === 'hides' || this.theme === 'achira' || this.theme === 'salt' ? [0.5] : [0.28, 0.75]) {
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
          else if (this.theme === 'hides') drawHideFrame(g, p.x, p.y, 0.8 + tier * 0.04, rng, (gx + gy) % 2 === 0);
          else if (this.theme === 'fruit') drawPassionVine(g, p.x, p.y, 0.75 + tier * 0.05, rng, 2 + Math.min(tier, 3));
          else if (this.theme === 'yanchama') drawYanchamaTree(g, p.x, p.y, 0.75 + tier * 0.05, rng, (gx + gy) % 3 === 0);
          else if (this.theme === 'chagra') drawYucaPlant(g, p.x, p.y, 0.8 + tier * 0.05, rng, 1 + Math.min(tier, 2));
          else if (this.theme === 'aji') drawAjiPlant(g, p.x, p.y, scale, rng, 2 + Math.min(tier, 4));
          else if (this.theme === 'achira') drawAchiraPlant(g, p.x, p.y, 0.8 + tier * 0.05, rng, 1 + Math.min(tier, 3));
          else if (this.theme === 'roses') drawRoseBush(g, p.x, p.y, 0.85 + tier * 0.04, rng, 1 + Math.min(tier, 3));
          else if (this.theme === 'strawberry') drawStrawberryPlant(g, p.x, p.y, 0.85 + tier * 0.04, rng, 1 + Math.min(tier, 3));
          else if (this.theme === 'salt') drawSaltPile(g, p.x, p.y, 0.8 + tier * 0.06, rng);
          else if (this.theme === 'asai') drawAsaiPalm(g, p.x, p.y, 0.7 + tier * 0.05, rng, Math.min(tier, 3));
          else if (this.theme === 'werregue') drawWerreguePalm(g, p.x, p.y, 0.8 + tier * 0.05, rng, tier);
          else if (this.theme === 'azotea') drawAzoteaBed(g, p.x, p.y, 0.8 + tier * 0.04, rng, tier);
          else if (this.theme === 'plantain') drawPlantainPlant(g, p.x, p.y, 0.75 + tier * 0.06, rng, Math.min(tier, 3));
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
    if (this.theme === 'roses' || this.theme === 'strawberry') this.drawGreenhouses(g, tier, this.theme === 'strawberry' ? 22 : 34);
  }

  // Flores de la Sabana (v4.4): clear greenhouses spanning rose rows, two tiles wide;
  // more rows covered at milestones. Translucent so roses stay visible inside.
  drawGreenhouses(g, tier, H = 34) {
    const { x, y, w, h } = this.zoneFarm;
    const naves = [];
    for (let gy = y; gy + 2 <= y + h; gy += 2) naves.push([gy < y + 2 ? x + 2 : x, gy]);
    for (const [k, [x0, gy]] of naves.entries()) {
      if (k > tier + 1) break;
      const arch = (gx) => [...Array(9)].map((_, i) => {
        const a = Math.PI * (i / 8);
        return iso(gx, gy + 1 - Math.cos(a) * 0.95, Math.sin(a) * H);
      });
      const start = arch(x0 + 0.05);
      const end = arch(x + w - 0.05);
      const hull = [...start, ...end.reverse()];
      g.poly(hull.flatMap((q) => [q.x, q.y])).fill({ color: 0xf2f8fb, alpha: 0.42 }).stroke({ width: 1.2, color: 0xffffff, alpha: 0.9 });
      for (let gx = x0 + 0.05; gx <= x + w; gx += 1) {
        const r = arch(gx);
        g.moveTo(r[0].x, r[0].y);
        for (const q of r.slice(1)) g.lineTo(q.x, q.y);
        g.stroke({ width: 1, color: 0xffffff, alpha: 0.85 });
      }
    }
  }

  // Ciénaga (v3.17): water, plank dock by house, and fishing canoes (more at milestones).
  // Canoes rock gently while fishermen cast nets (see drawBoats).
  drawLagoon(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    // Wooden plank dock.
    for (let k = 0; k < 6; k++) box(g, x + 2.1 + k * 0.32, y + 0.9, 0.28, 0.6, 2, k % 2 ? PAL.wood : PAL.woodDark);
    for (const [px, py] of [[2.1, 0.9], [3.95, 0.9], [2.1, 1.45], [3.95, 1.45]]) box(g, x + px, y + py, 0.06, 0.06, 3, PAL.woodDark);
    // Moored canoe by dock.
    this.boats = [{ gx: x + 3.4, gy: y + 1.85, flip: 1, phase: 0, moored: true }];
    const n = 3 + Math.min(tier, 4);
    for (let i = 0; i < 60 && this.boats.length < n + 1; i++) {
      const gx = x + 0.8 + rng() * (w - 1.6);
      const gy = y + 0.8 + rng() * (h - 1.6);
      if (gx < x + 4.4 && gy < y + 2.6) continue; // house and dock
      if (this.boats.some((b) => Math.hypot(b.gx - gx, b.gy - gy) < 1.3)) continue;
      this.boats.push({ gx, gy, flip: rng() < 0.5 ? -1 : 1, phase: rng() * 6 });
    }
    for (const b of this.boats) {
      const p = iso(b.gx, b.gy);
      this.bushes.push({ x: p.x, y: p.y - 6 });
    }
    // In Betania (v4.0), floating tilapia cages: pipe frames with net and floats (more at milestones).
    if (this.zoneStyle === 'betania') {
      const cages = [[3.2, 3.4], [4.6, 3.4], [3.2, 4.8], [4.6, 4.8], [1.8, 4.8], [1.8, 3.4]].slice(0, 2 + Math.min(tier, 4));
      for (const [cx, cy] of cages) {
        const pts = isoPoly([[x + cx - 0.5, y + cy - 0.5], [x + cx + 0.5, y + cy - 0.5], [x + cx + 0.5, y + cy + 0.5], [x + cx - 0.5, y + cy + 0.5]]);
        g.poly(pts).fill({ color: 0x2e5a50, alpha: 0.55 }).stroke({ width: 2.5, color: 0xcfd8dc });
        for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
          const q = iso(x + cx + dx, y + cy + dy);
          g.circle(q.x, q.y - 1, 2.6).fill(0xff8f00).stroke({ width: 0.6, color: 0x3a2418 });
        }
        const c = iso(x + cx, y + cy);
        g.ellipse(c.x - 5, c.y, 3, 1.2).fill({ color: 0xcfd8dc, alpha: 0.7 });
        this.bushes.push({ x: c.x, y: c.y - 4 });
      }
    }
  }

  // Canoes rock on water; fisherman throws cast net and hauls it back.
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
      // Standing fisherman with hat.
      const mx = cx - 4 * f;
      g.rect(mx - 2, cy - 11, 1.6, 9).fill(0x37474f);
      g.rect(mx + 0.6, cy - 11, 1.6, 9).fill(0x37474f);
      g.roundRect(mx - 3, cy - 19, 6, 9, 2).fill(0xf4efe6);
      g.circle(mx, cy - 21.5, 2.6).fill(0x8d5524);
      g.ellipse(mx, cy - 23.5, 5, 1.4).fill(0xf4e3b5);
      // Cast net: spreads mid-air, splashes down, then reels in.
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

  // Manglar (v3.41): mangroves along background and shores, low-tide mudflats, and piangüeras
  // digging cockles by hand into back baskets (more workers at milestones; see drawPickers).
  drawMangrove(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    for (let gx = x; gx < x + w; gx++) {
      for (let gy = y; gy < y + h; gy++) {
        if (gx < x + 2 && gy < y + 2) continue; // house
        const edge = gx === x || gy === y; // back edges first so pickers render cleanly in front
        if (edge ? rng() < 0.7 : rng() < 0.12) {
          const p = iso(gx + 0.5, gy + 0.5);
          this.bushes.push(p);
          drawMangroveTree(g, p.x, p.y, 0.85, rng);
        } else if (rng() < 0.4) {
          const p = iso(gx + rng(), gy + rng());
          g.ellipse(p.x, p.y, 2.4, 1.8).fill(0x2b2622);
        }
      }
    }
    this.pickers = [];
    const n = 3 + Math.min(tier, 4);
    for (let i = 0; i < 60 && this.pickers.length < n; i++) {
      const gx = x + 0.8 + rng() * (w - 2.2);
      const gy = y + 1.2 + rng() * (h - 2.2);
      if (gx < x + 2.4 && gy < y + 2.4) continue;
      if (this.pickers.some((b) => Math.hypot(b.gx - gx, b.gy - gy) < 1.1)) continue;
      this.pickers.push({ gx, gy, flip: rng() < 0.5 ? -1 : 1, phase: rng() * 6, shirt: [0xe5737f, 0xf2c14e, 0x4fb3bf, 0x6cbf6c][i % 4] });
    }
  }

  // Piangüeras crouched in mud with basket on back; reach down and toss shell behind.
  drawPickers(t) {
    if (!this.pickerLayer) this.addChild((this.pickerLayer = new Graphics()));
    const g = this.pickerLayer.clear();
    for (const b of this.pickers) {
      const p = iso(b.gx, b.gy);
      const f = b.flip;
      const k = (t * 0.5 + b.phase) % 1;
      const bend = k < 0.6 ? 1 : 0.4;
      g.ellipse(p.x, p.y + 1, 7, 2.5).fill({ color: 0x3a3028, alpha: 0.35 });
      g.rect(p.x - 2, p.y - 8, 1.6, 8).fill(0x3d3d5c);
      g.rect(p.x + 0.6, p.y - 8, 1.6, 8).fill(0x3d3d5c);
      const hx = p.x + 6 * f * bend;
      const hy = p.y - 14 + 4 * bend;
      g.moveTo(p.x, p.y - 8).lineTo(hx, hy).stroke({ width: 5, color: b.shirt, cap: 'round' });
      g.circle(hx + 2 * f, hy - 1, 2.6).fill(0x4e342e);
      g.ellipse(hx + 2 * f, hy - 3, 2.8, 1.4).fill(0xf7f4ee);
      // Back basket (catanga).
      g.poly([p.x - 6 * f, p.y - 16, p.x - 1 * f, p.y - 16, p.x - 2 * f, p.y - 9, p.x - 5 * f, p.y - 9]).fill(0xc8a26a).stroke({ width: 0.6, color: 0x3a2418 });
      if (k < 0.6) g.moveTo(hx, hy + 1).lineTo(hx + 3 * f, p.y - 1).stroke({ width: 1.2, color: 0x4e342e });
      else g.circle(p.x - 3.5 * f, p.y - 17 - (k - 0.6) * 8, 1.3).fill(0x2b2622);
    }
  }

  // Potrero: wooden fence, water trough, milk cans, and cows; more cows at milestones.
  drawPasture(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    // Water trough and cans by house.
    box(g, x + 2.2, y + 0.3, 1.2, 0.35, 6, 0x9aa3a8);
    const water = iso(x + 2.8, y + 0.47, 6);
    g.ellipse(water.x, water.y, 12, 3).fill(0x6fa8dc);
    if (this.theme === 'sheep') {
      // In Ruanas (v3.26), wool sacks instead of milk cans.
      for (const [cx, cy] of [[0.45, 2.3], [0.85, 2.45], [1.2, 2.3]]) {
        const p = iso(x + cx, y + cy);
        g.ellipse(p.x, p.y - 5, 7, 5.5).fill(0xece4cf).stroke(OUTLINE);
        for (const [dx, dy] of [[-3, -7], [2, -8], [0, -4]]) g.circle(p.x + dx, p.y + dy, 2).fill(0xfbfaf6);
      }
    } else if (this.theme === 'pigs') {
      // In Lechonería (v4.0), wooden pig trough and big mud puddle.
      box(g, x + 0.3, y + 2.2, 1.1, 0.3, 5, PAL.wood);
      g.poly(isoPoly([[x + 0.35, y + 2.25, 5], [x + 1.35, y + 2.25, 5], [x + 1.35, y + 2.45, 5], [x + 0.35, y + 2.45, 5]])).fill(0xd9b65a);
      const mud = iso(x + w * 0.6, y + h * 0.55);
      g.ellipse(mud.x, mud.y, 40, 16).fill({ color: 0x6b4a2e, alpha: 0.85 });
      g.ellipse(mud.x - 6, mud.y - 2, 14, 4).fill({ color: 0x8d6e4a, alpha: 0.6 });
    } else if (this.theme === 'ranch') {
      // In Hato, wooden cattle salt trough instead of cans.
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
      if (gx < x + 2.6 && gy < y + 2.8) continue; // house plot
      if (cows.some(([cx, cy]) => Math.hypot(cx - gx, cy - gy) < 0.9)) continue;
      cows.push([gx, gy]);
    }
    // Cows roam pasture (see Critters.js); here tracks count and milk jump origin.
    this.cowCount = cows.length;
    for (const [gx, gy] of cows) {
      const p = iso(gx, gy);
      this.bushes.push({ x: p.x, y: p.y - 4 });
    }
    // Fence around pasture (in front of cows).
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

  // Pueblo plaza: corner Casa del café with outdoor tables, central fountain,
  // guayacán trees, benches, streetlamps, and crowd. Milestones add tables and floors.
  drawPlaza(g, tier, rng) {
    const { x, y, w, h } = this.zoneFarm;
    const look = PLAZA_HOUSE[this.zoneFarm.look ?? this.zoneStyle ?? 'pueblo'];
    this.lights = drawCoffeeHouse(g, x, y, tier, look);
    // Umbrella tables outside café: origin of popping single-origin coffee.
    const tables = [[0.6, 2.6], [1.5, 2.7], [2.6, 0.6], [2.7, 1.5], [2.5, 2.5], [0.6, 3.5], [3.5, 0.6]].slice(0, 3 + Math.min(tier, 4));
    for (const [tx, ty] of tables) {
      // (v5.20) In La plaza de las fiestas: candle racks or sacks of corn instead of café tables.
      if (look.props) {
        const p = iso(x + tx, y + ty);
        shadow(g, p.x, p.y + 1, 12, 5);
        if (look.props === 'candles') {
          g.rect(p.x - 9, p.y - 22, 2, 22).fill(PAL.woodDark);
          g.rect(p.x + 7, p.y - 22, 2, 22).fill(PAL.woodDark);
          g.rect(p.x - 9, p.y - 23, 18, 2).fill(PAL.wood);
          for (let k = 0; k < 5; k++) g.roundRect(p.x - 6.5 + k * 3, p.y - 21, 2, 9 + (k % 2) * 2, 1).fill(0xfffde7).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.4 });
        } else if (look.props === 'firewood') {
          for (let row = 0; row < 3; row++) {
            for (let k = 0; k < 4 - row; k++) {
              const lx = p.x - 7 + row * 2.4 + k * 4.6;
              const ly = p.y - 3 - row * 4;
              g.ellipse(lx, ly, 2.4, 2).fill(0x8d6e63).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.6 });
              g.ellipse(lx, ly, 1.2, 1).fill(0xd7b98a);
            }
          }
        } else if (look.props === 'flowers') {
          const colors = [0xe91e63, 0xfdd835, 0xffffff, 0xe53935, 0x8e24aa];
          for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5]]) {
            g.poly([p.x + dx - 4, p.y + dy - 8, p.x + dx + 4, p.y + dy - 8, p.x + dx + 3, p.y + dy, p.x + dx - 3, p.y + dy]).fill(0x90a4ae).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
            for (let k = 0; k < 4; k++) g.circle(p.x + dx - 3 + k * 2, p.y + dy - 10 - (k % 2) * 2, 1.8).fill(colors[(k + Math.floor(rng() * 5)) % 5]);
          }
        } else if (look.props === 'hammocks') {
          g.rect(p.x - 12, p.y - 22, 2, 22).fill(PAL.woodDark);
          g.rect(p.x + 10, p.y - 22, 2, 22).fill(PAL.woodDark);
          const colors = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047];
          const c = colors[Math.floor(rng() * 4)];
          g.moveTo(p.x - 10, p.y - 18).quadraticCurveTo(p.x, p.y - 2, p.x + 10, p.y - 18).quadraticCurveTo(p.x, p.y - 8, p.x - 10, p.y - 18).fill(c).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
          for (let k = 0; k < 4; k++) g.rect(p.x - 6 + k * 4, p.y - 12 + Math.abs(k - 1.5) * 1.5, 1.4, 3).fill(0xffffff);
        } else if (look.props === 'masks') {
          g.rect(p.x - 1, p.y - 26, 2, 26).fill(PAL.woodDark);
          g.rect(p.x - 10, p.y - 25, 20, 2).fill(PAL.wood);
          const colors = [0x1e88e5, 0xe53935, 0x43a047, 0xfdd835];
          for (const [dx, dy, k] of [[-6, -19, 0], [6, -19, 1], [-6, -10, 2], [6, -10, 3]]) {
            g.ellipse(p.x + dx, p.y + dy, 4.5, 3.6).fill(colors[(k + Math.floor(rng() * 4)) % 4]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
            g.circle(p.x + dx - 1.6, p.y + dy - 0.6, 0.9).fill(0xffffff);
            g.circle(p.x + dx + 1.6, p.y + dy - 0.6, 0.9).fill(0xffffff);
          }
        } else if (look.props === 'costumes') {
          g.rect(p.x - 9, p.y - 24, 2, 24).fill(0x555555);
          g.rect(p.x + 7, p.y - 24, 2, 24).fill(0x555555);
          g.rect(p.x - 9, p.y - 25, 18, 2).fill(0x777777);
          const colors = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0x8e24aa];
          for (let k = 0; k < 4; k++) g.poly([p.x - 7 + k * 4, p.y - 23, p.x - 4.4 + k * 4, p.y - 23, p.x - 3.4 + k * 4, p.y - 10, p.x - 8 + k * 4, p.y - 10]).fill(colors[(k + Math.floor(rng() * 5)) % 5]).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
        } else {
          for (const [dx, dy] of [[-5, 0], [5, 0], [0, -6]]) {
            g.ellipse(p.x + dx, p.y + dy - 5, 6, 5.5).fill(PAL.sack).stroke(OUTLINE);
            g.ellipse(p.x + dx, p.y + dy - 9, 3.5, 1.8).fill(0xf6d36b);
          }
        }
        this.bushes.push({ x: p.x, y: p.y + 4 });
        continue;
      }
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
    // Strolling townsfolk placed by Critters (more at milestones).
    this.peopleCount = 4 + tier * 2;
  }

  // Random point above a coffee bush (for popping cherries).
  randomBushTop(rng = Math.random) {
    const p = this.bushes[Math.floor(rng() * this.bushes.length)];
    return p ? { x: p.x, y: p.y - 14 } : this.anchorPoint(20);
  }
}

// Pueblo Casa del café: corner mansion with awning and sign; milestones add second floor
// with balcony, colorful trim, and finally third floor. Returns night lights.
const PLAZA_HOUSE = {
  pueblo: { wall: 0xf6d860, trims: [PAL.balconyGreen, PAL.balconyBlue, PAL.balconyRed, PAL.balconyYellow, 0x8e44ad, 0xffd700], awning: PAL.balconyRed, sign: 'cup' },
  // Barichara (v3.5): tapia blanca, puertas y balcones verdes o azules, toldo verde.
  barichara: { wall: 0xf7f4ee, trims: [0x2f7d4f, 0x2f7d4f, 0x2e6fd1, 0x2f7d4f, 0x8e44ad, 0xffd700], awning: 0x2f7d4f, sign: 'sweet' },
  // Salento (v3.12): white facade with vibrant colorful trim, Calle Real style.
  // Cartagena (v3.20): yellow colonial house with wooden balconies and green awning.
  cartagena: { wall: 0xf6c244, trims: [0x7a4a22, 0x7a4a22, 0x2f7d4f, 0x7a4a22, 0xd63384, 0xffd700], awning: 0x2f7d4f, sign: 'cup' },
  // Villa de Leyva (v3.27): whitewashed house with green balconies.
  villa: { wall: 0xfbf8f1, trims: [0x2f7d4f, 0x2f7d4f, 0x1f5a38, 0x2f7d4f, 0x8e44ad, 0xffd700], awning: 0x2f7d4f, sign: 'cup' },
  // Villavicencio (v3.36): yellow house with colorful trim and green awning.
  villavo: { wall: 0xf6d860, trims: [0x2e6fd1, 0xd7263d, 0x2f7d4f, 0x2e6fd1, 0x8e44ad, 0xffd700], awning: 0x2f7d4f, sign: 'cup' },
  salento: { wall: 0xfbf8f1, trims: [0xd7263d, 0x2e6fd1, 0x2fa36b, 0xf07f1d, 0x8e44ad, 0xf2b705], awning: 0xd7263d, sign: 'cup' },
  // Buenaventura (v3.43): turquoise house with colorful trim and orange awning.
  buenaventura: { wall: 0x4fb3bf, trims: [0xf2c14e, 0xe5737f, 0xf7f4ee, 0xf2c14e, 0x8e44ad, 0xffd700], awning: 0xf08a3c, sign: 'cup' },
  // Leticia (v3.52): açaí ice cream shop, seafoam green with purple trim, awning, and cone sign.
  // Neiva (v4.0): riverfront café, white with red and yellow San Pedro trim.
  neiva: { wall: 0xfbf8f1, trims: [0xd7263d, 0xf2c14e, 0x2f7d4f, 0xd7263d, 0x8e44ad, 0xffd700], awning: 0xd7263d, sign: 'cup' },
  // Bogotá (v4.5): Chorro de Quevedo coffee roastery, sky blue house with red and green trim.
  bogota: { wall: 0x8ec5e8, trims: [0xd7263d, 0x2f7d4f, 0xf2c94c, 0xd7263d, 0x8e44ad, 0xffd700], awning: 0xd7263d, sign: 'cup' },
  // Special zone (v5.5): turquoise island house with white gingerbread trim and a mango awning.
  sanandres: { wall: 0x4dd0e1, trims: [0xffffff, 0xfdd835, 0xf48fb1, 0xffffff, 0x8e44ad, 0xffd700], awning: 0xf4a261, sign: 'cup' },
  leticia: { wall: 0x8fd3c4, trims: [0x7b1fa2, 0xf2c14e, 0x2e7d32, 0x7b1fa2, 0xe5737f, 0xffd700], awning: 0x7b1fa2, sign: 'icecream' },
  // La plaza de las fiestas (v5.20): the Cerería (cream, candle sign, candle racks outside) and the corn mill (white,
  // corn sign, millstone and corn sacks outside), chosen by the plaza's `look`.
  velitas: { wall: 0xfff3c4, trims: [0xb71c1c, 0x2e7d32, 0xf9a825, 0xb71c1c, 0x8e44ad, 0xffd700], awning: 0xb71c1c, sign: 'candle', props: 'candles' },
  navidad: { wall: 0xfbf8f1, trims: [0x2e7d32, 0xc62828, 0xf9a825, 0x2e7d32, 0x8e44ad, 0xffd700], awning: 0x2e7d32, sign: 'corn', props: 'corn' },
  // (v5.21) The costume workshop of Pasto's carnival: a mask sign and racks of colorful costumes outside.
  negros_blancos: { wall: 0xfff8e1, trims: [0x8e24aa, 0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xffd700], awning: 0x8e24aa, sign: 'mask', props: 'costumes' },
  // (v5.21) Barranquilla's mask workshop: a yellow house with a carnival-mask sign and racks of painted masks.
  // (v5.21) Valledupar's music school: a white house with an accordion sign and hammocks hung outside.
  vallenato: { wall: 0xfbf8f1, trims: [0xc62828, 0x2e7d32, 0xfdd835, 0xc62828, 0x8e44ad, 0xffd700], awning: 0xc62828, sign: 'accordion', props: 'hammocks' },
  // (v5.21) The market of the plaza on Mother's Day: a pink house with a flower sign and buckets of flowers outside.
  dia_madre: { wall: 0xfce4ec, trims: [0xe91e63, 0x43a047, 0xfdd835, 0xe91e63, 0x8e44ad, 0xffd700], awning: 0xe91e63, sign: 'flower', props: 'flowers' },
  // (v5.21) The woodcutter of San Pedro: a white house with a straw-hat sign and piles of firewood outside.
  san_pedro: { wall: 0xfbf8f1, trims: [0xd7263d, 0xf2c14e, 0x2f7d4f, 0xd7263d, 0x8e44ad, 0xffd700], awning: 0xd7263d, sign: 'hat', props: 'firewood' },
  barranquilla: { wall: 0xfdd835, trims: [0xe53935, 0x1e88e5, 0x43a047, 0xe53935, 0x8e24aa, 0xffd700], awning: 0x1e88e5, sign: 'carnival', props: 'masks' },
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
  // Doors on both street facades and striped awning over front.
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
  // Signboard with cup icon (or bocadillo, or ice cream).
  const s = iso(ox + w / 2, oy + d, 26);
  g.roundRect(s.x - 15, s.y - 7, 30, 13, 3).fill(PAL.woodDark).stroke(OUTLINE);
  if (look.sign === 'icecream') {
    g.poly([s.x - 3, s.y - 1, s.x + 3, s.y - 1, s.x, s.y + 5]).fill(0xe0a95a);
    g.circle(s.x, s.y - 2.5, 3.4).fill(0x7b1fa2);
  } else if (look.sign === 'candle') {
    g.rect(s.x - 2, s.y - 3, 4, 8).fill(0xfffde7);
    g.ellipse(s.x, s.y - 5, 1.6, 2.6).fill(0xffb300);
  } else if (look.sign === 'mask') {
    g.ellipse(s.x, s.y, 7, 4.6).fill(0xfafafa);
    g.poly([s.x, s.y - 4.6, s.x - 7, s.y, s.x, s.y + 4.6]).fill(0x212121);
    g.circle(s.x - 3, s.y - 0.6, 1.1).fill(0xfafafa);
    g.circle(s.x + 3, s.y - 0.6, 1.1).fill(0x212121);
  } else if (look.sign === 'hat') {
    g.ellipse(s.x, s.y + 1.5, 8, 2.4).fill(0xf3d27a);
    g.ellipse(s.x, s.y - 1, 4, 3).fill(0xe8c063);
    g.rect(s.x - 4, s.y - 0.5, 8, 1.2).fill(0xd7263d);
  } else if (look.sign === 'flower') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.circle(s.x + Math.cos(a) * 3, s.y + Math.sin(a) * 3, 2).fill(0xe91e63);
    }
    g.circle(s.x, s.y, 1.6).fill(0xfdd835);
  } else if (look.sign === 'accordion') {
    g.rect(s.x - 7, s.y - 4, 3, 8).fill(0x6d4c41);
    g.rect(s.x + 4, s.y - 4, 3, 8).fill(0x6d4c41);
    g.rect(s.x - 4, s.y - 3.5, 8, 7).fill(0xc62828);
    for (let k = 0; k < 3; k++) g.rect(s.x - 3 + k * 2.6, s.y - 3.5, 0.8, 7).fill(0x7f0000);
  } else if (look.sign === 'carnival') {
    g.ellipse(s.x, s.y, 7.5, 4.6).fill(0xfdd835);
    g.ellipse(s.x - 3.5, s.y - 0.6, 2.2, 1.4).fill(0xe53935);
    g.ellipse(s.x + 3.5, s.y - 0.6, 2.2, 1.4).fill(0x1e88e5);
    g.poly([s.x - 1, s.y + 0.5, s.x + 1, s.y + 0.5, s.x, s.y + 4.6]).fill(0x43a047);
  } else if (look.sign === 'corn') {
    g.ellipse(s.x, s.y + 0.5, 3, 5.5).fill(0xf6d36b);
    g.poly([s.x - 1, s.y + 5, s.x - 7, s.y - 2, s.x - 3, s.y + 6]).fill(0x7cb342);
    g.poly([s.x + 1, s.y + 5, s.x + 7, s.y - 2, s.x + 3, s.y + 6]).fill(0x7cb342);
  } else if (look.sign === 'sweet') {
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
    // Hanging flower pots along facade.
    for (const at of [0.15, 0.9, 1.65]) {
      const q = iso(ox + at, oy + d + 0.05, 20);
      g.circle(q.x, q.y, 3.5).fill(0x4e8a33);
      g.circle(q.x - 1.5, q.y - 1, 1.4).fill(0xe07a5f);
      g.circle(q.x + 1.5, q.y - 1.5, 1.4).fill(0xffffff);
    }
  }
  return lights;
}

// Coffee farmer house; expands at milestones (GDD §8: visual evolution).
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
    // Second-floor balcony.
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
    this.label = new Label(t('Bodega'));
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
    // Wide wooden gate on front facade.
    const f = 0.55;
    g.poly(isoPoly([[ox + f, oy + D, 0], [ox + f + 0.8, oy + D, 0], [ox + f + 0.8, oy + D, 26], [ox + f, oy + D, 26]])).fill(PAL.wood).stroke(OUTLINE);
    const m1 = iso(ox + f + 0.4, oy + D, 0);
    const m2 = iso(ox + f + 0.4, oy + D, 26);
    g.moveTo(m1.x, m1.y).lineTo(m2.x, m2.y).stroke({ width: 1.5, color: PAL.woodDark });
    // Windows with yellow balcony.
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
    // Lantern over yard door.
    const lamp = iso(ox + 0.4, oy + D + 0.15, 30);
    g.rect(lamp.x - 1, lamp.y, 2, 30).fill(0x2b2b2b);
    g.rect(lamp.x - 3.5, lamp.y - 7, 7, 7).fill(0xffd27a).stroke({ width: 1, color: 0x2b2b2b });
    this.lights.push({ x: lamp.x, y: lamp.y - 3, r: 28 });
    // Bunting banners (Renown decoration, v2.2): strung from lantern to opposite corner pole.
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
    const sign = new Text({ text: t('Bodega').toUpperCase(), style: { fontFamily: FONT, fontSize: 9, fontWeight: '700', fill: 0xfff3d6 }, resolution: 3 });
    sign.anchor.set(0.5);
    sign.position.set(s.x, s.y - 0.5);
    sign.skew.set(0, 0.46);
    if (sign.width > 40) sign.scale.x = 40 / sign.width; // «WAREHOUSE» is wider than «BODEGA»
    this.addChild(sign);
  }

  // Sacks stacked in yard reflecting warehouse stock. `zone` is zone state.
  sync(zone, capacity) {
    const stock = Object.values(zone.warehouse).reduce((a, b) => a + b, 0);
    const n = stock <= 0 ? 0 : Math.min(9, Math.ceil((stock / capacity) * 9));
    this.label.set(`🚙 ${t('Bodega')} · ${t('Nv')} ${zone.dispatch.level}`);
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

// Unbuilt station lot: fence, signpost, and price.
export class PlotView extends StationView {
  constructor(plot, def) {
    super(plot.x, plot.y, 3, 3);
    this.plot = plot;
    this.def = def;
    const g = new Graphics();
    this.glow = new Graphics();
    this.addChild(this.glow, g);
    const { x, y } = plot;
    // Fence posts.
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
    // Signpost with icon and price.
    const s = iso(x + 1.5, y + 1.5);
    this.post = new Graphics();
    this.post.rect(s.x - 1.5, s.y - 26, 3, 26).fill(PAL.woodDark);
    this.post.roundRect(s.x - 26, s.y - 48, 52, 26, 5).fill(PAL.wood).stroke(OUTLINE);
    this.addChild(this.post);
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

  // quote: result of quoteUnlock.
  sync(quote) {
    // On Bogotá event boards, lots from other neighborhoods appear unlabelled (v4.5).
    this.label.visible = this.post.visible = this.sign.visible = quote.reason !== 'event';
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

// Convex hull of 2D points [x, y] (monotone chain).
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out.at(-2), out.at(-1), q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half([...p].reverse())];
}

