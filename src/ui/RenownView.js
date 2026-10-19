// Ventana del Renombre ⭐ (v2.2): el álbum de láminas (se pega la que uno elija) y la decoración.
import { ALBUM, PAGE_BONUS } from '../data/album.js';
import { DECOR } from '../data/decor.js';
import { buySticker, ownsDecor, pageDone, pickDecor, profileOf, quoteDecor, quoteSticker } from '../sim/renown.js';
import { toast } from './toast.js';
import { LOGROS } from '../data/logros.js';
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
    this.page = ALBUM[0].id;
    document.getElementById('renown-close').addEventListener('click', () => (this.modal.hidden = true));
    for (const btn of this.modal.querySelectorAll('[data-renown-tab]')) {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.renownTab;
        this.render();
      });
    }
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
    });
  }

  open(tab) {
    this.tab = tab;
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

  decorate(cat, opt) {
    const profile = profileOf(this.game.state);
    if (!pickDecor(profile, cat, opt)) return;
    this.onDecor(profile);
    this.render();
  }

  render() {
    const profile = profileOf(this.game.state);
    document.getElementById('renown-title').textContent = `⭐ Renombre: ${profile.renown}`;
    for (const btn of this.modal.querySelectorAll('[data-renown-tab]')) btn.classList.toggle('active', btn.dataset.renownTab === this.tab);
    const help = document.getElementById('renown-help');
    if (this.tab === 'album') {
      help.textContent = `Cada lámina cuesta Renombre y tú eliges cuál pegar. Al llenar una página ganas ${PAGE_BONUS} ⭐ de premio.`;
      this.body.innerHTML = this.albumHtml(profile);
    } else if (this.tab === 'logros') {
      help.textContent = 'Los logros suman entre partidas: lo de antes de volver a empezar también cuenta. Cada nivel da Renombre.';
      this.body.innerHTML = this.logrosHtml();
    } else {
      help.textContent = 'Lo de siempre es gratis; lo demás se compra una vez con Renombre y se puede cambiar cuando quieras. Es solo para que se vea bonito.';
      this.body.innerHTML = this.decorHtml(profile);
    }
  }

  albumHtml(profile) {
    const pages = ALBUM.map((pg) => `<button data-page="${pg.id}" class="${pg.id === this.page ? 'on' : ''} ${pageDone(profile, pg.id) ? 'full' : ''}" title="${pg.name}">${pg.icon}</button>`).join('');
    const page = ALBUM.find((pg) => pg.id === this.page);
    const have = page.stickers.filter((s) => profile.album.includes(s.id)).length;
    const cards = page.stickers
      .map((s) => {
        if (profile.album.includes(s.id)) return `<div class="sticker"><div class="big">${s.icon}</div><b>${s.name}</b><p>${s.text}</p></div>`;
        const q = quoteSticker(profile, s.id);
        return `<div class="sticker empty"><div class="big">${s.icon}</div><b>${s.name}</b><button class="btn ${q.ok ? 'buy' : ''}" data-sticker="${s.id}" ${q.ok ? '' : 'disabled'}>Pegar · ⭐ ${s.cost}</button></div>`;
      })
      .join('');
    return `<div class="album-pages">${pages}</div><div class="album-head"><span>${page.icon} ${page.name}</span><span>${have} / ${page.stickers.length}${have === page.stickers.length ? ' ✅' : ` · llena: +${PAGE_BONUS} ⭐`}</span></div><div class="album-grid">${cards}</div>`;
  }

  logrosHtml() {
    const s = this.game.state;
    const done = profileOf(s).logros ?? {};
    return LOGROS.map((l) => {
      const value = metric(s, l.metric);
      const tier = Math.max(done[l.id] ?? 0, tierOf(l, value));
      const stars = l.tiers.map((_, k) => (k < tier ? '★' : '☆')).join('');
      const next = l.tiers[tier];
      const n = (x) => formatNumber(Math.floor(x));
      const line = next === undefined ? '✅ Completo' : `${l.text.replace('{n}', n(next))} · ${n(Math.min(value, next))} / ${n(next)} · +${l.reward[tier]} ⭐`;
      const pct = next === undefined ? 100 : (100 * Math.min(value, next)) / next;
      return `<div class="logro"><div class="logro-head"><b>${l.icon} ${l.name}</b><span class="logro-stars">${stars}</span></div><p>${line}</p><div class="bar"><div style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  decorHtml(profile) {
    const chosen = profile.decor.chosen;
    return DECOR.map((cat) => {
      const opts = cat.options
        .map((o) => {
          const owned = ownsDecor(profile, cat.id, o.id);
          const on = (chosen[cat.id] ?? cat.options[0].id) === o.id;
          const can = owned || quoteDecor(profile, cat.id, o.id).ok;
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
