@echo off
echo Generando contenido segun calendario diario...
echo Lunes: noticias | Mar/Mie/Jue/Sab/Dom: ofertas | Viernes: ofertas+reviews+comparativas
cd /d "%~dp0"
node cron.js --once
echo.
echo Subiendo a GitHub...
git add public/index.html data/content.json data/archive.json data/price-history.json public/articulos/
git commit -m "contenido %date%"
git push
echo.
echo Listo! Vercel actualiza en 1-2 minutos.
pause
