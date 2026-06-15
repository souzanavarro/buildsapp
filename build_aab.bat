@echo off
setlocal enabledelayedexpansion

:: Script para gerar AAB assinado no Windows
set FLUTTER_DIR=flutter

echo [🚀] Iniciando build do App Bundle (AAB)...

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

echo [🧹] Realizando limpeza profunda...
call flutter clean
if exist "android\.gradle" rd /s /q "android\.gradle"

echo [📦] Atualizando dependencias...
call flutter pub get

echo [🛠️] Compilando AAB assinado...
:: Passando as variáveis como propriedades do Gradle via variáveis de ambiente ORG_GRADLE_PROJECT_
set ORG_GRADLE_PROJECT_RELEASE_STORE_FILE=!RELEASE_STORE_FILE!
set ORG_GRADLE_PROJECT_RELEASE_STORE_PASSWORD=!RELEASE_STORE_PASSWORD!
set ORG_GRADLE_PROJECT_RELEASE_KEY_ALIAS=!RELEASE_KEY_ALIAS!
set ORG_GRADLE_PROJECT_RELEASE_KEY_PASSWORD=!RELEASE_KEY_PASSWORD!

call flutter build appbundle --release

if %ERRORLEVEL% EQU 0 (
    echo [✅] AAB gerado com sucesso!
    echo Local: build\app\outputs\bundle\release\app-release.aab
) else (
    echo [❌] Erro ao gerar o AAB. Verifique os logs acima.
)

pause

