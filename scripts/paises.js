/**
 * scripts/paises.js - Genera una página por país a partir del catálogo y de PAISES (scripts/catalogo.js)
 *
 *  - public/paises/index.html      listado de países
 *  - public/paises/<slug>.html     "Domótica en <país>": red eléctrica, clavijas y qué productos sirven
 *
 * No hay texto escrito a mano por país: todo sale de datos ya verificados.
 *  - Red eléctrica (voltaje nominal, frecuencia y clavijas): PAISES, tomado de WorldStandards.
 *  - Qué producto sirve: los campos `voltajes` y `voltaje` de data/productos.json, con la misma regla
 *    que usa "Tu país" (tipoRed): pilas o USB, 100–240 V, versiones por país o un solo voltaje.
 *  - Z-Wave: la frecuencia de cada país según Silicon Labs.
 * Al añadir un producto al catálogo, las 12 páginas se actualizan solas.
 */

import fs from 'fs';
import path from 'path';
import { esc, pagina, tituloSeo, icono, fila, pila, tarjetaProducto, tipoRed, PAISES, AVISO_AFILIADOS } from './catalogo.js';

const DIR = 'paises';

// Cómo es cada clavija, con las palabras de la guía de voltaje y clavija (fuente: WorldStandards)
const CLAVIJAS = {
  A: 'dos patas, sin tierra (15 A). Es la de 100–127 V, estilo EE.UU.',
  B: 'tres patas, con tierra (15 A). Su tomacorriente acepta clavijas A y B.',
  C: 'dos patas, para 220–240 V. Es muy común en Sudamérica.',
  F: 'dos patas con contactos de tierra a los lados (la europea, conocida como Schuko).',
  I: 'la de Argentina. Tiene forma propia: un adaptador pensado para Chile no sirve.',
  L: 'la de Chile (y de Italia). El tomacorriente de 10 A acepta clavijas C y L de 10 A; el de 16 A solo acepta la L de 16 A.',
  N: 'la de Brasil (norma NBR 14136). Su tomacorriente acepta clavijas C y N.',
};

const ZWAVE = {
  us: ['908,4 / 916 MHz', 'la misma que en Estados Unidos'],
  au: ['919,8 / 921,4 MHz', 'la de Australia y Nueva Zelanda, distinta de la de Estados Unidos'],
};

const FUENTES = [
  ['WorldStandards: enchufes y voltaje por país (voltaje, frecuencia y clavijas)', 'https://www.worldstandards.eu/electricity/plug-voltage-by-country/'],
  ['WorldStandards: tipos de enchufes y compatibilidad entre clavijas y tomacorrientes', 'https://www.worldstandards.eu/electricity/plugs-and-sockets/'],
  ['Silicon Labs: frecuencias Z-Wave por país', 'https://www.silabs.com/wireless/z-wave/global-regions'],
];

const pais = ([nombre, codigo, v, clavijas, grupo, slug, nominal, hz, zwave]) => ({
  nombre: nombre.replace('Rep. Dominicana', 'República Dominicana'), corto: nombre, codigo, v, grupo, slug, nominal, hz, zwave,
  clavijas: clavijas.split(', '),
});

// Texto de la red, tal como la escribimos en el resto del sitio
const redDe = (p) => (p.grupo === 'br' ? '127 V o 220 V, según la ciudad' : p.grupo === '110' ? `${p.nominal} V` : '220–240 V');
const rosca = (p) => (p.grupo === '110' ? 'E26' : p.grupo === '220' ? 'E27' : null);

// sirve | version (hay que elegir la del país) | ciudad (Brasil: depende del voltaje de la ciudad) | no
function veredicto(prod, p) {
  const tipo = tipoRed(prod);
  if (tipo === 'independiente' || tipo === 'universal') return 'sirve';
  if (tipo === 'versiones') return 'version';
  if (p.grupo === 'br') return 'ciudad';
  return prod.voltajes.includes(p.grupo) ? 'sirve' : 'no';
}

const datos = (filas) => `<dl class="group datos">
${filas.map(([dt, dd]) => `<div class="dato"><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join('\n')}
</dl>`;

function preguntas(p, cuenta) {
  const otra = p.grupo === '110' ? '220–240 V' : '110–120 V';
  const faq = [
    [`¿Qué voltaje y frecuencia tiene la red eléctrica en ${p.nombre}?`,
      p.grupo === 'br'
        ? `En ${p.nombre} no hay un voltaje único: según la ciudad es de 127 V o de 220 V, a ${p.hz} Hz. Confírmalo en tu factura de luz antes de comprar.`
        : `El valor nominal es de ${p.nominal} V a ${p.hz} Hz. En las fichas de producto busca ${p.grupo === '110' ? '«100–125 V», «120 V» o «100–240 V»' : '«220–240 V» o «100–240 V»'}.`],
    [`¿Qué clavija se usa en ${p.nombre}?`,
      `${p.clavijas.length > 1 ? 'Las clavijas' : 'La clavija'} de tipo ${p.clavijas.join(', ')}. Antes de comprar un enchufe inteligente, compara la foto del anuncio con el tomacorriente de tu casa.`],
  ];
  if (p.grupo !== 'br') {
    faq.push([`¿Puedo usar en ${p.nombre} un enchufe o foco inteligente de ${otra}?`,
      `No. Compra la versión hecha para ${redDe(p)}: de los ${cuenta.total} productos de nuestro catálogo, ${cuenta.no} son solo de ${otra} y no son para tu red.`]);
  }
  if (p.zwave) {
    faq.push([`¿Sirve en ${p.nombre} un dispositivo Z-Wave comprado en Estados Unidos?`,
      p.zwave === 'us'
        ? `Según Silicon Labs, ${p.nombre} usa ${ZWAVE.us[0]}, la misma frecuencia Z-Wave que EE.UU., así que la versión estadounidense es la que corresponde.`
        : `No es la que corresponde: según Silicon Labs, ${p.nombre} usa ${ZWAVE.au[0]}, ${ZWAVE.au[1]}. Compra la versión de tu región.`]);
  }
  return faq;
}

function paginaPais(p, todos, data, comparativas) {
  const { productos, categorias } = data;
  const por = (v) => productos.filter((x) => veredicto(x, p) === v);
  const sirven = por('sirve');
  const version = por('version');
  const ciudad = por('ciudad');
  const no = por('no');
  const cuenta = { total: productos.length, sirven: sirven.length, version: version.length, no: no.length };
  const en = `en ${p.nombre}`;
  const faq = preguntas(p, cuenta);
  // Clavija A o B en una red de 220–240 V: que el aparato entre no significa que sea de ese voltaje
  const clavijaEngana = p.grupo === '220' && p.clavijas.some((c) => c === 'A' || c === 'B');

  const bloques = Object.entries(categorias).map(([id, c]) => {
    const items = sirven.filter((x) => x.categoria === id);
    return items.length ? `<h3>${esc(c.nombre)} <span class="cuenta">${items.length}</span></h3>
<div class="grid">
${items.map((x) => tarjetaProducto(x, categorias)).join('\n')}
</div>` : '';
  }).filter(Boolean).join('\n');

  const filaProducto = (x, sub) => fila({ href: `/productos/${x.slug}`, titulo: x.nombre, sub, inicio: pila([x.categoria]) });
  const afines = comparativas.filter((c) => c.productos.some((s) => sirven.concat(version).some((x) => x.slug === s))
    && !c.productos.some((s) => no.some((x) => x.slug === s))).slice(0, 4);
  const otros = todos.filter((o) => o.slug !== p.slug);

  const body = `<div class="bc"><a href="/">Inicio</a> › <a href="/${DIR}/">Países</a> › ${esc(p.nombre)}</div>
<article class="article">
<p class="eyebrow">Domótica por país</p>
<h1>Domótica ${esc(en)}: voltaje, clavija y qué productos funcionan</h1>
<p class="lead">${p.grupo === 'br'
    ? `En ${esc(p.nombre)} la red es de ${esc(redDe(p))}, a ${esc(p.hz)} Hz, con clavijas de tipo ${esc(p.clavijas.join(' y '))}. Por eso conviene elegir aparatos de 100–240 V o la versión exacta del voltaje de tu ciudad.`
    : `La red eléctrica ${esc(en)} es de ${esc(p.nominal)} V a ${esc(p.hz)} Hz y usa ${p.clavijas.length > 1 ? 'clavijas' : 'la clavija'} de tipo ${esc(p.clavijas.join(', '))}. De los ${cuenta.total} productos de nuestro catálogo, <strong>${cuenta.sirven} funcionan tal cual</strong>${cuenta.version ? `, ${cuenta.version} tienen versiones por país` : ''} y ${cuenta.no} no son para tu red.`}</p>
<p class="links-list"><button type="button" class="btn secondary" data-elegir-pais="${esc(p.codigo)}">${icono('ubicacion')}Usar ${esc(p.corto)} en todo el sitio</button></p>

<h2 id="red">La red eléctrica ${esc(en)}</h2>
${datos([
    ['Voltaje nominal', p.grupo === 'br' ? '127 V o 220 V, según la ciudad' : `${p.nominal} V`],
    ['Frecuencia', `${p.hz} Hz`],
    ['Clavijas', `Tipo ${p.clavijas.join(', ')}`],
    ['Qué buscar en la ficha', p.grupo === '110' ? '100–125 V, 120 V o 100–240 V' : p.grupo === '220' ? '220–240 V o 100–240 V' : '100–240 V, o la versión del voltaje de tu ciudad'],
    ...(rosca(p) ? [['Rosca habitual de los focos', rosca(p)]] : []),
  ])}
<p class="muted small">Son los valores habituales según WorldStandards. Pueden variar en algunas zonas: confírmalos en tu casa.</p>
<h3>Cómo son las clavijas</h3>
<ul>
${p.clavijas.map((c) => `<li><strong>Tipo ${c}:</strong> ${esc(CLAVIJAS[c])}</li>`).join('\n')}
</ul>
${clavijaEngana ? `<div class="callout warn">${icono('alerta')}<p><strong>Ojo con las clavijas A y B.</strong> ${esc(p.nombre)} las usa, pero con una red de 220–240 V. Que un aparato importado entre en el tomacorriente no significa que sea de tu voltaje: revisa siempre que la ficha diga 220–240 V o 100–240 V.</p></div>` : ''}
${p.grupo === 'br' ? `<div class="callout warn">${icono('alerta')}<p><strong>No se distingue a simple vista.</strong> Los tomacorrientes de 127 V y de 220 V tienen el mismo formato. Confirma el voltaje en tu factura de luz o con tu distribuidora.</p></div>` : ''}

<h2 id="sirven">Productos que funcionan ${esc(en)} <span class="cuenta">${sirven.length}</span></h2>
<p>${p.grupo === 'br'
    ? 'Estos funcionan en cualquier ciudad: van a pilas o por USB, o aceptan de 100 a 240 V.'
    : `Son los que van a pilas o por USB, los que aceptan de 100 a 240 V y los fabricados para ${esc(redDe(p))}.`} En los enchufes, comprueba además que la clavija sea la de tu tomacorriente.</p>
${bloques}

${version.length ? `<h2 id="versiones">Tienen versiones por país: elige la tuya</h2>
<p>Se fabrican con distintos voltajes o clavijas. Para ${esc(p.nombre)} busca la de ${esc(redDe(p))} con clavija ${esc(p.clavijas.join(', '))}.</p>
<div class="group">
${version.map((x) => filaProducto(x, x.notaLatam)).join('\n')}
</div>` : ''}

${ciudad.length ? `<h2 id="ciudad">Dependen del voltaje de tu ciudad</h2>
<p>Están hechos para un solo voltaje. Sirven solo si coincide con el de tu ciudad.</p>
<div class="group">
${ciudad.map((x) => filaProducto(x, x.voltaje)).join('\n')}
</div>` : ''}

${no.length ? `<h2 id="no-sirven">No son para ${esc(p.nombre)} <span class="cuenta">${no.length}</span></h2>
<p>Están hechos para ${p.grupo === '110' ? '220–240 V' : '110–120 V'}. Los listamos para que no los compres por error.</p>
<div class="group">
${no.map((x) => filaProducto(x, x.voltaje)).join('\n')}
</div>` : ''}

<div class="callout warn">${icono('alerta')}<p><strong>Relés e interruptores.</strong> Aceptan de 100 a 240 V, pero se conectan a la instalación eléctrica de tu casa: si no tienes experiencia, contrata a un electricista.</p></div>

${p.zwave || p.codigo === 'CA' ? `<h2 id="z-wave">Z-Wave ${esc(en)}</h2>
<p>${p.zwave
    ? `Z-Wave usa una frecuencia distinta en cada región. Según Silicon Labs, ${esc(p.nombre)} usa <strong>${ZWAVE[p.zwave][0]}</strong>, ${ZWAVE[p.zwave][1]}.`
    : 'Z-Wave usa una frecuencia distinta en cada región, y aquí cambia de un país a otro. Según Silicon Labs, Guatemala, Honduras, Nicaragua y Panamá usan 908,4 / 916 MHz (la de EE.UU.); El Salvador y República Dominicana, 919,8 / 921,4 MHz; y Costa Rica, 922,5 / 923,9 / 926,3 MHz.'} Un dispositivo Z-Wave de otra región no es el que corresponde. Ningún producto de nuestro catálogo usa Z-Wave, así que esto solo te afecta si compras uno por tu cuenta. Más detalles en <a href="/articulos-editoriales/zigbee-vs-zwave-vs-wifi-2026">Zigbee vs Z-Wave vs WiFi</a>.</p>` : ''}

<h2 id="preguntas-frecuentes">Preguntas frecuentes</h2>
${faq.map(([q, r]) => `<details class="faq"><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('\n')}

<h2 id="sigue-leyendo">Sigue leyendo</h2>
<div class="group">
${fila({ href: '/articulos-editoriales/voltaje-clavija-rosca-antes-de-comprar-domotica-latinoamerica', antetitulo: 'Guía', titulo: '110–127 V o 220 V: qué revisar antes de comprar domótica', icono: 'libro' })}
${fila({ href: '/articulos-editoriales/comprar-domotica-amazon-aliexpress-latinoamerica', antetitulo: 'Guía', titulo: 'Comprar domótica en Amazon o AliExpress desde Latinoamérica', icono: 'libro' })}
${fila({ href: '/articulos-editoriales/primeros-5-dispositivos-casa-inteligente-latinoamerica', antetitulo: 'Guía', titulo: 'Los primeros 5 dispositivos para tu casa inteligente', icono: 'libro' })}
${afines.map((c) => fila({ href: `/comparativas/${c.slug}`, antetitulo: 'Comparativa', titulo: c.tituloCorto, icono: 'balanza' })).join('\n')}
</div>

<h2 id="otros-paises">Otros países</h2>
<p>${otros.map((o) => `<a href="/${DIR}/${esc(o.slug)}">${esc(o.corto)}</a>`).join(' · ')}</p>

<h2 id="fuentes">Fuentes</h2>
<ul class="small">
${FUENTES.map(([t, u]) => `<li><a href="${esc(u)}" rel="noopener nofollow">${esc(t)}</a></li>`).join('\n')}
<li>Voltaje y clavija de cada producto: su ficha en el <a href="/productos/">catálogo</a>, con datos del fabricante.</li>
</ul>
</article>
${AVISO_AFILIADOS}`;

  const ld = `  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
  }).replace(/</g, '\\u003c')}</script>`;

  const larga = `Qué enchufes, focos, sensores y relés inteligentes funcionan ${en}: red de ${redDe(p)}, clavija ${p.clavijas.join(', ')} y ${sirven.length} productos verificados.`;
  return pagina({
    title: tituloSeo(`Domótica ${en}: voltaje, clavija y qué comprar`.length <= 60 ? `Domótica ${en}: voltaje, clavija y qué comprar` : `Domótica ${en.replace('República Dominicana', 'Rep. Dominicana')}`),
    description: larga.length <= 155 ? larga : `Qué productos de domótica funcionan ${en}: red de ${redDe(p)} y clavija ${p.clavijas.join(', ')}.`,
    canonical: `/${DIR}/${p.slug}`,
    breadcrumbs: [['Inicio', '/'], ['Países', `/${DIR}/`], [p.nombre, `/${DIR}/${p.slug}`]],
    modificado: data.actualizado,
    body,
  }).replace('</head>', `${ld}\n</head>`);
}

function paginaIndice(todos, data) {
  const body = `<div class="bc"><a href="/">Inicio</a> › Países</div>
<p class="eyebrow">Domótica por país</p>
<h1>Domótica por país en Latinoamérica</h1>
<p class="lead">El voltaje y la clavija cambian de un país a otro, y con ellos qué enchufe, foco o relé inteligente puedes comprar. Elige tu país para ver su red eléctrica y qué productos de nuestro catálogo funcionan allí.</p>
<div class="group lista-articulos">
${todos.map((p) => fila({
    href: `/${DIR}/${p.slug}`, titulo: `Domótica en ${p.nombre}`,
    sub: `${redDe(p)} · ${p.hz} Hz · clavija ${p.clavijas.join(', ')}`, icono: 'ubicacion',
  })).join('\n')}
</div>
<p class="muted small nota-datos">Voltaje, frecuencia y clavijas según WorldStandards: son los valores habituales, confírmalos en tu casa. Más detalles en la guía <a href="/articulos-editoriales/voltaje-clavija-rosca-antes-de-comprar-domotica-latinoamerica">110–127 V o 220 V: qué revisar antes de comprar</a>.</p>
${AVISO_AFILIADOS}`;
  return pagina({
    title: tituloSeo('Domótica por país: voltaje y clavija'),
    description: `Voltaje, frecuencia y clavija de ${todos.length} países de Latinoamérica y qué enchufes, focos, sensores y relés inteligentes funcionan en cada uno.`,
    canonical: `/${DIR}/`,
    breadcrumbs: [['Inicio', '/'], ['Países', `/${DIR}/`]],
    modificado: data.actualizado,
    body,
  });
}

export function generarPaises(root) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'productos.json'), 'utf8'));
  const fComp = path.join(root, 'data', 'comparativas.json');
  const comparativas = fs.existsSync(fComp) ? JSON.parse(fs.readFileSync(fComp, 'utf8')).comparativas : [];
  const todos = PAISES.map(pais);
  // Las páginas dicen que ningún producto del catálogo usa Z-Wave: si algún día se añade uno, hay que cambiar ese texto
  const conZwave = data.productos.find((x) => x.protocolos.some((t) => /z-?wave/i.test(t)));
  if (conZwave) throw new Error(`Páginas por país: "${conZwave.slug}" usa Z-Wave; actualiza el texto de Z-Wave en scripts/paises.js`);
  for (const p of todos) for (const c of p.clavijas) if (!CLAVIJAS[c]) throw new Error(`País ${p.nombre}: falta describir la clavija "${c}" en CLAVIJAS (scripts/paises.js)`);
  const outDir = path.join(root, 'public', DIR);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of todos) fs.writeFileSync(path.join(outDir, `${p.slug}.html`), paginaPais(p, todos, data, comparativas), 'utf8');
  fs.writeFileSync(path.join(outDir, 'index.html'), paginaIndice(todos, data), 'utf8');
  console.log(`🌎 Países: ${todos.length} páginas`);
}
