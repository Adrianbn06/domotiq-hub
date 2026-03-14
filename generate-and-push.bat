@echo off
echo Generando contenido con IA...
cd /d "%~dp0"
node cron.js --once
echo.
echo Subiendo contenido a GitHub...
git add data/content.json data/archive.json
git commit -m "contenido diario %date%"
git push
echo.
echo Listo! El sitio se actualizara en Vercel en 1-2 minutos.
pause
