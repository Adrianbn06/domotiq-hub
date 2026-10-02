/**
 * scripts/comparativas.js - Genera los artículos "X vs Y" a partir de data/comparativas.json
 *
 *  - public/comparativas/index.html     listado
 *  - public/comparativas/<slug>.html    un artículo por comparativa
 *
 * La tabla técnica sale de data/productos.json (la misma fuente que las fichas),
 * así que nunca se contradicen. Todo el texto pasa por esc().
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, badges, fichaTecnica, fichaCompat, PRECIO, AVISO_AFILIADOS, tituloSeo } from './catalogo.js';

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

function paginaComparativa(c, porSlug) {
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
${c.intro.map((t) => `<p class="lead">${esc(t)}</p>`).join('\n')}

<div class="box verdict-box">
  <h2 class="h-inline">Resumen rápido</h2>
  <ul class="verdict">
${c.veredicto.map((v) => `    <li><strong>${esc(v.perfil)}:</strong> <a href="/productos/${esc(v.producto)}">${esc(porSlug[v.producto].nombre)}</a>. <span class="muted">${esc(v.motivo)}</span></li>`).join('\n')}
  </ul>
</div>

<h2>Los productos de un vistazo</h2>
<div class="grid">
${prods.map((p) => `<div class="card"><h3><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></h3><div class="badges">${badges(p)}</div><p>${esc(p.idealPara)}</p></div>`).join('\n')}
</div>

<h2>Tabla comparativa</h2>
${tablaComparativa(prods)}
<p class="small"><a class="btn secondary" href="/comparar?p=${esc(enComparador)}">Abrir en el comparador interactivo</a></p>

${c.secciones.map((s) => `<h2>${esc(s.titulo)}</h2>\n${s.parrafos.map((t) => `<p>${esc(t)}</p>`).join('\n')}`).join('\n\n')}

<h2>¿Cuál elegir?</h2>
<div class="grid">
${c.veredicto.map((v) => `<div class="card"><span class="card-top"><span>${esc(v.perfil)}</span></span><h3><a href="/productos/${esc(v.producto)}">${esc(porSlug[v.producto].nombre)}</a></h3><p>${esc(v.motivo)}</p></div>`).join('\n')}
</div>

<h2>Preguntas frecuentes</h2>
${c.faq.map((f) => `<details class="faq"><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('\n')}
</article>
${AVISO_AFILIADOS}`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: c.titulo,
    description: c.descripcion,
    dateModified: c.actualizado,
    inLanguage: 'es',
    mainEntityOfPage: `${SITE_URL}/comparativas/${c.slug}`,
    publisher: { '@type': 'Organization', name: 'OfertasDomoticas.com', url: SITE_URL },
  };

  return pagina({
    title: tituloSeo(c.tituloCorto),
    description: c.descripcion,
    canonical: `/comparativas/${c.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/'], [c.tituloCorto, `/comparativas/${c.slug}`]],
    body,
  }).replace('</head>', `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
}

function paginaIndice(comparativas) {
  const body = `<div class="bc"><a href="/">Inicio</a> › Comparativas</div>
<h1>Comparativas de domótica</h1>
<p class="lead">Comparaciones escritas para decidir entre productos parecidos, pensando en lo que importa en Latinoamérica: voltaje y clavija de tu país, si necesitas hub y si funcionan sin internet. ¿Quieres comparar otros productos? Usa el <a href="/comparar">comparador interactivo</a>.</p>
<div class="guides">
${comparativas.map((c) => `<a class="guide" href="/comparativas/${esc(c.slug)}"><strong>${esc(c.titulo)}</strong><span class="muted small">${esc(c.descripcion)}</span></a>`).join('\n')}
</div>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Comparativas de domótica para Latinoamérica'),
    description: 'Sonoff vs Tuya, hubs Zigbee, relés con o sin neutro y focos inteligentes: comparativas pensadas para el voltaje y las tiendas de Latinoamérica.',
    canonical: '/comparativas/',
    breadcrumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/']],
    body,
  });
}

export function generarComparativas(root) {
  const comparativas = leerComparativas(root);
  const { productos } = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const porSlug = Object.fromEntries(productos.map((p) => [p.slug, p]));
  const outDir = path.join(root, 'public', 'comparativas');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const c of comparativas) {
    fs.writeFileSync(path.join(outDir, `${c.slug}.html`), paginaComparativa(c, porSlug), 'utf8');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), paginaIndice(comparativas), 'utf8');
  console.log(`⚖️  Comparativas: ${comparativas.length} artículos`);
}
