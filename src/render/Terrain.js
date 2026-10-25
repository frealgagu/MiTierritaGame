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
  return tiles;
}

export class Terrain {
  constructor(zone, jeeps = 1) {
    this.zone = zone;
    this.tiles = buildTileMap(zone, jeeps);
    this.ground = new Graphics();
    this.decor = []; // objetos altos que se ordenan por profundidad junto al resto
    this.occupied = new Set(); // casillas con decoración (`gx,gy`): la gente no las atraviesa
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
        else if (type === 'farm') color = (FARM_SOIL[this.zone.style] ?? FARM_SOIL[this.zone.theme])?.(v) ?? mix(PAL.soil, 0x6e4529, v * 0.35);
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
        if (type === 'farm' && this.zone.theme === 'town') {
          // Plaza empedrada.
          for (let k = 0; k < 4; k++) {
            const p = iso(gx + 0.25 + (k % 2) * 0.5, gy + 0.25 + Math.floor(k / 2) * 0.5);
            const stones = this.zone.style === 'barichara' ? [0xc9a96b, 0xe0c890] : this.zone.style === 'cartagena' ? [0xc9b48a, 0xe2d2ae] : [0xa39b8c, 0xd2cbbd]; // piedra amarilla en Barichara; coralina en Cartagena
            g.ellipse(p.x, p.y, 7, 3.5).fill({ color: rng() < 0.5 ? stones[0] : stones[1], alpha: 0.8 });
          }
        } else if (type === 'farm' && this.zone.theme === 'cacao') {
          // Hojarasca bajo los cacaos.
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
        } else if (type === 'farm' && (this.zone.theme === 'dairy' || this.zone.theme === 'ranch' || this.zone.theme === 'savanna')) {
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
        if (!this.isFree(gx, gy, 1, base)) continue;
        const r = rng();
        let obj = null;
        if (this.zone.theme === 'town') {
          // Pueblo: casitas de colores, guayacanes florecidos, faroles y alguna palma de cera. En Salento
          // (v3.12), más palmas de cera, las del valle de Cocora (los mismos números de rng: el resto del
          // mapa no se mueve).
          const salento = this.zone.style === 'salento';
          const cartagena = this.zone.style === 'cartagena';
          if (r < 0.06) obj = townHouse(rng, this.zone.style);
          else if (r < 0.09) obj = salento && r < 0.075 ? palm(rng) : cartagena ? coconutPalm(rng) : guayacan(rng);
          else if (r < 0.105) obj = streetLamp();
          else if (r < (salento || cartagena ? 0.135 : 0.12)) obj = cartagena ? coconutPalm(rng) : palm(rng);
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
          else if (r < 0.11) obj = rock(rng);
        } else if (this.zone.theme === 'rice') {
          // Arrozal (v3.15): ceibas grandes, palmas de coco, garzas blancas y plátano.
          if (r < 0.025) obj = ceiba(rng);
          else if (r < 0.06) obj = coconutPalm(rng);
          else if (r < 0.085) obj = egret(rng);
          else if (r < 0.11) obj = banana(rng);
        } else if (this.zone.theme === 'barley') {
          // Cebadales (v3.23): eucaliptos, cipreses, pacas de paja y piedras.
          if (r < 0.04) obj = eucalyptus(rng);
          else if (r < 0.065) obj = cypress(rng);
          else if (r < 0.085) obj = hayBale(rng);
          else if (r < 0.105) obj = rock(rng);
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
        if (!obj || !this.isFree(gx, gy) || SIGN_CELLS.has(`${gx},${gy}`)) continue;
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
  rice: (v) => mix(0x6fa38a, 0x5c9480, v * 0.5),
  coconut: (v) => mix(0xe6d39e, 0xd6c08a, v * 0.5),
  cienaga: (v) => mix(0x4f9aa6, 0x5aa7a8, v * 0.6),
  potato: (v) => mix(0x4a3526, 0x3a291d, v * 0.5),
  barley: (v) => mix(0x8a6a3a, 0x7a5c30, v * 0.5), // la tierra negra del altiplano
  canaflecha: (v) => mix(0xb59a5c, 0xa58a4e, v * 0.4), // la tierra seca de la sabana zenú // el agua de la ciénaga // la arena del golfo de Morrosquillo // el agua del arrozal, verde azulada
  barichara: (v) => mix(0xd9c08c, 0xc4a870, v * 0.6),
  cartagena: (v) => mix(0xe2d2ae, 0xcfbd94, v * 0.6), // la plaza de piedra coralina // la plaza de piedra amarilla
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
function townHouse(rng, style) {
  const c = new Container();
  const g = new Graphics();
  const cartagena = style === 'cartagena';
  const salento = style === 'salento' || cartagena; // las dos, de dos pisos con balcón
  const walls = style === 'barichara' ? BARICHARA_WALLS : cartagena ? CARTAGENA_WALLS : salento ? SALENTO_WALLS : HOUSE_WALLS;
  const trims = cartagena ? CARTAGENA_TRIMS : salento ? SALENTO_TRIMS : HOUSE_TRIMS;
  const wall = walls[Math.floor(rng() * walls.length)];
  const trim = trims[Math.floor(rng() * trims.length)];
  const w = 0.8 + rng() * 0.2;
  const h = (20 + rng() * 8) + (salento ? 8 : 0);
  shadow(g, 6, 6, 30, 12);
  box(g, -w / 2, -0.45, w, 0.9, 6, trim);
  box(g, -w / 2, -0.45, w, 0.9, h - 6, wall, { z: 6 });
  gableRoof(g, -w / 2, -0.45, w, 0.9, h, 10, PAL.roof, wall);
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

function coconutPalm(rng) {
  const c = new Container();
  const g = new Graphics();
  drawCoconutPalm(g, 0, 0, 1, rng);
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
