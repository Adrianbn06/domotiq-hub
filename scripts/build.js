/**
 * scripts/build.js - Prepara el sitio estático antes de publicar
 *
 *  - Genera el catálogo de productos y el comparador (scripts/catalogo.js)
 *  - Genera las comparativas "X vs Y" (scripts/comparativas.js)
 *  - Genera las guías prácticas (scripts/guias.js)
 *  - Pone la cabecera y el pie actuales a las páginas antiguas escritas a mano (scripts/legado.js)
 *  - Genera la portada a partir del catálogo y las guías (scripts/portada.js)
 *  - Genera public/sitemap.xml con todas las páginas indexables
 *
 * Sin dependencias: corre igual en Vercel, Cloudflare Pages o en local.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generarCatalogo } from './catalogo.js';
import { generarPortada } from './portada.js';
import { generarComparativas } from './comparativas.js';
import { generarPaginas } from './paginas.js';
import { generarGuias } from './guias.js';
import { actualizarLegado } from './legado.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://www.ofertasdomoticas.com';

// ─── SITEMAP ──────────────────────────────────────────────────────────────────
function listHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function toUrl(file) {
  const rel = path.relative(PUBLIC_DIR, file).split(path.sep).join('/');
  if (rel === 'index.html') return `${SITE_URL}/`;
  if (rel.endsWith('/index.html')) return `${SITE_URL}/${rel.slice(0, -'index.html'.length)}`;
  // URLs limpias: /glosario.html se publica como /glosario
  return `${SITE_URL}/${rel.slice(0, -'.html'.length)}`;
}

// Fecha real del contenido (dateModified o datePublished del JSON-LD). La fecha del archivo
// cambia en cada build y Google deja de fiarse de un lastmod que siempre es "hoy"; sin fecha, se omite.
function contentDate(html) {
  const m = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function generateSitemap() {
  const pages = listHtmlFiles(PUBLIC_DIR)
    .filter(file => path.basename(file) !== '404.html')
    .map(file => ({ file, html: fs.readFileSync(file, 'utf8') }))
    .filter(({ html }) => !/<meta name="robots" content="[^"]*noindex/.test(html))
    .map(({ file, html }) => ({ loc: toUrl(file), lastmod: contentDate(html) }))
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.loc}</loc>${p.lastmod ? `
    <lastmod>${p.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`🗺️  Sitemap: ${pages.length} URLs`);
}

generarCatalogo(ROOT);
generarComparativas(ROOT);
generarGuias(ROOT);
actualizarLegado(ROOT);
generarPaginas(ROOT);
generarPortada(ROOT);
generateSitemap();
