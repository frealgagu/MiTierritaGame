import test from 'node:test';
import assert from 'node:assert/strict';
import { TIPS, gatePasses, gateQuestion, tipMode } from '../src/tip.js';

test('tinto: tres productos con identificadores válidos para Play Console', () => {
  assert.deepEqual(TIPS.map((t) => t.id), ['tinto', 'arepa', 'almuerzo']);
  for (const t of TIPS) assert.match(t.id, /^[a-z0-9][a-z0-9._]*$/);
});

test('tinto: la barrera es un número de dos cifras por uno de una', () => {
  for (const r of [0, 0.5, 0.999]) {
    const q = gateQuestion(() => r);
    const [a, b] = q.text.split(' × ').map(Number);
    assert.ok(a >= 12 && a <= 19 && b >= 6 && b <= 9, q.text);
    assert.equal(q.answer, a * b);
    assert.ok(gatePasses(q, ` ${a * b} `));
    assert.ok(!gatePasses(q, String(a * b + 1)));
    assert.ok(!gatePasses(q, ''));
  }
});

test('tinto: cobros de Google solo en la versión de Play; Ko-fi solo en la web con enlace', () => {
  assert.equal(tipMode({ native: true, playStore: true }), 'play');
  assert.equal(tipMode({ native: true, playStore: false, kofi: 'https://ko-fi.com/x' }), null);
  assert.equal(tipMode({ native: false, playStore: false, kofi: '' }), null);
  assert.equal(tipMode({ native: false, playStore: false, kofi: 'https://ko-fi.com/x' }), 'web');
});

test('tinto: si Google Play no responde, el pedido de precios se corta', async () => {
  const { withTimeout } = await import('../src/tip.js');
  await assert.rejects(withTimeout(new Promise(() => {}), 20), /timeout/);
  assert.equal(await withTimeout(Promise.resolve(7), 20), 7);
});
