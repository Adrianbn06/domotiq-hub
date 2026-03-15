// generate-tags.js — genera páginas /public/tags/*.html desde archive.json
// Ejecutar: node generate-tags.js
// Costo: $0 — no usa la API de Claude

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const archivePath = path.join(__dirname, 'data', 'archive.json');
const contentPath = path.join(__dirname, 'data', 'content.json');
const tagsDir    = path.join(__dirname, 'public', 'tags');

if (!fs.existsSync(tagsDir)) fs.mkdirSync(tagsDir, { recursive: true });

// Leer items
let items = [];
try {
  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  items = [...items, ...(archive.items || [])];
} catch(e) {}
try {
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  items = [...items, ...(content.items || [])];
} catch(e) {}

// Deduplicar por slug
const seen = new Set();
items = items.filter(i => {
  if (!i.slug || seen.has(i.slug)) return false;
  seen.add(i.slug);
  return true;
});

// Recopilar todos los tags
const tagMap = {};
items.forEach(item => {
  const tags = item.tags || [];
  tags.forEach(tag => {
    const key = tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!key || key.length < 2) return;
    if (!tagMap[key]) tagMap[key] = { label: tag, items: [] };
    tagMap[key].items.push(item);
  });
});

// Filtrar tags con al menos 2 artículos
const validTags = Object.entries(tagMap).filter(([,v]) => v.items.length >= 2);

console.log(`📦 ${items.length} artículos | ${validTags.length} tags válidos`);

const typeLabel = { news:'📡 Noticia', promo:'🏷️ Oferta', review:'⭐ Review', comparativa:'⚖️ Comparativa' };
const typeBg    = { news:'rgba(59,130,246,0.12)', promo:'rgba(245,158,11,0.12)', review:'rgba(167,139,250,0.12)', comparativa:'rgba(74,222,128,0.12)' };
const typeColor = { news:'#60a5fa', promo:'#f59e0b', review:'#a78bfa', comparativa:'#4ade80' };

function buildTagPage(slug, label, tagItems) {
  const cards = tagItems.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url || '#');
    const target = item.type === 'promo' ? '_blank' : '_self';
    const rel = item.type === 'promo' ? 'sponsored noopener' : 'noopener';
    const bg = typeBg[item.type] || typeBg.news;
    const color = typeColor[item.type] || typeColor.news;
    const label2 = typeLabel[item.type] || item.type;
    const tagSpans = (item.tags||[]).filter(t=>t!==label).slice(0,2)
      .map(t=>`<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.05);color:#94a3b8;">${t}</span>`).join('');
    return `<a href="${href}" target="${target}" rel="${rel}" style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;text-decoration:none;color:#e2e8f0;display:flex;flex-direction:column;gap:10px;transition:all 0.2s;animation:fadeUp 0.4s ease ${(i*0.04).toFixed(2)}s both;" onmouseover="this.style.borderColor='rgba(0,212,170,0.25)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)';this.style.transform='none'">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:5px;background:${bg};color:${color};">${label2}</span>
        <span style="font-size:11px;color:#64748b;font-family:monospace;">${item.date||item.archivedAt||''}</span>
      </div>
      <div style="font-size:14px;font-weight:600;line-height:1.4;">${item.title}</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">${(item.body||'').slice(0,160)}...</div>
      ${item.price ? `<div style="font-size:18px;font-weight:700;color:#f59e0b;font-family:monospace;">${item.price} ${item.discount?`<span style="font-size:12px;color:#f87171;">${item.discount}</span>`:''}</div>` : ''}
      ${tagSpans ? `<div style="display:flex;gap:5px;flex-wrap:wrap;">${tagSpans}</div>` : ''}
      <div style="font-size:12px;color:#00d4aa;font-weight:500;margin-top:auto;">${item.type==='promo'?'Ver oferta →':'Leer más →'}</div>
    </a>`;
  }).join('\n');

  const relatedTags = [...new Set(tagItems.flatMap(i => i.tags||[]))].filter(t => t !== label).slice(0, 10);
  const relatedHtml = relatedTags.map(t => {
    const s = t.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    return `<a href="/tags/${s}.html" style="font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.07);color:#94a3b8;text-decoration:none;background:#141c2e;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(0,212,170,0.3)';this.style.color='#00d4aa'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#94a3b8'">${t}</a>`;
  }).join('');

  const newsCount = tagItems.filter(i=>i.type==='news').length;
  const promoCount = tagItems.filter(i=>i.type==='promo').length;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${label} — Ofertas y Noticias de Domótica | OfertasDomoticas.com</title>
  <meta name="description" content="Toda la información sobre ${label} en domótica: ${newsCount} noticias y ${promoCount} ofertas. Análisis técnico de ${label} para smart home.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://ofertasdomoticas.com/tags/${slug}.html">
  <meta property="og:title" content="${label} — OfertasDomoticas.com">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"CollectionPage","name":"${label} — OfertasDomoticas.com","url":"https://ofertasdomoticas.com/tags/${slug}.html","description":"Noticias y ofertas sobre ${label} en domótica y smart home","isPartOf":{"@type":"WebSite","url":"https://ofertasdomoticas.com"}}
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html{scroll-behavior:smooth;}
    body{font-family:'Space Grotesk',sans-serif;background:#0a0e1a;color:#e2e8f0;line-height:1.6;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,212,170,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    header{background:rgba(10,14,26,0.95);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 24px;position:sticky;top:0;z-index:100;}
    .hi{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:62px;gap:28px;}
    .logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;font-size:18px;font-weight:700;}
    .logo-icon{width:34px;height:34px;background:linear-gradient(135deg,#00d4aa,#3b82f6);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:17px;}
    .logo em{font-style:normal;color:#00d4aa;}
    .back{color:#94a3b8;text-decoration:none;font-size:14px;margin-left:auto;transition:color 0.2s;}
    .back:hover{color:#00d4aa;}
    .w{max-width:1200px;margin:0 auto;padding:0 24px 80px;position:relative;z-index:1;}
    .bc{font-size:12px;color:#64748b;padding:20px 0 0;}
    .bc a{color:#64748b;text-decoration:none;}
    .bc a:hover{color:#00d4aa;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    footer{border-top:1px solid rgba(255,255,255,0.07);padding:24px;text-align:center;font-size:13px;color:#64748b;position:relative;z-index:1;}
    footer a{color:#64748b;text-decoration:none;margin:0 8px;}
    footer a:hover{color:#00d4aa;}
  </style>
</head>
<body>
<header>
  <div class="hi">
    <a href="/" class="logo"><div class="logo-icon">🏠</div>Ofertas<em>Domoticas</em></a>
    <a href="/" class="back">← Inicio</a>
  </div>
</header>
<div class="w">
  <div class="bc"><a href="/">Inicio</a> › <a href="/categorias.html">Categorías</a> › ${label}</div>

  <div style="padding:32px 0 20px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:28px;">
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;color:#00d4aa;margin-bottom:16px;">🏷️ Tag: ${label}</div>
    <h1 style="font-size:clamp(24px,3.5vw,38px);font-weight:700;letter-spacing:-0.5px;margin-bottom:10px;">${label} en domótica y smart home</h1>
    <p style="font-size:15px;color:#94a3b8;max-width:600px;line-height:1.7;margin-bottom:20px;">Todo el contenido sobre <strong style="color:#e2e8f0;">${label}</strong> — ${tagItems.length} artículos entre noticias y ofertas analizadas técnicamente.</p>
    <div style="display:flex;gap:24px;flex-wrap:wrap;">
      <div><span style="font-size:24px;font-weight:700;color:#00d4aa;font-family:monospace;">${newsCount}</span><div style="font-size:12px;color:#64748b;margin-top:2px;">noticias</div></div>
      <div><span style="font-size:24px;font-weight:700;color:#f59e0b;font-family:monospace;">${promoCount}</span><div style="font-size:12px;color:#64748b;margin-top:2px;">ofertas</div></div>
      <div><span style="font-size:24px;font-weight:700;color:#94a3b8;font-family:monospace;">${tagItems.length}</span><div style="font-size:12px;color:#64748b;margin-top:2px;">total</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:40px;">
    ${cards}
  </div>

  ${relatedHtml ? `<div style="margin-top:8px;padding-top:28px;border-top:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:12px;">Tags relacionados</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${relatedHtml}</div>
  </div>` : ''}
</div>
<footer>
  © 2026 OfertasDomoticas.com ·
  <a href="/">Inicio</a> · <a href="/categorias.html">Categorías</a> ·
  <a href="/glosario.html">Glosario</a> · <a href="/privacidad.html">Privacidad</a>
</footer>
</body>
</html>`;
}

let generated = 0;
validTags.forEach(([slug, {label, items: tagItems}]) => {
  const html = buildTagPage(slug, label, tagItems);
  fs.writeFileSync(path.join(tagsDir, `${slug}.html`), html, 'utf8');
  generated++;
});

// Generate tag index page
const indexCards = validTags.map(([slug, {label, items: tagItems}]) => {
  const n = tagItems.filter(i=>i.type==='news').length;
  const p = tagItems.filter(i=>i.type==='promo').length;
  return `<a href="/tags/${slug}.html" style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;text-decoration:none;color:#e2e8f0;display:flex;flex-direction:column;gap:8px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(0,212,170,0.25)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)'">
  <div style="font-size:15px;font-weight:600;">${label}</div>
  <div style="display:flex;gap:10px;font-size:12px;color:#64748b;">
    <span>📡 ${n} noticias</span><span>🏷️ ${p} ofertas</span>
  </div>
</a>`;
}).join('');

const tagIndex = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todos los Tags de Domótica | OfertasDomoticas.com</title>
  <meta name="description" content="Explora todo el contenido de OfertasDomoticas.com por etiqueta: Zigbee, Matter, Z-Wave, Thread, Alexa, Google Home y más.">
  <link rel="canonical" href="https://ofertasdomoticas.com/tags/">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Space Grotesk',sans-serif;background:#0a0e1a;color:#e2e8f0;line-height:1.6;}header{background:rgba(10,14,26,0.95);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 24px;}.hi{max-width:1200px;margin:0 auto;display:flex;align-items:center;height:62px;}.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;font-size:18px;font-weight:700;}.logo-icon{width:34px;height:34px;background:linear-gradient(135deg,#00d4aa,#3b82f6);border-radius:9px;display:flex;align-items:center;justify-content:center;}.logo em{font-style:normal;color:#00d4aa;}.w{max-width:1200px;margin:0 auto;padding:40px 24px 80px;}footer{border-top:1px solid rgba(255,255,255,0.07);padding:24px;text-align:center;font-size:13px;color:#64748b;}footer a{color:#64748b;text-decoration:none;margin:0 8px;}footer a:hover{color:#00d4aa;}</style>
</head>
<body>
<header><div class="hi"><a href="/" class="logo"><div class="logo-icon">🏠</div>Ofertas<em>Domoticas</em></a></div></header>
<div class="w">
  <div style="font-size:12px;color:#64748b;margin-bottom:24px;"><a href="/" style="color:#64748b;text-decoration:none;">Inicio</a> › Tags</div>
  <h1 style="font-size:36px;font-weight:700;letter-spacing:-1px;margin-bottom:10px;">Todos los tags</h1>
  <p style="font-size:15px;color:#94a3b8;margin-bottom:32px;">${generated} etiquetas — ${items.length} artículos indexados</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">${indexCards}</div>
</div>
<footer>© 2026 OfertasDomoticas.com · <a href="/">Inicio</a> · <a href="/categorias.html">Categorías</a> · <a href="/privacidad.html">Privacidad</a></footer>
</body></html>`;

fs.writeFileSync(path.join(tagsDir, 'index.html'), tagIndex, 'utf8');

console.log(`✅ ${generated} páginas de tags generadas en /public/tags/`);
console.log(`✅ Índice de tags: /public/tags/index.html`);
