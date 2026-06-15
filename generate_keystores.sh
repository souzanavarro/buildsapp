#!/bin/bash

# Script para gerar as keystores do Rota Certa localmente

echo "--- Gerador de Keystores Rota Certa ---"

# 1. Gerar Keystore de Release (Assinatura do App)
echo "Gerando release.keystore.jks..."
keytool -genkeypair -v \
  -keystore release.keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias release-key \
  -storepass password123 \
  -keypass password123 \
  -dname "CN=Rota Certa, OU=TI, O=Rota Certa, L=Sao Paulo, ST=SP, C=BR"

# 2. Gerar Keystore de Upload (Play Store)
echo "Gerando upload.keystore.jks..."
keytool -genkeypair -v \
  -keystore upload.keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload-key \
  -storepass password123 \
  -keypass password123 \
  -dname "CN=Rota Certa, OU=TI, O=Rota Certa, L=Sao Paulo, ST=SP, C=BR"

echo "----------------------------------------"
echo "Sucesso! Mova os arquivos .jks para flutter/android/app/"
echo "Nota: Guarde as senhas (password123) com segurança ou altere-as no script."
