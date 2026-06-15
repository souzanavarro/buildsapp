# Script de Reparo de Dependências e Build APK
$FLUTTER_DIR = "flutter"

Write-Host "🧹 Iniciando limpeza profunda do Flutter..." -ForegroundColor Cyan

if (Test-Path $FLUTTER_DIR) {
    Push-Location $FLUTTER_DIR
    
    Write-Host "1️⃣ Limpando build local..." -ForegroundColor Yellow
    flutter clean
    
    Write-Host "2️⃣ Limpando cache global do Pub (pode demorar)..." -ForegroundColor Yellow
    flutter pub cache clean --force
    
    Write-Host "3️⃣ Removendo arquivos de trava (lock e tool)..." -ForegroundColor Yellow
    if (Test-Path "pubspec.lock") { Remove-Item "pubspec.lock" -Force }
    if (Test-Path ".dart_tool") { Remove-Item ".dart_tool" -Recurse -Force }
    
    Write-Host "4️⃣ Resolvendo dependências (Gerando novo pubspec.lock)..." -ForegroundColor Yellow
    flutter pub get
    
    Write-Host "🔍 Validando versão do background_locator_2 no lock..." -ForegroundColor Cyan
    $lockFile = Get-Content "pubspec.lock" -Raw
    if ($lockFile -match "background_locator_2") {
        Write-Host "✅ Plugin encontrado no arquivo de trava." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Aviso: Plugin não encontrado no lock. Verifique o pubspec.yaml." -ForegroundColor Orange
    }

    Write-Host "🛠️ Compilando APK Release..." -ForegroundColor Yellow
    flutter build apk --release
    
    Pop-Location
    Write-Host "🚀 Processo concluído! APK disponível em: flutter/build/app/outputs/flutter-apk/app-release.apk" -ForegroundColor Green
} else {
    Write-Host "❌ Erro: Pasta 'flutter' não encontrada." -ForegroundColor Red
}
