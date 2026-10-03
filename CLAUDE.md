# OfertasDomoticas.com — reglas del proyecto

Web estática de domótica práctica para Latinoamérica: catálogo de productos, comparador,
comparativas "X vs Y" y guías. Se publica sola en Cloudflare Workers al hacer merge en `main`.
El dueño aprueba los cambios revisando pull requests desde el celular: escribe en español y
explica los cambios en lenguaje sencillo.

## Reglas de contenido (obligatorias)

1. **Nunca inventes datos.** Cada especificación (voltaje, protocolo, batería, carga, compatibilidad)
   debe salir de una fuente verificable: primero la web del fabricante, después tiendas o reseñas serias.
   Si no puedes confirmarla, usa `sin-confirmar` en compatibilidad u omite el campo.
2. **Nunca muestres precios exactos ni descuentos.** Solo el rango `precio`: 1 = menos de 15 USD,
   2 = 15–40 USD, 3 = más de 40 USD (orientativo).
3. **Enfoque Latinoamérica.** Indica siempre voltaje y clavija: 110–127 V (México, Centroamérica,
   Colombia, Ecuador, Venezuela) o 220 V (Perú, Chile, Argentina, Bolivia, Uruguay, Paraguay);
   Brasil 127/220 V. Si un producto tiene versiones por país, dilo en `notaLatam`.
4. **Español neutro latinoamericano.** Usa "foco o bombilla", "enchufe o tomacorriente", "celular".
   Tono práctico y honesto: también di los contras.
5. **Seguridad eléctrica.** En relés e interruptores, recomienda siempre un electricista si el lector no tiene experiencia.
6. No toques `data/tiendas.json` (códigos de afiliado) ni la configuración de seguridad (`public/_headers`, `public/_redirects`, `wrangler.jsonc`) salvo que la tarea lo pida.

## Estilo editorial de las guías (prompt del dueño)

Las guías (`data/guias.json`) siguen el mismo estilo de los artículos originales del sitio. Escríbelas
como un experto en Ingeniería de Sistemas Inteligentes y editor senior de OfertasDomoticas: artículo SEO
técnico pero fácil de entender, pensado para ayudar al lector a decidir qué comprar.

- **Tono:** autoridad técnica en primera persona del plural ("analizamos", "revisamos", "comparamos").
  Nada de tono corporativo o robótico. **No digas "probamos" ni "en nuestras pruebas"** salvo que el dueño
  haya probado de verdad el producto: decir que se probó algo sin hacerlo es inventar datos (regla 1).
- **Expresiones prohibidas** (el build falla si aparecen): "En conclusión", "En el vertiginoso mundo",
  "Hoy en día", "En resumen".
- **Formato:** H2 (secciones) y H3 (bloques `{ "h3": … }`), listas, **negritas** en los conceptos clave
  (`**texto**`) y tablas comparativas cuando aporten (`{ "tabla": { "columnas", "filas" } }`). Recuadros:
  `{ "nota": … }` (consejo) y `{ "aviso": … }` (advertencia). Enlaces internos con `[texto](/ruta)`.
- **3 recomendaciones de producto** repartidas por el texto con `{ "oferta": "<slug del catálogo>", "motivo": … }`
  (sustituyen a los antiguos `[INSERTAR_OFERTA: …]`; enlazan a la ficha, donde están los enlaces de tienda).
  Exactamente 3: el build lo comprueba. Si falta el producto adecuado, primero añade su ficha al catálogo.
- **Estructura obligatoria:**
  1. `titulo` (H1) atractivo con el año si aplica; `tituloCorto` ≤ 60 caracteres; `descripcion` ≤ 155.
  2. `intro`: directa al punto — el problema del lector y cómo la domótica lo resuelve.
  3. `secciones`: 2–3 H2 de desarrollo técnico (cómo funciona por debajo: protocolos Zigbee / Matter / WiFi /
     Thread, topologías de red, latencia, lógica de automatización) + las secciones prácticas para Latinoamérica.
  4. `ventajas` y `desventajas`: honestas; si algo satura la red o tiene riesgos de seguridad, dilo.
  5. `faq`: al menos 3 preguntas con respuestas cortas y directas (salen como fragmento enriquecido en Google).
  6. `veredicto`: `perfiles` (qué perfil de lector debería comprar qué producto del catálogo) y `alternativa`.
  7. `fuentes`: todas las fuentes usadas.
- Las reglas de contenido de arriba siguen mandando: cada dato técnico con su fuente, sin precios exactos.

## Dónde va cada cosa

- `data/productos.json` — catálogo. Copia la estructura de un producto de la misma categoría.
  Compatibilidad permitida: `si`, `no`, `via-hub`, `via-matter`, `parcial`, `algunos-modelos`, `sin-confirmar`.
  Categorías existentes: `enchufe`, `bombilla`, `sensor`, `hub`, `interruptor`. Para crear una categoría
  nueva también hay que añadir en `scripts/catalogo.js` sus filas (`FILAS_CATEGORIA`), su icono (`ICONOS`)
  y su dibujo (`ILUSTRACIONES`), y su color en `public/assets/catalogo.css` (`--c-<categoría>` y `.k-<categoría>`).
  El build falla si faltan las filas, el icono o el dibujo.
- `data/guias.json` — guías prácticas (`/articulos-editoriales/<slug>`), con la estructura del estilo editorial
  de arriba. Las genera `scripts/guias.js`, que valida longitudes, las 3 recomendaciones y las expresiones prohibidas.
- `data/comparativas.json` — artículos "X vs Y". Cada uno: `slug`, `titulo`, `tituloCorto`, `descripcion`,
  `actualizado` (AAAA-MM-DD), `productos` (2–4 slugs que existan en el catálogo), `intro`, `secciones`,
  `veredicto` (perfil → producto del catálogo → motivo) y `faq`. Unas 900–1300 palabras.
  `tituloCorto` se usa como título para Google: máximo 60 caracteres. `descripcion`: máximo 155 caracteres
  (la plantilla recorta lo que pase de ahí, pero es mejor escribirla completa dentro del límite).
- `scripts/paginas.js` — aviso legal, privacidad, nosotros, contacto y 404 (textos fijos).
- `public/analytics.js` — aviso de cookies: Google Analytics solo se carga si el visitante acepta. No añadas
  etiquetas de Google Analytics directamente en las páginas.
- `scripts/portada.js` — la selección destacada de la portada (no hace falta tocarla cada semana).
- `docs/plan-contenido.md` — lista de temas pendientes.

## Diseño (sistema "Vitrina Obsidian")

- Una sola hoja de estilos para todo el sitio: `public/assets/catalogo.css`. Claro = blanco sobre blanco
  (capas separadas por sombra); oscuro = negro sobre negro (borde de 1 px tenue). 90 % neutro y **un solo
  acento azul**; verde, ámbar y rojo solo para estados (compatible / atención / no compatible), nunca para decorar.
- Letras: Sora (títulos y cifras), IBM Plex Sans (texto) e IBM Plex Mono (datos en filas), desde Google Fonts.
- Iconos con `icono('nombre')` y dibujos de producto con `ilustracion('<categoría>')` (los dos en
  `scripts/catalogo.js`). **Sin emojis** como iconos y **sin fotos** de fabricantes.
- Piezas reutilizables: `tarjetaProducto()`, `fila()` (lista agrupada), `pila()` (miniaturas) y `estado()`.
- **Sin estilos ni scripts en línea** (atributos `style`, `<style>`, `onclick`…): la CSP de `public/_headers`
  los bloquea. Los comportamientos van en archivos de `public/assets/`.
- El contenido nuevo (productos, comparativas, guías) no necesita tocar el diseño: la plantilla lo aplica sola.

## Antes de abrir un pull request

1. `npm run build` debe terminar sin errores (valida datos, slugs y compatibilidades).
2. Un pull request por tarea, en una rama `contenido/AAAA-MM-DD-tema`.
3. En la descripción del pull request: qué se añadió, en lenguaje sencillo; la lista de **fuentes**
   usadas para cada producto o dato; y qué conviene revisar.
4. Marca el tema como hecho en `docs/plan-contenido.md` dentro del mismo pull request.
