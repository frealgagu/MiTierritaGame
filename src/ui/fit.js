// Los paneles tienen tamaño fijo: si un texto no cabe en su caja, se achica la letra
// (hasta `min` del tamaño normal) en vez de agrandar la caja y mover lo demás.
export function fit(el, min = 0.7) {
  if (!el) return;
  const over = () => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  if (el.style.fontSize) el.style.fontSize = '';
  if (!el.clientWidth || !over()) return; // oculto, o ya cabe
  const base = parseFloat(getComputedStyle(el).fontSize);
  for (let k = 0.95; k >= min - 1e-9 && over(); k -= 0.05) el.style.fontSize = `${base * k}px`;
}

// Cambia el texto y, si cambió, vuelve a ajustarlo a su caja.
export function setFitted(el, text, min) {
  if (el.textContent === text) return;
  el.textContent = text;
  fit(el, min);
}
