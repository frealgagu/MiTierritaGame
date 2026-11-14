// Original background music (v1.8.7): each region piece (songs.js) is synthesized in-game without
// audio files via Karplus-Strong strings (compose.js), looping softly with subtle room reverb.
// Browsers block audio before user gesture, so playback begins on first tap.
import { SONGS } from './songs.js';
import { createSong, normalize, renderBar } from './compose.js';

const VOLUME = 0.5; // music gain at 100% slider setting (defaults to 40%: see main.js)
const FADE_S = 2.5;
const RATE = 32000; // sample rate for rendered song (plenty for soft background strings and faster to synthesize)
const REVERB = 0.22; // wet room reverb mix ratio

export class Music {
  // region: which piece to play.
  constructor(enabled, region = 'cafetero') {
    this.enabled = enabled;
    this.volume = 1; // slider value (v3.66), from 0 to 1
    this.region = region;
    this.ctx = null;
    this.source = null;
    this.buffers = {};
    const start = () => {
      window.removeEventListener('pointerdown', start);
      this.started = true;
      if (this.enabled) this.play();
    };
    window.addEventListener('pointerdown', start);
    // Pause when backgrounded (other tab or locked phone).
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.enabled && this.started) this.ctx.resume();
    });
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = (this.ctx = new AC());
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    // Room reverb: decaying noise impulse response over 1.5 seconds.
    const reverb = ctx.createConvolver();
    const len = Math.round(ctx.sampleRate * 1.5);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = ir.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = REVERB;
    this.input = ctx.createGain();
    this.input.connect(this.gain);
    this.input.connect(reverb).connect(wet).connect(this.gain);
    return ctx;
  }

  // Builds the track measure by measure, yielding between bars so the main thread never stutters.
  async build(region) {
    if (this.buffers[region]) return this.buffers[region];
    const song = SONGS[region] ?? SONGS.cafetero;
    const buf = createSong(song, RATE);
    for (let i = 0; i < song.chords.length; i++) {
      renderBar(buf, i);
      await new Promise((r) => setTimeout(r, 0));
    }
    normalize(buf);
    const audio = this.ctx.createBuffer(2, buf.length, RATE);
    audio.getChannelData(0).set(buf.left);
    audio.getChannelData(1).set(buf.right);
    return (this.buffers[region] = audio);
  }

  async play() {
    const ctx = this.ensure();
    if (!ctx) return;
    ctx.resume();
    this.fadeTo(VOLUME * this.volume);
    if (this.source || this.building) return;
    this.building = true;
    const audio = await this.build(this.region);
    this.building = false;
    if (this.source) return;
    this.source = ctx.createBufferSource();
    this.source.buffer = audio;
    this.source.loop = true;
    this.source.connect(this.input);
    this.source.start();
  }

  // Crossfade to the new region piece when switching regions.
  setRegion(region) {
    if (region === this.region) return;
    this.region = region;
    if (!this.source) return;
    const old = this.source;
    this.source = null;
    this.fadeTo(0);
    setTimeout(() => {
      old.stop();
      if (this.enabled && this.started) this.play();
    }, FADE_S * 1000);
  }

  // Volume from 0 to 1: at 0 mutes and suspends; adjusting takes effect immediately.
  setVolume(v) {
    const was = this.enabled;
    this.volume = v;
    if (v > 0 !== was) return this.setEnabled(v > 0);
    if (v > 0 && this.started) this.fadeTo(VOLUME * v, 0.15);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.started) return;
    if (on) this.play();
    else {
      this.fadeTo(0);
      // Stay suspended at zero volume to save CPU: suspend after fade-out finishes.
      setTimeout(() => !this.enabled && this.ctx?.suspend(), FADE_S * 1000 + 100);
    }
  }

  fadeTo(target, seconds = FADE_S) {
    const g = this.gain?.gain;
    if (!g) return;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + seconds);
  }
}
