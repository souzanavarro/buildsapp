#!/bin/bash

# Script para instalar dependências do Android SDK e Java no Servidor
# Requer privilégios de sudo (root)

echo "🚀 Iniciando preparação do servidor para geração de APK..."

# 1. Instalar Java 17
echo "☕ Instalando Java 17 (OpenJDK)..."
sudo apt update
sudo apt install -y openjdk-17-jdk

# 2. Definir variáveis de ambiente temporárias
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# 3. Baixar Android Command Line Tools
echo "🤖 Baixando Android SDK Tools..."
mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk/cmdline-tools
curl -O https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools latest
rm commandlinetools-linux-11076708_latest.zip

# 4. Configurar variáveis do Android SDK
echo "⚙️ Configurando variáveis de ambiente..."
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Adicionar ao .bashrc para persistência
echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64" >> ~/.bashrc
echo "export ANDROID_HOME=$HOME/android-sdk" >> ~/.bashrc
echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools" >> ~/.bashrc

# 5. Aceitar licenças e instalar Build Tools
echo "📜 Aceitando licenças do Android..."
yes | ~/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "✅ Servidor preparado!"
echo "Agora você pode rodar: npm run mobile:build:android"
