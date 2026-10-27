// Sonidos sintetizados con Web Audio (sin archivos). El navegador solo deja sonar tras un toque.

// Lo que suena al abrir cada estación (v3.3.2): su oficio, en pocos tipos de sonido.
const STATION_SOUNDS = {
  field: ['farm', 'canefield', 'cacao_grove', 'cornfield', 'guava_grove', 'tobacco_field', 'fique_field', 'rice_field', 'coconut_grove', 'fishing_canoes', 'canaflechal', 'potato_field', 'palm_grove', 'plantain_grove', 'asai_grove', 'barley_field', 'passion_vines', 'azotea_beds', 'aji_field', 'clay_pit', 'fish_ponds', 'mangrove_flats', 'yuca_chagra', 'pargo_boats', 'pirarucu_canoes', 'sheep_pasture', 'hide_yard', 'werregue_palms', 'yanchama_trees', 'composter', 'anthill', 'camino_real'],
  moo: ['pasture', 'cattle_ranch', 'milking_corral', 'paipa_herd', 'llanero_herd'],
  water: ['wetmill', 'pasteurizer', 'cheesery', 'churn', 'brine_pot', 'coconut_press', 'fish_cleaner', 'curdler', 'potato_washer', 'bunch_thresher', 'plantain_dehander', 'asai_thresher', 'paipa_curdler', 'llanero_butcher', 'piangua_washer', 'yuca_peeler', 'wool_washer', 'tannery', 'werregue_stripper', 'bark_soaker'],
  machine: ['huller', 'grinder', 'cane_mill', 'pulverizer', 'cacao_mill', 'sheller', 'corn_huller', 'dough_mill', 'guava_pulper', 'decorticator', 'rice_huller', 'rice_polisher', 'coconut_grater', 'curd_mill', 'potato_peeler', 'palm_press', 'plantain_peeler', 'asai_pulper'],
  whir: ['separator', 'spinner', 'spinning_wheel', 'leather_tooler', 'werregue_twister', 'cloth_painter', 'rice_sorter', 'potato_grader', 'fruit_sterilizer', 'plantain_washer', 'asai_soaker', 'potter_wheel', 'cachama_filleter', 'pargo_filleter', 'pirarucu_filleter'],
  fire: ['roaster', 'pottery_kiln', 'cachama_smoker', 'pargo_smoker', 'moquen', 'almojabana_oven', 'carving_table', 'encocado_pot', 'casabe_budare', 'clay_oven', 'parranda_grill', 'cazuela_kitchen', 'maloca', 'cacao_roaster', 'grill', 'ant_toaster'],
  boil: ['furnace', 'arequipe_pot', 'guava_pot', 'greca', 'cocada_kitchen', 'coconut_fish_kitchen', 'brew_kettle', 'pulp_pasteurizer', 'herb_pestle', 'aji_grinder', 'mote_pot', 'fiber_dyer'],
  wind: ['dryer', 'cacao_dryer', 'caney', 'maltings', 'passion_pulper', 'herb_washer', 'aji_washer', 'airing_rack', 'rice_dryer', 'fish_salter'],
  ferment: ['fermenter', 'tobacco_piles', 'fermenters', 'juice_mixer', 'refrito_pot', 'tucupi_pot'],
  chop: ['butcher', 'clay_kneader', 'cachama_cleaner', 'pargo_cleaner', 'pirarucu_cleaner', 'bocadillo_cutter', 'stripper', 'coconut_peeler', 'fish_filleter', 'fiber_scraper'],
  loom: ['sack_loom', 'basket_shop', 'alpargata_shop', 'bijao_wrapper', 'fiambre_maker', 'cigar_roller', 'ant_cleaner', 'cone_table', 'hamper', 'braiders', 'hat_sewer', 'carder', 'leather_cutter', 'werregue_dyer', 'bark_beater', 'ruana_loom', 'saddler', 'werregue_weaver', 'mask_maker'],
  thud: ['packer', 'molds', 'guava_molds', 'crate_packer', 'tercio_packer', 'gift_wrap', 'box_shop', 'cheese_press', 'criollas_bagger', 'oil_bottler', 'patacon_bagger', 'asai_bagger', 'criollas_boxer', 'oil_boxer', 'patacon_boxer', 'asai_boxer', 'bottler', 'juice_packer', 'alino_packer', 'aji_packer', 'pot_maker', 'pisillo_kitchen', 'fish_drier', 'pirarucu_salter', 'cheese_molds', 'adobadero', 'piangua_cooker', 'yuca_grater', 'cheese_cave', 'vara_grill', 'piangua_sheller', 'tipiti_press', 'rice_bagger', 'rice_stacker'],
  horn: ['export_dock', 'muelle'],
  sizzle: ['fish_fryer', 'criollas_fryer', 'oil_clarifier', 'patacon_fryer', 'asai_blender', 'tienda_esquina', 'empanaderia', 'fritanga_puerto', 'heladeria_asai', 'fogon_getsemani', 'budare', 'arepa_stand', 'fonda'],
  clink: ['coffee_house', 'chocolate_table', 'chocolatier', 'lunch_table', 'souvenir_shop', 'dulceria', 'park_cafe', 'posada', 'costeno_fonda', 'bandeja_kitchen', 'parador', 'restaurante_muralla', 'jarras', 'cachama_kitchen', 'tapao_kitchen', 'pirarucu_kitchen', 'piquete_table', 'lunch_llanero', 'piangua_lunch', 'desayuno_table', 'tienda_nobsa', 'tienda_llanera', 'tienda_pacifico', 'tienda_yanchama', 'terraza_plaza', 'kiosco_parque', 'cevicheria', 'restaurante_ribera', 'hospedaje_colonial', 'hotel_campestre', 'hotel_bahia', 'hotel_selva', 'mercado_sabado', 'plaza_mercado', 'galeria_pueblo_nuevo', 'mercado_puerto', 'canastos_paseo', 'morrales_viaje', 'loncheras_lancha', 'provisiones_canoa', 'salida_fosil', 'salida_cano', 'salida_ballenas', 'salida_delfines', 'hotel_colonial', 'cocina_bahia', 'loncheras'],
  pour: ['salter'],
  engine: ['dispatch'],
};
const SOUND_OF = Object.fromEntries(Object.entries(STATION_SOUNDS).flatMap(([kind, ids]) => ids.map((id) => [id, kind])));
export const stationSound = (id) => SOUND_OF[id] ?? 'click';

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

  // ---------- Al abrir una estación (v3.3.2): un sonido de su oficio ----------

  // `id`: la estación (o 'dispatch' para la bodega). No se repite más seguido que cada 0,3 s.
  station(id) {
    if (!this.ready('station', 0.3)) return;
    const kind = stationSound(id);
    if (kind === 'click') return this.tone(880, 0, 0.06, { type: 'triangle', gain: 0.25, slide: 0.6 });
    STATION_PLAY[kind].call(this, id);
  }
}

// Cada tipo de sonido (con `this` = Sound).
const STATION_PLAY = {
  // Hojas que se mecen y un pájaro.
  field() {
    this.noise(0, 0.5, { gain: 0.05, freq: 3200, q: 0.6 });
    this.noise(0.35, 0.45, { gain: 0.04, freq: 2600, q: 0.6 });
    const base = 2400 + Math.random() * 800;
    for (let i = 0; i < 3; i++) this.tone(base, 0.25 + i * 0.09, 0.07, { gain: 0.05, slide: 1.4 });
  },
  // Mugido (más grave el de los novillos del Hato).
  moo(id) {
    const f = id === 'cattle_ranch' || id === 'milking_corral' ? 105 : 140;
    this.voice(f, f * 0.78, 0, 1.1, { gain: 0.07, filter: 500, q: 0.8, vibrato: 5 });
  },
  // Agua que corre y gotea.
  water() {
    this.noise(0, 0.7, { gain: 0.05, freq: 1400, q: 0.8 });
    for (let i = 0; i < 4; i++) this.tone(500 + Math.random() * 600, 0.05 + i * 0.13, 0.07, { gain: 0.05, slide: 1.8 });
  },
  // Motor con su traqueteo.
  machine() {
    this.noise(0, 0.9, { gain: 0.1, freq: 220, q: 0.7, type: 'lowpass', pulse: 9 });
    this.tone(70, 0, 0.9, { type: 'square', gain: 0.04 });
  },
  // Algo que gira cada vez más rápido (la descremadora, la rueda de hilar).
  whir() {
    this.voice(180, 520, 0, 0.7, { gain: 0.06, filter: 700, q: 1 });
  },
  // Fuego que crepita.
  fire() {
    this.noise(0, 0.8, { gain: 0.03, freq: 500, q: 0.6, type: 'lowpass' });
    for (let i = 0; i < 9; i++) this.noise(Math.random() * 0.75, 0.03, { gain: 0.08, freq: 2500 + Math.random() * 2000, q: 2 });
  },
  // Paila (o greca) hirviendo.
  boil() {
    for (let i = 0; i < 7; i++) this.tone(220 + Math.random() * 260, i * 0.09 + Math.random() * 0.04, 0.07, { gain: 0.05, slide: 1.9 });
    this.noise(0, 0.6, { gain: 0.025, freq: 3000, q: 0.5 });
  },
  // Viento que seca (marquesinas, caney, tendedero).
  wind() {
    this.noise(0, 1.2, { gain: 0.06, freq: 500, q: 0.5, type: 'lowpass' });
    this.noise(0.2, 0.8, { gain: 0.03, freq: 1200, q: 1.5 });
  },
  // Fermentación: burbujas graves y lentas.
  ferment() {
    for (let i = 0; i < 4; i++) this.tone(110 + Math.random() * 60, i * 0.2, 0.12, { gain: 0.07, slide: 1.6 });
  },
  // Cuchillo sobre la tabla.
  chop() {
    for (let i = 0; i < 3; i++) {
      this.tone(240, i * 0.16, 0.05, { type: 'square', gain: 0.12, slide: 0.5 });
      this.noise(i * 0.16, 0.04, { gain: 0.06, freq: 3000, q: 1 });
    }
  },
  // Telar o mesa de trabajo: clac-clac de madera.
  loom() {
    [620, 460, 620, 460].forEach((f, i) => this.tone(f, i * 0.14, 0.04, { type: 'triangle', gain: 0.18 }));
  },
  // Cajas y bultos que se apilan.
  thud() {
    for (let i = 0; i < 2; i++) {
      this.tone(120, i * 0.22, 0.16, { gain: 0.3, slide: 0.5 });
      this.noise(i * 0.22, 0.08, { gain: 0.04, freq: 400, q: 1 });
    }
  },
  // La sirena del barco en el puerto.
  horn() {
    this.voice(118, 112, 0, 1.2, { gain: 0.1, filter: 380, q: 0.9 });
    this.voice(148, 140, 0, 1.2, { gain: 0.05, filter: 450, q: 0.9 });
  },
  // Algo que se asa en el budare o la plancha.
  sizzle() {
    this.noise(0, 0.9, { gain: 0.05, freq: 5000, q: 0.4, type: 'highpass', pulse: 13 });
  },
  // Pocillos y platos.
  clink() {
    this.tone(2100, 0, 0.18, { type: 'triangle', gain: 0.1 });
    this.tone(2650, 0.12, 0.22, { type: 'triangle', gain: 0.08 });
  },
  // Sal que cae.
  pour() {
    this.noise(0, 0.6, { gain: 0.05, freq: 6000, q: 0.8 });
  },
  // El Willys que arranca y pita.
  engine() {
    this.noise(0, 0.8, { gain: 0.09, freq: 180, q: 0.7, type: 'lowpass', pulse: 18 });
    this.tone(440, 0.55, 0.12, { type: 'square', gain: 0.06 });
    this.tone(440, 0.72, 0.12, { type: 'square', gain: 0.06 });
  },
};
