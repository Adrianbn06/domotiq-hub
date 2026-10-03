/**
 * scripts/guias.js - Genera las guías prácticas a partir de data/guias.json
 *
 *  - public/articulos-editoriales/<slug>.html   una página por guía
 *  - public/articulos-editoriales/index.html    listado (guías de data/guias.json + artículos
 *                                               escritos a mano que ya estén en esa carpeta)
 *
 * Los productos relacionados salen de data/productos.json. Todo el texto pasa por esc().
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, badges, AVISO_AFILIADOS, tituloSeo, recortar } from './catalogo.js';

const SITE_URL = 'https://www.ofertasdomoticas.com';
const DIR = 'articulos-editoriales';

export function leerGuias(root) {
  const f = path.join(root, 'data', 'guias.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).guias : [];
}

function paginaGuia(g, porSlug) {
  const rel = (g.productos || []).map((s) => {
    if (!porSlug[s]) throw new Error(`Guía ${g.slug}: el producto "${s}" no existe`);
    return porSlug[s];
  });

  const secciones = g.secciones.map((s) => {
    const lista = s.lista ? `<${s.ordenada ? 'ol' : 'ul'}>\n${s.lista.map((t) => `<li>${esc(t)}</li>`).join('\n')}\n</${s.ordenada ? 'ol' : 'ul'}>` : '';
    const aviso = s.aviso ? `<div class="box"><p><strong>${esc(s.aviso)}</strong></p></div>` : '';
    return `<h2>${esc(s.titulo)}</h2>\n${(s.parrafos || []).map((t) => `<p>${esc(t)}</p>`).join('\n')}\n${lista}\n${aviso}`;
  }).join('\n\n');

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/${DIR}/">Guías</a> › ${esc(g.tituloCorto)}</div>
<article class="article">
<h1>${esc(g.titulo)}</h1>
<p class="muted small">Publicado el ${esc(g.publicado)} · Actualizado el ${esc(g.actualizado)} · Datos revisados en fuentes de los fabricantes</p>
${g.intro.map((t) => `<p class="lead">${esc(t)}</p>`).join('\n')}

${secciones}

${rel.length ? `<h2>Productos del catálogo mencionados</h2>
<div class="grid">
${rel.map((p) => `<div class="card"><h3><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></h3><div class="badges">${badges(p)}</div><p>${esc(p.idealPara)}</p></div>`).join('\n')}
</div>` : ''}

<h2>Preguntas frecuentes</h2>
${g.faq.map((f) => `<details class="faq"><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('\n')}

${g.fuentes?.length ? `<h2>Fuentes</h2>
<ul class="small">
${g.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="noopener nofollow">${esc(f.texto)}</a></li>`).join('\n')}
</ul>` : ''}
</article>
${AVISO_AFILIADOS}`;

  const url = `${SITE_URL}/${DIR}/${g.slug}`;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: g.titulo, description: g.descripcion,
      datePublished: g.publicado, dateModified: g.actualizado, inLanguage: 'es',
      author: { '@type': 'Organization', name: 'OfertasDomoticas.com', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'OfertasDomoticas.com', url: SITE_URL },
      mainEntityOfPage: url,
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
    },
  ].map((o) => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');

  return pagina({
    title: tituloSeo(g.tituloCorto),
    description: g.descripcion,
    canonical: `/${DIR}/${g.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Guías', `/${DIR}/`], [g.tituloCorto, `/${DIR}/${g.slug}`]],
    body,
  }).replace('</head>', `${ld}\n</head>`);
}

// Lee título y descripción de una página ya escrita (guías generadas y artículos a mano)
function resumenDe(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const titulo = dec((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/\s*[|—–]\s*OfertasDomoticas(\.com)?\s*$/i, '').trim();
  const desc = dec((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  return { titulo, desc };
}

function paginaIndice(dir) {
  const items = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .map((f) => ({ slug: f.replace(/\.html$/, ''), ...resumenDe(path.join(dir, f)) }));
  const body = `<div class="bc"><a href="/">Inicio</a> › Guías</div>
<h1>Guías de domótica para Latinoamérica</h1>
<p class="lead">Guías prácticas con datos revisados en fuentes de los fabricantes: voltaje y clavija de tu país, qué necesitas de verdad y qué errores evitar. ¿Prefieres comparar productos? Mira las <a href="/comparativas/">comparativas</a>.</p>
<div class="guides">
${items.map((i) => `<a class="guide" href="/${DIR}/${esc(i.slug)}"><strong>${esc(i.titulo)}</strong><span class="muted small">${esc(recortar(i.desc))}</span></a>`).join('\n')}
</div>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Guías de domótica para Latinoamérica'),
    description: 'Guías prácticas de domótica para Latinoamérica: cómo empezar, voltaje y clavija, protocolos y qué comprar, con datos verificados.',
    canonical: `/${DIR}/`,
    breadcrumbs: [['Inicio', '/'], ['Guías', `/${DIR}/`]],
    body,
  });
}

export function generarGuias(root) {
  const guias = leerGuias(root);
  const { productos } = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const porSlug = Object.fromEntries(productos.map((p) => [p.slug, p]));
  const dir = path.join(root, 'public', DIR);
  fs.mkdirSync(dir, { recursive: true });
  const slugs = new Set();
  for (const g of guias) {
    if (slugs.has(g.slug)) throw new Error(`Guía duplicada: ${g.slug}`);
    slugs.add(g.slug);
    fs.writeFileSync(path.join(dir, `${g.slug}.html`), paginaGuia(g, porSlug), 'utf8');
  }
  fs.writeFileSync(path.join(dir, 'index.html'), paginaIndice(dir), 'utf8');
  console.log(`📖 Guías: ${guias.length} generadas (índice con ${fs.readdirSync(dir).filter((f) => f.endsWith('.html')).length - 1} artículos)`);
}
