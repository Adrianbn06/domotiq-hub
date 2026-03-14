/**
 * cron.js - Generador de contenido diario con Claude AI
 *
 * Lunes y jueves: formato largo con reviews y comparativas (~$0.05)
 * Resto de días:  formato corto económico (~$0.015)
 * Reviews y comparativas se acumulan en archive.json (se borran cada 6 meses)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import 'dotenv/config';

const DATA_DIR    = process.env.VERCEL ? '/tmp' : './data';
const DATA_FILE   = process.env.VERCEL ? '/tmp/content.json'  : './data/content.json';
const ARCHIVE_FILE = './data/archive.json'; // siempre en el repo para persistir

const today = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const todayISO = () => new Date().toISOString().split('T')[0];

// ─── PROMPT CORTO (lunes-miércoles-viernes-sábado-domingo) ────────────────────
const PROMPT_CORTO = `Eres un experto en domótica y smart home. Fecha: ${today()}.

Busca en la web y genera contenido en español para OfertasDomoticas.com:
- 10 noticias REALES y RECIENTES sobre domótica, IoT, Alexa, Google Home, Matter, Zigbee.
- 10 ofertas de productos domóticos: 4 Amazon (&tag=domotiq-20), 3 eBay, 3 Alibaba.

RESPONDE SOLO CON JSON VÁLIDO:
{
  "items": [
    {
      "id": 1, "type": "news",
      "title": "Título noticia",
      "body": "Resumen de 3-4 oraciones con contexto y detalles técnicos.",
      "date": "${today()}", "tags": ["IoT"], "source": "Medio", "url": "#"
    },
    {
      "id": 11, "type": "promo",
      "title": "Nombre producto",
      "body": "Descripción: qué hace, compatibilidad, protocolo, por qué es buena oferta.",
      "platform": "Amazon", "price": "$34.99", "originalPrice": "$59.99",
      "discount": "-41%", "date": "${today()}", "featured": true,
      "url": "https://www.amazon.com/s?k=smart+home&tag=domotiq-20"
    }
  ]
}
REGLAS: IDs 1-10 = news, IDs 11-20 = promo. 4 Amazon con &tag=domotiq-20, 3 eBay, 3 Alibaba. Total 20 items.`;

// ─── PROMPT LARGO (lunes y jueves) ────────────────────────────────────────────
const PROMPT_LARGO = `Eres un experto en domótica y smart home con 10 años de experiencia. Fecha: ${today()}.

Busca en la web y genera contenido DETALLADO en español para OfertasDomoticas.com:

1. 6 noticias recientes y reales sobre domótica, IoT, Alexa, Google Home, Matter.
2. 6 ofertas: 3 Amazon (&tag=domotiq-20), 2 eBay, 1 Alibaba.
3. 3 REVIEWS detalladas (mínimo 300 palabras): descripción completa, specs técnicas, ventajas, desventajas, para quién es ideal, puntuación /10.
4. 3 COMPARATIVAS detalladas (mínimo 300 palabras): introducción, diferencias clave, cuándo elegir cada uno, recomendación final.

RESPONDE SOLO CON JSON VÁLIDO:
{
  "items": [
    {
      "id": 1, "type": "news",
      "title": "Título noticia",
      "body": "Desarrollo completo en 3-4 oraciones con contexto técnico.",
      "date": "${today()}", "tags": ["IoT"], "source": "Medio", "url": "#"
    },
    {
      "id": 7, "type": "promo",
      "title": "Nombre producto",
      "body": "Descripción detallada: specs, compatibilidad, protocolo, por qué comprar.",
      "platform": "Amazon", "price": "$34.99", "originalPrice": "$59.99",
      "discount": "-41%", "date": "${today()}", "featured": true,
      "url": "https://www.amazon.com/s?k=smart+home&tag=domotiq-20"
    },
    {
      "id": 13, "type": "review",
      "title": "Review: Nombre Producto — ¿Vale la pena en 2026?",
      "body": "Review COMPLETA de 300+ palabras. Incluye: introducción al producto, características técnicas (conectividad, compatibilidad, consumo), experiencia de uso real, mínimo 3 ventajas y 2 desventajas detalladas, para quién es ideal y veredicto final.",
      "product": "Nombre exacto", "brand": "Marca", "rating": 8.5,
      "pros": ["Ventaja 1 detallada", "Ventaja 2 detallada", "Ventaja 3 detallada"],
      "cons": ["Desventaja 1 detallada", "Desventaja 2 detallada"],
      "verdict": "Veredicto final en 1-2 oraciones concretas.",
      "date": "${today()}", "tags": ["Review", "Smart Home"],
      "url": "https://www.amazon.com/s?k=producto&tag=domotiq-20"
    },
    {
      "id": 16, "type": "comparativa",
      "title": "Producto A vs Producto B: ¿Cuál comprar en 2026?",
      "body": "Comparativa COMPLETA de 300+ palabras. Incluye: qué son ambos productos, tabla de diferencias (precio, compatibilidad, ecosistema, facilidad), análisis individual de cada uno, en qué casos conviene cada uno y recomendación final clara.",
      "product_a": "Producto A", "product_b": "Producto B",
      "winner": "Nombre del ganador",
      "winner_reason": "Por qué gana en una oración.",
      "date": "${today()}", "tags": ["Comparativa", "Smart Home"],
      "url": "https://www.amazon.com/s?k=smart+home&tag=domotiq-20"
    }
  ]
}
REGLAS: IDs 1-6=news, 7-12=promo, 13-15=review, 16-18=comparativa. Total 18 items.
Reviews y comparativas: mínimo 300 palabras en body. Contenido en español.`;

// ─── ARCHIVO HISTÓRICO ────────────────────────────────────────────────────────
function loadArchive() {
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      return JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    }
  } catch {}
  return { items: [], lastPurge: todayISO() };
}

function saveArchive(archive) {
  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
}

function updateArchive(newItems) {
  const archive = loadArchive();

  // Agregar solo reviews y comparativas nuevas
  const toAdd = newItems.filter(i => i.type === 'review' || i.type === 'comparativa' || i.type === 'news');
  toAdd.forEach(item => {
    item.archivedAt = todayISO();
    archive.items.push(item);
  });

  // Purgar items de más de 6 meses si corresponde
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const lastPurge = new Date(archive.lastPurge || '2020-01-01');
  const shouldPurge = (new Date() - lastPurge) > (30 * 24 * 60 * 60 * 1000); // cada 30 días verifica

  if (shouldPurge) {
    const before = archive.items.length;
    archive.items = archive.items.filter(item => {
      const itemDate = new Date(item.archivedAt || '2020-01-01');
      return itemDate > sixMonthsAgo;
    });
    archive.lastPurge = todayISO();
    const removed = before - archive.items.length;
    if (removed > 0) console.log(`🗑️ Archivo: eliminados ${removed} items de más de 6 meses`);
  }

  saveArchive(archive);
  console.log(`📚 Archivo: ${archive.items.length} reviews/comparativas acumuladas`);
  return archive;
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────
export async function generateContent() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY en el archivo .env');
  }

  // Determinar si es día largo (lunes=1, jueves=4)
  const dayOfWeek = new Date().getDay();
  const isLongDay = dayOfWeek === 1 || dayOfWeek === 4;
  const mode = isLongDay ? 'LARGO (reviews + comparativas)' : 'CORTO (económico)';

  console.log(`[${new Date().toISOString()}] 🤖 Generando contenido — Modo: ${mode}`);

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
    throw new Error(`Error API Anthropic ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let rawText = '';
  for (const block of data.content || []) {
    if (block.type === 'text') rawText += block.text;
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON en respuesta: ${rawText.slice(0, 300)}`);

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.items || !Array.isArray(parsed.items)) throw new Error('JSON sin campo items');

  // Guardar contenido del día
  const result = {
    generated: new Date().toISOString(),
    generatedHuman: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    mode: isLongDay ? 'long' : 'short',
    count: parsed.items.length,
    newsCount: parsed.items.filter(i => i.type === 'news').length,
    promoCount: parsed.items.filter(i => i.type === 'promo').length,
    reviewCount: parsed.items.filter(i => i.type === 'review').length,
    comparativaCount: parsed.items.filter(i => i.type === 'comparativa').length,
    items: parsed.items
  };

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf8');

  // Acumular en archivo histórico (noticias siempre, reviews/comparativas en días largos)
  updateArchive(parsed.items);

  console.log(`✅ Generados: ${result.newsCount} noticias, ${result.promoCount} promos, ${result.reviewCount} reviews, ${result.comparativaCount} comparativas`);
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
  console.log(`⏰ Cron activo — Lunes/Jueves: modo largo | Resto: modo corto`);
}
