import { Container, Graphics } from 'pixi.js';
import { iso, depth, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, shadow } from './procedural/shapes.js';
import { PRODUCTS } from '../data/products.js';

// Mula con costales y arriero de sombrero aguadeño.
export class MuleView extends Container {
  constructor(productId) {
    super();
    this.body = new Graphics();
    this.legs = new Graphics();
    this.man = new Graphics();
    this.addChild(this.legs, this.body, this.man);
    this.phase = Math.random() * 10;
    this.drawBody(PRODUCTS[productId]?.color ?? PAL.cherry);
    this.drawMan();
  }

  drawBody(productColor) {
    const g = this.body;
    shadow(g, 0, 0, 14, 5);
    g.ellipse(0, -12, 11, 6).fill(PAL.mule).stroke(OUTLINE);
    g.moveTo(8, -14).lineTo(14, -22).stroke({ width: 5, color: PAL.mule });
    g.ellipse(16, -23, 5, 3.5).fill(PAL.mule).stroke(OUTLINE);
    g.moveTo(14, -26).lineTo(13, -31).moveTo(16, -26).lineTo(16.5, -31).stroke({ width: 2, color: shade(PAL.mule, 0.6) });
    g.moveTo(-11, -13).lineTo(-14, -6).stroke({ width: 2, color: 0x3a2418 });
    // Costales a lado y lado.
    g.ellipse(-3, -17, 6, 5).fill(PAL.sack).stroke(OUTLINE);
    g.ellipse(4, -17, 6, 5).fill(PAL.sack).stroke(OUTLINE);
    g.ellipse(-3, -21, 3, 1.5).fill(productColor);
    g.ellipse(4, -21, 3, 1.5).fill(productColor);
  }

  drawMan() {
    const g = this.man;
    g.position.set(-4, 7);
    shadow(g, 0, 0, 6, 2.5);
    g.rect(-3, -9, 2.2, 9).fill(0x3d3d5c);
    g.rect(0.8, -9, 2.2, 9).fill(0x3d3d5c);
    g.poly([-6, -10, 6, -10, 0, -20]).fill(0xc8643b).stroke(OUTLINE); // poncho
    g.circle(0, -22, 3.5).fill(0xc68642);
    g.ellipse(0, -25, 7, 2).fill(0xf4efe6).stroke(OUTLINE); // ala del sombrero
    g.roundRect(-3.5, -30, 7, 5, 2).fill(0xf4efe6).stroke(OUTLINE);
    g.rect(-3.5, -27, 7, 1.5).fill(0x222222);
  }

  place(gx, gy, dx, dy, t) {
    const p = iso(gx, gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(gx, gy);
    const screenDx = dx - dy;
    if (screenDx !== 0) this.scale.x = screenDx > 0 ? 1 : -1;
    const step = Math.sin((t + this.phase) * 12);
    this.body.y = Math.abs(step) * -1.2;
    this.man.y = 7 + Math.abs(Math.cos((t + this.phase) * 12)) * -1;
    this.legs.clear();
    for (const [lx, k] of [[-8, 1], [-5, -1], [6, -1], [9, 1]]) {
      this.legs.moveTo(lx, -9).lineTo(lx + step * 2.5 * k, 0).stroke({ width: 2, color: 0x4a3020 });
    }
  }
}

// Jeep Willys: dos versiones de la caja según el eje por el que circula.
export class JeepView extends Container {
  constructor() {
    super();
    this.alongY = new Container();
    this.alongX = new Container();
    this.bodyY = this.drawJeep(false);
    this.bodyX = this.drawJeep(true);
    this.cargoY = new Graphics();
    this.cargoX = new Graphics();
    this.alongY.addChild(this.bodyY, this.cargoY);
    this.alongX.addChild(this.bodyX, this.cargoX);
    this.addChild(this.alongY, this.alongX);
    this.cargo = -1;
  }

  drawJeep(alongX) {
    const g = new Graphics();
    const [w, d] = alongX ? [1.0, 0.55] : [0.55, 1.0];
    const x0 = -w / 2;
    const y0 = -d / 2;
    const s = iso(0, 0);
    shadow(g, s.x, s.y + 2, 30, 13, 0.28);
    // Ruedas.
    const wheels = alongX
      ? [[x0 + 0.2, y0 + d], [x0 + w - 0.2, y0 + d], [x0 + w, y0 + 0.15], [x0 + w, y0 + d - 0.15]]
      : [[x0 + w, y0 + 0.2], [x0 + w, y0 + d - 0.2], [x0 + 0.15, y0 + d], [x0 + w - 0.15, y0 + d]];
    for (const [wx, wy] of wheels) {
      const p = iso(wx, wy, 4);
      g.ellipse(p.x, p.y, 4.5, 4.5).fill(0x2b2b2b);
      g.circle(p.x, p.y, 1.6).fill(0x999999);
    }
    box(g, x0, y0, w, d, 9, PAL.jeep, { z: 4 });
    // Capó (más bajo) y parabrisas.
    if (alongX) {
      box(g, x0, y0 + 0.05, 0.08, d - 0.1, 12, 0x2b3b25, { z: 13 });
    } else {
      box(g, x0 + 0.05, y0 + d - 0.12, w - 0.1, 0.06, 12, 0x2b3b25, { z: 13 });
    }
    g.cargoBase = { x0, y0, w, d, alongX };
    return g;
  }

  drawCargo(g, base, n) {
    g.clear();
    const { x0, y0, w, d, alongX } = base;
    for (let i = 0; i < n; i++) {
      const f = (i % 3) / 3 + 0.15;
      const z = 13 + Math.floor(i / 3) * 6;
      const p = alongX ? iso(x0 + 0.15 + f * (w * 0.6), y0 + d / 2, z) : iso(x0 + w / 2, y0 + 0.1 + f * (d * 0.6), z);
      g.ellipse(p.x, p.y - 3, 7, 5).fill(PAL.sack).stroke(OUTLINE);
    }
  }

  // load: 0..1 de llenado.
  place(gx, gy, dx, dy, load) {
    const p = iso(gx, gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(gx, gy) + 0.2;
    const alongX = Math.abs(dx) > Math.abs(dy);
    this.alongX.visible = alongX;
    this.alongY.visible = !alongX;
    const n = load <= 0 ? 0 : Math.max(1, Math.round(load * 6));
    if (n !== this.cargo) {
      this.cargo = n;
      this.drawCargo(this.cargoX, this.bodyX.cargoBase, n);
      this.drawCargo(this.cargoY, this.bodyY.cargoBase, n);
    }
  }
}
