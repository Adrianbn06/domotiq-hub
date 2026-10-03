/**
 * scripts/guias.js - Genera las guías a partir de data/guias.json
 *
 *  - public/articulos-editoriales/<slug>.html   una página por guía
 *  - public/articulos-editoriales/index.html    listado (guías de data/guias.json + artículos
 *                                               escritos a mano que ya estén en esa carpeta)
 *
 * Estructura de cada guía (la misma del prompt editorial, ver CLAUDE.md):
 *   intro → secciones técnicas (H2 con bloques) → ventajas y desventajas → preguntas frecuentes
 *   → veredicto por perfil → fuentes.
 *
 * Bloques de una sección: { p }, { h3 }, { lista, ordenada? }, { tabla: { columnas, filas } },
 * { nota } (recuadro 💡), { aviso } (recuadro ⚠), { oferta: "<slug del catálogo>", motivo }.
 * Cada guía lleva exactamente 3 bloques "oferta" (los antiguos [INSERTAR_OFERTA]).
 * En los textos se puede usar **negrita** y [enlace interno](/ruta).
 *
 * Todo el texto pasa por esc() antes de aplicar ese formato mínimo.
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, badges, AVISO_AFILIADOS, tituloSeo, recortar, icono, ilustracion, fila } from './catalogo.js';

// La etiqueta de una guía puede traer un emoji delante: el diseño usa iconos, no emojis
const sinEmoji = (t) => String(t).replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '');

const SITE_URL = 'https://www.ofertasdomoticas.com';
const DIR = 'articulos-editoriales';
const OFERTAS_POR_GUIA = 3;
const PROHIBIDAS = ['en conclusión', 'en el vertiginoso mundo', 'hoy en día', 'en resumen'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function leerGuias(root) {
  const f = path.join(root, 'data', 'guias.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).guias : [];
}

// **negrita** y [texto](/ruta-interna), después de escapar
function fmt(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

// Texto plano para JSON-LD y para contar palabras
function plano(t) {
  return String(t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '$1');
}

function idDe(t) {
  return plano(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

function validar(g, porSlug) {
  const err = (m) => { throw new Error(`Guía ${g.slug}: ${m}`); };
  for (const k of ['slug', 'titulo', 'tituloCorto', 'descripcion', 'publicado', 'actualizado']) if (!g[k]) err(`falta "${k}"`);
  if (g.tituloCorto.length > 60) err(`tituloCorto tiene ${g.tituloCorto.length} caracteres (máximo 60)`);
  if (g.descripcion.length > 155) err(`descripcion tiene ${g.descripcion.length} caracteres (máximo 155)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.publicado) || !/^\d{4}-\d{2}-\d{2}$/.test(g.actualizado)) err('fechas en formato AAAA-MM-DD');
  if (!g.secciones?.length) err('faltan secciones');
  if (!g.ventajas?.length || !g.desventajas?.length) err('faltan ventajas o desventajas');
  if (!g.faq || g.faq.length < 3) err('hacen falta al menos 3 preguntas frecuentes');
  if (!g.veredicto?.perfiles?.length) err('falta el veredicto por perfil');
  const ofertas = g.secciones.flatMap((s) => s.bloques).filter((b) => b.oferta);
  if (ofertas.length !== OFERTAS_POR_GUIA) err(`tiene ${ofertas.length} bloques "oferta" (deben ser ${OFERTAS_POR_GUIA})`);
  for (const s of [...ofertas.map((b) => b.oferta), ...g.veredicto.perfiles.map((p) => p.producto).filter(Boolean)]) {
    if (!porSlug[s]) err(`el producto "${s}" no existe en el catálogo`);
  }
  const texto = JSON.stringify(g).toLowerCase();
  for (const w of PROHIBIDAS) if (texto.includes(w)) err(`usa la expresión prohibida "${w}"`);
}

function bloque(b, porSlug) {
  if (b.p) return `<p>${fmt(b.p)}</p>`;
  if (b.h3) return `<h3>${fmt(b.h3)}</h3>`;
  if (b.lista) {
    const tag = b.ordenada ? 'ol' : 'ul';
    return `<${tag}>\n${b.lista.map((t) => `<li>${fmt(t)}</li>`).join('\n')}\n</${tag}>`;
  }
  if (b.tabla) {
    return `<div class="table-wrap"><table>
<thead><tr>${b.tabla.columnas.map((c) => `<th scope="col">${fmt(c)}</th>`).join('')}</tr></thead>
<tbody>
${b.tabla.filas.map((f) => `<tr>${f.map((c) => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table></div>`;
  }
  if (b.nota) return `<div class="highlight con-icono">${icono('bombilla')}<div>${fmt(b.nota)}</div></div>`;
  if (b.aviso) return `<div class="warning con-icono">${icono('alerta')}<div>${fmt(b.aviso)}</div></div>`;
  if (b.oferta) {
    const p = porSlug[b.oferta];
    return `<div class="product-card">
  <a class="stage pc-stage k-${esc(p.categoria)}" href="/productos/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${ilustracion(p.categoria)}</a>
  <div class="pc-body">
    <span class="product-badge">${icono('bolsa')}En nuestro catálogo</span>
    <p class="product-name"><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></p>
    <div class="badges">${badges(p)}</div>
    <p>${fmt(b.motivo || p.idealPara)}</p>
  </div>
  <a href="/productos/${esc(p.slug)}" class="btn sm">Ver ficha y dónde comprar${icono('chev-r')}</a>
</div>`;
  }
  throw new Error(`Bloque desconocido: ${JSON.stringify(b).slice(0, 80)}`);
}

function minutosLectura(g) {
  const palabras = plano(JSON.stringify([g.intro, g.secciones, g.ventajas, g.desventajas, g.faq, g.veredicto]))
    .split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

function paginaGuia(g, porSlug) {
  validar(g, porSlug);
  const indice = [
    ...g.secciones.map((s) => [idDe(s.titulo), s.titulo]),
    ['ventajas-y-desventajas', 'Ventajas y desventajas'],
    ['preguntas-frecuentes', 'Preguntas frecuentes'],
    ['veredicto', g.veredicto.titulo || 'Veredicto: ¿para quién es?'],
  ];

  const secciones = g.secciones.map((s) => `<h2 id="${idDe(s.titulo)}">${fmt(s.titulo)}</h2>
${s.bloques.map((b) => bloque(b, porSlug)).join('\n')}`).join('\n\n');

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/${DIR}/">Guías</a> › ${esc(g.tituloCorto)}</div>
<article class="article guia">
<span class="article-badge">${icono('brujula')}${esc(sinEmoji(g.etiqueta || 'Guía práctica'))} · ${esc(g.actualizado.slice(0, 4))}</span>
<h1>${esc(g.titulo)}</h1>
<div class="meta">
  <span>${icono('lapiz')}Equipo OfertasDomoticas</span>
  <span>${icono('calendario')}${esc(fechaLarga(g.publicado))}</span>
  <span>${icono('actualizado')}Actualizado el ${esc(fechaLarga(g.actualizado))}</span>
  <span>${icono('reloj')}${minutosLectura(g)} min de lectura</span>
</div>
${g.intro.map((t) => `<p class="lead">${fmt(t)}</p>`).join('\n')}

<nav class="toc" aria-label="Tabla de contenidos">
  <p class="toc-title">Tabla de contenidos</p>
  <ol>
${indice.map(([id, t]) => `    <li><a href="#${id}">${fmt(t)}</a></li>`).join('\n')}
  </ol>
</nav>

${secciones}

<h2 id="ventajas-y-desventajas">Ventajas y desventajas</h2>
<div class="proscons">
  <div><h3>Ventajas</h3><div class="group">
${g.ventajas.map((t) => `<div class="fila"><span class="ib ok">${icono('check')}</span><span class="fila-t"><strong>${fmt(t)}</strong></span></div>`).join('\n')}
  </div></div>
  <div><h3>Desventajas</h3><div class="group">
${g.desventajas.map((t) => `<div class="fila"><span class="ib bad">${icono('x')}</span><span class="fila-t"><strong>${fmt(t)}</strong></span></div>`).join('\n')}
  </div></div>
</div>

<h2 id="preguntas-frecuentes">Preguntas frecuentes</h2>
${g.faq.map((f) => `<details class="faq"><summary>${fmt(f.p)}</summary><p>${fmt(f.r)}</p></details>`).join('\n')}

<h2 id="veredicto">${fmt(g.veredicto.titulo || 'Veredicto: ¿para quién es?')}</h2>
${g.veredicto.intro ? `<p>${fmt(g.veredicto.intro)}</p>` : ''}
<div class="profile-grid">
${g.veredicto.perfiles.map((p) => `  <div class="profile-card">
    <p class="profile-title">${fmt(p.perfil)}</p>
    <p>${fmt(p.texto)}</p>${p.producto ? `
    <a href="/productos/${esc(p.producto)}">Ver ${esc(porSlug[p.producto].nombre)}</a>` : ''}
  </div>`).join('\n')}
</div>
${g.veredicto.alternativa ? `<div class="highlight con-icono">${icono('bombilla')}<div><strong>Mejor alternativa:</strong> ${fmt(g.veredicto.alternativa)}</div></div>` : ''}

${g.fuentes?.length ? `<h2 id="fuentes">Fuentes</h2>
<ul class="small">
${g.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="noopener nofollow">${esc(f.texto)}</a></li>`).join('\n')}
</ul>` : ''}

<div class="cta-box">
  <p>¿Quieres ver más opciones con voltaje, clavija y compatibilidad revisados?</p>
  <div class="links-list"><a href="/productos/" class="btn">Ver el catálogo</a><a href="/comparar" class="btn secondary">${icono('columnas')}Comparar productos</a></div>
</div>
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
      mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: plano(f.p), acceptedAnswer: { '@type': 'Answer', text: plano(f.r) } })),
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
<p class="eyebrow">Guías</p>
<h1>Guías de domótica para Latinoamérica</h1>
<p class="lead">Guías prácticas con datos revisados en fuentes de los fabricantes: voltaje y clavija de tu país, qué necesitas de verdad y qué errores evitar. ¿Prefieres comparar productos? Mira las <a href="/comparativas/">comparativas</a>.</p>
<div class="group lista-articulos">
${items.map((i) => fila({ href: `/${DIR}/${i.slug}`, titulo: i.titulo, sub: recortar(i.desc), icono: 'libro' })).join('\n')}
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
