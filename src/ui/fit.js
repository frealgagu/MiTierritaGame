// Panels use fixed sizing: if text overflows its box, shrink font size
// (down to `min` of base size) instead of expanding the box and shifting layout.
export function fit(el, min = 0.7) {
  if (!el) return;
  const over = () => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  if (el.style.fontSize) el.style.fontSize = '';
  if (!el.clientWidth || !over()) return; // hidden, or already fits
  const base = parseFloat(getComputedStyle(el).fontSize);
  for (let k = 0.95; k >= min - 1e-9 && over(); k -= 0.05) el.style.fontSize = `${base * k}px`;
}

// Updates text and, if changed, refits it to its box.
export function setFitted(el, text, min) {
  if (el.textContent === text) return;
  el.textContent = text;
  fit(el, min);
}
