/**
 * scripts/catalogo.js - Genera el catálogo de productos a partir de data/productos.json
 *
 *  - public/productos/index.html      catálogo con filtros
 *  - public/productos/<slug>.html     una ficha por producto
 *  - public/data/productos.json       datos ya formateados para el comparador (/comparar)
 *
 * Todo el texto pasa por esc(): ningún dato puede inyectar HTML ni scripts.
 */

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.ofertasdomoticas.com';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ─── FORMATO DE VALORES ───────────────────────────────────────────────────────
const COMPAT = {
  'si':              { text: '✔ Sí', cls: 'yes' },
  'no':              { text: '✘ No', cls: 'no' },
  'via-hub':         { text: 'Vía hub', cls: 'partial' },
  'via-matter':      { text: 'Vía Matter', cls: 'partial' },
  'parcial':         { text: 'Parcial', cls: 'partial' },
  'algunos-modelos': { text: 'Algunos modelos', cls: 'partial' },
  'sin-confirmar':   { text: 'Sin confirmar', cls: 'partial' },
};

export const PRECIO = {
  1: { text: '$ (menos de 15 USD)', corto: '$' },
  2: { text: '$$ (15–40 USD)', corto: '$$' },
  3: { text: '$$$ (más de 40 USD)', corto: '$$$' },
};

const bool = (v) => v === true ? { text: '✔ Sí', cls: 'yes' }
  : v === false ? { text: '✘ No', cls: 'no' }
  : { text: String(v), cls: 'partial' };

// Filas de la ficha técnica por categoría: [etiqueta, función que devuelve {text, cls}]
const txt = (k) => (p) => p[k] ? { text: Array.isArray(p[k]) ? p[k].join(', ') : String(p[k]) } : null;

const FILAS_COMUNES = [
  ['Marca', txt('marca')],
  ['Protocolos', txt('protocolos')],
  ['Hub necesario', txt('hub')],
  ['App', txt('app')],
];

const FILAS_CATEGORIA = {
  enchufe: [['Voltaje', txt('voltaje')], ['Clavija', txt('clavija')], ['Carga máxima', txt('cargaMax')], ['Mide consumo', (p) => bool(p.medicionConsumo)]],
  bombilla: [['Voltaje', txt('voltaje')], ['Rosca', txt('rosca')], ['Luminosidad', txt('lumenes')], ['Color', txt('color')]],
  sensor: [['Tipo', txt('tipoSensor')], ['Batería', txt('bateria')], ['Precisión', txt('precision')], ['Alcance', txt('alcance')]],
  hub: [['Alimentación', txt('alimentacion')], ['Capacidad', txt('capacidad')]],
  interruptor: [['Voltaje', txt('voltaje')], ['Carga máxima', txt('cargaMax')], ['Cable neutro', txt('neutro')]],
};

const FILAS_COMPAT = [
  ['Amazon Alexa', 'alexa'], ['Google Home', 'google'], ['Apple Home', 'homekit'],
  ['Matter', 'matter'], ['Home Assistant', 'homeAssistant'],
];

export function fichaTecnica(p) {
  return [...FILAS_COMUNES, ...FILAS_CATEGORIA[p.categoria]]
    .map(([label, fn]) => ({ label, ...(fn(p) || {}) }))
    .filter((f) => f.text);
}

export function fichaCompat(p) {
  return FILAS_COMPAT.map(([label, key]) => ({ label, ...COMPAT[p.compat[key]] }));
}

// ─── ENLACES DE TIENDA ────────────────────────────────────────────────────────
function enlacesTienda(p, tiendas) {
  return tiendas.map((t) => {
    const q = encodeURIComponent(p.busqueda.trim()).replace(/%20/g, t.separador);
    let url = t.busqueda.replace('{q}', q);
    if (t.afiliado && t.parametroAfiliado) {
      url += (url.includes('?') ? '&' : '?') + `${t.parametroAfiliado}=${encodeURIComponent(t.afiliado)}`;
    }
    return { tienda: t.nombre, url };
  });
}

// ─── PLANTILLA ────────────────────────────────────────────────────────────────
export function pagina({ title, description, canonical, body, scripts = [], breadcrumbs, robots = 'index, follow' }) {
  const ld = breadcrumbs ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${url}` })),
  }).replace(/</g, '\\u003c')}</script>` : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${SITE_URL}${canonical}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="/assets/catalogo.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-J4MP94RSZL"></script>
  <script src="/analytics.js" defer></script>
${scripts.map((s) => `  <script src="${s}" defer></script>`).join('\n')}
  ${ld}
</head>
<body>
${cabecera(canonical)}
<main>
<div class="w">
${body}
</div>
</main>
${pie()}
</body>
</html>
`;
}

export function cabecera(actual = '') {
  const link = (href, label) => `<a href="${href}"${actual.startsWith(href) ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header>
  <div class="header-inner">
    <a href="/" class="logo"><span class="logo-icon">🏠</span>Ofertas<em>Domoticas</em></a>
    <nav aria-label="Principal">
      ${link('/productos/', 'Productos')}
      ${link('/comparativas/', 'Comparativas')}
      ${link('/comparar', 'Comparar')}
      ${link('/articulos-editoriales/', 'Guías')}
    </nav>
  </div>
</header>`;
}

export function pie() {
  return `<footer>
  <div class="w">
    <span>© ${new Date().getFullYear()} OfertasDomoticas.com — Domótica práctica para Latinoamérica</span>
    <span><a href="/glosario">Glosario</a> · <a href="/nosotros">Nosotros</a> · <a href="/privacidad">Privacidad</a> · <a href="/contacto">Contacto</a></span>
  </div>
</footer>`;
}

export const AVISO_AFILIADOS =`<p class="disclosure">Algunos enlaces de compra pueden ser de afiliado: si compras a través de ellos podemos recibir una pequeña comisión, sin coste extra para ti. No mostramos precios exactos porque cambian a diario; el rango es orientativo.</p>`;

export function badges(p) {
  const out = p.protocolos.slice(0, 3).map((x) => `<span class="badge">${esc(x)}</span>`);
  if (p.voltajes) out.push(`<span class="badge volt">${esc(p.voltajes.map((v) => (v === '110' ? '110–120 V' : '220–240 V')).join(' / '))}</span>`);
  if (p.generico) out.push('<span class="badge gen">Genérico</span>');
  return out.join('');
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────
function tarjeta(p, cats) {
  const proto = p.protocolos.map((x) => x.toLowerCase()).join(' ');
  const flags = [
    /wifi/.test(proto) ? 'wifi' : '', /zigbee/.test(proto) ? 'zigbee' : '',
    (/matter/.test(proto) || p.compat.matter === 'si') ? 'matter' : '',
  ].filter(Boolean).join(' ');
  const sinHub = !p.hub || /^no necesita|^opcional/i.test(p.hub) ? '1' : '0';
  return `<article class="card" data-cat="${esc(p.categoria)}" data-volt="${esc((p.voltajes || ['110', '220']).join(' '))}" data-proto="${esc(flags)}" data-sinhub="${sinHub}">
  <div class="card-top"><span>${esc(cats[p.categoria].icono)} ${esc(cats[p.categoria].singular)}</span><span class="price" title="Rango de precio orientativo">${esc(PRECIO[p.precio].corto)}</span></div>
  <h3><a href="/productos/${esc(p.slug)}">${esc(p.nombre)}</a></h3>
  <div class="badges">${badges(p)}</div>
  <p>${esc(p.idealPara)}</p>
  <div class="card-actions">
    <a href="/productos/${esc(p.slug)}">Ver ficha →</a>
    <label><input type="checkbox" class="cmp-check" value="${esc(p.slug)}" aria-label="Comparar ${esc(p.nombre)}"> Comparar</label>
  </div>
</article>`;
}

function paginaCatalogo(data) {
  const { categorias: cats, productos } = data;
  const bloques = Object.entries(cats).map(([id, c]) => {
    const items = productos.filter((p) => p.categoria === id);
    return `<section class="cat-block" data-block="${esc(id)}" aria-labelledby="h-${esc(id)}">
  <h2 id="h-${esc(id)}">${esc(c.icono)} ${esc(c.nombre)} <span class="muted small">(${items.length})</span></h2>
  <p class="lead small">${esc(c.intro)}</p>
  <div class="grid">
${items.map((p) => tarjeta(p, cats)).join('\n')}
  </div>
</section>`;
  }).join('\n');

  const chips = (grupo, opciones) => opciones.map(([v, l]) => `<button type="button" class="chip" data-group="${grupo}" data-value="${v}" aria-pressed="${v === 'todos' ? 'true' : 'false'}">${esc(l)}</button>`).join('');

  const body = `<div class="bc"><a href="/">Inicio</a> › Productos</div>
<h1>Catálogo de domótica para Latinoamérica</h1>
<p class="lead">${productos.length} productos reales con especificaciones verificadas en fuentes de los fabricantes. Filtra por el voltaje de tu país (110 V o 220 V), por protocolo o por si necesitan hub, y compara hasta 3 productos lado a lado.</p>
<div class="filters" role="group" aria-label="Filtrar por categoría"><span class="label">Categoría:</span>${chips('cat', [['todos', 'Todas'], ...Object.entries(cats).map(([id, c]) => [id, c.nombre])])}</div>
<div class="filters" role="group" aria-label="Filtrar por voltaje"><span class="label">Voltaje de tu país:</span>${chips('volt', [['todos', 'Cualquiera'], ['110', '110–120 V'], ['220', '220–240 V']])}</div>
<div class="filters" role="group" aria-label="Filtrar por protocolo"><span class="label">Protocolo:</span>${chips('proto', [['todos', 'Todos'], ['wifi', 'WiFi'], ['zigbee', 'Zigbee'], ['matter', 'Matter']])}</div>
<div class="filters" role="group" aria-label="Filtrar por hub"><span class="label">Hub:</span>${chips('sinhub', [['todos', 'Da igual'], ['1', 'Sin hub']])}</div>
<p class="result-count" id="result-count" aria-live="polite">Mostrando ${productos.length} productos</p>
${bloques}
<div class="compare-bar" id="compare-bar" hidden>
  <span id="compare-text">0 seleccionados</span>
  <span><button type="button" class="btn secondary" id="compare-clear">Limpiar</button> <a class="btn" id="compare-go" href="/comparar">Comparar →</a></span>
</div>
<p class="muted small">¿Qué voltaje usa tu país? 110–120 V: México, Centroamérica, Colombia, Ecuador y Venezuela. 220–240 V: Perú, Chile, Argentina, Bolivia, Uruguay y Paraguay. En Brasil depende de la ciudad (127 V o 220 V).</p>
<p class="muted small">Datos actualizados el ${esc(data.actualizado)}.</p>
${AVISO_AFILIADOS}`;

  return pagina({
    title: 'Catálogo de domótica para Latinoamérica: enchufes, focos, sensores y hubs',
    description: `Compara ${productos.length} productos de domótica (Sonoff, Aqara, Tapo, Shelly, WiZ, Hue y Tuya) por voltaje, protocolo y compatibilidad con Alexa, Google, Apple Home y Home Assistant.`,
    canonical: '/productos/',
    scripts: ['/assets/catalogo.js'],
    breadcrumbs: [['Inicio', '/'], ['Productos', '/productos/']],
    body,
  });
}

// ─── FICHA DE PRODUCTO ────────────────────────────────────────────────────────
function tabla(filas) {
  return `<div class="table-wrap"><table><tbody>
${filas.map((f) => `<tr><th scope="row">${esc(f.label)}</th><td${f.cls ? ` class="${f.cls}"` : ''}>${esc(f.text)}</td></tr>`).join('\n')}
</tbody></table></div>`;
}

function paginaProducto(p, data, tiendas, comparativas = []) {
  const enComparativas = comparativas.filter((c) => c.productos.includes(p.slug));
  const cat = data.categorias[p.categoria];
  const otros = data.productos.filter((o) => o.categoria === p.categoria && o.slug !== p.slug);
  const compat = fichaCompat(p);
  if (p.notaHA) compat.find((f) => f.label === 'Home Assistant').text += ` — ${p.notaHA}`;
  if (p.notaMatter) compat.find((f) => f.label === 'Matter').text += ` — ${p.notaMatter}`;

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/productos/">Productos</a> › ${esc(cat.nombre)}</div>
<div class="product-head">
  <div>
    <h1>${esc(p.nombre)}</h1>
    <div class="badges">${badges(p)}</div>
    <p class="lead">${esc(p.resumen)}</p>
  </div>
  <aside class="buy" aria-label="Dónde comprar">
    <span class="price">Precio orientativo: ${esc(PRECIO[p.precio].text)}</span>
${enlacesTienda(p, tiendas).map((e) => `    <a class="btn" href="${esc(e.url)}" target="_blank" rel="sponsored nofollow noopener">Ver precio en ${esc(e.tienda)}</a>`).join('\n')}
    <span class="note">El precio real cambia a diario: compruébalo en la tienda.</span>
  </aside>
</div>
${p.generico ? '<div class="callout"><strong>Producto genérico:</strong> lo venden muchos fabricantes con la misma app. Las especificaciones son las habituales, pero pueden variar: compruébalas en el anuncio antes de comprar.</div>' : ''}
<div class="callout"><strong>Para Latinoamérica:</strong> ${esc(p.notaLatam)}</div>
<h2>Ficha técnica</h2>
${tabla(fichaTecnica(p))}
<h2>Compatibilidad</h2>
${tabla(compat)}
<h2>Ventajas y desventajas</h2>
<div class="proscons">
  <div class="box"><h3 class="yes">Ventajas</h3><ul>${p.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="box"><h3 class="no">Desventajas</h3><ul>${p.contras.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>
${enComparativas.length ? `<h2>Aparece en estas comparativas</h2>
<div class="links-list">
${enComparativas.map((c) => `  <a class="btn secondary" href="/comparativas/${esc(c.slug)}">${esc(c.tituloCorto)}</a>`).join('\n')}
</div>` : ''}
<h2>¿Para quién es?</h2>
<p>${esc(p.idealPara)}</p>
${otros.length ? `<h2>Compáralo con otros ${esc(cat.nombre.toLowerCase())}</h2>
<div class="links-list">
${otros.map((o) => `  <a class="btn secondary" href="/comparar?p=${esc(p.slug)},${esc(o.slug)}">vs ${esc(o.nombre)}</a>`).join('\n')}
</div>` : ''}
<p class="muted small">Datos actualizados el ${esc(data.actualizado)} a partir de las especificaciones del fabricante.</p>
${AVISO_AFILIADOS}`;

  return pagina({
    title: `${p.nombre}: ficha técnica, compatibilidad y opinión | OfertasDomoticas`,
    description: `${p.resumen.split('. ')[0]}. Voltaje, protocolo, compatibilidad con Alexa, Google, Apple Home y Home Assistant.`.slice(0, 300),
    canonical: `/productos/${p.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Productos', '/productos/'], [p.nombre, `/productos/${p.slug}`]],
    body,
  });
}

// ─── COMPARADOR ───────────────────────────────────────────────────────────────
function paginaComparar(data) {
  const body = `<div class="bc"><a href="/">Inicio</a> › Comparar</div>
<h1>Comparador de productos de domótica</h1>
<p class="lead">Elige hasta 3 productos y compara lado a lado su voltaje, protocolo, si necesitan hub y su compatibilidad con Alexa, Google, Apple Home, Matter y Home Assistant. Las filas resaltadas muestran en qué se diferencian.</p>
<div class="pickers">
  <label>Producto 1<select class="picker" aria-label="Producto 1"></select></label>
  <label>Producto 2<select class="picker" aria-label="Producto 2"></select></label>
  <label>Producto 3<select class="picker" aria-label="Producto 3"></select></label>
</div>
<div id="cmp-out" aria-live="polite"><p class="muted">Cargando productos…</p></div>
<p class="muted small">¿No sabes por dónde empezar? Mira el <a href="/productos/">catálogo completo</a> y marca los que quieras comparar. Datos actualizados el ${esc(data.actualizado)}.</p>
${AVISO_AFILIADOS}`;
  return pagina({
    title: 'Comparador de domótica: enchufes, focos, sensores y hubs lado a lado',
    description: 'Compara hasta 3 productos de domótica: voltaje, protocolo (WiFi, Zigbee, Matter), si necesitan hub y compatibilidad con Alexa, Google, Apple Home y Home Assistant.',
    canonical: '/comparar',
    scripts: ['/assets/comparar.js'],
    breadcrumbs: [['Inicio', '/'], ['Comparar', '/comparar']],
    body,
  });
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────
export function generarCatalogo(root) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const { tiendas } = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tiendas.json'), 'utf8'));
  const fComp = path.join(root, 'data', 'comparativas.json');
  const comparativas = fs.existsSync(fComp) ? JSON.parse(fs.readFileSync(fComp, 'utf8')).comparativas : [];
  const outDir = path.join(root, 'public', 'productos');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const p of data.productos) {
    if (!data.categorias[p.categoria]) throw new Error(`Categoría desconocida en ${p.slug}: ${p.categoria}`);
    for (const key of FILAS_COMPAT.map(([, k]) => k)) {
      if (!COMPAT[p.compat?.[key]]) throw new Error(`Compatibilidad "${key}" inválida en ${p.slug}`);
    }
    if (!PRECIO[p.precio]) throw new Error(`Precio inválido en ${p.slug}`);
    fs.writeFileSync(path.join(outDir, `${p.slug}.html`), paginaProducto(p, data, tiendas, comparativas), 'utf8');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), paginaCatalogo(data), 'utf8');
  fs.writeFileSync(path.join(root, 'public', 'comparar.html'), paginaComparar(data), 'utf8');

  // Datos listos para el comparador: el navegador solo los muestra, no los interpreta como HTML
  const paraComparador = {
    actualizado: data.actualizado,
    categorias: Object.fromEntries(Object.entries(data.categorias).map(([id, c]) => [id, { nombre: c.nombre, icono: c.icono }])),
    productos: data.productos.map((p) => ({
      slug: p.slug, nombre: p.nombre, categoria: p.categoria,
      precio: PRECIO[p.precio].text,
      filas: [...fichaTecnica(p), ...fichaCompat(p)],
      tiendas: enlacesTienda(p, tiendas),
    })),
  };
  fs.mkdirSync(path.join(root, 'public', 'data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'data', 'productos.json'), JSON.stringify(paraComparador), 'utf8');

  console.log(`🛒 Catálogo: ${data.productos.length} fichas de producto`);
}
