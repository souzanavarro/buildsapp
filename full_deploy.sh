#!/bin/bash

# Configurações
FLUTTER_DIR="flutter"
APK_PATH="build/app/outputs/flutter-apk/app-debug.apk"
PACKAGE_NAME="com.example.rota_certa"

echo "🚀 Iniciando processo automatizado de build..."

if [ ! -d "$FLUTTER_DIR" ]; then
    echo "❌ Erro: Diretório '$FLUTTER_DIR' não encontrado."
    exit 1
fi

cd "$FLUTTER_DIR"

echo "🧹 Limpando build anterior..."
flutter clean

echo "📦 Atualizando dependências..."
flutter pub get

echo "🛠️ Compilando APK Debug..."
flutter build apk --debug

if [ -f "$APK_PATH" ]; then
    echo "✅ APK gerado com sucesso em: $APK_PATH"
    
    echo "📲 Preparando instalação via ADB..."
    adb devices
    
    echo "📥 Instalando no dispositivo..."
    adb install -r "$APK_PATH"
    
    if [ $? -eq 0 ]; then
        echo "🚀 Iniciando o aplicativo..."
        adb shell am start -n "$PACKAGE_NAME/.MainActivity"
        
        echo "📊 Verificando logs de Telemetria (aguardando eventos)..."
        adb logcat | grep -E "TelemetryService|background_locator|RotaCerta"
    else
        echo "❌ Erro na instalação via ADB."
    fi
else
    echo "❌ Falha ao gerar o APK."
    exit 1
fi
