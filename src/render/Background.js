import { Container, Graphics } from 'pixi.js';
import { createRng } from '../core/rng.js';

// Fondo en coordenadas de pantalla: cordilleras en capas con niebla y nubes.
// El cielo es un degradado CSS detrás del canvas.
export class Background {
  constructor() {
    this.view = new Container();
    this.mountains = new Graphics();
    this.clouds = new Container();
    this.birds = new Graphics();
    this.view.addChild(this.mountains, this.clouds, this.birds);
    // Estrellas: van aparte para que el tinte de la noche no las apague.
    this.stars = new Graphics();
    this.night = 0;
    this.flock = [];
    this.nextFlock = 4;
    this.width = 0;
    this.height = 0;
    this.parallax = { x: 0, y: 0 };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.drawMountains();
    this.buildClouds();
    this.drawStars();
  }

  drawStars() {
    const g = this.stars.clear();
    const rng = createRng(29);
    for (let i = 0; i < 90; i++) {
      const r = rng() < 0.15 ? 1.6 : 1;
      g.circle(rng() * this.width, rng() * this.height * 0.45, r).fill({ color: 0xffffff, alpha: 0.5 + rng() * 0.5 });
    }
  }

  // 0 = día, 1 = noche cerrada.
  setNight(n) {
    this.night = n;
    this.stars.alpha = n;
    this.stars.visible = n > 0.02;
  }

  drawMountains() {
    const g = this.mountains.clear();
    const { width: w, height: h } = this;
    const layers = [
      { base: 0.42, amp: 0.12, color: 0xb8d0c4, seed: 3 },
      { base: 0.5, amp: 0.1, color: 0x8fb3a0, seed: 5 },
      { base: 0.58, amp: 0.09, color: 0x6f9c7c, seed: 11 },
    ];
    for (const [i, layer] of layers.entries()) {
      const rng = createRng(layer.seed);
      const pts = [-100, h];
      const step = 70 + i * 20;
      for (let x = -100; x <= w + 200; x += step) {
        const y = h * (layer.base - layer.amp * (0.3 + rng() * 0.7));
        pts.push(x, y, x + step / 2, y + h * 0.04 * rng() + 10);
      }
      pts.push(w + 200, h);
      g.poly(pts).fill(layer.color);
      // Niebla entre capas.
      g.rect(-100, h * (layer.base - 0.02), w + 300, h * 0.09).fill({ color: 0xffffff, alpha: 0.22 });
    }
  }

  buildClouds() {
    this.clouds.removeChildren();
    const rng = createRng(17);
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      const s = 0.6 + rng() * 0.8;
      for (let k = 0; k < 4; k++) g.ellipse(k * 22 * s, (k % 2) * -8 * s, 26 * s, 14 * s).fill({ color: 0xffffff, alpha: 0.85 });
      g.position.set(rng() * this.width, this.height * (0.05 + rng() * 0.25));
      g.speed = 4 + rng() * 6;
      this.clouds.addChild(g);
    }
  }

  update(dt, camera) {
    for (const c of this.clouds.children) {
      c.x += c.speed * dt;
      if (c.x > this.width + 120) c.x = -160;
    }
    // Paralaje leve: las montañas se mueven un poco con la cámara.
    this.mountains.position.set(camera.offsetX * 0.03, camera.offsetY * 0.03);
    this.updateBirds(dt);
  }

  // Bandadas de pájaros que cruzan el cielo de día.
  updateBirds(dt) {
    this.nextFlock -= dt;
    if (this.nextFlock <= 0 && this.night < 0.3) {
      this.nextFlock = 25 + Math.random() * 30;
      const y = this.height * (0.08 + Math.random() * 0.2);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        this.flock.push({ x: dir > 0 ? -40 - i * 18 : this.width + 40 + i * 18, y: y + (i % 2) * 10 + i * 3, dir, phase: Math.random() * 6 });
      }
    }
    const g = this.birds.clear();
    for (const b of this.flock) {
      b.x += b.dir * 45 * dt;
      b.phase += dt * 9;
      const wing = Math.sin(b.phase) * 4;
      g.moveTo(b.x - 6, b.y - wing).lineTo(b.x, b.y).lineTo(b.x + 6, b.y - wing).stroke({ width: 1.8, color: 0x3a2418, alpha: 0.7 });
    }
    this.flock = this.flock.filter((b) => b.x > -200 && b.x < this.width + 200);
  }
}
