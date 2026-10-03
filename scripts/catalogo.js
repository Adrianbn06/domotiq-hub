/**
 * scripts/catalogo.js - Genera el catálogo de productos a partir de data/productos.json
 *
 *  - public/productos/index.html      catálogo con filtros
 *  - public/productos/<slug>.html     una ficha por producto
 *  - public/data/productos.json       datos ya formateados para el comparador (/comparar)
 *
 * También exporta la plantilla común de todas las páginas (pagina, cabecera, pie) y las piezas
 * del diseño: icono(), ilustracion(), tarjetaProducto(), fila() y pila().
 *
 * Todo el texto pasa por esc(): ningún dato puede inyectar HTML ni scripts.
 * Sin estilos en línea (atributo style): la CSP del sitio no los permite.
 */

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.ofertasdomoticas.com';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ─── ICONOS ───────────────────────────────────────────────────────────────────
// Trazos de Lucide (una sola familia, trazo 1.75 desde el CSS). Van en un sprite al inicio de
// cada página y se usan con icono('nombre'). Cada categoría del catálogo necesita su icono.
const ICONOS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'chev-r': '<path d="m9 18 6-6-6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alerta: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  verificado: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  ayuda: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  prohibido: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  enchufe: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  bombilla: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  sensor: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  hub: '<rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6.01 18H6"/><path d="M10.01 18H10"/><path d="M15 10v4"/><path d="M17.84 7.17a4 4 0 0 0-5.66 0"/><path d="M20.66 4.34a8 8 0 0 0-11.31 0"/>',
  interruptor: '<rect width="20" height="12" x="2" y="6" rx="6"/><circle cx="16" cy="12" r="2"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  red: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  casa: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  columnas: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
  libro: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  balanza: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  brujula: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
  externo: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  globo: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  lapiz: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  calendario: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  actualizado: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bolsa: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  rayo: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
};

export function icono(nombre, clase = '') {
  if (!ICONOS[nombre]) throw new Error(`Icono desconocido: ${nombre}`);
  return `<svg class="i${clase ? ` ${clase}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${nombre}"/></svg>`;
}

// ─── ILUSTRACIONES ────────────────────────────────────────────────────────────
// Dibujos propios por categoría (sin fotos de fabricantes: no hay problemas de derechos).
// Usan los degradados del sprite. Cada categoría del catálogo necesita su dibujo.
const ILUSTRACIONES = {
  bombilla: '<path class="glass" d="M72 160C72 140 36 126 36 88A64 64 0 1 1 164 88C164 126 128 140 128 160Z"/><ellipse cx="74" cy="72" rx="9" ry="21" transform="rotate(28 74 72)" fill="#FFFFFF" opacity=".7"/><rect x="70" y="158" width="60" height="13" rx="4" fill="#E6E8EC"/><path d="M74 171h52v30a9 9 0 0 1-9 9H83a9 9 0 0 1-9-9z" fill="url(#g-metal)"/><path d="M74 180l52-4M74 190l52-4M74 200l52-4" stroke="#8C919A" stroke-width="2.4" stroke-linecap="round"/><path d="M90 209h20l-4 9h-12z" fill="#33363D"/>',
  enchufe: '<rect x="38" y="22" width="124" height="180" rx="40" fill="url(#g-plastico)" stroke="#D3D7DE" stroke-width="1.5"/><rect x="56" y="62" width="88" height="104" rx="28" fill="#F4F5F8" stroke="#E0E3E8" stroke-width="1.5"/><rect x="79" y="88" width="9" height="30" rx="3" fill="#2E3138"/><rect x="112" y="88" width="9" height="30" rx="3" fill="#2E3138"/><path d="M92 146a8 8 0 0 1 16 0v8h-16z" fill="#2E3138"/><circle cx="100" cy="42" r="4.5" fill="#34D399"/><rect x="160" y="96" width="6" height="32" rx="3" fill="#C9CDD4"/>',
  sensor: '<rect x="52" y="28" width="64" height="172" rx="15" fill="url(#g-plastico)" stroke="#D3D7DE" stroke-width="1.5"/><circle cx="84" cy="54" r="4.5" fill="#5C95FF"/><rect x="66" y="178" width="36" height="4" rx="2" fill="#DDE0E6"/><rect x="128" y="64" width="30" height="102" rx="11" fill="url(#g-plastico)" stroke="#D3D7DE" stroke-width="1.5"/>',
  hub: '<rect x="32" y="48" width="136" height="136" rx="42" fill="url(#g-plastico)" stroke="#D3D7DE" stroke-width="1.5"/><circle cx="100" cy="116" r="40" fill="none" stroke="#B9D4FF" stroke-width="18" opacity=".45"/><circle cx="100" cy="116" r="40" fill="none" stroke="#5C95FF" stroke-width="6"/><circle cx="100" cy="116" r="27" fill="#F2F3F6"/><circle cx="100" cy="116" r="5" fill="#C5CAD2"/>',
  interruptor: '<rect x="46" y="40" width="108" height="128" rx="18" fill="url(#g-plastico)" stroke="#D3D7DE" stroke-width="1.5"/><rect x="46" y="152" width="108" height="36" rx="9" fill="#2E3138"/><circle cx="70" cy="170" r="7.5" fill="#9AA0A9"/><circle cx="100" cy="170" r="7.5" fill="#9AA0A9"/><circle cx="130" cy="170" r="7.5" fill="#9AA0A9"/><path d="M66 170h8M96 170h8M126 170h8" stroke="#2E3138" stroke-width="2.2"/><circle cx="70" cy="66" r="4.5" fill="#34D399"/><rect x="110" y="60" width="26" height="12" rx="6" fill="#D8DBE1"/><path d="M66 100h68M66 116h46" stroke="#E0E3E8" stroke-width="5" stroke-linecap="round"/>',
};

export function ilustracion(categoria) {
  if (!ILUSTRACIONES[categoria]) throw new Error(`Falta la ilustración de la categoría "${categoria}" en scripts/catalogo.js`);
  return `<svg class="ill" viewBox="0 0 200 230" aria-hidden="true" focusable="false">${ILUSTRACIONES[categoria]}</svg>`;
}

// El foco colgante del escenario nocturno de la portada
export function focoColgante() {
  return `<svg class="colgante" viewBox="0 0 300 330" aria-hidden="true" focusable="false">
  <line x1="150" y1="0" x2="150" y2="62" stroke="#3B404C" stroke-width="3"/>
  <rect x="132" y="56" width="36" height="36" rx="7" fill="#2A2E38"/>
  <path d="M126 92h48v26a8 8 0 0 1-8 8h-32a8 8 0 0 1-8-8z" fill="url(#g-metal)"/>
  <path d="M126 101l48 4M126 111l48 4" stroke="#7D838D" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="122" y="124" width="56" height="12" rx="4" fill="#D9DCE2"/>
  <path class="glass" d="M122 136C122 158 82 172 82 214A68 68 0 0 0 218 214C218 172 178 158 178 136Z"/>
  <ellipse cx="116" cy="232" rx="9" ry="24" transform="rotate(18 116 232)" fill="#FFFFFF" opacity=".35"/>
</svg>`;
}

const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false"><defs>
<linearGradient id="g-plastico" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E3E6EB"/></linearGradient>
<linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A3A8B0"/><stop offset=".45" stop-color="#F1F2F4"/><stop offset="1" stop-color="#989DA6"/></linearGradient>
${Object.entries(ICONOS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('\n')}
</defs></svg>`;

// Marca: el frente de un tomacorriente dentro del cuadrado azul
const MARCA = '<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7.5" y="5.5" width="2.4" height="7" rx="1" fill="currentColor"/><rect x="14.1" y="5.5" width="2.4" height="7" rx="1" fill="currentColor"/><path d="M9.6 17.5a2.4 2.4 0 0 1 4.8 0v1.6H9.6z" fill="currentColor"/></svg></span>';

// ─── FORMATO DE VALORES ───────────────────────────────────────────────────────
// cls: yes (verde), no (rojo), info (azul), partial (ámbar), unknown (gris)
const COMPAT = {
  'si':              { text: 'Sí', cls: 'yes' },
  'no':              { text: 'No', cls: 'no' },
  'via-hub':         { text: 'Vía hub', cls: 'info' },
  'via-matter':      { text: 'Vía Matter', cls: 'info' },
  'parcial':         { text: 'Parcial', cls: 'partial' },
  'algunos-modelos': { text: 'Algunos modelos', cls: 'partial' },
  'sin-confirmar':   { text: 'Sin confirmar', cls: 'unknown' },
};
const ICONO_ESTADO = { yes: 'check', no: 'x', info: 'info', partial: 'alerta', unknown: 'ayuda' };

export const PRECIO = {
  1: { text: '$ (menos de 15 USD)', corto: '$' },
  2: { text: '$$ (15–40 USD)', corto: '$$' },
  3: { text: '$$$ (más de 40 USD)', corto: '$$$' },
};

const bool = (v) => v === true ? { text: 'Sí', cls: 'yes' }
  : v === false ? { text: 'No', cls: 'no' }
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

// Píldora de estado (Sí, No, Vía Matter…) con su icono
export function estado(cls, texto) {
  return `<span class="estado ${cls}">${icono(ICONO_ESTADO[cls] || 'info')}${esc(texto)}</span>`;
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
// Google corta los títulos a ~60 caracteres y las descripciones a ~155
export function tituloSeo(base) {
  const conMarca = `${base} | OfertasDomoticas`;
  return conMarca.length <= 60 ? conMarca : base;
}

export function recortar(texto, max = 155) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}

export const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400..800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">';

export function pagina({ title, description, canonical, body, scripts = [], breadcrumbs, robots = 'index, follow' }) {
  description = recortar(description);
  const ld = breadcrumbs ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${url}` })),
  }).replace(/</g, '\\u003c')}</script>` : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${SITE_URL}${canonical}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}${canonical}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="es_LA">
  <meta property="og:site_name" content="OfertasDomoticas.com">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f6f6f7" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  ${FUENTES}
  <link rel="stylesheet" href="/assets/catalogo.css">
  <script src="/analytics.js" defer></script>
${scripts.map((s) => `  <script src="${s}" defer></script>`).join('\n')}
  ${ld}
</head>
<body>
${SPRITE}
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
  return `<header class="top">
  <div class="top-in">
    <a href="/" class="brand" aria-label="OfertasDomoticas.com, ir a la portada">${MARCA}<span class="wm">ofertas <span>domóticas</span></span></a>
    <nav aria-label="Principal">
      ${link('/productos/', 'Catálogo')}
      ${link('/comparativas/', 'Comparativas')}
      ${link('/comparar', 'Comparar')}
      ${link('/articulos-editoriales/', 'Guías')}
    </nav>
  </div>
</header>`;
}

export function pie() {
  return `<footer class="pie">
  <div class="w pie-in">
    <a href="/" class="brand" aria-label="OfertasDomoticas.com, ir a la portada">${MARCA}<span class="wm">ofertas <span>domóticas</span></span></a>
    <p class="pie-lema">Domótica práctica para Latinoamérica: fichas verificadas, comparativas y guías para redes de 110 V y 220 V.</p>
    <nav aria-label="Secciones">
      <a href="/productos/">Catálogo</a><a href="/comparativas/">Comparativas</a><a href="/comparar">Comparar</a><a href="/articulos-editoriales/">Guías</a><a href="/glosario">Glosario</a>
    </nav>
    <nav aria-label="Información">
      <a href="/nosotros">Nosotros</a><a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><a href="/privacidad#cookies" data-cookies>Configurar cookies</a>
    </nav>
    <small>© ${new Date().getFullYear()} OfertasDomoticas.com</small>
  </div>
</footer>`;
}

export const AVISO_AFILIADOS =`<p class="disclosure">Algunos enlaces de compra pueden ser de afiliado: si compras a través de ellos podemos recibir una pequeña comisión, sin coste extra para ti. No mostramos precios exactos porque cambian a diario; el rango es orientativo. En calidad de afiliado de Amazon, OfertasDomoticas.com obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.</p>`;

export function badges(p) {
  const out = p.protocolos.slice(0, 3).map((x) => `<span class="badge">${esc(x)}</span>`);
  if (p.voltajes) out.push(`<span class="badge volt">${esc(p.voltajes.map((v) => (v === '110' ? '110–120 V' : '220–240 V')).join(' / '))}</span>`);
  if (p.generico) out.push('<span class="badge gen">Genérico</span>');
  return out.join('');
}

// ─── PIEZAS DEL DISEÑO ────────────────────────────────────────────────────────
// Fila de una lista agrupada: enlace con icono (o dibujo), título, subtítulo y flecha
export function fila({ href, titulo, sub, icono: ic, inicio, antetitulo }) {
  const lead = inicio || (ic ? `<span class="ib">${icono(ic)}</span>` : '');
  return `<a class="fila" href="${esc(href)}">${lead}<span class="fila-t">${antetitulo ? `<span class="eyebrow">${esc(antetitulo)}</span>` : ''}<strong>${esc(titulo)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</span>${icono('chev-r', 'chev')}</a>`;
}

// Miniaturas superpuestas de varios productos (por categoría)
export function pila(categorias) {
  return `<span class="pila">${categorias.slice(0, 3).map((c) => `<span class="stage k-${esc(c)}">${ilustracion(c)}</span>`).join('')}</span>`;
}

// Tarjeta de producto con su dibujo sobre el color de la categoría
export function tarjetaProducto(p, cats, { texto, comparar = false, datos = '' } = {}) {
  const url = `/productos/${esc(p.slug)}`;
  return `<article class="card"${datos}>
  <a class="stage card-stage k-${esc(p.categoria)}" href="${url}" tabindex="-1" aria-hidden="true">${ilustracion(p.categoria)}<span class="card-tag">${esc(cats[p.categoria].singular)}</span><span class="card-price" title="Rango de precio orientativo">${esc(PRECIO[p.precio].corto)}</span></a>
  <div class="card-body">
    <h3><a href="${url}">${esc(p.nombre)}</a></h3>
    <div class="badges">${badges(p)}</div>
    <p>${esc(texto ?? p.idealPara)}</p>
    <div class="card-actions">
      <a href="${url}">Ver ficha${icono('chev-r')}</a>${comparar ? `
      <label><input type="checkbox" class="cmp-check" value="${esc(p.slug)}" aria-label="Comparar ${esc(p.nombre)}"> Comparar</label>` : ''}
    </div>
  </div>
</article>`;
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────
function tarjeta(p, cats) {
  const proto = p.protocolos.map((x) => x.toLowerCase()).join(' ');
  const flags = [
    /wifi/.test(proto) ? 'wifi' : '', /zigbee/.test(proto) ? 'zigbee' : '',
    (/matter/.test(proto) || p.compat.matter === 'si') ? 'matter' : '',
  ].filter(Boolean).join(' ');
  const sinHub = !p.hub || /^no necesita|^opcional/i.test(p.hub) ? '1' : '0';
  const datos = ` data-cat="${esc(p.categoria)}" data-volt="${esc((p.voltajes || ['110', '220']).join(' '))}" data-proto="${esc(flags)}" data-sinhub="${sinHub}"`;
  return tarjetaProducto(p, cats, { comparar: true, datos });
}

function paginaCatalogo(data) {
  const { categorias: cats, productos } = data;
  const bloques = Object.entries(cats).map(([id, c]) => {
    const items = productos.filter((p) => p.categoria === id);
    return `<section class="cat-block" data-block="${esc(id)}" aria-labelledby="h-${esc(id)}">
  <div class="cat-head">
    <span class="ib tinte k-${esc(id)}">${icono(id)}</span>
    <div><h2 id="h-${esc(id)}">${esc(c.nombre)} <span class="cuenta">${items.length}</span></h2>
    <p class="muted">${esc(c.intro)}</p></div>
  </div>
  <div class="grid">
${items.map((p) => tarjeta(p, cats)).join('\n')}
  </div>
</section>`;
  }).join('\n');

  const chips = (grupo, opciones) => opciones.map(([v, l]) => `<button type="button" class="chip" data-group="${grupo}" data-value="${v}" aria-pressed="${v === 'todos' ? 'true' : 'false'}">${esc(l)}</button>`).join('');

  const body = `<div class="bc"><a href="/">Inicio</a> › Catálogo</div>
<p class="eyebrow">Catálogo</p>
<h1>Domótica para Latinoamérica</h1>
<p class="lead">${productos.length} productos reales con especificaciones verificadas en fuentes de los fabricantes. Filtra por el voltaje de tu país (110 V o 220 V), por protocolo o por si necesitan hub, y compara hasta 3 productos lado a lado.</p>
<div class="filtros">
<div class="filters" role="group" aria-label="Filtrar por categoría"><span class="label">Categoría</span>${chips('cat', [['todos', 'Todas'], ...Object.entries(cats).map(([id, c]) => [id, c.nombre])])}</div>
<div class="filters" role="group" aria-label="Filtrar por voltaje"><span class="label">Voltaje de tu país</span>${chips('volt', [['todos', 'Cualquiera'], ['110', '110–120 V'], ['220', '220–240 V']])}</div>
<div class="filters" role="group" aria-label="Filtrar por protocolo"><span class="label">Protocolo</span>${chips('proto', [['todos', 'Todos'], ['wifi', 'WiFi'], ['zigbee', 'Zigbee'], ['matter', 'Matter']])}</div>
<div class="filters" role="group" aria-label="Filtrar por hub"><span class="label">Hub</span>${chips('sinhub', [['todos', 'Da igual'], ['1', 'Sin hub']])}</div>
</div>
<p class="result-count" id="result-count" aria-live="polite">Mostrando ${productos.length} productos</p>
${bloques}
<div class="compare-bar" id="compare-bar" hidden>
  <span id="compare-text">0 seleccionados</span>
  <span class="compare-acciones"><button type="button" class="btn sm secondary" id="compare-clear">Limpiar</button><a class="btn sm" id="compare-go" href="/comparar">Comparar${icono('chev-r')}</a></span>
</div>
<div class="callout info">${icono('globo')}<p>¿Qué voltaje usa tu país? <strong>110–120 V:</strong> México, Centroamérica, Colombia, Ecuador y Venezuela. <strong>220–240 V:</strong> Perú, Chile, Argentina, Bolivia, Uruguay y Paraguay. En Brasil depende de la ciudad (127 V o 220 V).</p></div>
<p class="muted small nota-datos">Datos actualizados el ${esc(data.actualizado)}.</p>
${AVISO_AFILIADOS}`;

  return pagina({
    title: tituloSeo('Catálogo de domótica para Latinoamérica'),
    description: `Compara ${productos.length} productos de domótica (Sonoff, Aqara, Tapo, Shelly, WiZ, Hue y Tuya) por voltaje, protocolo y compatibilidad con Alexa, Google, Apple Home y Home Assistant.`,
    canonical: '/productos/',
    scripts: ['/assets/catalogo.js'],
    breadcrumbs: [['Inicio', '/'], ['Productos', '/productos/']],
    body,
  });
}

// ─── FICHA DE PRODUCTO ────────────────────────────────────────────────────────
function datos(filas) {
  return `<dl class="group datos">
${filas.map((f) => `<div class="dato"><dt>${esc(f.label)}</dt><dd>${f.cls ? estado(f.cls, f.text) : esc(f.text)}${f.nota ? `<small>${esc(f.nota)}</small>` : ''}</dd></div>`).join('\n')}
</dl>`;
}

function paginaProducto(p, data, tiendas, comparativas = []) {
  const enComparativas = comparativas.filter((c) => c.productos.includes(p.slug));
  const cat = data.categorias[p.categoria];
  const otros = data.productos.filter((o) => o.categoria === p.categoria && o.slug !== p.slug);
  const compat = fichaCompat(p);
  if (p.notaHA) compat.find((f) => f.label === 'Home Assistant').nota = p.notaHA;
  if (p.notaMatter) compat.find((f) => f.label === 'Matter').nota = p.notaMatter;
  const tiendasP = enlacesTienda(p, tiendas);
  const boton = (e, i, extra = '') => `<a class="btn${i ? ' secondary' : ''}${extra}" href="${esc(e.url)}" target="_blank" rel="sponsored nofollow noopener">Ver precio en ${esc(e.tienda)}${icono('externo')}</a>`;

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/productos/">Catálogo</a> › ${esc(cat.nombre)}</div>
<div class="ficha">
  <div class="ficha-media"><div class="stage ficha-stage k-${esc(p.categoria)}">${ilustracion(p.categoria)}</div></div>
  <div class="ficha-info">
    <p class="eyebrow">${esc(cat.singular)} · ${esc(p.marca)}</p>
    <h1>${esc(p.nombre)}</h1>
    <p class="lead">${esc(p.resumen)}</p>
    <div class="badges">${badges(p)}</div>
    <div class="buy" aria-label="Dónde comprar">
      <p class="precio"><span class="num">${esc(PRECIO[p.precio].corto)}</span> Precio orientativo: ${esc(PRECIO[p.precio].text.replace(/^\S+\s*/, '').replace(/[()]/g, ''))}</p>
${tiendasP.map((e, i) => `      ${boton(e, i)}`).join('\n')}
      <p class="note">El precio real cambia a diario: compruébalo en la tienda.</p>
    </div>
  </div>
</div>
<div class="ficha-cuerpo">
${p.categoria === 'interruptor' ? `<div class="callout warn">${icono('alerta')}<p><strong>Instalación eléctrica.</strong> Se conecta a la red eléctrica de tu casa: si no tienes experiencia, contrata a un electricista.</p></div>` : ''}
${p.generico ? `<div class="callout warn">${icono('alerta')}<p><strong>Producto genérico:</strong> lo venden muchos fabricantes con la misma app. Las especificaciones son las habituales, pero pueden variar: compruébalas en el anuncio antes de comprar.</p></div>` : ''}
<div class="callout info">${icono('globo')}<p><strong>Para Latinoamérica:</strong> ${esc(p.notaLatam)}</p></div>
<h2>Ficha técnica</h2>
${datos(fichaTecnica(p))}
<h2>Compatibilidad</h2>
${datos(compat)}
<h2>Ventajas y desventajas</h2>
<div class="proscons">
  <div><h3>Ventajas</h3><div class="group">${p.pros.map((x) => `<div class="fila"><span class="ib ok">${icono('check')}</span><span class="fila-t"><strong>${esc(x)}</strong></span></div>`).join('')}</div></div>
  <div><h3>Desventajas</h3><div class="group">${p.contras.map((x) => `<div class="fila"><span class="ib bad">${icono('x')}</span><span class="fila-t"><strong>${esc(x)}</strong></span></div>`).join('')}</div></div>
</div>
${enComparativas.length ? `<h2>Aparece en estas comparativas</h2>
<div class="group">
${enComparativas.map((c) => fila({ href: `/comparativas/${c.slug}`, titulo: c.tituloCorto, icono: 'balanza' })).join('\n')}
</div>` : ''}
<h2>¿Para quién es?</h2>
<p>${esc(p.idealPara)}</p>
${otros.length ? `<h2>Compáralo con otros ${esc(cat.nombre.toLowerCase())}</h2>
<div class="group">
${otros.map((o) => fila({ href: `/comparar?p=${p.slug},${o.slug}`, titulo: `vs ${o.nombre}`, inicio: pila([o.categoria]) })).join('\n')}
</div>` : ''}
<p class="muted small nota-datos">Datos actualizados el ${esc(data.actualizado)} a partir de las especificaciones del fabricante.</p>
${AVISO_AFILIADOS}
</div>
${tiendasP.length ? `<div class="buybar" hidden><span class="num">${esc(PRECIO[p.precio].corto)}</span>${boton(tiendasP[0], 0)}</div>` : ''}`;

  return pagina({
    title: tituloSeo(`${p.nombre.replace(/\s*\(.*?\)/g, '')}: ficha técnica`),
    description: `${p.resumen.split('. ')[0]}. Voltaje, protocolo, compatibilidad con Alexa, Google, Apple Home y Home Assistant.`.slice(0, 300),
    canonical: `/productos/${p.slug}`,
    scripts: ['/assets/ficha.js'],
    breadcrumbs: [['Inicio', '/'], ['Productos', '/productos/'], [p.nombre, `/productos/${p.slug}`]],
    body,
  });
}

// ─── COMPARADOR ───────────────────────────────────────────────────────────────
function paginaComparar(data) {
  const body = `<div class="bc"><a href="/">Inicio</a> › Comparar</div>
<p class="eyebrow">Comparador</p>
<h1>Compara productos de domótica</h1>
<p class="lead">Elige hasta 3 productos y compara lado a lado su voltaje, protocolo, si necesitan hub y su compatibilidad con Alexa, Google, Apple Home, Matter y Home Assistant. Las filas resaltadas muestran en qué se diferencian.</p>
<div class="pickers">
  <label>Producto 1<select class="picker" aria-label="Producto 1"></select></label>
  <label>Producto 2<select class="picker" aria-label="Producto 2"></select></label>
  <label>Producto 3<select class="picker" aria-label="Producto 3"></select></label>
</div>
<div id="cmp-out" aria-live="polite"><p class="muted">Cargando productos…</p></div>
<p class="muted small nota-datos">¿No sabes por dónde empezar? Mira el <a href="/productos/">catálogo completo</a> y marca los que quieras comparar. Datos actualizados el ${esc(data.actualizado)}.</p>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Comparador de productos de domótica'),
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

  for (const id of Object.keys(data.categorias)) {
    if (!FILAS_CATEGORIA[id]) throw new Error(`Categoría "${id}": faltan sus filas en FILAS_CATEGORIA (scripts/catalogo.js)`);
    if (!ICONOS[id]) throw new Error(`Categoría "${id}": falta su icono en ICONOS (scripts/catalogo.js)`);
    if (!ILUSTRACIONES[id]) throw new Error(`Categoría "${id}": falta su dibujo en ILUSTRACIONES (scripts/catalogo.js)`);
  }
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
