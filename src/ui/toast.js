// Avisos en lo alto de la pantalla. Lo que dice la persona de una zona (`speech`, v3.3.2) dura según lo
// largo del texto; un aviso corto que llega encima se muestra y después vuelve el comentario con lo que
// le quedaba; otro comentario espera su turno (como mucho tres en fila). Tocar el aviso lo cierra.
const MS_PER_CHAR = 75; // unas 13 letras por segundo, más 3 s para empezar a leer
const MAX_QUEUE = 3;

export const readingTime = (text, ms = 0) => Math.max(ms, 3000 + text.length * MS_PER_CHAR);

let timer = null;
let current = null; // { text, ms, speech, until, resume }
const queue = [];

function element() {
  const el = document.getElementById('toast');
  if (!el.dataset.ready) {
    el.dataset.ready = '1';
    el.addEventListener('click', next);
  }
  return el;
}

function show(item) {
  const el = element();
  el.textContent = item.text;
  el.hidden = false;
  item.until = Date.now() + item.ms;
  current = item;
  clearTimeout(timer);
  timer = setTimeout(next, item.ms);
}

// Lo siguiente: el comentario que tapó un aviso corto o, si no, el próximo en fila.
function next() {
  const item = current?.resume ?? queue.shift();
  current = null;
  clearTimeout(timer);
  if (item) show(item);
  else element().hidden = true;
}

// now (v3.12): se muestra ya, sin esperar turno (lo que dice una persona al tocarla en el mapa).
export function toast(text, ms = 3500, { speech = false, now = false } = {}) {
  if (speech && now) {
    show({ text, ms: readingTime(text, ms), speech: true });
    return;
  }
  if (speech) {
    const item = { text, ms: readingTime(text, ms), speech: true };
    if (current?.speech || current?.resume) {
      queue.push(item);
      if (queue.length > MAX_QUEUE) queue.shift();
    } else show(item);
    return;
  }
  const item = { text, ms };
  if (current?.speech) item.resume = { ...current, ms: Math.max(3000, current.until - Date.now()) };
  else if (current?.resume) item.resume = current.resume;
  show(item);
}
