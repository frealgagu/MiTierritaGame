// Sonidos sintetizados con Web Audio (sin archivos). El navegador solo deja sonar tras un toque.
const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392 };

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastPlayed = {};
    // El contexto de audio se crea con el primer toque del jugador.
    const unlock = () => {
      this.ensure();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setEnabled(on) {
    this.enabled = on;
  }

  // Una nota con ataque y caída cortos.
  tone(freq, start, duration, { type = 'sine', gain = 0.5, slide = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + duration);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // No repite el mismo sonido más seguido que `gap` segundos.
  ready(name, gap) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < gap) return false;
    this.lastPlayed[name] = now;
    return true;
  }

  click() {
    if (!this.ready('click', 0.05)) return;
    this.tone(880, 0, 0.06, { type: 'triangle', gain: 0.25, slide: 0.6 });
  }

  coin() {
    if (!this.ready('coin', 0.25)) return;
    this.tone(NOTES.E6, 0, 0.08, { type: 'square', gain: 0.12 });
    this.tone(NOTES.G5 * 2, 0.07, 0.18, { type: 'square', gain: 0.12 });
  }

  levelUp() {
    if (!this.ready('level', 0.1)) return;
    [NOTES.C5, NOTES.E5, NOTES.G5].forEach((f, i) => this.tone(f, i * 0.06, 0.16, { type: 'triangle', gain: 0.35 }));
  }

  milestone() {
    if (!this.ready('milestone', 0.5)) return;
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6].forEach((f, i) => this.tone(f, i * 0.08, 0.3, { type: 'triangle', gain: 0.4 }));
  }

  build() {
    if (!this.ready('build', 0.5)) return;
    // Tres golpes de martillo y un acorde.
    for (let i = 0; i < 3; i++) this.tone(180, i * 0.12, 0.08, { type: 'square', gain: 0.2, slide: 0.5 });
    [NOTES.G4, NOTES.C5, NOTES.E5, NOTES.G5].forEach((f) => this.tone(f, 0.4, 0.6, { type: 'triangle', gain: 0.22 }));
  }

  // Trino de pájaro (ambiente de día).
  chirp() {
    if (!this.ready('chirp', 3)) return;
    const base = 2200 + Math.random() * 1200;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone(base, i * 0.09, 0.07, { gain: 0.05, slide: 1.4 });
  }

  // Grillo (ambiente de noche).
  cricket() {
    if (!this.ready('cricket', 1.5)) return;
    for (let i = 0; i < 4; i++) this.tone(4200, i * 0.05, 0.03, { type: 'square', gain: 0.015 });
  }

  // ---------- Ambiente de cada zona (v1.8): voces de animales, el trapiche y las campanas ----------

  // Un oscilador que pasa de f0 a f1 por un filtro: sirve para las voces de los animales.
  voice(f0, f1, start, duration, { type = 'sawtooth', gain = 0.08, filter = 900, q = 1, vibrato = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + duration);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = vibrato;
      depth.gain.value = f0 * 0.03;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + duration + 0.05);
    }
    bp.type = 'bandpass';
    bp.frequency.value = filter;
    bp.Q.value = q;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.08, duration / 3));
    env.gain.setValueAtTime(gain, t + duration * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(bp).connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Ruido filtrado (roce, chispas, cacareo).
  noise(start, duration, { gain = 0.05, freq = 1000, q = 1, type = 'bandpass', pulse = 0 } = {}) {
    const ctx = this.ctx;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    env.gain.setValueAtTime(gain, t + duration * 0.8);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    // Golpeteo (el trapiche que da vueltas): el volumen sube y baja.
    if (pulse) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = pulse;
      depth.gain.value = gain * 0.6;
      lfo.connect(depth).connect(env.gain);
      lfo.start(t);
      lfo.stop(t + duration + 0.05);
    }
    src.connect(f).connect(env).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  // Vaca: un mugido largo que baja.
  moo() {
    if (!this.ready('moo', 6)) return;
    const f = 130 + Math.random() * 30;
    this.voice(f, f * 0.78, 0, 1.3, { gain: 0.06, filter: 500, q: 0.8, vibrato: 5 });
  }

  // Gallo al amanecer: «ki-ki-ri-kí».
  rooster() {
    if (!this.ready('rooster', 20)) return;
    const parts = [[620, 700, 0.12], [700, 780, 0.12], [760, 900, 0.18], [900, 620, 0.55]];
    let at = 0;
    for (const [a, b, d] of parts) {
      this.voice(a, b, at, d, { type: 'square', gain: 0.075, filter: 1600, q: 2 });
      at += d + 0.03;
    }
  }

  // Gallinas: cacareo corto.
  cluck() {
    if (!this.ready('cluck', 4)) return;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      this.voice(420, 330, i * 0.16, 0.09, { type: 'square', gain: 0.07, filter: 1200, q: 3 });
      this.noise(i * 0.16, 0.06, { gain: 0.04, freq: 1800, q: 4 });
    }
  }

  // Perro: dos ladridos.
  bark() {
    if (!this.ready('bark', 10)) return;
    for (let i = 0; i < 2; i++) {
      this.voice(340, 220, i * 0.28, 0.13, { gain: 0.06, filter: 800, q: 1.5 });
      this.noise(i * 0.28, 0.1, { gain: 0.03, freq: 900, q: 1 });
    }
  }

  // Trapiche moliendo: un retumbe que va y viene.
  grind() {
    if (!this.ready('grind', 6)) return;
    this.noise(0, 2.2, { gain: 0.11, freq: 160, q: 0.7, type: 'lowpass', pulse: 3 });
  }

  // Miel hirviendo en las pailas.
  bubble() {
    if (!this.ready('bubble', 3)) return;
    for (let i = 0; i < 4; i++) this.tone(260 + Math.random() * 200, i * 0.11 + Math.random() * 0.05, 0.06, { gain: 0.04, slide: 1.8 });
  }

  // Loro o guacamaya del cacaotal.
  parrot() {
    if (!this.ready('parrot', 8)) return;
    this.voice(900, 1300, 0, 0.22, { gain: 0.09, filter: 1800, q: 2 });
    this.voice(1250, 950, 0.28, 0.18, { gain: 0.08, filter: 1800, q: 2 });
  }

  // Campanas de la iglesia del Pueblo: `strokes` campanadas.
  bells(strokes = 3) {
    if (!this.ready('bells', 10)) return;
    const ctx = this.ctx;
    for (let i = 0; i < strokes; i++) {
      const t = ctx.currentTime + i * 1.1;
      // Parciales de campana (no armónicos), con caída larga.
      for (const [ratio, g] of [[1, 0.038], [2.0, 0.019], [2.4, 0.015], [3.0, 0.009], [4.2, 0.006]]) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.frequency.value = 330 * ratio;
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(g, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        osc.connect(env).connect(this.master);
        osc.start(t);
        osc.stop(t + 2.5);
      }
    }
  }
}
