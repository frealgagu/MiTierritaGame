// Save editor (v5.17): a web-only page (/editor/, like the music page, not in the app nor linked from the game)
// that opens a backup made with «Export to file», lets every value be changed and exports it again, to load it in
// the game with «Import from file». Forms for what a player knows (General, Events, each region) and an Advanced
// tab with every key of the save and its JSON. It reuses the game's own code to read, convert and write the save,
// and the game's way of showing each counter beside its box (999Dc++ at the cap).
import './editor.css';
import { exportSave, importSave, saveTooNew } from '../core/SaveSystem.js';
import { createGameState, createInitialState, linkRegion } from '../sim/state.js';
import { LANG, LANGS, chooseLang, loadLang, saveLang, t } from '../i18n/index.js';
import { REGIONS, REGIONS_BY_ID } from '../data/regions.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { STATIONS_BY_ID } from '../data/stations.js';
import { PRODUCTS } from '../data/products.js';
import { RESEARCH } from '../data/research.js';
import { GOALS_BY_ZONE } from '../data/goals.js';
import { EVENTS, MEDALS, eventKey } from '../data/events.js';
import { LOGROS } from '../data/logros.js';
import { ALBUM } from '../data/album.js';
import { ROUTES } from '../data/routes.js';
import { routeRegion } from '../sim/routes.js';
import { createSourceState, createStationState } from '../sim/production.js';
import { sourceOf } from '../sim/chain.js';
import { goalText } from '../sim/goals.js';
import { CAPS } from '../data/caps.js';
import { CHIVA_STEPS, OFFLINE_COSTS, WORK_COSTS } from '../sim/renown.js';
import { formatNumber } from '../core/format.js';
import { cappedCoins, cappedCount, cappedPlayTime, cappedPrestige, cappedRenown, cappedRun, cappedRunTime, cappedTotal } from '../ui/capped.js';
import { countAmount, joinTime, parseAmount, plainAmount, shortAmount, splitTime } from './numbers.js';
import { MAX_LEVEL } from '../sim/rules.js';

let root = null; // the whole game's save being edited
let fileName = '';
let tab = 'general';
const app = document.getElementById('app');
const decimalOf = () => (LANG === 'en' ? '.' : ',');

// --- Small DOM helpers ---
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v !== undefined && v !== null) e.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
const html = (tag, attrs, markup) => Object.assign(el(tag, attrs), { innerHTML: markup });

// A number box: plain numbers, the game's suffixes (20K, 1,5Dc) or 1e30. When it loses focus the value is kept and
// shown beside it the way the game shows it (`show`), e.g. «999Dc++» at the cap.
//   max, min: (v5.16.4) a value past them is brought back to them (870765 medals → 10, a negative → 0).
//   notation: how the box shows the number while not being edited: 'big' in the game's notation (123M, 1Dc),
//             'count' whole with thousands separators (10.000), 'plain' as typed (the Advanced tab). The exact
//             number is kept, and shown in full while the box has the focus.
//   onSet(value) runs after the value is stored (to tick «Built», for instance).
const NOTATION = { big: shortAmount, count: countAmount, plain: plainAmount };
function numberField(label, get, set, show = formatNumber, { onSet, min = 0, max = Infinity, notation = 'plain', title } = {}) {
  const out = el('output', { class: 'shown' }, show(get() ?? 0));
  const shown = () => NOTATION[notation](get() ?? 0, decimalOf());
  const input = el('input', { type: 'text', inputmode: 'decimal', value: shown(), 'aria-label': label, title });
  input.addEventListener('focus', () => (input.value = plainAmount(get() ?? 0, decimalOf())));
  input.addEventListener('blur', () => (input.value = shown()));
  input.addEventListener('change', () => {
    let n = parseAmount(input.value, decimalOf());
    if (!Number.isFinite(n)) {
      input.classList.add('bad');
      input.title = t('No es un número válido: se deja el anterior.');
      input.value = plainAmount(get() ?? 0, decimalOf());
      setTimeout(() => input.classList.remove('bad'), 1500);
      return;
    }
    n = Math.min(max, Math.max(min, n));
    input.title = title ?? '';
    set(n);
    if (document.activeElement !== input) input.value = shown();
    out.textContent = show(get() ?? 0);
    onSet?.(n);
  });
  return el('label', { class: 'field number' }, el('span', { class: 'name' }, label), input, out);
}
// The caps of the game's counters (data/caps.js) and its levels, for the boxes of the forms.
const BIG = (max) => ({ max, notation: 'big' });
const COUNT = (max) => ({ max, notation: 'count' });
const LEVEL = { min: 1, max: MAX_LEVEL, notation: 'count' };

// Hours, minutes and seconds; shown beside like the game (∞ from its cap).
function timeField(label, get, set, show = cappedRunTime) {
  const parts = splitTime(get());
  const out = el('output', { class: 'shown' }, show(get() ?? 0));
  const box = (key, unit) => {
    const input = el('input', { type: 'number', min: 0, step: 1, value: parts[key], 'aria-label': `${label} (${unit})` });
    input.addEventListener('change', () => {
      parts[key] = Math.max(0, Math.floor(Number(input.value) || 0));
      input.value = parts[key];
      const v = joinTime(parts);
      set(v);
      out.textContent = show(v);
    });
    return el('span', { class: 'unit' }, input, unit);
  };
  return el('label', { class: 'field time' }, el('span', { class: 'name' }, label), el('span', { class: 'hms' }, box('h', 'h'), box('m', 'min'), box('s', 's')), out);
}

function checkField(label, get, set, { onSet } = {}) {
  const input = el('input', { type: 'checkbox' });
  input.checked = Boolean(get());
  input.addEventListener('change', () => {
    set(input.checked);
    onSet?.(input.checked);
  });
  return el('label', { class: 'field check' }, input, el('span', { class: 'name' }, label));
}

function selectField(label, options, get, set) {
  const select = el('select', { 'aria-label': label }, options.map(([value, text]) => el('option', { value }, text)));
  select.value = String(get() ?? options[0][0]);
  select.addEventListener('change', () => set(select.value));
  return el('label', { class: 'field select' }, el('span', { class: 'name' }, label), select);
}

const section = (title, ...children) => el('section', { class: 'card' }, el('h2', {}, title), ...children);
// A collapsible group whose content is built the first time it opens (regions have hundreds of boxes).
function lazy(summary, build, open = false) {
  const d = el('details', { class: 'group' }, el('summary', {}, summary));
  let built = false;
  const fill = () => {
    if (built) return;
    built = true;
    d.append(build());
  };
  d.addEventListener('toggle', () => d.open && fill());
  if (open) {
    d.open = true;
    fill();
  }
  return d;
}

// --- The page ---
function header() {
  const langs = el('select', { 'aria-label': t('Idioma') }, LANGS.map((l) => el('option', { value: l.id }, `${l.flag} ${l.name}`)));
  langs.value = LANG;
  langs.addEventListener('change', () => {
    saveLang(langs.value);
    location.reload();
  });
  const file = el('input', { type: 'file', accept: '.txt,.json,text/plain,application/json', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (f) openText(await f.text(), f.name);
    file.value = '';
  });
  return el(
    'header',
    { class: 'top' },
    el('div', { class: 'brand' }, el('h1', {}, t('✏️ Editor de partidas')), el('p', {}, t('Abre una copia hecha con «Exportar a archivo», cambia lo que quieras y expórtala. En el juego, cárgala con «Importar desde archivo» (⚙️).'))),
    el(
      'div',
      { class: 'actions' },
      langs,
      file,
      el('button', { class: 'btn', onclick: () => file.click() }, t('📂 Abrir archivo')),
      el('button', { class: 'btn', onclick: newGame }, t('✨ Partida nueva')),
      el('button', { class: 'btn primary', onclick: save, disabled: !root }, t('💾 Exportar a archivo')),
    ),
  );
}

function render() {
  app.replaceChildren(header());
  const msg = el('div', { class: 'message', id: 'message', hidden: true });
  app.append(msg);
  if (!root) {
    app.append(el('section', { class: 'card empty' }, el('p', {}, t('Abre un archivo de tu partida o empieza una partida nueva para editarla.'))));
    return;
  }
  const regions = Object.keys(root.regions);
  const tabs = [
    ['general', t('🌎 General')],
    ['events', t('🏅 Eventos')],
    ...regions.map((id) => [`region:${id}`, `${REGIONS_BY_ID[id].icon} ${REGIONS_BY_ID[id].name}`]),
    ['advanced', t('🛠️ Avanzado')],
  ];
  if (!tabs.some(([id]) => id === tab)) tab = 'general';
  app.append(
    el('p', { class: 'loaded' }, fileName ? t('Archivo: {name}', { name: fileName }) : t('Partida nueva')),
    el('nav', { class: 'tabs' }, tabs.map(([id, name]) => el('button', { class: `tab ${id === tab ? 'active' : ''}`, onclick: () => ((tab = id), render()) }, name))),
  );
  const body = tab === 'general' ? general() : tab === 'events' ? events() : tab === 'advanced' ? advanced() : region(tab.slice(7));
  app.append(body);
}

function message(text, bad = false) {
  const m = document.getElementById('message');
  if (!m) return;
  m.textContent = text;
  m.classList.toggle('bad', bad);
  m.hidden = false;
}

// --- Opening and saving ---
function openText(text, name) {
  const trimmed = text.trim();
  // A plain JSON save (the Advanced tab's text) is accepted too.
  const encoded = trimmed.startsWith('{') ? btoa(unescape(encodeURIComponent(trimmed))) : trimmed;
  if (saveTooNew(encoded)) return render(), message(t('⛔ Esa copia es de una versión más nueva del juego: actualiza el juego para abrirla.'), true);
  const loaded = importSave(encoded);
  if (!loaded) return render(), message(t('⛔ Ese archivo no es una copia de una partida.'), true);
  root = loaded;
  fileName = name;
  tab = 'general';
  render();
  message(t('✅ Partida abierta.'));
}

function newGame() {
  root = createGameState();
  fileName = '';
  tab = 'general';
  render();
}

function save() {
  if (!root) return;
  const text = exportSave(root);
  // What the game will open: the same checks and conversions as «Import from file».
  const check = importSave(text);
  if (!check) return message(t('⛔ La partida quedó con algo que el juego no puede abrir; revisa los cambios.'), true);
  const date = new Date().toISOString().slice(0, 10);
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: `mitierrita-editada-${date}.txt` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  message(t('✅ Exportada. En el juego: ⚙️ › Importar desde archivo.'));
}

// --- General: the whole game's data ---
function general() {
  const p = root.profile;
  p.totals ??= { sold: 0, produced: 0 };
  const wrap = el('div', { class: 'grid' });
  wrap.append(
    section(
      t('🌎 Todo el juego'),
      timeField(t('⏱️ Reloj del país (tiempo jugado)'), () => root.playTime, (v) => (root.playTime = v), cappedPlayTime),
      numberField(t('⭐ Renombre'), () => p.renown, (v) => (p.renown = Math.round(v)), cappedRenown, COUNT(CAPS.renown)),
      numberField(t('🏆 Prestigio'), () => p.renownTotal, (v) => (p.renownTotal = Math.round(v)), cappedPrestige, COUNT(CAPS.prestige)),
      numberField(t('📦 Productos vendidos'), () => p.totals.sold, (v) => (p.totals.sold = v), (v) => cappedTotal('sold', v), BIG(CAPS.total.sold)),
      numberField(t('🏭 Productos producidos'), () => p.totals.produced, (v) => (p.totals.produced = v), (v) => cappedTotal('produced', v), BIG(CAPS.total.produced)),
    ),
    section(
      t('🛒 Compras con Renombre'),
      selectField(t('⏰ Horas sin conexión (nivel)'), Array.from({ length: OFFLINE_COSTS.length + 1 }, (_, k) => [k, String(k)]), () => p.offlineLevel ?? 0, (v) => (p.offlineLevel = Number(v))),
      checkField(t('⚡ Eventos sin esperar'), () => p.freeEvents, (v) => (v ? (p.freeEvents = true) : delete p.freeEvents)),
    ),
  );
  const add = addRegionBox();
  if (add) wrap.append(add);
  // Achievements: the tier reached in each one.
  const byRegion = (list, build) => REGIONS.filter((r) => list.some((x) => x.region === r.id)).map((r) => lazy(`${r.icon} ${r.name}`, () => build(r.id)));
  p.logros ??= {};
  wrap.append(
    section(
      t('🏆 Logros'),
      ...byRegion(LOGROS, (regionId) =>
        el(
          'div',
          { class: 'rows' },
          LOGROS.filter((l) => l.region === regionId).map((l) =>
            selectField(`${l.icon} ${l.name}`, Array.from({ length: l.tiers.length + 1 }, (_, k) => [k, k ? t('Nivel {n}', { n: k }) : '—']), () => p.logros[l.id] ?? 0, (v) => (Number(v) ? (p.logros[l.id] = Number(v)) : delete p.logros[l.id])),
          ),
        ),
      ),
    ),
  );
  // Album: every sticker, page by page.
  p.album ??= [];
  wrap.append(
    section(
      t('📖 Álbum'),
      ...byRegion(ALBUM, (regionId) =>
        el(
          'div',
          { class: 'rows' },
          ALBUM.filter((pg) => pg.region === regionId).map((pg) =>
            el('fieldset', { class: 'page' }, el('legend', {}, `${pg.icon} ${pg.name}`), pg.stickers.map((s) => checkField(`${s.icon} ${s.name}`, () => p.album.includes(s.id), (v) => (p.album = v ? [...new Set([...p.album, s.id])] : p.album.filter((x) => x !== s.id))))),
          ),
        ),
      ),
    ),
  );
  return wrap;
}

// --- Events: medals per event and rounds played ---
function events() {
  const p = root.profile;
  p.medals ??= {};
  const ev = root.events;
  ev.count ??= {};
  const kinds = ['gold', 'silver', 'bronze'];
  const best = (id) => p.medals[id]?.best ?? '';
  const rec = (id) => (p.medals[id] ??= { best: null, count: {} });
  const tidy = (id) => {
    const r = p.medals[id];
    if (r && !r.best && !kinds.some((k) => r.count?.[k])) delete p.medals[id];
  };
  return el(
    'div',
    { class: 'grid' },
    REGIONS.filter((r) => EVENTS.some((e) => REGIONS_BY_ID[r.id].zones.includes(e.zone))).map((r) =>
      section(
        `${r.icon} ${r.name}`,
        ...EVENTS.filter((e) => r.zones.includes(e.zone)).map((e) =>
          el(
            'fieldset',
            { class: 'event' },
            el('legend', {}, `${e.icon} ${e.name}`),
            selectField(t('Mejor medalla'), [['', '—'], ...kinds.map((k) => [k, `${MEDALS[k].icon} ${MEDALS[k].name}`])], () => best(e.id), (v) => {
              rec(e.id).best = v || null;
              tidy(e.id);
            }),
            ...kinds.map((k) =>
              numberField(`${MEDALS[k].icon} ${t('Medallas de {medal}', { medal: MEDALS[k].name })}`, () => p.medals[e.id]?.count?.[k] ?? 0, (v) => {
                (rec(e.id).count ??= {})[k] = Math.round(v);
                if (!v) delete p.medals[e.id].count[k];
                tidy(e.id);
              }, (v) => cappedCount(v, CAPS.medalsPerKind), COUNT(CAPS.medalsPerKind)),
            ),
            numberField(t('🔁 Rondas jugadas'), () => ev.count[eventKey(e)] ?? 0, (v) => (v ? (ev.count[eventKey(e)] = Math.round(v)) : delete ev.count[eventKey(e)]), (v) => cappedCount(v, CAPS.eventRound), COUNT(CAPS.eventRound)),
          ),
        ),
      ),
    ),
  );
}

// --- A region: its run, what it keeps on restart, and each zone with its stations ---
// Stations of a zone, the side ones (Compostera) included.
const stationsOf = (zoneId) => [...new Set([...ZONES_BY_ID[zoneId].chain, ...(ZONES_BY_ID[zoneId].plots ?? []).map((p) => p.stationId)])].filter((id) => STATIONS_BY_ID[id]);
const productsOf = (id) => [...Object.keys(STATIONS_BY_ID[id].out ?? {}), ...Object.keys(STATIONS_BY_ID[id].by ?? {})];

function region(regionId) {
  const s = root.regions[regionId];
  const def = REGIONS_BY_ID[regionId];
  s.counted ??= { sold: 0, produced: 0 };
  const keep = s.keep;
  const wrap = el('div', { class: 'grid' });
  wrap.append(
    section(
      t('🧺 Esta partida'),
      numberField(t('💰 Monedas'), () => s.coins, (v) => (s.coins = v), cappedCoins, BIG(CAPS.coins)),
      numberField(t('💰 Ganado en esta partida'), () => s.totalEarned, (v) => (s.totalEarned = v), cappedCoins, BIG(CAPS.coins)),
      timeField(t('⏱️ Tiempo jugado en esta partida'), () => s.playTime, (v) => (s.playTime = v)),
      numberField(t('📦 Vendidos en esta partida (todos los productos)'), () => s.counted.sold, (v) => (s.counted.sold = v), (v) => cappedTotal('sold', v), BIG(CAPS.total.sold)),
      numberField(t('🏭 Producidos en esta partida (todos los productos)'), () => s.counted.produced, (v) => (s.counted.produced = v), (v) => cappedTotal('produced', v), BIG(CAPS.total.produced)),
      checkField(t('🏅 Segundo final (todo al nivel 100)'), () => s.mastered, (v) => (s.mastered = v)),
    ),
    section(
      t('🔁 Lo que conserva al volver a empezar'),
      numberField(t('🔁 Reinicios'), () => keep.resets, (v) => (keep.resets = Math.round(v)), String, COUNT(CAPS.resets)),
      checkField(t('🚩 Región completada alguna vez'), () => keep.done, (v) => (keep.done = v)),
      checkField(t('🚙 Segundo Willys'), () => keep.willys2, (v) => (v ? (keep.willys2 = true) : delete keep.willys2)),
      selectField(t('🚌 Chivas'), [['', t('Cada 60 s')], ...CHIVA_STEPS.map((c) => [c.every, t('Cada {n} s', { n: c.every })])], () => keep.chivas ?? '', (v) => (v ? (keep.chivas = Number(v)) : delete keep.chivas)),
      selectField(t('🕐 Jornada (bloques de 2 h)'), Array.from({ length: WORK_COSTS.length + 1 }, (_, k) => [k, String(k)]), () => keep.workLevel ?? 0, (v) => (Number(v) ? (keep.workLevel = Number(v)) : delete keep.workLevel)),
    ),
  );
  const routes = ROUTES.filter((r) => routeRegion(r) === regionId && s.routes?.[r.id]);
  if (routes.length) wrap.append(section(t('🚌 Rutas'), routes.map((r) => numberField(`${r.icon} ${r.name}`, () => s.routes[r.id].level, (v) => (s.routes[r.id].level = Math.round(v)), String, LEVEL))));
  wrap.append(section(t('🗺️ Zonas'), def.zones.map((z) => lazy(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, () => zone(s, z)))));
  if (regionId !== 'cafetero') {
    wrap.append(
      el('button', {
        class: 'btn danger',
        onclick: () => {
          if (!confirm(t('¿Quitar {region} de la partida? Se pierde todo lo de su partida actual.', { region: def.name }))) return;
          delete root.regions[regionId];
          tab = 'general';
          render();
        },
      }, t('🗑️ Quitar {region} de la partida', { region: def.name })),
    );
  }
  return wrap;
}

function zone(s, zoneId) {
  const z = (s.zones[zoneId] ??= { unlocked: false, complete: false, dispatch: { level: 1 }, warehouse: {}, jeep: { phase: 'idle', t: 0, waited: 0, load: {} } });
  const box = el('div', { class: 'zone' });
  // An open zone has its source station, as when the game opens it.
  const open = (on) => {
    z.unlocked = on;
    const src = sourceOf(zoneId);
    if (on && src && !s.stations[src]) s.stations[src] = createSourceState(src);
  };
  const openBox = checkField(t('Abierta'), () => z.unlocked, open);
  box.append(
    el('div', { class: 'row' }, openBox, checkField(t('Completada'), () => z.complete, (v) => (z.complete = v))),
    numberField(t('🚙 Nivel de la bodega y el Willys'), () => z.dispatch.level, (v) => (z.dispatch.level = Math.round(v)), String, LEVEL),
  );
  for (const id of stationsOf(zoneId)) box.append(station(s, id, () => (openBox.querySelector('input').checked = z.unlocked), open));
  const research = RESEARCH.filter((r) => r.zone === zoneId);
  if (research.length) box.append(el('fieldset', { class: 'list' }, el('legend', {}, t('🔬 Investigaciones')), research.map((r) => checkField(`${r.icon} ${r.name}`, () => s.research.includes(r.id), (v) => (s.research = v ? [...new Set([...s.research, r.id])] : s.research.filter((x) => x !== r.id))))));
  const goals = GOALS_BY_ZONE[zoneId] ?? [];
  const claim = (g) => checkField(goalText(g), () => s.goals.claimed.includes(g.id), (v) => (s.goals.claimed = v ? [...new Set([...s.goals.claimed, g.id])] : s.goals.claimed.filter((x) => x !== g.id)));
  if (goals.length) box.append(lazy(t('🎯 Objetivos cobrados'), () => el('div', { class: 'list' }, goals.map(claim))));
  return box;
}

// A station: «Built», its levels, stopped, and what it sold and produced in this run. Any value other than zero
// builds it (and opens its zone); unticking «Built» removes it and brings its products back to zero.
function station(s, id, syncZone, openZone) {
  const def = STATIONS_BY_ID[id];
  const card = el('fieldset', { class: 'station' });
  let built;
  const build = () => {
    if (s.stations[id]) return;
    s.stations[id] = createStationState();
    built.checked = true;
    card.classList.remove('off');
    if (!s.zones[def.zone]?.unlocked) {
      openZone(true);
      syncZone();
    }
  };
  const whenNonZero = (v) => v && build();
  built = el('input', { type: 'checkbox' });
  built.checked = Boolean(s.stations[id]);
  card.classList.toggle('off', !built.checked);
  built.addEventListener('change', () => {
    if (built.checked) return build();
    delete s.stations[id];
    // Its products back to zero, unless another built station also makes them.
    for (const p of productsOf(id)) {
      if (Object.keys(s.stations).some((o) => productsOf(o).includes(p))) continue;
      for (const kind of ['sold', 'produced']) delete s.stats[kind][p];
    }
    card.classList.add('off');
    for (const out of card.querySelectorAll('.field.number input')) out.value = '0';
    for (const out of card.querySelectorAll('.field.number output')) out.textContent = '0';
  });
  const st = () => s.stations[id];
  card.append(
    el('legend', {}, el('label', { class: 'built' }, built, ` ${def.icon} ${def.name} `, el('small', {}, t('Construida')))),
    el(
      'div',
      { class: 'row' },
      numberField(t('Nivel'), () => st()?.level ?? 0, (v) => (v ? (build(), (st().level = Math.max(1, Math.round(v)))) : null), String, COUNT(MAX_LEVEL)),
      numberField(t('Arrieros'), () => st()?.transport.level ?? 0, (v) => (v ? (build(), (st().transport.level = Math.max(1, Math.round(v)))) : null), String, COUNT(MAX_LEVEL)),
      checkField(t('⏹️ Detenida'), () => st()?.stopped, (v) => (v ? (build(), (st().stopped = true)) : st() && delete st().stopped)),
    ),
    ...productsOf(id).map((p) =>
      el(
        'div',
        { class: 'product' },
        el('span', { class: 'pname' }, `${PRODUCTS[p].icon} ${PRODUCTS[p].name}`),
        numberField(t('Vendidos'), () => s.stats.sold[p] ?? 0, (v) => (v ? (s.stats.sold[p] = v) : delete s.stats.sold[p]), (v) => cappedRun('sold', v), { onSet: whenNonZero, ...BIG(CAPS.run.sold) }),
        numberField(t('Producidos'), () => s.stats.produced[p] ?? 0, (v) => (v ? (s.stats.produced[p] = v) : delete s.stats.produced[p]), (v) => cappedRun('produced', v), { onSet: whenNonZero, ...BIG(CAPS.run.produced) }),
      ),
    ),
  );
  return card;
}

// Opens a region not yet in the save, as the game does when its condition is met.
function addRegionBox() {
  const missing = REGIONS.filter((r) => !root.regions[r.id] && !r.hidden);
  if (!missing.length) return null;
  const select = el('select', { 'aria-label': t('Región') }, missing.map((r) => el('option', { value: r.id }, `${r.icon} ${r.name}`)));
  return section(
    t('➕ Abrir otra región'),
    el('div', { class: 'row' }, select, el('button', {
      class: 'btn',
      onclick: () => {
        root.regions[select.value] = createInitialState(Date.now(), select.value);
        linkRegion(root, select.value);
        tab = `region:${select.value}`;
        render();
      },
    }, t('Abrir'))),
  );
}

// --- Advanced: every key of the save, and its JSON ---
function advanced() {
  const wrap = el('div', { class: 'grid' });
  wrap.append(section(t('🛠️ Todos los valores'), el('p', { class: 'hint' }, t('Cada clave del archivo, tal como la guarda el juego. Los números aceptan 20K, 1,5Dc o 1e30.')), tree(root, 'root')));
  const area = el('textarea', { class: 'json', spellcheck: 'false' });
  area.value = JSON.stringify(root, null, 2);
  wrap.append(
    section(
      t('📄 Como texto (JSON)'),
      area,
      el('button', {
        class: 'btn',
        onclick: () => {
          try {
            JSON.parse(area.value);
          } catch (e) {
            return message(t('⛔ El texto no es JSON válido: {error}', { error: e.message }), true);
          }
          const keepName = fileName;
          openText(area.value, keepName);
          tab = 'advanced';
          render();
        },
      }, t('Aplicar el texto')),
    ),
  );
  return wrap;
}

function tree(obj, label) {
  const entries = Object.entries(obj);
  return lazy(`${label} ${Array.isArray(obj) ? `[${entries.length}]` : `{${entries.length}}`}`, () =>
    el(
      'div',
      { class: 'tree' },
      entries.map(([k, v]) => {
        if (v && typeof v === 'object') return tree(v, k);
        if (typeof v === 'number') return numberField(k, () => obj[k], (n) => (obj[k] = n), formatNumber, { min: -Infinity });
        if (typeof v === 'boolean') return checkField(k, () => obj[k], (b) => (obj[k] = b));
        if (typeof v === 'string') {
          const input = el('input', { type: 'text', value: v });
          input.addEventListener('change', () => (obj[k] = input.value));
          return el('label', { class: 'field text' }, el('span', { class: 'name' }, k), input);
        }
        return el('div', { class: 'field' }, el('span', { class: 'name' }, k), el('code', {}, String(v)));
      }),
    ),
  );
}

// --- Start ---
loadLang(chooseLang()).then(() => {
  document.title = t('Editor de partidas · Encantos de Mi Tierrita');
  render();
});
