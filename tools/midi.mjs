// Escritor de archivos MIDI (formato 1) sin dependencias (v3.71). Lo usan tools/music-export.mjs y
// tools/sfx-export.mjs.
//   writeMidi({ ppq, tempo, timeSig: [num, den], tracks: [{ name, channel, program, notes: [{ tick, dur, note, vel }] }] })
// devuelve un Buffer con el archivo .mid. El canal 9 es el de percusión (General MIDI), sin cambio de programa.

const vlq = (n) => {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
};
const text = (s) => [...Buffer.from(s, 'utf8')];
const chunk = (id, bytes) => {
  const head = Buffer.alloc(8);
  head.write(id, 0, 'ascii');
  head.writeUInt32BE(bytes.length, 4);
  return Buffer.concat([head, Buffer.from(bytes)]);
};

// Los eventos de una pista, ya con el tiempo delta. Las notas iguales que se pisan se cortan donde empieza
// la siguiente, y en un mismo instante van primero los apagados.
function trackBytes(events) {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const bytes = [];
  let last = 0;
  for (const e of events) {
    bytes.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  bytes.push(0, 0xff, 0x2f, 0);
  return bytes;
}

export function writeMidi({ ppq = 480, tempo = 120, timeSig = [4, 4], tracks }) {
  const header = Buffer.alloc(6);
  header.writeUInt16BE(1, 0);
  header.writeUInt16BE(tracks.length + 1, 2);
  header.writeUInt16BE(ppq, 4);
  const usPerBeat = Math.round(60e6 / tempo);
  const meta = [
    { tick: 0, order: 0, data: [0xff, 0x51, 3, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff] },
    { tick: 0, order: 0, data: [0xff, 0x58, 4, timeSig[0], Math.log2(timeSig[1]), 24, 8] },
  ];
  const chunks = [chunk('MThd', [...header]), chunk('MTrk', trackBytes(meta))];
  for (const t of tracks) {
    const ch = t.channel;
    const name = text(t.name);
    const events = [{ tick: 0, order: 0, data: [0xff, 0x03, ...vlq(name.length), ...name] }];
    if (ch !== 9) events.push({ tick: 0, order: 0, data: [0xc0 | ch, t.program] });
    const notes = [...t.notes].sort((a, b) => a.tick - b.tick);
    // Cada nota termina antes de que vuelva a sonar la misma (si no, el reproductor la apagaría antes).
    const nextOn = new Map();
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const next = nextOn.get(n.note);
      if (next !== undefined && n.tick + n.dur > next) n.dur = Math.max(1, next - n.tick);
      nextOn.set(n.note, n.tick);
    }
    for (const n of notes) {
      events.push({ tick: n.tick, order: 2, data: [0x90 | ch, n.note, n.vel] });
      events.push({ tick: n.tick + n.dur, order: 1, data: [0x80 | ch, n.note, 0] });
    }
    chunks.push(chunk('MTrk', trackBytes(events)));
  }
  return Buffer.concat(chunks);
}

// Un WAV estéreo de 32 bits en coma flotante (para pasarlo a ffmpeg sin perder nada).
export function writeWav(left, right, sr) {
  const n = left.length;
  const data = Buffer.alloc(n * 8);
  for (let i = 0; i < n; i++) {
    data.writeFloatLE(left[i], i * 8);
    data.writeFloatLE(right[i], i * 8 + 4);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'ascii');
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8, 'ascii');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); // coma flotante
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * 8, 28);
  h.writeUInt16LE(8, 32);
  h.writeUInt16LE(32, 34);
  h.write('data', 36, 'ascii');
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
