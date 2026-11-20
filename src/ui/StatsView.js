// Statistics (v5.10): every counter the game keeps, in one window from ⚙️. The whole game first (time,
// coins, products, Renown, achievements, medals, album), then the region chosen in the drop-down (runs,
// restarts, endings, years, coins, its events and its products). Counters at their cap read as «999Dc++»,
// «99++» or «∞» (see data/caps.js); a secret region only shows once it has opened.
import { ALBUM } from '../data/album.js';
import { CAPS } from '../data/caps.js';
import { EVENTS, MEDALS, eventKey } from '../data/events.js';
import { PRODUCTS } from '../data/products.js';
import { REGION_OF_ZONE } from '../data/regions.js';
import { formatCount, formatMult } from '../core/format.js';
import { t } from '../i18n/index.js';
import { finaleProgress } from '../sim/finale.js';
import { metric } from '../sim/logros.js';
import { legacyMult } from '../sim/modifiers.js';
import { openRegionStates } from '../sim/regions.js';
import { profileOf } from '../sim/renown.js';
import { cappedCoins, cappedCount, cappedPlayTime, cappedPrestige, cappedRenown, cappedRun, cappedRunTime, cappedTotal } from './capped.js';
import { gameTotals } from '../sim/totals.js';
import { clockOf } from '../sim/calendar.js';
import { RESEARCH } from '../data/research.js';
import { GRAN_FINAL_LOGRO } from '../data/logros.js';

const KINDS = ['gold', 'silver', 'bronze'];
const sum = (obj) => Object.values(obj ?? {}).reduce((a, b) => a + b, 0);
const row = (label, value) => `<div class="stats-row"><span>${label}</span><b>${value}</b></div>`;
const card = (title, rows) => `<div class="logro stats-card"><div class="logro-head"><b>${title}</b></div>${rows}</div>`;

export class StatsView {
  constructor(game) {
    this.game = game;
    this.region = 'cafetero';
    this.modal = document.getElementById('stats');
    this.body = document.getElementById('stats-body');
    document.getElementById('stats-close').addEventListener('click', () => (this.modal.hidden = true));
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.modal.hidden = true;
    });
    this.body.addEventListener('change', (e) => {
      if (!e.target.matches('[data-stats-region]')) return;
      this.region = e.target.value;
      this.render();
    });
  }

  // region: the region being viewed in the game (the window opens on it).
  open(region = this.region) {
    if (openRegionStates(this.game.state).some((r) => r.region.id === region)) this.region = region;
    this.render();
    this.body.scrollTop = 0;
    this.modal.hidden = false;
  }

  // While open, the numbers follow the game (main.js calls it with the other windows).
  update() {
    if (!this.modal.hidden) this.render();
  }

  // Three blocks, each redrawn only when its own text changes: the whole game, the region list and the region. The
  // list is rarely redrawn (v5.15): redrawing it with the numbers, several times a second, closed it while the
  // player was choosing a region.
  render() {
    if (!this.blocks) {
      this.body.innerHTML = '<div class="stats-block"></div>'.repeat(3);
      this.blocks = [...this.body.children];
      this.htmls = [];
    }
    const { select, cards } = this.regionHtml();
    const top = this.body.scrollTop;
    [this.generalHtml(), select, cards].forEach((html, k) => {
      if (html === this.htmls[k]) return;
      this.blocks[k].innerHTML = this.htmls[k] = html;
    });
    this.body.scrollTop = top;
  }

  generalHtml() {
    const root = this.game.state;
    const profile = profileOf(root);
    const open = openRegionStates(root);
    const { earned, sold, produced } = gameTotals(root);
    const logros = finaleProgress(profile);
    const finale = (profile.logros?.[GRAN_FINAL_LOGRO.id] ?? 0) >= 1;
    const medals = KINDS.map((k) => `${MEDALS[k].icon} ${cappedCount(sum(Object.values(profile.medals ?? {}).map((m) => m.count?.[k] ?? 0)), CAPS.medalsShown)}`).join(' · ');
    const regions = open.map((r) => r.region.id);
    const events = EVENTS.filter((def) => regions.includes(REGION_OF_ZONE[def.zone]));
    const stickers = ALBUM.filter((pg) => regions.includes(pg.region)).flatMap((pg) => pg.stickers);
    return card(t('🇨🇴 Todo el juego'), [
      // (v5.12) The country clock: it never restarts (before, it was Eje Cafetero's run and went back to 0 with it).
      row(t('⏱️ Tiempo jugado'), cappedPlayTime(clockOf(root))),
      row(t('💰 Ganado en total'), cappedCoins(earned)),
      row(t('📦 Productos vendidos'), cappedTotal('sold', sold)),
      row(t('🏭 Productos producidos'), cappedTotal('produced', produced)),
      row(t('⭐ Renombre'), cappedRenown(profile.renown ?? 0)),
      row(t('🏆 Prestigio'), cappedPrestige(profile.renownTotal ?? 0)),
      row(t('🏆 Logros completos'), `${formatCount(logros.have)} / ${formatCount(logros.total)}${finale ? ' · 🎉' : ''}`),
      row(t('🏅 Medallas'), medals),
      row(t('🏅 Eventos con medalla'), `${events.filter((def) => profile.medals?.[def.id]?.best).length} / ${events.length}`),
      row(t('📖 Láminas pegadas'), `${stickers.filter((s) => profile.album?.includes(s.id)).length} / ${stickers.length}`),
      row(t('🗺️ Regiones abiertas'), `${open.length}`),
    ].join(''));
  }

  regionHtml() {
    const root = this.game.state;
    const profile = profileOf(root);
    const open = openRegionStates(root);
    const current = open.find((r) => r.region.id === this.region) ?? open[0];
    const { region, state } = current;
    const resets = state.keep.resets;
    // Options carry only the name (the phone's own list may not draw the icon font), like in Renown.
    const select = `<div class="renown-regions stats-regions"><span>${region.icon}</span><select data-stats-region aria-label="${t('Región')}">${open.map((r) => `<option value="${r.region.id}" ${r.region.id === region.id ? 'selected' : ''}>${r.region.name}</option>`).join('')}</select></div>`;
    const general = card(`${region.icon} ${region.name}`, [
      row(t('🔁 Partida'), `${Math.min(resets + 1, CAPS.resets)}`),
      row(t('🔁 Reinicios'), `${resets} / ${CAPS.resets}`),
      row(t('⚡ Producción'), formatMult(legacyMult(state))),
      row(t('🚩 Veces completada'), `${metric(state, 'endings', profile)}`),
      row(t('🏁 Segundos finales'), `${metric(state, 'masteries', profile)}`),
      row(t('📅 Años vividos'), cappedCount(Math.floor(metric(state, 'years', profile)), CAPS.years)),
      row(t('⏱️ Tiempo jugado en esta partida'), cappedRunTime(state.playTime)),
      row(t('💰 Monedas'), cappedCoins(state.coins)),
      row(t('💰 Ganado en esta partida'), cappedCoins(state.totalEarned ?? 0)),
      row(t('💰 Ganado en total'), cappedCoins(metric(state, 'earned', profile))),
      row(t('🔬 Investigaciones'), `${state.research?.length ?? 0} / ${RESEARCH.filter((r) => REGION_OF_ZONE[r.zone] === region.id).length}`),
    ].join(''));
    // Events of the region: rounds played and medals of each kind.
    const events = EVENTS.filter((def) => REGION_OF_ZONE[def.zone] === region.id);
    const eventRows = events.map((def) => {
      const rec = profile.medals?.[def.id];
      const rounds = root.events.count[eventKey(def)] ?? 0;
      const medals = KINDS.map((k) => `${MEDALS[k].icon} ${cappedCount(rec?.count?.[k] ?? 0, CAPS.medalsPerKind)}`).join(' ');
      return `<div class="stats-event"><span>${def.icon} ${def.name}</span><small>${t('{n} rondas', { n: cappedCount(rounds, CAPS.eventRound) })} · ${medals}</small></div>`;
    }).join('');
    const eventsCard = events.length ? card(t('🏅 Eventos'), eventRows) : '';
    // Products of the region with anything sold or produced in the current run (v5.10; earlier runs count in the
    // whole game's totals).
    const products = Object.entries(PRODUCTS).filter(([, p]) => REGION_OF_ZONE[p.zone] === region.id);
    const productRows = products
      .map(([id, p]) => ({ p, sold: state.stats.sold[id] ?? 0, produced: state.stats.produced[id] ?? 0 }))
      .filter((x) => x.sold || x.produced)
      .map(({ p, sold, produced }) => `<tr><td>${p.icon} ${p.name}</td><td>${cappedRun('produced', produced)}</td><td>${cappedRun('sold', sold)}</td></tr>`)
      .join('');
    const productsCard = card(t('📦 Productos de esta partida'), productRows
      ? `<table class="stats-table"><thead><tr><th></th><th>${t('Producidos')}</th><th>${t('Vendidos')}</th></tr></thead><tbody>${productRows}</tbody></table>`
      : `<p>${t('Todavía no hay productos en esta partida.')}</p>`);
    return { select, cards: general + eventsCard + productsCard };
  }
}
