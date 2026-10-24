// La persona de cada zona en el mapa (v3.12): Don Jairo, Doña Inés… paran junto al letrero de la zona.
// Tocarla la hace hablar (ver ui/Chatter.js: talk). Encima lleva su cara (el emoji de PEOPLE) y su nombre,
// y se mece un poco para que se note que se puede tocar.
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
    // La cara la pone el emoji, encima.
    this.face = new Text({ text: p.icon, style: { fontSize: 20 }, resolution: 3 });
    this.face.anchor.set(0.5);
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
