#!/bin/bash

# Script para gerar o APK do Rota Certa
cd flutter

echo "Limpando build anterior..."
flutter clean

echo "Obtendo dependências..."
flutter pub get

echo "Gerando APK em modo DEBUG (para teste direto)..."
flutter build apk --debug

echo "Gerando APK em modo RELEASE (versão final)..."
flutter build apk --release --split-per-abi

echo "Build finalizado!"
echo "APK Debug: build/app/outputs/flutter-apk/app-debug.apk"
echo "APK Release: build/app/outputs/flutter-apk/app-release.apk"
