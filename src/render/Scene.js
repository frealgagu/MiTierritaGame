import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { PAL, OUTLINE, FONT } from './palette.js';
import { Background } from './Background.js';
import { Camera } from './Camera.js';
import { Terrain, ZONE_SIGN } from './Terrain.js';
import { KEEPER_SPOT, KeeperView } from './Keeper.js';
import { Pets } from './Pets.js';
import { EventArt } from './EventArt.js';
import { orderFootprints, setBlockers } from './occlusion.js';
import { LOOK } from './look.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { Effects } from './Effects.js';
import { FarmView, PlotView, WarehouseView } from './Stations.js';
import { BuildingView } from './Buildings.js';
import { ChivaView, JeepView, MuleView, TractomulaView, TransmilenioView } from './Carriers.js';
import { Belts, GENERAL_SIDE, SEG_LANE, SEG_SIDE } from './Belts.js';
import { productColors } from './pipeColors.js';

const BELT_HOLD = 1.5; // s a belt stays lit after carrying cargo (prevents flicker)
import { Critters } from './Critters.js';
import { iso } from './iso.js';
import { pathLength, pointAt, pointAtDistance } from '../core/path.js';
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
import { routeActive, routeCapacity, tripTimeOf } from '../sim/routes.js';
import { ZONE_LIST, ZONES_BY_ID } from '../data/zones/index.js';
import { DayNight } from './DayNight.js';
import { Weather } from './Weather.js';
import { t } from '../i18n/index.js';


// Label height (px) above each building type.
const LABEL_HEIGHT = { farm: 70, dispatch: 100, plot: 62, building: 96 };

// Builds a zone's isometric world and keeps it synced to simulation state.
// Destroyed (`destroy`) and recreated when switching zones.
const EVENT_DAYTIME = 40; // game s: 10:00 on day one

export class Scene {
  constructor(app, game, sound, zone) {
    this.app = app;
    this.game = game;
    this.sound = sound;
    // On Bogotá event boards (v4.7.1) only event stations exist: other lots aren't
    // drawn (unbuildable there).
    const ev = game.state.event && EVENTS_BY_ID[game.state.event.id];
    if (ev && (zone.network || zone.groups)) zone = { ...zone, plots: zone.plots.filter((p) => ev.stations.includes(p.stationId)) };
    this.zone = zone;
    this.sourceId = zone.farm.stationId;
    this.hideFarm = Boolean(ev && (zone.network || zone.groups) && !ev.stations.includes(this.sourceId));
    this.time = 0;
    this.restSince = [null, null];
    this.jeepPhase = 'idle';
    this.onSelect = () => {};
    // Tapping open ground (v3.67): main.js closes station panel.
    this.onBackground = () => {};
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    // Pixi delivers tap to topmost drawn display object even if decorative (cloud, mule,
    // floating coins): when it reaches stage background here, check signs first then
    // stations (v3.67.6); if neither matches, count as empty terrain tap.
    this.bgTap = (e) => {
      if (e.target !== this.app.stage || this.camera?.dragged) return;
      const id = this.pickAt(e.global);
      if (id) this.selectStation(id);
      else this.onBackground();
    };
    this.app.stage.on('pointertap', this.bgTap);

    this.background = new Background();
    this.world = new Container();
    this.objects = new Container();
    this.objects.sortableChildren = true;
    this.labels = new Container();
    this.effects = new Effects();
    // Ground and objects tint with time of day; lights, labels, and particles sit above untinted.
    this.tinted = new Container();
    this.lights = new Container();
    this.lightTexture = createGlowTexture();
    this.carLights = new Map(); // Willys and chiva headlights (v3.12)
    this.weather = new Weather();
    app.stage.addChild(this.background.stars, this.background.view, this.world, this.weather.view);

    // With second Willys (v3.9), highway has two lanes: each Willys keeps its lane.
    this.jeepCount = jeepCount(game.state);
    this.terrain = new Terrain(this.zone, this.jeepCount);
    // Electric belts: above ground, beneath buildings and mules.
    this.belts = new Belts(this.zone.muleRoad);
    this.tinted.addChild(this.terrain.ground, this.belts, this.objects);
    this.world.addChild(this.tinted, this.lights, this.labels, this.effects.view);
    for (const d of this.terrain.decor) this.objects.addChild(d);
    // Night lights for decoration (v3.29: church gate/windows, streetlamps).
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
    // Moving sprites depth-sort in front or behind buildings by footprint (v4.5.1).
    setBlockers(() => Object.values(this.stations));
    this.farm = new FarmView(this.zone, STATIONS_BY_ID[this.sourceId]);
    this.warehouse = new WarehouseView(this.zone);
    this.addStationView(this.sourceId, this.farm, LABEL_HEIGHT.farm);
    // (If Tostadero isn't part of event, plaza lacks its sign and station.)
    if (this.hideFarm) this.farm.label.visible = this.farm.status.visible = false;
    this.addStationView('dispatch', this.warehouse, LABEL_HEIGHT.dispatch);
    for (const plot of this.zone.plots) this.buildStation(plot.stationId);
    this.stationIds = [...(this.hideFarm ? [] : [this.sourceId]), ...this.zone.plots.map((p) => p.stationId)];

    this.jeeps = Array.from({ length: this.jeepCount }, (_, k) => new JeepView(k));
    for (const jeep of this.jeeps) this.objects.addChild(jeep);
    this.critters = new Critters(this.zone, this.terrain, this.objects);
    this.pets = new Pets(this.zone, this.terrain, this.objects); // region cats and parrots (v3.12)
    // On an event board, hazard props are visible (v3.14).
    this.eventArt = game.state.event ? new EventArt(this, game.state) : null;
    this.mules = new Map();
    this.drawExitSign();
    this.drawPlazaSign();
    this.drawZoneSign();
    // Zone keeper beside sign (v3.12): tapping speaks (main.js: onTalk).
    this.onTalk = () => {};
    this.keeper = new KeeperView(this.zone.id, ZONE_LIST.findIndex((z) => z.id === this.zone.id));
    const [sx, sy] = this.zone.signShift ?? [0, 0]; // Bogotá's large map (v4.5)
    this.keeper.place(KEEPER_SPOT[0] + sx, KEEPER_SPOT[1] + sy);
    this.keeper.on('pointertap', () => {
      if (!this.camera?.dragged) this.onTalk(this.zone.id);
    });
    this.objects.addChild(this.keeper);
    // Routes leaving or entering this zone: side road, signpost, and Chiva.
    this.routes = ROUTES.filter((r) => this.zone.routes?.[r.id]).map((r) => {
      const view = r.vehicle === 'Tractomula' ? new TractomulaView(r.product) : new ChivaView(r.product);
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
    // Bogotá TransMilenio (v4.6), purely decorative: two buses per lane shuttling back and forth (see syncBuses).
    this.buses = (this.zone.transmilenio ?? []).flatMap((road, i) =>
      [0, 0.5].map((phase) => {
        const view = new TransmilenioView();
        this.objects.addChild(view);
        return { road, len: pathLength(road), phase: phase + i * 0.17, view };
      }),
    );

    const n = this.zone.size;
    const left = iso(0, n);
    const right = iso(n, 0);
    const bottom = iso(n, n);
    this.camera = new Camera(this.world, app.canvas, { minX: left.x, maxX: right.x, minY: -200, maxY: bottom.y, minZoom: n > 26 ? 0.25 : undefined });
    this.resize(app.screen.width, app.screen.height);
    // Initial framing: from cafetal to warehouse (in Bogotá, v4.5, `zone.view` neighborhood: full map looks tiny).
    if (this.zone.view) {
      // On event board, event neighborhood: its stations plus tight margin.
      const v = (game.state.event && this.eventView(game.state.event.id)) || this.zone.view;
      this.camera.fit({ minX: iso(v.x0, v.y1).x, maxX: iso(v.x1, v.y0).x, minY: iso(v.x0, v.y0, 60).y, maxY: iso(v.x1, v.y1).y });
    } else {
      const top = iso(this.zone.farm.x, this.zone.farm.y, 60);
      const end = iso(...this.zone.jeepRoad.at(-1));
      const l = iso(this.zone.farm.x, this.zone.farm.y + this.zone.farm.h + 6);
      const r = iso(this.zone.warehouse.x + 4, this.zone.warehouse.y);
      this.camera.fit({ minX: l.x, maxX: r.x, minY: top.y, maxY: end.y });
    }

    this.dayNight = new DayNight(this);
    // Pointer arrow showing what to tap (see HUD.guideTarget).
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

  // Event neighborhood bounds (Bogotá, v4.5): its station tiles plus 2-tile margin and lower
  // street. null if unusable.
  eventView(eventId) {
    const def = EVENTS_BY_ID[eventId];
    const z = this.zone;
    const cells = (def?.stations ?? [])
      .map((id) => (z.farm.stationId === id ? z.farm : z.plots.find((p) => p.stationId === id)))
      .filter(Boolean)
      .map((p) => ({ x: p.x, y: p.y, w: p.w ?? 3, h: p.h ?? 3 }));
    if (!cells.length) return null;
    const x0 = Math.min(...cells.map((c) => c.x)) - 2;
    const y0 = Math.min(...cells.map((c) => c.y)) - 3;
    const x1 = Math.max(...cells.map((c) => c.x + c.w)) + 2;
    const y1 = Math.max(...cells.map((c) => c.y + c.h)) + 3;
    return { x0: Math.max(0, x0), y0: Math.max(0, y0), x1: Math.min(z.size, x1), y1: Math.min(z.size, y1) };
  }

  // Sign under screen point, topmost if overlapping (v3.67.6).
  labelAt(global) {
    const hits = Object.entries(this.stations).filter(([, v]) => {
      const l = v.label;
      if (!v.parent || !l?.parent || !l.visible || !l.hitArea) return false;
      const p = l.toLocal(global);
      return l.hitArea.contains(p.x, p.y);
    });
    return hits.sort((a, b) => this.labels.getChildIndex(b[1].label) - this.labels.getChildIndex(a[1].label))[0]?.[0] ?? null;
  }

  // Tap hit-test: sign first, then station (stationAt).
  pickAt(global) {
    const id = this.labelAt(global) ?? this.stationAt(global);
    return this.hideFarm && id === this.sourceId ? null : id;
  }

  selectStation(id) {
    this.onSelect(id === 'dispatch' ? `dispatch:${this.zone.id}` : id);
  }

  // Station hit-test (v3.67.6). Signs handle their own taps and always win (drawn on top).
  // Otherwise: frontmost station whose artwork (building, trees) was hit; else frontmost
  // whose footprint terrain was hit; else frontmost whose sign column covers tap. (In
  // v3.67 terrain won: tall roof covering back station's lot opened the back one.)
  stationAt(global) {
    const p = this.objects.toLocal(global);
    const front = (list) => list.sort((a, b) => b[1].zIndex - a[1].zIndex)[0]?.[0] ?? null;
    const views = Object.entries(this.stations).filter(([, v]) => v.parent);
    return (
      front(views.filter(([, v]) => v.drawnAt?.(global))) ??
      front(views.filter(([, v]) => v.footArea?.contains(p.x, p.y))) ??
      front(views.filter(([, v]) => v.hitArea?.contains(p.x, p.y)))
    );
  }

  addStationView(id, view, labelHeight) {
    this.stations[id] = view;
    this.objects.addChild(view);
    const select = (sid) => this.selectStation(sid);
    // Whole building clickable up to its label, plus label itself (v3.67). If tap hits two
    // stations, stationAt decides: label first, then artwork (v3.67.6).
    view.on('pointertap', (e) => {
      if (this.camera.dragged) return;
      const sid = this.pickAt(e.global) ?? (this.hideFarm && id === this.sourceId ? null : id);
      if (sid) select(sid);
    });
    view.setHitHeight?.(labelHeight ?? 60);
    const pick = () => !this.camera.dragged && select(id);
    view.label.eventMode = 'static';
    view.label.cursor = 'pointer';
    view.label.on('pointertap', pick);
    const a = view.anchorPoint(labelHeight);
    view.label.position.set(a.x, a.y);
    view.status.position.set(a.x, a.y - 30);
    view.statusY = a.y - 30;
    this.labels.addChild(view.label, view.status);
    this.lights.addChild(view.lightLayer);
  }

  // Lot (if unbuilt) or building for each chain station.
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
    orderFootprints(Object.values(this.stations));
    if (this.pendingSelect === id) {
      view.setSelected(true);
      this.pendingSelect = null;
    }
  }

  // Zone welcome sign (v3.12): large signboard beside road with region underneath.
  drawZoneSign() {
    const region = REGIONS_BY_ID[REGION_OF_ZONE[this.zone.id]];
    const view = new ZoneSign(`${this.zone.icon} ${this.zone.name}`, `${region.icon} ${region.name}`);
    const [sx, sy] = this.zone.signShift ?? [0, 0];
    const [gx, gy] = [ZONE_SIGN[0] + sx, ZONE_SIGN[1] + sy];
    const p = iso(gx, gy);
    view.position.set(p.x, p.y);
    view.zIndex = gx + gy;
    this.objects.addChild(view);
  }

  // A small wooden sign naming a square (v5.10: «⛪ Vélez» by the church of La Guayabera).
  drawPlazaSign() {
    const sign = this.zone.plaza?.sign;
    if (!sign) return;
    const view = new WoodSign(sign.text);
    const [gx, gy] = sign.at;
    const p = iso(gx, gy);
    view.position.set(p.x, p.y);
    view.zIndex = gx + gy;
    this.objects.addChild(view);
  }

  drawExitSign() {
    const view = new WoodSign(this.zone.exitText ?? t('Al pueblo ➜'));
    // With two lanes (v3.9) signboard would sit in second Willys lane: move across road.
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

  // Reacts only to active zone events (background zones produce without visuals).
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
      this.effects.floatText(p.x, p.y, `${r.icon} +${formatAmount(load)} ${PRODUCTS[r.product].icon}`, { size: 16, color: 0xffe066 });
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
    on('levelUp', ({ id, to, milestone, bulk }) => {
      let [sid, part] = id.split(':');
      // Route celebration plays over the station it supplies here (when viewing that zone).
      const route = sid === 'route' ? ROUTES_BY_ID[part] : null;
      if (route) sid = route.stations.find((s) => this.stations[s] && STATIONS_BY_ID[s].zone === zone) ?? null;
      if (!sid || (sid === 'dispatch' ? part !== zone : !STATIONS_BY_ID[sid] || zoneOf(sid) !== zone)) return;
      const view = this.stations[sid];
      if (!view) return;
      const p = view.anchorPoint(30);
      view.bounce?.('bump');
      this.effects.sparkle(p.x, p.y);
      // Whole-zone upgrade (v4.1) fires many together: single sound per batch.
      const quiet = bulk && performance.now() - (this.bulkSoundAt ?? -Infinity) < 250;
      if (bulk && !quiet) this.bulkSoundAt = performance.now();
      if (!quiet) {
        if (milestone) this.sound.milestone();
        else this.sound.levelUp();
      }
      this.effects.ring(p.x, p.y + 30);
      const belt = part === 'transport' && milestone === BELT_LEVEL;
      const what = route ? `🚌 ${route.tab} ${t('nivel {n}', { n: to })}` : part === 'transport' ? `${hasBelt(to) ? t('⚡ Banda') : t('🐴 Arrieros')} ${t('nivel {n}', { n: to })}` : t('Nivel {n}', { n: to });
      this.effects.floatText(p.x, p.y - 20, belt ? `${t('⚡ ¡Banda eléctrica!')} ×${milestoneBoost(milestone)}` : milestone ? `${t('¡Hito nivel {n}!', { n: milestone })} ×${milestoneBoost(milestone)}` : what, {
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
      this.effects.floatText(p.x, p.y - 30, t('¡{station}!', { station: STATIONS_BY_ID[id].name }), { color: 0xffe066, size: 22, life: 2.4 });
    });
  }

  // Removes scene from stage and detaches listeners (on zone switch).
  destroy() {
    this.app.stage.off('pointertap', this.bgTap);
    for (const off of this.unsubs) off();
    this.camera.destroy();
    for (const child of this.app.stage.removeChildren()) child.destroy({ children: true });
  }

  // station id or null.
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
    // Event board stays at mid-morning (independent clock).
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
    this.syncBuses();
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

  // Fireflies and ambient audio based on time of day.
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

  // Zone soundscapes (v1.8): animals, trapiche, Pueblo bells. Station-linked
  // ones only sound while station is running.
  zoneSounds(night) {
    const hour = this.dayNight.hour;
    const crossed = (h) => this.lastHour !== undefined && this.lastHour < h && hour >= h;
    const working = (id) => this.stations[id]?.working;
    const theme = this.zone.theme;
    const r = Math.random();
    if (theme === 'town' || this.zone.plaza) {
      // Bells at 6, 12, and 18 (Pueblo and, since v3.29, Vélez church).
      for (const h of [6, 12, 18]) if (crossed(h)) this.sound.bells(h === 12 ? 4 : 3);
    }
    if (theme !== 'town' && crossed(5.8)) this.sound.rooster(); // rooster at dawn
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
    // Belts (v4.3.1, visual only): segmented ones from belted station to target (next,
    // combiner, or warehouse if last), plus general belt carrying unsold goods to warehouse.
    // Each lights up while carrying cargo (and briefly after to avoid flicker).
    const segs = (this.beltSegs ??= new Map());
    const lastGeneral = (this.beltGeneral ??= new Map());
    const belted = this.stationIds.filter((id) => state.stations[id] && pos[id] !== undefined && hasBelt(state.stations[id].transport.level));
    for (const id of belted) {
      const dest = normalDest(state, id);
      const key = `${id}>${dest}`;
      if (!segs.has(key) && pos[dest] !== undefined) segs.set(key, { from: id, a: pos[id], b: pos[dest], product: Object.keys(STATIONS_BY_ID[id].out)[0], last: -Infinity });
    }
    const crates = [];
    const moving = [];
    for (const m of state.mules) {
      if (zoneOf(m.from) !== this.zone.id) continue;
      if (hasBelt(state.stations[m.from].transport.level)) {
        // Only outbound cargo appears on belt; return trip isn't drawn.
        if (m.phase !== 'go') continue;
        const general = m.to === 'warehouse' && normalDest(state, m.from) !== 'warehouse';
        const key = general ? null : `${m.from}>${m.to}`;
        if (general) lastGeneral.set(m.from, this.time);
        else {
          if (!segs.has(key) && pos[m.to] !== undefined) segs.set(key, { from: m.from, a: pos[m.from], b: pos[m.to], product: m.productId, last: -Infinity });
          const seg = segs.get(key);
          if (seg) seg.last = this.time;
        }
        const a = pos[m.from];
        if (pos[m.to] === undefined) continue;
        moving.push({ key, s: a + (pos[m.to] - a) * Math.min(m.t / m.duration, 1), productId: m.productId });
        continue;
      }
      alive.add(m.id);
      let view = this.mules.get(m.id);
      if (!view) {
        view = new MuleView(m.productId);
        this.mules.set(m.id, view);
        this.objects.addChild(view);
      }
      // Outbound: station to target loaded. Return: empty, opposite direction.
      const a = pos[m.from];
      const b = pos[m.to];
      const f = Math.min(m.t / m.duration, 1);
      const going = m.phase === 'go';
      const p = pointAtDistance(this.zone.muleRoad, going ? a + (b - a) * f : b + (a - b) * f);
      const dir = going === b > a ? 1 : -1;
      view.setLoaded(going);
      view.place(p.gx, p.gy, p.dx * dir, p.dy * dir, this.time);
    }
    // Lanes: crossing segmented belts step farther outward from road.
    const colors = productColors(this.zone.id);
    // Keep belted stations' lines: normal target and recently active ones (building an
    // intermediate station retires old segment).
    const normal = new Set(belted.map((id) => `${id}>${normalDest(state, id)}`));
    const live = [...segs.entries()].filter(([key, x]) => belted.includes(x.from) && (normal.has(key) || this.time - x.last < 30)).sort((x, y) => Math.min(x[1].a, x[1].b) - Math.min(y[1].a, y[1].b));
    const laneEnd = [];
    const sideOf = {};
    const belts = [];
    for (const [key, x] of live) {
      const lo = Math.min(x.a, x.b);
      let lane = laneEnd.findIndex((e) => e <= lo + 0.05);
      if (lane < 0) lane = laneEnd.length;
      laneEnd[lane] = Math.max(x.a, x.b);
      sideOf[key] = SEG_SIDE + lane * SEG_LANE;
      belts.push({ a: x.a, b: x.b, side: sideOf[key], color: parseInt((colors[x.product] ?? '#6f777e').slice(1), 16), on: this.time - x.last < BELT_HOLD });
    }
    // General belt: from each belted non-final station to warehouse.
    // Single shared belt starting at earliest station, lit from earliest active sender.
    const feeders = belted.filter((id) => normalDest(state, id) !== 'warehouse');
    if (feeders.length) {
      belts.push({ a: Math.min(...feeders.map((id) => pos[id])), b: pos.warehouse, side: GENERAL_SIDE, color: null, on: false });
      const sending = feeders.filter((id) => this.time - (lastGeneral.get(id) ?? -Infinity) < BELT_HOLD);
      if (sending.length) belts.push({ a: Math.min(...sending.map((id) => pos[id])), b: pos.warehouse, side: GENERAL_SIDE, color: null, on: true });
    }
    for (const c of moving) crates.push({ s: c.s, side: c.key ? sideOf[c.key] ?? SEG_SIDE : GENERAL_SIDE, productId: c.productId });
    for (const [id, view] of this.mules) {
      if (alive.has(id)) continue;
      view.destroy({ children: true });
      this.mules.delete(id);
    }
    this.belts.setBelts(belts);
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
        // Tinto mug only after parked idle a moment without selling (not between rapid trips).
        if (!(j.phase === 'idle' && idleEmpty)) this.restSince[k] = null;
        else this.restSince[k] ??= this.time;
        const resting = this.restSince[k] !== null && this.time - this.restSince[k] > 2;
        this.jeeps[k].place(p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, j.phase === 'out' ? load : waiting, resting, this.time);
        this.vehicleLight(`jeep${k}`, p.gx, p.gy, reverse ? -p.dx : p.dx, reverse ? -p.dy : p.dy, j.phase !== 'idle');
        if (k) return;
        // Dog chases first Willys roughly once every 5 to 15 departures.
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
        // For dog chase: current location and destination.
        const len = Math.hypot(p.dx, p.dy) || 1;
        const sign = reverse ? -1 : 1;
        this.jeepPos = { gx: p.gx, gy: p.gy, dx: (sign * p.dx) / len, dy: (sign * p.dy) / len, moving: Boolean(this.chasing) };
      });
  }

  // Chiva only shows along this zone's highway spur: leaving origin warehouse and
  // arriving at target station; rest of trip happens off-map.
  syncRoutes(state) {
    for (const rv of this.routes) {
      const r = rv.def;
      const st = state.routes[r.id];
      const active = routeActive(state, r.id);
      rv.sign.visible = active;
      let pos = null;
      let reverse = false;
      const f = st.phase === 'idle' ? 0 : st.t / (tripTimeOf(state, r) / 2);
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

  // TransMilenio (v4.6): each bus runs steadily end to end on its lane, brakes, waits
  // briefly, and reverses. Unrelated to production.
  syncBuses() {
    const SPEED = 2.4; // tiles per second
    const WAIT = 3; // seconds paused at each end
    this.buses.forEach((b, k) => {
      const leg = b.len / SPEED + WAIT;
      const f = (this.time / (2 * leg) + b.phase) % 1;
      const back = f >= 0.5;
      const t = Math.min(1, (((back ? f - 0.5 : f) * 2 * leg) / (leg - WAIT)));
      const eased = t * t * (3 - 2 * t);
      const p = pointAt(b.road, back ? 1 - eased : eased);
      const [dx, dy] = back ? [-p.dx, -p.dy] : [p.dx, p.dy];
      b.view.place(p.gx, p.gy, dx, dy);
      this.vehicleLight(`tm:${k}`, p.gx, p.gy, dx, dy, t < 1, 1.3);
    });
  }

  // Vehicle headlights (v3.12): warm forward cone lighting road plus rear red taillight.
  // Live in lighting layer, fading in deeper at night. on: moving.
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

  // Screen coordinates (px) of a station, for camera centering.
  stationWorldPoint(id) {
    return this.stations[id].anchorPoint(0);
  }
}

// Status icon over station: ⛔ yard full, ⏸️ waiting input, ↪ diverting to warehouse.
// Only for persistent faults (see alerts.js): brief balanced waits aren't flagged.
export function statusIcon(state, id) {
  const st = state.stations[id];
  // Stopped by the player (v5.14): shown day and night, it is a choice and not a fault.
  if (st?.stopped && !state.event) return '⏹️';
  if (!st || resting(state)) return null; // at night all stations rest: nothing to warn
  // On event board, pest icon over afflicted station until controlled (v2.0).
  if (state.event && eventPenalty(state, id) < 0.999) return EVENTS_BY_ID[state.event.id].icon;
  const a = alerts(st);
  // Full Compostera means spare compost (healthy): never flagged as warning.
  if (STATIONS_BY_ID[id].side && a.blocked) return null;
  // Full yard caused by lagging downstream: diverting, so downstream needs upgrading.
  if (a.blocked) return a.waiting === 'mules' && slowConsumers(state, id).length ? '↪' : '⛔';
  if (a.starved) return '⏸️';
  if (a.diverting) return '↪';
  return null;
}

// Soft radial glow sprite for lights, lamps, and fireflies.
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

// Simple wooden signpost.
// Zone signboard: twin posts and wide plank with zone name and smaller region below.
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
