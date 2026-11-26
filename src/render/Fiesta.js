// Fiesta decorations on the map (v5.17): what the real calendar's fiestas put up in every zone (sim/fiestas.js:
// decorOn), event boards included. Pure drawing, rebuilt when the date's decor or the built stations change.
//   lights:   strings of colored bulbs on every building and the warehouse (Christmas lights), glowing at night.
//   tree:     a Christmas tree beside the zone sign.        manger: a nativity scene next to it.
//   kings:    the three wise men arriving at the manger (Día de Reyes).
//   candles:  candles and paper lanterns along the mule path and the road (Noche de las Velitas).
//   old_year: the stuffed «año viejo» doll in a chair by the warehouse.   fireworks: bursts in the night sky.
//   streamers: (v5.21) paper bunting and curled streamers on every building (Carnaval de Negros y Blancos).
//   talc:      (v5.21) puffs of talcum powder drifting up along the paths, by day.
//   confetti:  (v5.21) bits of colored paper falling over the paths (Carnaval de Barranquilla).
//   notes:     (v5.21) music notes rising over the paths (Festival Vallenato).
//   flowers:   (v5.21) pots of flowers along the paths and beside every door (Día de la Madre).
//   flags:     (v5.21) a Colombian flag on every building and tricolor bunting (20 de julio, 7 de agosto).
//   hearts:    (v5.21) hearts floating up over the paths (Amor y Amistad).
//   pumpkins:  (v5.21) carved pumpkins along the paths and at every door, lit at night (Halloween).
//   palms:     (v5.21) purple drapes on every building and woven palm fronds at every door (Semana Santa).
//   procession:(v5.21) a «paso» on its bearers' shoulders, with flowers, candles and hooded nazarenos ahead.
//   silleta:   (v5.21) a silletero carrying a round silleta of flowers on his back, and another on its stand
//              (Feria de las Flores, with the flower pots).
//   kites:     (v5.21) kites flying high over the zone on long strings, by day (August, the month of the winds).
import { Container, Graphics, Sprite } from 'pixi.js';
import { iso, depth } from './iso.js';
import { PAL } from './palette.js';

const OUTLINE = PAL.outline;
import { ZONE_SIGN } from './Terrain.js';
import { pathLength, pointAt } from '../core/path.js';
import { decorOn, today } from '../sim/fiestas.js';
import { FarmView, PlotView, WarehouseView } from './Stations.js';

const BULBS = [0xe53935, 0x43a047, 0xfdd835, 0x1e88e5, 0xffffff, 0xff7043];
const CHECK = 5; // seconds between checks of the date and of the built stations

export class FiestaDecor {
  constructor(scene) {
    this.scene = scene;
    this.key = null;
    this.items = []; // drawn in the depth-sorted objects
    this.glows = []; // { sprite, phase, base } in the night lights (additive)
    this.sparks = []; // firework particles
    this.fireworks = false;
    this.checkIn = 0;
    this.sky = new Graphics();
    this.sky.blendMode = 'add';
    scene.lights.addChild(this.sky);
    // Talc clouds (v5.21): above the map, by day too.
    this.air = new Graphics();
    this.air.zIndex = 1e9;
    scene.objects.addChild(this.air);
    this.talc = false;
    this.confetti = false;
    this.notes = false;
    this.puffs = [];
    this.bits = [];
    this.tunes = [];
    this.kiteList = [];
    this.sync();
  }

  // Rebuilds when the date's decorations or the built stations change.
  sync() {
    // (v5.19) La plaza de las fiestas wears its fiesta's decorations whatever the date.
    const decor = this.scene.zone.decor ? new Set(this.scene.zone.decor) : decorOn(today());
    const built = Object.entries(this.scene.stations).filter(([, v]) => !(v instanceof PlotView)).map(([id]) => id);
    const key = `${[...decor].sort().join(',')}|${built.sort().join(',')}`;
    if (key === this.key) return;
    this.key = key;
    this.clear();
    if (!decor.size) return;
    if (decor.has('lights')) this.lights();
    if (decor.has('candles')) this.candles();
    const spot = decor.has('tree') || decor.has('manger') || decor.has('kings') ? this.freeSpot() : null;
    if (spot && decor.has('tree')) this.tree(spot.gx, spot.gy);
    if (spot && decor.has('manger')) this.manger(spot.gx + 1.6, spot.gy + 0.2, decor.has('kings'));
    if (decor.has('old_year')) this.oldYear();
    if (decor.has('streamers')) this.streamers();
    if (decor.has('flowers')) this.flowers();
    if (decor.has('flags')) this.flags();
    if (decor.has('pumpkins')) this.pumpkins();
    if (decor.has('palms')) this.palms();
    const spot2 = decor.has('procession') || decor.has('silleta') ? this.freeSpot() : null;
    if (spot2 && decor.has('procession')) this.procession(spot2.gx, spot2.gy);
    if (spot2 && decor.has('silleta')) this.silleta(spot2.gx, spot2.gy);
    if (decor.has('kites')) this.kites();
    this.fireworks = decor.has('fireworks');
    this.talc = decor.has('talc');
    this.confetti = decor.has('confetti');
    this.notes = decor.has('notes');
    this.hearts = decor.has('hearts');
  }

  clear() {
    for (const item of this.items) item.destroy({ children: true });
    for (const { sprite } of this.glows) sprite.destroy();
    this.items = [];
    this.glows = [];
    this.fireworks = false;
    this.sparks = [];
    this.sky.clear();
    this.talc = false;
    this.confetti = false;
    this.notes = false;
    this.hearts = false;
    this.kiteList = [];
    this.puffs = [];
    this.bits = [];
    this.tunes = [];
    this.air.clear();
  }

  add(g, gx, gy) {
    g.zIndex = depth(gx, gy);
    this.scene.objects.addChild(g);
    this.items.push(g);
    return g;
  }

  glow(x, y, r, color, phase = 0) {
    const s = new Sprite(this.scene.lightTexture);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.scale.set(r / 32);
    s.tint = color;
    s.blendMode = 'add';
    this.scene.lights.addChild(s);
    this.glows.push({ sprite: s, phase, base: 1 });
  }

  // A drooping string of bulbs from a to b (screen points), with its glows.
  garland(g, a, b, sag, k0 = 0) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };
    g.moveTo(a.x, a.y).quadraticCurveTo(mid.x, mid.y, b.x, b.y).stroke({ width: 1.2, color: 0x2e3b2b, alpha: 0.9 });
    const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 9));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y;
      const color = BULBS[(i + k0) % BULBS.length];
      g.circle(x, y + 1.5, 2).fill(color).stroke({ width: 0.6, color: OUTLINE, alpha: 0.6 });
      this.glow(x, y + 1.5, 9, color, (i + k0) % 2);
    }
  }

  // Christmas lights along the two front edges of every building and of the warehouse.
  lights() {
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView || view instanceof FarmView) continue;
      const { x, y, w, h } = view.foot;
      const z = view instanceof WarehouseView ? 34 : 30;
      const left = iso(x + 0.15, y + h, z);
      const corner = iso(x + w, y + h, z);
      const right = iso(x + w, y + 0.15, z);
      const g = this.add(new Graphics(), x + w, y + h + 0.1);
      this.garland(g, left, corner, 7, 0);
      this.garland(g, corner, right, 7, 3);
    }
  }

  // A drooping line of paper pennants from a to b (screen points), in carnival colors.
  bunting(g, a, b, sag, k0 = 0) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };
    g.moveTo(a.x, a.y).quadraticCurveTo(mid.x, mid.y, b.x, b.y).stroke({ width: 1, color: 0x5d4037, alpha: 0.9 });
    const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 7));
    for (let i = 0; i < n; i++) {
      const at = (t) => ({
        x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x,
        y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y,
      });
      const p = at(i / n);
      const q = at((i + 0.8) / n);
      g.poly([p.x, p.y, q.x, q.y, (p.x + q.x) / 2, (p.y + q.y) / 2 + 6]).fill(BULBS[(i + k0) % BULBS.length]).stroke({ width: 0.5, color: OUTLINE, alpha: 0.5 });
    }
  }

  // Carnival bunting along the two front edges of every building and the warehouse, with curled streamers.
  streamers() {
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView || view instanceof FarmView) continue;
      const { x, y, w, h } = view.foot;
      const z = view instanceof WarehouseView ? 34 : 30;
      const left = iso(x + 0.15, y + h, z);
      const corner = iso(x + w, y + h, z);
      const right = iso(x + w, y + 0.15, z);
      const g = this.add(new Graphics(), x + w, y + h + 0.1);
      this.bunting(g, left, corner, 6, 0);
      this.bunting(g, corner, right, 6, 2);
      // Curled streamers hanging from the corner.
      for (let k = 0; k < 3; k++) {
        const c = BULBS[(k * 2) % BULBS.length];
        const x0 = corner.x - 4 + k * 4;
        g.moveTo(x0, corner.y).bezierCurveTo(x0 + 4, corner.y + 5, x0 - 4, corner.y + 9, x0 + 2, corner.y + 14).stroke({ width: 1.4, color: c });
      }
    }
  }

  // Carved pumpkins on both sides of the mule path and one at each building's door, glowing at night.
  pumpkins() {
    const pumpkin = (gx, gy, k) => {
      const g = this.add(new Graphics(), gx, gy);
      const p = iso(gx, gy);
      const r = 3.4 + (k % 3) * 0.6;
      g.ellipse(p.x, p.y - r, r * 1.3, r).fill(0xfb8c00).stroke({ width: 0.6, color: OUTLINE, alpha: 0.7 });
      g.rect(p.x - 0.5, p.y - 2 * r - 1.6, 1, 2).fill(0x558b2f);
      g.poly([p.x - 2.4, p.y - r - 0.6, p.x - 0.8, p.y - r - 0.6, p.x - 1.6, p.y - r - 2]).fill(0xffeb3b);
      g.poly([p.x + 0.8, p.y - r - 0.6, p.x + 2.4, p.y - r - 0.6, p.x + 1.6, p.y - r - 2]).fill(0xffeb3b);
      g.rect(p.x - 1.8, p.y - r + 0.8, 3.6, 0.9).fill(0xffeb3b);
      this.glow(p.x, p.y - r, 10, 0xffa000, k % 2);
    };
    const road = this.scene.zone.muleRoad;
    const len = pathLength(road);
    let k = 0;
    for (let s = 1.2; s < len - 0.6; s += 2.8) {
      const p = pointAt(road, s / len);
      const d = Math.hypot(p.dx, p.dy) || 1;
      const side = k % 2 ? 1 : -1;
      pumpkin(p.gx + (-p.dy / d) * 0.65 * side, p.gy + (p.dx / d) * 0.65 * side, k++);
    }
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView) continue;
      const { x, y, h } = view.foot;
      pumpkin(x + 0.35, y + h + 0.3, k++);
    }
  }

  // A small Colombian flag on a pole at the corner of every building and the warehouse, with tricolor bunting.
  flags() {
    const TRI = [0xfcd116, 0x003893, 0xce1126];
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView || view instanceof FarmView) continue;
      const { x, y, w, h } = view.foot;
      const z = view instanceof WarehouseView ? 34 : 30;
      const left = iso(x + 0.15, y + h, z);
      const corner = iso(x + w, y + h, z);
      const g = this.add(new Graphics(), x + w, y + h + 0.1);
      const mid = { x: (left.x + corner.x) / 2, y: (left.y + corner.y) / 2 + 6 };
      g.moveTo(left.x, left.y).quadraticCurveTo(mid.x, mid.y, corner.x, corner.y).stroke({ width: 1, color: 0x5d4037 });
      const n = Math.max(3, Math.round(Math.hypot(corner.x - left.x, corner.y - left.y) / 7));
      for (let i = 0; i < n; i++) {
        const tt = (i + 0.4) / n;
        const px = (1 - tt) * (1 - tt) * left.x + 2 * (1 - tt) * tt * mid.x + tt * tt * corner.x;
        const py = (1 - tt) * (1 - tt) * left.y + 2 * (1 - tt) * tt * mid.y + tt * tt * corner.y;
        g.poly([px - 2.5, py, px + 2.5, py, px, py + 5]).fill(TRI[i % 3]);
      }
      // The flag on its pole.
      const base = iso(x + w + 0.1, y + h + 0.1);
      g.rect(base.x - 0.6, base.y - 40, 1.2, 40).fill(0x9e9e9e);
      g.rect(base.x + 0.6, base.y - 40, 12, 3.5).fill(TRI[0]);
      g.rect(base.x + 0.6, base.y - 36.5, 12, 1.8).fill(TRI[1]);
      g.rect(base.x + 0.6, base.y - 34.7, 12, 1.8).fill(TRI[2]);
    }
  }

  // Flower pots on both sides of the mule path, every few tiles, and one beside each building.
  flowers() {
    const colors = [0xe91e63, 0xfdd835, 0xffffff, 0xe53935, 0x8e24aa, 0xff7043];
    const pot = (gx, gy, k) => {
      const g = this.add(new Graphics(), gx, gy);
      const p = iso(gx, gy);
      g.poly([p.x - 3.5, p.y - 6, p.x + 3.5, p.y - 6, p.x + 2.6, p.y, p.x - 2.6, p.y]).fill(0xb5512e).stroke({ width: 0.6, color: OUTLINE, alpha: 0.7 });
      g.circle(p.x, p.y - 8.5, 3.6).fill(0x4e8a33);
      for (let i = 0; i < 3; i++) g.circle(p.x - 2.4 + i * 2.4, p.y - 9.5 - (i % 2) * 2, 1.6).fill(colors[(k + i) % colors.length]);
    };
    const road = this.scene.zone.muleRoad;
    const len = pathLength(road);
    let k = 0;
    for (let s = 1.2; s < len - 0.6; s += 2.4) {
      const p = pointAt(road, s / len);
      const d = Math.hypot(p.dx, p.dy) || 1;
      for (const side of [-1, 1]) pot(p.gx + (-p.dy / d) * 0.65 * side, p.gy + (p.dx / d) * 0.65 * side, k++);
    }
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView) continue;
      const { x, y, h } = view.foot;
      pot(x + 0.2, y + h + 0.25, k++);
    }
  }

  // Semana Santa: a purple drape along the front edges of every building and the warehouse, and a bundle of woven
  // palm fronds (the Palm Sunday «ramos») beside each door.
  palms() {
    const PURPLE = 0x6a1b9a;
    const drape = (g, a, b, sag) => {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + sag };
      g.moveTo(a.x, a.y).quadraticCurveTo(mid.x, mid.y, b.x, b.y).lineTo(a.x, a.y).fill(PURPLE).stroke({ width: 0.6, color: OUTLINE, alpha: 0.6 });
      g.moveTo(a.x, a.y).quadraticCurveTo(mid.x, mid.y, b.x, b.y).stroke({ width: 1, color: 0xfdd835, alpha: 0.9 });
    };
    const frond = (gx, gy) => {
      const g = this.add(new Graphics(), gx, gy);
      const p = iso(gx, gy);
      for (const [dx, h] of [[-2.5, 13], [0, 16], [2.5, 12]]) {
        g.moveTo(p.x, p.y).quadraticCurveTo(p.x + dx * 1.6, p.y - h * 0.6, p.x + dx * 2.2, p.y - h).stroke({ width: 1.6, color: 0xc0ca33 });
      }
      g.rect(p.x - 1.6, p.y - 4, 3.2, 1.4).fill(0xffffff);
    };
    for (const view of Object.values(this.scene.stations)) {
      if (view instanceof PlotView) continue;
      const { x, y, w, h } = view.foot;
      if (!(view instanceof FarmView)) {
        const z = view instanceof WarehouseView ? 34 : 30;
        const g = this.add(new Graphics(), x + w, y + h + 0.1);
        drape(g, iso(x + 0.15, y + h, z), iso(x + w, y + h, z), 7);
        drape(g, iso(x + w, y + h, z), iso(x + w, y + 0.15, z), 7);
      }
      frond(x + 0.35, y + h + 0.3);
    }
  }

  // Semana Santa: a «paso» (a float with a robed figure among white flowers and candles) carried by four bearers, with
  // two hooded nazarenos in purple walking ahead.
  procession(gx, gy) {
    const g = this.add(new Graphics(), gx + 1.6, gy + 0.8);
    const p = iso(gx + 1, gy + 0.4);
    // The bearers under the float.
    for (const dx of [-12, -4, 4, 12]) {
      g.rect(p.x + dx - 2, p.y - 12, 4, 12).fill(0x37474f);
      g.circle(p.x + dx, p.y - 14, 2).fill(0xffe0b2);
    }
    // The float: a gilded platform with flowers and four candles.
    g.poly([p.x - 18, p.y - 16, p.x + 18, p.y - 16, p.x + 16, p.y - 21, p.x - 16, p.y - 21]).fill(0xc9a227).stroke({ width: 0.8, color: OUTLINE });
    for (let i = 0; i < 7; i++) g.circle(p.x - 13 + i * 4.3, p.y - 22.5 - (i % 2), 1.8).fill(0xffffff);
    for (const dx of [-15, -8, 8, 15]) {
      g.rect(p.x + dx - 0.8, p.y - 30, 1.6, 8).fill(0xfafafa);
      g.ellipse(p.x + dx, p.y - 31.5, 1, 1.8).fill(0xffa726);
      this.glow(p.x + dx, p.y - 31, 10, 0xffcc80, dx > 0 ? 1 : 0);
    }
    // The robed figure.
    g.poly([p.x - 5, p.y - 22, p.x, p.y - 40, p.x + 5, p.y - 22]).fill(0x4a148c).stroke({ width: 0.7, color: OUTLINE });
    g.circle(p.x, p.y - 41.5, 2.4).fill(0xd7a77a);
    // Two nazarenos ahead, in pointed purple hoods, each with a candle.
    for (const [k, d] of [[0, -1.3], [1, -2.2]]) {
      const n = this.add(new Graphics(), gx + d + 1, gy + 0.6 + k * 0.5);
      const q = iso(gx + d + 1, gy + 0.6 + k * 0.5);
      n.poly([q.x - 4, q.y, q.x - 2, q.y - 12, q.x + 2, q.y - 12, q.x + 4, q.y]).fill(0x6a1b9a).stroke({ width: 0.6, color: OUTLINE });
      n.poly([q.x - 2.4, q.y - 12, q.x, q.y - 22, q.x + 2.4, q.y - 12]).fill(0x6a1b9a).stroke({ width: 0.6, color: OUTLINE });
      n.rect(q.x - 1.4, q.y - 16, 1, 1).fill(OUTLINE);
      n.rect(q.x + 0.4, q.y - 16, 1, 1).fill(OUTLINE);
      n.rect(q.x + 3.6, q.y - 14, 1.2, 7).fill(0xfafafa);
      n.ellipse(q.x + 4.2, q.y - 15.2, 0.8, 1.5).fill(0xffa726);
      this.glow(q.x + 4.2, q.y - 15, 9, 0xffcc80, k);
    }
  }

  // Feria de las Flores: a silletero in white with his hat, carrying a round silleta of flowers on his back, and
  // another silleta on its wooden stand beside him.
  silleta(gx, gy) {
    const COLORS = [0xe91e63, 0xfdd835, 0xffffff, 0xe53935, 0x8e24aa, 0xff7043, 0x1e88e5];
    const round = (g, cx, cy, r, k0) => {
      g.circle(cx, cy, r + 1.5).fill(0x8d6e63).stroke({ width: 0.8, color: OUTLINE });
      g.circle(cx, cy, r).fill(0x4e8a33);
      let k = k0;
      for (let ring = r - 2; ring > 0; ring -= 3) {
        const n = Math.max(1, Math.round((2 * Math.PI * ring) / 3.2));
        for (let i = 0; i < n; i++) g.circle(cx + Math.cos((i / n) * 2 * Math.PI) * ring, cy + Math.sin((i / n) * 2 * Math.PI) * ring, 1.5).fill(COLORS[k++ % COLORS.length]);
      }
      g.circle(cx, cy, 1.6).fill(COLORS[(k0 + 3) % COLORS.length]);
    };
    // The silleta on its stand.
    const a = this.add(new Graphics(), gx + 1, gy + 0.4);
    const p = iso(gx + 1, gy + 0.4);
    a.rect(p.x - 7, p.y - 8, 1.5, 8).fill(0x6d4c41);
    a.rect(p.x + 5.5, p.y - 8, 1.5, 8).fill(0x6d4c41);
    round(a, p.x, p.y - 19, 11, 0);
    // The silletero walking, the silleta strapped to his back (drawn behind him).
    const b = this.add(new Graphics(), gx + 2.4, gy + 0.9);
    const q = iso(gx + 2.4, gy + 0.9);
    round(b, q.x + 5, q.y - 24, 10, 3);
    b.rect(q.x - 3, q.y - 9, 2.4, 9).fill(0x5d4037);
    b.rect(q.x + 0.6, q.y - 9, 2.4, 9).fill(0x5d4037);
    b.roundRect(q.x - 4, q.y - 20, 8, 12, 2).fill(0xfafafa).stroke({ width: 0.7, color: OUTLINE });
    b.rect(q.x - 4, q.y - 13, 8, 1.4).fill(0xc62828);
    b.circle(q.x, q.y - 23, 2.6).fill(0xd7a77a);
    b.ellipse(q.x, q.y - 25, 6, 1.6).fill(0x3e2723);
    b.ellipse(q.x, q.y - 26.5, 3, 2).fill(0x3e2723);
  }

  // August kites: a few kites high over the stretch the camera frames first (from the source to the warehouse), on
  // long strings held from the ground; they sway in update().
  kites() {
    const { farm, warehouse: wh } = this.scene.zone;
    const colors = [[0xe53935, 0xfdd835], [0x1e88e5, 0xffffff], [0x43a047, 0xff7043], [0x8e24aa, 0xfdd835]];
    this.kiteList = [0.1, 0.4, 0.7, 0.95].map((f, k) => {
      const gx = farm.x + (wh.x - farm.x) * f + (k % 2 ? 3 : -3);
      const gy = farm.y + (wh.y - farm.y) * f + (k % 2 ? -3 : 3);
      return { hand: iso(gx + 3, gy + 3, 4), kite: iso(gx, gy, 150 + (k % 2) * 40), colors: colors[k], phase: k * 1.7 };
    });
  }

  // A bit of confetti falling over a random point of the mule path.
  bit() {
    const p = pointAt(this.scene.zone.muleRoad, Math.random());
    const s = iso(p.gx + (Math.random() - 0.5) * 3, p.gy + (Math.random() - 0.5) * 3, 60);
    this.bits.push({ x: s.x, y: s.y, life: 2.2, phase: Math.random() * 6, color: BULBS[Math.floor(Math.random() * BULBS.length)] });
  }

  // A music note rising from a random point of the mule path.
  // kind 'heart' (v5.21): a red or pink heart instead.
  tune(kind = 'note') {
    const p = pointAt(this.scene.zone.muleRoad, Math.random());
    const s = iso(p.gx + (Math.random() - 0.5) * 2, p.gy + (Math.random() - 0.5) * 2, 10);
    const colors = kind === 'heart' ? [0xe53935, 0xf06292, 0xd81b60] : [0x5d4037, 0xc62828, 0x1e88e5];
    this.tunes.push({ x: s.x, y: s.y, life: 3, phase: Math.random() * 6, kind, color: colors[Math.floor(Math.random() * 3)] });
  }

  // A puff of talc rising from a random point of the mule path.
  puff() {
    const road = this.scene.zone.muleRoad;
    const p = pointAt(road, Math.random());
    const s = iso(p.gx + (Math.random() - 0.5) * 1.5, p.gy + (Math.random() - 0.5) * 1.5, 6);
    this.puffs.push({ x: s.x, y: s.y, r: 3 + Math.random() * 3, life: 1.6 + Math.random() * 0.8, max: 2.4, drift: (Math.random() - 0.5) * 10 });
  }

  // Candles on the ground and paper lanterns on short sticks, on both sides of the mule path and the road.
  candles() {
    const zone = this.scene.zone;
    let k = 0;
    for (const road of [zone.muleRoad, zone.jeepRoad].filter(Boolean)) {
      const len = pathLength(road);
      for (let s = 0.8; s < len - 0.4; s += 1.4) {
        const p = pointAt(road, s / len);
        const d = Math.hypot(p.dx, p.dy) || 1;
        for (const side of [-1, 1]) {
          const gx = p.gx + (-p.dy / d) * 0.62 * side;
          const gy = p.gy + (p.dx / d) * 0.62 * side;
          const g = this.add(new Graphics(), gx, gy);
          const base = iso(gx, gy);
          if (k++ % 3 === 2) {
            // Paper lantern on a stick.
            g.rect(base.x - 0.7, base.y - 14, 1.4, 14).fill(0x6d4c41);
            g.roundRect(base.x - 4, base.y - 22, 8, 9, 2).fill([0xef5350, 0xfdd835, 0x42a5f5][k % 3]).stroke({ width: 0.8, color: OUTLINE });
            this.glow(base.x, base.y - 17, 14, 0xffb74d);
          } else {
            g.rect(base.x - 1.6, base.y - 7, 3.2, 7).fill(0xfafafa).stroke({ width: 0.6, color: OUTLINE, alpha: 0.7 });
            g.ellipse(base.x, base.y - 9.2, 1.5, 2.6).fill(0xffa726);
            this.glow(base.x, base.y - 9, 11, 0xffcc80, k % 2);
          }
        }
      }
    }
  }

  // A grass spot clear of stations for the tree and the manger: in front of the warehouse, always in view (the zone
  // sign is behind the side buttons on a phone); else near the sign.
  freeSpot() {
    const { zone, terrain, stations } = this.scene;
    const [sx, sy] = zone.signShift ?? [0, 0];
    const n = zone.size;
    const taken = (gx, gy) => Object.values(stations).some(({ foot: f }) => gx > f.x - 1 && gx < f.x + f.w + 1 && gy > f.y - 1 && gy < f.y + f.h + 1);
    const free = (gx, gy) => {
      for (let x = Math.floor(gx); x <= Math.floor(gx) + 3; x++) for (let y = Math.floor(gy) - 1; y <= Math.floor(gy) + 1; y++) if (x < 0 || y < 0 || x >= n || y >= n || terrain.tiles[x][y] !== 'grass') return false;
      return !taken(gx, gy) && !taken(gx + 2, gy);
    };
    const wh = zone.warehouse;
    for (const [cx, cy, reach] of [[wh.x + wh.w - 1, wh.y + wh.h + 2, 4], [ZONE_SIGN[0] + sx - 3, ZONE_SIGN[1] + sy - 2, 12]]) {
      for (let r = 0; r < reach; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (const dy of [-r, r]) if (free(cx + dx + 0.5, cy + dy + 0.5)) return { gx: cx + dx + 0.5, gy: cy + dy + 0.5 };
          for (const dy of [-r, r]) if (free(cx + dy + 0.5, cy + dx + 0.5)) return { gx: cx + dy + 0.5, gy: cy + dx + 0.5 };
        }
      }
    }
    return null;
  }

  tree(gx, gy) {
    const g = this.add(new Graphics(), gx, gy);
    const p = iso(gx, gy);
    g.ellipse(p.x, p.y, 13, 5).fill({ color: 0x000000, alpha: 0.15 });
    g.rect(p.x - 3, p.y - 9, 6, 9).fill(0x6d4c41).stroke({ width: 1, color: OUTLINE });
    for (const [top, w, base] of [[44, 9, 22], [32, 12, 14], [20, 15, 6]].reverse()) {
      g.poly([p.x, p.y - top - 12, p.x + w + 4, p.y - base, p.x - w - 4, p.y - base]).fill(0x2e7d32).stroke({ width: 1.2, color: OUTLINE });
    }
    // Star on top and baubles.
    const star = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 2.6 : 6;
      star.push(p.x + Math.cos(a) * r, p.y - 58 + Math.sin(a) * r);
    }
    g.poly(star).fill(0xfdd835).stroke({ width: 0.8, color: OUTLINE });
    this.glow(p.x, p.y - 58, 18, 0xfff59d);
    [[-8, -12], [7, -16], [-4, -25], [6, -30], [-6, -38], [3, -45], [0, -20], [-11, -18]].forEach(([dx, dy], i) => {
      const color = BULBS[i % BULBS.length];
      g.circle(p.x + dx, p.y + dy, 2).fill(color);
      this.glow(p.x + dx, p.y + dy, 9, color, i % 2);
    });
  }

  // Nativity scene: a little thatched shed with the Holy Family, the ox and the mule; the kings on 6 January.
  manger(gx, gy, kings) {
    const g = this.add(new Graphics(), gx + 1, gy + 1);
    const a = iso(gx, gy + 1);
    const b = iso(gx + 1.4, gy + 1);
    const c = iso(gx + 1.4, gy);
    const lift = 20;
    // Floor of straw, two posts and a sloping roof.
    g.poly([a.x, a.y, b.x, b.y, c.x, c.y, c.x - (b.x - a.x), c.y - (b.y - a.y)]).fill(0xd7b46a).stroke({ width: 1, color: OUTLINE });
    g.rect(a.x - 1, a.y - lift, 2, lift).fill(0x6d4c41);
    g.rect(c.x - 1, c.y - lift, 2, lift).fill(0x6d4c41);
    g.poly([a.x - 4, a.y - lift, c.x + 4, c.y - lift, c.x + 4, c.y - lift - 8, a.x - 4, a.y - lift - 8]).fill(0x8d6e63).stroke({ width: 1, color: OUTLINE });
    const m = iso(gx + 0.7, gy + 0.6);
    // Crib with the baby, Mary (blue) and Joseph (brown), ox and mule behind.
    g.ellipse(m.x - 10, m.y - 6, 4, 3.5).fill(0x8d6e63);
    g.ellipse(m.x + 11, m.y - 6, 4, 3.5).fill(0x9e9e9e);
    g.rect(m.x - 4, m.y - 3, 8, 3).fill(0xa1887f).stroke({ width: 0.6, color: OUTLINE });
    g.circle(m.x, m.y - 4, 1.6).fill(0xffe0b2);
    g.poly([m.x - 9, m.y, m.x - 5, m.y - 11, m.x - 1, m.y]).fill(0x1e88e5).stroke({ width: 0.6, color: OUTLINE });
    g.circle(m.x - 5, m.y - 12, 2).fill(0xffe0b2);
    g.poly([m.x + 1, m.y, m.x + 5, m.y - 12, m.x + 9, m.y]).fill(0x8d6e63).stroke({ width: 0.6, color: OUTLINE });
    g.circle(m.x + 5, m.y - 13, 2).fill(0xffe0b2);
    this.glow(m.x, m.y - 8, 16, 0xffe082);
    if (!kings) return;
    // The three wise men, in red, green and purple robes with gold crowns.
    [[0xc62828, -1.2], [0x2e7d32, -0.5], [0x6a1b9a, 0.2]].forEach(([robe, d]) => {
      const k = this.add(new Graphics(), gx + 1.9 + d * 0.3, gy + 1.6 + d);
      const q = iso(gx + 1.9 + d * 0.3, gy + 1.6 + d);
      k.poly([q.x - 4, q.y, q.x, q.y - 14, q.x + 4, q.y]).fill(robe).stroke({ width: 0.7, color: OUTLINE });
      k.circle(q.x, q.y - 15, 2.2).fill(0xffe0b2);
      k.poly([q.x - 2.4, q.y - 17, q.x - 2.4, q.y - 20, q.x - 1, q.y - 18.5, q.x, q.y - 20.5, q.x + 1, q.y - 18.5, q.x + 2.4, q.y - 20, q.x + 2.4, q.y - 17]).fill(0xfdd835);
    });
  }

  // The «año viejo»: a stuffed doll in old clothes and a straw hat, sitting in a chair by the warehouse.
  oldYear() {
    const wh = this.scene.zone.warehouse;
    const gx = wh.x - 0.8;
    const gy = wh.y + wh.h + 0.4;
    const g = this.add(new Graphics(), gx, gy);
    const p = iso(gx, gy);
    g.rect(p.x - 6, p.y - 10, 12, 2).fill(0x8d6e63);
    g.rect(p.x - 6, p.y - 10, 2, 10).fill(0x6d4c41);
    g.rect(p.x + 4, p.y - 10, 2, 10).fill(0x6d4c41);
    g.rect(p.x + 4, p.y - 22, 2, 12).fill(0x6d4c41);
    g.roundRect(p.x - 5, p.y - 22, 9, 12, 2).fill(0x1565c0).stroke({ width: 0.8, color: OUTLINE });
    g.rect(p.x - 7, p.y - 11, 4, 9).fill(0x5d4037);
    g.rect(p.x + 0, p.y - 11, 4, 9).fill(0x5d4037);
    g.circle(p.x - 0.5, p.y - 26, 4.2).fill(0xefebe9).stroke({ width: 0.8, color: OUTLINE });
    g.circle(p.x - 2, p.y - 27, 0.7).fill(OUTLINE);
    g.circle(p.x + 1, p.y - 27, 0.7).fill(OUTLINE);
    g.ellipse(p.x - 0.5, p.y - 29.5, 8, 2).fill(0xe6c463).stroke({ width: 0.6, color: OUTLINE });
    g.ellipse(p.x - 0.5, p.y - 31, 4, 2.6).fill(0xe6c463);
  }

  update(dt, time, light) {
    this.checkIn -= dt;
    if (this.checkIn <= 0) {
      this.checkIn = CHECK;
      this.sync();
    }
    // Bulbs blink in two groups.
    if (this.glows.length) {
      const on = Math.floor(time * 1.6) % 2;
      for (const gl of this.glows) gl.sprite.alpha = gl.phase === on ? 1 : 0.45;
    }
    if (this.talc || this.confetti || this.notes || this.hearts || this.kiteList.length) {
      if (this.hearts && Math.random() < dt * 1.5) this.tune('heart');
      if (this.talc && light < 0.5 && Math.random() < dt * 2.5) this.puff();
      if (this.confetti && Math.random() < dt * 6) this.bit();
      if (this.notes && Math.random() < dt * 1.5) this.tune();
      this.air.clear();
      this.tunes = this.tunes.filter((s) => (s.life -= dt) > 0);
      for (const s of this.tunes) {
        s.y -= dt * 12;
        const x = s.x + Math.sin(s.life * 3 + s.phase) * 4;
        const a = Math.min(1, s.life, (3 - s.life) * 2);
        if (s.kind === 'heart') {
          this.air.circle(x - 1.8, s.y - 1.4, 2.3).fill({ color: s.color, alpha: a });
          this.air.circle(x + 1.8, s.y - 1.4, 2.3).fill({ color: s.color, alpha: a });
          this.air.poly([x - 4, s.y - 0.6, x + 4, s.y - 0.6, x, s.y + 4]).fill({ color: s.color, alpha: a });
          continue;
        }
        this.air.ellipse(x, s.y, 2.6, 2).fill({ color: s.color, alpha: a });
        this.air.rect(x + 1.8, s.y - 9, 1.2, 9).fill({ color: s.color, alpha: a });
        this.air.rect(x + 1.8, s.y - 9, 4, 1.4).fill({ color: s.color, alpha: a });
      }
      this.bits = this.bits.filter((s) => (s.life -= dt) > 0);
      for (const s of this.bits) {
        s.y += dt * 22;
        s.x += Math.sin(s.life * 6 + s.phase) * dt * 12;
        this.air.rect(s.x, s.y, 2.4, 1.4 + Math.abs(Math.sin(s.life * 8 + s.phase)) * 1.6).fill({ color: s.color, alpha: Math.min(1, s.life) });
      }
      // Kites (v5.21), by day: each sways and dips on its string, its tail of bows waving below it.
      if (light < 0.5) {
        for (const k of this.kiteList) {
          const x = k.kite.x + Math.sin(time * 0.8 + k.phase) * 10;
          const y = k.kite.y + Math.sin(time * 1.3 + k.phase) * 5;
          this.air.moveTo(k.hand.x, k.hand.y).quadraticCurveTo((k.hand.x + x) / 2 + 14, (k.hand.y + y) / 2 + 18, x, y + 12).stroke({ width: 0.7, color: 0x5d4037, alpha: 0.6 });
          this.air.poly([x, y - 16, x + 11, y, x, y + 12, x - 11, y]).fill(k.colors[0]).stroke({ width: 1, color: OUTLINE, alpha: 0.8 });
          this.air.poly([x, y - 16, x + 11, y, x, y]).fill(k.colors[1]);
          this.air.poly([x, y, x - 11, y, x, y + 12]).fill(k.colors[1]);
          this.air.moveTo(x, y - 16).lineTo(x, y + 12).moveTo(x - 11, y).lineTo(x + 11, y).stroke({ width: 0.8, color: 0x5d4037, alpha: 0.7 });
          for (let i = 1; i <= 5; i++) {
            const tx = x + Math.sin(time * 3 + k.phase + i) * 4;
            const ty = y + 12 + i * 7;
            this.air.poly([tx - 3, ty - 1.8, tx + 3, ty + 1.8, tx + 3, ty - 1.8, tx - 3, ty + 1.8]).fill(k.colors[i % 2]);
          }
        }
      }
      this.puffs = this.puffs.filter((s) => (s.life -= dt) > 0);
      for (const s of this.puffs) {
        const f = 1 - s.life / s.max;
        s.y -= dt * 14;
        s.x += dt * s.drift;
        this.air.circle(s.x, s.y, s.r * (1 + f * 2.5)).fill({ color: 0xffffff, alpha: 0.55 * (1 - f) });
      }
    }
    if (!this.fireworks) return;
    // Fireworks: a burst every second or so at night (the lights layer only shows at night).
    if (light > 0.5 && Math.random() < dt * 0.9) this.burst();
    this.sky.clear();
    const g = 140;
    this.sparks = this.sparks.filter((s) => (s.life -= dt) > 0);
    for (const s of this.sparks) {
      s.vy += g * dt * 0.3;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      this.sky.circle(s.x, s.y, 3.2).fill({ color: s.color, alpha: Math.min(1, s.life * 1.5) });
    }
  }

  burst() {
    // Over the stretch the camera frames first: from the source to the warehouse.
    const { farm, warehouse: wh } = this.scene.zone;
    const f = Math.random();
    const c = iso(farm.x + (wh.x - farm.x) * f + (Math.random() - 0.5) * 6, farm.y + (wh.y - farm.y) * f + (Math.random() - 0.5) * 6, 110 + Math.random() * 90);
    const color = BULBS[Math.floor(Math.random() * BULBS.length)];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const v = 70 + Math.random() * 35;
      this.sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.4, color });
    }
  }
}
