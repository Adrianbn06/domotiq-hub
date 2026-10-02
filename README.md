# OfertasDomoticas.com

Guías, catálogo y comparador de domótica práctica para Latinoamérica.
Sitio 100 % estático publicado en Cloudflare Workers (static assets): cada merge en `main` se publica solo.

## Estructura

| Ruta | Qué es |
|---|---|
| `data/productos.json` | Catálogo de productos (fuente de verdad). Especificaciones verificadas en fuentes del fabricante. |
| `data/tiendas.json` | Tiendas y códigos de afiliado. Cambiar aquí el `afiliado` actualiza todos los enlaces. |
| `scripts/catalogo.js` | Genera `/productos/`, una ficha por producto y `/comparar`. |
| `scripts/build.js` | Build completo: catálogo + datos de la portada + `sitemap.xml`. |
| `public/` | Lo que se publica. `public/productos/`, `public/comparar.html` y `public/data/` se generan en el build. |
| `public/_headers` | Cabeceras de seguridad (CSP estricta en catálogo y comparador). |
| `wrangler.jsonc` | Configuración de Cloudflare Workers. |

## Añadir o editar un producto

1. Edita `data/productos.json` (copia un producto parecido como plantilla).
2. Ejecuta `npm run build`: valida los datos y falla si falta algo obligatorio.
3. Abre un pull request; al hacer merge se publica.

Valores de compatibilidad permitidos: `si`, `no`, `via-hub`, `via-matter`, `parcial`, `algunos-modelos`, `sin-confirmar`.
Precio: `1` = menos de 15 USD, `2` = 15–40 USD, `3` = más de 40 USD (orientativo, nunca precios exactos inventados).

## Probar en local

```bash
npm run build
```

Después sirve la carpeta `public/` con cualquier servidor estático.
