// File-based backup (v4.7.4). Save text is large: on mobile, copying it to the clipboard could leave it
// empty. On web it downloads as a file; on the app it writes to cache and opens the OS Share sheet
// (Drive, Files, WhatsApp...) without requesting storage permissions.
import { isNativeApp } from './native.js';

export const backupName = () => `mitierrita-${new Date().toISOString().slice(0, 10)}.txt`;

// Saves the text. Returns 'shared' (app), 'downloaded' (web), or 'cancelled' (Share sheet dismissed without choosing).
export async function saveBackupFile(text) {
  const name = backupName();
  if (isNativeApp()) {
    // Cache the imported module, not the plugin proxy: Capacitor intercepts any property access including `then`
    // (see tip.js), so an async function returning the plugin would never resolve.
    const fs = await import('@capacitor/filesystem');
    const share = await import('@capacitor/share');
    const { uri } = await fs.Filesystem.writeFile({ path: name, data: text, directory: fs.Directory.Cache, encoding: fs.Encoding.UTF8 });
    try {
      await share.Share.share({ title: name, files: [uri] });
    } catch (err) {
      if (/cancel/i.test(String(err?.message ?? err))) return 'cancelled';
      throw err;
    }
    return 'shared';
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

// Opens the system file picker and returns the chosen file text (or null if cancelled).
export function pickBackupFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain,application/octet-stream';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    });
    input.click();
  });
}
