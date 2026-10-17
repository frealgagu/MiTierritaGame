import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { FONT } from './palette.js';

// Números flotantes, humo, cerezas que saltan y confeti.
export class Effects {
  constructor() {
    this.view = new Container();
    this.view.zIndex = 100000; // siempre encima del mundo
    this.items = [];
  }

  floatText(x, y, text, { color = 0xffffff, size = 18, life = 1.4 } = {}) {
    const t = new Text({
      text,
      style: { fontFamily: FONT, fontSize: size, fontWeight: '700', fill: color, stroke: { color: 0x3a2418, width: 4 } },
      resolution: 3,
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.add(t, life, (o, k) => {
      o.y -= 28 * k.dt;
      o.alpha = Math.min(1, (k.life - k.age) * 2);
      o.scale.set(k.age < 0.15 ? 0.6 + (k.age / 0.15) * 0.4 : 1);
    });
  }

  smoke(x, y) {
    const g = new Graphics().circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.7 });
    g.position.set(x, y);
    const drift = (Math.random() - 0.5) * 6;
    this.add(g, 2.5, (o, k) => {
      o.y -= 12 * k.dt;
      o.x += drift * k.dt;
      o.scale.set(1 + k.age * 0.8);
      o.alpha = 0.7 * (1 - k.age / k.life);
    });
  }

  // Cereza que salta desde un cafeto.
  hop(x, y, color) {
    const g = new Graphics().circle(0, 0, 2.5).fill(color);
    g.position.set(x, y);
    const vx = (Math.random() - 0.5) * 30;
    let vy = -60;
    this.add(g, 0.7, (o, k) => {
      vy += 160 * k.dt;
      o.x += vx * k.dt;
      o.y += vy * k.dt;
      o.alpha = 1 - k.age / k.life;
    });
  }

  ring(x, y, color = 0xffe066) {
    const g = new Graphics();
    g.position.set(x, y);
    this.add(g, 0.7, (o, k) => {
      const r = 10 + k.age * 120;
      o.clear().ellipse(0, 0, r, r * 0.5).stroke({ width: 4, color, alpha: 1 - k.age / k.life });
    });
  }

  // Monedas que saltan (al vender en el pueblo).
  coins(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics().circle(0, 0, 4).fill(0xffd700).stroke({ width: 1.5, color: 0xb8860b });
      g.position.set(x, y);
      const vx = (Math.random() - 0.5) * 90;
      let vy = -90 - Math.random() * 70;
      this.add(g, 0.9, (o, k) => {
        vy += 300 * k.dt;
        o.x += vx * k.dt;
        o.y += vy * k.dt;
        o.scale.x = Math.cos(k.age * 14);
        o.alpha = 1 - (k.age / k.life) ** 2;
      });
    }
  }

  // Estrellitas al subir de nivel.
  sparkle(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics().star(0, 0, 4, 5, 2).fill(0xfff3b0);
      const a = (i / count) * Math.PI * 2;
      g.position.set(x + Math.cos(a) * 12, y + Math.sin(a) * 6);
      this.add(g, 0.8, (o, k) => {
        o.x += Math.cos(a) * 40 * k.dt;
        o.y += Math.sin(a) * 20 * k.dt - 20 * k.dt;
        o.rotation += 4 * k.dt;
        o.alpha = 1 - k.age / k.life;
      });
    }
  }

  // Luciérnaga: punto de luz que flota un rato (solo de noche).
  firefly(x, y, texture) {
    const s = new Sprite(texture);
    s.anchor.set(0.5);
    s.scale.set(0.22);
    s.tint = 0xd8ff7a;
    s.blendMode = 'add';
    s.position.set(x, y);
    const vx = (Math.random() - 0.5) * 12;
    const phase = Math.random() * 6;
    this.add(s, 5 + Math.random() * 4, (o, k) => {
      o.x += vx * k.dt;
      o.y += Math.sin(k.age * 2 + phase) * 6 * k.dt;
      o.alpha = Math.min(1, k.age, k.life - k.age) * (0.5 + 0.5 * Math.sin(k.age * 5 + phase));
    });
  }

  confetti(x, y, count = 40) {
    const colors = [0xd7263d, 0x2e6fd1, 0xe8b90f, 0x2fa36b, 0xffffff];
    for (let i = 0; i < count; i++) {
      const g = new Graphics().rect(-2.5, -1.5, 5, 3).fill(colors[i % colors.length]);
      g.position.set(x, y);
      const vx = (Math.random() - 0.5) * 220;
      let vy = -120 - Math.random() * 160;
      const spin = (Math.random() - 0.5) * 20;
      this.add(g, 1.6, (o, k) => {
        vy += 260 * k.dt;
        o.x += vx * k.dt;
        o.y += vy * k.dt;
        o.rotation += spin * k.dt;
        o.alpha = 1 - k.age / k.life;
      });
    }
  }

  add(obj, life, fn) {
    this.view.addChild(obj);
    this.items.push({ obj, life, age: 0, fn, dt: 0 });
  }

  update(dt) {
    for (const k of this.items) {
      k.age += dt;
      k.dt = dt;
      k.fn(k.obj, k);
    }
    const dead = this.items.filter((k) => k.age >= k.life);
    if (dead.length) {
      for (const k of dead) k.obj.destroy();
      this.items = this.items.filter((k) => k.age < k.life);
    }
  }
}
