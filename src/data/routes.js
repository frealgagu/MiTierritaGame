// Rutas entre zonas (GDD §4b «Cómo viajan los productos entre zonas»): un vehículo lleva un producto
// de la bodega de una zona a las estaciones que lo necesitan en otra. Tiene su propio nivel, como los
// arrieros: a igual nivel que las estaciones que abastece, lleva todo lo que consumen (un 25 % más).
//   stations: estaciones que reciben el producto (sus recetas lo declaran en `imports`)
//   tripTime: segundos de ida y vuelta entre las dos zonas
//   costBase: precio del nivel 2 (luego ×growth por nivel)
export const ROUTES = [
  {
    id: 'panela',
    name: 'Ruta de la panela',
    vehicle: 'Chiva',
    icon: '🚌',
    product: 'panela_powder',
    from: 'trapiche',
    to: 'lecheria',
    stations: ['arequipe_pot'],
    tab: 'Panela',
    tripTime: 60,
    maxWait: 10, // s que espera con carga parcial antes de salir
    costBase: 1000,
    growth: 1.15,
    release: '1.2',
  },
  {
    id: 'panela_cacao',
    name: 'Ruta de la panela al Cacaotal',
    vehicle: 'Chiva',
    icon: '🚌',
    product: 'panela_powder',
    from: 'trapiche',
    to: 'cacaotal',
    stations: ['chocolate_table', 'chocolatier'],
    tab: 'Panela',
    tripTime: 60,
    maxWait: 10,
    costBase: 5000,
    growth: 1.15,
    release: '1.3',
  },
  {
    id: 'leche',
    name: 'Ruta de la leche',
    vehicle: 'Chiva lechera',
    icon: '🚌',
    product: 'milk',
    from: 'lecheria',
    to: 'cacaotal',
    stations: ['chocolatier'],
    tab: 'Leche',
    tripTime: 60,
    maxWait: 10,
    costBase: 8000,
    growth: 1.15,
    release: '1.3',
  },
];

export const ROUTES_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
