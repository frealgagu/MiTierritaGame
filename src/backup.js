// Copia de seguridad en un archivo (v4.7.4). El texto de la partida es largo: en el teléfono, copiarlo al
// portapapeles podía dejarlo vacío. En la web se descarga como archivo; en la app se escribe en la carpeta temporal
// y se abre el menú «Compartir» del teléfono (Drive, Archivos, WhatsApp…), sin pedir permisos de almacenamiento.
import { isNativeApp } from './native.js';

export const backupName = () => `mitierrita-${new Date().toISOString().slice(0, 10)}.txt`;

// Guarda el texto. Devuelve 'shared' (app), 'downloaded' (web) o 'cancelled' (se cerró «Compartir» sin elegir).
export async function saveBackupFile(text) {
  const name = backupName();
  if (isNativeApp()) {
    // Se guardan los módulos y no los complementos: Capacitor responde a cualquier método, también a `then`
    // (ver tip.js), y una promesa que devolviera el complemento no terminaría nunca.
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

// Abre el selector de archivos del sistema y devuelve el texto del que se elija (o null si no se elige ninguno).
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
