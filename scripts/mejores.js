/**
 * scripts/mejores.js - Guías de compra por red eléctrica a partir de data/mejores.json
 *
 *  - public/mejores/index.html     listado
 *  - public/mejores/<slug>.html    "Mejores <categoría> para 110 V / 220 V"
 *
 * El texto editorial (intro, selección por perfil, secciones y preguntas) está en data/mejores.json.
 * La tabla con todos los productos que sirven en esa red, y la lista de los que no, salen solas de
 * data/productos.json con la misma regla que "Tu país" (tipoRed): al añadir un producto, aparece aquí.
 *
 * El build falla si un producto de la selección no existe, no es de la categoría o no sirve en esa red,
 * si el título o la descripción son demasiado largos, o si aparece una expresión prohibida.
 */

import fs from 'fs';
import path from 'path';
import {
  esc, fmt, plano, pagina, tituloSeo, icono, fila, pila, tarjetaProducto, tipoRed, estado, fichaTecnica, fichaCompat,
  PRECIO, PAISES, AVISO_AFILIADOS, masAfines, comparativaAfin, guiaAfin, recortar,
} from './catalogo.js';
import { PROHIBIDAS } from './guias.js';

const SITE_URL = 'https://www.ofertasdomoticas.com';
const DIR = 'mejores';

const RED = {
  110: { texto: '110–127 V', otra: '220' },
  220: { texto: '220–240 V', otra: '110' },
};

// Columnas de la tabla por categoría: etiquetas de fichaTecnica / fichaCompat
const COLUMNAS = {
  enchufe: ['Voltaje', 'Clavija', 'Carga máxima', 'Mide consumo', 'Hub necesario', 'Matter', 'Apple Home'],
  bombilla: ['Voltaje', 'Rosca', 'Luminosidad', 'Color', 'Hub necesario', 'Matter', 'Apple Home'],
};

export function leerMejores(root) {
  const f = path.join(root, 'data', 'mejores.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).paginas : [];
}

// ¿Sirve este producto en esta red? Misma regla que la portada y "Tu país"
export function sirveEnRed(p, red) {
  const tipo = tipoRed(p);
  return tipo === 'independiente' || tipo === 'universal' || tipo === 'versiones' || p.voltajes.includes(red);
}

const paisesDeRed = (red) => PAISES.filter((x) => x[4] === red);

function validar(m, porSlug, cats) {
  const err = (t) => { throw new Error(`Guía de compra ${m.slug}: ${t}`); };
  for (const k of ['slug', 'categoria', 'red', 'titulo', 'tituloCorto', 'descripcion', 'actualizado']) if (!m[k]) err(`falta "${k}"`);
  if (!cats[m.categoria]) err(`categoría desconocida "${m.categoria}"`);
  if (!COLUMNAS[m.categoria]) err(`falta la tabla de la categoría "${m.categoria}" en COLUMNAS (scripts/mejores.js)`);
  if (!RED[m.red]) err('"red" debe ser "110" o "220"');
  if (m.tituloCorto.length > 60) err(`tituloCorto tiene ${m.tituloCorto.length} caracteres (máximo 60)`);
  if (m.descripcion.length > 155) err(`descripcion tiene ${m.descripcion.length} caracteres (máximo 155)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.actualizado)) err('"actualizado" en formato AAAA-MM-DD');
  if (!m.seleccion?.length) err('falta la selección');
  if (!m.faq || m.faq.length < 3) err('hacen falta al menos 3 preguntas frecuentes');
  for (const s of m.seleccion) {
    const p = porSlug[s.producto];
    if (!p) err(`el producto "${s.producto}" no existe en el catálogo`);
    if (p.categoria !== m.categoria) err(`"${s.producto}" no es de la categoría ${m.categoria}`);
    if (!sirveEnRed(p, m.red)) err(`"${s.producto}" no sirve en redes de ${RED[m.red].texto}`);
  }
  const texto = JSON.stringify(m).toLowerCase();
  for (const w of PROHIBIDAS) if (texto.includes(w)) err(`usa la expresión prohibida "${w}"`);
  if (/\bprobamos\b|nuestras pruebas/.test(texto.replace(/no de pruebas propias/g, ''))) err('no digas "probamos": la selección sale de las fichas de los fabricantes');
}

function tabla(m, prods) {
  const cols = COLUMNAS[m.categoria];
  const celda = (p, label) => [...fichaTecnica(p), ...fichaCompat(p)].find((f) => f.label === label) || { text: '—' };
  return `<div class="table-wrap"><table class="cmp">
<thead><tr><th scope="col">Producto</th>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}<th scope="col">Precio orientativo</th></tr></thead>
<tbody>
${prods.map((p) => `<tr><th scope="row"><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></th>${cols.map((c) => {
    const f = celda(p, c);
    // Los textos largos (versiones por país) se acortan: el detalle completo está en la ficha
    return `<td>${f.cls ? estado(f.cls, f.text) : esc(recortar(f.text, 60))}</td>`;
  }).join('')}<td>${esc(PRECIO[p.precio].text)}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function paginaMejores(m, todas, data, comparativas, guias) {
  const { productos, categorias: cats } = data;
  const porSlug = Object.fromEntries(productos.map((p) => [p.slug, p]));
  validar(m, porSlug, cats);
  const red = RED[m.red];
  const deCategoria = productos.filter((p) => p.categoria === m.categoria);
  const sirven = deCategoria.filter((p) => sirveEnRed(p, m.red));
  const noSirven = deCategoria.filter((p) => !sirveEnRed(p, m.red));
  const elegidos = m.seleccion.map((s) => ({ ...s, p: porSlug[s.producto] }));
  const gemela = todas.find((o) => o.categoria === m.categoria && o.red === red.otra);
  const otras = todas.filter((o) => o.slug !== m.slug && o.red === m.red);
  const slugs = elegidos.map((e) => e.p.slug);
  const afinesComp = masAfines(slugs, comparativas.map(comparativaAfin), 2, porSlug);
  const afinesGuias = masAfines(slugs, guias.map(guiaAfin), 2, porSlug);

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/${DIR}/">Guías de compra</a> › ${esc(m.tituloCorto)}</div>
<article class="article">
<p class="eyebrow">Guía de compra · ${esc(red.texto)}</p>
<h1>${esc(m.titulo)}</h1>
<p class="muted small">Actualizado el ${esc(m.actualizado)} · Elegidos por las especificaciones de los fabricantes, sin precios exactos</p>
${m.intro.map((t) => `<p class="lead">${fmt(t)}</p>`).join('\n')}

<h2 id="resumen">Resumen rápido</h2>
<div class="group">
${elegidos.map((e) => fila({ href: `/productos/${e.p.slug}`, antetitulo: e.perfil, titulo: e.p.nombre, sub: PRECIO[e.p.precio].text, inicio: pila([e.p.categoria]) })).join('\n')}
</div>

<h2 id="seleccion">Nuestra selección, explicada</h2>
<div class="grid">
${elegidos.map((e) => tarjetaProducto(e.p, cats, { texto: `${e.perfil}. ${plano(e.motivo)}` })).join('\n')}
</div>

<h2 id="tabla">Todos los modelos del catálogo que sirven para ${esc(red.texto)} <span class="cuenta">${sirven.length}</span></h2>
${tabla(m, sirven)}
<p class="legend">Los que tienen versiones por país sirven solo si compras la versión de tu red y tu clavija: revisa su ficha.</p>

${(m.secciones || []).map((s) => `<h2>${fmt(s.titulo)}</h2>
${(s.parrafos || []).map((t) => `<p>${fmt(t)}</p>`).join('\n')}${s.tabla ? `
<div class="table-wrap"><table>
<thead><tr>${s.tabla.columnas.map((c) => `<th scope="col">${fmt(c)}</th>`).join('')}</tr></thead>
<tbody>
${s.tabla.filas.map((f) => `<tr>${f.map((c) => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></div>` : ''}`).join('\n\n')}

${noSirven.length ? `<h2 id="no-sirven">No son para redes de ${esc(red.texto)}</h2>
<p>Están hechos solo para ${esc(RED[red.otra].texto)}. Los listamos para que no los compres por error.${gemela ? ` Si tu red es de ${esc(RED[red.otra].texto)}, mira <a href="/${DIR}/${esc(gemela.slug)}">${esc(gemela.tituloCorto)}</a>.` : ''}</p>
<div class="group">
${noSirven.map((p) => fila({ href: `/productos/${p.slug}`, titulo: p.nombre, sub: p.voltaje, inicio: pila([p.categoria]) })).join('\n')}
</div>` : ''}

<h2 id="preguntas-frecuentes">Preguntas frecuentes</h2>
${m.faq.map((f) => `<details class="faq"><summary>${fmt(f.p)}</summary><p>${fmt(f.r)}</p></details>`).join('\n')}

<h2 id="tu-pais">Tu país</h2>
<p>${paisesDeRed(m.red).map((x) => `<a href="/paises/${esc(x[5])}">${esc(x[0])}</a>`).join(' · ')}${m.red === '220' ? ' · <a href="/paises/brasil">Brasil</a> (127 o 220 V según la ciudad)' : ''}</p>

<h2 id="sigue-leyendo">Sigue leyendo</h2>
<div class="group">
${otras.map((o) => fila({ href: `/${DIR}/${o.slug}`, antetitulo: 'Guía de compra', titulo: o.tituloCorto, icono: 'bolsa' })).join('\n')}
${afinesComp.map((o) => fila({ href: `/comparativas/${o.slug}`, antetitulo: 'Comparativa', titulo: o.titulo, icono: 'balanza' })).join('\n')}
${afinesGuias.map((o) => fila({ href: `/articulos-editoriales/${o.slug}`, antetitulo: 'Guía', titulo: o.titulo, icono: 'libro' })).join('\n')}
</div>

<h2 id="fuentes">Fuentes</h2>
<p class="small">Cada dato sale de la ficha del producto en nuestro catálogo, donde están las fuentes del fabricante: ${elegidos.map((e) => `<a href="/productos/${esc(e.p.slug)}">${esc(e.p.nombre)}</a>`).join(' · ')}. Clavijas por país: WorldStandards. No mostramos precios exactos porque cambian a diario; el rango es orientativo.</p>
</article>
${AVISO_AFILIADOS}`;

  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList', name: m.tituloCorto,
      itemListElement: elegidos.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.p.nombre, url: `${SITE_URL}/productos/${e.p.slug}` })),
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: m.faq.map((f) => ({ '@type': 'Question', name: plano(f.p), acceptedAnswer: { '@type': 'Answer', text: plano(f.r) } })),
    },
  ].map((o) => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');

  return pagina({
    title: tituloSeo(m.tituloCorto),
    description: m.descripcion,
    canonical: `/${DIR}/${m.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Guías de compra', `/${DIR}/`], [m.tituloCorto, `/${DIR}/${m.slug}`]],
    tipo: 'article',
    publicado: m.actualizado,
    modificado: m.actualizado,
    body,
  }).replace('</head>', `${ld}\n</head>`);
}

function paginaIndice(todas, data) {
  const cats = data.categorias;
  const body = `<div class="bc"><a href="/">Inicio</a> › Guías de compra</div>
<p class="eyebrow">Guías de compra</p>
<h1>Qué comprar según el voltaje de tu país</h1>
<p class="lead">Los mejores enchufes y focos inteligentes de nuestro catálogo, separados por red eléctrica: 110–127 V (México, Centroamérica, Colombia, Ecuador, Venezuela) y 220–240 V (Perú, Chile, Argentina, Bolivia, Uruguay, Paraguay). Elegidos por las especificaciones de los fabricantes, sin precios exactos.</p>
<div class="group lista-articulos">
${todas.map((m) => fila({ href: `/${DIR}/${m.slug}`, antetitulo: RED[m.red].texto, titulo: m.tituloCorto, sub: m.descripcion, inicio: pila([m.categoria]) })).join('\n')}
</div>
<p class="muted small nota-datos">¿No sabes qué voltaje usa tu país? Míralo en <a href="/paises/">domótica por país</a>. Categorías: ${[...new Set(todas.map((m) => m.categoria))].map((c) => esc(cats[c].nombre)).join(', ')}.</p>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Guías de compra de domótica por voltaje'),
    description: 'Los mejores enchufes y focos inteligentes para redes de 110 V y de 220 V en Latinoamérica, elegidos por las especificaciones de los fabricantes.',
    canonical: `/${DIR}/`,
    breadcrumbs: [['Inicio', '/'], ['Guías de compra', `/${DIR}/`]],
    modificado: todas.map((m) => m.actualizado).sort().pop(),
    body,
  });
}

export function generarMejores(root) {
  const todas = leerMejores(root);
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const fComp = path.join(root, 'data', 'comparativas.json');
  const comparativas = fs.existsSync(fComp) ? JSON.parse(fs.readFileSync(fComp, 'utf8')).comparativas : [];
  const fGuias = path.join(root, 'data', 'guias.json');
  const guias = fs.existsSync(fGuias) ? JSON.parse(fs.readFileSync(fGuias, 'utf8')).guias : [];
  const outDir = path.join(root, 'public', DIR);
  fs.rmSync(outDir, { recursive: true, force: true });
  if (!todas.length) return;
  fs.mkdirSync(outDir, { recursive: true });
  const slugs = new Set();
  for (const m of todas) {
    if (slugs.has(m.slug)) throw new Error(`Guía de compra duplicada: ${m.slug}`);
    slugs.add(m.slug);
    fs.writeFileSync(path.join(outDir, `${m.slug}.html`), paginaMejores(m, todas, data, comparativas, guias), 'utf8');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), paginaIndice(todas, data), 'utf8');
  console.log(`🛍️  Guías de compra: ${todas.length} páginas`);
}
