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
  const bar = Math.round(beat * (song.beats ?? 3) * sr);
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

// Suma un sonido hecho muestra a muestra (fn(s desde el golpe) → valor) desde `at`, con paneo.
function add(buf, at, dur, pan, fn) {
  const { sr, length, left, right } = buf;
  const start = Math.round(at * sr);
  const len = Math.ceil(dur * sr);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let n = 0; n < len; n++) {
    const v = fn(n / sr);
    const k = (((start + n) % length) + length) % length;
    left[k] += v * gl;
    right[k] += v * gr;
  }
}

// Tambor: un tono que cae de f0 a f1 y se apaga en `decay` s, con un poco de golpe de cuero (ruido).
function drum(buf, at, f0, f1, decay, amp, pan, slap = 0.2) {
  const { rng } = buf;
  let phase = 0;
  const sr = buf.sr;
  add(buf, at, decay * 4, pan, (t) => {
    phase += (2 * Math.PI * (f1 + (f0 - f1) * Math.exp(-t * 30))) / sr;
    const env = Math.exp(-t / decay);
    return amp * env * (Math.sin(phase) + slap * (rng() * 2 - 1) * Math.exp(-t * 60));
  });
}

// Guacharaca: el raspado de la caña con el trinche, ruido agudo que vibra con las estrías.
function scrape(buf, at, dur, amp, pan) {
  const { rng } = buf;
  let last = 0;
  add(buf, at, dur, pan, (t) => {
    const noise = rng() * 2 - 1;
    const hi = noise - last; // quita los graves
    last = noise;
    const ridges = 0.55 + 0.45 * Math.sin(2 * Math.PI * 90 * t);
    const env = Math.min(1, t / 0.008) * (1 - t / dur);
    return amp * hi * ridges * env;
  });
}

// Gaita (o millo): un tono soplado, con armónicos suaves, vibrato y algo de aire.
function blow(buf, at, freq, dur, amp, pan) {
  const { rng } = buf;
  const sr = buf.sr;
  let phase = 0;
  add(buf, at, dur + 0.05, pan, (t) => {
    const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.25);
    phase += (2 * Math.PI * freq * vib) / sr;
    const env = Math.min(1, t / 0.035) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.05));
    const tone = Math.sin(phase) + 0.3 * Math.sin(2 * phase) + 0.12 * Math.sin(3 * phase);
    return amp * env * (tone + 0.08 * (rng() * 2 - 1));
  });
}

// Compás de cumbia (4/4, corcheas 0 a 7): bajo, golpes de guitarra en el contratiempo, gaita,
// guacharaca, llamador, tambora y tambor alegre.
function renderCumbia(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.01;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  // Bajo: tónica, tónica, quinta y tónica, a saltos.
  const low = above(root, 36);
  const fifth = above((root + 7) % 12, 36);
  for (const [e, m, n] of [[0, low, 1.6], [3, low, 0.9], [4, fifth, 1.6], [6, low, 0.9]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.42, t60: 1.5, bright: 0.2, pan: -0.1, pos: 0.3 });
  }
  // Guitarra: golpes cortos en cada contratiempo.
  const chord = tones.map((pc) => above(pc, 57)).sort((a, b) => a - b);
  for (const e of [1, 3, 5, 7]) strum(buf, at(e), chord, eighth * 0.55, { amp: 0.08, t60: 0.6, bright: 0.6, pan: -0.35 }, e % 4 === 3);
  // Guacharaca: largo en el tiempo, corto en el contratiempo («chu-ku, chu-ku»).
  for (let e = 0; e < 8; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.45 : 0.85), e % 2 ? 0.05 : 0.08, 0.45);
  // Llamador en el dos y el cuatro; tambora en el uno y el tres.
  for (const e of [2, 6]) drum(buf, at(e), 260, 190, 0.07, 0.22, 0.25, 0.35);
  for (const e of [0, 4]) drum(buf, at(e), 120, 70, 0.14, 0.38, -0.2, 0.15);
  // Tambor alegre: repica a su gusto.
  for (const e of [1, 3, 5, 7]) if (rng() < 0.55) drum(buf, at(e) + (rng() < 0.3 ? eighth / 2 : 0), 330, 280, 0.05, 0.16 + rng() * 0.08, 0.3, 0.5);
  // Gaita.
  for (const [e, n, note] of song.melody[index] ?? []) blow(buf, at(e), freqOf(midi(note)), n * eighth * 0.92, 0.2, 0.05);
}

// Compás de torbellino (3/4, corcheas 0 a 5): bajo, guitarra en el dos y el tres, el tiple rasgueando cada
// corchea, el requinto punteando la melodía y el chucho marcando el pulso.
function renderTorbellino(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.01;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  pluck(buf, at(0), freqOf(above(root, 40)), beat * 1.6, { amp: 0.45, t60: 2, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(4), freqOf(above((root + 7) % 12, 40)), beat * 0.9, { amp: 0.3, t60: 1.6, bright: 0.25, pan: -0.15, pos: 0.3 });
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  for (const e of [2, 4]) strum(buf, at(e), guitar, beat * 0.7, { amp: 0.13, t60: 1, bright: 0.45, pan: -0.35 });
  // El tiple: tres cuerdas por orden, rasgueo de abajo arriba y de arriba abajo en cada corchea.
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (let e = 0; e < 6; e++) strum(buf, at(e), courses, eighth * 0.7, { amp: e % 2 ? 0.045 : 0.065, t60: 0.7, bright: 0.8, pan: 0.35, pos: 0.12 }, e % 2 === 1);
  // El chucho (maraca de guadua): largo en el tiempo, corto en el contratiempo.
  for (let e = 0; e < 6; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.35 : 0.7), e % 2 ? 0.035 : 0.06, 0.5);
  // El requinto: notas punteadas, brillantes.
  for (const [e, n, note] of song.melody[index] ?? []) {
    pluck(buf, at(e), freqOf(midi(note)), n * eighth * 0.92, { amp: 0.3, t60: 0.9, bright: 0.85, pan: 0.1, pos: 0.13 });
  }
}

// Compás de joropo (3/4 rápido, corcheas 0 a 5): el bajo con sus bordones, el cuatro rasgueando cada corchea
// con los golpes apagados (el «chasquido»), las maracas sin parar y el arpa en la melodía, con la mano
// izquierda doblando una octava abajo.
function renderJoropo(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  const low = above(root, 40);
  const fifth = above((root + 7) % 12, 40);
  for (const [e, m, n] of [[0, low, 1.6], [3, fifth, 0.9], [4, low + 12, 0.9]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.4, t60: 1.4, bright: 0.3, pan: -0.15, pos: 0.25 });
  }
  // El cuatro: cuatro cuerdas en el registro medio; abierto en el uno y en el «y» del dos, apagado en el dos y
  // en el «y» del tres.
  const cuatro = tones.slice(0, 4).map((pc) => above(pc, 59)).sort((a, b) => a - b);
  for (let e = 0; e < 6; e++) {
    const muted = e === 2 || e === 5;
    strum(buf, at(e), cuatro, eighth * (muted ? 0.25 : 0.75), { amp: muted ? 0.05 : e === 0 || e === 3 ? 0.085 : 0.06, t60: muted ? 0.15 : 0.7, bright: 0.7, pan: 0.3, pos: 0.15 }, e % 2 === 1);
  }
  // Las maracas: semicorcheas, más fuertes en el uno y en el «y» del dos.
  for (let k = 0; k < 12; k++) scrape(buf, at(k / 2), eighth * 0.4, k === 0 || k === 6 ? 0.07 : k % 2 ? 0.025 : 0.045, k % 2 ? -0.45 : 0.45);
  // El arpa.
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    pluck(buf, at(e), f, n * eighth * 0.95, { amp: 0.28, t60: 1.3, bright: 0.8, pan: 0.05, pos: 0.18 });
    if (e % 3 === 0) pluck(buf, at(e) + 0.004, f / 2, n * eighth * 0.95, { amp: 0.12, t60: 1.3, bright: 0.6, pan: -0.05, pos: 0.18 });
  }
}

// Clarinete (v3.38): caña, con los armónicos impares más fuertes, un ataque corto y un vibrato leve.
function reed(buf, at, freq, dur, amp, pan) {
  const { rng } = buf;
  const sr = buf.sr;
  let phase = 0;
  add(buf, at, dur + 0.04, pan, (t) => {
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.2);
    phase += (2 * Math.PI * freq * vib) / sr;
    const env = Math.min(1, t / 0.02) * (t < dur ? 1 - 0.15 * Math.min(1, t / 0.4) : Math.max(0, 1 - (t - dur) / 0.04));
    const tone = Math.sin(phase) + 0.42 * Math.sin(3 * phase) + 0.2 * Math.sin(5 * phase) + 0.08 * Math.sin(7 * phase) + 0.05 * Math.sin(2 * phase);
    return amp * env * (tone + 0.03 * (rng() * 2 - 1));
  });
}

// Bombardino (v3.38): metal grave y redondo, con los armónicos pares, que se infla al entrar.
function brass(buf, at, freq, dur, amp, pan) {
  const sr = buf.sr;
  let phase = 0;
  add(buf, at, dur + 0.05, pan, (t) => {
    phase += (2 * Math.PI * freq) / sr;
    const env = Math.min(1, t / 0.03) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.05));
    const bright = 0.35 + 0.3 * Math.exp(-t * 8);
    return amp * env * (Math.sin(phase) + bright * Math.sin(2 * phase) + bright * 0.5 * Math.sin(3 * phase) + 0.1 * Math.sin(4 * phase));
  });
}

// Redoblante: el golpe del parche con el ruido de los bordones.
function snare(buf, at, amp, pan) {
  const { rng } = buf;
  const sr = buf.sr;
  let phase = 0;
  let last = 0;
  add(buf, at, 0.16, pan, (t) => {
    phase += (2 * Math.PI * 190) / sr;
    const noise = rng() * 2 - 1;
    const hi = noise - last * 0.6;
    last = noise;
    return amp * (0.5 * Math.sin(phase) * Math.exp(-t * 40) + hi * Math.exp(-t * 22));
  });
}

// Platillos: el choque de los dos, ruido muy agudo que se apaga despacio.
function cymbal(buf, at, amp, pan, decay = 0.25) {
  const { rng } = buf;
  let a = 0;
  let b = 0;
  add(buf, at, decay * 3, pan, (t) => {
    const noise = rng() * 2 - 1;
    const hi = noise - 2 * a + b; // segunda diferencia: solo lo agudo
    b = a;
    a = noise;
    return amp * 0.35 * hi * Math.exp(-t / decay) * (1 + 0.3 * Math.sin(2 * Math.PI * 6100 * t));
  });
}

// Compás de chirimía (v3.38; 4/4, corcheas 0 a 7): el porro chocoano. El bombardino salta con el bajo y
// camina al acorde siguiente, la tambora en el uno y el tres, el redoblante repicando en el contratiempo,
// los platillos en el dos y el cuatro, y dos clarinetes: la melodía y, en las notas largas, una tercera abajo.
function renderChirimia(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const { root, tones } = parseChord(song.chords[index]);
  const next = parseChord(song.chords[(index + 1) % song.chords.length]).root;
  const at = (e) => t0 + e * eighth + jitter();

  const low = above(root, 41);
  const fifth = above((root + 7) % 12, 41);
  const third = above(tones[1], 41);
  const lead = above(next, 41) + (rng() < 0.5 ? -1 : 2);
  for (const [e, m, n] of [[0, low, 1.6], [3, fifth, 0.9], [4, low, 1.4], [6, third, 0.9], [7, lead, 0.8]]) brass(buf, at(e), freqOf(m), eighth * n, 0.14, -0.2);
  for (const e of [0, 4]) drum(buf, at(e), 110, 55, 0.16, 0.26, -0.1, 0.2);
  if (rng() < 0.4) drum(buf, at(3), 110, 55, 0.12, 0.15, -0.1, 0.2);
  for (const e of [1, 3, 5, 7]) snare(buf, at(e), 0.13, 0.3);
  for (let e = 0; e < 8; e++) if (e % 2 === 0 && rng() < 0.35) snare(buf, at(e) + eighth / 2, 0.07, 0.3);
  for (const e of [2, 6]) cymbal(buf, at(e), 0.12, 0.45);
  for (const [e, n, note] of song.melody[index] ?? []) {
    const m = midi(note);
    reed(buf, at(e), freqOf(m), n * eighth * 0.9, 0.2, 0.1);
    if (n >= 2) {
      const below = tones.map((pc) => m - (((m - pc) % 12) + 12) % 12).filter((x) => m - x >= 3 && m - x <= 5);
      if (below.length) reed(buf, at(e) + 0.006, freqOf(below[0]), n * eighth * 0.9, 0.09, -0.1);
    }
  }
}

// Compás de cumbia amazónica (v3.47; 4/4, corcheas 0 a 7): la de la triple frontera. El bajo salta con su
// síncopa, el teclado marca el contratiempo, las maracas no paran, el manguaré (el tambor de palo de los
// pueblos de la selva) da el golpe grave y el seco, y la guitarra eléctrica puntea la melodía, con el trémolo en
// las notas largas.
function renderAmazonica(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  const low = above(root, 40);
  const fifth = above((root + 7) % 12, 40);
  for (const [e, m, n] of [[0, low, 1.4], [3, low, 0.8], [4, fifth, 1.4], [6, low + 12, 0.8], [7, fifth, 0.8]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.32, t60: 1.2, bright: 0.25, pan: -0.15, pos: 0.3 });
  }
  const chord = tones.map((pc) => above(pc, 60)).sort((a, b) => a - b);
  for (const e of [1, 3, 5, 7]) strum(buf, at(e), chord, eighth * 0.4, { amp: 0.06, t60: 0.4, bright: 0.5, pan: -0.35 }, false);
  for (let k = 0; k < 16; k++) scrape(buf, at(k / 2), eighth * 0.35, k % 4 === 0 ? 0.06 : 0.03, k % 2 ? -0.4 : 0.4);
  // El manguaré: dos tonos de madera.
  for (const e of [0, 4]) drum(buf, at(e), 150, 115, 0.11, 0.2, -0.1, 0.35);
  for (const e of [2, 5, 7]) drum(buf, at(e), 230, 205, 0.06, 0.12, 0.2, 0.4);
  if (index % 4 === 3) for (const e of [6, 6.5, 7, 7.5]) drum(buf, at(e), 380, 330, 0.05, 0.1, 0.3, 0.3);
  // La guitarra eléctrica, con un segundo pulso apenas desafinado.
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    const opts = { amp: 0.4, t60: 0.9, bright: 0.9, pan: 0.15, pos: 0.1 };
    if (n < 3) {
      pluck(buf, at(e), f, n * eighth * 0.9, opts);
      pluck(buf, at(e) + 0.006, f * 1.004, n * eighth * 0.9, { ...opts, amp: 0.16, pan: -0.15 });
      continue;
    }
    const start = t0 + e * eighth;
    const step = eighth / 2;
    const count = Math.floor((n * eighth - 0.03) / step);
    for (let k = 0; k < count; k++) pluck(buf, start + k * step, f, step * 0.9, { ...opts, amp: k ? 0.28 : 0.4 });
  }
}

// Toca el compás `index`: bajo, guitarra, tiple y melodía.
export function renderBar(buf, index) {
  if (buf.song.style === 'cumbia') return renderCumbia(buf, index);
  if (buf.song.style === 'torbellino') return renderTorbellino(buf, index);
  if (buf.song.style === 'joropo') return renderJoropo(buf, index);
  if (buf.song.style === 'chirimia') return renderChirimia(buf, index);
  if (buf.song.style === 'amazonica') return renderAmazonica(buf, index);
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
