import { Container, Graphics } from 'pixi.js';
import { iso, depth, shade } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { box, shadow } from './procedural/shapes.js';
import { PRODUCTS } from '../data/products.js';

// Mula de carga con enjalma y dos costales, y su arriero de ruana y sombrero aguadeño.
export class MuleView extends Container {
  constructor(productId) {
    super();
    this.body = new Graphics();
    this.sacks = new Graphics();
    this.legs = new Graphics();
    this.man = new Graphics();
    this.body.addChild(this.sacks);
    this.addChild(this.legs, this.body, this.man);
    this.phase = Math.random() * 10;
    this.drawBody(PRODUCTS[productId]?.color ?? PAL.cherry);
    this.drawMan();
  }

  drawBody(productColor) {
    const g = this.body;
    const c = PAL.mule;
    const dark = shade(c, 0.65);
    shadow(g, 0, 0, 15, 5);
    // Cola, cuerpo, cuello con crin y cabeza larga, de hocico oscuro y orejas largas (de mula).
    g.moveTo(-11, -16).quadraticCurveTo(-15, -12, -14, -6).stroke({ width: 2, color: dark });
    g.ellipse(-14, -5.5, 1.5, 2.6).fill(0x3a2418);
    g.roundRect(-12, -20, 22, 10, 5).fill(c).stroke(OUTLINE);
    g.ellipse(-1, -11.5, 8, 1.6).fill(shade(c, 1.18));
    g.poly([5, -18, 10, -19, 16, -27, 13, -30, 6, -22]).fill(c).stroke(OUTLINE);
    g.poly([7, -20, 12, -28, 13.5, -30, 9, -22.5]).fill(0x3a2418);
    g.poly([12, -31, 16.5, -31, 22, -25, 21, -21.5, 17.5, -21.5, 13, -27]).fill(c).stroke(OUTLINE);
    g.ellipse(20.2, -22.6, 2.3, 1.9).fill(0x4a2f1c);
    g.circle(16, -28, 0.9).fill(0x1a1a1a);
    g.poly([12.5, -30.5, 10.8, -35.5, 14, -31]).fill(dark).stroke(OUTLINE);
    g.poly([14.5, -31, 15.2, -36, 16.5, -30.5]).fill(c).stroke(OUTLINE);
    // Jáquima (cabezal) de cuero.
    g.moveTo(13.5, -27).lineTo(19, -24).stroke({ width: 1, color: 0x2b1d14 });
    // Enjalma: manta de colores sobre el lomo.
    g.roundRect(-8, -22, 13, 7, 2).fill(0xc8643b).stroke(OUTLINE);
    g.rect(-8, -19.5, 13, 1.3).fill(0xe8b90f);
    g.rect(-8, -17.2, 13, 1).fill(0x2e6fd1);
    // Costales de fique a lado y lado, amarrados, con una franja del color del producto (se ocultan
    // cuando la mula vuelve vacía).
    const k = this.sacks;
    k.roundRect(-10, -27, 9, 11, 3.5).fill(shade(PAL.sack, 0.85)).stroke(OUTLINE);
    k.roundRect(-1.5, -27.5, 9, 12, 3.5).fill(PAL.sack).stroke(OUTLINE);
    k.rect(-9, -23.5, 7, 2.2).fill(productColor);
    k.rect(-0.5, -24, 7, 2.4).fill(productColor);
    k.moveTo(-10, -20).lineTo(7.5, -20).stroke({ width: 1, color: 0x6b4a2e });
  }

  setLoaded(loaded) {
    this.sacks.visible = loaded;
  }

  drawMan() {
    const g = this.man;
    g.position.set(-5, 7);
    shadow(g, 0, 0, 6, 2.5);
    // Pantalón blanco y alpargatas.
    g.rect(-3, -9, 2.4, 9).fill(0xf4efe6).stroke({ width: 0.8, color: PAL.outline, alpha: 0.5 });
    g.rect(0.6, -9, 2.4, 9).fill(0xf4efe6).stroke({ width: 0.8, color: PAL.outline, alpha: 0.5 });
    g.rect(-3.4, -1, 3, 1.4).fill(0x6b4a2e);
    g.rect(0.4, -1, 3, 1.4).fill(0x6b4a2e);
    // Vara de arriero en la mano.
    g.moveTo(5, -12).lineTo(9, 0).stroke({ width: 1.2, color: 0x6b4a2e });
    // Ruana a rayas y carriel (bolso de cuero) cruzado.
    g.poly([-6.5, -9, 6.5, -9, 4, -19, -4, -19]).fill(0xb5512e).stroke(OUTLINE);
    g.rect(-6, -12, 12, 1.2).fill(0xe8b90f);
    g.moveTo(-3.5, -18).lineTo(4, -10).stroke({ width: 1, color: 0x5e3b1c });
    g.roundRect(3, -11.5, 4, 3.5, 1).fill(0x8b5a2b).stroke(OUTLINE);
    g.circle(0, -21.5, 3.4).fill(0xc68642);
    // Sombrero aguadeño: ala ancha blanca, copa alta y cinta negra.
    g.ellipse(0, -24, 7.5, 2.2).fill(0xf4efe6).stroke(OUTLINE);
    g.roundRect(-3.5, -30, 7, 6, 2).fill(0xf4efe6).stroke(OUTLINE);
    g.rect(-3.5, -26.6, 7, 1.6).fill(0x222222);
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
    // Patas con cascos, en pares cruzados al andar.
    const g = this.legs.clear();
    for (const [lx, k] of [[-9, 1], [-6, -1], [5, -1], [8, 1]]) {
      const fx = lx + step * 2.5 * k;
      g.moveTo(lx, -11).lineTo(fx, -0.8).stroke({ width: 2.4, color: shade(PAL.mule, 0.75) });
      g.rect(fx - 1.4, -1.2, 2.8, 1.4).fill(0x2b1d14);
    }
  }
}

// Jeep Willys («yipao»): capó con parrilla y faros adelante, parabrisas bajo, el conductor de
// sombrero, el platón abierto atrás con los bultos y la llanta de repuesto en la cola. Se dibuja
// mirando hacia donde va: (u, v) son las coordenadas del jeep (u hacia adelante) y cada dirección
// las pasa a la cuadrícula.
const JEEP_DIRS = {
  '+x': (u, v) => [u, v],
  '-x': (u, v) => [-u, -v],
  '+y': (u, v) => [-v, u],
  '-y': (u, v) => [v, -u],
};
const JEEP_L = 0.48; // medio largo (casillas)
const JEEP_W = 0.27; // medio ancho

export class JeepView extends Container {
  constructor() {
    super();
    this.g = new Graphics();
    this.addChild(this.g);
    // El vapor del tinto, aparte: se mueve en cada cuadro.
    this.steam = new Graphics();
    this.addChild(this.steam);
    this.dir = '+x';
    this.cargo = 0;
    this.resting = false;
    this.cup = null;
    this.drawn = null;
  }

  draw() {
    const key = `${this.dir}:${this.cargo}:${this.resting}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.cup = drawWillys(this.g.clear(), JEEP_DIRS[this.dir], this.cargo, this.resting);
  }

  // Dos hilitos de vapor que suben de la taza y se desvanecen.
  drawSteam(t) {
    const g = this.steam.clear();
    if (!this.cup) return;
    for (let k = 0; k < 2; k++) {
      const f = (t * 0.6 + k * 0.5) % 1;
      const x = this.cup.x + (k ? 1 : -0.6);
      const y = this.cup.y - 1 - f * 7;
      const sway = Math.sin(t * 3 + k * 2) * 1.2;
      g.moveTo(x, y).quadraticCurveTo(x + sway, y - 2, x - sway * 0.5, y - 4).stroke({ width: 1.4, color: 0xffffff, alpha: 0.9 * (1 - f) });
    }
  }

  // load: 0..1 de llenado. resting: parqueado sin nada que vender (se toma un tinto). t: reloj.
  place(gx, gy, dx, dy, load, resting = false, t = 0) {
    const p = iso(gx, gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(gx, gy) + 0.2;
    // Parado (cargando en la bodega) sigue mirando hacia donde iba.
    if (dx || dy) this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : dy > 0 ? '+y' : '-y';
    // Como mucho lleno: si la capacidad baja de golpe (menos reinicios en las opciones de desarrollador),
    // la carga en camino puede ser miles de millones de veces la nueva y no hay que dibujar tantos bultos.
    this.cargo = load <= 0 ? 0 : Math.max(1, Math.round(Math.min(1, load) * 6));
    this.resting = resting;
    this.draw();
    this.drawSteam(t);
  }
}

// resting: el conductor tiene un pocillo de tinto en la mano. Devuelve dónde queda el pocillo (para
// el vapor), o null.
function drawWillys(g, toGrid, sacks, resting = false) {
  const L = JEEP_L;
  const W = JEEP_W;
  const at = (u, v, z) => {
    const [x, y] = toGrid(u, v);
    return iso(x, y, z);
  };
  const flat = (points) => points.flatMap(([u, v, z]) => {
    const p = at(u, v, z);
    return [p.x, p.y];
  });
  // Caja con la huella (u0..u1, v0..v1) del jeep, pasada a la cuadrícula.
  const lbox = (u0, u1, v0, v1, z, h, color) => {
    const corners = [toGrid(u0, v0), toGrid(u1, v1)];
    const x = Math.min(corners[0][0], corners[1][0]);
    const y = Math.min(corners[0][1], corners[1][1]);
    box(g, x, y, Math.abs(corners[1][0] - corners[0][0]), Math.abs(corners[1][1] - corners[0][1]), h, color, { z });
  };
  // Qué se ve desde la cámara: las caras que miran a +x o +y.
  const facing = (u, v) => {
    const [x, y] = toGrid(u, v);
    return x > 0 || y > 0;
  };
  const frontSeen = facing(1, 0);
  const nearSide = facing(0, 1) ? 1 : -1;
  const depthOf = (u, v) => {
    const [x, y] = toGrid(u, v);
    return x + y;
  };
  const o = at(0, 0, 0);
  shadow(g, o.x, o.y + 2, 30, 13, 0.28);
  let cup = null;

  const wheel = (u, v) => {
    const p = at(u, v, 4.5);
    g.circle(p.x, p.y, 4.8).fill(0x2b2b2b);
    g.circle(p.x, p.y, 1.8).fill(0x9a9a9a);
  };
  const wheels = [[0.3, W], [-0.3, W], [0.3, -W], [-0.3, -W]];
  for (const [u, v] of wheels) if (Math.sign(v) !== nearSide) wheel(u, v);

  // Carrocería, capó un poco más alto y el platón abierto (el piso oscuro).
  lbox(-L, L, -W, W, 4, 7, PAL.jeep);
  lbox(0.17, L - 0.02, -W + 0.04, W - 0.04, 11, 2.5, shade(PAL.jeep, 1.12));
  g.poly(flat([[-L + 0.05, -W + 0.05, 11], [0.13, -W + 0.05, 11], [0.13, W - 0.05, 11], [-L + 0.05, W - 0.05, 11]])).fill(0x2f4a24);

  // Lo que va en el platón (bultos y conductor) y el parabrisas, de atrás hacia adelante.
  const items = [];
  const spots = [[-0.36, -0.1], [-0.36, 0.1], [-0.22, -0.1], [-0.22, 0.1], [-0.08, 0.1], [-0.36, 0]];
  for (let i = 0; i < sacks; i++) {
    const [u, v] = spots[i];
    const z = i < 5 ? 13 : 18;
    items.push([depthOf(u, v) + z * 0.001, () => {
      const p = at(u, v, z);
      g.ellipse(p.x, p.y - 2, 6.5, 4.8).fill(PAL.sack).stroke(OUTLINE);
      g.rect(p.x - 4, p.y - 3, 8, 1.4).fill(shade(PAL.sack, 0.8));
    }]);
  }
  items.push([depthOf(0.02, -0.11), () => {
    const p = at(0.02, -0.11, 11);
    g.poly([p.x - 3.5, p.y, p.x + 3.5, p.y, p.x + 2.5, p.y - 7, p.x - 2.5, p.y - 7]).fill(0xb5512e).stroke(OUTLINE);
    g.circle(p.x, p.y - 9, 2.6).fill(0xc68642);
    g.ellipse(p.x, p.y - 11, 5.5, 1.7).fill(0xf4efe6).stroke(OUTLINE);
    g.roundRect(p.x - 2.6, p.y - 15, 5.2, 4.2, 1.5).fill(0xf4efe6).stroke(OUTLINE);
    g.rect(p.x - 2.6, p.y - 12.4, 5.2, 1.1).fill(0x222222);
    if (resting) {
      // El brazo sube el pocillo blanco hasta la barbilla.
      g.moveTo(p.x + 2.4, p.y - 5.5).lineTo(p.x + 4.6, p.y - 4.5).lineTo(p.x + 4.2, p.y - 7.4).stroke({ width: 1.5, color: 0xc68642 });
      g.roundRect(p.x + 2.6, p.y - 10.2, 3.2, 3, 0.8).fill(0xfaf6ee).stroke({ width: 0.7, color: 0x3a2418 });
      g.circle(p.x + 6.1, p.y - 8.7, 0.9).stroke({ width: 0.7, color: 0x3a2418 });
      g.ellipse(p.x + 4.2, p.y - 10.1, 1.4, 0.45).fill(0x4a2a14);
      cup = { x: p.x + 4.2, y: p.y - 10.4 };
    }
  }]);
  items.push([depthOf(0.16, 0), () => {
    lbox(0.15, 0.18, -W + 0.02, W - 0.02, 11, 10, 0xbfe3f0);
  }]);
  items.sort((a, b) => a[0] - b[0]);
  for (const [, draw] of items) draw();

  for (const [u, v] of wheels) if (Math.sign(v) === nearSide) wheel(u, v);

  if (frontSeen) {
    // Parrilla de rejas verticales, faros redondos y parachoques.
    g.poly(flat([[L, -0.12, 5], [L, 0.12, 5], [L, 0.12, 12.5], [L, -0.12, 12.5]])).fill(0x22301c);
    for (let i = 1; i < 6; i++) {
      const v = -0.12 + (0.24 * i) / 6;
      const a = at(L, v, 5.5);
      const b = at(L, v, 12);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.9, color: 0x8fa77a });
    }
    for (const v of [-0.19, 0.19]) {
      const p = at(L, v, 9.5);
      g.circle(p.x, p.y, 2.3).fill(0xfff3c4).stroke(OUTLINE);
    }
    const b0 = at(L + 0.02, -W, 4.5);
    const b1 = at(L + 0.02, W, 4.5);
    g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 2, color: 0x2b2b2b });
  } else {
    // Llanta de repuesto en la cola.
    const p = at(-L - 0.01, 0, 8);
    g.circle(p.x, p.y, 4.6).fill(0x2b2b2b);
    g.circle(p.x, p.y, 1.9).fill(0x9a9a9a);
  }
  return cup;
}

// Chiva: bus de escalera pintado de colores, para las rutas entre zonas. Lleva la carga en el techo.
export class ChivaView extends Container {
  // productId: lo que lleva (da color a la carga del techo).
  constructor(productId) {
    super();
    this.color = PRODUCTS[productId]?.color ?? PRODUCTS.panela_powder.color;
    this.alongY = this.drawChiva(false);
    this.alongX = this.drawChiva(true);
    this.addChild(this.alongY, this.alongX);
    this.cargo = -1;
  }

  drawChiva(alongX) {
    const c = new Container();
    const g = new Graphics();
    const [w, d] = alongX ? [1.4, 0.62] : [0.62, 1.4];
    const x0 = -w / 2;
    const y0 = -d / 2;
    const s = iso(0, 0);
    shadow(g, s.x, s.y + 2, 40, 16, 0.28);
    const wheels = alongX
      ? [[x0 + 0.25, y0 + d], [x0 + w - 0.25, y0 + d]]
      : [[x0 + w, y0 + 0.25], [x0 + w, y0 + d - 0.25]];
    for (const [wx, wy] of wheels) {
      const p = iso(wx, wy, 5);
      g.ellipse(p.x, p.y, 5.5, 5.5).fill(0x2b2b2b);
      g.circle(p.x, p.y, 2).fill(0xd7263d);
    }
    // Carrocería por franjas: rojo, amarillo, azul, verde; techo blanco.
    const bands = [[4, 5, 0xd7263d], [9, 6, 0xe8b90f], [15, 6, 0x2e6fd1], [21, 3, 0x2fa36b]];
    for (const [z, h, color] of bands) box(g, x0, y0, w, d, h, color, { z });
    box(g, x0 - 0.04, y0 - 0.04, w + 0.08, d + 0.08, 2, 0xf4efe6, { z: 24 });
    // Ventanas: rombos de colores en la franja azul.
    const n = 4;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = alongX ? iso(x0 + w * t, y0 + d, 18) : iso(x0 + w, y0 + d * t, 18);
      g.poly([p.x - 3, p.y, p.x, p.y - 3, p.x + 3, p.y, p.x, p.y + 3]).fill(0xfff3d6);
    }
    const cargo = new Graphics();
    c.addChild(g, cargo);
    c.cargo = cargo;
    c.base = { x0, y0, w, d, alongX };
    return c;
  }

  drawCargo(view, n) {
    const g = view.cargo.clear();
    const { x0, y0, w, d, alongX } = view.base;
    for (let i = 0; i < n; i++) {
      const f = (i % 4) / 4 + 0.12;
      const z = 26 + Math.floor(i / 4) * 6;
      const p = alongX ? iso(x0 + f * w, y0 + d / 2, z) : iso(x0 + w / 2, y0 + f * d, z);
      g.roundRect(p.x - 6, p.y - 8, 12, 8, 2).fill(0xf4efe6).stroke(OUTLINE);
      g.rect(p.x - 4, p.y - 6, 8, 3).fill(this.color);
    }
  }

  // load: 0..1 de llenado.
  place(gx, gy, dx, dy, load) {
    const p = iso(gx, gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(gx, gy) + 0.3;
    const alongX = Math.abs(dx) > Math.abs(dy);
    this.alongX.visible = alongX;
    this.alongY.visible = !alongX;
    const n = load <= 0 ? 0 : Math.max(1, Math.round(Math.min(1, load) * 8)); // como mucho lleno (ver el Willys)
    if (n !== this.cargo) {
      this.cargo = n;
      this.drawCargo(this.alongX, n);
      this.drawCargo(this.alongY, n);
    }
  }
}
