/**
 * scripts/portada.js - Genera la portada (public/index.html) a partir del catálogo y las guías
 *
 * La selección de productos y las comparativas destacadas se editan en las constantes de abajo.
 * Las guías se leen solas de public/articulos-editoriales/ y de las páginas pilar.
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, AVISO_AFILIADOS, icono, ilustracion, focoColgante, tarjetaProducto, fila, pila, recortar, PAISES } from './catalogo.js';
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

// [dibujo (categoría), icono, nivel, título, texto, enlace, texto del enlace]
const RUTAS = [
  ['enchufe', 'wifi', 'Fácil', 'Sin hub, solo WiFi', 'Lo más fácil: enchufes y focos que se configuran con el celular en 5 minutos. Ideal para empezar.', '/productos/?proto=wifi&sinhub=1', 'Ver productos WiFi sin hub'],
  ['sensor', 'red', 'Intermedio', 'Con Zigbee', 'Sensores a pilas que duran años y una red que no satura tu WiFi. Necesitas un hub o coordinador.', '/productos/?proto=zigbee', 'Ver productos Zigbee'],
  ['hub', 'casa', 'Avanzado', 'Con Home Assistant', 'Control 100 % local, sin depender de la nube ni de una marca. Requiere un equipo encendido en casa.', '/productos/sonoff-zbdongle-e', 'Ver el coordinador USB'],
];

// El foco del escenario nocturno: uno por cada red (pais.js cambia al de 220 V si tu país lo es)
const FOCOS = { 110: 'tapo-l535e', 220: 'tapo-l530e' };

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
    .replace(/\s*[|—–]\s*OfertasDomoticas(\.com)?\s*$/i, '').trim();
  const desc = dec((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  return { url: '/' + rel.replace(/\.html$/, ''), titulo, desc };
}

const cabezaSeccion = (titulo, texto, enlace) => `<div class="sec-head">
  <div><h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}</div>
  ${enlace ? `<a class="mas" href="${esc(enlace[0])}">${esc(enlace[1])}${icono('chev-r')}</a>` : ''}
</div>`;

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export function generarPortada(root) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const porSlug = Object.fromEntries(data.productos.map((p) => [p.slug, p]));
  const usar = (slug) => {
    if (!porSlug[slug]) throw new Error(`Portada: el producto "${slug}" no existe en data/productos.json`);
    return porSlug[slug];
  };
  const comparativasArt = leerComparativas(root);
  const guias = GUIAS.map((rel) => leerGuia(root, rel));
  const foco = usar(FOCOS[110]);
  const foco220 = usar(FOCOS[220]);
  const nombreFoco = (p) => `${p.nombre.replace(/\s*\(.*?\)/g, '')}: blancos de 2500 a 6500 K`;
  const sirven = (g) => data.productos.filter((p) => !p.voltajes?.length || p.voltajes.includes(g)).length;

  const categorias = Object.entries(data.categorias).map(([id, c]) => {
    const n = data.productos.filter((p) => p.categoria === id).length;
    return `<a class="tile tinte k-${esc(id)}" href="/productos/?cat=${esc(id)}">
    <span class="dibujo">${ilustracion(id)}</span>
    <strong>${esc(c.nombre)}</strong>
    <span><span class="num">${n}</span> productos</span>
  </a>`;
  }).join('\n');

  const seleccion = SELECCION.map(([slug, motivo]) => tarjetaProducto(usar(slug), data.categorias, { texto: motivo })).join('\n');

  const comparaciones = COMPARATIVAS.map(([titulo, slugs]) => {
    const prods = slugs.map(usar);
    return fila({ href: `/comparar?p=${slugs.join(',')}`, titulo, sub: prods.map((p) => p.nombre).join(' vs '), inicio: pila(prods.map((p) => p.categoria)) });
  }).join('\n');

  const articulos = comparativasArt.map((c) => fila({
    href: `/comparativas/${c.slug}`, titulo: c.tituloCorto, sub: recortar(c.descripcion, 110),
    inicio: pila(c.productos.filter((s) => porSlug[s]).map((s) => porSlug[s].categoria)),
  })).join('\n');

  const listaGuias = guias.map((g) => fila({ href: g.url, titulo: g.titulo, sub: recortar(g.desc, 110), icono: 'libro' })).join('\n');

  const rutas = RUTAS.map(([dibujo, ic, nivel, titulo, texto, href, cta]) => `<article class="path tinte k-${dibujo}">
  <span class="nivel">${icono(ic)}${esc(nivel)}</span>
  <div><h3>${esc(titulo)}</h3><p>${esc(texto)}</p><a class="mas" href="${esc(href)}">${esc(cta)}${icono('chev-r')}</a></div>
  <div class="dibujo">${ilustracion(dibujo)}</div>
</article>`).join('\n');

  const mapa = PAISES.map(([pais, codigo, v, clavijas, g]) => {
    const href = g === 'br' ? '/productos/' : `/productos/?volt=${g}`;
    return `<a class="vt" href="${href}" data-elegir-pais="${codigo}"><span class="n"><i class="dot g${g}"></i>${esc(pais)}</span><span><span class="cifra${g === 'br' ? ' sm' : ''}">${esc(v)}<small> V</small></span><span class="pl">Clavija ${esc(clavijas)}${g === 'br' ? ' · según la ciudad' : ''}</span></span></a>`;
  }).join('\n');

  const body = `<section class="hero">
  <div>
    <p class="eyebrow">Domótica práctica · Latinoamérica</p>
    <h1>Domótica que funciona en <button type="button" class="h1-pais" data-abrir-pais aria-label="Elegir tu país"><span data-pais-nombre>tu país</span>${icono('chev-d')}</button>.</h1>
    <p class="lead">Fichas con especificaciones verificadas, comparativas honestas y guías para redes de 110 V y 220 V. Sin precios inventados: te llevamos a AliExpress o Amazon para verlos.</p>
    <div class="volt-card" data-sirven-110="${sirven('110')}" data-sirven-220="${sirven('220')}" data-total="${data.productos.length}">
      <p class="eyebrow">¿Qué voltaje usa tu país?</p>
      <div class="volt-opts">
        <a class="volt-opt" href="/productos/?volt=110" data-grupo="110"><span class="v">110–127<small> V</small></span><span>México, Centroamérica, Colombia, Ecuador, Venezuela</span>${icono('chev-r', 'chev')}</a>
        <a class="volt-opt" href="/productos/?volt=220" data-grupo="220"><span class="v">220<small> V</small></span><span>Perú, Chile, Argentina, Bolivia, Uruguay, Paraguay</span>${icono('chev-r', 'chev')}</a>
      </div>
      <p class="sirven" data-sirven hidden></p>
    </div>
    <div class="hero-cta">
      <a class="btn" href="/productos/">Ver el catálogo</a>
      <a class="btn secondary" href="/comparar">Comparar productos</a>
    </div>
    <dl class="strip">
      <div><dt>Productos</dt><dd>${data.productos.length}</dd></div>
      <div><dt>Comparativas</dt><dd>${comparativasArt.length}</dd></div>
      <div><dt>Guías</dt><dd>${guias.length}</dd></div>
      <div><dt>Países</dt><dd>${PAISES.length}</dd></div>
    </dl>
  </div>
  <figure class="noche" data-foco-220-nombre="${esc(nombreFoco(foco220))}" data-foco-220-url="/productos/${esc(foco220.slug)}" data-foco-220-red="${esc(foco220.voltaje.replace(/,.*$/, ''))}">
    ${focoColgante()}
    <figcaption>
      <div class="noche-fila">
        <div><p class="eyebrow">Del catálogo · <span data-foco-red>${esc(foco.voltaje.replace(/,.*$/, ''))}</span></p><strong data-foco-nombre>${esc(nombreFoco(foco))}</strong></div>
        <a href="/productos/${esc(foco.slug)}" data-foco-url>Ver ficha${icono('chev-r')}</a>
      </div>
      <div class="noche-controles" data-foco-controles hidden>
        <div class="noche-fila">
          <span class="kout" data-kout>2700 K · luz cálida</span>
          <button type="button" class="sw" role="switch" aria-checked="true" aria-label="Encender o apagar el foco" data-foco-sw></button>
        </div>
        <input class="kel" type="range" min="2500" max="6500" step="100" value="2700" aria-label="Temperatura de color, en kelvin" data-foco-k>
        <div class="kscale"><span>2500 K</span><span>6500 K</span></div>
      </div>
    </figcaption>
  </figure>
</section>

<section class="sec" aria-labelledby="h-empezar">
<div class="sec-head"><div><h2 id="h-empezar">Empieza por aquí</h2><p>Tres caminos, de lo más fácil a lo más completo. ¿Primera vez? Lee <a href="/articulos-editoriales/que-es-la-domotica-como-empezar-menos-50">qué es la domótica y cómo empezar con menos de 50 USD</a>.</p></div></div>
<div class="paths">
${rutas}
</div>
<div class="callout warn aviso-elec">${icono('alerta')}<p>Relés e interruptores van conectados a la instalación eléctrica de tu casa. Si no tienes experiencia, contrata a un electricista.</p></div>
</section>

<section class="sec" aria-labelledby="h-catalogo">
${cabezaSeccion('El catálogo', `${data.productos.length} productos con fichas verificadas, ordenados por categoría.`, ['/productos/', `Ver los ${data.productos.length} productos`]).replace('<h2>', '<h2 id="h-catalogo">')}
<div class="tiles">
${categorias}
</div>
<div class="sub-h"><h3>Nuestra selección para empezar</h3><span class="muted small">Revisa siempre la versión de voltaje antes de comprar.</span></div>
<div class="grid tres">
${seleccion}
</div>
</section>

<section class="sec" aria-labelledby="h-comparar">
${cabezaSeccion('Compara en un toque', 'Abre el comparador con estas combinaciones o elige tus propios productos.', ['/comparar', 'Abrir el comparador']).replace('<h2>', '<h2 id="h-comparar">')}
<div class="group">
${comparaciones}
</div>
</section>

<section class="sec dos-col">
  <div>
${cabezaSeccion('Comparativas a fondo', 'Escritas a mano, con los contras de cada producto.', ['/comparativas/', 'Ver todas'])}
    <div class="group">
${articulos}
    </div>
  </div>
  <div>
${cabezaSeccion('Guías', 'Para entender antes de comprar.', ['/articulos-editoriales/', 'Ver todas'])}
    <div class="group">
${listaGuias}
    </div>
    <p class="muted small nota-datos"><a href="/glosario">Glosario de domótica</a>: los términos explicados en sencillo.</p>
  </div>
</section>

<section class="sec" aria-labelledby="h-paises">
<div class="sec-head"><div><h2 id="h-paises">Voltaje y clavija por país</h2><p>Lo primero que hay que mirar antes de comprar un enchufe, foco o relé. Son los valores habituales: confírmalos en tu casa.</p></div></div>
<div class="leyenda"><span><i class="dot g110"></i>110–127 V</span><span><i class="dot g220"></i>220 V</span><span><i class="dot gbr"></i>Depende de la ciudad</span></div>
<div class="vmap">
${mapa}
</div>
</section>

<section class="sec" aria-labelledby="h-trabajo">
<div class="sec-head"><div><h2 id="h-trabajo">Cómo trabajamos</h2></div></div>
<div class="group">
  <div class="fila"><span class="ib">${icono('verificado')}</span><span class="fila-t"><strong>Datos del fabricante</strong><span>Las especificaciones salen de las fichas de los fabricantes y de las tiendas.</span></span></div>
  <div class="fila"><span class="ib">${icono('prohibido')}</span><span class="fila-t"><strong>Sin precios inventados</strong><span>Los precios cambian a diario, así que te enviamos a la tienda para verlos. Solo damos un rango orientativo.</span></span></div>
  <div class="fila"><span class="ib">${icono('ayuda')}</span><span class="fila-t"><strong>Lo dudoso, marcado</strong><span>Lo que no pudimos verificar aparece como «sin confirmar». Más detalles en <a href="/nosotros">quiénes somos</a>.</span></span></div>
</div>
</section>
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
