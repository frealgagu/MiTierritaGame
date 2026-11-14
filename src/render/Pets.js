// Pets (v3.12): cats and parrots bought with Renown per region. Purely
// cosmetic. Cats stroll grass and curl up to nap; parrots fly between trees
// and lawn. Occasionally (every 30–60 s) a cat spots a perched parrot and dashes
// after it; parrot takes off to a far perch, leaving the cat staring.
import { moverDepth } from './occlusion.js';
import { Container, Graphics } from 'pixi.js';
import { iso } from './iso.js';
import { shadow } from './procedural/shapes.js';
import { createRng } from '../core/rng.js';

const THIN = { width: 0.8, color: 0x3a2418, alpha: 0.6 };
const CAT_COATS = [
  { body: 0xe08a3c, stripes: 0xb5622a }, // amarillo atigrado
  { body: 0x2b2b2b, stripes: 0x1a1a1a }, // negro
  { body: 0x9aa0a6, stripes: 0x6f747a }, // gris
  { body: 0xf4efe6, stripes: 0xd8d2c6 }, // blanco
  { body: 0xc8a27a, stripes: 0x8a6a4a }, // carey
];
// Parrots: scarlet macaw, blue-and-yellow macaw, and green parrot.
const PARROTS = [
  { body: 0xd7263d, wing: 0x2e6fd1, tail: 0xf2b705 },
  { body: 0x2e86c1, wing: 0x1b4f8a, tail: 0xf2b705, belly: 0xf2b705 },
  { body: 0x2fa36b, wing: 0x1f7a4d, tail: 0xd7263d },
];
const CHASE_EVERY = [25, 60]; // s between chases

class Cat extends Container {
  constructor(area, rng) {
    super();
    this.area = area;
    this.rng = rng;
    this.coat = CAT_COATS[Math.floor(rng() * CAT_COATS.length)];
    this.scale.set(1.3);
    this.g = new Graphics();
    this.addChild(this.g);
    [this.gx, this.gy] = area[Math.floor(rng() * area.length)];
    this.target = null;
    this.wait = rng() * 4;
    this.dir = 1;
    this.chasing = null; // parrot currently targeted
    this.sleep = 0;
    this.phase = rng() * 10;
  }

  update(dt, t) {
    let speed = 0.7;
    if (this.chasing) {
      speed = 2.6;
      this.target = { gx: this.chasing.gx, gy: this.chasing.gy };
      this.wait = 0;
    } else if (this.wait > 0) {
      this.wait -= dt;
    } else if (!this.target) {
      // Occasionally curls up to sleep; otherwise wanders nearby.
      if (this.rng() < 0.25) {
        this.sleep = 6 + this.rng() * 10;
        this.wait = this.sleep;
      } else {
        const near = this.area.filter(([x, y]) => Math.hypot(x - this.gx, y - this.gy) < 4);
        const list = near.length > 1 ? near : this.area;
        const [gx, gy] = list[Math.floor(this.rng() * list.length)];
        this.target = { gx, gy };
      }
    }
    if (this.wait <= 0) this.sleep = 0;
    this.moving = false;
    if (this.target && this.wait <= 0) {
      const dx = this.target.gx - this.gx;
      const dy = this.target.gy - this.gy;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step) {
        this.gx = this.target.gx;
        this.gy = this.target.gy;
        this.target = null;
        if (!this.chasing) this.wait = 1 + this.rng() * 4;
      } else {
        this.gx += (dx / d) * step;
        this.gy += (dy / d) * step;
        this.moving = true;
        if (Math.abs(dx - dy) > 0.01) this.dir = dx - dy > 0 ? 1 : -1;
      }
    }
    const p = iso(this.gx, this.gy);
    this.position.set(p.x, p.y);
    this.zIndex = moverDepth(this.gx, this.gy);
    this.draw(t + this.phase);
  }

  draw(t) {
    const g = this.g.clear();
    const f = this.dir;
    const { body, stripes } = this.coat;
    shadow(g, 0, 0, 6, 2);
    if (this.sleep > 0) {
      // Enroscado, durmiendo.
      g.ellipse(0, -3, 6, 3.4).fill(body).stroke(THIN);
      g.circle(4 * f, -4, 2.6).fill(body).stroke(THIN);
      g.moveTo(-5 * f, -2).quadraticCurveTo(-1, 1, 3 * f, -1).stroke({ width: 1.6, color: stripes });
      return;
    }
    const run = this.moving ? Math.sin(t * (this.chasing ? 26 : 14)) : 0;
    for (const [lx, k] of [[-3.5, 1], [-2, -1], [2.5, -1], [4, 1]]) g.moveTo(lx * f, -4).lineTo((lx + run * 1.6 * k) * f, 0).stroke({ width: 1.4, color: stripes });
    g.ellipse(0, -5, 5.5, 2.8).fill(body).stroke(THIN);
    for (const x of [-2, 0, 2]) g.moveTo(x * f, -7.5).lineTo((x + 0.5) * f, -3).stroke({ width: 0.8, color: stripes, alpha: 0.7 });
    // Raised swaying tail.
    const wag = Math.sin(t * 3) * 2;
    g.moveTo(-5 * f, -5).quadraticCurveTo(-8 * f, -9, -7 * f + wag, -13).stroke({ width: 1.6, color: body });
    // Cabeza y orejas.
    const hx = 5.5 * f;
    g.circle(hx, -8, 2.8).fill(body).stroke(THIN);
    g.poly([hx - 2.4 * f, -9.6, hx - 1.6 * f, -12.4, hx - 0.4 * f, -10.2]).fill(body).stroke(THIN);
    g.poly([hx + 0.4 * f, -10.2, hx + 1.6 * f, -12.4, hx + 2.4 * f, -9.6]).fill(body).stroke(THIN);
    g.circle(hx + 1 * f, -8.4, 0.5).fill(0x2fa36b);
  }
}

class Parrot extends Container {
  constructor(area, rng) {
    super();
    this.area = area;
    this.rng = rng;
    this.look = PARROTS[Math.floor(rng() * PARROTS.length)];
    this.scale.set(1.3);
    this.g = new Graphics();
    this.addChild(this.g);
    [this.gx, this.gy] = area[Math.floor(rng() * area.length)];
    this.alt = 0;
    this.flight = null; // { from, to, t, len }
    this.wait = 2 + rng() * 6;
    this.dir = 1;
    this.phase = rng() * 10;
  }

  get perched() {
    return !this.flight;
  }

  // Flies to spot (`far`: distant perch when chased by cat).
  fly(far = false) {
    const list = far ? this.area.filter(([x, y]) => Math.hypot(x - this.gx, y - this.gy) > 6) : this.area;
    const [gx, gy] = (list.length ? list : this.area)[Math.floor(this.rng() * (list.length || this.area.length))];
    const len = Math.max(1.2, Math.hypot(gx - this.gx, gy - this.gy) / (far ? 4 : 2.2));
    this.flight = { from: { gx: this.gx, gy: this.gy }, to: { gx, gy }, t: 0, len };
    if (Math.abs(gx - this.gx - (gy - this.gy)) > 0.01) this.dir = gx - this.gx - (gy - this.gy) > 0 ? 1 : -1;
  }

  update(dt, t) {
    if (this.flight) {
      const fl = this.flight;
      fl.t += dt / fl.len;
      const k = Math.min(1, fl.t);
      this.gx = fl.from.gx + (fl.to.gx - fl.from.gx) * k;
      this.gy = fl.from.gy + (fl.to.gy - fl.from.gy) * k;
      this.alt = Math.sin(k * Math.PI) * 34 + 4 * (1 - k);
      if (k >= 1) {
        this.flight = null;
        this.alt = 0;
        this.wait = 4 + this.rng() * 10;
      }
    } else if ((this.wait -= dt) <= 0) this.fly();
    const p = iso(this.gx, this.gy);
    this.position.set(p.x, p.y);
    this.zIndex = moverDepth(this.gx, this.gy) + (this.alt > 8 ? 2 : 0);
    this.draw(t + this.phase);
  }

  draw(t) {
    const g = this.g.clear();
    const f = this.dir;
    const { body, wing, tail, belly } = this.look;
    const y = -this.alt;
    shadow(g, 0, 0, this.alt > 2 ? 3 : 4, 1.4, this.alt > 2 ? 0.12 : 0.25);
    // Cola larga.
    g.poly([-2 * f, y - 5, -9 * f, y - 1, -8 * f, y + 0.5, -2 * f, y - 3.5]).fill(tail).stroke(THIN);
    g.ellipse(0, y - 6, 3.6, 2.6).fill(body).stroke(THIN);
    if (belly) g.ellipse(0.5 * f, y - 5, 2.2, 1.4).fill(belly);
    // Wings: spread and flapping in flight; folded when perched.
    if (this.flight) {
      const flap = Math.sin(t * 22) * 5;
      g.poly([-1 * f, y - 7, -4 * f, y - 12 - flap, 2 * f, y - 8]).fill(wing).stroke(THIN);
    } else g.ellipse(-0.8 * f, y - 6.4, 2.4, 1.6).fill(wing);
    const hx = 3 * f;
    g.circle(hx, y - 9, 2).fill(body).stroke(THIN);
    g.circle(hx + 0.5 * f, y - 9.6, 0.9).fill(0xffffff);
    g.circle(hx + 0.6 * f, y - 9.6, 0.4).fill(0x1a1a1a);
    g.poly([hx + 1.6 * f, y - 9.4, hx + 3.2 * f, y - 8.4, hx + 1.6 * f, y - 7.6]).fill(0x3a3a3a);
    if (!this.flight) g.moveTo(-0.5, y - 3.5).lineTo(-0.5, 0).moveTo(0.8, y - 3.5).lineTo(0.8, 0).stroke({ width: 0.8, color: 0x555555 });
  }
}

export class Pets {
  // area: clear grass points for roaming (shared by cats and parrots).
  constructor(zone, terrain, parent) {
    this.parent = parent;
    this.rng = createRng(zone.seed * 13 + 5);
    const tiles = terrain.tiles;
    const area = [];
    // Within initial camera region of map (not along far edges).
    for (let gx = 3; gx < zone.size - 4; gx++) {
      for (let gy = 3; gy < zone.size - 3; gy++) {
        if (tiles[gx][gy] !== 'grass' || terrain.occupied.has(`${gx},${gy}`)) continue;
        area.push([gx + 0.25 + this.rng() * 0.5, gy + 0.25 + this.rng() * 0.5]);
      }
    }
    this.area = area;
    this.cats = [];
    this.parrots = [];
    this.nextChase = CHASE_EVERY[0] / 2 + this.rng() * 10;
  }

  // Counts per species (from region look: LOOK.pets).
  setCounts(cats, parrots) {
    if (this.area.length < 4) return;
    const resize = (list, n, Kind) => {
      while (list.length < n) {
        const c = new Kind(this.area, this.rng);
        list.push(c);
        this.parent.addChild(c);
      }
      while (list.length > n) list.pop().destroy();
    };
    resize(this.cats, cats, Cat);
    resize(this.parrots, parrots, Parrot);
  }

  update(dt, t) {
    // Occasional chase: an awake cat stalks a perched parrot.
    this.nextChase -= dt;
    if (this.nextChase <= 0) {
      this.nextChase = CHASE_EVERY[0] + this.rng() * (CHASE_EVERY[1] - CHASE_EVERY[0]);
      const cats = this.cats.filter((c) => !c.chasing && c.sleep <= 0);
      const birds = this.parrots.filter((p) => p.perched);
      if (cats.length && birds.length) cats[Math.floor(this.rng() * cats.length)].chasing = birds[Math.floor(this.rng() * birds.length)];
    }
    for (const cat of this.cats) {
      const bird = cat.chasing;
      if (bird) {
        const d = Math.hypot(bird.gx - cat.gx, bird.gy - cat.gy);
        // Once cat closes in, parrot takes flight while cat watches.
        if (d < 1.2 || !bird.perched) {
          if (bird.perched) bird.fly(true);
          cat.chasing = null;
          cat.target = null;
          cat.wait = 3;
        }
      }
      cat.update(dt, t);
    }
    for (const p of this.parrots) p.update(dt, t);
  }
}
