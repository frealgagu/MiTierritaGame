// Investigaciones (GDD §5.4): compras únicas. Cada estación tiene al menos una ×2, y las que
// aceleran una estación aparecen junto a la de la siguiente, para no descompensar la cadena.
//   requires: estación que tiene que estar construida para que aparezca
//   stationLevel: nivel que piden esa estación y sus arrieros (las que la duplican, ver abajo)
//   effect:   { type, target?, mult }
//     stationSpeed (target = estación) · productValue (target = producto) · zoneValue (target = zona)
//     muleSpeed · dispatchCapacity (target = zona)
// (Hasta la v3.6 había una por zona que sumaba horas sin conexión; desde la v3.7 esas horas son del
// jugador y se compran con Renombre: ver sim/renown.js.)
//   zone: zona en la que aparece
import { ICON } from './icons.js';

export const RESEARCH = [
  { zone: 'finca', id: 'abono', name: 'Abono orgánico', icon: '🌱', desc: 'El Cafetal produce el doble.', cost: 300, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'farm', mult: 2 } },
  { zone: 'finca', id: 'despulpadora', name: 'Despulpadora eléctrica', icon: '⚡', desc: 'El Beneficiadero procesa el doble (para seguirle el paso al Abono).', cost: 400, requires: 'wetmill', effect: { type: 'stationSpeed', target: 'wetmill', mult: 2 } },
  { zone: 'finca', id: 'herraduras', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'dryer', effect: { type: 'muleSpeed', mult: 1.5 } },
  { zone: 'finca', id: 'remolque', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'huller', effect: { type: 'dispatchCapacity', target: 'finca', mult: 2 } },
  { zone: 'finca', id: 'secador', name: 'Secador mecánico', icon: '☀️', desc: 'La Marquesina seca el doble de rápido.', cost: 6000, requires: 'huller', effect: { type: 'stationSpeed', target: 'dryer', mult: 2 } },
  { zone: 'finca', id: 'trilla', name: 'Trilladora de rodillos', icon: '🌀', desc: 'La Trilladora procesa el doble.', cost: 8000, requires: 'roaster', effect: { type: 'stationSpeed', target: 'huller', mult: 2 } },
  { zone: 'finca', id: 'tueste', name: 'Tueste de origen', icon: '🏅', desc: 'El café tostado vale un 50 % más.', cost: 20000, requires: 'roaster', effect: { type: 'productValue', target: 'roasted', mult: 1.5 } },
  { zone: 'finca', id: 'tostador', name: 'Tostador de tambor grande', icon: '🔥', desc: 'La Tostadora tuesta el doble.', cost: 25000, requires: 'grinder', effect: { type: 'stationSpeed', target: 'roaster', mult: 2 } },
  // La segunda mejora del Cafetal sube el precio de todo el café, no la velocidad: un segundo ×2 en el
  // Cafetal (y en el Beneficiadero) dejaba al resto de la cadena, con un solo ×2, siempre atrás.
  { zone: 'finca', id: 'castillo', name: 'Variedad Castillo', icon: '🌳', desc: 'Café de mejor calidad: todo lo que vende la Finca vale un 50 % más.', cost: 50000, requires: 'grinder', effect: { type: 'zoneValue', target: 'finca', mult: 1.5 } },
  { zone: 'finca', id: 'beneficio_eco', name: 'Beneficio ecológico', icon: '🪱', desc: 'La Compostera trabaja el doble de rápido: con menos niveles cubre el bono del compost.', cost: 20000, requires: 'composter', effect: { type: 'stationSpeed', target: 'composter', mult: 2 } },
  { zone: 'finca', id: 'molino_electrico', name: 'Molino eléctrico', icon: '⚙️', desc: 'El Molino muele el doble.', cost: 60000, requires: 'packer', effect: { type: 'stationSpeed', target: 'grinder', mult: 2 } },
  { zone: 'finca', id: 'empaque_auto', name: 'Empacadora automática', icon: '📦', desc: 'La Empacadora llena el doble de bolsas.', cost: 150000, requires: 'packer', effect: { type: 'stationSpeed', target: 'packer', mult: 2 } },
  { zone: 'finca', id: 'cable', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'packer', effect: { type: 'muleSpeed', mult: 2 } },
  { zone: 'finca', id: 'sello', name: 'Sello de calidad', icon: '🏅', desc: 'Las bolsas de café valen un 50 % más.', cost: 300000, requires: 'packer', effect: { type: 'productValue', target: 'coffee_bag', mult: 1.5 } },

  // Zona 2 · El Trapiche
  { zone: 'trapiche', id: 'motor', name: 'Trapiche con motor', icon: '⚙️', desc: 'La Molienda muele el doble.', cost: 20000, requires: 'cane_mill', effect: { type: 'stationSpeed', target: 'cane_mill', mult: 2 } },
  { zone: 'trapiche', id: 'abono_cana', name: 'Abono para la caña', icon: '🌱', desc: 'El Cañaduzal produce el doble.', cost: 50000, requires: 'furnace', effect: { type: 'stationSpeed', target: 'canefield', mult: 2 } },
  { zone: 'trapiche', id: 'pailas', name: 'Hornilla de más pailas', icon: '🍯', desc: 'La Hornilla cocina el doble (para seguirle el paso al Abono para la caña).', cost: 40000, requires: 'furnace', effect: { type: 'stationSpeed', target: 'furnace', mult: 2 } },
  { zone: 'trapiche', id: 'chiva', name: 'Chiva para el Trapiche', icon: '🚚', desc: 'El despacho del Trapiche lleva el doble por viaje.', cost: 80000, requires: 'furnace', effect: { type: 'dispatchCapacity', target: 'trapiche', mult: 2 } },
  { zone: 'trapiche', id: 'gaveras_acero', name: 'Gaveras de acero', icon: '🧱', desc: 'Las Gaveras moldean el doble de rápido.', cost: 300000, requires: 'molds', effect: { type: 'stationSpeed', target: 'molds', mult: 2 } },
  { zone: 'trapiche', id: 'pulverizador', name: 'Pulverizadora eléctrica', icon: '🌀', desc: 'La Pulverizadora muele el doble.', cost: 600000, requires: 'pulverizer', effect: { type: 'stationSpeed', target: 'pulverizer', mult: 2 } },
  { zone: 'trapiche', id: 'panela_organica', name: 'Panela orgánica', icon: '🏅', desc: 'La panela pulverizada vale un 50 % más.', cost: 1500000, requires: 'pulverizer', effect: { type: 'productValue', target: 'panela_powder', mult: 1.5 } },

  // Zona 3 · La Lechería
  { zone: 'lecheria', id: 'ordeno', name: 'Ordeño mecánico', icon: '🐄', desc: 'El Potrero da el doble de leche.', cost: 300000, requires: 'pasteurizer', effect: { type: 'stationSpeed', target: 'pasture', mult: 2 } },
  { zone: 'lecheria', id: 'placas', name: 'Pasteurizadora de placas', icon: '🌡️', desc: 'La Pasteurizadora procesa el doble (para seguirle el paso al Ordeño mecánico).', cost: 400000, requires: 'pasteurizer', effect: { type: 'stationSpeed', target: 'pasteurizer', mult: 2 } },
  { zone: 'lecheria', id: 'centrifuga', name: 'Descremadora centrífuga', icon: ICON.cream, desc: 'La Descremadora saca el doble de crema.', cost: 1200000, requires: 'separator', effect: { type: 'stationSpeed', target: 'separator', mult: 2 } },
  { zone: 'lecheria', id: 'carrotanque', name: 'Carrotanque', icon: '🚛', desc: 'El despacho de la Lechería lleva el doble por viaje.', cost: 1500000, requires: 'cheesery', effect: { type: 'dispatchCapacity', target: 'lecheria', mult: 2 } },
  { zone: 'lecheria', id: 'batidora', name: 'Batidora eléctrica', icon: '🧈', desc: 'La Batidora bate el doble de rápido.', cost: 3000000, requires: 'churn', effect: { type: 'stationSpeed', target: 'churn', mult: 2 } },
  { zone: 'lecheria', id: 'cuajo', name: 'Cuajo de calidad', icon: ICON.cheese, desc: 'La Quesera cuaja el doble de rápido.', cost: 8000000, requires: 'cheesery', effect: { type: 'stationSpeed', target: 'cheesery', mult: 2 } },
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
  { zone: 'cacaotal', id: 'temperadora', name: 'Temperadora', icon: ICON.milkChocolate, desc: 'La Chocolatería hace el doble de chocolatinas (las rutas se ajustan solas).', cost: 80000000, requires: 'chocolatier', effect: { type: 'stationSpeed', target: 'chocolatier', mult: 2 } },
  { zone: 'cacaotal', id: 'cacao_fino', name: 'Cacao fino de aroma', icon: '🏅', desc: 'Todo lo que vende el Cacaotal vale un 50 % más.', cost: 60000000, requires: 'chocolate_table', effect: { type: 'zoneValue', target: 'cacaotal', mult: 1.5 } },

  // Zona 5 · El Maizal
  { zone: 'maizal', id: 'maiz_hibrido', name: 'Maíz híbrido', icon: '🌽', desc: 'El Maizal da el doble de mazorcas.', cost: 15000000, requires: 'sheller', effect: { type: 'stationSpeed', target: 'cornfield', mult: 2 } },
  { zone: 'maizal', id: 'desgranadora_motor', name: 'Desgranadora con motor', icon: '⚙️', desc: 'La Desgranadora desgrana el doble (para seguirle el paso al Maíz híbrido).', cost: 18000000, requires: 'sheller', effect: { type: 'stationSpeed', target: 'sheller', mult: 2 } },
  { zone: 'maizal', id: 'piladora_electrica', name: 'Piladora eléctrica', icon: '🪵', desc: 'La Piladora pila el doble.', cost: 45000000, requires: 'dough_mill', effect: { type: 'stationSpeed', target: 'corn_huller', mult: 2 } },
  { zone: 'maizal', id: 'camion_maiz', name: 'Camión para el Maizal', icon: '🚚', desc: 'El despacho del Maizal lleva el doble por viaje.', cost: 60000000, requires: 'corn_huller', effect: { type: 'dispatchCapacity', target: 'maizal', mult: 2 } },
  { zone: 'maizal', id: 'molino_discos', name: 'Molino de discos', icon: '🌀', desc: 'El Molino de masa muele el doble.', cost: 120000000, requires: 'budare', effect: { type: 'stationSpeed', target: 'dough_mill', mult: 2 } },
  { zone: 'maizal', id: 'budare_grande', name: 'Budare grande', icon: '🔥', desc: 'El Budare asa el doble de arepas.', cost: 300000000, requires: 'arepa_stand', effect: { type: 'stationSpeed', target: 'budare', mult: 2 } },
  { zone: 'maizal', id: 'plancha_doble', name: 'Plancha doble', icon: ICON.cheeseArepa, desc: 'El Puesto de arepas atiende el doble (las rutas se ajustan solas).', cost: 500000000, requires: 'arepa_stand', effect: { type: 'stationSpeed', target: 'arepa_stand', mult: 2 } },
  { zone: 'maizal', id: 'receta_abuela', name: 'Receta de la abuela', icon: '🏅', desc: 'Todo lo que vende el Maizal vale un 50 % más.', cost: 400000000, requires: 'budare', effect: { type: 'zoneValue', target: 'maizal', mult: 1.5 } },
  // Zona 6 · El Pueblo: cada estación al doble (lo que gasta de más llega de las otras zonas, que también
  // tienen sus investigaciones), un camión para el despacho y la denominación de origen.
  { zone: 'pueblo', id: 'catadores', name: 'Catadores expertos', icon: '👃', desc: 'La Casa del café selecciona el doble de café de origen (pide el doble de bolsas a la Finca).', cost: 1000000000, requires: 'greca', effect: { type: 'stationSpeed', target: 'coffee_house', mult: 2 } },
  { zone: 'pueblo', id: 'greca_doble', name: 'Greca de dos llaves', icon: '☕', desc: 'La Greca prepara el doble de tintos.', cost: 1500000000, requires: 'greca', effect: { type: 'stationSpeed', target: 'greca', mult: 2 } },
  { zone: 'pueblo', id: 'tractomula', name: 'Tractomula', icon: '🚛', desc: 'El despacho de Salento lleva el doble por viaje.', cost: 2500000000, requires: 'fonda', effect: { type: 'dispatchCapacity', target: 'pueblo', mult: 2 } },
  { zone: 'pueblo', id: 'mas_mesas', name: 'Más mesas en la Fonda', icon: '🍽️', desc: 'La Fonda sirve el doble de desayunos.', cost: 4000000000, requires: 'fonda', effect: { type: 'stationSpeed', target: 'fonda', mult: 2 } },
  { zone: 'pueblo', id: 'tejedoras', name: 'Tejedoras de fique', icon: '🧶', desc: 'El Taller teje el doble de canastas.', cost: 8000000000, requires: 'basket_shop', effect: { type: 'stationSpeed', target: 'basket_shop', mult: 2 } },
  { zone: 'pueblo', id: 'monos', name: 'Cintas y moños', icon: '🎀', desc: 'El Empaque de regalos arma el doble de canastas.', cost: 15000000000, requires: 'gift_wrap', effect: { type: 'stationSpeed', target: 'gift_wrap', mult: 2 } },
  { zone: 'pueblo', id: 'grua', name: 'Grúa de contenedores', icon: '🏗️', desc: 'El Patio de contenedores llena el doble.', cost: 40000000000, requires: 'export_dock', effect: { type: 'stationSpeed', target: 'export_dock', mult: 2 } },
  { zone: 'pueblo', id: 'denominacion', name: 'Denominación de origen', icon: '🏅', desc: 'Todo lo que vende Salento vale un 50 % más.', cost: 25000000000, requires: 'gift_wrap', effect: { type: 'zoneValue', target: 'pueblo', mult: 1.5 } },
  // Maestría (v1.7): con todos los edificios de una zona en el nivel 75, toda la zona produce ×4; y
  // Supremacía, en el nivel 100, ×8 más. Ayudan a llegar al segundo final (todo al nivel 100).
  { zone: 'finca', id: 'maestria_finca', name: 'Maestría: Finca', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 50000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'finca', mult: 4 } },
  { zone: 'trapiche', id: 'maestria_trapiche', name: 'Maestría: Trapiche', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 200000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'trapiche', mult: 4 } },
  { zone: 'lecheria', id: 'maestria_lecheria', name: 'Maestría: Lechería', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 1000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'lecheria', mult: 4 } },
  { zone: 'cacaotal', id: 'maestria_cacaotal', name: 'Maestría: Cacaotal', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 5000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'cacaotal', mult: 4 } },
  { zone: 'maizal', id: 'maestria_maizal', name: 'Maestría: Maizal', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 20000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'maizal', mult: 4 } },
  { zone: 'pueblo', id: 'maestria_pueblo', name: 'Maestría: Salento', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 100000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'pueblo', mult: 4 } },
  { zone: 'finca', id: 'supremacia_finca', name: 'Supremacía: Finca', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 500000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'finca', mult: 8 } },
  { zone: 'trapiche', id: 'supremacia_trapiche', name: 'Supremacía: Trapiche', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 2000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'trapiche', mult: 8 } },
  { zone: 'lecheria', id: 'supremacia_lecheria', name: 'Supremacía: Lechería', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 10000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'lecheria', mult: 8 } },
  { zone: 'cacaotal', id: 'supremacia_cacaotal', name: 'Supremacía: Cacaotal', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 50000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'cacaotal', mult: 8 } },
  { zone: 'maizal', id: 'supremacia_maizal', name: 'Supremacía: Maizal', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 200000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'maizal', mult: 8 } },
  { zone: 'pueblo', id: 'supremacia_pueblo', name: 'Supremacía: Salento', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 1000000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'pueblo', mult: 8 } },

  // Santander · La Guayabera (v3.0): las mismas de la Finca, con su propio sabor.
  { zone: 'guayabera', id: 'injerto_guayabo', name: 'Guayabos injertados', icon: '🌳', desc: 'El Guayabal produce el doble.', cost: 300, requires: 'guava_pulper', effect: { type: 'stationSpeed', target: 'guava_grove', mult: 2 } },
  { zone: 'guayabera', id: 'despulpadora_motor', name: 'Despulpadora con motor', icon: '⚡', desc: 'La Despulpadora de guayaba procesa el doble.', cost: 400, requires: 'guava_pulper', effect: { type: 'stationSpeed', target: 'guava_pulper', mult: 2 } },
  { zone: 'guayabera', id: 'herraduras_s', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'guava_pot', effect: { type: 'muleSpeed', mult: 1.5 } },
  { zone: 'guayabera', id: 'remolque_s', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'guava_molds', effect: { type: 'dispatchCapacity', target: 'guayabera', mult: 2 } },
  { zone: 'guayabera', id: 'paila_grande', name: 'Paila grande', icon: '🔥', desc: 'La Paila de bocadillo cocina el doble.', cost: 6000, requires: 'guava_molds', effect: { type: 'stationSpeed', target: 'guava_pot', mult: 2 } },
  { zone: 'guayabera', id: 'moldes_dobles', name: 'Moldes dobles', icon: '🪵', desc: 'Los Moldes de madera cuajan el doble.', cost: 8000, requires: 'bocadillo_cutter', effect: { type: 'stationSpeed', target: 'guava_molds', mult: 2 } },
  { zone: 'guayabera', id: 'guayaba_roja', name: 'Guayaba roja', icon: '🏅', desc: 'El bocadillo vale un 50 % más.', cost: 20000, requires: 'bocadillo_cutter', effect: { type: 'productValue', target: 'bocadillo', mult: 1.5 } },
  { zone: 'guayabera', id: 'cortadora_hilo', name: 'Cortadora de hilo', icon: '🔪', desc: 'La Cortadora corta el doble.', cost: 25000, requires: 'bijao_wrapper', effect: { type: 'stationSpeed', target: 'bocadillo_cutter', mult: 2 } },
  { zone: 'guayabera', id: 'veleno', name: 'Denominación Vélez', icon: '🌳', desc: 'Bocadillo de origen: todo lo que vende la Guayabera vale un 50 % más.', cost: 50000, requires: 'bijao_wrapper', effect: { type: 'zoneValue', target: 'guayabera', mult: 1.5 } },
  { zone: 'guayabera', id: 'envolvedoras', name: 'Envolvedoras de Vélez', icon: '🍃', desc: 'La Envoltura en bijao envuelve el doble.', cost: 60000, requires: 'crate_packer', effect: { type: 'stationSpeed', target: 'bijao_wrapper', mult: 2 } },
  { zone: 'guayabera', id: 'cajonera_s', name: 'Cajonera automática', icon: '📦', desc: 'La Cajonera llena el doble de cajas.', cost: 150000, requires: 'crate_packer', effect: { type: 'stationSpeed', target: 'crate_packer', mult: 2 } },
  { zone: 'guayabera', id: 'cable_s', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'crate_packer', effect: { type: 'muleSpeed', mult: 2 } },
  { zone: 'guayabera', id: 'sello_s', name: 'Sello de calidad', icon: '🏅', desc: 'Las cajas de bocadillos valen un 50 % más.', cost: 300000, requires: 'crate_packer', effect: { type: 'productValue', target: 'bocadillo_crate', mult: 1.5 } },
  { zone: 'guayabera', id: 'maestria_guayabera', name: 'Maestría: Guayabera', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 50000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'guayabera', mult: 4 } },
  { zone: 'guayabera', id: 'supremacia_guayabera', name: 'Supremacía: Guayabera', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 500000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'guayabera', mult: 8 } },

  // Santander · El Tabacal (v3.1): las mismas del Trapiche.
  { zone: 'tabacal', id: 'caney_grande', name: 'Caney grande', icon: '🛖', desc: 'El Caney de curado cura el doble.', cost: 20000, requires: 'caney', effect: { type: 'stationSpeed', target: 'caney', mult: 2 } },
  { zone: 'tabacal', id: 'abono_tabaco', name: 'Abono para el tabaco', icon: '🌱', desc: 'El Tabacal produce el doble.', cost: 50000, requires: 'stripper', effect: { type: 'stationSpeed', target: 'tobacco_field', mult: 2 } },
  { zone: 'tabacal', id: 'mesas_despalillar', name: 'Mesas de despalillar', icon: '✂️', desc: 'La Despalilladora trabaja el doble.', cost: 40000, requires: 'stripper', effect: { type: 'stationSpeed', target: 'stripper', mult: 2 } },
  { zone: 'tabacal', id: 'chiva_s', name: 'Chiva para el Tabacal', icon: '🚚', desc: 'El despacho del Tabacal lleva el doble por viaje.', cost: 80000, requires: 'stripper', effect: { type: 'dispatchCapacity', target: 'tabacal', mult: 2 } },
  { zone: 'tabacal', id: 'pilones_altos', name: 'Pilones más altos', icon: '♨️', desc: 'Los Pilones de fermentación fermentan el doble.', cost: 300000, requires: 'tobacco_piles', effect: { type: 'stationSpeed', target: 'tobacco_piles', mult: 2 } },
  { zone: 'tabacal', id: 'torcedoras', name: 'Escuela de torcedores', icon: '🤲', desc: 'Los Torcedores tuercen el doble.', cost: 600000, requires: 'cigar_roller', effect: { type: 'stationSpeed', target: 'cigar_roller', mult: 2 } },
  { zone: 'tabacal', id: 'tabaco_negro', name: 'Tabaco negro de origen', icon: '🏅', desc: 'El tabaco torcido vale un 50 % más.', cost: 1500000, requires: 'cigar_roller', effect: { type: 'productValue', target: 'cigar', mult: 1.5 } },
  { zone: 'tabacal', id: 'maestria_tabacal', name: 'Maestría: Tabacal', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 200000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'tabacal', mult: 4 } },
  { zone: 'tabacal', id: 'supremacia_tabacal', name: 'Supremacía: Tabacal', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 2000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'tabacal', mult: 8 } },

  // Santander · La Fiquera (v3.2): las mismas de la Lechería.
  { zone: 'fiquera', id: 'abono_fique', name: 'Abono para el fique', icon: '🌱', desc: 'El Cultivo de fique da el doble de pencas.', cost: 300000, requires: 'decorticator', effect: { type: 'stationSpeed', target: 'fique_field', mult: 2 } },
  { zone: 'fiquera', id: 'desfibradora_motor', name: 'Desfibradora de motor', icon: '⚙️', desc: 'La Desfibradora saca el doble de fibra.', cost: 400000, requires: 'decorticator', effect: { type: 'stationSpeed', target: 'decorticator', mult: 2 } },
  { zone: 'fiquera', id: 'hiladora_mecanica', name: 'Hiladora mecánica', icon: ICON.fiqueYarn, desc: 'La Hiladora hila el doble.', cost: 1200000, requires: 'spinner', effect: { type: 'stationSpeed', target: 'spinner', mult: 2 } },
  { zone: 'fiquera', id: 'camion_fiquera', name: 'Camión de estacas', icon: '🚛', desc: 'El despacho de la Fiquera lleva el doble por viaje.', cost: 1500000, requires: 'sack_loom', effect: { type: 'dispatchCapacity', target: 'fiquera', mult: 2 } },
  { zone: 'fiquera', id: 'hormas', name: 'Hormas de alpargata', icon: ICON.alpargatas, desc: 'La Alpargatería hace el doble de pares.', cost: 3000000, requires: 'alpargata_shop', effect: { type: 'stationSpeed', target: 'alpargata_shop', mult: 2 } },
  { zone: 'fiquera', id: 'telar_mecanico', name: 'Telar mecánico', icon: ICON.fiqueSack, desc: 'El Telar de costales teje el doble.', cost: 8000000, requires: 'sack_loom', effect: { type: 'stationSpeed', target: 'sack_loom', mult: 2 } },
  { zone: 'fiquera', id: 'costal_cafetero', name: 'Costal cafetero', icon: '🏅', desc: 'El costal de fique vale un 50 % más.', cost: 15000000, requires: 'sack_loom', effect: { type: 'productValue', target: 'fique_sack', mult: 1.5 } },
  { zone: 'fiquera', id: 'prensa_tercios', name: 'Prensa de tercios', icon: ICON.tobaccoBale, desc: 'La Empacadora arma el doble de tercios (la Chiva de la ruta se ajusta sola).', cost: 25000000, requires: 'tercio_packer', effect: { type: 'stationSpeed', target: 'tercio_packer', mult: 2 } },
  { zone: 'fiquera', id: 'tercios_exportacion', name: 'Tercios de exportación', icon: '🏅', desc: 'El tercio de tabaco vale un 50 % más.', cost: 50000000, requires: 'tercio_packer', effect: { type: 'productValue', target: 'tobacco_bale', mult: 1.5 } },
  { zone: 'fiquera', id: 'maestria_fiquera', name: 'Maestría: Fiquera', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 1000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'fiquera', mult: 4 } },
  { zone: 'fiquera', id: 'supremacia_fiquera', name: 'Supremacía: Fiquera', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 10000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'fiquera', mult: 8 } },

  // Santander · El Hato (v3.3): las mismas del Cacaotal.
  { zone: 'hato', id: 'pasto_mejorado', name: 'Pasto mejorado', icon: '🌱', desc: 'El Hato da el doble de novillos.', cost: 1000000, requires: 'butcher', effect: { type: 'stationSpeed', target: 'cattle_ranch', mult: 2 } },
  { zone: 'hato', id: 'sierra', name: 'Sierra eléctrica', icon: '🥩', desc: 'La Fama despresa el doble.', cost: 1200000, requires: 'butcher', effect: { type: 'stationSpeed', target: 'butcher', mult: 2 } },
  { zone: 'hato', id: 'saladero_grande', name: 'Saladero grande', icon: ICON.saltedBeef, desc: 'El Saladero adoba el doble.', cost: 3000000, requires: 'airing_rack', effect: { type: 'stationSpeed', target: 'salter', mult: 2 } },
  { zone: 'hato', id: 'camion_hato', name: 'Camión ganadero', icon: '🚚', desc: 'El despacho del Hato lleva el doble por viaje.', cost: 5000000, requires: 'salter', effect: { type: 'dispatchCapacity', target: 'hato', mult: 2 } },
  { zone: 'hato', id: 'tendedero_techado', name: 'Tendedero techado', icon: ICON.carneOreada, desc: 'El Tendedero orea el doble.', cost: 8000000, requires: 'grill', effect: { type: 'stationSpeed', target: 'airing_rack', mult: 2 } },
  { zone: 'hato', id: 'parrilla_grande', name: 'Parrilla grande', icon: '🔥', desc: 'El Asadero asa el doble.', cost: 20000000, requires: 'lunch_table', effect: { type: 'stationSpeed', target: 'grill', mult: 2 } },
  { zone: 'hato', id: 'fogon_lena', name: 'Fogón de leña', icon: ICON.almuerzo, desc: 'La Mesa del almuerzo sirve el doble.', cost: 50000000, requires: 'fiambre_maker', effect: { type: 'stationSpeed', target: 'lunch_table', mult: 2 } },
  { zone: 'hato', id: 'hojas_bijao', name: 'Hojas de bijao de sobra', icon: ICON.fiambre, desc: 'La Fiambrería envuelve el doble de fiambres (las rutas se ajustan solas).', cost: 80000000, requires: 'fiambre_maker', effect: { type: 'stationSpeed', target: 'fiambre_maker', mult: 2 } },
  { zone: 'hato', id: 'oreada_origen', name: 'Carne oreada de origen', icon: '🏅', desc: 'Todo lo que vende el Hato vale un 50 % más.', cost: 60000000, requires: 'lunch_table', effect: { type: 'zoneValue', target: 'hato', mult: 1.5 } },
  { zone: 'hato', id: 'maestria_hato', name: 'Maestría: Hato', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 5000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'hato', mult: 4 } },
  { zone: 'hato', id: 'supremacia_hato', name: 'Supremacía: Hato', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 50000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'hato', mult: 8 } },

  // Santander · Las Hormigas (v3.4): las mismas del Maizal.
  { zone: 'hormigas', id: 'reinas_grandes', name: 'Hormigueros cuidados', icon: ICON.antQueen, desc: 'El Hormiguero da el doble de hormigas en cada cosecha.', cost: 15000000, requires: 'ant_cleaner', effect: { type: 'stationSpeed', target: 'anthill', mult: 2 } },
  { zone: 'hormigas', id: 'manos_limpieza', name: 'Más manos en la limpieza', icon: ICON.antClean, desc: 'La Mesa de limpieza limpia el doble.', cost: 18000000, requires: 'ant_cleaner', effect: { type: 'stationSpeed', target: 'ant_cleaner', mult: 2 } },
  { zone: 'hormigas', id: 'ollas_grandes', name: 'Ollas grandes', icon: ICON.antBrine, desc: 'Las Ollas de salmuera remojan el doble.', cost: 45000000, requires: 'ant_toaster', effect: { type: 'stationSpeed', target: 'brine_pot', mult: 2 } },
  { zone: 'hormigas', id: 'camion_hormigas', name: 'Camioneta de las Hormigas', icon: '🚚', desc: 'El despacho de las Hormigas lleva el doble por viaje.', cost: 60000000, requires: 'brine_pot', effect: { type: 'dispatchCapacity', target: 'hormigas', mult: 2 } },
  { zone: 'hormigas', id: 'tiestos', name: 'Tiestos nuevos', icon: ICON.toastedAnts, desc: 'El Tiesto de barro tuesta el doble.', cost: 120000000, requires: 'cone_table', effect: { type: 'stationSpeed', target: 'ant_toaster', mult: 2 } },
  { zone: 'hormigas', id: 'papel_cucuruchos', name: 'Resma de papel', icon: ICON.antCone, desc: 'La Mesa de cucuruchos arma el doble.', cost: 300000000, requires: 'souvenir_shop', effect: { type: 'stationSpeed', target: 'cone_table', mult: 2 } },
  { zone: 'hormigas', id: 'tienda_grande', name: 'Tienda en la plaza', icon: ICON.recuerdo, desc: 'La Tienda de recuerdos vende el doble (las rutas se ajustan solas).', cost: 500000000, requires: 'souvenir_shop', effect: { type: 'stationSpeed', target: 'souvenir_shop', mult: 2 } },
  { zone: 'hormigas', id: 'hormiga_origen', name: 'Hormiga culona de origen', icon: '🏅', desc: 'Todo lo que vende la zona de las Hormigas vale un 50 % más.', cost: 400000000, requires: 'cone_table', effect: { type: 'zoneValue', target: 'hormigas', mult: 1.5 } },
  { zone: 'hormigas', id: 'maestria_hormigas', name: 'Maestría: Hormigas', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 20000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'hormigas', mult: 4 } },
  { zone: 'hormigas', id: 'supremacia_hormigas', name: 'Supremacía: Hormigas', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 200000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'hormigas', mult: 8 } },

  // Santander · Barichara (v3.5): las mismas del Pueblo.
  { zone: 'barichara', id: 'reposteras', name: 'Reposteras de la plaza', icon: '👩‍🍳', desc: 'La Dulcería hace el doble de dulces (pide el doble de cajas a la Guayabera).', cost: 1000000000, requires: 'park_cafe', effect: { type: 'stationSpeed', target: 'dulceria', mult: 2 } },
  { zone: 'barichara', id: 'cafetera_grande', name: 'Cafetera grande', icon: '☕', desc: 'El Café del parque sirve el doble de sobremesas.', cost: 1500000000, requires: 'park_cafe', effect: { type: 'stationSpeed', target: 'park_cafe', mult: 2 } },
  { zone: 'barichara', id: 'bus_turismo', name: 'Bus de turismo', icon: '🚌', desc: 'El despacho de Barichara lleva el doble por viaje.', cost: 2500000000, requires: 'posada', effect: { type: 'dispatchCapacity', target: 'barichara', mult: 2 } },
  { zone: 'barichara', id: 'mas_cuartos', name: 'Más cuartos en la posada', icon: '🛏️', desc: 'La Posada recibe el doble de huéspedes.', cost: 4000000000, requires: 'posada', effect: { type: 'stationSpeed', target: 'posada', mult: 2 } },
  { zone: 'barichara', id: 'papel_fique', name: 'Papel de fique', icon: ICON.cajaSurtida, desc: 'El Taller de cajas arma el doble.', cost: 8000000000, requires: 'box_shop', effect: { type: 'stationSpeed', target: 'box_shop', mult: 2 } },
  { zone: 'barichara', id: 'canastos_grandes', name: 'Canastos grandes', icon: ICON.canastaCaminante, desc: 'Las Canastas del caminante se arman el doble de rápido.', cost: 15000000000, requires: 'hamper', effect: { type: 'stationSpeed', target: 'hamper', mult: 2 } },
  { zone: 'barichara', id: 'guias', name: 'Guías del Camino Real', icon: '🧭', desc: 'La Salida al Camino Real despacha el doble de excursiones.', cost: 40000000000, requires: 'camino_real', effect: { type: 'stationSpeed', target: 'camino_real', mult: 2 } },
  { zone: 'barichara', id: 'monumento', name: 'Monumento Nacional', icon: '🏅', desc: 'Todo lo que vende Barichara vale un 50 % más.', cost: 25000000000, requires: 'hamper', effect: { type: 'zoneValue', target: 'barichara', mult: 1.5 } },
  { zone: 'barichara', id: 'maestria_barichara', name: 'Maestría: Barichara', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 100000000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'barichara', mult: 4 } },
  { zone: 'barichara', id: 'supremacia_barichara', name: 'Supremacía: Barichara', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 1000000000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'barichara', mult: 8 } },

  // Costa · El Arrozal (v3.15): las mismas de la Finca y la Guayabera, con el arroz.
  { zone: 'arrozal', id: 'semilla_certificada', name: 'Semilla certificada', icon: '🌾', desc: 'El Arrozal produce el doble.', cost: 300, requires: 'rice_dryer', effect: { type: 'stationSpeed', target: 'rice_field', mult: 2 } },
  { zone: 'arrozal', id: 'secadora_gas', name: 'Secadora a gas', icon: '🔥', desc: 'La Secadora de arroz seca el doble.', cost: 400, requires: 'rice_dryer', effect: { type: 'stationSpeed', target: 'rice_dryer', mult: 2 } },
  { zone: 'arrozal', id: 'herraduras_c', name: 'Herraduras', icon: '🐴', desc: 'Las mulas caminan un 50 % más rápido.', cost: 900, requires: 'rice_huller', effect: { type: 'muleSpeed', mult: 1.5 } },
  { zone: 'arrozal', id: 'remolque_c', name: 'Remolque para el Willys', icon: '🚙', desc: 'El Willys lleva el doble por viaje.', cost: 2500, requires: 'rice_polisher', effect: { type: 'dispatchCapacity', target: 'arrozal', mult: 2 } },
  { zone: 'arrozal', id: 'descascaradora_rodillos', name: 'Rodillos de caucho', icon: '⚙️', desc: 'La Descascaradora descascara el doble.', cost: 6000, requires: 'rice_polisher', effect: { type: 'stationSpeed', target: 'rice_huller', mult: 2 } },
  { zone: 'arrozal', id: 'pulidora_agua', name: 'Pulidora con agua', icon: '💧', desc: 'La Pulidora pule el doble.', cost: 8000, requires: 'rice_sorter', effect: { type: 'stationSpeed', target: 'rice_polisher', mult: 2 } },
  { zone: 'arrozal', id: 'grano_largo', name: 'Grano largo', icon: '🏅', desc: 'El arroz excelso vale un 50 % más.', cost: 20000, requires: 'rice_sorter', effect: { type: 'productValue', target: 'premium_rice', mult: 1.5 } },
  { zone: 'arrozal', id: 'clasificadora_optica', name: 'Clasificadora óptica', icon: '🔍', desc: 'La Clasificadora clasifica el doble.', cost: 25000, requires: 'rice_bagger', effect: { type: 'stationSpeed', target: 'rice_sorter', mult: 2 } },
  { zone: 'arrozal', id: 'arroz_sinu', name: 'Arroz del Sinú', icon: '🌴', desc: 'Arroz de origen: todo lo que vende el Arrozal vale un 50 % más.', cost: 50000, requires: 'rice_bagger', effect: { type: 'zoneValue', target: 'arrozal', mult: 1.5 } },
  { zone: 'arrozal', id: 'selladora', name: 'Selladora automática', icon: '🛍️', desc: 'La Empacadora de arroz empaca el doble.', cost: 60000, requires: 'rice_stacker', effect: { type: 'stationSpeed', target: 'rice_bagger', mult: 2 } },
  { zone: 'arrozal', id: 'bultera_auto', name: 'Bultera automática', icon: '📦', desc: 'La Bultera llena el doble de bultos.', cost: 150000, requires: 'rice_stacker', effect: { type: 'stationSpeed', target: 'rice_stacker', mult: 2 } },
  { zone: 'arrozal', id: 'cable_c', name: 'Cable aéreo', icon: '🚡', desc: 'Las mulas caminan el doble de rápido.', cost: 120000, requires: 'rice_stacker', effect: { type: 'muleSpeed', mult: 2 } },
  { zone: 'arrozal', id: 'sello_c', name: 'Sello de calidad', icon: '🏅', desc: 'Los bultos de arroz valen un 50 % más.', cost: 300000, requires: 'rice_stacker', effect: { type: 'productValue', target: 'rice_sack', mult: 1.5 } },
  { zone: 'arrozal', id: 'maestria_arrozal', name: 'Maestría: Arrozal', icon: '⭐', desc: 'Todos los edificios de la zona producen ×4.', cost: 50000000, minLevel: 75, effect: { type: 'zoneSpeed', target: 'arrozal', mult: 4 } },
  { zone: 'arrozal', id: 'supremacia_arrozal', name: 'Supremacía: Arrozal', icon: '👑', desc: 'Todos los edificios de la zona producen ×8.', cost: 500000000, minLevel: 100, effect: { type: 'zoneSpeed', target: 'arrozal', mult: 8 } },
];

// Las que duplican una estación (v2.3.2) se habilitan cuando esa misma estación y sus arrieros llegan al
// nivel 25 (antes, al construir la siguiente). La Compostera no tiene arrieros: le basta su nivel.
export const DOUBLE_LEVEL = 25;
for (const r of RESEARCH) {
  if (r.effect.type !== 'stationSpeed' || r.effect.mult !== 2) continue;
  r.requires = r.effect.target;
  r.stationLevel = DOUBLE_LEVEL;
}

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
