// «Ver más» (v3.67.5): en una pantalla pequeña, un texto largo (la explicación de los eventos, la
// presentación de cada uno) tapaba lo de abajo. Se muestra en pocas líneas, con «Ver más ▾» para leerlo
// completo y «Ver menos ▴» para recogerlo. El botón solo aparece si el texto no cabe.
//   <p class="clamp" style="--lines: 3">…</p><button class="more-btn" type="button" hidden>Ver más ▾</button>
const LABEL = { more: 'Ver más ▾', less: 'Ver menos ▴' };

export const moreButton = () => `<button class="more-btn" type="button" hidden>${LABEL.more}</button>`;

// Muestra u oculta los botones de los textos que hay dentro de `root`, según quepan o no. El texto tiene
// que estar a la vista (escondido no se puede medir).
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
  // Los que vienen en la página: se revisan cuando cambian de tamaño (al abrirse su ventana, al girar el
  // teléfono).
  if (typeof ResizeObserver === 'undefined') return;
  const watch = new ResizeObserver((entries) => {
    for (const entry of entries) refreshMore(entry.target.parentElement);
  });
  for (const el of document.querySelectorAll('.clamp')) watch.observe(el);
}
