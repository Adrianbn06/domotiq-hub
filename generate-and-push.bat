@echo off
echo Generando contenido con IA (E-E-A-T + SSG + paginas individuales)...
cd /d "%~dp0"
node cron.js --once
echo.
echo Subiendo a GitHub (HTML estatico + datos + articulos)...
git add public/index.html data/content.json data/archive.json public/articulos/
git commit -m "contenido diario %date% — SSG estatico"
git push
echo.
echo Listo! El sitio se actualiza en Vercel en 1-2 minutos con HTML pre-renderizado.
pause
