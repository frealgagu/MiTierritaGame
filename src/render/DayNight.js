// Day and night (GDD §8): 1 day = 8 game minutes. Work hours live in sim/calendar.js;
// this module handles visuals only.
import { mix } from './iso.js';
import { hourOf } from '../sim/calendar.js';

export { DAY_LENGTH, hourOf } from '../sim/calendar.js';

const WHITE = 0xffffff;
// World tint across day (hour → multiplicative color).
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
// Artificial light intensity (windows, streetlamps, fireflies).
const LIGHTS = [
  [0, 1],
  [5.2, 1],
  [6.6, 0],
  [17.6, 0],
  [19.6, 1],
  [24, 1],
];
// Sky (top, bottom).
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
  return `${icon} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// Applies time of day to scene: world and background tint, lights, and CSS sky.
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
