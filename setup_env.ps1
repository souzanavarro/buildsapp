# Script de configuração do ambiente Flutter (Windows PowerShell)
Write-Host "Configurando ambiente para o Rota Certa..." -ForegroundColor Cyan

# 1. Verificar se o Flutter está instalado
if (!(Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Host "Erro: Flutter não encontrado. Por favor, instale o Flutter SDK: https://docs.flutter.dev/get-started/install" -ForegroundColor Red
    return
}

# 2. Instruções para variáveis permanentes
Write-Host "`nPara compilar corretamente, verifique as variáveis de ambiente no Windows:" -ForegroundColor Yellow
Write-Host "1. JAVA_HOME -> Caminho para o JDK 17+"
Write-Host "2. ANDROID_HOME -> %LOCALAPPDATA%\Android\Sdk"
Write-Host "3. PATH -> Deve conter o diretório 'bin' do Flutter"

Write-Host "`nExecutando flutter doctor..." -ForegroundColor Green
flutter doctor
