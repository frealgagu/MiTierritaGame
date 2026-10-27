import { Container, Graphics } from 'pixi.js';
import { iso, isoPoly, mix, shade, depth } from './iso.js';
import { PAL, OUTLINE } from './palette.js';
import { createRng } from '../core/rng.js';
import { box, gableRoof, shadow } from './procedural/shapes.js';

const CLIFF = 46; // px de alto del borde del mapa
// El letrero con el nombre de la zona (v3.12), junto a la carretera; ahí no se pone decoración.
export const ZONE_SIGN = [18.9, 21.7];
const SIGN_CELLS = new Set(['18,20', '19,20', '18,21', '19,21', '18,22', '19,22', '17,21', '17,22', '16,22', '16,23', '17,23']); // y la persona de la zona

// Tipo de cada casilla del mapa a partir de los datos de la zona. jeeps: cuántos Willys tiene (v3.9: con
// dos, la carretera se amplía con el carril del segundo).
export function buildTileMap(zone, jeeps = 1) {
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
  if (jeeps > 1) road(zone.jeepRoad2);
  for (const r of Object.values(zone.routes ?? {})) road(r.road);
  fill(zone.yard.x, zone.yard.y, zone.yard.w, zone.yard.h, 'road');
  if (zone.plaza) {
    // La plaza de Vélez (v3.29): piedra, sus calles y las casas del marco, donde no va decoración.
    const pz = zone.plaza;
    fill(pz.x, pz.y, pz.w, pz.h, 'plaza');
    road(pz.street);
    for (const [hx, hy] of pz.houses) fill(Math.floor(hx), Math.floor(hy), 1, 1, 'building');
  }
  return tiles;
}

export class Terrain {
  constructor(zone, jeeps = 1) {
    this.zone = zone;
    this.tiles = buildTileMap(zone, jeeps);
    this.ground = new Graphics();
    this.decor = []; // objetos altos que se ordenan por profundidad junto al resto
    this.occupied = new Set(); // casillas con decoración (`gx,gy`): la gente no las atraviesa
    this.glows = []; // luces de noche de lo que no es una estación: { x, y, r, color } (v3.29)
    this.animated = []; // lo que se mueve en la decoración: { update(t) } (v3.54: las ballenas y sus lanchas)
    this.drawGround();
    if (zone.plaza) drawAtrium(this.ground, zone.plaza);
    if (zone.plaza) this.buildPlaza();
    if (zone.walls) this.buildWalls();
    if (zone.sea) this.buildWhales();
    this.buildDecor();
  }

  // La plaza de Vélez (v3.29): la iglesia de una torre con su atrio, la pila, árboles, bancas y faroles,
  // y las casas blancas del marco de la plaza.
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

    const sea = this.zone.walls?.sea || this.zone.sea; // el mar detrás del mapa: Cartagena (v3.45) y Buenaventura (v3.54)
    if (sea) this.drawSea(g, n, rng);
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
        else if (type === 'farm') color = (FARM_SOIL[this.zone.style] ?? FARM_SOIL[this.zone.theme])?.(v) ?? mix(PAL.soil, 0x6e4529, v * 0.35);
        else if (type === 'plaza') color = mix(0xd9c9a8, 0xc4b08a, v * 0.5);
        else if (type === 'plot' || type === 'building') color = mix(PAL.plot, 0xc9a06c, v * 0.4);
        else if (sea && (gx === 0 || gy === 0)) color = mix(this.zone.sea ? 0xb8a27a : 0xe9d8a6, this.zone.sea ? 0xa8926a : 0xdcc78e, v * 0.6); // la playa (en el Pacífico, de arena oscura)
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
        if (type === 'plaza') {
          // Piedra de la plaza de Vélez, como la de Barichara pero más gris.
          for (let k = 0; k < 4; k++) {
            const p = iso(gx + 0.25 + (k % 2) * 0.5, gy + 0.25 + Math.floor(k / 2) * 0.5);
            g.ellipse(p.x, p.y, 7, 3.5).fill({ color: rng() < 0.5 ? 0xb9a57e : 0xe3d6b8, alpha: 0.8 });
          }
        } else if (type === 'farm' && this.zone.theme === 'town') {
          // Plaza empedrada.
          for (let k = 0; k < 4; k++) {
            const p = iso(gx + 0.25 + (k % 2) * 0.5, gy + 0.25 + Math.floor(k / 2) * 0.5);
            const stones = this.zone.style === 'barichara' ? [0xc9a96b, 0xe0c890] : this.zone.style === 'cartagena' ? [0xc9b48a, 0xe2d2ae] : this.zone.style === 'villa' ? [0x9a948a, 0xb9b2a5] : this.zone.style === 'villavo' ? [0xc9a77a, 0xe0c8a0] : this.zone.style === 'buenaventura' ? [0xb8bcc0, 0xd0d4d6] : this.zone.style === 'leticia' ? [0xb89a7a, 0xd0b896] : [0xa39b8c, 0xd2cbbd]; // piedra amarilla en Barichara; coralina en Cartagena
            g.ellipse(p.x, p.y, 7, 3.5).fill({ color: rng() < 0.5 ? stones[0] : stones[1], alpha: 0.8 });
          }
        } else if (type === 'farm' && (this.zone.theme === 'cacao' || this.zone.theme === 'plantain' || this.zone.theme === 'azotea' || this.zone.theme === 'werregue' || this.zone.theme === 'asai' || this.zone.theme === 'aji' || this.zone.theme === 'chagra' || this.zone.theme === 'yanchama')) {
          // Hojarasca bajo los cacaos (y bajo el platanal del Pacífico, v3.38).
          for (let k = 0; k < 2; k++) {
            const p = iso(gx + rng(), gy + rng());
            g.ellipse(p.x, p.y, 3, 1.5).fill({ color: rng() < 0.5 ? 0x8a6a3a : 0x6e8f3a, alpha: 0.7 });
          }
        } else if (type === 'farm' && this.zone.theme === 'rice') {
          // Arrozal inundado (v3.15): brillos del agua y el camellón (el borde de tierra) entre pozas.
          const a = iso(gx, gy + 1);
          const b = iso(gx + 1, gy + 1);
          const c2 = iso(gx + 1, gy);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(c2.x, c2.y).stroke({ width: 2.2, color: 0x8a6a45, alpha: 0.55 });
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 5, p.y).lineTo(p.x + 5, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.55 });
        } else if (type === 'farm' && this.zone.theme === 'mangrove') {
          // El Manglar (v3.41): el barro de la marea baja, con charcos que brillan.
          if (rng() < 0.5) {
            const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
            g.ellipse(p.x, p.y, 6 + rng() * 5, 2.4 + rng() * 1.5).fill({ color: 0x5a8f9a, alpha: 0.7 });
            g.moveTo(p.x - 3, p.y - 0.5).lineTo(p.x + 2, p.y - 0.5).stroke({ width: 1, color: 0xe8f6ff, alpha: 0.6 });
          }
        } else if (type === 'farm' && this.zone.theme === 'lake') {
          // El Lago (v3.49): el agua negra del lago de Tarapoto, con brillos y hojas de victoria regia flotando.
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
          // La Bahía (v3.40): el mar, con olas que brillan y alguna espuma.
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 7, p.y).quadraticCurveTo(p.x, p.y - 3, p.x + 7, p.y).stroke({ width: 1.3, color: 0xe8f6ff, alpha: 0.55 });
          if (rng() < 0.15) g.ellipse(p.x + 3, p.y + 4, 4, 1.2).fill({ color: 0xffffff, alpha: 0.5 });
        } else if (type === 'farm' && this.zone.theme === 'cienaga') {
          // Ciénaga (v3.17): brillos del agua y taruyas (el buchón de flores moradas) flotando.
          const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
          g.moveTo(p.x - 6, p.y).lineTo(p.x + 6, p.y).stroke({ width: 1.2, color: 0xe8f6ff, alpha: 0.5 });
          if (rng() < 0.3) {
            const q = iso(gx + rng(), gy + rng());
            for (let k = 0; k < 4; k++) g.ellipse(q.x + Math.cos(k * 1.6) * 4, q.y + Math.sin(k * 1.6) * 2, 3.2, 1.8).fill(k % 2 ? 0x5e9a3c : 0x74b14a);
            g.circle(q.x, q.y - 2.5, 1.6).fill(0xb39ddb);
          }
        } else if (type === 'farm' && this.zone.theme === 'coconut') {
          // Cocal (v3.16): arena con hojas secas de palma caídas.
          if (rng() < 0.4) {
            const p = iso(gx + 0.2 + rng() * 0.6, gy + 0.2 + rng() * 0.6);
            const d = rng() < 0.5 ? -1 : 1;
            g.moveTo(p.x - 7 * d, p.y - 2).quadraticCurveTo(p.x, p.y - 4, p.x + 7 * d, p.y + 1).stroke({ width: 1.6, color: 0xb08a4a, alpha: 0.7 });
          }
        } else if (type === 'farm' && (this.zone.theme === 'dairy' || this.zone.theme === 'ranch' || this.zone.theme === 'savanna' || this.zone.theme === 'sheep')) {
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

  // El mar (v3.45): una franja de agua detrás de los bordes de atrás del mapa, con olas, la espuma en la orilla
  // y el corte del agua en los extremos, como el borde del «diorama».
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
    // La espuma de la orilla.
    for (let t = 0; t < n; t += 0.5) {
      const a = iso(t, -0.12);
      const b = iso(-0.12, t);
      g.ellipse(a.x, a.y, 7, 1.6).fill({ color: 0xffffff, alpha: 0.55 });
      g.ellipse(b.x, b.y, 7, 1.6).fill({ color: 0xffffff, alpha: 0.55 });
    }
  }

  // La ciudad amurallada (v3.45): la muralla de piedra coralina por tramos de una casilla (para que se ordene
  // con lo demás), con su paseo y sus almenas, las puertas donde pasan los caminos, las garitas y la Torre
  // del Reloj; en el mar, unos veleros y lanchas.
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

  // El mar de Buenaventura (v3.54): las ballenas jorobadas que llegan a la bahía, y las lanchas de los turistas
  // que las miran desde lejos. Se mueven solas (update), por fuera del mapa.
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
      c.scale.set(1.5); // grandes, para que se vean desde el mapa entero
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
    // Se reparte sobre el mapa de un solo carril, para que con el segundo Willys (v3.9) todo quede donde
    // estaba: solo se quita lo que cae junto al carril nuevo.
    const base = buildTileMap(this.zone);
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        // Dentro de la muralla de Cartagena (v3.45) las casas van pegadas, como en el centro histórico.
        const walled = this.zone.walls && gx > 0 && gy > 0 && gx < 12 && gy < 11;
        if (!this.isFree(gx, gy, walled ? 0 : 1, base)) continue;
        const r = rng();
        let obj = null;
        if (this.zone.theme === 'town') {
          // Pueblo: casitas de colores, guayacanes florecidos, faroles y alguna palma de cera. En Salento
          // (v3.12), más palmas de cera, las del valle de Cocora (los mismos números de rng: el resto del
          // mapa no se mueve).
          const salento = this.zone.style === 'salento';
          const cartagena = this.zone.style === 'cartagena';
          const villa = this.zone.style === 'villa';
          const villavo = this.zone.style === 'villavo'; // Villavicencio (v3.36): moriches y mangos
          const puerto = this.zone.style === 'buenaventura'; // Buenaventura (v3.43): palmas de coco y almendros
          const leticia = this.zone.style === 'leticia'; // Leticia (v3.52): ceibas, palmas de asaí y guacamayas
          if (r < 0.06 || (walled && r < 0.4)) obj = townHouse(rng, this.zone.style);
          else if (villavo && r < 0.135) obj = r < 0.085 ? mangoTree(rng) : r < 0.1 ? streetLamp() : morichePalm(rng);
          else if (leticia && r < 0.135) obj = r < 0.08 ? asaiPalm(rng) : r < 0.095 ? streetLamp() : r < 0.12 ? ceiba(rng) : macaw(rng);
          else if (puerto && r < 0.135) obj = r < 0.09 ? coconutPalm(rng) : r < 0.105 ? streetLamp() : mangoTree(rng);
          else if (r < 0.09) obj = salento && r < 0.075 ? palm(rng) : cartagena ? coconutPalm(rng) : villa ? cypress(rng) : guayacan(rng);
          else if (r < 0.105) obj = streetLamp();
          else if (r < (salento || cartagena || villa ? 0.135 : 0.12)) obj = cartagena ? coconutPalm(rng) : villa ? eucalyptus(rng) : palm(rng);
        } else if (this.zone.theme === 'guava') {
          // Santander: matas de fique, guayabos sueltos, piedras y algún cactus del cañón.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.08) obj = guavaTree(rng);
          else if (r < 0.11) obj = rock(rng);
          else if (r < 0.125) obj = cactus(rng);
        } else if (this.zone.theme === 'tobacco') {
          // Tabacal: el mismo Santander seco, con matas de tabaco sueltas en vez de guayabos.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.08) obj = tobaccoPlant(rng);
          else if (r < 0.11) obj = rock(rng);
          else if (r < 0.13) obj = cactus(rng);
        } else if (this.zone.theme === 'fique') {
          // Fiquera: más fique suelto, piedras, cactus y algún guayabo.
          if (r < 0.07) obj = fique(rng);
          else if (r < 0.09) obj = guavaTree(rng);
          else if (r < 0.12) obj = rock(rng);
          else if (r < 0.135) obj = cactus(rng);
        } else if (this.zone.theme === 'ants') {
          // Hormigas: tierra seca de cañón, fique, cactus, piedras y algún hormiguero suelto.
          if (r < 0.05) obj = fique(rng);
          else if (r < 0.065) obj = anthill(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.125) obj = cactus(rng);
        } else if (this.zone.theme === 'hides') {
          // La Talabartería (v3.35): caballos criollos, samanes, morichales y comejeneras.
          if (r < 0.02) obj = horse(rng);
          else if (r < 0.045) obj = saman(rng);
          else if (r < 0.07) obj = morichePalm(rng);
          else if (r < 0.09) obj = termiteMound(rng);
        } else if (this.zone.style === 'llanos') {
          // El Hato llanero (v3.34): la sabana con samanes, morichales, comejeneras y garzas.
          if (r < 0.03) obj = saman(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.08) obj = termiteMound(rng);
          else if (r < 0.1) obj = egret(rng);
        } else if (this.zone.theme === 'ranch') {
          // Hato: samanes de sombra para el ganado, fique, piedras y cactus.
          if (r < 0.035) obj = saman(rng);
          else if (r < 0.07) obj = fique(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.115) obj = cactus(rng);
        } else if (this.zone.theme === 'corn') {
          // Maizal: girasoles, matas de maíz sueltas, algún espantapájaros y piedras.
          if (r < 0.04) obj = sunflower(rng);
          else if (r < 0.08) obj = cornClump(rng);
          else if (r < 0.09) obj = scarecrow(rng);
          else if (r < 0.11) obj = rock(rng);
        } else if (this.zone.theme === 'cacao') {
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
          // En Paipa (v3.25), frailejones del páramo donde la Lechería tiene piedras.
          else if (r < 0.11) obj = this.zone.style === 'paipa' && r < 0.1 ? frailejon(rng) : rock(rng);
        } else if (this.zone.theme === 'rice') {
          // Arrozal (v3.15): ceibas grandes, palmas de coco, garzas blancas y plátano.
          if (r < 0.025) obj = ceiba(rng);
          else if (r < 0.06) obj = coconutPalm(rng);
          else if (r < 0.085) obj = egret(rng);
          else if (r < 0.11) obj = banana(rng);
        } else if (this.zone.theme === 'sheep') {
          // Las Ruanas (v3.26): el páramo, con frailejones, piedras, eucaliptos y algún ciprés.
          if (r < 0.04) obj = frailejon(rng);
          else if (r < 0.065) obj = eucalyptus(rng);
          else if (r < 0.09) obj = rock(rng);
          else if (r < 0.1) obj = cypress(rng);
        } else if (this.zone.theme === 'clay') {
          // Ráquira (v3.24): lomas secas con cactus y piedras, eucaliptos y ollas de barro puestas a la venta.
          if (r < 0.03) obj = eucalyptus(rng);
          else if (r < 0.055) obj = cactus(rng);
          else if (r < 0.08) obj = rock(rng);
          else if (r < 0.095) obj = potStand(rng);
        } else if (this.zone.theme === 'barley') {
          // Cebadales (v3.23): eucaliptos, cipreses, pacas de paja y piedras.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.065) obj = cypress(rng);
          else if (r < 0.085) obj = hayBale(rng);
          else if (r < 0.105) obj = rock(rng);
        } else if (this.zone.theme === 'ponds') {
          // La Cachamera (v3.33): garzas, morichales, palos de mango y comejeneras.
          if (r < 0.03) obj = egret(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.075) obj = mangoTree(rng);
          else if (r < 0.09) obj = termiteMound(rng);
        } else if (this.zone.theme === 'fruit') {
          // El Frutal (v3.32): palos de mango, morichales, comejeneras y garzas.
          if (r < 0.035) obj = mangoTree(rng);
          else if (r < 0.055) obj = morichePalm(rng);
          else if (r < 0.075) obj = termiteMound(rng);
          else if (r < 0.09) obj = egret(rng);
        } else if (this.zone.theme === 'plantain' || this.zone.theme === 'azotea') {
          // La Costa Pacífica (v3.38): la selva húmeda, con palmas de chontaduro, borojós, heliconias y plátano suelto.
          if (r < 0.03) obj = chontaduroPalm(rng);
          else if (r < 0.055) obj = borojoTree(rng);
          else if (r < 0.085) obj = heliconia(rng);
          else if (r < 0.11) obj = banana(rng);
        } else if (this.zone.theme === 'palm') {
          // Los Llanos (v3.31): morichales, comejeneras, garzas y alguna palma de aceite suelta.
          if (r < 0.03) obj = morichePalm(rng);
          else if (r < 0.055) obj = termiteMound(rng);
          else if (r < 0.075) obj = egret(rng);
          else if (r < 0.095) obj = oilPalm(rng);
          else if (r < 0.105) obj = saman(rng);
        } else if (this.zone.theme === 'potato') {
          // Altiplano (v3.22): eucaliptos, frailejones del páramo, piedras y algún ciprés.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.07) obj = frailejon(rng);
          else if (r < 0.1) obj = rock(rng);
          else if (r < 0.115) obj = cypress(rng);
        } else if (this.zone.theme === 'canaflecha') {
          // Tierra zenú (v3.19): matas de caña flecha, sombreros a la venta en una vara, samanes y palmas.
          if (r < 0.05) obj = canaFlechaClump(rng);
          else if (r < 0.062) obj = hatPole(rng);
          else if (r < 0.085) obj = saman(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
          else if (r < 0.115) obj = egret(rng);
        } else if (this.zone.theme === 'savanna') {
          // Sabana (v3.18): samanes de sombra, garzas bueyeras, palmas de coco y alguna ceiba.
          if (r < 0.03) obj = saman(rng);
          else if (r < 0.055) obj = egret(rng);
          else if (r < 0.075) obj = coconutPalm(rng);
          else if (r < 0.088) obj = ceiba(rng);
        } else if (this.zone.theme === 'asai' || this.zone.theme === 'aji' || this.zone.theme === 'lake' || this.zone.theme === 'chagra' || this.zone.theme === 'yanchama') {
          // El Amazonas (v3.47): la selva de la orilla, con ceibas gigantes, heliconias, plátano, asaí suelto y alguna
          // guacamaya en su palo.
          if (r < 0.025) obj = ceiba(rng);
          else if (r < 0.05) obj = asaiPalm(rng);
          else if (r < 0.075) obj = heliconia(rng);
          else if (r < 0.095) obj = banana(rng);
          else if (r < 0.105) obj = macaw(rng);
        } else if (this.zone.theme === 'werregue') {
          // El Werregue (v3.42): la selva del río San Juan, con algún tambo wounaan, chontaduros, heliconias y borojós.
          if (r < 0.012) obj = tambo(rng);
          else if (r < 0.04) obj = chontaduroPalm(rng);
          else if (r < 0.065) obj = heliconia(rng);
          else if (r < 0.085) obj = borojoTree(rng);
          else if (r < 0.1) obj = banana(rng);
        } else if (this.zone.theme === 'mangrove') {
          // El Manglar (v3.41): mangles sueltos, garzas, heliconias y palmas de coco.
          if (r < 0.04) obj = mangroveTree(rng);
          else if (r < 0.065) obj = egret(rng);
          else if (r < 0.085) obj = heliconia(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
        } else if (this.zone.theme === 'bay') {
          // La Bahía (v3.40): palmas de coco, piedras de la playa, redes al sol, heliconias y chontaduros.
          if (r < 0.04) obj = coconutPalm(rng);
          else if (r < 0.06) obj = rock(rng);
          else if (r < 0.075) obj = netRack(rng);
          else if (r < 0.095) obj = heliconia(rng);
          else if (r < 0.11) obj = chontaduroPalm(rng);
        } else if (this.zone.theme === 'cienaga') {
          // Ciénaga (v3.17): garzas, redes puestas a secar, ceibas, plátano y palmas de coco.
          if (r < 0.03) obj = egret(rng);
          else if (r < 0.045) obj = netRack(rng);
          else if (r < 0.058) obj = ceiba(rng);
          else if (r < 0.08) obj = banana(rng);
          else if (r < 0.1) obj = coconutPalm(rng);
        } else if (this.zone.theme === 'coconut') {
          // Cocal (v3.16): palmas de coco por todas partes, cocos caídos, plátano y alguna ceiba.
          if (r < 0.06) obj = coconutPalm(rng);
          else if (r < 0.08) obj = coconutPile(rng);
          else if (r < 0.1) obj = banana(rng);
          else if (r < 0.112) obj = ceiba(rng);
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
        if (!obj || !this.isFree(gx, gy, walled ? 0 : 1) || SIGN_CELLS.has(`${gx},${gy}`) || this.wallCells?.has(`${gx},${gy}`)) continue;
        this.occupied.add(`${gx},${gy}`);
        const ox = 0.3 + rng() * 0.4;
        const oy = 0.3 + rng() * 0.4;
        const p = iso(gx + ox, gy + oy);
        obj.position.set(p.x, p.y);
        obj.zIndex = depth(gx + ox, gy + oy);
        obj.grid = [gx + ox, gy + oy]; // (v3.14: los eventos quitan lo que les estorba)
        this.decor.push(obj);
      }
    }
  }
}

// ---------- La plaza de Vélez (v3.29) ----------
// Medidas dentro de la plaza (en casillas, desde su esquina). La nave va a lo largo de gy, con la fachada
// mirando a la pila (hacia +gy, de frente a quien mira el mapa) y la torre a su derecha, sin taparla.
export const CHURCH = {
  nave: { x: 0.7, y: 0.3, w: 1.7, d: 2.15, h: 40, roof: 20 },
  tower: { x: 2.35, y: 1.6, w: 0.95, d: 0.85, h: 104 },
  atrium: { x: 0.3, y: 0.2, w: 3.3, d: 2.75, h: 3 },
};
const CHURCH_WALL = 0xf7f4ee;
const CHURCH_STONE = 0xcdbb94;

// El atrio de piedra, un escalón sobre la plaza, con su grada frente al portón. Va en el suelo: así la
// gente y las mulas siempre se dibujan encima.
export function drawAtrium(g, pz) {
  const { atrium: at, nave } = CHURCH;
  box(g, pz.x + at.x, pz.y + at.y, at.w, at.d, at.h, CHURCH_STONE);
  box(g, pz.x + nave.x + nave.w / 2 - 0.4, pz.y + at.y + at.d, 0.8, 0.3, 1.5, shade(CHURCH_STONE, 0.95));
}

// Un hueco con arco en una pared que mira a +gx (plano gx = at) o a +gy (plano gy = at), de a a b.
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

// Tejado a dos aguas con la cumbrera paralela a gy: el hastial (la fachada) queda en la cara +gy.
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

// La iglesia de una torre: nave blanca con zócalo, tejado de barro, portón con arco, ventana redonda y
// cruz en la fachada; la torre con su campanario (campana y arcos), la cúpula de teja y la cruz.
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
  // El costado: ventanas altas y contrafuertes.
  for (const wy of [0.35, 1.1]) archOn(g, 'x', nx + N.w, ny + wy, ny + wy + 0.28, z + 16, z + 25, 0x6f8fb0);
  for (const by of [0.15, 0.85, 1.55]) box(g, nx + N.w, ny + by, 0.12, 0.15, 24, shade(CHURCH_WALL, 0.97), { z });
  // La fachada: pilastras, portón con arco, la ventana redonda y la cruz en lo alto.
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
  // La torre.
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
  // De noche se alumbran el portón, la ventana redonda y la del costado que no tapa la torre.
  const door = iso(fm, fy, z + 9);
  const win = iso(nx + N.w, ny + 0.49, z + 21);
  glows.push({ x: door.x, y: door.y, r: 20 }, { x: rose.x, y: rose.y, r: 10 }, { x: win.x, y: win.y, r: 9 });
  return c;
}

// La pila de la plaza, con su chorro.
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

// ---------- La ciudad amurallada de Cartagena (v3.45) ----------
const WALL_STONE = 0xcdb88e; // piedra coralina
const WALL_H = 16;
const WALL_T = 0.34; // grueso de la muralla, en casillas

// Un tramo de muralla de (x0, y0) a (x1, y1), recto en gx o en gy: el muro con su zócalo más oscuro, el paseo
// de arriba y las almenas por el lado del mar.
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
  // Hiladas de piedra en la cara que se ve.
  for (const z of [8, 12]) {
    const a = alongX ? iso(x, y + d, z) : iso(x + w, y, z);
    const b = alongX ? iso(x + w, y + d, z) : iso(x + w, y + d, z);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.8, color: shade(WALL_STONE, 0.65), alpha: 0.6 });
  }
  // Almenas por el lado de afuera (el del mar, hacia gx o gy menor).
  const k = Math.max(1, Math.round((alongX ? w : d) / 0.25));
  for (let i = 0; i < k; i += 2) {
    const f = i / k;
    if (alongX) box(g, x + w * f, y, w / k, 0.08, 4, shade(WALL_STONE, 1.05), { z: WALL_H });
    else box(g, x, y + d * f, 0.08, d / k, 4, shade(WALL_STONE, 1.05), { z: WALL_H });
  }
  c.addChild(g);
  return c;
}

// Una puerta en la muralla: los dos estribos más altos y el arco por donde pasa el camino.
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

// La Torre del Reloj: la puerta principal, amarilla, con sus tres arcos, el reloj y la cúpula con la veleta.
// glows: las luces de noche (el reloj se ilumina).
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
  // Los arcos (en la cara que mira al frente).
  for (const f of alongX ? [0.2, 0.5, 0.8] : [0.5]) {
    const p = alongX ? iso(x + w * f, y + d + 0.1, 0) : iso(x + w + 0.1, y + d * f, 0);
    g.moveTo(p.x - 5, p.y).lineTo(p.x - 5, p.y - 12).quadraticCurveTo(p.x, p.y - 20, p.x + 5, p.y - 12).lineTo(p.x + 5, p.y).closePath().fill(0x4a3a2a);
  }
  // El reloj.
  const ck = alongX ? iso(gx, y + d, 37) : iso(x + w, gy, 37);
  g.circle(ck.x, ck.y, 6).fill(0xffffff).stroke(OUTLINE);
  g.moveTo(ck.x, ck.y).lineTo(ck.x, ck.y - 4).moveTo(ck.x, ck.y).lineTo(ck.x + 3, ck.y + 1).stroke({ width: 1, color: 0x263238 });
  glows.push({ x: ck.x, y: ck.y, r: 14, color: 0xfff3c4 });
  // La cúpula y la veleta.
  const top = iso(gx, gy, H + 12);
  g.moveTo(top.x - 9, top.y).quadraticCurveTo(top.x, top.y - 16, top.x + 9, top.y).closePath().fill(0xe0e0e0).stroke(OUTLINE);
  g.moveTo(top.x, top.y - 12).lineTo(top.x, top.y - 22).stroke({ width: 1.2, color: 0x37474f });
  g.poly([top.x, top.y - 22, top.x + 6, top.y - 20, top.x, top.y - 18]).fill(0x37474f);
  c.addChild(g);
  return c;
}

// Garita: la casilla de vigía redonda sobre la muralla, con su cúpula y la ranura para mirar el mar.
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

// Ballena jorobada (v3.54), en un ciclo de 16 s: nada asomando el lomo y echa el chorro, se sumerge
// mostrando la cola y, si salta (breach), sale casi entera del agua y cae con un chapuzón. dir: 1 o -1 (hacia
// dónde nada).
const WHALE = 0x37474f;
function drawWhale(g, t, dir, breach) {
  g.clear();
  const T = 16;
  const u = (((t % T) + T) % T) / T;
  const x = (u - 0.5) * 36 * dir;
  const ripple = (cx, r, a) => g.ellipse(cx, 2, r, r * 0.3).stroke({ width: 1, color: 0xffffff, alpha: a });
  if (u < 0.36) {
    // El lomo, que sube y baja, con la aleta dorsal; al principio, el chorro.
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
    // Se sumerge: la cola sale del agua, con la cara de abajo blanca, y se va hundiendo.
    const f = (u - 0.36) / 0.14;
    const h = Math.sin(f * Math.PI) * 18;
    const cx = x + 10 * dir;
    g.moveTo(cx - 2, 2).lineTo(cx - 1.5, 2 - h + 6).lineTo(cx + 1.5, 2 - h + 6).lineTo(cx + 2, 2).closePath().fill(WHALE);
    g.moveTo(cx, 2 - h + 6).quadraticCurveTo(cx - 8, 2 - h + 2, cx - 14, 2 - h - 4).quadraticCurveTo(cx - 6, 2 - h - 1, cx, 2 - h + 2).quadraticCurveTo(cx + 6, 2 - h - 1, cx + 14, 2 - h - 4).quadraticCurveTo(cx + 8, 2 - h + 2, cx, 2 - h + 6).fill(WHALE).stroke({ width: 0.8, color: 0x263238 });
    g.moveTo(cx - 10, 2 - h - 1.5).quadraticCurveTo(cx - 4, 2 - h + 0.5, cx, 2 - h + 4).quadraticCurveTo(cx + 4, 2 - h + 0.5, cx + 10, 2 - h - 1.5).stroke({ width: 1.4, color: 0xcfd8dc });
    for (let i = 0; i < 4; i++) g.circle(cx - 9 + i * 6, 2 - h - 2 + Math.sin(i * 2 + f * 6) * 2 + f * 6, 1).fill({ color: 0xffffff, alpha: 0.8 * (1 - f) });
    ripple(cx, 10 + f * 10, 0.6 * (1 - f));
  } else if (breach && u > 0.7 && u < 0.84) {
    // El salto: sale de lado, con la aleta larga blanca, y cae.
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
    // El chapuzón.
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

// Velero en la bahía, con la vela blanca.
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

// Lancha de pasajeros, con su toldo azul.
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

// Banca de madera de la plaza.
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

// Color de la tierra de la fuente ilimitada según el tema de la zona.
const FARM_SOIL = {
  cane: (v) => mix(0x9c7a4a, 0x7f6038, v * 0.35),
  dairy: (v) => mix(0x5e9a3c, 0x6fae44, v * 0.5),
  ranch: (v) => mix(0x7fa04a, 0x93ad55, v * 0.5),
  savanna: (v) => mix(0x8fae4e, 0xa3b85a, v * 0.5), // la sabana de Córdoba y Sucre // potrero de tierra caliente, más seco
  cacao: (v) => mix(0x5e4630, 0x4a3726, v * 0.5),
  corn: (v) => mix(0xa47c48, 0x8a6a3a, v * 0.4),
  guava: (v) => mix(0xb8754a, 0x9c5e3a, v * 0.4), // la tierra roja de Santander
  tobacco: (v) => mix(0xb07048, 0x94583a, v * 0.4),
  fique: (v) => mix(0xb8805a, 0x9c6a48, v * 0.4),
  ants: (v) => mix(0xc0784a, 0xa86438, v * 0.4),
  town: (v) => mix(0xc9bfae, 0xb3a893, v * 0.6),
  palm: (v) => mix(0x6a9a3e, 0x7aa848, v * 0.5), // el palmar sobre pasto (v3.31)
  fruit: (v) => mix(0x8a6a44, 0x7a5c3a, v * 0.4), // la tierra de las enramadas (v3.32)
  ponds: (v) => mix(0x4f8f9a, 0x5a9aa0, v * 0.6), // el agua verdosa de los estanques (v3.33)
  llanos: (v) => mix(0x9ab44e, 0xa8bc58, v * 0.5), // la sabana del Hato llanero (v3.34)
  hides: (v) => mix(0xb89a6a, 0xa8885a, v * 0.4), // el patio de tierra del saladero (v3.35)
  plantain: (v) => mix(0x5a4a30, 0x4a3d28, v * 0.5), // la tierra negra y mojada del platanal (v3.38)
  azotea: (v) => mix(0x6a5a3a, 0x5a4a30, v * 0.5), // el patio de las azoteas (v3.39)
  bay: (v) => mix(0x2f86a8, 0x3a94b4, v * 0.6), // el mar de la Bahía (v3.40)
  mangrove: (v) => mix(0x5d5040, 0x6a5c48, v * 0.5), // el barro del manglar (v3.41)
  werregue: (v) => mix(0x4f5a30, 0x5a6638, v * 0.5), // el suelo del palmar de werregue (v3.42)
  asai: (v) => mix(0x4a5236, 0x56603e, v * 0.5), // la vega húmeda del asaizal (v3.47)
  aji: (v) => mix(0x7a5236, 0x6a462e, v * 0.5), // la tierra de la chagra (v3.48)
  lake: (v) => mix(0x2e5048, 0x365a50, v * 0.6), // el agua negra del lago (v3.49)
  chagra: (v) => mix(0x6e4a30, 0x7a5638, v * 0.5), // la tierra de la chagra de yuca (v3.50)
  yanchama: (v) => mix(0x3f4a2e, 0x4a5636, v * 0.5), // el suelo oscuro del monte de yanchamas (v3.51)
  rice: (v) => mix(0x6fa38a, 0x5c9480, v * 0.5),
  coconut: (v) => mix(0xe6d39e, 0xd6c08a, v * 0.5),
  cienaga: (v) => mix(0x4f9aa6, 0x5aa7a8, v * 0.6),
  potato: (v) => mix(0x4a3526, 0x3a291d, v * 0.5),
  sheep: (v) => mix(0x8fa86a, 0x7f9a5c, v * 0.5), // el pasto del páramo
  clay: (v) => mix(0xc0784a, 0xa8653c, v * 0.45), // la greda roja de Ráquira
  barley: (v) => mix(0x8a6a3a, 0x7a5c30, v * 0.5), // la tierra negra del altiplano
  canaflecha: (v) => mix(0xb59a5c, 0xa58a4e, v * 0.4), // la tierra seca de la sabana zenú // el agua de la ciénaga // la arena del golfo de Morrosquillo // el agua del arrozal, verde azulada
  barichara: (v) => mix(0xd9c08c, 0xc4a870, v * 0.6),
  cartagena: (v) => mix(0xe2d2ae, 0xcfbd94, v * 0.6),
  villavo: (v) => mix(0xd9c4a0, 0xc9b088, v * 0.6), // el parque de Villavicencio (v3.36)
  buenaventura: (v) => mix(0xc4c8c8, 0xb0b6b8, v * 0.6), // el malecón de Buenaventura (v3.43)
  villa: (v) => mix(0xb9b2a5, 0xa39b8c, v * 0.6), // la plaza empedrada de Villa de Leyva // la plaza de piedra coralina // la plaza de piedra amarilla
};

// Casita del pueblo: paredes de color, zócalo, tejas de barro, puerta y ventana.
const HOUSE_WALLS = [0xf4efe6, 0xf6d860, 0x9ad0ec, 0xf2a7a0, 0xb8e0a8, 0xf4efe6];
// Barichara (v3.5): casi todas blancas, de tapia pisada.
const BARICHARA_WALLS = [0xf7f4ee, 0xf7f4ee, 0xf7f4ee, 0xf1e6cf];
const HOUSE_TRIMS = [PAL.balconyRed, PAL.balconyBlue, PAL.balconyGreen, PAL.balconyYellow];
// Salento (v3.12): casas blancas de bahareque, de dos pisos, con puertas, ventanas y balcones de colores
// vivos (rojo, azul, verde, amarillo, naranja, morado).
const SALENTO_WALLS = [0xfbf8f1, 0xfbf8f1, 0xf7f4ee];
const SALENTO_TRIMS = [0xd7263d, 0x2e6fd1, 0x2fa36b, 0xf2b705, 0xf07f1d, 0x8e44ad];
// Cartagena (v3.20): casas coloniales de colores fuertes, con balcones de madera y bugambilias.
const CARTAGENA_WALLS = [0xf6c244, 0xf28c9a, 0x6fc3e0, 0xf4a261, 0xb8e0a8, 0xfbf8f1];
const CARTAGENA_TRIMS = [0x7a4a22, 0x7a4a22, 0x2f7d4f, 0x5d3a1e];
// Villa de Leyva (v3.27): casonas blancas de dos pisos con balcones y puertas verdes.
const VILLA_WALLS = [0xfbf8f1, 0xfbf8f1, 0xf7f4ee];
const VILLA_TRIMS = [0x2f7d4f, 0x2f7d4f, 0x1f5a38, 0x5d3a1e];
// Villavicencio (v3.36): casas de colores vivos, de un piso, con remates de otro color.
const VILLAVO_WALLS = [0xf6d860, 0xf28c9a, 0x6fc3e0, 0xb8e0a8, 0xf4a261, 0xfbf8f1];
const VILLAVO_TRIMS = [0x2e6fd1, 0xd7263d, 0x2f7d4f, 0x8e44ad];
// Buenaventura (v3.43): casas de tabla y de ladrillo pintadas de colores vivos, con techo de zinc.
const PUERTO_WALLS = [0x4fb3bf, 0xf2c14e, 0xe5737f, 0x6cbf6c, 0xf08a3c, 0x5c8dd6];
const PUERTO_TRIMS = [0xf7f4ee, 0xf2c14e, 0x2e6fd1, 0xd7263d];
function townHouse(rng, style) {
  const c = new Container();
  const g = new Graphics();
  const cartagena = style === 'cartagena';
  const villa = style === 'villa';
  const salento = style === 'salento' || cartagena || villa; // de dos pisos con balcón
  const villavo = style === 'villavo';
  const puerto = style === 'buenaventura' || style === 'leticia';
  const walls = style === 'barichara' ? BARICHARA_WALLS : cartagena ? CARTAGENA_WALLS : villa ? VILLA_WALLS : villavo ? VILLAVO_WALLS : puerto ? PUERTO_WALLS : salento ? SALENTO_WALLS : HOUSE_WALLS;
  const trims = cartagena ? CARTAGENA_TRIMS : villa ? VILLA_TRIMS : villavo ? VILLAVO_TRIMS : puerto ? PUERTO_TRIMS : salento ? SALENTO_TRIMS : HOUSE_TRIMS;
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
    // El balcón de madera del segundo piso, de otro color, con sus barandas.
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
    // Bugambilias que cuelgan del balcón.
    for (const [dx, dy] of [[-0.35, 0], [-0.2, 3], [0.3, 1]]) {
      const p = iso(dx * w, 0.62, h - 8 - dy);
      g.circle(p.x, p.y, 3).fill(0xd63384);
      g.circle(p.x + 2, p.y + 2, 1.6).fill(0x4e8a33);
    }
  }
  c.addChild(g);
  return c;
}

// Guayacán florecido: copa redonda amarilla o rosada.
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

// Farol de la calle.
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

// Girasol: tallo alto, hojas y flor amarilla mirando al frente.
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

// Espantapájaros con sombrero vueltiao y ruana.
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

// Mata de maíz: caña alta con hojas largas, espiga arriba y mazorcas. La usa también el Maizal.
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

// Mata de tabaco: tallo derecho con hojas anchas en pisos y, arriba, el ramillete de flores rosadas.
export function drawTobaccoPlant(g, x, y, scale, rng, flowers) {
  const s = scale;
  const h = (20 + rng() * 6) * s;
  shadow(g, x + 2, y + 1, 11 * s, 4 * s);
  g.moveTo(x, y).lineTo(x, y - h).stroke({ width: 1.6 * s, color: 0x7cb342 });
  // Hojas anchas y caídas, más grandes abajo; se alternan a cada lado.
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

// Fique: una roseta de hojas largas, gruesas y en punta, verde azulada.
// Hormiguero de hormiga culona: un montículo de tierra roja con sus bocas (v3.4).
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

// Cactus del cañón del Chicamocha: un tallo con dos brazos.
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
// coat (v3.3): pelaje { body, spots, udder }; sin él, la Holstein de la Lechería.
const HOLSTEIN = { body: 0xfbf8f1, legs: 0xf4f1e8, spots: 0x2b2b2b, udder: true };
export function drawCow(g, x, y, scale, rng, flip = false, coat = HOLSTEIN) {
  if (coat.sheep) return drawSheep(g, x, y, scale * 0.85, rng, flip, coat);
  const f = flip ? -1 : 1;
  const s = scale;
  shadow(g, x, y + 1, 13 * s, 4 * s);
  // Patas.
  for (const lx of [-7, -3, 4, 8]) g.rect(x + lx * s * f - 1, y - 7 * s, 2 * s, 7 * s).fill(coat.legs).stroke({ width: 0.8, color: 0x3a2418, alpha: 0.5 });
  // Cuerpo con manchas.
  g.roundRect(x - 10 * s, y - 15 * s, 20 * s, 9 * s, 4 * s).fill(coat.body).stroke({ width: 1.2, color: 0x3a2418, alpha: 0.6 });
  for (let i = 0; i < 3; i++) g.ellipse(x + (-5 + i * 5 + rng() * 2) * s * f, y - (10 + rng() * 3) * s, (2 + rng() * 2) * s, (1.5 + rng()) * s).fill(coat.spots);
  // La giba del cebú (v3.18), sobre los hombros.
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

// Oveja (v3.26): cuerpo de lana en bolitas, cara y patas oscuras. La usan las Ruanas en vez de vacas.
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

// Mata de arroz (v3.15): un macollo de hojas delgadas que salen del agua; con más hitos, espigas doradas.
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
  // Espigas: se doblan con el peso del grano.
  for (let i = 0; i < ears; i++) {
    const ex = x + (i - (ears - 1) / 2) * 3.2 * s;
    const ey = y - (14 + (i % 2) * 2) * s;
    g.moveTo(ex, ey + 3 * s).quadraticCurveTo(ex + 1 * s, ey - 2 * s, ex + 4 * s, ey + 1 * s).stroke({ width: 1.8 * s, color: 0xe0b84a, cap: 'round' });
  }
}

// Ceiba: tronco grueso con bambas (raíces de tabla) y una copa ancha y plana, la sombra de la Costa.
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

// Palma de coco: tronco curvo y anillado, hojas largas que cuelgan y un racimo de cocos. La usa también
// el Cocal (v3.16), más bajita, con más cocos verdes en cada hito.
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

// Mata de plátano (v3.38): el tallo verde amarillento, las hojas grandes (alguna rasgada por el viento) y,
// con cada hito, el racimo que cuelga con su bellota morada.
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

// Azotea (v3.39): la canoa vieja alzada en cuatro pilotes, llena de tierra, con las hierbas de cocina; con
// cada hito, más matas y las flores moradas de la albahaca.
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

// Mangle (v3.41): la copa verde oscura sobre el tronco y las raíces zancudas que se abren hasta el barro.
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

// Palma de werregue (v3.42): el tronco erizado de espinas negras y la corona de hojas; con cada hito, el
// cogollo tierno, claro, que se corta para sacar la fibra.
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

// Tambo wounaan (v3.42): la casa redonda sobre pilotes, abierta, con el techo cónico de palma.
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

// Mata de ají (v3.48): el arbusto de hojas verdes con los ajíes rojos, amarillos y morados; más con cada hito.
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

// Árbol de yanchama (v3.51): el tronco liso y claro con las raíces de tabla y la copa ancha; con cada hito
// crece, y a algunos ya se les sacó una tira de corteza (la herida clara en el tronco).
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

// Mata de yuca (v3.50): el tallo de nudos, delgado y alto, con las hojas palmeadas de dedos largos arriba; con
// cada hito, más tallos y alguna raíz que asoma en la tierra.
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

// Palma de asaí (v3.47): la mata de dos o tres tallos delgados y altos, con las hojas de plumas que cuelgan y,
// con cada hito, más racimos morados bajo la corona.
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

// Guacamaya (v3.47): la roja, amarilla y azul, parada en un palo seco.
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

// Palma de chontaduro (v3.38): el tronco delgado con sus anillos de espinas, las hojas de plumas y los racimos
// de chontaduro rojo y anaranjado.
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

// Borojó (v3.38): arbolito de hojas grandes y redondas con los borojós, pardos y redondos, pegados a las ramas.
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

// Palma de aceite (v3.31): tronco grueso y corto con las bases de las hojas, la corona de hojas largas
// que se arquean y los racimos rojos pegados al tronco (más con cada hito).
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

// Palma de moriche (v3.31): la del morichal llanero, alta y derecha, con la corona de hojas en abanico.
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

// Comejenera (v3.31): el montículo de tierra roja de los comejenes, en la sabana.
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

// Enramada de maracuyá (v3.32): dos postes con el alambre, la enredadera encima y los maracuyás amarillos
// que cuelgan (más con cada hito).
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

// Palo de mango (v3.32): copa grande y redonda, de un verde oscuro, con mangos amarillos y rojizos.
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

// Estanques de cachama (v3.33): cada casilla del agua, con los bordos de tierra cada dos casillas, ondas y,
// de vez en cuando, el lomo de una cachama que sale a comer.
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

// Cuero templado en su marco (v3.35): cuatro palos, el cuero de res amarrado con cabuya, secándose con sal.
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

// Caballo criollo (v3.35): de lado, pastando o parado, alazán, bayo o tordillo.
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

// Montón de greda (v3.24): la arcilla roja recién sacada, con su pala clavada (más alto con cada hito).
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

// Ollas de barro puestas a la venta en una tabla, a la orilla del camino (v3.24).
function potStand(rng) {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 1, 14, 4);
  g.rect(-13, -6, 26, 3).fill(0x8b5a2b);
  for (const [dx, dy] of [[-12, -4], [12, -4]]) g.rect(dx - 1, dy, 2, 6).fill(0x5e3b1c);
  const colors = [0x4e342e, 0xd9772e, 0xb5653a];
  for (let k = 0; k < 3; k++) {
    const cx = -8 + k * 8;
    g.ellipse(cx, -11, 4.5, 5).fill(colors[(k + Math.floor(rng() * 3)) % 3]).stroke({ width: 0.6, color: 0x3a2418, alpha: 0.6 });
    g.ellipse(cx, -15.5, 2.6, 1).fill(0x3e2723);
  }
  c.addChild(g);
  return c;
}

// Mata de cebada (v3.23): tallos delgados con las espigas doradas y sus barbas (más doradas con los hitos).
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

// Mata de papa (v3.22): ramillete de hojas verdes con flores blancas y moradas (más con cada hito).
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

// Frailejón (v3.22): tronco grueso y peludo con la roseta de hojas plateadas, la planta del páramo.
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

// Mata de caña flecha (v3.19): hojas largas en abanico, con alguna espiga plumosa.
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

// Sombreros vueltiaos colgados de una vara, como los venden a la orilla de la carretera.
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

// Atarraya puesta a secar entre dos varas.
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

// Montoncito de cocos verdes recién bajados, al pie de las palmas.
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

// Garza blanca: patas largas, cuerpo blanco y el cuello en S, como las que andan por los arrozales.
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
