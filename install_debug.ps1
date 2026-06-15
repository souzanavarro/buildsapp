# Script para instalar o APK Debug no dispositivo Android via ADB (Windows)
$APK_PATH = "flutter/build/app/outputs/flutter-apk/app-debug.apk"
$PACKAGE_NAME = "com.example.rota_certa"

Write-Host "Buscando dispositivos conectados..." -ForegroundColor Cyan
adb devices

# Verificar se existe o arquivo APK
if (!(Test-Path $APK_PATH)) {
    Write-Host "Erro: APK debug não encontrado em $APK_PATH" -ForegroundColor Red
    Write-Host "Certifique-se de rodar .\build_apk.ps1 primeiro." -ForegroundColor Yellow
    return
}

Write-Host "Instalando $APK_PATH..." -ForegroundColor Green
adb install -r $APK_PATH

if ($LASTEXITCODE -eq 0) {
    Write-Host "Sucesso! Verificando instalação..." -ForegroundColor Green
    adb shell pm list packages | Select-String $PACKAGE_NAME
    
    Write-Host "Iniciando o aplicativo Rota Certa..." -ForegroundColor Cyan
    adb shell am start -n "$PACKAGE_NAME/.MainActivity"
} else {
    Write-Host "Erro na instalação. Verifique se o dispositivo está conectado e com a Depuração USB ativa." -ForegroundColor Red
}
