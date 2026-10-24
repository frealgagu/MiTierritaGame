# Cafetal — Documento de Diseño (GDD) v0.3

> Juego incremental de **cadena de suministros**: un recurso inicial ilimitado pero lento alimenta a una estación, esa estación alimenta a la siguiente, y todo se mejora para producir cada vez más.
> De Frozen City solo se toman la cadena de producción visible y el estilo gráfico isométrico «de juguete», con personajes que llevan cargas.
> No hay supervivencia, ni clima hostil, ni población que alimentar, ni héroes.
> Una sola zona que se puede terminar y que se ampliará con actualizaciones. JavaScript (Vite + PixiJS).

---

## 1. Tema

Se buscó un tema en el que una cadena larga de transformación sea **natural y fácil de entender**, en el que cada paso **aumente el valor** del producto y en el que el origen sea **ilimitado**.

| Tema | Fuente ilimitada | Cadena | Notas |
|------|------------------|--------|-------|
| **Cafetal** (finca cafetera de montaña) | Cafeto (cerezas) | cereza → lavado → pergamino → verde → tostado → molido → bolsa | **Recomendado**: cadena real de 7 pasos, muy visual y con mucha identidad |
| Panadería de pueblo | Trigal | trigo → harina → masa → pan → pastel | Más corta, ideal si se quiere algo muy simple |
| Fábrica de chocolate | Cacaotal | cacao → fermentado → tostado → pasta → tableta → bombón | Muy parecida al café; buena como Zona 2 |
| Herrería minera | Veta de mineral | mineral → lingote → barra → pieza → herramienta | Tono más industrial |

**Se elige Cafetal** porque:
- La cadena real del café tiene muchos pasos con nombre propio, cada uno con su edificio reconocible.
- El paisaje cafetero (montañas verdes, niebla, casas de colores con balcones, palmas altas, mulas y jeeps Willys cargados) da un estilo gráfico propio y encantador.
- Las expansiones salen solas: tostaduría en el pueblo, cafetería con bebidas, puerto de exportación, cacao…

---

## 2. Concepto

> *Heredas una ladera con unos pocos cafetos y una mula. Cosecha, procesa y despacha café cada vez mejor hasta llenar tu primer contenedor de exportación.*

- **Género:** incremental / idle de cadena de producción.
- **Vista:** isométrica. La finca baja por la ladera: arriba el cafetal y abajo el pueblo donde se despacha. La cadena se lee de arriba abajo.
- **Sesiones:** cortas (de 2 a 10 min) o dejándolo correr. Ganancias sin conexión con un límite.
- **Zona 1:** de 3 a 5 horas hasta el objetivo final. **Tiene final**: no hay que esperar días.
- **Sin:** héroes, gacha, energía, anuncios ni pagos.

### Pilares
1. **Cada producto alimenta al siguiente.** Siempre se ve qué estación está esperando y cuál se está atascando.
2. **Mejorar siempre se nota.** Cada compra acelera algo de forma visible: más mulas, máquinas más rápidas, números más grandes.
3. **El cuello de botella se mueve.** Si arreglas uno, aparece otro más abajo. Ese es el juego.
4. **Pequeño y terminado.**

---

## 3. Bucle de juego

```
 Cafetal (ilimitado, lento)
      │  cerezas
      ▼
 Estación 2 ─► Estación 3 ─► … ─► Bodega ─► Despacho (Willys) ─► 💰 Monedas
      ▲                                                            │
      └──────────── Mejorar nivel / arrieros / desbloquear ◄───────┘
```

1. El **Cafetal** produce cerezas sin fin, pero despacio.
2. Cada **estación** transforma lo que recibe en un producto de mayor valor.
3. Los **arrieros** (mulas) llevan el producto de una estación a la siguiente.
4. Todo lo que llega a la **Bodega** lo vende el **Despacho** y se convierte en monedas.
5. Con las monedas se **mejora**, se **desbloquean** estaciones y se compran **investigaciones**.

**Decisión clave:** ¿mejoro producción, transporte o venta? El jugador busca el cuello de botella; la UI se lo marca.

---

## 4. La cadena (Zona 1)

| # | Estación | Entra | Sale | Ciclo (nv. 1) | Valor unidad | Desbloqueo | Coste base de mejora |
|---|----------|-------|------|---------------|--------------|------------|----------------------|
| 1 | **Cafetal** ♾️ | — | 1 🍒 cereza | 2 s | 1 | Inicial | 5 |
| 2 | Beneficiadero (despulpar y lavar) | 2 🍒 | 1 💧 grano lavado | 4 s | 3 | 50 | 8 |
| 3 | Marquesina de secado | 1 💧 | 1 🟫 pergamino | 4 s | 6 | 250 | 12 |
| 4 | Trilladora | 1 🟫 | 1 🟢 café verde | 4 s | 10 | 1.000 | 20 |
| 5 | Tostadora | 2 🟢 | 1 🟤 café tostado | 8 s | 30 | 4.000 | 35 |
| 6 | Molino | 1 🟤 | 1 ☕ café molido | 8 s | 45 | 15.000 | 60 |
| 7 | Empacadora | 4 ☕ | 1 🛍️ bolsa de café | 32 s | 250 | 60.000 | 100 |
| — | **Bodega + Despacho** | cualquier producto | 💰 | viaje de 10 s | — | Inicial | 10 |

> **Regla de balance (v0.2):** a igual nivel, cada estación procesa exactamente lo que le entrega la anterior (los ciclos se calcularon a partir de 0,5 🍒/s del Cafetal a nivel 1). Así, subir toda la cadena junta mantiene el flujo equilibrado y el cuello de botella aparece cuando una estación se queda atrás. Simulado: un jugador que sube la cadena en bloque construye la Empacadora a los ~67 min; uno que mejora estación por estación, a las ~2 h 20 min.

- **Al principio solo existen el Cafetal y el Despacho:** se venden cerezas a 1 💰. Desbloquear el Beneficiadero vuelve más rentable cada cereza, y así sucesivamente.
- **Cada paso aumenta el valor** más de lo que consume (2 🍒 = 2 → 1 💧 = 3), así que procesar siempre conviene, **si la estación da abasto**. Si no, el sobrante también se vende en crudo.
- **Desvío automático:** si una estación está llena o bloqueada, su entrada se desvía a la Bodega y se vende tal cual. La cadena nunca se atasca del todo; solo rinde menos. La UI lo muestra con una flecha naranja de desvío.

---

## 4b. Mapa completo de la cadena (todas las zonas)

Esto es el **techo del juego**: todo lo que existirá cuando estén las 6 zonas. Se construye por partes (la v1.0 solo trae la Zona 1), pero el diseño, los datos y el balance se piensan desde el principio para que todo encaje.

### Resumen en números

| Concepto | Cantidad |
|----------|----------|
| Zonas | **6** |
| Fuentes ilimitadas | **5** (cafetal, cañaduzal, potrero, cacaotal, maizal); el Pueblo no tiene |
| Productos en total | **40** |
| Estaciones (edificios de producción) | **38** |
| Subproductos que potencian otras estaciones | 2 (pulpa → abono, bagazo) |
| Productos que combinan varias zonas | 10 |
| Producto final del juego | **Contenedor de exportación** |
| Profundidad máxima (pasos desde una fuente hasta el final) | 10 (de la cereza al contenedor) |

### Vista general

```mermaid
flowchart LR
  subgraph Z1[Zona 1 · La Finca]
    C1[Cereza] --> C2[Lavado] --> C3[Pergamino] --> C4[Verde] --> C5[Tostado] --> C6[Molido] --> C7[Bolsa de café]
    C2 -.pulpa.-> AB[Abono] -.potencia.-> C1
  end
  subgraph Z2[Zona 2 · El Trapiche]
    T1[Caña] --> T2[Guarapo] --> T3[Melado] --> T4[Panela] --> T5[Panela pulverizada]
    T1 -.bagazo.-> T3
  end
  subgraph Z3[Zona 3 · La Lechería]
    L1[Leche cruda] --> L2[Leche pasteurizada] --> L3[Crema] --> L4[Mantequilla]
    L2 --> L5[Queso campesino]
    L2 --> L6[Arequipe]
  end
  subgraph Z4[Zona 4 · El Cacaotal]
    K1[Mazorca de cacao] --> K2[Fermentado] --> K3[Seco] --> K4[Tostado] --> K5[Pasta de cacao]
    K5 --> K6[Chocolate de mesa]
    K5 --> K7[Chocolatina con leche]
  end
  subgraph Z5[Zona 5 · El Maizal]
    M1[Mazorca de maíz] --> M2[Desgranado] --> M3[Pilado] --> M4[Masa] --> M5[Arepa] --> M6[Arepa de queso]
  end
  subgraph Z6[Zona 6 · El Pueblo]
    P1[Café de origen] --> P2[Tinto] --> P3[Desayuno campesino]
    P1 --> P4[Canasta de fique] --> P5[Canasta de regalo] --> P6((Contenedor de exportación))
  end
  T5 --> L6 & K6 & K7 & P2
  L2 --> K7
  L5 --> M6
  L4 --> M6
  C7 --> P1
  M6 --> P3
  L6 --> P4
  K6 --> P5
  K7 --> P5
```

### Detalle por zona

Los valores son orientativos y se ajustarán con el simulador de balance. ⇄ indica un producto importado de otra zona.

#### Zona 1 · La Finca (café) — 8 estaciones, 9 productos — **v1.0**
| # | Estación | Entrada | Salida | Valor |
|---|----------|---------|--------|-------|
| 1 | Cafetal ♾️ | — | Cereza de café | 1 |
| 2 | Beneficiadero | 2 cerezas | Café lavado + *pulpa* | 3 |
| 3 | Marquesina de secado | 1 lavado | Café pergamino | 6 |
| 4 | Trilladora | 1 pergamino | Café verde | 10 |
| 5 | Tostadora | 2 verde | Café tostado | 30 |
| 6 | Molino | 1 tostado | Café molido | 45 |
| 7 | Empacadora | 4 molido | Bolsa de café | 250 |
| 8 | Compostera *(rama opcional, v1.0)* | 4 pulpa (por canaleta, sin mulas) | Compost → todo lo que vende la Finca +30 % mientras haya (1 compost por cada 8 cafés lavados; no acelera ninguna estación, así que no descompensa la cadena) | — |

#### Zona 2 · El Trapiche (caña y panela) — 5 estaciones, 6 productos — **v1.1** ✅
Se abre al completar la Finca. Los productos valen ×5 respecto al primer borrador porque la zona arranca con la economía de la Finca (las monedas se comparten y la Finca sigue produciendo). Misma regla de balance: a igual nivel, cada estación procesa lo que le entrega la anterior.

| # | Estación | Entrada | Salida | Ciclo (nv. 1) | Valor | Desbloqueo | Coste base |
|---|----------|---------|--------|---------------|-------|------------|------------|
| 1 | Cañaduzal ♾️ | — | Caña | 2 s | 10 | Con la zona | 50 |
| 2 | Molienda | 1 caña | Guarapo + *bagazo* | 2 s | 25 | 5.000 | 80 |
| 3 | Hornilla | 2 guarapo (+ bagazo: ×2 de velocidad) | Melado | 4 s | 60 | 25.000 | 120 |
| 4 | Gaveras | 2 melado | Panela | 8 s | 150 | 80.000 | 200 |
| 5 | Pulverizadora | 1 panela | Panela pulverizada | 8 s | 250 | 250.000 | 350 |

- **Bagazo**: la Molienda lo produce (1 por ciclo) y pasa directo a la Hornilla, que va pegada a ella. Mientras la Hornilla tenga bagazo, trabaja ×2 y gasta 1 por ciclo.
- **Investigaciones**: Trapiche con motor (Molienda ×2), Abono para la caña (Cañaduzal ×2), Chiva para el Trapiche (despacho ×2), Gaveras de acero (×2), Panela orgánica (+50 % de valor).
- **Final**: «Primer cargamento de panela», vender 6.000 panelas pulverizadas (15 objetivos; 5.000 hasta la v1.6).
- **Duración medida** (`npm run balance`, v1.3): unos 35 min después de completar la Finca (la Finca, que sigue produciendo, lo acelera mucho).

#### Zona 3 · La Lechería — 6 estaciones, 6 productos — **v1.2** ✅
Se abre al completar el Trapiche. Productos ×25 respecto al primer borrador (el Trapiche iba ×5). Es la primera zona con **ramas**: la leche pasteurizada se reparte entre la Quesera, la Descremadora y la Paila. A igual nivel, la Pasteurizadora da un cuarto a la Quesera, otro a la Descremadora, otro a la Paila y el último a la **Ruta de la leche** del Cacaotal (v1.3), así que la regla de balance se mantiene: con todo al mismo nivel, nada sobra. Mientras falta alguna rama, la leche que sobra se vende sin procesar.

| # | Estación | Entrada | Salida | Ciclo (nv. 1) | Valor | Desbloqueo | Coste base |
|---|----------|---------|--------|---------------|-------|------------|------------|
| 1 | Potrero y establo ♾️ | — | Leche cruda | 2 s | 125 | Con la zona | 250 |
| 2 | Pasteurizadora | 1 cruda | Leche pasteurizada | 2 s | 300 | 200.000 | 400 |
| 3 | Quesera *(rama, ¼ de la leche)* | 4 pasteurizada | Queso campesino | 32 s | 2.400 | 400.000 | 1.300 |
| 4 | Descremadora *(rama, ¼)* | 2 pasteurizada | Crema de leche | 16 s | 800 | 1.000.000 | 600 |
| 5 | Batidora | 2 crema | Mantequilla | 32 s | 2.000 | 2.000.000 | 900 |
| 6 | Paila de arequipe *(rama, ¼)* | 4 pasteurizada + 1 panela pulverizada ⇄ | Arequipe | 32 s | 4.000 | 4.000.000 | 2.000 |

- **Reparto**: las mulas de la Pasteurizadora llevan cada carga a la rama con la entrada más vacía (contando lo que va en camino); la que trabaja más rápido recibe más, sin que el jugador tenga que repartir a mano. La carga se calcula para el viaje a la más lejana. Si la entrada de una rama no alcanza para una carga entera (va por debajo del nivel de la Pasteurizadora), se le lleva lo que quepa cuando tiene media entrada libre (desde la v1.7.11; antes no recibía nada). Vale para cualquier estación.
- **El cuarto de la Ruta de la leche**: mientras el Cacaotal no abre, se vende como leche. No es un desvío ni un problema: no se marca con ↪️, el panel de la Pasteurizadora lo explica y la cadena (🔗) lo muestra aparte. Una rama solo se marca como atrasada si procesa menos que su cuarto.
- **Primera ruta entre zonas — Ruta de la panela** (`src/data/routes.js`, `src/sim/routes.js`): una **Chiva** recoge panela pulverizada en la bodega del Trapiche y la lleva a la Paila (60 s ida y vuelta). Tiene su propio nivel (pestaña 🚌 de la Paila): a igual nivel que la Paila lleva todo lo que gasta (un 25 % más), contando sus investigaciones de velocidad. El Willys del Trapiche no vende la panela que espera la Chiva. Sin panela, la Paila espera; el resto de la Lechería sigue igual.
- **Investigaciones**: Ordeño mecánico y Pasteurizadora de placas (×2, en pareja), Descremadora centrífuga, Batidora eléctrica, Cuajo de calidad, Paila de cobre (×2), Carrotanque (despacho ×2), Queso doble crema y Arequipe de exportación (+50 %).
- **Final**: «Arequipe para todo el pueblo», vender 6.000 arequipes (17 objetivos; 3.000 hasta la v1.6).
- **Duración medida** (`npm run balance`, v1.3): unas 2 h 20 min después de completar el Trapiche.

#### Zona 4 · El Cacaotal (chocolate) — 7 estaciones, 7 productos — **v1.3** ✅
Se abre al completar la Lechería. Productos ×125 respecto al primer borrador. Es la primera zona con **dos importaciones**: la panela del Trapiche (para la Mesa y la Chocolatería) y la leche de la Lechería (solo para la Chocolatería). La pasta de cacao se reparte entre la Mesa y la Chocolatería: a igual nivel, la mitad cada una.

| # | Estación | Entrada | Salida | Ciclo (nv. 1) | Valor | Desbloqueo | Coste base |
|---|----------|---------|--------|---------------|-------|------------|------------|
| 1 | Cacaotal ♾️ | — | Mazorca de cacao | 2 s | 1.000 | Con la zona | 1.500 |
| 2 | Cajones de fermentación | 2 mazorcas | Cacao fermentado | 4 s | 2.500 | 2 M | 2.000 |
| 3 | Secadero | 1 fermentado | Cacao seco | 4 s | 4.400 | 5 M | 3.000 |
| 4 | Tostador de cacao | 1 seco | Cacao tostado | 4 s | 8.800 | 12 M | 4.500 |
| 5 | Molino de cacao | 2 tostado | Pasta de cacao | 8 s | 22.000 | 30 M | 7.000 |
| 6 | Mesa de chocolate *(rama, ½)* | 2 pasta + 1 panela pulverizada ⇄ | Chocolate de mesa | 32 s | 100.000 | 40 M | 10.000 |
| 7 | Chocolatería *(rama, ½)* | 2 pasta + 1 panela pulverizada ⇄ + 4 leche pasteurizada ⇄ | Chocolatina con leche | 32 s | 220.000 | 80 M | 16.000 |

- **Rutas**: la **Ruta de la panela al Cacaotal** abastece a la Mesa y a la Chocolatería (a igual nivel que ellas, lleva lo que gastan las dos y reparte cada carga según el sitio que le queda a cada una). La **Ruta de la leche** lleva leche pasteurizada de la bodega de la Lechería a la Chocolatería. Como el Trapiche ya manda panela a la Lechería, las dos rutas de panela se reparten lo que hay según lo que pide cada una.
- **Las rutas cuadran a igual nivel en todas las zonas**, también al nivel 100 y con todas las investigaciones (hay una prueba): la panela que piden la Paila, la Mesa y la Chocolatería es ¾ de lo que da el Trapiche (el resto se vende), y la Pasteurizadora guarda un cuarto de su leche para la Ruta de la leche, como una rama más: sus mulas la dejan en la bodega, de donde sale la Chiva lechera. Antes de abrir el Cacaotal, ese cuarto se vende como leche.
- **Investigaciones**: Injertos de clones finos y Cajones en escalera (×2, en pareja), Secadero con techo corredizo, Tostador de bombo, Molino de bolas, Moldes de aluminio, Temperadora (×2), Camión para el Cacaotal (despacho ×2) y Cacao fino de aroma (todo lo que vende el Cacaotal +50 %).
- **Final**: «Chocolate para la feria», vender 4.000 chocolatinas con leche (18 objetivos; 3.000 hasta la v1.6).
- **Duración medida** (`npm run balance`, v1.3): 1 h 45 min (jugador atento) y 1 h 55 min (el que sigue la mejora recomendada) después de completar la Lechería. Juego completo hasta aquí: unas 7 h.

#### Zona 5 · El Maizal (arepas) — 6 estaciones, 6 productos — **v1.4** ✅
Se abre al completar el Cacaotal. Productos ×1.000 respecto al primer borrador. Cadena lineal; el **Puesto de arepas** necesita queso y mantequilla de la Lechería, que llegan por dos rutas. A igual nivel, el Puesto gasta todo el queso de la Quesera y toda la mantequilla de la Batidora (son productos finales de la Lechería: lo que no se lleva la Chiva, se vende).

| # | Estación | Entrada | Salida | Ciclo (nv. 1) | Valor | Desbloqueo | Coste base |
|---|----------|---------|--------|---------------|-------|------------|------------|
| 1 | Maizal ♾️ | — | Mazorca de maíz | 2 s | 6.000 | Con la zona | 20.000 |
| 2 | Desgranadora | 1 mazorca | Maíz desgranado | 2 s | 12.000 | 30 M | 25.000 |
| 3 | Piladora | 2 desgranado | Maíz pilado | 4 s | 30.000 | 80 M | 40.000 |
| 4 | Molino de masa | 2 pilado | Masa de maíz | 8 s | 70.000 | 200 M | 60.000 |
| 5 | Budare | 1 masa | Arepa | 8 s | 120.000 | 500 M | 90.000 |
| 6 | Puesto de arepas | 4 arepas + 1 queso ⇄ + 1 mantequilla ⇄ | Arepas de queso (bandeja) | 32 s | 1.200.000 | 600 M | 150.000 |

- **Rutas**: la **Ruta del queso** y la **Ruta de la mantequilla** salen de la bodega de la Lechería (por la carretera de abajo) hacia el Puesto.
- **Investigaciones**: Maíz híbrido y Desgranadora con motor (×2, en pareja), Piladora eléctrica, Molino de discos, Budare grande, Plancha doble (×2), Camión para el Maizal (despacho ×2) y Receta de la abuela (todo lo que vende el Maizal +50 %).
- **Final**: «¡Arepas para toda la plaza!», vender 6.000 bandejas de arepas de queso (16 objetivos; 3.000 hasta la v1.6).
- **Duración medida** (`npm run balance`, v1.4): 1 h 45 min (jugador atento) y 1 h 10 min (el que sigue la mejora recomendada) después de completar el Cacaotal. Juego completo hasta aquí: unas 8 h 30 min.

#### Zona 6 · El Pueblo (ensamble final, sin fuente propia) — 6 estaciones, 6 productos — **v1.5** ✅
Se abre al completar el Maizal y es la última zona. Es la única **sin recurso ilimitado**: todo llega importado, y es el «examen final» de la logística entre zonas. Seis rutas, una desde cada zona: cada zona proveedora tiene **un producto final que no se lleva nadie más** (a igual nivel, 1 cada 32 s por nivel): las bolsas de café de la Finca, el cuarto de panela que sobraba en el Trapiche, el arequipe de la Lechería, los dos chocolates del Cacaotal y las arepas de queso del Maizal. A igual nivel en todas las zonas, el Pueblo los gasta justo (hay una prueba).

| # | Estación | Entrada | Salida | Ciclo (nv. 1) | Valor | Desbloqueo | Coste base |
|---|----------|---------|--------|---------------|-------|------------|------------|
| 1 | Casa del café (en la plaza) | 1 bolsa de café ⇄ | 2 café de origen | 32 s | 150.000 | Con la zona | 300.000 |
| 2 | Greca de tintos | 1 café de origen + 1 panela pulverizada ⇄ | 2 tintos | 32 s | 400.000 | 300 M | 400.000 |
| 3 | Fonda | 2 tintos + 1 arepa de queso ⇄ | Desayuno campesino | 32 s | 3.200.000 | 700 M | 600.000 |
| 4 | Taller de canastas | 1 café de origen + 1 arequipe ⇄ | Canasta de fique | 32 s | 600.000 | 1.500 M | 800.000 |
| 5 | Empaque de regalos | 1 canasta + 1 chocolate de mesa ⇄ + 1 chocolatina ⇄ | Canasta de regalo | 32 s | 2.000.000 | 1.200 M | 1.000.000 |
| 6 | Patio de contenedores | 4 canastas de regalo | **Contenedor de exportación** | 128 s | 24.000.000 | 2.000 M | 1.500.000 |

- **Árbol**: la Casa del café reparte su café de origen entre la Greca (→ Fonda) y el Taller (→ Empaque → Patio de contenedores).
- **Cambios respecto al primer borrador**: el borrador tenía siete estaciones que importaban café molido, leche y crema, productos intermedios que ya se gastan del todo en sus zonas; con ellos ninguna zona cuadraba a igual nivel. Ahora el Pueblo solo usa productos finales libres, la cafetería se resume en la Greca y la Fonda, y el Muelle es un Patio de contenedores (el pueblo está en la montaña).
- **Investigaciones**: Catadores expertos (Casa del café ×2), Greca de dos llaves, Más mesas en la Fonda, Tejedoras de fique, Cintas y moños, Grúa de contenedores (×2 cada una), Tractomula (despacho ×2) y Denominación de origen (todo lo que vende el Pueblo +50 %).
- **Final del juego**: «¡El café de la vereda viaja por el mundo!», exportar 7.000 contenedores (17 objetivos; 1.000 hasta la v1.6).
- **Duración medida** (`npm run balance`, v1.5): 2 h (jugador atento) y 1 h 47 min (el que sigue la mejora recomendada) después de completar el Maizal. Juego completo: unas 11 h (atento) y 10 h 15 min (casual).

### Cómo viajan los productos entre zonas
- Cada zona tiene una **Bodega de salida**. Entre zonas hay **rutas** con su propio transporte mejorable (la primera, la Ruta de la panela de la v1.2, usa una **chiva**).
- Una ruta se configura así: *producto X, de la Zona A a la Zona B*. Igual que los arrieros dentro de una zona, la ruta tiene capacidad por minuto y puede ser el cuello de botella.
- **Cada zona sigue siendo jugable sola:** si no llega el importado, las estaciones que lo necesitan se pausan, pero el resto de la cadena produce y vende normalmente.
- **Al completar una zona** se desbloquea la siguiente y la anterior sigue produciendo en segundo plano, como si estuviera sin conexión.

### Orden de llegada (por qué este orden)
1. **Finca:** cadena lineal pura, enseña lo básico.
2. **Trapiche:** introduce los **subproductos** (bagazo) y es el primer proveedor de otras zonas.
3. **Lechería:** introduce la **ramificación** (una leche con 4 destinos) y la **primera importación** (arequipe).
4. **Cacaotal:** combina 2 y 3 importaciones en una sola receta.
5. **Maizal:** recetas con ingredientes de varias zonas en el producto estrella.
6. **Pueblo:** todo importado; pone a prueba la red completa.

---

## 5. Mejoras

Cada estación tiene **dos ejes** de mejora.

### 5.1 Nivel de producción (1–100)
- **Velocidad:** `vel(L) = base × (1 + 15/99 × (L − 1)) × hitos`. Los hitos multiplican: nivel 10 ×2, 25 ×2, 50 ×4, 75 ×4 y 100 ×8 (×512 en total; hasta la v1.6 eran ×2 cada uno). Con 15/99 (≈ 0,1515) el nivel 100 da exactamente ×8.192 (16 × 512), y como todos los ciclos son potencias de 2 (2, 4, 8, 16, 32 o 128 s), al nivel 100 cada estación produce una potencia de 2 por segundo: 4.096, 2.048, 1.024, 512, 256 o 64 (hay una prueba que lo exige). El nivel máximo es 100.
- **Maestría y Supremacía (v1.7):** con todos los edificios de una zona en el nivel 75 se puede investigar su Maestría (toda la zona, Willys incluido, produce ×4); con todos en el 100, su Supremacía (×8 más). Pensadas para el segundo final.
- **Hitos** en los niveles 10, 25, 50, 75 y 100: la velocidad se **duplica** y el edificio cambia de aspecto (ver §8).
- **Coste:** `coste(L) = costeBase × 1,15^(L − 1)`.
- Botones de compra ×1, ×10 y «máx».

### 5.2 Arrieros (transporte hacia la siguiente estación)
- Cada estación tiene sus propias mulas. Una mula carga, va a la siguiente estación (o a la bodega si la siguiente no existe o tiene la entrada llena), entrega y **vuelve vacía**.
- Los arrieros tienen su propio **nivel (1–100)**, que cuesta la mitad que el de la estación:
  - **Mulas** = 1 + una más cada 10 niveles (máx. 10).
  - **Carga por mula** (puede tener decimales): se calcula para que el equipo mueva un **25 % más de lo que produce la estación al mismo nivel**, contando la distancia real hasta su destino normal y lo que acelera la estación (investigaciones, compost).
- **Regla simple para el jugador: arrieros al mismo nivel que su estación = llevan todo.** Si van por debajo, son el cuello de botella; Herraduras y Cable aéreo dan margen extra.
- Los desvíos a la bodega usan las mismas mulas pero el viaje es más largo, así que mueven menos: son un recurso de emergencia, no un camino normal.
- Si todas las mulas están en camino, el producto se acumula en el **patio**. Cuando se llena, la estación se detiene (⛔).
- **Vista «Ver cadena» (🔗)**: muestra por estación lo que recibe, procesa y produce, y por tramo lo que llevan los arrieros, lo que se desvía y lo que se pierde, con el cuello de botella en rojo.

- **Banda eléctrica (v1.2.3):** desde el nivel 50 de transporte (un hito), las mulas de la estación se cambian por una banda eléctrica a un lado del camino. Lleva exactamente lo mismo (la simulación no cambia); en pantalla, lo que va en camino son cajas sobre la banda en vez de mulas con arriero, todo dibujado de una vez para que muchas estaciones avanzadas no pesen en la animación.

### 5.3 Despacho
- Un **Willys** lleva `N` unidades de la Bodega al pueblo y vuelve. Se puede mejorar la capacidad, la velocidad y comprar más jeeps (máx. 5).
- Es el último cuello de botella. Al principio sobra; con 7 estaciones a buen nivel se vuelve crítico.

### 5.4 Investigaciones (compras únicas, `src/data/research.js`)

**Regla:** toda estación de cada cadena tiene **exactamente una** investigación ×2 (hay una prueba que lo exige). Desde la **v2.3.2**, la ×2 de una estación se habilita cuando **esa estación y sus arrieros llegan al nivel 25** (la Compostera, que no tiene arrieros, solo con su nivel); antes aparecía al construir la siguiente estación, y la columna «Aparece con» de las tablas de abajo es de entonces para esas. Los objetivos que piden una ×2 (Abono orgánico, Trapiche con motor, Ordeño mecánico, Injertos, Maíz híbrido y Catadores) pasaron a ir justo después del de «todo al nivel 25» de su zona. Con todas compradas, la cadena queda igual de equilibrada que sin ninguna. Las mejoras «de segunda vuelta» suben el precio, no la velocidad: un segundo ×2 en una sola estación dejaría a las demás siempre atrás.

**La Finca**

| Investigación | Efecto | Coste | Aparece con |
|---------------|--------|-------|-------------|
| 🌱 Abono orgánico | Cafetal ×2 | 300 | Beneficiadero |
| ⚡ Despulpadora eléctrica | Beneficiadero ×2 | 400 | Beneficiadero |
| 🐴 Herraduras | Mulas ×1,5 de velocidad | 900 | Marquesina |
| 🚙 Remolque para el Willys | Despacho ×2 de carga | 2.500 | Trilladora |
| ♨️ Secador mecánico | Marquesina ×2 | 6.000 | Trilladora |
| 🌀 Trilladora de rodillos | Trilladora ×2 | 8.000 | Tostadora |
| 🧑‍🌾 Capataz | Ganancias sin conexión: +3 h (las otras zonas tienen la suya: 24 h con las seis) | 10.000 | Tostadora |
| 🔥 Tueste de origen | Café tostado +50 % de valor | 20.000 | Tostadora |
| 🔥 Tostador de tambor grande | Tostadora ×2 | 25.000 | Molino |
| 💧 Beneficio ecológico | Compostera ×2 | 20.000 | Compostera |
| 🌳 Variedad Castillo | Todo lo que vende la Finca +50 % | 50.000 | Molino |
| ⚙️ Molino eléctrico | Molino ×2 | 60.000 | Empacadora |
| 🚡 Cable aéreo | Mulas ×2 de velocidad | 120.000 | Empacadora |
| 📦 Empacadora automática | Empacadora ×2 | 150.000 | Empacadora |
| 🏅 Sello de calidad | Bolsas +50 % de valor | 300.000 | Empacadora |

**El Trapiche:** Trapiche con motor (Molienda ×2), Abono para la caña (Cañaduzal ×2), Hornilla de más pailas (×2), Chiva (despacho ×2), Gaveras de acero (×2), Pulverizadora eléctrica (×2), Panela orgánica (+50 % de valor).

### 5.5 Mejora recomendada
El aviso de arriba recomienda la mejora que más 💰/s suma **al final de la cadena** (lo que sale de la última estación construida) por moneda gastada, entre estaciones, arrieros y despacho. Lo que se vende desviado no cuenta: si contara, la recomendación llevaría a subir arrieros para vender materia prima en lugar de completar la cadena. También recomienda una **investigación** si ya alcanza el dinero y rinde más que el mejor nivel (nunca deja al jugador ahorrando). Los arrieros, las rutas y la Compostera se miden de 10 en 10 niveles cuando un nivel suelto no llega al mínimo (unos arrieros muy atrasados o el bono del compost suman poco nivel a nivel). Si la zona recibe algo por una ruta, también cuentan las estaciones de la zona que lo envía: la recomendación puede decir «Arrieros de la Pulverizadora (El Trapiche)», y tocarla lleva allá. Si ninguna mejora suelta rinde, prueba los arrieros y las rutas de dos en dos (pueden frenarse entre sí, como la Ruta de la leche y los arrieros de la Chocolatería) y recomienda la primera del mejor par; si tampoco, el cuello de botella. La vista «La cadena» sigue marcando el cuello de botella en rojo, salvo que ya esté en el nivel 100 (no se puede mejorar más): entonces no se marca nada y el aviso dice qué falta construir o que la zona está al máximo.

### 5.6 Desvíos y bodega
Lo que se desvía a la bodega solo puede ocupar hasta el 70 % de su capacidad: el 30 % restante queda siempre libre para el producto final de la cadena, para que el producto barato que sobra no atasque la Empacadora.

---

## 6. Objetivos y final de la zona

Una lista de **29 objetivos en orden** (`src/data/goals.js`). Se ven 3 a la vez, el primero también en un marcador abajo a la izquierda, y al cumplirse se **cobran** (dan monedas). Tipos: vender o producir N de un producto, subir algo a un nivel, construir una estación, investigar, ganar N 💰/s y subir todas las estaciones a un nivel.

**Final de la Zona 1: «Primer gran pedido»**, vender 2.000 bolsas de café (1.000 hasta la v1.6). Al cobrarlo aparece la pantalla de «Zona completada» con las estadísticas y el anuncio de la Zona 2; se puede seguir jugando en modo libre.

**Balance medido** con `npm run balance` (jugador automático, ver `tools/balance-sim.js`):

| Jugador | Empacadora | Zona completada |
|---------|-----------|-----------------|
| Atento: sube toda la cadena junta y elige la compra más rentable | ~3 h | **~3 h 30 min** |
| Casual: sigue la mejora recomendada y los objetivos, ahorra para construir si le queda cerca | ~3 h | **~3 h 20 min** |

(Medido en la v1.0.1, después de que los arrieros pasaran a ir al ritmo de su estación.)

### Segundo final: maestro cafetero (v1.6)
Tras el Pueblo, el marcador de objetivos muestra el segundo final: **llevar las 38 estaciones de las seis zonas al nivel 100** (cuenta cuántas van). Hace falta haber logrado el primer final (desde la v1.7.12): se puede tener todo al 100 sin haber exportado los 7.000 contenedores, y entonces el segundo final llega al cobrarlos, después de la pantalla del Pueblo. Al lograrlo aparece la pantalla «¡Maestro cafetero!» con las estadísticas de la partida y la opción de **volver a empezar** desde la Finca (monedas, niveles, investigaciones y objetivos desde cero) con **toda la producción al doble**: ×2 tras el primer reinicio, ×4 tras el segundo, ×8 tras el tercero… (también se puede hacer luego desde ⚙️). El multiplicador se ve abajo a la derecha y no tiene límite (con números enormes, en notación científica). Duplica la velocidad de todas las estaciones y lo que lleva el Willys; los arrieros, las rutas, los patios y las entradas se calculan con eso, así que a igual nivel todo sigue cuadrando (hay una prueba a ×8 y otra a ×32). Se conservan los ajustes, los avisos vistos y el registro de partidas.

Duración medida (`npm run balance`, v1.6; casual = sigue la mejora recomendada, atento = elige la compra más rentable; tras el Pueblo, los dos suben siempre lo más atrasado):

| Producción | Primer final (Pueblo), casual / atento | Segundo final (todo al 100), desde el inicio |
|-----------|----------------------------------------|----------------------------------------------|
| ×1 (normal) | 10 h 16 min / 10 h 57 min | unas 143 h (casual) |
| ×2 (1 reinicio) | 5 h 58 min / 4 h 32 min | 72 h / 74 h |
| ×4 (2 reinicios) | 2 h 44 min / 2 h 41 min | 36 h / 36 h |
| ×8 (3 reinicios) | 1 h 39 min / 1 h 28 min | 18 h / 19 h |

El segundo final es largo a propósito de la fórmula: cada nivel cuesta ×1,15 y los últimos 25 niveles valen mucho más que el ingreso que suman.

Con la **jornada y las temporadas (v1.9)**, sin compensar, en horas de juego con el juego abierto (a ×1, sin reinicios):

| Jugador | Primer final, v1.8.5 → v1.9 | Segundo final, v1.8.5 → v1.9 |
|---------|-----------------------------|------------------------------|
| Casual | 13 h 31 min → **27 h 07 min** | 27 h 36 min → **72 h 41 min** |
| Atento | 14 h 50 min → **33 h 45 min** | 25 h 07 min → **51 h 37 min** |

Con las ×2 al nivel 25 de la estación y sus arrieros (**v2.3.3**): primer final 30 h 41 min (casual) y 25 h 31 min (atento); segundo final 58 h 26 min y 69 h 13 min. Por zona (casual / atento): Finca 4 h 50 / 4 h 50, Trapiche 1 h 21 / 1 h 18, Lechería 4 h 00 / 4 h 16, Cacaotal 6 h 56 / 4 h 23, Maizal 5 h 57 / 3 h 14, Pueblo 7 h 38 / 7 h 29. (Los bots varían bastante de una versión a otra en el Pueblo y en el segundo final: deciden distinto según lo que tengan.)

En la v1.9, por zona (casual / atento): Finca 5 h 06 / 4 h 35, Trapiche 1 h 22 / 1 h 19, Lechería 4 h 13 / 3 h 51, Cacaotal 7 h 14 / 4 h 41, Maizal 3 h 27 / 2 h 57 y Pueblo 5 h 47 / 16 h 22. En el Pueblo, el bot atento casi no investiga hasta el final y tarda mucho en exportar los 7.000 contenedores (es cosa del bot, no del juego). Con las ganancias sin conexión (hasta 24 h), el tiempo real es menor.

## 7. Ganancias sin conexión

- Al volver se simulan de verdad hasta 2 h de juego; lo que pase de ahí se suma al ritmo de la última hora simulada (monedas, ventas, producción e importados). Siempre a velocidad normal: el tiempo acelerado de las opciones de desarrollador solo cuenta con el juego abierto (desde la v1.8.1).
- **Tope**: 2 h, más una investigación por zona que suma horas (desde la v1.8.1): Capataz (Finca) +3 h, Trapichero de confianza +3 h, Ordeño programado +4 h, Vigilante del cacaotal +4 h, Vecina que cuida el budare +4 h y Administrador del Pueblo +4 h: **24 h** con las seis.
- Con la jornada y las temporadas (v1.9), lo simulado ya tiene sus noches y sus temporadas, y lo que se suma más allá se reparte según cuánto se trabaja en cada tramo (las noches no cuentan y cada temporada rinde lo suyo; `workSeconds` en `src/sim/calendar.js`): da lo mismo que jugar en vivo sin simular las 24 h.

Mientras se calcula se ve una pantalla de carga con una barra de avance y cuánto tiempo pasó (v2.3.1: el cálculo va por partes con `Game.catchUpAsync`). Se muestra una ventana de bienvenida con lo ganado y si se alcanzó el tope.

---

## 8. Dirección de arte (estilo Frozen City, ambientación cafetera)

### Lo que se toma de Frozen City
- Isométrico limpio, con edificios «de juguete», volúmenes sencillos, contornos suaves y sombras proyectadas.
- **Vida pequeña por todas partes:** personajes y animales que caminan llevando cargas visibles, máquinas que se mueven, humo y números flotando.
- **Los edificios crecen con el nivel:** cada hito cambia el modelo (cobertizo → casa → fábrica).
- UI gruesa y amable: paneles redondeados, iconos grandes y botones que rebotan.

### Ambientación
- Ladera verde en diagonal, con el cafetal arriba y el pueblo abajo. Un camino de tierra en zigzag une las estaciones.
- Fondo: montañas en capas con niebla, palmas de cera altas y nubes que pasan.
- Las estaciones son casas campesinas de colores: blanco con zócalo, puertas y balcones de madera pintados de rojo, azul, amarillo o verde, y tejas de barro.
- **Arrieros:** mulas con costales y un campesino de sombrero aguadeño y poncho.
- **Despacho:** un jeep Willys cargado hasta arriba bajando la carretera.
- Día y noche: amanecer con niebla, día brillante y noche con faroles cálidos y ventanas iluminadas. Desde la v1.9, de noche no se trabaja (§10.1).

### Evolución visual por hitos (implementado en la v0.4)
Cada estación conserva su dibujo propio y va ganando detalles con cada hito:

| Hito | Nivel | Qué cambia |
|------|-------|------------|
| 1 | 10 | Macetas con flores y remates de otro color |
| 2 | 25 | Segundo piso con balcón (la Marquesina gana una cama más, la rueda del Molino crece) |
| 3 | 50 | Dos faroles que se encienden de noche |
| 4 | 75 | Patio empedrado |
| 5 | 100 | Bandera de Colombia ondeando en el tejado y remates dorados |

La casa del Cafetal evoluciona aparte (de rancho de madera a casa de dos pisos con balcón).

### Día y noche (v0.4)
- Un día dura 8 minutos de juego; una partida nueva empieza a las 8:00.
- El mundo se tiñe (amanecer rosado, atardecer naranja, noche azul) y el cielo cambia de degradado. Las estrellas, ventanas, faroles, el fuego de la Tostadora y las luciérnagas brillan de noche.
- Hasta la v1.8 era solo decorativo. Desde la **v1.9** hay jornada de trabajo (de 6:00 a 18:00; desde la v3.8, de 6:00 a 12:00 y de 14:00 a 20:00) y temporadas (§10.1); el calendario está en `src/sim/calendar.js`.

### Sonido (v0.4)
Sintetizado con Web Audio, sin archivos: clic de botones, monedas al vender, arpegio al subir de nivel y al cruzar un hito, martillazos al construir, pájaros de día y grillos de noche. Se apaga desde el menú y la preferencia se guarda con la partida.

**Al entrar a una estación (v3.3.2)** suena su oficio: las 63 estaciones y la bodega se agrupan en 17 sonidos (`STATION_SOUNDS` en `src/audio/Sound.js`): cultivo, mugido, agua, motor, giro, fuego, hervor, viento, fermentación, cuchillo, telar, cajas, sirena del barco, chisporroteo, pocillos, sal y el Willys.

**Música (v1.8.7, propia):** cada región tiene su pieza (`src/audio/songs.js`); el Eje Cafetero, un **bambuco** en 3/4 (mi menor y sol mayor, 32 compases, 108 negras por minuto). El juego la arma al empezar (`src/audio/compose.js`, unos 0,3 s, compás por compás para no trabarse) con cuerdas Karplus-Strong: bajo y rasgueo de guitarra en el primer, segundo y tercer tiempo, golpes apagados de tiple en el contratiempo y la melodía de bandola, con trémolo en las notas largas. Suena en bucle tras el primer toque, con eco de sala, fundido de entrada y salida, se pausa con la pestaña oculta y tiene su propio botón en el menú. Reemplaza a «Apple Cider» (CC0), que pesaba 2,4 MB.

### Paleta

| Uso | Hex |
|-----|-----|
| Cafetal verde (luz) | `#7DBA4E` |
| Cafetal verde (sombra) | `#4E7F33` |
| Montaña lejana | `#8FB3A0` → `#C9DCCF` (niebla) |
| Cereza roja | `#D7263D` |
| Café tostado | `#6B3E26` |
| Tierra del camino | `#C79A64` |
| Pared encalada | `#F4EFE6` |
| Teja | `#B5512E` |
| Balcones | `#2E6FD1` · `#E8B90F` · `#D7263D` · `#2FA36B` |
| Contorno | `#3A2418` (60 %) |
| Cielo de día | `#BFE3F2` |
| Atardecer | `#F6B26B` → `#E07A5F` |
| Noche (tinte) | `#2B2D5B` (multiply, 40 %) |
| Farol | `#FFC864` (glow) |

### Reglas visuales
- **Casillas:** rombos de 64×32 px. Las estaciones ocupan 3×3 casillas.
- **Sombreado:** cara superior = base, izquierda = −15 % de luz, derecha = −30 %.
- **Personajes:** de 16×24 px, cabeza grande y caminata de 3 fotogramas; mulas de 24×20 px con los costales de un color distinto según el producto.
- **Efectos:**
  - Número flotante «+250 💰» al vender.
  - Monedas que saltan del Willys al llegar al pueblo.
  - Humo en la tostadora, vapor en el beneficiadero y granos esparcidos en la marquesina.
  - Destello y pequeño rebote al subir de nivel; confeti y cambio de modelo en cada hito.
  - **Indicadores de estado sobre cada estación:** ⏸️ esperando entrada · ⛔ salida llena · ↪️ desviando a bodega. Desde la v1.7.8 solo salen si el problema dura: ocupa al menos la mitad de los últimos 10 s de juego (30 s en la v1.7.8) (esperar cuenta solo en rachas de 8 s o más sin entrada), y se quitan cuando baja de la quinta parte. Con todo nivelado, el producto viaja por tandas y los momentos sueltos de patio lleno o de espera son normales. El aviso del panel usa el mismo criterio. La Compostera llena no se marca (es compost de sobra).
- **UI:**
  - Barra superior: 💰 y 💰/s.
  - Panel inferior de la estación seleccionada: nivel, velocidad, buffers, arrieros, botones de mejora ×1/×10/máx.
  - Lateral: objetivos.
  - Botón «Ver cadena»: un diagrama compacto con el flujo/s de cada tramo y el cuello de botella resaltado en rojo.
  - Fuente: **Fredoka** o **Baloo 2**.

### Producción del arte sin artista
1. **v0.1–0.3:** todo se dibuja por código (cajas isométricas, techos de dos aguas, arbustos redondos con puntos rojos para los cafetos). Rápido y coherente.
2. **v0.4+:** sustituir por sprites PNG estación a estación. Cada estación declara su `sprite` por hito en los datos, así que la lógica no cambia.

---

## 9. Arquitectura técnica

- **Stack:** JavaScript (ES modules), Vite y PixiJS v8.
- **Sin servidor:** se guarda en `localStorage` como JSON versionado, con exportar e importar en texto.
- **La simulación y el dibujo van separados:**
  - La simulación avanza a tick fijo (10/s), es pura y se puede probar con Node.
  - El dibujo solo lee el estado.
- **Todo el contenido son datos:** recursos, estaciones, mejoras, investigaciones, objetivos y zonas están en `src/data/`. Una zona nueva = un archivo nuevo.
- **Números grandes:** con `Number` alcanza hasta unos 1e15 en la Zona 1. El formato es 1,2K · 3,4M · 5,6B. Si las zonas futuras lo exigen, se cambiará a `break_infinity.js`.

### Carpetas

```
/
├─ index.html
├─ package.json
├─ vite.config.js
├─ docs/GDD.md
├─ tools/
│  └─ balance-sim.js        # simula N horas con una estrategia "codiciosa" e imprime tiempos de cada hito
└─ src/
   ├─ main.js
   ├─ core/
   │  ├─ Game.js            # estado + bucle de tick fijo
   │  ├─ EventBus.js
   │  ├─ SaveSystem.js
   │  └─ format.js          # 1,2K / 3,4M
   ├─ sim/                  # lógica pura (sin DOM ni Pixi)
   │  ├─ stations.js        # ciclos, buffers, recetas, desvío
   │  ├─ transport.js       # arrieros por tramo
   │  ├─ dispatch.js        # bodega + Willys → monedas
   │  ├─ upgrades.js        # costes, hitos, investigaciones
   │  ├─ goals.js
   │  └─ offline.js         # flujo estable × tiempo
   ├─ data/
   │  ├─ products.js
   │  ├─ stations.js
   │  ├─ research.js
   │  ├─ goals.js
   │  └─ zones/zone1_finca.js   # posiciones de estaciones y camino
   ├─ render/
   │  ├─ iso.js
   │  ├─ Camera.js
   │  ├─ TerrainRenderer.js
   │  ├─ StationRenderer.js
   │  ├─ CarrierRenderer.js     # mulas y Willys siguiendo el camino
   │  ├─ Effects.js             # números flotantes, humo, confeti
   │  ├─ DayNight.js
   │  └─ procedural/
   └─ ui/
      ├─ HUD.js
      ├─ StationPanel.js
      ├─ ChainView.js           # diagrama del flujo y cuello de botella
      ├─ GoalsPanel.js
      └─ styles.css
```

### Ejemplo de datos

```js
// src/data/stations.js
export const STATIONS = [
  {
    id: 'farm', name: 'Cafetal', infinite: true,
    out: { cherry: 1 }, cycle: 2.0,
    unlockCost: 0, upgradeBase: 5,
    sprites: ['farm_0', 'farm_10', 'farm_25', 'farm_50', 'farm_75'],
  },
  {
    id: 'wetmill', name: 'Beneficiadero',
    in: { cherry: 2 }, out: { washed: 1 }, cycle: 3.0,
    unlockCost: 50, upgradeBase: 40,
  },
  // ...
];

export const MILESTONES = [10, 25, 50, 75, 100]; // ×2 de velocidad en cada uno
export const COST_GROWTH = 1.15;
```

---

## 10. Hoja de ruta

| Versión | Contenido | Resultado jugable |
|---------|-----------|-------------------|
| **v0.1** ✅ | Mapa isométrico, cámara, Cafetal + Despacho, mejora de nivel, HUD de monedas | Producir cerezas, venderlas y mejorar |
| **v0.2** ✅ | Las 7 estaciones, recetas, buffers, desvío a bodega, desbloqueos | La cadena completa funciona |
| **v0.3** ✅ | Arrieros reales por el camino, mejoras de transporte, Willys, indicadores de estado, vista «Ver cadena» | Los cuellos de botella son visibles |
| **v0.4** ✅ | Hitos con cambio de modelo, efectos, día y noche cosmético, sonido básico | Se siente vivo, al estilo Frozen City |
| **v0.5** ✅ | Objetivos, investigaciones, guardado, ganancias sin conexión, simulador de balance | Se juega de principio a fin |
| **v1.0** | Contenedor de exportación, pantalla final y balance ajustado | **Zona 1 completa** |
| v1.1 ✅ | **Zona 2: El Trapiche**: caña → panela; bagazo como combustible; varias zonas a la vez y selector de zonas | Expansión |
| v1.2 ✅ | **Zona 3: La Lechería**: ramificación de la leche; **primera ruta entre zonas** (panela del Trapiche para el arequipe) | Expansión |
| v1.3 ✅ | **Zona 4: El Cacaotal**: chocolate de mesa y chocolatina; dos importaciones a la vez y rutas que abastecen varias estaciones | Expansión |
| v1.4 ✅ | **Zona 5: El Maizal**: arepas y arepas de queso con queso y mantequilla de la Lechería | Expansión |
| v1.5 ✅ | **Zona 6: El Pueblo**: Casa del café, Greca, Fonda, canastas de regalo y Contenedor de exportación (**final del juego**) | Expansión final |
| v1.6 ✅ | **Segundo final**: todo al nivel 100; volver a empezar con producción ×2, ×4, ×8… | Rejugable |
| v1.7 ✅ | Hitos más fuertes (×2, ×2, ×4, ×4, ×8), **Maestría** ×4 y **Supremacía** ×8 por zona, objetivos finales más largos | Segundo final alcanzable |
| v1.8 ✅ | **Ambiente**: datos reales en los paneles y una persona por zona que avisa lo importante; vida en el mapa (gallinas, perro, vacas, gente, palomas); sonidos por zona; la cadena como diagrama | Más personalidad |
| v1.9 ✅ | **Jornada y temporadas** (§10.1): de noche no se trabaja; verano, entrada de aguas, invierno y veranillo | Ritmo |
| v2.0 | **Eventos e insignias** (§10.2): un evento por zona al año, con medallas; progresión general que no se pierde al reiniciar | Rejugable a largo plazo |
| v3.0 ✅ | **Regiones** (§10.3): Santander se abre al completar el Pueblo; su primera zona, **La Guayabera** (bocadillo veleño), y su música (guabina) | Más país |
| v3.1 ✅ | **El Tabacal** (tabaco torcido a mano), la segunda zona de Santander | Santander crece |
| v3.2 ✅ | **La Fiquera** (costales, alpargatas y tercios de tabaco), con la primera ruta de Santander: la del tabaco, desde el Tabacal | Santander crece |
| v3.3 ✅ | **El Hato** (carne oreada, almuerzo y fiambre), con las rutas del bocadillo (Guayabera) y de la cabuya (Fiquera) | Santander crece |
| v3.4 ✅ | **Las Hormigas** (hormiga culona, cosechada solo en la entrada de aguas), con las rutas de los costales y las alpargatas (Fiquera) | Santander crece |
| v3.5 ✅ | **Barichara**, la última zona de Santander (como el Pueblo: recibe lo de las otras cinco y lo vuelve excursiones por el Camino Real a Guane) | Santander completo |
| v3.15 ✅ | **La Costa** se abre al completar Barichara; su primera zona, **El Arrozal** (arroz de Montería y Mompox), y su música (cumbia) | Más país |
| v3.16 ✅ | **El Cocal** (coco → leche de coco → cocadas), la segunda zona de la Costa | La Costa crece |
| v3.17 ✅ | **La Ciénaga** (bocachico: pescado salado, frito con patacón y en coco), con la primera ruta de la Costa: la de la leche de coco, desde el Cocal | La Costa crece |
| próximas | La Costa: La Quesera, El Sombrero y Cartagena (final), con sus eventos, álbum y logros | La Costa crece |
| después | **Boyacá**: papa, cebada y cerveza, lana y ruanas, quesos de Paipa, artesanías de Ráquira y Villa de Leyva (final) | Más país |

**Cómo se conectan las zonas:** ver §4b.

### 10.1 Jornada y temporadas (v1.9 ✅)
- **Jornada**: las estaciones trabajan **de 6:00 a 12:00 y de 14:00 a 20:00** (12 h; hasta la v3.7 era de 6:00 a 18:00) (un día de juego son 8 minutos); a la hora del almuerzo y de noche **se detienen del todo**. Los arrieros terminan su viaje; el Willys y las chivas siguen. **No se compensa**: el juego se hace más largo a propósito. El tiempo sin conexión respeta el horario.
- **Más horas de trabajo (v3.8)**: con Renombre ⭐ se compran bloques de 2 h, cada uno al doble del anterior y en este orden: 20–22 (2 ⭐), 4–6 (4 ⭐), 22–24 (8 ⭐), 2–4 (16 ⭐), 12–14 (32 ⭐, el almuerzo) y 0–2 (64 ⭐): 126 ⭐ para trabajar las 24 h. Son del jugador (el perfil, `workLevel`): valen en todas las regiones y no se pierden al reiniciar. Aparte de las horas sin conexión; las dos están en 🏅 Eventos › ⏰ Horas (`EXTRA_BLOCKS` en `src/sim/calendar.js`, `WORK_COSTS` en `src/sim/renown.js`). Los tableros de los eventos siguen siempre de día.
- **Temporadas**: un año de **16 días** de juego, en **4 temporadas de 4 días**. Cada temporada sube o baja la producción de **todas las estaciones a la vez** (no por zonas), para no descompensar la cadena. Son las temporadas generales del país, secas y de lluvias: ☀️ **Verano** ×1,2 · 🌦️ **Entrada de aguas** ×1 · 🌧️ **Invierno** ×0,8 · 🌤️ **Veranillo** ×1. Se ve junto al reloj y en el mapa (lluvia, cielo gris, potreros secos en verano). La *mitaca* (la cosecha chica del Eje Cafetero) va solo como dato curioso en los paneles.
- **Sin conexión**: se calcula sin el multiplicador de desarrollador, simulando rápido el tiempo que pasó para contar las horas de la noche y las temporadas.
- **Cómo se ve**: junto al reloj va la temporada; tocar el reloj abre el **calendario** (hora, temporada, día y año, y lo que rinde cada temporada, con el dato de la mitaca). En la entrada de aguas caen aguaceros de vez en cuando y en invierno llueve casi todo el tiempo. La persona de la zona anuncia cada temporada nueva y, la primera vez, que de noche no se trabaja. De noche y al almuerzo los paneles lo dicen («🌙 De noche no se trabaja…», «🍲 A la hora del almuerzo…») y el mapa no muestra avisos.
- Una partida nueva empieza el primer día del año, a las 8:00, en verano. El reinicio del segundo final vuelve al primer día.
- Las pruebas de la cadena apagan el calendario (`CALENDAR.on = false`: siempre de día y sin temporada); `test/calendar.test.js` prueba el calendario.

### 10.2 Eventos e insignias (v2.0–v2.3 ✅)
- **Tableros aparte**: cada evento usa las piezas de una zona en un tablero separado del mapa, con sus propias monedas y niveles. Tiene **su propio reloj, que se pausa al salir** (para mirar el mapa general) y que no avanza sin conexión.
- **Una vez al año por zona**: cada zona abre su evento una vez por año de juego; el objetivo cambia de un año al siguiente. Con el tiempo, **4 eventos por zona** (4 medallas por zona, 24 en total). Solo uno a la vez por zona: si pasa, hay que esperar al otro año.
- **Medallas** según qué tan rápido se cumple: 🥉 bronce, 🥈 plata, 🥇 oro.
- **Primeros eventos (uno por zona)**: Finca, *La broca* (una plaga que baja la cosecha; trampas, hongo Beauveria y re-re para controlarla); Trapiche, *La gran molienda* (sin leña: la hornilla solo arde con el bagazo que se produce); Lechería, *Feria ganadera* (pedidos con plazo de queso, crema y arequipe); Cacaotal, *Derrumbe en la vía* (la ruta de la panela cortada: aguantar con lo guardado y abrir una trocha); Maizal, *Fiesta del maíz* (tandas de arepas para la fiesta); Pueblo, *El barco sale el viernes* (contenedores llenos antes de que zarpe cada barco).
- **Renombre ⭐**: las medallas dan Renombre (🥉 1, 🥈 2, 🥇 4), que se acumula en un total que **no se pierde al reiniciar** y nunca se convierte en monedas de la partida. Se gasta en **decoración** (colores de las casas y los balcones, pintura de la chiva y del Willys, ropa de los arrieros, adornos de la plaza) y en el **álbum de láminas** (como el de las chocolatinas: cada medalla y cada logro da una lámina; llenar una página da Renombre extra).
- **Logros generales** que suman entre partidas (vender, exportar, ganar medallas en todas las zonas…), sin logros de velocidad: con cada reinicio todo va mucho más rápido.
- **Cómo quedó en la v2.0** (`src/data/events.js`, `src/sim/events.js`):
  - Cada tablero es una partida aparte (el mismo estado y la misma simulación, con solo la zona del evento) que se juega con su propio `Game`. Su reloj es su `playTime`: avanza solo mientras se está en el tablero. En el tablero siempre es de día y no hay temporada. Se guarda dentro de la partida (`state.events.boards`).
  - Un evento se abre cuando en la partida están construidas todas las estaciones que usa (así ya se conocen las piezas) y la persona de la zona lo anuncia. Se juega una vez por año de juego; si se empieza, se puede seguir aunque pase el año.
  - Las estaciones empiezan en el nivel 10, con el Despacho también en 10 y, desde la v3.1.1, con lo que cuesta la primera compra del evento (antes, 0 monedas: el primer minuto no había nada que hacer mientras el primer producto recorría la cadena). Las compras del evento son como investigaciones que solo valen en el tablero, en orden. Las investigaciones de la partida no valen en el tablero, ni los reinicios ×2.
  - **La broca** (Finca): el Cafetal arranca al 40 %; 🪤 Trampas (400) lo deja al 60 %, 🍄 Hongo Beauveria (2.500) al 80 % y 🧺 Re-re (6.000) al 100 %. La plaga se ve sobre el Cafetal mientras no esté controlada. Objetivos por año: vender 100 bolsas, producir 500 de café tostado y producir 1.000 de café verde; luego se repiten. Cada objetivo tiene sus propios tiempos de medalla (ver más abajo la calibración de la v3.1.1).
  - El Renombre, las medallas (la mejor de cada evento y cuántas de cada una) y el registro de eventos están en `state.profile`, que pasa a la partida nueva al reiniciar.
  - **v2.1, los otros cinco** (en el tablero no hay otras zonas: lo que se importa llega «de afuera» según `supply`, de 0 a 1, y el objetivo puede pedir varios productos):
    - 🔥 **La gran molienda** (Trapiche): sin leña, la Hornilla al 40 %; ☀️ bagacera, 🧱 hornilla reparada y 🌬️ fuelle. Panela pulverizada, panela, melado.
    - 🐮 **Feria ganadera** (Lechería): pedidos de queso, mantequilla y arequipe a la vez (la panela llega sin falta); 🧀 moldes, 🧈 batidora (Descremadora y Mantequera) y 🍯 paila de cobre aceleran cada rama.
    - 🪨 **Derrumbe en la vía** (Cacaotal): la panela no llega, solo 60 guardadas; 🫏 mulas por el monte (25 %), 🛻 trocha (60 %) y 🚧 despejar la vía (100 %). Chocolate de mesa, chocolatina o los dos.
    - 🎉 **Fiesta del maíz** (Maizal): el budare grande se rajó (40 %); 🍳 budare prestado, 🪵 leña seca y 👵 las vecinas ayudan. Arepas de queso, arepas, masa.
    - 🚢 **El barco sale el viernes** (Pueblo): todo lo importado llega; la grúa varada deja el Patio al 40 %; 🔧 repuestos, 🏗️ grúa arreglada y 👷 turno extra. Contenedores, canastas de regalo, contenedores con desayunos.
  - **v2.2, en qué se gasta el Renombre** (`src/data/album.js`, `src/data/decor.js`, `src/sim/renown.js`), sin nada al azar (nada de sobres sorpresa):
    - **Álbum de láminas**: seis páginas (el café, la panela, la leche, el cacao, el maíz y el pueblo) de seis láminas sobre lo que rodea a cada producto en Colombia (el arriero, la chapolera, el yipao, la melcocha, el kumis, el molinillo, la mazamorra, la chiva…). Cada lámina cuesta 1, 2 o 3 ⭐ y se pega la que uno elija; una página llena da 3 ⭐ de premio. Todo el álbum cuesta 72 ⭐ (54 descontando los premios).
    - **Decoración** (solo se ve; vale también en los tableros): color del Willys (3 ⭐ cada uno), enjalma de las mulas (2 ⭐), pintura de la chiva (4 ⭐) y banderines frente a la bodega (5 ⭐). Lo de siempre es gratis; lo comprado se puede cambiar cuando se quiera.
    - Se abre desde la ventana de eventos (📖 Álbum, 🎨 Decoración). Todo se guarda en `state.profile` y pasa a la partida nueva al reiniciar.
    - **Por región (v3.10)**: cada región tiene su **álbum** (el de Santander: el bocadillo, el tabaco, el fique, el hato, las hormigas y Barichara, con láminas como el bijao, el caney, Curití, la pepitoria, el tiesto o el Camino Real), su **decoración** (lo comprado y lo elegido, aparte; `profile.decor[región]`), sus **logros** (los de Santander con sus productos: cajas de bocadillo, tabacos, alpargatas, fiambres, recuerdos y excursiones; las medallas, el álbum y las investigaciones cuentan solo las de la región; `profile.lifetimes[región]`) y su **jornada** (`workLevel` en la partida de la región). El Renombre y las horas sin conexión siguen siendo del jugador. En la ventana del Renombre se elige la región (empieza en la que se juega). Las partidas viejas pasan su decoración al Eje Cafetero y sus bloques de jornada a cada región.
    - **Segundo Willys (v3.9)**: con el álbum de la región lleno se compra, por región, un segundo Willys (20 ⭐ cada región). Desde entonces cada zona de la región tiene dos: salen cada uno por su cuenta con la misma carga por viaje, así que el despacho vende el doble (`jeepCount` en `src/sim/modifiers.js`, `jeep2` en cada zona). La carretera se amplía con un segundo carril (`jeepRoad2`, por dentro del primero) para que no se choquen, y el letrero de salida pasa al otro lado. Es de la región (`willys2` en su partida): no se pierde al reiniciarla. Se pinta aparte (🎨 «Color del segundo Willys», que sale rojo). En los tableros de los eventos sigue habiendo uno solo.
  - **v2.3, logros generales** (`src/data/logros.js`, `src/sim/logros.js`): 15 logros de uno a tres niveles, todos de cantidad y ninguno de velocidad: bolsas de café vendidas, panela, queso, chocolate y arepas de queso producidos, contenedores exportados, monedas ganadas, años de juego, veces que se completó el Pueblo y que se llegó al segundo final, medallas, eventos con medalla y con oro, páginas del álbum e investigaciones en una partida. Cada nivel da Renombre (de 1 a 16 ⭐). Lo de las partidas anteriores se guarda al reiniciar en `profile.lifetime` y sigue contando. Se ven en la ventana del Renombre (🏆 Logros).
  - **v3.7, cupos y horas del jugador.** Los eventos ya no van por año: cada región tiene 2 cupos; al terminar un evento su cupo queda vacío 3 años del juego (cada cupo va por su lado), y al llenarse sale primero una zona nunca jugada o, si no hay, la que lleva más tiempo sin jugarse. Los eventos no se vencen y el reto de cada zona avanza al terminarlo. Cumplir el objetivo asegura la medalla con su tiempo; el evento termina al tener compradas las tres mejoras. Las horas sin conexión pasan al perfil (2 h, +2 h por nivel con Renombre hasta 24 h, de 2 a 12 ⭐), valen para todas las regiones y no se pierden al reiniciar; se quitaron las 12 investigaciones que las sumaban (`src/sim/events.js`, `src/sim/renown.js`).
  - **v3.8, región terminada.** Al completar la última zona de una región (el Pueblo, Barichara) queda marcada para siempre (`regionDone`, se conserva al reiniciar): desde entonces los cupos se llenan con los eventos de **todas sus zonas**, aunque tras reiniciar solo esté abierta la primera, porque ya se jugaron. Las partidas viejas la marcan si ya tenían la última zona completa o algún reinicio.
  - **v3.10.1, nivel máximo.** En los tableros de los eventos las estaciones, los arrieros y el despacho llegan hasta el **nivel 50** (en la partida, 100): `EVENT_MAX_LEVEL` y `maxLevel(state)` en `src/sim/rules.js`. Las medallas calibradas se siguen pudiendo lograr (la prueba de los jugadores automáticos lo vigila).
  - **v3.11, Renombre de por vida.** Cada reinicio (segundo final) de cualquier región da 10 ⭐ (`RESTART_RENOWN`). Todo lo que da Renombre pasa por `gainRenown`, que suma también `profile.renownTotal`: el total ganado, que no baja al gastar (para clasificar jugadores más adelante). Las partidas viejas lo reconstruyen con las medallas, los logros y las páginas llenas.
  - **v3.12.** El total ganado se llama **Prestigio**. El segundo final pide estaciones, arrieros y rutas en el nivel 100, todos los objetivos y todas las investigaciones de la región (`masteryParts` en `src/sim/legacy.js`); los que lo tenían con la regla de antes lo pierden si les falta algo. Reiniciar ya no quita los tableros de los eventos ni sus cupos. En los eventos, `eventHandicaps`/`handicapText` (y `blame` en cada evento) dicen cuánto rinde la estación frenada y por qué. El Pueblo se llama **Salento** (`style: 'salento'`: casas blancas con balcones de colores, más palmas de cera). Cada zona tiene su letrero con el nombre; los Willys y las chivas tienen faros de noche; la Compostera sale en la cadena; las investigaciones bloqueadas llevan a lo que les falta (`researchBlocker`).
  - **v3.13.** La persona de cada zona está en el mapa (`render/Keeper.js`) y en los tableros; al tocarla habla (`talk` en `ui/Chatter.js`: repite lo último si aún aplica y luego recorre los avisos vigentes). Listado de medallas por evento y premio por región: todos en bronce o mejor 5 ⭐, plata 10 ⭐, oro 20 ⭐ (`checkMedalBonus`, `profile.medalBonus`). Mascotas por región, solo de adorno: gatos (50 ⭐, hasta 10) y loros (40 ⭐, hasta 5) (`PETS`, `profile.pets[región]`, `render/Pets.js`); los gatos persiguen a los loros cada medio minuto o un minuto, al azar.
  - **v3.14.** Los eventos se ven en el mapa del tablero (`render/EventArt.js`): cada uno tiene su escena en cuatro etapas (cuántas compras van), con lo que se mueve (bichos, lluvia, humo, mulas, el carro, la balsa, la gente). Quita los árboles que le estorban (`grid` en la decoración del terreno).
  - **v3.6, eventos de Santander**: uno por zona, con la mecánica del de su par del Eje Cafetero (la mosca de la fruta en la Guayabera, humedad en el caney del Tabacal, feria artesanal en la Fiquera, creciente del río en el Hato, temporada de turistas en las Hormigas y puente festivo en Barichara). El tablero se arma con las zonas de la región del evento y se guarda en su partida; las medallas y el Renombre van al perfil de la partida principal. Medallas calibradas igual que las demás.
  - Medallas calibradas con `tools/event-sim.js`, que juega cada objetivo con tres jugadores automáticos (el que sube lo que lleva al objetivo, el que sigue la mejora recomendada y uno lento): el oro, el tiempo del más rápido (10–12 min); la plata, 5 min más.
  - **v3.1.1, oro posible.** Con esa calibración, ni los mejores jugadores automáticos decidiendo cada segundo llegaban al oro en 5 de los 18 objetivos (les faltaban de 1 a 16 s). Cambios:
    - El tablero empieza con lo que cuesta la primera compra del evento (400 en la broca… 20 M en el barco): desde el primer segundo se decide entre esa compra y subir estaciones.
    - En el tablero, la mejora recomendada mira solo lo que lleva al objetivo: las estaciones que hacen los productos que todavía faltan (y las anteriores), sus arrieros y, si hay que vender, el despacho. Antes buscaba más monedas: en el derrumbe subía la Chocolatería, que se quedaba con la pasta y la panela del chocolate de mesa, y quien la seguía tardaba 55 min.
    - Los jugadores automáticos están en `tools/event-bots.js` (tres estilos —objetivo, recomendada y mixta—, cuatro formas de ahorrar para las compras del evento y cada cuántos segundos deciden). `tools/event-sim.js` busca el más rápido decidiendo cada segundo y propone el **oro: ese tiempo más un 9 %, redondeado a 15 s** (de 8:15 a 14:00 según el objetivo); la **plata, 5 min más**. Decidir cada 5 o 10 s en vez de cada segundo cuesta solo 5–20 s: lo que pesa es la estrategia (ahorrar a tiempo para la siguiente compra del evento).
    - `test/event-medals.test.js` comprueba que en cada objetivo alguien que decide cada 5 s con una de dos estrategias razonables logra el oro.

### 10.3 Regiones (v3.0: Santander en camino; v3.1: El Tabacal; v3.2: La Fiquera; v3.3: El Hato; v3.4: Las Hormigas; v3.5: Barichara, Santander completo)
- Cada región es un **mapa nuevo con sus propias zonas, cadenas y productos**, con **su propia economía** (monedas, niveles e investigaciones) y **su propio reinicio** (el ×2 del segundo final vale solo para esa región).
- Entre regiones solo se comparte lo general: **Renombre ⭐, álbum de láminas, decoración y logros**.
- Por ahora las regiones **no se conectan** entre sí. Más adelante podría haber exportación entre regiones (llevar productos de una a otra), pero no hace falta.
- **Decisiones (v3.0):**
  - Cada región tiene **seis zonas**, como el Eje Cafetero.
  - **Santander se abre al completar el Pueblo** (el primer final del Eje Cafetero).
  - **Todas las regiones producen a la vez** (también sin conexión: el cálculo se hace región por región, con la pantalla de carga).
  - El **calendario es el del país**: una región que se abre después empieza en la fecha de ese día, y un reinicio sigue la fecha (`clockOffset`, `clockOf` en `src/sim/calendar.js`).
- **Cómo quedó (v3.0)** (`src/data/regions.js`, `src/sim/regions.js`): la partida del Eje Cafetero es la principal y guarda las demás en `regions`, cada una como una partida completa (con su `region`, sus zonas, rutas, monedas, investigaciones, objetivos, segundo final y reinicio ×2). Cada región tiene su `Game`; la interfaz muestra la de la zona que se está viendo. El selector de zonas 🗺️ las agrupa por región. El perfil (Renombre, medallas, álbum, decoración y logros) lo guarda solo la principal. Los eventos son, por ahora, los del Eje Cafetero.
- **Santander** (v3.0 en adelante), con sus seis zonas: 🍈 **La Guayabera** (guayaba → pulpa → melado → bloque → bocadillo → envuelto en hoja de bijao → caja; misma estructura y mismos números que la Finca, porque la región empieza de cero), 🌿 **El Tabacal** (v3.1: hoja de tabaco → curada en el caney → despalillada → fermentada en pilones → torcida a mano; mismos números que el Trapiche, sin el combustible de la Hornilla: a igual nivel la cadena cuadra sin él; su persona es Don Ramiro, el veguero), 🧵 **La Fiquera** (v3.2: penca → fibra en la desfibradora, que se reparte como la leche de la Lechería: costales en el telar, hilo y alpargatas, y los tercios de tabaco, que llevan el tabaco fermentado del Tabacal por la **Ruta del tabaco**; mismos números que la Lechería; su persona es Doña Carmen, la tejedora), 🐂 **El Hato** (v3.3: novillo → carne en la fama → adobada en el saladero → oreada al sol en el tendedero → asada; la carne asada se reparte entre la Mesa del almuerzo, con bocadillo de postre que llega de la Guayabera, y la Fiambrería, que además amarra cada fiambre con la cabuya de la Fiquera; mismos números que el Cacaotal; su persona es Don Efraín, el vaquero), 🐜 **Las Hormigas** (v3.4: hormiga culona → limpia → en salmuera → tostada en tiesto → cucurucho → recuerdo de Santander, con los costales y las alpargatas de la Fiquera; mismos números que el Maizal. El Hormiguero **solo cosecha en la entrada de aguas, ×4** (lo de todo el año) y guarda en su **despensa** (3.000 s de producción en vez de 15) lo que los arrieros llevan a la cadena el resto del año: en dos años simulados se cosecha lo mismo que con una fuente pareja. La zona abre con la despensa llena, para no arrancar parada; si se vacía fuera de temporada, la persona y los paneles dicen que hay que esperar, no subir niveles. Su persona es Doña Gloria, la hormiguera, que anuncia cada entrada de aguas) y ⛪ **Barichara** (v3.5, el final de la región: como el Pueblo, no tiene fuente propia. La Dulcería de la plaza hace dulces típicos con las cajas de bocadillo de la Guayabera; el Café del parque, la sobremesa con un tabaco del Tabacal; la Posada, la estadía con un recuerdo de las Hormigas; el Taller de cajas, la caja surtida con los tercios de la Fiquera; las Canastas del caminante, con el almuerzo y el fiambre del Hato; y la Salida al Camino Real, las excursiones a Guane. Cada ruta sale de la zona que corresponde a la del Pueblo y los productos valen lo mismo (la caja de bocadillos, 250, como la bolsa de café), así que el balance es el mismo. Se dibuja como el Pueblo pero blanca, de tapia pisada, con la plaza de piedra amarilla; su persona es Lucía, la guía). Su persona es Doña Inés, la bocadillera, y su música, la **Guabina del Chicamocha** (en si menor, 92 negras por minuto).
- **La Costa** (v3.15 en adelante): se abre al completar Barichara. Sus zonas: 🌾 **El Arrozal** (v3.15: arroz en cáscara → secado al sol y en secadora → descascarado (arroz integral) → pulido (arroz blanco) → clasificado (arroz de primera) → bolsa → bulto; mismos números que la Guayabera, porque la región empieza de cero; su persona es Don Abelardo, el arrocero), 🌴 **El Cocal** (v3.16: coco → pelado a machete → rallado → leche de coco en la prensa → cocadas en la paila; mismos números que el Tabacal; la leche de coco y las cocadas son las que después viajarán a la Ciénaga y a Cartagena; su persona es Doña Eulalia, la cocadera; se dibuja sobre arena, con palmas de coco por todas partes y cocos caídos), 🛶 **La Ciénaga** (v3.17: bocachico → pescado limpio, que se reparte como la fibra de la Fiquera: pescado salado en el Saladero, filetes y pescado frito con patacón en la Fileteadora y la Fritanga, y pescado en coco en la Cocina, con la leche de coco del Cocal por la **Ruta de la leche de coco**; mismos números que la Fiquera; su persona es Don Aníbal, el pescador; la fuente es el agua de la ciénaga, con taruyas, un muelle y canoas cuyos pescadores tiran la atarraya), y después La Quesera, El Sombrero y Cartagena (el final). Mientras le falten zonas (`wip` en `src/data/regions.js`) la región no se termina: no tiene segundo final, eventos, álbum ni logros todavía, y la lista de zonas muestra las que vienen como «Llega pronto». Se dibuja con el arrozal inundado (agua, camellones y matas que espigan con cada hito), ceibas, palmas de coco, garzas y plátano. Su música es la **Cumbia del arrozal** (en la menor, 4/4, 100 negras por minuto): gaita en la melodía, guacharaca, llamador, tambora, tambor alegre, bajo y golpes de guitarra.
- Ideas de productos:
  - **Santander**: bocadillo veleño (guayaba), tabaco, hormigas culonas, fique (costales y alpargatas).
  - **Costa Caribe**: coco y cocadas, plátano y patacones, yuca y enyucado, queso costeño, caña flecha y sombrero vueltiao.
  - **Llanos**: ganado y carne a la llanera, cuero, arroz, palma de aceite.
  - **Altiplano**: papa, lana y ruanas, trucha, almojábanas.
- **Música por región** (sintetizada en el juego, sin archivos): bambuco y pasillo para el Eje Cafetero; guabina para Santander; cumbia y porro para la Costa; joropo para los Llanos; torbellino para el Altiplano.

---

## 11. Fuera de alcance

Supervivencia, clima que afecte a una sola zona (las temporadas de la v1.9 afectan a todas por igual), población con necesidades, héroes, combate, gacha, energía, multijugador, tienda con dinero real y servidor. (El reinicio con producción al doble llegó en la v1.6, tras el segundo final.)

---

## 12. Decisiones abiertas

1. ¿Cafetal o prefieres otra cadena (panadería, chocolate, herrería)?
2. ¿Escritorio primero (recomendado) o móvil vertical?
3. ¿Nombre? *Cafetal*, *Del Grano a la Taza*, *Finca*, *Arrieros*.
4. ¿Interfaz solo en español o también en inglés?
