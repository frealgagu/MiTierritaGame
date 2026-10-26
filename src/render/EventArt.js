// Los eventos en el mapa del tablero (v3.14): lo que pasa se ve, y cambia con cada compra. La broca
// camina por el cafetal hasta que llegan las trampas, el hongo y el re-re; el derrumbe tapa la vía, las
// mulas pasan por el monte, luego un carro por la trocha y al final la vía queda nueva… Cada evento
// tiene su escena (ART) en tres etapas más la del comienzo (cuántas compras van). Solo es dibujo.
import { Container, Graphics } from 'pixi.js';
import { iso, depth, shade } from './iso.js';
import { OUTLINE } from './palette.js';
import { box, shadow } from './procedural/shapes.js';
import { pointAt } from '../core/path.js';
import { createRng } from '../core/rng.js';
import { JeepView, MuleView } from './Carriers.js';
import { EVENTS_BY_ID } from '../data/events.js';

const THIN = { width: 0.8, color: 0x3a2418, alpha: 0.6 };
const SHIRTS = [0xd7263d, 0x2e6fd1, 0xe8b90f, 0x2fa36b, 0x8e44ad, 0xf07f1d, 0xf4efe6];
const SKIN = [0xc68642, 0x8d5524, 0xe0ac69, 0xa86b3c];

// Una persona parada en (x, y) de pantalla. o: { shirt, skin, hat, s (escala), arm (brazo levantado), pack }
function person(g, x, y, o = {}) {
  const s = o.s ?? 1.35; // un poco más grandes que la gente del pueblo: son los protagonistas
  const shirt = o.shirt ?? 0xd7263d;
  const skin = o.skin ?? 0xc68642;
  g.ellipse(x, y, 5 * s, 2 * s).fill({ color: 0x000000, alpha: 0.2 });
  g.rect(x - 2.2 * s, y - 8 * s, 1.8 * s, 8 * s).fill(0x3d3d5c);
  g.rect(x + 0.4 * s, y - 8 * s, 1.8 * s, 8 * s).fill(0x3d3d5c);
  if (o.pack) g.roundRect(x - 5 * s, y - 15 * s, 3.5 * s, 6 * s, 1).fill(o.pack).stroke(THIN);
  if (o.skirt) g.poly([x - 3.5 * s, y - 9 * s, x + 3.5 * s, y - 9 * s, x + 4.5 * s, y - 2 * s, x - 4.5 * s, y - 2 * s]).fill(o.skirt).stroke(THIN);
  g.roundRect(x - 3 * s, y - 16 * s, 6 * s, 8.5 * s, 2).fill(shirt).stroke(THIN);
  const a = o.arm ?? 0;
  g.moveTo(x - 3 * s, y - 14 * s).lineTo(x - 3.6 * s, y - 9.5 * s).moveTo(x + 3 * s, y - 14 * s).lineTo(x + (3.5 + a * 1.5) * s, y - (9.5 + a * 7) * s).stroke({ width: 1.4 * s, color: skin });
  g.circle(x, y - 18.5 * s, 2.6 * s).fill(skin);
  if (o.hat === 'helmet') g.ellipse(x, y - 20.2 * s, 3.4 * s, 2 * s).fill(0xf2b705).stroke(THIN);
  else if (o.hat) {
    g.ellipse(x, y - 20.4 * s, 5 * s, 1.4 * s).fill(o.hat === true ? 0xf4efe6 : o.hat).stroke(THIN);
    g.roundRect(x - 2.4 * s, y - 24 * s, 4.8 * s, 3.8 * s, 1.2).fill(o.hat === true ? 0xf4efe6 : o.hat).stroke(THIN);
  } else g.ellipse(x, y - 20.4 * s, 2.8 * s, 1.6 * s).fill(0x2b1d14);
}

// Un canasto con lo recogido.
function basket(g, x, y, fill, k = 1.8) {
  g.ellipse(x, y, 7 * k, 2.5 * k).fill({ color: 0x000000, alpha: 0.2 });
  g.poly([x - 6 * k, y - 7 * k, x + 6 * k, y - 7 * k, x + 4.5 * k, y, x - 4.5 * k, y]).fill(0xb08850).stroke(OUTLINE);
  for (let i = -4; i <= 4; i += 2) g.moveTo(x + i * k, y - 7 * k).lineTo(x + i * 0.75 * k, y).stroke({ width: 0.8, color: 0x7a5a30 });
  g.ellipse(x, y - 7 * k, 6 * k, 2 * k).fill(fill).stroke(THIN);
  for (let i = -2; i <= 2; i++) g.circle(x + i * 2.4 * k, y - 7.6 * k - (i % 2) * 0.8 * k, 1.4 * k).fill(shade(fill, 0.8));
}

// Un letrero de madera con un texto corto (sin texto: solo la tabla con una flecha).
function post(g, x, y, color = 0x8b5a2b) {
  g.rect(x - 1, y - 16, 2, 16).fill(0x5e3b1c);
  g.poly([x - 8, y - 20, x + 6, y - 20, x + 10, y - 16, x + 6, y - 12, x - 8, y - 12]).fill(color).stroke(OUTLINE);
}

// ---------- Lo común: dónde queda cada cosa del mapa ----------
function areaOf(zone, stationId) {
  if (zone.farm.stationId === stationId) return { ...zone.farm };
  const p = zone.plots.find((q) => q.stationId === stationId);
  return p ? { x: p.x, y: p.y, w: 3, h: 3 } : null;
}

// La carretera por donde llega un producto de otra zona (la de la ruta que lo trae).
function importRoad(zone, product) {
  for (const [id, r] of Object.entries(zone.routes ?? {})) if (ROUTE_PRODUCT[id] === product) return r.road;
  return null;
}
const ROUTE_PRODUCT = { panela_cacao: 'panela_powder', bocadillo: 'bocadillo_bijao', arroz: 'rice_bag', papitas: 'criollas_bag', aceite: 'oil_bottle' };

export class EventArt {
  // scene: la escena del tablero (para el mapa y sus objetos).
  constructor(scene, board) {
    this.scene = scene;
    this.zone = scene.zone;
    this.def = EVENTS_BY_ID[board.event.id];
    this.spec = ART[this.def.id];
    this.rng = createRng(this.zone.seed * 17 + 11);
    this.stage = -1;
    this.props = []; // lo dibujado de la etapa (se rehace al cambiar)
    this.movers = []; // lo que se mueve: mulas, carros…
    this.anims = []; // capas que se redibujan en cada cuadro
    this.hidden = [];
  }

  // Un dibujo fijo en el mapa, a la profundidad de (gx, gy).
  prop(gx, gy, draw, dz = 0.3) {
    const g = new Graphics();
    draw(g, iso(gx, gy));
    g.zIndex = depth(gx, gy) + dz;
    this.scene.objects.addChild(g);
    this.props.push(g);
    return g;
  }

  // Una capa que se redibuja en cada cuadro: fn(g, t, dt).
  anim(gx, gy, fn, dz = 0.4) {
    const g = new Graphics();
    g.zIndex = depth(gx, gy) + dz;
    this.scene.objects.addChild(g);
    this.anims.push({ g, fn });
    this.props.push(g);
    return g;
  }

  // Quita los árboles y piedras que quedan donde va el dibujo del evento.
  clear(gx, gy, r = 1.2) {
    for (const d of this.scene.terrain.decor) {
      if (!d.grid || !d.visible) continue;
      if (Math.hypot(d.grid[0] - gx, d.grid[1] - gy) < r) {
        d.visible = false;
        this.hidden.push(d);
      }
    }
  }

  update(dt, t, board) {
    if (!this.spec) return;
    const stage = this.def.actions.filter((a) => board.research.includes(a.id)).length;
    if (stage !== this.stage) {
      this.stage = stage;
      for (const p of this.props) p.destroy();
      for (const m of this.movers) m.view.destroy({ children: true });
      this.props = [];
      this.movers = [];
      this.anims = [];
      this.spec(this, stage, this.zone);
    }
    for (const a of this.anims) a.fn(a.g.clear(), t, dt);
    for (const m of this.movers) m.step(dt, t);
  }

  // Algo que va y viene por un camino (gx, gy): una mula, un carro…
  mover(view, path, speed, offset = 0) {
    this.scene.objects.addChild(view);
    let s = offset;
    const len = path.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);
    const m = {
      view,
      step: (dt, t) => {
        s = (s + (speed * dt) / len) % 2;
        const back = s > 1;
        const k = back ? 2 - s : s;
        const p = pointAt(path, k);
        view.zIndex = depth(p.gx, p.gy) + 0.2;
        if (view instanceof JeepView) view.place(p.gx, p.gy, back ? -p.dx : p.dx, back ? -p.dy : p.dy, back ? 0 : 0.8, false, t);
        else view.place(p.gx, p.gy, back ? -p.dx : p.dx, back ? -p.dy : p.dy, t);
        view.setLoaded?.(!back);
      },
    };
    this.movers.push(m);
    return m;
  }

  destroy() {
    for (const d of this.hidden) d.visible = true;
  }
}

// Bichos que caminan o vuelan sobre un área: n puntos que se mueven en círculos pequeños.
function swarm(art, area, n, draw, fly = false) {
  const pts = Array.from({ length: n }, () => ({ gx: area.x + 0.5 + art.rng() * (area.w - 1), gy: area.y + 0.5 + art.rng() * (area.h - 1), ph: art.rng() * 10, r: 0.15 + art.rng() * 0.3 }));
  art.anim(area.x + area.w, area.y + area.h, (g, t) => {
    for (const p of pts) {
      const a = t * (fly ? 4 : 1.3) + p.ph;
      const q = iso(p.gx + Math.cos(a) * p.r, p.gy + Math.sin(a * 1.3) * p.r, fly ? 14 + Math.sin(a * 3) * 4 : 6);
      draw(g, q.x, q.y, a);
    }
  });
}

// La broca: cucarroncito negro brillante, con sus patitas (dibujada grande para que se vea en el mapa).
const beetle = (g, x, y, a) => {
  const leg = Math.sin(a * 12) * 1.2;
  for (const s of [-1, 1]) for (const k of [-2, 0, 2]) g.moveTo(x + k, y).lineTo(x + k + leg * s, y + 3.4 * s).stroke({ width: 0.9, color: 0x1a1a1a });
  g.ellipse(x, y, 5, 3.4).fill(0x2b1d14).stroke({ width: 0.8, color: 0x000000 });
  g.ellipse(x - 1, y - 1.4, 2, 1).fill({ color: 0xffffff, alpha: 0.35 });
  g.circle(x + 4.4, y - 0.6, 2).fill(0x1a1a1a);
};
const fly = (g, x, y, a) => {
  g.ellipse(x, y, 3.2, 2.2).fill(0x5a4632).stroke({ width: 0.6, color: 0x2b1d14 });
  g.circle(x + 2.8, y - 0.6, 1.4).fill(0xb03020);
  const w = Math.sin(a * 9) * 3;
  g.ellipse(x - 2, y - 3.2 - w * 0.3, 3.2, 1.6).fill({ color: 0xffffff, alpha: 0.75 });
  g.ellipse(x + 2, y - 3.2 + w * 0.3, 3.2, 1.6).fill({ color: 0xffffff, alpha: 0.75 });
};


// Pájaro que vuela (los del arrozal): cuerpo oscuro y alas que aletean.
const bird = (g, x, y, a) => {
  const w = Math.sin(a * 10) * 3.5;
  g.moveTo(x - 6, y - 1 - w).quadraticCurveTo(x - 3, y - 3, x, y).quadraticCurveTo(x + 3, y - 3, x + 6, y - 1 - w).stroke({ width: 1.8, color: 0x2b1d14 });
  g.ellipse(x, y, 2.2, 1.4).fill(0x3a2a1a);
};

// Espantapájaros con sombrero vueltiao y los brazos abiertos.
function scarecrow(g, x, y) {
  g.rect(x - 1.2, y - 26, 2.4, 26).fill(0x5e3b1c);
  g.moveTo(x - 12, y - 20).lineTo(x + 12, y - 20).stroke({ width: 2, color: 0x5e3b1c });
  g.roundRect(x - 5, y - 24, 10, 12, 2).fill(0xd7263d).stroke(THIN);
  g.circle(x, y - 28, 3.6).fill(0xe8c66a).stroke(THIN);
  g.ellipse(x, y - 31, 8, 2.4).fill(0xefe3c2).stroke(THIN);
  g.ellipse(x, y - 31, 5.5, 1.6).stroke({ width: 1, color: 0x2b2b2b });
  g.moveTo(x - 3.5, y - 31).quadraticCurveTo(x, y - 38, x + 3.5, y - 31).closePath().fill(0xefe3c2).stroke(THIN);
}


// Mancha de la gota en una hoja de papa: hoja verde con la mancha café que crece.
const blight = (g, x, y, a) => {
  g.ellipse(x, y, 5, 3).fill(0x4e8f34).stroke({ width: 0.6, color: 0x2a4a1a });
  g.circle(x + 1, y, 1.8 + Math.sin(a) * 0.4).fill(0x5d4037);
  g.circle(x - 2, y - 0.5, 1).fill(0x3e2723);
};

// Una cometa de colores que se mece con el viento, con su cola.
function kite(g, x, y, t, k) {
  const sway = Math.sin(t * 1.3 + k) * 6;
  const cx = x + sway;
  const cy = y + Math.cos(t * 1.1 + k) * 3;
  const cols = [0xd7263d, 0xf2b705, 0x2e6fd1, 0x2fa36b, 0x8e44ad];
  g.poly([cx, cy - 9, cx + 7, cy, cx, cy + 10, cx - 7, cy]).fill(cols[k % cols.length]).stroke(THIN);
  g.moveTo(cx, cy - 9).lineTo(cx, cy + 10).moveTo(cx - 7, cy).lineTo(cx + 7, cy).stroke({ width: 0.6, color: 0x5e3b1c });
  g.moveTo(cx, cy + 10).quadraticCurveTo(cx + 6, cy + 18, cx - 2 + Math.sin(t * 3 + k) * 4, cy + 26).stroke({ width: 1, color: cols[(k + 2) % cols.length] });
}

// Gente esperando en fila (de a uno, en diagonal), n personas desde (gx, gy).
function queue(art, gx, gy, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const x = gx + i * 0.45;
    const y = gy + i * 0.15;
    const shirt = SHIRTS[(i * 3 + 1) % SHIRTS.length];
    art.clear(x, y, 0.8);
    art.prop(x, y, (g, p) => person(g, p.x, p.y, { shirt, skin: SKIN[i % SKIN.length], hat: o.hats ? (i % 2 ? true : 0xc8643b) : i % 3 === 0, pack: o.packs ? SHIRTS[(i + 2) % SHIRTS.length] : null }));
  }
}

// Fuego en un fogón, que se mueve; strong: con fuelle (más alto y más claro).
function fire(art, gx, gy, strong) {
  art.anim(gx, gy, (g, t) => {
    const p = iso(gx, gy);
    const h = (strong ? 22 : 9) + Math.sin(t * 9) * 3;
    const w = strong ? 8 : 5;
    g.poly([p.x - w, p.y, p.x - w / 2, p.y - h * 0.6, p.x, p.y - h, p.x + w / 2, p.y - h * 0.5, p.x + w, p.y]).fill(strong ? 0xff8c1a : 0xb5652b);
    g.poly([p.x - w / 2, p.y, p.x, p.y - h * 0.6, p.x + w / 2, p.y]).fill(strong ? 0xfff0a0 : 0xd98a50);
  });
}

// Humo que sube; gray: el del bagazo húmedo, espeso y gris.
function smoke(art, gx, gy, gray) {
  art.anim(gx, gy, (g, t) => {
    const p = iso(gx, gy, 10);
    for (let k = 0; k < 4; k++) {
      const f = (t * 0.4 + k / 4) % 1;
      g.circle(p.x + Math.sin(f * 6 + k) * 6, p.y - f * 60, (gray ? 10 : 5) + f * 10).fill({ color: gray ? 0x5f5f5f : 0xdddddd, alpha: (gray ? 0.7 : 0.35) * (1 - f) });
    }
  }, 0.9);
}

// ---------- Cada evento ----------
const ART = {
  // La broca: los cucarroncitos en el cafetal; trampas rojas en las esquinas, el hongo (nubecitas blancas)
  // y al final los canastos del re-re.
  broca(art, stage, zone) {
    const a = areaOf(zone, 'farm');
    if (stage < 3) swarm(art, a, [22, 13, 6][stage], beetle);
    if (stage >= 1) {
      for (const [gx, gy] of [[a.x + 0.4, a.y + a.h - 0.3], [a.x + a.w - 0.3, a.y + 0.4], [a.x + a.w - 0.3, a.y + a.h - 0.3]]) {
        art.prop(gx, gy, (g, p) => {
          g.rect(p.x - 1.4, p.y - 24, 2.8, 24).fill(0x5e3b1c);
          g.roundRect(p.x - 5.5, p.y - 38, 11, 16, 3).fill(0xd7263d).stroke(OUTLINE);
          g.rect(p.x - 2.2, p.y - 42, 4.4, 4.5).fill(0xf4efe6).stroke(THIN);
          g.ellipse(p.x, p.y - 26, 4, 1.4).fill({ color: 0xffffff, alpha: 0.5 });
        });
      }
    }
    if (stage === 2) {
      art.anim(a.x + a.w, a.y + a.h, (g, t) => {
        for (let k = 0; k < 6; k++) {
          const q = iso(a.x + 1 + ((k * 1.7) % (a.w - 1.5)), a.y + 1 + ((k * 2.3) % (a.h - 1.5)), 12 + Math.sin(t + k) * 2);
          g.circle(q.x, q.y, 9 + Math.sin(t * 2 + k) * 2.5).fill({ color: 0xffffff, alpha: 0.5 });
          g.circle(q.x + 5, q.y - 3, 6).fill({ color: 0xffffff, alpha: 0.4 });
        }
      });
    }
    if (stage >= 3) {
      // Los canastos del re-re, a la orilla del cafetal (abajo a la izquierda, donde no hay edificios).
      art.clear(a.x + 0.4, a.y + a.h + 0.6, 1.4);
      art.prop(a.x - 0.5, a.y + a.h - 1.2, (g, p) => basket(g, p.x, p.y, 0xd7263d));
      art.prop(a.x + 0.4, a.y + a.h + 0.6, (g, p) => {
        basket(g, p.x, p.y, 0x8b2a1a);
        person(g, p.x + 16, p.y + 3, { shirt: 0x2fa36b, hat: true, arm: 1 });
      });
    }
  },

  // La mosca de la fruta: lo mismo en el guayabal, con trampas amarillas, bolsitas y la fruta recogida.
  mosca(art, stage, zone) {
    const a = areaOf(zone, zone.farm.stationId);
    if (stage < 3) swarm(art, a, [22, 13, 6][stage], fly, true);
    if (stage < 3) {
      // Fruta caída y podrida en el suelo.
      art.prop(a.x + a.w, a.y + a.h, (g) => {
        for (let k = 0; k < 9; k++) {
          const q = iso(a.x + 0.7 + ((k * 2.1) % (a.w - 1)), a.y + 0.6 + ((k * 1.3) % (a.h - 1)));
          g.circle(q.x, q.y, 3.4).fill(0x8a6a2a).stroke(THIN);
        }
      }, -5);
    }
    if (stage >= 1) {
      for (const [gx, gy] of [[a.x + 0.4, a.y + a.h - 0.3], [a.x + a.w - 0.3, a.y + 0.4], [a.x + a.w - 0.3, a.y + a.h - 0.3]]) {
        art.prop(gx, gy, (g, p) => {
          g.rect(p.x - 1.4, p.y - 24, 2.8, 24).fill(0x5e3b1c);
          g.rect(p.x - 7, p.y - 40, 14, 16).fill(0xf2d22e).stroke(OUTLINE);
          for (const [dx, dy] of [[-3, -35], [2, -31], [-1, -28]]) g.circle(p.x + dx, p.y + dy, 1.2).fill(0x2b1d14);
        });
      }
    }
    if (stage >= 2) {
      art.prop(a.x + a.w, a.y + a.h, (g) => {
        for (let k = 0; k < 14; k++) {
          const q = iso(a.x + 0.8 + ((k * 1.9) % (a.w - 1.4)), a.y + 0.8 + ((k * 2.7) % (a.h - 1.4)), 16 + (k % 3) * 3);
          g.ellipse(q.x, q.y, 3.6, 4.6).fill(0xf4efe6).stroke(THIN);
        }
      }, 0.6);
    }
    if (stage >= 3) {
      art.clear(a.x + 0.4, a.y + a.h + 0.6, 1.4);
      art.prop(a.x - 0.5, a.y + a.h - 1.2, (g, p) => basket(g, p.x, p.y, 0xe9d36a));
      art.prop(a.x + 0.4, a.y + a.h + 0.6, (g, p) => {
        basket(g, p.x, p.y, 0xf08a8a);
        person(g, p.x + 16, p.y + 3, { shirt: 0xd7263d, skirt: 0x2e6fd1, arm: 1 });
      });
    }
  },

  // La gran molienda: el bagazo mojado humea gris y el fuego es flojo; la bagacera (un techito con el
  // bagazo secándose), ladrillos nuevos y el fuelle, con buen fuego.
  molienda(art, stage, zone) {
    const a = areaOf(zone, 'furnace');
    const fx = a.x + a.w + 0.3;
    const fy = a.y + 1.2;
    art.clear(fx, fy, 1.6);
    art.clear(a.x + 1, a.y + a.h + 0.6, 1.4);
    if (stage === 0) {
      art.prop(fx, fy + 1, (g, p) => {
        g.ellipse(p.x, p.y, 26, 9).fill({ color: 0x5a7a9a, alpha: 0.5 });
        g.ellipse(p.x, p.y - 6, 20, 10).fill(0x6b6a3a).stroke(OUTLINE);
        g.ellipse(p.x - 5, p.y - 11, 10, 5).fill(0x7d7c48);
        for (const dx of [-12, 2, 14]) g.ellipse(p.x + dx, p.y + 3, 1.4, 2.6).fill(0x5a8ac0);
      });
    }
    fire(art, fx, fy, stage >= 3);
    smoke(art, fx, fy, stage < 2);
    if (stage >= 1) {
      art.prop(a.x + 1, a.y + a.h + 0.6, (g, p) => {
        for (const dx of [-14, 14]) g.rect(p.x + dx - 1, p.y - 22, 2, 22).fill(0x5e3b1c);
        g.poly([p.x - 20, p.y - 22, p.x + 20, p.y - 22, p.x + 16, p.y - 30, p.x - 16, p.y - 30]).fill(0xb5512e).stroke(OUTLINE);
        for (let k = -2; k <= 2; k++) g.ellipse(p.x + k * 6, p.y - 4, 4, 3).fill(0xe8c66a).stroke(THIN);
      });
    }
    if (stage >= 2) {
      art.prop(fx - 0.6, fy - 0.6, (g, p) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.rect(p.x - 12 + c * 6 + (r % 2) * 3, p.y - 6 - r * 4, 5.5, 3.5).fill(0xc65a3a).stroke({ width: 0.6, color: 0x7a3020 });
      }, -0.2);
    }
    if (stage >= 3) {
      art.anim(fx + 0.6, fy + 0.4, (g, t) => {
        const p = iso(fx + 0.6, fy + 0.4);
        const squeeze = 1 + Math.sin(t * 5) * 0.25;
        g.poly([p.x - 8, p.y - 4, p.x + 2, p.y - 4 - 5 * squeeze, p.x + 2, p.y - 4 + 5 * squeeze]).fill(0x8b5a2b).stroke(OUTLINE);
        g.rect(p.x + 2, p.y - 5, 6, 2).fill(0x555555);
      });
    }
  },

  // Fiesta del maíz: el budare rajado y la fila de gente con hambre; el budare prestado, leña seca y las
  // vecinas volteando arepas.
  fiesta(art, stage, zone) {
    const a = areaOf(zone, 'budare');
    const bx = a.x + a.w + 0.4;
    const by = a.y + 0.6;
    art.clear(bx, by, 1.6);
    art.prop(bx, by, (g, p) => {
      g.ellipse(p.x, p.y - 4, 11, 5).fill(0x2b2b2b).stroke(OUTLINE);
      g.moveTo(p.x - 8, p.y - 6).lineTo(p.x - 2, p.y - 3).lineTo(p.x + 1, p.y - 7).lineTo(p.x + 8, p.y - 2).stroke({ width: 1.4, color: 0xf4efe6 });
    });
    queue(art, a.x + 0.3, a.y + a.h + 0.6, [5, 4, 2, 1][stage]);
    if (stage >= 1) {
      art.prop(bx + 0.6, by + 1.2, (g, p) => {
        g.ellipse(p.x, p.y - 4, 11, 5).fill(0x3a3a3a).stroke(OUTLINE);
        for (const [dx, dy] of [[-4, -5], [3, -3], [0, -6]]) g.ellipse(p.x + dx, p.y + dy, 3, 1.6).fill(0xf2d48a).stroke(THIN);
      });
    }
    if (stage >= 2) {
      art.prop(bx + 1.4, by - 0.4, (g, p) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) g.roundRect(p.x - 10 + c * 7 + r * 3.5, p.y - 4 - r * 4, 7, 4, 2).fill(0x8b5a2b).stroke(THIN);
      });
    }
    if (stage >= 3) {
      art.anim(bx + 1.2, by + 1.8, (g, t) => {
        const p = iso(bx + 1.2, by + 1.8);
        person(g, p.x, p.y, { shirt: 0x8e44ad, skirt: 0xd7263d, skin: SKIN[1], arm: Math.max(0, Math.sin(t * 4)) });
        person(g, p.x + 14, p.y - 4, { shirt: 0x2fa36b, skirt: 0xe8b90f, skin: SKIN[2], arm: Math.max(0, Math.sin(t * 4 + 2)) });
      });
    }
  },

  // El barco: la grúa varada y torcida con su aviso; los repuestos, la grúa derecha subiendo contenedores
  // y el turno extra con sus estibadores.
  barco(art, stage, zone) {
    const a = areaOf(zone, 'export_dock');
    const cx = a.x + a.w + 0.6;
    const cy = a.y + 0.8;
    art.clear(cx, cy, 1.8);
    const fixed = stage >= 2;
    art.anim(cx, cy, (g, t) => {
      const p = iso(cx, cy);
      const lean = fixed ? 0 : 0.35;
      g.rect(p.x - 3, p.y - 46, 6, 46).fill(0xf2b705).stroke(OUTLINE);
      for (let k = 0; k < 6; k++) g.moveTo(p.x - 3, p.y - k * 8).lineTo(p.x + 3, p.y - k * 8 - 8).stroke({ width: 0.8, color: 0x8a6a00 });
      const ex = p.x + Math.cos(-0.2 - lean) * 34;
      const ey = p.y - 46 + Math.sin(lean) * 26;
      g.moveTo(p.x, p.y - 46).lineTo(ex, ey).stroke({ width: 4, color: 0xf2b705 });
      const drop = fixed ? 14 + Math.sin(t * 1.2) * 10 : 6;
      g.moveTo(ex, ey).lineTo(ex, ey + drop).stroke({ width: 1, color: 0x333333 });
      if (fixed) g.rect(ex - 7, ey + drop, 14, 8).fill(0x2e6fd1).stroke(OUTLINE);
      if (!fixed) {
        g.poly([p.x + 10, p.y - 8, p.x + 18, p.y - 22, p.x + 26, p.y - 8]).fill(0xf2d22e).stroke(OUTLINE);
        g.rect(p.x + 17.2, p.y - 18, 1.6, 6).fill(0x1a1a1a);
        g.circle(p.x + 18, p.y - 10.5, 0.9).fill(0x1a1a1a);
      }
    });
    if (stage >= 1) {
      art.prop(cx - 0.6, cy + 1.4, (g, p) => {
        box(g, -0.35, -0.3, 0.7, 0.6, 10, 0xa0703a, { z: 0 });
        g.position.set(p.x, p.y);
        g.moveTo(-4, -14).lineTo(5, -18).stroke({ width: 2, color: 0x888888 });
      });
    }
    if (stage >= 3) {
      art.anim(cx + 0.8, cy + 1.6, (g, t) => {
        const p = iso(cx + 0.8, cy + 1.6);
        for (let k = 0; k < 3; k++) person(g, p.x + k * 11, p.y + k * 3, { shirt: 0xf07f1d, hat: 'helmet', arm: Math.max(0, Math.sin(t * 3 + k)) });
      });
    }
  },

  // Humedad en el caney: llueve encima y hay neblina; ventilas (el aire que entra), fogones de secado
  // y el techo nuevo (ya no gotea).
  humedad(art, stage, zone) {
    const a = areaOf(zone, 'caney');
    const c = { gx: a.x + 1.5, gy: a.y + 1.5 };
    if (stage < 3) {
      art.anim(a.x + a.w, a.y + a.h, (g, t) => {
        const n = [40, 26, 12][stage];
        for (let k = 0; k < n; k++) {
          const f = (t * 1.6 + k * 0.137) % 1;
          const q = iso(a.x - 0.5 + ((k * 0.61) % 1) * (a.w + 1), a.y - 0.5 + ((k * 0.37) % 1) * (a.h + 1), 70 - f * 70);
          g.moveTo(q.x, q.y).lineTo(q.x - 2, q.y + 9).stroke({ width: 1.6, color: 0x3f7fc0, alpha: 0.85 });
        }
        const m = iso(c.gx, c.gy, 18);
        g.ellipse(m.x, m.y, 60, 20).fill({ color: 0xffffff, alpha: [0.45, 0.32, 0.15][stage] });
        // La nube gris de la que llueve, encima del caney.
        const cl = iso(c.gx, c.gy, 80);
        const dark = [0x6b7380, 0x8a929e, 0xa9b0ba][stage];
        for (const [dx, dy, r] of [[-26, 4, 16], [-8, -4, 20], [12, 0, 18], [28, 6, 13]]) g.circle(cl.x + dx + Math.sin(t * 0.3) * 3, cl.y + dy, r).fill(dark);
      }, 1);
    }
    if (stage >= 1 && stage < 3) {
      art.anim(c.gx, c.gy, (g, t) => {
        for (let k = 0; k < 3; k++) {
          const f = (t * 0.8 + k / 3) % 1;
          const q = iso(a.x - 0.4 + f * (a.w + 0.8), a.y + 0.6 + k, 16);
          g.moveTo(q.x - 8, q.y).quadraticCurveTo(q.x, q.y - 4, q.x + 8, q.y).stroke({ width: 1.4, color: 0xffffff, alpha: 0.8 * (1 - f) });
        }
      }, 1);
    }
    if (stage >= 2) {
      for (const [gx, gy] of [[a.x - 0.4, a.y + a.h - 0.4], [a.x + a.w + 0.2, a.y + 0.4]]) {
        art.clear(gx, gy, 0.9);
        art.prop(gx, gy, (g, p) => {
          for (let k = 0; k < 4; k++) g.ellipse(p.x + (k - 1.5) * 3, p.y - 1, 2.4, 1.6).fill(0x777777).stroke(THIN);
        });
        fire(art, gx, gy, false);
        smoke(art, gx, gy, false);
      }
    }
    if (stage >= 3) {
      art.prop(a.x + a.w + 0.4, a.y + a.h + 0.4, (g, p) => {
        post(g, p.x, p.y, 0xc0c4c8);
        g.circle(p.x + 10, p.y - 26, 2).fill(0xffffff);
      });
    }
  },

  // Temporada de turistas: la fila de turistas frente a la mesa de cucuruchos, y cómo se acorta con el
  // papel prestado, la resma y las vecinas.
  turistas(art, stage, zone) {
    const a = areaOf(zone, 'cone_table');
    queue(art, a.x + 0.2, a.y + a.h + 0.6, [7, 5, 3, 1][stage], { hats: true, packs: true });
    const sx = a.x + a.w + 0.4;
    const sy = a.y + 0.6;
    art.clear(sx, sy, 1.4);
    if (stage >= 1) {
      art.prop(sx, sy, (g, p) => {
        for (let k = 0; k < 4; k++) g.rect(p.x - 7, p.y - 3 - k * 2, 14, 2).fill(k % 2 ? 0xf4efe6 : 0xe6dcc4).stroke({ width: 0.5, color: 0x9a8a6a });
      });
    }
    if (stage >= 2) {
      art.prop(sx + 0.8, sy + 0.8, (g, p) => {
        g.position.set(p.x, p.y);
        box(g, -0.3, -0.3, 0.6, 0.6, 12, 0xc8a26a);
      });
    }
    if (stage >= 3) {
      art.anim(sx + 0.4, sy + 1.8, (g, t) => {
        const p = iso(sx + 0.4, sy + 1.8);
        person(g, p.x, p.y, { shirt: 0x8e44ad, skirt: 0x2fa36b, arm: Math.max(0, Math.sin(t * 5)) });
        person(g, p.x + 13, p.y - 3, { shirt: 0xd7263d, skirt: 0xf2b705, skin: SKIN[3], arm: Math.max(0, Math.sin(t * 5 + 1.5)) });
      });
    }
  },

  // Puente festivo: la multitud de caminantes esperando para salir al Camino Real; los guías de Guane
  // con su banderita, los letreros por el camino y los guías del pueblo.
  puente_festivo(art, stage, zone) {
    const a = areaOf(zone, 'camino_real');
    queue(art, a.x - 0.4, a.y + a.h + 0.5, [8, 6, 4, 2][stage], { hats: true, packs: true });
    const guides = stage >= 3 ? 4 : stage >= 1 ? 2 : 0;
    if (guides) {
      art.anim(a.x + a.w + 0.4, a.y + 1, (g, t) => {
        for (let k = 0; k < guides; k++) {
          const p = iso(a.x + a.w + 0.4 + (k % 2) * 0.7, a.y + 0.6 + Math.floor(k / 2) * 0.9);
          person(g, p.x, p.y, { shirt: 0x2fa36b, hat: 0xc8643b, arm: 1 });
          const wave = Math.sin(t * 4 + k) * 2;
          g.moveTo(p.x + 5.5, p.y - 16).lineTo(p.x + 5.5, p.y - 30).stroke({ width: 1, color: 0x5e3b1c });
          g.poly([p.x + 5.5, p.y - 30, p.x + 14, p.y - 27 + wave, p.x + 5.5, p.y - 24]).fill(0xf2b705).stroke(THIN);
        }
      });
    }
    if (stage >= 2) {
      for (const [gx, gy] of [[a.x + a.w + 1.6, a.y + 2.6], [a.x + a.w + 2.6, a.y + 3.6]]) {
        art.clear(gx, gy, 0.8);
        art.prop(gx, gy, (g, p) => post(g, p.x, p.y, 0x8b5a2b));
      }
    }
  },

  // Derrumbe en la vía: la tierra y las piedras tapan la carretera de la panela. Primero pasan mulas por
  // el monte, luego un carro por una trocha y al final la vía queda despejada y pavimentada.
  derrumbe(art, stage, zone) {
    landslideScene(art, stage, zone, 'panela_powder', 'derrumbe');
  },

  // Creciente del río: el río crecido se llevó el puente; mulas por el vado, el planchón y el puente nuevo.
  creciente(art, stage, zone) {
    landslideScene(art, stage, zone, 'bocadillo_bijao', 'creciente');
  },

  // Feria ganadera y feria artesanal: no hay nada dañado; se arman puestos de feria con banderines, uno
  // por cada compra, y llega gente.
  feria(art, stage, zone) {
    fairScene(art, stage, [0xf4efe6, 0xf2d22e, 0xc8641e]);
  },
  artesanal(art, stage, zone) {
    fairScene(art, stage, [0xd9c08c, 0x2e4fa8, 0xb0905a]);
  },

  // --- La Costa (v3.21) ---

  // Pájaros en el arrozal: las bandadas sobre el agua; espantapájaros con vueltiao, cintas plateadas que
  // brillan con el viento y al final los pajareros aplaudiendo por los camellones.
  pajaros(art, stage, zone) {
    const a = areaOf(zone, zone.farm.stationId);
    if (stage < 3) swarm(art, a, [24, 14, 7][stage], bird, true);
    if (stage >= 1) {
      for (const [gx, gy] of [[a.x + 0.4, a.y + a.h - 0.3], [a.x + a.w - 0.3, a.y + 0.4], [a.x + a.w - 0.3, a.y + a.h - 0.3]]) {
        art.prop(gx, gy, (g, p) => scarecrow(g, p.x, p.y));
      }
    }
    if (stage >= 2) {
      art.anim(a.x + a.w, a.y + a.h, (g, t) => {
        for (let r = 0; r < 3; r++) {
          const y0 = a.y + 1.5 + r * 1.6;
          const p0 = iso(a.x + 0.4, y0, 14);
          const p1 = iso(a.x + a.w - 0.4, y0, 14);
          g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ width: 0.8, color: 0x5e3b1c });
          for (let k = 1; k < 9; k++) {
            const x = p0.x + ((p1.x - p0.x) * k) / 9;
            const y = p0.y + ((p1.y - p0.y) * k) / 9;
            const wave = Math.sin(t * 6 + k + r) * 3;
            g.poly([x, y, x + 5 + wave, y + 3, x + 1, y + 7]).fill(k % 2 ? 0xdfe6ea : 0xffffff);
          }
        }
      }, 0.6);
    }
    if (stage >= 3) {
      art.clear(a.x + 0.4, a.y + a.h + 0.6, 1.4);
      art.anim(a.x + 0.4, a.y + a.h + 0.6, (g, t) => {
        for (let k = 0; k < 2; k++) {
          const p = iso(a.x + 0.4 + k * 1.4 + Math.sin(t * 0.6 + k) * 0.3, a.y + a.h + 0.6);
          person(g, p.x, p.y, { shirt: k ? 0xf2b705 : 0x2e6fd1, hat: 0xefe3c2, s: 1.15, arm: Math.abs(Math.sin(t * 6 + k)) });
        }
      });
    }
  },

  // Machetes sin filo: el montón de cocos sin pelar junto al Peladero (se achica con cada compra), la
  // piedra de amolar echando chispas, los machetes nuevos colgados y la peladora.
  machetes(art, stage, zone) {
    const a = areaOf(zone, 'coconut_peeler');
    const px = a.x + a.w + 0.5;
    const py = a.y + 0.8;
    art.clear(px, py, 1.6);
    const n = [16, 10, 6, 2][stage];
    art.prop(px, py, (g, p) => {
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 5);
        g.circle(p.x + ((i % 5) - 2) * 7 + row * 3, p.y - row * 5, 4.4).fill(0x7cb342).stroke(THIN);
      }
    });
    if (stage >= 1) {
      art.clear(px, py + 1.4, 1);
      art.anim(px, py + 1.4, (g, t) => {
        const p = iso(px, py + 1.4);
        g.rect(p.x - 6, p.y - 8, 12, 8).fill(0x5e3b1c);
        g.circle(p.x, p.y - 12, 6).fill(0x9a948a).stroke(OUTLINE);
        g.moveTo(p.x - 6 + Math.sin(t * 9) * 2, p.y - 12).lineTo(p.x + 6, p.y - 14).stroke({ width: 1.6, color: 0xb0bec5 });
        for (let k = 0; k < 3; k++) {
          const f = (t * 2 + k / 3) % 1;
          g.circle(p.x + 6 + f * 10, p.y - 14 - Math.sin(f * Math.PI) * 6, 0.9).fill(0xffd54f);
        }
        person(g, p.x - 12, p.y + 2, { shirt: 0x2fa36b, hat: 0xefe3c2, s: 1.1, arm: 0.4 });
      });
    }
    if (stage >= 2) {
      art.prop(px + 1.2, py + 0.2, (g, p) => {
        for (const dx of [-8, 8]) g.rect(p.x + dx - 1, p.y - 20, 2, 20).fill(0x5e3b1c);
        g.moveTo(p.x - 9, p.y - 18).lineTo(p.x + 9, p.y - 18).stroke({ width: 1.6, color: 0x8b5a2b });
        for (let k = 0; k < 4; k++) g.poly([p.x - 6 + k * 4, p.y - 18, p.x - 4.5 + k * 4, p.y - 18, p.x - 4 + k * 4, p.y - 6, p.x - 6 + k * 4, p.y - 8]).fill(0xb0bec5).stroke(THIN);
      });
    }
    if (stage >= 3) {
      art.anim(px + 1.3, py + 1.5, (g, t) => {
        const p = iso(px + 1.3, py + 1.5);
        g.rect(p.x - 9, p.y - 14, 18, 14).fill(0x6c757d).stroke(OUTLINE);
        g.circle(p.x, p.y - 18, 5).fill(0x9aa3a8).stroke(OUTLINE);
        g.moveTo(p.x, p.y - 18).lineTo(p.x + Math.cos(t * 8) * 5, p.y - 18 + Math.sin(t * 8) * 5).stroke({ width: 1.4, color: 0x263238 });
        g.ellipse(p.x + 12, p.y - 2, 4, 2).fill(0x9ccc65);
      });
    }
  },

  // Semana Santa: puestos de pescado con toldos morados, blancos y dorados, uno por compra, y la gente.
  semana_santa(art, stage) {
    fairScene(art, stage, [0x6a1b9a, 0xf4efe6, 0xc9a227]);
  },

  // Carretera inundada: el agua cruza la carretera del arroz; canoas, la chalupa y el terraplén nuevo.
  inundacion(art, stage, zone) {
    landslideScene(art, stage, zone, 'rice_bag', 'creciente');
  },

  // Festival del sombrero: la fila de visitantes frente a la Costura; la máquina prestada, la caja de
  // repuestos y las costureras.
  festival_sombrero(art, stage, zone) {
    const a = areaOf(zone, 'hat_sewer');
    queue(art, a.x + 0.2, a.y + a.h + 0.6, [7, 5, 3, 1][stage], { hats: true, packs: true });
    const sx = a.x + a.w + 0.4;
    const sy = a.y + 0.6;
    art.clear(sx, sy, 1.4);
    if (stage >= 1) {
      art.prop(sx, sy, (g, p) => {
        g.rect(p.x - 8, p.y - 8, 16, 8).fill(0x8b5a2b).stroke(THIN);
        g.roundRect(p.x - 6, p.y - 15, 12, 6, 2).fill(0x263238).stroke(OUTLINE);
        g.rect(p.x + 3, p.y - 15, 2.5, 7).fill(0x263238);
      });
    }
    if (stage >= 2) {
      art.prop(sx + 0.8, sy + 0.8, (g, p) => {
        g.position.set(p.x, p.y);
        box(g, -0.3, -0.3, 0.6, 0.6, 10, 0xc8a26a);
      });
    }
    if (stage >= 3) {
      art.anim(sx + 0.4, sy + 1.8, (g, t) => {
        const p = iso(sx + 0.4, sy + 1.8);
        person(g, p.x, p.y, { shirt: 0x8e44ad, skirt: 0x2fa36b, skin: SKIN[1], arm: Math.max(0, Math.sin(t * 5)) });
        person(g, p.x + 13, p.y - 3, { shirt: 0xd7263d, skirt: 0xf2b705, skin: SKIN[3], arm: Math.max(0, Math.sin(t * 5 + 1.5)) });
      });
    }
  },

  // Llegó un crucero: la fila de turistas en el muelle; los lancheros de Bocachica con sus gorras, los
  // letreros de turnos y más lancheros.
  // --- Boyacá (v3.28) ---

  // La gota en el papal: las hojas manchadas por todo el cultivo; el que fumiga con la bomba de espalda, las
  // matas aporcadas y al final los canastos de papa sana.
  gota(art, stage, zone) {
    const a = areaOf(zone, zone.farm.stationId);
    if (stage < 3) swarm(art, a, [26, 15, 7][stage], blight);
    if (stage >= 1) {
      art.anim(a.x + a.w, a.y + a.h, (g, t) => {
        const f = (Math.sin(t * 0.4) + 1) / 2;
        const p = iso(a.x + 1 + f * (a.w - 2), a.y + a.h - 0.8);
        person(g, p.x, p.y, { shirt: 0x2fa36b, hat: true, pack: 0x2e6fd1, arm: 0.6 });
        for (let k = 0; k < 4; k++) {
          const q = (t * 2 + k / 4) % 1;
          g.circle(p.x + 10 + q * 10, p.y - 10 + q * 6, 2 + q * 3).fill({ color: 0x81d4fa, alpha: 0.5 * (1 - q) });
        }
      }, 0.6);
    }
    if (stage >= 2) {
      art.prop(a.x + a.w, a.y + a.h, (g) => {
        for (let r = 0; r < a.h - 1; r++) {
          const p0 = iso(a.x + 0.4, a.y + 0.9 + r);
          const p1 = iso(a.x + a.w - 0.4, a.y + 0.9 + r);
          g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ width: 4, color: 0x3a291d, alpha: 0.6 });
        }
      }, -5);
    }
    if (stage >= 3) {
      art.clear(a.x + 0.4, a.y + a.h + 0.6, 1.4);
      art.prop(a.x - 0.5, a.y + a.h - 1.2, (g, p) => basket(g, p.x, p.y, 0xc9a066));
      art.prop(a.x + 0.4, a.y + a.h + 0.6, (g, p) => {
        basket(g, p.x, p.y, 0xd4a960);
        person(g, p.x + 16, p.y + 3, { shirt: 0x6d4c41, hat: true, arm: 1 });
      });
    }
  },

  // Horno de malta dañado: los costales de cebada germinada que se amontonan junto a la Maltería (menos con
  // cada compra), los ladrillos nuevos, el ventilador que gira y el quemador encendido.
  horno_malta(art, stage, zone) {
    const a = areaOf(zone, 'maltings');
    const px = a.x + a.w + 0.5;
    const py = a.y + 0.8;
    art.clear(px, py, 1.6);
    const n = [12, 8, 5, 2][stage];
    art.prop(px, py, (g, p) => {
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 4);
        const x = p.x + ((i % 4) - 1.5) * 9 + row * 4;
        const y = p.y - row * 6;
        g.ellipse(x, y - 4, 6, 5).fill(0xe8d9a8).stroke(THIN);
        g.ellipse(x, y - 8, 3, 1.3).fill(0xa0612d);
      }
    });
    if (stage >= 1) {
      art.clear(px, py + 1.4, 1);
      art.prop(px, py + 1.4, (g, p) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) g.rect(p.x - 12 + c * 6 + r * 3, p.y - 4 - r * 4, 5.5, 3.5).fill(0xc65a3a).stroke({ width: 0.6, color: 0x7a3020 });
      });
    }
    if (stage >= 2) {
      art.anim(px + 1.2, py + 0.2, (g, t) => {
        const p = iso(px + 1.2, py + 0.2);
        g.rect(p.x - 1, p.y - 16, 2, 16).fill(0x555555);
        g.circle(p.x, p.y - 20, 7).stroke({ width: 1.2, color: 0x607d8b });
        for (let k = 0; k < 3; k++) {
          const b = t * 9 + (k * Math.PI * 2) / 3;
          g.moveTo(p.x, p.y - 20).lineTo(p.x + Math.cos(b) * 6, p.y - 20 + Math.sin(b) * 6).stroke({ width: 2.4, color: 0x9aa3a8 });
        }
      });
    }
    if (stage >= 3) fire(art, px + 1.3, py + 1.5, true);
  },

  // Mercado de artesanías: puestos con toldos de tierra, ocre y verde, uno por compra, y la gente.
  mercado_artesanias(art, stage) {
    fairScene(art, stage, [0xb5653a, 0xd9a330, 0x2f7d4f]);
  },

  // Carretera en obras: la vía de las papitas cerrada con conos; mulas por la trocha, el carro por un carril
  // y al final la vía nueva pavimentada.
  obras(art, stage, zone) {
    landslideScene(art, stage, zone, 'criollas_bag', 'derrumbe');
  },

  // Las heladas de diciembre: la fila de gente con frío frente al Telar; el telar prestado, la caja de las
  // lanzaderas y las tejedoras; escarcha blanca en el pasto.
  heladas(art, stage, zone) {
    const a = areaOf(zone, 'ruana_loom');
    queue(art, a.x + 0.2, a.y + a.h + 0.6, [7, 5, 3, 1][stage], { hats: true, packs: true });
    if (stage < 3) {
      art.prop(a.x + a.w, a.y + a.h, (g) => {
        for (let k = 0; k < 24; k++) {
          const q = iso(a.x - 1 + ((k * 1.37) % (a.w + 3)), a.y - 1 + ((k * 2.11) % (a.h + 3)));
          g.ellipse(q.x, q.y, 6, 2.4).fill({ color: 0xffffff, alpha: [0.75, 0.55, 0.35][stage] });
        }
      }, -5);
    }
    const sx = a.x + a.w + 0.4;
    const sy = a.y + 0.6;
    art.clear(sx, sy, 1.4);
    if (stage >= 1) {
      art.prop(sx, sy, (g, p) => {
        for (const dx of [-8, 8]) g.rect(p.x + dx - 1, p.y - 18, 2, 18).fill(0x5e3b1c);
        g.moveTo(p.x - 8, p.y - 17).lineTo(p.x + 8, p.y - 17).stroke({ width: 2, color: 0x8b5a2b });
        g.rect(p.x - 7, p.y - 15, 14, 9).fill(0x6d4c41);
        g.moveTo(p.x - 7, p.y - 11).lineTo(p.x + 7, p.y - 11).stroke({ width: 1, color: 0xece4cf });
      });
    }
    if (stage >= 2) {
      art.prop(sx + 0.8, sy + 0.8, (g, p) => {
        g.position.set(p.x, p.y);
        box(g, -0.3, -0.3, 0.6, 0.6, 10, 0xc8a26a);
      });
    }
    if (stage >= 3) {
      art.anim(sx + 0.4, sy + 1.8, (g, t) => {
        const p = iso(sx + 0.4, sy + 1.8);
        person(g, p.x, p.y, { shirt: 0x6d4c41, skirt: 0x37474f, skin: SKIN[2], arm: Math.max(0, Math.sin(t * 5)) });
        person(g, p.x + 13, p.y - 3, { shirt: 0x8d6e63, skirt: 0x2e4fa8, skin: SKIN[0], arm: Math.max(0, Math.sin(t * 5 + 1.5)) });
      });
    }
  },

  // Festival de las cometas: la fila de visitantes en la Salida al Fósil, cometas de colores en el cielo,
  // los guías de Sáchica con sus banderitas, los letreros y los jóvenes del pueblo.
  cometas(art, stage, zone) {
    const a = areaOf(zone, 'salida_fosil');
    queue(art, a.x - 0.4, a.y + a.h + 0.5, [8, 6, 4, 2][stage], { hats: true, packs: true });
    art.anim(a.x + 1, a.y - 2, (g, t) => {
      for (let k = 0; k < 6; k++) {
        const base = iso(a.x - 3 + k * 1.6, a.y - 1 + (k % 2) * 1.5, 80 + (k % 3) * 18);
        kite(g, base.x, base.y, t, k);
      }
    }, 2);
    const guides = stage >= 3 ? 4 : stage >= 1 ? 2 : 0;
    if (guides) {
      art.anim(a.x + a.w + 0.4, a.y + 1, (g, t) => {
        for (let k = 0; k < guides; k++) {
          const p = iso(a.x + a.w + 0.4 + (k % 2) * 0.7, a.y + 0.6 + Math.floor(k / 2) * 0.9);
          person(g, p.x, p.y, { shirt: 0x6d4c41, hat: 0x3e2723, arm: 1 });
          const wave = Math.sin(t * 4 + k) * 2;
          g.moveTo(p.x + 5.5, p.y - 16).lineTo(p.x + 5.5, p.y - 30).stroke({ width: 1, color: 0x5e3b1c });
          g.poly([p.x + 5.5, p.y - 30, p.x + 14, p.y - 27 + wave, p.x + 5.5, p.y - 24]).fill(0x2f7d4f).stroke(THIN);
        }
      });
    }
    if (stage >= 2) {
      for (const [gx, gy] of [[a.x + a.w + 1.6, a.y + 2.6], [a.x + a.w + 2.6, a.y + 3.6]]) {
        art.clear(gx, gy, 0.8);
        art.prop(gx, gy, (g, p) => post(g, p.x, p.y, 0x8b5a2b));
      }
    }
  },

  // --- Los Llanos (v3.37) ---

  // Pudrición del cogollo: las palmas con manchas pardas (menos con cada compra); el que corta lo podrido con
  // el hacha, las zanjas de drenaje y, al final, las palmitas híbridas recién sembradas.
  pudricion(art, stage, zone) {
    const a = areaOf(zone, zone.farm.stationId);
    if (stage < 3) swarm(art, a, [26, 15, 7][stage], blight);
    if (stage >= 1) {
      art.anim(a.x + a.w, a.y + a.h, (g, t) => {
        const f = (Math.sin(t * 0.4) + 1) / 2;
        const p = iso(a.x + 1 + f * (a.w - 2), a.y + a.h - 0.8);
        person(g, p.x, p.y, { shirt: 0xf4c430, hat: true, arm: Math.abs(Math.sin(t * 4)) });
        g.moveTo(p.x + 5, p.y - 15).lineTo(p.x + 11, p.y - 20 + Math.sin(t * 4) * 3).stroke({ width: 1.6, color: 0x8a8f94 });
      }, 0.6);
    }
    if (stage >= 2) {
      art.prop(a.x + a.w, a.y + a.h, (g) => {
        for (let r = 1; r < a.h; r += 2) {
          const p0 = iso(a.x + 0.3, a.y + r);
          const p1 = iso(a.x + a.w - 0.3, a.y + r);
          g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ width: 3, color: 0x4f8f9a, alpha: 0.7 });
        }
      }, -5);
    }
    if (stage >= 3) {
      art.clear(a.x + 0.4, a.y + a.h + 0.6, 1.4);
      art.prop(a.x + 0.4, a.y + a.h + 0.6, (g, p) => {
        for (const dx of [-12, 0, 12]) {
          g.moveTo(p.x + dx, p.y).lineTo(p.x + dx, p.y - 8).stroke({ width: 1.6, color: 0x6d4c32 });
          for (const a2 of [-2.4, -1.6, -0.8]) g.moveTo(p.x + dx, p.y - 8).lineTo(p.x + dx + Math.cos(a2) * 8, p.y - 8 + Math.sin(a2) * 6).stroke({ width: 2, color: 0x4a8a30 });
        }
        person(g, p.x + 22, p.y + 3, { shirt: 0x2fa36b, hat: true, arm: 1 });
      });
    }
  },

  // Despulpadora varada: las canastas de maracuyá que se amontonan junto a la Despulpadora (menos con cada
  // compra), las aspas nuevas, el motor que zumba y el tamiz.
  despulpadora(art, stage, zone) {
    const a = areaOf(zone, 'passion_pulper');
    const px = a.x + a.w + 0.5;
    const py = a.y + 0.8;
    art.clear(px, py, 1.6);
    const n = [12, 8, 5, 2][stage];
    art.prop(px, py, (g, p) => {
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 4);
        const x = p.x + ((i % 4) - 1.5) * 10 + row * 4;
        const y = p.y - row * 7;
        basket(g, x, y, 0xf4c430, 1);
      }
    });
    if (stage >= 1) {
      art.clear(px, py + 1.4, 1);
      art.prop(px, py + 1.4, (g, p) => {
        for (let k = 0; k < 3; k++) g.poly([p.x - 10 + k * 8, p.y - 2, p.x - 4 + k * 8, p.y - 8, p.x - 2 + k * 8, p.y - 2]).fill(0xcfd8dc).stroke(THIN);
      });
    }
    if (stage >= 2) {
      art.anim(px + 1.2, py + 0.2, (g, t) => {
        const p = iso(px + 1.2, py + 0.2);
        g.rect(p.x - 7, p.y - 12, 14, 12).fill(0x607d8b).stroke(OUTLINE);
        g.circle(p.x, p.y - 6, 4).fill(0x37474f);
        const b = t * 12;
        g.moveTo(p.x, p.y - 6).lineTo(p.x + Math.cos(b) * 3.5, p.y - 6 + Math.sin(b) * 3.5).stroke({ width: 1.4, color: 0xcfd8dc });
      });
    }
    if (stage >= 3) {
      art.prop(px + 1.3, py + 1.5, (g, p) => {
        g.ellipse(p.x, p.y - 4, 10, 4).fill(0x9aa3a8).stroke(OUTLINE);
        for (let k = -2; k <= 2; k++) g.moveTo(p.x + k * 3, p.y - 7).lineTo(p.x + k * 3, p.y - 1).stroke({ width: 0.6, color: 0x546e7a });
      });
    }
  },

  // Feria del pescado: puestos con toldos verde, amarillo y azul, uno por compra, y la gente.
  feria_pescado(art, stage) {
    fairScene(art, stage, [0x2f7d4f, 0xf4c430, 0x2e6fd1]);
  },

  // Se cayó el puente: el río cruza la carretera del aceite y se llevó el puente; canoas, el planchón y al
  // final el puente nuevo.
  puente_caido(art, stage, zone) {
    landslideScene(art, stage, zone, 'oil_bottle', 'creciente');
  },

  // Torneo de coleo: la fila de coleadores frente al Taller de sillas; los aprendices, las hormas y los
  // maestros; un toro en el corral.
  coleo(art, stage, zone) {
    const a = areaOf(zone, 'saddler');
    queue(art, a.x + 0.2, a.y + a.h + 0.6, [7, 5, 3, 1][stage], { hats: true });
    const sx = a.x + a.w + 0.4;
    const sy = a.y + 0.6;
    art.clear(sx, sy, 1.4);
    if (stage >= 1) {
      art.anim(sx, sy, (g, t) => {
        const p = iso(sx, sy);
        person(g, p.x, p.y, { shirt: 0xd7263d, hat: true, arm: Math.abs(Math.sin(t * 5)) });
      });
    }
    if (stage >= 2) {
      art.prop(sx + 0.8, sy + 0.8, (g, p) => {
        for (let k = 0; k < 3; k++) {
          const x = p.x - 10 + k * 10;
          g.rect(x - 1, p.y - 8, 2, 8).fill(0x5e3b1c);
          g.ellipse(x, p.y - 10, 5, 3).fill(0x6d3b1f).stroke(THIN);
        }
      });
    }
    if (stage >= 3) {
      art.anim(sx + 0.4, sy + 1.8, (g, t) => {
        const p = iso(sx + 0.4, sy + 1.8);
        person(g, p.x, p.y, { shirt: 0x6d4c41, hat: true, skin: SKIN[2], arm: Math.max(0, Math.sin(t * 5)) });
        person(g, p.x + 13, p.y - 3, { shirt: 0xf4c430, hat: true, skin: SKIN[0], arm: Math.max(0, Math.sin(t * 5 + 1.5)) });
      });
    }
  },

  // Torneo del joropo: la fila de visitantes en la Salida a Caño Cristales, las parejas bailando joropo en el
  // parque, los guías con banderitas, las avionetas que pasan y los letreros.
  torneo_joropo(art, stage, zone) {
    const a = areaOf(zone, 'salida_cano');
    queue(art, a.x - 0.4, a.y + a.h + 0.5, [8, 6, 4, 2][stage], { hats: true, packs: true });
    art.anim(a.x - 3, a.y - 1, (g, t) => {
      for (let k = 0; k < 3; k++) {
        const p = iso(a.x - 4 + k * 1.2, a.y - 0.5 + (k % 2) * 0.8);
        const step = Math.abs(Math.sin(t * 8 + k)) * 3;
        person(g, p.x, p.y - step, { shirt: 0xffffff, hat: true });
        person(g, p.x + 10, p.y - Math.abs(Math.sin(t * 8 + k + 1.5)) * 3, { shirt: 0xd7263d, skirt: [0xf06292, 0xf4c430, 0x2e6fd1][k] });
      }
    }, 1);
    const guides = stage >= 3 ? 4 : stage >= 1 ? 2 : 0;
    if (guides) {
      art.anim(a.x + a.w + 0.4, a.y + 1, (g, t) => {
        for (let k = 0; k < guides; k++) {
          const p = iso(a.x + a.w + 0.4 + (k % 2) * 0.7, a.y + 0.6 + Math.floor(k / 2) * 0.9);
          person(g, p.x, p.y, { shirt: 0x2f7d4f, hat: 0x3e2723, arm: 1 });
          const wave = Math.sin(t * 4 + k) * 2;
          g.moveTo(p.x + 5.5, p.y - 16).lineTo(p.x + 5.5, p.y - 30).stroke({ width: 1, color: 0x5e3b1c });
          g.poly([p.x + 5.5, p.y - 30, p.x + 14, p.y - 27 + wave, p.x + 5.5, p.y - 24]).fill(0xd7263d).stroke(THIN);
        }
      });
    }
    if (stage >= 2) {
      art.anim(a.x, a.y - 4, (g, t) => {
        const f = (t * 0.05) % 1;
        const p = iso(a.x - 6 + f * 14, a.y - 6 + f * 4, 120);
        g.ellipse(p.x, p.y, 10, 2.4).fill(0xffffff).stroke(THIN);
        g.rect(p.x - 2, p.y - 1, 4, 1.4).fill(0xd7263d);
        g.moveTo(p.x - 1, p.y).lineTo(p.x - 6, p.y - 7).lineTo(p.x + 2, p.y).stroke({ width: 1.6, color: 0xffffff });
      }, 3);
      for (const [gx, gy] of [[a.x + a.w + 1.6, a.y + 2.6], [a.x + a.w + 2.6, a.y + 3.6]]) {
        art.clear(gx, gy, 0.8);
        art.prop(gx, gy, (g, p) => post(g, p.x, p.y, 0x8b5a2b));
      }
    }
  },

  crucero(art, stage, zone) {
    const a = areaOf(zone, 'muelle');
    queue(art, a.x - 0.4, a.y + a.h + 0.5, [8, 6, 4, 2][stage], { hats: true, packs: true });
    const crew = stage >= 3 ? 4 : stage >= 1 ? 2 : 0;
    if (crew) {
      art.anim(a.x + a.w + 0.4, a.y + 1, (g, t) => {
        for (let k = 0; k < crew; k++) {
          const p = iso(a.x + a.w + 0.4 + (k % 2) * 0.7, a.y + 0.6 + Math.floor(k / 2) * 0.9);
          person(g, p.x, p.y, { shirt: 0xf4efe6, skin: SKIN[1], hat: 0x2e6fd1, arm: Math.abs(Math.sin(t * 3 + k)) });
        }
      });
    }
    if (stage >= 2) {
      for (const [gx, gy] of [[a.x + a.w + 1.6, a.y + 2.6], [a.x + a.w + 2.6, a.y + 3.6]]) {
        art.clear(gx, gy, 0.8);
        art.prop(gx, gy, (g, p) => post(g, p.x, p.y, 0x26c6da));
      }
    }
  },
};

// La carretera de un importado, tapada (derrumbe) o cortada por el río (creciente), y lo que se hace.
function landslideScene(art, stage, zone, product, kind) {
  const road = importRoad(zone, product);
  if (!road) return;
  const mid = pointAt(road, 0.5);
  const river = kind === 'creciente';
  // La carretera llega por el borde del mapa: la cámara se corre un poco para que se vea (una vez).
  const cam = art.scene.camera;
  if (cam && !art.framed) {
    art.framed = true;
    const m = iso(mid.gx, mid.gy);
    cam.centerOn(Math.max(cam.x, m.x - 110), Math.max(cam.y, m.y - 60));
  }
  art.clear(mid.gx, mid.gy, 2.2);
  // El paso por el monte (o el vado), al lado de la carretera.
  const by = mid.gy + 0.9;
  const bypass = [[mid.gx + 1.8, mid.gy], [mid.gx + 1.2, by], [mid.gx - 1.2, by], [mid.gx - 1.8, mid.gy]];
  if (river) {
    // El río cruza la carretera de lado a lado.
    art.anim(mid.gx, mid.gy, (g, t) => {
      const pts = [[mid.gx - 0.6, mid.gy - 3], [mid.gx + 0.6, mid.gy - 3], [mid.gx + 0.6, mid.gy + 3], [mid.gx - 0.6, mid.gy + 3]].map(([x, y]) => iso(x, y));
      g.poly(pts.flatMap((p) => [p.x, p.y])).fill(stage >= 3 ? 0x5b9bd5 : 0x6f8fa8);
      for (let k = 0; k < 6; k++) {
        const f = (t * 0.5 + k / 6) % 1;
        const q = iso(mid.gx, mid.gy - 3 + f * 6);
        g.moveTo(q.x - 6, q.y).quadraticCurveTo(q.x, q.y - 2, q.x + 6, q.y).stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
      }
    }, -6);
  }
  if (stage < 3) {
    if (river) {
      // El puente caído: dos pedazos de tablas a la orilla.
      art.prop(mid.gx, mid.gy, (g) => {
        for (const s of [-1, 1]) {
          const p = iso(mid.gx + s * 0.9, mid.gy);
          g.poly([p.x - 8, p.y - 2, p.x + 8, p.y - 6, p.x + 8, p.y - 3, p.x - 8, p.y + 1]).fill(0x8b5a2b).stroke(OUTLINE);
        }
      });
    } else {
      art.prop(mid.gx, mid.gy, (g) => {
        const p = iso(mid.gx, mid.gy);
        g.ellipse(p.x, p.y + 2, 34, 12).fill({ color: 0x000000, alpha: 0.18 });
        g.poly([p.x - 32, p.y + 2, p.x - 14, p.y - 14, p.x + 4, p.y - 20, p.x + 22, p.y - 10, p.x + 32, p.y + 2]).fill(0x8a5a3c).stroke(OUTLINE);
        for (const [dx, dy, r] of [[-14, -4, 5], [6, -10, 6], [18, -2, 4], [-4, -12, 3.5]]) g.circle(p.x + dx, p.y + dy, r).fill(0x9a948a).stroke(THIN);
        g.poly([p.x - 6, p.y - 22, p.x - 2, p.y - 32, p.x + 2, p.y - 22]).fill(0x4e7f33);
      });
      // Conos y cinta de peligro.
      for (const s of [-1, 1]) {
        art.prop(mid.gx + s * 1.6, mid.gy - 0.5, (g, p) => {
          g.poly([p.x - 3, p.y, p.x, p.y - 9, p.x + 3, p.y]).fill(0xf07f1d).stroke(THIN);
          g.rect(p.x - 2, p.y - 5, 4, 1.5).fill(0xffffff);
        });
      }
    }
  }
  if (stage >= 1 && stage < 3) {
    // Las mulas (por el monte o por el vado), y desde la trocha o el planchón, también el carro.
    if (!river) {
      art.prop(mid.gx, by, (g) => {
        const pts = bypass.map(([x, y]) => iso(x, y));
        g.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
        g.stroke({ width: stage >= 2 ? 12 : 4, color: stage >= 2 ? 0xb08a5a : 0x6e8a3a, alpha: 0.9 });
      }, -6);
    }
    const mules = stage === 1 ? 3 : 1;
    for (let k = 0; k < mules; k++) art.mover(new MuleView(product), bypass, 0.8, k * 0.25);
    if (stage >= 2) {
      if (river) {
        art.anim(mid.gx, mid.gy, (g, t) => {
          const f = (Math.sin(t * 0.6) + 1) / 2;
          const p = iso(mid.gx, mid.gy - 1.5 + f * 3);
          g.poly([p.x - 18, p.y, p.x, p.y - 9, p.x + 18, p.y, p.x, p.y + 9]).fill(0x8b5a2b).stroke(OUTLINE);
          g.rect(p.x - 6, p.y - 10, 12, 8).fill(0x4f7a3a).stroke(THIN);
        }, 0.5);
      } else {
        const jeep = new JeepView();
        art.mover(jeep, bypass, 1.6, 0.5);
      }
    }
  }
  if (stage >= 3) {
    if (river) {
      art.prop(mid.gx, mid.gy, (g) => {
        const a = iso(mid.gx + 1, mid.gy);
        const b = iso(mid.gx - 1, mid.gy);
        g.poly([a.x, a.y - 4, b.x, b.y - 4, b.x, b.y + 4, a.x, a.y + 4]).fill(0xa9a39a).stroke(OUTLINE);
        for (const s of [-4, 4]) g.moveTo(a.x, a.y - 10 + s).lineTo(b.x, b.y - 10 + s).stroke({ width: 1.5, color: 0x5e3b1c });
      }, 0.1);
    } else {
      // La vía pavimentada, con su línea amarilla.
      art.prop(mid.gx, mid.gy, (g) => {
        const a = iso(road[0][0], road[0][1]);
        const b = iso(road.at(-1)[0], road.at(-1)[1]);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 22, color: 0x4a4a4a, alpha: 0.95 });
        for (let k = 0; k < 10; k++) {
          const p0 = pointAt(road, k / 10 + 0.02);
          const p1 = pointAt(road, k / 10 + 0.06);
          const u = iso(p0.gx, p0.gy);
          const v = iso(p1.gx, p1.gy);
          g.moveTo(u.x, u.y).lineTo(v.x, v.y).stroke({ width: 2, color: 0xf2d22e });
        }
      }, -8);
    }
  }
}

// Puestos de feria con toldo de color (uno por compra) y gente mirando.
function fairScene(art, stage, colors) {
  const gx = 8.5;
  const gy = 20.5;
  art.prop(gx + 2, gy - 0.6, (g) => {
    const a = iso(gx - 1, gy - 1, 26);
    const b = iso(gx + 5, gy - 1, 26);
    g.moveTo(a.x, a.y).quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y).stroke({ width: 1, color: 0x5e3b1c });
    for (let k = 1; k < 10; k++) {
      const f = k / 10;
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 10;
      g.poly([x - 3, y, x + 3, y, x, y + 6]).fill(SHIRTS[k % SHIRTS.length]);
    }
  }, 1);
  for (let k = 0; k < 3; k++) {
    const x = gx + k * 2;
    const y = gy;
    art.clear(x, y, 1.1);
    if (k < stage) {
      art.prop(x, y, (g, p) => {
        g.position.set(p.x, p.y);
        box(g, -0.4, -0.3, 0.8, 0.6, 9, 0x8b5a2b);
        g.poly([-22, -26, 22, -26, 26, -16, -26, -16]).fill(colors[k]).stroke(OUTLINE);
        for (const dx of [-20, 20]) g.rect(dx - 1, -16, 2, 16).fill(0x5e3b1c);
      });
    }
  }
  queue(art, gx - 0.4, gy + 1.3, 2 + stage * 2);
}
