#!/bin/bash

# Script de configuração do ambiente Flutter (Linux/macOS)
echo "Configurando ambiente para o Rota Certa..."

# 1. Verificar se o Flutter está instalado
if ! command -v flutter &> /dev/null
then
    echo "Erro: Flutter não encontrado. Por favor, instale o Flutter SDK primeiro: https://docs.flutter.dev/get-started/install"
    exit 1
fi

# 2. Configurar variáveis de ambiente (Temporário nesta sessão)
# Para permanente, adicione ao seu ~/.bashrc ou ~/.zshrc
export JAVA_HOME=${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which javac))))}
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
export PATH="$PATH:$FLUTTER_HOME/bin"

echo "Ambiente pré-configurado."
echo "Executando flutter doctor..."
flutter doctor
