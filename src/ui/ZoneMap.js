import { DEPARTMENTS, MAP_ORIGIN, MAP_SCALE } from '../data/colombiaMap.js';
import { ZONE_GEO } from '../data/zoneGeo.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { regionState } from '../sim/regions.js';
import { FONT } from '../render/palette.js';

// El mapa de Colombia del selector de zonas (v3.60): primero el país, con cada región del juego de su color;
// al tocar una región se acerca y muestra sus zonas, cada una en el pueblo que la inspira. Desde la v3.67 es lo
// primero que se ve en 🗺️ Zonas: el país con la región de ahora resaltada, que enseguida se ve de cerca con la
// zona de ahora resaltada. Al ir a otra zona, un muñequito camina hasta allá (ver travel).
//   root: la partida principal   getZone: la zona que se ve   onGo(zona): ir a la zona   say(texto): un aviso
const NS = 'http://www.w3.org/2000/svg';
const COLORS = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a' };
const LAND = '#e8dcc3'; // los departamentos que no son de ninguna región del juego
const LOCKED = '#cfc6b4'; // las regiones que todavía no se abren
const ZOOM_MS = 650;
const PEEK_MS = 800; // al abrir el mapa, cuánto se ve el país antes de acercarse a la región donde se está
// Las regiones que vienen (v3.67), en los departamentos que todavía no son de ninguna: «Próximamente».
const SOON = [
  { id: 'tolima', name: 'Tolima Grande', icon: '🎺', depts: ['Tolima', 'Huila'], color: '#efd9c0' },
  { id: 'bogota', name: 'Bogotá y la Sabana', icon: '🏛️', depts: ['Cundinamarca', 'Bogotá'], color: '#e3d6ea' },
];
const SOON_OF = Object.fromEntries(SOON.flatMap((r) => r.depts.map((d) => [d, r])));

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
const SOON_BOX = Object.fromEntries(SOON.map((r) => [r.id, union(DEPARTMENTS.filter((d) => r.depts.includes(d.name)).map((d) => DEPT_BOX[d.id]))]));

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
      p.addEventListener('click', () => (SOON_OF[d.name] ? this.soon(SOON_OF[d.name]) : this.pickRegion(d.region)));
      return p;
    });
    this.highlight = null; // la región resaltada en el país (la de ahora, o la de destino en un viaje)
    this.peek = null; // el acercamiento automático pendiente al abrir
    this.overlay = el('g', { style: `font-family: ${FONT}` }, this.svg);
    this.vb = viewOf(COUNTRY, 12);
    this.applyView();
  }

  // Al abrir el mapa (v3.67): el país con la región de ahora resaltada y, enseguida, de cerca, con la zona de
  // ahora resaltada.
  show() {
    if (this.busy) return;
    clearTimeout(this.peek);
    this.region = null;
    this.highlight = REGION_OF_ZONE[this.getZone()];
    this.vb = viewOf(COUNTRY, 12);
    this.applyView();
    this.paint();
    this.drawOverlay();
    this.peek = setTimeout(() => {
      if (!this.busy && !this.region && this.container.isConnected && this.container.offsetParent) this.zoomTo(this.highlight);
    }, PEEK_MS);
  }

  soon(r) {
    this.say(`${r.icon} ${r.name} llega próximamente al juego.`);
  }

  open(regionId) {
    return Boolean(regionState(this.root.state, regionId));
  }

  paint() {
    DEPARTMENTS.forEach((d, i) => {
      const color = SOON_OF[d.name] ? SOON_OF[d.name].color : !d.region ? LAND : this.open(d.region) ? COLORS[d.region] : LOCKED;
      this.paths[i].setAttribute('fill', color);
      this.paths[i].classList.toggle('dim', Boolean(this.region && d.region !== this.region));
      this.paths[i].classList.toggle('pick', Boolean(d.region && !this.region));
      // En el país, la región resaltada (la de ahora o la de destino) se marca y las demás se apagan un poco.
      const lit = !this.region && this.highlight;
      this.paths[i].classList.toggle('lit', Boolean(lit && d.region === this.highlight));
      this.paths[i].classList.toggle('soft', Boolean(lit && d.region !== this.highlight));
      this.paths[i].classList.toggle('soon', Boolean(SOON_OF[d.name]));
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
    clearTimeout(this.peek);
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
      // Las que vienen: su nombre y «Próximamente».
      for (const r of SOON) {
        const b = SOON_BOX[r.id];
        const label = el('g', { class: 'zones-map-label soon', transform: `translate(${(b.x0 + b.x1) / 2} ${(b.y0 + b.y1) / 2})` }, g);
        el('text', { 'font-size': 4.6 * u, 'text-anchor': 'middle', y: -1.2 * u }, label).textContent = r.icon;
        el('text', { 'font-size': 2.9 * u, 'text-anchor': 'middle', y: 2.6 * u, class: 'name', 'stroke-width': 0.9 * u }, label).textContent = r.name;
        el('text', { 'font-size': 2.5 * u, 'text-anchor': 'middle', y: 5.6 * u, class: 'name soon-tag', 'stroke-width': 0.8 * u }, label).textContent = 'Próximamente';
        label.addEventListener('click', () => this.soon(r));
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
      const m = el('g', { class: cls, transform: `translate(${x} ${y})`, 'data-zone': z }, g);
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
    this.travel(z);
  }

  // El viaje a otra zona (v3.67, también al terminar una zona o al elegirla en la lista). En la misma región,
  // el muñequito camina por el mapa de la región. A otra región: la región de ahora, se aleja al país, se
  // resalta la región nueva, se acerca a ella y el muñequito llega caminando a la zona. Al llegar, se va.
  async travel(target) {
    clearTimeout(this.peek);
    this.busy = true;
    const from = this.getZone();
    const here = REGION_OF_ZONE[from];
    const there = REGION_OF_ZONE[target];
    if (here === there) {
      if (this.region !== here) await this.zoomTo(here);
      await this.walk(ZONE_POS[from], ZONE_POS[target], target);
    } else {
      // Si ya se está mirando la región de destino (se eligió la zona ahí), no hace falta el recorrido.
      if (this.region !== there) {
        if (this.region !== here) {
          this.highlight = here;
          await this.zoomTo(here);
          await wait(450);
        }
        this.highlight = here;
        await this.zoomTo(null);
        await wait(350);
        this.highlight = there;
        this.paint();
        await wait(750);
        await this.zoomTo(there);
      }
      // Entra caminando desde el borde del mapa, del lado de donde viene.
      await this.walk(this.edgeToward(proj(ZONE_GEO[from]), ZONE_POS[target]), ZONE_POS[target], target);
    }
    await wait(250);
    this.busy = false;
    this.onGo(target);
  }

  // El punto del borde de lo que se ve, en la dirección de `from` vista desde `to`.
  edgeToward(from, to) {
    const v = this.vb;
    const dx = from[0] - to[0];
    const dy = from[1] - to[1];
    const kx = dx ? (dx > 0 ? v.x + v.w - to[0] : v.x - to[0]) / dx : Infinity;
    const ky = dy ? (dy > 0 ? v.y + v.h - to[1] : v.y - to[1]) / dy : Infinity;
    const k = Math.min(Math.abs(kx), Math.abs(ky), 1) * 0.92;
    return [to[0] + dx * k, to[1] + dy * k];
  }

  // El muñequito camina de a a b (en lo que se ve), con el camino punteado; la zona de destino se resalta.
  async walk(a, b, target) {
    const u = this.vb.w / 100;
    this.overlay.querySelector(`[data-zone="${target}"]`)?.classList.add('target');
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'zones-map-road', 'stroke-width': 0.7 * u, 'stroke-dasharray': `${1.4 * u} ${1.1 * u}` }, this.overlay);
    const walker = el('g', { class: 'zones-map-walker' }, this.overlay);
    el('ellipse', { rx: 2.6 * u, ry: 0.9 * u, class: 'shadow' }, walker);
    const body = el('text', { 'font-size': 7 * u, 'text-anchor': 'middle' }, walker);
    body.textContent = '🚶';
    // El emoji mira a la izquierda: hacia la derecha se voltea.
    const flip = b[0] > a[0] ? -1 : 1;
    const ms = 900 + Math.min(1200, (Math.hypot(b[0] - a[0], b[1] - a[1]) / u) * 22);
    const t0 = performance.now();
    await new Promise((ok) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        const x = a[0] + (b[0] - a[0]) * k;
        const y = a[1] + (b[1] - a[1]) * k;
        const hop = Math.abs(Math.sin((t * ms) / 110)) * 1.2 * u;
        walker.setAttribute('transform', `translate(${x} ${y})`);
        body.setAttribute('transform', `translate(0 ${-hop}) scale(${flip} 1)`);
        if (t < 1) requestAnimationFrame(step);
        else ok();
      };
      requestAnimationFrame(step);
    });
  }
}
