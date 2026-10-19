import { Graphics } from 'pixi.js';
import { seasonOf } from '../sim/calendar.js';

// Lluvia (v1.9): en la entrada de aguas caen aguaceros de vez en cuando y en invierno llueve casi todo
// el tiempo; en verano y veranillo no. Es solo de ver: la temporada ya cambia la producción por su
// cuenta. Va encima del mapa, en coordenadas de pantalla.
const RAIN = { entrada: { base: 0.6, from: 0.35 }, invierno: { base: 1, from: -0.35 } };
const MAX_DROPS = 160;

// Qué tanto llueve ahora (0..1): aguaceros que van y vienen con el tiempo de juego.
// playTime null: sin lluvia (el tablero de un evento).
export function rainAt(playTime) {
  if (playTime === null) return 0;
  const r = RAIN[seasonOf(playTime).id];
  if (!r) return 0;
  const wave = (Math.sin(playTime / 41) + Math.sin(playTime / 67 + 1.3)) / 2;
  return r.base * Math.min(1, Math.max(0, (wave - r.from) / 0.3));
}

export class Weather {
  constructor() {
    this.view = new Graphics();
    this.view.eventMode = 'none';
    this.drops = [];
    this.amount = 0;
  }

  update(dt, playTime, w, h) {
    // Sube y baja poco a poco, aunque el tiempo vaya acelerado.
    const target = rainAt(playTime);
    this.amount += (target - this.amount) * Math.min(1, dt * 0.8);
    const g = this.view.clear();
    if (this.amount < 0.02) {
      this.drops.length = 0;
      return;
    }
    g.rect(0, 0, w, h).fill({ color: 0x3a4a5a, alpha: 0.12 * this.amount });
    const want = Math.round(MAX_DROPS * this.amount);
    while (this.drops.length < want) this.drops.push({ x: Math.random() * w, y: Math.random() * h, v: 650 + Math.random() * 250, len: 10 + Math.random() * 8 });
    if (this.drops.length > want) this.drops.length = want;
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.x -= d.v * 0.18 * dt;
      if (d.y > h || d.x < 0) {
        d.y = -d.len;
        d.x = Math.random() * (w + 60);
      }
      g.moveTo(d.x, d.y).lineTo(d.x - d.len * 0.18, d.y + d.len);
    }
    g.stroke({ width: 1.2, color: 0xcfe3f5, alpha: 0.55 });
  }
}
