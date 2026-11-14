// Game music for download (v3.71): each track from src/audio/songs.js as MP3 (played just like in
// the game, with the same room reverb) and as MIDI (each instrument's notes on its own track).
//   node tools/music-export.mjs [folder]   (default web/musica; requires ffmpeg with libmp3lame)
// The MP3 repeats the piece to about two and a half minutes and closes on the opening chord, with a fade-out.
// The MIDI is one loop plus the final chord, with the piece's tempo and time signature.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SONGS } from '../src/audio/songs.js';
import { REGIONS_BY_ID } from '../src/data/regions.js';
import { createSong, renderBar } from '../src/audio/compose.js';
import { createRng } from '../src/core/rng.js';
import { writeMidi, writeWav } from './midi.mjs';

const OUT = process.argv[2] ?? new URL('../web/musica', import.meta.url).pathname;
const SR = 44100;
const REVERB = 0.22; // same as in src/audio/Music.js
const TARGET_S = 140; // rough target duration of the MP3
const TAIL_S = 3.5; // trailing sound after the last beat
const ARTIST = 'Encantos de Mi Tierrita';

// Region order in the game and each file name.
export const ORDER = ['cafetero', 'santander', 'costa', 'boyaca', 'llanos', 'pacifico', 'amazonas', 'tolima', 'cundinamarca', 'bogota', 'sanandres'];
// Included on the downloads page: excludes regions still hidden in the game (v4.4.10: Bogotá) and secret ones
// (v5.5: the special zone, which must not be named outside the game before it opens).
export const PUBLIC = ORDER.filter((region) => !REGIONS_BY_ID[region].hidden && !REGIONS_BY_ID[region].secret);
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fileOf = (region) => `${ORDER.indexOf(region) + 1}-${slug(SONGS[region].name)}`;

// Each voice in compose.js: track name, General MIDI program, and if percussion, the channel 10 note.
const MELODY = { bambuco: ['Bandola', 25], cumbia: ['Gaita', 73], torbellino: ['Requinto', 25], joropo: ['Arpa llanera', 46], chirimia: ['Clarinete', 71], amazonica: ['Guitarra eléctrica', 27], sanjuanero: ['Bandola', 25], pasillo: ['Bandola', 25], danza: ['Bandola', 25], calipso: ['Tambor metálico', 114] };
function voiceOf(style, voice, ev) {
  switch (voice) {
    case 'melody': return { name: MELODY[style][0], program: MELODY[style][1] };
    case 'second': return { name: 'Clarinete 2', program: 71 };
    case 'bass': return style === 'chirimia' ? { name: 'Bombardino', program: 58 } : style === 'amazonica' ? { name: 'Bajo', program: 33 } : { name: 'Bajo', program: 32 };
    case 'guitar': return { name: 'Guitarra', program: 24 };
    case 'tiple': return { name: 'Tiple', program: 25 };
    case 'cuatro': return { name: 'Cuatro', program: 24 };
    case 'keys': return { name: 'Teclado', program: 4 };
    case 'guacharaca': return { name: 'Guacharaca', perc: ev.dur > 0.25 * ev.beat ? 74 : 73 };
    case 'llamador': return { name: 'Llamador', perc: 64 };
    case 'tambora': return { name: 'Tambora', perc: style === 'chirimia' ? 36 : 41 };
    case 'alegre': return { name: 'Tambor alegre', perc: 63 };
    case 'chucho': return { name: 'Chucho', perc: 70 };
    case 'maracas': return { name: 'Maracas', perc: 70 };
    case 'carrasca': return { name: 'Carrasca', perc: 73 };
    case 'snare': return { name: 'Redoblante', perc: 38 };
    case 'cymbal': return { name: 'Platillos', perc: 49 };
    case 'manguareLow': return { name: 'Manguaré', perc: 77 };
    case 'manguareHigh':
    case 'manguareRoll': return { name: 'Manguaré', perc: 76 };
    case 'bongoHigh': return { name: 'Bongó', perc: 60 };
    case 'bongoLow': return { name: 'Bongó', perc: 61 };
    default: throw new Error(`voice without a track: ${voice}`);
  }
}

// The piece repeated `loops` times and, at the end, one bar of the opening chord (no melody), with room
// for the tail to ring out without looping back to the start.
function extended(song, loops) {
  const chords = [...Array(loops)].flatMap(() => song.chords).concat(song.chords[0]);
  const melody = [...Array(loops)].flatMap(() => song.chords.map((_, i) => song.melody[i] ?? [])).concat([[]]);
  return { ...song, chords, melody };
}

function render(song, events) {
  const buf = createSong(song, SR);
  const length = buf.length + Math.round(TAIL_S * SR);
  Object.assign(buf, { length, left: new Float32Array(length), right: new Float32Array(length), events });
  for (let i = 0; i < song.chords.length; i++) renderBar(buf, i);
  return buf;
}

// Music.js room reverb: noise decaying over 1.5 s, with ConvolverNode normalization
// from Web Audio (so it sounds just as loud as in the game).
function impulse() {
  const rng = createRng(2024);
  const len = Math.round(SR * 1.5);
  const ch = [new Float32Array(len), new Float32Array(len)];
  let sum = 0;
  for (const data of ch) {
    for (let i = 0; i < len; i++) {
      data[i] = (rng() * 2 - 1) * (1 - i / len) ** 3;
      sum += data[i] * data[i];
    }
  }
  const power = Math.max(Math.sqrt(sum / (2 * len)), 0.000125);
  const scale = (1 / power) * 0.00125 * (44100 / SR);
  for (const data of ch) for (let i = 0; i < len; i++) data[i] *= scale;
  return ch;
}

function mp3(region, dir) {
  const song = SONGS[region];
  const once = (song.chords.length * (song.beats ?? 3) * 60) / song.bpm;
  const loops = Math.max(2, Math.round(TARGET_S / once));
  const long = extended(song, loops);
  const buf = render(long, null);
  const wav = join(dir, 'song.wav');
  const ir = join(dir, 'ir.wav');
  writeFileSync(wav, writeWav(buf.left, buf.right, SR));
  const [l, r] = impulse();
  writeFileSync(ir, writeWav(l, r, SR));
  const lastBar = ((long.chords.length - 1) * buf.bar) / SR;
  const fadeLen = buf.length / SR - lastBar;
  const mixed = join(dir, 'mixed.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-i', ir, '-filter_complex',
    `[0:a]asplit[d][x];[x][1:a]afir=gtype=none:dry=1:wet=1[w];[d][w]amix=inputs=2:weights='1 ${REVERB}':normalize=0,afade=t=out:st=${lastBar.toFixed(3)}:d=${fadeLen.toFixed(3)}`,
    '-c:a', 'pcm_f32le', mixed]);
  // Peak at −1 dB.
  const info = spawnSync('ffmpeg', ['-v', 'info', '-i', mixed, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return { mixed, loops, seconds: buf.length / SR, info };
}

function encode(region, mixed, peakDb, out) {
  const song = SONGS[region];
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mixed, '-af', `volume=${(-1 - peakDb).toFixed(2)}dB`,
    '-c:a', 'libmp3lame', '-b:a', '160k', '-ar', String(SR),
    '-metadata', `title=${song.name}`, '-metadata', `artist=${ARTIST}`, '-metadata', `album=${ARTIST}`,
    '-metadata', `track=${ORDER.indexOf(region) + 1}/${PUBLIC.length}`, '-metadata', `comment=${song.instruments}`,
    out]);
}

// The MIDI: one loop plus final chord. Notes quantize to a 1/24-beat grid (removes the slight «swing»
// used in game playback) and repeated strings on the same beat are deduplicated.
function midiFile(region) {
  const song = SONGS[region];
  const style = song.style ?? 'bambuco';
  const events = [];
  const buf = render(extended(song, 1), events);
  const ppq = 480;
  const q = ppq / 24;
  const toTick = (s) => Math.round((s / buf.beat) * ppq / q) * q;
  const tracks = new Map();
  let nextChannel = 0;
  const maxAmp = {};
  for (const e of events) maxAmp[e.voice] = Math.max(maxAmp[e.voice] ?? 0, e.amp);
  for (const e of events) {
    const v = voiceOf(style, e.voice, { ...e, beat: buf.beat });
    const key = v.name;
    if (!tracks.has(key)) {
      let channel = 9;
      if (!v.perc) {
        if (nextChannel === 9) nextChannel++;
        channel = nextChannel++;
      }
      tracks.set(key, { name: v.name, channel, program: v.program ?? 0, notes: [], seen: new Map() });
    }
    const t = tracks.get(key);
    const tick = toTick(e.at);
    const note = v.perc ?? Math.round(e.midi);
    const dur = Math.max(q, toTick(e.at + e.dur) - tick);
    const vel = Math.max(1, Math.min(127, Math.round(40 + (87 * e.amp) / maxAmp[e.voice])));
    const id = `${tick}:${note}`;
    const prev = t.seen.get(id);
    if (prev) {
      prev.vel = Math.max(prev.vel, vel);
      prev.dur = Math.max(prev.dur, dur);
      continue;
    }
    const n = { tick, dur: v.perc ? q * 2 : dur, note, vel };
    t.seen.set(id, n);
    t.notes.push(n);
  }
  return writeMidi({ ppq, tempo: song.bpm, timeSig: [song.beats ?? 3, 4], tracks: [...tracks.values()] });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'musica-'));
  try {
    for (const region of PUBLIC) {
      const name = fileOf(region);
      writeFileSync(join(OUT, `${name}.mid`), midiFile(region));
      const { mixed, loops, seconds, info } = mp3(region, tmp);
      const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(info)?.[1]);
      if (!Number.isFinite(peak)) throw new Error(`no peak for ${name}`);
      encode(region, mixed, peak, join(OUT, `${name}.mp3`));
      console.log(`${name}: ${loops} vueltas, ${Math.round(seconds)} s`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
