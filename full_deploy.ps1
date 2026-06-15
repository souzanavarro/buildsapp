# Script PowerShell para Windows
$FLUTTER_DIR = "flutter"
$APK_PATH = "flutter/build/app/outputs/flutter-apk/app-debug.apk"
$PACKAGE_NAME = "com.example.rota_certa"

Write-Host "🚀 Iniciando processo automatizado de build..." -ForegroundColor Cyan

if (-not (Test-Path $FLUTTER_DIR)) {
    Write-Host "❌ Erro: Diretório '$FLUTTER_DIR' não encontrado." -ForegroundColor Red
    exit
}

Push-Location $FLUTTER_DIR

Write-Host "🧹 Limpando build anterior..." -ForegroundColor Yellow
flutter clean

Write-Host "📦 Atualizando dependências..." -ForegroundColor Yellow
flutter pub get

Write-Host "🛠️ Compilando APK Debug..." -ForegroundColor Yellow
flutter build apk --debug

Pop-Location

if (Test-Path $APK_PATH) {
    Write-Host "✅ APK gerado com sucesso!" -ForegroundColor Green
    
    Write-Host "📲 Buscando dispositivos ADB..." -ForegroundColor Cyan
    adb devices
    
    Write-Host "📥 Instalando no dispositivo..." -ForegroundColor Cyan
    adb install -r $APK_PATH
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🚀 Iniciando o aplicativo..." -ForegroundColor Green
        adb shell am start -n "$PACKAGE_NAME/.MainActivity"
        
        Write-Host "📊 Monitorando Logs de Telemetria e Rastreamento (Ctrl+C para parar)..." -ForegroundColor Magenta
        adb logcat *:S TelemetryService:V background_locator:V RotaCerta:V
    } else {
        Write-Host "❌ Erro na instalação via ADB." -ForegroundColor Red
    }
} else {
    Write-Host "❌ Falha ao gerar o APK." -ForegroundColor Red
}
