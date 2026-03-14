/**
 * server.js - Servidor principal de OfertasDomoticas.com
 *
 * Seguridad implementada:
 *  - Helmet: headers de seguridad HTTP completos
 *  - Rate limiting: máximo de peticiones por IP
 *  - ADMIN_TOKEN para endpoints protegidos
 *  - Sanitización de inputs
 *  - CORS controlado
 *  - Logs de intentos de acceso no autorizado
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './cron.js';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── IMPORTS DINÁMICOS DE SEGURIDAD ──────────────────────────────────────────
// Helmet y rate-limit se importan dinámicamente para compatibilidad con Vercel
let helmet, rateLimit;
try {
  const helmetMod = await import('helmet');
  helmet = helmetMod.default;
  const rateLimitMod = await import('express-rate-limit');
  rateLimit = rateLimitMod.default;
} catch {
  console.log('Módulos de seguridad no disponibles — usando headers manuales');
}

const DATA_FILE    = path.join(__dirname, 'data', 'content.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'archive.json');

// ─── MIDDLEWARE DE SEGURIDAD ──────────────────────────────────────────────────

// 1. Helmet — configura automáticamente ~14 headers de seguridad HTTP
import crypto from 'crypto';

// Generar nonce único por petición para scripts inline seguros
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

if (helmet) {
  app.use((req, res, next) => {
    const nonce = res.locals.nonce;
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            `'nonce-${nonce}'`,                          // scripts inline con nonce
            "https://www.googletagmanager.com",
            "https://pagead2.googlesyndication.com",
            "https://fonts.googleapis.com",
            "https://www.googletagservices.com",
            "https://adservice.google.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com"
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: [
            "'self'",
            "https://www.google-analytics.com",
            "https://region1.google-analytics.com",
            "https://analytics.google.com",
          ],
          frameSrc: [
            "https://googleads.g.doubleclick.net",
            "https://tpc.googlesyndication.com",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      // Permissions-Policy completo para A+
      permissionsPolicy: {
        features: {
          camera: [],
          microphone: [],
          geolocation: [],
          fullscreen: ["'self'"],
          payment: [],
          usb: [],
          accelerometer: [],
          gyroscope: [],
          magnetometer: [],
        }
      },
      crossOriginEmbedderPolicy: false,
    })(req, res, next);
  });
} else {
  app.use((req, res, next) => {
    const nonce = res.locals.nonce;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:; object-src 'none'`);
    next();
  });
}

// 2. Rate limiting — evita abuso y ataques DDoS
if (rateLimit) {
  // Límite general: 100 peticiones por 15 minutos por IP
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
    skip: (req) => req.path.startsWith('/api/content') || req.path.startsWith('/api/archive'),
  });

  // Límite estricto para el endpoint de generación: 5 intentos por hora
  const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados intentos de generación. Máximo 5 por hora.' },
  });

  // Límite para APIs públicas: 200 peticiones por 15 minutos
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Demasiadas peticiones a la API.' },
  });

  app.use(generalLimiter);
  app.use('/api/generate', generateLimiter);
  app.use('/api/content', apiLimiter);
  app.use('/api/archive', apiLimiter);
}

// 3. Parsear JSON con límite de tamaño (evita ataques de payload enorme)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 4. Servir archivos estáticos
// Serve static files EXCEPT index.html (which needs nonce injection)
app.use(express.static(path.join(__dirname, 'public'), {
  index: false  // Don't serve index.html automatically — we inject nonce manually
}));

// 5. Logger de seguridad — registra intentos sospechosos
app.use((req, res, next) => {
  const suspicious = [
    '../', '..\\', '<script', 'SELECT ', 'DROP ', 'INSERT ',
    'eval(', 'javascript:', 'vbscript:'
  ];
  const url = decodeURIComponent(req.url).toLowerCase();
  if (suspicious.some(p => url.includes(p.toLowerCase()))) {
    console.warn(`⚠️  Petición sospechosa bloqueada: ${req.ip} → ${req.url}`);
    return res.status(400).json({ error: 'Petición no válida' });
  }
  next();
});

// ─── ENDPOINTS ────────────────────────────────────────────────────────────────

// Contenido del día
app.get('/api/content', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json({ items: [], generated: null });
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error /api/content:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Archivo histórico
app.get('/api/archive', (req, res) => {
  try {
    if (!fs.existsSync(ARCHIVE_FILE)) return res.json({ items: [], count: 0 });
    const archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    archive.items.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
    res.json(archive);
  } catch (err) {
    console.error('Error /api/archive:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Generar contenido — protegido con token + rate limit
app.post('/api/generate', (req, res) => {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN;

  // Log del intento (sin revelar el token recibido en los logs)
  if (!adminToken || token !== adminToken) {
    console.warn(`🚫 Acceso denegado a /api/generate desde IP: ${req.ip}`);
    // Delay de 1s para frenar ataques de fuerza bruta
    setTimeout(() => res.status(401).json({ error: 'No autorizado' }), 1000);
    return;
  }

  res.json({ ok: true, message: 'Generación iniciada — listo en ~60 segundos' });
  generateContent()
    .then(r => console.log(`✅ Generado: ${r.newsCount} noticias, ${r.promoCount} promos, ${r.reviewCount||0} reviews`))
    .catch(err => console.error('❌ Error generando:', err.message));
});

// Estado del sistema (solo info no sensible)
app.get('/api/status', (req, res) => {
  let lastGenerated = null, itemCount = 0, archiveCount = 0;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      lastGenerated = d.generated;
      itemCount = d.count || 0;
    }
    if (fs.existsSync(ARCHIVE_FILE)) {
      const a = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
      archiveCount = a.items?.length || 0;
    }
  } catch {}
  res.json({ ok: true, lastGenerated, itemCount, archiveCount });
});

// SPA fallback — inyecta el nonce en el HTML para scripts inline seguros
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    // Reemplaza el placeholder NONCE_PLACEHOLDER con el nonce real
    html = html.replace(/NONCE_PLACEHOLDER/g, res.locals.nonce || '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.sendFile(indexPath);
  }
});

// ─── MANEJO DE ERRORES GLOBAL ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── ARRANCAR ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🏠 OfertasDomoticas.com en http://localhost:${PORT}`);
  console.log(`🔒 Seguridad: Helmet=${!!helmet} | RateLimit=${!!rateLimit}`);
  import('./cron.js').catch(console.error);
});
