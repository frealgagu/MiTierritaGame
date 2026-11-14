// Icon tooltips (v3.66): tapping an icon inside any game text (panel, chain,
// goals, research…) shows its name above: «Coffee cherry», «Coffee bags», «Coins».
// No per-icon markup needed: hit-tests glyph under pointer and looks up name. Buttons
// still work as usual (tooltips skipped there).
import { PRODUCTS } from '../data/products.js';
import { STATIONS } from '../data/stations.js';
import { REGIONS_BY_ID, REGION_OF_ZONE } from '../data/regions.js';
import { t } from '../i18n/index.js';

// UI icons that aren't products.
const GENERAL = {
  '💰': t('Monedas'),
  '🐴': t('Arrieros (mulas)'),
  '⚡': t('Banda eléctrica'),
  '🚌': t('Ruta entre zonas (chiva)'),
  '📦': t('Bodega'),
  '🚙': t('Willys'),
  '⭐': t('Renombre'),
  '🏆': t('Prestigio: todo el Renombre ganado'),
  '🏅': t('Eventos y medallas'),
  '🥇': t('Medalla de oro'),
  '🥈': t('Medalla de plata'),
  '🥉': t('Medalla de bronce'),
  '🔬': t('Investigaciones'),
  '📋': t('Objetivos'),
  '🔗': t('La cadena'),
  '🗺️': t('Zonas'),
  '🪱': t('Compost: la Finca vende más caro'),
  '⏸️': t('Detenida'),
  '⛔': t('Problema'),
  '↪': t('Se vende sin procesar'),
  '🔒': t('Por abrir'),
  '🚩': t('Zona completa'),
  '🏁': t('Zona al máximo'),
  '⬆': t('Todo al nivel máximo'),
  '⏱': t('Reloj del evento'),
};

const clean = (s) => s.replace(/️/g, '');

// icon -> name. Products first (shared icons show both names), then stations,
// and UI icons last.
export const ICON_NAMES = (() => {
  const names = {};
  const add = (icon, name) => {
    const key = clean(icon);
    if (!key || /^[\p{L}\p{N}\s]+$/u.test(key)) return;
    (names[key] ??= new Set()).add(name);
  };
  // (v5.4) Nothing from a secret region: its names would give it away (its icons are shared with other regions).
  const secret = (zone) => REGIONS_BY_ID[REGION_OF_ZONE[zone]]?.secret;
  for (const p of Object.values(PRODUCTS)) if (!secret(p.zone)) add(p.icon, p.name);
  const fromProducts = new Set(Object.keys(names));
  for (const s of STATIONS) if (!fromProducts.has(clean(s.icon)) && !secret(s.zone)) add(s.icon, s.name);
  for (const [icon, name] of Object.entries(GENERAL)) if (!names[clean(icon)]) add(icon, name);
  return Object.fromEntries(Object.entries(names).map(([k, v]) => [k, [...v].join(' / ')]));
})();

export const iconName = (text) => ICON_NAMES[clean(text)] ?? null;

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
const graphemes = (text) => (segmenter ? [...segmenter.segment(text)].map((s) => ({ text: s.segment, index: s.index })) : [...text].reduce((out, ch) => (out.push({ text: ch, index: (out.at(-1)?.index ?? 0) + (out.at(-1)?.text.length ?? 0) }), out), []));

// Icon located under screen coordinates (x, y): { name, rect } or null.
function iconAt(x, y) {
  let node;
  let offset;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (!p) return null;
    ({ offsetNode: node, offset } = p);
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (!r) return null;
    ({ startContainer: node, startOffset: offset } = r);
  } else return null;
  if (node?.nodeType !== Node.TEXT_NODE) return null;
  const parts = graphemes(node.data);
  // Caret sits between two glyphs: inspect character before and after.
  const near = parts.filter((g) => g.index <= offset && offset <= g.index + g.text.length);
  for (const g of near) {
    const name = iconName(g.text);
    if (!name) continue;
    const range = document.createRange();
    range.setStart(node, g.index);
    range.setEnd(node, g.index + g.text.length);
    for (const rect of range.getClientRects()) {
      if (x >= rect.left - 3 && x <= rect.right + 3 && y >= rect.top - 3 && y <= rect.bottom + 3) return { name, rect };
    }
  }
  return null;
}

export function bindIconTips() {
  const tip = document.createElement('div');
  tip.id = 'icon-tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  let timer = null;
  const hide = () => {
    tip.hidden = true;
    clearTimeout(timer);
  };
  document.addEventListener(
    'click',
    (e) => {
      if (e.target.closest?.('button, a, input, select, textarea, canvas')) return hide();
      const hit = iconAt(e.clientX, e.clientY);
      if (!hit) return hide();
      tip.textContent = hit.name;
      tip.hidden = false;
      // Above icon (or below if clipped), keeping within screen bounds.
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      const left = Math.min(Math.max(6, hit.rect.left + hit.rect.width / 2 - w / 2), window.innerWidth - w - 6);
      const top = hit.rect.top - h - 6 < 6 ? hit.rect.bottom + 6 : hit.rect.top - h - 6;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      clearTimeout(timer);
      timer = setTimeout(hide, 2200);
    },
    true,
  );
  window.addEventListener('scroll', hide, true);
}
