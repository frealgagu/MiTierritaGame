import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { releaseNotes } from './tools/release-notes.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// version.json (v3.6.1): la versión publicada y sus novedades. La app de Android lo consulta al abrirse
// para ofrecer el APK nuevo (ver src/update.js); la web se actualiza sola.
const versionFile = () => ({
  name: 'mitierrita-version',
  generateBundle() {
    const notes = releaseNotes(readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8'));
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, notes }) });
  },
});

export default defineConfig({
  base: './',
  server: { host: true },
  // PLAY_STORE=1 (v3.62): la versión para Google Play, que se actualiza solo desde la tienda (sin buscar APK nuevos).
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PLAY_STORE__: JSON.stringify(process.env.PLAY_STORE === '1') },
  plugins: [versionFile()],
});
