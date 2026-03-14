/**
 * cron.js - Generador de contenido diario con Claude AI
 *
 * Uso:
 *   node cron.js          → arranca el cron daemon (usado por server.js)
 *   node cron.js --once   → genera contenido una sola vez y termina (para pruebas)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import cron from 'node-cron';
import 'dotenv/config';

const DATA_DIR  = process.env.VERCEL ? '/tmp' : './data';
const DATA_FILE = process.env.VERCEL ? '/tmp/content.json' : './data/content.json';

const PROMPT_ES = `Eres un experto en domótica, smart home e IoT. La fecha de hoy es ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.

Busca en la web y genera:
- 10 noticias REALES y RECIENTES (2025) sobre domótica, smart home, IoT doméstico, asistentes de voz (Alexa, Google Home, Apple HomeKit), automatización del hogar.
- 10 promociones/ofertas típicas de productos domóticos en Amazon (4 ofertas), eBay (3 ofertas) y Alibaba (3 ofertas). Productos: bombillas inteligentes, enchufes wifi, cámaras IP, termostatos inteligentes, sensores de movimiento/puerta, hubs Zigbee/Z-Wave, strips LED, robots aspiradora, cerraduras smart, altavoces inteligentes.

RESPONDE ÚNICAMENTE CON JSON VÁLIDO, sin markdown, sin texto antes o después:

{
  "items": [
    {
      "id": 1,
      "type": "news",
      "title": "Título de la noticia en español",
      "body": "Resumen de 2-3 oraciones explicando la noticia de forma clara.",
      "date": "13 Mar 2025",
      "tags": ["IoT", "Smart Home"],
      "source": "Nombre del medio",
      "url": "#"
    },
    {
      "id": 11,
      "type": "promo",
      "title": "Nombre del producto",
      "body": "Descripción breve: qué hace, por qué es buena opción.",
      "platform": "Amazon",
      "price": "$34.99",
      "originalPrice": "$59.99",
      "discount": "-41%",
      "date": "13 Mar 2025",
      "featured": true,
      "url": "https://www.amazon.com/s?k=bombilla+inteligente+wifi&tag=domotiq-20"
    }
  ]
}

REGLAS:
- Los primeros 10 items deben ser type:"news" (ids 1-10)
- Los siguientes 10 deben ser type:"promo" (ids 11-20)
- Para promos: 4 Amazon, 3 eBay, 3 Alibaba
- URLs de Amazon: https://www.amazon.com/s?k=TERMINO+DE+BUSQUEDA&tag=domotiq-20 (SIEMPRE incluir &tag=domotiq-20 en TODAS las URLs de Amazon)
- URLs de eBay: https://www.ebay.com/sch/i.html?_nkw=...
- URLs de Alibaba: https://www.alibaba.com/trade/search?SearchText=...
- Al menos 3 promos deben tener featured:true
- Precios realistas en USD`;

export async function generateContent() {
  console.log(`[${new Date().toISOString()}] 🤖 Iniciando generación con Claude AI...`);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Falta ANTHROPIC_API_KEY en el archivo .env');
  }

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
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: PROMPT_ES }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error API Anthropic ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Extraer texto de todos los bloques de tipo "text"
  let rawText = '';
  for (const block of data.content || []) {
    if (block.type === 'text') rawText += block.text;
  }

  // Extraer el JSON de la respuesta
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No se encontró JSON válido en la respuesta. Texto recibido: ${rawText.slice(0, 300)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('El JSON no tiene el campo "items" esperado');
  }

  // Añadir metadata
  const result = {
    generated: new Date().toISOString(),
    generatedHuman: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }),
    count: parsed.items.length,
    newsCount: parsed.items.filter(i => i.type === 'news').length,
    promoCount: parsed.items.filter(i => i.type === 'promo').length,
    items: parsed.items
  };

  // Guardar en archivo
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[${new Date().toISOString()}] ✅ Generados ${result.newsCount} noticias + ${result.promoCount} promos`);
  return result;
}

// Si se ejecuta con --once, genera y termina
if (process.argv.includes('--once')) {
  generateContent()
    .then(() => { console.log('✅ Generación completada.'); process.exit(0); })
    .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
} else {
  // Modo daemon: cron diario
  // Ecuador es UTC-5. Para ejecutar a las 7:00am hora Ecuador, usamos 12:00 UTC
  const hour = process.env.CRON_HOUR_UTC || '12';
  const schedule = `0 ${hour} * * *`;

  cron.schedule(schedule, () => {
    generateContent().catch(err => console.error('❌ Error en cron:', err.message));
  });

  console.log(`⏰ Cron activo: genera contenido todos los días a las ${hour}:00 UTC (7:00am Ecuador)`);
}
