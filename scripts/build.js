/**
 * scripts/build.js - Prepara el sitio estático antes de publicar
 *
 *  - Copia data/content.json y data/archive.json a public/data/ (las páginas los leen con fetch)
 *  - Genera public/sitemap.xml con todas las páginas indexables
 *
 * Sin dependencias: corre igual en Vercel, Cloudflare Pages o en local.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITE_URL = 'https://www.ofertasdomoticas.com';

// ─── DATOS ────────────────────────────────────────────────────────────────────
function copyData() {
  const outDir = path.join(PUBLIC_DIR, 'data');
  fs.mkdirSync(outDir, { recursive: true });

  const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'content.json'), 'utf8'));
  fs.writeFileSync(path.join(outDir, 'content.json'), JSON.stringify(content), 'utf8');

  // El antiguo endpoint /api/archive devolvía los items ordenados del más reciente al más antiguo
  const archive = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'archive.json'), 'utf8'));
  archive.items.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  fs.writeFileSync(path.join(outDir, 'archive.json'), JSON.stringify(archive), 'utf8');

  console.log(`📦 Datos copiados: ${content.items.length} items actuales, ${archive.items.length} archivados`);
}

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
  return `${SITE_URL}/${rel}`;
}

function generateSitemap() {
  const pages = listHtmlFiles(PUBLIC_DIR)
    .filter(file => path.basename(file) !== '404.html')
    .filter(file => !/<meta name="robots" content="[^"]*noindex/.test(fs.readFileSync(file, 'utf8')))
    .map(file => ({ loc: toUrl(file), lastmod: fs.statSync(file).mtime.toISOString().split('T')[0] }))
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`🗺️  Sitemap: ${pages.length} URLs`);
}

copyData();
generateSitemap();
