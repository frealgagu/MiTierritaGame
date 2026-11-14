import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SONGS } from '../src/audio/songs.js';
import { createSong, renderBar, renderSong } from '../src/audio/compose.js';
import { EFFECTS } from '../tools/audio-list.mjs';
import { ORDER, PUBLIC, fileOf } from '../tools/music-export.mjs';
import { writeMidi } from '../tools/midi.mjs';

// Downloadable music and sounds (v3.71, web/musica). If a track or sound effect changes,
// volver a exportarlos: node tools/music-export.mjs && node tools/sfx-export.mjs && node tools/music-page.mjs
const DIR = new URL('../web/musica/', import.meta.url).pathname;

test('every piece has its MP3 and its MIDI, and the page lists it (not yet those of hidden regions)', () => {
  assert.deepEqual([...ORDER].sort(), Object.keys(SONGS).sort());
  const page = readFileSync(`${DIR}index.html`, 'utf8');
  // Regions still hidden (Bogotá, while under construction) are not published yet.
  for (const region of PUBLIC) {
    for (const ext of ['mp3', 'mid']) assert.ok(existsSync(`${DIR}${fileOf(region)}.${ext}`), `${fileOf(region)}.${ext}`);
    assert.ok(page.includes(`"file":"${fileOf(region)}"`), fileOf(region));
  }
});

test('every sound effect has its MP3 (and its MIDI if it is made of notes), and the page lists it', () => {
  const page = readFileSync(`${DIR}index.html`, 'utf8');
  for (const [file, , midi] of EFFECTS) {
    assert.ok(existsSync(`${DIR}efectos/${file}.mp3`), file);
    assert.equal(existsSync(`${DIR}efectos/${file}.mid`), midi, file);
    assert.ok(page.includes(`"file":"${file}"`), file);
  }
});

test('recording the notes for the MIDI does not change what plays', () => {
  const song = SONGS.costa;
  const plain = renderSong(song, 8000);
  const buf = createSong(song, 8000);
  buf.events = [];
  for (let i = 0; i < song.chords.length; i++) renderBar(buf, i);
  let max = 0;
  for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf.left[i]));
  const k = 0.85 / max;
  for (let i = 0; i < buf.length; i += 997) assert.ok(Math.abs(buf.left[i] * k - plain.left[i]) < 1e-6);
  assert.ok(buf.events.length > 500);
  assert.ok(buf.events.every((e) => e.voice));
});

test('the MIDI: header, tracks and notes that stop', () => {
  const mid = writeMidi({ ppq: 480, tempo: 100, timeSig: [3, 4], tracks: [{ name: 'Bandola', channel: 0, program: 25, notes: [{ tick: 0, dur: 960, note: 64, vel: 100 }, { tick: 480, dur: 480, note: 64, vel: 90 }] }] });
  assert.equal(mid.subarray(0, 4).toString(), 'MThd');
  assert.equal(mid.readUInt16BE(10), 2); // the tempo track and the bandola track
  const ons = [...mid].filter((b, i) => b === 0x90 && mid[i + 1] === 64).length;
  const offs = [...mid].filter((b, i) => b === 0x80 && mid[i + 1] === 64).length;
  assert.equal(ons, 2);
  assert.equal(offs, 2);
});
