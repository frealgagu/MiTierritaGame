import { Container, Graphics } from 'pixi.js';
import { iso, depth } from './iso.js';
import { OUTLINE } from './palette.js';
import { shadow } from './procedural/shapes.js';
import { drawCow } from './Terrain.js';
import { createRng } from '../core/rng.js';

// Vida en el mapa (v1.8): gallinas junto a la casa, un perro que a veces persigue al Willys, vacas que
// pastan en el potrero y, en el Pueblo, gente que pasea por la plaza y las aceras (sin pisar las calles,
// por donde pasan las mulas y los carros) y palomas alrededor de la fuente. Es solo decoración: no tiene
// que ver con la economía. De noche, las gallinas, las palomas y la gente se recogen.
const SPEED = { chicken: 0.55, pigeon: 0.45, dog: 1.1, person: 0.6, cow: 0.12 };
// Hasta dónde va de un tirón y cuánto se queda quieto al llegar (s).
const REACH = { person: 4.5, cow: 3 };
const PAUSE = { person: [0.4, 1.6], cow: [1, 9] };
const THIN = { width: 0.8, color: 0x3a2418, alpha: 0.6 };
const SKIN = [0xc68642, 0x8d5524, 0xe0ac69, 0xa86b3c];
const SHIRTS = [0xd7263d, 0x2e6fd1, 0xe8b90f, 0x2fa36b, 0xf4efe6, 0xc8643b, 0x8e44ad];

class Critter extends Container {
  // walk(ax, ay, bx, by): si puede ir en línea recta de un punto al otro (sin walk, a cualquier lado).
  constructor(kind, area, rng, walk = null) {
    super();
    this.kind = kind;
    this.area = area; // puntos [gx, gy] por donde anda
    this.rng = rng;
    this.walk = walk;
    this.g = new Graphics();
    this.addChild(this.g);
    const [gx, gy] = area[Math.floor(rng() * area.length)];
    this.pos = { gx, gy };
    this.target = null;
    this.wait = rng() * 3;
    this.dir = rng() < 0.5 ? 1 : -1;
    this.phase = rng() * 10;
    this.color = kind === 'chicken' ? (rng() < 0.6 ? 0xf8f4ea : 0xa0522d) : kind === 'person' ? SHIRTS[Math.floor(rng() * SHIRTS.length)] : 0;
    this.skin = SKIN[Math.floor(rng() * SKIN.length)];
    this.hat = rng() < 0.5;
    this.spots = rng() < 0.5;
    this.cowSeed = Math.floor(rng() * 1000);
    this.moving = false;
  }

  // Siguiente lugar: uno cercano del área (para no cruzar el mapa de un tirón).
  pick() {
    const reach = REACH[this.kind] ?? 3;
    const near = this.area.filter(([x, y]) => Math.hypot(x - this.pos.gx, y - this.pos.gy) < reach);
    const list = near.length > 1 ? near : this.area;
    for (let k = 0; k < 8; k++) {
      const [gx, gy] = list[Math.floor(this.rng() * list.length)];
      if (this.walk && !this.walk(this.pos.gx, this.pos.gy, gx, gy)) continue;
      this.target = { gx, gy };
      return;
    }
    this.wait = 0.5; // nada a la mano: lo intenta otra vez en un rato
  }

  // follow: punto que perseguir (el perro detrás del Willys), o null.
  update(dt, t, follow) {
    let speed = SPEED[this.kind];
    if (follow) {
      this.target = follow;
      this.wait = 0;
      speed = 2.4;
    } else if (this.wait > 0) {
      this.wait -= dt;
      this.moving = false;
    } else if (!this.target) this.pick();
    if (this.target && this.wait <= 0) {
      const dx = this.target.gx - this.pos.gx;
      const dy = this.target.gy - this.pos.gy;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step) {
        this.pos = { ...this.target };
        this.target = null;
        this.moving = false;
        const [w0, w1] = PAUSE[this.kind] ?? [1, 5];
        if (!follow) this.wait = w0 + this.rng() * (w1 - w0);
      } else {
        this.pos.gx += (dx / d) * step;
        this.pos.gy += (dy / d) * step;
        this.moving = true;
        const screenDx = dx - dy;
        if (Math.abs(screenDx) > 0.01) this.dir = screenDx > 0 ? 1 : -1;
      }
    }
    const p = iso(this.pos.gx, this.pos.gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(this.pos.gx, this.pos.gy);
    this.draw(t + this.phase);
  }

  draw(t) {
    const g = this.g.clear();
    const f = this.dir;
    const walk = this.moving ? Math.sin(t * 14) : 0;
    if (this.kind === 'chicken' || this.kind === 'pigeon') {
      const pigeon = this.kind === 'pigeon';
      const peck = !this.moving && Math.sin(t * 3) > 0.6 ? 3 : 0;
      const body = pigeon ? 0x9aa0a6 : this.color;
      shadow(g, 0, 0, 4, 1.5);
      g.moveTo(-1, -3).lineTo(-1 + walk, 0).moveTo(1, -3).lineTo(1 - walk, 0).stroke({ width: 1, color: pigeon ? 0xd9776f : 0xe8a33a });
      g.ellipse(0, -5, pigeon ? 3.6 : 4.2, pigeon ? 2.6 : 3.3).fill(body).stroke(THIN);
      g.poly([-3.5 * f, -6, -6.5 * f, pigeon ? -6.5 : -9.5, -3 * f, -7.8]).fill(body).stroke(THIN);
      const hx = 3.2 * f;
      const hy = -8 + peck;
      if (pigeon) g.circle(hx * 0.8, hy + 1.2, 1.6).fill(0x5f8f7a);
      g.circle(hx, hy, pigeon ? 1.7 : 2.1).fill(body).stroke(THIN);
      if (!pigeon) g.circle(hx + 0.3 * f, hy - 2.1, 0.9).fill(0xd7263d);
      g.poly([hx + 1.7 * f, hy - 0.4, hx + 3.4 * f, hy + 0.2, hx + 1.7 * f, hy + 0.7]).fill(pigeon ? 0x3a3a3a : 0xf2a900);
      g.circle(hx + 0.6 * f, hy - 0.4, 0.45).fill(0x1a1a1a);
    } else if (this.kind === 'dog') {
      shadow(g, 0, 0, 8, 2.5);
      for (const [lx, k] of [[-4, 1], [-2.5, -1], [3, -1], [4.5, 1]]) g.moveTo(lx * f, -4).lineTo((lx + walk * 1.5 * k) * f, 0).stroke({ width: 1.6, color: 0x5e3b1c });
      const wag = Math.sin(t * (this.moving ? 18 : 6)) * 2;
      g.moveTo(-6 * f, -6).quadraticCurveTo(-8.5 * f, -9, -8 * f + wag, -11).stroke({ width: 1.4, color: 0x8b5a2b });
      g.ellipse(0, -6, 6.5, 3).fill(0x8b5a2b).stroke(THIN);
      g.circle(6 * f, -9, 2.8).fill(0x8b5a2b).stroke(THIN);
      g.ellipse(8.4 * f, -8.4, 1.7, 1.1).fill(0x5e3b1c);
      g.poly([4.8 * f, -11, 5.4 * f, -7.5, 3.6 * f, -8.5]).fill(0x5e3b1c);
      g.circle(6.6 * f, -9.8, 0.5).fill(0x1a1a1a);
    } else if (this.kind === 'person') {
      shadow(g, 0, 0, 5, 2);
      g.rect(-2.2 + walk, -8, 1.8, 8).fill(0x3d3d5c);
      g.rect(0.4 - walk, -8, 1.8, 8).fill(0x3d3d5c);
      g.roundRect(-3, -16, 6, 8.5, 2).fill(this.color).stroke(THIN);
      g.moveTo(-3, -14).lineTo(-3.5 - walk, -9.5).moveTo(3, -14).lineTo(3.5 + walk, -9.5).stroke({ width: 1.4, color: this.skin });
      g.circle(0, -18.5, 2.6).fill(this.skin);
      if (this.hat) {
        g.ellipse(0, -20.4, 5, 1.4).fill(0xf4efe6).stroke(THIN);
        g.roundRect(-2.4, -24, 4.8, 3.8, 1.2).fill(0xf4efe6).stroke(THIN);
        g.rect(-2.4, -21.6, 4.8, 1).fill(0x222222);
      } else g.ellipse(0, -20.4, 2.8, 1.6).fill(0x2b1d14);
    } else if (this.kind === 'cow') {
      // Pastando: baja un poco la cabeza de vez en cuando (todo el cuerpo se mece).
      const graze = this.moving ? Math.abs(walk) * 0.6 : Math.max(0, Math.sin(t * 0.8)) * 1.2;
      drawCow(g, 0, graze, 0.95, createRng(this.cowSeed), f < 0);
    }
  }
}

// Puntos dentro de las casillas de la lista (al azar dentro de cada casilla).
function spots(tiles, rng, per = 2) {
  const out = [];
  for (const [gx, gy] of tiles) for (let k = 0; k < per; k++) out.push([gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6]);
  return out;
}

export class Critters {
  // farmView: para saber cuántas vacas hay en el potrero (crecen con los hitos).
  constructor(zone, terrain, parent) {
    this.zone = zone;
    this.parent = parent;
    this.rng = createRng(zone.seed * 7 + 3);
    this.list = [];
    const tiles = terrain.tiles;
    const n = zone.size;
    const all = [];
    for (let gx = 0; gx < n; gx++) for (let gy = 0; gy < n; gy++) all.push([gx, gy]);
    const grass = all.filter(([x, y]) => tiles[x][y] === 'grass');
    const near = (list, x0, y0, x1, y1, d) => list.filter(([x, y]) => x >= x0 - d && x <= x1 + d && y >= y0 - d && y <= y1 + d);
    const f = zone.farm;
    const w = zone.warehouse;
    const add = (kind, area, count) => {
      if (area.length < 2) return;
      for (let i = 0; i < count; i++) {
        const c = new Critter(kind, area, this.rng);
        this.list.push(c);
        parent.addChild(c);
      }
    };
    // El perro, por el patio de la bodega (y detrás del Willys cuando sale).
    const yard = spots(near(grass, w.x, w.y, w.x + w.w, w.y + w.h, 2), this.rng);
    add('dog', yard, 1);
    if (zone.theme === 'town') {
      // Gente por la plaza y las aceras de alrededor, sin cruzar calles, casas ni la fuente.
      const walkable = townWalkable(zone, tiles, terrain.occupied);
      this.walk = (ax, ay, bx, by) => {
        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
        for (let s = 0; s <= steps; s++) if (!walkable(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps)) return false;
        return true;
      };
      this.sidewalks = [];
      // La plaza y la grama a su izquierda (al sur quedarían tapados por la Fonda).
      for (let gx = f.x - 2; gx < f.x + f.w; gx += 0.5) {
        for (let gy = f.y; gy < f.y + f.h; gy += 0.5) {
          const px = gx + 0.1 + this.rng() * 0.3;
          const py = gy + 0.1 + this.rng() * 0.3;
          if (walkable(px, py)) this.sidewalks.push([px, py]);
        }
      }
      this.people = [];
      // La plaza se dibuja entera de una vez (casa, mesas, fuente): la gente que anda por ella va encima.
      this.plaza = { ...f, z: depth(f.x + f.w, f.y + f.h) };
      const cx = f.x + f.w * 0.62;
      const cy = f.y + f.h * 0.62;
      const ring = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const r = 1.25 + this.rng() * 0.5;
        ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      add('pigeon', ring, 5);
      return;
    }
    // Gallinas junto a la casa de la finca (afuera del cultivo).
    add('chicken', spots(near(grass, f.x, f.y, f.x + 2, f.y + 2, 2), this.rng), 4);
    if (zone.theme === 'dairy') {
      // Vacas en el potrero, lejos de la casa.
      const pasture = [];
      for (let i = 0; i < 80; i++) {
        const gx = f.x + 0.6 + this.rng() * (f.w - 1.2);
        const gy = f.y + 0.6 + this.rng() * (f.h - 1.2);
        if (gx < f.x + 2.6 && gy < f.y + 2.8) continue;
        pasture.push([gx, gy]);
      }
      this.pasture = pasture;
      this.cows = [];
    }
  }

  // Tantas vacas como dibuja el potrero para su nivel.
  setCows(count) {
    if (this.pasture) this.resize(this.cows, count, () => new Critter('cow', this.pasture, this.rng));
  }

  // Tanta gente en la plaza como pide la Casa del café para su nivel.
  setPeople(count) {
    if (this.people && this.sidewalks.length > 1) this.resize(this.people, count, () => new Critter('person', this.sidewalks, this.rng, this.walk));
  }

  resize(group, count, make) {
    while (group.length < count) {
      const c = make();
      group.push(c);
      this.list.push(c);
      this.parent.addChild(c);
    }
    while (group.length > count) {
      const c = group.pop();
      this.list.splice(this.list.indexOf(c), 1);
      c.destroy();
    }
  }

  // night: de noche las gallinas, las palomas y la gente se recogen. jeep: dónde va el Willys (moving
  // solo en las salidas en que el perro lo persigue).
  update(dt, t, night, jeep) {
    for (const c of this.list) {
      const asleep = night && (c.kind === 'chicken' || c.kind === 'pigeon' || c.kind === 'person');
      c.visible = !asleep;
      if (asleep) continue;
      let follow = null;
      // El perro corre detrás del Willys mientras va cerca de la bodega (en algunas salidas).
      if (c.kind === 'dog' && jeep?.moving) {
        const d = Math.hypot(jeep.gx - c.pos.gx, jeep.gy - c.pos.gy);
        if (d < 5 && d > 0.8) follow = { gx: jeep.gx - jeep.dx * 0.9, gy: jeep.gy - jeep.dy * 0.9 };
      }
      c.update(dt, t, follow);
      const pz = this.plaza;
      if (pz && c.kind === 'person' && c.pos.gx > pz.x && c.pos.gx < pz.x + pz.w && c.pos.gy > pz.y && c.pos.gy < pz.y + pz.h) c.zIndex = pz.z + 0.1;
    }
  }
}

// Dónde puede pararse la gente del Pueblo: la plaza (menos la esquina de la casa y las mesas, la fuente,
// los guayacanes y los faroles) y la grama sin casitas ni árboles. Nunca las calles ni los edificios.
function townWalkable(zone, tiles, occupied) {
  const { x, y, w, h } = zone.farm;
  const fountain = [w * 0.62, h * 0.62];
  const posts = [[w - 0.7, 0.8], [0.8, h - 0.7], [w - 0.6, h - 0.6], [w * 0.62 - 1.4, h * 0.62 - 1.4], [w - 0.3, h * 0.62], [w * 0.62, h - 0.3]];
  return (gx, gy) => {
    const tx = Math.floor(gx);
    const ty = Math.floor(gy);
    const t = tiles[tx]?.[ty];
    const lx = gx - x;
    const ly = gy - y;
    // Ni detrás de la casa del café (quedaría tapado por el tejado).
    if (lx < 3.3 && ly < 3.3) return false;
    if (t === 'grass') return !occupied.has(`${tx},${ty}`);
    if (t !== 'farm') return false;
    if (lx < 0.25 || ly < 0.25 || lx > w - 0.25 || ly > h - 0.25) return false;
    if (lx + ly < 4.6) return false; // las mesas de la casa
    if (Math.hypot(lx - fountain[0], ly - fountain[1]) < 1.5) return false;
    return posts.every(([px, py]) => Math.hypot(lx - px, ly - py) > 0.6);
  };
}
