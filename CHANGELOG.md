# Registro de cambios

## v1.0.1 — Arrieros parejos
- **Arrieros al mismo nivel que su estación llevan todo lo que produce** (un 25 % más), sin importar la distancia ni las investigaciones. Antes la carga se calculaba para un viaje fijo y sin contar el Abono ni el compost: en tramos largos o con investigaciones hacían falta arrieros de más nivel, y en tramos cortos sobraban.
- La carga por mula puede tener decimales: cada nivel de arrieros suma capacidad (antes varios niveles seguidos no cambiaban nada).
- La pestaña Arrieros compara lo que llevan con lo que produce la estación y dice a qué nivel subirlos.
- La «Producción» de cada estación ya incluye investigaciones y compost.
- Corregido: los objetivos «Vende café lavado / tostado / molido» podían quedar imposibles (solo se venden si se desvían) y bloquear la lista. Ahora cuentan lo producido.
- La zona dura ahora unas 3 h 20 min – 3 h 30 min (antes 1 h 30 min – 3 h).

## v1.0 — Zona 1 completa
- **Compostera** (rama opcional): la pulpa del Beneficiadero llega por una canaleta y se convierte en compost, que acelera el Cafetal ×1,5 mientras haya. Se gasta 1 compost por cada 20 cerezas.
- **Flecha guía** en el mapa: señala la construcción o mejora que conviene, solo cuando ya te alcanza.
- **App instalable** (PWA): icono propio, pantalla completa y se puede abrir sin internet.
- Monedas en la pestaña del navegador, Esc cierra ventanas y menos partículas si el sistema pide reducir el movimiento.
- Corregido: el aviso «la estación anterior produce más de lo que esta procesa» casi nunca aparecía.
- 30 objetivos (nuevo: construir la Compostera).

## v0.5 — Guía
- Objetivos con recompensa, investigaciones, mejora recomendada, bienvenida con ganancias sin conexión, copia de seguridad.
- Herramienta de balance (`npm run balance`).
- Corregido: lo desviado podía llenar la bodega y dejar sin sitio al producto final.

## v0.4 — Vida
- Edificios que evolucionan en cada hito, día y noche decorativo, aves, luciérnagas, monedas y sonido sintetizado.

## v0.3 — Arrieros
- Mulas por estación que van y vuelven, con nivel propio; vista «La cadena».

## v0.2 — Cadena
- Las seis estaciones de procesamiento, desvío a la bodega e indicadores de estado.

## v0.1 — Prototipo
- Mapa isométrico, Cafetal, mulas, bodega y Willys, mejoras y guardado.
