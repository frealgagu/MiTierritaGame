# Pending: custom drawings for the album

Review of November 5, 2026 (after v4.1.2). Left for later, when the owner asks for it.

## The problem

Of the 288 album stickers (`src/data/album.js`), **207 use the phone's emojis**. They look different on every brand and almost never show the Colombian thing the text describes. The other 81 have a custom drawing (`ICON.*`, made in `tools/icons/build_icons.py`); almost all are fine, but some are hard to read (for example, the lechona looks like a brown blob, not a pig).

| Region | Stickers with emoji |
|---|---|
| Eje Cafetero | 34 of 36 |
| Santander | 19 of 36 |
| Costa | 22 of 36 |
| Boyacá | 23 of 36 |
| Llanos | 27 of 36 |
| Pacífico | 24 of 36 |
| Amazonas | 28 of 36 |
| Tolima Grande | 30 of 36 |

Examples of stickers that do not match:

- Arriero (mule driver): a farmer with a pitchfork.
- Carriel: a handbag.
- Yipao: a modern pickup truck.
- Chiva: a city bus.
- Molinillo: a spoon.
- Budare and fonda: a frying pan with an egg.
- Guane: a dinosaur.
- Pantano de Vargas and San Agustín: an Easter Island statue.
- Cuatro and tiple: an electric guitar.
- Marimba de chonta: a piano keyboard.
- The port (Buenaventura): a cruise ship.
- Blowgun: a wishing tree.
- Chambira: a pink ball of yarn.
- Tatacoa fossils: a cartoon bone (the text talks about giant turtles).
- Palenquera: just a face.

## The agreed plan (to be confirmed when it is picked up)

- Make a custom drawing, more detailed and faithful to the text, for every sticker that is an emoji today.
- Redo the custom drawings that are hard to read (the lechona and any others found like it).
- Deliver it by region, one version per region (about 26 stickers each), starting with Tolima Grande and then the Eje Cafetero. Before publishing each region, show the owner the sheet with the new drawings.
- To review the stickers: a test sheet that loads `ALBUM` in the browser and paints each sticker with its icon, name and text (as was done in the review).
