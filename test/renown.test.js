import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID } from '../src/data/album.js';
import { DECOR } from '../src/data/decor.js';
import { buySticker, chosenDecor, pageDone, pickDecor, profileOf, quoteSticker } from '../src/sim/renown.js';
import { createInitialState } from '../src/sim/state.js';
import { restartState } from '../src/sim/legacy.js';

test('cada región tiene su álbum de seis páginas de seis láminas, con ids únicos y textos cortos (v3.10)', () => {
  assert.equal(ALBUM.length, 12);
  for (const region of ['cafetero', 'santander']) assert.equal(ALBUM.filter((pg) => pg.region === region).length, 6, region);
  assert.equal(new Set(ALBUM.map((pg) => pg.id)).size, 12);
  for (const page of ALBUM) assert.equal(page.stickers.length, 6, page.id);
  assert.equal(Object.keys(STICKERS_BY_ID).length, 72);
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

test('el Renombre ganado de por vida no baja al gastar, y cada reinicio da 10 ⭐ (v3.11)', async () => {
  const { gainRenown, RESTART_RENOWN } = await import('../src/sim/renown.js');
  const { restartState } = await import('../src/sim/legacy.js');
  const { openRegions } = await import('../src/sim/regions.js');
  const root = createInitialState(0);
  const p = profileOf(root);
  gainRenown(p, 5);
  p.renown -= 3; // se gasta
  assert.deepEqual([p.renown, p.renownTotal], [2, 5]);
  const next = restartState(root);
  assert.equal(RESTART_RENOWN, 10);
  assert.deepEqual([next.profile.renown, next.profile.renownTotal], [12, 15]);
  // El de otra región se suma al perfil del jugador.
  next.zones.pueblo.complete = true;
  openRegions(next);
  restartState(next.regions.santander, 0, next.profile);
  assert.deepEqual([next.profile.renown, next.profile.renownTotal], [22, 25]);
});

test('una partida de antes de la v3.11 reconstruye su Renombre ganado en total', async () => {
  const { saveGame, loadGame } = await import('../src/core/SaveSystem.js');
  const { ALBUM } = await import('../src/data/album.js');
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const root = createInitialState(0);
  delete root.profile.renownTotal;
  root.profile.renown = 1;
  root.profile.history = [{ event: 'broca', round: 1, medal: 'gold' }, { event: 'molienda', round: 1, medal: 'bronze' }];
  root.profile.logros = { pueblo: 1, maestro: 2 }; // 2 + (4 + 8)
  root.profile.album = ALBUM[0].stickers.map((s) => s.id); // una página: 3
  saveGame(root);
  assert.equal(loadGame().profile.renownTotal, 4 + 1 + 2 + 12 + 3);
});
