// Game sound effects for download (v3.71): each sound in src/audio/Sound.js recorded to MP3
// with the same Web Audio engine as the game (Chromium, offline), and to MIDI for pitched ones (coins,
// level up, bells…). Noise-based ones (fire, wind, Willys) have no notes: MP3 only.
//   node tools/sfx-export.mjs [folder]   (default web/musica/efectos; requires Playwright and ffmpeg)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STATIONS } from '../src/data/stations.js';
import { stationSound } from '../src/audio/Sound.js';
import { writeMidi, writeWav } from './midi.mjs';
import { EFFECTS } from './audio-list.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2] ?? new URL('../web/musica/efectos', import.meta.url).pathname;
const SR = 44100;

// Station sounds play using the first station of that craft (warehouse for the Willys).
const firstOf = (kind) => (kind === 'engine' ? 'dispatch' : STATIONS.find((st) => stationSound(st.id) === kind).id);
const howOf = (how) => (typeof how === 'string' ? how : `station:${firstOf(how.kind)}`);

// Record one: an OfflineAudioContext instead of the game's; logs tone() notes (and bells).
async function record(page, src, how) {
  return page.evaluate(
    async ({ src, how, SR }) => {
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const { Sound } = await import(url);
      const ctx = new OfflineAudioContext(2, SR * 5, SR);
      const sound = new Sound();
      sound.ctx = ctx;
      sound.master = ctx.createGain();
      sound.master.gain.value = 1;
      sound.master.connect(ctx.destination);
      sound.ready = () => true;
      const notes = [];
      const tone = sound.tone.bind(sound);
      sound.tone = (freq, start, duration, opts = {}) => {
        notes.push({ freq, start, duration, type: opts.type ?? 'sine', gain: opts.gain ?? 0.5 });
        return tone(freq, start, duration, opts);
      };
      if (how === 'bells') for (let i = 0; i < 3; i++) notes.push({ freq: 330, start: i * 1.1, duration: 2.4, type: 'bell', gain: 0.4 });
      if (how.startsWith('station:')) sound.station(how.slice(8));
      else sound[how]();
      const out = await ctx.startRendering();
      const L = out.getChannelData(0);
      const R = out.getChannelData(1);
      // As far as it rings out (plus a little extra).
      let end = L.length - 1;
      while (end > 0 && Math.abs(L[end]) < 1e-4 && Math.abs(R[end]) < 1e-4) end--;
      end = Math.min(L.length, end + Math.round(SR * 0.08));
      const chunks = (a) => {
        const parts = [];
        for (let i = 0; i < end; i += 8192) parts.push(btoa(String.fromCharCode(...new Uint8Array(a.slice(i, Math.min(end, i + 8192)).buffer))));
        return parts;
      };
      return { L: chunks(L), R: chunks(R), notes };
    },
    { src, how, SR },
  );
}

const unpack = (parts) => {
  const bufs = parts.map((p) => Buffer.from(p, 'base64'));
  const all = Buffer.concat(bufs);
  return new Float32Array(all.buffer, all.byteOffset, all.length / 4);
};

// tone() notes to MIDI: each waveform on its own track (square, triangle, sine) and
// tubular bells.
function sfxMidi(notes) {
  const ppq = 480;
  const tempo = 120; // one beat = half a second
  const tick = (s) => Math.round((s / 0.5) * ppq);
  const PROGRAM = { square: ['Onda cuadrada', 80], triangle: ['Onda triangular', 79], sine: ['Onda senoidal', 79], sawtooth: ['Onda de sierra', 81], bell: ['Campanas', 14] };
  const tracks = new Map();
  let channel = 0;
  const maxGain = Math.max(...notes.map((n) => n.gain));
  for (const n of notes) {
    const [name, program] = PROGRAM[n.type] ?? PROGRAM.sine;
    if (!tracks.has(name)) tracks.set(name, { name, channel: channel++, program, notes: [] });
    tracks.get(name).notes.push({ tick: tick(n.start), dur: Math.max(10, tick(n.start + n.duration) - tick(n.start)), note: Math.round(69 + 12 * Math.log2(n.freq / 440)), vel: Math.round(50 + (77 * n.gain) / maxGain) });
  }
  return writeMidi({ ppq, tempo, timeSig: [4, 4], tracks: [...tracks.values()] });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const src = readFileSync(new URL('../src/audio/Sound.js', import.meta.url), 'utf8');
  const tmp = mkdtempSync(join(tmpdir(), 'efectos-'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>efectos</title>');
  try {
    for (const [file, how, midi] of EFFECTS) {
      const r = await record(page, src, howOf(how));
      const L = unpack(r.L);
      const R = unpack(r.R);
      let peak = 0;
      for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      const wav = join(tmp, `${file}.wav`);
      writeFileSync(wav, writeWav(L, R, SR));
      // Peak to −3 dB (game SFX are quiet; this makes them clear when played standalone).
      const gainDb = 20 * Math.log10(10 ** (-3 / 20) / (peak || 1));
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-af', `volume=${gainDb.toFixed(2)}dB`, '-c:a', 'libmp3lame', '-b:a', '160k',
        '-metadata', `title=${file}`, '-metadata', 'artist=Encantos de Mi Tierrita', '-metadata', 'album=Encantos de Mi Tierrita (efectos)', join(OUT, `${file}.mp3`)]);
      if (midi) writeFileSync(join(OUT, `${file}.mid`), sfxMidi(r.notes));
      console.log(`${file}: ${(L.length / SR).toFixed(2)} s${midi ? ' + MIDI' : ''}`);
    }
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}
