// Decoración (v2.2, GDD §10.2): se compra con Renombre ⭐ y no cambia nada de la economía. Cada
// categoría tiene su opción de siempre (gratis) y otras para comprar; se elige una a la vez.
export const DECOR = [
  {
    id: 'willys',
    icon: '🚙',
    name: 'Color del Willys',
    options: [
      { id: 'verde', name: 'Verde monte', cost: 0, color: 0x4f7a3a },
      { id: 'rojo', name: 'Rojo', cost: 3, color: 0xc0392b },
      { id: 'azul', name: 'Azul cielo', cost: 3, color: 0x2e86c1 },
      { id: 'amarillo', name: 'Amarillo', cost: 3, color: 0xe8b90f },
      { id: 'blanco', name: 'Blanco', cost: 3, color: 0xe9e4d8 },
    ],
  },
  {
    id: 'enjalma',
    icon: '🐴',
    name: 'Enjalma de las mulas',
    options: [
      { id: 'clasica', name: 'Clásica', cost: 0, colors: [0xc8643b, 0xe8b90f, 0x2e6fd1] },
      { id: 'tricolor', name: 'Tricolor', cost: 2, colors: [0xe8b90f, 0x2e6fd1, 0xd7263d] },
      { id: 'morada', name: 'Morada', cost: 2, colors: [0x8e44ad, 0xf4efe6, 0xe58fb5] },
      { id: 'verde', name: 'Verde', cost: 2, colors: [0x2fa36b, 0xf4efe6, 0xc8643b] },
    ],
  },
  {
    id: 'chiva',
    icon: '🚌',
    name: 'Pintura de la chiva',
    options: [
      { id: 'clasica', name: 'Clásica', cost: 0, colors: [0xd7263d, 0xe8b90f, 0x2e6fd1, 0x2fa36b] },
      { id: 'caribe', name: 'Caribe', cost: 4, colors: [0x1abc9c, 0xff7f50, 0xf1c40f, 0x2e86c1] },
      { id: 'pastel', name: 'Pastel', cost: 4, colors: [0xf2a7a0, 0xf6d860, 0x9ad0ec, 0xb8e0a8] },
      { id: 'fiesta', name: 'De fiesta', cost: 4, colors: [0x8e44ad, 0xe58fb5, 0xf39c12, 0x27ae60] },
    ],
  },
  {
    id: 'banderines',
    icon: '🎏',
    name: 'Banderines en la bodega',
    options: [
      { id: 'no', name: 'Sin banderines', cost: 0, colors: [] },
      { id: 'colores', name: 'De colores', cost: 5, colors: [0xd7263d, 0xe8b90f, 0x2e6fd1, 0x2fa36b, 0xf39c12] },
      { id: 'tricolor', name: 'Tricolor', cost: 5, colors: [0xe8b90f, 0xe8b90f, 0x2e6fd1, 0xd7263d] },
    ],
  },
];

export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]));
// La opción gratis de cada categoría (la de siempre).
export const DEFAULT_DECOR = Object.fromEntries(DECOR.map((d) => [d.id, d.options[0].id]));
