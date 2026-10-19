// Música de fondo propia (v1.8.7): la pieza de la región (songs.js) se arma en el juego, sin archivos,
// con cuerdas sintetizadas (compose.js), y suena en bucle y bajito con un poco de eco de sala. Como el
// navegador no deja sonar nada antes de un toque, arranca con el primer toque.
import { SONGS } from './songs.js';
import { createSong, normalize, renderBar } from './compose.js';

const VOLUME = 0.5;
const FADE_S = 2.5;
const RATE = 32000; // muestras por segundo de la pieza (sobra para cuerdas de fondo y se arma más rápido)
const REVERB = 0.22; // cuánto eco de sala se mezcla

export class Music {
  // region: qué pieza toca (por ahora solo el Eje Cafetero).
  constructor(enabled, region = 'cafetero') {
    this.enabled = enabled;
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
    // En segundo plano (otra pestaña, el móvil bloqueado) se pausa.
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
    // Eco de sala: una respuesta de ruido que se apaga en segundo y medio.
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

  // Arma la pieza compás por compás, cediendo el turno entre uno y otro para no trabar el juego.
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
    this.fadeTo(VOLUME);
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

  // Al pasar a otra región, su pieza: baja la que suena y sube la otra.
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

  setEnabled(on) {
    this.enabled = on;
    if (!this.started) return;
    if (on) this.play();
    else {
      this.fadeTo(0);
      // Callada no gasta: se suspende al terminar de bajar.
      setTimeout(() => !this.enabled && this.ctx?.suspend(), FADE_S * 1000 + 100);
    }
  }

  fadeTo(target) {
    const g = this.gain?.gain;
    if (!g) return;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, now + FADE_S);
  }
}
