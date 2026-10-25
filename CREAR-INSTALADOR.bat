@echo off
chcp 65001 >nul
title Salamence music - crear instalador
cd /d "%~dp0"
echo ============================================
echo   Salamence music - creando el instalador
echo ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo No tienes Node.js instalado. Es necesario SOLO para crear el instalador.
  echo Descargalo de https://nodejs.org ^(version LTS^), instalalo y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)
echo [1/2] Descargando herramientas ^(solo la primera vez, puede tardar unos minutos^)...
call npm install
if errorlevel 1 goto fallo
echo.
echo [2/2] Generando el instalador de Windows...
call npm run dist
if errorlevel 1 goto fallo
echo.
echo LISTO. Tu instalador esta en la carpeta "dist":
echo    Salamence music Setup 1.0.0.exe
start "" "%~dp0dist"
pause
exit /b 0
:fallo
echo.
echo Algo ha fallado. Revisa los mensajes de arriba. Comprueba tu conexion a Internet.
pause
exit /b 1
