/**
 * server.js - Servidor principal de DomotiQ Hub
 *
 * Endpoints:
 *   GET  /              → sirve index.html
 *   GET  /api/content   → devuelve el contenido guardado (noticias + promos)
 *   POST /api/generate  → regenera contenido manualmente (protegido con token)
 *   GET  /api/status    → información del sistema
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './cron.js';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DATA_FILE = process.env.VERCEL ? '/tmp/content.json' : './data/content.json';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Headers de seguridad básicos
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// ─── API: obtener contenido ────────────────────────────────────────────────────
app.get('/api/content', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json({
        items: [],
        generated: null,
        message: 'Aún no se ha generado contenido. Ejecuta: node cron.js --once'
      });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error leyendo content.json:', err.message);
    res.status(500).json({ error: 'Error interno al leer el contenido' });
  }
});

// ─── API: regenerar manualmente (protegido) ────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Token de administrador inválido' });
  }

  try {
    const result = await generateContent();
    res.json({
      ok: true,
      message: `Generados ${result.newsCount} noticias y ${result.promoCount} promos`,
      generated: result.generated
    });
  } catch (err) {
    console.error('Error generando contenido:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: estado del sistema ───────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  let lastGenerated = null;
  let itemCount = 0;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      lastGenerated = data.generated;
      itemCount = data.count || 0;
    } catch {}
  }
  res.json({
    ok: true,
    version: '1.0.0',
    lastGenerated,
    itemCount,
    uptime: Math.round(process.uptime()) + 's',
    nodeVersion: process.version
  });
});

// ─── SPA fallback (todas las rutas sirven index.html) ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Arrancar servidor ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏠 DomotiQ Hub corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api/content`);

  // Arrancar el cron daemon automáticamente
  import('./cron.js').catch(console.error);
});
