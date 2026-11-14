# Instrucciones para Claude

- **Publicar cada cambio.** Un `git push` a `main` publica de inmediato la web, el APK y el AAB (ver `.github/workflows/pages.yml`). Cada vez que se publique una versión, dar al dueño:
  - el enlace de descarga del AAB: https://frealgagu.github.io/MiTierritaGame/mitierrita.aab (cuando termine el flujo y la web sirva la versión nueva);
  - las notas de la versión para Play Console en `<en-US>`, `<es-419>`, `<pt-BR>` y `<fr-FR>` (máximo 500 caracteres cada una).
- Responder en español.
- Mensajes de commit en español, terminados con las líneas de atribución de la sesión.
- Trabajar directo en `main` (sin rama `development`): correr todas las pruebas antes de cada push. Antes de empezar, traer `main` (AI Studio y el bot del flujo también suben commits).
- Comentarios del código y documentación en inglés; mensajes de commit en español.
- Los textos del juego se escriben en español y se traducen en `src/i18n/{en,pt,fr}`.
- Versiones: el flujo de publicación sube solo el parche (y agrega una entrada «Ajustes» al CHANGELOG) cuando un commit llega sin subir la versión, y hace un commit en `main`; por eso, traer `main` después de cada push. Una versión con novedades se sube a mano en `package.json` con su entrada en el CHANGELOG. El versionCode de Android es mayor·10.000 + menor·100 + parche (5 cifras).
