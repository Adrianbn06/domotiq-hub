/**
 * scripts/portada.js - Genera la portada (public/index.html) a partir del catálogo y las guías
 *
 * La selección de productos y las comparativas destacadas se editan en las constantes de abajo.
 * Las guías se leen solas de public/articulos-editoriales/ y de las páginas pilar.
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, badges, PRECIO, AVISO_AFILIADOS } from './catalogo.js';
import { leerComparativas } from './comparativas.js';

// ─── CONTENIDO EDITABLE ───────────────────────────────────────────────────────
const SELECCION = [
  ['sonoff-s26r2', 'El enchufe WiFi más barato, con versión para la clavija de casi cada país.'],
  ['tapo-l535e', 'Foco de color con Matter y 1100 lm para países de 110–120 V.'],
  ['tapo-l530e', 'La misma idea para países de 220–240 V.'],
  ['sonoff-snzb-04p', 'Sensor de puerta Zigbee con pila de más de 5 años.'],
  ['aqara-hub-m3', 'El hub más completo: Zigbee, Thread y Matter en uno.'],
  ['sonoff-minir4', 'Automatiza las luces sin cambiar tu interruptor de pared.'],
];

const COMPARATIVAS = [
  ['¿Quieres medir el consumo eléctrico?', ['sonoff-s31', 'tapo-p115', 'kasa-ep25']],
  ['Focos de color para 110 V: económico o premium', ['wiz-a19-color', 'tapo-l535e', 'philips-hue-white-color-a19']],
  ['Sensores de puerta: Aqara o Sonoff', ['aqara-sensor-puerta-t1', 'sonoff-snzb-04p']],
  ['¿Qué hub Zigbee elijo?', ['sonoff-zbbridge-p', 'aqara-hub-m2', 'aqara-hub-m3']],
  ['Relés: con neutro, sin neutro o 100 % local', ['sonoff-minir4', 'sonoff-zbmini-l2', 'shelly-1-gen4']],
];

const RUTAS = [
  ['📶', 'Sin hub, solo WiFi', 'Lo más fácil: enchufes y focos que se configuran con el celular en 5 minutos. Ideal para empezar.', '/productos/?proto=wifi&sinhub=1', 'Ver productos WiFi sin hub'],
  ['🕸️', 'Con Zigbee', 'Sensores a pilas que duran años y una red que no satura tu WiFi. Necesitas un hub o coordinador.', '/productos/?proto=zigbee', 'Ver productos Zigbee'],
  ['🏠', 'Con Home Assistant', 'Control 100 % local, sin depender de la nube ni de una marca. Requiere un equipo encendido en casa.', '/productos/sonoff-zbdongle-e', 'Ver el coordinador USB'],
];

// Voltaje y clavijas habituales (IEC). Varía en algunas zonas: confírmalo en tu casa.
const PAISES = [
  ['México', '127 V', 'A, B'], ['Centroamérica y Rep. Dominicana', '120 V', 'A, B'],
  ['Colombia', '120 V', 'A, B'], ['Venezuela', '120 V', 'A, B'], ['Ecuador', '120 V', 'A, B'],
  ['Perú', '220 V', 'A, B, C'], ['Bolivia', '220 V', 'A, B, C'], ['Chile', '220 V', 'C, L'],
  ['Argentina', '220 V', 'C, I'], ['Uruguay', '220 V', 'C, F, I, L'], ['Paraguay', '220 V', 'C'],
  ['Brasil', '127 V o 220 V según la ciudad', 'C, N'],
];

const GUIAS = [
  'articulos-editoriales/que-es-la-domotica-como-empezar-menos-50.html',
  'articulos-editoriales/zigbee-vs-zwave-vs-wifi-2026.html',
  'alexa-vs-google-home-vs-homekit.html',
  'articulos-editoriales/matter-1-4-estandar-unifica-smart-home-2026.html',
];

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function leerGuia(root, rel) {
  const html = fs.readFileSync(path.join(root, 'public', rel), 'utf8');
  const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const titulo = dec((html.match(/<title>([^<]*)<\/title>/) || [])[1] || rel)
    .replace(/\s*[|—–]\s*OfertasDomoticas\.com\s*$/i, '').trim();
  const desc = dec((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  return { url: '/' + rel.replace(/\.html$/, ''), titulo, desc };
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export function generarPortada(root) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const porSlug = Object.fromEntries(data.productos.map((p) => [p.slug, p]));
  const usar = (slug) => {
    if (!porSlug[slug]) throw new Error(`Portada: el producto "${slug}" no existe en data/productos.json`);
    return porSlug[slug];
  };

  const categorias = Object.entries(data.categorias).map(([id, c]) => {
    const n = data.productos.filter((p) => p.categoria === id).length;
    return `<a class="tile" href="/productos/?cat=${esc(id)}">
    <span class="tile-icon">${esc(c.icono)}</span>
    <strong>${esc(c.nombre)}</strong>
    <span class="muted small">${n} productos</span>
  </a>`;
  }).join('\n');

  const seleccion = SELECCION.map(([slug, motivo]) => {
    const p = usar(slug);
    return `<article class="card">
  <div class="card-top"><span>${esc(data.categorias[p.categoria].icono)} ${esc(data.categorias[p.categoria].singular)}</span><span class="price" title="Rango de precio orientativo">${esc(PRECIO[p.precio].corto)}</span></div>
  <h3><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></h3>
  <div class="badges">${badges(p)}</div>
  <p>${esc(motivo)}</p>
  <div class="card-actions"><a href="/productos/${esc(p.slug)}">Ver ficha →</a></div>
</article>`;
  }).join('\n');

  const comparativas = COMPARATIVAS.map(([titulo, slugs]) => {
    const nombres = slugs.map((s) => usar(s).nombre).join(' vs ');
    return `<li><a href="/comparar?p=${slugs.map(esc).join(',')}"><strong>${esc(titulo)}</strong><span class="muted small">${esc(nombres)}</span></a></li>`;
  }).join('\n');

  const articulos = leerComparativas(root).map((c) => `<a class="guide" href="/comparativas/${esc(c.slug)}">
  <strong>${esc(c.titulo)}</strong>
  <span class="muted small">${esc(c.descripcion)}</span>
</a>`).join('\n');

  const guias = GUIAS.map((rel) => leerGuia(root, rel)).map((g) => `<a class="guide" href="${esc(g.url)}">
  <strong>${esc(g.titulo)}</strong>
  <span class="muted small">${esc(g.desc)}</span>
</a>`).join('\n');

  const rutas = RUTAS.map(([icono, titulo, texto, href, cta]) => `<div class="box path">
  <span class="tile-icon">${icono}</span>
  <h3>${esc(titulo)}</h3>
  <p class="muted small">${esc(texto)}</p>
  <a href="${esc(href)}">${esc(cta)} →</a>
</div>`).join('\n');

  const body = `<section class="hero">
  <p class="eyebrow">Domótica práctica para Latinoamérica</p>
  <h1>Haz tu casa inteligente sin comprar algo que no funcione en tu país</h1>
  <p class="lead">Fichas con especificaciones verificadas, un comparador y guías pensadas para redes de 110 V y 220 V, y para comprar en AliExpress o Amazon con envío a Latinoamérica.</p>
  <div class="hero-cta">
    <a class="btn" href="/productos/">Ver el catálogo (${data.productos.length} productos)</a>
    <a class="btn secondary" href="/comparar">Comparar productos</a>
  </div>
  <div class="volt-picker" role="group" aria-label="Elige el voltaje de tu país">
    <span class="muted small">¿Qué voltaje usa tu país?</span>
    <a class="chip-link" href="/productos/?volt=110">110–120 V<span>México, Centroamérica, Colombia, Ecuador, Venezuela</span></a>
    <a class="chip-link" href="/productos/?volt=220">220–240 V<span>Perú, Chile, Argentina, Bolivia, Uruguay, Paraguay</span></a>
  </div>
</section>

<h2>¿Por dónde empiezo?</h2>
<div class="paths">
${rutas}
</div>
<p class="small muted">¿Primera vez? Lee <a href="/articulos-editoriales/que-es-la-domotica-como-empezar-menos-50">qué es la domótica y cómo empezar con menos de 50 USD</a>.</p>

<h2>Explora por categoría</h2>
<div class="tiles">
${categorias}
</div>

<h2>Nuestra selección para empezar</h2>
<p class="lead small">Productos con buena relación calidad-precio y disponibles con envío a Latinoamérica. Revisa siempre la versión de voltaje antes de comprar.</p>
<div class="grid">
${seleccion}
</div>

<h2>Comparativas a fondo</h2>
<div class="guides">
${articulos}
</div>
<p class="small"><a href="/comparativas/">Ver todas las comparativas →</a></p>

<h2>Compara al instante</h2>
<p class="lead small">Abre el comparador con estas combinaciones o elige tus propios productos.</p>
<ul class="cmp-list">
${comparativas}
</ul>

<h2>Guías</h2>
<div class="guides">
${guias}
</div>
<p class="small"><a href="/articulos-editoriales/">Ver todas las guías →</a> · <a href="/glosario">Glosario de domótica →</a></p>

<h2>Voltaje y clavija por país</h2>
<p class="lead small">Lo primero que hay que mirar antes de comprar un enchufe, foco o relé. Son los valores habituales: confírmalos en tu casa.</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">País</th><th scope="col">Voltaje</th><th scope="col">Clavijas habituales</th></tr></thead>
<tbody>
${PAISES.map(([pais, v, c]) => `<tr><td>${esc(pais)}</td><td>${esc(v)}</td><td>${esc(c)}</td></tr>`).join('\n')}
</tbody></table></div>

<h2>Cómo trabajamos</h2>
<div class="box">
  <p class="small">Las especificaciones salen de las fichas de los fabricantes y de las tiendas, y marcamos como «sin confirmar» lo que no pudimos verificar. No inventamos precios ni descuentos: los precios cambian a diario, así que te enviamos a la tienda para verlos. Más detalles en <a href="/nosotros">quiénes somos</a>.</p>
</div>
${AVISO_AFILIADOS}`;

  const html = pagina({
    title: 'OfertasDomoticas.com: domótica práctica para Latinoamérica',
    description: `Elige enchufes, focos, sensores y hubs inteligentes que funcionen en tu país (110 V o 220 V). ${data.productos.length} productos verificados, comparador y guías de domótica en español.`,
    canonical: '/',
    body,
  });
  // JSON-LD del sitio (solo datos, no se ejecuta)
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OfertasDomoticas.com',
    url: 'https://www.ofertasdomoticas.com/',
    inLanguage: 'es',
    description: 'Domótica práctica para Latinoamérica: catálogo, comparador y guías.',
  })}</script>`;
  fs.writeFileSync(path.join(root, 'public', 'index.html'), html.replace('</head>', `  ${ld}\n</head>`), 'utf8');
  console.log('🏠 Portada generada');
}
