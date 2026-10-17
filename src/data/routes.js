// Rutas entre zonas (GDD §4b «Cómo viajan los productos entre zonas»): un vehículo lleva un producto
// de la bodega de una zona a la estación que lo necesita en otra. Tiene su propio nivel, como los
// arrieros: a igual nivel que la estación que abastece, lleva todo lo que esta consume (un 25 % más).
//   station:  estación que recibe el producto (su receta lo declara en `import`)
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
    station: 'arequipe_pot',
    tripTime: 60,
    maxWait: 10, // s que espera con carga parcial antes de salir
    costBase: 1000,
    growth: 1.15,
    release: '1.2',
  },
];

export const ROUTES_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
