import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { Background } from './Background.js';
import { Camera } from './Camera.js';
import { Terrain, ZONE_SIGN } from './Terrain.js';
import { KEEPER_SPOT, KeeperView } from './Keeper.js';
import { Pets } from './Pets.js';
import { EventArt } from './EventArt.js';
import { LOOK } from './look.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { Effects } from './Effects.js';
import { FarmView, PlotView, WarehouseView } from './Stations.js';
import { BuildingView } from './Buildings.js';
import { ChivaView, JeepView, MuleView } from './Carriers.js';
import { Belts } from './Belts.js';
import { Critters } from './Critters.js';
import { iso } from './iso.js';
import { pointAt, pointAtDistance } from '../core/path.js';
import { formatAmount, formatNumber } from '../core/format.js';
import { DISPATCH, STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { BELT_LEVEL, dispatchCapacity, hasBelt, milestoneBoost } from '../sim/rules.js';
import { ROAD_POS, zoneOf } from '../sim/chain.js';
import { normalDest, slowConsumers, warehouseCap } from '../sim/transport.js';
import { alerts } from '../sim/alerts.js';
import { dispatchMult, jeepCount } from '../sim/modifiers.js';
import { jeepsOf, sellableStock } from '../sim/dispatch.js';
import { clockOf, resting } from '../sim/calendar.js';
import { eventPenalty } from '../sim/events.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { quoteUnlock } from '../sim/upgrades.js';
import { ROUTES, ROUTES_BY_ID } from '../data/routes.js';
import { routeActive, routeCapacity } from '../sim/routes.js';
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { DayNight } from './DayNight.js';
import { Weather } from './Weather.js';


// Altura (px) de la etiqueta sobre cada tipo de edificio.
const LABEL_HEIGHT = { farm: 70, dispatch: 100, plot: 62, building: 96 };

// Arma el mundo de una zona y lo mantiene sincronizado con el estado de la simulación.
// Al cambiar de zona se destruye (destroy) y se crea otra.
const EVENT_DAYTIME = 40; // s de juego: las 10:00 del primer día

export class Scene {
  constructor(app, game, sound, zone) {
    this.app = app;
    this.game = game;
    this.sound = sound;
    this.zone = zone;
    this.sourceId = zone.farm.stationId;
    this.time = 0;
    this.restSince = [null, null];
    this.jeepPhase = 'idle';
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
    this.carLights = new Map(); // faros de los Willys y las chivas (v3.12)
    this.weather = new Weather();
    app.stage.addChild(this.background.stars, this.background.view, this.world, this.weather.view);

    // Con el segundo Willys (v3.9), la carretera tiene dos carriles: cada Willys va por el suyo.
    this.jeepCount = jeepCount(game.state);
    this.terrain = new Terrain(this.zone, this.jeepCount);
    // Bandas eléctricas: sobre el suelo, debajo de edificios y mulas.
    this.belts = new Belts(this.zone.muleRoad);
    this.tinted.addChild(this.terrain.ground, this.belts, this.objects);
    this.world.addChild(this.tinted, this.lights, this.labels, this.effects.view);
    for (const d of this.terrain.decor) this.objects.addChild(d);
    // Luces de noche de la decoración (v3.29: el portón y las ventanas de la iglesia, los faroles).
    for (const l of this.terrain.glows) {
      const s = new Sprite(this.lightTexture);
      s.anchor.set(0.5);
      s.position.set(l.x, l.y);
      s.scale.set(l.r / 32);
      s.tint = l.color ?? 0xffc864;
      s.blendMode = 'add';
      this.lights.addChild(s);
    }

    this.stations = {};
    this.farm = new FarmView(this.zone, STATIONS_BY_ID[this.sourceId]);
    this.warehouse = new WarehouseView(this.zone);
    this.addStationView(this.sourceId, this.farm, LABEL_HEIGHT.farm);
    this.addStationView('dispatch', this.warehouse, LABEL_HEIGHT.dispatch);
    for (const plot of this.zone.plots) this.buildStation(plot.stationId);
    this.stationIds = [this.sourceId, ...this.zone.plots.map((p) => p.stationId)];

    this.jeeps = Array.from({ length: this.jeepCount }, (_, k) => new JeepView(k));
    for (const jeep of this.jeeps) this.objects.addChild(jeep);
    this.critters = new Critters(this.zone, this.terrain, this.objects);
    this.pets = new Pets(this.zone, this.terrain, this.objects); // gatos y loros de la región (v3.12)
    // En el tablero de un evento, lo que pasa se ve (v3.14).
    this.eventArt = game.state.event ? new EventArt(this, game.state) : null;
    this.mules = new Map();
    this.drawExitSign();
    this.drawZoneSign();
    // La persona de la zona, junto al letrero (v3.12): al tocarla habla (main.js: onTalk).
    this.onTalk = () => {};
    this.keeper = new KeeperView(this.zone.id, ZONE_LIST.findIndex((z) => z.id === this.zone.id));
    this.keeper.place(...KEEPER_SPOT);
    this.keeper.on('pointertap', () => {
      if (!this.camera?.dragged) this.onTalk(this.zone.id);
    });
    this.objects.addChild(this.keeper);
    // Rutas que salen de esta zona o llegan a ella: carretera, letrero y la Chiva.
    this.routes = ROUTES.filter((r) => this.zone.routes?.[r.id]).map((r) => {
      const view = new ChivaView(r.product);
      const open = () => {
        if (!this.camera?.dragged) this.onSelect(`route:${r.id}`);
      };
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.on('pointertap', open);
      this.objects.addChild(view);
      const info = this.zone.routes[r.id];
      const sign = new WoodSign(info.text);
      const [gx, gy] = info.sign;
      const p = iso(gx, gy);
      sign.position.set(p.x, p.y);
      sign.zIndex = gx + gy;
      sign.eventMode = 'static';
      sign.cursor = 'pointer';
      sign.on('pointertap', open);
      this.objects.addChild(sign);
      return { def: r, road: info.road, outgoing: r.from === this.zone.id, view, sign };
    });

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

  // El nombre de la zona (v3.12): un letrero grande junto a la carretera, con la región debajo.
  drawZoneSign() {
    const region = REGIONS_BY_ID[REGION_OF_ZONE[this.zone.id]];
    const view = new ZoneSign(`${this.zone.icon} ${this.zone.name}`, `${region.icon} ${region.name}`);
    const [gx, gy] = ZONE_SIGN;
    const p = iso(gx, gy);
    view.position.set(p.x, p.y);
    view.zIndex = gx + gy;
    this.objects.addChild(view);
  }

  drawExitSign() {
    const view = new WoodSign(this.zone.exitText ?? 'Al pueblo ➜');
    // Con dos carriles (v3.9) el letrero quedaría en el del segundo Willys: pasa al otro lado de la carretera.
    const [sx, sy] = this.zone.exitSign;
    const [gx, gy] = this.jeepCount > 1 ? [sx - 2.1, sy] : [sx, sy];
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
    on('routeArrived', ({ route, load }) => {
      const r = ROUTES.find((x) => x.id === route);
      if (r.to !== zone) return;
      const station = r.stations.find((id) => this.stations[id] && this.game.state.stations[id]);
      if (!station) return;
      const p = this.stations[station].anchorPoint(70);
      this.effects.floatText(p.x, p.y, `🚌 +${formatAmount(load)} ${PRODUCTS[r.product].icon}`, { size: 16, color: 0xffe066 });
    });
    on('routeDeparted', ({ route, load }) => {
      const r = ROUTES.find((x) => x.id === route);
      if (r.from !== zone) return;
      const p = iso(...this.zone.routes[r.id].road[0], 50);
      this.effects.floatText(p.x, p.y, `🚌 ${formatAmount(load)} ${PRODUCTS[r.product].icon} → ${ZONES_BY_ID[r.to].name}`, { size: 14 });
    });
    on('produced', ({ stationId, productId, amount }) => {
      if (stationId !== this.sourceId) return;
      for (let i = 0; i < Math.min(amount, 3); i++) {
        const p = this.farm.randomBushTop();
        this.effects.hop(p.x, p.y, PRODUCTS[productId].color);
      }
    });
    on('levelUp', ({ id, to, milestone }) => {
      let [sid, part] = id.split(':');
      // Una ruta se celebra en la estación de esta zona que abastece (si se está viendo esa zona).
      const route = sid === 'route' ? ROUTES_BY_ID[part] : null;
      if (route) sid = route.stations.find((s) => this.stations[s] && STATIONS_BY_ID[s].zone === zone) ?? null;
      if (!sid || (sid === 'dispatch' ? part !== zone : !STATIONS_BY_ID[sid] || zoneOf(sid) !== zone)) return;
      const view = this.stations[sid];
      if (!view) return;
      const p = view.anchorPoint(30);
      view.bounce?.('bump');
      this.effects.sparkle(p.x, p.y);
      if (milestone) this.sound.milestone();
      else this.sound.levelUp();
      this.effects.ring(p.x, p.y + 30);
      const belt = part === 'transport' && milestone === BELT_LEVEL;
      const what = route ? `🚌 ${route.tab} nivel ${to}` : part === 'transport' ? `${hasBelt(to) ? '⚡ Banda' : '🐴 Arrieros'} nivel ${to}` : `Nivel ${to}`;
      this.effects.floatText(p.x, p.y - 20, belt ? `⚡ ¡Banda eléctrica! ×${milestoneBoost(milestone)}` : milestone ? `¡Hito nivel ${milestone}! ×${milestoneBoost(milestone)}` : what, {
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
    // En el tablero de un evento siempre es media mañana (su reloj es otro).
    this.dayNight.update(state.event ? EVENT_DAYTIME : clockOf(state));
    this.background.update(dt, this.camera);
    this.terrain.update(this.time);
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
    this.syncRoutes(state);
    this.keeper.update(this.time);

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.6;
      this.effects.smoke(this.warehouse.chimney.x, this.warehouse.chimney.y);
      for (const view of Object.values(this.stations)) {
        if (!view.working) continue;
        for (const p of view.smokePoints ?? []) this.effects.smoke(p.x, p.y);
      }
    }
    this.critters.setCows(this.farm.cowCount ?? 0);
    this.critters.setPeople(this.farm.peopleCount ?? 0);
    this.critters.update(dt, this.time, this.dayNight.light > 0.5, this.jeepPos);
    this.pets.setCounts(LOOK.pets?.cats ?? 0, LOOK.pets?.parrots ?? 0);
    this.pets.update(dt, this.time);
    this.eventArt?.update(dt, this.time, state);
    this.updateAmbient(dt);
    this.effects.update(dt);
    this.weather.update(dt, state.event ? null : clockOf(state), this.app.screen.width, this.app.screen.height);
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
    this.zoneSounds(night);
  }

  // Sonidos de cada zona (v1.8): animales, el trapiche y las campanas del Pueblo. Los que dependen de
  // una estación suenan solo si está trabajando.
  zoneSounds(night) {
    const hour = this.dayNight.hour;
    const crossed = (h) => this.lastHour !== undefined && this.lastHour < h && hour >= h;
    const working = (id) => this.stations[id]?.working;
    const theme = this.zone.theme;
    const r = Math.random();
    if (theme === 'town' || this.zone.plaza) {
      // Campanas a las 6, a las 12 y a las 18 (en el Pueblo y, desde la v3.29, en la iglesia de Vélez).
      for (const h of [6, 12, 18]) if (crossed(h)) this.sound.bells(h === 12 ? 4 : 3);
    }
    if (theme !== 'town' && crossed(5.8)) this.sound.rooster(); // el gallo al amanecer
    this.lastHour = hour;
    if (night) return;
    if (r < 0.006) this.sound.bark();
    else if (theme !== 'town' && r < 0.02) this.sound.cluck();
    else if ((theme === 'dairy' || theme === 'ranch' || theme === 'savanna') && r < 0.045) this.sound.moo();
    else if (theme === 'cane' && r < 0.05 && working('cane_mill')) this.sound.grind();
    else if (theme === 'cane' && r < 0.07 && working('furnace')) this.sound.bubble();
    else if (theme === 'cacao' && r < 0.035) this.sound.parrot();
  }

  syncMules(state) {
    const alive = new Set();
    const pos = ROAD_POS[this.zone.id];
    // Estaciones con banda eléctrica: su tramo hasta el destino normal (y el de los desvíos en curso).
    const intervals = [];
    const crates = [];
    for (const id of this.stationIds) {
      const st = state.stations[id];
      if (st && pos[id] !== undefined && hasBelt(st.transport.level)) intervals.push([pos[id], pos[normalDest(state, id)]]);
    }
    for (const m of state.mules) {
      if (zoneOf(m.from) !== this.zone.id) continue;
      if (hasBelt(state.stations[m.from].transport.level)) {
        // Sobre la banda solo se ve lo que va; la «vuelta» no existe.
        if (m.to === 'warehouse') intervals.push([pos[m.from], pos.warehouse]);
        if (m.phase === 'go') {
          const a = pos[m.from];
          crates.push({ s: a + (pos[m.to] - a) * Math.min(m.t / m.duration, 1), productId: m.productId });
        }
        continue;
      }
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
    this.belts.setIntervals(intervals);
    this.belts.update(crates, this.time);
  }

  syncJeep(state) {
    const zone = state.zones[this.zone.id];
    const half = DISPATCH.tripTime / 2;
    const cap = dispatchCapacity(zone.dispatch.level, dispatchMult(state, this.zone.id));
    const idleEmpty = sellableStock(state, this.zone.id) <= 1e-9;
    jeepsOf(state, this.zone.id)
      .slice(0, this.jeeps.length)
      .forEach((j, k) => {
        const road = k ? this.zone.jeepRoad2 : this.zone.jeepRoad;
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
        const load = Object.values(j.load).reduce((a, b) => a + b, 0) / cap;
        const waiting = j.phase === 'idle' ? Math.min(1, j.waited / DISPATCH.maxWait) * 0.3 : 0;
        // El tinto, solo si lleva un rato parqueado sin nada que vender (no entre viaje y viaje).
        if (!(j.phase === 'idle' && idleEmpty)) this.restSince[k] = null;
        else this.restSince[k] ??= this.time;
        const resting = this.restSince[k] !== null && this.time - this.restSince[k] > 2;
        this.jeeps[k].place(p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, j.phase === 'out' ? load : waiting, resting, this.time);
        this.vehicleLight(`jeep${k}`, p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, j.phase !== 'idle');
        if (k) return;
        // El perro persigue al primero en una salida de cada 5 a 15, no en todas.
        if (j.phase !== 'idle' && this.jeepPhase === 'idle') {
          this.trips = (this.trips ?? 0) + 1;
          this.chaseAt ??= 5 + Math.floor(Math.random() * 11);
          this.chasing = this.trips >= this.chaseAt;
          if (this.chasing) {
            this.trips = 0;
            this.chaseAt = 5 + Math.floor(Math.random() * 11);
          }
        }
        if (j.phase === 'idle') this.chasing = false;
        this.jeepPhase = j.phase;
        // Para el perro: dónde va y hacia dónde.
        const len = Math.hypot(p.dx, p.dy) || 1;
        const sign = reverse ? -1 : 1;
        this.jeepPos = { gx: p.gx, gy: p.gy, dx: (sign * p.dx) / len, dy: (sign * p.dy) / len, moving: Boolean(this.chasing) };
      });
  }

  // La Chiva solo se ve en el tramo de carretera de esta zona: al salir de la bodega de origen y al
  // llegar a la estación de destino; el resto del viaje va por fuera del mapa.
  syncRoutes(state) {
    for (const rv of this.routes) {
      const r = rv.def;
      const st = state.routes[r.id];
      const active = routeActive(state, r.id);
      rv.sign.visible = active;
      let pos = null;
      let reverse = false;
      const f = st.phase === 'idle' ? 0 : st.t / (r.tripTime / 2);
      if (active && rv.outgoing) {
        if (st.phase === 'idle') pos = 0;
        else if (st.phase === 'go' && f < 0.4) pos = f / 0.4;
        else if (st.phase === 'back' && f > 0.6) {
          pos = 1 - (f - 0.6) / 0.4;
          reverse = true;
        }
      } else if (active) {
        if (st.phase === 'go' && f > 0.6) pos = (f - 0.6) / 0.4;
        else if (st.phase === 'back' && f < 0.4) {
          pos = 1 - f / 0.4;
          reverse = true;
        }
      }
      rv.view.visible = pos !== null;
      if (pos === null) {
        this.vehicleLight(`chiva:${r.id}`, 0, 0, 0, 0, false);
        continue;
      }
      const eased = pos * pos * (3 - 2 * pos);
      const p = pointAt(rv.road, eased);
      const load = st.phase === 'go' ? st.load / routeCapacity(state, r.id) : 0;
      rv.view.place(p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, load);
      this.vehicleLight(`chiva:${r.id}`, p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, true, 0.75);
    }
  }

  // Faros de un vehículo (v3.12): un halo cálido adelante, el que alumbra la carretera y una luz roja
  // atrás. Van en la capa de las luces, que se ve más cuanto más de noche. on: si va andando.
  vehicleLight(key, gx, gy, dx, dy, on, half = 0.5) {
    let l = this.carLights.get(key);
    if (!l) {
      const make = (tint, r) => {
        const s = new Sprite(this.lightTexture);
        s.anchor.set(0.5);
        s.tint = tint;
        s.blendMode = 'add';
        s.scale.set(r / 32);
        this.lights.addChild(s);
        return s;
      };
      l = { beam: make(0xffe9a8, 30), head: make(0xfff6d8, 14), tail: make(0xff3b30, 7) };
      this.carLights.set(key, l);
    }
    for (const s of Object.values(l)) s.visible = on;
    if (!on) return;
    const n = Math.hypot(dx, dy) || 1;
    const at = (k, z) => iso(gx + (dx / n) * k, gy + (dy / n) * k, z);
    const head = at(half, 7);
    const beam = at(half + 0.9, 0);
    const tail = at(-half, 7);
    l.head.position.set(head.x, head.y);
    l.beam.position.set(beam.x, beam.y);
    l.tail.position.set(tail.x, tail.y);
  }

  // Posición en pantalla (px) de una estación, para centrar la cámara.
  stationWorldPoint(id) {
    return this.stations[id].anchorPoint(0);
  }
}

// Icono sobre la estación: ⛔ patio lleno, ⏸️ esperando entrada, ↪️ desviando a la bodega.
// Solo si el problema dura (ver alerts.js): los momentos sueltos con todo nivelado no se avisan.
export function statusIcon(state, id) {
  const st = state.stations[id];
  if (!st || resting(state)) return null; // de noche todo descansa: nada que avisar
  // En el tablero de un evento, la plaga sobre la estación mientras no esté controlada (v2.0).
  if (state.event && eventPenalty(state, id) < 0.999) return EVENTS_BY_ID[state.event.id].icon;
  const a = alerts(st);
  // La Compostera llena es compost de sobra (bueno): no se avisa.
  if (STATIONS_BY_ID[id].side && a.blocked) return null;
  // Patio lleno porque las siguientes no dan abasto: está desviando, la que hay que subir es la siguiente.
  if (a.blocked) return a.waiting === 'mules' && slowConsumers(state, id).length ? '↪️' : '⛔';
  if (a.starved) return '⏸️';
  if (a.diverting) return '↪️';
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
// Letrero de la zona: dos postes y una tabla ancha con el nombre y, más pequeña, la región.
class ZoneSign extends Container {
  constructor(name, region) {
    super();
    const g = new Graphics();
    const t = new Text({ text: name, style: { fontFamily: FONT, fontSize: 14, fontWeight: '700', fill: 0xfff3d6 }, resolution: 3 });
    const r = new Text({ text: region, style: { fontFamily: FONT, fontSize: 9, fontWeight: '600', fill: 0xf3dcae }, resolution: 3 });
    const w = Math.max(90, t.width + 20, r.width + 20);
    g.ellipse(0, 1, w / 2, 5).fill({ color: 0x000000, alpha: 0.18 });
    for (const x of [-w / 2 + 8, w / 2 - 8]) g.rect(x - 2, -34, 4, 34).fill(PAL.woodDark);
    g.roundRect(-w / 2, -66, w, 34, 6).fill(PAL.wood).stroke(OUTLINE);
    g.roundRect(-w / 2 + 3, -63, w - 6, 28, 4).stroke({ width: 1, color: PAL.woodDark, alpha: 0.6 });
    t.anchor.set(0.5);
    t.position.set(0, -54);
    r.anchor.set(0.5);
    r.position.set(0, -40);
    this.addChild(g, t, r);
  }
}

class WoodSign extends Container {
  constructor(text) {
    super();
    const g = new Graphics();
    const t = new Text({ text, style: { fontFamily: FONT, fontSize: 11, fontWeight: '600', fill: 0xfff3d6 }, resolution: 3 });
    const w = Math.max(68, t.width + 14);
    g.rect(-1.5, -26, 3, 26).fill(PAL.woodDark);
    g.roundRect(-w / 2, -44, w, 18, 4).fill(PAL.wood).stroke(OUTLINE);
    t.anchor.set(0.5);
    t.position.set(0, -35);
    this.addChild(g, t);
  }
}
