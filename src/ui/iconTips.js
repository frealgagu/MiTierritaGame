// Nombres de los íconos (v3.66): al tocar un ícono en cualquier texto del juego (el panel, la cadena, los
// objetivos, las investigaciones…) aparece encima su nombre: «Cereza de café», «Bolsas de café», «Monedas».
// No hace falta marcar cada ícono: se mira qué letra quedó bajo el dedo y se busca en la lista. Los botones
// siguen funcionando como siempre (ahí no sale el nombre).
import { PRODUCTS } from '../data/products.js';
import { STATIONS } from '../data/stations.js';

// Los íconos de la interfaz que no son productos.
const GENERAL = {
  '💰': 'Monedas',
  '🐴': 'Arrieros (mulas)',
  '⚡': 'Banda eléctrica',
  '🚌': 'Ruta entre zonas (chiva)',
  '📦': 'Bodega',
  '🚙': 'Willys',
  '⭐': 'Renombre',
  '🏅': 'Eventos y medallas',
  '🥇': 'Medalla de oro',
  '🥈': 'Medalla de plata',
  '🥉': 'Medalla de bronce',
  '🔬': 'Investigaciones',
  '📋': 'Objetivos',
  '🔗': 'La cadena',
  '🗺️': 'Zonas',
  '🪱': 'Compost: la Finca vende más caro',
  '⏸️': 'Detenida',
  '⛔': 'Problema',
  '↪️': 'Se vende sin procesar',
  '🔒': 'Por abrir',
  '🏁': 'Zona completa',
};

const clean = (s) => s.replace(/️/g, '');

// ícono -> nombre. Primero los productos (si dos comparten ícono, los dos nombres), luego las estaciones
// y al final los de la interfaz.
export const ICON_NAMES = (() => {
  const names = {};
  const add = (icon, name) => {
    const key = clean(icon);
    if (!key || /^[\p{L}\p{N}\s]+$/u.test(key)) return;
    (names[key] ??= new Set()).add(name);
  };
  for (const p of Object.values(PRODUCTS)) add(p.icon, p.name);
  const fromProducts = new Set(Object.keys(names));
  for (const s of STATIONS) if (!fromProducts.has(clean(s.icon))) add(s.icon, s.name);
  for (const [icon, name] of Object.entries(GENERAL)) if (!names[clean(icon)]) add(icon, name);
  return Object.fromEntries(Object.entries(names).map(([k, v]) => [k, [...v].join(' / ')]));
})();

export const iconName = (text) => ICON_NAMES[clean(text)] ?? null;

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
const graphemes = (text) => (segmenter ? [...segmenter.segment(text)].map((s) => ({ text: s.segment, index: s.index })) : [...text].reduce((out, ch) => (out.push({ text: ch, index: (out.at(-1)?.index ?? 0) + (out.at(-1)?.text.length ?? 0) }), out), []));

// El ícono que quedó bajo el punto (x, y) de la pantalla: { name, rect } o null.
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
  // El cursor queda entre dos letras: se mira la de antes y la de después.
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
      // Encima del ícono (o debajo si no cabe), sin salirse de la pantalla.
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
