import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID } from '../src/data/album.js';
import { DECOR } from '../src/data/decor.js';
import { buySticker, chosenDecor, pageDone, pickDecor, profileOf, quoteSticker } from '../src/sim/renown.js';
import { createInitialState } from '../src/sim/state.js';
import { restartState } from '../src/sim/legacy.js';

test('el álbum tiene seis páginas de seis láminas, con ids únicos y textos cortos', () => {
  assert.equal(ALBUM.length, 6);
  for (const page of ALBUM) assert.equal(page.stickers.length, 6, page.id);
  assert.equal(Object.keys(STICKERS_BY_ID).length, 36);
  for (const s of Object.values(STICKERS_BY_ID)) assert.ok(s.text.length <= 90, `${s.id}: ${s.text.length}`);
});

test('las láminas se pagan con Renombre, una vez, y la página llena da premio', () => {
  const state = createInitialState();
  const p = profileOf(state);
  const page = ALBUM[0];
  assert.equal(quoteSticker(p, page.stickers[0].id).reason, 'renown');
  p.renown = 100;
  let last;
  for (const s of page.stickers) last = buySticker(p, s.id);
  const cost = page.stickers.reduce((n, s) => n + s.cost, 0);
  assert.equal(last.bonus, PAGE_BONUS);
  assert.equal(p.renown, 100 - cost + PAGE_BONUS);
  assert.ok(pageDone(p, page.id));
  assert.equal(buySticker(p, page.stickers[0].id), null, 'ya está pegada');
});

test('la decoración: lo de siempre es gratis, lo demás se compra una vez y se puede volver a elegir', () => {
  const state = createInitialState();
  const p = profileOf(state);
  for (const cat of DECOR) assert.equal(chosenDecor(p)[cat.id].id, cat.options[0].id);
  assert.equal(pickDecor(p, 'willys', 'rojo'), false, 'sin Renombre');
  p.renown = 3;
  assert.ok(pickDecor(p, 'willys', 'rojo'));
  assert.equal(p.renown, 0);
  assert.equal(chosenDecor(p).willys.id, 'rojo');
  assert.ok(pickDecor(p, 'willys', 'verde'));
  assert.ok(pickDecor(p, 'willys', 'rojo'), 'ya es suyo: no se vuelve a pagar');
  assert.equal(p.renown, 0);
  // Pasa a la partida nueva al reiniciar.
  const next = restartState(state);
  assert.equal(chosenDecor(next.profile).willys.id, 'rojo');
  assert.deepEqual(next.profile.album, p.album);
});
