// Toca una pieza de songs.js y la deja en dos arreglos (izquierda y derecha) que se repiten sin
// corte. Las cuerdas son Karplus-Strong: un golpe de ruido que da vueltas por una línea de retardo del
// largo de la nota, y en cada vuelta se suaviza un poco (así suena a cuerda pulsada y se apaga sola).
// Sin Web Audio: se puede probar en Node.
import { createRng } from '../core/rng.js';
import { midi, parseChord } from './songs.js';

const RELEASE = 0.03; // s que tarda en callarse una cuerda que se apaga con la mano

const freqOf = (m) => 440 * 2 ** ((m - 69) / 12);

// La nota más baja con esa clase de altura desde `from` (MIDI).
const above = (pc, from) => from + ((pc - from) % 12 + 12) % 12;

export function createSong(song, sr) {
  const beat = 60 / song.bpm;
  const bar = Math.round(beat * 3 * sr);
  const length = bar * song.chords.length;
  return { song, sr, beat, bar, length, left: new Float32Array(length), right: new Float32Array(length), rng: createRng(1907) };
}

// Una cuerda pulsada. at: s desde el inicio de la pieza (lo que sobra al final suena al empezar la vuelta).
// t60: s en que se apaga sola; bright: 0..1 qué tan metálica; pos: dónde se pulsa (0..0.5).
function pluck(buf, at, freq, dur, { amp = 0.3, t60 = 1.5, bright = 0.5, pan = 0, pos = 0.2 } = {}) {
  const { sr, length, left, right, rng } = buf;
  const delay = sr / freq - 0.5; // el filtro de dos puntos suma media muestra
  const n0 = Math.ceil(delay) + 2;
  const len = Math.ceil((dur + RELEASE) * sr);
  const y = new Float32Array(Math.max(len, n0 + 1));
  // Golpe: ruido suavizado según el brillo y sin la parte que cancela el punto donde se pulsa.
  let v = 0;
  let peak = 0;
  for (let i = 0; i < n0; i++) {
    v += (0.15 + 0.85 * bright) * (rng() * 2 - 1 - v);
    y[i] = v;
  }
  const comb = Math.max(1, Math.round(pos * delay));
  for (let i = n0 - 1; i >= comb; i--) y[i] -= y[i - comb];
  let mean = 0;
  for (let i = 0; i < n0; i++) mean += y[i] / n0;
  for (let i = 0; i < n0; i++) peak = Math.max(peak, Math.abs((y[i] -= mean)));
  for (let i = 0; i < n0; i++) y[i] /= peak || 1;
  // Cada vuelta pierde lo justo para apagarse en t60.
  const g = 10 ** (-3 / (t60 * freq));
  for (let n = n0; n < y.length; n++) {
    const m = n - delay;
    const i = Math.floor(m);
    const f = m - i;
    const a = y[i] + (y[i + 1] - y[i]) * f;
    const b = y[i - 1] + (y[i] - y[i - 1]) * f;
    y[n] = g * 0.5 * (a + b);
  }
  const start = Math.round(at * sr);
  const end = Math.round(dur * sr);
  const gl = amp * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = amp * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let n = 0; n < len; n++) {
    const fade = n < end ? 1 : 1 - (n - end) / (RELEASE * sr);
    const k = (((start + n) % length) + length) % length;
    left[k] += y[n] * fade * gl;
    right[k] += y[n] * fade * gr;
  }
}

// Rasgueo: las cuerdas una tras otra, hacia abajo (de la grave a la aguda) o hacia arriba.
function strum(buf, at, notes, dur, opts, up = false) {
  const list = up ? [...notes].reverse() : notes;
  list.forEach((m, k) => pluck(buf, at + k * 0.012, freqOf(m), dur, opts));
}

// Toca el compás `index`: bajo, guitarra, tiple y melodía.
export function renderBar(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.012;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  // Bajo de la guitarra: la tónica en el primer tiempo y la quinta en el tercero.
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 2.2, { amp: 0.5, t60: 2.5, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(4), freqOf(above((root + 7) % 12, 40)), beat * 1.1, { amp: 0.3, t60: 2, bright: 0.25, pan: -0.15, pos: 0.3 });

  // Guitarra: rasgueo en el segundo y el tercer tiempo.
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  strum(buf, at(2), guitar, beat * 0.9, { amp: 0.16, t60: 1.2, bright: 0.45, pan: -0.35 });
  strum(buf, at(4), guitar, beat * 0.8, { amp: 0.12, t60: 1.2, bright: 0.45, pan: -0.35 });

  // Tiple: golpes cortos y apagados en el contratiempo («y» del dos y del tres). Sus cuerdas van de a
  // tres: dos al unísono (un poco desafinadas entre sí) y la de en medio una octava abajo.
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (const e of [3, 5]) strum(buf, at(e), courses, 0.13, { amp: 0.07, t60: 0.8, bright: 0.8, pan: 0.35, pos: 0.12 }, true);

  // Melodía de bandola: las notas largas, en trémolo.
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    const opts = { amp: 0.32, t60: 1.1, bright: 0.75, pan: 0.1, pos: 0.15 };
    if (n < 3) {
      pluck(buf, at(e), f, n * eighth * 0.95, opts);
      continue;
    }
    const start = t0 + e * eighth;
    const step = eighth / 4;
    const count = Math.floor((n * eighth - 0.04) / step);
    for (let k = 0; k < count; k++) pluck(buf, start + k * step, f, step * 0.9, { ...opts, amp: (k ? 0.22 : 0.32) * (0.9 + rng() * 0.2) });
  }
}

// Toda la pieza de una vez (para las pruebas; el juego la va armando compás por compás).
export function renderSong(song, sr) {
  const buf = createSong(song, sr);
  for (let i = 0; i < song.chords.length; i++) renderBar(buf, i);
  normalize(buf);
  return buf;
}

// Deja el pico en `peak` para que no sature.
export function normalize(buf, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  const k = max ? peak / max : 1;
  for (let i = 0; i < buf.length; i++) {
    buf.left[i] *= k;
    buf.right[i] *= k;
  }
}
