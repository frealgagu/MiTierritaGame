import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allKeys } from '../tools/i18n-code.mjs';
import { PARTS } from '../tools/i18n-skeleton.mjs';
import { chooseLang, listJoin, t, useDict } from '../src/i18n/index.js';
import UI from '../src/i18n/en/ui.js';
import UI_PT from '../src/i18n/pt/ui.js';
import UI_FR from '../src/i18n/fr/ui.js';

// Languages (v3.68: English; v3.69: Brazilian Portuguese; v3.70: French). Every UI phrase and every content text
// has its translation in each language, with the same placeholders; if someone adds a phrase and forgets
// to translate it, this test reports it.

const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const LANGS = { en: ['inglés', UI], pt: ['portugués', UI_PT], fr: ['francés', UI_FR] };

for (const [lang, [name, dict]] of Object.entries(LANGS)) {
  test(`every interface phrase (t and tk) has its ${name} translation`, () => {
    const missing = allKeys().filter((k) => !(k in dict));
    assert.deepEqual(missing, [], `missing in src/i18n/${lang}/ui: ${missing.slice(0, 10).join(' | ')}`);
  });

  test(`the ${name} interface translations carry the same variables`, () => {
    const bad = Object.entries(dict).filter(([es, tr]) => vars(es) !== vars(tr));
    assert.deepEqual(bad, []);
  });

  for (const part of Object.keys(PARTS).filter((p) => p !== 'research')) {
    test(`${name} content: ${part} complete`, async () => {
      const have = (await import(`../src/i18n/${lang}/content/${part}.js`)).default;
      const missing = Object.keys(PARTS[part]()).filter((id) => !(id in have));
      assert.deepEqual(missing, []);
    });
  }

  test(`research in ${name} has a name and a description`, async () => {
    const { researchTexts } = await import(`../src/i18n/${lang}/researchText.js`);
    const bad = Object.entries(researchTexts()).filter(([, [rname, desc]]) => !rname || !desc);
    assert.deepEqual(bad, []);
  });

  test(`achievements in ${name} keep {n}`, async () => {
    const have = (await import(`../src/i18n/${lang}/content/logros.js`)).default;
    const es = PARTS.logros();
    const bad = Object.keys(es).filter((id) => vars(es[id][1]) !== vars(have[id][1]));
    assert.deepEqual(bad, []);
  });
}

test(`the language: the saved one, otherwise the phone's; Italian plays in Spanish`, () => {
  assert.equal(chooseLang('en', ['es-CO']), 'en');
  assert.equal(chooseLang('pt', ['es-CO']), 'pt');
  assert.equal(chooseLang(null, ['es-CO']), 'es');
  assert.equal(chooseLang(null, ['en-US']), 'en');
  assert.equal(chooseLang(null, ['pt-BR']), 'pt');
  assert.equal(chooseLang(null, ['pt-PT']), 'pt');
  assert.equal(chooseLang(null, ['fr-FR', 'en']), 'fr');
  assert.equal(chooseLang(null, ['it-IT', 'en']), 'es');
  assert.equal(chooseLang(null, ['de-DE']), 'en');
  assert.equal(chooseLang(null, []), 'es');
  assert.equal(chooseLang('xx', ['es']), 'es');
});

test('t() fills the variables and without a dictionary leaves the Spanish', () => {
  useDict(null);
  assert.equal(t('Vende {list}', { list: '5 🍒' }), 'Vende 5 🍒');
  assert.equal(listJoin(['a', 'b', 'c']), 'a, b y c');
  useDict(UI, 'en');
  assert.equal(t('Vende {list}', { list: '5 🍒' }), 'Sell 5 🍒');
  assert.equal(listJoin(['a', 'b']), 'a and b');
  useDict(null);
});

test('setting English, the data is in English', async () => {
  const { applyData } = await import('../src/i18n/en/index.js');
  applyData();
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const { PRODUCTS } = await import('../src/data/products.js');
  const { EVENT_ACTIONS_BY_ID } = await import('../src/data/events.js');
  const { STICKERS_BY_ID } = await import('../src/data/album.js');
  const { withArticle } = await import('../src/data/lore.js');
  assert.equal(STATIONS_BY_ID.wetmill.name, 'Wet Mill');
  assert.equal(PRODUCTS.coffee_bag.name, 'Bag of coffee');
  assert.equal(EVENT_ACTIONS_BY_ID.broca_trampas.name, 'Traps');
  assert.equal(STICKERS_BY_ID.mula.name, 'The mule');
  assert.equal(withArticle('Wet Mill'), 'the Wet Mill');
});

test('setting Portuguese, the data is in Portuguese, with its article', async () => {
  const { applyData } = await import('../src/i18n/pt/index.js');
  applyData();
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const { PRODUCTS } = await import('../src/data/products.js');
  const { EVENT_ACTIONS_BY_ID } = await import('../src/data/events.js');
  const { STICKERS_BY_ID } = await import('../src/data/album.js');
  const { withArticle, WithArticle } = await import('../src/data/lore.js');
  assert.equal(STATIONS_BY_ID.wetmill.name, 'Despolpador');
  assert.equal(PRODUCTS.panela.name, 'Rapadura');
  assert.equal(EVENT_ACTIONS_BY_ID.broca_trampas.name, 'Armadilhas');
  assert.equal(STICKERS_BY_ID.mula.name, 'A mula');
  assert.equal(withArticle('Despolpador'), 'o Despolpador');
  assert.equal(withArticle('Queijaria'), 'a Queijaria');
  assert.equal(withArticle('Cochos de fermentação'), 'os Cochos de fermentação');
  assert.equal(WithArticle('Tecelãs'), 'As Tecelãs');
  assert.equal(withArticle('primeiras chuvas'), 'as primeiras chuvas');
  useDict(UI_PT, 'pt');
  assert.equal(listJoin(['a', 'b', 'c']), 'a, b e c');
  useDict(null);
});

test('setting French, the data is in French, with its article and its spaces', async () => {
  const { applyData, UI: dict } = await import('../src/i18n/fr/index.js');
  applyData();
  const { STATIONS_BY_ID } = await import('../src/data/stations.js');
  const { PRODUCTS } = await import('../src/data/products.js');
  const { STICKERS_BY_ID } = await import('../src/data/album.js');
  const { withArticle, WithArticle } = await import('../src/data/lore.js');
  assert.equal(STATIONS_BY_ID.wetmill.name, 'Dépulpeur');
  assert.equal(PRODUCTS.coffee_bag.name, 'Sachet de café');
  assert.equal(STICKERS_BY_ID.mula.name, 'La mule');
  assert.equal(withArticle('Dépulpeur'), 'le Dépulpeur');
  assert.equal(withArticle('Fromagerie'), 'la Fromagerie');
  assert.equal(withArticle('Écrémeuse'), 'l’Écrémeuse');
  assert.equal(WithArticle('Tisserandes'), 'Les Tisserandes');
  assert.equal(withArticle('Budare'), 'le Budare');
  assert.equal(withArticle('Nettoyage du poisson'), 'le Nettoyage du poisson');
  assert.equal(withArticle('premières pluies'), 'les premières pluies');
  useDict(dict, 'fr');
  assert.equal(t('🎯 ¡Objetivo cumplido! +{coins} 💰', { coins: 5 }), '🎯 Objectif rempli\u00a0! +5 💰');
  assert.equal(listJoin(['a', 'b']), 'a et b');
  useDict(null);
});
