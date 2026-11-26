// Renders a piece from songs.js into seamless stereo buffers (left and right). Strings use
// Karplus-Strong synthesis: a noise burst circulates through a pitch-length delay line and is
// low-pass filtered each pass (sounding like a plucked string that decays naturally).
// Pure JS without Web Audio: testable in Node.
import { createRng } from '../core/rng.js';
import { midi, parseChord } from './songs.js';

const RELEASE = 0.03; // s damping time for a palm-muted string

const freqOf = (m) => 440 * 2 ** ((m - 69) / 12);

// For MIDI export (v3.71, tools/music-export.mjs): if `events` is passed, every note and hit is
// recorded with its voice (`buf.voice`). Gameplay skips this and sounds identical.
const logNote = (buf, at, freq, dur, amp) => buf.events?.push({ voice: buf.voice, at: buf.strumAt ?? at, midi: 69 + 12 * Math.log2(freq / 440), dur, amp });
const hit = (buf, at, dur, amp) => buf.events?.push({ voice: buf.voice, at, dur, amp, perc: true });

// Lowest MIDI note with that pitch class at or above `from`.
const above = (pc, from) => from + ((pc - from) % 12 + 12) % 12;

export function createSong(song, sr) {
  const beat = 60 / song.bpm;
  const bar = Math.round(beat * (song.beats ?? 3) * sr);
  const length = bar * song.chords.length;
  return { song, sr, beat, bar, length, left: new Float32Array(length), right: new Float32Array(length), rng: createRng(1907) };
}

// Plucked string. at: seconds from start (tail wraps around to loop start seamlessly).
// t60: decay time (s); bright: 0..1 brightness; pos: pluck position (0..0.5).
function pluck(buf, at, freq, dur, { amp = 0.3, t60 = 1.5, bright = 0.5, pan = 0, pos = 0.2 } = {}) {
  logNote(buf, at, freq, dur, amp);
  const { sr, length, left, right, rng } = buf;
  const delay = sr / freq - 0.5; // two-point averaging filter adds half a sample of delay
  const n0 = Math.ceil(delay) + 2;
  const len = Math.ceil((dur + RELEASE) * sr);
  const y = new Float32Array(Math.max(len, n0 + 1));
  // Pluck excitation: brightness-smoothed noise notched at the pluck harmonic.
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
  // Per-pass feedback gain for exact t60 decay.
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

// Strum: strings sounded sequentially downward (bass to treble) or upward.
function strum(buf, at, notes, dur, opts, up = false) {
  const list = up ? [...notes].reverse() : notes;
  buf.strumAt = at; // in MIDI, emit full chord on the downbeat
  list.forEach((m, k) => pluck(buf, at + k * 0.012, freqOf(m), dur, opts));
  delete buf.strumAt;
}

// Renders a procedural sample-by-sample voice (`fn(tSinceHit) -> sample`) at `at` with stereo pan.
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

// Drum: pitch sweep from f0 to f1 decaying over `decay` s, plus skin transient noise.
function drum(buf, at, f0, f1, decay, amp, pan, slap = 0.2) {
  hit(buf, at, decay, amp);
  const { rng } = buf;
  let phase = 0;
  const sr = buf.sr;
  add(buf, at, decay * 4, pan, (t) => {
    phase += (2 * Math.PI * (f1 + (f0 - f1) * Math.exp(-t * 30))) / sr;
    const env = Math.exp(-t / decay);
    return amp * env * (Math.sin(phase) + slap * (rng() * 2 - 1) * Math.exp(-t * 60));
  });
}

// Guacharaca: scraping ribbed cane with fork, bright noise modulated by ridges.
function scrape(buf, at, dur, amp, pan) {
  hit(buf, at, dur, amp);
  const { rng } = buf;
  let last = 0;
  add(buf, at, dur, pan, (t) => {
    const noise = rng() * 2 - 1;
    const hi = noise - last; // high-pass filter removes lows
    last = noise;
    const ridges = 0.55 + 0.45 * Math.sin(2 * Math.PI * 90 * t);
    const env = Math.min(1, t / 0.008) * (1 - t / dur);
    return amp * hi * ridges * env;
  });
}

// Gaita (or millo flute): blown tone with soft harmonics, vibrato, and breath noise.
function blow(buf, at, freq, dur, amp, pan) {
  logNote(buf, at, freq, dur, amp);
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

// Cumbia measure (4/4, eighth notes 0..7): bass, off-beat guitar chops, gaita,
// guacharaca, llamador, tambora y tambor alegre.
function renderCumbia(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.01;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  // Bass: root, root, fifth, root leaping pattern.
  buf.voice = 'bass';
  const low = above(root, 36);
  const fifth = above((root + 7) % 12, 36);
  for (const [e, m, n] of [[0, low, 1.6], [3, low, 0.9], [4, fifth, 1.6], [6, low, 0.9]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.42, t60: 1.5, bright: 0.2, pan: -0.1, pos: 0.3 });
  }
  // Guitar: short muted off-beat chops.
  buf.voice = 'guitar';
  const chord = tones.map((pc) => above(pc, 57)).sort((a, b) => a - b);
  for (const e of [1, 3, 5, 7]) strum(buf, at(e), chord, eighth * 0.55, { amp: 0.08, t60: 0.6, bright: 0.6, pan: -0.35 }, e % 4 === 3);
  // Guacharaca: long on the beat, short on the off-beat (chu-ku, chu-ku).
  buf.voice = 'guacharaca';
  for (let e = 0; e < 8; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.45 : 0.85), e % 2 ? 0.05 : 0.08, 0.45);
  // Llamador on beats 2 and 4; tambora on 1 and 3.
  buf.voice = 'llamador';
  for (const e of [2, 6]) drum(buf, at(e), 260, 190, 0.07, 0.22, 0.25, 0.35);
  buf.voice = 'tambora';
  for (const e of [0, 4]) drum(buf, at(e), 120, 70, 0.14, 0.38, -0.2, 0.15);
  // Tambor alegre: improvisational syncopated fills.
  buf.voice = 'alegre';
  for (const e of [1, 3, 5, 7]) if (rng() < 0.55) drum(buf, at(e) + (rng() < 0.3 ? eighth / 2 : 0), 330, 280, 0.05, 0.16 + rng() * 0.08, 0.3, 0.5);
  // Gaita.
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) blow(buf, at(e), freqOf(midi(note)), n * eighth * 0.92, 0.2, 0.05);
}

// Torbellino measure (3/4, eighth notes 0..5): bass, guitar on 2 and 3, tiple strumming every
// eighth, requinto picking the melody, and chucho shaker keeping the pulse.
function renderTorbellino(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.01;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 1.6, { amp: 0.45, t60: 2, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(4), freqOf(above((root + 7) % 12, 40)), beat * 0.9, { amp: 0.3, t60: 1.6, bright: 0.25, pan: -0.15, pos: 0.3 });
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  for (const e of [2, 4]) strum(buf, at(e), guitar, beat * 0.7, { amp: 0.13, t60: 1, bright: 0.45, pan: -0.35 });
  // Tiple: three triple-courses, down-up strumming on every eighth note.
  buf.voice = 'tiple';
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (let e = 0; e < 6; e++) strum(buf, at(e), courses, eighth * 0.7, { amp: e % 2 ? 0.045 : 0.065, t60: 0.7, bright: 0.8, pan: 0.35, pos: 0.12 }, e % 2 === 1);
  // Chucho (bamboo shaker): long on the beat, short on the off-beat.
  buf.voice = 'chucho';
  for (let e = 0; e < 6; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.35 : 0.7), e % 2 ? 0.035 : 0.06, 0.5);
  // Requinto: bright picked melody notes.
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) {
    pluck(buf, at(e), freqOf(midi(note)), n * eighth * 0.92, { amp: 0.3, t60: 0.9, bright: 0.85, pan: 0.1, pos: 0.13 });
  }
}

// Joropo measure (fast 3/4, eighth notes 0..5): bassline, cuatro strumming every eighth
// with muted hits (chasquido), steady maracas, and harp melody with left-hand octave doubling.
// Left-hand octave doubling.
function renderJoropo(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  buf.voice = 'bass';
  const low = above(root, 40);
  const fifth = above((root + 7) % 12, 40);
  for (const [e, m, n] of [[0, low, 1.6], [3, fifth, 0.9], [4, low + 12, 0.9]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.4, t60: 1.4, bright: 0.3, pan: -0.15, pos: 0.25 });
  }
  // Cuatro: four mid-register strings; open on beat 1 and and-of-2, muted on beat 2 and
  // and-of-3.
  buf.voice = 'cuatro';
  const cuatro = tones.slice(0, 4).map((pc) => above(pc, 59)).sort((a, b) => a - b);
  for (let e = 0; e < 6; e++) {
    const muted = e === 2 || e === 5;
    strum(buf, at(e), cuatro, eighth * (muted ? 0.25 : 0.75), { amp: muted ? 0.05 : e === 0 || e === 3 ? 0.085 : 0.06, t60: muted ? 0.15 : 0.7, bright: 0.7, pan: 0.3, pos: 0.15 }, e % 2 === 1);
  }
  // Maracas: sixteenth-note shake, accented on 1 and and-of-2.
  buf.voice = 'maracas';
  for (let k = 0; k < 12; k++) scrape(buf, at(k / 2), eighth * 0.4, k === 0 || k === 6 ? 0.07 : k % 2 ? 0.025 : 0.045, k % 2 ? -0.45 : 0.45);
  // Harp.
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    pluck(buf, at(e), f, n * eighth * 0.95, { amp: 0.28, t60: 1.3, bright: 0.8, pan: 0.05, pos: 0.18 });
    if (e % 3 === 0) pluck(buf, at(e) + 0.004, f / 2, n * eighth * 0.95, { amp: 0.12, t60: 1.3, bright: 0.6, pan: -0.05, pos: 0.18 });
  }
}

// Clarinet (v3.38): reed timbre with strong odd harmonics, crisp attack, and light vibrato.
function reed(buf, at, freq, dur, amp, pan) {
  logNote(buf, at, freq, dur, amp);
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

// Bombardino / euphonium (v3.38): warm low brass with even harmonics and gentle swell.
function brass(buf, at, freq, dur, amp, pan) {
  logNote(buf, at, freq, dur, amp);
  const sr = buf.sr;
  let phase = 0;
  add(buf, at, dur + 0.05, pan, (t) => {
    phase += (2 * Math.PI * freq) / sr;
    const env = Math.min(1, t / 0.03) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.05));
    const bright = 0.35 + 0.3 * Math.exp(-t * 8);
    return amp * env * (Math.sin(phase) + bright * Math.sin(2 * phase) + bright * 0.5 * Math.sin(3 * phase) + 0.1 * Math.sin(4 * phase));
  });
}

// Snare drum (redoblante): head transient with snare wire buzz.
function snare(buf, at, amp, pan) {
  hit(buf, at, 0.16, amp);
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

// Cymbals: brass crash, bright high-passed noise with slow decay.
function cymbal(buf, at, amp, pan, decay = 0.25) {
  hit(buf, at, decay, amp);
  const { rng } = buf;
  let a = 0;
  let b = 0;
  add(buf, at, decay * 3, pan, (t) => {
    const noise = rng() * 2 - 1;
    const hi = noise - 2 * a + b; // second difference: keep only highs
    b = a;
    a = noise;
    return amp * 0.35 * hi * Math.exp(-t / decay) * (1 + 0.3 * Math.sin(2 * Math.PI * 6100 * t));
  });
}

// Chirimia measure (v3.38; 4/4, eighths 0..7): Choco porro. Bombardino leaps on bass and walks
// into next chord, tambora on 1 and 3, snare rolling off-beats, cymbals on 2 and 4,
// and two clarinets: melody plus harmony a third below on long notes.
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
  buf.voice = 'bass';
  for (const [e, m, n] of [[0, low, 1.6], [3, fifth, 0.9], [4, low, 1.4], [6, third, 0.9], [7, lead, 0.8]]) brass(buf, at(e), freqOf(m), eighth * n, 0.14, -0.2);
  buf.voice = 'tambora';
  for (const e of [0, 4]) drum(buf, at(e), 110, 55, 0.16, 0.26, -0.1, 0.2);
  if (rng() < 0.4) drum(buf, at(3), 110, 55, 0.12, 0.15, -0.1, 0.2);
  buf.voice = 'snare';
  for (const e of [1, 3, 5, 7]) snare(buf, at(e), 0.13, 0.3);
  for (let e = 0; e < 8; e++) if (e % 2 === 0 && rng() < 0.35) snare(buf, at(e) + eighth / 2, 0.07, 0.3);
  buf.voice = 'cymbal';
  for (const e of [2, 6]) cymbal(buf, at(e), 0.12, 0.45);
  for (const [e, n, nt] of song.melody[index] ?? []) {
    const m = midi(nt);
    buf.voice = 'melody';
    reed(buf, at(e), freqOf(m), n * eighth * 0.9, 0.2, 0.1);
    if (n >= 2) {
      const below = tones.map((pc) => m - (((m - pc) % 12) + 12) % 12).filter((x) => m - x >= 3 && m - x <= 5);
      buf.voice = 'second';
      if (below.length) reed(buf, at(e) + 0.006, freqOf(below[0]), n * eighth * 0.9, 0.09, -0.1);
    }
  }
}

// Amazonian cumbia measure (v3.47; 4/4, eighths 0..7): triple-border style. Syncopated bass,
// keyboard on off-beats, continuous maracas, manguare (indigenous slit log drum) low and dry hits,
// and electric guitar picking the melody with tremolo on sustained notes.
// Sustained notes.
function renderAmazonica(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  const low = above(root, 40);
  const fifth = above((root + 7) % 12, 40);
  buf.voice = 'bass';
  for (const [e, m, n] of [[0, low, 1.4], [3, low, 0.8], [4, fifth, 1.4], [6, low + 12, 0.8], [7, fifth, 0.8]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.32, t60: 1.2, bright: 0.25, pan: -0.15, pos: 0.3 });
  }
  buf.voice = 'keys';
  const chord = tones.map((pc) => above(pc, 60)).sort((a, b) => a - b);
  for (const e of [1, 3, 5, 7]) strum(buf, at(e), chord, eighth * 0.4, { amp: 0.06, t60: 0.4, bright: 0.5, pan: -0.35 }, false);
  buf.voice = 'maracas';
  for (let k = 0; k < 16; k++) scrape(buf, at(k / 2), eighth * 0.35, k % 4 === 0 ? 0.06 : 0.03, k % 2 ? -0.4 : 0.4);
  // Manguare: two hollow wooden pitches.
  buf.voice = 'manguareLow';
  for (const e of [0, 4]) drum(buf, at(e), 150, 115, 0.11, 0.2, -0.1, 0.35);
  buf.voice = 'manguareHigh';
  for (const e of [2, 5, 7]) drum(buf, at(e), 230, 205, 0.06, 0.12, 0.2, 0.4);
  buf.voice = 'manguareRoll';
  if (index % 4 === 3) for (const e of [6, 6.5, 7, 7.5]) drum(buf, at(e), 380, 330, 0.05, 0.1, 0.3, 0.3);
  // Electric guitar with subtle detuned chorus pulse.
  buf.voice = 'melody';
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

// Steel pan note (v5.5): bright metallic tone, fundamental with octave and twelfth partials that fade faster,
// struck with a soft mallet.
function steel(buf, at, freq, dur, amp, pan) {
  logNote(buf, at, freq, dur, amp);
  const { sr } = buf;
  const tail = 0.25;
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  add(buf, at, dur + tail, pan, (t) => {
    p1 += (2 * Math.PI * freq) / sr;
    p2 += (2 * Math.PI * freq * 2) / sr;
    p3 += (2 * Math.PI * freq * 3) / sr;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.5) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / tail));
    return amp * env * (Math.sin(p1) + 0.45 * Math.sin(p2) * Math.exp(-t * 3) + 0.18 * Math.sin(p3) * Math.exp(-t * 9));
  });
}

// Calypso measure (v5.5, special zone; 4/4, eighths 0..7): washtub bass (tináfono) on the roots and fifths,
// muted guitar strumming the island off-beat pattern, maracas on every eighth, bongos answering on the
// off-beats, and the steel pan carrying the melody (rolled on long notes).
function renderCalipso(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.008;
  const low = above(root, 40);
  const fifth = above((root + 7) % 12, 40);
  buf.voice = 'bass';
  for (const [e, m, n] of [[0, low, 1.5], [3, low, 0.8], [4, fifth, 1.5], [7, fifth, 0.8]]) {
    pluck(buf, at(e), freqOf(m), eighth * n, { amp: 0.36, t60: 0.9, bright: 0.2, pan: -0.15, pos: 0.35 });
  }
  buf.voice = 'guitar';
  const chord = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  for (const [e, up, amp] of [[0, false, 0.12], [2, false, 0.1], [3, true, 0.08], [5, true, 0.08], [6, false, 0.1], [7, true, 0.07]]) {
    strum(buf, at(e), chord, eighth * 0.45, { amp, t60: 0.5, bright: 0.55, pan: -0.35 }, up);
  }
  buf.voice = 'maracas';
  for (let e = 0; e < 8; e++) scrape(buf, at(e), eighth * 0.4, e % 2 ? 0.03 : 0.05, 0.4);
  buf.voice = 'bongoHigh';
  for (const e of [1, 3, 5]) drum(buf, at(e), 420, 380, 0.05, 0.12, 0.3, 0.35);
  buf.voice = 'bongoLow';
  for (const e of [3.5, 7]) drum(buf, at(e), 300, 250, 0.07, 0.14, 0.25, 0.3);
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    if (n < 3) {
      steel(buf, at(e), f, n * eighth * 0.95, 0.2, 0.1);
      continue;
    }
    const start = t0 + e * eighth;
    const step = eighth / 2;
    const count = Math.floor((n * eighth - 0.03) / step);
    for (let k = 0; k < count; k++) steel(buf, start + k * step, f, step * 0.95, k ? 0.13 : 0.2, 0.1);
  }
}

// Renders measure `index`: bass, guitar, tiple, and melody.
// Villancico (v5.20, La plaza de las fiestas): the novena's carols. Flute melody (the children's recorders),
// guitar bass and strums, tiple chops, maracas on every eighth and the pandereta (tambourine) on the beats. Works in
// 2/4 or 3/4 (`beats`).
function jingle(buf, at, amp, pan) {
  hit(buf, at, 0.18, amp);
  const { rng } = buf;
  let last = 0;
  add(buf, at, 0.22, pan, (t) => {
    const noise = rng() * 2 - 1;
    const hi = noise - last;
    last = noise;
    // Metal jingles: bright noise with a shimmer, plus a soft skin thump.
    const shimmer = 0.6 + 0.4 * Math.sin(2 * Math.PI * 7200 * t);
    return amp * (hi * shimmer * Math.exp(-t / 0.07) + 0.4 * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t / 0.02));
  });
}
function renderVillancico(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const beats = song.beats ?? 3;
  const t0 = (index * buf.bar) / buf.sr;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.008;
  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 0.9, { amp: 0.45, t60: 1.8, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(2), freqOf(above((root + 7) % 12, 40)), beat * 0.9, { amp: 0.3, t60: 1.6, bright: 0.25, pan: -0.15, pos: 0.3 });
  if (beats === 3) pluck(buf, at(4), freqOf(above((root + 4) % 12, 40)), beat * 0.9, { amp: 0.26, t60: 1.6, bright: 0.25, pan: -0.15, pos: 0.3 });
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  for (let b = 0; b < beats; b++) strum(buf, at(b * 2), guitar, eighth * 0.9, { amp: b ? 0.11 : 0.14, t60: 1, bright: 0.45, pan: -0.35 });
  buf.voice = 'tiple';
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (let b = 0; b < beats; b++) strum(buf, at(b * 2 + 1), courses, 0.11, { amp: 0.05, t60: 0.7, bright: 0.8, pan: 0.35, pos: 0.12 }, true);
  buf.voice = 'maracas';
  for (let e = 0; e < beats * 2; e++) scrape(buf, at(e), eighth * 0.35, e % 2 ? 0.025 : 0.04, e % 2 ? -0.45 : 0.45);
  buf.voice = 'pandereta';
  for (let b = 0; b < beats; b++) jingle(buf, at(b * 2), b ? 0.05 : 0.08, 0.25);
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) blow(buf, at(e), freqOf(midi(note)), n * eighth * 0.9, 0.16, 0.1);
}

// Son sureño (v5.21, Carnaval de Negros y Blancos, Pasto): Andean dance in 3/4 with a lilting 6/8 feel. Quena
// melody (breathy blown flute), charango strumming every eighth, guitar bass and the bombo (big drum) on 1 and the
// and-of-2.
function renderSonSureno(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.008;
  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 1.4, { amp: 0.45, t60: 1.8, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(3), freqOf(above((root + 7) % 12, 40)), beat * 1.2, { amp: 0.32, t60: 1.6, bright: 0.25, pan: -0.15, pos: 0.3 });
  buf.voice = 'bombo';
  drum(buf, at(0), 95, 55, 0.22, 0.42, -0.05, 0.25);
  drum(buf, at(3), 90, 55, 0.18, 0.3, -0.05, 0.25);
  drum(buf, at(5), 120, 80, 0.06, 0.12, -0.05, 0.6);
  buf.voice = 'charango';
  const charango = tones.slice(0, 4).map((pc) => above(pc, 67)).sort((a, b) => a - b);
  for (let e = 0; e < 6; e++) strum(buf, at(e), charango, eighth * 0.6, { amp: e === 0 || e === 3 ? 0.07 : 0.045, t60: 0.5, bright: 0.9, pan: 0.4, pos: 0.1 }, e % 2 === 1);
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  strum(buf, at(2), guitar, eighth * 0.9, { amp: 0.1, t60: 1, bright: 0.45, pan: -0.35 });
  strum(buf, at(4), guitar, eighth * 0.9, { amp: 0.09, t60: 1, bright: 0.45, pan: -0.35 });
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) blow(buf, at(e), freqOf(midi(note)), n * eighth * 0.9, 0.17, 0.12);
}

export function renderBar(buf, index) {
  if (buf.song.style === 'granfinal') return renderGranFinal(buf, index);
  if (buf.song.style === 'villancico') return renderVillancico(buf, index);
  if (buf.song.style === 'sonsureno') return renderSonSureno(buf, index);
  if (buf.song.style === 'calipso') return renderCalipso(buf, index);
  if (buf.song.style === 'cumbia') return renderCumbia(buf, index);
  if (buf.song.style === 'torbellino') return renderTorbellino(buf, index);
  if (buf.song.style === 'joropo') return renderJoropo(buf, index);
  if (buf.song.style === 'chirimia') return renderChirimia(buf, index);
  if (buf.song.style === 'amazonica') return renderAmazonica(buf, index);
  if (buf.song.style === 'sanjuanero') return renderSanjuanero(buf, index);
  if (buf.song.style === 'pasillo') return renderPasillo(buf, index);
  if (buf.song.style === 'danza') return renderDanza(buf, index);
  return renderBambuco(buf, index);
}

// Sanjuanero measure (v4.0, fast 3/4): classic bambuco ensemble plus San Pedro tambora
// (head hit on 1, rim on and-of-2, head on 3) and carrasca scraper on every eighth.
// corchea.
function renderSanjuanero(buf, index) {
  renderBambuco(buf, index);
  const { beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.008;
  buf.voice = 'tambora';
  drum(buf, at(0), 120, 70, 0.14, 0.4, -0.2, 0.15);
  drum(buf, at(3), 420, 380, 0.03, 0.12, -0.25, 0.8);
  drum(buf, at(4), 140, 90, 0.1, 0.28, -0.2, 0.2);
  buf.voice = 'carrasca';
  for (let e = 0; e < 6; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.35 : 0.6), e % 2 ? 0.03 : 0.055, 0.45);
}

// Pasillo measure (v4.4, 3/4): bass on 1, guitar accented on and-of-2 and beat 3,
// muted tiple chops on 2 and and-of-3, and bandola melody.
function renderPasillo(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.01;
  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 1.8, { amp: 0.5, t60: 2.4, bright: 0.25, pan: -0.15, pos: 0.3 });
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  strum(buf, at(3), guitar, eighth * 0.9, { amp: 0.17, t60: 1.1, bright: 0.45, pan: -0.35 });
  strum(buf, at(4), guitar, beat * 0.8, { amp: 0.12, t60: 1.1, bright: 0.45, pan: -0.35 }, true);
  buf.voice = 'tiple';
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (const e of [2, 5]) strum(buf, at(e), courses, 0.12, { amp: 0.06, t60: 0.7, bright: 0.8, pan: 0.35, pos: 0.12 }, true);
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    const opts = { amp: 0.32, t60: 1.2, bright: 0.72, pan: 0.1, pos: 0.15 };
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

// Danza measure (v4.5, slow 2/4, eighths 0..3): bass on 1 and fifth on 2, habanera-rhythm
// guitar, muted off-beat tiple, and bandola with dotted-eighth phrasing and tremolo.
// Long notes in tremolo.
function renderDanza(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + (rng() - 0.5) * 0.01;
  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 1.4, { amp: 0.5, t60: 2.4, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(2), freqOf(above((root + 7) % 12, 40)), beat * 0.9, { amp: 0.32, t60: 2, bright: 0.25, pan: -0.15, pos: 0.3 });
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  strum(buf, at(1.5), guitar, eighth * 0.45, { amp: 0.11, t60: 0.9, bright: 0.45, pan: -0.35 }, true);
  strum(buf, at(2), guitar, eighth * 0.9, { amp: 0.15, t60: 1.1, bright: 0.45, pan: -0.35 });
  strum(buf, at(3), guitar, eighth * 0.9, { amp: 0.12, t60: 1.1, bright: 0.45, pan: -0.35 }, true);
  buf.voice = 'tiple';
  const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
  const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
  for (const e of [1, 3]) strum(buf, at(e), courses, 0.11, { amp: 0.055, t60: 0.7, bright: 0.8, pan: 0.35, pos: 0.12 }, true);
  buf.voice = 'melody';
  for (const [e, n, note] of song.melody[index] ?? []) {
    const f = freqOf(midi(note));
    const opts = { amp: 0.32, t60: 1.3, bright: 0.7, pan: 0.1, pos: 0.15 };
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

// Bambuco measure (3/4): shared Andean pattern.
function renderBambuco(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.012;
  const { root, tones } = parseChord(song.chords[index]);
  const at = (e) => t0 + e * eighth + jitter();

  // Guitar bassline: root on beat 1, fifth on beat 3.
  buf.voice = 'bass';
  pluck(buf, at(0), freqOf(above(root, 40)), beat * 2.2, { amp: 0.5, t60: 2.5, bright: 0.25, pan: -0.15, pos: 0.3 });
  pluck(buf, at(4), freqOf(above((root + 7) % 12, 40)), beat * 1.1, { amp: 0.3, t60: 2, bright: 0.25, pan: -0.15, pos: 0.3 });

  // Guitar: strum on beats 2 and 3; in guabina (v3.67, `arpeggio`), arpeggiated eighth-note
  // plucking so it differs cleanly from the bambuco.
  buf.voice = 'guitar';
  const guitar = tones.map((pc) => above(pc, 55)).sort((a, b) => a - b);
  if (song.arpeggio) {
    const notes = [...guitar, guitar[1] + 12];
    for (let e = 1; e < 6; e++) pluck(buf, at(e), freqOf(notes[(e - 1) % notes.length]), eighth * 1.6, { amp: 0.13, t60: 1.4, bright: 0.4, pan: -0.3, pos: 0.25 });
  } else {
    strum(buf, at(2), guitar, beat * 0.9, { amp: 0.16, t60: 1.2, bright: 0.45, pan: -0.35 });
    strum(buf, at(4), guitar, beat * 0.8, { amp: 0.12, t60: 1.2, bright: 0.45, pan: -0.35 });
  }

  // Tiple: short muted off-beat hits (and-of-2 and and-of-3). Triple-course strings:
  // two unison slightly detuned, middle string an octave lower. Guabina (`tiple: false`, v3.67)
  // omits it.
  buf.voice = 'tiple';
  if (song.tiple !== false) {
    const tiple = tones.slice(0, 4).map((pc) => above(pc, 64)).sort((a, b) => a - b);
    const courses = tiple.flatMap((m, k) => (k < 3 ? [m - 12, m, m + 0.04] : [m, m + 0.04]));
    for (const e of [3, 5]) strum(buf, at(e), courses, 0.13, { amp: 0.07, t60: 0.8, bright: 0.8, pan: 0.35, pos: 0.12 }, true);
  }

  // Bandola melody: long notes played with tremolo.
  buf.voice = 'melody';
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

// Renders the entire piece at once (used in tests; gameplay builds bar by bar).
export function renderSong(song, sr) {
  const buf = createSong(song, sr);
  for (let i = 0; i < song.chords.length; i++) renderBar(buf, i);
  normalize(buf);
  return buf;
}

// Normalize peak to `peak` to prevent clipping.
export function normalize(buf, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  const k = max ? peak / max : 1;
  for (let i = 0; i < buf.length; i++) {
    buf.left[i] *= k;
    buf.right[i] *= k;
  }
}

// Grand finale measure (v5.9; 4/4, eighths 0..7). Sections by bar: intro 0-3, A 4-11, A' 12-19, B 20-27,
// C 28-35, coda 36-39. Always: euphonium bass (Pacific), tambora and llamador (Caribbean). Then, by section:
// guacharaca and off-beat guitar from A on; Llanos harp arpeggios in A' and C; Andean tiple strums in A and C;
// steel pan doubling the tune in B and C; snare and cymbals building up; clarinets on the tune (with a second
// voice a third below on long notes) and the gaita joining in C and the coda; a crash at each section start.
function renderGranFinal(buf, index) {
  const { song, beat, rng } = buf;
  const eighth = beat / 2;
  const t0 = (index * buf.bar) / buf.sr;
  const jitter = () => (rng() - 0.5) * 0.008;
  const at = (e) => t0 + e * eighth + jitter();
  const { root, tones } = parseChord(song.chords[index]);
  const next = parseChord(song.chords[(index + 1) % song.chords.length]).root;
  const part = index < 4 ? 'intro' : index < 12 ? 'a' : index < 20 ? 'a2' : index < 28 ? 'b' : index < 36 ? 'c' : 'coda';
  const full = part === 'c' || part === 'coda';
  const last = index === song.chords.length - 2; // held final chord

  // Euphonium bass: leaps, walking into the next chord.
  buf.voice = 'bass';
  const low = above(root, 41);
  const fifth = above((root + 7) % 12, 41);
  const third = above(tones[1], 41);
  const lead = above(next, 41) + (rng() < 0.5 ? -1 : 2);
  const bassLine = last ? [[0, low, 7.5]] : [[0, low, 1.6], [3, fifth, 0.9], [4, low, 1.4], [6, third, 0.9], [7, lead, 0.8]];
  for (const [e, m, n] of bassLine) brass(buf, at(e), freqOf(m), eighth * n, 0.14, -0.2);
  // Tambora on 1 and 3; llamador on 2 and 4.
  buf.voice = 'tambora';
  for (const e of [0, 4]) drum(buf, at(e), 115, 60, 0.15, part === 'intro' ? 0.3 : 0.34, -0.15, 0.2);
  if (part !== 'intro' && !last) {
    buf.voice = 'llamador';
    for (const e of [2, 6]) drum(buf, at(e), 260, 190, 0.07, 0.2, 0.25, 0.35);
    // Guacharaca: chu-ku, chu-ku.
    buf.voice = 'guacharaca';
    for (let e = 0; e < 8; e++) scrape(buf, at(e), eighth * (e % 2 ? 0.45 : 0.85), e % 2 ? 0.04 : 0.065, 0.45);
    // Guitar: off-beat chops.
    buf.voice = 'guitar';
    const chord = tones.map((pc) => above(pc, 57)).sort((a, b) => a - b);
    for (const e of [1, 3, 5, 7]) strum(buf, at(e), chord, eighth * 0.55, { amp: 0.07, t60: 0.6, bright: 0.6, pan: -0.35 }, e % 4 === 3);
  }
  // Andean tiple: bright strums on the beat in A and C.
  if (part === 'a' || part === 'c') {
    buf.voice = 'tiple';
    const tiple = tones.map((pc) => above(pc, 64)).sort((a, b) => a - b);
    for (const e of [0, 2, 4, 6]) strum(buf, at(e) + 0.01, tiple, eighth * 0.7, { amp: 0.05, t60: 0.8, bright: 0.8, pan: 0.35 }, e === 2 || e === 6);
  }
  // Llanos harp: running arpeggios up the chord in A' and C.
  if (part === 'a2' || part === 'c') {
    buf.voice = 'harp';
    const arp = [...tones, tones[0] + 12, ...tones.map((pc) => pc + 12)].map((pc) => above(pc % 12, 62) + (pc >= 12 ? 12 : 0));
    for (let e = 0; e < 8; e++) pluck(buf, at(e), freqOf(arp[e % arp.length]), eighth * 1.6, { amp: 0.07, t60: 1.2, bright: 0.85, pan: 0.45, pos: 0.15 });
  }
  // Snare and cymbals build up.
  if (part === 'a2' || part === 'b' || full) {
    buf.voice = 'snare';
    for (const e of [1, 3, 5, 7]) snare(buf, at(e), part === 'b' ? 0.06 : 0.1, 0.3);
  }
  buf.voice = 'cymbal';
  if ([0, 4, 12, 20, 28, 36].includes(index) || last) cymbal(buf, at(0), 0.18, 0.4, 0.6);
  if (full && !last) for (const e of [2, 6]) cymbal(buf, at(e), 0.08, 0.45);
  // The tune: clarinets (euphonium too in the fanfare), steel pan in B and C, gaita in C and the coda.
  for (const [e, n, nt] of song.melody[index] ?? []) {
    const m = midi(nt);
    const dur = n * eighth * 0.92;
    buf.voice = 'melody';
    reed(buf, at(e), freqOf(m), dur, 0.18, 0.1);
    if (n >= 2) {
      const below = tones.map((pc) => m - (((m - pc) % 12) + 12) % 12).filter((x) => m - x >= 3 && m - x <= 5);
      buf.voice = 'second';
      if (below.length) reed(buf, at(e) + 0.006, freqOf(below[0]), dur, 0.08, -0.1);
    }
    if (part === 'intro') {
      buf.voice = 'fanfare';
      brass(buf, at(e), freqOf(m - 12), dur, 0.08, 0);
    }
    if (part === 'b' || part === 'c') {
      buf.voice = 'steel';
      steel(buf, at(e), freqOf(m), dur, 0.1, -0.3);
    }
    if (full) {
      buf.voice = 'gaita';
      blow(buf, at(e), freqOf(m), dur, 0.1, 0.25);
    }
  }
}
