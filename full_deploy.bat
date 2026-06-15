@echo off
setlocal

:: Configurações
set FLUTTER_DIR=flutter
set APK_PATH=build\app\outputs\flutter-apk\app-debug.apk
set PACKAGE_NAME=com.example.rota_certa

echo ^[🚀^] Iniciando processo automatizado de build...

if not exist "%FLUTTER_DIR%" (
    echo ^[❌^] Erro: Diretorio '%FLUTTER_DIR%' nao encontrado.
    pause
    exit /b 1
)

cd "%FLUTTER_DIR%"

echo ^[🧹^] Limpando build anterior...
call flutter clean

echo ^[📦^] Atualizando dependencias...
call flutter pub get

echo ^[🛠️^] Compilando APK Debug...
call flutter build apk --debug

if exist "%APK_PATH%" (
    echo ^[✅^] APK gerado com sucesso em: %APK_PATH%
    
    echo ^[📲^] Preparando instalacao via ADB...
    adb devices
    
    echo ^[📥^] Instalando no dispositivo...
    adb install -r "%APK_PATH%"
    
    if %ERRORLEVEL% EQU 0 (
        echo ^[🚀^] Iniciando o aplicativo...
        adb shell am start -n "%PACKAGE_NAME%/.MainActivity"
        
        echo ^[📊^] Verificando logs (Pressione Ctrl+C para parar)...
        adb logcat | findstr /R "TelemetryService background_locator RotaCerta"
    ) else (
        echo ^[❌^] Erro na instalacao via ADB.
    )
) else (
    echo ^[❌^] Falha ao gerar o APK.
)

pause
