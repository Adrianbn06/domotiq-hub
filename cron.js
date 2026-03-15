/**
 * cron.js - Generador de contenido con E-E-A-T, Long-Tail y páginas individuales
 *
 * OPCIÓN B — Solo 3 días a la semana:
 * Lunes:     resumen noticias ~$0.040
 * Miércoles: 10 ofertas ~$0.039
 * Viernes:   10 ofertas ~$0.039
 * Resto:     sin generación ($0)
 * Costo mensual: ~$0.51 | $7.26 dura ~14 meses
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

KEYWORDS REGIONALES — incluye términos de España Y Latinoamérica cuando aplique:
- hogar inteligente / casa inteligente / domótica / smart home
- bombilla / foco / lámpara LED inteligente
- enchufe / tomacorriente WiFi inteligente
- Use términos técnicos universales: protocolo, frecuencia, ecosistema, hub, gateway

RESPONDE SOLO CON JSON VÁLIDO — sin markdown, sin texto extra:
{"items":[{"id":1,"type":"news","title":"Título técnico long-tail específico con términos regionales","body":"3-4 oraciones técnicas: protocolo involucrado, impacto real, compatibilidad con ecosistemas. Usa términos comprensibles para España y Latinoamérica.","date":"${today()}","tags":["Matter"],"source":"The Verge","url":"URL REAL del artículo original","slug":"slug-url-amigable"}]}
IDs del 1 al 10. Exactamente 10 noticias.`;

// MAR/MIÉ/JUE/SÁB/DOM — 10 mejores ofertas del día
const PROMPT_OFERTAS_10 = `Eres un experto en domótica y smart home. Fecha: ${today()}.
Genera las 10 MEJORES OFERTAS del día en productos domóticos. Busca las más atractivas por precio y descuento.
Distribución: 4 Amazon (con &tag=domotiq-20), 3 eBay, 3 Alibaba.
Títulos long-tail técnicos con protocolo y ecosistema. Descripción con specs reales y ventajas concretas.

KEYWORDS REGIONALES — usa sinónimos para captar tráfico de España Y Latinoamérica:
- bombilla / foco / lámpara inteligente
- enchufe / tomacorriente / clavija inteligente
- persiana / cortina / ciego automatizado
- calefacción / calefactor / estufa inteligente
- router / enrutador / modem mesh
- cámara IP / cámara de seguridad / videocámara WiFi
Menciona AMBOS términos cuando aplique. Ej: "bombilla inteligente (foco WiFi)" o "enchufe inteligente (tomacorriente wifi)"

RESPONDE SOLO CON JSON VÁLIDO — sin markdown, sin texto extra:
{"items":[{"id":1,"type":"promo","title":"Producto + Protocolo + Ecosistema compatible","body":"Specs técnicas: protocolo, frecuencia, consumo standby, ecosistemas compatibles. Usa términos regionales: bombilla/foco, enchufe/tomacorriente según aplique.","platform":"Amazon","price":"$34.99","originalPrice":"$59.99","discount":"-41%","date":"${today()}","featured":true,"protocol":"Zigbee 3.0","compatibility":["Alexa","Google Home","Home Assistant"],"slug":"slug-producto","url":"https://www.amazon.com/s?k=zigbee+smart+bulb&tag=domotiq-20"}]}
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
  const typeLabels = { news:'Noticia', promo:'Oferta', review:'Review', comparativa:'Comparativa' };
  const typeIcons  = { news:'📡', promo:'🏷️', review:'⭐', comparativa:'⚖️' };
  const typeColors = { news:'#3b82f6', promo:'#f59e0b', review:'#a78bfa', comparativa:'#4ade80' };
  const color = typeColors[item.type] || '#00d4aa';
  const label = typeLabels[item.type] || item.type;
  const icon  = typeIcons[item.type] || '📄';

  // Reading time
  const words = (item.body||'').trim().split(/\s+/).length;
  const readTime = Math.ceil(words / 200);
  const readTimeStr = readTime <= 1 ? '1 min de lectura' : readTime + ' min de lectura';

  // Protocol and compatibility
  const protocolHtml = item.protocol
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,170,0.08);border:1px solid rgba(0,212,170,0.2);padding:4px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;">🔌 ${item.protocol}</div>`
    : '';
  const compatHtml = item.compatibility
    ? `<div style="margin-bottom:16px;font-size:13px;color:#94a3b8;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong>Compatible con:</strong>${item.compatibility.map(c=>`<span style="background:rgba(0,212,170,0.1);color:#00d4aa;padding:2px 10px;border-radius:6px;font-size:12px;">${c}</span>`).join('')}</div>`
    : '';
  const priceHtml = item.price
    ? `<div style="display:flex;align-items:center;gap:12px;margin:20px 0;flex-wrap:wrap;padding:20px;background:#141c2e;border-radius:14px;border:1px solid rgba(255,255,255,0.07);">
        <span style="font-size:28px;font-weight:700;color:#f59e0b;font-family:monospace;">${item.price}</span>
        ${item.originalPrice ? `<span style="font-size:16px;color:#64748b;text-decoration:line-through;">${item.originalPrice}</span>` : ''}
        ${item.discount ? `<span style="background:rgba(239,68,68,0.12);color:#f87171;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:600;">${item.discount}</span>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;margin-left:auto;">
          <a href="${item.url}" target="_blank" rel="noopener sponsored" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#00d4aa,#00a884);color:#000;font-weight:600;font-size:14px;padding:10px 22px;border-radius:10px;text-decoration:none;">Ver oferta en ${item.platform} →</a>
          <button onclick="(function(e){e.preventDefault();var p=document.createElement('div');p.id='pa';p.innerHTML='<div onclick=\'document.getElementById(\'pa\').remove()\' style=\'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;\'></div><div style=\'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:#141c2e;border:1px solid rgba(0,212,170,0.3);border-radius:16px;padding:28px;max-width:340px;width:90%;text-align:center;\'><div style=\'font-size:36px;margin-bottom:12px;\'>🔔</div><div style=\'font-size:17px;font-weight:700;color:#e2e8f0;margin-bottom:8px;\'>¿Precio muy alto ahora?</div><div style=\'font-size:13px;color:#94a3b8;margin-bottom:20px;\'>Únete al canal de Telegram y avisamos cuando este producto alcance su mínimo histórico.</div><a href=\'https://t.me/ofertas_domoticas\' target=\'_blank\' style=\'display:block;padding:12px;border-radius:10px;background:#0088cc;color:#fff;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:8px;\'>✈ Unirse al canal</a><button onclick=\'document.getElementById(\'pa\').remove()\' style=\'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#94a3b8;font-size:13px;cursor:pointer;\'>Ahora no</button></div>';document.body.appendChild(p);})(event)" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 22px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);background:transparent;color:#f59e0b;font-size:13px;font-weight:500;cursor:pointer;font-family:'Space Grotesk',sans-serif;">🔔 Avísame si baja de precio</button>
        </div>
       </div>`
    : '';
  const ratingHtml = item.rating
    ? `<div style="display:flex;align-items:baseline;gap:6px;margin:16px 0;padding:16px 20px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;">
        <span style="font-size:42px;font-weight:700;color:#f59e0b;">${item.rating}</span>
        <span style="font-size:20px;color:#64748b;">/10</span>
        <span style="font-size:14px;color:#64748b;margin-left:8px;">Puntuación técnica</span>
       </div>`
    : '';
  const prosConsHtml = (item.pros || item.cons)
    ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0;">
        ${item.pros ? `<div style="padding:16px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;"><div style="color:#4ade80;font-size:14px;font-weight:600;margin-bottom:10px;">✅ Ventajas</div><ul style="margin-left:16px;">${item.pros.map(p=>`<li style="font-size:13px;color:#94a3b8;margin-bottom:6px;line-height:1.6;">${p}</li>`).join('')}</ul></div>` : ''}
        ${item.cons ? `<div style="padding:16px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:12px;"><div style="color:#f87171;font-size:14px;font-weight:600;margin-bottom:10px;">❌ Limitaciones</div><ul style="margin-left:16px;">${item.cons.map(c=>`<li style="font-size:13px;color:#94a3b8;margin-bottom:6px;line-height:1.6;">${c}</li>`).join('')}</ul></div>` : ''}
       </div>`
    : '';
  const verdictHtml = item.verdict
    ? `<div style="background:rgba(0,212,170,0.06);border-left:3px solid #00d4aa;padding:14px 18px;border-radius:0 10px 10px 0;margin:16px 0;font-size:15px;color:#e2e8f0;"><strong>🏆 Veredicto:</strong> ${item.verdict}</div>`
    : '';
  const winnerHtml = item.winner
    ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid #f59e0b;padding:14px 18px;border-radius:0 10px 10px 0;margin:16px 0;font-size:15px;color:#e2e8f0;"><strong>🏆 Ganador:</strong> ${item.winner} — ${item.winner_reason||''}</div>`
    : '';

  // Cross-sell: ofertas que comparten tags con este artículo
  // También busca en el archivo histórico para enlazado interno
  const itemTags = (item.tags||[]).map(t => t.toLowerCase());
  const titleKeywords = (item.title||'').toLowerCase().split(/\s+/).filter(w => w.length > 4);

  // Combinar items actuales + archivo histórico para enlazado interno
  let archiveForLinks = [];
  try {
    const archivePath = path.join(__dirname, 'data', 'archive.json');
    if (fs.existsSync(archivePath)) {
      const archData = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      archiveForLinks = (archData.items || []).filter(r =>
        r.slug && r.slug !== item.slug && r.type !== item.type
      );
    }
  } catch {}

  const allSearchable = [...allItems, ...archiveForLinks];

  const crossSellOffers = allSearchable
    .filter(r => r.type === 'promo' && r.slug && r.price && r.slug !== item.slug)
    .filter(r => {
      const rTags = (r.tags||[]).concat(r.protocol||'', r.title||'').join(' ').toLowerCase();
      return itemTags.some(t => t.length > 3 && rTags.includes(t)) ||
             titleKeywords.some(k => rTags.includes(k));
    })
    .slice(0, 3);

  // Artículos relacionados del archivo (tipos diferentes)
  const archiveRelated = archiveForLinks
    .filter(r => {
      const rText = (r.title + ' ' + (r.tags||[]).join(' ')).toLowerCase();
      return itemTags.some(t => t.length > 3 && rText.includes(t));
    })
    .slice(0, 3);

  const crossSellHtml = crossSellOffers.length > 0 ? `
    <section style="margin-top:36px;padding:24px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:14px;">
      <h2 style="font-size:16px;font-weight:700;color:#f59e0b;margin-bottom:16px;">🏷️ Ofertas relacionadas con ${(item.tags||['este tema'])[0]}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        ${crossSellOffers.map(o => `
          <a href="/articulos/${o.slug}.html" target="_blank" rel="sponsored noopener" style="background:#141c2e;border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px;text-decoration:none;display:block;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(245,158,11,0.5)'" onmouseout="this.style.borderColor='rgba(245,158,11,0.2)'">
            <div style="font-size:10px;font-weight:700;color:#f59e0b;margin-bottom:6px;letter-spacing:0.5px;">${o.platform||'Oferta'}</div>
            <div style="font-size:13px;font-weight:500;color:#e2e8f0;line-height:1.4;margin-bottom:8px;">${o.title.slice(0,70)}${o.title.length>70?'...':''}</div>
            <div style="font-size:18px;font-weight:800;color:#f59e0b;font-family:monospace;">${o.price}</div>
            ${o.discount?`<div style="font-size:11px;color:#f87171;font-weight:600;">${o.discount}</div>`:''}
          </a>`).join('')}
      </div>
    </section>` : '';

  // Related articles from current + archive
  const related = allSearchable.filter(r => r.slug && r.slug !== item.slug && r.type === item.type).slice(0,3);
  const relatedHtml = related.length > 0
    ? `<section style="margin-top:40px;padding-top:28px;border-top:1px solid rgba(255,255,255,0.07);">
        <h2 style="font-size:18px;font-weight:600;color:#e2e8f0;margin-bottom:14px;">Más ${label}s relacionadas</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
          ${related.map(r=>`<a href="/articulos/${r.slug}.html" style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-decoration:none;color:#e2e8f0;display:block;">
            <div style="font-size:11px;color:#00d4aa;margin-bottom:6px;">${typeIcons[r.type]||'📄'} ${typeLabels[r.type]||r.type}</div>
            <div style="font-size:13px;font-weight:500;line-height:1.4;">${r.title.slice(0,80)}${r.title.length>80?'...':''}</div>
            ${r.price?`<div style="font-size:14px;font-weight:700;color:#f59e0b;margin-top:8px;">${r.price}</div>`:''}
          </a>`).join('')}
        </div>
       </section>`
    : '';

  // FAQ
  const faqMap = {
    promo: [
      {q:`¿Vale la pena comprar ${item.product||item.title}?`, a:item.body},
      {q:'¿Con qué asistentes de voz es compatible?', a:item.compatibility?'Compatible con: '+item.compatibility.join(', '):'Consulta la descripción del producto para ver la compatibilidad.'},
      {q:'¿Cuánto tiempo durará esta oferta?', a:'Las ofertas pueden cambiar en cualquier momento. Te recomendamos aprovecharla si el precio te parece adecuado.'},
    ],
    news: [
      {q:'¿Cómo afecta esta noticia al smart home?', a:item.body},
      {q:'¿Dónde puedo leer más sobre este tema?', a:`Puedes leer el artículo completo en la fuente original${item.source?' ('+item.source+')':''}.`},
    ],
    review: [
      {q:`¿Es recomendable ${item.product||item.title}?`, a:item.verdict||item.body.slice(0,200)},
      {q:'¿Cuáles son las principales desventajas?', a:item.cons?item.cons.join('. '):'Consulta la sección de limitaciones en esta review.'},
    ],
    comparativa: [
      {q:`¿Cuál es mejor, ${item.product_a||'opción A'} o ${item.product_b||'opción B'}?`, a:item.winner_reason||item.body.slice(0,200)},
      {q:'¿Cuál tiene mejor relación calidad-precio?', a:'Lee la comparativa completa para ver cuál se adapta mejor a tu caso.'},
    ],
  };
  const faqs = faqMap[item.type]||faqMap.news;
  const faqHtml = `<section style="margin-top:36px;">
    <h2 style="font-size:18px;font-weight:600;color:#e2e8f0;margin-bottom:14px;">Preguntas frecuentes</h2>
    ${faqs.map(f=>`<details style="background:#141c2e;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:8px;overflow:hidden;">
      <summary style="padding:14px 18px;cursor:pointer;font-size:14px;font-weight:500;color:#e2e8f0;list-style:none;display:flex;justify-content:space-between;">${f.q}<span style="color:#00d4aa;">+</span></summary>
      <div style="padding:0 18px 14px;font-size:14px;color:#94a3b8;line-height:1.7;">${f.a}</div>
    </details>`).join('')}
  </section>`;

  const faqSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"FAQPage",
    "mainEntity":faqs.map(f=>({
      "@type":"Question","name":f.q,
      "acceptedAnswer":{"@type":"Answer","text":f.a}
    }))
  });

  const tags = item.tags ? item.tags.map(t => {
    const slug = t.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    return `<a href="/tags/${slug}.html" style="font-size:11px;background:rgba(255,255,255,0.05);color:#94a3b8;padding:3px 10px;border-radius:6px;text-decoration:none;transition:all 0.2s;" onmouseover="this.style.color='#00d4aa';this.style.background='rgba(0,212,170,0.08)'" onmouseout="this.style.color='#94a3b8';this.style.background='rgba(255,255,255,0.05)'">${t}</a>`;
  }).join('') : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${item.title} | OfertasDomoticas.com</title>
  <meta name="description" content="${(item.body||'').slice(0,155).replace(/"/g,'&quot;')}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${(item.title||'').replace(/"/g,'&quot;')}">
  <meta property="og:description" content="${(item.body||'').slice(0,155).replace(/"/g,'&quot;')}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
  <script type="application/ld+json">${faqSchema}</script>
  <style>
    :root{--bg:#0a0e1a;--card:#141c2e;--accent:#00d4aa;--accent2:#3b82f6;--text:#e2e8f0;--muted:#94a3b8;--border:rgba(255,255,255,0.07);}
    *{margin:0;padding:0;box-sizing:border-box;}
    html{scroll-behavior:smooth;}
    body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);line-height:1.7;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,212,170,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.025) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    .wrapper{max-width:820px;margin:0 auto;padding:40px 20px 80px;position:relative;z-index:1;}
    .back{display:inline-flex;align-items:center;gap:6px;color:var(--accent);text-decoration:none;font-size:14px;margin-bottom:24px;padding:8px 16px;border:1px solid rgba(0,212,170,0.3);border-radius:8px;transition:all 0.2s;}
    .back:hover{background:rgba(0,212,170,0.08);}
    .breadcrumb{font-size:12px;color:var(--muted);margin-bottom:16px;}
    .breadcrumb a{color:var(--muted);text-decoration:none;}
    .type-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:16px;background:rgba(${color==='#3b82f6'?'59,130,246':color==='#f59e0b'?'245,158,11':color==='#a78bfa'?'167,139,250':'74,222,128'},.15);color:${color};border:1px solid ${color}33;}
    h1{font-size:clamp(22px,4vw,34px);font-weight:700;line-height:1.25;letter-spacing:-0.5px;margin-bottom:16px;}
    h2{font-size:20px;font-weight:600;color:var(--text);margin:32px 0 14px;}
    .article-body{font-size:16px;color:#cbd5e1;line-height:1.85;margin:24px 0;}
    .source-link{display:inline-flex;align-items:center;gap:6px;color:var(--accent);text-decoration:none;font-size:14px;padding:10px 18px;border:1px solid rgba(0,212,170,0.3);border-radius:8px;margin-top:20px;transition:all 0.2s;}
    .source-link:hover{background:rgba(0,212,170,0.08);}
    footer{margin-top:48px;padding-top:24px;border-top:1px solid var(--border);}
    footer a{color:var(--accent);text-decoration:none;font-size:14px;padding:10px 18px;border:1px solid rgba(0,212,170,0.3);border-radius:8px;display:inline-block;transition:all 0.2s;}
    footer a:hover{background:rgba(0,212,170,0.08);}
    @media(max-width:600px){.pros-cons-grid{grid-template-columns:1fr!important;}}
  </style>
</head>
<body>
<div class="wrapper">
  <a href="/" class="back">← Volver a OfertasDomoticas.com</a>
  <nav class="breadcrumb">
    <a href="/">Inicio</a> ›
    <a href="/#${item.type==='news'?'noticias':item.type==='promo'?'descuentos':'archivo'}">${label}s</a> ›
    ${item.title.slice(0,60)}${item.title.length>60?'...':''}
  </nav>
  <div class="type-badge">${icon} ${label}</div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
    <span style="font-size:12px;color:#94a3b8;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:6px;">⏱ ${readTimeStr}</span>
    <span style="font-size:12px;color:#94a3b8;">📅 ${item.date||''}</span>
    ${item.source?`<span style="font-size:12px;color:#94a3b8;">📰 ${item.source}</span>`:''}
    ${tags}
  </div>
  <h1>${item.title}</h1>
  ${protocolHtml}
  ${compatHtml}
  ${priceHtml}
  ${ratingHtml}
  <div class="article-body">${item.body}</div>
  ${prosConsHtml}
  ${verdictHtml}
  ${winnerHtml}
  ${item.type==='news'&&item.url&&item.url!=='#'?`<a href="${item.url}" target="_blank" rel="noopener" class="source-link">🔗 Leer artículo completo en ${item.source||'la fuente original'} →</a>`:''}
  ${crossSellHtml}
  ${archiveRelated.length > 0 ? `<section style="margin-top:28px;padding:20px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.12);border-radius:12px;">
    <h3 style="font-size:15px;font-weight:700;color:var(--accent2,#3b82f6);margin-bottom:14px;">📚 Del archivo — contenido relacionado</h3>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${archiveRelated.map(r => `<a href="/articulos/${r.slug}.html" style="font-size:13px;color:#94a3b8;text-decoration:none;padding:8px 12px;background:#141c2e;border-radius:8px;display:block;border:1px solid rgba(255,255,255,0.05);" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='#94a3b8'">
        ${r.type==='review'?'⭐':r.type==='comparativa'?'⚖️':'📡'} ${r.title.slice(0,90)}${r.title.length>90?'...':''}
      </a>`).join('')}
    </div>
  </section>` : ''}
  ${faqHtml}
  ${relatedHtml}
  <footer>
    <a href="/">← Volver al inicio</a>
    &nbsp;&nbsp;
    <a href="/categorias.html" style="margin-left:8px;">Ver categorías</a>
  </footer>
</div>
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

// ─── HELPER: UNA LLAMADA A LA API (con reintentos automáticos) ───────────────
async function callAPI(prompt, maxTokens, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 120000);
    try {
      console.log(`  → Intento ${attempt}/${retries}...`);
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
    } catch (err) {
      clearTimeout(t);
      const isRetryable = err.message.includes('ECONNRESET') ||
                          err.message.includes('socket hang up') ||
                          err.message.includes('ETIMEDOUT') ||
                          err.message.includes('aborted');
      if (isRetryable && attempt < retries) {
        const wait = attempt * 15000; // 15s, 30s entre reintentos
        console.log(`  ⚠ Error de red (${err.message.slice(0,40)}), reintentando en ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(t);
    }
  }
}


// ─── GENERADOR RSS ────────────────────────────────────────────────────────────
function generateRSS(items) {
  const now = new Date().toUTCString();
  const newsItems = items.filter(i => i.type === 'news').slice(0, 20);

  const rssItems = newsItems.map(item => {
    const url = item.slug
      ? `https://ofertasdomoticas.com/articulos/${item.slug}.html`
      : (item.url && item.url !== '#' ? item.url : 'https://ofertasdomoticas.com');
    const title = (item.title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const desc  = (item.body||'').slice(0,300).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tags  = (item.tags||[]).map(t => `<category>${t.replace(/&/g,'&amp;')}</category>`).join('');
    return `    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${desc}...</description>
      <pubDate>${now}</pubDate>
      <source url="https://ofertasdomoticas.com">OfertasDomoticas.com</source>
      ${tags}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OfertasDomoticas.com — Noticias de Domótica</title>
    <link>https://ofertasdomoticas.com</link>
    <description>Las noticias más importantes de domótica y smart home. Zigbee, Matter, Z-Wave, Thread. Actualizado semanalmente.</description>
    <language>es</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://ofertasdomoticas.com/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://ofertasdomoticas.com/og-image.png</url>
      <title>OfertasDomoticas.com</title>
      <link>https://ofertasdomoticas.com</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  const rssPath = path.join(__dirname, 'public', 'rss.xml');
  fs.writeFileSync(rssPath, xml, 'utf8');
  console.log(`📡 RSS generado con ${newsItems.length} noticias → public/rss.xml`);
}

export async function generateContent() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY en .env');

  // OPCIÓN B: Solo 3 días — Lun/Mié/Vie (~$0.51/mes, 14 meses con $7.26)
  // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  const dayOfWeek = new Date().getDay();
  const activeDays = { 1:'LUNES (noticias)', 3:'MIÉRCOLES (ofertas)', 5:'VIERNES (ofertas)' };

  if (!activeDays[dayOfWeek]) {
    console.log(`[${new Date().toISOString()}] ⏭ Día sin generación (solo Lun/Mié/Vie) — sin costo`);
    return { generated: new Date().toISOString(), count: 0, newsCount: 0, promoCount: 0, reviewCount: 0, comparativaCount: 0, items: [] };
  }

  console.log(`[${new Date().toISOString()}] 🤖 Generando — ${activeDays[dayOfWeek]}`);

  let rawText = '';

  if (dayOfWeek === 1) {
    // LUNES: resumen semanal de noticias
    console.log('📰 Generando resumen semanal de noticias...');
    rawText = await callAPI(PROMPT_LUNES_NOTICIAS, 2500);
  } else {
    // MIÉRCOLES y VIERNES: 10 mejores ofertas
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

  // Generar RSS solo los lunes (día de noticias)
  if (dayOfWeek === 1) {
    generateRSS(parsed.items);
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
  console.log(`⏰ Cron activo — Opción B: Lun/Mié/Vie | ~$0.51/mes | 14 meses con $7.26`);
}

// ─── SSG: INYECTAR CONTENIDO EN INDEX.HTML ────────────────────────────────────
function renderCardHTML(item, i, priceHistory = null) {
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

  // Solo inyectar el JSON de datos — app.js se encarga del renderizado
  const ssgDataScript = `<script id="ssg-data" type="application/json">${JSON.stringify(items)}</script>`;

  // Eliminar script anterior para evitar duplicados
  html = html.replace(/<script id="ssg-data"[\s\S]*?<\/script>/g, '');

  // Reemplazar el placeholder vacío con los datos reales
  html = html.replace(
    '<script id="ssg-data" type="application/json">[]</script>',
    ssgDataScript
  );

  // Si no había placeholder, insertar antes de app.js
  if (!html.includes(ssgDataScript)) {
    html = html.replace('<script src="/app.js"></script>', ssgDataScript + '\n<script src="/app.js"></script>');
  }

  const newsCount  = items.filter(i => i.type === 'news').length;
  const promoCount = items.filter(i => i.type === 'promo').length;

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`🚀 SSG: index.html inyectado con ${items.length} items (${newsCount} noticias, ${promoCount} ofertas)`);
}
