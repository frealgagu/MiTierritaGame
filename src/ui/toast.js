// Top-of-screen toasts. Zone character speech (`speech`, v3.3.2) lasts proportional to
// text length; a brief notice interrupts on top and resumes the remaining speech duration
// afterward; queued speech waits its turn (up to three queued). Tapping toast closes it (in
// v3.67.1 taps passed through, making it impossible to dismiss over a modal).
const MS_PER_CHAR = 75; // roughly 13 chars per second, plus 3 s lead-in to start reading
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

// Next up: speech interrupted by a brief notice, or next in queue.
function next() {
  const item = current?.resume ?? queue.shift();
  current = null;
  clearTimeout(timer);
  if (item) show(item);
  else element().hidden = true;
}

// now (v3.12): show immediately without waiting in queue (line spoken when tapping someone on map).
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
