# Pendiente: dibujos propios para el álbum

Revisión del 5 de noviembre de 2026 (después de la v4.1.2). Queda para más adelante, cuando el dueño lo pida.

## El problema

De las 288 láminas del álbum (`src/data/album.js`), **207 usan emojis del teléfono**. Se ven distintos en cada marca y casi nunca muestran lo colombiano que dice el texto. Las otras 81 tienen dibujo propio (`ICON.*`, hecho en `tools/icons/build_icons.py`); casi todas están bien, pero algunas no se entienden (por ejemplo, la lechona parece una mancha café y no un cerdo).

| Región | Láminas con emoji |
|---|---|
| Eje Cafetero | 34 de 36 |
| Santander | 19 de 36 |
| Costa | 22 de 36 |
| Boyacá | 23 de 36 |
| Llanos | 27 de 36 |
| Pacífico | 24 de 36 |
| Amazonas | 28 de 36 |
| Tolima Grande | 30 de 36 |

Ejemplos de láminas que no corresponden:

- Arriero: un granjero con trinche.
- Carriel: un bolso de mano.
- Yipao: una camioneta moderna.
- Chiva: un bus urbano.
- Molinillo: una cuchara.
- Budare y fonda: una sartén con huevo.
- Guane: un dinosaurio.
- Pantano de Vargas y San Agustín: una estatua de la Isla de Pascua.
- Cuatro y tiple: una guitarra eléctrica.
- Marimba de chonta: un teclado de piano.
- El puerto (Buenaventura): un crucero.
- Cerbatana: un árbol de deseos.
- Chambira: un ovillo de lana rosado.
- Fósiles de la Tatacoa: un hueso de caricatura (el texto habla de tortugas gigantes).
- Palenquera: solo una cara.

## El plan acordado (por confirmar al retomarlo)

- Hacer un dibujo propio, con más detalle y fiel al texto, para cada lámina que hoy es emoji.
- Rehacer los dibujos propios que no se entienden (la lechona y los que se encuentren así).
- Entregarlo por regiones, una versión por región (unas 26 láminas cada una), empezando por el Tolima Grande y luego el Eje Cafetero. Antes de publicar cada región, mostrar al dueño la hoja con los dibujos nuevos.
- Para ver las láminas: una hoja de prueba que carga `ALBUM` en el navegador y pinta cada lámina con su ícono, nombre y texto (como se hizo en la revisión).
