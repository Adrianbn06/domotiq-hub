/**
 * scripts/seguridad.js - Comprobaciones de seguridad sobre las páginas ya generadas
 *
 * El sitio se sirve con una política de seguridad de contenido (CSP) estricta para todas las
 * direcciones (public/_headers): el navegador bloquea cualquier script o estilo en línea y
 * cualquier recurso de un dominio que no esté en la lista. Estas comprobaciones hacen que el
 * build falle antes de publicar algo que la CSP rompería o que abriría un hueco:
 *
 *  - scripts en línea, etiquetas <style>, atributos style="" y manejadores onclick="", oninput=""…
 *  - scripts cargados desde otro dominio (solo se permiten los del propio sitio)
 *  - enlaces o recursos con esquemas peligrosos o sin cifrar (javascript:, data:, http://, //otro-dominio)
 *  - enlaces que abren pestaña nueva sin rel="noopener"
 *  - que public/_headers siga aplicando la CSP a todo el sitio y sin 'unsafe-inline' / 'unsafe-eval'
 */

import fs from 'fs';
import path from 'path';

function listarHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) return listarHtml(f);
    return e.name.endsWith('.html') ? [f] : [];
  });
}

// Bloques de datos que el navegador no ejecuta: no les afecta la CSP
const TIPOS_DE_DATOS = new Set(['application/ld+json', 'application/json']);
const DESTINO_SEGURO = /^(https:\/\/|\/(?!\/)|#|mailto:)/;

const atributo = (etiqueta, nombre) => {
  const m = etiqueta.match(new RegExp(`\\s${nombre}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

export function comprobarSeguridad(publicDir) {
  const malos = [];

  for (const file of listarHtml(publicDir)) {
    const rel = path.relative(publicDir, file).split(path.sep).join('/');
    const html = fs.readFileSync(file, 'utf8');
    const fallo = (texto) => malos.push(`${rel}: ${texto}`);

    for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
      const src = atributo(m[0], 'src');
      const tipo = (atributo(m[0], 'type') || '').toLowerCase();
      if (src == null) {
        if (!TIPOS_DE_DATOS.has(tipo)) fallo('script en línea (muévelo a un archivo de public/assets/)');
      } else if (!/^\/(?!\/)/.test(src)) {
        fallo(`script de otro dominio: ${src}`);
      }
    }

    // El resto se mira sin el contenido de los <script> (los datos JSON pueden llevar cualquier texto)
    const cuerpo = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
    if (/<style\b/i.test(cuerpo)) fallo('etiqueta <style> (los estilos van en public/assets/catalogo.css)');

    for (const m of cuerpo.matchAll(/<[a-z][^<>]*>/gi)) {
      const etiqueta = m[0];
      if (/\sstyle\s*=/i.test(etiqueta)) fallo(`atributo style: ${etiqueta.slice(0, 90)}`);
      const manejador = etiqueta.match(/\s(on[a-z]+)\s*=/i);
      if (manejador) fallo(`manejador en línea ${manejador[1]}: ${etiqueta.slice(0, 90)}`);

      for (const nombre of ['href', 'src', 'action', 'formaction', 'poster', 'data']) {
        const valor = atributo(etiqueta, nombre);
        if (valor == null) continue;
        if (!DESTINO_SEGURO.test(valor.trim())) fallo(`${nombre} no permitido (solo https://, rutas del sitio, # o mailto:): ${valor.slice(0, 90)}`);
      }

      if (/^<a\b/i.test(etiqueta) && /\starget\s*=\s*"_blank"/i.test(etiqueta) && !/\brel\s*=\s*"[^"]*\bnoopener\b/i.test(etiqueta)) {
        fallo(`enlace con target="_blank" sin rel="noopener": ${etiqueta.slice(0, 90)}`);
      }
      if (/^<(iframe|object|embed|base)\b/i.test(etiqueta)) fallo(`etiqueta no permitida: ${etiqueta.slice(0, 60)}`);
    }
  }

  // La CSP debe cubrir todo el sitio (regla /*) y no relajarse
  const cabeceras = fs.readFileSync(path.join(publicDir, '_headers'), 'utf8').replace(/\r\n/g, '\n');
  const global = (cabeceras.split(/\n(?=\S)/).find((b) => b.startsWith('/*\n')) || '');
  if (!/^\s+Content-Security-Policy:/m.test(global)) malos.push('_headers: la regla /* debe incluir Content-Security-Policy');
  if (/'unsafe-inline'|'unsafe-eval'/.test(cabeceras)) malos.push("_headers: la CSP no debe llevar 'unsafe-inline' ni 'unsafe-eval'");

  if (malos.length) {
    const unicos = [...new Set(malos)];
    throw new Error(`Comprobación de seguridad (${unicos.length}):\n  ${unicos.slice(0, 40).join('\n  ')}`);
  }
  console.log('🔒 Seguridad: sin scripts ni estilos en línea, enlaces seguros y CSP en todo el sitio');
}
