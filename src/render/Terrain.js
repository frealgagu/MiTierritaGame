import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, mix, shade, depth } from './iso.js';
import { PAL } from './palette.js';
import { createRng } from '../core/rng.js';
import { shadow } from './procedural/shapes.js';

const CLIFF = 46; // px de alto del borde del mapa

// Tipo de cada casilla del mapa a partir de los datos de la zona.
export function buildTileMap(zone) {
  const n = zone.size;
  const tiles = Array.from({ length: n }, () => Array(n).fill('grass'));
  const fill = (x, y, w, h, type) => {
    for (let gx = x; gx < x + w; gx++) for (let gy = y; gy < y + h; gy++) if (tiles[gx]?.[gy]) tiles[gx][gy] = type;
  };
  const road = (pts) => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s <= steps; s++) {
        const gx = Math.floor(ax + ((bx - ax) * s) / steps);
        const gy = Math.floor(ay + ((by - ay) * s) / steps);
        if (tiles[gx]?.[gy]) tiles[gx][gy] = 'road';
      }
    }
  };
  fill(zone.farm.x, zone.farm.y, zone.farm.w, zone.farm.h, 'farm');
  for (const p of zone.plots) fill(p.x, p.y, 3, 3, 'plot');
  fill(zone.warehouse.x, zone.warehouse.y, zone.warehouse.w, zone.warehouse.h, 'building');
  road(zone.muleRoad);
  road(zone.jeepRoad);
  for (const r of Object.values(zone.routes ?? {})) road(r.road);
  fill(zone.yard.x, zone.yard.y, zone.yard.w, zone.yard.h, 'road');
  return tiles;
}

export class Terrain {
  constructor(zone) {
    this.zone = zone;
    this.tiles = buildTileMap(zone);
    this.ground = new Graphics();
    this.decor = []; // objetos altos que se ordenan por profundidad junto al resto
    this.drawGround();
    this.buildDecor();
  }

  drawGround() {
    const g = this.ground;
    const n = this.zone.size;
    const rng = createRng(this.zone.seed);

    // Bordes del «diorama».
    g.poly(isoPoly([[0, n, 0], [n, n, 0], [n, n, -CLIFF], [0, n, -CLIFF]])).fill(PAL.cliffTop);
    g.poly(isoPoly([[n, 0, 0], [n, n, 0], [n, n, -CLIFF], [n, 0, -CLIFF]])).fill(PAL.cliffSide);
    for (let i = 0; i < 3; i++) {
      const h = -12 - i * 12;
      const col = shade(PAL.cliffTop, 0.92 - i * 0.06);
      g.moveTo(...Object.values(iso(0, n, h))).lineTo(...Object.values(iso(n, n, h))).stroke({ width: 2, color: col, alpha: 0.6 });
      g.moveTo(...Object.values(iso(n, 0, h))).lineTo(...Object.values(iso(n, n, h))).stroke({ width: 2, color: shade(col, 0.85), alpha: 0.6 });
    }
    // Césped que cuelga por el borde.
    g.poly(isoPoly([[0, n, 0], [n, n, 0], [n, n, -6], [0, n, -6]])).fill(PAL.grassDark);
    g.poly(isoPoly([[n, 0, 0], [n, n, 0], [n, n, -6], [n, 0, -6]])).fill(shade(PAL.grassDark, 0.8));

    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        const type = this.tiles[gx][gy];
        const v = rng();
        let color;
        if (type === 'road') color = mix(PAL.road, 0xd8b07a, v * 0.4);
        else if (type === 'farm') color = FARM_SOIL[this.zone.theme]?.(v) ?? mix(PAL.soil, 0x6e4529, v * 0.35);
        else if (type === 'plot' || type === 'building') color = mix(PAL.plot, 0xc9a06c, v * 0.4);
        else color = mix(PAL.grass, (gx + gy) % 2 ? 0x8cc65a : 0x6fae44, 0.35 + v * 0.3);
        g.poly(isoPoly([[gx, gy], [gx + 1, gy], [gx + 1, gy + 1], [gx, gy + 1]])).fill(color);

        if (type === 'grass' && rng() < 0.35) {
          // Matas de pasto.
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
        if (type === 'road' && rng() < 0.25) {
          const p = iso(gx + rng(), gy + rng());
          g.ellipse(p.x, p.y, 2.5, 1.2).fill({ color: 0x8a6a45, alpha: 0.5 });
        }
        if (type === 'farm' && this.zone.theme === 'cacao') {
          // Hojarasca bajo los cacaos.
          for (let k = 0; k < 2; k++) {
            const p = iso(gx + rng(), gy + rng());
            g.ellipse(p.x, p.y, 3, 1.5).fill({ color: rng() < 0.5 ? 0x8a6a3a : 0x6e8f3a, alpha: 0.7 });
          }
        } else if (type === 'farm' && this.zone.theme === 'dairy') {
          // Potrero: pasto más alto y tupido, sin surcos.
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
  }

  isFree(gx, gy, margin = 1) {
    for (let x = gx - margin; x <= gx + margin; x++) {
      for (let y = gy - margin; y <= gy + margin; y++) {
        const t = this.tiles[x]?.[y];
        if (t && t !== 'grass') return false;
      }
    }
    return true;
  }

  buildDecor() {
    const rng = createRng(this.zone.seed * 31 + 1);
    const n = this.zone.size;
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        if (!this.isFree(gx, gy)) continue;
        const r = rng();
        let obj = null;
        if (this.zone.theme === 'cacao') {
          // Cacaotal: guamos de sombra, plátano, heliconias y algún cacao suelto.
          if (r < 0.04) obj = guamo(rng);
          else if (r < 0.08) obj = banana(rng);
          else if (r < 0.11) obj = heliconia(rng);
          else if (r < 0.13) obj = cacaoTree(rng);
        } else if (this.zone.theme === 'dairy') {
          // Lechería: eucaliptos, cipreses, pacas de heno y piedras de la sabana.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.07) obj = cypress(rng);
          else if (r < 0.09) obj = hayBale(rng);
          else if (r < 0.11) obj = rock(rng);
        } else if (this.zone.theme === 'cane') {
          // Trapiche: guaduales, matas de caña sueltas y algún samán.
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
        if (!obj) continue;
        const ox = 0.3 + rng() * 0.4;
        const oy = 0.3 + rng() * 0.4;
        const p = iso(gx + ox, gy + oy);
        obj.position.set(p.x, p.y);
        obj.zIndex = depth(gx + ox, gy + oy);
        this.decor.push(obj);
      }
    }
  }
}

// Color de la tierra de la fuente ilimitada según el tema de la zona.
const FARM_SOIL = {
  cane: (v) => mix(0x9c7a4a, 0x7f6038, v * 0.35),
  dairy: (v) => mix(0x5e9a3c, 0x6fae44, v * 0.5),
  cacao: (v) => mix(0x5e4630, 0x4a3726, v * 0.5),
};

// Guamo: árbol de sombra del cacaotal, tronco alto y copa ancha y aplanada.
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

// Árbol de cacao: tronco corto, copa redonda y mazorcas que cuelgan del tronco. Lo usa el Cacaotal.
export function drawCacaoTree(g, x, y, scale, rng, pods) {
  const s = scale;
  shadow(g, x + 2, y + 1, 12 * s, 5 * s);
  g.moveTo(x - 2 * s, y).lineTo(x - 1.5 * s, y - 16 * s).lineTo(x + 1.5 * s, y - 16 * s).lineTo(x + 2 * s, y).closePath().fill(0x6b4a2e);
  g.circle(x - 6 * s, y - 20 * s, 7 * s).fill(0x2f6b2a);
  g.circle(x + 6 * s, y - 20 * s, 7 * s).fill(0x2f6b2a);
  g.circle(x, y - 25 * s, 8 * s).fill(0x3f7a2a).stroke({ width: 1, color: 0x3a2418, alpha: 0.3 });
  g.circle(x - 3 * s, y - 28 * s, 3 * s).fill({ color: 0x8cc65a, alpha: 0.6 });
  // Mazorcas colgando del tronco y de las ramas bajas.
  for (let i = 0; i < pods; i++) {
    const px = x + (rng() - 0.5) * 8 * s;
    const py = y - (5 + rng() * 10) * s;
    const color = [0xe8b90f, 0xd98e04, 0xc0392b][Math.floor(rng() * 3)];
    g.ellipse(px, py, 1.8 * Math.max(s, 0.9), 3 * Math.max(s, 0.9)).fill(color).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.5 });
  }
}

// Eucalipto: tronco claro y alto con copa alargada verde azulada.
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

// Ciprés: cono oscuro y estrecho, típico de las cercas de las fincas lecheras.
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

// Paca de heno redonda.
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

// Vaca holstein (blanca con manchas negras), de lado. La usa también el Potrero.
export function drawCow(g, x, y, scale, rng, flip = false) {
  const f = flip ? -1 : 1;
  const s = scale;
  shadow(g, x, y + 1, 13 * s, 4 * s);
  // Patas.
  for (const lx of [-7, -3, 4, 8]) g.rect(x + lx * s * f - 1, y - 7 * s, 2 * s, 7 * s).fill(0xf4f1e8).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  // Cuerpo con manchas.
  g.roundRect(x - 10 * s, y - 15 * s, 20 * s, 9 * s, 4 * s).fill(0xfbf8f1).stroke({ width: 1.2, color: 0x3a2418, alpha: 0.6 });
  for (let i = 0; i < 3; i++) g.ellipse(x + (-5 + i * 5 + rng() * 2) * s * f, y - (10 + rng() * 3) * s, (2 + rng() * 2) * s, (1.5 + rng()) * s).fill(0x2b2b2b);
  // Ubre rosada.
  g.ellipse(x + 3 * s * f, y - 6 * s, 2.5 * s, 1.5 * s).fill(0xf2a7b5);
  // Cabeza.
  g.roundRect(x + (f > 0 ? 9 : -15) * s, y - 18 * s, 6 * s, 7 * s, 2 * s).fill(0xfbf8f1).stroke({ width: 1.2, color: 0x3a2418, alpha: 0.6 });
  g.ellipse(x + 12 * s * f, y - 11.5 * s, 2.8 * s, 1.8 * s).fill(0xf2a7b5);
  g.circle(x + 11 * s * f, y - 16 * s, 0.9 * s).fill(0x2b2b2b);
  // Cachos.
  g.moveTo(x + 10 * s * f, y - 18 * s).lineTo(x + 9 * s * f, y - 21 * s).moveTo(x + 13 * s * f, y - 18 * s).lineTo(x + 14 * s * f, y - 21 * s).stroke({ width: 1.2, color: 0xe8dcc0 });
  // Cola.
  g.moveTo(x - 10 * s * f, y - 14 * s).quadraticCurveTo(x - 13 * s * f, y - 10 * s, x - 12 * s * f, y - 6 * s).stroke({ width: 1, color: 0x3a2418 });
}

// Guadual: varias cañas de guadua altas y algo inclinadas, con hojitas en lo alto.
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

// Mata de caña suelta.
function caneClump(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCaneClump(g, 0, 0, 0.8 + rng() * 0.3, rng);
  c.addChild(g);
  return c;
}

// Samán: árbol de copa ancha y plana.
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

// Mata de caña de azúcar: tallos rectos con nudos y hojas largas. La usa también el Cañaduzal.
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

// Palma de cera: tronco alto y fino con copa pequeña.
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

// Mata de plátano.
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

// Cafeto: arbusto redondo con cerezas rojas. Lo usa también el Cafetal.
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
