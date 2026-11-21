// The save editor (v5.17): a page of its own built next to the web game, at ./editor/ (dist/editor). It is not
// part of the app: the Android build uses the game's own build only. Run after `npm run build`:
//   npm run build:editor      (development: npm run dev:editor)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(here('../package.json')));

export default defineConfig({
  root: here('.'),
  base: './',
  publicDir: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PLAY_STORE__: 'false' },
  server: { fs: { allow: [here('..')] } },
  build: { outDir: here('../dist/editor'), emptyOutDir: true },
});
