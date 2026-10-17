import { Container, Graphics } from 'pixi.js';
import { createRng } from '../core/rng.js';

// Fondo en coordenadas de pantalla: cordilleras en capas con niebla y nubes.
// El cielo es un degradado CSS detrás del canvas.
export class Background {
  constructor() {
    this.view = new Container();
    this.mountains = new Graphics();
    this.clouds = new Container();
    this.view.addChild(this.mountains, this.clouds);
    this.width = 0;
    this.height = 0;
    this.parallax = { x: 0, y: 0 };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.drawMountains();
    this.buildClouds();
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
  }
}
