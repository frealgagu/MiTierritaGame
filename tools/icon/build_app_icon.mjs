// Generates the Encantos de Mi Tierrita icon in all sizes (v3.62), from tools/icon/app_icon.mjs:
//   assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
//     (Android assets are generated from there with: npx @capacitor/assets generate --android)
//   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png   (web)
//   store/icon-512.png, store/feature-graphic-es.png, feature-graphic-en/pt/fr.png   (Google Play listing)
// Usage: node tools/icon/build_app_icon.mjs   (requires Playwright with Chromium)
//      node tools/icon/build_app_icon.mjs --features   (listing feature graphics only)
import { createRequire } from 'node:module';
import { appIconSvg, backgroundSvg } from './app_icon.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = new URL('../../', import.meta.url).pathname;
const sized = (svg, w, h = w) => svg.replace('width="512" height="512"', `width="${w}" height="${h}"`);
const BG = '#e7eee6'; // splash background color, between the sky and cream of the icon

const browser = await chromium.launch();
async function shot(html, w, h, path, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=swap" rel="stylesheet"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : 'white'}}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: ROOT + path, omitBackground: transparent });
  await page.close();
  console.log(path);
}

const full = appIconSvg();
const onlyFeatures = process.argv.includes('--features');
if (!onlyFeatures) {
// Android: smaller figure over the separate background (the OS crops the adaptive icon).
await shot(sized(full, 1024), 1024, 1024, 'assets/icon-only.png');
await shot(sized(appIconSvg({ withBackground: false, scale: 0.62 }), 1024), 1024, 1024, 'assets/icon-foreground.png', true);
await shot(sized(backgroundSvg(), 1024), 1024, 1024, 'assets/icon-background.png');
// Splash: rounded icon centered.
const splash = (bg) => `<div style="width:2732px;height:2732px;background:${bg};display:flex;align-items:center;justify-content:center"><div style="width:720px;height:720px;border-radius:160px;overflow:hidden;box-shadow:0 20px 60px rgba(58,36,24,.25)">${sized(full, 720)}</div></div>`;
await shot(splash(BG), 2732, 2732, 'assets/splash.png');
await shot(splash('#22313a'), 2732, 2732, 'assets/splash-dark.png');
// Web.
await shot(sized(full, 192), 192, 192, 'public/icons/icon-192.png');
await shot(sized(full, 512), 512, 512, 'public/icons/icon-512.png');
await shot(sized(appIconSvg({ scale: 0.8 }), 512), 512, 512, 'public/icons/icon-maskable-512.png');
await shot(sized(full, 180), 180, 180, 'public/icons/apple-touch-icon.png');
// Google Play: icon (512 × 512) and feature graphic (1024 × 500).
await shot(sized(full, 512), 512, 512, 'store/icon-512.png');
}
// Feature graphic in each listing language (v3.68: also English; v3.70: Portuguese and French).
const feature = (subtitle, path) =>
  shot(
    `<div style="width:1024px;height:500px;background:linear-gradient(180deg,#bfe6f2,#fdf3dc);display:flex;align-items:center;gap:36px;padding:0 56px;box-sizing:border-box;font-family:Fredoka,sans-serif;color:#3a2418">
    <div style="flex:none;width:400px;height:400px">${sized(appIconSvg({ withBackground: false }), 400)}</div>
    <div><div style="font-size:66px;font-weight:700;line-height:1.02">Encantos de<br>Mi Tierrita</div>
    <div style="font-size:30px;font-weight:600;margin-top:18px;color:#5d4037">${subtitle}</div></div>
  </div>`,
    1024, 500, path);
await feature('Produce, transporta y descubre<br>los encantos de Colombia', 'store/feature-graphic-es.png');
await feature('Produce, transport and discover<br>the charms of Colombia', 'store/feature-graphic-en.png');
await feature('Produza, transporte e descubra<br>os encantos da Colômbia', 'store/feature-graphic-pt.png');
await feature('Produis, transporte et découvre<br>les charmes de la Colombie', 'store/feature-graphic-fr.png');
await browser.close();
