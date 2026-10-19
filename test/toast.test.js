import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Un #toast de mentiras y un reloj que se adelanta a mano.
const el = { hidden: true, textContent: '', dataset: {}, addEventListener(type, fn) { this.onclick = fn; } };
globalThis.document = { getElementById: () => el };
mock.timers.enable({ apis: ['setTimeout', 'Date'] });
const { toast, readingTime } = await import('../src/ui/toast.js');

test('lo que dice una persona dura según lo largo; un aviso corto no lo borra y otro comentario espera', () => {
  const long = '👴 Don Aurelio: ' + 'La Hornilla está esperando producto: hay que mejorar las estaciones anteriores.';
  assert.ok(readingTime(long) > 9000, 'un comentario largo pasa de 9 s');
  toast(long, 6000, { speech: true });
  assert.equal(el.textContent, long);
  mock.timers.tick(4000);
  toast('🎯 ¡Objetivo cumplido!', 3000);
  assert.equal(el.textContent, '🎯 ¡Objetivo cumplido!');
  toast('👴 Don Aurelio: otra cosa', 6000, { speech: true });
  mock.timers.tick(3000);
  assert.equal(el.textContent, long, 'vuelve el comentario que se tapó');
  mock.timers.tick(readingTime(long) - 4000);
  assert.equal(el.textContent, '👴 Don Aurelio: otra cosa', 'y luego el que esperaba');
  el.onclick();
  assert.equal(el.hidden, true, 'tocarlo lo cierra');
});
