// 💰 De dónde sale (v4.1.1): al tocar el dinero de la barra de arriba, lo que gana por segundo la región que se
// ve, zona por zona; lo que vende el Willys en la zona de ahora (cuánto, a qué precio y lo que se queda sin
// vender) y lo que lo multiplica. En un evento, lo del tablero.
import { formatNumber, formatRate } from '../core/format.js';
import { PRODUCTS } from '../data/products.js';
import { ZONES_BY_ID } from '../data/zones/index.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { analyzeChain } from '../sim/analysis.js';
import { COMPOST_VALUE, compostValueBoost, legacyMult, researchMult } from '../sim/modifiers.js';
import { clockOf, seasonOf } from '../sim/calendar.js';
import { t } from '../i18n/index.js';

const SHOW = 0.0005; // por debajo de esto (u/s) no se lista

const row = (left, right, cls = '') => `<div class="money-row ${cls}"><span>${left}</span><b>${right}</b></div>`;
const mult = (x) => `×${formatNumber(x)}`;

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

    // Zona por zona (en un evento, solo el tablero).
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

    // Lo que vende el Willys en la zona que se ve.
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

    // Lo que lo multiplica.
    const mults = [];
    const resets = s.legacy?.resets ?? 0;
    if (resets) mults.push(row(t('🔁 Reinicios ({n}): producción y Willys', { n: resets }), mult(legacyMult(s))));
    if (!s.event) {
      const season = seasonOf(clockOf(s));
      if (season.mult !== 1) mults.push(row(`${season.icon} ${season.name}`, mult(season.mult)));
    }
    const speed = researchMult(s, 'zoneSpeed', zone);
    if (speed !== 1) mults.push(row(t('🔬 Investigaciones de la zona: producción y Willys'), mult(speed)));
    const price = researchMult(s, 'zoneValue', zone);
    if (price !== 1) mults.push(row(t('🔬 Investigaciones: precio de todo lo de la zona'), mult(price)));
    if (sold.some((x) => researchMult(s, 'productValue', x.product) !== 1)) mults.push(row(t('🔬 Investigaciones: precio de algunos productos'), t('ver arriba')));
    const carry = researchMult(s, 'dispatchCapacity', zone);
    if (carry !== 1) mults.push(row(t('🔬 Investigaciones: lo que lleva el Willys'), mult(carry)));
    // El segundo Willys no multiplica el dinero (v4.3.1): despacha más seguido, pero si uno solo ya alcanzaba
    // se vende lo mismo. Por eso ya no sale aquí (decía ×2).
    if (zone === 'finca' && compostValueBoost(s) > 1) mults.push(row(t('🪱 Compost: lo que vende la Finca'), `+${Math.round((COMPOST_VALUE - 1) * 100)} %`));
    parts.push(`<h3 class="research-other">${t('Lo que lo multiplica')}</h3>`);
    parts.push(mults.length ? mults.join('') : `<p class="money-note">${t('Nada todavía: llega con las investigaciones, los reinicios y el verano.')}</p>`);

    const html = parts.join('');
    if (html !== this.html) this.body.innerHTML = this.html = html;
  }
}
