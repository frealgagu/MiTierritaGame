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
import { lifetimeOf, metric } from '../sim/logros.js';
import { legacyMult } from '../sim/modifiers.js';
import { openRegionStates } from '../sim/regions.js';
import { profileOf } from '../sim/renown.js';
import { cappedCoins, cappedCount, cappedPlayTime, cappedPrestige, cappedRenown, cappedStat } from './capped.js';
import { GRAN_FINAL_LOGRO } from '../data/logros.js';

const KINDS = ['gold', 'silver', 'bronze'];
const sum = (obj) => Object.values(obj ?? {}).reduce((a, b) => a + b, 0);
const row = (label, value) => `<div class="stats-row"><span>${label}</span><b>${value}</b></div>`;
const card = (title, rows) => `<div class="logro stats-card"><div class="logro-head"><b>${title}</b></div>${rows}</div>`;

// What a region sold or produced, finished runs plus the current one, summed over its products.
const regionTotal = (state, profile, kind) => Math.min(CAPS.stat, sum(lifetimeOf(profile, state.region ?? 'cafetero')[kind]) + sum(state.stats[kind]));

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

  render() {
    const html = this.generalHtml() + this.regionHtml();
    if (html === this.html) return;
    const top = this.body.scrollTop;
    this.body.innerHTML = this.html = html;
    this.body.scrollTop = top;
  }

  generalHtml() {
    const root = this.game.state;
    const profile = profileOf(root);
    const open = openRegionStates(root);
    const earned = Math.min(CAPS.lifetimeEarned, open.reduce((n, { state }) => n + metric(state, 'earned', profile), 0));
    const sold = Math.min(CAPS.stat, open.reduce((n, { state }) => n + regionTotal(state, profile, 'sold'), 0));
    const produced = Math.min(CAPS.stat, open.reduce((n, { state }) => n + regionTotal(state, profile, 'produced'), 0));
    const logros = finaleProgress(profile);
    const finale = (profile.logros?.[GRAN_FINAL_LOGRO.id] ?? 0) >= 1;
    const medals = KINDS.map((k) => `${MEDALS[k].icon} ${cappedCount(sum(Object.values(profile.medals ?? {}).map((m) => m.count?.[k] ?? 0)), CAPS.medalsPerKind * EVENTS.length)}`).join(' · ');
    const regions = open.map((r) => r.region.id);
    const events = EVENTS.filter((def) => regions.includes(REGION_OF_ZONE[def.zone]));
    const stickers = ALBUM.filter((pg) => regions.includes(pg.region)).flatMap((pg) => pg.stickers);
    return card(t('🇨🇴 Todo el juego'), [
      row(t('⏱️ Tiempo jugado'), cappedPlayTime(root.playTime)),
      row(t('💰 Ganado en total'), cappedCoins(earned)),
      row(t('📦 Productos vendidos'), cappedStat(sold)),
      row(t('🏭 Productos producidos'), cappedStat(produced)),
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
    const life = lifetimeOf(profile, region.id);
    const resets = state.legacy?.resets ?? 0;
    // Options carry only the name (the phone's own list may not draw the icon font), like in Renown.
    const select = `<div class="renown-regions stats-regions"><span>${region.icon}</span><select data-stats-region aria-label="${t('Región')}">${open.map((r) => `<option value="${r.region.id}" ${r.region.id === region.id ? 'selected' : ''}>${r.region.name}</option>`).join('')}</select></div>`;
    const general = card(`${region.icon} ${region.name}`, [
      row(t('🔁 Partida'), `${Math.min(resets + 1, CAPS.resets)}`),
      row(t('🔁 Reinicios'), `${resets} / ${CAPS.resets}`),
      row(t('⚡ Producción'), formatMult(legacyMult(state))),
      row(t('🚩 Veces completada'), `${metric(state, 'endings', profile)}`),
      row(t('🏁 Segundos finales'), `${metric(state, 'masteries', profile)}`),
      row(t('📅 Años vividos'), `${formatCount(Math.floor(metric(state, 'years', profile)))}`),
      row(t('⏱️ Tiempo jugado'), cappedPlayTime(life.playTime + state.playTime)),
      row(t('💰 Monedas'), cappedCoins(state.coins)),
      row(t('💰 Ganado en esta partida'), cappedCoins(state.totalEarned ?? 0)),
      row(t('💰 Ganado en total'), cappedCoins(metric(state, 'earned', profile))),
      row(t('🔬 Investigaciones'), `${state.research?.length ?? 0}`),
    ].join(''));
    // Events of the region: rounds played and medals of each kind.
    const events = EVENTS.filter((def) => REGION_OF_ZONE[def.zone] === region.id);
    const eventRows = events.map((def) => {
      const rec = profile.medals?.[def.id];
      const rounds = state.events?.count?.[eventKey(def)] ?? 0;
      const medals = KINDS.map((k) => `${MEDALS[k].icon} ${cappedCount(rec?.count?.[k] ?? 0, CAPS.medalsPerKind)}`).join(' ');
      return `<div class="stats-event"><span>${def.icon} ${def.name}</span><small>${t('{n} rondas', { n: cappedCount(rounds, CAPS.eventRound) })} · ${medals}</small></div>`;
    }).join('');
    const eventsCard = events.length ? card(t('🏅 Eventos'), eventRows) : '';
    // Products of the region with anything sold or produced, finished runs plus this one.
    const products = Object.entries(PRODUCTS).filter(([, p]) => REGION_OF_ZONE[p.zone] === region.id);
    const productRows = products
      .map(([id, p]) => ({ p, sold: metric(state, `sold:${id}`, profile), produced: metric(state, `produced:${id}`, profile) }))
      .filter((x) => x.sold || x.produced)
      .map(({ p, sold, produced }) => `<tr><td>${p.icon} ${p.name}</td><td>${cappedStat(produced)}</td><td>${cappedStat(sold)}</td></tr>`)
      .join('');
    const productsCard = card(t('📦 Productos'), productRows
      ? `<table class="stats-table"><thead><tr><th></th><th>${t('Producidos')}</th><th>${t('Vendidos')}</th></tr></thead><tbody>${productRows}</tbody></table>`
      : `<p>${t('Todavía no hay productos.')}</p>`);
    return select + general + eventsCard + productsCard;
  }
}
