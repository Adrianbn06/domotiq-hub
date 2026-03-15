@echo off
echo Generando contenido segun calendario diario...
cd /d "%~dp0"
node cron.js --once
echo.
echo Subiendo a GitHub (incluyendo index.html con SSG)...
git add public/index.html data/content.json data/archive.json data/price-history.json public/articulos/
git commit -m "contenido %date%"
git push
echo.
echo Listo! Vercel actualiza en 1-2 minutos.
pause
