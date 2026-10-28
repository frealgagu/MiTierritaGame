// Capturas para la ficha de Google Play (1080×1920): una partida avanzada armada con el modo de desarrollo.
// Uso: `npx vite --port 5199` y, en otra terminal, `node tools/capturas-play.mjs store/capturas`
// (necesita Playwright; CHROMIUM puede indicar el navegador).
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? 'store/capturas';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
// 405×720 a 2,667 = 1080×1920 (9:16)
const page = await browser.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405, hasTouch: true });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5199/');
await page.waitForFunction(() => window.__mitierrita);
await page.evaluate(() => { localStorage.clear(); document.getElementById('intro').hidden = true; });
const hideModals = () => page.evaluate(() => { for (const el of document.querySelectorAll('.modal:not([hidden])')) el.hidden = true; });
const finish = (zone, region) => page.evaluate(async ([zone, region]) => {
  const game = window.__mitierrita.games[region];
  const { GOALS_BY_ZONE } = await import('/src/data/goals.js');
  game.state.zones[zone].unlocked = true;
  for (const g of GOALS_BY_ZONE[zone]) if (!g.final) game.state.goals.claimed.push(g.id);
  const final = GOALS_BY_ZONE[zone].at(-1);
  game.state.stats.sold[final.product] = final.amount;
  game.claimGoal(final.id);
}, [zone, region]);
const develop = (zone, region, coins, steps = 300) => page.evaluate(async ([zone, region, coins, steps]) => {
  const game = window.__mitierrita.games[region];
  const { ZONES_BY_ID } = await import('/src/data/zones/index.js');
  const z = ZONES_BY_ID[zone];
  game.state.coins = 1e40;
  const ids = [...z.chain, ...(z.plots ?? []).map((p) => p.stationId)];
  for (const id of new Set(ids)) {
    game.unlock(id);
    for (let i = 0; i < 3; i++) { game.buy(id, 'max'); game.buy(`${id}:transport`, 'max'); }
  }
  game.buy(`dispatch:${zone}`, 'max');
  for (const r of Object.keys(game.state.routes ?? {})) for (let i = 0; i < 3; i++) game.buy(`route:${r}`, 'max');
  for (let i = 0; i < steps; i++) game.update(0.1);
  game.state.coins = coins;
}, [zone, region, coins, steps]);
const regions = { cafetero: ['finca', 'trapiche', 'lecheria', 'cacaotal', 'maizal', 'pueblo'], santander: ['guayabera', 'tabacal', 'fiquera', 'hato', 'hormigas', 'barichara'], costa: ['arrozal', 'cocal', 'cienaga', 'quesera', 'sombrero', 'cartagena'] };
for (const [region, zones] of Object.entries(regions)) {
  for (const z of zones) {
    await finish(z, region);
    await page.waitForTimeout(200);
    if (z === zones.at(-1)) { await page.evaluate(() => document.getElementById('victory-go')?.click()); await page.waitForTimeout(1200); }
    else { await page.evaluate(() => { for (const b of document.querySelectorAll('#victory button')) if (b.offsetParent) { b.click(); break; } }); await page.waitForTimeout(150); }
  }
}
await hideModals();
await page.addStyleTag({ content: '#toast { display: none !important; }' });
const go = async (zone) => {
  await page.evaluate(() => (window.__mitierrita.root.state.settings.zonesFold = { cafetero: false, santander: false, costa: false }));
  await page.click('#zones-btn');
  await page.waitForTimeout(400);
  await page.evaluate((zone) => {
    document.querySelector(`[data-zone="${zone}"]`)?.click();
  }, zone);
  await page.waitForTimeout(2500);
  await hideModals();
};
const shot = async (name, wait = 4000) => { await page.waitForTimeout(wait); await page.evaluate(() => document.getElementById('toast')?.click()); await page.screenshot({ path: `${out}/${name}.png` }); };

await go('finca');
await develop('finca', 'cafetero', 2.47e9);
await shot('1-finca', 8000);
await page.evaluate(() => window.__mitierrita.panel.open('roaster'));
await shot('2-estacion', 1200);
await page.evaluate(() => window.__mitierrita.panel.close());
await page.click('#chain-btn');
await shot('3-cadena', 1200);
await hideModals();
await go('sombrero');
for (const z of regions.costa) await develop(z, 'costa', 8.3e7, z === 'sombrero' ? 250 : 0);
await shot('4-sombrero', 8000);
await page.click('#zones-btn');
await page.waitForTimeout(500);
await page.click('#zones-map-btn');
await shot('5-mapa', 2500);
await hideModals();
await page.evaluate(() => (window.__mitierrita.root.state.settings.zonesFold = { cafetero: true, santander: true, costa: false }));
await page.click('#zones-btn');
await shot('6-zonas', 1200);
console.log('errores:', errs.join('; ') || 'ninguno');
await browser.close();
