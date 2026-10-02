/**
 * scripts/paginas.js - Páginas institucionales con la plantilla común (sin scripts en línea):
 * /aviso-legal, /privacidad, /nosotros, /contacto y la página 404.
 *
 * El texto es fijo (no viene de datos externos). Cambia ACTUALIZADO al modificar los textos legales.
 */

import fs from 'fs';
import path from 'path';
import { pagina, tituloSeo, AVISO_AFILIADOS } from './catalogo.js';

const ACTUALIZADO = '2 de octubre de 2026';
const CORREO = 'casainteligente06@hotmail.com';
const TELEGRAM = 'https://t.me/ofertas_domoticas';
const correo = `<a href="mailto:${CORREO}">${CORREO}</a>`;

const PAGINAS = {
  'aviso-legal': {
    title: tituloSeo('Aviso legal'),
    description: 'Aviso legal y condiciones de uso de OfertasDomoticas.com: titularidad, uso de la información, enlaces de afiliado y responsabilidad.',
    body: `<div class="bc"><a href="/">Inicio</a> › Aviso legal</div>
<article class="article">
<h1>Aviso legal y condiciones de uso</h1>
<p class="muted small">Última actualización: ${ACTUALIZADO}</p>

<h2>1. Titularidad del sitio</h2>
<p>Este sitio web, accesible en www.ofertasdomoticas.com, se publica bajo el nombre OfertasDomoticas.com. Para cualquier consulta puedes escribir a ${correo}.</p>

<h2>2. Qué es este sitio</h2>
<p>OfertasDomoticas.com es una web informativa sobre domótica para Latinoamérica: fichas de productos, comparativas, un comparador y guías. No vendemos productos ni gestionamos pedidos, pagos, envíos ni garantías. Las compras se realizan directamente en tiendas externas, bajo sus propias condiciones.</p>

<h2>3. Uso de la información</h2>
<p>Las especificaciones se obtienen de fuentes de los fabricantes y de tiendas, y marcamos como «sin confirmar» lo que no pudimos verificar. Aun así, los fabricantes cambian modelos y versiones, y pueden existir errores. Antes de comprar, comprueba en la tienda el modelo exacto, el voltaje y el tipo de clavija de tu país.</p>
<p>No mostramos precios exactos porque cambian a diario: los rangos de precio ($, $$, $$$) son orientativos.</p>

<h2>4. Seguridad eléctrica</h2>
<p>Algunos productos (relés, interruptores, termostatos) requieren trabajar con la instalación eléctrica de tu casa. La información de este sitio no sustituye a un profesional: si no tienes experiencia, contrata a un electricista. OfertasDomoticas.com no se hace responsable de daños derivados de instalaciones realizadas a partir de esta información.</p>

<h2>5. Enlaces de afiliado</h2>
<p>Algunos enlaces a tiendas (como Amazon o AliExpress) pueden ser enlaces de afiliado: si compras a través de ellos podemos recibir una pequeña comisión, sin coste adicional para ti. Esto no cambia el precio ni influye en qué productos analizamos o recomendamos.</p>
<p>En calidad de afiliado de Amazon, OfertasDomoticas.com obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.</p>

<h2>6. Marcas y propiedad intelectual</h2>
<p>Los nombres de productos y marcas citados (Sonoff, Aqara, TP-Link, Tapo, Kasa, Philips Hue, WiZ, Shelly, Tuya y otros) pertenecen a sus respectivos propietarios y se mencionan solo con fines informativos. Los textos y el diseño de este sitio pertenecen a OfertasDomoticas.com; puedes citarlos enlazando a la fuente.</p>

<h2>7. Enlaces externos</h2>
<p>Este sitio enlaza a páginas de terceros (tiendas, fabricantes, Telegram). No controlamos su contenido ni sus políticas, y no somos responsables de ellas.</p>

<h2>8. Privacidad</h2>
<p>El tratamiento de datos y el uso de cookies se explican en la <a href="/privacidad">política de privacidad</a>.</p>
</article>`,
  },

  privacidad: {
    title: tituloSeo('Política de privacidad y cookies'),
    description: 'Qué datos recoge OfertasDomoticas.com, cómo usamos Google Analytics (solo con tu consentimiento), Cloudflare y los enlaces de afiliado, y cuáles son tus derechos.',
    body: `<div class="bc"><a href="/">Inicio</a> › Privacidad</div>
<article class="article">
<h1>Política de privacidad y cookies</h1>
<p class="muted small">Última actualización: ${ACTUALIZADO}</p>
<p class="lead">Resumen: no tenemos formularios ni cuentas de usuario, y no vendemos datos. Solo medimos visitas de forma agregada, y Google Analytics únicamente se activa si lo aceptas.</p>

<h2>1. Responsable</h2>
<p>El responsable de este sitio es OfertasDomoticas.com. Puedes contactarnos en ${correo}.</p>

<h2>2. Qué datos se tratan</h2>
<ul class="verdict">
  <li><strong>Datos técnicos de conexión.</strong> El sitio se aloja en Cloudflare, que procesa datos técnicos como la dirección IP y el navegador para servir las páginas y proteger el sitio frente a ataques.</li>
  <li><strong>Estadísticas sin cookies (Cloudflare Web Analytics).</strong> Contamos visitas y páginas vistas de forma agregada, sin cookies y sin identificarte.</li>
  <li><strong>Google Analytics (solo si aceptas).</strong> Si aceptas en el aviso de cookies, Google Analytics 4 mide de forma estadística cómo se usa el sitio (páginas visitadas, país, tipo de dispositivo). Si no aceptas, no se carga.</li>
  <li><strong>Correo electrónico.</strong> Si nos escribes, usamos tu correo solo para responderte.</li>
</ul>
<p>No pedimos datos personales para usar el sitio y no los vendemos ni los cedemos a terceros.</p>

<h2 id="cookies">3. Cookies</h2>
<p>Este sitio solo usa cookies de Google Analytics, y únicamente si las aceptas:</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Nombre</th><th scope="col">Quién la pone</th><th scope="col">Para qué</th><th scope="col">Duración</th></tr></thead>
<tbody>
<tr><td>_ga</td><td>Google Analytics</td><td>Distinguir visitantes de forma anónima para las estadísticas</td><td>2 años</td></tr>
<tr><td>_ga_&lt;id&gt;</td><td>Google Analytics</td><td>Mantener el estado de la sesión de estadísticas</td><td>2 años</td></tr>
</tbody></table></div>
<p>Tu elección (aceptar o rechazar) se guarda en el almacenamiento local de tu navegador para no volver a preguntarte. Puedes cambiarla en cualquier momento: <a href="/privacidad#cookies" data-cookies>configurar cookies</a>. También puedes borrar las cookies desde la configuración de tu navegador.</p>

<h2>4. Enlaces a tiendas y servicios externos</h2>
<p>Cuando haces clic en un enlace a Amazon, AliExpress u otra tienda, sales de este sitio. Esas tiendas pueden usar sus propias cookies (por ejemplo, para atribuir una compra a un enlace de afiliado) y se rigen por sus propias políticas de privacidad. Lo mismo ocurre con el canal de Telegram.</p>

<h2>5. Tus derechos</h2>
<p>Según las leyes de protección de datos de tu país (por ejemplo, la Ley Orgánica de Protección de Datos Personales de Ecuador, la ley federal de México o la LGPD de Brasil), puedes pedir acceso, rectificación, eliminación u oposición al tratamiento de tus datos. Escríbenos a ${correo} y te responderemos.</p>

<h2>6. Cambios en esta política</h2>
<p>Si cambiamos cómo tratamos los datos (por ejemplo, si en el futuro mostramos anuncios), actualizaremos esta página y su fecha.</p>
</article>`,
  },

  nosotros: {
    title: tituloSeo('Sobre nosotros y cómo trabajamos'),
    description: 'Quiénes somos, cómo verificamos las especificaciones de cada producto, cómo se financia el sitio y por qué ponemos el foco en el voltaje de Latinoamérica.',
    body: `<div class="bc"><a href="/">Inicio</a> › Nosotros</div>
<article class="article">
<h1>Sobre OfertasDomoticas.com</h1>
<p class="lead">Somos un sitio de domótica práctica para Latinoamérica. Queremos que puedas automatizar tu casa sin comprar algo que no funcione en tu país, sin pagar de más y sin depender de reseñas pensadas para Estados Unidos o Europa.</p>

<h2>Cómo trabajamos</h2>
<ul class="verdict">
  <li><strong>Datos verificados.</strong> Cada especificación (voltaje, protocolo, batería, carga máxima, compatibilidad) sale de fuentes del fabricante o de tiendas serias. Lo que no podemos confirmar lo marcamos como «sin confirmar» en lugar de suponerlo.</li>
  <li><strong>Pensado para tu red eléctrica.</strong> Indicamos siempre si un producto es para 110–120 V o 220–240 V y qué clavija usa, porque es el error de compra más común en la región.</li>
  <li><strong>Sin precios inventados.</strong> No mostramos descuentos ni precios exactos: cambian a diario. Solo un rango orientativo y el enlace a la tienda.</li>
  <li><strong>También los contras.</strong> Cada ficha y comparativa incluye desventajas y para quién no es buena idea.</li>
  <li><strong>Herramientas de IA, con revisión.</strong> Usamos herramientas de inteligencia artificial para investigar y redactar. Cada publicación se revisa antes de salir y lista las fuentes que se usaron.</li>
</ul>

<h2>Cómo se financia el sitio</h2>
<p>El sitio es gratuito. Algunos enlaces a tiendas son de afiliado: si compras a través de ellos podemos recibir una pequeña comisión sin coste extra para ti. Ninguna marca paga por aparecer ni revisa nuestros textos antes de publicarlos. Más detalles en el <a href="/aviso-legal">aviso legal</a>.</p>

<h2>Por dónde empezar</h2>
<div class="links-list">
  <a class="btn" href="/productos/">Ver el catálogo</a>
  <a class="btn secondary" href="/comparativas/">Leer comparativas</a>
  <a class="btn secondary" href="/articulos-editoriales/que-es-la-domotica-como-empezar-menos-50">Guía para empezar</a>
</div>

<h2>¿Encontraste un error?</h2>
<p>Si un dato está mal o un producto cambió de versión, escríbenos a ${correo}. Lo revisamos y lo corregimos.</p>
</article>`,
  },

  contacto: {
    title: tituloSeo('Contacto'),
    description: 'Escríbenos para sugerir productos o comparativas, avisar de un error en una ficha o consultar sobre domótica en Latinoamérica.',
    body: `<div class="bc"><a href="/">Inicio</a> › Contacto</div>
<article class="article">
<h1>Contacto</h1>
<p class="lead">¿Quieres que comparemos un producto, encontraste un dato incorrecto o tienes una duda sobre domótica? Escríbenos.</p>
<div class="box">
  <h2 class="h-inline">Correo electrónico</h2>
  <p>${correo}</p>
  <p class="muted small">Intentamos responder lo antes posible. Indica tu país si tu consulta depende del voltaje o del tipo de enchufe.</p>
</div>
<h2>Sobre qué puedes escribirnos</h2>
<ul class="verdict">
  <li>Sugerencias de productos o comparativas que te gustaría ver.</li>
  <li>Errores en una ficha (un modelo cambió, una compatibilidad no es correcta…).</li>
  <li>Dudas sobre qué comprar para tu caso.</li>
</ul>
<h2>Telegram</h2>
<p>También puedes seguirnos en nuestro <a href="${TELEGRAM}" target="_blank" rel="noopener">canal de Telegram</a>.</p>
<p class="muted small">No pedimos ni guardamos datos personales más allá de tu correo cuando nos escribes. Consulta la <a href="/privacidad">política de privacidad</a>.</p>
</article>`,
  },

  '404': {
    title: 'Página no encontrada | OfertasDomoticas',
    description: 'La página que buscas no existe o cambió de dirección. Prueba con el catálogo, las comparativas o las guías de domótica.',
    robots: 'noindex, follow',
    body: `<article class="article">
<h1>Esta página no existe</h1>
<p class="lead">Puede que la dirección esté mal escrita o que la página haya cambiado de lugar. Prueba con alguna de estas secciones:</p>
<div class="links-list">
  <a class="btn" href="/productos/">Catálogo de productos</a>
  <a class="btn secondary" href="/comparativas/">Comparativas</a>
  <a class="btn secondary" href="/comparar">Comparador</a>
  <a class="btn secondary" href="/articulos-editoriales/">Guías</a>
  <a class="btn secondary" href="/">Inicio</a>
</div>
</article>`,
  },
};

export function generarPaginas(root) {
  for (const [slug, p] of Object.entries(PAGINAS)) {
    const html = pagina({
      title: p.title,
      description: p.description,
      canonical: slug === '404' ? '/' : `/${slug}`,
      robots: p.robots,
      breadcrumbs: slug === '404' ? undefined : [['Inicio', '/'], [p.title.replace(/ \| OfertasDomoticas$/, ''), `/${slug}`]],
      body: p.body + (slug === 'aviso-legal' || slug === 'privacidad' || slug === '404' ? '' : AVISO_AFILIADOS),
    });
    fs.writeFileSync(path.join(root, 'public', `${slug}.html`), html, 'utf8');
  }
  console.log(`📄 Páginas institucionales: ${Object.keys(PAGINAS).length}`);
}
