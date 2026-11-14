import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, mix, shade, depth } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { createRng } from '../core/rng.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';

const CLIFF = 46; // px height of diorama map skirt edge
// Zone welcome signboard (v3.12) beside highway; no decoration placed there.
export const ZONE_SIGN = [18.9, 21.7]; // (in Bogotá, v4.5, shifted `zone.signShift` tiles)
const SIGN_CELLS = new Set(['18,20', '19,20', '18,21', '19,21', '18,22', '19,22', '17,21', '17,22', '16,22', '16,23', '17,23']); // and the zone keeper character

// Tile terrain type from zone data. jeeps: Willys count (v3.9: with two,
// highway widens by second lane).
export function buildTileMap(zone, jeeps = 1) {
  const n = zone.size;
  const tiles = Array.from({ length: n }, () => Array(n).fill('grass'));
  const fill = (x, y, w, h, type) => {
    for (let gx = x; gx < x + w; gx++) for (let gy = y; gy < y + h; gy++) if (tiles[gx]?.[gy]) tiles[gx][gy] = type;
  };
  const road = (pts, type = 'road') => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s <= steps; s++) {
        const gx = Math.floor(ax + ((bx - ax) * s) / steps);
        const gy = Math.floor(ay + ((by - ay) * s) / steps);
        if (tiles[gx]?.[gy]) tiles[gx][gy] = type;
      }
    }
  };
  fill(zone.farm.x, zone.farm.y, zone.farm.w, zone.farm.h, 'farm');
  for (const p of zone.plots) fill(p.x, p.y, 3, 3, 'plot');
  fill(zone.warehouse.x, zone.warehouse.y, zone.warehouse.w, zone.warehouse.h, 'building');
  // TransMilenio lane (v4.6, Bogotá): concrete median beside avenue; cross streets layer on top.
  for (const lane of zone.transmilenio ?? []) road(lane, 'busway');
  road(zone.muleRoad);
  road(zone.jeepRoad);
  if (jeeps > 1) road(zone.jeepRoad2);
  for (const r of Object.values(zone.routes ?? {})) road(r.road);
  fill(zone.yard.x, zone.yard.y, zone.yard.w, zone.yard.h, 'road');
  if (zone.plaza) {
    // Vélez plaza (v3.29): stone paving, surrounding streets, and framing houses (kept clear of props).
    const pz = zone.plaza;
    fill(pz.x, pz.y, pz.w, pz.h, 'plaza');
    road(pz.street);
    for (const [hx, hy] of pz.houses) fill(Math.floor(hx), Math.floor(hy), 1, 1, 'building');
  }
  if (zone.island) markIsland(tiles, zone);
  return tiles;
}

// Tiles a road path crosses (same stepping as the tile map).
function roadTiles(pts) {
  const out = [];
  for (let i = 1; i < (pts?.length ?? 0); i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let s = 0; s <= steps; s++) out.push(`${Math.floor(ax + ((bx - ax) * s) / steps)},${Math.floor(ay + ((by - ay) * s) / steps)}`);
  }
  return out;
}

// Island zones (v5.4, the special zone: `zone.island`): open sea on every side. Tiles outside a square with
// rounded corners (`corner`, in tiles) are sea, and so are a few border tiles away from roads and buildings
// (coves). Land along the sea is beach, or coral rock on the shore `rocky` names ('west': the gx = 0 side, where
// La Piscinita is). The second Willys lane counts as built even with one Willys, so the coast never changes.
function markIsland(tiles, zone) {
  const n = zone.size;
  const R = zone.island.corner ?? 5;
  const rng = createRng(zone.seed * 7 + 3);
  const lane2 = new Set(roadTiles(zone.jeepRoad2));
  const built = (x, y) => lane2.has(`${x},${y}`) || (tiles[x]?.[y] && tiles[x][y] !== 'grass');
  const inside = (gx, gy) => {
    const dx = Math.max(R - (gx + 0.5), 0, gx + 0.5 - (n - R));
    const dy = Math.max(R - (gy + 0.5), 0, gy + 0.5 - (n - R));
    return Math.hypot(dx, dy) <= R;
  };
  const clear = (gx, gy) => {
    for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) if (built(x, y)) return false;
    return true;
  };
  const border = (gx, gy) => gx === 0 || gy === 0 || gx === n - 1 || gy === n - 1;
  const sea = [];
  for (let gx = 0; gx < n; gx++) {
    for (let gy = 0; gy < n; gy++) {
      const r = rng();
      if (built(gx, gy)) continue;
      if (!inside(gx, gy) || (border(gx, gy) && clear(gx, gy) && r < 0.3)) sea.push([gx, gy]);
    }
  }
  for (const [x, y] of sea) tiles[x][y] = 'sea';
  const shore = [];
  for (let gx = 0; gx < n; gx++) {
    for (let gy = 0; gy < n; gy++) {
      if (tiles[gx][gy] !== 'grass') continue;
      let wet = border(gx, gy);
      for (let x = gx - 1; x <= gx + 1 && !wet; x++) for (let y = gy - 1; y <= gy + 1; y++) if (tiles[x]?.[y] === 'sea') wet = true;
      if (wet) shore.push([gx, gy]);
    }
  }
  for (const [x, y] of shore) tiles[x][y] = zone.island.rocky === 'west' && x <= 2 ? 'rocks' : 'beach';
}

export class Terrain {
  constructor(zone, jeeps = 1) {
    this.zone = zone;
    this.tiles = buildTileMap(zone, jeeps);
    this.ground = new Graphics();
    this.decor = []; // tall props depth-sorted alongside buildings and sprites
    this.occupied = new Set(); // tiles containing props (`gx,gy`): pedestrians steer around them
    this.glows = []; // non-station night lights: { x, y, r, color } (v3.29)
    this.animated = []; // animated decorative props: { update(t) } (v3.54: whales and tour boats)
    this.drawGround();
    if (zone.plaza) drawAtrium(this.ground, zone.plaza);
    if (zone.plaza) this.buildPlaza();
    if (zone.walls) this.buildWalls();
    if (zone.sea) this.buildWhales();
    if (zone.style === 'bogota') this.buildMonserrate();
    this.buildDecor();
  }

  // Monserrate (Bogotá, v4.5): mountain rising behind La Candelaria with white hilltop church and
  // climbing funicular railway.
  buildMonserrate() {
    const c = new Container();
    const g = new Graphics();
    const [mx, my] = MONSERRATE;
    const base = iso(mx, my);
    const top = { x: base.x, y: base.y - 120 };
    g.poly([base.x - 120, base.y + 30, base.x - 40, top.y + 30, top.x - 14, top.y, top.x + 16, top.y, base.x + 60, top.y + 40, base.x + 140, base.y + 10, base.x + 40, base.y + 70]).fill(0x4e8a34).stroke(OUTLINE);
    g.poly([top.x + 16, top.y, base.x + 60, top.y + 40, base.x + 140, base.y + 10, base.x + 40, base.y + 70, base.x + 10, top.y + 30]).fill(0x3d6e29);
    for (const [dx, dy] of [[-70, 10], [-40, -30], [-20, -70], [30, -50], [60, -10], [-90, 30], [20, 20]]) g.circle(base.x + dx, base.y + dy, 7).fill(0x2e5a20);
    // Funicular track from mountain foot to summit.
    g.moveTo(base.x - 60, base.y + 40).lineTo(top.x - 4, top.y + 12).stroke({ width: 2, color: 0x37474f });
    const cab = { x: base.x - 34, y: base.y - 2 };
    g.roundRect(cab.x - 6, cab.y - 5, 12, 8, 2).fill(0xd7263d).stroke(OUTLINE);
    // White sanctuary church.
    const ch = new Graphics();
    box(ch, -0.45, -0.3, 0.9, 0.6, 18, 0xfafafa);
    gableRoof(ch, -0.45, -0.3, 0.9, 0.6, 18, 8, PAL.roof, 0xfafafa);
    box(ch, -0.2, 0.15, 0.4, 0.3, 30, 0xfafafa);
    ch.position.set(top.x, top.y + 6);
    c.addChild(g, ch);
    c.zIndex = depth(mx - 3, my - 3); // behind everything else on map
    c.grid = [mx, my];
    this.decor.push(c);
  }

  // Vélez plaza (v3.29): single-tower church with stone forecourt, fountain, trees, benches,
  // streetlamps, and framing whitewashed houses.
  buildPlaza() {
    const pz = this.zone.plaza;
    const rng = createRng(this.zone.seed * 13 + 5);
    const put = (obj, gx, gy, z = depth(gx, gy)) => {
      obj.zIndex = z;
      obj.grid = [gx, gy];
      this.decor.push(obj);
      this.occupied.add(`${Math.floor(gx)},${Math.floor(gy)}`);
    };
    const T = CHURCH.tower;
    put(velezChurch(pz, this.glows), pz.x + 2, pz.y + 1.5, depth(pz.x + T.x + T.w + 0.1, pz.y + T.y + T.d + 0.1));
    const at = (obj, gx, gy) => {
      const p = iso(gx, gy);
      obj.position.set(p.x, p.y);
      put(obj, gx, gy);
    };
    at(fountain(), pz.x + 2.85, pz.y + 3.45);
    for (const [gx, gy] of [[pz.x + 0.4, pz.y + 3.55], [pz.x + 3.7, pz.y + 0.35], [pz.x + 0.3, pz.y + 0.3]]) at(guavaTree(rng), gx, gy);
    for (const [gx, gy] of [[pz.x + 3.8, pz.y + 2.6], [pz.x + 0.2, pz.y + 2.9], [pz.x + 1.9, pz.y + 3.85]]) {
      at(streetLamp(), gx, gy);
      const p = iso(gx, gy, 34);
      this.glows.push({ x: p.x, y: p.y, r: 16 });
    }
    for (const [gx, gy] of [[pz.x + 1.0, pz.y + 3.7], [pz.x + 3.75, pz.y + 1.5]]) at(bench(), gx, gy);
    for (const [gx, gy] of pz.houses) at(townHouse(rng, 'barichara'), gx, gy);
  }

  drawGround() {
    const g = this.ground;
    const n = this.zone.size;
    const rng = createRng(this.zone.seed);

    const sea = this.zone.walls?.sea || this.zone.sea; // sea behind map edge: Cartagena (v3.45) and Buenaventura (v3.54)
    if (sea) this.drawSea(g, n, rng);
    // An island (v5.4) floats in open sea on every side, with no earth skirt.
    if (this.zone.island) this.drawIslandSea(g, n, createRng(this.zone.seed * 3 + 11));
    // Diorama cutaway edges.
    if (!this.zone.island) {
    g.poly(isoPoly([[0, n, 0], [n, n, 0], [n, n, -CLIFF], [0, n, -CLIFF]])).fill(PAL.cliffTop);
    g.poly(isoPoly([[n, 0, 0], [n, n, 0], [n, n, -CLIFF], [n, 0, -CLIFF]])).fill(PAL.cliffSide);
    for (let i = 0; i < 3; i++) {
      const h = -12 - i * 12;
      const col = shade(PAL.cliffTop, 0.92 - i * 0.06);
      g.moveTo(...Object.values(iso(0, n, h))).lineTo(...Object.values(iso(n, n, h))).stroke({ width: 2, color: col, alpha: 0.6 });
      g.moveTo(...Object.values(iso(n, 0, h))).lineTo(...Object.values(iso(n, n, h))).stroke({ width: 2, color: shade(col, 0.85), alpha: 0.6 });
    }
    // Grass overhang tufting down edge.
    g.poly(isoPoly([[0, n, 0], [n, n, 0], [n, n, -6], [0, n, -6]])).fill(PAL.grassDark);
    g.poly(isoPoly([[n, 0, 0], [n, n, 0], [n, n, -6], [n, 0, -6]])).fill(shade(PAL.grassDark, 0.8));
    }

    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        const type = this.tiles[gx][gy];
        const v = rng();
        let color;
        if (type === 'road') color = mix(PAL.road, 0xd8b07a, v * 0.4);
        else if (type === 'busway') color = mix(0xa7a49c, 0x96938b, v * 0.5);
        else if (type === 'farm') color = (FARM_SOIL[this.zone.style] ?? FARM_SOIL[this.zone.theme])?.(v) ?? mix(PAL.soil, 0x6e4529, v * 0.35);
        else if (type === 'plaza') color = mix(0xd9c9a8, 0xc4b08a, v * 0.5);
        else if (type === 'plot' || type === 'building') color = mix(PAL.plot, 0xc9a06c, v * 0.4);
        else if (type === 'sea') color = mix(0x35b8c8, 0x2aa6bd, v * 0.6); // turquoise shallows (v5.4)
        else if (type === 'beach') color = mix(0xf3e6c0, 0xe8d6a6, v * 0.6); // white coral sand
        else if (type === 'rocks') color = mix(0xa89c88, 0x8f846f, v * 0.6); // coral rock shore
        else if (sea && (gx === 0 || gy === 0)) color = mix(this.zone.sea ? 0xb8a27a : 0xe9d8a6, this.zone.sea ? 0xa8926a : 0xdcc78e, v * 0.6); // beach (dark volcanic sand on Pacific coast)
        else if (this.zone.style === 'bogota' && gy <= 3) color = mix(0x4e8a34, 0x3d7a2a, v * 0.6); // Eastern Hills (v4.5)
        else color = mix(PAL.grass, (gx + gy) % 2 ? 0x8cc65a : 0x6fae44, 0.35 + v * 0.3);
        g.poly(isoPoly([[gx, gy], [gx + 1, gy], [gx + 1, gy + 1], [gx, gy + 1]])).fill(color);

        if (type === 'grass' && rng() < 0.35) {
          // Grass tufts.
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          const c = shade(PAL.grass, 0.75);
          g.moveTo(p.x - 3, p.y).lineTo(p.x - 1, p.y - 5).moveTo(p.x, p.y).lineTo(p.x + 1, p.y - 6).moveTo(p.x + 3, p.y).lineTo(p.x + 4, p.y - 4).stroke({ width: 1.2, color: c });
        }
        if (type === 'grass' && rng() < 0.06) {
          const p = iso(gx + 0.5, gy + 0.5);
          const flower = [0xffffff, 0xf6d860, 0xe07a5f, 0xc77dff][Math.floor(rng() * 4)];
          g.circle(p.x, p.y, 2).fill(flower);
          g.circle(p.x + 5, p.y + 2, 1.6).fill(flower);
        }
        if (type === 'sea') {
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 6, p.y).quadraticCurveTo(p.x, p.y - 2, p.x + 6, p.y).stroke({ width: 1.1, color: 0xe8f6ff, alpha: 0.5 });
        } else if (type === 'beach' && rng() < 0.3) {
          const p = iso(gx + rng(), gy + rng());
          g.ellipse(p.x, p.y, 1.6, 0.9).fill({ color: rng() < 0.5 ? 0xffffff : 0xf4b6a0, alpha: 0.8 }); // shells
        } else if (type === 'rocks') {
          for (let k = 0; k < 3; k++) {
            const p = iso(gx + 0.15 + rng() * 0.7, gy + 0.15 + rng() * 0.7);
            g.ellipse(p.x, p.y, 4 + rng() * 3, 2 + rng() * 1.2).fill({ color: rng() < 0.5 ? 0x6f6658 : 0x7d7362, alpha: 0.85 });
          }
        }
        if (type === 'road' && rng() < 0.25) {
          const p = iso(gx + rng(), gy + rng());
          g.ellipse(p.x, p.y, 2.5, 1.2).fill({ color: 0x8a6a45, alpha: 0.5 });
        }
        if (type === 'plaza') {
          // Vélez plaza stonework, similar to Barichara but grayer.
          for (let k = 0; k < 4; k++) {
            const p = iso(gx + 0.25 + (k % 2) * 0.5, gy + 0.25 + Math.floor(k / 2) * 0.5);
            g.ellipse(p.x, p.y, 7, 3.5).fill({ color: rng() < 0.5 ? 0xb9a57e : 0xe3d6b8, alpha: 0.8 });
          }
        } else if (type === 'farm' && this.zone.theme === 'town') {
          // Plaza empedrada.
          for (let k = 0; k < 4; k++) {
            const p = iso(gx + 0.25 + (k % 2) * 0.5, gy + 0.25 + Math.floor(k / 2) * 0.5);
            const stones = this.zone.style === 'barichara' ? [0xc9a96b, 0xe0c890] : this.zone.style === 'cartagena' ? [0xc9b48a, 0xe2d2ae] : this.zone.style === 'villa' ? [0x9a948a, 0xb9b2a5] : this.zone.style === 'villavo' ? [0xc9a77a, 0xe0c8a0] : this.zone.style === 'buenaventura' ? [0xb8bcc0, 0xd0d4d6] : this.zone.style === 'leticia' ? [0xb89a7a, 0xd0b896] : this.zone.style === 'neiva' ? [0xc9a882, 0xe0c9a6] : [0xa39b8c, 0xd2cbbd]; // piedra amarilla en Barichara; coralina en Cartagena
            g.ellipse(p.x, p.y, 7, 3.5).fill({ color: rng() < 0.5 ? stones[0] : stones[1], alpha: 0.8 });
          }
        } else if (type === 'farm' && (this.zone.theme === 'cacao' || this.zone.theme === 'plantain' || this.zone.theme === 'azotea' || this.zone.theme === 'werregue' || this.zone.theme === 'asai' || this.zone.theme === 'aji' || this.zone.theme === 'chagra' || this.zone.theme === 'yanchama')) {
          // Leaf litter under cacao trees (and Pacific plantains, v3.38).
          for (let k = 0; k < 2; k++) {
            const p = iso(gx + rng(), gy + rng());
            g.ellipse(p.x, p.y, 3, 1.5).fill({ color: rng() < 0.5 ? 0x8a6a3a : 0x6e8f3a, alpha: 0.7 });
          }
        } else if (type === 'farm' && this.zone.theme === 'rice') {
          // Flooded rice paddy (v3.15): water glints and raised earth bunds between basins.
          const a = iso(gx, gy + 1);
          const b = iso(gx + 1, gy + 1);
          const c2 = iso(gx + 1, gy);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c2.x, c2.y).stroke({ width: 2.2, color: 0x8a6a45, alpha: 0.55 });
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 5, p.y).lineTo(p.x + 5, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.55 });
        } else if (type === 'farm' && this.zone.theme === 'mangrove') {
          // Manglar (v3.41): low-tide mudflat with glinting tide pools.
          if (rng() < 0.5) {
            const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
            g.ellipse(p.x, p.y, 6 + rng() * 5, 2.4 + rng() * 1.5).fill({ color: 0x5a8f9a, alpha: 0.7 });
            g.moveTo(p.x - 3, p.y - 0.5).lineTo(p.x + 2, p.y - 0.5).stroke({ width: 1, color: 0xe8f6ff, alpha: 0.6 });
          }
        } else if (type === 'farm' && this.zone.theme === 'lake') {
          // Lago (v3.49): dark blackwater of Lake Tarapoto with glints and floating Victoria regia pads.
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 6, p.y).quadraticCurveTo(p.x, p.y - 2, p.x + 6, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.45 });
          if (rng() < 0.3) {
            const q = iso(gx + 0.15 + rng() * 0.7, gy + 0.15 + rng() * 0.7);
            const r = 5 + rng() * 4;
            g.ellipse(q.x, q.y, r + 1.2, (r + 1.2) * 0.5).fill(0x8a3a3a);
            g.ellipse(q.x, q.y - 0.6, r, r * 0.5).fill(0x5e9a3c);
            g.moveTo(q.x, q.y - 0.6).lineTo(q.x + r * 0.9, q.y - 0.6).stroke({ width: 1, color: 0x3f7a2a, alpha: 0.8 });
            if (rng() < 0.3) g.circle(q.x - r * 0.4, q.y - 2.5, 2).fill(0xf8f0f4).circle(q.x - r * 0.4, q.y - 2.5, 0.9).fill(0xf48fb1);
          }
        } else if (type === 'farm' && this.zone.theme === 'bay') {
          // Bahía (v3.40): ocean with sparkling waves and sea foam.
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 7, p.y).quadraticCurveTo(p.x, p.y - 3, p.x + 7, p.y).stroke({ width: 1.3, color: 0xe8f6ff, alpha: 0.55 });
          if (rng() < 0.15) g.ellipse(p.x + 3, p.y + 4, 4, 1.2).fill({ color: 0xffffff, alpha: 0.5 });
        } else if (type === 'farm' && this.zone.theme === 'cienaga') {
          // Ciénaga (v3.17): water glints and floating water hyacinth (purple blooms).
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 6, p.y).lineTo(p.x + 6, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.5 });
          if (rng() < 0.3) {
            const q = iso(gx + rng(), gy + rng());
            for (let k = 0; k < 4; k++) g.ellipse(q.x + Math.cos(k * 1.6) * 4, q.y + Math.sin(k * 1.6) * 2, 3.2, 1.8).fill(k % 2 ? 0x5e9a3c : 0x74b14a);
            g.circle(q.x, q.y - 2.5, 1.6).fill(0xb39ddb);
          }
        } else if (type === 'farm' && this.zone.theme === 'coconut') {
          // Cocal (v3.16): sand scattered with fallen dry palm fronds.
          if (rng() < 0.4) {
            const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
            const d = rng() < 0.5 ? -1 : 1;
            g.moveTo(p.x - 7 * d, p.y - 2).quadraticCurveTo(p.x, p.y - 4, p.x + 7 * d, p.y + 1).stroke({ width: 1.6, color: 0xb08a4a, alpha: 0.7 });
          }
        } else if (type === 'farm' && this.zone.theme === 'pigs') {
          // Pig pen (v4.0): sparse grass and wallowing mud puddles.
          if (rng() < 0.35) {
            const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
            g.ellipse(p.x, p.y, 8 + rng() * 6, 3 + rng() * 2).fill({ color: 0x6b4a2e, alpha: 0.75 });
          }
          const q = iso(gx + rng(), gy + rng());
          g.moveTo(q.x - 2, q.y).lineTo(q.x - 1, q.y - 4).moveTo(q.x + 1, q.y).lineTo(q.x + 2, q.y - 5).stroke({ width: 1.2, color: 0x5a7a2a });
        } else if (type === 'farm' && (this.zone.theme === 'dairy' || this.zone.theme === 'ranch' || this.zone.theme === 'savanna' || this.zone.theme === 'sheep')) {
          // Pasture: taller, denser grass without furrow lines.
          for (let k = 0; k < 3; k++) {
            const p = iso(gx + rng(), gy + rng());
            g.moveTo(p.x - 2, p.y).lineTo(p.x - 1, p.y - 5).moveTo(p.x + 1, p.y).lineTo(p.x + 2, p.y - 6).stroke({ width: 1.2, color: 0x3f7a2a });
          }
        } else if (type === 'farm') {
          // Surcos.
          const a = iso(gx, gy + 0.5);
          const b = iso(gx + 1, gy + 0.5);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0x5c3a22, alpha: 0.35 });
        }
      }
    }
    if (this.zone.island) this.drawIslandShore(g, n);
  }

  // Island sea (v5.4): open water on every side with turquoise shallows near the coast, waves, sea-blue cutaway
  // faces at the front, and a wooden pier where the Willys road reaches the sea.
  drawIslandSea(g, n, rng) {
    const S = 9;
    g.poly(isoPoly([[-S, -S], [n + S, -S], [n + S, n + S], [-S, n + S]])).fill(0x2484ab);
    g.poly(isoPoly([[-2.5, -2.5], [n + 2.5, -2.5], [n + 2.5, n + 2.5], [-2.5, n + 2.5]])).fill({ color: 0x2fa9c2, alpha: 0.75 });
    g.poly(isoPoly([[-1, -1], [n + 1, -1], [n + 1, n + 1], [-1, n + 1]])).fill({ color: 0x3fc4cc, alpha: 0.7 });
    g.poly(isoPoly([[n + S, -S, 0], [n + S, n + S, 0], [n + S, n + S, -CLIFF], [n + S, -S, -CLIFF]])).fill(0x1b5f80);
    g.poly(isoPoly([[-S, n + S, 0], [n + S, n + S, 0], [n + S, n + S, -CLIFF], [-S, n + S, -CLIFF]])).fill(0x226c90);
    for (let k = 0; k < 160; k++) {
      const x = -S + rng() * (n + 2 * S);
      const y = -S + rng() * (n + 2 * S);
      if (x > -0.5 && x < n + 0.5 && y > -0.5 && y < n + 0.5) continue;
      const p = iso(x, y);
      g.moveTo(p.x - 7, p.y).quadraticCurveTo(p.x, p.y - 2.5, p.x + 7, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.5 });
    }
  }

  // Island coast (v5.4): foam along every edge between land and sea, and the pier at the end of the Willys road.
  drawIslandShore(g, n) {
    const water = (x, y) => x < 0 || y < 0 || x >= n || y >= n || this.tiles[x][y] === 'sea';
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        if (this.tiles[gx][gy] === 'sea') continue;
        for (const [dx, dy, mx, my] of [[-1, 0, 0, 0.5], [1, 0, 1, 0.5], [0, -1, 0.5, 0], [0, 1, 0.5, 1]]) {
          if (!water(gx + dx, gy + dy)) continue;
          const p = iso(gx + mx + dx * 0.1, gy + my + dy * 0.1);
          g.ellipse(p.x, p.y, 8, 1.8).fill({ color: 0xffffff, alpha: 0.6 });
        }
      }
    }
    const end = this.zone.jeepRoad.at(-1);
    if (end[0] < n - 0.5) return;
    const y0 = Math.floor(end[1]) - 0.2;
    const y1 = Math.floor(this.zone.jeepRoad2?.at(-1)?.[1] ?? end[1]) + 1.2;
    g.poly(isoPoly([[n, y0], [n + 3.5, y0], [n + 3.5, y1], [n, y1]])).fill(0x9c6b3e).stroke({ width: 1, color: 0x5d3a1e, alpha: 0.7 });
    for (let x = n + 0.25; x < n + 3.5; x += 0.35) {
      const a = iso(x, y0);
      const b = iso(x, y1);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: 0x6e4526, alpha: 0.6 });
    }
    for (const [x, y] of [[n + 3.5, y0], [n + 3.5, y1], [n + 1.75, y0], [n + 1.75, y1]]) {
      const p = iso(x, y);
      g.rect(p.x - 1.2, p.y - 2, 2.4, 9).fill(0x5d3a1e);
    }
  }

  // Open sea (v3.45): strip of water behind rear map edges with waves, shoreline foam,
  // and vertical cutaway edges matching the diorama look.
  drawSea(g, n, rng) {
    const S = 8;
    g.poly(isoPoly([[-S, -S], [n, -S], [n, 0], [0, 0], [0, n], [-S, n]])).fill(0x2f86a8);
    g.poly(isoPoly([[-S, -S], [n, -S], [n, -S + 2.5], [-S + 2.5, -S + 2.5], [-S + 2.5, n], [-S, n]])).fill({ color: 0x1f6f94, alpha: 0.6 });
    g.poly(isoPoly([[n, -S, 0], [n, 0, 0], [n, 0, -CLIFF], [n, -S, -CLIFF]])).fill(0x1f5f80);
    g.poly(isoPoly([[-S, n, 0], [0, n, 0], [0, n, -CLIFF], [-S, n, -CLIFF]])).fill(0x2a6f92);
    for (let k = 0; k < 70; k++) {
      const side = rng() < 0.5;
      const along = rng() * n;
      const out = -0.4 - rng() * (S - 1);
      const p = side ? iso(along, out) : iso(out, along);
      g.moveTo(p.x - 7, p.y).quadraticCurveTo(p.x, p.y - 2.5, p.x + 7, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.5 });
    }
    // Shoreline foam.
    for (let t = 0; t < n; t += 0.5) {
      const a = iso(t, -0.12);
      const b = iso(-0.12, t);
      g.ellipse(a.x, a.y, 7, 1.6).fill({ color: 0xffffff, alpha: 0.55 });
      g.ellipse(b.x, b.y, 7, 1.6).fill({ color: 0xffffff, alpha: 0.55 });
    }
  }

  // Walled city (v3.45): coral-stone ramparts in 1-tile segments (for clean depth sorting),
  // walkway and battlements, road gates, sentry boxes (garitas), and Clock Tower;
  // sailboats and launches out at sea.
  buildWalls() {
    const W = this.zone.walls;
    this.wallCells = new Set();
    const put = (obj, gx, gy) => {
      obj.zIndex = depth(gx, gy);
      obj.grid = [gx, gy];
      this.decor.push(obj);
    };
    const gateAt = (x, y) => W.gates.find((gt) => Math.hypot(gt.at[0] - x, gt.at[1] - y) < 0.55);
    for (const line of W.lines) {
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1];
        const [bx, by] = line[i];
        const len = Math.hypot(bx - ax, by - ay);
        const steps = Math.ceil(len / 0.5);
        for (let s = 0; s < steps; s++) {
          const f0 = s / steps;
          const f1 = (s + 1) / steps;
          const x0 = ax + (bx - ax) * f0;
          const y0 = ay + (by - ay) * f0;
          const x1 = ax + (bx - ax) * f1;
          const y1 = ay + (by - ay) * f1;
          const mx = (x0 + x1) / 2;
          const my = (y0 + y1) / 2;
          this.wallCells.add(`${Math.floor(mx)},${Math.floor(my)}`);
          this.occupied.add(`${Math.floor(mx)},${Math.floor(my)}`);
          if (gateAt(mx, my)) continue;
          put(wallChunk(x0, y0, x1, y1), mx, my);
        }
      }
    }
    for (const gt of W.gates) {
      const [gx, gy] = gt.at;
      const alongX = W.lines.some((l) => l.some(([, y], k) => k > 0 && Math.abs(y - gy) < 0.01 && Math.abs(l[k - 1][1] - gy) < 0.01));
      put(gt.clock ? clockTower(gx, gy, alongX, this.glows) : wallGate(gx, gy, alongX), gx + 0.3, gy + 0.3);
    }
    for (const [gx, gy] of W.garitas) put(garita(gx, gy), gx + 0.2, gy + 0.2);
    const n = this.zone.size;
    for (const [gx, gy, kind] of [[-2.5, 6, 'sail'], [9, -3, 'sail'], [-4.5, 17, 'boat'], [18, -2.2, 'boat'], [-1.8, 21, 'sail']]) {
      if (gx >= n || gy >= n) continue;
      const obj = kind === 'sail' ? sailboat() : motorBoat();
      const p = iso(gx, gy);
      obj.position.set(p.x, p.y);
      put(obj, gx, gy);
    }
  }

  // Buenaventura sea (v3.54): humpback whales visiting the bay and whale-watching
  // boats watching from afar. Self-animated (update) outside map edge.
  buildWhales() {
    const S = this.zone.sea;
    const put = (obj, gx, gy, update) => {
      const p = iso(gx, gy);
      obj.position.set(p.x, p.y);
      obj.zIndex = depth(gx, gy);
      obj.grid = [gx, gy];
      this.decor.push(obj);
      this.animated.push({ update });
    };
    for (const [k, [gx, gy, dir]] of S.whales.entries()) {
      const c = new Container();
      const g = new Graphics();
      c.addChild(g);
      c.scale.set(1.5); // oversized so they read across whole map
      put(c, gx, gy, (t) => drawWhale(g, t + k * 5.3, dir, k % 2 === 0));
    }
    for (const [k, [gx, gy]] of S.boats.entries()) {
      const c = motorBoat();
      const base = iso(gx, gy);
      put(c, gx, gy, (t) => c.position.set(base.x + Math.sin(t * 0.3 + k) * 6, base.y + Math.sin(t * 1.4 + k * 2) * 1.2));
    }
  }

  update(t) {
    for (const a of this.animated) a.update(t);
  }

  isFree(gx, gy, margin = 1, tiles = this.tiles) {
    for (let x = gx - margin; x <= gx + margin; x++) {
      for (let y = gy - margin; y <= gy + margin; y++) {
        const t = tiles[x]?.[y];
        if (t && t !== 'grass') return false;
      }
    }
    return true;
  }

  buildDecor() {
    const rng = createRng(this.zone.seed * 31 + 1);
    const n = this.zone.size;
    // Scatters props over single-lane map layout so second Willys (v3.9) shifts nothing:
    // only props colliding with new second lane are removed.
    const base = buildTileMap(this.zone);
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        // Inside Cartagena walls (v3.45) houses sit flush side by side like historic downtown.
        const walled = this.zone.walls && gx > 0 && gy > 0 && gx < 12 && gy < 11;
        // In Bogotá (v4.5), Eastern Hills: upper-right border packed with eucalyptus trees.
        const cerros = this.zone.style === 'bogota' && gy <= 3;
        if (!this.isFree(gx, gy, walled || cerros ? 0 : 1, base)) continue;
        const r = rng();
        let obj = null;
        if (this.zone.style === 'bogota') {
          // Bogotá (v4.5): at mountain foot, La Candelaria's colorful colonial houses; rest of city,
          // brick apartment blocks, eucalyptus, and streetlamps.
          const centro = gx >= 24 && gx <= 42 && gy <= 24;
          if (cerros) obj = MONSERRATE_CELLS(gx, gy) ? null : r < 0.5 ? eucalyptus(rng) : r < 0.6 ? rock(rng) : null;
          else if (r < 0.1) obj = centro && r < 0.075 ? townHouse(rng, 'bogota') : brickBuilding(rng);
          else if (r < 0.13) obj = eucalyptus(rng);
          else if (r < 0.145) obj = streetLamp();
        } else if (this.zone.theme === 'town') {
          // Pueblo: colorful cottages, blooming guayacanes, lamps, occasional wax palm. In Salento
          // (v3.12), more Cocora valley wax palms (keeps same RNG sequence so rest of map stays put).
          // stays put).
          const salento = this.zone.style === 'salento';
          const cartagena = this.zone.style === 'cartagena';
          const villa = this.zone.style === 'villa';
          const villavo = this.zone.style === 'villavo'; // Villavicencio (v3.36): moriches y mangos
          const puerto = this.zone.style === 'buenaventura'; // Buenaventura (v3.43): coconut palms and almond trees
          const leticia = this.zone.style === 'leticia'; // Leticia (v3.52): ceiba trees, açaí palms, and macaws
          const neiva = this.zone.style === 'neiva'; // Neiva (v4.0): guayacanes, ceibas y palmas
          if (r < 0.06 || (walled && r < 0.4)) obj = townHouse(rng, this.zone.style);
          else if (villavo && r < 0.135) obj = r < 0.085 ? mangoTree(rng) : r < 0.1 ? streetLamp() : morichePalm(rng);
          else if (neiva && r < 0.135) obj = r < 0.08 ? guayacan(rng) : r < 0.095 ? streetLamp() : r < 0.12 ? ceiba(rng) : palm(rng);
          else if (leticia && r < 0.135) obj = r < 0.08 ? asaiPalm(rng) : r < 0.095 ? streetLamp() : r < 0.12 ? ceiba(rng) : macaw(rng);
          else if (puerto && r < 0.135) obj = r < 0.09 ? coconutPalm(rng) : r < 0.105 ? streetLamp() : mangoTree(rng);
          else if (r < 0.09) obj = salento && r < 0.075 ? palm(rng) : cartagena ? coconutPalm(rng) : villa ? cypress(rng) : guayacan(rng);
          else if (r < 0.105) obj = streetLamp();
          else if (r < (salento || cartagena || villa ? 0.135 : 0.12)) obj = cartagena ? coconutPalm(rng) : villa ? eucalyptus(rng) : palm(rng);
        } else if (this.zone.region === 'cundinamarca') {
          // Cundinamarca (v4.4): cool green Bogotá Sabana with eucalyptus, fenceline cypresses,
          // boulders, and stray plastic greenhouses around Flores.
          const z = this.zone.id;
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.07) obj = cypress(rng);
          else if (r < 0.085) obj = rock(rng);
          else if (z === 'flores' && r < 0.1) obj = smallGreenhouse(rng);
          else if (z === 'fresas' && r < 0.1) obj = r < 0.093 ? smallGreenhouse(rng) : strawberryStand(rng);
          else if (z === 'truchas' && r < 0.105) obj = frailejon(rng);
          else if (z === 'salinas' && r < 0.1) obj = saltCart(rng);
          else if (z === 'cocina' && r < 0.1) obj = r < 0.093 ? hayBale(rng) : potStand(rng);
        } else if (this.zone.region === 'tolima') {
          // Tolima Grande (v4.0): hot Magdalena valley with samanes, yellow guayacanes, mango trees,
          // and herons; in Huila, stray coffee and shade guamo trees; in Achirales and La Chamba,
          // drier with cactus and roadside blackware pottery stalls.
          const z = this.zone.id;
          if (z === 'cafe_huila') {
            if (r < 0.04) obj = guamo(rng);
            else if (r < 0.08) obj = banana(rng);
            else if (r < 0.13) obj = coffeeBush(rng);
            else if (r < 0.15) obj = rock(rng);
          } else if (r < 0.03) obj = saman(rng);
          else if (r < 0.055) obj = guayacan(rng);
          else if (r < 0.075) obj = z === 'chamba' ? potStand(rng, true) : z === 'betania' ? egret(rng) : mangoTree(rng);
          else if (r < 0.09) obj = z === 'lechoneria' ? banana(rng) : z === 'betania' ? rock(rng) : cactus(rng);
          else if (r < 0.1) obj = palm(rng);
        } else if (this.zone.theme === 'guava') {
          // Santander: fique plants, stray guayabos, boulders, and canyon cactus.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.08) obj = guavaTree(rng);
          else if (r < 0.11) obj = rock(rng);
          else if (r < 0.125) obj = cactus(rng);
        } else if (this.zone.theme === 'tobacco') {
          // Tabacal: same dry Santander terrain, stray tobacco plants instead of guayabos.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.08) obj = tobaccoPlant(rng);
          else if (r < 0.11) obj = rock(rng);
          else if (r < 0.13) obj = cactus(rng);
        } else if (this.zone.theme === 'fique') {
          // Fiquera: extra wild fique, rocks, cactus, and occasional guayabo.
          if (r < 0.07) obj = fique(rng);
          else if (r < 0.09) obj = guavaTree(rng);
          else if (r < 0.12) obj = rock(rng);
          else if (r < 0.135) obj = cactus(rng);
        } else if (this.zone.theme === 'ants') {
          // Hormigas: dry canyon dirt, fique, cactus, rocks, and stray ant nests.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.065) obj = anthill(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.125) obj = cactus(rng);
        } else if (this.zone.theme === 'hides') {
          // Talabartería (v3.35): creole horses, samanes, moriche palms, and termite mounds.
          if (r < 0.02) obj = horse(rng);
          else if (r < 0.045) obj = saman(rng);
          else if (r < 0.07) obj = morichePalm(rng);
          else if (r < 0.09) obj = termiteMound(rng);
        } else if (this.zone.style === 'llanos') {
          // Hato llanero (v3.34): savanna with samanes, moriche groves, termite mounds, and herons.
          if (r < 0.03) obj = saman(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.08) obj = termiteMound(rng);
          else if (r < 0.1) obj = egret(rng);
        } else if (this.zone.theme === 'ranch') {
          // Hato: shade samanes for cattle, fique, boulders, and cactus.
          if (r < 0.035) obj = saman(rng);
          else if (r < 0.07) obj = fique(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.115) obj = cactus(rng);
        } else if (this.zone.theme === 'corn') {
          // Maizal: sunflowers, stray corn stalks, occasional scarecrow, and boulders.
          if (r < 0.04) obj = sunflower(rng);
          else if (r < 0.08) obj = cornClump(rng);
          else if (r < 0.09) obj = scarecrow(rng);
          else if (r < 0.11) obj = rock(rng);
        } else if (this.zone.theme === 'cacao') {
          // Cacaotal: shade guamo trees, plantains, heliconias, and stray cacao trees.
          if (r < 0.04) obj = guamo(rng);
          else if (r < 0.08) obj = banana(rng);
          else if (r < 0.11) obj = heliconia(rng);
          else if (r < 0.13) obj = cacaoTree(rng);
        } else if (this.zone.theme === 'dairy') {
          // Lechería: eucalyptus, cypresses, hay bales, and highland boulders.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.07) obj = cypress(rng);
          else if (r < 0.09) obj = hayBale(rng);
          // In Paipa (v3.25), páramo frailejones where Lechería has boulders.
          else if (r < 0.11) obj = this.zone.style === 'paipa' && r < 0.1 ? frailejon(rng) : rock(rng);
        } else if (this.zone.theme === 'rice') {
          // Arrozal (v3.15): giant ceibas, coconut palms, snowy egrets, and plantains.
          if (r < 0.025) obj = ceiba(rng);
          else if (r < 0.06) obj = coconutPalm(rng);
          else if (r < 0.085) obj = egret(rng);
          else if (r < 0.11) obj = banana(rng);
        } else if (this.zone.theme === 'sheep') {
          // Las Ruanas (v3.26): highland páramo with frailejones, rocks, eucalyptus, and cypress.
          if (r < 0.04) obj = frailejon(rng);
          else if (r < 0.065) obj = eucalyptus(rng);
          else if (r < 0.09) obj = rock(rng);
          else if (r < 0.1) obj = cypress(rng);
        } else if (this.zone.theme === 'clay') {
          // Ráquira (v3.24): dry hills with cactus and boulders, eucalyptus, and roadside clay pots.
          if (r < 0.03) obj = eucalyptus(rng);
          else if (r < 0.055) obj = cactus(rng);
          else if (r < 0.08) obj = rock(rng);
          else if (r < 0.095) obj = potStand(rng);
        } else if (this.zone.theme === 'barley') {
          // Cebadales (v3.23): eucalyptus, cypresses, straw bales, and rocks.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.065) obj = cypress(rng);
          else if (r < 0.085) obj = hayBale(rng);
          else if (r < 0.105) obj = rock(rng);
        } else if (this.zone.theme === 'ponds') {
          // La Cachamera (v3.33): herons, moriche groves, mango trees, and termite mounds.
          if (r < 0.03) obj = egret(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.075) obj = mangoTree(rng);
          else if (r < 0.09) obj = termiteMound(rng);
        } else if (this.zone.theme === 'fruit') {
          // El Frutal (v3.32): mango trees, moriche groves, termite mounds, and herons.
          if (r < 0.035) obj = mangoTree(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.075) obj = termiteMound(rng);
          else if (r < 0.09) obj = egret(rng);
        } else if (this.zone.theme === 'plantain' || this.zone.theme === 'azotea') {
          // Pacific Coast (v3.38): wet rainforest with chontaduro palms, borojós, heliconias, wild plantain.
          if (r < 0.03) obj = chontaduroPalm(rng);
          else if (r < 0.055) obj = borojoTree(rng);
          else if (r < 0.085) obj = heliconia(rng);
          else if (r < 0.11) obj = banana(rng);
        } else if (this.zone.theme === 'palm') {
          // Llanos (v3.31): moriche palms, termite mounds, herons, and occasional oil palm.
          if (r < 0.03) obj = morichePalm(rng);
          else if (r < 0.055) obj = termiteMound(rng);
          else if (r < 0.075) obj = egret(rng);
          else if (r < 0.095) obj = oilPalm(rng);
          else if (r < 0.105) obj = saman(rng);
        } else if (this.zone.theme === 'potato') {
          // Altiplano (v3.22): eucalyptus, páramo frailejones, boulders, and occasional cypress.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.07) obj = frailejon(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.115) obj = cypress(rng);
        } else if (this.zone.theme === 'canaflecha') {
          // Tierra zenú (v3.19): caña flecha clumps, hats hanging for sale, samanes, and palms.
          if (r < 0.05) obj = canaFlechaClump(rng);
          else if (r < 0.062) obj = hatPole(rng);
          else if (r < 0.085) obj = saman(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
          else if (r < 0.115) obj = egret(rng);
        } else if (this.zone.theme === 'savanna') {
          // Sabana (v3.18): cattle-shade samanes, cattle egrets, coconut palms, occasional ceiba.
          if (r < 0.03) obj = saman(rng);
          else if (r < 0.055) obj = egret(rng);
          else if (r < 0.075) obj = coconutPalm(rng);
          else if (r < 0.088) obj = ceiba(rng);
        } else if (this.zone.theme === 'asai' || this.zone.theme === 'aji' || this.zone.theme === 'lake' || this.zone.theme === 'chagra' || this.zone.theme === 'yanchama') {
          // Amazon (v3.47): riverbank jungle with giant ceibas, heliconias, plantains, stray açaí,
          // and perched macaws.
          if (r < 0.025) obj = ceiba(rng);
          else if (r < 0.05) obj = asaiPalm(rng);
          else if (r < 0.075) obj = heliconia(rng);
          else if (r < 0.095) obj = banana(rng);
          else if (r < 0.105) obj = macaw(rng);
        } else if (this.zone.theme === 'werregue') {
          // Werregue (v3.42): San Juan river jungle with Wounaan tambo huts, chontaduro, heliconias, borojó.
          if (r < 0.012) obj = tambo(rng);
          else if (r < 0.04) obj = chontaduroPalm(rng);
          else if (r < 0.065) obj = heliconia(rng);
          else if (r < 0.085) obj = borojoTree(rng);
          else if (r < 0.1) obj = banana(rng);
        } else if (this.zone.theme === 'mangrove') {
          // Manglar (v3.41): stray mangroves, herons, heliconias, and coconut palms.
          if (r < 0.04) obj = mangroveTree(rng);
          else if (r < 0.065) obj = egret(rng);
          else if (r < 0.085) obj = heliconia(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
        } else if (this.zone.theme === 'bay') {
          // Bahía (v3.40): coconut palms, beach rocks, drying nets, heliconias, chontaduro.
          if (r < 0.04) obj = coconutPalm(rng);
          else if (r < 0.06) obj = rock(rng);
          else if (r < 0.075) obj = netRack(rng);
          else if (r < 0.095) obj = heliconia(rng);
          else if (r < 0.11) obj = chontaduroPalm(rng);
        } else if (this.zone.theme === 'cienaga') {
          // Ciénaga (v3.17): herons, drying fishing nets, ceibas, plantains, coconut palms.
          if (r < 0.03) obj = egret(rng);
          else if (r < 0.045) obj = netRack(rng);
          else if (r < 0.058) obj = ceiba(rng);
          else if (r < 0.08) obj = banana(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
        } else if (this.zone.theme === 'coconut') {
          // Cocal (v3.16): coconut palms everywhere, fallen coconuts, plantains, occasional ceiba.
          if (r < 0.06) obj = coconutPalm(rng);
          else if (r < 0.08) obj = coconutPile(rng);
          else if (r < 0.1) obj = banana(rng);
          else if (r < 0.112) obj = ceiba(rng);
        } else if (this.zone.theme === 'cane') {
          // Trapiche: bamboo groves, stray sugar cane, occasional samán.
          if (r < 0.05) obj = guadua(rng);
          else if (r < 0.1) obj = caneClump(rng);
          else if (r < 0.12) obj = saman(rng);
          else if (r < 0.14) obj = rock(rng);
        } else {
          if (r < 0.05) obj = palm(rng);
          else if (r < 0.1) obj = banana(rng);
          else if (r < 0.15) obj = coffeeBush(rng);
          else if (r < 0.17) obj = rock(rng);
        }
        if (!obj || !this.isFree(gx, gy, walled ? 0 : 1) || SIGN_CELLS.has(`${gx - (this.zone.signShift?.[0] ?? 0)},${gy - (this.zone.signShift?.[1] ?? 0)}`) || this.wallCells?.has(`${gx},${gy}`)) continue;
        this.occupied.add(`${gx},${gy}`);
        const ox = 0.3 + rng() * 0.4;
        const oy = 0.3 + rng() * 0.4;
        const p = iso(gx + ox, gy + oy);
        obj.position.set(p.x, p.y);
        obj.zIndex = depth(gx + ox, gy + oy);
        obj.grid = [gx + ox, gy + oy]; // (v3.14: events clear props intersecting event spots)
        this.decor.push(obj);
      }
    }
    if (this.zone.island) this.buildIslandDecor(base, rng);
  }

  // Island (v5.4): coconut palms and beach umbrellas on the sand, boulders on the coral shore, and boats out at
  // sea (a launch moored at the pier).
  buildIslandDecor(base, rng) {
    const n = this.zone.size;
    const put = (obj, gx, gy) => {
      const p = iso(gx, gy);
      obj.position.set(p.x, p.y);
      obj.zIndex = depth(gx, gy);
      obj.grid = [gx, gy];
      this.decor.push(obj);
    };
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        const t = base[gx][gy];
        const r = rng();
        const x = gx + 0.3 + rng() * 0.4;
        const y = gy + 0.3 + rng() * 0.4;
        if (SIGN_CELLS.has(`${gx},${gy}`)) continue;
        if (t === 'beach' && r < 0.16) put(coconutPalm(rng), x, y);
        else if (t === 'beach' && r < 0.24) put(parasol(rng), x, y);
        else if (t === 'rocks' && r < 0.3) put(rock(rng), x, y);
        else if (t === 'sea' && r < 0.03) put(rng() < 0.5 ? sailboat() : motorBoat(), x, y);
        else continue;
        this.occupied.add(`${gx},${gy}`);
      }
    }
    for (const [gx, gy, kind] of [[-3, 6, 'sail'], [8, -4, 'boat'], [-5, 18, 'sail'], [17, -2.5, 'sail'], [n + 4, 5, 'boat'], [n + 3, 22, 'sail'], [12, n + 4, 'boat'], [-2.5, n + 2, 'sail']]) {
      put(kind === 'sail' ? sailboat() : motorBoat(), gx, gy);
    }
    const end = this.zone.jeepRoad.at(-1);
    if (end[0] >= n - 0.5) put(motorBoat(), n + 4.3, Math.floor(end[1]) + 0.2);
  }
}

// Beach umbrella (v5.4) in bright island colors, with a towel.
function parasol(rng) {
  const c = new Container();
  const g = new Graphics();
  const colors = [[0xe63946, 0xffffff], [0x2a9d8f, 0xf4d35e], [0xf4a261, 0x264653], [0x8e44ad, 0xffffff]][Math.floor(rng() * 4)];
  shadow(g, 3, 1, 12, 4);
  g.roundRect(-9, -1, 10, 4, 1.5).fill(colors[0] === 0xe63946 ? 0x4cc9f0 : 0xf28482);
  g.moveTo(0, 0).lineTo(1, -22).stroke({ width: 1.3, color: 0x6d4c41 });
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI + (k / 6) * Math.PI;
    const a1 = Math.PI + ((k + 1) / 6) * Math.PI;
    g.poly([1, -26, 1 + Math.cos(a0) * 14, -20 + Math.sin(a0) * 2.5, 1 + Math.cos(a1) * 14, -20 + Math.sin(a1) * 2.5]).fill(colors[k % 2]);
  }
  g.ellipse(1, -20, 14, 2.6).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  c.addChild(g);
  return c;
}

// ---------- Vélez plaza (v3.29) ----------
// Dimensions inside plaza (in tiles from corner). Nave runs along gy with front facade
// facing fountain (+gy, facing viewer) and bell tower to its right without hiding facade.
export const CHURCH = {
  nave: { x: 0.7, y: 0.3, w: 1.7, d: 2.15, h: 40, roof: 20 },
  tower: { x: 2.35, y: 1.6, w: 0.95, d: 0.85, h: 104 },
  atrium: { x: 0.3, y: 0.2, w: 3.3, d: 2.75, h: 3 },
};
const CHURCH_WALL = 0xf7f4ee;
const CHURCH_STONE = 0xcdbb94;

// Stone forecourt step raised above plaza, steps facing main gate. Drawn in ground
// layer so people and mules always render on top.
export function drawAtrium(g, pz) {
  const { atrium: at, nave } = CHURCH;
  box(g, pz.x + at.x, pz.y + at.y, at.w, at.d, at.h, CHURCH_STONE);
  box(g, pz.x + nave.x + nave.w / 2 - 0.4, pz.y + at.y + at.d, 0.8, 0.3, 1.5, shade(CHURCH_STONE, 0.95));
}

// Arched recess on wall facing +gx (plane gx = at) or +gy (plane gy = at), from a to b.
function archOn(g, face, at, a, b, z0, z1, color) {
  const mid = (a + b) / 2;
  const r = (b - a) / 2;
  const P = (u, z) => (face === 'x' ? [at, u, z] : [u, at, z]);
  const pts = [P(a, z0), P(b, z0), P(b, z1)];
  for (let k = 1; k < 8; k++) {
    const t = (k / 8) * Math.PI;
    pts.push(P(mid + Math.cos(t) * r, z1 + Math.sin(t) * r * 26));
  }
  pts.push(P(a, z1));
  g.poly(isoPoly(pts)).fill(color).stroke(OUTLINE);
}

// Gable roof with ridge parallel to gy: front gable sits on +gy facade.
function gableRoofY(g, x, y, w, d, wallH, roofH, color, wallColor, overhang = 0.12) {
  const x0 = x - overhang, x1 = x + w + overhang;
  const y0 = y - overhang, y1 = y + d + overhang;
  const xm = x + w / 2;
  const top = wallH + roofH;
  g.poly(isoPoly([[x0, y0, wallH], [x0, y1, wallH], [xm, y1, top], [xm, y0, top]])).fill(shade(color, 1.1)).stroke(OUTLINE);
  g.poly(isoPoly([[x, y + d, wallH], [x + w, y + d, wallH], [xm, y + d, top]])).fill(shade(wallColor, 0.9)).stroke(OUTLINE);
  g.poly(isoPoly([[x1, y0, wallH], [x1, y1, wallH], [xm, y1, top], [xm, y0, top]])).fill(shade(color, 0.8)).stroke(OUTLINE);
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const xx = x1 + (xm - x1) * t;
    const hh = wallH + roofH * t;
    const [ax, ay, bx, by] = isoPoly([[xx, y0, hh], [xx, y1, hh]]);
    g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 1, color: shade(color, 0.6), alpha: 0.5 });
  }
}

function cross(g, x, y, h = 11) {
  g.rect(x - 0.8, y - h, 1.6, h).fill(0x3a2418);
  g.rect(x - 3, y - h * 0.72, 6, 1.6).fill(0x3a2418);
}

// Single-tower church: white nave with plinth, clay tile roof, arched gate, rose window,
// and facade cross; belfry tower (bell and arches), tiled dome, and cross.
function velezChurch(pz, glows) {
  const c = new Container();
  const g = new Graphics();
  const { nave: N, tower: T, atrium: A } = CHURCH;
  const nx = pz.x + N.x;
  const ny = pz.y + N.y;
  const z = A.h;
  const top = z + N.h;
  box(g, nx, ny, N.w, N.d, 5, 0xd8c7a3, { z });
  box(g, nx, ny, N.w, N.d, N.h - 5, CHURCH_WALL, { z: z + 5 });
  gableRoofY(g, nx, ny, N.w, N.d, top, N.roof, PAL.roof, CHURCH_WALL);
  // Side nave: tall windows and buttresses.
  for (const wy of [0.35, 1.1]) archOn(g, 'x', nx + N.w, ny + wy, ny + wy + 0.28, z + 16, z + 25, 0x6f8fb0);
  for (const by of [0.15, 0.85, 1.55]) box(g, nx + N.w, ny + by, 0.12, 0.15, 24, shade(CHURCH_WALL, 0.97), { z });
  // Front facade: pilasters, arched gate, round window, and rooftop cross.
  const fy = ny + N.d;
  const fm = nx + N.w / 2;
  for (const px of [0.12, N.w - 0.26]) box(g, nx + px, fy, 0.14, 0.08, N.h - 2, shade(CHURCH_WALL, 1.02), { z });
  archOn(g, 'y', fy, fm - 0.34, fm + 0.34, z, z + 19, shade(CHURCH_STONE, 0.95));
  archOn(g, 'y', fy, fm - 0.25, fm + 0.25, z, z + 17, 0x6b3f22);
  const d0 = iso(fm, fy, z);
  const d1 = iso(fm, fy, z + 23);
  g.moveTo(d0.x, d0.y).lineTo(d1.x, d1.y).stroke({ width: 1, color: 0x3a2418 });
  const rose = iso(fm, fy, top + 5);
  g.circle(rose.x, rose.y, 4).fill(0x6f8fb0).stroke(OUTLINE);
  const apex = iso(fm, fy, top + N.roof);
  cross(g, apex.x, apex.y);
  // Bell tower.
  const tx = pz.x + T.x;
  const ty = pz.y + T.y;
  const tz = z + T.h;
  box(g, tx, ty, T.w, T.d, 5, 0xd8c7a3, { z });
  box(g, tx, ty, T.w, T.d, T.h - 5, CHURCH_WALL, { z: z + 5 });
  for (const zz of [z + 40, tz - 22]) box(g, tx - 0.05, ty - 0.05, T.w + 0.1, T.d + 0.1, 3, shade(CHURCH_STONE, 1.05), { z: zz });
  box(g, tx - 0.08, ty - 0.08, T.w + 0.16, T.d + 0.16, 3, shade(CHURCH_STONE, 1.05), { z: tz });
  archOn(g, 'y', ty + T.d, tx + 0.22, tx + T.w - 0.22, tz - 17, tz - 9, 0x2b1d14);
  archOn(g, 'x', tx + T.w, ty + 0.2, ty + T.d - 0.2, tz - 17, tz - 9, 0x2b1d14);
  const bell = iso(tx + T.w / 2, ty + T.d, tz - 12);
  g.poly([bell.x - 3.6, bell.y + 3.5, bell.x + 3.6, bell.y + 3.5, bell.x + 2.2, bell.y - 3.5, bell.x - 2.2, bell.y - 3.5]).fill(0xc9a13b).stroke({ width: 1, color: 0x3a2418, alpha: 0.7 });
  archOn(g, 'y', ty + T.d, tx + 0.3, tx + T.w - 0.3, z + 22, z + 30, 0x6f8fb0);
  const capH = 20;
  const peak = [tx + T.w / 2, ty + T.d / 2, tz + 3 + capH];
  g.poly(isoPoly([[tx - 0.08, ty + T.d + 0.08, tz + 3], [tx + T.w + 0.08, ty + T.d + 0.08, tz + 3], peak])).fill(shade(PAL.roof, 0.88)).stroke(OUTLINE);
  g.poly(isoPoly([[tx + T.w + 0.08, ty - 0.08, tz + 3], [tx + T.w + 0.08, ty + T.d + 0.08, tz + 3], peak])).fill(shade(PAL.roof, 0.72)).stroke(OUTLINE);
  const tip = iso(...peak);
  cross(g, tip.x, tip.y, 12);
  c.addChild(g);
  // Night lighting illuminates gate, rose window, and visible side window clear of tower.
  const door = iso(fm, fy, z + 9);
  const win = iso(nx + N.w, ny + 0.49, z + 21);
  glows.push({ x: door.x, y: door.y, r: 20 }, { x: rose.x, y: rose.y, r: 10 }, { x: win.x, y: win.y, r: 9 });
  return c;
}

// Plaza fountain with splashing water jet.
function fountain() {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 2, 20, 8);
  g.ellipse(0, -4, 19, 8).fill(shade(CHURCH_STONE, 0.85)).stroke(OUTLINE);
  g.ellipse(0, -6, 19, 8).fill(CHURCH_STONE).stroke(OUTLINE);
  g.ellipse(0, -6, 15, 6).fill(0x7fb3d5);
  g.rect(-2.5, -20, 5, 14).fill(CHURCH_STONE).stroke(OUTLINE);
  g.ellipse(0, -20, 6, 2.6).fill(shade(CHURCH_STONE, 1.05)).stroke(OUTLINE);
  g.moveTo(0, -21).quadraticCurveTo(-5, -28, -9, -8).moveTo(0, -21).quadraticCurveTo(5, -28, 9, -8).stroke({ width: 1.4, color: 0xd6ecf7 });
  c.addChild(g);
  return c;
}

// ---------- Cartagena walled city (v3.45) ----------
const WALL_STONE = 0xcdb88e; // piedra coralina
const WALL_H = 16;
const WALL_T = 0.34; // wall thickness in tiles

// Rampart stretch from (x0, y0) to (x1, y1) along gx or gy: wall with darker plinth,
// parapet walk, and battlements along ocean side.
function wallChunk(x0, y0, x1, y1) {
  const c = new Container();
  const g = new Graphics();
  const alongX = Math.abs(y1 - y0) < 1e-6;
  const x = alongX ? Math.min(x0, x1) : x0 - WALL_T / 2;
  const y = alongX ? y0 - WALL_T / 2 : Math.min(y0, y1);
  const w = alongX ? Math.abs(x1 - x0) : WALL_T;
  const d = alongX ? WALL_T : Math.abs(y1 - y0);
  box(g, x, y, w, d, 4, shade(WALL_STONE, 0.8));
  box(g, x, y, w, d, WALL_H - 4, WALL_STONE, { z: 4 });
  // Stone courses on visible face.
  for (const z of [8, 12]) {
    const a = alongX ? iso(x, y + d, z) : iso(x + w, y, z);
    const b = alongX ? iso(x + w, y + d, z) : iso(x + w, y + d, z);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: shade(WALL_STONE, 0.65), alpha: 0.6 });
  }
  // Battlements along outer sea-facing edge (smaller gx or gy side).
  const k = Math.max(1, Math.round((alongX ? w : d) / 0.25));
  for (let i = 0; i < k; i += 2) {
    const f = i / k;
    if (alongX) box(g, x + w * f, y, w / k, 0.08, 4, shade(WALL_STONE, 1.05), { z: WALL_H });
    else box(g, x, y + d * f, 0.08, d / k, 4, shade(WALL_STONE, 1.05), { z: WALL_H });
  }
  c.addChild(g);
  return c;
}

// City gate through rampart: taller flanking piers and arched opening over road.
function wallGate(gx, gy, alongX) {
  const c = new Container();
  const g = new Graphics();
  const half = 0.5;
  const t = WALL_T + 0.08;
  for (const s of [-1, 1]) {
    const px = alongX ? gx + s * half - (s > 0 ? 0 : 0.2) : gx - t / 2;
    const py = alongX ? gy - t / 2 : gy + s * half - (s > 0 ? 0 : 0.2);
    box(g, px, py, alongX ? 0.2 : t, alongX ? t : 0.2, WALL_H + 6, shade(WALL_STONE, 1.02));
  }
  const ax = alongX ? gx - half : gx - t / 2;
  const ay = alongX ? gy - t / 2 : gy - half;
  box(g, ax, ay, alongX ? 1.2 : t, alongX ? t : 1.2, 6, WALL_STONE, { z: WALL_H });
  const p0 = alongX ? iso(gx - 0.35, gy + t / 2, 0) : iso(gx + t / 2, gy - 0.35, 0);
  const p1 = alongX ? iso(gx + 0.35, gy + t / 2, 0) : iso(gx + t / 2, gy + 0.35, 0);
  const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  g.moveTo(p0.x, p0.y).lineTo(p0.x, p0.y - 10).quadraticCurveTo(mid.x, mid.y - 22, p1.x, p1.y - 10).lineTo(p1.x, p1.y).closePath().fill(0x4a3a2a);
  c.addChild(g);
  return c;
}

// Clock Tower: main yellow gateway with three arches, clock face, dome, and weathervane.
// glows: night lights (clock face glows).
function clockTower(gx, gy, alongX, glows) {
  const c = new Container();
  const g = new Graphics();
  const w = alongX ? 1.4 : 0.7;
  const d = alongX ? 0.7 : 1.4;
  const x = gx - w / 2;
  const y = gy - d / 2;
  const H = 46;
  const color = 0xf2c94c;
  box(g, x - 0.1, y - 0.1, w + 0.2, d + 0.2, 26, shade(color, 0.95));
  box(g, x, y, w, d, H - 26, color, { z: 26 });
  box(g, x + w * 0.2, y + d * 0.2, w * 0.6, d * 0.6, 12, shade(color, 1.05), { z: H });
  // Three arches (on front-facing wall).
  for (const f of alongX ? [0.2, 0.5, 0.8] : [0.5]) {
    const p = alongX ? iso(x + w * f, y + d + 0.1, 0) : iso(x + w + 0.1, y + d * f, 0);
    g.moveTo(p.x - 5, p.y).lineTo(p.x - 5, p.y - 12).quadraticCurveTo(p.x, p.y - 20, p.x + 5, p.y - 12).lineTo(p.x + 5, p.y).closePath().fill(0x4a3a2a);
  }
  // Clock dial.
  const ck = alongX ? iso(gx, y + d, 37) : iso(x + w, gy, 37);
  g.circle(ck.x, ck.y, 6).fill(0xffffff).stroke(OUTLINE);
  g.moveTo(ck.x, ck.y).lineTo(ck.x, ck.y - 4).moveTo(ck.x, ck.y).lineTo(ck.x + 3, ck.y + 1).stroke({ width: 1, color: 0x263238 });
  glows.push({ x: ck.x, y: ck.y, r: 14, color: 0xfff3c4 });
  // Dome and weathervane.
  const top = iso(gx, gy, H + 12);
  g.moveTo(top.x - 9, top.y).quadraticCurveTo(top.x, top.y - 16, top.x + 9, top.y).closePath().fill(0xe0e0e0).stroke(OUTLINE);
  g.moveTo(top.x, top.y - 12).lineTo(top.x, top.y - 22).stroke({ width: 1.2, color: 0x37474f });
  g.poly([top.x, top.y - 22, top.x + 6, top.y - 20, top.x, top.y - 18]).fill(0x37474f);
  c.addChild(g);
  return c;
}

// Garita: cylindrical stone sentry turret perched on rampart with dome and ocean slit.
function garita(gx, gy) {
  const c = new Container();
  const g = new Graphics();
  const p = iso(gx, gy, WALL_H);
  g.rect(p.x - 5, p.y - 14, 10, 14).fill(shade(WALL_STONE, 1.05)).stroke(OUTLINE);
  g.ellipse(p.x, p.y, 5, 2).fill(shade(WALL_STONE, 0.9)).stroke(OUTLINE);
  g.moveTo(p.x - 6, p.y - 14).quadraticCurveTo(p.x, p.y - 26, p.x + 6, p.y - 14).closePath().fill(shade(WALL_STONE, 1.12)).stroke(OUTLINE);
  g.circle(p.x, p.y - 23, 1.4).fill(shade(WALL_STONE, 0.8));
  g.rect(p.x - 1, p.y - 10, 2, 4).fill(0x3a2a1a);
  c.addChild(g);
  return c;
}

// Humpback whale (v3.54) on 16 s loop: surfaces back and blows spout, dives flashing
// tail fluke, and if breaching leaps nearly clear before splashing down. dir: 1 or -1
// (swim direction).
const WHALE = 0x37474f;
function drawWhale(g, t, dir, breach) {
  g.clear();
  const T = 16;
  const u = (((t % T) + T) % T) / T;
  const x = (u - 0.5) * 36 * dir;
  const ripple = (cx, r, a) => g.ellipse(cx, 2, r, r * 0.3).stroke({ width: 1, color: 0xffffff, alpha: a });
  if (u < 0.36) {
    // Surfacing back rising and dipping with dorsal fin; spout at start.
    const up = Math.sin((u / 0.36) * Math.PI);
    const h = 3 + up * 4;
    g.ellipse(x, 2, 24, 4).fill({ color: 0x1f5f80, alpha: 0.6 });
    g.moveTo(x - 20 * dir, 2).quadraticCurveTo(x, 2 - h * 2, x + 20 * dir, 2).closePath().fill(WHALE).stroke({ width: 0.8, color: 0x263238 });
    g.poly([x - 6 * dir, 2 - h * 0.9, x - 9 * dir, 2 - h - 3, x - 11 * dir, 2 - h * 0.6]).fill(WHALE);
    ripple(x, 26, 0.45);
    if (u < 0.12) {
      const f = u / 0.12;
      const sx = x + 12 * dir;
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 1.2;
        g.circle(sx + Math.sin(a) * 9 * f, 2 - h - 4 - 22 * f * Math.cos(a), 2.2 - f).fill({ color: 0xffffff, alpha: 0.8 * (1 - f * 0.6) });
      }
    }
  } else if (u < 0.5) {
    // Dive: tail fluke rises above waves (white underside) then slips beneath.
    const f = (u - 0.36) / 0.14;
    const h = Math.sin(f * Math.PI) * 18;
    const cx = x + 10 * dir;
    g.moveTo(cx - 2, 2).lineTo(cx - 1.5, 2 - h + 6).lineTo(cx + 1.5, 2 - h + 6).lineTo(cx + 2, 2).closePath().fill(WHALE);
    g.moveTo(cx, 2 - h + 6).quadraticCurveTo(cx - 8, 2 - h + 2, cx - 14, 2 - h - 4).quadraticCurveTo(cx - 6, 2 - h - 1, cx, 2 - h + 2).quadraticCurveTo(cx + 6, 2 - h - 1, cx + 14, 2 - h - 4).quadraticCurveTo(cx + 8, 2 - h + 2, cx, 2 - h + 6).fill(WHALE).stroke({ width: 0.8, color: 0x263238 });
    g.moveTo(cx - 10, 2 - h - 1.5).quadraticCurveTo(cx - 4, 2 - h + 0.5, cx, 2 - h + 4).quadraticCurveTo(cx + 4, 2 - h + 0.5, cx + 10, 2 - h - 1.5).stroke({ width: 1.4, color: 0xcfd8dc });
    for (let i = 0; i < 4; i++) g.circle(cx - 9 + i * 6, 2 - h - 2 + Math.sin(i * 2 + f * 6) * 2 + f * 6, 1).fill({ color: 0xffffff, alpha: 0.8 * (1 - f) });
    ripple(cx, 10 + f * 10, 0.6 * (1 - f));
  } else if (breach && u > 0.7 && u < 0.84) {
    // Breach: emerges sideways showing long white pectoral fin, then drops.
    const f = (u - 0.7) / 0.14;
    const h = Math.sin(f * Math.PI) * 30;
    const rot = (-0.9 + f * 1.6) * dir;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const at = (px, py) => [x + px * cos - py * sin, 2 - h + px * sin + py * cos];
    const body = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      body.push(...at(Math.cos(a) * 20, Math.sin(a) * 6));
    }
    g.ellipse(x, 2, 18 + f * 10, 4).fill({ color: 0xffffff, alpha: 0.5 });
    g.poly(body).fill(WHALE).stroke({ width: 0.8, color: 0x263238 });
    g.poly([...at(-14, 3), ...at(14, 4), ...at(-6, 6)]).fill(0xcfd8dc);
    g.poly([...at(-6 * dir, 2), ...at(-2 * dir, 18), ...at(2 * dir, 3)]).fill(0xeceff1).stroke({ width: 0.6, color: 0x263238 });
    for (let i = 0; i < 8; i++) g.circle(x - 16 + i * 4.5, 2 - Math.abs(Math.sin(i * 1.7)) * 6 * (1 - f), 1.4).fill({ color: 0xffffff, alpha: 0.85 });
  } else if (breach && u >= 0.84 && u < 0.92) {
    // Splash ring.
    const f = (u - 0.84) / 0.08;
    for (let i = 0; i < 12; i++) {
      const a = (i / 11) * Math.PI;
      g.circle(x + Math.cos(a) * 18 * (0.5 + f), 2 - Math.sin(a) * 18 * (1 - f) * (0.6 + (i % 3) * 0.2), 2.2 - f).fill({ color: 0xffffff, alpha: 0.9 * (1 - f) });
    }
    ripple(x, 14 + f * 22, 0.7 * (1 - f));
  } else if (u > 0.92) {
    ripple(x, 6 + (u - 0.92) * 120, 0.3);
  }
}

// Bay sailboat with white sail.
function sailboat() {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, 3, 16, 3.5).fill({ color: 0x1f5f80, alpha: 0.5 });
  g.moveTo(-14, -2).quadraticCurveTo(0, 6, 14, -2).lineTo(10, 2).quadraticCurveTo(0, 6, -10, 2).closePath().fill(0xf7f4ee).stroke(OUTLINE);
  g.moveTo(0, 0).lineTo(0, -30).stroke({ width: 1.4, color: 0x5d4037 });
  g.poly([1, -29, 1, -4, 14, -6]).fill(0xffffff).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  g.poly([-1, -26, -1, -6, -10, -7]).fill(0xf2c94c).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  c.addChild(g);
  return c;
}

// Passenger motor launch with blue awning.
function motorBoat() {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, 3, 15, 3).fill({ color: 0x1f5f80, alpha: 0.5 });
  g.moveTo(-13, -2).quadraticCurveTo(0, 5, 13, -2).lineTo(10, 1).quadraticCurveTo(0, 5, -10, 1).closePath().fill(0xffffff).stroke(OUTLINE);
  for (const x of [-7, 7]) g.rect(x - 0.6, -10, 1.2, 8).fill(0x90a4ae);
  g.rect(-9, -12, 18, 3).fill(0x1e88e5).stroke({ width: 0.6, color: 0x3a2418 });
  for (let i = 0; i < 3; i++) g.circle(-5 + i * 5, -4, 1.8).fill(0xff6f00);
  g.moveTo(13, -1).lineTo(20, 1).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.7 });
  c.addChild(g);
  return c;
}

// Wooden plaza bench.
function bench() {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 11, 4);
  g.poly(isoPoly([[-0.3, -0.08, 6], [0.3, -0.08, 6], [0.3, 0.08, 6], [-0.3, 0.08, 6]])).fill(0x9a6a3a).stroke(OUTLINE);
  g.poly(isoPoly([[-0.3, -0.08, 6], [0.3, -0.08, 6], [0.3, -0.08, 12], [-0.3, -0.08, 12]])).fill(0x8b5a2b).stroke(OUTLINE);
  for (const x of [-0.26, 0.26]) {
    const a = iso(x, 0.06, 0);
    g.rect(a.x - 1, a.y - 6, 2, 6).fill(0x3a2418);
  }
  c.addChild(g);
  return c;
}

// Soil tint for unlimited source matching zone theme.
const FARM_SOIL = {
  cane: (v) => mix(0x9c7a4a, 0x7f6038, v * 0.35),
  dairy: (v) => mix(0x5e9a3c, 0x6fae44, v * 0.5),
  ranch: (v) => mix(0x7fa04a, 0x93ad55, v * 0.5),
  savanna: (v) => mix(0x8fae4e, 0xa3b85a, v * 0.5), // Córdoba & Sucre savanna // drier hot-country pasture
  cacao: (v) => mix(0x5e4630, 0x4a3726, v * 0.5),
  corn: (v) => mix(0xa47c48, 0x8a6a3a, v * 0.4),
  guava: (v) => mix(0xb8754a, 0x9c5e3a, v * 0.4), // Santander red earth
  tobacco: (v) => mix(0xb07048, 0x94583a, v * 0.4),
  fique: (v) => mix(0xb8805a, 0x9c6a48, v * 0.4),
  ants: (v) => mix(0xc0784a, 0xa86438, v * 0.4),
  town: (v) => mix(0xc9bfae, 0xb3a893, v * 0.6),
  palm: (v) => mix(0x6a9a3e, 0x7aa848, v * 0.5), // palm grove over grass (v3.31)
  fruit: (v) => mix(0x8a6a44, 0x7a5c3a, v * 0.4), // trellis soil (v3.32)
  ponds: (v) => mix(0x4f8f9a, 0x5a9aa0, v * 0.6), // greenish pond water (v3.33)
  llanos: (v) => mix(0x9ab44e, 0xa8bc58, v * 0.5), // Hato llanero savanna (v3.34)
  hides: (v) => mix(0xb89a6a, 0xa8885a, v * 0.4), // tannery dirt yard (v3.35)
  plantain: (v) => mix(0x5a4a30, 0x4a3d28, v * 0.5), // wet black soil of plantain grove (v3.38)
  azotea: (v) => mix(0x6a5a3a, 0x5a4a30, v * 0.5), // azotea herb yard (v3.39)
  bay: (v) => mix(0x2f86a8, 0x3a94b4, v * 0.6), // Bahía seawater (v3.40)
  mangrove: (v) => mix(0x5d5040, 0x6a5c48, v * 0.5), // mangrove mudflat (v3.41)
  werregue: (v) => mix(0x4f5a30, 0x5a6638, v * 0.5), // werregue palm forest floor (v3.42)
  asai: (v) => mix(0x4a5236, 0x56603e, v * 0.5), // wet açaí floodplain (v3.47)
  aji: (v) => mix(0x7a5236, 0x6a462e, v * 0.5), // chagra garden plot (v3.48)
  lake: (v) => mix(0x2e5048, 0x365a50, v * 0.6), // dark lake blackwater (v3.49)
  chagra: (v) => mix(0x6e4a30, 0x7a5638, v * 0.5), // cassava chagra soil (v3.50)
  yanchama: (v) => mix(0x3f4a2e, 0x4a5636, v * 0.5), // dark yanchama forest floor (v3.51)
  rice: (v) => mix(0x6fa38a, 0x5c9480, v * 0.5),
  coconut: (v) => mix(0xe6d39e, 0xd6c08a, v * 0.5),
  cienaga: (v) => mix(0x4f9aa6, 0x5aa7a8, v * 0.6),
  potato: (v) => mix(0x4a3526, 0x3a291d, v * 0.5),
  sheep: (v) => mix(0x8fa86a, 0x7f9a5c, v * 0.5), // páramo highland grass
  clay: (v) => mix(0xc0784a, 0xa8653c, v * 0.45), // Ráquira red potter's clay
  // Tolima Grande (v4.0)
  achira: (v) => mix(0x7a5a3a, 0x6a4e30, v * 0.45), // achiral soil
  // Cundinamarca (v4.4)
  roses: (v) => mix(0x5a4a36, 0x4e402e, v * 0.45), // dark Sabana soil beneath greenhouses
  strawberry: (v) => mix(0x5a4a36, 0x4e402e, v * 0.45), // same dark soil for strawberry rows
  salt: (v) => mix(0xb8ab98, 0xa8998a, v * 0.45), // salt mine yard, pale salty gray dust
  pigs: (v) => mix(0x8a8a4a, 0x7a7a42, v * 0.5), // muddy pig pen
  betania: (v) => mix(0x3f7f78, 0x4a8a80, v * 0.6), // green reservoir water
  chamba: (v) => mix(0x8d6e5a, 0x7a5c4a, v * 0.45), // gray Magdalena clay bluff
  barley: (v) => mix(0x8a6a3a, 0x7a5c30, v * 0.5), // rich dark altiplano topsoil
  canaflecha: (v) => mix(0xb59a5c, 0xa58a4e, v * 0.4), // dry Zenú savanna dirt // ciénaga water // Morrosquillo beach sand // teal rice paddy water
  barichara: (v) => mix(0xd9c08c, 0xc4a870, v * 0.6),
  cartagena: (v) => mix(0xe2d2ae, 0xcfbd94, v * 0.6),
  villavo: (v) => mix(0xd9c4a0, 0xc9b088, v * 0.6), // Villavicencio park (v3.36)
  buenaventura: (v) => mix(0xc4c8c8, 0xb0b6b8, v * 0.6), // Buenaventura boardwalk (v3.43)
  bogota: (v) => mix(0xb0a493, 0x9a8e7d, v * 0.6), // cobblestone Chorro de Quevedo square (v4.5)
  villa: (v) => mix(0xb9b2a5, 0xa39b8c, v * 0.6), // cobblestone Villa de Leyva plaza // coral-stone plaza // yellow stone plaza
};

// Town cottage: colored walls, plinth, clay roof tiles, door, and window.
const HOUSE_WALLS = [0xf4efe6, 0xf6d860, 0x9ad0ec, 0xf2a7a0, 0xb8e0a8, 0xf4efe6];
// Barichara (v3.5): mostly whitewashed rammed earth.
const BARICHARA_WALLS = [0xf7f4ee, 0xf7f4ee, 0xf7f4ee, 0xf1e6cf];
const HOUSE_TRIMS = [PAL.balconyRed, PAL.balconyBlue, PAL.balconyGreen, PAL.balconyYellow];
// Salento (v3.12): two-story whitewashed bahareque houses with colorful doors, windows, and balconies
// vivos (rojo, azul, verde, amarillo, naranja, morado).
const SALENTO_WALLS = [0xfbf8f1, 0xfbf8f1, 0xf7f4ee];
const SALENTO_TRIMS = [0xd7263d, 0x2e6fd1, 0x2fa36b, 0xf2b705, 0xf07f1d, 0x8e44ad];
// Cartagena (v3.20): bold-colored colonial houses with wooden balconies and bougainvillea.
const CARTAGENA_WALLS = [0xf6c244, 0xf28c9a, 0x6fc3e0, 0xf4a261, 0xb8e0a8, 0xfbf8f1];
const CARTAGENA_TRIMS = [0x7a4a22, 0x7a4a22, 0x2f7d4f, 0x5d3a1e];
// Villa de Leyva (v3.27): two-story whitewashed townhouses with green doors and balconies.
const VILLA_WALLS = [0xfbf8f1, 0xfbf8f1, 0xf7f4ee];
// Monserrate (v4.5): hill placement in Bogotá Eastern Hills and tiles cleared of eucalyptus.
const MONSERRATE = [38.5, 1.2];
const MONSERRATE_CELLS = (gx, gy) => gx >= 35 && gx <= 42 && gy <= 3;
// La Candelaria (v4.5): colorful facades and wooden balconies.
const CANDELARIA_WALLS = [0xf2c94c, 0x5b8fd6, 0xf0a04b, 0xe57373, 0x8ec5e8, 0x81c784, 0xf3a6c0];
const CANDELARIA_TRIMS = [0x5d4037, 0x6d4c41, 0x2f7d4f, 0x1e5aa8];
const VILLA_TRIMS = [0x2f7d4f, 0x2f7d4f, 0x1f5a38, 0x5d3a1e];
// Villavicencio (v3.36): bright single-story houses with contrasting trim.
const VILLAVO_WALLS = [0xf6d860, 0xf28c9a, 0x6fc3e0, 0xb8e0a8, 0xf4a261, 0xfbf8f1];
const VILLAVO_TRIMS = [0x2e6fd1, 0xd7263d, 0x2f7d4f, 0x8e44ad];
// Buenaventura (v3.43): brightly painted wood-plank and brick houses with zinc roofs.
const PUERTO_WALLS = [0x4fb3bf, 0xf2c14e, 0xe5737f, 0x6cbf6c, 0xf08a3c, 0x5c8dd6];
const PUERTO_TRIMS = [0xf7f4ee, 0xf2c14e, 0x2e6fd1, 0xd7263d];
function townHouse(rng, style) {
  const c = new Container();
  const g = new Graphics();
  const cartagena = style === 'cartagena';
  const villa = style === 'villa';
  const bogota = style === 'bogota'; // La Candelaria (v4.5): colorful, with wooden balcony
  const salento = style === 'salento' || cartagena || villa || bogota; // two-story with balcony
  const villavo = style === 'villavo';
  const puerto = style === 'buenaventura' || style === 'leticia';
  const walls = style === 'barichara' ? BARICHARA_WALLS : bogota ? CANDELARIA_WALLS : cartagena ? CARTAGENA_WALLS : villa ? VILLA_WALLS : villavo ? VILLAVO_WALLS : puerto ? PUERTO_WALLS : salento ? SALENTO_WALLS : HOUSE_WALLS;
  const trims = bogota ? CANDELARIA_TRIMS : cartagena ? CARTAGENA_TRIMS : villa ? VILLA_TRIMS : villavo ? VILLAVO_TRIMS : puerto ? PUERTO_TRIMS : salento ? SALENTO_TRIMS : HOUSE_TRIMS;
  const wall = walls[Math.floor(rng() * walls.length)];
  const trim = trims[Math.floor(rng() * trims.length)];
  const w = 0.8 + rng() * 0.2;
  const h = (20 + rng() * 8) + (salento ? 8 : 0);
  shadow(g, 6, 6, 30, 12);
  box(g, -w / 2, -0.45, w, 0.9, 6, trim);
  box(g, -w / 2, -0.45, w, 0.9, h - 6, wall, { z: 6 });
  gableRoof(g, -w / 2, -0.45, w, 0.9, h, 10, puerto ? 0x9aa3a8 : PAL.roof, wall);
  const d = isoPoly([[-0.12, 0.45, 0], [0.12, 0.45, 0], [0.12, 0.45, 12], [-0.12, 0.45, 12]]);
  g.poly(d).fill(shade(trim, 0.75)).stroke(OUTLINE);
  const win = isoPoly([[w / 2, -0.2, 9], [w / 2, 0.05, 9], [w / 2, 0.05, 16], [w / 2, -0.2, 16]]);
  g.poly(win).fill(salento ? trim : 0x6fa8dc).stroke(OUTLINE);
  if (salento) {
    // Contrasting second-floor wooden balcony with railings.
    const rail = trims[(trims.indexOf(trim) + 1 + Math.floor(rng() * (trims.length - 1))) % trims.length];
    const z = h - 12;
    g.poly(isoPoly([[-w / 2, 0.45, z], [w / 2, 0.45, z], [w / 2, 0.62, z], [-w / 2, 0.62, z]])).fill(shade(rail, 0.8)).stroke(OUTLINE);
    g.poly(isoPoly([[-w / 2, 0.62, z], [w / 2, 0.62, z], [w / 2, 0.62, z + 5], [-w / 2, 0.62, z + 5]])).fill(rail).stroke(OUTLINE);
    for (let k = 1; k < 5; k++) {
      const x = -w / 2 + (w * k) / 5;
      const a = iso(x, 0.62, z);
      const b = iso(x, 0.62, z + 5);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: shade(rail, 0.6) });
    }
    const win2 = isoPoly([[-0.18, 0.45, z + 2], [0.18, 0.45, z + 2], [0.18, 0.45, z + 9], [-0.18, 0.45, z + 9]]);
    g.poly(win2).fill(shade(trim, 0.85)).stroke(OUTLINE);
  }
  if (cartagena && rng() < 0.6) {
    // Bougainvillea draping over balcony.
    for (const [dx, dy] of [[-0.35, 0], [-0.2, 3], [0.3, 1]]) {
      const p = iso(dx * w, 0.62, h - 8 - dy);
      g.circle(p.x, p.y, 3).fill(0xd63384);
      g.circle(p.x + 2, p.y + 2, 1.6).fill(0x4e8a33);
    }
  }
  c.addChild(g);
  return c;
}

// Brick apartment building (Bogotá, v4.5): exposed red brick, 3 to 6 stories, rows of windows
// and occasional rooftop water tank.
function brickBuilding(rng) {
  const c = new Container();
  const g = new Graphics();
  const floors = 3 + Math.floor(rng() * 4);
  const w = 0.8 + rng() * 0.15;
  const d = 0.8 + rng() * 0.15;
  const h = floors * 11 + 4;
  const brick = [0xa5492a, 0xb35a33, 0x9c4426][Math.floor(rng() * 3)];
  shadow(g, 8, 6, 34, 13);
  box(g, -w / 2, -d / 2, w, d, h, brick);
  // Rows of windows on both visible street faces.
  for (let f = 0; f < floors; f++) {
    const z = 6 + f * 11;
    for (const at of [0.25, 0.75]) {
      g.poly(isoPoly([[-w / 2 + w * at - 0.11, d / 2, z], [-w / 2 + w * at + 0.11, d / 2, z], [-w / 2 + w * at + 0.11, d / 2, z + 6], [-w / 2 + w * at - 0.11, d / 2, z + 6]])).fill(0xcfe3ee).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
      g.poly(isoPoly([[w / 2, -d / 2 + d * at - 0.11, z], [w / 2, -d / 2 + d * at + 0.11, z], [w / 2, -d / 2 + d * at + 0.11, z + 6], [w / 2, -d / 2 + d * at - 0.11, z + 6]])).fill(0xb5ccd8).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    }
  }
  // Rooftop parapet trim and occasional water tank.
  box(g, -w / 2 - 0.03, -d / 2 - 0.03, w + 0.06, d + 0.06, 2, shade(brick, 0.85), { z: h });
  if (rng() < 0.5) box(g, -0.15, -0.15, 0.3, 0.3, 7, 0x9aa3a8, { z: h + 2 });
  c.addChild(g);
  return c;
}

// Blooming guayacán: round yellow or pink canopy.
function guayacan(rng) {
  const c = new Container();
  const g = new Graphics();
  const pink = rng() < 0.4;
  const s = 0.85 + rng() * 0.3;
  shadow(g, 4, 2, 22 * s, 8 * s);
  g.moveTo(-2, 0).lineTo(-1.5, -24 * s).lineTo(1.5, -24 * s).lineTo(2, 0).closePath().fill(0x6b4a2e);
  const colors = pink ? [0xe58fb5, 0xf2b5cf, 0xd46a9a] : [0xf4c430, 0xf9dc5c, 0xe0a91b];
  for (const [dx, dy, r] of [[-10, -28, 11], [9, -29, 11], [0, -36, 13], [-4, -26, 9], [5, -40, 8]]) {
    g.circle(dx * s, dy * s, r * s).fill(colors[Math.floor(rng() * 3)]);
  }
  c.addChild(g);
  return c;
}

// Streetlamp.
function streetLamp() {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, 0, 4, 2).fill({ color: 0x000000, alpha: 0.25 });
  g.rect(-1.2, -30, 2.4, 30).fill(0x2b2b2b);
  g.rect(-4, -38, 8, 8).fill(0xffd27a).stroke({ width: 1.5, color: 0x2b2b2b });
  g.poly([-5, -38, 5, -38, 0, -43]).fill(0x2b2b2b);
  c.addChild(g);
  return c;
}

// Sunflower: tall stem, leaves, and yellow flower facing forward.
function sunflower(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 24 + rng() * 10;
  shadow(g, 0, 1, 7, 3);
  g.moveTo(0, 0).lineTo(1, -h).stroke({ width: 2, color: 0x4e8a33 });
  g.ellipse(-4, -h * 0.45, 5, 2).fill(0x5e9a3c);
  g.ellipse(5, -h * 0.6, 5, 2).fill(0x74b14a);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.ellipse(1 + Math.cos(a) * 5, -h + Math.sin(a) * 5, 3, 1.6).fill(0xf4c430);
  }
  g.circle(1, -h, 3.2).fill(0x6b4a2e);
  c.addChild(g);
  return c;
}

function cornClump(rng) {
  const c = new Container();
  const g = new Graphics();
  for (let k = 0; k < 3; k++) drawCornStalk(g, (k - 1) * 5, (k % 2) * 2, 0.75 + rng() * 0.2, rng, 1);
  c.addChild(g);
  return c;
}

// Scarecrow wearing sombrero vueltiao and ruana.
function scarecrow() {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 8, 3);
  g.rect(-1, -34, 2, 34).fill(0x8b5a2b);
  g.rect(-12, -26, 24, 2).fill(0x8b5a2b);
  g.poly([-11, -27, 11, -27, 7, -14, -7, -14]).fill(0xc8643b).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  g.circle(0, -31, 4).fill(0xe2c56b);
  g.ellipse(0, -34, 8, 2).fill(0xf4efe6).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  g.roundRect(-4, -39, 8, 5, 2).fill(0xf4efe6).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  g.rect(-4, -36, 8, 1).fill(0x222222);
  c.addChild(g);
  return c;
}

// Corn stalk: tall cane with long leaves, tassel on top, and cobs. Also used by Maizal.
export function drawCornStalk(g, x, y, scale, rng, cobs) {
  const s = scale;
  const h = (30 + rng() * 8) * s;
  shadow(g, x + 1, y + 1, 5 * s, 2 * s);
  g.moveTo(x, y).lineTo(x + 1, y - h).stroke({ width: 2 * s, color: 0x7aa33c });
  for (let k = 1; k < 5; k++) {
    const yy = y - (h * k) / 5;
    const side = k % 2 ? 1 : -1;
    g.moveTo(x, yy).quadraticCurveTo(x + side * 8 * s, yy - 6 * s, x + side * 12 * s, yy + 2 * s).stroke({ width: 1.6, color: k % 2 ? 0x5e9a3c : 0x74b14a });
  }
  // Espiga.
  g.moveTo(x + 1, y - h).lineTo(x - 2, y - h - 6 * s).moveTo(x + 1, y - h).lineTo(x + 4, y - h - 5 * s).stroke({ width: 1, color: 0xd9c38c });
  for (let i = 0; i < cobs; i++) {
    const cy = y - h * (0.45 + i * 0.15);
    g.ellipse(x + 3 * s, cy, 2 * s, 4 * s).fill(0xf2c94c).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.4 });
    g.moveTo(x + 2 * s, cy + 3 * s).lineTo(x + 5 * s, cy - 2 * s).stroke({ width: 1, color: 0x8fae4a });
  }
}

// Guamo: cacao shade tree with tall trunk and wide flat crown.
function guamo(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.9 + rng() * 0.3;
  shadow(g, 6, 2, 34 * s, 12 * s);
  g.moveTo(-3, 0).lineTo(-2, -48 * s).lineTo(2, -48 * s).lineTo(3, 0).closePath().fill(0x7a5a3a);
  g.moveTo(0, -36 * s).lineTo(-14 * s, -48 * s).moveTo(0, -40 * s).lineTo(12 * s, -52 * s).stroke({ width: 2, color: 0x7a5a3a });
  for (const [dx, dy, r] of [[-16, -52, 14], [0, -58, 18], [16, -52, 14], [-6, -64, 12], [8, -64, 12]]) {
    g.ellipse(dx * s, dy * s, r * s * 1.3, r * s * 0.65).fill(dy < -60 ? 0x5e9a3c : 0x3f7a2a);
  }
  c.addChild(g);
  return c;
}

// Heliconia: hojas largas y flores rojas y amarillas en zigzag.
function heliconia(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 10, 4);
  for (const [dx, h] of [[-5, 22], [0, 28], [5, 20]]) {
    g.moveTo(dx, 0).lineTo(dx, -h).stroke({ width: 1.5, color: 0x4e8a33 });
    g.ellipse(dx + 4, -h, 6, 2.5).fill(0x5e9a3c);
  }
  const top = -26 - rng() * 4;
  for (let k = 0; k < 4; k++) {
    const y = top + k * 4;
    const side = k % 2 ? 1 : -1;
    g.poly([0, y, side * 7, y + 1.5, 0, y + 3]).fill(k % 2 ? 0xe8b90f : 0xd7263d);
  }
  c.addChild(g);
  return c;
}

function cacaoTree(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCacaoTree(g, 0, 0, 0.8 + rng() * 0.2, rng, 3);
  c.addChild(g);
  return c;
}

// Cacao tree: short trunk, round crown, pods growing straight from trunk. Also used by Cacaotal.
// Guayabo: tronco liso y claro, copa redonda y guayabas amarillas.
export function drawGuavaTree(g, x, y, scale, rng, fruits) {
  const s = scale;
  shadow(g, x + 2, y + 1, 13 * s, 5 * s);
  g.moveTo(x - 2 * s, y).lineTo(x - 1.2 * s, y - 14 * s).lineTo(x + 1.2 * s, y - 14 * s).lineTo(x + 2 * s, y).closePath().fill(0xa1887f);
  g.circle(x - 6 * s, y - 18 * s, 7 * s).fill(0x3d7a2c);
  g.circle(x + 6 * s, y - 18 * s, 7 * s).fill(0x3d7a2c);
  g.circle(x, y - 23 * s, 8.5 * s).fill(0x4e8f34).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
  g.circle(x - 3 * s, y - 26 * s, 3 * s).fill({ color: 0x9ccc65, alpha: 0.6 });
  for (let i = 0; i < fruits; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * 7 * s;
    g.circle(x + Math.cos(a) * d, y - 20 * s + Math.sin(a) * d * 0.6, 1.9 * Math.max(s, 0.9)).fill(0xd4e157).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
  }
}

// Tobacco plant: upright stalk with tiered broad leaves and pink flower cluster on top.
export function drawTobaccoPlant(g, x, y, scale, rng, flowers) {
  const s = scale;
  const h = (20 + rng() * 6) * s;
  shadow(g, x + 2, y + 1, 11 * s, 4 * s);
  g.moveTo(x, y).lineTo(x, y - h).stroke({ width: 1.6 * s, color: 0x7cb342 });
  // Broad drooping leaves, largest at base; alternate sides.
  for (let k = 0; k < 3; k++) {
    const ly = y - h * (0.2 + k * 0.27);
    const len = (12 - k * 2.5) * s;
    const color = k % 2 ? 0x689f38 : 0x558b2f;
    for (const side of [-1, 1]) {
      const tx = x + side * len;
      const ty = ly + (4 - k) * s;
      const mx = (x + tx) / 2;
      const my = (ly + ty) / 2;
      const wy = len * 0.6;
      g.moveTo(x, ly).quadraticCurveTo(mx, my - wy, tx, ty).quadraticCurveTo(mx, my + wy * 0.6, x, ly).fill(color).stroke({ width: 0.5, color: 0x33691e, alpha: 0.6 });
      g.moveTo(x, ly).lineTo(tx, ty).stroke({ width: 0.6, color: 0xaed581, alpha: 0.8 });
    }
  }
  for (let i = 0; i < flowers; i++) g.circle(x + (i - (flowers - 1) / 2) * 2.2 * s, y - h - 1.5 * s - (i % 2) * 1.5 * s, 1.4 * Math.max(s, 0.9)).fill(0xf48fb1);
}

function tobaccoPlant(rng) {
  const c = new Container();
  const g = new Graphics();
  drawTobaccoPlant(g, 0, 0, 1 + rng() * 0.2, rng, 3);
  c.addChild(g);
  return c;
}

function guavaTree(rng) {
  const c = new Container();
  const g = new Graphics();
  drawGuavaTree(g, 0, 0, 1.1 + rng() * 0.3, rng, 4);
  c.addChild(g);
  return c;
}

// Fique agave: rosette of long, thick pointed blue-green leaves.
// Leafcutter ant nest: mound of red earth with entrance holes (v3.4).
export function drawAnthill(g, x, y, scale, rng) {
  const s = scale * (0.9 + rng() * 0.25);
  shadow(g, x + 2, y + 1, 13 * s, 4.5 * s);
  g.moveTo(x - 13 * s, y).quadraticCurveTo(x - 6 * s, y - 13 * s, x, y - 14 * s).quadraticCurveTo(x + 6 * s, y - 13 * s, x + 13 * s, y).closePath().fill(0xa0522d).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.45 });
  g.moveTo(x - 9 * s, y - 2 * s).quadraticCurveTo(x - 4 * s, y - 11 * s, x, y - 12 * s).stroke({ width: 1.5 * s, color: 0xc06a3a, alpha: 0.7 });
  for (let i = 0; i < 3; i++) g.ellipse(x + (i - 1) * 4.5 * s, y - (4 + (i % 2) * 4) * s, 1.4 * s, 0.9 * s).fill(0x3a1d10);
}

export function drawFiquePlant(g, x, y, scale, rng) {
  shadow(g, x + 2, y + 1, 12 * scale, 4 * scale);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i - (n - 1) / 2) / n) * 2.6;
    const len = (14 + rng() * 6) * scale;
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len * 0.9;
    g.poly([x - 2 * scale, y, tx, ty, x + 2 * scale, y]).fill(i % 2 ? 0x6f9a7a : 0x5d8a6a).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.35 });
  }
}

function anthill(rng) {
  const c = new Container();
  const g = new Graphics();
  drawAnthill(g, 0, 0, 0.8, rng);
  c.addChild(g);
  return c;
}

function fique(rng) {
  const c = new Container();
  const g = new Graphics();
  drawFiquePlant(g, 0, 0, 1, rng);
  c.addChild(g);
  return c;
}

// Chicamocha canyon cactus: tall stem with twin arms.
function cactus(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 18 + rng() * 10;
  shadow(g, 2, 1, 8, 3);
  g.roundRect(-2.5, -h, 5, h, 2.5).fill(0x5a8f4e).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  g.roundRect(-8, -h * 0.65, 4, h * 0.35, 2).fill(0x5a8f4e).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  g.rect(-6, -h * 0.32, 4, 2).fill(0x5a8f4e);
  g.roundRect(4, -h * 0.8, 4, h * 0.3, 2).fill(0x5a8f4e).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  g.rect(2, -h * 0.52, 4, 2).fill(0x5a8f4e);
  c.addChild(g);
  return c;
}

export function drawCacaoTree(g, x, y, scale, rng, pods) {
  const s = scale;
  shadow(g, x + 2, y + 1, 12 * s, 5 * s);
  g.moveTo(x - 2 * s, y).lineTo(x - 1.5 * s, y - 16 * s).lineTo(x + 1.5 * s, y - 16 * s).lineTo(x + 2 * s, y).closePath().fill(0x6b4a2e);
  g.circle(x - 6 * s, y - 20 * s, 7 * s).fill(0x2f6b2a);
  g.circle(x + 6 * s, y - 20 * s, 7 * s).fill(0x2f6b2a);
  g.circle(x, y - 25 * s, 8 * s).fill(0x3f7a2a).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
  g.circle(x - 3 * s, y - 28 * s, 3 * s).fill({ color: 0x8cc65a, alpha: 0.6 });
  // Cacao pods hanging from trunk and lower boughs.
  for (let i = 0; i < pods; i++) {
    const px = x + (rng() - 0.5) * 8 * s;
    const py = y - (5 + rng() * 10) * s;
    const color = [0xe8b90f, 0xd98e04, 0xc0392b][Math.floor(rng() * 3)];
    g.ellipse(px, py, 1.8 * Math.max(s, 0.9), 3 * Math.max(s, 0.9)).fill(color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  }
}

// Eucalyptus: tall pale trunk with elongated blue-green crown.
function eucalyptus(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 60 + rng() * 30;
  shadow(g, 6, 2, 16, 6);
  g.moveTo(-2.5, 0).lineTo(-1.5, -h).lineTo(1.5, -h).lineTo(2.5, 0).closePath().fill(0xd8cfc0).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  g.moveTo(-1, -h * 0.4).lineTo(1, -h * 0.55).stroke({ width: 1, color: 0x9a8f80 });
  for (const [dx, dy, rx, ry] of [[-6, -h + 4, 9, 16], [6, -h + 8, 9, 14], [0, -h - 6, 10, 16]]) {
    g.ellipse(dx, dy, rx, ry).fill(dy < -h ? 0x7fa892 : 0x5f8f78).stroke({ width: 1, color: 0x3a2418, alpha: 0.25 });
  }
  c.addChild(g);
  return c;
}

// Standalone Sabana greenhouse (v4.4): white plastic hoop house over poles with roses inside.
function smallGreenhouse(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 4, 3, 26, 10);
  const a = iso(-0.7, -0.5);
  const b = iso(0.7, -0.5);
  const d = iso(0.7, 0.5);
  const e = iso(-0.7, 0.5);
  for (const q of [a, b, d, e]) g.moveTo(q.x, q.y).lineTo(q.x, q.y - 14).stroke({ width: 1.2, color: 0x8d6e4a });
  for (let k = 0; k < 4; k++) g.circle(-8 + k * 6 + (rng() - 0.5) * 2, -3 + (k % 2) * 3, 2).fill(0xd81b3c);
  g.poly([a.x, a.y - 14, b.x, b.y - 14, b.x, b.y - 22, a.x, a.y - 22]).fill({ color: 0xffffff, alpha: 0.55 }).stroke({ width: 1, color: 0xffffff });
  g.poly([a.x, a.y - 22, b.x, b.y - 22, d.x, d.y - 22, e.x, e.y - 22]).fill({ color: 0xf4f8fa, alpha: 0.6 }).stroke({ width: 1, color: 0xffffff });
  g.poly([e.x, e.y, d.x, d.y, d.x, d.y - 22, e.x, e.y - 22]).fill({ color: 0xe8f2f6, alpha: 0.45 }).stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
  c.addChild(g);
  return c;
}

// Sibaté roadside strawberries-and-cream stand (v4.4): red-awning table with cups.
function strawberryStand(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 3, 2, 16, 6);
  g.rect(-10, -9, 20, 9).fill(0xfafafa).stroke({ width: 1, color: 0x3a2418, alpha: 0.6 });
  for (const dx of [-6, -1, 4]) g.circle(dx, -11, 2.2).fill(0xe53935);
  for (const px of [-11, 10]) g.rect(px, -24, 1.4, 15).fill(0x8d6e4a);
  for (let k = 0; k < 4; k++) g.poly([-12 + k * 6, -26, -6 + k * 6, -26, -6 + k * 6, -21, -12 + k * 6, -21]).fill(k % 2 ? 0xfafafa : 0xe53935);
  c.addChild(g);
  return c;
}

// Strawberry plant (v4.4): trefoil toothed leaves over black mulch ridge with berries
// hanging along side (more berries at milestones).
export function drawStrawberryPlant(g, x, y, scale, rng, fruits = 2) {
  const s = scale;
  g.ellipse(x, y, 11 * s, 4 * s).fill(0x37474f);
  for (const [dx, dy, r] of [[-5, -6, 4.5], [5, -6, 4.5], [0, -9, 5], [-2, -3, 4], [3, -3, 4]]) g.circle(x + dx * s, y + dy * s, r * s).fill(0x43a047).stroke({ width: 0.6, color: 0x1b5e20, alpha: 0.6 });
  for (let k = 0; k < fruits; k++) {
    const fx = x + (k % 2 ? 7 : -7) * s + (rng() - 0.5) * 2;
    const fy = y - (1 + (k >> 1) * 2) * s;
    g.poly([fx - 2.2 * s, fy - 2 * s, fx + 2.2 * s, fy - 2 * s, fx, fy + 3 * s]).fill(0xe53935).stroke({ width: 0.5, color: 0x7a0c1e });
  }
}

// Salt mine rail cart (v4.4): loaded with rock salt on short track.
function saltCart(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 2, 2, 14, 5);
  g.moveTo(-14, 4).lineTo(12, -4).stroke({ width: 1.4, color: 0x5d4037 });
  g.moveTo(-10, 7).lineTo(16, -1).stroke({ width: 1.4, color: 0x5d4037 });
  g.poly([-8, -2, 8, -7, 10, -16, -8, -11]).fill(0x607d8b).stroke({ width: 1, color: 0x3a2418 });
  for (const [dx, dy] of [[-4, -13], [1, -15], [5, -16]]) g.circle(dx, dy, 3 + rng()).fill(0xe8e2d6).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  g.circle(-5, 0, 2.2).fill(0x263238);
  g.circle(6, -3, 2.2).fill(0x263238);
  c.addChild(g);
  return c;
}

// Salt mine heap (v4.4): grayish-white veined cone (taller at milestones).
export function drawSaltPile(g, x, y, scale, rng) {
  const s = scale;
  shadow(g, x + 2, y + 1, 12 * s, 4 * s);
  const h = (14 + rng() * 6) * s;
  g.poly([x - 12 * s, y, x, y - h, x + 12 * s, y]).fill(0xeeeae2).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  g.poly([x, y - h, x + 12 * s, y, x + 3 * s, y]).fill(0xd6d0c4);
  g.moveTo(x - 6 * s, y - 3 * s).lineTo(x - 1 * s, y - h * 0.6).stroke({ width: 0.8, color: 0xb0a898 });
}

// Export rose bush (v4.4): dark-leaved shrub with tall stems and red rosebuds (more
// roses at milestones).
export function drawRoseBush(g, x, y, scale, rng, flowers = 2) {
  const s = scale;
  shadow(g, x + 2, y + 1, 9 * s, 3 * s);
  for (const [dx, dy, r] of [[-4, -8, 5], [4, -9, 5], [0, -13, 5.5], [-2, -5, 4.5], [3, -5, 4]]) g.circle(x + dx * s, y + dy * s, r * s).fill(0x2f6b34).stroke({ width: 0.6, color: 0x1e3f20, alpha: 0.5 });
  for (let k = 0; k < flowers; k++) {
    const fx = x + (k - (flowers - 1) / 2) * 4 * s + (rng() - 0.5) * 2;
    const fy = y - (19 + rng() * 4) * s;
    g.moveTo(fx, fy).lineTo(fx, y - 12 * s).stroke({ width: 1, color: 0x3f7f3a });
    g.ellipse(fx, fy, 2.4 * s, 2.9 * s).fill(0xd81b3c).stroke({ width: 0.6, color: 0x7a0c1e });
  }
}

// Cypress: narrow dark cone common along dairy pasture fencelines.
function cypress(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 40 + rng() * 20;
  shadow(g, 4, 2, 10, 4);
  g.rect(-1.5, -6, 3, 6).fill(0x5e3b1c);
  g.poly([-9, -5, 0, -h, 9, -5]).fill(0x2f5e3a).stroke({ width: 1, color: 0x3a2418, alpha: 0.35 });
  g.poly([-3, -10, 0, -h + 4, 2, -12]).fill({ color: 0x3f7a4a, alpha: 0.8 });
  c.addChild(g);
  return c;
}

// Round hay bale.
function hayBale(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.8 + rng() * 0.3;
  shadow(g, 0, 1, 11 * s, 4 * s);
  g.ellipse(0, -7 * s, 11 * s, 8 * s).fill(0xe2c56b).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  g.ellipse(5 * s, -7 * s, 5 * s, 7 * s).fill(0xd4b055).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  g.ellipse(5 * s, -7 * s, 2.5 * s, 3.5 * s).stroke({ width: 1, color: 0xa88a3c });
  c.addChild(g);
  return c;
}

// Holstein cow (white with black patches), side view. Also used by Potrero.
// coat (v3.3): pattern { body, spots, udder }; defaults to Lechería Holstein.
const HOLSTEIN = { body: 0xfbf8f1, legs: 0xf4f1e8, spots: 0x2b2b2b, udder: true };
export function drawCow(g, x, y, scale, rng, flip = false, coat = HOLSTEIN) {
  if (coat.sheep) return drawSheep(g, x, y, scale * 0.85, rng, flip, coat);
  if (coat.pig) return drawPig(g, x, y, scale * 0.85, rng, flip, coat);
  const f = flip ? -1 : 1;
  const s = scale;
  shadow(g, x, y + 1, 13 * s, 4 * s);
  // Patas.
  for (const lx of [-7, -3, 4, 8]) g.rect(x + lx * s * f - 1, y - 7 * s, 2 * s, 7 * s).fill(coat.legs).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  // Spotted torso.
  g.roundRect(x - 10 * s, y - 15 * s, 20 * s, 9 * s, 4 * s).fill(coat.body).stroke({ width: 1.2, color: 0x3a2418, alpha: 0.6 });
  for (let i = 0; i < 3; i++) g.ellipse(x + (-5 + i * 5 + rng() * 2) * s * f, y - (10 + rng() * 3) * s, (2 + rng() * 2) * s, (1.5 + rng()) * s).fill(coat.spots);
  // Zebu hump (v3.18) over shoulders.
  if (coat.hump) g.ellipse(x + 5 * s * f, y - 15 * s, 3.6 * s, 2.8 * s).fill(coat.body).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  // Ubre rosada.
  if (coat.udder) g.ellipse(x + 3 * s * f, y - 6 * s, 2.5 * s, 1.5 * s).fill(0xf2a7b5);
  // Cabeza.
  g.roundRect(x + (f > 0 ? 9 : -15) * s, y - 18 * s, 6 * s, 7 * s, 2 * s).fill(coat.body).stroke({ width: 1.2, color: 0x3a2418, alpha: 0.6 });
  g.ellipse(x + 12 * s * f, y - 11.5 * s, 2.8 * s, 1.8 * s).fill(0xf2a7b5);
  g.circle(x + 11 * s * f, y - 16 * s, 0.9 * s).fill(0x2b2b2b);
  // Cachos.
  g.moveTo(x + 10 * s * f, y - 18 * s).lineTo(x + 9 * s * f, y - 21 * s).moveTo(x + 13 * s * f, y - 18 * s).lineTo(x + 14 * s * f, y - 21 * s).stroke({ width: 1.2, color: 0xe8dcc0 });
  // Cola.
  g.moveTo(x - 10 * s * f, y - 14 * s).quadraticCurveTo(x - 13 * s * f, y - 10 * s, x - 12 * s * f, y - 6 * s).stroke({ width: 1, color: 0x3a2418 });
}

// Pig (v4.0): pink, spotted, or black (Creole zungo) with snout and curly tail. Used by
// Lechonería instead of cows.
function drawPig(g, x, y, s, rng, flip, coat) {
  const f = flip ? -1 : 1;
  shadow(g, x, y + 1, 11 * s, 3.5 * s);
  for (const lx of [-6, -2, 3, 7]) g.rect(x + lx * s * f - 0.9, y - 5 * s, 1.8 * s, 5 * s).fill(shade(coat.body, 0.8));
  g.ellipse(x, y - 9 * s, 10 * s, 5.5 * s).fill(coat.body).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  if (coat.spots) g.ellipse(x - 2 * s * f, y - 10 * s, 3.5 * s, 2.5 * s).fill(coat.spots);
  g.circle(x + 9 * s * f, y - 10 * s, 4 * s).fill(coat.body).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  g.ellipse(x + 12.5 * s * f, y - 9.5 * s, 1.8 * s, 2.2 * s).fill(coat.snout);
  g.circle(x + 9.5 * s * f, y - 11.5 * s, 0.7 * s).fill(0x1a1a1a);
  g.poly([x + 7 * s * f, y - 13 * s, x + 8.5 * s * f, y - 16 * s, x + 10 * s * f, y - 13.5 * s]).fill(shade(coat.body, 0.85));
  g.moveTo(x - 10 * s * f, y - 10 * s).quadraticCurveTo(x - 13 * s * f, y - 13 * s, x - 11 * s * f, y - 14 * s).stroke({ width: 1, color: shade(coat.body, 0.7) });
}

// Achira plant (v4.0): broad upright purple-edged green leaves with red blooms at top
// (more blooming stalks at milestones).
export function drawAchiraPlant(g, x, y, scale, rng, flowers = 1) {
  const s = scale;
  shadow(g, x + 2, y + 1, 12 * s, 4 * s);
  for (const [dx, h, lean] of [[-6, 22, -7], [6, 24, 7], [-2, 28, -2], [2, 26, 3], [-9, 16, -9], [9, 17, 9]]) {
    const bx = x + dx * s * 0.4;
    const tx = x + (dx + lean) * s;
    const ty = y - h * s;
    g.moveTo(bx, y).quadraticCurveTo(tx - 6 * s, y - h * 0.5 * s, tx, ty).quadraticCurveTo(tx + 6 * s, y - h * 0.5 * s, bx + 1, y).fill(0x4e8a34).stroke({ width: 0.8, color: 0x7b3f6e, alpha: 0.8 });
  }
  for (let k = 0; k < flowers; k++) {
    const fx = x + (k - (flowers - 1) / 2) * 6 * s + (rng() - 0.5) * 3;
    const fy = y - (31 + rng() * 4) * s;
    g.moveTo(fx, fy + 6 * s).lineTo(fx, y - 20 * s).stroke({ width: 1.2, color: 0x5d8f3a });
    for (const [ox, oy] of [[-2, 0], [2, -1], [0, -3]]) g.ellipse(fx + ox * s, fy + oy * s, 1.8 * s, 3.2 * s).fill(0xe53935);
  }
}

// Sheep (v3.26): puffy wool body, dark face and legs. Used by Ruanas instead of cows.
function drawSheep(g, x, y, s, rng, flip, coat) {
  const f = flip ? -1 : 1;
  shadow(g, x, y + 1, 11 * s, 3.5 * s);
  for (const lx of [-6, -2, 3, 7]) g.rect(x + lx * s * f - 0.9, y - 6 * s, 1.8 * s, 6 * s).fill(0x263238);
  g.ellipse(x, y - 10 * s, 10 * s, 6 * s).fill(coat.body).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  for (const [dx, dy] of [[-6, -13], [-1, -15], [4, -14], [7, -10], [-8, -9], [2, -9]]) g.circle(x + dx * s * f, y + dy * s, 3.2 * s).fill(coat.body);
  for (const [dx, dy] of [[-3, -12], [3, -11]]) g.circle(x + dx * s * f, y + dy * s, 1.2 * s).fill(coat.spots);
  g.ellipse(x + 11 * s * f, y - 12 * s, 3.2 * s, 4 * s).fill(coat.face).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  g.ellipse(x + 9.5 * s * f, y - 15 * s, 2.2 * s, 1 * s).fill(coat.face);
  g.circle(x + 12 * s * f, y - 13 * s, 0.7 * s).fill(0xffffff);
}

// Guadua bamboo grove: tall slightly arched culms topped with feathery leaves.
function guadua(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 4, 2, 18, 7);
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const bx = (i - n / 2) * 4;
    const h = 60 + rng() * 35;
    const lean = (rng() - 0.3) * 22;
    const tx = bx + lean;
    g.moveTo(bx, 0).quadraticCurveTo(bx + lean * 0.3, -h * 0.6, tx, -h).stroke({ width: 3.5, color: i % 2 ? 0x7a9a3c : 0x8fae4a, cap: 'round' });
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      const nx = bx + (tx - bx) * t * t;
      g.circle(nx, -h * t, 1.6).fill(0x5e7a2a);
    }
    for (let k = 0; k < 4; k++) g.ellipse(tx + (k - 1.5) * 5, -h + (k % 2) * 4, 6, 2).fill(0x5e9a3c);
  }
  c.addChild(g);
  return c;
}

// Standalone sugarcane clump.
function caneClump(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCaneClump(g, 0, 0, 0.8 + rng() * 0.3, rng);
  c.addChild(g);
  return c;
}

// Samán: broad umbrella-canopy shade tree.
function saman(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.9 + rng() * 0.3;
  shadow(g, 6, 2, 40 * s, 14 * s);
  g.moveTo(-3, 0).lineTo(-2, -26 * s).lineTo(2, -26 * s).lineTo(3, 0).closePath().fill(0x6b4a2e);
  for (const [dx, dy, r] of [[-20, -30, 16], [0, -36, 20], [20, -30, 16], [-8, -42, 14], [10, -42, 14]]) {
    g.ellipse(dx * s, dy * s, r * s * 1.3, r * s * 0.7).fill(dy < -38 ? 0x6fae44 : 0x4e8a33);
  }
  c.addChild(g);
  return c;
}

// Sugarcane stalk: segmented straight stems with long leaves. Also used by Cañaduzal.
export function drawCaneClump(g, x, y, scale, rng) {
  shadow(g, x + 2, y + 1, 10 * scale, 4 * scale);
  const stalks = 4;
  for (let i = 0; i < stalks; i++) {
    const sx = x + (i - 1.5) * 3 * scale;
    const h = (24 + rng() * 10) * scale;
    g.moveTo(sx, y).lineTo(sx + (i - 1.5) * 1.5, y - h).stroke({ width: 2.2 * scale, color: 0x9cc65b });
    for (let k = 1; k < 4; k++) g.circle(sx + ((i - 1.5) * 1.5 * k) / 4, y - (h * k) / 4, 1.1 * scale).fill(0x6e8f36);
    const tx = sx + (i - 1.5) * 1.5;
    g.moveTo(tx, y - h).quadraticCurveTo(tx + 8 * scale, y - h - 6 * scale, tx + 12 * scale, y - h + 4 * scale).stroke({ width: 1.6, color: 0x5e9a3c });
    g.moveTo(tx, y - h).quadraticCurveTo(tx - 8 * scale, y - h - 5 * scale, tx - 11 * scale, y - h + 5 * scale).stroke({ width: 1.6, color: 0x74b14a });
  }
}

// Wax palm: tall slender trunk with compact crown.
function palm(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 70 + rng() * 40;
  const lean = (rng() - 0.5) * 10;
  shadow(g, 6, 2, 12, 5);
  g.moveTo(-2, 0).lineTo(-1.5 + lean, -h).lineTo(1.5 + lean, -h).lineTo(2, 0).closePath().fill(0xd9d4c7).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  for (let i = 1; i < 8; i++) g.moveTo(-2 + (lean * i) / 8, -(h * i) / 8).lineTo(2 + (lean * i) / 8, -(h * i) / 8).stroke({ width: 1, color: 0xa8a090, alpha: 0.6 });
  const cx = lean;
  const cy = -h;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const ex = cx + Math.cos(a) * 12;
    const ey = cy + Math.sin(a) * 5 + 4;
    g.moveTo(cx, cy).quadraticCurveTo((cx + ex) / 2, cy - 8, ex, ey).stroke({ width: 4, color: i % 2 ? 0x4e7f33 : 0x5e9a3c, cap: 'round' });
  }
  c.addChild(g);
  return c;
}

// Rice clump (v3.15): tuft of thin blades rising from water; golden panicles at higher milestones.
export function drawRicePlant(g, x, y, scale, rng, ears) {
  const s = scale;
  g.ellipse(x, y, 7 * s, 2.2 * s).fill({ color: 0x3f6f5e, alpha: 0.45 });
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI / 2 + ((i - (blades - 1) / 2) / blades) * 1.5;
    const len = (13 + rng() * 5) * s;
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    g.moveTo(x + (i - 3) * 0.5 * s, y).quadraticCurveTo(x + (tx - x) * 0.3, y - len * 0.6, tx, ty).stroke({ width: 1.3 * s, color: i % 2 ? 0x7cb342 : 0x9ccc65, cap: 'round' });
  }
  // Seed heads droop under grain weight.
  for (let i = 0; i < ears; i++) {
    const ex = x + (i - (ears - 1) / 2) * 3.2 * s;
    const ey = y - (14 + (i % 2) * 2) * s;
    g.moveTo(ex, ey + 3 * s).quadraticCurveTo(ex + 1 * s, ey - 2 * s, ex + 4 * s, ey + 1 * s).stroke({ width: 1.8 * s, color: 0xe0b84a, cap: 'round' });
  }
}

// Ceiba: massive buttressed trunk and flat wide canopy, classic Coast shade tree.
function ceiba(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.9 + rng() * 0.3;
  shadow(g, 6, 2, 38 * s, 13 * s);
  g.poly([-11 * s, 0, -4 * s, -10 * s, -3 * s, -40 * s, 3 * s, -40 * s, 4 * s, -10 * s, 11 * s, 0]).fill(0x9e9a8a).stroke({ width: 1, color: 0x3a2418, alpha: 0.35 });
  g.moveTo(-6 * s, 0).lineTo(-2 * s, -12 * s).moveTo(6 * s, 0).lineTo(2 * s, -12 * s).stroke({ width: 1, color: 0x6f6b5e, alpha: 0.6 });
  g.moveTo(0, -40 * s).lineTo(-18 * s, -48 * s).moveTo(0, -40 * s).lineTo(18 * s, -48 * s).stroke({ width: 2.5 * s, color: 0x8a8676 });
  for (const [dx, dy, rx, ry, col] of [[-22, -50, 17, 7, 0x4e8a33], [22, -50, 17, 7, 0x4e8a33], [0, -54, 26, 9, 0x5e9a3c], [-8, -59, 14, 6, 0x6fae44], [10, -58, 13, 5, 0x6fae44]]) {
    g.ellipse(dx * s, dy * s, rx * s, ry * s).fill(col);
  }
  c.addChild(g);
  return c;
}

// Coconut palm: curved ringed trunk, drooping fronds, coconut cluster. Also used by
// Cocal (v3.16), shorter with more green coconuts at each milestone.
export function drawCoconutPalm(g, x, y, scale, rng, nuts = 3, green = false) {
  const s = scale;
  const h = (55 + rng() * 25) * s;
  const lean = (rng() < 0.5 ? -1 : 1) * (8 + rng() * 10) * s;
  shadow(g, x + lean * 0.6, y + 2, 13 * s, 5 * s);
  g.moveTo(x - 2.5 * s, y).quadraticCurveTo(x + lean * 0.2, y - h * 0.5, x + lean - 1.5 * s, y - h).lineTo(x + lean + 1.5 * s, y - h).quadraticCurveTo(x + lean * 0.2 + 3 * s, y - h * 0.5, x + 2.5 * s, y).closePath().fill(0x9c7b56).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const cx = x + lean * t * t;
    g.moveTo(cx - 2 * s, y - h * t).lineTo(cx + 2 * s, y - h * t).stroke({ width: 1, color: 0x6e5236, alpha: 0.6 });
  }
  const cx = x + lean;
  const cy = y - h;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ex = cx + Math.cos(a) * 20 * s;
    const ey = cy + (Math.sin(a) * 7 + 10) * s;
    g.moveTo(cx, cy).quadraticCurveTo(cx + Math.cos(a) * 12 * s, cy - 9 * s, ex, ey).stroke({ width: 3.2 * Math.max(s, 0.8), color: i % 2 ? 0x3f7a2a : 0x5e9a3c, cap: 'round' });
  }
  const spots = [[-2, 3], [2, 3.5], [0, 5.5], [-4, 5], [4, 5.5], [-1.5, 7.5], [2, 8]];
  for (const [dx, dy] of spots.slice(0, nuts)) g.circle(cx + dx * s * 1.2, cy + dy * s * 1.2, 2.4 * Math.max(s, 0.8)).fill(green ? 0x8bc34a : 0x7a5a2e).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
}

// Plantain plant (v3.38): yellow-green pseudostem, broad wind-torn leaves, and hanging
// fruit bunch with purple flower bud at milestones.
export function drawPlantainPlant(g, x, y, scale, rng, bunch = 1) {
  const s = scale * (0.9 + rng() * 0.2);
  const h = (24 + rng() * 6) * s;
  shadow(g, x + 3, y + 2, 15 * s, 6 * s);
  g.moveTo(x - 3 * s, y).lineTo(x - 2.2 * s, y - h).lineTo(x + 2.2 * s, y - h).lineTo(x + 3 * s, y).closePath().fill(0x8a9a4b).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  g.moveTo(x - 0.8 * s, y - 2).lineTo(x - 0.6 * s, y - h + 3).stroke({ width: 0.8, color: 0x6b7a34 });
  const top = y - h;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + (rng() - 0.5) * 0.2;
    const len = (16 + rng() * 5) * s;
    const ex = x + Math.cos(a) * len * 1.2;
    const ey = top + Math.sin(a) * len * 0.7 + 6 * s;
    const col = i % 2 ? 0x4e9a3a : 0x6cb04a;
    g.moveTo(x, top).quadraticCurveTo((x + ex) / 2 + (ex > x ? -2 : 2) * s, Math.min(top, ey) - 7 * s, ex, ey).quadraticCurveTo((x + ex) / 2, (top + ey) / 2 + 3 * s, x, top + 1).fill(col).stroke({ width: 0.7, color: 0x2e5e22, alpha: 0.6 });
    if (i % 3 === 1) g.moveTo((x + ex) / 2, (top + ey) / 2 - 3 * s).lineTo((x + ex) / 2 + 2 * s, (top + ey) / 2 + 1 * s).stroke({ width: 1, color: 0x3a2418, alpha: 0.35 });
  }
  if (bunch <= 0) return;
  const bx = x + 4 * s;
  g.moveTo(x + 1 * s, top + 2 * s).quadraticCurveTo(bx + 3 * s, top + 2 * s, bx + 2 * s, top + 8 * s).stroke({ width: 1.4, color: 0x6b7a34 });
  for (let k = 0; k < 1 + Math.min(bunch, 3); k++) {
    const yy = top + (8 + k * 3) * s;
    for (const dx of [-2.2, 0, 2.2]) g.ellipse(bx + 2 * s + dx * s, yy, 1.4 * s, 2.2 * s).fill(k % 2 ? 0x7cb342 : 0x8bc34a);
  }
  g.ellipse(bx + 2 * s, top + (11 + Math.min(bunch, 3) * 3) * s, 1.8 * s, 2.6 * s).fill(0x7b1f4b);
}

// Azotea planter (v3.39): old canoe raised on four stilts, soil-filled with culinary herbs;
// denser growth and purple basil blooms at milestones.
export function drawAzoteaBed(g, x, y, scale, rng, tier = 0) {
  const s = scale;
  const lift = 12 * s;
  shadow(g, x + 2, y + 2, 18 * s, 6 * s);
  const a = { x: x - 14 * s, y: y - 5 * s };
  const b = { x: x + 14 * s, y: y + 5 * s };
  for (const p of [a, b, { x: a.x + 8 * s, y: a.y + 7 * s }, { x: b.x - 8 * s, y: b.y - 7 * s }]) g.rect(p.x - 1, p.y - lift, 2, lift).fill(0x5d4037);
  const top = -lift;
  g.moveTo(a.x - 2 * s, a.y + top - 2 * s).lineTo(b.x + 2 * s, b.y + top - 2 * s).quadraticCurveTo(b.x - 2 * s, b.y + top + 5 * s, b.x - 8 * s, b.y + top + 3 * s)
    .lineTo(a.x + 6 * s, a.y + top + 5 * s).quadraticCurveTo(a.x - 1 * s, a.y + top + 3 * s, a.x - 2 * s, a.y + top - 2 * s).fill(0x8d6e4a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
  g.moveTo(a.x, a.y + top - 2 * s).lineTo(b.x, b.y + top - 2 * s).stroke({ width: 2.4 * s, color: 0x4e342e });
  const n = 4 + Math.min(tier, 3);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const hx = a.x + (b.x - a.x) * f + (rng() - 0.5) * 2;
    const hy = a.y + (b.y - a.y) * f + top - 2 * s;
    const h = (6 + rng() * 4) * s;
    const col = [0x43a047, 0x66bb6a, 0x2e7d32, 0x7cb342][i % 4];
    for (const dx of [-2, 0, 2]) g.moveTo(hx, hy).lineTo(hx + dx * s, hy - h).stroke({ width: 1.6 * s, color: col, cap: 'round' });
    if (tier >= 2 && i % 2 === 0) g.circle(hx, hy - h - 1, 1.2 * s).fill(0x7e57c2);
  }
}

// Mangrove (v3.41): dark green crown perched on arching stilt roots in mud.
export function drawMangroveTree(g, x, y, scale, rng) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 3, y + 2, 18 * s, 6 * s);
  for (const dx of [-12, -6, 0, 6, 12]) g.moveTo(x, y - 14 * s).quadraticCurveTo(x + dx * 0.5 * s, y - 8 * s, x + dx * s, y).stroke({ width: 1.6, color: 0x6d4c41 });
  g.rect(x - 1.6 * s, y - 26 * s, 3.2 * s, 13 * s).fill(0x6d4c41);
  for (const [dx, dy, r] of [[-9, -30, 9], [9, -31, 9], [0, -38, 10], [-3, -27, 7], [5, -26, 7]]) g.circle(x + dx * s, y + dy * s, r * s).fill(dy < -34 ? 0x2e6b22 : 0x245a1c).stroke({ width: 0.6, color: 0x1a3a12, alpha: 0.4 });
}

function mangroveTree(rng) {
  const c = new Container();
  const g = new Graphics();
  drawMangroveTree(g, 0, 0, 0.9, rng);
  c.addChild(g);
  return c;
}

// Werregue palm (v3.42): black-spined trunk and feather crown; pale tender heart shoot
// harvested for fiber at milestones.
export function drawWerreguePalm(g, x, y, scale, rng, tier = 0) {
  const s = scale * (0.9 + rng() * 0.2);
  const h = (22 + rng() * 6) * s;
  shadow(g, x + 3, y + 2, 14 * s, 5 * s);
  g.rect(x - 2.2 * s, y - h, 4.4 * s, h).fill(0x5d4a36).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  for (let yy = y - 3; yy > y - h + 2; yy -= 3.5 * s) {
    g.moveTo(x - 2.2 * s, yy).lineTo(x - 4.5 * s, yy - 1.5 * s).stroke({ width: 0.8, color: 0x1a1410 });
    g.moveTo(x + 2.2 * s, yy - 1.5 * s).lineTo(x + 4.5 * s, yy - 3 * s).stroke({ width: 0.8, color: 0x1a1410 });
  }
  const top = y - h;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + (i / 7) * Math.PI;
    g.moveTo(x, top).quadraticCurveTo(x + Math.cos(a) * 9 * s, top - 10 * s, x + Math.cos(a) * 18 * s, top + Math.sin(a) * 6 * s + 6 * s).stroke({ width: 2.6, color: i % 2 ? 0x2e6b22 : 0x43a047, cap: 'round' });
  }
  if (tier >= 1) g.moveTo(x, top).lineTo(x + 1, top - (8 + Math.min(tier, 3) * 2) * s).stroke({ width: 2.4, color: 0xc5e1a5, cap: 'round' });
}

// Wounaan tambo (v3.42): open circular stilt house with conical palm thatch roof.
function tambo(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.9 + rng() * 0.2;
  shadow(g, 2, 2, 22 * s, 8 * s);
  for (const dx of [-14, -6, 6, 14]) g.rect(dx * s - 1, -12 * s, 2, 12 * s).fill(0x5d4037);
  g.ellipse(0, -12 * s, 18 * s, 6 * s).fill(0x8d6e4a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
  for (const dx of [-14, 14]) g.rect(dx * s - 1, -26 * s, 2, 14 * s).fill(0x5d4037);
  g.moveTo(-22 * s, -24 * s).lineTo(0, -44 * s).lineTo(22 * s, -24 * s).quadraticCurveTo(0, -18 * s, -22 * s, -24 * s).fill(0xc9a96b).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.6 });
  for (let k = 1; k < 4; k++) g.moveTo(-22 * s * (1 - k / 4), (-24 - 20 * k / 4) * s).lineTo(22 * s * (1 - k / 4), (-24 - 20 * k / 4) * s).stroke({ width: 0.8, color: 0xa1854f });
  g.moveTo(-8 * s, -12 * s).lineTo(-12 * s, 0).moveTo(-6 * s, -12 * s).lineTo(-10 * s, 0).stroke({ width: 1, color: 0x6d4c41 });
  c.addChild(g);
  return c;
}

// Chili pepper shrub (v3.48): green foliage dotted with red, yellow, and purple peppers (more at milestones).
export function drawAjiPlant(g, x, y, scale, rng, peppers = 3) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 2, y + 1, 9 * s, 3.5 * s);
  g.moveTo(x, y).lineTo(x, y - 8 * s).stroke({ width: 1.4, color: 0x558b2f });
  for (const [dx, dy, r] of [[-4, -10, 5], [4, -11, 5], [0, -15, 5.5], [-2, -7, 4], [3, -7, 4]]) g.circle(x + dx * s, y + dy * s, r * s).fill(dy < -12 ? 0x43a047 : 0x2e7d32);
  const cols = [0xe53935, 0xfbc02d, 0xe53935, 0x8e24aa];
  for (let k = 0; k < peppers; k++) {
    const px = x + (rng() - 0.5) * 9 * s;
    const py = y - (7 + rng() * 9) * s;
    g.ellipse(px, py, 0.9 * s, 2.2 * s).fill(cols[k % cols.length]);
  }
}

// Yanchama tree (v3.51): smooth pale buttressed trunk and broad crown; grows at milestones
// with stripped pale bark scars on harvested trunks.
export function drawYanchamaTree(g, x, y, scale, rng, peeled = false) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 4, y + 2, 16 * s, 6 * s);
  const h = 34 * s;
  g.poly([x - 9 * s, y + 1, x - 2.5 * s, y - 8 * s, x - 2 * s, y]).fill(0xa8936a);
  g.poly([x + 9 * s, y + 1, x + 2.5 * s, y - 8 * s, x + 2 * s, y]).fill(0x98845e);
  g.rect(x - 2.6 * s, y - h, 5.2 * s, h).fill(0xc9b48a);
  g.rect(x + 0.8 * s, y - h, 1.8 * s, h).fill(0xa8936a);
  if (peeled) g.rect(x - 1.4 * s, y - h * 0.6, 2.2 * s, h * 0.35).fill(0xe8d9b5);
  for (const [dx, dy, r, c] of [[-7, -h / s - 2, 9, 0x2e6b22], [7, -h / s - 3, 9, 0x2e6b22], [0, -h / s - 8, 10, 0x43a047], [-3, -h / s - 1, 7, 0x388e3c]]) g.circle(x + dx * s, y + dy * s, r * s).fill(c);
}

// Cassava plant (v3.50): tall knotted stem topped with palmate leaves; extra stems and
// peeking root tubers at milestones.
export function drawYucaPlant(g, x, y, scale, rng, stems = 1) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 2, y + 1, 10 * s, 4 * s);
  g.ellipse(x, y, 6 * s, 2.4 * s).fill(0x5d3f28);
  for (let k = 0; k < stems; k++) {
    const dx = (k - (stems - 1) / 2) * 4 * s;
    const h = (24 + rng() * 6 - k * 2) * s;
    const tx = x + dx * 1.4;
    g.moveTo(x + dx, y).lineTo(tx, y - h).stroke({ width: 1.6 * s, color: 0x9e8a78 });
    for (let j = 1; j < 4; j++) g.circle(x + dx + (tx - x - dx) * j / 4, y - h * j / 4, 0.8 * s).fill(0x6d4c41);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
      const L = (8 - Math.abs(i - 3) * 0.8) * s;
      g.moveTo(tx, y - h).lineTo(tx + Math.cos(a) * L, y - h + Math.sin(a) * L * 0.7 + 2 * s).stroke({ width: 2.2 * s, color: i % 2 ? 0x2e7d32 : 0x43a047, cap: 'round' });
    }
    g.circle(tx, y - h, 1.2 * s).fill(0xad1457);
  }
  if (stems > 2) g.ellipse(x + 6 * s, y + 1, 4 * s, 1.4 * s).fill(0x8d5a32);
}

// Açaí palm (v3.47): cluster of 2–3 slender stems with feathery fronds and purple fruit
// clusters beneath crown at milestones.
export function drawAsaiPalm(g, x, y, scale, rng, bunches = 1) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 3, y + 2, 14 * s, 5 * s);
  const stems = [[-3, 40], [2, 48], [6, 34]];
  for (const [dx, h0] of stems) {
    const h = (h0 + rng() * 6) * s;
    const tx = x + dx * s + (dx > 0 ? 3 : -3) * s;
    g.moveTo(x + dx * s, y).quadraticCurveTo(x + dx * s, y - h * 0.6, tx, y - h).stroke({ width: 1.8 * s, color: 0x8d8a6a });
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (i / 5) * Math.PI;
      g.moveTo(tx, y - h).quadraticCurveTo(tx + Math.cos(a) * 7 * s, y - h - 6 * s, tx + Math.cos(a) * 13 * s, y - h + (Math.sin(a) * 4 + 8) * s).stroke({ width: 1.6, color: i % 2 ? 0x2e6b22 : 0x43a047, cap: 'round' });
    }
    if (bunches > 0 && dx !== 6) {
      for (let k = 0; k < Math.min(bunches, 3) + 2; k++) g.circle(tx + (k % 3 - 1) * 1.6 * s + 2 * s, y - h + (4 + Math.floor(k / 3) * 1.8) * s, 1.2 * s).fill(0x311b4e);
    }
  }
}

function asaiPalm(rng) {
  const c = new Container();
  const g = new Graphics();
  drawAsaiPalm(g, 0, 0, 0.95, rng, 2);
  c.addChild(g);
  return c;
}

// Macaw (v3.47): scarlet, yellow, and blue parrot perched on a dry snag.
function macaw(rng) {
  const c = new Container();
  const g = new Graphics();
  const f = rng() < 0.5 ? 1 : -1;
  shadow(g, 0, 1, 6, 2);
  g.moveTo(0, 0).lineTo(0, -26).stroke({ width: 2, color: 0x6d4c41 });
  g.moveTo(0, -18).lineTo(6 * f, -24).stroke({ width: 1.4, color: 0x6d4c41 });
  g.ellipse(2 * f, -31, 3.4, 5).fill(0xd32f2f).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  g.circle(3 * f, -36.5, 2.4).fill(0xd32f2f);
  g.circle(3.6 * f, -37, 0.7).fill(0xffffff);
  g.poly([5 * f, -36.5, 7 * f, -35.5, 5 * f, -34.5]).fill(0x37474f);
  g.ellipse(0, -30, 2, 4).fill(0xfbc02d);
  g.ellipse(-0.5 * f, -28, 1.8, 3.4).fill(0x1e88e5);
  g.poly([0, -27, -2 * f, -16, 1 * f, -17]).fill(0x1e88e5);
  c.addChild(g);
  return c;
}

// Chontaduro palm (v3.38): slender spiny-ringed trunk, feather fronds, red/orange fruit bunches.
// and orange fruit clusters.
function chontaduroPalm(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.85 + rng() * 0.3;
  const h = (46 + rng() * 14) * s;
  shadow(g, 3, 2, 12 * s, 4 * s);
  g.rect(-1.8 * s, -h, 3.6 * s, h).fill(0x6d5a44).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  for (let yy = -4; yy > -h + 4; yy -= 5 * s) g.moveTo(-2.6 * s, yy).lineTo(2.6 * s, yy).stroke({ width: 1, color: 0x2e2418, alpha: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + (i / 7) * Math.PI;
    const ex = Math.cos(a) * 20 * s;
    const ey = -h + Math.sin(a) * 9 * s + 7 * s;
    g.moveTo(0, -h).quadraticCurveTo(ex * 0.5, -h - 9 * s, ex, ey).stroke({ width: 2.4, color: i % 2 ? 0x2e6b22 : 0x4a8a30, cap: 'round' });
  }
  for (const dx of [-3, 3]) {
    for (let k = 0; k < 5; k++) g.circle(dx * s + (k % 2 ? 1.4 : -1.4) * s, -h + (4 + k * 1.8) * s, 1.6 * s).fill(k % 2 ? 0xe65100 : 0xc62828);
  }
  c.addChild(g);
  return c;
}

// Borojó tree (v3.38): small broad-leaved tree with round brown borojó fruits along branches.
function borojoTree(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.85 + rng() * 0.3;
  shadow(g, 3, 2, 16 * s, 6 * s);
  g.moveTo(-2 * s, 0).lineTo(-1.5 * s, -14 * s).lineTo(1.5 * s, -14 * s).lineTo(2 * s, 0).closePath().fill(0x6b4a2e);
  for (const [dx, dy, r] of [[-8, -20, 9], [8, -21, 9], [0, -28, 10], [-3, -16, 7], [5, -15, 7]]) g.circle(dx * s, dy * s, r * s).fill(dy < -24 ? 0x3f7a2a : 0x2e6b22).stroke({ width: 0.6, color: 0x1a3a12, alpha: 0.4 });
  for (let k = 0; k < 4; k++) g.circle((rng() - 0.5) * 18 * s, (-12 - rng() * 14) * s, 2.6 * s).fill(0x6d4c2a).stroke({ width: 0.5, color: 0x3a2418, alpha: 0.5 });
  c.addChild(g);
  return c;
}

// Oil palm (v3.31): stout trunk patterned with frond bases, arching crown, red fruit
// bunches nestled at crown (more at milestones).
export function drawOilPalm(g, x, y, scale, rng, bunches = 2) {
  const s = scale * (0.9 + rng() * 0.2);
  const h = (26 + rng() * 8) * s;
  shadow(g, x + 3, y + 2, 16 * s, 6 * s);
  g.moveTo(x - 4.5 * s, y).lineTo(x - 3.5 * s, y - h).lineTo(x + 3.5 * s, y - h).lineTo(x + 4.5 * s, y).closePath().fill(0x8d6e4a).stroke({ width: 1, color: 0x3a2418, alpha: 0.45 });
  for (let k = 1; k < 5; k++) {
    const yy = y - (h * k) / 5;
    g.moveTo(x - 3.5 * s, yy).lineTo(x, yy - 3 * s).lineTo(x + 3.5 * s, yy).stroke({ width: 1, color: 0x5d4632, alpha: 0.7 });
  }
  const cy = y - h;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const ex = x + Math.cos(a) * 22 * s;
    const ey = cy + (Math.sin(a) * 8 + 9) * s;
    g.moveTo(x, cy).quadraticCurveTo(x + Math.cos(a) * 12 * s, cy - 12 * s, ex, ey).stroke({ width: 3.6 * Math.max(s, 0.8), color: i % 2 ? 0x2e6b22 : 0x4a8a30, cap: 'round' });
  }
  for (let b = 0; b < bunches; b++) {
    const bx = x + (b % 2 ? 3.5 : -3.5) * s;
    const by = cy + (4 + Math.floor(b / 2) * 4) * s;
    g.ellipse(bx, by, 3.4 * s, 3 * s).fill(0xc0392b).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
    g.circle(bx - 1 * s, by - 1 * s, 1 * s).fill(0xf57c00);
  }
}

function oilPalm(rng) {
  const c = new Container();
  const g = new Graphics();
  drawOilPalm(g, 0, 0, 0.9, rng, 2);
  c.addChild(g);
  return c;
}

// Moriche palm (v3.31): tall straight savanna palm with fan-leaf crown.
function morichePalm(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.85 + rng() * 0.35;
  const h = (60 + rng() * 20) * s;
  shadow(g, 3, 2, 12 * s, 4 * s);
  g.rect(-2 * s, -h, 4 * s, h).fill(0x9e9e8a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.4 });
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9 + (i > 4 ? 0.2 : 0);
    const len = (14 + (i % 3) * 2) * s;
    const ex = Math.cos(a) * len;
    const ey = -h + Math.sin(a) * len * 0.8;
    g.moveTo(0, -h).lineTo(ex, ey).stroke({ width: 1, color: 0x2e5e22 });
    g.poly([ex - 4 * s, ey - 1, ex + 4 * s, ey - 1, ex, ey + 6 * s]).fill(i % 2 ? 0x3f7a2a : 0x5e9a3c);
  }
  g.circle(0, -h + 4 * s, 2.4 * s).fill(0x8d4a24);
  c.addChild(g);
  return c;
}

// Termite mound (v3.31): tall red earth savanna mound.
function termiteMound(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.8 + rng() * 0.4;
  shadow(g, 2, 1, 9 * s, 3.5 * s);
  g.moveTo(-8 * s, 0).quadraticCurveTo(-6 * s, -14 * s, -1 * s, -22 * s).quadraticCurveTo(3 * s, -14 * s, 3 * s, -10 * s).quadraticCurveTo(7 * s, -9 * s, 8 * s, 0).closePath().fill(0xb5653a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  g.moveTo(-4 * s, -6 * s).quadraticCurveTo(-3 * s, -12 * s, -1 * s, -18 * s).stroke({ width: 1.2 * s, color: 0xd08a5a, alpha: 0.8 });
  c.addChild(g);
  return c;
}

// Passionfruit arbor (v3.32): twin posts with wire, leafy vine canopy, hanging yellow fruits
// (more at milestones).
export function drawPassionVine(g, x, y, scale, rng, fruits = 2) {
  const s = scale;
  const a = { x: x - 12 * s, y: y - 4 * s };
  const b = { x: x + 12 * s, y: y + 4 * s };
  shadow(g, x + 2, y + 2, 16 * s, 6 * s);
  for (const p of [a, b]) g.rect(p.x - 1, p.y - 22 * s, 2, 22 * s).fill(0x6b4a2e);
  g.moveTo(a.x, a.y - 21 * s).lineTo(b.x, b.y - 21 * s).stroke({ width: 1, color: 0x8a8f94 });
  for (let k = 0; k < 7; k++) {
    const f = k / 6;
    const lx = a.x + (b.x - a.x) * f + (rng() - 0.5) * 3;
    const ly = a.y + (b.y - a.y) * f - 21 * s;
    g.ellipse(lx, ly - 1, 4.5 * s, 3 * s).fill(k % 2 ? 0x3f7a2a : 0x5e9a3c);
    if (k % 2 === 0) g.moveTo(lx, ly).lineTo(lx + (rng() - 0.5) * 3, ly + 7 * s).stroke({ width: 1, color: 0x3f7a2a });
  }
  for (let i = 0; i < fruits; i++) {
    const f = (i + 0.5) / fruits;
    const fx = a.x + (b.x - a.x) * f;
    const fy = a.y + (b.y - a.y) * f - 13 * s;
    g.circle(fx, fy, 2.4 * Math.max(s, 0.8)).fill(0xf4c430).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  }
  if (fruits > 2) g.circle(x, y - 24 * s, 1.6).fill(0x7e57c2);
}

// Mango tree (v3.32): dense dark-green rounded crown with yellow and blushed mangoes.
function mangoTree(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.85 + rng() * 0.35;
  shadow(g, 3, 2, 22 * s, 8 * s);
  g.moveTo(-3 * s, 0).lineTo(-2 * s, -18 * s).lineTo(2 * s, -18 * s).lineTo(3 * s, 0).closePath().fill(0x6b4a2e);
  for (const [dx, dy, r] of [[-11, -26, 12], [10, -27, 12], [0, -36, 14], [-5, -22, 10], [6, -21, 10]]) g.circle(dx * s, dy * s, r * s).fill(dy < -30 ? 0x2e6b22 : 0x245a1c).stroke({ width: 0.6, color: 0x1a3a12, alpha: 0.4 });
  for (let k = 0; k < 6; k++) g.ellipse((rng() - 0.5) * 26 * s, (-18 - rng() * 18) * s, 1.8 * s, 2.4 * s).fill(rng() < 0.5 ? 0xf4b400 : 0xe65100);
  c.addChild(g);
  return c;
}

// Cachama fishponds (v3.33): water tiles with earthen dikes every two tiles, ripples,
// and occasional fish rising to feed.
export function drawPondTile(g, gx, gy, x0, y0, rng, tier) {
  const dike = { width: 3, color: 0x7a9a4a };
  if ((gx - x0) % 2 === 0) {
    const a = iso(gx, gy);
    const b = iso(gx, gy + 1);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(dike);
  }
  if ((gy - y0) % 2 === 0) {
    const a = iso(gx, gy);
    const b = iso(gx + 1, gy);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(dike);
  }
  const p = iso(gx + 0.25 + rng() * 0.5, gy + 0.25 + rng() * 0.5);
  g.moveTo(p.x - 5, p.y).quadraticCurveTo(p.x, p.y - 2, p.x + 5, p.y).stroke({ width: 1, color: 0xe8f6ff, alpha: 0.6 });
  if (rng() < 0.2 + tier * 0.08) {
    const q = iso(gx + 0.3 + rng() * 0.4, gy + 0.3 + rng() * 0.4);
    g.moveTo(q.x - 5, q.y).quadraticCurveTo(q.x, q.y - 5, q.x + 5, q.y).closePath().fill(0x37474f);
    g.poly([q.x - 1, q.y - 3, q.x + 2, q.y - 7, q.x + 3, q.y - 2]).fill(0x263238);
  }
}

// Stretched cowhide frame (v3.35): four poles with hide lashed by rope, curing in salt.
export function drawHideFrame(g, x, y, scale, rng, salted = true) {
  const s = scale * (0.9 + rng() * 0.15);
  shadow(g, x + 2, y + 2, 14 * s, 5 * s);
  const w = 12 * s;
  const h = 18 * s;
  for (const dx of [-w, w]) g.rect(x + dx - 1, y - h - 4 * s, 2, h + 4 * s).fill(0x6b4a2e);
  g.moveTo(x - w, y - h).lineTo(x + w, y - h).stroke({ width: 1.6, color: 0x6b4a2e });
  g.moveTo(x - w, y - 2 * s).lineTo(x + w, y - 2 * s).stroke({ width: 1.6, color: 0x6b4a2e });
  const c = { x, y: y - h / 2 - 1 };
  g.poly([c.x - 9 * s, c.y - 6 * s, c.x - 4 * s, c.y - 8 * s, c.x, c.y - 9 * s, c.x + 4 * s, c.y - 8 * s, c.x + 9 * s, c.y - 6 * s, c.x + 8 * s, c.y + 6 * s, c.x + 3 * s, c.y + 8 * s, c.x - 3 * s, c.y + 8 * s, c.x - 8 * s, c.y + 6 * s])
    .fill(rng() < 0.5 ? 0xc9a37a : 0xb88a5a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  if (salted) for (let k = 0; k < 4; k++) g.circle(c.x - 4 * s + rng() * 8 * s, c.y - 3 * s + rng() * 6 * s, 0.8).fill(0xffffff);
}

// Creole horse (v3.35): side view grazing or standing, chestnut, buckskin, or gray.
function horse(rng) {
  const c = new Container();
  const g = new Graphics();
  const coat = [0x8d4a24, 0xc49a5a, 0xb8b4ac, 0x5d3a1a][Math.floor(rng() * 4)];
  const f = rng() < 0.5 ? 1 : -1;
  const s = 0.9 + rng() * 0.2;
  shadow(g, 0, 1, 13 * s, 4 * s);
  for (const lx of [-8, -4, 5, 9]) g.rect(lx * s * f - 1, -10 * s, 2 * s, 10 * s).fill(shade(coat, 0.85));
  g.roundRect(-11 * s, -18 * s, 22 * s, 9 * s, 4 * s).fill(coat).stroke({ width: 1, color: 0x3a2418, alpha: 0.5 });
  const graze = rng() < 0.5;
  const nx = 10 * s * f;
  if (graze) g.poly([nx - 2 * s * f, -16 * s, nx + 6 * s * f, -6 * s, nx + 9 * s * f, -4 * s, nx + 4 * s * f, -12 * s]).fill(coat).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  else g.poly([nx - 2 * s * f, -16 * s, nx + 4 * s * f, -27 * s, nx + 10 * s * f, -25 * s, nx + 3 * s * f, -14 * s]).fill(coat).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  g.moveTo(-11 * s * f, -17 * s).quadraticCurveTo(-15 * s * f, -12 * s, -13 * s * f, -6 * s).stroke({ width: 2 * s, color: 0x3a2418 });
  c.addChild(g);
  return c;
}

function coconutPalm(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCoconutPalm(g, 0, 0, 1, rng);
  c.addChild(g);
  return c;
}

// Clay heap (v3.24): freshly dug red pottery clay with shovel stuck in it (grows at milestones).
export function drawClayMound(g, x, y, scale, rng, shovel = false) {
  const s = scale * (0.9 + rng() * 0.2);
  shadow(g, x + 2, y + 1, 14 * s, 5 * s);
  g.moveTo(x - 14 * s, y).quadraticCurveTo(x - 6 * s, y - 14 * s, x, y - 15 * s).quadraticCurveTo(x + 7 * s, y - 13 * s, x + 14 * s, y).closePath().fill(0xa8735a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.45 });
  g.moveTo(x - 8 * s, y - 4 * s).quadraticCurveTo(x - 3 * s, y - 11 * s, x + 2 * s, y - 12 * s).stroke({ width: 1.6 * s, color: 0xc08a6a, alpha: 0.8 });
  if (shovel) {
    g.moveTo(x + 4 * s, y - 10 * s).lineTo(x + 9 * s, y - 26 * s).stroke({ width: 1.4, color: 0x8b5a2b });
    g.poly([x + 2 * s, y - 12 * s, x + 6 * s, y - 10 * s, x + 5 * s, y - 5 * s, x + 1 * s, y - 7 * s]).fill(0x9aa3a8);
  }
}

// Clay pots displayed on a roadside plank bench for sale (v3.24).
// Pots displayed on plank: red clay in Ráquira; blackware in La Chamba (v4.0, `black`).
function potStand(rng, black = false) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 14, 4);
  g.rect(-13, -6, 26, 3).fill(0x8b5a2b);
  for (const [dx, dy] of [[-12, -4], [12, -4]]) g.rect(dx - 1, dy, 2, 6).fill(0x5e3b1c);
  const colors = black ? [0x2b2b2b, 0x3a3a3a, 0x1f1f1f] : [0x4e342e, 0xd9772e, 0xb5653a];
  for (let k = 0; k < 3; k++) {
    const cx = -8 + k * 8;
    g.ellipse(cx, -11, 4.5, 5).fill(colors[(k + Math.floor(rng() * 3)) % 3]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.ellipse(cx, -15.5, 2.6, 1).fill(0x3e2723);
  }
  c.addChild(g);
  return c;
}

// Barley clump (v3.23): slender stems with bearded golden ears (more golden at milestones).
export function drawBarley(g, x, y, scale, rng, ripe = 0) {
  const s = scale;
  shadow(g, x + 2, y + 1, 8 * s, 3 * s);
  const color = [0x9ccc65, 0xc8c25a, 0xe0b84a, 0xe6b93a][Math.min(ripe, 3)];
  for (let i = 0; i < 6; i++) {
    const sx = x + (i - 2.5) * 2 * s;
    const h = (20 + rng() * 6) * s;
    const lean = (i - 2.5) * 0.8 * s;
    g.moveTo(sx, y).quadraticCurveTo(sx + lean * 0.5, y - h * 0.6, sx + lean, y - h).stroke({ width: 1.1 * s, color: 0x9a9a4a });
    g.ellipse(sx + lean, y - h - 3 * s, 1.4 * s, 3.6 * s).fill(color);
    g.moveTo(sx + lean, y - h - 6 * s).lineTo(sx + lean + 1.5 * s, y - h - 11 * s).stroke({ width: 0.6, color: 0xd9c08c });
  }
}

// Potato plant (v3.22): green leafy cluster with white and purple blossoms (more at milestones).
export function drawPotatoPlant(g, x, y, scale, rng, flowers = 1) {
  const s = scale;
  shadow(g, x + 2, y + 1, 9 * s, 3.5 * s);
  g.ellipse(x, y, 8 * s, 3 * s).fill(0x3a291d);
  for (const [dx, dy, r] of [[-5, -6, 5], [5, -6, 5], [0, -10, 5.5], [-2, -4, 4.5], [3, -12, 4]]) g.circle(x + dx * s, y + dy * s, r * s).fill(dy < -8 ? 0x4e8f34 : 0x3f7a2a).stroke({ width: 0.6, color: 0x2a4a1a, alpha: 0.4 });
  for (let i = 0; i < flowers; i++) {
    const fx = x + (i - (flowers - 1) / 2) * 4 * s;
    g.circle(fx, y - (14 + (i % 2) * 2) * s, 1.8 * Math.max(s, 0.8)).fill(i % 2 ? 0xb39ddb : 0xffffff);
    g.circle(fx, y - (14 + (i % 2) * 2) * s, 0.7 * Math.max(s, 0.8)).fill(0xfdd835);
  }
}

// Frailejón (v3.22): thick furry stem with silvery leaf rosette, iconic páramo plant.
function frailejon(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.8 + rng() * 0.4;
  const h = (14 + rng() * 14) * s;
  shadow(g, 2, 1, 9 * s, 3 * s);
  g.roundRect(-3 * s, -h, 6 * s, h, 2).fill(0x8d7a5a).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  for (let k = 0; k < 4; k++) g.moveTo(-3 * s, -h * (0.2 + k * 0.2)).lineTo(3 * s, -h * (0.25 + k * 0.2)).stroke({ width: 1, color: 0x6e5d42 });
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + ((i - 4) / 9) * 2.8;
    const len = 10 * s;
    g.moveTo(0, -h).quadraticCurveTo(Math.cos(a) * len * 0.5, -h + Math.sin(a) * len * 0.8 - 3, Math.cos(a) * len, -h + Math.sin(a) * len * 0.6).stroke({ width: 3 * s, color: i % 2 ? 0xb8c4a8 : 0xa3b58f, cap: 'round' });
  }
  if (rng() < 0.5) g.circle(0, -h - 9 * s, 2 * s).fill(0xf2d22e);
  c.addChild(g);
  return c;
}

// Caña flecha plant (v3.19): long fan-arranged leaves with occasional feathery plume.
export function drawCanaFlecha(g, x, y, scale, rng, plumes = 1) {
  const s = scale;
  shadow(g, x + 2, y + 1, 10 * s, 3.5 * s);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i - (n - 1) / 2) / n) * 2.2;
    const len = (20 + rng() * 8) * s;
    const tx = x + Math.cos(a) * len;
    const ty = y + Math.sin(a) * len;
    g.moveTo(x, y).quadraticCurveTo(x + (tx - x) * 0.4, y - len * 0.75, tx, ty).stroke({ width: 1.8 * s, color: i % 2 ? 0x4e8f34 : 0x6fae44, cap: 'round' });
  }
  for (let i = 0; i < plumes; i++) {
    const px = x + (i - (plumes - 1) / 2) * 4 * s;
    const top = y - (30 + i * 3) * s;
    g.moveTo(px, y).lineTo(px, top).stroke({ width: 1, color: 0xc8b07a });
    g.ellipse(px, top - 3 * s, 1.8 * s, 4 * s).fill(0xefe3c2);
  }
}

function canaFlechaClump(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCanaFlecha(g, 0, 0, 0.9 + rng() * 0.3, rng, rng() < 0.5 ? 1 : 0);
  c.addChild(g);
  return c;
}

// Sombreros vueltiaos hung along a pole for roadside sale.
function hatPole(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 10, 3);
  g.rect(-1.2, -34, 2.4, 34).fill(PAL.woodDark);
  g.moveTo(-10, -30).lineTo(10, -30).stroke({ width: 1.5, color: PAL.wood });
  for (const [dx, dy] of [[-8, -24], [8, -24], [0, -14]].slice(0, 2 + Math.floor(rng() * 2))) {
    g.ellipse(dx, dy, 7, 2.6).fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.ellipse(dx, dy, 5, 1.8).stroke({ width: 1, color: 0x2b2b2b });
    g.moveTo(dx - 3.5, dy).quadraticCurveTo(dx, dy - 8, dx + 3.5, dy).closePath().fill(0xefe3c2).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.moveTo(dx - 3, dy - 2.5).lineTo(dx + 3, dy - 2.5).stroke({ width: 1, color: 0x2b2b2b });
  }
  c.addChild(g);
  return c;
}

// Cast net hung to dry between two poles.
function netRack(rng) {
  const c = new Container();
  const g = new Graphics();
  const w = 16 + rng() * 6;
  shadow(g, 0, 1, w, 4);
  for (const x of [-w, w]) g.rect(x - 1, -26, 2, 26).fill(PAL.woodDark);
  g.moveTo(-w, -24).lineTo(w, -24).stroke({ width: 1.5, color: PAL.wood });
  g.moveTo(-w + 2, -24).quadraticCurveTo(0, -4, w - 2, -24).lineTo(w - 6, -24).quadraticCurveTo(0, -12, -w + 6, -24).closePath().fill({ color: 0xcfd8dc, alpha: 0.75 });
  for (let k = -3; k <= 3; k++) g.moveTo(k * w * 0.25, -24).lineTo(k * w * 0.18, -9 - (3 - Math.abs(k)) * 1.5).stroke({ width: 0.6, color: 0x78909c });
  c.addChild(g);
  return c;
}

// Little pile of freshly harvested green coconuts beside palms.
function coconutPile(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 10, 3.5);
  for (const [dx, dy] of [[-4, 0], [4, 0.5], [0, -1.5], [-1, -6], [3.5, -5]].slice(0, 3 + Math.floor(rng() * 3))) {
    g.circle(dx, dy - 3, 3.6).fill(rng() < 0.7 ? 0x7cb342 : 0x8d6e4a).stroke({ width: 0.7, color: 0x3a2418, alpha: 0.5 });
  }
  c.addChild(g);
  return c;
}

// Snowy egret: long legs, white plumage, S-curved neck common in rice paddies.
function egret(rng) {
  const c = new Container();
  const g = new Graphics();
  const f = rng() < 0.5 ? -1 : 1;
  shadow(g, 0, 1, 6, 2);
  g.moveTo(-1.5 * f, 0).lineTo(-1 * f, -9).moveTo(1.5 * f, 0).lineTo(1 * f, -9).stroke({ width: 1, color: 0x3a3a3a });
  g.ellipse(0, -12, 6, 3.6).fill(0xfbfbf6).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.35 });
  g.moveTo(4 * f, -13).quadraticCurveTo(9 * f, -16, 5 * f, -19).quadraticCurveTo(2 * f, -22, 6 * f, -24).stroke({ width: 2, color: 0xfbfbf6, cap: 'round' });
  g.circle(6.5 * f, -24.3, 1.8).fill(0xfbfbf6);
  g.moveTo(8 * f, -24.5).lineTo(12 * f, -24).stroke({ width: 1.2, color: 0xf2b705 });
  c.addChild(g);
  return c;
}

// Plantain clump.
function banana(rng) {
  const c = new Container();
  const g = new Graphics();
  const h = 22 + rng() * 10;
  shadow(g, 0, 1, 14, 6);
  g.rect(-2, -h, 4, h).fill(0x8a9a4b);
  const leaves = [[-1, -0.6], [1, -0.5], [-0.8, 0.2], [0.9, 0.3], [0, -1]];
  for (const [dx, dy] of leaves) {
    g.ellipse(dx * 11, -h + dy * 7, 11, 4.5).fill(dx < 0 ? 0x5e9a3c : 0x74b14a).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
  }
  c.addChild(g);
  return c;
}

function coffeeBush(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCoffeeBush(g, 0, 0, 0.8 + rng() * 0.2, rng, 3);
  c.addChild(g);
  return c;
}

function rock(rng) {
  const c = new Container();
  const g = new Graphics();
  const s = 0.7 + rng() * 0.6;
  shadow(g, 0, 1, 9 * s, 4 * s);
  g.ellipse(0, -3 * s, 8 * s, 5 * s).fill(0xa69f94).stroke({ width: 1, color: 0x3a2418, alpha: 0.4 });
  g.ellipse(-2 * s, -5 * s, 4 * s, 2 * s).fill(0xc2bcb2);
  c.addChild(g);
  return c;
}

// Coffee bush: round green shrub dotted with red cherries. Also used by Cafetal.
export function drawCoffeeBush(g, x, y, scale, rng, cherries) {
  const r = 9 * scale;
  shadow(g, x + 2, y + 1, r * 1.1, r * 0.45);
  g.circle(x - r * 0.5, y - r * 0.9, r * 0.75).fill(0x3f6e2a);
  g.circle(x + r * 0.5, y - r * 0.9, r * 0.75).fill(0x3f6e2a);
  g.circle(x, y - r * 1.4, r * 0.85).fill(0x4e8a33).stroke({ width: 1, color: 0x3a2418, alpha: 0.35 });
  g.circle(x - r * 0.3, y - r * 1.7, r * 0.4).fill({ color: 0x8cc65a, alpha: 0.7 });
  for (let i = 0; i < cherries; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * r * 0.8;
    g.circle(x + Math.cos(a) * d, y - r * 1.1 + Math.sin(a) * d * 0.6, 1.6 * Math.max(scale, 0.9)).fill(0xd7263d);
  }
}
