import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALBUM, PAGE_BONUS, STICKERS_BY_ID } from '../src/data/album.js';
import { DECOR } from '../src/data/decor.js';
import { buySticker, chosenDecor, pageDone, pickDecor, profileOf, quoteSticker } from '../src/sim/renown.js';
import { createInitialState } from '../src/sim/state.js';
import { restartState } from '../src/sim/legacy.js';

test('every region has its album of six pages of six stickers, with unique ids and short texts (v3.10)', () => {
  assert.equal(ALBUM.length, 63);
  for (const region of ['cafetero', 'santander', 'costa', 'boyaca', 'llanos', 'pacifico', 'amazonas', 'tolima', 'cundinamarca', 'bogota']) assert.equal(ALBUM.filter((pg) => pg.region === region).length, 6, region);
  // (v5.5) The special zone, a single zone, has three pages: the sea, Raizal culture, and the food.
  assert.equal(ALBUM.filter((pg) => pg.region === 'sanandres').length, 3);
  assert.equal(new Set(ALBUM.map((pg) => pg.id)).size, 63);
  for (const page of ALBUM) assert.equal(page.stickers.length, 6, page.id);
  assert.equal(Object.keys(STICKERS_BY_ID).length, 378);
  for (const s of Object.values(STICKERS_BY_ID)) assert.ok(s.text.length <= 90, `${s.id}: ${s.text.length}`);
});

test('stickers are paid with Renown, once, and the full page gives a prize', () => {
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
  assert.equal(buySticker(p, page.stickers[0].id), null, 'it is already stuck in');
});

test('decoration: the default is free, the rest is bought once and can be chosen again', () => {
  const state = createInitialState();
  const p = profileOf(state);
  for (const cat of DECOR) assert.equal(chosenDecor(p)[cat.id].id, cat.options[0].id);
  assert.equal(pickDecor(p, 'willys', 'rojo'), false, 'without Renown');
  p.renown = 3;
  assert.ok(pickDecor(p, 'willys', 'rojo'));
  assert.equal(p.renown, 0);
  assert.equal(chosenDecor(p).willys.id, 'rojo');
  assert.ok(pickDecor(p, 'willys', 'verde'));
  assert.ok(pickDecor(p, 'willys', 'rojo'), 'it is already owned: it is not paid again');
  assert.equal(p.renown, 0);
  // Carries over to the new playthrough on reset.
  const next = restartState(state);
  assert.equal(chosenDecor(next.profile).willys.id, 'rojo');
  assert.deepEqual(next.profile.album, p.album);
});

test('lifetime Renown earned does not go down on spending, and each restart gives 10 ⭐ (v3.11)', async () => {
  const { gainRenown, RESTART_RENOWN } = await import('../src/sim/renown.js');
  const { restartState } = await import('../src/sim/legacy.js');
  const { openRegions } = await import('../src/sim/regions.js');
  const root = createInitialState(0);
  const p = profileOf(root);
  gainRenown(p, 5);
  p.renown -= 3; // gets spent
  assert.deepEqual([p.renown, p.renownTotal], [2, 5]);
  const next = restartState(root);
  assert.equal(RESTART_RENOWN, 10);
  assert.deepEqual([next.profile.renown, next.profile.renownTotal], [12, 15]);
  // Renown from another region adds to the player's profile.
  next.zones.pueblo.complete = true;
  openRegions(next);
  restartState(next.regions.santander, 0, next.profile);
  assert.deepEqual([next.profile.renown, next.profile.renownTotal], [22, 25]);
});

test('a save from before v3.11 rebuilds its total Renown earned', async () => {
  const { saveGame, loadGame } = await import('../src/core/SaveSystem.js');
  const { ALBUM } = await import('../src/data/album.js');
  const mem = {};
  globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  // A format 9 save (until v5.12): Eje Cafetero's own, holding the player's profile.
  const root = { ...createInitialState(0), version: 9, profile: { renown: 0, medals: {}, history: [] } };
  root.profile.renown = 1;
  root.profile.history = [{ event: 'broca', round: 1, medal: 'gold' }, { event: 'molienda', round: 1, medal: 'bronze' }];
  root.profile.logros = { pueblo: 1, maestro: 2 }; // 2 + (4 + 8)
  root.profile.album = ALBUM[0].stickers.map((s) => s.id); // one page: 3
  saveGame(root);
  assert.equal(loadGame().profile.renownTotal, 4 + 1 + 2 + 12 + 3);
});

test('pets per region: cats at 5 ⭐ (up to 10) and parrots at 8 ⭐ (up to 5) (v3.12, v3.29, v4.0.2)', async () => {
  const { buyPet, petsOf, quotePet } = await import('../src/sim/renown.js');
  const p = { renown: 2000 };
  for (let i = 0; i < 12; i++) buyPet(p, 'cafetero', 'cats');
  for (let i = 0; i < 7; i++) buyPet(p, 'cafetero', 'parrots');
  assert.deepEqual(petsOf(p, 'cafetero'), { cats: 10, parrots: 5 });
  assert.equal(p.renown, 2000 - 10 * 5 - 5 * 8);
  assert.equal(quotePet(p, 'cafetero', 'cats').reason, 'max');
  assert.deepEqual(petsOf(p, 'santander'), { cats: 0, parrots: 0 }, 'each region its own');
  assert.ok(quotePet(p, 'santander', 'parrots').ok);
});
