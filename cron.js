/**
 * cron.js - Generador de contenido con E-E-A-T, Long-Tail y páginas individuales
 *
 * Lunes:          resumen noticias semanales ~$0.032
 * Mar/Mié/Jue:    10 ofertas ~$0.032/día
 * Viernes:         5 ofertas + 3 reviews + 3 comparativas ~$0.093
 * Sáb/Dom:         10 ofertas ~$0.032/día
 * Costo mensual:   ~$1.24
 * Cada item genera su propia página HTML en /public/articulos/
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import 'dotenv/config';

const PRICE_HISTORY_FILE = './data/price-history.json';

// ─── HISTORIAL DE PRECIOS ─────────────────────────────────────────────────────
function loadPriceHistory() {
  try {
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf8'));
    }
  } catch {}
  return { prices: {}, lastUpdate: new Date().toISOString().split('T')[0] };
}

function savePriceHistory(history) {
  fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function updatePriceHistory(items) {
  const history = loadPriceHistory();
  const today = new Date().toISOString().split('T')[0];

  items.filter(i => i.type === 'promo' && i.price).forEach(item => {
    const key = item.slug || item.title.slice(0, 50);
    const price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) return;

    if (!history.prices[key]) {
      history.prices[key] = { title: item.title, records: [] };
    }

    history.prices[key].records.push({ date: today, price });

    // Mantener solo los últimos 90 días
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    history.prices[key].records = history.prices[key].records.filter(r =>
      new Date(r.date) > cutoff
    );
  });

  history.lastUpdate = today;
  savePriceHistory(history);
  return history;
}

function getPriceInsight(item, history) {
  if (!item.slug && !item.title) return null;
  const key = item.slug || item.title.slice(0, 50);
  const record = history.prices[key];
  if (!record || record.records.length < 3) return null;

  const currentPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
  if (isNaN(currentPrice)) return null;

  const prices = record.records.map(r => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  if (currentPrice <= minPrice * 1.02) {
    return { type: 'minimum', label: '🔥 Precio mínimo histórico', color: '#ef4444' };
  } else if (currentPrice <= avgPrice * 0.9) {
    return { type: 'low', label: '📉 Por debajo del precio medio', color: '#f59e0b' };
  } else if (currentPrice >= maxPrice * 0.98) {
    return { type: 'high', label: '📈 Precio alto — espera si puedes', color: '#64748b' };
  }
  return null;
}


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR     = process.env.VERCEL ? '/tmp' : './data';
const DATA_FILE    = process.env.VERCEL ? '/tmp/content.json' : './data/content.json';
const ARCHIVE_FILE = './data/archive.json';
const PAGES_DIR    = './public/articulos';

const today    = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── PROMPTS POR DÍA ─────────────────────────────────────────────────────────
// Lunes:       10 noticias resumen semanal
// Mar/Mié/Jue: 10 ofertas
// Viernes:     5 ofertas + 3 reviews + 3 comparativas
// Sáb/Dom:     10 ofertas

// LUNES — Resumen de las noticias más importantes de la semana
const PROMPT_LUNES_NOTICIAS = `Eres un experto en domótica y smart home. Fecha: ${today()}.
Busca en la web las 10 NOTICIAS MÁS IMPORTANTES de la última semana sobre domótica, IoT, smart home, Alexa, Google Home, Matter, Zigbee, Z-Wave.
Selecciona solo las que tienen mayor impacto técnico o comercial. Títulos long-tail específicos.
RESPONDE SOLO CON JSON VÁLIDO — sin markdown, sin texto extra:
{"items":[{"id":1,"type":"news","title":"Título técnico long-tail específico","body":"3-4 oraciones técnicas: protocolo involucrado, impacto real, compatibilidad con ecosistemas.","date":"${today()}","tags":["Matter"],"source":"The Verge","url":"URL REAL del artículo original","slug":"slug-url-amigable"}]}
IDs del 1 al 10. Exactamente 10 noticias.`;

// MAR/MIÉ/JUE/SÁB/DOM — 10 mejores ofertas del día
const PROMPT_OFERTAS_10 = `Eres un experto en domótica y smart home. Fecha: ${today()}.
Genera las 10 MEJORES OFERTAS del día en productos domóticos. Busca las más atractivas por precio y descuento.
Distribución: 4 Amazon (con &tag=domotiq-20), 3 eBay, 3 Alibaba.
Títulos long-tail técnicos con protocolo y ecosistema. Descripción con specs reales y ventajas concretas.
RESPONDE SOLO CON JSON VÁLIDO — sin markdown, sin texto extra:
{"items":[{"id":1,"type":"promo","title":"Producto + Protocolo + Ecosistema compatible","body":"Specs técnicas: protocolo, frecuencia, consumo standby, ecosistemas compatibles, por qué es mejor que Wi-Fi directo.","platform":"Amazon","price":"$34.99","originalPrice":"$59.99","discount":"-41%","date":"${today()}","featured":true,"protocol":"Zigbee 3.0","compatibility":["Alexa","Google Home","Home Assistant"],"slug":"slug-producto","url":"https://www.amazon.com/s?k=zigbee+smart+bulb&tag=domotiq-20"}]}
IDs del 1 al 10. Exactamente 10 ofertas. Las más atractivas primero (featured:true en las 3 mejores).`;

// VIERNES — 5 ofertas destacadas + 3 reviews + 3 comparativas
const PROMPT_VIERNES_OFERTAS = `Eres un experto en domótica con 10 años de experiencia. Fecha: ${today()}.
Genera las 5 MEJORES OFERTAS de la semana (las más destacadas, mayor descuento o mejor relación calidad-precio).
Distribución: 2 Amazon (&tag=domotiq-20), 2 eBay, 1 Alibaba.
RESPONDE SOLO CON JSON VÁLIDO:
{"items":[{"id":1,"type":"promo","title":"Producto técnico long-tail","body":"Specs detalladas: protocolo, frecuencia, consumo, ecosistemas, por qué comprar ahora.","platform":"Amazon","price":"$49.99","originalPrice":"$89.99","discount":"-44%","date":"${today()}","featured":true,"protocol":"Matter 1.2","compatibility":["Alexa","Google Home","HomeKit"],"slug":"slug","url":"https://www.amazon.com/s?k=matter+plug&tag=domotiq-20"}]}
IDs 1-5. Exactamente 5 ofertas.`;

const PROMPT_VIERNES_REVIEWS = `Eres un experto en domótica con 10 años de experiencia. Fecha: ${today()}.
Genera 3 REVIEWS TÉCNICAS DETALLADAS (400+ palabras cada una) de productos domóticos relevantes en 2026.
RESPONDE SOLO CON JSON VÁLIDO:
{"items":[{"id":6,"type":"review","title":"Review Técnica: [Producto] — Análisis Completo 2026","body":"Review de 400+ palabras: introducción y posicionamiento, specs técnicas completas (protocolo, frecuencia, consumo, cifrado), instalación, rendimiento real, integración con Alexa/Google/HomeKit/Home Assistant, ventajas técnicas detalladas, limitaciones reales, perfil de usuario ideal, comparación con alternativas, veredicto final con puntuación.","product":"Nombre exacto","brand":"Marca","rating":8.5,"protocol":"Zigbee 3.0","pros":["Ventaja técnica 1 con datos","Ventaja técnica 2","Ventaja técnica 3"],"cons":["Limitación 1 con contexto","Limitación 2"],"verdict":"Veredicto técnico en 2 oraciones.","date":"${today()}","tags":["Review Técnica"],"slug":"review-producto-2026","url":"https://www.amazon.com/s?k=producto&tag=domotiq-20"}]}
IDs 6-8. Exactamente 3 reviews.`;

const PROMPT_VIERNES_COMPARATIVAS = `Eres un experto en domótica con 10 años de experiencia. Fecha: ${today()}.
Genera 3 COMPARATIVAS TÉCNICAS DETALLADAS (400+ palabras cada una) entre productos o protocolos de domótica relevantes en 2026.
RESPONDE SOLO CON JSON VÁLIDO:
{"items":[{"id":9,"type":"comparativa","title":"Producto A vs Producto B: ¿Cuál Elegir en 2026?","body":"Comparativa de 400+ palabras: introducción técnica a ambos, tabla de especificaciones (frecuencia, topología, alcance, latencia, max nodos, cifrado, consumo), ventajas técnicas de A, ventajas de B, escenario ideal para A, escenario ideal para B, coste total de implementación, compatibilidad con Home Assistant, recomendación final por perfil de usuario.","product_a":"Producto A","product_b":"Producto B","winner":"Ganador general","winner_reason":"Por qué gana con datos técnicos.","date":"${today()}","tags":["Comparativa Técnica"],"slug":"comparativa-a-vs-b-2026","url":"https://www.amazon.com/s?k=smart+home&tag=domotiq-20"}]}
IDs 9-11. Exactamente 3 comparativas.`;

const todayISO = () => new Date().toISOString().split('T')[0];

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}



// ─── GENERADOR DE PÁGINAS INDIVIDUALES ───────────────────────────────────────
function generateArticlePage(item, allItems = []) {
  const canonicalUrl = `https://ofertasdomoticas.com/articulos/${item.slug}.html`;
  const typeLabels = { news: 'Noticia', promo: 'Oferta', review: 'Review', comparativa: 'Comparativa' };
  const typeIcons  = { news: '📡', promo: '🏷️', review: '⭐', comparativa: '⚖️' };
  const typeColors = { news: '#3b82f6', promo: '#f59e0b', review: '#a78bfa', comparativa: '#4ade80' };

  const color = typeColors[item.type] || '#00d4aa';
  const label = typeLabels[item.type] || item.type;
  const icon  = typeIcons[item.type]  || '📄';

  // Protocolo y compatibilidad (para ofertas y reviews)
  const protocolHtml = item.protocol ? `
    <div class="meta-tag">🔌 ${item.protocol}</div>` : '';
  const compatHtml = item.compatibility ? `
    <div class="compat">
      <strong>Compatible con:</strong> ${item.compatibility.map(c => `<span class="compat-badge">${c}</span>`).join('')}
    </div>` : '';

  // Puntuación para reviews
  const ratingHtml = item.rating ? `
    <div class="rating-box">
      <span class="rating-num">${item.rating}</span>
      <span class="rating-max">/10</span>
      <span class="rating-label">Puntuación técnica</span>
    </div>` : '';

  // Pros y cons para reviews
  const prosConsHtml = (item.pros || item.cons) ? `
    <div class="pros-cons-grid">
      ${item.pros ? `<div class="pros-box"><h3>✅ Ventajas</h3><ul>${item.pros.map(p => `<li>${p}</li>`).join('')}</ul></div>` : ''}
      ${item.cons ? `<div class="cons-box"><h3>❌ Limitaciones</h3><ul>${item.cons.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''}
    </div>` : '';

  // Veredicto para reviews
  const verdictHtml = item.verdict ? `
    <div class="verdict-box">
      <strong>🏆 Veredicto:</strong> ${item.verdict}
    </div>` : '';

  // Ganador para comparativas
  const winnerHtml = item.winner ? `
    <div class="winner-box">
      <strong>🏆 Ganador:</strong> ${item.winner} — ${item.winner_reason || ''}
    </div>` : '';

  // Precio para ofertas
  const priceHtml = item.price ? `
    <div class="price-section">
      <span class="price-main">${item.price}</span>
      ${item.originalPrice ? `<span class="price-old">${item.originalPrice}</span>` : ''}
      ${item.discount ? `<span class="price-discount">${item.discount}</span>` : ''}
      <a href="${item.url}" target="_blank" rel="sponsored noopener" class="buy-btn">
        Ver oferta en ${item.platform} →
      </a>
    </div>` : '';

  // Schema JSON-LD específico por tipo
  // ─── FAQ dinámico por tipo ─────────────────────────────────────────────────
  const faqData = {
    news: [
      { q: '¿Cómo afecta esta noticia al mercado del hogar inteligente?', a: item.body },
      { q: '¿Es compatible con los sistemas domóticos actuales?', a: 'Los principales ecosistemas como Alexa, Google Home y Apple HomeKit están adoptando el estándar Matter, lo que garantiza compatibilidad entre marcas.' },
      { q: '¿Dónde puedo encontrar más información sobre este tema?', a: `Puedes leer el artículo completo en la fuente original${item.source ? ' (' + item.source + ')' : ''} y seguir las novedades en OfertasDomoticas.com.` }
    ],
    promo: [
      { q: `¿Vale la pena comprar ${item.product || item.title}?`, a: item.body },
      { q: '¿Con qué asistentes de voz es compatible?', a: item.compatibility ? 'Es compatible con: ' + item.compatibility.join(', ') + '.' : 'Consulta la descripción del producto para ver la compatibilidad exacta con Alexa, Google Home y Apple HomeKit.' },
      { q: '¿Cuánto tiempo durará esta oferta?', a: 'Las ofertas de domótica pueden cambiar en cualquier momento. Te recomendamos aprovecharla cuanto antes si el precio te parece adecuado.' },
      { q: `¿Qué protocolo usa ${item.product || item.title}?`, a: item.protocol ? `Este dispositivo usa el protocolo ${item.protocol}, que ofrece mayor estabilidad y menor interferencia con tu red Wi-Fi doméstica.` : 'Consulta las especificaciones técnicas del producto para conocer el protocolo de comunicación.' }
    ],
    review: [
      { q: `¿Es recomendable ${item.product || item.title}?`, a: item.verdict || item.body.slice(0, 200) },
      { q: '¿Funciona con Home Assistant sin suscripción en la nube?', a: 'La compatibilidad con Home Assistant depende del protocolo del dispositivo. Los dispositivos Zigbee, Z-Wave y Matter suelen funcionar localmente sin necesidad de nube.' },
      { q: '¿Cuáles son las principales desventajas?', a: item.cons ? item.cons.join('. ') : 'Consulta la sección de desventajas en esta review para conocer las limitaciones del producto.' }
    ],
    comparativa: [
      { q: `¿Cuál es mejor, ${item.product_a || 'opción A'} o ${item.product_b || 'opción B'}?`, a: item.winner_reason || item.body.slice(0, 200) },
      { q: '¿Cuál tiene mejor relación calidad-precio?', a: 'Depende de tu caso de uso. Lee la comparativa completa para ver cuál se adapta mejor a tu hogar y presupuesto.' },
      { q: '¿Son compatibles entre sí estos dispositivos?', a: 'Con el estándar Matter ambos ecosistemas pueden coexistir. Sin embargo, para integración avanzada te recomendamos usar Home Assistant como hub central.' }
    ]
  };

  const faqs = faqData[item.type] || faqData.news;
  const faqHtml = `
    <section class="faq-section" style="margin-top:40px;">
      <h2 style="font-size:20px;font-weight:600;color:#e2e8f0;margin-bottom:20px;">Preguntas frecuentes</h2>
      ${faqs.map(faq => `
        <details style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:10px;overflow:hidden;">
          <summary style="padding:14px 18px;cursor:pointer;font-size:14px;font-weight:500;color:#e2e8f0;list-style:none;display:flex;justify-content:space-between;align-items:center;">
            ${faq.q}
            <span style="color:#00d4aa;font-size:18px;flex-shrink:0;margin-left:12px;">+</span>
          </summary>
          <div style="padding:0 18px 14px;font-size:14px;color:#94a3b8;line-height:1.7;">${faq.a}</div>
        </details>`).join('')}
    </section>`;

  const faqSchemaJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a }
    }))
  });

  // ─── Artículos relacionados ──────────────────────────────────────────────────
  const related = allItems
    .filter(r => r.slug && r.slug !== item.slug && r.type === item.type)
    .slice(0, 3);

  const relatedHtml = related.length > 0 ? `
    <section style="margin-top:40px;padding-top:32px;border-top:1px solid rgba(255,255,255,0.07);">
      <h2 style="font-size:18px;font-weight:600;color:#e2e8f0;margin-bottom:16px;">
        ${item.type === 'promo' ? '🏷️ Más ofertas relacionadas' : item.type === 'news' ? '📡 Más noticias' : '⭐ Más reviews'}
      </h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        ${related.map(r => `
          <a href="/articulos/${r.slug}.html" style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-decoration:none;color:#e2e8f0;display:block;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(0,212,170,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)'">
            <div style="font-size:12px;color:#00d4aa;margin-bottom:6px;">${r.type === 'promo' ? '🏷️ Oferta' : r.type === 'news' ? '📡 Noticia' : '⭐ Review'}</div>
            <div style="font-size:13px;font-weight:500;line-height:1.4;">${r.title.slice(0,80)}${r.title.length > 80 ? '...' : ''}</div>
            ${r.price ? `<div style="font-size:14px;font-weight:700;color:#f59e0b;margin-top:8px;">${r.price}</div>` : ''}
          </a>`).join('')}
      </div>
    </section>` : '';

  let schemaJson = '';
  if (item.type === 'promo') {
    schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": item.title,
      "description": item.body,
      "offers": {
        "@type": "Offer",
        "url": canonicalUrl,
        "priceCurrency": "USD",
        "price": item.price ? item.price.replace(/[^0-9.]/g,'') : "0",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": item.platform || "Amazon" }
      }
    });
  } else if (item.type === 'review') {
    schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Review",
      "name": item.title,
      "reviewBody": item.body,
      "datePublished": item.date,
      "author": { "@type": "Organization", "name": "OfertasDomoticas.com" },
      "itemReviewed": { "@type": "Product", "name": item.product || item.title },
      "reviewRating": item.rating ? {
        "@type": "Rating", "ratingValue": item.rating, "bestRating": 10
      } : undefined
    });
  } else if (item.type === 'news') {
    schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": item.title,
      "description": item.body,
      "datePublished": new Date().toISOString(),
      "author": { "@type": "Organization", "name": "OfertasDomoticas.com" },
      "publisher": { "@type": "Organization", "name": "OfertasDomoticas.com",
        "logo": { "@type": "ImageObject", "url": "https://ofertasdomoticas.com/og-image.png" }
      },
      "keywords": (item.tags || []).join(', ')
    });
  } else {
    schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": item.title,
      "description": item.body.slice(0, 200),
      "datePublished": new Date().toISOString(),
      "author": { "@type": "Organization", "name": "OfertasDomoticas.com" }
    });
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${item.title} | OfertasDomoticas.com</title>
  <meta name="description" content="${item.body.slice(0, 155).replace(/"/g, '&quot;')}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${item.title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${item.body.slice(0, 155).replace(/"/g, '&quot;')}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="OfertasDomoticas.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">${schemaJson}</script>
  <style>
    :root { --accent:#00d4aa; --bg:#0a0e1a; --card:#141c2e; --text:#e2e8f0; --muted:#64748b; --border:rgba(255,255,255,0.07); }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Space Grotesk',sans-serif; background:var(--bg); color:var(--text); line-height:1.7; }
    body::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(0,212,170,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.03) 1px,transparent 1px); background-size:40px 40px; pointer-events:none; z-index:0; }
    .wrapper { max-width:800px; margin:0 auto; padding:40px 20px; position:relative; z-index:1; }
    .back { display:inline-flex; align-items:center; gap:6px; color:var(--accent); text-decoration:none; font-size:14px; margin-bottom:28px; padding:8px 16px; border:1px solid rgba(0,212,170,0.3); border-radius:8px; transition:all 0.2s; }
    .back:hover { background:rgba(0,212,170,0.08); }
    .type-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 14px; border-radius:100px; font-size:12px; font-weight:600; letter-spacing:0.4px; margin-bottom:16px; background:rgba(${color === '#3b82f6' ? '59,130,246' : color === '#f59e0b' ? '245,158,11' : color === '#a78bfa' ? '167,139,250' : '74,222,128'},.15); color:${color}; border:1px solid ${color}33; }
    .breadcrumb { font-size:12px; color:var(--muted); margin-bottom:16px; }
    .breadcrumb a { color:var(--muted); text-decoration:none; }
    .breadcrumb a:hover { color:var(--accent); }
    h1 { font-size:clamp(22px,4vw,34px); font-weight:700; line-height:1.25; letter-spacing:-0.5px; margin-bottom:16px; }
    .meta { display:flex; align-items:center; gap:16px; color:var(--muted); font-size:13px; margin-bottom:24px; flex-wrap:wrap; }
    .meta-tag { background:rgba(255,255,255,0.05); padding:3px 10px; border-radius:6px; font-size:12px; }
    .compat { margin:12px 0; font-size:13px; color:var(--muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .compat-badge { background:rgba(0,212,170,0.1); color:var(--accent); padding:2px 10px; border-radius:6px; font-size:12px; font-weight:500; }
    .article-body { font-size:16px; color:#cbd5e1; line-height:1.85; margin:24px 0; }
    .rating-box { display:flex; align-items:baseline; gap:6px; margin:20px 0; padding:16px 20px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:12px; }
    .rating-num { font-size:42px; font-weight:700; color:#f59e0b; font-variant-numeric:tabular-nums; }
    .rating-max { font-size:20px; color:var(--muted); }
    .rating-label { font-size:14px; color:var(--muted); margin-left:8px; }
    .pros-cons-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:24px 0; }
    .pros-box, .cons-box { padding:16px; border-radius:12px; }
    .pros-box { background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.2); }
    .cons-box { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.2); }
    .pros-box h3 { color:#4ade80; font-size:14px; margin-bottom:10px; }
    .cons-box h3 { color:#f87171; font-size:14px; margin-bottom:10px; }
    .pros-box li, .cons-box li { font-size:13px; color:var(--muted); margin-bottom:6px; margin-left:16px; line-height:1.6; }
    .verdict-box { background:rgba(0,212,170,0.06); border-left:3px solid var(--accent); padding:14px 18px; border-radius:0 10px 10px 0; margin:20px 0; font-size:15px; }
    .winner-box { background:rgba(245,158,11,0.08); border-left:3px solid #f59e0b; padding:14px 18px; border-radius:0 10px 10px 0; margin:20px 0; font-size:15px; }
    .price-section { display:flex; align-items:center; gap:12px; margin:24px 0; flex-wrap:wrap; padding:20px; background:var(--card); border-radius:14px; border:1px solid var(--border); }
    .price-main { font-size:28px; font-weight:700; color:#f59e0b; font-family:monospace; }
    .price-old { font-size:16px; color:var(--muted); text-decoration:line-through; }
    .price-discount { background:rgba(239,68,68,0.12); color:#f87171; padding:4px 10px; border-radius:6px; font-size:13px; font-weight:600; }
    .buy-btn { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,var(--accent),#00a884); color:#000; font-weight:600; font-size:14px; padding:10px 22px; border-radius:10px; text-decoration:none; margin-left:auto; transition:all 0.2s; }
    .buy-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,212,170,0.3); }
    .source-link { display:inline-flex; align-items:center; gap:6px; color:var(--accent); text-decoration:none; font-size:14px; padding:10px 18px; border:1px solid rgba(0,212,170,0.3); border-radius:8px; margin-top:20px; transition:all 0.2s; }
    .source-link:hover { background:rgba(0,212,170,0.08); }
    .related { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
    .related h3 { font-size:18px; font-weight:600; margin-bottom:16px; }
    .related-link { display:block; color:var(--accent); text-decoration:none; font-size:14px; padding:10px 0; border-bottom:1px solid var(--border); }
    .related-link:hover { color:#fff; }
    @media(max-width:600px) { .pros-cons-grid { grid-template-columns:1fr; } .buy-btn { margin-left:0; width:100%; justify-content:center; } }
  </style>
</head>
<body>
<div class="wrapper">
  <a href="/" class="back">← Volver a OfertasDomoticas.com</a>

  <nav class="breadcrumb">
    <a href="/">Inicio</a> › <a href="/#${item.type === 'news' ? 'noticias' : item.type === 'promo' ? 'descuentos' : 'archivo'}">${label}s</a> › ${item.title.slice(0, 50)}...
  </nav>

  <div class="type-badge">${icon} ${label}</div>

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
    <span style="font-size:12px;color:#94a3b8;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:6px;">⏱ \${estimateReadingTime(item.body)}</span>
    <span style="font-size:12px;color:#94a3b8;">📅 \${item.date||''}</span>
    \${item.source ? '<span style="font-size:12px;color:#94a3b8;">📰 '+item.source+'</span>' : ''}
  </div>

  <h1>\${item.title}</h1>

  \${generateTOC(item)}

  <div class="meta">
    ${item.tags ? item.tags.map(t => `<span class="meta-tag">${t}</span>`).join('') : ''}
  </div>

  ${protocolHtml}
  ${compatHtml}
  ${priceHtml}
  ${ratingHtml}

  <div class="article-body">${item.body}</div>

  ${prosConsHtml}
  ${verdictHtml}
  ${winnerHtml}

  ${item.type === 'news' && item.url && item.url !== '#' ? `
  <a href="${item.url}" target="_blank" rel="noopener" class="source-link">
    🔗 Leer artículo completo en ${item.source || 'la fuente original'} →
  </a>` : ''}

  ${faqHtml}
  ${relatedHtml}

  <div class="related" style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);">
    <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Explorar más</h3>
    <a href="/#descuentos" class="related-link">🔥 Ver todas las ofertas del día</a>
    <a href="/#noticias" class="related-link">📡 Últimas noticias de domótica</a>
    <a href="/#archivo" class="related-link">📚 Archivo de reviews y comparativas</a>
  </div>
</div>
<script type="application/ld+json">${faqSchemaJson}</script>
</body>
</html>`;
}

// ─── ARCHIVO HISTÓRICO ────────────────────────────────────────────────────────
function loadArchive() {
  try {
    if (fs.existsSync(ARCHIVE_FILE)) return JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
  } catch {}
  return { items: [], lastPurge: todayISO() };
}

function saveArchive(archive) {
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
}

function updateArchive(newItems) {
  const archive = loadArchive();
  newItems.forEach(item => { item.archivedAt = todayISO(); archive.items.push(item); });

  // Purgar items de más de 6 meses
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const lastPurge = new Date(archive.lastPurge || '2020-01-01');

  if ((new Date() - lastPurge) > 30 * 24 * 60 * 60 * 1000) {
    const before = archive.items.length;
    archive.items = archive.items.filter(i => new Date(i.archivedAt || '2020-01-01') > sixMonthsAgo);
    archive.lastPurge = todayISO();
    const removed = before - archive.items.length;
    if (removed > 0) console.log(`🗑️ Archivo: eliminados ${removed} items de más de 6 meses`);
  }

  saveArchive(archive);
  console.log(`📚 Archivo: ${archive.items.length} items acumulados`);
  return archive;
}

// ─── GENERACIÓN DE PÁGINAS INDIVIDUALES ──────────────────────────────────────
function generatePages(items) {
  const allItems = items; // pass to article pages for related articles
  if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

  let generated = 0;
  for (const item of items) {
    if (!item.slug) {
      item.slug = slugify(item.title);
    }
    const filePath = path.join(PAGES_DIR, `${item.slug}.html`);
    // No sobreescribir páginas existentes (preservar contenido histórico)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, generateArticlePage(item, allItems), 'utf8');
      generated++;
    }
  }
  console.log(`📄 Páginas generadas: ${generated} nuevas`);
  return generated;
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

// ─── CANAL DE TELEGRAM ───────────────────────────────────────────────────────
async function sendToTelegram(items) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('ℹ️  Telegram no configurado (faltan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID)');
    return;
  }

  // Seleccionar las 3 mejores ofertas (featured + mayor descuento)
  const topDeals = items
    .filter(i => i.type === 'promo' && i.price)
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const da = parseInt((a.discount||'0').replace(/[^0-9]/g,''));
      const db = parseInt((b.discount||'0').replace(/[^0-9]/g,''));
      return db - da;
    })
    .slice(0, 3);

  if (topDeals.length === 0) return;

  const icon = p => p === 'Amazon' ? '🛒' : p === 'eBay' ? '🏪' : '🌐';
  const date = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long' });

  let message = `🏠 *Mejores ofertas de domótica — ${date}*

`;

  topDeals.forEach((deal, i) => {
    message += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} *${deal.title}*
`;
    message += `💰 ${deal.price}`;
    if (deal.originalPrice) message += ` ~~${deal.originalPrice}~~`;
    if (deal.discount) message += ` *${deal.discount}*`;
    message += `
${icon(deal.platform)} ${deal.platform}
`;
    if (deal.protocol) message += `🔌 Protocolo: ${deal.protocol}
`;
    message += `[Ver oferta →](${deal.url})

`;
  });

  message += `📡 Más ofertas y noticias en [OfertasDomoticas.com](https://ofertasdomoticas.com)`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        })
      }
    );
    const result = await response.json();
    if (result.ok) {
      console.log('📱 Telegram: mensaje enviado al canal');
    } else {
      console.warn('⚠️  Telegram error:', result.description);
    }
  } catch (err) {
    console.warn('⚠️  Telegram error:', err.message);
  }
}

// ─── HELPER: UNA LLAMADA A LA API ────────────────────────────────────────────
async function callAPI(prompt, maxTokens) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error API ${res.status}: ${errText}`);
    }
    const data = await res.json();
    let text = '';
    for (const block of data.content || []) {
      if (block.type === 'text') text += block.text;
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

export async function generateContent() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY en .env');

  // Determinar modo según día de la semana
  // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  const dayOfWeek = new Date().getDay();
  const modos = { 0:'DOMINGO (ofertas)', 1:'LUNES (resumen noticias)', 2:'MARTES (ofertas)', 3:'MIÉRCOLES (ofertas)', 4:'JUEVES (ofertas)', 5:'VIERNES (ofertas+reviews+comparativas)', 6:'SÁBADO (ofertas)' };
  console.log(`[${new Date().toISOString()}] 🤖 Generando — ${modos[dayOfWeek]}`);

  let rawText = '';

  if (dayOfWeek === 1) {
    // LUNES: resumen semanal de noticias
    console.log('📰 Generando resumen semanal de noticias...');
    rawText = await callAPI(PROMPT_LUNES_NOTICIAS, 2500);

  } else if (dayOfWeek === 5) {
    // VIERNES: 5 ofertas + 3 reviews + 3 comparativas (3 llamadas separadas)
    console.log('🏷️  Generando ofertas destacadas de la semana...');
    const rawOfertas = await callAPI(PROMPT_VIERNES_OFERTAS, 2000);

    console.log('⏳ Pausa 65s (rate limit)...');
    await new Promise(r => setTimeout(r, 65000));

    console.log('⭐ Generando reviews técnicas...');
    const rawReviews = await callAPI(PROMPT_VIERNES_REVIEWS, 3500);

    console.log('⏳ Pausa 65s (rate limit)...');
    await new Promise(r => setTimeout(r, 65000));

    console.log('⚖️  Generando comparativas técnicas...');
    const rawComparativas = await callAPI(PROMPT_VIERNES_COMPARATIVAS, 3500);

    rawText = rawOfertas + '\n' + rawReviews + '\n' + rawComparativas;

  } else {
    // MAR / MIÉ / JUE / SÁB / DOM: 10 ofertas
    console.log('🏷️  Generando 10 mejores ofertas del día...');
    rawText = await callAPI(PROMPT_OFERTAS_10, 2500);
  }

  // Limpiar <cite> tags que Claude a veces inyecta en el body
  rawText = rawText.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '');

  // Parser robusto — limpia el JSON antes de parsear
  let jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Sin JSON en respuesta: ${rawText.slice(0, 300)}`);

  let jsonStr = jsonMatch[0];

  // Limpiar caracteres problemáticos comunes en respuestas de IA
  jsonStr = jsonStr
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // caracteres de control
    .replace(/,\s*([}\]])/g, '$1')                    // comas finales
    .replace(/([{,]\s*)"([^"]+)"\s*:\s*undefined/g, '') // valores undefined
    .trim();

  // Intentar parsear — si falla, extraer solo los items válidos
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch(parseErr) {
    console.warn('⚠️  JSON con errores, intentando recuperar items válidos...');
    // Extraer items individuales que sí sean válidos
    const itemMatches = jsonStr.match(/\{[^{}]*"type"[^{}]*\}/g) || [];
    const validItems = [];
    for (const itemStr of itemMatches) {
      try {
        const item = JSON.parse(itemStr);
        if (item.type && item.title) validItems.push(item);
      } catch {}
    }
    if (validItems.length === 0) throw new Error(`JSON inválido y sin items recuperables: ${parseErr.message}`);
    console.log(`✅ Recuperados ${validItems.length} items válidos del JSON dañado`);
    parsed = { items: validItems };
  }

  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('JSON sin campo items');

  // Asegurar que todos los items tienen slug
  parsed.items.forEach(item => {
    if (!item.slug) item.slug = slugify(item.title);
  });

  const result = {
    generated: new Date().toISOString(),
    generatedHuman: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    mode: dayOfWeek === 5 ? 'long' : dayOfWeek === 1 ? 'news' : 'offers',
    count: parsed.items.length,
    newsCount:       parsed.items.filter(i => i.type === 'news').length,
    promoCount:      parsed.items.filter(i => i.type === 'promo').length,
    reviewCount:     parsed.items.filter(i => i.type === 'review').length,
    comparativaCount:parsed.items.filter(i => i.type === 'comparativa').length,
    items: parsed.items
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf8');

  // Generar páginas individuales
  generatePages(parsed.items);

  // Archivar todo
  updateArchive(parsed.items);

  // Actualizar historial de precios (solo si hay promos)
  let priceHistory = null;
  const hasPromos = parsed.items.some(i => i.type === 'promo');
  if (hasPromos) {
    priceHistory = updatePriceHistory(parsed.items);
  }

  // Enviar mejores ofertas a Telegram
  await sendToTelegram(parsed.items);

  // SSG: inject content directly into index.html for instant loading
  injectSSG(parsed.items, priceHistory);

  console.log(`✅ ${result.newsCount} noticias, ${result.promoCount} promos, ${result.reviewCount} reviews, ${result.comparativaCount} comparativas`);
  return result;
}

if (process.argv.includes('--once')) {
  generateContent()
    .then(() => { console.log('✅ Completado.'); process.exit(0); })
    .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
} else {
  const hour = process.env.CRON_HOUR_UTC || '12';
  cron.schedule(`0 ${hour} * * *`, () => {
    generateContent().catch(err => console.error('❌ Error cron:', err.message));
  });
  console.log(`⏰ Cron activo — Jue: largo (reviews+comparativas) | Resto: corto | E-E-A-T`);
}

// ─── SSG: INYECTAR CONTENIDO EN INDEX.HTML ────────────────────────────────────
function renderCardHTML(item, i) {
  const delay = (i * 0.04).toFixed(2);
  const icon = p => p === 'Amazon' ? '🛒' : p === 'eBay' ? '🏪' : '🌐';

  if (item.type === 'news') {
    const articleUrl = item.slug ? `/articulos/${item.slug}.html` : (item.url || '#');
    const target = item.slug ? '_self' : '_blank';
    const tags = (item.tags||[]).slice(0,2).map(t => `<span class="tag platform">${t}</span>`).join('');
    return `<a class="card" style="animation-delay:${delay}s" href="${articleUrl}" target="${target}" rel="noopener">
      <div class="card-header">
        <div class="card-tags"><span class="tag news">📡 Noticia</span>${tags}</div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body}</div>
      <div class="card-footer">
        ${item.source ? `<span class="card-source">${item.source}</span>` : '<span></span>'}
        <span class="read-more">Leer más</span>
      </div>
    </a>`;
  }

  if (item.type === 'promo') {
    const articleUrl = item.slug ? `/articulos/${item.slug}.html` : (item.url || '#');
    const insight = priceHistory ? getPriceInsight(item, priceHistory) : null;
    const insightBadge = insight ? `<div style="background:${insight.color}22;border:1px solid ${insight.color}44;color:${insight.color};padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;margin-top:6px;display:inline-block;">${insight.label}</div>` : '';
    return `<a class="card" style="animation-delay:${delay}s" href="${articleUrl}" target="_blank" rel="sponsored noopener">
      <div class="card-header">
        <div class="card-tags">
          <span class="tag promo">🏷️ Oferta</span>
          ${item.featured ? '<span class="tag featured">🔥 Top</span>' : ''}
          <span class="tag platform">${icon(item.platform)} ${item.platform}</span>
        </div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body}</div>
      ${insightBadge}
      <div class="card-footer">
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="price-badge">${item.price}</span>
          ${item.discount ? `<span class="discount-badge">${item.discount}</span>` : ''}
        </div>
        <span class="read-more">Ver oferta</span>
      </div>
    </a>`;
  }

  if (item.type === 'review') {
    const articleUrl = item.slug ? `/articulos/${item.slug}.html` : (item.url || '#');
    return `<a class="card" style="animation-delay:${delay}s" href="${articleUrl}" target="_self" rel="noopener">
      <div class="card-header">
        <div class="card-tags"><span class="tag review">⭐ Review</span></div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body.slice(0,220)}...</div>
      ${item.rating ? `<div class="rating">⭐ ${item.rating}/10</div>` : ''}
      ${item.verdict ? `<div class="verdict">${item.verdict}</div>` : ''}
      <div class="card-footer"><span></span><span class="read-more">Ver review</span></div>
    </a>`;
  }

  if (item.type === 'comparativa') {
    const articleUrl = item.slug ? `/articulos/${item.slug}.html` : (item.url || '#');
    return `<a class="card" style="animation-delay:${delay}s" href="${articleUrl}" target="_self" rel="noopener">
      <div class="card-header">
        <div class="card-tags"><span class="tag comparativa">⚖️ Comparativa</span></div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body.slice(0,220)}...</div>
      ${item.winner ? `<div class="verdict">🏆 Ganador: <strong>${item.winner}</strong></div>` : ''}
      <div class="card-footer"><span></span><span class="read-more">Ver comparativa</span></div>
    </a>`;
  }
  return '';
}

export function injectSSG(items, priceHistory = null) {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  index.html no encontrado para SSG');
    return;
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Sort promos: featured first, then by discount
  const promos = items
    .filter(i => i.type === 'promo')
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const da = parseInt((a.discount||'0').replace(/[^0-9]/g,''));
      const db = parseInt((b.discount||'0').replace(/[^0-9]/g,''));
      return db - da;
    });

  const nonPromos = items.filter(i => i.type !== 'promo');

  // Generate grid HTML (news + reviews + comparativas)
  const adInFeed = `<div class="ad-in-feed"><div class="ad-banner"><span>📢 Anuncio In-Feed — Google AdSense</span></div></div>`;
  const gridCards = nonPromos.map((item, i) => renderCardHTML(item, i));
  if (gridCards.length > 5) gridCards.splice(5, 0, adInFeed);
  const gridHTML = gridCards.join('\n');

  // Generate deals HTML
  const dealsHTML = promos.map((item, i) => renderCardHTML(item, i)).join('\n');

  // Build SSG data script for JS hydration
  const ssgDataScript = `<script id="ssg-data" type="application/json">${JSON.stringify(items)}</script>`;

  // Inject into placeholders
  html = html.replace('<!-- SSG_GRID_CONTENT -->', gridHTML || '<div class="empty-state"><div class="empty-icon">🏠</div><div class="empty-title">Cargando...</div></div>');
  html = html.replace('<!-- SSG_DEALS_CONTENT -->', dealsHTML || '<div class="empty-state"><div class="empty-icon">🏷️</div><div class="empty-title">Cargando ofertas...</div></div>');

  // Inject SSG data before </body>
  html = html.replace('</body>', ssgDataScript + '\n</body>');

  // Update stats in HTML directly
  const newsCount  = items.filter(i => i.type === 'news').length;
  const promoCount = items.filter(i => i.type === 'promo').length;
  html = html.replace('id="stat-news">—<', `id="stat-news">${newsCount}<`);
  html = html.replace('id="stat-promos">—<', `id="stat-promos">${promoCount}<`);

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`🚀 SSG: index.html inyectado con ${items.length} items (${newsCount} noticias, ${promoCount} ofertas)`);
}
