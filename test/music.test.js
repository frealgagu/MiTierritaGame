import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, midi, parseChord } from '../src/audio/songs.js';
import { renderSong } from '../src/audio/compose.js';

test('notes and chords are read correctly', () => {
  assert.equal(midi('A4'), 69);
  assert.equal(midi('F#5'), 78);
  assert.deepEqual(parseChord('B7').tones, [11, 3, 6, 9]);
  assert.deepEqual(parseChord('Em').tones, [4, 7, 11]);
});

test('every piece has one melody per bar, within its bar', () => {
  for (const [id, song] of Object.entries(SONGS)) {
    assert.equal(song.melody.length, song.chords.length, id);
    for (const [k, bar] of song.melody.entries()) {
      for (const [e, n, note] of bar) {
        assert.ok(e >= 0 && e + n <= (song.beats ?? 3) * 2, `${id}, bar ${k + 1}: ${note} goes beyond the bar`);
        assert.ok(midi(note) >= 60 && midi(note) <= 84, `${id}: ${note} out of range`);
      }
    }
    for (const c of song.chords) assert.ok(parseChord(c).tones.length >= 3, c);
  }
});

for (const id of ['cafetero', 'costa', 'boyaca', 'llanos', 'pacifico', 'amazonas', 'bogota', 'sanandres']) test(`la pieza (${id}) suena, no satura y dura lo que dicen sus compases`, () => {
  const sr = 16000;
  const song = SONGS[id];
  const buf = renderSong(song, sr);
  assert.equal(buf.length, Math.round((60 / song.bpm) * (song.beats ?? 3) * sr) * song.chords.length);
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    assert.ok(Number.isFinite(buf.left[i]) && Number.isFinite(buf.right[i]));
    peak = Math.max(peak, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
    sum += buf.left[i] ** 2;
  }
  assert.ok(peak <= 0.851, `peak ${peak}`);
  // No silences: every bar has sound.
  const bar = buf.length / song.chords.length;
  for (let k = 0; k < song.chords.length; k++) {
    let e = 0;
    for (let i = k * bar; i < (k + 1) * bar; i++) e += buf.left[i] ** 2;
    assert.ok(Math.sqrt(e / bar) > 0.01, `bar ${k + 1} is silent`);
  }
  assert.ok(Math.sqrt(sum / buf.length) > 0.03);
});
