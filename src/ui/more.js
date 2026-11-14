// «See more» (v3.67.5): on small screens, long text (event rules, event
// intros) covered content below. Clamps to a few lines with «See more ▾» to expand
// and «See less ▴» to collapse. Button appears only if text overflows.
//   <p class="clamp" style="--lines: 3">…</p><button class="more-btn" type="button" hidden>See more ▾</button>
import { t } from '../i18n/index.js';

const LABEL = { more: t('Ver más ▾'), less: t('Ver menos ▴') };

export const moreButton = () => `<button class="more-btn" type="button" hidden>${LABEL.more}</button>`;

// Shows or hides toggle buttons for clamped texts inside `root`, depending on overflow. Text must
// be visible (hidden elements can't be measured).
export function refreshMore(root) {
  for (const el of root.querySelectorAll('.clamp')) {
    const btn = el.nextElementSibling;
    if (!btn?.classList.contains('more-btn')) continue;
    btn.hidden = !el.classList.contains('open') && el.scrollHeight <= el.clientHeight + 1;
  }
}

export function bindMore() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.more-btn');
    if (!btn) return;
    const open = btn.previousElementSibling.classList.toggle('open');
    btn.textContent = open ? LABEL.less : LABEL.more;
  });
  // Static ones on page: recheck on resize (opening modal, rotating phone).
  // Defer to next frame so layout isn't mutated inside the same ResizeObserver pass.
  if (typeof ResizeObserver === 'undefined') return;
  // Defer to next frame so layout isn't mutated inside the same ResizeObserver pass.
  let raf = 0;
  const pending = new Set();
  const watch = new ResizeObserver((entries) => {
    for (const entry of entries) if (entry.target.parentElement) pending.add(entry.target.parentElement);
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const roots = [...pending];
      pending.clear();
      for (const root of roots) refreshMore(root);
    });
  });
  for (const el of document.querySelectorAll('.clamp')) watch.observe(el);
}
