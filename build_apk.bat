@echo off
setlocal

:: Script para gerar o APK do Rota Certa no Windows
echo Acessando diretorio flutter...
cd flutter

echo Limpando build anterior...
call flutter clean

echo Obtendo dependencias...
call flutter pub get

echo Gerando APK em modo DEBUG (para teste direto)...
call flutter build apk --debug

echo Gerando APK em modo RELEASE (versão final)...
call flutter build apk --release --split-per-abi

echo Build finalizado!
echo APK Debug: build\app\outputs\flutter-apk\app-debug.apk
echo APK Release: build\app\outputs\flutter-apk\app-release.apk

pause
