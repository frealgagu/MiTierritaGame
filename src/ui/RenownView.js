// Ventana del Renombre ⭐ (v2.2): el álbum de láminas (se pega la que uno elija) y la decoración.
// Desde la v3.10 el álbum, la decoración, los logros y la jornada son de cada región: arriba se elige
// cuál se ve (empieza en la que se está jugando). El Renombre y las horas sin conexión son del jugador.
import { PAGE_BONUS, albumOf } from '../data/album.js';
import { DECOR } from '../data/decor.js';
import { OFFLINE_COSTS, OFFLINE_STEP_HOURS, WORK_COSTS, albumDone, decorOf, buyOffline, buyWillys2, buyWork, quoteWillys2, quoteWork, workLevel, buySticker, offlineHours, offlineLevel, ownsDecor, pageDone, pickDecor, profileOf, quoteDecor, quoteOffline, quoteSticker } from '../sim/renown.js';
import { EXTRA_BLOCKS, workBlocks } from '../sim/calendar.js';
import { workText } from './calendar.js';
import { openRegionStates, regionState } from '../sim/regions.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { toast } from './toast.js';
import { logrosOf } from '../data/logros.js';
import { metric, tierOf } from '../sim/logros.js';
import { formatNumber } from '../core/format.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

export class RenownView {
  // onDecor: la decoración cambió (hay que redibujar el mapa).
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
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) return void (this.modal.hidden = true);
      const reg = e.target.closest('[data-renown-region]');
      if (reg) {
        this.region = reg.dataset.renownRegion;
        return this.render();
      }
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
        toast(`⏰ Ahora todo sigue produciendo ${offlineHours(profileOf(this.game.state))} h mientras no juegas.`, 3500);
        this.render();
      }
      const w2 = e.target.closest('[data-willys2]');
      if (w2) this.buyJeep(w2.dataset.willys2);
      if (e.target.closest('[data-work]') && buyWork(profileOf(this.game.state), this.regionState())) {
        toast(`🕐 En ${REGIONS_BY_ID[this.region].name} ahora se trabaja de ${workText(workBlocks(workLevel(this.regionState())))}.`, 3500);
        this.render();
      }
    });
  }

  // La partida de la región que se ve en la ventana.
  regionState() {
    return regionState(this.game.state, this.region) ?? this.game.state;
  }

  // region: la que se está jugando (con la que abre la ventana).
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
    if (r.bonus) toast(`📖 ¡Página llena! +${r.bonus} ⭐ de Renombre`, 3500);
    this.render();
  }

  // El segundo Willys de una región (v3.9): la carretera se amplía, así que se vuelve a dibujar el mapa.
  buyJeep(regionId) {
    const profile = profileOf(this.game.state);
    if (!buyWillys2(profile, regionState(this.game.state, regionId))) return;
    toast(`🚙 ¡Segundo Willys para ${REGIONS_BY_ID[regionId].name}! Cada zona tiene ahora dos: el despacho vende el doble.`, 4500);
    this.onDecor(profile);
    this.render();
  }

  // Arriba del álbum: el segundo Willys de la región, que se compra con su álbum lleno.
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
      ? 'Cada zona de la región tiene un segundo Willys, por su propio carril: el despacho vende el doble. Se pinta aparte en Decoración.'
      : `Llena este álbum (${have} / ${total} láminas) para comprar un segundo Willys en ${region.name}: el despacho vende el doble.`;
    return `<div class="logro willys2"><div class="logro-head"><b>🚙 Segundo Willys</b></div><p>${text}</p><div class="willys2-btns">${button}</div></div>`;
  }

  decorate(cat, opt) {
    const profile = profileOf(this.game.state);
    if (!pickDecor(profile, cat, opt, this.region)) return;
    this.onDecor(profile);
    this.render();
  }

  render() {
    const profile = profileOf(this.game.state);
    document.getElementById('renown-title').textContent = `⭐ Renombre: ${profile.renown}`;
    // El Prestigio (v3.11): todo el Renombre ganado, aunque ya se haya gastado.
    document.getElementById('renown-total').textContent = `🏆 Prestigio: ${formatNumber(profile.renownTotal ?? profile.renown)} ⭐ (todo el Renombre que has ganado)`;
    for (const btn of this.modal.querySelectorAll('[data-renown-tab]')) btn.classList.toggle('active', btn.dataset.renownTab === this.tab);
    // La región que se ve (con más de una abierta).
    const open = openRegionStates(this.game.state);
    this.regions.hidden = open.length < 2;
    this.regions.innerHTML = open.map(({ region }) => `<button class="${region.id === this.region ? 'on' : ''}" data-renown-region="${region.id}">${region.icon} ${region.name}</button>`).join('');
    const help = document.getElementById('renown-help');
    if (this.tab === 'album') {
      help.textContent = `Cada región tiene su álbum. Cada lámina cuesta Renombre y tú eliges cuál pegar; al llenar una página ganas ${PAGE_BONUS} ⭐.`;
      this.body.innerHTML = this.albumHtml(profile);
    } else if (this.tab === 'offline') {
      help.textContent = 'La jornada es de cada región; las horas sin conexión valen para todas. Nada de esto se pierde al volver a empezar.';
      this.body.innerHTML = this.workHtml(profile) + this.offlineHtml(profile);
    } else if (this.tab === 'logros') {
      help.textContent = 'Cada región tiene sus logros. Suman entre partidas: lo de antes de volver a empezar también cuenta. Cada nivel da Renombre.';
      this.body.innerHTML = this.logrosHtml();
    } else {
      help.textContent = 'Cada región se decora aparte. Lo de siempre es gratis; lo demás se compra una vez con Renombre y se puede cambiar cuando quieras.';
      this.body.innerHTML = this.decorHtml(profile);
    }
  }

  albumHtml(profile) {
    const album = albumOf(this.region);
    if (!album.some((pg) => pg.id === this.page)) this.page = album[0].id;
    const pages = album.map((pg) => `<button data-page="${pg.id}" class="${pg.id === this.page ? 'on' : ''} ${pageDone(profile, pg.id) ? 'full' : ''}" title="${pg.name}">${pg.icon}</button>`).join('');
    const page = album.find((pg) => pg.id === this.page);
    const have = page.stickers.filter((s) => profile.album.includes(s.id)).length;
    const cards = page.stickers
      .map((s) => {
        if (profile.album.includes(s.id)) return `<div class="sticker"><div class="big">${s.icon}</div><b>${s.name}</b><p>${s.text}</p></div>`;
        const q = quoteSticker(profile, s.id);
        return `<div class="sticker empty"><div class="big">${s.icon}</div><b>${s.name}</b><button class="btn ${q.ok ? 'buy' : ''}" data-sticker="${s.id}" ${q.ok ? '' : 'disabled'}>Pegar · ⭐ ${s.cost}</button></div>`;
      })
      .join('');
    return `${this.willysHtml(profile)}<div class="album-pages">${pages}</div><div class="album-head"><span>${page.icon} ${page.name}</span><span>${have} / ${page.stickers.length}${have === page.stickers.length ? ' ✅' : ` · llena: +${PAGE_BONUS} ⭐`}</span></div><div class="album-grid">${cards}</div>`;
  }

  logrosHtml() {
    const profile = profileOf(this.game.state);
    const s = this.regionState();
    const done = profile.logros ?? {};
    return logrosOf(this.region).map((l) => {
      const value = metric(s, l.metric, profile);
      const tier = Math.max(done[l.id] ?? 0, tierOf(l, value));
      const stars = l.tiers.map((_, k) => (k < tier ? '★' : '☆')).join('');
      const next = l.tiers[tier];
      const n = (x) => formatNumber(Math.floor(x));
      const line = next === undefined ? '✅ Completo' : `${l.text.replace('{n}', n(next))} · ${n(Math.min(value, next))} / ${n(next)} · +${l.reward[tier]} ⭐`;
      const pct = next === undefined ? 100 : (100 * Math.min(value, next)) / next;
      return `<div class="logro"><div class="logro-head"><b>${l.icon} ${l.name}</b><span class="logro-stars">${stars}</span></div><p>${line}</p><div class="bar"><div style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  // La jornada (v3.8): de 12 h a 24 h, con bloques de 2 h que cuestan cada uno el doble del anterior.
  workHtml(profile) {
    const level = workLevel(this.regionState());
    const hours = 12 + 2 * level;
    const steps = WORK_COSTS.map((_, k) => (k < level ? '★' : '☆')).join('');
    const q = quoteWork(profile, this.regionState());
    const [a, b] = EXTRA_BLOCKS[level] ?? [];
    const next = q.reason === 'max'
      ? '<p>✅ Al máximo: se trabaja las 24 horas.</p>'
      : `<button class="btn buy" data-work ${q.ok ? '' : 'disabled'}>+2 h (de ${a}:00 a ${b % 24}:00) · ⭐ ${q.cost}</button>`;
    return `<div class="logro"><div class="logro-head"><b>🕐 Jornada en ${REGIONS_BY_ID[this.region].name}: ${hours} h</b><span class="logro-stars">${steps}</span></div>
      <p>Se trabaja de ${workText(workBlocks(level))}. Fuera de la jornada las estaciones descansan.</p>
      <div class="bar"><div style="width:${(100 * hours) / 24}%"></div></div>${next}</div>`;
  }

  // Horas sin conexión (v3.7): de 2 h a 24 h, 2 h por nivel.
  offlineHtml(profile) {
    const level = offlineLevel(profile);
    const hours = offlineHours(profile);
    const max = 2 + OFFLINE_STEP_HOURS * OFFLINE_COSTS.length;
    const steps = OFFLINE_COSTS.map((_, k) => (k < level ? '★' : '☆')).join('');
    const q = quoteOffline(profile);
    const next = q.reason === 'max'
      ? '<p>✅ Al máximo: 24 h.</p>'
      : `<button class="btn buy" data-offline ${q.ok ? '' : 'disabled'}>+${OFFLINE_STEP_HOURS} h (hasta ${hours + OFFLINE_STEP_HOURS} h) · ⭐ ${q.cost}</button>`;
    return `<div class="logro"><div class="logro-head"><b>⏰ Sin conexión: ${hours} h</b><span class="logro-stars">${steps}</span></div>
      <p>Al volver, se suma lo que todas tus regiones produjeron hasta ${hours} h (máximo ${max} h).</p>
      <div class="bar"><div style="width:${(100 * hours) / max}%"></div></div>${next}</div>`;
  }

  decorHtml(profile) {
    const chosen = decorOf(profile, this.region).chosen;
    // El color del segundo Willys, solo si la región ya lo tiene.
    const has = { willys2: Boolean(this.regionState().willys2) };
    return DECOR.filter((cat) => !cat.requires || has[cat.requires]).map((cat) => {
      const opts = cat.options
        .map((o) => {
          const owned = ownsDecor(profile, cat.id, o.id, this.region);
          const on = (chosen[cat.id] ?? cat.options[0].id) === o.id;
          const can = owned || quoteDecor(profile, cat.id, o.id, this.region).ok;
          const colors = o.colors ?? [o.color];
          const sw = colors.length ? `<span class="sw">${colors.map((c) => `<i style="background:${hex(c)}"></i>`).join('')}</span>` : '<span class="sw">—</span>';
          const tag = on ? '✓' : owned ? 'Usar' : `⭐ ${o.cost}`;
          return `<button class="decor-opt ${on ? 'on' : ''} ${can ? '' : 'cant'}" data-decor="${cat.id}:${o.id}">${sw}<span>${o.name}</span><span>${tag}</span></button>`;
        })
        .join('');
      return `<div class="decor-cat"><h3>${cat.icon} ${cat.name}</h3><div class="decor-opts">${opts}</div></div>`;
    }).join('');
  }
}
