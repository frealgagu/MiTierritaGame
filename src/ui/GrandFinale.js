// Grand finale (v5.9): once every achievement is earned, the keeper of every zone congratulates the player,
// region by region, each with their own accent (data/finale.js), over a piece of music made only for it
// (GRAN_FINAL in audio/songs.js). Self-contained: brings its own styles and music player, so it also runs
// outside the game (tools/finale-artifact.js).
//   playGrandFinale({ t, onClose, volume, beforeMusic, afterMusic })
//     t: translator for texts (identity by default); volume: 0..1 music volume;
//     beforeMusic / afterMusic: called to quiet the game's own music and bring it back.
// Tap anywhere: next keeper. ⏩: next region. ✕: close.
import { Application, Container, Graphics } from 'pixi.js';
import { KeeperView } from '../render/Keeper.js';
import { PEOPLE } from '../data/lore.js';
import { REGIONS } from '../data/regions.js';
import { FINALE_LINES, FINALE_TEXT } from '../data/finale.js';
import { GRAN_FINAL } from '../audio/songs.js';
import { createSong, normalize, renderBar } from '../audio/compose.js';

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
.gf-bubble { position: relative; width: min(560px, calc(100% - 28px)); min-height: 6.2em; margin-top: 12px; padding: 10px 14px; border: 3px solid #3a2418; border-radius: 18px; background: #fffaf0; box-shadow: 0 3px 0 #3a2418; font-size: clamp(0.95rem, 3.6vw, 1.2rem); line-height: 1.3; }
.gf-bubble::after { content: ''; position: absolute; left: var(--tail, 50%); bottom: -14px; width: 18px; height: 18px; background: #fffaf0; border-right: 3px solid #3a2418; border-bottom: 3px solid #3a2418; transform: translateX(-50%) rotate(45deg); transition: left 0.3s; }
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
    <div class="gf-top"><span class="gf-title">${t(FINALE_TEXT.title)}</span><button class="gf-btn" data-skip type="button">⏩</button><button class="gf-btn" data-close type="button" aria-label="✕">✕</button></div>
    <div class="gf-region" hidden></div>
    <div class="gf-bubble"><span>${t(FINALE_TEXT.intro)}</span></div>
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

  // Steps: one per keeper, then the closing crowd.
  let scene = -1;
  let speaker = -1;
  let timer = 0;
  let done = false;
  const close = async () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    fx.stop();
    stopMusic(await music);
    root.remove();
    afterMusic?.();
    onClose();
  };
  const person = (zone, k) => `<div class="gf-person" data-zone="${zone}" style="animation-delay:${k * 0.08}s"><img src="${faces[zone]}" alt=""><b>${t(PEOPLE[zone].name)}</b><small>${t(PEOPLE[zone].role)}</small></div>`;
  const showScene = (i) => {
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
    $('.gf-stage').classList.remove('gf-crowd');
    $('.gf-stage').innerHTML = zones.map(person).join('');
    fx.burst();
  };
  const say = () => {
    const { zones } = scenes[scene];
    const zone = zones[speaker];
    const p = PEOPLE[zone];
    const line = t(FINALE_LINES[zone]);
    root.querySelectorAll('.gf-person').forEach((el) => el.classList.toggle('talk', el.dataset.zone === zone));
    $('.gf-bubble').innerHTML = `<b>${t(p.name)} · ${t(p.role)}</b><span>${line}</span>`;
    // Bubble tail points at the one talking.
    const el = root.querySelector(`.gf-person[data-zone="${zone}"]`);
    const bub = $('.gf-bubble').getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (r) $('.gf-bubble').style.setProperty('--tail', `${Math.min(Math.max(r.left + r.width / 2 - bub.left, 24), bub.width - 24)}px`);
    return readTime(line);
  };
  const ending = () => {
    scene = scenes.length;
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
    setTimeout(() => !done && fx.burst(), 900);
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
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return void close();
    if (e.target.closest('[data-skip]')) return void next(true);
    if (e.target.closest('[data-again]')) {
      root.querySelector('.gf-end')?.remove();
      $('.gf-bubble').hidden = false;
      $('[data-skip]').hidden = false;
      $('.gf-bottom').hidden = true;
      scene = -1;
      return void next();
    }
    next();
  });
  // The intro stays a moment before the first region.
  timer = setTimeout(() => next(), 3200);
  return { close };
}
