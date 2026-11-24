import { Application } from 'pixi.js';
import { Game } from './core/Game.js';
import { World } from './core/World.js';
import { createGameState } from './sim/state.js';
import { clearSave, exportSave, importSave, loadGame, saveGame, saveTooNew, storedSaveTooNew } from './core/SaveSystem.js';
import { formatDuration, formatNumber } from './core/format.js';
import { clockOf } from './sim/calendar.js';
import { Scene } from './render/Scene.js';
import { HUD } from './ui/HUD.js';
import { StationPanel } from './ui/StationPanel.js';
import { ChainView } from './ui/ChainView.js';
import { GoalsView } from './ui/GoalsView.js';
import { ResearchView } from './ui/ResearchView.js';
import { showVictory, showWelcome } from './ui/dialogs.js';
import { showMastery } from './ui/mastery.js';
import { introOnStart, showIntro } from './ui/intro.js';
import { showCalendar } from './ui/calendar.js';
import { Chatter } from './ui/Chatter.js';
import { EventsView } from './ui/EventsView.js';
import { RenownView } from './ui/RenownView.js';
import { StatsView } from './ui/StatsView.js';
import { gameTotals } from './sim/totals.js';
import { setLook } from './render/look.js';
import { checkLogros } from './sim/logros.js';
import { hideSplash, setSplashProgress, splashOffline, splashWait } from './ui/splash.js';
import { EventBar, formatClock } from './ui/EventBar.js';
import { MoneyView } from './ui/MoneyView.js';
import { EVENT_COOLDOWN, allActionsBought, awaySeconds, checkMedalBonus, endEvent, finishEvent, restartEvent, startEvent, startOnDemand } from './sim/events.js';
import { MEDALS } from './data/events.js';
import { endSeason, finishSeason, restartSeason, startSeason, sweepSeason } from './sim/seasonEvents.js';
import { REGIONS, REGIONS_BY_ID, REGION_OF_ZONE } from './data/regions.js';
import { openRegions, regionState } from './sim/regions.js';
import { bindNative, isNativeApp } from './native.js';
import { backupName, pickBackupFile, saveBackupFile } from './backup.js';
import { APP_VERSION, checkForUpdate } from './update.js';
import { SONGS } from './audio/songs.js';
import { bindTip, tipMode } from './tip.js';
import { checkMastery, restartRegion, startZone } from './sim/legacy.js';
import { ZonesView } from './ui/ZonesView.js';
import { ZONES_BY_ID } from './data/zones/index.js';
import { ROUTES_BY_ID } from './data/routes.js';
import { STATIONS_BY_ID } from './data/stations.js';
import { ICON, ICON_FONT } from './data/icons.js';
import { RESEARCH_BY_ID } from './data/research.js';
import { offlineCapSeconds } from './sim/modifiers.js';
import { OFFLINE_COSTS, offlineLevel } from './sim/renown.js';
import { toast } from './ui/toast.js';
import { bindDevOptions, savedSpeed } from './ui/DevOptions.js';
import { bindIconTips } from './ui/iconTips.js';
import { bindMore } from './ui/more.js';
import { LANG, LANGS, saveLang, t } from './i18n/index.js';
import { Sound } from './audio/Sound.js';
import { Music } from './audio/Music.js';
import { playGrandFinale } from './ui/GrandFinale.js';
import { checkFinaleLogro, finaleButtonShown, finaleDue } from './sim/finale.js';
import { FinaleInfo } from './ui/finaleInfo.js';
import { cappedCoins, cappedPlayTime, cappedTotal } from './ui/capped.js';

const AUTOSAVE_MS = 10_000;
const MIN_OFFLINE_S = 30;
const DEFAULT_MUSIC_VOLUME = 40; // % (v3.66: at 100% it drowned out sound effects)
let resetting = false;

async function start() {
  splashWait(t('Preparando la finca…'));
  try {
    // Custom icon font too: Pixi map labels draw with it.
    await Promise.all([document.fonts.load('600 16px Fredoka'), document.fonts.load(`16px "${ICON_FONT}"`, Object.values(ICON).join(''))]);
  } catch {
    // no web font: fall back to system font
  }

  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  document.getElementById('app').appendChild(app.canvas);

  const saved = loadGame();
  // (v5.13) The whole game's save (profile, settings, event slots, country clock) holds every region, Eje Cafetero
  // included; `game` keeps its clock and slots running (core/World.js) and each region has its own Game.
  const game = new World(saved ?? createGameState());
  const root = game.state;
  // A save that already completed Pueblo before v3.0, or (v5.5) one whose reset just completed the special
  // zone's condition: it opens on load, with a notice once the game is on screen.
  for (const id of openRegions(root)) {
    if (REGIONS_BY_ID[id].special) setTimeout(() => toast(t('⭐ ¡Se abrió la zona especial: {region}!', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}` }), 6000), 2500);
  }
  const games = {};
  for (const id of Object.keys(root.regions)) games[id] = new Game(root.regions[id]);
  const gameOf = (zoneId) => games[REGION_OF_ZONE[zoneId]];
  // Selected decor, applied before rendering anything.
  setLook(root.profile);
  // Dev speed multiplier persists on resume, including for away time calculations.
  game.timeScale = savedSpeed();
  const away = saved ? (Date.now() - saved.savedAt) / 1000 : 0;
  // Time away: the country clock, then every region (Eje Cafetero's summary in the welcome window, the others
  // notified separately).
  // (The same 30 s floor as the regions, so a quick reload leaves every clock on the same date.)
  if (saved && away >= MIN_OFFLINE_S) game.catchUp(away, offlineCapSeconds(root.profile));
  const offline = saved ? await applyOffline(games.cafetero, away, null, root.profile) : null;
  const regionOffline = [];
  for (const [id, g] of Object.entries(games)) {
    if (id === 'cafetero' || !saved) continue;
    const r = await applyOffline(g, away, REGIONS_BY_ID[id], root.profile);
    if (r) regionOffline.push([id, r]);
  }

  // Volume from 0 to 100 (v3.66). Legacy saves only stored on/off: music, if enabled, defaults
  // to 40% (it was too loud compared to SFX) and SFX to 100%.
  const settings = game.state.settings;
  settings.soundVolume ??= settings.sound === false ? 0 : 100;
  settings.musicVolume ??= settings.music === false ? 0 : DEFAULT_MUSIC_VOLUME;
  const sound = new Sound();
  sound.setVolume(settings.soundVolume / 100);
  const music = new Music(settings.musicVolume > 0);
  music.setVolume(settings.musicVolume / 100);
  // Soft click on every UI button.
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')) sound.click();
  });

  // Currently viewed zone (others keep producing). Persisted with the save.
  const view = { zone: startZone(root, root.settings.zone) };
  // Game instance of the currently viewed region (Eje Cafetero or another region).
  let active = gameOf(view.zone);
  // Active event board (v2.0): { zone, game } with its own Game instance, or null.
  let board = null;
  const getZone = () => board?.zone ?? view.zone;
  let scene = null;
  const panel = new StationPanel(active, () => scene?.select(null));
  // Target shown by UI: the active region or an open event board.
  let hud, chain, chatter, goals, research, zones, money;
  const useGame = (g) => {
    for (const v of [hud, panel, chain, chatter, goals, research, money]) if (v) v.game = g;
    if (hud) hud.recDirty = true;
  };
  // id can be 'farm', 'farm:transport' (carriers tab), 'dispatch:<zone>', 'route:<route>'
  // (route tab of the supplied station, or a standalone panel if viewing another zone), or research:<id>.
  // Targets requesting a tab ('farm:transport', 'route:...': recommended upgrade, chain, goal, or
  // research) open that tab; tapping the station on the map opens the station tab.
  const select = (id) => {
    const [stationId, part] = id.split(':');
    if (stationId === 'research' && board) return; // event boards have no research upgrades
    // An event purchase (v3.8.2): highlight its button on the event bar.
    if (stationId === 'action') {
      if (board) eventBar.highlight(part);
      return;
    }
    if (stationId === 'research') {
      research.open();
      return;
    }
    // 'dispatch:<zone>:stock' (v3.66): warehouse stock tab showing inventory per product.
    if (stationId === 'dispatch') {
      const [, zone, tab] = id.split(':');
      scene.select('dispatch');
      panel.open(zone ? `dispatch:${zone}` : id, tab === 'stock' ? 'stock' : 'station');
      sound.station('dispatch');
      return;
    }
    if (stationId === 'route') {
      // Receiving station on the active map: on an event, the board station (previously looked up main save
      // and, if unbuilt there, opened a standalone Lv.1 route panel).
      const here = (board ? board.game : active).state;
      const station = ROUTES_BY_ID[part].stations.find((sid) => scene.stations[sid] && here.stations[sid]);
      if (station) {
        scene.select(station);
        panel.open(station, id);
        sound.station(station);
      } else {
        scene.select(null);
        panel.open(id);
      }
      return;
    }
    // Station in another zone (recommendation can point to a route supplier): travel there.
    // Compare against currently viewed zone: on an event, use the board zone (previously checked
    // main map zone and exited the event board if the event belonged to another zone).
    if (STATIONS_BY_ID[stationId] && STATIONS_BY_ID[stationId].zone !== getZone()) {
      if (board) return; // only event-relevant stations appear on the board
      showZone(STATIONS_BY_ID[stationId].zone);
      toast(`${ZONES_BY_ID[view.zone].icon} ${ZONES_BY_ID[view.zone].name}`, 2000);
    }
    scene.select(stationId);
    // Always open on the station tab (v3.67); if carriers need upgrading, pulse that tab
    // instead of switching straight into it.
    panel.open(stationId, part === 'transport' ? 'transport' : 'station');
    // Entering a station plays its craft sound (v3.3.2).
    sound.station(stationId);
  };
  const showZone = (zoneId) => {
    // Close panel first: closing clears the scene selection, which must still exist.
    if (panel.id) panel.close();
    // Traveling to a main-game zone leaves the event board (saved as-is).
    if (board) leaveBoard();
    if (scene) scene.destroy();
    view.zone = zoneId;
    root.settings.zone = zoneId;
    active = gameOf(zoneId);
    useGame(active);
    music.setRegion(REGIONS_BY_ID[active.state.region].music);
    // Each region has its own decor (v3.10).
    setLook(root.profile, REGION_OF_ZONE[zoneId]);
    scene = new Scene(app, active, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
    if (import.meta.env.DEV) window.__mitierrita = { game: active, root: game, games, scene, panel, select, music };
  };
  showZone(view.zone);
  hud = new HUD(active, select, () => scene.dayNight.hour, getZone);
  chain = new ChainView(active, select, getZone, () => game.state);
  // While dragging the chain (v4.7.2), throttle background map (mostly covered) and simulation to 10 fps
  // so scrolling stays smooth on phones.
  chain.onMoving = (on) => (app.ticker.maxFPS = on ? 10 : 0);
  money = new MoneyView(active, getZone);
  chatter = new Chatter(active, getZone, () => game.state);
  goals = new GoalsView(active, getZone);
  research = new ResearchView(active, getZone, (id) => select(id), root.settings);
  zones = new ZonesView(game, games, getZone, (z) => {
    showZone(z);
    toast(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, 2000);
  });

  // Events: enter and leave a board. Main game keeps running; board clock ticks only while
  // inside it. Meanwhile HUD, panel, and chain bind to the board.
  // Pause returns to the map; restart and finish ask confirmation unless already won (v3.30).
  const confirmEvent = (icon, title, text, yes, onYes) => {
    const modal = document.getElementById('event-confirm');
    document.getElementById('event-confirm-icon').textContent = icon;
    document.getElementById('event-confirm-title').textContent = title;
    document.getElementById('event-confirm-text').textContent = text;
    const ok = document.getElementById('event-confirm-yes');
    ok.textContent = yes;
    ok.onclick = () => {
      modal.hidden = true;
      onYes();
    };
    document.getElementById('event-confirm-no').onclick = () => (modal.hidden = true);
    modal.hidden = false;
  };
  const restartBoard = () => {
    if (!board || board.game.state.event.done) return;
    // (v5.19) A season event: the same edition from scratch.
    if (board.season) {
      const key = board.key;
      return confirmEvent('🔄', t('¿Reiniciar el evento?'), t('Vuelve a empezar este mismo evento desde cero: monedas, niveles y reloj.'), t('🔄 Reiniciar'), () => {
        restartSeason(game.state, board.season);
        leaveBoard();
        enterEvent(key);
        toast(t('🔄 El evento empezó de nuevo.'), 2500);
      });
    }
    confirmEvent('🔄', t('¿Reiniciar el evento?'), t('Vuelve a empezar este mismo reto desde cero: monedas, niveles, compras y reloj. Si ya tenías la medalla asegurada, también se borra.'), t('🔄 Reiniciar'), () => {
      const zone = board.key;
      restartEvent(game.state, zone);
      leaveBoard();
      enterEvent(zone);
      toast(t('🔄 El evento empezó de nuevo.'), 2500);
    });
  };
  const endBoard = () => {
    if (!board) return;
    // (v5.19) A season event: once won it just closes; before, what it made is lost, but it can start again while
    // its days last.
    if (board.season) {
      const fiesta = board.season;
      const close = () => {
        endSeason(game.state, fiesta);
        exitEvent();
      };
      if (board.game.state.event.done) return close();
      return confirmEvent('🏁', t('¿Terminar el evento?'), t('Se pierde lo que llevas. Mientras duren sus días puedes empezarlo otra vez desde cero.'), t('🏁 Terminar sin ganar'), () => {
        close();
        toast(t('🏁 Evento terminado.'), 3000);
      });
    }
    const zone = board.key;
    const close = () => {
      endEvent(game.state, zone);
      exitEvent();
    };
    if (board.game.state.event.done) return close();
    confirmEvent('🏁', t('¿Terminar el evento?'), t('Se cierra sin medalla ni Renombre. Su cupo queda libre en 2 años del juego (unas {time}) y la próxima vez sale el mismo reto.', { time: formatDuration(EVENT_COOLDOWN) }), t('🏁 Terminar sin ganar'), () => {
      close();
      toast(t('🏁 Evento terminado sin medalla.'), 3000);
    });
  };
  // Pause or Leave (v3.67.4): chosen by the player in Settings for all events.
  const exitMode = () => (game.state.settings.eventExit === 'leave' ? 'leave' : 'pause');
  const eventBar = new EventBar(() => exitEvent(), restartBoard, endBoard, exitMode);
  const exitSelect = document.getElementById('event-exit-mode');
  const exitHint = () => {
    document.getElementById('event-exit-hint').textContent =
      exitMode() === 'leave' ? t('El evento sigue corriendo por detrás, también con el juego cerrado.') : t('El reloj del evento se detiene hasta que vuelvas.');
  };
  exitSelect.value = exitMode();
  exitHint();
  exitSelect.addEventListener('change', () => {
    game.state.settings.eventExit = exitSelect.value;
    eventBar.paintExit();
    exitHint();
  });
  // Zone travel (v4.1.3): animated trip on the map (default) or instant direct switch.
  const travelSelect = document.getElementById('travel-mode');
  const travelHint = () => {
    document.getElementById('travel-hint').textContent =
      travelSelect.value === 'direct' ? t('Se pasa a la otra zona enseguida, sin el viaje en el mapa.') : t('El Willys y la avioneta muestran el viaje en el mapa.');
  };
  travelSelect.value = game.state.settings.travel === 'direct' ? 'direct' : 'trip';
  travelHint();
  travelSelect.addEventListener('change', () => {
    game.state.settings.travel = travelSelect.value;
    travelHint();
  });
  // A zone event is stored in its own region save (v3.6: Santander also has events);
  // global slots live on the main save (v3.30).
  const enterEvent = (zoneId) => {
    // (v5.19) A season event's key is «fiesta:<fiesta>» (sim/seasonEvents.js).
    const season = zoneId.startsWith('fiesta:') ? zoneId.slice(7) : null;
    // (v4.7.3) Or, on a region with gold on all events and on-demand unlocked, Play again.
    const state = season ? startSeason(game.state, season) : startEvent(game.state, zoneId) ?? startOnDemand(game.state, zoneId);
    if (!state) return;
    // zoneId acts as the event key (v4.5: Bogota has multiple events in the same zone); map uses its zone.
    const key = zoneId;
    zoneId = state.event.zone;
    if (panel.id) panel.close();
    scene.destroy();
    const eg = new Game(state);
    eg.timeScale = game.timeScale;
    for (const type of ['levelUp', 'unlocked', 'research']) eg.bus.on(type, () => (hud.recDirty = true));
    board = { zone: zoneId, key, game: eg, season };
    // La plaza de las fiestas belongs to no region: it wears Eje Cafetero's decor, and (v5.20) plays its fiesta's
    // villancico (audio/songs.js); going back to the map plays the region's music again (showZone).
    setLook(root.profile, season ? 'cafetero' : REGION_OF_ZONE[zoneId]);
    if (season) music.setRegion(season);
    scene = new Scene(app, eg, sound, ZONES_BY_ID[zoneId]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
    useGame(eg);
    document.body.classList.add('event-mode');
    catchUpBoard(eg);
    eventBar.show(eg);
    if (import.meta.env.DEV) window.__mitierrita = { ...window.__mitierrita, scene, board };
  };
  if (import.meta.env.DEV) window.__mitierritaEvent = enterEvent;
  // If left with Leave mode, catch up background progress (v3.67.4) using the country clock: also
  // counts time while the app was closed (up to the offline hours cap).
  const catchUpBoard = (eg) => {
    const state = eg.state;
    const away = awaySeconds(state, game.state);
    delete state.event.away;
    if (away < 1) return;
    const r = eg.catchUpBoard(away);
    // With all three event upgrades bought, victory triggers on the next frame and shows its modal.
    if (r.secured && !allActionsBought(state)) {
      const m = MEDALS[state.event.medal];
      toast(t('🔽 El evento siguió {time} sin ti: ¡{icon} medalla de {medal} asegurada! Para terminarlo, compra las mejoras que faltan.', { time: formatDuration(r.seconds), icon: m.icon, medal: m.name }), 6000);
      sound.milestone();
    } else toast(t('🔽 El evento siguió {time} sin ti.', { time: formatDuration(r.seconds) }), 4000);
  };
  const leaveBoard = () => {
    // Leave mode (via button or switching zones): board keeps running from now using the country
    // clock; Pause mode freezes it (v3.67.4).
    // (v5.19) A season event never pauses: it is long and keeps going while you play elsewhere.
    if (exitMode() === 'leave' || board.season) board.game.state.event.away = clockOf(game.state);
    board = null;
    useGame(active);
    document.body.classList.remove('event-mode');
    eventBar.show(null);
  };
  const exitEvent = () => {
    if (!board) return;
    if (panel.id) panel.close();
    leaveBoard();
    showZone(view.zone);
  };
  const events = new EventsView(game, enterEvent);
  // Changing decor redraws the map (main zone or event board).
  const stats = new StatsView(game);
  const renown = new RenownView(game, (profile) => {
    if (!board) return showZone(view.zone);
    setLook(profile, REGION_OF_ZONE[board.zone]);
    if (panel.id) panel.close();
    scene.destroy();
    scene = new Scene(app, board.game, sound, ZONES_BY_ID[board.zone]);
    scene.onSelect = select;
    scene.onBackground = () => panel.id && panel.close();
    scene.onTalk = (z) => chatter?.talk(z);
  });
  for (const [id, tab] of [['album-btn', 'album'], ['decor-btn', 'decor'], ['logros-btn', 'logros'], ['offline-btn', 'offline']]) {
    document.getElementById(id).addEventListener('click', () => {
      events.close();
      // Opens on the currently played region (v3.10: each has its own album, decor, achievements, and workday).
      renown.open(tab, REGION_OF_ZONE[board ? board.zone : view.zone]);
    });
  }
  // Return to Events window from Renown (v3.67) without closing and reopening.
  document.getElementById('renown-back').addEventListener('click', () => {
    document.getElementById('renown').hidden = true;
    events.open();
  });
  const showEventResult = (r) => {
    const m = MEDALS[r.medal];
    document.getElementById('event-result-medal').textContent = m.icon;
    document.getElementById('event-result-title').textContent = t('¡Medalla de {medal}!', { medal: m.name });
    document.getElementById('event-result-text').textContent =
      t('{event}: cumpliste el objetivo en {time} y compraste las tres mejoras.\n+{renown} ⭐ de Renombre (tienes {total}).\nEste cupo de eventos queda libre en 2 años del juego (unas {cooldown}).', { event: `${r.def.icon} ${r.def.name}`, time: formatClock(r.time), renown: m.renown, total: game.state.profile.renown, cooldown: formatDuration(EVENT_COOLDOWN) });
    const modal = document.getElementById('event-result');
    // End event or keep inspecting the board (v3.30): can pause, closes on End event.
    document.getElementById('event-result-ok').onclick = () => {
      modal.hidden = true;
      endBoard();
    };
    document.getElementById('event-result-watch').onclick = () => (modal.hidden = true);
    modal.hidden = false;
    sound.milestone();
  };

  // (v5.19) A season event won: the sticker of its fiesta (the first time) or just the fiesta, with no prize.
  const showSeasonResult = (r) => {
    const fiesta = `${r.fiesta.icon} ${t(r.fiesta.name)}`;
    document.getElementById('event-result-medal').textContent = r.fiesta.icon;
    document.getElementById('event-result-title').textContent = r.sticker ? t('¡Lámina ganada!') : t('¡Evento cumplido!');
    const lines = [t('{event}: cumpliste el objetivo en {time}.', { event: `${r.def.icon} ${r.def.name}`, time: formatClock(r.time) })];
    lines.push(r.sticker ? t('La lámina {fiesta} ya está en el álbum 🎉 Fiestas de Colombia.', { fiesta }) : t('Ya tenías la lámina {fiesta}: este año se jugó por el gusto.', { fiesta }));
    if (r.bonus) lines.push(t('📖 ¡Página llena! +{n} ⭐ de Renombre', { n: r.bonus }));
    document.getElementById('event-result-text').textContent = lines.join('\n');
    const modal = document.getElementById('event-result');
    document.getElementById('event-result-ok').onclick = () => {
      modal.hidden = true;
      endBoard();
    };
    document.getElementById('event-result-watch').onclick = () => (modal.hidden = true);
    modal.hidden = false;
    sound.milestone();
  };

  // Second ending: all stations in the region at level 100. Player can restart the
  // region with x2 production (other regions stay untouched).
  const restart = (g) => {
    resetting = true;
    // (v5.13) Every region, Eje Cafetero included, restarts the same way: only its own save is replaced.
    const region = g.state.region;
    restartRegion(root, region);
    // Open in the restarted region (v3.72), on its first zone.
    root.settings.zone = REGIONS_BY_ID[region].zones[0];
    saveGame(root);
    location.reload();
  };
  // Grand finale (v5.9): over the whole game, with the game's music quiet while it plays.
  let finaleOn = false;
  const grandFinale = () => {
    if (finaleOn) return;
    finaleOn = true;
    for (const id of ['menu', 'renown']) document.getElementById(id).hidden = true;
    // The finale covers the screen: the map is not drawn meanwhile (the game keeps running).
    app.stage.visible = false;
    playGrandFinale({
      t,
      volume: settings.musicVolume / 100,
      beforeMusic: () => music.setEnabled(false),
      afterMusic: () => music.setEnabled(settings.musicVolume > 0),
      onClose: () => {
        finaleOn = false;
        app.stage.visible = true;
      },
      renderer: app.renderer,
    });
  };
  renown.onFinale = grandFinale;
  // Its side button (v5.15) opens its own window (v5.16): what is left, and the button that plays it.
  const finaleInfo = new FinaleInfo(() => root.profile, grandFinale);
  document.getElementById('finale-btn').addEventListener('click', () => finaleInfo.open());
  const mastery = (g = active) => showMastery(g.state, () => restart(g), { profile: root.profile, onFinale: grandFinale });
  // Regions whose condition was just met start producing right away, each with its own Game.
  const openNew = () => {
    const opened = openRegions(root);
    for (const id of opened) {
      games[id] = new Game(root.regions[id]);
      games[id].timeScale = game.timeScale;
      wire(games[id]);
    }
    return opened;
  };
  // Per-region notifications: goals, endings, and research.
  const wire = (g) => {
    g.bus.on('goalClaimed', ({ goal, zone, bulk }) => {
      if (bulk) return; // Claim all: single summary toast at the end (goalsClaimed)
      if (!goal.final) {
        sound.coin();
        toast(t('🎯 ¡Objetivo cumplido! +{coins} 💰', { coins: formatNumber(goal.reward) }), 3000);
        return;
      }
      sound.milestone();
      // Pueblo unlocks Santander (v3.0): its region starts producing right away.
      const opened = openNew();
      // Next region, if already unlocked (e.g. completing the final zone again after restarting).
      const after = !ZONES_BY_ID[zone].next && REGIONS.find((r) => r.unlock?.zone === zone && regionState(root, r.id));
      // Move to next zone (v3.67): animated trip on the map.
      showVictory(g.state, zone, (next) => zones.travel(next), opened, after?.id);
    });
    g.bus.on('mastered', () => {
      // (v5.4) The second ending may be the last one the special zone was waiting for.
      for (const id of openNew()) toast(t('⭐ ¡Se abrió la zona especial: {region}!', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}` }), 5000);
      // If triggered when claiming the first ending (everything already at 100), show zone ending first
      // and then the second ending modal once closed.
      const victory = document.getElementById('victory');
      const show = () => {
        sound.milestone();
        mastery(g);
      };
      if (victory.hidden) return show();
      const watch = new MutationObserver(() => {
        if (!victory.hidden) return;
        watch.disconnect();
        show();
      });
      watch.observe(victory, { attributes: true, attributeFilter: ['hidden'] });
    });
    g.bus.on('goalsClaimed', ({ count, reward }) => {
      sound.coin();
      toast(count === 1 ? t('🎯 ¡{n} objetivo cobrado! +{coins} 💰', { n: count, coins: formatNumber(reward) }) : t('🎯 ¡{n} objetivos cobrados! +{coins} 💰', { n: count, coins: formatNumber(reward) }), 3000);
    });
    g.bus.on('researchAll', ({ ids }) => {
      sound.milestone();
      toast(ids.length === 1 ? `🔬 ${RESEARCH_BY_ID[ids[0]].name}: ${RESEARCH_BY_ID[ids[0]].desc}` : t('🔬 ¡{n} investigaciones compradas! {names}', { n: ids.length, names: ids.map((id) => RESEARCH_BY_ID[id].name).join(', ') }), 4000);
    });
    g.bus.on('research', ({ id, bulk }) => {
      if (bulk) return; // Buy all: single summary toast at the end (researchAll)
      sound.milestone();
      toast(`🔬 ${RESEARCH_BY_ID[id].name}: ${RESEARCH_BY_ID[id].desc}`, 4000);
    });
    checkMastery(g.state, g.bus); // save that already had everything at 100 before v1.6
  };
  for (const g of Object.values(games)) wire(g);
  goals.onMastery = () => mastery(active);
  // (v4.7.1) Restarting moved out of Settings: now triggered from Goals (the second ending card).
  window.addEventListener('resize', () => scene.resize(app.screen.width, app.screen.height));
  // Esc (or Android back button) closes the open modal or, if none, the station panel.
  // Returns whether something was closed.
  const closeTop = () => {
    const open = [...document.querySelectorAll('.modal')].filter((m) => !m.hidden);
    if (open.length) open.forEach((m) => (m.hidden = true));
    else if (panel.id) panel.close();
    else return false;
    return true;
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTop();
  });
  // Tapping outside a modal closes it (v3.67), just like X. Excludes modals requiring an action (claim
  // offline earnings, victory, second ending, event result/confirmation, or update
  // prompt). Station panel also closes only via X or empty map tap.
  const STICKY = new Set(['welcome', 'victory', 'mastery', 'event-result', 'event-confirm', 'update']);
  document.addEventListener('click', (e) => {
    const m = e.target;
    if (!m.classList?.contains('modal') || m.hidden || STICKY.has(m.id)) return;
    const x = m.querySelector('.close-btn');
    if (x) x.click();
    else m.hidden = true;
  });

  hideSplash();
  // (v5.13) A save from a newer version stays untouched (core/SaveSystem.js: saveGame): say why it is not here.
  if (!saved && storedSaveTooNew()) toast(t('⛔ Tu partida es de una versión más nueva del juego: actualiza el juego para seguirla. Mientras tanto no se guarda nada.'), 15000);
  if (offline) showWelcome(offline, () => sound.coin());
  for (const [id, r] of regionOffline) toast(t('{region} también siguió trabajando: +💰 {coins}', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}`, coins: formatNumber(r.coins) }), 5000);
  // How to play stays on top (welcome modal stays beneath for afterwards).
  if (introOnStart(game.state)) showIntro(game.state);
  // During an event, use its board clock (v3.9.1).
  // Currently viewed region (v3.10: each has its own workday) or, during an event, its board clock (v3.9.1).
  document.getElementById('clock').addEventListener('click', () => showCalendar(board ? board.game.state : active.state));
  const calendar = document.getElementById('calendar');
  document.getElementById('intro-btn').addEventListener('click', () => {
    document.getElementById('menu').hidden = true;
    showIntro(game.state);
  });

  let uiTimer = 0;
  let catching = false; // currently catching up offline progress on resume
  // Isolate each module: if one throws, the rest keep running (never let a per-frame
  // exception permanently halt the Pixi ticker).
  const safely = (fn) => {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  };
  app.ticker.add((ticker) => {
    if (catching) return;
    const dt = ticker.deltaMS / 1000;
    // The country clock and event slots, then all regions produce simultaneously (at dev options speed).
    safely(() => game.update(dt));
    for (const g of Object.values(games)) {
      g.timeScale = game.timeScale;
      safely(() => g.update(dt));
    }
    safely(() => {
      if (!board) return;
      board.game.timeScale = game.timeScale;
      board.game.update(dt);
      // (v5.19) A season event is won as soon as its objective is met: its sticker, the first time.
      if (board.season) {
        const won = finishSeason(game.state, board.season);
        if (won) {
          eventBar.paint();
          showSeasonResult(won);
        }
        return;
      }
      const r = finishEvent(game.state, board.key);
      // v3.7: reaching the goal secures the medal; event completes once all three upgrades are bought.
      if (r?.secured) {
        const m = MEDALS[r.medal];
        toast(t('{icon} ¡Medalla de {medal} asegurada! Para terminar el evento, compra las mejoras que faltan.', { icon: m.icon, medal: m.name }), 6000);
        sound.milestone();
      }
      if (r?.done) {
        eventBar.paint();
        showEventResult(r);
      }
    });
    safely(() => scene.update(dt));
    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.2;
      safely(() => hud.update());
      safely(() => scene.setGuide(panel.id ? null : hud.guide));
      // Achievements (v2.3): pay Renown as each tier is reached.
      safely(() => {
        // Per-region achievements (v3.10) alongside global player Renown.
        const won = Object.values(games).flatMap((g) => checkLogros(g.state, root.profile));
        // The grand finale is one more achievement (v5.9), paid once all the others are complete.
        won.push(...checkFinaleLogro(root.profile));
        // Region-wide medal tier bonus (v3.12).
        for (const b of checkMedalBonus(root.profile)) {
          toast(t('🏅 ¡Todos los eventos de {region} con {medal} o mejor! +{renown} ⭐ de Renombre', { region: REGIONS_BY_ID[b.region].name, medal: `${MEDALS[b.medal].icon} ${MEDALS[b.medal].name}`, renown: b.renown }), 5000);
          sound.milestone();
        }
        // Its side button (v5.15) shows once the special zone is finished (v5.16), and its window follows the count.
        document.getElementById('finale-btn').hidden = !finaleButtonShown(root);
        finaleInfo.update();
        // The last achievement opens the grand finale (v5.9): it plays by itself once, when no window is open.
        if (finaleDue(root.profile) && !board && !document.querySelector('.modal:not([hidden])')) {
          root.profile.grandFinaleSeen = true;
          saveGame(root);
          grandFinale();
        }
        if (!won.length) return;
        const stars = won.reduce((n, w) => n + w.reward, 0);
        const [w] = won;
        // Multiple tiers at once (pre-v2.3 save), collapsed into a single toast.
        toast(won.length > 1 ? t('🏆 {n} logros: +{stars} ⭐ de Renombre', { n: won.length, stars }) : t('🏆 {logro} (nivel {tier}): +{stars} ⭐ de Renombre', { logro: `${w.logro.icon} ${w.logro.name}`, tier: w.tier, stars }), 4000);
        sound.milestone();
      });
      // (v5.19) Season events whose days of grace are over close; if one is on screen, back to the map.
      safely(() => {
        for (const f of sweepSeason(game.state)) {
          if (board?.season === f.id) exitEvent();
          toast(t('{fiesta}: se acabaron sus días y el evento se cerró sin terminar. Vuelve el año que viene.', { fiesta: `${f.icon} ${t(f.name)}` }), 6000);
        }
      });
      // Inside an event board, the keeper does not show main-game hints.
      for (const view of [panel, chain, money, goals, research, zones, events, renown, stats, eventBar, ...(board ? [] : [chatter])]) safely(() => view.update());
      // The calendar, while open (v5.7), follows the clock: time of day, season and the event clock.
      if (!calendar.hidden) safely(() => showCalendar(board ? board.game.state : active.state));
    }
  });

  // Auto-save and resume catch-up when returning to the tab.
  const persist = () => {
    if (!resetting) saveGame(game.state);
  };
  setInterval(persist, AUTOSAVE_MS);
  let hiddenAt = null;
  const onHide = () => {
    hiddenAt ??= Date.now();
    // With Leave mode, open boards also tick while the app is closed (v3.67.4).
    if (board && (exitMode() === 'leave' || board.season)) board.game.state.event.away ??= clockOf(game.state);
    persist();
  };
  // On resume, catch up elapsed progress once (even if both page and native hooks fire). While
  // calculating, main loop pauses (catching) and the splash progress bar is shown.
  const onShow = async () => {
    if (!hiddenAt || catching) return;
    const away = (Date.now() - hiddenAt) / 1000;
    hiddenAt = null;
    catching = true;
    try {
      if (away >= MIN_OFFLINE_S) game.catchUp(away, offlineCapSeconds(root.profile));
      const r = await applyOffline(games.cafetero, away, null, root.profile);
      for (const [id, g] of Object.entries(games)) {
        if (id === 'cafetero') continue;
        const rr = await applyOffline(g, away, REGIONS_BY_ID[id], root.profile);
        if (rr) toast(t('{region} también siguió trabajando: +💰 {coins}', { region: `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}`, coins: formatNumber(rr.coins) }), 5000);
      }
      if (r) showWelcome(r, () => sound.coin());
      if (board) catchUpBoard(board.game);
    } finally {
      catching = false;
      hideSplash();
    }
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
  window.addEventListener('pagehide', persist);

  bindMenu(game, sound, music, () => active, grandFinale, stats);
  bindDevOptions(game, () => active);
  // (v5.9.1) The secret region's names show up in the icon tooltips once it has opened.
  bindIconTips(() => REGIONS.some((r) => r.secret && regionState(game.state, r.id)));
  bindMore(); // Show more toggle on long descriptions (v3.67.5)
  bindTip(tipMode({ native: isNativeApp(), playStore: typeof __PLAY_STORE__ !== 'undefined' && __PLAY_STORE__ }));
  // On Android app, assets are bundled locally: no service worker, hardware Back button enabled.
  if (isNativeApp()) {
    // Newer APK available? Check on launch, resume (every few hours), and from Settings (v3.6.1). Google Play
    // builds (v3.62) skip this and rely solely on Play Store updates per store policy.
    const selfUpdate = typeof __PLAY_STORE__ === 'undefined' || !__PLAY_STORE__;
    bindNative({ closeTop, onHide, onShow: () => (onShow(), selfUpdate && checkForUpdate()) });
    if (selfUpdate) {
      checkForUpdate();
      const updateBtn = document.getElementById('update-btn');
      updateBtn.hidden = false;
      updateBtn.addEventListener('click', () => checkForUpdate({ manual: true, toast }));
    }
  }
  else if (import.meta.env.PROD) {
    // On published web build, Settings links to the APK (built by the same GitHub Actions workflow).
    document.getElementById('apk-link').hidden = false;
    // Offline-playable and mobile-installable PWA. (Before v3.6.1 this never registered: it sat in an
    // else-if branch behind the APK check, which always matched first.)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// Simulates time elapsed while closed; returns summary if any progress occurred.
// Always at 1x speed: dev time multiplier applies only while the game is open
// (multiplying away time made startup catch-up take far too long).
// Chunked with splash progress bar (on a phone, 24 h catch-up can take several seconds).
// profile: player profile (v3.7: offline hours apply across all regions).
async function applyOffline(game, seconds, region, profile) {
  if (seconds < MIN_OFFLINE_S) return null;
  const cap = offlineCapSeconds(profile);
  splashOffline(seconds, cap, region);
  const r = await game.catchUpAsync(seconds, cap, setSplashProgress);
  splashWait(t('¡Listo! Preparando el mapa…'));
  return r.coins > 0 ? { ...r, cap, capped: seconds > cap, maxed: offlineLevel(profile) >= OFFLINE_COSTS.length } : null;
}

// getActive: currently viewed region state (its second ending and restart).
function bindMenu(game, sound, music, getActive, grandFinale, stats) {
  const menu = document.getElementById('menu');
  // SFX and music volume (v3.66), from 0 (muted) to 100.
  const slider = (key, flag, icons, apply) => {
    const input = document.getElementById(`${key}-vol`);
    const label = document.getElementById(`${key}-vol-val`);
    const icon = document.getElementById(`${key}-vol-icon`);
    const paint = () => {
      const v = game.state.settings[`${key}Volume`];
      input.value = v;
      label.textContent = v ? `${v} %` : t('No');
      icon.textContent = v ? icons[0] : icons[1];
    };
    paint();
    input.addEventListener('input', () => {
      const v = Number(input.value);
      game.state.settings[`${key}Volume`] = v;
      game.state.settings[flag] = v > 0;
      apply(v / 100);
      paint();
    });
  };
  slider('sound', 'sound', ['🔊', '🔇'], (v) => (sound.setVolume(v), sound.click()));
  slider('music', 'music', ['🎵', '🔕'], (v) => music.setVolume(v));
  document.getElementById('menu-version').textContent = `v${APP_VERSION}`;
  // Language (v3.68): save and reload the game (save occurs beforehand).
  const langSelect = document.getElementById('lang-select');
  langSelect.innerHTML = LANGS.map((l) => `<option value="${l.id}">${l.flag} ${l.name}</option>`).join('');
  langSelect.value = LANG;
  langSelect.addEventListener('change', () => {
    saveLang(langSelect.value);
    saveGame(game.state);
    location.reload();
  });
  // Currently playing music (for the viewed region), used in About credits (v3.67).
  const musicCredit = () => {
    const song = SONGS[music.region] ?? SONGS.cafetero;
    return t('🎵 Música: «{song}», compuesta para el juego y tocada por él ({instruments}, sintetizados).', { song: song.name, instruments: song.instruments });
  };
  document.getElementById('menu-btn').addEventListener('click', () => {
    // Reopening Settings resets delete-save back to the button step (v4.4.6).
    document.getElementById('reset-slide').hidden = true;
    document.getElementById('reset-btn').hidden = false;
    const s = game.state;
    // Across all regions and (v5.10) every run, the same numbers as 📊 Statistics › The whole game.
    const { sold, earned } = gameTotals(s);
    document.getElementById('menu-stats').innerHTML = [
      t('⏱️ Tiempo jugado: <b>{time}</b>', { time: cappedPlayTime(clockOf(s)) }),
      t('💰 Ganado en total: <b>{coins}</b>', { coins: cappedCoins(earned) }),
      t('📦 Productos vendidos: <b>{n}</b>', { n: cappedTotal('sold', sold) }),
    ].map((li) => `<li>${li}</li>`).join('');
    menu.hidden = false;
  });
  // Statistics (v5.10), opened on the region being viewed.
  document.getElementById('stats-btn').addEventListener('click', () => {
    menu.hidden = true;
    stats.open(getActive().state.region);
  });
  document.getElementById('close-menu').addEventListener('click', () => (menu.hidden = true));
  const about = document.getElementById('about');
  document.getElementById('about-btn').addEventListener('click', () => {
    document.getElementById('about-version').textContent = t('Versión {v}', { v: APP_VERSION });
    document.getElementById('about-music').textContent = musicCredit();
    menu.hidden = true;
    about.hidden = false;
  });
  document.getElementById('about-close').addEventListener('click', () => (about.hidden = true));

  // Text-based save backup.
  const text = document.getElementById('save-text');
  const msg = document.getElementById('save-msg');
  document.getElementById('export-btn').addEventListener('click', async () => {
    text.value = exportSave(game.state);
    text.select();
    try {
      await navigator.clipboard.writeText(text.value);
      msg.textContent = t('✅ Copiado. Pégalo en otro dispositivo para seguir allí.');
    } catch {
      msg.textContent = t('Selecciona el texto y cópialo.');
    }
  });
  // File backup (v4.7.4): save strings are long and clipboard copy on phones could produce empty text.
  document.getElementById('save-file-btn').addEventListener('click', async () => {
    try {
      const how = await saveBackupFile(exportSave(game.state));
      msg.textContent = how === 'downloaded' ? t('💾 Copia guardada: {name}', { name: backupName() }) : how === 'shared' ? t('💾 Copia lista: guárdala donde la elegiste.') : '';
    } catch (err) {
      console.error(err);
      msg.textContent = t('⛔ No se pudo guardar la copia.');
    }
  });
  document.getElementById('open-file-btn').addEventListener('click', async () => {
    const content = await pickBackupFile();
    if (content === null) return;
    const state = importSave(content);
    if (!state) {
      // (v5.13) A backup from a newer version of the game is refused with its own reason.
      msg.textContent = saveTooNew(content) ? t('⛔ Esa copia es de una versión más nueva del juego: actualiza el juego para abrirla.') : t('⛔ Ese archivo no es una partida válida de Encantos de Mi Tierrita.');
      return;
    }
    resetting = true;
    saveGame(state);
    location.reload();
  });
  document.getElementById('import-btn').addEventListener('click', () => {
    const state = importSave(text.value);
    if (!state) {
      msg.textContent = saveTooNew(text.value) ? t('⛔ Esa copia es de una versión más nueva del juego: actualiza el juego para abrirla.') : t('⛔ Ese texto no es una partida válida de Encantos de Mi Tierrita.');
      return;
    }
    resetting = true;
    saveGame(state);
    location.reload();
  });
  // Delete save (v4.3.2): requires sliding the knob all the way across the bar; releasing early
  // snaps it back with no effect. Two taps used to be enough and players deleted saves by accident.
  const slide = document.getElementById('reset-slide');
  const knob = document.getElementById('reset-knob');
  // (v4.4.6) Two-step button first; tapping reveals the slider. Resets after a few seconds if unused.
  const resetBtn = document.getElementById('reset-btn');
  let back = null;
  const showButton = () => {
    clearTimeout(back);
    slide.hidden = true;
    resetBtn.hidden = false;
  };
  const armBack = () => {
    clearTimeout(back);
    back = setTimeout(showButton, 8000);
  };
  resetBtn.addEventListener('click', () => {
    resetBtn.hidden = true;
    slide.hidden = false;
    armBack();
  });
  slide.querySelector('.slide-label').textContent = t('Desliza para borrar la partida');
  let drag = null;
  const maxX = () => slide.clientWidth - knob.offsetWidth - 8;
  const place = (x) => {
    knob.style.transform = `translateX(${x}px)`;
    slide.style.setProperty('--slide', String(Math.min(1, x / Math.max(1, maxX()))));
  };
  const release = () => {
    if (!drag) return;
    drag = null;
    slide.classList.remove('dragging');
    place(0);
    armBack();
  };
  knob.addEventListener('pointerdown', (e) => {
    clearTimeout(back);
    drag = { start: e.clientX, id: e.pointerId };
    knob.setPointerCapture(e.pointerId);
    slide.classList.add('dragging');
  });
  knob.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const x = Math.max(0, Math.min(maxX(), e.clientX - drag.start));
    place(x);
    if (x >= maxX() - 2) {
      drag = null;
      slide.classList.add('done');
      slide.querySelector('.slide-label').textContent = t('Borrando…');
      resetting = true;
      clearSave();
      setTimeout(() => location.reload(), 250);
    }
  });
  knob.addEventListener('pointerup', release);
  knob.addEventListener('pointercancel', release);
}

start();
