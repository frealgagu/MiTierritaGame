import { DEPARTMENTS, MAP_ORIGIN, MAP_SCALE } from '../data/colombiaMap.js';
import { ZONE_GEO } from '../data/zoneGeo.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { regionState } from '../sim/regions.js';
import { FONT } from '../render/palette.js';

// El mapa de Colombia del selector de zonas (v3.60): primero el país, con cada región del juego de su color;
// al tocar una región se acerca y muestra sus zonas, cada una en el pueblo que la inspira. Al elegir otra zona,
// un muñequito camina hasta allá (si es de otra región, por el mapa del país) y luego se va a la zona.
//   root: la partida principal   getZone: la zona que se ve   onGo(zona): ir a la zona   say(texto): un aviso
const NS = 'http://www.w3.org/2000/svg';
const COLORS = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a' };
const LAND = '#e8dcc3'; // los departamentos que no son de ninguna región del juego
const LOCKED = '#cfc6b4'; // las regiones que todavía no se abren
const ZOOM_MS = 650;

const proj = ([lat, lon]) => [(lon - MAP_ORIGIN[0]) * MAP_SCALE, (MAP_ORIGIN[1] - lat) * MAP_SCALE];

// Caja de un camino SVG hecho solo de M, L y Z con coordenadas absolutas (así los escribe tools/geo).
function pathBox(d) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let i = 0; i < n.length; i += 2) grow(box, n[i], n[i + 1]);
  return box;
}
function grow(box, x, y) {
  box.x0 = Math.min(box.x0, x);
  box.y0 = Math.min(box.y0, y);
  box.x1 = Math.max(box.x1, x);
  box.y1 = Math.max(box.y1, y);
}
const union = (boxes) => boxes.reduce((u, b) => (grow(u, b.x0, b.y0), grow(u, b.x1, b.y1), u), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
// La vista (viewBox) que muestra una caja con un margen.
const viewOf = (b, pad) => ({ x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 });

const DEPT_BOX = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, pathBox(d.d)]));
const COUNTRY = union(Object.values(DEPT_BOX));
const REGION_BOX = Object.fromEntries(REGIONS.map((r) => [r.id, union(DEPARTMENTS.filter((d) => d.region === r.id).map((d) => DEPT_BOX[d.id]))]));

// Dónde va cada zona en el mapa de su región: en su pueblo, pero si dos quedan muy juntas (Barichara y San
// Gil) se separan hasta que quepan sus marcas. La región se mira de cerca alrededor de sus zonas (en los
// Llanos y el Amazonas, los departamentos son enormes y las zonas quedan en una esquina).
const ZONE_POS = {};
const ZONES_VIEW = {};
const box = (pts) => union(pts.map(([x, y]) => ({ x0: x, y0: y, x1: x, y1: y })));
for (const r of REGIONS) {
  const pts = r.zones.map((z) => proj(ZONE_GEO[z]));
  const b0 = box(pts);
  const size = Math.max(b0.x1 - b0.x0, b0.y1 - b0.y0, 90);
  const min = size * 0.24;
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= min) continue;
        const push = (min - dist) / 2 / dist;
        pts[i][0] -= dx * push;
        pts[i][1] -= dy * push;
        pts[j][0] += dx * push;
        pts[j][1] += dy * push;
      }
    }
  }
  r.zones.forEach((z, k) => (ZONE_POS[z] = pts[k]));
  const b = box(pts);
  const s = Math.max(b.x1 - b.x0, b.y1 - b.y0, 90);
  ZONES_VIEW[r.id] = viewOf(b, s * 0.3);
}

const el = (tag, attrs = {}, parent = null) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

export class ZoneMap {
  constructor(container, { root, getZone, onGo, say }) {
    this.root = root;
    this.getZone = getZone;
    this.onGo = onGo;
    this.say = say;
    this.container = container;
    this.region = null; // la región que se ve de cerca (null: el país)
    this.busy = false; // mientras camina el muñequito
    this.back = document.createElement('button');
    this.back.className = 'btn small zones-map-back';
    this.back.textContent = '⬅ Colombia';
    this.back.hidden = true;
    this.back.addEventListener('click', () => !this.busy && this.zoomTo(null));
    this.svg = el('svg', { class: 'zones-map-svg', preserveAspectRatio: 'xMidYMid meet' });
    container.append(this.back, this.svg);
    this.depts = el('g', {}, this.svg);
    this.paths = DEPARTMENTS.map((d) => {
      const p = el('path', { d: d.d, class: 'zones-map-dept' }, this.depts);
      p.addEventListener('click', () => this.pickRegion(d.region));
      return p;
    });
    this.overlay = el('g', { style: `font-family: ${FONT}` }, this.svg);
    this.vb = viewOf(COUNTRY, 12);
    this.applyView();
  }

  // Al abrir el mapa: el país, con las regiones abiertas de color.
  show() {
    if (this.busy) return;
    this.region = null;
    this.vb = viewOf(COUNTRY, 12);
    this.applyView();
    this.paint();
    this.drawOverlay();
  }

  open(regionId) {
    return Boolean(regionState(this.root.state, regionId));
  }

  paint() {
    DEPARTMENTS.forEach((d, i) => {
      const color = !d.region ? LAND : this.open(d.region) ? COLORS[d.region] : LOCKED;
      this.paths[i].setAttribute('fill', color);
      this.paths[i].classList.toggle('dim', Boolean(this.region && d.region !== this.region));
      this.paths[i].classList.toggle('pick', Boolean(d.region && !this.region));
    });
  }

  applyView() {
    const v = this.vb;
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  }

  // Se acerca a una región (o se aleja al país) en un movimiento suave.
  async zoomTo(regionId) {
    const from = { ...this.vb };
    const to = regionId ? ZONES_VIEW[regionId] : viewOf(COUNTRY, 12);
    this.region = regionId;
    this.overlay.replaceChildren();
    this.paint();
    this.back.hidden = !regionId;
    const t0 = performance.now();
    await new Promise((ok) => {
      const step = (now) => {
        const t = ease(Math.min(1, (now - t0) / ZOOM_MS));
        this.vb = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, w: from.w + (to.w - from.w) * t, h: from.h + (to.h - from.h) * t };
        this.applyView();
        if (t < 1) requestAnimationFrame(step);
        else ok();
      };
      requestAnimationFrame(step);
    });
    this.drawOverlay();
  }

  pickRegion(regionId) {
    if (this.busy || this.region) return;
    if (!regionId) return this.say('🗺️ Esta parte del país todavía no está en el juego.');
    if (!this.open(regionId)) {
      const r = REGIONS_BY_ID[regionId];
      return this.say(`🔒 ${r.icon} ${r.name} se abre al completar ${ZONES_BY_ID[r.unlock.zone].name}.`);
    }
    this.zoomTo(regionId);
  }

  // Los nombres de las regiones (en el país) o las zonas con su camino (en una región). El tamaño de las letras
  // va con lo que se ve, para que se lean igual de cerca y de lejos.
  drawOverlay() {
    const g = this.overlay;
    g.replaceChildren();
    const u = this.vb.w / 100;
    const here = this.getZone();
    if (!this.region) {
      for (const r of REGIONS) {
        const b = REGION_BOX[r.id];
        const open = this.open(r.id);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        const label = el('g', { class: 'zones-map-label' + (open ? '' : ' locked'), transform: `translate(${cx} ${cy})` }, g);
        el('text', { 'font-size': 6.5 * u, 'text-anchor': 'middle', y: -1.5 * u }, label).textContent = open ? r.icon : '🔒';
        el('text', { 'font-size': 4.4 * u, 'text-anchor': 'middle', y: 4 * u, class: 'name', 'stroke-width': 1.2 * u }, label).textContent = r.name;
        label.addEventListener('click', () => this.pickRegion(r.id));
      }
      // Dónde se está: el alfiler en la zona de ahora.
      const [x, y] = proj(ZONE_GEO[here]);
      el('text', { x, y, 'font-size': 6.5 * u, 'text-anchor': 'middle', class: 'zones-map-pin' }, g).textContent = '📍';
      return;
    }
    const r = REGIONS_BY_ID[this.region];
    const state = regionState(this.root.state, r.id);
    // El camino de una zona a la siguiente, punteado.
    const pts = r.zones.map((z) => ZONE_POS[z]);
    el('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'zones-map-road', 'stroke-width': 0.8 * u, 'stroke-dasharray': `${1.6 * u} ${1.2 * u}` }, g);
    r.zones.forEach((z, i) => {
      const zone = ZONES_BY_ID[z];
      const st = state.zones[z];
      const [x, y] = ZONE_POS[z];
      const cls = ['zones-map-zone', st?.unlocked ? '' : 'locked', st?.complete ? 'done' : '', z === here ? 'here' : ''].join(' ');
      const m = el('g', { class: cls, transform: `translate(${x} ${y})` }, g);
      if (z === here) el('circle', { r: 6.2 * u, class: 'ring' }, m);
      el('circle', { r: 4.6 * u, class: 'dot', 'stroke-width': 0.6 * u }, m);
      el('text', { 'font-size': 4.6 * u, 'text-anchor': 'middle', y: 1.6 * u }, m).textContent = st?.unlocked ? zone.icon : '🔒';
      const name = el('text', { 'font-size': 2.8 * u, 'text-anchor': 'middle', y: 8.4 * u, class: 'name', 'stroke-width': 0.8 * u }, m);
      name.textContent = `${i + 1} · ${zone.name}${st?.complete ? ' 🏁' : ''}`;
      m.addEventListener('click', () => this.pickZone(z));
    });
  }

  pickZone(z) {
    if (this.busy) return;
    const st = regionState(this.root.state, REGION_OF_ZONE[z])?.zones[z];
    if (!st?.unlocked) {
      const zones = REGIONS_BY_ID[REGION_OF_ZONE[z]].zones;
      return this.say(`🔒 ${ZONES_BY_ID[z].name} se abre al completar ${ZONES_BY_ID[zones[zones.indexOf(z) - 1]].name}.`);
    }
    if (z === this.getZone()) return this.say(`📍 Ya estás en ${ZONES_BY_ID[z].name}.`);
    this.walkTo(z);
  }

  // El muñequito camina de la zona de ahora a la elegida: en el mapa de la región si es de la misma; si no, se
  // aleja al país y camina por el mapa. Al llegar, se va a la zona.
  async walkTo(target) {
    this.busy = true;
    const from = this.getZone();
    const same = REGION_OF_ZONE[from] === REGION_OF_ZONE[target] && this.region === REGION_OF_ZONE[target];
    if (!same) await this.zoomTo(null);
    const a = same ? ZONE_POS[from] : proj(ZONE_GEO[from]);
    const b = same ? ZONE_POS[target] : proj(ZONE_GEO[target]);
    const u = this.vb.w / 100;
    if (!same) {
      // El destino, marcado.
      el('text', { x: b[0], y: b[1], 'font-size': 5 * u, 'text-anchor': 'middle', class: 'zones-map-pin' }, this.overlay).textContent = ZONES_BY_ID[target].icon;
    }
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'zones-map-road', 'stroke-width': 0.7 * u, 'stroke-dasharray': `${1.4 * u} ${1.1 * u}` }, this.overlay);
    const walker = el('g', { class: 'zones-map-walker' }, this.overlay);
    el('ellipse', { rx: 2.6 * u, ry: 0.9 * u, class: 'shadow' }, walker);
    const body = el('text', { 'font-size': (same ? 7 : 10) * u, 'text-anchor': 'middle' }, walker);
    body.textContent = '🚶';
    // El emoji mira a la izquierda: hacia la derecha se voltea.
    const flip = b[0] > a[0] ? -1 : 1;
    const ms = 900 + Math.min(1200, Math.hypot(b[0] - a[0], b[1] - a[1]) / u * 22);
    const t0 = performance.now();
    await new Promise((ok) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        const x = a[0] + (b[0] - a[0]) * k;
        const y = a[1] + (b[1] - a[1]) * k;
        const hop = Math.abs(Math.sin(t * ms / 110)) * 1.2 * u;
        walker.setAttribute('transform', `translate(${x} ${y})`);
        body.setAttribute('transform', `translate(0 ${-hop}) scale(${flip} 1)`);
        if (t < 1) requestAnimationFrame(step);
        else ok();
      };
      requestAnimationFrame(step);
    });
    await wait(250);
    this.busy = false;
    this.onGo(target);
  }
}
