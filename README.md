# 🏠 DomotiQ Hub — Guía completa de instalación y despliegue

## Estructura del proyecto
```
domotiq-hub/
├── server.js          ← Servidor web principal
├── cron.js            ← Generador de contenido con IA (cron diario)
├── vercel.json        ← Configuración para despliegue en Vercel
├── package.json       ← Dependencias Node.js
├── .env.example       ← Plantilla de variables de entorno
├── .gitignore         ← Archivos que NO van a GitHub
├── data/
│   └── content.json   ← Contenido generado (se crea automáticamente)
└── public/
    └── index.html     ← Página web completa
```

---

## PASO 1 — Instalar Node.js

Descarga e instala Node.js desde: https://nodejs.org (versión LTS)

Verifica la instalación:
```bash
node --version   # debe mostrar v18 o superior
npm --version    # debe mostrar 9 o superior
```

---

## PASO 2 — Configurar el proyecto

### 2a. Abrir terminal en la carpeta del proyecto
```bash
cd domotiq-hub
```

### 2b. Instalar dependencias
```bash
npm install
```

### 2c. Crear el archivo .env con tus claves
```bash
# En Windows:
copy .env.example .env

# En Mac/Linux:
cp .env.example .env
```

Luego abre .env con cualquier editor de texto y rellena:
```
ANTHROPIC_API_KEY=sk-ant-TU-CLAVE-REAL-AQUI
ADMIN_TOKEN=cualquier-string-secreto-largo-1234abcd
```

Para obtener tu API key de Anthropic:
1. Ve a https://console.anthropic.com
2. Inicia sesión (o crea cuenta gratis)
3. API Keys → Create Key
4. Copia la clave (empieza con sk-ant-)

### 2d. Generar el primer lote de contenido
```bash
npm run generate
# Espera ~30-60 segundos mientras la IA busca en la web
# Verás: ✅ Generados 10 noticias + 10 promos
```

### 2e. Iniciar el servidor localmente
```bash
npm start
# Verás: 🏠 DomotiQ Hub corriendo en http://localhost:3000
```

Abre tu navegador en http://localhost:3000 — ¡tu sitio está funcionando!

---

## PASO 3 — Subir a GitHub

### 3a. Crear cuenta en GitHub
Ve a https://github.com y crea una cuenta gratuita.

### 3b. Crear repositorio nuevo
1. Clic en "+" → "New repository"
2. Nombre: `domotiq-hub`
3. Privado o Público (ambos funcionan con Vercel gratuito)
4. NO inicialices con README (ya tienes uno)
5. Clic "Create repository"

### 3c. Subir tu código
```bash
git init
git add .
git commit -m "Initial commit — DomotiQ Hub"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/domotiq-hub.git
git push -u origin main
```

IMPORTANTE: Verifica que .env NO apareció en el commit (el .gitignore lo excluye).

---

## PASO 4 — Desplegar en Vercel (GRATIS)

### 4a. Crear cuenta en Vercel
Ve a https://vercel.com y regístrate con tu cuenta de GitHub.

### 4b. Importar proyecto
1. Dashboard → "Add New Project"
2. Selecciona tu repositorio `domotiq-hub`
3. Framework Preset: "Other" (Node.js)
4. Clic "Deploy"

### 4c. Configurar variables de entorno en Vercel
1. En tu proyecto Vercel → Settings → Environment Variables
2. Agrega:
   - `ANTHROPIC_API_KEY` = tu clave real
   - `ADMIN_TOKEN` = tu token secreto
3. Clic "Save" y luego redespliega: Deployments → "Redeploy"

Tu sitio estará en: `https://domotiq-hub.vercel.app`

---

## PASO 5 — Cron automático diario (GRATIS con cron-job.org)

Vercel gratuito no tiene cron jobs. Usamos cron-job.org que es 100% gratis.

### 5a. Crear cuenta en cron-job.org
Ve a https://cron-job.org y regístrate.

### 5b. Crear el cron job
1. Dashboard → "Create cronjob"
2. Title: `DomotiQ Generate Daily`
3. URL: `https://domotiq-hub.vercel.app/api/generate`
4. Schedule: Daily, 12:00 UTC (= 7:00am Ecuador)
5. Request Method: POST
6. Headers → Add header:
   - Header name: `x-admin-token`
   - Header value: tu ADMIN_TOKEN del .env
7. Clic "Create"

Desde ese momento, todos los días a las 7am Ecuador se regenera el contenido automáticamente.

---

## PASO 6 — Dominio propio (opcional pero recomendado para AdSense)

Google AdSense requiere un dominio propio (no .vercel.app).

### Opción A: Namecheap (~$10/año)
1. Ve a https://namecheap.com
2. Busca `domotiq.com` o `domotiqhub.com`
3. Compra el dominio

### Configurar en Vercel:
1. Vercel → Settings → Domains
2. Agrega tu dominio
3. En Namecheap → DNS → agrega los registros que te indica Vercel
4. Espera 5-30 minutos para que propague

---

## PASO 7 — Google Analytics 4

### 7a. Crear propiedad
1. Ve a https://analytics.google.com
2. Admin → Crear cuenta → Crear propiedad
3. Tipo: Web → URL: tu dominio
4. Copia tu Measurement ID (ejemplo: G-ABC123XYZ)

### 7b. Insertar en index.html
Abre `public/index.html` y reemplaza AMBAS ocurrencias de `G-XXXXXXXXXX` con tu ID real:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TU-ID-REAL"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-TU-ID-REAL');
</script>
```

### 7c. Verificar
1. Abre tu sitio en el navegador
2. En Google Analytics → Informes → Tiempo real
3. Deberías verte como 1 usuario activo

---

## PASO 8 — Google AdSense

### 8a. Requisitos previos
Antes de aplicar, asegúrate de tener:
- Dominio propio (.com, no .vercel.app)
- Al menos 2-3 semanas de contenido publicado
- Política de privacidad (link en el footer)
- Términos de servicio

### 8b. Aplicar
1. Ve a https://adsense.google.com
2. "Comenzar" → ingresa tu sitio web
3. Google te dará un snippet de verificación — pégalo en el <head> de index.html
4. Espera 2 días a 2 semanas para aprobación

### 8c. Activar los anuncios (cuando seas aprobado)
En `public/index.html`, hay 3 secciones marcadas con comentarios `═══ ANUNCIO`:

Reemplaza cada bloque de `<div class="ad-banner">` con:
```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-TU-PUBLISHER-ID"
     data-ad-slot="TU-AD-SLOT-ID"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

Y descomenta la línea del script de AdSense en el <head>:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-TU-ID" crossorigin="anonymous"></script>
```

---

## PASO 9 — Amazon Associates (ingresos desde el día 1)

Mientras esperas AdSense, regístrate en el programa de afiliados de Amazon:

1. Ve a https://affiliate-program.amazon.com
2. Regístrate con tu cuenta Amazon
3. Agrega tu sitio web
4. Cuando seas aprobado, obtén tu "Tracking ID" (ejemplo: domotiq-20)
5. Agrega tu tracking ID a las URLs de Amazon en content.json:
   ```
   https://amazon.com/s?k=smart+home&tag=domotiq-20
   ```

Ganas entre 1-10% de comisión por cada compra que hagan los usuarios que lleguen desde tu sitio.

---

## Costos mensuales estimados

| Servicio         | Plan         | Costo     |
|-----------------|--------------|-----------|
| Vercel           | Hobby (free) | $0/mes    |
| cron-job.org     | Free         | $0/mes    |
| Google Analytics | Free         | $0/mes    |
| Google AdSense   | Free         | $0/mes    |
| Claude API       | Pay-per-use  | ~$1-3/mes |
| Dominio .com     | Anual        | ~$0.83/mes|
| **TOTAL**        |              | **~$2-4/mes** |

---

## Comandos útiles

```bash
# Arrancar en local
npm start

# Generar contenido manualmente
npm run generate

# Ver logs en tiempo real
npm run dev

# Forzar regeneración vía API (reemplaza con tu token)
curl -X POST http://localhost:3000/api/generate \
  -H "x-admin-token: TU-ADMIN-TOKEN"

# Ver estado del sistema
curl http://localhost:3000/api/status

# Ver contenido guardado
curl http://localhost:3000/api/content
```

---

## Soporte

Creado con Claude AI por Anthropic.
Para preguntas sobre el código, puedes consultarle directamente a Claude en claude.ai.
