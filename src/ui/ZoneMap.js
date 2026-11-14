import { DEPARTMENTS } from '../data/colombiaMap.js';
import { AIRSTRIP, ZONE_POS, ZONES_VIEW, proj } from './mapLayout.js';
import { mapGeo } from '../data/zoneGeo.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE, shownRegions } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { isOpen, regionState } from '../sim/regions.js';
import { chosenDecor } from '../sim/renown.js';
import { zoneMaxed } from '../sim/legacy.js';
import { FONT } from '../render/palette.js';

// Colombia map in zone selector (v3.60): country first, each game region in its color;
// tapping a region zooms in to show its zones, each at its real-world town. Since v3.67 it opens
// first in 🗺️ Zones: country with current region highlighted, zooming straight to current zone.
// Traveling to another zone moves the Willys there; to another region, plane flies first (see travel).
//   root: main save   getZone: viewed zone   onGo(zone): switch zone   say(text): toast notice
import { t } from '../i18n/index.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = { cafetero: '#8bc34a', santander: '#e5a15a', costa: '#f2c14e', boyaca: '#9fb4d8', llanos: '#c8d66a', pacifico: '#4fb3bf', amazonas: '#3f9a5a', tolima: '#e39b6a', cundinamarca: '#d98fb5', bogota: '#b39ddb', sanandres: '#26c6da' };
const LAND = '#e8dcc3'; // departments not belonging to any game region
const LOCKED = '#cfc6b4'; // regions not yet released
const ZOOM_MS = 650;
// Manual zoom (v4.0): pinch or wheel, drag to pan. MIN_W: closest zoom (visible width
// in map units). Zooming far enough out of a region returns to country view.
const MIN_W = 24;
const DRAG_PX = 6; // finger travel before gesture counts as drag (rather than tap)
const PEEK_MS = 800; // on map open, pause showing full country before zooming into current region
// Upcoming regions (v3.67), in unassigned departments: «Coming soon».
// (v4.4.8) Work-in-progress hidden regions (`hidden`): Bogotá, in its departments.
const SOON = REGIONS.filter((r) => r.hidden).map((r) => ({ id: r.id, name: t(r.name), icon: r.icon, depts: DEPARTMENTS.filter((d) => d.region === r.id).map((d) => d.name), color: '#e3d6ea' }));
const SOON_OF = Object.fromEntries(SOON.flatMap((r) => r.depts.map((d) => [d, r])));


// Bounding box of an SVG path built solely from absolute M, L, and Z commands (as written by tools/geo).
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
// ViewBox showing a box with padding.
const viewOf = (b, pad) => ({ x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 });

const DEPT_BOX = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, pathBox(d.d)]));
const COUNTRY = union(Object.values(DEPT_BOX));
const COUNTRY_VIEW = viewOf(COUNTRY, 12);
// An off-map region (v5.4) has no departments: its box is the one around its zones and airport in the inset.
const REGION_BOX = Object.fromEntries(
  REGIONS.map((r) => {
    if (!r.offMap) return [r.id, union(DEPARTMENTS.filter((d) => d.region === r.id).map((d) => DEPT_BOX[d.id]))];
    const pts = [...r.zones.map((z) => ZONE_POS[z]), AIRSTRIP[r.id]];
    return [r.id, union(pts.map(([x, y]) => ({ x0: x, y0: y, x1: x, y1: y })))];
  }),
);
const SOON_BOX = Object.fromEntries(SOON.map((r) => [r.id, union(DEPARTMENTS.filter((d) => r.depts.includes(d.name)).map((d) => DEPT_BOX[d.id]))]));

// Layout of zones and airports on each region map, and close-up framing: ui/mapLayout.js (v4.4.10).

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
    this.region = null; // region currently zoomed in (null: country)
    this.busy = false; // while Willys drives (or plane flies)
    this.back = document.createElement('button');
    this.back.className = 'btn small zones-map-back';
    this.back.textContent = t('⬅ Colombia');
    this.back.hidden = true;
    this.back.addEventListener('click', () => !this.busy && this.zoomTo(null));
    this.svg = el('svg', { class: 'zones-map-svg', preserveAspectRatio: 'xMidYMid meet' });
    // ＋ and －, to zoom without pinch or wheel.
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
    // After drag or pinch, tap releases don't select anything.
    this.svg.addEventListener('click', (e) => this.dragged && (e.stopPropagation(), e.preventDefault()), true);
    this.depts = el('g', {}, this.svg);
    this.paths = DEPARTMENTS.map((d) => {
      const p = el('path', { d: d.d, class: 'zones-map-dept' }, this.depts);
      p.addEventListener('click', () => (SOON_OF[d.name] ? this.soon(SOON_OF[d.name]) : this.pickRegion(d.region)));
      return p;
    });
    this.highlight = null; // highlighted region at country level (current one, or destination during trip)
    this.peek = null; // pending auto-zoom on open
    this.overlay = el('g', { style: `font-family: ${FONT}` }, this.svg);
    this.vb = viewOf(COUNTRY, 12);
    this.applyView();
  }

  // On map open (v3.67): country with current region highlighted, then zooms in with current zone
  // highlighted.
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

  // On zone switch (v4.0): map opens zoomed straight into current region, skipping country. If new zone
  // is in same region, sprite just travels there; if another region, zooms out to country then into target.
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
      // At country level, highlighted region (current or destination) is emphasized while others dim slightly.
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
  // Screen point to map units.
  toMap(x, y) {
    const m = this.svg.getScreenCTM();
    if (!m) return [this.vb.x + this.vb.w / 2, this.vb.y + this.vb.h / 2];
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  // Map units per screen pixel.
  unitsPerPx() {
    const m = this.svg.getScreenCTM();
    return m ? 1 / m.a : this.vb.w / (this.svg.clientWidth || 1);
  }

  // Zoom in (k < 1) or out (k > 1) around map point (cx, cy), clamped between closest and full country.
  zoomAt(cx, cy, k) {
    const v = this.vb;
    const w = Math.min(COUNTRY_VIEW.w, Math.max(MIN_W, v.w * k));
    const f = w / v.w;
    this.vb = { x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w, h: v.h * f };
    this.clampView();
    this.applyView();
    this.redraw();
    // From a region, zooming far enough out returns to country view (same as «⬅ Colombia»).
    if (this.region && k > 1) {
      const out = Math.min(COUNTRY_VIEW.w, Math.max(ZONES_VIEW[this.region].w * 1.35, COUNTRY_VIEW.w * 0.6));
      if (this.vb.w >= out - 1e-6) {
        this.highlight = this.region;
        this.zoomTo(null);
      }
    }
  }

  // Pan viewport (in map units), keeping country within bounds.
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

  // Redraw markers and labels at constant screen size (once per frame).
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

  // ＋ and － buttons: centered smoothly around view center.
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
      // Two fingers: pinch zoom around midpoint while panning.
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
    // Tap immediately following a drag is ignored; subsequent taps work normally.
    if (!this.pointers.size && this.dragged) setTimeout(() => (this.dragged = false), 0);
  }

  wheel(e) {
    e.preventDefault();
    if (!this.canTouch()) return;
    clearTimeout(this.peek);
    this.zoomAt(...this.toMap(e.clientX, e.clientY), Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004));
  }

  // Smoothly transition viewBox from current to `to`.
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

  // Smoothly zoom into a region (or back out to country).
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
    // Zooming into another region (v4.4.11): plane lands at its airport. Skip during travel (busy), it already flew.
    if (regionId && !this.busy && regionId !== REGION_OF_ZONE[this.getZone()] && this.root.state.settings.travel !== 'direct') await this.arrive(regionId);
  }

  // Plane flies to target region's airport from the direction of current region,
  // lands, and fades out with runway. Choosing a zone here brings runway back and Willys drives out of it.
  async arrive(regionId) {
    this.busy = true;
    const strip = AIRSTRIP[regionId];
    const from = ZONE_POS[this.getZone()];
    const d = [strip[0] - from[0], strip[1] - from[1]];
    const n = Math.hypot(d[0], d[1]) || 1;
    const reach = Math.max(this.vb.w, this.vb.h) * 0.75;
    const start = [strip[0] - (d[0] / n) * reach, strip[1] - (d[1] / n) * reach];
    const before = this.overlay.childNodes.length;
    await this.fly(start, strip);
    for (const node of [...this.overlay.childNodes].slice(before)) node.remove();
    const rw = this.runway(strip);
    await wait(700);
    await animate(450, (t) => rw.setAttribute('opacity', String(1 - t)));
    rw.remove();
    this.busy = false;
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

  // Region names (country) or zone markers and trail (region). Label font size scales
  // with viewBox so text reads uniformly zoomed in or out.
  drawOverlay() {
    const g = this.overlay;
    g.replaceChildren();
    const u = this.vb.w / 100;
    const here = this.getZone();
    // (v5.5) Off-map islands, once open: a small sand-ringed island under each zone in the Caribbean inset.
    for (const r of shownRegions(isOpen(this.root.state))) {
      if (!r.offMap) continue;
      for (const z of r.zones) {
        const [x, y] = ZONE_POS[z];
        el('ellipse', { cx: x + 0.6, cy: y + 1, rx: 5.2, ry: 9.5, fill: '#f3e6c0', stroke: '#e0cfa0', 'stroke-width': 0.4, transform: `rotate(12 ${x} ${y})` }, g);
        el('ellipse', { cx: x + 0.6, cy: y + 1, rx: 4, ry: 8.2, fill: '#7cb342', transform: `rotate(12 ${x} ${y})` }, g);
      }
    }
    if (!this.region) {
      // (v5.4) A secret region shows up only once it has opened.
      for (const r of shownRegions(isOpen(this.root.state))) {
        if (r.hidden) continue; // goes with upcoming regions (v4.4.8)
        const b = REGION_BOX[r.id];
        const open = this.open(r.id);
        const cx = (b.x0 + b.x1) / 2;
        const cy = (b.y0 + b.y1) / 2;
        const label = el('g', { class: 'zones-map-label' + (open ? '' : ' locked'), transform: `translate(${cx} ${cy})` }, g);
        el('text', { 'font-size': 6.5 * u, 'text-anchor': 'middle', y: -1.5 * u }, label).textContent = open ? r.icon : '🔒';
        el('text', { 'font-size': 4.4 * u, 'text-anchor': 'middle', y: 4 * u, class: 'name', 'stroke-width': 1.2 * u }, label).textContent = r.name;
        label.addEventListener('click', () => this.pickRegion(r.id));
      }
      // Upcoming regions: name and «Coming soon».
      for (const r of SOON) {
        const b = SOON_BOX[r.id];
        const label = el('g', { class: 'zones-map-label soon', transform: `translate(${(b.x0 + b.x1) / 2} ${(b.y0 + b.y1) / 2})` }, g);
        el('text', { 'font-size': 4.6 * u, 'text-anchor': 'middle', y: -1.2 * u }, label).textContent = r.icon;
        el('text', { 'font-size': 2.9 * u, 'text-anchor': 'middle', y: 2.6 * u, class: 'name', 'stroke-width': 0.9 * u }, label).textContent = r.name;
        el('text', { 'font-size': 2.5 * u, 'text-anchor': 'middle', y: 5.6 * u, class: 'name soon-tag', 'stroke-width': 0.8 * u }, label).textContent = t('Próximamente');
        label.addEventListener('click', () => this.soon(r));
      }
      // Current location: pin on current zone.
      const [x, y] = proj(mapGeo(here));
      el('text', { x, y, 'font-size': 6.5 * u, 'text-anchor': 'middle', class: 'zones-map-pin' }, g).textContent = '📍';
      return;
    }
    const r = REGIONS_BY_ID[this.region];
    const state = regionState(this.root.state, r.id);
    // Dotted trail from each zone to the next.
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
      // Single-zone region (Bogotá, v4.6) omits zone number.
      name.textContent = `${r.zones.length > 1 ? `${i + 1} · ` : ''}${zone.name}${st?.complete ? (zoneMaxed(state, z) ? ' 🏁' : ' 🚩') : ''}`;
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

  // Trip to another zone (v3.67, also on zone clear or list pick; v4.4.11: if already viewing target
  // region, plane already landed on zoom, so Willys exits runway). Within same region,
  // Willys drives across region map. To another region (v4.1): zooms out to country, plane flies to
  // new region, zooms in, and Willys enters from border on the plane's arrival side.
  async travel(target) {
    clearTimeout(this.peek);
    // «⚡ Direct» (v4.1.3, in menu): skip travel animation.
    if (this.root.state.settings.travel === 'direct') return this.onGo(target);
    this.busy = true;
    const from = this.getZone();
    const here = REGION_OF_ZONE[from];
    const there = REGION_OF_ZONE[target];
    if (here === there) {
      if (this.region !== here) await this.zoomTo(here);
      await this.drive(ZONE_POS[from], ZONE_POS[target], target);
    } else {
      // If already viewing destination zone's region (zone picked right there), skip full trip.
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
        // Lands on region's runway near its final zone (v4.3.2: previously in center, with Willys
        // entering from map edge).
        await this.fly(ZONE_POS[from], AIRSTRIP[there]);
        await wait(200);
        await this.zoomTo(there);
      }
      // Willys drives off the runway.
      this.runway(AIRSTRIP[there]);
      await this.drive(AIRSTRIP[there], ZONE_POS[target], target);
    }
    await wait(250);
    this.busy = false;
    this.onGo(target);
  }

  // Landing runway (v4.3.2), with plane parked beside it.
  runway([x, y]) {
    const u = this.vb.w / 100;
    const g = el('g', { transform: `translate(${x} ${y}) rotate(-28)` }, this.overlay);
    el('rect', { x: -7 * u, y: -1.3 * u, width: 14 * u, height: 2.6 * u, rx: 0.6 * u, fill: '#6d6f73', stroke: '#3a2418', 'stroke-width': 0.25 * u }, g);
    for (let i = -5; i <= 4; i += 2) el('rect', { x: i * u, y: -0.15 * u, width: 1.1 * u, height: 0.3 * u, fill: '#f4efe6' }, g);
    const parked = el('g', { transform: `translate(${3 * u} ${-3.4 * u}) scale(${0.32 * u})` }, g);
    plane(parked);
    return g;
  }

  // Willys drives from a to b (in current view) along dotted trail; destination highlights (v4.1: previously
  // walked a stick figure). Uses destination region's Willys paint color.
  async drive(a, b, target) {
    const u = this.vb.w / 100;
    this.overlay.querySelector(`[data-zone="${target}"]`)?.classList.add('target');
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'zones-map-road', 'stroke-width': 0.7 * u, 'stroke-dasharray': `${1.4 * u} ${1.1 * u}` }, this.overlay);
    const color = chosenDecor(this.root.state.profile, REGION_OF_ZONE[target]).willys.color;
    const car = el('g', { class: 'zones-map-walker' }, this.overlay);
    el('ellipse', { rx: 4.6 * u, ry: 0.9 * u, class: 'shadow' }, car);
    const body = willys(car, `#${color.toString(16).padStart(6, '0')}`);
    // Sprite faces right: flip horizontally when heading left.
    const flip = b[0] < a[0] ? -1 : 1;
    const ms = 900 + Math.min(1200, (Math.hypot(b[0] - a[0], b[1] - a[1]) / u) * 22);
    await animate(ms, (t) => {
      const k = ease(t);
      // Bounces along dirt road: short hops and pitch tilt.
      const bump = Math.abs(Math.sin((t * ms) / 90)) * 0.5 * u;
      const tilt = Math.sin((t * ms) / 130) * 3;
      car.setAttribute('transform', `translate(${a[0] + (b[0] - a[0]) * k} ${a[1] + (b[1] - a[1]) * k})`);
      body.setAttribute('transform', `translate(0 ${-bump}) scale(${flip * 0.42 * u} ${0.42 * u}) rotate(${tilt})`);
    });
  }

  // Plane flies from a to b over country (v4.1): parabolic arc with ground shadow shrinking on climb
  // and approaching on landing.
  async fly(a, b) {
    const u = this.vb.w / 100;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const dist = Math.hypot(dx, dy) || 1;
    // Arc curves toward top of screen.
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
      const lift = Math.sin(Math.PI * k); // 0 on ground, 1 at peak altitude
      const size = (0.42 + 0.16 * lift) * u;
      g.setAttribute('transform', `translate(${x} ${y - lift * 2.5 * u}) rotate(${angle}) scale(${size})`);
      shadow.setAttribute('transform', `translate(${x + lift * 2 * u} ${y + lift * 1.5 * u}) rotate(${angle}) scale(${0.42 * u})`);
      prop.setAttribute('transform', `scale(1 ${Math.cos((t * ms) / 25)})`);
    });
  }
}

// Run `frame(t)` animation for `ms` milliseconds with t from 0 to 1.
const animate = (ms, frame) =>
  new Promise((ok) => {
    const t0 = performance.now();
    frame(0); // in position and scaled from the first frame
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else ok();
    };
    requestAnimationFrame(step);
  });

// Side-profile Willys facing right, wheels on ground (0, 0): colored body,
// hood, windshield, canvas top, rear spare tire, and headlight.
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

// Top-down plane, nose right: yellow wings, white fuselage, tail in
// blue and red. `flat`: silhouette only (for shadow). Returns spinning propeller.
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
  // Propeller at nose: spins by scaling vertical height (centered at y = 0).
  el('path', { d: 'M 10.1 -3 V 3', stroke: flat ? '#000' : '#6b6b6b', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, prop);
  return prop;
}
