@echo off
setlocal enabledelayedexpansion

:: Script unificado para gerar APK ou AAB assinado no Windows com opções de limpeza e verificações de ambiente
set FLUTTER_DIR=flutter

echo ============================================
echo [🔍] Verificando ambiente...
echo ============================================

:: 1. Verifica Flutter
where flutter >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [❌] Erro: Flutter nao encontrado no PATH.
    pause
    exit /b 1
)
echo [✅] Flutter detectado.

:: 2. Verifica Java
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [❌] Erro: Java (JDK) nao encontrado no PATH.
    pause
    exit /b 1
)
echo [✅] Java detectado.

:: 3. Verifica Android SDK (via variável de ambiente comum)
if "%ANDROID_HOME%"=="" if "%ANDROID_SDK_ROOT%"=="" (
    echo [❌] Erro: Variavel ANDROID_HOME ou ANDROID_SDK_ROOT nao encontrada.
    echo Certifique-se de que o Android SDK esta instalado e as variaveis configuradas.
    pause
    exit /b 1
)
echo [✅] Android SDK configurado.

echo.
echo ============================================
echo [🚀] Seletor de Build (Release)
echo ============================================
echo 1. Gerar APK assinado
echo 2. Gerar AAB assinado (Google Play)
echo 3. Sair
echo ============================================

set /p CHOICE="Escolha uma opcao (1-3): "

if "%CHOICE%"=="1" (
    set BUILD_TYPE=apk
    set BUILD_CMD=apk
    set OUTPUT_PATH=build\app\outputs\flutter-apk\app-release.apk
) else if "%CHOICE%"=="2" (
    set BUILD_TYPE=aab
    set BUILD_CMD=appbundle
    set OUTPUT_PATH=build\app\outputs\bundle\release\app-release.aab
) else (
    echo [👋] Saindo...
    exit /b 0
)

echo.
echo ============================================
echo [🧹] Opcoes de Limpeza
echo ============================================
echo 1. Sim (Executar flutter clean e limpar cache Gradle)
echo 2. Nao (Apenas compilar - mais rapido)
echo ============================================
set /p CLEAN_CHOICE="Deseja realizar a limpeza antes de compilar? (1/2): "

echo.
echo [🚀] Iniciando processo para !BUILD_TYPE!...

if not exist "%FLUTTER_DIR%" (
    echo [❌] Erro: Diretorio '%FLUTTER_DIR%' nao encontrado.
    pause
    exit /b 1
)

:: Verifica se o arquivo .env existe na raiz do projeto
if exist ".env" (
    echo [🔑] Carregando variaveis de ambiente do .env...
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        set "%%A=%%B"
    )
) else (
    echo [⚠️] Aviso: Arquivo .env nao encontrado na raiz.
)

:: Validação das variáveis de assinatura
set MISSING_VARS=0
if "!RELEASE_STORE_FILE!"=="" (echo [❌] Erro: RELEASE_STORE_FILE nao definida no .env & set MISSING_VARS=1)
if "!RELEASE_STORE_PASSWORD!"=="" (echo [❌] Erro: RELEASE_STORE_PASSWORD nao definida no .env & set MISSING_VARS=1)
if "!RELEASE_KEY_ALIAS!"=="" (echo [❌] Erro: RELEASE_KEY_ALIAS nao definida no .env & set MISSING_VARS=1)
if "!RELEASE_KEY_PASSWORD!"=="" (echo [❌] Erro: RELEASE_KEY_PASSWORD nao definida no .env & set MISSING_VARS=1)

if %MISSING_VARS% EQU 1 (
    echo [💡] Certifique-se de que o arquivo .env contem as variaveis de assinatura.
    pause
    exit /b 1
)

:: Verifica se o arquivo keystore existe
if not exist "!RELEASE_STORE_FILE!" (
    echo [❌] Erro: Arquivo keystore nao encontrado em: !RELEASE_STORE_FILE!
    pause
    exit /b 1
)

cd "%FLUTTER_DIR%"

if "%CLEAN_CHOICE%"=="1" (
    echo [🧹] Realizando limpeza profunda...
    call flutter clean
    if exist "android\.gradle" rd /s /q "android\.gradle"
) else (
    echo [⏩] Pulando limpeza...
)

echo [📦] Atualizando dependencias...
call flutter pub get

echo [🛠️] Compilando !BUILD_TYPE! assinado...
:: Passando as variáveis como propriedades do Gradle via variáveis de ambiente ORG_GRADLE_PROJECT_
set ORG_GRADLE_PROJECT_RELEASE_STORE_FILE=!RELEASE_STORE_FILE!
set ORG_GRADLE_PROJECT_RELEASE_STORE_PASSWORD=!RELEASE_STORE_PASSWORD!
set ORG_GRADLE_PROJECT_RELEASE_KEY_ALIAS=!RELEASE_KEY_ALIAS!
set ORG_GRADLE_PROJECT_RELEASE_KEY_PASSWORD=!RELEASE_KEY_PASSWORD!

call flutter build !BUILD_CMD! --release

if %ERRORLEVEL% EQU 0 (
    echo [✅] !BUILD_TYPE! gerado com sucesso!
    echo Local: !OUTPUT_PATH!
) else (
    echo [❌] Erro ao gerar o !BUILD_TYPE!. Verifique os logs acima.
)

pause

