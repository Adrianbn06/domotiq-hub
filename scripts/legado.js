/**
 * scripts/legado.js - Mantiene al día las páginas antiguas escritas a mano
 *
 * El glosario y los artículos que aún no se reescribieron con data/guias.json son HTML fijo.
 * En cada build se les vuelve a poner la cabecera, el pie, los iconos y la lista de países
 * de la plantilla común, para que no se queden atrás cuando cambia el diseño.
 * Solo toca las páginas marcadas con <body class="legado">: cuando una guía se reescribe con
 * la plantilla, su página deja de tener esa marca y este script la ignora.
 */

import fs from 'fs';
import path from 'path';
import { cabecera, pie, SPRITE, DATOS_PAISES } from './catalogo.js';

// [archivo, sección activa en el menú]
const PAGINAS = [
  ['public/glosario.html', '/glosario'],
  ['public/alexa-vs-google-home-vs-homekit.html', '/articulos-editoriales/'],
];

const INICIO = '<!-- plantilla: inicio -->';
const FIN = '<!-- plantilla: fin -->';
const HOJA = '<link rel="stylesheet" href="/assets/catalogo.css">';

export function actualizarLegado(root) {
  let cambiadas = 0;
  for (const [rel, actual] of PAGINAS) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) continue;
    const original = fs.readFileSync(f, 'utf8');
    if (!original.includes('<body class="legado">')) continue;
    const crlf = original.includes('\r\n');
    let html = original.replace(/\r\n/g, '\n');

    const bloque = `${INICIO}\n${SPRITE}\n${DATOS_PAISES}\n${cabecera(actual)}\n${FIN}`;
    const i = html.indexOf(INICIO);
    const j = html.indexOf(FIN);
    if (i >= 0 && j > i) html = html.slice(0, i) + bloque + html.slice(j + FIN.length);
    else if (/<header class="top">[\s\S]*?<\/header>/.test(html)) html = html.replace(/<header class="top">[\s\S]*?<\/header>/, bloque);
    else throw new Error(`${rel}: no se encontró la cabecera de la plantilla`);

    if (!/<footer class="pie">[\s\S]*?<\/footer>/.test(html)) throw new Error(`${rel}: no se encontró el pie de la plantilla`);
    html = html.replace(/<footer class="pie">[\s\S]*?<\/footer>/, pie());
    if (!html.includes('/assets/pais.js')) {
      if (!html.includes(HOJA)) throw new Error(`${rel}: no carga la hoja de estilos común`);
      html = html.replace(HOJA, `${HOJA}\n  <script src="/assets/pais.js" defer></script>`);
    }

    const final = crlf ? html.replace(/\n/g, '\r\n') : html;
    if (final !== original) { fs.writeFileSync(f, final, 'utf8'); cambiadas++; }
  }
  console.log(`🗂️  Páginas antiguas: ${cambiadas} actualizadas con la plantilla común`);
}
