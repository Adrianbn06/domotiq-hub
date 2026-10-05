# Plan de contenido

La tarea programada toma el **primer tema sin marcar**, lo desarrolla siguiendo `CLAUDE.md`, abre un
pull request y lo marca aquí como hecho (`- [x]`, con la fecha). El dueño puede reordenar,
añadir o borrar temas cuando quiera.

Objetivo: llegar a **25–30 artículos sólidos** para poder pedir Google AdSense, y seguir después.
Las guías prácticas ("cómo…", "por qué no funciona…") son las que más se buscan en Google: alternarlas
con comparativas y productos.

Cómo leer la lista:
- Cada tema tiene un código (`T001`, `T002`…). La investigación previa de cada tema, si existe, está
  en el documento de investigación con ese mismo código. Es un punto de partida: cada dato se vuelve a
  verificar con su fuente antes de publicarlo.
- **Guía** = artículo práctico (`data/guias.json`, se crea en T001). **Comparativa** = "X vs Y" con
  productos del catálogo (`data/comparativas.json`). **Productos** = fichas nuevas en `data/productos.json`.
- Si una comparativa necesita productos que aún no están en el catálogo, primero se añaden sus fichas
  (en el mismo pull request). Si hace falta una categoría nueva, se añade también en `scripts/catalogo.js`.
- Si un tema depende de otro que aún no está hecho, se toma el siguiente que sí se pueda hacer.
- Títulos orientativos: el título final se ajusta a lo que la gente busca, sin promesas exageradas.

## Pendientes

### Bloque 1 — Lo básico para Latinoamérica (prioridad alta)

- [ ] T003 Guía: el enchufe o foco inteligente no se conecta al WiFi (red de 5 GHz, Smart Life / eWeLink / Tapo): solución paso a paso
- [ ] T004 Guía: los primeros 5 dispositivos para empezar tu casa inteligente en Latinoamérica
- [ ] T005 Guía: 110–127 V o 220 V: qué revisar antes de comprar domótica (voltaje, clavija, rosca E26/E27, versiones por país)
- [ ] T006 Comparativa: interruptor inteligente vs foco inteligente: cuál conviene en cada caso
- [ ] T007 Guía: qué es un hub domótico y cuándo lo necesitas (y cuándo no)
- [ ] T008 Productos nuevos: 3 sensores — Aqara Motion Sensor P1, un sensor de fuga de agua Zigbee (Aqara o Sonoff) y un sensor de vibración o botón inalámbrico
- [ ] T009 Guía: qué pasa con tu casa inteligente cuando se cae el internet, y alternativas que funcionan en local
- [ ] T010 Comparativa: sensores de movimiento Aqara Motion P1 vs Sonoff SNZB-03P (requiere T008)
- [ ] T011 Guía: comprar domótica en Amazon o AliExpress desde Latinoamérica — versión correcta, envío, aduana y garantía
- [ ] T012 Guía: cortes de luz: cómo reaccionan los enchufes, focos y relés inteligentes al volver la energía, y cómo protegerlos (estado tras el corte, UPS)
- [ ] T013 Reescribir guía antigua: Alexa vs Google Home vs Apple HomeKit, verificando cada dato y la disponibilidad en Latinoamérica (mantener la URL)
- [ ] T014 Guía: cómo medir el consumo eléctrico de tus electrodomésticos con enchufes inteligentes
- [ ] T015 Productos nuevos: 3 focos o bombillas para redes de 220–240 V (versiones E27 de WiZ y Philips Hue, y un foco Tuya / Smart Life de 220 V)
- [ ] T016 Comparativa: focos WiFi baratos vs focos Zigbee de marca
- [ ] T017 Guía: cómo instalar un relé o interruptor inteligente con y sin neutro (con aviso de electricista)
- [ ] T018 Comparativa: relés con neutro — Shelly 1 Gen4 vs Sonoff MINIR4 (productos ya en el catálogo)
- [ ] T019 Guía: Smart Life vs Tuya vs eWeLink: qué app usar y si se pueden mezclar marcas
- [ ] T020 Reescribir guía antigua: Zigbee vs Z-Wave vs WiFi, verificando cada dato (Z-Wave casi no se vende en Latinoamérica: decirlo) (mantener la URL)
- [ ] T021 Guía: mitos y verdades de los focos inteligentes (consumo en espera, interruptor de pared, WiFi)
- [ ] T022 Productos nuevos: 3 interruptores — Sonoff MINIR4M (Matter), un interruptor táctil de pared Zigbee Tuya/MOES y un relé de 2 canales
- [ ] T023 Guía: domótica en departamentos alquilados: instalaciones sin obras
- [ ] T024 Comparativa: Home Assistant con coordinador USB (Sonoff ZBDongle-E) vs hub Sonoff ZBBridge-P
- [ ] T025 Reescribir guía antigua: Matter 1.4, verificando cada dato con la web de la CSA (mantener la URL)
- [ ] T026 Guía: crea tu primera rutina en Alexa desde cero
- [ ] T027 Productos nuevos: 2–3 enchufes con Matter (por ejemplo Tapo P125M o equivalentes verificados)
- [ ] T028 Comparativa: enchufes con Matter vs enchufes WiFi clásicos (requiere T027)
- [ ] T029 Guía: Thread y los Border Routers explicados
- [ ] T030 Comparativa: sensores de temperatura y humedad Aqara vs Sonoff SNZB-02P (productos ya en el catálogo)

### Bloque 2 — Clima, agua, energía y asistentes

- [ ] T031 Guía: por qué tu WiFi se cae y cómo solucionarlo (canales, 2,4 GHz, demasiados dispositivos)
- [ ] T032 Productos nuevos: 3 controles infrarrojos WiFi — Broadlink RM4 (Mini o Pro), SwitchBot Hub Mini y un control IR Tuya / Smart Life (categoría nueva)
- [ ] T033 Comparativa: controlar aire acondicionado y TV por infrarrojo — Broadlink RM4 vs SwitchBot Hub vs control IR Tuya (requiere T032)
- [ ] T034 Guía: controlar el aire acondicionado split desde el celular para ahorrar energía
- [ ] T035 Reescribir el glosario de domótica con todos los términos que hay que conocer (mantener la URL)
- [ ] T036 Guía: sensores de movimiento vs sensores de presencia (mmWave): diferencias y cuándo usar cada uno
- [ ] T037 Guía: cómo bajar la factura de luz con automatización (cuánto se ahorra de verdad, sin promesas exageradas)
- [ ] T038 Guía: sensores de fuga de agua: el aparato que evita inundaciones (requiere T008)
- [ ] T039 Guía: SmartThings vs Tuya / Smart Life: comparativa de ecosistemas
- [ ] T040 Guía: tinaco o cisterna inteligente: sensor de nivel de agua y control de la bomba (con aviso de electricista)
- [ ] T041 Productos nuevos: 3 parlantes con asistente — Amazon Echo Dot (5.ª gen.), Google Nest Mini y Apple HomePod mini (categoría nueva)
- [ ] T042 Comparativa: Apple HomePod mini vs Echo Dot 5.ª gen. (requiere T041)
- [ ] T043 Guía: cómo hacer inteligente un televisor viejo
- [ ] T044 Productos nuevos: Amazon Echo Show 8 y Google Nest Hub (2.ª gen.) (requiere T041)
- [ ] T045 Comparativa: Echo Show 8 vs Nest Hub 2.ª gen. (requiere T044)
- [ ] T046 Guía: domótica para adultos mayores: hacerles la vida más fácil
- [ ] T047 Guía: Apple HomeKit vs Home Assistant: privacidad y facilidad vs control total
- [ ] T048 Guía: instalar Home Assistant en una Raspberry Pi para principiantes
- [ ] T049 Productos nuevos: 3 cámaras WiFi para interiores — TP-Link Tapo, Ezviz y Eufy (categoría nueva)
- [ ] T050 Comparativa: cámaras WiFi para interiores — Tapo vs Ezviz vs Eufy (requiere T049)

### Bloque 3 — Seguridad, privacidad, luces y automatizaciones

- [ ] T051 Guía: cómo evitar que hackeen tus cámaras de seguridad WiFi
- [ ] T052 Guía: activar la verificación en dos pasos (2FA) en tus apps de domótica
- [ ] T053 Guía: micrófonos de Alexa y Google: qué escuchan realmente y cómo borrar las grabaciones
- [ ] T054 Guía: los riesgos de usar dispositivos genéricos sin marca en tu red principal
- [ ] T055 Guía: cómo crear una red (VLAN o red de invitados) para aislar tus dispositivos IoT
- [ ] T056 Guía: IP fija (reserva DHCP) para tus hubs domóticos: por qué y cómo hacerlo
- [ ] T057 Guía: simulación de presencia: que tu casa parezca habitada en vacaciones
- [ ] T058 Productos nuevos: 3 tiras LED inteligentes — Tuya / Smart Life WiFi, Govee y Philips Hue Lightstrip (categoría nueva)
- [ ] T059 Guía de compra: tiras LED inteligentes para tu setup gamer (requiere T058)
- [ ] T060 Comparativa: Philips Hue vs Govee: ¿vale la pena pagar más por Hue? (requiere T058)
- [ ] T061 Guía: sincronizar tiras LED con la pantalla del TV (efecto Ambilight)
- [ ] T062 Guía: cómo automatizar cortinas o persianas paso a paso
- [ ] T063 Guía: qué es IFTTT y alternativas para automatizar tu casa
- [ ] T064 Guía: qué es MQTT y por qué es el rey del IoT local
- [ ] T065 Guía: lógica digital aplicada a las rutinas del hogar (AND, OR, NOT)
- [ ] T066 Guía: automatizaciones con condiciones: si pasa X y Y pero no Z (incluye evitar que las luces se enciendan de día)
- [ ] T067 Productos nuevos: 3 cerraduras inteligentes que se consigan en Latinoamérica (huella, clave o app) (categoría nueva)
- [ ] T068 Comparativa: cerraduras inteligentes con huella, clave o app (requiere T067)
- [ ] T069 Guía: ¿son seguras las cerraduras inteligentes con huella?
- [ ] T070 Guía: qué hacer si te roban el celular con el que controlas tu casa
- [ ] T071 Guía: cómo compartir el control de la casa con visitas sin darles acceso total
- [ ] T072 Guía: cómo actualizar el firmware de tus dispositivos IoT para corregir fallos de seguridad
- [ ] T073 Guía: el riesgo de los enchufes inteligentes de dudosa procedencia (cortocircuitos y certificaciones)
- [ ] T074 Guía: detectores de humo y monóxido de carbono inteligentes
- [ ] T075 Guía: alarma inteligente hecha por ti vs empresa de monitoreo
- [ ] T076 Productos nuevos: 3 timbres con video — Ring, TP-Link Tapo y Ezviz (categoría nueva)
- [ ] T077 Comparativa: timbres con video — Ring vs Tapo vs Ezviz (requiere T076)
- [ ] T078 Comparativa: cámaras Ring vs Blink (requiere la categoría de cámaras de T049)
- [ ] T079 Guía: mirillas digitales WiFi para puertas de departamentos
- [ ] T080 Guía: cámaras con reconocimiento facial local vs procesamiento en la nube
- [ ] T081 Guía: privacidad con cámaras interiores: modelos con obturador o modo privado físico
- [ ] T082 Guía: proteger tu privacidad con Apple HomeKit (Video seguro de HomeKit)
- [ ] T083 Guía: cómo desactivar funciones innecesarias de tu Smart TV para evitar el rastreo
- [ ] T084 Guía: cerraduras invisibles para puertas blindadas: ¿valen la pena?

### Bloque 4 — Redes, robots y tutoriales avanzados

- [ ] T085 Productos nuevos: 2–3 aspiradoras robot de gama media (Roborock e iRobot Roomba) (categoría nueva)
- [ ] T086 Comparativa: aspiradoras robot de gama media — Roborock vs Roomba (requiere T085)
- [ ] T087 Comparativa: router mesh para domótica — TP-Link Deco vs Eero (añadir sus fichas)
- [ ] T088 Guía: red Zigbee en malla: cómo diseñar una red robusta (repetidores, coordinador, interferencias)
- [ ] T089 Guía: cómo revivir un dispositivo Tuya con Tasmota o ESPHome (y cuáles se pueden)
- [ ] T090 Guía: Node-RED para domótica: flujos lógicos visuales
- [ ] T091 Guía: controlar tu casa desde fuera de forma segura con una VPN (incluye CGNAT, común en Latinoamérica)
- [ ] T092 Guía: integrar cámaras RTSP locales en paneles de domótica
- [ ] T093 Guía: guardar y analizar los datos de tus sensores en una base de datos SQL
- [ ] T094 Guía: crear un panel (dashboard) de domótica en tiempo real: conceptos básicos
- [ ] T095 Guía: ping, latencia y pérdida de paquetes: diagnosticar tu casa inteligente
- [ ] T096 Guía: balizas Bluetooth (beacons) para detectar presencia por habitación
- [ ] T097 Guía: copia de seguridad automática de tus configuraciones domóticas
- [ ] T098 Guía: automatizaciones por geolocalización
- [ ] T099 Guía: tablets baratas para usar como panel de control en la pared

### Bloque 5 — Ahorro, confort y estilo de vida

- [ ] T100 Guía: iluminación exterior inteligente: solar vs cableada
- [ ] T101 Guía: domótica para mascotas: comederos, cámaras y juguetes conectados
- [ ] T102 Guía: cuánto cuesta realmente mantener una casa inteligente (suscripciones, consumo, reemplazos)
- [ ] T103 Guía: rutina de "buenas noches": apagar toda la casa con un solo comando
- [ ] T104 Guía: despertador con luz: simular el amanecer con focos inteligentes
- [ ] T105 Guía: iluminación circadiana: qué es y cómo puede ayudarte a descansar
- [ ] T106 Guía: el ambiente perfecto para hacer home office con domótica
- [ ] T107 Guía: domótica en el cuarto de los niños (luces nocturnas y control parental)
- [ ] T108 Guía: cómo hacer que tu cafetera de siempre se encienda sola al despertar (cuáles sirven y cuáles no)
- [ ] T109 Guía: monitores de calidad del aire interior (CO2 y compuestos orgánicos volátiles)
- [ ] T110 Guía: purificadores de aire inteligentes: qué aportan a la salud
- [ ] T111 Guía: riego inteligente y estaciones meteorológicas para el jardín
- [ ] T112 Guía: ¿se puede automatizar el calentador o termotanque eléctrico? Relés de alta potencia y seguridad (con aviso de electricista)
- [ ] T113 Guía: ventiladores de techo inteligentes y cómo automatizar el que ya tienes
- [ ] T114 Guía: integrar la domótica con paneles solares en casa
- [ ] T115 Guía: baño inteligente: sensor de humedad para el extractor y espejos antivaho
- [ ] T116 Guía: domótica en la cocina: los electrodomésticos inteligentes que sí aportan valor
- [ ] T117 Guía: escenas de "fiesta" o "cena" con un solo botón
- [ ] T118 Guía: botones inteligentes para quienes no quieren hablarle a un asistente
- [ ] T119 Guía: el futuro de la domótica: la IA generativa en la casa

## Hechos

(La tarea programada mueve aquí los temas terminados.)

- [x] (2026-10-05) T002 Comparativa: enchufes con medición de consumo — Sonoff S31 vs Tapo P115 vs Kasa EP25
- [x] (2026-10-03) Diseño, paso 2 "Tu país": el visitante elige su país y cada tarjeta y ficha dice si el producto funciona con su red; título de la portada con el país, foco regulable de 2500 a 6500 K y catálogo filtrado por su voltaje
- [x] (2026-10-03) Diseño, paso 1: sistema visual "Vitrina Obsidian" en todo el sitio (colores, letras, iconos, dibujos de producto, portada, fichas, catálogo, comparativas, guías y las 4 páginas antiguas)
- [x] (2026-10-03) Formato de guías con el estilo de los artículos originales (prompt editorial en `CLAUDE.md`): índice, H3, tablas, ventajas y desventajas, 3 recomendaciones del catálogo y veredicto por perfil. Guía de inicio reescrita así
- [x] (2026-10-03) T001 Técnico + Guía: formato de guías (`data/guias.json` + `scripts/guias.js`) y guía "Qué es la domótica y cómo empezar con menos de 50 USD" reescrita con datos verificados
- [x] (2026-10-02) Comparativa: sensores de puerta Aqara Door and Window Sensor T1 vs Sonoff SNZB-04P
- [x] (2026-10-02) SEO: quitar de las guías antiguas las "ofertas" con precios inventados, fusionar 2 guías duplicadas (301), fechas reales en el sitemap y etiquetas para compartir
