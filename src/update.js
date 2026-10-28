// Versión nueva de la app de Android (v3.6.1). El APK lleva el juego dentro y no se actualiza solo: al
// abrirse (y al volver a la app, si ya pasaron unas horas) consulta version.json en la página publicada
// y, si hay una versión más nueva, muestra sus novedades y ofrece descargar el APK. La web no lo necesita:
// siempre carga la versión publicada.
import { isNewer } from '../tools/release-notes.js';

const SITE = 'https://frealgagu.github.io/MiTierritaGame';
const RECHECK_MS = 6 * 3600 * 1000;
export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__;

let lastCheck = 0;

// Lo publicado ({ version, notes }) o null si no hay internet o no responde a tiempo.
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
  document.getElementById('update-title').textContent = `Hay una versión nueva: v${info.version}`;
  document.getElementById('update-text').textContent = `Tienes la v${APP_VERSION}. Tu partida se conserva al actualizar.`;
  // Las novedades de las versiones que te faltan (hasta tres).
  const missing = (info.notes ?? []).filter((n) => isNewer(n.version, APP_VERSION)).slice(0, 3);
  document.getElementById('update-notes').innerHTML = missing
    .map((n) => `<h3>v${n.version} · ${escape(n.title)}</h3><ul>${n.items.slice(0, 4).map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`)
    .join('');
  // Descarga el APK nuevo: la app pasa el enlace al navegador del teléfono, y Android pide instalarlo.
  document.getElementById('update-go').onclick = () => {
    modal.hidden = true;
    window.location.href = `${SITE}/mitierrita.apk`;
  };
  document.getElementById('update-later').onclick = () => (modal.hidden = true);
  modal.hidden = false;
}

// manual: desde el menú (avisa también si ya está al día o si no hay internet).
export async function checkForUpdate({ manual = false, toast } = {}) {
  if (!manual && Date.now() - lastCheck < RECHECK_MS) return;
  lastCheck = Date.now();
  const info = await published();
  if (!info) {
    if (manual) toast?.('📶 No se pudo revisar: hace falta internet.');
    return;
  }
  if (isNewer(info.version, APP_VERSION)) show(info);
  else if (manual) toast?.(`✅ Tienes la última versión (v${APP_VERSION}).`);
}
