import { Container, Graphics, Text, Texture } from 'pixi.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { Background } from './Background.js';
import { Camera } from './Camera.js';
import { Terrain } from './Terrain.js';
import { Effects } from './Effects.js';
import { FarmView, PlotView, WarehouseView } from './Stations.js';
import { BuildingView } from './Buildings.js';
import { JeepView, MuleView } from './Carriers.js';
import { iso } from './iso.js';
import { pointAt, pointAtDistance } from '../core/path.js';
import { formatAmount, formatNumber } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchCapacity } from '../sim/rules.js';
import { ROAD_POS, zoneOf } from '../sim/chain.js';
import { warehouseCap } from '../sim/transport.js';
import { dispatchMult } from '../sim/modifiers.js';
import { quoteUnlock } from '../sim/upgrades.js';
import { DayNight } from './DayNight.js';

const DIVERT_ICON_TIME = 3; // s que se muestra ↪️ tras un desvío
const STARVED_ICON_TIME = 8; // s sin entrada antes de mostrar ⏸️

// Altura (px) de la etiqueta sobre cada tipo de edificio.
const LABEL_HEIGHT = { farm: 70, dispatch: 100, plot: 62, building: 96 };

// Arma el mundo de una zona y lo mantiene sincronizado con el estado de la simulación.
// Al cambiar de zona se destruye (destroy) y se crea otra.
export class Scene {
  constructor(app, game, sound, zone) {
    this.app = app;
    this.game = game;
    this.sound = sound;
    this.zone = zone;
    this.sourceId = zone.farm.stationId;
    this.time = 0;
    this.onSelect = () => {};

    this.background = new Background();
    this.world = new Container();
    this.objects = new Container();
    this.objects.sortableChildren = true;
    this.labels = new Container();
    this.effects = new Effects();
    // El suelo y los objetos se tiñen según la hora; luces, etiquetas y efectos van encima sin teñir.
    this.tinted = new Container();
    this.lights = new Container();
    this.lightTexture = createGlowTexture();
    app.stage.addChild(this.background.stars, this.background.view, this.world);

    this.terrain = new Terrain(this.zone);
    this.tinted.addChild(this.terrain.ground, this.objects);
    this.world.addChild(this.tinted, this.lights, this.labels, this.effects.view);
    for (const d of this.terrain.decor) this.objects.addChild(d);

    this.stations = {};
    this.farm = new FarmView(this.zone, STATIONS_BY_ID[this.sourceId]);
    this.warehouse = new WarehouseView(this.zone);
    this.addStationView(this.sourceId, this.farm, LABEL_HEIGHT.farm);
    this.addStationView('dispatch', this.warehouse, LABEL_HEIGHT.dispatch);
    for (const plot of this.zone.plots) this.buildStation(plot.stationId);
    this.stationIds = [this.sourceId, ...this.zone.plots.map((p) => p.stationId)];

    this.jeep = new JeepView();
    this.objects.addChild(this.jeep);
    this.mules = new Map();
    this.drawExitSign();

    const n = this.zone.size;
    const left = iso(0, n);
    const right = iso(n, 0);
    const bottom = iso(n, n);
    this.camera = new Camera(this.world, app.canvas, { minX: left.x, maxX: right.x, minY: -200, maxY: bottom.y });
    this.resize(app.screen.width, app.screen.height);
    // Vista inicial: del cafetal a la bodega.
    const top = iso(this.zone.farm.x, this.zone.farm.y, 60);
    const end = iso(...this.zone.jeepRoad.at(-1));
    const l = iso(this.zone.farm.x, this.zone.farm.y + this.zone.farm.h + 6);
    const r = iso(this.zone.warehouse.x + 4, this.zone.warehouse.y);
    this.camera.fit({ minX: l.x, maxX: r.x, minY: top.y, maxY: end.y });

    this.dayNight = new DayNight(this);
    // Flecha que señala qué tocar (ver HUD.guideTarget).
    this.guide = new Graphics();
    this.guide.poly([-12, -18, 12, -18, 0, 0]).fill(0xffe066).stroke({ width: 3, color: 0x3a2418 });
    this.guide.rect(-5, -32, 10, 15).fill(0xffe066).stroke({ width: 3, color: 0x3a2418 });
    this.guide.visible = false;
    this.labels.addChild(this.guide);
    this.guideId = null;
    this.bindEvents();
    this.smokeTimer = 0;
    this.ambientTimer = 0;
  }

  addStationView(id, view, labelHeight) {
    this.stations[id] = view;
    this.objects.addChild(view);
    view.on('pointertap', () => {
      if (!this.camera.dragged) this.onSelect(id === 'dispatch' ? `dispatch:${this.zone.id}` : id);
    });
    const a = view.anchorPoint(labelHeight);
    view.label.position.set(a.x, a.y);
    view.status.position.set(a.x, a.y - 30);
    view.statusY = a.y - 30;
    this.labels.addChild(view.label, view.status);
    this.lights.addChild(view.lightLayer);
  }

  // Parcela (si no está construida) o edificio de una estación de la cadena.
  buildStation(id) {
    const old = this.stations[id];
    if (old) {
      const wasSelected = old.selected;
      old.destroy({ children: true });
      old.label.destroy({ children: true });
      old.status.destroy();
      old.lightLayer.destroy({ children: true });
      if (wasSelected) this.pendingSelect = id;
    }
    const plot = this.zone.plots.find((p) => p.stationId === id);
    const def = STATIONS_BY_ID[id];
    const built = Boolean(this.game.state.stations[id]);
    const view = built ? new BuildingView(plot, def) : new PlotView(plot, def);
    this.addStationView(id, view, built ? LABEL_HEIGHT.building : LABEL_HEIGHT.plot);
    if (this.pendingSelect === id) {
      view.setSelected(true);
      this.pendingSelect = null;
    }
  }

  drawExitSign() {
    const view = new WoodSign('Al pueblo ➜');
    const [gx, gy] = this.zone.exitSign;
    const p = iso(gx, gy);
    view.position.set(p.x, p.y);
    view.zIndex = gx + gy;
    this.objects.addChild(view);
    this.exitPoint = iso(...this.zone.jeepRoad.at(-1), 40);
  }

  resize(w, h) {
    this.background.resize(w, h);
    this.camera?.resize(w, h);
  }

  // Solo reacciona a lo que pasa en su zona (las demás siguen produciendo sin efectos visuales).
  bindEvents() {
    const bus = this.game.bus;
    const zone = this.zone.id;
    const on = (type, fn) => this.unsubs.push(bus.on(type, fn));
    this.unsubs = [];
    on('sold', ({ zone: z, coins }) => {
      if (z !== zone) return;
      const p = this.exitPoint;
      this.effects.floatText(p.x, p.y - 20, `+${formatNumber(coins)} 💰`, { color: 0xffe066, size: 20 });
      this.effects.coins(p.x, p.y);
      this.sound.coin();
    });
    on('muleArrived', (m) => {
      if (m.to !== 'warehouse' || zoneOf(m.from) !== zone) return;
      const p = iso(...this.zone.muleRoad.at(-1), 40);
      this.effects.floatText(p.x, p.y, `+${formatAmount(m.amount)} ${PRODUCTS[m.productId].icon}`, { size: 14 });
    });
    on('produced', ({ stationId, productId, amount }) => {
      if (stationId !== this.sourceId) return;
      for (let i = 0; i < Math.min(amount, 3); i++) {
        const p = this.farm.randomBushTop();
        this.effects.hop(p.x, p.y, PRODUCTS[productId].color);
      }
    });
    on('levelUp', ({ id, to, milestone }) => {
      const [sid, part] = id.split(':');
      if (sid === 'dispatch' ? part !== zone : zoneOf(sid) !== zone) return;
      const view = this.stations[sid];
      if (!view) return;
      const p = view.anchorPoint(30);
      view.bounce?.('bump');
      this.effects.sparkle(p.x, p.y);
      if (milestone) this.sound.milestone();
      else this.sound.levelUp();
      this.effects.ring(p.x, p.y + 30);
      this.effects.floatText(p.x, p.y - 20, milestone ? `¡Hito nivel ${milestone}! ×2` : part === 'transport' ? `🐴 Arrieros nivel ${to}` : `Nivel ${to}`, {
        color: milestone ? 0xffe066 : 0xffffff,
        size: milestone ? 22 : 16,
        life: milestone ? 2.2 : 1.2,
      });
      if (milestone) this.effects.confetti(p.x, p.y - 10);
    });
    on('unlocked', ({ id }) => {
      if (zoneOf(id) !== zone) return;
      this.buildStation(id);
      this.stations[id].bounce('pop');
      this.sound.build();
      const p = this.stations[id].anchorPoint(40);
      this.effects.ring(p.x, p.y + 40, 0xffffff);
      this.effects.confetti(p.x, p.y, 60);
      this.effects.floatText(p.x, p.y - 30, `¡${STATIONS_BY_ID[id].name}!`, { color: 0xffe066, size: 22, life: 2.4 });
    });
  }

  // Quita la escena del escenario y suelta sus eventos (al cambiar de zona).
  destroy() {
    for (const off of this.unsubs) off();
    this.camera.destroy();
    for (const child of this.app.stage.removeChildren()) child.destroy({ children: true });
  }

  // id de estación o null.
  setGuide(id) {
    this.guideId = id;
    this.guide.visible = Boolean(id) && Boolean(this.stations[id]);
    if (!this.guide.visible) return;
    const view = this.stations[id];
    const h = view instanceof PlotView ? LABEL_HEIGHT.plot : id === this.sourceId ? LABEL_HEIGHT.farm : id === 'dispatch' ? LABEL_HEIGHT.dispatch : LABEL_HEIGHT.building;
    const p = view.anchorPoint(h + 22);
    this.guideBase = p;
  }

  select(id) {
    for (const [key, view] of Object.entries(this.stations)) view.setSelected(key === id);
  }

  update(dt) {
    this.time += dt;
    const state = this.game.state;
    this.dayNight.update(state.playTime);
    this.background.update(dt, this.camera);
    this.farm.sync(state);
    this.warehouse.sync(state.zones[this.zone.id], warehouseCap(state, this.zone.id));
    for (const id of this.stationIds) {
      const view = this.stations[id];
      if (view instanceof PlotView) view.sync(quoteUnlock(state, id));
      else if (view instanceof BuildingView) view.sync(state);
      view.setStatus(statusIcon(state, id));
    }
    for (const view of Object.values(this.stations)) {
      if (view.lightsDirty) view.buildLights(this.lightTexture);
      view.update(dt, this.time);
      if (view.status.visible) view.status.y = view.statusY + Math.sin(this.time * 4) * 3;
    }

    if (this.guide.visible && this.guideBase) {
      this.guide.position.set(this.guideBase.x, this.guideBase.y - Math.abs(Math.sin(this.time * 3.5)) * 10);
    }

    this.syncMules(state);
    this.syncJeep(state);

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.6;
      this.effects.smoke(this.warehouse.chimney.x, this.warehouse.chimney.y);
      for (const view of Object.values(this.stations)) {
        if (!view.working) continue;
        for (const p of view.smokePoints ?? []) this.effects.smoke(p.x, p.y);
      }
    }
    this.updateAmbient(dt);
    this.effects.update(dt);
  }

  // Luciérnagas y sonidos de ambiente según la hora.
  updateAmbient(dt) {
    const night = this.dayNight.light;
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.5;
    if (night > 0.5) {
      const n = this.zone.size;
      for (let i = 0; i < 2; i++) {
        const gx = Math.random() * n;
        const gy = Math.random() * n;
        if (this.terrain.tiles[Math.floor(gx)][Math.floor(gy)] !== 'grass') continue;
        const p = iso(gx, gy, 8 + Math.random() * 20);
        this.effects.firefly(p.x, p.y, this.lightTexture);
      }
      if (Math.random() < 0.15) this.sound.cricket();
    } else if (Math.random() < 0.04) {
      this.sound.chirp();
    }
  }

  syncMules(state) {
    const alive = new Set();
    const pos = ROAD_POS[this.zone.id];
    for (const m of state.mules) {
      if (zoneOf(m.from) !== this.zone.id) continue;
      alive.add(m.id);
      let view = this.mules.get(m.id);
      if (!view) {
        view = new MuleView(m.productId);
        this.mules.set(m.id, view);
        this.objects.addChild(view);
      }
      // Ida: de la estación al destino con carga. Vuelta: vacía, en sentido contrario.
      const a = pos[m.from];
      const b = pos[m.to];
      const f = Math.min(m.t / m.duration, 1);
      const going = m.phase === 'go';
      const p = pointAtDistance(this.zone.muleRoad, going ? a + (b - a) * f : b + (a - b) * f);
      const dir = going === b > a ? 1 : -1;
      view.setLoaded(going);
      view.place(p.gx, p.gy, p.dx * dir, p.dy * dir, this.time);
    }
    for (const [id, view] of this.mules) {
      if (alive.has(id)) continue;
      view.destroy({ children: true });
      this.mules.delete(id);
    }
  }

  syncJeep(state) {
    const zone = state.zones[this.zone.id];
    const j = zone.jeep;
    const half = DISPATCH.tripTime / 2;
    const road = this.zone.jeepRoad;
    let t = 0;
    let reverse = false;
    if (j.phase === 'out') t = j.t / half;
    else if (j.phase === 'back') {
      t = 1 - j.t / half;
      reverse = true;
    }
    // Suaviza arranque y frenado.
    const eased = t * t * (3 - 2 * t);
    const p = pointAt(road, eased);
    const load = Object.values(j.load).reduce((a, b) => a + b, 0) / dispatchCapacity(zone.dispatch.level, dispatchMult(state, this.zone.id));
    const waiting = j.phase === 'idle' ? Math.min(1, j.waited / DISPATCH.maxWait) * 0.3 : 0;
    this.jeep.place(p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, j.phase === 'out' ? load : waiting);
  }

  // Posición en pantalla (px) de una estación, para centrar la cámara.
  stationWorldPoint(id) {
    return this.stations[id].anchorPoint(0);
  }
}

// Icono sobre la estación: ⛔ patio lleno, ⏸️ esperando entrada, ↪️ desviando a la bodega.
export function statusIcon(state, id) {
  const st = state.stations[id];
  if (!st) return null;
  if (st.status === 'blocked') return '⛔';
  if (st.status === 'starved' && st.idle > STARVED_ICON_TIME) return '⏸️';
  if (st.lastDiverted !== undefined && state.playTime - st.lastDiverted < DIVERT_ICON_TIME) return '↪️';
  return null;
}

// Halo suave (degradado radial) para luces, faroles y luciérnagas.
function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

// Letrero de madera simple.
class WoodSign extends Container {
  constructor(text) {
    super();
    const g = new Graphics();
    g.rect(-1.5, -26, 3, 26).fill(PAL.woodDark);
    g.roundRect(-34, -44, 68, 18, 4).fill(PAL.wood).stroke(OUTLINE);
    const t = new Text({ text, style: { fontFamily: FONT, fontSize: 11, fontWeight: '600', fill: 0xfff3d6 }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(0, -35);
    this.addChild(g, t);
  }
}
