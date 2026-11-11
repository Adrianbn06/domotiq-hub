/**
 * scripts/comparativas.js - Genera los artículos "X vs Y" a partir de data/comparativas.json
 *
 *  - public/comparativas/index.html     listado
 *  - public/comparativas/<slug>.html    un artículo por comparativa
 *
 * La tabla técnica sale de data/productos.json (la misma fuente que las fichas),
 * así que nunca se contradicen. Todo el texto pasa por esc().
 * En intro, secciones, veredicto y faq se puede usar **negrita** y [enlace interno](/ruta), como en las guías.
 */

import fs from 'fs';
import path from 'path';
import { esc, fmt, plano, pagina, fichaTecnica, fichaCompat, PRECIO, AVISO_AFILIADOS, tituloSeo, icono, tarjetaProducto, fila, pila, masAfines, sigueLeyendo, guiaAfin, comparativaAfin } from './catalogo.js';

const SITE_URL = 'https://www.ofertasdomoticas.com';

export function leerComparativas(root) {
  const f = path.join(root, 'data', 'comparativas.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).comparativas : [];
}

function tablaComparativa(prods) {
  const filas = prods.map((p) => [...fichaTecnica(p), ...fichaCompat(p), { label: 'Precio orientativo', text: PRECIO[p.precio].text }]);
  const etiquetas = [];
  filas.forEach((fs_) => fs_.forEach((f) => { if (!etiquetas.includes(f.label)) etiquetas.push(f.label); }));

  const cuerpo = etiquetas.map((label) => {
    const celdas = filas.map((fs_) => fs_.find((f) => f.label === label) || { text: '—' });
    const distintas = new Set(celdas.map((c) => c.text)).size > 1;
    return `<tr${distintas ? ' class="diff"' : ''}><th scope="row">${esc(label)}</th>${celdas.map((c) => `<td${c.cls ? ` class="${c.cls}"` : ''}>${esc(c.text)}</td>`).join('')}</tr>`;
  }).join('\n');

  return `<div class="table-wrap"><table class="cmp">
<thead><tr><th scope="col">Característica</th>${prods.map((p) => `<th scope="col"><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></th>`).join('')}</tr></thead>
<tbody>
${cuerpo}
</tbody></table></div>
<p class="legend"><span></span>Filas resaltadas: los productos se diferencian en esa característica.</p>`;
}

function paginaComparativa(c, porSlug, cats, guias, comparativas) {
  const err = (m) => { throw new Error(`Comparativa ${c.slug}: ${m}`); };
  for (const k of ['slug', 'titulo', 'tituloCorto', 'descripcion', 'actualizado']) if (!c[k]) err(`falta "${k}"`);
  // Google corta el título a ~60 caracteres y la descripción a ~155: mejor fallar que publicarla cortada
  if (c.tituloCorto.length > 60) err(`tituloCorto tiene ${c.tituloCorto.length} caracteres (máximo 60)`);
  if (c.descripcion.length > 155) err(`descripcion tiene ${c.descripcion.length} caracteres (máximo 155)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.actualizado)) err('"actualizado" en formato AAAA-MM-DD');
  const afinesGuias = masAfines(c.productos, guias.map(guiaAfin), 3, porSlug);
  const afinesComp = masAfines(c.productos, comparativas.filter((o) => o.slug !== c.slug).map(comparativaAfin), 2, porSlug);
  const prods = c.productos.map((s) => {
    if (!porSlug[s]) throw new Error(`Comparativa ${c.slug}: el producto "${s}" no existe`);
    return porSlug[s];
  });
  for (const v of c.veredicto) {
    if (!porSlug[v.producto]) throw new Error(`Comparativa ${c.slug}: veredicto con producto inexistente "${v.producto}"`);
  }
  const enComparador = prods.slice(0, 3).map((p) => p.slug).join(',');

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/comparativas/">Comparativas</a> › ${esc(c.tituloCorto)}</div>
<article class="article">
<h1>${esc(c.titulo)}</h1>
<p class="muted small">Actualizado el ${esc(c.actualizado)} · Especificaciones verificadas en fuentes de los fabricantes</p>
${c.intro.map((t) => `<p class="lead">${fmt(t)}</p>`).join('\n')}

<h2>Resumen rápido</h2>
<div class="group">
${c.veredicto.map((v) => fila({ href: `/productos/${v.producto}`, antetitulo: plano(v.perfil), titulo: porSlug[v.producto].nombre, sub: plano(v.motivo), inicio: pila([porSlug[v.producto].categoria]) })).join('\n')}
</div>

<h2>Los productos de un vistazo</h2>
<div class="grid">
${prods.map((p) => tarjetaProducto(p, cats)).join('\n')}
</div>

<h2>Tabla comparativa</h2>
${tablaComparativa(prods)}
<p class="links-list"><a class="btn secondary" href="/comparar#p=${esc(enComparador)}">${icono('columnas')}Abrir en el comparador interactivo</a></p>

${c.secciones.map((s) => `<h2>${fmt(s.titulo)}</h2>\n${s.parrafos.map((t) => `<p>${fmt(t)}</p>`).join('\n')}`).join('\n\n')}

<h2>¿Cuál elegir?</h2>
<div class="grid">
${c.veredicto.map((v) => `<div class="card"><div class="card-body"><p class="eyebrow">${fmt(v.perfil)}</p><h3><a href="/productos/${esc(v.producto)}">${esc(porSlug[v.producto].nombre)}</a></h3><p>${fmt(v.motivo)}</p></div></div>`).join('\n')}
</div>

<h2>Preguntas frecuentes</h2>
${c.faq.map((f) => `<details class="faq"><summary>${fmt(f.p)}</summary><p>${fmt(f.r)}</p></details>`).join('\n')}

${sigueLeyendo([
    ...afinesGuias.map((g) => fila({ href: `/articulos-editoriales/${g.slug}`, antetitulo: 'Guía', titulo: g.titulo, icono: 'libro' })),
    ...afinesComp.map((o) => fila({ href: `/comparativas/${o.slug}`, antetitulo: 'Comparativa', titulo: o.titulo, icono: 'balanza' })),
  ])}
</article>
${AVISO_AFILIADOS}`;

  const organizacion = { '@type': 'Organization', name: 'OfertasDomoticas.com', url: SITE_URL };
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: c.titulo,
      description: c.descripcion,
      datePublished: c.publicado || c.actualizado,
      dateModified: c.actualizado,
      inLanguage: 'es',
      image: `${SITE_URL}/og-image.png`,
      author: organizacion,
      publisher: organizacion,
      mainEntityOfPage: `${SITE_URL}/comparativas/${c.slug}`,
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: plano(f.p), acceptedAnswer: { '@type': 'Answer', text: plano(f.r) } })),
    },
  ].map((o) => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');

  return pagina({
    title: tituloSeo(c.tituloCorto),
    description: c.descripcion,
    canonical: `/comparativas/${c.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/'], [c.tituloCorto, `/comparativas/${c.slug}`]],
    tipo: 'article',
    publicado: c.publicado || c.actualizado,
    modificado: c.actualizado,
    body,
  }).replace('</head>', `${ld}\n</head>`);
}

function paginaIndice(comparativas, porSlug) {
  const body = `<div class="bc"><a href="/">Inicio</a> › Comparativas</div>
<p class="eyebrow">Comparativas</p>
<h1>Comparativas de domótica</h1>
<p class="lead">Comparaciones escritas para decidir entre productos parecidos, pensando en lo que importa en Latinoamérica: voltaje y clavija de tu país, si necesitas hub y si funcionan sin internet. ¿Quieres comparar otros productos? Usa el <a href="/comparar">comparador interactivo</a>.</p>
<div class="group lista-articulos">
${comparativas.map((c) => fila({ href: `/comparativas/${c.slug}`, titulo: c.titulo, sub: c.descripcion, inicio: pila(c.productos.filter((s) => porSlug[s]).map((s) => porSlug[s].categoria)) })).join('\n')}
</div>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Comparativas de domótica para Latinoamérica'),
    description: 'Sonoff vs Tuya, hubs Zigbee, relés con o sin neutro y focos inteligentes: comparativas pensadas para el voltaje y las tiendas de Latinoamérica.',
    canonical: '/comparativas/',
    modificado: comparativas.map((c) => c.actualizado).sort().pop(),
    breadcrumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/']],
    body,
  });
}

export function generarComparativas(root) {
  const comparativas = leerComparativas(root);
  const { productos, categorias } = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const porSlug = Object.fromEntries(productos.map((p) => [p.slug, p]));
  const outDir = path.join(root, 'public', 'comparativas');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const fGuias = path.join(root, 'data', 'guias.json');
  const guias = fs.existsSync(fGuias) ? JSON.parse(fs.readFileSync(fGuias, 'utf8')).guias : [];
  for (const c of comparativas) {
    fs.writeFileSync(path.join(outDir, `${c.slug}.html`), paginaComparativa(c, porSlug, categorias, guias, comparativas), 'utf8');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), paginaIndice(comparativas, porSlug), 'utf8');
  console.log(`⚖️  Comparativas: ${comparativas.length} artículos`);
}
