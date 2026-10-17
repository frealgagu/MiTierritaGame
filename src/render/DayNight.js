// Día y noche decorativo (GDD §8): 1 día = 8 minutos de juego. No afecta a la economía.
import { mix } from './iso.js';

export const DAY_LENGTH = 480; // s
const START_HOUR = 8; // una partida nueva empieza por la mañana

const WHITE = 0xffffff;
// Tinte del mundo a lo largo del día (hora → color que multiplica).
const TINT = [
  [0, 0x5560a0],
  [4.5, 0x5560a0],
  [6, 0xc9a8c8],
  [7.3, 0xffe6cc],
  [8.5, WHITE],
  [16.5, WHITE],
  [17.8, 0xffd2a0],
  [18.8, 0xe89a8a],
  [19.8, 0x7d75b0],
  [20.8, 0x5560a0],
  [24, 0x5560a0],
];
// Intensidad de las luces (ventanas, faroles, luciérnagas).
const LIGHTS = [
  [0, 1],
  [5.2, 1],
  [6.6, 0],
  [17.6, 0],
  [19.6, 1],
  [24, 1],
];
// Cielo (arriba, abajo).
const SKY = [
  [0, [0x0e1433, 0x2b2d5b]],
  [4.5, [0x0e1433, 0x2b2d5b]],
  [6, [0x6c7bb8, 0xf2b38a]],
  [7.5, [0x9fd3ec, 0xf6dcc0]],
  [9, [0x9fd3ec, 0xe8f4e4]],
  [16.5, [0x9fd3ec, 0xe8f4e4]],
  [18, [0xf6b26b, 0xf3d9b1]],
  [19, [0xc8553d, 0x6c5b9b]],
  [20.3, [0x1b2350, 0x3b3570]],
  [24, [0x0e1433, 0x2b2d5b]],
];

export function hourOf(playTime) {
  return (START_HOUR + (playTime / DAY_LENGTH) * 24) % 24;
}

function sample(keys, h, lerp) {
  for (let i = 1; i < keys.length; i++) {
    const [h1, v1] = keys[i];
    const [h0, v0] = keys[i - 1];
    if (h <= h1) return lerp(v0, v1, (h - h0) / (h1 - h0));
  }
  return keys.at(-1)[1];
}

const lerpNum = (a, b, t) => a + (b - a) * t;
const lerpPair = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

export function tintAt(h) {
  return sample(TINT, h, mix);
}

export function lightAt(h) {
  return sample(LIGHTS, h, lerpNum);
}

export function skyAt(h) {
  return sample(SKY, h, lerpPair);
}

export function clockLabel(h) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 6) * 10;
  const icon = h >= 5.5 && h < 7.5 ? '🌅' : h >= 7.5 && h < 17.5 ? '☀️' : h >= 17.5 && h < 19.5 ? '🌇' : '🌙';
  return `${icon} ${hh}:${String(mm).padStart(2, '0')}`;
}

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// Aplica el momento del día a la escena: tinte del mundo y del fondo, luces y cielo CSS.
export class DayNight {
  constructor(scene) {
    this.scene = scene;
    this.lastSky = '';
  }

  update(playTime) {
    const h = hourOf(playTime);
    const tint = tintAt(h);
    const light = lightAt(h);
    const s = this.scene;
    s.tinted.tint = tint;
    s.background.view.tint = mix(tint, WHITE, 0.25);
    s.background.setNight(light);
    s.lights.alpha = light;
    s.lights.visible = light > 0.01;
    this.light = light;
    this.hour = h;

    const [top, bottom] = skyAt(h);
    const sky = `linear-gradient(180deg, ${hex(top)} 0%, ${hex(bottom)} 70%)`;
    if (sky !== this.lastSky) {
      this.lastSky = sky;
      document.body.style.background = sky;
    }
    return h;
  }
}
