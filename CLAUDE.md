# Instrucciones para Claude

- **Publicar cada cambio.** Un `git push` a `main` publica de inmediato la web, el APK y el AAB (ver `.github/workflows/pages.yml`). Cada vez que se publique una versión, dar al dueño:
  - el enlace de descarga del AAB: https://frealgagu.github.io/MiTierritaGame/mitierrita.aab (cuando termine el flujo y la web sirva la versión nueva);
  - las notas de la versión para Play Console en `<en-US>`, `<es-419>`, `<pt-BR>` y `<fr-FR>` (máximo 500 caracteres cada una).
- Responder en español.
- Mensajes de commit en español, terminados con las líneas de atribución de la sesión.
- Trabajar directo en `main` (sin rama `development`): correr todas las pruebas antes de cada push. Antes de empezar, traer `main` (AI Studio y el bot del flujo también suben commits).
- Comentarios del código y documentación en inglés; mensajes de commit en español.
- Los textos del juego se escriben en español y se traducen en `src/i18n/{en,pt,fr}`.
