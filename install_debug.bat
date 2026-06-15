@echo off
setlocal

:: Script para instalar o APK Debug no dispositivo Android via ADB
set APK_PATH=flutter\build\app\outputs\flutter-apk\app-debug.apk
set PACKAGE_NAME=com.example.rota_certa

echo Buscando dispositivos conectados...
adb devices

:: Verificar se existe o arquivo APK
if not exist "%APK_PATH%" (
    echo Erro: APK debug nao encontrado em %APK_PATH%
    echo Certifique-se de rodar build_apk.bat primeiro.
    pause
    exit /b 1
)

echo Instalando %APK_PATH%...
adb install -r "%APK_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo Sucesso! Verificando instalacao...
    adb shell pm list packages | findstr "%PACKAGE_NAME%"
    
    echo Iniciando o aplicativo Rota Certa...
    adb shell am start -n "%PACKAGE_NAME%/.MainActivity"
) else (
    echo Erro na instalacao. Verifique se o dispositivo esta conectado e com a Depuracao USB ativa.
)

pause
