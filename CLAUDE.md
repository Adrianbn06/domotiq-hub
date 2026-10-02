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

## Dónde va cada cosa

- `data/productos.json` — catálogo. Copia la estructura de un producto de la misma categoría.
  Compatibilidad permitida: `si`, `no`, `via-hub`, `via-matter`, `parcial`, `algunos-modelos`, `sin-confirmar`.
  Categorías existentes: `enchufe`, `bombilla`, `sensor`, `hub`, `interruptor`. Para crear una categoría
  nueva también hay que añadir sus filas en `FILAS_CATEGORIA` de `scripts/catalogo.js`.
- `data/comparativas.json` — artículos "X vs Y". Cada uno: `slug`, `titulo`, `tituloCorto`, `descripcion`,
  `actualizado` (AAAA-MM-DD), `productos` (2–4 slugs que existan en el catálogo), `intro`, `secciones`,
  `veredicto` (perfil → producto del catálogo → motivo) y `faq`. Unas 900–1300 palabras.
- `scripts/portada.js` — la selección destacada de la portada (no hace falta tocarla cada semana).
- `docs/plan-contenido.md` — lista de temas pendientes.

## Antes de abrir un pull request

1. `npm run build` debe terminar sin errores (valida datos, slugs y compatibilidades).
2. Un pull request por tarea, en una rama `contenido/AAAA-MM-DD-tema`.
3. En la descripción del pull request: qué se añadió, en lenguaje sencillo; la lista de **fuentes**
   usadas para cada producto o dato; y qué conviene revisar.
4. Marca el tema como hecho en `docs/plan-contenido.md` dentro del mismo pull request.
