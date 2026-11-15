// Grand finale (v5.9): once every achievement is earned, the keeper of every zone congratulates the player,
// region by region, each with their own accent (data/finale.js), over a piece of music made only for it
// (GRAN_FINAL in audio/songs.js). Self-contained: brings its own styles and music player, so it also runs
// outside the game (tools/finale-artifact.js).
//   playGrandFinale({ t, onClose, volume, beforeMusic, afterMusic })
//     t: translator for texts (identity by default); volume: 0..1 music volume;
//     beforeMusic / afterMusic: called to quiet the game's own music and bring it back.
// Tap a keeper: what they say. Tap elsewhere: next keeper. Flipped ⏩: previous region. ⏩: next region. ✕: close.
// At the end everyone gathers, the crowd moves away and the map of Colombia shows fireworks over every region's
// capital (its last zone).
import { Application, Container, Graphics } from 'pixi.js';
import { KeeperView } from '../render/Keeper.js';
import { PEOPLE } from '../data/lore.js';
import { REGIONS } from '../data/regions.js';
import { FINALE_LINES, FINALE_TEXT } from '../data/finale.js';
import { GRAN_FINAL } from '../audio/songs.js';
import { createSong, normalize, renderBar } from '../audio/compose.js';
import { DEPARTMENTS } from '../data/colombiaMap.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGION_COLORS, ZONE_POS } from './mapLayout.js';

// Background of each region's scene: sky on top, land at the bottom.
const SKIES = {
  cafetero: ['#9fd3ec', '#7cbf6a'],
  santander: ['#f6c98b', '#c8794a'],
  costa: ['#7fd6f0', '#f2d58a'],
  boyaca: ['#bcd7ee', '#8cae6b'],
  llanos: ['#ffd27a', '#a9c25d'],
  pacifico: ['#8fd0c9', '#2f8f6b'],
  amazonas: ['#a7dfb2', '#2e7d4f'],
  tolima: ['#ffc4a3', '#d9a05b'],
  cundinamarca: ['#c9e3f5', '#86b36a'],
  bogota: ['#cfd8e6', '#9aa6b8'],
  sanandres: ['#7fe0ef', '#2fb3c9'],
};
const CONFETTI = ['#f2b705', '#2e6fd1', '#d7263d', '#2fa36b', '#ff7f50', '#8e44ad'];
const RATE = 32000;

const CSS = `
.gf { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; align-items: center; overflow: hidden;
  font-family: 'MiTierrita Icons', Fredoka, 'Baloo 2', system-ui, sans-serif; color: #3a2418; transition: background 0.8s; user-select: none; -webkit-user-select: none; }
.gf [hidden] { display: none !important; }
.gf canvas.gf-confetti { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.gf-top { position: relative; width: min(720px, 100%); padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 0; display: flex; align-items: center; gap: 8px; }
.gf-title { flex: 1; font-size: 1.1rem; font-weight: 700; text-shadow: 0 1px 0 #fff8; }
.gf-btn { border: 2px solid #3a2418; border-radius: 12px; background: #fff3d6; color: #3a2418; font: inherit; font-weight: 700; min-height: 36px; padding: 2px 12px; cursor: pointer; }
.gf-region { position: relative; margin-top: 6px; padding: 4px 18px; border: 3px solid #3a2418; border-radius: 999px; background: #fffaf0; font-size: clamp(1.1rem, 4.5vw, 1.6rem); font-weight: 700; box-shadow: 0 3px 0 #3a2418; animation: gf-pop 0.45s ease-out; }
.gf-bubble { position: relative; box-sizing: border-box; width: min(560px, calc(100% - 28px)); min-height: 6.2em; margin-top: 12px; padding: 10px 14px; border: 3px solid #3a2418; border-radius: 18px; background: #fffaf0; box-shadow: 0 3px 0 #3a2418; font-size: clamp(0.95rem, 3.6vw, 1.2rem); line-height: 1.3; }
.gf-bubble::after { content: ''; position: absolute; left: var(--tail, 50%); bottom: -14px; width: 18px; height: 18px; background: #fffaf0; border-right: 3px solid #3a2418; border-bottom: 3px solid #3a2418; transform: translateX(-50%) rotate(45deg); transition: left 0.3s; }
.gf-bubble.gf-off { visibility: hidden; }
/* The intro is a cloud: nobody says it, so it has no tail. Puffs are circles drawn behind the text and
   outlined together by the stacked drop shadows. */
.gf-bubble.gf-cloud { isolation: isolate; border-color: transparent; background: none; box-shadow: none; text-align: center; display: flex; align-items: center; justify-content: center; margin-top: 34px; padding: 14px 44px; }
.gf-bubble.gf-cloud::after { display: none; }
.gf-bubble.gf-cloud::before { content: ''; position: absolute; inset: -12px 12px -8px; z-index: -1; --c: #fffaf0;
  background: radial-gradient(ellipse 47% 40% at 50% 56%, var(--c) 99%, transparent),
    radial-gradient(circle 38px at 20% 36%, var(--c) 98%, transparent), radial-gradient(circle 50px at 40% 26%, var(--c) 98%, transparent),
    radial-gradient(circle 46px at 61% 28%, var(--c) 98%, transparent), radial-gradient(circle 36px at 80% 40%, var(--c) 98%, transparent),
    radial-gradient(circle 32px at 9% 58%, var(--c) 98%, transparent), radial-gradient(circle 32px at 91% 60%, var(--c) 98%, transparent),
    radial-gradient(circle 34px at 27% 76%, var(--c) 98%, transparent), radial-gradient(circle 38px at 50% 80%, var(--c) 98%, transparent),
    radial-gradient(circle 32px at 72% 76%, var(--c) 98%, transparent);
  filter: drop-shadow(2.5px 0 0 #3a2418) drop-shadow(-2.5px 0 0 #3a2418) drop-shadow(0 2.5px 0 #3a2418) drop-shadow(0 -2.5px 0 #3a2418) drop-shadow(0 3px 0 rgba(58, 36, 24, 0.6));
  animation: gf-float 4s ease-in-out infinite alternate; }
@keyframes gf-float { to { transform: translateY(-4px); } }
.gf-bubble b { display: block; font-size: 0.85em; opacity: 0.8; }
.gf-bubble span { display: block; animation: gf-fade 0.35s ease-out; }
.gf-stage { position: relative; flex: 1; width: min(720px, 100%); display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 4px 10px; padding: 18px 10px calc(70px + env(safe-area-inset-bottom, 0px)); }
.gf-person { display: flex; flex-direction: column; align-items: center; width: clamp(72px, 27vw, 108px); transition: transform 0.3s, opacity 0.3s; opacity: 0.85; animation: gf-in 0.5s ease-out backwards; }
.gf-person img { width: 100%; height: auto; image-rendering: auto; filter: drop-shadow(0 3px 0 #0003); }
.gf-person b { font-size: 0.8rem; text-align: center; line-height: 1.1; margin-top: 2px; }
.gf-person small { font-size: 0.7rem; font-weight: 600; text-align: center; line-height: 1.1; opacity: 0.85; }
.gf-person.talk { opacity: 1; transform: scale(1.18); animation: gf-hop 0.5s ease-in-out infinite alternate; z-index: 1; }
.gf-crowd .gf-person { width: clamp(38px, 11vw, 64px); opacity: 1; animation: gf-in 0.5s ease-out backwards, gf-hop 0.6s ease-in-out infinite alternate; }
.gf-crowd .gf-person small { display: none; }
.gf-crowd .gf-person b { font-size: 0.55rem; }
.gf-end { position: relative; text-align: center; margin-top: 10px; padding: 0 16px; animation: gf-pop 0.6s ease-out; }
.gf-end h2 { margin: 0; font-size: clamp(1.4rem, 6vw, 2.2rem); }
.gf-end p { margin: 4px 0 0; font-weight: 700; }
.gf-bottom { position: absolute; left: 0; right: 0; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); display: flex; justify-content: center; gap: 10px; }
.gf-bottom .gf-btn { min-height: 50px; padding: 4px 22px; box-shadow: 0 3px 0 #3a2418; }
.gf-flip { display: inline-block; transform: scaleX(-1); }
.gf-person { cursor: pointer; }
.gf-crowd.gf-away { transition: transform 1.6s ease-in, opacity 1.4s ease-in; transform: scale(0.15); opacity: 0; pointer-events: none; }
.gf-map { position: absolute; left: 0; right: 0; top: calc(150px + env(safe-area-inset-top, 0px)); bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
.gf-map.in { animation: gf-zoomout 1.8s ease-out both; }
.gf-map svg, .gf-map canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.gf-map canvas { pointer-events: none; }
.gf-map text { font-family: inherit; font-weight: 700; paint-order: stroke; stroke: #fffaf0; stroke-linejoin: round; fill: #3a2418; }
.gf.gf-night .gf-end { color: #fff8e6; text-shadow: 0 2px 6px #0008; }
.gf.gf-night .gf-title { color: #fff8e6; text-shadow: none; }
@keyframes gf-zoomout { from { transform: scale(2.4); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes gf-hop { from { translate: 0 0; } to { translate: 0 -8px; } }
@keyframes gf-in { from { opacity: 0; translate: 0 30px; } }
@keyframes gf-pop { from { transform: scale(0.6); opacity: 0; } }
@keyframes gf-fade { from { opacity: 0; translate: 0 6px; } }
@media (prefers-reduced-motion: reduce) { .gf-person.talk, .gf-crowd .gf-person { animation: none; } }
`;

// Keeper portraits: each zone's keeper as drawn on the map (render/Keeper.js), rendered once to an image.
async function portraits(zones) {
  const app = new Application();
  await app.init({ width: 8, height: 8, backgroundAlpha: 0, antialias: true });
  const out = {};
  for (const [i, zone] of zones.entries()) {
    const view = new KeeperView(zone, i);
    // Only the figure: the name goes below it in the page. A fixed, invisible frame gives every portrait
    // the same size and baseline (hats and names no longer change the crop).
    for (const child of view.children) if (child !== view.body && child !== view.face) child.visible = false;
    const frame = new Container();
    frame.addChild(new Graphics().rect(-15, -50, 30, 56).fill({ color: 0xffffff, alpha: 0.004 }), view);
    out[zone] = await app.renderer.extract.base64({ target: frame, resolution: 4 });
    frame.destroy({ children: true });
  }
  app.destroy(true);
  return out;
}

// The finale's own music: rendered bar by bar without blocking, then looped.
async function startMusic(volume) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || volume <= 0) return null;
  const ctx = new AC();
  ctx.resume();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const player = { ctx, gain, stopped: false };
  const buf = createSong(GRAN_FINAL, RATE);
  for (let i = 0; i < GRAN_FINAL.chords.length; i++) {
    renderBar(buf, i);
    await new Promise((r) => setTimeout(r, 0));
    if (player.stopped) return player;
  }
  normalize(buf);
  const audio = ctx.createBuffer(2, buf.length, RATE);
  audio.getChannelData(0).set(buf.left);
  audio.getChannelData(1).set(buf.right);
  const source = ctx.createBufferSource();
  source.buffer = audio;
  source.loop = true;
  source.connect(gain);
  source.start();
  gain.gain.linearRampToValueAtTime(0.5 * volume, ctx.currentTime + 1.5);
  player.source = source;
  return player;
}

function stopMusic(player) {
  if (!player) return;
  player.stopped = true;
  const { ctx, gain } = player;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + 1.2);
  setTimeout(() => ctx.close(), 1400);
}

// Confetti falling all the time, with a burst on each new region.
function confetti(canvas) {
  const ctx = canvas.getContext('2d');
  const bits = [];
  let raf = 0;
  const resize = () => {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  };
  resize();
  addEventListener('resize', resize);
  const add = (n, burst) => {
    for (let i = 0; i < n; i++) {
      bits.push({
        x: Math.random() * canvas.width,
        y: burst ? canvas.height * (0.3 + Math.random() * 0.2) : -10,
        vx: (Math.random() - 0.5) * (burst ? 9 : 1.5) * devicePixelRatio,
        vy: (burst ? -6 - Math.random() * 6 : 1 + Math.random() * 1.5) * devicePixelRatio,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        s: (4 + Math.random() * 5) * devicePixelRatio,
        c: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      });
    }
  };
  const tick = () => {
    if (bits.length < 140) add(2, false);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.vy += 0.12 * devicePixelRatio;
      b.vy = Math.min(b.vy, 3 * devicePixelRatio);
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      if (b.y > canvas.height + 20) bits.splice(i, 1);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
  return { burst: () => add(70, true), stop: () => (cancelAnimationFrame(raf), removeEventListener('resize', resize)) };
}

// Map of Colombia for the ending: departments in their region's color (as in the zone selector), the islands in
// their inset, and every region's capital (its last zone) with its name. Returns the SVG and the capitals.
const NS = 'http://www.w3.org/2000/svg';
// Where each capital's name goes ([dx, dy, anchor]); to the right of its dot unless listed.
const LABEL_SIDE = {
  bogota: [-8, 12, 'end'],
  zipaquira: [-8, -4, 'end'],
  pueblo: [-8, 5, 'end'],
  buenaventura: [-8, 5, 'end'],
  villa_leyva: [8, -2, 'start'],
  villavicencio: [8, 12, 'start'],
};
const FIRE = ['#ffd84d', '#ff6b6b', '#7cf2ff', '#c792ff', '#7dff8a', '#ffffff', '#ffa94d'];
function countryMap(t) {
  const svg = document.createElementNS(NS, 'svg');
  const capitals = REGIONS.filter((r) => !r.hidden).map((r) => ({ zone: r.zones.at(-1), pos: ZONE_POS[r.zones.at(-1)], isle: Boolean(r.offMap) }));
  const xs = [];
  const ys = [];
  for (const d of DEPARTMENTS) {
    const n = d.d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < n.length; i += 2) xs.push(n[i]), ys.push(n[i + 1]);
  }
  for (const c of capitals) xs.push(c.pos[0] - 14, c.pos[0] + 40), ys.push(c.pos[1] - 14, c.pos[1] + 14);
  const x0 = Math.min(...xs) - 10;
  const y0 = Math.min(...ys) - 10;
  svg.setAttribute('viewBox', `${x0} ${y0} ${Math.max(...xs) + 10 - x0} ${Math.max(...ys) + 10 - y0}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  let html = DEPARTMENTS.map((d) => `<path d="${d.d}" fill="${REGION_COLORS[d.region] ?? '#e8dcc3'}" stroke="#fffaf0" stroke-width="0.8" stroke-linejoin="round"/>`).join('');
  for (const c of capitals.filter((x) => x.isle)) {
    const [x, y] = c.pos;
    html += `<ellipse cx="${x + 0.6}" cy="${y + 1}" rx="5.2" ry="9.5" fill="#f3e6c0" transform="rotate(12 ${x} ${y})"/><ellipse cx="${x + 0.6}" cy="${y + 1}" rx="4" ry="8.2" fill="#7cb342" transform="rotate(12 ${x} ${y})"/>`;
  }
  for (const c of capitals) {
    const [x, y] = c.pos;
    // Names to the left where the middle of the country is crowded (Bogotá, Zipaquirá, Salento…).
    const [dx, dy, anchor] = LABEL_SIDE[c.zone] ?? [8, 5, 'start'];
    html += `<circle cx="${x}" cy="${y}" r="5" fill="#fff3b0" stroke="#3a2418" stroke-width="1.6"/><text x="${x + dx}" y="${y + dy}" font-size="17" stroke-width="4" text-anchor="${anchor}">${t(ZONES_BY_ID[c.zone].name)}</text>`;
  }
  svg.innerHTML = html;
  return { svg, capitals };
}

// Fireworks over the capitals: a rocket rises from below to each capital in turn and bursts there.
function fireworks(canvas, points) {
  const ctx = canvas.getContext('2d');
  const rockets = [];
  const sparks = [];
  let raf = 0;
  let k = 0;
  let last = 0;
  const size = () => {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  };
  size();
  addEventListener('resize', size);
  const tick = (now) => {
    if (now - last > 420) {
      last = now;
      const [tx, ty] = points()[k++ % points().length];
      rockets.push({ x: tx + (Math.random() - 0.5) * 30 * devicePixelRatio, y: canvas.height, tx, ty, c: FIRE[Math.floor(Math.random() * FIRE.length)] });
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += (r.tx - r.x) * 0.08;
      r.y += (r.ty - r.y) * 0.08;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
      if (Math.abs(r.y - r.ty) < 4 * devicePixelRatio) {
        rockets.splice(i, 1);
        for (let j = 0; j < 64; j++) {
          const a = (j / 64) * Math.PI * 2;
          const v = (1.8 + Math.random() * 2.2) * devicePixelRatio;
          sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: Math.random() < 0.3 ? '#fffbe6' : r.c });
        }
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vy += 0.035 * devicePixelRatio;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.012;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => (cancelAnimationFrame(raf), removeEventListener('resize', size));
}

// Regions with keepers, in the game's order, with the zones whose keeper has a line.
export const finaleRegions = () => REGIONS.filter((r) => !r.hidden).map((r) => ({ region: r, zones: r.zones.filter((z) => PEOPLE[z] && FINALE_LINES[z]) })).filter((x) => x.zones.length);

// How long a keeper's line stays up: long enough to read it.
const readTime = (text) => Math.max(2600, 900 + text.length * 48);

export async function playGrandFinale({ t = (s) => s, onClose = () => {}, volume = 0.8, beforeMusic, afterMusic } = {}) {
  if (!document.getElementById('gf-style')) {
    const style = document.createElement('style');
    style.id = 'gf-style';
    style.textContent = CSS;
    document.head.append(style);
  }
  const root = document.createElement('div');
  root.className = 'gf';
  root.innerHTML = `<canvas class="gf-confetti"></canvas>
    <div class="gf-top"><span class="gf-title">${t(FINALE_TEXT.title)}</span><button class="gf-btn" data-prev type="button" aria-label="${t('Región anterior')}"><span class="gf-flip">⏩</span></button><button class="gf-btn" data-skip type="button" aria-label="${t('Región siguiente')}">⏩</button><button class="gf-btn" data-close type="button" aria-label="${t('Cerrar')}">✕</button></div>
    <div class="gf-region" hidden></div>
    <div class="gf-bubble gf-cloud"><span>${t(FINALE_TEXT.intro)}</span></div>
    <div class="gf-stage"></div>
    <div class="gf-bottom" hidden><button class="gf-btn" data-close type="button">${t('Cerrar')}</button><button class="gf-btn" data-again type="button">🔁</button></div>`;
  document.body.append(root);
  const $ = (sel) => root.querySelector(sel);
  const fx = confetti($('canvas'));
  const scenes = finaleRegions();
  const sky = (id) => {
    const [a, b] = SKIES[id] ?? SKIES.cafetero;
    root.style.background = `linear-gradient(${a}, ${a} 55%, ${b})`;
  };
  sky('cafetero');

  beforeMusic?.();
  const music = startMusic(volume);
  const faces = await portraits(scenes.flatMap((s) => s.zones));

  // Steps: one per keeper, then the closing crowd and the map.
  let scene = -1;
  let speaker = -1;
  let timer = 0;
  let done = false;
  let stopFireworks = null;
  const close = async () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    fx.stop();
    stopFireworks?.();
    stopMusic(await music);
    root.remove();
    afterMusic?.();
    onClose();
  };
  const person = (zone, k) => `<div class="gf-person" data-zone="${zone}" style="animation-delay:${k * 0.08}s"><img src="${faces[zone]}" alt=""><b>${t(PEOPLE[zone].name)}</b><small>${t(PEOPLE[zone].role)}</small></div>`;
  // Leaves the ending (crowd, map, fireworks) to go back to the regions.
  const leaveEnding = () => {
    stopFireworks?.();
    stopFireworks = null;
    root.querySelector('.gf-end')?.remove();
    root.querySelector('.gf-map')?.remove();
    root.classList.remove('gf-night');
    $('.gf-stage').classList.remove('gf-crowd', 'gf-away');
    $('.gf-bubble').hidden = false;
    $('.gf-bubble').classList.add('gf-off');
    $('[data-skip]').hidden = false;
    $('.gf-bottom').hidden = true;
  };
  const showScene = (i) => {
    if (scene >= scenes.length) leaveEnding();
    scene = i;
    speaker = -1;
    const { region, zones } = scenes[i];
    sky(region.id);
    const banner = $('.gf-region');
    banner.hidden = false;
    banner.textContent = `${region.icon} ${t(region.name)}`;
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    // Between regions nobody is talking: the bubble keeps its place but stays empty.
    $('.gf-bubble').classList.replace('gf-cloud', 'gf-off') || $('.gf-bubble').classList.add('gf-off');
    $('.gf-stage').innerHTML = zones.map(person).join('');
    fx.burst();
  };
  // A keeper says their line (and the bubble points at them).
  const sayZone = (zone) => {
    const p = PEOPLE[zone];
    const line = t(FINALE_LINES[zone]);
    root.querySelectorAll('.gf-person').forEach((el) => el.classList.toggle('talk', el.dataset.zone === zone));
    const bubble = $('.gf-bubble');
    bubble.hidden = false;
    bubble.classList.remove('gf-off', 'gf-cloud');
    bubble.innerHTML = `<b>${t(p.name)} · ${t(p.role)}</b><span>${line}</span>`;
    const el = root.querySelector(`.gf-person[data-zone="${zone}"]`);
    const bub = bubble.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (r) bubble.style.setProperty('--tail', `${Math.min(Math.max(r.left + r.width / 2 - bub.left, 24), bub.width - 24)}px`);
    return readTime(line);
  };
  const say = () => sayZone(scenes[scene].zones[speaker]);
  // The ending: everyone together, then they move away and the map of Colombia lights up.
  const ending = () => {
    scene = scenes.length;
    speaker = -1;
    sky('sanandres');
    $('.gf-region').hidden = true;
    $('.gf-bubble').hidden = true;
    $('[data-skip]').hidden = true;
    const stage = $('.gf-stage');
    stage.classList.add('gf-crowd');
    stage.innerHTML = scenes.flatMap((s) => s.zones).map(person).join('');
    stage.insertAdjacentHTML('beforebegin', `<div class="gf-end"><h2>${t(FINALE_TEXT.outro)}</h2><p>${t(FINALE_TEXT.thanks)}</p></div>`);
    $('.gf-bottom').hidden = false;
    fx.burst();
    timer = setTimeout(() => !done && fx.burst(), 900);
    setTimeout(() => {
      if (done || scene !== scenes.length) return;
      $('.gf-bubble').hidden = true;
      stage.classList.add('gf-away');
      root.classList.add('gf-night');
      root.style.background = 'linear-gradient(#141e3c, #27407a 60%, #3d5aa0)';
      const box = document.createElement('div');
      box.className = 'gf-map in';
      const { svg, capitals } = countryMap(t);
      const canvas = document.createElement('canvas');
      box.append(svg, canvas);
      root.insertBefore(box, $('.gf-bottom'));
      // Capitals in canvas pixels (the map scales with the window).
      const points = () => {
        const m = svg.getScreenCTM();
        const c = canvas.getBoundingClientRect();
        return capitals.map(({ pos: [x, y] }) => [(m.a * x + m.c * y + m.e - c.left) * devicePixelRatio, (m.b * x + m.d * y + m.f - c.top) * devicePixelRatio]);
      };
      setTimeout(() => {
        if (!done && scene === scenes.length) stopFireworks = fireworks(canvas, points);
      }, 1500);
    }, 4200);
  };
  // Advances to the next keeper (or region, or the ending) and schedules the one after.
  const next = (skipRegion = false) => {
    if (done || scene >= scenes.length) return;
    clearTimeout(timer);
    let wait = 900;
    if (scene < 0 || skipRegion || speaker >= scenes[scene].zones.length - 1) {
      if (scene + 1 >= scenes.length) return ending();
      showScene(scene + 1);
    } else {
      speaker++;
      wait = say();
    }
    timer = setTimeout(() => next(), wait);
  };
  // Back to the previous region (from the ending, to the last one).
  const prev = () => {
    if (done) return;
    clearTimeout(timer);
    showScene(Math.max(0, Math.min(scene, scenes.length) - 1));
    timer = setTimeout(() => next(), 900);
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return void close();
    if (e.target.closest('[data-skip]')) return void next(true);
    if (e.target.closest('[data-prev]')) return void prev();
    if (e.target.closest('[data-again]')) {
      leaveEnding();
      clearTimeout(timer);
      scene = -1;
      return void next();
    }
    // A keeper tapped: what they say; the round goes on from them.
    const who = e.target.closest('.gf-person');
    if (who) {
      clearTimeout(timer);
      const wait = sayZone(who.dataset.zone);
      if (scene >= 0 && scene < scenes.length) {
        speaker = scenes[scene].zones.indexOf(who.dataset.zone);
        timer = setTimeout(() => next(), wait);
      }
      return;
    }
    next();
  });
  // The intro stays a moment before the first region.
  timer = setTimeout(() => next(), 3200);
  return { close };
}
