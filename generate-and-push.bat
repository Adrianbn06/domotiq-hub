@echo off
echo Generando contenido segun calendario...
cd /d "%~dp0"
node cron.js --once
echo.
echo Generando paginas de tags...
node generate-tags.js
echo.
echo Subiendo a GitHub...
git add .
git commit -m "contenido %date%"
git push
echo.
echo Listo! Vercel actualiza en 1-2 minutos.
pause
