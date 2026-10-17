import { Container, Graphics, Text } from 'pixi.js';
import { PAL, OUTLINE } from './palette.js';
import { Background } from './Background.js';
import { Camera } from './Camera.js';
import { Terrain } from './Terrain.js';
import { Effects } from './Effects.js';
import { FarmView, PlotView, WarehouseView } from './Stations.js';
import { JeepView, MuleView } from './Carriers.js';
import { iso } from './iso.js';
import { pointAt } from '../core/path.js';
import { formatNumber } from '../core/format.js';
import { ZONE1 } from '../data/zones/zone1_finca.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { dispatchCapacity, warehouseCapacity } from '../sim/rules.js';

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

    this.farm = new FarmView(this.zone);
    this.warehouse = new WarehouseView(this.zone);
    this.plots = this.zone.plots.map((p) => new PlotView(p, STATIONS_BY_ID[p.stationId]));
    this.stations = { farm: this.farm, dispatch: this.warehouse };
    for (const p of this.plots) this.stations[p.def.id] = p;
    for (const [id, view] of Object.entries(this.stations)) {
      this.objects.addChild(view);
      view.on('pointertap', () => {
        if (!this.camera.dragged) this.onSelect(id);
      });
      const a = view.anchorPoint(id === 'farm' ? 70 : id === 'dispatch' ? 100 : 62);
      view.label.position.set(a.x, a.y);
      this.labels.addChild(view.label);
    }
    const s = this.farm.anchorPoint(110);
    this.farm.status.position.set(s.x, s.y);
    this.statusY = s.y;
    this.labels.addChild(this.farm.status);

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
    this.farm.sync(game.state);
    this.smokeTimer = 0;
  }

  drawExitSign() {
    const view = new PlotSign('Al pueblo ➜');
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
      const p = iso(...this.zone.muleRoad.at(-1), 40);
      this.effects.floatText(p.x, p.y, `+${m.amount} ${PRODUCTS[m.productId].icon}`, { size: 14 });
    });
    bus.on('produced', ({ productId, amount }) => {
      for (let i = 0; i < Math.min(amount, 3); i++) {
        const p = this.farm.randomBushTop();
        this.effects.hop(p.x, p.y, PRODUCTS[productId].color);
      }
    });
    bus.on('levelUp', ({ id, to, milestone }) => {
      const view = this.stations[id];
      const p = view.anchorPoint(30);
      this.effects.ring(p.x, p.y + 30);
      this.effects.floatText(p.x, p.y - 20, milestone ? `¡Hito nivel ${milestone}! ×2` : `Nivel ${to}`, { color: milestone ? 0xffe066 : 0xffffff, size: milestone ? 22 : 16, life: milestone ? 2.2 : 1.2 });
      if (milestone) this.effects.confetti(p.x, p.y - 10);
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
    for (const view of Object.values(this.stations)) view.update(dt, this.time);
    this.farm.status.y = this.statusY + Math.sin(this.time * 4) * 3;

    this.syncMules(state);
    this.syncJeep(state);

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.6;
      this.effects.smoke(this.warehouse.chimney.x, this.warehouse.chimney.y);
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
      const p = pointAt(this.zone.muleRoad, m.t / m.duration);
      view.place(p.gx, p.gy, p.dx, p.dy, this.time);
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

// Letrero de madera simple.
class PlotSign extends Container {
  constructor(text) {
    super();
    const g = new Graphics();
    g.rect(-1.5, -26, 3, 26).fill(PAL.woodDark);
    g.roundRect(-34, -44, 68, 18, 4).fill(PAL.wood).stroke(OUTLINE);
    const t = new Text({ text, style: { fontFamily: 'Fredoka, system-ui', fontSize: 11, fontWeight: '600', fill: 0xfff3d6 }, resolution: 3 });
    t.anchor.set(0.5);
    t.position.set(0, -35);
    this.addChild(g, t);
  }
}
