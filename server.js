import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateContent } from './cron.js';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// En Vercel lee del archivo en el repo (data/content.json)
// En local lee del mismo archivo
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
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

app.post('/api/generate', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Token invalido' });
  }
  res.json({ ok: true, message: 'Usa generate-and-push.bat en tu PC para generar y subir contenido' });
});

app.get('/api/status', (req, res) => {
  let lastGenerated = null, itemCount = 0;
  if (fs.existsSync(DATA_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      lastGenerated = d.generated; itemCount = d.count || 0;
    } catch {}
  }
  res.json({ ok: true, lastGenerated, itemCount });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('DomotiQ Hub en http://localhost:' + PORT));
