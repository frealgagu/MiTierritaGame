// La persona de cada zona en el mapa (v3.12): Don Jairo, Doña Inés… paran junto al letrero de la zona.
// Tocarla la hace hablar (ver ui/Chatter.js: talk). Encima lleva su nombre, y se mece un poco para que se
// note que se puede tocar. La cabeza se dibuja (v3.65.1) a partir de su emoji de PEOPLE (piel, pelo, barba,
// sombrero): antes era el emoji mismo, y en muchos Android (los Samsung, por ejemplo) el emoji trae cuello y
// hombros y quedaba corrido sobre el cuerpo.
import { Container, Graphics, Text } from 'pixi.js';
import { iso, depth } from './iso.js';
import { FONT } from './palette.js';
import { shadow } from './procedural/shapes.js';
import { PEOPLE } from '../data/lore.js';

const THIN = { width: 1, color: 0x3a2418, alpha: 0.7 };
// Camisa de cada uno (por zona), para que no se vean todos iguales.
const SHIRTS = [0xd7263d, 0x2e6fd1, 0x2fa36b, 0xf2b705, 0x8e44ad, 0xf07f1d];
// Dónde se para: al lado izquierdo del letrero de la zona (ver Terrain: ZONE_SIGN).
export const KEEPER_SPOT = [16.5, 22.8];

export class KeeperView extends Container {
  constructor(zoneId, index = 0) {
    super();
    const p = PEOPLE[zoneId];
    this.body = new Graphics();
    const g = this.body;
    const shirt = SHIRTS[index % SHIRTS.length];
    shadow(g, 0, 0, 9, 3.5);
    g.rect(-3.6, -14, 3, 14).fill(0x3d3d5c).stroke(THIN);
    g.rect(0.6, -14, 3, 14).fill(0x3d3d5c).stroke(THIN);
    g.roundRect(-5, -28, 10, 15, 3).fill(shirt).stroke(THIN);
    g.moveTo(-5, -25).lineTo(-6.5, -16).moveTo(5, -25).lineTo(7.5, -18).stroke({ width: 2.4, color: 0xc68a5b });
    this.face = new Graphics();
    drawHead(this.face, headOf(p.icon));
    this.face.position.set(0, -36);
    // El nombre, en una etiqueta.
    const name = new Text({ text: p.name, style: { fontFamily: FONT, fontSize: 9, fontWeight: '700', fill: 0xfff3d6 }, resolution: 3 });
    name.anchor.set(0.5);
    const tag = new Graphics();
    const w = name.width + 10;
    tag.roundRect(-w / 2, -60, w, 13, 6).fill({ color: 0x3a2418, alpha: 0.85 });
    name.position.set(0, -53.5);
    // Burbuja de «tengo algo que decir».
    this.bubble = new Text({ text: '💬', style: { fontSize: 14 }, resolution: 3 });
    this.bubble.anchor.set(0.5);
    this.bubble.position.set(13, -46);
    this.addChild(g, this.face, tag, name, this.bubble);
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = { contains: (x, y) => x > -16 && x < 16 && y > -62 && y < 4 };
  }

  place(gx, gy) {
    const p = iso(gx, gy);
    this.position.set(p.x, p.y);
    this.zIndex = depth(gx, gy) + 0.3;
  }

  // talk: si tiene algo que decir (se mece la burbuja).
  update(t, talk = true) {
    this.bubble.visible = talk;
    this.bubble.y = -46 - Math.abs(Math.sin(t * 3)) * 3;
    this.body.rotation = Math.sin(t * 1.3) * 0.03;
  }
}

// Cómo es la cabeza según el emoji: piel (el modificador de tono), quién es (mujer, hombre, con barba,
// abuela, abuelo, vaquero) y el oficio o el pelo que lleva unido (🌾 campesino, 🍳 cocinera, 🦱 rizado, 🦳 canoso).
const SKINS = { '🏻': 0xf3d0b0, '🏼': 0xe2b48a, '🏽': 0xc68642, '🏾': 0x8d5524, '🏿': 0x5c3a21 };
export function headOf(icon) {
  const parts = [...icon];
  const tone = parts.find((c) => SKINS[c]);
  const base = parts[0];
  const has = (c) => parts.includes(c);
  const old = ['👴', '👵', '🧓'].includes(base);
  const woman = ['👩', '👵'].includes(base);
  return {
    skin: SKINS[tone] ?? 0xe0ac69,
    woman,
    old,
    bun: base === '👵',
    beard: base === '🧔',
    hair: has('🦳') || old ? 0xe6e6e6 : 0x3b2416,
    curly: has('🦱'),
    hat: base === '🤠' ? 'vaquero' : has('🌾') ? 'aguadeño' : has('🍳') ? 'cocina' : null,
  };
}

// La cabeza, centrada en (0, 0): unos 15 px de alto, como la del emoji que reemplaza.
function drawHead(g, h) {
  const LINE = { width: 1, color: 0x3a2418, alpha: 0.7 };
  // Pelo largo (detrás de la cabeza) o rizado.
  if (h.woman && !h.old) g.roundRect(-8, -6, 16, 13, 5).fill(h.hair).stroke(LINE);
  if (h.curly) for (const [x, y] of [[-6.5, -4], [6.5, -4], [-7, 1], [7, 1], [-4, -7.5], [0, -8.5], [4, -7.5]]) g.circle(x, y, 3.2).fill(h.hair);
  // Cuello y cara.
  g.rect(-2, 5, 4, 3).fill(h.skin);
  g.circle(0, 0, 7).fill(h.skin).stroke(LINE);
  // Pelo de arriba: el abuelo, solo a los lados (calvo arriba); los demás, un casquete.
  if (h.old && !h.woman) {
    g.ellipse(-6.2, -1, 2.2, 3.4).fill(h.hair);
    g.ellipse(6.2, -1, 2.2, 3.4).fill(h.hair);
  } else if (!h.curly) {
    g.moveTo(-7, -0.5).arc(0, -0.5, 7, Math.PI, 0).quadraticCurveTo(2, -4.5, -7, -0.5).fill(h.hair);
  }
  if (h.bun) g.circle(0, -8.5, 3).fill(h.hair).stroke(LINE);
  // Barba.
  if (h.beard) g.moveTo(-6.5, 1).quadraticCurveTo(0, 11, 6.5, 1).quadraticCurveTo(0, 5.5, -6.5, 1).fill(h.hair);
  // Ojos, mejillas y sonrisa.
  g.circle(-2.6, 0.6, 0.9).fill(0x2b1d14);
  g.circle(2.6, 0.6, 0.9).fill(0x2b1d14);
  g.circle(-4.2, 2.6, 1.1).fill({ color: 0xe57373, alpha: 0.35 });
  g.circle(4.2, 2.6, 1.1).fill({ color: 0xe57373, alpha: 0.35 });
  if (!h.beard) g.moveTo(-2, 3.4).quadraticCurveTo(0, 5.2, 2, 3.4).stroke({ width: 0.9, color: 0x5d3a1a });
  else g.moveTo(-1.6, 3.8).quadraticCurveTo(0, 4.8, 1.6, 3.8).stroke({ width: 0.9, color: 0xf4d6c0 });
  // Sombreros.
  if (h.hat === 'vaquero') {
    g.ellipse(0, -4.5, 11, 2.6).fill(0x8b5a2b).stroke(LINE);
    g.roundRect(-5, -11.5, 10, 7.5, 3).fill(0x8b5a2b).stroke(LINE);
    g.rect(-5, -6.5, 10, 1.4).fill(0x4e342e);
  } else if (h.hat === 'aguadeño') {
    g.ellipse(0, -4.5, 11, 2.6).fill(0xf4efe6).stroke(LINE);
    g.roundRect(-4.6, -11, 9.2, 7, 2).fill(0xf4efe6).stroke(LINE);
    g.rect(-4.6, -6.6, 9.2, 1.6).fill(0x222222);
  } else if (h.hat === 'cocina') {
    g.rect(-5, -8.5, 10, 4).fill(0xffffff).stroke(LINE);
    for (const x of [-3.5, 0, 3.5]) g.circle(x, -10.5, 3.4).fill(0xffffff).stroke(LINE);
    g.rect(-4.6, -8.2, 9.2, 3.4).fill(0xffffff);
  }
}

