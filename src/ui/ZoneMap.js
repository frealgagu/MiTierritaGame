import { DEPARTMENTS } from '../data/colombiaMap.js';
import { AIRSTRIP, ZONE_POS, ZONES_VIEW, proj } from './mapLayout.js';
import { ZONE_GEO } from '../data/zoneGeo.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { regionState } from '../sim/regions.js';
import { chosenDecor } from '../sim/renown.js';
import { zoneMaxed } from '../sim/legacy.js';
import { FONT } from '../render/palette.js';

// El mapa de Colombia del selector de zonas (v3.60): primero el país, con cada región del juego de su color;
// al tocar una región se acerca y muestra sus zonas, cada una en el pueblo que la inspira. Desde la v3.67 es lo
// primero que se ve en 🗺️ Zonas: el país con la región de ahora resaltada, que enseguida se ve de cerca con la
// zona de ahora resaltada. Al ir a otra zona, el Willys va hasta allá; a otra región, primero la avioneta (ver travel).
//   root: la partida principal   getZone: la zona que se ve   onGo(zona): ir a la zona   say(texto): un aviso
import { t } from '../i18n/index.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a', tolima: '#e39b6a', cundinamarca: '#d98fb5', bogota: '#b39ddb' };
const LAND = '#e8dcc3'; // los departamentos que no son de ninguna región del juego
const LOCKED = '#cfc6b4'; // las regiones que todavía no se abren
const ZOOM_MS = 650;
// Zoom a mano (v4.0): con dos dedos o la rueda del ratón, y arrastrando se mueve. MIN_W: lo más cerca (el ancho de
// lo que se ve, en unidades del mapa). Al alejarse lo suficiente de una región se vuelve al país.
const MIN_W = 24;
const DRAG_PX = 6; // lo que se mueve el dedo antes de que cuente como arrastrar (y no como toque)
const PEEK_MS = 800; // al abrir el mapa, cuánto se ve el país antes de acercarse a la región donde se está
// Las regiones que vienen (v3.67), en los departamentos que todavía no son de ninguna: «Próximamente».
// (v4.4.8) Las que están en obra y ocultas (`hidden`): Bogotá, en sus departamentos.
const SOON = REGIONS.filter((r) => r.hidden).map((r) => ({ id: r.id, name: t(r.name), icon: r.icon, depts: DEPARTMENTS.filter((d) => d.region === r.id).map((d) => d.name), color: '#e3d6ea' }));
const SOON_OF = Object.fromEntries(SOON.flatMap((r) => r.depts.map((d) => [d, r])));


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
const COUNTRY_VIEW = viewOf(COUNTRY, 12);
const REGION_BOX = Object.fromEntries(REGIONS.map((r) => [r.id, union(DEPARTMENTS.filter((d) => d.region === r.id).map((d) => DEPT_BOX[d.id]))]));
const SOON_BOX = Object.fromEntries(SOON.map((r) => [r.id, union(DEPARTMENTS.filter((d) => r.depts.includes(d.name)).map((d) => DEPT_BOX[d.id]))]));

// Dónde va cada zona y cada aeropuerto en el mapa de su región, y qué se ve de cerca: ui/mapLayout.js (v4.4.10).

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
    this.busy = false; // mientras va el Willys (o vuela la avioneta)
    this.back = document.createElement('button');
    this.back.className = 'btn small zones-map-back';
    this.back.textContent = t('⬅ Colombia');
    this.back.hidden = true;
    this.back.addEventListener('click', () => !this.busy && this.zoomTo(null));
    this.svg = el('svg', { class: 'zones-map-svg', preserveAspectRatio: 'xMidYMid meet' });
    // ＋ y －, para acercarse sin dos dedos ni rueda.
    this.zoomBtns = document.createElement('div');
    this.zoomBtns.className = 'zones-map-zoom';
    for (const [label, k, title] of [['＋', 0.6, t('Acercar')], ['－', 1 / 0.6, t('Alejar')]]) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', () => this.zoomBy(k));
      this.zoomBtns.append(b);
    }
    container.append(this.back, this.zoomBtns, this.svg);
    this.pointers = new Map();
    this.svg.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, (e) => this.up(e));
    this.svg.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    // Tras arrastrar o pellizcar, el toque no elige nada.
    this.svg.addEventListener('click', (e) => this.dragged && (e.stopPropagation(), e.preventDefault()), true);
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

  // Al cambiar de zona (v4.0): el mapa abre ya de cerca, en la región de ahora, sin pasar por el país. Si la zona
  // nueva es de la misma región, el muñequito solo camina; si es de otra, se aleja al país y se acerca a la nueva.
  showHere() {
    if (this.busy) return;
    clearTimeout(this.peek);
    const here = REGION_OF_ZONE[this.getZone()];
    this.region = here;
    this.highlight = here;
    this.vb = { ...ZONES_VIEW[here] };
    this.back.hidden = false;
    this.applyView();
    this.paint();
    this.drawOverlay();
  }

  soon(r) {
    this.say(t('{region} llega próximamente al juego.', { region: `${r.icon} ${r.name}` }));
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

  // ---------- Zoom a mano (v4.0) ----------
  // Un punto de la pantalla en unidades del mapa.
  toMap(x, y) {
    const m = this.svg.getScreenCTM();
    if (!m) return [this.vb.x + this.vb.w / 2, this.vb.y + this.vb.h / 2];
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  // Unidades del mapa por pixel de pantalla.
  unitsPerPx() {
    const m = this.svg.getScreenCTM();
    return m ? 1 / m.a : this.vb.w / (this.svg.clientWidth || 1);
  }

  // Acerca (k < 1) o aleja (k > 1) alrededor del punto (cx, cy) del mapa, sin pasar de lo más cerca ni de todo el país.
  zoomAt(cx, cy, k) {
    const v = this.vb;
    const w = Math.min(COUNTRY_VIEW.w, Math.max(MIN_W, v.w * k));
    const f = w / v.w;
    this.vb = { x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w, h: v.h * f };
    this.clampView();
    this.applyView();
    this.redraw();
    // Desde una región, alejarse lo suficiente vuelve al país (como «⬅ Colombia»).
    if (this.region && k > 1) {
      const out = Math.min(COUNTRY_VIEW.w, Math.max(ZONES_VIEW[this.region].w * 1.35, COUNTRY_VIEW.w * 0.6));
      if (this.vb.w >= out - 1e-6) {
        this.highlight = this.region;
        this.zoomTo(null);
      }
    }
  }

  // Mover lo que se ve (en unidades del mapa), sin que el país se salga del todo.
  panBy(dx, dy) {
    this.vb = { ...this.vb, x: this.vb.x + dx, y: this.vb.y + dy };
    this.clampView();
    this.applyView();
  }

  clampView() {
    const v = this.vb;
    const cx = Math.min(COUNTRY.x1, Math.max(COUNTRY.x0, v.x + v.w / 2));
    const cy = Math.min(COUNTRY.y1, Math.max(COUNTRY.y0, v.y + v.h / 2));
    this.vb = { ...v, x: cx - v.w / 2, y: cy - v.h / 2 };
  }

  // Las marcas y los nombres se vuelven a dibujar del tamaño de siempre (una vez por cuadro).
  redraw() {
    if (this.redrawing) return;
    this.redrawing = true;
    requestAnimationFrame(() => {
      this.redrawing = false;
      if (!this.busy && !this.animating) this.drawOverlay();
    });
  }

  canTouch() {
    return !this.busy && !this.animating;
  }

  // Los botones ＋ y －: alrededor del centro, con un movimiento suave.
  async zoomBy(k) {
    if (!this.canTouch()) return;
    clearTimeout(this.peek);
    const v = this.vb;
    const w = Math.min(COUNTRY_VIEW.w, Math.max(MIN_W, v.w * k));
    if (Math.abs(w - v.w) < 1e-6) return;
    const out = this.region && k > 1 ? Math.min(COUNTRY_VIEW.w, Math.max(ZONES_VIEW[this.region].w * 1.35, COUNTRY_VIEW.w * 0.6)) : Infinity;
    if (w >= out - 1e-6) {
      this.highlight = this.region;
      return this.zoomTo(null);
    }
    const f = w / v.w;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    await this.animate({ x: cx - (v.w * f) / 2, y: cy - (v.h * f) / 2, w, h: v.h * f });
    this.clampView();
    this.applyView();
    this.drawOverlay();
  }

  down(e) {
    if (!this.canTouch()) return;
    clearTimeout(this.peek);
    if (!this.pointers.size) {
      this.dragged = false;
      this.travelled = 0;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.canTouch()) return;
    const pts = [...this.pointers.values()];
    if (pts.length >= 2) {
      // Dos dedos: acerca o aleja según se juntan o se separan, alrededor del punto medio, y lo arrastra.
      const [a, b] = pts;
      const before = { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2], dist: Math.hypot(a.x - b.x, a.y - b.y) };
      p.x = e.clientX;
      p.y = e.clientY;
      const after = { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2], dist: Math.hypot(a.x - b.x, a.y - b.y) };
      this.dragged = true;
      const u = this.unitsPerPx();
      this.panBy((before.mid[0] - after.mid[0]) * u, (before.mid[1] - after.mid[1]) * u);
      if (after.dist > 10 && before.dist > 10) this.zoomAt(...this.toMap(...after.mid), before.dist / after.dist);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    this.travelled += Math.hypot(dx, dy);
    if (this.travelled < DRAG_PX) return;
    this.dragged = true;
    const u = this.unitsPerPx();
    this.panBy(-dx * u, -dy * u);
  }

  up(e) {
    this.pointers.delete(e.pointerId);
    // El toque que sigue a un arrastre se ignora; después, se vuelve a poder tocar.
    if (!this.pointers.size && this.dragged) setTimeout(() => (this.dragged = false), 0);
  }

  wheel(e) {
    e.preventDefault();
    if (!this.canTouch()) return;
    clearTimeout(this.peek);
    this.zoomAt(...this.toMap(e.clientX, e.clientY), Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004));
  }

  // De lo que se ve ahora a `to`, en un movimiento suave.
  async animate(to) {
    const from = { ...this.vb };
    this.animating = true;
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
    this.animating = false;
  }

  // Se acerca a una región (o se aleja al país) en un movimiento suave.
  async zoomTo(regionId) {
    const from = { ...this.vb };
    const to = regionId ? ZONES_VIEW[regionId] : viewOf(COUNTRY, 12);
    this.region = regionId;
    this.overlay.replaceChildren();
    this.paint();
    this.back.hidden = !regionId;
    this.animating = true;
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
    this.animating = false;
    this.drawOverlay();
  }

  pickRegion(regionId) {
    clearTimeout(this.peek);
    if (this.busy || this.region) return;
    if (!regionId) return this.say(t('🗺️ Esta parte del país todavía no está en el juego.'));
    if (!this.open(regionId)) {
      const r = REGIONS_BY_ID[regionId];
      return this.say(t('🔒 {region} se abre al completar {zone}.', { region: `${r.icon} ${r.name}`, zone: ZONES_BY_ID[r.unlock.zone].name }));
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
        if (r.hidden) continue; // va con las que vienen (v4.4.8)
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
        el('text', { 'font-size': 2.5 * u, 'text-anchor': 'middle', y: 5.6 * u, class: 'name soon-tag', 'stroke-width': 0.8 * u }, label).textContent = t('Próximamente');
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
      name.textContent = `${i + 1} · ${zone.name}${st?.complete ? (zoneMaxed(state, z) ? ' 🏁' : ' 🚩') : ''}`;
      m.addEventListener('click', () => this.pickZone(z));
    });
  }

  pickZone(z) {
    if (this.busy) return;
    const st = regionState(this.root.state, REGION_OF_ZONE[z])?.zones[z];
    if (!st?.unlocked) {
      const zones = REGIONS_BY_ID[REGION_OF_ZONE[z]].zones;
      return this.say(t('🔒 {region} se abre al completar {zone}.', { region: ZONES_BY_ID[z].name, zone: ZONES_BY_ID[zones[zones.indexOf(z) - 1]].name }));
    }
    if (z === this.getZone()) return this.say(t('📍 Ya estás en {zone}.', { zone: ZONES_BY_ID[z].name }));
    this.travel(z);
  }

  // El viaje a otra zona (v3.67, también al terminar una zona o al elegirla en la lista). En la misma región,
  // el Willys va por el mapa de la región. A otra región (v4.1): se aleja al país, la avioneta vuela hasta la
  // región nueva, se acerca a ella y el Willys entra desde el borde, del lado por donde llegó el avión.
  async travel(target) {
    clearTimeout(this.peek);
    // «⚡ Directo» (v4.1.3, en el menú): sin el viaje.
    if (this.root.state.settings.travel === 'direct') return this.onGo(target);
    this.busy = true;
    const from = this.getZone();
    const here = REGION_OF_ZONE[from];
    const there = REGION_OF_ZONE[target];
    if (here === there) {
      if (this.region !== here) await this.zoomTo(here);
      await this.drive(ZONE_POS[from], ZONE_POS[target], target);
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
        await wait(250);
        this.highlight = there;
        this.paint();
        // Aterriza en la pista de la región, junto a su última zona (v4.3.2: antes, en el centro, y el Willys
        // entraba desde el borde del mapa).
        await this.fly(ZONE_POS[from], AIRSTRIP[there]);
        await wait(200);
        await this.zoomTo(there);
      }
      // El Willys sale de la pista.
      this.runway(AIRSTRIP[there]);
      await this.drive(AIRSTRIP[there], ZONE_POS[target], target);
    }
    await wait(250);
    this.busy = false;
    this.onGo(target);
  }

  // La pista de aterrizaje (v4.3.2), con la avioneta parqueada al lado.
  runway([x, y]) {
    const u = this.vb.w / 100;
    const g = el('g', { transform: `translate(${x} ${y}) rotate(-28)` }, this.overlay);
    el('rect', { x: -7 * u, y: -1.3 * u, width: 14 * u, height: 2.6 * u, rx: 0.6 * u, fill: '#6d6f73', stroke: '#3a2418', 'stroke-width': 0.25 * u }, g);
    for (let i = -5; i <= 4; i += 2) el('rect', { x: i * u, y: -0.15 * u, width: 1.1 * u, height: 0.3 * u, fill: '#f4efe6' }, g);
    const parked = el('g', { transform: `translate(${3 * u} ${-3.4 * u}) scale(${0.32 * u})` }, g);
    plane(parked);
  }

  // El Willys va de a a b (en lo que se ve), por el camino punteado; la zona de destino se resalta (v4.1: antes
  // caminaba un muñequito). Sale del color que se eligió para el Willys en la región de destino.
  async drive(a, b, target) {
    const u = this.vb.w / 100;
    this.overlay.querySelector(`[data-zone="${target}"]`)?.classList.add('target');
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'zones-map-road', 'stroke-width': 0.7 * u, 'stroke-dasharray': `${1.4 * u} ${1.1 * u}` }, this.overlay);
    const color = chosenDecor(this.root.state.profile, REGION_OF_ZONE[target]).willys.color;
    const car = el('g', { class: 'zones-map-walker' }, this.overlay);
    el('ellipse', { rx: 4.6 * u, ry: 0.9 * u, class: 'shadow' }, car);
    const body = willys(car, `#${color.toString(16).padStart(6, '0')}`);
    // El dibujo mira a la derecha: hacia la izquierda se voltea.
    const flip = b[0] < a[0] ? -1 : 1;
    const ms = 900 + Math.min(1200, (Math.hypot(b[0] - a[0], b[1] - a[1]) / u) * 22);
    await animate(ms, (t) => {
      const k = ease(t);
      // Brinca por la trocha: saltitos cortos y un cabeceo.
      const bump = Math.abs(Math.sin((t * ms) / 90)) * 0.5 * u;
      const tilt = Math.sin((t * ms) / 130) * 3;
      car.setAttribute('transform', `translate(${a[0] + (b[0] - a[0]) * k} ${a[1] + (b[1] - a[1]) * k})`);
      body.setAttribute('transform', `translate(0 ${-bump}) scale(${flip * 0.42 * u} ${0.42 * u}) rotate(${tilt})`);
    });
  }

  // La avioneta vuela de a a b sobre el país (v4.1): en arco, con su sombra en el suelo, que se aleja mientras
  // sube y se acerca al aterrizar.
  async fly(a, b) {
    const u = this.vb.w / 100;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const dist = Math.hypot(dx, dy) || 1;
    // El arco se curva hacia arriba de la pantalla.
    const side = dx >= 0 ? -1 : 1;
    const c = [(a[0] + b[0]) / 2 + (side * -dy / dist) * dist * 0.25, (a[1] + b[1]) / 2 + (side * dx / dist) * dist * 0.25];
    const at = (t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
    el('path', { d: `M ${a[0]} ${a[1]} Q ${c[0]} ${c[1]} ${b[0]} ${b[1]}`, class: 'zones-map-road', 'stroke-width': 0.45 * u, 'stroke-dasharray': `${1.2 * u} ${1.2 * u}` }, this.overlay);
    const shadow = el('g', { opacity: 0.22 }, this.overlay);
    plane(shadow, true);
    const g = el('g', {}, this.overlay);
    const prop = plane(g);
    const ms = 1300 + Math.min(1100, (dist / u) * 12);
    await animate(ms, (t) => {
      const k = ease(t);
      const [x, y] = at(k);
      const [x2, y2] = at(Math.min(1, k + 0.01));
      const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      const lift = Math.sin(Math.PI * k); // 0 en tierra, 1 en lo más alto
      const size = (0.42 + 0.16 * lift) * u;
      g.setAttribute('transform', `translate(${x} ${y - lift * 2.5 * u}) rotate(${angle}) scale(${size})`);
      shadow.setAttribute('transform', `translate(${x + lift * 2 * u} ${y + lift * 1.5 * u}) rotate(${angle}) scale(${0.42 * u})`);
      prop.setAttribute('transform', `scale(1 ${Math.cos((t * ms) / 25)})`);
    });
  }
}

// Una animación de `ms` milisegundos: `frame(t)` con t de 0 a 1.
const animate = (ms, frame) =>
  new Promise((ok) => {
    const t0 = performance.now();
    frame(0); // ya en su sitio y a su tamaño desde el primer cuadro
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else ok();
    };
    requestAnimationFrame(step);
  });

// El Willys de lado, mirando a la derecha, con las ruedas en el suelo (0, 0): carrocería del color dado,
// capó, parabrisas, carpa de lona, la llanta de repuesto atrás y el farol.
function willys(parent, color) {
  const g = el('g', {}, parent);
  const ink = '#3a2418';
  el('path', { d: 'M -9.5 -13 H 1 L 2 -8.5 H -10.5 Z', fill: '#cdb683', stroke: ink, 'stroke-width': 0.7, 'stroke-linejoin': 'round' }, g);
  el('path', { d: 'M -8.5 -12.6 V -8.7 M -4.5 -12.6 V -8.7', stroke: '#a8925f', 'stroke-width': 0.6 }, g);
  el('path', { d: 'M 1.2 -13.2 L 2.4 -8.4', stroke: '#6b6b6b', 'stroke-width': 0.9, 'stroke-linecap': 'round' }, g);
  el('circle', { cx: -11, cy: -6, r: 2, fill: '#2b2b2b', stroke: ink, 'stroke-width': 0.5 }, g);
  el('path', { d: 'M -10.5 -8.5 H 2.2 L 2.6 -8.6 H 10 Q 10.8 -8.6 10.8 -7.6 V -4.2 Q 10.8 -3.2 9.8 -3.2 H -9.6 Q -10.6 -3.2 -10.6 -4.2 Z', fill: color, stroke: ink, 'stroke-width': 0.7, 'stroke-linejoin': 'round' }, g);
  el('path', { d: 'M -9.2 -3.3 A 3.3 3.3 0 0 1 -2.8 -3.3 M 2.8 -3.3 A 3.3 3.3 0 0 1 9.2 -3.3', fill: 'none', stroke: ink, 'stroke-width': 1.1 }, g);
  el('circle', { cx: 10.1, cy: -7, r: 0.75, fill: '#ffe9a0', stroke: ink, 'stroke-width': 0.4 }, g);
  for (const x of [-6, 6]) {
    el('circle', { cx: x, cy: -2.6, r: 2.6, fill: '#2b2b2b', stroke: ink, 'stroke-width': 0.5 }, g);
    el('circle', { cx: x, cy: -2.6, r: 1, fill: '#c9c2b4' }, g);
  }
  return g;
}

// La avioneta vista desde arriba, con la nariz a la derecha: alas amarillas, fuselaje blanco y la cola con
// azul y rojo. `flat`: solo la silueta (para la sombra). Devuelve la hélice, que gira.
function plane(parent, flat = false) {
  const ink = flat ? 'none' : '#3a2418';
  const paint = (c) => (flat ? '#000' : c);
  const sw = flat ? 0 : 0.5;
  el('path', { d: 'M -8.5 -4 H -6.8 L -6 0 L -6.8 4 H -8.5 L -8 0 Z', fill: paint('#2e6fd1'), stroke: ink, 'stroke-width': sw, 'stroke-linejoin': 'round' }, parent);
  el('path', { d: 'M 0.5 -11 H 3.8 L 3.4 11 H 0.5 Z', fill: paint('#f2c14e'), stroke: ink, 'stroke-width': sw, 'stroke-linejoin': 'round' }, parent);
  el('path', { d: 'M -9 0 Q -8 -1.5 -2 -1.6 L 7 -1.4 Q 9.6 -1 9.6 0 Q 9.6 1 7 1.4 L -2 1.6 Q -8 1.5 -9 0 Z', fill: paint('#fbf6ec'), stroke: ink, 'stroke-width': sw }, parent);
  if (!flat) {
    el('path', { d: 'M -8.6 -0.6 H -3 M -8.6 0.6 H -3', stroke: '#d7263d', 'stroke-width': 0.5 }, parent);
    el('ellipse', { cx: 4.8, cy: 0, rx: 1.6, ry: 0.9, fill: '#7fb3d5', stroke: ink, 'stroke-width': 0.35 }, parent);
  }
  const prop = el('g', {}, parent);
  // La hélice, en la nariz: gira achicándose de alto (está centrada en y = 0).
  el('path', { d: 'M 10.1 -3 V 3', stroke: flat ? '#000' : '#6b6b6b', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, prop);
  return prop;
}
