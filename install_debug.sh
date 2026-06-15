#!/bin/bash

# Script para instalar o APK Debug no dispositivo Android via ADB
APK_PATH="flutter/build/app/outputs/flutter-apk/app-debug.apk"
PACKAGE_NAME="com.example.rota_certa"

echo "Buscando dispositivos conectados..."
adb devices

# Verificar se existe o arquivo APK
if [ ! -f "$APK_PATH" ]; then
    echo "Erro: APK debug não encontrado em $APK_PATH"
    echo "Certifique-se de rodar ./build_apk.sh primeiro."
    exit 1
fi

echo "Instalando $APK_PATH..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo "Sucesso! Verificando instalação..."
    adb shell pm list packages | grep "$PACKAGE_NAME"
    
    echo "Iniciando o aplicativo Rota Certa..."
    adb shell am start -n "$PACKAGE_NAME/.MainActivity"
else
    echo "Erro na instalação. Verifique se o dispositivo está conectado e com a Depuração USB ativa."
fi
