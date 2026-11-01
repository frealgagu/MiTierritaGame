import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allKeys } from '../tools/i18n-code.mjs';
import { PARTS } from '../tools/i18n-skeleton.mjs';
import { chooseLang, listJoin, t, useDict } from '../src/i18n/index.js';
import UI from '../src/i18n/en/ui.js';

// Idiomas (v3.68). Cada frase de la interfaz y cada texto del contenido tienen su traducción al inglés, con
// las mismas variables; si alguien agrega una frase y no la traduce, esta prueba lo dice.

const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('cada frase de la interfaz (t y tk) tiene su traducción al inglés', () => {
  const missing = allKeys().filter((k) => !(k in UI));
  assert.deepEqual(missing, [], `faltan en src/i18n/en/ui: ${missing.slice(0, 10).join(' | ')}`);
});

test('las traducciones de la interfaz llevan las mismas variables', () => {
  const bad = Object.entries(UI).filter(([es, en]) => vars(es) !== vars(en));
  assert.deepEqual(bad, []);
});

for (const part of Object.keys(PARTS).filter((p) => p !== 'research')) {
  test(`contenido en inglés: ${part} completo`, async () => {
    const have = (await import(`../src/i18n/en/content/${part}.js`)).default;
    const missing = Object.keys(PARTS[part]()).filter((id) => !(id in have));
    assert.deepEqual(missing, []);
  });
}

test('las investigaciones en inglés tienen nombre y descripción', async () => {
  const { researchTexts } = await import('../src/i18n/en/researchText.js');
  const bad = Object.entries(researchTexts()).filter(([, [name, desc]]) => !name || !desc);
  assert.deepEqual(bad, []);
});

test('los logros en inglés conservan {n}', async () => {
  const have = (await import('../src/i18n/en/content/logros.js')).default;
  const es = PARTS.logros();
  const bad = Object.keys(es).filter((id) => vars(es[id][1]) !== vars(have[id][1]));
  assert.deepEqual(bad, []);
});

test('el idioma: el guardado, si no el del teléfono; el portugués y el francés juegan en español por ahora', () => {
  assert.equal(chooseLang('en', ['es-CO']), 'en');
  assert.equal(chooseLang(null, ['es-CO']), 'es');
  assert.equal(chooseLang(null, ['en-US']), 'en');
  assert.equal(chooseLang(null, ['pt-BR']), 'es');
  assert.equal(chooseLang(null, ['fr-FR', 'en']), 'es');
  assert.equal(chooseLang(null, ['de-DE']), 'en');
  assert.equal(chooseLang(null, []), 'es');
  assert.equal(chooseLang('xx', ['es']), 'es');
});

test('t() pone las variables y sin diccionario deja el español', () => {
  useDict(null);
  assert.equal(t('Vende {list}', { list: '5 🍒' }), 'Vende 5 🍒');
  assert.equal(listJoin(['a', 'b', 'c']), 'a, b y c');
  useDict(UI, 'en');
  assert.equal(t('Vende {list}', { list: '5 🍒' }), 'Sell 5 🍒');
  assert.equal(listJoin(['a', 'b']), 'a and b');
  useDict(null);
});

test('al poner el inglés, los datos quedan en inglés', async () => {
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
