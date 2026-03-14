import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './cron.js';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DATA_FILE    = path.join(__dirname, 'data', 'content.json');
const ARCHIVE_FILE = path.join(__dirname, 'data', 'archive.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Contenido del día
app.get('/api/content', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json({ items: [], generated: null });
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo contenido' });
  }
});

// Archivo histórico de reviews y comparativas
app.get('/api/archive', (req, res) => {
  try {
    if (!fs.existsSync(ARCHIVE_FILE)) return res.json({ items: [], count: 0 });
    const archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    // Ordenar por más reciente primero
    archive.items.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
    res.json(archive);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo archivo' });
  }
});

// Generar contenido (responde inmediato, procesa en background)
app.post('/api/generate', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token invalido' });
  }
  res.json({ ok: true, message: 'Generacion iniciada — listo en ~60 segundos' });
  generateContent()
    .then(r => console.log(`✅ ${r.newsCount} noticias, ${r.promoCount} promos, ${r.reviewCount||0} reviews, ${r.comparativaCount||0} comparativas`))
    .catch(err => console.error('❌ Error:', err.message));
});

app.get('/api/status', (req, res) => {
  let lastGenerated = null, itemCount = 0, archiveCount = 0;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      lastGenerated = d.generated; itemCount = d.count || 0;
    }
    if (fs.existsSync(ARCHIVE_FILE)) {
      const a = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
      archiveCount = a.items?.length || 0;
    }
  } catch {}
  res.json({ ok: true, lastGenerated, itemCount, archiveCount });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DomotiQ Hub en http://localhost:${PORT}`);
  import('./cron.js').catch(console.error);
});
