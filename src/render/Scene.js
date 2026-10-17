import { Container, Graphics, Text } from 'pixi.js';
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
import { formatNumber } from '../core/format.js';
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchCapacity, warehouseCapacity } from '../sim/rules.js';
import { CHAIN, ROAD_POS } from '../sim/chain.js';
import { quoteUnlock } from '../sim/upgrades.js';

const DIVERT_ICON_TIME = 3; // s que se muestra ↪️ tras un desvío
const STARVED_ICON_TIME = 8; // s sin entrada antes de mostrar ⏸️

// Altura (px) de la etiqueta sobre cada tipo de edificio.
const LABEL_HEIGHT = { farm: 70, dispatch: 100, plot: 62, building: 82 };

// Arma el mundo y lo mantiene sincronizado con el estado de la simulación.
export class Scene {
  constructor(app, game) {
    this.app = app;
    this.game = game;
    this.zone = ZONE1;
    this.time = 0;
    this.onSelect = () => {};

    this.background = new Background();
    this.world = new Container();
    this.objects = new Container();
    this.objects.sortableChildren = true;
    this.labels = new Container();
    this.effects = new Effects();
    app.stage.addChild(this.background.view, this.world);

    this.terrain = new Terrain(this.zone);
    this.world.addChild(this.terrain.ground, this.objects, this.labels, this.effects.view);
    for (const d of this.terrain.decor) this.objects.addChild(d);

    this.stations = {};
    this.farm = new FarmView(this.zone);
    this.warehouse = new WarehouseView(this.zone);
    this.addStationView('farm', this.farm, LABEL_HEIGHT.farm);
    this.addStationView('dispatch', this.warehouse, LABEL_HEIGHT.dispatch);
    for (const plot of this.zone.plots) this.buildStation(plot.stationId);

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

    this.bindEvents();
    this.smokeTimer = 0;
  }

  addStationView(id, view, labelHeight) {
    this.stations[id] = view;
    this.objects.addChild(view);
    view.on('pointertap', () => {
      if (!this.camera.dragged) this.onSelect(id);
    });
    const a = view.anchorPoint(labelHeight);
    view.label.position.set(a.x, a.y);
    view.status.position.set(a.x, a.y - 30);
    view.statusY = a.y - 30;
    this.labels.addChild(view.label, view.status);
  }

  // Parcela (si no está construida) o edificio de una estación de la cadena.
  buildStation(id) {
    const old = this.stations[id];
    if (old) {
      const wasSelected = old.selected;
      old.destroy({ children: true });
      old.label.destroy({ children: true });
      old.status.destroy();
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

  bindEvents() {
    const bus = this.game.bus;
    bus.on('sold', ({ coins }) => {
      const p = this.exitPoint;
      this.effects.floatText(p.x, p.y - 20, `+${formatNumber(coins)} 💰`, { color: 0xffe066, size: 20 });
    });
    bus.on('muleArrived', (m) => {
      if (m.to !== 'warehouse') return;
      const p = iso(...this.zone.muleRoad.at(-1), 40);
      this.effects.floatText(p.x, p.y, `+${m.amount} ${PRODUCTS[m.productId].icon}`, { size: 14 });
    });
    bus.on('produced', ({ stationId, productId, amount }) => {
      if (stationId !== 'farm') return;
      for (let i = 0; i < Math.min(amount, 3); i++) {
        const p = this.farm.randomBushTop();
        this.effects.hop(p.x, p.y, PRODUCTS[productId].color);
      }
    });
    bus.on('levelUp', ({ id, to, milestone }) => {
      const p = this.stations[id.split(':')[0]].anchorPoint(30);
      this.effects.ring(p.x, p.y + 30);
      this.effects.floatText(p.x, p.y - 20, milestone ? `¡Hito nivel ${milestone}! ×2` : id.endsWith(':transport') ? `🐴 Arrieros nivel ${to}` : `Nivel ${to}`, {
        color: milestone ? 0xffe066 : 0xffffff,
        size: milestone ? 22 : 16,
        life: milestone ? 2.2 : 1.2,
      });
      if (milestone) this.effects.confetti(p.x, p.y - 10);
    });
    bus.on('unlocked', ({ id }) => {
      this.buildStation(id);
      const p = this.stations[id].anchorPoint(40);
      this.effects.ring(p.x, p.y + 40, 0xffffff);
      this.effects.confetti(p.x, p.y, 60);
      this.effects.floatText(p.x, p.y - 30, `¡${STATIONS_BY_ID[id].name}!`, { color: 0xffe066, size: 22, life: 2.4 });
    });
  }

  select(id) {
    for (const [key, view] of Object.entries(this.stations)) view.setSelected(key === id);
  }

  update(dt) {
    this.time += dt;
    const state = this.game.state;
    this.background.update(dt, this.camera);
    this.farm.sync(state);
    this.warehouse.sync(state, warehouseCapacity(state.dispatch.level));
    for (const id of CHAIN) {
      const view = this.stations[id];
      if (view instanceof PlotView) view.sync(quoteUnlock(state, id));
      else if (view instanceof BuildingView) view.sync(state);
      view.setStatus(statusIcon(state, id));
    }
    for (const view of Object.values(this.stations)) {
      view.update(dt, this.time);
      if (view.status.visible) view.status.y = view.statusY + Math.sin(this.time * 4) * 3;
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
    this.effects.update(dt);
  }

  syncMules(state) {
    const alive = new Set();
    for (const m of state.mules) {
      alive.add(m.id);
      let view = this.mules.get(m.id);
      if (!view) {
        view = new MuleView(m.productId);
        this.mules.set(m.id, view);
        this.objects.addChild(view);
      }
      // Ida: de la estación al destino con carga. Vuelta: vacía, en sentido contrario.
      const a = ROAD_POS[m.from];
      const b = ROAD_POS[m.to];
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
    const j = state.jeep;
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
    const load = Object.values(j.load).reduce((a, b) => a + b, 0) / dispatchCapacity(state.dispatch.level);
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
