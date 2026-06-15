# Guia de Compilação - Rota Certa

Este projeto está configurado para compilação nativa Android com suporte a Android Auto e Google Assistant.

## Pré-requisitos
1. **Flutter SDK**: [Instalar Flutter](https://docs.flutter.dev/get-started/install)
2. **Java JDK 17**: Necessário para o Gradle.
3. **Android SDK**: Instalado via Android Studio.

## Passos para Compilar

### 1. Configurar Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão no seu PATH:
- Caminho para o `flutter/bin`
- `JAVA_HOME` apontando para o JDK 17.
- `ANDROID_HOME` apontando para o seu Android SDK.

### 2. Executar Scripts de Build
Para facilitar, criei scripts automáticos:

**No Windows (PowerShell):**
```powershell
.\setup_env.ps1
.\build_apk.ps1
```

**No Linux/macOS:**
```bash
chmod +x *.sh
./setup_env.sh
./build_apk.sh
```

## Localização dos APKs
Após o sucesso do build, os arquivos estarão em:
- **Debug (Teste):** `flutter/build/app/outputs/flutter-apk/app-debug.apk`
- **Release (Final):** `flutter/build/app/outputs/flutter-apk/app-release.apk`

## Como Instalar no Celular
1. Conecte o celular ao PC via USB.
2. Ative a "Depuração USB" nas opções de desenvolvedor do Android.
3. Use o comando: `flutter install` (dentro da pasta flutter) ou copie o arquivo `.apk` para o celular e abra-o.
