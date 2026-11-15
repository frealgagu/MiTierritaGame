// Renown modal ⭐ (v2.2): sticker album (stick whichever you choose) and decoration.
// Since v3.10 album, decoration, achievements, and shift belong to each region: header selects which
// is viewed (starts on active region). Renown and offline hours belong to player.
import { PAGE_BONUS, albumOf } from '../data/album.js';
import { DECOR } from '../data/decor.js';
import { OFFLINE_COSTS, OFFLINE_STEP_HOURS, PETS, WORK_COSTS, albumDone, buyChivas, buyPet, chivaEvery, CHIVA_STEPS, quoteChivas, decorOf, petsOf, quotePet, buyOffline, buyWillys2, buyWork, quoteWillys2, quoteWork, workLevel, buySticker, offlineHours, offlineLevel, ownsDecor, pageDone, pickDecor, profileOf, quoteDecor, quoteOffline, quoteSticker } from '../sim/renown.js';
import { EXTRA_BLOCKS, workBlocks } from '../sim/calendar.js';
import { workSentence } from './calendar.js';
import { openRegionStates, regionState } from '../sim/regions.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { toast } from './toast.js';
import { logrosOf } from '../data/logros.js';
import { metric, tierOf } from '../sim/logros.js';
import { formatNumber } from '../core/format.js';
import { t } from '../i18n/index.js';
import { cappedPrestige, cappedRenown } from './capped.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

export class RenownView {
  // onDecor: decoration changed (map must redraw).
  constructor(game, onDecor) {
    this.game = game;
    this.onDecor = onDecor;
    this.modal = document.getElementById('renown');
    this.body = document.getElementById('renown-body');
    this.tab = 'album';
    this.region = 'cafetero';
    this.page = albumOf(this.region)[0].id;
    this.regions = document.getElementById('renown-regions');
    document.getElementById('renown-close').addEventListener('click', () => (this.modal.hidden = true));
    for (const btn of this.modal.querySelectorAll('[data-renown-tab]')) {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.renownTab;
        this.render();
      });
    }
    this.regions.addEventListener('change', (e) => {
      if (!e.target.matches('[data-renown-select]')) return;
      this.region = e.target.value;
      this.render();
    });
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) return void (this.modal.hidden = true);
      const page = e.target.closest('[data-page]');
      if (page) {
        this.page = page.dataset.page;
        return this.render();
      }
      const sticker = e.target.closest('[data-sticker]');
      if (sticker) return this.stick(sticker.dataset.sticker);
      const opt = e.target.closest('[data-decor]');
      if (opt) this.decorate(...opt.dataset.decor.split(':'));
      if (e.target.closest('[data-offline]') && buyOffline(profileOf(this.game.state))) {
        toast(t('⏰ Ahora todo sigue produciendo {n} h mientras no juegas.', { n: offlineHours(profileOf(this.game.state)) }), 3500);
        this.render();
      }
      const pet = e.target.closest('[data-pet]');
      if (pet && buyPet(profileOf(this.game.state), this.region, pet.dataset.pet)) {
        const def = PETS[pet.dataset.pet];
        toast(t('{icon} ¡Un {pet} nuevo en {region}!', { icon: def.icon, pet: def.name.toLowerCase(), region: REGIONS_BY_ID[this.region].name }), 3000);
        this.onDecor(profileOf(this.game.state));
        this.render();
      }
      if (e.target.closest('[data-chivas]') && buyChivas(profileOf(this.game.state), this.regionState())) {
        toast(t('🚌 En {region} las chivas salen ahora cada {n} s.', { region: REGIONS_BY_ID[this.region].name, n: chivaEvery(this.regionState()) }), 3500);
        this.render();
      }
      const w2 = e.target.closest('[data-willys2]');
      if (w2) this.buyJeep(w2.dataset.willys2);
      if (e.target.closest('[data-work]') && buyWork(profileOf(this.game.state), this.regionState())) {
        toast(t('🕐 En {region} ahora {sentence}.', { region: REGIONS_BY_ID[this.region].name, sentence: workSentence(workBlocks(workLevel(this.regionState()))) }), 3500);
        this.render();
      }
    });
  }

  // Save of the region currently viewed in the modal.
  regionState() {
    return regionState(this.game.state, this.region) ?? this.game.state;
  }

  // region: currently active region (modal opens to it).
  open(tab, region = this.region) {
    this.tab = tab;
    if (regionState(this.game.state, region)) this.region = region;
    this.render();
    this.body.scrollTop = 0;
    this.modal.hidden = false;
  }

  stick(id) {
    const r = buySticker(profileOf(this.game.state), id);
    if (!r) return;
    if (r.bonus) toast(t('📖 ¡Página llena! +{n} ⭐ de Renombre', { n: r.bonus }), 3500);
    this.render();
  }

  // Region's second Willys (v3.9): road widens, so map redraws.
  buyJeep(regionId) {
    const profile = profileOf(this.game.state);
    if (!buyWillys2(profile, regionState(this.game.state, regionId))) return;
    toast(t('🚙 ¡Segundo Willys para {region}! Cada zona tiene ahora dos: la bodega despacha más seguido.', { region: REGIONS_BY_ID[regionId].name }), 4500);
    this.onDecor(profile);
    this.render();
  }

  // Above album: region's second Willys, unlocked once its album is full.
  willysHtml(profile) {
    const region = REGIONS_BY_ID[this.region];
    const pages = albumOf(this.region);
    const total = pages.reduce((n, pg) => n + pg.stickers.length, 0);
    const have = pages.reduce((n, pg) => n + pg.stickers.filter((st) => profile.album.includes(st.id)).length, 0);
    const q = quoteWillys2(profile, this.regionState());
    const button =
      q.reason === 'owned'
        ? `<button class="btn" disabled>${region.icon} ${region.name} ✓</button>`
        : `<button class="btn ${q.ok ? 'buy' : ''}" data-willys2="${region.id}" ${q.ok ? '' : 'disabled'}>${region.icon} ${region.name} · ⭐ ${q.cost}</button>`;
    const text = albumDone(profile, this.region)
      ? t('Cada zona de la región tiene un segundo Willys, por su propio carril: la bodega despacha más seguido, sin esperar a que vuelva el primero (lo que se vende por minuto es lo mismo si uno solo ya alcanzaba). Se pinta aparte en Decoración.')
      : t('Llena este álbum ({have} / {total} láminas) para comprar un segundo Willys en {region}: la bodega despacha más seguido.', { have, total, region: region.name });
    return `<div class="logro willys2"><div class="logro-head"><b>${t('🚙 Segundo Willys')}</b></div><p>${text}</p><div class="willys2-btns">${button}</div></div>`;
  }

  decorate(cat, opt) {
    const profile = profileOf(this.game.state);
    if (!pickDecor(profile, cat, opt, this.region)) return;
    this.onDecor(profile);
    this.render();
  }

  render() {
    const profile = profileOf(this.game.state);
    document.getElementById('renown-title').textContent = t('⭐ Renombre: {n}', { n: cappedRenown(profile.renown) });
    // Prestige (v3.11): lifetime Renown earned, even if already spent.
    document.getElementById('renown-total').textContent = t('🏆 Prestigio: {n} ⭐ (todo el Renombre que has ganado)', { n: cappedPrestige(profile.renownTotal ?? profile.renown) });
    for (const btn of this.modal.querySelectorAll('[data-renown-tab]')) btn.classList.toggle('active', btn.dataset.renownTab === this.tab);
    // Viewed region selector (when more than one is open).
    const open = openRegionStates(this.game.state);
    this.regions.hidden = open.length < 2;
    // (v5.8) A drop-down instead of a 3×3 grid of buttons with cut names. Options carry only the name:
    // the phone's own list may not draw the game's icon font; the chosen region's icon goes beside it.
    const current = open.find(({ region }) => region.id === this.region)?.region;
    const regions = `<span>${current?.icon ?? ''}</span><select data-renown-select aria-label="${t('Región')}">${open.map(({ region }) => `<option value="${region.id}" ${region.id === this.region ? 'selected' : ''}>${region.name}</option>`).join('')}</select>`;
    if (regions !== this.regionsHtml) this.regions.innerHTML = this.regionsHtml = regions;
    const help = document.getElementById('renown-help');
    if (this.tab === 'album') {
      help.textContent = t('Cada región tiene su álbum. Cada lámina cuesta Renombre y tú eliges cuál pegar; al llenar una página ganas {n} ⭐.', { n: PAGE_BONUS });
      this.setBody(this.albumHtml(profile));
    } else if (this.tab === 'offline') {
      help.textContent = t('La jornada es de cada región; las horas sin conexión valen para todas. Nada de esto se pierde al volver a empezar.');
      this.setBody(this.workHtml(profile) + this.offlineHtml(profile));
    } else if (this.tab === 'logros') {
      help.textContent = t('Cada región tiene sus logros. Suman entre partidas: lo de antes de volver a empezar también cuenta. Cada nivel da Renombre.');
      this.setBody(this.logrosHtml());
    } else {
      help.textContent = t('Cada región se decora aparte. Lo de siempre es gratis; lo demás se compra una vez con Renombre y se puede cambiar cuando quieras.');
      this.setBody(this.petsHtml(profile) + this.decorHtml(profile));
    }
  }

  // Rewrites the list only when something changed, so periodic refreshes (v5.7) don't
  // interrupt a tap or move the scroll.
  setBody(html) {
    if (html === this.bodyHtml) return;
    const top = this.body.scrollTop;
    this.body.innerHTML = this.bodyHtml = html;
    this.body.scrollTop = top;
  }

  // While open (v5.7): Renown earned, achievement progress and what can be bought refresh on their own.
  update() {
    if (!this.modal.hidden) this.render();
  }

  albumHtml(profile) {
    const album = albumOf(this.region);
    // A newly opened region (v3.15) includes its album after its zones.
    if (!album.length) return `<p class="event-soon">${t('El álbum de {region} llega pronto.', { region: REGIONS_BY_ID[this.region].name })}</p>`;
    if (!album.some((pg) => pg.id === this.page)) this.page = album[0].id;
    const pages = album.map((pg) => `<button data-page="${pg.id}" class="${pg.id === this.page ? 'on' : ''} ${pageDone(profile, pg.id) ? 'full' : ''}" title="${pg.name}">${pg.icon}</button>`).join('');
    const page = album.find((pg) => pg.id === this.page);
    const have = page.stickers.filter((s) => profile.album.includes(s.id)).length;
    const cards = page.stickers
      .map((s) => {
        if (profile.album.includes(s.id)) return `<div class="sticker"><div class="big">${s.icon}</div><b>${s.name}</b><p>${s.text}</p></div>`;
        const q = quoteSticker(profile, s.id);
        return `<div class="sticker empty"><div class="big">${s.icon}</div><b>${s.name}</b><button class="btn ${q.ok ? 'buy' : ''}" data-sticker="${s.id}" ${q.ok ? '' : 'disabled'}>${t('Pegar')} · ⭐ ${s.cost}</button></div>`;
      })
      .join('');
    return `${this.willysHtml(profile)}${this.chivasHtml(profile)}<div class="album-pages">${pages}</div><div class="album-head"><span>${page.icon} ${page.name}</span><span>${have} / ${page.stickers.length}${have === page.stickers.length ? ' ✅' : ` · ${t('llena: +{n} ⭐', { n: PAGE_BONUS })}`}</span></div><div class="album-grid">${cards}</div>`;
  }

  logrosHtml() {
    const profile = profileOf(this.game.state);
    const s = this.regionState();
    const done = profile.logros ?? {};
    if (!logrosOf(this.region).length) return `<p class="event-soon">${t('Los logros de {region} llegan pronto.', { region: REGIONS_BY_ID[this.region].name })}</p>`;
    return logrosOf(this.region).map((l) => {
      const value = metric(s, l.metric, profile);
      const tier = Math.max(done[l.id] ?? 0, tierOf(l, value));
      const stars = l.tiers.map((_, k) => (k < tier ? '★' : '☆')).join('');
      const next = l.tiers[tier];
      const n = (x) => formatNumber(Math.floor(x));
      const line = next === undefined ? t('✅ Completo') : `${l.text.replace('{n}', n(next))} · ${n(Math.min(value, next))} / ${n(next)} · +${l.reward[tier]} ⭐`;
      const pct = next === undefined ? 100 : (100 * Math.min(value, next)) / next;
      return `<div class="logro"><div class="logro-head"><b>${l.icon} ${l.name}</b><span class="logro-stars">${stars}</span></div><p>${line}</p><div class="bar"><div style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  // Work shift (v3.8): from 12 h to 24 h, in 2 h blocks each costing double the previous.
  workHtml(profile) {
    const level = workLevel(this.regionState());
    const hours = 12 + 2 * level;
    const steps = WORK_COSTS.map((_, k) => (k < level ? '★' : '☆')).join('');
    const q = quoteWork(profile, this.regionState());
    const [a, b] = EXTRA_BLOCKS[level] ?? [];
    const next = q.reason === 'max'
      ? `<p>${t('✅ Al máximo: se trabaja las 24 horas.')}</p>`
      : `<button class="btn buy" data-work ${q.ok ? '' : 'disabled'}>${t('+2 h (de {a}:00 a {b}:00)', { a, b: b % 24 })} · ⭐ ${q.cost}</button>`;
    return `<div class="logro"><div class="logro-head"><b>${t('🕐 Jornada en {region}: {n} h', { region: REGIONS_BY_ID[this.region].name, n: hours })}</b><span class="logro-stars">${steps}</span></div>
      <p>${workSentence(workBlocks(level), true)}. ${t('Fuera de la jornada las estaciones descansan.')}</p>
      <div class="bar"><div style="width:${(100 * hours) / 24}%"></div></div>${next}</div>`;
  }

  // Faster chivas (v4.2): every 30 s then every 15 s, per region; each carries its share.
  chivasHtml(profile) {
    const every = chivaEvery(this.regionState());
    const steps = CHIVA_STEPS.map((s) => (every <= s.every ? '★' : '☆')).join('');
    const q = quoteChivas(profile, this.regionState());
    const next = q.reason === 'max'
      ? `<p>${t('✅ Al máximo: una chiva cada 15 s.')}</p>`
      : `<button class="btn buy" data-chivas ${q.ok ? '' : 'disabled'}>${t('Una chiva cada {n} s', { n: q.every })} · ⭐ ${q.cost}</button>`;
    return `<div class="logro"><div class="logro-head"><b>${t('🚌 Chivas: cada {n} s', { n: every })}</b><span class="logro-stars">${steps}</span></div>
      <p>${t('Salen más seguido y cada una lleva su parte: llega lo mismo por minuto, pero las estaciones no se quedan esperando.')}${q.reason === 'album' ? ` ${t('Se compran con el álbum de la región lleno.')}` : q.reason === 'restart' ? ` ${t('Se compran después de reiniciar la región una vez.')}` : ''}</p>${next}</div>`;
  }

  // Offline hours (v3.7): from 2 h to 24 h, 2 h per level.
  offlineHtml(profile) {
    const level = offlineLevel(profile);
    const hours = offlineHours(profile);
    const max = 2 + OFFLINE_STEP_HOURS * OFFLINE_COSTS.length;
    const steps = OFFLINE_COSTS.map((_, k) => (k < level ? '★' : '☆')).join('');
    const q = quoteOffline(profile);
    const next = q.reason === 'max'
      ? `<p>${t('✅ Al máximo: 24 h.')}</p>`
      : `<button class="btn buy" data-offline ${q.ok ? '' : 'disabled'}>${t('+{n} h (hasta {max} h)', { n: OFFLINE_STEP_HOURS, max: hours + OFFLINE_STEP_HOURS })} · ⭐ ${q.cost}</button>`;
    return `<div class="logro"><div class="logro-head"><b>${t('⏰ Sin conexión: {n} h', { n: hours })}</b><span class="logro-stars">${steps}</span></div>
      <p>${t('Al volver, se suma lo que todas tus regiones produjeron hasta {n} h (máximo {max} h).', { n: hours, max })}</p>
      <div class="bar"><div style="width:${(100 * hours) / max}%"></div></div>${next}</div>`;
  }

  // Region pets (v3.12): count and button to adopt another.
  petsHtml(profile) {
    const have = petsOf(profile, this.region);
    const rows = Object.entries(PETS)
      .map(([kind, def]) => {
        const q = quotePet(profile, this.region, kind);
        const btn = q.reason === 'max' ? `<span class="owned">${t('✅ Completo')}</span>` : `<button class="btn ${q.ok ? 'buy' : ''} small" data-pet="${kind}" ${q.ok ? '' : 'disabled'}>+1 · ⭐ ${def.cost}</button>`;
        return `<div class="pet-row"><span>${def.icon} ${def.plural}: <b>${have[kind]} / ${def.max}</b></span>${btn}</div>`;
      })
      .join('');
    return `<div class="decor-cat"><h3>${t('🐾 Mascotas')}</h3><p class="chain-help">${t('Andan por el mapa de {region}; de vez en cuando un gato sale detrás de un loro.', { region: REGIONS_BY_ID[this.region].name })}</p>${rows}</div>`;
  }

  decorHtml(profile) {
    const chosen = decorOf(profile, this.region).chosen;
    // Second Willys paint color, shown only if region owns it.
    const has = { willys2: Boolean(this.regionState().willys2) };
    return DECOR.filter((cat) => !cat.requires || has[cat.requires]).map((cat) => {
      const opts = cat.options
        .map((o) => {
          const owned = ownsDecor(profile, cat.id, o.id, this.region);
          const on = (chosen[cat.id] ?? cat.options[0].id) === o.id;
          const can = owned || quoteDecor(profile, cat.id, o.id, this.region).ok;
          const colors = o.colors ?? [o.color];
          const sw = colors.length ? `<span class="sw">${colors.map((c) => `<i style="background:${hex(c)}"></i>`).join('')}</span>` : '<span class="sw">—</span>';
          const tag = on ? '✓' : owned ? t('Usar') : `⭐ ${o.cost}`;
          return `<button class="decor-opt ${on ? 'on' : ''} ${can ? '' : 'cant'}" data-decor="${cat.id}:${o.id}">${sw}<span>${o.name}</span><span>${tag}</span></button>`;
        })
        .join('');
      return `<div class="decor-cat"><h3>${cat.icon} ${cat.name}</h3><div class="decor-opts">${opts}</div></div>`;
    }).join('');
  }
}
