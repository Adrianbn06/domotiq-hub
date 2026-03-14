/**
 * cron.js - Generador de contenido con E-E-A-T, Long-Tail y páginas individuales
 *
 * Lunes y jueves: formato largo (reviews + comparativas) ~$0.05
 * Resto de días:  formato corto ~$0.015
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

// ─── PROMPT CORTO (martes, miércoles, viernes, sábado, domingo) ──────────────
const PROMPT_CORTO = `Eres un ingeniero experto en domótica y smart home con 10 años de experiencia práctica instalando y configurando sistemas. Demuestras EXPERIENCIA REAL (E-E-A-T de Google). Fecha: ${today()}.

Busca en la web y genera contenido TÉCNICO Y ESPECÍFICO en español para OfertasDomoticas.com.

REGLAS DE CALIDAD E-E-A-T:
- Usa terminología técnica real: protocolos (Zigbee 3.0, Z-Wave S2, Matter 1.2, Thread, BLE Mesh), frecuencias (2.4GHz vs 868MHz), topologías de red (malla vs estrella), consumo en watts, latencia en ms.
- Menciona compatibilidad específica con ecosistemas: Works with Alexa, Google Home, Apple HomeKit, Home Assistant, SmartThings, Hubitat.
- Explica POR QUÉ una tecnología es mejor que otra en cada caso de uso.
- Títulos LONG-TAIL específicos (no "bombilla inteligente" sino "bombilla inteligente E27 Zigbee 3.0 compatible con Home Assistant sin hub Wi-Fi").

Genera:
- 10 NOTICIAS REALES Y RECIENTES (2025-2026) con URLs reales de fuentes como The Verge, Xataka, Android Authority, ZDNet, TechCrunch, Genbeta. NO uses url:"#".
- 10 OFERTAS con títulos long-tail técnicos, descripción con specs reales, protocolo usado y ventajas técnicas concretas.

RESPONDE SOLO CON JSON VÁLIDO:
{
  "items": [
    {
      "id": 1,
      "type": "news",
      "title": "Título long-tail específico y técnico de la noticia",
      "body": "3-4 oraciones técnicas: menciona protocolos, versiones, compatibilidades y el impacto real para usuarios de smart home. Explica la relevancia técnica.",
      "date": "${today()}",
      "tags": ["Matter", "Zigbee"],
      "source": "The Verge",
      "url": "URL REAL del artículo original — busca la fuente en la web",
      "slug": "slug-url-amigable-del-titulo"
    },
    {
      "id": 11,
      "type": "promo",
      "title": "Nombre Producto + Protocolo + Compatibilidad + Caso de uso específico",
      "body": "Descripción técnica: protocolo (Zigbee/Matter/Z-Wave), frecuencia de operación, consumo en standby, ecosistemas compatibles, por qué este protocolo es mejor para este caso de uso (ej: Zigbee satura menos la red Wi-Fi doméstica que los dispositivos Wi-Fi directos).",
      "platform": "Amazon",
      "price": "$34.99",
      "originalPrice": "$59.99",
      "discount": "-41%",
      "date": "${today()}",
      "featured": true,
      "protocol": "Zigbee 3.0",
      "compatibility": ["Alexa", "Google Home", "Home Assistant"],
      "slug": "slug-del-producto",
      "url": "https://www.amazon.com/s?k=zigbee+bulb+smart+home&tag=domotiq-20"
    }
  ]
}
REGLAS: IDs 1-10=news, 11-20=promo. 4 Amazon con &tag=domotiq-20, 3 eBay, 3 Alibaba. Total 20 items. Cada item DEBE tener campo "slug".`;

// ─── PROMPT LARGO (lunes y jueves) ───────────────────────────────────────────
const PROMPT_LARGO = `Eres un ingeniero experto en domótica con 10 años de experiencia real. Demuestras E-E-A-T (Experiencia, Expertise, Autoridad, Confianza) como exige Google. Fecha: ${today()}.

Busca en la web y genera contenido TÉCNICO PROFUNDO en español para OfertasDomoticas.com.

REGLAS DE CALIDAD E-E-A-T:
- Cita protocolos técnicos reales: Zigbee 3.0, Z-Wave S2 Security, Matter 1.2, Thread, Wi-Fi HaLow, BLE Mesh
- Explica diferencias técnicas: "Zigbee opera a 2.4GHz en topología de malla, saturando menos la red doméstica que 40 dispositivos Wi-Fi directos"
- Usa métricas reales: latencia, consumo en mW, alcance en metros, número máximo de nodos
- Títulos LONG-TAIL: "Mejor termostato inteligente Z-Wave para pisos sin neutro compatible con Home Assistant 2026"
- Para comparativas: tabla real de specs, casos de uso concretos, recomendación por perfil de usuario

Genera:
1. 6 NOTICIAS REALES con URLs reales de fuentes reconocidas
2. 6 OFERTAS con specs técnicas detalladas
3. 3 REVIEWS de 400+ palabras con análisis técnico profundo
4. 3 COMPARATIVAS de 400+ palabras tipo "Protocolo A vs Protocolo B en 2026"

RESPONDE SOLO CON JSON VÁLIDO:
{
  "items": [
    {
      "id": 1,
      "type": "news",
      "title": "Título long-tail técnico específico",
      "body": "Análisis técnico de 4-5 oraciones: protocolos involucrados, impacto en ecosistemas existentes, ventajas técnicas sobre soluciones anteriores, compatibilidad con plataformas open-source como Home Assistant.",
      "date": "${today()}",
      "tags": ["Matter 1.2", "Thread"],
      "source": "The Verge",
      "url": "URL REAL del artículo",
      "slug": "slug-seo-amigable"
    },
    {
      "id": 7,
      "type": "promo",
      "title": "Producto + Protocolo + Ecosistema + Caso uso específico",
      "body": "Análisis técnico: protocolo de comunicación y sus ventajas sobre Wi-Fi directo, frecuencia de operación, consumo en standby vs activo, número máximo de dispositivos en la malla, latencia típica, ecosistemas compatibles y cómo se integra con Home Assistant sin suscripción en la nube.",
      "platform": "Amazon",
      "price": "$49.99",
      "originalPrice": "$79.99",
      "discount": "-37%",
      "date": "${today()}",
      "featured": true,
      "protocol": "Matter 1.2",
      "compatibility": ["Alexa", "Google Home", "Apple HomeKit", "Home Assistant"],
      "slug": "slug-producto",
      "url": "https://www.amazon.com/s?k=matter+smart+plug&tag=domotiq-20"
    },
    {
      "id": 13,
      "type": "review",
      "title": "Review Técnica: [Producto] — Análisis Completo para Smart Home 2026",
      "body": "Review de 400+ palabras con estructura: 1) Introducción y posicionamiento en el mercado, 2) Especificaciones técnicas completas (protocolo, frecuencia, consumo, alcance, cifrado), 3) Proceso de instalación y emparejamiento, 4) Rendimiento real en uso diario, 5) Integración con ecosistemas (Alexa, Google Home, Home Assistant), 6) Mínimo 3 ventajas técnicas detalladas, 7) Mínimo 2 limitaciones reales, 8) Perfil ideal de usuario, 9) Comparación con alternativas del mismo rango de precio, 10) Veredicto técnico final con puntuación.",
      "product": "Nombre exacto del producto",
      "brand": "Marca",
      "rating": 8.5,
      "protocol": "Zigbee 3.0",
      "pros": ["Ventaja técnica 1 con datos", "Ventaja técnica 2 con datos", "Ventaja técnica 3 con datos"],
      "cons": ["Limitación técnica 1 con contexto", "Limitación técnica 2 con contexto"],
      "verdict": "Veredicto técnico en 2 oraciones con recomendación clara.",
      "date": "${today()}",
      "tags": ["Review Técnica", "Zigbee"],
      "slug": "review-producto-2026",
      "url": "https://www.amazon.com/s?k=producto&tag=domotiq-20"
    },
    {
      "id": 16,
      "type": "comparativa",
      "title": "Protocolo A vs Protocolo B para Hogar Inteligente: ¿Cuál Elegir en 2026?",
      "body": "Comparativa de 400+ palabras con estructura: 1) Introducción técnica a ambos protocolos/productos, 2) Tabla de especificaciones (frecuencia, topología, alcance, latencia, max nodos, cifrado, consumo), 3) Ventajas técnicas de A sobre B, 4) Ventajas técnicas de B sobre A, 5) Escenario ideal para A (ej: hogar grande con 50+ dispositivos), 6) Escenario ideal para B (ej: apartamento pequeño con pocos dispositivos), 7) Coste total de implementación, 8) Compatibilidad con Home Assistant y otras plataformas open-source, 9) Recomendación final por perfil de usuario.",
      "product_a": "Producto/Protocolo A",
      "product_b": "Producto/Protocolo B",
      "winner": "Ganador general",
      "winner_reason": "Por qué gana con datos técnicos concretos.",
      "date": "${today()}",
      "tags": ["Comparativa Técnica", "Protocolos"],
      "slug": "comparativa-a-vs-b-2026",
      "url": "https://www.amazon.com/s?k=smart+home&tag=domotiq-20"
    }
  ]
}
REGLAS: IDs 1-6=news, 7-12=promo, 13-15=review, 16-18=comparativa. Total 18 items. Cada item DEBE tener "slug".`;

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

  <h1>${item.title}</h1>

  <div class="meta">
    <span>📅 ${item.date}</span>
    ${item.source ? `<span>📰 ${item.source}</span>` : ''}
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
export async function generateContent() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY en .env');

  const dayOfWeek = new Date().getDay();
  const isLongDay = dayOfWeek === 1 || dayOfWeek === 4;
  const mode = isLongDay ? 'LARGO (E-E-A-T + reviews + comparativas)' : 'CORTO (E-E-A-T + long-tail)';

  console.log(`[${new Date().toISOString()}] 🤖 Generando — Modo: ${mode}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isLongDay ? 8000 : 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: isLongDay ? PROMPT_LARGO : PROMPT_CORTO }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let rawText = '';
  for (const block of data.content || []) {
    if (block.type === 'text') rawText += block.text;
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Sin JSON en respuesta: ${rawText.slice(0, 300)}`);

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('JSON sin campo items');

  // Asegurar que todos los items tienen slug
  parsed.items.forEach(item => {
    if (!item.slug) item.slug = slugify(item.title);
  });

  const result = {
    generated: new Date().toISOString(),
    generatedHuman: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    mode: isLongDay ? 'long' : 'short',
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

  // Actualizar historial de precios
  const priceHistory = updatePriceHistory(parsed.items);

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
  console.log(`⏰ Cron activo — Lun/Jue: largo | Resto: corto | E-E-A-T + páginas individuales`);
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
