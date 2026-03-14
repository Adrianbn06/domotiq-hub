@echo off
echo Generando contenido con IA (SSG + historial precios + FAQ + articulos relacionados)...
cd /d "%~dp0"
node cron.js --once
echo.
echo Subiendo a GitHub...
git add public/index.html data/content.json data/archive.json data/price-history.json public/articulos/
git commit -m "contenido diario %date% — SSG + precios + FAQ"
git push
echo.
echo Listo! El sitio se actualiza en Vercel en 1-2 minutos.
pause
