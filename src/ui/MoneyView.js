// 💰 Income breakdown (v4.1.1): tapping top-bar coins shows what the viewed region earns per second,
// zone by zone; what the Willys sells in the current zone (rate, price, and what goes unsold)
// and its multipliers. In an event, shows board breakdown.
import { current } from '../sim/fiestas.js';
import { decimal, formatNumber, formatRate } from '../core/format.js';
import { PRODUCTS } from '../data/products.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { analyzeChain } from '../sim/analysis.js';
import { COMPOST_VALUE, compostValueBoost, legacyMult, researchMult } from '../sim/modifiers.js';
import { clockOf, seasonOf } from '../sim/calendar.js';
import { t } from '../i18n/index.js';

const SHOW = 0.0005; // below this (u/s) omitted from list

const row = (left, right, cls = '') => `<div class="money-row ${cls}"><span>${left}</span><b>${right}</b></div>`;
// Small multipliers keep their decimals (×1,2 in summer, ×1,25 in a fiesta; before v5.17 they read «×1»).
const mult = (x) => (x < 1000 ? `×${decimal(String(Math.round(x * 100) / 100))}` : `×${formatNumber(x)}`);

export class MoneyView {
  constructor(game, getZone) {
    this.game = game;
    this.getZone = getZone;
    this.modal = document.getElementById('money');
    this.body = document.getElementById('money-body');
    const coins = document.getElementById('coins-btn');
    coins.addEventListener('click', () => this.open());
    document.getElementById('money-close').addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => e.target === this.modal && this.close());
  }

  open() {
    this.html = null;
    this.modal.hidden = false;
    this.update();
  }

  close() {
    this.modal.hidden = true;
  }

  update() {
    if (this.modal.hidden) return;
    const s = this.game.state;
    const zone = this.getZone();
    const parts = [];
    parts.push(`<p class="money-note">${t('La barra marca <b>+{n} 💰/s</b>: lo que se vendió en promedio el último minuto.', { n: formatRate(this.game.incomePerSecond()) })}</p>`);

    // Zone by zone (in an event, board only).
    const region = REGIONS_BY_ID[REGION_OF_ZONE[zone]];
    const zones = s.event ? [zone] : region.zones.filter((z) => s.zones[z]?.unlocked);
    const per = zones.map((z) => ({ z, a: analyzeChain(s, z) }));
    const total = per.reduce((n, x) => n + x.a.income, 0);
    if (!s.event) {
      parts.push(`<h3 class="research-other">${t('Por zona de {region}', { region: `${region.icon} ${region.name}` })}</h3>`);
      for (const { z, a } of per) {
        const share = total > 0 ? Math.round((a.income / total) * 100) : 0;
        parts.push(row(`${ZONES_BY_ID[z].icon} ${ZONES_BY_ID[z].name}`, `${formatRate(a.income)} 💰/s · ${share} %`, z === zone ? 'here' : ''));
      }
      parts.push(row(t('Total estimado'), `${formatRate(total)} 💰/s`, 'total'));
    }

    // What the Willys sells in the currently viewed zone.
    const here = per.find((x) => x.z === zone)?.a ?? analyzeChain(s, zone);
    parts.push(`<h3 class="research-other">${t('Lo que vende el Willys en {zone}', { zone: `${ZONES_BY_ID[zone].icon} ${ZONES_BY_ID[zone].name}` })}</h3>`);
    const sold = here.sold.filter((x) => x.units > SHOW).sort((a, b) => b.units * b.value - a.units * a.value);
    if (!sold.length) parts.push(`<p class="money-note">${t('Todavía no vende nada.')}</p>`);
    for (const x of sold) {
      const p = PRODUCTS[x.product];
      const base = p.value !== x.value ? ` <small>(${t('base {n}', { n: formatNumber(p.value) })})</small>` : '';
      parts.push(row(`${p.icon} ${p.name}<br><small>${formatRate(x.units)}/s × ${formatNumber(x.value)} 💰</small>${base}`, `${formatRate(x.units * x.value)} 💰/s`));
    }
    for (const x of here.sold.filter((y) => y.unsold > SHOW)) {
      const p = PRODUCTS[x.product];
      parts.push(row(`⚠️ ${t('Sin vender: {p}', { p: `${p.icon} ${p.name}` })}<br><small>${t('El Willys no da abasto: sube la bodega.')}</small>`, `${formatRate(x.unsold)}/s`, 'lost'));
    }

    // What multiplies it.
    const mults = [];
    const resets = s.keep?.resets ?? 0;
    if (resets) mults.push(row(t('🔁 Reinicios ({n}): producción y Willys', { n: resets }), mult(legacyMult(s))));
    if (!s.event) {
      const season = seasonOf(clockOf(s));
      if (season.mult !== 1) mults.push(row(`${season.icon} ${season.name}`, mult(season.mult)));
      // (v5.17) Today's fiesta of the real calendar.
      const fiesta = current();
      if (fiesta.main) mults.push(row(`${fiesta.main.fiesta.icon} ${t(fiesta.main.fiesta.name)}`, mult(fiesta.mult)));
    }
    const speed = researchMult(s, 'zoneSpeed', zone);
    if (speed !== 1) mults.push(row(t('🔬 Investigaciones de la zona: producción y Willys'), mult(speed)));
    const price = researchMult(s, 'zoneValue', zone);
    if (price !== 1) mults.push(row(t('🔬 Investigaciones: precio de todo lo de la zona'), mult(price)));
    if (sold.some((x) => researchMult(s, 'productValue', x.product) !== 1)) mults.push(row(t('🔬 Investigaciones: precio de algunos productos'), t('ver arriba')));
    const carry = researchMult(s, 'dispatchCapacity', zone);
    if (carry !== 1) mults.push(row(t('🔬 Investigaciones: lo que lleva el Willys'), mult(carry)));
    // Second Willys doesn't multiply coin rate (v4.3.1): dispatches more often, but if one already kept up
    // total sold stays the same. Removed from here (used to say ×2).
    if (zone === 'finca' && compostValueBoost(s) > 1) mults.push(row(t('🪱 Compost: lo que vende la Finca'), `+${Math.round((COMPOST_VALUE - 1) * 100)} %`));
    parts.push(`<h3 class="research-other">${t('Lo que lo multiplica')}</h3>`);
    parts.push(mults.length ? mults.join('') : `<p class="money-note">${t('Nada todavía: llega con las investigaciones, los reinicios y el verano.')}</p>`);

    const html = parts.join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
