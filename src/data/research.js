// Investigaciones (GDD §5.4): compras únicas. Cada estación tiene al menos una ×2, y las que
// aceleran una estación aparecen junto a la de la siguiente, para no descompensar la cadena.
//   requires: estación que tiene que estar construida para que aparezca
//   effect:   { type, target?, mult }
//     stationSpeed (target = estación) · productValue (target = producto) · zoneValue (target = zona)
//     muleSpeed · dispatchCapacity (target = zona) · offlineHours (mult = horas)
//   zone: zona en la que aparece
export const RESEARCH = [
  { zone: 'finca', id: 'abono', name: 'Abono orgánico', icon: '🌱', desc: 'El Cafetal produce el doble.', cost: 300, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { zone: 'finca', id: 'despulpadora', name: 'Despulpadora eléctrica', icon: '⚡', desc: 'El Beneficiadero procesa el doble (para seguirle el paso al Abono).', cost: 400, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'wetmill', mult: 2 } },
  { zone: 'finca', id: 'herraduras', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'dryer', effect: { type: 'muleSpeed', mult: 1.5 } },
  { zone: 'finca', id: 'remolque', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'huller', effect: { type: 'dispatchCapacity', target: 'finca', mult: 2 } },
  { zone: 'finca', id: 'secador', name: 'Secador mecánico', icon: '♨️', desc: 'La Marquesina seca el doble de rápido.', cost: 6000, requires: 'huller', effect: { type: 'stationSpeed', target: 'dryer', mult: 2 } },
  { zone: 'finca', id: 'trilla', name: 'Trilladora de rodillos', icon: '🌀', desc: 'La Trilladora procesa el doble.', cost: 8000, requires: 'roaster', effect: { type: 'stationSpeed', target: 'huller', mult: 2 } },
  { zone: 'finca', id: 'capataz', name: 'Capataz', icon: '🧑‍🌾', desc: 'La finca trabaja hasta 6 h mientras no juegas (antes 2 h).', cost: 10000, requires: 'roaster', effect: { type: 'offlineHours', mult: 6 } },
  { zone: 'finca', id: 'tueste', name: 'Tueste de origen', icon: '🔥', desc: 'El café tostado vale un 50 % más.', cost: 20000, requires: 'roaster', effect: { type: 'productValue', target: 'roasted', mult: 1.5 } },
  { zone: 'finca', id: 'tostador', name: 'Tostador de tambor grande', icon: '🔥', desc: 'La Tostadora tuesta el doble.', cost: 25000, requires: 'grinder', effect: { type: 'stationSpeed', target: 'roaster', mult: 2 } },
  // La segunda mejora del Cafetal sube el precio de todo el café, no la velocidad: un segundo ×2 en el
  // Cafetal (y en el Beneficiadero) dejaba al resto de la cadena, con un solo ×2, siempre atrás.
  { zone: 'finca', id: 'castillo', name: 'Variedad Castillo', icon: '🌳', desc: 'Café de mejor calidad: todo lo que vende la Finca vale un 50 % más.', cost: 50000, requires: 'grinder', effect: { type: 'zoneValue', target: 'finca', mult: 1.5 } },
  { zone: 'finca', id: 'beneficio_eco', name: 'Beneficio ecológico', icon: '💧', desc: 'La Compostera trabaja el doble de rápido: con menos niveles cubre el bono del compost.', cost: 20000, requires: 'composter', effect: { type: 'stationSpeed', target: 'composter', mult: 2 } },
  { zone: 'finca', id: 'molino_electrico', name: 'Molino eléctrico', icon: '⚙️', desc: 'El Molino muele el doble.', cost: 60000, requires: 'packer', effect: { type: 'stationSpeed', target: 'grinder', mult: 2 } },
  { zone: 'finca', id: 'empaque_auto', name: 'Empacadora automática', icon: '📦', desc: 'La Empacadora llena el doble de bolsas.', cost: 150000, requires: 'packer', effect: { type: 'stationSpeed', target: 'packer', mult: 2 } },
  { zone: 'finca', id: 'cable', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'packer', effect: { type: 'muleSpeed', mult: 2 } },
  { zone: 'finca', id: 'sello', name: 'Sello de calidad', icon: '🏅', desc: 'Las bolsas de café valen un 50 % más.', cost: 300000, requires: 'packer', effect: { type: 'productValue', target: 'coffee_bag', mult: 1.5 } },

  // Zona 2 · El Trapiche
  { zone: 'trapiche', id: 'motor', name: 'Trapiche con motor', icon: '⚙️', desc: 'La Molienda muele el doble.', cost: 20000, requires: 'cane_mill', effect: { type: 'stationSpeed', target: 'cane_mill', mult: 2 } },
  { zone: 'trapiche', id: 'abono_cana', name: 'Abono para la caña', icon: '🌱', desc: 'El Cañaduzal produce el doble.', cost: 50000, requires: 'furnace', effect: { type: 'stationSpeed', target: 'canefield', mult: 2 } },
  { zone: 'trapiche', id: 'pailas', name: 'Hornilla de más pailas', icon: '🍯', desc: 'La Hornilla cocina el doble (para seguirle el paso al Abono para la caña).', cost: 40000, requires: 'furnace', effect: { type: 'stationSpeed', target: 'furnace', mult: 2 } },
  { zone: 'trapiche', id: 'chiva', name: 'Chiva para el Trapiche', icon: '🚌', desc: 'El despacho del Trapiche lleva el doble por viaje.', cost: 80000, requires: 'furnace', effect: { type: 'dispatchCapacity', target: 'trapiche', mult: 2 } },
  { zone: 'trapiche', id: 'gaveras_acero', name: 'Gaveras de acero', icon: '🧱', desc: 'Las Gaveras moldean el doble de rápido.', cost: 300000, requires: 'molds', effect: { type: 'stationSpeed', target: 'molds', mult: 2 } },
  { zone: 'trapiche', id: 'pulverizador', name: 'Pulverizadora eléctrica', icon: '🌀', desc: 'La Pulverizadora muele el doble.', cost: 600000, requires: 'pulverizer', effect: { type: 'stationSpeed', target: 'pulverizer', mult: 2 } },
  { zone: 'trapiche', id: 'panela_organica', name: 'Panela orgánica', icon: '🏅', desc: 'La panela pulverizada vale un 50 % más.', cost: 1500000, requires: 'pulverizer', effect: { type: 'productValue', target: 'panela_powder', mult: 1.5 } },

  // Zona 3 · La Lechería
  { zone: 'lecheria', id: 'ordeno', name: 'Ordeño mecánico', icon: '🐄', desc: 'El Potrero da el doble de leche.', cost: 300000, requires: 'pasteurizer', effect: { type: 'stationSpeed', target: 'pasture', mult: 2 } },
  { zone: 'lecheria', id: 'placas', name: 'Pasteurizadora de placas', icon: '🌡️', desc: 'La Pasteurizadora procesa el doble (para seguirle el paso al Ordeño mecánico).', cost: 400000, requires: 'pasteurizer', effect: { type: 'stationSpeed', target: 'pasteurizer', mult: 2 } },
  { zone: 'lecheria', id: 'centrifuga', name: 'Descremadora centrífuga', icon: '🍦', desc: 'La Descremadora saca el doble de crema.', cost: 1200000, requires: 'separator', effect: { type: 'stationSpeed', target: 'separator', mult: 2 } },
  { zone: 'lecheria', id: 'carrotanque', name: 'Carrotanque', icon: '🚛', desc: 'El despacho de la Lechería lleva el doble por viaje.', cost: 1500000, requires: 'cheesery', effect: { type: 'dispatchCapacity', target: 'lecheria', mult: 2 } },
  { zone: 'lecheria', id: 'batidora', name: 'Batidora eléctrica', icon: '🧈', desc: 'La Batidora bate el doble de rápido.', cost: 3000000, requires: 'churn', effect: { type: 'stationSpeed', target: 'churn', mult: 2 } },
  { zone: 'lecheria', id: 'cuajo', name: 'Cuajo de calidad', icon: '🧀', desc: 'La Quesera cuaja el doble de rápido.', cost: 8000000, requires: 'cheesery', effect: { type: 'stationSpeed', target: 'cheesery', mult: 2 } },
  { zone: 'lecheria', id: 'doble_crema', name: 'Queso doble crema', icon: '🏅', desc: 'El queso vale un 50 % más.', cost: 15000000, requires: 'cheesery', effect: { type: 'productValue', target: 'cheese', mult: 1.5 } },
  { zone: 'lecheria', id: 'paila_cobre', name: 'Paila de cobre', icon: '🍮', desc: 'La Paila cocina el doble de arequipe (la Chiva de la ruta se ajusta sola).', cost: 25000000, requires: 'arequipe_pot', effect: { type: 'stationSpeed', target: 'arequipe_pot', mult: 2 } },
  { zone: 'lecheria', id: 'arequipe_export', name: 'Arequipe de exportación', icon: '🏅', desc: 'El arequipe vale un 50 % más.', cost: 50000000, requires: 'arequipe_pot', effect: { type: 'productValue', target: 'arequipe', mult: 1.5 } },

  // Zona 4 · El Cacaotal
  { zone: 'cacaotal', id: 'injertos', name: 'Injertos de clones finos', icon: '🌳', desc: 'El Cacaotal da el doble de mazorcas.', cost: 1000000, requires: 'fermenter', effect: { type: 'stationSpeed', target: 'cacao_grove', mult: 2 } },
  { zone: 'cacaotal', id: 'cajones_escalera', name: 'Cajones en escalera', icon: '📦', desc: 'Los Cajones fermentan el doble (para seguirle el paso a los Injertos).', cost: 1200000, requires: 'fermenter', effect: { type: 'stationSpeed', target: 'fermenter', mult: 2 } },
  { zone: 'cacaotal', id: 'marquesina_cacao', name: 'Secadero con techo corredizo', icon: '☀️', desc: 'El Secadero seca el doble de rápido.', cost: 3000000, requires: 'cacao_roaster', effect: { type: 'stationSpeed', target: 'cacao_dryer', mult: 2 } },
  { zone: 'cacaotal', id: 'camion_cacao', name: 'Camión para el Cacaotal', icon: '🚚', desc: 'El despacho del Cacaotal lleva el doble por viaje.', cost: 5000000, requires: 'cacao_dryer', effect: { type: 'dispatchCapacity', target: 'cacaotal', mult: 2 } },
  { zone: 'cacaotal', id: 'tostador_bombo', name: 'Tostador de bombo', icon: '🔥', desc: 'El Tostador de cacao tuesta el doble.', cost: 8000000, requires: 'cacao_mill', effect: { type: 'stationSpeed', target: 'cacao_roaster', mult: 2 } },
  { zone: 'cacaotal', id: 'molino_bolas', name: 'Molino de bolas', icon: '🌀', desc: 'El Molino de cacao muele el doble.', cost: 20000000, requires: 'chocolate_table', effect: { type: 'stationSpeed', target: 'cacao_mill', mult: 2 } },
  { zone: 'cacaotal', id: 'moldes_aluminio', name: 'Moldes de aluminio', icon: '🍫', desc: 'La Mesa de chocolate moldea el doble.', cost: 50000000, requires: 'chocolatier', effect: { type: 'stationSpeed', target: 'chocolate_table', mult: 2 } },
  { zone: 'cacaotal', id: 'temperadora', name: 'Temperadora', icon: '🍬', desc: 'La Chocolatería hace el doble de chocolatinas (las rutas se ajustan solas).', cost: 80000000, requires: 'chocolatier', effect: { type: 'stationSpeed', target: 'chocolatier', mult: 2 } },
  { zone: 'cacaotal', id: 'cacao_fino', name: 'Cacao fino de aroma', icon: '🏅', desc: 'Todo lo que vende el Cacaotal vale un 50 % más.', cost: 60000000, requires: 'chocolate_table', effect: { type: 'zoneValue', target: 'cacaotal', mult: 1.5 } },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
