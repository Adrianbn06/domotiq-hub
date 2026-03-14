import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './cron.js';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DATA_FILE = process.env.VERCEL ? '/tmp/content.json' : './data/content.json';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.get('/api/content', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.json({ items: [], generated: null });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo contenido' });
  }
});

// Responde INMEDIATAMENTE y genera en background para evitar timeout de Vercel (10s)
app.post('/api/generate', (req, res) => {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Token de administrador invalido' });
  }

  res.json({ ok: true, message: 'Generacion iniciada — contenido listo en ~60 segundos' });

  generateContent()
    .then(r => console.log('Generados ' + r.newsCount + ' noticias + ' + r.promoCount + ' promos'))
    .catch(err => console.error('Error generando:', err.message));
});

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
  res.json({ ok: true, lastGenerated, itemCount });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('DomotiQ Hub corriendo en http://localhost:' + PORT);
  import('./cron.js').catch(console.error);
});
