// In-app Android APK update check (v3.6.1). The APK bundles the game and does not self-update: on launch
// (and on resume after a few hours) it fetches version.json from the published GitHub Pages site
// and, if a newer version exists, shows release notes and offers the APK download. Web needs none of this:
// it always loads the live site.
import { isNewer } from '../tools/release-notes.js';
import { t } from './i18n/index.js';

const SITE = 'https://frealgagu.github.io/MiTierritaGame';
const RECHECK_MS = 6 * 3600 * 1000;
export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__;

let lastCheck = 0;

// Latest published release ({ version, notes }) or null if offline or timed out.
async function published() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${SITE}/version.json?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const escape = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function show(info) {
  const modal = document.getElementById('update');
  document.getElementById('update-title').textContent = t('Hay una versión nueva: v{v}', { v: info.version });
  document.getElementById('update-text').textContent = t('Tienes la v{v}. Tu partida se conserva al actualizar.', { v: APP_VERSION });
  // Release notes for the versions missed since current (up to three).
  const missing = (info.notes ?? []).filter((n) => isNewer(n.version, APP_VERSION)).slice(0, 3);
  document.getElementById('update-notes').innerHTML = missing
    .map((n) => `<h3>v${n.version} · ${escape(n.title)}</h3><ul>${n.items.slice(0, 4).map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`)
    .join('');
  // Download the new APK: opens the URL in the phone browser, and Android prompts to install it.
  document.getElementById('update-go').onclick = () => {
    modal.hidden = true;
    window.location.href = `${SITE}/mitierrita.apk`;
  };
  document.getElementById('update-later').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}

// manual: triggered from Settings (also notifies if already up to date or offline).
export async function checkForUpdate({ manual = false, toast } = {}) {
  if (!manual && Date.now() - lastCheck < RECHECK_MS) return;
  lastCheck = Date.now();
  const info = await published();
  if (!info) {
    if (manual) toast?.(t('📶 No se pudo revisar: hace falta internet.'));
    return;
  }
  if (isNewer(info.version, APP_VERSION)) show(info);
  else if (manual) toast?.(t('✅ Tienes la última versión (v{v}).', { v: APP_VERSION }));
}
