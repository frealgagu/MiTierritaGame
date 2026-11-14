import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { releaseNotes } from './tools/release-notes.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// version.json (v3.6.1): published version and release notes. The Android app checks it on launch
// to offer the new APK (see src/update.js); the web version updates automatically.
const versionFile = () => ({
  name: 'mitierrita-version',
  generateBundle() {
    const notes = releaseNotes(readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8'));
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, notes }) });
  },
});

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  // PLAY_STORE=1 (v3.62): Google Play build, updated only via the store (without checking for new APKs).
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PLAY_STORE__: JSON.stringify(process.env.PLAY_STORE === '1') },
  plugins: [versionFile()],
});
