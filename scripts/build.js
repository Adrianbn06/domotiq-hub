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
import { comprobarSeguridad } from './seguridad.js';

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
  const m = html.match(/<meta property="og:updated_time" content="(\d{4}-\d{2}-\d{2})/)
    || html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
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

// ─── FORMATO SIN CONVERTIR ────────────────────────────────────────────────────
// Un **texto** o [texto](/ruta) que llega tal cual a la página significa que la plantilla de ese
// campo no aplica fmt(): el lector vería los asteriscos y corchetes. Mejor fallar aquí que publicarlo.
function comprobarFormato() {
  const crudo = /\*\*[^*\s][^*]*?\*\*|\[[^\]]+\]\(\/[^)\s]*\)/;
  const malos = listHtmlFiles(PUBLIC_DIR).flatMap(file => {
    const html = fs.readFileSync(file, 'utf8').replace(/<script\b[\s\S]*?<\/script>/g, '');
    const m = html.match(crudo);
    return m ? [`${path.relative(PUBLIC_DIR, file)}: "${m[0]}"`] : [];
  });
  if (malos.length) {
    throw new Error(`Formato sin convertir (se vería tal cual en la web):\n  ${malos.join('\n  ')}`);
  }
}

// ─── ENLACES INTERNOS ─────────────────────────────────────────────────────────
// Cada enlace interno debe llevar a una página que existe y con su dirección exacta: un enlace a
// /productos (sin la barra final) o a /glosario.html funciona, pero pasa por una redirección, y uno
// mal escrito da 404. Las dos cosas le restan a la página ante Google: mejor fallar aquí.
function comprobarEnlaces() {
  const archivos = listHtmlFiles(PUBLIC_DIR);
  const rutas = new Set(archivos.map((f) => toUrl(f).slice(SITE_URL.length)));
  const malos = [];
  for (const file of archivos) {
    const html = fs.readFileSync(file, 'utf8').replace(/<script\b[\s\S]*?<\/script>/g, '');
    for (const m of html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/g)) {
      const ruta = m[1].replace(/&amp;/g, '&').split('#')[0].split('?')[0];
      if (rutas.has(ruta)) continue;
      if (fs.existsSync(path.join(PUBLIC_DIR, ruta)) && fs.statSync(path.join(PUBLIC_DIR, ruta)).isFile()) continue;
      const pista = rutas.has(`${ruta}/`) ? ` (¿quisiste decir ${ruta}/ ?)` : rutas.has(ruta.replace(/\.html$/, '')) ? ' (sin .html)' : '';
      malos.push(`${path.relative(PUBLIC_DIR, file)}: ${m[1]}${pista}`);
    }
  }
  if (malos.length) throw new Error(`Enlaces internos rotos o con redirección:\n  ${[...new Set(malos)].join('\n  ')}`);
}

generarCatalogo(ROOT);
generarComparativas(ROOT);
generarGuias(ROOT);
actualizarLegado(ROOT);
generarPaginas(ROOT);
generarPortada(ROOT);
comprobarFormato();
comprobarEnlaces();
comprobarSeguridad(PUBLIC_DIR);
generateSitemap();
