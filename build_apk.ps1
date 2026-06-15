# Script para gerar o APK do Rota Certa (Windows)
cd flutter

Write-Host "Limpando build anterior..." -ForegroundColor Yellow
flutter clean

Write-Host "Obtendo dependências..." -ForegroundColor Yellow
flutter pub get

Write-Host "Gerando APK em modo DEBUG..." -ForegroundColor Green
flutter build apk --debug

Write-Host "Gerando APK em modo RELEASE..." -ForegroundColor Green
flutter build apk --release --split-per-abi

Write-Host "`nBuild finalizado!" -ForegroundColor Cyan
Write-Host "APK Debug: build/app/outputs/flutter-apk/app-debug.apk"
Write-Host "APK Release: build/app/outputs/flutter-apk/app-release.apk"
